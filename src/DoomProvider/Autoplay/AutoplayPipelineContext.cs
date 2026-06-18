namespace AIKernel.Doom.Provider.Autoplay;

internal sealed class AutoplayPipelineContext
{
    public AutoplayPipelineContext(
        SensorFusion sensor,
        int recoveryFrames,
        AutoplayOptimizationProfile profile)
    {
        Sensor = sensor;
        RecoveryFrames = recoveryFrames;
        Profile = profile;
        DepthSig = Math.Clamp(sensor.DepthSig, 0f, 1f);
        QDelta = Math.Clamp(sensor.QDelta, -180, 180);
        Context = string.IsNullOrWhiteSpace(sensor.ContextDict)
            ? "corridor"
            : sensor.ContextDict.Trim().ToLowerInvariant();
        WallVector = EstimateWallVector(sensor.Screen6Regions);
        EscapeYaw = WallVector > 0 ? -profile.EmergencyEscapeYawDegrees : profile.EmergencyEscapeYawDegrees;
        CombatYaw = sensor.FaceSig < -profile.CombatFaceThreshold ? -profile.CombatYawDegrees : profile.CombatYawDegrees;
        WallAwayYaw = WallVector > 0 ? -profile.WallAwayYawDegrees : profile.WallAwayYawDegrees;
        OpenCruiseYaw = Math.Abs(WallVector) < profile.OpenCruiseWallVectorDeadZone
            ? 0
            : WallVector > 0 ? -profile.OpenCruiseYawDegrees : profile.OpenCruiseYawDegrees;
        AimYaw = Math.Abs(QDelta) > profile.DoorSoftAimToleranceDegrees
            ? Math.Clamp(QDelta, -24, 24)
            : WallVector > 0 ? profile.DoorAimYawDegrees : -profile.DoorAimYawDegrees;
        DoorProbeYaw = Math.Abs(QDelta) <= profile.DoorAimToleranceDegrees ? 0 : AimYaw;
    }

    public SensorFusion Sensor { get; }

    public int RecoveryFrames { get; }

    public AutoplayOptimizationProfile Profile { get; }

    public float DepthSig { get; }

    public int QDelta { get; }

    public string Context { get; }

    public float WallVector { get; }

    public int EscapeYaw { get; }

    public int CombatYaw { get; }

    public int WallAwayYaw { get; }

    public int OpenCruiseYaw { get; }

    public int AimYaw { get; }

    public int DoorProbeYaw { get; }

    public float SemanticScore(string symbol)
    {
        var normalized = (symbol ?? string.Empty).Trim().ToLowerInvariant();
        var enemy = Sensor.SoundEvent || Math.Abs(Sensor.FaceSig) >= Profile.CombatFaceThreshold;
        var door = Context is "wall" or "corner"
            || (Context == "corridor" && (Sensor.StuckTicks >= Profile.DoorProbeStuckTicks || DepthSig <= Profile.DoorApproachDepth));
        var corridor = Context == "corridor";
        var safeZone = Sensor.Health >= Profile.LowHealthThreshold
            && !enemy
            && DepthSig > Profile.BlockedDepth
            && Math.Abs(WallVector) <= 0.5f;

        var heuristicScore = normalized switch
        {
            "door" => door ? 1 : 0,
            "corridor" => corridor ? 1 : 0,
            "enemy" => enemy ? 1 : 0,
            "safe-zone" or "safezone" => safeZone ? 1 : 0,
            "bridge" => Context == "bridge" ? 1 : 0,
            "computer-room" or "computerroom" => Context == "computer-room" ? 1 : 0,
            _ => 0
        };

        return Math.Max(heuristicScore, Sensor.SensorTensor.SemanticScore(normalized));
    }

    public IReadOnlyDictionary<string, float> SemanticScores(IEnumerable<string> symbols)
        => symbols
            .Where(symbol => !string.IsNullOrWhiteSpace(symbol))
            .Distinct(StringComparer.Ordinal)
            .OrderBy(symbol => symbol, StringComparer.Ordinal)
            .ToDictionary(symbol => symbol, SemanticScore, StringComparer.Ordinal);

    private static float EstimateWallVector(IReadOnlyList<float>? regions)
    {
        if (regions is null || regions.Count < 6)
        {
            return 0;
        }

        var left = regions[0] + regions[1] + (regions[2] * 1.3f);
        var right = regions[3] + regions[4] + (regions[5] * 1.3f);
        return Math.Clamp(right - left, -1f, 1f);
    }
}
