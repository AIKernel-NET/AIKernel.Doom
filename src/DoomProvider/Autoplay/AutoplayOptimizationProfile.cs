namespace AIKernel.Doom.Provider.Autoplay;

using System.Text.Json;
/// <summary>
/// EN: Represents AutoplayOptimizationProfile.
/// EN: Documentation for public API. JA: AutoplayOptimizationProfile を表します。
/// </summary>

public sealed record AutoplayOptimizationProfile
{
    /// <summary>
    /// EN: Gets Version.
    /// EN: Documentation for public API. JA: Version を取得します。
    /// </summary>
    public string Version { get; init; } = "0.1.1-dev1";
    /// <summary>
    /// EN: Gets StrategyName.
    /// EN: Documentation for public API. JA: StrategyName を取得します。
    /// </summary>

    public string StrategyName { get; init; } = "SeparatedDoorProbeStrafeRunnerV4";
    /// <summary>
    /// EN: Gets DoorAimToleranceDegrees.
    /// EN: Documentation for public API. JA: DoorAimToleranceDegrees を取得します。
    /// </summary>

    public int DoorAimToleranceDegrees { get; init; } = 14;
    /// <summary>
    /// EN: Gets DoorSoftAimToleranceDegrees.
    /// EN: Documentation for public API. JA: DoorSoftAimToleranceDegrees を取得します。
    /// </summary>

    public int DoorSoftAimToleranceDegrees { get; init; } = 28;
    /// <summary>
    /// EN: Gets DoorAimYawDegrees.
    /// EN: Documentation for public API. JA: DoorAimYawDegrees を取得します。
    /// </summary>

    public int DoorAimYawDegrees { get; init; } = 10;
    /// <summary>
    /// EN: Gets DoorAimFrames.
    /// EN: Documentation for public API. JA: DoorAimFrames を取得します。
    /// </summary>

    public int DoorAimFrames { get; init; } = 7;
    /// <summary>
    /// EN: Gets DoorApproachFrames.
    /// EN: Documentation for public API. JA: DoorApproachFrames を取得します。
    /// </summary>

    public int DoorApproachFrames { get; init; } = 5;
    /// <summary>
    /// EN: Gets DoorSettleFrames.
    /// EN: Documentation for public API. JA: DoorSettleFrames を取得します。
    /// </summary>

    public int DoorSettleFrames { get; init; } = 3;
    /// <summary>
    /// EN: Gets DoorUseHoldFrames.
    /// EN: Documentation for public API. JA: DoorUseHoldFrames を取得します。
    /// </summary>

    public int DoorUseHoldFrames { get; init; } = 8;
    /// <summary>
    /// EN: Gets EmergencyStuckTicks.
    /// EN: Documentation for public API. JA: EmergencyStuckTicks を取得します。
    /// </summary>

    public int EmergencyStuckTicks { get; init; } = 54;
    /// <summary>
    /// EN: Gets DoorProbeStuckTicks.
    /// EN: Documentation for public API. JA: DoorProbeStuckTicks を取得します。
    /// </summary>

    public int DoorProbeStuckTicks { get; init; } = 12;
    /// <summary>
    /// EN: Gets DoorUseDepth.
    /// EN: Documentation for public API. JA: DoorUseDepth を取得します。
    /// </summary>

    public float DoorUseDepth { get; init; } = 0.62f;
    /// <summary>
    /// EN: Gets DoorApproachDepth.
    /// EN: Documentation for public API. JA: DoorApproachDepth を取得します。
    /// </summary>

    public float DoorApproachDepth { get; init; } = 0.86f;
    /// <summary>
    /// EN: Gets BlockedDepth.
    /// EN: Documentation for public API. JA: BlockedDepth を取得します。
    /// </summary>

    public float BlockedDepth { get; init; } = 0.28f;
    /// <summary>
    /// EN: Gets CombatFaceThreshold.
    /// EN: Documentation for public API. JA: CombatFaceThreshold を取得します。
    /// </summary>

    public float CombatFaceThreshold { get; init; } = 0.35f;
    /// <summary>
    /// EN: Gets CombatAlertFrames.
    /// EN: Documentation for public API. JA: CombatAlertFrames を取得します。
    /// </summary>

    public int CombatAlertFrames { get; init; } = 46;
    /// <summary>
    /// EN: Gets CombatAlertPeakConfidence.
    /// EN: Documentation for public API. JA: CombatAlertPeakConfidence を取得します。
    /// </summary>

    public float CombatAlertPeakConfidence { get; init; } = 0.62f;
    /// <summary>
    /// EN: Gets CombatAlertMaxDepth.
    /// EN: Documentation for public API. JA: CombatAlertMaxDepth を取得します。
    /// </summary>

    public float CombatAlertMaxDepth { get; init; } = 0.85f;
    /// <summary>
    /// EN: Gets DarkZoneScoreThreshold.
    /// EN: Documentation for public API. JA: DarkZoneScoreThreshold を取得します。
    /// </summary>

    public float DarkZoneScoreThreshold { get; init; } = 0.3f;
    /// <summary>
    /// EN: Gets DarkZoneLumaThreshold.
    /// EN: Documentation for public API. JA: DarkZoneLumaThreshold を取得します。
    /// </summary>

    public float DarkZoneLumaThreshold { get; init; } = 78f;
    /// <summary>
    /// EN: Gets DarkZoneConfirmFrames.
    /// EN: Documentation for public API. JA: DarkZoneConfirmFrames を取得します。
    /// </summary>

    public int DarkZoneConfirmFrames { get; init; } = 5;
    /// <summary>
    /// EN: Gets DoorTransitionArmedFrames.
    /// EN: Documentation for public API. JA: DoorTransitionArmedFrames を取得します。
    /// </summary>

    public int DoorTransitionArmedFrames { get; init; } = 720;
    /// <summary>
    /// EN: Gets CombatYawDegrees.
    /// EN: Documentation for public API. JA: CombatYawDegrees を取得します。
    /// </summary>

    public int CombatYawDegrees { get; init; } = 18;
    /// <summary>
    /// EN: Gets LowHealthThreshold.
    /// EN: Documentation for public API. JA: LowHealthThreshold を取得します。
    /// </summary>

    public int LowHealthThreshold { get; init; } = 18;
    /// <summary>
    /// EN: Gets EmergencyEscapeYawDegrees.
    /// EN: Documentation for public API. JA: EmergencyEscapeYawDegrees を取得します。
    /// </summary>

    public int EmergencyEscapeYawDegrees { get; init; } = 34;
    /// <summary>
    /// EN: Gets WallAwayYawDegrees.
    /// EN: Documentation for public API. JA: WallAwayYawDegrees を取得します。
    /// </summary>

    public int WallAwayYawDegrees { get; init; } = 10;
    /// <summary>
    /// EN: Gets OpenCruiseYawDegrees.
    /// EN: Documentation for public API. JA: OpenCruiseYawDegrees を取得します。
    /// </summary>

    public int OpenCruiseYawDegrees { get; init; } = 7;
    /// <summary>
    /// EN: Gets OpenCruiseWallVectorDeadZone.
    /// EN: Documentation for public API. JA: OpenCruiseWallVectorDeadZone を取得します。
    /// </summary>

    public float OpenCruiseWallVectorDeadZone { get; init; } = 0.08f;
    /// <summary>
    /// EN: Gets FirstDoorRushFrames.
    /// EN: Documentation for public API. JA: FirstDoorRushFrames を取得します。
    /// </summary>

    public int FirstDoorRushFrames { get; init; } = 1500;
    /// <summary>
    /// EN: Gets FirstDoorRushDepth.
    /// EN: Documentation for public API. JA: FirstDoorRushDepth を取得します。
    /// </summary>

    public float FirstDoorRushDepth { get; init; } = 0.74f;
    /// <summary>
    /// EN: Gets FirstDoorRushWallVectorLimit.
    /// EN: Documentation for public API. JA: FirstDoorRushWallVectorLimit を取得します。
    /// </summary>

    public float FirstDoorRushWallVectorLimit { get; init; } = 0.22f;
    /// <summary>
    /// EN: Gets FirstDoorBearingFrames.
    /// EN: Documentation for public API. JA: FirstDoorBearingFrames を取得します。
    /// </summary>

    public int FirstDoorBearingFrames { get; init; } = 220;
    /// <summary>
    /// EN: Gets MapRushLookoutFrames.
    /// EN: Documentation for public API. JA: MapRushLookoutFrames を取得します。
    /// </summary>

    public int MapRushLookoutFrames { get; init; } = 66;
    /// <summary>
    /// EN: Gets MapRushBackoffFrames.
    /// EN: Documentation for public API. JA: MapRushBackoffFrames を取得します。
    /// </summary>

    public int MapRushBackoffFrames { get; init; } = 7;
    /// <summary>
    /// EN: Gets MapRushOpenWallVectorLimit.
    /// EN: Documentation for public API. JA: MapRushOpenWallVectorLimit を取得します。
    /// </summary>

    public float MapRushOpenWallVectorLimit { get; init; } = 0.14f;
    /// <summary>
    /// EN: Gets MapRushOpenDelta.
    /// EN: Documentation for public API. JA: MapRushOpenDelta を取得します。
    /// </summary>

    public float MapRushOpenDelta { get; init; } = 1.85f;
    /// <summary>
    /// EN: Gets MapDoorSweepFrames.
    /// EN: Documentation for public API. JA: MapDoorSweepFrames を取得します。
    /// </summary>

    public int MapDoorSweepFrames { get; init; } = 72;
    /// <summary>
    /// EN: Gets EnableStrafeRun.
    /// EN: Documentation for public API. JA: EnableStrafeRun を取得します。
    /// </summary>

    public bool EnableStrafeRun { get; init; } = true;
    /// <summary>
    /// EN: Executes Default.
    /// EN: Documentation for public API. JA: Default を実行します。
    /// </summary>

    public static AutoplayOptimizationProfile Default { get; } = new();
    /// <summary>
    /// EN: Executes Load.
    /// EN: Documentation for public API. JA: Load を実行します。
    /// </summary>

    public static AutoplayOptimizationProfile Load(string path)
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            return Default;
        }

        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<AutoplayOptimizationProfile>(
            json,
            new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? Default;
    }
}
