namespace AIKernel.Doom.Provider.Autoplay;

/// <summary>
/// EN: Versioned, profile-defined autoplay pipeline DSL document.
/// JA: profile で定義される versioned AutoPlay pipeline DSL document です。
/// </summary>
public sealed record AutoplayPipelineDefinition
{
    public string Dsl { get; init; } = "aikernel.doom.autoplay.pipeline/v1";

    public string Name { get; init; } = "SeparatedDoorProbeStrafeRunnerV4";

    public List<AutoplaySemanticSymbolDefinition> SemanticMemory { get; init; } =
    [
        new() { Id = "door", Kind = "navigation-target" },
        new() { Id = "corridor", Kind = "route" },
        new() { Id = "enemy", Kind = "threat" },
        new() { Id = "safe-zone", Kind = "safety" },
        new() { Id = "bridge", Kind = "route" },
        new() { Id = "computer-room", Kind = "route" }
    ];

    public List<AutoplayObjectiveDefinition> Objectives { get; init; } =
    [
        new() { Id = "open-door", Intent = "door", Means = "align-approach-use", Priority = 70 },
        new() { Id = "reach-bridge", Intent = "bridge", Means = "advance-route", Priority = 45 },
        new() { Id = "avoid-enemy", Intent = "enemy", Means = "kite-or-fire", Priority = 80 },
        new() { Id = "enter-computer-room", Intent = "computer-room", Means = "advance-route", Priority = 40 },
        new() { Id = "stabilize-safe-zone", Intent = "safe-zone", Means = "recover-and-relocalize", Priority = 90 }
    ];

    public AutoplayArbitrationDefinition Arbitration { get; init; } = new();

    public List<AutoplayPipelineStageDefinition> Stages { get; init; } = [];

    public static AutoplayPipelineDefinition Default { get; } = new()
    {
        Stages =
        [
            Stage(
                "low-health-escape",
                "health > 0 && health < $lowHealthThreshold",
                new()
                {
                    ["moveForward"] = "depthSig > 0.42",
                    ["moveBackward"] = "depthSig <= $blockedDepth",
                    ["strafeLeft"] = "wallVector >= 0",
                    ["strafeRight"] = "wallVector < 0",
                    ["turnYaw"] = "escapeYaw"
                },
                100,
                "stabilize-safe-zone",
                new() { ["safe-zone"] = 0.45f, ["enemy"] = 0.2f },
                0.1f),
            Stage(
                "recovery-escape",
                "recoveryFrames > 0",
                EmergencyEscapeAction(),
                90,
                "stabilize-safe-zone",
                new() { ["safe-zone"] = 0.5f },
                0.0f),
            Stage(
                "stuck-escape",
                "stuckTicks >= $emergencyStuckTicks",
                EmergencyEscapeAction(),
                89,
                "stabilize-safe-zone",
                new() { ["safe-zone"] = 0.4f, ["corridor"] = 0.2f },
                0.0f),
            Stage(
                "combat-auditory",
                "soundEvent",
                CombatAction(),
                80,
                "avoid-enemy",
                new() { ["enemy"] = 1.0f },
                0.35f),
            Stage(
                "combat-visual",
                "absFaceSig >= $combatFaceThreshold",
                CombatAction(),
                79,
                "avoid-enemy",
                new() { ["enemy"] = 1.0f },
                0.35f),
            Stage(
                "door-corner-probe",
                "context == corner",
                DoorProbeAction(),
                70,
                "open-door",
                new() { ["door"] = 0.7f, ["corridor"] = 0.25f },
                0.2f),
            Stage(
                "door-wall-probe",
                "context == wall && stuckTicks >= $doorProbeStuckTicks",
                DoorProbeAction(),
                69,
                "open-door",
                new() { ["door"] = 0.7f, ["corridor"] = 0.2f },
                0.2f),
            Stage(
                "door-corridor-probe",
                "context == corridor && stuckTicks >= 24 && depthSig <= 0.68",
                DoorProbeAction(),
                68,
                "open-door",
                new() { ["door"] = 0.6f, ["corridor"] = 0.35f },
                0.2f),
            Stage(
                "bridge-route-cruise",
                "context == bridge",
                OpenCruiseAction(),
                45,
                "reach-bridge",
                new() { ["bridge"] = 1.0f },
                0.35f),
            Stage(
                "computer-room-route-cruise",
                "context == computer-room",
                OpenCruiseAction(),
                40,
                "enter-computer-room",
                new() { ["computer-room"] = 1.0f },
                0.35f),
            Stage(
                "open-space-cruise",
                "context == open-space",
                OpenCruiseAction(),
                20,
                "reach-bridge",
                new() { ["safe-zone"] = 0.2f, ["bridge"] = 0.25f },
                0.0f),
            Stage(
                "wall-follow-fallback",
                "true",
                new()
                {
                    ["moveForward"] = "true",
                    ["strafeLeft"] = "wallVector >= 0",
                    ["strafeRight"] = "wallVector < 0",
                    ["turnYaw"] = "wallAwayYaw"
                },
                0,
                "open-door",
                new() { ["corridor"] = 0.3f, ["door"] = 0.2f },
                0.0f)
        ]
    };

    private static AutoplayPipelineStageDefinition Stage(
        string id,
        string when,
        Dictionary<string, string> action,
        int priority,
        string objective = "",
        Dictionary<string, float>? evidence = null,
        float threshold = 0)
        => new()
        {
            Id = id,
            When = when,
            Action = action,
            Priority = priority,
            Objective = objective,
            Evidence = evidence ?? [],
            Threshold = threshold
        };

    private static Dictionary<string, string> DoorProbeAction()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "absQDelta <= $doorAimToleranceDegrees && depthSig > $doorUseDepth",
            ["turnYaw"] = "doorProbeYaw",
            ["useKey"] = "absQDelta <= $doorAimToleranceDegrees && depthSig <= $doorUseDepth"
        };

    private static Dictionary<string, string> EmergencyEscapeAction()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "depthSig > $blockedDepth",
            ["moveBackward"] = "depthSig <= $blockedDepth",
            ["strafeLeft"] = "$enableStrafeRun && wallVector >= 0",
            ["strafeRight"] = "$enableStrafeRun && wallVector < 0",
            ["turnYaw"] = "escapeYaw",
            ["useKey"] = "context == wall && depthSig <= $doorUseDepth"
        };

    private static Dictionary<string, string> CombatAction()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "depthSig > 0.5",
            ["strafeLeft"] = "$enableStrafeRun && combatYaw > 0",
            ["strafeRight"] = "$enableStrafeRun && combatYaw < 0",
            ["turnYaw"] = "combatYaw",
            ["attackKey"] = "depthSig < 0.82 || soundEvent"
        };

    private static Dictionary<string, string> OpenCruiseAction()
        => new(StringComparer.Ordinal)
        {
            ["moveForward"] = "true",
            ["strafeLeft"] = "$enableStrafeRun && openCruiseYaw >= 0",
            ["strafeRight"] = "$enableStrafeRun && openCruiseYaw < 0",
            ["turnYaw"] = "openCruiseYaw"
        };
}

/// <summary>
/// EN: A single deterministic stage in the autoplay DSL.
/// JA: AutoPlay DSL 内の deterministic stage です。
/// </summary>
public sealed record AutoplayPipelineStageDefinition
{
    public string Id { get; init; } = string.Empty;

    public string Objective { get; init; } = string.Empty;

    public string When { get; init; } = "false";

    public int Priority { get; init; }

    public float Threshold { get; init; }

    public Dictionary<string, float> Evidence { get; init; } = new(StringComparer.Ordinal);

    public Dictionary<string, string> Action { get; init; } = new(StringComparer.Ordinal);
}

public sealed record AutoplaySemanticSymbolDefinition
{
    public string Id { get; init; } = string.Empty;

    public string Kind { get; init; } = "signal";
}

public sealed record AutoplayObjectiveDefinition
{
    public string Id { get; init; } = string.Empty;

    public string Intent { get; init; } = string.Empty;

    public string Means { get; init; } = string.Empty;

    public int Priority { get; init; }
}

public sealed record AutoplayArbitrationDefinition
{
    public string Mode { get; init; } = "deterministic-weighted-priority";

    public float DefaultThreshold { get; init; }
}

/// <summary>
/// EN: Autoplay strategy that compiles a profile DSL into a deterministic runtime pipeline.
/// JA: profile DSL を deterministic runtime pipeline に compile する AutoPlay strategy です。
/// </summary>
public sealed class DynamicPipelineAutoplayStrategy : IAutoplayStrategy
{
    private readonly CompiledAutoplayPipeline _pipeline;

    public DynamicPipelineAutoplayStrategy(AutoplayOptimizationProfile? profile = null)
    {
        var effectiveProfile = profile ?? AutoplayOptimizationProfile.Default;
        _pipeline = AutoplayPipelineDslCompiler.Compile(effectiveProfile.Pipeline ?? AutoplayPipelineDefinition.Default, effectiveProfile);
    }

    public string StrategyName => _pipeline.StrategyName;

    public ActionCommand ExecuteTick(SensorFusion sensor, int recoveryFrames)
        => _pipeline.ExecuteTick(sensor, recoveryFrames);

    public AutoplayPipelineDecision EvaluateTick(SensorFusion sensor, int recoveryFrames)
        => _pipeline.EvaluateTick(sensor, recoveryFrames);
}

public sealed record AutoplayPipelineDecision(
    string StrategyName,
    string StageId,
    string Objective,
    int Priority,
    float Threshold,
    float EvidenceScore,
    IReadOnlyDictionary<string, float> SemanticScores,
    IReadOnlyList<AutoplayPipelineStageEvaluation> StageEvaluations,
    ActionCommand Action);

public sealed record AutoplayPipelineStageEvaluation(
    string StageId,
    string Objective,
    int Priority,
    float Threshold,
    float EvidenceScore,
    bool ConditionMatched,
    bool EvidenceMatched,
    bool Selected);

public sealed class CompiledAutoplayPipeline
{
    private readonly IReadOnlyList<CompiledAutoplayPipelineStage> _stages;
    private readonly IReadOnlyList<string> _semanticSymbols;
    private readonly AutoplayOptimizationProfile _profile;

    internal CompiledAutoplayPipeline(
        string strategyName,
        IReadOnlyList<CompiledAutoplayPipelineStage> stages,
        IReadOnlyList<string> semanticSymbols,
        AutoplayOptimizationProfile profile)
    {
        StrategyName = strategyName;
        _stages = stages;
        _semanticSymbols = semanticSymbols;
        _profile = profile;
    }

    public string StrategyName { get; }

    public ActionCommand ExecuteTick(SensorFusion sensor, int recoveryFrames)
        => EvaluateTick(sensor, recoveryFrames).Action;

    public AutoplayPipelineDecision EvaluateTick(SensorFusion sensor, int recoveryFrames)
    {
        var context = new AutoplayPipelineContext(sensor, recoveryFrames, _profile);
        var evaluations = new List<AutoplayPipelineStageEvaluation>(_stages.Count);
        CompiledAutoplayPipelineStage? selectedStage = null;
        AutoplayPipelineStageEvaluation? selectedEvaluation = null;
        ActionCommand? selectedAction = null;

        foreach (var stage in _stages)
        {
            var evaluation = stage.Evaluate(context);
            if (selectedStage is null && evaluation.ConditionMatched && evaluation.EvidenceMatched)
            {
                selectedStage = stage;
                selectedEvaluation = evaluation with { Selected = true };
                selectedAction = stage.Action(context);
                evaluations.Add(selectedEvaluation);
                continue;
            }

            evaluations.Add(evaluation);
        }

        var action = selectedAction ?? new ActionCommand(false, false, false, false, 0, false, false);
        var selected = selectedEvaluation ?? new AutoplayPipelineStageEvaluation("none", "idle", 0, 0, 0, false, false, true);
        return new AutoplayPipelineDecision(
            StrategyName,
            selected.StageId,
            string.IsNullOrWhiteSpace(selected.Objective) ? "idle" : selected.Objective,
            selected.Priority,
            selected.Threshold,
            selected.EvidenceScore,
            context.SemanticScores(_semanticSymbols),
            evaluations,
            action);
    }
}

public static class AutoplayPipelineDslCompiler
{
    public static CompiledAutoplayPipeline Compile(
        AutoplayPipelineDefinition definition,
        AutoplayOptimizationProfile profile)
    {
        ArgumentNullException.ThrowIfNull(definition);
        ArgumentNullException.ThrowIfNull(profile);

        var defaultThreshold = Math.Max(0, definition.Arbitration?.DefaultThreshold ?? 0);
        var stages = definition.Stages
            .Where(stage => !string.IsNullOrWhiteSpace(stage.Id))
            .OrderByDescending(stage => stage.Priority)
            .ThenBy(stage => stage.Id, StringComparer.Ordinal)
            .Select(stage => CompileStage(stage, defaultThreshold))
            .ToArray();
        var semanticSymbols = definition.SemanticMemory
            .Select(symbol => symbol.Id)
            .Concat(definition.Stages.SelectMany(stage => stage.Evidence.Keys))
            .Where(symbol => !string.IsNullOrWhiteSpace(symbol))
            .Select(symbol => symbol.Trim().ToLowerInvariant())
            .Distinct(StringComparer.Ordinal)
            .OrderBy(symbol => symbol, StringComparer.Ordinal)
            .ToArray();

        return new CompiledAutoplayPipeline(
            string.IsNullOrWhiteSpace(definition.Name) ? profile.StrategyName : definition.Name,
            stages,
            semanticSymbols,
            profile);
    }

    private static CompiledAutoplayPipelineStage CompileStage(AutoplayPipelineStageDefinition stage, float defaultThreshold)
        => new(
            stage.Id,
            stage.Objective,
            stage.Priority,
            stage.Threshold > 0 || stage.Evidence.Count == 0 ? stage.Threshold : defaultThreshold,
            stage.Evidence,
            CompileBooleanExpression(stage.When),
            CompileAction(stage.Action));

    private static Func<AutoplayPipelineContext, ActionCommand> CompileAction(IReadOnlyDictionary<string, string> action)
    {
        var moveForward = CompileBooleanExpression(Read(action, "moveForward", "false"));
        var moveBackward = CompileBooleanExpression(Read(action, "moveBackward", "false"));
        var strafeLeft = CompileBooleanExpression(Read(action, "strafeLeft", "false"));
        var strafeRight = CompileBooleanExpression(Read(action, "strafeRight", "false"));
        var useKey = CompileBooleanExpression(Read(action, "useKey", "false"));
        var attackKey = CompileBooleanExpression(Read(action, "attackKey", "false"));
        var turnYaw = CompileIntExpression(Read(action, "turnYaw", "0"));

        return context => new ActionCommand(
            moveForward(context),
            moveBackward(context),
            strafeLeft(context),
            strafeRight(context),
            turnYaw(context),
            useKey(context),
            attackKey(context));
    }

    private static Func<AutoplayPipelineContext, bool> CompileBooleanExpression(string expression)
    {
        var text = NormalizeExpression(expression);
        if (string.Equals(text, "true", StringComparison.OrdinalIgnoreCase))
        {
            return _ => true;
        }

        if (string.Equals(text, "false", StringComparison.OrdinalIgnoreCase))
        {
            return _ => false;
        }

        var orTerms = text.Split("||", StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(CompileAndExpression)
            .ToArray();

        return context => orTerms.Any(term => term(context));
    }

    private static Func<AutoplayPipelineContext, bool> CompileAndExpression(string expression)
    {
        var terms = expression.Split("&&", StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(CompileBooleanAtom)
            .ToArray();

        return context => terms.All(term => term(context));
    }

    private static Func<AutoplayPipelineContext, bool> CompileBooleanAtom(string expression)
    {
        var atom = NormalizeExpression(expression);
        foreach (var op in new[] { ">=", "<=", "==", "!=", ">", "<" })
        {
            var index = atom.IndexOf(op, StringComparison.Ordinal);
            if (index <= 0)
            {
                continue;
            }

            var leftToken = atom[..index].Trim();
            var rightToken = atom[(index + op.Length)..].Trim();
            return context => Compare(ResolveValue(context, leftToken), ResolveValue(context, rightToken), op);
        }

        return context => ResolveValue(context, atom).AsBoolean();
    }

    private static Func<AutoplayPipelineContext, int> CompileIntExpression(string expression)
    {
        var text = NormalizeExpression(expression);
        return context => (int)MathF.Round(ResolveValue(context, text).AsNumber());
    }

    private static bool Compare(AutoplayDslValue left, AutoplayDslValue right, string op)
    {
        if (left.Kind == AutoplayDslValueKind.Text || right.Kind == AutoplayDslValueKind.Text)
        {
            var comparison = string.Equals(left.AsText(), right.AsText(), StringComparison.OrdinalIgnoreCase);
            return op switch
            {
                "==" => comparison,
                "!=" => !comparison,
                _ => false
            };
        }

        if (left.Kind == AutoplayDslValueKind.Boolean || right.Kind == AutoplayDslValueKind.Boolean)
        {
            var comparison = left.AsBoolean() == right.AsBoolean();
            return op switch
            {
                "==" => comparison,
                "!=" => !comparison,
                _ => false
            };
        }

        var leftNumber = left.AsNumber();
        var rightNumber = right.AsNumber();
        return op switch
        {
            ">=" => leftNumber >= rightNumber,
            "<=" => leftNumber <= rightNumber,
            "==" => Math.Abs(leftNumber - rightNumber) <= 0.0001f,
            "!=" => Math.Abs(leftNumber - rightNumber) > 0.0001f,
            ">" => leftNumber > rightNumber,
            "<" => leftNumber < rightNumber,
            _ => false
        };
    }

    private static AutoplayDslValue ResolveValue(AutoplayPipelineContext context, string token)
    {
        var normalized = NormalizeExpression(token);
        if (normalized.StartsWith("-", StringComparison.Ordinal) && normalized.Length > 1)
        {
            return AutoplayDslValue.Number(-ResolveValue(context, normalized[1..]).AsNumber());
        }

        if (normalized.StartsWith("$", StringComparison.Ordinal))
        {
            return ResolveParameter(context.Profile, normalized[1..]);
        }

        if (float.TryParse(normalized, System.Globalization.NumberStyles.Float, System.Globalization.CultureInfo.InvariantCulture, out var number))
        {
            return AutoplayDslValue.Number(number);
        }

        return normalized.ToLowerInvariant() switch
        {
            "true" => AutoplayDslValue.Boolean(true),
            "false" => AutoplayDslValue.Boolean(false),
            "health" => AutoplayDslValue.Number(context.Sensor.Health),
            "depthsig" => AutoplayDslValue.Number(context.DepthSig),
            "facesig" => AutoplayDslValue.Number(context.Sensor.FaceSig),
            "absfacesig" => AutoplayDslValue.Number(Math.Abs(context.Sensor.FaceSig)),
            "soundevent" => AutoplayDslValue.Boolean(context.Sensor.SoundEvent),
            "stuckticks" => AutoplayDslValue.Number(context.Sensor.StuckTicks),
            "qdelta" => AutoplayDslValue.Number(context.QDelta),
            "absqdelta" => AutoplayDslValue.Number(Math.Abs(context.QDelta)),
            "recoveryframes" => AutoplayDslValue.Number(context.RecoveryFrames),
            "wallvector" => AutoplayDslValue.Number(context.WallVector),
            "abswallvector" => AutoplayDslValue.Number(Math.Abs(context.WallVector)),
            "context" => AutoplayDslValue.Text(context.Context),
            "escapeyaw" => AutoplayDslValue.Number(context.EscapeYaw),
            "combtyaw" => AutoplayDslValue.Number(context.CombatYaw),
            "combatyaw" => AutoplayDslValue.Number(context.CombatYaw),
            "wallawayyaw" => AutoplayDslValue.Number(context.WallAwayYaw),
            "opencruiseyaw" => AutoplayDslValue.Number(context.OpenCruiseYaw),
            "aimyaw" => AutoplayDslValue.Number(context.AimYaw),
            "doorprobeyaw" => AutoplayDslValue.Number(context.DoorProbeYaw),
            _ => AutoplayDslValue.Text(Unquote(normalized))
        };
    }

    private static AutoplayDslValue ResolveParameter(AutoplayOptimizationProfile profile, string name)
        => name switch
        {
            "doorAimToleranceDegrees" => AutoplayDslValue.Number(profile.DoorAimToleranceDegrees),
            "doorSoftAimToleranceDegrees" => AutoplayDslValue.Number(profile.DoorSoftAimToleranceDegrees),
            "doorAimYawDegrees" => AutoplayDslValue.Number(profile.DoorAimYawDegrees),
            "doorAimFrames" => AutoplayDslValue.Number(profile.DoorAimFrames),
            "doorApproachFrames" => AutoplayDslValue.Number(profile.DoorApproachFrames),
            "doorSettleFrames" => AutoplayDslValue.Number(profile.DoorSettleFrames),
            "doorUseHoldFrames" => AutoplayDslValue.Number(profile.DoorUseHoldFrames),
            "emergencyStuckTicks" => AutoplayDslValue.Number(profile.EmergencyStuckTicks),
            "doorProbeStuckTicks" => AutoplayDslValue.Number(profile.DoorProbeStuckTicks),
            "doorUseDepth" => AutoplayDslValue.Number(profile.DoorUseDepth),
            "doorApproachDepth" => AutoplayDslValue.Number(profile.DoorApproachDepth),
            "blockedDepth" => AutoplayDslValue.Number(profile.BlockedDepth),
            "combatFaceThreshold" => AutoplayDslValue.Number(profile.CombatFaceThreshold),
            "combatAlertFrames" => AutoplayDslValue.Number(profile.CombatAlertFrames),
            "combatAlertPeakConfidence" => AutoplayDslValue.Number(profile.CombatAlertPeakConfidence),
            "combatAlertMaxDepth" => AutoplayDslValue.Number(profile.CombatAlertMaxDepth),
            "darkZoneScoreThreshold" => AutoplayDslValue.Number(profile.DarkZoneScoreThreshold),
            "darkZoneLumaThreshold" => AutoplayDslValue.Number(profile.DarkZoneLumaThreshold),
            "darkZoneConfirmFrames" => AutoplayDslValue.Number(profile.DarkZoneConfirmFrames),
            "doorTransitionArmedFrames" => AutoplayDslValue.Number(profile.DoorTransitionArmedFrames),
            "combatYawDegrees" => AutoplayDslValue.Number(profile.CombatYawDegrees),
            "lowHealthThreshold" => AutoplayDslValue.Number(profile.LowHealthThreshold),
            "emergencyEscapeYawDegrees" => AutoplayDslValue.Number(profile.EmergencyEscapeYawDegrees),
            "wallAwayYawDegrees" => AutoplayDslValue.Number(profile.WallAwayYawDegrees),
            "openCruiseYawDegrees" => AutoplayDslValue.Number(profile.OpenCruiseYawDegrees),
            "openCruiseWallVectorDeadZone" => AutoplayDslValue.Number(profile.OpenCruiseWallVectorDeadZone),
            "firstDoorRushFrames" => AutoplayDslValue.Number(profile.FirstDoorRushFrames),
            "firstDoorRushDepth" => AutoplayDslValue.Number(profile.FirstDoorRushDepth),
            "firstDoorRushWallVectorLimit" => AutoplayDslValue.Number(profile.FirstDoorRushWallVectorLimit),
            "firstDoorBearingFrames" => AutoplayDslValue.Number(profile.FirstDoorBearingFrames),
            "mapRushLookoutFrames" => AutoplayDslValue.Number(profile.MapRushLookoutFrames),
            "mapRushBackoffFrames" => AutoplayDslValue.Number(profile.MapRushBackoffFrames),
            "mapRushOpenWallVectorLimit" => AutoplayDslValue.Number(profile.MapRushOpenWallVectorLimit),
            "mapRushOpenDelta" => AutoplayDslValue.Number(profile.MapRushOpenDelta),
            "mapDoorSweepFrames" => AutoplayDslValue.Number(profile.MapDoorSweepFrames),
            "enableStrafeRun" => AutoplayDslValue.Boolean(profile.EnableStrafeRun),
            _ => AutoplayDslValue.Number(0)
        };

    private static string Read(IReadOnlyDictionary<string, string> action, string key, string fallback)
        => action.TryGetValue(key, out var value) ? value : fallback;

    private static string NormalizeExpression(string? expression)
        => string.IsNullOrWhiteSpace(expression) ? "false" : expression.Trim();

    private static string Unquote(string value)
        => value.Length >= 2
            && ((value[0] == '"' && value[^1] == '"') || (value[0] == '\'' && value[^1] == '\''))
                ? value[1..^1]
                : value;
}

internal sealed record CompiledAutoplayPipelineStage(
    string Id,
    string Objective,
    int Priority,
    float Threshold,
    IReadOnlyDictionary<string, float> Evidence,
    Func<AutoplayPipelineContext, bool> Condition,
    Func<AutoplayPipelineContext, ActionCommand> Action)
{
    public bool Matches(AutoplayPipelineContext context)
    {
        var evaluation = Evaluate(context);
        return evaluation.ConditionMatched && evaluation.EvidenceMatched;
    }

    public AutoplayPipelineStageEvaluation Evaluate(AutoplayPipelineContext context)
    {
        var conditionMatched = Condition(context);
        var evidenceScore = EvidenceScore(context);
        return new AutoplayPipelineStageEvaluation(
            Id,
            Objective,
            Priority,
            Threshold,
            evidenceScore,
            conditionMatched,
            evidenceScore >= Threshold,
            false);
    }

    private float EvidenceScore(AutoplayPipelineContext context)
        => Evidence.Count == 0
            ? 1
            : Evidence.Sum(item => context.SemanticScore(item.Key) * item.Value);
}

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

internal enum AutoplayDslValueKind
{
    Number,
    Boolean,
    Text
}

internal readonly record struct AutoplayDslValue(
    AutoplayDslValueKind Kind,
    float NumberValue,
    bool BooleanValue,
    string TextValue)
{
    public static AutoplayDslValue Number(float value)
        => new(AutoplayDslValueKind.Number, value, Math.Abs(value) > 0.0001f, string.Empty);

    public static AutoplayDslValue Boolean(bool value)
        => new(AutoplayDslValueKind.Boolean, value ? 1 : 0, value, value ? "true" : "false");

    public static AutoplayDslValue Text(string value)
        => new(AutoplayDslValueKind.Text, 0, !string.IsNullOrWhiteSpace(value), value);

    public float AsNumber()
        => Kind switch
        {
            AutoplayDslValueKind.Boolean => BooleanValue ? 1 : 0,
            AutoplayDslValueKind.Number => NumberValue,
            _ => 0
        };

    public bool AsBoolean()
        => Kind switch
        {
            AutoplayDslValueKind.Boolean => BooleanValue,
            AutoplayDslValueKind.Number => Math.Abs(NumberValue) > 0.0001f,
            _ => !string.IsNullOrWhiteSpace(TextValue)
        };

    public string AsText()
        => Kind switch
        {
            AutoplayDslValueKind.Boolean => BooleanValue ? "true" : "false",
            AutoplayDslValueKind.Number => NumberValue.ToString(System.Globalization.CultureInfo.InvariantCulture),
            _ => TextValue
        };
}
