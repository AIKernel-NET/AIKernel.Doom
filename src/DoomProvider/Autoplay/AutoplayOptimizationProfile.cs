namespace AIKernel.Doom.Provider.Autoplay;

using System.Text.Json;

/// <summary>
/// EN: Profile-backed tuning values for the Doom autoplay control pipeline.
/// JA: Doom AutoPlay control pipeline の調整値を保持する profile です。
/// </summary>
public sealed record AutoplayOptimizationProfile
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public string Version { get; init; } = "0.1.1-dev1";

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

    public int LowHealthThreshold { get; init; } = 18;

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
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path))
        {
            return Default;
        }

        return FromJson(File.ReadAllText(path));
    }

    public static AutoplayOptimizationProfile FromJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return Default;
        }

        using var document = JsonDocument.Parse(json);
        return FromJsonElement(document.RootElement);
    }

    public static AutoplayOptimizationProfile FromJsonElement(JsonElement root)
    {
        if (root.ValueKind != JsonValueKind.Object)
        {
            return Default;
        }

        var defaults = Default;
        var parameters = root.TryGetProperty("parameters", out var parameterElement)
            && parameterElement.ValueKind == JsonValueKind.Object
                ? parameterElement
                : root;

        var pipeline = defaults.Pipeline;
        if (root.TryGetProperty("pipeline", out var pipelineElement)
            && pipelineElement.ValueKind == JsonValueKind.Object)
        {
            pipeline = pipelineElement.Deserialize<AutoplayPipelineDefinition>(JsonOptions) ?? pipeline;
        }

        return defaults with
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
    }

    public IReadOnlyDictionary<string, object> ToParameterDictionary()
        => new Dictionary<string, object>(StringComparer.Ordinal)
        {
            ["doorAimToleranceDegrees"] = DoorAimToleranceDegrees,
            ["doorSoftAimToleranceDegrees"] = DoorSoftAimToleranceDegrees,
            ["doorAimYawDegrees"] = DoorAimYawDegrees,
            ["doorAimFrames"] = DoorAimFrames,
            ["doorApproachFrames"] = DoorApproachFrames,
            ["doorSettleFrames"] = DoorSettleFrames,
            ["doorUseHoldFrames"] = DoorUseHoldFrames,
            ["emergencyStuckTicks"] = EmergencyStuckTicks,
            ["doorProbeStuckTicks"] = DoorProbeStuckTicks,
            ["doorUseDepth"] = DoorUseDepth,
            ["doorApproachDepth"] = DoorApproachDepth,
            ["blockedDepth"] = BlockedDepth,
            ["combatFaceThreshold"] = CombatFaceThreshold,
            ["combatAlertFrames"] = CombatAlertFrames,
            ["combatAlertPeakConfidence"] = CombatAlertPeakConfidence,
            ["combatAlertMaxDepth"] = CombatAlertMaxDepth,
            ["darkZoneScoreThreshold"] = DarkZoneScoreThreshold,
            ["darkZoneLumaThreshold"] = DarkZoneLumaThreshold,
            ["darkZoneConfirmFrames"] = DarkZoneConfirmFrames,
            ["doorTransitionArmedFrames"] = DoorTransitionArmedFrames,
            ["combatYawDegrees"] = CombatYawDegrees,
            ["lowHealthThreshold"] = LowHealthThreshold,
            ["emergencyEscapeYawDegrees"] = EmergencyEscapeYawDegrees,
            ["wallAwayYawDegrees"] = WallAwayYawDegrees,
            ["openCruiseYawDegrees"] = OpenCruiseYawDegrees,
            ["enableStrafeRun"] = EnableStrafeRun,
            ["openCruiseWallVectorDeadZone"] = OpenCruiseWallVectorDeadZone,
            ["firstDoorRushFrames"] = FirstDoorRushFrames,
            ["firstDoorRushDepth"] = FirstDoorRushDepth,
            ["firstDoorRushWallVectorLimit"] = FirstDoorRushWallVectorLimit,
            ["firstDoorBearingFrames"] = FirstDoorBearingFrames,
            ["mapRushLookoutFrames"] = MapRushLookoutFrames,
            ["mapRushBackoffFrames"] = MapRushBackoffFrames,
            ["mapRushOpenWallVectorLimit"] = MapRushOpenWallVectorLimit,
            ["mapRushOpenDelta"] = MapRushOpenDelta,
            ["mapDoorSweepFrames"] = MapDoorSweepFrames
        };

    private static string ReadString(JsonElement primary, JsonElement fallbackContainer, string key, string fallback)
        => TryGet(primary, fallbackContainer, key, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString() ?? fallback
            : fallback;

    private static int ReadInt(JsonElement primary, JsonElement fallbackContainer, string key, int fallback)
        => TryGet(primary, fallbackContainer, key, out var value) && value.TryGetInt32(out var parsed)
            ? parsed
            : fallback;

    private static float ReadFloat(JsonElement primary, JsonElement fallbackContainer, string key, float fallback)
        => TryGet(primary, fallbackContainer, key, out var value) && value.TryGetSingle(out var parsed)
            ? parsed
            : fallback;

    private static bool ReadBool(JsonElement primary, JsonElement fallbackContainer, string key, bool fallback)
        => TryGet(primary, fallbackContainer, key, out var value)
            ? value.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                _ => fallback
            }
            : fallback;

    private static bool TryGet(JsonElement primary, JsonElement fallbackContainer, string key, out JsonElement value)
    {
        if (primary.ValueKind == JsonValueKind.Object && primary.TryGetProperty(key, out value))
        {
            return true;
        }

        if (fallbackContainer.ValueKind == JsonValueKind.Object && fallbackContainer.TryGetProperty(key, out value))
        {
            return true;
        }

        value = default;
        return false;
    }
}
