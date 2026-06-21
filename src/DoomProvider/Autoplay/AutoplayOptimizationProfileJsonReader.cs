namespace AIKernel.Doom.Provider.Autoplay;

using System.Text.Json;

internal static class AutoplayOptimizationProfileJsonReader
{
    public static string ReadString(JsonElement primary, JsonElement fallbackContainer, string key, string fallback)
        => TryGet(primary, fallbackContainer, key, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString() ?? fallback
            : fallback;

    public static int ReadInt(JsonElement primary, JsonElement fallbackContainer, string key, int fallback)
        => TryGet(primary, fallbackContainer, key, out var value) && value.TryGetInt32(out var parsed)
            ? parsed
            : fallback;

    public static float ReadFloat(JsonElement primary, JsonElement fallbackContainer, string key, float fallback)
        => TryGet(primary, fallbackContainer, key, out var value) && value.TryGetSingle(out var parsed)
            ? parsed
            : fallback;

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
