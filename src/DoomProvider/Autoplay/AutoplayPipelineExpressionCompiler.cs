namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayPipelineExpressionCompiler
{
    public static Func<DynamicPipelineContext, bool> CompileDynamicPredicate(string expression)
    {
        var text = AutoplayDslExpressionSyntax.Normalize(expression);
        if (string.Equals(text, "true", StringComparison.OrdinalIgnoreCase))
        {
            return _ => true;
        }

        if (string.Equals(text, "false", StringComparison.OrdinalIgnoreCase))
        {
            return _ => false;
        }

        var orTerms = AutoplayDslExpressionSyntax.SplitOrTerms(text)
            .Select(CompileDynamicAndExpression)
            .ToArray();

        return context => orTerms.Any(term => term(context));
    }

    public static Func<AutoplayPipelineContext, bool> CompileBooleanExpression(string expression)
    {
        var text = AutoplayDslExpressionSyntax.Normalize(expression);
        if (string.Equals(text, "true", StringComparison.OrdinalIgnoreCase))
        {
            return _ => true;
        }

        if (string.Equals(text, "false", StringComparison.OrdinalIgnoreCase))
        {
            return _ => false;
        }

        var orTerms = AutoplayDslExpressionSyntax.SplitOrTerms(text)
            .Select(CompileAndExpression)
            .ToArray();

        return context => orTerms.Any(term => term(context));
    }

    public static Func<AutoplayPipelineContext, int> CompileIntExpression(string expression)
    {
        var text = AutoplayDslExpressionSyntax.Normalize(expression);
        return context => (int)MathF.Round(AutoplayPipelineContextValueResolver.Resolve(context, text).AsNumber());
    }

    private static Func<DynamicPipelineContext, bool> CompileDynamicAndExpression(string expression)
    {
        var terms = AutoplayDslExpressionSyntax.SplitAndTerms(expression)
            .Select(CompileDynamicBooleanAtom)
            .ToArray();

        return context => terms.All(term => term(context));
    }

    private static Func<DynamicPipelineContext, bool> CompileDynamicBooleanAtom(string expression)
    {
        var atom = AutoplayDslExpressionSyntax.Normalize(expression);
        if (AutoplayDslExpressionSyntax.TryReadComparison(atom, out var leftToken, out var op, out var rightToken))
        {
            return context => AutoplayDslValueComparer.Compare(
                DynamicPipelineContextValueResolver.Resolve(context, leftToken),
                DynamicPipelineContextValueResolver.Resolve(context, rightToken),
                op);
        }

        return context => DynamicPipelineContextValueResolver.Resolve(context, atom).AsBoolean();
    }

    private static Func<AutoplayPipelineContext, bool> CompileAndExpression(string expression)
    {
        var terms = AutoplayDslExpressionSyntax.SplitAndTerms(expression)
            .Select(CompileBooleanAtom)
            .ToArray();

        return context => terms.All(term => term(context));
    }

    private static Func<AutoplayPipelineContext, bool> CompileBooleanAtom(string expression)
    {
        var atom = AutoplayDslExpressionSyntax.Normalize(expression);
        if (AutoplayDslExpressionSyntax.TryReadComparison(atom, out var leftToken, out var op, out var rightToken))
        {
            return context => AutoplayDslValueComparer.Compare(
                AutoplayPipelineContextValueResolver.Resolve(context, leftToken),
                AutoplayPipelineContextValueResolver.Resolve(context, rightToken),
                op);
        }

        return context => AutoplayPipelineContextValueResolver.Resolve(context, atom).AsBoolean();
    }
}
