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
    /// <summary>
    /// [EN] Executes the <c>Matches</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Matches</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="context">
    /// [EN] Supplies the <c>context</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>context</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public bool Matches(AutoplayPipelineContext context)
    {
        var evaluation = Evaluate(context);
        return evaluation.ConditionMatched && evaluation.EvidenceMatched;
    }

    /// <summary>
    /// [EN] Executes the <c>Evaluate</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Evaluate</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="context">
    /// [EN] Supplies the <c>context</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>context</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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
