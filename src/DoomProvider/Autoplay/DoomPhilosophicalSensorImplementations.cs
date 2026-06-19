namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Default Doom-local Phainesis implementation that extracts phenomenon scores from the sensor tensor.
/// JA: sensor tensor から phenomenon score を抽出する Doom ローカルの既定 Phainesis 実装です。
/// </summary>
public sealed class DoomPhainesis : IPhainesis
{
    /// <summary>
    /// EN: Extracts deterministic phenomenon scores without invoking Gate or action logic.
    /// JA: Gate や action logic を呼び出さず、deterministic な phenomenon score を抽出します。
    /// </summary>
    public Phainomenon Extract(SensorFrame frame)
    {
        ArgumentNullException.ThrowIfNull(frame);

        var tensor = frame.SensorTensor;
        var healthRisk = HealthRisk(frame.Health);
        var enemy = tensor.SemanticScore("enemy");
        var corridor = tensor.SemanticScore("corridor");
        var door = tensor.SemanticScore("door");
        var safeZone = tensor.SemanticScore("safe-zone");
        var open = tensor.Get("vision.open");
        var wall = tensor.Get("vision.wall");
        var corner = tensor.Get("vision.corner");
        var obstacle = tensor.Get("motion.obstacle");
        var stall = Math.Max(tensor.Get("motion.stall"), Math.Max(tensor.Get("motion.inputstall"), tensor.Get("motion.stuck")));
        var audio = tensor.Get("system.audio");
        var combat = Math.Max(enemy, tensor.Get("system.combat"));
        var delta = tensor.Get("motion.delta");
        var movement = Math.Max(tensor.Get("motion.forward"), Math.Max(tensor.Get("motion.turn"), delta));
        var goal = Max(door, corridor, tensor.SemanticScore("bridge"), tensor.SemanticScore("computer-room"));
        var threat = Max(enemy, combat, healthRisk, Clamp01(delta * enemy));
        var stability = Clamp01(1 - Math.Max(stall, obstacle));

        return new Phainomenon
        {
            Events = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["wallFlow"] = Max(wall, corner, Clamp01(delta * wall)),
                ["corridorFlow"] = Max(corridor, Clamp01(open * (1 - wall))),
                ["gap"] = Max(open, tensor.Get("motion.entrance")),
                ["stuck"] = Max(stall, Clamp01(obstacle * (1 - movement))),
                ["oscillation"] = Clamp01(tensor.Get("motion.turn") * (1 - stability)),
                ["looming"] = Max(Clamp01(enemy * delta), Clamp01(combat * delta)),
                ["enemyPresence"] = enemy,
                ["damageLocalization"] = Clamp01(healthRisk * Math.Max(audio, combat)),
                ["projectileFlow"] = Clamp01(Max(delta, tensor.Get("vision.target")) * combat),
                ["threatField"] = threat,
                ["explorationEntropy"] = Clamp01(open * (1 - threat) * (1 - goal)),
                ["itemBacktrack"] = Clamp01(healthRisk * safeZone),
                ["goalDirection"] = goal,
                ["safeZone"] = safeZone,
                ["intentConsistency"] = Clamp01(tensor.Get("system.enabled") * stability),
                ["movementStability"] = stability,
                ["confidenceFusion"] = Average(tensor.Get("system.enabled"), tensor.Get("system.ctg"), stability),
                ["damage"] = healthRisk,
                ["enemySeen"] = enemy,
                ["audioEvent"] = audio
            }
        };
    }

    private static float HealthRisk(HealthSignal health)
        => health.IsLikelyFatal ? 1 : Clamp01((100 - Math.Clamp(health.Health, 0, 100)) / 100f);

    private static float Average(params float[] values)
        => values.Length == 0 ? 0 : Clamp01(values.Sum() / values.Length);

    private static float Max(params float[] values)
        => values.Length == 0 ? 0 : Clamp01(values.Max());

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}

/// <summary>
/// EN: Default Doom-local Nous implementation that turns phenomena into meaning vectors.
/// JA: phenomena を meaning vector に変換する Doom ローカルの既定 Nous 実装です。
/// </summary>
public sealed class DoomNous : INous
{
    /// <summary>
    /// EN: Vectorizes phenomenon scores into Logos, Pathos, Ethos, and stability-oriented signals.
    /// JA: phenomenon score を Logos / Pathos / Ethos / 安定性向け signal へ vectorize します。
    /// </summary>
    public MeaningVectorPacket Vectorize(Phainomenon phainomenon)
    {
        ArgumentNullException.ThrowIfNull(phainomenon);

        return new MeaningVectorPacket
        {
            Source = phainomenon,
            MeaningVectors = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["wallFlowVector"] = phainomenon.EventScore("wallFlow"),
                ["gapVector"] = phainomenon.EventScore("gap"),
                ["corridorVector"] = phainomenon.EventScore("corridorFlow"),
                ["stuckVector"] = phainomenon.EventScore("stuck"),
                ["loomingVector"] = phainomenon.EventScore("looming"),
                ["enemyVector"] = phainomenon.EventScore("enemyPresence"),
                ["damageVector"] = phainomenon.EventScore("damageLocalization"),
                ["projectileVector"] = phainomenon.EventScore("projectileFlow"),
                ["threatVector"] = phainomenon.EventScore("threatField"),
                ["explorationVector"] = phainomenon.EventScore("explorationEntropy"),
                ["itemVector"] = phainomenon.EventScore("itemBacktrack"),
                ["goalVector"] = phainomenon.EventScore("goalDirection"),
                ["safeZoneVector"] = phainomenon.EventScore("safeZone"),
                ["intentVector"] = phainomenon.EventScore("intentConsistency"),
                ["stabilityVector"] = phainomenon.EventScore("movementStability"),
                ["confidenceVector"] = phainomenon.EventScore("confidenceFusion"),
                ["enemySeenVector"] = phainomenon.EventScore("enemySeen"),
                ["damageEventVector"] = phainomenon.EventScore("damage"),
                ["audioEventVector"] = phainomenon.EventScore("audioEvent")
            }
        };
    }
}

/// <summary>
/// EN: Default Doom-local Topos implementation that groups meaning vectors into triadic intent carriers.
/// JA: meaning vector を三項 intent carrier に分類する Doom ローカルの既定 Topos 実装です。
/// </summary>
public sealed class DoomTopos : ITopos
{
    /// <summary>
    /// EN: Builds Logos, Pathos, and Ethos vector groups without executing Gate logic.
    /// JA: Gate logic を実行せず、Logos / Pathos / Ethos の vector group を構築します。
    /// </summary>
    public ToposDecisionVector Deliberate(MeaningVectorPacket nous)
    {
        ArgumentNullException.ThrowIfNull(nous);

        var vectors = nous.MeaningVectors;
        var logos = new Dictionary<string, float>(StringComparer.Ordinal)
        {
            ["wallFlow"] = Score(vectors, "wallFlowVector"),
            ["gap"] = Score(vectors, "gapVector"),
            ["corridor"] = Score(vectors, "corridorVector"),
            ["stuck"] = Score(vectors, "stuckVector"),
            ["stability"] = Score(vectors, "stabilityVector")
        };
        var pathos = new Dictionary<string, float>(StringComparer.Ordinal)
        {
            ["looming"] = Score(vectors, "loomingVector"),
            ["enemy"] = Math.Max(Score(vectors, "enemyVector"), Score(vectors, "enemySeenVector")),
            ["damage"] = Math.Max(Score(vectors, "damageVector"), Score(vectors, "damageEventVector")),
            ["projectile"] = Score(vectors, "projectileVector"),
            ["threat"] = Score(vectors, "threatVector")
        };
        var ethos = new Dictionary<string, float>(StringComparer.Ordinal)
        {
            ["exploration"] = Score(vectors, "explorationVector"),
            ["item"] = Score(vectors, "itemVector"),
            ["goal"] = Score(vectors, "goalVector"),
            ["safeZone"] = Score(vectors, "safeZoneVector"),
            ["intent"] = Score(vectors, "intentVector"),
            ["confidence"] = Score(vectors, "confidenceVector")
        };

        return new ToposDecisionVector
        {
            LogosVector = logos,
            PathosVector = pathos,
            EthosVector = ethos,
            Decision = SelectDecision(logos, pathos, ethos)
        };
    }

    private static string SelectDecision(
        IReadOnlyDictionary<string, float> logos,
        IReadOnlyDictionary<string, float> pathos,
        IReadOnlyDictionary<string, float> ethos)
    {
        var pathosScore = Max(pathos);
        if (pathosScore >= 0.65f)
        {
            return "avoid-threat";
        }

        var logosScore = Max(logos);
        var ethosScore = Max(ethos);
        return logosScore >= ethosScore ? "approach-structure" : "pursue-objective";
    }

    private static float Max(IReadOnlyDictionary<string, float> values)
        => values.Count == 0 ? 0 : values.Values.Max(Clamp01);

    private static float Score(IReadOnlyDictionary<string, float> values, string key)
    {
        if (values.TryGetValue(key, out var value))
        {
            return Clamp01(value);
        }

        return 0;
    }

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}

/// <summary>
/// EN: Default Doom-local Kairos implementation that converts Topos vectors into priority axes.
/// JA: Topos vector を priority axis に変換する Doom ローカルの既定 Kairos 実装です。
/// </summary>
public sealed class DoomKairos : IKairos
{
    /// <summary>
    /// EN: Computes priority axes from observed Topos vector magnitudes.
    /// JA: 観測された Topos vector の強度から priority axis を計算します。
    /// </summary>
    public PriorityAxes Prioritize(ToposDecisionVector decision)
    {
        ArgumentNullException.ThrowIfNull(decision);

        var pathos = BoostPathos(Max(decision.PathosVector));
        var ethos = Max(decision.EthosVector);
        var logos = Max(decision.LogosVector);
        var selected = SelectAxis(pathos, ethos, logos);

        return new PriorityAxes
        {
            PathosPriority = pathos,
            EthosPriority = ethos,
            LogosPriority = logos,
            SelectedAxis = selected
        };
    }

    private static float Max(IReadOnlyDictionary<string, float> values)
        => values.Count == 0 ? 0 : values.Values.Max(value => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1));

    private static string SelectAxis(float pathos, float ethos, float logos)
    {
        if (pathos >= 0.58f && pathos >= ethos && pathos >= logos)
        {
            return "pathos";
        }

        if (ethos > logos && ethos - logos > 0.08f)
        {
            return "ethos";
        }

        return logos >= pathos ? "logos" : "pathos";
    }

    private static float BoostPathos(float pathos)
        => pathos >= 0.58f
            ? Math.Clamp(pathos + ((pathos - 0.58f) * 0.75f), 0, 1)
            : pathos;
}

/// <summary>
/// EN: Default Doom-local Kinesis implementation that maps priority axes to a bounded action vector.
/// JA: priority axis を bounded action vector に変換する Doom ローカルの既定 Kinesis 実装です。
/// </summary>
public sealed class DoomKinesis : IKinesis
{
    /// <summary>
    /// EN: Generates a conservative action vector from Kairos priorities.
    /// JA: Kairos priority から保守的な action vector を生成します。
    /// </summary>
    public ActionVector Generate(PriorityAxes kairos)
    {
        ArgumentNullException.ThrowIfNull(kairos);

        return kairos.SelectedAxis switch
        {
            "pathos" => new ActionVector
            {
                MoveBackward = kairos.PathosPriority >= 0.65f,
                TurnYaw = kairos.PathosPriority >= 0.45f ? 8 : 0,
                Source = "kinesis.pathos"
            },
            "ethos" => new ActionVector
            {
                MoveForward = kairos.EthosPriority >= 0.35f,
                Source = "kinesis.ethos"
            },
            _ => new ActionVector
            {
                MoveForward = kairos.LogosPriority >= 0.25f,
                TurnYaw = kairos.LogosPriority < 0.25f ? 4 : 0,
                Source = "kinesis.logos"
            }
        };
    }
}

/// <summary>
/// EN: Default Doom-local Zoe implementation that performs health-only safety veto.
/// JA: health のみを使って safety veto を行う Doom ローカルの既定 Zoe 実装です。
/// </summary>
public sealed class DoomZoe : IZoe
{
    /// <summary>
    /// EN: Vetoes movement and firing when the health signal indicates a retry/death condition.
    /// JA: health signal が retry/death condition を示す場合、移動と射撃を veto します。
    /// </summary>
    public ZoeAuditResult Audit(ActionVector action, HealthSignal health)
    {
        ArgumentNullException.ThrowIfNull(action);

        if (health.IsLikelyFatal || health.Health <= 0)
        {
            return new ZoeAuditResult
            {
                Action = action with
                {
                    MoveForward = false,
                    MoveBackward = false,
                    Strafe = false,
                    Shoot = false,
                    Source = "zoe.health"
                },
                Vetoed = true,
                Reason = "health-death"
            };
        }

        return new ZoeAuditResult
        {
            Action = action,
            Vetoed = false,
            Reason = "none"
        };
    }
}

/// <summary>
/// EN: Factory for the Doom-local default philosophical autoplay sensor pipeline.
/// JA: Doom ローカルの既定 philosophical autoplay sensor pipeline を作成する factory です。
/// </summary>
public static class DoomPhilosophicalAutoplayPipelineFactory
{
    /// <summary>
    /// EN: Creates a complete default pipeline implementation contained within the Doom repository.
    /// JA: Doom リポジトリ内に閉じた完全な既定 pipeline 実装を作成します。
    /// </summary>
    public static IPhilosophicalAutoplayPipeline Create()
        => new PhilosophicalAutoplayPipeline(
            new DoomPhainesis(),
            new DoomNous(),
            new DoomTopos(),
            new DoomKairos(),
            new DoomKinesis(),
            new DoomZoe());
}
