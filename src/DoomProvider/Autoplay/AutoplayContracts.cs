namespace AIKernel.Doom.Provider.Autoplay;
/// <summary>
/// EN: Represents SensorFusion.
/// EN: Documentation for public API. JA: SensorFusion を表します。
/// </summary>

public sealed record SensorFusion(
    float[] Screen6Regions,
    float DepthSig,
    int Health,
    float FaceSig,
    string ContextDict,
    bool SoundEvent,
    int StuckTicks,
    int QDelta)
{
    public AutoplaySensorTensor SensorTensor { get; init; } = AutoplaySensorTensor.Empty;
}

/// <summary>
/// EN: Low-layer Doom sensor matrix with semantic ICD accessors.
/// JA: 低 Layer の Doom sensor matrix と semantic ICD accessor です。
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
    {
        if (IsEmpty)
        {
            return 0;
        }

        var normalized = (symbol ?? string.Empty).Trim().ToLowerInvariant();
        var enemy = Math.Max(Math.Max(Get("vision.enemy"), Get("semantic.mapEnemy")), Get("system.combat"));
        return normalized switch
        {
            "door" => Get("semantic.door"),
            "corridor" => Get("semantic.corridor"),
            "enemy" => enemy,
            "safe-zone" or "safezone" => Clamp01(Math.Max(Get("system.health") * (1 - enemy), Get("vision.open") * 0.5f)),
            "bridge" => Get("semantic.bridge"),
            "computer-room" or "computerroom" => Get("semantic.computer"),
            _ => 0
        };
    }

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}

public static class AutoplaySensorTensorIcd
{
    public const string Version = "doom-sensor-tensor-v1";
    public const int Rows = 4;
    public const int Cols = 8;
    public const int Size = Rows * Cols;

    public static int Offset(string channel)
    {
        var normalized = (channel ?? string.Empty).Trim().ToLowerInvariant();
        return normalized switch
        {
            "vision.depth" => Position(0, 0),
            "vision.target" => Position(0, 1),
            "vision.enemy" => Position(0, 2),
            "vision.wall" => Position(0, 3),
            "vision.corner" => Position(0, 4),
            "vision.dark" => Position(0, 5),
            "vision.open" => Position(0, 6),
            "vision.bluefloor" => Position(0, 7),
            "motion.forward" => Position(1, 0),
            "motion.obstacle" => Position(1, 1),
            "motion.turn" => Position(1, 2),
            "motion.entrance" => Position(1, 3),
            "motion.stall" => Position(1, 4),
            "motion.inputstall" => Position(1, 5),
            "motion.stuck" => Position(1, 6),
            "motion.delta" => Position(1, 7),
            "semantic.door" => Position(2, 0),
            "semantic.corridor" => Position(2, 1),
            "semantic.computer" => Position(2, 2),
            "semantic.bridge" => Position(2, 3),
            "semantic.finalroom" => Position(2, 4),
            "semantic.mapdoor" => Position(2, 5),
            "semantic.mapdark" => Position(2, 6),
            "semantic.mapenemy" => Position(2, 7),
            "system.ammo" => Position(3, 0),
            "system.health" => Position(3, 1),
            "system.audio" => Position(3, 2),
            "system.combat" => Position(3, 3),
            "system.priority" => Position(3, 4),
            "system.ctg" => Position(3, 5),
            "system.kairos" => Position(3, 6),
            "system.enabled" => Position(3, 7),
            _ => -1
        };
    }

    private static int Position(int row, int col)
        => (row * Cols) + col;
}
/// <summary>
/// EN: Represents ActionCommand.
/// EN: Documentation for public API. JA: ActionCommand を表します。
/// </summary>

public sealed record ActionCommand(
    bool MoveForward,
    bool MoveBackward,
    bool StrafeLeft,
    bool StrafeRight,
    int TurnYaw,
    bool UseKey,
    bool AttackKey);
/// <summary>
/// EN: Defines the IAutoplayStrategy contract.
/// EN: Documentation for public API. JA: IAutoplayStrategy contract を定義します。
/// </summary>

public interface IAutoplayStrategy
{
    string StrategyName { get; }

    ActionCommand ExecuteTick(SensorFusion sensor, int recoveryFrames);
}
