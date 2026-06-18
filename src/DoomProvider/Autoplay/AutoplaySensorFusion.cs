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
