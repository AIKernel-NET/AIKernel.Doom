namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayDslExpressionSyntax
{
    private static readonly string[] ComparisonOperators = [">=", "<=", "==", "!=", ">", "<"];

    /// <summary>
    /// [EN] Executes the <c>Normalize</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Normalize</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="expression">
    /// [EN] Supplies the <c>expression</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>expression</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static string Normalize(string? expression)
        => string.IsNullOrWhiteSpace(expression) ? "false" : expression.Trim();

    /// <summary>
    /// [EN] Executes the <c>SplitOrTerms</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>SplitOrTerms</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="expression">
    /// [EN] Supplies the <c>expression</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>expression</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static string[] SplitOrTerms(string expression)
        => expression.Split("||", StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

    /// <summary>
    /// [EN] Executes the <c>SplitAndTerms</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>SplitAndTerms</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="expression">
    /// [EN] Supplies the <c>expression</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>expression</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static string[] SplitAndTerms(string expression)
        => expression.Split("&&", StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

    /// <summary>
    /// [EN] Executes the <c>TryReadComparison</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>TryReadComparison</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="expression">
    /// [EN] Supplies the <c>expression</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>expression</c> value です。
    /// </param>
    /// <param name="leftToken">
    /// [EN] Supplies the <c>leftToken</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>leftToken</c> value です。
    /// </param>
    /// <param name="op">
    /// [EN] Supplies the <c>op</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>op</c> value です。
    /// </param>
    /// <param name="rightToken">
    /// [EN] Supplies the <c>rightToken</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>rightToken</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static bool TryReadComparison(
        string expression,
        out string leftToken,
        out string op,
        out string rightToken)
    {
        foreach (var candidate in ComparisonOperators)
        {
            var index = expression.IndexOf(candidate, StringComparison.Ordinal);
            if (index <= 0)
            {
                continue;
            }

            leftToken = expression[..index].Trim();
            op = candidate;
            rightToken = expression[(index + candidate.Length)..].Trim();
            return true;
        }

        leftToken = string.Empty;
        op = string.Empty;
        rightToken = string.Empty;
        return false;
    }

    /// <summary>
    /// [EN] Executes the <c>Unquote</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Unquote</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="value">
    /// [EN] Supplies the <c>value</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>value</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static string Unquote(string value)
        => value.Length >= 2
            && ((value[0] == '"' && value[^1] == '"') || (value[0] == '\'' && value[^1] == '\''))
                ? value[1..^1]
                : value;
}
