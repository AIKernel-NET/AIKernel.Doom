namespace AIKernel.Doom.Provider.Autoplay;

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

    public static float SemanticScore(AutoplaySensorTensor tensor, string symbol)
    {
        if (tensor.IsEmpty)
        {
            return 0;
        }

        var normalized = (symbol ?? string.Empty).Trim().ToLowerInvariant();
        var enemy = Math.Max(Math.Max(tensor.Get("vision.enemy"), tensor.Get("semantic.mapEnemy")), tensor.Get("system.combat"));
        return normalized switch
        {
            "door" => tensor.Get("semantic.door"),
            "corridor" => tensor.Get("semantic.corridor"),
            "enemy" => enemy,
            "safe-zone" or "safezone" => Clamp01(Math.Max(tensor.Get("system.health") * (1 - enemy), tensor.Get("vision.open") * 0.5f)),
            "bridge" => tensor.Get("semantic.bridge"),
            "computer-room" or "computerroom" => tensor.Get("semantic.computer"),
            _ => 0
        };
    }

    private static int Position(int row, int col)
        => (row * Cols) + col;

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}
