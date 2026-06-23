namespace AIKernel.Doom.Provider.Autoplay;

internal static class AutoplayOptimizationProfileParameters
{
    private static readonly IReadOnlyDictionary<string, Func<AutoplayOptimizationProfile, object>> Readers =
        new Dictionary<string, Func<AutoplayOptimizationProfile, object>>(StringComparer.Ordinal)
        {
            ["doorAimToleranceDegrees"] = profile => profile.DoorAimToleranceDegrees,
            ["doorSoftAimToleranceDegrees"] = profile => profile.DoorSoftAimToleranceDegrees,
            ["doorAimYawDegrees"] = profile => profile.DoorAimYawDegrees,
            ["doorAimFrames"] = profile => profile.DoorAimFrames,
            ["doorApproachFrames"] = profile => profile.DoorApproachFrames,
            ["doorSettleFrames"] = profile => profile.DoorSettleFrames,
            ["doorUseHoldFrames"] = profile => profile.DoorUseHoldFrames,
            ["emergencyStuckTicks"] = profile => profile.EmergencyStuckTicks,
            ["doorProbeStuckTicks"] = profile => profile.DoorProbeStuckTicks,
            ["doorUseDepth"] = profile => profile.DoorUseDepth,
            ["doorApproachDepth"] = profile => profile.DoorApproachDepth,
            ["blockedDepth"] = profile => profile.BlockedDepth,
            ["combatFaceThreshold"] = profile => profile.CombatFaceThreshold,
            ["combatAlertFrames"] = profile => profile.CombatAlertFrames,
            ["combatAlertPeakConfidence"] = profile => profile.CombatAlertPeakConfidence,
            ["combatAlertMaxDepth"] = profile => profile.CombatAlertMaxDepth,
            ["darkZoneScoreThreshold"] = profile => profile.DarkZoneScoreThreshold,
            ["darkZoneLumaThreshold"] = profile => profile.DarkZoneLumaThreshold,
            ["darkZoneConfirmFrames"] = profile => profile.DarkZoneConfirmFrames,
            ["doorTransitionArmedFrames"] = profile => profile.DoorTransitionArmedFrames,
            ["combatYawDegrees"] = profile => profile.CombatYawDegrees,
            ["lowHealthThreshold"] = profile => profile.LowHealthThreshold,
            ["criticalHealthThreshold"] = profile => profile.CriticalHealthThreshold,
            ["emergencyEscapeYawDegrees"] = profile => profile.EmergencyEscapeYawDegrees,
            ["wallAwayYawDegrees"] = profile => profile.WallAwayYawDegrees,
            ["openCruiseYawDegrees"] = profile => profile.OpenCruiseYawDegrees,
            ["enableStrafeRun"] = profile => profile.EnableStrafeRun,
            ["openCruiseWallVectorDeadZone"] = profile => profile.OpenCruiseWallVectorDeadZone,
            ["firstDoorRushFrames"] = profile => profile.FirstDoorRushFrames,
            ["firstDoorRushDepth"] = profile => profile.FirstDoorRushDepth,
            ["firstDoorRushWallVectorLimit"] = profile => profile.FirstDoorRushWallVectorLimit,
            ["firstDoorBearingFrames"] = profile => profile.FirstDoorBearingFrames,
            ["mapRushLookoutFrames"] = profile => profile.MapRushLookoutFrames,
            ["mapRushBackoffFrames"] = profile => profile.MapRushBackoffFrames,
            ["mapRushOpenWallVectorLimit"] = profile => profile.MapRushOpenWallVectorLimit,
            ["mapRushOpenDelta"] = profile => profile.MapRushOpenDelta,
            ["mapDoorSweepFrames"] = profile => profile.MapDoorSweepFrames
        };

    /// <summary>
    /// [EN] Executes the <c>ToDictionary</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>ToDictionary</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="profile">
    /// [EN] Supplies the <c>profile</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>profile</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static IReadOnlyDictionary<string, object> ToDictionary(AutoplayOptimizationProfile profile)
        => Readers.ToDictionary(item => item.Key, item => item.Value(profile), StringComparer.Ordinal);

    /// <summary>
    /// [EN] Executes the <c>TryGetValue</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>TryGetValue</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="profile">
    /// [EN] Supplies the <c>profile</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>profile</c> value です。
    /// </param>
    /// <param name="name">
    /// [EN] Supplies the <c>name</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>name</c> value です。
    /// </param>
    /// <param name="value">
    /// [EN] Supplies the <c>value</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>value</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static bool TryGetValue(AutoplayOptimizationProfile profile, string name, out object value)
    {
        if (Readers.TryGetValue(name, out var reader))
        {
            value = reader(profile);
            return true;
        }

        value = 0;
        return false;
    }
}
