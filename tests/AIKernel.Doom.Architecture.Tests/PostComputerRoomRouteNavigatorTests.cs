using AIKernel.Doom.Provider.Autoplay;

namespace AIKernel.Doom.Architecture.Tests;

public sealed class PostComputerRoomRouteNavigatorTests
{
    [Fact]
    public void CanonicalRoute_UsesSouthDoglegAndPortal385Lane()
    {
        var points = PostComputerRoomRoutePolicy.CanonicalWaypoints;

        Assert.Collection(
            points,
            point => AssertWaypoint(point, 0, 1760, -2512, 0, 7),
            point => AssertWaypoint(point, 1, 2064, -2512, 7),
            point => AssertWaypoint(point, 2, 2064, -2640, 7),
            point => AssertWaypoint(point, 3, 2448, -2640, 7),
            point => AssertWaypoint(point, 4, 2544, -2640, 54),
            point => AssertWaypoint(point, 5, 2688, -2672, 54, 53),
            point => AssertWaypoint(point, 6, 2848, -2720, 53, 71),
            point => AssertWaypoint(point, 7, 2880, -2928, 71),
            point => AssertWaypoint(point, 8, 2944, -3024, 60, 71));
    }

    [Fact]
    public void CanonicalIngress_UsesWadCertifiedDoorwaySectorsWithoutStoppingInDoorSlab()
    {
        var points = PostComputerRoomRoutePolicy.CanonicalIngressWaypoints;

        Assert.Collection(
            points,
            point => AssertWaypoint(point, 0, 1440, -2496, 2),
            point => AssertWaypoint(point, 1, 1504, -2496, 2, 3),
            point => AssertWaypoint(point, 2, 1600, -2496, 3, 4, 0),
            point => AssertWaypoint(point, 3, 1712, -2496, 0, 7));
        Assert.DoesNotContain(points, point => point.AllowedSectors.SequenceEqual(new[] { 4 }));
    }

    [Fact]
    public void MissingFirstDoorHandoffProof_DoesNotAcquireRoute()
    {
        var navigator = new PostComputerRoomRouteNavigator();

        var decision = navigator.Evaluate(null, Input(1));

        Assert.Equal(PostComputerRoomOwnershipDisposition.NotAcquired, decision.OwnershipDisposition);
        Assert.False(decision.Exclusive);
        Assert.Equal("first-door-handoff-proof-unavailable", decision.ReasonCode);
    }

    [Fact]
    public void MissingPostRouteContractVersion_DoesNotInheritTheCurrentVersion()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var input = new BrowserPostComputerRoomRouteInput
        {
            SessionId = "session-1",
            RunId = "run-1",
            RunGeneration = 1,
            ExpectedFirstDoorControlTick = 1
        };

        var decision = navigator.Evaluate(
            Proof(1, Pose(1760, -2512, 0, 7), computerRoomConfirmed: true),
            input);

        Assert.Equal(0, input.ContractVersion);
        Assert.Equal(0, decision.ContractVersion);
        Assert.Equal(PostComputerRoomRouteState.WaitingForFirstDoorHandoff, decision.State);
        Assert.Equal(PostComputerRoomOwnershipDisposition.NotAcquired, decision.OwnershipDisposition);
        Assert.Equal("first-door-handoff-scope-mismatch", decision.ReasonCode);
        Assert.True(IsNeutral(decision.Action));
    }

    [Fact]
    public void AwaitComputerRoom_FromSector2_UsesBoundedIngressThenStopsForConfirmation()
    {
        var navigator = new PostComputerRoomRouteNavigator();

        var align = navigator.Evaluate(Proof(1, Pose(1400, -2496, 0, 2)), Input(1));
        var portal150 = navigator.Evaluate(Proof(2, Pose(1440, -2496, 0, 2)), Input(2));
        var doorSlab = navigator.Evaluate(Proof(3, Pose(1504, -2496, 0, 3)), Input(3));
        var sector0 = navigator.Evaluate(Proof(4, Pose(1600, -2496, 0, 0)), Input(4));
        var sector7 = navigator.Evaluate(Proof(5, Pose(1712, -2496, 0, 7)), Input(5));

        Assert.Equal("first-door-east-alignment", align.Navigation.LegId);
        Assert.Equal("portal-150-east-certification", portal150.Navigation.LegId);
        Assert.Equal("first-door-open-slab-transit", doorSlab.Navigation.LegId);
        Assert.Equal("computer-room-entry-certification", sector0.Navigation.LegId);
        Assert.All(
            new[] { align, portal150, doorSlab, sector0 },
            item => Assert.Equal(PostComputerRoomRouteState.EnterComputerRoom, item.State));
        Assert.Equal(PostComputerRoomRouteState.AwaitComputerRoomConfirmation, sector7.State);
        Assert.Equal(PostComputerRoomOwnershipDisposition.Exclusive, sector7.OwnershipDisposition);
        Assert.False(sector7.Action.MoveForward);
        Assert.Equal("PostDoor", sector7.SemanticProjection.Telos);
        Assert.Equal("enter-computer-room", sector7.SemanticProjection.Objective);
        Assert.False(sector7.SemanticProjection.ComputerRoomEntered);
    }

    [Fact]
    public void ConfirmedSector7Entry_FollowsDoglegInsteadOfEnemyAlcove()
    {
        var navigator = new PostComputerRoomRouteNavigator();

        var decision = navigator.Evaluate(
            Proof(1, Pose(1680, -2512, 0, 7), computerRoomConfirmed: true),
            Input(1));

        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, decision.State);
        Assert.Equal(PostComputerRoomOwnershipDisposition.Exclusive, decision.OwnershipDisposition);
        Assert.True(decision.Action.MoveForward);
        Assert.False(decision.Action.AttackKey);
        Assert.Equal("computer-room-entry-center", decision.Navigation.LegId);
        Assert.Equal("post-computer-room-route-v8", decision.ImplementationVersion);
        Assert.Equal("post-computer-room-route-policy-v8", decision.PolicyVersion);
        Assert.Equal(7, decision.Navigation.SnapshotVersion);
        Assert.Equal("CentralHall", decision.SemanticProjection.Telos);
        Assert.Equal("reach-central-hall", decision.SemanticProjection.Objective);
    }

    [Fact]
    public void PortalWaypoint_DoesNotAdvanceWithoutAllowedSectorCertification()
    {
        var navigator = new PostComputerRoomRouteNavigator();

        var decision = navigator.Evaluate(
            Proof(1, Pose(2544, -2640, 0, 7), computerRoomConfirmed: true),
            Input(1));

        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, decision.State);
        Assert.Equal(4, decision.Navigation.LegIndex);
        Assert.Equal("main-route-portal-385-east", decision.Navigation.LegId);
        Assert.Equal(new[] { 54 }, decision.Navigation.AllowedSectors);
        Assert.Equal(0, decision.Navigation.LegFrames);
    }

    [Fact]
    public void Dev1052PortalRegression_RebasesToSector7AndCompletesCertifiedRoute()
    {
        var navigator = new PostComputerRoomRouteNavigator();

        var entered54 = navigator.Evaluate(
            Proof(1, Pose(2544, -2640, 0, 54), computerRoomConfirmed: true),
            Input(1));
        var liveSector7 = navigator.Evaluate(
            Proof(2, Pose(2454.704, -2659.835, 0, 7), computerRoomConfirmed: true),
            Input(2));
        var recrossed54 = navigator.Evaluate(
            Proof(3, Pose(2544, -2640, 0, 54), computerRoomConfirmed: true),
            Input(3));
        var sector54Diagonal = navigator.Evaluate(
            Proof(4, Pose(2688, -2672, 0, 54), computerRoomConfirmed: true),
            Input(4));
        var sector53 = navigator.Evaluate(
            Proof(5, Pose(2848, -2720, 0, 53), computerRoomConfirmed: true),
            Input(5));
        var sector71 = navigator.Evaluate(
            Proof(6, Pose(2880, -2928, 270, 71), computerRoomConfirmed: true),
            Input(6));
        var sector60 = navigator.Evaluate(
            Proof(7, Pose(2944, -3024, 270, 60), computerRoomConfirmed: true),
            Input(7));

        Assert.Equal(5, entered54.Navigation.LegIndex);
        Assert.Equal("sector-54-diagonal", entered54.Navigation.LegId);
        Assert.Equal(0, entered54.Navigation.RouteFrames);

        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, liveSector7.State);
        Assert.Equal(4, liveSector7.Navigation.LegIndex);
        Assert.Equal("main-route-portal-385-east", liveSector7.Navigation.LegId);
        Assert.Equal(1, liveSector7.Navigation.RouteFrames);
        Assert.Equal(0, liveSector7.Navigation.LegFrames);
        Assert.Equal(900, liveSector7.Navigation.RouteTimeoutFrames);
        Assert.Equal(180, liveSector7.Navigation.LegTimeoutFrames);
        Assert.False(liveSector7.Navigation.RecoveringEnemyAlcove);

        Assert.Equal(5, recrossed54.Navigation.LegIndex);
        Assert.Equal(2, recrossed54.Navigation.RouteFrames);
        Assert.Equal(6, sector54Diagonal.Navigation.LegIndex);
        Assert.Equal("sector-53-main-lane", sector54Diagonal.Navigation.LegId);
        Assert.Equal(7, sector53.Navigation.LegIndex);
        Assert.Equal("sector-71-south-lane", sector53.Navigation.LegId);
        Assert.Equal(8, sector71.Navigation.LegIndex);
        Assert.Equal("central-hall-entry", sector71.Navigation.LegId);
        Assert.Equal(PostComputerRoomRouteState.Complete, sector60.State);
        Assert.Equal(PostComputerRoomOwnershipDisposition.Completed, sector60.OwnershipDisposition);
        Assert.True(sector60.Completed);
        Assert.False(sector60.Exclusive);
    }

    [Theory]
    [InlineData(7, 2454.704, -2659.835, 4, "main-route-portal-385-east")]
    [InlineData(54, 2688, -2672, 6, "sector-53-main-lane")]
    [InlineData(53, 2848, -2720, 7, "sector-71-south-lane")]
    [InlineData(71, 2880, -2928, 8, "central-hall-entry")]
    public void CertifiedSectorCeilings_RebaseImpossibleDownstreamLegs(
        int sector,
        double x,
        double y,
        int expectedLeg,
        string expectedLegId)
    {
        var navigator = new PostComputerRoomRouteNavigator();
        navigator.Evaluate(
            Proof(1, Pose(2880, -2928, 270, 71), computerRoomConfirmed: true),
            Input(1));

        var decision = navigator.Evaluate(
            Proof(2, Pose(x, y, 0, sector), computerRoomConfirmed: true),
            Input(2));

        Assert.Equal(expectedLeg, decision.Navigation.LegIndex);
        Assert.Equal(expectedLegId, decision.Navigation.LegId);
        Assert.Equal(1, decision.Navigation.RouteFrames);
        if (expectedLeg < 8)
        {
            Assert.Equal(0, decision.Navigation.LegFrames);
        }
    }

    [Fact]
    public void EnemyAlcove_TrustedCenteredEnemy_FiresBeforeRecovery()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(2256, -2528, 180, 52) with { NativeGametic = 101 };

        var decision = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    VisualEnemyFireReady = true,
                    EnemyConfidence = 0.76
                },
                Actor(7, 2160, -2528, sectorIndex: 52)));

        Assert.Equal(PostComputerRoomRouteState.FireReady, decision.State);
        Assert.True(decision.Action.AttackKey);
        Assert.False(decision.Action.MoveForward);
        Assert.False(decision.RunRequested);
        Assert.Equal("post-computer-room.combat", decision.OwnerId);
    }

    [Fact]
    public void CenteredLegacyEnemy_UsesNativeBearingAndFiresStationary()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(2454.704, -2659.835, 0, 7) with { NativeGametic = 101 };

        var fire = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    VisualEnemyFireReady = false,
                    EnemyConfidence = 0.42
                },
                Actor(7, 2550.704, -2659.835)));

        Assert.Equal(PostComputerRoomRouteState.FireReady, fire.State);
        Assert.True(fire.Action.AttackKey);
        Assert.False(fire.Action.MoveForward);
        Assert.False(fire.RunRequested);
        Assert.Equal(4, fire.Navigation.LegIndex);
    }

    [Fact]
    public void EnemyAlcove_OffCenterEnemy_TurnsWithoutFiring()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(2256, -2528, 180, 52) with { NativeGametic = 101 };

        var decision = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyYaw = -18,
                    EnemyConfidence = 0.76
                },
                Actor(7, 2165, -2560, sectorIndex: 52)));

        Assert.Equal(PostComputerRoomRouteState.InterceptEnemy, decision.State);
        Assert.True(decision.Action.TurnYaw < 0);
        Assert.False(decision.Action.MoveForward);
        Assert.False(decision.Action.AttackKey);
        Assert.False(decision.RunRequested);
    }

    [Fact]
    public void EnemyAlcove_StructuralDecoy_DoesNotFireAndRecoversWest()
    {
        var navigator = new PostComputerRoomRouteNavigator();

        var decision = navigator.Evaluate(
            Proof(1, Pose(2256, -2528, 180, 52)),
            Input(1) with
            {
                CombatObservation = new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    VisualEnemyFireReady = true,
                    EnemyStructuralDecoy = true,
                    EnemyConfidence = 0.95
                }
            });

        Assert.Equal(PostComputerRoomRouteState.RecoverEnemyAlcove, decision.State);
        Assert.True(decision.Action.MoveForward);
        Assert.False(decision.Action.AttackKey);
        Assert.Equal("enemy-alcove-52-west-exit", decision.Navigation.LegId);
    }

    [Fact]
    public void Dev1050CenteredEnemy_FiresOnlyAfterTwoFreshStructuredFrames()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        double[] sample47 = [0.01, 0.01, 0, 0, 0.14, 0.01, 0, 0.14, 0];
        double[] sample48 = [0.01, 0.01, 0, 0, 0.10, 0.01, 0, 0.22, 0];

        var first = EvaluateStructured(navigator, 1, 47, sample47);
        var second = EvaluateStructured(navigator, 2, 48, sample48);

        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, first.State);
        Assert.False(first.Action.AttackKey);
        Assert.True(first.Navigation.StructuredCombatInputAccepted);
        Assert.True(first.Navigation.StructuredCombatFresh);
        Assert.True(first.Navigation.StructuredCombatCandidate);
        Assert.False(first.Navigation.StructuredCombatTrusted);
        Assert.Equal(1, first.Navigation.StructuredCombatDistinctFrames);
        Assert.Equal(0.14, first.Navigation.StructuredCombatPeak);
        Assert.Equal(0.31, first.Navigation.StructuredCombatTotal, 2);

        Assert.Equal(PostComputerRoomRouteState.FireReady, second.State);
        Assert.True(second.Action.AttackKey);
        Assert.True(second.Navigation.StructuredCombatTrusted);
        Assert.True(second.Navigation.StructuredCombatCentered);
        Assert.Equal(2, second.Navigation.StructuredCombatDistinctFrames);
        Assert.False(second.Navigation.LegacyTrustedCombatEvidence);
        Assert.Equal("structured-combat-two-distinct-frames", second.Navigation.StructuredCombatReason);
    }

    [Fact]
    public void Dev1050RightEnemy_TurnsFromCSharpStructureEvenWhenLegacyMarksDecoy()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        double[] sample53 = [0.01, 0.01, 0.04, 0, 0, 0.31, 0, 0.07, 0.21];
        double[] sample54 = [0.03, 0.01, 0.06, 0, 0, 0.26, 0, 0.07, 0.17];

        var first = EvaluateStructured(navigator, 1, 53, sample53, actorY: -2544);
        var second = EvaluateStructured(
            navigator,
            2,
            54,
            sample54,
            enemyStructuralDecoy: true,
            actorY: -2544);

        Assert.False(first.Action.AttackKey);
        Assert.Equal(PostComputerRoomRouteState.InterceptEnemy, second.State);
        Assert.True(second.Action.TurnYaw > 0);
        Assert.False(second.Action.AttackKey);
        Assert.True(second.Navigation.StructuredCombatTrusted);
        Assert.False(second.Navigation.StructuredCombatCentered);
        Assert.True(second.Navigation.StructuredCombatLateralBias > 0);
        Assert.False(second.Navigation.LegacyTrustedCombatEvidence);
        Assert.True(second.Navigation.EnemyStructuralDecoy);
    }

    [Fact]
    public void StructuredCombat_DuplicateFrameDoesNotAdvanceAndWindowRemainsBounded()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        double[] sample47 = [0.01, 0.01, 0, 0, 0.14, 0.01, 0, 0.14, 0];
        double[] sample48 = [0.01, 0.01, 0, 0, 0.10, 0.01, 0, 0.22, 0];
        double[] negative = [0.01, 0.01, 0, 0, 0.06, 0.01, 0, 0.07, 0];

        var first = EvaluateStructured(navigator, 1, 47, sample47);
        var duplicate = EvaluateStructured(
            navigator,
            2,
            47,
            sample47,
            rawFresh: false,
            nativeGametic: 1_001);
        var secondFresh = EvaluateStructured(navigator, 3, 48, sample48);

        Assert.Equal(1, first.Navigation.StructuredCombatDistinctFrames);
        Assert.False(duplicate.Navigation.StructuredCombatFresh);
        Assert.False(duplicate.Navigation.StructuredCombatTrusted);
        Assert.Contains("not-fresh", duplicate.Navigation.StructuredCombatReason, StringComparison.Ordinal);
        Assert.True(secondFresh.Action.AttackKey);

        var bounded = new PostComputerRoomRouteNavigator();
        EvaluateStructured(bounded, 1, 101, sample47);
        for (var tick = 2; tick <= 10; tick++)
        {
            EvaluateStructured(bounded, tick, 100 + tick, negative);
        }

        var expired = EvaluateStructured(bounded, 11, 111, sample48);
        Assert.False(expired.Action.AttackKey);
        Assert.False(expired.Navigation.StructuredCombatTrusted);
        Assert.Equal(1, expired.Navigation.StructuredCombatDistinctFrames);
    }

    [Fact]
    public void StructuredCombat_UniformIntensityDriftAtOneSpatialLocationDoesNotAcquire()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        double[] staticCandidate = [0.01, 0.01, 0, 0, 0.14, 0.01, 0, 0.14, 0];
        double[] uniformIntensityDrift = [0.02, 0.02, 0, 0, 0.28, 0.02, 0, 0.28, 0];

        var first = EvaluateStructured(navigator, 1, 400, staticCandidate);
        var second = EvaluateStructured(navigator, 2, 401, uniformIntensityDrift);

        Assert.True(first.Navigation.StructuredCombatCandidate);
        Assert.True(second.Navigation.StructuredCombatCandidate);
        Assert.Equal(1, second.Navigation.StructuredCombatDistinctFrames);
        Assert.False(second.Navigation.StructuredCombatTrusted);
        Assert.False(second.Action.AttackKey);
        Assert.Equal(
            "structured-combat-distinct-frame-window-pending",
            second.Navigation.StructuredCombatReason);
    }

    [Fact]
    public void StructuredCombat_SameFrameIdentityWithRedefinedContentClearsTemporalWindow()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        double[] sample47 = [0.01, 0.01, 0, 0, 0.14, 0.01, 0, 0.14, 0];
        double[] sample48 = [0.01, 0.01, 0, 0, 0.10, 0.01, 0, 0.22, 0];

        var first = EvaluateStructured(navigator, 1, 500, sample47);
        var redefined = EvaluateStructured(
            navigator,
            2,
            500,
            sample48,
            rawFresh: false,
            nativeGametic: 1_001);
        var nextFresh = EvaluateStructured(navigator, 3, 501, sample48);

        Assert.Equal(1, first.Navigation.StructuredCombatDistinctFrames);
        Assert.False(redefined.Navigation.StructuredCombatFresh);
        Assert.False(redefined.Navigation.StructuredCombatTrusted);
        Assert.Equal(
            "structured-combat-frame-identity-redefined",
            redefined.Navigation.StructuredCombatReason);
        Assert.Equal(1, nextFresh.Navigation.StructuredCombatDistinctFrames);
        Assert.False(nextFresh.Navigation.StructuredCombatTrusted);
        Assert.False(nextFresh.Action.AttackKey);
    }

    [Fact]
    public void StructuredCombat_EightFrameWindowRetainsDeltaSevenAndExpiresDeltaEight()
    {
        double[] sample47 = [0.01, 0.01, 0, 0, 0.14, 0.01, 0, 0.14, 0];
        double[] sample48 = [0.01, 0.01, 0, 0, 0.10, 0.01, 0, 0.22, 0];
        double[] negative = [0.01, 0.01, 0, 0, 0.06, 0.01, 0, 0.07, 0];

        var retainedNavigator = new PostComputerRoomRouteNavigator();
        EvaluateStructured(retainedNavigator, 1, 100, sample47);
        for (var offset = 1; offset <= 6; offset++)
        {
            EvaluateStructured(retainedNavigator, offset + 1, 100 + offset, negative);
        }

        var retained = EvaluateStructured(retainedNavigator, 8, 107, sample48);
        Assert.True(retained.Navigation.StructuredCombatTrusted);
        Assert.Equal(2, retained.Navigation.StructuredCombatDistinctFrames);
        Assert.True(retained.Action.AttackKey);

        var expiredNavigator = new PostComputerRoomRouteNavigator();
        EvaluateStructured(expiredNavigator, 1, 100, sample47);
        for (var offset = 1; offset <= 7; offset++)
        {
            EvaluateStructured(expiredNavigator, offset + 1, 100 + offset, negative);
        }

        var expired = EvaluateStructured(expiredNavigator, 9, 108, sample48);
        Assert.False(expired.Navigation.StructuredCombatTrusted);
        Assert.Equal(1, expired.Navigation.StructuredCombatDistinctFrames);
        Assert.False(expired.Action.AttackKey);
    }

    [Fact]
    public void StructuredCombat_NewRunClearsPriorTemporalWindow()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        double[] sample47 = [0.01, 0.01, 0, 0, 0.14, 0.01, 0, 0.14, 0];
        double[] sample48 = [0.01, 0.01, 0, 0, 0.10, 0.01, 0, 0.22, 0];

        var firstRun = EvaluateStructured(navigator, 1, 500, sample47);
        var secondRun = EvaluateStructured(
            navigator,
            2,
            1,
            sample48,
            runGeneration: 2);

        Assert.Equal(1, firstRun.Navigation.StructuredCombatDistinctFrames);
        Assert.Equal(1, secondRun.Navigation.StructuredCombatDistinctFrames);
        Assert.False(secondRun.Navigation.StructuredCombatTrusted);
        Assert.False(secondRun.Action.AttackKey);
        Assert.Equal(2, secondRun.RunGeneration);
    }

    [Fact]
    public void StructuredCombat_RejectsCapturedNegativesSingleCellAndFrameMismatch()
    {
        double[][] capturedNegatives =
        [
            [0.03, 0.05, 0.02, 0, 0, 0, 0, 0.07, 0],
            [0.04, 0.01, 0.01, 0, 0, 0.02, 0, 0.09, 0],
            [0.01, 0.01, 0, 0, 0.06, 0.01, 0, 0.07, 0]
        ];
        var navigator = new PostComputerRoomRouteNavigator();
        for (var index = 0; index < capturedNegatives.Length; index++)
        {
            var decision = EvaluateStructured(
                navigator,
                index + 1,
                200 + index,
                capturedNegatives[index]);
            Assert.False(decision.Navigation.StructuredCombatCandidate);
            Assert.False(decision.Navigation.StructuredCombatTrusted);
            Assert.False(decision.Action.AttackKey);
        }

        var singleCell = EvaluateStructured(
            navigator,
            4,
            204,
            [0, 0, 0, 0, 0.28, 0, 0, 0, 0]);
        Assert.False(singleCell.Navigation.StructuredCombatCandidate);
        Assert.False(singleCell.Action.AttackKey);

        var mismatchNavigator = new PostComputerRoomRouteNavigator();
        var mismatch = EvaluateStructured(
            mismatchNavigator,
            1,
            300,
            [0.01, 0.01, 0, 0, 0.14, 0.01, 0, 0.14, 0],
            inputFrameSequence: 301);
        Assert.False(mismatch.Navigation.StructuredCombatInputAccepted);
        Assert.False(mismatch.Navigation.StructuredCombatTrusted);
        Assert.Contains("identity-mismatch", mismatch.Navigation.StructuredCombatReason, StringComparison.Ordinal);
        Assert.False(mismatch.Action.AttackKey);
    }

    [Theory]
    [InlineData(0.41, false)]
    [InlineData(0.42, true)]
    public void LegacyCombatConfidenceBoundary_RemainsPoint42(double confidence, bool trusted)
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        var decision = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    VisualEnemyFireReady = true,
                    EnemyConfidence = confidence
                },
                Actor(7, 1856, -2512)));

        Assert.Equal(trusted, decision.Navigation.LegacyTrustedCombatEvidence);
        Assert.Equal(trusted, decision.Action.AttackKey);
    }

    [Fact]
    public void TrustedVisualEvidenceWithoutLiveNativeActor_DoesNotPreemptRoute()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };

        var decision = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    VisualEnemyFireReady = true,
                    EnemyConfidence = 0.92
                }));

        Assert.True(decision.Navigation.LegacyTrustedCombatEvidence);
        Assert.True(decision.Navigation.NativeActorVisualEvidenceTrusted);
        Assert.False(decision.Navigation.NativeActorMatched);
        Assert.False(decision.Navigation.NativeActorCombatTrusted);
        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, decision.State);
        Assert.True(decision.Action.MoveForward);
        Assert.False(decision.Action.AttackKey);
    }

    [Fact]
    public void StructuredVisualFalsePositiveWithoutLiveActor_DoesNotResetRouteLeg()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        double[] firstSample = [0.01, 0.01, 0, 0, 0.14, 0.01, 0, 0.14, 0];
        double[] secondSample = [0.01, 0.01, 0, 0, 0.10, 0.01, 0, 0.22, 0];

        var first = EvaluateStructured(
            navigator,
            1,
            47,
            firstSample,
            includeLiveActor: false);
        var second = EvaluateStructured(
            navigator,
            2,
            48,
            secondSample,
            includeLiveActor: false);

        Assert.False(first.Navigation.StructuredCombatTrusted);
        Assert.True(second.Navigation.StructuredCombatTrusted);
        Assert.False(second.Navigation.NativeActorCombatTrusted);
        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, second.State);
        Assert.True(second.Action.MoveForward);
        Assert.False(second.Action.AttackKey);
        Assert.Equal(1, second.Navigation.LegFrames);
    }

    [Fact]
    public void NativeTarget_RequiresActorDeathAndKillCountBeforeCorpseRelease()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var acquiredPose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        var acquired = navigator.Evaluate(
            ProofWithRaw(1, acquiredPose),
            CombatInput(
                1,
                acquiredPose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 1856, -2512)));

        var corpsePose = acquiredPose with { NativeGametic = 102 };
        var corpsePending = navigator.Evaluate(
            ProofWithRaw(2, corpsePose),
            CombatInput(
                2,
                corpsePose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 1856, -2512, health: 0, flags: 0x00400000)));

        var killedPose = corpsePose with
        {
            NativeGametic = 103,
            PlayerKillCount = 1
        };
        var released = navigator.Evaluate(
            ProofWithRaw(3, killedPose),
            CombatInput(
                3,
                killedPose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 1856, -2512, health: 0, flags: 0x00400000)));

        Assert.Equal(PostComputerRoomRouteState.FireReady, acquired.State);
        Assert.True(acquired.Action.AttackKey);
        Assert.True(acquired.Navigation.NativeActorTargetRetained);

        Assert.Equal(PostComputerRoomRouteState.InterceptEnemy, corpsePending.State);
        Assert.False(corpsePending.Action.AttackKey);
        Assert.True(corpsePending.Navigation.NativeActorTargetRetained);
        Assert.False(corpsePending.Navigation.NativeActorKillConfirmed);
        Assert.Equal("native-target-death-killcount-pending", corpsePending.Navigation.NativeActorCombatReason);

        Assert.True(released.Navigation.NativeActorKillConfirmed);
        Assert.False(released.Navigation.NativeActorTargetRetained);
        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, released.State);
        Assert.True(released.Action.MoveForward);
        Assert.False(released.Action.AttackKey);
    }

    [Theory]
    [InlineData(-18d)]
    [InlineData(18d)]
    public void MultipleLosActors_LegacyYawSelectsCueAlignedNearestActor(double visualYaw)
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        var fartherCueActor = ActorAtBearingError(20, pose, visualYaw, 192);
        var centeredActor = ActorAtBearingError(10, pose, 0, 64);
        var nearerCueActor = ActorAtBearingError(30, pose, visualYaw, 96);

        var decision = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyYaw = visualYaw,
                    EnemyConfidence = 0.42
                },
                fartherCueActor,
                centeredActor,
                nearerCueActor));

        Assert.True(decision.Navigation.NativeActorMatched);
        Assert.True(decision.Navigation.NativeActorTargetRetained);
        Assert.Equal(30, decision.Navigation.NativeActorTargetIdentity);
        Assert.InRange(
            Math.Abs(
                visualYaw
                    - decision.Navigation.NativeActorTargetBearingErrorDegrees),
            0,
            0.0001);
        Assert.Equal(Math.Sign(visualYaw), Math.Sign(decision.Action.TurnYaw));
        Assert.False(decision.Action.AttackKey);
        Assert.False(decision.Action.MoveForward);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(1)]
    public void MultipleLosActors_StructuredBiasSelectsCueAlignedNearestActor(int cueSign)
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var firstSample = cueSign < 0
            ? new double[] { 0.04, 0.01, 0.01, 0.31, 0, 0, 0.21, 0.07, 0 }
            : new double[] { 0.01, 0.01, 0.04, 0, 0, 0.31, 0, 0.07, 0.21 };
        var secondSample = cueSign < 0
            ? new double[] { 0.06, 0.01, 0.03, 0.26, 0, 0, 0.17, 0.07, 0 }
            : new double[] { 0.03, 0.01, 0.06, 0, 0, 0.26, 0, 0.07, 0.17 };
        var total = secondSample.Sum();
        var left = secondSample[0] + secondSample[3] + secondSample[6];
        var right = secondSample[2] + secondSample[5] + secondSample[8];
        var structuredCue = ((right - left) / total) * 18d;
        var pose = Pose(1760, -2512, 0, 7) with { NativeGametic = 1_001 };
        PostComputerRoomNativeActorFact[] actors =
        [
            ActorAtBearingError(20, pose, structuredCue, 192),
            ActorAtBearingError(10, pose, 0, 64),
            ActorAtBearingError(30, pose, structuredCue, 96)
        ];

        var first = EvaluateStructured(
            navigator,
            1,
            47,
            firstSample,
            actors: actors);
        var second = EvaluateStructured(
            navigator,
            2,
            48,
            secondSample,
            actors: actors);

        Assert.False(first.Navigation.StructuredCombatTrusted);
        Assert.True(second.Navigation.StructuredCombatTrusted);
        Assert.Equal(cueSign, Math.Sign(second.Navigation.StructuredCombatLateralBias));
        Assert.Equal(30, second.Navigation.NativeActorTargetIdentity);
        Assert.InRange(
            Math.Abs(
                structuredCue
                    - second.Navigation.NativeActorTargetBearingErrorDegrees),
            0,
            0.0001);
        Assert.Equal(cueSign, Math.Sign(second.Action.TurnYaw));
        Assert.False(second.Action.AttackKey);
    }

    [Fact]
    public void LegacyActorCorrelation_RejectsOppositeCueWhileCenteredCueUsesBearingOrder()
    {
        var pose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        var oppositeNavigator = new PostComputerRoomRouteNavigator();
        var opposite = oppositeNavigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyYaw = 18,
                    EnemyConfidence = 0.42
                },
                ActorAtBearingError(7, pose, -18, 96)));

        Assert.True(opposite.Navigation.NativeActorVisualEvidenceTrusted);
        Assert.False(opposite.Navigation.NativeActorMatched);
        Assert.False(opposite.Navigation.NativeActorTargetRetained);
        Assert.Equal("native-live-los-target-not-matched", opposite.Navigation.NativeActorCombatReason);
        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, opposite.State);
        Assert.True(opposite.Action.MoveForward);
        Assert.False(opposite.Action.AttackKey);

        var centeredNavigator = new PostComputerRoomRouteNavigator();
        var centered = centeredNavigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    VisualEnemyYaw = 0,
                    EnemyConfidence = 0.42
                },
                ActorAtBearingError(11, pose, 12, 64),
                ActorAtBearingError(12, pose, 0, 96),
                ActorAtBearingError(13, pose, -12, 64)));

        Assert.True(centered.Navigation.NativeActorMatched);
        Assert.Equal(12, centered.Navigation.NativeActorTargetIdentity);
        Assert.InRange(
            Math.Abs(centered.Navigation.NativeActorTargetBearingErrorDegrees),
            0,
            0.0001);
        Assert.True(centered.Action.AttackKey);
    }

    [Fact]
    public void StructuredActorCorrelation_RejectsRightCueWithOnlyLeftActor()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        double[] firstSample = [0.01, 0.01, 0.04, 0, 0, 0.31, 0, 0.07, 0.21];
        double[] secondSample = [0.03, 0.01, 0.06, 0, 0, 0.26, 0, 0.07, 0.17];
        var pose = Pose(1760, -2512, 0, 7) with { NativeGametic = 1_001 };
        var leftActor = ActorAtBearingError(7, pose, -14, 96);

        EvaluateStructured(
            navigator,
            1,
            47,
            firstSample,
            actors: [leftActor]);
        var rejected = EvaluateStructured(
            navigator,
            2,
            48,
            secondSample,
            actors: [leftActor]);

        Assert.True(rejected.Navigation.StructuredCombatTrusted);
        Assert.True(rejected.Navigation.StructuredCombatLateralBias > 0);
        Assert.True(rejected.Navigation.NativeActorVisualEvidenceTrusted);
        Assert.False(rejected.Navigation.NativeActorMatched);
        Assert.False(rejected.Navigation.NativeActorTargetRetained);
        Assert.Equal("native-live-los-target-not-matched", rejected.Navigation.NativeActorCombatReason);
        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, rejected.State);
        Assert.True(rejected.Action.MoveForward);
        Assert.False(rejected.Action.AttackKey);
    }

    [Fact]
    public void RetainedLocalTarget_FreshLosLossUsesCanonicalRouteWhileInvalidSnapshotsStayNeutral()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var acquiredPose = Pose(1760, -2512, 90, 7) with { NativeGametic = 101 };
        var acquired = navigator.Evaluate(
            ProofWithRaw(1, acquiredPose),
            CombatInput(
                1,
                acquiredPose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 1760, -2416)));

        var lostPose = acquiredPose with { NativeGametic = 102 };
        var lost = navigator.Evaluate(
            ProofWithRaw(2, lostPose),
            CombatInput(
                2,
                lostPose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 1760, -2416, lineOfSight: false)));
        var duplicate = navigator.Evaluate(
            ProofWithRaw(3, lostPose),
            CombatInput(
                3,
                lostPose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 1760, -2416, lineOfSight: false)));
        var rewoundPose = lostPose with { NativeGametic = 101 };
        var rewound = navigator.Evaluate(
            ProofWithRaw(4, rewoundPose),
            CombatInput(
                4,
                rewoundPose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 1760, -2416, lineOfSight: false)));
        var recoveredPose = lostPose with { NativeGametic = 103 };
        var realigning = navigator.Evaluate(
            ProofWithRaw(5, recoveredPose),
            CombatInput(
                5,
                recoveredPose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 1856, -2512)));
        var alignedPose = recoveredPose with
        {
            NativeGametic = 104,
            HeadingDegrees = 0
        };
        var firing = navigator.Evaluate(
            ProofWithRaw(6, alignedPose),
            CombatInput(
                6,
                alignedPose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 1856, -2512)));

        Assert.True(acquired.Action.AttackKey);
        Assert.Equal("native-live-target-retained-without-los", lost.Navigation.NativeActorCombatReason);
        Assert.True(lost.Navigation.NativeActorTargetRetained);
        Assert.False(lost.Navigation.NativeActorTargetLineOfSight);
        Assert.True(lost.Navigation.NativeActorTopologyAccepted);
        Assert.Equal("native-actor-topology-local", lost.Navigation.NativeActorTopologyReason);
        Assert.Equal("native-live-target-los-loss-main-route-reposition", lost.ReasonCode);
        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, lost.State);
        Assert.Equal(6, lost.Action.TurnYaw);
        Assert.False(lost.Action.AttackKey);

        Assert.Equal("native-actor-snapshot-duplicate-gametic", duplicate.Navigation.NativeActorCombatReason);
        Assert.True(duplicate.Navigation.NativeActorTargetRetained);
        Assert.True(IsNeutral(duplicate.Action));

        Assert.Equal("native-actor-snapshot-gametic-rewound", rewound.Navigation.NativeActorCombatReason);
        Assert.True(rewound.Navigation.NativeActorTargetRetained);
        Assert.True(IsNeutral(rewound.Action));

        Assert.True(realigning.Navigation.NativeActorSnapshotFresh);
        Assert.True(realigning.Navigation.NativeActorTargetLineOfSight);
        Assert.NotEqual(0, realigning.Action.TurnYaw);
        Assert.False(realigning.Action.AttackKey);
        Assert.True(firing.Navigation.NativeActorTargetRetained);
        Assert.True(firing.Action.AttackKey);
        Assert.True(IsStationary(firing.Action));
    }

    [Theory]
    [InlineData(7, 7)]
    [InlineData(7, 54)]
    [InlineData(54, 54)]
    [InlineData(54, 53)]
    [InlineData(53, 53)]
    [InlineData(53, 71)]
    [InlineData(71, 71)]
    [InlineData(71, 60)]
    [InlineData(60, 60)]
    [InlineData(52, 52)]
    [InlineData(52, 51)]
    [InlineData(51, 51)]
    [InlineData(51, 8)]
    [InlineData(8, 8)]
    [InlineData(8, 7)]
    public void ActorTopologyDirectionalWindows_AcquireOnlyTheCertifiedLocalPairs(
        int playerSectorIndex,
        int actorSectorIndex)
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(1760, -2512, 0, playerSectorIndex) with { NativeGametic = 101 };

        var decision = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 1856, -2512, sectorIndex: actorSectorIndex)));

        Assert.True(decision.Navigation.NativeActorMatched);
        Assert.True(decision.Navigation.NativeActorTargetRetained);
        Assert.True(decision.Navigation.NativeActorTopologyAccepted);
        Assert.Equal("native-actor-topology-local", decision.Navigation.NativeActorTopologyReason);
        Assert.Equal(actorSectorIndex, decision.Navigation.NativeActorTargetSectorIndex);
        Assert.True(decision.Action.AttackKey);
        Assert.True(IsStationary(decision.Action));
    }

    [Fact]
    public void RemoteVisualActor_CannotAcquireAndLeavesRejectedTopologyEvidence()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(2600, -2640, 0, 54) with { NativeGametic = 101 };

        var decision = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 2696, -2640, sectorIndex: 59)));

        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, decision.State);
        Assert.False(decision.Navigation.NativeActorTargetRetained);
        Assert.False(decision.Navigation.NativeActorCombatTrusted);
        Assert.False(decision.Navigation.NativeActorKillConfirmed);
        Assert.True(decision.Navigation.NativeActorMatched);
        Assert.Equal(7, decision.Navigation.NativeActorTargetIdentity);
        Assert.Equal(59, decision.Navigation.NativeActorTargetSectorIndex);
        Assert.False(decision.Navigation.NativeActorTopologyAccepted);
        Assert.Equal("native-actor-topology-remote", decision.Navigation.NativeActorTopologyReason);
        Assert.Equal("native-live-los-target-topology-rejected", decision.Navigation.NativeActorCombatReason);
        Assert.False(decision.Action.AttackKey);
    }

    [Fact]
    public void MissingActorSector_IsInvalidAndCannotAcquire()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };

        var decision = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 1856, -2512, sectorIndex: -1)));

        Assert.False(decision.Navigation.NativeActorSnapshotAccepted);
        Assert.False(decision.Navigation.NativeActorTargetRetained);
        Assert.Equal(-1, decision.Navigation.NativeActorTargetSectorIndex);
        Assert.Equal("native-actor-snapshot-actor-invalid", decision.Navigation.NativeActorCombatReason);
        Assert.False(decision.Action.AttackKey);
    }

    [Fact]
    public void RetainedActorLeavingTopologyWindow_ReleasesWithoutFalseKillAndResumesRoute()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var acquiredPose = Pose(2600, -2640, 0, 54) with { NativeGametic = 101 };
        var acquired = navigator.Evaluate(
            ProofWithRaw(1, acquiredPose),
            CombatInput(
                1,
                acquiredPose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 2696, -2640, sectorIndex: 53)));
        var releasedPose = acquiredPose with { NativeGametic = 102, PlayerKillCount = 1 };
        var released = navigator.Evaluate(
            ProofWithRaw(2, releasedPose),
            CombatInput(
                2,
                releasedPose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 2696, -2640, sectorIndex: 59)));
        var clearedPose = acquiredPose with { NativeGametic = 103, PlayerKillCount = 1 };
        var cleared = navigator.Evaluate(
            ProofWithRaw(3, clearedPose),
            CombatInput(3, clearedPose, new PostComputerRoomCombatObservation()));

        Assert.True(acquired.Navigation.NativeActorTargetRetained);
        Assert.True(acquired.Action.AttackKey);
        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, released.State);
        Assert.False(released.Navigation.NativeActorTargetRetained);
        Assert.False(released.Navigation.NativeActorKillConfirmed);
        Assert.Equal(59, released.Navigation.NativeActorTargetSectorIndex);
        Assert.Equal("native-actor-topology-remote", released.Navigation.NativeActorTopologyReason);
        Assert.Equal(
            "native-retained-target-topology-left-window",
            released.Navigation.NativeActorCombatReason);
        Assert.False(released.Action.AttackKey);
        Assert.Equal(0, cleared.Navigation.NativeActorTargetIdentity);
        Assert.Equal(-1, cleared.Navigation.NativeActorTargetSectorIndex);
        Assert.False(cleared.Navigation.NativeActorTargetRetained);
    }

    [Fact]
    public void Sector60_LocalLosLossHoldsCompletionButRemoteReleaseDoesNot()
    {
        static PostComputerRoomRouteDecision Acquire(
            PostComputerRoomRouteNavigator navigator,
            FirstDoorProximityObservation pose)
            => navigator.Evaluate(
                ProofWithRaw(1, pose),
                CombatInput(
                    1,
                    pose,
                    new PostComputerRoomCombatObservation
                    {
                        VisualEnemyVisible = true,
                        VisualEnemyCentered = true,
                        EnemyConfidence = 0.42
                    },
                    Actor(7, 2944, -3120, sectorIndex: 60)));

        var pose = Pose(2944, -3024, 270, 60) with { NativeGametic = 101 };
        var holdingNavigator = new PostComputerRoomRouteNavigator();
        Acquire(holdingNavigator, pose);
        var heldPose = pose with { NativeGametic = 102 };
        var held = holdingNavigator.Evaluate(
            ProofWithRaw(2, heldPose),
            CombatInput(
                2,
                heldPose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 2944, -3120, lineOfSight: false, sectorIndex: 60)));

        Assert.Equal(PostComputerRoomRouteState.InterceptEnemy, held.State);
        Assert.False(held.Completed);
        Assert.True(held.Navigation.NativeActorTargetRetained);
        Assert.True(held.Navigation.NativeActorTopologyAccepted);
        Assert.Equal("native-live-target-los-loss-central-hall-hold", held.ReasonCode);
        Assert.True(IsNeutral(held.Action));

        var completingNavigator = new PostComputerRoomRouteNavigator();
        Acquire(completingNavigator, pose);
        var released = completingNavigator.Evaluate(
            ProofWithRaw(2, heldPose),
            CombatInput(
                2,
                heldPose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 2944, -3120, sectorIndex: 59)));

        Assert.Equal(PostComputerRoomRouteState.Complete, released.State);
        Assert.True(released.Completed);
        Assert.False(released.Navigation.NativeActorTargetRetained);
        Assert.False(released.Navigation.NativeActorKillConfirmed);
        Assert.Equal("native-retained-target-topology-left-window", released.Navigation.NativeActorCombatReason);
    }

    [Fact]
    public void StructuredCombat_ProductionThresholdBoundariesRemainPoint14Point28Point04AndSupport2()
    {
        var policy = new PostComputerRoomRoutePolicy();
        Assert.Equal(0.14d, policy.StructuredEnemyMinimumPeak);
        Assert.Equal(0.28d, policy.StructuredEnemyMinimumTotal);
        Assert.Equal(0.04d, policy.StructuredEnemySupportCellMinimum);
        Assert.Equal(2, policy.StructuredEnemyMinimumSupportCells);

        PostComputerRoomRouteDecision Evaluate(long frame, params double[] values)
            => EvaluateStructured(
                new PostComputerRoomRouteNavigator(),
                1,
                frame,
                values,
                includeLiveActor: false);

        var peakBelow = Evaluate(601, 0.139999, 0.139999, 0.000002, 0, 0, 0, 0, 0, 0);
        var peakBoundary = Evaluate(602, 0.14, 0.14, 0, 0, 0, 0, 0, 0, 0);
        var totalBelow = Evaluate(603, 0.14, 0.139999, 0, 0, 0, 0, 0, 0, 0);
        var totalBoundary = Evaluate(604, 0.14, 0.14, 0, 0, 0, 0, 0, 0, 0);
        var supportCellBelow = Evaluate(605, 0.25, 0.039999, 0, 0, 0, 0, 0, 0, 0);
        var supportCellBoundary = Evaluate(606, 0.25, 0.04, 0, 0, 0, 0, 0, 0, 0);
        var oneSupportCell = Evaluate(607, 0.28, 0, 0, 0, 0, 0, 0, 0, 0);
        var twoSupportCells = Evaluate(608, 0.25, 0.04, 0, 0, 0, 0, 0, 0, 0);

        Assert.False(peakBelow.Navigation.StructuredCombatCandidate);
        Assert.True(peakBoundary.Navigation.StructuredCombatCandidate);
        Assert.False(totalBelow.Navigation.StructuredCombatCandidate);
        Assert.True(totalBoundary.Navigation.StructuredCombatCandidate);
        Assert.False(supportCellBelow.Navigation.StructuredCombatCandidate);
        Assert.Equal(1, supportCellBelow.Navigation.StructuredCombatSupportCells);
        Assert.True(supportCellBoundary.Navigation.StructuredCombatCandidate);
        Assert.Equal(2, supportCellBoundary.Navigation.StructuredCombatSupportCells);
        Assert.False(oneSupportCell.Navigation.StructuredCombatCandidate);
        Assert.Equal(1, oneSupportCell.Navigation.StructuredCombatSupportCells);
        Assert.True(twoSupportCells.Navigation.StructuredCombatCandidate);
        Assert.Equal(2, twoSupportCells.Navigation.StructuredCombatSupportCells);
    }

    [Fact]
    public void ComputerRoomConfirmation_StartsARealMainRouteLegWithoutResettingRouteClock()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        navigator.Evaluate(
            Proof(415, Pose(1544, -2496, 0, 4) with { NativeGametic = 478 }),
            Input(415));
        navigator.Evaluate(
            Proof(457, Pose(1600, -2496, 0, 0) with { NativeGametic = 520 }),
            Input(457));
        navigator.Evaluate(
            Proof(458, Pose(1718, -2504, 0, 7) with { NativeGametic = 521 }),
            Input(458));
        var held = navigator.Evaluate(
            Proof(643, Pose(1711, -2504, 0, 7) with { NativeGametic = 706 }),
            Input(643));
        var confirmed = navigator.Evaluate(
            Proof(
                644,
                Pose(1709, -2504, 0, 7) with { NativeGametic = 707 },
                computerRoomConfirmed: true),
            Input(644));
        var next = navigator.Evaluate(
            Proof(
                645,
                Pose(1709, -2504, 0, 7) with { NativeGametic = 708 },
                computerRoomConfirmed: true),
            Input(645));

        Assert.Equal(PostComputerRoomRouteState.AwaitComputerRoomConfirmation, held.State);
        Assert.Equal("computer-room-confirmation-hold", held.Navigation.LegId);
        Assert.Equal(186, held.Navigation.LegFrames);
        Assert.Equal(228, held.Navigation.RouteFrames);

        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, confirmed.State);
        Assert.Equal("computer-room-entry-center", confirmed.Navigation.LegId);
        Assert.Equal(0, confirmed.Navigation.LegFrames);
        Assert.Equal(229, confirmed.Navigation.RouteFrames);
        Assert.False(confirmed.FailureTrace.Failed);
        Assert.Equal(1, next.Navigation.LegFrames);
        Assert.Equal(230, next.Navigation.RouteFrames);
    }

    [Fact]
    public void ComputerRoomConfirmation_WithStalePoseStartsTheRealLegAtConfirmationTick()
    {
        var navigator = new PostComputerRoomRouteNavigator(new PostComputerRoomRoutePolicy
        {
            MaximumPoseMissingFrames = 1_000
        });
        var heldPose = Pose(1712, -2504, 0, 7) with { NativeGametic = 101 };
        var held = navigator.Evaluate(Proof(1, heldPose), Input(1));
        var staleConfirmationPose = heldPose with
        {
            Fresh = false,
            NativeGametic = 200
        };
        var confirmedStale = navigator.Evaluate(
            Proof(100, staleConfirmationPose, computerRoomConfirmed: true),
            Input(100));
        var firstFreshPose = heldPose with { NativeGametic = 205 };
        var firstFresh = navigator.Evaluate(
            Proof(105, firstFreshPose, computerRoomConfirmed: true),
            Input(105));

        PostComputerRoomRouteDecision beforeDeadline = firstFresh;
        var staleRealLegPose = firstFreshPose with { Fresh = false };
        for (var tick = 106; tick <= 279; tick++)
        {
            beforeDeadline = navigator.Evaluate(
                Proof(tick, staleRealLegPose, computerRoomConfirmed: true),
                Input(tick));
        }

        var failed = navigator.Evaluate(
            Proof(280, staleRealLegPose, computerRoomConfirmed: true),
            Input(280));

        Assert.Equal(PostComputerRoomRouteState.AwaitComputerRoomConfirmation, held.State);
        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, confirmedStale.State);
        Assert.Equal("computer-room-entry-center", confirmedStale.Navigation.LegId);
        Assert.Equal(0, confirmedStale.Navigation.LegFrames);
        Assert.Equal(99, confirmedStale.Navigation.RouteFrames);
        Assert.True(IsNeutral(confirmedStale.Action));
        Assert.Equal(5, firstFresh.Navigation.LegFrames);
        Assert.Equal(179, beforeDeadline.Navigation.LegFrames);
        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal(
            "post-computer-room-leg-budget-exhausted:computer-room-entry-center",
            failed.ReasonCode);
        Assert.Equal(180, failed.Navigation.LegFrames);
        Assert.Equal(279, failed.Navigation.RouteFrames);
        Assert.Equal(900, failed.Navigation.RouteTimeoutFrames);
        Assert.Equal(280, failed.FailureTrace.FailureAtControlTick);
    }

    [Fact]
    public void ConfirmedMainRouteLegStillFailsAtFrame180AndNeverResetsRouteFrame900()
    {
        static PostComputerRoomRouteNavigator HeldNavigator()
        {
            var navigator = new PostComputerRoomRouteNavigator();
            navigator.Evaluate(
                Proof(415, Pose(1544, -2496, 0, 4) with { NativeGametic = 478 }),
                Input(415));
            navigator.Evaluate(
                Proof(457, Pose(1600, -2496, 0, 0) with { NativeGametic = 520 }),
                Input(457));
            navigator.Evaluate(
                Proof(458, Pose(1718, -2504, 0, 7) with { NativeGametic = 521 }),
                Input(458));
            navigator.Evaluate(
                Proof(643, Pose(1711, -2504, 0, 7) with { NativeGametic = 706 }),
                Input(643));
            return navigator;
        }

        var legNavigator = HeldNavigator();
        var confirmedPose = Pose(1709, -2504, 0, 7) with { NativeGametic = 707 };
        legNavigator.Evaluate(
            Proof(644, confirmedPose, computerRoomConfirmed: true),
            Input(644));
        var beforeDeadline = legNavigator.Evaluate(
            Proof(
                823,
                confirmedPose with { NativeGametic = 886 },
                computerRoomConfirmed: true),
            Input(823));
        var failed = legNavigator.Evaluate(
            Proof(
                824,
                confirmedPose with { NativeGametic = 887 },
                computerRoomConfirmed: true),
            Input(824));

        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, beforeDeadline.State);
        Assert.Equal(179, beforeDeadline.Navigation.LegFrames);
        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal(
            "post-computer-room-leg-budget-exhausted:computer-room-entry-center",
            failed.ReasonCode);
        Assert.Equal(180, failed.Navigation.LegFrames);

        var routeNavigator = HeldNavigator();
        var routeFailed = routeNavigator.Evaluate(
            Proof(
                1315,
                confirmedPose with { NativeGametic = 1378 },
                computerRoomConfirmed: true),
            Input(1315));
        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, routeFailed.State);
        Assert.Equal("post-computer-room-route-budget-exhausted", routeFailed.ReasonCode);
        Assert.Equal(900, routeFailed.Navigation.RouteFrames);
    }

    [Fact]
    public void RetainedLosTarget_FiresOnlyAtFreshWeaponOpportunityAndOtherwiseAdvancesCanonicalRoute()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(1, pose, new PostComputerRoomCombatObservation()));

        var acquiredPose = pose with { NativeGametic = 109 };
        var acquired = navigator.Evaluate(
            ProofWithRaw(9, acquiredPose),
            CombatInput(
                9,
                acquiredPose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 1856, -2512)));
        var busyPose = pose with { NativeGametic = 110 };
        var busy = navigator.Evaluate(
            ProofWithRaw(10, busyPose),
            CombatInput(10, busyPose, new(), Actor(7, 1856, -2512)) with
            {
                WeaponSnapshot = WeaponSnapshot(110, weaponState: 101)
            });
        var readyAgainPose = pose with { NativeGametic = 111 };
        var readyAgain = navigator.Evaluate(
            ProofWithRaw(11, readyAgainPose),
            CombatInput(11, readyAgainPose, new(), Actor(7, 1856, -2512)));

        Assert.Equal(PostComputerRoomRouteState.FireReady, acquired.State);
        Assert.True(acquired.Action.AttackKey);
        Assert.True(IsStationary(acquired.Action));
        Assert.True(acquired.Navigation.NativeWeaponFireOpportunity);
        Assert.Equal("native-live-target-fire-opportunity", acquired.ReasonCode);
        Assert.Equal(8, acquired.Navigation.LegFrames);

        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, busy.State);
        Assert.True(busy.Navigation.NativeActorTargetRetained);
        Assert.False(busy.Navigation.NativeWeaponFireOpportunity);
        Assert.Equal("native-weapon-cycle-busy", busy.Navigation.NativeWeaponReason);
        Assert.Equal("native-live-target-weapon-cycle-main-route-progress", busy.ReasonCode);
        Assert.True(busy.Action.MoveForward);
        Assert.False(busy.Action.AttackKey);
        Assert.Equal(1, busy.Navigation.NativeActorEngagementFrames);

        Assert.Equal(PostComputerRoomRouteState.FireReady, readyAgain.State);
        Assert.True(readyAgain.Action.AttackKey);
        Assert.True(IsStationary(readyAgain.Action));
        Assert.Equal(2, readyAgain.Navigation.NativeActorEngagementFrames);
    }

    [Fact]
    public void RetainedLosTarget_MissingWeaponFactsFailsClosedAndSector60BusyCycleContinuesArmedFire()
    {
        var pose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        var missingNavigator = new PostComputerRoomRouteNavigator();
        missingNavigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 1856, -2512)));
        var missingPose = pose with { NativeGametic = 102 };
        var missing = missingNavigator.Evaluate(
            ProofWithRaw(2, missingPose),
            CombatInput(2, missingPose, new(), Actor(7, 1856, -2512)) with
            {
                WeaponSnapshot = new PostComputerRoomNativeWeaponSnapshot()
            });

        Assert.Equal(PostComputerRoomRouteState.InterceptEnemy, missing.State);
        Assert.Equal("native-weapon-snapshot-unavailable", missing.ReasonCode);
        Assert.True(IsNeutral(missing.Action));
        Assert.True(missing.Navigation.NativeActorTargetRetained);
        Assert.False(missing.Navigation.NativeWeaponContinuationArmed);
        Assert.False(missing.Navigation.NativeWeaponAttackContinuation);
        Assert.Equal(0, missing.Navigation.NativeWeaponContinuationTargetIdentity);
        Assert.Equal(-1, missing.Navigation.NativeWeaponContinuationReadyWeapon);
        Assert.Equal(-1, missing.Navigation.NativeWeaponContinuationAuthorizedAtControlTick);

        var sector60Pose = Pose(2944, -3024, 270, 60) with { NativeGametic = 201 };
        var sector60Navigator = new PostComputerRoomRouteNavigator();
        var armed = sector60Navigator.Evaluate(
            ProofWithRaw(1, sector60Pose),
            CombatInput(
                1,
                sector60Pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 2944, -3120, sectorIndex: 60)));
        var busySector60Pose = sector60Pose with { NativeGametic = 202 };
        var held = sector60Navigator.Evaluate(
            ProofWithRaw(2, busySector60Pose),
            CombatInput(
                2,
                busySector60Pose,
                new(),
                Actor(7, 2944, -3120, sectorIndex: 60)) with
            {
                WeaponSnapshot = WeaponSnapshot(202, weaponState: 101)
            });

        Assert.Equal(PostComputerRoomRouteState.FireReady, armed.State);
        Assert.True(armed.Action.AttackKey);
        Assert.True(armed.Navigation.NativeWeaponFireOpportunity);
        Assert.True(armed.Navigation.NativeWeaponContinuationArmed);
        Assert.False(armed.Navigation.NativeWeaponAttackContinuation);
        Assert.Equal(7, armed.Navigation.NativeWeaponContinuationTargetIdentity);
        Assert.Equal(1, armed.Navigation.NativeWeaponContinuationReadyWeapon);
        Assert.Equal(1, armed.Navigation.NativeWeaponContinuationAuthorizedAtControlTick);

        Assert.Equal(PostComputerRoomRouteState.FireReady, held.State);
        Assert.Equal("native-live-target-fire-cycle-continuation", held.ReasonCode);
        Assert.False(held.Completed);
        Assert.True(held.Action.AttackKey);
        Assert.True(IsStationary(held.Action));
        Assert.False(held.Navigation.NativeWeaponFireOpportunity);
        Assert.True(held.Navigation.NativeWeaponContinuationArmed);
        Assert.True(held.Navigation.NativeWeaponAttackContinuation);
        Assert.Equal(7, held.Navigation.NativeWeaponContinuationTargetIdentity);
        Assert.Equal(1, held.Navigation.NativeWeaponContinuationReadyWeapon);
        Assert.Equal(1, held.Navigation.NativeWeaponContinuationAuthorizedAtControlTick);

        var refirePose = sector60Pose with { NativeGametic = 203 };
        var refiring = sector60Navigator.Evaluate(
            ProofWithRaw(3, refirePose),
            CombatInput(
                3,
                refirePose,
                new(),
                Actor(7, 2944, -3120, sectorIndex: 60)) with
            {
                WeaponSnapshot = WeaponSnapshot(203, weaponState: 101, refire: 1)
            });
        Assert.Equal(PostComputerRoomRouteState.FireReady, refiring.State);
        Assert.True(refiring.Action.AttackKey);
        Assert.False(refiring.Navigation.NativeWeaponFireOpportunity);
        Assert.True(refiring.Navigation.NativeWeaponAttackContinuation);
        Assert.Equal(1, refiring.Navigation.NativeWeaponRefire);
    }

    [Fact]
    public void Sector60BusyWeaponWithoutPriorExactReadyAttackRemainsNeutral()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(2944, -3024, 270, 60) with { NativeGametic = 201 };
        var decision = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 2944, -3120, sectorIndex: 60)) with
            {
                WeaponSnapshot = WeaponSnapshot(201, weaponState: 101)
            });

        Assert.Equal(PostComputerRoomRouteState.InterceptEnemy, decision.State);
        Assert.Equal("native-live-target-weapon-cycle-central-hall-hold", decision.ReasonCode);
        Assert.True(IsNeutral(decision.Action));
        Assert.False(decision.Navigation.NativeWeaponFireOpportunity);
        Assert.False(decision.Navigation.NativeWeaponContinuationArmed);
        Assert.False(decision.Navigation.NativeWeaponAttackContinuation);
    }

    [Theory]
    [InlineData("target-missing")]
    [InlineData("weapon-change")]
    [InlineData("pending-weapon")]
    [InlineData("no-los")]
    [InlineData("remote-topology")]
    [InlineData("misaligned")]
    [InlineData("stale-weapon")]
    [InlineData("invalid-weapon")]
    [InlineData("player-death")]
    public void Sector60FireContinuation_ClearsAtEveryAuthorityBoundary(string boundary)
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(2944, -3024, 270, 60) with { NativeGametic = 201 };
        var actor = Actor(7, 2944, -3120, sectorIndex: 60);
        var armed = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                actor));
        Assert.True(armed.Action.AttackKey);
        Assert.True(armed.Navigation.NativeWeaponContinuationArmed);

        var nextPose = pose with { NativeGametic = 202 };
        var nextActor = actor;
        var actors = new[] { nextActor };
        var weapon = WeaponSnapshot(202, weaponState: 101);
        switch (boundary)
        {
            case "target-missing":
                actors = new[] { actor with { Identity = 8 } };
                break;
            case "weapon-change":
                weapon = weapon with { ReadyWeapon = 2 };
                break;
            case "pending-weapon":
                weapon = weapon with { PendingWeapon = 2 };
                break;
            case "no-los":
                actors = new[] { actor with { LineOfSight = false } };
                break;
            case "remote-topology":
                actors = new[] { actor with { SectorIndex = 59 } };
                break;
            case "misaligned":
                actors = new[]
                {
                    ActorAtBearingError(7, nextPose, 6, 96) with { SectorIndex = 60 }
                };
                break;
            case "stale-weapon":
                weapon = weapon with { Gametic = 201 };
                break;
            case "invalid-weapon":
                weapon = weapon with { StateCount = 0 };
                break;
            case "player-death":
                nextPose = nextPose with { PlayerHealth = 0, PlayerState = 1 };
                break;
            default:
                throw new InvalidOperationException($"Unknown boundary {boundary}");
        }

        var invalidated = navigator.Evaluate(
            ProofWithRaw(2, nextPose),
            CombatInput(2, nextPose, new(), actors) with
            {
                ActorSnapshot = ActorSnapshot(202, actors),
                WeaponSnapshot = weapon
            });

        Assert.False(invalidated.Action.AttackKey);
        Assert.False(invalidated.Navigation.NativeWeaponContinuationArmed);
        Assert.False(invalidated.Navigation.NativeWeaponAttackContinuation);
        Assert.Equal(0, invalidated.Navigation.NativeWeaponContinuationTargetIdentity);
        Assert.Equal(-1, invalidated.Navigation.NativeWeaponContinuationReadyWeapon);
        Assert.Equal(-1, invalidated.Navigation.NativeWeaponContinuationAuthorizedAtControlTick);
    }

    [Fact]
    public void Sector60FireContinuation_AfterClearRequiresAnotherExactReadyAttack()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(2944, -3024, 270, 60) with { NativeGametic = 201 };
        var actor = Actor(7, 2944, -3120, sectorIndex: 60);
        navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                actor));

        var stalePose = pose with { NativeGametic = 202 };
        var cleared = navigator.Evaluate(
            ProofWithRaw(2, stalePose),
            CombatInput(2, stalePose, new(), actor) with
            {
                WeaponSnapshot = WeaponSnapshot(201, weaponState: 101)
            });
        Assert.False(cleared.Navigation.NativeWeaponContinuationArmed);

        var busyPose = pose with { NativeGametic = 203 };
        var stillReleased = navigator.Evaluate(
            ProofWithRaw(3, busyPose),
            CombatInput(3, busyPose, new(), actor) with
            {
                WeaponSnapshot = WeaponSnapshot(203, weaponState: 101)
            });
        Assert.False(stillReleased.Action.AttackKey);
        Assert.False(stillReleased.Navigation.NativeWeaponContinuationArmed);
        Assert.False(stillReleased.Navigation.NativeWeaponAttackContinuation);

        var readyPose = pose with { NativeGametic = 204 };
        var rearmed = navigator.Evaluate(
            ProofWithRaw(4, readyPose),
            CombatInput(4, readyPose, new(), actor));
        Assert.True(rearmed.Action.AttackKey);
        Assert.True(rearmed.Navigation.NativeWeaponFireOpportunity);
        Assert.True(rearmed.Navigation.NativeWeaponContinuationArmed);
        Assert.Equal(4, rearmed.Navigation.NativeWeaponContinuationAuthorizedAtControlTick);
    }

    [Fact]
    public void Sector60FireContinuation_RunScopeChangeClearsAuthorization()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(2944, -3024, 270, 60) with { NativeGametic = 201 };
        var actor = Actor(7, 2944, -3120, sectorIndex: 60);
        var armed = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                actor));
        Assert.True(armed.Navigation.NativeWeaponContinuationArmed);

        var nextPose = pose with { NativeGametic = 1 };
        var nextProof = ProofWithRaw(1, nextPose) with
        {
            SessionId = "session-2",
            RunId = "run-2",
            RunGeneration = 2
        };
        var nextInput = Input(1) with
        {
            SessionId = "session-2",
            RunId = "run-2",
            RunGeneration = 2,
            ActorSnapshot = ActorSnapshot(1),
            WeaponSnapshot = WeaponSnapshot(1)
        };
        var reset = navigator.Evaluate(nextProof, nextInput);

        Assert.False(reset.Navigation.NativeWeaponContinuationArmed);
        Assert.False(reset.Navigation.NativeWeaponAttackContinuation);
        Assert.Equal(0, reset.Navigation.NativeWeaponContinuationTargetIdentity);
        Assert.Equal(-1, reset.Navigation.NativeWeaponContinuationReadyWeapon);
        Assert.Equal(-1, reset.Navigation.NativeWeaponContinuationAuthorizedAtControlTick);
    }

    [Theory]
    [InlineData(-1, 100, 100)]
    [InlineData(0, 100, 100)]
    [InlineData(100, 100, 99)]
    [InlineData(100, 99, 100)]
    public void RetainedLosTarget_InvalidWeaponStateDomainFailsClosed(
        int stateCount,
        int weaponState,
        int weaponReadyState)
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        var actor = Actor(7, 1856, -2512);
        var acquired = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                actor));
        var invalidPose = pose with { NativeGametic = 102 };
        var invalid = navigator.Evaluate(
            ProofWithRaw(2, invalidPose),
            CombatInput(2, invalidPose, new(), actor) with
            {
                ActorSnapshot = ActorSnapshot(102, actor),
                WeaponSnapshot = WeaponSnapshot(
                    102,
                    stateCount: stateCount,
                    weaponState: weaponState,
                    weaponReadyState: weaponReadyState)
            });

        Assert.Equal(PostComputerRoomRouteState.FireReady, acquired.State);
        Assert.Equal(967, acquired.Navigation.NativeWeaponStateCount);
        Assert.Equal(PostComputerRoomRouteState.InterceptEnemy, invalid.State);
        Assert.Equal("native-weapon-snapshot-shape-invalid", invalid.ReasonCode);
        Assert.True(invalid.Navigation.NativeActorTargetRetained);
        Assert.False(invalid.Navigation.NativeWeaponSnapshotAccepted);
        Assert.False(invalid.Navigation.NativeWeaponFireOpportunity);
        Assert.True(IsNeutral(invalid.Action));
    }

    [Fact]
    public void WeaponCycleProgress_UsesCanonicalWaypointBearingInsteadOfActorBearing()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(2858.2537536621094, -2730.6614532470703, 284.765625, 71) with
        {
            NativeGametic = 101
        };
        var alignedActor = ActorAtBearingError(7, pose, 0, 96) with { SectorIndex = 60 };
        var acquired = navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                alignedActor));
        var busyPose = pose with { NativeGametic = 102 };
        var busy = navigator.Evaluate(
            ProofWithRaw(2, busyPose),
            CombatInput(2, busyPose, new(), alignedActor) with
            {
                ActorSnapshot = ActorSnapshot(102, alignedActor),
                WeaponSnapshot = WeaponSnapshot(102, weaponState: 101)
            });

        Assert.True(acquired.Action.AttackKey);
        Assert.InRange(Math.Abs(acquired.Navigation.NativeActorTargetBearingErrorDegrees), 0, 0.001);
        Assert.Equal("sector-71-south-lane", busy.Navigation.LegId);
        Assert.InRange(busy.Navigation.BearingErrorDegrees, 8.47, 8.49);
        Assert.Equal(6, busy.Action.TurnYaw);
        Assert.False(busy.Action.MoveForward);
        Assert.False(busy.Action.AttackKey);
        Assert.Equal("native-live-target-weapon-cycle-main-route-progress", busy.ReasonCode);
    }

    [Fact]
    public void MainRouteLegBudget_AllowsFrame179AndFailsAtFrame180()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var startPose = Pose(1680, -2512, 0, 7) with { NativeGametic = 101 };
        navigator.Evaluate(
            Proof(1, startPose, computerRoomConfirmed: true),
            Input(1));

        var beforeDeadlinePose = startPose with { NativeGametic = 280 };
        var beforeDeadline = navigator.Evaluate(
            Proof(180, beforeDeadlinePose, computerRoomConfirmed: true),
            Input(180));
        var deadlinePose = startPose with { NativeGametic = 281 };
        var failed = navigator.Evaluate(
            Proof(181, deadlinePose, computerRoomConfirmed: true),
            Input(181));

        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, beforeDeadline.State);
        Assert.Equal(179, beforeDeadline.Navigation.LegFrames);
        Assert.Equal(180, beforeDeadline.Navigation.LegTimeoutFrames);
        Assert.Equal(1, beforeDeadline.Navigation.LegRemainingFrames);
        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal(
            "post-computer-room-leg-budget-exhausted:computer-room-entry-center",
            failed.ReasonCode);
        Assert.Equal(180, failed.Navigation.LegFrames);
    }

    [Fact]
    public void EnemyAlcoveRecoveryLegBudget_AllowsFrame179AndFailsAtFrame180()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var startPose = Pose(2256, -2528, 180, 52) with { NativeGametic = 101 };
        navigator.Evaluate(
            Proof(1, startPose, computerRoomConfirmed: true),
            Input(1));

        var beforeDeadlinePose = startPose with { NativeGametic = 280 };
        var beforeDeadline = navigator.Evaluate(
            Proof(180, beforeDeadlinePose, computerRoomConfirmed: true),
            Input(180));
        var deadlinePose = startPose with { NativeGametic = 281 };
        var failed = navigator.Evaluate(
            Proof(181, deadlinePose, computerRoomConfirmed: true),
            Input(181));

        Assert.Equal(PostComputerRoomRouteState.RecoverEnemyAlcove, beforeDeadline.State);
        Assert.Equal("enemy-alcove-52-west-exit", beforeDeadline.Navigation.LegId);
        Assert.True(beforeDeadline.Navigation.RecoveringEnemyAlcove);
        Assert.Equal(179, beforeDeadline.Navigation.LegFrames);
        Assert.Equal(1, beforeDeadline.Navigation.LegRemainingFrames);

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal(
            "post-computer-room-leg-budget-exhausted:enemy-alcove-52-west-exit",
            failed.ReasonCode);
        Assert.Equal(180, failed.Navigation.LegFrames);
    }

    [Fact]
    public void RouteAndLegDeadlines_DoNotPauseWhenNativePoseBecomesUnavailable()
    {
        var routeNavigator = new PostComputerRoomRouteNavigator(new PostComputerRoomRoutePolicy
        {
            RouteTimeoutFrames = 900,
            LegTimeoutFrames = 1_000
        });
        var startPose = Pose(1680, -2512, 0, 7) with { NativeGametic = 101 };
        routeNavigator.Evaluate(
            Proof(1, startPose, computerRoomConfirmed: true),
            Input(1));
        var routeDeadlinePose = startPose with { Fresh = false, NativeGametic = 1_001 };
        var routeFailed = routeNavigator.Evaluate(
            Proof(901, routeDeadlinePose, computerRoomConfirmed: true),
            Input(901));

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, routeFailed.State);
        Assert.Equal("post-computer-room-route-budget-exhausted", routeFailed.ReasonCode);
        Assert.Equal(901, routeFailed.FailureTrace.FailureAtControlTick);

        var legNavigator = new PostComputerRoomRouteNavigator(new PostComputerRoomRoutePolicy
        {
            RouteTimeoutFrames = 1_000,
            LegTimeoutFrames = 180
        });
        legNavigator.Evaluate(
            Proof(1, startPose, computerRoomConfirmed: true),
            Input(1));
        var legDeadlinePose = startPose with { Fresh = false, NativeGametic = 281 };
        var legFailed = legNavigator.Evaluate(
            Proof(181, legDeadlinePose, computerRoomConfirmed: true),
            Input(181));

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, legFailed.State);
        Assert.Equal(
            "post-computer-room-leg-budget-exhausted:computer-room-entry-center",
            legFailed.ReasonCode);
        Assert.Equal(181, legFailed.FailureTrace.FailureAtControlTick);
    }

    [Fact]
    public void MainRouteWaypointArrivalAtFrame180_CannotResetTheExpiredLegClock()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var startPose = Pose(1680, -2512, 0, 7) with { NativeGametic = 101 };
        navigator.Evaluate(
            Proof(1, startPose, computerRoomConfirmed: true),
            Input(1));

        var exactArrival = Pose(1760, -2512, 0, 7) with { NativeGametic = 281 };
        var failed = navigator.Evaluate(
            Proof(181, exactArrival, computerRoomConfirmed: true),
            Input(181));

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal(
            "post-computer-room-leg-budget-exhausted:computer-room-entry-center",
            failed.ReasonCode);
        Assert.Equal(0, failed.Navigation.LegIndex);
        Assert.Equal("computer-room-entry-center", failed.Navigation.LegId);
        Assert.Equal(180, failed.Navigation.LegFrames);
    }

    [Fact]
    public void IngressWaypointArrivalAtFrame180_CannotResetTheExpiredLegClock()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var startPose = Pose(1400, -2496, 0, 2) with { NativeGametic = 101 };
        navigator.Evaluate(Proof(1, startPose), Input(1));

        var exactArrival = Pose(1440, -2496, 0, 2) with { NativeGametic = 281 };
        var failed = navigator.Evaluate(Proof(181, exactArrival), Input(181));

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal(
            "post-computer-room-leg-budget-exhausted:first-door-east-alignment",
            failed.ReasonCode);
        Assert.Equal(0, failed.Navigation.LegIndex);
        Assert.Equal("first-door-east-alignment", failed.Navigation.LegId);
        Assert.Equal(180, failed.Navigation.LegFrames);
    }

    [Fact]
    public void UnconfirmedRoomCertificationRecovery_AllowsFrame179ButCannotCompleteAtFrame180()
    {
        var startPose = Pose(2256, -2528, 180, 52) with { NativeGametic = 101 };
        var certificationPoseAt179 = Pose(1760, -2512, 180, 7) with { NativeGametic = 280 };
        var allowedNavigator = new PostComputerRoomRouteNavigator();
        allowedNavigator.Evaluate(Proof(1, startPose), Input(1));
        var allowed = allowedNavigator.Evaluate(
            Proof(180, certificationPoseAt179),
            Input(180));

        Assert.Equal(PostComputerRoomRouteState.AwaitComputerRoomConfirmation, allowed.State);
        Assert.Equal("computer-room-confirmation-pending", allowed.ReasonCode);
        Assert.False(allowed.FailureTrace.Failed);

        var certificationPoseAt180 = certificationPoseAt179 with { NativeGametic = 281 };
        var failingNavigator = new PostComputerRoomRouteNavigator();
        failingNavigator.Evaluate(Proof(1, startPose), Input(1));
        var failed = failingNavigator.Evaluate(
            Proof(181, certificationPoseAt180),
            Input(181));

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal(
            "post-computer-room-leg-budget-exhausted:enemy-alcove-room-certification-recovery",
            failed.ReasonCode);
        Assert.Equal(180, failed.Navigation.LegFrames);
    }

    [Fact]
    public void LateCombatAcquisition_DoesNotPauseRouteClockAndRouteFailsAtFrame900()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var startPose = Pose(2880, -2928, 270, 71) with { NativeGametic = 101 };
        navigator.Evaluate(
            Proof(1, startPose, computerRoomConfirmed: true),
            Input(1));

        var rebasedPose = Pose(2454.704, -2659.835, 0, 7) with { NativeGametic = 821 };
        var rebased = navigator.Evaluate(
            Proof(721, rebasedPose, computerRoomConfirmed: true),
            Input(721));
        var acquiredPose = rebasedPose with { NativeGametic = 822 };
        var acquired = navigator.Evaluate(
            ProofWithRaw(722, acquiredPose),
            CombatInput(
                722,
                acquiredPose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 2550.704, -2659.835)));
        var beforeDeadlinePose = acquiredPose with { NativeGametic = 1_000 };
        var beforeDeadline = navigator.Evaluate(
            ProofWithRaw(900, beforeDeadlinePose),
            CombatInput(
                900,
                beforeDeadlinePose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 2550.704, -2659.835)));
        var deadlinePose = acquiredPose with { NativeGametic = 1_001 };
        var failed = navigator.Evaluate(
            ProofWithRaw(901, deadlinePose),
            CombatInput(
                901,
                deadlinePose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 2550.704, -2659.835)));

        Assert.Equal(720, rebased.Navigation.RouteFrames);
        Assert.Equal(0, rebased.Navigation.LegFrames);
        Assert.True(acquired.Navigation.NativeActorTargetRetained);
        Assert.Equal(721, acquired.Navigation.RouteFrames);
        Assert.Equal(PostComputerRoomRouteState.FireReady, beforeDeadline.State);
        Assert.True(beforeDeadline.Action.AttackKey);
        Assert.Equal(899, beforeDeadline.Navigation.RouteFrames);
        Assert.Equal(900, beforeDeadline.Navigation.RouteTimeoutFrames);
        Assert.Equal(1, beforeDeadline.Navigation.RouteRemainingFrames);
        Assert.Equal(178, beforeDeadline.Navigation.NativeActorEngagementFrames);
        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal("post-computer-room-route-budget-exhausted", failed.ReasonCode);
        Assert.Equal(900, failed.Navigation.RouteFrames);
        Assert.Equal(179, failed.Navigation.NativeActorEngagementFrames);
    }

    [Fact]
    public void Sector60_LiveTargetPreemptsCompletion_KillAt179CompletesAndKillAt180Fails()
    {
        static PostComputerRoomRouteDecision AcquireAtSector60(
            PostComputerRoomRouteNavigator navigator,
            FirstDoorProximityObservation pose)
            => navigator.Evaluate(
                ProofWithRaw(1, pose),
                CombatInput(
                    1,
                    pose,
                    new PostComputerRoomCombatObservation
                    {
                        VisualEnemyVisible = true,
                        VisualEnemyCentered = true,
                        EnemyConfidence = 0.42
                    },
                    Actor(7, 2944, -3120, sectorIndex: 60)));

        var pose = Pose(2944, -3024, 270, 60) with { NativeGametic = 101 };
        var completingNavigator = new PostComputerRoomRouteNavigator();
        var acquired = AcquireAtSector60(completingNavigator, pose);
        var killAt179Pose = pose with
        {
            NativeGametic = 280,
            PlayerKillCount = 1
        };
        var completed = completingNavigator.Evaluate(
            ProofWithRaw(180, killAt179Pose),
            CombatInput(
                180,
                killAt179Pose,
                new PostComputerRoomCombatObservation(),
                Actor(
                    7,
                    2944,
                    -3120,
                    health: 0,
                    flags: 0x00400000,
                    sectorIndex: 60)));

        Assert.Equal(PostComputerRoomRouteState.FireReady, acquired.State);
        Assert.True(acquired.Action.AttackKey);
        Assert.False(acquired.Completed);
        Assert.Equal(PostComputerRoomRouteState.Complete, completed.State);
        Assert.True(completed.Completed);
        Assert.True(completed.Navigation.NativeActorKillConfirmed);
        Assert.Equal(179, completed.Navigation.NativeActorEngagementFrames);
        Assert.False(completed.Navigation.NativeWeaponContinuationArmed);
        Assert.False(completed.Navigation.NativeWeaponAttackContinuation);

        var failingNavigator = new PostComputerRoomRouteNavigator();
        AcquireAtSector60(failingNavigator, pose);
        var killAt180Pose = pose with
        {
            NativeGametic = 281,
            PlayerKillCount = 1
        };
        var failed = failingNavigator.Evaluate(
            ProofWithRaw(181, killAt180Pose),
            CombatInput(
                181,
                killAt180Pose,
                new PostComputerRoomCombatObservation(),
                Actor(
                    7,
                    2944,
                    -3120,
                    health: 0,
                    flags: 0x00400000,
                    sectorIndex: 60)));

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal("post-computer-room-combat-budget-exhausted", failed.ReasonCode);
        Assert.True(failed.Navigation.NativeActorKillConfirmed);
        Assert.Equal(180, failed.Navigation.NativeActorEngagementFrames);
        Assert.False(failed.Completed);
        Assert.False(failed.Navigation.NativeWeaponContinuationArmed);
        Assert.False(failed.Navigation.NativeWeaponAttackContinuation);
    }

    [Fact]
    public void Sector60FireContinuation_AliveAt180StillFreezesNeutralFailureEvidence()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(2944, -3024, 270, 60) with { NativeGametic = 101 };
        var actor = Actor(7, 2944, -3120, health: 5, sectorIndex: 60);
        navigator.Evaluate(
            ProofWithRaw(1, pose),
            CombatInput(
                1,
                pose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                actor));
        var busyPose = pose with { NativeGametic = 102 };
        var continued = navigator.Evaluate(
            ProofWithRaw(2, busyPose),
            CombatInput(2, busyPose, new(), actor) with
            {
                WeaponSnapshot = WeaponSnapshot(102, weaponState: 101)
            });
        Assert.True(continued.Navigation.NativeWeaponAttackContinuation);

        var deadlinePose = pose with { NativeGametic = 281 };
        var failed = navigator.Evaluate(
            ProofWithRaw(181, deadlinePose),
            CombatInput(181, deadlinePose, new(), actor) with
            {
                WeaponSnapshot = WeaponSnapshot(281, weaponState: 101)
            });

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal("post-computer-room-combat-budget-exhausted", failed.ReasonCode);
        Assert.Equal(180, failed.Navigation.NativeActorEngagementFrames);
        Assert.True(IsNeutral(failed.Action));
        Assert.False(failed.Navigation.NativeWeaponContinuationArmed);
        Assert.False(failed.Navigation.NativeWeaponAttackContinuation);
        Assert.Contains(
            failed.FailureTrace.Replay,
            entry => entry.ControlTick == 2
                && entry.NativeWeaponContinuationArmed
                && entry.NativeWeaponAttackContinuation
                && entry.Action.AttackKey
                && Math.Abs(entry.NativeActorTargetBearingErrorDegrees) <= 0.001);
        Assert.False(failed.FailureTrace.FailureSnapshot!.NativeWeaponContinuationArmed);
        Assert.False(failed.FailureTrace.FailureSnapshot.NativeWeaponAttackContinuation);
        Assert.True(IsNeutral(failed.FailureTrace.FailureSnapshot.Action));
    }

    [Theory]
    [InlineData(2454.704, -2659.835, 0, 7, 2544, -2640, 0, 54, 5, "sector-54-diagonal")]
    [InlineData(2768, -2720, 0, 53, 2880, -2840, 270, 71, 7, "sector-71-south-lane")]
    [InlineData(2880, -2840, 270, 71, 2944, -3024, 270, 60, 8, "central-hall-entry")]
    public void SectorCrossingWithSameTickCombat_UsesTheNewCanonicalLeg(
        double startX,
        double startY,
        double startHeading,
        int startSector,
        double crossingX,
        double crossingY,
        double crossingHeading,
        int crossingSector,
        int expectedLegIndex,
        string expectedLegId)
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var startPose = Pose(startX, startY, startHeading, startSector) with
        {
            NativeGametic = 101
        };
        navigator.Evaluate(
            ProofWithRaw(1, startPose),
            CombatInput(1, startPose, new PostComputerRoomCombatObservation()));

        var crossingPose = Pose(
            crossingX,
            crossingY,
            crossingHeading,
            crossingSector) with
        {
            NativeGametic = 102
        };
        var actor = ActorAtBearingError(7, crossingPose, 0, 96);
        var decision = navigator.Evaluate(
            ProofWithRaw(2, crossingPose),
            CombatInput(
                2,
                crossingPose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                actor));

        Assert.Equal(PostComputerRoomRouteState.FireReady, decision.State);
        Assert.True(decision.Action.AttackKey);
        Assert.Equal(expectedLegIndex, decision.Navigation.LegIndex);
        Assert.Equal(expectedLegId, decision.Navigation.LegId);
    }

    [Fact]
    public void TruncatedActorSnapshot_CannotAcquireCombatOwner()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var pose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        var input = CombatInput(
            1,
            pose,
            new PostComputerRoomCombatObservation
            {
                VisualEnemyVisible = true,
                VisualEnemyCentered = true,
                EnemyConfidence = 0.92
            },
            Actor(7, 1856, -2512)) with
        {
            ActorSnapshot = ActorSnapshot(101, Actor(7, 1856, -2512)) with
            {
                Truncated = true
            }
        };

        var decision = navigator.Evaluate(ProofWithRaw(1, pose), input);

        Assert.False(decision.Navigation.NativeActorSnapshotAccepted);
        Assert.False(decision.Navigation.NativeActorCombatTrusted);
        Assert.Equal("native-actor-snapshot-truncated", decision.Navigation.NativeActorCombatReason);
        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, decision.State);
        Assert.False(decision.Action.AttackKey);
    }

    [Fact]
    public void CombatBudgetFailure_FreezesExactFailureTickAndBoundedReplay()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var startPose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        navigator.Evaluate(
            ProofWithRaw(1, startPose),
            CombatInput(
                1,
                startPose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 1856, -2512)));

        var timeoutPose = startPose with { NativeGametic = 281 };
        var failed = navigator.Evaluate(
            ProofWithRaw(181, timeoutPose),
            CombatInput(
                181,
                timeoutPose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 1856, -2512)));

        var laterPose = timeoutPose with { NativeGametic = 500 };
        var projected = navigator.Evaluate(
            ProofWithRaw(400, laterPose),
            CombatInput(
                400,
                laterPose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 1856, -2512)));

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal("post-computer-room-combat-budget-exhausted", failed.ReasonCode);
        Assert.True(failed.FailureTrace.Failed);
        Assert.Equal(181, failed.FailureTrace.FailureAtControlTick);
        Assert.Equal(181, failed.FailureTrace.FailureSnapshot?.ControlTick);
        Assert.InRange(failed.FailureTrace.Replay.Count, 1, PostComputerRoomFailureTrace.ReplayCapacity);
        Assert.Equal(7, failed.FailureTrace.FailureSnapshot?.NativeActorTargetSectorIndex);
        Assert.True(failed.FailureTrace.FailureSnapshot?.NativeActorTopologyAccepted);
        Assert.Equal(
            "native-actor-topology-local",
            failed.FailureTrace.FailureSnapshot?.NativeActorTopologyReason);
        Assert.Equal(180, failed.FailureTrace.FailureSnapshot?.NativeActorEngagementFrames);
        Assert.True(failed.FailureTrace.FailureSnapshot?.NativeWeaponSnapshotAccepted);
        Assert.True(failed.FailureTrace.FailureSnapshot?.NativeWeaponSnapshotFresh);
        Assert.Equal(967, failed.FailureTrace.FailureSnapshot?.NativeWeaponStateCount);
        Assert.True(IsNeutral(failed.FailureTrace.FailureSnapshot!.Action));
        Assert.Contains(failed.FailureTrace.Replay, entry => entry.Action.AttackKey);

        Assert.Equal(181, projected.FailureTrace.FailureAtControlTick);
        Assert.Equal(
            failed.FailureTrace.Replay.Select(entry => entry.ControlTick),
            projected.FailureTrace.Replay.Select(entry => entry.ControlTick));
    }

    [Fact]
    public void CombatBudgetFailure_CannotBeBypassedByKillConfirmationAtDeadline()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var startPose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        navigator.Evaluate(
            ProofWithRaw(1, startPose),
            CombatInput(
                1,
                startPose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 1856, -2512)));

        var deadlinePose = startPose with
        {
            NativeGametic = 281,
            PlayerKillCount = 1
        };
        var failed = navigator.Evaluate(
            ProofWithRaw(181, deadlinePose),
            CombatInput(
                181,
                deadlinePose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 1856, -2512, health: 0, flags: 0x00400000)));

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal("post-computer-room-combat-budget-exhausted", failed.ReasonCode);
        Assert.Equal(180, failed.Navigation.NativeActorEngagementFrames);
        Assert.True(failed.Navigation.NativeActorKillConfirmed);
        Assert.Equal(181, failed.FailureTrace.FailureAtControlTick);
    }

    [Fact]
    public void FailureReplay_CanonicalizesRepeatedControlTicksBeforeFreeze()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var startPose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        var proof = ProofWithRaw(1, startPose);
        var input = CombatInput(
            1,
            startPose,
            new PostComputerRoomCombatObservation
            {
                VisualEnemyVisible = true,
                VisualEnemyCentered = true,
                EnemyConfidence = 0.42
            },
            Actor(7, 1856, -2512));
        var first = navigator.Evaluate(proof, input);
        var duplicate = navigator.Evaluate(proof, input);

        var timeoutPose = startPose with { NativeGametic = 281 };
        var failed = navigator.Evaluate(
            ProofWithRaw(181, timeoutPose),
            CombatInput(
                181,
                timeoutPose,
                new PostComputerRoomCombatObservation(),
                Actor(7, 1856, -2512)));

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Same(first, duplicate);
        Assert.Equal(
            failed.FailureTrace.Replay.Count,
            failed.FailureTrace.Replay.Select(entry => entry.ControlTick).Distinct().Count());
        Assert.True(
            failed.FailureTrace.Replay
                .Zip(failed.FailureTrace.Replay.Skip(1))
                .All(pair => pair.First.ControlTick < pair.Second.ControlTick));
    }

    [Fact]
    public void RepeatedMissingPoseAtSameControlTick_IsIdempotentAndDoesNotConsumeBudget()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var startPose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        navigator.Evaluate(ProofWithRaw(1, startPose), CombatInput(1, startPose, new()));
        var missingPose = startPose with { Fresh = false, NativeGametic = 102 };
        var proof = ProofWithRaw(2, missingPose);
        var input = CombatInput(2, missingPose, new PostComputerRoomCombatObservation());

        var first = navigator.Evaluate(proof, input);
        for (var repeat = 0; repeat < 40; repeat++)
        {
            Assert.Same(first, navigator.Evaluate(proof, input));
        }

        Assert.Equal(PostComputerRoomRouteState.NavigateMainRoute, first.State);
        Assert.Equal(1, first.Navigation.PoseMissingFrames);
        Assert.False(first.FailureTrace.Failed);
    }

    [Fact]
    public void MissingPoseWhileCombatTargetRetained_StaysNeutralAndPreservesFailureEvidence()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var startPose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        navigator.Evaluate(
            ProofWithRaw(1, startPose),
            CombatInput(
                1,
                startPose,
                new PostComputerRoomCombatObservation
                {
                    VisualEnemyVisible = true,
                    VisualEnemyCentered = true,
                    EnemyConfidence = 0.42
                },
                Actor(7, 1856, -2512)));

        PostComputerRoomRouteDecision decision = new();
        for (var tick = 2; tick <= 31; tick++)
        {
            var unavailablePose = startPose with
            {
                Fresh = false,
                NativeGametic = 100 + tick
            };
            decision = navigator.Evaluate(
                ProofWithRaw(tick, unavailablePose),
                CombatInput(tick, unavailablePose, new PostComputerRoomCombatObservation()));
            Assert.False(decision.Action.MoveForward);
            Assert.False(decision.Action.AttackKey);
        }

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, decision.State);
        Assert.Equal(
            "post-computer-room-native-pose-missing-budget-exhausted",
            decision.ReasonCode);
        Assert.True(decision.Navigation.NativeActorTargetRetained);
        Assert.Equal(7, decision.Navigation.NativeActorTargetIdentity);
        Assert.Equal(7, decision.FailureTrace.FailureSnapshot?.NativeActorTargetIdentity);
    }

    [Fact]
    public void UnconfirmedEnemyAlcoveRecovery_IsBoundedThrough52_51_8_7ThenRoomHold()
    {
        var navigator = new PostComputerRoomRouteNavigator();

        var sector52 = navigator.Evaluate(Proof(1, Pose(2256, -2528, 180, 52)), Input(1));
        var sector51 = navigator.Evaluate(Proof(2, Pose(2192, -2528, 180, 51)), Input(2));
        var sector8 = navigator.Evaluate(Proof(3, Pose(2160, -2528, 180, 8)), Input(3));
        var sector7 = navigator.Evaluate(Proof(4, Pose(2112, -2528, 270, 7)), Input(4));
        var roomHold = navigator.Evaluate(Proof(5, Pose(1760, -2512, 180, 7)), Input(5));

        Assert.Equal("enemy-alcove-52-west-exit", sector52.Navigation.LegId);
        Assert.Equal("enemy-alcove-51-west-exit", sector51.Navigation.LegId);
        Assert.Equal("enemy-alcove-8-west-exit", sector8.Navigation.LegId);
        Assert.Equal("enemy-alcove-room-certification-recovery", sector7.Navigation.LegId);
        Assert.Equal(PostComputerRoomRouteState.AwaitComputerRoomConfirmation, roomHold.State);
        Assert.Equal("computer-room-confirmation-hold", roomHold.Navigation.LegId);
        Assert.All(
            new[] { sector52, sector51, sector8, sector7, roomHold },
            item => Assert.False(item.Action.AttackKey));
    }

    [Fact]
    public void ConfirmedEnemyAlcoveRecovery_UsesSouthDoglegBeforeMainRoute()
    {
        var navigator = new PostComputerRoomRouteNavigator();

        navigator.Evaluate(Proof(1, Pose(2256, -2528, 180, 52), true), Input(1));
        navigator.Evaluate(Proof(2, Pose(2192, -2528, 180, 51), true), Input(2));
        navigator.Evaluate(Proof(3, Pose(2160, -2528, 180, 8), true), Input(3));
        var sector7 = navigator.Evaluate(Proof(4, Pose(2112, -2528, 270, 7), true), Input(4));

        Assert.Equal(PostComputerRoomRouteState.RecoverEnemyAlcove, sector7.State);
        Assert.Equal("enemy-alcove-south-clearance", sector7.Navigation.LegId);
        Assert.Equal(-1, sector7.Navigation.LegIndex);
    }

    [Fact]
    public void CompletionAtRoute899AndLeg179_FreezesTerminalClockSnapshotAndReplay()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var holdPose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        navigator.Evaluate(
            ProofWithRaw(1, holdPose, computerRoomConfirmed: false),
            CombatInput(1, holdPose, new PostComputerRoomCombatObservation()));

        var legStartPose = Pose(2880, -2928, 270, 71) with { NativeGametic = 821 };
        var legStart = navigator.Evaluate(
            ProofWithRaw(721, legStartPose),
            CombatInput(721, legStartPose, new PostComputerRoomCombatObservation()));
        Assert.Equal(720, legStart.Navigation.RouteFrames);
        Assert.Equal(0, legStart.Navigation.LegFrames);
        Assert.Equal("central-hall-entry", legStart.Navigation.LegId);

        var completionPose = Pose(2944, -3024, 270, 60) with { NativeGametic = 1_000 };
        var completed = navigator.Evaluate(
            ProofWithRaw(900, completionPose),
            CombatInput(900, completionPose, new PostComputerRoomCombatObservation()));

        Assert.Equal(PostComputerRoomRouteState.Complete, completed.State);
        Assert.True(completed.Completed);
        Assert.Equal(899, completed.Navigation.RouteFrames);
        Assert.Equal(1, completed.Navigation.RouteRemainingFrames);
        Assert.Equal(179, completed.Navigation.LegFrames);
        Assert.Equal(1, completed.Navigation.LegRemainingFrames);
        Assert.True(completed.CompletionTrace.Completed);
        Assert.Equal("session-1", completed.CompletionTrace.SessionId);
        Assert.Equal("run-1", completed.CompletionTrace.RunId);
        Assert.Equal(1, completed.CompletionTrace.RunGeneration);
        Assert.Equal(900, completed.CompletionTrace.CompletionAtControlTick);
        Assert.Equal("central-hall-entry-confirmed", completed.CompletionTrace.CompletionCode);
        Assert.NotNull(completed.CompletionTrace.CompletionSnapshot);
        Assert.Equal(900, completed.CompletionTrace.CompletionSnapshot!.ControlTick);
        Assert.Equal(899, completed.CompletionTrace.CompletionSnapshot.RouteFrames);
        Assert.Equal(179, completed.CompletionTrace.CompletionSnapshot.LegFrames);
        Assert.InRange(
            completed.CompletionTrace.Replay.Count,
            1,
            PostComputerRoomCompletionTrace.ReplayCapacity);
        Assert.Equal(
            completed.CompletionTrace.CompletionSnapshot,
            completed.CompletionTrace.Replay[^1]);
        Assert.False(completed.FailureTrace.Failed);

        var currentPose = Pose(3040, -3024, 0, 59) with { NativeGametic = 1_300 };
        var currentProof = ProofWithRaw(1_200, currentPose);
        var currentInput = CombatInput(
            1_200,
            currentPose,
            new PostComputerRoomCombatObservation());
        var projected = navigator.Evaluate(currentProof, currentInput);
        var duplicate = navigator.Evaluate(currentProof, currentInput);

        Assert.Same(projected, duplicate);
        Assert.Equal(1_200, projected.ControlTick);
        Assert.Equal(1_300, projected.NativeGametic);
        Assert.Equal(1_300, projected.Navigation.NativeGametic);
        Assert.Equal(currentPose.PlayerX, projected.Proximity.PlayerX);
        Assert.Equal(currentPose.PlayerY, projected.Navigation.PlayerY);
        Assert.Equal(59, projected.Proximity.PlayerSectorIndex);
        Assert.Equal(59, projected.Navigation.PlayerSectorIndex);
        Assert.Equal(60, projected.CompletionTrace.CompletionSnapshot!.PlayerSectorIndex);
        Assert.Equal(899, projected.Navigation.RouteFrames);
        Assert.Equal(1, projected.Navigation.RouteRemainingFrames);
        Assert.Equal(179, projected.Navigation.LegFrames);
        Assert.Equal(1, projected.Navigation.LegRemainingFrames);
        Assert.Equal(
            completed.CompletionTrace.CompletionSnapshot,
            projected.CompletionTrace.CompletionSnapshot);
        Assert.Equal("session-1", projected.CompletionTrace.SessionId);
        Assert.Equal("run-1", projected.CompletionTrace.RunId);
        Assert.Equal(1, projected.CompletionTrace.RunGeneration);
        Assert.Equal(
            completed.CompletionTrace.Replay.ToArray(),
            projected.CompletionTrace.Replay.ToArray());
        Assert.DoesNotContain(
            projected.CompletionTrace.Replay,
            entry => entry.ControlTick == 1_200);
    }

    [Fact]
    public void Sector60AtRoute900AndLeg180_FailsBeforeCompletionWithoutCompletionTrace()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var holdPose = Pose(1760, -2512, 0, 7) with { NativeGametic = 101 };
        navigator.Evaluate(
            ProofWithRaw(1, holdPose, computerRoomConfirmed: false),
            CombatInput(1, holdPose, new PostComputerRoomCombatObservation()));

        var legStartPose = Pose(2880, -2928, 270, 71) with { NativeGametic = 821 };
        navigator.Evaluate(
            ProofWithRaw(721, legStartPose),
            CombatInput(721, legStartPose, new PostComputerRoomCombatObservation()));

        var deadlinePose = Pose(2944, -3024, 270, 60) with { NativeGametic = 1_001 };
        var failed = navigator.Evaluate(
            ProofWithRaw(901, deadlinePose),
            CombatInput(901, deadlinePose, new PostComputerRoomCombatObservation()));

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal("post-computer-room-route-budget-exhausted", failed.ReasonCode);
        Assert.Equal(900, failed.Navigation.RouteFrames);
        Assert.Equal(180, failed.Navigation.LegFrames);
        Assert.True(failed.FailureTrace.Failed);
        Assert.False(failed.CompletionTrace.Completed);
        Assert.Equal(string.Empty, failed.CompletionTrace.SessionId);
        Assert.Equal(string.Empty, failed.CompletionTrace.RunId);
        Assert.Equal(0, failed.CompletionTrace.RunGeneration);
        Assert.Equal(-1, failed.CompletionTrace.CompletionAtControlTick);
        Assert.Equal(string.Empty, failed.CompletionTrace.CompletionCode);
        Assert.Null(failed.CompletionTrace.CompletionSnapshot);
        Assert.Empty(failed.CompletionTrace.Replay);
    }

    [Fact]
    public void Sector60AtLeg180_FailsBeforeCompletionWithoutCompletionTrace()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var legStartPose = Pose(2880, -2928, 270, 71) with { NativeGametic = 101 };
        var legStart = navigator.Evaluate(
            ProofWithRaw(1, legStartPose),
            CombatInput(1, legStartPose, new PostComputerRoomCombatObservation()));
        Assert.Equal("central-hall-entry", legStart.Navigation.LegId);
        Assert.Equal(0, legStart.Navigation.LegFrames);

        var deadlinePose = Pose(2944, -3024, 270, 60) with { NativeGametic = 281 };
        var failed = navigator.Evaluate(
            ProofWithRaw(181, deadlinePose),
            CombatInput(181, deadlinePose, new PostComputerRoomCombatObservation()));

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, failed.State);
        Assert.Equal(
            "post-computer-room-leg-budget-exhausted:central-hall-entry",
            failed.ReasonCode);
        Assert.Equal(180, failed.Navigation.RouteFrames);
        Assert.Equal(180, failed.Navigation.LegFrames);
        Assert.True(failed.FailureTrace.Failed);
        Assert.False(failed.CompletionTrace.Completed);
        Assert.Null(failed.CompletionTrace.CompletionSnapshot);
        Assert.Empty(failed.CompletionTrace.Replay);
    }

    [Fact]
    public void NewRunResetsFrozenCompletionTraceAndTerminalClock()
    {
        var navigator = new PostComputerRoomRouteNavigator();
        var completedPose = Pose(2944, -3024, 270, 60) with { NativeGametic = 101 };
        var completed = navigator.Evaluate(
            ProofWithRaw(1, completedPose),
            CombatInput(1, completedPose, new PostComputerRoomCombatObservation()));
        Assert.True(completed.CompletionTrace.Completed);
        Assert.False(completed.FailureTrace.Failed);

        var resetPose = Pose(1760, -2512, 0, 7) with { NativeGametic = 1 };
        var resetProof = ProofWithRaw(1, resetPose) with
        {
            SessionId = "session-2",
            RunId = "run-2",
            RunGeneration = 2
        };
        var resetInput = CombatInput(
            1,
            resetPose,
            new PostComputerRoomCombatObservation()) with
        {
            SessionId = "session-2",
            RunId = "run-2",
            RunGeneration = 2
        };
        var reset = navigator.Evaluate(resetProof, resetInput);

        Assert.False(reset.Completed);
        Assert.False(reset.CompletionTrace.Completed);
        Assert.Equal(string.Empty, reset.CompletionTrace.SessionId);
        Assert.Equal(string.Empty, reset.CompletionTrace.RunId);
        Assert.Equal(0, reset.CompletionTrace.RunGeneration);
        Assert.Equal(-1, reset.CompletionTrace.CompletionAtControlTick);
        Assert.Equal(string.Empty, reset.CompletionTrace.CompletionCode);
        Assert.Null(reset.CompletionTrace.CompletionSnapshot);
        Assert.Empty(reset.CompletionTrace.Replay);
        Assert.False(reset.FailureTrace.Failed);
        Assert.Equal(0, reset.Navigation.RouteFrames);
        Assert.Equal(0, reset.Navigation.LegFrames);

        var nextCompletionPose = Pose(2944, -3024, 270, 60) with { NativeGametic = 2 };
        var nextCompletionProof = ProofWithRaw(2, nextCompletionPose) with
        {
            SessionId = "session-2",
            RunId = "run-2",
            RunGeneration = 2
        };
        var nextCompletionInput = CombatInput(
            2,
            nextCompletionPose,
            new PostComputerRoomCombatObservation()) with
        {
            SessionId = "session-2",
            RunId = "run-2",
            RunGeneration = 2
        };
        var recompleted = navigator.Evaluate(nextCompletionProof, nextCompletionInput);

        Assert.True(recompleted.Completed);
        Assert.True(recompleted.CompletionTrace.Completed);
        Assert.Equal("session-2", recompleted.CompletionTrace.SessionId);
        Assert.Equal("run-2", recompleted.CompletionTrace.RunId);
        Assert.Equal(2, recompleted.CompletionTrace.RunGeneration);
        Assert.Equal(2, recompleted.CompletionTrace.CompletionAtControlTick);
        Assert.Equal(
            2,
            recompleted.CompletionTrace.CompletionSnapshot!.ControlTick);
        Assert.False(recompleted.FailureTrace.Failed);
    }

    [Fact]
    public void Sector60_CompletesAndHandsOff()
    {
        var navigator = new PostComputerRoomRouteNavigator();

        var decision = navigator.Evaluate(
            Proof(1, Pose(2944, -3024, 270, 60), computerRoomConfirmed: true),
            Input(1));

        Assert.Equal(PostComputerRoomRouteState.Complete, decision.State);
        Assert.Equal(PostComputerRoomOwnershipDisposition.Completed, decision.OwnershipDisposition);
        Assert.True(decision.Completed);
        Assert.False(decision.Exclusive);
        Assert.True(decision.SemanticProjection.CentralHallEntered);
    }

    [Fact]
    public void UnexpectedSideSector_FailsSafeWithoutLegacyRouteFallback()
    {
        var navigator = new PostComputerRoomRouteNavigator();

        var decision = navigator.Evaluate(
            Proof(1, Pose(1800, -2400, 0, 11)),
            Input(1));

        Assert.Equal(PostComputerRoomRouteState.FailedSafeStop, decision.State);
        Assert.Equal(PostComputerRoomOwnershipDisposition.FailedSafeStop, decision.OwnershipDisposition);
        Assert.True(decision.Exclusive);
        Assert.False(decision.Action.MoveForward);
        Assert.Contains("unexpected-sector:11", decision.ReasonCode, StringComparison.Ordinal);
    }

    private static BrowserPostComputerRoomRouteInput Input(long tick)
        => new()
        {
            ContractVersion = 2,
            SessionId = "session-1",
            RunId = "run-1",
            RunGeneration = 1,
            ExpectedFirstDoorControlTick = tick
        };

    private static PostComputerRoomActivationProof Proof(
        long tick,
        FirstDoorProximityObservation proximity,
        bool computerRoomConfirmed = false)
        => new()
        {
            SessionId = "session-1",
            RunId = "run-1",
            RunGeneration = 1,
            ControlTick = tick,
            FirstDoorState = computerRoomConfirmed
                ? FirstDoorControlState.Complete
                : FirstDoorControlState.AwaitComputerRoom,
            FirstDoorOwnershipDisposition = computerRoomConfirmed
                ? FirstDoorOwnershipDisposition.Completed
                : FirstDoorOwnershipDisposition.HandOff,
            OpenConfirmed = true,
            OpenConfirmationSource = FirstDoorOpenConfirmationSource.TrustedAudio,
            ComputerRoomConfirmed = computerRoomConfirmed,
            Proximity = proximity
        };

    private static PostComputerRoomRouteDecision EvaluateStructured(
        PostComputerRoomRouteNavigator navigator,
        long tick,
        long rawFrameSequence,
        IReadOnlyList<double> sample,
        bool rawFresh = true,
        bool enemyStructuralDecoy = false,
        long? nativeGametic = null,
        long? inputFrameSequence = null,
        long runGeneration = 1,
        double actorX = 1856,
        double actorY = -2512,
        bool includeLiveActor = true,
        IReadOnlyList<PostComputerRoomNativeActorFact>? actors = null)
    {
        var currentNativeGametic = nativeGametic ?? (1_000 + tick);
        var proximity = Pose(1760, -2512, 0, 7) with
        {
            NativeGametic = currentNativeGametic
        };
        var runId = runGeneration == 1 ? "run-1" : $"run-{runGeneration}";
        var proof = Proof(tick, proximity, computerRoomConfirmed: true) with
        {
            RunId = runId,
            RunGeneration = runGeneration,
            RawFrame = new PostComputerRoomRawFrameProof
            {
                Available = true,
                Fresh = rawFresh,
                FrameSequence = rawFrameSequence,
                NativeGameticObservedAtEvaluation = currentNativeGametic,
                ObservationHash = $"frame-{rawFrameSequence}"
            }
        };
        var input = Input(tick) with
        {
            RunId = runId,
            RunGeneration = runGeneration,
            CombatObservation = new PostComputerRoomCombatObservation
            {
                RawFrameSequence = inputFrameSequence ?? rawFrameSequence,
                RawNativeGametic = currentNativeGametic,
                EnemyRegion9Sample = sample.ToArray(),
                EnemyStructuralDecoy = enemyStructuralDecoy
            },
            ActorSnapshot = includeLiveActor
                ? ActorSnapshot(
                    currentNativeGametic,
                    actors?.ToArray() ?? [Actor(7, actorX, actorY)])
                : new PostComputerRoomNativeActorSnapshot(),
            WeaponSnapshot = WeaponSnapshot(currentNativeGametic)
        };
        return navigator.Evaluate(proof, input);
    }

    private static FirstDoorProximityObservation Pose(
        double x,
        double y,
        double heading,
        int sector)
        => new()
        {
            InputAccepted = true,
            Available = true,
            Fresh = true,
            Truth = FirstDoorEvidenceTruth.Yes,
            WadContentSha256 = FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
            WadVerified = true,
            NativeGametic = 100,
            NativeGameState = 0,
            NativeGameEpisode = 1,
            NativeGameMap = 1,
            PlayerVitalityFactsAvailable = true,
            PlayerHealth = 100,
            PlayerState = 0,
            PlayerKillCount = 0,
            PlayerX = x,
            PlayerY = y,
            HeadingDegrees = heading,
            PlayerSectorIndex = sector
        };

    private static PostComputerRoomActivationProof ProofWithRaw(
        long tick,
        FirstDoorProximityObservation proximity,
        bool computerRoomConfirmed = true)
        => Proof(tick, proximity, computerRoomConfirmed) with
        {
            RawFrame = new PostComputerRoomRawFrameProof
            {
                Available = true,
                Fresh = true,
                FrameSequence = tick,
                NativeGameticObservedAtEvaluation = proximity.NativeGametic,
                ObservationHash = $"raw-{tick}-{proximity.NativeGametic}"
            }
        };

    private static BrowserPostComputerRoomRouteInput CombatInput(
        long tick,
        FirstDoorProximityObservation proximity,
        PostComputerRoomCombatObservation combat,
        params PostComputerRoomNativeActorFact[] actors)
        => Input(tick) with
        {
            CombatObservation = combat,
            ActorSnapshot = ActorSnapshot(proximity.NativeGametic, actors),
            WeaponSnapshot = WeaponSnapshot(proximity.NativeGametic)
        };

    private static PostComputerRoomNativeWeaponSnapshot WeaponSnapshot(
        long nativeGametic,
        int stateCount = 967,
        int weaponState = 100,
        int weaponReadyState = 100,
        int refire = 0,
        int readyWeapon = 1,
        int pendingWeapon = 10)
        => new()
        {
            Available = true,
            Gametic = nativeGametic,
            StateCount = stateCount,
            ReadyWeapon = readyWeapon,
            PendingWeapon = pendingWeapon,
            WeaponState = weaponState,
            WeaponReadyState = weaponReadyState,
            Refire = refire
        };

    private static PostComputerRoomNativeActorSnapshot ActorSnapshot(
        long nativeGametic,
        params PostComputerRoomNativeActorFact[] actors)
        => new()
        {
            Available = true,
            Gametic = nativeGametic,
            Count = actors.Length,
            Capacity = 64,
            Truncated = false,
            Actors = actors.ToArray()
        };

    private static PostComputerRoomNativeActorFact Actor(
        long identity,
        double x,
        double y,
        int health = 20,
        long flags = 0x00400004,
        bool lineOfSight = true,
        int sectorIndex = 7)
        => new()
        {
            Identity = identity,
            XFixed = (long)Math.Round(x * 65536d),
            YFixed = (long)Math.Round(y * 65536d),
            SectorIndex = sectorIndex,
            Type = 3004,
            Health = health,
            Flags = flags,
            LineOfSight = lineOfSight
        };

    private static PostComputerRoomNativeActorFact ActorAtBearingError(
        long identity,
        FirstDoorProximityObservation pose,
        double bearingErrorDegrees,
        double distance)
    {
        var targetBearingDegrees = pose.HeadingDegrees - bearingErrorDegrees;
        var radians = targetBearingDegrees * Math.PI / 180d;
        return Actor(
            identity,
            pose.PlayerX + (Math.Cos(radians) * distance),
            pose.PlayerY + (Math.Sin(radians) * distance),
            sectorIndex: pose.PlayerSectorIndex);
    }

    private static bool IsNeutral(ActionCommand action)
        => !action.MoveForward
            && !action.MoveBackward
            && !action.StrafeLeft
            && !action.StrafeRight
            && action.TurnYaw == 0
            && !action.UseKey
            && !action.AttackKey;

    private static bool IsStationary(ActionCommand action)
        => !action.MoveForward
            && !action.MoveBackward
            && !action.StrafeLeft
            && !action.StrafeRight
            && action.TurnYaw == 0
            && !action.UseKey;

    private static void AssertWaypoint(
        PostComputerRoomRouteWaypoint point,
        int index,
        double x,
        double y,
        params int[] sectors)
    {
        Assert.Equal(index, point.Index);
        Assert.Equal(x, point.X);
        Assert.Equal(y, point.Y);
        Assert.Equal(sectors, point.AllowedSectors);
    }
}
