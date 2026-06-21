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
    /// <param name="zoeVetoed">EN: Indicates whether Zoe vetoed the bounded action. JA: Zoe が bounded action を veto したかどうかです。</param>
    /// <param name="svcEvent">EN: Zoe service-control event label. JA: Zoe service-control event label です。</param>
    public static PipelineStateDto From(
        DynamicPipelineContext context,
        ActionCommand action,
        bool zoeVetoed = false,
        string svcEvent = "none")
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
                Topology = CreateTopology(context),
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
                context.TurnRepeatFrames,
                context.UsePulseCooldownFrames,
                context.UsePulseSuppressedFrames,
                context.LastUsePulsePrediction,
                context.UsePulseAgeFrames,
                context.LowHealthThreshold,
                context.Health,
                context.CriticalHealthThreshold,
                zoeVetoed,
                svcEvent)
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

    private static NoesisTopologyDto CreateTopology(DynamicPipelineContext context)
    {
        var gap = Read(context.MeaningVectors, "gapVector");
        var landmark = Read(context.MeaningVectors, "landmarkVector");
        var foot = Read(context.Events, "footObstacle");
        var motion = Read(context.Events, "motionObstacle");
        var route = context.RoutePlan;
        var topology = new DoomRouteTopologyEvaluator().Evaluate(new DoomRouteTopologyInput
        {
            Gap = gap,
            Landmark = landmark,
            FootObstacle = foot,
            MotionObstacle = motion,
            FirstDoorRouteEvidence = route.FirstDoorRouteEvidence,
            RouteConfidence = route.RouteConfidence,
            RecommendedYaw = route.RecommendedYaw,
            RouteWallObstacle = route.RouteWallObstacle,
            RouteFootObstacle = route.RouteFootObstacle,
            RouteBarrelLaneRisk = route.RouteBarrelLaneRisk,
            RouteBarrelLaneDetourRequired = route.RouteBarrelLaneDetourRequired
        });
        var yawSign = Math.Sign(route.RecommendedYaw);
        var corridorStrength = Math.Max(Math.Max(gap, landmark), Math.Max(route.FirstDoorRouteEvidence, route.RouteConfidence));
        var centerlineX = yawSign == 0
            ? 0
            : ClampSigned(-yawSign * Math.Max(topology.BarrelZoneEvidence, 1 - topology.WallDistanceNormalized) * 0.8f);
        var centerlineY = Clamp01(1 - topology.BarrelZoneEvidence);
        var corridorX = yawSign == 0
            ? 0
            : ClampSigned(yawSign * corridorStrength);
        var corridorY = Clamp01(corridorStrength);

        return new NoesisTopologyDto
        {
            WallDistanceNormalized = topology.WallDistanceNormalized,
            CenterlineDirectionX = centerlineX,
            CenterlineDirectionY = centerlineY,
            BarrelZoneEvidence = topology.BarrelZoneEvidence,
            CorridorDirectionHintX = corridorX,
            CorridorDirectionHintY = corridorY,
            CenterCorridorAlignment = topology.CenterCorridorAlignment,
            DeadEndRisk = topology.DeadEndRisk
        };
    }

    private static float Read(IReadOnlyDictionary<string, float> values, string key)
        => values.TryGetValue(key, out var value)
            ? Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1)
            : 0;

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);

    private static float ClampSigned(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, -1, 1);
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
    /// EN: Thin topology projection used to observe wall distance, centerline pull, barrel-lane risk, and corridor direction.
    /// JA: wall distance、centerline pull、barrel-lane risk、corridor direction を観測するための薄い topology projection です。
    /// </summary>
    public NoesisTopologyDto Topology { get; init; } = NoesisTopologyDto.Empty;

    /// <summary>
    /// EN: Nous meaning vectors.
    /// JA: Nous meaning vector です。
    /// </summary>
    public IReadOnlyDictionary<string, float> NousVectors { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);
}

/// <summary>
/// EN: Noesis topology projection that lifts local route evidence into spatial-structure diagnostics.
/// JA: 局所 route evidence を spatial-structure diagnostics へ持ち上げる Noesis topology projection です。
/// </summary>
public sealed record NoesisTopologyDto
{
    /// <summary>
    /// EN: Empty topology projection.
    /// JA: 空の topology projection です。
    /// </summary>
    public static NoesisTopologyDto Empty { get; } = new();

    /// <summary>
    /// EN: Normalized distance from wall pressure where 0 means wall-adjacent and 1 means open center.
    /// JA: 0 が wall-adjacent、1 が open center を示す wall pressure からの正規化距離です。
    /// </summary>
    public float WallDistanceNormalized { get; init; } = 1;

    /// <summary>
    /// EN: Signed centerline pull on the horizontal axis.
    /// JA: 水平方向の符号付き centerline pull です。
    /// </summary>
    public float CenterlineDirectionX { get; init; }

    /// <summary>
    /// EN: Forward confidence for moving toward the centerline.
    /// JA: centerline へ向かう forward confidence です。
    /// </summary>
    public float CenterlineDirectionY { get; init; } = 1;

    /// <summary>
    /// EN: Evidence that the current route is trapped in a barrel-side lane.
    /// JA: 現在 route が barrel-side lane に捕まっている evidence です。
    /// </summary>
    public float BarrelZoneEvidence { get; init; }

    /// <summary>
    /// EN: Signed horizontal corridor hint derived from structural route evidence.
    /// JA: structural route evidence から導出した符号付き水平 corridor hint です。
    /// </summary>
    public float CorridorDirectionHintX { get; init; }

    /// <summary>
    /// EN: Forward confidence for the corridor direction hint.
    /// JA: corridor direction hint の forward confidence です。
    /// </summary>
    public float CorridorDirectionHintY { get; init; }

    /// <summary>
    /// EN: Dot-product alignment between centerline pull and corridor direction where negative means the two disagree.
    /// JA: centerline pull と corridor direction の dot-product alignment で、負値は両者の不一致を示します。
    /// </summary>
    public float CenterCorridorAlignment { get; init; }

    /// <summary>
    /// EN: Indicates a topology-derived route dead-end risk.
    /// JA: topology 由来の route dead-end risk を示します。
    /// </summary>
    public bool DeadEndRisk { get; init; }
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
    /// EN: Remaining cooldown frames before another bounded Use pulse may be emitted.
    /// JA: 次の bounded Use pulse を発行できるまでの残り cooldown frame 数です。
    /// </summary>
    public int UsePulseCooldownFrames { get; init; }

    /// <summary>
    /// EN: Number of consecutive frames where Use was requested but suppressed by the pulse gate.
    /// JA: Use が要求されたものの pulse gate によって抑止された連続 frame 数です。
    /// </summary>
    public int UsePulseSuppressedFrames { get; init; }

    /// <summary>
    /// EN: Prediction index where the last bounded Use pulse was emitted, or -1 when unknown.
    /// JA: 最後に bounded Use pulse を発行した prediction index です。不明な場合は -1 です。
    /// </summary>
    public int LastUsePulsePrediction { get; init; } = -1;

    /// <summary>
    /// EN: Frames elapsed since the last bounded Use pulse, or a large sentinel when no pulse is known.
    /// JA: 最後の bounded Use pulse から経過した frame 数です。既知の pulse がない場合は大きな番兵値です。
    /// </summary>
    public int UsePulseAgeFrames { get; init; } = 9999;

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
        => From(
            action,
            sourceAxis,
            lethalRisk,
            actionRepeatFrames,
            moveRepeatFrames,
            turnRepeatFrames,
            0,
            0,
            -1);

    /// <summary>
    /// EN: Creates a Kinesis state packet from an action command, risk score, repeat counters, and Use pulse-gate diagnostics.
    /// JA: action command、risk score、repeat counter、Use pulse-gate diagnostics から Kinesis state packet を作成します。
    /// </summary>
    /// <param name="action">EN: Action command. JA: action command です。</param>
    /// <param name="sourceAxis">EN: Source priority axis. JA: source priority axis です。</param>
    /// <param name="lethalRisk">EN: Normalized lethal-risk score. JA: 正規化済み lethal-risk score です。</param>
    /// <param name="actionRepeatFrames">EN: Same-action repeat frame count. JA: 同一 action の repeat frame 数です。</param>
    /// <param name="moveRepeatFrames">EN: Same-movement repeat frame count. JA: 同一 movement の repeat frame 数です。</param>
    /// <param name="turnRepeatFrames">EN: Same-turn repeat frame count. JA: 同一 turn の repeat frame 数です。</param>
    /// <param name="usePulseCooldownFrames">EN: Remaining Use pulse cooldown frames. JA: 残り Use pulse cooldown frame 数です。</param>
    /// <param name="usePulseSuppressedFrames">EN: Use pulse suppression frame count. JA: Use pulse 抑止 frame 数です。</param>
    /// <param name="lastUsePulsePrediction">EN: Last Use pulse prediction index. JA: 最後の Use pulse prediction index です。</param>
    public static KinesisStateDto From(
        ActionCommand action,
        string sourceAxis,
        float lethalRisk,
        int actionRepeatFrames,
        int moveRepeatFrames,
        int turnRepeatFrames,
        int usePulseCooldownFrames,
        int usePulseSuppressedFrames,
        int lastUsePulsePrediction)
        => From(
            action,
            sourceAxis,
            lethalRisk,
            actionRepeatFrames,
            moveRepeatFrames,
            turnRepeatFrames,
            usePulseCooldownFrames,
            usePulseSuppressedFrames,
            lastUsePulsePrediction,
            10);

    /// <summary>
    /// EN: Creates a Kinesis state packet from an action command, risk score, repeat counters, Use pulse-gate diagnostics, and the displayed health threshold.
    /// JA: action command、risk score、repeat counter、Use pulse-gate diagnostics、表示用 health threshold から Kinesis state packet を作成します。
    /// </summary>
    /// <param name="action">EN: Action command. JA: action command です。</param>
    /// <param name="sourceAxis">EN: Source priority axis. JA: source priority axis です。</param>
    /// <param name="lethalRisk">EN: Normalized lethal-risk score. JA: 正規化済み lethal-risk score です。</param>
    /// <param name="actionRepeatFrames">EN: Same-action repeat frame count. JA: 同一 action の repeat frame 数です。</param>
    /// <param name="moveRepeatFrames">EN: Same-movement repeat frame count. JA: 同一 movement の repeat frame 数です。</param>
    /// <param name="turnRepeatFrames">EN: Same-turn repeat frame count. JA: 同一 turn の repeat frame 数です。</param>
    /// <param name="usePulseCooldownFrames">EN: Remaining Use pulse cooldown frames. JA: 残り Use pulse cooldown frame 数です。</param>
    /// <param name="usePulseSuppressedFrames">EN: Use pulse suppression frame count. JA: Use pulse 抑止 frame 数です。</param>
    /// <param name="lastUsePulsePrediction">EN: Last Use pulse prediction index. JA: 最後の Use pulse prediction index です。</param>
    /// <param name="healthThreshold">EN: Health threshold shown in Zoe HUD diagnostics. JA: Zoe HUD diagnostics に表示する health threshold です。</param>
    public static KinesisStateDto From(
        ActionCommand action,
        string sourceAxis,
        float lethalRisk,
        int actionRepeatFrames,
        int moveRepeatFrames,
        int turnRepeatFrames,
        int usePulseCooldownFrames,
        int usePulseSuppressedFrames,
        int lastUsePulsePrediction,
        int healthThreshold)
        => From(
            action,
            sourceAxis,
            lethalRisk,
            actionRepeatFrames,
            moveRepeatFrames,
            turnRepeatFrames,
            usePulseCooldownFrames,
            usePulseSuppressedFrames,
            lastUsePulsePrediction,
            9999,
            healthThreshold);

    /// <summary>
    /// EN: Creates a Kinesis state packet from an action command, risk score, repeat counters, Use pulse-gate diagnostics, Use pulse age, and the displayed health threshold.
    /// JA: action command、risk score、repeat counter、Use pulse-gate diagnostics、Use pulse age、表示用 health threshold から Kinesis state packet を作成します。
    /// </summary>
    /// <param name="action">EN: Action command. JA: action command です。</param>
    /// <param name="sourceAxis">EN: Source priority axis. JA: source priority axis です。</param>
    /// <param name="lethalRisk">EN: Normalized lethal-risk score. JA: 正規化済み lethal-risk score です。</param>
    /// <param name="actionRepeatFrames">EN: Same-action repeat frame count. JA: 同一 action の repeat frame 数です。</param>
    /// <param name="moveRepeatFrames">EN: Same-movement repeat frame count. JA: 同一 movement の repeat frame 数です。</param>
    /// <param name="turnRepeatFrames">EN: Same-turn repeat frame count. JA: 同一 turn の repeat frame 数です。</param>
    /// <param name="usePulseCooldownFrames">EN: Remaining Use pulse cooldown frames. JA: 残り Use pulse cooldown frame 数です。</param>
    /// <param name="usePulseSuppressedFrames">EN: Use pulse suppression frame count. JA: Use pulse 抑止 frame 数です。</param>
    /// <param name="lastUsePulsePrediction">EN: Last Use pulse prediction index. JA: 最後の Use pulse prediction index です。</param>
    /// <param name="usePulseAgeFrames">EN: Frames elapsed since the last bounded Use pulse. JA: 最後の bounded Use pulse から経過した frame 数です。</param>
    /// <param name="healthThreshold">EN: Health threshold shown in Zoe HUD diagnostics. JA: Zoe HUD diagnostics に表示する health threshold です。</param>
    /// <param name="health">EN: Current health shown in Zoe HUD diagnostics. JA: Zoe HUD diagnostics に表示する現在 health です。</param>
    /// <param name="criticalHealthThreshold">EN: Critical health threshold shown in Zoe HUD diagnostics. JA: Zoe HUD diagnostics に表示する critical health threshold です。</param>
    /// <param name="zoeVetoed">EN: Whether the final action was actually vetoed by Zoe. JA: 最終 action が実際に Zoe によって veto されたかどうかです。</param>
    /// <param name="svcEvent">EN: Zoe service-control event label. JA: Zoe service-control event label です。</param>
    public static KinesisStateDto From(
        ActionCommand action,
        string sourceAxis,
        float lethalRisk,
        int actionRepeatFrames,
        int moveRepeatFrames,
        int turnRepeatFrames,
        int usePulseCooldownFrames,
        int usePulseSuppressedFrames,
        int lastUsePulsePrediction,
        int usePulseAgeFrames,
        int healthThreshold,
        float health = 100,
        int criticalHealthThreshold = 18,
        bool zoeVetoed = false,
        string svcEvent = "none")
    {
        var clampedRisk = Clamp01(lethalRisk);
        var displayedHealthThreshold = Math.Max(1, healthThreshold);
        var displayedCriticalThreshold = Math.Max(1, Math.Min(displayedHealthThreshold, criticalHealthThreshold));
        var displayedHealth = float.IsFinite(health) ? Math.Clamp(health, 0, 100) : 100;
        var lowHealth = displayedHealth > 0 && displayedHealth < displayedHealthThreshold;
        var criticalHealth = displayedHealth > 0 && displayedHealth < displayedCriticalThreshold;
        var warning = zoeVetoed || lowHealth || criticalHealth || clampedRisk >= 0.50f;
        var reason = zoeVetoed
            ? (string.IsNullOrWhiteSpace(svcEvent) || string.Equals(svcEvent, "none", StringComparison.OrdinalIgnoreCase)
                ? "zoe-veto"
                : svcEvent)
            : (criticalHealth ? "critical-health" : (lowHealth ? "low-health-goal-first" : "none"));
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
            UsePulseCooldownFrames = Math.Max(0, usePulseCooldownFrames),
            UsePulseSuppressedFrames = Math.Max(0, usePulseSuppressedFrames),
            LastUsePulsePrediction = Math.Max(-1, lastUsePulsePrediction),
            UsePulseAgeFrames = Math.Max(0, usePulseAgeFrames),
            Zoe = new ZoeVetoStateDto
            {
                Vetoed = zoeVetoed,
                Warning = warning,
                LowHealth = lowHealth,
                CriticalHealth = criticalHealth,
                Health = displayedHealth,
                LethalRisk = clampedRisk,
                HealthThreshold = displayedHealthThreshold,
                CriticalHealthThreshold = displayedCriticalThreshold,
                LastReason = reason,
                OverrideAction = zoeVetoed ? "stop" : "none"
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
    /// EN: Indicates whether Zoe should be highlighted because health or risk is concerning even without a veto.
    /// JA: veto がなくても health または risk に注意が必要なため Zoe を強調表示すべきかどうかを示します。
    /// </summary>
    public bool Warning { get; init; }

    /// <summary>
    /// EN: Indicates whether health is below the goal-first threshold.
    /// JA: health が goal-first threshold を下回っているかどうかを示します。
    /// </summary>
    public bool LowHealth { get; init; }

    /// <summary>
    /// EN: Indicates whether health is below the critical survival threshold.
    /// JA: health が critical survival threshold を下回っているかどうかを示します。
    /// </summary>
    public bool CriticalHealth { get; init; }

    /// <summary>
    /// EN: Current health value used by the Zoe projection.
    /// JA: Zoe projection が利用した現在 health 値です。
    /// </summary>
    public float Health { get; init; } = 100;

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
    /// EN: Critical health threshold used by the displayed Zoe warning rule.
    /// JA: 表示中の Zoe warning rule で利用する critical health threshold です。
    /// </summary>
    public int CriticalHealthThreshold { get; init; } = 18;

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
