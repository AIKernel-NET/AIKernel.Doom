namespace AIKernel.Doom.Provider.Autoplay;

internal sealed record CompiledAutoplayPipelineStage(
    string Id,
    string Objective,
    float Priority,
    float Threshold,
    IReadOnlyDictionary<string, float> Evidence,
    Func<AutoplayPipelineContext, bool> Condition,
    Func<AutoplayPipelineContext, ActionCommand> Action)
{
    public bool Matches(AutoplayPipelineContext context)
    {
        var evaluation = Evaluate(context);
        return evaluation.ConditionMatched && evaluation.EvidenceMatched;
    }

    public AutoplayPipelineStageEvaluation Evaluate(AutoplayPipelineContext context)
    {
        var conditionMatched = Condition(context);
        var evidenceScore = EvidenceScore(context);
        return new AutoplayPipelineStageEvaluation(
            Id,
            Objective,
            Priority,
            Threshold,
            evidenceScore,
            conditionMatched,
            evidenceScore >= Threshold,
            false);
    }

    private float EvidenceScore(AutoplayPipelineContext context)
        => Evidence.Count == 0
            ? 1
            : Evidence.Sum(item => context.SemanticScore(item.Key) * item.Value);
}
