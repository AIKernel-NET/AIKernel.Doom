namespace AIKernel.Doom.Provider.Autoplay;

public static class AutoplayPipelineDslCompiler
{
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
