namespace AIKernel.Doom.Provider.Autoplay;

public enum DynamicPipelineStageKind
{
    Aisthesis = 0,
    Phainesis = 1,
    Nous = 2,
    Topos = 3,
    Kairos = 4,
    Kinesis = 5,
    Zoe = 6
}

public sealed record DynamicPipelineNode
{
    public string Id { get; init; } = string.Empty;

    public DynamicPipelineStageKind Stage { get; init; }

    public IReadOnlyList<string> Inputs { get; init; } = [];

    public IReadOnlyList<string> Outputs { get; init; } = [];

    public IReadOnlyDictionary<string, string> Metadata { get; init; } =
        new Dictionary<string, string>(StringComparer.Ordinal);

    public bool Deprecated { get; init; }
}

public sealed record DynamicPipelineGraph
{
    public static IReadOnlyList<DynamicPipelineStageKind> CanonicalOrder { get; } =
    [
        DynamicPipelineStageKind.Aisthesis,
        DynamicPipelineStageKind.Phainesis,
        DynamicPipelineStageKind.Nous,
        DynamicPipelineStageKind.Topos,
        DynamicPipelineStageKind.Kairos,
        DynamicPipelineStageKind.Kinesis,
        DynamicPipelineStageKind.Zoe
    ];

    public IReadOnlyList<DynamicPipelineNode> Nodes { get; init; } = [];

    public IReadOnlyList<string> Diagnostics { get; init; } = [];

    public IReadOnlyList<string> DeprecationWarnings { get; init; } = [];

    public bool IsCanonical
        => Nodes.Select(node => node.Stage).SequenceEqual(CanonicalOrder);
}
