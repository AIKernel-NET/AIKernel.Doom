namespace AIKernel.Doom.Architecture.Tests;

using AIKernel.Doom.Provider.Autoplay;

public sealed class FirstDoorControlStateMachineTests
{
    private const string SessionId = "test-session";
    private const string RunId = "test-run-1";

    [Fact]
    public void OwnershipContracts_ExposeSevenUnitsAndFiveDispositions()
    {
        Assert.Equal(7, Enum.GetValues<FirstDoorOwnershipUnit>().Length);
        Assert.Equal(5, Enum.GetValues<FirstDoorOwnershipDisposition>().Length);
    }

    [Fact]
    public void AcquisitionWaiting_RemainsNeutralAndNotAcquired()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());

        var initialized = controller.Evaluate(OpeningInput(1));
        var waiting = controller.Evaluate(OpeningInput(2));

        Assert.Equal(FirstDoorControlState.OpeningTransit, initialized.State);
        Assert.Equal(FirstDoorOwnershipDisposition.NotAcquired, initialized.OwnershipDisposition);
        Assert.Equal(FirstDoorControlState.OpeningTransit, waiting.State);
        Assert.Equal(FirstDoorOwnershipDisposition.NotAcquired, waiting.OwnershipDisposition);
        Assert.False(waiting.Exclusive);
        Assert.False(waiting.Action.MoveForward);
        Assert.False(waiting.Action.UseKey);
    }

    [Fact]
    public void AcquisitionReady_TransfersExclusiveOwnershipToApproach()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        controller.Evaluate(OpeningInput(1));

        var navigation = controller.Evaluate(ReadyInput(2) with
        {
            Proximity = ApproachProximity()
        });
        var ready = controller.Evaluate(ReadyInput(3) with
        {
            Proximity = ApproachProximity()
        });

        Assert.Equal(FirstDoorControlState.OpeningTransit, navigation.PreviousState);
        Assert.Equal(FirstDoorControlState.OpeningNavigate, navigation.State);
        Assert.Equal(FirstDoorOwnershipUnit.OpeningTransit, navigation.OwnershipUnit);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, navigation.OwnershipDisposition);
        Assert.True(navigation.Exclusive);
        Assert.False(navigation.RunRequested);
        Assert.Equal("opening-navigation-owner-acquired", navigation.ReasonCode);
        Assert.Equal(FirstDoorControlState.OpeningNavigate, ready.PreviousState);
        Assert.Equal(FirstDoorControlState.Approach, ready.State);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, ready.OwnershipDisposition);
        Assert.True(ready.Exclusive);
        Assert.True(ready.Action.MoveForward);
        Assert.Equal("first-door-owner-acquired", ready.ReasonCode);

        var approachReplay = ready.TransitionReplaySnapshots[^1];
        Assert.Contains("state-transition", approachReplay.EventKind, StringComparison.Ordinal);
        Assert.Equal(ready.Action, approachReplay.Action);
        Assert.Equal(ready.RunRequested, approachReplay.RunRequested);
        Assert.Equal(ready.OwnershipUnit, approachReplay.OwnershipUnit);
        Assert.Equal(ready.OwnershipDisposition, approachReplay.OwnershipDisposition);
        Assert.Equal(ready.OwnerId, approachReplay.OwnerId);
        Assert.True(approachReplay.Action.MoveForward);
        Assert.True(approachReplay.RunRequested);
        Assert.True(IsNeutral(approachReplay.OpeningNavigation.Action));
    }

    [Fact]
    public void AcquisitionExpired_EndsInReplayableFailedSafeDeadline()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        controller.Evaluate(OpeningInput(1));

        controller.Evaluate(ReadyInput(2));
        var expired = controller.Evaluate(ReadyInput(3) with
        {
            AcquisitionStatus = FirstDoorAcquisitionStatus.Expired,
            AcquisitionFailureCode = "first-door-acquisition-budget-exhausted"
        });

        AssertFailedSafeStop(expired);
        Assert.Equal("first-door-acquisition-budget-exhausted", expired.ReasonCode);
        Assert.Equal("first-door-acquisition-budget-exhausted", expired.TerminalFailureCode);
    }

    [Fact]
    public void OpeningNavigate_UsesOnlyTheCSharpNavigationActionWithoutRun()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        var action = new ActionCommand(true, false, false, false, 0, false, false);

        var navigation = controller.Evaluate(ReadyInput(1) with
        {
            AcquisitionStatus = FirstDoorAcquisitionStatus.Waiting,
            OpeningNavigation = NavigationSnapshot(
                FirstDoorOpeningNavigationStatus.Navigating,
                action,
                readyForAcquisition: false)
        });

        Assert.Equal(FirstDoorControlState.OpeningNavigate, navigation.State);
        Assert.Equal(FirstDoorOwnershipUnit.OpeningTransit, navigation.OwnershipUnit);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, navigation.OwnershipDisposition);
        Assert.Same(action, navigation.Action);
        Assert.True(navigation.Action.MoveForward);
        Assert.False(navigation.RunRequested);
        Assert.Equal(navigation.OpeningNavigation, navigation.TransitionReplaySnapshots[^1].OpeningNavigation);
    }

    [Fact]
    public void OpeningNavigate_DoesNotEnterApproachUntilTopologyAndAcquisitionAreBothReady()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        controller.Evaluate(ReadyInput(1) with
        {
            AcquisitionStatus = FirstDoorAcquisitionStatus.Ready,
            OpeningNavigation = NavigationSnapshot(
                FirstDoorOpeningNavigationStatus.Navigating,
                new ActionCommand(false, false, false, false, 6, false, false),
                readyForAcquisition: false)
        });

        var topologyPending = controller.Evaluate(ReadyInput(2) with
        {
            AcquisitionStatus = FirstDoorAcquisitionStatus.Ready,
            OpeningNavigation = NavigationSnapshot(
                FirstDoorOpeningNavigationStatus.SightlineAlign,
                new ActionCommand(false, false, false, false, 6, false, false),
                readyForAcquisition: false)
        });

        Assert.Equal(FirstDoorControlState.OpeningNavigate, topologyPending.State);
        Assert.True(topologyPending.Exclusive);
        Assert.Equal(6, topologyPending.Action.TurnYaw);

        var admitted = controller.Evaluate(ReadyInput(3));
        Assert.Equal(FirstDoorControlState.Approach, admitted.State);
    }

    [Fact]
    public void OpeningNavigationFailure_IsTerminalExclusiveAndPreservesFailureCode()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());

        var failed = controller.Evaluate(ReadyInput(1) with
        {
            AcquisitionStatus = FirstDoorAcquisitionStatus.Waiting,
            OpeningNavigation = NavigationSnapshot(
                FirstDoorOpeningNavigationStatus.Failed,
                new ActionCommand(false, false, false, false, 0, false, false),
                readyForAcquisition: false) with
            {
                FailureCode = "opening-navigation-route-budget-exhausted",
                BlockCode = FirstDoorOpeningNavigationBlockCode.RouteBudgetExhausted
            }
        });

        AssertFailedSafeStop(failed);
        Assert.Equal(FirstDoorOwnershipUnit.OpeningTransit, failed.OwnershipUnit);
        Assert.Equal("first-door.failed-safe-stop", failed.OwnerId);
        Assert.Equal("opening-navigation-route-budget-exhausted", failed.TerminalFailureCode);

        var failureReplay = failed.TransitionReplaySnapshots[^1];
        Assert.Equal(failed.Action, failureReplay.Action);
        Assert.Equal(failed.RunRequested, failureReplay.RunRequested);
        Assert.Equal(FirstDoorOwnershipUnit.OpeningTransit, failureReplay.OwnershipUnit);
        Assert.Equal(FirstDoorOwnershipDisposition.FailedSafeStop, failureReplay.OwnershipDisposition);
        Assert.Equal("first-door.failed-safe-stop", failureReplay.OwnerId);
    }

    [Fact]
    public void OpeningNavigationReplay_RecordsOnlySignificantMilestones()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        var leg0Snapshot = NavigationSnapshot(
            FirstDoorOpeningNavigationStatus.Navigating,
            new ActionCommand(true, false, false, false, 0, false, false),
            readyForAcquisition: false) with
        {
            LegIndex = 0,
            LegId = "spawn-north-lane"
        };

        var leg0 = controller.Evaluate(ReadyInput(1) with
        {
            AcquisitionStatus = FirstDoorAcquisitionStatus.Waiting,
            OpeningNavigation = leg0Snapshot
        });
        var leg0ReplayCount = leg0.TransitionReplaySnapshots.Count;

        Assert.Contains(
            leg0.TransitionReplaySnapshots,
            snapshot => snapshot.EventKind.Contains("opening-navigation-leg", StringComparison.Ordinal));
        Assert.All(
            leg0.TransitionReplaySnapshots,
            snapshot => Assert.Equal(4, snapshot.SnapshotVersion));

        var repeatedLeg0 = controller.Evaluate(ReadyInput(2) with
        {
            AcquisitionStatus = FirstDoorAcquisitionStatus.Waiting,
            OpeningNavigation = leg0Snapshot
        });
        Assert.Equal(leg0ReplayCount, repeatedLeg0.TransitionReplaySnapshots.Count);

        var leg1Snapshot = leg0Snapshot with
        {
            LegIndex = 1,
            LegId = "spawn-east-lane"
        };
        var leg1 = controller.Evaluate(ReadyInput(3) with
        {
            AcquisitionStatus = FirstDoorAcquisitionStatus.Waiting,
            OpeningNavigation = leg1Snapshot
        });
        Assert.Equal(leg0ReplayCount + 1, leg1.TransitionReplaySnapshots.Count);
        Assert.Contains(
            "opening-navigation-leg",
            leg1.TransitionReplaySnapshots[^1].EventKind,
            StringComparison.Ordinal);

        var recoverySnapshot = leg0Snapshot with
        {
            Status = FirstDoorOpeningNavigationStatus.ReturningToCertifiedWaypoint,
            RecoveryCount = 1,
            ReturningToCertifiedWaypoint = true
        };
        var recovery = controller.Evaluate(ReadyInput(4) with
        {
            AcquisitionStatus = FirstDoorAcquisitionStatus.Waiting,
            OpeningNavigation = recoverySnapshot
        });
        Assert.Contains(
            "opening-navigation-recovery",
            recovery.TransitionReplaySnapshots[^1].EventKind,
            StringComparison.Ordinal);

        var recoveryReplayCount = recovery.TransitionReplaySnapshots.Count;
        var repeatedRecovery = controller.Evaluate(ReadyInput(5) with
        {
            AcquisitionStatus = FirstDoorAcquisitionStatus.Waiting,
            OpeningNavigation = recoverySnapshot
        });
        Assert.Equal(recoveryReplayCount, repeatedRecovery.TransitionReplaySnapshots.Count);

        var sightlineSnapshot = NavigationSnapshot(
            FirstDoorOpeningNavigationStatus.ReadyForAcquisition,
            new ActionCommand(false, false, false, false, 0, false, false),
            readyForAcquisition: true) with
        {
            RecoveryCount = 1,
            ReturningToCertifiedWaypoint = false
        };
        var sightlineReady = controller.Evaluate(ReadyInput(6) with
        {
            AcquisitionStatus = FirstDoorAcquisitionStatus.Waiting,
            OpeningNavigation = sightlineSnapshot
        });
        Assert.Contains(
            "opening-navigation-sightline-ready",
            sightlineReady.TransitionReplaySnapshots[^1].EventKind,
            StringComparison.Ordinal);

        var sightlineReplayCount = sightlineReady.TransitionReplaySnapshots.Count;
        var repeatedSightline = controller.Evaluate(ReadyInput(7) with
        {
            AcquisitionStatus = FirstDoorAcquisitionStatus.Waiting,
            OpeningNavigation = sightlineSnapshot
        });
        Assert.Equal(sightlineReplayCount, repeatedSightline.TransitionReplaySnapshots.Count);

        var navigationFailed = controller.Evaluate(ReadyInput(8) with
        {
            AcquisitionStatus = FirstDoorAcquisitionStatus.Waiting,
            OpeningNavigation = sightlineSnapshot with
            {
                Status = FirstDoorOpeningNavigationStatus.Failed,
                BlockCode = FirstDoorOpeningNavigationBlockCode.RouteBudgetExhausted,
                ReadyForAcquisition = false,
                FailureCode = "opening-navigation-route-budget-exhausted"
            }
        });

        AssertFailedSafeStop(navigationFailed);
        Assert.Contains(
            "opening-navigation-failed",
            navigationFailed.TransitionReplaySnapshots[^1].EventKind,
            StringComparison.Ordinal);
    }

    [Fact]
    public void StationaryUse_IsExclusiveAndContainsNoMovement()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 0;

        var use = DriveToStationaryUse(controller, ref tick);

        AssertStationaryUse(use);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, use.OwnershipDisposition);
        Assert.Equal(tick, use.ControlTick);
        Assert.Equal(FirstDoorControlState.PreUseStop, use.PreviousState);
        Assert.Equal(FirstDoorControlState.StationaryUse, use.NextState);
        Assert.True(use.Transitioned);
        Assert.Equal(FirstDoorControlStateMachine.CurrentImplementationVersion, use.ImplementationVersion);
        Assert.Equal("first-door-policy-v6", use.PolicyVersion);
        Assert.Equal(use.UseAttemptId, use.PendingUseAttemptId);
        Assert.Equal("use-issued", use.PendingUseCorrelationState);
        Assert.True(use.RemainingUseRetries >= 0);
        Assert.True(use.RemainingRecoveryAttempts >= 0);
    }

    [Fact]
    public void PredictionRewind_IsDiagnosticAndDoesNotResetRunOrAttempt()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 0;
        var use = DriveToStationaryUse(controller, ref tick, firstPrediction: 100);

        var rewound = controller.Evaluate(ReadyInput(++tick, prediction: 1) with
        {
            PredictionAnomaly = true,
            AnomalyCode = "prediction-rewound"
        });

        Assert.Equal(FirstDoorControlState.AwaitOutcome, rewound.State);
        Assert.Equal(use.UseAttemptId, rewound.UseAttemptId);
        Assert.Equal(1, rewound.RunGeneration);
        Assert.Equal(RunId, rewound.RunId);
        Assert.True(rewound.PredictionAnomaly);
        Assert.Equal("prediction-rewound", rewound.AnomalyCode);
        Assert.Equal(tick, rewound.ControlTick);
    }

    [Fact]
    public void ExplicitFreshRunScope_ResetsStateAttemptsAndEvidenceMemory()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 0;
        var use = DriveToStationaryUse(controller, ref tick);
        Assert.True(use.UseAttemptId > 0);

        var fresh = controller.Evaluate(OpeningInput(++tick, runGeneration: 2, runId: "test-run-2"));

        Assert.Equal(FirstDoorControlState.OpeningTransit, fresh.State);
        Assert.Equal(FirstDoorOwnershipDisposition.NotAcquired, fresh.OwnershipDisposition);
        Assert.Equal(0, fresh.UseAttemptId);
        Assert.Equal(0, fresh.RetryCount);
        Assert.Equal(0, fresh.RecoveryCount);
        Assert.False(fresh.OpenConfirmed);
        Assert.Equal(2, fresh.RunGeneration);
        Assert.Equal("test-run-2", fresh.RunId);
    }

    [Fact]
    public void TrustedEvidence_MustMatchSessionAndRunScope()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 0;
        var use = DriveToStationaryUse(controller, ref tick);

        var wrongRun = controller.Evaluate(ReadyInput(++tick) with
        {
            OpenEvidence = TrustedOpen(use.UseAttemptId, tick, runId: "other-run"),
            UseAckWindowActive = true,
            AcknowledgedUseDecisionControlTick = use.ControlTick,
            AcknowledgedUseAttemptId = use.UseAttemptId
        });
        Assert.Equal(FirstDoorControlState.AwaitOutcome, wrongRun.State);
        Assert.False(wrongRun.OpenConfirmed);

        var accepted = controller.Evaluate(ReadyInput(++tick) with
        {
            OpenEvidence = TrustedOpen(use.UseAttemptId, tick),
            UseAckWindowActive = true,
            AcknowledgedUseDecisionControlTick = use.ControlTick,
            AcknowledgedUseAttemptId = use.UseAttemptId
        });

        Assert.Equal(FirstDoorControlState.PostOpenShove, accepted.State);
        Assert.True(accepted.OpenConfirmed);
        Assert.Equal(FirstDoorOpenConfirmationSource.TrustedAudio, accepted.OpenConfirmationSource);
        Assert.True(accepted.SemanticDelta.HasChanges);
        Assert.True(accepted.SemanticDelta.FirstDoorOpened);
        Assert.False(accepted.SemanticDelta.ComputerRoomEntered);
        Assert.Equal(1, accepted.SemanticDelta.DoorOpenedCount);
        Assert.Equal(RunId, accepted.SemanticDelta.RunId);
        Assert.Equal(tick, accepted.SemanticDelta.ControlTick);

        var postOpenReplay = accepted.TransitionReplaySnapshots[^1];
        Assert.Contains("state-transition", postOpenReplay.EventKind, StringComparison.Ordinal);
        Assert.Equal(accepted.Action, postOpenReplay.Action);
        Assert.Equal(accepted.RunRequested, postOpenReplay.RunRequested);
        Assert.Equal(FirstDoorOwnershipUnit.PostOpenEntryShove, postOpenReplay.OwnershipUnit);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, postOpenReplay.OwnershipDisposition);
        Assert.Equal("first-door.post-open-entry-shove", postOpenReplay.OwnerId);
        Assert.True(postOpenReplay.Action.MoveForward);
        Assert.True(postOpenReplay.RunRequested);
        Assert.True(IsNeutral(postOpenReplay.OpeningNavigation.Action));
    }

    [Fact]
    public void RawAudioEvidenceWithoutAppliedUseAckWindow_IsRejected()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 0;
        var use = DriveToStationaryUse(controller, ref tick);

        var rejected = controller.Evaluate(ReadyInput(++tick) with
        {
            OpenEvidence = TrustedOpen(use.UseAttemptId, tick)
        });

        Assert.False(rejected.OpenConfirmed);
        Assert.Equal(FirstDoorControlState.AwaitOutcome, rejected.State);
        Assert.False(rejected.UseAckWindowActive);
    }

    [Fact]
    public void NativeMilestone_MustAlsoMatchRunScope()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 1;
        controller.Evaluate(OpeningInput(tick));

        var rejected = controller.Evaluate(OpeningInput(++tick) with
        {
            OpenEvidence = ScopedOpenEvidence(runId: "stale-run") with
            {
                MilestoneConfirmed = true,
                MilestoneProvenance = FirstDoorEvidenceProvenance.NativeEngine
            }
        });
        Assert.False(rejected.OpenConfirmed);

        var accepted = controller.Evaluate(OpeningInput(++tick) with
        {
            OpenEvidence = ScopedOpenEvidence() with
            {
                MilestoneConfirmed = true,
                MilestoneProvenance = FirstDoorEvidenceProvenance.NativeEngine
            }
        });
        Assert.True(accepted.OpenConfirmed);
        Assert.Equal(FirstDoorControlState.PostOpenShove, accepted.State);
    }

    [Fact]
    public void FailedUseRecovery_IsBackwardAndAlternatesAlignmentSweep()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 0;
        var firstUse = DriveToStationaryUse(controller, ref tick);
        controller.Evaluate(ReadyInput(++tick));

        var firstRecovery = controller.Evaluate(ReadyInput(++tick) with
        {
            FailedUseEvidence = TrustedFailure("noway-1", firstUse.UseAttemptId, tick),
            UseAckWindowActive = true,
            AcknowledgedUseDecisionControlTick = firstUse.ControlTick,
            AcknowledgedUseAttemptId = firstUse.UseAttemptId
        });
        Assert.Equal(FirstDoorControlState.FailedUseReapproach, firstRecovery.State);
        Assert.True(firstRecovery.Action.MoveBackward);
        Assert.False(firstRecovery.Action.MoveForward);
        Assert.Equal(1, firstRecovery.AlignmentSweepDirection);

        controller.Evaluate(ReadyInput(++tick));
        controller.Evaluate(ReadyInput(++tick));
        controller.Evaluate(ReadyInput(++tick));
        controller.Evaluate(ReadyInput(++tick));
        var secondUse = controller.Evaluate(ReadyInput(++tick));
        AssertStationaryUse(secondUse);
        controller.Evaluate(ReadyInput(++tick));

        var secondRecovery = controller.Evaluate(ReadyInput(++tick) with
        {
            FailedUseEvidence = TrustedFailure("noway-2", secondUse.UseAttemptId, tick),
            UseAckWindowActive = true,
            AcknowledgedUseDecisionControlTick = secondUse.ControlTick,
            AcknowledgedUseAttemptId = secondUse.UseAttemptId
        });
        Assert.Equal(-1, secondRecovery.AlignmentSweepDirection);
        Assert.True(secondRecovery.Action.MoveBackward);

        controller.Evaluate(ReadyInput(++tick));
        var alternatingAlign = controller.Evaluate(ReadyInput(++tick) with
        {
            AlignmentErrorDegrees = 20,
            RecommendedYaw = 6
        });
        Assert.Equal(FirstDoorControlState.Align, alternatingAlign.State);
        Assert.True(alternatingAlign.Action.TurnYaw < 0);
    }

    [Fact]
    public void UseRetryBudgetExhaustion_IsTerminalExclusiveFailedSafeStop()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy() with { MaxUseRetries = 0 });
        long tick = 0;
        DriveToStationaryUse(controller, ref tick);
        controller.Evaluate(ReadyInput(++tick));

        for (var index = 0; index < FastPolicy().AwaitOutcomeFrames; index++)
        {
            controller.Evaluate(ReadyInput(++tick));
        }

        var failed = controller.Evaluate(ReadyInput(++tick));

        AssertFailedSafeStop(failed);
        Assert.Contains("use-retry-budget-exhausted", failed.ReasonCode, StringComparison.Ordinal);
    }

    [Fact]
    public void AlignRecoveryBudgetExhaustion_IsFiniteAndTerminal()
    {
        var policy = FastPolicy() with
        {
            AlignTimeoutFrames = 1,
            MaxRecoveryAttempts = 0
        };
        var controller = new FirstDoorControlStateMachine(policy);
        long tick = 0;
        controller.Evaluate(ReadyInput(++tick));
        controller.Evaluate(ReadyInput(++tick));
        controller.Evaluate(ReadyInput(++tick));

        var failed = controller.Evaluate(ReadyInput(++tick) with
        {
            DoorIdentityConfidence = 0,
            AlignmentErrorDegrees = 30
        });

        AssertFailedSafeStop(failed);
        Assert.Contains("recovery-budget-exhausted", failed.ReasonCode, StringComparison.Ordinal);
    }

    [Fact]
    public void AlignState_RequiresAvailableAlignmentObservationBeforeContact()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        controller.Evaluate(ReadyInput(1));
        controller.Evaluate(ReadyInput(2));
        var align = controller.Evaluate(ReadyInput(3));
        Assert.Equal(FirstDoorControlState.Align, align.State);

        var unavailable = controller.Evaluate(ReadyInput(4) with
        {
            AlignmentAvailable = false,
            DoorIdentityTruth = FirstDoorEvidenceTruth.Yes,
            DoorIdentityConfidence = 1,
            AlignmentErrorDegrees = 0
        });

        Assert.Equal(FirstDoorControlState.Align, unavailable.State);
        Assert.NotEqual(FirstDoorControlState.Contact, unavailable.State);
        Assert.False(unavailable.Action.MoveForward);
    }

    [Fact]
    public void PreUseStop_RequiresFreshCurrentDoorIdentityBeforeStationaryUse()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 0;
        controller.Evaluate(ReadyInput(++tick));
        controller.Evaluate(ReadyInput(++tick));
        controller.Evaluate(ReadyInput(++tick));
        controller.Evaluate(ReadyInput(++tick));
        var preUseStop = controller.Evaluate(ReadyInput(++tick));
        Assert.Equal(FirstDoorControlState.PreUseStop, preUseStop.State);

        var staleIdentity = controller.Evaluate(ReadyInput(++tick) with
        {
            DoorIdentityTruth = FirstDoorEvidenceTruth.Yes,
            DoorIdentityConfidence = 1,
            CurrentDoorIdentityReadyForUse = false
        });

        Assert.Equal(FirstDoorControlState.PreUseStop, staleIdentity.State);
        Assert.False(staleIdentity.Action.UseKey);
        Assert.Equal(0, staleIdentity.UseAttemptId);

        var freshIdentity = controller.Evaluate(ReadyInput(++tick));
        AssertStationaryUse(freshIdentity);
        Assert.True(freshIdentity.UseAttemptId > 0);
    }

    [Fact]
    public void PreUseStop_RevalidatesNativeBearingBeforeEmittingUse()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 0;
        controller.Evaluate(ReadyInput(++tick));
        controller.Evaluate(ReadyInput(++tick));
        controller.Evaluate(ReadyInput(++tick));
        controller.Evaluate(ReadyInput(++tick));
        var preUseStop = controller.Evaluate(ReadyInput(++tick));
        Assert.Equal(FirstDoorControlState.PreUseStop, preUseStop.State);

        var bearingDrift = controller.Evaluate(ReadyInput(++tick) with
        {
            Proximity = NearDoorProximity(bearingErrorDegrees: -30)
        });

        Assert.Equal(FirstDoorControlState.PreUseStop, bearingDrift.State);
        Assert.False(bearingDrift.Action.UseKey);
        Assert.Equal(0, bearingDrift.UseAttemptId);
        Assert.True(IsNeutral(bearingDrift.Action));

        var realigned = controller.Evaluate(ReadyInput(++tick));
        AssertStationaryUse(realigned);
    }

    [Fact]
    public void Contact_StopsAtTheBoundEvenWhenCurrentIdentityDisappears()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 0;
        Assert.Equal(FirstDoorControlState.OpeningNavigate, controller.Evaluate(ReadyInput(++tick)).State);
        Assert.Equal(FirstDoorControlState.Approach, controller.Evaluate(ReadyInput(++tick)).State);
        Assert.Equal(FirstDoorControlState.Align, controller.Evaluate(ReadyInput(++tick)).State);
        Assert.Equal(FirstDoorControlState.Contact, controller.Evaluate(ReadyInput(++tick)).State);

        var stopped = controller.Evaluate(ReadyInput(++tick) with
        {
            RawObservationFresh = false,
            CurrentDoorIdentityReadyForUse = false,
            DoorIdentityTruth = FirstDoorEvidenceTruth.Unknown,
            DoorIdentityReason = "identity-missing-at-final-approach-bound"
        });

        Assert.Equal(FirstDoorControlState.PreUseStop, stopped.State);
        Assert.Equal("fresh-use-range-reached-pre-use-stop", stopped.ReasonCode);
        Assert.False(stopped.Action.MoveForward);
        Assert.False(stopped.Action.MoveBackward);
        Assert.False(stopped.Action.UseKey);

        var stillStopped = controller.Evaluate(ReadyInput(++tick) with
        {
            RawObservationFresh = false,
            CurrentDoorIdentityReadyForUse = false,
            DoorIdentityTruth = FirstDoorEvidenceTruth.Unknown
        });
        Assert.Equal(FirstDoorControlState.PreUseStop, stillStopped.State);
        Assert.False(stillStopped.Action.MoveForward);
    }

    [Fact]
    public void UnsupportedContract_FailsClosedUntilExplicitFreshRun()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());

        var failed = controller.Evaluate(ReadyInput(1) with { ContractVersion = 99 });

        AssertFailedSafeStop(failed);
        Assert.Equal("unsupported-contract-version", failed.ReasonCode);
        Assert.Equal("unsupported-contract-version", failed.TerminalFailureCode);
    }

    [Fact]
    public void PostOpenHandoffAndCompletion_HaveExplicitDispositions()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 1;
        controller.Evaluate(OpeningInput(tick));
        var open = controller.Evaluate(OpeningInput(++tick) with
        {
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.No,
                "first-door-identity-still-visible",
                "pre-open-content",
                observationHash: "pre-open-observation"),
            OpenEvidence = ScopedOpenEvidence() with
            {
                MilestoneConfirmed = true,
                MilestoneProvenance = FirstDoorEvidenceProvenance.TrustedMilestone
            }
        });
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, open.OwnershipDisposition);

        var handoff = controller.Evaluate(OpeningInput(++tick));
        Assert.Equal(FirstDoorControlState.AwaitComputerRoom, handoff.State);
        Assert.Equal(FirstDoorOwnershipDisposition.HandOff, handoff.OwnershipDisposition);
        Assert.True(handoff.HandOffToPostDoor);
        Assert.False(handoff.SemanticDelta.HasChanges);
        Assert.False(handoff.SemanticDelta.ComputerRoomEntered);

        var complete = controller.Evaluate(OpeningInput(++tick) with
        {
            Proximity = ComputerRoomProximity(),
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.Yes,
                "computer-room-cues-ready",
                "computer-room-content",
                observationHash: "computer-room-observation")
        });
        Assert.Equal(FirstDoorOwnershipDisposition.Completed, complete.OwnershipDisposition);
        Assert.True(complete.Completed);
        Assert.True(complete.HandOffToPostDoor);
        Assert.True(complete.SemanticDelta.HasChanges);
        Assert.True(complete.SemanticDelta.ComputerRoomEntered);
    }

    [Fact]
    public void ComputerRoomConfirmation_FinalInclusiveTickWinsBeforeFiniteDeadline()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy() with
        {
            ComputerRoomRequiredStableFrames = 1,
            ComputerRoomConfirmationTimeoutFrames = 1
        });
        long tick = 1;
        controller.Evaluate(OpeningInput(tick) with
        {
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.No,
                "first-door-identity-still-visible",
                "pre-open-content",
                "pre-open-observation")
        });
        controller.Evaluate(OpeningInput(++tick) with
        {
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.No,
                "first-door-identity-still-visible",
                "pre-open-content",
                "pre-open-observation-2"),
            OpenEvidence = ScopedOpenEvidence() with
            {
                MilestoneConfirmed = true,
                MilestoneProvenance = FirstDoorEvidenceProvenance.TrustedMilestone
            }
        });
        var handoff = controller.Evaluate(OpeningInput(++tick));
        Assert.Equal(FirstDoorControlState.AwaitComputerRoom, handoff.State);

        var complete = controller.Evaluate(OpeningInput(++tick) with
        {
            Proximity = ComputerRoomProximity(),
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.Yes,
                "computer-room-cues-ready",
                "computer-room-content",
                "computer-room-observation")
        });

        Assert.Equal(FirstDoorControlState.Complete, complete.State);
        Assert.True(complete.ComputerRoomTrace.Ready);
        Assert.Equal(1, complete.ComputerRoomTrace.ConfirmationFrames);
        Assert.Equal(0, complete.ComputerRoomTrace.ConfirmationRemainingFrames);
        Assert.Single(complete.ComputerRoomTrace.AcceptedPositiveReplayObservations);
    }

    [Fact]
    public void ComputerRoomConfirmation_RejectsEnemyAlcoveSector52EvenWithPositiveVisualCues()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy() with
        {
            ComputerRoomRequiredStableFrames = 1,
            ComputerRoomConfirmationTimeoutFrames = 20
        });
        long tick = 1;
        controller.Evaluate(OpeningInput(tick) with
        {
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.No,
                "first-door-identity-still-visible",
                "pre-open-content",
                "pre-open-observation")
        });
        controller.Evaluate(OpeningInput(++tick) with
        {
            OpenEvidence = ScopedOpenEvidence() with
            {
                MilestoneConfirmed = true,
                MilestoneProvenance = FirstDoorEvidenceProvenance.TrustedMilestone
            }
        });
        controller.Evaluate(OpeningInput(++tick));

        var rejected = controller.Evaluate(OpeningInput(++tick) with
        {
            Proximity = ComputerRoomProximity() with { PlayerSectorIndex = 52 },
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.Yes,
                "computer-room-cues-ready",
                "enemy-alcove-content",
                "enemy-alcove-observation")
        });

        Assert.Equal(FirstDoorControlState.AwaitComputerRoom, rejected.State);
        Assert.Equal(FirstDoorOwnershipDisposition.HandOff, rejected.OwnershipDisposition);
        Assert.Equal(
            FirstDoorComputerRoomBlockCode.ComputerRoomTopologyMismatch,
            rejected.ComputerRoomTrace.BlockCode);
        Assert.Equal(0, rejected.ComputerRoomTrace.StableFrames);
        Assert.False(rejected.SemanticDelta.ComputerRoomEntered);
    }

    [Fact]
    public void ComputerRoomConfirmation_RawMissingBudgetFailsClosedAndNeutral()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy() with
        {
            ComputerRoomMaximumRawMissingFrames = 2,
            ComputerRoomConfirmationTimeoutFrames = 20
        });
        long tick = 1;
        controller.Evaluate(OpeningInput(tick) with
        {
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.No,
                "first-door-identity-still-visible",
                "pre-open-content",
                "pre-open-observation")
        });
        controller.Evaluate(OpeningInput(++tick) with
        {
            OpenEvidence = ScopedOpenEvidence() with
            {
                MilestoneConfirmed = true,
                MilestoneProvenance = FirstDoorEvidenceProvenance.TrustedMilestone
            }
        });
        controller.Evaluate(OpeningInput(++tick));

        controller.Evaluate(OpeningInput(++tick) with
        {
            Proximity = ComputerRoomProximity(),
            ComputerRoomObservation = new FirstDoorComputerRoomObservation
            {
                Reason = "raw-observation-unavailable"
            }
        });
        var failed = controller.Evaluate(OpeningInput(++tick) with
        {
            Proximity = ComputerRoomProximity(),
            ComputerRoomObservation = new FirstDoorComputerRoomObservation
            {
                Reason = "raw-observation-unavailable"
            }
        });

        AssertFailedSafeStop(failed);
        Assert.Equal("computer-room-raw-observation-missing-budget-exhausted", failed.TerminalFailureCode);
        Assert.Equal(
            FirstDoorComputerRoomBlockCode.RawObservationMissingBudgetExhausted,
            failed.ComputerRoomTrace.BlockCode);
        Assert.Equal(2, failed.ComputerRoomTrace.ConsecutiveRawMissingFrames);
        Assert.False(failed.Action.MoveForward);
        Assert.False(failed.Action.UseKey);
    }

    [Fact]
    public void ComputerRoomConfirmation_DeadlineFailsClosedWhenPositiveWindowNeverForms()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy() with
        {
            ComputerRoomConfirmationTimeoutFrames = 1,
            ComputerRoomMaximumRawMissingFrames = 20
        });
        long tick = 1;
        controller.Evaluate(OpeningInput(tick) with
        {
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.No,
                "first-door-identity-still-visible",
                "pre-open-content",
                "pre-open-observation")
        });
        controller.Evaluate(OpeningInput(++tick) with
        {
            OpenEvidence = ScopedOpenEvidence() with
            {
                MilestoneConfirmed = true,
                MilestoneProvenance = FirstDoorEvidenceProvenance.TrustedMilestone
            }
        });
        controller.Evaluate(OpeningInput(++tick));

        var failed = controller.Evaluate(OpeningInput(++tick) with
        {
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.No,
                "computer-room-cues-below-threshold",
                "not-room-content",
                "not-room-observation")
        });

        AssertFailedSafeStop(failed);
        Assert.Equal("computer-room-confirmation-budget-exhausted", failed.TerminalFailureCode);
        Assert.Equal(
            FirstDoorComputerRoomBlockCode.ConfirmationBudgetExhausted,
            failed.ComputerRoomTrace.BlockCode);
        Assert.Equal(1, failed.ComputerRoomTrace.ConfirmationFrames);
        Assert.Equal(0, failed.ComputerRoomTrace.ConfirmationRemainingFrames);
    }

    [Fact]
    public void ComputerRoomConfirmation_ExternalTerminalFailureFreezesCurrentReplayOnce()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 1;
        controller.Evaluate(OpeningInput(tick) with
        {
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.No,
                "first-door-identity-still-visible",
                "pre-open-content",
                "pre-open-observation")
        });
        controller.Evaluate(OpeningInput(++tick) with
        {
            OpenEvidence = ScopedOpenEvidence() with
            {
                MilestoneConfirmed = true,
                MilestoneProvenance = FirstDoorEvidenceProvenance.TrustedMilestone
            }
        });
        var handoff = controller.Evaluate(OpeningInput(++tick) with
        {
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.No,
                "first-door-identity-still-visible",
                "handoff-content",
                "handoff-observation")
        });
        Assert.Equal(FirstDoorControlState.AwaitComputerRoom, handoff.State);

        var failed = controller.Evaluate(OpeningInput(++tick) with
        {
            SessionId = string.Empty,
            RunId = string.Empty,
            RunGeneration = 0,
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.Yes,
                "computer-room-cues-ready",
                "fault-content",
                "fault-observation")
        });

        AssertFailedSafeStop(failed);
        Assert.Equal("missing-session-id", failed.TerminalFailureCode);
        Assert.Equal(
            FirstDoorComputerRoomBlockCode.ControllerTerminated,
            failed.ComputerRoomTrace.BlockCode);
        Assert.Equal("missing-session-id", failed.ComputerRoomTrace.Reason);
        Assert.Equal(tick, failed.ComputerRoomTrace.EvaluatedAtControlTick);
        Assert.Equal("handoff-observation", failed.ComputerRoomTrace.ObservationHash);

        var frozenTrace = failed.ComputerRoomTrace;
        var repeated = controller.Evaluate(OpeningInput(++tick) with
        {
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.No,
                "later-observation-must-not-replace-terminal-replay",
                "later-content",
                "later-observation")
        });

        AssertFailedSafeStop(repeated);
        Assert.Equal(frozenTrace, repeated.ComputerRoomTrace);
    }

    [Fact]
    public void Complete_AbsorbsMalformedPacketsUntilAValidFreshRunBoundary()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 1;
        controller.Evaluate(OpeningInput(tick) with
        {
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.No,
                "first-door-identity-still-visible",
                "pre-open-content",
                "pre-open-observation")
        });
        controller.Evaluate(OpeningInput(++tick) with
        {
            OpenEvidence = ScopedOpenEvidence() with
            {
                MilestoneConfirmed = true,
                MilestoneProvenance = FirstDoorEvidenceProvenance.TrustedMilestone
            }
        });
        controller.Evaluate(OpeningInput(++tick));
        var complete = controller.Evaluate(OpeningInput(++tick) with
        {
            Proximity = ComputerRoomProximity(),
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.Yes,
                "computer-room-cues-ready",
                "computer-room-content",
                "computer-room-observation")
        });
        Assert.Equal(FirstDoorControlState.Complete, complete.State);

        var retained = controller.Evaluate(OpeningInput(++tick) with
        {
            ContractVersion = 99,
            SessionId = string.Empty,
            RunId = string.Empty,
            RunGeneration = 0,
            ResetRequested = true,
            UseOutcomeRejectionCode = "invalid-reset-packet-must-not-append-replay",
            LifecycleFaulted = true,
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.No,
                "malformed-terminal-packet",
                "malformed-content",
                "malformed-observation")
        });

        Assert.Equal(FirstDoorControlState.Complete, retained.State);
        Assert.Equal(FirstDoorOwnershipDisposition.Completed, retained.OwnershipDisposition);
        Assert.Equal(complete.ReasonCode, retained.ReasonCode);
        Assert.Equal(complete.ComputerRoomTrace, retained.ComputerRoomTrace);
        Assert.Equal(complete.TransitionReplaySnapshots, retained.TransitionReplaySnapshots);
        Assert.False(retained.RunBoundaryApplied);
        Assert.False(retained.SemanticDelta.HasChanges);
        Assert.True(retained.SemanticDelta.ComputerRoomEntered);

        var fresh = controller.Evaluate(OpeningInput(
            ++tick,
            runGeneration: 2,
            runId: "test-run-2"));
        Assert.Equal(FirstDoorControlState.OpeningTransit, fresh.State);
        Assert.Equal(FirstDoorOwnershipDisposition.NotAcquired, fresh.OwnershipDisposition);
        Assert.False(fresh.SemanticDelta.ComputerRoomEntered);
    }

    [Fact]
    public void FailedSafeStop_PreservesFirstTerminalReasonUntilValidFreshRun()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        controller.Evaluate(ReadyInput(1));
        var failed = controller.Evaluate(ReadyInput(2) with { ContractVersion = 99 });
        AssertFailedSafeStop(failed);
        Assert.Equal("unsupported-contract-version", failed.TerminalFailureCode);

        var repeated = controller.Evaluate(ReadyInput(3) with
        {
            ContractError = "later-contract-error",
            LifecycleFaulted = true,
            ComputerRoomObservation = RoomObservation(
                FirstDoorEvidenceTruth.Yes,
                "later-observation",
                "later-content",
                "later-observation-hash")
        });

        AssertFailedSafeStop(repeated);
        Assert.Equal("unsupported-contract-version", repeated.ReasonCode);
        Assert.Equal("unsupported-contract-version", repeated.TerminalFailureCode);
        Assert.Equal(failed.ComputerRoomTrace, repeated.ComputerRoomTrace);
        Assert.Equal(failed.TransitionReplaySnapshots, repeated.TransitionReplaySnapshots);
    }

    [Fact]
    public void Align_RotatesByNativeBearingBeforeCenteredRawRefinement()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        controller.Evaluate(ReadyInput(1));
        controller.Evaluate(ReadyInput(2));
        var align = controller.Evaluate(ReadyInput(3));
        Assert.Equal(FirstDoorControlState.Align, align.State);

        var nativeMisaligned = controller.Evaluate(ReadyInput(4) with
        {
            AlignmentAvailable = true,
            AlignmentErrorDegrees = 0,
            RecommendedYaw = 0,
            Proximity = NearDoorProximity(bearingErrorDegrees: 35)
        });

        Assert.Equal(FirstDoorControlState.Align, nativeMisaligned.State);
        Assert.True(nativeMisaligned.Action.TurnYaw > 0);
        Assert.False(nativeMisaligned.Action.MoveForward);
        Assert.False(nativeMisaligned.Action.UseKey);
    }

    [Fact]
    public void ApproachDeadline_FinalFreshContactRangeTickWinsOtherwiseFailsClosed()
    {
        var policy = FastPolicy() with { ApproachTimeoutFrames = 2 };
        var successful = new FirstDoorControlStateMachine(policy);
        successful.Evaluate(OpeningInput(1));
        successful.Evaluate(ReadyInput(2) with { Proximity = ApproachProximity() });
        successful.Evaluate(ReadyInput(3) with { Proximity = ApproachProximity() });
        successful.Evaluate(ReadyInput(4) with { Proximity = ApproachProximity() });

        var atInclusiveDeadline = successful.Evaluate(ReadyInput(5));

        Assert.Equal(FirstDoorControlState.Align, atInclusiveDeadline.State);
        Assert.Equal("contact-approach-range-reached-align", atInclusiveDeadline.ReasonCode);

        var expired = new FirstDoorControlStateMachine(policy);
        expired.Evaluate(OpeningInput(1));
        expired.Evaluate(ReadyInput(2) with { Proximity = ApproachProximity() });
        expired.Evaluate(ReadyInput(3) with { Proximity = ApproachProximity() });
        expired.Evaluate(ReadyInput(4) with { Proximity = ApproachProximity() });

        var pastContactRangeAtDeadline = expired.Evaluate(
            ReadyInput(5) with { Proximity = ApproachProximity() });

        AssertFailedSafeStop(pastContactRangeAtDeadline);
        Assert.Equal("contact-approach-budget-exhausted", pastContactRangeAtDeadline.TerminalFailureCode);
    }

    [Fact]
    public void FailedUseBackoff_ReturnsToApproachAndReacquiresContactRange()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy());
        long tick = 0;
        var use = DriveToStationaryUse(controller, ref tick);
        controller.Evaluate(ReadyInput(++tick));
        var recovery = controller.Evaluate(ReadyInput(++tick) with
        {
            FailedUseEvidence = TrustedFailure("noway-reacquire", use.UseAttemptId, tick),
            UseAckWindowActive = true,
            AcknowledgedUseDecisionControlTick = use.ControlTick,
            AcknowledgedUseAttemptId = use.UseAttemptId
        });
        Assert.Equal(FirstDoorControlState.FailedUseReapproach, recovery.State);

        var approach = controller.Evaluate(ReadyInput(++tick));
        var align = controller.Evaluate(ReadyInput(++tick));

        Assert.Equal(FirstDoorControlState.Approach, approach.State);
        Assert.Equal("bounded-backward-reapproach-complete-contact-approach", approach.ReasonCode);
        Assert.Equal(FirstDoorControlState.Align, align.State);
        Assert.Equal("contact-approach-range-reached-align", align.ReasonCode);
    }

    [Fact]
    public void FailedUseBackoff_WithMissingPoseIsNeutralAndBudgeted()
    {
        var controller = new FirstDoorControlStateMachine(FastPolicy() with
        {
            FailedUseReapproachFrames = 3,
            ApproachMaximumProximityMissingFrames = 2
        });
        long tick = 0;
        var use = DriveToStationaryUse(controller, ref tick);
        controller.Evaluate(ReadyInput(++tick));
        controller.Evaluate(ReadyInput(++tick) with
        {
            FailedUseEvidence = TrustedFailure("noway-pose-loss", use.UseAttemptId, tick),
            UseAckWindowActive = true,
            AcknowledgedUseDecisionControlTick = use.ControlTick,
            AcknowledgedUseAttemptId = use.UseAttemptId
        });

        var missing = controller.Evaluate(ReadyInput(++tick) with
        {
            Proximity = new FirstDoorProximityObservation
            {
                Reason = "test-native-player-pose-missing"
            }
        });

        Assert.Equal(FirstDoorControlState.FailedUseReapproach, missing.State);
        Assert.False(missing.Action.MoveBackward);
        Assert.False(missing.Action.MoveForward);
        Assert.Contains("awaiting-fresh-proximity", missing.ReasonCode, StringComparison.Ordinal);

        var exhausted = controller.Evaluate(ReadyInput(++tick) with
        {
            Proximity = new FirstDoorProximityObservation
            {
                Reason = "test-native-player-pose-still-missing"
            }
        });
        AssertFailedSafeStop(exhausted);
        Assert.Equal(
            "bounded-backward-reapproach-proximity-missing-budget-exhausted",
            exhausted.TerminalFailureCode);
    }

    private static FirstDoorControlDecision DriveToStationaryUse(
        FirstDoorControlStateMachine controller,
        ref long tick,
        int firstPrediction = 0)
    {
        var opening = controller.Evaluate(ReadyInput(++tick, firstPrediction));
        Assert.Equal(FirstDoorControlState.OpeningNavigate, opening.State);
        Assert.Equal(FirstDoorOwnershipDisposition.Exclusive, opening.OwnershipDisposition);
        Assert.Equal(FirstDoorControlState.Approach, controller.Evaluate(ReadyInput(++tick, firstPrediction + 1)).State);
        Assert.Equal(FirstDoorControlState.Align, controller.Evaluate(ReadyInput(++tick, firstPrediction + 2)).State);
        Assert.Equal(FirstDoorControlState.Contact, controller.Evaluate(ReadyInput(++tick, firstPrediction + 3)).State);
        Assert.Equal(FirstDoorControlState.PreUseStop, controller.Evaluate(ReadyInput(++tick, firstPrediction + 4)).State);
        return controller.Evaluate(ReadyInput(++tick, firstPrediction + 5));
    }

    private static void AssertStationaryUse(FirstDoorControlDecision decision)
    {
        Assert.Equal(FirstDoorControlState.StationaryUse, decision.State);
        Assert.Equal(FirstDoorOwnershipUnit.StationaryUse, decision.OwnershipUnit);
        Assert.True(decision.Exclusive);
        Assert.True(decision.Action.UseKey);
        Assert.False(decision.Action.MoveForward);
        Assert.False(decision.Action.MoveBackward);
        Assert.False(decision.Action.StrafeLeft);
        Assert.False(decision.Action.StrafeRight);
        Assert.Equal(0, decision.Action.TurnYaw);
        Assert.False(decision.Action.AttackKey);
        Assert.False(decision.RunRequested);
    }

    private static void AssertFailedSafeStop(FirstDoorControlDecision decision)
    {
        Assert.Equal(FirstDoorControlState.FailedSafeStop, decision.State);
        Assert.Equal(FirstDoorOwnershipDisposition.FailedSafeStop, decision.OwnershipDisposition);
        Assert.True(decision.Exclusive);
        Assert.False(decision.Action.MoveForward);
        Assert.False(decision.Action.MoveBackward);
        Assert.False(decision.Action.UseKey);
        Assert.Equal(0, decision.Action.TurnYaw);
        Assert.False(decision.RunRequested);
    }

    private static FirstDoorControlInput ReadyInput(long controlTick, int prediction = 0)
        => new()
        {
            ContractVersion = FirstDoorControlStateMachine.CurrentContractVersion,
            SessionId = SessionId,
            RunId = RunId,
            RunGeneration = 1,
            ControlTick = controlTick,
            Prediction = prediction,
            LifecycleState = "running",
            ModelState = "ready",
            ControlReady = true,
            AcquisitionStatus = FirstDoorAcquisitionStatus.Ready,
            DoorIdentityConfidence = 0.8f,
            DoorIdentityTruth = FirstDoorEvidenceTruth.Yes,
            DoorIdentityReason = "test-trusted-first-door",
            CurrentDoorIdentityReadyForUse = true,
            RawObservationFresh = true,
            Proximity = NearDoorProximity(),
            AlignmentAvailable = true,
            AlignmentErrorDegrees = 0,
            RecommendedYaw = 0,
            OpeningNavigation = NavigationSnapshot(
                FirstDoorOpeningNavigationStatus.ReadyForAcquisition,
                new ActionCommand(false, false, false, false, 0, false, false),
                readyForAcquisition: true)
        };

    private static FirstDoorControlInput OpeningInput(
        long controlTick,
        long runGeneration = 1,
        string runId = RunId)
        => ReadyInput(controlTick) with
        {
            RunGeneration = runGeneration,
            RunId = runId,
            AcquisitionStatus = FirstDoorAcquisitionStatus.Waiting,
            DoorIdentityConfidence = 0,
            DoorIdentityTruth = FirstDoorEvidenceTruth.Unknown,
            CurrentDoorIdentityReadyForUse = false,
            RawObservationFresh = false,
            AlignmentAvailable = false,
            OpeningNavigation = new FirstDoorOpeningNavigationSnapshot()
        };

    private static FirstDoorOpeningNavigationSnapshot NavigationSnapshot(
        FirstDoorOpeningNavigationStatus status,
        ActionCommand action,
        bool readyForAcquisition)
        => new()
        {
            GeometryVersion = FirstDoorOpeningNavigationPolicy.GeometryVersion,
            GeometryHash = "test-opening-geometry-hash",
            WadContentSha256 = FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
            Status = status,
            BlockCode = readyForAcquisition
                ? FirstDoorOpeningNavigationBlockCode.None
                : FirstDoorOpeningNavigationBlockCode.WaypointPending,
            Active = true,
            LegIndex = readyForAcquisition ? 4 : 0,
            LegId = readyForAcquisition ? "first-door-sightline" : "spawn-north-lane",
            DoorSightlineCertified = readyForAcquisition,
            StationaryBearingAligned = readyForAcquisition,
            ReadyForAcquisition = readyForAcquisition,
            Action = action
        };

    private static FirstDoorOpenEvidence ScopedOpenEvidence(string runId = RunId)
        => new()
        {
            RunGeneration = 1,
            SessionId = SessionId,
            RunId = runId
        };

    private static FirstDoorOpenEvidence TrustedOpen(
        long useAttemptId,
        long eventControlTick,
        string runId = RunId)
        => ScopedOpenEvidence(runId) with
        {
            EventControlTick = eventControlTick,
            EventPrediction = 0,
            UseAttemptId = useAttemptId,
            AudioConfirmed = true,
            AudioEventId = "doropn-17",
            AudioAgeFrames = 0,
            AudioProvenance = FirstDoorEvidenceProvenance.ClassifiedNativeAudio
        };

    private static FirstDoorFailedUseEvidence TrustedFailure(
        string eventId,
        long useAttemptId,
        long eventControlTick)
        => new()
        {
            RunGeneration = 1,
            SessionId = SessionId,
            RunId = RunId,
            EventControlTick = eventControlTick,
            EventPrediction = 0,
            Confirmed = true,
            AudioEventId = eventId,
            AudioAgeFrames = 0,
            UseAttemptId = useAttemptId,
            Provenance = FirstDoorEvidenceProvenance.ClassifiedNativeAudio
        };

    private static FirstDoorControlPolicy FastPolicy()
        => new()
        {
            ApproachTimeoutFrames = 3,
            ApproachMaximumProximityMissingFrames = 2,
            FailedUseReapproachFrames = 1,
            AlignMinimumFrames = 1,
            AlignTimeoutFrames = 3,
            ContactFrames = 1,
            PreUseStopFrames = 1,
            PreUseStopTimeoutFrames = 3,
            StationaryUseFrames = 1,
            AwaitOutcomeFrames = 3,
            PostOpenEntryShoveFrames = 1,
            ComputerRoomRequiredStableFrames = 1,
            ComputerRoomConfirmationTimeoutFrames = 3,
            ComputerRoomMaximumRawMissingFrames = 2,
            MaxUseRetries = 2,
            MaxRecoveryAttempts = 4,
            MinimumDoorIdentityConfidence = 0.3f,
            AlignmentToleranceDegrees = 4
        };

    private static FirstDoorProximityObservation NearDoorProximity(
        double bearingErrorDegrees = 0)
        => new()
        {
            InputAccepted = true,
            Available = true,
            Fresh = true,
            Truth = FirstDoorEvidenceTruth.Yes,
            Reason = "test-native-first-door-proximity",
            ObservationHash = "test-native-first-door-proximity-hash",
            WadContentSha256 = FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
            WadVerified = true,
            NativeGametic = 1,
            NativeGameState = 0,
            NativeGameEpisode = 1,
            NativeGameMap = 1,
            PlayerSectorIndex = 1,
            PlayerX = 1500,
            PlayerY = -2496,
            HeadingDegrees = 0,
            ClosestDoorPointX = FirstDoorNativeProximityObserver.FirstDoorSegmentX,
            ClosestDoorPointY = -2496,
            DistanceToDoorSegment = 36,
            BearingToDoorDegrees = 0,
            BearingErrorDegrees = bearingErrorDegrees,
            AcquisitionMaximumDistance = 256,
            ContactApproachMaximumDistance = 96,
            UseMaximumDistance = 56,
            WithinAcquisitionRange = true,
            WithinContactApproachRange = true,
            WithinUseRange = true
        };

    private static FirstDoorProximityObservation ApproachProximity()
        => NearDoorProximity() with
        {
            ObservationHash = "test-native-first-door-approach-hash",
            PlayerX = 1320,
            DistanceToDoorSegment = 216,
            WithinContactApproachRange = false,
            WithinUseRange = false
        };

    private static FirstDoorProximityObservation ComputerRoomProximity()
        => NearDoorProximity() with
        {
            ObservationHash = "test-native-computer-room-proximity-hash",
            PlayerX = 1760,
            PlayerY = -2512,
            PlayerSectorIndex = 7,
            DistanceToDoorSegment = 224,
            WithinAcquisitionRange = true,
            WithinContactApproachRange = false,
            WithinUseRange = false
        };

    private static bool IsNeutral(ActionCommand action)
        => !action.MoveForward
            && !action.MoveBackward
            && !action.StrafeLeft
            && !action.StrafeRight
            && action.TurnYaw == 0
            && !action.UseKey
            && !action.AttackKey;

    private static FirstDoorComputerRoomObservation RoomObservation(
        FirstDoorEvidenceTruth truth,
        string reason,
        string visualContentHash,
        string observationHash)
        => new()
        {
            Available = true,
            Fresh = true,
            Truth = truth,
            Reason = reason,
            ObservationHash = observationHash,
            VisualContentHash = visualContentHash,
            FirstDoorIdentityTruth = truth == FirstDoorEvidenceTruth.Yes
                ? FirstDoorEvidenceTruth.Unknown
                : FirstDoorEvidenceTruth.Yes,
            FirstDoorCandidateScore = truth == FirstDoorEvidenceTruth.Yes ? 0.32f : 0.80f,
            RoomScore = truth == FirstDoorEvidenceTruth.Yes ? 0.18f : 0,
            DarkPanelScore = truth == FirstDoorEvidenceTruth.Yes ? 0.52f : 0,
            PanelScore = truth == FirstDoorEvidenceTruth.Yes ? 0.26f : 0,
            GameplayLuma = 46,
            CurrentReplayObservation = new FirstDoorRawReplayObservation
            {
                Available = true,
                FrameSequence = truth == FirstDoorEvidenceTruth.Yes ? 2 : 1,
                ObservationHash = observationHash,
                VisualContentHash = visualContentHash
            }
        };
}
