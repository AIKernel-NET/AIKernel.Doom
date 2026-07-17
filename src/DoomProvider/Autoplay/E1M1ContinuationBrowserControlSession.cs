namespace AIKernel.Doom.Provider.Autoplay;

internal sealed record BrowserE1M1ContinuationInput
{
    public int ContractVersion { get; init; }

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long ExpectedPostComputerRoomControlTick { get; init; }

    public string WadContentSha256 { get; init; } = string.Empty;

    public bool NativeLevelFactsAvailable { get; init; }

    public bool NativeLevelLoadSequenceAvailable { get; init; }

    public long NativeLevelLoadSequence { get; init; } = -1;

    public long NativeGametic { get; init; } = -1;

    public long NativeLevelTime { get; init; } = -1;

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

    public long ManualUseSequence { get; init; }

    public PostComputerRoomNativeActorSnapshot ActorSnapshot { get; init; } = new();

    public PostComputerRoomNativeWeaponSnapshot WeaponSnapshot { get; init; } = new();

    public BrowserFirstDoorAudioInput Audio { get; init; } = new();

    public BrowserAppliedActionAck? AppliedActionAck { get; init; }
}

internal sealed record E1M1ContinuationActivationProof
{
    public int ProofVersion { get; init; } = 1;

    public string SessionId { get; init; } = string.Empty;

    public string RunId { get; init; } = string.Empty;

    public long RunGeneration { get; init; }

    public long ActivationAtControlTick { get; init; } = -1;

    public PostComputerRoomCompletionTrace PostCompletionTrace { get; init; } = new();

    public FirstDoorProximityObservation ActivationPose { get; init; } = new();

    public string ContractError { get; init; } = string.Empty;
}

internal sealed class E1M1ContinuationBrowserControlSession
{
    private readonly E1M1ContinuationNavigator _navigator;
    private string _sessionId = string.Empty;
    private string _runId = string.Empty;
    private long _runGeneration;
    private long _controlTick;

    internal E1M1ContinuationBrowserControlSession(E1M1ContinuationPolicy? policy = null)
    {
        _navigator = new E1M1ContinuationNavigator(policy);
    }

    internal E1M1ContinuationDecision Evaluate(
        BrowserE1M1ContinuationInput input,
        E1M1ContinuationActivationProof? activationProof)
    {
        ArgumentNullException.ThrowIfNull(input);
        if (!ScopeMatches(input))
        {
            _sessionId = input.SessionId ?? string.Empty;
            _runId = input.RunId ?? string.Empty;
            _runGeneration = input.RunGeneration;
            _controlTick = 0;
        }

        _controlTick = _controlTick == long.MaxValue ? long.MaxValue : _controlTick + 1;
        return _navigator.Evaluate(activationProof, input, _controlTick);
    }

    private bool ScopeMatches(BrowserE1M1ContinuationInput input)
        => string.Equals(_sessionId, input.SessionId, StringComparison.Ordinal)
            && string.Equals(_runId, input.RunId, StringComparison.Ordinal)
            && _runGeneration == input.RunGeneration;
}
