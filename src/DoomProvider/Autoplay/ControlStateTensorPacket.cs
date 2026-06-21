namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Flat tensor transport for Control runtime state.
/// JA: Control runtime state 用の flat tensor transport です。
/// </summary>
public sealed record ControlStateTensorPacket
{
    public string Version { get; init; } = "control-state-tensor/v1";

    public IReadOnlyList<int> Shape { get; init; } = [];

    public IReadOnlyList<float> Data { get; init; } = [];

    public IReadOnlyDictionary<string, int> Channels { get; init; } =
        new Dictionary<string, int>(StringComparer.Ordinal);

    public ControlSemanticMemoryPacket SemanticMemory { get; init; } = new();

    public string Objective { get; init; } = "idle";

    public float Get(string channel)
    {
        if (!Channels.TryGetValue((channel ?? string.Empty).Trim().ToLowerInvariant(), out var offset))
        {
            return 0;
        }

        return offset >= 0 && offset < Data.Count ? Clamp01(Data[offset]) : 0;
    }

    public float SemanticScore(string symbol)
    {
        var normalized = Normalize(symbol);
        if (SemanticMemory.Symbols.TryGetValue(normalized, out var direct))
        {
            return Clamp01(direct);
        }

        return Get($"semantic.{normalized}");
    }

    private static string Normalize(string? value)
        => (value ?? string.Empty).Trim().ToLowerInvariant();

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}

/// <summary>
/// EN: Stable symbolic memory packet consumed by Control pipelines.
/// JA: Control pipeline が消費する stable symbolic memory packet です。
/// </summary>
public sealed record ControlSemanticMemoryPacket
{
    public IReadOnlyDictionary<string, float> Symbols { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    public string Objective { get; init; } = "idle";
}
