namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Autoplay strategy that compiles a profile DSL into a deterministic runtime pipeline.
/// JA: profile DSL を deterministic runtime pipeline に compile する AutoPlay strategy です。
/// </summary>
public sealed class DynamicPipelineAutoplayStrategy : IAutoplayStrategy
{
    private readonly CompiledAutoplayPipeline _pipeline;

    public DynamicPipelineAutoplayStrategy(AutoplayOptimizationProfile? profile = null)
    {
        var effectiveProfile = profile ?? AutoplayOptimizationProfile.Default;
        _pipeline = AutoplayPipelineDslCompiler.Compile(effectiveProfile.Pipeline ?? AutoplayPipelineDefinition.Default, effectiveProfile);
    }

    public string StrategyName => _pipeline.StrategyName;

    public ActionCommand ExecuteTick(SensorFusion sensor, int recoveryFrames)
        => _pipeline.ExecuteTick(sensor, recoveryFrames);

    public AutoplayPipelineDecision EvaluateTick(SensorFusion sensor, int recoveryFrames)
        => _pipeline.EvaluateTick(sensor, recoveryFrames);
}
