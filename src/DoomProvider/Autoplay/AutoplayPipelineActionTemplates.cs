namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayPipelineActionTemplates
{
    /// <summary>
    /// [EN] Executes the <c>DoorProbe</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>DoorProbe</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static Dictionary<string, string> DoorProbe()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "absQDelta <= $doorAimToleranceDegrees && depthSig > $doorUseDepth",
            ["turnYaw"] = "doorProbeYaw",
            ["useKey"] = "absQDelta <= $doorAimToleranceDegrees && depthSig <= $doorUseDepth"
        };

    /// <summary>
    /// [EN] Executes the <c>EmergencyEscape</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>EmergencyEscape</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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

    /// <summary>
    /// [EN] Executes the <c>Combat</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Combat</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static Dictionary<string, string> Combat()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "depthSig > 0.5",
            ["strafeLeft"] = "$enableStrafeRun && combatYaw > 0",
            ["strafeRight"] = "$enableStrafeRun && combatYaw < 0",
            ["turnYaw"] = "combatYaw",
            ["attackKey"] = "ammoLikelyEmpty == false && depthSig < 0.82 || ammoLikelyEmpty == false && soundEvent"
        };

    /// <summary>
    /// [EN] Executes the <c>VisualCombat</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>VisualCombat</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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

    /// <summary>
    /// [EN] Executes the <c>AuditoryCombat</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>AuditoryCombat</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static Dictionary<string, string> AuditoryCombat()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "audioEnemyFront && depthSig > 0.55",
            ["moveBackward"] = "false",
            ["strafeLeft"] = "false",
            ["strafeRight"] = "false",
            ["turnYaw"] = "enemyCombatYaw",
            ["attackKey"] = "ammoLikelyEmpty == false && audioEnemyFront && trustedCombatEvidence || ammoLikelyEmpty == false && visualEnemyFireReady || ammoLikelyEmpty == false && visualEnemyConfidence >= 0.35 && trustedCombatEvidence"
        };

    /// <summary>
    /// [EN] Executes the <c>StraightAdvance</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>StraightAdvance</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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

    /// <summary>
    /// [EN] Executes the <c>OpenCruise</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>OpenCruise</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static Dictionary<string, string> OpenCruise()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "true",
            ["strafeLeft"] = "$enableStrafeRun && openCruiseYaw >= 0",
            ["strafeRight"] = "$enableStrafeRun && openCruiseYaw < 0",
            ["turnYaw"] = "openCruiseYaw"
        };
}
