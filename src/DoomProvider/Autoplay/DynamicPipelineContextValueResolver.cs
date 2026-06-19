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
            "selectedaxis" => AutoplayDslValue.Text(context.SelectedAxis),
            "actionrepeatframes" or "kinesisactionrepeatframes" or "repeatactionframes" =>
                AutoplayDslValue.Number(context.ActionRepeatFrames),
            "moverepeatframes" or "kinesismoverepeatframes" =>
                AutoplayDslValue.Number(context.MoveRepeatFrames),
            "turnrepeatframes" or "kinesisturnrepeatframes" or "repeatturnframes" =>
                AutoplayDslValue.Number(context.TurnRepeatFrames),
            _ => ResolveDynamicValue(context, normalized)
        };
    }

    private static AutoplayDslValue ResolveDynamicValue(DynamicPipelineContext context, string token)
    {
        if (TryResolveMap(context.SensorReadings, token, "sensor.", out var sensor)
            || TryResolveMap(context.Events, token, "event.", out sensor)
            || TryResolveMap(context.MeaningVectors, token, "vector.", out sensor)
            || TryResolveMap(context.ToposVectors, token, "topos.", out sensor)
            || TryResolveMap(context.Priorities, token, "priority.", out sensor))
        {
            return AutoplayDslValue.Number(sensor);
        }

        return AutoplayDslValue.Text(AutoplayDslExpressionSyntax.Unquote(token));
    }

    private static bool TryResolveMap(
        IReadOnlyDictionary<string, float> values,
        string token,
        string prefix,
        out float value)
    {
        value = 0;
        if (!token.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var key = token[prefix.Length..];
        return TryGet(values, key, out value);
    }

    private static bool TryGet(IReadOnlyDictionary<string, float> values, string key, out float value)
    {
        if (values.TryGetValue(key, out value))
        {
            return true;
        }

        foreach (var item in values)
        {
            if (string.Equals(item.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                value = item.Value;
                return true;
            }
        }

        value = 0;
        return false;
    }
}
