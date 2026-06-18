namespace AIKernel.Doom.Provider.Autoplay;

public sealed record DynamicPipelineAst
{
    public SensorIngressAst Aisthesis { get; init; } = new();

    public NoesisAstNode Noesis { get; init; } = new();

    public KrisisAstNode Krisis { get; init; } = new();

    public KinesisLayerAstNode Kinesis { get; init; } = new();
}

public sealed record SensorIngressAst
{
    public IReadOnlyList<string> Sensors { get; init; } = [];
}

public sealed record NoesisAstNode
{
    public PhainesisAstNode Phainesis { get; init; } = new();

    public MeaningVectorAst Nous { get; init; } = new();
}

public sealed record PhainesisAstNode
{
    public IReadOnlyList<PhainesisEventRule> Events { get; init; } = [];
}

public sealed record PhainesisEventRule(string Event, string Source);

public sealed record MeaningVectorAst
{
    public IReadOnlyList<MeaningVectorRule> Vectors { get; init; } = [];
}

public sealed record MeaningVectorRule(string Vector, string SourceEvent);

public sealed record KrisisAstNode
{
    public ToposAstNode Topos { get; init; } = new();

    public PriorityAxisAst Kairos { get; init; } = new();
}

public sealed record ToposAstNode
{
    public IReadOnlyList<string> Vectors { get; init; } =
    [
        "LogosVector",
        "PathosVector",
        "EthosVector",
        "ToposDecisionVector"
    ];
}

public sealed record PriorityAxisAst
{
    public IReadOnlyList<string> Priorities { get; init; } =
    [
        "pathos",
        "ethos",
        "logos"
    ];
}

public sealed record KinesisLayerAstNode
{
    public KinesisActionAstNode Motion { get; init; } = new();

    public ZoeAstNode Zoe { get; init; } = new();
}

public sealed record KinesisActionAstNode
{
    public IReadOnlyList<string> Actions { get; init; } =
    [
        "moveForward",
        "moveBackward",
        "turnYaw",
        "strafe",
        "shoot"
    ];
}

public sealed record ZoeAstNode
{
    public IReadOnlyList<ZoeVetoRule> VetoRules { get; init; } = [];
}

public sealed record ZoeVetoRule(string Expression);
