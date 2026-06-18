namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayCtgLogosCouncil
{
    public static CouncilDecisionTrace Evaluate(CtgProposalPacket proposal, CtgGateOptions options)
    {
        var routeEvidence = AutoplayCtgCouncilEvidence.MaxScore(proposal, "door", "corridor", "bridge", "computer-room");
        var evidence = MathF.Max(routeEvidence, proposal.PipelineDecision.EvidenceScore);
        if (proposal.CandidateAction.UseKey && routeEvidence < 0.28f)
        {
            return Trace(CtgCouncilVote.Abstain, "use-target-not-logically-confirmed", 52, options.LogosApprovalThreshold, ("route", routeEvidence));
        }

        if (proposal.CandidateAction.MoveForward && evidence < options.LogosApprovalThreshold && routeEvidence < 0.34f)
        {
            return Trace(CtgCouncilVote.Reject, "action-opposes-route-evidence", 64, options.LogosApprovalThreshold, ("route", routeEvidence), ("evidence", evidence));
        }

        if (evidence >= options.LogosApprovalThreshold || routeEvidence >= 0.46f)
        {
            return Trace(CtgCouncilVote.Approve, "objective-action-aligned", 48, options.LogosApprovalThreshold, ("route", routeEvidence), ("evidence", evidence));
        }

        return Trace(CtgCouncilVote.Abstain, "insufficient-logical-evidence", 32, options.LogosApprovalThreshold, ("route", routeEvidence), ("evidence", evidence));
    }

    private static CouncilDecisionTrace Trace(
        CtgCouncilVote vote,
        string reasonCode,
        int priority,
        float threshold,
        params (string Key, float Value)[] evidence)
        => AutoplayCtgCouncilEvidence.Trace("Logos", vote, reasonCode, priority, threshold, evidence);
}
