namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayPipelineExpressionCompiler
{
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

    /// <summary>
    /// [EN] Executes the <c>CompileBooleanExpression</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>CompileBooleanExpression</c> operation を実行します。
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

    /// <summary>
    /// [EN] Executes the <c>CompileIntExpression</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>CompileIntExpression</c> operation を実行します。
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
