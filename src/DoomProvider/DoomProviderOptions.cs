namespace AIKernel.Doom.Provider;

using AIKernel.Doom.Wasm;
/// <summary>
/// EN: Represents DoomProviderOptions.
/// EN: Documentation for public API. JA: DoomProviderOptions を表します。
/// </summary>

public sealed record DoomProviderOptions
{
    /// <summary>
    /// EN: Executes Wasm.
    /// EN: Documentation for public API. JA: Wasm を実行します。
    /// </summary>
    public DoomWasmOptions Wasm { get; init; } = new();
    /// <summary>
    /// EN: Gets PreferWebGpu.
    /// EN: Documentation for public API. JA: PreferWebGpu を取得します。
    /// </summary>

    public bool PreferWebGpu { get; init; } = true;
    /// <summary>
    /// EN: Gets VerboseStatus.
    /// EN: Documentation for public API. JA: VerboseStatus を取得します。
    /// </summary>

    public bool VerboseStatus { get; init; }
    /// <summary>
    /// EN: Gets BonsaiModelPath.
    /// EN: Documentation for public API. JA: BonsaiModelPath を取得します。
    /// </summary>

    public string? BonsaiModelPath { get; init; }
}
