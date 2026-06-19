namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Result produced by the dynamic philosophical autoplay pipeline evaluator.
/// JA: dynamic philosophical autoplay pipeline evaluator が生成する result です。
/// </summary>
/// <param name="Action">EN: Bounded action emitted by Kinesis or Zoe. JA: Kinesis または Zoe が出力した bounded action です。</param>
/// <param name="ZoeVetoed">EN: Indicates whether Zoe vetoed the proposed action. JA: Zoe が proposed action を veto したかどうかを示します。</param>
/// <param name="SvcEvent">EN: Safety-veto-carrier event label. JA: safety-veto-carrier event label です。</param>
public sealed record DynamicPipelineEvaluationResult(
    ActionCommand Action,
    bool ZoeVetoed,
    string SvcEvent);

/// <summary>
/// EN: Executes the canonical Aisthesis-to-Zoe dynamic pipeline graph for Doom autoplay.
/// JA: Doom autoplay 向けの canonical Aisthesis-to-Zoe dynamic pipeline graph を実行します。
/// </summary>
public sealed class DynamicPipelineEvaluator
{
    private readonly DynamicPipelineGraph graph;
    private readonly Func<string, Func<DynamicPipelineContext, bool>> compilePredicate;
    private readonly DoomPhainesis phainesis = new();
    private readonly DoomNous nous = new();
    private readonly DoomTopos topos = new();
    private readonly DoomKairos kairos = new();
    private readonly DoomKinesis kinesis = new();

    /// <summary>
    /// EN: Creates an evaluator for a compiled dynamic pipeline graph.
    /// JA: compiled dynamic pipeline graph 用の evaluator を作成します。
    /// </summary>
    /// <param name="graph">EN: Canonical dynamic pipeline graph. JA: canonical dynamic pipeline graph です。</param>
    /// <param name="compilePredicate">EN: Predicate compiler used by Zoe veto rules. JA: Zoe veto rule が利用する predicate compiler です。</param>
    public DynamicPipelineEvaluator(
        DynamicPipelineGraph graph,
        Func<string, Func<DynamicPipelineContext, bool>> compilePredicate)
    {
        this.graph = graph ?? throw new ArgumentNullException(nameof(graph));
        this.compilePredicate = compilePredicate ?? throw new ArgumentNullException(nameof(compilePredicate));
    }

    /// <summary>
    /// EN: Evaluates the full dynamic pipeline in canonical stage order.
    /// JA: canonical stage order で dynamic pipeline 全体を評価します。
    /// </summary>
    public DynamicPipelineEvaluationResult Evaluate(
        DynamicPipelineContext context,
        ActionCommand proposedAction,
        IReadOnlyList<ZoeVetoRule> vetoRules)
    {
        ArgumentNullException.ThrowIfNull(context);
        EnsureCanonicalGraph();

        var sensorPacket = RunAisthesis(context);
        var phainomenon = RunPhainesis(sensorPacket);
        var meaning = RunNous(phainomenon);
        var decision = RunTopos(meaning);
        var priority = RunKairos(decision);
        var generated = RunKinesis(priority, proposedAction);
        return RunZoe(context, generated, vetoRules);
    }

    /// <summary>
    /// EN: Projects compact sensor fusion data into named Aisthesis readings.
    /// JA: compact sensor fusion data を named Aisthesis reading に射影します。
    /// </summary>
    public DynamicPipelineContext RunAisthesis(DynamicPipelineContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        return context with
        {
            SensorReadings = BuildSensorReadings(context.Sensor)
        };
    }

    /// <summary>
    /// EN: Extracts Phainesis event scores from Aisthesis readings.
    /// JA: Aisthesis reading から Phainesis event score を抽出します。
    /// </summary>
    public DynamicPipelineContext RunPhainesis(DynamicPipelineContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var frame = ToFrame(context);
        var extracted = phainesis.Extract(frame).Events;
        var outputs = graph.Nodes.Single(node => node.Stage == DynamicPipelineStageKind.Phainesis).Outputs;
        return context with
        {
            Events = FilterOutputs(extracted, outputs)
        };
    }

    /// <summary>
    /// EN: Converts Phainesis event scores into Nous meaning vectors.
    /// JA: Phainesis event score を Nous meaning vector に変換します。
    /// </summary>
    public DynamicPipelineContext RunNous(DynamicPipelineContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var packet = nous.Vectorize(new Phainomenon { Events = context.Events });
        var outputs = graph.Nodes.Single(node => node.Stage == DynamicPipelineStageKind.Nous).Outputs;
        return context with
        {
            MeaningVectors = FilterOutputs(packet.MeaningVectors, outputs)
        };
    }

    /// <summary>
    /// EN: Groups Nous vectors into Topos triadic carriers.
    /// JA: Nous vector を Topos triadic carrier に分類します。
    /// </summary>
    public DynamicPipelineContext RunTopos(DynamicPipelineContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var decision = topos.Deliberate(new MeaningVectorPacket
        {
            Source = new Phainomenon { Events = context.Events },
            MeaningVectors = context.MeaningVectors
        });
        var topoi = new Dictionary<string, float>(StringComparer.Ordinal);
        AddWeighted(topoi, "LogosVector", decision.LogosVector);
        AddWeighted(topoi, "PathosVector", decision.PathosVector);
        AddWeighted(topoi, "EthosVector", decision.EthosVector);
        topoi["ToposDecisionVector"] = Math.Max(
            Math.Max(Read(topoi, "LogosVector"), Read(topoi, "PathosVector")),
            Read(topoi, "EthosVector"));

        return context with
        {
            ToposVectors = FilterOutputs(topoi, graph.Nodes.Single(node => node.Stage == DynamicPipelineStageKind.Topos).Outputs)
        };
    }

    /// <summary>
    /// EN: Converts Topos carriers into Kairos priority axes.
    /// JA: Topos carrier を Kairos priority axis に変換します。
    /// </summary>
    public DynamicPipelineContext RunKairos(DynamicPipelineContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var priority = kairos.Prioritize(new ToposDecisionVector
        {
            LogosVector = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["LogosVector"] = Read(context.ToposVectors, "LogosVector")
            },
            PathosVector = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["PathosVector"] = Read(context.ToposVectors, "PathosVector")
            },
            EthosVector = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["EthosVector"] = Read(context.ToposVectors, "EthosVector")
            }
        });
        var priorities = new Dictionary<string, float>(StringComparer.Ordinal)
        {
            ["pathos"] = priority.PathosPriority,
            ["ethos"] = priority.EthosPriority,
            ["logos"] = priority.LogosPriority
        };

        return context with
        {
            Priorities = FilterOutputs(priorities, graph.Nodes.Single(node => node.Stage == DynamicPipelineStageKind.Kairos).Outputs),
            SelectedAxis = priority.SelectedAxis
        };
    }

    /// <summary>
    /// EN: Emits a bounded Kinesis action when no upstream action is already active.
    /// JA: upstream action がまだ active でない場合に bounded Kinesis action を出力します。
    /// </summary>
    public ActionCommand RunKinesis(DynamicPipelineContext context, ActionCommand proposedAction)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (IsActive(proposedAction))
        {
            return proposedAction;
        }

        var generated = kinesis.Generate(new PriorityAxes
        {
            PathosPriority = Read(context.Priorities, "pathos"),
            EthosPriority = Read(context.Priorities, "ethos"),
            LogosPriority = Read(context.Priorities, "logos"),
            SelectedAxis = context.SelectedAxis
        });

        return ToActionCommand(generated);
    }

    /// <summary>
    /// EN: Applies Zoe veto rules to the proposed action.
    /// JA: proposed action に Zoe veto rule を適用します。
    /// </summary>
    public DynamicPipelineEvaluationResult RunZoe(
        DynamicPipelineContext context,
        ActionCommand proposedAction,
        IReadOnlyList<ZoeVetoRule> vetoRules)
    {
        foreach (var veto in vetoRules)
        {
            if (compilePredicate(veto.Expression)(context))
            {
                return new DynamicPipelineEvaluationResult(
                    SafeAction(),
                    ZoeVetoed: true,
                    SvcEvent: $"zoe-veto:{veto.Expression}");
            }
        }

        return new DynamicPipelineEvaluationResult(proposedAction, ZoeVetoed: false, SvcEvent: "none");
    }

    private void EnsureCanonicalGraph()
    {
        if (!graph.IsCanonical)
        {
            throw new InvalidOperationException("Dynamic pipeline graph must execute Aisthesis -> Phainesis -> Nous -> Topos -> Kairos -> Kinesis -> Zoe.");
        }
    }

    private static ActionCommand SafeAction()
        => new(false, false, false, false, 0, false, false);

    private static SensorFrame ToFrame(DynamicPipelineContext context)
        => new()
        {
            SensorTensor = context.Sensor.SensorTensor.IsEmpty
                ? BuildTensor(context.Sensor)
                : context.Sensor.SensorTensor,
            Health = new HealthSignal
            {
                Health = context.Sensor.Health,
                IsLikelyFatal = context.Sensor.Health <= 0,
                Source = "aisthesis.health"
            }
        };

    private static IReadOnlyDictionary<string, float> BuildSensorReadings(SensorFusion sensor)
    {
        var tensor = sensor.SensorTensor.IsEmpty ? BuildTensor(sensor) : sensor.SensorTensor;
        return new Dictionary<string, float>(StringComparer.Ordinal)
        {
            ["visual"] = Max(tensor.Get("vision.target"), tensor.Get("vision.open"), tensor.Get("vision.wall"), tensor.Get("semantic.door")),
            ["audio"] = Max(sensor.SoundEvent ? 1 : 0, tensor.Get("system.audio")),
            ["movement"] = Max(tensor.Get("motion.forward"), tensor.Get("motion.turn"), tensor.Get("motion.delta")),
            ["compass"] = Clamp01(1 - Math.Abs(sensor.FaceSig)),
            ["collision"] = Max(tensor.Get("motion.obstacle"), tensor.Get("motion.stuck"), Clamp01(sensor.StuckTicks / 12f)),
            ["health"] = Clamp01(sensor.Health / 100f),
            ["spatial"] = Max(tensor.Get("semantic.corridor"), tensor.Get("vision.open"), tensor.Get("semantic.bridge")),
            ["topos"] = Max(tensor.Get("system.priority"), tensor.Get("system.ctg"))
        };
    }

    private static AutoplaySensorTensor BuildTensor(SensorFusion sensor)
    {
        var regions = sensor.Screen6Regions ?? [];
        var visual = regions.Length == 0 ? 0 : Clamp01(regions.Max());
        var open = Clamp01(sensor.DepthSig);
        var wall = Clamp01(1 - sensor.DepthSig);
        var movementDelta = Clamp01(Math.Abs(sensor.QDelta) / 64f);
        return AutoplaySensorTensor.FromChannels(
            ("vision.target", visual),
            ("vision.wall", wall),
            ("vision.open", open),
            ("motion.obstacle", Clamp01(sensor.StuckTicks / 12f)),
            ("motion.turn", Clamp01(Math.Abs(sensor.FaceSig))),
            ("motion.stall", Clamp01(sensor.StuckTicks / 10f)),
            ("motion.inputstall", Clamp01(sensor.StuckTicks / 16f)),
            ("motion.stuck", Clamp01(sensor.StuckTicks / 20f)),
            ("motion.delta", movementDelta),
            ("semantic.door", sensor.ContextDict.Contains("door", StringComparison.OrdinalIgnoreCase) ? visual : 0),
            ("semantic.corridor", sensor.ContextDict.Contains("corridor", StringComparison.OrdinalIgnoreCase) ? open : 0),
            ("semantic.computer", sensor.ContextDict.Contains("computer", StringComparison.OrdinalIgnoreCase) ? visual : 0),
            ("system.health", Clamp01(sensor.Health / 100f)),
            ("system.audio", sensor.SoundEvent ? 1 : 0),
            ("system.enabled", 1));
    }

    private static IReadOnlyDictionary<string, float> FilterOutputs(
        IReadOnlyDictionary<string, float> values,
        IReadOnlyList<string> outputs)
    {
        if (outputs.Count == 0)
        {
            return new Dictionary<string, float>(values, StringComparer.Ordinal);
        }

        var filtered = new Dictionary<string, float>(StringComparer.Ordinal);
        foreach (var output in outputs)
        {
            filtered[output] = Read(values, output);
        }

        return filtered;
    }

    private static void AddWeighted(
        IDictionary<string, float> values,
        string key,
        IReadOnlyDictionary<string, float> source)
        => values[key] = source.Count == 0 ? 0 : Clamp01(source.Values.Max());

    private static float Read(IReadOnlyDictionary<string, float> values, string key)
    {
        if (values.TryGetValue(key, out var value))
        {
            return Clamp01(value);
        }

        foreach (var item in values)
        {
            if (string.Equals(item.Key, key, StringComparison.OrdinalIgnoreCase))
            {
                return Clamp01(item.Value);
            }
        }

        return 0;
    }

    private static ActionCommand ToActionCommand(ActionVector action)
        => new(
            action.MoveForward,
            action.MoveBackward,
            action.Strafe && action.TurnYaw < 0,
            action.Strafe && action.TurnYaw >= 0,
            action.TurnYaw,
            false,
            action.Shoot);

    private static bool IsActive(ActionCommand action)
        => action.MoveForward
            || action.MoveBackward
            || action.StrafeLeft
            || action.StrafeRight
            || action.TurnYaw != 0
            || action.UseKey
            || action.AttackKey;

    private static float Max(params float[] values)
        => values.Length == 0 ? 0 : Clamp01(values.Max());

    private static float Clamp01(float value)
        => Math.Clamp(float.IsFinite(value) ? value : 0, 0, 1);
}
