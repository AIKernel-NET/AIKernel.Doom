namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayCtgCouncilEvidence
{
    /// <summary>
    /// [EN] Executes the <c>Score</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Score</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="proposal">
    /// [EN] Supplies the <c>proposal</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>proposal</c> value です。
    /// </param>
    /// <param name="symbol">
    /// [EN] Supplies the <c>symbol</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>symbol</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static float Score(CtgProposalPacket proposal, string symbol)
        => proposal.SemanticScores.TryGetValue(symbol, out var score) ? Math.Clamp(score, 0, 1) : 0;

    /// <summary>
    /// [EN] Executes the <c>MaxScore</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>MaxScore</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="proposal">
    /// [EN] Supplies the <c>proposal</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>proposal</c> value です。
    /// </param>
    /// <param name="symbols">
    /// [EN] Supplies the <c>symbols</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>symbols</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static float MaxScore(CtgProposalPacket proposal, params string[] symbols)
        => symbols.Select(symbol => Score(proposal, symbol)).DefaultIfEmpty().Max();

    /// <summary>
    /// [EN] Executes the <c>Trace</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Trace</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="council">
    /// [EN] Supplies the <c>council</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>council</c> value です。
    /// </param>
    /// <param name="vote">
    /// [EN] Supplies the <c>vote</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>vote</c> value です。
    /// </param>
    /// <param name="reasonCode">
    /// [EN] Supplies the <c>reasonCode</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>reasonCode</c> value です。
    /// </param>
    /// <param name="priority">
    /// [EN] Supplies the <c>priority</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>priority</c> value です。
    /// </param>
    /// <param name="threshold">
    /// [EN] Supplies the <c>threshold</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>threshold</c> value です。
    /// </param>
    /// <param name="evidence">
    /// [EN] Supplies the <c>evidence</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>evidence</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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
