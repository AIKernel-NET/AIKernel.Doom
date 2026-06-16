namespace AIKernel.Doom.Wasm;

using System.Security.Cryptography;
using AIKernel.Common.Results;
/// <summary>
/// EN: Represents DoomWasmAssetResolver.
/// EN: Documentation for public API. JA: DoomWasmAssetResolver を表します。
/// </summary>

public sealed class DoomWasmAssetResolver : IDoomWasmAssetResolver
{
    private static readonly byte[] SimulatedWasmModule = [0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00];
    private readonly DoomWasmOptions _options;
    /// <summary>
    /// EN: Executes DoomWasmAssetResolver.
    /// EN: Documentation for public API. JA: DoomWasmAssetResolver を実行します。
    /// </summary>

    public DoomWasmAssetResolver(DoomWasmOptions options)
    {
        _options = options;
    }
    /// <summary>
    /// EN: Gets ResolveAsync.
    /// EN: Documentation for public API. JA: ResolveAsync を取得します。
    /// </summary>

    public async Task<Result<DoomWasmAsset>> ResolveAsync(
        DoomRomManifest manifest,
        CancellationToken cancellationToken = default)
    {
        return await DoomRomLoader.Validate(manifest).Match<Task<Result<DoomWasmAsset>>>(
                error => Result<DoomWasmAsset>.Fail(error).AsTask(),
                _ => ResolveValidatedAsync(manifest, cancellationToken))
            .ConfigureAwait(false);
    }

    private async Task<Result<DoomWasmAsset>> ResolveValidatedAsync(
        DoomRomManifest manifest,
        CancellationToken cancellationToken)
    {
        var cachePath = CachePath(manifest.Entry);
        var candidates = CandidatePaths(manifest.Entry);

        foreach (var candidate in candidates)
        {
            if (File.Exists(candidate))
            {
                return await ReadAssetAsync(manifest.Entry, candidate, cachePath, cancellationToken)
                    .ConfigureAwait(false);
            }
        }

        if (File.Exists(cachePath))
        {
            return await ReadAssetAsync(manifest.Entry, cachePath, cachePath, cancellationToken)
                .ConfigureAwait(false);
        }

        if (!string.IsNullOrWhiteSpace(_options.DoomWasmDownloadUrl))
        {
            return Result<DoomWasmAsset>.Fail(
                "Runtime download is configured but not performed by this offline demo adapter. ErrorCode=DOOM_WASM_DOWNLOAD_ADAPTER_NOT_CONFIGURED");
        }

        if (_options.AllowSimulatedWasm)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(cachePath)!);
            await File.WriteAllBytesAsync(cachePath, SimulatedWasmModule, cancellationToken)
                .ConfigureAwait(false);
            return Result<DoomWasmAsset>.Success(new DoomWasmAsset(
                manifest.Entry,
                SimulatedWasmModule.ToArray(),
                "simulated",
                cachePath,
                IsSimulated: true));
        }

        return Result<DoomWasmAsset>.Fail(
            $"DOOM WASM asset was not found. Checked: {string.Join(", ", candidates.Append(cachePath))}. ErrorCode=DOOM_WASM_NOT_FOUND");
    }

    private async Task<Result<DoomWasmAsset>> ReadAssetAsync(
        string entry,
        string path,
        string cachePath,
        CancellationToken cancellationToken)
    {
        var bytesResult = await Try.RunAsync(
            () => File.ReadAllBytesAsync(path, cancellationToken))
            .ConfigureAwait(false);

        return await bytesResult.Match<Task<Result<DoomWasmAsset>>>(
                error => Result<DoomWasmAsset>.Fail(error).AsTask(),
                bytes => MaterializeAssetAsync(entry, path, cachePath, bytes, cancellationToken))
            .ConfigureAwait(false);
    }

    private async Task<Result<DoomWasmAsset>> MaterializeAssetAsync(
        string entry,
        string path,
        string cachePath,
        byte[] bytes,
        CancellationToken cancellationToken)
    {
        if (bytes.Length == 0)
        {
            return Result<DoomWasmAsset>.Fail("DOOM WASM asset is empty. ErrorCode=DOOM_WASM_EMPTY");
        }

        return await ValidateHash(bytes).Match<Task<Result<DoomWasmAsset>>>(
            error => Result<DoomWasmAsset>.Fail(error).AsTask(),
            async _ =>
        {
            Directory.CreateDirectory(Path.GetDirectoryName(cachePath)!);
            if (!string.Equals(Path.GetFullPath(path), Path.GetFullPath(cachePath), StringComparison.OrdinalIgnoreCase))
            {
                await File.WriteAllBytesAsync(cachePath, bytes, cancellationToken).ConfigureAwait(false);
            }

            return Result<DoomWasmAsset>.Success(new DoomWasmAsset(entry, bytes, path, cachePath, IsSimulated: false));
        }).ConfigureAwait(false);
    }

    private Result<bool> ValidateHash(byte[] bytes)
    {
        if (string.IsNullOrWhiteSpace(_options.DoomWasmSha256))
        {
            return Result<bool>.Success(true);
        }

        var actual = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();
        return string.Equals(actual, _options.DoomWasmSha256, StringComparison.OrdinalIgnoreCase)
            ? Result<bool>.Success(true)
            : Result<bool>.Fail("DOOM WASM checksum mismatch. ErrorCode=DOOM_WASM_HASH_MISMATCH");
    }

    private IReadOnlyList<string> CandidatePaths(string entry)
    {
        var paths = new List<string>();
        if (!string.IsNullOrWhiteSpace(_options.DoomWasmPath))
        {
            paths.Add(_options.DoomWasmPath);
        }

        if (!string.IsNullOrWhiteSpace(_options.AssetRoot))
        {
            paths.Add(Path.Combine(_options.AssetRoot, entry));
        }

        var romDirectory = Path.GetDirectoryName(Path.GetFullPath(_options.RomPath));
        if (!string.IsNullOrWhiteSpace(romDirectory))
        {
            paths.Add(Path.Combine(romDirectory, entry));
        }

        return paths
            .Where(path => !string.IsNullOrWhiteSpace(path))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private string CachePath(string entry)
        => Path.Combine(_options.CacheRoot, "wasm", entry);
}
