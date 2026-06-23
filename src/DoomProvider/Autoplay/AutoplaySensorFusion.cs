namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// [EN] Carries the fused Aisthesis and Phainesis sensor packet consumed by the autoplay decision stack.
/// [JA] autoplay decision stack が消費する Aisthesis と Phainesis の fused sensor packet を運びます。
/// </summary>
/// <remarks>
/// [EN] Keep this contract stable because legacy strategies, tensor adapters, and VM regression fixtures still exchange this compact sensor shape.
/// [JA] legacy strategy、tensor adapter、VM regression fixture がこの compact sensor shape を交換するため、この contract は安定させてください。
/// </remarks>
/// <param name="Screen6Regions">
/// [EN] Six coarse visual region scores projected from the current Doom frame.
/// [JA] 現在の Doom frame から投影された 6 分割の coarse visual region score です。
/// </param>
/// <param name="DepthSig">
/// [EN] Depth signature used to detect wall pressure, corridors, and looming obstacles.
/// [JA] wall pressure、corridor、接近障害物を検知するための depth signature です。
/// </param>
/// <param name="Health">
/// [EN] Current health value observed by the runtime sensor bridge.
/// [JA] runtime sensor bridge が観測した現在の health value です。
/// </param>
/// <param name="FaceSig">
/// [EN] Face or frontal-view signature used by older route and combat heuristics.
/// [JA] 旧 route / combat heuristic が使用する face または frontal-view signature です。
/// </param>
/// <param name="ContextDict">
/// [EN] Compact context label dictionary emitted by the sensor bridge.
/// [JA] sensor bridge が出力する compact context label dictionary です。
/// </param>
/// <param name="SoundEvent">
/// [EN] Indicates whether the current tick contains an audio event relevant to navigation or combat.
/// [JA] 現在 tick に navigation または combat に関係する audio event が含まれるかを示します。
/// </param>
/// <param name="StuckTicks">
/// [EN] Number of consecutive ticks where movement appeared blocked or ineffective.
/// [JA] movement が blocked または ineffective と見なされた連続 tick 数です。
/// </param>
/// <param name="QDelta">
/// [EN] Quantized motion or heading delta used by legacy decision logic.
/// [JA] legacy decision logic が使用する quantized motion または heading delta です。
/// </param>
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
    /// <summary>
    /// [EN] Gets or initializes the canonical tensor view derived from this fused sensor packet.
    /// [JA] この fused sensor packet から派生した canonical tensor view を取得または初期化します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public AutoplaySensorTensor SensorTensor { get; init; } = AutoplaySensorTensor.Empty;

    /// <summary>
    /// [EN] Gets or initializes the recent peak confidence for enemy evidence before terminal or structural suppression is applied.
    /// [JA] terminal / structural 抑制を適用する前の enemy evidence の直近 peak confidence を取得または初期化します。
    /// </summary>
    /// <remarks>
    /// [EN] Post-door combat gates use this memory signal to keep a weak but recently confirmed enemy from being erased by computer-panel false-positive suppression.
    /// [JA] post-door combat gate はこの memory signal を使い、computer-panel false-positive 抑制によって直近確認済みの弱い enemy が消されないようにします。
    /// </remarks>
    public float EnemyConfidencePeak { get; init; }
}
