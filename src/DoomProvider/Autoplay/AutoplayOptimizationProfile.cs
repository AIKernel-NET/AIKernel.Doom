namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Profile-backed tuning values for the Doom autoplay control pipeline.
/// JA: Doom AutoPlay control pipeline の調整値を保持する profile です。
/// </summary>
public sealed record AutoplayOptimizationProfile
{
    public string Version { get; init; } = "0.1.3-dev0";

    public string StrategyName { get; init; } = "SeparatedDoorProbeStrafeRunnerV4";

    public AutoplayPipelineDefinition? Pipeline { get; init; } = AutoplayPipelineDefinition.Default;

    public int DoorAimToleranceDegrees { get; init; } = 14;

    public int DoorSoftAimToleranceDegrees { get; init; } = 28;

    public int DoorAimYawDegrees { get; init; } = 10;

    public int DoorAimFrames { get; init; } = 7;

    public int DoorApproachFrames { get; init; } = 5;

    public int DoorSettleFrames { get; init; } = 3;

    public int DoorUseHoldFrames { get; init; } = 8;

    public int EmergencyStuckTicks { get; init; } = 54;

    public int DoorProbeStuckTicks { get; init; } = 12;

    public float DoorUseDepth { get; init; } = 0.62f;

    public float DoorApproachDepth { get; init; } = 0.86f;

    public float BlockedDepth { get; init; } = 0.28f;

    public float CombatFaceThreshold { get; init; } = 0.35f;

    public int CombatAlertFrames { get; init; } = 46;

    public float CombatAlertPeakConfidence { get; init; } = 0.62f;

    public float CombatAlertMaxDepth { get; init; } = 0.85f;

    public float DarkZoneScoreThreshold { get; init; } = 0.3f;

    public float DarkZoneLumaThreshold { get; init; } = 78f;

    public int DarkZoneConfirmFrames { get; init; } = 5;

    public int DoorTransitionArmedFrames { get; init; } = 720;

    public int CombatYawDegrees { get; init; } = 18;

    public int LowHealthThreshold { get; init; } = 50;

    public int CriticalHealthThreshold { get; init; } = 18;

    public int EmergencyEscapeYawDegrees { get; init; } = 34;

    public int WallAwayYawDegrees { get; init; } = 10;

    public int OpenCruiseYawDegrees { get; init; } = 7;

    public float OpenCruiseWallVectorDeadZone { get; init; } = 0.08f;

    public int FirstDoorRushFrames { get; init; } = 1500;

    public float FirstDoorRushDepth { get; init; } = 0.74f;

    public float FirstDoorRushWallVectorLimit { get; init; } = 0.22f;

    public int FirstDoorBearingFrames { get; init; } = 220;

    public int MapRushLookoutFrames { get; init; } = 66;

    public int MapRushBackoffFrames { get; init; } = 7;

    public float MapRushOpenWallVectorLimit { get; init; } = 0.14f;

    public float MapRushOpenDelta { get; init; } = 1.85f;

    public int MapDoorSweepFrames { get; init; } = 72;

    public bool EnableStrafeRun { get; init; } = true;

    public static AutoplayOptimizationProfile Default { get; } = new();

    public static AutoplayOptimizationProfile Load(string path)
        => AutoplayOptimizationProfileJson.Load(path);

    public static AutoplayOptimizationProfile FromJson(string json)
        => AutoplayOptimizationProfileJson.FromJson(json);

    public static AutoplayOptimizationProfile FromJsonElement(System.Text.Json.JsonElement root)
        => AutoplayOptimizationProfileJson.FromJsonElement(root);

    public IReadOnlyDictionary<string, object> ToParameterDictionary()
        => AutoplayOptimizationProfileParameters.ToDictionary(this);
}
