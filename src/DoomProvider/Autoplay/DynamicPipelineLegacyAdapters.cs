namespace AIKernel.Doom.Provider.Autoplay;

internal static class DynamicPipelineLegacyAdapters
{
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
