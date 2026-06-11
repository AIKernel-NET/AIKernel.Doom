namespace AIKernel.Doom.Wasm;

/// <summary>Resolved WASM bytes and provenance metadata.</summary>
public sealed record DoomWasmAsset(
    string EntryName,
    byte[] ModuleBytes,
    string Source,
    string CachePath,
    bool IsSimulated);
