namespace AIKernel.Doom.Provider;

using AIKernel.Doom.Wasm;

public sealed record DoomProviderOptions
{
    public DoomWasmOptions Wasm { get; init; } = new();

    public bool PreferWebGpu { get; init; } = true;

    public bool VerboseStatus { get; init; }

    public string? BonsaiModelPath { get; init; }
}
