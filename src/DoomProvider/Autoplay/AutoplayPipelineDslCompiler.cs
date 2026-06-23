namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// [EN] Defines the <c>AutoplayPipelineDslCompiler</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>AutoplayPipelineDslCompiler</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public static class AutoplayPipelineDslCompiler
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
    /// <param name="profile">
    /// [EN] Supplies the <c>profile</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>profile</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static CompiledAutoplayPipeline Compile(
        AutoplayPipelineDefinition definition,
        AutoplayOptimizationProfile profile)
    {
        ArgumentNullException.ThrowIfNull(definition);
        ArgumentNullException.ThrowIfNull(profile);

        var dynamicCompilation = DynamicPipelineCompiler.Compile(definition);
        if (dynamicCompilation.Diagnostics.Count > 0)
        {
            throw new InvalidOperationException("Dynamic pipeline DSL is invalid: " + string.Join("; ", dynamicCompilation.Diagnostics));
        }

        var defaultThreshold = Math.Max(0, definition.Arbitration?.DefaultThreshold ?? 0);
        var stages = definition.Stages
            .Where(stage => !string.IsNullOrWhiteSpace(stage.Id))
            .OrderByDescending(stage => stage.Priority)
            .ThenBy(stage => stage.Id, StringComparer.Ordinal)
            .Select(stage => CompileStage(stage, defaultThreshold))
            .ToArray();
        var semanticSymbols = definition.SemanticMemory
            .Select(symbol => symbol.Id)
            .Concat(definition.Stages.SelectMany(stage => stage.Evidence.Keys))
            .Where(symbol => !string.IsNullOrWhiteSpace(symbol))
            .Select(symbol => symbol.Trim().ToLowerInvariant())
            .Distinct(StringComparer.Ordinal)
            .OrderBy(symbol => symbol, StringComparer.Ordinal)
            .ToArray();

        return new CompiledAutoplayPipeline(
            string.IsNullOrWhiteSpace(definition.Name) ? profile.StrategyName : definition.Name,
            stages,
            semanticSymbols,
            dynamicCompilation.Graph,
            dynamicCompilation.Ast.Kinesis.Zoe.VetoRules,
            profile);
    }

    /// <summary>
    /// [EN] Executes the <c>CompileDynamicPredicate</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>CompileDynamicPredicate</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="expression">
    /// [EN] Supplies the <c>expression</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>expression</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static Func<DynamicPipelineContext, bool> CompileDynamicPredicate(string expression)
        => AutoplayPipelineExpressionCompiler.CompileDynamicPredicate(expression);

    private static CompiledAutoplayPipelineStage CompileStage(AutoplayPipelineStageDefinition stage, float defaultThreshold)
        => new(
            stage.Id,
            stage.Objective,
            stage.Priority,
            stage.Threshold > 0 || stage.Evidence.Count == 0 ? stage.Threshold : defaultThreshold,
            stage.Evidence,
            AutoplayPipelineExpressionCompiler.CompileBooleanExpression(stage.When),
            CompileAction(stage.Action));

    private static Func<AutoplayPipelineContext, ActionCommand> CompileAction(IReadOnlyDictionary<string, string> action)
    {
        var moveForward = AutoplayPipelineExpressionCompiler.CompileBooleanExpression(Read(action, "moveForward", "false"));
        var moveBackward = AutoplayPipelineExpressionCompiler.CompileBooleanExpression(Read(action, "moveBackward", "false"));
        var strafeLeft = AutoplayPipelineExpressionCompiler.CompileBooleanExpression(Read(action, "strafeLeft", "false"));
        var strafeRight = AutoplayPipelineExpressionCompiler.CompileBooleanExpression(Read(action, "strafeRight", "false"));
        var useKey = AutoplayPipelineExpressionCompiler.CompileBooleanExpression(Read(action, "useKey", "false"));
        var attackKey = AutoplayPipelineExpressionCompiler.CompileBooleanExpression(Read(action, "attackKey", "false"));
        var turnYaw = AutoplayPipelineExpressionCompiler.CompileIntExpression(Read(action, "turnYaw", "0"));

        return context => new ActionCommand(
            moveForward(context),
            moveBackward(context),
            strafeLeft(context),
            strafeRight(context),
            turnYaw(context),
            useKey(context),
            attackKey(context));
    }

    private static string Read(IReadOnlyDictionary<string, string> action, string key, string fallback)
        => action.TryGetValue(key, out var value) ? value : fallback;
}
