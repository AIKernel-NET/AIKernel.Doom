namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Temporary product-neutral Control runtime adapter contract staged in Doom before library extraction.
/// JA: library 抽出前に Doom 側へ仮配置する product-neutral Control runtime adapter contract です。
/// </summary>
public interface IControlRuntimeAdapter
{
    ControlActionPacket Predict(ControlStateTensorPacket state);

    ControlDecisionTracePacket Status();
}

/// <summary>
/// EN: Flat tensor transport for Control runtime state.
/// JA: Control runtime state 用の flat tensor transport です。
/// </summary>
public sealed record ControlStateTensorPacket
{
    public string Version { get; init; } = "control-state-tensor/v1";

    public IReadOnlyList<int> Shape { get; init; } = [];

    public IReadOnlyList<float> Data { get; init; } = [];

    public IReadOnlyDictionary<string, int> Channels { get; init; } =
        new Dictionary<string, int>(StringComparer.Ordinal);

    public ControlSemanticMemoryPacket SemanticMemory { get; init; } = new();

    public string Objective { get; init; } = "idle";

    public float Get(string channel)
    {
        if (!Channels.TryGetValue((channel ?? string.Empty).Trim().ToLowerInvariant(), out var offset))
        {
            return 0;
        }

        return offset >= 0 && offset < Data.Count ? Clamp01(Data[offset]) : 0;
    }

    public float SemanticScore(string symbol)
    {
        var normalized = Normalize(symbol);
        if (SemanticMemory.Symbols.TryGetValue(normalized, out var direct))
        {
            return Clamp01(direct);
        }

        return Get($"semantic.{normalized}");
    }

    private static string Normalize(string? value)
        => (value ?? string.Empty).Trim().ToLowerInvariant();

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}

/// <summary>
/// EN: Stable symbolic memory packet consumed by Control pipelines.
/// JA: Control pipeline が消費する stable symbolic memory packet です。
/// </summary>
public sealed record ControlSemanticMemoryPacket
{
    public IReadOnlyDictionary<string, float> Symbols { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    public string Objective { get; init; } = "idle";
}

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

/// <summary>
/// EN: Replayable decision trace from a deterministic Control pipeline.
/// JA: deterministic Control pipeline から返る replayable decision trace です。
/// </summary>
public sealed record ControlDecisionTracePacket
{
    public string Adapter { get; init; } = "control-runtime-adapter";

    public string Pipeline { get; init; } = "Idle";

    public string Stage { get; init; } = "none";

    public string Objective { get; init; } = "idle";

    public int Priority { get; init; }

    public float EvidenceScore { get; init; }

    public IReadOnlyDictionary<string, float> SemanticScores { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    public IReadOnlyList<ControlStageEvaluationPacket> StageEvaluations { get; init; } = [];
}

public sealed record ControlStageEvaluationPacket
{
    public string Stage { get; init; } = "none";

    public string Objective { get; init; } = "idle";

    public int Priority { get; init; }

    public float Threshold { get; init; }

    public float EvidenceScore { get; init; }

    public bool ConditionMatched { get; init; }

    public bool EvidenceMatched { get; init; }

    public bool Selected { get; init; }
}
