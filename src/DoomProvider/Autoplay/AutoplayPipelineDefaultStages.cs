namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayPipelineDefaultStages
{
    public static List<AutoplayPipelineStageDefinition> Create()
        =>
        [
            Stage(
                "low-health-escape",
                "health > 0 && health < $lowHealthThreshold",
                new()
                {
                    ["moveForward"] = "depthSig > 0.42",
                    ["moveBackward"] = "depthSig <= $blockedDepth",
                    ["strafeLeft"] = "wallVector >= 0",
                    ["strafeRight"] = "wallVector < 0",
                    ["turnYaw"] = "escapeYaw"
                },
                100,
                "stabilize-safe-zone",
                new() { ["safe-zone"] = 0.45f, ["enemy"] = 0.2f },
                0.1f),
            Stage(
                "recovery-escape",
                "recoveryFrames > 0",
                AutoplayPipelineActionTemplates.EmergencyEscape(),
                90,
                "stabilize-safe-zone",
                new() { ["safe-zone"] = 0.5f },
                0.0f),
            Stage(
                "stuck-escape",
                "stuckTicks >= $emergencyStuckTicks",
                AutoplayPipelineActionTemplates.EmergencyEscape(),
                89,
                "stabilize-safe-zone",
                new() { ["safe-zone"] = 0.4f, ["corridor"] = 0.2f },
                0.0f),
            Stage(
                "combat-auditory",
                "soundEvent",
                AutoplayPipelineActionTemplates.Combat(),
                80,
                "avoid-enemy",
                new() { ["enemy"] = 1.0f },
                0.35f),
            Stage(
                "combat-visual",
                "absFaceSig >= $combatFaceThreshold",
                AutoplayPipelineActionTemplates.Combat(),
                79,
                "avoid-enemy",
                new() { ["enemy"] = 1.0f },
                0.35f),
            Stage(
                "door-corner-probe",
                "context == corner",
                AutoplayPipelineActionTemplates.DoorProbe(),
                70,
                "open-door",
                new() { ["door"] = 0.7f, ["corridor"] = 0.25f },
                0.2f),
            Stage(
                "door-wall-probe",
                "context == wall && stuckTicks >= $doorProbeStuckTicks",
                AutoplayPipelineActionTemplates.DoorProbe(),
                69,
                "open-door",
                new() { ["door"] = 0.7f, ["corridor"] = 0.2f },
                0.2f),
            Stage(
                "door-corridor-probe",
                "context == corridor && stuckTicks >= 24 && depthSig <= 0.68",
                AutoplayPipelineActionTemplates.DoorProbe(),
                68,
                "open-door",
                new() { ["door"] = 0.6f, ["corridor"] = 0.35f },
                0.2f),
            Stage(
                "bridge-route-cruise",
                "context == bridge",
                AutoplayPipelineActionTemplates.OpenCruise(),
                45,
                "reach-bridge",
                new() { ["bridge"] = 1.0f },
                0.35f),
            Stage(
                "computer-room-route-cruise",
                "context == computer-room",
                AutoplayPipelineActionTemplates.OpenCruise(),
                40,
                "enter-computer-room",
                new() { ["computer-room"] = 1.0f },
                0.35f),
            Stage(
                "open-space-cruise",
                "context == open-space",
                AutoplayPipelineActionTemplates.OpenCruise(),
                20,
                "reach-bridge",
                new() { ["safe-zone"] = 0.2f, ["bridge"] = 0.25f },
                0.0f),
            Stage(
                "wall-follow-fallback",
                "true",
                new()
                {
                    ["moveForward"] = "true",
                    ["strafeLeft"] = "wallVector >= 0",
                    ["strafeRight"] = "wallVector < 0",
                    ["turnYaw"] = "wallAwayYaw"
                },
                0,
                "open-door",
                new() { ["corridor"] = 0.3f, ["door"] = 0.2f },
                0.0f)
        ];

    private static AutoplayPipelineStageDefinition Stage(
        string id,
        string when,
        Dictionary<string, string> action,
        int priority,
        string objective = "",
        Dictionary<string, float>? evidence = null,
        float threshold = 0)
        => new()
        {
            Id = id,
            When = when,
            Action = action,
            Priority = priority,
            Objective = objective,
            Evidence = evidence ?? [],
            Threshold = threshold
        };
}
