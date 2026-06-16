namespace AIKernel.Doom.Wasm;

/// <summary>EN: Runtime-configurable locations for DOOM WASM assets and cache. JA: DoomWasmOptions を表します。</summary>
public sealed record DoomWasmOptions
{
    /// <summary>
    /// EN: Executes RomPath.
    /// EN: Documentation for public API. JA: RomPath を実行します。
    /// </summary>
    public string RomPath { get; init; } = Path.Combine("samples", "doom.rom");
    /// <summary>
    /// EN: Gets AssetRoot.
    /// EN: Documentation for public API. JA: AssetRoot を取得します。
    /// </summary>

    public string? AssetRoot { get; init; }
    /// <summary>
    /// EN: Gets DoomWasmPath.
    /// EN: Documentation for public API. JA: DoomWasmPath を取得します。
    /// </summary>

    public string? DoomWasmPath { get; init; }
    /// <summary>
    /// EN: Gets DoomWasmDownloadUrl.
    /// EN: Documentation for public API. JA: DoomWasmDownloadUrl を取得します。
    /// </summary>

    public string? DoomWasmDownloadUrl { get; init; }
    /// <summary>
    /// EN: Gets DoomWasmSha256.
    /// EN: Documentation for public API. JA: DoomWasmSha256 を取得します。
    /// </summary>

    public string? DoomWasmSha256 { get; init; }
    /// <summary>
    /// EN: Gets CacheRoot.
    /// EN: Documentation for public API. JA: CacheRoot を取得します。
    /// </summary>

    public string CacheRoot { get; init; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "AIKernel",
        "Doom");
    /// <summary>
    /// EN: Gets AllowSimulatedWasm.
    /// EN: Documentation for public API. JA: AllowSimulatedWasm を取得します。
    /// </summary>

    public bool AllowSimulatedWasm { get; init; }
    /// <summary>
    /// EN: Gets InitialMemoryBytes.
    /// EN: Documentation for public API. JA: InitialMemoryBytes を取得します。
    /// </summary>

    public int InitialMemoryBytes { get; init; } = 64 * 1024 * 1024;
}
