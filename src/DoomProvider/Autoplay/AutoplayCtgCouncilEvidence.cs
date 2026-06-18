namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayCtgCouncilEvidence
{
    public static float Score(CtgProposalPacket proposal, string symbol)
        => proposal.SemanticScores.TryGetValue(symbol, out var score) ? Math.Clamp(score, 0, 1) : 0;

    public static float MaxScore(CtgProposalPacket proposal, params string[] symbols)
        => symbols.Select(symbol => Score(proposal, symbol)).DefaultIfEmpty().Max();

    public static CouncilDecisionTrace Trace(
        string council,
        CtgCouncilVote vote,
        string reasonCode,
        int priority,
        float threshold,
        params (string Key, float Value)[] evidence)
        => new(
            council,
            vote,
            reasonCode,
            priority,
            threshold,
            evidence.ToDictionary(item => item.Key, item => item.Value, StringComparer.Ordinal));
}
