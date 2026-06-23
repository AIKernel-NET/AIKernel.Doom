namespace AIKernel.Doom.Provider;

using AIKernel.Doom.Wasm;

/// <summary>
/// [EN] Defines the <c>DoomProviderOptions</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>DoomProviderOptions</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public sealed record DoomProviderOptions
{
    /// <summary>
    /// EN: Executes Wasm.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Wasm を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    public DoomWasmOptions Wasm { get; init; } = new();
    /// <summary>
    /// EN: Gets PreferWebGpu.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] PreferWebGpu を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public bool PreferWebGpu { get; init; } = true;
    /// <summary>
    /// EN: Gets VerboseStatus.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] VerboseStatus を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public bool VerboseStatus { get; init; }
    /// <summary>
    /// EN: Gets BonsaiModelPath.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] BonsaiModelPath を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public string? BonsaiModelPath { get; init; }
}
