namespace AIKernel.Doom.Wasm;

using System.Text.Json;
using AIKernel.Common.Results;

/// <summary>
/// [EN] Loads and validates the DOOM ROM manifest used by the standalone WASM demo before the runtime is allowed to resolve assets.
/// [JA] standalone WASM demo が asset 解決へ進む前に使用する DOOM ROM manifest を読み込み、検証します。
/// </summary>
/// <remarks>
/// [EN] Keep validation fail-closed: callers depend on the returned <see cref="Result{T}"/> to decide whether hosted WAD, wasm, and capability metadata are safe to expose.
/// [JA] validation は fail-closed を維持してください。呼び出し側は返却される <see cref="Result{T}"/> により、hosted WAD、wasm、capability metadata を公開してよいか判断します。
/// </remarks>
public static class DoomRomLoader
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    /// <summary>
    /// EN: Gets LoadAsync.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] LoadAsync を取得します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public static async Task<Result<DoomRomManifest>> LoadAsync(
        string path,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return Result<DoomRomManifest>.Fail("ROM path is required. ErrorCode=DOOM_ROM_PATH_REQUIRED");
        }

        if (!File.Exists(path))
        {
            return Result<DoomRomManifest>.Fail($"ROM metadata was not found: {path}. ErrorCode=DOOM_ROM_NOT_FOUND");
        }

        var loaded = await Try.RunAsync(async () =>
        {
            await using var stream = File.OpenRead(path);
            return await JsonSerializer.DeserializeAsync<DoomRomManifest>(
                    stream,
                    JsonOptions,
                    cancellationToken)
                .ConfigureAwait(false);
        }).ConfigureAwait(false);

        return loaded.Match(
            Result<DoomRomManifest>.Fail,
            manifest => Validate(manifest));
    }
    /// <summary>
    /// EN: Executes Validate.
    /// [EN] Public package member; keep behavior and contract shape stable for automation, documentation, and integration tests. [JA] Validate を実行します。automation、documentation、integration test が参照するため、挙動と contract shape を安定させてください。
    /// </summary>

    public static Result<DoomRomManifest> Validate(DoomRomManifest? manifest)
    {
        if (manifest is null)
        {
            return Result<DoomRomManifest>.Fail("ROM metadata is invalid. ErrorCode=DOOM_ROM_INVALID");
        }

        if (!string.Equals(manifest.Name, "doom", StringComparison.Ordinal))
        {
            return Result<DoomRomManifest>.Fail("ROM name must be doom. ErrorCode=DOOM_ROM_NAME_INVALID");
        }

        if (!string.Equals(manifest.Entry, "doom.wasm", StringComparison.Ordinal))
        {
            return Result<DoomRomManifest>.Fail("ROM entry must be doom.wasm. ErrorCode=DOOM_ROM_ENTRY_INVALID");
        }

        var required = DoomRomManifest.Standard().Capabilities;
        var missing = required
            .Where(capability => !manifest.Capabilities.Contains(capability, StringComparer.Ordinal))
            .ToArray();

        return missing.Length == 0
            ? Result<DoomRomManifest>.Success(manifest)
            : Result<DoomRomManifest>.Fail(
                $"ROM metadata is missing capabilities: {string.Join(", ", missing)}. ErrorCode=DOOM_ROM_CAPABILITIES_INVALID");
    }
}
