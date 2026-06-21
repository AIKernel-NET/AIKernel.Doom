namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Runtime-neutral action packet emitted by a Control adapter.
/// JA: Control adapter が出力する runtime-neutral action packet です。
/// </summary>
public sealed record ControlActionPacket
{
    public string Move { get; init; } = "none";

    public string Turn { get; init; } = "none";

    public bool Fire { get; init; }

    public bool Strafe { get; init; }

    public bool Use { get; init; }

    public bool Run { get; init; }

    public string Source { get; init; } = "control-runtime";

    public string Pipeline { get; init; } = "Idle";

    public string Stage { get; init; } = "none";

    public string Objective { get; init; } = "idle";

    public int Priority { get; init; }

    public float EvidenceScore { get; init; }

    public IReadOnlyDictionary<string, float> SemanticScores { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Canonical four-layer pipeline state projected by the C# runtime when available.
    /// JA: C# runtime が利用可能な場合に射影する正典 4-layer pipeline state です。
    /// </summary>
    public PipelineStateDto PipelineState { get; init; } = PipelineStateDto.Empty;

    /// <summary>
    /// EN: Goal panel state projected by the C# runtime when available.
    /// JA: C# runtime が利用可能な場合に射影する goal panel state です。
    /// </summary>
    public DoomGoalStateDto GoalState { get; init; } = DoomGoalStateDto.Empty;

    /// <summary>
    /// EN: Debug overlay packet projected by the C# runtime when available.
    /// JA: C# runtime が利用可能な場合に射影する debug overlay packet です。
    /// </summary>
    public DoomDebugOverlayDto DebugOverlay { get; init; } = DoomDebugOverlayDto.Empty;

    /// <summary>
    /// EN: Aggregated HUD/autoplay packet projected by the C# runtime when available.
    /// JA: C# runtime が利用可能な場合に射影する集約済み HUD/autoplay packet です。
    /// </summary>
    public DoomAutoplayStateDto AutoplayState { get; init; } = DoomAutoplayStateDto.Empty;

    public ControlDecisionTracePacket DecisionTrace { get; init; } = new();
}
