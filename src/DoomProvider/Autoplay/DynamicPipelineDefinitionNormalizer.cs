namespace AIKernel.Doom.Provider.Autoplay;

internal sealed record DynamicPipelineNormalizedDefinition(
    IReadOnlyList<string> Sensors,
    IReadOnlyList<PhainesisEventRule> Events,
    IReadOnlyList<MeaningVectorRule> Vectors,
    ToposAstNode Topos,
    IReadOnlyList<string> Priorities,
    KinesisActionAstNode Motion,
    IReadOnlyList<ZoeVetoRule> VetoRules,
    IReadOnlyList<string> DeprecationWarnings);

internal static class DynamicPipelineDefinitionNormalizer
{
    public static DynamicPipelineNormalizedDefinition Normalize(AutoplayPipelineDefinition definition)
    {
        var deprecations = new List<string>();
        var sensors = NormalizeList(definition.Aisthesis.Sensors, DynamicPipelineDefaults.Sensors);
        var events = NormalizeEvents(definition.Noesis.Phainesis.Events);
        var vectors = NormalizeVectors(definition.Noesis.Nous.Vectors);
        var priorities = NormalizeList(definition.Krisis.Kairos.Priorities, DynamicPipelineDefaults.Priorities);
        var vetoRules = NormalizeVeto(definition.Kinesis.Zoe.VetoRules);

        if (events.Count == 0)
        {
            events.AddRange(DynamicPipelineDefaults.Events);
        }

        DynamicPipelineLegacyAdapters.ApplyDetect(definition, events, deprecations);

        if (vectors.Count == 0)
        {
            vectors.AddRange(events.Select(rule => new MeaningVectorRule($"{rule.Event}Vector", rule.Event)));
        }

        priorities = DynamicPipelineLegacyAdapters.ApplyHodosAndBehavior(definition, vectors, priorities, deprecations);

        if (vetoRules.Count == 0)
        {
            vetoRules.AddRange(DynamicPipelineDefaults.ZoeVetoRules);
        }

        return new DynamicPipelineNormalizedDefinition(
            sensors,
            events.DistinctBy(rule => rule.Event).ToArray(),
            vectors.DistinctBy(rule => rule.Vector).ToArray(),
            ToAst(definition.Krisis.Topos),
            priorities,
            ToAst(definition.Kinesis.Kinesis.Actions.Count > 0 ? definition.Kinesis.Kinesis : definition.Kinesis.Motion),
            vetoRules,
            deprecations);
    }

    private static List<string> NormalizeList(IEnumerable<string>? values, IEnumerable<string> fallback)
    {
        var normalized = (values ?? [])
            .Select(value => (value ?? string.Empty).Trim())
            .Where(value => value.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .ToList();
        return normalized.Count == 0 ? fallback.ToList() : normalized;
    }

    private static List<PhainesisEventRule> NormalizeEvents(IEnumerable<AutoplayPhainesisEventDefinition>? events)
        => (events ?? [])
            .Where(rule => !string.IsNullOrWhiteSpace(rule.Event))
            .Select(rule => new PhainesisEventRule(rule.Event.Trim(), string.IsNullOrWhiteSpace(rule.From) ? "visual" : rule.From.Trim()))
            .ToList();

    private static List<MeaningVectorRule> NormalizeVectors(IEnumerable<AutoplayNousVectorDefinition>? vectors)
        => (vectors ?? [])
            .Where(rule => !string.IsNullOrWhiteSpace(rule.Vector))
            .Select(rule => new MeaningVectorRule(rule.Vector.Trim(), string.IsNullOrWhiteSpace(rule.From) ? rule.Vector.Trim() : rule.From.Trim()))
            .ToList();

    private static List<ZoeVetoRule> NormalizeVeto(IEnumerable<AutoplayZoeVetoDefinition>? rules)
        => (rules ?? [])
            .Where(rule => !string.IsNullOrWhiteSpace(rule.When))
            .Select(rule => new ZoeVetoRule(rule.When.Trim()))
            .ToList();

    private static ToposAstNode ToAst(AutoplayToposDefinition definition)
    {
        var vectors = NormalizeList(definition.Vectors, DynamicPipelineDefaults.ToposVectors);
        return new ToposAstNode { Vectors = vectors };
    }

    private static KinesisActionAstNode ToAst(AutoplayKinesisDefinition definition)
    {
        var actions = NormalizeList(definition.Actions, DynamicPipelineDefaults.KinesisActions);
        return new KinesisActionAstNode { Actions = actions };
    }
}
