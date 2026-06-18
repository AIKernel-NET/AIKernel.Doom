namespace AIKernel.Doom.Provider.Autoplay;

public sealed class CompiledAutoplayPipeline
{
    private readonly IReadOnlyList<CompiledAutoplayPipelineStage> _stages;
    private readonly IReadOnlyList<string> _semanticSymbols;
    private readonly IReadOnlyList<ZoeVetoRule> _zoeVetoRules;
    private readonly DynamicPipelineEvaluator _evaluator;
    private readonly AutoplayOptimizationProfile _profile;

    internal CompiledAutoplayPipeline(
        string strategyName,
        IReadOnlyList<CompiledAutoplayPipelineStage> stages,
        IReadOnlyList<string> semanticSymbols,
        DynamicPipelineGraph graph,
        IReadOnlyList<ZoeVetoRule> zoeVetoRules,
        AutoplayOptimizationProfile profile)
    {
        StrategyName = strategyName;
        _stages = stages;
        _semanticSymbols = semanticSymbols;
        Graph = graph;
        _zoeVetoRules = zoeVetoRules;
        _evaluator = new DynamicPipelineEvaluator(graph, AutoplayPipelineDslCompiler.CompileDynamicPredicate);
        _profile = profile;
    }

    public string StrategyName { get; }

    public DynamicPipelineGraph Graph { get; }

    public ActionCommand ExecuteTick(SensorFusion sensor, int recoveryFrames)
        => EvaluateTick(sensor, recoveryFrames).Action;

    public AutoplayPipelineDecision EvaluateTick(SensorFusion sensor, int recoveryFrames)
    {
        var context = new AutoplayPipelineContext(sensor, recoveryFrames, _profile);
        var evaluations = new List<AutoplayPipelineStageEvaluation>(_stages.Count);
        CompiledAutoplayPipelineStage? selectedStage = null;
        AutoplayPipelineStageEvaluation? selectedEvaluation = null;
        ActionCommand? selectedAction = null;

        foreach (var stage in _stages)
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
        var semanticScores = context.SemanticScores(_semanticSymbols);
        var dynamicContext = new DynamicPipelineContext
        {
            Sensor = sensor,
            RecoveryFrames = recoveryFrames,
            SemanticScores = semanticScores
        };
        var evaluated = _evaluator.Evaluate(dynamicContext, proposedAction, _zoeVetoRules);
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
            evaluated.SvcEvent);
    }
}
