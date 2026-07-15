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
    {
        var text = string.IsNullOrWhiteSpace(expression) ? "false" : expression.Trim();
        while (IsWrappedBySingleParentheses(text))
        {
            text = text[1..^1].Trim();
        }

        return string.IsNullOrWhiteSpace(text) ? "false" : text;
    }

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
        => SplitTopLevel(expression, "||");

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
        => SplitTopLevel(expression, "&&");

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

    /// <summary>
    /// [EN] Detects whether the normalized expression still contains a top-level logical operator.
    /// [JA] 正規化済み expression に、まだ top-level の logical operator が含まれるかを検出します。
    /// </summary>
    /// <param name="expression">
    /// [EN] Supplies the normalized DSL expression to inspect.
    /// [JA] 検査対象の正規化済み DSL expression です。
    /// </param>
    /// <returns>
    /// [EN] <c>true</c> when recursive boolean compilation is required.
    /// [JA] 再帰的な boolean compile が必要な場合は <c>true</c> です。
    /// </returns>
    public static bool HasTopLevelLogicalOperator(string expression)
        => SplitTopLevel(expression, "||").Length > 1
            || SplitTopLevel(expression, "&&").Length > 1;

    private static string[] SplitTopLevel(string expression, string op)
    {
        var text = string.IsNullOrWhiteSpace(expression) ? "false" : expression.Trim();
        var terms = new List<string>();
        var start = 0;
        var depth = 0;
        var quote = '\0';

        for (var index = 0; index < text.Length; index++)
        {
            var current = text[index];
            if (quote != '\0')
            {
                if (current == quote)
                {
                    quote = '\0';
                }

                continue;
            }

            if (current is '"' or '\'')
            {
                quote = current;
                continue;
            }

            if (current == '(')
            {
                depth++;
                continue;
            }

            if (current == ')')
            {
                depth = Math.Max(0, depth - 1);
                continue;
            }

            if (depth == 0
                && index + op.Length <= text.Length
                && string.CompareOrdinal(text, index, op, 0, op.Length) == 0)
            {
                AddTerm(text[start..index]);
                index += op.Length - 1;
                start = index + 1;
            }
        }

        AddTerm(text[start..]);
        return terms.Count == 0 ? ["false"] : terms.ToArray();

        void AddTerm(string term)
        {
            var normalized = term.Trim();
            if (!string.IsNullOrWhiteSpace(normalized))
            {
                terms.Add(normalized);
            }
        }
    }

    private static bool IsWrappedBySingleParentheses(string expression)
    {
        if (expression.Length < 2 || expression[0] != '(' || expression[^1] != ')')
        {
            return false;
        }

        var depth = 0;
        var quote = '\0';
        for (var index = 0; index < expression.Length; index++)
        {
            var current = expression[index];
            if (quote != '\0')
            {
                if (current == quote)
                {
                    quote = '\0';
                }

                continue;
            }

            if (current is '"' or '\'')
            {
                quote = current;
                continue;
            }

            if (current == '(')
            {
                depth++;
                continue;
            }

            if (current == ')')
            {
                depth--;
                if (depth == 0 && index < expression.Length - 1)
                {
                    return false;
                }
            }

            if (depth < 0)
            {
                return false;
            }
        }

        return depth == 0;
    }
}
