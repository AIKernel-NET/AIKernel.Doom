namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// [EN] Defines the <c>CompiledAutoplayPipeline</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>CompiledAutoplayPipeline</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public sealed class CompiledAutoplayPipeline
{
    private readonly IReadOnlyList<CompiledAutoplayPipelineStage> _stages;
    private readonly IReadOnlyList<CompiledAutoplayPhasePipelineSet> _phasePipelines;
    private readonly IReadOnlyList<string> _semanticSymbols;
    private readonly IReadOnlyList<ZoeVetoRule> _zoeVetoRules;
    private readonly DynamicPipelineEvaluator _evaluator;
    private readonly AutoplayOptimizationProfile _profile;
    private string _activeSequencePhaseId = "none";
    private string _activeActionSequenceId = "none";
    private int _activeActionSequenceFrame;
    private int _predictionFrames;

    internal CompiledAutoplayPipeline(
        string strategyName,
        IReadOnlyList<CompiledAutoplayPipelineStage> stages,
        IReadOnlyList<CompiledAutoplayPhasePipelineSet> phasePipelines,
        IReadOnlyList<string> semanticSymbols,
        DynamicPipelineGraph graph,
        IReadOnlyList<ZoeVetoRule> zoeVetoRules,
        AutoplayOptimizationProfile profile)
    {
        StrategyName = strategyName;
        _stages = stages;
        _phasePipelines = phasePipelines;
        _semanticSymbols = semanticSymbols;
        Graph = graph;
        _zoeVetoRules = zoeVetoRules;
        _evaluator = new DynamicPipelineEvaluator(graph, AutoplayPipelineDslCompiler.CompileDynamicPredicate);
        _profile = profile;
    }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public string StrategyName { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public DynamicPipelineGraph Graph { get; }

    /// <summary>
    /// [EN] Executes the <c>ExecuteTick</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>ExecuteTick</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="sensor">
    /// [EN] Supplies the <c>sensor</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>sensor</c> value です。
    /// </param>
    /// <param name="recoveryFrames">
    /// [EN] Supplies the <c>recoveryFrames</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>recoveryFrames</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public ActionCommand ExecuteTick(SensorFusion sensor, int recoveryFrames)
        => EvaluateTick(sensor, recoveryFrames).Action;

    /// <summary>
    /// [EN] Executes the <c>EvaluateTick</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>EvaluateTick</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="sensor">
    /// [EN] Supplies the <c>sensor</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>sensor</c> value です。
    /// </param>
    /// <param name="recoveryFrames">
    /// [EN] Supplies the <c>recoveryFrames</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>recoveryFrames</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public AutoplayPipelineDecision EvaluateTick(SensorFusion sensor, int recoveryFrames)
    {
        var context = new AutoplayPipelineContext(sensor, recoveryFrames, _profile, ++_predictionFrames);
        var semanticScores = context.SemanticScores(_semanticSymbols);
        var routePlan = CreateRoutePlan(context);
        context.AttachRoutePlan(routePlan);
        var phasePipeline = SelectPhasePipeline(context);
        var activeStages = FilterStagesForPhase(phasePipeline);
        var evaluations = new List<AutoplayPipelineStageEvaluation>(activeStages.Count);
        CompiledAutoplayPipelineStage? selectedStage = null;
        AutoplayPipelineStageEvaluation? selectedEvaluation = null;
        ActionCommand? selectedAction = null;

        foreach (var stage in activeStages)
        {
            var evaluation = stage.Evaluate(context);
            if (selectedStage is null && evaluation.ConditionMatched && evaluation.EvidenceMatched)
            {
                selectedStage = stage;
                selectedEvaluation = evaluation with { Selected = true };
                selectedAction = stage.Action(context);
                evaluations.Add(selectedEvaluation);
                continue;
            }

            evaluations.Add(evaluation);
        }

        var proposedAction = selectedAction ?? new ActionCommand(false, false, false, false, 0, false, false);
        var selected = selectedEvaluation ?? new AutoplayPipelineStageEvaluation("none", "idle", 0, 0, 0, false, false, true);
        var sequenceProjection = ResolveActionSequence(phasePipeline, selected.StageId, context);
        if (sequenceProjection.Action is not null)
        {
            proposedAction = sequenceProjection.Action;
        }

        var dynamicContext = CreateDynamicContext(context, recoveryFrames, semanticScores, routePlan);
        var evaluated = _evaluator.Evaluate(dynamicContext, proposedAction, _zoeVetoRules);
        var pipelineState = PipelineStateDto.From(
            evaluated.Context,
            evaluated.Action,
            evaluated.ZoeVetoed,
            evaluated.SvcEvent);
        var navigator = CreateNavigator(context, routePlan);
        var autoplayState = DoomAutoplayStateDto.From(
            string.IsNullOrWhiteSpace(selected.Objective) ? "idle" : selected.Objective,
            selected.StageId,
            routePlan,
            navigator,
            pipelineState,
            evaluated.Action);
        return new AutoplayPipelineDecision(
            StrategyName,
            selected.StageId,
            string.IsNullOrWhiteSpace(selected.Objective) ? "idle" : selected.Objective,
            selected.Priority,
            selected.Threshold,
            selected.EvidenceScore,
            semanticScores,
            evaluations,
            evaluated.Action,
            evaluated.ZoeVetoed,
            evaluated.SvcEvent)
        {
            PipelineState = pipelineState,
            GoalState = autoplayState.GoalState,
            DebugOverlay = autoplayState.DebugOverlay,
            AutoplayState = autoplayState,
            PhasePipelineId = phasePipeline.Id,
            PhasePipelineExclusive = phasePipeline.Exclusive,
            ActiveStageCount = activeStages.Count,
            ActionSequenceId = sequenceProjection.SequenceId,
            ActionSequenceStepId = sequenceProjection.StepId,
            ActionSequenceFrame = sequenceProjection.Frame
        };
    }

    private ActionSequenceProjection ResolveActionSequence(
        CompiledAutoplayPhasePipelineSet phasePipeline,
        string selectedStageId,
        AutoplayPipelineContext context)
    {
        if (!string.Equals(_activeSequencePhaseId, phasePipeline.Id, StringComparison.Ordinal))
        {
            ResetActionSequence();
        }

        var active = phasePipeline.ActionSequences.FirstOrDefault(sequence =>
            string.Equals(sequence.Id, _activeActionSequenceId, StringComparison.Ordinal));
        if (active is not null && _activeActionSequenceFrame >= active.BudgetFrames)
        {
            ResetActionSequence();
            active = null;
        }

        active ??= phasePipeline.FindTriggeredSequence(selectedStageId);
        if (active is null || active.Steps.Count == 0)
        {
            ResetActionSequence();
            return ActionSequenceProjection.None;
        }

        if (!string.Equals(_activeActionSequenceId, active.Id, StringComparison.Ordinal))
        {
            _activeSequencePhaseId = phasePipeline.Id;
            _activeActionSequenceId = active.Id;
            _activeActionSequenceFrame = 0;
        }

        var nextFrame = Math.Max(1, _activeActionSequenceFrame + 1);
        if (nextFrame > active.BudgetFrames)
        {
            ResetActionSequence();
            return ActionSequenceProjection.None;
        }

        var step = active.StepForFrame(nextFrame);
        if (step is null)
        {
            ResetActionSequence();
            return ActionSequenceProjection.None;
        }

        _activeActionSequenceFrame = nextFrame;
        return new ActionSequenceProjection(
            active.Id,
            step.Id,
            nextFrame,
            step.Action(context),
            active.Exclusive);
    }

    private void ResetActionSequence()
    {
        _activeSequencePhaseId = "none";
        _activeActionSequenceId = "none";
        _activeActionSequenceFrame = 0;
    }

    private CompiledAutoplayPhasePipelineSet SelectPhasePipeline(AutoplayPipelineContext context)
        => _phasePipelines.FirstOrDefault(phase => phase.Matches(context))
            ?? new CompiledAutoplayPhasePipelineSet(
                "fallback-all",
                0,
                false,
                new HashSet<string>(StringComparer.Ordinal),
                [],
                [],
                _ => true);

    private IReadOnlyList<CompiledAutoplayPipelineStage> FilterStagesForPhase(CompiledAutoplayPhasePipelineSet phasePipeline)
        => phasePipeline.AllowedStageIds.Count == 0 && phasePipeline.AllowedStagePrefixes.Count == 0
            ? _stages
            : _stages.Where(phasePipeline.Allows).ToArray();

    private sealed record ActionSequenceProjection(
        string SequenceId,
        string StepId,
        int Frame,
        ActionCommand? Action,
        bool Exclusive)
    {
        public static ActionSequenceProjection None { get; } =
            new("none", "none", 0, null, false);
    }

    private DynamicPipelineContext CreateDynamicContext(
        AutoplayPipelineContext context,
        int recoveryFrames,
        IReadOnlyDictionary<string, float> semanticScores,
        DoomRoutePlannerResult routePlan)
        => new()
        {
            Sensor = context.Sensor,
            RecoveryFrames = recoveryFrames,
            SemanticScores = semanticScores,
            TextValues = CreateTextValues(context, routePlan),
            DoorOpenedCount = context.DoorOpenedCount,
            CentralHallEntered = context.CentralHallEntered,
            StairsEntered = context.StairsEntered,
            EnemyDefeatedCount = context.EnemyDefeatedCount,
            AmmoLikelyEmpty = context.AmmoLikelyEmpty,
            FinalRoomEntered = context.FinalRoomEntered,
            ExitSwitchPressed = context.ExitSwitchPressed,
            CentralHallConfidence = context.CentralHallConfidence,
            FinalRoomConfidence = context.FinalRoomConfidence,
            LowHealthThreshold = _profile.LowHealthThreshold,
            CriticalHealthThreshold = _profile.CriticalHealthThreshold,
            UsePulseCooldownFrames = context.UsePulseCooldownFrames,
            RoutePlan = routePlan
        };

    private static IReadOnlyDictionary<string, string> CreateTextValues(
        AutoplayPipelineContext context,
        DoomRoutePlannerResult routePlan)
        => new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["context"] = context.Context,
            ["routeMode"] = routePlan.RouteMode,
            ["currentRoute"] = routePlan.CurrentRoute,
            ["currentLandmark"] = routePlan.CurrentLandmark,
            ["routeActionHint"] = routePlan.RouteActionHint,
            ["routeLoopKind"] = routePlan.RouteLoopKind,
            ["routeAbortHint"] = routePlan.RouteAbortHint
        };

    private DoomRoutePlannerResult CreateRoutePlan(AutoplayPipelineContext context)
    {
        var tensor = context.Sensor.SensorTensor;
        var footObstacleScore = Max(
            Tensor(tensor, "vision.wall"),
            Tensor(tensor, "motion.obstacle"),
            Tensor(tensor, "motion.stuck"));
        var motionObstacleScore = Max(Tensor(tensor, "motion.obstacle"), Tensor(tensor, "motion.stuck"));
        var spawnCorridorGapScore = Max(
            Tensor(tensor, "semantic.corridor"),
            Tensor(tensor, "vision.open"),
            Tensor(tensor, "motion.entrance"));
        var spawnLandmarkRouteEvidence = Max(
            Tensor(tensor, "semantic.corridor"),
            Tensor(tensor, "motion.entrance"),
            Tensor(tensor, "vision.bluefloor") * 0.5f);
        var bridgeDoorScore = Max(Tensor(tensor, "semantic.door"), Tensor(tensor, "vision.target") * 0.45f);
        var firstDoorVisionScore = Max(Tensor(tensor, "vision.target"), Tensor(tensor, "semantic.door"));
        var useProbeScore = Max(Tensor(tensor, "semantic.door"), Tensor(tensor, "vision.target") * 0.75f);
        var routePlan = new DoomRoutePlanner().Evaluate(new DoomRoutePlannerInput
        {
            DepthSig = context.DepthSig,
            Context = context.Context,
            FootObstacleScore = footObstacleScore,
            FootObstacleFlickerScore = Tensor(tensor, "motion.delta"),
            FootObstacleBounceFrames = Tensor(tensor, "motion.inputstall") >= 0.5f ? 2 : 0,
            MotionObstacleScore = motionObstacleScore,
            MotionForwardProgress = Tensor(tensor, "motion.forward"),
            SpawnCorridorGapScore = spawnCorridorGapScore,
            SpawnLandmarkRouteEvidence = spawnLandmarkRouteEvidence,
            SpawnSecretDoorScore = Tensor(tensor, "semantic.mapdoor"),
            SpawnWestStairScore = Tensor(tensor, "semantic.mapdark"),
            BridgeDoorScore = bridgeDoorScore,
            FirstDoorVisionScore = firstDoorVisionScore,
            FirstDoorVisionRedScore = Tensor(tensor, "semantic.door"),
            WallVector = context.WallVector,
            GapVector = Signed(context.QDelta / 45f),
            CorridorVector = Signed(context.QDelta / 55f),
            WallFlowVector = context.WallVector,
            UseProbeScore = useProbeScore,
            UseProbeAlignment = Clamp01(1 - (Math.Abs(context.QDelta) / Math.Max(1f, _profile.DoorSoftAimToleranceDegrees))),
            Predictions = context.Predictions
        });
        var routeMode = ResolveRouteMode(context, routePlan);
        var postDoorBridgeLockSignal = string.Equals(routeMode, "post-door", StringComparison.OrdinalIgnoreCase)
            && context.DoorOpenedCount > 0
            && !context.CentralHallEntered
            && !context.VisualEnemyVisible
            && context.PostDoorTerminalSurface >= 0.24f
            && bridgeDoorScore >= 0.20f
            && spawnCorridorGapScore >= 0.24f
            && spawnLandmarkRouteEvidence >= 0.32f
            && context.DepthSig > 0.45f;
        var routeLoop = new DoomRouteLoopBudgetEvaluator().Evaluate(new DoomRouteLoopBudgetInput
        {
            RouteMode = routeMode,
            MotionForwardProgress = Tensor(tensor, "motion.forward"),
            MotionObstacleScore = motionObstacleScore,
            FootObstacleScore = footObstacleScore,
            SpawnCorridorGapScore = spawnCorridorGapScore,
            SpawnLandmarkRouteEvidence = spawnLandmarkRouteEvidence,
            Predictions = context.Predictions,
            FirstDoorVisionScore = firstDoorVisionScore,
            UseProbeScore = useProbeScore,
            RouteDeadEndRisk = routePlan.RouteDeadEndRisk,
            EastWindowRouteEvidenceReady = routePlan.EastWindowRouteEvidenceReady
        });

        var phaseCurrentRoute = ResolvePhaseCurrentRoute(context, routeMode, routePlan.CurrentRoute);
        var phaseRouteHint = ResolvePhaseRouteHint(context, routeMode, phaseCurrentRoute, routePlan);

        return routePlan with
        {
            RouteMode = routeMode,
            CurrentRoute = phaseCurrentRoute,
            CurrentLandmark = phaseRouteHint.CurrentLandmark,
            RouteActionHint = phaseRouteHint.RouteActionHint,
            RouteCorridorBridgeEvidence = Math.Max(
                routePlan.RouteCorridorBridgeEvidence,
                postDoorBridgeLockSignal ? Math.Max(bridgeDoorScore, spawnCorridorGapScore) : routePlan.RouteCorridorBridgeEvidence),
            RouteCorridorBridgeLock = routePlan.RouteCorridorBridgeLock || postDoorBridgeLockSignal,
            RouteLoopKind = routeLoop.LoopKind,
            RouteAbortHint = routeLoop.RouteAbortHint,
            RouteLoopBudgetExceeded = routeLoop.Exceeded,
            RoutePivotUsed = routeLoop.PivotUsed,
            RoutePivotBudget = routeLoop.PivotBudget,
            RoutePivotExceeded = routeLoop.PivotExceeded,
            RouteSlideUsed = routeLoop.SlideUsed,
            RouteSlideBudget = routeLoop.SlideBudget,
            RouteSlideExceeded = routeLoop.SlideExceeded,
            RouteBackoffUsed = routeLoop.BackoffUsed,
            RouteBackoffBudget = routeLoop.BackoffBudget,
            RouteBackoffExceeded = routeLoop.BackoffExceeded,
            RouteAdvanceUsed = routeLoop.AdvanceUsed,
            RouteAdvanceBudget = routeLoop.AdvanceBudget,
            RouteAdvanceExceeded = routeLoop.AdvanceExceeded,
            RouteIngressUsed = routeLoop.IngressUsed,
            RouteIngressBudget = routeLoop.IngressBudget,
            RouteIngressExceeded = routeLoop.IngressExceeded,
            RouteRecoverUsed = routeLoop.RecoverUsed,
            RouteRecoverBudget = routeLoop.RecoverBudget,
            RouteRecoverExceeded = routeLoop.RecoverExceeded
        };
    }

    private DoomLandmarkNavigatorResult CreateNavigator(AutoplayPipelineContext context, DoomRoutePlannerResult routePlan)
        => new DoomLandmarkNavigator().Evaluate(new DoomLandmarkNavigatorInput
        {
            RoutePlan = routePlan,
            SpawnCorridorGapTurn = TurnFromVector(Signed(context.QDelta / 45f)),
            SpawnLandmarkRouteTurn = TurnFromVector(Signed(context.QDelta / 55f)),
            WallVector = context.WallVector,
            SpawnGapYawDegrees = Math.Max(12, _profile.OpenCruiseYawDegrees),
            WallAwayYawDegrees = _profile.WallAwayYawDegrees
        });

    private static string ResolveRouteMode(AutoplayPipelineContext context, DoomRoutePlannerResult routePlan)
    {
        if (context.DoorOpenedCount > 0)
        {
            return "post-door";
        }

        if (!IsFirstDoorPhaseReady(context, routePlan))
        {
            return "spawn-approach";
        }

        return routePlan.FirstDoorRouteEvidenceReady || routePlan.UseProbeConfidence >= 0.22f
            ? "door-approach"
            : "spawn-approach";
    }

    private static bool IsFirstDoorPhaseReady(AutoplayPipelineContext context, DoomRoutePlannerResult routePlan)
        => routePlan.UseProbeConfidence >= 0.22f
            || (routePlan.FirstDoorRouteEvidenceReady && routePlan.RouteConfidence >= 0.58f)
            || (string.Equals(context.Context, "corridor", StringComparison.OrdinalIgnoreCase)
                && routePlan.FirstDoorRouteEvidenceReady
                && routePlan.RouteConfidence >= 0.44f);

    private static string ResolvePhaseCurrentRoute(
        AutoplayPipelineContext context,
        string routeMode,
        string currentRoute)
    {
        if (!string.Equals(routeMode, "post-door", StringComparison.OrdinalIgnoreCase))
        {
            return string.IsNullOrWhiteSpace(currentRoute) ? "open-space-cruise" : currentRoute;
        }

        if (context.CentralHallEntered)
        {
            return "central-hall-route";
        }

        if (context.BridgeLaneVisible || context.BridgeConfidence >= 0.18f)
        {
            return "cross-bridge-route";
        }

        if (context.Context == "computer-room"
            || context.ComputerRoomConfidence >= 0.18f
            || context.PostDoorTerminalSurface >= 0.24f)
        {
            return "computer-room-route";
        }

        return "post-door-corridor-route";
    }

    private static (string CurrentLandmark, string RouteActionHint) ResolvePhaseRouteHint(
        AutoplayPipelineContext context,
        string routeMode,
        string currentRoute,
        DoomRoutePlannerResult routePlan)
    {
        if (!string.Equals(routeMode, "post-door", StringComparison.OrdinalIgnoreCase))
        {
            return (
                string.IsNullOrWhiteSpace(routePlan.CurrentLandmark) ? "none" : routePlan.CurrentLandmark,
                string.IsNullOrWhiteSpace(routePlan.RouteActionHint) ? "cruise" : routePlan.RouteActionHint);
        }

        if (string.Equals(currentRoute, "central-hall-route", StringComparison.OrdinalIgnoreCase)
            || context.CentralHallEntered
            || context.CentralHallConfidence >= 0.18f
            || context.BridgeDoorScore >= 0.24f)
        {
            return ("central-hall-door", "advance-central-hall");
        }

        if (string.Equals(currentRoute, "cross-bridge-route", StringComparison.OrdinalIgnoreCase)
            || context.BridgeLaneVisible
            || context.BridgeConfidence >= 0.18f)
        {
            return ("cross-bridge-lane", "advance-cross-bridge");
        }

        if (string.Equals(currentRoute, "computer-room-route", StringComparison.OrdinalIgnoreCase)
            || string.Equals(context.Context, "computer-room", StringComparison.OrdinalIgnoreCase)
            || context.ComputerRoomConfidence >= 0.18f
            || context.PostDoorTerminalSurface >= 0.24f)
        {
            return ("computer-room-egress", "advance-computer-room");
        }

        return ("post-door-corridor", "post-door-cruise");
    }

    private static float Tensor(AutoplaySensorTensor tensor, string channel)
        => tensor.IsEmpty ? 0 : Clamp01(tensor.Get(channel));

    private static float Max(params float[] values)
        => values.Length == 0 ? 0 : Clamp01(values.Max());

    private static float Signed(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, -1, 1);

    private static string TurnFromVector(float value)
        => value > 0.05f ? "right" : (value < -0.05f ? "left" : "none");

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}
