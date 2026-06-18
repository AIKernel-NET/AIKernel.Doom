namespace AIKernel.Doom.Provider.Autoplay;

public sealed record DynamicPipelineContext
{
    public SensorFusion Sensor { get; init; } =
        new([0, 0, 0, 0, 0, 0], 1, 100, 0, "corridor", false, 0, 0);

    public int RecoveryFrames { get; init; }

    public float Health => Sensor.Health;

    public float LethalRisk
        => Health <= 0
            ? 1
            : Math.Clamp((10 - Health) / 10f, 0, 1);

    public IReadOnlyDictionary<string, float> SemanticScores { get; init; } =
        new Dictionary<string, float>(StringComparer.Ordinal);
}
