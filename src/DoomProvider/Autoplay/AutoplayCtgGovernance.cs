namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Deterministic CTG gate evaluator shared by the DSL control plane and WASM migration tests.
/// JA: DSL control plane と WASM 移行検証で共有する deterministic CTG gate evaluator です。
/// </summary>
public static class AutoplayCtgGate
{
    /// <summary>
    /// [EN] Executes the <c>Evaluate</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Evaluate</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="proposal">
    /// [EN] Supplies the <c>proposal</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>proposal</c> value です。
    /// </param>
    /// <param name="options">
    /// [EN] Supplies the <c>options</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>options</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static StepGovernanceTrace Evaluate(CtgProposalPacket proposal, CtgGateOptions? options = null)
    {
        ArgumentNullException.ThrowIfNull(proposal);
        var effective = AutoplayCtgGateOptionsNormalizer.Normalize(options);
        if (!effective.EnableTrivalentCouncil)
        {
            var (disabled, disabledAction) = AutoplayCtgGateDecisionResolver.Disabled(proposal, effective);
            return new StepGovernanceTrace(
                proposal.TraceId,
                proposal.StepIndex,
                proposal.Phase,
                proposal.Objective,
                proposal,
                [],
                disabled,
                disabledAction);
        }

        var votes = AutoplayCtgCouncilEvaluator.Evaluate(proposal, effective);
        var (gate, applied) = AutoplayCtgGateDecisionResolver.Resolve(proposal, votes, effective);

        return new StepGovernanceTrace(
            proposal.TraceId,
            proposal.StepIndex,
            proposal.Phase,
            proposal.Objective,
            proposal,
            votes,
            gate,
            applied);
    }
}
