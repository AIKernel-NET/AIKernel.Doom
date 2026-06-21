namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Aisthesis packet. Raw sensing is the only layer allowed to carry sensor tensors directly.
/// JA: Aisthesis packet. sensor tensor を直接保持できる唯一の層です。
/// </summary>
public sealed record SensorFrame
{
    /// <summary>
    /// EN: Structured sensor tensor for the current frame.
    /// JA: 現在 frame の structured sensor tensor です。
    /// </summary>
    public AutoplaySensorTensor SensorTensor { get; init; } = AutoplaySensorTensor.Empty;

    /// <summary>
    /// EN: Health signal observed for the current frame.
    /// JA: 現在 frame で観測された health signal です。
    /// </summary>
    public HealthSignal Health { get; init; } = HealthSignal.Live;
}

/// <summary>
/// EN: Health and fatality evidence used by the Zoe layer.
/// JA: Zoe 層で使用する health / fatality evidence です。
/// </summary>
public sealed record HealthSignal
{
    /// <summary>
    /// EN: Default live health signal.
    /// JA: 既定の live health signal です。
    /// </summary>
    public static HealthSignal Live { get; } = new();

    /// <summary>
    /// EN: Current health value normalized by the scenario source.
    /// JA: scenario source によって正規化された現在 health 値です。
    /// </summary>
    public int Health { get; init; } = 100;

    /// <summary>
    /// EN: Indicates whether the frame is likely fatal or retry-worthy.
    /// JA: frame が fatal または retry 対象である可能性を示します。
    /// </summary>
    public bool IsLikelyFatal { get; init; }

    /// <summary>
    /// EN: Source identifier for the health evidence.
    /// JA: health evidence の source identifier です。
    /// </summary>
    public string Source { get; init; } = "aisthesis.health";
}

/// <summary>
/// EN: Output of Phainesis, the event-extraction stage formerly represented by DET labels.
/// JA: Phainesis の出力です。旧 DET 表示で表していた event extraction の結果です。
/// </summary>
public sealed record Phainomenon
{
    /// <summary>
    /// EN: Extracted phenomenon scores keyed by neutral event names.
    /// JA: neutral event 名を key とする抽出済み phenomenon score です。
    /// </summary>
    public IReadOnlyDictionary<string, float> Events { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Reads a normalized event score by name.
    /// JA: name に対応する正規化済み event score を読み取ります。
    /// </summary>
    public float EventScore(string name)
        => Events.TryGetValue((name ?? string.Empty).Trim(), out var value)
            ? Clamp01(value)
            : 0;

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}

/// <summary>
/// EN: Nous packet carrying meaning vectors derived from phenomena.
/// JA: phenomenon から導出された meaning vector を保持する Nous packet です。
/// </summary>
public sealed record MeaningVectorPacket
{
    /// <summary>
    /// EN: Source Phainesis packet used to build the vectors.
    /// JA: vector 構築に使用した source Phainesis packet です。
    /// </summary>
    public Phainomenon Source { get; init; } = new();

    /// <summary>
    /// EN: Meaning vectors keyed by neutral vector names.
    /// JA: neutral vector 名を key とする meaning vector です。
    /// </summary>
    public IReadOnlyDictionary<string, float> MeaningVectors { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);
}

/// <summary>
/// EN: Topos carrier grouping Logos, Pathos, and Ethos vectors.
/// JA: Logos / Pathos / Ethos vector を分類して保持する Topos carrier です。
/// </summary>
public sealed record ToposDecisionVector
{
    /// <summary>
    /// EN: Structure and route-oriented Logos vector values.
    /// JA: 構造と route を重視する Logos vector 値です。
    /// </summary>
    public IReadOnlyDictionary<string, float> LogosVector { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Risk and urgency-oriented Pathos vector values.
    /// JA: risk と urgency を重視する Pathos vector 値です。
    /// </summary>
    public IReadOnlyDictionary<string, float> PathosVector { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Goal and stability-oriented Ethos vector values.
    /// JA: goal と stability を重視する Ethos vector 値です。
    /// </summary>
    public IReadOnlyDictionary<string, float> EthosVector { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Human-readable scenario-local decision label.
    /// JA: scenario ローカルの可読 decision label です。
    /// </summary>
    public string Decision { get; init; } = "monitor";
}

/// <summary>
/// EN: Kairos priority axes computed from Topos vectors.
/// JA: Topos vector から計算された Kairos priority axis です。
/// </summary>
public sealed record PriorityAxes
{
    /// <summary>
    /// EN: Pathos priority value.
    /// JA: Pathos priority 値です。
    /// </summary>
    public float PathosPriority { get; init; }

    /// <summary>
    /// EN: Ethos priority value.
    /// JA: Ethos priority 値です。
    /// </summary>
    public float EthosPriority { get; init; }

    /// <summary>
    /// EN: Logos priority value.
    /// JA: Logos priority 値です。
    /// </summary>
    public float LogosPriority { get; init; }

    /// <summary>
    /// EN: Selected priority axis name.
    /// JA: 選択された priority axis 名です。
    /// </summary>
    public string SelectedAxis { get; init; } = "logos";
}

/// <summary>
/// EN: Bounded Kinesis action vector.
/// JA: bounded Kinesis action vector です。
/// </summary>
public sealed record ActionVector
{
    /// <summary>
    /// EN: Indicates forward movement intent.
    /// JA: forward movement intent を示します。
    /// </summary>
    public bool MoveForward { get; init; }

    /// <summary>
    /// EN: Indicates backward movement intent.
    /// JA: backward movement intent を示します。
    /// </summary>
    public bool MoveBackward { get; init; }

    /// <summary>
    /// EN: Yaw turn amount in scenario-local units.
    /// JA: scenario ローカル単位の yaw turn 量です。
    /// </summary>
    public int TurnYaw { get; init; }

    /// <summary>
    /// EN: Indicates lateral strafe intent.
    /// JA: lateral strafe intent を示します。
    /// </summary>
    public bool Strafe { get; init; }

    /// <summary>
    /// EN: Indicates fire intent.
    /// JA: fire intent を示します。
    /// </summary>
    public bool Shoot { get; init; }

    /// <summary>
    /// EN: Source label for the generated action vector.
    /// JA: 生成された action vector の source label です。
    /// </summary>
    public string Source { get; init; } = "kinesis";
}

/// <summary>
/// EN: Zoe audit result for a generated action vector.
/// JA: 生成された action vector に対する Zoe audit result です。
/// </summary>
public sealed record ZoeAuditResult
{
    /// <summary>
    /// EN: Audited action vector.
    /// JA: 監査済み action vector です。
    /// </summary>
    public ActionVector Action { get; init; } = new();

    /// <summary>
    /// EN: Indicates whether Zoe vetoed the action.
    /// JA: Zoe が action を veto したかどうかを示します。
    /// </summary>
    public bool Vetoed { get; init; }

    /// <summary>
    /// EN: Veto or pass reason.
    /// JA: veto または pass の reason です。
    /// </summary>
    public string Reason { get; init; } = "none";
}
