namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Low-layer Doom sensor matrix.
/// JA: 低 Layer の Doom sensor matrix です。
/// </summary>
public readonly record struct AutoplaySensorTensor
{
    private readonly ReadOnlyMemory<float> _data;

    /// <summary>
    /// [EN] Creates a fixed-shape autoplay sensor tensor from canonical channel data.
    /// [JA] canonical channel data から固定形状の autoplay sensor tensor を作成します。
    /// </summary>
    /// <param name="data">
    /// [EN] The normalized channel data stored in row-major tensor order.
    /// [JA] row-major tensor order で格納された normalized channel data です。
    /// </param>
    /// <param name="rows">
    /// [EN] The number of tensor rows described by the sensor tensor ICD.
    /// [JA] sensor tensor ICD が定義する tensor row 数です。
    /// </param>
    /// <param name="cols">
    /// [EN] The number of tensor columns described by the sensor tensor ICD.
    /// [JA] sensor tensor ICD が定義する tensor column 数です。
    /// </param>
    public AutoplaySensorTensor(ReadOnlyMemory<float> data, int rows = AutoplaySensorTensorIcd.Rows, int cols = AutoplaySensorTensorIcd.Cols)
    {
        _data = data;
        Rows = rows;
        Cols = cols;
    }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public static AutoplaySensorTensor Empty { get; } = new(ReadOnlyMemory<float>.Empty);

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public int Rows { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public int Cols { get; }

    /// <summary>
    /// [EN] Executes the <c>Data</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Data</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public ReadOnlySpan<float> Data => _data.Span;

    /// <summary>
    /// [EN] Executes the <c>IsEmpty</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>IsEmpty</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public bool IsEmpty => _data.IsEmpty || Rows <= 0 || Cols <= 0;

    /// <summary>
    /// [EN] Executes the <c>FromChannels</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>FromChannels</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="channels">
    /// [EN] Supplies the <c>channels</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>channels</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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

    /// <summary>
    /// [EN] Executes the <c>Get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="channel">
    /// [EN] Supplies the <c>channel</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>channel</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public float Get(string channel)
    {
        var offset = AutoplaySensorTensorIcd.Offset(channel);
        var data = Data;
        return offset >= 0 && offset < data.Length ? Clamp01(data[offset]) : 0;
    }

    /// <summary>
    /// [EN] Executes the <c>SemanticScore</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>SemanticScore</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="symbol">
    /// [EN] Supplies the <c>symbol</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>symbol</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public float SemanticScore(string symbol)
        => AutoplaySensorTensorIcd.SemanticScore(this, symbol);

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}
