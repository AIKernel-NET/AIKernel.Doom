namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// [EN] Defines the <c>AutoplaySensorTensorIcd</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>AutoplaySensorTensorIcd</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
public static class AutoplaySensorTensorIcd
{
    /// <summary>
    /// [EN] Gets the canonical ICD version for the Doom autoplay sensor tensor layout.
    /// [JA] Doom autoplay sensor tensor layout の canonical ICD version を取得します。
    /// </summary>
    public const string Version = "doom-sensor-tensor-v1";

    /// <summary>
    /// [EN] Gets the fixed tensor row count used by the Doom autoplay sensor ICD.
    /// [JA] Doom autoplay sensor ICD が使用する固定 tensor row 数を取得します。
    /// </summary>
    public const int Rows = 4;

    /// <summary>
    /// [EN] Gets the fixed tensor column count used by the Doom autoplay sensor ICD.
    /// [JA] Doom autoplay sensor ICD が使用する固定 tensor column 数を取得します。
    /// </summary>
    public const int Cols = 8;

    /// <summary>
    /// [EN] Executes the <c>Cols</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Cols</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public const int Size = Rows * Cols;

    /// <summary>
    /// [EN] Executes the <c>Offset</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Offset</c> operation を実行します。
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

    /// <summary>
    /// [EN] Executes the <c>SemanticScore</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>SemanticScore</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="tensor">
    /// [EN] Supplies the <c>tensor</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>tensor</c> value です。
    /// </param>
    /// <param name="symbol">
    /// [EN] Supplies the <c>symbol</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>symbol</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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
