namespace AIKernel.Doom.Provider.Autoplay;

internal enum E1M1ContinuationState
{
    WaitingForPostCompletion,
    NavigateZigzag,
    ApproachSecondDoor,
    PreUseStopSecondDoor,
    StationarySecondDoorUse,
    AwaitSecondDoorAck,
    TraverseSecondDoor,
    NavigateGatekeeper,
    InterceptRouteThreat,
    EngageGatekeeper,
    NavigateExitDoor,
    PreUseStopExitDoor,
    StationaryExitDoorUse,
    AwaitExitDoorAck,
    EnterExitRoom,
    ApproachExitSwitch,
    PreUseStopExitSwitch,
    StationaryExitUse,
    AwaitExitAck,
    AwaitLevelCompletion,
    AwaitRestart,
    Complete,
    FailedSafeStop
}

internal enum E1M1ContinuationOwnershipDisposition
{
    NotAcquired,
    Exclusive,
    Completed,
    FailedSafeStop
}

internal enum E1M1ContinuationUseKind
{
    None,
    SecondDoor,
    ExitDoor,
    ExitSwitch
}

internal sealed record E1M1ContinuationWaypoint(
    int Index,
    string Id,
    double X,
    double Y,
    IReadOnlyList<int> AllowedSectors);

internal sealed record E1M1ContinuationPolicy
{
    internal const string GeometryVersion = "e1m1-continuation-canonical-route-v2";

    public string PolicyVersion { get; init; } = "e1m1-continuation-policy-v2.1";

    public double WaypointCompletionRadius { get; init; } = 24d;

    public double AlignmentToleranceDegrees { get; init; } = 5d;

    public int DefaultTurnYaw { get; init; } = 6;

    public int MaximumTurnYaw { get; init; } = 12;

    // Leave room to settle and acknowledge the final switch after a live approach.
    internal const int CanonicalRouteTimeoutFrames = 1020;
    public int RouteTimeoutFrames { get; init; } = CanonicalRouteTimeoutFrames;

    public int LegTimeoutFrames { get; init; } = 180;

    public int CombatTimeoutFrames { get; init; } = 180;

    public int MaximumPoseMissingFrames { get; init; } = 30;

    public double MaximumStationaryMomentum { get; init; } = 0.25d;

    public double UseMaximumDistance { get; init; } = 56d;

    public IReadOnlyList<E1M1ContinuationWaypoint> Waypoints { get; init; }
        = CanonicalWaypoints;

    internal static IReadOnlyList<E1M1ContinuationWaypoint> CanonicalWaypoints { get; }
        = Array.AsReadOnly(new[]
        {
            Waypoint(0, "zigzag-entry-east", 3056d, -3072d, 60),
            Waypoint(1, "zigzag-west-dogleg", 2900d, -3216d, 60),
            Waypoint(2, "zigzag-east-dogleg", 3196d, -3340d, 60),
            Waypoint(3, "zigzag-south-return", 3024d, -3544d, 60),
            Waypoint(4, "zigzag-safe-floor-portal", 3008d, -3592d, 60, 56),
            Waypoint(5, "second-door-north-lane", 3008d, -3984d, 56),
            Waypoint(6, "second-door-use-approach", 3008d, -3984d, 56),
            Waypoint(7, "second-door-certified-traverse", 3008d, -4064d, 73),
            Waypoint(8, "sector-72-north-approach", 3008d, -4200d, 73, 72),
            Waypoint(9, "sector-74-gatekeeper-approach", 3008d, -4400d, 74),
            Waypoint(10, "sector-74-south-clearance", 3008d, -4528d, 74, 78),
            Waypoint(11, "sector-78-exit-lane", 3008d, -4560d, 78),
            Waypoint(12, "exit-door-use-approach", 3008d, -4616d, 80),
            Waypoint(13, "exit-door-certified-traverse", 3008d, -4660d, 81, 84),
            Waypoint(14, "exit-room-entry", 3008d, -4704d, 84, 82),
            Waypoint(15, "exit-switch-use-approach", 2944d, -4768d, 82)
        });

    private static E1M1ContinuationWaypoint Waypoint(
        int index,
        string id,
        double x,
        double y,
        params int[] allowedSectors)
        => new(index, id, x, y, Array.AsReadOnly(allowedSectors));
}

internal sealed record E1M1ContinuationPoseObservation
{
    public bool Available { get; init; }

    public bool Fresh { get; init; }

    public string Reason { get; init; } = "native-player-pose-unavailable";

    public long NativeGametic { get; init; } = -1;

    public double PlayerX { get; init; }

    public double PlayerY { get; init; }

    public double HeadingDegrees { get; init; }

    public double MomentumX { get; init; }

    public double MomentumY { get; init; }

    public int PlayerSectorIndex { get; init; } = -1;

    public bool Stationary { get; init; }
}

internal sealed record E1M1ContinuationNavigationSnapshot
{
    public int SnapshotVersion { get; init; } = 1;

    public string GeometryVersion { get; init; } = E1M1ContinuationPolicy.GeometryVersion;

    public string PolicyVersion { get; init; } = string.Empty;

    public bool Active { get; init; }

    public int LegIndex { get; init; } = -1;

    public string LegId { get; init; } = string.Empty;

    public double TargetX { get; init; }

    public double TargetY { get; init; }

    public IReadOnlyList<int> AllowedSectors { get; init; } = Array.Empty<int>();

    public E1M1ContinuationPoseObservation Pose { get; init; } = new();

    public double TargetDistance { get; init; }

    public double TargetBearingDegrees { get; init; }

    public double BearingErrorDegrees { get; init; }

    public int RouteFrames { get; init; }

    public int RouteTimeoutFrames { get; init; }

    public int RouteRemainingFrames { get; init; }

    public int LegFrames { get; init; }

    public int LegTimeoutFrames { get; init; }

    public int LegRemainingFrames { get; init; }

    public int CombatFrames { get; init; }

    public int CombatTimeoutFrames { get; init; }

    public int CombatRemainingFrames { get; init; }

    public string CombatOwnerKind { get; init; } = "none";

    public long CombatOwnerIdentity { get; init; }

    public int PoseMissingFrames { get; init; }

    public string FailureCode { get; init; } = string.Empty;
}

internal sealed record E1M1ContinuationDoorTrace
{
    public int TraceVersion { get; init; } = 1;

    public E1M1ContinuationUseKind PendingUseKind { get; init; }

    public long PendingUseAttemptId { get; init; }

    public long PendingUseDecisionControlTick { get; init; } = -1;

    public string AppliedActionAckReason { get; init; } = "not-expected";

    public bool SecondDoorAckAccepted { get; init; }

    public bool SecondDoorSlabObserved { get; init; }

    public bool SecondDoorTraversed { get; init; }

    public bool ExitDoorAckAccepted { get; init; }

    public bool ExitDoorSlabObserved { get; init; }

    public bool ExitDoorTraversed { get; init; }

    public bool ExitSwitchAckAccepted { get; init; }

    public bool LevelTransitionConfirmed { get; init; }
}

internal sealed record E1M1ContinuationGatekeeperTrace
{
    public int TraceVersion { get; init; } = 1;

    public int ExpectedRuntimeType { get; init; } = E1M1ContinuationNavigator.GatekeeperRuntimeType;

    public int ExpectedSectorIndex { get; init; } = E1M1ContinuationNavigator.GatekeeperSectorIndex;

    public double ExpectedSpawnX { get; init; } = E1M1ContinuationNavigator.GatekeeperSpawnX;

    public double ExpectedSpawnY { get; init; } = E1M1ContinuationNavigator.GatekeeperSpawnY;

    public bool SnapshotAccepted { get; init; }

    public bool SnapshotFresh { get; init; }

    public bool AcquiredAlive { get; init; }

    public long Identity { get; init; }

    public int Health { get; init; }

    public int CurrentSectorIndex { get; init; } = -1;

    public bool TopologyAccepted { get; init; }

    public string TopologyReason { get; init; } = "gatekeeper-topology-not-evaluated";

    public bool LineOfSight { get; init; }

    public double BearingErrorDegrees { get; init; }

    public int KillCountAtAcquisition { get; init; } = -1;

    public int CurrentKillCount { get; init; } = -1;

    public bool KillCountAdvanced { get; init; }

    public bool Killed { get; init; }

    public string Reason { get; init; } = "gatekeeper-not-evaluated";
}

internal sealed record E1M1ContinuationThreatTrace
{
    public int TraceVersion { get; init; } = 1;

    public bool SnapshotAccepted { get; init; }

    public bool SnapshotFresh { get; init; }

    public bool ThreatMatched { get; init; }

    public long Identity { get; init; }

    public int RuntimeType { get; init; } = -1;

    public int SectorIndex { get; init; } = -1;

    public int Health { get; init; }

    public bool LineOfSight { get; init; }

    public double BearingErrorDegrees { get; init; }

    public bool StationaryFireAuthorized { get; init; }

    public string Reason { get; init; } = "route-threat-not-evaluated";
}

internal sealed record E1M1ContinuationWeaponTrace
{
    public int TraceVersion { get; init; } = 1;

    public bool SnapshotAccepted { get; init; }

    public bool SnapshotFresh { get; init; }

    public int StateCount { get; init; } = -1;

    public int ReadyWeapon { get; init; } = -1;

    public int PendingWeapon { get; init; } = -1;

    public int WeaponState { get; init; } = -1;

    public int WeaponReadyState { get; init; } = -1;

    public int Refire { get; init; } = -1;

    public bool FireOpportunity { get; init; }

    public bool ContinuationArmed { get; init; }

    public string ContinuationOwnerKind { get; init; } = "none";

    public long ContinuationTargetIdentity { get; init; }

    public int ContinuationReadyWeapon { get; init; } = -1;

    public long ContinuationAuthorizedAtControlTick { get; init; } = -1;

    public bool AttackContinuation { get; init; }

    public string Reason { get; init; } = "native-weapon-not-evaluated";
}

internal sealed record E1M1ContinuationVitalityTrace
{
    public int TraceVersion { get; init; } = 1;

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long EvaluatedAtControlTick { get; init; }

    public bool Available { get; init; }

    public bool Fresh { get; init; }

    public long NativeGametic { get; init; } = -1;

    public int PlayerHealth { get; init; } = -1;

    public int PlayerState { get; init; } = -1;

    public int PlayerKillCount { get; init; } = -1;

    public string Provenance { get; init; } = "native-e1m1-continuation-vitality-unavailable";

    public bool DeathCandidate { get; init; }

    public int ConsecutiveDeathGametics { get; init; }

    public int RequiredDeathGametics { get; init; } = 3;

    public bool NativeDeathConfirmed { get; init; }

    public bool RestartRequested { get; init; }

    public string RestartRequestId { get; init; } = string.Empty;

    public string RestartReason { get; init; } = "none";
}

internal sealed record E1M1ContinuationReplayEntry
{
    public long ControlTick { get; init; }

    public long NativeGametic { get; init; } = -1;

    public E1M1ContinuationState State { get; init; }

    public string ReasonCode { get; init; } = string.Empty;

    public int PlayerSectorIndex { get; init; } = -1;

    public int LegIndex { get; init; } = -1;

    public string LegId { get; init; } = string.Empty;

    public int RouteFrames { get; init; }

    public int LegFrames { get; init; }

    public int CombatFrames { get; init; }

    public long GatekeeperIdentity { get; init; }

    public bool GatekeeperKilled { get; init; }

    public int GatekeeperKillCountAtAcquisition { get; init; } = -1;

    public int GatekeeperConfirmedKillCount { get; init; } = -1;

    public bool SecondDoorSlabObserved { get; init; }

    public bool ExitDoorSlabObserved { get; init; }

    public E1M1ContinuationUseKind PendingUseKind { get; init; }

    public long UseAttemptId { get; init; }

    public ActionCommand Action { get; init; } = new(false, false, false, false, 0, false, false);

    public bool RunRequested { get; init; }
}

internal sealed record E1M1ContinuationFailureTrace
{
    public const int ReplayCapacity = 32;

    public bool Failed { get; init; }

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long FailureAtControlTick { get; init; } = -1;

    public string FailureCode { get; init; } = string.Empty;

    public E1M1ContinuationReplayEntry? FailureSnapshot { get; init; }

    public IReadOnlyList<E1M1ContinuationReplayEntry> Replay { get; init; }
        = Array.Empty<E1M1ContinuationReplayEntry>();
}

internal sealed record E1M1ContinuationCompletionTrace
{
    public const int ReplayCapacity = 32;

    public bool Completed { get; init; }

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long CompletionAtControlTick { get; init; } = -1;

    public string CompletionCode { get; init; } = string.Empty;

    public long NativeLevelLoadSequence { get; init; } = -1;

    public long NativeGametic { get; init; } = -1;

    public int PreviousGameState { get; init; } = -1;

    public int CompletedGameState { get; init; } = -1;

    public long GatekeeperIdentity { get; init; }

    public bool GatekeeperKilled { get; init; }

    public int GatekeeperKillCountAtAcquisition { get; init; } = -1;

    public int GatekeeperConfirmedKillCount { get; init; } = -1;

    public bool SecondDoorTraversed { get; init; }

    public bool ExitDoorTraversed { get; init; }

    public bool ExitSwitchUsed { get; init; }

    public E1M1ContinuationReplayEntry? CompletionSnapshot { get; init; }

    public IReadOnlyList<E1M1ContinuationReplayEntry> Replay { get; init; }
        = Array.Empty<E1M1ContinuationReplayEntry>();
}

internal sealed record E1M1ContinuationSemanticProjection
{
    public string Telos { get; init; } = "ZigzagRoute";

    public string Objective { get; init; } = "navigate-zigzag";

    public int DoorOpenedCount { get; init; }

    public bool SecondDoorTraversed { get; init; }

    public bool GatekeeperKilled { get; init; }

    public bool ExitDoorTraversed { get; init; }

    public bool ExitSwitchUsed { get; init; }

    public bool LevelCompleted { get; init; }
}

internal sealed record E1M1ContinuationDecision
{
    public string ImplementationVersion { get; init; } = "e1m1-continuation-v2";

    public string PolicyVersion { get; init; } = string.Empty;

    public int ContractVersion { get; init; } = 1;

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long ControlTick { get; init; }

    public long ExpectedPostComputerRoomControlTick { get; init; }

    public long NativeGametic { get; init; } = -1;

    public E1M1ContinuationState State { get; init; }

    public E1M1ContinuationOwnershipDisposition OwnershipDisposition { get; init; }

    public string OwnerId { get; init; } = "e1m1-continuation.waiting";

    public string ReasonCode { get; init; } = "post-completion-proof-pending";

    public ActionCommand Action { get; init; } = new(false, false, false, false, 0, false, false);

    public bool RunRequested { get; init; }

    public bool Exclusive { get; init; }

    public bool Completed { get; init; }

    public long UseAttemptId { get; init; }

    public long ManualUseSequence { get; init; }

    public bool NativeDeathConfirmed { get; init; }

    public bool RestartRequested { get; init; }

    public string RestartRequestId { get; init; } = string.Empty;

    public string RestartReason { get; init; } = "none";

    public E1M1ContinuationNavigationSnapshot Navigation { get; init; } = new();

    public E1M1ContinuationDoorTrace DoorTrace { get; init; } = new();

    public E1M1ContinuationGatekeeperTrace GatekeeperTrace { get; init; } = new();

    public E1M1ContinuationThreatTrace ThreatTrace { get; init; } = new();

    public E1M1ContinuationWeaponTrace WeaponTrace { get; init; } = new();

    public E1M1ContinuationVitalityTrace VitalityTrace { get; init; } = new();

    public E1M1ContinuationSemanticProjection SemanticProjection { get; init; } = new();

    public FirstDoorAudioCatalogTrace AudioCatalogTrace { get; init; } = new();

    public E1M1ContinuationFailureTrace FailureTrace { get; init; } = new();

    public E1M1ContinuationCompletionTrace CompletionTrace { get; init; } = new();

    public string ContractError { get; init; } = string.Empty;
}

internal sealed class E1M1ContinuationNavigator
{
    internal const int GatekeeperRuntimeType = 11;
    internal const int GatekeeperSectorIndex = 74;
    internal const double GatekeeperSpawnX = 3008d;
    internal const double GatekeeperSpawnY = -4416d;
    internal const double CanonicalPlayerRadius = 16d;
    internal const double SecondDoorPortalY = -4000d;
    internal const double SecondDoorNearFaceY = -4016d;
    internal const double SecondDoorFarFaceY = -4032d;
    internal const double SecondDoorUseTargetX = 3008d;
    internal const double SecondDoorUseTargetY = SecondDoorNearFaceY;

    private const int CurrentContractVersion = 1;
    private const long MfShootable = 0x00000004L;
    private const long MfCountKill = 0x00400000L;
    private const int MaximumNativeActorCapacity = 64;
    private const int NumberOfWeapons = 9;
    private const int NoPendingWeapon = 10;
    private const double FixedUnit = 65536d;
    private const double BamFullTurn = 4294967296d;
    private const int AudioTraceCapacity = 32;

    private static readonly int[] KnownRouteSectors =
        { 60, 56, 75, 76, 73, 72, 74, 78, 79, 80, 81, 84, 82 };
    private static readonly int[] ForbiddenNukageSectors = { 57, 61 };

    private readonly E1M1ContinuationPolicy _policy;
    private string _sessionId = string.Empty;
    private string _runId = string.Empty;
    private long _runGeneration;
    private long _routeStartedAtControlTick;
    private long _legStartedAtControlTick;
    private long _combatStartedAtControlTick = -1;
    private string _combatOwnerKind = "none";
    private long _combatOwnerIdentity;
    private long _nativeLevelLoadSequence = -1;
    private long _lastPoseGametic = -1;
    private long _lastActorGametic = -1;
    private long _lastWeaponGametic = -1;
    private int _poseMissingFrames;
    private int _legIndex;
    private int _stationaryFrames;
    private bool _active;
    private bool _completed;
    private bool _failed;
    private string _failureCode = string.Empty;
    private E1M1ContinuationState _state = E1M1ContinuationState.WaitingForPostCompletion;
    private E1M1ContinuationPoseObservation _pose = new();
    private E1M1ContinuationWaypoint? _lastTarget;
    private PendingUseAttempt? _pendingUse;
    private long _nextUseAttemptId = 1;
    private string _lastAckReason = "not-expected";
    private bool _secondDoorAckAccepted;
    private bool _secondDoorSlabObserved;
    private bool _secondDoorTraversed;
    private bool _exitDoorAckAccepted;
    private bool _exitDoorSlabObserved;
    private bool _exitDoorTraversed;
    private bool _exitSwitchAckAccepted;
    private bool _levelTransitionConfirmed;
    private long _gatekeeperIdentity;
    private int _gatekeeperHealth;
    private bool _gatekeeperLineOfSight;
    private bool _gatekeeperTopologyAccepted;
    private string _gatekeeperTopologyReason = "gatekeeper-topology-not-evaluated";
    private bool _gatekeeperAcquiredAlive;
    private bool _gatekeeperKilled;
    private int _gatekeeperKillCountAtAcquisition = -1;
    private int _gatekeeperConfirmedKillCount = -1;
    private bool _gatekeeperSnapshotAccepted;
    private bool _gatekeeperSnapshotFresh;
    private string _gatekeeperReason = "gatekeeper-not-evaluated";
    private double _gatekeeperBearingError;
    private PostComputerRoomNativeActorFact? _gatekeeperFact;
    private PostComputerRoomNativeActorFact? _routeThreatFact;
    private long _routeThreatIdentity;
    private double _routeThreatBearingError;
    private bool _routeThreatStationaryFireAuthorized;
    private string _routeThreatReason = "route-threat-not-evaluated";
    private WeaponEvaluation _weapon = WeaponEvaluation.Unavailable("native-weapon-not-evaluated");
    private bool _weaponContinuationArmed;
    private string _weaponContinuationOwnerKind = "none";
    private long _weaponContinuationTargetIdentity;
    private int _weaponContinuationReadyWeapon = -1;
    private long _weaponContinuationAuthorizedAtControlTick = -1;
    private bool _weaponAttackContinuation;
    private long _lastDeathGametic = -1;
    private int _consecutiveDeathGametics;
    private bool _nativeDeathConfirmed;
    private string _restartRequestId = string.Empty;
    private bool _vitalityAvailable;
    private bool _vitalityFresh;
    private bool _deathCandidate;
    private long _vitalityGametic = -1;
    private int _vitalityHealth = -1;
    private int _vitalityPlayerState = -1;
    private int _vitalityKillCount = -1;
    private long _lastAudioSequence;
    private string _audioSessionId = string.Empty;
    private string _audioRunId = string.Empty;
    private long _audioRunGeneration;
    private FirstDoorAudioCatalogTrace _audioTrace = new();
    private readonly List<E1M1ContinuationReplayEntry> _replay = new();
    private E1M1ContinuationFailureTrace _failureTrace = new();
    private E1M1ContinuationCompletionTrace _completionTrace = new();
    private E1M1ContinuationDecision? _terminalDecision;
    private E1M1ContinuationDecision? _restartDecision;

    internal E1M1ContinuationNavigator(E1M1ContinuationPolicy? policy = null)
    {
        _policy = policy ?? new E1M1ContinuationPolicy();
        ValidatePolicy(_policy);
    }

    internal E1M1ContinuationDecision Evaluate(
        E1M1ContinuationActivationProof? proof,
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        ArgumentNullException.ThrowIfNull(input);
        var activationError = ValidateActivation(proof, input);
        if (!string.IsNullOrEmpty(activationError))
        {
            _audioTrace = CreateAudioCatalogTrace(input, controlTick);
            return ProjectWaiting(input, controlTick, activationError);
        }

        if (!_active || ScopeChanged(input))
        {
            Start(proof!, input, controlTick);
        }

        _audioTrace = CreateAudioCatalogTrace(input, controlTick);

        if (_completed)
        {
            return EchoTerminal(input, controlTick);
        }

        if (_nativeDeathConfirmed && _restartDecision is not null)
        {
            return EchoRestart(input, controlTick);
        }

        if (_failed)
        {
            TrackNativeDeath(input);
            if (_nativeDeathConfirmed)
            {
                return PromoteFailedTerminalToRestart(input, controlTick);
            }

            return EchoTerminal(input, controlTick);
        }

        _gatekeeperSnapshotAccepted = false;
        _gatekeeperSnapshotFresh = false;
        _gatekeeperTopologyAccepted = false;
        _gatekeeperTopologyReason = "gatekeeper-topology-not-evaluated-this-tick";
        _routeThreatStationaryFireAuthorized = false;
        _weapon = WeaponEvaluation.Unavailable("native-weapon-not-evaluated");
        _weaponAttackContinuation = false;

        TrackNativeDeath(input);

        if (_nativeDeathConfirmed)
        {
            ClearWeaponContinuation();
            _state = E1M1ContinuationState.AwaitRestart;
            return Project(
                input,
                controlTick,
                _state,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                NeutralAction(),
                false,
                "native-player-death-restart-requested");
        }

        var levelError = ValidateLevelTransport(input);
        if (!string.IsNullOrEmpty(levelError))
        {
            return HoldForMissingPoseOrFail(input, controlTick, levelError);
        }

        if (input.NativeGameState == 1)
        {
            if (_state != E1M1ContinuationState.AwaitLevelCompletion
                || !_exitSwitchAckAccepted
                || !_secondDoorTraversed
                || !_gatekeeperKilled
                || !_exitDoorTraversed)
            {
                return Fail(input, controlTick, "premature-or-unproven-e1m1-intermission");
            }

            _levelTransitionConfirmed = true;
            _completed = true;
            _state = E1M1ContinuationState.Complete;
            return Project(
                input,
                controlTick,
                _state,
                E1M1ContinuationOwnershipDisposition.Completed,
                NeutralAction(),
                false,
                "e1m1-level-completion-confirmed");
        }

        if (input.NativeGameState != 0)
        {
            return Fail(input, controlTick, $"unexpected-e1m1-game-state:{input.NativeGameState}");
        }

        _pose = ObservePose(input);
        if (!_pose.Available || !_pose.Fresh)
        {
            return HoldForMissingPoseOrFail(input, controlTick, _pose.Reason);
        }

        _poseMissingFrames = 0;
        if (Frames(controlTick, _routeStartedAtControlTick) >= _policy.RouteTimeoutFrames)
        {
            return Fail(input, controlTick, "e1m1-continuation-route-budget-exhausted");
        }

        if (ForbiddenNukageSectors.Contains(_pose.PlayerSectorIndex))
        {
            return Fail(input, controlTick, $"e1m1-continuation-forbidden-nukage-sector:{_pose.PlayerSectorIndex}");
        }

        if (!KnownRouteSectors.Contains(_pose.PlayerSectorIndex))
        {
            return Fail(input, controlTick, $"e1m1-continuation-unexpected-sector:{_pose.PlayerSectorIndex}");
        }

        var topologyError = ValidateAndTrackPhaseSector(_pose.PlayerSectorIndex);
        if (string.IsNullOrEmpty(topologyError))
        {
            topologyError = ValidateLegSectorCeiling(_pose.PlayerSectorIndex);
        }
        if (!string.IsNullOrEmpty(topologyError))
        {
            return Fail(input, controlTick, topologyError);
        }

        TrackGatekeeper(input);
        _weapon = EvaluateWeapon(input);

        var combatDeadlineFailure = EvaluateCombatDeadlineFailure(input, controlTick);
        if (combatDeadlineFailure is not null)
        {
            return combatDeadlineFailure;
        }

        var pendingDecision = EvaluatePendingUseAck(input, controlTick);
        if (pendingDecision is not null)
        {
            return pendingDecision;
        }

        var deadlineFailure = EvaluateDeadlineFailure(input, controlTick);
        if (deadlineFailure is not null)
        {
            return deadlineFailure;
        }

        if (_state == E1M1ContinuationState.AwaitLevelCompletion)
        {
            return EnsureLegBudgetThenProject(
                input,
                controlTick,
                _state,
                NeutralAction(),
                false,
                "e1m1-level-transition-pending");
        }

        return EvaluateRoute(input, controlTick);
    }

    private string ValidateAndTrackPhaseSector(int sector)
    {
        if (!_secondDoorAckAccepted)
        {
            return sector is 60 or 56
                ? string.Empty
                : $"second-door-forward-sector-before-owned-use:{sector}";
        }

        if (!_secondDoorTraversed)
        {
            if (sector == 76)
            {
                _secondDoorSlabObserved = true;
                return string.Empty;
            }

            if (sector == 73)
            {
                return string.Empty;
            }

            return sector is 56 or 75
                ? string.Empty
                : $"second-door-traversal-sector-order:{sector}";
        }

        if (!_gatekeeperKilled)
        {
            return sector is 73 or 72 or 74
                ? string.Empty
                : $"gatekeeper-forward-sector-before-required-kill:{sector}";
        }

        // A kill from the approach lane does not advance the route to the exit-door phase.
        if (_legIndex is 8 or 9 && sector is 73 or 72 or 74)
        {
            return string.Empty;
        }

        if (!_exitDoorAckAccepted)
        {
            return sector is 74 or 78 or 79 or 80
                ? string.Empty
                : $"exit-door-forward-sector-before-owned-use:{sector}";
        }

        if (!_exitDoorTraversed)
        {
            if (sector == 81)
            {
                _exitDoorSlabObserved = true;
                return string.Empty;
            }

            if (sector == 84)
            {
                return string.Empty;
            }

            return sector == 80
                ? string.Empty
                : $"exit-door-traversal-sector-order:{sector}";
        }

        return sector is 84 or 82
            ? string.Empty
            : $"exit-room-sector-order:{sector}";
    }

    private string ValidateLegSectorCeiling(int sector)
    {
        bool allowed = _legIndex switch
        {
            <= 3 => sector == 60,
            4 => sector is 60 or 56,
            5 => sector is 60 or 56,
            6 => sector == 56,
            7 => sector is 56 or 75 or 76 or 73,
            8 => sector is 73 or 72,
            9 => sector is 73 or 72 or 74,
            10 => sector is 74 or 78,
            11 => sector is 74 or 78,
            12 => _state is E1M1ContinuationState.PreUseStopExitDoor
                    or E1M1ContinuationState.StationaryExitDoorUse
                    or E1M1ContinuationState.AwaitExitDoorAck
                ? sector == 80
                : sector is 78 or 79 or 80,
            13 => sector is 80 or 81 or 84,
            14 => sector is 84 or 82,
            15 => sector == 82,
            _ => false
        };
        return allowed
            ? string.Empty
            : $"e1m1-continuation-leg-sector-ceiling:{_legIndex}:{sector}";
    }

    private void Start(
        E1M1ContinuationActivationProof proof,
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        _sessionId = input.SessionId;
        _runId = input.RunId;
        _runGeneration = input.RunGeneration;
        _routeStartedAtControlTick = controlTick;
        _legStartedAtControlTick = controlTick;
        _combatStartedAtControlTick = -1;
        _combatOwnerKind = "none";
        _combatOwnerIdentity = 0;
        _nativeLevelLoadSequence = input.NativeLevelLoadSequence;
        _lastPoseGametic = proof.ActivationPose.NativeGametic;
        _lastActorGametic = -1;
        _lastWeaponGametic = -1;
        _poseMissingFrames = 0;
        _legIndex = 0;
        _stationaryFrames = 0;
        _active = true;
        _completed = false;
        _failed = false;
        _failureCode = string.Empty;
        _state = E1M1ContinuationState.NavigateZigzag;
        _pose = ActivationPose(proof.ActivationPose);
        _lastTarget = _policy.Waypoints[0];
        _pendingUse = null;
        _nextUseAttemptId = 1;
        _lastAckReason = "not-expected";
        _secondDoorAckAccepted = false;
        _secondDoorSlabObserved = false;
        _secondDoorTraversed = false;
        _exitDoorAckAccepted = false;
        _exitDoorSlabObserved = false;
        _exitDoorTraversed = false;
        _exitSwitchAckAccepted = false;
        _levelTransitionConfirmed = false;
        _gatekeeperIdentity = 0;
        _gatekeeperHealth = 0;
        _gatekeeperLineOfSight = false;
        _gatekeeperTopologyAccepted = false;
        _gatekeeperTopologyReason = "gatekeeper-topology-run-start";
        _gatekeeperAcquiredAlive = false;
        _gatekeeperKilled = false;
        _gatekeeperKillCountAtAcquisition = -1;
        _gatekeeperConfirmedKillCount = -1;
        _gatekeeperSnapshotAccepted = false;
        _gatekeeperSnapshotFresh = false;
        _gatekeeperReason = "gatekeeper-run-start";
        _gatekeeperBearingError = 0;
        _gatekeeperFact = null;
        _routeThreatFact = null;
        _routeThreatIdentity = 0;
        _routeThreatBearingError = 0;
        _routeThreatStationaryFireAuthorized = false;
        _routeThreatReason = "route-threat-run-start";
        _weapon = WeaponEvaluation.Unavailable("native-weapon-run-start");
        ClearWeaponContinuation();
        _lastDeathGametic = -1;
        _consecutiveDeathGametics = 0;
        _nativeDeathConfirmed = false;
        _restartRequestId = string.Empty;
        _vitalityAvailable = false;
        _vitalityFresh = false;
        _deathCandidate = false;
        _vitalityGametic = -1;
        _vitalityHealth = -1;
        _vitalityPlayerState = -1;
        _vitalityKillCount = -1;
        _replay.Clear();
        _failureTrace = new E1M1ContinuationFailureTrace();
        _completionTrace = new E1M1ContinuationCompletionTrace();
        _terminalDecision = null;
        _restartDecision = null;
    }

    private E1M1ContinuationDecision EvaluateRoute(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        if (_secondDoorTraversed && !_gatekeeperKilled && _pose.PlayerSectorIndex is 72 or 74)
        {
            var combatDecision = EvaluateGatekeeperCombat(input, controlTick);
            if (combatDecision is not null)
            {
                return combatDecision;
            }
        }

        var routeThreatDecision = EvaluateRouteThreat(input, controlTick);
        if (routeThreatDecision is not null)
        {
            return routeThreatDecision;
        }

        return _state switch
        {
            E1M1ContinuationState.NavigateZigzag
                or E1M1ContinuationState.ApproachSecondDoor
                => NavigateToSecondDoor(input, controlTick),
            E1M1ContinuationState.PreUseStopSecondDoor
                => PrepareStationaryUse(
                    input,
                    controlTick,
                    E1M1ContinuationUseKind.SecondDoor,
                    E1M1ContinuationState.PreUseStopSecondDoor,
                    E1M1ContinuationState.StationarySecondDoorUse,
                    SecondDoorUseTargetX,
                    SecondDoorUseTargetY,
                    "second-door"),
            E1M1ContinuationState.TraverseSecondDoor
                => TraverseSecondDoor(input, controlTick),
            E1M1ContinuationState.NavigateGatekeeper
                or E1M1ContinuationState.EngageGatekeeper
                => NavigateGatekeeper(input, controlTick),
            E1M1ContinuationState.NavigateExitDoor
                => NavigateExitDoor(input, controlTick),
            E1M1ContinuationState.PreUseStopExitDoor
                => PrepareStationaryUse(
                    input,
                    controlTick,
                    E1M1ContinuationUseKind.ExitDoor,
                    E1M1ContinuationState.PreUseStopExitDoor,
                    E1M1ContinuationState.StationaryExitDoorUse,
                    3008d,
                    -4624d,
                    "exit-door"),
            E1M1ContinuationState.EnterExitRoom
                => EnterExitRoom(input, controlTick),
            E1M1ContinuationState.ApproachExitSwitch
                => ApproachExitSwitch(input, controlTick),
            E1M1ContinuationState.PreUseStopExitSwitch
                => PrepareStationaryUse(
                    input,
                    controlTick,
                    E1M1ContinuationUseKind.ExitSwitch,
                    E1M1ContinuationState.PreUseStopExitSwitch,
                    E1M1ContinuationState.StationaryExitUse,
                    2912d,
                    -4768d,
                    "exit-switch"),
            _ => Fail(input, controlTick, $"e1m1-continuation-state-invariant:{_state}")
        };
    }

    private E1M1ContinuationDecision? EvaluateRouteThreat(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        _routeThreatStationaryFireAuthorized = false;
        if (!_gatekeeperSnapshotAccepted
            || !_gatekeeperSnapshotFresh
            || _routeThreatFact is null
            || _routeThreatFact.Health <= 0
            || !_routeThreatFact.LineOfSight)
        {
            ClearWeaponContinuationIfOwner("route-threat", _routeThreatIdentity);
            return null;
        }

        if (!IsCurrentOrAdjacentRouteSector(
                _pose.PlayerSectorIndex,
                _routeThreatFact.SectorIndex))
        {
            _routeThreatReason = "captured-route-threat-outside-current-adjacent-topology";
            ClearWeaponContinuationIfOwner("route-threat", _routeThreatIdentity);
            return null;
        }

        if (Frames(controlTick, _legStartedAtControlTick) >= _policy.LegTimeoutFrames)
        {
            return Fail(input, controlTick, "e1m1-continuation-leg-budget-exhausted:route-threat");
        }

        EnsureCombatOwner("route-threat", _routeThreatIdentity, controlTick);

        if (Frames(controlTick, _combatStartedAtControlTick) >= _policy.CombatTimeoutFrames)
        {
            return Fail(input, controlTick, "e1m1-route-threat-combat-budget-exhausted");
        }

        if (Math.Abs(_routeThreatBearingError) > _policy.AlignmentToleranceDegrees)
        {
            _routeThreatReason = "route-threat-bearing-intercept";
            ClearWeaponContinuationIfOwner("route-threat", _routeThreatIdentity);
            return Project(
                input,
                controlTick,
                E1M1ContinuationState.InterceptRouteThreat,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                TurnAction(_routeThreatBearingError),
                false,
                _routeThreatReason);
        }

        if (!_weapon.Accepted || !_weapon.Fresh)
        {
            _routeThreatReason = _weapon.Reason;
            ClearWeaponContinuationIfOwner("route-threat", _routeThreatIdentity);
            return Project(
                input,
                controlTick,
                E1M1ContinuationState.InterceptRouteThreat,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                NeutralAction(),
                false,
                _routeThreatReason);
        }

        if (!_pose.Stationary)
        {
            _routeThreatReason = "route-threat-stationary-momentum-settle";
            ClearWeaponContinuationIfOwner("route-threat", _routeThreatIdentity);
            return Project(
                input,
                controlTick,
                E1M1ContinuationState.InterceptRouteThreat,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                NeutralAction(),
                false,
                _routeThreatReason);
        }

        if (_weapon.FireOpportunity)
        {
            ArmWeaponContinuation("route-threat", _routeThreatIdentity, controlTick);
            _routeThreatStationaryFireAuthorized = true;
            _routeThreatReason = "route-threat-stationary-fire";
            return Project(
                input,
                controlTick,
                E1M1ContinuationState.InterceptRouteThreat,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                AttackAction(),
                false,
                _routeThreatReason);
        }

        if (WeaponContinuationContextValid(
                "route-threat",
                _routeThreatIdentity,
                _routeThreatFact.Health > 0,
                _routeThreatFact.LineOfSight,
                true,
                Math.Abs(_routeThreatBearingError) <= _policy.AlignmentToleranceDegrees))
        {
            _weaponAttackContinuation = true;
            _routeThreatStationaryFireAuthorized = true;
            _routeThreatReason = "route-threat-fire-cycle-continuation";
            return Project(
                input,
                controlTick,
                E1M1ContinuationState.InterceptRouteThreat,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                AttackAction(),
                false,
                _routeThreatReason);
        }

        _routeThreatReason = _weapon.Reason;
        ClearWeaponContinuationIfOwner("route-threat", _routeThreatIdentity);
        return Project(
            input,
            controlTick,
            E1M1ContinuationState.InterceptRouteThreat,
            E1M1ContinuationOwnershipDisposition.Exclusive,
            NeutralAction(),
            false,
            _routeThreatReason);
    }

    private E1M1ContinuationDecision NavigateToSecondDoor(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        while (_legIndex <= 6 && WaypointCertified(_policy.Waypoints[_legIndex]))
        {
            if (_legIndex == 6)
            {
                _state = E1M1ContinuationState.PreUseStopSecondDoor;
                _stationaryFrames = 0;
                _legStartedAtControlTick = controlTick;
                return Project(
                    input,
                    controlTick,
                    _state,
                    E1M1ContinuationOwnershipDisposition.Exclusive,
                    NeutralAction(),
                    false,
                    "second-door-pre-use-stop");
            }

            _legIndex++;
            _legStartedAtControlTick = controlTick;
        }

        _state = _legIndex <= 4
            ? E1M1ContinuationState.NavigateZigzag
            : E1M1ContinuationState.ApproachSecondDoor;
        return NavigateTowardCurrentWaypoint(input, controlTick, _state, "second-door-canonical-route");
    }

    private E1M1ContinuationDecision TraverseSecondDoor(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        if (_pose.PlayerSectorIndex == 73)
        {
            _secondDoorTraversed = true;
            _legIndex = 8;
            _state = E1M1ContinuationState.NavigateGatekeeper;
            _legStartedAtControlTick = controlTick;
            return NavigateGatekeeper(input, controlTick);
        }

        _legIndex = 7;
        return NavigateTowardCurrentWaypoint(
            input,
            controlTick,
            E1M1ContinuationState.TraverseSecondDoor,
            "second-door-acknowledged-traverse");
    }

    private E1M1ContinuationDecision NavigateGatekeeper(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        if (_state == E1M1ContinuationState.EngageGatekeeper && !_gatekeeperKilled)
        {
            return EvaluateGatekeeperCombat(input, controlTick)
                ?? Project(
                    input,
                    controlTick,
                    E1M1ContinuationState.EngageGatekeeper,
                    E1M1ContinuationOwnershipDisposition.Exclusive,
                    NeutralAction(),
                    false,
                    "gatekeeper-proof-pending");
        }

        while (_legIndex <= 9 && WaypointCertified(_policy.Waypoints[_legIndex]))
        {
            if (_legIndex == 9)
            {
                if (!_gatekeeperKilled)
                {
                    _state = E1M1ContinuationState.EngageGatekeeper;
                    if (_combatStartedAtControlTick < 0)
                    {
                        _combatStartedAtControlTick = controlTick;
                    }

                    return EvaluateGatekeeperCombat(input, controlTick)
                        ?? Project(
                            input,
                            controlTick,
                            _state,
                            E1M1ContinuationOwnershipDisposition.Exclusive,
                            NeutralAction(),
                            false,
                            "gatekeeper-proof-pending");
                }

                _legIndex = 10;
                _state = E1M1ContinuationState.NavigateExitDoor;
                _legStartedAtControlTick = controlTick;
                return NavigateExitDoor(input, controlTick);
            }

            _legIndex++;
            _legStartedAtControlTick = controlTick;
        }

        _state = E1M1ContinuationState.NavigateGatekeeper;
        return NavigateTowardCurrentWaypoint(input, controlTick, _state, "gatekeeper-canonical-approach");
    }

    private E1M1ContinuationDecision? EvaluateGatekeeperCombat(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        if (_gatekeeperKilled)
        {
            ClearWeaponContinuationIfOwner("gatekeeper", _gatekeeperIdentity);
            if (_pose.PlayerSectorIndex == GatekeeperSectorIndex)
            {
                _legIndex = 10;
                _state = E1M1ContinuationState.NavigateExitDoor;
                _legStartedAtControlTick = controlTick;
                return NavigateExitDoor(input, controlTick);
            }

            return null;
        }

        if (Frames(controlTick, _legStartedAtControlTick) >= _policy.LegTimeoutFrames)
        {
            return Fail(input, controlTick, "e1m1-continuation-leg-budget-exhausted:gatekeeper-combat");
        }

        if (_combatStartedAtControlTick >= 0
            && Frames(controlTick, _combatStartedAtControlTick) >= _policy.CombatTimeoutFrames)
        {
            return Fail(input, controlTick, "e1m1-gatekeeper-combat-budget-exhausted");
        }

        if (!_gatekeeperAcquiredAlive || _gatekeeperFact is null)
        {
            ClearWeaponContinuationIfOwner("gatekeeper", _gatekeeperIdentity);
            return Project(
                input,
                controlTick,
                E1M1ContinuationState.EngageGatekeeper,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                NeutralAction(),
                false,
                "canonical-gatekeeper-acquisition-pending");
        }

        if (!_gatekeeperSnapshotAccepted || !_gatekeeperSnapshotFresh)
        {
            ClearWeaponContinuationIfOwner("gatekeeper", _gatekeeperIdentity);
            return Project(
                input,
                controlTick,
                E1M1ContinuationState.EngageGatekeeper,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                NeutralAction(),
                false,
                _gatekeeperReason);
        }

        if (!_gatekeeperTopologyAccepted)
        {
            ClearWeaponContinuationIfOwner("gatekeeper", _gatekeeperIdentity);
            if (_pose.PlayerSectorIndex == GatekeeperSectorIndex)
            {
                EnsureCombatOwner("gatekeeper", _gatekeeperIdentity, controlTick);
            }

            return _pose.PlayerSectorIndex == GatekeeperSectorIndex
                ? Project(
                    input,
                    controlTick,
                    E1M1ContinuationState.EngageGatekeeper,
                    E1M1ContinuationOwnershipDisposition.Exclusive,
                    NeutralAction(),
                    false,
                    _gatekeeperTopologyReason)
                : null;
        }

        if (!_gatekeeperLineOfSight)
        {
            ClearWeaponContinuationIfOwner("gatekeeper", _gatekeeperIdentity);
            if (_pose.PlayerSectorIndex == GatekeeperSectorIndex)
            {
                EnsureCombatOwner("gatekeeper", _gatekeeperIdentity, controlTick);
                return Project(
                    input,
                    controlTick,
                    E1M1ContinuationState.EngageGatekeeper,
                    E1M1ContinuationOwnershipDisposition.Exclusive,
                    NeutralAction(),
                    false,
                    "canonical-gatekeeper-line-of-sight-pending");
            }

            return null;
        }

        EnsureCombatOwner("gatekeeper", _gatekeeperIdentity, controlTick);

        if (Math.Abs(_gatekeeperBearingError) > _policy.AlignmentToleranceDegrees)
        {
            ClearWeaponContinuationIfOwner("gatekeeper", _gatekeeperIdentity);
            return Project(
                input,
                controlTick,
                E1M1ContinuationState.EngageGatekeeper,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                TurnAction(_gatekeeperBearingError),
                false,
                "canonical-gatekeeper-bearing-intercept");
        }

        if (!_weapon.Accepted || !_weapon.Fresh)
        {
            ClearWeaponContinuationIfOwner("gatekeeper", _gatekeeperIdentity);
            return Project(
                input,
                controlTick,
                E1M1ContinuationState.EngageGatekeeper,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                NeutralAction(),
                false,
                _weapon.Reason);
        }

        if (!_pose.Stationary)
        {
            ClearWeaponContinuationIfOwner("gatekeeper", _gatekeeperIdentity);
            return Project(
                input,
                controlTick,
                E1M1ContinuationState.EngageGatekeeper,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                NeutralAction(),
                false,
                "canonical-gatekeeper-stationary-momentum-settle");
        }

        if (_weapon.FireOpportunity)
        {
            ArmWeaponContinuation("gatekeeper", _gatekeeperIdentity, controlTick);
            return Project(
                input,
                controlTick,
                E1M1ContinuationState.EngageGatekeeper,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                AttackAction(),
                false,
                "canonical-gatekeeper-stationary-fire");
        }

        if (WeaponContinuationContextValid(
                "gatekeeper",
                _gatekeeperIdentity,
                _gatekeeperFact.Health > 0,
                _gatekeeperLineOfSight,
                _gatekeeperTopologyAccepted,
                Math.Abs(_gatekeeperBearingError) <= _policy.AlignmentToleranceDegrees))
        {
            _weaponAttackContinuation = true;
            return Project(
                input,
                controlTick,
                E1M1ContinuationState.EngageGatekeeper,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                AttackAction(),
                false,
                "canonical-gatekeeper-fire-cycle-continuation");
        }

        ClearWeaponContinuationIfOwner("gatekeeper", _gatekeeperIdentity);
        return Project(
            input,
            controlTick,
            E1M1ContinuationState.EngageGatekeeper,
            E1M1ContinuationOwnershipDisposition.Exclusive,
            NeutralAction(),
            false,
            _weapon.Reason);
    }

    private E1M1ContinuationDecision NavigateExitDoor(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        while (_legIndex <= 12 && WaypointCertified(_policy.Waypoints[_legIndex]))
        {
            if (_legIndex == 12)
            {
                _state = E1M1ContinuationState.PreUseStopExitDoor;
                _stationaryFrames = 0;
                _legStartedAtControlTick = controlTick;
                return Project(
                    input,
                    controlTick,
                    _state,
                    E1M1ContinuationOwnershipDisposition.Exclusive,
                    NeutralAction(),
                    false,
                    "exit-door-pre-use-stop");
            }

            _legIndex++;
            _legStartedAtControlTick = controlTick;
        }

        return NavigateTowardCurrentWaypoint(
            input,
            controlTick,
            E1M1ContinuationState.NavigateExitDoor,
            "exit-door-canonical-route");
    }

    private E1M1ContinuationDecision EnterExitRoom(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        if (!_exitDoorTraversed)
        {
            _legIndex = 13;
            if (_pose.PlayerSectorIndex == 84)
            {
                _exitDoorTraversed = true;
                _legIndex = 14;
                _legStartedAtControlTick = controlTick;
            }
            else
            {
                return NavigateTowardCurrentWaypoint(
                    input,
                    controlTick,
                    E1M1ContinuationState.EnterExitRoom,
                    "exit-door-acknowledged-traverse");
            }
        }

        _legIndex = Math.Max(_legIndex, 14);
        if (_pose.PlayerSectorIndex == 82 && WaypointCertified(_policy.Waypoints[14]))
        {
            _legIndex = 15;
            _state = E1M1ContinuationState.ApproachExitSwitch;
            _legStartedAtControlTick = controlTick;
            return ApproachExitSwitch(input, controlTick);
        }

        return NavigateTowardCurrentWaypoint(
            input,
            controlTick,
            E1M1ContinuationState.EnterExitRoom,
            "exit-room-certified-entry");
    }

    private E1M1ContinuationDecision ApproachExitSwitch(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        _legIndex = 15;
        if (WaypointCertified(_policy.Waypoints[15]))
        {
            _state = E1M1ContinuationState.PreUseStopExitSwitch;
            _stationaryFrames = 0;
            _legStartedAtControlTick = controlTick;
            return Project(
                input,
                controlTick,
                _state,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                NeutralAction(),
                false,
                "exit-switch-pre-use-stop");
        }

        return NavigateTowardCurrentWaypoint(
            input,
            controlTick,
            E1M1ContinuationState.ApproachExitSwitch,
            "exit-switch-canonical-approach");
    }

    private E1M1ContinuationDecision PrepareStationaryUse(
        BrowserE1M1ContinuationInput input,
        long controlTick,
        E1M1ContinuationUseKind useKind,
        E1M1ContinuationState stopState,
        E1M1ContinuationState useState,
        double targetX,
        double targetY,
        string reasonPrefix)
    {
        if (Frames(controlTick, _legStartedAtControlTick) >= _policy.LegTimeoutFrames)
        {
            return Fail(input, controlTick, $"e1m1-continuation-leg-budget-exhausted:{reasonPrefix}-pre-use");
        }

        var metrics = Metrics(_pose, targetX, targetY);
        if (metrics.Distance > _policy.UseMaximumDistance)
        {
            return Fail(input, controlTick, $"{reasonPrefix}-use-range-contract-violated");
        }

        if (Math.Abs(metrics.BearingErrorDegrees) > _policy.AlignmentToleranceDegrees)
        {
            _stationaryFrames = 0;
            return Project(
                input,
                controlTick,
                stopState,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                TurnAction(metrics.BearingErrorDegrees),
                false,
                $"{reasonPrefix}-stationary-alignment");
        }

        if (!_pose.Stationary)
        {
            _stationaryFrames = 0;
            return Project(
                input,
                controlTick,
                stopState,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                NeutralAction(),
                false,
                $"{reasonPrefix}-stationary-momentum-settle");
        }

        if (_stationaryFrames < 2)
        {
            _stationaryFrames++;
            return Project(
                input,
                controlTick,
                stopState,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                NeutralAction(),
                false,
                $"{reasonPrefix}-stationary-proof-{_stationaryFrames}-of-2");
        }

        var attempt = new PendingUseAttempt(
            input.SessionId,
            input.RunId,
            input.RunGeneration,
            useKind,
            _nextUseAttemptId++,
            controlTick,
            input.ManualUseSequence);
        _pendingUse = attempt;
        _lastAckReason = "missing-stationary-use-ack";
        _state = useKind switch
        {
            E1M1ContinuationUseKind.SecondDoor => E1M1ContinuationState.AwaitSecondDoorAck,
            E1M1ContinuationUseKind.ExitDoor => E1M1ContinuationState.AwaitExitDoorAck,
            E1M1ContinuationUseKind.ExitSwitch => E1M1ContinuationState.AwaitExitAck,
            _ => stopState
        };
        return Project(
            input,
            controlTick,
            useState,
            E1M1ContinuationOwnershipDisposition.Exclusive,
            UseAction(),
            false,
            $"{reasonPrefix}-stationary-use");
    }

    private E1M1ContinuationDecision? EvaluatePendingUseAck(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        if (_pendingUse is null)
        {
            return null;
        }

        if (input.AppliedActionAck is null)
        {
            if (Frames(controlTick, _legStartedAtControlTick) >= _policy.LegTimeoutFrames)
            {
                return Fail(
                    input,
                    controlTick,
                    $"e1m1-continuation-leg-budget-exhausted:{_pendingUse.Kind}-ack");
            }

            _lastAckReason = "missing-stationary-use-ack";
            return Project(
                input,
                controlTick,
                _state,
                E1M1ContinuationOwnershipDisposition.Exclusive,
                NeutralAction(),
                false,
                _lastAckReason);
        }

        if (Frames(controlTick, _legStartedAtControlTick) > _policy.LegTimeoutFrames)
        {
            return Fail(
                input,
                controlTick,
                $"e1m1-continuation-leg-budget-exhausted:{_pendingUse.Kind}-ack");
        }

        var rejection = ValidateAppliedActionAck(input.AppliedActionAck, _pendingUse, input.ManualUseSequence);
        if (!string.IsNullOrEmpty(rejection))
        {
            _lastAckReason = rejection;
            return Fail(input, controlTick, $"stationary-use-ack-rejected:{rejection}");
        }

        var accepted = _pendingUse;
        _lastAckReason = "accepted";
        _pendingUse = null;
        _stationaryFrames = 0;
        _legStartedAtControlTick = controlTick;
        switch (accepted.Kind)
        {
            case E1M1ContinuationUseKind.SecondDoor:
                _secondDoorAckAccepted = true;
                _legIndex = 7;
                _state = E1M1ContinuationState.TraverseSecondDoor;
                break;
            case E1M1ContinuationUseKind.ExitDoor:
                _exitDoorAckAccepted = true;
                _legIndex = 13;
                _state = E1M1ContinuationState.EnterExitRoom;
                break;
            case E1M1ContinuationUseKind.ExitSwitch:
                _exitSwitchAckAccepted = true;
                _state = E1M1ContinuationState.AwaitLevelCompletion;
                break;
            default:
                return Fail(input, controlTick, "stationary-use-ack-kind-invalid");
        }

        return null;
    }

    private static string ValidateAppliedActionAck(
        BrowserAppliedActionAck ack,
        PendingUseAttempt expected,
        long currentManualUseSequence)
    {
        if (!string.Equals(ack.SessionId, expected.SessionId, StringComparison.Ordinal)
            || !string.Equals(ack.RunId, expected.RunId, StringComparison.Ordinal)
            || ack.RunGeneration != expected.RunGeneration)
        {
            return "scope-mismatch";
        }

        if (ack.DecisionControlTick != expected.DecisionControlTick)
        {
            return "decision-control-tick-mismatch";
        }

        if (ack.UseAttemptId != expected.UseAttemptId)
        {
            return "use-attempt-mismatch";
        }

        if (!string.Equals(ack.ActionMode, FirstDoorBrowserControlSession.ExactActionMode, StringComparison.Ordinal))
        {
            return "nonexact-action-mode";
        }

        if (!string.Equals(ack.HostPath, FirstDoorBrowserControlSession.NativeActionHostPath, StringComparison.Ordinal)
            && !string.Equals(ack.HostPath, FirstDoorBrowserControlSession.KeyEventsHostPath, StringComparison.Ordinal))
        {
            return "invalid-host-path";
        }

        if (!ack.ProposedUse || !ack.AppliedUse || !ack.UseResolved)
        {
            return "use-not-applied";
        }

        if (!ack.EventQueued || ack.QueuedUseInputEventSequence <= 0)
        {
            return "use-event-not-queued";
        }

        if (!ack.UsePumped
            || ack.PumpedUseInputEventSequence != ack.QueuedUseInputEventSequence)
        {
            return "use-not-pumped";
        }

        if (ack.ManualUseSequenceAtDecision != expected.ManualUseSequence)
        {
            return "manual-use-decision-sequence-mismatch";
        }

        if (currentManualUseSequence != ack.ManualUseSequenceAtDecision)
        {
            return "manual-use-overlap";
        }

        if (ack.PulseResolverCalled || ack.ManualBlocked || ack.SenseOnly)
        {
            return "nonexact-use-resolution";
        }

        return ack.AppliedMoveForward
            || ack.AppliedMoveBackward
            || ack.AppliedStrafeLeft
            || ack.AppliedStrafeRight
            || ack.AppliedTurnYaw != 0
            || ack.AppliedAttack
            || ack.AppliedRun
                ? "applied-motion-not-neutral"
                : string.Empty;
    }

    private E1M1ContinuationDecision NavigateTowardCurrentWaypoint(
        BrowserE1M1ContinuationInput input,
        long controlTick,
        E1M1ContinuationState state,
        string reason)
    {
        var target = _policy.Waypoints[Math.Clamp(_legIndex, 0, _policy.Waypoints.Count - 1)];
        _lastTarget = target;
        if (Frames(controlTick, _legStartedAtControlTick) >= _policy.LegTimeoutFrames)
        {
            return Fail(input, controlTick, $"e1m1-continuation-leg-budget-exhausted:{target.Id}");
        }

        var metrics = Metrics(_pose, target.X, target.Y);
        var action = Math.Abs(metrics.BearingErrorDegrees) > _policy.AlignmentToleranceDegrees
            ? TurnAction(metrics.BearingErrorDegrees)
            : ForwardAction();
        return Project(
            input,
            controlTick,
            state,
            E1M1ContinuationOwnershipDisposition.Exclusive,
            action,
            action.MoveForward,
            reason);
    }

    private E1M1ContinuationDecision EnsureLegBudgetThenProject(
        BrowserE1M1ContinuationInput input,
        long controlTick,
        E1M1ContinuationState state,
        ActionCommand action,
        bool runRequested,
        string reason)
    {
        if (Frames(controlTick, _legStartedAtControlTick) >= _policy.LegTimeoutFrames)
        {
            return Fail(input, controlTick, $"e1m1-continuation-leg-budget-exhausted:{state}");
        }

        return Project(
            input,
            controlTick,
            state,
            E1M1ContinuationOwnershipDisposition.Exclusive,
            action,
            runRequested,
            reason);
    }

    private bool WaypointCertified(E1M1ContinuationWaypoint waypoint)
        => waypoint.AllowedSectors.Contains(_pose.PlayerSectorIndex)
            && Distance(_pose.PlayerX, _pose.PlayerY, waypoint.X, waypoint.Y)
                <= _policy.WaypointCompletionRadius;

    private string ValidateActivation(
        E1M1ContinuationActivationProof? proof,
        BrowserE1M1ContinuationInput input)
    {
        if (proof is null)
        {
            return "post-completion-proof-unavailable";
        }

        if (input.ContractVersion != CurrentContractVersion
            || proof.ProofVersion != 1)
        {
            return "e1m1-continuation-contract-version-mismatch";
        }

        if (string.IsNullOrWhiteSpace(input.SessionId)
            || string.IsNullOrWhiteSpace(input.RunId)
            || input.RunGeneration <= 0
            || !string.Equals(proof.SessionId, input.SessionId, StringComparison.Ordinal)
            || !string.Equals(proof.RunId, input.RunId, StringComparison.Ordinal)
            || proof.RunGeneration != input.RunGeneration)
        {
            return "e1m1-continuation-activation-scope-mismatch";
        }

        if (!string.IsNullOrEmpty(proof.ContractError))
        {
            return "e1m1-continuation-activation-contract-error";
        }

        var trace = proof.PostCompletionTrace ?? new PostComputerRoomCompletionTrace();
        if (!trace.Completed
            || trace.CompletionSnapshot is null
            || trace.CompletionAtControlTick < 0
            || proof.ActivationAtControlTick != trace.CompletionAtControlTick
            || input.ExpectedPostComputerRoomControlTick != trace.CompletionAtControlTick
            || !string.Equals(trace.SessionId, input.SessionId, StringComparison.Ordinal)
            || !string.Equals(trace.RunId, input.RunId, StringComparison.Ordinal)
            || trace.RunGeneration != input.RunGeneration
            || !string.Equals(trace.CompletionCode, "central-hall-entry-confirmed", StringComparison.Ordinal)
            || trace.CompletionSnapshot.State != PostComputerRoomRouteState.Complete
            || trace.CompletionSnapshot.PlayerSectorIndex != 60
            || trace.Replay is null
            || trace.Replay.Count > PostComputerRoomCompletionTrace.ReplayCapacity)
        {
            return "post-completion-trace-invalid";
        }

        var pose = proof.ActivationPose ?? new FirstDoorProximityObservation();
        if (!pose.InputAccepted
            || !pose.Available
            || !pose.Fresh
            || !pose.WadVerified
            || !string.Equals(
                pose.WadContentSha256,
                FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
                StringComparison.Ordinal)
            || pose.NativeGameState != 0
            || pose.NativeGameEpisode != 1
            || pose.NativeGameMap != 1
            || pose.PlayerSectorIndex != 60
            || (pose.PlayerVitalityFactsAvailable
                && (pose.PlayerHealth <= 0 || pose.PlayerState == 1)))
        {
            return "post-completion-activation-pose-invalid";
        }

        return string.Empty;
    }

    private string ValidateLevelTransport(BrowserE1M1ContinuationInput input)
    {
        if (!string.Equals(
                NormalizeHash(input.WadContentSha256),
                FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
                StringComparison.Ordinal))
        {
            return "canonical-doom1-wad-sha256-mismatch";
        }

        if (!input.NativeLevelFactsAvailable
            || !input.NativeLevelLoadSequenceAvailable
            || input.NativeLevelLoadSequence < 0
            || input.NativeGametic < 0
            || input.NativeLevelTime < 0)
        {
            return "native-level-facts-unavailable";
        }

        if (input.NativeLevelLoadSequence != _nativeLevelLoadSequence)
        {
            return "native-level-load-sequence-changed";
        }

        if (input.NativeGameEpisode != 1 || input.NativeGameMap != 1)
        {
            return "native-level-identity-mismatch";
        }

        return string.Empty;
    }

    private E1M1ContinuationPoseObservation ObservePose(BrowserE1M1ContinuationInput input)
    {
        if (!input.NativePlayerFactsAvailable)
        {
            return new E1M1ContinuationPoseObservation
            {
                NativeGametic = input.NativeGametic,
                Reason = "native-player-pose-unavailable"
            };
        }

        if (input.NativeGametic <= _lastPoseGametic)
        {
            return new E1M1ContinuationPoseObservation
            {
                NativeGametic = input.NativeGametic,
                Reason = input.NativeGametic == _lastPoseGametic
                    ? "native-player-pose-gametic-not-fresh"
                    : "native-player-pose-gametic-regressed"
            };
        }

        var x = input.NativePlayerXFixed / FixedUnit;
        var y = input.NativePlayerYFixed / FixedUnit;
        var momentumX = input.NativePlayerMomentumXFixed / FixedUnit;
        var momentumY = input.NativePlayerMomentumYFixed / FixedUnit;
        var heading = NormalizeDegrees((uint)input.NativePlayerAngleBam * 360d / BamFullTurn);
        if (!double.IsFinite(x)
            || !double.IsFinite(y)
            || !double.IsFinite(momentumX)
            || !double.IsFinite(momentumY)
            || !double.IsFinite(heading)
            || input.NativePlayerSectorIndex < 0)
        {
            return new E1M1ContinuationPoseObservation
            {
                NativeGametic = input.NativeGametic,
                Reason = "native-player-pose-invalid"
            };
        }

        _lastPoseGametic = Math.Max(_lastPoseGametic, input.NativeGametic);
        var momentum = Math.Sqrt((momentumX * momentumX) + (momentumY * momentumY));
        return new E1M1ContinuationPoseObservation
        {
            Available = true,
            Fresh = true,
            Reason = "native-player-pose-accepted",
            NativeGametic = input.NativeGametic,
            PlayerX = x,
            PlayerY = y,
            HeadingDegrees = heading,
            MomentumX = momentumX,
            MomentumY = momentumY,
            PlayerSectorIndex = input.NativePlayerSectorIndex,
            Stationary = momentum <= _policy.MaximumStationaryMomentum
        };
    }

    private E1M1ContinuationPoseObservation ActivationPose(FirstDoorProximityObservation pose)
    {
        var momentum = Math.Sqrt(
            (pose.PlayerMomentumX * pose.PlayerMomentumX)
            + (pose.PlayerMomentumY * pose.PlayerMomentumY));
        return new E1M1ContinuationPoseObservation
        {
            Available = true,
            Fresh = true,
            Reason = "typed-post-completion-activation-pose",
            NativeGametic = pose.NativeGametic,
            PlayerX = pose.PlayerX,
            PlayerY = pose.PlayerY,
            HeadingDegrees = pose.HeadingDegrees,
            MomentumX = pose.PlayerMomentumX,
            MomentumY = pose.PlayerMomentumY,
            PlayerSectorIndex = pose.PlayerSectorIndex,
            Stationary = momentum <= _policy.MaximumStationaryMomentum
        };
    }

    private void TrackGatekeeper(BrowserE1M1ContinuationInput input)
    {
        _gatekeeperSnapshotAccepted = false;
        _gatekeeperSnapshotFresh = false;
        var snapshot = input.ActorSnapshot ?? new PostComputerRoomNativeActorSnapshot();
        if (!snapshot.Available
            || snapshot.Gametic != input.NativeGametic
            || snapshot.Count < 0
            || snapshot.Capacity < snapshot.Count
            || snapshot.Capacity > MaximumNativeActorCapacity
            || snapshot.Truncated
            || snapshot.Actors is null
            || snapshot.Actors.Count != snapshot.Count)
        {
            _gatekeeperReason = "native-actor-snapshot-invalid";
            return;
        }

        _gatekeeperSnapshotAccepted = true;
        if (snapshot.Gametic <= _lastActorGametic)
        {
            _gatekeeperReason = "native-actor-snapshot-not-fresh";
            return;
        }

        _lastActorGametic = snapshot.Gametic;
        _gatekeeperSnapshotFresh = true;
        if (_gatekeeperIdentity == 0)
        {
            var alive = snapshot.Actors
                .Where(IsCanonicalGatekeeper)
                .Where(actor => actor.Health > 0)
                .OrderBy(actor => actor.Identity)
                .FirstOrDefault();
            if (alive is not null)
            {
                _gatekeeperIdentity = alive.Identity;
                _gatekeeperAcquiredAlive = true;
                _gatekeeperKillCountAtAcquisition = input.NativePlayerVitalityFactsAvailable
                    ? input.NativePlayerKillCount
                    : -1;
                _gatekeeperFact = alive;
                _gatekeeperHealth = alive.Health;
                _gatekeeperLineOfSight = alive.LineOfSight;
                _gatekeeperReason = "canonical-gatekeeper-acquired-alive";
            }
            else
            {
                _gatekeeperReason = "canonical-gatekeeper-alive-fact-pending";
            }
        }
        else
        {
            var retained = snapshot.Actors.FirstOrDefault(
                actor => actor.Identity == _gatekeeperIdentity);
            if (retained is not null)
            {
                _gatekeeperFact = retained;
                _gatekeeperHealth = retained.Health;
                _gatekeeperLineOfSight = retained.LineOfSight;
                _gatekeeperReason = retained.Health > 0
                    ? "canonical-gatekeeper-retained-alive"
                    : "canonical-gatekeeper-death-fact-observed";
            }
            else
            {
                _gatekeeperFact = null;
                _gatekeeperHealth = 0;
                _gatekeeperLineOfSight = false;
                _gatekeeperReason = "canonical-gatekeeper-removed-from-fresh-snapshot";
            }
        }

        var killCountAdvanced = _gatekeeperKillCountAtAcquisition >= 0
            && input.NativePlayerVitalityFactsAvailable
            && input.NativePlayerKillCount > _gatekeeperKillCountAtAcquisition;
        if (_gatekeeperAcquiredAlive
            && killCountAdvanced
            && (_gatekeeperFact is null || _gatekeeperFact.Health <= 0))
        {
            _gatekeeperKilled = true;
            _gatekeeperConfirmedKillCount = input.NativePlayerKillCount;
            _gatekeeperLineOfSight = false;
            _gatekeeperReason = "canonical-gatekeeper-death-and-killcount-confirmed";
            ClearCombatOwner("gatekeeper", _gatekeeperIdentity);
        }

        if (_gatekeeperFact is not null && _pose.Available)
        {
            _gatekeeperTopologyAccepted = IsCurrentOrAdjacentRouteSector(
                _pose.PlayerSectorIndex,
                _gatekeeperFact.SectorIndex);
            _gatekeeperTopologyReason = _gatekeeperTopologyAccepted
                ? "canonical-gatekeeper-current-adjacent-topology"
                : "canonical-gatekeeper-outside-current-adjacent-topology";
            _gatekeeperBearingError = Metrics(
                _pose,
                _gatekeeperFact.XFixed / FixedUnit,
                _gatekeeperFact.YFixed / FixedUnit).BearingErrorDegrees;
        }
        else
        {
            _gatekeeperTopologyAccepted = false;
            _gatekeeperTopologyReason = "canonical-gatekeeper-current-fact-unavailable";
        }

        TrackRouteThreat(snapshot.Actors);
    }

    private void TrackRouteThreat(IReadOnlyList<PostComputerRoomNativeActorFact> actors)
    {
        string? releaseReason = null;
        if (_routeThreatIdentity != 0)
        {
            var retained = actors.FirstOrDefault(actor => actor.Identity == _routeThreatIdentity);
            if (retained is not null
                && retained.Health > 0
                && IsCurrentOrAdjacentRouteSector(_pose.PlayerSectorIndex, retained.SectorIndex))
            {
                _routeThreatFact = retained;
                _routeThreatBearingError = Metrics(
                    _pose,
                    retained.XFixed / FixedUnit,
                    retained.YFixed / FixedUnit).BearingErrorDegrees;
                _routeThreatReason = retained.LineOfSight
                    ? "captured-route-threat-retained-with-line-of-sight"
                    : "captured-route-threat-retained-line-of-sight-lost";
                return;
            }

            var releasedIdentity = _routeThreatIdentity;
            _routeThreatFact = null;
            _routeThreatIdentity = 0;
            _routeThreatBearingError = 0;
            _routeThreatStationaryFireAuthorized = false;
            releaseReason = retained is null
                ? "captured-route-threat-removed-from-fresh-snapshot"
                : retained.Health <= 0
                    ? "captured-route-threat-death-observed"
                    : "captured-route-threat-left-current-adjacent-topology";
            _routeThreatReason = releaseReason;
            ClearCombatOwner("route-threat", releasedIdentity);
        }

        _routeThreatFact = actors
            .Where(actor => actor.Identity > 0
                && actor.Identity != _gatekeeperIdentity
                && actor.Health > 0
                && actor.LineOfSight
                && (actor.Flags & MfShootable) != 0
                && (actor.Flags & MfCountKill) != 0
                && IsCurrentOrAdjacentRouteSector(_pose.PlayerSectorIndex, actor.SectorIndex))
            .OrderBy(actor => Distance(
                _pose.PlayerX,
                _pose.PlayerY,
                actor.XFixed / FixedUnit,
                actor.YFixed / FixedUnit))
            .ThenBy(actor => actor.Identity)
            .FirstOrDefault();
        _routeThreatIdentity = _routeThreatFact?.Identity ?? 0;
        if (_routeThreatFact is null)
        {
            _routeThreatBearingError = 0;
            _routeThreatReason = releaseReason ?? "fresh-route-threat-not-present";
            return;
        }

        _routeThreatBearingError = Metrics(
            _pose,
            _routeThreatFact.XFixed / FixedUnit,
            _routeThreatFact.YFixed / FixedUnit).BearingErrorDegrees;
        _routeThreatReason = "fresh-current-or-adjacent-route-threat-acquired";
    }

    private static bool IsCurrentOrAdjacentRouteSector(int playerSector, int actorSector)
    {
        if (playerSector == actorSector)
        {
            return true;
        }

        return playerSector switch
        {
            60 => actorSector == 56,
            56 => actorSector is 60 or 75,
            75 => actorSector is 56 or 76,
            76 => actorSector is 75 or 73,
            73 => actorSector is 76 or 72,
            72 => actorSector is 73 or 74,
            74 => actorSector is 72 or 78,
            78 => actorSector is 74 or 79 or 80,
            79 => actorSector == 78,
            80 => actorSector is 78 or 81,
            81 => actorSector is 80 or 84,
            84 => actorSector is 81 or 82,
            82 => actorSector == 84,
            _ => false
        };
    }

    private static bool IsCanonicalGatekeeper(PostComputerRoomNativeActorFact actor)
        => actor.Identity > 0
            && actor.Type == GatekeeperRuntimeType
            && actor.SectorIndex == GatekeeperSectorIndex
            && (actor.Flags & MfShootable) != 0
            && (actor.Flags & MfCountKill) != 0
            && Distance(
                actor.XFixed / FixedUnit,
                actor.YFixed / FixedUnit,
                GatekeeperSpawnX,
                GatekeeperSpawnY) <= 16d;

    private WeaponEvaluation EvaluateWeapon(BrowserE1M1ContinuationInput input)
    {
        var snapshot = input.WeaponSnapshot ?? new PostComputerRoomNativeWeaponSnapshot();
        if (!snapshot.Available
            || snapshot.Gametic != input.NativeGametic
            || snapshot.StateCount <= 0
            || snapshot.ReadyWeapon < 0
            || snapshot.ReadyWeapon >= NumberOfWeapons
            || (snapshot.PendingWeapon != NoPendingWeapon
                && (snapshot.PendingWeapon < 0 || snapshot.PendingWeapon >= NumberOfWeapons))
            || snapshot.WeaponState < 0
            || snapshot.WeaponReadyState < 0
            || snapshot.WeaponState >= snapshot.StateCount
            || snapshot.WeaponReadyState >= snapshot.StateCount
            || snapshot.Refire < 0)
        {
            return WeaponEvaluation.Unavailable("native-weapon-snapshot-invalid");
        }

        if (snapshot.Gametic <= _lastWeaponGametic)
        {
            return new WeaponEvaluation(
                true,
                false,
                false,
                snapshot.StateCount,
                snapshot.ReadyWeapon,
                snapshot.PendingWeapon,
                snapshot.WeaponState,
                snapshot.WeaponReadyState,
                snapshot.Refire,
                "native-weapon-snapshot-not-fresh");
        }

        _lastWeaponGametic = snapshot.Gametic;
        var fireOpportunity = snapshot.PendingWeapon == NoPendingWeapon
            && snapshot.WeaponState == snapshot.WeaponReadyState
            && snapshot.Refire == 0;
        var reason = snapshot.PendingWeapon != NoPendingWeapon
            ? "native-weapon-change-pending"
            : snapshot.WeaponState != snapshot.WeaponReadyState
                ? "native-weapon-cycle-not-ready"
                : snapshot.Refire != 0
                    ? "native-weapon-refire-pending"
                    : "native-weapon-fire-opportunity";
        return new WeaponEvaluation(
            true,
            true,
            fireOpportunity,
            snapshot.StateCount,
            snapshot.ReadyWeapon,
            snapshot.PendingWeapon,
            snapshot.WeaponState,
            snapshot.WeaponReadyState,
            snapshot.Refire,
            reason);
    }

    private void TrackNativeDeath(BrowserE1M1ContinuationInput input)
    {
        _vitalityAvailable = input.NativeLevelFactsAvailable
            && input.NativeGameState == 0
            && input.NativeGameEpisode == 1
            && input.NativeGameMap == 1
            && input.NativeLevelLoadSequenceAvailable
            && input.NativeLevelLoadSequence == _nativeLevelLoadSequence
            && string.Equals(
                NormalizeHash(input.WadContentSha256),
                FirstDoorNativeProximityObserver.CanonicalDoom1WadSha256,
                StringComparison.Ordinal)
            && input.NativePlayerVitalityFactsAvailable
            && input.NativeGametic >= 0;
        _vitalityFresh = _vitalityAvailable && input.NativeGametic > _lastDeathGametic;
        if (_vitalityAvailable)
        {
            _vitalityGametic = input.NativeGametic;
            _vitalityHealth = input.NativePlayerHealth;
            _vitalityPlayerState = input.NativePlayerState;
            _vitalityKillCount = input.NativePlayerKillCount;
            _deathCandidate = input.NativePlayerHealth <= 0 || input.NativePlayerState == 1;
        }

        if (!input.NativeLevelFactsAvailable
            || input.NativeGameState != 0
            || !input.NativePlayerVitalityFactsAvailable
            || input.NativeGametic < 0
            || !_vitalityAvailable
            || !_vitalityFresh)
        {
            return;
        }

        _lastDeathGametic = input.NativeGametic;
        _consecutiveDeathGametics = _deathCandidate
            ? Math.Min(int.MaxValue, _consecutiveDeathGametics + 1)
            : 0;
        if (_consecutiveDeathGametics < 3 || _nativeDeathConfirmed)
        {
            return;
        }

        _nativeDeathConfirmed = true;
        _restartRequestId = $"e1m1-continuation:{_sessionId}:{_runId}:{_runGeneration}:restart-1";
        _pendingUse = null;
    }

    private FirstDoorAudioCatalogTrace CreateAudioCatalogTrace(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        if (!string.Equals(_audioSessionId, input.SessionId, StringComparison.Ordinal)
            || !string.Equals(_audioRunId, input.RunId, StringComparison.Ordinal)
            || _audioRunGeneration != input.RunGeneration)
        {
            _audioSessionId = input.SessionId ?? string.Empty;
            _audioRunId = input.RunId ?? string.Empty;
            _audioRunGeneration = input.RunGeneration;
            _lastAudioSequence = 0;
        }

        var events = input.Audio?.Events ?? Array.Empty<BrowserNativeAudioEventInput>();
        var classified = events
            .Where(item => item is not null && item.Sequence > _lastAudioSequence)
            .OrderBy(item => item.Sequence)
            .Select(item => DoomNativeSfxCatalog.Classify(
                item.Sequence,
                item.SfxId,
                item.SfxName,
                _audioSessionId,
                _audioRunId,
                input.RunGeneration,
                controlTick))
            .ToArray();
        if (classified.Length > 0)
        {
            _lastAudioSequence = Math.Max(_lastAudioSequence, classified[^1].Sequence);
        }

        var retained = classified.Length > AudioTraceCapacity
            ? classified[^AudioTraceCapacity..]
            : classified;
        return new FirstDoorAudioCatalogTrace
        {
            SessionId = _audioSessionId,
            RunId = _audioRunId,
            RunGeneration = input.RunGeneration,
            EvaluatedAtControlTick = controlTick,
            LatestObservedSequence = _lastAudioSequence,
            Capacity = AudioTraceCapacity,
            TotalNewEventCount = classified.Length,
            RetainedEventCount = retained.Length,
            UnknownEventCount = retained.Count(item => !item.Catalogued),
            Truncated = classified.Length > AudioTraceCapacity,
            DiagnosticOnly = true,
            Events = Array.AsReadOnly(retained)
        };
    }

    private E1M1ContinuationDecision HoldForMissingPoseOrFail(
        BrowserE1M1ContinuationInput input,
        long controlTick,
        string reason)
    {
        ClearWeaponContinuation();
        if (Frames(controlTick, _routeStartedAtControlTick) >= _policy.RouteTimeoutFrames)
        {
            return Fail(input, controlTick, "e1m1-continuation-route-budget-exhausted");
        }

        if (Frames(controlTick, _legStartedAtControlTick) >= _policy.LegTimeoutFrames)
        {
            var legId = _lastTarget?.Id
                ?? _policy.Waypoints[Math.Clamp(_legIndex, 0, _policy.Waypoints.Count - 1)].Id;
            return Fail(input, controlTick, $"e1m1-continuation-leg-budget-exhausted:{legId}");
        }

        if (_combatStartedAtControlTick >= 0
            && Frames(controlTick, _combatStartedAtControlTick) >= _policy.CombatTimeoutFrames)
        {
            return Fail(input, controlTick, "e1m1-continuation-combat-budget-exhausted");
        }

        _poseMissingFrames = Math.Min(int.MaxValue, _poseMissingFrames + 1);
        if (_poseMissingFrames >= _policy.MaximumPoseMissingFrames)
        {
            return Fail(input, controlTick, "e1m1-continuation-native-pose-missing-budget-exhausted");
        }

        return Project(
            input,
            controlTick,
            _state,
            E1M1ContinuationOwnershipDisposition.Exclusive,
            NeutralAction(),
            false,
            reason);
    }

    private E1M1ContinuationDecision? EvaluateDeadlineFailure(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        if (Frames(controlTick, _legStartedAtControlTick) > _policy.LegTimeoutFrames)
        {
            var legId = _lastTarget?.Id
                ?? _policy.Waypoints[Math.Clamp(_legIndex, 0, _policy.Waypoints.Count - 1)].Id;
            return Fail(input, controlTick, $"e1m1-continuation-leg-budget-exhausted:{legId}");
        }

        return null;
    }

    private E1M1ContinuationDecision? EvaluateCombatDeadlineFailure(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        if (_combatStartedAtControlTick >= 0
            && Frames(controlTick, _combatStartedAtControlTick) >= _policy.CombatTimeoutFrames)
        {
            if (Frames(controlTick, _legStartedAtControlTick) >= _policy.LegTimeoutFrames)
            {
                var legId = _lastTarget?.Id
                    ?? _policy.Waypoints[Math.Clamp(_legIndex, 0, _policy.Waypoints.Count - 1)].Id;
                return Fail(input, controlTick, $"e1m1-continuation-leg-budget-exhausted:{legId}");
            }

            return Fail(input, controlTick, "e1m1-continuation-combat-budget-exhausted");
        }

        return null;
    }

    private E1M1ContinuationDecision Fail(
        BrowserE1M1ContinuationInput input,
        long controlTick,
        string failureCode)
    {
        _failed = true;
        _failureCode = failureCode;
        _state = E1M1ContinuationState.FailedSafeStop;
        _pendingUse = null;
        ClearWeaponContinuation();
        _weapon = WeaponEvaluation.Unavailable("native-weapon-terminal-safe-stop");
        return Project(
            input,
            controlTick,
            _state,
            E1M1ContinuationOwnershipDisposition.FailedSafeStop,
            NeutralAction(),
            false,
            failureCode);
    }

    private E1M1ContinuationDecision ProjectWaiting(
        BrowserE1M1ContinuationInput input,
        long controlTick,
        string reason)
        => new()
        {
            PolicyVersion = _policy.PolicyVersion,
            ContractVersion = input.ContractVersion,
            SessionId = input.SessionId,
            RunId = input.RunId,
            RunGeneration = input.RunGeneration,
            ControlTick = controlTick,
            ExpectedPostComputerRoomControlTick = input.ExpectedPostComputerRoomControlTick,
            NativeGametic = input.NativeGametic,
            State = E1M1ContinuationState.WaitingForPostCompletion,
            OwnershipDisposition = E1M1ContinuationOwnershipDisposition.NotAcquired,
            OwnerId = "e1m1-continuation.waiting",
            ReasonCode = reason,
            ManualUseSequence = input.ManualUseSequence,
            AudioCatalogTrace = _audioTrace,
            SemanticProjection = SemanticProjection(E1M1ContinuationState.WaitingForPostCompletion),
            ContractError = reason
        };

    private E1M1ContinuationDecision Project(
        BrowserE1M1ContinuationInput input,
        long controlTick,
        E1M1ContinuationState state,
        E1M1ContinuationOwnershipDisposition disposition,
        ActionCommand action,
        bool runRequested,
        string reason)
    {
        var navigation = CreateNavigationSnapshot(controlTick);
        var useAttemptId = _pendingUse?.UseAttemptId ?? 0;
        var entry = new E1M1ContinuationReplayEntry
        {
            ControlTick = controlTick,
            NativeGametic = input.NativeGametic,
            State = state,
            ReasonCode = reason,
            PlayerSectorIndex = _pose.PlayerSectorIndex,
            LegIndex = navigation.LegIndex,
            LegId = navigation.LegId,
            RouteFrames = navigation.RouteFrames,
            LegFrames = navigation.LegFrames,
            CombatFrames = navigation.CombatFrames,
            GatekeeperIdentity = _gatekeeperIdentity,
            GatekeeperKilled = _gatekeeperKilled,
            GatekeeperKillCountAtAcquisition = _gatekeeperKillCountAtAcquisition,
            GatekeeperConfirmedKillCount = _gatekeeperConfirmedKillCount,
            SecondDoorSlabObserved = _secondDoorSlabObserved,
            ExitDoorSlabObserved = _exitDoorSlabObserved,
            PendingUseKind = _pendingUse?.Kind ?? E1M1ContinuationUseKind.None,
            UseAttemptId = useAttemptId,
            Action = action,
            RunRequested = runRequested
        };
        AppendReplay(entry);
        if (_failed && !_failureTrace.Failed)
        {
            _failureTrace = new E1M1ContinuationFailureTrace
            {
                Failed = true,
                SessionId = _sessionId,
                RunId = _runId,
                RunGeneration = _runGeneration,
                FailureAtControlTick = controlTick,
                FailureCode = _failureCode,
                FailureSnapshot = entry,
                Replay = FreezeReplay()
            };
        }

        if (_completed && !_completionTrace.Completed)
        {
            _completionTrace = new E1M1ContinuationCompletionTrace
            {
                Completed = true,
                SessionId = _sessionId,
                RunId = _runId,
                RunGeneration = _runGeneration,
                CompletionAtControlTick = controlTick,
                CompletionCode = "e1m1-level-completion-confirmed",
                NativeLevelLoadSequence = _nativeLevelLoadSequence,
                NativeGametic = input.NativeGametic,
                PreviousGameState = 0,
                CompletedGameState = input.NativeGameState,
                GatekeeperIdentity = _gatekeeperIdentity,
                GatekeeperKilled = _gatekeeperKilled,
                GatekeeperKillCountAtAcquisition = _gatekeeperKillCountAtAcquisition,
                GatekeeperConfirmedKillCount = _gatekeeperConfirmedKillCount,
                SecondDoorTraversed = _secondDoorTraversed,
                ExitDoorTraversed = _exitDoorTraversed,
                ExitSwitchUsed = _exitSwitchAckAccepted,
                CompletionSnapshot = entry,
                Replay = FreezeReplay()
            };
        }

        var decision = new E1M1ContinuationDecision
        {
            PolicyVersion = _policy.PolicyVersion,
            ContractVersion = input.ContractVersion,
            SessionId = input.SessionId,
            RunId = input.RunId,
            RunGeneration = input.RunGeneration,
            ControlTick = controlTick,
            ExpectedPostComputerRoomControlTick = input.ExpectedPostComputerRoomControlTick,
            NativeGametic = input.NativeGametic,
            State = state,
            OwnershipDisposition = disposition,
            OwnerId = disposition switch
            {
                E1M1ContinuationOwnershipDisposition.Completed => "e1m1-continuation.completed",
                E1M1ContinuationOwnershipDisposition.FailedSafeStop => "e1m1-continuation.failed-safe-stop",
                _ => "e1m1-continuation.exclusive"
            },
            ReasonCode = reason,
            Action = action,
            RunRequested = runRequested,
            Exclusive = disposition is E1M1ContinuationOwnershipDisposition.Exclusive
                or E1M1ContinuationOwnershipDisposition.FailedSafeStop,
            Completed = disposition == E1M1ContinuationOwnershipDisposition.Completed,
            UseAttemptId = useAttemptId,
            ManualUseSequence = input.ManualUseSequence,
            NativeDeathConfirmed = _nativeDeathConfirmed,
            RestartRequested = _nativeDeathConfirmed,
            RestartRequestId = _restartRequestId,
            RestartReason = _nativeDeathConfirmed ? "native-player-death-confirmed" : "none",
            Navigation = navigation,
            DoorTrace = CreateDoorTrace(),
            GatekeeperTrace = CreateGatekeeperTrace(input),
            ThreatTrace = CreateThreatTrace(),
            WeaponTrace = CreateWeaponTrace(),
            VitalityTrace = CreateVitalityTrace(controlTick),
            SemanticProjection = SemanticProjection(state),
            AudioCatalogTrace = _audioTrace,
            FailureTrace = _failureTrace,
            CompletionTrace = _completionTrace,
            ContractError = disposition == E1M1ContinuationOwnershipDisposition.FailedSafeStop
                ? _failureCode
                : string.Empty
        };
        if (disposition is E1M1ContinuationOwnershipDisposition.Completed
            or E1M1ContinuationOwnershipDisposition.FailedSafeStop)
        {
            _terminalDecision = decision;
        }

        else if (state == E1M1ContinuationState.AwaitRestart)
        {
            _restartDecision ??= decision;
        }

        return decision;
    }

    private E1M1ContinuationDecision EchoTerminal(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        if (_terminalDecision is null)
        {
            throw new InvalidOperationException("Terminal decision snapshot is unavailable.");
        }

        return _terminalDecision with
        {
            ControlTick = controlTick,
            NativeGametic = input.NativeGametic,
            ManualUseSequence = input.ManualUseSequence,
            VitalityTrace = CreateVitalityTrace(controlTick),
            AudioCatalogTrace = _audioTrace
        };
    }

    private E1M1ContinuationDecision EchoRestart(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        if (_restartDecision is null)
        {
            throw new InvalidOperationException("Restart decision snapshot is unavailable.");
        }

        return _restartDecision with
        {
            ControlTick = controlTick,
            NativeGametic = input.NativeGametic,
            ManualUseSequence = input.ManualUseSequence,
            VitalityTrace = CreateVitalityTrace(controlTick),
            AudioCatalogTrace = _audioTrace
        };
    }

    private E1M1ContinuationDecision PromoteFailedTerminalToRestart(
        BrowserE1M1ContinuationInput input,
        long controlTick)
    {
        if (_terminalDecision is null)
        {
            throw new InvalidOperationException("Failed terminal snapshot is unavailable.");
        }

        _state = E1M1ContinuationState.AwaitRestart;
        _restartDecision = _terminalDecision with
        {
            ControlTick = controlTick,
            NativeGametic = input.NativeGametic,
            State = E1M1ContinuationState.AwaitRestart,
            OwnershipDisposition = E1M1ContinuationOwnershipDisposition.Exclusive,
            OwnerId = "e1m1-continuation.exclusive",
            ReasonCode = "native-player-death-restart-requested-after-failed-safe-stop",
            Action = NeutralAction(),
            RunRequested = false,
            Exclusive = true,
            Completed = false,
            ManualUseSequence = input.ManualUseSequence,
            NativeDeathConfirmed = true,
            RestartRequested = true,
            RestartRequestId = _restartRequestId,
            RestartReason = "native-player-death-confirmed",
            VitalityTrace = CreateVitalityTrace(controlTick),
            AudioCatalogTrace = _audioTrace,
            SemanticProjection = SemanticProjection(E1M1ContinuationState.AwaitRestart),
            ContractError = string.Empty
        };
        return _restartDecision;
    }

    private E1M1ContinuationNavigationSnapshot CreateNavigationSnapshot(long controlTick)
    {
        // State transitions can advance the leg without issuing a navigation action.
        var target = _policy.Waypoints[Math.Clamp(_legIndex, 0, _policy.Waypoints.Count - 1)];
        var metrics = _pose.Available
            ? Metrics(_pose, target.X, target.Y)
            : new NavigationMetrics(0, 0, 0);
        var routeFrames = Frames(controlTick, _routeStartedAtControlTick);
        var legFrames = Frames(controlTick, _legStartedAtControlTick);
        var combatFrames = _combatStartedAtControlTick < 0
            ? 0
            : Frames(controlTick, _combatStartedAtControlTick);
        return new E1M1ContinuationNavigationSnapshot
        {
            PolicyVersion = _policy.PolicyVersion,
            Active = _active && !_completed && !_failed && !_nativeDeathConfirmed,
            LegIndex = _legIndex,
            LegId = target.Id,
            TargetX = target.X,
            TargetY = target.Y,
            AllowedSectors = target.AllowedSectors,
            Pose = _pose,
            TargetDistance = metrics.Distance,
            TargetBearingDegrees = metrics.BearingDegrees,
            BearingErrorDegrees = metrics.BearingErrorDegrees,
            RouteFrames = routeFrames,
            RouteTimeoutFrames = _policy.RouteTimeoutFrames,
            RouteRemainingFrames = Math.Max(0, _policy.RouteTimeoutFrames - routeFrames),
            LegFrames = legFrames,
            LegTimeoutFrames = _policy.LegTimeoutFrames,
            LegRemainingFrames = Math.Max(0, _policy.LegTimeoutFrames - legFrames),
            CombatFrames = combatFrames,
            CombatTimeoutFrames = _policy.CombatTimeoutFrames,
            CombatRemainingFrames = Math.Max(0, _policy.CombatTimeoutFrames - combatFrames),
            CombatOwnerKind = _combatOwnerKind,
            CombatOwnerIdentity = _combatOwnerIdentity,
            PoseMissingFrames = _poseMissingFrames,
            FailureCode = _failureCode
        };
    }

    private E1M1ContinuationDoorTrace CreateDoorTrace()
        => new()
        {
            PendingUseKind = _pendingUse?.Kind ?? E1M1ContinuationUseKind.None,
            PendingUseAttemptId = _pendingUse?.UseAttemptId ?? 0,
            PendingUseDecisionControlTick = _pendingUse?.DecisionControlTick ?? -1,
            AppliedActionAckReason = _lastAckReason,
            SecondDoorAckAccepted = _secondDoorAckAccepted,
            SecondDoorSlabObserved = _secondDoorSlabObserved,
            SecondDoorTraversed = _secondDoorTraversed,
            ExitDoorAckAccepted = _exitDoorAckAccepted,
            ExitDoorSlabObserved = _exitDoorSlabObserved,
            ExitDoorTraversed = _exitDoorTraversed,
            ExitSwitchAckAccepted = _exitSwitchAckAccepted,
            LevelTransitionConfirmed = _levelTransitionConfirmed
        };

    private E1M1ContinuationGatekeeperTrace CreateGatekeeperTrace(
        BrowserE1M1ContinuationInput input)
    {
        var currentKillCount = input.NativePlayerVitalityFactsAvailable
            ? input.NativePlayerKillCount
            : -1;
        if (_gatekeeperKilled && _gatekeeperConfirmedKillCount >= 0)
        {
            currentKillCount = _gatekeeperConfirmedKillCount;
        }
        return new E1M1ContinuationGatekeeperTrace
        {
            SnapshotAccepted = _gatekeeperSnapshotAccepted,
            SnapshotFresh = _gatekeeperSnapshotFresh,
            AcquiredAlive = _gatekeeperAcquiredAlive,
            Identity = _gatekeeperIdentity,
            Health = _gatekeeperHealth,
            CurrentSectorIndex = _gatekeeperFact?.SectorIndex ?? -1,
            TopologyAccepted = _gatekeeperTopologyAccepted,
            TopologyReason = _gatekeeperTopologyReason,
            LineOfSight = _gatekeeperLineOfSight,
            BearingErrorDegrees = _gatekeeperBearingError,
            KillCountAtAcquisition = _gatekeeperKillCountAtAcquisition,
            CurrentKillCount = currentKillCount,
            KillCountAdvanced = _gatekeeperKilled
                || (_gatekeeperKillCountAtAcquisition >= 0
                    && currentKillCount > _gatekeeperKillCountAtAcquisition),
            Killed = _gatekeeperKilled,
            Reason = _gatekeeperReason
        };
    }

    private E1M1ContinuationThreatTrace CreateThreatTrace()
        => new()
        {
            SnapshotAccepted = _gatekeeperSnapshotAccepted,
            SnapshotFresh = _gatekeeperSnapshotFresh,
            ThreatMatched = _routeThreatFact is not null,
            Identity = _routeThreatIdentity,
            RuntimeType = _routeThreatFact?.Type ?? -1,
            SectorIndex = _routeThreatFact?.SectorIndex ?? -1,
            Health = _routeThreatFact?.Health ?? 0,
            LineOfSight = _routeThreatFact?.LineOfSight ?? false,
            BearingErrorDegrees = _routeThreatBearingError,
            StationaryFireAuthorized = _routeThreatStationaryFireAuthorized,
            Reason = _routeThreatReason
        };

    private E1M1ContinuationWeaponTrace CreateWeaponTrace()
        => new()
        {
            SnapshotAccepted = _weapon.Accepted,
            SnapshotFresh = _weapon.Fresh,
            StateCount = _weapon.StateCount,
            ReadyWeapon = _weapon.ReadyWeapon,
            PendingWeapon = _weapon.PendingWeapon,
            WeaponState = _weapon.WeaponState,
            WeaponReadyState = _weapon.WeaponReadyState,
            Refire = _weapon.Refire,
            FireOpportunity = _weapon.FireOpportunity,
            ContinuationArmed = _weaponContinuationArmed,
            ContinuationOwnerKind = _weaponContinuationOwnerKind,
            ContinuationTargetIdentity = _weaponContinuationTargetIdentity,
            ContinuationReadyWeapon = _weaponContinuationReadyWeapon,
            ContinuationAuthorizedAtControlTick = _weaponContinuationAuthorizedAtControlTick,
            AttackContinuation = _weaponAttackContinuation,
            Reason = _weapon.Reason
        };

    private E1M1ContinuationVitalityTrace CreateVitalityTrace(long controlTick)
        => new()
        {
            SessionId = _sessionId,
            RunId = _runId,
            RunGeneration = _runGeneration,
            EvaluatedAtControlTick = controlTick,
            Available = _vitalityAvailable,
            Fresh = _vitalityFresh,
            NativeGametic = _vitalityGametic,
            PlayerHealth = _vitalityHealth,
            PlayerState = _vitalityPlayerState,
            PlayerKillCount = _vitalityKillCount,
            Provenance = _vitalityAvailable
                ? "native-e1m1-continuation-vitality"
                : "native-e1m1-continuation-vitality-unavailable",
            DeathCandidate = _deathCandidate,
            ConsecutiveDeathGametics = _consecutiveDeathGametics,
            NativeDeathConfirmed = _nativeDeathConfirmed,
            RestartRequested = _nativeDeathConfirmed,
            RestartRequestId = _restartRequestId,
            RestartReason = _nativeDeathConfirmed ? "native-player-death-confirmed" : "none"
        };

    private E1M1ContinuationSemanticProjection SemanticProjection(E1M1ContinuationState state)
    {
        var (telos, objective) = state switch
        {
            E1M1ContinuationState.WaitingForPostCompletion
                => ("ZigzagRoute", "await-post-completion-proof"),
            E1M1ContinuationState.NavigateZigzag
                => ("ZigzagRoute", "navigate-zigzag"),
            E1M1ContinuationState.ApproachSecondDoor
                or E1M1ContinuationState.PreUseStopSecondDoor
                or E1M1ContinuationState.StationarySecondDoorUse
                or E1M1ContinuationState.AwaitSecondDoorAck
                or E1M1ContinuationState.TraverseSecondDoor
                => ("SecondDoor", "open-and-traverse-second-door"),
            E1M1ContinuationState.InterceptRouteThreat
                => ("RouteThreat", "intercept-captured-route-enemy"),
            E1M1ContinuationState.NavigateGatekeeper
                or E1M1ContinuationState.EngageGatekeeper
                => ("Gatekeeper", "defeat-sector-74-gatekeeper"),
            E1M1ContinuationState.NavigateExitDoor
                or E1M1ContinuationState.PreUseStopExitDoor
                or E1M1ContinuationState.StationaryExitDoorUse
                or E1M1ContinuationState.AwaitExitDoorAck
                or E1M1ContinuationState.EnterExitRoom
                => ("ExitDoor", "open-exit-door-and-enter-exit-room"),
            E1M1ContinuationState.ApproachExitSwitch
                or E1M1ContinuationState.PreUseStopExitSwitch
                or E1M1ContinuationState.StationaryExitUse
                or E1M1ContinuationState.AwaitExitAck
                => ("ExitSwitch", "activate-e1m1-exit-switch"),
            E1M1ContinuationState.AwaitLevelCompletion
                => ("E1M1Completion", "confirm-native-intermission-transition"),
            E1M1ContinuationState.Complete
                => ("E1M1Complete", "level-completed"),
            E1M1ContinuationState.AwaitRestart
                => ("Restart", "restart-after-native-death"),
            E1M1ContinuationState.FailedSafeStop
                => ("FailedSafeStop", "preserve-safe-neutral-control"),
            _ => ("ZigzagRoute", "navigate-zigzag")
        };
        return new E1M1ContinuationSemanticProjection
        {
            Telos = telos,
            Objective = objective,
            DoorOpenedCount = 1 + (_secondDoorTraversed ? 1 : 0) + (_exitDoorTraversed ? 1 : 0),
            SecondDoorTraversed = _secondDoorTraversed,
            GatekeeperKilled = _gatekeeperKilled,
            ExitDoorTraversed = _exitDoorTraversed,
            ExitSwitchUsed = _exitSwitchAckAccepted,
            LevelCompleted = _levelTransitionConfirmed
        };
    }

    private void AppendReplay(E1M1ContinuationReplayEntry entry)
    {
        _replay.Add(entry);
        if (_replay.Count > E1M1ContinuationCompletionTrace.ReplayCapacity)
        {
            _replay.RemoveAt(0);
        }
    }

    private IReadOnlyList<E1M1ContinuationReplayEntry> FreezeReplay()
        => Array.AsReadOnly(_replay.ToArray());

    private bool ScopeChanged(BrowserE1M1ContinuationInput input)
        => !string.Equals(_sessionId, input.SessionId, StringComparison.Ordinal)
            || !string.Equals(_runId, input.RunId, StringComparison.Ordinal)
            || _runGeneration != input.RunGeneration;

    private ActionCommand TurnAction(double bearingErrorDegrees)
    {
        var magnitude = Math.Clamp(
            Math.Abs(_policy.DefaultTurnYaw),
            1,
            Math.Abs(_policy.MaximumTurnYaw));
        return new ActionCommand(
            false,
            false,
            false,
            false,
            bearingErrorDegrees < 0d ? -magnitude : magnitude,
            false,
            false);
    }

    private static ActionCommand ForwardAction()
        => new(true, false, false, false, 0, false, false);

    private static ActionCommand UseAction()
        => new(false, false, false, false, 0, true, false);

    private static ActionCommand AttackAction()
        => new(false, false, false, false, 0, false, true);

    private static ActionCommand NeutralAction()
        => new(false, false, false, false, 0, false, false);

    private static NavigationMetrics Metrics(
        E1M1ContinuationPoseObservation pose,
        double targetX,
        double targetY)
    {
        var dx = targetX - pose.PlayerX;
        var dy = targetY - pose.PlayerY;
        var distance = Math.Sqrt((dx * dx) + (dy * dy));
        var bearing = NormalizeDegrees(Math.Atan2(dy, dx) * 180d / Math.PI);
        var error = NormalizeSignedDegrees(pose.HeadingDegrees - bearing);
        return new NavigationMetrics(distance, bearing, error);
    }

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

    private static string NormalizeHash(string? value)
        => (value ?? string.Empty).Trim().ToLowerInvariant();

    private void EnsureCombatOwner(string kind, long identity, long controlTick)
    {
        if (identity <= 0)
        {
            return;
        }

        if (!string.Equals(_combatOwnerKind, kind, StringComparison.Ordinal)
            || _combatOwnerIdentity != identity)
        {
            ClearWeaponContinuation();
            _combatOwnerKind = kind;
            _combatOwnerIdentity = identity;
            _combatStartedAtControlTick = controlTick;
        }
    }

    private void ClearCombatOwner(string kind, long identity)
    {
        if (!string.Equals(_combatOwnerKind, kind, StringComparison.Ordinal)
            || _combatOwnerIdentity != identity)
        {
            return;
        }

        ClearWeaponContinuationIfOwner(kind, identity);
        _combatOwnerKind = "none";
        _combatOwnerIdentity = 0;
        _combatStartedAtControlTick = -1;
    }

    private void ArmWeaponContinuation(string ownerKind, long identity, long controlTick)
    {
        _weaponContinuationArmed = true;
        _weaponContinuationOwnerKind = ownerKind;
        _weaponContinuationTargetIdentity = identity;
        _weaponContinuationReadyWeapon = _weapon.ReadyWeapon;
        _weaponContinuationAuthorizedAtControlTick = controlTick;
        _weaponAttackContinuation = false;
    }

    private void ClearWeaponContinuation()
    {
        _weaponContinuationArmed = false;
        _weaponContinuationOwnerKind = "none";
        _weaponContinuationTargetIdentity = 0;
        _weaponContinuationReadyWeapon = -1;
        _weaponContinuationAuthorizedAtControlTick = -1;
        _weaponAttackContinuation = false;
    }

    private void ClearWeaponContinuationIfOwner(string ownerKind, long identity)
    {
        if (!_weaponContinuationArmed
            || !string.Equals(_weaponContinuationOwnerKind, ownerKind, StringComparison.Ordinal)
            || _weaponContinuationTargetIdentity != identity)
        {
            return;
        }

        ClearWeaponContinuation();
    }

    private bool WeaponContinuationContextValid(
        string ownerKind,
        long identity,
        bool targetAlive,
        bool lineOfSight,
        bool topologyAccepted,
        bool aligned)
        => _weaponContinuationArmed
            && string.Equals(_weaponContinuationOwnerKind, ownerKind, StringComparison.Ordinal)
            && _weaponContinuationTargetIdentity == identity
            && string.Equals(_combatOwnerKind, ownerKind, StringComparison.Ordinal)
            && _combatOwnerIdentity == identity
            && targetAlive
            && lineOfSight
            && topologyAccepted
            && aligned
            && _pose.Stationary
            && _weapon.Accepted
            && _weapon.Fresh
            && _weapon.PendingWeapon == NoPendingWeapon
            && _weaponContinuationReadyWeapon == _weapon.ReadyWeapon
            && !_weapon.FireOpportunity
            && _weapon.WeaponState != _weapon.WeaponReadyState
            && !_nativeDeathConfirmed;

    private static void ValidatePolicy(E1M1ContinuationPolicy policy)
    {
        var canonical = E1M1ContinuationPolicy.CanonicalWaypoints;
        var geometryMatches = policy.Waypoints.Count == canonical.Count
            && policy.Waypoints.Zip(canonical).All(pair =>
                pair.First.Index == pair.Second.Index
                && string.Equals(pair.First.Id, pair.Second.Id, StringComparison.Ordinal)
                && pair.First.X == pair.Second.X
                && pair.First.Y == pair.Second.Y
                && pair.First.AllowedSectors.SequenceEqual(pair.Second.AllowedSectors));
        if (policy.WaypointCompletionRadius != 24d
            || policy.AlignmentToleranceDegrees != 5d
            || policy.DefaultTurnYaw != 6
            || policy.MaximumTurnYaw != 12
            || policy.RouteTimeoutFrames != E1M1ContinuationPolicy.CanonicalRouteTimeoutFrames
            || policy.LegTimeoutFrames != 180
            || policy.CombatTimeoutFrames != 180
            || policy.MaximumPoseMissingFrames != 30
            || policy.MaximumStationaryMomentum != 0.25d
            || policy.UseMaximumDistance != 56d
            || !geometryMatches)
        {
            throw new ArgumentException(
                "E1M1 continuation policy must match the adopted canonical contract.",
                nameof(policy));
        }
    }

    private static int Frames(long current, long started)
        => current <= started ? 0 : (int)Math.Min(int.MaxValue, current - started);

    private sealed record PendingUseAttempt(
        string SessionId,
        string RunId,
        long RunGeneration,
        E1M1ContinuationUseKind Kind,
        long UseAttemptId,
        long DecisionControlTick,
        long ManualUseSequence);

    private sealed record WeaponEvaluation(
        bool Accepted,
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
        internal static WeaponEvaluation Unavailable(string reason)
            => new(false, false, false, -1, -1, -1, -1, -1, -1, reason);
    }

    private readonly record struct NavigationMetrics(
        double Distance,
        double BearingDegrees,
        double BearingErrorDegrees);
}
