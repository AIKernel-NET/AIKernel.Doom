namespace AIKernel.Doom.Architecture.Tests;

using System.Text.Json;
using AIKernel.Doom.Provider.Autoplay;

public sealed class FirstDoorBrowserControlSessionTests
{
    private const string SessionId = "browser-session";
    private const string RunId = "browser-run-1";

    [Fact]
    public void PredictionRewind_IsAnomalyOnlyAndControlTickRemainsMonotonic()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var initial = session.Evaluate(ReadyInput(1108));
        var rewoundInput = ReadyInput(1);
        var rewound = session.Evaluate(rewoundInput with
        {
            NativeGametic = initial.NativeGametic + 1,
            RawObservation = RawYesObservation(1110, initial.NativeGametic + 1)
        });

        Assert.Equal(1, initial.RunGeneration);
        Assert.Equal(1, rewound.RunGeneration);
        Assert.Equal(RunId, rewound.RunId);
        Assert.Equal(initial.ControlTick + 1, rewound.ControlTick);
        Assert.Equal(FirstDoorControlState.OpeningNavigate, rewound.State);
        Assert.True(rewound.PredictionAnomaly);
        Assert.Contains("prediction-rewound", rewound.AnomalyCode, StringComparison.Ordinal);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, rewound.OwnershipDisposition);
        Assert.True(rewound.OpeningNavigation.Active);
    }

    [Fact]
    public void HeldResetOperation_IsConsumedOnceAndNewOperationStartsFreshRun()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var first = session.Evaluate(ReadyInput(0) with
        {
            RunGeneration = 7,
            ResetRequested = true,
            ResetOperationId = "reset-op-1",
            LifecycleEvent = "run-started"
        });
        var held = session.Evaluate(ReadyInput(1) with
        {
            RunGeneration = 7,
            ResetRequested = true,
            ResetOperationId = "reset-op-1",
            LifecycleEvent = "run-started"
        });
        var released = session.Evaluate(ReadyInput(2) with
        {
            RunGeneration = 7,
            ResetOperationId = "reset-op-1",
            LifecycleEvent = "none"
        });
        var secondOperation = session.Evaluate(ReadyInput(3) with
        {
            RunGeneration = 7,
            ResetRequested = true,
            ResetOperationId = "reset-op-2",
            LifecycleEvent = "run-restarted"
        });

        Assert.Equal(7, first.RunGeneration);
        Assert.Equal(7, held.RunGeneration);
        Assert.Equal(7, released.RunGeneration);
        Assert.Equal(8, secondOperation.RunGeneration);
        Assert.True(first.RunBoundaryApplied);
        Assert.False(held.RunBoundaryApplied);
        Assert.False(released.RunBoundaryApplied);
        Assert.True(secondOperation.RunBoundaryApplied);
        Assert.Equal("reset-op-2", secondOperation.ResetOperationId);
        Assert.Equal("run-restarted", secondOperation.LifecycleEvent);
        Assert.Equal(0, secondOperation.UseAttemptId);
        Assert.Equal(FirstDoorControlState.OpeningNavigate, secondOperation.State);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, secondOperation.OwnershipDisposition);
    }

    [Fact]
    public void ModelLoadingDelay_RemainsNotAcquiredUntilControlIsReady()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var first = session.Evaluate(ReadyInput(0) with
        {
            LifecycleState = "running",
            ModelState = "loading"
        });
        var second = session.Evaluate(ReadyInput(1) with { ModelState = "loading" });
        var third = session.Evaluate(ReadyInput(2) with { ModelState = "loading" });
        FirstDoorControlDecision? ready1 = null;
        var ready = DriveOpeningRouteToApproach(
            session,
            firstPrediction: 3,
            observeSpawn: decision => ready1 = decision);

        Assert.Equal(FirstDoorOwnershipDisposition.NotAcquired, first.OwnershipDisposition);
        Assert.Equal(FirstDoorOwnershipDisposition.NotAcquired, second.OwnershipDisposition);
        Assert.Equal(FirstDoorOwnershipDisposition.NotAcquired, third.OwnershipDisposition);
        Assert.NotNull(ready1);
        Assert.Equal(FirstDoorControlState.OpeningNavigate, ready1.State);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, ready1.OwnershipDisposition);
        Assert.Equal(FirstDoorControlState.Approach, ready.State);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, ready.OwnershipDisposition);
        Assert.Equal(9, ready.ControlTick);
        Assert.Equal(6, ready.AcquisitionTrace.PostReadinessFrames);
    }

    [Fact]
    public void ExplicitRunIdAndGeneration_StartFreshRunWhileControlTickContinues()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);

        var fresh = session.Evaluate(ReadyInput(0) with
        {
            RunGeneration = 2,
            RunId = "browser-run-2",
            LifecycleEvent = "run-started"
        });

        Assert.Equal(2, fresh.RunGeneration);
        Assert.Equal("browser-run-2", fresh.RunId);
        Assert.Equal(use.ControlTick + 1, fresh.ControlTick);
        Assert.Equal(FirstDoorControlState.OpeningNavigate, fresh.State);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, fresh.OwnershipDisposition);
        Assert.Equal(0, fresh.UseAttemptId);
        Assert.Equal(0, fresh.RetryCount);
    }

    [Fact]
    public void RawDoropnWithUnrelatedItemup_ConfirmsOpenAndEmitsSemanticDelta()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);

        var opened = session.Evaluate(ReadyInput(8) with
        {
            Audio = RawAudio(
                RawEvent(1, "itemup"),
                RawEvent(2, "SFX_DOROPN")),
            AppliedActionAck = PositiveAck(use)
        });

        Assert.Equal(FirstDoorControlState.PostOpenShove, opened.State);
        Assert.True(opened.OpenConfirmed);
        Assert.Equal(FirstDoorOpenConfirmationSource.TrustedAudio, opened.OpenConfirmationSource);
        Assert.Equal(use.UseAttemptId, opened.UseAttemptId);
        Assert.True(opened.SemanticDelta.HasChanges);
        Assert.True(opened.SemanticDelta.FirstDoorOpened);
        Assert.False(opened.SemanticDelta.ComputerRoomEntered);
        Assert.Equal(1, opened.SemanticDelta.DoorOpenedCount);
        Assert.Equal(RunId, opened.SemanticDelta.RunId);
        Assert.Equal("run-1-native-sfx-2", opened.AcceptedOpenEvidenceId);
        Assert.Equal(FirstDoorOpenConfirmationSource.TrustedAudio, opened.AcceptedOpenEvidenceSource);
        Assert.Equal("accepted:doropn;ignored:itemup", opened.EvidenceObservationCode);
    }

    [Fact]
    public void RawNoway_TriggersBoundedBackwardRecoveryForCurrentAttempt()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);

        var failed = session.Evaluate(ReadyInput(8) with
        {
            Audio = RawAudio(RawEvent(4, "noway")),
            AppliedActionAck = PositiveAck(use)
        });

        Assert.True(failed.FailedUseEvidenceAccepted);
        Assert.Equal("run-1-native-sfx-4", failed.FailedUseAudioEventId);
        Assert.Equal(FirstDoorControlState.FailedUseReapproach, failed.State);
        Assert.True(failed.Action.MoveBackward);
        Assert.False(failed.OpenConfirmed);
        Assert.Equal("run-1-native-sfx-4", failed.AcceptedFailedUseEvidenceId);
        Assert.Equal(FirstDoorEvidenceProvenance.ClassifiedNativeAudio, failed.AcceptedFailedUseEvidenceSource);
        Assert.Equal("accepted:noway", failed.EvidenceObservationCode);
    }

    [Fact]
    public void DoropnAndNowayInSameWindow_AreAmbiguousAndNeverConfirmSuccess()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);

        var ambiguous = session.Evaluate(ReadyInput(8) with
        {
            Audio = RawAudio(
                RawEvent(10, "doropn"),
                RawEvent(11, "noway")),
            AppliedActionAck = PositiveAck(use)
        });

        Assert.False(ambiguous.OpenConfirmed);
        Assert.False(ambiguous.SemanticDelta.FirstDoorOpened);
        Assert.True(ambiguous.FailedUseEvidenceAccepted);
        Assert.Contains("ambiguous-10-11", ambiguous.FailedUseAudioEventId, StringComparison.Ordinal);
        Assert.Equal(FirstDoorControlState.FailedUseReapproach, ambiguous.State);
        Assert.Equal("ambiguous:doropn+noway", ambiguous.EvidenceObservationCode);
    }

    [Fact]
    public void PositiveAck_ItemupIsIgnoredAndLaterDoropnUsesSameAckWindowOnce()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);

        var itemup = session.Evaluate(ReadyInput(8) with
        {
            AppliedActionAck = PositiveAck(use),
            Audio = RawAudio(RawEvent(1, "itemup"))
        });
        Assert.True(itemup.AppliedActionAckValid);
        Assert.True(itemup.UseAckWindowActive);
        Assert.False(itemup.OpenConfirmed);
        Assert.Equal("ignored:no-door-outcome;ignored:itemup", itemup.EvidenceObservationCode);

        var opened = session.Evaluate(ReadyInput(9) with
        {
            Audio = RawAudio(RawEvent(2, "doropn"))
        });

        Assert.False(opened.AppliedActionAckValid);
        Assert.Equal("ack-window-active", opened.AppliedActionAckCode);
        Assert.True(opened.UseAckWindowActive);
        Assert.True(opened.OpenConfirmed);
        Assert.Equal("run-1-native-sfx-2", opened.AcceptedOpenEvidenceId);
    }

    [Theory]
    [InlineData("manual-blocked", "manual-blocked")]
    [InlineData("sense-only", "sense-only")]
    [InlineData("event-not-queued", "use-event-not-queued")]
    [InlineData("queued-sequence-missing", "queued-use-sequence-missing")]
    [InlineData("queue-only-no-pump", "use-not-pumped")]
    [InlineData("wrong-pumped-sequence", "pumped-sequence-mismatch")]
    [InlineData("pulse-resolver", "pulse-resolver-called")]
    [InlineData("nonexact-mode", "nonexact-action-mode")]
    [InlineData("invalid-host-path", "invalid-host-path")]
    [InlineData("scope", "scope-mismatch")]
    [InlineData("tick", "decision-control-tick-mismatch")]
    [InlineData("attempt", "use-attempt-mismatch")]
    [InlineData("proposed-non-use", "proposed-use-false")]
    [InlineData("applied-non-use", "applied-use-false")]
    [InlineData("unresolved-use", "use-not-resolved")]
    [InlineData("applied-motion", "applied-motion-not-neutral")]
    public void InvalidAppliedUseAck_NeverAcceptsRawDoorOutcome(
        string mutation,
        string expectedCode)
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);

        var rejected = session.Evaluate(ReadyInput(8) with
        {
            AppliedActionAck = MutateAck(PositiveAck(use), mutation),
            Audio = RawAudio(RawEvent(1, "doropn"))
        });

        Assert.False(rejected.AppliedActionAckValid);
        Assert.Equal(expectedCode, rejected.AppliedActionAckCode);
        Assert.False(rejected.UseAckWindowActive);
        Assert.False(rejected.OpenConfirmed);
        Assert.Equal("ignored:no-valid-applied-use-ack", rejected.EvidenceObservationCode);
        Assert.Equal(FirstDoorControlState.AwaitOutcome, rejected.State);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, rejected.OwnershipDisposition);
    }

    [Fact]
    public void MissingAckAndLateStaleAck_CannotBeReused()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);

        var missing = session.Evaluate(ReadyInput(8));
        Assert.Equal("missing-stationary-use-ack", missing.AppliedActionAckCode);
        Assert.False(missing.UseAckWindowActive);

        var stale = session.Evaluate(ReadyInput(9) with
        {
            AppliedActionAck = PositiveAck(use),
            Audio = RawAudio(RawEvent(1, "doropn"))
        });

        Assert.Equal("stale-or-not-expected-ack", stale.AppliedActionAckCode);
        Assert.False(stale.AppliedActionAckValid);
        Assert.False(stale.UseAckWindowActive);
        Assert.False(stale.OpenConfirmed);
        Assert.Equal("ignored:no-valid-applied-use-ack", stale.EvidenceObservationCode);
    }

    [Fact]
    public void MissingAckOutcomeWindow_EndsInFiniteTerminalFailedSafeStop()
    {
        var policy = FastPolicy() with
        {
            AwaitOutcomeFrames = 2,
            MaxUseRetries = 0
        };
        var session = new FirstDoorBrowserControlSession(policy);
        DriveToStationaryUse(session);
        session.Evaluate(ReadyInput(8));
        session.Evaluate(ReadyInput(9));

        var failed = session.Evaluate(ReadyInput(10));

        Assert.Equal(FirstDoorControlState.FailedSafeStop, failed.State);
        Assert.Equal(FirstDoorOwnershipDisposition.FailedSafeStop, failed.OwnershipDisposition);
        Assert.True(failed.Exclusive);
        Assert.False(failed.Action.MoveForward);
        Assert.False(failed.Action.UseKey);
        Assert.Contains("use-retry-budget-exhausted", failed.TerminalFailureCode, StringComparison.Ordinal);
    }

    [Fact]
    public void ManualUseOverlapOnAckPacket_ConsumesDoorOutcomeAndStartsRecovery()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);

        var overlap = session.Evaluate(ReadyInput(8) with
        {
            ManualUseSequence = 1,
            AppliedActionAck = PositiveAck(use) with { ManualUseSequenceAtDecision = 0 },
            Audio = RawAudio(RawEvent(1, "doropn"))
        });

        Assert.False(overlap.OpenConfirmed);
        Assert.False(overlap.FailedUseEvidenceAccepted);
        Assert.Equal("manual-use-overlap", overlap.AppliedActionAckCode);
        Assert.Equal("manual-use-overlap", overlap.UseOutcomeRejectionCode);
        Assert.Equal("ambiguous:manual-use-overlap", overlap.EvidenceObservationCode);
        Assert.Equal(FirstDoorControlState.FailedUseReapproach, overlap.State);
        Assert.True(overlap.Action.MoveBackward);
    }

    [Fact]
    public void AckCannotMoveManualUseBaselinePastTheDecision()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);

        var rejected = session.Evaluate(ReadyInput(8) with
        {
            ManualUseSequence = 1,
            AppliedActionAck = PositiveAck(use) with { ManualUseSequenceAtDecision = 1 },
            Audio = RawAudio(RawEvent(1, "doropn"))
        });

        Assert.Equal("manual-use-decision-sequence-mismatch", rejected.AppliedActionAckCode);
        Assert.False(rejected.AppliedActionAckValid);
        Assert.False(rejected.UseAckWindowActive);
        Assert.False(rejected.OpenConfirmed);
        Assert.Equal("ignored:no-valid-applied-use-ack", rejected.EvidenceObservationCode);
        Assert.Equal(FirstDoorControlState.AwaitOutcome, rejected.State);
    }

    [Fact]
    public void ManualUseBetweenAckAndAudio_InvalidatesStoredWindowPermanently()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);
        var acknowledged = session.Evaluate(ReadyInput(8) with
        {
            AppliedActionAck = PositiveAck(use)
        });
        Assert.True(acknowledged.UseAckWindowActive);

        var manual = session.Evaluate(ReadyInput(9) with { ManualUseSequence = 1 });
        Assert.True(manual.UseAckWindowActive);
        Assert.False(manual.OpenConfirmed);

        var overlap = session.Evaluate(ReadyInput(10) with
        {
            ManualUseSequence = 1,
            Audio = RawAudio(RawEvent(1, "doropn"))
        });

        Assert.False(overlap.OpenConfirmed);
        Assert.Equal("manual-use-overlap", overlap.AppliedActionAckCode);
        Assert.Equal("manual-use-overlap", overlap.UseOutcomeRejectionCode);
        Assert.Equal(FirstDoorControlState.FailedUseReapproach, overlap.State);
        Assert.True(overlap.Action.MoveBackward);
    }

    [Fact]
    public void EventObservedBeforeUse_IsNotRelabeledAsCurrentAttempt()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        session.Evaluate(ReadyInput(0) with { ModelState = "loading" });
        var repeatedAudio = RawAudio(RawEvent(3, "doropn"));
        var use = DriveToStationaryUse(
            session,
            firstPrediction: 1,
            repeatedAudio: repeatedAudio);
        Assert.Equal(FirstDoorControlState.StationaryUse, use.State);

        var stale = session.Evaluate(ReadyInput(9) with { Audio = repeatedAudio });

        Assert.Equal(FirstDoorControlState.AwaitOutcome, stale.State);
        Assert.False(stale.OpenConfirmed);
    }

    [Fact]
    public void BrowserWire_DoesNotAcceptVisualOpenOrComputerRoomAuthority()
    {
        var properties = typeof(BrowserFirstDoorControlInput)
            .GetProperties()
            .Select(property => property.Name)
            .ToHashSet(StringComparer.Ordinal);

        Assert.DoesNotContain("DoorOpenedCount", properties);
        Assert.DoesNotContain("ComputerRoomEntered", properties);
        Assert.DoesNotContain("ComputerRoomVisualConfidence", properties);
        Assert.DoesNotContain("PostDoorTerminalSurface", properties);
    }

    [Fact]
    public void PredictionAndNativeCounterRewinds_DoNotReleaseExclusiveOwner()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session, firstPrediction: 100);
        var awaitOutcome = session.Evaluate(ReadyInput(108) with
        {
            Audio = new BrowserFirstDoorAudioInput { NativeEvents = 10 }
        });
        Assert.Equal(FirstDoorControlState.AwaitOutcome, awaitOutcome.State);

        var rewoundInput = ReadyInput(1);
        var rewound = session.Evaluate(rewoundInput with
        {
            NativeGametic = awaitOutcome.NativeGametic + 1,
            RawObservation = RawYesObservation(110, awaitOutcome.NativeGametic + 1),
            Audio = new BrowserFirstDoorAudioInput { NativeEvents = 0 }
        });

        Assert.Equal(1, rewound.RunGeneration);
        Assert.Equal(use.UseAttemptId, rewound.UseAttemptId);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, rewound.OwnershipDisposition);
        Assert.Contains("prediction-rewound", rewound.AnomalyCode, StringComparison.Ordinal);
        Assert.Contains("native-audio-counter-rewound", rewound.AnomalyCode, StringComparison.Ordinal);
    }

    [Fact]
    public void NativeLevelFacts_AreAcceptedAsReplayTraceNotImplicitRunReset()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var first = session.Evaluate(ReadyInput(20) with
        {
            NativeLevelFactsAvailable = true,
            NativeLevelLoadSequenceAvailable = true,
            NativeLevelLoadSequence = 14,
            NativeGametic = 500,
            NativeLevelTime = 300,
            NativeLevelStartTic = 200,
            NativeGameState = 0,
            NativeGameEpisode = 1,
            NativeGameMap = 1,
            RawObservation = RawYesObservation(21, 500)
        });
        var rewound = session.Evaluate(ReadyInput(21) with
        {
            NativeLevelFactsAvailable = true,
            NativeLevelLoadSequenceAvailable = true,
            NativeLevelLoadSequence = 15,
            NativeGametic = 3,
            NativeLevelTime = 2,
            NativeLevelStartTic = 1,
            NativeGameState = 0,
            NativeGameEpisode = 1,
            NativeGameMap = 1,
            RawObservation = RawYesObservation(22, 3)
        });

        Assert.Equal(first.RunGeneration, rewound.RunGeneration);
        Assert.Equal(2, rewound.ControlTick);
        Assert.True(rewound.NativeLevelFactsAvailable);
        Assert.Equal(3, rewound.NativeGametic);
        Assert.Equal(2, rewound.NativeLevelTime);
        Assert.Equal(1, rewound.NativeLevelStartTic);
        Assert.True(rewound.NativeLevelLoadSequenceAvailable);
        Assert.Equal(15, rewound.NativeLevelLoadSequence);
        Assert.Contains("native-gametic-rewound-without-run-transition", rewound.AnomalyCode, StringComparison.Ordinal);
        Assert.Contains("native-leveltime-rewound-without-run-transition", rewound.AnomalyCode, StringComparison.Ordinal);
    }

    [Fact]
    public void RawContract_DoesNotAcceptJsSemanticAudioClassification()
    {
        var audioProperties = typeof(BrowserFirstDoorAudioInput)
            .GetProperties()
            .Select(property => property.Name)
            .ToHashSet(StringComparer.Ordinal);
        var eventProperties = typeof(BrowserNativeAudioEventInput)
            .GetProperties()
            .Select(property => property.Name)
            .ToHashSet(StringComparer.Ordinal);

        Assert.DoesNotContain("EventType", audioProperties);
        Assert.DoesNotContain("ClassifiedDoorOpenEvent", audioProperties);
        Assert.Contains("Events", audioProperties);
        Assert.Equal(
            new[] { "Sequence", "SfxId", "SfxName" },
            eventProperties.OrderBy(value => value, StringComparer.Ordinal).OrderByExpected());
    }

    [Fact]
    public void BrowserWire_ContainsOnlyRawPerceptionObservation()
    {
        var properties = typeof(BrowserFirstDoorControlInput)
            .GetProperties()
            .Select(property => property.Name)
            .ToHashSet(StringComparer.Ordinal);

        Assert.Contains("RawObservation", properties);
        Assert.DoesNotContain("RouteMode", properties);
        Assert.DoesNotContain("CurrentRoute", properties);
        Assert.DoesNotContain("Context", properties);
        Assert.DoesNotContain("FirstDoorPhaseReady", properties);
        Assert.DoesNotContain("FirstDoorVisionKind", properties);
        Assert.DoesNotContain("FirstDoorVisionScore", properties);
        Assert.DoesNotContain("FirstDoorVisionLocked", properties);
        Assert.DoesNotContain("FootObstacleScore", properties);
        Assert.DoesNotContain("ComputerRoomEntered", properties);
    }

    [Fact]
    public void AcquisitionWindow_AllowsBoundedUnknownBetweenTwoFreshYesObservations()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var firstYes = DriveOpeningRouteToWaypoint3(session);
        var unknown = session.Evaluate(OpeningRoutePoseInput(
            firstPrediction: 0,
            offset: 5,
            playerX: 1360d,
            playerY: -2528d,
            headingDegrees: 0d,
            sector: 2,
            rawFactory: nativeGametic => RawUnknownObservation(2, nativeGametic)));
        var acquired = session.Evaluate(OpeningRoutePoseInput(
            firstPrediction: 0,
            offset: 6,
            playerX: 1360d,
            playerY: -2528d,
            headingDegrees: 0d,
            sector: 2,
            rawFactory: nativeGametic => RawYesObservation(3, nativeGametic)));

        Assert.Equal(1, firstYes.AcquisitionTrace.IdentityYesCountInWindow);
        Assert.Equal(FirstDoorEvidenceTruth.Unknown, unknown.AcquisitionTrace.DoorIdentityTruth);
        Assert.Equal(FirstDoorEvidenceTruth.Yes, unknown.AcquisitionTrace.EffectiveDoorIdentityTruth);
        Assert.Equal(1, unknown.AcquisitionTrace.UnknownGapFrames);
        Assert.Equal(FirstDoorControlState.Approach, acquired.State);
        Assert.True(acquired.AcquisitionTrace.Ready);
        Assert.Equal(FirstDoorAcquisitionStatus.Ready, acquired.AcquisitionTrace.Status);
        Assert.Equal(2, acquired.AcquisitionTrace.IdentityYesCountInWindow);
        Assert.Equal(7, acquired.AcquisitionTrace.AcquiredAtControlTick);
    }

    [Fact]
    public void CapturedGrayFacade_UsesIndependentIdentityConfidenceAndCenteredLatticeAnchor()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy() with
        {
            MinimumDoorIdentityConfidence = 0.50f
        });
        var firstYes = DriveOpeningRouteToWaypoint3(
            session,
            w3RawFactory: nativeGametic => CapturedFirstDoorRawFrameFixtures
                .Dev1046StableSightline021
                .CreateBrowserObservation(465, nativeGametic));
        var acquired = session.Evaluate(OpeningRoutePoseInput(
            firstPrediction: 0,
            offset: 5,
            playerX: 1360d,
            playerY: -2528d,
            headingDegrees: 0d,
            sector: 2,
            rawFactory: nativeGametic => CapturedFirstDoorRawFrameFixtures
                .Dev1046StableSightline022
                .CreateBrowserObservation(486, nativeGametic)));

        Assert.Equal(1, firstYes.AcquisitionTrace.IdentityYesCountInWindow);
        Assert.Equal(FirstDoorControlState.Approach, acquired.State);
        Assert.True(acquired.AcquisitionTrace.Ready);
        Assert.Equal(4, acquired.AcquisitionTrace.TraceVersion);
        Assert.Equal(
            FirstDoorRawPaletteObserver.ObserverVersion,
            acquired.AcquisitionTrace.RawObserverVersion);
        Assert.Equal(
            FirstDoorRawPaletteObserver.ObserverVersion,
            acquired.AcquisitionTrace.CurrentReplayObservation.ObserverVersion);
        Assert.Equal("first-door-wall-pattern", acquired.AcquisitionTrace.CandidateKind);
        Assert.Equal(2, acquired.AcquisitionTrace.CandidateColumn);
        Assert.Equal(4, acquired.AcquisitionTrace.CandidateRow);
        Assert.Equal(0.35f, acquired.AcquisitionTrace.CandidateScore);
        Assert.Equal(
            "first-door-closed-gray-tech-face",
            acquired.AcquisitionTrace.IdentityKind);
        Assert.Equal(3, acquired.AcquisitionTrace.AlignmentColumn);
        Assert.Equal(3, acquired.AcquisitionTrace.AlignmentRow);
        Assert.True(acquired.AcquisitionTrace.DoorIdentityConfidence >= 0.50f);
        Assert.NotEqual(
            acquired.AcquisitionTrace.CandidateScore,
            acquired.AcquisitionTrace.DoorIdentityConfidence);
        Assert.Equal(
            acquired.AcquisitionTrace.IdentityKind,
            acquired.AcquisitionTrace.EffectiveDoorIdentityKind);

        var nearInput = ReadyInput(6);
        var near = session.Evaluate(nearInput with
        {
            RawObservation = CapturedFirstDoorRawFrameFixtures.StationaryClosedDoorPositive055
                .CreateBrowserObservation(487, nearInput.NativeGametic, paletteGeneration: 8)
        });
        var alignedInput = ReadyInput(7);
        var aligned = session.Evaluate(alignedInput with
        {
            RawObservation = CapturedFirstDoorRawFrameFixtures.StationaryClosedDoorPositive055
                .CreateBrowserObservation(488, alignedInput.NativeGametic, paletteGeneration: 8)
        });
        var contactInput = ReadyInput(8);
        var preUseStop = session.Evaluate(contactInput with
        {
            RawObservation = CapturedFirstDoorRawFrameFixtures.StationaryClosedDoorPositive055
                .CreateBrowserObservation(489, contactInput.NativeGametic, paletteGeneration: 8)
        });
        var preUseInput = ReadyInput(9);
        var stationaryUse = session.Evaluate(preUseInput with
        {
            RawObservation = CapturedFirstDoorRawFrameFixtures.StationaryClosedDoorPositive055
                .CreateBrowserObservation(490, preUseInput.NativeGametic, paletteGeneration: 8)
        });

        Assert.Equal(FirstDoorControlState.Align, near.State);
        Assert.Equal(FirstDoorControlState.Contact, aligned.State);
        Assert.True(aligned.DoorIdentityConfidence >= 0.50f);
        Assert.Equal(0, aligned.Action.TurnYaw);
        Assert.Equal(FirstDoorControlState.PreUseStop, preUseStop.State);
        Assert.False(preUseStop.Action.MoveForward);
        Assert.False(preUseStop.Action.UseKey);
        Assert.Equal(FirstDoorControlState.StationaryUse, stationaryUse.State);
        Assert.Equal(FirstDoorEvidenceTruth.Yes, stationaryUse.DoorIdentityTruth);
        Assert.True(stationaryUse.Action.UseKey);
        Assert.False(stationaryUse.Action.MoveForward);
        Assert.False(stationaryUse.Action.MoveBackward);
        Assert.False(stationaryUse.Action.StrafeLeft);
        Assert.False(stationaryUse.Action.StrafeRight);
        Assert.Equal(0, stationaryUse.Action.TurnYaw);
        Assert.False(stationaryUse.Action.AttackKey);
        Assert.False(stationaryUse.RunRequested);
    }

    [Fact]
    public void Dev1047BrightCloseReplay_UsesFreshTick417IdentityForStationaryUse()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy() with
        {
            MinimumDoorIdentityConfidence = 0.50f
        });
        DriveOpeningRouteToWaypoint3(
            session,
            w3RawFactory: nativeGametic => CapturedFirstDoorRawFrameFixtures
                .Dev1046StableSightline021
                .CreateBrowserObservation(465, nativeGametic));
        var acquired = session.Evaluate(OpeningRoutePoseInput(
            firstPrediction: 0,
            offset: 5,
            playerX: 1360d,
            playerY: -2528d,
            headingDegrees: 0d,
            sector: 2,
            rawFactory: nativeGametic => CapturedFirstDoorRawFrameFixtures
                .Dev1046StableSightline022
                .CreateBrowserObservation(486, nativeGametic)));

        BrowserFirstDoorControlInput CloseInput(
            int prediction,
            long frameSequence,
            CapturedFirstDoorRawContractFixture fixture)
        {
            var input = WithPose(
                ReadyInput(prediction),
                1519.8728485107422d,
                -2512.5462341308594d,
                4_257_218_560L,
                sector: 3);
            return input with
            {
                RawObservation = fixture.CreateBrowserObservation(
                    frameSequence,
                    input.NativeGametic,
                    paletteGeneration: 8)
            };
        }

        var near = session.Evaluate(CloseInput(
            6,
            487,
            CapturedFirstDoorRawFrameFixtures.Dev1047BrightClose459));
        var aligned = session.Evaluate(CloseInput(
            7,
            488,
            CapturedFirstDoorRawFrameFixtures.Dev1047StationaryUseBoundary477));
        var preUseStop = session.Evaluate(CloseInput(
            8,
            489,
            CapturedFirstDoorRawFrameFixtures.Dev1047BrightClose488));
        var stationaryUse = session.Evaluate(CloseInput(
            9,
            490,
            CapturedFirstDoorRawFrameFixtures.Dev1047BrightClose508));

        Assert.Equal(FirstDoorControlState.Approach, acquired.State);
        Assert.Equal(486, acquired.AcquisitionTrace.CurrentReplayObservation.FrameSequence);
        Assert.Equal(FirstDoorControlState.Align, near.State);
        Assert.Equal(FirstDoorControlState.Contact, aligned.State);
        Assert.Equal(FirstDoorEvidenceTruth.Yes, aligned.DoorIdentityTruth);
        Assert.True(aligned.DoorIdentityConfidence >= 0.50f);
        Assert.True(aligned.Proximity.WithinUseRange);
        Assert.InRange(aligned.Proximity.DistanceToDoorSegment, 16.12d, 16.13d);
        Assert.InRange(aligned.Proximity.BearingErrorDegrees, -3.17d, -3.16d);
        Assert.Equal(0, aligned.Action.TurnYaw);
        Assert.Equal(FirstDoorControlState.PreUseStop, preUseStop.State);
        Assert.False(preUseStop.Action.UseKey);
        Assert.Equal(FirstDoorControlState.StationaryUse, stationaryUse.State);
        Assert.Equal(FirstDoorEvidenceTruth.Yes, stationaryUse.DoorIdentityTruth);
        Assert.Equal(486, stationaryUse.AcquisitionTrace.CurrentReplayObservation.FrameSequence);
        Assert.True(stationaryUse.Action.UseKey);
        Assert.False(stationaryUse.Action.MoveForward);
        Assert.False(stationaryUse.Action.MoveBackward);
        Assert.False(stationaryUse.Action.StrafeLeft);
        Assert.False(stationaryUse.Action.StrafeRight);
        Assert.Equal(0, stationaryUse.Action.TurnYaw);
        Assert.False(stationaryUse.Action.AttackKey);
        Assert.False(stationaryUse.RunRequested);
    }

    [Fact]
    public void DuplicateFrame_DoesNotAddIdentityEvidence()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var firstYes = DriveOpeningRouteToWaypoint3(session);
        var duplicate = session.Evaluate(OpeningRoutePoseInput(
            firstPrediction: 0,
            offset: 5,
            playerX: 1360d,
            playerY: -2528d,
            headingDegrees: 0d,
            sector: 2,
            rawFactory: nativeGametic => RawYesObservation(1, nativeGametic)));
        var acquired = session.Evaluate(OpeningRoutePoseInput(
            firstPrediction: 0,
            offset: 6,
            playerX: 1360d,
            playerY: -2528d,
            headingDegrees: 0d,
            sector: 2,
            rawFactory: nativeGametic => RawYesObservation(2, nativeGametic)));

        Assert.Equal(1, firstYes.AcquisitionTrace.IdentityYesCountInWindow);
        Assert.False(duplicate.AcquisitionTrace.FreshObservation);
        Assert.Equal(1, duplicate.AcquisitionTrace.IdentityYesCountInWindow);
        Assert.Equal(FirstDoorAcquisitionBlockCode.DuplicateRawFrame, duplicate.AcquisitionTrace.BlockCode);
        Assert.Equal(FirstDoorControlState.Approach, acquired.State);
    }

    [Fact]
    public void ExplicitNo_ClearsPriorIdentityWindow()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        DriveOpeningRouteToWaypoint3(session);
        var rejected = session.Evaluate(OpeningRoutePoseInput(
            firstPrediction: 0,
            offset: 5,
            playerX: 1360d,
            playerY: -2528d,
            headingDegrees: 0d,
            sector: 2,
            rawFactory: nativeGametic => RawNoObservation(2, nativeGametic)));
        var oneYes = session.Evaluate(OpeningRoutePoseInput(
            firstPrediction: 0,
            offset: 6,
            playerX: 1360d,
            playerY: -2528d,
            headingDegrees: 0d,
            sector: 2,
            rawFactory: nativeGametic => RawYesObservation(3, nativeGametic)));
        var acquired = session.Evaluate(OpeningRoutePoseInput(
            firstPrediction: 0,
            offset: 7,
            playerX: 1360d,
            playerY: -2528d,
            headingDegrees: 0d,
            sector: 2,
            rawFactory: nativeGametic => RawYesObservation(4, nativeGametic)));

        Assert.Equal(FirstDoorEvidenceTruth.No, rejected.AcquisitionTrace.DoorIdentityTruth);
        Assert.Equal(0, rejected.AcquisitionTrace.IdentityYesCountInWindow);
        Assert.True(rejected.AcquisitionTrace.CurrentReplayObservation.Available);
        Assert.False(rejected.AcquisitionTrace.LastAcceptedYesReplayObservation.Available);
        Assert.Equal(1, oneYes.AcquisitionTrace.IdentityYesCountInWindow);
        Assert.Equal(FirstDoorControlState.OpeningNavigate, oneYes.State);
        Assert.Equal(FirstDoorControlState.Approach, acquired.State);
    }

    [Fact]
    public void ModelLoadingIsOutsideRawMissingAndAcquisitionBudgets()
    {
        var policy = FastPolicy() with
        {
            AcquisitionTimeoutFrames = 5,
            AcquisitionMaximumRawMissingFrames = 3
        };
        var session = new FirstDoorBrowserControlSession(policy);
        for (var prediction = 0; prediction < 6; prediction++)
        {
            var loading = ReadyInput(prediction);
            var decision = session.Evaluate(loading with
            {
                ModelState = "loading",
                RawObservation = new BrowserFirstDoorRawObservation()
            });
            Assert.Equal(0, decision.AcquisitionTrace.PostReadinessFrames);
            Assert.Equal(FirstDoorControlState.OpeningTransit, decision.State);
        }

        FirstDoorControlDecision? terminal = null;
        for (var prediction = 6; prediction < 9; prediction++)
        {
            terminal = session.Evaluate(ReadyInput(prediction) with
            {
                RawObservation = new BrowserFirstDoorRawObservation()
            });
        }

        Assert.NotNull(terminal);
        Assert.Equal(FirstDoorControlState.FailedSafeStop, terminal.State);
        Assert.Equal("first-door-raw-observation-missing-budget-exhausted", terminal.TerminalFailureCode);
        Assert.Equal(0, terminal.AcquisitionTrace.AcquiredAtControlTick);
        Assert.Equal(FirstDoorAcquisitionBlockCode.RawObservationMissingBudgetExhausted, terminal.AcquisitionTrace.BlockCode);
    }

    [Fact]
    public void ReadinessLossAfterOpeningOwnership_FailsWithWireSafeNavigationSnapshot()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var active = session.Evaluate(WithPose(
            ReadyInput(0),
            1056d,
            -3616d,
            angleBam: 1L << 30));
        Assert.Equal(FirstDoorControlState.OpeningNavigate, active.State);

        var lost = session.Evaluate(ReadyInput(1) with
        {
            ModelState = "loading",
            NativePlayerFactsAvailable = false,
            RawObservation = new BrowserFirstDoorRawObservation()
        });

        Assert.Equal(FirstDoorControlState.FailedSafeStop, lost.State);
        Assert.Equal("control-readiness-lost", lost.TerminalFailureCode);
        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, lost.OpeningNavigation.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.ControlNotReady,
            lost.OpeningNavigation.BlockCode);
        Assert.Equal(-1, lost.OpeningNavigation.NativeGametic);
        Assert.False(lost.OpeningNavigation.Action.MoveForward);
        Assert.False(lost.OpeningNavigation.Action.MoveBackward);
        Assert.Equal(0, lost.OpeningNavigation.Action.TurnYaw);
        Assert.False(lost.OpeningNavigation.Action.UseKey);
        Assert.False(lost.OpeningNavigation.Action.AttackKey);
    }

    [Fact]
    public void FinalInclusiveAcquisitionTick_WinsBeforeDeadlineExpiry()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy() with
        {
            AcquisitionTimeoutFrames = 5
        });

        var acquired = DriveOpeningRouteToApproach(session);

        Assert.Equal(5, acquired.AcquisitionTrace.PostReadinessFrames);
        Assert.Equal(FirstDoorAcquisitionStatus.Ready, acquired.AcquisitionTrace.Status);
        Assert.Equal(FirstDoorControlState.Approach, acquired.State);
    }

    [Fact]
    public void AcquisitionTrace_FreezesReplayAtAcquisitionAndClearsOnFreshRun()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);
        var acquired = use.AcquisitionTrace;

        Assert.True(acquired.Ready);
        Assert.Equal(FirstDoorAcquisitionBlockCode.None, acquired.BlockCode);
        Assert.Equal(6, acquired.EvaluatedAtControlTick);
        Assert.Equal(6, acquired.AcquiredAtControlTick);
        Assert.True(acquired.CurrentReplayObservation.Available);
        Assert.True(acquired.LastAcceptedYesReplayObservation.Available);
        Assert.True(acquired.AcceptedYesReplayObservations.Count >= 2);
        Assert.Equal(
            acquired.AcceptedYesReplayObservations.Count,
            acquired.AcceptedYesReplayObservations
                .Select(item => item.FrameSequence)
                .Distinct()
                .Count());
        Assert.Equal(acquired.IdentityWindowSize, acquired.IdentityWindow.Count);
        Assert.Equal(FirstDoorRawPaletteObserver.SampleCount, Convert.FromBase64String(acquired.CurrentReplayObservation.PaletteIndicesBase64).Length);
        Assert.Equal(FirstDoorRawPaletteObserver.PaletteRgbaByteCount, Convert.FromBase64String(acquired.CurrentReplayObservation.PaletteRgbaBase64).Length);

        var afterUse = session.Evaluate(ReadyInput(8));
        Assert.Equal(acquired, afterUse.AcquisitionTrace);

        var reset = session.Evaluate(ReadyInput(9) with
        {
            RunId = $"{RunId}:next",
            RunGeneration = 2,
            ResetRequested = true,
            ResetOperationId = $"{RunId}:next:reset-1",
            LifecycleEvent = "explicit-run-reset"
        });

        Assert.Equal(FirstDoorControlState.OpeningNavigate, reset.State);
        Assert.Equal(0, reset.AcquisitionTrace.RouteIntentStableFrames);
        Assert.Equal(0, reset.AcquisitionTrace.IdentityYesCountInWindow);
        Assert.Equal(0, reset.AcquisitionTrace.AcquiredAtControlTick);
        Assert.False(reset.AcquisitionTrace.Ready);
    }

    [Fact]
    public void PostAcquisitionDecision_PublishesCurrentRawReplayBesideFrozenAcquisitionReplay()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);

        Assert.Equal(FirstDoorControlState.StationaryUse, use.State);
        Assert.True(use.AcquisitionTrace.CurrentReplayObservation.Available);
        Assert.True(use.ComputerRoomTrace.CurrentReplayObservation.Available);
        Assert.Equal(2, use.AcquisitionTrace.CurrentReplayObservation.FrameSequence);
        Assert.Equal(8, use.ComputerRoomTrace.CurrentReplayObservation.FrameSequence);
        Assert.NotEqual(
            use.AcquisitionTrace.CurrentReplayObservation.ObservationHash,
            use.ComputerRoomTrace.CurrentReplayObservation.ObservationHash);
        Assert.Equal(
            FirstDoorComputerRoomBlockCode.NotInConfirmationPhase,
            use.ComputerRoomTrace.BlockCode);
        Assert.Equal("computer-room-confirmation-not-active", use.ComputerRoomTrace.Reason);
    }

    [Fact]
    public void PredictionRewind_DoesNotResetFreshRawEvidence()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        DriveOpeningRouteToWaypoint3(session, firstPrediction: 100);
        var rewoundInput = OpeningRoutePoseInput(
            firstPrediction: 100,
            offset: 5,
            playerX: 1360d,
            playerY: -2528d,
            headingDegrees: 0d,
            sector: 2,
            rawFactory: nativeGametic => RawYesObservation(102, nativeGametic)) with
        {
            Prediction = 5
        };
        var acquired = session.Evaluate(rewoundInput);

        Assert.Equal(FirstDoorControlState.Approach, acquired.State);
        Assert.Contains("prediction-rewound", acquired.AnomalyCode, StringComparison.Ordinal);
        Assert.True(acquired.AcquisitionTrace.Ready);
        Assert.Equal(6, acquired.AcquisitionTrace.AcquiredAtControlTick);
    }

    [Fact]
    public void SameFrameWithDifferentSample_FailsClosed()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        session.Evaluate(ReadyInput(0));
        session.Evaluate(ReadyInput(1));
        var changedInput = ReadyInput(2);
        var failed = session.Evaluate(changedInput with
        {
            RawObservation = RawUnknownObservation(2, changedInput.NativeGametic)
        });

        Assert.Equal(FirstDoorControlState.FailedSafeStop, failed.State);
        Assert.Equal("raw-frame-sequence-redefined", failed.TerminalFailureCode);
        Assert.Equal(0, failed.AcquisitionTrace.AcquiredAtControlTick);
    }

    [Fact]
    public void CapturedRoomFrames_SeparateFromFirstDoorAndPublishReplayableCompletion()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);
        var opened = session.Evaluate(ReadyInput(8) with
        {
            AppliedActionAck = PositiveAck(use),
            Audio = RawAudio(RawEvent(1, "doropn"))
        });
        Assert.Equal(FirstDoorControlState.PostOpenShove, opened.State);

        var handoff = session.Evaluate(ComputerRoomInput(9));
        Assert.Equal(FirstDoorControlState.AwaitComputerRoom, handoff.State);
        Assert.Equal(FirstDoorOwnershipDisposition.HandOff, handoff.OwnershipDisposition);

        var stillDoor = session.Evaluate(ComputerRoomInput(10));
        Assert.Equal(FirstDoorControlState.AwaitComputerRoom, stillDoor.State);
        Assert.False(stillDoor.Completed);
        Assert.Equal(FirstDoorComputerRoomBlockCode.FirstDoorStillVisible, stillDoor.ComputerRoomTrace.BlockCode);

        FirstDoorControlDecision? capturedNegative = null;
        for (var prediction = 11; prediction <= 13; prediction++)
        {
            var negativeInput = ComputerRoomInput(prediction);
            capturedNegative = session.Evaluate(negativeInput with
            {
                RawObservation = CapturedFirstDoorRawFrameFixtures.StationaryUseNegative055
                    .CreateBrowserObservation(
                        frameSequence: prediction + 1L,
                        nativeGametic: negativeInput.NativeGametic,
                        paletteGeneration: 8)
            });
        }

        Assert.NotNull(capturedNegative);
        Assert.Equal(FirstDoorControlState.AwaitComputerRoom, capturedNegative.State);
        Assert.False(capturedNegative.Completed);
        Assert.Equal(
            FirstDoorComputerRoomBlockCode.FirstDoorStillVisible,
            capturedNegative.ComputerRoomTrace.BlockCode);
        Assert.Equal(0.44d, capturedNegative.ComputerRoomTrace.FirstDoorCandidateScore);
        Assert.Equal(0.20d, capturedNegative.ComputerRoomTrace.RoomScore);
        Assert.Equal(0, capturedNegative.ComputerRoomTrace.StableFrames);
        Assert.Empty(capturedNegative.ComputerRoomTrace.AcceptedPositiveReplayObservations);

        FirstDoorControlDecision? completed = null;
        var roomPrediction = 14;
        foreach (var fixture in CapturedFirstDoorRawFrameFixtures.ComputerRoomPositiveSequence)
        {
            var roomInput = ComputerRoomInput(roomPrediction);
            completed = session.Evaluate(roomInput with
            {
                RawObservation = fixture.CreateBrowserObservation(
                    frameSequence: roomPrediction + 1L,
                    nativeGametic: roomInput.NativeGametic,
                    paletteGeneration: 8)
            });
            roomPrediction++;
        }

        Assert.NotNull(completed);
        Assert.True(
            completed.State == FirstDoorControlState.Complete,
            $"state={completed.State}; block={completed.ComputerRoomTrace.BlockCode}; "
            + $"truth={completed.ComputerRoomTrace.Truth}; reason={completed.ComputerRoomTrace.Reason}; "
            + $"stable={completed.ComputerRoomTrace.StableFrames}; room={completed.ComputerRoomTrace.RoomScore}; "
            + $"candidate={completed.ComputerRoomTrace.FirstDoorCandidateScore}; "
            + $"blue={completed.ComputerRoomTrace.BlueScore}; red={completed.ComputerRoomTrace.RedLightScore}; "
            + $"dark={completed.ComputerRoomTrace.DarkPanelScore}; panel={completed.ComputerRoomTrace.PanelScore}; "
            + $"luma={completed.ComputerRoomTrace.GameplayLuma}; "
            + $"separated={completed.ComputerRoomTrace.VisualContentSeparatedFromPreOpen}");
        Assert.Equal(FirstDoorOwnershipDisposition.Completed, completed.OwnershipDisposition);
        Assert.True(completed.Completed);
        Assert.True(completed.SemanticDelta.HasChanges);
        Assert.True(completed.SemanticDelta.ComputerRoomEntered);
        Assert.True(completed.ComputerRoomTrace.Ready);
        Assert.Equal(FirstDoorComputerRoomBlockCode.None, completed.ComputerRoomTrace.BlockCode);
        Assert.Equal(3, completed.ComputerRoomTrace.StableFrames);
        Assert.Equal(3, completed.ComputerRoomTrace.RequiredStableFrames);
        Assert.Equal(3, completed.ComputerRoomTrace.AcceptedPositiveReplayObservations.Count);
        Assert.Equal(
            3,
            completed.ComputerRoomTrace.AcceptedPositiveReplayObservations
                .Select(item => item.ObservationHash)
                .Distinct(StringComparer.Ordinal)
                .Count());
        Assert.All(
            completed.ComputerRoomTrace.AcceptedPositiveReplayObservations,
            replay =>
            {
                Assert.True(replay.Available);
                Assert.Equal(64, replay.ObservationHash.Length);
                Assert.Equal(64, replay.VisualContentHash.Length);
                Assert.Equal(348, replay.PaletteIndicesBase64.Length);
                Assert.Equal(1368, replay.PaletteRgbaBase64.Length);
            });
        Assert.Contains(
            completed.TransitionReplaySnapshots,
            snapshot => snapshot.EventKind.Contains("stationary-use-command", StringComparison.Ordinal));
        Assert.Contains(
            completed.TransitionReplaySnapshots,
            snapshot => snapshot.EventKind.Contains("trusted-open-accepted", StringComparison.Ordinal));
        Assert.Equal(
            3,
            completed.TransitionReplaySnapshots.Count(snapshot =>
                snapshot.EventKind.Contains("computer-room-window-update", StringComparison.Ordinal)));
        Assert.Contains(
            completed.TransitionReplaySnapshots,
            snapshot => snapshot.EventKind.Contains("terminal", StringComparison.Ordinal)
                && snapshot.State == FirstDoorControlState.Complete);
        Assert.Single(
            completed.TransitionReplaySnapshots,
            snapshot => snapshot.EventKind.Contains("trusted-open-accepted", StringComparison.Ordinal));
        Assert.DoesNotContain(
            completed.TransitionReplaySnapshots,
            snapshot => snapshot.State == FirstDoorControlState.Complete
                && snapshot.EventKind.Contains("trusted-open-accepted", StringComparison.Ordinal));
        Assert.All(
            completed.TransitionReplaySnapshots,
            snapshot =>
            {
                Assert.Equal(1, snapshot.RunGeneration);
                Assert.Equal(SessionId, snapshot.SessionId);
                Assert.Equal(RunId, snapshot.RunId);
                if (snapshot.EventKind.Contains("stationary-use-command", StringComparison.Ordinal)
                    || snapshot.EventKind.Contains("trusted-open-accepted", StringComparison.Ordinal)
                    || snapshot.EventKind.Contains("terminal", StringComparison.Ordinal))
                {
                    Assert.True(snapshot.ReplayObservation.Available);
                }
            });
    }

    [Fact]
    public void Dev1050RoomReplay_AppliesStructuredBlueOnlyAfterTrustedOpenAndCompletesOnThreeFreshFrames()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);
        var opened = session.Evaluate(ReadyInput(8) with
        {
            AppliedActionAck = PositiveAck(use),
            Audio = RawAudio(RawEvent(1, "doropn"))
        });
        Assert.Equal(FirstDoorControlState.PostOpenShove, opened.State);
        Assert.False(opened.ComputerRoomTrace.StructuredBlueApplied);

        var handoff = session.Evaluate(ComputerRoomInput(9));
        Assert.Equal(FirstDoorControlState.AwaitComputerRoom, handoff.State);

        var firstInput = ComputerRoomInput(10);
        var first = session.Evaluate(firstInput with
        {
            RawObservation = CapturedFirstDoorRawFrameFixtures.Dev1050ComputerRoom056
                .CreateBrowserObservation(11, firstInput.NativeGametic, paletteGeneration: 8)
        });
        Assert.True(
            first.State == FirstDoorControlState.AwaitComputerRoom,
            $"state={first.State}; terminal={first.TerminalFailureCode}; contract={first.ContractError}; "
            + $"block={first.ComputerRoomTrace.BlockCode}; reason={first.ComputerRoomTrace.Reason}; "
            + $"raw={first.AcquisitionTrace.RawObservationReason}");
        Assert.Equal(FirstDoorComputerRoomBlockCode.PositiveWindowPending, first.ComputerRoomTrace.BlockCode);
        Assert.Equal(1, first.ComputerRoomTrace.StableFrames);
        Assert.True(first.ComputerRoomTrace.StructuredBlueApplied);
        Assert.Equal(0.15, first.ComputerRoomTrace.RawRoomScore);
        Assert.Equal(0, first.ComputerRoomTrace.RawBlueScore);
        Assert.Equal(0.24, first.ComputerRoomTrace.StructuredBlueScore);
        Assert.Equal(0.22, first.ComputerRoomTrace.RoomScore);
        Assert.Equal(12, first.ComputerRoomTrace.StructuredBlueCellCount);
        Assert.Equal(4, first.ComputerRoomTrace.StructuredBlueRowCount);
        Assert.Equal(6, first.ComputerRoomTrace.StructuredBlueColumnCount);

        var duplicateInput = ComputerRoomInput(11);
        var duplicate = session.Evaluate(duplicateInput with
        {
            RawObservation = CapturedFirstDoorRawFrameFixtures.Dev1050ComputerRoom056
                .CreateBrowserObservation(11, duplicateInput.NativeGametic, paletteGeneration: 8)
        });
        Assert.Equal(FirstDoorControlState.AwaitComputerRoom, duplicate.State);
        Assert.Equal(FirstDoorComputerRoomBlockCode.DuplicateRawFrame, duplicate.ComputerRoomTrace.BlockCode);
        Assert.Equal(1, duplicate.ComputerRoomTrace.StableFrames);
        Assert.False(duplicate.ComputerRoomTrace.StructuredBlueApplied);

        var secondInput = ComputerRoomInput(12);
        var second = session.Evaluate(secondInput with
        {
            RawObservation = CapturedFirstDoorRawFrameFixtures.Dev1050ComputerRoom057
                .CreateBrowserObservation(13, secondInput.NativeGametic, paletteGeneration: 8)
        });
        Assert.Equal(FirstDoorControlState.AwaitComputerRoom, second.State);
        Assert.Equal(2, second.ComputerRoomTrace.StableFrames);
        Assert.Equal(0.16, second.ComputerRoomTrace.RawRoomScore);
        Assert.Equal(0.22, second.ComputerRoomTrace.RoomScore);

        var thirdInput = ComputerRoomInput(13);
        var completed = session.Evaluate(thirdInput with
        {
            RawObservation = CapturedFirstDoorRawFrameFixtures.Dev1050ComputerRoom058
                .CreateBrowserObservation(14, thirdInput.NativeGametic, paletteGeneration: 8)
        });
        Assert.Equal(FirstDoorControlState.Complete, completed.State);
        Assert.Equal(FirstDoorComputerRoomBlockCode.None, completed.ComputerRoomTrace.BlockCode);
        Assert.Equal(3, completed.ComputerRoomTrace.StableFrames);
        Assert.True(completed.ComputerRoomTrace.Ready);
        Assert.Equal(0.22, completed.ComputerRoomTrace.RoomScore);
        Assert.Equal(3, completed.ComputerRoomTrace.AcceptedPositiveReplayObservations.Count);
    }

    [Fact]
    public void Dev1050ExactRoomFrames_AreRejectedInEveryEnemyAlcoveSector()
    {
        int[] enemyAlcoveSectors = [8, 51, 52];

        foreach (var fixture in CapturedFirstDoorRawFrameFixtures.Dev1050ComputerRoomSequence)
        {
            foreach (var sector in enemyAlcoveSectors)
            {
                var session = new FirstDoorBrowserControlSession(FastPolicy());
                var use = DriveToStationaryUse(session);
                session.Evaluate(ReadyInput(8) with
                {
                    AppliedActionAck = PositiveAck(use),
                    Audio = RawAudio(RawEvent(1, "doropn"))
                });
                var handoff = session.Evaluate(ComputerRoomInput(9));
                Assert.Equal(FirstDoorControlState.AwaitComputerRoom, handoff.State);

                var wrongSectorInput = WithPose(
                    ComputerRoomInput(10),
                    1760d,
                    -2512d,
                    AngleBam(0),
                    sector);
                var rejected = session.Evaluate(wrongSectorInput with
                {
                    RawObservation = fixture.CreateBrowserObservation(
                        fixture.FrameSequence,
                        wrongSectorInput.NativeGametic,
                        paletteGeneration: 8)
                });

                Assert.Equal(FirstDoorControlState.AwaitComputerRoom, rejected.State);
                Assert.Equal(
                    FirstDoorComputerRoomBlockCode.ComputerRoomTopologyMismatch,
                    rejected.ComputerRoomTrace.BlockCode);
                Assert.Equal(0, rejected.ComputerRoomTrace.StableFrames);
                Assert.Equal(0.24, rejected.ComputerRoomTrace.StructuredBlueScore);
                Assert.False(rejected.ComputerRoomTrace.StructuredBlueApplied);
                Assert.False(rejected.SemanticDelta.ComputerRoomEntered);
            }
        }
    }

    [Fact]
    public void PostComputerRoomActivationProof_ComesOnlyFromCurrentScopedCSharpHandoff()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        Assert.Null(session.TryCreatePostComputerRoomActivationProof(1));

        var use = DriveToStationaryUse(session);
        session.Evaluate(ReadyInput(8) with
        {
            AppliedActionAck = PositiveAck(use),
            Audio = RawAudio(RawEvent(1, "doropn"))
        });
        var handoff = session.Evaluate(ComputerRoomInput(9));

        Assert.Null(session.TryCreatePostComputerRoomActivationProof(handoff.ControlTick - 1));
        var proof = session.TryCreatePostComputerRoomActivationProof(handoff.ControlTick);
        Assert.NotNull(proof);
        Assert.Equal(handoff.SessionId, proof.SessionId);
        Assert.Equal(handoff.RunId, proof.RunId);
        Assert.Equal(handoff.RunGeneration, proof.RunGeneration);
        Assert.Equal(FirstDoorControlState.AwaitComputerRoom, proof.FirstDoorState);
        Assert.Equal(FirstDoorOwnershipDisposition.HandOff, proof.FirstDoorOwnershipDisposition);
        Assert.True(proof.OpenConfirmed);
        Assert.Equal(handoff.OpenConfirmationSource, proof.OpenConfirmationSource);
        Assert.NotEqual(FirstDoorOpenConfirmationSource.None, proof.OpenConfirmationSource);
        Assert.False(proof.ComputerRoomConfirmed);
        Assert.Equal(7, proof.Proximity.PlayerSectorIndex);
    }

    [Fact]
    public void MissingScopeDuringComputerRoomHandoff_IsRejectedBeforeGenerationMutation()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);
        var opened = session.Evaluate(ReadyInput(8) with
        {
            AppliedActionAck = PositiveAck(use),
            Audio = RawAudio(RawEvent(1, "doropn"))
        });
        Assert.Equal(FirstDoorControlState.PostOpenShove, opened.State);

        var handoff = session.Evaluate(ReadyInput(9));
        Assert.Equal(FirstDoorControlState.AwaitComputerRoom, handoff.State);
        Assert.True(handoff.ComputerRoomTrace.CurrentReplayObservation.Available);

        var invalid = session.Evaluate(ReadyInput(10) with
        {
            SessionId = string.Empty,
            RunId = string.Empty,
            RunGeneration = 0,
            ResetRequested = true
        });

        Assert.Equal(FirstDoorControlState.FailedSafeStop, invalid.State);
        Assert.Equal("missing-session-id", invalid.TerminalFailureCode);
        Assert.Equal(SessionId, invalid.SessionId);
        Assert.Equal(RunId, invalid.RunId);
        Assert.Equal(1, invalid.RunGeneration);
        Assert.False(invalid.RunBoundaryApplied);
        Assert.Equal(handoff.AcquisitionTrace, invalid.AcquisitionTrace);
        Assert.Equal(
            FirstDoorComputerRoomBlockCode.ControllerTerminated,
            invalid.ComputerRoomTrace.BlockCode);
        Assert.Equal("missing-session-id", invalid.ComputerRoomTrace.Reason);
        Assert.Equal(
            handoff.ComputerRoomTrace.ObservationHash,
            invalid.ComputerRoomTrace.ObservationHash);
        Assert.DoesNotContain(
            invalid.TransitionReplaySnapshots,
            snapshot => snapshot.ControlTick == invalid.ControlTick
                && snapshot.EventKind.Contains("run-boundary", StringComparison.Ordinal));

        var repeated = session.Evaluate(ReadyInput(11));
        Assert.Equal(FirstDoorControlState.FailedSafeStop, repeated.State);
        Assert.Equal("missing-session-id", repeated.TerminalFailureCode);
        Assert.Equal(invalid.ComputerRoomTrace, repeated.ComputerRoomTrace);
        Assert.Equal(invalid.AcquisitionTrace, repeated.AcquisitionTrace);
        Assert.Equal(invalid.TransitionReplaySnapshots, repeated.TransitionReplaySnapshots);
    }

    [Fact]
    public void MissingWireContractFields_FailClosedInsteadOfUsingSuccessDefaults()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());

        var missing = session.Evaluate(new BrowserFirstDoorControlInput());

        Assert.Equal(FirstDoorControlState.FailedSafeStop, missing.State);
        Assert.Equal(FirstDoorOwnershipDisposition.FailedSafeStop, missing.OwnershipDisposition);
        Assert.True(missing.Exclusive);
        Assert.False(missing.Action.MoveForward);
        Assert.False(missing.Action.UseKey);
        Assert.Equal("unsupported-contract-version", missing.ReasonCode);
        Assert.Equal(0, missing.ContractVersion);
        Assert.Empty(missing.SessionId);
        Assert.Empty(missing.RunId);
    }

    [Fact]
    public void Dev1044SpawnRawDoorPositive_DoesNotAcquireOutsideNativeHandoffRange()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy() with
        {
            AcquisitionRequiredRouteFrames = 1,
            AcquisitionRequiredIdentityFrames = 1
        });
        FirstDoorControlDecision decision = new();
        for (var prediction = 0; prediction < 4; prediction++)
        {
            decision = session.Evaluate(WithPose(
                ReadyInput(prediction),
                1056,
                -3616,
                angleBam: 1L << 30));
        }

        Assert.Equal(FirstDoorControlState.OpeningNavigate, decision.State);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, decision.OwnershipDisposition);
        Assert.True(decision.Action.MoveForward);
        Assert.True(decision.OpeningNavigation.Action.MoveForward);
        Assert.False(decision.Action.UseKey);
        Assert.False(decision.AcquisitionTrace.Ready);
        Assert.Equal(
            FirstDoorAcquisitionBlockCode.OutsideAcquisitionHandoffRange,
            decision.AcquisitionTrace.BlockCode);
        Assert.False(decision.Proximity.WithinAcquisitionRange);
        Assert.InRange(decision.Proximity.DistanceToDoorSegment, 1159.9d, 1160.1d);
    }

    [Fact]
    public void NearDoorPose_DoesNotBypassTopologyAndRouteAcquisitionFreezesProximity()
    {
        var policy = FastPolicy() with
        {
            AcquisitionRequiredRouteFrames = 1,
            AcquisitionRequiredIdentityFrames = 1
        };
        var nearDoorSession = new FirstDoorBrowserControlSession(policy);
        var firstNearDoor = nearDoorSession.Evaluate(ReadyInput(0));
        var secondNearDoor = nearDoorSession.Evaluate(ReadyInput(1));

        Assert.Equal(FirstDoorControlState.OpeningNavigate, firstNearDoor.State);
        Assert.Equal(FirstDoorControlState.OpeningNavigate, secondNearDoor.State);
        Assert.False(secondNearDoor.OpeningNavigation.ReadyForAcquisition);
        Assert.True(secondNearDoor.OpeningNavigation.Active);

        var routeSession = new FirstDoorBrowserControlSession(policy);
        var acquired = DriveOpeningRouteToApproach(routeSession);
        Assert.Equal(FirstDoorControlState.Approach, acquired.State);
        Assert.True(acquired.AcquisitionTrace.Ready);
        Assert.True(acquired.AcquisitionTrace.Proximity.Fresh);
        Assert.True(acquired.AcquisitionTrace.Proximity.WithinAcquisitionRange);
        Assert.False(acquired.AcquisitionTrace.Proximity.WithinUseRange);
        Assert.Equal(
            acquired.AcquisitionTrace.Proximity.ObservationHash,
            acquired.Proximity.ObservationHash);
    }

    [Theory]
    [InlineData("wrong-hash", 1, "canonical-doom1-wad-sha256-mismatch")]
    [InlineData(
        FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
        2,
        "unsupported-proximity-map:e1m2")]
    public void WrongWadOrMap_FailsClosedBeforeOwnership(
        string wadHash,
        int map,
        string expectedFailure)
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());

        var failed = session.Evaluate(ReadyInput(0) with
        {
            WadContentSha256 = wadHash,
            NativeGameMap = map
        });

        Assert.Equal(FirstDoorControlState.FailedSafeStop, failed.State);
        Assert.Equal(expectedFailure, failed.TerminalFailureCode);
        Assert.Equal(FirstDoorOwnershipDisposition.FailedSafeStop, failed.OwnershipDisposition);
        Assert.False(failed.Action.MoveForward);
        Assert.False(failed.Action.UseKey);
    }

    [Fact]
    public void MissingPose_IsNeutralUntilFiniteOpeningNavigationBudgetExpires()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy() with
        {
            AcquisitionRequiredRouteFrames = 1,
            AcquisitionRequiredIdentityFrames = 1,
            AcquisitionMaximumProximityMissingFrames = 31
        });
        FirstDoorControlDecision? first = null;
        FirstDoorControlDecision? waiting = null;
        for (var prediction = 0; prediction < 29; prediction++)
        {
            var decision = session.Evaluate(ReadyInput(prediction) with
            {
                NativePlayerFactsAvailable = false
            });
            first ??= decision;
            waiting = decision;
        }

        var expired = session.Evaluate(ReadyInput(29) with
        {
            NativePlayerFactsAvailable = false
        });

        Assert.NotNull(first);
        Assert.NotNull(waiting);
        Assert.Equal(FirstDoorControlState.OpeningNavigate, first.State);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, first.OwnershipDisposition);
        Assert.True(first.Exclusive);
        Assert.False(first.RunRequested);
        Assert.True(first.OpeningNavigation.Active);
        Assert.Equal(1, first.OpeningNavigation.PoseMissingFrames);
        Assert.False(first.Action.MoveForward);
        Assert.False(first.Action.MoveBackward);
        Assert.False(first.Action.StrafeLeft);
        Assert.False(first.Action.StrafeRight);
        Assert.Equal(0, first.Action.TurnYaw);
        Assert.False(first.Action.UseKey);
        Assert.False(first.Action.AttackKey);
        Assert.Equal(FirstDoorControlState.OpeningNavigate, waiting.State);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, waiting.OwnershipDisposition);
        Assert.False(waiting.Action.MoveForward);
        Assert.Equal(29, waiting.OpeningNavigation.PoseMissingFrames);
        Assert.Equal(30, waiting.OpeningNavigation.MaximumPoseMissingFrames);
        Assert.Equal(FirstDoorControlState.FailedSafeStop, expired.State);
        Assert.Equal(30, expired.OpeningNavigation.PoseMissingFrames);
        Assert.Equal(30, expired.OpeningNavigation.MaximumPoseMissingFrames);
        Assert.Equal(
            "opening-navigation-pose-missing-budget-exhausted",
            expired.TerminalFailureCode);
    }

    [Fact]
    public void NavigationTerminal_FreezesSnapshotAndReplayUntilExplicitNewRun()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy() with
        {
            AcquisitionMaximumProximityMissingFrames = 31
        });
        FirstDoorControlDecision terminal = new();
        for (var prediction = 0; prediction < 30; prediction++)
        {
            terminal = session.Evaluate(ReadyInput(prediction) with
            {
                NativePlayerFactsAvailable = false
            });
        }

        Assert.Equal(FirstDoorControlState.FailedSafeStop, terminal.State);
        var frozenNavigation = terminal.OpeningNavigation;
        var frozenReplay = terminal.TransitionReplaySnapshots.ToArray();

        var repeated = session.Evaluate(WithPose(
            ReadyInput(30),
            1360d,
            -2528d,
            angleBam: 0,
            sector: 2));

        Assert.Equal(FirstDoorControlState.FailedSafeStop, repeated.State);
        Assert.Equal(frozenNavigation, repeated.OpeningNavigation);
        Assert.Equal(frozenNavigation.ObservationHash, repeated.OpeningNavigation.ObservationHash);
        Assert.Equal(frozenReplay, repeated.TransitionReplaySnapshots);
        Assert.False(repeated.Action.MoveForward);
        Assert.False(repeated.Action.UseKey);

        var reset = session.Evaluate(WithPose(
            ReadyInput(31) with
            {
                RunId = $"{RunId}:next",
                RunGeneration = 2,
                ResetRequested = true,
                ResetOperationId = $"{RunId}:next:reset-1",
                LifecycleEvent = "explicit-run-reset"
            },
            1056d,
            -3616d,
            angleBam: 1L << 30));

        Assert.Equal(FirstDoorControlState.OpeningNavigate, reset.State);
        Assert.NotEqual(frozenNavigation.ObservationHash, reset.OpeningNavigation.ObservationHash);
        Assert.Equal(0, reset.OpeningNavigation.LegIndex);
        Assert.Equal(0, reset.OpeningNavigation.RouteFrames);
    }

    [Fact]
    public void NativeDeath_RequiresThreeDistinctFreshGametics_ThenRequestsOneStableRestart()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var firstInput = DeadInput(0);
        var first = session.Evaluate(firstInput);
        var duplicateInput = DeadInput(1) with
        {
            NativeGametic = firstInput.NativeGametic,
            RawObservation = RawYesObservation(2, firstInput.NativeGametic)
        };
        var duplicate = session.Evaluate(duplicateInput);
        var second = session.Evaluate(DeadInput(2));
        var confirmed = session.Evaluate(DeadInput(3));
        var latched = session.Evaluate(DeadInput(4));

        Assert.Equal(1, first.VitalityTrace.ConsecutiveDeathGametics);
        Assert.False(first.NativeDeathConfirmed);
        Assert.False(first.RestartRequested);
        Assert.False(duplicate.VitalityTrace.Fresh);
        Assert.Equal(1, duplicate.VitalityTrace.ConsecutiveDeathGametics);
        Assert.Equal(2, second.VitalityTrace.ConsecutiveDeathGametics);
        Assert.True(confirmed.VitalityTrace.NativeDeathConfirmed);
        Assert.True(confirmed.NativeDeathConfirmed);
        Assert.True(confirmed.RestartRequested);
        Assert.True(confirmed.VitalityTrace.RestartRequestIssuedThisTick);
        Assert.Equal(3, confirmed.VitalityTrace.ConsecutiveDeathGametics);
        Assert.Equal(3, confirmed.VitalityTrace.RequiredDeathGametics);
        Assert.Equal("native-player-vitality", confirmed.VitalityTrace.Authority);
        Assert.True(confirmed.VitalityTrace.NativeEvidenceAuthoritative);
        Assert.Equal("native-player-death-confirmed", confirmed.RestartReason);
        Assert.StartsWith("native-death:1:", confirmed.RestartRequestId, StringComparison.Ordinal);
        Assert.True(latched.RestartRequested);
        Assert.False(latched.VitalityTrace.RestartRequestIssuedThisTick);
        Assert.Equal(confirmed.RestartRequestId, latched.RestartRequestId);

        var newRun = session.Evaluate(ReadyInput(5) with
        {
            RunGeneration = 2,
            RunId = "browser-run-2",
            LifecycleEvent = "run-started"
        });

        Assert.False(newRun.NativeDeathConfirmed);
        Assert.False(newRun.RestartRequested);
        Assert.Empty(newRun.RestartRequestId);
        Assert.Equal(0, newRun.VitalityTrace.ConsecutiveDeathGametics);
        Assert.Equal(2, newRun.VitalityTrace.RunGeneration);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void NativeDeath_AfterFirstDoorHandOffOrCompletion_UsesCanonicalDebounceAndStableRestart(
        bool completeComputerRoom)
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);
        session.Evaluate(ReadyInput(8) with
        {
            AppliedActionAck = PositiveAck(use),
            Audio = RawAudio(RawEvent(1, "doropn"))
        });
        var routeDecision = session.Evaluate(ComputerRoomInput(9));
        var nextPrediction = 10;

        if (completeComputerRoom)
        {
            foreach (var fixture in CapturedFirstDoorRawFrameFixtures.ComputerRoomPositiveSequence)
            {
                var roomInput = ComputerRoomInput(nextPrediction);
                routeDecision = session.Evaluate(roomInput with
                {
                    RawObservation = fixture.CreateBrowserObservation(
                        frameSequence: nextPrediction + 1L,
                        nativeGametic: roomInput.NativeGametic,
                        paletteGeneration: 8)
                });
                nextPrediction++;
            }

            Assert.Equal(FirstDoorControlState.Complete, routeDecision.State);
            Assert.Equal(FirstDoorOwnershipDisposition.Completed, routeDecision.OwnershipDisposition);
        }
        else
        {
            Assert.Equal(FirstDoorControlState.AwaitComputerRoom, routeDecision.State);
            Assert.Equal(FirstDoorOwnershipDisposition.HandOff, routeDecision.OwnershipDisposition);
        }

        BrowserFirstDoorControlInput DeathInput(int prediction)
        {
            var input = DeadInput(prediction);
            return input with
            {
                RawObservation = input.RawObservation with
                {
                    PaletteGeneration = completeComputerRoom ? 9 : input.RawObservation.PaletteGeneration
                }
            };
        }

        var first = session.Evaluate(DeathInput(nextPrediction));
        var second = session.Evaluate(DeathInput(nextPrediction + 1));
        var confirmed = session.Evaluate(DeathInput(nextPrediction + 2));
        var latched = session.Evaluate(DeathInput(nextPrediction + 3));

        Assert.True(
            first.VitalityTrace.ConsecutiveDeathGametics == 1,
            $"available={first.VitalityTrace.Available}; fresh={first.VitalityTrace.Fresh}; "
            + $"reason={first.VitalityTrace.ObservationReason}; health={first.VitalityTrace.PlayerHealth}; "
            + $"playerState={first.VitalityTrace.PlayerState}; contract={first.ContractError}; "
            + $"state={first.State}; terminal={first.TerminalFailureCode}");
        Assert.Equal(2, second.VitalityTrace.ConsecutiveDeathGametics);
        Assert.Equal(3, confirmed.VitalityTrace.ConsecutiveDeathGametics);
        Assert.False(first.RestartRequested);
        Assert.False(second.RestartRequested);
        Assert.True(confirmed.NativeDeathConfirmed);
        Assert.True(confirmed.RestartRequested);
        Assert.True(confirmed.VitalityTrace.RestartRequestIssuedThisTick);
        Assert.Equal(3, confirmed.VitalityTrace.RequiredDeathGametics);
        Assert.Equal("native-player-vitality", confirmed.VitalityTrace.Authority);
        Assert.True(confirmed.VitalityTrace.NativeEvidenceAuthoritative);
        Assert.Equal("native-player-death-confirmed", confirmed.RestartReason);
        Assert.StartsWith("native-death:1:", confirmed.RestartRequestId, StringComparison.Ordinal);
        Assert.True(latched.RestartRequested);
        Assert.False(latched.VitalityTrace.RestartRequestIssuedThisTick);
        Assert.Equal(confirmed.RestartRequestId, latched.RestartRequestId);
    }

    [Fact]
    public void FreshLivingVitality_BreaksNativeDeathDebounce()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());

        var firstDead = session.Evaluate(DeadInput(0));
        var living = session.Evaluate(ReadyInput(1));
        var secondDead = session.Evaluate(DeadInput(2));

        Assert.Equal(1, firstDead.VitalityTrace.ConsecutiveDeathGametics);
        Assert.Equal("native-player-alive", living.VitalityTrace.DeathCandidateReason);
        Assert.Equal(0, living.VitalityTrace.ConsecutiveDeathGametics);
        Assert.Equal(1, secondDead.VitalityTrace.ConsecutiveDeathGametics);
        Assert.False(secondDead.RestartRequested);
    }

    [Fact]
    public void Acquisition_FinalAllowedFreshPoseTickWinsMissingBudget()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy() with
        {
            AcquisitionRequiredRouteFrames = 1,
            AcquisitionRequiredIdentityFrames = 1,
            AcquisitionMaximumProximityMissingFrames = 2
        });
        session.Evaluate(ReadyInput(0) with { NativePlayerFactsAvailable = false });
        var lastMissing = session.Evaluate(ReadyInput(1) with { NativePlayerFactsAvailable = false });

        var recoveredAtDeadline = DriveOpeningRouteToApproach(session, firstPrediction: 2);

        Assert.Equal(1, lastMissing.AcquisitionTrace.ConsecutiveProximityMissingFrames);
        Assert.Equal(FirstDoorControlState.Approach, recoveredAtDeadline.State);
        Assert.True(recoveredAtDeadline.AcquisitionTrace.Ready);
        Assert.Equal(0, recoveredAtDeadline.AcquisitionTrace.ConsecutiveProximityMissingFrames);
        Assert.True(recoveredAtDeadline.Proximity.Fresh);
    }

    [Fact]
    public void DuplicatePoseGametic_DoesNotAdvanceAcquisition()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy() with
        {
            AcquisitionRequiredRouteFrames = 1,
            AcquisitionRequiredIdentityFrames = 1
        });
        var firstInput = ReadyInput(0);
        session.Evaluate(firstInput);
        var duplicateInput = ReadyInput(1) with
        {
            NativeGametic = firstInput.NativeGametic,
            RawObservation = RawYesObservation(2, firstInput.NativeGametic)
        };

        var duplicate = session.Evaluate(duplicateInput);

        Assert.Equal(FirstDoorControlState.OpeningNavigate, duplicate.State);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, duplicate.OwnershipDisposition);
        Assert.False(duplicate.AcquisitionTrace.Ready);
        Assert.False(duplicate.Proximity.Fresh);
        Assert.Equal("native-player-proximity-duplicate", duplicate.Proximity.Reason);
        Assert.Equal(
            FirstDoorAcquisitionBlockCode.DuplicateProximityGametic,
            duplicate.AcquisitionTrace.BlockCode);
    }

    [Theory]
    [InlineData(false, "native-player-proximity-gametic-redefined")]
    [InlineData(true, "native-player-proximity-gametic-rewound")]
    public void PoseGameticRedefinitionOrRewind_FailsClosedAndClearsRangeFlags(
        bool rewind,
        string expectedFailure)
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var firstInput = ReadyInput(0);
        session.Evaluate(firstInput);
        var nextGametic = rewind ? firstInput.NativeGametic - 1 : firstInput.NativeGametic;
        var invalidInput = WithPose(ReadyInput(1), 1490, -2496) with
        {
            NativeGametic = nextGametic,
            RawObservation = RawYesObservation(2, nextGametic)
        };

        var failed = session.Evaluate(invalidInput);

        Assert.Equal(FirstDoorControlState.FailedSafeStop, failed.State);
        Assert.Equal(expectedFailure, failed.TerminalFailureCode);
        Assert.False(failed.Proximity.InputAccepted);
        Assert.False(failed.Proximity.Available);
        Assert.False(failed.Proximity.Fresh);
        Assert.False(failed.Proximity.WithinAcquisitionRange);
        Assert.False(failed.Proximity.WithinContactApproachRange);
        Assert.False(failed.Proximity.WithinUseRange);
        Assert.True(double.IsFinite(failed.Proximity.DistanceToDoorSegment));
    }

    [Fact]
    public void AcceptedAckSnapshot_IsExactStableAndClearedOnlyByNewRun()
    {
        var session = new FirstDoorBrowserControlSession(FastPolicy());
        var use = DriveToStationaryUse(session);
        var ack = PositiveAck(use) with
        {
            HostPath = FirstDoorBrowserControlSession.NativeActionHostPath,
            QueuedUseInputEventSequence = 4101,
            PumpedUseInputEventSequence = 4101
        };

        var accepted = session.Evaluate(ReadyInput(8) with { AppliedActionAck = ack });
        var frozen = accepted.AcceptedUseAck;
        var stale = session.Evaluate(ReadyInput(9) with
        {
            AppliedActionAck = ack with
            {
                QueuedUseInputEventSequence = 9999,
                PumpedUseInputEventSequence = 9999
            }
        });

        Assert.True(accepted.AppliedActionAckValid);
        Assert.True(frozen.Available);
        Assert.Equal(accepted.ControlTick, frozen.AcceptedAtControlTick);
        Assert.Equal(use.ControlTick, frozen.DecisionControlTick);
        Assert.Equal(use.UseAttemptId, frozen.UseAttemptId);
        Assert.Equal(FirstDoorBrowserControlSession.ExactActionMode, frozen.ActionMode);
        Assert.Equal(FirstDoorBrowserControlSession.NativeActionHostPath, frozen.HostPath);
        Assert.Equal(4101, frozen.QueuedUseInputEventSequence);
        Assert.Equal(4101, frozen.PumpedUseInputEventSequence);
        Assert.True(frozen.UsePumped);
        Assert.Equal(use.ManualUseSequence, frozen.ManualUseSequenceAtDecision);
        Assert.False(stale.AppliedActionAckValid);
        Assert.Equal(frozen, stale.AcceptedUseAck);
        Assert.NotEmpty(JsonSerializer.Serialize(stale));

        var newRun = session.Evaluate(ReadyInput(10) with
        {
            RunGeneration = 2,
            RunId = "browser-run-2",
            LifecycleEvent = "run-started"
        });
        Assert.False(newRun.AcceptedUseAck.Available);
    }

    [Fact]
    public void BrowserDecisions_WithUnavailableOrInvalidProximity_AreDefaultJsonSerializable()
    {
        var loadingSession = new FirstDoorBrowserControlSession(FastPolicy());
        var loading = loadingSession.Evaluate(ReadyInput(0) with
        {
            ModelState = "loading",
            WadContentSha256 = string.Empty,
            NativePlayerFactsAvailable = false
        });
        var invalidSession = new FirstDoorBrowserControlSession(FastPolicy());
        var invalid = invalidSession.Evaluate(ReadyInput(0) with
        {
            WadContentSha256 = "wrong-hash"
        });

        Assert.NotEmpty(JsonSerializer.Serialize(loading));
        Assert.NotEmpty(JsonSerializer.Serialize(invalid));
        Assert.True(double.IsFinite(loading.Proximity.DistanceToDoorSegment));
        Assert.True(double.IsFinite(invalid.Proximity.DistanceToDoorSegment));
    }

    private static FirstDoorControlDecision DriveToStationaryUse(
        FirstDoorBrowserControlSession session,
        int firstPrediction = 0,
        BrowserFirstDoorAudioInput? repeatedAudio = null)
    {
        var approach = DriveOpeningRouteToApproach(
            session,
            firstPrediction,
            repeatedAudio: repeatedAudio);
        Assert.Equal(FirstDoorControlState.Approach, approach.State);
        Assert.Equal(
            FirstDoorControlState.Align,
            session.Evaluate(ReadyInput(firstPrediction + 4) with
            {
                Audio = repeatedAudio ?? new BrowserFirstDoorAudioInput()
            }).State);
        Assert.Equal(
            FirstDoorControlState.Contact,
            session.Evaluate(ReadyInput(firstPrediction + 5) with
            {
                Audio = repeatedAudio ?? new BrowserFirstDoorAudioInput()
            }).State);
        Assert.Equal(
            FirstDoorControlState.PreUseStop,
            session.Evaluate(ReadyInput(firstPrediction + 6) with
            {
                Audio = repeatedAudio ?? new BrowserFirstDoorAudioInput()
            }).State);
        var use = session.Evaluate(ReadyInput(firstPrediction + 7) with
        {
            Audio = repeatedAudio ?? new BrowserFirstDoorAudioInput()
        });
        Assert.Equal(FirstDoorControlState.StationaryUse, use.State);
        Assert.True(use.Action.UseKey);
        return use;
    }

    private static FirstDoorControlDecision DriveOpeningRouteToApproach(
        FirstDoorBrowserControlSession session,
        int firstPrediction = 0,
        BrowserFirstDoorAudioInput? repeatedAudio = null,
        Action<FirstDoorControlDecision>? observeSpawn = null)
    {
        DriveOpeningRouteToWaypoint3(
            session,
            firstPrediction,
            repeatedAudio: repeatedAudio,
            observeSpawn: observeSpawn);
        var approach = session.Evaluate(OpeningRoutePoseInput(
            firstPrediction,
            offset: 5,
            playerX: 1360d,
            playerY: -2528d,
            headingDegrees: 0d,
            sector: 2,
            rawFactory: nativeGametic => RawYesObservation(firstPrediction + 2L, nativeGametic),
            repeatedAudio));
        Assert.Equal(FirstDoorControlState.Approach, approach.State);
        Assert.True(approach.OpeningNavigation.ReadyForAcquisition);
        Assert.True(approach.AcquisitionTrace.Ready);
        return approach;
    }

    private static FirstDoorControlDecision DriveOpeningRouteToWaypoint3(
        FirstDoorBrowserControlSession session,
        int firstPrediction = 0,
        Func<long, BrowserFirstDoorRawObservation>? w3RawFactory = null,
        BrowserFirstDoorAudioInput? repeatedAudio = null,
        Action<FirstDoorControlDecision>? observeSpawn = null)
    {
        var spawn = session.Evaluate(OpeningRoutePoseInput(
            firstPrediction,
            offset: 0,
            playerX: 1056d,
            playerY: -3616d,
            headingDegrees: 90d,
            sector: 38,
            rawFactory: null,
            repeatedAudio));
        Assert.Equal(FirstDoorControlState.OpeningNavigate, spawn.State);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, spawn.OwnershipDisposition);
        Assert.True(spawn.OpeningNavigation.Active);
        observeSpawn?.Invoke(spawn);

        Assert.Equal(
            FirstDoorControlState.OpeningNavigate,
            session.Evaluate(OpeningRoutePoseInput(
                firstPrediction,
                1,
                1056d,
                -3008d,
                0d,
                38,
                rawFactory: null,
                repeatedAudio)).State);
        Assert.Equal(
            FirstDoorControlState.OpeningNavigate,
            session.Evaluate(OpeningRoutePoseInput(
                firstPrediction,
                2,
                1280d,
                -3008d,
                90d,
                38,
                rawFactory: null,
                repeatedAudio)).State);
        Assert.Equal(
            FirstDoorControlState.OpeningNavigate,
            session.Evaluate(OpeningRoutePoseInput(
                firstPrediction,
                3,
                1280d,
                -2848d,
                90d,
                2,
                rawFactory: null,
                repeatedAudio)).State);

        var w3 = session.Evaluate(OpeningRoutePoseInput(
            firstPrediction,
            4,
            1280d,
            -2640d,
            54.46232220802562d,
            2,
            w3RawFactory ?? (nativeGametic => RawYesObservation(firstPrediction + 1L, nativeGametic)),
            repeatedAudio));
        Assert.Equal(FirstDoorControlState.OpeningNavigate, w3.State);
        return w3;
    }

    private static BrowserFirstDoorControlInput OpeningRoutePoseInput(
        int firstPrediction,
        int offset,
        double playerX,
        double playerY,
        double headingDegrees,
        int sector,
        Func<long, BrowserFirstDoorRawObservation>? rawFactory,
        BrowserFirstDoorAudioInput? repeatedAudio = null)
    {
        var template = ReadyInput(firstPrediction);
        var nativeGametic = template.NativeGametic - 6 + offset;
        return WithPose(
            template,
            playerX,
            playerY,
            AngleBam(headingDegrees),
            sector) with
        {
            NativeGametic = nativeGametic,
            RawObservation = rawFactory?.Invoke(nativeGametic)
                ?? new BrowserFirstDoorRawObservation(),
            Audio = repeatedAudio ?? new BrowserFirstDoorAudioInput()
        };
    }

    private static BrowserFirstDoorControlInput ReadyInput(int prediction)
    {
        var nonnegativePrediction = Math.Max(0, prediction);
        var nativeGametic = 1000L + nonnegativePrediction;
        return new BrowserFirstDoorControlInput
        {
            ContractVersion = FirstDoorControlStateMachine.CurrentContractVersion,
            SessionId = SessionId,
            RunId = RunId,
            RunGeneration = 1,
            Prediction = prediction,
            ManualUseSequence = 0,
            LifecycleState = "running",
            ModelState = "ready",
            NativeLevelFactsAvailable = true,
            NativeLevelLoadSequenceAvailable = true,
            NativeLevelLoadSequence = 2,
            NativeGametic = nativeGametic,
            NativeLevelTime = 500 + nonnegativePrediction,
            NativeLevelStartTic = 39,
            NativeGameState = 0,
            NativeGameEpisode = 1,
            NativeGameMap = 1,
            WadContentSha256 = FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
            NativePlayerFactsAvailable = true,
            NativePlayerXFixed = Fixed(1500),
            NativePlayerYFixed = Fixed(-2496),
            NativePlayerAngleBam = 0,
            NativePlayerMomentumXFixed = 0,
            NativePlayerMomentumYFixed = 0,
            NativePlayerSectorIndex = 1,
            NativePlayerVitalityFactsAvailable = true,
            NativePlayerHealth = 100,
            NativePlayerState = 0,
            NativePlayerKillCount = 0,
            RawObservation = RawYesObservation(nonnegativePrediction + 1L, nativeGametic)
        };
    }

    private static BrowserFirstDoorControlInput DeadInput(int prediction)
        => ReadyInput(prediction) with
        {
            NativePlayerHealth = 0,
            NativePlayerState = 1
        };

    private static BrowserFirstDoorControlInput ComputerRoomInput(int prediction)
        => WithPose(ReadyInput(prediction), 1760, -2512, AngleBam(0), 7);

    private static BrowserFirstDoorRawObservation RawYesObservation(
        long frameSequence,
        long nativeGametic)
    {
        var indices = ProjectedFixture((row, column) =>
            row is >= 2 and <= 3 && column is >= 3 and <= 4 ? (byte)10 : (byte)200);
        var palette = TestPalette();
        return RawObservation(indices, palette, frameSequence, nativeGametic);
    }

    private static BrowserFirstDoorRawObservation RawUnknownObservation(
        long frameSequence,
        long nativeGametic)
    {
        var indices = Enumerable.Repeat((byte)50, FirstDoorRawPaletteObserver.SampleCount).ToArray();
        var palette = TestPalette();
        return RawObservation(indices, palette, frameSequence, nativeGametic);
    }

    private static BrowserFirstDoorRawObservation RawRoomObservation(
        long frameSequence,
        long nativeGametic)
    {
        var indices = Enumerable.Repeat((byte)200, FirstDoorRawPaletteObserver.SampleCount).ToArray();
        return RawObservation(indices, TestPalette(), frameSequence, nativeGametic);
    }

    private static BrowserFirstDoorRawObservation RawNoObservation(
        long frameSequence,
        long nativeGametic)
    {
        byte[] projectedVision =
        [
            160, 0, 160, 224, 32, 0, 0, 255, 0,
            32, 192, 32, 160, 32, 128, 96, 192, 160,
            0, 192, 96, 32, 64, 96, 160, 0, 160,
            255, 64, 32, 0, 32, 32, 96, 0, 128,
            64, 160, 160, 224, 64, 160, 64, 0, 0,
            192, 224, 128, 160, 255, 160, 192, 128, 32,
            255, 64, 160, 10, 10, 96, 128, 32, 128,
            255, 224, 160, 10, 10, 224, 128, 32, 96,
            255, 0, 224, 128, 160, 160, 160, 0, 160
        ];
        var indices = ProjectedFixture((row, column) => projectedVision[(row * 9) + column]);
        var palette = TestPalette();
        return RawObservation(indices, palette, frameSequence, nativeGametic);
    }

    private static BrowserFirstDoorRawObservation RawObservation(
        byte[] indices,
        byte[] palette,
        long frameSequence,
        long nativeGametic)
        => new()
        {
            SchemaVersion = FirstDoorRawPaletteObserver.CurrentContractVersion,
            Layout = FirstDoorRawPaletteObserver.LayoutId,
            Available = true,
            FrameSequence = frameSequence,
            NativeGameticObservedAtEvaluation = nativeGametic,
            SourceWidth = FirstDoorRawPaletteObserver.SourceWidth,
            SourceHeight = FirstDoorRawPaletteObserver.SourceHeight,
            GameplayHeight = FirstDoorRawPaletteObserver.GameplayHeight,
            SampleColumns = FirstDoorRawPaletteObserver.SampleColumns,
            SampleRows = FirstDoorRawPaletteObserver.SampleRows,
            PaletteGeneration = 7,
            PaletteIndicesBase64 = Convert.ToBase64String(indices),
            PaletteRgbaBase64 = Convert.ToBase64String(palette)
        };

    private static byte[] ProjectedFixture(Func<int, int, byte> valueForVisionCell)
    {
        var indices = new byte[FirstDoorRawPaletteObserver.SampleCount];
        for (var row = 0; row < FirstDoorRawPaletteObserver.SampleRows; row++)
        {
            for (var column = 0; column < FirstDoorRawPaletteObserver.SampleColumns; column++)
            {
                var visionRow = row * 9 / FirstDoorRawPaletteObserver.SampleRows;
                var visionColumn = column * 9 / FirstDoorRawPaletteObserver.SampleColumns;
                indices[(row * FirstDoorRawPaletteObserver.SampleColumns) + column]
                    = valueForVisionCell(visionRow, visionColumn);
            }
        }

        return indices;
    }

    private static byte[] EmptyPalette()
    {
        var palette = new byte[FirstDoorRawPaletteObserver.PaletteRgbaByteCount];
        for (var index = 0; index < 256; index++)
        {
            palette[(index * 4) + 3] = byte.MaxValue;
        }

        return palette;
    }

    private static byte[] TestPalette()
    {
        var palette = EmptyPalette();
        foreach (var index in new byte[] { 0, 32, 64, 96, 128, 160, 192, 200, 224, 255 })
        {
            SetPalette(palette, index, 0, 0, 200);
        }

        SetPalette(palette, 10, 96, 8, 8);
        SetPalette(palette, 50, 80, 80, 80);
        return palette;
    }

    private static void SetPalette(
        byte[] palette,
        int index,
        byte red,
        byte green,
        byte blue)
    {
        var offset = index * 4;
        palette[offset] = red;
        palette[offset + 1] = green;
        palette[offset + 2] = blue;
        palette[offset + 3] = byte.MaxValue;
    }

    private static BrowserFirstDoorAudioInput RawAudio(params BrowserNativeAudioEventInput[] events)
        => new()
        {
            NativeEvents = events.Length == 0 ? 0 : checked((int)events.Max(item => item.Sequence)),
            Events = events
        };

    private static BrowserAppliedActionAck PositiveAck(FirstDoorControlDecision useDecision)
        => new()
        {
            SessionId = useDecision.SessionId,
            RunId = useDecision.RunId,
            RunGeneration = useDecision.RunGeneration,
            DecisionControlTick = useDecision.ControlTick,
            UseAttemptId = useDecision.UseAttemptId,
            ActionMode = FirstDoorBrowserControlSession.ExactActionMode,
            HostPath = FirstDoorBrowserControlSession.KeyEventsHostPath,
            ProposedUse = true,
            AppliedUse = true,
            UseResolved = true,
            EventQueued = true,
            PulseResolverCalled = false,
            ManualBlocked = false,
            SenseOnly = false,
            AppliedMoveForward = false,
            AppliedMoveBackward = false,
            AppliedStrafeLeft = false,
            AppliedStrafeRight = false,
            AppliedTurnYaw = 0,
            AppliedAttack = false,
            AppliedRun = false,
            QueuedUseInputEventSequence = useDecision.ControlTick + 100,
            PumpedUseInputEventSequence = useDecision.ControlTick + 100,
            UsePumped = true,
            ManualUseSequenceAtDecision = useDecision.ManualUseSequence
        };

    private static BrowserAppliedActionAck MutateAck(
        BrowserAppliedActionAck ack,
        string mutation)
        => mutation switch
        {
            "manual-blocked" => ack with { ManualBlocked = true },
            "sense-only" => ack with { SenseOnly = true },
            "event-not-queued" => ack with { EventQueued = false },
            "queued-sequence-missing" => ack with { QueuedUseInputEventSequence = 0 },
            "queue-only-no-pump" => ack with { UsePumped = false },
            "wrong-pumped-sequence" => ack with
            {
                PumpedUseInputEventSequence = ack.QueuedUseInputEventSequence + 1
            },
            "pulse-resolver" => ack with { PulseResolverCalled = true },
            "nonexact-mode" => ack with { ActionMode = "legacy" },
            "invalid-host-path" => ack with { HostPath = "sense-only" },
            "scope" => ack with { RunId = "other-run" },
            "tick" => ack with { DecisionControlTick = ack.DecisionControlTick + 1 },
            "attempt" => ack with { UseAttemptId = ack.UseAttemptId + 1 },
            "proposed-non-use" => ack with { ProposedUse = false },
            "applied-non-use" => ack with { AppliedUse = false },
            "unresolved-use" => ack with { UseResolved = false },
            "applied-motion" => ack with { AppliedMoveForward = true },
            _ => throw new ArgumentOutOfRangeException(nameof(mutation), mutation, null)
        };

    private static BrowserNativeAudioEventInput RawEvent(long sequence, string sfxName)
        => new()
        {
            Sequence = sequence,
            SfxId = checked((int)sequence + 100),
            SfxName = sfxName
        };

    private static FirstDoorControlPolicy FastPolicy()
        => new()
        {
            AcquisitionMaximumProximityMissingFrames = 3,
            ApproachTimeoutFrames = 3,
            ApproachMaximumProximityMissingFrames = 2,
            FailedUseReapproachFrames = 1,
            AlignMinimumFrames = 1,
            AlignTimeoutFrames = 3,
            ContactFrames = 1,
            PreUseStopFrames = 1,
            PreUseStopTimeoutFrames = 3,
            StationaryUseFrames = 1,
            AwaitOutcomeFrames = 6,
            PostOpenEntryShoveFrames = 1,
            MaxUseRetries = 2,
            MaxRecoveryAttempts = 4,
            MinimumDoorIdentityConfidence = 0.3f,
            AlignmentToleranceDegrees = 4
        };

    private static long Fixed(double value)
        => checked((long)Math.Round(value * 65536d));

    private static long AngleBam(double degrees)
    {
        var normalized = degrees % 360d;
        if (normalized < 0d)
        {
            normalized += 360d;
        }

        return checked((long)Math.Round(normalized * 4294967296d / 360d));
    }

    private static BrowserFirstDoorControlInput WithPose(
        BrowserFirstDoorControlInput input,
        double playerX,
        double playerY,
        long angleBam = 0,
        int sector = 1)
        => input with
        {
            NativePlayerFactsAvailable = true,
            NativePlayerXFixed = Fixed(playerX),
            NativePlayerYFixed = Fixed(playerY),
            NativePlayerAngleBam = angleBam,
            NativePlayerMomentumXFixed = 0,
            NativePlayerMomentumYFixed = 0,
            NativePlayerSectorIndex = sector
        };
}

internal static class BrowserFirstDoorTestOrderingExtensions
{
    internal static IEnumerable<string> OrderByExpected(this IEnumerable<string> values)
        => values.OrderBy(value => value switch
        {
            "Sequence" => 0,
            "SfxId" => 1,
            "SfxName" => 2,
            _ => 3
        });
}
