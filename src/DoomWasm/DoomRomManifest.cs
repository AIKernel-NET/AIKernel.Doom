namespace AIKernel.Doom.Wasm;

/// <summary>EN: ROM metadata used to resolve the DOOM WASM entrypoint. JA: DoomRomManifest を表します。</summary>
public sealed record DoomRomManifest(
    string Name,
    string Entry,
    IReadOnlyList<string> Capabilities)
{
    /// <summary>
    /// EN: Executes Standard.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Standard を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    public static DoomRomManifest Standard()
        => new("doom", "doom.wasm", ["doom.start", "doom.stop", "doom.status"]);
}
