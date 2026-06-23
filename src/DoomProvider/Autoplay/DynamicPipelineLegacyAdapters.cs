namespace AIKernel.Doom.Provider.Autoplay;

internal static class DynamicPipelineLegacyAdapters
{
    /// <summary>
    /// [EN] Executes the <c></c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c></c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="definition">
    /// [EN] Supplies the <c>definition</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>definition</c> value です。
    /// </param>
    /// <param name="events">
    /// [EN] Supplies the <c>events</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>events</c> value です。
    /// </param>
    /// <param name="deprecations">
    /// [EN] Supplies the <c>deprecations</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>deprecations</c> value です。
    /// </param>
    public static void ApplyDetect(
        AutoplayPipelineDefinition definition,
        List<PhainesisEventRule> events,
        List<string> deprecations)
    {
#pragma warning disable CS0618
        if (definition.Detect.Count == 0)
        {
            return;
        }

        deprecations.Add("detect { ... } is deprecated; use noesis.phainesis { event ... }.");
        events.AddRange(definition.Detect.Select(rule => new PhainesisEventRule(rule.Event, rule.From)));
#pragma warning restore CS0618
    }

    /// <summary>
    /// [EN] Executes the <c>ApplyHodosAndBehavior</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>ApplyHodosAndBehavior</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="definition">
    /// [EN] Supplies the <c>definition</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>definition</c> value です。
    /// </param>
    /// <param name="vectors">
    /// [EN] Supplies the <c>vectors</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>vectors</c> value です。
    /// </param>
    /// <param name="priorities">
    /// [EN] Supplies the <c>priorities</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>priorities</c> value です。
    /// </param>
    /// <param name="deprecations">
    /// [EN] Supplies the <c>deprecations</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>deprecations</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static List<string> ApplyHodosAndBehavior(
        AutoplayPipelineDefinition definition,
        List<MeaningVectorRule> vectors,
        List<string> priorities,
        List<string> deprecations)
    {
#pragma warning disable CS0618
        if (definition.Hodos.Count > 0)
        {
            deprecations.Add("hodos { ... } is deprecated; map compass/route signals through nous/topos.");
            vectors.AddRange(definition.Hodos.Select(rule => new MeaningVectorRule($"{rule.Vector}Vector", rule.From)));
        }

        if (definition.Behavior.Count == 0)
        {
            return priorities;
        }

        deprecations.Add("behavior { avoid/explore/combat/structure } is deprecated; use krisis.kairos priority axes.");
        return definition.Behavior
            .Select(MapLegacyBehavior)
            .Concat(priorities)
            .Distinct(StringComparer.Ordinal)
            .ToList();
#pragma warning restore CS0618
    }

    private static string MapLegacyBehavior(string behavior)
        => behavior.Trim().ToLowerInvariant() switch
        {
            "avoid" or "combat" => "pathos",
            "explore" or "structure" => "logos",
            _ => behavior.Trim().ToLowerInvariant()
        };
}
