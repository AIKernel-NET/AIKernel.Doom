namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayCtgGateDecisionResolver
{
    /// <summary>
    /// [EN] Executes the <c>Disabled</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Disabled</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="proposal">
    /// [EN] The proposal packet whose action should pass through the disabled gate unchanged.
    /// [JA] disabled gate を変更なしで通過させる proposal packet です。
    /// </param>
    /// <param name="options">
    /// [EN] The CTG gate options used to keep trace values coherent while the gate is disabled.
    /// [JA] gate が disabled の間も trace value を一貫させるための CTG gate options です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static (CtgGateDecisionTrace Gate, ActionCommand AppliedAction) Disabled(
        CtgProposalPacket proposal,
        CtgGateOptions options)
        => (new CtgGateDecisionTrace(
                false,
                CtgGateDecisionKind.Allow,
                "trivalent-council-disabled",
                0,
                0,
                0,
                options.Quorum,
                false,
                true,
                false),
            proposal.CandidateAction);

    /// <summary>
    /// [EN] Executes the <c>Resolve</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Resolve</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="proposal">
    /// [EN] The proposal packet that carries the candidate action and semantic scores.
    /// [JA] candidate action と semantic score を保持する proposal packet です。
    /// </param>
    /// <param name="votes">
    /// [EN] The council votes collected for the proposal.
    /// [JA] proposal に対して収集された council vote です。
    /// </param>
    /// <param name="options">
    /// [EN] The gate options that determine quorum, enforcement, and trace-only behavior.
    /// [JA] quorum、enforcement、trace-only behavior を決める gate options です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static (CtgGateDecisionTrace Gate, ActionCommand AppliedAction) Resolve(
        CtgProposalPacket proposal,
        IReadOnlyList<CouncilDecisionTrace> votes,
        CtgGateOptions options)
    {
        var approvals = votes.Count(vote => vote.Vote == CtgCouncilVote.Approve);
        var rejects = votes.Count(vote => vote.Vote == CtgCouncilVote.Reject);
        var abstentions = votes.Count(vote => vote.Vote == CtgCouncilVote.Abstain);
        var ethos = votes.First(vote => string.Equals(vote.Council, "Ethos", StringComparison.Ordinal));

        var (decision, reasonCode) = Decide(ethos, approvals, rejects, abstentions, options.Quorum);
        var applied = ApplyDecision(proposal.CandidateAction, decision, options);
        var changed = applied != proposal.CandidateAction;

        return (new CtgGateDecisionTrace(
                true,
                decision,
                reasonCode,
                approvals,
                rejects,
                abstentions,
                options.Quorum,
                options.EnforceGate,
                options.TraceOnly,
                changed),
            applied);
    }

    private static (CtgGateDecisionKind Decision, string ReasonCode) Decide(
        CouncilDecisionTrace ethos,
        int approvals,
        int rejects,
        int abstentions,
        int quorum)
    {
        if (ethos.Vote == CtgCouncilVote.Reject)
        {
            return (CtgGateDecisionKind.Deny, "ethos-veto");
        }

        if (approvals >= quorum)
        {
            return (CtgGateDecisionKind.Allow, "quorum-met");
        }

        return rejects == 0 && abstentions > approvals
            ? (CtgGateDecisionKind.Deny, "unknown-fail-closed")
            : (CtgGateDecisionKind.Deny, "quorum-not-met");
    }

    private static ActionCommand ApplyDecision(
        ActionCommand action,
        CtgGateDecisionKind decision,
        CtgGateOptions options)
    {
        if (!options.EnforceGate || options.TraceOnly || decision != CtgGateDecisionKind.Deny)
        {
            return action;
        }

        return action with
        {
            MoveForward = false,
            MoveBackward = false,
            StrafeLeft = false,
            StrafeRight = false,
            UseKey = false,
            AttackKey = false
        };
    }
}
