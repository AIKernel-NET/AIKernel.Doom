namespace AIKernel.Doom.Provider.Autoplay;

[Obsolete("Use IPhainesis and Phainomenon for event extraction. DET remains only as a UI compatibility label.")]
public interface ILegacyDetAdapter
{
    Phainomenon Detect(SensorFrame frame);
}
