namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Defines a named phase-specific pipeline set that gates which autoplay stages may run for a route phase.
/// JA: route phase ごとに実行できる autoplay stage を制限する named phase-specific pipeline set を定義します。
/// </summary>
/// <remarks>
/// EN: This is the canonical v0.1.3 control boundary between semantic phase selection and low-level action arbitration.
/// JA: これは semantic phase selection と低レベル action arbitration の境界となる canonical v0.1.3 control boundary です。
/// </remarks>
public sealed record AutoplayPhasePipelineDefinition
{
    /// <summary>
    /// EN: Stable identifier used by diagnostics, HUD projection, and JavaScript/WASM bridge packets.
    /// JA: diagnostics、HUD 投影、および JavaScript/WASM bridge packet が使用する安定した identifier です。
    /// </summary>
    public string Id { get; init; } = "default";

    /// <summary>
    /// EN: Boolean DSL expression that decides whether this phase pipeline is active.
    /// JA: この phase pipeline が active かどうかを決める boolean DSL expression です。
    /// </summary>
    public string When { get; init; } = "true";

    /// <summary>
    /// EN: Priority used when multiple phase pipelines match the same tick.
    /// JA: 同じ tick で複数の phase pipeline が一致した場合に使う priority です。
    /// </summary>
    public float Priority { get; init; }

    /// <summary>
    /// EN: Whether this phase is intended to own arbitration exclusively while it is active.
    /// JA: active の間、この phase が arbitration を排他的に所有する意図かどうかを示します。
    /// </summary>
    public bool Exclusive { get; init; }

    /// <summary>
    /// EN: Exact stage identifiers allowed by this phase pipeline.
    /// JA: この phase pipeline が許可する exact stage identifier です。
    /// </summary>
    public List<string> AllowedStageIds { get; init; } = [];

    /// <summary>
    /// EN: Stage identifier prefixes allowed by this phase pipeline.
    /// JA: この phase pipeline が許可する stage identifier prefix です。
    /// </summary>
    public List<string> AllowedStagePrefixes { get; init; } = [];

    /// <summary>
    /// EN: Named, exclusive action sequences available inside this phase.
    /// JA: この phase 内で利用できる named exclusive action sequence です。
    /// </summary>
    public List<AutoplayActionSequenceDefinition> ActionSequences { get; init; } = [];
}

/// <summary>
/// EN: Defines a semantic compound action that must not be interrupted by unrelated arbitration while active.
/// JA: active の間、無関係な arbitration に割り込ませない semantic compound action を定義します。
/// </summary>
public sealed record AutoplayActionSequenceDefinition
{
    /// <summary>
    /// EN: Stable action-sequence identifier used by the runtime, logs, and HUD diagnostics.
    /// JA: runtime、log、および HUD diagnostics が使用する安定した action-sequence identifier です。
    /// </summary>
    public string Id { get; init; } = "sequence";

    /// <summary>
    /// EN: Whether the sequence suppresses unrelated stage actions until it exits.
    /// JA: sequence が終了するまで無関係な stage action を抑制するかどうかを示します。
    /// </summary>
    public bool Exclusive { get; init; } = true;

    /// <summary>
    /// EN: Upper frame budget before the runtime must abandon or recycle the sequence.
    /// JA: runtime が sequence を中断または再試行するまでの上限 frame budget です。
    /// </summary>
    public int MaxFrames { get; init; } = 180;

    /// <summary>
    /// EN: Stage prefixes that may start or keep this sequence active.
    /// JA: この sequence を開始または維持できる stage prefix です。
    /// </summary>
    public List<string> TriggerStagePrefixes { get; init; } = [];

    /// <summary>
    /// EN: Ordered deterministic steps that describe the intended motor program.
    /// JA: 意図した motor program を記述する ordered deterministic step です。
    /// </summary>
    public List<AutoplayActionSequenceStepDefinition> Steps { get; init; } = [];
}

/// <summary>
/// EN: Defines one deterministic step inside a semantic compound action sequence.
/// JA: semantic compound action sequence 内の deterministic step を 1 つ定義します。
/// </summary>
public sealed record AutoplayActionSequenceStepDefinition
{
    /// <summary>
    /// EN: Stable step identifier used by debug logs and runtime diagnostics.
    /// JA: debug log と runtime diagnostics が使用する安定した step identifier です。
    /// </summary>
    public string Id { get; init; } = "step";

    /// <summary>
    /// EN: Number of frames to hold this step unless the runtime advances by evidence.
    /// JA: runtime が evidence により進めない限り、この step を維持する frame 数です。
    /// </summary>
    public int Frames { get; init; } = 1;

    /// <summary>
    /// EN: Action field expressions used by the step when projected to an actuator runtime.
    /// JA: actuator runtime へ投影されるときにこの step が使う action field expression です。
    /// </summary>
    public Dictionary<string, string> Action { get; init; } = [];
}
