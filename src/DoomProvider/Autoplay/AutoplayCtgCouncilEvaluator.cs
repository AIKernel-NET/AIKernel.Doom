namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayCtgCouncilEvaluator
{
    public static IReadOnlyList<CouncilDecisionTrace> Evaluate(CtgProposalPacket proposal, CtgGateOptions options)
        =>
        [
            AutoplayCtgLogosCouncil.Evaluate(proposal, options),
            AutoplayCtgEthosCouncil.Evaluate(proposal, options),
            AutoplayCtgPathosCouncil.Evaluate(proposal, options)
        ];
}
