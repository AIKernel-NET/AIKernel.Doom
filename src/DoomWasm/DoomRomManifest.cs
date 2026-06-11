namespace AIKernel.Doom.Wasm;

/// <summary>ROM metadata used to resolve the DOOM WASM entrypoint.</summary>
public sealed record DoomRomManifest(
    string Name,
    string Entry,
    IReadOnlyList<string> Capabilities)
{
    public static DoomRomManifest Standard()
        => new("doom", "doom.wasm", ["doom.start", "doom.stop", "doom.status"]);
}
