namespace AIKernel.Doom.Provider.Autoplay;

internal enum PostComputerRoomRouteState
{
    WaitingForFirstDoorHandoff,
    EnterComputerRoom,
    AwaitComputerRoomConfirmation,
    NavigateMainRoute,
    RecoverEnemyAlcove,
    InterceptEnemy,
    FireReady,
    Complete,
    FailedSafeStop
}

internal enum PostComputerRoomOwnershipDisposition
{
    NotAcquired,
    Exclusive,
    Completed,
    FailedSafeStop
}

internal sealed record PostComputerRoomCombatObservation
{
    public long RawFrameSequence { get; init; } = -1;

    public long RawNativeGametic { get; init; } = -1;

    public IReadOnlyList<double> EnemyRegion9Sample { get; init; } = Array.Empty<double>();

    public bool VisualEnemyVisible { get; init; }

    public bool VisualEnemyCentered { get; init; }

    public bool VisualEnemyFireReady { get; init; }

    public bool EnemyStructuralDecoy { get; init; }

    public double EnemyConfidence { get; init; }

    public double VisualEnemyYaw { get; init; }
}

internal sealed record PostComputerRoomRouteWaypoint(
    int Index,
    string Id,
    double X,
    double Y,
    IReadOnlyList<int> AllowedSectors);

internal sealed record PostComputerRoomRoutePolicy
{
    internal const string GeometryVersion = "e1m1-post-computer-room-main-route-v2";

    public string PolicyVersion { get; init; } = "post-computer-room-route-policy-v8";

    public double WaypointCompletionRadius { get; init; } = 24d;

    public double AlignmentToleranceDegrees { get; init; } = 5d;

    public int DefaultTurnYaw { get; init; } = 6;

    public int MaximumTurnYaw { get; init; } = 12;

    public int RouteTimeoutFrames { get; init; } = 900;

    public int LegTimeoutFrames { get; init; } = 180;

    public int MaximumPoseMissingFrames { get; init; } = 30;

    public double TrustedVisualEnemyConfidence { get; init; } = 0.42d;

    public double StructuredEnemyMinimumPeak { get; init; } = 0.14d;

    public double StructuredEnemyMinimumTotal { get; init; } = 0.28d;

    public double StructuredEnemySupportCellMinimum { get; init; } = 0.04d;

    public int StructuredEnemyMinimumSupportCells { get; init; } = 2;

    public int StructuredEnemyRequiredDistinctFrames { get; init; } = 2;

    public int StructuredEnemyWindowFrames { get; init; } = 8;

    public double NativeActorVisualFieldOfViewHalfDegrees { get; init; } = 45d;

    public IReadOnlyList<PostComputerRoomRouteWaypoint> Waypoints { get; init; }
        = CanonicalWaypoints;

    public IReadOnlyList<PostComputerRoomRouteWaypoint> IngressWaypoints { get; init; }
        = CanonicalIngressWaypoints;

    internal static IReadOnlyList<PostComputerRoomRouteWaypoint> CanonicalIngressWaypoints { get; }
        = Array.AsReadOnly(new[]
        {
            Waypoint(0, "first-door-east-alignment", 1440d, -2496d, 2),
            Waypoint(1, "portal-150-east-certification", 1504d, -2496d, 2, 3),
            Waypoint(2, "first-door-open-slab-transit", 1600d, -2496d, 3, 4, 0),
            Waypoint(3, "computer-room-entry-certification", 1712d, -2496d, 0, 7)
        });

    internal static IReadOnlyList<PostComputerRoomRouteWaypoint> CanonicalWaypoints { get; }
        = Array.AsReadOnly(new[]
        {
            Waypoint(0, "computer-room-entry-center", 1760d, -2512d, 0, 7),
            Waypoint(1, "computer-room-east-lane", 2064d, -2512d, 7),
            Waypoint(2, "enemy-alcove-south-clearance", 2064d, -2640d, 7),
            Waypoint(3, "main-route-portal-385-west", 2448d, -2640d, 7),
            Waypoint(4, "main-route-portal-385-east", 2544d, -2640d, 54),
            Waypoint(5, "sector-54-diagonal", 2688d, -2672d, 54, 53),
            Waypoint(6, "sector-53-main-lane", 2848d, -2720d, 53, 71),
            Waypoint(7, "sector-71-south-lane", 2880d, -2928d, 71),
            Waypoint(8, "central-hall-entry", 2944d, -3024d, 60, 71)
        });

    private static PostComputerRoomRouteWaypoint Waypoint(
        int index,
        string id,
        double x,
        double y,
        params int[] allowedSectors)
        => new(index, id, x, y, Array.AsReadOnly(allowedSectors));
}

internal sealed record PostComputerRoomRouteNavigationSnapshot
{
    public int SnapshotVersion { get; init; } = 7;

    public string GeometryVersion { get; init; } = PostComputerRoomRoutePolicy.GeometryVersion;

    public string PolicyVersion { get; init; } = string.Empty;

    public bool Active { get; init; }

    public bool RecoveringEnemyAlcove { get; init; }

    public int LegIndex { get; init; } = -1;

    public string LegId { get; init; } = string.Empty;

    public double TargetX { get; init; }

    public double TargetY { get; init; }

    public IReadOnlyList<int> AllowedSectors { get; init; } = Array.Empty<int>();

    public long NativeGametic { get; init; } = -1;

    public double PlayerX { get; init; }

    public double PlayerY { get; init; }

    public double HeadingDegrees { get; init; }

    public int PlayerSectorIndex { get; init; } = -1;

    public double TargetDistance { get; init; }

    public double TargetBearingDegrees { get; init; }

    public double BearingErrorDegrees { get; init; }

    public int RouteFrames { get; init; }

    public int RouteTimeoutFrames { get; init; }

    public int RouteRemainingFrames { get; init; }

    public int LegFrames { get; init; }

    public int LegTimeoutFrames { get; init; }

    public int LegRemainingFrames { get; init; }

    public int PoseMissingFrames { get; init; }

    public bool TrustedCombatEvidence { get; init; }

    public bool LegacyTrustedCombatEvidence { get; init; }

    public bool StructuredCombatInputAccepted { get; init; }

    public bool StructuredCombatFresh { get; init; }

    public bool StructuredCombatCandidate { get; init; }

    public bool StructuredCombatTrusted { get; init; }

    public int StructuredCombatDistinctFrames { get; init; }

    public double StructuredCombatPeak { get; init; }

    public double StructuredCombatTotal { get; init; }

    public int StructuredCombatSupportCells { get; init; }

    public double StructuredCombatCenterCell { get; init; }

    public double StructuredCombatLateralBias { get; init; }

    public bool StructuredCombatCentered { get; init; }

    public string StructuredCombatReason { get; init; } = "structured-combat-not-evaluated";

    public bool EnemyStructuralDecoy { get; init; }

    public bool NativeActorSnapshotAccepted { get; init; }

    public bool NativeActorSnapshotFresh { get; init; }

    public bool NativeActorVisualEvidenceTrusted { get; init; }

    public bool NativeActorMatched { get; init; }

    public bool NativeActorTargetRetained { get; init; }

    public bool NativeActorCombatTrusted { get; init; }

    public bool NativeActorKillConfirmed { get; init; }

    public long NativeActorTargetIdentity { get; init; }

    public int NativeActorTargetSectorIndex { get; init; } = -1;

    public bool NativeActorTopologyAccepted { get; init; }

    public string NativeActorTopologyReason { get; init; } = "native-actor-topology-not-evaluated";

    public int NativeActorTargetType { get; init; } = -1;

    public int NativeActorTargetHealth { get; init; }

    public long NativeActorTargetFlags { get; init; }

    public bool NativeActorTargetLineOfSight { get; init; }

    public double NativeActorTargetBearingDegrees { get; init; }

    public double NativeActorTargetBearingErrorDegrees { get; init; }

    public int NativeActorEngagementFrames { get; init; }

    public int NativeActorKillCountAtAcquisition { get; init; }

    public int NativeActorCurrentKillCount { get; init; }

    public string NativeActorCombatReason { get; init; } = "native-actor-combat-not-evaluated";

    public bool NativeWeaponSnapshotAccepted { get; init; }

    public bool NativeWeaponSnapshotFresh { get; init; }

    public int NativeWeaponStateCount { get; init; } = -1;

    public int NativeReadyWeapon { get; init; } = -1;

    public int NativePendingWeapon { get; init; } = -1;

    public int NativeWeaponState { get; init; } = -1;

    public int NativeWeaponReadyState { get; init; } = -1;

    public int NativeWeaponRefire { get; init; } = -1;

    public bool NativeWeaponFireOpportunity { get; init; }

    public bool NativeWeaponContinuationArmed { get; init; }

    public long NativeWeaponContinuationTargetIdentity { get; init; }

    public int NativeWeaponContinuationReadyWeapon { get; init; } = -1;

    public long NativeWeaponContinuationAuthorizedAtControlTick { get; init; } = -1;

    public bool NativeWeaponAttackContinuation { get; init; }

    public string NativeWeaponReason { get; init; } = "native-weapon-not-evaluated";

    public string FailureCode { get; init; } = string.Empty;
}

internal sealed record PostComputerRoomRouteReplayEntry
{
    public long ControlTick { get; init; }

    public long NativeGametic { get; init; } = -1;

    public PostComputerRoomRouteState State { get; init; }

    public string ReasonCode { get; init; } = string.Empty;

    public int PlayerSectorIndex { get; init; } = -1;

    public double PlayerX { get; init; }

    public double PlayerY { get; init; }

    public int LegIndex { get; init; } = -1;

    public string LegId { get; init; } = string.Empty;

    public int RouteFrames { get; init; }

    public int LegFrames { get; init; }

    public long NativeActorTargetIdentity { get; init; }

    public int NativeActorTargetSectorIndex { get; init; } = -1;

    public bool NativeActorTopologyAccepted { get; init; }

    public string NativeActorTopologyReason { get; init; } = string.Empty;

    public int NativeActorTargetHealth { get; init; }

    public bool NativeActorTargetLineOfSight { get; init; }

    public double NativeActorTargetBearingErrorDegrees { get; init; }

    public int NativeActorEngagementFrames { get; init; }

    public string NativeActorCombatReason { get; init; } = string.Empty;

    public bool NativeWeaponSnapshotAccepted { get; init; }

    public bool NativeWeaponSnapshotFresh { get; init; }

    public bool NativeWeaponFireOpportunity { get; init; }

    public bool NativeWeaponContinuationArmed { get; init; }

    public long NativeWeaponContinuationTargetIdentity { get; init; }

    public int NativeWeaponContinuationReadyWeapon { get; init; } = -1;

    public long NativeWeaponContinuationAuthorizedAtControlTick { get; init; } = -1;

    public bool NativeWeaponAttackContinuation { get; init; }

    public int NativeWeaponStateCount { get; init; } = -1;

    public int NativeReadyWeapon { get; init; } = -1;

    public int NativePendingWeapon { get; init; } = -1;

    public int NativeWeaponState { get; init; } = -1;

    public int NativeWeaponReadyState { get; init; } = -1;

    public int NativeWeaponRefire { get; init; } = -1;

    public string NativeWeaponReason { get; init; } = string.Empty;

    public ActionCommand Action { get; init; } = new(false, false, false, false, 0, false, false);

    public bool RunRequested { get; init; }
}

internal sealed record PostComputerRoomFailureTrace
{
    public const int ReplayCapacity = 32;

    public bool Failed { get; init; }

    public long FailureAtControlTick { get; init; } = -1;

    public string FailureCode { get; init; } = string.Empty;

    public PostComputerRoomRouteReplayEntry? FailureSnapshot { get; init; }

    public IReadOnlyList<PostComputerRoomRouteReplayEntry> Replay { get; init; }
        = Array.Empty<PostComputerRoomRouteReplayEntry>();
}

internal sealed record PostComputerRoomCompletionTrace
{
    public const int ReplayCapacity = 32;

    public bool Completed { get; init; }

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long CompletionAtControlTick { get; init; } = -1;

    public string CompletionCode { get; init; } = string.Empty;

    public PostComputerRoomRouteReplayEntry? CompletionSnapshot { get; init; }

    public IReadOnlyList<PostComputerRoomRouteReplayEntry> Replay { get; init; }
        = Array.Empty<PostComputerRoomRouteReplayEntry>();
}

internal sealed record PostComputerRoomRouteSemanticProjection
{
    public string Telos { get; init; } = "PostDoor";

    public string Objective { get; init; } = "enter-computer-room";

    public bool ComputerRoomEntered { get; init; }

    public bool CentralHallEntered { get; init; }

    public FirstDoorOpenConfirmationSource FirstDoorOpenConfirmationSource { get; init; }
}

internal sealed record PostComputerRoomRouteDecision
{
    public string ImplementationVersion { get; init; } = "post-computer-room-route-v8";

    public string PolicyVersion { get; init; } = string.Empty;

    public int ContractVersion { get; init; } = 1;

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long ControlTick { get; init; }

    public long ExpectedFirstDoorControlTick { get; init; }

    public long NativeGametic { get; init; } = -1;

    public PostComputerRoomRouteState State { get; init; }

    public PostComputerRoomOwnershipDisposition OwnershipDisposition { get; init; }

    public string OwnerId { get; init; } = "post-computer-room.waiting";

    public string ReasonCode { get; init; } = "first-door-handoff-pending";

    public ActionCommand Action { get; init; } = NeutralAction();

    public bool RunRequested { get; init; }

    public bool Exclusive { get; init; }

    public bool Completed { get; init; }

    public PostComputerRoomCombatObservation CombatObservation { get; init; } = new();

    public PostComputerRoomNativeActorSnapshot ActorSnapshot { get; init; } = new();

    public PostComputerRoomNativeWeaponSnapshot WeaponSnapshot { get; init; } = new();

    public FirstDoorProximityObservation Proximity { get; init; } = new();

    public PostComputerRoomRouteNavigationSnapshot Navigation { get; init; } = new();

    public PostComputerRoomRouteSemanticProjection SemanticProjection { get; init; } = new();

    public PostComputerRoomFailureTrace FailureTrace { get; init; } = new();

    public PostComputerRoomCompletionTrace CompletionTrace { get; init; } = new();

    public string ContractError { get; init; } = string.Empty;

    private static ActionCommand NeutralAction()
        => new(false, false, false, false, 0, false, false);
}

internal sealed class PostComputerRoomRouteNavigator
{
    private const long MfShootable = 0x00000004L;
    private const long MfCountKill = 0x00400000L;
    private const int MaximumNativeActorCapacity = 64;
    private const int NumberOfWeapons = 9;
    private const int NoPendingWeapon = 10;

    private static readonly int[] RouteSectors = { 2, 3, 4, 0, 7, 54, 53, 71, 60 };
    private static readonly int[] EnemyAlcoveSectors = { 8, 51, 52 };

    private readonly PostComputerRoomRoutePolicy _policy;
    private string _sessionId = string.Empty;
    private string _runId = string.Empty;
    private long _runGeneration;
    private long _routeStartedAtControlTick;
    private long _legStartedAtControlTick;
    private int _ingressLegIndex;
    private int _legIndex;
    private int _poseMissingFrames;
    private bool _active;
    private bool _recoveringEnemyAlcove;
    private bool _completed;
    private bool _failed;
    private string _failureCode = string.Empty;
    private PostComputerRoomRouteWaypoint? _lastNavigationTarget;
    private long _lastStructuredRawFrameSequence = -1;
    private long _lastStructuredRawNativeGametic = -1;
    private string _lastStructuredContentSignature = string.Empty;
    private readonly List<StructuredCombatWindowEntry> _structuredCombatWindow = new();
    private StructuredCombatEvaluation _structuredCombat = StructuredCombatEvaluation.Unavailable(
        "structured-combat-not-evaluated");
    private long _targetActorIdentity;
    private int _targetActorSectorIndex = -1;
    private bool _targetTopologyAccepted;
    private string _targetTopologyReason = "native-actor-topology-not-evaluated";
    private long _targetAcquiredAtControlTick = -1;
    private int _targetKillCountAtAcquisition;
    private long _lastNativeActorSnapshotGametic = -1;
    private NativeActorCombatEvaluation _nativeActorCombat = NativeActorCombatEvaluation.Unavailable(
        "native-actor-combat-not-evaluated");
    private long _lastNativeWeaponSnapshotGametic = -1;
    private NativeWeaponCycleEvaluation _nativeWeaponCycle = NativeWeaponCycleEvaluation.Unavailable(
        "native-weapon-not-evaluated");
    private bool _nativeWeaponContinuationArmed;
    private long _nativeWeaponContinuationTargetIdentity;
    private int _nativeWeaponContinuationReadyWeapon = -1;
    private long _nativeWeaponContinuationAuthorizedAtControlTick = -1;
    private bool _nativeWeaponAttackContinuation;
    private readonly List<PostComputerRoomRouteReplayEntry> _routeReplay = new();
    private string _completionSessionId = string.Empty;
    private string _completionRunId = string.Empty;
    private long _completionRunGeneration;
    private long _completionAtControlTick = -1;
    private string _completionCode = string.Empty;
    private PostComputerRoomRouteReplayEntry? _completionSnapshot;
    private IReadOnlyList<PostComputerRoomRouteReplayEntry> _completionReplay
        = Array.Empty<PostComputerRoomRouteReplayEntry>();
    private long _failureAtControlTick = -1;
    private PostComputerRoomRouteReplayEntry? _failureSnapshot;
    private IReadOnlyList<PostComputerRoomRouteReplayEntry> _failureReplay
        = Array.Empty<PostComputerRoomRouteReplayEntry>();
    private PostComputerRoomRouteDecision? _lastEvaluatedDecision;

    internal PostComputerRoomRouteNavigator(PostComputerRoomRoutePolicy? policy = null)
    {
        _policy = policy ?? new PostComputerRoomRoutePolicy();
    }

    internal PostComputerRoomRouteDecision Evaluate(
        PostComputerRoomActivationProof? proof,
        BrowserPostComputerRoomRouteInput input)
    {
        ArgumentNullException.ThrowIfNull(input);
        if (proof is not null
            && ScopeMatches(proof, input)
            && _lastEvaluatedDecision is { } previous
            && string.Equals(previous.SessionId, proof.SessionId, StringComparison.Ordinal)
            && string.Equals(previous.RunId, proof.RunId, StringComparison.Ordinal)
            && previous.RunGeneration == proof.RunGeneration
            && previous.ControlTick == proof.ControlTick)
        {
            return previous;
        }

        var decision = EvaluateCore(proof, input);
        if (proof is not null && ScopeMatches(proof, input))
        {
            _lastEvaluatedDecision = decision;
        }

        return decision;
    }

    private PostComputerRoomRouteDecision EvaluateCore(
        PostComputerRoomActivationProof? proof,
        BrowserPostComputerRoomRouteInput input)
    {
        _nativeWeaponAttackContinuation = false;
        var combat = input.CombatObservation ?? new PostComputerRoomCombatObservation();
        var previousNativeActorCombat = _nativeActorCombat;
        _structuredCombat = StructuredCombatEvaluation.Unavailable(
            "structured-combat-not-evaluated");
        _nativeActorCombat = NativeActorCombatEvaluation.Unavailable(
            "native-actor-combat-not-evaluated");
        _nativeWeaponCycle = NativeWeaponCycleEvaluation.Unavailable(
            "native-weapon-not-evaluated");
        if (proof is null)
        {
            ClearNativeWeaponContinuation();
            return ProjectWaiting(input, combat, "first-door-handoff-proof-unavailable");
        }

        if (!ScopeMatches(proof, input))
        {
            ClearNativeWeaponContinuation();
            return ProjectWaiting(input, combat, "first-door-handoff-scope-mismatch");
        }

        if (!_active || ScopeChanged(proof))
        {
            Start(proof);
        }

        var proximity = proof.Proximity;
        if (_completed)
        {
            ClearNativeWeaponContinuation();
            return Project(
                proof,
                input,
                combat,
                PostComputerRoomRouteState.Complete,
                PostComputerRoomOwnershipDisposition.Completed,
                NeutralAction(),
                false,
                "central-hall-entry-confirmed");
        }

        if (_failed)
        {
            ClearNativeWeaponContinuation();
            return ProjectFailed(proof, input, combat);
        }

        BeginConfirmedMainRouteLeg(proof, proximity);
        if (!FreshCanonicalPose(proximity))
        {
            ClearNativeWeaponContinuation();
            if (_targetActorIdentity > 0)
            {
                _nativeActorCombat = previousNativeActorCombat with
                {
                    InputAccepted = false,
                    Fresh = false,
                    VisualEvidenceTrusted = false,
                    ActorMatched = false,
                    TargetRetained = true,
                    Trusted = false,
                    KillConfirmed = false,
                    TargetIdentity = _targetActorIdentity,
                    TargetSectorIndex = _targetActorSectorIndex,
                    TopologyAccepted = false,
                    TopologyReason = "native-actor-topology-player-pose-pending",
                    TargetLineOfSight = false,
                    TargetBearingDegrees = 0,
                    TargetBearingErrorDegrees = 0,
                    EngagementFrames = Frames(proof.ControlTick, _targetAcquiredAtControlTick),
                    KillCountAtAcquisition = _targetKillCountAtAcquisition,
                    CurrentKillCount = proximity.PlayerVitalityFactsAvailable
                        ? proximity.PlayerKillCount
                        : -1,
                    Reason = "native-actor-player-pose-pending"
                };
            }

            if (Frames(proof.ControlTick, _routeStartedAtControlTick)
                >= Math.Max(1, _policy.RouteTimeoutFrames))
            {
                return Fail(proof, input, combat, "post-computer-room-route-budget-exhausted");
            }

            if (_targetActorIdentity > 0
                && _nativeActorCombat.EngagementFrames
                    >= Math.Max(1, _policy.LegTimeoutFrames))
            {
                return Fail(
                    proof,
                    input,
                    combat,
                    "post-computer-room-combat-budget-exhausted");
            }

            var poseMissingLegTarget = CurrentMovementDeadlineTarget(proof, proximity);
            if (!string.Equals(
                    poseMissingLegTarget.Id,
                    "computer-room-confirmation-hold",
                    StringComparison.Ordinal)
                && Frames(proof.ControlTick, _legStartedAtControlTick)
                    >= Math.Max(1, _policy.LegTimeoutFrames))
            {
                return Fail(
                    proof,
                    input,
                    combat,
                    $"post-computer-room-leg-budget-exhausted:{poseMissingLegTarget.Id}",
                    poseMissingLegTarget);
            }

            _poseMissingFrames = SaturatingIncrement(_poseMissingFrames);
            if (_poseMissingFrames >= Math.Max(1, _policy.MaximumPoseMissingFrames))
            {
                return Fail(proof, input, combat, "post-computer-room-native-pose-missing-budget-exhausted");
            }

            return Project(
                proof,
                input,
                combat,
                _nativeActorCombat.TargetRetained
                    ? PostComputerRoomRouteState.InterceptEnemy
                    : PostComputerRoomRouteState.NavigateMainRoute,
                PostComputerRoomOwnershipDisposition.Exclusive,
                NeutralAction(),
                false,
                _nativeActorCombat.TargetRetained
                    ? _nativeActorCombat.Reason
                    : "post-computer-room-native-pose-pending");
        }

        _poseMissingFrames = 0;
        _structuredCombat = EvaluateStructuredCombat(proof, combat);
        _nativeActorCombat = EvaluateNativeActorCombat(proof, input.ActorSnapshot, combat);
        _nativeWeaponCycle = EvaluateNativeWeaponCycle(proof, input.WeaponSnapshot);
        if (Frames(proof.ControlTick, _routeStartedAtControlTick)
            >= Math.Max(1, _policy.RouteTimeoutFrames))
        {
            return Fail(proof, input, combat, "post-computer-room-route-budget-exhausted");
        }

        ReconcileCertifiedRouteLeg(proximity, proof.ControlTick);
        var currentMovementLegTarget = CurrentMovementDeadlineTarget(proof, proximity);

        if ((_nativeActorCombat.TargetRetained || _nativeActorCombat.KillConfirmed)
            && _nativeActorCombat.EngagementFrames >= Math.Max(1, _policy.LegTimeoutFrames))
        {
            return Fail(
                proof,
                input,
                combat,
                "post-computer-room-combat-budget-exhausted",
                currentMovementLegTarget);
        }

        if (!string.Equals(
                currentMovementLegTarget.Id,
                "computer-room-confirmation-hold",
                StringComparison.Ordinal)
            && Frames(proof.ControlTick, _legStartedAtControlTick)
                >= Math.Max(1, _policy.LegTimeoutFrames))
        {
            return Fail(
                proof,
                input,
                combat,
                $"post-computer-room-leg-budget-exhausted:{currentMovementLegTarget.Id}",
                currentMovementLegTarget);
        }

        var enemyAlcoveRecoveryRequired = EnemyAlcoveSectors.Contains(proximity.PlayerSectorIndex)
            || (_recoveringEnemyAlcove && proximity.PlayerSectorIndex == 7)
            || (proximity.PlayerSectorIndex == 7
                && proximity.PlayerX > 2144d
                && proximity.PlayerY > -2592d);
        PostComputerRoomRouteWaypoint? movementLegTarget = null;
        if (enemyAlcoveRecoveryRequired)
        {
            movementLegTarget = !proof.ComputerRoomConfirmed
                && proximity.PlayerSectorIndex == 7
                    ? RoomCertificationRecoveryTarget()
                    : RecoveryTarget(proximity);
        }
        else if (proof.ComputerRoomConfirmed)
        {
            movementLegTarget = PrepareMainRouteWaypoint(proximity, proof.ControlTick);
        }

        if (movementLegTarget is not null)
        {
            _lastNavigationTarget = movementLegTarget;
        }

        var localNoLosReposition = _nativeActorCombat.TargetRetained
            && _nativeActorCombat.Trusted
            && _nativeActorCombat.TopologyAccepted
            && !_nativeActorCombat.TargetLineOfSight;
        var localWeaponCycleRouteProgress = _nativeActorCombat.TargetRetained
            && _nativeActorCombat.Trusted
            && _nativeActorCombat.TopologyAccepted
            && _nativeActorCombat.TargetLineOfSight
            && _nativeWeaponCycle.InputAccepted
            && _nativeWeaponCycle.Fresh
            && !_nativeWeaponCycle.FireOpportunity;
        var actorAligned = _nativeActorCombat.TargetRetained
            && Math.Abs(_nativeActorCombat.TargetBearingErrorDegrees)
                <= _policy.AlignmentToleranceDegrees;
        var nativePlayerDead = proximity.PlayerVitalityFactsAvailable
            && (proximity.PlayerHealth <= 0 || proximity.PlayerState == 1);
        if (nativePlayerDead
            || !_nativeActorCombat.TargetRetained
            || (_nativeWeaponContinuationArmed
                && !NativeWeaponContinuationContextValid(actorAligned)))
        {
            ClearNativeWeaponContinuation();
        }

        if (_nativeActorCombat.TargetRetained)
        {
            if (nativePlayerDead)
            {
                return Project(
                    proof,
                    input,
                    combat,
                    PostComputerRoomRouteState.InterceptEnemy,
                    PostComputerRoomOwnershipDisposition.Exclusive,
                    NeutralAction(),
                    false,
                    "native-player-death-fire-release");
            }

            if (!_nativeActorCombat.Trusted || !_nativeActorCombat.TopologyAccepted)
            {
                ClearNativeWeaponContinuation();
                return Project(
                    proof,
                    input,
                    combat,
                    PostComputerRoomRouteState.InterceptEnemy,
                    PostComputerRoomOwnershipDisposition.Exclusive,
                    NeutralAction(),
                    false,
                    _nativeActorCombat.Reason);
            }

            if (_nativeActorCombat.TargetLineOfSight
                && (!_nativeWeaponCycle.InputAccepted || !_nativeWeaponCycle.Fresh))
            {
                ClearNativeWeaponContinuation();
                return Project(
                    proof,
                    input,
                    combat,
                    PostComputerRoomRouteState.InterceptEnemy,
                    PostComputerRoomOwnershipDisposition.Exclusive,
                    NeutralAction(),
                    false,
                    _nativeWeaponCycle.Reason);
            }

            if (_nativeActorCombat.TargetLineOfSight
                && _nativeWeaponCycle.FireOpportunity)
            {
                if (actorAligned)
                {
                    ArmNativeWeaponContinuation(proof.ControlTick);
                }
                else
                {
                    ClearNativeWeaponContinuation();
                }

                return Project(
                    proof,
                    input,
                    combat,
                    actorAligned
                        ? PostComputerRoomRouteState.FireReady
                        : PostComputerRoomRouteState.InterceptEnemy,
                    PostComputerRoomOwnershipDisposition.Exclusive,
                    actorAligned
                        ? AttackAction()
                        : TurnAction(_nativeActorCombat.TargetBearingErrorDegrees),
                    false,
                    actorAligned
                        ? "native-live-target-fire-opportunity"
                        : "native-live-target-fire-opportunity-bearing-intercept");
            }

            if (proximity.PlayerSectorIndex == 60
                && NativeWeaponContinuationContextValid(actorAligned)
                && !_nativeWeaponCycle.FireOpportunity
                && _nativeWeaponCycle.WeaponState != _nativeWeaponCycle.WeaponReadyState)
            {
                _nativeWeaponAttackContinuation = true;
                return Project(
                    proof,
                    input,
                    combat,
                    PostComputerRoomRouteState.FireReady,
                    PostComputerRoomOwnershipDisposition.Exclusive,
                    AttackAction(),
                    false,
                    "native-live-target-fire-cycle-continuation");
            }
        }

        if (proximity.PlayerSectorIndex == 60)
        {
            if (!proof.ComputerRoomConfirmed)
            {
                return Fail(proof, input, combat, "central-hall-reached-before-computer-room-confirmation");
            }

            if (localNoLosReposition || localWeaponCycleRouteProgress)
            {
                return Project(
                    proof,
                    input,
                    combat,
                    PostComputerRoomRouteState.InterceptEnemy,
                    PostComputerRoomOwnershipDisposition.Exclusive,
                    NeutralAction(),
                    false,
                    localNoLosReposition
                        ? "native-live-target-los-loss-central-hall-hold"
                        : "native-live-target-weapon-cycle-central-hall-hold");
            }

            _completed = true;
            return Project(
                proof,
                input,
                combat,
                PostComputerRoomRouteState.Complete,
                PostComputerRoomOwnershipDisposition.Completed,
                NeutralAction(),
                false,
                "central-hall-entry-confirmed");
        }

        if (!KnownRouteSector(proximity.PlayerSectorIndex))
        {
            return Fail(
                proof,
                input,
                combat,
                $"post-computer-room-unexpected-sector:{proximity.PlayerSectorIndex}");
        }

        if (enemyAlcoveRecoveryRequired)
        {
            _recoveringEnemyAlcove = true;
            if (!proof.ComputerRoomConfirmed && proximity.PlayerSectorIndex == 7)
            {
                var roomCertificationTarget = RoomCertificationRecoveryTarget();
                if (Distance(
                        proximity.PlayerX,
                        proximity.PlayerY,
                        roomCertificationTarget.X,
                        roomCertificationTarget.Y)
                    <= _policy.WaypointCompletionRadius)
                {
                    _recoveringEnemyAlcove = false;
                    _legStartedAtControlTick = proof.ControlTick;
                }
                else
                {
                    if (Frames(proof.ControlTick, _legStartedAtControlTick)
                        >= Math.Max(1, _policy.LegTimeoutFrames))
                    {
                        return Fail(
                            proof,
                            input,
                            combat,
                            $"post-computer-room-leg-budget-exhausted:{roomCertificationTarget.Id}",
                            roomCertificationTarget);
                    }

                    return ProjectToward(
                        proof,
                        input,
                        combat,
                        PostComputerRoomRouteState.RecoverEnemyAlcove,
                        roomCertificationTarget,
                        localNoLosReposition
                            ? "native-live-target-los-loss-room-certification-reposition"
                            : localWeaponCycleRouteProgress
                                ? "native-live-target-weapon-cycle-room-certification-progress"
                                : "enemy-alcove-room-certification-recovery");
                }
            }

            var recoveryTarget = RecoveryTarget(proximity);
            if (!_recoveringEnemyAlcove)
            {
                // The unconfirmed recovery above reached the sector-7 room
                // certification point. The confirmation hold below owns the
                // next action and must remain neutral.
            }
            else if (proximity.PlayerSectorIndex == 7
                && proximity.PlayerX <= 2128d
                && proximity.PlayerY <= -2616d)
            {
                _recoveringEnemyAlcove = false;
                _legIndex = 3;
                _legStartedAtControlTick = proof.ControlTick;
            }
            else
            {
                if (Frames(proof.ControlTick, _legStartedAtControlTick)
                    >= Math.Max(1, _policy.LegTimeoutFrames))
                {
                    return Fail(
                        proof,
                        input,
                        combat,
                        $"post-computer-room-leg-budget-exhausted:{recoveryTarget.Id}",
                        recoveryTarget);
                }

                return ProjectToward(
                    proof,
                    input,
                    combat,
                    PostComputerRoomRouteState.RecoverEnemyAlcove,
                    recoveryTarget,
                    localNoLosReposition
                        ? "native-live-target-los-loss-recovery-reposition"
                        : localWeaponCycleRouteProgress
                            ? "native-live-target-weapon-cycle-recovery-progress"
                            : "enemy-alcove-bounded-recovery");
            }
        }

        if (!proof.ComputerRoomConfirmed)
        {
            if (proximity.PlayerSectorIndex == 7)
            {
                return Project(
                    proof,
                    input,
                    combat,
                    PostComputerRoomRouteState.AwaitComputerRoomConfirmation,
                    PostComputerRoomOwnershipDisposition.Exclusive,
                    NeutralAction(),
                    false,
                    "computer-room-confirmation-pending",
                    new PostComputerRoomRouteWaypoint(
                        -1,
                        "computer-room-confirmation-hold",
                        proximity.PlayerX,
                        proximity.PlayerY,
                        Array.AsReadOnly(new[] { 7 })));
            }

            if (proximity.PlayerSectorIndex is not (2 or 3 or 4 or 0))
            {
                return Fail(
                    proof,
                    input,
                    combat,
                    $"computer-room-ingress-unexpected-sector:{proximity.PlayerSectorIndex}");
            }

            InferIngressLeg(proximity, proof.ControlTick);
            var ingress = _policy.IngressWaypoints[
                Math.Clamp(_ingressLegIndex, 0, _policy.IngressWaypoints.Count - 1)];
            while (IngressWaypointCertified(proximity, _ingressLegIndex, ingress)
                && _ingressLegIndex < _policy.IngressWaypoints.Count - 1)
            {
                _ingressLegIndex++;
                _legStartedAtControlTick = proof.ControlTick;
                ingress = _policy.IngressWaypoints[_ingressLegIndex];
            }

            if (!ingress.AllowedSectors.Contains(proximity.PlayerSectorIndex))
            {
                return Fail(
                    proof,
                    input,
                    combat,
                    $"computer-room-ingress-sector-contract:{proximity.PlayerSectorIndex}:{ingress.Id}",
                    ingress);
            }

            if (Frames(proof.ControlTick, _legStartedAtControlTick) >= Math.Max(1, _policy.LegTimeoutFrames))
            {
                return Fail(
                    proof,
                    input,
                    combat,
                    $"computer-room-ingress-leg-budget-exhausted:{ingress.Id}",
                    ingress);
            }

            return ProjectToward(
                proof,
                input,
                combat,
                PostComputerRoomRouteState.EnterComputerRoom,
                ingress,
                "computer-room-bounded-ingress");
        }

        var waypoint = movementLegTarget
            ?? PrepareMainRouteWaypoint(proximity, proof.ControlTick);

        if (Frames(proof.ControlTick, _legStartedAtControlTick) >= Math.Max(1, _policy.LegTimeoutFrames))
        {
            return Fail(
                proof,
                input,
                combat,
                $"post-computer-room-leg-budget-exhausted:{waypoint.Id}");
        }

        return ProjectToward(
            proof,
            input,
            combat,
            PostComputerRoomRouteState.NavigateMainRoute,
            waypoint,
            localNoLosReposition
                ? "native-live-target-los-loss-main-route-reposition"
                : localWeaponCycleRouteProgress
                    ? "native-live-target-weapon-cycle-main-route-progress"
                    : "post-computer-room-main-route");
    }

    private void Start(PostComputerRoomActivationProof proof)
    {
        _sessionId = proof.SessionId;
        _runId = proof.RunId;
        _runGeneration = proof.RunGeneration;
        _routeStartedAtControlTick = proof.ControlTick;
        _legStartedAtControlTick = proof.ControlTick;
        _ingressLegIndex = InitialIngressLeg(proof.Proximity);
        _legIndex = InitialLeg(proof.Proximity);
        _poseMissingFrames = 0;
        _active = true;
        _recoveringEnemyAlcove = EnemyAlcoveSectors.Contains(proof.Proximity.PlayerSectorIndex);
        _completed = false;
        _failed = false;
        _failureCode = string.Empty;
        _lastNavigationTarget = null;
        _lastStructuredRawFrameSequence = -1;
        _lastStructuredRawNativeGametic = -1;
        _lastStructuredContentSignature = string.Empty;
        _structuredCombatWindow.Clear();
        _structuredCombat = StructuredCombatEvaluation.Unavailable(
            "structured-combat-run-start");
        _targetActorIdentity = 0;
        _targetActorSectorIndex = -1;
        _targetTopologyAccepted = false;
        _targetTopologyReason = "native-actor-topology-not-evaluated";
        _targetAcquiredAtControlTick = -1;
        _targetKillCountAtAcquisition = 0;
        _lastNativeActorSnapshotGametic = -1;
        _nativeActorCombat = NativeActorCombatEvaluation.Unavailable(
            "native-actor-combat-run-start");
        _lastNativeWeaponSnapshotGametic = -1;
        _nativeWeaponCycle = NativeWeaponCycleEvaluation.Unavailable(
            "native-weapon-run-start");
        ClearNativeWeaponContinuation();
        _routeReplay.Clear();
        _completionSessionId = string.Empty;
        _completionRunId = string.Empty;
        _completionRunGeneration = 0;
        _completionAtControlTick = -1;
        _completionCode = string.Empty;
        _completionSnapshot = null;
        _completionReplay = Array.Empty<PostComputerRoomRouteReplayEntry>();
        _failureAtControlTick = -1;
        _failureSnapshot = null;
        _failureReplay = Array.Empty<PostComputerRoomRouteReplayEntry>();
    }

    private void ArmNativeWeaponContinuation(long controlTick)
    {
        _nativeWeaponContinuationArmed = true;
        _nativeWeaponContinuationTargetIdentity = _nativeActorCombat.TargetIdentity;
        _nativeWeaponContinuationReadyWeapon = _nativeWeaponCycle.ReadyWeapon;
        _nativeWeaponContinuationAuthorizedAtControlTick = controlTick;
    }

    private void ClearNativeWeaponContinuation()
    {
        _nativeWeaponContinuationArmed = false;
        _nativeWeaponContinuationTargetIdentity = 0;
        _nativeWeaponContinuationReadyWeapon = -1;
        _nativeWeaponContinuationAuthorizedAtControlTick = -1;
        _nativeWeaponAttackContinuation = false;
    }

    private bool NativeWeaponContinuationContextValid(bool actorAligned)
        => _nativeWeaponContinuationArmed
            && _nativeActorCombat.TargetRetained
            && _nativeActorCombat.Trusted
            && _nativeActorCombat.TopologyAccepted
            && _nativeActorCombat.TargetLineOfSight
            && actorAligned
            && _nativeWeaponCycle.InputAccepted
            && _nativeWeaponCycle.Fresh
            && _nativeWeaponCycle.PendingWeapon == NoPendingWeapon
            && _nativeWeaponContinuationTargetIdentity == _nativeActorCombat.TargetIdentity
            && _nativeWeaponContinuationReadyWeapon == _nativeWeaponCycle.ReadyWeapon;

    private void InferForwardLeg(FirstDoorProximityObservation proximity, long controlTick)
    {
        var inferred = InitialLeg(proximity);
        if (inferred > _legIndex)
        {
            _legIndex = inferred;
            _legStartedAtControlTick = controlTick;
        }
    }

    private PostComputerRoomRouteWaypoint PrepareMainRouteWaypoint(
        FirstDoorProximityObservation proximity,
        long controlTick)
    {
        InferForwardLeg(proximity, controlTick);
        var waypoint = _policy.Waypoints[Math.Clamp(_legIndex, 0, _policy.Waypoints.Count - 1)];
        while (RouteWaypointCertified(proximity, waypoint)
            && _legIndex < _policy.Waypoints.Count - 1)
        {
            _legIndex++;
            _legStartedAtControlTick = controlTick;
            waypoint = _policy.Waypoints[_legIndex];
        }

        return waypoint;
    }

    private PostComputerRoomRouteWaypoint CurrentMovementDeadlineTarget(
        PostComputerRoomActivationProof proof,
        FirstDoorProximityObservation proximity)
    {
        if (_recoveringEnemyAlcove
            && !proof.ComputerRoomConfirmed
            && proximity.PlayerSectorIndex == 7)
        {
            return RoomCertificationRecoveryTarget();
        }

        if (_lastNavigationTarget is not null)
        {
            return _lastNavigationTarget;
        }

        if (_recoveringEnemyAlcove || EnemyAlcoveSectors.Contains(proximity.PlayerSectorIndex))
        {
            return !proof.ComputerRoomConfirmed && proximity.PlayerSectorIndex == 7
                ? RoomCertificationRecoveryTarget()
                : RecoveryTarget(proximity);
        }

        if (!proof.ComputerRoomConfirmed)
        {
            return proximity.PlayerSectorIndex == 7
                ? new PostComputerRoomRouteWaypoint(
                    -1,
                    "computer-room-confirmation-hold",
                    proximity.PlayerX,
                    proximity.PlayerY,
                    Array.AsReadOnly(new[] { 7 }))
                : _policy.IngressWaypoints[
                    Math.Clamp(_ingressLegIndex, 0, _policy.IngressWaypoints.Count - 1)];
        }

        return _policy.Waypoints[Math.Clamp(_legIndex, 0, _policy.Waypoints.Count - 1)];
    }

    private void ReconcileCertifiedRouteLeg(
        FirstDoorProximityObservation proximity,
        long controlTick)
    {
        var certifiedCeiling = proximity.PlayerSectorIndex switch
        {
            7 => 4,
            54 => 6,
            53 => 7,
            71 => 8,
            _ => int.MaxValue
        };
        if (_legIndex <= certifiedCeiling)
        {
            return;
        }

        _legIndex = Math.Min(certifiedCeiling, _policy.Waypoints.Count - 1);
        _legStartedAtControlTick = controlTick;
        _lastNavigationTarget = null;
    }

    private void BeginConfirmedMainRouteLeg(
        PostComputerRoomActivationProof proof,
        FirstDoorProximityObservation proximity)
    {
        if (!proof.ComputerRoomConfirmed
            || !string.Equals(
                _lastNavigationTarget?.Id,
                "computer-room-confirmation-hold",
                StringComparison.Ordinal))
        {
            return;
        }

        _legIndex = InitialLeg(proximity);
        _legStartedAtControlTick = proof.ControlTick;
        _lastNavigationTarget = null;
    }

    private void InferIngressLeg(FirstDoorProximityObservation proximity, long controlTick)
    {
        var inferred = InitialIngressLeg(proximity);
        if (inferred > _ingressLegIndex)
        {
            _ingressLegIndex = inferred;
            _legStartedAtControlTick = controlTick;
        }
    }

    private static int InitialIngressLeg(FirstDoorProximityObservation proximity)
        => proximity.PlayerSectorIndex switch
        {
            7 => 3,
            0 => 2,
            4 => 2,
            3 => 1,
            2 when proximity.PlayerX >= 1424d => 1,
            _ => 0
        };

    private bool IngressWaypointCertified(
        FirstDoorProximityObservation proximity,
        int ingressLegIndex,
        PostComputerRoomRouteWaypoint waypoint)
    {
        var certifiedSector = ingressLegIndex switch
        {
            0 => 2,
            1 => 3,
            2 => 0,
            3 => 7,
            _ => -1
        };
        return proximity.PlayerSectorIndex == certifiedSector
            && Distance(proximity.PlayerX, proximity.PlayerY, waypoint.X, waypoint.Y)
                <= _policy.WaypointCompletionRadius;
    }

    private bool RouteWaypointCertified(
        FirstDoorProximityObservation proximity,
        PostComputerRoomRouteWaypoint waypoint)
        => waypoint.AllowedSectors.Contains(proximity.PlayerSectorIndex)
            && Distance(proximity.PlayerX, proximity.PlayerY, waypoint.X, waypoint.Y)
                <= _policy.WaypointCompletionRadius;

    private int InitialLeg(FirstDoorProximityObservation proximity)
        => proximity.PlayerSectorIndex switch
        {
            60 => _policy.Waypoints.Count - 1,
            71 => 7,
            53 => 6,
            54 => 5,
            7 when proximity.PlayerY <= -2592d && proximity.PlayerX >= 2384d => 4,
            7 when proximity.PlayerY <= -2592d && proximity.PlayerX >= 2032d => 3,
            7 when proximity.PlayerX >= 2032d => 2,
            7 when proximity.PlayerX >= 1728d => 1,
            _ => 0
        };

    private PostComputerRoomRouteDecision ProjectToward(
        PostComputerRoomActivationProof proof,
        BrowserPostComputerRoomRouteInput input,
        PostComputerRoomCombatObservation combat,
        PostComputerRoomRouteState state,
        PostComputerRoomRouteWaypoint target,
        string reason)
    {
        var metrics = Metrics(proof.Proximity, target.X, target.Y);
        var action = Math.Abs(metrics.BearingErrorDegrees) > _policy.AlignmentToleranceDegrees
            ? TurnAction(metrics.BearingErrorDegrees)
            : ForwardAction();
        return Project(
            proof,
            input,
            combat,
            state,
            PostComputerRoomOwnershipDisposition.Exclusive,
            action,
            action.MoveForward,
            reason,
            target,
            metrics);
    }

    private PostComputerRoomRouteDecision ProjectWaiting(
        BrowserPostComputerRoomRouteInput input,
        PostComputerRoomCombatObservation combat,
        string reason)
        => new()
        {
            PolicyVersion = _policy.PolicyVersion,
            ContractVersion = input.ContractVersion,
            SessionId = input.SessionId,
            RunId = input.RunId,
            RunGeneration = input.RunGeneration,
            ExpectedFirstDoorControlTick = input.ExpectedFirstDoorControlTick,
            ControlTick = input.ExpectedFirstDoorControlTick,
            State = PostComputerRoomRouteState.WaitingForFirstDoorHandoff,
            OwnershipDisposition = PostComputerRoomOwnershipDisposition.NotAcquired,
            OwnerId = "post-computer-room.waiting",
            ReasonCode = reason,
            CombatObservation = combat,
            ActorSnapshot = input.ActorSnapshot ?? new PostComputerRoomNativeActorSnapshot(),
            WeaponSnapshot = input.WeaponSnapshot ?? new PostComputerRoomNativeWeaponSnapshot(),
            SemanticProjection = new PostComputerRoomRouteSemanticProjection
            {
                ComputerRoomEntered = false
            }
        };

    private PostComputerRoomRouteDecision ProjectFailed(
        PostComputerRoomActivationProof proof,
        BrowserPostComputerRoomRouteInput input,
        PostComputerRoomCombatObservation combat)
        => Project(
            proof,
            input,
            combat,
            PostComputerRoomRouteState.FailedSafeStop,
            PostComputerRoomOwnershipDisposition.FailedSafeStop,
            NeutralAction(),
            false,
            _failureCode);

    private PostComputerRoomRouteDecision Fail(
        PostComputerRoomActivationProof proof,
        BrowserPostComputerRoomRouteInput input,
        PostComputerRoomCombatObservation combat,
        string failureCode,
        PostComputerRoomRouteWaypoint? failureTarget = null)
    {
        ClearNativeWeaponContinuation();
        _failed = true;
        _failureCode = failureCode;
        if (failureTarget is not null)
        {
            _lastNavigationTarget = failureTarget;
        }
        return ProjectFailed(proof, input, combat);
    }

    private PostComputerRoomRouteDecision Project(
        PostComputerRoomActivationProof proof,
        BrowserPostComputerRoomRouteInput input,
        PostComputerRoomCombatObservation combat,
        PostComputerRoomRouteState state,
        PostComputerRoomOwnershipDisposition disposition,
        ActionCommand action,
        bool runRequested,
        string reason,
        PostComputerRoomRouteWaypoint? target = null,
        NavigationMetrics? metrics = null)
    {
        target ??= _lastNavigationTarget
            ?? _policy.Waypoints[Math.Clamp(_legIndex, 0, _policy.Waypoints.Count - 1)];
        _lastNavigationTarget = target;
        metrics ??= Metrics(proof.Proximity, target.X, target.Y);
        var routeFrames = state == PostComputerRoomRouteState.Complete
            && _completionSnapshot is not null
                ? _completionSnapshot.RouteFrames
                : Frames(proof.ControlTick, _routeStartedAtControlTick);
        var legFrames = state == PostComputerRoomRouteState.Complete
            && _completionSnapshot is not null
                ? _completionSnapshot.LegFrames
                : Frames(proof.ControlTick, _legStartedAtControlTick);
        CaptureReplay(new PostComputerRoomRouteReplayEntry
        {
            ControlTick = proof.ControlTick,
            NativeGametic = proof.Proximity.NativeGametic,
            State = state,
            ReasonCode = reason,
            PlayerSectorIndex = proof.Proximity.PlayerSectorIndex,
            PlayerX = proof.Proximity.PlayerX,
            PlayerY = proof.Proximity.PlayerY,
            LegIndex = target.Index,
            LegId = target.Id,
            RouteFrames = routeFrames,
            LegFrames = legFrames,
            NativeActorTargetIdentity = _nativeActorCombat.TargetIdentity,
            NativeActorTargetSectorIndex = _nativeActorCombat.TargetSectorIndex,
            NativeActorTopologyAccepted = _nativeActorCombat.TopologyAccepted,
            NativeActorTopologyReason = _nativeActorCombat.TopologyReason,
            NativeActorTargetHealth = _nativeActorCombat.TargetHealth,
            NativeActorTargetLineOfSight = _nativeActorCombat.TargetLineOfSight,
            NativeActorTargetBearingErrorDegrees = _nativeActorCombat.TargetBearingErrorDegrees,
            NativeActorEngagementFrames = _nativeActorCombat.EngagementFrames,
            NativeActorCombatReason = _nativeActorCombat.Reason,
            NativeWeaponSnapshotAccepted = _nativeWeaponCycle.InputAccepted,
            NativeWeaponSnapshotFresh = _nativeWeaponCycle.Fresh,
            NativeWeaponFireOpportunity = _nativeWeaponCycle.FireOpportunity,
            NativeWeaponContinuationArmed = _nativeWeaponContinuationArmed,
            NativeWeaponContinuationTargetIdentity = _nativeWeaponContinuationTargetIdentity,
            NativeWeaponContinuationReadyWeapon = _nativeWeaponContinuationReadyWeapon,
            NativeWeaponContinuationAuthorizedAtControlTick =
                _nativeWeaponContinuationAuthorizedAtControlTick,
            NativeWeaponAttackContinuation = _nativeWeaponAttackContinuation,
            NativeWeaponStateCount = _nativeWeaponCycle.StateCount,
            NativeReadyWeapon = _nativeWeaponCycle.ReadyWeapon,
            NativePendingWeapon = _nativeWeaponCycle.PendingWeapon,
            NativeWeaponState = _nativeWeaponCycle.WeaponState,
            NativeWeaponReadyState = _nativeWeaponCycle.WeaponReadyState,
            NativeWeaponRefire = _nativeWeaponCycle.Refire,
            NativeWeaponReason = _nativeWeaponCycle.Reason,
            Action = action,
            RunRequested = runRequested
        });
        return new PostComputerRoomRouteDecision
        {
            PolicyVersion = _policy.PolicyVersion,
            ContractVersion = input.ContractVersion,
            SessionId = proof.SessionId,
            RunId = proof.RunId,
            RunGeneration = proof.RunGeneration,
            ControlTick = proof.ControlTick,
            ExpectedFirstDoorControlTick = input.ExpectedFirstDoorControlTick,
            NativeGametic = proof.Proximity.NativeGametic,
            State = state,
            OwnershipDisposition = disposition,
            OwnerId = disposition == PostComputerRoomOwnershipDisposition.FailedSafeStop
                ? "post-computer-room.failed-safe-stop"
                : disposition == PostComputerRoomOwnershipDisposition.Completed
                    ? "post-computer-room.central-hall"
                    : state is PostComputerRoomRouteState.InterceptEnemy or PostComputerRoomRouteState.FireReady
                        ? "post-computer-room.combat"
                        : "post-computer-room.main-route",
            ReasonCode = reason,
            Action = action,
            RunRequested = runRequested,
            Exclusive = disposition is PostComputerRoomOwnershipDisposition.Exclusive
                or PostComputerRoomOwnershipDisposition.FailedSafeStop,
            Completed = disposition == PostComputerRoomOwnershipDisposition.Completed,
            CombatObservation = combat,
            ActorSnapshot = input.ActorSnapshot ?? new PostComputerRoomNativeActorSnapshot(),
            WeaponSnapshot = input.WeaponSnapshot ?? new PostComputerRoomNativeWeaponSnapshot(),
            Proximity = proof.Proximity,
            Navigation = new PostComputerRoomRouteNavigationSnapshot
            {
                PolicyVersion = _policy.PolicyVersion,
                Active = _active,
                RecoveringEnemyAlcove = _recoveringEnemyAlcove,
                LegIndex = target.Index,
                LegId = target.Id,
                TargetX = target.X,
                TargetY = target.Y,
                AllowedSectors = target.AllowedSectors.ToArray(),
                NativeGametic = proof.Proximity.NativeGametic,
                PlayerX = proof.Proximity.PlayerX,
                PlayerY = proof.Proximity.PlayerY,
                HeadingDegrees = proof.Proximity.HeadingDegrees,
                PlayerSectorIndex = proof.Proximity.PlayerSectorIndex,
                TargetDistance = metrics.TargetDistance,
                TargetBearingDegrees = metrics.TargetBearingDegrees,
                BearingErrorDegrees = metrics.BearingErrorDegrees,
                RouteFrames = routeFrames,
                RouteTimeoutFrames = _policy.RouteTimeoutFrames,
                RouteRemainingFrames = Math.Max(0, _policy.RouteTimeoutFrames - routeFrames),
                LegFrames = legFrames,
                LegTimeoutFrames = _policy.LegTimeoutFrames,
                LegRemainingFrames = Math.Max(0, _policy.LegTimeoutFrames - legFrames),
                PoseMissingFrames = _poseMissingFrames,
                TrustedCombatEvidence = TrustedCombat(combat),
                LegacyTrustedCombatEvidence = LegacyTrustedCombat(combat),
                StructuredCombatInputAccepted = _structuredCombat.InputAccepted,
                StructuredCombatFresh = _structuredCombat.Fresh,
                StructuredCombatCandidate = _structuredCombat.Candidate,
                StructuredCombatTrusted = _structuredCombat.Trusted,
                StructuredCombatDistinctFrames = _structuredCombat.DistinctFrames,
                StructuredCombatPeak = _structuredCombat.Peak,
                StructuredCombatTotal = _structuredCombat.Total,
                StructuredCombatSupportCells = _structuredCombat.SupportCells,
                StructuredCombatCenterCell = _structuredCombat.CenterCell,
                StructuredCombatLateralBias = _structuredCombat.LateralBias,
                StructuredCombatCentered = _structuredCombat.Centered,
                StructuredCombatReason = _structuredCombat.Reason,
                EnemyStructuralDecoy = combat.EnemyStructuralDecoy,
                NativeActorSnapshotAccepted = _nativeActorCombat.InputAccepted,
                NativeActorSnapshotFresh = _nativeActorCombat.Fresh,
                NativeActorVisualEvidenceTrusted = _nativeActorCombat.VisualEvidenceTrusted,
                NativeActorMatched = _nativeActorCombat.ActorMatched,
                NativeActorTargetRetained = _nativeActorCombat.TargetRetained,
                NativeActorCombatTrusted = _nativeActorCombat.Trusted,
                NativeActorKillConfirmed = _nativeActorCombat.KillConfirmed,
                NativeActorTargetIdentity = _nativeActorCombat.TargetIdentity,
                NativeActorTargetSectorIndex = _nativeActorCombat.TargetSectorIndex,
                NativeActorTopologyAccepted = _nativeActorCombat.TopologyAccepted,
                NativeActorTopologyReason = _nativeActorCombat.TopologyReason,
                NativeActorTargetType = _nativeActorCombat.TargetType,
                NativeActorTargetHealth = _nativeActorCombat.TargetHealth,
                NativeActorTargetFlags = _nativeActorCombat.TargetFlags,
                NativeActorTargetLineOfSight = _nativeActorCombat.TargetLineOfSight,
                NativeActorTargetBearingDegrees = _nativeActorCombat.TargetBearingDegrees,
                NativeActorTargetBearingErrorDegrees = _nativeActorCombat.TargetBearingErrorDegrees,
                NativeActorEngagementFrames = _nativeActorCombat.EngagementFrames,
                NativeActorKillCountAtAcquisition = _nativeActorCombat.KillCountAtAcquisition,
                NativeActorCurrentKillCount = _nativeActorCombat.CurrentKillCount,
                NativeActorCombatReason = _nativeActorCombat.Reason,
                NativeWeaponSnapshotAccepted = _nativeWeaponCycle.InputAccepted,
                NativeWeaponSnapshotFresh = _nativeWeaponCycle.Fresh,
                NativeWeaponStateCount = _nativeWeaponCycle.StateCount,
                NativeReadyWeapon = _nativeWeaponCycle.ReadyWeapon,
                NativePendingWeapon = _nativeWeaponCycle.PendingWeapon,
                NativeWeaponState = _nativeWeaponCycle.WeaponState,
                NativeWeaponReadyState = _nativeWeaponCycle.WeaponReadyState,
                NativeWeaponRefire = _nativeWeaponCycle.Refire,
                NativeWeaponFireOpportunity = _nativeWeaponCycle.FireOpportunity,
                NativeWeaponContinuationArmed = _nativeWeaponContinuationArmed,
                NativeWeaponContinuationTargetIdentity = _nativeWeaponContinuationTargetIdentity,
                NativeWeaponContinuationReadyWeapon = _nativeWeaponContinuationReadyWeapon,
                NativeWeaponContinuationAuthorizedAtControlTick =
                    _nativeWeaponContinuationAuthorizedAtControlTick,
                NativeWeaponAttackContinuation = _nativeWeaponAttackContinuation,
                NativeWeaponReason = _nativeWeaponCycle.Reason,
                FailureCode = _failureCode
            },
            SemanticProjection = new PostComputerRoomRouteSemanticProjection
            {
                FirstDoorOpenConfirmationSource = proof.OpenConfirmationSource,
                Telos = proof.ComputerRoomConfirmed ? "CentralHall" : "PostDoor",
                Objective = proof.ComputerRoomConfirmed
                    ? "reach-central-hall"
                    : "enter-computer-room",
                ComputerRoomEntered = proof.ComputerRoomConfirmed,
                CentralHallEntered = _completed
            },
            FailureTrace = CreateFailureTrace(),
            CompletionTrace = CreateCompletionTrace(),
            ContractError = proof.ContractError
        };
    }

    private void CaptureReplay(PostComputerRoomRouteReplayEntry entry)
    {
        if (_failureAtControlTick >= 0 || _completionAtControlTick >= 0)
        {
            return;
        }

        while (_routeReplay.Count > 0
            && _routeReplay[^1].ControlTick >= entry.ControlTick)
        {
            _routeReplay.RemoveAt(_routeReplay.Count - 1);
        }

        _routeReplay.Add(entry);
        while (_routeReplay.Count > PostComputerRoomFailureTrace.ReplayCapacity)
        {
            _routeReplay.RemoveAt(0);
        }

        if (_completed)
        {
            _completionSessionId = _sessionId;
            _completionRunId = _runId;
            _completionRunGeneration = _runGeneration;
            _completionAtControlTick = entry.ControlTick;
            _completionCode = entry.ReasonCode;
            _completionSnapshot = entry;
            _completionReplay = _routeReplay.ToArray();
            return;
        }

        if (!_failed)
        {
            return;
        }

        _failureAtControlTick = entry.ControlTick;
        _failureSnapshot = entry;
        _failureReplay = _routeReplay.ToArray();
    }

    private PostComputerRoomFailureTrace CreateFailureTrace()
        => new()
        {
            Failed = _failureAtControlTick >= 0,
            FailureAtControlTick = _failureAtControlTick,
            FailureCode = _failureAtControlTick >= 0 ? _failureCode : string.Empty,
            FailureSnapshot = _failureSnapshot,
            Replay = _failureReplay.ToArray()
        };

    private PostComputerRoomCompletionTrace CreateCompletionTrace()
        => new()
        {
            Completed = _completionAtControlTick >= 0,
            SessionId = _completionAtControlTick >= 0 ? _completionSessionId : string.Empty,
            RunId = _completionAtControlTick >= 0 ? _completionRunId : string.Empty,
            RunGeneration = _completionAtControlTick >= 0 ? _completionRunGeneration : 0,
            CompletionAtControlTick = _completionAtControlTick,
            CompletionCode = _completionAtControlTick >= 0 ? _completionCode : string.Empty,
            CompletionSnapshot = _completionSnapshot,
            Replay = _completionReplay.ToArray()
        };

    private static bool ScopeMatches(
        PostComputerRoomActivationProof proof,
        BrowserPostComputerRoomRouteInput input)
        => input.ContractVersion == 2
            && string.Equals(proof.SessionId, input.SessionId, StringComparison.Ordinal)
            && string.Equals(proof.RunId, input.RunId, StringComparison.Ordinal)
            && proof.RunGeneration == input.RunGeneration
            && proof.ControlTick == input.ExpectedFirstDoorControlTick;

    private bool ScopeChanged(PostComputerRoomActivationProof proof)
        => !string.Equals(_sessionId, proof.SessionId, StringComparison.Ordinal)
            || !string.Equals(_runId, proof.RunId, StringComparison.Ordinal)
            || _runGeneration != proof.RunGeneration;

    private static bool FreshCanonicalPose(FirstDoorProximityObservation proximity)
        => proximity.Available
            && proximity.Fresh
            && proximity.WadVerified
            && string.Equals(
                proximity.WadContentSha256,
                FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
                StringComparison.Ordinal)
            && proximity.NativeGameState == 0
            && proximity.NativeGameEpisode == 1
            && proximity.NativeGameMap == 1;

    private static bool KnownRouteSector(int sector)
        => RouteSectors.Contains(sector) || EnemyAlcoveSectors.Contains(sector);

    private bool LegacyTrustedCombat(PostComputerRoomCombatObservation combat)
        => combat.VisualEnemyVisible
            && !combat.EnemyStructuralDecoy
            && combat.EnemyConfidence >= _policy.TrustedVisualEnemyConfidence;

    private bool TrustedCombat(PostComputerRoomCombatObservation combat)
        => _nativeActorCombat.Trusted;

    private NativeActorCombatEvaluation EvaluateNativeActorCombat(
        PostComputerRoomActivationProof proof,
        PostComputerRoomNativeActorSnapshot snapshot,
        PostComputerRoomCombatObservation combat)
    {
        var currentKillCount = proof.Proximity.PlayerVitalityFactsAvailable
            ? proof.Proximity.PlayerKillCount
            : -1;
        var engagementFrames = _targetActorIdentity > 0
            ? Frames(proof.ControlTick, _targetAcquiredAtControlTick)
            : 0;
        NativeActorCombatEvaluation Pending(
            string reason,
            bool inputAccepted = false,
            bool fresh = false)
            => new(
                InputAccepted: inputAccepted,
                Fresh: fresh,
                VisualEvidenceTrusted: false,
                ActorMatched: false,
                TargetRetained: _targetActorIdentity > 0,
                Trusted: false,
                KillConfirmed: false,
                TargetIdentity: _targetActorIdentity,
                TargetType: -1,
                TargetHealth: 0,
                TargetFlags: 0,
                TargetLineOfSight: false,
                TargetBearingDegrees: 0,
                TargetBearingErrorDegrees: 0,
                EngagementFrames: engagementFrames,
                KillCountAtAcquisition: _targetKillCountAtAcquisition,
                CurrentKillCount: currentKillCount,
                Reason: reason)
            {
                TargetSectorIndex = _targetActorSectorIndex,
                TopologyAccepted = _targetTopologyAccepted,
                TopologyReason = _targetTopologyReason
            };

        if (!proof.ComputerRoomConfirmed)
        {
            return Pending("native-actor-combat-computer-room-unconfirmed");
        }

        if (!proof.Proximity.PlayerVitalityFactsAvailable
            || proof.Proximity.PlayerKillCount < 0)
        {
            return Pending("native-actor-player-vitality-unavailable");
        }

        if (snapshot is null || !snapshot.Available)
        {
            return Pending("native-actor-snapshot-unavailable");
        }

        if (snapshot.Truncated)
        {
            return Pending("native-actor-snapshot-truncated");
        }

        if (snapshot.Gametic < 0
            || snapshot.Gametic != proof.Proximity.NativeGametic)
        {
            return Pending("native-actor-snapshot-gametic-mismatch");
        }

        var actors = snapshot.Actors ?? Array.Empty<PostComputerRoomNativeActorFact>();
        if (snapshot.Capacity <= 0
            || snapshot.Capacity > MaximumNativeActorCapacity
            || snapshot.Count < 0
            || snapshot.Count > snapshot.Capacity
            || actors.Count != snapshot.Count)
        {
            return Pending("native-actor-snapshot-shape-invalid");
        }

        var identities = new HashSet<long>();
        foreach (var actor in actors)
        {
            if (actor.Identity <= 0
                || actor.Identity > uint.MaxValue
                || !identities.Add(actor.Identity)
                || actor.XFixed < int.MinValue
                || actor.XFixed > int.MaxValue
                || actor.YFixed < int.MinValue
                || actor.YFixed > int.MaxValue
                || actor.SectorIndex < 0
                || actor.Type < 0
                || actor.Flags < 0
                || actor.Flags > uint.MaxValue)
            {
                return Pending("native-actor-snapshot-actor-invalid");
            }
        }

        if (_lastNativeActorSnapshotGametic >= 0
            && snapshot.Gametic < _lastNativeActorSnapshotGametic)
        {
            return Pending("native-actor-snapshot-gametic-rewound");
        }

        var snapshotFresh = snapshot.Gametic > _lastNativeActorSnapshotGametic;
        if (!snapshotFresh)
        {
            return Pending(
                "native-actor-snapshot-duplicate-gametic",
                inputAccepted: true);
        }

        _lastNativeActorSnapshotGametic = snapshot.Gametic;

        NativeActorCombatEvaluation ProjectActor(
            PostComputerRoomNativeActorFact actor,
            bool visualEvidenceTrusted,
            bool acquired)
        {
            var metrics = ActorMetrics(proof.Proximity, actor);
            var topology = EvaluateActorTopology(
                proof.Proximity.PlayerSectorIndex,
                actor.SectorIndex);
            _targetActorSectorIndex = actor.SectorIndex;
            _targetTopologyAccepted = topology.Accepted;
            _targetTopologyReason = topology.Reason;
            return new NativeActorCombatEvaluation(
                InputAccepted: true,
                Fresh: true,
                VisualEvidenceTrusted: visualEvidenceTrusted,
                ActorMatched: true,
                TargetRetained: true,
                Trusted: IsLiveShootableCountKill(actor),
                KillConfirmed: false,
                TargetIdentity: actor.Identity,
                TargetType: actor.Type,
                TargetHealth: actor.Health,
                TargetFlags: actor.Flags,
                TargetLineOfSight: actor.LineOfSight,
                TargetBearingDegrees: metrics.TargetBearingDegrees,
                TargetBearingErrorDegrees: metrics.BearingErrorDegrees,
                EngagementFrames: acquired
                    ? 0
                    : Frames(proof.ControlTick, _targetAcquiredAtControlTick),
                KillCountAtAcquisition: _targetKillCountAtAcquisition,
                CurrentKillCount: proof.Proximity.PlayerKillCount,
                Reason: acquired
                    ? "native-live-target-acquired"
                    : actor.LineOfSight
                        ? "native-live-target-retained"
                        : "native-live-target-retained-without-los")
            {
                TargetSectorIndex = actor.SectorIndex,
                TopologyAccepted = topology.Accepted,
                TopologyReason = topology.Reason
            };
        }

        void ClearRetainedTarget()
        {
            _targetActorIdentity = 0;
            _targetActorSectorIndex = -1;
            _targetTopologyAccepted = false;
            _targetTopologyReason = "native-actor-topology-not-evaluated";
            _targetAcquiredAtControlTick = -1;
            _targetKillCountAtAcquisition = 0;
        }

        if (_targetActorIdentity > 0)
        {
            var retained = actors.FirstOrDefault(actor => actor.Identity == _targetActorIdentity);
            if (retained is not null)
            {
                var topology = EvaluateActorTopology(
                    proof.Proximity.PlayerSectorIndex,
                    retained.SectorIndex);
                if (!topology.Accepted)
                {
                    var releasedIdentity = _targetActorIdentity;
                    var releasedKillCountAtAcquisition = _targetKillCountAtAcquisition;
                    var releasedMetrics = ActorMetrics(proof.Proximity, retained);
                    ClearRetainedTarget();
                    return new NativeActorCombatEvaluation(
                        InputAccepted: true,
                        Fresh: true,
                        VisualEvidenceTrusted: false,
                        ActorMatched: true,
                        TargetRetained: false,
                        Trusted: false,
                        KillConfirmed: false,
                        TargetIdentity: releasedIdentity,
                        TargetType: retained.Type,
                        TargetHealth: retained.Health,
                        TargetFlags: retained.Flags,
                        TargetLineOfSight: retained.LineOfSight,
                        TargetBearingDegrees: releasedMetrics.TargetBearingDegrees,
                        TargetBearingErrorDegrees: releasedMetrics.BearingErrorDegrees,
                        EngagementFrames: engagementFrames,
                        KillCountAtAcquisition: releasedKillCountAtAcquisition,
                        CurrentKillCount: proof.Proximity.PlayerKillCount,
                        Reason: "native-retained-target-topology-left-window")
                    {
                        TargetSectorIndex = retained.SectorIndex,
                        TopologyAccepted = false,
                        TopologyReason = topology.Reason
                    };
                }
            }

            var killCountAdvanced = proof.Proximity.PlayerKillCount > _targetKillCountAtAcquisition;
            var targetDeadOrRemoved = retained is null || !IsLiveShootableCountKill(retained);
            if (killCountAdvanced && targetDeadOrRemoved)
            {
                var confirmedIdentity = _targetActorIdentity;
                var confirmedSectorIndex = retained?.SectorIndex ?? _targetActorSectorIndex;
                var confirmedType = retained?.Type ?? -1;
                var confirmedHealth = retained?.Health ?? 0;
                var confirmedFlags = retained?.Flags ?? 0;
                var confirmedTopologyAccepted = _targetTopologyAccepted;
                var confirmedTopologyReason = retained is null
                    ? "native-actor-topology-target-missing"
                    : EvaluateActorTopology(
                        proof.Proximity.PlayerSectorIndex,
                        retained.SectorIndex).Reason;
                var confirmedKillCountAtAcquisition = _targetKillCountAtAcquisition;
                ClearRetainedTarget();
                return new NativeActorCombatEvaluation(
                    InputAccepted: true,
                    Fresh: true,
                    VisualEvidenceTrusted: false,
                    ActorMatched: retained is not null,
                    TargetRetained: false,
                    Trusted: false,
                    KillConfirmed: true,
                    TargetIdentity: confirmedIdentity,
                    TargetType: confirmedType,
                    TargetHealth: confirmedHealth,
                    TargetFlags: confirmedFlags,
                    TargetLineOfSight: retained?.LineOfSight ?? false,
                    TargetBearingDegrees: 0,
                    TargetBearingErrorDegrees: 0,
                    EngagementFrames: engagementFrames,
                    KillCountAtAcquisition: confirmedKillCountAtAcquisition,
                    CurrentKillCount: proof.Proximity.PlayerKillCount,
                    Reason: "native-target-death-and-killcount-confirmed")
                {
                    TargetSectorIndex = confirmedSectorIndex,
                    TopologyAccepted = confirmedTopologyAccepted,
                    TopologyReason = confirmedTopologyReason
                };
            }

            if (retained is null)
            {
                return Pending("native-target-missing-killcount-pending");
            }

            if (!IsLiveShootableCountKill(retained))
            {
                var pendingDead = ProjectActor(retained, false, acquired: false);
                return pendingDead with
                {
                    Trusted = false,
                    Reason = "native-target-death-killcount-pending"
                };
            }

            return ProjectActor(retained, false, acquired: false);
        }

        var visualEvidenceTrusted = LegacyTrustedCombat(combat) || _structuredCombat.Trusted;
        if (!visualEvidenceTrusted)
        {
            return new NativeActorCombatEvaluation(
                true, true, false, false, false, false, false,
                0, -1, 0, 0, false, 0, 0, 0, 0,
                proof.Proximity.PlayerKillCount,
                "native-actor-visual-acquisition-evidence-untrusted");
        }

        if (!proof.RawFrame.Available
            || !proof.RawFrame.Fresh
            || proof.RawFrame.NativeGameticObservedAtEvaluation != snapshot.Gametic)
        {
            return new NativeActorCombatEvaluation(
                true, true, true, false, false, false, false,
                0, -1, 0, 0, false, 0, 0, 0, 0,
                proof.Proximity.PlayerKillCount,
                "native-actor-visual-frame-gametic-mismatch");
        }

        var legacyVisualEvidenceTrusted = LegacyTrustedCombat(combat);
        var visualBearingCueDegrees = legacyVisualEvidenceTrusted
            ? combat.VisualEnemyCentered
                ? 0d
                : Math.Clamp(
                    double.IsFinite(combat.VisualEnemyYaw) ? combat.VisualEnemyYaw : 0d,
                    -_policy.NativeActorVisualFieldOfViewHalfDegrees,
                    _policy.NativeActorVisualFieldOfViewHalfDegrees)
            : _structuredCombat.Centered
                ? 0d
                : Math.Clamp(
                    _structuredCombat.LateralBias * 18d,
                    -_policy.NativeActorVisualFieldOfViewHalfDegrees,
                    _policy.NativeActorVisualFieldOfViewHalfDegrees);
        var visualMatches = actors
            .Where(actor => IsLiveShootableCountKill(actor) && actor.LineOfSight)
            .Select(actor => new
            {
                Actor = actor,
                Metrics = ActorMetrics(proof.Proximity, actor),
                VisualCueErrorDegrees = Math.Abs(NormalizeSignedDegrees(
                    ActorMetrics(proof.Proximity, actor).BearingErrorDegrees
                        - visualBearingCueDegrees))
            })
            .Where(candidate =>
                Math.Abs(candidate.Metrics.BearingErrorDegrees)
                    <= _policy.NativeActorVisualFieldOfViewHalfDegrees
                && candidate.VisualCueErrorDegrees
                    <= _policy.NativeActorVisualFieldOfViewHalfDegrees
                && (Math.Abs(visualBearingCueDegrees) <= _policy.AlignmentToleranceDegrees
                    || Math.Sign(candidate.Metrics.BearingErrorDegrees)
                        == Math.Sign(visualBearingCueDegrees)))
            .OrderBy(candidate => candidate.VisualCueErrorDegrees)
            .ThenBy(candidate => candidate.Metrics.TargetDistance)
            .ThenBy(candidate => candidate.Actor.Identity)
            .ToArray();
        if (visualMatches.Length == 0)
        {
            return new NativeActorCombatEvaluation(
                true, true, true, false, false, false, false,
                0, -1, 0, 0, false, 0, 0, 0, 0,
                proof.Proximity.PlayerKillCount,
                "native-live-los-target-not-matched");
        }

        var matched = visualMatches.FirstOrDefault(candidate => EvaluateActorTopology(
            proof.Proximity.PlayerSectorIndex,
            candidate.Actor.SectorIndex).Accepted);
        if (matched is null)
        {
            var rejected = visualMatches[0];
            var topology = EvaluateActorTopology(
                proof.Proximity.PlayerSectorIndex,
                rejected.Actor.SectorIndex);
            return new NativeActorCombatEvaluation(
                InputAccepted: true,
                Fresh: true,
                VisualEvidenceTrusted: true,
                ActorMatched: true,
                TargetRetained: false,
                Trusted: false,
                KillConfirmed: false,
                TargetIdentity: rejected.Actor.Identity,
                TargetType: rejected.Actor.Type,
                TargetHealth: rejected.Actor.Health,
                TargetFlags: rejected.Actor.Flags,
                TargetLineOfSight: rejected.Actor.LineOfSight,
                TargetBearingDegrees: rejected.Metrics.TargetBearingDegrees,
                TargetBearingErrorDegrees: rejected.Metrics.BearingErrorDegrees,
                EngagementFrames: 0,
                KillCountAtAcquisition: 0,
                CurrentKillCount: proof.Proximity.PlayerKillCount,
                Reason: "native-live-los-target-topology-rejected")
            {
                TargetSectorIndex = rejected.Actor.SectorIndex,
                TopologyAccepted = false,
                TopologyReason = topology.Reason
            };
        }

        _targetActorIdentity = matched.Actor.Identity;
        _targetAcquiredAtControlTick = proof.ControlTick;
        _targetKillCountAtAcquisition = proof.Proximity.PlayerKillCount;
        return ProjectActor(matched.Actor, true, acquired: true);
    }

    private static bool IsLiveShootableCountKill(PostComputerRoomNativeActorFact actor)
        => actor.Health > 0
            && (actor.Flags & MfCountKill) != 0
            && (actor.Flags & MfShootable) != 0;

    private static ActorTopologyEvaluation EvaluateActorTopology(
        int playerSectorIndex,
        int actorSectorIndex)
    {
        if (actorSectorIndex < 0)
        {
            return new ActorTopologyEvaluation(false, "native-actor-topology-not-evaluated");
        }

        var accepted = playerSectorIndex switch
        {
            7 => actorSectorIndex is 7 or 54,
            54 => actorSectorIndex is 54 or 53,
            53 => actorSectorIndex is 53 or 71,
            71 => actorSectorIndex is 71 or 60,
            60 => actorSectorIndex == 60,
            52 => actorSectorIndex is 52 or 51,
            51 => actorSectorIndex is 51 or 8,
            8 => actorSectorIndex is 8 or 7,
            _ => false
        };
        var supportedPlayerSector = playerSectorIndex is 7 or 54 or 53 or 71 or 60 or 52 or 51 or 8;
        return !supportedPlayerSector
            ? new ActorTopologyEvaluation(false, "native-actor-topology-not-evaluated")
            : accepted
                ? new ActorTopologyEvaluation(true, "native-actor-topology-local")
                : new ActorTopologyEvaluation(false, "native-actor-topology-remote");
    }

    private NativeWeaponCycleEvaluation EvaluateNativeWeaponCycle(
        PostComputerRoomActivationProof proof,
        PostComputerRoomNativeWeaponSnapshot snapshot)
    {
        if (snapshot is null || !snapshot.Available)
        {
            return NativeWeaponCycleEvaluation.Unavailable(
                "native-weapon-snapshot-unavailable");
        }

        if (snapshot.Gametic < 0
            || snapshot.Gametic != proof.Proximity.NativeGametic)
        {
            return NativeWeaponCycleEvaluation.Unavailable(
                "native-weapon-snapshot-gametic-mismatch");
        }

        var validPendingWeapon = snapshot.PendingWeapon == NoPendingWeapon
            || (snapshot.PendingWeapon >= 0
                && snapshot.PendingWeapon < NumberOfWeapons);
        if (snapshot.ReadyWeapon < 0
            || snapshot.ReadyWeapon >= NumberOfWeapons
            || !validPendingWeapon
            || snapshot.StateCount <= 0
            || snapshot.WeaponState < 0
            || snapshot.WeaponState >= snapshot.StateCount
            || snapshot.WeaponReadyState < 0
            || snapshot.WeaponReadyState >= snapshot.StateCount
            || snapshot.Refire < 0)
        {
            return NativeWeaponCycleEvaluation.Unavailable(
                "native-weapon-snapshot-shape-invalid");
        }

        if (_lastNativeWeaponSnapshotGametic >= 0
            && snapshot.Gametic < _lastNativeWeaponSnapshotGametic)
        {
            return NativeWeaponCycleEvaluation.Unavailable(
                "native-weapon-snapshot-gametic-rewound");
        }

        if (snapshot.Gametic == _lastNativeWeaponSnapshotGametic)
        {
            return NativeWeaponCycleEvaluation.AcceptedButNotFresh(
                snapshot,
                "native-weapon-snapshot-duplicate-gametic");
        }

        _lastNativeWeaponSnapshotGametic = snapshot.Gametic;
        var fireOpportunity = snapshot.PendingWeapon == NoPendingWeapon
            && snapshot.WeaponState == snapshot.WeaponReadyState
            && snapshot.Refire == 0;
        var reason = snapshot.PendingWeapon != NoPendingWeapon
            ? "native-weapon-change-pending"
            : snapshot.WeaponState != snapshot.WeaponReadyState
                ? "native-weapon-cycle-busy"
                : snapshot.Refire != 0
                    ? "native-weapon-refire-pending"
                    : "native-weapon-fire-opportunity";
        return new NativeWeaponCycleEvaluation(
            InputAccepted: true,
            Fresh: true,
            FireOpportunity: fireOpportunity,
            StateCount: snapshot.StateCount,
            ReadyWeapon: snapshot.ReadyWeapon,
            PendingWeapon: snapshot.PendingWeapon,
            WeaponState: snapshot.WeaponState,
            WeaponReadyState: snapshot.WeaponReadyState,
            Refire: snapshot.Refire,
            Reason: reason);
    }

    private StructuredCombatEvaluation EvaluateStructuredCombat(
        PostComputerRoomActivationProof proof,
        PostComputerRoomCombatObservation combat)
    {
        var rawFrame = proof.RawFrame;
        if (!rawFrame.Available)
        {
            return StructuredCombatEvaluation.Unavailable(
                "structured-combat-raw-frame-unavailable");
        }

        if (combat.RawFrameSequence < 0 || combat.RawNativeGametic < 0)
        {
            return StructuredCombatEvaluation.Unavailable(
                "structured-combat-frame-identity-unavailable");
        }

        if (combat.RawFrameSequence != rawFrame.FrameSequence
            || combat.RawNativeGametic != rawFrame.NativeGameticObservedAtEvaluation
            || combat.RawNativeGametic != proof.Proximity.NativeGametic)
        {
            return StructuredCombatEvaluation.Unavailable(
                "structured-combat-frame-identity-mismatch");
        }

        var sample = combat.EnemyRegion9Sample;
        if (sample is null || sample.Count != 9)
        {
            return StructuredCombatEvaluation.Unavailable(
                "structured-combat-region9-shape-invalid");
        }

        var values = new double[9];
        for (var index = 0; index < values.Length; index++)
        {
            var value = sample[index];
            if (!double.IsFinite(value) || value < 0d || value > 1d)
            {
                return StructuredCombatEvaluation.Unavailable(
                    "structured-combat-region9-value-invalid");
            }

            values[index] = value;
        }

        var contentSignature = StructuredCombatContentSignature(values);
        var sameIdentity = combat.RawFrameSequence == _lastStructuredRawFrameSequence
            && combat.RawNativeGametic == _lastStructuredRawNativeGametic;
        if (!rawFrame.Fresh)
        {
            if (sameIdentity
                && !string.Equals(
                    contentSignature,
                    _lastStructuredContentSignature,
                    StringComparison.Ordinal))
            {
                _structuredCombatWindow.Clear();
                return StructuredCombatEvaluation.AcceptedButNotFresh(
                    "structured-combat-frame-identity-redefined");
            }

            return StructuredCombatEvaluation.Unavailable(
                "structured-combat-raw-frame-not-fresh");
        }

        PruneStructuredCombatWindow(combat.RawFrameSequence);
        var frameSequenceRewound = _lastStructuredRawFrameSequence >= 0
            && combat.RawFrameSequence < _lastStructuredRawFrameSequence;
        var nativeGameticRewound = _lastStructuredRawNativeGametic >= 0
            && combat.RawNativeGametic < _lastStructuredRawNativeGametic;
        if (frameSequenceRewound || nativeGameticRewound)
        {
            _structuredCombatWindow.Clear();
            return StructuredCombatEvaluation.AcceptedButNotFresh(
                "structured-combat-frame-identity-rewound");
        }

        var fresh = combat.RawFrameSequence > _lastStructuredRawFrameSequence
            && combat.RawNativeGametic > _lastStructuredRawNativeGametic;
        if (!fresh)
        {
            if (sameIdentity
                && !string.Equals(
                    contentSignature,
                    _lastStructuredContentSignature,
                    StringComparison.Ordinal))
            {
                _structuredCombatWindow.Clear();
                return StructuredCombatEvaluation.AcceptedButNotFresh(
                    "structured-combat-frame-identity-redefined");
            }

            return StructuredCombatEvaluation.AcceptedButNotFresh(
                "structured-combat-duplicate-frame");
        }

        _lastStructuredRawFrameSequence = combat.RawFrameSequence;
        _lastStructuredRawNativeGametic = combat.RawNativeGametic;
        _lastStructuredContentSignature = contentSignature;

        var peak = values.Max();
        var total = values.Sum();
        var supportCells = values.Count(value =>
            value >= _policy.StructuredEnemySupportCellMinimum);
        var candidate = peak >= _policy.StructuredEnemyMinimumPeak
            && total >= _policy.StructuredEnemyMinimumTotal
            && supportCells >= Math.Max(1, _policy.StructuredEnemyMinimumSupportCells);
        var left = values[0] + values[3] + values[6];
        var center = values[1] + values[4] + values[7];
        var right = values[2] + values[5] + values[8];
        var lateralBias = total > 0d ? (right - left) / total : 0d;
        var centered = candidate
            && center >= Math.Max(left, right) * 0.9d;
        var locationDescriptor = StructuredCombatLocationDescriptor(values, total);
        if (candidate
            && !_structuredCombatWindow.Any(entry =>
                string.Equals(
                    entry.LocationDescriptor,
                    locationDescriptor,
                    StringComparison.Ordinal)))
        {
            _structuredCombatWindow.Add(new StructuredCombatWindowEntry(
                proof.ControlTick,
                combat.RawFrameSequence,
                combat.RawNativeGametic,
                locationDescriptor));
        }

        PruneStructuredCombatWindow(combat.RawFrameSequence);
        var distinctFrames = _structuredCombatWindow.Count;
        var trusted = candidate
            && distinctFrames >= Math.Max(2, _policy.StructuredEnemyRequiredDistinctFrames);
        return new StructuredCombatEvaluation(
            InputAccepted: true,
            Fresh: true,
            Candidate: candidate,
            Trusted: trusted,
            DistinctFrames: distinctFrames,
            Peak: peak,
            Total: total,
            SupportCells: supportCells,
            CenterCell: values[4],
            LateralBias: lateralBias,
            Centered: centered,
            Reason: trusted
                ? "structured-combat-two-distinct-frames"
                : candidate
                    ? "structured-combat-distinct-frame-window-pending"
                    : "structured-combat-spatial-candidate-below-threshold");
    }

    private void PruneStructuredCombatWindow(long rawFrameSequence)
    {
        var window = Math.Max(1, _policy.StructuredEnemyWindowFrames);
        _structuredCombatWindow.RemoveAll(entry =>
            rawFrameSequence - entry.RawFrameSequence >= window);
    }

    private static string StructuredCombatContentSignature(IReadOnlyList<double> values)
        => string.Join(
            ',',
            values.Select(value => BitConverter.DoubleToInt64Bits(value).ToString("X16")));

    private static string StructuredCombatLocationDescriptor(
        IReadOnlyList<double> values,
        double total)
    {
        if (total <= 0d)
        {
            return "none";
        }

        double weightedRow = 0d;
        double weightedColumn = 0d;
        var dominantCell = 0;
        for (var index = 0; index < values.Count; index++)
        {
            var value = values[index];
            weightedRow += (index / 3) * value;
            weightedColumn += (index % 3) * value;
            if (value > values[dominantCell])
            {
                dominantCell = index;
            }
        }

        const double quarterCellBuckets = 4d;
        var rowQuarter = (int)Math.Floor((weightedRow / total) * quarterCellBuckets);
        var columnQuarter = (int)Math.Floor((weightedColumn / total) * quarterCellBuckets);
        return $"{dominantCell}:{rowQuarter}:{columnQuarter}";
    }

    private static PostComputerRoomRouteWaypoint RoomCertificationRecoveryTarget()
        => new(
            -1,
            "enemy-alcove-room-certification-recovery",
            1760d,
            -2512d,
            Array.AsReadOnly(new[] { 7 }));

    private PostComputerRoomRouteWaypoint RecoveryTarget(FirstDoorProximityObservation proximity)
        => proximity.PlayerSectorIndex switch
        {
            52 => new(-1, "enemy-alcove-52-west-exit", 2192d, -2528d, Array.AsReadOnly(new[] { 52, 51 })),
            51 => new(-1, "enemy-alcove-51-west-exit", 2160d, -2528d, Array.AsReadOnly(new[] { 51, 8 })),
            8 => new(-1, "enemy-alcove-8-west-exit", 2112d, -2528d, Array.AsReadOnly(new[] { 8, 7 })),
            7 when proximity.PlayerX > 2128d && proximity.PlayerY > -2592d
                => new(-1, "enemy-alcove-mouth-west-clearance", 2112d, -2528d, Array.AsReadOnly(new[] { 7 })),
            _ => new(-1, "enemy-alcove-south-clearance", 2112d, -2640d, Array.AsReadOnly(new[] { 7 }))
        };

    private ActionCommand TurnAction(double bearingErrorDegrees)
    {
        var magnitude = Math.Clamp(Math.Abs(_policy.DefaultTurnYaw), 1, Math.Abs(_policy.MaximumTurnYaw));
        return new(false, false, false, false, bearingErrorDegrees < 0d ? -magnitude : magnitude, false, false);
    }

    private ActionCommand InterceptAction(PostComputerRoomCombatObservation combat)
    {
        if (combat.VisualEnemyCentered)
        {
            return NeutralAction();
        }

        var yaw = Math.Clamp(
            (int)Math.Round(combat.VisualEnemyYaw),
            -Math.Abs(_policy.MaximumTurnYaw),
            Math.Abs(_policy.MaximumTurnYaw));
        if (yaw == 0)
        {
            yaw = combat.VisualEnemyYaw < 0d
                ? -Math.Abs(_policy.DefaultTurnYaw)
                : Math.Abs(_policy.DefaultTurnYaw);
        }

        return new(false, false, false, false, yaw, false, false);
    }

    private ActionCommand StructuredInterceptAction(StructuredCombatEvaluation combat)
    {
        if (combat.Centered)
        {
            return ForwardAction();
        }

        var signed = combat.LateralBias < 0d ? -1 : 1;
        var scaled = (int)Math.Round(Math.Abs(combat.LateralBias) * 18d);
        var magnitude = Math.Clamp(
            Math.Max(Math.Abs(_policy.DefaultTurnYaw), scaled),
            1,
            Math.Abs(_policy.MaximumTurnYaw));
        return new(false, false, false, false, signed * magnitude, false, false);
    }

    private static ActionCommand ForwardAction()
        => new(true, false, false, false, 0, false, false);

    private static ActionCommand AttackAction()
        => new(false, false, false, false, 0, false, true);

    private static ActionCommand NeutralAction()
        => new(false, false, false, false, 0, false, false);

    private static NavigationMetrics Metrics(
        FirstDoorProximityObservation proximity,
        double targetX,
        double targetY)
    {
        var dx = targetX - proximity.PlayerX;
        var dy = targetY - proximity.PlayerY;
        var distance = Math.Sqrt((dx * dx) + (dy * dy));
        var bearing = NormalizeDegrees(Math.Atan2(dy, dx) * 180d / Math.PI);
        var error = NormalizeSignedDegrees(proximity.HeadingDegrees - bearing);
        return new NavigationMetrics(distance, bearing, error);
    }

    private static NavigationMetrics ActorMetrics(
        FirstDoorProximityObservation proximity,
        PostComputerRoomNativeActorFact actor)
        => Metrics(
            proximity,
            actor.XFixed / 65536d,
            actor.YFixed / 65536d);

    private static double Distance(double x1, double y1, double x2, double y2)
    {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.Sqrt((dx * dx) + (dy * dy));
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

    private static int Frames(long current, long started)
        => current <= started ? 0 : (int)Math.Min(int.MaxValue, current - started);

    private static int SaturatingIncrement(int value)
        => value == int.MaxValue ? int.MaxValue : value + 1;

    private sealed record StructuredCombatWindowEntry(
        long ControlTick,
        long RawFrameSequence,
        long RawNativeGametic,
        string LocationDescriptor);

    private sealed record StructuredCombatEvaluation(
        bool InputAccepted,
        bool Fresh,
        bool Candidate,
        bool Trusted,
        int DistinctFrames,
        double Peak,
        double Total,
        int SupportCells,
        double CenterCell,
        double LateralBias,
        bool Centered,
        string Reason)
    {
        internal static StructuredCombatEvaluation Unavailable(string reason)
            => new(false, false, false, false, 0, 0, 0, 0, 0, 0, false, reason);

        internal static StructuredCombatEvaluation AcceptedButNotFresh(string reason)
            => new(true, false, false, false, 0, 0, 0, 0, 0, 0, false, reason);
    }

    private sealed record NativeActorCombatEvaluation(
        bool InputAccepted,
        bool Fresh,
        bool VisualEvidenceTrusted,
        bool ActorMatched,
        bool TargetRetained,
        bool Trusted,
        bool KillConfirmed,
        long TargetIdentity,
        int TargetType,
        int TargetHealth,
        long TargetFlags,
        bool TargetLineOfSight,
        double TargetBearingDegrees,
        double TargetBearingErrorDegrees,
        int EngagementFrames,
        int KillCountAtAcquisition,
        int CurrentKillCount,
        string Reason)
    {
        internal int TargetSectorIndex { get; init; } = -1;

        internal bool TopologyAccepted { get; init; }

        internal string TopologyReason { get; init; } = "native-actor-topology-not-evaluated";

        internal static NativeActorCombatEvaluation Unavailable(string reason)
            => new(
                false, false, false, false, false, false, false,
                0, -1, 0, 0, false, 0, 0, 0, 0, -1, reason);
    }

    private sealed record NativeWeaponCycleEvaluation(
        bool InputAccepted,
        bool Fresh,
        bool FireOpportunity,
        int StateCount,
        int ReadyWeapon,
        int PendingWeapon,
        int WeaponState,
        int WeaponReadyState,
        int Refire,
        string Reason)
    {
        internal static NativeWeaponCycleEvaluation Unavailable(string reason)
            => new(false, false, false, -1, -1, -1, -1, -1, -1, reason);

        internal static NativeWeaponCycleEvaluation AcceptedButNotFresh(
            PostComputerRoomNativeWeaponSnapshot snapshot,
            string reason)
            => new(
                true,
                false,
                false,
                snapshot.StateCount,
                snapshot.ReadyWeapon,
                snapshot.PendingWeapon,
                snapshot.WeaponState,
                snapshot.WeaponReadyState,
                snapshot.Refire,
                reason);
    }

    private sealed record NavigationMetrics(
        double TargetDistance,
        double TargetBearingDegrees,
        double BearingErrorDegrees);

    private sealed record ActorTopologyEvaluation(bool Accepted, string Reason);
}
