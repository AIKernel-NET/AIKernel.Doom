namespace AIKernel.Doom.Architecture.Tests;

using AIKernel.Doom.Provider.Autoplay;

public sealed class FirstDoorOpeningRouteGeometryTests
{
    private const string ExpectedGeometryHash
        = "4d1a4942019340582a4f62cbbced3b5f93555e3ed4218f6903006fb9c9795bdd";

    private static readonly Point Spawn = new(1056d, -3616d);

    private static readonly Segment Portal149 = new(
        149,
        new Point(1344d, -2880d),
        new Point(1216d, -2880d));

    private static readonly Segment Portal150 = new(
        150,
        new Point(1472d, -2432d),
        new Point(1472d, -2560d));

    private static readonly Segment DoorFront = new(
        151,
        new Point(1536d, -2432d),
        new Point(1536d, -2560d));

    // Canonical E1M1 blocking LINEDEF fixtures that bound or threaten the
    // frozen opening route. Indices and endpoints come from the verified WAD.
    private static readonly Segment[] BlockingLines =
    [
        new(1, new(1024d, -3680d), new(1024d, -3648d)),
        new(2, new(1088d, -3648d), new(1088d, -3680d)),
        new(3, new(1152d, -3648d), new(1088d, -3648d)),
        new(4, new(1024d, -3648d), new(960d, -3648d)),
        new(21, new(1216d, -3072d), new(1184d, -3072d)),
        new(22, new(1184d, -3072d), new(1184d, -3104d)),
        new(23, new(1184d, -3104d), new(1216d, -3104d)),
        new(24, new(1216d, -3104d), new(1216d, -3072d)),
        new(28, new(1344d, -2880d), new(1344d, -3104d)),
        new(44, new(968d, -2880d), new(1216d, -2880d)),
        new(145, new(1216d, -2880d), new(1248d, -2528d)),
        new(146, new(1384d, -2592d), new(1344d, -2880d)),
        new(147, new(1472d, -2560d), new(1384d, -2592d)),
        new(148, new(1248d, -2528d), new(1472d, -2432d)),
        new(153, new(1536d, -2560d), new(1472d, -2560d)),
        new(154, new(1472d, -2432d), new(1536d, -2432d))
    ];

    private static readonly Barrel[] CanonicalBarrels =
    [
        new(35, new Point(1312d, -3264d)),
        new(36, new Point(1152d, -2912d)),
        new(37, new Point(864d, -3328d)),
        new(48, new Point(2944d, -4320d)),
        new(49, new Point(3184d, -4224d)),
        new(50, new Point(2832d, -4240d))
    ];

    [Fact]
    public void CanonicalPolicy_FreezesRouteRadiiInsetAndGeometryHash()
    {
        var policy = new FirstDoorOpeningNavigationPolicy();

        Assert.Equal(16d, policy.PlayerRadius);
        Assert.Equal(10d, policy.BarrelRadius);
        Assert.Equal(24d, policy.PortalInset);
        Assert.Equal(16d, policy.WaypointCompletionRadius);
        Assert.Equal(24d, policy.MaximumCrossTrackDistance);
        Assert.Equal(16d, policy.MinimumProgressDistance);
        Assert.Equal(4d, policy.AlignmentToleranceDegrees);
        Assert.Equal(0.5d, policy.StationaryMomentumMaximum);
        Assert.Equal(6, policy.DefaultTurnYaw);
        Assert.Equal(12, policy.MaximumTurnYaw);
        Assert.Equal(480, policy.RouteTimeoutFrames);
        Assert.Equal(180, policy.LegTimeoutFrames);
        Assert.Equal(30, policy.MaximumPoseMissingFrames);
        Assert.Equal(30, policy.ProgressWindowForwardSamples);
        Assert.Equal(60, policy.SightlineTimeoutFrames);
        Assert.Equal(2, policy.ForcedStopFrames);
        Assert.Equal(2, policy.MaximumRecoveries);
        Assert.Collection(
            policy.Waypoints,
            waypoint => AssertWaypoint(waypoint, 0, "spawn-north-lane", 1056d, -3008d, 38),
            waypoint => AssertWaypoint(waypoint, 1, "portal-149-south-approach", 1280d, -3008d, 38),
            waypoint => AssertWaypoint(
                waypoint,
                2,
                "portal-149-north-crossing",
                1280d,
                -2848d,
                2,
                portal149: true),
            waypoint => AssertWaypoint(waypoint, 3, "sector-2-corridor-bend", 1280d, -2640d, 2),
            waypoint => AssertWaypoint(
                waypoint,
                4,
                "first-door-sightline",
                1360d,
                -2528d,
                2,
                sightline: true));

        var transition = FirstDoorOpeningNavigator.EvaluateTransition(
            new FirstDoorOpeningNavigationState(),
            InputAt(1, 1, Spawn, heading: 90d, sector: 38),
            policy);

        Assert.Equal(ExpectedGeometryHash, transition.Snapshot.GeometryHash);
        Assert.Equal(policy.PolicyVersion, transition.Snapshot.PolicyVersion);
        Assert.Equal(policy.MaximumCrossTrackDistance,
            transition.Snapshot.MaximumCrossTrackDistance);
        Assert.Equal(policy.AlignmentToleranceDegrees,
            transition.Snapshot.AlignmentToleranceDegrees);
        Assert.Equal(policy.DefaultTurnYaw, transition.Snapshot.DefaultTurnYaw);
        Assert.Equal(policy.MaximumTurnYaw, transition.Snapshot.MaximumTurnYaw);
        Assert.Equal(policy.ForcedStopFrames, transition.Snapshot.ForcedStopFrames);
        Assert.Equal(0, transition.Snapshot.RealignAttemptsForLeg);
        Assert.Equal(0, transition.Snapshot.ForcedStopFramesRemaining);
        Assert.Equal(-1, transition.Snapshot.RecoveryWaypointIndex);
        Assert.Equal(-1, transition.Snapshot.ResumeLegIndex);
        Assert.Equal(FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
            transition.Snapshot.WadContentSha256);
    }

    [Fact]
    public void FrozenRoute_HasAuditedWallAndBarrelClearance()
    {
        var policy = new FirstDoorOpeningNavigationPolicy();
        var route = Route(policy);
        var legs = Legs(route);

        Assert.All(
            legs,
            leg => Assert.DoesNotContain(BlockingLines, wall => Intersects(leg, wall)));

        var minimumWallDistance = legs
            .SelectMany(leg => BlockingLines.Select(wall => SegmentDistance(leg, wall)))
            .Min();
        var minimumBarrelCenterDistance = legs
            .SelectMany(leg => CanonicalBarrels.Select(barrel => PointToSegmentDistance(barrel.Position, leg)))
            .Min();

        Assert.Equal(42.0085861637286d, minimumWallDistance, precision: 8);
        Assert.Equal(96d, minimumBarrelCenterDistance, precision: 8);
        Assert.Equal(26.0085861637286d, minimumWallDistance - policy.PlayerRadius, precision: 8);
        Assert.Equal(
            70d,
            minimumBarrelCenterDistance - policy.PlayerRadius - policy.BarrelRadius,
            precision: 8);
    }

    [Fact]
    public void PortalCrossings_RespectSignedSidesAndTwentyFourUnitInset()
    {
        var policy = new FirstDoorOpeningNavigationPolicy();
        var route = Route(policy);
        var portal149Leg = new Segment(-1, route[2], route[3]);
        var finalSightline = new Segment(-1, route[^1], new Point(1536d, -2528d));

        Assert.True(TryIntersection(portal149Leg, Portal149, out var portal149Crossing));
        Assert.Equal(new Point(1280d, -2880d), portal149Crossing);
        Assert.Equal(64d, EndpointClearance(portal149Crossing, Portal149), precision: 8);
        Assert.True(EndpointClearance(portal149Crossing, Portal149) >= policy.PortalInset);
        Assert.True(route[2].Y - Portal149.A.Y < 0d);
        Assert.True(route[3].Y - Portal149.A.Y >= policy.PortalInset);

        Assert.True(TryIntersection(finalSightline, Portal150, out var portal150Crossing));
        Assert.Equal(new Point(1472d, -2528d), portal150Crossing);
        Assert.Equal(32d, EndpointClearance(portal150Crossing, Portal150), precision: 8);
        Assert.True(EndpointClearance(portal150Crossing, Portal150) >= policy.PortalInset);
        Assert.DoesNotContain(BlockingLines, wall => Intersects(finalSightline, wall));

        Assert.Equal(new[] { 38 }, policy.Waypoints[0].AllowedSectors);
        Assert.Equal(new[] { 38 }, policy.Waypoints[1].AllowedSectors);
        Assert.All(policy.Waypoints.Skip(2), waypoint => Assert.Equal(new[] { 2 }, waypoint.AllowedSectors));
    }

    [Fact]
    public void DirectPortalCenterChords_AreRejectedByCanonicalBlockingLines()
    {
        var spawnToPortal149 = new Segment(-1, Spawn, Midpoint(Portal149));
        var portal149ToPortal150 = new Segment(-1, Midpoint(Portal149), Midpoint(Portal150));
        var prematureDoorChord = new Segment(
            -1,
            new Point(1350d, -2700d),
            DoorFront.B);

        Assert.True(Intersects(spawnToPortal149, Line(23)));
        Assert.True(Intersects(spawnToPortal149, Line(24)));
        Assert.True(Intersects(portal149ToPortal150, Line(146)));
        Assert.True(Intersects(portal149ToPortal150, Line(147)));
        Assert.True(Intersects(prematureDoorChord, Line(146)));
    }

    [Fact]
    public void PortalWaypoint_RequiresAllowedSectorAndNorthInsetBeforeAdvancing()
    {
        var prior = ActiveState(legIndex: 2, nativeGametic: 10);

        var wrongSector = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(11, 11, new Point(1280d, -2848d), heading: 0d, sector: 38));
        Assert.Equal(2, wrongSector.State.LegIndex);
        Assert.False(wrongSector.Snapshot.PortalEvidenceSatisfied);

        var shortOfInset = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(11, 11, new Point(1280d, -2860d), heading: 90d, sector: 2));
        Assert.Equal(2, shortOfInset.State.LegIndex);
        Assert.False(shortOfInset.Snapshot.PortalEvidenceSatisfied);
        Assert.Equal(20d, shortOfInset.Snapshot.Portal149SignedSide, precision: 8);

        var atInclusiveInset = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(11, 11, new Point(1280d, -2856d), heading: 90d, sector: 2));
        Assert.Equal(3, atInclusiveInset.State.LegIndex);
        Assert.True(atInclusiveInset.Snapshot.PortalEvidenceSatisfied);
    }

    [Fact]
    public void FreshDuplicatePose_IsNeutralAndCannotAdvanceNavigationState()
    {
        var prior = ActiveState(legIndex: 0, nativeGametic: 10) with
        {
            ForwardProgressSamples = 7,
            ProgressWindowStartDistance = 608d
        };

        var duplicate = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(11, 10, Spawn, heading: 90d, sector: 38));

        Assert.Equal(prior.LegIndex, duplicate.State.LegIndex);
        Assert.Equal(prior.RouteStartedAtControlTick, duplicate.State.RouteStartedAtControlTick);
        Assert.Equal(prior.LegStartedAtControlTick, duplicate.State.LegStartedAtControlTick);
        Assert.Equal(prior.LastNativeGametic, duplicate.State.LastNativeGametic);
        Assert.Equal(prior.ForwardProgressSamples, duplicate.State.ForwardProgressSamples);
        Assert.Equal(prior.ProgressWindowStartDistance,
            duplicate.State.ProgressWindowStartDistance);
        Assert.Equal(prior.RealignAttemptsForLeg, duplicate.State.RealignAttemptsForLeg);
        Assert.Equal(prior.ForcedStopFramesRemaining,
            duplicate.State.ForcedStopFramesRemaining);
        Assert.Equal(1, duplicate.State.PoseMissingFrames);
        Assert.Equal(FirstDoorOpeningNavigationStatus.WaitingForPose, duplicate.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.DuplicatePose, duplicate.Snapshot.BlockCode);
        Assert.Equal(7, duplicate.Snapshot.ForwardProgressSamples);
        AssertNeutral(duplicate.Action);
    }

    [Fact]
    public void DuplicatePose_ConsumesFreshnessBudgetExactlyWithoutAdvancingNavigation()
    {
        var prior = ActiveState(legIndex: 1, nativeGametic: 10) with
        {
            LegStartedAtControlTick = 5,
            PoseMissingFrames = 28,
            ForwardProgressSamples = 7,
            ProgressWindowStartDistance = 224d,
            RealignAttemptsForLeg = 1
        };

        var atTwentyNine = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(11, 10, new Point(1080d, -3008d), heading: 0d, sector: 38));

        Assert.Equal(29, atTwentyNine.State.PoseMissingFrames);
        Assert.Equal(prior.LegIndex, atTwentyNine.State.LegIndex);
        Assert.Equal(prior.LegStartedAtControlTick,
            atTwentyNine.State.LegStartedAtControlTick);
        Assert.Equal(prior.LastNativeGametic, atTwentyNine.State.LastNativeGametic);
        Assert.Equal(prior.ForwardProgressSamples,
            atTwentyNine.State.ForwardProgressSamples);
        Assert.Equal(prior.ProgressWindowStartDistance,
            atTwentyNine.State.ProgressWindowStartDistance);
        Assert.Equal(prior.RealignAttemptsForLeg,
            atTwentyNine.State.RealignAttemptsForLeg);
        Assert.Equal(prior.RealignAttemptsForLeg,
            atTwentyNine.Snapshot.RealignAttemptsForLeg);
        Assert.Equal(prior.ForcedStopFramesRemaining,
            atTwentyNine.Snapshot.ForcedStopFramesRemaining);
        Assert.Equal(prior.RecoveryWaypointIndex,
            atTwentyNine.Snapshot.RecoveryWaypointIndex);
        Assert.Equal(prior.ResumeLegIndex, atTwentyNine.Snapshot.ResumeLegIndex);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.DuplicatePose,
            atTwentyNine.Snapshot.BlockCode);
        AssertNeutral(atTwentyNine.Action);

        var atThirty = FirstDoorOpeningNavigator.EvaluateTransition(
            atTwentyNine.State,
            InputAt(12, 10, new Point(1056d, -3008d), heading: 90d, sector: 38));

        Assert.Equal(30, atThirty.State.PoseMissingFrames);
        Assert.Equal(prior.LegIndex, atThirty.State.LegIndex);
        Assert.Equal(prior.LegStartedAtControlTick, atThirty.State.LegStartedAtControlTick);
        Assert.Equal(prior.LastNativeGametic, atThirty.State.LastNativeGametic);
        Assert.Equal(prior.ForwardProgressSamples, atThirty.State.ForwardProgressSamples);
        Assert.Equal(prior.ProgressWindowStartDistance,
            atThirty.State.ProgressWindowStartDistance);
        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, atThirty.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.PoseMissingBudgetExhausted,
            atThirty.Snapshot.BlockCode);
        Assert.Equal("opening-navigation-pose-missing-budget-exhausted",
            atThirty.Snapshot.FailureCode);
        AssertNeutral(atThirty.Action);
    }

    [Fact]
    public void ControlReadyMissingPose_StartsTheFiniteRouteBudgetImmediately()
    {
        var availableShape = InputAt(100, 100, Spawn, heading: 90d, sector: 38);
        var waiting = FirstDoorOpeningNavigator.EvaluateTransition(
            new FirstDoorOpeningNavigationState(),
            availableShape with
            {
                Proximity = availableShape.Proximity with
                {
                    Available = false,
                    Fresh = false
                }
            });

        Assert.True(waiting.State.Active);
        Assert.Equal(100, waiting.State.RouteStartedAtControlTick);
        Assert.Equal(100, waiting.State.LegStartedAtControlTick);
        Assert.Equal(-1, waiting.State.LastNativeGametic);
        Assert.Equal(1, waiting.State.PoseMissingFrames);
        Assert.Equal(FirstDoorOpeningNavigationStatus.WaitingForPose, waiting.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.ProximityUnavailable,
            waiting.Snapshot.BlockCode);
        Assert.Equal(0, waiting.Snapshot.RouteFrames);
        AssertNeutral(waiting.Action);
    }

    [Fact]
    public void DuplicatePoseAtRouteDeadline_FailsInsteadOfExtendingTheRouteBudget()
    {
        var expired = FirstDoorOpeningNavigator.EvaluateTransition(
            ActiveState(legIndex: 0, nativeGametic: 10) with
            {
                RouteStartedAtControlTick = 0,
                LegStartedAtControlTick = 400
            },
            InputAt(480, 10, Spawn, heading: 90d, sector: 38));

        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, expired.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.RouteBudgetExhausted,
            expired.Snapshot.BlockCode);
        Assert.Equal("opening-navigation-route-budget-exhausted", expired.Snapshot.FailureCode);
        AssertNeutral(expired.Action);
    }

    [Fact]
    public void SignedBearingWrap_ChoosesShortestTurnOnlyDirection()
    {
        var policy = new FirstDoorOpeningNavigationPolicy();
        var priorWaypoint = new Point(policy.Waypoints[0].X, policy.Waypoints[0].Y);
        var recovering = ActiveState(legIndex: 1, nativeGametic: 10) with
        {
            ReturningToCertifiedWaypoint = true,
            RecoveryWaypointIndex = 0,
            ResumeLegIndex = 1,
            RecoveryCount = 1
        };

        var wrappedNegative = FirstDoorOpeningNavigator.EvaluateTransition(
            recovering,
            InputAt(
                11,
                11,
                PlayerForTargetBearing(priorWaypoint, bearingDegrees: 10d, distance: 100d),
                heading: 350d,
                sector: 38));
        var wrappedPositive = FirstDoorOpeningNavigator.EvaluateTransition(
            recovering,
            InputAt(
                11,
                11,
                PlayerForTargetBearing(priorWaypoint, bearingDegrees: 350d, distance: 100d),
                heading: 10d,
                sector: 38));

        Assert.Equal(-20d, wrappedNegative.Snapshot.BearingErrorDegrees, precision: 8);
        AssertTurnOnly(wrappedNegative.Action, -policy.DefaultTurnYaw);
        Assert.Equal(20d, wrappedPositive.Snapshot.BearingErrorDegrees, precision: 8);
        AssertTurnOnly(wrappedPositive.Action, policy.DefaultTurnYaw);
    }

    [Fact]
    public void CrossTrackDivergence_ReaimsThenRecoversOrFailsWithinBoundedPolicy()
    {
        var policy = new FirstDoorOpeningNavigationPolicy();
        var deviatedLeg1Point = new Point(1200d, -3033d);
        var first = FirstDoorOpeningNavigator.EvaluateTransition(
            ActiveState(legIndex: 1, nativeGametic: 10),
            InputAt(11, 11, deviatedLeg1Point, heading: 0d, sector: 38));

        Assert.Equal(25d, first.Snapshot.CrossTrackDistance, precision: 8);
        Assert.Equal(FirstDoorOpeningNavigationStatus.Realigning, first.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.CrossTrackExceeded, first.Snapshot.BlockCode);
        Assert.Equal(1, first.State.RealignAttemptsForLeg);
        Assert.Equal(policy.ForcedStopFrames, first.State.ForcedStopFramesRemaining);
        AssertNeutral(first.Action);

        var stop1 = FirstDoorOpeningNavigator.EvaluateTransition(
            first.State,
            InputAt(12, 12, deviatedLeg1Point, heading: 0d, sector: 38));
        var stop2 = FirstDoorOpeningNavigator.EvaluateTransition(
            stop1.State,
            InputAt(13, 13, deviatedLeg1Point, heading: 0d, sector: 38));
        AssertNeutral(stop1.Action);
        AssertNeutral(stop2.Action);

        var recovery = FirstDoorOpeningNavigator.EvaluateTransition(
            stop2.State,
            InputAt(14, 14, deviatedLeg1Point, heading: 0d, sector: 38));

        Assert.True(recovery.State.ReturningToCertifiedWaypoint);
        Assert.Equal(0, recovery.State.RecoveryWaypointIndex);
        Assert.Equal(1, recovery.State.ResumeLegIndex);
        Assert.Equal(1, recovery.State.RecoveryCount);
        Assert.True(recovery.State.RecoveryCount <= policy.MaximumRecoveries);
        Assert.Equal(policy.Waypoints[0].X, recovery.Snapshot.TargetX);
        Assert.Equal(policy.Waypoints[0].Y, recovery.Snapshot.TargetY);
        Assert.Equal(FirstDoorOpeningNavigationStatus.ReturningToCertifiedWaypoint,
            recovery.Snapshot.Status);
        AssertSafeNavigationAction(recovery.Action);

        var exhausted = FirstDoorOpeningNavigator.EvaluateTransition(
            ActiveState(legIndex: 1, nativeGametic: 10) with
            {
                RealignAttemptsForLeg = 1,
                RecoveryCount = policy.MaximumRecoveries
            },
            InputAt(11, 11, deviatedLeg1Point, heading: 0d, sector: 38));

        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, exhausted.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.RecoveryBudgetExhausted,
            exhausted.Snapshot.BlockCode);
        Assert.Equal(policy.MaximumRecoveries, exhausted.State.RecoveryCount);
        AssertNeutral(exhausted.Action);

        var deviatedLeg0Point = new Point(1081d, -3300d);
        var leg0First = FirstDoorOpeningNavigator.EvaluateTransition(
            ActiveState(legIndex: 0, nativeGametic: 10),
            InputAt(11, 11, deviatedLeg0Point, heading: 90d, sector: 38));
        var leg0Stop1 = FirstDoorOpeningNavigator.EvaluateTransition(
            leg0First.State,
            InputAt(12, 12, deviatedLeg0Point, heading: 90d, sector: 38));
        var leg0Stop2 = FirstDoorOpeningNavigator.EvaluateTransition(
            leg0Stop1.State,
            InputAt(13, 13, deviatedLeg0Point, heading: 90d, sector: 38));
        var leg0Failed = FirstDoorOpeningNavigator.EvaluateTransition(
            leg0Stop2.State,
            InputAt(14, 14, deviatedLeg0Point, heading: 90d, sector: 38));

        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, leg0Failed.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.CrossTrackExceeded,
            leg0Failed.Snapshot.BlockCode);
        Assert.Equal(0, leg0Failed.State.RecoveryCount);
        AssertNeutral(leg0Failed.Action);
    }

    [Fact]
    public void FirstReaim_PreservesOriginalLegDeadline()
    {
        var prior = ActiveState(legIndex: 1, nativeGametic: 198) with
        {
            RouteStartedAtControlTick = 100,
            LegStartedAtControlTick = 20,
            ForwardProgressSamples = 7,
            ProgressWindowStartDistance = 224d
        };
        var reaim = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(199, 199, new Point(1200d, -3033d), heading: 0d, sector: 38));

        Assert.Equal(179, reaim.Snapshot.LegFrames);
        Assert.Equal(FirstDoorOpeningNavigationStatus.Realigning, reaim.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.CrossTrackExceeded,
            reaim.Snapshot.BlockCode);
        Assert.Equal(1, reaim.State.RealignAttemptsForLeg);
        Assert.Equal(20, reaim.State.LegStartedAtControlTick);
        Assert.Equal(2, reaim.State.ForcedStopFramesRemaining);
        Assert.Equal(1, reaim.Snapshot.RealignAttemptsForLeg);
        Assert.Equal(2, reaim.Snapshot.ForcedStopFramesRemaining);
        Assert.Equal(0, reaim.State.ForwardProgressSamples);
        Assert.Equal(0d, reaim.State.ProgressWindowStartDistance);
        AssertNeutral(reaim.Action);
    }

    [Fact]
    public void StalledProgressWindow_StopsOnceThenUsesBoundedRecoveryWithoutBlindBackoff()
    {
        var stalledPoint = new Point(1080d, -3008d);
        var state = ActiveState(legIndex: 1, nativeGametic: 0);

        for (var tick = 1; tick < 30; tick++)
        {
            var forward = FirstDoorOpeningNavigator.EvaluateTransition(
                state,
                InputAt(tick, tick, stalledPoint, heading: 0d, sector: 38));
            AssertForwardOnly(forward.Action);
            Assert.Equal(tick, forward.State.ForwardProgressSamples);
            state = forward.State;
        }

        var firstStall = FirstDoorOpeningNavigator.EvaluateTransition(
            state,
            InputAt(30, 30, stalledPoint, heading: 0d, sector: 38));
        Assert.Equal(FirstDoorOpeningNavigationStatus.Realigning, firstStall.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.StallDetected, firstStall.Snapshot.BlockCode);
        Assert.Equal(1, firstStall.State.RealignAttemptsForLeg);
        Assert.Equal(0, firstStall.State.ForwardProgressSamples);
        AssertNeutral(firstStall.Action);

        var stop1 = FirstDoorOpeningNavigator.EvaluateTransition(
            firstStall.State,
            InputAt(31, 31, stalledPoint, heading: 0d, sector: 38));
        var stop2 = FirstDoorOpeningNavigator.EvaluateTransition(
            stop1.State,
            InputAt(32, 32, stalledPoint, heading: 0d, sector: 38));
        AssertNeutral(stop1.Action);
        AssertNeutral(stop2.Action);
        state = stop2.State;

        for (var tick = 33; tick < 62; tick++)
        {
            var forward = FirstDoorOpeningNavigator.EvaluateTransition(
                state,
                InputAt(tick, tick, stalledPoint, heading: 0d, sector: 38));
            AssertForwardOnly(forward.Action);
            state = forward.State;
        }

        var repeatedStall = FirstDoorOpeningNavigator.EvaluateTransition(
            state,
            InputAt(62, 62, stalledPoint, heading: 0d, sector: 38));

        Assert.True(repeatedStall.State.ReturningToCertifiedWaypoint);
        Assert.Equal(1, repeatedStall.State.RecoveryCount);
        Assert.Equal(FirstDoorOpeningNavigationStatus.ReturningToCertifiedWaypoint,
            repeatedStall.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.RecoveryInProgress,
            repeatedStall.Snapshot.BlockCode);
        AssertSafeNavigationAction(repeatedStall.Action);
    }

    [Fact]
    public void RouteDeadline_ValidFinalObservationWinsAtInclusiveBoundary()
    {
        var prior = ActiveState(legIndex: 4, nativeGametic: 479) with
        {
            DoorSightlineCertified = true,
            RouteStartedAtControlTick = 0,
            LegStartedAtControlTick = 400,
            SightlineStartedAtControlTick = 479,
            SightlineFrames = 1
        };
        var finalObservation = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(
                480,
                480,
                new Point(1360d, -2528d),
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d));

        Assert.Equal(FirstDoorOpeningNavigationStatus.ReadyForAcquisition,
            finalObservation.Snapshot.Status);
        Assert.True(finalObservation.Snapshot.ReadyForAcquisition);
        AssertNeutral(finalObservation.Action);
    }

    [Fact]
    public void RouteDeadline_ValidObservationOnNextTickFails()
    {
        var prior = ActiveState(legIndex: 4, nativeGametic: 480) with
        {
            DoorSightlineCertified = true,
            RouteStartedAtControlTick = 0,
            LegStartedAtControlTick = 400,
            SightlineStartedAtControlTick = 480,
            SightlineFrames = 1
        };
        var expired = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(
                481,
                481,
                new Point(1360d, -2528d),
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d));

        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, expired.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.RouteBudgetExhausted,
            expired.Snapshot.BlockCode);
        AssertNeutral(expired.Action);
    }

    [Fact]
    public void RouteDeadline_FreshButIncompleteObservationAtInclusiveBoundaryFails()
    {
        var prior = ActiveState(legIndex: 4, nativeGametic: 479) with
        {
            DoorSightlineCertified = true,
            RouteStartedAtControlTick = 0,
            LegStartedAtControlTick = 400,
            SightlineStartedAtControlTick = 479,
            SightlineFrames = 1
        };
        var incomplete = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(
                480,
                480,
                new Point(1360d, -2528d),
                heading: 0d,
                sector: 2,
                acquisitionReady: false,
                doorBearingError: 0d));

        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, incomplete.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.RouteBudgetExhausted,
            incomplete.Snapshot.BlockCode);
        AssertNeutral(incomplete.Action);
    }

    [Fact]
    public void LegDeadline_ValidFinalObservationWinsAtInclusiveBoundary()
    {
        var prior = ActiveState(legIndex: 0, nativeGametic: 199) with
        {
            RouteStartedAtControlTick = 100,
            LegStartedAtControlTick = 20,
            RealignAttemptsForLeg = 1
        };
        var finalObservation = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(200, 200, new Point(1056d, -3008d), heading: 90d, sector: 38));

        Assert.False(finalObservation.State.Failed);
        Assert.Equal(1, finalObservation.State.LegIndex);
        Assert.Equal(200, finalObservation.State.LegStartedAtControlTick);
        Assert.Equal(0, finalObservation.Snapshot.LegFrames);
        AssertSafeNavigationAction(finalObservation.Action);
    }

    [Fact]
    public void LegDeadline_ValidObservationOnNextTickFails()
    {
        var prior = ActiveState(legIndex: 0, nativeGametic: 200) with
        {
            RouteStartedAtControlTick = 100,
            LegStartedAtControlTick = 20,
            RealignAttemptsForLeg = 1
        };
        var expired = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(201, 201, new Point(1056d, -3008d), heading: 90d, sector: 38));

        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, expired.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.LegBudgetExhausted,
            expired.Snapshot.BlockCode);
        AssertNeutral(expired.Action);
    }

    [Fact]
    public void SightlineDeadline_ValidFinalObservationWinsAtInclusiveBoundary()
    {
        var prior = ActiveState(legIndex: 4, nativeGametic: 199) with
        {
            DoorSightlineCertified = true,
            RouteStartedAtControlTick = 100,
            LegStartedAtControlTick = 100,
            SightlineStartedAtControlTick = 141,
            SightlineFrames = 59
        };
        var finalObservation = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(
                200,
                200,
                new Point(1360d, -2528d),
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d));

        Assert.Equal(FirstDoorOpeningNavigationStatus.ReadyForAcquisition,
            finalObservation.Snapshot.Status);
        Assert.Equal(60, finalObservation.Snapshot.SightlineFrames);
        Assert.True(finalObservation.Snapshot.ReadyForAcquisition);
        AssertNeutral(finalObservation.Action);
    }

    [Fact]
    public void SightlineDeadline_ValidObservationOnNextTickFails()
    {
        var prior = ActiveState(legIndex: 4, nativeGametic: 200) with
        {
            DoorSightlineCertified = true,
            RouteStartedAtControlTick = 100,
            LegStartedAtControlTick = 100,
            SightlineStartedAtControlTick = 141,
            SightlineFrames = 60
        };
        var expired = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(
                201,
                201,
                new Point(1360d, -2528d),
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d));

        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, expired.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.SightlineBudgetExhausted,
            expired.Snapshot.BlockCode);
        AssertNeutral(expired.Action);
    }

    [Fact]
    public void SightlineDeadline_IsCumulativeAcrossDriftAndRecertification()
    {
        var prior = ActiveState(legIndex: 4, nativeGametic: 110) with
        {
            DoorSightlineCertified = true,
            SightlineStartedAtControlTick = 53,
            SightlineFrames = 58
        };
        var drifted = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(
                111,
                111,
                new Point(1340d, -2556d),
                heading: 54d,
                sector: 2,
                acquisitionReady: false,
                doorBearingError: 0d));

        Assert.False(drifted.State.DoorSightlineCertified);
        Assert.Equal(59, drifted.State.SightlineFrames);
        Assert.Equal(59, drifted.Snapshot.SightlineFrames);
        AssertSafeNavigationAction(drifted.Action);

        var inclusiveReady = FirstDoorOpeningNavigator.EvaluateTransition(
            drifted.State,
            InputAt(
                112,
                112,
                new Point(1360d, -2528d),
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d));

        Assert.True(inclusiveReady.State.DoorSightlineCertified);
        Assert.Equal(60, inclusiveReady.State.SightlineFrames);
        Assert.Equal(FirstDoorOpeningNavigationStatus.ReadyForAcquisition,
            inclusiveReady.Snapshot.Status);
        Assert.True(inclusiveReady.Snapshot.ReadyForAcquisition);
        AssertNeutral(inclusiveReady.Action);

        var recertification = FirstDoorOpeningNavigator.EvaluateTransition(
            drifted.State,
            InputAt(
                112,
                112,
                new Point(1360d, -2528d),
                heading: 0d,
                sector: 2,
                acquisitionReady: false,
                doorBearingError: 0d));

        Assert.Equal(60, recertification.State.SightlineFrames);
        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed,
            recertification.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.SightlineBudgetExhausted,
            recertification.Snapshot.BlockCode);
        Assert.Equal("opening-navigation-sightline-budget-exhausted",
            recertification.Snapshot.FailureCode);
        AssertNeutral(recertification.Action);
    }

    [Fact]
    public void SightlineDeadline_DuplicatePoseConsumesControlFrameBudget()
    {
        var prior = ActiveState(legIndex: 4, nativeGametic: 10) with
        {
            DoorSightlineCertified = true,
            SightlineStartedAtControlTick = 1,
            SightlineFrames = 58
        };
        var duplicateAtFiftyNine = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(
                59,
                10,
                new Point(1360d, -2528d),
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d));

        Assert.Equal(59, duplicateAtFiftyNine.State.SightlineFrames);
        Assert.Equal(FirstDoorOpeningNavigationStatus.WaitingForPose,
            duplicateAtFiftyNine.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.DuplicatePose,
            duplicateAtFiftyNine.Snapshot.BlockCode);
        AssertNeutral(duplicateAtFiftyNine.Action);

        var duplicateAtSixty = FirstDoorOpeningNavigator.EvaluateTransition(
            duplicateAtFiftyNine.State,
            InputAt(
                60,
                10,
                new Point(1360d, -2528d),
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d));

        Assert.Equal(60, duplicateAtSixty.State.SightlineFrames);
        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed,
            duplicateAtSixty.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.SightlineBudgetExhausted,
            duplicateAtSixty.Snapshot.BlockCode);
        AssertNeutral(duplicateAtSixty.Action);
    }

    [Fact]
    public void SightlineRepositionStall_ConsumesForcedStopsBeforeRecovery()
    {
        var point = new Point(1340d, -2556d);
        var state = ActiveState(legIndex: 4, nativeGametic: 1) with
        {
            DoorSightlineCertified = true,
            SightlineStartedAtControlTick = 1,
            SightlineFrames = 1
        };
        FirstDoorOpeningNavigationTransition transition = null!;
        for (var tick = 2; tick <= 31; tick++)
        {
            transition = FirstDoorOpeningNavigator.EvaluateTransition(
                state,
                InputAt(tick, tick, point, heading: 54d, sector: 2));
            state = transition.State;
        }

        Assert.Equal(FirstDoorOpeningNavigationStatus.Realigning, transition.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.StallDetected,
            transition.Snapshot.BlockCode);
        Assert.Equal(2, transition.State.ForcedStopFramesRemaining);
        AssertNeutral(transition.Action);

        var stop1 = FirstDoorOpeningNavigator.EvaluateTransition(
            transition.State,
            InputAt(32, 32, point, heading: 54d, sector: 2));
        var stop2 = FirstDoorOpeningNavigator.EvaluateTransition(
            stop1.State,
            InputAt(33, 33, point, heading: 54d, sector: 2));

        Assert.Equal(1, stop1.State.ForcedStopFramesRemaining);
        Assert.Equal(0, stop2.State.ForcedStopFramesRemaining);
        AssertNeutral(stop1.Action);
        AssertNeutral(stop2.Action);
        Assert.Equal(33, stop2.State.SightlineFrames);
    }

    [Fact]
    public void PoseMissingBudgetAndRewind_FailExactlyAndRemainAbsorbing()
    {
        var missingInput = InputAt(11, 11, Spawn, heading: 90d, sector: 38) with
        {
            Proximity = InputAt(11, 11, Spawn, heading: 90d, sector: 38).Proximity with
            {
                Available = false,
                Fresh = false
            }
        };
        var atTwentyNine = FirstDoorOpeningNavigator.EvaluateTransition(
            ActiveState(legIndex: 0, nativeGametic: 10) with { PoseMissingFrames = 28 },
            missingInput);

        Assert.Equal(29, atTwentyNine.State.PoseMissingFrames);
        Assert.Equal(FirstDoorOpeningNavigationStatus.WaitingForPose,
            atTwentyNine.Snapshot.Status);
        AssertNeutral(atTwentyNine.Action);

        var atThirty = FirstDoorOpeningNavigator.EvaluateTransition(
            atTwentyNine.State,
            missingInput with
            {
                ControlTick = 12,
                Proximity = missingInput.Proximity with { NativeGametic = 12 }
            });
        Assert.Equal(30, atThirty.State.PoseMissingFrames);
        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, atThirty.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.PoseMissingBudgetExhausted,
            atThirty.Snapshot.BlockCode);
        AssertNeutral(atThirty.Action);

        var rewind = FirstDoorOpeningNavigator.EvaluateTransition(
            ActiveState(legIndex: 0, nativeGametic: 10),
            InputAt(11, 9, Spawn, heading: 90d, sector: 38));
        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, rewind.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.PoseRewind, rewind.Snapshot.BlockCode);
        Assert.Equal("opening-navigation-pose-rewind", rewind.Snapshot.FailureCode);
        AssertNeutral(rewind.Action);

        var absorbing = FirstDoorOpeningNavigator.EvaluateTransition(
            rewind.State,
            InputAt(
                12,
                12,
                new Point(1360d, -2528d),
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d));

        Assert.Equal(rewind.State, absorbing.State);
        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, absorbing.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.PoseRewind, absorbing.Snapshot.BlockCode);
        Assert.Equal("opening-navigation-pose-rewind", absorbing.Snapshot.FailureCode);
        AssertNeutral(absorbing.Action);
    }

    [Fact]
    public void RecoveryCompletion_ReprovesPortalSectorAndInset()
    {
        var recovering = ActiveState(legIndex: 3, nativeGametic: 10) with
        {
            ReturningToCertifiedWaypoint = true,
            RecoveryWaypointIndex = 2,
            ResumeLegIndex = 3,
            RecoveryCount = 1
        };

        var topologyBypass = FirstDoorOpeningNavigator.EvaluateTransition(
            recovering,
            InputAt(11, 11, new Point(1280d, -2860d), heading: 90d, sector: 38));

        Assert.True(topologyBypass.State.ReturningToCertifiedWaypoint);
        Assert.Equal(2, topologyBypass.State.RecoveryWaypointIndex);
        Assert.Equal(3, topologyBypass.State.ResumeLegIndex);
        Assert.Equal(FirstDoorOpeningNavigationStatus.ReturningToCertifiedWaypoint,
            topologyBypass.Snapshot.Status);
        Assert.False(topologyBypass.Snapshot.PortalEvidenceSatisfied);

        var recertified = FirstDoorOpeningNavigator.EvaluateTransition(
            recovering,
            InputAt(11, 11, new Point(1280d, -2856d), heading: 90d, sector: 2));

        Assert.False(recertified.State.ReturningToCertifiedWaypoint);
        Assert.Equal(-1, recertified.State.RecoveryWaypointIndex);
        Assert.Equal(-1, recertified.State.ResumeLegIndex);
        Assert.Equal(3, recertified.State.LegIndex);
        Assert.True(recertified.Snapshot.PortalEvidenceSatisfied);
    }

    [Fact]
    public void RecoveryDeadline_ValidWaypointWinsOnlyAtInclusiveBoundary()
    {
        var recovering = ActiveState(legIndex: 1, nativeGametic: 199) with
        {
            RouteStartedAtControlTick = 100,
            LegStartedAtControlTick = 20,
            ReturningToCertifiedWaypoint = true,
            RecoveryWaypointIndex = 0,
            ResumeLegIndex = 1,
            RecoveryCount = 1
        };
        var recovered = FirstDoorOpeningNavigator.EvaluateTransition(
            recovering,
            InputAt(200, 200, new Point(1056d, -3008d), heading: 0d, sector: 38));

        Assert.False(recovered.State.Failed);
        Assert.False(recovered.State.ReturningToCertifiedWaypoint);
        Assert.Equal(-1, recovered.State.RecoveryWaypointIndex);
        Assert.Equal(-1, recovered.State.ResumeLegIndex);
        Assert.Equal(1, recovered.State.LegIndex);
        Assert.Equal(200, recovered.State.LegStartedAtControlTick);
        Assert.Equal(0, recovered.Snapshot.LegFrames);
        AssertSafeNavigationAction(recovered.Action);

        var late = FirstDoorOpeningNavigator.EvaluateTransition(
            recovering with { LastNativeGametic = 200 },
            InputAt(201, 201, new Point(1056d, -3008d), heading: 0d, sector: 38));

        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, late.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.RecoveryBudgetExhausted,
            late.Snapshot.BlockCode);
        Assert.Equal("opening-navigation-recovery-leg-budget-exhausted",
            late.Snapshot.FailureCode);
        Assert.True(late.State.ReturningToCertifiedWaypoint);
        Assert.Equal(0, late.State.RecoveryWaypointIndex);
        Assert.Equal(1, late.State.ResumeLegIndex);
        Assert.Equal(0, late.Snapshot.RecoveryWaypointIndex);
        Assert.Equal(1, late.Snapshot.ResumeLegIndex);
        Assert.Equal(0, late.Snapshot.LegIndex);
        Assert.Equal("spawn-north-lane", late.Snapshot.LegId);
        Assert.Equal(1056d, late.Snapshot.LegStartX);
        Assert.Equal(-3616d, late.Snapshot.LegStartY);
        Assert.Equal(1056d, late.Snapshot.TargetX);
        Assert.Equal(-3008d, late.Snapshot.TargetY);
        AssertNeutral(late.Action);
    }

    [Fact]
    public void RecoveryReplay_ProjectsTheEffectiveRecoveryLegGeometry()
    {
        var recovering = ActiveState(legIndex: 4, nativeGametic: 10) with
        {
            ReturningToCertifiedWaypoint = true,
            RecoveryWaypointIndex = 3,
            ResumeLegIndex = 4,
            RecoveryCount = 1
        };
        var transition = FirstDoorOpeningNavigator.EvaluateTransition(
            recovering,
            InputAt(11, 11, new Point(1280d, -2700d), heading: 90d, sector: 2));

        Assert.True(transition.State.ReturningToCertifiedWaypoint);
        Assert.Equal(3, transition.Snapshot.LegIndex);
        Assert.Equal("sector-2-corridor-bend", transition.Snapshot.LegId);
        Assert.Equal(1280d, transition.Snapshot.LegStartX);
        Assert.Equal(-2848d, transition.Snapshot.LegStartY);
        Assert.Equal(1280d, transition.Snapshot.TargetX);
        Assert.Equal(-2640d, transition.Snapshot.TargetY);
        Assert.Equal(148d, transition.Snapshot.AlongTrackDistance, precision: 8);
        Assert.Equal(0d, transition.Snapshot.CrossTrackDistance, precision: 8);
        Assert.Equal(3, transition.Snapshot.RecoveryWaypointIndex);
        Assert.Equal(4, transition.Snapshot.ResumeLegIndex);
        AssertSafeNavigationAction(transition.Action);
    }

    [Fact]
    public void MutatedRouteOrTopologyPolicy_FailsClosed()
    {
        var policy = new FirstDoorOpeningNavigationPolicy();
        var movedRoute = policy.Waypoints.ToArray();
        movedRoute[0] = movedRoute[0] with { X = movedRoute[0].X + 1d };
        var moved = FirstDoorOpeningNavigator.EvaluateTransition(
            new FirstDoorOpeningNavigationState(),
            InputAt(1, 1, Spawn, heading: 90d, sector: 38),
            policy with { Waypoints = movedRoute });

        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, moved.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.InvalidPolicy, moved.Snapshot.BlockCode);
        Assert.Equal("opening-navigation-waypoint-mismatch:0", moved.Snapshot.FailureCode);
        AssertNeutral(moved.Action);

        var changedTopology = policy.Waypoints.ToArray();
        changedTopology[2] = changedTopology[2] with
        {
            AllowedSectors = new[] { 38 },
            RequiresPortal149NorthSide = false
        };
        var topology = FirstDoorOpeningNavigator.EvaluateTransition(
            new FirstDoorOpeningNavigationState(),
            InputAt(1, 1, Spawn, heading: 90d, sector: 38),
            policy with { Waypoints = changedTopology });

        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, topology.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.InvalidPolicy, topology.Snapshot.BlockCode);
        Assert.Equal("opening-navigation-waypoint-mismatch:2", topology.Snapshot.FailureCode);
        AssertNeutral(topology.Action);
    }

    [Fact]
    public void MalformedInactiveAndNonFiniteState_FailClosed()
    {
        var inactiveResidue = FirstDoorOpeningNavigator.EvaluateTransition(
            new FirstDoorOpeningNavigationState
            {
                Active = false,
                LegIndex = 1,
                ForwardProgressSamples = 1,
                ProgressWindowStartDistance = 224d
            },
            InputAt(1, 1, Spawn, heading: 90d, sector: 38));

        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed,
            inactiveResidue.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.InvalidState,
            inactiveResidue.Snapshot.BlockCode);
        Assert.Equal("opening-navigation-inactive-state-not-canonical",
            inactiveResidue.Snapshot.FailureCode);
        AssertNeutral(inactiveResidue.Action);

        foreach (var nonFinite in new[] { double.NaN, double.PositiveInfinity, double.NegativeInfinity })
        {
            var invalid = FirstDoorOpeningNavigator.EvaluateTransition(
                ActiveState(legIndex: 1, nativeGametic: 0) with
                {
                    ProgressWindowStartDistance = nonFinite
                },
                InputAt(1, 1, new Point(1080d, -3008d), heading: 0d, sector: 38));

            Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, invalid.Snapshot.Status);
            Assert.Equal(FirstDoorOpeningNavigationBlockCode.InvalidState,
                invalid.Snapshot.BlockCode);
            Assert.Equal("opening-navigation-state-out-of-range", invalid.Snapshot.FailureCode);
            AssertNeutral(invalid.Action);
        }
    }

    [Fact]
    public void NonFiniteNativePose_FailsClosedBeforeAnyNavigationAction()
    {
        var input = InputAt(1, 1, Spawn, heading: 90d, sector: 38);
        var invalid = FirstDoorOpeningNavigator.EvaluateTransition(
            new FirstDoorOpeningNavigationState(),
            input with
            {
                Proximity = input.Proximity with { PlayerX = double.NaN }
            });

        Assert.True(invalid.State.Active);
        Assert.Equal(FirstDoorOpeningNavigationStatus.Failed, invalid.Snapshot.Status);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.InvalidState,
            invalid.Snapshot.BlockCode);
        Assert.Equal("opening-navigation-nonfinite-proximity", invalid.Snapshot.FailureCode);
        AssertNeutral(invalid.Action);
    }

    [Fact]
    public void FinalSightline_RejectsPortal150CrossingOutsideInset()
    {
        var prior = ActiveState(legIndex: 4, nativeGametic: 10);

        var belowInset = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(
                11,
                11,
                new Point(1360d, -2544d),
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d));

        Assert.False(belowInset.State.DoorSightlineCertified);
        Assert.False(belowInset.Snapshot.Portal150EvidenceSatisfied);
        Assert.Equal(-2544d, belowInset.Snapshot.Portal150IntersectionY, precision: 8);
        Assert.False(belowInset.Snapshot.ReadyForAcquisition);

        var inclusiveInset = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(
                11,
                11,
                new Point(1360d, -2536d),
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d));

        Assert.True(inclusiveInset.State.DoorSightlineCertified);
        Assert.True(inclusiveInset.Snapshot.Portal150EvidenceSatisfied);
        Assert.Equal(-2536d, inclusiveInset.Snapshot.Portal150IntersectionY, precision: 8);
        Assert.True(inclusiveInset.Snapshot.ReadyForAcquisition);
    }

    [Fact]
    public void FinalSightline_RequiresInclusiveStationaryMomentumProof()
    {
        var prior = ActiveState(legIndex: 4, nativeGametic: 10);
        var sightlinePoint = new Point(1360d, -2528d);

        var moving = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(
                11,
                11,
                sightlinePoint,
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d,
                momentumX: 0.5001d));

        Assert.True(moving.State.DoorSightlineCertified);
        Assert.False(moving.Snapshot.Stationary);
        Assert.False(moving.Snapshot.StationaryBearingAligned);
        Assert.False(moving.Snapshot.ReadyForAcquisition);
        Assert.Equal(FirstDoorOpeningNavigationBlockCode.StationaryProofPending, moving.Snapshot.BlockCode);
        AssertNeutral(moving.Action);

        var stationaryBoundary = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(
                11,
                11,
                sightlinePoint,
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d,
                momentumX: 0.5d,
                momentumY: -0.5d));

        Assert.True(stationaryBoundary.Snapshot.Stationary);
        Assert.True(stationaryBoundary.Snapshot.StationaryBearingAligned);
        Assert.True(stationaryBoundary.Snapshot.ReadyForAcquisition);
    }

    [Fact]
    public void SightlineSnapshot_SeparatesWaypointAndDoorBearingFacts()
    {
        var prior = ActiveState(legIndex: 4, nativeGametic: 10);
        var ready = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(
                11,
                11,
                new Point(1360d, -2536d),
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d,
                doorDistance: 176d,
                doorBearing: 0d));

        Assert.True(ready.Snapshot.ReadyForAcquisition);
        Assert.Equal(8d, ready.Snapshot.TargetDistance, precision: 8);
        Assert.Equal(90d, ready.Snapshot.TargetBearingDegrees, precision: 8);
        Assert.Equal(-90d, ready.Snapshot.BearingErrorDegrees, precision: 8);
        Assert.Equal(176d, ready.Snapshot.DoorDistanceToSegment, precision: 8);
        Assert.Equal(0d, ready.Snapshot.DoorBearingDegrees, precision: 8);
        Assert.Equal(0d, ready.Snapshot.DoorBearingErrorDegrees, precision: 8);
    }

    [Fact]
    public void ExactFinalSightline_RequiresAlignmentAndAcquisitionEvidence()
    {
        var prior = ActiveState(legIndex: 4, nativeGametic: 10);
        var sightlinePoint = new Point(1360d, -2528d);

        var awaitingEvidence = FirstDoorOpeningNavigator.EvaluateTransition(
            prior,
            InputAt(
                11,
                11,
                sightlinePoint,
                heading: 0d,
                sector: 2,
                acquisitionReady: false,
                doorBearingError: 0d));

        Assert.True(awaitingEvidence.State.DoorSightlineCertified);
        Assert.Equal(FirstDoorOpeningNavigationStatus.SightlineAlign, awaitingEvidence.Snapshot.Status);
        Assert.Equal(
            FirstDoorOpeningNavigationBlockCode.AcquisitionEvidencePending,
            awaitingEvidence.Snapshot.BlockCode);
        Assert.False(awaitingEvidence.Snapshot.ReadyForAcquisition);
        AssertNeutral(awaitingEvidence.Action);

        var ready = FirstDoorOpeningNavigator.EvaluateTransition(
            awaitingEvidence.State,
            InputAt(
                12,
                12,
                sightlinePoint,
                heading: 0d,
                sector: 2,
                acquisitionReady: true,
                doorBearingError: 0d));

        Assert.Equal(FirstDoorOpeningNavigationStatus.ReadyForAcquisition, ready.Snapshot.Status);
        Assert.True(ready.Snapshot.DoorSightlineCertified);
        Assert.True(ready.Snapshot.StationaryBearingAligned);
        Assert.True(ready.Snapshot.ReadyForAcquisition);
        AssertNeutral(ready.Action);
    }

    private static FirstDoorOpeningNavigationState ActiveState(int legIndex, long nativeGametic)
        => new()
        {
            Active = true,
            LegIndex = legIndex,
            RouteStartedAtControlTick = 0,
            LegStartedAtControlTick = 0,
            LastNativeGametic = nativeGametic
        };

    private static FirstDoorOpeningNavigationInput InputAt(
        long controlTick,
        long nativeGametic,
        Point player,
        double heading,
        int sector,
        bool acquisitionReady = false,
        double doorBearingError = 0d,
        double momentumX = 0d,
        double momentumY = 0d,
        double doorDistance = 0d,
        double doorBearing = 0d)
        => new()
        {
            ControlReady = true,
            ControlTick = controlTick,
            AcquisitionReady = acquisitionReady,
            Proximity = new FirstDoorProximityObservation
            {
                InputAccepted = true,
                Available = true,
                Fresh = true,
                Truth = FirstDoorEvidenceTruth.Yes,
                WadContentSha256 = FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
                WadVerified = true,
                NativeGametic = nativeGametic,
                NativeGameState = 0,
                NativeGameEpisode = 1,
                NativeGameMap = 1,
                PlayerX = player.X,
                PlayerY = player.Y,
                PlayerMomentumX = momentumX,
                PlayerMomentumY = momentumY,
                HeadingDegrees = heading,
                PlayerSectorIndex = sector,
                DistanceToDoorSegment = doorDistance,
                BearingToDoorDegrees = doorBearing,
                BearingErrorDegrees = doorBearingError
            }
        };

    private static Point[] Route(FirstDoorOpeningNavigationPolicy policy)
        => [Spawn, .. policy.Waypoints.Select(waypoint => new Point(waypoint.X, waypoint.Y))];

    private static Segment[] Legs(IReadOnlyList<Point> route)
        => route.Skip(1)
            .Select((point, index) => new Segment(index, route[index], point))
            .ToArray();

    private static void AssertWaypoint(
        FirstDoorOpeningWaypoint waypoint,
        int index,
        string id,
        double x,
        double y,
        int sector,
        bool portal149 = false,
        bool sightline = false)
    {
        Assert.Equal(index, waypoint.Index);
        Assert.Equal(id, waypoint.Id);
        Assert.Equal(x, waypoint.X);
        Assert.Equal(y, waypoint.Y);
        Assert.Equal(new[] { sector }, waypoint.AllowedSectors);
        Assert.Equal(portal149, waypoint.RequiresPortal149NorthSide);
        Assert.Equal(sightline, waypoint.CertifiesDoorSightline);
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

    private static void AssertForwardOnly(ActionCommand action)
    {
        Assert.True(action.MoveForward);
        Assert.False(action.MoveBackward);
        Assert.False(action.StrafeLeft);
        Assert.False(action.StrafeRight);
        Assert.Equal(0, action.TurnYaw);
        Assert.False(action.UseKey);
        Assert.False(action.AttackKey);
    }

    private static void AssertTurnOnly(ActionCommand action, int expectedYaw)
    {
        Assert.False(action.MoveForward);
        Assert.False(action.MoveBackward);
        Assert.False(action.StrafeLeft);
        Assert.False(action.StrafeRight);
        Assert.Equal(expectedYaw, action.TurnYaw);
        Assert.False(action.UseKey);
        Assert.False(action.AttackKey);
    }

    private static void AssertSafeNavigationAction(ActionCommand action)
    {
        Assert.False(action.MoveBackward);
        Assert.False(action.StrafeLeft);
        Assert.False(action.StrafeRight);
        Assert.False(action.UseKey);
        Assert.False(action.AttackKey);
        Assert.False(action.MoveForward && action.TurnYaw != 0);
    }

    private static Point PlayerForTargetBearing(
        Point target,
        double bearingDegrees,
        double distance)
    {
        var radians = bearingDegrees * Math.PI / 180d;
        return new Point(
            target.X - (Math.Cos(radians) * distance),
            target.Y - (Math.Sin(radians) * distance));
    }

    private static Segment Line(int index)
        => Assert.Single(BlockingLines, line => line.Index == index);

    private static Point Midpoint(Segment segment)
        => new((segment.A.X + segment.B.X) / 2d, (segment.A.Y + segment.B.Y) / 2d);

    private static double EndpointClearance(Point point, Segment portal)
        => Math.Min(Distance(point, portal.A), Distance(point, portal.B));

    private static double SegmentDistance(Segment first, Segment second)
    {
        if (Intersects(first, second))
        {
            return 0d;
        }

        return Math.Min(
            Math.Min(
                PointToSegmentDistance(first.A, second),
                PointToSegmentDistance(first.B, second)),
            Math.Min(
                PointToSegmentDistance(second.A, first),
                PointToSegmentDistance(second.B, first)));
    }

    private static double PointToSegmentDistance(Point point, Segment segment)
    {
        var segmentX = segment.B.X - segment.A.X;
        var segmentY = segment.B.Y - segment.A.Y;
        var lengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
        if (lengthSquared <= 1e-12d)
        {
            return Distance(point, segment.A);
        }

        var offsetX = point.X - segment.A.X;
        var offsetY = point.Y - segment.A.Y;
        var parameter = Math.Clamp(
            ((offsetX * segmentX) + (offsetY * segmentY)) / lengthSquared,
            0d,
            1d);
        var closest = new Point(
            segment.A.X + (parameter * segmentX),
            segment.A.Y + (parameter * segmentY));
        return Distance(point, closest);
    }

    private static bool Intersects(Segment first, Segment second)
        => TryIntersection(first, second, out _);

    private static bool TryIntersection(Segment first, Segment second, out Point intersection)
    {
        var firstVector = new Point(first.B.X - first.A.X, first.B.Y - first.A.Y);
        var secondVector = new Point(second.B.X - second.A.X, second.B.Y - second.A.Y);
        var offset = new Point(second.A.X - first.A.X, second.A.Y - first.A.Y);
        var denominator = Cross(firstVector, secondVector);
        if (Math.Abs(denominator) <= 1e-12d)
        {
            intersection = default;
            return false;
        }

        var firstParameter = Cross(offset, secondVector) / denominator;
        var secondParameter = Cross(offset, firstVector) / denominator;
        if (firstParameter < 0d
            || firstParameter > 1d
            || secondParameter < 0d
            || secondParameter > 1d)
        {
            intersection = default;
            return false;
        }

        intersection = new Point(
            first.A.X + (firstParameter * firstVector.X),
            first.A.Y + (firstParameter * firstVector.Y));
        return true;
    }

    private static double Cross(Point left, Point right)
        => (left.X * right.Y) - (left.Y * right.X);

    private static double Distance(Point left, Point right)
    {
        var x = left.X - right.X;
        var y = left.Y - right.Y;
        return Math.Sqrt((x * x) + (y * y));
    }

    private readonly record struct Point(double X, double Y);

    private readonly record struct Segment(int Index, Point A, Point B);

    private readonly record struct Barrel(int ThingIndex, Point Position);
}
