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
    /// EN: First-door 9x9 visual evidence from the quantized vision grid.
    /// JA: 量子化 vision grid から得た first-door 9x9 visual evidence です。
    /// </summary>
    public float FirstDoorVisionScore { get; init; }

    /// <summary>
    /// EN: Red-panel evidence for the first-door 9x9 visual detector.
    /// JA: first-door 9x9 visual detector の red-panel evidence です。
    /// </summary>
    public float FirstDoorVisionRedScore { get; init; }

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
    /// EN: Indicates that the route is scraping the barrel-side wall lane and should step inward before advancing.
    /// JA: route が barrel 側の wall lane を擦っており、前進前に内側へ戻すべきことを示します。
    /// </summary>
    public bool RouteBarrelLaneRisk { get; init; }

    /// <summary>
    /// EN: Indicates that the barrel-side lane has collapsed into a low-gap detour and should back off before reacquiring.
    /// JA: barrel 側 lane が low-gap detour に崩れており、再定位前に backoff すべきことを示します。
    /// </summary>
    public bool RouteBarrelLaneDetourRequired { get; init; }

    /// <summary>
    /// EN: Normalized distance from wall pressure where 0 means wall-adjacent and 1 means open center.
    /// JA: 0 が wall-adjacent、1 が open center を示す wall pressure からの正規化距離です。
    /// </summary>
    public float RouteTopologyWallDistanceNormalized { get; init; } = 1;

    /// <summary>
    /// EN: Evidence that the route is trapped in a barrel-side lane.
    /// JA: route が barrel-side lane に捕まっている evidence です。
    /// </summary>
    public float RouteTopologyBarrelZoneEvidence { get; init; }

    /// <summary>
    /// EN: Dot-product alignment between centerline pull and corridor direction.
    /// JA: centerline pull と corridor direction の dot-product alignment です。
    /// </summary>
    public float RouteTopologyCenterCorridorAlignment { get; init; }

    /// <summary>
    /// EN: Indicates a phase-level dead-end risk derived from topology without directly emitting an action.
    /// JA: action を直接出力せず topology から導出した phase-level dead-end risk を示します。
    /// </summary>
    public bool RouteDeadEndRisk { get; init; }

    /// <summary>
    /// EN: Indicates that dead-end topology should prefer an inward barrel-lane trim before continuing structural advance.
    /// JA: dead-end topology では structural advance 継続前に内側への barrel-lane trim を優先すべきことを示します。
    /// </summary>
    public bool RouteDeadEndTrimRequired { get; init; }

    /// <summary>
    /// EN: Confidence that the current door-approach corridor/bridge evidence should be held for a few frames.
    /// JA: 現在の door-approach corridor/bridge evidence を数 frame 保持すべき confidence です。
    /// </summary>
    public float RouteCorridorBridgeEvidence { get; init; }

    /// <summary>
    /// EN: Indicates a raw corridor/bridge lock signal before temporal sticky handling.
    /// JA: temporal sticky 処理前の corridor/bridge lock 生信号を示します。
    /// </summary>
    public bool RouteCorridorBridgeLock { get; init; }

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

    /// <summary>
    /// EN: Current route mode used by phase-scoped diagnostics.
    /// JA: phase-scoped diagnostics が利用する現在の route mode です。
    /// </summary>
    public string RouteMode { get; init; } = "spawn-approach";

    /// <summary>
    /// EN: Route loop kind that consumed the current phase budget.
    /// JA: 現在 phase budget を消費した route loop kind です。
    /// </summary>
    public string RouteLoopKind { get; init; } = "none";

    /// <summary>
    /// EN: Route abort hint emitted when a phase-local loop budget is exhausted.
    /// JA: phase-local loop budget が枯渇したときに発行される route abort hint です。
    /// </summary>
    public string RouteAbortHint { get; init; } = "none";

    /// <summary>
    /// EN: Indicates whether any route loop budget was exhausted.
    /// JA: いずれかの route loop budget が枯渇したかを示します。
    /// </summary>
    public bool RouteLoopBudgetExceeded { get; init; }

    /// <summary>
    /// EN: Spent pivot-loop frames and the current pivot budget.
    /// JA: 消費済み pivot-loop frame 数と現在の pivot budget です。
    /// </summary>
    public int RoutePivotUsed { get; init; }

    /// <summary>
    /// EN: Current pivot-loop budget.
    /// JA: 現在の pivot-loop budget です。
    /// </summary>
    public int RoutePivotBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether the pivot-loop budget was exhausted.
    /// JA: pivot-loop budget が枯渇したかを示します。
    /// </summary>
    public bool RoutePivotExceeded { get; init; }

    /// <summary>
    /// EN: Spent slide-loop frames.
    /// JA: 消費済み slide-loop frame 数です。
    /// </summary>
    public int RouteSlideUsed { get; init; }

    /// <summary>
    /// EN: Current slide-loop budget.
    /// JA: 現在の slide-loop budget です。
    /// </summary>
    public int RouteSlideBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether the slide-loop budget was exhausted.
    /// JA: slide-loop budget が枯渇したかを示します。
    /// </summary>
    public bool RouteSlideExceeded { get; init; }

    /// <summary>
    /// EN: Spent backoff-loop frames.
    /// JA: 消費済み backoff-loop frame 数です。
    /// </summary>
    public int RouteBackoffUsed { get; init; }

    /// <summary>
    /// EN: Current backoff-loop budget.
    /// JA: 現在の backoff-loop budget です。
    /// </summary>
    public int RouteBackoffBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether the backoff-loop budget was exhausted.
    /// JA: backoff-loop budget が枯渇したかを示します。
    /// </summary>
    public bool RouteBackoffExceeded { get; init; }

    /// <summary>
    /// EN: Spent structural-advance frames.
    /// JA: 消費済み structural-advance frame 数です。
    /// </summary>
    public int RouteAdvanceUsed { get; init; }

    /// <summary>
    /// EN: Current structural-advance budget.
    /// JA: 現在の structural-advance budget です。
    /// </summary>
    public int RouteAdvanceBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether the structural-advance budget was exhausted.
    /// JA: structural-advance budget が枯渇したかを示します。
    /// </summary>
    public bool RouteAdvanceExceeded { get; init; }

    /// <summary>
    /// EN: Spent weak-ingress loop frames.
    /// JA: 消費済み weak-ingress loop frame 数です。
    /// </summary>
    public int RouteIngressUsed { get; init; }

    /// <summary>
    /// EN: Current weak-ingress loop budget.
    /// JA: 現在の weak-ingress loop budget です。
    /// </summary>
    public int RouteIngressBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether the weak-ingress loop budget was exhausted.
    /// JA: weak-ingress loop budget が枯渇したかを示します。
    /// </summary>
    public bool RouteIngressExceeded { get; init; }

    /// <summary>
    /// EN: Spent structural-advance frames.
    /// JA: 消費済み structural-advance frame 数です。
    /// </summary>
    public int RouteRecoverUsed { get; init; }

    /// <summary>
    /// EN: Current route-recovery budget.
    /// JA: 現在の route-recovery budget です。
    /// </summary>
    public int RouteRecoverBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether the route-recovery budget was exhausted.
    /// JA: route-recovery budget が枯渇したかを示します。
    /// </summary>
    public bool RouteRecoverExceeded { get; init; }
}

/// <summary>
/// EN: Phase-local route loop budget input.
/// JA: phase-local route loop budget の input です。
/// </summary>
public sealed record DoomRouteLoopBudgetInput
{
    /// <summary>
    /// EN: Current route mode such as spawn-approach, door-approach, or post-door.
    /// JA: spawn-approach、door-approach、post-door などの現在 route mode です。
    /// </summary>
    public string RouteMode { get; init; } = "spawn-approach";

    /// <summary>
    /// EN: Number of repeated bounded action frames.
    /// JA: bounded action が反復した frame 数です。
    /// </summary>
    public int ActionRepeatFrames { get; init; }

    /// <summary>
    /// EN: Number of repeated movement frames.
    /// JA: movement が反復した frame 数です。
    /// </summary>
    public int MoveRepeatFrames { get; init; }

    /// <summary>
    /// EN: Number of repeated turn-only frames.
    /// JA: turn-only が反復した frame 数です。
    /// </summary>
    public int TurnRepeatFrames { get; init; }

    /// <summary>
    /// EN: Estimated forward progress for the recent route window.
    /// JA: 直近 route window の推定 forward progress です。
    /// </summary>
    public float MotionForwardProgress { get; init; }

    /// <summary>
    /// EN: Motion-obstacle score from movement and visual flow.
    /// JA: movement と visual flow から得た motion-obstacle score です。
    /// </summary>
    public float MotionObstacleScore { get; init; }

    /// <summary>
    /// EN: Foot-lane obstacle score.
    /// JA: foot-lane obstacle score です。
    /// </summary>
    public float FootObstacleScore { get; init; }

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
    /// EN: Autoplay prediction frame counter.
    /// JA: autoplay prediction frame counter です。
    /// </summary>
    public int Predictions { get; init; }

    /// <summary>
    /// EN: First-door 9x9 visual score.
    /// JA: first-door 9x9 visual score です。
    /// </summary>
    public float FirstDoorVisionScore { get; init; }

    /// <summary>
    /// EN: First-door UseProbe score.
    /// JA: first-door UseProbe score です。
    /// </summary>
    public float UseProbeScore { get; init; }

    /// <summary>
    /// EN: Topology-derived dead-end risk for the current route.
    /// JA: 現在 route の topology-derived dead-end risk です。
    /// </summary>
    public bool RouteDeadEndRisk { get; init; }

    /// <summary>
    /// EN: Indicates that east-window recovery has an anchor.
    /// JA: east-window recovery に anchor があることを示します。
    /// </summary>
    public bool EastWindowRecoverAnchor { get; init; }

    /// <summary>
    /// EN: Indicates that east-window recovery has enough route evidence.
    /// JA: east-window recovery に十分な route evidence があることを示します。
    /// </summary>
    public bool EastWindowRouteEvidenceReady { get; init; }
}

/// <summary>
/// EN: Phase-local route loop budget result.
/// JA: phase-local route loop budget の result です。
/// </summary>
public sealed record DoomRouteLoopBudgetResult
{
    /// <summary>
    /// EN: Empty route loop budget result.
    /// JA: 空の route loop budget result です。
    /// </summary>
    public static DoomRouteLoopBudgetResult Empty { get; } = new();

    /// <summary>
    /// EN: Current route mode.
    /// JA: 現在 route mode です。
    /// </summary>
    public string RouteMode { get; init; } = "spawn-approach";

    /// <summary>
    /// EN: Route loop kind that exhausted its budget.
    /// JA: budget を枯渇させた route loop kind です。
    /// </summary>
    public string LoopKind { get; init; } = "none";

    /// <summary>
    /// EN: Route abort hint emitted to Kairos and HUD.
    /// JA: Kairos と HUD に渡す route abort hint です。
    /// </summary>
    public string RouteAbortHint { get; init; } = "none";

    /// <summary>
    /// EN: Indicates whether any route budget was exhausted.
    /// JA: いずれかの route budget が枯渇したかを示します。
    /// </summary>
    public bool Exceeded { get; init; }

    /// <summary>
    /// EN: Spent pivot-loop frames and budget.
    /// JA: 消費済み pivot-loop frame 数と budget です。
    /// </summary>
    public int PivotUsed { get; init; }

    /// <summary>
    /// EN: Current pivot-loop budget.
    /// JA: 現在の pivot-loop budget です。
    /// </summary>
    public int PivotBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether pivot-loop budget was exhausted.
    /// JA: pivot-loop budget が枯渇したかを示します。
    /// </summary>
    public bool PivotExceeded { get; init; }

    /// <summary>
    /// EN: Spent slide-loop frames and budget.
    /// JA: 消費済み slide-loop frame 数と budget です。
    /// </summary>
    public int SlideUsed { get; init; }

    /// <summary>
    /// EN: Current slide-loop budget.
    /// JA: 現在の slide-loop budget です。
    /// </summary>
    public int SlideBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether slide-loop budget was exhausted.
    /// JA: slide-loop budget が枯渇したかを示します。
    /// </summary>
    public bool SlideExceeded { get; init; }

    /// <summary>
    /// EN: Spent backoff-loop frames.
    /// JA: 消費済み backoff-loop frame 数です。
    /// </summary>
    public int BackoffUsed { get; init; }

    /// <summary>
    /// EN: Current backoff-loop budget.
    /// JA: 現在の backoff-loop budget です。
    /// </summary>
    public int BackoffBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether backoff-loop budget was exhausted.
    /// JA: backoff-loop budget が枯渇したかを示します。
    /// </summary>
    public bool BackoffExceeded { get; init; }

    /// <summary>
    /// EN: Spent route-recovery frames.
    /// JA: 消費済み route-recovery frame 数です。
    /// </summary>
    public int AdvanceUsed { get; init; }

    /// <summary>
    /// EN: Current structural-advance budget.
    /// JA: 現在の structural-advance budget です。
    /// </summary>
    public int AdvanceBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether structural-advance budget was exhausted.
    /// JA: structural-advance budget が枯渇したかを示します。
    /// </summary>
    public bool AdvanceExceeded { get; init; }

    /// <summary>
    /// EN: Spent weak-ingress loop frames.
    /// JA: 消費済み weak-ingress loop frame 数です。
    /// </summary>
    public int IngressUsed { get; init; }

    /// <summary>
    /// EN: Current weak-ingress loop budget.
    /// JA: 現在の weak-ingress loop budget です。
    /// </summary>
    public int IngressBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether weak-ingress loop budget was exhausted.
    /// JA: weak-ingress loop budget が枯渇したかを示します。
    /// </summary>
    public bool IngressExceeded { get; init; }

    /// <summary>
    /// EN: Spent route-recovery frames.
    /// JA: 消費済み route-recovery frame 数です。
    /// </summary>
    public int RecoverUsed { get; init; }

    /// <summary>
    /// EN: Current route-recovery budget.
    /// JA: 現在の route-recovery budget です。
    /// </summary>
    public int RecoverBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether route-recovery budget was exhausted.
    /// JA: route-recovery budget が枯渇したかを示します。
    /// </summary>
    public bool RecoverExceeded { get; init; }

    /// <summary>
    /// EN: Spent topology dead-end frames.
    /// JA: 消費済み topology dead-end frame 数です。
    /// </summary>
    public int TopologyUsed { get; init; }

    /// <summary>
    /// EN: Current topology dead-end budget.
    /// JA: 現在の topology dead-end budget です。
    /// </summary>
    public int TopologyBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether topology dead-end budget was exhausted.
    /// JA: topology dead-end budget が枯渇したかを示します。
    /// </summary>
    public bool TopologyExceeded { get; init; }

    /// <summary>
    /// EN: Spent deterministic spawn-route arc frames.
    /// JA: 消費済み deterministic spawn-route arc frame 数です。
    /// </summary>
    public int ArcUsed { get; init; }

    /// <summary>
    /// EN: Current deterministic spawn-route arc budget.
    /// JA: 現在の deterministic spawn-route arc budget です。
    /// </summary>
    public int ArcBudget { get; init; }

    /// <summary>
    /// EN: Indicates whether deterministic spawn-route arc budget was exhausted.
    /// JA: deterministic spawn-route arc budget が枯渇したかを示します。
    /// </summary>
    public bool ArcExceeded { get; init; }
}

/// <summary>
/// EN: Input for topology projection that lifts local route evidence into phase-level route diagnostics.
/// JA: 局所 route evidence を phase-level route diagnostics へ持ち上げる topology projection の input です。
/// </summary>
public sealed record DoomRouteTopologyInput
{
    /// <summary>
    /// EN: Normalized gap vector strength.
    /// JA: 正規化済み gap vector strength です。
    /// </summary>
    public float Gap { get; init; }

    /// <summary>
    /// EN: Normalized landmark-route strength.
    /// JA: 正規化済み landmark-route strength です。
    /// </summary>
    public float Landmark { get; init; }

    /// <summary>
    /// EN: Foot-lane obstacle score.
    /// JA: foot-lane obstacle score です。
    /// </summary>
    public float FootObstacle { get; init; }

    /// <summary>
    /// EN: Motion-obstacle score.
    /// JA: motion-obstacle score です。
    /// </summary>
    public float MotionObstacle { get; init; }

    /// <summary>
    /// EN: First-door route evidence.
    /// JA: first-door route evidence です。
    /// </summary>
    public float FirstDoorRouteEvidence { get; init; }

    /// <summary>
    /// EN: Route confidence.
    /// JA: route confidence です。
    /// </summary>
    public float RouteConfidence { get; init; }

    /// <summary>
    /// EN: Signed recommended yaw.
    /// JA: 符号付き recommended yaw です。
    /// </summary>
    public int RecommendedYaw { get; init; }

    /// <summary>
    /// EN: Indicates wall-obstacle evidence.
    /// JA: wall-obstacle evidence を示します。
    /// </summary>
    public bool RouteWallObstacle { get; init; }

    /// <summary>
    /// EN: Indicates foot-obstacle evidence.
    /// JA: foot-obstacle evidence を示します。
    /// </summary>
    public bool RouteFootObstacle { get; init; }

    /// <summary>
    /// EN: Indicates barrel-lane risk evidence.
    /// JA: barrel-lane risk evidence を示します。
    /// </summary>
    public bool RouteBarrelLaneRisk { get; init; }

    /// <summary>
    /// EN: Indicates barrel-lane detour evidence.
    /// JA: barrel-lane detour evidence を示します。
    /// </summary>
    public bool RouteBarrelLaneDetourRequired { get; init; }
}

/// <summary>
/// EN: Topology projection values used for HUD and phase-level loop diagnostics.
/// JA: HUD と phase-level loop diagnostics が利用する topology projection 値です。
/// </summary>
public sealed record DoomRouteTopologyResult
{
    /// <summary>
    /// EN: Normalized distance from wall pressure where 0 means wall-adjacent and 1 means open center.
    /// JA: 0 が wall-adjacent、1 が open center を示す wall pressure からの正規化距離です。
    /// </summary>
    public float WallDistanceNormalized { get; init; } = 1;

    /// <summary>
    /// EN: Barrel-side lane evidence.
    /// JA: barrel-side lane evidence です。
    /// </summary>
    public float BarrelZoneEvidence { get; init; }

    /// <summary>
    /// EN: Centerline/corridor alignment where negative means the two disagree.
    /// JA: 負値が centerline と corridor の不一致を示す alignment です。
    /// </summary>
    public float CenterCorridorAlignment { get; init; }

    /// <summary>
    /// EN: Phase-level dead-end risk derived from topology.
    /// JA: topology から導出した phase-level dead-end risk です。
    /// </summary>
    public bool DeadEndRisk { get; init; }
}

/// <summary>
/// EN: Evaluates topology projection without selecting actions.
/// JA: action を選択せず topology projection を評価します。
/// </summary>
public sealed class DoomRouteTopologyEvaluator
{
    /// <summary>
    /// EN: Evaluates route topology from local route evidence.
    /// JA: 局所 route evidence から route topology を評価します。
    /// </summary>
    /// <param name="input">EN: Topology input. JA: topology input です。</param>
    public DoomRouteTopologyResult Evaluate(DoomRouteTopologyInput input)
    {
        ArgumentNullException.ThrowIfNull(input);

        var gap = Clamp01(input.Gap);
        var landmark = Clamp01(input.Landmark);
        var foot = Clamp01(input.FootObstacle);
        var motion = Clamp01(input.MotionObstacle);
        var wallPressure = Math.Max(Math.Max(foot, motion), input.RouteWallObstacle ? 0.82f : 0);
        wallPressure = Math.Max(wallPressure, input.RouteFootObstacle ? 0.62f : 0);
        wallPressure = Math.Max(wallPressure, input.RouteBarrelLaneRisk ? 0.78f : 0);
        wallPressure = Math.Max(wallPressure, input.RouteBarrelLaneDetourRequired ? 0.86f : 0);

        var ambiguousLandmark = landmark >= 0.34f && landmark <= 0.48f && gap < 0.30f;
        var barrelZone = Clamp01(
            (input.RouteBarrelLaneRisk ? 0.52f : 0)
            + (input.RouteBarrelLaneDetourRequired ? 0.62f : 0)
            + foot * 0.34f
            + motion * 0.22f
            + (1 - gap) * 0.16f
            + (ambiguousLandmark ? 0.18f : 0));
        var yawSign = Math.Sign(input.RecommendedYaw);
        var corridorStrength = Math.Max(
            Math.Max(gap, landmark),
            Math.Max(Clamp01(input.FirstDoorRouteEvidence), Clamp01(input.RouteConfidence)));
        var centerlineX = yawSign == 0
            ? 0
            : ClampSigned(-yawSign * Math.Max(barrelZone, wallPressure) * 0.8f);
        var centerlineY = Clamp01(1 - barrelZone);
        var corridorX = yawSign == 0
            ? 0
            : ClampSigned(yawSign * corridorStrength);
        var corridorY = Clamp01(corridorStrength);
        var alignment = ClampSigned(centerlineX * corridorX + centerlineY * corridorY);

        return new DoomRouteTopologyResult
        {
            WallDistanceNormalized = Clamp01(1 - wallPressure * 0.78f),
            BarrelZoneEvidence = barrelZone,
            CenterCorridorAlignment = alignment,
            DeadEndRisk = barrelZone > 0.90f && alignment < -0.30f
        };
    }

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);

    private static float ClampSigned(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, -1, 1);
}

/// <summary>
/// EN: Evaluates phase-local route loop budgets without emitting actions.
/// JA: action を出力せず、phase-local route loop budget を評価します。
/// </summary>
public sealed class DoomRouteLoopBudgetEvaluator
{
    /// <summary>
    /// EN: Evaluates the route loop budget state.
    /// JA: route loop budget state を評価します。
    /// </summary>
    /// <param name="input">EN: Route loop input evidence. JA: route loop input evidence です。</param>
    public DoomRouteLoopBudgetResult Evaluate(DoomRouteLoopBudgetInput input)
    {
        ArgumentNullException.ThrowIfNull(input);

        var routeMode = string.IsNullOrWhiteSpace(input.RouteMode)
            ? "spawn-approach"
            : input.RouteMode.Trim().ToLowerInvariant();
        var budgets = ResolveBudgets(routeMode);
        var actionRepeat = Math.Max(0, input.ActionRepeatFrames);
        var moveRepeat = Math.Max(0, input.MoveRepeatFrames);
        var turnRepeat = Math.Max(0, input.TurnRepeatFrames);
        var motionProgress = Clamp01(input.MotionForwardProgress);
        var motionObstacle = Clamp01(input.MotionObstacleScore);
        var footObstacle = Clamp01(input.FootObstacleScore);
        var gap = Clamp01(input.SpawnCorridorGapScore);
        var landmark = Clamp01(input.SpawnLandmarkRouteEvidence);
        var firstDoorVision = Clamp01(input.FirstDoorVisionScore);
        var useProbe = Clamp01(input.UseProbeScore);
        var turnStall = turnRepeat >= 6
            && motionProgress < 0.10f
            && gap < 0.25f
            && landmark < 0.45f;
        var slideStall = actionRepeat >= 8
            && motionProgress < 0.18f
            && footObstacle >= 0.48f
            && motionObstacle >= 0.48f
            && gap < 0.25f;
        var cornerStall = actionRepeat >= 4
            && motionProgress < 0.10f
            && footObstacle >= 0.55f
            && gap < 0.25f;
        var recoverStall = routeMode == "spawn-approach"
            && input.Predictions >= 900
            && input.EastWindowRecoverAnchor
            && input.EastWindowRouteEvidenceReady
            && turnRepeat < 6
            && actionRepeat < 8
            && firstDoorVision < 0.42f
            && useProbe < 0.22f
            && gap < 0.42f;
        var spawnRouteArc = input.Predictions >= 260
            && input.Predictions < 520
            && Math.Max(actionRepeat, turnRepeat) >= 1
            && motionProgress >= 0.20f
            && Math.Max(gap, landmark) >= 0.30f
            && useProbe < 0.22f;
        var topologyStall = routeMode == "door-approach"
            && input.RouteDeadEndRisk
            && input.Predictions >= 700
            && Math.Max(moveRepeat, actionRepeat) >= 24
            && firstDoorVision < 0.42f
            && useProbe < 0.22f;
        var advanceStall = routeMode == "door-approach"
            && input.Predictions >= 900
            && actionRepeat >= 24
            && motionProgress < 0.75f
            && footObstacle >= 0.48f
            && motionObstacle >= 0.48f
            && gap < 0.25f
            && landmark >= 0.30f
            && landmark < 0.45f
            && firstDoorVision < 0.42f
            && useProbe < 0.22f;
        var ingressLoop = routeMode == "door-approach"
            && input.Predictions >= 520
            && input.Predictions < 1900
            && actionRepeat >= 72
            && motionProgress >= 0.40f
            && motionProgress < 0.85f
            && gap >= 0.18f
            && gap < 0.25f
            && landmark >= 0.30f
            && landmark < 0.42f
            && firstDoorVision < 0.42f
            && useProbe < 0.22f;
        var pivotUsed = turnStall ? turnRepeat : 0;
        var slideUsed = slideStall ? actionRepeat : 0;
        var backoffUsed = cornerStall ? Math.Max(moveRepeat, actionRepeat) : 0;
        var advanceUsed = advanceStall ? actionRepeat : 0;
        var ingressUsed = ingressLoop ? actionRepeat : 0;
        var recoverUsed = recoverStall ? Math.Max(0, input.Predictions - 900) : 0;
        var topologyUsed = topologyStall ? Math.Max(moveRepeat, actionRepeat) : 0;
        var arcUsed = spawnRouteArc ? Math.Max(actionRepeat, turnRepeat) : 0;
        var pivotExceeded = pivotUsed >= budgets.Pivot;
        var slideExceeded = slideUsed >= budgets.Slide;
        var backoffExceeded = backoffUsed >= budgets.Backoff;
        var advanceExceeded = budgets.Advance > 0 && advanceUsed >= budgets.Advance;
        var ingressExceeded = budgets.Ingress > 0 && ingressUsed >= budgets.Ingress;
        var recoverExceeded = budgets.Recover > 0 && recoverUsed >= budgets.Recover;
        var topologyExceeded = budgets.Topology > 0 && topologyUsed >= budgets.Topology;
        var arcExceeded = budgets.Arc > 0 && arcUsed >= budgets.Arc;
        var loopKind = pivotExceeded
            ? "turn-stall"
            : slideExceeded
                ? "slide-stall"
                : backoffExceeded
                    ? "corner-stall"
                    : topologyExceeded
                        ? "door-approach-dead-end"
                        : advanceExceeded
                            ? "advance-stall"
                            : ingressExceeded
                                ? "ingress-loop"
                                : arcExceeded
                                    ? "spawn-route-arc"
                                    : recoverExceeded
                                        ? "recover-stall"
                                        : "none";
        var exceeded = pivotExceeded || slideExceeded || backoffExceeded || topologyExceeded || advanceExceeded || ingressExceeded || arcExceeded || recoverExceeded;

        return new DoomRouteLoopBudgetResult
        {
            RouteMode = routeMode,
            LoopKind = loopKind,
            RouteAbortHint = exceeded ? loopKind : "none",
            Exceeded = exceeded,
            PivotUsed = pivotUsed,
            PivotBudget = budgets.Pivot,
            PivotExceeded = pivotExceeded,
            SlideUsed = slideUsed,
            SlideBudget = budgets.Slide,
            SlideExceeded = slideExceeded,
            BackoffUsed = backoffUsed,
            BackoffBudget = budgets.Backoff,
            BackoffExceeded = backoffExceeded,
            AdvanceUsed = advanceUsed,
            AdvanceBudget = budgets.Advance,
            AdvanceExceeded = advanceExceeded,
            IngressUsed = ingressUsed,
            IngressBudget = budgets.Ingress,
            IngressExceeded = ingressExceeded,
            RecoverUsed = recoverUsed,
            RecoverBudget = budgets.Recover,
            RecoverExceeded = recoverExceeded,
            TopologyUsed = topologyUsed,
            TopologyBudget = budgets.Topology,
            TopologyExceeded = topologyExceeded,
            ArcUsed = arcUsed,
            ArcBudget = budgets.Arc,
            ArcExceeded = arcExceeded
        };
    }

    private static (int Pivot, int Slide, int Backoff, int Advance, int Ingress, int Recover, int Topology, int Arc) ResolveBudgets(string routeMode)
        => routeMode switch
        {
            "door-approach" => (8, 6, 4, 96, 72, 0, 36, 96),
            "post-door" => (10, 8, 4, 0, 0, 0, 0, 0),
            _ => (12, 10, 5, 0, 0, 520, 0, 96)
        };

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
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
        var routeBarrelLaneRisk = openSpaceFootNoise
            && depth >= 0.80f
            && foot >= 0.55f
            && motionObstacle >= 0.55f
            && motionProgress >= 0.45f
            && gap >= 0.30f
            && gap < 0.40f
            && landmark >= 0.35f
            && secret < 0.72f
            && useProbeScore < 0.22f;
        var routeBarrelLaneDetourRequired = openSpaceFootNoise
            && depth >= 0.80f
            && foot >= 0.55f
            && motionObstacle >= 0.55f
            && motionProgress >= 0.45f
            && gap >= 0.14f
            && gap < 0.30f
            && landmark >= 0.38f
            && secret < 0.72f
            && useProbeScore < 0.22f;
        var firstDoorVision = Clamp01(input.FirstDoorVisionScore);
        var firstDoorVisionRed = Clamp01(input.FirstDoorVisionRedScore);
        var firstDoorVisualRouteEvidence = firstDoorVision >= 0.38f
            && firstDoorVisionRed >= 0.05f
            && bridgeDoor >= 0.12f
            && secret < 0.42f
            ? Clamp01(firstDoorVision * 0.72f + bridgeDoor * 0.28f)
            : 0;
        var firstDoorRouteEvidence = Math.Max(Math.Max(bridgeDoor, gap), firstDoorVisualRouteEvidence);
        var firstDoorRouteEvidenceReady = bridgeDoor >= 0.18f || gap >= 0.30f || firstDoorVisualRouteEvidence >= 0.34f;
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
        var topology = new DoomRouteTopologyEvaluator().Evaluate(new DoomRouteTopologyInput
        {
            Gap = gap,
            Landmark = landmark,
            FootObstacle = foot,
            MotionObstacle = motionObstacle,
            FirstDoorRouteEvidence = firstDoorRouteEvidence,
            RouteConfidence = routeConfidence,
            RecommendedYaw = recommendedYaw,
            RouteWallObstacle = routeWallObstacle,
            RouteFootObstacle = routeFootObstacle,
            RouteBarrelLaneRisk = routeBarrelLaneRisk,
            RouteBarrelLaneDetourRequired = routeBarrelLaneDetourRequired
        });
        var routeDeadEndTrimRequired = topology.DeadEndRisk
            && !routeTextureWallOcclusion
            && useProbeScore < 0.22f;
        var corridorBridgeEvidence = Clamp01(bridgeDoor * 0.45f + gap * 0.25f + landmark * 0.30f);
        var routeCorridorBridgeLock = context == "corridor"
            && depth > 0.28f
            && depth <= 0.86f
            && bridgeDoor >= 0.28f
            && gap >= 0.34f
            && landmark >= 0.46f
            && secret < 0.80f
            && useProbeScore < 0.22f
            && !routeTextureWallOcclusion;
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
            RouteBarrelLaneRisk = routeBarrelLaneRisk,
            RouteBarrelLaneDetourRequired = routeBarrelLaneDetourRequired,
            RouteTopologyWallDistanceNormalized = topology.WallDistanceNormalized,
            RouteTopologyBarrelZoneEvidence = topology.BarrelZoneEvidence,
            RouteTopologyCenterCorridorAlignment = topology.CenterCorridorAlignment,
            RouteDeadEndRisk = topology.DeadEndRisk,
            RouteDeadEndTrimRequired = routeDeadEndTrimRequired,
            RouteCorridorBridgeEvidence = corridorBridgeEvidence,
            RouteCorridorBridgeLock = routeCorridorBridgeLock,
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
