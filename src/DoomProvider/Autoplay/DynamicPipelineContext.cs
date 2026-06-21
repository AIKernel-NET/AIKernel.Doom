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
    /// EN: Normalized text-valued sensor and route labels keyed by stable token name.
    /// JA: stable token 名を key にした正規化済み text-valued sensor / route label です。
    /// </summary>
    public IReadOnlyDictionary<string, string> TextValues { get; init; } =
        new Dictionary<string, string>(StringComparer.Ordinal);

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
    /// EN: Remaining cooldown frames before the next bounded Use pulse can be emitted.
    /// JA: 次の bounded Use pulse を発行できるまでの残り cooldown frame 数です。
    /// </summary>
    public int UsePulseCooldownFrames { get; init; }

    /// <summary>
    /// EN: Number of frames where a requested Use signal was suppressed by the pulse gate.
    /// JA: pulse gate によって要求された Use signal が抑止された frame 数です。
    /// </summary>
    public int UsePulseSuppressedFrames { get; init; }

    /// <summary>
    /// EN: Prediction index where the last bounded Use pulse was emitted, or -1 when unknown.
    /// JA: 最後に bounded Use pulse を発行した prediction index です。不明な場合は -1 です。
    /// </summary>
    public int LastUsePulsePrediction { get; init; } = -1;

    /// <summary>
    /// EN: Frames elapsed since the last bounded Use pulse, or a large sentinel when no pulse is known.
    /// JA: 最後の bounded Use pulse から経過した frame 数です。既知の pulse がない場合は大きな番兵値です。
    /// </summary>
    public int UsePulseAgeFrames { get; init; } = 9999;

    /// <summary>
    /// EN: Number of known opened doors projected into the dynamic pipeline.
    /// JA: dynamic pipeline に射影された既知の opened door 数です。
    /// </summary>
    public int DoorOpenedCount { get; init; }

    /// <summary>
    /// EN: Whether the route has reached the central hall phase.
    /// JA: route が central hall phase に到達したかどうかです。
    /// </summary>
    public bool CentralHallEntered { get; init; }

    /// <summary>
    /// EN: Whether stairs or a late route marker toward the final room has been reached.
    /// JA: final room へ向かう stairs または late route marker に到達したかどうかです。
    /// </summary>
    public bool StairsEntered { get; init; }

    /// <summary>
    /// EN: Number of confirmed defeated enemies in the current route scope.
    /// JA: 現在の route scope で確認された defeated enemy 数です。
    /// </summary>
    public int EnemyDefeatedCount { get; init; }

    /// <summary>
    /// EN: Whether ammunition is likely unavailable for the current combat route.
    /// JA: 現在の combat route で ammunition が利用不能と推定されるかどうかです。
    /// </summary>
    public bool AmmoLikelyEmpty { get; init; }

    /// <summary>
    /// EN: Whether the route has entered the final room.
    /// JA: route が final room に入ったかどうかです。
    /// </summary>
    public bool FinalRoomEntered { get; init; }

    /// <summary>
    /// EN: Whether the exit switch has already been activated.
    /// JA: exit switch がすでに有効化されたかどうかです。
    /// </summary>
    public bool ExitSwitchPressed { get; init; }

    /// <summary>
    /// EN: Normalized central hall evidence score.
    /// JA: 正規化済み central hall evidence score です。
    /// </summary>
    public float CentralHallConfidence { get; init; }

    /// <summary>
    /// EN: Normalized final room evidence score.
    /// JA: 正規化済み final room evidence score です。
    /// </summary>
    public float FinalRoomConfidence { get; init; }

    /// <summary>
    /// EN: Whether central-hall combat should be bypassed in favor of route completion.
    /// JA: route completion を優先して central-hall combat を bypass すべきかどうかです。
    /// </summary>
    public bool CentralHallBypassAllowed
        => CentralHallEntered && (Health > 0 && Health < LowHealthThreshold || AmmoLikelyEmpty || EnemyDefeatedCount > 0);

    /// <summary>
    /// EN: Whether late-route evidence is enough to seek the final room.
    /// JA: final room を探索するのに十分な late-route evidence があるかどうかです。
    /// </summary>
    public bool FinalRoomRouteCandidate
        => StairsEntered || DoorOpenedCount > 1 || FinalRoomConfidence >= 0.45f;

    /// <summary>
    /// EN: Current health value projected from the compact sensor packet.
    /// JA: compact sensor packet から射影された現在 health 値です。
    /// </summary>
    public float Health => Sensor.Health;

    /// <summary>
    /// EN: Health threshold where the runtime starts preferring goal-first survival routing.
    /// JA: runtime が goal-first survival routing を優先し始める health threshold です。
    /// </summary>
    public int LowHealthThreshold { get; init; } = 50;

    /// <summary>
    /// EN: Health threshold where Zoe treats the frame as critical survival risk.
    /// JA: Zoe が frame を critical survival risk として扱う health threshold です。
    /// </summary>
    public int CriticalHealthThreshold { get; init; } = 18;

    /// <summary>
    /// EN: Whether health is below the goal-first survival threshold.
    /// JA: health が goal-first survival threshold を下回っているかどうかです。
    /// </summary>
    public bool LowHealth
        => Health > 0 && Health < LowHealthThreshold;

    /// <summary>
    /// EN: Whether health is below the critical survival threshold.
    /// JA: health が critical survival threshold を下回っているかどうかです。
    /// </summary>
    public bool CriticalHealth
        => Health > 0 && Health < CriticalHealthThreshold;

    /// <summary>
    /// EN: Whether low health should bias the route toward goal completion instead of optional combat.
    /// JA: low health により任意戦闘ではなく goal completion へ route を寄せるべきかどうかです。
    /// </summary>
    public bool LowHealthGoalFirst
        => LowHealth;

    /// <summary>
    /// EN: Normalized lethal-risk score derived from the health signal.
    /// JA: health signal から導出される正規化済み lethal-risk score です。
    /// </summary>
    public float LethalRisk
        => Health <= 0
            ? 1
            : Math.Clamp((LowHealthThreshold - Health) / Math.Max(1f, LowHealthThreshold), 0, 1);

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
