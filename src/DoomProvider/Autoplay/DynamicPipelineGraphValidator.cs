namespace AIKernel.Doom.Provider.Autoplay;

internal static class DynamicPipelineGraphValidator
{
    /// <summary>
    /// [EN] Executes the <c>Validate</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Validate</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="ast">
    /// [EN] Supplies the <c>ast</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>ast</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static IReadOnlyList<string> Validate(DynamicPipelineAst ast)
    {
        var diagnostics = new List<string>();
        RequireAny(ast.Aisthesis.Sensors, "aisthesis requires at least one raw sensor.", diagnostics);
        RequireAny(ast.Noesis.Phainesis.Events, "noesis.phainesis requires at least one event rule.", diagnostics);
        RequireAny(ast.Noesis.Nous.Vectors, "noesis.nous requires at least one vector rule.", diagnostics);
        RequireAny(ast.Krisis.Kairos.Priorities, "krisis.kairos requires priority axes.", diagnostics);
        RequireAny(ast.Kinesis.Zoe.VetoRules, "kinesis.zoe requires at least one veto rule.", diagnostics);

        var sensors = ast.Aisthesis.Sensors.ToHashSet(StringComparer.Ordinal);
        foreach (var rule in ast.Noesis.Phainesis.Events)
        {
            if (!sensors.Contains(rule.Source))
            {
                diagnostics.Add($"Undefined Phainesis source sensor '{rule.Source}' for event '{rule.Event}'.");
            }
        }

        var events = ast.Noesis.Phainesis.Events.Select(rule => rule.Event).ToHashSet(StringComparer.Ordinal);
        foreach (var rule in ast.Noesis.Nous.Vectors)
        {
            if (!events.Contains(rule.SourceEvent))
            {
                diagnostics.Add($"Undefined Phainesis event '{rule.SourceEvent}' for Nous vector '{rule.Vector}'.");
            }
        }

        foreach (var priority in ast.Krisis.Kairos.Priorities)
        {
            if (priority is not ("pathos" or "ethos" or "logos"))
            {
                diagnostics.Add($"Invalid Kairos priority axis '{priority}'. Use pathos, ethos, or logos.");
            }
        }

        foreach (var veto in ast.Kinesis.Zoe.VetoRules)
        {
            if (!UsesHealthOnly(veto.Expression))
            {
                diagnostics.Add(
                    $"Zoe veto '{veto.Expression}' must use only health, hp, lethalRisk, or health-state inputs.");
            }
        }

        return diagnostics;
    }

    private static bool UsesHealthOnly(string expression)
    {
        var tokens = expression
            .Replace("<=", " ", StringComparison.Ordinal)
            .Replace(">=", " ", StringComparison.Ordinal)
            .Replace("!=", " ", StringComparison.Ordinal)
            .Replace("==", " ", StringComparison.Ordinal)
            .Replace("<", " ", StringComparison.Ordinal)
            .Replace(">", " ", StringComparison.Ordinal)
            .Replace("&&", " ", StringComparison.Ordinal)
            .Replace("||", " ", StringComparison.Ordinal)
            .Replace("!", " ", StringComparison.Ordinal)
            .Split([' ', '\t', '(', ')'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return tokens.All(token =>
        {
            var normalized = token.ToLowerInvariant();
            return float.TryParse(token, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out _)
                || normalized is "health"
                    or "hp"
                    or "lethalrisk"
                    or "lowhealth"
                    or "criticalhealth"
                    or "lowhealthgoalfirst"
                    or "lowhealththreshold"
                    or "criticalhealththreshold"
                    or "true"
                    or "false";
        });
    }

    private static void RequireAny<T>(IReadOnlyList<T> values, string diagnostic, List<string> diagnostics)
    {
        if (values.Count == 0)
        {
            diagnostics.Add(diagnostic);
        }
    }
}
