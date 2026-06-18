namespace AIKernel.Doom.Provider.Autoplay;

internal static class DynamicPipelineContextValueResolver
{
    public static AutoplayDslValue Resolve(DynamicPipelineContext context, string token)
    {
        var normalized = AutoplayDslExpressionSyntax.Normalize(token);
        if (normalized.StartsWith("-", StringComparison.Ordinal) && normalized.Length > 1)
        {
            return AutoplayDslValue.Number(-Resolve(context, normalized[1..]).AsNumber());
        }

        if (float.TryParse(normalized, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var number))
        {
            return AutoplayDslValue.Number(number);
        }

        return normalized.ToLowerInvariant() switch
        {
            "true" => AutoplayDslValue.Boolean(true),
            "false" => AutoplayDslValue.Boolean(false),
            "health" or "hp" => AutoplayDslValue.Number(context.Health),
            "lethalrisk" => AutoplayDslValue.Number(context.LethalRisk),
            _ => AutoplayDslValue.Text(AutoplayDslExpressionSyntax.Unquote(normalized))
        };
    }
}
