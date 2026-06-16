namespace AIKernel.Doom.Wasm;

/// <summary>EN: ROM metadata used to resolve the DOOM WASM entrypoint. JA: DoomRomManifest を表します。</summary>
public sealed record DoomRomManifest(
    string Name,
    string Entry,
    IReadOnlyList<string> Capabilities)
{
    /// <summary>
    /// EN: Executes Standard.
    /// EN: Documentation for public API. JA: Standard を実行します。
    /// </summary>
    public static DoomRomManifest Standard()
        => new("doom", "doom.wasm", ["doom.start", "doom.stop", "doom.status"]);
}
