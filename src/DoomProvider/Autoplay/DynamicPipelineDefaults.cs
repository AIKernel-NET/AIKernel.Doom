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
        new("wallFlow", "visual"),
        new("corridorFlow", "visual"),
        new("gap", "visual"),
        new("looming", "visual"),
        new("stuck", "movement"),
        new("oscillation", "movement"),
        new("enemyPresence", "visual"),
        new("damageLocalization", "health"),
        new("projectileFlow", "visual"),
        new("threatField", "visual"),
        new("explorationEntropy", "visual"),
        new("itemBacktrack", "visual"),
        new("goalDirection", "visual"),
        new("safeZone", "visual"),
        new("intentConsistency", "movement"),
        new("movementStability", "movement"),
        new("confidenceFusion", "visual")
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
