using System.Globalization;
using System.Security.Cryptography;
using System.Text;

namespace AIKernel.Doom.Provider.Autoplay;

internal enum FirstDoorOpeningNavigationStatus
{
    NotStarted,
    WaitingForPose,
    Navigating,
    Realigning,
    ReturningToCertifiedWaypoint,
    SightlineAlign,
    ReadyForAcquisition,
    Failed
}

internal enum FirstDoorOpeningNavigationBlockCode
{
    None,
    ControlNotReady,
    ProximityUnavailable,
    DuplicatePose,
    PoseRewind,
    WrongContentOrMap,
    WaypointPending,
    BearingAlignmentPending,
    PortalEvidencePending,
    CrossTrackExceeded,
    ProgressWindowPending,
    StallDetected,
    RecoveryInProgress,
    SightlineBearingPending,
    StationaryProofPending,
    AcquisitionEvidencePending,
    SightlineBudgetExhausted,
    PoseMissingBudgetExhausted,
    LegBudgetExhausted,
    RouteBudgetExhausted,
    RecoveryBudgetExhausted,
    InvalidState,
    InvalidPolicy
}

internal sealed record FirstDoorOpeningWaypoint
{
    public int Index { get; init; }

    public string Id { get; init; } = string.Empty;

    public double X { get; init; }

    public double Y { get; init; }

    public IReadOnlyList<int> AllowedSectors { get; init; } = Array.Empty<int>();

    public bool RequiresPortal149NorthSide { get; init; }

    public bool CertifiesDoorSightline { get; init; }
}

internal sealed record FirstDoorOpeningNavigationPolicy
{
    internal const string GeometryVersion = "e1m1-first-door-opening-route-v1";

    public string PolicyVersion { get; init; } = "first-door-opening-navigation-v1";

    public double PlayerRadius { get; init; } = 16d;

    public double BarrelRadius { get; init; } = 10d;

    public double PortalInset { get; init; } = 24d;

    public double WaypointCompletionRadius { get; init; } = 16d;

    public double MaximumCrossTrackDistance { get; init; } = 24d;

    public double MinimumProgressDistance { get; init; } = 16d;

    public double AlignmentToleranceDegrees { get; init; } = 4d;

    public double StationaryMomentumMaximum { get; init; } = 0.5d;

    public int DefaultTurnYaw { get; init; } = 6;

    public int MaximumTurnYaw { get; init; } = 12;

    public int RouteTimeoutFrames { get; init; } = 480;

    public int LegTimeoutFrames { get; init; } = 180;

    public int MaximumPoseMissingFrames { get; init; } = 30;

    public int ProgressWindowForwardSamples { get; init; } = 30;

    public int SightlineTimeoutFrames { get; init; } = 60;

    public int ForcedStopFrames { get; init; } = 2;

    public int MaximumRecoveries { get; init; } = 2;

    public IReadOnlyList<FirstDoorOpeningWaypoint> Waypoints { get; init; }
        = CanonicalWaypoints;

    internal static IReadOnlyList<FirstDoorOpeningWaypoint> CanonicalWaypoints { get; }
        = Array.AsReadOnly(new FirstDoorOpeningWaypoint[]
        {
            Waypoint(0, "spawn-north-lane", 1056d, -3008d, 38),
            Waypoint(1, "portal-149-south-approach", 1280d, -3008d, 38),
            Waypoint(2, "portal-149-north-crossing", 1280d, -2848d, 2, portal149: true),
            Waypoint(3, "sector-2-corridor-bend", 1280d, -2640d, 2),
            Waypoint(4, "first-door-sightline", 1360d, -2528d, 2, sightline: true)
        });

    private static FirstDoorOpeningWaypoint Waypoint(
        int index,
        string id,
        double x,
        double y,
        int sector,
        bool portal149 = false,
        bool sightline = false)
        => new()
        {
            Index = index,
            Id = id,
            X = x,
            Y = y,
            AllowedSectors = Array.AsReadOnly(new[] { sector }),
            RequiresPortal149NorthSide = portal149,
            CertifiesDoorSightline = sightline
        };
}

internal sealed record FirstDoorOpeningNavigationState
{
    public bool Active { get; init; }

    public int LegIndex { get; init; }

    public long RouteStartedAtControlTick { get; init; }

    public long LegStartedAtControlTick { get; init; }

    public long LastNativeGametic { get; init; } = -1;

    public int PoseMissingFrames { get; init; }

    public int ForwardProgressSamples { get; init; }

    public double ProgressWindowStartDistance { get; init; }

    public int RealignAttemptsForLeg { get; init; }

    public int ForcedStopFramesRemaining { get; init; }

    public int RecoveryCount { get; init; }

    public bool ReturningToCertifiedWaypoint { get; init; }

    public int RecoveryWaypointIndex { get; init; } = -1;

    public int ResumeLegIndex { get; init; } = -1;

    public bool DoorSightlineCertified { get; init; }

    public long SightlineStartedAtControlTick { get; init; } = -1;

    public int SightlineFrames { get; init; }

    public bool Failed { get; init; }

    public string FailureCode { get; init; } = string.Empty;

    public FirstDoorOpeningNavigationBlockCode FailureBlockCode { get; init; }
}

internal sealed record FirstDoorOpeningNavigationInput
{
    public bool ControlReady { get; init; }

    public long ControlTick { get; init; }

    public bool AcquisitionReady { get; init; }

    public FirstDoorProximityObservation Proximity { get; init; } = new();
}

internal sealed record FirstDoorOpeningNavigationSnapshot
{
    public int SnapshotVersion { get; init; } = 1;

    public string GeometryVersion { get; init; } = FirstDoorOpeningNavigationPolicy.GeometryVersion;

    public string PolicyVersion { get; init; } = string.Empty;

    public string GeometryHash { get; init; } = string.Empty;

    public string WadContentSha256 { get; init; } = string.Empty;

    public FirstDoorOpeningNavigationStatus Status { get; init; }

    public FirstDoorOpeningNavigationBlockCode BlockCode { get; init; }

    public bool Active { get; init; }

    public int LegIndex { get; init; }

    public string LegId { get; init; } = string.Empty;

    public double LegStartX { get; init; }

    public double LegStartY { get; init; }

    public double TargetX { get; init; }

    public double TargetY { get; init; }

    public IReadOnlyList<int> AllowedSectors { get; init; } = Array.Empty<int>();

    public double PlayerRadius { get; init; }

    public double BarrelRadius { get; init; }

    public double PortalInset { get; init; }

    public double WaypointCompletionRadius { get; init; }

    public double MaximumCrossTrackDistance { get; init; }

    public double AlignmentToleranceDegrees { get; init; }

    public int DefaultTurnYaw { get; init; }

    public int MaximumTurnYaw { get; init; }

    public long NativeGametic { get; init; } = -1;

    public double PlayerX { get; init; }

    public double PlayerY { get; init; }

    public double HeadingDegrees { get; init; }

    public int PlayerSectorIndex { get; init; } = -1;

    public double TargetDistance { get; init; }

    public double TargetBearingDegrees { get; init; }

    public double BearingErrorDegrees { get; init; }

    public double DoorDistanceToSegment { get; init; }

    public double DoorBearingDegrees { get; init; }

    public double DoorBearingErrorDegrees { get; init; }

    public double AlongTrackDistance { get; init; }

    public double CrossTrackDistance { get; init; }

    public double Portal149SignedSide { get; init; }

    public bool PortalEvidenceSatisfied { get; init; }

    public double Portal150IntersectionY { get; init; }

    public bool Portal150EvidenceSatisfied { get; init; }

    public double PlayerMomentumX { get; init; }

    public double PlayerMomentumY { get; init; }

    public double StationaryMomentumMaximum { get; init; }

    public bool Stationary { get; init; }

    public bool DoorSightlineCertified { get; init; }

    public bool StationaryBearingAligned { get; init; }

    public bool ReadyForAcquisition { get; init; }

    public int RouteFrames { get; init; }

    public int RouteTimeoutFrames { get; init; }

    public int RouteRemainingFrames { get; init; }

    public int LegFrames { get; init; }

    public int LegTimeoutFrames { get; init; }

    public int LegRemainingFrames { get; init; }

    public int PoseMissingFrames { get; init; }

    public int MaximumPoseMissingFrames { get; init; }

    public int ForwardProgressSamples { get; init; }

    public int RequiredProgressSamples { get; init; }

    public double ProgressWindowStartDistance { get; init; }

    public double MinimumProgressDistance { get; init; }

    public int RecoveryCount { get; init; }

    public int MaximumRecoveries { get; init; }

    public int RealignAttemptsForLeg { get; init; }

    public int ForcedStopFrames { get; init; }

    public int ForcedStopFramesRemaining { get; init; }

    public bool ReturningToCertifiedWaypoint { get; init; }

    public int RecoveryWaypointIndex { get; init; } = -1;

    public int ResumeLegIndex { get; init; } = -1;

    public long SightlineStartedAtControlTick { get; init; } = -1;

    public int SightlineFrames { get; init; }

    public int SightlineTimeoutFrames { get; init; }

    public ActionCommand Action { get; init; } = NeutralAction();

    public string FailureCode { get; init; } = string.Empty;

    public string ObservationHash { get; init; } = string.Empty;

    private static ActionCommand NeutralAction()
        => new(false, false, false, false, 0, false, false);
}

internal sealed record FirstDoorOpeningNavigationTransition
{
    public FirstDoorOpeningNavigationState State { get; init; } = new();

    public FirstDoorOpeningNavigationSnapshot Snapshot { get; init; } = new();

    public ActionCommand Action { get; init; } = NeutralAction();

    private static ActionCommand NeutralAction()
        => new(false, false, false, false, 0, false, false);
}

internal static class FirstDoorOpeningNavigator
{
    private const double Portal149Y = -2880d;
    private const double Portal150X = 1472d;
    private const double Portal150MinimumY = -2560d;
    private const double Portal150MaximumY = -2432d;
    private const double CanonicalStartX = 1056d;
    private const double CanonicalStartY = -3616d;

    internal static FirstDoorOpeningNavigationTransition EvaluateTransition(
        FirstDoorOpeningNavigationState prior,
        FirstDoorOpeningNavigationInput input,
        FirstDoorOpeningNavigationPolicy? policy = null)
    {
        ArgumentNullException.ThrowIfNull(prior);
        ArgumentNullException.ThrowIfNull(input);
        policy ??= new FirstDoorOpeningNavigationPolicy();
        input = input.Proximity is null
            ? input with { Proximity = new FirstDoorProximityObservation() }
            : input;

        var policyError = ValidatePolicy(policy);
        if (policyError is not null)
        {
            return Failed(
                prior,
                input,
                new FirstDoorOpeningNavigationPolicy(),
                policyError,
                FirstDoorOpeningNavigationBlockCode.InvalidPolicy);
        }

        if (prior.Failed)
        {
            return Failed(prior, input, policy, prior.FailureCode, prior.FailureBlockCode);
        }

        var stateError = ValidateState(prior, policy);
        if (stateError is not null)
        {
            return Failed(
                prior,
                input,
                policy,
                stateError,
                FirstDoorOpeningNavigationBlockCode.InvalidState);
        }

        if (!input.ControlReady)
        {
            if (prior.Active)
            {
                return Failed(
                    prior,
                    input,
                    policy,
                    "opening-navigation-control-readiness-lost",
                    FirstDoorOpeningNavigationBlockCode.ControlNotReady);
            }

            return Project(
                prior,
                input,
                policy,
                FirstDoorOpeningNavigationStatus.NotStarted,
                FirstDoorOpeningNavigationBlockCode.ControlNotReady,
                NeutralAction());
        }

        var proximity = input.Proximity ?? new FirstDoorProximityObservation();
        var scopeValid = proximity.InputAccepted
            && proximity.WadVerified
            && string.Equals(
                proximity.WadContentSha256,
                FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
                StringComparison.OrdinalIgnoreCase)
            && proximity.NativeGameState == 0
            && proximity.NativeGameEpisode == 1
            && proximity.NativeGameMap == 1;
        var state = prior.Active
            ? prior
            : prior with
            {
                Active = true,
                LegIndex = 0,
                RouteStartedAtControlTick = input.ControlTick,
                LegStartedAtControlTick = input.ControlTick,
                LastNativeGametic = -1,
                PoseMissingFrames = 0
            };
        if (!ProximityNumbersFinite(proximity))
        {
            return Failed(
                state,
                input,
                policy,
                "opening-navigation-nonfinite-proximity",
                FirstDoorOpeningNavigationBlockCode.InvalidState);
        }

        if (KnownScopeContradiction(proximity, scopeValid))
        {
            return Failed(
                state,
                input,
                policy,
                "opening-navigation-wrong-content-or-map",
                FirstDoorOpeningNavigationBlockCode.WrongContentOrMap);
        }

        state = AdvanceSightlineClock(state, input.ControlTick);

        var routeFrames = Frames(input.ControlTick, state.RouteStartedAtControlTick);
        if (routeFrames >= policy.RouteTimeoutFrames)
        {
            var inclusiveCompletion = routeFrames == policy.RouteTimeoutFrames
                ? TryCompleteAtRouteDeadline(state, input, policy, scopeValid)
                : null;
            if (inclusiveCompletion is not null)
            {
                return inclusiveCompletion;
            }

            return Failed(
                state,
                input,
                policy,
                "opening-navigation-route-budget-exhausted",
                FirstDoorOpeningNavigationBlockCode.RouteBudgetExhausted);
        }

        if (scopeValid
            && state.LastNativeGametic >= 0
            && proximity.NativeGametic < state.LastNativeGametic)
        {
            return Failed(
                state,
                input,
                policy,
                "opening-navigation-pose-rewind",
                FirstDoorOpeningNavigationBlockCode.PoseRewind);
        }

        if (state.SightlineStartedAtControlTick >= 0
            && state.SightlineFrames > policy.SightlineTimeoutFrames)
        {
            return Failed(
                state,
                input,
                policy,
                "opening-navigation-sightline-budget-exhausted",
                FirstDoorOpeningNavigationBlockCode.SightlineBudgetExhausted);
        }

        if (scopeValid
            && state.LastNativeGametic >= 0
            && proximity.NativeGametic == state.LastNativeGametic)
        {
            var missing = state.PoseMissingFrames == int.MaxValue
                ? int.MaxValue
                : state.PoseMissingFrames + 1;
            var duplicate = state with { PoseMissingFrames = missing };
            if (duplicate.SightlineStartedAtControlTick >= 0
                && duplicate.SightlineFrames >= policy.SightlineTimeoutFrames)
            {
                return Failed(
                    duplicate,
                    input,
                    policy,
                    "opening-navigation-sightline-budget-exhausted",
                    FirstDoorOpeningNavigationBlockCode.SightlineBudgetExhausted);
            }

            if (missing >= policy.MaximumPoseMissingFrames)
            {
                return Failed(
                    duplicate,
                    input,
                    policy,
                    "opening-navigation-pose-missing-budget-exhausted",
                    FirstDoorOpeningNavigationBlockCode.PoseMissingBudgetExhausted);
            }

            return Project(
                duplicate,
                input,
                policy,
                FirstDoorOpeningNavigationStatus.WaitingForPose,
                FirstDoorOpeningNavigationBlockCode.DuplicatePose,
                NeutralAction());
        }

        if (!proximity.Available || !proximity.Fresh || !scopeValid)
        {
            var missing = state.PoseMissingFrames == int.MaxValue
                ? int.MaxValue
                : state.PoseMissingFrames + 1;
            var next = state with { PoseMissingFrames = missing };
            if (next.SightlineStartedAtControlTick >= 0
                && next.SightlineFrames >= policy.SightlineTimeoutFrames)
            {
                return Failed(
                    next,
                    input,
                    policy,
                    "opening-navigation-sightline-budget-exhausted",
                    FirstDoorOpeningNavigationBlockCode.SightlineBudgetExhausted);
            }

            if (missing >= policy.MaximumPoseMissingFrames)
            {
                return Failed(
                    next,
                    input,
                    policy,
                    "opening-navigation-pose-missing-budget-exhausted",
                    FirstDoorOpeningNavigationBlockCode.PoseMissingBudgetExhausted);
            }

            return Project(
                next,
                input,
                policy,
                FirstDoorOpeningNavigationStatus.WaitingForPose,
                FirstDoorOpeningNavigationBlockCode.ProximityUnavailable,
                NeutralAction());
        }

        state = state with
        {
            PoseMissingFrames = 0,
            LastNativeGametic = proximity.NativeGametic
        };

        if (state.SightlineStartedAtControlTick >= 0
            && state.SightlineFrames >= policy.SightlineTimeoutFrames
            && (state.ReturningToCertifiedWaypoint || state.ForcedStopFramesRemaining > 0))
        {
            return Failed(
                state,
                input,
                policy,
                "opening-navigation-sightline-budget-exhausted",
                FirstDoorOpeningNavigationBlockCode.SightlineBudgetExhausted);
        }

        if (state.ReturningToCertifiedWaypoint)
        {
            return EvaluateRecovery(state, input, policy);
        }

        if (state.ForcedStopFramesRemaining > 0)
        {
            var stopped = state with
            {
                ForcedStopFramesRemaining = state.ForcedStopFramesRemaining - 1
            };
            return Project(
                stopped,
                input,
                policy,
                FirstDoorOpeningNavigationStatus.Realigning,
                FirstDoorOpeningNavigationBlockCode.StallDetected,
                NeutralAction());
        }

        if (state.SightlineStartedAtControlTick >= 0)
        {
            return EvaluateSightline(state, input, policy);
        }

        var waypoint = policy.Waypoints[state.LegIndex];
        var metrics = Metrics(state.LegIndex, waypoint, proximity, policy);
        var legFrames = Frames(input.ControlTick, state.LegStartedAtControlTick);

        if (legFrames > policy.LegTimeoutFrames)
        {
            return BeginDeviationRecovery(
                state,
                input,
                policy,
                FirstDoorOpeningNavigationBlockCode.LegBudgetExhausted,
                "opening-navigation-leg-budget-exhausted");
        }

        if (WaypointReached(waypoint, metrics, proximity, policy))
        {
            if (waypoint.CertifiesDoorSightline)
            {
                var sightline = state with
                {
                    DoorSightlineCertified = true,
                    SightlineStartedAtControlTick = input.ControlTick,
                    SightlineFrames = 1,
                    ForwardProgressSamples = 0,
                    ProgressWindowStartDistance = 0d,
                    RealignAttemptsForLeg = 0
                };
                return EvaluateSightline(sightline, input, policy);
            }

            var advanced = state with
            {
                LegIndex = state.LegIndex + 1,
                LegStartedAtControlTick = input.ControlTick,
                ForwardProgressSamples = 0,
                ProgressWindowStartDistance = 0d,
                RealignAttemptsForLeg = 0
            };
            return EvaluateNormalLeg(advanced, input, policy);
        }

        if (legFrames >= policy.LegTimeoutFrames)
        {
            return BeginDeviationRecovery(
                state,
                input,
                policy,
                FirstDoorOpeningNavigationBlockCode.LegBudgetExhausted,
                "opening-navigation-leg-budget-exhausted");
        }

        if (metrics.CrossTrackDistance > policy.MaximumCrossTrackDistance)
        {
            return BeginDeviationRecovery(
                state,
                input,
                policy,
                FirstDoorOpeningNavigationBlockCode.CrossTrackExceeded,
                "opening-navigation-cross-track-exceeded");
        }

        return MoveTowardWaypoint(state, input, policy, waypoint, metrics);
    }

    private static FirstDoorOpeningNavigationTransition EvaluateNormalLeg(
        FirstDoorOpeningNavigationState state,
        FirstDoorOpeningNavigationInput input,
        FirstDoorOpeningNavigationPolicy policy)
    {
        var waypoint = policy.Waypoints[state.LegIndex];
        var metrics = Metrics(state.LegIndex, waypoint, input.Proximity, policy);
        return MoveTowardWaypoint(state, input, policy, waypoint, metrics);
    }

    private static FirstDoorOpeningNavigationTransition MoveTowardWaypoint(
        FirstDoorOpeningNavigationState state,
        FirstDoorOpeningNavigationInput input,
        FirstDoorOpeningNavigationPolicy policy,
        FirstDoorOpeningWaypoint waypoint,
        NavigationMetrics metrics)
    {
        if (Math.Abs(metrics.BearingErrorDegrees) > policy.AlignmentToleranceDegrees)
        {
            var turn = TurnAction(metrics.BearingErrorDegrees, policy);
            return Project(
                state,
                input,
                policy,
                FirstDoorOpeningNavigationStatus.Navigating,
                FirstDoorOpeningNavigationBlockCode.BearingAlignmentPending,
                turn,
                waypoint,
                metrics);
        }

        var sampleCount = state.ForwardProgressSamples + 1;
        var windowStart = state.ForwardProgressSamples == 0
            ? metrics.TargetDistance
            : state.ProgressWindowStartDistance;
        var next = state with
        {
            ForwardProgressSamples = sampleCount,
            ProgressWindowStartDistance = windowStart
        };
        if (sampleCount >= policy.ProgressWindowForwardSamples)
        {
            var progress = windowStart - metrics.TargetDistance;
            if (progress < policy.MinimumProgressDistance)
            {
                return BeginDeviationRecovery(
                    next,
                    input,
                    policy,
                    FirstDoorOpeningNavigationBlockCode.StallDetected,
                    "opening-navigation-progress-stalled");
            }

            next = next with
            {
                ForwardProgressSamples = 0,
                ProgressWindowStartDistance = 0d
            };
        }

        return Project(
            next,
            input,
            policy,
            FirstDoorOpeningNavigationStatus.Navigating,
            next.ForwardProgressSamples > 0
                ? FirstDoorOpeningNavigationBlockCode.ProgressWindowPending
                : FirstDoorOpeningNavigationBlockCode.WaypointPending,
            ForwardAction(),
            waypoint,
            metrics);
    }

    private static FirstDoorOpeningNavigationTransition BeginDeviationRecovery(
        FirstDoorOpeningNavigationState state,
        FirstDoorOpeningNavigationInput input,
        FirstDoorOpeningNavigationPolicy policy,
        FirstDoorOpeningNavigationBlockCode blockCode,
        string failureCode)
    {
        if (state.RealignAttemptsForLeg == 0)
        {
            var realign = state with
            {
                RealignAttemptsForLeg = 1,
                ForcedStopFramesRemaining = policy.ForcedStopFrames,
                ForwardProgressSamples = 0,
                ProgressWindowStartDistance = 0d
            };
            return Project(
                realign,
                input,
                policy,
                FirstDoorOpeningNavigationStatus.Realigning,
                blockCode,
                NeutralAction());
        }

        if (state.LegIndex <= 0 || state.RecoveryCount >= policy.MaximumRecoveries)
        {
            return Failed(
                state,
                input,
                policy,
                state.RecoveryCount >= policy.MaximumRecoveries
                    ? "opening-navigation-recovery-budget-exhausted"
                    : failureCode,
                state.RecoveryCount >= policy.MaximumRecoveries
                    ? FirstDoorOpeningNavigationBlockCode.RecoveryBudgetExhausted
                    : blockCode);
        }

        var recovery = state with
        {
            ReturningToCertifiedWaypoint = true,
            RecoveryWaypointIndex = state.LegIndex - 1,
            ResumeLegIndex = state.LegIndex,
            RecoveryCount = state.RecoveryCount + 1,
            LegStartedAtControlTick = input.ControlTick,
            ForwardProgressSamples = 0,
            ProgressWindowStartDistance = 0d,
            ForcedStopFramesRemaining = 0
        };
        return EvaluateRecovery(recovery, input, policy);
    }

    private static FirstDoorOpeningNavigationTransition EvaluateRecovery(
        FirstDoorOpeningNavigationState state,
        FirstDoorOpeningNavigationInput input,
        FirstDoorOpeningNavigationPolicy policy)
    {
        var waypoint = policy.Waypoints[state.RecoveryWaypointIndex];
        var proximity = input.Proximity;
        var metrics = Metrics(state.RecoveryWaypointIndex, waypoint, proximity, policy);
        var distance = metrics.TargetDistance;
        var error = metrics.BearingErrorDegrees;
        var recoveryFrames = Frames(input.ControlTick, state.LegStartedAtControlTick);

        if (recoveryFrames > policy.LegTimeoutFrames)
        {
            return Failed(
                state,
                input,
                policy,
                "opening-navigation-recovery-leg-budget-exhausted",
                FirstDoorOpeningNavigationBlockCode.RecoveryBudgetExhausted);
        }

        if (WaypointReached(waypoint, metrics, proximity, policy))
        {
            var resumed = state with
            {
                ReturningToCertifiedWaypoint = false,
                RecoveryWaypointIndex = -1,
                LegIndex = state.ResumeLegIndex,
                ResumeLegIndex = -1,
                LegStartedAtControlTick = input.ControlTick,
                RealignAttemptsForLeg = 0,
                ForwardProgressSamples = 0,
                ProgressWindowStartDistance = 0d
            };
            return EvaluateNormalLeg(resumed, input, policy);
        }

        if (recoveryFrames >= policy.LegTimeoutFrames)
        {
            return Failed(
                state,
                input,
                policy,
                "opening-navigation-recovery-leg-budget-exhausted",
                FirstDoorOpeningNavigationBlockCode.RecoveryBudgetExhausted);
        }

        var action = Math.Abs(error) > policy.AlignmentToleranceDegrees
            ? TurnAction(error, policy)
            : ForwardAction();
        return Project(
            state,
            input,
            policy,
            FirstDoorOpeningNavigationStatus.ReturningToCertifiedWaypoint,
            FirstDoorOpeningNavigationBlockCode.RecoveryInProgress,
            action,
            waypoint,
            metrics);
    }

    private static FirstDoorOpeningNavigationTransition EvaluateSightline(
        FirstDoorOpeningNavigationState state,
        FirstDoorOpeningNavigationInput input,
        FirstDoorOpeningNavigationPolicy policy)
    {
        if (state.SightlineFrames > policy.SightlineTimeoutFrames)
        {
            return Failed(
                state,
                input,
                policy,
                "opening-navigation-sightline-budget-exhausted",
                FirstDoorOpeningNavigationBlockCode.SightlineBudgetExhausted);
        }

        var waypoint = policy.Waypoints[^1];
        var metrics = Metrics(state.LegIndex, waypoint, input.Proximity, policy);
        var sightlineFrames = state.SightlineFrames;
        var next = state;
        if (!WaypointReached(waypoint, metrics, input.Proximity, policy))
        {
            if (sightlineFrames >= policy.SightlineTimeoutFrames)
            {
                return Failed(
                    next,
                    input,
                    policy,
                    "opening-navigation-sightline-budget-exhausted",
                    FirstDoorOpeningNavigationBlockCode.SightlineBudgetExhausted);
            }

            var repositioning = next with { DoorSightlineCertified = false };
            return MoveTowardWaypoint(repositioning, input, policy, waypoint, metrics);
        }

        next = next with { DoorSightlineCertified = true };

        var aligned = Math.Abs(input.Proximity.BearingErrorDegrees) <= policy.AlignmentToleranceDegrees;
        var stationary = Stationary(input.Proximity, policy);
        if (aligned && stationary && input.AcquisitionReady)
        {
            return Project(
                next,
                input,
                policy,
                FirstDoorOpeningNavigationStatus.ReadyForAcquisition,
                FirstDoorOpeningNavigationBlockCode.None,
                NeutralAction(),
                waypoint,
                metrics,
                readyForAcquisition: true);
        }

        if (sightlineFrames >= policy.SightlineTimeoutFrames)
        {
            return Failed(
                next,
                input,
                policy,
                "opening-navigation-sightline-budget-exhausted",
                FirstDoorOpeningNavigationBlockCode.SightlineBudgetExhausted);
        }

        var action = aligned
            ? NeutralAction()
            : TurnAction(input.Proximity.BearingErrorDegrees, policy);
        return Project(
            next,
            input,
            policy,
            FirstDoorOpeningNavigationStatus.SightlineAlign,
            !aligned
                ? FirstDoorOpeningNavigationBlockCode.SightlineBearingPending
                : !stationary
                    ? FirstDoorOpeningNavigationBlockCode.StationaryProofPending
                    : FirstDoorOpeningNavigationBlockCode.AcquisitionEvidencePending,
            action,
            waypoint,
            metrics);
    }

    private static FirstDoorOpeningNavigationTransition? TryCompleteAtRouteDeadline(
        FirstDoorOpeningNavigationState state,
        FirstDoorOpeningNavigationInput input,
        FirstDoorOpeningNavigationPolicy policy,
        bool scopeValid)
    {
        var proximity = input.Proximity;
        if (!scopeValid
            || !proximity.Available
            || !proximity.Fresh
            || (state.LastNativeGametic >= 0
                && proximity.NativeGametic <= state.LastNativeGametic))
        {
            return null;
        }

        var current = state with
        {
            PoseMissingFrames = 0,
            LastNativeGametic = proximity.NativeGametic
        };
        if (current.SightlineStartedAtControlTick >= 0)
        {
            var completion = EvaluateSightline(current, input, policy);
            return completion.Snapshot.ReadyForAcquisition ? completion : null;
        }

        if (current.ReturningToCertifiedWaypoint
            || current.ForcedStopFramesRemaining > 0
            || current.LegIndex != policy.Waypoints.Count - 1)
        {
            return null;
        }

        var waypoint = policy.Waypoints[^1];
        var metrics = Metrics(current.LegIndex, waypoint, proximity, policy);
        if (!WaypointReached(waypoint, metrics, proximity, policy))
        {
            return null;
        }

        var sightline = current with
        {
            DoorSightlineCertified = true,
            SightlineStartedAtControlTick = input.ControlTick,
            SightlineFrames = 1,
            ForwardProgressSamples = 0,
            ProgressWindowStartDistance = 0d,
            RealignAttemptsForLeg = 0
        };
        var result = EvaluateSightline(sightline, input, policy);
        return result.Snapshot.ReadyForAcquisition ? result : null;
    }

    private static bool WaypointReached(
        FirstDoorOpeningWaypoint waypoint,
        NavigationMetrics metrics,
        FirstDoorProximityObservation proximity,
        FirstDoorOpeningNavigationPolicy policy)
    {
        if (metrics.TargetDistance > policy.WaypointCompletionRadius
            || !waypoint.AllowedSectors.Contains(proximity.PlayerSectorIndex))
        {
            return false;
        }

        var portal149Satisfied = !waypoint.RequiresPortal149NorthSide
            || metrics.Portal149SignedSide >= policy.PortalInset;
        var portal150Satisfied = !waypoint.CertifiesDoorSightline
            || metrics.Portal150EvidenceSatisfied;
        return portal149Satisfied && portal150Satisfied;
    }

    private static NavigationMetrics Metrics(
        int legIndex,
        FirstDoorOpeningWaypoint waypoint,
        FirstDoorProximityObservation proximity,
        FirstDoorOpeningNavigationPolicy policy)
    {
        var startX = legIndex <= 0 ? CanonicalStartX : policy.Waypoints[legIndex - 1].X;
        var startY = legIndex <= 0 ? CanonicalStartY : policy.Waypoints[legIndex - 1].Y;
        var legX = waypoint.X - startX;
        var legY = waypoint.Y - startY;
        var legLength = Math.Max(1e-9d, Length(legX, legY));
        var playerX = proximity.PlayerX - startX;
        var playerY = proximity.PlayerY - startY;
        var along = ((playerX * legX) + (playerY * legY)) / legLength;
        var cross = Math.Abs((playerX * legY) - (playerY * legX)) / legLength;
        var dx = waypoint.X - proximity.PlayerX;
        var dy = waypoint.Y - proximity.PlayerY;
        var distance = Length(dx, dy);
        var bearing = NormalizeDegrees(Math.Atan2(dy, dx) * 180d / Math.PI);
        var error = NormalizeSignedDegrees(proximity.HeadingDegrees - bearing);
        var portalSide = proximity.PlayerY - Portal149Y;
        var portalSatisfied = !waypoint.RequiresPortal149NorthSide
            || (portalSide >= policy.PortalInset && proximity.PlayerSectorIndex == 2);
        var portal150 = Portal150Evidence(proximity, policy);
        return new NavigationMetrics(
            distance,
            bearing,
            error,
            along,
            cross,
            portalSide,
            portalSatisfied,
            portal150.IntersectionY,
            portal150.Satisfied);
    }

    private static FirstDoorOpeningNavigationTransition Failed(
        FirstDoorOpeningNavigationState state,
        FirstDoorOpeningNavigationInput input,
        FirstDoorOpeningNavigationPolicy policy,
        string failureCode,
        FirstDoorOpeningNavigationBlockCode blockCode)
    {
        var failed = state with
        {
            Failed = true,
            FailureCode = failureCode,
            FailureBlockCode = blockCode
        };
        return Project(
            failed,
            input,
            policy,
            FirstDoorOpeningNavigationStatus.Failed,
            blockCode,
            NeutralAction(),
            failureCode: failureCode);
    }

    private static FirstDoorOpeningNavigationTransition Project(
        FirstDoorOpeningNavigationState state,
        FirstDoorOpeningNavigationInput input,
        FirstDoorOpeningNavigationPolicy policy,
        FirstDoorOpeningNavigationStatus status,
        FirstDoorOpeningNavigationBlockCode blockCode,
        ActionCommand action,
        FirstDoorOpeningWaypoint? waypoint = null,
        NavigationMetrics? metrics = null,
        bool readyForAcquisition = false,
        string failureCode = "")
    {
        var legIndex = state.ReturningToCertifiedWaypoint && state.RecoveryWaypointIndex >= 0
            ? Math.Clamp(state.RecoveryWaypointIndex, 0, policy.Waypoints.Count - 1)
            : Math.Clamp(state.LegIndex, 0, policy.Waypoints.Count - 1);
        waypoint ??= policy.Waypoints[legIndex];
        metrics ??= Metrics(legIndex, waypoint, input.Proximity, policy);
        var startX = legIndex <= 0 ? CanonicalStartX : policy.Waypoints[legIndex - 1].X;
        var startY = legIndex <= 0 ? CanonicalStartY : policy.Waypoints[legIndex - 1].Y;
        var routeFrames = state.Active ? Frames(input.ControlTick, state.RouteStartedAtControlTick) : 0;
        var legFrames = state.Active ? Frames(input.ControlTick, state.LegStartedAtControlTick) : 0;
        var snapshot = new FirstDoorOpeningNavigationSnapshot
        {
            PolicyVersion = policy.PolicyVersion,
            GeometryHash = GeometryHash(policy),
            WadContentSha256 = input.Proximity.WadContentSha256,
            Status = status,
            BlockCode = blockCode,
            Active = state.Active,
            LegIndex = legIndex,
            LegId = waypoint.Id,
            LegStartX = startX,
            LegStartY = startY,
            TargetX = waypoint.X,
            TargetY = waypoint.Y,
            AllowedSectors = waypoint.AllowedSectors.ToArray(),
            PlayerRadius = policy.PlayerRadius,
            BarrelRadius = policy.BarrelRadius,
            PortalInset = policy.PortalInset,
            WaypointCompletionRadius = policy.WaypointCompletionRadius,
            MaximumCrossTrackDistance = policy.MaximumCrossTrackDistance,
            AlignmentToleranceDegrees = policy.AlignmentToleranceDegrees,
            DefaultTurnYaw = policy.DefaultTurnYaw,
            MaximumTurnYaw = policy.MaximumTurnYaw,
            NativeGametic = input.Proximity.NativeGametic,
            PlayerX = input.Proximity.PlayerX,
            PlayerY = input.Proximity.PlayerY,
            HeadingDegrees = input.Proximity.HeadingDegrees,
            PlayerSectorIndex = input.Proximity.PlayerSectorIndex,
            TargetDistance = metrics.TargetDistance,
            TargetBearingDegrees = metrics.TargetBearingDegrees,
            BearingErrorDegrees = metrics.BearingErrorDegrees,
            DoorDistanceToSegment = input.Proximity.DistanceToDoorSegment,
            DoorBearingDegrees = input.Proximity.BearingToDoorDegrees,
            DoorBearingErrorDegrees = input.Proximity.BearingErrorDegrees,
            AlongTrackDistance = metrics.AlongTrackDistance,
            CrossTrackDistance = metrics.CrossTrackDistance,
            Portal149SignedSide = metrics.Portal149SignedSide,
            PortalEvidenceSatisfied = metrics.PortalEvidenceSatisfied,
            Portal150IntersectionY = metrics.Portal150IntersectionY,
            Portal150EvidenceSatisfied = metrics.Portal150EvidenceSatisfied,
            PlayerMomentumX = input.Proximity.PlayerMomentumX,
            PlayerMomentumY = input.Proximity.PlayerMomentumY,
            StationaryMomentumMaximum = policy.StationaryMomentumMaximum,
            Stationary = Stationary(input.Proximity, policy),
            DoorSightlineCertified = state.DoorSightlineCertified,
            StationaryBearingAligned = state.DoorSightlineCertified
                && metrics.Portal150EvidenceSatisfied
                && Stationary(input.Proximity, policy)
                && Math.Abs(input.Proximity.BearingErrorDegrees) <= policy.AlignmentToleranceDegrees,
            ReadyForAcquisition = readyForAcquisition,
            RouteFrames = routeFrames,
            RouteTimeoutFrames = policy.RouteTimeoutFrames,
            RouteRemainingFrames = Math.Max(0, policy.RouteTimeoutFrames - routeFrames),
            LegFrames = legFrames,
            LegTimeoutFrames = policy.LegTimeoutFrames,
            LegRemainingFrames = Math.Max(0, policy.LegTimeoutFrames - legFrames),
            PoseMissingFrames = state.PoseMissingFrames,
            MaximumPoseMissingFrames = policy.MaximumPoseMissingFrames,
            ForwardProgressSamples = state.ForwardProgressSamples,
            RequiredProgressSamples = policy.ProgressWindowForwardSamples,
            ProgressWindowStartDistance = state.ProgressWindowStartDistance,
            MinimumProgressDistance = policy.MinimumProgressDistance,
            RecoveryCount = state.RecoveryCount,
            MaximumRecoveries = policy.MaximumRecoveries,
            RealignAttemptsForLeg = state.RealignAttemptsForLeg,
            ForcedStopFrames = policy.ForcedStopFrames,
            ForcedStopFramesRemaining = state.ForcedStopFramesRemaining,
            ReturningToCertifiedWaypoint = state.ReturningToCertifiedWaypoint,
            RecoveryWaypointIndex = state.RecoveryWaypointIndex,
            ResumeLegIndex = state.ResumeLegIndex,
            SightlineStartedAtControlTick = state.SightlineStartedAtControlTick,
            SightlineFrames = state.SightlineFrames,
            SightlineTimeoutFrames = policy.SightlineTimeoutFrames,
            Action = action,
            FailureCode = failureCode,
            ObservationHash = SnapshotHash(state, input, waypoint, metrics, status, blockCode, policy)
        };
        return new FirstDoorOpeningNavigationTransition
        {
            State = state,
            Snapshot = snapshot,
            Action = action
        };
    }

    private static string? ValidatePolicy(FirstDoorOpeningNavigationPolicy policy)
    {
        if (!string.Equals(
                policy.PolicyVersion,
                "first-door-opening-navigation-v1",
                StringComparison.Ordinal)
            || policy.Waypoints is null
            || policy.Waypoints.Count != FirstDoorOpeningNavigationPolicy.CanonicalWaypoints.Count
            || policy.PlayerRadius != 16d
            || policy.BarrelRadius != 10d
            || policy.PortalInset != 24d
            || policy.WaypointCompletionRadius != 16d
            || policy.MaximumCrossTrackDistance != 24d
            || policy.AlignmentToleranceDegrees != 4d
            || policy.StationaryMomentumMaximum != 0.5d
            || policy.DefaultTurnYaw != 6
            || policy.MaximumTurnYaw != 12
            || policy.RouteTimeoutFrames != 480
            || policy.LegTimeoutFrames != 180
            || policy.MaximumPoseMissingFrames != 30
            || policy.ProgressWindowForwardSamples != 30
            || policy.MinimumProgressDistance != 16d
            || policy.SightlineTimeoutFrames != 60
            || policy.ForcedStopFrames != 2
            || policy.MaximumRecoveries != 2)
        {
            return "opening-navigation-policy-mismatch";
        }

        for (var index = 0; index < policy.Waypoints.Count; index++)
        {
            var actual = policy.Waypoints[index];
            var expected = FirstDoorOpeningNavigationPolicy.CanonicalWaypoints[index];
            if (actual is null
                || actual.AllowedSectors is null
                || actual.Index != expected.Index
                || !string.Equals(actual.Id, expected.Id, StringComparison.Ordinal)
                || actual.X != expected.X
                || actual.Y != expected.Y
                || actual.RequiresPortal149NorthSide != expected.RequiresPortal149NorthSide
                || actual.CertifiesDoorSightline != expected.CertifiesDoorSightline
                || !actual.AllowedSectors.SequenceEqual(expected.AllowedSectors))
            {
                return $"opening-navigation-waypoint-mismatch:{index}";
            }
        }

        return null;
    }

    private static string? ValidateState(
        FirstDoorOpeningNavigationState state,
        FirstDoorOpeningNavigationPolicy policy)
    {
        if (state.LegIndex < 0
            || state.LegIndex >= policy.Waypoints.Count
            || state.LastNativeGametic < -1
            || state.PoseMissingFrames < 0
            || state.ForwardProgressSamples < 0
            || !double.IsFinite(state.ProgressWindowStartDistance)
            || state.ProgressWindowStartDistance < 0d
            || state.RealignAttemptsForLeg is < 0 or > 1
            || state.ForcedStopFramesRemaining < 0
            || state.RecoveryCount < 0
            || state.RecoveryCount > policy.MaximumRecoveries
            || state.SightlineStartedAtControlTick < -1
            || state.SightlineFrames < 0)
        {
            return "opening-navigation-state-out-of-range";
        }

        if (state.ReturningToCertifiedWaypoint)
        {
            if (state.RecoveryWaypointIndex < 0
                || state.RecoveryWaypointIndex >= policy.Waypoints.Count
                || state.ResumeLegIndex <= 0
                || state.ResumeLegIndex >= policy.Waypoints.Count
                || state.RecoveryWaypointIndex != state.ResumeLegIndex - 1)
            {
                return "opening-navigation-recovery-state-invalid";
            }
        }
        else if (state.RecoveryWaypointIndex != -1 || state.ResumeLegIndex != -1)
        {
            return "opening-navigation-inactive-recovery-state-invalid";
        }

        if (!state.Active
            && (state.LegIndex != 0
                || state.RouteStartedAtControlTick != 0
                || state.LegStartedAtControlTick != 0
                || state.LastNativeGametic != -1
                || state.PoseMissingFrames != 0
                || state.ForwardProgressSamples != 0
                || state.ProgressWindowStartDistance != 0d
                || state.RealignAttemptsForLeg != 0
                || state.ForcedStopFramesRemaining != 0
                || state.RecoveryCount != 0
                || state.ReturningToCertifiedWaypoint
                || state.DoorSightlineCertified
                || state.SightlineStartedAtControlTick != -1
                || state.SightlineFrames != 0))
        {
            return "opening-navigation-inactive-state-not-canonical";
        }

        if (state.SightlineStartedAtControlTick < 0)
        {
            return state.SightlineFrames != 0 || state.DoorSightlineCertified
                ? "opening-navigation-sightline-clock-missing"
                : null;
        }

        return state.LegIndex != policy.Waypoints.Count - 1 || state.SightlineFrames < 1
            ? "opening-navigation-sightline-state-invalid"
            : null;
    }

    private static string GeometryHash(FirstDoorOpeningNavigationPolicy policy)
    {
        var builder = new StringBuilder(512)
            .Append(FirstDoorOpeningNavigationPolicy.GeometryVersion)
            .Append("|policy=").Append(policy.PolicyVersion)
            .Append('|').Append(FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256)
            .Append("|start=").Append(CanonicalStartX.ToString("R", CultureInfo.InvariantCulture))
            .Append(',').Append(CanonicalStartY.ToString("R", CultureInfo.InvariantCulture))
            .Append("|player=").Append(policy.PlayerRadius.ToString("R", CultureInfo.InvariantCulture))
            .Append("|barrel=").Append(policy.BarrelRadius.ToString("R", CultureInfo.InvariantCulture))
            .Append("|portalInset=").Append(policy.PortalInset.ToString("R", CultureInfo.InvariantCulture))
            .Append("|waypointRadius=").Append(policy.WaypointCompletionRadius.ToString("R", CultureInfo.InvariantCulture))
            .Append("|maxCrossTrack=").Append(policy.MaximumCrossTrackDistance.ToString("R", CultureInfo.InvariantCulture))
            .Append("|minProgress=").Append(policy.MinimumProgressDistance.ToString("R", CultureInfo.InvariantCulture))
            .Append("|alignment=").Append(policy.AlignmentToleranceDegrees.ToString("R", CultureInfo.InvariantCulture))
            .Append("|stationaryMomentum=").Append(policy.StationaryMomentumMaximum.ToString("R", CultureInfo.InvariantCulture))
            .Append("|turnYaw=").Append(policy.DefaultTurnYaw).Append(',').Append(policy.MaximumTurnYaw)
            .Append("|routeFrames=").Append(policy.RouteTimeoutFrames)
            .Append("|legFrames=").Append(policy.LegTimeoutFrames)
            .Append("|poseMissingFrames=").Append(policy.MaximumPoseMissingFrames)
            .Append("|progressSamples=").Append(policy.ProgressWindowForwardSamples)
            .Append("|sightlineFrames=").Append(policy.SightlineTimeoutFrames)
            .Append("|forcedStopFrames=").Append(policy.ForcedStopFrames)
            .Append("|maxRecoveries=").Append(policy.MaximumRecoveries);
        foreach (var waypoint in policy.Waypoints)
        {
            builder.Append('|').Append(waypoint.Index).Append(':').Append(waypoint.Id)
                .Append(':').Append(waypoint.X.ToString("R", CultureInfo.InvariantCulture))
                .Append(':').Append(waypoint.Y.ToString("R", CultureInfo.InvariantCulture))
                .Append(":sectors=").Append(string.Join(',', waypoint.AllowedSectors))
                .Append(":portal149=").Append(waypoint.RequiresPortal149NorthSide ? '1' : '0')
                .Append(":sightline=").Append(waypoint.CertifiesDoorSightline ? '1' : '0');
        }
        builder.Append("|portal149=y:-2880")
            .Append("|portal150=1472,-2432:1472,-2560")
            .Append("|door=1536,-2560:1536,-2432");
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(builder.ToString()))).ToLowerInvariant();
    }

    private static string SnapshotHash(
        FirstDoorOpeningNavigationState state,
        FirstDoorOpeningNavigationInput input,
        FirstDoorOpeningWaypoint waypoint,
        NavigationMetrics metrics,
        FirstDoorOpeningNavigationStatus status,
        FirstDoorOpeningNavigationBlockCode blockCode,
        FirstDoorOpeningNavigationPolicy policy)
    {
        var text = string.Join('|',
            GeometryHash(policy),
            input.ControlTick.ToString(CultureInfo.InvariantCulture),
            input.Proximity.NativeGametic.ToString(CultureInfo.InvariantCulture),
            state.LegIndex.ToString(CultureInfo.InvariantCulture),
            waypoint.Index.ToString(CultureInfo.InvariantCulture),
            waypoint.Id,
            input.Proximity.PlayerX.ToString("R", CultureInfo.InvariantCulture),
            input.Proximity.PlayerY.ToString("R", CultureInfo.InvariantCulture),
            input.Proximity.PlayerMomentumX.ToString("R", CultureInfo.InvariantCulture),
            input.Proximity.PlayerMomentumY.ToString("R", CultureInfo.InvariantCulture),
            input.Proximity.HeadingDegrees.ToString("R", CultureInfo.InvariantCulture),
            input.Proximity.PlayerSectorIndex.ToString(CultureInfo.InvariantCulture),
            input.Proximity.DistanceToDoorSegment.ToString("R", CultureInfo.InvariantCulture),
            input.Proximity.BearingToDoorDegrees.ToString("R", CultureInfo.InvariantCulture),
            input.Proximity.BearingErrorDegrees.ToString("R", CultureInfo.InvariantCulture),
            metrics.TargetDistance.ToString("R", CultureInfo.InvariantCulture),
            metrics.BearingErrorDegrees.ToString("R", CultureInfo.InvariantCulture),
            metrics.AlongTrackDistance.ToString("R", CultureInfo.InvariantCulture),
            metrics.CrossTrackDistance.ToString("R", CultureInfo.InvariantCulture),
            metrics.Portal150IntersectionY.ToString("R", CultureInfo.InvariantCulture),
            metrics.Portal150EvidenceSatisfied ? "1" : "0",
            status.ToString(),
            blockCode.ToString(),
            state.Active ? "1" : "0",
            state.RouteStartedAtControlTick.ToString(CultureInfo.InvariantCulture),
            state.LegStartedAtControlTick.ToString(CultureInfo.InvariantCulture),
            state.LastNativeGametic.ToString(CultureInfo.InvariantCulture),
            state.PoseMissingFrames.ToString(CultureInfo.InvariantCulture),
            state.ForwardProgressSamples.ToString(CultureInfo.InvariantCulture),
            state.ProgressWindowStartDistance.ToString("R", CultureInfo.InvariantCulture),
            state.RealignAttemptsForLeg.ToString(CultureInfo.InvariantCulture),
            state.ForcedStopFramesRemaining.ToString(CultureInfo.InvariantCulture),
            state.RecoveryCount.ToString(CultureInfo.InvariantCulture),
            state.ReturningToCertifiedWaypoint ? "1" : "0",
            state.RecoveryWaypointIndex.ToString(CultureInfo.InvariantCulture),
            state.ResumeLegIndex.ToString(CultureInfo.InvariantCulture),
            state.DoorSightlineCertified ? "1" : "0",
            state.SightlineStartedAtControlTick.ToString(CultureInfo.InvariantCulture),
            state.SightlineFrames.ToString(CultureInfo.InvariantCulture),
            state.Failed ? "1" : "0",
            state.FailureCode,
            input.ControlReady ? "1" : "0",
            input.AcquisitionReady ? "1" : "0");
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(text))).ToLowerInvariant();
    }

    private static bool ProximityNumbersFinite(FirstDoorProximityObservation proximity)
        => double.IsFinite(proximity.PlayerX)
            && double.IsFinite(proximity.PlayerY)
            && double.IsFinite(proximity.PlayerMomentumX)
            && double.IsFinite(proximity.PlayerMomentumY)
            && double.IsFinite(proximity.HeadingDegrees)
            && double.IsFinite(proximity.ClosestDoorPointX)
            && double.IsFinite(proximity.ClosestDoorPointY)
            && double.IsFinite(proximity.DistanceToDoorSegment)
            && double.IsFinite(proximity.BearingToDoorDegrees)
            && double.IsFinite(proximity.BearingErrorDegrees)
            && double.IsFinite(proximity.AcquisitionMaximumDistance)
            && double.IsFinite(proximity.ContactApproachMaximumDistance)
            && double.IsFinite(proximity.UseMaximumDistance);

    private static FirstDoorOpeningNavigationState AdvanceSightlineClock(
        FirstDoorOpeningNavigationState state,
        long controlTick)
    {
        if (state.SightlineStartedAtControlTick < 0)
        {
            return state;
        }

        var elapsed = Frames(controlTick, state.SightlineStartedAtControlTick);
        var frames = elapsed == int.MaxValue ? int.MaxValue : elapsed + 1;
        return frames <= state.SightlineFrames
            ? state
            : state with { SightlineFrames = frames };
    }

    private static ActionCommand TurnAction(double bearingErrorDegrees, FirstDoorOpeningNavigationPolicy policy)
    {
        var magnitude = Math.Clamp(Math.Abs(policy.DefaultTurnYaw), 1, Math.Abs(policy.MaximumTurnYaw));
        return new(false, false, false, false, bearingErrorDegrees < 0d ? -magnitude : magnitude, false, false);
    }

    private static ActionCommand ForwardAction()
        => new(true, false, false, false, 0, false, false);

    private static ActionCommand NeutralAction()
        => new(false, false, false, false, 0, false, false);

    private static (double IntersectionY, bool Satisfied) Portal150Evidence(
        FirstDoorProximityObservation proximity,
        FirstDoorOpeningNavigationPolicy policy)
    {
        var closestDoorY = Math.Clamp(
            proximity.PlayerY,
            FirstDoorNativeProximityObserver.FirstDoorSegmentMinimumY,
            FirstDoorNativeProximityObserver.FirstDoorSegmentMaximumY);
        var doorDeltaX = FirstDoorNativeProximityObserver.FirstDoorSegmentX - proximity.PlayerX;
        if (doorDeltaX <= 1e-9d)
        {
            return (proximity.PlayerY, false);
        }

        var fraction = (Portal150X - proximity.PlayerX) / doorDeltaX;
        var intersectionY = proximity.PlayerY
            + (fraction * (closestDoorY - proximity.PlayerY));
        var minimumY = Portal150MinimumY + policy.PortalInset;
        var maximumY = Portal150MaximumY - policy.PortalInset;
        var satisfied = proximity.PlayerSectorIndex == 2
            && fraction is >= 0d and <= 1d
            && intersectionY >= minimumY
            && intersectionY <= maximumY;
        return (intersectionY, satisfied);
    }

    private static bool Stationary(
        FirstDoorProximityObservation proximity,
        FirstDoorOpeningNavigationPolicy policy)
        => Math.Abs(proximity.PlayerMomentumX) <= policy.StationaryMomentumMaximum
            && Math.Abs(proximity.PlayerMomentumY) <= policy.StationaryMomentumMaximum;

    private static bool KnownScopeContradiction(
        FirstDoorProximityObservation proximity,
        bool scopeValid)
    {
        if (proximity.Available && !scopeValid)
        {
            return true;
        }

        var wadHash = proximity.WadContentSha256?.Trim() ?? string.Empty;
        if (wadHash.Length > 0
            && (!string.Equals(
                    wadHash,
                    FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
                    StringComparison.OrdinalIgnoreCase)
                || !proximity.WadVerified))
        {
            return true;
        }

        var reason = proximity.Reason ?? string.Empty;
        return reason.StartsWith(
                "canonical-doom1-wad-sha256-mismatch",
                StringComparison.Ordinal)
            || reason.StartsWith(
                "unsupported-native-game-state:",
                StringComparison.Ordinal)
            || reason.StartsWith(
                "unsupported-proximity-map:",
                StringComparison.Ordinal);
    }

    private static double Length(double x, double y)
        => Math.Sqrt((x * x) + (y * y));

    private static int Frames(long controlTick, long startedAt)
    {
        if (controlTick <= startedAt)
        {
            return 0;
        }

        return controlTick - startedAt >= int.MaxValue
            ? int.MaxValue
            : (int)(controlTick - startedAt);
    }

    private static double NormalizeDegrees(double value)
    {
        var normalized = value % 360d;
        return normalized < 0d ? normalized + 360d : normalized;
    }

    private static double NormalizeSignedDegrees(double value)
    {
        var normalized = NormalizeDegrees(value);
        return normalized > 180d ? normalized - 360d : normalized;
    }

    private sealed record NavigationMetrics(
        double TargetDistance,
        double TargetBearingDegrees,
        double BearingErrorDegrees,
        double AlongTrackDistance,
        double CrossTrackDistance,
        double Portal149SignedSide,
        bool PortalEvidenceSatisfied,
        double Portal150IntersectionY,
        bool Portal150EvidenceSatisfied);
}
