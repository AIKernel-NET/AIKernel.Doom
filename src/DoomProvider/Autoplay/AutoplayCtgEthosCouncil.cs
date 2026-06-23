namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayCtgEthosCouncil
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
