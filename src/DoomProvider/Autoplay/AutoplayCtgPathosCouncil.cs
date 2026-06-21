namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayCtgPathosCouncil
{
    public static CouncilDecisionTrace Evaluate(CtgProposalPacket proposal, CtgGateOptions options)
    {
        var enemy = AutoplayCtgCouncilEvidence.Score(proposal, "enemy");
        if (enemy >= options.PathosRejectDangerThreshold && proposal.CandidateAction.MoveForward && !proposal.CandidateAction.AttackKey)
        {
            return Trace(CtgCouncilVote.Reject, "danger-forward-repulsion", 76, options.PathosRejectDangerThreshold, ("enemy", enemy));
        }

        if (enemy >= 0.52f && (proposal.CandidateAction.MoveBackward || proposal.CandidateAction.TurnYaw != 0 || !proposal.CandidateAction.MoveForward))
        {
            return Trace(CtgCouncilVote.Approve, "protective-motion-selected", 62, 0.52f, ("enemy", enemy));
        }

        if (enemy < 0.28f)
        {
            return Trace(CtgCouncilVote.Approve, "low-affect-risk", 36, 0.28f, ("enemy", enemy));
        }

        return Trace(CtgCouncilVote.Abstain, "affective-evidence-ambiguous", 40, options.PathosRejectDangerThreshold, ("enemy", enemy));
    }

    private static CouncilDecisionTrace Trace(
        CtgCouncilVote vote,
        string reasonCode,
        int priority,
        float threshold,
        params (string Key, float Value)[] evidence)
        => AutoplayCtgCouncilEvidence.Trace("Pathos", vote, reasonCode, priority, threshold, evidence);
}
