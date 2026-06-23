namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// [EN] Defines the <c>DynamicPipelineCompilationResult</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>DynamicPipelineCompilationResult</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
/// <param name="Ast">
/// [EN] Supplies the <c>Ast</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Ast</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Graph">
/// [EN] Supplies the <c>Graph</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Graph</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="Diagnostics">
/// [EN] Supplies the <c>Diagnostics</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>Diagnostics</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
/// <param name="DeprecationWarnings">
/// [EN] Supplies the <c>DeprecationWarnings</c> component of the record contract; constructor order is part of the source-level API.
/// [JA] record contract の <c>DeprecationWarnings</c> component です。constructor の順序も source-level API の一部として扱います。
/// </param>
public sealed record DynamicPipelineCompilationResult(
    DynamicPipelineAst Ast,
    DynamicPipelineGraph Graph,
    IReadOnlyList<string> Diagnostics,
    IReadOnlyList<string> DeprecationWarnings);

/// <summary>
/// [EN] Defines the <c>DynamicPipelineCompiler</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>DynamicPipelineCompiler</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public static class DynamicPipelineCompiler
{
    /// <summary>
    /// [EN] Executes the <c>Compile</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Compile</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="definition">
    /// [EN] Supplies the <c>definition</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>definition</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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

    /// <summary>
    /// [EN] Executes the <c>CompileScript</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>CompileScript</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="source">
    /// [EN] Supplies the <c>source</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>source</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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
