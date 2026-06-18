namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayCtgEthosCouncil
{
    public static CouncilDecisionTrace Evaluate(CtgProposalPacket proposal, CtgGateOptions options)
    {
        var enemy = AutoplayCtgCouncilEvidence.Score(proposal, "enemy");
        var safeZone = AutoplayCtgCouncilEvidence.Score(proposal, "safe-zone");
        if (proposal.CandidateAction.AttackKey && enemy < 0.24f)
        {
            return Trace(CtgCouncilVote.Reject, "fire-without-enemy-evidence", 92, 0.24f, ("enemy", enemy));
        }

        if (proposal.CandidateAction.UseKey && AutoplayCtgCouncilEvidence.MaxScore(proposal, "door", "corridor") < 0.24f)
        {
            return Trace(CtgCouncilVote.Abstain, "unknown-use-target", 58, 0.24f, ("door", AutoplayCtgCouncilEvidence.Score(proposal, "door")));
        }

        if (safeZone >= 0.42f || enemy < 0.42f)
        {
            return Trace(CtgCouncilVote.Approve, "safety-contract-satisfied", 56, 0.48f, ("safe-zone", safeZone), ("enemy", enemy));
        }

        return Trace(CtgCouncilVote.Abstain, "safety-contract-unknown", 44, options.EthosRejectDangerThreshold, ("safe-zone", safeZone), ("enemy", enemy));
    }

    private static CouncilDecisionTrace Trace(
        CtgCouncilVote vote,
        string reasonCode,
        int priority,
        float threshold,
        params (string Key, float Value)[] evidence)
        => AutoplayCtgCouncilEvidence.Trace("Ethos", vote, reasonCode, priority, threshold, evidence);
}
