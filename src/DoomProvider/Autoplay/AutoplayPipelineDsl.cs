namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Versioned, profile-defined autoplay pipeline DSL document.
/// JA: profile で定義される versioned AutoPlay pipeline DSL document です。
/// </summary>
public sealed partial record AutoplayPipelineDefinition
{
    /// <summary>
    /// EN: DSL schema identifier for the autoplay pipeline document.
    /// JA: autoplay pipeline document の DSL schema identifier です。
    /// </summary>
    public string Dsl { get; init; } = "aikernel.doom.autoplay.pipeline/v1";

    /// <summary>
    /// EN: Human-readable pipeline definition name.
    /// JA: 可読な pipeline definition name です。
    /// </summary>
    public string Name { get; init; } = "SeparatedDoorProbeStrafeRunnerV4";

    /// <summary>
    /// EN: Semantic memory symbols available to objective routing and cognition.
    /// JA: objective routing と cognition が利用できる semantic memory symbol です。
    /// </summary>
    public List<AutoplaySemanticSymbolDefinition> SemanticMemory { get; init; } =
    [
        new() { Id = "door", Kind = "navigation-target" },
        new() { Id = "corridor", Kind = "route" },
        new() { Id = "enemy", Kind = "threat" },
        new() { Id = "safe-zone", Kind = "safety" },
        new() { Id = "bridge", Kind = "route" },
        new() { Id = "computer-room", Kind = "route" },
        new() { Id = "central-hall", Kind = "route" },
        new() { Id = "final-room", Kind = "route" },
        new() { Id = "exit-switch", Kind = "terminal" }
    ];

    /// <summary>
    /// EN: Objective definitions that connect semantic intent to route means.
    /// JA: semantic intent を route means に接続する objective definition です。
    /// </summary>
    public List<AutoplayObjectiveDefinition> Objectives { get; init; } =
    [
        new() { Id = "open-door", Intent = "door", Means = "align-approach-use", Priority = 70 },
        new() { Id = "reach-bridge", Intent = "bridge", Means = "advance-route", Priority = 45 },
        new() { Id = "avoid-enemy", Intent = "enemy", Means = "kite-or-fire", Priority = 80 },
        new() { Id = "enter-computer-room", Intent = "computer-room", Means = "advance-route", Priority = 40 },
        new() { Id = "reach-central-hall", Intent = "central-hall", Means = "cross-bridge-and-open-door", Priority = 68 },
        new() { Id = "engage-front-enemy", Intent = "enemy", Means = "fire-and-advance", Priority = 84 },
        new() { Id = "secure-central-hall", Intent = "central-hall", Means = "survey-threat", Priority = 66 },
        new() { Id = "reach-final-room", Intent = "final-room", Means = "bypass-or-post-combat-route", Priority = 72 },
        new() { Id = "press-exit-switch", Intent = "exit-switch", Means = "align-approach-use", Priority = 92 },
        new() { Id = "level-clear", Intent = "exit-switch", Means = "complete", Priority = 100 },
        new() { Id = "stabilize-safe-zone", Intent = "safe-zone", Means = "recover-and-relocalize", Priority = 90 }
    ];

    /// <summary>
    /// EN: Arbitration configuration used by control policy selection.
    /// JA: control policy selection が利用する arbitration configuration です。
    /// </summary>
    public AutoplayArbitrationDefinition Arbitration { get; init; } = new();

    /// <summary>
    /// EN: Aisthesis layer definition for sensor intake.
    /// JA: sensor intake 用の Aisthesis layer definition です。
    /// </summary>
    public AutoplayAisthesisDefinition Aisthesis { get; init; } = new();

    /// <summary>
    /// EN: Noesis layer definition containing Phainesis and Nous configuration.
    /// JA: Phainesis と Nous configuration を含む Noesis layer definition です。
    /// </summary>
    public AutoplayNoesisDefinition Noesis { get; init; } = new();

    /// <summary>
    /// EN: Krisis layer definition containing Topos and Kairos configuration.
    /// JA: Topos と Kairos configuration を含む Krisis layer definition です。
    /// </summary>
    public AutoplayKrisisDefinition Krisis { get; init; } = new();

    /// <summary>
    /// EN: Kinesis layer definition containing action and Zoe veto configuration.
    /// JA: action と Zoe veto configuration を含む Kinesis layer definition です。
    /// </summary>
    public AutoplayKinesisLayerDefinition Kinesis { get; init; } = new();

    /// <summary>
    /// EN: Deprecated legacy event rules preserved only for migration.
    /// JA: migration のためだけに保持される deprecated legacy event rule です。
    /// </summary>
    [Obsolete("Use noesis.phainesis event rules instead of detect { ... }.")]
    public List<AutoplayPhainesisEventDefinition> Detect { get; init; } = [];

    /// <summary>
    /// EN: Deprecated legacy Hodos vectors preserved only for migration.
    /// JA: migration のためだけに保持される deprecated legacy Hodos vector です。
    /// </summary>
    [Obsolete("Use noesis.nous/topos mapping instead of hodos { ... }.")]
    public List<AutoplayNousVectorDefinition> Hodos { get; init; } = [];

    /// <summary>
    /// EN: Deprecated legacy behavior categories preserved only for migration.
    /// JA: migration のためだけに保持される deprecated legacy behavior category です。
    /// </summary>
    [Obsolete("Use krisis.kairos priority pathos/ethos/logos instead of behavior categories.")]
    public List<string> Behavior { get; init; } = [];

    /// <summary>
    /// EN: Explicit stage definitions for compiled dynamic pipeline graphs.
    /// JA: compiled dynamic pipeline graph 用の explicit stage definition です。
    /// </summary>
    public List<AutoplayPipelineStageDefinition> Stages { get; init; } = [];
}
