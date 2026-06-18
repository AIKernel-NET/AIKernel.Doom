namespace AIKernel.Doom.Provider.Autoplay;

public sealed record DynamicPipelineCompilationResult(
    DynamicPipelineAst Ast,
    DynamicPipelineGraph Graph,
    IReadOnlyList<string> Diagnostics,
    IReadOnlyList<string> DeprecationWarnings);

public static class DynamicPipelineCompiler
{
    public static DynamicPipelineCompilationResult Compile(AutoplayPipelineDefinition definition)
    {
        ArgumentNullException.ThrowIfNull(definition);
        var normalized = DynamicPipelineDefinitionNormalizer.Normalize(definition);

        var ast = new DynamicPipelineAst
        {
            Aisthesis = new SensorIngressAst { Sensors = normalized.Sensors },
            Noesis = new NoesisAstNode
            {
                Phainesis = new PhainesisAstNode { Events = normalized.Events },
                Nous = new MeaningVectorAst { Vectors = normalized.Vectors }
            },
            Krisis = new KrisisAstNode
            {
                Topos = normalized.Topos,
                Kairos = new PriorityAxisAst { Priorities = normalized.Priorities }
            },
            Kinesis = new KinesisLayerAstNode
            {
                Motion = normalized.Motion,
                Zoe = new ZoeAstNode { VetoRules = normalized.VetoRules }
            }
        };

        var builder = new DynamicPipelineBuilder();
        foreach (var warning in normalized.DeprecationWarnings)
        {
            builder.AddDeprecation(warning);
        }

        var graph = builder.Build(ast);
        return new DynamicPipelineCompilationResult(
            ast,
            graph,
            graph.Diagnostics,
            graph.DeprecationWarnings);
    }

    public static DynamicPipelineCompilationResult CompileScript(string source)
    {
        if (string.IsNullOrWhiteSpace(source))
        {
            throw new ArgumentException("DSL source is empty.", nameof(source));
        }

        var parsed = DynamicPipelineDslParser.Parse(source);
        var result = Compile(parsed.Definition);

        return result with
        {
            Diagnostics = result.Diagnostics.Concat(parsed.Diagnostics).ToArray()
        };
    }
}
