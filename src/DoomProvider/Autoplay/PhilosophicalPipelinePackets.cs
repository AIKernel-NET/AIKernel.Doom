namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Aisthesis packet. Raw sensing is the only layer allowed to carry sensor tensors directly.
/// JA: Aisthesis packet. sensor tensor を直接保持できる唯一の層です。
/// </summary>
public sealed record SensorFrame
{
    public AutoplaySensorTensor SensorTensor { get; init; } = AutoplaySensorTensor.Empty;

    public HealthSignal Health { get; init; } = HealthSignal.Live;
}

public sealed record HealthSignal
{
    public static HealthSignal Live { get; } = new();

    public int Health { get; init; } = 100;

    public bool IsLikelyFatal { get; init; }

    public string Source { get; init; } = "aisthesis.health";
}

/// <summary>
/// EN: Output of Phainesis, the event-extraction stage formerly represented by DET labels.
/// JA: Phainesis の出力です。旧 DET 表示で表していた event extraction の結果です。
/// </summary>
public sealed record Phainomenon
{
    public IReadOnlyDictionary<string, float> Events { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    public float EventScore(string name)
        => Events.TryGetValue((name ?? string.Empty).Trim(), out var value)
            ? Clamp01(value)
            : 0;

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}

public sealed record MeaningVectorPacket
{
    public Phainomenon Source { get; init; } = new();

    public IReadOnlyDictionary<string, float> MeaningVectors { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);
}

public sealed record ToposDecisionVector
{
    public IReadOnlyDictionary<string, float> LogosVector { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    public IReadOnlyDictionary<string, float> PathosVector { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    public IReadOnlyDictionary<string, float> EthosVector { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    public string Decision { get; init; } = "monitor";
}

public sealed record PriorityAxes
{
    public float PathosPriority { get; init; }

    public float EthosPriority { get; init; }

    public float LogosPriority { get; init; }

    public string SelectedAxis { get; init; } = "logos";
}

public sealed record ActionVector
{
    public bool MoveForward { get; init; }

    public bool MoveBackward { get; init; }

    public int TurnYaw { get; init; }

    public bool Strafe { get; init; }

    public bool Shoot { get; init; }

    public string Source { get; init; } = "kinesis";
}

public sealed record ZoeAuditResult
{
    public ActionVector Action { get; init; } = new();

    public bool Vetoed { get; init; }

    public string Reason { get; init; } = "none";
}
