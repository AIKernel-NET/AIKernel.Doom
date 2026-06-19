namespace AIKernel.Doom.Provider.Autoplay;

public sealed record DynamicPipelineContext
{
    /// <summary>
    /// EN: Legacy compact sensor fusion packet used by the existing dynamic pipeline DSL.
    /// JA: 既存の dynamic pipeline DSL が利用する legacy compact sensor fusion packet です。
    /// </summary>
    public SensorFusion Sensor { get; init; } =
        new([0, 0, 0, 0, 0, 0], 1, 100, 0, "corridor", false, 0, 0);

    /// <summary>
    /// EN: Remaining recovery frames used by pipeline predicates that need temporal grace.
    /// JA: temporal grace を必要とする pipeline predicate が利用する残り recovery frame 数です。
    /// </summary>
    public int RecoveryFrames { get; init; }

    /// <summary>
    /// EN: Normalized Aisthesis sensor readings keyed by sensor name.
    /// JA: sensor 名を key にした正規化済み Aisthesis sensor reading です。
    /// </summary>
    public IReadOnlyDictionary<string, float> SensorReadings { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Phainesis phenomenon scores extracted from the sensor readings.
    /// JA: sensor reading から抽出された Phainesis phenomenon score です。
    /// </summary>
    public IReadOnlyDictionary<string, float> Events { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Nous meaning vectors derived from phenomenon scores.
    /// JA: phenomenon score から導出された Nous meaning vector です。
    /// </summary>
    public IReadOnlyDictionary<string, float> MeaningVectors { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Topos vector carrier values used for priority observation.
    /// JA: priority observation に使う Topos vector carrier 値です。
    /// </summary>
    public IReadOnlyDictionary<string, float> ToposVectors { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Kairos priority axis values computed from Topos vectors.
    /// JA: Topos vector から計算された Kairos priority axis 値です。
    /// </summary>
    public IReadOnlyDictionary<string, float> Priorities { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Selected priority axis for observation and bounded action mapping.
    /// JA: observation と bounded action mapping に使う選択済み priority axis です。
    /// </summary>
    public string SelectedAxis { get; init; } = "logos";

    /// <summary>
    /// EN: Number of consecutive frames that emitted the same bounded Kinesis action signature.
    /// JA: 同じ bounded Kinesis action signature を連続発行した frame 数です。
    /// </summary>
    public int ActionRepeatFrames { get; init; }

    /// <summary>
    /// EN: Number of consecutive frames that emitted the same movement component.
    /// JA: 同じ movement component を連続発行した frame 数です。
    /// </summary>
    public int MoveRepeatFrames { get; init; }

    /// <summary>
    /// EN: Number of consecutive frames that emitted the same turn component.
    /// JA: 同じ turn component を連続発行した frame 数です。
    /// </summary>
    public int TurnRepeatFrames { get; init; }

    /// <summary>
    /// EN: Current health value projected from the compact sensor packet.
    /// JA: compact sensor packet から射影された現在 health 値です。
    /// </summary>
    public float Health => Sensor.Health;

    /// <summary>
    /// EN: Normalized lethal-risk score derived from the health signal.
    /// JA: health signal から導出される正規化済み lethal-risk score です。
    /// </summary>
    public float LethalRisk
        => Health <= 0
            ? 1
            : Math.Clamp((10 - Health) / 10f, 0, 1);

    /// <summary>
    /// EN: Scenario semantic scores retained for compatibility with older pipeline predicates.
    /// JA: 旧 pipeline predicate との互換性のために保持する scenario semantic score です。
    /// </summary>
    public IReadOnlyDictionary<string, float> SemanticScores { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);

    /// <summary>
    /// EN: Route-planner diagnostics derived from Doom-local route evidence.
    /// JA: Doom ローカルの route evidence から導出された route-planner diagnostics です。
    /// </summary>
    public DoomRoutePlannerResult RoutePlan { get; init; } = DoomRoutePlannerResult.Empty;
}
