namespace AIKernel.Doom.Provider.Autoplay;
/// <summary>
/// EN: Represents SeparatedDoorProbeStrafeRunnerV4.
/// EN: Documentation for public API. JA: SeparatedDoorProbeStrafeRunnerV4 を表します。
/// </summary>

public sealed class SeparatedDoorProbeStrafeRunnerV4 : IAutoplayStrategy
{
    private readonly DynamicPipelineAutoplayStrategy _strategy;
    /// <summary>
    /// EN: Executes SeparatedDoorProbeStrafeRunnerV4.
    /// EN: Documentation for public API. JA: SeparatedDoorProbeStrafeRunnerV4 を実行します。
    /// </summary>

    public SeparatedDoorProbeStrafeRunnerV4(AutoplayOptimizationProfile? profile = null)
    {
        _strategy = new DynamicPipelineAutoplayStrategy(profile ?? AutoplayOptimizationProfile.Default);
    }
    /// <summary>
    /// EN: Gets StrategyName.
    /// EN: Documentation for public API. JA: StrategyName を取得します。
    /// </summary>

    public string StrategyName => _strategy.StrategyName;
    /// <summary>
    /// EN: Executes ExecuteTick.
    /// EN: Documentation for public API. JA: ExecuteTick を実行します。
    /// </summary>

    public ActionCommand ExecuteTick(SensorFusion sensor, int recoveryFrames)
        => _strategy.ExecuteTick(sensor, recoveryFrames);
}
