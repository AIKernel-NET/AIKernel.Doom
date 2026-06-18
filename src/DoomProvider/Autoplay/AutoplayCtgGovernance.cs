namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Deterministic CTG gate evaluator shared by the DSL control plane and WASM migration tests.
/// JA: DSL control plane と WASM 移行検証で共有する deterministic CTG gate evaluator です。
/// </summary>
public static class AutoplayCtgGate
{
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
