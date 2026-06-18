namespace AIKernel.Doom.Provider.Autoplay;

public sealed record AutoplaySemanticSymbolDefinition
{
    public string Id { get; init; } = string.Empty;

    public string Kind { get; init; } = "signal";
}

public sealed record AutoplayObjectiveDefinition
{
    public string Id { get; init; } = string.Empty;

    public string Intent { get; init; } = string.Empty;

    public string Means { get; init; } = string.Empty;

    public int Priority { get; init; }
}

public sealed record AutoplayArbitrationDefinition
{
    public string Mode { get; init; } = "deterministic-weighted-priority";

    public float DefaultThreshold { get; init; }
}
