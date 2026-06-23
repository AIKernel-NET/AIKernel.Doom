namespace AIKernel.Doom.Provider;
/// <summary>
/// EN: Defines DoomBackendKind values.
/// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] DoomBackendKind の値を定義します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
/// </summary>

/// <summary>
/// [EN] Defines the <c>DoomBackendKind</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>DoomBackendKind</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public enum DoomBackendKind
{
    /// <summary>
    /// [EN] Indicates that the rendering or compute backend has not been identified yet.
    /// [JA] rendering または compute backend がまだ識別されていないことを示します。
    /// </summary>
    Unknown,

    /// <summary>
    /// [EN] Indicates the browser WebGPU renderer path.
    /// [JA] browser WebGPU renderer path を示します。
    /// </summary>
    WebGpu,

    /// <summary>
    /// [EN] Indicates the CPU fallback renderer path after GPU selection or loss.
    /// [JA] GPU selection または GPU loss 後の CPU fallback renderer path を示します。
    /// </summary>
    CpuFallback,

    /// <summary>
    /// [EN] Indicates the WebGPU compute provider path used for texture-backed inference or HUD work.
    /// [JA] texture-backed inference または HUD work に使用される WebGPU compute provider path を示します。
    /// </summary>
    WebGpuComputeProvider,

    /// <summary>
    /// [EN] Indicates that the WebGPU compute provider has fallen back to CPU execution.
    /// [JA] WebGPU compute provider が CPU execution に fallback したことを示します。
    /// </summary>
    WebGpuComputeCpuFallback
}
