namespace AIKernel.Doom.Provider.Autoplay;

public sealed class DynamicPipelineBuilder
{
    private readonly List<string> diagnostics = [];
    private readonly List<string> deprecationWarnings = [];

    public DynamicPipelineGraph Build(DynamicPipelineAst ast)
    {
        ArgumentNullException.ThrowIfNull(ast);

        diagnostics.AddRange(DynamicPipelineGraphValidator.Validate(ast));
        var nodes = new[]
        {
            Node("aisthesis", DynamicPipelineStageKind.Aisthesis, [], ast.Aisthesis.Sensors),
            Node(
                "phainesis",
                DynamicPipelineStageKind.Phainesis,
                ast.Aisthesis.Sensors,
                ast.Noesis.Phainesis.Events.Select(rule => rule.Event)),
            Node(
                "nous",
                DynamicPipelineStageKind.Nous,
                ast.Noesis.Phainesis.Events.Select(rule => rule.Event),
                ast.Noesis.Nous.Vectors.Select(rule => rule.Vector)),
            Node("topos", DynamicPipelineStageKind.Topos, ast.Noesis.Nous.Vectors.Select(rule => rule.Vector), ast.Krisis.Topos.Vectors),
            Node("kairos", DynamicPipelineStageKind.Kairos, ast.Krisis.Topos.Vectors, ast.Krisis.Kairos.Priorities),
            Node("kinesis", DynamicPipelineStageKind.Kinesis, ast.Krisis.Kairos.Priorities, ast.Kinesis.Motion.Actions),
            Node("zoe", DynamicPipelineStageKind.Zoe, ["health"], ["safeAction", "svcEvent"])
        };

        return new DynamicPipelineGraph
        {
            Nodes = nodes,
            Diagnostics = diagnostics.ToArray(),
            DeprecationWarnings = deprecationWarnings.ToArray()
        };
    }

    public void AddDeprecation(string warning)
    {
        if (!string.IsNullOrWhiteSpace(warning))
        {
            deprecationWarnings.Add(warning);
        }
    }

    private static DynamicPipelineNode Node(
        string id,
        DynamicPipelineStageKind stage,
        IEnumerable<string> inputs,
        IEnumerable<string> outputs)
        => new()
        {
            Id = id,
            Stage = stage,
            Inputs = inputs.Where(value => !string.IsNullOrWhiteSpace(value)).Distinct(StringComparer.Ordinal).ToArray(),
            Outputs = outputs.Where(value => !string.IsNullOrWhiteSpace(value)).Distinct(StringComparer.Ordinal).ToArray()
        };
}
