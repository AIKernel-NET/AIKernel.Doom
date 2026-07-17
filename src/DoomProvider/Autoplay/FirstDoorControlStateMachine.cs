namespace AIKernel.Doom.Provider.Autoplay;

internal enum FirstDoorOwnershipUnit
{
    OpeningTransit,
    FirstDoorApproach,
    DoorFrontAlign,
    StationaryUse,
    UseOutcome,
    PostOpenEntryShove,
    ComputerRoomEntryConfirmation
}

internal enum FirstDoorOwnershipDisposition
{
    NotAcquired,
    Exclusive,
    HandOff,
    Completed,
    FailedSafeStop
}

internal enum FirstDoorControlState
{
    OpeningTransit,
    OpeningNavigate,
    Approach,
    FailedUseReapproach,
    Align,
    Contact,
    PreUseStop,
    StationaryUse,
    AwaitOutcome,
    PostOpenShove,
    AwaitComputerRoom,
    Complete,
    FailedSafeStop
}

internal enum FirstDoorEvidenceProvenance
{
    None,
    NativeEngine,
    TrustedMilestone,
    ClassifiedNativeAudio,
    VisualInference
}

internal enum FirstDoorEvidenceTruth
{
    Unknown,
    No,
    Yes
}

internal enum FirstDoorAcquisitionStatus
{
    Waiting,
    Ready,
    Expired
}

internal enum FirstDoorComputerRoomBlockCode
{
    Unavailable,
    NotInConfirmationPhase,
    TrustedOpenMissing,
    RawObservationUnavailable,
    DuplicateRawFrame,
    FirstDoorStillVisible,
    FirstDoorResidualTooStrong,
    ComputerRoomTopologyMismatch,
    PreOpenVisualContentUnavailable,
    PreOpenVisualContentUnchanged,
    RoomCuesBelowThreshold,
    PositiveWindowPending,
    None,
    RawObservationMissingBudgetExhausted,
    ConfirmationBudgetExhausted,
    ControllerTerminated
}

internal enum FirstDoorOpenConfirmationSource
{
    None,
    NativeDoorCount,
    TrustedMilestone,
    TrustedAudio
}

internal sealed record FirstDoorSemanticDelta
{
    public bool HasChanges { get; init; }

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long ControlTick { get; init; }

    public int DoorOpenedCount { get; init; }

    public bool FirstDoorOpened { get; init; }

    public bool ComputerRoomEntered { get; init; }

    public FirstDoorOpenConfirmationSource Source { get; init; }
}

internal sealed record FirstDoorComputerRoomObservation
{
    public bool Available { get; init; }

    public bool Fresh { get; init; }

    public FirstDoorEvidenceTruth Truth { get; init; }

    public string Reason { get; init; } = "computer-room-observation-unavailable";

    public string ObservationHash { get; init; } = string.Empty;

    public string VisualContentHash { get; init; } = string.Empty;

    public FirstDoorEvidenceTruth FirstDoorIdentityTruth { get; init; }

    public double FirstDoorCandidateScore { get; init; }

    public double RoomScore { get; init; }

    public double RawRoomScore { get; init; }

    public double BlueScore { get; init; }

    public double RawBlueScore { get; init; }

    public double StructuredBlueScore { get; init; }

    public int StructuredBlueCellCount { get; init; }

    public int StructuredBlueRowCount { get; init; }

    public int StructuredBlueColumnCount { get; init; }

    public bool StructuredBlueApplied { get; init; }

    public double RedLightScore { get; init; }

    public double DarkPanelScore { get; init; }

    public double PanelScore { get; init; }

    public double GameplayLuma { get; init; }

    public FirstDoorRawReplayObservation CurrentReplayObservation { get; init; } = new();
}

internal sealed record FirstDoorComputerRoomConfirmationTrace
{
    public int TraceVersion { get; init; } = 2;

    public bool Available { get; init; }

    public long EvaluatedAtControlTick { get; init; }

    public FirstDoorEvidenceTruth Truth { get; init; }

    public string Reason { get; init; } = "computer-room-observation-unavailable";

    public bool FreshObservation { get; init; }

    public string ObservationHash { get; init; } = string.Empty;

    public string VisualContentHash { get; init; } = string.Empty;

    public string PreOpenVisualContentHash { get; init; } = string.Empty;

    public bool VisualContentSeparatedFromPreOpen { get; init; }

    public FirstDoorEvidenceTruth FirstDoorIdentityTruth { get; init; }

    public double FirstDoorCandidateScore { get; init; }

    public double MaximumFirstDoorResidualScore { get; init; }

    public double RoomScore { get; init; }

    public double RawRoomScore { get; init; }

    public double MinimumRoomScore { get; init; }

    public double BlueScore { get; init; }

    public double RawBlueScore { get; init; }

    public double StructuredBlueScore { get; init; }

    public int StructuredBlueCellCount { get; init; }

    public int StructuredBlueRowCount { get; init; }

    public int StructuredBlueColumnCount { get; init; }

    public bool StructuredBlueApplied { get; init; }

    public double RedLightScore { get; init; }

    public double DarkPanelScore { get; init; }

    public double PanelScore { get; init; }

    public double GameplayLuma { get; init; }

    public int StableFrames { get; init; }

    public int RequiredStableFrames { get; init; }

    public int ConsecutiveRawMissingFrames { get; init; }

    public int MaximumRawMissingFrames { get; init; }

    public int ConfirmationFrames { get; init; }

    public int ConfirmationTimeoutFrames { get; init; }

    public int ConfirmationRemainingFrames { get; init; }

    public FirstDoorComputerRoomBlockCode BlockCode { get; init; } = FirstDoorComputerRoomBlockCode.Unavailable;

    public bool Ready { get; init; }

    public FirstDoorRawReplayObservation CurrentReplayObservation { get; init; } = new();

    public IReadOnlyList<FirstDoorRawReplayObservation> AcceptedPositiveReplayObservations { get; init; }
        = Array.Empty<FirstDoorRawReplayObservation>();
}

internal sealed record FirstDoorTransitionReplaySnapshot
{
    public int SnapshotVersion { get; init; } = 4;

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long ControlTick { get; init; }

    public string EventKind { get; init; } = string.Empty;

    public FirstDoorControlState PreviousState { get; init; }

    public FirstDoorControlState State { get; init; }

    public string ReasonCode { get; init; } = string.Empty;

    public ActionCommand Action { get; init; } = NeutralAction();

    public bool RunRequested { get; init; }

    public FirstDoorOwnershipUnit OwnershipUnit { get; init; }

    public FirstDoorOwnershipDisposition OwnershipDisposition { get; init; }

    public string OwnerId { get; init; } = string.Empty;

    public FirstDoorEvidenceTruth DoorIdentityTruth { get; init; }

    public FirstDoorComputerRoomBlockCode ComputerRoomBlockCode { get; init; }

    public int ComputerRoomStableFrames { get; init; }

    public FirstDoorProximityObservation Proximity { get; init; } = new();

    public FirstDoorOpeningNavigationSnapshot OpeningNavigation { get; init; } = new();

    public FirstDoorAppliedUseAckSnapshot AcceptedUseAck { get; init; } = new();

    public string ObservationHash { get; init; } = string.Empty;

    public string VisualContentHash { get; init; } = string.Empty;

    public FirstDoorRawReplayObservation ReplayObservation { get; init; } = new();

    private static ActionCommand NeutralAction()
        => new(false, false, false, false, 0, false, false);
}

internal sealed record FirstDoorAppliedUseAckSnapshot
{
    public int SnapshotVersion { get; init; } = 1;

    public bool Available { get; init; }

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long AcceptedAtControlTick { get; init; }

    public long DecisionControlTick { get; init; }

    public long UseAttemptId { get; init; }

    public string ActionMode { get; init; } = string.Empty;

    public string HostPath { get; init; } = string.Empty;

    public long QueuedUseInputEventSequence { get; init; }

    public long PumpedUseInputEventSequence { get; init; }

    public bool UsePumped { get; init; }

    public long ManualUseSequenceAtDecision { get; init; }
}

internal sealed record FirstDoorOpenEvidence
{
    public long RunGeneration { get; init; }

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long EventControlTick { get; init; } = -1;

    public int EventPrediction { get; init; } = -1;

    public long UseAttemptId { get; init; }

    public int DoorOpenedCount { get; init; }

    public FirstDoorEvidenceProvenance DoorOpenedCountProvenance { get; init; }

    public bool MilestoneConfirmed { get; init; }

    public FirstDoorEvidenceProvenance MilestoneProvenance { get; init; }

    public bool AudioConfirmed { get; init; }

    public string AudioEventId { get; init; } = string.Empty;

    public int AudioAgeFrames { get; init; } = int.MaxValue;

    public FirstDoorEvidenceProvenance AudioProvenance { get; init; }
}

internal sealed record FirstDoorFailedUseEvidence
{
    public long RunGeneration { get; init; }

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long EventControlTick { get; init; } = -1;

    public int EventPrediction { get; init; } = -1;

    public bool Confirmed { get; init; }

    public string AudioEventId { get; init; } = string.Empty;

    public int AudioAgeFrames { get; init; } = int.MaxValue;

    public long UseAttemptId { get; init; }

    public FirstDoorEvidenceProvenance Provenance { get; init; }
}

internal sealed record FirstDoorControlInput
{
    public int ContractVersion { get; init; }

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long ControlTick { get; init; }

    public int Prediction { get; init; }

    public long ManualUseSequence { get; init; }

    public bool PredictionAnomaly { get; init; }

    public string AnomalyCode { get; init; } = string.Empty;

    public bool ResetRequested { get; init; }

    public string ResetOperationId { get; init; } = string.Empty;

    public string LifecycleEvent { get; init; } = "none";

    public string LifecycleState { get; init; } = "unknown";

    public string ModelState { get; init; } = "unknown";

    public bool ControlReady { get; init; }

    public string ContractError { get; init; } = string.Empty;

    public bool LifecycleFaulted { get; init; }

    public bool NativeLevelFactsAvailable { get; init; }

    public bool NativeLevelLoadSequenceAvailable { get; init; }

    public long NativeLevelLoadSequence { get; init; } = -1;

    public long NativeLevelTime { get; init; } = -1;

    public long NativeGametic { get; init; } = -1;

    public long NativeLevelStartTic { get; init; } = -1;

    public int NativeGameState { get; init; } = -1;

    public int NativeGameEpisode { get; init; } = -1;

    public int NativeGameMap { get; init; } = -1;

    public FirstDoorAcquisitionStatus AcquisitionStatus { get; init; }

    public string AcquisitionFailureCode { get; init; } = string.Empty;

    public float DoorIdentityConfidence { get; init; }

    public FirstDoorEvidenceTruth DoorIdentityTruth { get; init; }

    public string DoorIdentityReason { get; init; } = "identity-unknown";

    public bool CurrentDoorIdentityReadyForUse { get; init; }

    public bool RawObservationFresh { get; init; }

    public FirstDoorProximityObservation Proximity { get; init; } = new();

    public FirstDoorOpeningNavigationSnapshot OpeningNavigation { get; init; } = new();

    public bool AlignmentAvailable { get; init; }

    public float AlignmentErrorDegrees { get; init; }

    public int RecommendedYaw { get; init; }

    public FirstDoorComputerRoomObservation ComputerRoomObservation { get; init; } = new();

    public FirstDoorOpenEvidence OpenEvidence { get; init; } = new();

    public FirstDoorFailedUseEvidence FailedUseEvidence { get; init; } = new();

    public string EvidenceObservationCode { get; init; } = "none";

    public bool AppliedActionAckValid { get; init; }

    public string AppliedActionAckCode { get; init; } = "not-expected";

    public bool UseAckWindowActive { get; init; }

    public long AcknowledgedUseDecisionControlTick { get; init; }

    public long AcknowledgedUseAttemptId { get; init; }

    public long AcknowledgedManualUseSequence { get; init; }

    public FirstDoorAppliedUseAckSnapshot AcceptedUseAck { get; init; } = new();

    public bool AmbiguousManualUseOverlap { get; init; }

    public string UseOutcomeRejectionCode { get; init; } = string.Empty;
}

internal sealed record FirstDoorControlPolicy
{
    public string PolicyVersion { get; init; } = "first-door-policy-v6";

    public int AcquisitionTimeoutFrames { get; init; } = 600;

    public int AcquisitionRequiredRouteFrames { get; init; } = 3;

    public int AcquisitionIdentityWindowFrames { get; init; } = 24;

    public int AcquisitionRequiredIdentityFrames { get; init; } = 2;

    public int AcquisitionMaximumUnknownGapFrames { get; init; } = 8;

    public int AcquisitionMaximumRawMissingFrames { get; init; } = 90;

    public int AcquisitionMaximumProximityMissingFrames { get; init; } = 90;

    public int ApproachTimeoutFrames { get; init; } = 180;

    public int ApproachMaximumProximityMissingFrames { get; init; } = 8;

    public double AcquisitionMaximumDistance { get; init; } = 256d;

    public double ContactApproachMaximumDistance { get; init; } = 96d;

    // Doom USERANGE is 64 map units. Keep an explicit eight-unit safety margin.
    public double UseMaximumDistance { get; init; } = 56d;

    public int FailedUseReapproachFrames { get; init; } = 6;

    public int AlignMinimumFrames { get; init; } = 2;

    public int AlignTimeoutFrames { get; init; } = 18;

    public int ContactFrames { get; init; } = 4;

    public int PreUseStopFrames { get; init; } = 2;

    public int PreUseStopTimeoutFrames { get; init; } = 18;

    public int StationaryUseFrames { get; init; } = 1;

    public int AwaitOutcomeFrames { get; init; } = 18;

    public int PostOpenEntryShoveFrames { get; init; } = 8;

    public int ComputerRoomRequiredStableFrames { get; init; } = 3;

    public int ComputerRoomConfirmationTimeoutFrames { get; init; } = 600;

    public int ComputerRoomMaximumRawMissingFrames { get; init; } = 90;

    // Gate-D provisional calibration from captured dev969/dev1016 raw frames.
    public double ComputerRoomMinimumScore { get; init; } = 0.18d;

    public double ComputerRoomMaximumFirstDoorResidualScore { get; init; } = 0.42d;

    public double ComputerRoomMinimumBlueScore { get; init; } = 0.14d;

    public double ComputerRoomMinimumRedLightScore { get; init; } = 0.08d;

    public double ComputerRoomMinimumDarkPanelScore { get; init; } = 0.30d;

    public double ComputerRoomMinimumPanelScore { get; init; } = 0.16d;

    public double ComputerRoomMaximumGameplayLuma { get; init; } = 108d;

    public int OpenAudioMaxAgeFrames { get; init; } = 24;

    public int FailedUseAudioMaxAgeFrames { get; init; } = 24;

    public int MaxUseRetries { get; init; } = 4;

    public int MaxRecoveryAttempts { get; init; } = 6;

    public int MaximumAlignYaw { get; init; } = 12;

    public int DefaultAlignYaw { get; init; } = 6;

    public float MinimumDoorIdentityConfidence { get; init; } = 0.30f;

    public float AlignmentToleranceDegrees { get; init; } = 4f;

    public int SignificantTransitionReplayCapacity { get; init; } = 16;

}

internal sealed record FirstDoorControlDecision
{
    public string ImplementationVersion { get; init; } = string.Empty;

    public string PolicyVersion { get; init; } = string.Empty;

    public int ContractVersion { get; init; }

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public FirstDoorControlState PreviousState { get; init; }

    public FirstDoorControlState NextState { get; init; }

    public FirstDoorControlState State { get; init; }

    public bool Transitioned { get; init; }

    public FirstDoorOwnershipUnit OwnershipUnit { get; init; }

    public FirstDoorOwnershipDisposition OwnershipDisposition { get; init; }

    public ActionCommand Action { get; init; } = NeutralAction();

    public bool RunRequested { get; init; }

    public bool Exclusive { get; init; }

    public bool HandOffToPostDoor { get; init; }

    public bool Completed { get; init; }

    public bool OpenConfirmed { get; init; }

    public FirstDoorOpenConfirmationSource OpenConfirmationSource { get; init; }

    public string AcceptedOpenEvidenceId { get; init; } = string.Empty;

    public FirstDoorOpenConfirmationSource AcceptedOpenEvidenceSource { get; init; }

    public FirstDoorSemanticDelta SemanticDelta { get; init; } = new();

    public bool FailedUseEvidenceAccepted { get; init; }

    public string FailedUseAudioEventId { get; init; } = string.Empty;

    public string AcceptedFailedUseEvidenceId { get; init; } = string.Empty;

    public FirstDoorEvidenceProvenance AcceptedFailedUseEvidenceSource { get; init; }

    public string EvidenceObservationCode { get; init; } = "none";

    public bool AppliedActionAckValid { get; init; }

    public string AppliedActionAckCode { get; init; } = "not-expected";

    public bool UseAckWindowActive { get; init; }

    public long AcknowledgedUseDecisionControlTick { get; init; }

    public long AcknowledgedUseAttemptId { get; init; }

    public long AcknowledgedManualUseSequence { get; init; }

    public string UseOutcomeRejectionCode { get; init; } = string.Empty;

    public string OwnerId { get; init; } = "first-door.opening-transit";

    public string ReasonCode { get; init; } = "opening-transit";

    public long RunGeneration { get; init; }

    public long ControlTick { get; init; }

    public long StateEnteredAtControlTick { get; init; }

    public int Prediction { get; init; }

    public long ManualUseSequence { get; init; }

    public bool PredictionAnomaly { get; init; }

    public string AnomalyCode { get; init; } = string.Empty;

    public string LifecycleState { get; init; } = "unknown";

    public string ModelState { get; init; } = "unknown";

    public string ContractError { get; init; } = string.Empty;

    public string ResetOperationId { get; init; } = string.Empty;

    public string LifecycleEvent { get; init; } = "none";

    public bool RunBoundaryApplied { get; init; }

    public FirstDoorEvidenceTruth DoorIdentityTruth { get; init; }

    public string DoorIdentityReason { get; init; } = "identity-unknown";

    public float DoorIdentityConfidence { get; init; }

    public FirstDoorAcquisitionTrace AcquisitionTrace { get; init; } = new();

    public FirstDoorAudioCatalogTrace AudioCatalogTrace { get; init; } = new();

    public FirstDoorComputerRoomConfirmationTrace ComputerRoomTrace { get; init; } = new();

    public FirstDoorProximityObservation Proximity { get; init; } = new();

    public FirstDoorPlayerVitalityTrace VitalityTrace { get; init; } = new();

    public bool NativeDeathConfirmed { get; init; }

    public bool RestartRequested { get; init; }

    public string RestartRequestId { get; init; } = string.Empty;

    public string RestartReason { get; init; } = "none";

    public FirstDoorOpeningNavigationSnapshot OpeningNavigation { get; init; } = new();

    public FirstDoorAppliedUseAckSnapshot AcceptedUseAck { get; init; } = new();

    public IReadOnlyList<FirstDoorTransitionReplaySnapshot> TransitionReplaySnapshots { get; init; }
        = Array.Empty<FirstDoorTransitionReplaySnapshot>();

    public bool NativeLevelFactsAvailable { get; init; }

    public bool NativeLevelLoadSequenceAvailable { get; init; }

    public long NativeLevelLoadSequence { get; init; } = -1;

    public long NativeLevelTime { get; init; } = -1;

    public long NativeGametic { get; init; } = -1;

    public long NativeLevelStartTic { get; init; } = -1;

    public int NativeGameState { get; init; } = -1;

    public int NativeGameEpisode { get; init; } = -1;

    public int NativeGameMap { get; init; } = -1;

    public int StateFrame { get; init; }

    public int RetryCount { get; init; }

    public int RecoveryCount { get; init; }

    public int RemainingUseRetries { get; init; }

    public int RemainingRecoveryAttempts { get; init; }

    public int AlignmentSweepDirection { get; init; }

    public long UseAttemptId { get; init; }

    public long PendingUseAttemptId { get; init; }

    public string PendingUseCorrelationState { get; init; } = "none";

    public string TerminalFailureCode { get; init; } = string.Empty;

    private static ActionCommand NeutralAction()
        => new(false, false, false, false, 0, false, false);
}

internal sealed class FirstDoorControlStateMachine
{
    internal const int CurrentContractVersion = 4;
    internal const string CurrentImplementationVersion = "first-door-control-v6";

    private readonly FirstDoorControlPolicy _policy;
    private FirstDoorControlState _state = FirstDoorControlState.OpeningTransit;
    private FirstDoorOpenConfirmationSource _openConfirmationSource;
    private string _acceptedOpenEvidenceId = string.Empty;
    private string _sessionId = string.Empty;
    private string _runId = string.Empty;
    private long _runGeneration;
    private long _lastControlTick;
    private long _stateEnteredAtControlTick;
    private int _lastPrediction = -1;
    private int _retryCount;
    private int _recoveryCount;
    private int _alignmentSweepDirection;
    private long _lastUseAttemptId;
    private long _lastUseDecisionControlTick;
    private string _lastHandledFailedUseAudioEventId = string.Empty;
    private string _reasonCode = "opening-transit";
    private bool _initialized;
    private bool _openConfirmed;
    private bool _openConfirmedThisTick;
    private string _lastPreOpenVisualContentHash = string.Empty;
    private string _preOpenVisualContentHash = string.Empty;
    private int _computerRoomStableFrames;
    private int _computerRoomRawMissingFrames;
    private int _approachProximityMissingFrames;
    private FirstDoorComputerRoomBlockCode _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.NotInConfirmationPhase;
    private string _computerRoomReason = "computer-room-confirmation-not-active";
    private FirstDoorComputerRoomObservation _currentComputerRoomObservation = new();
    private readonly List<FirstDoorRawReplayObservation> _computerRoomPositiveReplays = new();
    private FirstDoorComputerRoomConfirmationTrace? _terminalComputerRoomTrace;
    private readonly List<FirstDoorTransitionReplaySnapshot> _transitionReplaySnapshots = new();
    private bool _openingNavigationReplayObserved;
    private int _replayOpeningNavigationLegIndex = -1;
    private string _replayOpeningNavigationLegId = string.Empty;
    private int _replayOpeningNavigationRecoveryCount;
    private bool _replayOpeningNavigationReturningToCertifiedWaypoint;
    private bool _replayOpeningNavigationSightlineReady;
    private bool _replayOpeningNavigationFailed;
    private FirstDoorOwnershipUnit _terminalOwnershipUnit = FirstDoorOwnershipUnit.OpeningTransit;

    internal FirstDoorControlStateMachine(FirstDoorControlPolicy? policy = null)
    {
        _policy = policy ?? new FirstDoorControlPolicy();
    }

    internal FirstDoorControlDecision Evaluate(FirstDoorControlInput input)
    {
        ArgumentNullException.ThrowIfNull(input);

        var controlTick = NormalizeControlTick(input.ControlTick);
        var previousState = _state;
        _openConfirmedThisTick = false;
        var contractError = ResolveInputContractError(input);
        var resetReason = contractError is null ? ResolveResetReason(input) : null;
        var resetApplied = resetReason is not null;
        if (resetReason is not null)
        {
            Reset(input, controlTick, resetReason);
        }

        _lastControlTick = controlTick;
        _lastPrediction = Math.Max(0, input.Prediction);
        if (contractError is null && _terminalComputerRoomTrace is null)
        {
            _currentComputerRoomObservation = input.ComputerRoomObservation ?? new FirstDoorComputerRoomObservation();
        }

        if (!_openConfirmed
            && _currentComputerRoomObservation.Available
            && _currentComputerRoomObservation.Fresh
            && _currentComputerRoomObservation.FirstDoorIdentityTruth == FirstDoorEvidenceTruth.Yes
            && !string.IsNullOrWhiteSpace(_currentComputerRoomObservation.VisualContentHash))
        {
            _lastPreOpenVisualContentHash = _currentComputerRoomObservation.VisualContentHash;
        }

        var terminalStateAbsorbsInput = !resetApplied
            && previousState is FirstDoorControlState.Complete
                or FirstDoorControlState.FailedSafeStop;
        if (terminalStateAbsorbsInput)
        {
            // A terminal decision is immutable until a valid fresh run boundary is admitted.
        }
        else if (contractError is not null)
        {
            FailSafeStop(contractError, controlTick);
        }
        else if (input.LifecycleFaulted)
        {
            FailSafeStop("lifecycle-faulted", controlTick);
        }
        else if (!input.ControlReady && _state != FirstDoorControlState.OpeningTransit)
        {
            FailSafeStop("control-readiness-lost", controlTick);
        }
        else if (_state != FirstDoorControlState.FailedSafeStop
            && (!resetApplied || _state == FirstDoorControlState.OpeningTransit))
        {
            EvaluateActiveState(input, controlTick);
        }

        var decision = CreateDecision(
            input,
            previousState,
            controlTick,
            resetApplied,
            failedUseAccepted: _failedUseAcceptedThisTick,
            failedUseAudioEventId: _failedUseAudioEventIdThisTick);
        if (!terminalStateAbsorbsInput)
        {
            AppendSignificantTransitionReplay(decision);
        }
        decision = decision with
        {
            TransitionReplaySnapshots = _transitionReplaySnapshots.ToArray()
        };
        _failedUseAcceptedThisTick = false;
        _failedUseAudioEventIdThisTick = string.Empty;
        EnsureInvariants(decision);
        return decision;
    }

    private bool _failedUseAcceptedThisTick;
    private string _failedUseAudioEventIdThisTick = string.Empty;

    private void EvaluateActiveState(FirstDoorControlInput input, long controlTick)
    {
        var openResolution = ResolveTrustedOpen(input, controlTick);
        var transitionedByOpen = false;
        if (openResolution.Source != FirstDoorOpenConfirmationSource.None)
        {
            _openConfirmedThisTick = !_openConfirmed;
            _openConfirmed = true;
            _openConfirmationSource = openResolution.Source;
            _acceptedOpenEvidenceId = openResolution.EvidenceId;
            if (_openConfirmedThisTick)
            {
                BeginComputerRoomConfirmation();
            }
            if (IsPreOpenState(_state))
            {
                Transition(
                    FirstDoorControlState.PostOpenShove,
                    $"open-confirmed:{OpenSourceId(openResolution.Source)}",
                    controlTick);
                transitionedByOpen = true;
            }
        }

        if (!transitionedByOpen
            && input.AmbiguousManualUseOverlap
            && _state is FirstDoorControlState.StationaryUse or FirstDoorControlState.AwaitOutcome)
        {
            StartBoundedReapproach(
                "manual-use-overlap-bounded-recovery",
                controlTick,
                incrementUseRetry: true);
        }
        else if (!transitionedByOpen
            && TryConsumeFailedUse(input, controlTick, out var failedUseAudioEventId))
        {
            _failedUseAcceptedThisTick = true;
            _failedUseAudioEventIdThisTick = failedUseAudioEventId;
            StartBoundedReapproach(
                "failed-use-audio-bounded-reapproach",
                controlTick,
                incrementUseRetry: true);
        }
        else if (!transitionedByOpen)
        {
            AdvanceState(input, controlTick);
        }
    }

    private string? ResolveResetReason(FirstDoorControlInput input)
    {
        if (!_initialized)
        {
            return "run-initialized";
        }

        if (input.ResetRequested)
        {
            return "explicit-run-reset";
        }

        if (input.RunGeneration != _runGeneration
            || !string.Equals(input.SessionId, _sessionId, StringComparison.Ordinal)
            || !string.Equals(input.RunId, _runId, StringComparison.Ordinal))
        {
            return "explicit-run-scope-changed";
        }

        return null;
    }

    private static string? ResolveInputContractError(FirstDoorControlInput input)
    {
        if (!string.IsNullOrWhiteSpace(input.ContractError))
        {
            return input.ContractError.Trim();
        }

        if (input.ContractVersion != CurrentContractVersion)
        {
            return "unsupported-contract-version";
        }

        if (string.IsNullOrWhiteSpace(input.SessionId))
        {
            return "missing-session-id";
        }

        if (input.RunGeneration <= 0 || string.IsNullOrWhiteSpace(input.RunId))
        {
            return "missing-run-scope";
        }

        if (IsUnknownContractValue(input.LifecycleState))
        {
            return "missing-lifecycle-state";
        }

        return IsUnknownContractValue(input.ModelState) ? "missing-model-state" : null;
    }

    private static bool IsUnknownContractValue(string? value)
        => string.IsNullOrWhiteSpace(value)
            || value.Equals("unknown", StringComparison.OrdinalIgnoreCase);

    private long NormalizeControlTick(long requestedTick)
    {
        if (!_initialized)
        {
            return Math.Max(1, requestedTick);
        }

        return requestedTick > _lastControlTick
            ? requestedTick
            : _lastControlTick == long.MaxValue ? long.MaxValue : _lastControlTick + 1;
    }

    private void Reset(FirstDoorControlInput input, long controlTick, string reason)
    {
        _initialized = true;
        _sessionId = NormalizeScopeId(input.SessionId);
        _runGeneration = input.RunGeneration;
        _runId = NormalizeScopeId(input.RunId);
        _state = FirstDoorControlState.OpeningTransit;
        _stateEnteredAtControlTick = controlTick;
        _retryCount = 0;
        _recoveryCount = 0;
        _alignmentSweepDirection = 0;
        _lastUseAttemptId = 0;
        _lastUseDecisionControlTick = 0;
        _lastHandledFailedUseAudioEventId = string.Empty;
        _failedUseAcceptedThisTick = false;
        _failedUseAudioEventIdThisTick = string.Empty;
        _openConfirmed = false;
        _openConfirmedThisTick = false;
        _openConfirmationSource = FirstDoorOpenConfirmationSource.None;
        _acceptedOpenEvidenceId = string.Empty;
        _lastPreOpenVisualContentHash = string.Empty;
        _preOpenVisualContentHash = string.Empty;
        _computerRoomStableFrames = 0;
        _computerRoomRawMissingFrames = 0;
        _approachProximityMissingFrames = 0;
        _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.NotInConfirmationPhase;
        _computerRoomReason = "computer-room-confirmation-not-active";
        _currentComputerRoomObservation = new FirstDoorComputerRoomObservation();
        _computerRoomPositiveReplays.Clear();
        _terminalComputerRoomTrace = null;
        _transitionReplaySnapshots.Clear();
        _openingNavigationReplayObserved = false;
        _replayOpeningNavigationLegIndex = -1;
        _replayOpeningNavigationLegId = string.Empty;
        _replayOpeningNavigationRecoveryCount = 0;
        _replayOpeningNavigationReturningToCertifiedWaypoint = false;
        _replayOpeningNavigationSightlineReady = false;
        _replayOpeningNavigationFailed = false;
        _terminalOwnershipUnit = FirstDoorOwnershipUnit.OpeningTransit;
        _reasonCode = reason;
    }

    private void AdvanceState(FirstDoorControlInput input, long controlTick)
    {
        var stateFrame = StateFrame(controlTick);
        switch (_state)
        {
            case FirstDoorControlState.OpeningTransit:
                if (!input.ControlReady)
                {
                    _reasonCode = "control-not-ready";
                }
                else if (input.OpeningNavigation.Status == FirstDoorOpeningNavigationStatus.Failed)
                {
                    FailSafeStop(OpeningNavigationFailureCode(input.OpeningNavigation), controlTick);
                }
                else if (input.OpeningNavigation.Active)
                {
                    Transition(
                        FirstDoorControlState.OpeningNavigate,
                        "opening-navigation-owner-acquired",
                        controlTick);
                }
                else
                {
                    _reasonCode = "opening-navigation-awaiting-active-snapshot";
                }
                break;

            case FirstDoorControlState.OpeningNavigate:
                if (input.OpeningNavigation.Status == FirstDoorOpeningNavigationStatus.Failed)
                {
                    FailSafeStop(OpeningNavigationFailureCode(input.OpeningNavigation), controlTick);
                }
                else if (!input.OpeningNavigation.Active)
                {
                    FailSafeStop("opening-navigation-active-snapshot-lost", controlTick);
                }
                else if (input.AcquisitionStatus == FirstDoorAcquisitionStatus.Expired)
                {
                    FailSafeStop(
                        string.IsNullOrWhiteSpace(input.AcquisitionFailureCode)
                            ? "first-door-acquisition-budget-exhausted"
                            : input.AcquisitionFailureCode.Trim(),
                        controlTick);
                }
                else if (input.OpeningNavigation.Status
                        == FirstDoorOpeningNavigationStatus.ReadyForAcquisition
                    && input.OpeningNavigation.ReadyForAcquisition
                    && input.AcquisitionStatus == FirstDoorAcquisitionStatus.Ready)
                {
                    Transition(FirstDoorControlState.Approach, "first-door-owner-acquired", controlTick);
                }
                else
                {
                    _reasonCode = input.OpeningNavigation.Status
                        == FirstDoorOpeningNavigationStatus.ReadyForAcquisition
                            ? "opening-navigation-acquisition-evidence-pending"
                            : $"opening-navigation:{OpeningNavigationBlockId(input.OpeningNavigation.BlockCode)}";
                }
                break;

            case FirstDoorControlState.Approach:
                if (FreshProximity(input))
                {
                    _approachProximityMissingFrames = 0;
                    if (input.Proximity.WithinContactApproachRange)
                    {
                        Transition(
                            FirstDoorControlState.Align,
                            "contact-approach-range-reached-align",
                            controlTick);
                    }
                    else if (Math.Abs(input.Proximity.BearingErrorDegrees)
                        > _policy.AlignmentToleranceDegrees)
                    {
                        Transition(
                            FirstDoorControlState.Align,
                            "approach-bearing-realignment",
                            controlTick);
                    }
                    else
                    {
                        _reasonCode = "bounded-contact-approach-forward";
                    }
                }
                else
                {
                    _approachProximityMissingFrames = SaturatingIncrement(
                        _approachProximityMissingFrames);
                    _reasonCode = "contact-approach-awaiting-fresh-proximity";
                }

                if (_state == FirstDoorControlState.Approach
                    && _approachProximityMissingFrames
                        >= Math.Max(1, _policy.ApproachMaximumProximityMissingFrames))
                {
                    FailSafeStop("contact-approach-proximity-missing-budget-exhausted", controlTick);
                }
                else if (_state == FirstDoorControlState.Approach
                    && stateFrame >= Frames(_policy.ApproachTimeoutFrames))
                {
                    FailSafeStop("contact-approach-budget-exhausted", controlTick);
                }
                break;

            case FirstDoorControlState.FailedUseReapproach:
                if (FreshProximity(input))
                {
                    _approachProximityMissingFrames = 0;
                    _reasonCode = "bounded-backward-reapproach";
                }
                else
                {
                    _approachProximityMissingFrames = SaturatingIncrement(
                        _approachProximityMissingFrames);
                    _reasonCode = "bounded-backward-reapproach-awaiting-fresh-proximity";
                }

                if (_approachProximityMissingFrames
                    >= Math.Max(1, _policy.ApproachMaximumProximityMissingFrames))
                {
                    FailSafeStop(
                        "bounded-backward-reapproach-proximity-missing-budget-exhausted",
                        controlTick);
                }
                else if (stateFrame >= Frames(_policy.FailedUseReapproachFrames))
                {
                    Transition(
                        FirstDoorControlState.Approach,
                        "bounded-backward-reapproach-complete-contact-approach",
                        controlTick);
                }
                break;

            case FirstDoorControlState.Align:
                if (stateFrame >= Frames(_policy.AlignMinimumFrames)
                    && NativeBearingAligned(input))
                {
                    if (!input.Proximity.WithinContactApproachRange)
                    {
                        Transition(
                            FirstDoorControlState.Approach,
                            "bearing-aligned-distance-reacquire-approach",
                            controlTick);
                    }
                    else if (DoorFrontAligned(input))
                    {
                        Transition(FirstDoorControlState.Contact, "door-front-aligned-contact", controlTick);
                    }
                }

                if (_state == FirstDoorControlState.Align
                    && stateFrame >= Frames(_policy.AlignTimeoutFrames))
                {
                    StartBoundedReapproach(
                        "align-timeout-bounded-reapproach",
                        controlTick,
                        incrementUseRetry: false);
                }
                break;

            case FirstDoorControlState.Contact:
                if (FreshProximity(input)
                    && input.Proximity.WithinUseRange
                    && NativeBearingAligned(input))
                {
                    Transition(
                        FirstDoorControlState.PreUseStop,
                        "fresh-use-range-reached-pre-use-stop",
                        controlTick);
                }
                else if (stateFrame >= Frames(_policy.ContactFrames))
                {
                    StartBoundedReapproach(
                        "contact-use-range-not-reached-bounded-reapproach",
                        controlTick,
                        incrementUseRetry: false);
                }
                break;

            case FirstDoorControlState.PreUseStop:
                if (stateFrame >= Frames(_policy.PreUseStopFrames)
                    && UseAdmissionReady(input))
                {
                    Transition(FirstDoorControlState.StationaryUse, "pre-use-stop-complete-stationary-use", controlTick);
                }
                else if (stateFrame >= Frames(_policy.PreUseStopTimeoutFrames))
                {
                    StartBoundedReapproach(
                        "pre-use-stop-timeout-bounded-reapproach",
                        controlTick,
                        incrementUseRetry: false);
                }
                break;

            case FirstDoorControlState.StationaryUse:
                if (stateFrame >= Frames(_policy.StationaryUseFrames))
                {
                    Transition(FirstDoorControlState.AwaitOutcome, "use-issued-await-outcome", controlTick);
                }
                break;

            case FirstDoorControlState.AwaitOutcome:
                if (stateFrame >= Frames(_policy.AwaitOutcomeFrames))
                {
                    StartBoundedReapproach(
                        "unconfirmed-use-timeout-bounded-reapproach",
                        controlTick,
                        incrementUseRetry: true);
                }
                break;

            case FirstDoorControlState.PostOpenShove:
                if (stateFrame >= Frames(_policy.PostOpenEntryShoveFrames))
                {
                    Transition(FirstDoorControlState.AwaitComputerRoom, "post-open-shove-complete", controlTick);
                }
                break;

            case FirstDoorControlState.AwaitComputerRoom:
                EvaluateComputerRoomConfirmation(
                    input.ComputerRoomObservation,
                    input.Proximity,
                    stateFrame,
                    controlTick);
                break;

            case FirstDoorControlState.Complete:
            case FirstDoorControlState.FailedSafeStop:
                break;
        }
    }

    private void BeginComputerRoomConfirmation()
    {
        _preOpenVisualContentHash = !string.IsNullOrWhiteSpace(_lastPreOpenVisualContentHash)
            ? _lastPreOpenVisualContentHash
            : _currentComputerRoomObservation.VisualContentHash;
        _computerRoomStableFrames = 0;
        _computerRoomRawMissingFrames = 0;
        _computerRoomPositiveReplays.Clear();
        _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.NotInConfirmationPhase;
        _computerRoomReason = "trusted-open-confirmed-awaiting-post-open-shove";
        _terminalComputerRoomTrace = null;
    }

    private void EvaluateComputerRoomConfirmation(
        FirstDoorComputerRoomObservation? observation,
        FirstDoorProximityObservation? proximity,
        int stateFrame,
        long controlTick)
    {
        _currentComputerRoomObservation = observation ?? new FirstDoorComputerRoomObservation();
        if (!_openConfirmed)
        {
            ResetComputerRoomPositiveWindow();
            _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.TrustedOpenMissing;
            _computerRoomReason = "trusted-open-confirmation-missing";
            return;
        }

        var roomTopologyConfirmed = proximity is
        {
            Available: true,
            Fresh: true,
            WadVerified: true,
            NativeGameEpisode: 1,
            NativeGameMap: 1,
            PlayerSectorIndex: 7
        };
        if (!roomTopologyConfirmed)
        {
            ResetComputerRoomPositiveWindow();
            _computerRoomRawMissingFrames = 0;
            _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.ComputerRoomTopologyMismatch;
            _computerRoomReason = $"computer-room-topology-mismatch:sector-{proximity?.PlayerSectorIndex ?? -1}";
        }
        else if (!_currentComputerRoomObservation.Available)
        {
            ResetComputerRoomPositiveWindow();
            _computerRoomRawMissingFrames = SaturatingIncrement(_computerRoomRawMissingFrames);
            _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.RawObservationUnavailable;
            _computerRoomReason = _currentComputerRoomObservation.Reason;
        }
        else if (!_currentComputerRoomObservation.Fresh)
        {
            _computerRoomRawMissingFrames = 0;
            _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.DuplicateRawFrame;
            _computerRoomReason = "duplicate-raw-frame-does-not-advance-room-window";
        }
        else
        {
            _computerRoomRawMissingFrames = 0;
            EvaluateFreshComputerRoomObservation(_currentComputerRoomObservation, controlTick);
            if (_state == FirstDoorControlState.Complete)
            {
                return;
            }
        }

        if (_computerRoomRawMissingFrames >= Math.Max(1, _policy.ComputerRoomMaximumRawMissingFrames))
        {
            _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.RawObservationMissingBudgetExhausted;
            _computerRoomReason = "computer-room-raw-observation-missing-budget-exhausted";
            _terminalComputerRoomTrace = CreateComputerRoomTrace(controlTick);
            FailSafeStop(_computerRoomReason, controlTick);
            return;
        }

        if (stateFrame >= Frames(_policy.ComputerRoomConfirmationTimeoutFrames))
        {
            _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.ConfirmationBudgetExhausted;
            _computerRoomReason = "computer-room-confirmation-budget-exhausted";
            _terminalComputerRoomTrace = CreateComputerRoomTrace(controlTick);
            FailSafeStop(_computerRoomReason, controlTick);
        }
    }

    private void EvaluateFreshComputerRoomObservation(
        FirstDoorComputerRoomObservation observation,
        long controlTick)
    {
        if (observation.Truth != FirstDoorEvidenceTruth.Yes)
        {
            ResetComputerRoomPositiveWindow();
            _computerRoomBlockCode = observation.Reason switch
            {
                "first-door-identity-still-visible" => FirstDoorComputerRoomBlockCode.FirstDoorStillVisible,
                "first-door-residual-score-not-separated" => FirstDoorComputerRoomBlockCode.FirstDoorResidualTooStrong,
                _ => FirstDoorComputerRoomBlockCode.RoomCuesBelowThreshold
            };
            _computerRoomReason = observation.Reason;
            return;
        }

        if (string.IsNullOrWhiteSpace(_preOpenVisualContentHash))
        {
            ResetComputerRoomPositiveWindow();
            _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.PreOpenVisualContentUnavailable;
            _computerRoomReason = "pre-open-visual-content-unavailable";
            return;
        }

        if (string.Equals(
            observation.VisualContentHash,
            _preOpenVisualContentHash,
            StringComparison.Ordinal))
        {
            ResetComputerRoomPositiveWindow();
            _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.PreOpenVisualContentUnchanged;
            _computerRoomReason = "pre-open-visual-content-unchanged";
            return;
        }

        _computerRoomStableFrames = SaturatingIncrement(_computerRoomStableFrames);
        if (observation.CurrentReplayObservation.Available
            && !_computerRoomPositiveReplays.Any(item =>
                string.Equals(item.ObservationHash, observation.ObservationHash, StringComparison.Ordinal)))
        {
            _computerRoomPositiveReplays.Add(observation.CurrentReplayObservation);
        }

        var required = Math.Max(1, _policy.ComputerRoomRequiredStableFrames);
        if (_computerRoomStableFrames >= required
            && _computerRoomPositiveReplays.Count >= required)
        {
            _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.None;
            _computerRoomReason = "computer-room-entry-confirmed";
            _terminalComputerRoomTrace = CreateComputerRoomTrace(controlTick);
            Transition(FirstDoorControlState.Complete, _computerRoomReason, controlTick);
            return;
        }

        _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.PositiveWindowPending;
        _computerRoomReason = "computer-room-positive-window-pending";
    }

    private void ResetComputerRoomPositiveWindow()
    {
        _computerRoomStableFrames = 0;
        _computerRoomPositiveReplays.Clear();
    }

    private FirstDoorComputerRoomConfirmationTrace CreateComputerRoomTrace(long controlTick)
    {
        var observation = _currentComputerRoomObservation;
        var confirmationFrames = _state is FirstDoorControlState.AwaitComputerRoom
            or FirstDoorControlState.Complete
            or FirstDoorControlState.FailedSafeStop
                ? StateFrame(controlTick)
                : 0;
        var timeout = Math.Max(1, _policy.ComputerRoomConfirmationTimeoutFrames);
        return new FirstDoorComputerRoomConfirmationTrace
        {
            Available = true,
            EvaluatedAtControlTick = controlTick,
            Truth = observation.Truth,
            Reason = _computerRoomReason,
            FreshObservation = observation.Fresh,
            ObservationHash = observation.ObservationHash,
            VisualContentHash = observation.VisualContentHash,
            PreOpenVisualContentHash = _preOpenVisualContentHash,
            VisualContentSeparatedFromPreOpen = !string.IsNullOrWhiteSpace(_preOpenVisualContentHash)
                && !string.IsNullOrWhiteSpace(observation.VisualContentHash)
                && !string.Equals(observation.VisualContentHash, _preOpenVisualContentHash, StringComparison.Ordinal),
            FirstDoorIdentityTruth = observation.FirstDoorIdentityTruth,
            FirstDoorCandidateScore = observation.FirstDoorCandidateScore,
            MaximumFirstDoorResidualScore = _policy.ComputerRoomMaximumFirstDoorResidualScore,
            RoomScore = observation.RoomScore,
            RawRoomScore = observation.RawRoomScore,
            MinimumRoomScore = _policy.ComputerRoomMinimumScore,
            BlueScore = observation.BlueScore,
            RawBlueScore = observation.RawBlueScore,
            StructuredBlueScore = observation.StructuredBlueScore,
            StructuredBlueCellCount = observation.StructuredBlueCellCount,
            StructuredBlueRowCount = observation.StructuredBlueRowCount,
            StructuredBlueColumnCount = observation.StructuredBlueColumnCount,
            StructuredBlueApplied = observation.StructuredBlueApplied,
            RedLightScore = observation.RedLightScore,
            DarkPanelScore = observation.DarkPanelScore,
            PanelScore = observation.PanelScore,
            GameplayLuma = observation.GameplayLuma,
            StableFrames = _computerRoomStableFrames,
            RequiredStableFrames = Math.Max(1, _policy.ComputerRoomRequiredStableFrames),
            ConsecutiveRawMissingFrames = _computerRoomRawMissingFrames,
            MaximumRawMissingFrames = Math.Max(1, _policy.ComputerRoomMaximumRawMissingFrames),
            ConfirmationFrames = confirmationFrames,
            ConfirmationTimeoutFrames = timeout,
            ConfirmationRemainingFrames = Math.Max(0, timeout - confirmationFrames),
            BlockCode = _computerRoomBlockCode,
            Ready = _computerRoomBlockCode == FirstDoorComputerRoomBlockCode.None,
            CurrentReplayObservation = observation.CurrentReplayObservation,
            AcceptedPositiveReplayObservations = _computerRoomPositiveReplays.ToArray()
        };
    }

    private static int SaturatingIncrement(int value)
        => value == int.MaxValue ? int.MaxValue : value + 1;

    private bool DoorFrontAligned(FirstDoorControlInput input)
        => input.RawObservationFresh
            && FreshProximity(input)
            && input.Proximity.WithinContactApproachRange
            && NativeBearingAligned(input)
            && input.AlignmentAvailable
            && input.DoorIdentityTruth == FirstDoorEvidenceTruth.Yes
            && input.DoorIdentityConfidence >= _policy.MinimumDoorIdentityConfidence
            && Math.Abs(input.AlignmentErrorDegrees) <= _policy.AlignmentToleranceDegrees;

    private bool NativeBearingAligned(FirstDoorControlInput input)
        => FreshProximity(input)
            && Math.Abs(input.Proximity.BearingErrorDegrees) <= _policy.AlignmentToleranceDegrees;

    private static bool FreshProximity(FirstDoorControlInput input)
        => input.Proximity is
        {
            InputAccepted: true,
            Available: true,
            Fresh: true,
            Truth: FirstDoorEvidenceTruth.Yes
        };

    private bool UseAdmissionReady(FirstDoorControlInput input)
        => input.CurrentDoorIdentityReadyForUse
            && DoorFrontAligned(input)
            && input.Proximity.WithinUseRange
            && double.IsFinite(input.Proximity.DistanceToDoorSegment)
            && input.Proximity.DistanceToDoorSegment <= _policy.UseMaximumDistance;

    private TrustedOpenResolution ResolveTrustedOpen(
        FirstDoorControlInput input,
        long currentControlTick)
    {
        var evidence = input.OpenEvidence;
        if (!EvidenceScopeMatches(evidence.RunGeneration, evidence.SessionId, evidence.RunId))
        {
            return TrustedOpenResolution.None;
        }

        if (evidence.DoorOpenedCount > 0
            && evidence.DoorOpenedCountProvenance == FirstDoorEvidenceProvenance.NativeEngine)
        {
            return new TrustedOpenResolution(
                FirstDoorOpenConfirmationSource.NativeDoorCount,
                $"native-door-count:{evidence.DoorOpenedCount}");
        }

        if (evidence.MilestoneConfirmed
            && evidence.MilestoneProvenance is FirstDoorEvidenceProvenance.NativeEngine
                or FirstDoorEvidenceProvenance.TrustedMilestone)
        {
            return new TrustedOpenResolution(
                FirstDoorOpenConfirmationSource.TrustedMilestone,
                "trusted-first-door-milestone");
        }

        if (evidence.AudioConfirmed
            && evidence.AudioProvenance == FirstDoorEvidenceProvenance.ClassifiedNativeAudio
            && !string.IsNullOrWhiteSpace(evidence.AudioEventId)
            && _state is FirstDoorControlState.StationaryUse or FirstDoorControlState.AwaitOutcome
            && input.UseAckWindowActive
            && input.AcknowledgedUseDecisionControlTick == _lastUseDecisionControlTick
            && input.AcknowledgedUseAttemptId == evidence.UseAttemptId
            && evidence.UseAttemptId > 0
            && evidence.UseAttemptId == _lastUseAttemptId
            && EvidenceTickMatches(evidence.EventControlTick, evidence.AudioAgeFrames, currentControlTick)
            && IsRecent(evidence.AudioAgeFrames, _policy.OpenAudioMaxAgeFrames))
        {
            return new TrustedOpenResolution(
                FirstDoorOpenConfirmationSource.TrustedAudio,
                evidence.AudioEventId);
        }

        return TrustedOpenResolution.None;
    }

    private bool TryConsumeFailedUse(
        FirstDoorControlInput input,
        long currentControlTick,
        out string audioEventId)
    {
        var evidence = input.FailedUseEvidence;
        audioEventId = string.Empty;
        if (_state is not FirstDoorControlState.StationaryUse
            and not FirstDoorControlState.AwaitOutcome)
        {
            return false;
        }

        if (!evidence.Confirmed
            || evidence.Provenance != FirstDoorEvidenceProvenance.ClassifiedNativeAudio
            || string.IsNullOrWhiteSpace(evidence.AudioEventId)
            || !EvidenceScopeMatches(evidence.RunGeneration, evidence.SessionId, evidence.RunId)
            || !input.UseAckWindowActive
            || input.AcknowledgedUseDecisionControlTick != _lastUseDecisionControlTick
            || input.AcknowledgedUseAttemptId != evidence.UseAttemptId
            || !EvidenceTickMatches(evidence.EventControlTick, evidence.AudioAgeFrames, currentControlTick)
            || !IsRecent(evidence.AudioAgeFrames, _policy.FailedUseAudioMaxAgeFrames)
            || evidence.UseAttemptId <= 0
            || evidence.UseAttemptId != _lastUseAttemptId
            || string.Equals(evidence.AudioEventId, _lastHandledFailedUseAudioEventId, StringComparison.Ordinal))
        {
            return false;
        }

        _lastHandledFailedUseAudioEventId = evidence.AudioEventId;
        audioEventId = evidence.AudioEventId;
        return true;
    }

    private bool EvidenceScopeMatches(long runGeneration, string sessionId, string runId)
        => runGeneration == _runGeneration
            && string.Equals(sessionId, _sessionId, StringComparison.Ordinal)
            && string.Equals(runId, _runId, StringComparison.Ordinal);

    private void StartBoundedReapproach(
        string reason,
        long controlTick,
        bool incrementUseRetry)
    {
        if (incrementUseRetry && _retryCount >= Math.Max(0, _policy.MaxUseRetries))
        {
            FailSafeStop($"{reason}-use-retry-budget-exhausted", controlTick);
            return;
        }

        if (_recoveryCount >= Math.Max(0, _policy.MaxRecoveryAttempts))
        {
            FailSafeStop($"{reason}-recovery-budget-exhausted", controlTick);
            return;
        }

        if (incrementUseRetry)
        {
            _retryCount++;
        }

        _recoveryCount++;
        _alignmentSweepDirection = _recoveryCount % 2 == 1 ? 1 : -1;
        Transition(FirstDoorControlState.FailedUseReapproach, reason, controlTick);
    }

    private void FailSafeStop(string reason, long controlTick)
    {
        if (_state != FirstDoorControlState.FailedSafeStop)
        {
            _terminalOwnershipUnit = OwnershipForState(_state);
        }

        if (_terminalComputerRoomTrace is null)
        {
            if (_state == FirstDoorControlState.AwaitComputerRoom)
            {
                _computerRoomBlockCode = FirstDoorComputerRoomBlockCode.ControllerTerminated;
                _computerRoomReason = reason;
            }

            _terminalComputerRoomTrace = CreateComputerRoomTrace(controlTick);
        }

        Transition(FirstDoorControlState.FailedSafeStop, reason, controlTick);
    }

    private void Transition(FirstDoorControlState next, string reason, long controlTick)
    {
        if (_state != next)
        {
            _state = next;
            _stateEnteredAtControlTick = controlTick;
            if (next == FirstDoorControlState.StationaryUse)
            {
                _lastUseAttemptId = _lastUseAttemptId == long.MaxValue ? 1 : _lastUseAttemptId + 1;
                _lastUseDecisionControlTick = controlTick;
            }

            if (next is FirstDoorControlState.Approach
                or FirstDoorControlState.FailedUseReapproach)
            {
                _approachProximityMissingFrames = 0;
            }
        }

        _reasonCode = reason;
    }

    private void AppendSignificantTransitionReplay(FirstDoorControlDecision decision)
    {
        var eventKinds = new List<string>(10);
        if (decision.RunBoundaryApplied)
        {
            eventKinds.Add("run-boundary");
        }

        if (decision.Transitioned)
        {
            eventKinds.Add("state-transition");
        }

        if (decision.Action.UseKey)
        {
            eventKinds.Add("stationary-use-command");
        }

        if (decision.Transitioned
            && decision.State == FirstDoorControlState.PostOpenShove
            && decision.OpenConfirmed)
        {
            eventKinds.Add("trusted-open-accepted");
        }

        if (decision.FailedUseEvidenceAccepted)
        {
            eventKinds.Add("failed-use-accepted");
        }

        if (decision.AppliedActionAckValid && decision.AcceptedUseAck.Available)
        {
            eventKinds.Add("applied-use-ack-accepted");
        }

        if (!string.IsNullOrWhiteSpace(decision.UseOutcomeRejectionCode))
        {
            eventKinds.Add("use-outcome-rejected");
        }

        if (decision.ComputerRoomTrace.FreshObservation
            && decision.ComputerRoomTrace.StableFrames > 0
            && (decision.State == FirstDoorControlState.AwaitComputerRoom
                || (decision.State == FirstDoorControlState.Complete && decision.Transitioned)))
        {
            eventKinds.Add("computer-room-window-update");
        }

        if (decision.Transitioned
            && decision.State is FirstDoorControlState.Complete or FirstDoorControlState.FailedSafeStop)
        {
            eventKinds.Add("terminal");
        }

        AppendOpeningNavigationMilestones(decision.OpeningNavigation, eventKinds);

        if (eventKinds.Count == 0)
        {
            return;
        }

        var observation = _currentComputerRoomObservation;
        _transitionReplaySnapshots.Add(new FirstDoorTransitionReplaySnapshot
        {
            SessionId = _sessionId,
            RunId = _runId,
            RunGeneration = _runGeneration,
            ControlTick = decision.ControlTick,
            EventKind = string.Join('+', eventKinds),
            PreviousState = decision.PreviousState,
            State = decision.State,
            ReasonCode = decision.ReasonCode,
            Action = decision.Action,
            RunRequested = decision.RunRequested,
            OwnershipUnit = decision.OwnershipUnit,
            OwnershipDisposition = decision.OwnershipDisposition,
            OwnerId = decision.OwnerId,
            DoorIdentityTruth = decision.DoorIdentityTruth,
            ComputerRoomBlockCode = decision.ComputerRoomTrace.BlockCode,
            ComputerRoomStableFrames = decision.ComputerRoomTrace.StableFrames,
            Proximity = decision.Proximity,
            OpeningNavigation = decision.OpeningNavigation,
            AcceptedUseAck = decision.AcceptedUseAck,
            ObservationHash = observation.ObservationHash,
            VisualContentHash = observation.VisualContentHash,
            ReplayObservation = observation.CurrentReplayObservation
        });

        var capacity = Math.Clamp(_policy.SignificantTransitionReplayCapacity, 1, 64);
        while (_transitionReplaySnapshots.Count > capacity)
        {
            _transitionReplaySnapshots.RemoveAt(0);
        }
    }

    private void AppendOpeningNavigationMilestones(
        FirstDoorOpeningNavigationSnapshot navigation,
        List<string> eventKinds)
    {
        var failed = navigation.Status == FirstDoorOpeningNavigationStatus.Failed;
        var sightlineReady = navigation.Status == FirstDoorOpeningNavigationStatus.ReadyForAcquisition
            && navigation.ReadyForAcquisition;
        if (!navigation.Active && !failed && !sightlineReady)
        {
            return;
        }

        var firstObserved = !_openingNavigationReplayObserved;
        if (navigation.Active
            && !failed
            && (firstObserved
                || navigation.LegIndex != _replayOpeningNavigationLegIndex
                || !string.Equals(
                    navigation.LegId,
                    _replayOpeningNavigationLegId,
                    StringComparison.Ordinal)))
        {
            eventKinds.Add("opening-navigation-leg");
        }

        if ((firstObserved
                && (navigation.RecoveryCount > 0
                    || navigation.ReturningToCertifiedWaypoint))
            || (!firstObserved
                && (navigation.RecoveryCount != _replayOpeningNavigationRecoveryCount
                    || navigation.ReturningToCertifiedWaypoint
                        != _replayOpeningNavigationReturningToCertifiedWaypoint)))
        {
            eventKinds.Add("opening-navigation-recovery");
        }

        if (sightlineReady && (firstObserved || !_replayOpeningNavigationSightlineReady))
        {
            eventKinds.Add("opening-navigation-sightline-ready");
        }

        if (failed && (firstObserved || !_replayOpeningNavigationFailed))
        {
            eventKinds.Add("opening-navigation-failed");
        }

        _openingNavigationReplayObserved = true;
        _replayOpeningNavigationLegIndex = navigation.LegIndex;
        _replayOpeningNavigationLegId = navigation.LegId ?? string.Empty;
        _replayOpeningNavigationRecoveryCount = navigation.RecoveryCount;
        _replayOpeningNavigationReturningToCertifiedWaypoint = navigation.ReturningToCertifiedWaypoint;
        _replayOpeningNavigationSightlineReady = sightlineReady;
        _replayOpeningNavigationFailed = failed;
    }

    private FirstDoorControlDecision CreateDecision(
        FirstDoorControlInput input,
        FirstDoorControlState previousState,
        long controlTick,
        bool resetApplied,
        bool failedUseAccepted,
        string failedUseAudioEventId)
    {
        var action = ActionForState(input);
        var ownershipUnit = _state == FirstDoorControlState.FailedSafeStop
            ? _terminalOwnershipUnit
            : OwnershipForState(_state);
        var disposition = DispositionForState(_state);
        var runRequested = (_state == FirstDoorControlState.Approach && action.MoveForward)
            || _state == FirstDoorControlState.PostOpenShove;
        var handOffToPostDoor = disposition is FirstDoorOwnershipDisposition.HandOff
            or FirstDoorOwnershipDisposition.Completed;

        return new FirstDoorControlDecision
        {
            ImplementationVersion = CurrentImplementationVersion,
            PolicyVersion = _policy.PolicyVersion,
            ContractVersion = input.ContractVersion,
            SessionId = _sessionId,
            RunId = _runId,
            PreviousState = previousState,
            NextState = _state,
            State = _state,
            Transitioned = previousState != _state,
            OwnershipUnit = ownershipUnit,
            OwnershipDisposition = disposition,
            Action = action,
            RunRequested = runRequested,
            Exclusive = disposition is FirstDoorOwnershipDisposition.Exclusive
                or FirstDoorOwnershipDisposition.FailedSafeStop,
            HandOffToPostDoor = handOffToPostDoor,
            Completed = disposition == FirstDoorOwnershipDisposition.Completed,
            OpenConfirmed = _openConfirmed,
            OpenConfirmationSource = _openConfirmationSource,
            AcceptedOpenEvidenceId = _acceptedOpenEvidenceId,
            AcceptedOpenEvidenceSource = _openConfirmationSource,
            SemanticDelta = new FirstDoorSemanticDelta
            {
                HasChanges = _openConfirmedThisTick
                    || (previousState != FirstDoorControlState.Complete
                        && _state == FirstDoorControlState.Complete),
                SessionId = _sessionId,
                RunId = _runId,
                RunGeneration = _runGeneration,
                ControlTick = controlTick,
                DoorOpenedCount = _openConfirmed ? 1 : 0,
                FirstDoorOpened = _openConfirmed,
                ComputerRoomEntered = _state == FirstDoorControlState.Complete,
                Source = _openConfirmationSource
            },
            FailedUseEvidenceAccepted = failedUseAccepted,
            FailedUseAudioEventId = failedUseAudioEventId,
            AcceptedFailedUseEvidenceId = failedUseAccepted ? failedUseAudioEventId : string.Empty,
            AcceptedFailedUseEvidenceSource = failedUseAccepted
                ? FirstDoorEvidenceProvenance.ClassifiedNativeAudio
                : FirstDoorEvidenceProvenance.None,
            EvidenceObservationCode = input.EvidenceObservationCode,
            AppliedActionAckValid = input.AppliedActionAckValid,
            AppliedActionAckCode = input.AppliedActionAckCode,
            UseAckWindowActive = input.UseAckWindowActive,
            AcknowledgedUseDecisionControlTick = input.AcknowledgedUseDecisionControlTick,
            AcknowledgedUseAttemptId = input.AcknowledgedUseAttemptId,
            AcknowledgedManualUseSequence = input.AcknowledgedManualUseSequence,
            UseOutcomeRejectionCode = input.UseOutcomeRejectionCode,
            OwnerId = _state == FirstDoorControlState.FailedSafeStop
                ? "first-door.failed-safe-stop"
                : OwnerId(ownershipUnit),
            ReasonCode = _reasonCode,
            RunGeneration = _runGeneration,
            ControlTick = controlTick,
            StateEnteredAtControlTick = _stateEnteredAtControlTick,
            Prediction = _lastPrediction,
            ManualUseSequence = input.ManualUseSequence,
            PredictionAnomaly = input.PredictionAnomaly,
            AnomalyCode = input.AnomalyCode,
            LifecycleState = input.LifecycleState,
            ModelState = input.ModelState,
            ContractError = input.ContractError,
            ResetOperationId = input.ResetOperationId,
            LifecycleEvent = input.LifecycleEvent,
            RunBoundaryApplied = resetApplied,
            DoorIdentityTruth = input.DoorIdentityTruth,
            DoorIdentityReason = input.DoorIdentityReason,
            DoorIdentityConfidence = input.DoorIdentityConfidence,
            Proximity = input.Proximity,
            OpeningNavigation = input.OpeningNavigation,
            AcceptedUseAck = input.AcceptedUseAck,
            ComputerRoomTrace = _terminalComputerRoomTrace ?? CreateComputerRoomTrace(controlTick),
            NativeLevelFactsAvailable = input.NativeLevelFactsAvailable,
            NativeLevelLoadSequenceAvailable = input.NativeLevelLoadSequenceAvailable,
            NativeLevelLoadSequence = input.NativeLevelLoadSequence,
            NativeLevelTime = input.NativeLevelTime,
            NativeGametic = input.NativeGametic,
            NativeLevelStartTic = input.NativeLevelStartTic,
            NativeGameState = input.NativeGameState,
            NativeGameEpisode = input.NativeGameEpisode,
            NativeGameMap = input.NativeGameMap,
            StateFrame = StateFrame(controlTick),
            RetryCount = _retryCount,
            RecoveryCount = _recoveryCount,
            RemainingUseRetries = Math.Max(0, Math.Max(0, _policy.MaxUseRetries) - _retryCount),
            RemainingRecoveryAttempts = Math.Max(0, Math.Max(0, _policy.MaxRecoveryAttempts) - _recoveryCount),
            AlignmentSweepDirection = _alignmentSweepDirection,
            UseAttemptId = _lastUseAttemptId,
            PendingUseAttemptId = IsPendingUseState(_state) ? _lastUseAttemptId : 0,
            PendingUseCorrelationState = PendingUseCorrelationState(_state),
            TerminalFailureCode = _state == FirstDoorControlState.FailedSafeStop ? _reasonCode : string.Empty
        };
    }

    private ActionCommand ActionForState(FirstDoorControlInput input)
        => _state switch
        {
            FirstDoorControlState.OpeningNavigate => input.OpeningNavigation.Action,
            FirstDoorControlState.Approach when FreshProximity(input)
                && !input.Proximity.WithinContactApproachRange
                && Math.Abs(input.Proximity.BearingErrorDegrees) <= _policy.AlignmentToleranceDegrees
                    => ForwardAction(),
            FirstDoorControlState.FailedUseReapproach when FreshProximity(input) => BackwardAction(),
            FirstDoorControlState.Align => AlignAction(input),
            FirstDoorControlState.Contact when FreshProximity(input)
                && !input.Proximity.WithinUseRange
                && NativeBearingAligned(input)
                    => ForwardAction(),
            FirstDoorControlState.StationaryUse when UseAdmissionReady(input) => UseAction(),
            FirstDoorControlState.PostOpenShove => ForwardAction(),
            _ => NeutralAction()
        };

    private ActionCommand AlignAction(FirstDoorControlInput input)
    {
        if (!FreshProximity(input))
        {
            return NeutralAction();
        }

        // Alignment is intentionally two-stage. Native pose first brings the
        // player bearing onto the canonical E1M1 door segment; only then may
        // the raw palette box refine the visual centering. A centered box must
        // never suppress a contradictory native bearing correction.
        if (Math.Abs(input.Proximity.BearingErrorDegrees) > _policy.AlignmentToleranceDegrees)
        {
            var nativeYaw = input.Proximity.BearingErrorDegrees < 0
                ? -Math.Abs(_policy.DefaultAlignYaw)
                : Math.Abs(_policy.DefaultAlignYaw);
            nativeYaw = Math.Clamp(
                nativeYaw,
                -Math.Abs(_policy.MaximumAlignYaw),
                Math.Abs(_policy.MaximumAlignYaw));
            return new ActionCommand(false, false, false, false, nativeYaw, false, false);
        }

        var yaw = input.RecommendedYaw;
        if (_alignmentSweepDirection != 0
            && Math.Abs(input.AlignmentErrorDegrees) > _policy.AlignmentToleranceDegrees)
        {
            yaw = _alignmentSweepDirection * Math.Abs(_policy.DefaultAlignYaw);
        }
        else if (yaw == 0 && Math.Abs(input.AlignmentErrorDegrees) > _policy.AlignmentToleranceDegrees)
        {
            yaw = input.AlignmentErrorDegrees < 0
                ? -Math.Abs(_policy.DefaultAlignYaw)
                : Math.Abs(_policy.DefaultAlignYaw);
        }

        yaw = Math.Clamp(yaw, -Math.Abs(_policy.MaximumAlignYaw), Math.Abs(_policy.MaximumAlignYaw));
        return new ActionCommand(false, false, false, false, yaw, false, false);
    }

    private static FirstDoorOwnershipDisposition DispositionForState(FirstDoorControlState state)
        => state switch
        {
            FirstDoorControlState.OpeningTransit => FirstDoorOwnershipDisposition.NotAcquired,
            FirstDoorControlState.AwaitComputerRoom => FirstDoorOwnershipDisposition.HandOff,
            FirstDoorControlState.Complete => FirstDoorOwnershipDisposition.Completed,
            FirstDoorControlState.FailedSafeStop => FirstDoorOwnershipDisposition.FailedSafeStop,
            _ => FirstDoorOwnershipDisposition.Exclusive
        };

    private static FirstDoorOwnershipUnit OwnershipForState(FirstDoorControlState state)
        => state switch
        {
            FirstDoorControlState.OpeningTransit or FirstDoorControlState.OpeningNavigate
                => FirstDoorOwnershipUnit.OpeningTransit,
            FirstDoorControlState.Approach => FirstDoorOwnershipUnit.FirstDoorApproach,
            FirstDoorControlState.Align or FirstDoorControlState.Contact or FirstDoorControlState.PreUseStop
                => FirstDoorOwnershipUnit.DoorFrontAlign,
            FirstDoorControlState.StationaryUse => FirstDoorOwnershipUnit.StationaryUse,
            FirstDoorControlState.AwaitOutcome
                or FirstDoorControlState.FailedUseReapproach
                => FirstDoorOwnershipUnit.UseOutcome,
            FirstDoorControlState.PostOpenShove => FirstDoorOwnershipUnit.PostOpenEntryShove,
            FirstDoorControlState.AwaitComputerRoom or FirstDoorControlState.Complete
                => FirstDoorOwnershipUnit.ComputerRoomEntryConfirmation,
            _ => FirstDoorOwnershipUnit.OpeningTransit
        };

    private static string OwnerId(FirstDoorOwnershipUnit ownershipUnit)
        => ownershipUnit switch
        {
            FirstDoorOwnershipUnit.OpeningTransit => "first-door.opening-transit",
            FirstDoorOwnershipUnit.FirstDoorApproach => "first-door.approach",
            FirstDoorOwnershipUnit.DoorFrontAlign => "first-door.door-front-align",
            FirstDoorOwnershipUnit.StationaryUse => "first-door.stationary-use",
            FirstDoorOwnershipUnit.UseOutcome => "first-door.use-outcome",
            FirstDoorOwnershipUnit.PostOpenEntryShove => "first-door.post-open-entry-shove",
            FirstDoorOwnershipUnit.ComputerRoomEntryConfirmation => "first-door.computer-room-entry-confirmation",
            _ => "first-door.opening-transit"
        };

    private static string OpeningNavigationFailureCode(
        FirstDoorOpeningNavigationSnapshot navigation)
        => !string.IsNullOrWhiteSpace(navigation.FailureCode)
            ? navigation.FailureCode.Trim()
            : $"opening-navigation-failed:{OpeningNavigationBlockId(navigation.BlockCode)}";

    private static string OpeningNavigationBlockId(
        FirstDoorOpeningNavigationBlockCode blockCode)
        => blockCode.ToString();

    private static string OpenSourceId(FirstDoorOpenConfirmationSource source)
        => source switch
        {
            FirstDoorOpenConfirmationSource.NativeDoorCount => "native-door-count",
            FirstDoorOpenConfirmationSource.TrustedMilestone => "trusted-milestone",
            FirstDoorOpenConfirmationSource.TrustedAudio => "trusted-audio",
            _ => "none"
        };

    private static bool IsPreOpenState(FirstDoorControlState state)
        => state is FirstDoorControlState.OpeningTransit
            or FirstDoorControlState.OpeningNavigate
            or FirstDoorControlState.Approach
            or FirstDoorControlState.FailedUseReapproach
            or FirstDoorControlState.Align
            or FirstDoorControlState.Contact
            or FirstDoorControlState.PreUseStop
            or FirstDoorControlState.StationaryUse
            or FirstDoorControlState.AwaitOutcome;

    private static bool IsPendingUseState(FirstDoorControlState state)
        => state is FirstDoorControlState.StationaryUse or FirstDoorControlState.AwaitOutcome;

    private static string PendingUseCorrelationState(FirstDoorControlState state)
        => state switch
        {
            FirstDoorControlState.StationaryUse => "use-issued",
            FirstDoorControlState.AwaitOutcome => "awaiting-outcome",
            _ => "none"
        };

    private static bool IsRecent(int ageFrames, int maximumAgeFrames)
        => ageFrames >= 0 && ageFrames <= Math.Max(0, maximumAgeFrames);

    private static bool EvidenceTickMatches(
        long eventControlTick,
        int reportedAgeFrames,
        long currentControlTick)
        => eventControlTick >= 0
            && eventControlTick <= currentControlTick
            && reportedAgeFrames == currentControlTick - eventControlTick;

    private int StateFrame(long controlTick)
        => (int)Math.Clamp(controlTick - _stateEnteredAtControlTick, 0, int.MaxValue);

    private static string NormalizeScopeId(string? value)
        => string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();

    private static int Frames(int configuredFrames)
        => Math.Max(1, configuredFrames);

    private static ActionCommand ForwardAction()
        => new(true, false, false, false, 0, false, false);

    private static ActionCommand BackwardAction()
        => new(false, true, false, false, 0, false, false);

    private static ActionCommand UseAction()
        => new(false, false, false, false, 0, true, false);

    private static ActionCommand NeutralAction()
        => new(false, false, false, false, 0, false, false);

    private static void EnsureInvariants(FirstDoorControlDecision decision)
    {
        if (decision.State == FirstDoorControlState.OpeningNavigate
            && (decision.OwnershipUnit != FirstDoorOwnershipUnit.OpeningTransit
                || decision.OwnershipDisposition != FirstDoorOwnershipDisposition.Exclusive
                || !decision.Exclusive
                || decision.RunRequested))
        {
            throw new InvalidOperationException(
                "OpeningNavigate must exclusively own the OpeningTransit unit without requesting run.");
        }

        if (decision.State == FirstDoorControlState.OpeningNavigate
            && (decision.Action.MoveBackward
                || decision.Action.StrafeLeft
                || decision.Action.StrafeRight
                || decision.Action.UseKey
                || decision.Action.AttackKey
                || (decision.Action.MoveForward && decision.Action.TurnYaw != 0)))
        {
            throw new InvalidOperationException(
                "OpeningNavigate accepts only neutral, stationary-turn, or forward-only navigation actions.");
        }

        if (decision.Action.UseKey
            && (decision.Action.MoveForward
                || decision.Action.MoveBackward
                || decision.Action.StrafeLeft
                || decision.Action.StrafeRight
                || decision.Action.TurnYaw != 0
                || decision.Action.AttackKey
                || decision.RunRequested))
        {
            throw new InvalidOperationException("Stationary FirstDoor Use must not include movement, turning, attack, or run.");
        }

        if (decision.Action.UseKey
            && (!decision.Proximity.InputAccepted
                || !decision.Proximity.Available
                || !decision.Proximity.Fresh
                || !decision.Proximity.WithinUseRange))
        {
            throw new InvalidOperationException("Stationary FirstDoor Use requires fresh C# native use-range proof.");
        }

        if (decision.AppliedActionAckValid
            && (!decision.AcceptedUseAck.Available
                || decision.AcceptedUseAck.DecisionControlTick <= 0
                || decision.AcceptedUseAck.UseAttemptId <= 0
                || decision.AcceptedUseAck.QueuedUseInputEventSequence <= 0
                || decision.AcceptedUseAck.PumpedUseInputEventSequence
                    != decision.AcceptedUseAck.QueuedUseInputEventSequence))
        {
            throw new InvalidOperationException("Accepted FirstDoor Use ACK must retain its exact queued/pumped replay proof.");
        }

        if (decision.State == FirstDoorControlState.PostOpenShove && !decision.OpenConfirmed)
        {
            throw new InvalidOperationException("Post-open entry shove requires trusted FirstDoor open confirmation.");
        }

        if (decision.HandOffToPostDoor && !decision.OpenConfirmed)
        {
            throw new InvalidOperationException("Post-door handoff requires trusted FirstDoor open confirmation.");
        }

        if (decision.OwnershipDisposition == FirstDoorOwnershipDisposition.FailedSafeStop
            && (!decision.Exclusive
                || decision.Action.MoveForward
                || decision.Action.MoveBackward
                || decision.Action.StrafeLeft
                || decision.Action.StrafeRight
                || decision.Action.TurnYaw != 0
                || decision.Action.UseKey
                || decision.Action.AttackKey
                || decision.RunRequested))
        {
            throw new InvalidOperationException("FailedSafeStop must exclusively hold a neutral action.");
        }
    }

    private sealed record TrustedOpenResolution(
        FirstDoorOpenConfirmationSource Source,
        string EvidenceId)
    {
        internal static TrustedOpenResolution None { get; }
            = new(FirstDoorOpenConfirmationSource.None, string.Empty);
    }
}
