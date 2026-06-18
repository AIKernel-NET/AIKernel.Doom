namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: A single deterministic stage in the autoplay DSL.
/// JA: AutoPlay DSL 内の deterministic stage です。
/// </summary>
public sealed record AutoplayPipelineStageDefinition
{
    public string Id { get; init; } = string.Empty;

    public string Objective { get; init; } = string.Empty;

    public string When { get; init; } = "false";

    public int Priority { get; init; }

    public float Threshold { get; init; }

    public Dictionary<string, float> Evidence { get; init; } = new(StringComparer.Ordinal);

    public Dictionary<string, string> Action { get; init; } = new(StringComparer.Ordinal);
}
