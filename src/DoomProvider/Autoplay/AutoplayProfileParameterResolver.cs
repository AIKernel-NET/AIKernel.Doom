namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayProfileParameterResolver
{
    /// <summary>
    /// [EN] Executes the <c>Resolve</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Resolve</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="profile">
    /// [EN] Supplies the <c>profile</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>profile</c> value です。
    /// </param>
    /// <param name="name">
    /// [EN] Supplies the <c>name</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>name</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static AutoplayDslValue Resolve(AutoplayOptimizationProfile profile, string name)
    {
        if (!AutoplayOptimizationProfileParameters.TryGetValue(profile, name, out var value))
        {
            return AutoplayDslValue.Number(0);
        }

        return value switch
        {
            bool boolean => AutoplayDslValue.Boolean(boolean),
            int number => AutoplayDslValue.Number(number),
            float number => AutoplayDslValue.Number(number),
            double number => AutoplayDslValue.Number((float)number),
            _ => AutoplayDslValue.Number(0)
        };
    }
}
