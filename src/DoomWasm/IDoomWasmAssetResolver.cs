namespace AIKernel.Doom.Wasm;

using AIKernel.Common.Results;

/// <summary>
/// [EN] Resolves the hosted or embedded assets required to start the Doom WASM runtime.
/// [JA] Doom WASM runtime の起動に必要な hosted asset または embedded asset を解決します。
/// </summary>
public interface IDoomWasmAssetResolver
{
    /// <summary>
    /// [EN] Resolves the asset bundle described by a ROM manifest into a validated Doom WASM asset.
    /// [JA] ROM manifest に記述された asset bundle を検証済みの Doom WASM asset として解決します。
    /// </summary>
    /// <param name="manifest">
    /// [EN] The ROM manifest that names the WASM module, WAD payload, and related runtime assets.
    /// [JA] WASM module、WAD payload、および関連 runtime asset を示す ROM manifest です。
    /// </param>
    /// <param name="cancellationToken">
    /// [EN] The cancellation token used to stop asset resolution during shutdown or approval reset.
    /// [JA] shutdown または approval reset 時に asset resolution を停止するための cancellation token です。
    /// </param>
    /// <returns>
    /// [EN] A result containing the resolved Doom WASM asset, or an error that explains why resolution failed.
    /// [JA] 解決済み Doom WASM asset、または resolution failure の理由を含む result です。
    /// </returns>
    Task<Result<DoomWasmAsset>> ResolveAsync(
        DoomRomManifest manifest,
        CancellationToken cancellationToken = default);
}
