namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayPipelineDefaultStages
{
    public static List<AutoplayPipelineStageDefinition> Create()
        =>
        [
            Stage(
                "low-health-escape",
                "health > 0 && health < $criticalHealthThreshold",
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
                "low-health-goal-first",
                "health > 0 && health < $lowHealthThreshold",
                new()
                {
                    ["moveForward"] = "depthSig > $blockedDepth",
                    ["moveBackward"] = "depthSig <= $blockedDepth",
                    ["turnYaw"] = "routeFallbackYaw",
                    ["runKey"] = "true"
                },
                96,
                "reach-central-hall",
                new() { ["computer-room"] = 0.4f, ["central-hall"] = 0.3f, ["corridor"] = 0.3f, ["safe-zone"] = 0.2f },
                0.0f),
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
                "soundEvent && ammoLikelyEmpty == false",
                AutoplayPipelineActionTemplates.Combat(),
                80,
                "avoid-enemy",
                new() { ["enemy"] = 1.0f },
                0.35f),
            Stage(
                "combat-visual",
                "absFaceSig >= $combatFaceThreshold && ammoLikelyEmpty == false",
                AutoplayPipelineActionTemplates.Combat(),
                79,
                "avoid-enemy",
                new() { ["enemy"] = 1.0f },
                0.35f),
            Stage(
                "bridge-poison-straight-lock",
                "doorOpenedCount > 0 && centralHallEntered == false && bridgeLaneVisible && bridgeGreenHazard >= 0.18 && depthSig > $blockedDepth",
                AutoplayPipelineActionTemplates.StraightAdvance(),
                97.5f,
                "reach-central-hall",
                new() { ["bridge"] = 0.7f, ["safe-zone"] = 0.2f },
                0.1f),
            Stage(
                "combat-visual-center-fire",
                "doorOpenedCount > 0 && visualEnemyVisible && ammoLikelyEmpty == false",
                AutoplayPipelineActionTemplates.VisualCombat(),
                87.4f,
                "engage-front-enemy",
                new() { ["enemy"] = 1.0f, ["computer-room"] = 0.2f },
                0.18f),
            Stage(
                "computer-room-audio-enemy-orient",
                "doorOpenedCount > 0 && centralHallEntered == false && audioEnemyStrong && computerRoomCombatContext && ammoLikelyEmpty == false",
                AutoplayPipelineActionTemplates.AuditoryCombat(),
                86.8f,
                "engage-front-enemy",
                new() { ["enemy"] = 0.7f, ["computer-room"] = 0.3f },
                0.18f),
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
                AutoplayPipelineActionTemplates.StraightAdvance(),
                45,
                "reach-bridge",
                new() { ["bridge"] = 1.0f },
                0.35f),
            Stage(
                "computer-room-route-cruise",
                "context == computer-room",
                AutoplayPipelineActionTemplates.StraightAdvance(),
                40,
                "reach-central-hall",
                new() { ["computer-room"] = 0.7f, ["central-hall"] = 0.3f },
                0.35f),
            Stage(
                "central-hall-enemy-engage",
                "centralHallEntered && enemyDefeatedCount <= 0 && ammoLikelyEmpty == false && lowHealthGoalFirst == false",
                new()
                {
                    ["moveForward"] = "depthSig > 0.55",
                    ["strafeLeft"] = "$enableStrafeRun && combatYaw > 0",
                    ["strafeRight"] = "$enableStrafeRun && combatYaw < 0",
                    ["turnYaw"] = "combatYaw",
                    ["attackKey"] = "true"
                },
                84,
                "engage-front-enemy",
                new() { ["enemy"] = 1.0f, ["central-hall"] = 0.45f },
                0.18f),
            Stage(
                "central-hall-low-health-bypass",
                "centralHallBypassAllowed",
                new()
                {
                    ["moveForward"] = "depthSig > $blockedDepth",
                    ["moveBackward"] = "depthSig <= $blockedDepth",
                    ["strafeLeft"] = "$enableStrafeRun && openCruiseYaw >= 0",
                    ["strafeRight"] = "$enableStrafeRun && openCruiseYaw < 0",
                    ["turnYaw"] = "openCruiseYaw",
                    ["runKey"] = "true"
                },
                83,
                "reach-final-room",
                new() { ["final-room"] = 0.35f, ["safe-zone"] = 0.25f, ["central-hall"] = 0.25f },
                0.0f),
            Stage(
                "final-room-route-cruise",
                "finalRoomRouteCandidate && finalRoomEntered == false",
                new()
                {
                    ["moveForward"] = "depthSig > $blockedDepth",
                    ["moveBackward"] = "depthSig <= $blockedDepth",
                    ["strafeLeft"] = "$enableStrafeRun && openCruiseYaw >= 0",
                    ["strafeRight"] = "$enableStrafeRun && openCruiseYaw < 0",
                    ["turnYaw"] = "openCruiseYaw",
                    ["runKey"] = "true"
                },
                74,
                "reach-final-room",
                new() { ["final-room"] = 1.0f, ["bridge"] = 0.25f },
                0.2f),
            Stage(
                "exit-switch-use",
                "finalRoomEntered && exitSwitchPressed == false",
                new()
                {
                    ["moveForward"] = "depthSig > $doorUseDepth",
                    ["turnYaw"] = "doorProbeYaw",
                    ["useKey"] = "usePulseCooldown <= 0"
                },
                93,
                "press-exit-switch",
                new() { ["exit-switch"] = 1.0f, ["final-room"] = 0.45f },
                0.0f),
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
        float priority,
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
