namespace AIKernel.Doom.Provider.Autoplay;

internal static class DynamicPipelineDefaults
{
    public static readonly string[] Sensors =
    [
        "visual",
        "audio",
        "movement",
        "compass",
        "collision",
        "health"
    ];

    public static readonly PhainesisEventRule[] Events =
    [
        new("looming", "visual"),
        new("stuck", "movement"),
        new("damage", "health"),
        new("enemySeen", "visual")
    ];

    public static readonly string[] Priorities =
    [
        "pathos",
        "ethos",
        "logos"
    ];

    public static readonly string[] ToposVectors =
    [
        "LogosVector",
        "PathosVector",
        "EthosVector",
        "ToposDecisionVector"
    ];

    public static readonly string[] KinesisActions =
    [
        "moveForward",
        "moveBackward",
        "turnYaw",
        "strafe",
        "shoot"
    ];

    public static readonly ZoeVetoRule[] ZoeVetoRules =
    [
        new("hp < 10"),
        new("lethalRisk > 0.7")
    ];
}
