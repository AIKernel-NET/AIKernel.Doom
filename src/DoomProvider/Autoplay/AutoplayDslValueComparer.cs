namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayDslValueComparer
{
    /// <summary>
    /// [EN] Executes the <c>Compare</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Compare</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="left">
    /// [EN] Supplies the <c>left</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>left</c> value です。
    /// </param>
    /// <param name="right">
    /// [EN] Supplies the <c>right</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>right</c> value です。
    /// </param>
    /// <param name="op">
    /// [EN] Supplies the <c>op</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>op</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static bool Compare(AutoplayDslValue left, AutoplayDslValue right, string op)
    {
        if (left.Kind == AutoplayDslValueKind.Text || right.Kind == AutoplayDslValueKind.Text)
        {
            var comparison = string.Equals(left.AsText(), right.AsText(), StringComparison.OrdinalIgnoreCase);
            return op switch
            {
                "==" => comparison,
                "!=" => !comparison,
                _ => false
            };
        }

        if (left.Kind == AutoplayDslValueKind.Boolean || right.Kind == AutoplayDslValueKind.Boolean)
        {
            var comparison = left.AsBoolean() == right.AsBoolean();
            return op switch
            {
                "==" => comparison,
                "!=" => !comparison,
                _ => false
            };
        }

        var leftNumber = left.AsNumber();
        var rightNumber = right.AsNumber();
        return op switch
        {
            ">=" => leftNumber >= rightNumber,
            "<=" => leftNumber <= rightNumber,
            "==" => Math.Abs(leftNumber - rightNumber) <= 0.0001f,
            "!=" => Math.Abs(leftNumber - rightNumber) > 0.0001f,
            ">" => leftNumber > rightNumber,
            "<" => leftNumber < rightNumber,
            _ => false
        };
    }
}
