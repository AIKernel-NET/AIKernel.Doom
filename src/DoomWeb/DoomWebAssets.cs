namespace AIKernel.Doom.Web;

/// <summary>
/// EN: Marker type for the AIKernel.Doom web runtime asset package.
/// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] DoomWebAssets を表します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
/// </summary>
public static class DoomWebAssets
{
    /// <summary>
    /// EN: Public asset root inside the package contentFiles layout.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] PackageAssetRoot 定数を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>
    public const string PackageAssetRoot = "DoomWeb/wwwroot";
}
