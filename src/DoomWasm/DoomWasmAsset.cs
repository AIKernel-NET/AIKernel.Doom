namespace AIKernel.Doom.Wasm;

/// <summary>EN: Resolved WASM bytes and provenance metadata. JA: DoomWasmAsset を表します。</summary>
public sealed record DoomWasmAsset(
    string EntryName,
    byte[] ModuleBytes,
    string Source,
    string CachePath,
    bool IsSimulated);
