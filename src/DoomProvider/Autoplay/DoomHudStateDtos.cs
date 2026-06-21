namespace AIKernel.Doom.Provider.Autoplay;

internal static class DoomGpuContracts
{
    public const string RawFramebufferTarget = "doom";
    public const string RawFramebufferWireName = "raw-framebuffer";
    public const string HudCompositeTarget = "doom-hud";
    public const string HudCompositeWireName = "hud-composite-offscreen";
    public const string DisplayCanvasFallbackTarget = "display-canvas";
    public const string DisplayCanvasFallbackWireName = "display-canvas-fallback";
    public const string AisthesisFeatureBufferTarget = "doom.gpu.aisthesis.features";
    public const string AisthesisMatrixBufferTarget = "doom.gpu.aisthesis.matrix";
    public const string AisthesisMaskTarget = "doom.gpu.aisthesis.mask9x9";
    public const string AisthesisMaskWireName = "gpu-aisthesis-mask9x9";
    public const string AisthesisMaskLayout = "mask9x9:heat,red,edge,corner";
    public const string AisthesisMaskUsage = "analysis-mask";
    public const string SpatialReasoningOutputTarget = "doom.gpu.spatial.reasoning";
    public const int HudGridSize = 9;
    public const int HudCellCount = HudGridSize * HudGridSize;
    public const int HudPanelValueCount = 16;
    public const int HudRectCount = 16;
    public const int HudLabelCount = 16;
    public const int HudRectStride = 8;
    public const int HudRectFloatCount = HudRectCount * HudRectStride;
    public const int AisthesisMatrixFloatCount = 512;
    public const int AisthesisFeatureFloatCount = 32;
    public const int SpatialReasoningOutputFloatCount = 32;
    public const int StateVectorFloatCount = 16;
    public const string HudRectLayoutName = "rect8";
    public const string HudPanelLayoutName = "panel16";
    public const string StateVectorLayoutName = "state16";
    public const string SpatialReasoningVectorLayoutName = "spatial32";

    public static readonly IReadOnlyList<string> HudRectFields =
    [
        "left",
        "top",
        "right",
        "bottom",
        "r",
        "g",
        "b",
        "alpha"
    ];

    public static readonly IReadOnlyList<string> HudPanelFields =
    [
        "aisthesis",
        "noesis",
        "krisis",
        "kinesis",
        "route",
        "loop",
        "door",
        "combat",
        "zoe",
        "logos",
        "pathos",
        "ethos",
        "wall",
        "barrel",
        "alignment",
        "use"
    ];

    public static readonly IReadOnlyList<string> StateVectorFields =
    [
        "route",
        "loop",
        "door",
        "combat",
        "zoe",
        "logos",
        "pathos",
        "ethos",
        "topology",
        "use"
    ];

    public static readonly IReadOnlyList<string> SpatialReasoningVectorFields =
    [
        "enabled",
        "route",
        "cost",
        "threat",
        "zoe",
        "ctg",
        "yaw",
        "frame",
        "matrixCount",
        "matrixFloats",
        "luma",
        "red",
        "edge",
        "corner",
        "cornerAverage",
        "outputCode",
        "reserved16",
        "reserved17",
        "reserved18",
        "reserved19",
        "maskHeat",
        "maskRed",
        "maskEdge",
        "maskCorner"
    ];
}

/// <summary>
/// EN: Aggregated autoplay state packet for HUD rendering and thin JS bridges.
/// JA: HUD rendering と薄い JS bridge のための集約済み autoplay state packet です。
/// </summary>
public sealed record DoomAutoplayStateDto
{
    /// <summary>
    /// EN: Empty autoplay state used before the first runtime decision is available.
    /// JA: 最初の runtime decision が利用可能になる前に使う空の autoplay state です。
    /// </summary>
    public static DoomAutoplayStateDto Empty { get; } = new();

    /// <summary>
    /// EN: Current route name selected by route planning.
    /// JA: route planning が選択した現在の route 名です。
    /// </summary>
    public string CurrentRoute { get; init; } = "idle";

    /// <summary>
    /// EN: Current landmark or route anchor used by the navigator.
    /// JA: navigator が利用する現在の landmark または route anchor です。
    /// </summary>
    public string CurrentLandmark { get; init; } = "none";

    /// <summary>
    /// EN: Route confidence selected by the route planner.
    /// JA: route planner が選択した route confidence です。
    /// </summary>
    public float RouteConfidence { get; init; }

    /// <summary>
    /// EN: Signed yaw reacquisition hint selected by route planning.
    /// JA: route planning が選択した符号付き yaw 再定位 hint です。
    /// </summary>
    public int RecommendedYaw { get; init; }

    /// <summary>
    /// EN: Foot-lane obstacle state in stable text form.
    /// JA: foot lane obstacle state を stable text 形式で表します。
    /// </summary>
    public string FootObstacleState { get; init; } = "clear";

    /// <summary>
    /// EN: Motion obstacle state in stable text form.
    /// JA: motion obstacle state を stable text 形式で表します。
    /// </summary>
    public string MotionObstacleState { get; init; } = "clear";

    /// <summary>
    /// EN: Suggested action hint emitted for the drawing and control bridge.
    /// JA: drawing と control bridge 向けに出力される suggested action hint です。
    /// </summary>
    public DoomActionHintDto SuggestedAction { get; init; } = DoomActionHintDto.Empty;

    /// <summary>
    /// EN: Route planner diagnostics used to explain route selection.
    /// JA: route selection を説明するための route planner diagnostics です。
    /// </summary>
    public DoomRoutePlannerResult RoutePlan { get; init; } = DoomRoutePlannerResult.Empty;

    /// <summary>
    /// EN: Landmark navigator diagnostics used to explain steering hints.
    /// JA: steering hint を説明するための landmark navigator diagnostics です。
    /// </summary>
    public DoomLandmarkNavigatorResult Navigator { get; init; } = DoomLandmarkNavigatorResult.Empty;

    /// <summary>
    /// EN: Four-layer pipeline state rendered by the pipeline panel.
    /// JA: pipeline panel が描画する 4-layer pipeline state です。
    /// </summary>
    public PipelineStateDto PipelineState { get; init; } = PipelineStateDto.Empty;

    /// <summary>
    /// EN: Goal panel state rendered as TELOS, OBJECTIVE, and PRIORITY.
    /// JA: TELOS、OBJECTIVE、PRIORITY として描画される goal panel state です。
    /// </summary>
    public DoomGoalStateDto GoalState { get; init; } = DoomGoalStateDto.Empty;

    /// <summary>
    /// EN: Debug overlay state rendered as frames, grid cells, and probe hints.
    /// JA: frame、grid cell、probe hint として描画される debug overlay state です。
    /// </summary>
    public DoomDebugOverlayDto DebugOverlay { get; init; } = DoomDebugOverlayDto.Empty;

    /// <summary>
    /// EN: Creates a complete autoplay DTO set from route, pipeline, and action carriers.
    /// JA: route、pipeline、action carrier から完全な autoplay DTO セットを作成します。
    /// </summary>
    /// <param name="objective">EN: Current objective id. JA: 現在の objective id です。</param>
    /// <param name="controlPipeline">EN: Current control pipeline id. JA: 現在の control pipeline id です。</param>
    /// <param name="routePlan">EN: Route planner result. JA: route planner result です。</param>
    /// <param name="navigator">EN: Landmark navigator result. JA: landmark navigator result です。</param>
    /// <param name="pipelineState">EN: Four-layer pipeline state. JA: 4-layer pipeline state です。</param>
    /// <param name="action">EN: Selected action command. JA: 選択済み action command です。</param>
    public static DoomAutoplayStateDto From(
        string objective,
        string controlPipeline,
        DoomRoutePlannerResult routePlan,
        DoomLandmarkNavigatorResult navigator,
        PipelineStateDto pipelineState,
        ActionCommand action)
    {
        routePlan ??= DoomRoutePlannerResult.Empty;
        navigator ??= DoomLandmarkNavigatorResult.Empty;
        pipelineState ??= PipelineStateDto.Empty;

        var currentRoute = ResolveRoute(objective, controlPipeline, routePlan);
        var currentLandmark = ResolveLandmark(routePlan, navigator);
        var recommendedYaw = routePlan.RecommendedYaw != 0 ? routePlan.RecommendedYaw : navigator.RecommendedYaw;
        var hint = DoomActionHintDto.From(action, recommendedYaw);
        var goal = DoomGoalStateDto.From(objective, controlPipeline, pipelineState.Krisis.Kairos, action);
        var debug = DoomDebugOverlayDto.From(goal, pipelineState, routePlan, navigator, action);

        return new DoomAutoplayStateDto
        {
            CurrentRoute = currentRoute,
            CurrentLandmark = currentLandmark,
            RouteConfidence = routePlan.RouteConfidence,
            RecommendedYaw = recommendedYaw,
            FootObstacleState = routePlan.RouteFootClearRequired
                ? "clear-required"
                : (routePlan.RouteFootObstacle ? "blocked" : "clear"),
            MotionObstacleState = routePlan.RouteWallObstacle
                ? "wall-contact"
                : (routePlan.RouteCloseObstacle ? "close-obstacle" : "clear"),
            SuggestedAction = hint,
            RoutePlan = routePlan,
            Navigator = navigator,
            PipelineState = pipelineState,
            GoalState = goal,
            DebugOverlay = debug
        };
    }

    private static string ResolveRoute(string objective, string controlPipeline, DoomRoutePlannerResult routePlan)
    {
        if (!string.IsNullOrWhiteSpace(routePlan.CurrentRoute) && routePlan.CurrentRoute != "open-space-cruise")
        {
            return routePlan.CurrentRoute;
        }

        var objectiveText = Normalize(objective);
        var pipelineText = Normalize(controlPipeline);
        if (routePlan.RouteOpenSpaceLowGapEscape)
        {
            return "open-space-low-gap-escape";
        }

        if (routePlan.FirstDoorRouteEvidenceReady || objectiveText.Contains("first-door", StringComparison.Ordinal))
        {
            return "first-door-route";
        }

        if (objectiveText.Contains("computer", StringComparison.Ordinal) || pipelineText.Contains("computer", StringComparison.Ordinal))
        {
            return "computer-control-room";
        }

        if (routePlan.RouteWallObstacle)
        {
            return "wall-follow-fallback";
        }

        return string.IsNullOrWhiteSpace(pipelineText) ? "idle" : pipelineText;
    }

    private static string ResolveLandmark(DoomRoutePlannerResult routePlan, DoomLandmarkNavigatorResult navigator)
    {
        if (!string.IsNullOrWhiteSpace(routePlan.CurrentLandmark) && routePlan.CurrentLandmark != "none")
        {
            return routePlan.CurrentLandmark;
        }

        if (routePlan.FirstDoorRouteEvidenceReady)
        {
            return "first-door-route-evidence";
        }

        if (navigator.LandmarkRouteYaw != 0)
        {
            return "landmark-route";
        }

        if (navigator.SpawnCorridorGapYaw != 0)
        {
            return "spawn-corridor-gap";
        }

        return routePlan.RouteWallObstacle ? "wall-pressure" : "none";
    }

    private static string Normalize(string value)
        => string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim().ToLowerInvariant();
}

/// <summary>
/// EN: Action hint DTO used by HUD and JS control bridges.
/// JA: HUD と JS control bridge が利用する action hint DTO です。
/// </summary>
public sealed record DoomActionHintDto
{
    /// <summary>
    /// EN: Empty action hint.
    /// JA: 空の action hint です。
    /// </summary>
    public static DoomActionHintDto Empty { get; } = new();

    /// <summary>
    /// EN: Move direction such as forward, back, or none.
    /// JA: forward、back、none などの move direction です。
    /// </summary>
    public string Move { get; init; } = "none";

    /// <summary>
    /// EN: Turn direction such as left, right, or none.
    /// JA: left、right、none などの turn direction です。
    /// </summary>
    public string Turn { get; init; } = "none";

    /// <summary>
    /// EN: Indicates strafe input.
    /// JA: strafe input を示します。
    /// </summary>
    public bool Strafe { get; init; }

    /// <summary>
    /// EN: Indicates use/interact input.
    /// JA: use/interact input を示します。
    /// </summary>
    public bool Use { get; init; }

    /// <summary>
    /// EN: Indicates attack input.
    /// JA: attack input を示します。
    /// </summary>
    public bool Fire { get; init; }

    /// <summary>
    /// EN: Signed yaw hint for steering.
    /// JA: steering 用の符号付き yaw hint です。
    /// </summary>
    public int Yaw { get; init; }

    /// <summary>
    /// EN: Creates an action hint from an action command.
    /// JA: action command から action hint を作成します。
    /// </summary>
    /// <param name="action">EN: Action command. JA: action command です。</param>
    public static DoomActionHintDto From(ActionCommand action)
        => From(action, 0);

    /// <summary>
    /// EN: Creates an action hint from an action command and route-level yaw fallback.
    /// JA: action command と route-level yaw fallback から action hint を作成します。
    /// </summary>
    /// <param name="action">EN: Action command. JA: action command です。</param>
    /// <param name="fallbackYaw">EN: Fallback yaw hint. JA: fallback yaw hint です。</param>
    public static DoomActionHintDto From(ActionCommand action, int fallbackYaw)
    {
        var yaw = action.TurnYaw != 0 ? action.TurnYaw : fallbackYaw;
        return new DoomActionHintDto
        {
            Move = action.MoveBackward ? "back" : (action.MoveForward ? "forward" : "none"),
            Turn = yaw > 0 ? "right" : (yaw < 0 ? "left" : "none"),
            Strafe = action.StrafeLeft || action.StrafeRight,
            Use = action.UseKey,
            Fire = action.AttackKey,
            Yaw = yaw
        };
    }
}

/// <summary>
/// EN: Goal panel DTO for TELOS, OBJECTIVE, PRIORITY, and Kairos chips.
/// JA: TELOS、OBJECTIVE、PRIORITY、Kairos chip 用の goal panel DTO です。
/// </summary>
public sealed record DoomGoalStateDto
{
    /// <summary>
    /// EN: Empty goal panel state.
    /// JA: 空の goal panel state です。
    /// </summary>
    public static DoomGoalStateDto Empty { get; } = new();

    /// <summary>
    /// EN: Indicates whether autoplay goal state is active.
    /// JA: autoplay goal state が active かどうかを示します。
    /// </summary>
    public bool Enabled { get; init; }

    /// <summary>
    /// EN: Current TELOS label.
    /// JA: 現在の TELOS label です。
    /// </summary>
    public string Telos { get; init; } = "Idle";

    /// <summary>
    /// EN: Current primary objective label.
    /// JA: 現在の primary objective label です。
    /// </summary>
    public string Objective { get; init; } = "Idle";

    /// <summary>
    /// EN: Current PRIORITY display label.
    /// JA: 現在の PRIORITY 表示 label です。
    /// </summary>
    public string Priority { get; init; } = "Idle";

    /// <summary>
    /// EN: Current priority axis using Logos, Pathos, or Ethos.
    /// JA: Logos、Pathos、Ethos のいずれかで表す現在の priority axis です。
    /// </summary>
    public string PriorityAxis { get; init; } = "Logos";

    /// <summary>
    /// EN: Kairos timing signal shown as a compact chip.
    /// JA: compact chip として表示する Kairos timing signal です。
    /// </summary>
    public string KairosSignal { get; init; } = string.Empty;

    /// <summary>
    /// EN: Small sub-objective chips rendered under the primary objective.
    /// JA: primary objective の下に表示される小さな sub-objective chip です。
    /// </summary>
    public IReadOnlyList<DoomGoalChipDto> SubObjectives { get; init; } = [];

    /// <summary>
    /// EN: Creates a goal panel state from current objective, priority, and action.
    /// JA: 現在の objective、priority、action から goal panel state を作成します。
    /// </summary>
    /// <param name="objective">EN: Objective id. JA: objective id です。</param>
    /// <param name="controlPipeline">EN: Control pipeline id. JA: control pipeline id です。</param>
    /// <param name="priority">EN: Priority axis packet. JA: priority axis packet です。</param>
    /// <param name="action">EN: Selected action command. JA: 選択済み action command です。</param>
    public static DoomGoalStateDto From(
        string objective,
        string controlPipeline,
        PriorityAxisDto priority,
        ActionCommand action)
    {
        priority ??= PriorityAxisDto.Empty;
        var axis = NormalizeAxis(priority.SelectedAxis);
        var telos = ResolveTelos(objective, controlPipeline);
        var objectiveLabel = Labelize(string.IsNullOrWhiteSpace(objective) ? controlPipeline : objective);
        var priorityLabel = ResolvePriority(axis, action, objectiveLabel);
        var kairos = axis == "Pathos"
            ? $"Kairos: {axis} {priority.Pathos:0.00}"
            : (axis == "Ethos" ? $"Kairos: {axis} {priority.Ethos:0.00}" : $"Kairos: {axis} {priority.Logos:0.00}");

        return new DoomGoalStateDto
        {
            Enabled = true,
            Telos = telos,
            Objective = objectiveLabel,
            Priority = priorityLabel,
            PriorityAxis = axis,
            KairosSignal = kairos,
            SubObjectives =
            [
                new DoomGoalChipDto { Kind = "objective", Label = objectiveLabel },
                new DoomGoalChipDto { Kind = "kairos", Label = kairos }
            ]
        };
    }

    private static string ResolveTelos(string objective, string controlPipeline)
    {
        var text = $"{objective} {controlPipeline}".ToLowerInvariant();
        if (text.Contains("retry", StringComparison.Ordinal) || text.Contains("death", StringComparison.Ordinal))
        {
            return "Recovery";
        }

        if (text.Contains("computer", StringComparison.Ordinal) || text.Contains("central-hall", StringComparison.Ordinal))
        {
            return "ComputerRoom";
        }

        if (text.Contains("first-door", StringComparison.Ordinal)
            || text.Contains("open-door", StringComparison.Ordinal)
            || text.Contains("corridor", StringComparison.Ordinal)
            || text.Contains("openinghome", StringComparison.Ordinal)
            || text.Contains("demo-spawn", StringComparison.Ordinal))
        {
            return "FirstDoor";
        }

        return "Monitor";
    }

    private static string ResolvePriority(string axis, ActionCommand action, string objective)
    {
        var prefix = axis.Length > 0 ? axis[0].ToString().ToUpperInvariant() : "L";
        if (axis == "Pathos")
        {
            return $"[{prefix}] Avoid Threat";
        }

        if (action.UseKey)
        {
            return $"[{prefix}] Use / Open";
        }

        if (action.AttackKey)
        {
            return $"[{prefix}] Fire";
        }

        return axis == "Ethos"
            ? $"[{prefix}] Pursue Goal"
            : $"[{prefix}] {Labelize(objective)}";
    }

    private static string NormalizeAxis(string axis)
        => string.Equals(axis, "pathos", StringComparison.OrdinalIgnoreCase)
            ? "Pathos"
            : (string.Equals(axis, "ethos", StringComparison.OrdinalIgnoreCase) ? "Ethos" : "Logos");

    private static string Labelize(string value)
        => string.IsNullOrWhiteSpace(value)
            ? "Monitor"
            : string.Join(
                " ",
                value.Replace('-', ' ')
                    .Replace('_', ' ')
                    .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                    .Select(static part => string.Concat(part[..1].ToUpperInvariant(), part.Length > 1 ? part[1..] : string.Empty)));
}

/// <summary>
/// EN: Compact chip displayed by the goal panel.
/// JA: goal panel が表示する compact chip です。
/// </summary>
public sealed record DoomGoalChipDto
{
    /// <summary>
    /// EN: Chip category such as objective, safety, or kairos.
    /// JA: objective、safety、kairos などの chip category です。
    /// </summary>
    public string Kind { get; init; } = "objective";

    /// <summary>
    /// EN: Human-readable chip label.
    /// JA: 人間が読める chip label です。
    /// </summary>
    public string Label { get; init; } = "Monitoring";
}

/// <summary>
/// EN: Debug overlay DTO containing rendered grid, frame, and probe primitives.
/// JA: 描画済み grid、frame、probe primitive を保持する debug overlay DTO です。
/// </summary>
public sealed record DoomDebugOverlayDto
{
    /// <summary>
    /// EN: Empty debug overlay state.
    /// JA: 空の debug overlay state です。
    /// </summary>
    public static DoomDebugOverlayDto Empty { get; } = new();

    /// <summary>
    /// EN: Aggregated 9x9 or 3x3 grid cells.
    /// JA: 集約済み 9x9 または 3x3 grid cell です。
    /// </summary>
    public IReadOnlyList<DoomOverlayGridCellDto> Grid { get; init; } = [];

    /// <summary>
    /// EN: Optional 9x9 visual heat grid projected for the HUD vision overlay.
    /// JA: HUD の vision overlay に射影する任意の 9x9 visual heat grid です。
    /// </summary>
    public IReadOnlyList<DoomOverlayGridCellDto> Vision9x9 { get; init; } = [];

    /// <summary>
    /// EN: Door-like candidate boxes projected from the canonical perception state.
    /// JA: canonical perception state から射影した door-like candidate box です。
    /// </summary>
    public IReadOnlyList<DoomOverlayCandidateDto> DoorCandidates { get; init; } = [];

    /// <summary>
    /// EN: Corner or wall-corner candidate boxes projected from the canonical perception state.
    /// JA: canonical perception state から射影した corner / wall-corner candidate box です。
    /// </summary>
    public IReadOnlyList<DoomOverlayCandidateDto> CornerCandidates { get; init; } = [];

    /// <summary>
    /// EN: Overlay frame primitives with percentage coordinates.
    /// JA: percentage coordinate を持つ overlay frame primitive です。
    /// </summary>
    public IReadOnlyList<DoomOverlayRegionDto> Regions { get; init; } = [];

    /// <summary>
    /// EN: Structured enemy direction marker projected from visual and auditory combat evidence.
    /// JA: 視覚および聴覚の combat evidence から射影した構造化済み enemy direction marker です。
    /// </summary>
    public DoomEnemyCircleDto EnemyCircle { get; init; } = DoomEnemyCircleDto.Empty;

    /// <summary>
    /// EN: Use-probe arrow hint.
    /// JA: UseProbe arrow hint です。
    /// </summary>
    public DoomUseProbeHintDto UseProbe { get; init; } = DoomUseProbeHintDto.Empty;

    /// <summary>
    /// EN: Indicates whether Kairos should blink on the overlay.
    /// JA: overlay 上で Kairos を点滅表示すべきかを示します。
    /// </summary>
    public bool KairosBlink { get; init; }

    /// <summary>
    /// EN: Kairos label displayed by the blink frame.
    /// JA: blink frame が表示する Kairos label です。
    /// </summary>
    public string KairosLabel { get; init; } = string.Empty;

    /// <summary>
    /// EN: GPU-first HUD projection containing panel scalar values and diagnostic rectangles.
    /// JA: panel scalar value と diagnostic rectangle を保持する GPU 優先 HUD projection です。
    /// </summary>
    public DoomGpuHudOverlayDto GpuHud { get; init; } = DoomGpuHudOverlayDto.Empty;

    /// <summary>
    /// EN: GPU Aisthesis pipeline contract for zero-copy raw framebuffer analysis.
    /// JA: zero-copy raw framebuffer 解析用の GPU Aisthesis pipeline contract です。
    /// </summary>
    public DoomGpuAisthesisDto GpuAisthesis { get; init; } = DoomGpuAisthesisDto.Empty;

    /// <summary>
    /// EN: GPU spatial reasoning contract that reduces Aisthesis matrices into route, threat, Zoe, and CTG summaries.
    /// JA: Aisthesis matrix を route、threat、Zoe、CTG の summary へ集約する GPU spatial reasoning contract です。
    /// </summary>
    public DoomGpuSpatialReasoningDto GpuSpatialReasoning { get; init; } = DoomGpuSpatialReasoningDto.Empty;

    /// <summary>
    /// EN: Canonical GPU path diagnostics for Game, Bonsai, HUD, and Sensor lanes.
    /// JA: Game、Bonsai、HUD、Sensor lane の canonical GPU path diagnostics です。
    /// </summary>
    public DoomGpuPathStatusDto GpuPathStatus { get; init; } = DoomGpuPathStatusDto.Empty;

    /// <summary>
    /// EN: Creates debug overlay primitives from DTO carriers.
    /// JA: DTO carrier から debug overlay primitive を作成します。
    /// </summary>
    /// <param name="goal">EN: Goal panel state. JA: goal panel state です。</param>
    /// <param name="pipelineState">EN: Four-layer pipeline state. JA: 4-layer pipeline state です。</param>
    /// <param name="routePlan">EN: Route planner result. JA: route planner result です。</param>
    /// <param name="navigator">EN: Landmark navigator result. JA: landmark navigator result です。</param>
    /// <param name="action">EN: Selected action command. JA: 選択済み action command です。</param>
    public static DoomDebugOverlayDto From(
        DoomGoalStateDto goal,
        PipelineStateDto pipelineState,
        DoomRoutePlannerResult routePlan,
        DoomLandmarkNavigatorResult navigator,
        ActionCommand action)
    {
        goal ??= DoomGoalStateDto.Empty;
        pipelineState ??= PipelineStateDto.Empty;
        routePlan ??= DoomRoutePlannerResult.Empty;
        navigator ??= DoomLandmarkNavigatorResult.Empty;

        var grid = CreateGrid(pipelineState);
        var vision9x9 = CreateVision9x9(pipelineState, routePlan);
        var doorCandidates = CreateDoorCandidates(pipelineState, routePlan);
        var cornerCandidates = CreateCornerCandidates(routePlan);
        var regions = new List<DoomOverlayRegionDto>
        {
            new()
            {
                Kind = "objective",
                Label = "PRIORITY:",
                Value = goal.Priority,
                Left = 33,
                Top = 49,
                Width = 34,
                Height = 16,
                Priority = goal.PriorityAxis.Equals("Pathos", StringComparison.Ordinal) ? "high" : "mid",
                Active = goal.Enabled
            }
        };

        if (routePlan.FirstDoorRouteEvidenceReady)
        {
            regions.Add(new DoomOverlayRegionDto
            {
                Kind = "door",
                Label = "route",
                Value = $"{routePlan.CurrentRoute} {routePlan.FirstDoorRouteEvidence:0.00}/{routePlan.RouteConfidence:0.00}",
                Left = 30,
                Top = 18,
                Width = 40,
                Height = 42,
                Priority = "high",
                Active = true
            });
        }

        if (routePlan.RouteWallObstacle)
        {
            regions.Add(new DoomOverlayRegionDto
            {
                Kind = "wall",
                Label = "wall avoid",
                Value = routePlan.RouteFootClearRequired ? "clear foot" : "wall contact",
                Left = navigator.WallAwayYaw < 0 ? 58 : 4,
                Top = 22,
                Width = 38,
                Height = 42,
                Priority = "high",
                Active = true
            });
        }

        var bridgeActive = routePlan.CurrentRoute.Contains("bridge", StringComparison.OrdinalIgnoreCase)
            || goal.Objective.Contains("bridge", StringComparison.OrdinalIgnoreCase)
            || goal.Objective.Contains("central", StringComparison.OrdinalIgnoreCase);
        if (bridgeActive)
        {
            regions.Add(new DoomOverlayRegionDto
            {
                Kind = "bridge",
                Label = "bridge",
                Value = $"{routePlan.RouteMode} {routePlan.RouteConfidence:0.00}",
                Left = 30,
                Top = 68,
                Width = 40,
                Height = 10,
                Priority = "mid",
                Active = true
            });
        }

        var combatScore = Math.Clamp(Math.Max(
            Read(pipelineState.Noesis.PhainesisEvents, "enemyPresence"),
            Math.Max(
                Read(pipelineState.Noesis.PhainesisEvents, "threatField"),
                Math.Max(Read(pipelineState.Aisthesis.SensorReadings, "audioEnemyConfidence"), action.AttackKey ? 1f : 0f))), 0, 1);
        var enemyCircle = DoomEnemyCircleDto.Empty;
        if ((combatScore >= 0.24f || action.AttackKey) && CombatOverlayEligible(goal, routePlan, action))
        {
            enemyCircle = DoomEnemyCircleDto.From(pipelineState, action, combatScore);
            regions.Add(new DoomOverlayRegionDto
            {
                Kind = "combat",
                Label = "COMBAT",
                Value = enemyCircle.Active
                    ? $"vis={enemyCircle.VisualConfidence:0.00} aud={enemyCircle.AudioConfidence:0.00} {enemyCircle.Direction} yaw={enemyCircle.Yaw:0} {(action.AttackKey ? "FIRE" : "HOLD")}"
                    : $"enemy={combatScore:0.00} {(action.AttackKey ? "FIRE" : "HOLD")}",
                Left = 28,
                Top = 5,
                Width = 44,
                Height = 12,
                Priority = "high",
                Active = true
            });
        }

        var zoe = pipelineState.Kinesis.Zoe;
        if (zoe.Vetoed || zoe.Warning || zoe.LowHealth || zoe.LethalRisk >= 0.50f)
        {
            regions.Add(new DoomOverlayRegionDto
            {
                Kind = "zoe",
                Label = zoe.Vetoed ? "ZOE VETO" : "ZOE WARN",
                Value = $"hp={zoe.Health:0} risk={zoe.LethalRisk:0.00} {zoe.LastReason}",
                Left = 4,
                Top = 5,
                Width = 28,
                Height = 8,
                Priority = zoe.Vetoed ? "high" : "mid",
                Active = true
            });
        }

        var gpuAisthesis = DoomGpuAisthesisDto.From(pipelineState, routePlan, action);
        var gpuHud = DoomGpuHudOverlayDto.From(pipelineState, routePlan, action, vision9x9, doorCandidates, cornerCandidates, regions, enemyCircle);
        var gpuSpatial = DoomGpuSpatialReasoningDto.From(gpuAisthesis);

        return new DoomDebugOverlayDto
        {
            Grid = grid,
            Vision9x9 = vision9x9,
            DoorCandidates = doorCandidates,
            CornerCandidates = cornerCandidates,
            Regions = regions,
            EnemyCircle = enemyCircle,
            UseProbe = DoomUseProbeHintDto.From(action, navigator, routePlan),
            KairosBlink = !string.IsNullOrWhiteSpace(goal.KairosSignal),
            KairosLabel = goal.KairosSignal,
            GpuHud = gpuHud,
            GpuAisthesis = gpuAisthesis,
            GpuSpatialReasoning = gpuSpatial,
            GpuPathStatus = DoomGpuPathStatusDto.From(gpuHud, gpuAisthesis, gpuSpatial)
        };
    }

    private static IReadOnlyList<DoomOverlayGridCellDto> CreateGrid(PipelineStateDto pipelineState)
    {
        var visual = Read(pipelineState.Aisthesis.SensorReadings, "visual");
        var movement = Read(pipelineState.Aisthesis.SensorReadings, "movement");
        var collision = Read(pipelineState.Aisthesis.SensorReadings, "collision");
        var route = Read(pipelineState.Aisthesis.SensorReadings, "spatial");
        var output = new List<DoomOverlayGridCellDto>(9);
        for (var index = 0; index < 9; index++)
        {
            var row = index / 3;
            var column = index % 3;
            var score = Math.Clamp(index == 4 ? Math.Max(visual, route) : (column == 1 ? visual : Math.Max(movement, collision)), 0, 1);
            output.Add(new DoomOverlayGridCellDto
            {
                Row = row,
                Column = column,
                Score = score,
                Kind = index == 4 ? "vision" : (collision > 0.4f ? "motion" : "scan"),
                Active = score > 0.08f
            });
        }

        return output;
    }

    private static IReadOnlyList<DoomOverlayGridCellDto> CreateVision9x9(PipelineStateDto pipelineState, DoomRoutePlannerResult routePlan)
    {
        var cells = new List<DoomOverlayGridCellDto>(DoomGpuContracts.HudCellCount);
        var explicitCells = 0;
        for (var index = 0; index < DoomGpuContracts.HudCellCount; index++)
        {
            var row = index / DoomGpuContracts.HudGridSize;
            var column = index % DoomGpuContracts.HudGridSize;
            var score = ReadAny(pipelineState.Aisthesis.SensorReadings, $"vision9x9.{index}", $"vision9x9[{index}]", $"vision9x9_{index}");
            if (score > 0)
            {
                explicitCells++;
            }

            cells.Add(new DoomOverlayGridCellDto
            {
                Row = row,
                Column = column,
                Score = score,
                Kind = "vision",
                Active = score > 0.16f
            });
        }

        if (explicitCells > 0)
        {
            return cells;
        }

        var routeScore = Math.Clamp(Math.Max(routePlan.FirstDoorRouteEvidence, routePlan.UseProbeConfidence), 0, 1);
        if (routeScore <= 0.08f)
        {
            return [];
        }

        return cells.Select((cell, index) =>
        {
            var row = index / DoomGpuContracts.HudGridSize;
            var column = index % DoomGpuContracts.HudGridSize;
            var center = DoomGpuContracts.HudGridSize / 2;
            var centerDistance = Math.Abs(column - center) + Math.Abs(row - center);
            var score = centerDistance <= 1
                ? routeScore
                : (centerDistance == 2 ? routeScore * 0.42f : 0);
            return cell with
            {
                Score = Math.Clamp(score, 0, 1),
                Kind = "route",
                Active = score > 0.12f
            };
        }).ToArray();
    }

    private static IReadOnlyList<DoomOverlayCandidateDto> CreateDoorCandidates(PipelineStateDto pipelineState, DoomRoutePlannerResult routePlan)
    {
        var score = Math.Clamp(Math.Max(
            routePlan.UseProbeConfidence,
            Math.Max(routePlan.FirstDoorRouteEvidence, Read(pipelineState.Aisthesis.SensorReadings, "visual"))), 0, 1);
        var redScore = Math.Clamp(ReadAny(
            pipelineState.Aisthesis.SensorReadings,
            "firstDoorVision9x9RedScore",
            "doorRed",
            "semanticDoorRed"), 0, 1);
        if (score < 0.18f && redScore < 0.05f)
        {
            return [];
        }

        return
        [
            new DoomOverlayCandidateDto
            {
                Left = 39,
                Top = 24,
                Width = 22,
                Height = 31,
                Label = "door",
                Score = score,
                RedScore = redScore,
                EdgeScore = Math.Clamp(routePlan.FirstDoorRouteEvidence, 0, 1)
            }
        ];
    }

    private static IReadOnlyList<DoomOverlayCandidateDto> CreateCornerCandidates(DoomRoutePlannerResult routePlan)
    {
        if (!routePlan.RouteWallObstacle && !routePlan.RouteFootObstacle)
        {
            return [];
        }

        return
        [
            new DoomOverlayCandidateDto
            {
                Left = routePlan.RecommendedYaw < 0 ? 57 : 10,
                Top = 22,
                Width = 24,
                Height = 38,
                Label = "corner",
                Score = routePlan.RouteWallObstacle ? 0.72f : 0.48f,
                EdgeScore = routePlan.RouteFootObstacle ? 0.62f : 0.44f
            }
        ];
    }

    private static float ReadAny(IReadOnlyDictionary<string, float> values, params string[] keys)
    {
        foreach (var key in keys)
        {
            var value = Read(values, key);
            if (value > 0)
            {
                return value;
            }
        }

        return 0;
    }

    private static bool CombatOverlayEligible(DoomGoalStateDto goal, DoomRoutePlannerResult routePlan, ActionCommand action)
    {
        if (action.AttackKey)
        {
            return true;
        }

        var routeMode = routePlan.RouteMode ?? string.Empty;
        var currentRoute = routePlan.CurrentRoute ?? string.Empty;
        var objective = goal.Objective ?? string.Empty;
        var telos = goal.Telos ?? string.Empty;
        return routeMode.Contains("post-door", StringComparison.OrdinalIgnoreCase)
            || currentRoute.Contains("post-door", StringComparison.OrdinalIgnoreCase)
            || currentRoute.Contains("computer", StringComparison.OrdinalIgnoreCase)
            || currentRoute.Contains("bridge", StringComparison.OrdinalIgnoreCase)
            || currentRoute.Contains("central", StringComparison.OrdinalIgnoreCase)
            || objective.Contains("computer", StringComparison.OrdinalIgnoreCase)
            || objective.Contains("enemy", StringComparison.OrdinalIgnoreCase) && !routeMode.Contains("door-approach", StringComparison.OrdinalIgnoreCase)
            || telos.Contains("ComputerRoom", StringComparison.OrdinalIgnoreCase);
    }

    private static float Read(IReadOnlyDictionary<string, float> values, string key)
    {
        if (values.TryGetValue(key, out var value))
        {
            return Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
        }

        foreach (var item in values)
        {
            if (string.Equals(item.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                return Math.Clamp(float.IsFinite(item.Value) ? item.Value : 0, 0, 1);
            }
        }

        return 0;
    }
}

/// <summary>
/// EN: Debug overlay grid cell DTO.
/// JA: debug overlay grid cell DTO です。
/// </summary>
public sealed record DoomOverlayGridCellDto
{
    /// <summary>
    /// EN: Cell row index.
    /// JA: cell の row index です。
    /// </summary>
    public int Row { get; init; }

    /// <summary>
    /// EN: Cell column index.
    /// JA: cell の column index です。
    /// </summary>
    public int Column { get; init; }

    /// <summary>
    /// EN: Normalized cell score.
    /// JA: 正規化済み cell score です。
    /// </summary>
    public float Score { get; init; }

    /// <summary>
    /// EN: Semantic rendering kind for the cell.
    /// JA: cell の semantic rendering kind です。
    /// </summary>
    public string Kind { get; init; } = "scan";

    /// <summary>
    /// EN: Indicates whether the cell should be emphasized.
    /// JA: cell を強調表示すべきかを示します。
    /// </summary>
    public bool Active { get; init; }
}

/// <summary>
/// EN: Debug overlay candidate box DTO for projected visual detections.
/// JA: 射影済み visual detection 用の debug overlay candidate box DTO です。
/// </summary>
public sealed record DoomOverlayCandidateDto
{
    /// <summary>
    /// EN: Left position in percentage.
    /// JA: percentage の left position です。
    /// </summary>
    public float Left { get; init; }

    /// <summary>
    /// EN: Top position in percentage.
    /// JA: percentage の top position です。
    /// </summary>
    public float Top { get; init; }

    /// <summary>
    /// EN: Width in percentage.
    /// JA: percentage の width です。
    /// </summary>
    public float Width { get; init; }

    /// <summary>
    /// EN: Height in percentage.
    /// JA: percentage の height です。
    /// </summary>
    public float Height { get; init; }

    /// <summary>
    /// EN: Candidate label displayed by the HUD.
    /// JA: HUD が表示する candidate label です。
    /// </summary>
    public string Label { get; init; } = string.Empty;

    /// <summary>
    /// EN: Normalized candidate score.
    /// JA: 正規化済み candidate score です。
    /// </summary>
    public float Score { get; init; }

    /// <summary>
    /// EN: Normalized red-panel score, when available.
    /// JA: 利用可能な場合の正規化済み red-panel score です。
    /// </summary>
    public float RedScore { get; init; }

    /// <summary>
    /// EN: Normalized edge score, when available.
    /// JA: 利用可能な場合の正規化済み edge score です。
    /// </summary>
    public float EdgeScore { get; init; }
}

/// <summary>
/// EN: Debug overlay region DTO.
/// JA: debug overlay region DTO です。
/// </summary>
public sealed record DoomOverlayRegionDto
{
    /// <summary>
    /// EN: Region rendering kind.
    /// JA: region の rendering kind です。
    /// </summary>
    public string Kind { get; init; } = "objective";

    /// <summary>
    /// EN: Region label.
    /// JA: region label です。
    /// </summary>
    public string Label { get; init; } = string.Empty;

    /// <summary>
    /// EN: Region value text.
    /// JA: region value text です。
    /// </summary>
    public string Value { get; init; } = string.Empty;

    /// <summary>
    /// EN: Left position in percentage.
    /// JA: percentage の left position です。
    /// </summary>
    public float Left { get; init; }

    /// <summary>
    /// EN: Top position in percentage.
    /// JA: percentage の top position です。
    /// </summary>
    public float Top { get; init; }

    /// <summary>
    /// EN: Width in percentage.
    /// JA: percentage の width です。
    /// </summary>
    public float Width { get; init; }

    /// <summary>
    /// EN: Height in percentage.
    /// JA: percentage の height です。
    /// </summary>
    public float Height { get; init; }

    /// <summary>
    /// EN: Rendering priority label such as low, mid, or high.
    /// JA: low、mid、high などの rendering priority label です。
    /// </summary>
    public string Priority { get; init; } = "mid";

    /// <summary>
    /// EN: Indicates whether the region should be shown as active.
    /// JA: region を active として表示すべきかを示します。
    /// </summary>
    public bool Active { get; init; }
}

/// <summary>
/// EN: Versioned flat-buffer layout descriptor used by Doom-local GPU DTOs until AIKernel 0.1.3 provides the canonical contract.
/// JA: AIKernel 0.1.3 で canonical contract が提供されるまで Doom-local GPU DTO が利用する versioned flat-buffer layout descriptor です。
/// </summary>
public sealed record DoomGpuFlatBufferLayoutDto
{
    /// <summary>
    /// EN: Empty layout descriptor.
    /// JA: 空の layout descriptor です。
    /// </summary>
    public static DoomGpuFlatBufferLayoutDto Empty { get; } = new();

    /// <summary>
    /// EN: Stable layout name such as rect8, panel16, matrix, or state16.
    /// JA: rect8、panel16、matrix、state16 などの安定した layout 名です。
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// EN: Layout version for forward-compatible shader/provider dispatch.
    /// JA: 将来互換の shader/provider dispatch に利用する layout version です。
    /// </summary>
    public int Version { get; init; } = 1;

    /// <summary>
    /// EN: Number of floats consumed by one item.
    /// JA: 1 item が消費する float 数です。
    /// </summary>
    public int Stride { get; init; }

    /// <summary>
    /// EN: Maximum logical items accepted by this layout.
    /// JA: この layout が受け入れる logical item の最大数です。
    /// </summary>
    public int MaxItems { get; init; }

    /// <summary>
    /// EN: Maximum float count accepted by this layout.
    /// JA: この layout が受け入れる float 数の最大値です。
    /// </summary>
    public int MaxFloats { get; init; }

    /// <summary>
    /// EN: Ordered field names for the flat buffer.
    /// JA: flat buffer の field 名を順序付きで示します。
    /// </summary>
    public IReadOnlyList<string> Fields { get; init; } = Array.Empty<string>();

    /// <summary>
    /// EN: Compact diagnostic summary for HUD and provider status panels.
    /// JA: HUD と provider status panel 向けの compact diagnostic summary です。
    /// </summary>
    public string Summary { get; init; } = string.Empty;

    /// <summary>
    /// EN: Layout used by GPU HUD priority rectangles.
    /// JA: GPU HUD priority rectangle が利用する layout です。
    /// </summary>
    public static DoomGpuFlatBufferLayoutDto Rectangles(int maxItems = DoomGpuContracts.HudRectCount)
        => new()
        {
            Name = DoomGpuContracts.HudRectLayoutName,
            Version = 1,
            Stride = DoomGpuContracts.HudRectStride,
            MaxItems = Math.Max(0, maxItems),
            MaxFloats = Math.Max(0, maxItems) * DoomGpuContracts.HudRectStride,
            Fields = DoomGpuContracts.HudRectFields,
            Summary = $"{DoomGpuContracts.HudRectLayoutName} v1 stride{DoomGpuContracts.HudRectStride} max{Math.Max(0, maxItems)}"
        };

    /// <summary>
    /// EN: Layout used by GPU HUD scalar panels.
    /// JA: GPU HUD scalar panel が利用する layout です。
    /// </summary>
    public static DoomGpuFlatBufferLayoutDto Panels()
        => new()
        {
            Name = DoomGpuContracts.HudPanelLayoutName,
            Version = 1,
            Stride = DoomGpuContracts.HudPanelValueCount,
            MaxItems = 1,
            MaxFloats = DoomGpuContracts.HudPanelValueCount,
            Fields = DoomGpuContracts.HudPanelFields,
            Summary = $"{DoomGpuContracts.HudPanelLayoutName} v1 stride{DoomGpuContracts.HudPanelValueCount} max1"
        };

    /// <summary>
    /// EN: Layout used by flattened GPU spatial matrices with per-matrix headers.
    /// JA: matrix ごとの header を持つ flattened GPU spatial matrix が利用する layout です。
    /// </summary>
    public static DoomGpuFlatBufferLayoutDto Matrices(int maxFloats = DoomGpuContracts.AisthesisMatrixFloatCount)
        => new()
        {
            Name = "matrix",
            Version = 1,
            Stride = 0,
            MaxItems = 0,
            MaxFloats = Math.Max(0, maxFloats),
            Fields = ["kind", "rows", "columns", "count", "values"],
            Summary = $"matrix v1 max{Math.Max(0, maxFloats)}"
        };

    /// <summary>
    /// EN: Layout used by the compact spatial reasoning state vector.
    /// JA: compact spatial reasoning state vector が利用する layout です。
    /// </summary>
    public static DoomGpuFlatBufferLayoutDto StateVector()
        => new()
        {
            Name = DoomGpuContracts.StateVectorLayoutName,
            Version = 1,
            Stride = DoomGpuContracts.StateVectorFloatCount,
            MaxItems = 1,
            MaxFloats = DoomGpuContracts.StateVectorFloatCount,
            Fields = DoomGpuContracts.StateVectorFields,
            Summary = $"{DoomGpuContracts.StateVectorLayoutName} v1 stride{DoomGpuContracts.StateVectorFloatCount} max1"
        };

    /// <summary>
    /// EN: Layout used by the GPU spatial reasoning output vector.
    /// JA: GPU spatial reasoning output vector が利用する layout です。
    /// </summary>
    public static DoomGpuFlatBufferLayoutDto SpatialReasoningVector()
        => new()
        {
            Name = DoomGpuContracts.SpatialReasoningVectorLayoutName,
            Version = 1,
            Stride = DoomGpuContracts.SpatialReasoningOutputFloatCount,
            MaxItems = 1,
            MaxFloats = DoomGpuContracts.SpatialReasoningOutputFloatCount,
            Fields = DoomGpuContracts.SpatialReasoningVectorFields,
            Summary = $"{DoomGpuContracts.SpatialReasoningVectorLayoutName} v1 stride{DoomGpuContracts.SpatialReasoningOutputFloatCount} max1"
        };
}

/// <summary>
/// EN: Doom-local frame target descriptor aligned with the future canonical GpuFrameTargetKind.
/// JA: 将来の canonical GpuFrameTargetKind に合わせた Doom-local frame target descriptor です。
/// </summary>
public sealed record DoomGpuFrameTargetDto
{
    /// <summary>
    /// EN: Empty frame target descriptor.
    /// JA: 空の frame target descriptor です。
    /// </summary>
    public static DoomGpuFrameTargetDto Empty { get; } = new();

    /// <summary>
    /// EN: Canon-like target kind, for example RawFramebuffer or HudCompositeOffscreen.
    /// JA: RawFramebuffer や HudCompositeOffscreen などの canon 風 target kind です。
    /// </summary>
    public string Kind { get; init; } = string.Empty;

    /// <summary>
    /// EN: Provider-local target name.
    /// JA: Provider-local target name です。
    /// </summary>
    public string Target { get; init; } = string.Empty;

    /// <summary>
    /// EN: Stable wire name used by JS / Wasm bridges.
    /// JA: JS / Wasm bridge が利用する安定した wire name です。
    /// </summary>
    public string WireName { get; init; } = string.Empty;

    /// <summary>
    /// EN: Intended usage, such as analysis, display, or debug.
    /// JA: analysis、display、debug などの intended usage です。
    /// </summary>
    public string Usage { get; init; } = string.Empty;

    /// <summary>
    /// EN: Indicates whether HUD overlay pixels are excluded from this target.
    /// JA: この target から HUD overlay pixel が除外されるかを示します。
    /// </summary>
    public bool HudExcluded { get; init; }

    /// <summary>
    /// EN: Raw framebuffer target for analysis.
    /// JA: analysis 用の raw framebuffer target です。
    /// </summary>
    public static DoomGpuFrameTargetDto RawFramebuffer(string target = DoomGpuContracts.RawFramebufferTarget, string usage = "analysis")
        => new()
        {
            Kind = "RawFramebuffer",
            Target = target,
            WireName = DoomGpuContracts.RawFramebufferWireName,
            Usage = usage,
            HudExcluded = true
        };

    /// <summary>
    /// EN: HUD-composited offscreen target for visible display.
    /// JA: visible display 用の HUD-composited offscreen target です。
    /// </summary>
    public static DoomGpuFrameTargetDto HudCompositeOffscreen(string target = DoomGpuContracts.HudCompositeTarget, string usage = "display")
        => new()
        {
            Kind = "HudCompositeOffscreen",
            Target = target,
            WireName = DoomGpuContracts.HudCompositeWireName,
            Usage = usage,
            HudExcluded = false
        };

    /// <summary>
    /// EN: Display canvas fallback target for debug screenshots.
    /// JA: debug screenshot 用の display canvas fallback target です。
    /// </summary>
    public static DoomGpuFrameTargetDto DisplayCanvasFallback(string target = DoomGpuContracts.DisplayCanvasFallbackTarget, string usage = "debug")
        => new()
        {
            Kind = "DisplayCanvasFallback",
            Target = target,
            WireName = DoomGpuContracts.DisplayCanvasFallbackWireName,
            Usage = usage,
            HudExcluded = false
        };
}

/// <summary>
/// EN: Doom-local GPU texture target descriptor aligned with future canonical GPU texture bindings.
/// JA: 将来の canonical GPU texture binding に合わせた Doom-local GPU texture target descriptor です。
/// </summary>
public sealed record DoomGpuTextureTargetDto
{
    /// <summary>
    /// EN: Empty texture target descriptor.
    /// JA: 空の texture target descriptor です。
    /// </summary>
    public static DoomGpuTextureTargetDto Empty { get; } = new();

    /// <summary>
    /// EN: Canon-like texture kind, for example AisthesisMask.
    /// JA: AisthesisMask などの canon 風 texture kind です。
    /// </summary>
    public string Kind { get; init; } = string.Empty;

    /// <summary>
    /// EN: Provider-local target name.
    /// JA: provider-local target name です。
    /// </summary>
    public string Target { get; init; } = string.Empty;

    /// <summary>
    /// EN: Stable wire name used by JS / Wasm bridges.
    /// JA: JS / Wasm bridge が利用する安定した wire name です。
    /// </summary>
    public string WireName { get; init; } = string.Empty;

    /// <summary>
    /// EN: Texture format requested by the contract.
    /// JA: contract が要求する texture format です。
    /// </summary>
    public string Format { get; init; } = "rgba8unorm";

    /// <summary>
    /// EN: Width in texels for fixed-size feature maps.
    /// JA: 固定サイズ feature map の texel 幅です。
    /// </summary>
    public int Width { get; init; }

    /// <summary>
    /// EN: Height in texels for fixed-size feature maps.
    /// JA: 固定サイズ feature map の texel 高さです。
    /// </summary>
    public int Height { get; init; }

    /// <summary>
    /// EN: Intended usage, such as analysis, mask, or debug.
    /// JA: analysis、mask、debug などの intended usage です。
    /// </summary>
    public string Usage { get; init; } = "analysis";

    /// <summary>
    /// EN: Indicates whether HUD overlay pixels are excluded from this texture source.
    /// JA: この texture source から HUD overlay pixel が除外されるかを示します。
    /// </summary>
    public bool HudExcluded { get; init; } = true;

    /// <summary>
    /// EN: A 9x9 Aisthesis mask texture produced on the GPU.
    /// JA: GPU 側で生成される 9x9 Aisthesis mask texture です。
    /// </summary>
    public static DoomGpuTextureTargetDto AisthesisMask9x9()
        => new()
        {
            Kind = "AisthesisMask",
            Target = DoomGpuContracts.AisthesisMaskTarget,
            WireName = DoomGpuContracts.AisthesisMaskWireName,
            Format = "rgba8unorm",
            Width = DoomGpuContracts.HudGridSize,
            Height = DoomGpuContracts.HudGridSize,
            Usage = DoomGpuContracts.AisthesisMaskUsage,
            HudExcluded = true
        };
}

/// <summary>
/// EN: Doom-local readback policy descriptor aligned with the future canonical GpuReadbackPolicy.
/// JA: 将来の canonical GpuReadbackPolicy に合わせた Doom-local readback policy descriptor です。
/// </summary>
public sealed record DoomGpuReadbackPolicyDto
{
    /// <summary>
    /// EN: Empty readback policy descriptor.
    /// JA: 空の readback policy descriptor です。
    /// </summary>
    public static DoomGpuReadbackPolicyDto Empty { get; } = new();

    /// <summary>
    /// EN: Canon-like policy kind.
    /// JA: canon 風 policy kind です。
    /// </summary>
    public string Kind { get; init; } = "None";

    /// <summary>
    /// EN: Stable wire name used by JS / Wasm bridges.
    /// JA: JS / Wasm bridge が利用する安定した wire name です。
    /// </summary>
    public string WireName { get; init; } = "none";

    /// <summary>
    /// EN: Indicates whether compact summary readback is allowed.
    /// JA: compact summary readback が許可されるかを示します。
    /// </summary>
    public bool AllowsSummary { get; init; }

    /// <summary>
    /// EN: Indicates whether full feature readback is allowed.
    /// JA: full feature readback が許可されるかを示します。
    /// </summary>
    public bool AllowsFullReadback { get; init; }

    /// <summary>
    /// EN: Indicates whether this policy is intended only for explicit debug paths.
    /// JA: この policy が明示的な debug path 専用であるかを示します。
    /// </summary>
    public bool DebugOnly { get; init; }

    /// <summary>
    /// EN: No GPU data may be read back.
    /// JA: GPU data を読み戻しません。
    /// </summary>
    public static DoomGpuReadbackPolicyDto NoReadback { get; } = new()
    {
        Kind = "None",
        WireName = "none"
    };

    /// <summary>
    /// EN: Full readback is allowed only through explicit debug operations.
    /// JA: full readback を明示的な debug operation のみで許可します。
    /// </summary>
    public static DoomGpuReadbackPolicyDto DebugReadback { get; } = new()
    {
        Kind = "DebugOnly",
        WireName = "debug-only",
        AllowsSummary = true,
        AllowsFullReadback = true,
        DebugOnly = true
    };

    /// <summary>
    /// EN: Runtime may read compact summaries but not full buffers.
    /// JA: runtime は compact summary のみ読み戻せます。
    /// </summary>
    public static DoomGpuReadbackPolicyDto SummaryReadback { get; } = new()
    {
        Kind = "RuntimeSummary",
        WireName = "runtime-summary",
        AllowsSummary = true
    };
}

/// <summary>
/// EN: Doom-local frame token placeholder for correlating raw capture, Aisthesis, Spatial Reasoning, and HUD composite passes.
/// JA: raw capture、Aisthesis、Spatial Reasoning、HUD composite pass を対応付ける Doom-local frame token placeholder です。
/// </summary>
public sealed record DoomGpuFrameTokenDto
{
    /// <summary>
    /// EN: Empty frame token.
    /// JA: 空の frame token です。
    /// </summary>
    public static DoomGpuFrameTokenDto Empty { get; } = new();

    /// <summary>
    /// EN: Provider frame id. Zero means the provider has not stamped the frame yet.
    /// JA: provider frame id です。0 は provider がまだ frame stamp を付与していないことを示します。
    /// </summary>
    public long FrameId { get; init; }

    /// <summary>
    /// EN: Raw framebuffer target associated with this token.
    /// JA: この token に紐付く raw framebuffer target です。
    /// </summary>
    public string RawTarget { get; init; } = DoomGpuContracts.RawFramebufferTarget;

    /// <summary>
    /// EN: HUD-composited target associated with this token.
    /// JA: この token に紐付く HUD-composited target です。
    /// </summary>
    public string HudTarget { get; init; } = DoomGpuContracts.HudCompositeTarget;

    /// <summary>
    /// EN: Producer phase for diagnostics.
    /// JA: diagnostics 用の producer phase です。
    /// </summary>
    public string Phase { get; init; } = "dto-pending";

    /// <summary>
    /// EN: Indicates whether this token was stamped by the GPU provider.
    /// JA: この token が GPU provider により stamp されたかを示します。
    /// </summary>
    public bool ProviderStamped { get; init; }

    /// <summary>
    /// EN: Creates a pending DTO-side frame token.
    /// JA: DTO 側の pending frame token を作成します。
    /// </summary>
    public static DoomGpuFrameTokenDto Pending(
        string rawTarget = DoomGpuContracts.RawFramebufferTarget,
        string hudTarget = DoomGpuContracts.HudCompositeTarget,
        string phase = "dto-pending")
        => new()
        {
            RawTarget = rawTarget,
            HudTarget = hudTarget,
            Phase = string.IsNullOrWhiteSpace(phase) ? "dto-pending" : phase
        };
}

/// <summary>
/// EN: GPU-first HUD overlay payload. It is intentionally numeric so JS can forward it to WebGPU without extra inference.
/// JA: GPU 優先 HUD overlay payload です。JS が追加推論せず WebGPU へ転送できるよう数値中心にしています。
/// </summary>
public sealed record DoomGpuHudOverlayDto
{
    /// <summary>
    /// EN: Empty GPU HUD projection.
    /// JA: 空の GPU HUD projection です。
    /// </summary>
    public static DoomGpuHudOverlayDto Empty { get; } = new();

    /// <summary>
    /// EN: Doom-local GPU HUD contract version that maps to the future canonical GpuHudInput version.
    /// JA: 将来の canonical GpuHudInput version に対応する Doom-local GPU HUD contract version です。
    /// </summary>
    public int ContractVersion { get; init; } = 1;

    /// <summary>
    /// EN: Contract name used while Doom-local DTOs remain compatibility adapters.
    /// JA: Doom-local DTO が compatibility adapter である間に利用する contract name です。
    /// </summary>
    public string ContractName { get; init; } = "DoomGpuHudOverlay";

    /// <summary>
    /// EN: HUD feature flags requested by this DTO.
    /// JA: この DTO が要求する HUD feature flag です。
    /// </summary>
    public IReadOnlyList<string> FeatureFlags { get; init; } = Array.Empty<string>();

    /// <summary>
    /// EN: Indicates whether the GPU HUD projection should be used.
    /// JA: GPU HUD projection を利用すべきかどうかを示します。
    /// </summary>
    public bool Enabled { get; init; }

    /// <summary>
    /// EN: CSS overlay mode requested by this projection.
    /// JA: この projection が要求する CSS overlay mode です。
    /// </summary>
    public string CssOverlayMode { get; init; } = "reduced";

    /// <summary>
    /// EN: Raw framebuffer target used for analysis-safe capture.
    /// JA: analysis-safe capture に利用する raw framebuffer target です。
    /// </summary>
    public string RawFramebufferTarget { get; init; } = DoomGpuContracts.RawFramebufferTarget;

    /// <summary>
    /// EN: Structured raw framebuffer target descriptor used by future canonical GPU APIs.
    /// JA: 将来の canonical GPU API が利用する structured raw framebuffer target descriptor です。
    /// </summary>
    public DoomGpuFrameTargetDto RawFrameTarget { get; init; } = DoomGpuFrameTargetDto.RawFramebuffer();

    /// <summary>
    /// EN: HUD-composited target used for visible display.
    /// JA: visible display に利用する HUD-composited target です。
    /// </summary>
    public string HudTarget { get; init; } = DoomGpuContracts.HudCompositeTarget;

    /// <summary>
    /// EN: Structured HUD-composited target descriptor used by future canonical GPU APIs.
    /// JA: 将来の canonical GPU API が利用する structured HUD-composited target descriptor です。
    /// </summary>
    public DoomGpuFrameTargetDto HudFrameTarget { get; init; } = DoomGpuFrameTargetDto.HudCompositeOffscreen();

    /// <summary>
    /// EN: Capture source for sensor analysis; HUD overlays must be excluded.
    /// JA: sensor analysis 用の capture source です。HUD overlay は除外されなければなりません。
    /// </summary>
    public string AnalysisCaptureSource { get; init; } = DoomGpuContracts.RawFramebufferWireName;

    /// <summary>
    /// EN: Structured capture target descriptor for analysis-safe sensor input.
    /// JA: analysis-safe sensor input 用の structured capture target descriptor です。
    /// </summary>
    public DoomGpuFrameTargetDto AnalysisFrameTarget { get; init; } = DoomGpuFrameTargetDto.RawFramebuffer();

    /// <summary>
    /// EN: Display source for user-visible frames.
    /// JA: user-visible frame 用の display source です。
    /// </summary>
    public string DisplaySource { get; init; } = DoomGpuContracts.HudCompositeWireName;

    /// <summary>
    /// EN: Structured display target descriptor for user-visible frames.
    /// JA: user-visible frame 用の structured display target descriptor です。
    /// </summary>
    public DoomGpuFrameTargetDto DisplayFrameTarget { get; init; } = DoomGpuFrameTargetDto.HudCompositeOffscreen();

    /// <summary>
    /// EN: Readback policy for this HUD contract.
    /// JA: この HUD contract の readback policy です。
    /// </summary>
    public string ReadbackPolicy { get; init; } = "none";

    /// <summary>
    /// EN: Structured readback policy for this HUD contract.
    /// JA: この HUD contract の structured readback policy です。
    /// </summary>
    public DoomGpuReadbackPolicyDto Readback { get; init; } = DoomGpuReadbackPolicyDto.NoReadback;

    /// <summary>
    /// EN: Frame token placeholder that the GPU provider can stamp with a concrete frame id.
    /// JA: GPU provider が concrete frame id を stamp できる frame token placeholder です。
    /// </summary>
    public DoomGpuFrameTokenDto FrameToken { get; init; } = DoomGpuFrameTokenDto.Pending();

    /// <summary>
    /// EN: Compact diagnostic summary for HUD panels so JS does not need to infer projection counts.
    /// JA: JS が projection count を推測しなくて済むようにする HUD panel 向け compact diagnostic summary です。
    /// </summary>
    public string Summary { get; init; } = "hud=idle";

    /// <summary>
    /// EN: Panel scalar values consumed by the WebGPU HUD shader.
    /// JA: WebGPU HUD shader が消費する panel scalar value です。
    /// </summary>
    public IReadOnlyList<float> PanelValues { get; init; } = Array.Empty<float>();

    /// <summary>
    /// EN: Canonical 9x9 heat cells consumed by the WebGPU HUD shader.
    /// JA: WebGPU HUD shader が消費する canonical 9x9 heat cell です。
    /// </summary>
    public IReadOnlyList<float> Cells { get; init; } = Array.Empty<float>();

    /// <summary>
    /// EN: Diagnostic rectangles consumed by the WebGPU HUD shader.
    /// JA: WebGPU HUD shader が消費する diagnostic rectangle です。
    /// </summary>
    public IReadOnlyList<DoomGpuHudRectDto> Rectangles { get; init; } = Array.Empty<DoomGpuHudRectDto>();

    /// <summary>
    /// EN: Flattened rectangle buffer using 8 floats per rectangle: left, top, right, bottom, r, g, b, alpha.
    /// JA: 1 rectangle あたり 8 float（left、top、right、bottom、r、g、b、alpha）で表現する flattened rectangle buffer です。
    /// </summary>
    public IReadOnlyList<float> RectangleValues { get; init; } = Array.Empty<float>();

    /// <summary>
    /// EN: Lightweight diagnostic labels that remain in CSS while rectangles are GPU-rendered.
    /// JA: rectangle を GPU 描画へ移した後も CSS 側に残す軽量 diagnostic label です。
    /// </summary>
    public IReadOnlyList<DoomGpuHudLabelDto> Labels { get; init; } = Array.Empty<DoomGpuHudLabelDto>();

    /// <summary>
    /// EN: Number of heat cells supplied by the canonical DTO projection.
    /// JA: canonical DTO projection が提供する heat cell 数です。
    /// </summary>
    public int CellCount { get; init; }

    /// <summary>
    /// EN: Number of diagnostic rectangles supplied by the canonical DTO projection.
    /// JA: canonical DTO projection が提供する diagnostic rectangle 数です。
    /// </summary>
    public int RectangleCount { get; init; }

    /// <summary>
    /// EN: Number of floats in the flattened rectangle buffer.
    /// JA: flattened rectangle buffer に含まれる float 数です。
    /// </summary>
    public int RectangleFloatCount { get; init; }

    /// <summary>
    /// EN: Float stride used by each diagnostic rectangle in RectangleValues.
    /// JA: RectangleValues 内で各 diagnostic rectangle が利用する float stride です。
    /// </summary>
    public int RectangleStride { get; init; } = DoomGpuContracts.HudRectStride;

    /// <summary>
    /// EN: Flat buffer layout for RectangleValues.
    /// JA: RectangleValues の flat buffer layout です。
    /// </summary>
    public string RectangleLayout { get; init; } = $"{DoomGpuContracts.HudRectLayoutName}:left,top,right,bottom,r,g,b,alpha";

    /// <summary>
    /// EN: Structured layout descriptor for RectangleValues.
    /// JA: RectangleValues の structured layout descriptor です。
    /// </summary>
    public DoomGpuFlatBufferLayoutDto RectangleBufferLayout { get; init; } = DoomGpuFlatBufferLayoutDto.Rectangles();

    /// <summary>
    /// EN: Flat buffer layout for PanelValues.
    /// JA: PanelValues の flat buffer layout です。
    /// </summary>
    public string PanelLayout { get; init; } = $"{DoomGpuContracts.HudPanelLayoutName}:aisthesis,noesis,krisis,kinesis,route,loop,door,combat,zoe,logos,pathos,ethos,wall,barrel,alignment,use";

    /// <summary>
    /// EN: Structured layout descriptor for PanelValues.
    /// JA: PanelValues の structured layout descriptor です。
    /// </summary>
    public DoomGpuFlatBufferLayoutDto PanelBufferLayout { get; init; } = DoomGpuFlatBufferLayoutDto.Panels();

    /// <summary>
    /// EN: Number of lightweight labels supplied by the canonical DTO projection.
    /// JA: canonical DTO projection が提供する lightweight label 数です。
    /// </summary>
    public int LabelCount { get; init; }

    /// <summary>
    /// EN: Number of panel scalar values supplied by the canonical DTO projection.
    /// JA: canonical DTO projection が提供する panel scalar value 数です。
    /// </summary>
    public int PanelValueCount { get; init; }

    /// <summary>
    /// EN: Creates a GPU HUD projection from canonical pipeline and overlay primitives.
    /// JA: canonical pipeline と overlay primitive から GPU HUD projection を作成します。
    /// </summary>
    /// <param name="pipelineState">EN: Four-layer pipeline state. JA: 4-layer pipeline state です。</param>
    /// <param name="routePlan">EN: Route planner result. JA: route planner result です。</param>
    /// <param name="action">EN: Selected action command. JA: 選択済み action command です。</param>
    /// <param name="vision9x9">EN: Canonical vision heat grid. JA: canonical vision heat grid です。</param>
    /// <param name="doorCandidates">EN: Door candidate rectangles. JA: door candidate rectangle です。</param>
    /// <param name="cornerCandidates">EN: Corner candidate rectangles. JA: corner candidate rectangle です。</param>
    /// <param name="regions">EN: High-level overlay regions. JA: high-level overlay region です。</param>
    /// <param name="enemyCircle">EN: Enemy circle marker. JA: enemy circle marker です。</param>
    public static DoomGpuHudOverlayDto From(
        PipelineStateDto pipelineState,
        DoomRoutePlannerResult routePlan,
        ActionCommand action,
        IReadOnlyList<DoomOverlayGridCellDto> vision9x9,
        IReadOnlyList<DoomOverlayCandidateDto> doorCandidates,
        IReadOnlyList<DoomOverlayCandidateDto> cornerCandidates,
        IReadOnlyList<DoomOverlayRegionDto> regions,
        DoomEnemyCircleDto enemyCircle)
    {
        pipelineState ??= PipelineStateDto.Empty;
        routePlan ??= DoomRoutePlannerResult.Empty;
        action ??= new ActionCommand(false, false, false, false, 0, false, false);
        vision9x9 ??= [];
        doorCandidates ??= [];
        cornerCandidates ??= [];
        regions ??= [];
        enemyCircle ??= DoomEnemyCircleDto.Empty;

        var rects = new List<DoomGpuHudRectDto>(DoomGpuContracts.HudRectCount);
        var labels = new List<DoomGpuHudLabelDto>(DoomGpuContracts.HudLabelCount);
        foreach (var candidate in doorCandidates)
        {
            AddRect(rects, DoomGpuHudRectDto.FromCandidate("door", candidate, 0.86f));
            AddLabel(labels, DoomGpuHudLabelDto.FromCandidate("door", candidate, labels.Count));
        }

        foreach (var candidate in cornerCandidates)
        {
            AddRect(rects, DoomGpuHudRectDto.FromCandidate("corner", candidate, 0.62f));
            AddLabel(labels, DoomGpuHudLabelDto.FromCandidate("corner", candidate, labels.Count));
        }

        if (enemyCircle.Active)
        {
            AddRect(rects, DoomGpuHudRectDto.FromEnemyCircle(enemyCircle));
            AddLabel(labels, DoomGpuHudLabelDto.FromEnemyCircle(enemyCircle, labels.Count));
        }

        foreach (var region in regions)
        {
            if (IsGpuPriorityRegion(region))
            {
                AddRect(rects, DoomGpuHudRectDto.FromRegion(region));
                AddLabel(labels, DoomGpuHudLabelDto.FromRegion(region, labels.Count));
            }
        }

        var zoe = pipelineState.Kinesis.Zoe;
        var zoeRisk = Clamp01(Math.Max(zoe.Vetoed ? 1 : 0, zoe.LethalRisk));
        if (zoeRisk > 0.25f)
        {
            AddRect(rects, new DoomGpuHudRectDto
            {
                Kind = "zoe",
                Left = 1,
                Top = 1,
                Width = 98,
                Height = 98,
                Score = zoeRisk,
                Alpha = 0.62f,
                Color = DoomGpuHudRectDto.ColorForKind("zoe")
            });
        }

        var panelValues = CreatePanelValues(pipelineState, routePlan, action);
        var cells = CreateCells(vision9x9, pipelineState, routePlan, action);
        var rectangleValues = CreateRectangleValues(rects);

        return new DoomGpuHudOverlayDto
        {
            Enabled = true,
            CssOverlayMode = "reduced",
            RawFrameTarget = DoomGpuFrameTargetDto.RawFramebuffer(),
            HudFrameTarget = DoomGpuFrameTargetDto.HudCompositeOffscreen(),
            AnalysisFrameTarget = DoomGpuFrameTargetDto.RawFramebuffer(),
            DisplayFrameTarget = DoomGpuFrameTargetDto.HudCompositeOffscreen(),
            Readback = DoomGpuReadbackPolicyDto.NoReadback,
            FrameToken = DoomGpuFrameTokenDto.Pending(),
            FeatureFlags = ["hud-composite", "cells9x9", "rect8-flat", "panel16", "css-labels"],
            Summary = CreateSummary(cells.Count, rects.Count, labels.Count, panelValues.Count, rectangleValues.Count, "reduced"),
            PanelValues = panelValues,
            Cells = cells,
            Rectangles = rects,
            RectangleValues = rectangleValues,
            Labels = labels,
            CellCount = cells.Count,
            RectangleCount = rects.Count,
            RectangleFloatCount = rectangleValues.Count,
            RectangleStride = DoomGpuContracts.HudRectStride,
            RectangleBufferLayout = DoomGpuFlatBufferLayoutDto.Rectangles(),
            PanelBufferLayout = DoomGpuFlatBufferLayoutDto.Panels(),
            LabelCount = labels.Count,
            PanelValueCount = panelValues.Count
        };
    }

    private static string CreateSummary(int cellCount, int rectangleCount, int labelCount, int panelValueCount, int rectangleFloatCount, string mode)
        => $"hud=dto cells{cellCount} rect{rectangleCount} rflat{rectangleFloatCount} txt{labelCount} panel{panelValueCount} {mode}";

    private static IReadOnlyList<float> CreateRectangleValues(IReadOnlyList<DoomGpuHudRectDto> rects)
    {
        if (rects.Count <= 0)
        {
            return [];
        }

        var values = new List<float>(rects.Count * DoomGpuContracts.HudRectStride);
        foreach (var rect in rects.Take(DoomGpuContracts.HudRectCount))
        {
            if (rect.Width <= 0 || rect.Height <= 0)
            {
                continue;
            }

            var left = Clamp01(rect.Left / 100f);
            var top = Clamp01(rect.Top / 100f);
            var right = Clamp01((rect.Left + rect.Width) / 100f);
            var bottom = Clamp01((rect.Top + rect.Height) / 100f);
            if (right <= left || bottom <= top)
            {
                continue;
            }

            var color = rect.Color.Count >= 3 ? rect.Color : DoomGpuHudRectDto.ColorForKind(rect.Kind);
            values.Add(left);
            values.Add(top);
            values.Add(right);
            values.Add(bottom);
            values.Add(Clamp01(color[0]));
            values.Add(Clamp01(color[1]));
            values.Add(Clamp01(color[2]));
            values.Add(Clamp01(rect.Alpha));
        }

        return values;
    }

    private static IReadOnlyList<float> CreateCells(
        IReadOnlyList<DoomOverlayGridCellDto> vision9x9,
        PipelineStateDto pipelineState,
        DoomRoutePlannerResult routePlan,
        ActionCommand action)
    {
        var output = new float[DoomGpuContracts.HudCellCount];
        if (vision9x9.Count > 0)
        {
            foreach (var cell in vision9x9)
            {
                var maxIndex = DoomGpuContracts.HudGridSize - 1;
                var row = Math.Clamp(cell.Row, 0, maxIndex);
                var column = Math.Clamp(cell.Column, 0, maxIndex);
                var index = row * DoomGpuContracts.HudGridSize + column;
                output[index] = Math.Max(output[index], Clamp01(cell.Score));
            }
        }

        var route = Clamp01(Math.Max(routePlan.FirstDoorRouteEvidence, routePlan.UseProbeConfidence));
        var combat = Clamp01(Math.Max(
            Read(pipelineState.Noesis.PhainesisEvents, "enemyPresence"),
            Math.Max(Read(pipelineState.Noesis.PhainesisEvents, "threatField"), action.AttackKey ? 1 : 0)));
        var zoe = Clamp01(Math.Max(pipelineState.Kinesis.Zoe.Vetoed ? 1 : 0, pipelineState.Kinesis.Zoe.LethalRisk));
        var topology = pipelineState.Noesis.Topology;
        var barrel = Clamp01(topology.BarrelZoneEvidence);
        var wallPressure = Clamp01(1 - topology.WallDistanceNormalized);

        if (route > 0.08f)
        {
            for (var row = 3; row <= 5; row++)
            {
                for (var column = 3; column <= 5; column++)
                {
                    var index = row * DoomGpuContracts.HudGridSize + column;
                    var distance = Math.Abs(row - 4) + Math.Abs(column - 4);
                    output[index] = Math.Max(output[index], route * (distance == 0 ? 1f : 0.58f));
                }
            }
        }

        if (combat > 0.08f)
        {
            for (var row = 2; row <= 6; row++)
            {
                var index = row * DoomGpuContracts.HudGridSize + 4;
                output[index] = Math.Max(output[index], combat * 0.86f);
            }
        }

        if (barrel > 0.10f || wallPressure > 0.10f)
        {
            var sideColumn = topology.CenterlineDirectionX < 0 ? 7 : 1;
            var pressure = Math.Max(barrel, wallPressure * 0.72f);
            for (var row = 2; row <= 7; row++)
            {
                output[row * DoomGpuContracts.HudGridSize + sideColumn] = Math.Max(output[row * DoomGpuContracts.HudGridSize + sideColumn], pressure);
            }
        }

        if (zoe > 0.08f)
        {
            for (var column = 0; column < DoomGpuContracts.HudGridSize; column++)
            {
                var row = DoomGpuContracts.HudGridSize - 1;
                output[row * DoomGpuContracts.HudGridSize + column] = Math.Max(output[row * DoomGpuContracts.HudGridSize + column], zoe);
            }
        }

        return output;
    }

    private static IReadOnlyList<float> CreatePanelValues(PipelineStateDto pipelineState, DoomRoutePlannerResult routePlan, ActionCommand action)
    {
        var noesis = pipelineState.Noesis;
        var topology = noesis.Topology;
        var kairos = pipelineState.Krisis.Kairos;
        var kinesis = pipelineState.Kinesis;
        var zoe = kinesis.Zoe;
        var routeConfidence = Clamp01(routePlan.RouteConfidence);
        var loopBudget = Clamp01(routePlan.RouteLoopBudgetExceeded ? 1 : 0);
        var actionActive = action.MoveForward || action.MoveBackward || action.TurnYaw != 0 || action.StrafeLeft || action.StrafeRight || action.UseKey || action.AttackKey;
        var combat = Clamp01(Math.Max(
            Read(noesis.PhainesisEvents, "enemyPresence"),
            Math.Max(Read(noesis.PhainesisEvents, "threatField"), action.AttackKey ? 1 : 0)));
        var zoeValue = Clamp01(Math.Max(
            zoe.Vetoed ? 1 : 0,
            Math.Max(zoe.LethalRisk, zoe.LowHealth ? 0.55f : 0)));

        return
        [
            Clamp01(Math.Max(Read(pipelineState.Aisthesis.SensorReadings, "visual"), Math.Max(Read(noesis.PhainesisEvents, "blueFloor"), routePlan.FirstDoorRouteEvidence))),
            Clamp01(Math.Max(Read(noesis.NousVectors, "confidenceVector"), Math.Max(routeConfidence, topology.BarrelZoneEvidence))),
            Clamp01(Math.Max(kairos.Logos, Math.Max(kairos.Pathos, kairos.Ethos))),
            Clamp01(Math.Max(actionActive ? 0.72f : 0, kinesis.ActionRepeatFrames / 30f)),
            routeConfidence,
            loopBudget,
            Clamp01(Math.Max(routePlan.FirstDoorRouteEvidence, routePlan.UseProbeConfidence)),
            combat,
            zoeValue,
            Clamp01(kairos.Logos),
            Clamp01(kairos.Pathos),
            Clamp01(kairos.Ethos),
            Clamp01(topology.WallDistanceNormalized),
            Clamp01(topology.BarrelZoneEvidence),
            Clamp01((topology.CenterCorridorAlignment + 1) / 2f),
            Clamp01(kinesis.UsePulseCooldownFrames / 90f)
        ];
    }

    private static bool IsGpuPriorityRegion(DoomOverlayRegionDto region)
    {
        var kind = region.Kind?.Trim().ToLowerInvariant() ?? string.Empty;
        var priority = region.Priority?.Trim().ToLowerInvariant() ?? string.Empty;
        return priority == "high"
            || kind is "combat" or "zoe" or "enemy" or "enemy-circle" or "door" or "bridge";
    }

    private static void AddRect(List<DoomGpuHudRectDto> rects, DoomGpuHudRectDto rect)
    {
        if (rects.Count >= DoomGpuContracts.HudRectCount || rect.Width <= 0 || rect.Height <= 0)
        {
            return;
        }

        rects.Add(rect);
    }

    private static void AddLabel(List<DoomGpuHudLabelDto> labels, DoomGpuHudLabelDto label)
    {
        if (labels.Count >= DoomGpuContracts.HudLabelCount || string.IsNullOrWhiteSpace(label.Label))
        {
            return;
        }

        labels.Add(label);
    }

    private static float Read(IReadOnlyDictionary<string, float> values, string key)
        => values.TryGetValue(key, out var value) ? Clamp01(value) : 0;

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}

/// <summary>
/// EN: Lightweight text label paired with GPU HUD primitives.
/// JA: GPU HUD primitive と対になる軽量 text label です。
/// </summary>
public sealed record DoomGpuHudLabelDto
{
    /// <summary>
    /// EN: CSS class suffix used by the reduced DOM overlay.
    /// JA: reduced DOM overlay が利用する CSS class suffix です。
    /// </summary>
    public string ClassName { get; init; } = "is-diagnostic";

    /// <summary>
    /// EN: Short label text.
    /// JA: 短い label text です。
    /// </summary>
    public string Label { get; init; } = string.Empty;

    /// <summary>
    /// EN: Optional value text.
    /// JA: 任意の value text です。
    /// </summary>
    public string Value { get; init; } = string.Empty;

    /// <summary>
    /// EN: Label priority such as low, mid, or high.
    /// JA: low、mid、high などの label priority です。
    /// </summary>
    public string Priority { get; init; } = "mid";

    /// <summary>
    /// EN: Indicates whether the label should appear active.
    /// JA: label を active として表示すべきかを示します。
    /// </summary>
    public bool Active { get; init; } = true;

    /// <summary>
    /// EN: Stable display slot for vertical label placement.
    /// JA: label の縦配置に使う安定した display slot です。
    /// </summary>
    public int Slot { get; init; }

    /// <summary>
    /// EN: Projection source used for diagnostics.
    /// JA: diagnostics に利用する projection source です。
    /// </summary>
    public string Source { get; init; } = "gpu-hud-dto";

    /// <summary>
    /// EN: Creates a label from a visual candidate.
    /// JA: visual candidate から label を作成します。
    /// </summary>
    /// <param name="kind">EN: Candidate kind. JA: candidate kind です。</param>
    /// <param name="candidate">EN: Candidate DTO. JA: candidate DTO です。</param>
    /// <param name="slot">EN: Display slot. JA: display slot です。</param>
    public static DoomGpuHudLabelDto FromCandidate(string kind, DoomOverlayCandidateDto candidate, int slot)
        => new()
        {
            ClassName = kind == "door" ? "is-door is-door-candidate" : "is-wall is-corner-candidate",
            Label = kind == "door" ? "DOOR" : "CORNER",
            Value = $"score={candidate.Score:0.00} red={candidate.RedScore:0.00} edge={candidate.EdgeScore:0.00}",
            Priority = kind == "door" ? "high" : "mid",
            Active = true,
            Slot = slot,
            Source = "gpu-hud-rect"
        };

    /// <summary>
    /// EN: Creates a label from a high-priority region.
    /// JA: high-priority region から label を作成します。
    /// </summary>
    /// <param name="region">EN: Region DTO. JA: region DTO です。</param>
    /// <param name="slot">EN: Display slot. JA: display slot です。</param>
    public static DoomGpuHudLabelDto FromRegion(DoomOverlayRegionDto region, int slot)
    {
        var kind = string.IsNullOrWhiteSpace(region.Kind) ? "diagnostic" : region.Kind.Trim().ToLowerInvariant();
        return new DoomGpuHudLabelDto
        {
            ClassName = $"is-{kind}",
            Label = string.IsNullOrWhiteSpace(region.Label) ? kind.ToUpperInvariant() : region.Label,
            Value = region.Value,
            Priority = string.IsNullOrWhiteSpace(region.Priority) ? "mid" : region.Priority,
            Active = region.Active,
            Slot = slot,
            Source = "gpu-hud-rect"
        };
    }

    /// <summary>
    /// EN: Creates a label from an enemy direction marker.
    /// JA: enemy direction marker から label を作成します。
    /// </summary>
    /// <param name="circle">EN: Enemy circle DTO. JA: enemy circle DTO です。</param>
    /// <param name="slot">EN: Display slot. JA: display slot です。</param>
    public static DoomGpuHudLabelDto FromEnemyCircle(DoomEnemyCircleDto circle, int slot)
        => new()
        {
            ClassName = $"is-enemy-circle is-enemy-circle-{circle.Type}",
            Label = circle.Type == "audio" ? "ENEMY AUDIO" : (circle.Type == "av" ? "ENEMY A/V" : "ENEMY"),
            Value = $"{circle.Type} {circle.Direction} {circle.Confidence:0.00}",
            Priority = "high",
            Active = circle.Active,
            Slot = slot,
            Source = "gpu-hud-rect"
        };
}

/// <summary>
/// EN: GPU Aisthesis pipeline control DTO for zero-copy raw framebuffer analysis.
/// JA: zero-copy raw framebuffer 解析用の GPU Aisthesis pipeline control DTO です。
/// </summary>
public sealed record DoomGpuAisthesisDto
{
    /// <summary>
    /// EN: Empty GPU Aisthesis pipeline contract.
    /// JA: 空の GPU Aisthesis pipeline contract です。
    /// </summary>
    public static DoomGpuAisthesisDto Empty { get; } = new();

    /// <summary>
    /// EN: Doom-local GPU Aisthesis contract version that maps to the future canonical GpuAisthesisInput version.
    /// JA: 将来の canonical GpuAisthesisInput version に対応する Doom-local GPU Aisthesis contract version です。
    /// </summary>
    public int ContractVersion { get; init; } = 1;

    /// <summary>
    /// EN: Contract name used while Doom-local DTOs remain compatibility adapters.
    /// JA: Doom-local DTO が compatibility adapter である間に利用する contract name です。
    /// </summary>
    public string ContractName { get; init; } = "DoomGpuAisthesis";

    /// <summary>
    /// EN: Indicates whether the GPU Aisthesis pipeline should run.
    /// JA: GPU Aisthesis pipeline を実行すべきかを示します。
    /// </summary>
    public bool Enabled { get; init; }

    /// <summary>
    /// EN: Raw framebuffer target name used as the zero-copy input texture.
    /// JA: zero-copy input texture として使う raw framebuffer target 名です。
    /// </summary>
    public string InputTarget { get; init; } = DoomGpuContracts.RawFramebufferTarget;

    /// <summary>
    /// EN: Structured raw framebuffer target descriptor used as the zero-copy input texture.
    /// JA: zero-copy input texture として使う structured raw framebuffer target descriptor です。
    /// </summary>
    public DoomGpuFrameTargetDto InputFrameTarget { get; init; } = DoomGpuFrameTargetDto.RawFramebuffer();

    /// <summary>
    /// EN: HUD composite target that may consume GPU-produced features.
    /// JA: GPU が生成した feature を消費できる HUD composite target です。
    /// </summary>
    public string HudTarget { get; init; } = DoomGpuContracts.HudCompositeTarget;

    /// <summary>
    /// EN: Structured HUD composite target that may consume GPU-produced features.
    /// JA: GPU が生成した feature を消費できる structured HUD composite target です。
    /// </summary>
    public DoomGpuFrameTargetDto HudFrameTarget { get; init; } = DoomGpuFrameTargetDto.HudCompositeOffscreen();

    /// <summary>
    /// EN: Capture source for GPU Aisthesis; HUD overlays must be excluded.
    /// JA: GPU Aisthesis 用の capture source です。HUD overlay は除外されなければなりません。
    /// </summary>
    public string CaptureSource { get; init; } = DoomGpuContracts.RawFramebufferWireName;

    /// <summary>
    /// EN: Structured capture target for GPU Aisthesis; HUD overlays must be excluded.
    /// JA: GPU Aisthesis 用の structured capture target です。HUD overlay は除外されなければなりません。
    /// </summary>
    public DoomGpuFrameTargetDto CaptureFrameTarget { get; init; } = DoomGpuFrameTargetDto.RawFramebuffer();

    /// <summary>
    /// EN: Readback policy for GPU-produced features.
    /// JA: GPU が生成した feature の readback policy です。
    /// </summary>
    public string ReadbackPolicy { get; init; } = "debug-only";

    /// <summary>
    /// EN: Structured readback policy for GPU-produced features.
    /// JA: GPU が生成した feature の structured readback policy です。
    /// </summary>
    public DoomGpuReadbackPolicyDto Readback { get; init; } = DoomGpuReadbackPolicyDto.DebugReadback;

    /// <summary>
    /// EN: Frame token placeholder that the GPU provider can stamp with a concrete frame id.
    /// JA: GPU provider が concrete frame id を stamp できる frame token placeholder です。
    /// </summary>
    public DoomGpuFrameTokenDto FrameToken { get; init; } = DoomGpuFrameTokenDto.Pending();

    /// <summary>
    /// EN: Requested output mode such as heatmap, vector, mask, or composite.
    /// JA: heatmap、vector、mask、composite などの requested output mode です。
    /// </summary>
    public string Output { get; init; } = "composite";

    /// <summary>
    /// EN: Indicates whether the GPU Aisthesis pass should emit the fixed 9x9 mask texture.
    /// JA: GPU Aisthesis pass が固定 9x9 mask texture を出力すべきかを示します。
    /// </summary>
    public bool MaskTextureEnabled { get; init; }

    /// <summary>
    /// EN: Provider-local texture target name for the GPU-produced Aisthesis mask.
    /// JA: GPU が生成する Aisthesis mask 用の provider-local texture target 名です。
    /// </summary>
    public string MaskTextureTarget { get; init; } = DoomGpuContracts.AisthesisMaskTarget;

    /// <summary>
    /// EN: Structured descriptor for the GPU-produced Aisthesis mask texture.
    /// JA: GPU が生成する Aisthesis mask texture の structured descriptor です。
    /// </summary>
    public DoomGpuTextureTargetDto MaskTexture { get; init; } = DoomGpuTextureTargetDto.AisthesisMask9x9();

    /// <summary>
    /// EN: Channel layout for the 9x9 mask texture: heat, red, edge, and corner.
    /// JA: 9x9 mask texture の channel layout です。heat、red、edge、corner を格納します。
    /// </summary>
    public string MaskTextureLayout { get; init; } = DoomGpuContracts.AisthesisMaskLayout;

    /// <summary>
    /// EN: Compact diagnostic summary for HUD panels so JS can display the canonical GPU contract directly.
    /// JA: JS が canonical GPU contract を直接表示できるようにする HUD panel 向け compact diagnostic summary です。
    /// </summary>
    public string Summary { get; init; } = "gpu=idle";

    /// <summary>
    /// EN: Enables GPU-side 9x9 vision heatmap extraction.
    /// JA: GPU 側の 9x9 vision heatmap 抽出を有効化します。
    /// </summary>
    public bool VisionHeatmap { get; init; }

    /// <summary>
    /// EN: Enables GPU-side edge detection.
    /// JA: GPU 側の edge detection を有効化します。
    /// </summary>
    public bool EdgeDetect { get; init; }

    /// <summary>
    /// EN: Enables GPU-side corner detection.
    /// JA: GPU 側の corner detection を有効化します。
    /// </summary>
    public bool CornerDetect { get; init; }

    /// <summary>
    /// EN: Enables GPU-side red panel detection.
    /// JA: GPU 側の red panel detection を有効化します。
    /// </summary>
    public bool RedPanelDetect { get; init; }

    /// <summary>
    /// EN: Enables GPU-side enemy direction feature extraction.
    /// JA: GPU 側の enemy direction feature extraction を有効化します。
    /// </summary>
    public bool EnemyDirection { get; init; }

    /// <summary>
    /// EN: Enables GPU-side projectile flow extraction.
    /// JA: GPU 側の projectile flow extraction を有効化します。
    /// </summary>
    public bool ProjectileFlow { get; init; }

    /// <summary>
    /// EN: Requested feature names for diagnostics and future shader dispatch.
    /// JA: diagnostics と将来の shader dispatch に利用する requested feature 名です。
    /// </summary>
    public IReadOnlyList<string> Features { get; init; } = Array.Empty<string>();

    /// <summary>
    /// EN: Canonical semantic kinds of the matrices carried by MatrixValues.
    /// JA: MatrixValues が運ぶ matrix の canonical semantic kind です。
    /// </summary>
    public IReadOnlyList<string> MatrixKinds { get; init; } = Array.Empty<string>();

    /// <summary>
    /// EN: Compact matrix kind summary for HUD and provider status display.
    /// JA: HUD と provider status 表示向けの compact matrix kind summary です。
    /// </summary>
    public string MatrixKindSummary { get; init; } = "matrices=none";

    /// <summary>
    /// EN: Spatial matrices prepared for future WebGPU StorageBuffer upload.
    /// JA: 将来の WebGPU StorageBuffer upload のために準備した spatial matrix です。
    /// </summary>
    public IReadOnlyList<DoomGpuSpatialMatrixDto> Matrices { get; init; } = Array.Empty<DoomGpuSpatialMatrixDto>();

    /// <summary>
    /// EN: Compact CTG / route / combat / Zoe state vector prepared for GPU preprocessing.
    /// JA: GPU preprocessing 用に準備した compact CTG / route / combat / Zoe state vector です。
    /// </summary>
    public IReadOnlyList<float> StateVector { get; init; } = Array.Empty<float>();

    /// <summary>
    /// EN: Flattened StorageBuffer payload for WebGPU upload, including matrix headers.
    /// JA: matrix header を含む WebGPU upload 用の flattened StorageBuffer payload です。
    /// </summary>
    public IReadOnlyList<float> MatrixValues { get; init; } = Array.Empty<float>();

    /// <summary>
    /// EN: Flat buffer layout for MatrixValues.
    /// JA: MatrixValues の flat buffer layout です。
    /// </summary>
    public string MatrixLayout { get; init; } = "matrix:kind,rows,columns,count,values";

    /// <summary>
    /// EN: Structured layout descriptor for MatrixValues.
    /// JA: MatrixValues の structured layout descriptor です。
    /// </summary>
    public DoomGpuFlatBufferLayoutDto MatrixBufferLayout { get; init; } = DoomGpuFlatBufferLayoutDto.Matrices();

    /// <summary>
    /// EN: Flat buffer layout for StateVector.
    /// JA: StateVector の flat buffer layout です。
    /// </summary>
    public string StateVectorLayout { get; init; } = $"{DoomGpuContracts.StateVectorLayoutName}:route,loop,door,combat,zoe,logos,pathos,ethos,topology,use";

    /// <summary>
    /// EN: Structured layout descriptor for StateVector.
    /// JA: StateVector の structured layout descriptor です。
    /// </summary>
    public DoomGpuFlatBufferLayoutDto StateVectorBufferLayout { get; init; } = DoomGpuFlatBufferLayoutDto.StateVector();

    /// <summary>
    /// EN: Canonical flat-buffer layout summary so JS can avoid rebuilding layout text.
    /// JA: JS が layout text を再構築しなくて済むようにする canonical flat-buffer layout summary です。
    /// </summary>
    public string BufferLayoutSummary { get; init; } = "matrix/state layout=unset";

    /// <summary>
    /// EN: Number of spatial matrices carried by this DTO.
    /// JA: この DTO が運ぶ spatial matrix 数です。
    /// </summary>
    public int MatrixCount { get; init; }

    /// <summary>
    /// EN: Total number of matrix floats carried by this DTO.
    /// JA: この DTO が運ぶ matrix float の総数です。
    /// </summary>
    public int MatrixFloatCount { get; init; }

    /// <summary>
    /// EN: Number of requested GPU feature contracts.
    /// JA: request された GPU feature contract 数です。
    /// </summary>
    public int FeatureCount { get; init; }

    /// <summary>
    /// EN: Creates the default GPU Aisthesis contract from current pipeline evidence.
    /// JA: 現在の pipeline evidence から既定の GPU Aisthesis contract を作成します。
    /// </summary>
    /// <param name="pipelineState">EN: Four-layer pipeline state. JA: 4-layer pipeline state です。</param>
    /// <param name="routePlan">EN: Route planner result. JA: route planner result です。</param>
    /// <param name="action">EN: Selected action command. JA: 選択済み action command です。</param>
    public static DoomGpuAisthesisDto From(PipelineStateDto pipelineState, DoomRoutePlannerResult routePlan, ActionCommand action)
    {
        pipelineState ??= PipelineStateDto.Empty;
        routePlan ??= DoomRoutePlannerResult.Empty;
        action ??= new ActionCommand(false, false, false, false, 0, false, false);

        var combat = Read(pipelineState.Noesis.PhainesisEvents, "enemyPresence") > 0.08f
            || Read(pipelineState.Aisthesis.SensorReadings, "audioEnemyConfidence") > 0.08f
            || action.AttackKey;
        var door = routePlan.UseProbeConfidence > 0.08f
            || routePlan.FirstDoorRouteEvidence > 0.08f
            || Read(pipelineState.Aisthesis.SensorReadings, "firstDoorVision9x9RedScore") > 0.04f;
        var corner = routePlan.RouteWallObstacle || routePlan.RouteFootObstacle;
        var features = new List<string> { "vision-heatmap", "edge-detect", "mask9x9-texture" };
        if (door)
        {
            features.Add("red-panel-detect");
        }

        if (corner)
        {
            features.Add("corner-detect");
        }

        if (combat)
        {
            features.Add("enemy-direction");
            features.Add("projectile-flow");
        }

        var matrices = CreateMatrices(pipelineState, routePlan, action, combat);
        var stateVector = CreateStateVector(pipelineState, routePlan, action, combat);
        var matrixValues = FlattenMatrices(matrices, stateVector);
        var matrixFloatCount = matrixValues.Count;
        var matrixLayout = DoomGpuFlatBufferLayoutDto.Matrices();
        var stateLayout = DoomGpuFlatBufferLayoutDto.StateVector();

        return new DoomGpuAisthesisDto
        {
            Enabled = true,
            InputTarget = DoomGpuContracts.RawFramebufferTarget,
            InputFrameTarget = DoomGpuFrameTargetDto.RawFramebuffer(),
            HudTarget = DoomGpuContracts.HudCompositeTarget,
            HudFrameTarget = DoomGpuFrameTargetDto.HudCompositeOffscreen(),
            CaptureSource = DoomGpuContracts.RawFramebufferWireName,
            CaptureFrameTarget = DoomGpuFrameTargetDto.RawFramebuffer(),
            ReadbackPolicy = "debug-only",
            Readback = DoomGpuReadbackPolicyDto.DebugReadback,
            FrameToken = DoomGpuFrameTokenDto.Pending(phase: "gpu-aisthesis-dto"),
            Output = combat ? "vector+mask+heatmap" : "heatmap+vector",
            MaskTextureEnabled = true,
            MaskTextureTarget = DoomGpuContracts.AisthesisMaskTarget,
            MaskTexture = DoomGpuTextureTargetDto.AisthesisMask9x9(),
            MaskTextureLayout = DoomGpuContracts.AisthesisMaskLayout,
            Summary = CreateSummary(features, matrices.Count, matrixFloatCount),
            VisionHeatmap = true,
            EdgeDetect = true,
            CornerDetect = corner,
            RedPanelDetect = door,
            EnemyDirection = combat,
            ProjectileFlow = combat,
            Features = features,
            MatrixKinds = matrices.Select(matrix => matrix.Kind).ToArray(),
            MatrixKindSummary = CreateMatrixKindSummary(matrices),
            Matrices = matrices,
            StateVector = stateVector,
            MatrixValues = matrixValues,
            MatrixBufferLayout = matrixLayout,
            StateVectorBufferLayout = stateLayout,
            BufferLayoutSummary = $"{matrixLayout.Summary}; {stateLayout.Summary}",
            MatrixCount = matrices.Count,
            MatrixFloatCount = matrixFloatCount,
            FeatureCount = features.Count
        };
    }

    private static string CreateSummary(IReadOnlyList<string> features, int matrixCount, int matrixFloatCount)
    {
        var featureText = features.Count > 0
            ? string.Join("+", features.Take(2))
            : "features";
        var maskText = features.Contains("mask9x9-texture", StringComparer.Ordinal) ? " mask9x9" : string.Empty;
        return $"gpu=dto m{matrixCount} f{matrixFloatCount}{maskText} {featureText}";
    }

    private static string CreateMatrixKindSummary(IReadOnlyList<DoomGpuSpatialMatrixDto> matrices)
    {
        if (matrices.Count == 0)
        {
            return "matrices=none";
        }

        return $"matrices={string.Join("+", matrices.Select(matrix => matrix.Kind))}";
    }

    private static IReadOnlyList<float> FlattenMatrices(IReadOnlyList<DoomGpuSpatialMatrixDto> matrices, IReadOnlyList<float> stateVector)
    {
        const int maxFloats = DoomGpuContracts.AisthesisMatrixFloatCount;
        var output = new List<float>(Math.Min(maxFloats, matrices.Sum(matrix => matrix.Values.Count + 4) + 20));
        foreach (var matrix in matrices)
        {
            if (output.Count >= maxFloats - 4)
            {
                break;
            }

            var rows = Math.Clamp(matrix.Rows, 1, DoomGpuContracts.StateVectorFloatCount);
            var columns = Math.Clamp(matrix.Columns, 1, DoomGpuContracts.StateVectorFloatCount);
            var valueCount = Math.Min(Math.Min(matrix.Values.Count, rows * columns), maxFloats - output.Count - 4);
            output.Add(GpuMatrixKindCode(matrix.Kind));
            output.Add(rows);
            output.Add(columns);
            output.Add(valueCount);
            for (var index = 0; index < valueCount; index++)
            {
                output.Add(Clamp01(matrix.Values[index]));
            }
        }

        if (output.Count == 0 && stateVector.Count > 0 && output.Count < maxFloats - 4)
        {
            var valueCount = Math.Min(Math.Min(stateVector.Count, DoomGpuContracts.StateVectorFloatCount), maxFloats - output.Count - 4);
            output.Add(5);
            output.Add(1);
            output.Add(DoomGpuContracts.StateVectorFloatCount);
            output.Add(valueCount);
            for (var index = 0; index < valueCount; index++)
            {
                output.Add(Clamp01(stateVector[index]));
            }
        }

        return output;
    }

    private static int GpuMatrixKindCode(string kind)
    {
        var text = (kind ?? string.Empty).Trim().ToLowerInvariant();
        if (text.Contains("topos"))
        {
            return 1;
        }

        if (text.Contains("route"))
        {
            return 2;
        }

        if (text.Contains("threat") || text.Contains("combat"))
        {
            return 3;
        }

        if (text.Contains("zoe") || text.Contains("veto"))
        {
            return 4;
        }

        if (text.Contains("ctg") || text.Contains("state"))
        {
            return 5;
        }

        return 0;
    }

    private static IReadOnlyList<DoomGpuSpatialMatrixDto> CreateMatrices(
        PipelineStateDto pipelineState,
        DoomRoutePlannerResult routePlan,
        ActionCommand action,
        bool combat)
    {
        var output = new List<DoomGpuSpatialMatrixDto>
        {
            DoomGpuSpatialMatrixDto.Create9x9("topos9x9", CreateToposMatrix(pipelineState, routePlan)),
            DoomGpuSpatialMatrixDto.Create9x9("route-cost9x9", CreateRouteCostMatrix(pipelineState, routePlan)),
            DoomGpuSpatialMatrixDto.Create1x16("ctg-state", CreateStateVector(pipelineState, routePlan, action, combat))
        };

        if (combat)
        {
            output.Add(DoomGpuSpatialMatrixDto.Create9x9("threat9x9", CreateThreatMatrix(pipelineState, action)));
        }

        if (pipelineState.Kinesis.Zoe.Warning || pipelineState.Kinesis.Zoe.Vetoed || pipelineState.Kinesis.Zoe.LethalRisk > 0.08f)
        {
            output.Add(DoomGpuSpatialMatrixDto.Create9x9("zoe-veto9x9", CreateZoeMatrix(pipelineState)));
        }

        return output;
    }

    private static IReadOnlyList<float> CreateToposMatrix(PipelineStateDto pipelineState, DoomRoutePlannerResult routePlan)
    {
        var values = new float[DoomGpuContracts.HudCellCount];
        var topology = pipelineState.Noesis.Topology;
        var yaw = Math.Clamp(routePlan.RecommendedYaw / 45f, -1, 1);
        var route = Math.Max(routePlan.RouteConfidence, routePlan.FirstDoorRouteEvidence);
        var centerPull = Math.Clamp(topology.CenterlineDirectionX, -1, 1);
        var center = DoomGpuContracts.HudGridSize / 2;
        var scale = Math.Max(1, center);
        for (var row = 0; row < DoomGpuContracts.HudGridSize; row++)
        {
            for (var column = 0; column < DoomGpuContracts.HudGridSize; column++)
            {
                var index = row * DoomGpuContracts.HudGridSize + column;
                var forward = 1 - Math.Abs(row - 2) / Math.Max(1, DoomGpuContracts.HudGridSize - 3f);
                var corridor = 1 - Math.Abs((column - center) / (float)scale - yaw);
                var centerWeight = 1 - Math.Abs((column - center) / (float)scale - centerPull);
                values[index] = Clamp01((route * 0.50f) + (forward * corridor * 0.30f) + (centerWeight * (1 - topology.BarrelZoneEvidence) * 0.20f));
            }
        }

        return values;
    }

    private static IReadOnlyList<float> CreateRouteCostMatrix(PipelineStateDto pipelineState, DoomRoutePlannerResult routePlan)
    {
        var values = new float[DoomGpuContracts.HudCellCount];
        var topology = pipelineState.Noesis.Topology;
        var wallCost = 1 - topology.WallDistanceNormalized;
        var barrel = topology.BarrelZoneEvidence;
        var yaw = Math.Clamp(routePlan.RecommendedYaw / 45f, -1, 1);
        var center = DoomGpuContracts.HudGridSize / 2;
        var scale = Math.Max(1, center);
        for (var row = 0; row < DoomGpuContracts.HudGridSize; row++)
        {
            for (var column = 0; column < DoomGpuContracts.HudGridSize; column++)
            {
                var side = Math.Abs(column - center) / (float)scale;
                var routeSide = Math.Abs((column - center) / (float)scale - yaw);
                var forwardPenalty = row > 5 ? 0.18f : 0;
                values[row * DoomGpuContracts.HudGridSize + column] = Clamp01((wallCost * side * 0.34f) + (barrel * routeSide * 0.46f) + forwardPenalty + (topology.DeadEndRisk ? 0.18f : 0));
            }
        }

        return values;
    }

    private static IReadOnlyList<float> CreateThreatMatrix(PipelineStateDto pipelineState, ActionCommand action)
    {
        var values = new float[DoomGpuContracts.HudCellCount];
        var enemy = Math.Max(Read(pipelineState.Noesis.PhainesisEvents, "enemyPresence"), Read(pipelineState.Noesis.PhainesisEvents, "threatField"));
        var yaw = Math.Clamp(action.TurnYaw / 32f, -1, 1);
        var center = DoomGpuContracts.HudGridSize / 2;
        var scale = Math.Max(1, center);
        for (var row = 0; row < DoomGpuContracts.HudGridSize; row++)
        {
            for (var column = 0; column < DoomGpuContracts.HudGridSize; column++)
            {
                var horizontal = 1 - Math.Abs((column - center) / (float)scale - yaw);
                var nearCenter = 1 - Math.Abs(row - center) / (float)scale;
                values[row * DoomGpuContracts.HudGridSize + column] = Clamp01(enemy * Math.Max(0, horizontal) * Math.Max(0.25f, nearCenter));
            }
        }

        return values;
    }

    private static IReadOnlyList<float> CreateZoeMatrix(PipelineStateDto pipelineState)
    {
        var values = new float[DoomGpuContracts.HudCellCount];
        var zoe = pipelineState.Kinesis.Zoe;
        var risk = Clamp01(Math.Max(zoe.Vetoed ? 1 : 0, Math.Max(zoe.LethalRisk, zoe.LowHealth ? 0.55f : 0)));
        var center = DoomGpuContracts.HudGridSize / 2;
        for (var row = 0; row < DoomGpuContracts.HudGridSize; row++)
        {
            for (var column = 0; column < DoomGpuContracts.HudGridSize; column++)
            {
                var centerDistance = Math.Abs(row - center) + Math.Abs(column - center);
                values[row * DoomGpuContracts.HudGridSize + column] = Clamp01(risk * (centerDistance <= 2 ? 1 : 0.42f));
            }
        }

        return values;
    }

    private static IReadOnlyList<float> CreateStateVector(PipelineStateDto pipelineState, DoomRoutePlannerResult routePlan, ActionCommand action, bool combat)
    {
        var kairos = pipelineState.Krisis.Kairos;
        var topology = pipelineState.Noesis.Topology;
        var zoe = pipelineState.Kinesis.Zoe;
        return
        [
            Clamp01(kairos.Logos),
            Clamp01(kairos.Pathos),
            Clamp01(kairos.Ethos),
            Clamp01(routePlan.RouteConfidence),
            Clamp01(routePlan.FirstDoorRouteEvidence),
            Clamp01(routePlan.UseProbeConfidence),
            Clamp01(topology.WallDistanceNormalized),
            Clamp01(topology.BarrelZoneEvidence),
            Clamp01((topology.CenterCorridorAlignment + 1) / 2f),
            Clamp01(combat ? 1 : 0),
            Clamp01(Math.Max(Read(pipelineState.Noesis.PhainesisEvents, "enemyPresence"), Read(pipelineState.Noesis.PhainesisEvents, "threatField"))),
            Clamp01(zoe.LethalRisk),
            Clamp01(zoe.LowHealth ? 1 : 0),
            Clamp01(action.MoveForward ? 1 : 0),
            Clamp01(action.TurnYaw == 0 ? 0 : Math.Abs(action.TurnYaw) / 32f),
            Clamp01(action.UseKey ? 1 : 0)
        ];
    }

    private static float Read(IReadOnlyDictionary<string, float> values, string key)
        => values.TryGetValue(key, out var value) ? Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1) : 0;

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}

/// <summary>
/// EN: GPU spatial reasoning contract that reduces Aisthesis feature and matrix buffers into a compact decision vector.
/// JA: Aisthesis feature / matrix buffer を compact decision vector へ集約する GPU spatial reasoning contract です。
/// </summary>
public sealed record DoomGpuSpatialReasoningDto
{
    /// <summary>
    /// EN: Empty GPU spatial reasoning projection.
    /// JA: 空の GPU spatial reasoning projection です。
    /// </summary>
    public static DoomGpuSpatialReasoningDto Empty { get; } = new();

    /// <summary>
    /// EN: Doom-local contract version that maps to the future canonical GPU spatial reasoning contract.
    /// JA: 将来の canonical GPU spatial reasoning contract に対応する Doom-local contract version です。
    /// </summary>
    public int ContractVersion { get; init; } = 1;

    /// <summary>
    /// EN: Contract name used while Doom-local DTOs remain compatibility adapters.
    /// JA: Doom-local DTO が compatibility adapter である間に利用する contract name です。
    /// </summary>
    public string ContractName { get; init; } = "DoomGpuSpatialReasoning";

    /// <summary>
    /// EN: Indicates whether the GPU spatial reasoning pass should run.
    /// JA: GPU spatial reasoning pass を実行すべきかを示します。
    /// </summary>
    public bool Enabled { get; init; }

    /// <summary>
    /// EN: Feature buffer source produced by GPU Aisthesis.
    /// JA: GPU Aisthesis が生成する feature buffer source です。
    /// </summary>
    public string InputSource { get; init; } = DoomGpuContracts.AisthesisFeatureBufferTarget;

    /// <summary>
    /// EN: Matrix buffer source produced by GPU Aisthesis.
    /// JA: GPU Aisthesis が生成する matrix buffer source です。
    /// </summary>
    public string MatrixSource { get; init; } = DoomGpuContracts.AisthesisMatrixBufferTarget;

    /// <summary>
    /// EN: GPU Aisthesis mask texture source consumed by the spatial reasoning pass.
    /// JA: spatial reasoning pass が消費する GPU Aisthesis mask texture source です。
    /// </summary>
    public string MaskTextureSource { get; init; } = DoomGpuContracts.AisthesisMaskTarget;

    /// <summary>
    /// EN: Structured mask texture descriptor consumed by the spatial reasoning pass.
    /// JA: spatial reasoning pass が消費する structured mask texture descriptor です。
    /// </summary>
    public DoomGpuTextureTargetDto MaskTexture { get; init; } = DoomGpuTextureTargetDto.AisthesisMask9x9();

    /// <summary>
    /// EN: Channel layout for the mask texture consumed by spatial reasoning.
    /// JA: spatial reasoning が消費する mask texture の channel layout です。
    /// </summary>
    public string MaskTextureLayout { get; init; } = DoomGpuContracts.AisthesisMaskLayout;

    /// <summary>
    /// EN: Output buffer target consumed by provider status and optional debug readback.
    /// JA: provider status と任意の debug readback が利用する output buffer target です。
    /// </summary>
    public string OutputTarget { get; init; } = DoomGpuContracts.SpatialReasoningOutputTarget;

    /// <summary>
    /// EN: Raw framebuffer target associated with this reasoning pass.
    /// JA: この reasoning pass に紐付く raw framebuffer target です。
    /// </summary>
    public DoomGpuFrameTargetDto InputFrameTarget { get; init; } = DoomGpuFrameTargetDto.RawFramebuffer();

    /// <summary>
    /// EN: HUD-composited target associated with this reasoning pass.
    /// JA: この reasoning pass に紐付く HUD-composited target です。
    /// </summary>
    public DoomGpuFrameTargetDto HudFrameTarget { get; init; } = DoomGpuFrameTargetDto.HudCompositeOffscreen();

    /// <summary>
    /// EN: Readback policy for the compact reasoning output.
    /// JA: compact reasoning output の readback policy です。
    /// </summary>
    public string ReadbackPolicy { get; init; } = "runtime-summary";

    /// <summary>
    /// EN: Structured readback policy for the compact reasoning output.
    /// JA: compact reasoning output の structured readback policy です。
    /// </summary>
    public DoomGpuReadbackPolicyDto Readback { get; init; } = DoomGpuReadbackPolicyDto.SummaryReadback;

    /// <summary>
    /// EN: Frame token placeholder that the GPU provider can stamp with a concrete frame id.
    /// JA: GPU provider が concrete frame id を stamp できる frame token placeholder です。
    /// </summary>
    public DoomGpuFrameTokenDto FrameToken { get; init; } = DoomGpuFrameTokenDto.Pending();

    /// <summary>
    /// EN: Feature flags requested by the spatial reasoning pass.
    /// JA: spatial reasoning pass が要求する feature flag です。
    /// </summary>
    public IReadOnlyList<string> FeatureFlags { get; init; } = Array.Empty<string>();

    /// <summary>
    /// EN: Compact reducer flag summary for HUD and provider status display.
    /// JA: HUD と provider status 表示向けの compact reducer flag summary です。
    /// </summary>
    public string FeatureFlagSummary { get; init; } = "reducers=none";

    /// <summary>
    /// EN: Matrix kinds inherited from GPU Aisthesis.
    /// JA: GPU Aisthesis から引き継いだ matrix kind です。
    /// </summary>
    public IReadOnlyList<string> MatrixKinds { get; init; } = Array.Empty<string>();

    /// <summary>
    /// EN: Compact matrix kind summary inherited from GPU Aisthesis.
    /// JA: GPU Aisthesis から引き継いだ compact matrix kind summary です。
    /// </summary>
    public string MatrixKindSummary { get; init; } = "matrices=none";

    /// <summary>
    /// EN: Output vector layout consumed by the WebGPU compute pass.
    /// JA: WebGPU compute pass が消費する output vector layout です。
    /// </summary>
    public DoomGpuFlatBufferLayoutDto OutputVectorLayout { get; init; } = DoomGpuFlatBufferLayoutDto.SpatialReasoningVector();

    /// <summary>
    /// EN: Number of output floats written by the GPU reasoning pass.
    /// JA: GPU reasoning pass が書き出す output float 数です。
    /// </summary>
    public int OutputFloatCount { get; init; } = DoomGpuContracts.SpatialReasoningOutputFloatCount;

    /// <summary>
    /// EN: Canonical output-vector layout summary so JS can avoid rebuilding layout text.
    /// JA: JS が layout text を再構築しなくて済むようにする canonical output-vector layout summary です。
    /// </summary>
    public string OutputLayoutSummary { get; init; } = DoomGpuFlatBufferLayoutDto.SpatialReasoningVector().Summary;

    /// <summary>
    /// EN: Number of flattened matrices supplied to GPU Aisthesis.
    /// JA: GPU Aisthesis へ渡した flattened matrix 数です。
    /// </summary>
    public int MatrixCount { get; init; }

    /// <summary>
    /// EN: Number of flattened matrix floats supplied to GPU Aisthesis.
    /// JA: GPU Aisthesis へ渡した flattened matrix float 数です。
    /// </summary>
    public int MatrixFloatCount { get; init; }

    /// <summary>
    /// EN: Number of feature toggles supplied by GPU Aisthesis.
    /// JA: GPU Aisthesis から渡された feature toggle 数です。
    /// </summary>
    public int FeatureCount { get; init; }

    /// <summary>
    /// EN: Compact diagnostic summary for HUD and provider status panels.
    /// JA: HUD と provider status panel 向けの compact diagnostic summary です。
    /// </summary>
    public string Summary { get; init; } = "spatial=idle";

    /// <summary>
    /// EN: Creates a spatial reasoning projection from the GPU Aisthesis contract.
    /// JA: GPU Aisthesis contract から spatial reasoning projection を作成します。
    /// </summary>
    /// <param name="gpuAisthesis">EN: GPU Aisthesis contract. JA: GPU Aisthesis contract です。</param>
    public static DoomGpuSpatialReasoningDto From(DoomGpuAisthesisDto gpuAisthesis)
    {
        gpuAisthesis ??= DoomGpuAisthesisDto.Empty;
        var flags = new List<string>
        {
            "topos-reduce",
            "route-reduce",
            "threat-reduce",
            "zoe-reduce",
            "ctg-normalize",
            "mask-texture-reduce"
        };

        if (gpuAisthesis.EnemyDirection)
        {
            flags.Add("enemy-yaw");
        }

        var outputLayout = DoomGpuFlatBufferLayoutDto.SpatialReasoningVector();
        return new DoomGpuSpatialReasoningDto
        {
            Enabled = gpuAisthesis.Enabled,
            MaskTextureSource = gpuAisthesis.MaskTextureTarget,
            MaskTexture = gpuAisthesis.MaskTexture,
            MaskTextureLayout = gpuAisthesis.MaskTextureLayout,
            InputFrameTarget = gpuAisthesis.InputFrameTarget,
            HudFrameTarget = gpuAisthesis.HudFrameTarget,
            ReadbackPolicy = "runtime-summary",
            Readback = DoomGpuReadbackPolicyDto.SummaryReadback,
            FrameToken = DoomGpuFrameTokenDto.Pending(gpuAisthesis.InputTarget, gpuAisthesis.HudTarget, "gpu-spatial-dto"),
            FeatureFlags = flags,
            FeatureFlagSummary = $"reducers={string.Join("+", flags)}",
            MatrixKinds = gpuAisthesis.MatrixKinds,
            MatrixKindSummary = gpuAisthesis.MatrixKindSummary,
            OutputVectorLayout = outputLayout,
            MatrixCount = gpuAisthesis.MatrixCount,
            MatrixFloatCount = gpuAisthesis.MatrixFloatCount,
            FeatureCount = gpuAisthesis.FeatureCount,
            OutputFloatCount = DoomGpuContracts.SpatialReasoningOutputFloatCount,
            OutputLayoutSummary = outputLayout.Summary,
            Summary = $"spatial=dto m{gpuAisthesis.MatrixCount} f{gpuAisthesis.MatrixFloatCount} feat{gpuAisthesis.FeatureCount} mask9x9 {DoomGpuContracts.SpatialReasoningVectorLayoutName}"
        };
    }
}

/// <summary>
/// EN: Canonical GPU path diagnostics projected by C# before runtime provider telemetry is merged.
/// JA: runtime provider telemetry を merge する前に C# が射影する canonical GPU path diagnostics です。
/// </summary>
public sealed record DoomGpuPathStatusDto
{
    /// <summary>
    /// EN: Empty GPU path diagnostic packet.
    /// JA: 空の GPU path diagnostic packet です。
    /// </summary>
    public static DoomGpuPathStatusDto Empty { get; } = new();

    /// <summary>
    /// EN: Doom-local contract version for the four-lane GPU path status table.
    /// JA: 4 lane GPU path status table 用の Doom-local contract version です。
    /// </summary>
    public int ContractVersion { get; init; } = 1;

    /// <summary>
    /// EN: Contract name used while Doom-local DTOs remain compatibility adapters.
    /// JA: Doom-local DTO が compatibility adapter である間に利用する contract name です。
    /// </summary>
    public string ContractName { get; init; } = "DoomGpuPathStatus";

    /// <summary>
    /// EN: Indicates whether a provider has stamped this packet with live telemetry.
    /// JA: provider が live telemetry でこの packet を stamp したかどうかを示します。
    /// </summary>
    public bool RuntimeStamped { get; init; }

    /// <summary>
    /// EN: Four canonical lanes: Game, Bonsai, HUD, and Sensor.
    /// JA: Game、Bonsai、HUD、Sensor の 4 つの canonical lane です。
    /// </summary>
    public IReadOnlyList<DoomGpuPathStatusRowDto> Rows { get; init; } = Array.Empty<DoomGpuPathStatusRowDto>();

    /// <summary>
    /// EN: Compact status text for dump panels.
    /// JA: dump panel 向けの compact status text です。
    /// </summary>
    public string Text { get; init; } = "game=unknown; bonsai=unknown; hud=unknown; sensor=unknown";

    /// <summary>
    /// EN: Short one-line status for FPS and CTG panels.
    /// JA: FPS と CTG panel 向けの短い 1 行 status です。
    /// </summary>
    public string ShortText { get; init; } = "GPU path pending";

    /// <summary>
    /// EN: Compact diagnostic summary.
    /// JA: compact diagnostic summary です。
    /// </summary>
    public string Summary { get; init; } = "gpu-path=idle";

    /// <summary>
    /// EN: Creates canonical GPU path rows from the GPU HUD, Aisthesis, and Spatial DTOs.
    /// JA: GPU HUD、Aisthesis、Spatial DTO から canonical GPU path row を作成します。
    /// </summary>
    /// <param name="gpuHud">EN: GPU HUD projection. JA: GPU HUD projection です。</param>
    /// <param name="gpuAisthesis">EN: GPU Aisthesis projection. JA: GPU Aisthesis projection です。</param>
    /// <param name="gpuSpatial">EN: GPU Spatial projection. JA: GPU Spatial projection です。</param>
    public static DoomGpuPathStatusDto From(
        DoomGpuHudOverlayDto gpuHud,
        DoomGpuAisthesisDto gpuAisthesis,
        DoomGpuSpatialReasoningDto gpuSpatial)
    {
        gpuHud ??= DoomGpuHudOverlayDto.Empty;
        gpuAisthesis ??= DoomGpuAisthesisDto.Empty;
        gpuSpatial ??= DoomGpuSpatialReasoningDto.Empty;

        var rows = new[]
        {
            new DoomGpuPathStatusRowDto
            {
                Label = "GAME",
                Mode = "GPU contract",
                Value = $"{gpuHud.RawFrameTarget.Kind}:{gpuHud.AnalysisCaptureSource} -> {gpuHud.RawFramebufferTarget}",
                Tone = "gpu",
                ZeroCopy = gpuHud.AnalysisFrameTarget.HudExcluded,
                CpuFallback = false
            },
            new DoomGpuPathStatusRowDto
            {
                Label = "BONSAI",
                Mode = "zero-copy requested",
                Value = $"raw={gpuHud.AnalysisCaptureSource} hudExcluded={gpuHud.AnalysisFrameTarget.HudExcluded}",
                Tone = "gpu",
                ZeroCopy = gpuHud.AnalysisFrameTarget.HudExcluded,
                CpuFallback = false
            },
            new DoomGpuPathStatusRowDto
            {
                Label = "HUD",
                Mode = "GPU composite",
                Value = $"{gpuHud.DisplaySource} panel={gpuHud.PanelBufferLayout.Name} rect={gpuHud.RectangleBufferLayout.Name}",
                Tone = "gpu",
                ZeroCopy = true,
                CpuFallback = false
            },
            new DoomGpuPathStatusRowDto
            {
                Label = "SENSOR",
                Mode = "GPU matrix",
                Value = $"ais={gpuAisthesis.InputTarget} mask={gpuAisthesis.MaskTextureTarget} spatial={gpuSpatial.OutputTarget}",
                Tone = "gpu",
                ZeroCopy = gpuAisthesis.CaptureFrameTarget.HudExcluded,
                CpuFallback = false
            }
        };

        return new DoomGpuPathStatusDto
        {
            RuntimeStamped = false,
            Rows = rows,
            Text = "game=contract; bonsai=zcp; hud=gpu-contract; sensor=matrix",
            ShortText = "GPU contract | B:zcp H:panel S:matrix",
            Summary = $"gpu-path=dto rows{rows.Length} raw={gpuHud.AnalysisCaptureSource} hud={gpuHud.DisplaySource} sensor={gpuAisthesis.MaskTextureTarget}"
        };
    }
}

/// <summary>
/// EN: One row in the canonical GPU path diagnostics table.
/// JA: canonical GPU path diagnostics table の 1 行です。
/// </summary>
public sealed record DoomGpuPathStatusRowDto
{
    /// <summary>
    /// EN: Lane label such as GAME, BONSAI, HUD, or SENSOR.
    /// JA: GAME、BONSAI、HUD、SENSOR などの lane label です。
    /// </summary>
    public string Label { get; init; } = string.Empty;

    /// <summary>
    /// EN: Human-readable mode.
    /// JA: 人間が読める mode です。
    /// </summary>
    public string Mode { get; init; } = string.Empty;

    /// <summary>
    /// EN: Diagnostic value shown in status panels.
    /// JA: status panel に表示する diagnostic value です。
    /// </summary>
    public string Value { get; init; } = string.Empty;

    /// <summary>
    /// EN: Visual tone, for example gpu, warn, or neutral.
    /// JA: gpu、warn、neutral などの visual tone です。
    /// </summary>
    public string Tone { get; init; } = string.Empty;

    /// <summary>
    /// EN: Indicates whether this lane is expected to avoid CPU readback.
    /// JA: この lane が CPU readback を避ける想定かどうかを示します。
    /// </summary>
    public bool ZeroCopy { get; init; }

    /// <summary>
    /// EN: Indicates whether the lane is known to be on a CPU fallback path.
    /// JA: この lane が CPU fallback path であると判明しているかどうかを示します。
    /// </summary>
    public bool CpuFallback { get; init; }

    /// <summary>
    /// EN: Estimated GPU memory in megabytes when runtime telemetry is available.
    /// JA: runtime telemetry が利用できる場合の推定 GPU memory MB です。
    /// </summary>
    public float MemoryMb { get; init; }

    /// <summary>
    /// EN: Short fallback or warning reason.
    /// JA: fallback または warning の短い reason です。
    /// </summary>
    public string Reason { get; init; } = string.Empty;
}

/// <summary>
/// EN: Compact matrix payload that can be uploaded into a GPU StorageBuffer.
/// JA: GPU StorageBuffer へ upload 可能な compact matrix payload です。
/// </summary>
public sealed record DoomGpuSpatialMatrixDto
{
    /// <summary>
    /// EN: Matrix semantic kind such as topos9x9, route-cost9x9, threat9x9, or ctg-state.
    /// JA: topos9x9、route-cost9x9、threat9x9、ctg-state などの matrix semantic kind です。
    /// </summary>
    public string Kind { get; init; } = "matrix";

    /// <summary>
    /// EN: Number of matrix rows.
    /// JA: matrix row 数です。
    /// </summary>
    public int Rows { get; init; }

    /// <summary>
    /// EN: Number of matrix columns.
    /// JA: matrix column 数です。
    /// </summary>
    public int Columns { get; init; }

    /// <summary>
    /// EN: Row-major normalized matrix values.
    /// JA: row-major の正規化済み matrix value です。
    /// </summary>
    public IReadOnlyList<float> Values { get; init; } = Array.Empty<float>();

    /// <summary>
    /// EN: Creates a normalized 9x9 matrix DTO.
    /// JA: 正規化済み 9x9 matrix DTO を作成します。
    /// </summary>
    /// <param name="kind">EN: Matrix kind. JA: matrix kind です。</param>
    /// <param name="values">EN: Row-major values. JA: row-major value です。</param>
    public static DoomGpuSpatialMatrixDto Create9x9(string kind, IReadOnlyList<float> values)
        => Create(kind, DoomGpuContracts.HudGridSize, DoomGpuContracts.HudGridSize, values);

    /// <summary>
    /// EN: Creates a normalized 1x16 vector DTO.
    /// JA: 正規化済み 1x16 vector DTO を作成します。
    /// </summary>
    /// <param name="kind">EN: Matrix kind. JA: matrix kind です。</param>
    /// <param name="values">EN: Row-major values. JA: row-major value です。</param>
    public static DoomGpuSpatialMatrixDto Create1x16(string kind, IReadOnlyList<float> values)
        => Create(kind, 1, DoomGpuContracts.StateVectorFloatCount, values);

    private static DoomGpuSpatialMatrixDto Create(string kind, int rows, int columns, IReadOnlyList<float> values)
    {
        var count = Math.Max(0, rows * columns);
        var normalized = new float[count];
        for (var index = 0; index < count; index++)
        {
            normalized[index] = index < values.Count ? Clamp01(values[index]) : 0;
        }

        return new DoomGpuSpatialMatrixDto
        {
            Kind = kind,
            Rows = rows,
            Columns = columns,
            Values = normalized
        };
    }

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}

/// <summary>
/// EN: GPU HUD diagnostic rectangle. Coordinates are normalized as CSS percentages.
/// JA: GPU HUD diagnostic rectangle です。座標は CSS percentage として正規化されています。
/// </summary>
public sealed record DoomGpuHudRectDto
{
    /// <summary>
    /// EN: Semantic rectangle kind used by the shader to choose a color family.
    /// JA: shader が color family を選ぶための semantic rectangle kind です。
    /// </summary>
    public string Kind { get; init; } = "diagnostic";

    /// <summary>
    /// EN: Left position in percentage.
    /// JA: percentage の left position です。
    /// </summary>
    public float Left { get; init; }

    /// <summary>
    /// EN: Top position in percentage.
    /// JA: percentage の top position です。
    /// </summary>
    public float Top { get; init; }

    /// <summary>
    /// EN: Width in percentage.
    /// JA: percentage の width です。
    /// </summary>
    public float Width { get; init; }

    /// <summary>
    /// EN: Height in percentage.
    /// JA: percentage の height です。
    /// </summary>
    public float Height { get; init; }

    /// <summary>
    /// EN: Normalized rectangle confidence.
    /// JA: 正規化済み rectangle confidence です。
    /// </summary>
    public float Score { get; init; }

    /// <summary>
    /// EN: Rectangle alpha multiplier.
    /// JA: rectangle alpha multiplier です。
    /// </summary>
    public float Alpha { get; init; } = 0.68f;

    /// <summary>
    /// EN: RGB color vector consumed by the GPU HUD shader before falling back to semantic kind colors.
    /// JA: semantic kind color への fallback 前に GPU HUD shader が消費する RGB color vector です。
    /// </summary>
    public IReadOnlyList<float> Color { get; init; } = Array.Empty<float>();

    /// <summary>
    /// EN: Creates a GPU rectangle from a visual candidate.
    /// JA: visual candidate から GPU rectangle を作成します。
    /// </summary>
    /// <param name="kind">EN: Rectangle kind. JA: rectangle kind です。</param>
    /// <param name="candidate">EN: Candidate DTO. JA: candidate DTO です。</param>
    /// <param name="alpha">EN: Alpha multiplier. JA: alpha multiplier です。</param>
    public static DoomGpuHudRectDto FromCandidate(string kind, DoomOverlayCandidateDto candidate, float alpha)
        => new()
        {
            Kind = kind,
            Left = candidate.Left,
            Top = candidate.Top,
            Width = candidate.Width,
            Height = candidate.Height,
            Score = Clamp01(Math.Max(candidate.Score, Math.Max(candidate.RedScore, candidate.EdgeScore))),
            Alpha = Clamp01(alpha),
            Color = ColorForKind(kind)
        };

    /// <summary>
    /// EN: Creates a GPU rectangle from an overlay region.
    /// JA: overlay region から GPU rectangle を作成します。
    /// </summary>
    /// <param name="region">EN: Region DTO. JA: region DTO です。</param>
    public static DoomGpuHudRectDto FromRegion(DoomOverlayRegionDto region)
        => new()
        {
            Kind = region.Kind,
            Left = region.Left,
            Top = region.Top,
            Width = region.Width,
            Height = region.Height,
            Score = region.Active ? 1 : 0.45f,
            Alpha = region.Kind is "zoe" or "combat" ? 0.78f : 0.68f,
            Color = ColorForKind(region.Kind)
        };

    /// <summary>
    /// EN: Creates a GPU rectangle from an enemy circle marker.
    /// JA: enemy circle marker から GPU rectangle を作成します。
    /// </summary>
    /// <param name="circle">EN: Enemy circle DTO. JA: enemy circle DTO です。</param>
    public static DoomGpuHudRectDto FromEnemyCircle(DoomEnemyCircleDto circle)
        => new()
        {
            Kind = "enemy-circle",
            Left = circle.Left,
            Top = circle.Top,
            Width = circle.Width,
            Height = circle.Height,
            Score = Clamp01(circle.Confidence),
            Alpha = circle.Type == "audio" ? 0.58f : 0.76f,
            Color = ColorForEnemyCircle(circle)
        };

    /// <summary>
    /// EN: Maps a semantic HUD rectangle kind to a shader-ready RGB vector.
    /// JA: semantic HUD rectangle kind を shader-ready RGB vector に変換します。
    /// </summary>
    /// <param name="kind">EN: Rectangle kind. JA: rectangle kind です。</param>
    public static IReadOnlyList<float> ColorForKind(string kind)
    {
        kind ??= string.Empty;
        if (kind.Contains("enemy", StringComparison.OrdinalIgnoreCase)
            || kind.Contains("combat", StringComparison.OrdinalIgnoreCase)
            || kind.Contains("zoe", StringComparison.OrdinalIgnoreCase))
        {
            return [1.00f, 0.14f, 0.10f];
        }

        if (kind.Contains("door", StringComparison.OrdinalIgnoreCase))
        {
            return [1.00f, 0.76f, 0.16f];
        }

        if (kind.Contains("bridge", StringComparison.OrdinalIgnoreCase))
        {
            return [0.18f, 0.95f, 0.68f];
        }

        if (kind.Contains("corner", StringComparison.OrdinalIgnoreCase)
            || kind.Contains("wall", StringComparison.OrdinalIgnoreCase))
        {
            return [1.00f, 0.40f, 0.10f];
        }

        return [0.20f, 0.82f, 1.00f];
    }

    private static IReadOnlyList<float> ColorForEnemyCircle(DoomEnemyCircleDto circle)
        => circle.Type switch
        {
            "audio" => [1.00f, 0.62f, 0.12f],
            "av" => [1.00f, 0.34f, 0.08f],
            _ => [1.00f, 0.14f, 0.10f]
        };

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}

/// <summary>
/// EN: Structured enemy direction marker for HUD overlay rendering.
/// JA: HUD overlay rendering 用の構造化済み enemy direction marker です。
/// </summary>
public sealed record DoomEnemyCircleDto
{
    /// <summary>
    /// EN: Empty enemy marker.
    /// JA: 空の enemy marker です。
    /// </summary>
    public static DoomEnemyCircleDto Empty { get; } = new();

    /// <summary>
    /// EN: Marker type such as visual, audio, or av.
    /// JA: visual、audio、av などの marker type です。
    /// </summary>
    public string Type { get; init; } = "visual";

    /// <summary>
    /// EN: Marker source label used for diagnostics.
    /// JA: diagnostics に利用する marker source label です。
    /// </summary>
    public string Source { get; init; } = "visual";

    /// <summary>
    /// EN: Signed yaw in degrees where negative is left and positive is right.
    /// JA: 負が left、正が right を示す degree 単位の signed yaw です。
    /// </summary>
    public int Yaw { get; init; }

    /// <summary>
    /// EN: Direction label derived from yaw.
    /// JA: yaw から導出した direction label です。
    /// </summary>
    public string Direction { get; init; } = "front";

    /// <summary>
    /// EN: Normalized marker confidence.
    /// JA: 正規化済み marker confidence です。
    /// </summary>
    public float Confidence { get; init; }

    /// <summary>
    /// EN: Normalized visual confidence component.
    /// JA: 正規化済み visual confidence 成分です。
    /// </summary>
    public float VisualConfidence { get; init; }

    /// <summary>
    /// EN: Normalized auditory confidence component.
    /// JA: 正規化済み auditory confidence 成分です。
    /// </summary>
    public float AudioConfidence { get; init; }

    /// <summary>
    /// EN: Left position in percentage.
    /// JA: percentage の left position です。
    /// </summary>
    public float Left { get; init; }

    /// <summary>
    /// EN: Top position in percentage.
    /// JA: percentage の top position です。
    /// </summary>
    public float Top { get; init; }

    /// <summary>
    /// EN: Width in percentage.
    /// JA: percentage の width です。
    /// </summary>
    public float Width { get; init; }

    /// <summary>
    /// EN: Height in percentage.
    /// JA: percentage の height です。
    /// </summary>
    public float Height { get; init; }

    /// <summary>
    /// EN: Indicates whether the marker should be rendered.
    /// JA: marker を描画すべきかを示します。
    /// </summary>
    public bool Active { get; init; }

    /// <summary>
    /// EN: Creates an enemy marker from canonical pipeline state, preserving visual/audio source semantics for HUD rendering.
    /// JA: canonical pipeline state から enemy marker を作成し、HUD rendering 用の visual/audio source semantics を保持します。
    /// </summary>
    /// <param name="pipelineState">EN: Four-layer pipeline state. JA: 4-layer pipeline state です。</param>
    /// <param name="action">EN: Selected action command. JA: 選択済み action command です。</param>
    /// <param name="combatScore">EN: Normalized combat score. JA: 正規化済み combat score です。</param>
    public static DoomEnemyCircleDto From(PipelineStateDto pipelineState, ActionCommand action, float combatScore)
    {
        pipelineState ??= PipelineStateDto.Empty;
        var visualScore = Clamp01(Math.Max(
            Read(pipelineState.Noesis.PhainesisEvents, "enemyPresence"),
            Math.Max(Read(pipelineState.Noesis.NousVectors, "enemyVector"), Read(pipelineState.Aisthesis.SensorReadings, "visualEnemyConfidence"))));
        var audioScore = Clamp01(Math.Max(
            Read(pipelineState.Aisthesis.SensorReadings, "audioEnemyConfidence"),
            Math.Max(
                Read(pipelineState.Noesis.PhainesisEvents, "audioEnemyStrong"),
                Read(pipelineState.Noesis.PhainesisEvents, "audioEnemyConfidence"))));
        var visualActive = action.AttackKey
            || visualScore >= 0.35f
            || Read(pipelineState.Noesis.PhainesisEvents, "visualEnemyVisible") >= 0.5f;
        var audioActive = audioScore >= 0.24f;

        if (!visualActive && !audioActive && !action.AttackKey)
        {
            return Empty;
        }

        var type = visualActive && audioActive ? "av" : (visualActive ? "visual" : "audio");
        var confidence = Clamp01(Math.Max(Math.Max(visualScore, audioScore), Math.Max(combatScore, action.AttackKey ? 1f : 0f)));
        var yaw = action.TurnYaw != 0
            ? action.TurnYaw
            : DirectionYaw(pipelineState, audioActive);
        return From(type, yaw, confidence, visualScore, audioScore, action.AttackKey);
    }

    /// <summary>
    /// EN: Creates a visual enemy marker from bounded action context.
    /// JA: bounded action context から visual enemy marker を作成します。
    /// </summary>
    /// <param name="action">EN: Selected action command. JA: 選択済み action command です。</param>
    /// <param name="confidence">EN: Normalized enemy confidence. JA: 正規化済み enemy confidence です。</param>
    public static DoomEnemyCircleDto From(ActionCommand action, float confidence)
        => From("visual", action.TurnYaw, confidence, confidence, 0, action.AttackKey);

    private static DoomEnemyCircleDto From(
        string type,
        int yaw,
        float confidence,
        float visualConfidence,
        float audioConfidence,
        bool firing)
    {
        var yawClamped = Math.Clamp(yaw, -32, 32);
        var direction = yaw < -4 ? "left" : (yaw > 4 ? "right" : "front");
        var normalizedType = type is "audio" or "av" ? type : "visual";
        var isAudioOnly = normalizedType == "audio";
        return new DoomEnemyCircleDto
        {
            Type = normalizedType,
            Source = firing ? $"{normalizedType}-fire" : normalizedType,
            Yaw = yaw,
            Direction = direction,
            Confidence = Math.Clamp(float.IsFinite(confidence) ? confidence : 0, 0, 1),
            VisualConfidence = Math.Clamp(float.IsFinite(visualConfidence) ? visualConfidence : 0, 0, 1),
            AudioConfidence = Math.Clamp(float.IsFinite(audioConfidence) ? audioConfidence : 0, 0, 1),
            Left = isAudioOnly
                ? (direction == "left" ? 18 : (direction == "right" ? 66 : 41))
                : Math.Clamp(43 + (yawClamped / 32f) * 22f, 10, 78),
            Top = isAudioOnly ? 34 : 31,
            Width = normalizedType == "visual" ? 12 : (isAudioOnly ? 21 : 17),
            Height = normalizedType == "visual" ? 14 : (isAudioOnly ? 23 : 19),
            Active = confidence >= 0.24f || firing
        };
    }

    private static int DirectionYaw(PipelineStateDto pipelineState, bool audioActive)
    {
        if (!audioActive)
        {
            return 0;
        }

        if (Read(pipelineState.Aisthesis.SensorReadings, "audioEnemyLeft") >= 0.5f
            || Read(pipelineState.Noesis.PhainesisEvents, "audioEnemyLeft") >= 0.5f)
        {
            return -18;
        }

        if (Read(pipelineState.Aisthesis.SensorReadings, "audioEnemyRight") >= 0.5f
            || Read(pipelineState.Noesis.PhainesisEvents, "audioEnemyRight") >= 0.5f)
        {
            return 18;
        }

        return 0;
    }

    private static float Read(IReadOnlyDictionary<string, float> values, string key)
    {
        if (values.TryGetValue(key, out var value))
        {
            return Clamp01(value);
        }

        foreach (var item in values)
        {
            if (string.Equals(item.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                return Clamp01(item.Value);
            }
        }

        return 0;
    }

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}

/// <summary>
/// EN: Use-probe hint DTO for debug overlay arrows.
/// JA: debug overlay arrow 用の UseProbe hint DTO です。
/// </summary>
public sealed record DoomUseProbeHintDto
{
    /// <summary>
    /// EN: Empty use-probe hint.
    /// JA: 空の UseProbe hint です。
    /// </summary>
    public static DoomUseProbeHintDto Empty { get; } = new();

    /// <summary>
    /// EN: Indicates whether the use-probe hint is active.
    /// JA: UseProbe hint が active かどうかを示します。
    /// </summary>
    public bool Active { get; init; }

    /// <summary>
    /// EN: Probe direction such as left, right, or none.
    /// JA: left、right、none などの probe direction です。
    /// </summary>
    public string Direction { get; init; } = "none";

    /// <summary>
    /// EN: Number of frames represented by the probe hint.
    /// JA: probe hint が表す frame 数です。
    /// </summary>
    public int Frames { get; init; }

    /// <summary>
    /// EN: Normalized UseProbe confidence.
    /// JA: 正規化済み UseProbe confidence です。
    /// </summary>
    public float Confidence { get; init; }

    /// <summary>
    /// EN: Creates a use-probe hint from action and navigator state.
    /// JA: action と navigator state から UseProbe hint を作成します。
    /// </summary>
    /// <param name="action">EN: Selected action command. JA: 選択済み action command です。</param>
    /// <param name="navigator">EN: Landmark navigator result. JA: landmark navigator result です。</param>
    public static DoomUseProbeHintDto From(ActionCommand action, DoomLandmarkNavigatorResult navigator)
        => From(action, navigator, DoomRoutePlannerResult.Empty);

    /// <summary>
    /// EN: Creates a use-probe hint from action, navigator, and route-plan state.
    /// JA: action、navigator、route-plan state から UseProbe hint を作成します。
    /// </summary>
    /// <param name="action">EN: Selected action command. JA: 選択済み action command です。</param>
    /// <param name="navigator">EN: Landmark navigator result. JA: landmark navigator result です。</param>
    /// <param name="routePlan">EN: Route planner result. JA: route planner result です。</param>
    public static DoomUseProbeHintDto From(ActionCommand action, DoomLandmarkNavigatorResult navigator, DoomRoutePlannerResult routePlan)
    {
        navigator ??= DoomLandmarkNavigatorResult.Empty;
        routePlan ??= DoomRoutePlannerResult.Empty;
        var yaw = action.TurnYaw != 0 ? action.TurnYaw : (routePlan.RecommendedYaw != 0 ? routePlan.RecommendedYaw : navigator.RouteFallbackYaw);
        return new DoomUseProbeHintDto
        {
            Active = action.UseKey || yaw != 0,
            Direction = yaw > 0 ? "right" : (yaw < 0 ? "left" : "none"),
            Frames = action.UseKey ? 1 : 0,
            Confidence = routePlan.UseProbeConfidence
        };
    }
}
