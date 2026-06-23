namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// [EN] Defines the <c>ILegacyDetAdapter</c> public integration contract used by the Doom runtime, HUD projection, autoplay planner, and test fixtures.
/// [JA] Doom runtime、HUD 投影、autoplay planner、および test fixture が共有する public integration contract として <c>ILegacyDetAdapter</c> を定義します。
/// </summary>
/// <remarks>
/// [EN] Keep this shape stable: consumers may bind it from C#, JavaScript DTO projection, profile fixtures, or generated reference documentation.
/// [JA] この形状は安定させてください。C#、JavaScript DTO 投影、profile fixture、生成 reference documentation から参照される可能性があります。
/// </remarks>
[Obsolete("Use IPhainesis and Phainomenon for event extraction. DET remains only as a UI compatibility label.")]
public interface ILegacyDetAdapter
{
    /// <summary>
    /// [EN] Extracts a legacy DET phainomenon from a raw Doom sensor frame.
    /// [JA] raw Doom sensor frame から legacy DET phainomenon を抽出します。
    /// </summary>
    /// <param name="frame">
    /// [EN] The sensor frame captured from the Doom runtime.
    /// [JA] Doom runtime から取得した sensor frame です。
    /// </param>
    /// <returns>
    /// [EN] The phainomenon produced for compatibility with older DET-oriented HUD labels.
    /// [JA] 古い DET-oriented HUD label との互換性のために生成する phainomenon です。
    /// </returns>
    Phainomenon Detect(SensorFrame frame);
}
