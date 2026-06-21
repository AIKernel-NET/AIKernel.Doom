namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Low-layer Doom sensor matrix.
/// JA: 低 Layer の Doom sensor matrix です。
/// </summary>
public readonly record struct AutoplaySensorTensor
{
    private readonly ReadOnlyMemory<float> _data;

    public AutoplaySensorTensor(ReadOnlyMemory<float> data, int rows = AutoplaySensorTensorIcd.Rows, int cols = AutoplaySensorTensorIcd.Cols)
    {
        _data = data;
        Rows = rows;
        Cols = cols;
    }

    public static AutoplaySensorTensor Empty { get; } = new(ReadOnlyMemory<float>.Empty);

    public int Rows { get; }

    public int Cols { get; }

    public ReadOnlySpan<float> Data => _data.Span;

    public bool IsEmpty => _data.IsEmpty || Rows <= 0 || Cols <= 0;

    public static AutoplaySensorTensor FromChannels(params (string Channel, float Value)[] channels)
    {
        var data = new float[AutoplaySensorTensorIcd.Size];
        foreach (var (channel, value) in channels)
        {
            var offset = AutoplaySensorTensorIcd.Offset(channel);
            if (offset >= 0 && offset < data.Length)
            {
                data[offset] = Clamp01(value);
            }
        }

        return new AutoplaySensorTensor(data);
    }

    public float Get(string channel)
    {
        var offset = AutoplaySensorTensorIcd.Offset(channel);
        var data = Data;
        return offset >= 0 && offset < data.Length ? Clamp01(data[offset]) : 0;
    }

    public float SemanticScore(string symbol)
        => AutoplaySensorTensorIcd.SemanticScore(this, symbol);

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}
