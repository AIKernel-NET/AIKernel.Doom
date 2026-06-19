namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Canonical stage identifiers for the dynamic philosophical autoplay pipeline.
/// JA: dynamic philosophical autoplay pipeline の canonical stage identifier です。
/// </summary>
public enum DynamicPipelineStageKind
{
    /// <summary>
    /// EN: Raw sensor intake stage.
    /// JA: raw sensor intake stage です。
    /// </summary>
    Aisthesis = 0,

    /// <summary>
    /// EN: Event extraction stage.
    /// JA: event extraction stage です。
    /// </summary>
    Phainesis = 1,

    /// <summary>
    /// EN: Meaning vectorization stage.
    /// JA: meaning vectorization stage です。
    /// </summary>
    Nous = 2,

    /// <summary>
    /// EN: Triadic spatial-intent carrier stage.
    /// JA: triadic spatial-intent carrier stage です。
    /// </summary>
    Topos = 3,

    /// <summary>
    /// EN: Timing and priority stage.
    /// JA: timing and priority stage です。
    /// </summary>
    Kairos = 4,

    /// <summary>
    /// EN: Bounded action emission stage.
    /// JA: bounded action emission stage です。
    /// </summary>
    Kinesis = 5,

    /// <summary>
    /// EN: Life-state veto stage.
    /// JA: life-state veto stage です。
    /// </summary>
    Zoe = 6
}

/// <summary>
/// EN: Node in a compiled dynamic philosophical autoplay pipeline graph.
/// JA: compiled dynamic philosophical autoplay pipeline graph 内の node です。
/// </summary>
public sealed record DynamicPipelineNode
{
    /// <summary>
    /// EN: Stable node identifier.
    /// JA: stable node identifier です。
    /// </summary>
    public string Id { get; init; } = string.Empty;

    /// <summary>
    /// EN: Canonical stage assigned to the node.
    /// JA: node に割り当てられた canonical stage です。
    /// </summary>
    public DynamicPipelineStageKind Stage { get; init; }

    /// <summary>
    /// EN: Named inputs consumed by the node.
    /// JA: node が consume する named input です。
    /// </summary>
    public IReadOnlyList<string> Inputs { get; init; } = [];

    /// <summary>
    /// EN: Named outputs produced by the node.
    /// JA: node が produce する named output です。
    /// </summary>
    public IReadOnlyList<string> Outputs { get; init; } = [];

    /// <summary>
    /// EN: Extension metadata retained for diagnostics and documentation.
    /// JA: diagnostics と documentation のために保持される extension metadata です。
    /// </summary>
    public IReadOnlyDictionary<string, string> Metadata { get; init; } =
        new Dictionary<string, string>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Indicates that the node was created from a deprecated DSL construct.
    /// JA: node が deprecated DSL construct から作成されたことを示します。
    /// </summary>
    public bool Deprecated { get; init; }
}

/// <summary>
/// EN: Compiled dynamic philosophical autoplay pipeline graph.
/// JA: compiled dynamic philosophical autoplay pipeline graph です。
/// </summary>
public sealed record DynamicPipelineGraph
{
    /// <summary>
    /// EN: Required canonical stage order for safe pipeline execution.
    /// JA: safe pipeline execution に必要な canonical stage order です。
    /// </summary>
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

    /// <summary>
    /// EN: Ordered graph nodes.
    /// JA: ordered graph node です。
    /// </summary>
    public IReadOnlyList<DynamicPipelineNode> Nodes { get; init; } = [];

    /// <summary>
    /// EN: Non-fatal diagnostics produced while compiling the graph.
    /// JA: graph compile 時に生成された non-fatal diagnostic です。
    /// </summary>
    public IReadOnlyList<string> Diagnostics { get; init; } = [];

    /// <summary>
    /// EN: Warnings emitted for deprecated DSL constructs.
    /// JA: deprecated DSL construct に対して出力された warning です。
    /// </summary>
    public IReadOnlyList<string> DeprecationWarnings { get; init; } = [];

    /// <summary>
    /// EN: Indicates whether nodes exactly follow the canonical stage order.
    /// JA: node が canonical stage order に完全一致しているかどうかを示します。
    /// </summary>
    public bool IsCanonical
        => Nodes.Select(node => node.Stage).SequenceEqual(CanonicalOrder);
}
