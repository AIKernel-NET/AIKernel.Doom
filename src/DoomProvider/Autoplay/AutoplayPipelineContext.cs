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

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public SensorFusion Sensor { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public int RecoveryFrames { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public AutoplayOptimizationProfile Profile { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public float DepthSig { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public int QDelta { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public string Context { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public float WallVector { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public int EscapeYaw { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public int CombatYaw { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public int WallAwayYaw { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public int OpenCruiseYaw { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    public int AimYaw { get; }

    /// <summary>
    /// [EN] Executes the <c>get</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>get</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
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

    /// <summary>
    /// [EN] Executes the <c>EnemyDefeatedCount</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>EnemyDefeatedCount</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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

    /// <summary>
    /// [EN] Indicates whether combat routing is allowed to interpret the current computer-room evidence as an enemy context.
    /// [JA] 現在の computer-room evidence を enemy context として combat routing が解釈してよいかを示します。
    /// </summary>
    public bool ComputerRoomCombatContext
        => (Context == "computer-room" || ComputerRoomConfidence >= 0.28f)
            && !EnemyStructuralDecoy;

    /// <summary>
    /// [EN] Flags wall, pillar, terminal, or computer-panel shapes that resemble enemies but lack trusted combat evidence.
    /// [JA] enemy に似て見える wall / pillar / terminal / computer-panel 形状で、信頼できる combat evidence がないものを示します。
    /// </summary>
    public bool EnemyStructuralDecoy
        => (PostDoorTerminalSurface >= 0.24f || Tensor.Get("vision.wall") >= 0.42f)
            && RawVisualEnemyConfidence <= 0.50f
            && Tensor.Get("semantic.mapenemy") < 0.24f
            && Tensor.Get("system.combat") < 0.24f
            && !Sensor.SoundEvent;

    /// <summary>
    /// [EN] Preserves recent post-door enemy evidence when the current frame is partially masked by computer-panel or terminal surfaces.
    /// [JA] 現在 frame が computer-panel / terminal surface に一部隠れている場合でも、post-door の直近 enemy evidence を保持します。
    /// </summary>
    public float EnemyConfidencePeak
        => Clamp01(Max(Sensor.EnemyConfidencePeak, RawVisualEnemyConfidence));

    /// <summary>
    /// [EN] True when a weak post-door enemy trace should stay trusted because a recent high-confidence enemy peak was observed.
    /// [JA] 直近の高 confidence enemy peak が観測されているため、弱い post-door enemy trace を信頼済みとして維持すべき場合に true です。
    /// </summary>
    public bool PostDoorEnemyMemoryEvidence
        => DoorOpenedCount > 0
            && !EnemyHardStructuralDecoy
            && EnemyConfidencePeak >= 0.62f
            && RawVisualEnemyConfidence >= 0.08f
            && PostDoorTerminalSurface >= 0.28f;

    public float VisualEnemyConfidence
    {
        get
        {
            if (EnemyHardStructuralDecoy)
            {
                return Math.Min(Tensor.Get("vision.enemy"), 0.10f);
            }

            var visual = RawVisualEnemyConfidence;
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
        => AudioEnemyConfidence >= 0.24f && !EnemyStructuralDecoy;

    public bool AudioEnemyFront
        => AudioEnemyStrong;

    public bool AudioEnemyLeft
        => false;

    public bool AudioEnemyRight
        => false;

    public bool VisualEnemyVisible
        => VisualEnemyConfidence >= 0.28f
            || (!EnemyStructuralDecoy
                && VisualEnemyConfidence >= 0.18f
                && Tensor.Get("system.combat") >= 0.45f
                && Math.Abs(Sensor.FaceSig) >= Profile.CombatFaceThreshold);

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

    /// <summary>
    /// [EN] Aggregates only trusted enemy evidence for combat gates, excluding structural decoys and weak face signatures.
    /// [JA] structural decoy や弱い face signature を除外し、combat gate に渡せる信頼済み enemy evidence のみを集約します。
    /// </summary>
    public float TrustedEnemyThreat
        => EnemyHardStructuralDecoy
            ? 0
            : Max(
                VisualEnemyFireReady ? VisualEnemyConfidence : 0,
                VisualEnemyConfidence >= 0.52f ? VisualEnemyConfidence : 0,
                AudioEnemyConfidence >= 0.34f ? AudioEnemyConfidence : 0,
                PostDoorEnemyMemoryEvidence ? Math.Min(0.34f, EnemyConfidencePeak * 0.42f) : 0,
                Tensor.Get("semantic.mapenemy"));

    /// <summary>
    /// [EN] True when the pipeline has enough trusted visual, audio, or semantic evidence to enter or stay in combat.
    /// [JA] pipeline が combat に入る、または combat を維持するための信頼済み visual / audio / semantic evidence を十分に持つ場合に true です。
    /// </summary>
    public bool TrustedCombatEvidence
        => TrustedEnemyThreat >= 0.26f
            || PostDoorEnemyMemoryEvidence
            || (VisualEnemyVisible && VisualEnemyConfidence >= 0.35f)
            || AudioEnemyConfidence >= 0.34f;

    public bool CentralHallBypassAllowed
        => CentralHallEntered && (LowHealthGoalFirst || AmmoLikelyEmpty || EnemyDefeatedCount > 0);

    public bool FinalRoomRouteCandidate
        => StairsEntered || DoorOpenedCount > 1 || FinalRoomConfidence >= 0.45f;

    /// <summary>
    /// [EN] Executes the <c>UsePulseCooldownFrames</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>UsePulseCooldownFrames</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
    public int UsePulseCooldownFrames => 0;

    private AutoplaySensorTensor Tensor => Sensor.SensorTensor;

    private float TerminalSurface
        => Max(Tensor.Get("semantic.computer"), Tensor.Get("vision.dark"));

    private float RawVisualEnemyConfidence
        => Max(Tensor.Get("vision.enemy"), Tensor.Get("semantic.mapenemy"));

    private bool EnemyHardStructuralDecoy
        => Tensor.Get("vision.wall") >= 0.42f
            && RawVisualEnemyConfidence <= 0.50f
            && Tensor.Get("semantic.mapenemy") < 0.24f
            && Tensor.Get("system.combat") < 0.24f
            && !Sensor.SoundEvent;

    private bool DoorAudioSurface
        => Tensor.Get("semantic.door") >= 0.24f && Tensor.Get("system.combat") < 0.18f;

    /// <summary>
    /// [EN] Executes the <c>SemanticScore</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>SemanticScore</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="symbol">
    /// [EN] Supplies the <c>symbol</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>symbol</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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

    /// <summary>
    /// [EN] Executes the <c>SemanticScores</c> operation used by the Doom runtime or autoplay pipeline.
    /// [JA] Doom runtime または autoplay pipeline で使用される <c>SemanticScores</c> operation を実行します。
    /// </summary>
    /// <remarks>
    /// [EN] Keep this public shape stable: generated references, demo tooling, DTO projection, or profile fixtures may depend on it.
    /// [JA] この public shape は安定させてください。generated reference、demo tooling、DTO projection、または profile fixture が依存する可能性があります。
    /// </remarks>
    /// <param name="symbols">
    /// [EN] Supplies the <c>symbols</c> value for the Doom integration operation.
    /// [JA] Doom integration operation に渡す <c>symbols</c> value です。
    /// </param>
    /// <returns>
    /// [EN] The deterministic result produced by the Doom integration member.
    /// [JA] Doom integration member が生成する決定論的な result です。
    /// </returns>
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
