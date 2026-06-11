namespace AIKernel.Doom.Wasm;

/// <summary>Runtime-configurable locations for DOOM WASM assets and cache.</summary>
public sealed record DoomWasmOptions
{
    public string RomPath { get; init; } = Path.Combine("samples", "doom.rom");

    public string? AssetRoot { get; init; }

    public string? DoomWasmPath { get; init; }

    public string? DoomWasmDownloadUrl { get; init; }

    public string? DoomWasmSha256 { get; init; }

    public string CacheRoot { get; init; } = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "AIKernel",
        "Doom");

    public bool AllowSimulatedWasm { get; init; }

    public int InitialMemoryBytes { get; init; } = 64 * 1024 * 1024;
}
