namespace AIKernel.Doom.Wasm;

using System.Text.Json;
using AIKernel.Common.Results;
/// <summary>
/// EN: Represents DoomRomLoader.
/// EN: Documentation for public API. JA: DoomRomLoader を表します。
/// </summary>

public static class DoomRomLoader
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    /// <summary>
    /// EN: Gets LoadAsync.
    /// EN: Documentation for public API. JA: LoadAsync を取得します。
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
    /// EN: Documentation for public API. JA: Validate を実行します。
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
