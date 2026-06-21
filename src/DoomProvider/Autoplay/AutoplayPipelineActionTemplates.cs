namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayPipelineActionTemplates
{
    public static Dictionary<string, string> DoorProbe()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "absQDelta <= $doorAimToleranceDegrees && depthSig > $doorUseDepth",
            ["turnYaw"] = "doorProbeYaw",
            ["useKey"] = "absQDelta <= $doorAimToleranceDegrees && depthSig <= $doorUseDepth"
        };

    public static Dictionary<string, string> EmergencyEscape()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "depthSig > $blockedDepth",
            ["moveBackward"] = "depthSig <= $blockedDepth",
            ["strafeLeft"] = "$enableStrafeRun && wallVector >= 0",
            ["strafeRight"] = "$enableStrafeRun && wallVector < 0",
            ["turnYaw"] = "escapeYaw",
            ["useKey"] = "context == wall && depthSig <= $doorUseDepth"
        };

    public static Dictionary<string, string> Combat()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "depthSig > 0.5",
            ["strafeLeft"] = "$enableStrafeRun && combatYaw > 0",
            ["strafeRight"] = "$enableStrafeRun && combatYaw < 0",
            ["turnYaw"] = "combatYaw",
            ["attackKey"] = "ammoLikelyEmpty == false && depthSig < 0.82 || ammoLikelyEmpty == false && soundEvent"
        };

    public static Dictionary<string, string> VisualCombat()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "visualEnemyCentered && depthSig > 0.58",
            ["moveBackward"] = "false",
            ["strafeLeft"] = "false",
            ["strafeRight"] = "false",
            ["turnYaw"] = "visualEnemyYaw",
            ["attackKey"] = "ammoLikelyEmpty == false && visualEnemyFireReady"
        };

    public static Dictionary<string, string> AuditoryCombat()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "audioEnemyFront && depthSig > 0.55",
            ["moveBackward"] = "false",
            ["strafeLeft"] = "false",
            ["strafeRight"] = "false",
            ["turnYaw"] = "enemyCombatYaw",
            ["attackKey"] = "ammoLikelyEmpty == false && audioEnemyFront || ammoLikelyEmpty == false && visualEnemyFireReady || ammoLikelyEmpty == false && visualEnemyConfidence >= 0.35 || ammoLikelyEmpty == false && absFaceSig >= $combatFaceThreshold"
        };

    public static Dictionary<string, string> StraightAdvance()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "depthSig > $blockedDepth",
            ["moveBackward"] = "false",
            ["strafeLeft"] = "false",
            ["strafeRight"] = "false",
            ["turnYaw"] = "0",
            ["useKey"] = "false",
            ["attackKey"] = "false"
        };

    public static Dictionary<string, string> OpenCruise()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "true",
            ["strafeLeft"] = "$enableStrafeRun && openCruiseYaw >= 0",
            ["strafeRight"] = "$enableStrafeRun && openCruiseYaw < 0",
            ["turnYaw"] = "openCruiseYaw"
        };
}
