namespace AIKernel.Doom.Provider.Autoplay;

using System.Text.Json;

internal static class AutoplayOptimizationProfileJsonParameters
{
    /// <summary>
    /// [EN] Executes the <c>Apply</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>Apply</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="root">
    /// [EN] Supplies the <c>root</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>root</c> value です。
    /// </param>
    /// <param name="parameters">
    /// [EN] Supplies the <c>parameters</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>parameters</c> value です。
    /// </param>
    /// <param name="defaults">
    /// [EN] Supplies the <c>defaults</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>defaults</c> value です。
    /// </param>
    /// <param name="pipeline">
    /// [EN] Supplies the <c>pipeline</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>pipeline</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public static AutoplayOptimizationProfile Apply(
        JsonElement root,
        JsonElement parameters,
        AutoplayOptimizationProfile defaults,
        AutoplayPipelineDefinition? pipeline)
        => defaults with
        {
            Version = ReadString(root, root, "version", defaults.Version),
            StrategyName = ReadString(root, root, "strategyName", defaults.StrategyName),
            Pipeline = pipeline,
            DoorAimToleranceDegrees = ReadInt(parameters, root, "doorAimToleranceDegrees", defaults.DoorAimToleranceDegrees),
            DoorSoftAimToleranceDegrees = ReadInt(parameters, root, "doorSoftAimToleranceDegrees", defaults.DoorSoftAimToleranceDegrees),
            DoorAimYawDegrees = ReadInt(parameters, root, "doorAimYawDegrees", defaults.DoorAimYawDegrees),
            DoorAimFrames = ReadInt(parameters, root, "doorAimFrames", defaults.DoorAimFrames),
            DoorApproachFrames = ReadInt(parameters, root, "doorApproachFrames", defaults.DoorApproachFrames),
            DoorSettleFrames = ReadInt(parameters, root, "doorSettleFrames", defaults.DoorSettleFrames),
            DoorUseHoldFrames = ReadInt(parameters, root, "doorUseHoldFrames", defaults.DoorUseHoldFrames),
            EmergencyStuckTicks = ReadInt(parameters, root, "emergencyStuckTicks", defaults.EmergencyStuckTicks),
            DoorProbeStuckTicks = ReadInt(parameters, root, "doorProbeStuckTicks", defaults.DoorProbeStuckTicks),
            DoorUseDepth = ReadFloat(parameters, root, "doorUseDepth", defaults.DoorUseDepth),
            DoorApproachDepth = ReadFloat(parameters, root, "doorApproachDepth", defaults.DoorApproachDepth),
            BlockedDepth = ReadFloat(parameters, root, "blockedDepth", defaults.BlockedDepth),
            CombatFaceThreshold = ReadFloat(parameters, root, "combatFaceThreshold", defaults.CombatFaceThreshold),
            CombatAlertFrames = ReadInt(parameters, root, "combatAlertFrames", defaults.CombatAlertFrames),
            CombatAlertPeakConfidence = ReadFloat(parameters, root, "combatAlertPeakConfidence", defaults.CombatAlertPeakConfidence),
            CombatAlertMaxDepth = ReadFloat(parameters, root, "combatAlertMaxDepth", defaults.CombatAlertMaxDepth),
            DarkZoneScoreThreshold = ReadFloat(parameters, root, "darkZoneScoreThreshold", defaults.DarkZoneScoreThreshold),
            DarkZoneLumaThreshold = ReadFloat(parameters, root, "darkZoneLumaThreshold", defaults.DarkZoneLumaThreshold),
            DarkZoneConfirmFrames = ReadInt(parameters, root, "darkZoneConfirmFrames", defaults.DarkZoneConfirmFrames),
            DoorTransitionArmedFrames = ReadInt(parameters, root, "doorTransitionArmedFrames", defaults.DoorTransitionArmedFrames),
            CombatYawDegrees = ReadInt(parameters, root, "combatYawDegrees", defaults.CombatYawDegrees),
            LowHealthThreshold = ReadInt(parameters, root, "lowHealthThreshold", defaults.LowHealthThreshold),
            CriticalHealthThreshold = ReadInt(parameters, root, "criticalHealthThreshold", defaults.CriticalHealthThreshold),
            EmergencyEscapeYawDegrees = ReadInt(parameters, root, "emergencyEscapeYawDegrees", defaults.EmergencyEscapeYawDegrees),
            WallAwayYawDegrees = ReadInt(parameters, root, "wallAwayYawDegrees", defaults.WallAwayYawDegrees),
            OpenCruiseYawDegrees = ReadInt(parameters, root, "openCruiseYawDegrees", defaults.OpenCruiseYawDegrees),
            EnableStrafeRun = ReadBool(parameters, root, "enableStrafeRun", defaults.EnableStrafeRun),
            OpenCruiseWallVectorDeadZone = ReadFloat(parameters, root, "openCruiseWallVectorDeadZone", defaults.OpenCruiseWallVectorDeadZone),
            FirstDoorRushFrames = ReadInt(parameters, root, "firstDoorRushFrames", defaults.FirstDoorRushFrames),
            FirstDoorRushDepth = ReadFloat(parameters, root, "firstDoorRushDepth", defaults.FirstDoorRushDepth),
            FirstDoorRushWallVectorLimit = ReadFloat(parameters, root, "firstDoorRushWallVectorLimit", defaults.FirstDoorRushWallVectorLimit),
            FirstDoorBearingFrames = ReadInt(parameters, root, "firstDoorBearingFrames", defaults.FirstDoorBearingFrames),
            MapRushLookoutFrames = ReadInt(parameters, root, "mapRushLookoutFrames", defaults.MapRushLookoutFrames),
            MapRushBackoffFrames = ReadInt(parameters, root, "mapRushBackoffFrames", defaults.MapRushBackoffFrames),
            MapRushOpenWallVectorLimit = ReadFloat(parameters, root, "mapRushOpenWallVectorLimit", defaults.MapRushOpenWallVectorLimit),
            MapRushOpenDelta = ReadFloat(parameters, root, "mapRushOpenDelta", defaults.MapRushOpenDelta),
            MapDoorSweepFrames = ReadInt(parameters, root, "mapDoorSweepFrames", defaults.MapDoorSweepFrames)
        };

    private static string ReadString(JsonElement primary, JsonElement fallbackContainer, string key, string fallback)
        => AutoplayOptimizationProfileJsonReader.ReadString(primary, fallbackContainer, key, fallback);

    private static int ReadInt(JsonElement primary, JsonElement fallbackContainer, string key, int fallback)
        => AutoplayOptimizationProfileJsonReader.ReadInt(primary, fallbackContainer, key, fallback);

    private static float ReadFloat(JsonElement primary, JsonElement fallbackContainer, string key, float fallback)
        => AutoplayOptimizationProfileJsonReader.ReadFloat(primary, fallbackContainer, key, fallback);

    private static bool ReadBool(JsonElement primary, JsonElement fallbackContainer, string key, bool fallback)
        => AutoplayOptimizationProfileJsonReader.ReadBool(primary, fallbackContainer, key, fallback);
}
