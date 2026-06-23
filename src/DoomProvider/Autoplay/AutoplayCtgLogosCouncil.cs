namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayCtgLogosCouncil
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
