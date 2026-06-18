namespace AIKernel.Doom.Provider.Autoplay;

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
