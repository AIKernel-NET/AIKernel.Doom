namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// [EN] Defines the <c>DynamicPipelineBuilder</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>DynamicPipelineBuilder</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public sealed class DynamicPipelineBuilder
{
    private readonly List<string> diagnostics = [];
    private readonly List<string> deprecationWarnings = [];

    /// <summary>
    /// [EN] Executes the <c>Build</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Build</c> operation を実行します。
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

    /// <summary>
    /// [EN] Executes the <c>AddDeprecation</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>AddDeprecation</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="warning">
    /// [EN] Supplies the <c>warning</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>warning</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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
