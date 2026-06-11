namespace AIKernel.Doom.Wasm;

using AIKernel.Common.Results;

public interface IDoomWasmAssetResolver
{
    Task<Result<DoomWasmAsset>> ResolveAsync(
        DoomRomManifest manifest,
        CancellationToken cancellationToken = default);
}
