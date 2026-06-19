namespace AIKernel.Doom.Provider.Autoplay;

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
    /// EN: Overlay frame primitives with percentage coordinates.
    /// JA: percentage coordinate を持つ overlay frame primitive です。
    /// </summary>
    public IReadOnlyList<DoomOverlayRegionDto> Regions { get; init; } = [];

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

        return new DoomDebugOverlayDto
        {
            Grid = grid,
            Regions = regions,
            UseProbe = DoomUseProbeHintDto.From(action, navigator, routePlan),
            KairosBlink = !string.IsNullOrWhiteSpace(goal.KairosSignal),
            KairosLabel = goal.KairosSignal
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

    private static float Read(IReadOnlyDictionary<string, float> values, string key)
        => values.TryGetValue(key, out var value) ? Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1) : 0;
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
