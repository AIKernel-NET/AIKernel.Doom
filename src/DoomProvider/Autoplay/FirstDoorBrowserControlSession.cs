namespace AIKernel.Doom.Provider.Autoplay;

internal sealed record BrowserFirstDoorControlInput
{
    public int ContractVersion { get; init; }

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public int Prediction { get; init; }

    public long ManualUseSequence { get; init; }

    public bool ResetRequested { get; init; }

    public string ResetOperationId { get; init; } = string.Empty;

    public string LifecycleEvent { get; init; } = "none";

    public string LifecycleState { get; init; } = "unknown";

    public string ModelState { get; init; } = "unknown";

    public string WadContentSha256 { get; init; } = string.Empty;

    public bool NativeLevelFactsAvailable { get; init; }

    public bool NativeLevelLoadSequenceAvailable { get; init; }

    public long NativeLevelLoadSequence { get; init; } = -1;

    public long NativeGametic { get; init; } = -1;

    public long NativeLevelTime { get; init; } = -1;

    public long NativeLevelStartTic { get; init; } = -1;

    public int NativeGameState { get; init; } = -1;

    public int NativeGameEpisode { get; init; } = -1;

    public int NativeGameMap { get; init; } = -1;

    public bool NativePlayerFactsAvailable { get; init; }

    public long NativePlayerXFixed { get; init; }

    public long NativePlayerYFixed { get; init; }

    public long NativePlayerAngleBam { get; init; }

    public long NativePlayerMomentumXFixed { get; init; }

    public long NativePlayerMomentumYFixed { get; init; }

    public int NativePlayerSectorIndex { get; init; } = -1;

    public bool NativePlayerVitalityFactsAvailable { get; init; }

    public int NativePlayerHealth { get; init; } = -1;

    public int NativePlayerState { get; init; } = -1;

    public int NativePlayerKillCount { get; init; } = -1;

    public BrowserFirstDoorRawObservation RawObservation { get; init; } = new();

    public BrowserFirstDoorAudioInput Audio { get; init; } = new();

    public BrowserAppliedActionAck? AppliedActionAck { get; init; }
}

internal sealed record BrowserFirstDoorRawObservation
{
    public int SchemaVersion { get; init; }

    public string Layout { get; init; } = string.Empty;

    public bool Available { get; init; }

    public long FrameSequence { get; init; } = -1;

    public long NativeGameticObservedAtEvaluation { get; init; } = -1;

    public int SourceWidth { get; init; } = -1;

    public int SourceHeight { get; init; } = -1;

    public int GameplayHeight { get; init; } = -1;

    public int SampleColumns { get; init; }

    public int SampleRows { get; init; }

    public int PaletteGeneration { get; init; }

    public string PaletteIndicesBase64 { get; init; } = string.Empty;

    public string PaletteRgbaBase64 { get; init; } = string.Empty;
}

internal sealed record FirstDoorRawReplayObservation
{
    public bool Available { get; init; }

    public string ObserverVersion { get; init; } = string.Empty;

    public int SchemaVersion { get; init; }

    public string Layout { get; init; } = string.Empty;

    public long FrameSequence { get; init; } = -1;

    public long NativeGameticObservedAtEvaluation { get; init; } = -1;

    public int SourceWidth { get; init; } = -1;

    public int SourceHeight { get; init; } = -1;

    public int GameplayHeight { get; init; } = -1;

    public int SampleColumns { get; init; }

    public int SampleRows { get; init; }

    public int PaletteGeneration { get; init; }

    public string ObservationHash { get; init; } = string.Empty;

    public string VisualContentHash { get; init; } = string.Empty;

    public string PaletteIndicesBase64 { get; init; } = string.Empty;

    public string PaletteRgbaBase64 { get; init; } = string.Empty;
}

internal sealed record FirstDoorIdentityWindowTraceEntry
{
    public long FrameSequence { get; init; } = -1;

    public FirstDoorEvidenceTruth Truth { get; init; }

    public string ObservationHash { get; init; } = string.Empty;
}

internal sealed record BrowserAppliedActionAck
{
    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long DecisionControlTick { get; init; }

    public long UseAttemptId { get; init; }

    public string ActionMode { get; init; } = string.Empty;

    public string HostPath { get; init; } = string.Empty;

    public bool ProposedUse { get; init; }

    public bool AppliedUse { get; init; }

    public bool UseResolved { get; init; }

    public bool EventQueued { get; init; }

    public bool PulseResolverCalled { get; init; }

    public bool ManualBlocked { get; init; }

    public bool SenseOnly { get; init; }

    public bool AppliedMoveForward { get; init; }

    public bool AppliedMoveBackward { get; init; }

    public bool AppliedStrafeLeft { get; init; }

    public bool AppliedStrafeRight { get; init; }

    public int AppliedTurnYaw { get; init; }

    public bool AppliedAttack { get; init; }

    public bool AppliedRun { get; init; }

    public long QueuedUseInputEventSequence { get; init; }

    public long PumpedUseInputEventSequence { get; init; }

    public bool UsePumped { get; init; }

    public long ManualUseSequenceAtDecision { get; init; }
}

internal sealed record BrowserFirstDoorAudioInput
{
    public int NativeEvents { get; init; }

    public IReadOnlyList<BrowserNativeAudioEventInput> Events { get; init; }
        = Array.Empty<BrowserNativeAudioEventInput>();
}

internal sealed record BrowserNativeAudioEventInput
{
    public long Sequence { get; init; }

    public int SfxId { get; init; } = -1;

    public string SfxName { get; init; } = string.Empty;
}

internal sealed record FirstDoorPlayerVitalityTrace
{
    public int TraceVersion { get; init; } = 1;

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long EvaluatedAtControlTick { get; init; }

    public bool Available { get; init; }

    public bool Fresh { get; init; }

    public string ObservationReason { get; init; }
        = "native-player-vitality-unavailable";

    public string Provenance { get; init; }
        = "native-player-vitality-unavailable";

    public string ProximityObservationHash { get; init; } = string.Empty;

    public string VitalityObservationHash { get; init; } = string.Empty;

    public long NativeGametic { get; init; } = -1;

    public int PlayerHealth { get; init; } = -1;

    public int PlayerState { get; init; } = -1;

    public int PlayerKillCount { get; init; } = -1;

    public bool DeathCandidate { get; init; }

    public string DeathCandidateReason { get; init; } = "none";

    public int ConsecutiveDeathGametics { get; init; }

    public int RequiredDeathGametics { get; init; } = 3;

    public bool NativeDeathConfirmed { get; init; }

    public long ConfirmedAtNativeGametic { get; init; } = -1;

    public long ConfirmedAtControlTick { get; init; }

    public bool NativeEvidenceAuthoritative { get; init; }

    public string Authority { get; init; } = "none";

    public bool RestartRequested { get; init; }

    public bool RestartRequestIssuedThisTick { get; init; }

    public int RestartRequestSequence { get; init; }

    public string RestartRequestId { get; init; } = string.Empty;

    public string RestartReason { get; init; } = "none";
}

internal enum FirstDoorAcquisitionBlockCode
{
    Unavailable,
    None,
    ControlNotReady,
    RawObservationUnavailable,
    RawObservationInvalid,
    DuplicateRawFrame,
    RouteIntentNotYes,
    DoorIdentityNotYes,
    IdentityWindowPending,
    CurrentObservationNotYes,
    ProximityUnavailable,
    ProximityInvalid,
    DuplicateProximityGametic,
    OutsideAcquisitionHandoffRange,
    AcquisitionBudgetExhausted,
    RawObservationMissingBudgetExhausted,
    ProximityMissingBudgetExhausted
}

internal sealed record FirstDoorAcquisitionTrace
{
    public int TraceVersion { get; init; } = 4;

    public string RawObserverVersion { get; init; } = string.Empty;

    public bool Available { get; init; }

    public long EvaluatedAtControlTick { get; init; }

    public bool ControlReady { get; init; }

    public FirstDoorAcquisitionStatus Status { get; init; }

    public bool RawObservationAvailable { get; init; }

    public bool RawObservationAccepted { get; init; }

    public string RawObservationReason { get; init; } = string.Empty;

    public long RawFrameSequence { get; init; } = -1;

    public long NativeGameticObservedAtEvaluation { get; init; } = -1;

    public int PaletteGeneration { get; init; }

    public string ObservationHash { get; init; } = string.Empty;

    public FirstDoorRawReplayObservation CurrentReplayObservation { get; init; } = new();

    public FirstDoorRawReplayObservation LastAcceptedYesReplayObservation { get; init; } = new();

    public string CandidateKind { get; init; } = string.Empty;

    public int CandidateColumn { get; init; } = -1;

    public int CandidateRow { get; init; } = -1;

    public float CandidateScore { get; init; }

    public float CandidateRedScore { get; init; }

    public float CandidateEdgeScore { get; init; }

    public string IdentityKind { get; init; } = string.Empty;

    public int AlignmentColumn { get; init; } = -1;

    public int AlignmentRow { get; init; } = -1;

    public FirstDoorEvidenceTruth RouteIntentTruth { get; init; }

    public string RouteIntentReason { get; init; } = "route-intent-unknown";

    public int RouteIntentStableFrames { get; init; }

    public int RequiredRouteIntentFrames { get; init; }

    public FirstDoorEvidenceTruth DoorIdentityTruth { get; init; }

    public string DoorIdentityReason { get; init; } = "identity-unknown";

    public float DoorIdentityConfidence { get; init; }

    public FirstDoorEvidenceTruth EffectiveDoorIdentityTruth { get; init; }

    public string EffectiveDoorIdentityReason { get; init; } = "identity-unknown";

    public float EffectiveDoorIdentityConfidence { get; init; }

    public string EffectiveDoorIdentityKind { get; init; } = string.Empty;

    public FirstDoorProximityObservation Proximity { get; init; } = new();

    public bool FreshObservation { get; init; }

    public int IdentityYesCountInWindow { get; init; }

    public int IdentityWindowSize { get; init; }

    public IReadOnlyList<FirstDoorIdentityWindowTraceEntry> IdentityWindow { get; init; }
        = Array.Empty<FirstDoorIdentityWindowTraceEntry>();

    public IReadOnlyList<FirstDoorRawReplayObservation> AcceptedYesReplayObservations { get; init; }
        = Array.Empty<FirstDoorRawReplayObservation>();

    public int RequiredIdentityYesCount { get; init; }

    public int UnknownGapFrames { get; init; }

    public int MaximumUnknownGapFrames { get; init; }

    public int ConsecutiveRawMissingFrames { get; init; }

    public int MaximumRawMissingFrames { get; init; }

    public int ConsecutiveProximityMissingFrames { get; init; }

    public int MaximumProximityMissingFrames { get; init; }

    public int PostReadinessFrames { get; init; }

    public int AcquisitionTimeoutFrames { get; init; }

    public int AcquisitionRemainingFrames { get; init; }

    public bool Ready { get; init; }

    public FirstDoorAcquisitionBlockCode BlockCode { get; init; } = FirstDoorAcquisitionBlockCode.Unavailable;

    public long AcquiredAtControlTick { get; init; }
}

/// <summary>
/// Owns a monotonic browser control clock, explicit run scope, raw native-event correlation,
/// and FirstDoor signal normalization. Prediction counters are diagnostics only.
/// </summary>
internal sealed class FirstDoorBrowserControlSession
{
    internal const string ExactActionMode = "csharp-exact";
    internal const string NativeActionHostPath = "native-action";
    internal const string KeyEventsHostPath = "key-events";

    private const float AlignmentScaleDegrees = 45f;
    private const float AlignmentToleranceDegrees = 4f;
    private const int DefaultAlignYaw = 6;
    private const int MaximumNativeAudioEventsPerPacket = 256;
    private const int RequiredNativeDeathGametics = 3;

    private readonly FirstDoorControlPolicy _policy;
    private readonly FirstDoorOpeningNavigationPolicy _openingNavigationPolicy;
    private readonly FirstDoorControlStateMachine _controller;
    private bool _initialized;
    private bool _resetSignalLatched;
    private string _lastConsumedResetOperationId = string.Empty;
    private long _controlTick;
    private string _sessionId = string.Empty;
    private string _runId = string.Empty;
    private long _runGeneration;
    private long _lastExternalRunGeneration;
    private string _lastExternalRunId = string.Empty;
    private int _lastPrediction = -1;
    private int _lastNativeAudioEvents;
    private long _lastNativeAudioSequence;
    private long _lastNativeGametic = -1;
    private long _lastNativeLevelTime = -1;
    private readonly Queue<IdentityWindowSample> _identityWindow = new();
    private int _routeIntentStableFrames;
    private int _unknownGapFrames;
    private int _consecutiveRawMissingFrames;
    private int _consecutiveProximityMissingFrames;
    private int _postReadinessFrames;
    private long _lastRawFrameSequence = -1;
    private int _paletteGeneration;
    private byte[] _paletteRgbaBytes = Array.Empty<byte>();
    private byte[] _lastRawPaletteIndices = Array.Empty<byte>();
    private FirstDoorRawPaletteEvidence? _lastRawFrameEvidence;
    private FirstDoorRawReplayObservation? _lastRawReplay;
    private FirstDoorRawReplayObservation _currentPostRouteRawReplay = new();
    private bool _currentPostRouteRawFresh;
    private FirstDoorRawPaletteEvidence? _lastAcceptedIdentityEvidence;
    private FirstDoorRawReplayObservation? _lastAcceptedIdentityReplay;
    private long _lastProximityNativeGametic = -1;
    private FirstDoorProximityObservation? _lastProximityObservation;
    private long _acquiredAtControlTick;
    private FirstDoorAcquisitionTrace? _frozenAcquisitionTrace;
    private FirstDoorControlDecision? _lastDecision;
    private FirstDoorOpeningNavigationState _openingNavigationState = new();
    private FirstDoorOpeningNavigationSnapshot _lastOpeningNavigationSnapshot = new();
    private AcknowledgedUseWindow? _acknowledgedUseWindow;
    private FirstDoorAppliedUseAckSnapshot? _lastAcceptedUseAckSnapshot;
    private long _lastVitalityNativeGametic = -1;
    private int _consecutiveNativeDeathGametics;
    private bool _nativeDeathConfirmed;
    private long _nativeDeathConfirmedAtGametic = -1;
    private long _nativeDeathConfirmedAtControlTick;
    private string _nativeDeathRestartRequestId = string.Empty;
    private FirstDoorPlayerVitalityTrace _lastVitalityTrace = new();

    internal FirstDoorBrowserControlSession(
        FirstDoorControlPolicy? policy = null,
        FirstDoorOpeningNavigationPolicy? openingNavigationPolicy = null)
    {
        _policy = policy ?? new FirstDoorControlPolicy();
        _openingNavigationPolicy = openingNavigationPolicy
            ?? new FirstDoorOpeningNavigationPolicy();
        _controller = new FirstDoorControlStateMachine(_policy);
    }

    internal PostComputerRoomActivationProof? TryCreatePostComputerRoomActivationProof(
        long expectedFirstDoorControlTick)
    {
        var decision = _lastDecision;
        if (decision is null
            || decision.ControlTick != expectedFirstDoorControlTick
            || !decision.OpenConfirmed
            || !decision.SemanticDelta.FirstDoorOpened
            || !string.IsNullOrWhiteSpace(decision.ContractError)
            || decision.State is not (FirstDoorControlState.AwaitComputerRoom or FirstDoorControlState.Complete)
            || decision.OwnershipDisposition is not (
                FirstDoorOwnershipDisposition.HandOff or FirstDoorOwnershipDisposition.Completed))
        {
            return null;
        }

        return new PostComputerRoomActivationProof
        {
            SessionId = decision.SessionId,
            RunId = decision.RunId,
            RunGeneration = decision.RunGeneration,
            ControlTick = decision.ControlTick,
            FirstDoorState = decision.State,
            FirstDoorOwnershipDisposition = decision.OwnershipDisposition,
            OpenConfirmed = true,
            OpenConfirmationSource = decision.OpenConfirmationSource,
            ComputerRoomConfirmed = decision.State == FirstDoorControlState.Complete
                && decision.SemanticDelta.ComputerRoomEntered,
            Proximity = decision.Proximity,
            RawFrame = new PostComputerRoomRawFrameProof
            {
                Available = _currentPostRouteRawReplay.Available,
                Fresh = _currentPostRouteRawFresh,
                FrameSequence = _currentPostRouteRawReplay.FrameSequence,
                NativeGameticObservedAtEvaluation = _currentPostRouteRawReplay
                    .NativeGameticObservedAtEvaluation,
                ObservationHash = _currentPostRouteRawReplay.ObservationHash
            },
            ContractError = decision.ContractError
        };
    }

    internal FirstDoorControlDecision Evaluate(BrowserFirstDoorControlInput input)
    {
        ArgumentNullException.ThrowIfNull(input);

        var controlTick = NextControlTick();
        var prediction = Math.Max(0, input.Prediction);
        var audio = input.Audio ?? new BrowserFirstDoorAudioInput();
        var nativeAudioEvents = Math.Max(0, audio.NativeEvents);
        var normalizedSessionId = NormalizeOptionalScopeId(input.SessionId);
        var explicitRunId = NormalizeOptionalScopeId(input.RunId);
        var resetOperationId = NormalizeOptionalScopeId(input.ResetOperationId);
        var lifecycleEvent = NormalizeText(input.LifecycleEvent);
        var resetEdge = string.IsNullOrEmpty(resetOperationId)
            && input.ResetRequested
            && !_resetSignalLatched;
        var resetOperation = !string.IsNullOrEmpty(resetOperationId)
            && !string.Equals(resetOperationId, _lastConsumedResetOperationId, StringComparison.Ordinal)
            && (input.ResetRequested || IsRunBoundaryLifecycleEvent(lifecycleEvent));

        var explicitSessionChanged = _initialized
            && !string.Equals(normalizedSessionId, _sessionId, StringComparison.Ordinal);
        var externalGenerationChanged = _initialized
            && input.RunGeneration > 0
            && input.RunGeneration != _lastExternalRunGeneration;
        var explicitRunIdChanged = _initialized
            && !string.IsNullOrEmpty(explicitRunId)
            && !string.Equals(explicitRunId, _lastExternalRunId, StringComparison.Ordinal);
        var beginsFreshRun = !_initialized
            || resetEdge
            || resetOperation
            || explicitSessionChanged
            || externalGenerationChanged
            || explicitRunIdChanged;
        var preflightError = ResolveBrowserContractError(input, string.Empty);
        if (string.IsNullOrEmpty(preflightError) && beginsFreshRun)
        {
            preflightError = ResolveFreshRunRawPreflightError(input);
            if (string.IsNullOrEmpty(preflightError))
            {
                preflightError = ResolveFreshRunProximityPreflightError(input);
            }
        }

        if (!string.IsNullOrEmpty(preflightError))
        {
            return EvaluateRejectedBrowserPacket(input, controlTick, prediction, preflightError);
        }

        _resetSignalLatched = input.ResetRequested;

        var anomalyCode = beginsFreshRun
            ? string.Empty
            : ResolveAnomalyCode(input, prediction, nativeAudioEvents);

        if (beginsFreshRun)
        {
            BeginGeneration(
                input,
                audio,
                normalizedSessionId,
                explicitRunId,
                prediction,
                nativeAudioEvents);
            if (!string.IsNullOrEmpty(resetOperationId))
            {
                _lastConsumedResetOperationId = resetOperationId;
            }
        }
        else
        {
            if (input.RunGeneration > 0)
            {
                _lastExternalRunGeneration = input.RunGeneration;
            }

            if (!string.IsNullOrEmpty(explicitRunId))
            {
                _lastExternalRunId = explicitRunId;
            }
        }

        var lifecycleState = NormalizeText(input.LifecycleState);
        var modelState = NormalizeText(input.ModelState);
        var controlReady = IsControlReady(lifecycleState, modelState);
        var rawObservation = ResolveRawObservation(
            input.RawObservation,
            input.NativeLevelFactsAvailable,
            input.NativeGametic);
        _currentPostRouteRawReplay = rawObservation.Available
            ? rawObservation.Replay
            : new FirstDoorRawReplayObservation();
        _currentPostRouteRawFresh = rawObservation.Fresh;
        var proximity = ResolveProximity(input, controlReady);
        var vitalityTrace = EvaluatePlayerVitality(
            proximity.Observation,
            controlTick,
            string.IsNullOrEmpty(rawObservation.ContractError)
                && string.IsNullOrEmpty(proximity.ContractError));
        var routeIntent = ResolveRouteIntent(input, controlReady);
        var acquisition = UpdateAcquisitionGate(
            routeIntent,
            rawObservation,
            proximity,
            controlReady,
            beginsFreshRun);
        var openingNavigation = EvaluateOpeningNavigation(
            controlReady,
            controlTick,
            acquisition,
            proximity.Observation);
        var computerRoomObservation = ResolveComputerRoomObservation(
            rawObservation,
            proximity.Observation);
        var ackEvaluation = ResolveAppliedActionAck(
            input.AppliedActionAck,
            input.ManualUseSequence,
            controlTick);
        TrackManualUseOverlap(input.ManualUseSequence);
        var (openEvidence, failedUseEvidence, evidenceObservationCode, manualOverlap, outcomeRejectionCode) = ResolveRawNativeEvidence(
            input,
            audio,
            controlTick,
            prediction,
            ackEvaluation);
        var mappedInput = MapInput(
            input,
            controlTick,
            prediction,
            resetRequested: beginsFreshRun,
            predictionAnomaly: !string.IsNullOrEmpty(anomalyCode),
            anomalyCode,
            acquisition,
            openingNavigation,
            computerRoomObservation,
            ResolveEffectiveIdentity(rawObservation.Evidence),
            rawObservation,
            proximity,
            openEvidence,
            failedUseEvidence,
            evidenceObservationCode,
            ackEvaluation,
            manualOverlap,
            outcomeRejectionCode);
        var controllerDecision = _controller.Evaluate(mappedInput);
        if (_acquiredAtControlTick == 0
            && controllerDecision.PreviousState == FirstDoorControlState.OpeningNavigate
            && controllerDecision.State == FirstDoorControlState.Approach
            && acquisition.Status == FirstDoorAcquisitionStatus.Ready)
        {
            _acquiredAtControlTick = controlTick;
        }

        var currentAcquisitionTrace = CreateAcquisitionTrace(
            mappedInput,
            acquisition,
            routeIntent,
            rawObservation,
            proximity,
            controlTick);
        if (_acquiredAtControlTick > 0 && _frozenAcquisitionTrace is null)
        {
            _frozenAcquisitionTrace = currentAcquisitionTrace;
        }

        var decision = controllerDecision with
        {
            AcquisitionTrace = _frozenAcquisitionTrace ?? currentAcquisitionTrace,
            VitalityTrace = vitalityTrace,
            NativeDeathConfirmed = vitalityTrace.NativeDeathConfirmed,
            RestartRequested = vitalityTrace.RestartRequested,
            RestartRequestId = vitalityTrace.RestartRequestId,
            RestartReason = vitalityTrace.RestartReason
        };

        _lastDecision = decision;
        ClearAcknowledgedUseWindowWhenClosed(decision);
        _lastPrediction = prediction;
        _lastNativeAudioEvents = nativeAudioEvents;
        if (input.NativeLevelFactsAvailable)
        {
            _lastNativeGametic = Math.Max(-1, input.NativeGametic);
            _lastNativeLevelTime = Math.Max(-1, input.NativeLevelTime);
        }

        return decision;
    }

    private FirstDoorControlDecision EvaluateRejectedBrowserPacket(
        BrowserFirstDoorControlInput input,
        long controlTick,
        int prediction,
        string contractError)
    {
        var retainedAcquisitionTrace = _frozenAcquisitionTrace
            ?? _lastDecision?.AcquisitionTrace
            ?? new FirstDoorAcquisitionTrace();
        var lifecycleState = NormalizeText(input.LifecycleState);
        var modelState = NormalizeText(input.ModelState);
        var rejectedProximity = IsControlReady(lifecycleState, modelState)
            ? FirstDoorNativeProximityObserver.Observe(CreateProximityInput(input))
            : FirstDoorNativeProximityObserver.Unavailable("control-not-ready");
        var vitalityTrace = EvaluatePlayerVitality(
            FirstDoorNativeProximityObserver.Unavailable($"packet-rejected:{contractError}"),
            controlTick,
            packetAccepted: false);
        var decision = _controller.Evaluate(new FirstDoorControlInput
        {
            ContractVersion = input.ContractVersion,
            ContractError = contractError,
            SessionId = _sessionId,
            RunId = _runId,
            RunGeneration = _runGeneration,
            ControlTick = controlTick,
            Prediction = prediction,
            ManualUseSequence = input.ManualUseSequence,
            ResetRequested = false,
            ResetOperationId = string.Empty,
            LifecycleEvent = NormalizeText(input.LifecycleEvent),
            LifecycleState = lifecycleState,
            ModelState = modelState,
            ControlReady = false,
            NativeLevelFactsAvailable = input.NativeLevelFactsAvailable,
            NativeLevelLoadSequenceAvailable = input.NativeLevelLoadSequenceAvailable,
            NativeLevelLoadSequence = input.NativeLevelLoadSequence,
            NativeLevelTime = input.NativeLevelTime,
            NativeGametic = input.NativeGametic,
            NativeLevelStartTic = input.NativeLevelStartTic,
            NativeGameState = input.NativeGameState,
            NativeGameEpisode = input.NativeGameEpisode,
            NativeGameMap = input.NativeGameMap,
            Proximity = rejectedProximity,
            OpeningNavigation = _lastOpeningNavigationSnapshot,
            AcceptedUseAck = _lastAcceptedUseAckSnapshot ?? new FirstDoorAppliedUseAckSnapshot()
        }) with
        {
            AcquisitionTrace = retainedAcquisitionTrace,
            VitalityTrace = vitalityTrace,
            NativeDeathConfirmed = vitalityTrace.NativeDeathConfirmed,
            RestartRequested = vitalityTrace.RestartRequested,
            RestartRequestId = vitalityTrace.RestartRequestId,
            RestartReason = vitalityTrace.RestartReason
        };

        _lastDecision = decision;
        return decision;
    }

    private long NextControlTick()
    {
        if (_controlTick < long.MaxValue)
        {
            _controlTick++;
        }

        return Math.Max(1, _controlTick);
    }

    private void BeginGeneration(
        BrowserFirstDoorControlInput input,
        BrowserFirstDoorAudioInput audio,
        string normalizedSessionId,
        string explicitRunId,
        int prediction,
        int nativeAudioEvents)
    {
        _runGeneration = !_initialized
            ? input.RunGeneration
            : Math.Max(_runGeneration + 1, input.RunGeneration > 0 ? input.RunGeneration : 0);
        _initialized = true;
        _sessionId = normalizedSessionId;
        _runId = explicitRunId;
        _lastExternalRunGeneration = input.RunGeneration > 0 ? input.RunGeneration : 0;
        _lastExternalRunId = explicitRunId;
        _lastPrediction = prediction;
        _lastNativeAudioEvents = nativeAudioEvents;
        _lastNativeAudioSequence = MaximumSequence(audio.Events);
        _lastNativeGametic = input.NativeLevelFactsAvailable ? Math.Max(-1, input.NativeGametic) : -1;
        _lastNativeLevelTime = input.NativeLevelFactsAvailable ? Math.Max(-1, input.NativeLevelTime) : -1;
        ResetAcquisitionEvidence(resetPostReadinessBudget: true);
        _lastRawFrameSequence = -1;
        _paletteGeneration = 0;
        _paletteRgbaBytes = Array.Empty<byte>();
        _lastRawPaletteIndices = Array.Empty<byte>();
        _lastRawFrameEvidence = null;
        _lastRawReplay = null;
        _currentPostRouteRawReplay = new FirstDoorRawReplayObservation();
        _currentPostRouteRawFresh = false;
        _lastAcceptedIdentityReplay = null;
        _lastProximityNativeGametic = -1;
        _lastProximityObservation = null;
        _acquiredAtControlTick = 0;
        _frozenAcquisitionTrace = null;
        _lastDecision = null;
        _openingNavigationState = new FirstDoorOpeningNavigationState();
        _lastOpeningNavigationSnapshot = new FirstDoorOpeningNavigationSnapshot();
        _acknowledgedUseWindow = null;
        _lastAcceptedUseAckSnapshot = null;
        ResetPlayerVitality();
    }

    private ProximityResolution ResolveProximity(
        BrowserFirstDoorControlInput input,
        bool controlReady)
    {
        if (!controlReady)
        {
            return ProximityResolution.Unavailable("control-not-ready");
        }

        var observation = FirstDoorNativeProximityObserver.Observe(CreateProximityInput(input));
        if (!observation.InputAccepted || !observation.Available)
        {
            return IsTransientProximityUnavailable(observation.Reason)
                ? new ProximityResolution(observation, ContractError: string.Empty)
                : ProximityResolution.Invalid(observation);
        }

        if (_lastProximityNativeGametic > observation.NativeGametic)
        {
            return ProximityResolution.Invalid(
                InvalidateProximityObservation(
                    observation,
                    "native-player-proximity-gametic-rewound"));
        }

        if (_lastProximityNativeGametic == observation.NativeGametic)
        {
            if (_lastProximityObservation is null
                || !string.Equals(
                    _lastProximityObservation.ObservationHash,
                    observation.ObservationHash,
                    StringComparison.Ordinal))
            {
                return ProximityResolution.Invalid(
                    InvalidateProximityObservation(
                        observation,
                        "native-player-proximity-gametic-redefined"));
            }

            return new ProximityResolution(
                _lastProximityObservation with
                {
                    Fresh = false,
                    Reason = "native-player-proximity-duplicate"
                },
                ContractError: string.Empty);
        }

        var fresh = observation with
        {
            Fresh = true,
            Reason = "native-player-proximity-fresh"
        };
        _lastProximityNativeGametic = fresh.NativeGametic;
        _lastProximityObservation = fresh;
        return new ProximityResolution(fresh, ContractError: string.Empty);
    }

    private FirstDoorPlayerVitalityTrace EvaluatePlayerVitality(
        FirstDoorProximityObservation proximity,
        long controlTick,
        bool packetAccepted)
    {
        var available = packetAccepted
            && proximity.InputAccepted
            && proximity.Available
            && proximity.PlayerVitalityFactsAvailable
            && proximity.NativeGametic >= 0
            && !string.IsNullOrEmpty(proximity.PlayerVitalityObservationHash);
        var fresh = available
            && proximity.Fresh
            && proximity.NativeGametic != _lastVitalityNativeGametic;
        var healthDead = available && proximity.PlayerHealth <= 0;
        var playerStateDead = available && proximity.PlayerState == 1;
        var deathCandidate = healthDead || playerStateDead;
        var restartRequestIssuedThisTick = false;

        if (!_nativeDeathConfirmed)
        {
            if (!packetAccepted || !available)
            {
                if (packetAccepted)
                {
                    _consecutiveNativeDeathGametics = 0;
                }
            }
            else if (fresh)
            {
                _lastVitalityNativeGametic = proximity.NativeGametic;
                _consecutiveNativeDeathGametics = deathCandidate
                    ? Math.Min(
                        RequiredNativeDeathGametics,
                        SaturatingIncrement(_consecutiveNativeDeathGametics))
                    : 0;

                if (_consecutiveNativeDeathGametics >= RequiredNativeDeathGametics)
                {
                    _nativeDeathConfirmed = true;
                    _nativeDeathConfirmedAtGametic = proximity.NativeGametic;
                    _nativeDeathConfirmedAtControlTick = controlTick;
                    _nativeDeathRestartRequestId = string.Concat(
                        "native-death:",
                        _runGeneration.ToString(System.Globalization.CultureInfo.InvariantCulture),
                        ":",
                        proximity.NativeGametic.ToString(
                            System.Globalization.CultureInfo.InvariantCulture),
                        ":",
                        proximity.PlayerVitalityObservationHash);
                    restartRequestIssuedThisTick = true;
                }
            }
        }
        else if (fresh)
        {
            _lastVitalityNativeGametic = proximity.NativeGametic;
        }

        var trace = new FirstDoorPlayerVitalityTrace
        {
            SessionId = _sessionId,
            RunId = _runId,
            RunGeneration = _runGeneration,
            EvaluatedAtControlTick = controlTick,
            Available = available,
            Fresh = fresh,
            ObservationReason = proximity.Reason,
            Provenance = available
                ? proximity.PlayerVitalityProvenance
                : "native-player-vitality-unavailable",
            ProximityObservationHash = available
                ? proximity.ObservationHash
                : string.Empty,
            VitalityObservationHash = available
                ? proximity.PlayerVitalityObservationHash
                : string.Empty,
            NativeGametic = available ? proximity.NativeGametic : -1,
            PlayerHealth = available ? proximity.PlayerHealth : -1,
            PlayerState = available ? proximity.PlayerState : -1,
            PlayerKillCount = available ? proximity.PlayerKillCount : -1,
            DeathCandidate = deathCandidate,
            DeathCandidateReason = ResolveNativeDeathCandidateReason(
                available,
                healthDead,
                playerStateDead),
            ConsecutiveDeathGametics = _consecutiveNativeDeathGametics,
            RequiredDeathGametics = RequiredNativeDeathGametics,
            NativeDeathConfirmed = _nativeDeathConfirmed,
            ConfirmedAtNativeGametic = _nativeDeathConfirmedAtGametic,
            ConfirmedAtControlTick = _nativeDeathConfirmedAtControlTick,
            NativeEvidenceAuthoritative = _nativeDeathConfirmed,
            Authority = _nativeDeathConfirmed ? "native-player-vitality" : "none",
            RestartRequested = _nativeDeathConfirmed,
            RestartRequestIssuedThisTick = restartRequestIssuedThisTick,
            RestartRequestSequence = _nativeDeathConfirmed ? 1 : 0,
            RestartRequestId = _nativeDeathRestartRequestId,
            RestartReason = _nativeDeathConfirmed
                ? "native-player-death-confirmed"
                : "none"
        };
        _lastVitalityTrace = trace;
        return trace;
    }

    private static string ResolveNativeDeathCandidateReason(
        bool available,
        bool healthDead,
        bool playerStateDead)
    {
        if (!available)
        {
            return "native-player-vitality-unavailable";
        }

        if (healthDead && playerStateDead)
        {
            return "native-health-and-player-state-dead";
        }

        if (healthDead)
        {
            return "native-health-dead";
        }

        return playerStateDead
            ? "native-player-state-dead"
            : "native-player-alive";
    }

    private void ResetPlayerVitality()
    {
        _lastVitalityNativeGametic = -1;
        _consecutiveNativeDeathGametics = 0;
        _nativeDeathConfirmed = false;
        _nativeDeathConfirmedAtGametic = -1;
        _nativeDeathConfirmedAtControlTick = 0;
        _nativeDeathRestartRequestId = string.Empty;
        _lastVitalityTrace = new FirstDoorPlayerVitalityTrace();
    }

    private FirstDoorOpeningNavigationSnapshot EvaluateOpeningNavigation(
        bool controlReady,
        long controlTick,
        AcquisitionGateEvaluation acquisition,
        FirstDoorProximityObservation proximity)
    {
        var openingUnitActive = _lastDecision is null
            || _lastDecision.State is FirstDoorControlState.OpeningTransit
                or FirstDoorControlState.OpeningNavigate;
        if (!openingUnitActive)
        {
            return _lastOpeningNavigationSnapshot;
        }

        var transition = FirstDoorOpeningNavigator.EvaluateTransition(
            _openingNavigationState,
            new FirstDoorOpeningNavigationInput
            {
                ControlReady = controlReady,
                ControlTick = controlTick,
                AcquisitionReady = acquisition.Ready,
                Proximity = proximity
            },
            _openingNavigationPolicy);
        _openingNavigationState = transition.State;
        _lastOpeningNavigationSnapshot = transition.Snapshot;
        return transition.Snapshot;
    }

    private static FirstDoorProximityObservation InvalidateProximityObservation(
        FirstDoorProximityObservation observation,
        string reason)
        => observation with
        {
            InputAccepted = false,
            Available = false,
            Fresh = false,
            Truth = FirstDoorEvidenceTruth.Unknown,
            Reason = reason,
            WithinAcquisitionRange = false,
            WithinContactApproachRange = false,
            WithinUseRange = false
        };

    private FirstDoorNativeProximityInput CreateProximityInput(
        BrowserFirstDoorControlInput input)
        => new()
        {
            ContractVersion = input.ContractVersion,
            WadContentSha256 = input.WadContentSha256,
            NativeLevelFactsAvailable = input.NativeLevelFactsAvailable,
            NativeGametic = input.NativeGametic,
            NativeGameState = input.NativeGameState,
            NativeGameEpisode = input.NativeGameEpisode,
            NativeGameMap = input.NativeGameMap,
            NativePlayerFactsAvailable = input.NativePlayerFactsAvailable,
            NativePlayerXFixed = input.NativePlayerXFixed,
            NativePlayerYFixed = input.NativePlayerYFixed,
            NativePlayerAngleBam = input.NativePlayerAngleBam,
            NativePlayerMomentumXFixed = input.NativePlayerMomentumXFixed,
            NativePlayerMomentumYFixed = input.NativePlayerMomentumYFixed,
            NativePlayerSectorIndex = input.NativePlayerSectorIndex,
            NativePlayerVitalityFactsAvailable = input.NativePlayerVitalityFactsAvailable,
            NativePlayerHealth = input.NativePlayerHealth,
            NativePlayerState = input.NativePlayerState,
            NativePlayerKillCount = input.NativePlayerKillCount,
            AcquisitionMaximumDistance = _policy.AcquisitionMaximumDistance,
            ContactApproachMaximumDistance = _policy.ContactApproachMaximumDistance,
            UseMaximumDistance = _policy.UseMaximumDistance
        };

    private string ResolveAnomalyCode(
        BrowserFirstDoorControlInput input,
        int prediction,
        int nativeAudioEvents)
    {
        var anomalies = new List<string>(4);
        if (prediction < _lastPrediction)
        {
            anomalies.Add("prediction-rewound");
        }

        if (nativeAudioEvents < _lastNativeAudioEvents)
        {
            anomalies.Add("native-audio-counter-rewound");
        }

        if (input.NativeLevelFactsAvailable
            && _lastNativeGametic >= 0
            && input.NativeGametic >= 0
            && input.NativeGametic < _lastNativeGametic)
        {
            anomalies.Add("native-gametic-rewound-without-run-transition");
        }

        if (input.NativeLevelFactsAvailable
            && _lastNativeLevelTime >= 0
            && input.NativeLevelTime >= 0
            && input.NativeLevelTime < _lastNativeLevelTime)
        {
            anomalies.Add("native-leveltime-rewound-without-run-transition");
        }

        return string.Join("+", anomalies);
    }

    private RawObservationResolution ResolveRawObservation(
        BrowserFirstDoorRawObservation? wire,
        bool nativeLevelFactsAvailable,
        long nativeGametic)
    {
        var input = wire ?? new BrowserFirstDoorRawObservation();
        if (!input.Available)
        {
            return RawObservationResolution.Unavailable("raw-observation-unavailable");
        }

        if (input.SchemaVersion != FirstDoorRawPaletteObserver.CurrentContractVersion
            || !string.Equals(input.Layout, FirstDoorRawPaletteObserver.LayoutId, StringComparison.Ordinal)
            || input.SourceWidth != FirstDoorRawPaletteObserver.SourceWidth
            || input.SourceHeight != FirstDoorRawPaletteObserver.SourceHeight
            || input.GameplayHeight != FirstDoorRawPaletteObserver.GameplayHeight
            || input.SampleColumns != FirstDoorRawPaletteObserver.SampleColumns
            || input.SampleRows != FirstDoorRawPaletteObserver.SampleRows
            || input.FrameSequence < 0
            || input.NativeGameticObservedAtEvaluation < -1
            || input.PaletteGeneration <= 0)
        {
            return RawObservationResolution.Invalid("invalid-raw-observation-metadata");
        }

        if ((input.PaletteIndicesBase64?.Length ?? 0) != 348
            || (input.PaletteRgbaBase64?.Length ?? 0) != 1368)
        {
            return RawObservationResolution.Invalid("invalid-raw-observation-base64-length");
        }

        if (nativeLevelFactsAvailable
            && input.NativeGameticObservedAtEvaluation != nativeGametic)
        {
            return RawObservationResolution.Invalid("raw-native-gametic-evaluation-mismatch");
        }

        byte[] indices;
        byte[] palette;
        try
        {
            indices = Convert.FromBase64String(input.PaletteIndicesBase64 ?? string.Empty);
            palette = Convert.FromBase64String(input.PaletteRgbaBase64 ?? string.Empty);
        }
        catch (FormatException)
        {
            return RawObservationResolution.Invalid("invalid-raw-observation-base64");
        }

        if (indices.Length != FirstDoorRawPaletteObserver.SampleCount
            || palette.Length != FirstDoorRawPaletteObserver.PaletteRgbaByteCount)
        {
            return RawObservationResolution.Invalid("invalid-raw-observation-length");
        }

        if (_paletteGeneration > input.PaletteGeneration)
        {
            return RawObservationResolution.Invalid("raw-palette-generation-rewound");
        }

        if (_paletteGeneration == input.PaletteGeneration
            && _paletteRgbaBytes.Length > 0
            && !_paletteRgbaBytes.AsSpan().SequenceEqual(palette))
        {
            return RawObservationResolution.Invalid("raw-palette-generation-redefined");
        }

        if (_lastRawFrameSequence > input.FrameSequence)
        {
            return RawObservationResolution.Invalid("raw-frame-sequence-rewound");
        }

        var fresh = input.FrameSequence > _lastRawFrameSequence;
        if (!fresh)
        {
            if (_lastRawFrameEvidence is null
                || _lastRawReplay is null
                || _lastRawFrameEvidence.PaletteGeneration != input.PaletteGeneration
                || _lastRawPaletteIndices.Length != indices.Length
                || !_lastRawPaletteIndices.AsSpan().SequenceEqual(indices))
            {
                return RawObservationResolution.Invalid("raw-frame-sequence-redefined");
            }

            return new RawObservationResolution(
                Available: true,
                Fresh: false,
                Evidence: _lastRawFrameEvidence,
                Replay: _lastRawReplay,
                ContractError: string.Empty);
        }

        var observation = new FirstDoorRawPaletteObservation
        {
            ContractVersion = input.SchemaVersion,
            Available = true,
            FrameSequence = input.FrameSequence,
            NativeGameticObservedAtEvaluation = input.NativeGameticObservedAtEvaluation,
            SourceWidth = input.SourceWidth,
            SourceHeight = input.SourceHeight,
            GameplayHeight = input.GameplayHeight,
            Layout = input.Layout,
            Columns = input.SampleColumns,
            Rows = input.SampleRows,
            PaletteIndices = indices,
            PaletteAvailable = true,
            PaletteGeneration = input.PaletteGeneration,
            PaletteProvenance = "browser-playpal-rgba-v1",
            PaletteRgbaBytes = palette
        };
        var evidence = FirstDoorRawPaletteObserver.Observe(observation);
        if (!evidence.InputAccepted)
        {
            return RawObservationResolution.Invalid($"raw-observer-rejected:{evidence.Reason}", evidence);
        }

        _lastRawFrameSequence = input.FrameSequence;
        _paletteGeneration = input.PaletteGeneration;
        _paletteRgbaBytes = palette.ToArray();
        _lastRawPaletteIndices = indices.ToArray();
        _lastRawFrameEvidence = evidence;
        _lastRawReplay = CreateReplayObservation(input, indices, palette, evidence);

        return new RawObservationResolution(
            Available: true,
            Fresh: fresh,
            Evidence: evidence,
            Replay: _lastRawReplay,
            ContractError: string.Empty);
    }

    private static FirstDoorRawReplayObservation CreateReplayObservation(
        BrowserFirstDoorRawObservation input,
        byte[] indices,
        byte[] palette,
        FirstDoorRawPaletteEvidence evidence)
        => new()
        {
            Available = true,
            ObserverVersion = evidence.ObserverVersion,
            SchemaVersion = input.SchemaVersion,
            Layout = input.Layout,
            FrameSequence = input.FrameSequence,
            NativeGameticObservedAtEvaluation = input.NativeGameticObservedAtEvaluation,
            SourceWidth = input.SourceWidth,
            SourceHeight = input.SourceHeight,
            GameplayHeight = input.GameplayHeight,
            SampleColumns = input.SampleColumns,
            SampleRows = input.SampleRows,
            PaletteGeneration = input.PaletteGeneration,
            ObservationHash = evidence.ObservationHash,
            VisualContentHash = evidence.VisualContentHash,
            PaletteIndicesBase64 = Convert.ToBase64String(indices),
            PaletteRgbaBase64 = Convert.ToBase64String(palette)
        };

    private static RouteIntentFact ResolveRouteIntent(
        BrowserFirstDoorControlInput input,
        bool controlReady)
    {
        if (!controlReady)
        {
            return new RouteIntentFact(FirstDoorEvidenceTruth.Unknown, "control-not-ready");
        }

        if (!input.NativeLevelFactsAvailable)
        {
            return new RouteIntentFact(FirstDoorEvidenceTruth.Unknown, "native-level-facts-unavailable");
        }

        if (!input.NativeLevelLoadSequenceAvailable || input.NativeLevelLoadSequence <= 0)
        {
            return new RouteIntentFact(FirstDoorEvidenceTruth.Unknown, "native-level-sequence-unavailable");
        }

        if (input.NativeGameState < 0
            || input.NativeGameEpisode <= 0
            || input.NativeGameMap <= 0)
        {
            return new RouteIntentFact(FirstDoorEvidenceTruth.Unknown, "native-map-facts-incomplete");
        }

        if (input.NativeGameState != 0)
        {
            return new RouteIntentFact(FirstDoorEvidenceTruth.No, $"native-game-state:{input.NativeGameState}");
        }

        if (input.NativeGameEpisode != 1 || input.NativeGameMap != 1)
        {
            return new RouteIntentFact(
                FirstDoorEvidenceTruth.No,
                $"unsupported-map:e{input.NativeGameEpisode}m{input.NativeGameMap}");
        }

        return new RouteIntentFact(FirstDoorEvidenceTruth.Yes, "first-door-target:native-e1m1");
    }

    private AcquisitionGateEvaluation UpdateAcquisitionGate(
        RouteIntentFact routeIntent,
        RawObservationResolution raw,
        ProximityResolution proximity,
        bool controlReady,
        bool beginsFreshRun)
    {
        if (!string.IsNullOrEmpty(raw.ContractError))
        {
            return new AcquisitionGateEvaluation(
                FirstDoorAcquisitionStatus.Expired,
                raw.ContractError,
                Ready: false);
        }

        if (!string.IsNullOrEmpty(proximity.ContractError))
        {
            return new AcquisitionGateEvaluation(
                FirstDoorAcquisitionStatus.Expired,
                proximity.ContractError,
                Ready: false);
        }

        if (beginsFreshRun)
        {
            return AcquisitionGateEvaluation.Waiting;
        }

        if (!controlReady)
        {
            ResetAcquisitionEvidence(resetPostReadinessBudget: false);
            return AcquisitionGateEvaluation.Waiting;
        }

        _postReadinessFrames = SaturatingIncrement(_postReadinessFrames);

        if (routeIntent.Truth != FirstDoorEvidenceTruth.Yes)
        {
            _routeIntentStableFrames = 0;
            ResetIdentityEvidence();
        }
        else
        {
            _routeIntentStableFrames = SaturatingIncrement(_routeIntentStableFrames);
            UpdateIdentityEvidence(raw);
        }

        if (!raw.Available)
        {
            _consecutiveRawMissingFrames = SaturatingIncrement(_consecutiveRawMissingFrames);
        }
        else if (raw.Fresh)
        {
            _consecutiveRawMissingFrames = 0;
        }

        if (!proximity.Observation.Available || !proximity.Observation.Fresh)
        {
            _consecutiveProximityMissingFrames = SaturatingIncrement(
                _consecutiveProximityMissingFrames);
        }
        else
        {
            _consecutiveProximityMissingFrames = 0;
        }

        var ready = routeIntent.Truth == FirstDoorEvidenceTruth.Yes
            && _routeIntentStableFrames >= Math.Max(1, _policy.AcquisitionRequiredRouteFrames)
            && raw.Fresh
            && raw.Evidence.Truth == FirstDoorEvidenceTruth.Yes
            && IdentityYesCount() >= Math.Max(1, _policy.AcquisitionRequiredIdentityFrames)
            && proximity.Observation.InputAccepted
            && proximity.Observation.Available
            && proximity.Observation.Fresh
            && proximity.Observation.WithinAcquisitionRange;
        if (ready)
        {
            return new AcquisitionGateEvaluation(
                FirstDoorAcquisitionStatus.Ready,
                string.Empty,
                Ready: true);
        }

        if (_consecutiveRawMissingFrames >= Math.Max(1, _policy.AcquisitionMaximumRawMissingFrames))
        {
            return new AcquisitionGateEvaluation(
                FirstDoorAcquisitionStatus.Expired,
                "first-door-raw-observation-missing-budget-exhausted",
                Ready: false);
        }

        if (_consecutiveProximityMissingFrames
            >= Math.Max(1, _policy.AcquisitionMaximumProximityMissingFrames))
        {
            return new AcquisitionGateEvaluation(
                FirstDoorAcquisitionStatus.Expired,
                "first-door-proximity-missing-budget-exhausted",
                Ready: false);
        }

        if (_postReadinessFrames >= Math.Max(1, _policy.AcquisitionTimeoutFrames))
        {
            return new AcquisitionGateEvaluation(
                FirstDoorAcquisitionStatus.Expired,
                "first-door-acquisition-budget-exhausted",
                Ready: false);
        }

        return AcquisitionGateEvaluation.Waiting;
    }

    private void UpdateIdentityEvidence(RawObservationResolution raw)
    {
        if (!raw.Available)
        {
            _unknownGapFrames = SaturatingIncrement(_unknownGapFrames);
            ExpireIdentityAfterUnknownGap();
            return;
        }

        if (!raw.Fresh)
        {
            return;
        }

        var evidence = raw.Evidence;
        if (evidence.Truth == FirstDoorEvidenceTruth.No)
        {
            ResetIdentityEvidence();
            return;
        }

        _identityWindow.Enqueue(new IdentityWindowSample(
            evidence.FrameSequence,
            evidence.Truth,
            evidence.ObservationHash,
            evidence.Truth == FirstDoorEvidenceTruth.Yes ? raw.Replay : null));
        while (_identityWindow.Count > Math.Max(1, _policy.AcquisitionIdentityWindowFrames))
        {
            _identityWindow.Dequeue();
        }

        if (evidence.Truth == FirstDoorEvidenceTruth.Yes)
        {
            _unknownGapFrames = 0;
            _lastAcceptedIdentityEvidence = evidence;
            _lastAcceptedIdentityReplay = raw.Replay;
        }
        else
        {
            _unknownGapFrames = SaturatingIncrement(_unknownGapFrames);
            ExpireIdentityAfterUnknownGap();
        }
    }

    private void ExpireIdentityAfterUnknownGap()
    {
        if (_unknownGapFrames <= Math.Max(0, _policy.AcquisitionMaximumUnknownGapFrames))
        {
            return;
        }

        _identityWindow.Clear();
        _lastAcceptedIdentityEvidence = null;
        _lastAcceptedIdentityReplay = null;
    }

    private void ResetAcquisitionEvidence(bool resetPostReadinessBudget)
    {
        _routeIntentStableFrames = 0;
        _consecutiveRawMissingFrames = 0;
        _consecutiveProximityMissingFrames = 0;
        ResetIdentityEvidence();
        if (resetPostReadinessBudget)
        {
            _postReadinessFrames = 0;
        }
    }

    private void ResetIdentityEvidence()
    {
        _identityWindow.Clear();
        _unknownGapFrames = 0;
        _lastAcceptedIdentityEvidence = null;
        _lastAcceptedIdentityReplay = null;
    }

    private int IdentityYesCount()
        => _identityWindow.Count(item => item.Truth == FirstDoorEvidenceTruth.Yes);

    private DoorIdentityFact ResolveEffectiveIdentity(FirstDoorRawPaletteEvidence current)
    {
        if (current.Truth == FirstDoorEvidenceTruth.Yes)
        {
            return DoorIdentityFact.FromEvidence(current);
        }

        if (current.Truth == FirstDoorEvidenceTruth.No)
        {
            return DoorIdentityFact.FromEvidence(current);
        }

        return _lastAcceptedIdentityEvidence is not null
            && _unknownGapFrames <= Math.Max(0, _policy.AcquisitionMaximumUnknownGapFrames)
                ? DoorIdentityFact.FromEvidence(
                    _lastAcceptedIdentityEvidence,
                    $"retained-bounded:{current.Reason}")
                : DoorIdentityFact.FromEvidence(current);
    }

    private FirstDoorComputerRoomObservation ResolveComputerRoomObservation(
        RawObservationResolution raw,
        FirstDoorProximityObservation proximity)
    {
        var evidence = raw.Evidence;
        if (!raw.Available || !evidence.InputAccepted)
        {
            return new FirstDoorComputerRoomObservation
            {
                Available = false,
                Fresh = false,
                Truth = FirstDoorEvidenceTruth.Unknown,
                Reason = string.IsNullOrWhiteSpace(raw.ContractError)
                    ? evidence.Reason
                    : raw.ContractError
            };
        }

        var structuredBlueApplied = _lastDecision?.OpenConfirmed == true
            && raw.Fresh
            && ComputerRoomTopologyConfirmed(proximity)
            && evidence.ComputerRoomStructuredBlueScore > evidence.ComputerBlueScore;
        var effectiveBlueScore = structuredBlueApplied
            ? evidence.ComputerRoomStructuredBlueScore
            : evidence.ComputerBlueScore;
        var effectiveRoomScore = structuredBlueApplied
            ? Round2(Math.Clamp(
                (effectiveBlueScore * 0.28d)
                + (evidence.ComputerRedLightScore * 0.22d)
                + (evidence.ComputerDarkPanelScore * 0.24d)
                + (evidence.ComputerPanelScore * 0.18d)
                + (evidence.DarkAreaScore * 0.08d),
                0d,
                1d))
            : evidence.ComputerRoomScore;
        var common = new FirstDoorComputerRoomObservation
        {
            Available = true,
            Fresh = raw.Fresh,
            ObservationHash = evidence.ObservationHash,
            VisualContentHash = evidence.VisualContentHash,
            FirstDoorIdentityTruth = evidence.Truth,
            FirstDoorCandidateScore = evidence.Score,
            RoomScore = effectiveRoomScore,
            RawRoomScore = evidence.ComputerRoomScore,
            BlueScore = effectiveBlueScore,
            RawBlueScore = evidence.ComputerBlueScore,
            StructuredBlueScore = evidence.ComputerRoomStructuredBlueScore,
            StructuredBlueCellCount = evidence.ComputerRoomStructuredBlueCellCount,
            StructuredBlueRowCount = evidence.ComputerRoomStructuredBlueRowCount,
            StructuredBlueColumnCount = evidence.ComputerRoomStructuredBlueColumnCount,
            StructuredBlueApplied = structuredBlueApplied,
            RedLightScore = evidence.ComputerRedLightScore,
            DarkPanelScore = evidence.ComputerDarkPanelScore,
            PanelScore = evidence.ComputerPanelScore,
            GameplayLuma = evidence.GameplayLuma,
            CurrentReplayObservation = raw.Replay
        };
        if (!raw.Fresh)
        {
            return common with
            {
                Truth = FirstDoorEvidenceTruth.Unknown,
                Reason = "duplicate-raw-frame"
            };
        }

        if (evidence.Truth == FirstDoorEvidenceTruth.Yes)
        {
            return common with
            {
                Truth = FirstDoorEvidenceTruth.No,
                Reason = "first-door-identity-still-visible"
            };
        }

        if (evidence.Score >= _policy.ComputerRoomMaximumFirstDoorResidualScore)
        {
            return common with
            {
                Truth = FirstDoorEvidenceTruth.No,
                Reason = "first-door-residual-score-not-separated"
            };
        }

        var cueReady = effectiveBlueScore >= _policy.ComputerRoomMinimumBlueScore
            || evidence.ComputerRedLightScore >= _policy.ComputerRoomMinimumRedLightScore
            || (evidence.ComputerDarkPanelScore >= _policy.ComputerRoomMinimumDarkPanelScore
                && evidence.ComputerPanelScore >= _policy.ComputerRoomMinimumPanelScore);
        var roomReady = effectiveRoomScore >= _policy.ComputerRoomMinimumScore
            && cueReady
            && evidence.GameplayLuma > 0
            && evidence.GameplayLuma <= _policy.ComputerRoomMaximumGameplayLuma;
        return common with
        {
            Truth = roomReady ? FirstDoorEvidenceTruth.Yes : FirstDoorEvidenceTruth.No,
            Reason = roomReady
                ? "computer-room-cues-ready"
                : "computer-room-cues-below-threshold"
        };
    }

    private static bool ComputerRoomTopologyConfirmed(FirstDoorProximityObservation proximity)
        => proximity is
        {
            Available: true,
            Fresh: true,
            WadVerified: true,
            NativeGameEpisode: 1,
            NativeGameMap: 1,
            PlayerSectorIndex: 7
        };

    private FirstDoorAcquisitionTrace CreateAcquisitionTrace(
        FirstDoorControlInput mappedInput,
        AcquisitionGateEvaluation acquisition,
        RouteIntentFact routeIntent,
        RawObservationResolution raw,
        ProximityResolution proximity,
        long controlTick)
    {
        var evidence = raw.Evidence;
        var effectiveIdentity = ResolveEffectiveIdentity(evidence);
        return new FirstDoorAcquisitionTrace
        {
            Available = true,
            RawObserverVersion = evidence.ObserverVersion,
            EvaluatedAtControlTick = controlTick,
            ControlReady = mappedInput.ControlReady,
            Status = acquisition.Status,
            RawObservationAvailable = raw.Available,
            RawObservationAccepted = evidence.InputAccepted,
            RawObservationReason = string.IsNullOrEmpty(raw.ContractError)
                ? evidence.Reason
                : raw.ContractError,
            RawFrameSequence = evidence.FrameSequence,
            NativeGameticObservedAtEvaluation = evidence.NativeGameticObservedAtEvaluation,
            PaletteGeneration = (int)Math.Clamp(evidence.PaletteGeneration, 0, int.MaxValue),
            ObservationHash = evidence.ObservationHash,
            CurrentReplayObservation = raw.Replay,
            LastAcceptedYesReplayObservation = _lastAcceptedIdentityReplay
                ?? new FirstDoorRawReplayObservation(),
            CandidateKind = evidence.CandidateKind,
            CandidateColumn = evidence.Box?.Column ?? -1,
            CandidateRow = evidence.Box?.Row ?? -1,
            CandidateScore = (float)evidence.Score,
            CandidateRedScore = (float)evidence.RedScore,
            CandidateEdgeScore = (float)evidence.EdgeScore,
            IdentityKind = evidence.IdentityKind,
            AlignmentColumn = evidence.AlignmentBox?.Column ?? -1,
            AlignmentRow = evidence.AlignmentBox?.Row ?? -1,
            RouteIntentTruth = routeIntent.Truth,
            RouteIntentReason = routeIntent.Reason,
            RouteIntentStableFrames = _routeIntentStableFrames,
            RequiredRouteIntentFrames = Math.Max(1, _policy.AcquisitionRequiredRouteFrames),
            DoorIdentityTruth = evidence.Truth,
            DoorIdentityReason = evidence.Reason,
            DoorIdentityConfidence = (float)Math.Clamp(evidence.IdentityConfidence, 0d, 1d),
            EffectiveDoorIdentityTruth = effectiveIdentity.Truth,
            EffectiveDoorIdentityReason = effectiveIdentity.Reason,
            EffectiveDoorIdentityConfidence = effectiveIdentity.Confidence,
            EffectiveDoorIdentityKind = effectiveIdentity.Kind,
            Proximity = proximity.Observation,
            FreshObservation = raw.Fresh,
            IdentityYesCountInWindow = IdentityYesCount(),
            IdentityWindowSize = _identityWindow.Count,
            IdentityWindow = _identityWindow
                .Select(item => new FirstDoorIdentityWindowTraceEntry
                {
                    FrameSequence = item.FrameSequence,
                    Truth = item.Truth,
                    ObservationHash = item.ObservationHash
                })
                .ToArray(),
            AcceptedYesReplayObservations = _identityWindow
                .Where(item => item.Truth == FirstDoorEvidenceTruth.Yes && item.Replay is not null)
                .Select(item => item.Replay!)
                .ToArray(),
            RequiredIdentityYesCount = Math.Max(1, _policy.AcquisitionRequiredIdentityFrames),
            UnknownGapFrames = _unknownGapFrames,
            MaximumUnknownGapFrames = Math.Max(0, _policy.AcquisitionMaximumUnknownGapFrames),
            ConsecutiveRawMissingFrames = _consecutiveRawMissingFrames,
            MaximumRawMissingFrames = Math.Max(1, _policy.AcquisitionMaximumRawMissingFrames),
            ConsecutiveProximityMissingFrames = _consecutiveProximityMissingFrames,
            MaximumProximityMissingFrames = Math.Max(
                1,
                _policy.AcquisitionMaximumProximityMissingFrames),
            PostReadinessFrames = _postReadinessFrames,
            AcquisitionTimeoutFrames = Math.Max(1, _policy.AcquisitionTimeoutFrames),
            AcquisitionRemainingFrames = Math.Max(
                0,
                Math.Max(1, _policy.AcquisitionTimeoutFrames) - _postReadinessFrames),
            Ready = acquisition.Ready,
            BlockCode = ResolveAcquisitionBlockCode(
                mappedInput,
                acquisition,
                routeIntent,
                raw,
                proximity),
            AcquiredAtControlTick = _acquiredAtControlTick
        };
    }

    private FirstDoorAcquisitionBlockCode ResolveAcquisitionBlockCode(
        FirstDoorControlInput mappedInput,
        AcquisitionGateEvaluation acquisition,
        RouteIntentFact routeIntent,
        RawObservationResolution raw,
        ProximityResolution proximity)
    {
        if (!mappedInput.ControlReady)
        {
            return FirstDoorAcquisitionBlockCode.ControlNotReady;
        }

        if (acquisition.Status == FirstDoorAcquisitionStatus.Expired)
        {
            return acquisition.FailureCode.Contains("raw-observation-missing", StringComparison.Ordinal)
                ? FirstDoorAcquisitionBlockCode.RawObservationMissingBudgetExhausted
                : acquisition.FailureCode.Contains("proximity-missing", StringComparison.Ordinal)
                    ? FirstDoorAcquisitionBlockCode.ProximityMissingBudgetExhausted
                    : acquisition.FailureCode.Contains("proximity", StringComparison.Ordinal)
                        || acquisition.FailureCode.Contains("wad-sha256", StringComparison.Ordinal)
                        || acquisition.FailureCode.Contains("native-player", StringComparison.Ordinal)
                            ? FirstDoorAcquisitionBlockCode.ProximityInvalid
                : acquisition.FailureCode.Contains("raw-", StringComparison.Ordinal)
                    ? FirstDoorAcquisitionBlockCode.RawObservationInvalid
                    : FirstDoorAcquisitionBlockCode.AcquisitionBudgetExhausted;
        }

        if (!raw.Available)
        {
            return FirstDoorAcquisitionBlockCode.RawObservationUnavailable;
        }

        if (!raw.Fresh)
        {
            return FirstDoorAcquisitionBlockCode.DuplicateRawFrame;
        }

        if (routeIntent.Truth != FirstDoorEvidenceTruth.Yes
            || _routeIntentStableFrames < Math.Max(1, _policy.AcquisitionRequiredRouteFrames))
        {
            return FirstDoorAcquisitionBlockCode.RouteIntentNotYes;
        }

        if (raw.Evidence.Truth != FirstDoorEvidenceTruth.Yes)
        {
            return FirstDoorAcquisitionBlockCode.DoorIdentityNotYes;
        }

        if (IdentityYesCount() < Math.Max(1, _policy.AcquisitionRequiredIdentityFrames))
        {
            return FirstDoorAcquisitionBlockCode.IdentityWindowPending;
        }

        if (!proximity.Observation.Available)
        {
            return FirstDoorAcquisitionBlockCode.ProximityUnavailable;
        }

        if (!proximity.Observation.Fresh)
        {
            return FirstDoorAcquisitionBlockCode.DuplicateProximityGametic;
        }

        if (!proximity.Observation.WithinAcquisitionRange)
        {
            return FirstDoorAcquisitionBlockCode.OutsideAcquisitionHandoffRange;
        }

        return acquisition.Ready
            ? FirstDoorAcquisitionBlockCode.None
            : FirstDoorAcquisitionBlockCode.CurrentObservationNotYes;
    }

    private (
        FirstDoorOpenEvidence Open,
        FirstDoorFailedUseEvidence Failed,
        string ObservationCode,
        bool ManualOverlap,
        string OutcomeRejectionCode) ResolveRawNativeEvidence(
        BrowserFirstDoorControlInput input,
        BrowserFirstDoorAudioInput audio,
        long controlTick,
        int prediction,
        AppliedActionAckEvaluation ackEvaluation)
    {
        var newEvents = (audio.Events ?? Array.Empty<BrowserNativeAudioEventInput>())
            .Where(item => item is not null && item.Sequence > _lastNativeAudioSequence)
            .OrderBy(item => item.Sequence)
            .ToArray();
        if (newEvents.Length > 0)
        {
            _lastNativeAudioSequence = newEvents[^1].Sequence;
        }

        var visualOnly = VisualOnlyOpenEvidence();
        if (newEvents.Length == 0)
        {
            return (visualOnly, new FirstDoorFailedUseEvidence(), "none", false, string.Empty);
        }

        var hasDoorOutcome = newEvents.Any(item =>
        {
            var name = NormalizeSfxName(item.SfxName);
            return name is "doropn" or "noway";
        });
        var manualOverlap = hasDoorOutcome
            && (ackEvaluation.Code == "manual-use-overlap"
                || _acknowledgedUseWindow?.ManualOverlapObserved == true
                || (_acknowledgedUseWindow is not null
                    && input.ManualUseSequence != _acknowledgedUseWindow.ManualUseSequenceBaseline));
        if (manualOverlap)
        {
            return (
                visualOnly,
                new FirstDoorFailedUseEvidence(),
                "ambiguous:manual-use-overlap",
                true,
                "manual-use-overlap");
        }

        if (!CanCaptureForCurrentUseAttempt())
        {
            var observationCode = _lastDecision?.State is FirstDoorControlState.StationaryUse
                or FirstDoorControlState.AwaitOutcome
                ? "ignored:no-valid-applied-use-ack"
                : "ignored:not-current-use-window";
            return (visualOnly, new FirstDoorFailedUseEvidence(), observationCode, false, string.Empty);
        }

        var useAttemptId = _acknowledgedUseWindow!.UseAttemptId;
        var openEvent = newEvents.FirstOrDefault(item => NormalizeSfxName(item.SfxName) == "doropn");
        var failedEvent = newEvents.FirstOrDefault(item => NormalizeSfxName(item.SfxName) == "noway");
        var ambiguousDoorOutcome = openEvent is not null && failedEvent is not null;
        var openEvidence = openEvent is null || ambiguousDoorOutcome
            ? visualOnly
            : visualOnly with
            {
                RunGeneration = _runGeneration,
                SessionId = _sessionId,
                RunId = _runId,
                EventControlTick = controlTick,
                EventPrediction = prediction,
                UseAttemptId = useAttemptId,
                AudioConfirmed = true,
                AudioEventId = NativeEventId(openEvent.Sequence),
                AudioAgeFrames = 0,
                AudioProvenance = FirstDoorEvidenceProvenance.ClassifiedNativeAudio
            };
        var failedEvidence = failedEvent is null
            ? new FirstDoorFailedUseEvidence()
            : new FirstDoorFailedUseEvidence
            {
                RunGeneration = _runGeneration,
                SessionId = _sessionId,
                RunId = _runId,
                EventControlTick = controlTick,
                EventPrediction = prediction,
                Confirmed = true,
                AudioEventId = ambiguousDoorOutcome
                    ? $"run-{_runGeneration}-native-sfx-ambiguous-{openEvent!.Sequence}-{failedEvent.Sequence}"
                    : NativeEventId(failedEvent.Sequence),
                AudioAgeFrames = 0,
                UseAttemptId = useAttemptId,
                Provenance = FirstDoorEvidenceProvenance.ClassifiedNativeAudio
            };

        return (
            openEvidence,
            failedEvidence,
            DescribeEvidenceObservation(newEvents, ambiguousDoorOutcome),
            false,
            ambiguousDoorOutcome ? "ambiguous-door-outcome" : string.Empty);
    }

    private bool CanCaptureForCurrentUseAttempt()
        => _acknowledgedUseWindow is not null
            && _lastDecision is
            {
                State: FirstDoorControlState.StationaryUse or FirstDoorControlState.AwaitOutcome,
                UseAttemptId: > 0
            }
            && _lastDecision.UseAttemptId == _acknowledgedUseWindow.UseAttemptId
            && _lastDecision.RunGeneration == _acknowledgedUseWindow.RunGeneration
            && string.Equals(_lastDecision.SessionId, _acknowledgedUseWindow.SessionId, StringComparison.Ordinal)
            && string.Equals(_lastDecision.RunId, _acknowledgedUseWindow.RunId, StringComparison.Ordinal);

    private string NativeEventId(long sequence)
        => $"run-{_runGeneration}-native-sfx-{sequence}";

    private FirstDoorControlInput MapInput(
        BrowserFirstDoorControlInput input,
        long controlTick,
        int prediction,
        bool resetRequested,
        bool predictionAnomaly,
        string anomalyCode,
        AcquisitionGateEvaluation acquisition,
        FirstDoorOpeningNavigationSnapshot openingNavigation,
        FirstDoorComputerRoomObservation computerRoomObservation,
        DoorIdentityFact identityFact,
        RawObservationResolution rawObservation,
        ProximityResolution proximity,
        FirstDoorOpenEvidence openEvidence,
        FirstDoorFailedUseEvidence failedUseEvidence,
        string evidenceObservationCode,
        AppliedActionAckEvaluation ackEvaluation,
        bool manualOverlap,
        string outcomeRejectionCode)
    {
        var alignmentEvidence = rawObservation.Evidence.Truth == FirstDoorEvidenceTruth.Yes
            ? rawObservation.Evidence
            : _lastAcceptedIdentityEvidence;
        var box = alignmentEvidence?.AlignmentBox;
        var alignmentVector = box is null
            ? 0
            : Math.Clamp(((box.Column + 1d) - 4d) / 4d, -1d, 1d);
        var alignmentErrorDegrees = (float)Math.Clamp(
            alignmentVector * AlignmentScaleDegrees,
            -180d,
            180d);
        var recommendedYaw = Math.Abs(alignmentErrorDegrees) <= AlignmentToleranceDegrees
            ? 0
            : alignmentErrorDegrees < 0 ? -DefaultAlignYaw : DefaultAlignYaw;
        var lifecycleState = NormalizeText(input.LifecycleState);
        var modelState = NormalizeText(input.ModelState);
        var observationContractError = FirstNonEmpty(
            rawObservation.ContractError,
            proximity.ContractError);

        return new FirstDoorControlInput
        {
            ContractVersion = input.ContractVersion,
            ContractError = ResolveBrowserContractError(input, observationContractError),
            SessionId = _sessionId,
            RunId = _runId,
            RunGeneration = _runGeneration,
            ControlTick = controlTick,
            Prediction = prediction,
            ManualUseSequence = input.ManualUseSequence,
            PredictionAnomaly = predictionAnomaly,
            AnomalyCode = anomalyCode,
            ResetRequested = resetRequested,
            ResetOperationId = NormalizeOptionalScopeId(input.ResetOperationId),
            LifecycleEvent = NormalizeText(input.LifecycleEvent),
            LifecycleState = lifecycleState,
            ModelState = modelState,
            ControlReady = IsControlReady(lifecycleState, modelState),
            LifecycleFaulted = IsLifecycleFaulted(lifecycleState, modelState),
            NativeLevelFactsAvailable = input.NativeLevelFactsAvailable,
            NativeLevelLoadSequenceAvailable = input.NativeLevelLoadSequenceAvailable,
            NativeLevelLoadSequence = input.NativeLevelLoadSequence,
            NativeGametic = input.NativeGametic,
            NativeLevelTime = input.NativeLevelTime,
            NativeLevelStartTic = input.NativeLevelStartTic,
            NativeGameState = input.NativeGameState,
            NativeGameEpisode = input.NativeGameEpisode,
            NativeGameMap = input.NativeGameMap,
            AcquisitionStatus = acquisition.Status,
            AcquisitionFailureCode = acquisition.FailureCode,
            OpeningNavigation = openingNavigation,
            DoorIdentityConfidence = identityFact.Confidence,
            DoorIdentityTruth = identityFact.Truth,
            DoorIdentityReason = identityFact.Reason,
            CurrentDoorIdentityReadyForUse = rawObservation.Fresh
                && rawObservation.Evidence.Truth == FirstDoorEvidenceTruth.Yes,
            RawObservationFresh = rawObservation.Fresh,
            Proximity = proximity.Observation,
            AlignmentAvailable = identityFact.Truth == FirstDoorEvidenceTruth.Yes && box is not null,
            AlignmentErrorDegrees = alignmentErrorDegrees,
            RecommendedYaw = recommendedYaw,
            ComputerRoomObservation = computerRoomObservation,
            OpenEvidence = openEvidence,
            FailedUseEvidence = failedUseEvidence,
            EvidenceObservationCode = evidenceObservationCode,
            AppliedActionAckValid = ackEvaluation.AcceptedThisTick,
            AppliedActionAckCode = manualOverlap ? "manual-use-overlap" : ackEvaluation.Code,
            UseAckWindowActive = _acknowledgedUseWindow is not null,
            AcknowledgedUseDecisionControlTick = _acknowledgedUseWindow?.DecisionControlTick ?? 0,
            AcknowledgedUseAttemptId = _acknowledgedUseWindow?.UseAttemptId ?? 0,
            AcknowledgedManualUseSequence = _acknowledgedUseWindow?.ManualUseSequenceBaseline ?? 0,
            AcceptedUseAck = _lastAcceptedUseAckSnapshot ?? new FirstDoorAppliedUseAckSnapshot(),
            AmbiguousManualUseOverlap = manualOverlap,
            UseOutcomeRejectionCode = outcomeRejectionCode
        };
    }

    private AppliedActionAckEvaluation ResolveAppliedActionAck(
        BrowserAppliedActionAck? ack,
        long currentManualUseSequence,
        long observedAtControlTick)
    {
        var expectedDecision = _lastDecision is
        {
            State: FirstDoorControlState.StationaryUse,
            UseAttemptId: > 0
        } && _lastDecision.Action.UseKey
            ? _lastDecision
            : null;

        if (ack is null)
        {
            if (expectedDecision is not null)
            {
                return new AppliedActionAckEvaluation(false, "missing-stationary-use-ack");
            }

            return new AppliedActionAckEvaluation(
                false,
                _acknowledgedUseWindow is null ? "not-expected" : "ack-window-active");
        }

        if (expectedDecision is null)
        {
            var duplicate = _acknowledgedUseWindow is not null
                && AckScopeMatchesWindow(ack, _acknowledgedUseWindow);
            return new AppliedActionAckEvaluation(
                false,
                duplicate ? "duplicate-or-stale-ack" : "stale-or-not-expected-ack");
        }

        var rejectionCode = ValidateAppliedActionAck(
            ack,
            expectedDecision,
            currentManualUseSequence);
        if (!string.IsNullOrEmpty(rejectionCode))
        {
            return new AppliedActionAckEvaluation(false, rejectionCode);
        }

        _acknowledgedUseWindow = new AcknowledgedUseWindow(
            expectedDecision.SessionId,
            expectedDecision.RunId,
            expectedDecision.RunGeneration,
            expectedDecision.ControlTick,
            expectedDecision.UseAttemptId,
            observedAtControlTick,
            ack.ManualUseSequenceAtDecision,
            ManualOverlapObserved: false);
        _lastAcceptedUseAckSnapshot = new FirstDoorAppliedUseAckSnapshot
        {
            Available = true,
            SessionId = ack.SessionId,
            RunId = ack.RunId,
            RunGeneration = ack.RunGeneration,
            AcceptedAtControlTick = observedAtControlTick,
            DecisionControlTick = ack.DecisionControlTick,
            UseAttemptId = ack.UseAttemptId,
            ActionMode = ack.ActionMode,
            HostPath = ack.HostPath,
            QueuedUseInputEventSequence = ack.QueuedUseInputEventSequence,
            PumpedUseInputEventSequence = ack.PumpedUseInputEventSequence,
            UsePumped = ack.UsePumped,
            ManualUseSequenceAtDecision = ack.ManualUseSequenceAtDecision
        };
        return new AppliedActionAckEvaluation(true, "accepted");
    }

    private static string ValidateAppliedActionAck(
        BrowserAppliedActionAck ack,
        FirstDoorControlDecision expected,
        long currentManualUseSequence)
    {
        if (ack.RunGeneration != expected.RunGeneration
            || !string.Equals(ack.SessionId, expected.SessionId, StringComparison.Ordinal)
            || !string.Equals(ack.RunId, expected.RunId, StringComparison.Ordinal))
        {
            return "scope-mismatch";
        }

        if (ack.DecisionControlTick != expected.ControlTick)
        {
            return "decision-control-tick-mismatch";
        }

        if (ack.UseAttemptId != expected.UseAttemptId)
        {
            return "use-attempt-mismatch";
        }

        if (!string.Equals(ack.ActionMode, ExactActionMode, StringComparison.Ordinal))
        {
            return "nonexact-action-mode";
        }

        if (!string.Equals(ack.HostPath, NativeActionHostPath, StringComparison.Ordinal)
            && !string.Equals(ack.HostPath, KeyEventsHostPath, StringComparison.Ordinal))
        {
            return "invalid-host-path";
        }

        if (!ack.ProposedUse)
        {
            return "proposed-use-false";
        }

        if (!ack.AppliedUse)
        {
            return "applied-use-false";
        }

        if (!ack.UseResolved)
        {
            return "use-not-resolved";
        }

        if (!ack.EventQueued)
        {
            return "use-event-not-queued";
        }

        if (ack.QueuedUseInputEventSequence <= 0)
        {
            return "queued-use-sequence-missing";
        }

        if (!ack.UsePumped)
        {
            return "use-not-pumped";
        }

        if (ack.PumpedUseInputEventSequence != ack.QueuedUseInputEventSequence)
        {
            return "pumped-sequence-mismatch";
        }

        if (ack.ManualUseSequenceAtDecision != expected.ManualUseSequence)
        {
            return "manual-use-decision-sequence-mismatch";
        }

        if (currentManualUseSequence != ack.ManualUseSequenceAtDecision)
        {
            return "manual-use-overlap";
        }

        if (ack.PulseResolverCalled)
        {
            return "pulse-resolver-called";
        }

        if (ack.ManualBlocked)
        {
            return "manual-blocked";
        }

        if (ack.SenseOnly)
        {
            return "sense-only";
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

    private void TrackManualUseOverlap(long currentManualUseSequence)
    {
        if (_acknowledgedUseWindow is not null
            && currentManualUseSequence != _acknowledgedUseWindow.ManualUseSequenceBaseline)
        {
            _acknowledgedUseWindow = _acknowledgedUseWindow with
            {
                ManualOverlapObserved = true
            };
        }
    }

    private static bool AckScopeMatchesWindow(
        BrowserAppliedActionAck ack,
        AcknowledgedUseWindow window)
        => ack.RunGeneration == window.RunGeneration
            && ack.DecisionControlTick == window.DecisionControlTick
            && ack.UseAttemptId == window.UseAttemptId
            && string.Equals(ack.SessionId, window.SessionId, StringComparison.Ordinal)
            && string.Equals(ack.RunId, window.RunId, StringComparison.Ordinal);

    private void ClearAcknowledgedUseWindowWhenClosed(FirstDoorControlDecision decision)
    {
        if (_acknowledgedUseWindow is null)
        {
            return;
        }

        if (decision.OpenConfirmed
            || decision.FailedUseEvidenceAccepted
            || decision.UseAttemptId != _acknowledgedUseWindow.UseAttemptId
            || decision.State is not FirstDoorControlState.StationaryUse
                and not FirstDoorControlState.AwaitOutcome)
        {
            _acknowledgedUseWindow = null;
        }
    }

    private FirstDoorOpenEvidence VisualOnlyOpenEvidence()
        => new()
        {
            RunGeneration = _runGeneration,
            SessionId = _sessionId,
            RunId = _runId,
            DoorOpenedCount = 0,
            DoorOpenedCountProvenance = FirstDoorEvidenceProvenance.VisualInference
        };

    private static string ResolveFreshRunRawPreflightError(BrowserFirstDoorControlInput input)
    {
        var wire = input.RawObservation ?? new BrowserFirstDoorRawObservation();
        if (!wire.Available)
        {
            return string.Empty;
        }

        if (wire.SchemaVersion != FirstDoorRawPaletteObserver.CurrentContractVersion
            || !string.Equals(wire.Layout, FirstDoorRawPaletteObserver.LayoutId, StringComparison.Ordinal)
            || wire.SourceWidth != FirstDoorRawPaletteObserver.SourceWidth
            || wire.SourceHeight != FirstDoorRawPaletteObserver.SourceHeight
            || wire.GameplayHeight != FirstDoorRawPaletteObserver.GameplayHeight
            || wire.SampleColumns != FirstDoorRawPaletteObserver.SampleColumns
            || wire.SampleRows != FirstDoorRawPaletteObserver.SampleRows
            || wire.FrameSequence < 0
            || wire.NativeGameticObservedAtEvaluation < -1
            || wire.PaletteGeneration <= 0)
        {
            return "invalid-raw-observation-metadata";
        }

        if ((wire.PaletteIndicesBase64?.Length ?? 0) != 348
            || (wire.PaletteRgbaBase64?.Length ?? 0) != 1368)
        {
            return "invalid-raw-observation-base64-length";
        }

        if (input.NativeLevelFactsAvailable
            && wire.NativeGameticObservedAtEvaluation != input.NativeGametic)
        {
            return "raw-native-gametic-evaluation-mismatch";
        }

        byte[] indices;
        byte[] palette;
        try
        {
            indices = Convert.FromBase64String(wire.PaletteIndicesBase64 ?? string.Empty);
            palette = Convert.FromBase64String(wire.PaletteRgbaBase64 ?? string.Empty);
        }
        catch (FormatException)
        {
            return "invalid-raw-observation-base64";
        }

        if (indices.Length != FirstDoorRawPaletteObserver.SampleCount
            || palette.Length != FirstDoorRawPaletteObserver.PaletteRgbaByteCount)
        {
            return "invalid-raw-observation-length";
        }

        var evidence = FirstDoorRawPaletteObserver.Observe(new FirstDoorRawPaletteObservation
        {
            ContractVersion = wire.SchemaVersion,
            Available = true,
            FrameSequence = wire.FrameSequence,
            NativeGameticObservedAtEvaluation = wire.NativeGameticObservedAtEvaluation,
            SourceWidth = wire.SourceWidth,
            SourceHeight = wire.SourceHeight,
            GameplayHeight = wire.GameplayHeight,
            Layout = wire.Layout,
            Columns = wire.SampleColumns,
            Rows = wire.SampleRows,
            PaletteIndices = indices,
            PaletteAvailable = true,
            PaletteGeneration = wire.PaletteGeneration,
            PaletteProvenance = "browser-playpal-rgba-v1",
            PaletteRgbaBytes = palette
        });
        return evidence.InputAccepted
            ? string.Empty
            : $"raw-observer-rejected:{evidence.Reason}";
    }

    private string ResolveFreshRunProximityPreflightError(
        BrowserFirstDoorControlInput input)
    {
        var lifecycleState = NormalizeText(input.LifecycleState);
        var modelState = NormalizeText(input.ModelState);
        if (!IsControlReady(lifecycleState, modelState))
        {
            return string.Empty;
        }

        var observation = FirstDoorNativeProximityObserver.Observe(CreateProximityInput(input));
        return observation.InputAccepted
            || IsTransientProximityUnavailable(observation.Reason)
            ? string.Empty
            : observation.Reason;
    }

    private static bool IsTransientProximityUnavailable(string? reason)
        => reason is "native-level-facts-unavailable"
            or "native-player-facts-unavailable"
            or "native-player-gametic-unavailable";

    private static string ResolveBrowserContractError(
        BrowserFirstDoorControlInput input,
        string rawObservationContractError)
    {
        if (input.ContractVersion != FirstDoorControlStateMachine.CurrentContractVersion)
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

        if (!string.IsNullOrEmpty(rawObservationContractError))
        {
            return rawObservationContractError;
        }

        if ((input.Audio?.Events?.Count ?? 0) > MaximumNativeAudioEventsPerPacket)
        {
            return "native-audio-event-count-exceeded";
        }

        if (!IsKnownLifecycleState(input.LifecycleState))
        {
            return "missing-lifecycle-state";
        }

        return IsKnownModelState(input.ModelState) ? string.Empty : "missing-model-state";
    }

    private static bool IsKnownLifecycleState(string? value)
        => ContainsExact(
            NormalizeText(value),
            "running",
            "ready",
            "active",
            "starting",
            "loading",
            "restarting",
            "paused",
            "stopped",
            "faulted",
            "failed",
            "error");

    private static bool IsKnownModelState(string? value)
        => ContainsExact(
            NormalizeText(value),
            "ready",
            "loaded",
            "running",
            "active",
            "loading",
            "initializing",
            "unloaded",
            "faulted",
            "failed",
            "error");

    private static bool IsControlReady(string lifecycleState, string modelState)
        => ContainsExact(lifecycleState, "running", "ready", "active")
            && ContainsExact(modelState, "ready", "loaded", "running", "active");

    private static bool IsLifecycleFaulted(string lifecycleState, string modelState)
        => ContainsExact(lifecycleState, "faulted", "failed", "error")
            || ContainsExact(modelState, "faulted", "failed", "error");

    private static bool IsRunBoundaryLifecycleEvent(string lifecycleEvent)
        => ContainsExact(
            lifecycleEvent,
            "run-started",
            "run-restarted",
            "restart-completed",
            "new-run");

    private static bool ContainsExact(string value, params string[] candidates)
        => candidates.Any(candidate => value.Equals(candidate, StringComparison.OrdinalIgnoreCase));

    private static string NormalizeSfxName(string? value)
    {
        var normalized = string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToLowerInvariant();
        return normalized.StartsWith("sfx_", StringComparison.Ordinal)
            ? normalized[4..]
            : normalized;
    }

    private static string DescribeEvidenceObservation(
        IReadOnlyList<BrowserNativeAudioEventInput> events,
        bool ambiguousDoorOutcome)
    {
        var names = events
            .Select(item => NormalizeSfxName(item.SfxName))
            .Select(name => string.IsNullOrEmpty(name) ? "<empty>" : name)
            .Distinct(StringComparer.Ordinal)
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToArray();
        var ignored = names
            .Where(name => name is not "doropn" and not "noway")
            .ToArray();

        var outcome = ambiguousDoorOutcome
            ? "ambiguous:doropn+noway"
            : names.Contains("doropn", StringComparer.Ordinal)
                ? "accepted:doropn"
                : names.Contains("noway", StringComparer.Ordinal)
                    ? "accepted:noway"
                    : "ignored:no-door-outcome";
        return ignored.Length == 0
            ? outcome
            : $"{outcome};ignored:{string.Join(',', ignored)}";
    }

    private static long MaximumSequence(IReadOnlyList<BrowserNativeAudioEventInput>? events)
        => events is null || events.Count == 0
            ? 0
            : Math.Max(0, events.Max(item => item?.Sequence ?? 0));

    private static string NormalizeText(string? value)
        => string.IsNullOrWhiteSpace(value) ? "unknown" : value.Trim();

    private static string NormalizeOptionalScopeId(string? value)
        => string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();

    private static string FirstNonEmpty(params string[] values)
        => values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? string.Empty;

    private static float Max(params float[] values)
        => values.Length == 0 ? 0 : values.Max(FiniteOrZero);

    private static float Clamp01(float value)
        => Math.Clamp(FiniteOrZero(value), 0, 1);

    private static double Round2(double value)
        => Math.Floor(value * 100d + 0.5d) / 100d;

    private static float FiniteOrZero(float value)
        => float.IsFinite(value) ? value : 0;

    private static int SaturatingIncrement(int value)
        => value == int.MaxValue ? int.MaxValue : value + 1;

    private sealed record RawObservationResolution(
        bool Available,
        bool Fresh,
        FirstDoorRawPaletteEvidence Evidence,
        FirstDoorRawReplayObservation Replay,
        string ContractError)
    {
        internal static RawObservationResolution Unavailable(string reason)
            => new(
                Available: false,
                Fresh: false,
                Evidence: EmptyEvidence(reason),
                Replay: new FirstDoorRawReplayObservation(),
                ContractError: string.Empty);

        internal static RawObservationResolution Invalid(
            string reason,
            FirstDoorRawPaletteEvidence? evidence = null)
            => new(
                Available: false,
                Fresh: false,
                Evidence: evidence ?? EmptyEvidence(reason),
                Replay: new FirstDoorRawReplayObservation(),
                ContractError: reason);

        private static FirstDoorRawPaletteEvidence EmptyEvidence(string reason)
            => new()
            {
                InputAccepted = false,
                Truth = FirstDoorEvidenceTruth.Unknown,
                Reason = reason
            };
    }

    private sealed record RouteIntentFact(
        FirstDoorEvidenceTruth Truth,
        string Reason);

    private sealed record ProximityResolution(
        FirstDoorProximityObservation Observation,
        string ContractError)
    {
        internal static ProximityResolution Unavailable(string reason)
            => new(
                FirstDoorNativeProximityObserver.Unavailable(reason),
                ContractError: string.Empty);

        internal static ProximityResolution Invalid(
            FirstDoorProximityObservation observation)
            => new(observation, observation.Reason);
    }

    private sealed record AcquisitionGateEvaluation(
        FirstDoorAcquisitionStatus Status,
        string FailureCode,
        bool Ready)
    {
        internal static AcquisitionGateEvaluation Waiting { get; }
            = new(FirstDoorAcquisitionStatus.Waiting, string.Empty, Ready: false);
    }

    private sealed record IdentityWindowSample(
        long FrameSequence,
        FirstDoorEvidenceTruth Truth,
        string ObservationHash,
        FirstDoorRawReplayObservation? Replay);

    private sealed record DoorIdentityFact(
        FirstDoorEvidenceTruth Truth,
        float Confidence,
        string Reason,
        string Kind)
    {
        internal static DoorIdentityFact FromEvidence(
            FirstDoorRawPaletteEvidence evidence,
            string? reasonOverride = null)
            => new(
                evidence.Truth,
                (float)Math.Clamp(evidence.IdentityConfidence, 0d, 1d),
                string.IsNullOrWhiteSpace(reasonOverride) ? evidence.Reason : reasonOverride,
                evidence.IdentityKind);
    }

    private sealed record AppliedActionAckEvaluation(
        bool AcceptedThisTick,
        string Code);

    private sealed record AcknowledgedUseWindow(
        string SessionId,
        string RunId,
        long RunGeneration,
        long DecisionControlTick,
        long UseAttemptId,
        long ObservedAtControlTick,
        long ManualUseSequenceBaseline,
        bool ManualOverlapObserved);
}
