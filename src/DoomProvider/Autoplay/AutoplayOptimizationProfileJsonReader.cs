namespace AIKernel.Doom.Provider.Autoplay;

using System.Text.Json;

internal static class AutoplayOptimizationProfileJsonReader
{
    /// <summary>
    /// [EN] Executes the <c>ReadString</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>ReadString</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="primary">
    /// [EN] Supplies the <c>primary</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>primary</c> value です。
    /// </param>
    /// <param name="fallbackContainer">
    /// [EN] Supplies the <c>fallbackContainer</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>fallbackContainer</c> value です。
    /// </param>
    /// <param name="key">
    /// [EN] Supplies the <c>key</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>key</c> value です。
    /// </param>
    /// <param name="fallback">
    /// [EN] Supplies the <c>fallback</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>fallback</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static string ReadString(JsonElement primary, JsonElement fallbackContainer, string key, string fallback)
        => TryGet(primary, fallbackContainer, key, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString() ?? fallback
            : fallback;

    /// <summary>
    /// [EN] Executes the <c>ReadInt</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>ReadInt</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="primary">
    /// [EN] Supplies the <c>primary</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>primary</c> value です。
    /// </param>
    /// <param name="fallbackContainer">
    /// [EN] Supplies the <c>fallbackContainer</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>fallbackContainer</c> value です。
    /// </param>
    /// <param name="key">
    /// [EN] Supplies the <c>key</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>key</c> value です。
    /// </param>
    /// <param name="fallback">
    /// [EN] Supplies the <c>fallback</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>fallback</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static int ReadInt(JsonElement primary, JsonElement fallbackContainer, string key, int fallback)
        => TryGet(primary, fallbackContainer, key, out var value) && value.TryGetInt32(out var parsed)
            ? parsed
            : fallback;

    /// <summary>
    /// [EN] Executes the <c>ReadFloat</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>ReadFloat</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="primary">
    /// [EN] Supplies the <c>primary</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>primary</c> value です。
    /// </param>
    /// <param name="fallbackContainer">
    /// [EN] Supplies the <c>fallbackContainer</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>fallbackContainer</c> value です。
    /// </param>
    /// <param name="key">
    /// [EN] Supplies the <c>key</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>key</c> value です。
    /// </param>
    /// <param name="fallback">
    /// [EN] Supplies the <c>fallback</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>fallback</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static float ReadFloat(JsonElement primary, JsonElement fallbackContainer, string key, float fallback)
        => TryGet(primary, fallbackContainer, key, out var value) && value.TryGetSingle(out var parsed)
            ? parsed
            : fallback;

    /// <summary>
    /// [EN] Executes the <c>ReadBool</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>ReadBool</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="primary">
    /// [EN] Supplies the <c>primary</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>primary</c> value です。
    /// </param>
    /// <param name="fallbackContainer">
    /// [EN] Supplies the <c>fallbackContainer</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>fallbackContainer</c> value です。
    /// </param>
    /// <param name="key">
    /// [EN] Supplies the <c>key</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>key</c> value です。
    /// </param>
    /// <param name="fallback">
    /// [EN] Supplies the <c>fallback</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>fallback</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static bool ReadBool(JsonElement primary, JsonElement fallbackContainer, string key, bool fallback)
        => TryGet(primary, fallbackContainer, key, out var value)
            ? value.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                _ => fallback
            }
            : fallback;

    private static bool TryGet(JsonElement primary, JsonElement fallbackContainer, string key, out JsonElement value)
    {
        if (primary.ValueKind == JsonValueKind.Object && primary.TryGetProperty(key, out value))
        {
            return true;
        }

        if (fallbackContainer.ValueKind == JsonValueKind.Object && fallbackContainer.TryGetProperty(key, out value))
        {
            return true;
        }

        value = default;
        return false;
    }
}
