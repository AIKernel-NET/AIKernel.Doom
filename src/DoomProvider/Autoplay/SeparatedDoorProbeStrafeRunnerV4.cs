namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// [EN] Defines the <c>SeparatedDoorProbeStrafeRunnerV4</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>SeparatedDoorProbeStrafeRunnerV4</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public sealed class SeparatedDoorProbeStrafeRunnerV4 : IAutoplayStrategy
{
    private readonly DynamicPipelineAutoplayStrategy _strategy;
    /// <summary>
    /// EN: Executes SeparatedDoorProbeStrafeRunnerV4.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] SeparatedDoorProbeStrafeRunnerV4 を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public SeparatedDoorProbeStrafeRunnerV4(AutoplayOptimizationProfile? profile = null)
    {
        _strategy = new DynamicPipelineAutoplayStrategy(profile ?? AutoplayOptimizationProfile.Default);
    }
    /// <summary>
    /// EN: Gets StrategyName.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] StrategyName を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

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
    public string StrategyName => _strategy.StrategyName;
    /// <summary>
    /// EN: Executes ExecuteTick.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] ExecuteTick を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

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
        => _strategy.ExecuteTick(sensor, recoveryFrames);
}
