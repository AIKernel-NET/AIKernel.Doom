namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Versioned, profile-defined autoplay pipeline DSL document.
/// JA: profile で定義される versioned AutoPlay pipeline DSL document です。
/// </summary>
public sealed partial record AutoplayPipelineDefinition
{
    public string Dsl { get; init; } = "aikernel.doom.autoplay.pipeline/v1";

    public string Name { get; init; } = "SeparatedDoorProbeStrafeRunnerV4";

    public List<AutoplaySemanticSymbolDefinition> SemanticMemory { get; init; } =
    [
        new() { Id = "door", Kind = "navigation-target" },
        new() { Id = "corridor", Kind = "route" },
        new() { Id = "enemy", Kind = "threat" },
        new() { Id = "safe-zone", Kind = "safety" },
        new() { Id = "bridge", Kind = "route" },
        new() { Id = "computer-room", Kind = "route" }
    ];

    public List<AutoplayObjectiveDefinition> Objectives { get; init; } =
    [
        new() { Id = "open-door", Intent = "door", Means = "align-approach-use", Priority = 70 },
        new() { Id = "reach-bridge", Intent = "bridge", Means = "advance-route", Priority = 45 },
        new() { Id = "avoid-enemy", Intent = "enemy", Means = "kite-or-fire", Priority = 80 },
        new() { Id = "enter-computer-room", Intent = "computer-room", Means = "advance-route", Priority = 40 },
        new() { Id = "stabilize-safe-zone", Intent = "safe-zone", Means = "recover-and-relocalize", Priority = 90 }
    ];

    public AutoplayArbitrationDefinition Arbitration { get; init; } = new();

    public AutoplayAisthesisDefinition Aisthesis { get; init; } = new();

    public AutoplayNoesisDefinition Noesis { get; init; } = new();

    public AutoplayKrisisDefinition Krisis { get; init; } = new();

    public AutoplayKinesisLayerDefinition Kinesis { get; init; } = new();

    [Obsolete("Use noesis.phainesis event rules instead of detect { ... }.")]
    public List<AutoplayPhainesisEventDefinition> Detect { get; init; } = [];

    [Obsolete("Use noesis.nous/topos mapping instead of hodos { ... }.")]
    public List<AutoplayNousVectorDefinition> Hodos { get; init; } = [];

    [Obsolete("Use krisis.kairos priority pathos/ethos/logos instead of behavior categories.")]
    public List<string> Behavior { get; init; } = [];

    public List<AutoplayPipelineStageDefinition> Stages { get; init; } = [];
}
