namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Route-planner input packet containing Doom-local sensor evidence.
/// JA: Doom ローカルの sensor evidence を保持する route-planner input packet です。
/// </summary>
public sealed record DoomRoutePlannerInput
{
    /// <summary>
    /// EN: Normalized depth signature for the current view.
    /// JA: 現在視界の正規化済み depth signature です。
    /// </summary>
    public float DepthSig { get; init; } = 1;

    /// <summary>
    /// EN: Scenario-local context label such as open-space or wall.
    /// JA: open-space や wall などの scenario-local context label です。
    /// </summary>
    public string Context { get; init; } = "corridor";

    /// <summary>
    /// EN: Foot-lane obstacle score derived from the lower visual band.
    /// JA: 下部 visual band から導出された foot-lane obstacle score です。
    /// </summary>
    public float FootObstacleScore { get; init; }

    /// <summary>
    /// EN: Flicker score for foot-lane obstacle evidence.
    /// JA: foot-lane obstacle evidence の flicker score です。
    /// </summary>
    public float FootObstacleFlickerScore { get; init; }

    /// <summary>
    /// EN: Number of bounce frames observed in the foot lane.
    /// JA: foot lane で観測された bounce frame 数です。
    /// </summary>
    public int FootObstacleBounceFrames { get; init; }

    /// <summary>
    /// EN: Motion-obstacle score from movement and visual flow.
    /// JA: movement と visual flow から得た motion-obstacle score です。
    /// </summary>
    public float MotionObstacleScore { get; init; }

    /// <summary>
    /// EN: Estimated forward progress for the recent movement window.
    /// JA: 直近 movement window の推定 forward progress です。
    /// </summary>
    public float MotionForwardProgress { get; init; }

    /// <summary>
    /// EN: Corridor-gap score near spawn.
    /// JA: spawn 付近の corridor-gap score です。
    /// </summary>
    public float SpawnCorridorGapScore { get; init; }

    /// <summary>
    /// EN: Landmark-route evidence near spawn.
    /// JA: spawn 付近の landmark-route evidence です。
    /// </summary>
    public float SpawnLandmarkRouteEvidence { get; init; }

    /// <summary>
    /// EN: Bright rear secret-door evidence near spawn.
    /// JA: spawn 付近の明るい rear secret-door evidence です。
    /// </summary>
    public float SpawnSecretDoorScore { get; init; }

    /// <summary>
    /// EN: West-stair landmark score near spawn.
    /// JA: spawn 付近の west-stair landmark score です。
    /// </summary>
    public float SpawnWestStairScore { get; init; }

    /// <summary>
    /// EN: First-door bridge-side door evidence.
    /// JA: first-door bridge 側の door evidence です。
    /// </summary>
    public float BridgeDoorScore { get; init; }

    /// <summary>
    /// EN: Wall vector where positive means right-side wall pressure.
    /// JA: 正値が右側 wall pressure を示す wall vector です。
    /// </summary>
    public float WallVector { get; init; }

    /// <summary>
    /// EN: Signed opening vector where positive means the gap is on the right.
    /// JA: 正値が右側 gap を示す符号付き opening vector です。
    /// </summary>
    public float GapVector { get; init; }

    /// <summary>
    /// EN: Signed corridor vector where positive means the corridor route is on the right.
    /// JA: 正値が右側 corridor route を示す符号付き corridor vector です。
    /// </summary>
    public float CorridorVector { get; init; }

    /// <summary>
    /// EN: Signed wall-flow vector used only for relative yaw reacquisition.
    /// JA: 相対 yaw 再定位のみに使う符号付き wall-flow vector です。
    /// </summary>
    public float WallFlowVector { get; init; }

    /// <summary>
    /// EN: Use-probe feature score from near-door visual evidence.
    /// JA: door 近接 visual evidence から得た UseProbe feature score です。
    /// </summary>
    public float UseProbeScore { get; init; }

    /// <summary>
    /// EN: Use-probe alignment score where 1 means the probe is centered.
    /// JA: 1 が中央照準を示す UseProbe alignment score です。
    /// </summary>
    public float UseProbeAlignment { get; init; }
}

/// <summary>
/// EN: Route-planner result packet used by C# diagnostics and the JS drawing bridge.
/// JA: C# diagnostics と JS drawing bridge が利用する route-planner result packet です。
/// </summary>
public sealed record DoomRoutePlannerResult
{
    /// <summary>
    /// EN: Empty route-planner result.
    /// JA: 空の route-planner result です。
    /// </summary>
    public static DoomRoutePlannerResult Empty { get; } = new();

    /// <summary>
    /// EN: Indicates that foot-lane obstacle evidence is soft or ignorable.
    /// JA: foot-lane obstacle evidence が弱く無視可能であることを示します。
    /// </summary>
    public bool RouteFootSoftClear { get; init; } = true;

    /// <summary>
    /// EN: Indicates texture-wall occlusion on the route.
    /// JA: route 上の texture-wall occlusion を示します。
    /// </summary>
    public bool RouteTextureWallOcclusion { get; init; }

    /// <summary>
    /// EN: Indicates a foot-lane obstacle relevant to the route.
    /// JA: route に関係する foot-lane obstacle を示します。
    /// </summary>
    public bool RouteFootObstacle { get; init; }

    /// <summary>
    /// EN: Indicates that route progress should clear the foot lane before advancing.
    /// JA: route progress が前進前に foot lane を clear すべきことを示します。
    /// </summary>
    public bool RouteFootClearRequired { get; init; }

    /// <summary>
    /// EN: Indicates a close-depth route obstacle.
    /// JA: close-depth route obstacle を示します。
    /// </summary>
    public bool RouteDepthClose { get; init; }

    /// <summary>
    /// EN: Indicates any close route obstacle.
    /// JA: 任意の close route obstacle を示します。
    /// </summary>
    public bool RouteCloseObstacle { get; init; }

    /// <summary>
    /// EN: Indicates a wall obstacle that should affect route selection.
    /// JA: route selection に影響すべき wall obstacle を示します。
    /// </summary>
    public bool RouteWallObstacle { get; init; }

    /// <summary>
    /// EN: Indicates whether wall-obstacle priority is allowed for this frame.
    /// JA: この frame で wall-obstacle priority が許可されるかを示します。
    /// </summary>
    public bool RouteWallObstaclePriorityAllowed { get; init; } = true;

    /// <summary>
    /// EN: Indicates that open-space low-gap scanning should run.
    /// JA: open-space low-gap scan を実行すべきことを示します。
    /// </summary>
    public bool RouteOpenSpaceLowGapScan { get; init; }

    /// <summary>
    /// EN: Indicates that open-space low-gap escape should run.
    /// JA: open-space low-gap escape を実行すべきことを示します。
    /// </summary>
    public bool RouteOpenSpaceLowGapEscape { get; init; }

    /// <summary>
    /// EN: First-door route evidence combined from bridge-door and gap scores.
    /// JA: bridge-door と gap score から合成した first-door route evidence です。
    /// </summary>
    public float FirstDoorRouteEvidence { get; init; }

    /// <summary>
    /// EN: Indicates that first-door route evidence is strong enough to advance.
    /// JA: first-door route evidence が前進に十分であることを示します。
    /// </summary>
    public bool FirstDoorRouteEvidenceReady { get; init; }

    /// <summary>
    /// EN: Indicates that east-window recovery has enough route evidence.
    /// JA: east-window recovery に十分な route evidence があることを示します。
    /// </summary>
    public bool EastWindowRouteEvidenceReady { get; init; } = true;

    /// <summary>
    /// EN: Indicates that open-space foot evidence was classified as noise.
    /// JA: open-space foot evidence が noise と分類されたことを示します。
    /// </summary>
    public bool OpenSpaceFootNoise { get; init; }

    /// <summary>
    /// EN: Stable route name selected by structural route planning.
    /// JA: structural route planning が選択した安定 route 名です。
    /// </summary>
    public string CurrentRoute { get; init; } = "open-space-cruise";

    /// <summary>
    /// EN: Stable landmark name used to explain route anchoring.
    /// JA: route anchoring を説明する安定 landmark 名です。
    /// </summary>
    public string CurrentLandmark { get; init; } = "none";

    /// <summary>
    /// EN: Route-level action hint that does not directly emit input.
    /// JA: 直接 input を出力しない route-level action hint です。
    /// </summary>
    public string RouteActionHint { get; init; } = "cruise";

    /// <summary>
    /// EN: Normalized confidence for the selected route.
    /// JA: 選択 route の正規化済み confidence です。
    /// </summary>
    public float RouteConfidence { get; init; }

    /// <summary>
    /// EN: Signed yaw reacquisition hint derived from structural vectors.
    /// JA: structural vector から導出した符号付き yaw 再定位 hint です。
    /// </summary>
    public int RecommendedYaw { get; init; }

    /// <summary>
    /// EN: Normalized confidence for a near-door UseProbe.
    /// JA: door 近接 UseProbe の正規化済み confidence です。
    /// </summary>
    public float UseProbeConfidence { get; init; }
}

/// <summary>
/// EN: Doom-local route planner that mirrors the sensor-derived route flags outside JS.
/// JA: JS 外で sensor 由来 route flag を再現する Doom ローカル route planner です。
/// </summary>
public sealed class DoomRoutePlanner
{
    /// <summary>
    /// EN: Evaluates route flags from sensor evidence without emitting actions.
    /// JA: action を出力せず、sensor evidence から route flag を評価します。
    /// </summary>
    /// <param name="input">EN: Route-planner input evidence. JA: route-planner input evidence です。</param>
    public DoomRoutePlannerResult Evaluate(DoomRoutePlannerInput input)
    {
        ArgumentNullException.ThrowIfNull(input);

        var depth = Clamp(input.DepthSig, 0, 1.5f);
        var context = NormalizeContext(input.Context);
        var foot = Clamp01(input.FootObstacleScore);
        var flicker = Clamp01(input.FootObstacleFlickerScore);
        var bounce = Math.Max(0, input.FootObstacleBounceFrames);
        var motionObstacle = Clamp01(input.MotionObstacleScore);
        var motionProgress = Clamp01(input.MotionForwardProgress);
        var gap = Clamp01(input.SpawnCorridorGapScore);
        var landmark = Clamp01(input.SpawnLandmarkRouteEvidence);
        var secret = Clamp01(input.SpawnSecretDoorScore);
        var westStair = Clamp01(input.SpawnWestStairScore);
        var bridgeDoor = Clamp01(input.BridgeDoorScore);
        var wall = Clamp(input.WallVector, -1, 1);
        var gapVector = Clamp(input.GapVector, -1, 1);
        var corridorVector = Clamp(input.CorridorVector, -1, 1);
        var wallFlowVector = Clamp(input.WallFlowVector, -1, 1);
        var useProbeScore = Clamp01(input.UseProbeScore);
        var useProbeAlignment = Clamp01(input.UseProbeAlignment);

        var openSpaceFootNoise = context == "open-space"
            && depth >= 0.85f
            && flicker < 0.18f
            && bounce < 2
            && motionProgress > 0.08f;
        var routeFootConfirmed = flicker >= 0.18f || bounce >= 2;
        var routeFootOcclusionAllowed = context == "wall" || depth < 0.72f || routeFootConfirmed;
        var routeFootSoftClear = foot < 0.55f || openSpaceFootNoise;
        var routeHighFootOcclusion = foot >= 0.55f
            && motionObstacle >= 0.55f
            && gap < 0.46f
            && landmark >= 0.28f
            && routeFootOcclusionAllowed
            && !openSpaceFootNoise;
        var routeTextureWallOcclusion = foot >= 0.55f
            && motionObstacle >= 0.55f
            && motionProgress >= 0.45f
            && gap < 0.42f
            && landmark >= 0.28f
            && routeFootOcclusionAllowed
            && !openSpaceFootNoise;
        var routeFootDepthBlocked = depth < 0.50f || (context == "wall" && depth < 0.72f);
        var routeFootObstacle = foot >= 0.08f
            && (routeFootDepthBlocked || routeFootConfirmed || routeTextureWallOcclusion || routeHighFootOcclusion);
        var routeFootClearRequired = routeFootObstacle
            && (depth < 0.72f || context == "wall" || flicker >= 0.18f || bounce >= 2);
        var routeDepthClose = depth > 0.04f
            && depth < 0.50f
            && (context == "wall" || Math.Abs(wall) >= 0.35f || foot >= 0.04f);
        var routeCloseObstacle = routeFootObstacle || routeDepthClose;
        var routeWallObstacle = motionObstacle >= 0.32f
            && routeCloseObstacle
            && (routeFootObstacle || depth > 0.04f);
        var routeWallObstaclePriorityAllowed = landmark < 0.40f || gap >= 0.30f || motionProgress < 0.08f;
        var routeOpenSpaceLowGapScan = context == "open-space"
            && depth >= 0.72f
            && gap < 0.20f
            && foot >= 0.55f
            && motionObstacle >= 0.50f
            && secret < 0.62f
            && westStair < 0.30f
            && landmark >= 0.20f;
        var routeOpenSpaceLowGapEscape = routeOpenSpaceLowGapScan
            && routeFootClearRequired;
        var firstDoorRouteEvidence = Math.Max(bridgeDoor, gap);
        var firstDoorRouteEvidenceReady = bridgeDoor >= 0.18f || gap >= 0.30f;
        var eastWindowRouteEvidenceReady = secret < 0.42f || gap >= 0.30f;
        var routeConfidence = Clamp01(Math.Max(
            Math.Max(firstDoorRouteEvidence, landmark),
            Math.Max(Math.Max(secret * 0.8f, westStair), Math.Max(Math.Abs(gapVector) * 0.55f, Math.Max(Math.Abs(corridorVector) * 0.45f, Math.Abs(wallFlowVector) * 0.20f)))));
        var recommendedYaw = SelectRecommendedYaw(
            gapVector,
            corridorVector,
            wallFlowVector,
            wall,
            routeWallObstacle,
            firstDoorRouteEvidenceReady);
        var useProbeConfidence = useProbeScore < 0.05f
            ? 0
            : Clamp01(useProbeScore * 0.70f + useProbeAlignment * 0.30f);
        var currentRoute = ChooseRoute(
            routeOpenSpaceLowGapEscape,
            routeOpenSpaceLowGapScan,
            routeWallObstacle,
            routeWallObstaclePriorityAllowed,
            firstDoorRouteEvidenceReady,
            gap,
            landmark,
            secret,
            westStair);
        var currentLandmark = ChooseLandmark(
            firstDoorRouteEvidenceReady,
            routeWallObstacle,
            gap,
            landmark,
            secret,
            westStair);
        var routeActionHint = ChooseAction(routeFootClearRequired, routeOpenSpaceLowGapEscape, routeWallObstacle, firstDoorRouteEvidenceReady);

        return new DoomRoutePlannerResult
        {
            RouteFootSoftClear = routeFootSoftClear,
            RouteTextureWallOcclusion = routeTextureWallOcclusion,
            RouteFootObstacle = routeFootObstacle,
            RouteFootClearRequired = routeFootClearRequired,
            RouteDepthClose = routeDepthClose,
            RouteCloseObstacle = routeCloseObstacle,
            RouteWallObstacle = routeWallObstacle,
            RouteWallObstaclePriorityAllowed = routeWallObstaclePriorityAllowed,
            RouteOpenSpaceLowGapScan = routeOpenSpaceLowGapScan,
            RouteOpenSpaceLowGapEscape = routeOpenSpaceLowGapEscape,
            FirstDoorRouteEvidence = firstDoorRouteEvidence,
            FirstDoorRouteEvidenceReady = firstDoorRouteEvidenceReady,
            EastWindowRouteEvidenceReady = eastWindowRouteEvidenceReady,
            OpenSpaceFootNoise = openSpaceFootNoise,
            CurrentRoute = currentRoute,
            CurrentLandmark = currentLandmark,
            RouteActionHint = routeActionHint,
            RouteConfidence = routeConfidence,
            RecommendedYaw = recommendedYaw,
            UseProbeConfidence = useProbeConfidence
        };
    }

    private static string ChooseRoute(
        bool routeOpenSpaceLowGapEscape,
        bool routeOpenSpaceLowGapScan,
        bool routeWallObstacle,
        bool routeWallObstaclePriorityAllowed,
        bool firstDoorRouteEvidenceReady,
        float gap,
        float landmark,
        float secret,
        float westStair)
    {
        if (routeOpenSpaceLowGapEscape)
        {
            return "open-space-low-gap-escape";
        }

        if (routeOpenSpaceLowGapScan)
        {
            return "open-space-low-gap-scan";
        }

        if (routeWallObstacle && !routeWallObstaclePriorityAllowed)
        {
            return "wall-follow-fallback";
        }

        if (firstDoorRouteEvidenceReady)
        {
            return "first-door-route";
        }

        if (secret >= 0.42f && gap < 0.30f)
        {
            return "spawn-secret-route-reset";
        }

        if (westStair >= 0.30f)
        {
            return "spawn-west-stair-route-recover";
        }

        return landmark >= 0.28f ? "spawn-landmark-route" : "open-space-cruise";
    }

    private static string ChooseLandmark(
        bool firstDoorRouteEvidenceReady,
        bool routeWallObstacle,
        float gap,
        float landmark,
        float secret,
        float westStair)
    {
        if (firstDoorRouteEvidenceReady)
        {
            return "first-door-route-evidence";
        }

        if (secret >= 0.42f && gap < 0.30f)
        {
            return "rear-secret-reset";
        }

        if (westStair >= 0.30f)
        {
            return "west-stair-anchor";
        }

        if (landmark >= 0.28f)
        {
            return "landmark-route";
        }

        if (gap >= 0.20f)
        {
            return "spawn-corridor-gap";
        }

        return routeWallObstacle ? "wall-pressure" : "none";
    }

    private static string ChooseAction(
        bool routeFootClearRequired,
        bool routeOpenSpaceLowGapEscape,
        bool routeWallObstacle,
        bool firstDoorRouteEvidenceReady)
    {
        if (routeFootClearRequired)
        {
            return "clear-foot";
        }

        if (routeOpenSpaceLowGapEscape)
        {
            return "escape-low-gap";
        }

        if (routeWallObstacle)
        {
            return "wall-follow";
        }

        return firstDoorRouteEvidenceReady ? "advance-first-door" : "cruise";
    }

    private static int SelectRecommendedYaw(
        float gapVector,
        float corridorVector,
        float wallFlowVector,
        float wallVector,
        bool routeWallObstacle,
        bool firstDoorRouteEvidenceReady)
    {
        var yaw = 0;
        var gapStrength = Math.Abs(gapVector);
        var corridorStrength = Math.Abs(corridorVector);
        if (corridorStrength >= 0.05f && corridorStrength > gapStrength + 0.04f)
        {
            yaw = (int)MathF.Round(corridorVector * 14);
        }
        else if (gapStrength >= 0.05f)
        {
            yaw = (int)MathF.Round(gapVector * 18);
        }
        else if (corridorStrength >= 0.05f)
        {
            yaw = (int)MathF.Round(corridorVector * 14);
        }
        else if (!firstDoorRouteEvidenceReady && Math.Abs(wallFlowVector) >= 0.05f)
        {
            yaw = (int)MathF.Round(-wallFlowVector * 8);
        }
        else if (routeWallObstacle)
        {
            yaw = wallVector > 0 ? -6 : 6;
        }

        return Math.Clamp(yaw, -28, 28);
    }

    private static string NormalizeContext(string value)
        => string.IsNullOrWhiteSpace(value)
            ? "corridor"
            : value.Trim().ToLowerInvariant();

    private static float Clamp01(float value)
        => Clamp(value, 0, 1);

    private static float Clamp(float value, float min, float max)
        => Math.Clamp(float.IsFinite(value) ? value : min, min, max);
}

/// <summary>
/// EN: Input packet for landmark-based route yaw selection.
/// JA: landmark-based route yaw selection 用の input packet です。
/// </summary>
public sealed record DoomLandmarkNavigatorInput
{
    /// <summary>
    /// EN: Route-planner result used as gating evidence.
    /// JA: gating evidence として使う route-planner result です。
    /// </summary>
    public DoomRoutePlannerResult RoutePlan { get; init; } = DoomRoutePlannerResult.Empty;

    /// <summary>
    /// EN: Corridor-gap turn direction.
    /// JA: corridor-gap turn direction です。
    /// </summary>
    public string SpawnCorridorGapTurn { get; init; } = "none";

    /// <summary>
    /// EN: Landmark-route turn direction.
    /// JA: landmark-route turn direction です。
    /// </summary>
    public string SpawnLandmarkRouteTurn { get; init; } = "none";

    /// <summary>
    /// EN: Wall pressure vector where positive means pressure on the right.
    /// JA: 正値が右側 pressure を示す wall pressure vector です。
    /// </summary>
    public float WallVector { get; init; }

    /// <summary>
    /// EN: Yaw degrees used for corridor-gap steering.
    /// JA: corridor-gap steering に使う yaw degree です。
    /// </summary>
    public int SpawnGapYawDegrees { get; init; } = 12;

    /// <summary>
    /// EN: Yaw degrees used to steer away from a wall.
    /// JA: wall から離れるために使う yaw degree です。
    /// </summary>
    public int WallAwayYawDegrees { get; init; } = 6;
}

/// <summary>
/// EN: Landmark navigator output packet.
/// JA: landmark navigator output packet です。
/// </summary>
public sealed record DoomLandmarkNavigatorResult
{
    /// <summary>
    /// EN: Empty landmark navigator result.
    /// JA: 空の landmark navigator result です。
    /// </summary>
    public static DoomLandmarkNavigatorResult Empty { get; } = new();

    /// <summary>
    /// EN: Route fallback yaw selected from landmark, gap, or wall evidence.
    /// JA: landmark / gap / wall evidence から選択された route fallback yaw です。
    /// </summary>
    public int RouteFallbackYaw { get; init; }

    /// <summary>
    /// EN: Yaw derived from corridor-gap evidence.
    /// JA: corridor-gap evidence から導出された yaw です。
    /// </summary>
    public int SpawnCorridorGapYaw { get; init; }

    /// <summary>
    /// EN: Yaw derived from landmark-route evidence.
    /// JA: landmark-route evidence から導出された yaw です。
    /// </summary>
    public int LandmarkRouteYaw { get; init; }

    /// <summary>
    /// EN: Yaw used to move away from wall pressure.
    /// JA: wall pressure から離れるために使う yaw です。
    /// </summary>
    public int WallAwayYaw { get; init; }

    /// <summary>
    /// EN: Signed yaw reacquisition hint selected by route planning.
    /// JA: route planning が選択した符号付き yaw 再定位 hint です。
    /// </summary>
    public int RecommendedYaw { get; init; }
}

/// <summary>
/// EN: Doom-local landmark navigator that translates route evidence into steering hints.
/// JA: route evidence を steering hint に変換する Doom ローカル landmark navigator です。
/// </summary>
public sealed class DoomLandmarkNavigator
{
    /// <summary>
    /// EN: Evaluates route steering hints without selecting final movement.
    /// JA: final movement を選択せずに route steering hint を評価します。
    /// </summary>
    /// <param name="input">EN: Landmark navigator input. JA: landmark navigator input です。</param>
    public DoomLandmarkNavigatorResult Evaluate(DoomLandmarkNavigatorInput input)
    {
        ArgumentNullException.ThrowIfNull(input);

        var routePlan = input.RoutePlan ?? DoomRoutePlannerResult.Empty;
        var spawnGapYaw = routePlan.FirstDoorRouteEvidenceReady
            || string.Equals(routePlan.CurrentLandmark, "spawn-corridor-gap", StringComparison.OrdinalIgnoreCase)
            ? TurnYaw(input.SpawnCorridorGapTurn, input.SpawnGapYawDegrees)
            : 0;
        var landmarkYaw = routePlan.FirstDoorRouteEvidence >= 0.28f
            || string.Equals(routePlan.CurrentLandmark, "landmark-route", StringComparison.OrdinalIgnoreCase)
            ? TurnYaw(input.SpawnLandmarkRouteTurn, input.SpawnGapYawDegrees)
            : 0;
        var wallAway = input.WallVector > 0
            ? -Math.Abs(input.WallAwayYawDegrees)
            : Math.Abs(input.WallAwayYawDegrees);

        return new DoomLandmarkNavigatorResult
        {
            RouteFallbackYaw = landmarkYaw != 0 ? landmarkYaw : (spawnGapYaw != 0 ? spawnGapYaw : wallAway),
            SpawnCorridorGapYaw = spawnGapYaw,
            LandmarkRouteYaw = landmarkYaw,
            WallAwayYaw = wallAway,
            RecommendedYaw = routePlan.RecommendedYaw != 0 ? routePlan.RecommendedYaw : (landmarkYaw != 0 ? landmarkYaw : (spawnGapYaw != 0 ? spawnGapYaw : wallAway))
        };
    }

    private static int TurnYaw(string turn, int degrees)
        => string.Equals(turn, "right", StringComparison.OrdinalIgnoreCase)
            ? Math.Abs(degrees)
            : (string.Equals(turn, "left", StringComparison.OrdinalIgnoreCase) ? -Math.Abs(degrees) : 0);
}
