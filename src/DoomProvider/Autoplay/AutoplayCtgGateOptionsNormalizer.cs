namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayCtgGateOptionsNormalizer
{
    /// <summary>
    /// [EN] Executes the <c>Normalize</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Normalize</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="options">
    /// [EN] Supplies the <c>options</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>options</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static CtgGateOptions Normalize(CtgGateOptions? options)
    {
        var value = options ?? new();
        return value with
        {
            Quorum = Math.Clamp(value.Quorum, 1, 3),
            LogosApprovalThreshold = Math.Clamp(value.LogosApprovalThreshold, 0, 1),
            EthosRejectDangerThreshold = Math.Clamp(value.EthosRejectDangerThreshold, 0, 1),
            PathosRejectDangerThreshold = Math.Clamp(value.PathosRejectDangerThreshold, 0, 1)
        };
    }
}
