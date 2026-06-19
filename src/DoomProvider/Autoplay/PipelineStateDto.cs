namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Structured pipeline state packet used by HUD and diagnostics surfaces.
/// JA: HUD と diagnostics surface が利用する構造化済み pipeline state packet です。
/// </summary>
public sealed record PipelineStateDto
{
    /// <summary>
    /// EN: Empty pipeline state used before the runtime has observed a frame.
    /// JA: runtime が frame を観測する前に使う空の pipeline state です。
    /// </summary>
    public static PipelineStateDto Empty { get; } = new();

    /// <summary>
    /// EN: Aisthesis layer state containing normalized sensor readings.
    /// JA: 正規化済み sensor reading を保持する Aisthesis layer state です。
    /// </summary>
    public SensorLayerStateDto Aisthesis { get; init; } = SensorLayerStateDto.Empty;

    /// <summary>
    /// EN: Noesis layer state containing Phainesis events and Nous meaning vectors.
    /// JA: Phainesis event と Nous meaning vector を保持する Noesis layer state です。
    /// </summary>
    public NoesisStateDto Noesis { get; init; } = NoesisStateDto.Empty;

    /// <summary>
    /// EN: Krisis layer state containing Topos and Kairos observation carriers.
    /// JA: Topos と Kairos の observation carrier を保持する Krisis layer state です。
    /// </summary>
    public KrisisStateDto Krisis { get; init; } = KrisisStateDto.Empty;

    /// <summary>
    /// EN: Kinesis layer state containing the bounded action selected for the frame.
    /// JA: frame で選択された bounded action を保持する Kinesis layer state です。
    /// </summary>
    public KinesisStateDto Kinesis { get; init; } = KinesisStateDto.Empty;

    /// <summary>
    /// EN: Creates a pipeline state packet from dynamic pipeline carriers and an action.
    /// JA: dynamic pipeline carrier と action から pipeline state packet を作成します。
    /// </summary>
    /// <param name="context">EN: Dynamic pipeline context. JA: dynamic pipeline context です。</param>
    /// <param name="action">EN: Bounded action selected by the runtime. JA: runtime が選択した bounded action です。</param>
    public static PipelineStateDto From(DynamicPipelineContext context, ActionCommand action)
    {
        ArgumentNullException.ThrowIfNull(context);

        return new PipelineStateDto
        {
            Aisthesis = new SensorLayerStateDto
            {
                SensorReadings = Copy(context.SensorReadings),
                RoutePlan = context.RoutePlan
            },
            Noesis = new NoesisStateDto
            {
                PhainesisEvents = Copy(context.Events),
                EventLabels = SelectLabels(context.Events),
                MeaningVector4 = CreateMeaningVector4(context),
                NousVectors = Copy(context.MeaningVectors)
            },
            Krisis = new KrisisStateDto
            {
                ToposVectors = Copy(context.ToposVectors),
                ToposLabels = SelectLabels(context.ToposVectors),
                Kairos = PriorityAxisDto.From(context)
            },
            Kinesis = KinesisStateDto.From(
                action,
                context.SelectedAxis,
                context.LethalRisk,
                context.ActionRepeatFrames,
                context.MoveRepeatFrames,
                context.TurnRepeatFrames)
        };
    }

    private static IReadOnlyDictionary<string, float> Copy(IReadOnlyDictionary<string, float> values)
        => new Dictionary<string, float>(values, StringComparer.Ordinal);

    private static IReadOnlyList<string> SelectLabels(IReadOnlyDictionary<string, float> values)
        => values
            .Where(pair => pair.Value > 0.01f)
            .OrderByDescending(pair => pair.Value)
            .ThenBy(pair => pair.Key, StringComparer.Ordinal)
            .Take(4)
            .Select(pair => pair.Key)
            .ToArray();

    private static IReadOnlyList<float> CreateMeaningVector4(DynamicPipelineContext context)
        => new[]
        {
            Read(context.MeaningVectors, "gapVector"),
            Read(context.MeaningVectors, "landmarkVector"),
            Read(context.Events, "footObstacle"),
            Read(context.Events, "motionObstacle")
        };

    private static float Read(IReadOnlyDictionary<string, float> values, string key)
        => values.TryGetValue(key, out var value)
            ? Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1)
            : 0;
}

/// <summary>
/// EN: Aisthesis diagnostic state for sensor observation.
/// JA: sensor observation 用の Aisthesis diagnostic state です。
/// </summary>
public sealed record SensorLayerStateDto
{
    /// <summary>
    /// EN: Empty Aisthesis state.
    /// JA: 空の Aisthesis state です。
    /// </summary>
    public static SensorLayerStateDto Empty { get; } = new();

    /// <summary>
    /// EN: Normalized sensor readings keyed by stable sensor names.
    /// JA: stable sensor 名を key とする正規化済み sensor reading です。
    /// </summary>
    public IReadOnlyDictionary<string, float> SensorReadings { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Route plan derived from raw sensor evidence.
    /// JA: raw sensor evidence から導出された route plan です。
    /// </summary>
    public DoomRoutePlannerResult RoutePlan { get; init; } = DoomRoutePlannerResult.Empty;
}

/// <summary>
/// EN: Noesis diagnostic state for phenomenon and meaning-vector observation.
/// JA: phenomenon と meaning-vector observation 用の Noesis diagnostic state です。
/// </summary>
public sealed record NoesisStateDto
{
    /// <summary>
    /// EN: Empty Noesis state.
    /// JA: 空の Noesis state です。
    /// </summary>
    public static NoesisStateDto Empty { get; } = new();

    /// <summary>
    /// EN: Phainesis event scores.
    /// JA: Phainesis event score です。
    /// </summary>
    public IReadOnlyDictionary<string, float> PhainesisEvents { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Human-readable Phainesis event labels projected from the strongest event scores.
    /// JA: 最も強い event score から射影した、人間が読める Phainesis event label です。
    /// </summary>
    public IReadOnlyList<string> EventLabels { get; init; } = Array.Empty<string>();

    /// <summary>
    /// EN: Compact [gap, landmark, foot, motion] meaning vector used by the HUD.
    /// JA: HUD が利用する [gap, landmark, foot, motion] の compact meaning vector です。
    /// </summary>
    public IReadOnlyList<float> MeaningVector4 { get; init; } = Array.Empty<float>();

    /// <summary>
    /// EN: Nous meaning vectors.
    /// JA: Nous meaning vector です。
    /// </summary>
    public IReadOnlyDictionary<string, float> NousVectors { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);
}

/// <summary>
/// EN: Krisis diagnostic state for Topos and Kairos observation.
/// JA: Topos と Kairos observation 用の Krisis diagnostic state です。
/// </summary>
public sealed record KrisisStateDto
{
    /// <summary>
    /// EN: Empty Krisis state.
    /// JA: 空の Krisis state です。
    /// </summary>
    public static KrisisStateDto Empty { get; } = new();

    /// <summary>
    /// EN: Topos vector carrier values.
    /// JA: Topos vector carrier 値です。
    /// </summary>
    public IReadOnlyDictionary<string, float> ToposVectors { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Human-readable Topos labels projected from active route and vector evidence.
    /// JA: active route と vector evidence から射影した、人間が読める Topos label です。
    /// </summary>
    public IReadOnlyList<string> ToposLabels { get; init; } = Array.Empty<string>();

    /// <summary>
    /// EN: Kairos priority axis selected for the current frame.
    /// JA: 現在 frame で選択された Kairos priority axis です。
    /// </summary>
    public PriorityAxisDto Kairos { get; init; } = PriorityAxisDto.Empty;
}

/// <summary>
/// EN: Kinesis diagnostic state for bounded action output.
/// JA: bounded action output 用の Kinesis diagnostic state です。
/// </summary>
public sealed record KinesisStateDto
{
    /// <summary>
    /// EN: Empty Kinesis state.
    /// JA: 空の Kinesis state です。
    /// </summary>
    public static KinesisStateDto Empty { get; } = new();

    /// <summary>
    /// EN: Indicates forward movement.
    /// JA: forward movement を示します。
    /// </summary>
    public bool MoveForward { get; init; }

    /// <summary>
    /// EN: Indicates backward movement.
    /// JA: backward movement を示します。
    /// </summary>
    public bool MoveBackward { get; init; }

    /// <summary>
    /// EN: Indicates left strafe.
    /// JA: left strafe を示します。
    /// </summary>
    public bool StrafeLeft { get; init; }

    /// <summary>
    /// EN: Indicates right strafe.
    /// JA: right strafe を示します。
    /// </summary>
    public bool StrafeRight { get; init; }

    /// <summary>
    /// EN: Yaw amount selected for the frame.
    /// JA: frame で選択された yaw 量です。
    /// </summary>
    public int TurnYaw { get; init; }

    /// <summary>
    /// EN: Indicates use/interact input.
    /// JA: use/interact input を示します。
    /// </summary>
    public bool UseKey { get; init; }

    /// <summary>
    /// EN: Indicates attack input.
    /// JA: attack input を示します。
    /// </summary>
    public bool AttackKey { get; init; }

    /// <summary>
    /// EN: Priority axis that produced or preserved this action.
    /// JA: この action を生成または維持した priority axis です。
    /// </summary>
    public string SourceAxis { get; init; } = "logos";

    /// <summary>
    /// EN: Number of consecutive frames that emitted the same bounded Kinesis action signature.
    /// JA: 同じ bounded Kinesis action signature を連続発行した frame 数です。
    /// </summary>
    public int ActionRepeatFrames { get; init; }

    /// <summary>
    /// EN: Number of consecutive frames that emitted the same movement component.
    /// JA: 同じ movement component を連続発行した frame 数です。
    /// </summary>
    public int MoveRepeatFrames { get; init; }

    /// <summary>
    /// EN: Number of consecutive frames that emitted the same turn component.
    /// JA: 同じ turn component を連続発行した frame 数です。
    /// </summary>
    public int TurnRepeatFrames { get; init; }

    /// <summary>
    /// EN: Zoe veto observation state for health-based safety visualization.
    /// JA: health-based safety visualization 用の Zoe veto observation state です。
    /// </summary>
    public ZoeVetoStateDto Zoe { get; init; } = ZoeVetoStateDto.Empty;

    /// <summary>
    /// EN: Creates a Kinesis state packet from an action command.
    /// JA: action command から Kinesis state packet を作成します。
    /// </summary>
    /// <param name="action">EN: Action command. JA: action command です。</param>
    /// <param name="sourceAxis">EN: Source priority axis. JA: source priority axis です。</param>
    public static KinesisStateDto From(ActionCommand action, string sourceAxis)
        => From(action, sourceAxis, 0);

    /// <summary>
    /// EN: Creates a Kinesis state packet from an action command and lethal-risk score.
    /// JA: action command と lethal-risk score から Kinesis state packet を作成します。
    /// </summary>
    /// <param name="action">EN: Action command. JA: action command です。</param>
    /// <param name="sourceAxis">EN: Source priority axis. JA: source priority axis です。</param>
    /// <param name="lethalRisk">EN: Normalized lethal-risk score. JA: 正規化済み lethal-risk score です。</param>
    public static KinesisStateDto From(ActionCommand action, string sourceAxis, float lethalRisk)
        => From(action, sourceAxis, lethalRisk, 0, 0, 0);

    /// <summary>
    /// EN: Creates a Kinesis state packet from an action command, lethal-risk score, and repeat counters.
    /// JA: action command、lethal-risk score、repeat counter から Kinesis state packet を作成します。
    /// </summary>
    /// <param name="action">EN: Action command. JA: action command です。</param>
    /// <param name="sourceAxis">EN: Source priority axis. JA: source priority axis です。</param>
    /// <param name="lethalRisk">EN: Normalized lethal-risk score. JA: 正規化済み lethal-risk score です。</param>
    /// <param name="actionRepeatFrames">EN: Same-action repeat frame count. JA: 同一 action の repeat frame 数です。</param>
    /// <param name="moveRepeatFrames">EN: Same-movement repeat frame count. JA: 同一 movement の repeat frame 数です。</param>
    /// <param name="turnRepeatFrames">EN: Same-turn repeat frame count. JA: 同一 turn の repeat frame 数です。</param>
    public static KinesisStateDto From(
        ActionCommand action,
        string sourceAxis,
        float lethalRisk,
        int actionRepeatFrames,
        int moveRepeatFrames,
        int turnRepeatFrames)
    {
        var clampedRisk = Clamp01(lethalRisk);
        var vetoed = clampedRisk >= 0.70f;
        return new KinesisStateDto
        {
            MoveForward = action.MoveForward,
            MoveBackward = action.MoveBackward,
            StrafeLeft = action.StrafeLeft,
            StrafeRight = action.StrafeRight,
            TurnYaw = action.TurnYaw,
            UseKey = action.UseKey,
            AttackKey = action.AttackKey,
            SourceAxis = NormalizeAxis(sourceAxis),
            ActionRepeatFrames = Math.Max(0, actionRepeatFrames),
            MoveRepeatFrames = Math.Max(0, moveRepeatFrames),
            TurnRepeatFrames = Math.Max(0, turnRepeatFrames),
            Zoe = new ZoeVetoStateDto
            {
                Vetoed = vetoed,
                LethalRisk = clampedRisk,
                HealthThreshold = 10,
                LastReason = vetoed ? "health-lethal-risk" : "none",
                OverrideAction = vetoed ? "stop" : "none"
            }
        };
    }

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);

    private static string NormalizeAxis(string axis)
        => string.Equals(axis, "pathos", StringComparison.OrdinalIgnoreCase)
            ? "pathos"
            : (string.Equals(axis, "ethos", StringComparison.OrdinalIgnoreCase) ? "ethos" : "logos");
}

/// <summary>
/// EN: Zoe veto state exposed to the Kinesis panel.
/// JA: Kinesis panel に公開される Zoe veto state です。
/// </summary>
public sealed record ZoeVetoStateDto
{
    /// <summary>
    /// EN: Empty Zoe veto state.
    /// JA: 空の Zoe veto state です。
    /// </summary>
    public static ZoeVetoStateDto Empty { get; } = new();

    /// <summary>
    /// EN: Indicates whether Zoe veto blocked or altered the action.
    /// JA: Zoe veto が action を block または変更したかどうかを示します。
    /// </summary>
    public bool Vetoed { get; init; }

    /// <summary>
    /// EN: Normalized lethal-risk score.
    /// JA: 正規化済み lethal-risk score です。
    /// </summary>
    public float LethalRisk { get; init; }

    /// <summary>
    /// EN: Health threshold used by the displayed veto rule.
    /// JA: 表示中の veto rule で利用する health threshold です。
    /// </summary>
    public int HealthThreshold { get; init; } = 10;

    /// <summary>
    /// EN: Last veto reason if a veto was applied.
    /// JA: veto が適用された場合の最後の veto reason です。
    /// </summary>
    public string LastReason { get; init; } = "none";

    /// <summary>
    /// EN: Action override applied by Zoe, such as stop or none.
    /// JA: Zoe が適用した stop や none などの action override です。
    /// </summary>
    public string OverrideAction { get; init; } = "none";
}

/// <summary>
/// EN: Kairos priority-axis DTO intended for HUD rendering.
/// JA: HUD rendering を目的とした Kairos priority-axis DTO です。
/// </summary>
public sealed record PriorityAxisDto
{
    /// <summary>
    /// EN: Empty Kairos priority axis packet.
    /// JA: 空の Kairos priority axis packet です。
    /// </summary>
    public static PriorityAxisDto Empty { get; } = new();

    /// <summary>
    /// EN: Logos priority value.
    /// JA: Logos priority 値です。
    /// </summary>
    public float Logos { get; init; }

    /// <summary>
    /// EN: Pathos priority value.
    /// JA: Pathos priority 値です。
    /// </summary>
    public float Pathos { get; init; }

    /// <summary>
    /// EN: Ethos priority value.
    /// JA: Ethos priority 値です。
    /// </summary>
    public float Ethos { get; init; }

    /// <summary>
    /// EN: Selected priority axis in lowercase canonical form.
    /// JA: lowercase canonical form の選択済み priority axis です。
    /// </summary>
    public string SelectedAxis { get; init; } = "logos";

    /// <summary>
    /// EN: Indicates whether Logos is the selected axis.
    /// JA: Logos が選択済み axis かどうかを示します。
    /// </summary>
    public bool IsLogosDominant => string.Equals(SelectedAxis, "logos", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// EN: Indicates whether Pathos is the selected axis.
    /// JA: Pathos が選択済み axis かどうかを示します。
    /// </summary>
    public bool IsPathosDominant => string.Equals(SelectedAxis, "pathos", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// EN: Indicates whether Ethos is the selected axis.
    /// JA: Ethos が選択済み axis かどうかを示します。
    /// </summary>
    public bool IsEthosDominant => string.Equals(SelectedAxis, "ethos", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// EN: Creates a Kairos axis packet from priority axes.
    /// JA: priority axis から Kairos axis packet を作成します。
    /// </summary>
    /// <param name="priority">EN: Priority axis source. JA: priority axis source です。</param>
    public static PriorityAxisDto From(PriorityAxes priority)
    {
        ArgumentNullException.ThrowIfNull(priority);

        return new PriorityAxisDto
        {
            Logos = Clamp01(priority.LogosPriority),
            Pathos = Clamp01(priority.PathosPriority),
            Ethos = Clamp01(priority.EthosPriority),
            SelectedAxis = NormalizeAxis(priority.SelectedAxis)
        };
    }

    /// <summary>
    /// EN: Creates a Kairos axis packet from a dynamic pipeline context.
    /// JA: dynamic pipeline context から Kairos axis packet を作成します。
    /// </summary>
    /// <param name="context">EN: Dynamic pipeline context. JA: dynamic pipeline context です。</param>
    public static PriorityAxisDto From(DynamicPipelineContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        return new PriorityAxisDto
        {
            Logos = Read(context.Priorities, "logos"),
            Pathos = Read(context.Priorities, "pathos"),
            Ethos = Read(context.Priorities, "ethos"),
            SelectedAxis = NormalizeAxis(context.SelectedAxis)
        };
    }

    private static float Read(IReadOnlyDictionary<string, float> values, string key)
    {
        if (values.TryGetValue(key, out var value))
        {
            return Clamp01(value);
        }

        return 0;
    }

    private static string NormalizeAxis(string axis)
        => string.Equals(axis, "pathos", StringComparison.OrdinalIgnoreCase)
            ? "pathos"
            : (string.Equals(axis, "ethos", StringComparison.OrdinalIgnoreCase) ? "ethos" : "logos");

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}
