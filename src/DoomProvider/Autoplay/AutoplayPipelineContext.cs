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

    public bool LowHealthGoalFirst
        => Sensor.Health > 0 && Sensor.Health < Profile.LowHealthThreshold;

    public bool CriticalHealth
        => Sensor.Health > 0 && Sensor.Health < Profile.CriticalHealthThreshold;

    public int DoorOpenedCount
        => SemanticScore("computer-room") >= 0.5f
            || SemanticScore("bridge") >= 0.5f
            || SemanticScore("central-hall") >= 0.5f
            ? 1
            : 0;

    public bool CentralHallEntered
        => Context == "central-hall" || Sensor.SensorTensor.SemanticScore("central-hall") >= 0.5f;

    public bool StairsEntered
        => Context == "stairs" || Sensor.SensorTensor.SemanticScore("final-room") >= 0.35f;

    public bool FinalRoomEntered
        => Context == "final-room" || Sensor.SensorTensor.SemanticScore("final-room") >= 0.72f;

    public bool ExitSwitchPressed
        => Sensor.SensorTensor.SemanticScore("exit-switch") >= 0.9f;

    public int EnemyDefeatedCount => 0;

    public bool AmmoLikelyEmpty
        => Tensor.Get("system.ammo") <= 0.05f
            && (Tensor.Get("system.combat") >= 0.18f
                || Tensor.Get("vision.enemy") >= 0.28f
                || Tensor.Get("semantic.mapenemy") >= 0.28f
                || Sensor.SoundEvent);

    public float CentralHallConfidence
        => SemanticScore("central-hall");

    public float BridgeConfidence
        => SemanticScore("bridge");

    public float ComputerRoomConfidence
        => SemanticScore("computer-room");

    public float PostDoorTerminalSurface
        => DoorOpenedCount > 0 ? TerminalSurface : 0;

    public float FinalRoomConfidence
        => SemanticScore("final-room");

    public float BridgeGreenHazard
        => BridgeConfidence;

    public bool BridgeLaneVisible
        => DoorOpenedCount > 0 && (Context == "bridge" || BridgeConfidence >= 0.18f);

    public bool ComputerRoomCombatContext
        => Context == "computer-room" || ComputerRoomConfidence >= 0.28f;

    public float VisualEnemyConfidence
    {
        get
        {
            var visual = Max(Tensor.Get("vision.enemy"), Tensor.Get("semantic.mapenemy"));
            if (TerminalSurface >= 0.24f && Tensor.Get("system.combat") < 0.18f)
            {
                return Math.Min(visual, 0.10f);
            }

            return visual;
        }
    }

    public float AudioEnemyConfidence
    {
        get
        {
            if (DoorAudioSurface)
            {
                return 0;
            }

            var audio = Max(Sensor.SoundEvent ? 1 : 0, Tensor.Get("system.audio"));
            var combat = Max(Tensor.Get("system.combat"), Tensor.Get("semantic.mapenemy"), Tensor.Get("vision.enemy") * 0.5f);
            return Clamp01(audio * combat);
        }
    }

    public bool AudioEnemyStrong
        => AudioEnemyConfidence >= 0.24f;

    public bool AudioEnemyFront
        => AudioEnemyStrong;

    public bool AudioEnemyLeft
        => false;

    public bool AudioEnemyRight
        => false;

    public bool VisualEnemyVisible
        => VisualEnemyConfidence >= 0.28f
            || (Tensor.Get("system.combat") >= 0.45f && Math.Abs(Sensor.FaceSig) >= Profile.CombatFaceThreshold);

    public bool VisualEnemyCentered
        => VisualEnemyConfidence >= 0.28f
            && Math.Abs(Sensor.FaceSig) <= Math.Max(0.10f, Profile.CombatFaceThreshold * 0.5f);

    public int VisualEnemyYaw
        => VisualEnemyCentered
            ? 0
            : (int)MathF.Round(Math.Clamp(
                Sensor.FaceSig * Math.Max(24, Profile.CombatYawDegrees * 2),
                -18,
                18));

    public bool VisualEnemyFireReady
        => VisualEnemyConfidence >= 0.36f
            && (VisualEnemyCentered || Math.Abs(Sensor.FaceSig) <= Profile.CombatFaceThreshold);

    public int EnemyCombatYaw
        => VisualEnemyVisible && !VisualEnemyCentered ? VisualEnemyYaw : 0;

    public bool CentralHallBypassAllowed
        => CentralHallEntered && (LowHealthGoalFirst || AmmoLikelyEmpty || EnemyDefeatedCount > 0);

    public bool FinalRoomRouteCandidate
        => StairsEntered || DoorOpenedCount > 1 || FinalRoomConfidence >= 0.45f;

    public int UsePulseCooldownFrames => 0;

    private AutoplaySensorTensor Tensor => Sensor.SensorTensor;

    private float TerminalSurface
        => Max(Tensor.Get("semantic.computer"), Tensor.Get("vision.dark"));

    private bool DoorAudioSurface
        => Tensor.Get("semantic.door") >= 0.24f && Tensor.Get("system.combat") < 0.18f;

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
            "central-hall" or "centralhall" => Context == "central-hall" ? 1 : 0,
            "final-room" or "finalroom" => Context == "final-room" ? 1 : 0,
            "exit-switch" or "exitswitch" => Context == "exit-switch" ? 1 : 0,
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

    private static float Max(params float[] values)
        => values.Length == 0 ? 0 : Clamp01(values.Max());

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}
