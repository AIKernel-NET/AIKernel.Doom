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
            ["attackKey"] = "depthSig < 0.82 || soundEvent"
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
