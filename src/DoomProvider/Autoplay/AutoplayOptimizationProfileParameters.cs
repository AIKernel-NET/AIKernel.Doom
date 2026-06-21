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

    public static IReadOnlyDictionary<string, object> ToDictionary(AutoplayOptimizationProfile profile)
        => Readers.ToDictionary(item => item.Key, item => item.Value(profile), StringComparer.Ordinal);

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
