namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Autoplay strategy that compiles a profile DSL into a deterministic runtime pipeline.
/// JA: profile DSL を deterministic runtime pipeline に compile する AutoPlay strategy です。
/// </summary>
public sealed class DynamicPipelineAutoplayStrategy : IAutoplayStrategy
{
    private readonly CompiledAutoplayPipeline _pipeline;

    /// <summary>
    /// [EN] Creates a dynamic autoplay strategy from an optimization profile or the default profile.
    /// [JA] optimization profile または default profile から dynamic autoplay strategy を作成します。
    /// </summary>
    /// <param name="profile">
    /// [EN] The optional profile that supplies DSL pipeline stages and tuning values.
    /// [JA] DSL pipeline stage と tuning value を提供する任意の profile です。
    /// </param>
    public DynamicPipelineAutoplayStrategy(AutoplayOptimizationProfile? profile = null)
    {
        var effectiveProfile = profile ?? AutoplayOptimizationProfile.Default;
        _pipeline = AutoplayPipelineDslCompiler.Compile(effectiveProfile.Pipeline ?? AutoplayPipelineDefinition.Default, effectiveProfile);
    }

    /// <summary>
    /// [EN] Executes the <c>StrategyName</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>StrategyName</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public string StrategyName => _pipeline.StrategyName;

    /// <summary>
    /// [EN] Executes the <c>ExecuteTick</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>ExecuteTick</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="sensor">
    /// [EN] Supplies the <c>sensor</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>sensor</c> value です。
    /// </param>
    /// <param name="recoveryFrames">
    /// [EN] Supplies the <c>recoveryFrames</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>recoveryFrames</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public ActionCommand ExecuteTick(SensorFusion sensor, int recoveryFrames)
        => _pipeline.ExecuteTick(sensor, recoveryFrames);

    /// <summary>
    /// [EN] Executes the <c>EvaluateTick</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>EvaluateTick</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="sensor">
    /// [EN] Supplies the <c>sensor</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>sensor</c> value です。
    /// </param>
    /// <param name="recoveryFrames">
    /// [EN] Supplies the <c>recoveryFrames</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>recoveryFrames</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public AutoplayPipelineDecision EvaluateTick(SensorFusion sensor, int recoveryFrames)
        => _pipeline.EvaluateTick(sensor, recoveryFrames);
}
