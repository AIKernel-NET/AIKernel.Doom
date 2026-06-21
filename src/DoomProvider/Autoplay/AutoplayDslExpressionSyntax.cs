namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayDslExpressionSyntax
{
    private static readonly string[] ComparisonOperators = [">=", "<=", "==", "!=", ">", "<"];

    public static string Normalize(string? expression)
        => string.IsNullOrWhiteSpace(expression) ? "false" : expression.Trim();

    public static string[] SplitOrTerms(string expression)
        => expression.Split("||", StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

    public static string[] SplitAndTerms(string expression)
        => expression.Split("&&", StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

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

    public static string Unquote(string value)
        => value.Length >= 2
            && ((value[0] == '"' && value[^1] == '"') || (value[0] == '\'' && value[^1] == '\''))
                ? value[1..^1]
                : value;
}
