namespace AIKernel.Doom.Wasm;

using AIKernel.Common.Results;
/// <summary>
/// EN: Defines the IDoomWasmAssetResolver contract.
/// EN: Documentation for public API. JA: IDoomWasmAssetResolver contract を定義します。
/// </summary>

public interface IDoomWasmAssetResolver
{
    Task<Result<DoomWasmAsset>> ResolveAsync(
        DoomRomManifest manifest,
        CancellationToken cancellationToken = default);
}
