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

    public ControlDecisionTracePacket DecisionTrace { get; init; } = new();
}
