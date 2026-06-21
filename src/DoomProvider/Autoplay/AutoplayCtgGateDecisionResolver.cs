namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayCtgGateDecisionResolver
{
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
