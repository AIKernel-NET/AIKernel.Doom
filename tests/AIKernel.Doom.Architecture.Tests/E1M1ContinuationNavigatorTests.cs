using AIKernel.Doom.Provider.Autoplay;

namespace AIKernel.Doom.Architecture.Tests;

public sealed class E1M1ContinuationNavigatorTests
{
    private const long MfShootable = 0x00000004L;
    private const long MfCountKill = 0x00400000L;

    [Fact]
    public void CanonicalPolicy_PreservesCertifiedGeometryAndFiniteBudgets()
    {
        var policy = new E1M1ContinuationPolicy();

        Assert.Equal(24d, policy.WaypointCompletionRadius);
        Assert.Equal(900, policy.RouteTimeoutFrames);
        Assert.Equal(180, policy.LegTimeoutFrames);
        Assert.Equal(180, policy.CombatTimeoutFrames);
        Assert.Equal(30, policy.MaximumPoseMissingFrames);
        Assert.Throws<ArgumentException>(() => new E1M1ContinuationNavigator(
            policy with { RouteTimeoutFrames = 901 }));
        Assert.Throws<ArgumentException>(() => new E1M1ContinuationNavigator(
            policy with { WaypointCompletionRadius = 25 }));
        Assert.Collection(
            E1M1ContinuationPolicy.CanonicalWaypoints,
            point => AssertWaypoint(point, 0, 3056, -3072, 60),
            point => AssertWaypoint(point, 1, 2900, -3216, 60),
            point => AssertWaypoint(point, 2, 3196, -3340, 60),
            point => AssertWaypoint(point, 3, 3024, -3544, 60),
            point => AssertWaypoint(point, 4, 3008, -3592, 60, 56),
            point => AssertWaypoint(point, 5, 3008, -3984, 56),
            point => AssertWaypoint(point, 6, 3008, -3984, 56),
            point => AssertWaypoint(point, 7, 3008, -4064, 73),
            point => AssertWaypoint(point, 8, 3008, -4200, 73, 72),
            point => AssertWaypoint(point, 9, 3008, -4400, 74),
            point => AssertWaypoint(point, 10, 3008, -4528, 74, 78),
            point => AssertWaypoint(point, 11, 3008, -4560, 78),
            point => AssertWaypoint(point, 12, 3008, -4616, 80),
            point => AssertWaypoint(point, 13, 3008, -4660, 81, 84),
            point => AssertWaypoint(point, 14, 3008, -4704, 84, 82),
            point => AssertWaypoint(point, 15, 2944, -4768, 82));
    }

    [Fact]
    public void CanonicalSecondDoorGeometry_AccountsForPlayerRadiusAndNearActionableFace()
    {
        var policy = new E1M1ContinuationPolicy();
        var approach = E1M1ContinuationPolicy.CanonicalWaypoints[6];
        var sector75Depth = E1M1ContinuationNavigator.SecondDoorPortalY
            - E1M1ContinuationNavigator.SecondDoorNearFaceY;
        var maximumCertifiedUseDistance = Math.Abs(
            approach.Y - E1M1ContinuationNavigator.SecondDoorNearFaceY)
            + policy.WaypointCompletionRadius;

        Assert.Equal(16d, sector75Depth);
        Assert.Equal(E1M1ContinuationNavigator.CanonicalPlayerRadius, sector75Depth);
        Assert.True(sector75Depth < E1M1ContinuationNavigator.CanonicalPlayerRadius * 2d);
        Assert.Equal(3008d, approach.X);
        Assert.Equal(-3984d, approach.Y);
        Assert.Equal(new[] { 56 }, approach.AllowedSectors);
        Assert.Equal(policy.UseMaximumDistance, maximumCertifiedUseDistance);
        Assert.Equal(
            E1M1ContinuationNavigator.SecondDoorNearFaceY,
            E1M1ContinuationNavigator.SecondDoorUseTargetY);
        Assert.NotEqual(
            E1M1ContinuationNavigator.SecondDoorFarFaceY,
            E1M1ContinuationNavigator.SecondDoorUseTargetY);
    }

    [Fact]
    public void Session_OwnsMonotonicControlTickAndRequiresFrozenPostCompletionTick()
    {
        var session = new E1M1ContinuationBrowserControlSession();
        var input = Input(1, 3056, -3072, 0, 60);
        var proof = Proof();

        var first = session.Evaluate(input, proof);
        var second = session.Evaluate(input with { NativeGametic = 2, NativeLevelTime = 2 }, proof);
        var mismatch = new E1M1ContinuationBrowserControlSession().Evaluate(
            input with { ExpectedPostComputerRoomControlTick = 40 },
            proof);

        Assert.Equal(1, first.ControlTick);
        Assert.Equal(2, second.ControlTick);
        Assert.Equal(E1M1ContinuationOwnershipDisposition.Exclusive, first.OwnershipDisposition);
        Assert.Equal(E1M1ContinuationOwnershipDisposition.NotAcquired, mismatch.OwnershipDisposition);
        Assert.Equal("post-completion-trace-invalid", mismatch.ReasonCode);
    }

    [Fact]
    public void FreshVisibleRouteThreat_PreemptsRouteWithStationaryAttack()
    {
        var session = new E1M1ContinuationBrowserControlSession();
        var threat = Actor(17, 1, 60, 3000, -3024, health: 20, lineOfSight: true);
        var input = Input(1, 2944, -3024, 0, 60) with
        {
            ActorSnapshot = Actors(1, threat),
            WeaponSnapshot = ReadyWeapon(1)
        };

        var decision = session.Evaluate(input, Proof());

        Assert.Equal(E1M1ContinuationState.InterceptRouteThreat, decision.State);
        Assert.True(decision.Action.AttackKey);
        Assert.False(decision.Action.MoveForward);
        Assert.Equal(0, decision.Action.TurnYaw);
        Assert.False(decision.RunRequested);
        Assert.True(decision.ThreatTrace.ThreatMatched);
        Assert.True(decision.ThreatTrace.StationaryFireAuthorized);
        Assert.Equal("RouteThreat", decision.SemanticProjection.Telos);
        Assert.Equal(1, decision.SemanticProjection.DoorOpenedCount);
    }

    [Fact]
    public void ArmedRouteThreatAttack_ContinuesOnlyForSameFreshBusyWeaponAndAuthority()
    {
        var session = new E1M1ContinuationBrowserControlSession();
        var threat = Actor(17, 1, 60, 3000, -3024, health: 20, lineOfSight: true);
        var armed = session.Evaluate(
            Input(1, 2944, -3024, 0, 60) with
            {
                ActorSnapshot = Actors(1, threat),
                WeaponSnapshot = ReadyWeapon(1)
            },
            Proof());
        var continued = session.Evaluate(
            Input(2, 2944, -3024, 0, 60) with
            {
                ActorSnapshot = Actors(2, threat),
                WeaponSnapshot = BusyWeapon(2)
            },
            Proof());
        var released = session.Evaluate(
            Input(3, 2944, -3024, 0, 60) with
            {
                ActorSnapshot = Actors(3, threat with { LineOfSight = false }),
                WeaponSnapshot = BusyWeapon(3)
            },
            Proof());

        Assert.True(armed.Action.AttackKey);
        Assert.True(armed.WeaponTrace.FireOpportunity);
        Assert.True(armed.WeaponTrace.ContinuationArmed);
        Assert.False(armed.WeaponTrace.AttackContinuation);
        Assert.Equal("route-threat", armed.WeaponTrace.ContinuationOwnerKind);
        Assert.Equal(17, armed.WeaponTrace.ContinuationTargetIdentity);
        Assert.Equal(1, armed.WeaponTrace.ContinuationReadyWeapon);
        Assert.Equal(armed.ControlTick, armed.WeaponTrace.ContinuationAuthorizedAtControlTick);

        Assert.True(continued.Action.AttackKey);
        Assert.Equal("route-threat-fire-cycle-continuation", continued.ReasonCode);
        Assert.True(continued.ThreatTrace.StationaryFireAuthorized);
        Assert.False(continued.WeaponTrace.FireOpportunity);
        Assert.True(continued.WeaponTrace.ContinuationArmed);
        Assert.True(continued.WeaponTrace.AttackContinuation);
        Assert.Equal(13, continued.WeaponTrace.WeaponState);
        Assert.Equal(12, continued.WeaponTrace.WeaponReadyState);
        Assert.Equal(1, continued.WeaponTrace.Refire);

        Assert.False(released.Action.AttackKey);
        Assert.False(released.WeaponTrace.ContinuationArmed);
        Assert.False(released.WeaponTrace.AttackContinuation);
        Assert.Equal("none", released.WeaponTrace.ContinuationOwnerKind);
        Assert.Equal(0, released.WeaponTrace.ContinuationTargetIdentity);
        Assert.Equal(-1, released.WeaponTrace.ContinuationReadyWeapon);
        Assert.Equal(-1, released.WeaponTrace.ContinuationAuthorizedAtControlTick);
    }

    [Theory]
    [InlineData("pending-weapon")]
    [InlineData("changed-ready-weapon")]
    public void ArmedRouteThreatAttack_WeaponAuthorityBoundaryCannotResurrectOldContinuation(
        string boundary)
    {
        var session = new E1M1ContinuationBrowserControlSession();
        var threat = Actor(17, 1, 60, 3000, -3024, health: 20, lineOfSight: true);
        var armed = session.Evaluate(
            Input(1, 2944, -3024, 0, 60) with
            {
                ActorSnapshot = Actors(1, threat),
                WeaponSnapshot = ReadyWeapon(1)
            },
            Proof());
        var boundaryWeapon = BusyWeapon(2) with
        {
            ReadyWeapon = boundary == "changed-ready-weapon" ? 2 : 1,
            PendingWeapon = boundary == "pending-weapon" ? 2 : 10
        };
        var boundaryDecision = session.Evaluate(
            Input(2, 2944, -3024, 0, 60) with
            {
                ActorSnapshot = Actors(2, threat),
                WeaponSnapshot = boundaryWeapon
            },
            Proof());
        var laterOldWeaponBusy = session.Evaluate(
            Input(3, 2944, -3024, 0, 60) with
            {
                ActorSnapshot = Actors(3, threat),
                WeaponSnapshot = BusyWeapon(3)
            },
            Proof());
        var rearmed = session.Evaluate(
            Input(4, 2944, -3024, 0, 60) with
            {
                ActorSnapshot = Actors(4, threat),
                WeaponSnapshot = ReadyWeapon(4)
            },
            Proof());

        Assert.True(armed.Action.AttackKey);
        Assert.False(boundaryDecision.Action.AttackKey);
        Assert.False(boundaryDecision.WeaponTrace.ContinuationArmed);
        Assert.False(laterOldWeaponBusy.Action.AttackKey);
        Assert.False(laterOldWeaponBusy.WeaponTrace.ContinuationArmed);
        Assert.False(laterOldWeaponBusy.WeaponTrace.AttackContinuation);
        Assert.True(rearmed.Action.AttackKey);
        Assert.True(rearmed.WeaponTrace.FireOpportunity);
        Assert.True(rearmed.WeaponTrace.ContinuationArmed);
        Assert.False(rearmed.WeaponTrace.AttackContinuation);
    }

    [Fact]
    public void Sector72NoLosGatekeeper_DoesNotResetVisibleRouteThreatCombatClock()
    {
        var session = new E1M1ContinuationBrowserControlSession();
        var proof = Proof();
        var gametic = 1L;
        var gatekeeper = Actor(
            74,
            E1M1ContinuationNavigator.GatekeeperRuntimeType,
            74,
            E1M1ContinuationNavigator.GatekeeperSpawnX,
            E1M1ContinuationNavigator.GatekeeperSpawnY,
            health: 60,
            lineOfSight: false);

        E1M1ContinuationDecision Step(
            double x,
            double y,
            double heading,
            int sector,
            BrowserAppliedActionAck? ack = null,
            bool busyWeapon = false,
            params PostComputerRoomNativeActorFact[] extraActors)
        {
            var current = gametic++;
            var actors = new[] { gatekeeper }.Concat(extraActors).ToArray();
            return session.Evaluate(
                Input(current, x, y, heading, sector) with
                {
                    ActorSnapshot = Actors(current, actors),
                    WeaponSnapshot = busyWeapon ? BusyWeapon(current) : ReadyWeapon(current),
                    AppliedActionAck = ack
                },
                proof);
        }

        var sectors = new[] { 60, 60, 60, 60, 56, 56 };
        E1M1ContinuationDecision decision = null!;
        for (var index = 0; index <= 5; index++)
        {
            var point = E1M1ContinuationPolicy.CanonicalWaypoints[index];
            decision = Step(point.X, point.Y, index == 5 ? 270 : 0, sectors[index]);
        }

        _ = Step(3008, -3984, 270, 56);
        _ = Step(3008, -3984, 270, 56);
        var use = Step(3008, -3984, 270, 56);
        Assert.True(use.Action.UseKey);
        _ = Step(3008, -3984, 270, 56, Ack(use));
        _ = Step(3008, -4004, 270, 75);
        _ = Step(3008, -4024, 270, 76);
        decision = Step(3008, -4064, 270, 73);
        Assert.True(decision.DoorTrace.SecondDoorTraversed);

        var threat = Actor(17, 1, 72, 3008, -4300, health: 20, lineOfSight: true);
        var armed = Step(3008, -4200, 270, 72, extraActors: threat);
        var continued = Step(
            3008,
            -4200,
            270,
            72,
            busyWeapon: true,
            extraActors: threat);

        Assert.True(armed.Action.AttackKey);
        Assert.Equal("route-threat", armed.Navigation.CombatOwnerKind);
        Assert.Equal(17, armed.Navigation.CombatOwnerIdentity);
        Assert.Equal(0, armed.Navigation.CombatFrames);
        Assert.True(continued.Action.AttackKey);
        Assert.True(continued.WeaponTrace.AttackContinuation);
        Assert.Equal("route-threat", continued.Navigation.CombatOwnerKind);
        Assert.Equal(17, continued.Navigation.CombatOwnerIdentity);
        Assert.Equal(1, continued.Navigation.CombatFrames);
        Assert.Equal(179, continued.Navigation.CombatRemainingFrames);
    }

    [Fact]
    public void FreshVisibleRouteThreat_WithMovingInertiaStopsBeforeAttack()
    {
        var session = new E1M1ContinuationBrowserControlSession();
        var threat = Actor(17, 1, 60, 3000, -3024, health: 20, lineOfSight: true);
        var input = Input(1, 2944, -3024, 0, 60) with
        {
            NativePlayerMomentumXFixed = Fixed(1),
            ActorSnapshot = Actors(1, threat),
            WeaponSnapshot = ReadyWeapon(1)
        };

        var decision = session.Evaluate(input, Proof());

        Assert.Equal(E1M1ContinuationState.InterceptRouteThreat, decision.State);
        Assert.Equal("route-threat-stationary-momentum-settle", decision.ReasonCode);
        AssertNeutral(decision.Action);
        Assert.False(decision.ThreatTrace.StationaryFireAuthorized);
    }

    [Fact]
    public void FirstAudioEvent_IsCataloguedOnceAfterRunStart()
    {
        var session = new E1M1ContinuationBrowserControlSession();
        var audio = new BrowserFirstDoorAudioInput
        {
            NativeEvents = 1,
            Events = new[]
            {
                new BrowserNativeAudioEventInput
                {
                    Sequence = 1,
                    SfxId = 25,
                    SfxName = "plpain"
                }
            }
        };

        var first = session.Evaluate(Input(1, 3056, -3072, 0, 60) with { Audio = audio }, Proof());
        var second = session.Evaluate(Input(2, 3056, -3072, 0, 60) with { Audio = audio }, Proof());

        Assert.Equal(1, first.AudioCatalogTrace.TotalNewEventCount);
        Assert.Single(first.AudioCatalogTrace.Events);
        Assert.True(first.AudioCatalogTrace.Events[0].Catalogued);
        Assert.Equal(0, second.AudioCatalogTrace.TotalNewEventCount);
        Assert.Empty(second.AudioCatalogTrace.Events);
        Assert.Equal(1, second.AudioCatalogTrace.LatestObservedSequence);
    }

    [Fact]
    public void ThreeFreshDeathGametics_RequestStableNativeRestartAndReleaseActions()
    {
        var session = new E1M1ContinuationBrowserControlSession();
        E1M1ContinuationDecision? decision = null;
        for (var gametic = 1; gametic <= 3; gametic++)
        {
            decision = session.Evaluate(
                Input(gametic, 3056, -3072, 0, 60) with
                {
                    NativePlayerHealth = 0,
                    NativePlayerState = 1
                },
                Proof());
        }

        var repeated = session.Evaluate(
            Input(4, 3056, -3072, 0, 60) with
            {
                NativePlayerHealth = 0,
                NativePlayerState = 1
            },
            Proof());

        Assert.NotNull(decision);
        Assert.True(decision.NativeDeathConfirmed);
        Assert.True(decision.RestartRequested);
        Assert.True(decision.VitalityTrace.Available);
        Assert.True(decision.VitalityTrace.Fresh);
        Assert.Equal(0, decision.VitalityTrace.PlayerHealth);
        Assert.Equal(3, decision.VitalityTrace.ConsecutiveDeathGametics);
        Assert.True(decision.VitalityTrace.NativeDeathConfirmed);
        Assert.Equal(E1M1ContinuationState.AwaitRestart, decision.State);
        Assert.False(decision.Navigation.Active);
        Assert.Equal(decision.RestartRequestId, repeated.RestartRequestId);
        Assert.StartsWith("e1m1-continuation:session-1:run-1:1:restart-", decision.RestartRequestId);
        AssertNeutral(decision.Action);
        AssertNeutral(repeated.Action);

        var navigator = new E1M1ContinuationNavigator();
        E1M1ContinuationDecision delayed = null!;
        for (var tick = 1L; tick <= 3; tick++)
        {
            delayed = navigator.Evaluate(
                Proof(),
                Input(tick, 3056, -3072, 0, 60) with
                {
                    NativePlayerHealth = 0,
                    NativePlayerState = 1
                },
                tick);
        }

        delayed = navigator.Evaluate(
            Proof(),
            Input(4, 3056, -3072, 0, 60),
            1000);
        Assert.Equal(E1M1ContinuationState.AwaitRestart, delayed.State);
        Assert.Equal(E1M1ContinuationOwnershipDisposition.Exclusive, delayed.OwnershipDisposition);
        Assert.True(delayed.RestartRequested);
        Assert.Equal(3, delayed.VitalityTrace.ConsecutiveDeathGametics);
        Assert.Equal(0, delayed.VitalityTrace.PlayerHealth);
        Assert.False(delayed.Navigation.Active);
        AssertNeutral(delayed.Action);

        var duplicateSession = new E1M1ContinuationBrowserControlSession();
        BrowserE1M1ContinuationInput Dead(long gametic)
            => Input(gametic, 3056, -3072, 0, 60) with
            {
                NativePlayerHealth = 0,
                NativePlayerState = 1
            };
        var firstDead = duplicateSession.Evaluate(Dead(10), Proof());
        var duplicateDead = duplicateSession.Evaluate(Dead(10), Proof());
        var secondDead = duplicateSession.Evaluate(Dead(11), Proof());
        var thirdDead = duplicateSession.Evaluate(Dead(12), Proof());
        Assert.Equal(1, firstDead.VitalityTrace.ConsecutiveDeathGametics);
        Assert.Equal(1, duplicateDead.VitalityTrace.ConsecutiveDeathGametics);
        Assert.False(duplicateDead.VitalityTrace.Fresh);
        Assert.Equal(2, secondDead.VitalityTrace.ConsecutiveDeathGametics);
        Assert.False(secondDead.RestartRequested);
        Assert.Equal(3, thirdDead.VitalityTrace.ConsecutiveDeathGametics);
        Assert.True(thirdDead.RestartRequested);
    }

    [Fact]
    public void DuplicateNativeGametic_CannotAdvanceWaypointOrStationaryProof()
    {
        var session = new E1M1ContinuationBrowserControlSession();
        var firstPoint = E1M1ContinuationPolicy.CanonicalWaypoints[0];
        var secondPoint = E1M1ContinuationPolicy.CanonicalWaypoints[1];
        var first = session.Evaluate(Input(1, firstPoint.X, firstPoint.Y, 0, 60), Proof());
        var duplicate = session.Evaluate(Input(1, secondPoint.X, secondPoint.Y, 0, 60), Proof());

        Assert.Equal(first.Navigation.LegIndex, duplicate.Navigation.LegIndex);
        Assert.Equal("native-player-pose-gametic-not-fresh", duplicate.ReasonCode);
        Assert.True(first.GatekeeperTrace.SnapshotFresh);
        Assert.False(duplicate.GatekeeperTrace.SnapshotAccepted);
        Assert.False(duplicate.GatekeeperTrace.SnapshotFresh);
        Assert.False(duplicate.ThreatTrace.StationaryFireAuthorized);
        AssertNeutral(duplicate.Action);
    }

    [Fact]
    public void CapturedRouteThreat_RetainsIdentityAcrossLosLossAndDoesNotSwitchNearest()
    {
        var session = new E1M1ContinuationBrowserControlSession();
        var captured = Actor(17, 1, 60, 3000, -3024, health: 20, lineOfSight: true);
        var other = Actor(18, 1, 60, 2960, -3024, health: 20, lineOfSight: true);
        var acquired = session.Evaluate(
            Input(1, 2944, -3024, 0, 60) with { ActorSnapshot = Actors(1, captured) },
            Proof());
        var losLost = session.Evaluate(
            Input(2, 2944, -3024, 0, 60) with
            {
                ActorSnapshot = Actors(2, captured with { LineOfSight = false }, other)
            },
            Proof());
        var reacquiredLos = session.Evaluate(
            Input(3, 2944, -3024, 0, 60) with { ActorSnapshot = Actors(3, captured, other) },
            Proof());

        Assert.Equal(17, acquired.ThreatTrace.Identity);
        Assert.Equal(17, losLost.ThreatTrace.Identity);
        Assert.False(losLost.Action.AttackKey);
        Assert.Contains("line-of-sight-lost", losLost.ThreatTrace.Reason, StringComparison.Ordinal);
        Assert.Equal(17, reacquiredLos.ThreatTrace.Identity);
        Assert.True(reacquiredLos.Action.AttackKey);
    }

    [Fact]
    public void CapturedRouteThreat_LeavingLocalTopologyReleasesAndReacquiresSameFreshTick()
    {
        var session = new E1M1ContinuationBrowserControlSession();
        var captured = Actor(17, 1, 56, 3000, -3024, health: 20, lineOfSight: true);
        var replacement = Actor(18, 1, 60, 3000, -3024, health: 20, lineOfSight: true);
        var acquired = session.Evaluate(
            Input(1, 2944, -3024, 0, 60) with { ActorSnapshot = Actors(1, captured) },
            Proof());
        var switched = session.Evaluate(
            Input(2, 2944, -3024, 0, 60) with
            {
                ActorSnapshot = Actors(2, captured with { SectorIndex = 75 }, replacement),
                WeaponSnapshot = ReadyWeapon(2)
            },
            Proof());

        Assert.Equal(17, acquired.ThreatTrace.Identity);
        Assert.True(acquired.Action.AttackKey);
        Assert.Equal(18, switched.ThreatTrace.Identity);
        Assert.True(switched.ThreatTrace.ThreatMatched);
        Assert.True(switched.Action.AttackKey);
        Assert.Equal("route-threat", switched.Navigation.CombatOwnerKind);
        Assert.Equal(18, switched.Navigation.CombatOwnerIdentity);
        Assert.Equal(0, switched.Navigation.CombatFrames);
        Assert.Equal(18, switched.WeaponTrace.ContinuationTargetIdentity);
        Assert.Equal("route-threat-stationary-fire", switched.ThreatTrace.Reason);
    }

    [Fact]
    public void CapturedRouteThreat_LeavingLocalTopologyWithoutReplacementResumesRoute()
    {
        var session = new E1M1ContinuationBrowserControlSession();
        var captured = Actor(17, 1, 56, 3000, -3024, health: 20, lineOfSight: true);
        _ = session.Evaluate(
            Input(1, 2944, -3024, 0, 60) with { ActorSnapshot = Actors(1, captured) },
            Proof());
        var released = session.Evaluate(
            Input(2, 2944, -3024, 0, 60) with
            {
                ActorSnapshot = Actors(2, captured with { SectorIndex = 75 })
            },
            Proof());

        Assert.False(released.ThreatTrace.ThreatMatched);
        Assert.Equal(0, released.ThreatTrace.Identity);
        Assert.Equal("none", released.Navigation.CombatOwnerKind);
        Assert.Equal(0, released.Navigation.CombatOwnerIdentity);
        Assert.Equal(180, released.Navigation.CombatRemainingFrames);
        Assert.Equal(
            "captured-route-threat-left-current-adjacent-topology",
            released.ThreatTrace.Reason);
        Assert.NotEqual(E1M1ContinuationState.InterceptRouteThreat, released.State);
        Assert.False(released.GatekeeperTrace.Killed);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void CapturedRouteThreat_DeadOrMissingReacquiresLocalThreatSameFreshTick(bool removed)
    {
        var session = new E1M1ContinuationBrowserControlSession();
        var captured = Actor(17, 1, 60, 3000, -3024, health: 20, lineOfSight: true);
        var replacement = Actor(18, 1, 60, 3000, -3024, health: 20, lineOfSight: true);
        _ = session.Evaluate(
            Input(1, 2944, -3024, 0, 60) with { ActorSnapshot = Actors(1, captured) },
            Proof());
        var actors = removed
            ? Actors(2, replacement)
            : Actors(2, captured with { Health = 0, LineOfSight = false }, replacement);
        var reacquired = session.Evaluate(
            Input(2, 2944, -3024, 0, 60) with
            {
                ActorSnapshot = actors,
                WeaponSnapshot = ReadyWeapon(2)
            },
            Proof());

        Assert.Equal(18, reacquired.ThreatTrace.Identity);
        Assert.True(reacquired.Action.AttackKey);
        Assert.Equal(18, reacquired.Navigation.CombatOwnerIdentity);
        Assert.Equal(18, reacquired.WeaponTrace.ContinuationTargetIdentity);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void RouteThreatAtExpiredLegBoundaryCannotEmitTurnOrAttack(bool alreadyOwned)
    {
        var navigator = new E1M1ContinuationNavigator();
        var proof = Proof();
        var threat = Actor(17, 1, 60, 3000, -3024, health: 20, lineOfSight: true);
        _ = navigator.Evaluate(
            proof,
            Input(1, 2944, -3024, 0, 60) with
            {
                ActorSnapshot = alreadyOwned ? Actors(1, threat) : Actors(1)
            },
            1);
        var deadline = navigator.Evaluate(
            proof,
            Input(2, 2944, -3024, 0, 60) with
            {
                ActorSnapshot = Actors(2, threat),
                WeaponSnapshot = ReadyWeapon(2)
            },
            181);

        Assert.Equal(E1M1ContinuationOwnershipDisposition.FailedSafeStop, deadline.OwnershipDisposition);
        Assert.StartsWith("e1m1-continuation-leg-budget-exhausted:", deadline.ReasonCode);
        Assert.Equal(0, deadline.Navigation.LegRemainingFrames);
        AssertNeutral(deadline.Action);
        Assert.False(deadline.WeaponTrace.ContinuationArmed);
    }

    [Fact]
    public void MissingPoseAtLegOrCombatBoundaryFailsImmediatelyWithoutAction()
    {
        var proof = Proof();
        var legNavigator = new E1M1ContinuationNavigator();
        _ = legNavigator.Evaluate(proof, Input(1, 2944, -3024, 0, 60), 1);
        var legDeadline = legNavigator.Evaluate(
            proof,
            Input(2, 2944, -3024, 0, 60) with { NativePlayerFactsAvailable = false },
            181);

        var combatNavigator = new E1M1ContinuationNavigator();
        var threat = Actor(17, 1, 60, 3100, -3072, health: 20, lineOfSight: true);
        _ = combatNavigator.Evaluate(
            proof,
            Input(1, 2944, -3024, 0, 60) with { ActorSnapshot = Actors(1, threat) },
            1);
        _ = combatNavigator.Evaluate(
            proof,
            Input(2, 3056, -3072, 0, 60) with
            {
                ActorSnapshot = Actors(2, threat with { LineOfSight = false })
            },
            2);
        var combatDeadline = combatNavigator.Evaluate(
            proof,
            Input(3, 3056, -3072, 0, 60) with { NativePlayerFactsAvailable = false },
            181);

        Assert.StartsWith("e1m1-continuation-leg-budget-exhausted:", legDeadline.ReasonCode);
        Assert.Equal(0, legDeadline.Navigation.LegRemainingFrames);
        AssertNeutral(legDeadline.Action);
        Assert.Equal("e1m1-continuation-combat-budget-exhausted", combatDeadline.ReasonCode);
        Assert.Equal(0, combatDeadline.Navigation.CombatRemainingFrames);
        Assert.Equal(1, combatDeadline.Navigation.LegRemainingFrames);
        AssertNeutral(combatDeadline.Action);
    }

    [Fact]
    public void RouteThreatDeathObservedAtCombatBoundaryClearsOwnerBeforeTimeout()
    {
        var navigator = new E1M1ContinuationNavigator();
        var proof = Proof();
        var point0 = E1M1ContinuationPolicy.CanonicalWaypoints[0];
        var point1 = E1M1ContinuationPolicy.CanonicalWaypoints[1];
        var threat = Actor(17, 1, 60, 3000, -3024, health: 20, lineOfSight: true);
        _ = navigator.Evaluate(
            proof,
            Input(1, 2944, -3024, 0, 60) with { ActorSnapshot = Actors(1, threat) },
            1);
        _ = navigator.Evaluate(
            proof,
            Input(2, point0.X, point0.Y, 0, 60) with
            {
                ActorSnapshot = Actors(2, threat with { LineOfSight = false })
            },
            2);
        var boundary = navigator.Evaluate(
            proof,
            Input(3, point1.X, point1.Y, 0, 60) with
            {
                ActorSnapshot = Actors(3, threat with { Health = 0, LineOfSight = false })
            },
            181);

        Assert.NotEqual(E1M1ContinuationOwnershipDisposition.FailedSafeStop, boundary.OwnershipDisposition);
        Assert.Equal("none", boundary.Navigation.CombatOwnerKind);
        Assert.Equal(0, boundary.Navigation.CombatOwnerIdentity);
        Assert.Equal(180, boundary.Navigation.CombatRemainingFrames);
        Assert.Equal(2, boundary.Navigation.LegIndex);
        Assert.False(boundary.Action.AttackKey);
    }

    [Fact]
    public void ExactRouteDeadlineFailsWhileLegBoundaryObservesLastLegalActionResult()
    {
        var proof = Proof();
        var routeNavigator = new E1M1ContinuationNavigator();
        _ = routeNavigator.Evaluate(proof, Input(1, 2944, -3024, 0, 60), 1);
        var routeDeadline = routeNavigator.Evaluate(
            proof,
            Input(2, 3056, -3072, 0, 60) with
            {
                NativePlayerHealth = 73,
                NativePlayerKillCount = 4
            },
            901);

        var boundaryNavigator = new E1M1ContinuationNavigator();
        _ = boundaryNavigator.Evaluate(proof, Input(1, 2944, -3024, 0, 60), 1);
        var lastLegalAction = boundaryNavigator.Evaluate(
            proof,
            Input(2, 2944, -3024, 0, 60),
            180);
        var boundaryArrival = boundaryNavigator.Evaluate(
            proof,
            Input(3, 3056, -3072, 0, 60) with
            {
                NativePlayerHealth = 72,
                NativePlayerKillCount = 5
            },
            181);

        var failedNavigator = new E1M1ContinuationNavigator();
        _ = failedNavigator.Evaluate(proof, Input(1, 2944, -3024, 0, 60), 1);
        var legDeadline = failedNavigator.Evaluate(
            proof,
            Input(2, 2944, -3024, 0, 60) with
            {
                NativePlayerHealth = 71,
                NativePlayerKillCount = 6
            },
            181);

        Assert.Equal("e1m1-continuation-route-budget-exhausted", routeDeadline.ReasonCode);
        Assert.Equal(E1M1ContinuationOwnershipDisposition.FailedSafeStop, routeDeadline.OwnershipDisposition);
        Assert.NotEqual(E1M1ContinuationOwnershipDisposition.FailedSafeStop, lastLegalAction.OwnershipDisposition);
        Assert.Equal(1, lastLegalAction.Navigation.LegRemainingFrames);
        Assert.NotEqual(E1M1ContinuationOwnershipDisposition.FailedSafeStop, boundaryArrival.OwnershipDisposition);
        Assert.Equal(1, boundaryArrival.Navigation.LegIndex);
        Assert.Equal("zigzag-west-dogleg", boundaryArrival.Navigation.LegId);
        Assert.Equal(180, boundaryArrival.Navigation.LegRemainingFrames);
        Assert.StartsWith("e1m1-continuation-leg-budget-exhausted:", legDeadline.ReasonCode);
        Assert.Equal(E1M1ContinuationOwnershipDisposition.FailedSafeStop, legDeadline.OwnershipDisposition);
        AssertNeutral(routeDeadline.Action);
        AssertNeutral(legDeadline.Action);
        Assert.True(routeDeadline.VitalityTrace.Fresh);
        Assert.Equal(2, routeDeadline.VitalityTrace.NativeGametic);
        Assert.Equal(73, routeDeadline.VitalityTrace.PlayerHealth);
        Assert.Equal(4, routeDeadline.VitalityTrace.PlayerKillCount);
        Assert.True(legDeadline.VitalityTrace.Fresh);
        Assert.Equal(2, legDeadline.VitalityTrace.NativeGametic);
        Assert.Equal(71, legDeadline.VitalityTrace.PlayerHealth);
        Assert.Equal(6, legDeadline.VitalityTrace.PlayerKillCount);
        Assert.Equal(2, legDeadline.Navigation.Pose.NativeGametic);

        var frozenFailureNavigation = legDeadline.Navigation;
        var frozenFailureReplay = legDeadline.FailureTrace.Replay.Count;
        var attachedFailure = failedNavigator.Evaluate(
            proof,
            Input(3, 3056, -3072, 0, 60),
            182);
        Assert.True(legDeadline.Exclusive);
        Assert.True(attachedFailure.Exclusive);
        Assert.Equal(frozenFailureNavigation, attachedFailure.Navigation);
        Assert.Equal(frozenFailureReplay, attachedFailure.FailureTrace.Replay.Count);
        Assert.Equal(3, attachedFailure.NativeGametic);

        E1M1ContinuationDecision failedRestart = null!;
        for (var index = 0; index < 3; index++)
        {
            var gametic = 4 + index;
            failedRestart = failedNavigator.Evaluate(
                proof,
                Input(gametic, 3056, -3072, 0, 60) with
                {
                    NativePlayerHealth = 0,
                    NativePlayerState = 1
                },
                183 + index);
        }

        Assert.Equal(E1M1ContinuationState.AwaitRestart, failedRestart.State);
        Assert.True(failedRestart.RestartRequested);
        Assert.True(failedRestart.FailureTrace.Failed);
        Assert.Equal(frozenFailureReplay, failedRestart.FailureTrace.Replay.Count);
        Assert.False(failedRestart.Navigation.Active);
        Assert.Equal(failedRestart.RestartReason, failedRestart.VitalityTrace.RestartReason);
        Assert.Equal("native-player-death-confirmed", failedRestart.RestartReason);
        Assert.Equal(string.Empty, failedRestart.ContractError);
        Assert.Equal("e1m1-continuation.exclusive", failedRestart.OwnerId);
    }

    [Fact]
    public void ThirdFreshDeathGameticAtInclusiveLegDeadline_RequestsRestartBeforeTimeout()
    {
        var navigator = new E1M1ContinuationNavigator();
        var proof = Proof();
        E1M1ContinuationDecision decision = null!;
        for (var gametic = 1L; gametic <= 2; gametic++)
        {
            _ = navigator.Evaluate(
                proof,
                Input(gametic, 2944, -3024, 0, 60) with
                {
                    NativePlayerHealth = 0,
                    NativePlayerState = 1
                },
                gametic);
        }

        decision = navigator.Evaluate(
            proof,
            Input(3, 2944, -3024, 0, 60) with
            {
                NativePlayerHealth = 0,
                NativePlayerState = 1
            },
            181);

        Assert.Equal(E1M1ContinuationState.AwaitRestart, decision.State);
        Assert.True(decision.RestartRequested);
        Assert.True(decision.NativeDeathConfirmed);
        Assert.Equal(3, decision.VitalityTrace.NativeGametic);
        Assert.Equal(3, decision.VitalityTrace.ConsecutiveDeathGametics);
        Assert.False(decision.FailureTrace.Failed);
        Assert.Equal("native-player-death-restart-requested", decision.ReasonCode);
        Assert.Equal(string.Empty, decision.ContractError);
        AssertNeutral(decision.Action);
    }

    [Fact]
    public void ExactCombatDeadline_FailsBeforeFreshFireOpportunity()
    {
        var navigator = new E1M1ContinuationNavigator();
        var proof = Proof();
        var point0 = E1M1ContinuationPolicy.CanonicalWaypoints[0];
        var point1 = E1M1ContinuationPolicy.CanonicalWaypoints[1];
        var threat = Actor(17, 1, 60, 3100, -3072, health: 20, lineOfSight: true);
        _ = navigator.Evaluate(proof, Input(1, point0.X, point0.Y, 0, 60), 1);
        _ = navigator.Evaluate(
            proof,
            Input(2, point0.X, point0.Y, 0, 60) with { ActorSnapshot = Actors(2, threat) },
            2);
        _ = navigator.Evaluate(
            proof,
            Input(3, point1.X, point1.Y, 0, 60) with
            {
                ActorSnapshot = Actors(3, threat with { LineOfSight = false })
            },
            3);
        var alignedAtPointOne = threat with { YFixed = Fixed(point1.Y) };
        var rearmed = navigator.Evaluate(
            proof,
            Input(4, point1.X, point1.Y, 0, 60) with
            {
                ActorSnapshot = Actors(4, alignedAtPointOne)
            },
            4);
        var deadline = navigator.Evaluate(
            proof,
            Input(5, point1.X, point1.Y, 0, 60) with
            {
                ActorSnapshot = Actors(5, alignedAtPointOne),
                WeaponSnapshot = BusyWeapon(5)
            },
            182);

        Assert.True(rearmed.Action.AttackKey);
        Assert.True(rearmed.WeaponTrace.ContinuationArmed);
        Assert.Equal("e1m1-continuation-combat-budget-exhausted", deadline.ReasonCode);
        AssertNeutral(deadline.Action);
        Assert.False(deadline.WeaponTrace.ContinuationArmed);
        Assert.False(deadline.WeaponTrace.AttackContinuation);
        Assert.False(deadline.WeaponTrace.SnapshotAccepted);
    }

    [Fact]
    public void ExactSecondDoorAckAtLegBoundaryIsAcceptedWhileMissingAckFailsNeutral()
    {
        var proof = Proof();

        static E1M1ContinuationDecision DriveToUse(
            E1M1ContinuationNavigator navigator,
            E1M1ContinuationActivationProof proof)
        {
            E1M1ContinuationDecision decision = null!;
            for (var index = 0; index <= 5; index++)
            {
                var point = E1M1ContinuationPolicy.CanonicalWaypoints[index];
                decision = navigator.Evaluate(
                    proof,
                    Input(index + 1, point.X, point.Y, index == 5 ? 270 : 0, point.AllowedSectors[0]),
                    index + 1);
            }

            _ = navigator.Evaluate(proof, Input(7, 3008, -3984, 270, 56), 7);
            _ = navigator.Evaluate(proof, Input(8, 3008, -3984, 270, 56), 8);
            return navigator.Evaluate(proof, Input(9, 3008, -3984, 270, 56), 9);
        }

        var acceptedNavigator = new E1M1ContinuationNavigator();
        var acceptedUse = DriveToUse(acceptedNavigator, proof);
        var accepted = acceptedNavigator.Evaluate(
            proof,
            Input(10, 3008, -3984, 270, 56) with { AppliedActionAck = Ack(acceptedUse) },
            186);

        var missingNavigator = new E1M1ContinuationNavigator();
        var missingUse = DriveToUse(missingNavigator, proof);
        var missing = missingNavigator.Evaluate(
            proof,
            Input(10, 3008, -3984, 270, 56),
            186);

        var lateNavigator = new E1M1ContinuationNavigator();
        var lateUse = DriveToUse(lateNavigator, proof);
        var late = lateNavigator.Evaluate(
            proof,
            Input(10, 3008, -3984, 270, 56) with { AppliedActionAck = Ack(lateUse) },
            187);

        Assert.True(acceptedUse.Action.UseKey);
        Assert.True(missingUse.Action.UseKey);
        Assert.True(accepted.DoorTrace.SecondDoorAckAccepted);
        Assert.Equal(E1M1ContinuationState.TraverseSecondDoor, accepted.State);
        Assert.Equal(180, accepted.Navigation.LegRemainingFrames);
        Assert.Equal(E1M1ContinuationOwnershipDisposition.FailedSafeStop, missing.OwnershipDisposition);
        Assert.Equal(
            "e1m1-continuation-leg-budget-exhausted:SecondDoor-ack",
            missing.ReasonCode);
        AssertNeutral(missing.Action);
        Assert.Equal(E1M1ContinuationOwnershipDisposition.FailedSafeStop, late.OwnershipDisposition);
        Assert.Equal(
            "e1m1-continuation-leg-budget-exhausted:SecondDoor-ack",
            late.ReasonCode);
        Assert.False(late.DoorTrace.SecondDoorAckAccepted);
        AssertNeutral(late.Action);
    }

    [Fact]
    public void NewlyVisibleGatekeeperAtExpiredLegBoundaryCannotAttack()
    {
        var navigator = new E1M1ContinuationNavigator();
        var proof = Proof();
        for (var index = 0; index <= 5; index++)
        {
            var point = E1M1ContinuationPolicy.CanonicalWaypoints[index];
            _ = navigator.Evaluate(
                proof,
                Input(index + 1, point.X, point.Y, index == 5 ? 270 : 0, point.AllowedSectors[0]),
                index + 1);
        }

        _ = navigator.Evaluate(proof, Input(7, 3008, -3984, 270, 56), 7);
        _ = navigator.Evaluate(proof, Input(8, 3008, -3984, 270, 56), 8);
        var use = navigator.Evaluate(proof, Input(9, 3008, -3984, 270, 56), 9);
        _ = navigator.Evaluate(
            proof,
            Input(10, 3008, -3984, 270, 56) with { AppliedActionAck = Ack(use) },
            10);
        _ = navigator.Evaluate(proof, Input(11, 3008, -4004, 270, 75), 11);
        _ = navigator.Evaluate(proof, Input(12, 3008, -4024, 270, 76), 12);
        var farSide = navigator.Evaluate(proof, Input(13, 3008, -4064, 270, 73), 13);

        var gatekeeper = Actor(
            74,
            E1M1ContinuationNavigator.GatekeeperRuntimeType,
            E1M1ContinuationNavigator.GatekeeperSectorIndex,
            E1M1ContinuationNavigator.GatekeeperSpawnX,
            E1M1ContinuationNavigator.GatekeeperSpawnY,
            health: 60,
            lineOfSight: true);
        var deadline = navigator.Evaluate(
            proof,
            Input(14, 3008, -4200, 270, 72) with
            {
                ActorSnapshot = Actors(14, gatekeeper),
                WeaponSnapshot = ReadyWeapon(14)
            },
            193);

        Assert.True(farSide.DoorTrace.SecondDoorTraversed);
        Assert.Equal(0, farSide.Navigation.LegFrames);
        Assert.Equal(E1M1ContinuationOwnershipDisposition.FailedSafeStop, deadline.OwnershipDisposition);
        Assert.Equal(
            "e1m1-continuation-leg-budget-exhausted:gatekeeper-combat",
            deadline.ReasonCode);
        Assert.Equal(0, deadline.Navigation.LegRemainingFrames);
        AssertNeutral(deadline.Action);
    }

    [Fact]
    public void MissingDoorAckCannotMaskExpiredRetainedCombatOwner()
    {
        var navigator = new E1M1ContinuationNavigator();
        var proof = Proof();
        var visibleThreat = Actor(17, 1, 56, 3000, -3024, health: 20, lineOfSight: true);
        var hiddenThreat = visibleThreat with { LineOfSight = false };
        _ = navigator.Evaluate(
            proof,
            Input(1, 2944, -3024, 0, 60) with { ActorSnapshot = Actors(1, visibleThreat) },
            1);

        for (var index = 0; index <= 5; index++)
        {
            var gametic = index + 2;
            var point = E1M1ContinuationPolicy.CanonicalWaypoints[index];
            _ = navigator.Evaluate(
                proof,
                Input(
                    gametic,
                    point.X,
                    point.Y,
                    index == 5 ? 270 : 0,
                    point.AllowedSectors[0]) with
                {
                    ActorSnapshot = Actors(gametic, hiddenThreat)
                },
                gametic);
        }

        _ = navigator.Evaluate(
            proof,
            Input(8, 3008, -3984, 270, 56) with { ActorSnapshot = Actors(8, hiddenThreat) },
            8);
        _ = navigator.Evaluate(
            proof,
            Input(9, 3008, -3984, 270, 56) with { ActorSnapshot = Actors(9, hiddenThreat) },
            9);
        var use = navigator.Evaluate(
            proof,
            Input(10, 3008, -3984, 270, 56) with { ActorSnapshot = Actors(10, hiddenThreat) },
            10);
        var deadline = navigator.Evaluate(
            proof,
            Input(11, 3008, -3984, 270, 56) with { ActorSnapshot = Actors(11, hiddenThreat) },
            181);

        Assert.True(use.Action.UseKey);
        Assert.Equal(E1M1ContinuationState.StationarySecondDoorUse, use.State);
        Assert.Equal("e1m1-continuation-combat-budget-exhausted", deadline.ReasonCode);
        Assert.Equal(E1M1ContinuationOwnershipDisposition.FailedSafeStop, deadline.OwnershipDisposition);
        Assert.Equal(0, deadline.Navigation.CombatRemainingFrames);
        AssertNeutral(deadline.Action);
    }

    [Theory]
    [InlineData(75, -4004d)]
    [InlineData(73, -4064d)]
    public void ForwardSectorJumpBeforeSecondDoorUse_FailsClosed(int sector, double y)
    {
        var session = new E1M1ContinuationBrowserControlSession();
        _ = session.Evaluate(Input(1, 3056, -3072, 0, 60), Proof());

        var jump = session.Evaluate(Input(2, 3008, y, 270, sector), Proof());

        Assert.Equal(E1M1ContinuationOwnershipDisposition.FailedSafeStop, jump.OwnershipDisposition);
        Assert.Equal($"second-door-forward-sector-before-owned-use:{sector}", jump.ReasonCode);
        AssertNeutral(jump.Action);
    }

    [Fact]
    public void PortalWaypointCertifiedOnNearSide_AllowsNextSampleUntilPhysicalCrossing()
    {
        var session = new E1M1ContinuationBrowserControlSession();
        E1M1ContinuationDecision decision = null!;
        for (var index = 0; index <= 4; index++)
        {
            var point = E1M1ContinuationPolicy.CanonicalWaypoints[index];
            decision = session.Evaluate(
                Input(index + 1, point.X, point.Y, 0, 60),
                Proof());
        }

        var nearSideFollowup = session.Evaluate(
            Input(6, 3008, -3592, 270, 60),
            Proof());

        Assert.Equal(5, decision.Navigation.LegIndex);
        Assert.Equal(5, nearSideFollowup.Navigation.LegIndex);
        Assert.NotEqual(
            E1M1ContinuationOwnershipDisposition.FailedSafeStop,
            nearSideFollowup.OwnershipDisposition);
        Assert.Equal("second-door-north-lane", nearSideFollowup.Navigation.LegId);
    }

    [Theory]
    [InlineData(true, 84, false)]
    [InlineData(false, 84, false)]
    [InlineData(false, 82, true)]
    public void CanonicalReplay_RequiresOwnedDoorAcksGatekeeperKillAndNativeIntermission(
        bool observeExitDoorSlab,
        int firstExitFarSector,
        bool expectTraversalFailure)
    {
        var session = new E1M1ContinuationBrowserControlSession();
        var proof = Proof();
        var gametic = 1L;
        var gatekeeper = Actor(
            74,
            E1M1ContinuationNavigator.GatekeeperRuntimeType,
            74,
            E1M1ContinuationNavigator.GatekeeperSpawnX,
            E1M1ContinuationNavigator.GatekeeperSpawnY,
            health: 60,
            lineOfSight: false);

        E1M1ContinuationDecision Evaluate(
            double x,
            double y,
            double heading,
            int sector,
            PostComputerRoomNativeActorFact? actor = null,
            int killCount = 0,
            BrowserAppliedActionAck? ack = null,
            bool busyWeapon = false)
        {
            var current = gametic++;
            return session.Evaluate(
                Input(current, x, y, heading, sector) with
                {
                    NativePlayerKillCount = killCount,
                    ActorSnapshot = actor is null ? Actors(current) : Actors(current, actor),
                    WeaponSnapshot = busyWeapon ? BusyWeapon(current) : ReadyWeapon(current),
                    AppliedActionAck = ack
                },
                proof);
        }

        var sectors = new[] { 60, 60, 60, 60, 56, 56 };
        E1M1ContinuationDecision decision = null!;
        for (var index = 0; index <= 5; index++)
        {
            var point = E1M1ContinuationPolicy.CanonicalWaypoints[index];
            decision = Evaluate(point.X, point.Y, index == 5 ? 270 : 0, sectors[index], gatekeeper);
        }

        Assert.Equal(E1M1ContinuationState.PreUseStopSecondDoor, decision.State);
        var secondStopOne = Evaluate(3008, -3984, 270, 56, gatekeeper);
        var secondStopTwo = Evaluate(3008, -3984, 270, 56, gatekeeper);
        AssertNeutral(secondStopOne.Action);
        AssertNeutral(secondStopTwo.Action);
        var secondUse = Evaluate(3008, -3984, 270, 56, gatekeeper);
        Assert.Equal(E1M1ContinuationState.StationarySecondDoorUse, secondUse.State);
        Assert.True(secondUse.Action.UseKey);
        Assert.True(secondUse.UseAttemptId > 0);
        var secondAck = Ack(secondUse);
        decision = Evaluate(3008, -3984, 270, 56, gatekeeper, ack: secondAck);
        Assert.Equal(E1M1ContinuationState.TraverseSecondDoor, decision.State);

        decision = Evaluate(3008, -4004, 270, 75, gatekeeper);
        Assert.False(decision.DoorTrace.SecondDoorSlabObserved);
        decision = Evaluate(3008, -4024, 270, 76, gatekeeper);
        Assert.True(decision.DoorTrace.SecondDoorSlabObserved);
        decision = Evaluate(3008, -4064, 270, 73, gatekeeper);
        Assert.True(decision.DoorTrace.SecondDoorTraversed);
        Assert.True(decision.DoorTrace.SecondDoorSlabObserved);
        Assert.Equal(2, decision.SemanticProjection.DoorOpenedCount);
        var visibleGatekeeper = gatekeeper with { LineOfSight = true };
        decision = Evaluate(3008, -4200, 270, 72, visibleGatekeeper);
        Assert.True(decision.Action.AttackKey);
        Assert.Equal(E1M1ContinuationState.EngageGatekeeper, decision.State);
        Assert.Equal(8, decision.Navigation.LegIndex);
        Assert.Equal("sector-72-north-approach", decision.Navigation.LegId);
        Assert.Equal(72, decision.Navigation.Pose.PlayerSectorIndex);
        Assert.Equal(74, decision.GatekeeperTrace.CurrentSectorIndex);
        Assert.True(decision.GatekeeperTrace.TopologyAccepted);
        Assert.True(decision.WeaponTrace.ContinuationArmed);
        Assert.Equal("gatekeeper", decision.WeaponTrace.ContinuationOwnerKind);
        Assert.Equal(74, decision.WeaponTrace.ContinuationTargetIdentity);
        decision = Evaluate(
            3008,
            -4200,
            270,
            72,
            visibleGatekeeper,
            busyWeapon: true);
        Assert.True(decision.Action.AttackKey);
        Assert.Equal("canonical-gatekeeper-fire-cycle-continuation", decision.ReasonCode);
        Assert.True(decision.WeaponTrace.AttackContinuation);
        Assert.Equal("gatekeeper", decision.WeaponTrace.ContinuationOwnerKind);

        var deadGatekeeper = visibleGatekeeper with { Health = 0, LineOfSight = false };
        decision = Evaluate(3008, -4200, 270, 72, deadGatekeeper, killCount: 1);
        Assert.True(decision.GatekeeperTrace.Killed);
        Assert.Equal(E1M1ContinuationState.NavigateGatekeeper, decision.State);
        Assert.Equal(9, decision.Navigation.LegIndex);
        decision = Evaluate(3008, -4400, 270, 74, deadGatekeeper, killCount: 1);
        Assert.Equal(E1M1ContinuationState.NavigateExitDoor, decision.State);

        decision = Evaluate(3008, -4528, 270, 74, deadGatekeeper, killCount: 1);
        decision = Evaluate(3008, -4560, 270, 78, deadGatekeeper, killCount: 1);
        decision = Evaluate(3008, -4591, 270, 78, deadGatekeeper, killCount: 1);
        Assert.Equal(12, decision.Navigation.LegIndex);
        var adjacentInsertThreat = Actor(90, 12, 78, 3008, -4604, health: 20, lineOfSight: true);
        decision = Evaluate(3008, -4596, 270, 79, adjacentInsertThreat, killCount: 1);
        Assert.Equal(12, decision.Navigation.LegIndex);
        Assert.Equal(79, decision.Navigation.Pose.PlayerSectorIndex);
        Assert.Equal(new[] { 80 }, decision.Navigation.AllowedSectors);
        Assert.True(decision.ThreatTrace.ThreatMatched);
        Assert.Equal(78, decision.ThreatTrace.SectorIndex);
        Assert.True(decision.Action.AttackKey);
        Assert.False(decision.Action.UseKey);
        decision = Evaluate(
            3008,
            -4596,
            270,
            79,
            adjacentInsertThreat with { Health = 0, LineOfSight = false },
            killCount: 1);
        Assert.False(decision.ThreatTrace.ThreatMatched);
        Assert.True(decision.Action.MoveForward);
        var falseAdjacentThreat = Actor(91, 12, 80, 3008, -4616, health: 20, lineOfSight: true);
        decision = Evaluate(3008, -4596, 270, 79, falseAdjacentThreat, killCount: 1);
        Assert.False(decision.ThreatTrace.ThreatMatched);
        Assert.False(decision.Action.AttackKey);
        Assert.True(decision.Action.MoveForward);
        decision = Evaluate(3008, -4604, 270, 78, deadGatekeeper, killCount: 1);
        Assert.Equal(12, decision.Navigation.LegIndex);
        decision = Evaluate(3008, -4616, 270, 80, deadGatekeeper, killCount: 1);
        Assert.Equal(E1M1ContinuationState.PreUseStopExitDoor, decision.State);
        var exitDoorStopOne = Evaluate(3008, -4616, 270, 80, deadGatekeeper, killCount: 1);
        var exitDoorStopTwo = Evaluate(3008, -4616, 270, 80, deadGatekeeper, killCount: 1);
        AssertNeutral(exitDoorStopOne.Action);
        AssertNeutral(exitDoorStopTwo.Action);
        var exitDoorUse = Evaluate(3008, -4616, 270, 80, deadGatekeeper, killCount: 1);
        Assert.Equal(E1M1ContinuationState.StationaryExitDoorUse, exitDoorUse.State);
        decision = Evaluate(
            3008,
            -4616,
            270,
            80,
            deadGatekeeper,
            killCount: 1,
            ack: Ack(exitDoorUse));
        Assert.Equal(E1M1ContinuationState.EnterExitRoom, decision.State);

        if (observeExitDoorSlab)
        {
            decision = Evaluate(3008, -4640, 270, 81, deadGatekeeper, killCount: 1);
            Assert.True(decision.DoorTrace.ExitDoorSlabObserved);
        }

        decision = Evaluate(
            3008,
            firstExitFarSector == 84 ? -4660 : -4704,
            270,
            firstExitFarSector,
            deadGatekeeper,
            killCount: 1);
        if (expectTraversalFailure)
        {
            Assert.Equal(E1M1ContinuationOwnershipDisposition.FailedSafeStop, decision.OwnershipDisposition);
            Assert.Equal("exit-door-traversal-sector-order:82", decision.ReasonCode);
            Assert.False(decision.DoorTrace.ExitDoorTraversed);
            AssertNeutral(decision.Action);
            return;
        }

        Assert.True(decision.DoorTrace.ExitDoorTraversed);
        Assert.Equal(observeExitDoorSlab, decision.DoorTrace.ExitDoorSlabObserved);
        Assert.Equal(3, decision.SemanticProjection.DoorOpenedCount);
        decision = Evaluate(3008, -4704, 270, 82, deadGatekeeper, killCount: 1);
        decision = Evaluate(2944, -4768, 180, 82, deadGatekeeper, killCount: 1);
        Assert.Equal(E1M1ContinuationState.PreUseStopExitSwitch, decision.State);
        var switchStopOne = Evaluate(2944, -4768, 180, 82, deadGatekeeper, killCount: 1);
        var switchStopTwo = Evaluate(2944, -4768, 180, 82, deadGatekeeper, killCount: 1);
        AssertNeutral(switchStopOne.Action);
        AssertNeutral(switchStopTwo.Action);
        var switchUse = Evaluate(2944, -4768, 180, 82, deadGatekeeper, killCount: 1);
        Assert.Equal(E1M1ContinuationState.StationaryExitUse, switchUse.State);
        decision = Evaluate(
            2944,
            -4768,
            180,
            82,
            deadGatekeeper,
            killCount: 1,
            ack: Ack(switchUse));
        Assert.Equal(E1M1ContinuationState.AwaitLevelCompletion, decision.State);

        var completedInput = Input(gametic, 2944, -4768, 180, 82) with
        {
            NativeGameState = 1,
            NativePlayerFactsAvailable = false,
            NativePlayerVitalityFactsAvailable = false,
            ActorSnapshot = new PostComputerRoomNativeActorSnapshot(),
            WeaponSnapshot = new PostComputerRoomNativeWeaponSnapshot()
        };
        var completed = session.Evaluate(completedInput, proof);

        Assert.Equal(E1M1ContinuationOwnershipDisposition.Completed, completed.OwnershipDisposition);
        Assert.True(completed.Completed);
        Assert.True(completed.CompletionTrace.Completed);
        Assert.Equal(1, completed.CompletionTrace.CompletedGameState);
        Assert.True(completed.CompletionTrace.SecondDoorTraversed);
        Assert.True(completed.CompletionTrace.GatekeeperKilled);
        Assert.Equal(0, completed.CompletionTrace.GatekeeperKillCountAtAcquisition);
        Assert.Equal(1, completed.CompletionTrace.GatekeeperConfirmedKillCount);
        Assert.Equal(1, completed.GatekeeperTrace.CurrentKillCount);
        Assert.True(completed.GatekeeperTrace.KillCountAdvanced);
        Assert.True(completed.CompletionTrace.ExitDoorTraversed);
        Assert.True(completed.CompletionTrace.ExitSwitchUsed);
        Assert.Equal("E1M1Complete", completed.SemanticProjection.Telos);
        Assert.DoesNotContain("FirstDoor", completed.SemanticProjection.Telos, StringComparison.Ordinal);

        var frozenNavigation = completed.Navigation;
        var frozenReplayCount = completed.CompletionTrace.Replay.Count;
        var attached = session.Evaluate(
            completedInput with { NativeGametic = gametic + 1, NativeLevelTime = gametic + 1 },
            proof);
        Assert.Equal(frozenNavigation, attached.Navigation);
        Assert.Equal(frozenReplayCount, attached.CompletionTrace.Replay.Count);
        Assert.True(attached.ControlTick > completed.ControlTick);
        Assert.NotEqual(completed.NativeGametic, attached.NativeGametic);
        Assert.Equal(completed.Navigation.Pose.NativeGametic, attached.Navigation.Pose.NativeGametic);
    }

    private static BrowserE1M1ContinuationInput Input(
        long gametic,
        double x,
        double y,
        double heading,
        int sector)
        => new()
        {
            ContractVersion = 1,
            SessionId = "session-1",
            RunId = "run-1",
            RunGeneration = 1,
            ExpectedPostComputerRoomControlTick = 41,
            WadContentSha256 = FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
            NativeLevelFactsAvailable = true,
            NativeLevelLoadSequenceAvailable = true,
            NativeLevelLoadSequence = 2,
            NativeGametic = gametic,
            NativeLevelTime = gametic,
            NativeGameState = 0,
            NativeGameEpisode = 1,
            NativeGameMap = 1,
            NativePlayerFactsAvailable = true,
            NativePlayerXFixed = Fixed(x),
            NativePlayerYFixed = Fixed(y),
            NativePlayerAngleBam = Bam(heading),
            NativePlayerSectorIndex = sector,
            NativePlayerVitalityFactsAvailable = true,
            NativePlayerHealth = 100,
            NativePlayerState = 0,
            NativePlayerKillCount = 0,
            ActorSnapshot = Actors(gametic),
            WeaponSnapshot = ReadyWeapon(gametic)
        };

    private static E1M1ContinuationActivationProof Proof()
    {
        var completion = new PostComputerRoomRouteReplayEntry
        {
            ControlTick = 41,
            NativeGametic = 0,
            State = PostComputerRoomRouteState.Complete,
            ReasonCode = "central-hall-entry-confirmed",
            PlayerSectorIndex = 60,
            PlayerX = 2944,
            PlayerY = -3024,
            LegIndex = 8,
            LegId = "central-hall-entry",
            RouteFrames = 40,
            LegFrames = 4
        };
        return new E1M1ContinuationActivationProof
        {
            SessionId = "session-1",
            RunId = "run-1",
            RunGeneration = 1,
            ActivationAtControlTick = 41,
            PostCompletionTrace = new PostComputerRoomCompletionTrace
            {
                Completed = true,
                SessionId = "session-1",
                RunId = "run-1",
                RunGeneration = 1,
                CompletionAtControlTick = 41,
                CompletionCode = "central-hall-entry-confirmed",
                CompletionSnapshot = completion,
                Replay = new[] { completion }
            },
            ActivationPose = new FirstDoorProximityObservation
            {
                InputAccepted = true,
                Available = true,
                Fresh = true,
                WadVerified = true,
                WadContentSha256 = FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
                NativeGametic = 0,
                NativeGameState = 0,
                NativeGameEpisode = 1,
                NativeGameMap = 1,
                PlayerSectorIndex = 60,
                PlayerX = 2944,
                PlayerY = -3024,
                HeadingDegrees = 0,
                PlayerVitalityFactsAvailable = true,
                PlayerHealth = 100,
                PlayerState = 0,
                PlayerKillCount = 0
            }
        };
    }

    private static PostComputerRoomNativeActorSnapshot Actors(
        long gametic,
        params PostComputerRoomNativeActorFact[] actors)
        => new()
        {
            Available = true,
            Gametic = gametic,
            Count = actors.Length,
            Capacity = 64,
            Truncated = false,
            Actors = actors
        };

    private static PostComputerRoomNativeActorFact Actor(
        long identity,
        int type,
        int sector,
        double x,
        double y,
        int health,
        bool lineOfSight)
        => new()
        {
            Identity = identity,
            Type = type,
            SectorIndex = sector,
            XFixed = Fixed(x),
            YFixed = Fixed(y),
            Health = health,
            Flags = MfShootable | MfCountKill,
            LineOfSight = lineOfSight
        };

    private static PostComputerRoomNativeWeaponSnapshot ReadyWeapon(long gametic)
        => new()
        {
            Available = true,
            Gametic = gametic,
            StateCount = 1000,
            ReadyWeapon = 1,
            PendingWeapon = 10,
            WeaponState = 12,
            WeaponReadyState = 12,
            Refire = 0
        };

    private static PostComputerRoomNativeWeaponSnapshot BusyWeapon(long gametic)
        => ReadyWeapon(gametic) with
        {
            WeaponState = 13,
            Refire = 1
        };

    private static BrowserAppliedActionAck Ack(E1M1ContinuationDecision decision)
        => new()
        {
            SessionId = decision.SessionId,
            RunId = decision.RunId,
            RunGeneration = decision.RunGeneration,
            DecisionControlTick = decision.ControlTick,
            UseAttemptId = decision.UseAttemptId,
            ActionMode = FirstDoorBrowserControlSession.ExactActionMode,
            HostPath = FirstDoorBrowserControlSession.NativeActionHostPath,
            ProposedUse = true,
            AppliedUse = true,
            UseResolved = true,
            EventQueued = true,
            QueuedUseInputEventSequence = decision.ControlTick,
            UsePumped = true,
            PumpedUseInputEventSequence = decision.ControlTick,
            ManualUseSequenceAtDecision = decision.ManualUseSequence
        };

    private static long Fixed(double value) => checked((long)Math.Round(value * 65536d));

    private static long Bam(double heading)
    {
        var normalized = ((heading % 360d) + 360d) % 360d;
        return (long)Math.Round(normalized / 360d * 4294967296d) & uint.MaxValue;
    }

    private static void AssertWaypoint(
        E1M1ContinuationWaypoint waypoint,
        int index,
        double x,
        double y,
        params int[] sectors)
    {
        Assert.Equal(index, waypoint.Index);
        Assert.Equal(x, waypoint.X);
        Assert.Equal(y, waypoint.Y);
        Assert.Equal(sectors, waypoint.AllowedSectors);
    }

    private static void AssertNeutral(ActionCommand action)
    {
        Assert.False(action.MoveForward);
        Assert.False(action.MoveBackward);
        Assert.False(action.StrafeLeft);
        Assert.False(action.StrafeRight);
        Assert.Equal(0, action.TurnYaw);
        Assert.False(action.UseKey);
        Assert.False(action.AttackKey);
    }
}
