namespace AIKernel.Doom.Wasm;

/// <summary>EN: Runtime-configurable locations for DOOM WASM assets and cache. JA: DoomWasmOptions を表します。</summary>
public sealed record DoomWasmOptions
{
    /// <summary>
    /// EN: Executes RomPath.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] RomPath を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    public string RomPath { get; init; } = Path.Combine("samples", "doom.rom");
    /// <summary>
    /// EN: Gets AssetRoot.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] AssetRoot を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public string? AssetRoot { get; init; }
    /// <summary>
    /// EN: Gets DoomWasmPath.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] DoomWasmPath を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public string? DoomWasmPath { get; init; }
    /// <summary>
    /// EN: Gets DoomWasmDownloadUrl.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] DoomWasmDownloadUrl を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public string? DoomWasmDownloadUrl { get; init; }
    /// <summary>
    /// EN: Gets DoomWasmSha256.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] DoomWasmSha256 を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public string? DoomWasmSha256 { get; init; }
    /// <summary>
    /// EN: Gets CacheRoot.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] CacheRoot を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public string CacheRoot { get; init; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "AIKernel",
        "Doom");
    /// <summary>
    /// EN: Gets AllowSimulatedWasm.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] AllowSimulatedWasm を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public bool AllowSimulatedWasm { get; init; }
    /// <summary>
    /// EN: Gets InitialMemoryBytes.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] InitialMemoryBytes を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public int InitialMemoryBytes { get; init; } = 64 * 1024 * 1024;
}
