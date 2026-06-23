namespace AIKernel.Doom.Architecture.Tests;

using System.Text.Json;
using AIKernel.Doom.Provider.Autoplay;
using AIKernel.Dtos.Gpu;
using AIKernel.Enums;

public sealed class AutoplayPipelineDslTests
{
    [Fact]
    public void AutoplayOptimizationProfile_ProfileJson_UsesParametersEnvelope()
    {
        var profilePath = Path.Combine(FindRepoRoot(AppContext.BaseDirectory), "src", "DoomWeb", "wwwroot", "demo", "doom", "autoplay-profile.json");
        using var document = JsonDocument.Parse(File.ReadAllText(profilePath));
        var root = document.RootElement;

        Assert.True(root.TryGetProperty("parameters", out var parameters));
        Assert.True(root.TryGetProperty("pipeline", out _));
        Assert.False(root.TryGetProperty("doorUseDepth", out _));
        Assert.Equal(0.72f, AutoplayOptimizationProfile.FromJsonElement(root).DoorUseDepth);
        Assert.True(parameters.TryGetProperty("doorUseDepth", out _));
    }

    [Fact]
    public void AutoplayProfile_ProfileJson_DefinesSemanticObjectivesAndArbitration()
    {
        var profilePath = Path.Combine(FindRepoRoot(AppContext.BaseDirectory), "src", "DoomWeb", "wwwroot", "demo", "doom", "autoplay-profile.json");
        using var document = JsonDocument.Parse(File.ReadAllText(profilePath));
        var pipeline = document.RootElement.GetProperty("pipeline");

        var symbols = pipeline.GetProperty("semanticMemory")
            .EnumerateArray()
            .Select(symbol => symbol.GetProperty("id").GetString())
            .ToHashSet(StringComparer.Ordinal);
        var objectives = pipeline.GetProperty("objectives")
            .EnumerateArray()
            .Select(objective => objective.GetProperty("id").GetString())
            .ToHashSet(StringComparer.Ordinal);

        Assert.True(new[] { "door", "corridor", "enemy", "safe-zone", "bridge", "computer-room", "central-hall", "final-room", "exit-switch" }.All(symbols.Contains));
        Assert.Contains("open-door", objectives);
        Assert.Contains("reach-bridge", objectives);
        Assert.Contains("avoid-enemy", objectives);
        Assert.Contains("reach-central-hall", objectives);
        Assert.Contains("engage-front-enemy", objectives);
        Assert.Contains("reach-final-room", objectives);
        Assert.Contains("press-exit-switch", objectives);
        Assert.Equal("deterministic-weighted-priority", pipeline.GetProperty("arbitration").GetProperty("mode").GetString());

        var stageIds = pipeline.GetProperty("stages")
            .EnumerateArray()
            .Select(stage => stage.GetProperty("id").GetString())
            .ToHashSet(StringComparer.Ordinal);

        Assert.Contains("bridge-route-cruise", stageIds);
        Assert.Contains("computer-room-route-cruise", stageIds);
        Assert.Contains("central-hall-enemy-engage", stageIds);
        Assert.Contains("exit-switch-use", stageIds);
    }

    [Fact]
    public void AutoplaySensorTensorIcd_MapsLowLayerMatrixToSemanticSymbols()
    {
        var tensor = AutoplaySensorTensor.FromChannels(
            ("semantic.door", 0.75f),
            ("semantic.corridor", 0.55f),
            ("vision.enemy", 0.2f),
            ("semantic.bridge", 0.9f),
            ("semantic.computer", 0.65f),
            ("system.health", 1.0f),
            ("vision.open", 0.7f));

        Assert.Equal("doom-sensor-tensor-v1", AutoplaySensorTensorIcd.Version);
        Assert.Equal(4, AutoplaySensorTensorIcd.Rows);
        Assert.Equal(8, AutoplaySensorTensorIcd.Cols);
        Assert.Equal(32, AutoplaySensorTensorIcd.Size);
        Assert.Equal((2 * AutoplaySensorTensorIcd.Cols) + 3, AutoplaySensorTensorIcd.Offset("semantic.bridge"));
        Assert.Equal(0.75f, tensor.SemanticScore("door"), precision: 2);
        Assert.Equal(0.55f, tensor.SemanticScore("corridor"), precision: 2);
        Assert.Equal(0.2f, tensor.SemanticScore("enemy"), precision: 2);
        Assert.Equal(0.9f, tensor.SemanticScore("bridge"), precision: 2);
        Assert.Equal(0.65f, tensor.SemanticScore("computer-room"), precision: 2);
        Assert.True(tensor.SemanticScore("safe-zone") > 0.6f);
    }

    [Fact]
    public void ControlRuntimePackets_KeepTensorTransportSeparateFromSemanticAccessors()
    {
        var data = new float[32];
        data[19] = 0.82f;
        var packet = new ControlStateTensorPacket
        {
            Shape = [4, 8],
            Data = data,
            Channels = new Dictionary<string, int>(StringComparer.Ordinal)
            {
                ["semantic.bridge"] = 19,
                ["semantic.door"] = 16
            },
            SemanticMemory = new ControlSemanticMemoryPacket
            {
                Objective = "reach-bridge",
                Symbols = new Dictionary<string, float>(StringComparer.Ordinal)
                {
                    ["door"] = 0.66f
                }
            },
            Objective = "reach-bridge"
        };

        Assert.Equal("control-state-tensor/v1", packet.Version);
        Assert.Equal(0.82f, packet.Get("semantic.bridge"), precision: 2);
        Assert.Equal(0.82f, packet.SemanticScore("bridge"), precision: 2);
        Assert.Equal(0.66f, packet.SemanticScore("door"), precision: 2);
    }

    [Fact]
    public void PhilosophicalPipelineContracts_DefineAisthesisPhainesisNousToposKairosKinesisZoeOrder()
    {
        var frame = new SensorFrame
        {
            SensorTensor = AutoplaySensorTensor.FromChannels(("semantic.door", 0.8f)),
            Health = new HealthSignal { Health = 50, Source = "aisthesis.health" }
        };
        var phainomenon = new Phainomenon
        {
            Events = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["looming"] = 0.7f,
                ["stuck"] = 0.2f
            }
        };
        var nous = new MeaningVectorPacket
        {
            Source = phainomenon,
            MeaningVectors = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["loomingVector"] = phainomenon.EventScore("looming")
            }
        };
        var topos = new ToposDecisionVector
        {
            LogosVector = new Dictionary<string, float>(StringComparer.Ordinal) { ["route"] = 0.9f },
            PathosVector = new Dictionary<string, float>(StringComparer.Ordinal) { ["danger"] = 0.7f },
            EthosVector = new Dictionary<string, float>(StringComparer.Ordinal) { ["objective"] = 0.8f },
            Decision = "open-door"
        };
        var kairos = new PriorityAxes
        {
            PathosPriority = 0.7f,
            EthosPriority = 0.8f,
            LogosPriority = 0.9f,
            SelectedAxis = "logos"
        };
        var kinesis = new ActionVector { MoveForward = true, Source = "kinesis" };
        var zoe = new ZoeAuditResult { Action = kinesis };

        Assert.Equal(0.8f, frame.SensorTensor.SemanticScore("door"), precision: 2);
        Assert.Equal(0.7f, phainomenon.EventScore("looming"), precision: 2);
        Assert.Equal(0.7f, nous.MeaningVectors["loomingVector"], precision: 2);
        Assert.Equal("open-door", topos.Decision);
        Assert.Equal("logos", kairos.SelectedAxis);
        Assert.True(zoe.Action.MoveForward);
        Assert.False(zoe.Vetoed);
    }

    [Fact]
    public void PhilosophicalPipelineContracts_KeepZoeHealthOnlyAndDeprecateLegacyDet()
    {
        var zoe = typeof(IZoe).GetMethod(nameof(IZoe.Audit));
        Assert.NotNull(zoe);
        Assert.Equal(typeof(ZoeAuditResult), zoe.ReturnType);
        Assert.Equal(new[] { typeof(ActionVector), typeof(HealthSignal) }, zoe.GetParameters().Select(parameter => parameter.ParameterType).ToArray());

#pragma warning disable CS0618
        var obsolete = typeof(ILegacyDetAdapter)
            .GetCustomAttributes(typeof(ObsoleteAttribute), inherit: false)
            .OfType<ObsoleteAttribute>()
            .SingleOrDefault();
#pragma warning restore CS0618
        Assert.NotNull(obsolete);
        Assert.Contains("IPhainesis", obsolete.Message, StringComparison.Ordinal);
        Assert.Contains("Phainomenon", obsolete.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void PhilosophicalAutoplayPipeline_ExecutesStagesInCanonicalOrder()
    {
        var calls = new List<string>();
        var frame = new SensorFrame
        {
            SensorTensor = AutoplaySensorTensor.FromChannels(("vision.enemy", 0.75f)),
            Health = new HealthSignal { Health = 8, IsLikelyFatal = true }
        };
        var pipeline = new PhilosophicalAutoplayPipeline(
            new SpyPhainesis(calls),
            new SpyNous(calls),
            new SpyTopos(calls),
            new SpyKairos(calls),
            new SpyKinesis(calls),
            new SpyZoe(calls));

        var result = pipeline.Execute(frame);

        Assert.Equal(["phainesis", "nous", "topos", "kairos", "kinesis", "zoe"], calls);
        Assert.True(result.Vetoed);
        Assert.Equal("fatal-avoidance", result.Reason);
        Assert.False(result.Action.MoveForward);
        Assert.Equal("zoe", result.Action.Source);
    }

    [Fact]
    public void DoomPhilosophicalSensors_ExtractConfiguredPhenomenaAndMeaningVectors()
    {
        var frame = new SensorFrame
        {
            SensorTensor = AutoplaySensorTensor.FromChannels(
                ("vision.wall", 0.7f),
                ("vision.corner", 0.4f),
                ("vision.open", 0.6f),
                ("motion.delta", 0.5f),
                ("motion.stuck", 0.8f),
                ("semantic.corridor", 0.7f),
                ("semantic.door", 0.6f),
                ("vision.enemy", 0.9f),
                ("system.audio", 0.5f),
                ("system.health", 0.4f),
                ("system.enabled", 1.0f),
                ("system.ctg", 0.75f)),
            Health = new HealthSignal { Health = 35, Source = "aisthesis.health" }
        };
        var phainesis = new DoomPhainesis();
        var nous = new DoomNous();

        var phainomenon = phainesis.Extract(frame);
        var packet = nous.Vectorize(phainomenon);

        Assert.True(new[]
        {
            "wallFlow",
            "corridorFlow",
            "gap",
            "stuck",
            "oscillation",
            "looming",
            "enemyPresence",
            "damageLocalization",
            "projectileFlow",
            "threatField",
            "explorationEntropy",
            "itemBacktrack",
            "goalDirection",
            "safeZone",
            "intentConsistency",
            "movementStability",
            "confidenceFusion"
        }.All(phainomenon.Events.ContainsKey));
        Assert.True(new[]
        {
            "wallFlowVector",
            "gapVector",
            "corridorVector",
            "stuckVector",
            "loomingVector",
            "enemyVector",
            "damageVector",
            "projectileVector",
            "threatVector",
            "explorationVector",
            "itemVector",
            "goalVector",
            "safeZoneVector",
            "intentVector",
            "stabilityVector",
            "confidenceVector"
        }.All(packet.MeaningVectors.ContainsKey));
        Assert.True(phainomenon.EventScore("enemyPresence") > 0.8f);
        Assert.True(packet.MeaningVectors["threatVector"] > 0.8f);
    }

    [Fact]
    public void DoomPhilosophicalPipelineFactory_CreatesCompleteHealthVetoPipeline()
    {
        var pipeline = DoomPhilosophicalAutoplayPipelineFactory.Create();
        var frame = new SensorFrame
        {
            SensorTensor = AutoplaySensorTensor.FromChannels(
                ("vision.enemy", 0.8f),
                ("motion.delta", 0.5f),
                ("system.enabled", 1.0f)),
            Health = new HealthSignal { Health = 0, IsLikelyFatal = true }
        };

        var result = pipeline.Execute(frame);

        Assert.True(result.Vetoed);
        Assert.Equal("health-death", result.Reason);
        Assert.False(result.Action.MoveForward);
        Assert.False(result.Action.Shoot);
    }

    [Fact]
    public void DynamicPipelineEvaluator_UpdatesSensorEventVectorAndPriorityCarriers()
    {
        var compilation = DynamicPipelineCompiler.Compile(AutoplayPipelineDefinition.Default);
        var evaluator = new DynamicPipelineEvaluator(compilation.Graph, _ => _ => false);
        var context = new DynamicPipelineContext
        {
            Sensor = new SensorFusion([0.2f, 0.9f, 0.5f, 0.4f, 0.3f, 0.1f], 0.8f, 40, 0.2f, "corridor", false, 0, 32)
            {
                SensorTensor = AutoplaySensorTensor.FromChannels(
                    ("semantic.corridor", 0.2f),
                    ("vision.open", 0.2f),
                    ("vision.enemy", 1.0f),
                    ("system.combat", 1.0f),
                    ("motion.delta", 0.7f),
                    ("system.enabled", 1.0f))
            }
        };

        var aisthesis = evaluator.RunAisthesis(context);
        var phainesis = evaluator.RunPhainesis(aisthesis);
        var meaning = evaluator.RunNous(phainesis);
        var topos = evaluator.RunTopos(meaning);
        var kairos = evaluator.RunKairos(topos);
        var generated = evaluator.RunKinesis(kairos, new ActionCommand(false, false, false, false, 0, false, false));

        Assert.True(aisthesis.SensorReadings["visual"] > 0);
        Assert.True(phainesis.Events["looming"] > 0);
        Assert.True(meaning.MeaningVectors["enemyVector"] > 0);
        Assert.True(topos.ToposVectors["PathosVector"] > 0);
        Assert.True(kairos.Priorities["pathos"] > 0);
        Assert.Equal("pathos", kairos.SelectedAxis);
        Assert.True(generated.MoveBackward || generated.TurnYaw != 0);
    }

    [Fact]
    public void DynamicPipelineEvaluator_ZoeDefaultsSeparateGoalFirstWarningFromVeto()
    {
        var compilation = DynamicPipelineCompiler.Compile(AutoplayPipelineDefinition.Default);
        var evaluator = new DynamicPipelineEvaluator(compilation.Graph, AutoplayPipelineDslCompiler.CompileDynamicPredicate);
        var forwardAction = new ActionCommand(true, false, false, false, 0, false, false);
        var lowHealthContext = new DynamicPipelineContext
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 1, 42, 0, "corridor", false, 0, 0),
            LowHealthThreshold = 50,
            CriticalHealthThreshold = 18
        };
        var criticalHealthContext = lowHealthContext with
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 1, 12, 0, "corridor", false, 0, 0)
        };
        var deadContext = lowHealthContext with
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 1, 0, 0, "corridor", false, 0, 0)
        };
        var defaultVetoRules = compilation.Ast.Kinesis.Zoe.VetoRules;

        var lowHealth = evaluator.RunZoe(lowHealthContext, forwardAction, defaultVetoRules);
        var criticalHealth = evaluator.RunZoe(criticalHealthContext, forwardAction, defaultVetoRules);
        var dead = evaluator.RunZoe(deadContext, forwardAction, defaultVetoRules);
        var lowAisthesis = evaluator.RunAisthesis(lowHealthContext);
        var lowPhainesis = evaluator.RunPhainesis(lowAisthesis);
        var criticalAisthesis = evaluator.RunAisthesis(criticalHealthContext);
        var criticalPhainesis = evaluator.RunPhainesis(criticalAisthesis);

        Assert.False(lowHealth.ZoeVetoed);
        Assert.True(lowHealth.Action.MoveForward);
        Assert.True(criticalHealth.ZoeVetoed);
        Assert.Equal("zoe-veto:criticalHealth && lethalRisk > 0.65", criticalHealth.SvcEvent);
        Assert.True(dead.ZoeVetoed);
        Assert.Equal("zoe-veto:hp <= 0", dead.SvcEvent);
        Assert.Equal(1, lowAisthesis.SensorReadings["lowHealth"]);
        Assert.Equal(1, lowPhainesis.Events["lowHealthGoalFirst"]);
        Assert.Equal(0, lowPhainesis.Events["criticalHealth"]);
        Assert.Equal(1, criticalAisthesis.SensorReadings["criticalHealth"]);
        Assert.Equal(1, criticalPhainesis.Events["criticalHealth"]);
    }

    [Fact]
    public void DoomRoutePlanner_EvaluatesRouteFlagsOutsideJs()
    {
        var planner = new DoomRoutePlanner();
        var result = planner.Evaluate(new DoomRoutePlannerInput
        {
            Context = "open-space",
            DepthSig = 0.9f,
            FootObstacleScore = 0.62f,
            MotionObstacleScore = 0.6f,
            MotionForwardProgress = 0.05f,
            SpawnCorridorGapScore = 0.12f,
            SpawnLandmarkRouteEvidence = 0.24f,
            SpawnSecretDoorScore = 0.20f,
            SpawnWestStairScore = 0.10f,
            BridgeDoorScore = 0.20f,
            GapVector = 0.44f,
            UseProbeScore = 0.60f,
            UseProbeAlignment = 0.80f
        });

        Assert.True(result.RouteOpenSpaceLowGapScan);
        Assert.False(result.RouteOpenSpaceLowGapEscape);
        Assert.True(result.FirstDoorRouteEvidenceReady);
        Assert.True(result.EastWindowRouteEvidenceReady);
        Assert.Equal(0.20f, result.FirstDoorRouteEvidence, precision: 2);
        Assert.Equal("open-space-low-gap-scan", result.CurrentRoute);
        Assert.Equal(8, result.RecommendedYaw);
        Assert.True(result.RouteConfidence > 0.23f);
        Assert.True(result.UseProbeConfidence > 0.65f);

        var alignedButUnseen = planner.Evaluate(new DoomRoutePlannerInput
        {
            UseProbeScore = 0.0f,
            UseProbeAlignment = 0.96f
        });
        Assert.Equal(0.0f, alignedButUnseen.UseProbeConfidence, precision: 2);

        var weakBridgeRedPanel = planner.Evaluate(new DoomRoutePlannerInput
        {
            SpawnCorridorGapScore = 0.24f,
            SpawnLandmarkRouteEvidence = 0.37f,
            SpawnSecretDoorScore = 0.06f,
            BridgeDoorScore = 0.17f,
            FirstDoorVisionScore = 0.55f,
            FirstDoorVisionRedScore = 0.59f
        });
        Assert.True(weakBridgeRedPanel.FirstDoorRouteEvidenceReady);
        Assert.True(weakBridgeRedPanel.FirstDoorRouteEvidence >= 0.44f);

        var visionOnlyRedAccent = planner.Evaluate(new DoomRoutePlannerInput
        {
            SpawnCorridorGapScore = 0.20f,
            SpawnSecretDoorScore = 0.06f,
            BridgeDoorScore = 0.0f,
            FirstDoorVisionScore = 0.55f,
            FirstDoorVisionRedScore = 0.59f
        });
        Assert.False(visionOnlyRedAccent.FirstDoorRouteEvidenceReady);
    }

    [Fact]
    public void DoomLandmarkNavigator_SelectsRouteFallbackYawFromRouteEvidence()
    {
        var routePlan = new DoomRoutePlanner().Evaluate(new DoomRoutePlannerInput
        {
            SpawnCorridorGapScore = 0.34f,
            BridgeDoorScore = 0.10f
        });
        var navigator = new DoomLandmarkNavigator();

        var result = navigator.Evaluate(new DoomLandmarkNavigatorInput
        {
            RoutePlan = routePlan,
            SpawnCorridorGapTurn = "right",
            SpawnLandmarkRouteTurn = "left",
            SpawnGapYawDegrees = 14,
            WallVector = 0.5f
        });

        Assert.Equal(14, result.SpawnCorridorGapYaw);
        Assert.Equal(-14, result.LandmarkRouteYaw);
        Assert.Equal(-14, result.RouteFallbackYaw);
        Assert.Equal(-6, result.WallAwayYaw);
        Assert.Equal(-14, result.RecommendedYaw);
    }

    [Fact]
    public void DoomRoutePlanner_StrongerLandmarkVectorOverridesRawGapYaw()
    {
        var result = new DoomRoutePlanner().Evaluate(new DoomRoutePlannerInput
        {
            SpawnCorridorGapScore = 0.37f,
            SpawnLandmarkRouteEvidence = 0.53f,
            BridgeDoorScore = 0.10f,
            GapVector = 0.37f,
            CorridorVector = -0.53f
        });

        Assert.True(result.RecommendedYaw < 0);
        Assert.Equal("first-door-route", result.CurrentRoute);
        Assert.True(result.RouteConfidence >= 0.50f);
    }

    [Fact]
    public void DoomRoutePlanner_DoesNotTreatOpenSpaceMidDepthFootNoiseAsWallContact()
    {
        var result = new DoomRoutePlanner().Evaluate(new DoomRoutePlannerInput
        {
            Context = "open-space",
            DepthSig = 0.62f,
            FootObstacleScore = 0.42f,
            FootObstacleFlickerScore = 0.05f,
            FootObstacleBounceFrames = 0,
            MotionObstacleScore = 0.50f,
            MotionForwardProgress = 0.36f,
            SpawnCorridorGapScore = 0.36f,
            SpawnLandmarkRouteEvidence = 0.32f,
            SpawnSecretDoorScore = 0.20f,
            SpawnWestStairScore = 0.10f
        });

        Assert.False(result.RouteFootObstacle);
        Assert.False(result.RouteWallObstacle);
        Assert.Equal("first-door-route", result.CurrentRoute);

        var highTextureResult = new DoomRoutePlanner().Evaluate(new DoomRoutePlannerInput
        {
            Context = "open-space",
            DepthSig = 1.0f,
            FootObstacleScore = 0.65f,
            FootObstacleFlickerScore = 0.0f,
            FootObstacleBounceFrames = 0,
            MotionObstacleScore = 0.65f,
            MotionForwardProgress = 0.0f,
            SpawnCorridorGapScore = 0.24f,
            SpawnLandmarkRouteEvidence = 0.36f,
            SpawnSecretDoorScore = 0.07f,
            SpawnWestStairScore = 0.19f
        });

        Assert.False(highTextureResult.RouteFootObstacle);
        Assert.False(highTextureResult.RouteWallObstacle);

        var barrelLaneResult = new DoomRoutePlanner().Evaluate(new DoomRoutePlannerInput
        {
            Context = "open-space",
            DepthSig = 0.92f,
            FootObstacleScore = 0.65f,
            FootObstacleFlickerScore = 0.0f,
            FootObstacleBounceFrames = 0,
            MotionObstacleScore = 0.65f,
            MotionForwardProgress = 0.70f,
            SpawnCorridorGapScore = 0.38f,
            SpawnLandmarkRouteEvidence = 0.50f,
            SpawnSecretDoorScore = 0.68f,
            SpawnWestStairScore = 0.10f,
            UseProbeScore = 0.0f
        });

        Assert.True(barrelLaneResult.OpenSpaceFootNoise);
        Assert.True(barrelLaneResult.RouteFootSoftClear);
        Assert.False(barrelLaneResult.RouteFootClearRequired);
        Assert.True(barrelLaneResult.RouteBarrelLaneRisk);
        Assert.False(barrelLaneResult.RouteBarrelLaneDetourRequired);

        var deadEndTrimResult = new DoomRoutePlanner().Evaluate(new DoomRoutePlannerInput
        {
            Context = "open-space",
            DepthSig = 0.92f,
            FootObstacleScore = 0.60f,
            FootObstacleFlickerScore = 0.0f,
            FootObstacleBounceFrames = 0,
            MotionObstacleScore = 0.60f,
            MotionForwardProgress = 0.70f,
            SpawnCorridorGapScore = 0.35f,
            SpawnLandmarkRouteEvidence = 0.42f,
            SpawnSecretDoorScore = 0.10f,
            GapVector = 0.40f,
            UseProbeScore = 0.0f
        });

        Assert.True(deadEndTrimResult.RouteDeadEndRisk);
        Assert.True(deadEndTrimResult.RouteDeadEndTrimRequired);

        var stableGapResult = new DoomRoutePlanner().Evaluate(new DoomRoutePlannerInput
        {
            Context = "open-space",
            DepthSig = 0.92f,
            FootObstacleScore = 0.65f,
            FootObstacleFlickerScore = 0.0f,
            FootObstacleBounceFrames = 0,
            MotionObstacleScore = 0.65f,
            MotionForwardProgress = 0.70f,
            SpawnCorridorGapScore = 0.42f,
            SpawnLandmarkRouteEvidence = 0.54f,
            SpawnSecretDoorScore = 0.24f,
            SpawnWestStairScore = 0.10f,
            UseProbeScore = 0.0f
        });

        Assert.True(stableGapResult.OpenSpaceFootNoise);
        Assert.False(stableGapResult.RouteBarrelLaneRisk);
        Assert.False(stableGapResult.RouteBarrelLaneDetourRequired);

        var barrelLaneDetourResult = new DoomRoutePlanner().Evaluate(new DoomRoutePlannerInput
        {
            Context = "open-space",
            DepthSig = 1.0f,
            FootObstacleScore = 0.57f,
            FootObstacleFlickerScore = 0.0f,
            FootObstacleBounceFrames = 0,
            MotionObstacleScore = 0.57f,
            MotionForwardProgress = 0.57f,
            SpawnCorridorGapScore = 0.22f,
            SpawnLandmarkRouteEvidence = 0.46f,
            SpawnSecretDoorScore = 0.68f,
            SpawnWestStairScore = 0.10f,
            UseProbeScore = 0.0f
        });

        Assert.True(barrelLaneDetourResult.OpenSpaceFootNoise);
        Assert.False(barrelLaneDetourResult.RouteBarrelLaneRisk);
        Assert.True(barrelLaneDetourResult.RouteBarrelLaneDetourRequired);

        var nearDoorResult = new DoomRoutePlanner().Evaluate(new DoomRoutePlannerInput
        {
            Context = "open-space",
            DepthSig = 0.92f,
            FootObstacleScore = 0.65f,
            MotionObstacleScore = 0.65f,
            MotionForwardProgress = 0.70f,
            SpawnCorridorGapScore = 0.38f,
            SpawnLandmarkRouteEvidence = 0.50f,
            UseProbeScore = 0.30f
        });

        Assert.False(nearDoorResult.RouteBarrelLaneRisk);
        Assert.False(nearDoorResult.RouteBarrelLaneDetourRequired);
    }

    [Fact]
    public void DoomRouteLoopBudgetEvaluator_ExposesRecoverStallOnlyForSpawnApproach()
    {
        var evaluator = new DoomRouteLoopBudgetEvaluator();

        var earlyRecover = evaluator.Evaluate(new DoomRouteLoopBudgetInput
        {
            RouteMode = "spawn-approach",
            Predictions = 1200,
            EastWindowRecoverAnchor = true,
            EastWindowRouteEvidenceReady = true,
            SpawnCorridorGapScore = 0.20f,
            FirstDoorVisionScore = 0.05f,
            UseProbeScore = 0.0f
        });

        Assert.False(earlyRecover.Exceeded);
        Assert.Equal("none", earlyRecover.RouteAbortHint);
        Assert.Equal(300, earlyRecover.RecoverUsed);
        Assert.Equal(520, earlyRecover.RecoverBudget);

        var exhaustedRecover = evaluator.Evaluate(new DoomRouteLoopBudgetInput
        {
            RouteMode = "spawn-approach",
            Predictions = 1500,
            EastWindowRecoverAnchor = true,
            EastWindowRouteEvidenceReady = true,
            SpawnCorridorGapScore = 0.20f,
            FirstDoorVisionScore = 0.05f,
            UseProbeScore = 0.0f
        });

        Assert.True(exhaustedRecover.Exceeded);
        Assert.True(exhaustedRecover.RecoverExceeded);
        Assert.Equal("recover-stall", exhaustedRecover.LoopKind);
        Assert.Equal("recover-stall", exhaustedRecover.RouteAbortHint);

        var doorApproachRecover = evaluator.Evaluate(new DoomRouteLoopBudgetInput
        {
            RouteMode = "door-approach",
            Predictions = 1500,
            EastWindowRecoverAnchor = true,
            EastWindowRouteEvidenceReady = true,
            SpawnCorridorGapScore = 0.20f,
            FirstDoorVisionScore = 0.05f,
            UseProbeScore = 0.0f
        });

        Assert.False(doorApproachRecover.Exceeded);
        Assert.Equal(0, doorApproachRecover.RecoverBudget);
        Assert.Equal("none", doorApproachRecover.RouteAbortHint);

        var exhaustedAdvance = evaluator.Evaluate(new DoomRouteLoopBudgetInput
        {
            RouteMode = "door-approach",
            Predictions = 1200,
            ActionRepeatFrames = 140,
            MotionForwardProgress = 0.70f,
            MotionObstacleScore = 0.50f,
            FootObstacleScore = 0.50f,
            SpawnCorridorGapScore = 0.21f,
            SpawnLandmarkRouteEvidence = 0.36f,
            FirstDoorVisionScore = 0.21f,
            UseProbeScore = 0.0f
        });

        Assert.True(exhaustedAdvance.Exceeded);
        Assert.True(exhaustedAdvance.AdvanceExceeded);
        Assert.Equal("advance-stall", exhaustedAdvance.LoopKind);
        Assert.Equal("advance-stall", exhaustedAdvance.RouteAbortHint);
        Assert.Equal(140, exhaustedAdvance.AdvanceUsed);
        Assert.Equal(96, exhaustedAdvance.AdvanceBudget);

        var exhaustedIngress = evaluator.Evaluate(new DoomRouteLoopBudgetInput
        {
            RouteMode = "door-approach",
            Predictions = 760,
            ActionRepeatFrames = 120,
            MoveRepeatFrames = 120,
            TurnRepeatFrames = 120,
            MotionForwardProgress = 0.70f,
            MotionObstacleScore = 0.22f,
            FootObstacleScore = 0.22f,
            SpawnCorridorGapScore = 0.21f,
            SpawnLandmarkRouteEvidence = 0.36f,
            FirstDoorVisionScore = 0.21f,
            UseProbeScore = 0.0f
        });

        Assert.True(exhaustedIngress.Exceeded);
        Assert.True(exhaustedIngress.IngressExceeded);
        Assert.Equal("ingress-loop", exhaustedIngress.LoopKind);
        Assert.Equal("ingress-loop", exhaustedIngress.RouteAbortHint);
        Assert.Equal(120, exhaustedIngress.IngressUsed);
        Assert.Equal(72, exhaustedIngress.IngressBudget);

        var visibleGapAdvance = evaluator.Evaluate(new DoomRouteLoopBudgetInput
        {
            RouteMode = "door-approach",
            Predictions = 1200,
            ActionRepeatFrames = 140,
            MotionForwardProgress = 0.27f,
            MotionObstacleScore = 0.57f,
            FootObstacleScore = 0.57f,
            SpawnCorridorGapScore = 0.39f,
            SpawnLandmarkRouteEvidence = 0.36f,
            FirstDoorVisionScore = 0.21f,
            UseProbeScore = 0.0f
        });

        Assert.False(visibleGapAdvance.AdvanceExceeded);
        Assert.Equal("none", visibleGapAdvance.RouteAbortHint);

        var spawnRouteArc = evaluator.Evaluate(new DoomRouteLoopBudgetInput
        {
            RouteMode = "door-approach",
            Predictions = 372,
            ActionRepeatFrames = 66,
            TurnRepeatFrames = 240,
            MotionForwardProgress = 0.70f,
            SpawnCorridorGapScore = 0.41f,
            FirstDoorVisionScore = 0.05f,
            UseProbeScore = 0.0f
        });

        Assert.True(spawnRouteArc.Exceeded);
        Assert.True(spawnRouteArc.ArcExceeded);
        Assert.Equal("spawn-route-arc", spawnRouteArc.LoopKind);
        Assert.Equal("spawn-route-arc", spawnRouteArc.RouteAbortHint);
        Assert.Equal(240, spawnRouteArc.ArcUsed);
        Assert.Equal(96, spawnRouteArc.ArcBudget);
    }

    [Fact]
    public void PipelineStateDto_FromContext_ExposesCanonicalLayersAndKairosAxis()
    {
        var routePlan = new DoomRoutePlannerResult
        {
            FirstDoorRouteEvidence = 0.4f,
            FirstDoorRouteEvidenceReady = true,
            RouteBarrelLaneRisk = true,
            RecommendedYaw = 1,
            RouteLoopKind = "recover-stall",
            RouteAbortHint = "recover-stall",
            RouteLoopBudgetExceeded = true,
            RouteRecoverUsed = 600,
            RouteRecoverBudget = 520,
            RouteRecoverExceeded = true
        };
        var context = new DynamicPipelineContext
        {
            SensorReadings = new Dictionary<string, float>(StringComparer.Ordinal) { ["visual"] = 0.5f },
            Events = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["gap"] = 0.6f,
                ["footObstacle"] = 0.58f,
                ["motionObstacle"] = 0.32f
            },
            MeaningVectors = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["gapVector"] = 0.6f,
                ["landmarkVector"] = 0.40f
            },
            ToposVectors = new Dictionary<string, float>(StringComparer.Ordinal) { ["LogosVector"] = 0.6f },
            Priorities = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["logos"] = 0.6f,
                ["pathos"] = 0.2f,
                ["ethos"] = 0.5f
            },
            SelectedAxis = "logos",
            ActionRepeatFrames = 20,
            MoveRepeatFrames = 20,
            TurnRepeatFrames = 6,
            UsePulseCooldownFrames = 45,
            UsePulseSuppressedFrames = 3,
            LastUsePulsePrediction = 1201,
            RoutePlan = routePlan
        };
        var action = new ActionCommand(true, false, false, false, 0, false, false);

        var state = PipelineStateDto.From(context, action);

        Assert.Equal(0.5f, state.Aisthesis.SensorReadings["visual"], precision: 2);
        Assert.True(state.Aisthesis.RoutePlan.FirstDoorRouteEvidenceReady);
        Assert.Equal("recover-stall", state.Aisthesis.RoutePlan.RouteAbortHint);
        Assert.True(state.Aisthesis.RoutePlan.RouteRecoverExceeded);
        Assert.Equal(0.6f, state.Noesis.PhainesisEvents["gap"], precision: 2);
        Assert.True(state.Noesis.Topology.WallDistanceNormalized < 0.55f);
        Assert.True(state.Noesis.Topology.BarrelZoneEvidence > 0.5f);
        Assert.True(state.Noesis.Topology.CenterlineDirectionX < 0);
        Assert.True(state.Noesis.Topology.CorridorDirectionHintX > 0);
        Assert.True(state.Noesis.Topology.CenterCorridorAlignment < 0);
        Assert.Equal(0.6f, state.Krisis.ToposVectors["LogosVector"], precision: 2);
        Assert.Equal("logos", state.Krisis.Kairos.SelectedAxis);
        Assert.True(state.Krisis.Kairos.IsLogosDominant);
        Assert.True(state.Kinesis.MoveForward);
        Assert.Equal(20, state.Kinesis.ActionRepeatFrames);
        Assert.Equal(20, state.Kinesis.MoveRepeatFrames);
        Assert.Equal(6, state.Kinesis.TurnRepeatFrames);
        Assert.Equal(45, state.Kinesis.UsePulseCooldownFrames);
        Assert.Equal(3, state.Kinesis.UsePulseSuppressedFrames);
        Assert.Equal(1201, state.Kinesis.LastUsePulsePrediction);
        Assert.Equal(50, state.Kinesis.Zoe.HealthThreshold);
        Assert.False(state.Kinesis.Zoe.Warning);
        Assert.Equal(100, state.Kinesis.Zoe.Health);
    }

    [Fact]
    public void PipelineStateDto_SeparatesLowHealthWarningFromZoeVeto()
    {
        var context = new DynamicPipelineContext
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 1, 42, 0, "computer-room", true, 0, 0),
            LowHealthThreshold = 50,
            CriticalHealthThreshold = 18
        };
        var action = new ActionCommand(true, false, false, false, 0, false, false);

        var state = PipelineStateDto.From(context, action);

        Assert.False(state.Kinesis.Zoe.Vetoed);
        Assert.True(state.Kinesis.Zoe.Warning);
        Assert.True(state.Kinesis.Zoe.LowHealth);
        Assert.False(state.Kinesis.Zoe.CriticalHealth);
        Assert.Equal(42, state.Kinesis.Zoe.Health);
        Assert.Equal(50, state.Kinesis.Zoe.HealthThreshold);
        Assert.Equal(18, state.Kinesis.Zoe.CriticalHealthThreshold);
        Assert.Equal("low-health-goal-first", state.Kinesis.Zoe.LastReason);
        Assert.Equal("none", state.Kinesis.Zoe.OverrideAction);

        var vetoed = PipelineStateDto.From(context, action, true, "zoe-veto:hp <= 0");

        Assert.True(vetoed.Kinesis.Zoe.Vetoed);
        Assert.Equal("zoe-veto:hp <= 0", vetoed.Kinesis.Zoe.LastReason);
        Assert.Equal("stop", vetoed.Kinesis.Zoe.OverrideAction);
    }

    [Fact]
    public void DoomRouteTopologyEvaluator_FoldsBarrelLaneIntoDeadEndRisk()
    {
        var topology = new DoomRouteTopologyEvaluator().Evaluate(new DoomRouteTopologyInput
        {
            Gap = 0.35f,
            Landmark = 0.42f,
            FootObstacle = 0.60f,
            MotionObstacle = 0.60f,
            FirstDoorRouteEvidence = 0.35f,
            RouteConfidence = 0.42f,
            RecommendedYaw = 8,
            RouteBarrelLaneRisk = true
        });

        Assert.True(topology.BarrelZoneEvidence > 0.90f);
        Assert.True(topology.CenterCorridorAlignment < -0.30f);
        Assert.True(topology.DeadEndRisk);
    }

    [Fact]
    public void DoomRouteLoopBudgetEvaluator_ExposesDoorApproachDeadEndAsPhaseAbortHint()
    {
        var budget = new DoomRouteLoopBudgetEvaluator().Evaluate(new DoomRouteLoopBudgetInput
        {
            RouteMode = "door-approach",
            RouteDeadEndRisk = true,
            Predictions = 920,
            MoveRepeatFrames = 48,
            MotionForwardProgress = 0.70f,
            MotionObstacleScore = 0.60f,
            FootObstacleScore = 0.60f,
            SpawnCorridorGapScore = 0.35f,
            SpawnLandmarkRouteEvidence = 0.40f,
            FirstDoorVisionScore = 0.28f,
            UseProbeScore = 0.0f
        });

        Assert.Equal("door-approach-dead-end", budget.LoopKind);
        Assert.Equal("door-approach-dead-end", budget.RouteAbortHint);
        Assert.True(budget.TopologyExceeded);
        Assert.Equal(48, budget.TopologyUsed);

        var spawnBudget = new DoomRouteLoopBudgetEvaluator().Evaluate(new DoomRouteLoopBudgetInput
        {
            RouteMode = "spawn-approach",
            RouteDeadEndRisk = true,
            Predictions = 920,
            MoveRepeatFrames = 48,
            MotionForwardProgress = 0.70f,
            MotionObstacleScore = 0.60f,
            FootObstacleScore = 0.60f,
            SpawnCorridorGapScore = 0.35f,
            SpawnLandmarkRouteEvidence = 0.40f,
            FirstDoorVisionScore = 0.28f,
            UseProbeScore = 0.0f
        });

        Assert.Equal("none", spawnBudget.RouteAbortHint);
        Assert.False(spawnBudget.TopologyExceeded);
    }

    [Fact]
    public void DynamicPipelineDslCompiler_ResolvesKinesisRepeatCounters()
    {
        var predicate = AutoplayPipelineDslCompiler.CompileDynamicPredicate(
            "actionRepeatFrames >= 20 && moveRepeatFrames >= 12 && turnRepeatFrames >= 6");
        var aliasPredicate = AutoplayPipelineDslCompiler.CompileDynamicPredicate(
            "kinesisActionRepeatFrames >= 20 && kinesisMoveRepeatFrames >= 12 && repeatTurnFrames >= 6");
        var thresholdPredicate = AutoplayPipelineDslCompiler.CompileDynamicPredicate(
            "hp < lowHealthThreshold && hp > criticalHealthThreshold");
        var healthStatePredicate = AutoplayPipelineDslCompiler.CompileDynamicPredicate(
            "lowHealth && lowHealthGoalFirst && !criticalHealth");
        var criticalPredicate = AutoplayPipelineDslCompiler.CompileDynamicPredicate("criticalHealth");
        var context = new DynamicPipelineContext
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 1, 42, 0, "corridor", false, 0, 0),
            ActionRepeatFrames = 20,
            MoveRepeatFrames = 12,
            TurnRepeatFrames = 6,
            LowHealthThreshold = 50,
            CriticalHealthThreshold = 18
        };

        Assert.True(predicate(context));
        Assert.True(aliasPredicate(context));
        Assert.True(thresholdPredicate(context));
        Assert.True(healthStatePredicate(context));
        Assert.False(criticalPredicate(context));

        var criticalContext = context with
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 1, 12, 0, "corridor", false, 0, 0)
        };

        Assert.True(criticalPredicate(criticalContext));
    }

    [Fact]
    public void DynamicPipelineDslCompiler_ResolvesRouteDoorCombatTokensWithoutJsContext()
    {
        var routePredicate = AutoplayPipelineDslCompiler.CompileDynamicPredicate(
            "routeMode == door-approach && routeAbortHint == door-approach-dead-end && routeDeadEndRisk && routeDeadEndTrimRequired && routeTextureWallOcclusion == false && routePlannerAdvanceReady");
        var doorPredicate = AutoplayPipelineDslCompiler.CompileDynamicPredicate(
            "bridgeDoorScore >= 0.30 && firstDoorUse3x3Score < 0.22 && spawnCorridorGapScore >= 0.34 && spawnCorridorGapTurn == right");
        var combatPredicate = AutoplayPipelineDslCompiler.CompileDynamicPredicate(
            "computerRoomCombatContext && trustedCombatEvidence && audioEnemyStrong && visualEnemyVisible && visualEnemyFireReady == false");
        var bridgePredicate = AutoplayPipelineDslCompiler.CompileDynamicPredicate(
            "bridgeLaneVisible && bridgeGreenHazard >= 0.18 && routeCorridorBridgeLock == true");
        var context = new DynamicPipelineContext
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 1, 84, 0, "computer-room", true, 0, 0),
            SensorReadings = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["bridgeDoorScore"] = 0.36f,
                ["firstDoorUse3x3Score"] = 0.18f,
                ["spawnCorridorGapScore"] = 0.38f,
                ["bridgeGreenHazard"] = 0.24f
            },
            Events = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["audioEnemyStrong"] = 1,
                ["visualEnemyVisible"] = 1,
                ["visualEnemyFireReady"] = 0,
                ["trustedCombatEvidence"] = 1,
                ["computerRoomCombatContext"] = 1,
                ["bridgeLaneVisible"] = 1
            },
            TextValues = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                ["spawnCorridorGapTurn"] = "right",
                ["bridgeLaneTurn"] = "right"
            },
            RoutePlan = new DoomRoutePlannerResult
            {
                RouteMode = "door-approach",
                RouteAbortHint = "door-approach-dead-end",
                RouteDeadEndRisk = true,
                RouteDeadEndTrimRequired = true,
                RouteTextureWallOcclusion = false,
                FirstDoorRouteEvidenceReady = true,
                RouteCorridorBridgeLock = true
            }
        };

        Assert.True(routePredicate(context));
        Assert.True(doorPredicate(context));
        Assert.True(combatPredicate(context));
        Assert.True(bridgePredicate(context));
    }

    [Fact]
    public void DoomHudDtos_FromPipelineState_ExposeGoalDebugAndAutoplayPackets()
    {
        var routePlan = new DoomRoutePlannerResult
        {
            RouteWallObstacle = true,
            FirstDoorRouteEvidence = 0.42f,
            FirstDoorRouteEvidenceReady = true,
            RouteConfidence = 0.74f,
            RecommendedYaw = 9,
            UseProbeConfidence = 0.68f
        };
        var navigator = new DoomLandmarkNavigatorResult
        {
            RouteFallbackYaw = 12,
            SpawnCorridorGapYaw = 12,
            WallAwayYaw = -6
        };
        var context = new DynamicPipelineContext
        {
            SensorReadings = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["visual"] = 0.44f,
                ["movement"] = 0.18f,
                ["collision"] = 1,
                ["spatial"] = 0.42f,
                ["vision9x9.40"] = 0.82f,
                ["firstDoorVision9x9RedScore"] = 0.16f
            },
            Events = new Dictionary<string, float>(StringComparer.Ordinal) { ["gap"] = 0.42f },
            MeaningVectors = new Dictionary<string, float>(StringComparer.Ordinal) { ["gapVector"] = 0.42f },
            ToposVectors = new Dictionary<string, float>(StringComparer.Ordinal) { ["LogosVector"] = 0.64f },
            Priorities = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["logos"] = 0.64f,
                ["pathos"] = 0.12f,
                ["ethos"] = 0.42f
            },
            SelectedAxis = "logos",
            RoutePlan = routePlan
        };
        var action = new ActionCommand(true, false, false, false, 1, false, false);
        var pipelineState = PipelineStateDto.From(context, action);

        var state = DoomAutoplayStateDto.From(
            "find-corridor-to-first-door",
            "demo-spawn-map-centerline",
            routePlan,
            navigator,
            pipelineState,
            action);

        Assert.Equal("FirstDoor", state.GoalState.Telos);
        Assert.Equal("Logos", state.GoalState.PriorityAxis);
        Assert.Equal("first-door-route", state.CurrentRoute);
        Assert.Equal("first-door-route-evidence", state.CurrentLandmark);
        Assert.Equal(0.74f, state.RouteConfidence, precision: 2);
        Assert.Equal(9, state.RecommendedYaw);
        Assert.True(state.DebugOverlay.KairosBlink);
        Assert.Contains(state.DebugOverlay.Regions, region => region.Kind == "door" && region.Active);
        Assert.Contains(state.DebugOverlay.Grid, cell => cell.Active);
        Assert.Equal(81, state.DebugOverlay.Vision9x9.Count);
        Assert.Contains(state.DebugOverlay.Vision9x9, cell => cell.Row == 4 && cell.Column == 4 && cell.Score > 0.8f);
        Assert.Contains(state.DebugOverlay.DoorCandidates, candidate => candidate.Score >= 0.42f && candidate.RedScore >= 0.16f);
        Assert.Contains(state.DebugOverlay.CornerCandidates, candidate => candidate.Score >= 0.48f);
        Assert.Equal(81, state.DebugOverlay.GpuHud.Cells.Count);
        Assert.True(state.DebugOverlay.GpuHud.Cells[40] > 0.8f);
        Assert.Equal(1, state.DebugOverlay.GpuHud.ContractVersion);
        Assert.Equal("DoomGpuHudOverlay", state.DebugOverlay.GpuHud.ContractName);
        Assert.Equal("doom", state.DebugOverlay.GpuHud.RawFramebufferTarget);
        Assert.Equal("RawFramebuffer", state.DebugOverlay.GpuHud.RawFrameTarget.Kind);
        Assert.True(state.DebugOverlay.GpuHud.RawFrameTarget.HudExcluded);
        Assert.Equal("doom-hud", state.DebugOverlay.GpuHud.HudTarget);
        Assert.Equal("HudCompositeOffscreen", state.DebugOverlay.GpuHud.HudFrameTarget.Kind);
        Assert.Equal("raw-framebuffer", state.DebugOverlay.GpuHud.AnalysisCaptureSource);
        Assert.Equal("RawFramebuffer", state.DebugOverlay.GpuHud.AnalysisFrameTarget.Kind);
        Assert.Equal("hud-composite-offscreen", state.DebugOverlay.GpuHud.DisplaySource);
        Assert.Equal("HudCompositeOffscreen", state.DebugOverlay.GpuHud.DisplayFrameTarget.Kind);
        Assert.Equal("none", state.DebugOverlay.GpuHud.ReadbackPolicy);
        Assert.Equal("None", state.DebugOverlay.GpuHud.Readback.Kind);
        Assert.False(state.DebugOverlay.GpuHud.Readback.AllowsFullReadback);
        Assert.Equal("dto-pending", state.DebugOverlay.GpuHud.FrameToken.Phase);
        Assert.False(state.DebugOverlay.GpuHud.FrameToken.ProviderStamped);
        Assert.Contains("rect8", state.DebugOverlay.GpuHud.RectangleLayout, StringComparison.Ordinal);
        Assert.Equal("rect8", state.DebugOverlay.GpuHud.RectangleBufferLayout.Name);
        Assert.Equal(1, state.DebugOverlay.GpuHud.RectangleBufferLayout.Version);
        Assert.Equal(8, state.DebugOverlay.GpuHud.RectangleBufferLayout.Stride);
        Assert.Equal(16, state.DebugOverlay.GpuHud.RectangleBufferLayout.MaxItems);
        Assert.Equal(128, state.DebugOverlay.GpuHud.RectangleBufferLayout.MaxFloats);
        Assert.Contains("alpha", state.DebugOverlay.GpuHud.RectangleBufferLayout.Fields);
        Assert.Equal("panel16", state.DebugOverlay.GpuHud.PanelBufferLayout.Name);
        Assert.Equal(16, state.DebugOverlay.GpuHud.PanelBufferLayout.Stride);
        Assert.Contains("alignment", state.DebugOverlay.GpuHud.PanelBufferLayout.Fields);
        Assert.Contains("hud-composite", state.DebugOverlay.GpuHud.FeatureFlags);
        Assert.Equal(81, state.DebugOverlay.GpuHud.CellCount);
        Assert.Equal(16, state.DebugOverlay.GpuHud.PanelValueCount);
        Assert.Equal(8, state.DebugOverlay.GpuHud.RectangleStride);
        Assert.Equal(state.DebugOverlay.GpuHud.Rectangles.Count * 8, state.DebugOverlay.GpuHud.RectangleFloatCount);
        Assert.Equal(state.DebugOverlay.GpuHud.RectangleFloatCount, state.DebugOverlay.GpuHud.RectangleValues.Count);
        Assert.Contains("hud=dto cells81", state.DebugOverlay.GpuHud.Summary, StringComparison.Ordinal);
        Assert.Contains("rflat", state.DebugOverlay.GpuHud.Summary, StringComparison.Ordinal);
        Assert.Contains(state.DebugOverlay.GpuHud.Labels, label => label.Label == "DOOR" && label.ClassName.Contains("is-door", StringComparison.Ordinal));
        Assert.Contains(state.DebugOverlay.GpuHud.Rectangles, rect => rect.Kind == "door" && rect.Color.Count == 3 && rect.Color[0] > 0.9f && rect.Color[1] > 0.7f);
        Assert.Contains(state.DebugOverlay.GpuHud.RectangleValues, value => value > 0.7f);
        Assert.True(state.DebugOverlay.GpuAisthesis.Enabled);
        Assert.Equal(1, state.DebugOverlay.GpuAisthesis.ContractVersion);
        Assert.Equal("DoomGpuAisthesis", state.DebugOverlay.GpuAisthesis.ContractName);
        Assert.Equal("doom", state.DebugOverlay.GpuAisthesis.InputTarget);
        Assert.Equal("RawFramebuffer", state.DebugOverlay.GpuAisthesis.InputFrameTarget.Kind);
        Assert.True(state.DebugOverlay.GpuAisthesis.InputFrameTarget.HudExcluded);
        Assert.Equal("raw-framebuffer", state.DebugOverlay.GpuAisthesis.CaptureSource);
        Assert.Equal("RawFramebuffer", state.DebugOverlay.GpuAisthesis.CaptureFrameTarget.Kind);
        Assert.Equal("debug-only", state.DebugOverlay.GpuAisthesis.ReadbackPolicy);
        Assert.Equal("DebugOnly", state.DebugOverlay.GpuAisthesis.Readback.Kind);
        Assert.True(state.DebugOverlay.GpuAisthesis.Readback.AllowsFullReadback);
        Assert.True(state.DebugOverlay.GpuAisthesis.Readback.DebugOnly);
        Assert.Equal("gpu-aisthesis-dto", state.DebugOverlay.GpuAisthesis.FrameToken.Phase);
        Assert.True(state.DebugOverlay.GpuAisthesis.MaskTextureEnabled);
        Assert.Equal("doom.gpu.aisthesis.mask9x9", state.DebugOverlay.GpuAisthesis.MaskTextureTarget);
        Assert.Equal("AisthesisMask", state.DebugOverlay.GpuAisthesis.MaskTexture.Kind);
        Assert.Equal("gpu-aisthesis-mask9x9", state.DebugOverlay.GpuAisthesis.MaskTexture.WireName);
        Assert.Equal("rgba8unorm", state.DebugOverlay.GpuAisthesis.MaskTexture.Format);
        Assert.Equal(9, state.DebugOverlay.GpuAisthesis.MaskTexture.Width);
        Assert.Equal(9, state.DebugOverlay.GpuAisthesis.MaskTexture.Height);
        Assert.Equal("analysis-mask", state.DebugOverlay.GpuAisthesis.MaskTexture.Usage);
        Assert.True(state.DebugOverlay.GpuAisthesis.MaskTexture.HudExcluded);
        Assert.Equal("mask9x9:heat,red,edge,corner", state.DebugOverlay.GpuAisthesis.MaskTextureLayout);
        Assert.Contains("matrix:kind,rows,columns,count,values", state.DebugOverlay.GpuAisthesis.MatrixLayout, StringComparison.Ordinal);
        Assert.Equal("matrix", state.DebugOverlay.GpuAisthesis.MatrixBufferLayout.Name);
        Assert.Equal(1, state.DebugOverlay.GpuAisthesis.MatrixBufferLayout.Version);
        Assert.Equal(512, state.DebugOverlay.GpuAisthesis.MatrixBufferLayout.MaxFloats);
        Assert.Contains("values", state.DebugOverlay.GpuAisthesis.MatrixBufferLayout.Fields);
        Assert.Equal("state16", state.DebugOverlay.GpuAisthesis.StateVectorBufferLayout.Name);
        Assert.Equal(16, state.DebugOverlay.GpuAisthesis.StateVectorBufferLayout.Stride);
        Assert.Contains("topology", state.DebugOverlay.GpuAisthesis.StateVectorBufferLayout.Fields);
        Assert.Contains("red-panel-detect", state.DebugOverlay.GpuAisthesis.Features);
        Assert.Contains("mask9x9-texture", state.DebugOverlay.GpuAisthesis.Features);
        Assert.Contains(state.DebugOverlay.GpuAisthesis.Matrices, matrix => matrix.Kind == "topos9x9" && matrix.Values.Count == 81);
        Assert.Contains(state.DebugOverlay.GpuAisthesis.Matrices, matrix => matrix.Kind == "ctg-state" && matrix.Values.Count == 16);
        Assert.Equal(16, state.DebugOverlay.GpuAisthesis.StateVector.Count);
        Assert.Equal(state.DebugOverlay.GpuAisthesis.Matrices.Count, state.DebugOverlay.GpuAisthesis.MatrixCount);
        Assert.Equal(state.DebugOverlay.GpuAisthesis.MatrixValues.Count, state.DebugOverlay.GpuAisthesis.MatrixFloatCount);
        Assert.True(state.DebugOverlay.GpuAisthesis.MatrixFloatCount >= 190);
        Assert.Equal(1, state.DebugOverlay.GpuAisthesis.MatrixValues[0]);
        Assert.Equal(9, state.DebugOverlay.GpuAisthesis.MatrixValues[1]);
        Assert.Equal(9, state.DebugOverlay.GpuAisthesis.MatrixValues[2]);
        Assert.Equal(81, state.DebugOverlay.GpuAisthesis.MatrixValues[3]);
        Assert.Equal(state.DebugOverlay.GpuAisthesis.Features.Count, state.DebugOverlay.GpuAisthesis.FeatureCount);
        Assert.Contains("gpu=dto", state.DebugOverlay.GpuAisthesis.Summary, StringComparison.Ordinal);
        Assert.True(state.DebugOverlay.GpuSpatialReasoning.Enabled);
        Assert.Equal(1, state.DebugOverlay.GpuSpatialReasoning.ContractVersion);
        Assert.Equal("DoomGpuSpatialReasoning", state.DebugOverlay.GpuSpatialReasoning.ContractName);
        Assert.Equal("doom.gpu.aisthesis.features", state.DebugOverlay.GpuSpatialReasoning.InputSource);
        Assert.Equal("doom.gpu.aisthesis.matrix", state.DebugOverlay.GpuSpatialReasoning.MatrixSource);
        Assert.Equal("doom.gpu.aisthesis.mask9x9", state.DebugOverlay.GpuSpatialReasoning.MaskTextureSource);
        Assert.Equal("AisthesisMask", state.DebugOverlay.GpuSpatialReasoning.MaskTexture.Kind);
        Assert.Equal("gpu-aisthesis-mask9x9", state.DebugOverlay.GpuSpatialReasoning.MaskTexture.WireName);
        Assert.Equal("mask9x9:heat,red,edge,corner", state.DebugOverlay.GpuSpatialReasoning.MaskTextureLayout);
        Assert.Equal(state.DebugOverlay.GpuAisthesis.MaskTextureTarget, state.DebugOverlay.GpuSpatialReasoning.MaskTextureSource);
        Assert.Equal(state.DebugOverlay.GpuAisthesis.MaskTexture.WireName, state.DebugOverlay.GpuSpatialReasoning.MaskTexture.WireName);
        Assert.Equal(state.DebugOverlay.GpuAisthesis.MaskTextureLayout, state.DebugOverlay.GpuSpatialReasoning.MaskTextureLayout);
        Assert.Equal("doom.gpu.spatial.reasoning", state.DebugOverlay.GpuSpatialReasoning.OutputTarget);
        Assert.Equal("runtime-summary", state.DebugOverlay.GpuSpatialReasoning.ReadbackPolicy);
        Assert.Equal("RuntimeSummary", state.DebugOverlay.GpuSpatialReasoning.Readback.Kind);
        Assert.True(state.DebugOverlay.GpuSpatialReasoning.Readback.AllowsSummary);
        Assert.False(state.DebugOverlay.GpuSpatialReasoning.Readback.AllowsFullReadback);
        Assert.Equal("spatial32", state.DebugOverlay.GpuSpatialReasoning.OutputVectorLayout.Name);
        Assert.Equal(32, state.DebugOverlay.GpuSpatialReasoning.OutputVectorLayout.Stride);
        Assert.Equal(32, state.DebugOverlay.GpuSpatialReasoning.OutputVectorLayout.MaxFloats);
        Assert.Equal(
            ["maskHeat", "maskRed", "maskEdge", "maskCorner"],
            state.DebugOverlay.GpuSpatialReasoning.OutputVectorLayout.Fields.Skip(20).Take(4));
        Assert.Contains("maskHeat", state.DebugOverlay.GpuSpatialReasoning.OutputVectorLayout.Fields);
        Assert.Contains("maskRed", state.DebugOverlay.GpuSpatialReasoning.OutputVectorLayout.Fields);
        Assert.Contains("maskEdge", state.DebugOverlay.GpuSpatialReasoning.OutputVectorLayout.Fields);
        Assert.Contains("maskCorner", state.DebugOverlay.GpuSpatialReasoning.OutputVectorLayout.Fields);
        Assert.Equal(32, state.DebugOverlay.GpuSpatialReasoning.OutputFloatCount);
        Assert.Equal(state.DebugOverlay.GpuAisthesis.MatrixCount, state.DebugOverlay.GpuSpatialReasoning.MatrixCount);
        Assert.Equal(state.DebugOverlay.GpuAisthesis.MatrixFloatCount, state.DebugOverlay.GpuSpatialReasoning.MatrixFloatCount);
        Assert.Equal(state.DebugOverlay.GpuAisthesis.FeatureCount, state.DebugOverlay.GpuSpatialReasoning.FeatureCount);
        Assert.Contains("topos-reduce", state.DebugOverlay.GpuSpatialReasoning.FeatureFlags);
        Assert.Contains("mask-texture-reduce", state.DebugOverlay.GpuSpatialReasoning.FeatureFlags);
        Assert.Contains("feat", state.DebugOverlay.GpuSpatialReasoning.Summary, StringComparison.Ordinal);
        Assert.Contains("mask9x9", state.DebugOverlay.GpuSpatialReasoning.Summary, StringComparison.Ordinal);
        Assert.Contains("spatial=dto", state.DebugOverlay.GpuSpatialReasoning.Summary, StringComparison.Ordinal);

        var canonicalHud = state.DebugOverlay.GpuHud.ToCanonicalGpuHudInput();
        Assert.True(GpuCanonicalValidation.ValidateHudInput(canonicalHud).IsValid);
        Assert.Equal(GpuFrameTargetKind.RawFramebuffer, canonicalHud.Frame.RawTarget.Kind);
        Assert.Equal(GpuFrameTargetKind.HudCompositeOffscreen, canonicalHud.Frame.HudTarget?.Kind);
        Assert.Equal(GpuCanonicalLayouts.HudPanelRect.Stride, canonicalHud.HudPanelRects.Count / state.DebugOverlay.GpuHud.RectangleCount);
        Assert.Equal(16, canonicalHud.HudPanelStateVectors.Count);
        Assert.NotEmpty(canonicalHud.Labels);

        var canonicalAisthesis = state.DebugOverlay.GpuAisthesis.ToCanonicalGpuAisthesisInput();
        Assert.True(GpuCanonicalValidation.ValidateAisthesisInput(canonicalAisthesis).IsValid);
        Assert.Equal(GpuFrameTargetKind.RawFramebuffer, canonicalAisthesis.RawFramebuffer.Kind);
        Assert.True(canonicalAisthesis.RawFramebuffer.ZeroCopy);
        Assert.True(canonicalAisthesis.Features["red-panel-detect"]);
        Assert.True(canonicalAisthesis.Features["mask9x9-texture"]);

        var canonicalSpatial = state.DebugOverlay.GpuAisthesis.ToCanonicalGpuSpatialReasoningInput();
        Assert.True(GpuCanonicalValidation.ValidateSpatialReasoningInput(canonicalSpatial).IsValid);
        Assert.Equal(4, canonicalSpatial.AisMatrices.Count);
        Assert.All(canonicalSpatial.AisMatrices, matrix => Assert.Equal(81, matrix.Count));
        Assert.Equal(16, canonicalSpatial.StateVector.Count);

        var canonicalSpatialFromSpatialDto = state.DebugOverlay.GpuSpatialReasoning.ToCanonicalGpuSpatialReasoningInput(state.DebugOverlay.GpuAisthesis);
        Assert.True(GpuCanonicalValidation.ValidateSpatialReasoningInput(canonicalSpatialFromSpatialDto).IsValid);
        Assert.Equal("doom:gpu-spatial-dto", canonicalSpatialFromSpatialDto.Frame.FrameId);

        var canonicalDiagnostics = state.DebugOverlay.GpuPathStatus.ToCanonicalFrameDiagnostics();
        Assert.True(GpuCanonicalValidation.ValidateFrameDiagnostics(canonicalDiagnostics).IsValid);
        Assert.True(canonicalDiagnostics.SensorPath.ZeroCopy);
        Assert.Equal("sensor", canonicalDiagnostics.SensorPath.PassId);
        Assert.Equal("sensor", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPassId]);
        Assert.Equal("sensor", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPathRole]);
        Assert.Equal("dto-projected", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPilotState]);
        Assert.Equal("runtime-stamp-required", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPromotionGate]);
        Assert.Equal("true", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPromotionBlocked]);
        Assert.Equal("false", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPromotionCandidateReady]);
        Assert.Equal("false", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPromotionDiagnosticStable]);
        Assert.Equal("runtime-stamp-required", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPromotionReason]);
        Assert.Equal("GPU matrix", canonicalDiagnostics.SensorPath.Metadata["doom_mode"]);
        Assert.Equal("gpu", canonicalDiagnostics.SensorPath.Metadata["doom_tone"]);
        Assert.Equal("true", canonicalDiagnostics.SensorPath.Metadata["doom_zero_copy"]);
        Assert.Equal("false", canonicalDiagnostics.SensorPath.Metadata["doom_runtime_stamped"]);
        Assert.Equal("hud", canonicalDiagnostics.HudPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPathRole]);
        Assert.Equal("GPU composite", canonicalDiagnostics.HudPath.Metadata["doom_mode"]);
        Assert.Equal(1, state.DebugOverlay.GpuPathStatus.ContractVersion);
        Assert.Equal("DoomGpuPathStatus", state.DebugOverlay.GpuPathStatus.ContractName);
        Assert.False(state.DebugOverlay.GpuPathStatus.RuntimeStamped);
        Assert.Equal(4, state.DebugOverlay.GpuPathStatus.Rows.Count);
        Assert.Equal("game=contract; bonsai=zcp; hud=gpu-contract; sensor=matrix", state.DebugOverlay.GpuPathStatus.Text);
        Assert.Equal("GPU contract | B:zcp H:panel S:matrix", state.DebugOverlay.GpuPathStatus.ShortText);
        Assert.Contains("gpu-path=dto rows4", state.DebugOverlay.GpuPathStatus.Summary, StringComparison.Ordinal);
        Assert.Contains(state.DebugOverlay.GpuPathStatus.Rows, row => row.Label == "GAME" && row.Value.Contains("RawFramebuffer:raw-framebuffer", StringComparison.Ordinal));
        Assert.Contains(state.DebugOverlay.GpuPathStatus.Rows, row => row.Label == "BONSAI" && row.ZeroCopy);
        Assert.Contains(state.DebugOverlay.GpuPathStatus.Rows, row => row.Label == "HUD" && row.Value.Contains("panel=panel16", StringComparison.Ordinal));
        Assert.Contains(state.DebugOverlay.GpuPathStatus.Rows, row => row.Label == "SENSOR" && row.Value.Contains("doom.gpu.spatial.reasoning", StringComparison.Ordinal));
        Assert.Equal("right", state.DebugOverlay.UseProbe.Direction);
        Assert.Equal(0.68f, state.DebugOverlay.UseProbe.Confidence, precision: 2);
        Assert.Equal("forward", state.SuggestedAction.Move);
        Assert.False(state.PipelineState.Kinesis.Zoe.Vetoed);
    }

    [Fact]
    public void DoomGpuPathStatus_EmptyProjection_KeepsCanonicalDiagnosticsMetadata()
    {
        var canonicalDiagnostics = DoomGpuPathStatusDto.Empty.ToCanonicalFrameDiagnostics();

        Assert.True(GpuCanonicalValidation.ValidateFrameDiagnostics(canonicalDiagnostics).IsValid);
        Assert.Equal("sensor", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPassId]);
        Assert.Equal("sensor", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPathRole]);
        Assert.Equal("unavailable", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPilotState]);
        Assert.Equal("unavailable", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPromotionGate]);
        Assert.Equal("true", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPromotionBlocked]);
        Assert.Equal("false", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPromotionCandidateReady]);
        Assert.Equal("false", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPromotionDiagnosticStable]);
        Assert.Equal("unavailable", canonicalDiagnostics.SensorPath.Metadata[GpuDiagnosticsMetadataKeys.CanonicalPromotionReason]);
        Assert.Equal("true", canonicalDiagnostics.SensorPath.Metadata["doom_missing_row"]);
        Assert.Equal("SENSOR", canonicalDiagnostics.SensorPath.Metadata["doom_label"]);
        Assert.Equal("missing-doom-gpu-path-row", canonicalDiagnostics.SensorPath.Metadata["doom_reason"]);
    }

    [Fact]
    public void DoomHudDtos_DebugOverlay_ProjectsBridgeCombatAndZoeWarnings()
    {
        var routePlan = new DoomRoutePlannerResult
        {
            CurrentRoute = "bridge-route-cruise",
            RouteMode = "post-door",
            RouteConfidence = 0.66f
        };
        var context = new DynamicPipelineContext
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 1, 42, 0, "computer-room", false, 0, 0),
            Events = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["enemyPresence"] = 0.36f,
                ["threatField"] = 0.24f
            },
            Priorities = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["logos"] = 0.38f,
                ["pathos"] = 0.42f,
                ["ethos"] = 0.20f
            },
            SelectedAxis = "pathos",
            LowHealthThreshold = 50,
            CriticalHealthThreshold = 18,
            RoutePlan = routePlan
        };
        var action = new ActionCommand(true, false, false, false, 0, false, true);
        var pipelineState = PipelineStateDto.From(context, action);

        var state = DoomAutoplayStateDto.From(
            "reach-bridge",
            "ComputerRoom",
            routePlan,
            DoomLandmarkNavigatorResult.Empty,
            pipelineState,
            action);

        Assert.Contains(state.DebugOverlay.Regions, region => region.Kind == "bridge" && region.Active);
        Assert.Contains(state.DebugOverlay.Regions, region => region.Kind == "combat" && region.Active);
        Assert.Contains(state.DebugOverlay.Regions, region => region.Kind == "zoe" && region.Active && region.Label == "ZOE WARN");
        Assert.True(state.DebugOverlay.EnemyCircle.Active);
        Assert.Equal("visual", state.DebugOverlay.EnemyCircle.Type);
        Assert.Contains(state.DebugOverlay.GpuHud.Labels, label => label.ClassName.Contains("is-enemy-circle", StringComparison.Ordinal));
        Assert.Contains(state.DebugOverlay.GpuHud.Rectangles, rect => rect.Kind == "enemy-circle" && rect.Color.Count == 3 && rect.Color[0] > 0.9f && rect.Color[1] < 0.2f);
        Assert.True(state.DebugOverlay.GpuAisthesis.EnemyDirection);
        Assert.Contains("enemy-direction", state.DebugOverlay.GpuAisthesis.Features);
        Assert.Contains(state.DebugOverlay.GpuAisthesis.Matrices, matrix => matrix.Kind == "threat9x9" && matrix.Values.Count == 81);
        Assert.False(state.PipelineState.Kinesis.Zoe.Vetoed);
        Assert.True(state.PipelineState.Kinesis.Zoe.Warning);
    }

    [Fact]
    public void DoomHudDtos_DebugOverlay_ProjectsAudioAndAvEnemyCirclesFromCanonicalState()
    {
        var routePlan = new DoomRoutePlannerResult
        {
            CurrentRoute = "computer-room-audio-enemy-orient",
            RouteMode = "post-door",
            RouteConfidence = 0.58f
        };
        var audioContext = new DynamicPipelineContext
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 1, 84, 0, "computer-room", true, 0, 0),
            SensorReadings = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["audio"] = 0.62f,
                ["audioEnemyConfidence"] = 0.62f,
                ["audioEnemyRight"] = 1
            },
            Events = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["threatField"] = 0.36f,
                ["audioEvent"] = 0.62f
            },
            RoutePlan = routePlan
        };
        var audioAction = new ActionCommand(false, false, false, false, 18, false, false);
        var audioState = DoomAutoplayStateDto.From(
            "avoid-enemy",
            "computer-room-audio-enemy-orient",
            routePlan,
            DoomLandmarkNavigatorResult.Empty,
            PipelineStateDto.From(audioContext, audioAction),
            audioAction);

        Assert.True(audioState.DebugOverlay.EnemyCircle.Active);
        Assert.Equal("audio", audioState.DebugOverlay.EnemyCircle.Type);
        Assert.Equal("right", audioState.DebugOverlay.EnemyCircle.Direction);
        Assert.Equal(0.62f, audioState.DebugOverlay.EnemyCircle.AudioConfidence, precision: 2);
        Assert.Contains(audioState.DebugOverlay.GpuHud.Rectangles, rect => rect.Kind == "enemy-circle" && rect.Color.Count == 3 && rect.Color[1] > 0.5f && rect.Color[2] < 0.2f);

        var avContext = audioContext with
        {
            SensorReadings = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["audio"] = 0.34f,
                ["audioEnemyConfidence"] = 0.34f,
                ["audioEnemyLeft"] = 1,
                ["visualEnemyConfidence"] = 0.54f
            },
            Events = new Dictionary<string, float>(StringComparer.Ordinal)
            {
                ["enemyPresence"] = 0.54f,
                ["threatField"] = 0.44f,
                ["audioEvent"] = 0.34f
            }
        };
        var avAction = new ActionCommand(false, false, false, false, -12, false, false);
        var avState = DoomAutoplayStateDto.From(
            "avoid-enemy",
            "combat-visual-center-fire",
            routePlan,
            DoomLandmarkNavigatorResult.Empty,
            PipelineStateDto.From(avContext, avAction),
            avAction);

        Assert.True(avState.DebugOverlay.EnemyCircle.Active);
        Assert.Equal("av", avState.DebugOverlay.EnemyCircle.Type);
        Assert.Equal("left", avState.DebugOverlay.EnemyCircle.Direction);
        Assert.Equal(0.54f, avState.DebugOverlay.EnemyCircle.VisualConfidence, precision: 2);
        Assert.Equal(0.34f, avState.DebugOverlay.EnemyCircle.AudioConfidence, precision: 2);
        Assert.Contains(avState.DebugOverlay.GpuHud.Rectangles, rect => rect.Kind == "enemy-circle" && rect.Color.Count == 3 && rect.Color[1] > 0.25f && rect.Color[1] < 0.45f);
    }

    [Fact]
    public void DynamicPipelineEvaluator_ProjectsExplicitEnemyAudioAndSuppressesDoorAudio()
    {
        var compilation = DynamicPipelineCompiler.Compile(AutoplayPipelineDefinition.Default);
        var evaluator = new DynamicPipelineEvaluator(compilation.Graph, _ => _ => false);
        var enemyAudio = new DynamicPipelineContext
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 1, 82, 0, "computer-room", true, 0, 0)
            {
                SensorTensor = AutoplaySensorTensor.FromChannels(
                    ("system.audio", 1.0f),
                    ("system.combat", 0.82f),
                    ("system.enabled", 1.0f))
            }
        };

        var enemyAisthesis = evaluator.RunAisthesis(enemyAudio);
        var enemyPhainesis = evaluator.RunPhainesis(enemyAisthesis);

        Assert.True(enemyAisthesis.SensorReadings["audioEnemyConfidence"] > 0.8f);
        Assert.True(enemyPhainesis.Events["audioEnemyConfidence"] > 0.8f);
        Assert.Equal(1, enemyPhainesis.Events["audioEnemyStrong"]);

        var doorAudio = enemyAudio with
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 1, 82, 0, "door", true, 0, 0)
            {
                SensorTensor = AutoplaySensorTensor.FromChannels(
                    ("system.audio", 1.0f),
                    ("semantic.door", 0.76f),
                    ("system.combat", 0.0f),
                    ("system.enabled", 1.0f))
            }
        };
        var doorAisthesis = evaluator.RunAisthesis(doorAudio);
        var doorPhainesis = evaluator.RunPhainesis(doorAisthesis);

        Assert.Equal(0, doorAisthesis.SensorReadings["audioEnemyConfidence"]);
        Assert.Equal(0, doorPhainesis.Events["audioEnemyConfidence"]);

        var terminalVisual = enemyAudio with
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 1, 82, 0, "computer-room", false, 0, 0)
            {
                SensorTensor = AutoplaySensorTensor.FromChannels(
                    ("vision.enemy", 0.44f),
                    ("semantic.computer", 0.80f),
                    ("system.combat", 0.0f),
                    ("system.enabled", 1.0f))
            }
        };
        var terminalAisthesis = evaluator.RunAisthesis(terminalVisual);
        var terminalPhainesis = evaluator.RunPhainesis(terminalAisthesis);

        Assert.True(terminalAisthesis.SensorReadings["visualEnemyConfidence"] <= 0.10f);
        Assert.True(terminalPhainesis.Events["enemyPresence"] <= 0.10f);
    }

    [Fact]
    public void DynamicPipelineAutoplayStrategy_DefaultPostDoorStages_PreferStraightBridgeAndCenteredCombat()
    {
        var strategy = new DynamicPipelineAutoplayStrategy(AutoplayOptimizationProfile.Default);
        var bridge = strategy.EvaluateTick(
            new SensorFusion([0, 0, 0, 0, 0, 0], 0.92f, 100, 0, "bridge", false, 0, 0)
            {
                SensorTensor = AutoplaySensorTensor.FromChannels(
                    ("semantic.bridge", 0.92f),
                    ("vision.open", 0.80f),
                    ("system.health", 1.0f),
                    ("system.enabled", 1.0f))
            },
            recoveryFrames: 0);

        Assert.Equal("bridge-poison-straight-lock", bridge.StageId);
        Assert.True(bridge.Action.MoveForward);
        Assert.False(bridge.Action.StrafeLeft);
        Assert.False(bridge.Action.StrafeRight);
        Assert.Equal(0, bridge.Action.TurnYaw);

        var terminalFalsePositiveTensor = AutoplaySensorTensor.FromChannels(
            ("semantic.computer", 0.80f),
            ("vision.enemy", 0.44f),
            ("system.combat", 0.0f),
            ("vision.open", 0.80f),
            ("system.health", 1.0f),
            ("system.enabled", 1.0f));
        var terminalFalsePositive = strategy.EvaluateTick(
            new SensorFusion([0, 0, 0, 0, 0, 0], 0.88f, 100, 0, "computer-room", false, 0, 0)
            {
                SensorTensor = terminalFalsePositiveTensor
            },
            recoveryFrames: 0);

        Assert.Equal("computer-room-route-cruise", terminalFalsePositive.StageId);
        Assert.True(terminalFalsePositive.Action.MoveForward);
        Assert.False(terminalFalsePositive.Action.AttackKey);
        Assert.False(terminalFalsePositive.Action.StrafeLeft);
        Assert.False(terminalFalsePositive.Action.StrafeRight);

        var terminalEvaluator = new DynamicPipelineEvaluator(
            DynamicPipelineCompiler.Compile(AutoplayPipelineDefinition.Default).Graph,
            _ => _ => false);
        var terminalFalsePositiveSensors = terminalEvaluator.RunAisthesis(new DynamicPipelineContext
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 0.88f, 100, 0, "computer-room", false, 0, 0)
            {
                SensorTensor = terminalFalsePositiveTensor
            }
        });
        Assert.Equal(1, terminalFalsePositiveSensors.SensorReadings["enemyStructuralDecoy"]);
        Assert.Equal(0, terminalFalsePositiveSensors.SensorReadings["trustedCombatEvidence"]);

        var terminalEnemyMemoryTensor = AutoplaySensorTensor.FromChannels(
            ("semantic.computer", 0.53f),
            ("vision.enemy", 0.11f),
            ("system.combat", 0.0f),
            ("vision.open", 0.80f),
            ("system.health", 1.0f),
            ("system.enabled", 1.0f));
        var terminalEnemyMemorySensors = terminalEvaluator.RunAisthesis(new DynamicPipelineContext
        {
            Sensor = new SensorFusion([0, 0, 0, 0, 0, 0], 1.0f, 100, 0, "computer-room", false, 0, 0)
            {
                EnemyConfidencePeak = 0.77f,
                SensorTensor = terminalEnemyMemoryTensor
            }
        });
        Assert.Equal(1, terminalEnemyMemorySensors.SensorReadings["enemyStructuralDecoy"]);
        Assert.True(terminalEnemyMemorySensors.SensorReadings["visualEnemyConfidence"] <= 0.10f);
        Assert.Equal(1, terminalEnemyMemorySensors.SensorReadings["postDoorEnemyMemoryEvidence"]);
        Assert.Equal(1, terminalEnemyMemorySensors.SensorReadings["trustedCombatEvidence"]);
        Assert.True(terminalEnemyMemorySensors.SensorReadings["trustedEnemyThreat"] >= 0.26f);

        var centeredEnemy = strategy.EvaluateTick(
            new SensorFusion([0, 0, 0, 0, 0, 0], 0.72f, 100, 0.04f, "computer-room", false, 0, 0)
            {
                SensorTensor = AutoplaySensorTensor.FromChannels(
                    ("semantic.computer", 0.62f),
                    ("vision.enemy", 0.58f),
                    ("system.combat", 0.76f),
                    ("system.ammo", 1.0f),
                    ("vision.open", 0.70f),
                    ("system.health", 1.0f),
                    ("system.enabled", 1.0f))
            },
            recoveryFrames: 0);

        Assert.Equal("combat-visual-center-fire", centeredEnemy.StageId);
        Assert.True(centeredEnemy.Action.MoveForward);
        Assert.True(centeredEnemy.Action.AttackKey);
        Assert.Equal(0, centeredEnemy.Action.TurnYaw);
        Assert.False(centeredEnemy.Action.StrafeLeft);
        Assert.False(centeredEnemy.Action.StrafeRight);

        var emptyAmmoCombatResidual = strategy.EvaluateTick(
            new SensorFusion([0, 0, 0, 0, 0, 0], 0.72f, 100, 0.04f, "computer-room", false, 0, 0)
            {
                SensorTensor = AutoplaySensorTensor.FromChannels(
                    ("semantic.computer", 0.62f),
                    ("vision.enemy", 0.58f),
                    ("system.combat", 0.76f),
                    ("system.ammo", 0.0f),
                    ("vision.open", 0.70f),
                    ("system.health", 1.0f),
                    ("system.enabled", 1.0f))
            },
            recoveryFrames: 0);

        Assert.Equal("computer-room-route-cruise", emptyAmmoCombatResidual.StageId);
        Assert.True(emptyAmmoCombatResidual.Action.MoveForward);
        Assert.False(emptyAmmoCombatResidual.Action.AttackKey);
    }

    [Fact]
    public void DoomKairos_PrefersLogosWhenEthosOnlySlightlyHigher()
    {
        var kairos = new DoomKairos();

        var result = kairos.Prioritize(new ToposDecisionVector
        {
            LogosVector = new Dictionary<string, float>(StringComparer.Ordinal) { ["route"] = 0.52f },
            EthosVector = new Dictionary<string, float>(StringComparer.Ordinal) { ["objective"] = 0.57f },
            PathosVector = new Dictionary<string, float>(StringComparer.Ordinal) { ["danger"] = 0.10f }
        });

        Assert.Equal("logos", result.SelectedAxis);
        Assert.Equal(0.52f, result.LogosPriority, precision: 2);
    }

    [Fact]
    public void DynamicPipelineCompiler_BuildsCanonicalFourLayerGraphFromProfileDsl()
    {
        var result = DynamicPipelineCompiler.Compile(new AutoplayPipelineDefinition
        {
            Aisthesis = new AutoplayAisthesisDefinition
            {
                Sensors = ["visual", "movement", "health"]
            },
            Noesis = new AutoplayNoesisDefinition
            {
                Phainesis = new AutoplayPhainesisDefinition
                {
                    Events =
                    [
                        new() { Event = "looming", From = "visual" },
                        new() { Event = "stuck", From = "movement" }
                    ]
                },
                Nous = new AutoplayNousDefinition
                {
                    Vectors =
                    [
                        new() { Vector = "loomingVector", From = "looming" },
                        new() { Vector = "stuckVector", From = "stuck" }
                    ]
                }
            },
            Krisis = new AutoplayKrisisDefinition
            {
                Kairos = new AutoplayKairosDefinition
                {
                    Priorities = ["pathos", "ethos", "logos"]
                }
            },
            Kinesis = new AutoplayKinesisLayerDefinition
            {
                Kinesis = new AutoplayKinesisDefinition
                {
                    Actions = ["moveForward", "turnYaw", "shoot"]
                },
                Zoe = new AutoplayZoeDefinition
                {
                    VetoRules =
                    [
                        new() { When = "hp < 10" },
                        new() { When = "lethalRisk > 0.7" }
                    ]
                }
            }
        });

        Assert.Empty(result.Diagnostics);
        Assert.True(result.Graph.IsCanonical);
        Assert.Equal(
            ["Aisthesis", "Phainesis", "Nous", "Topos", "Kairos", "Kinesis", "Zoe"],
            result.Graph.Nodes.Select(node => node.Stage.ToString()).ToArray());
        Assert.Equal(["health"], result.Graph.Nodes.Single(node => node.Stage == DynamicPipelineStageKind.Zoe).Inputs);
        Assert.Contains("pathos", result.Graph.Nodes.Single(node => node.Stage == DynamicPipelineStageKind.Kairos).Outputs);
        Assert.NotNull(typeof(DynamicPipelineEvaluator).GetMethod(nameof(DynamicPipelineEvaluator.RunAisthesis)));
        Assert.NotNull(typeof(DynamicPipelineEvaluator).GetMethod(nameof(DynamicPipelineEvaluator.RunPhainesis)));
        Assert.NotNull(typeof(DynamicPipelineEvaluator).GetMethod(nameof(DynamicPipelineEvaluator.RunNous)));
        Assert.NotNull(typeof(DynamicPipelineEvaluator).GetMethod(nameof(DynamicPipelineEvaluator.RunTopos)));
        Assert.NotNull(typeof(DynamicPipelineEvaluator).GetMethod(nameof(DynamicPipelineEvaluator.RunKairos)));
        Assert.NotNull(typeof(DynamicPipelineEvaluator).GetMethod(nameof(DynamicPipelineEvaluator.RunKinesis)));
        Assert.NotNull(typeof(DynamicPipelineEvaluator).GetMethod(nameof(DynamicPipelineEvaluator.RunZoe)));
    }

    [Fact]
    public void AutoplayPipelineDsl_SourceFiles_KeepDefinitionsSeparateFromCompilerRuntime()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var profile = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayOptimizationProfile.cs"));
        var profileJson = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayOptimizationProfileJson.cs"));
        var profileJsonParameters = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayOptimizationProfileJsonParameters.cs"));
        var profileJsonReader = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayOptimizationProfileJsonReader.cs"));
        var profileParameterCatalog = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayOptimizationProfileParameters.cs"));
        var sensorFusion = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplaySensorFusion.cs"));
        var sensorTensor = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplaySensorTensor.cs"));
        var sensorTensorIcd = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplaySensorTensorIcd.cs"));
        var actionContracts = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayActionContracts.cs"));
        var controlRuntimeAdapter = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "ControlRuntimeAdapter.cs"));
        var controlStateTensorPacket = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "ControlStateTensorPacket.cs"));
        var controlActionPacket = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "ControlActionPacket.cs"));
        var controlDecisionTracePacket = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "ControlDecisionTracePacket.cs"));
        var philosophicalPackets = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "PhilosophicalPipelinePackets.cs"));
        var philosophicalInterfaces = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "PhilosophicalPipelineInterfaces.cs"));
        var philosophicalPipeline = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "PhilosophicalAutoplayPipeline.cs"));
        var routePlanner = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "DoomRoutePlanner.cs"));
        var pipelineState = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "PipelineStateDto.cs"));
        var legacyDetAdapter = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "LegacyDetAdapter.cs"));
        var definitions = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayPipelineDsl.cs"));
        var stageDefinition = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayPipelineStageDefinition.cs"));
        var semanticDefinitions = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayPipelineSemanticDefinitions.cs"));
        var layerDefinitions = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayPipelineLayerDefinitions.cs"));
        var defaults = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayPipelineDefaults.cs"));
        var defaultStages = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayPipelineDefaultStages.cs"));
        var actionTemplates = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayPipelineActionTemplates.cs"));
        var compiler = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayPipelineDslCompiler.cs"));
        var dslValue = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayDslValue.cs"));
        var dslSyntax = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayDslExpressionSyntax.cs"));
        var dslValueComparer = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayDslValueComparer.cs"));
        var expressionCompiler = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayPipelineExpressionCompiler.cs"));
        var autoplayContextValueResolver = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayPipelineContextValueResolver.cs"));
        var dynamicContextValueResolver = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "DynamicPipelineContextValueResolver.cs"));
        var profileParameters = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayProfileParameterResolver.cs"));
        var pipelineContext = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayPipelineContext.cs"));
        var runtime = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayPipelineRuntime.cs"));
        var runtimeStrategy = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "DynamicPipelineAutoplayStrategy.cs"));
        var runtimeDecision = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayPipelineDecision.cs"));
        var runtimeStage = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "CompiledAutoplayPipelineStage.cs"));
        var ctgContracts = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayCtgContracts.cs"));
        var ctgCouncilEvaluator = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayCtgCouncilEvaluator.cs"));
        var ctgCouncilEvidence = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayCtgCouncilEvidence.cs"));
        var ctgLogosCouncil = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayCtgLogosCouncil.cs"));
        var ctgEthosCouncil = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayCtgEthosCouncil.cs"));
        var ctgPathosCouncil = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayCtgPathosCouncil.cs"));
        var ctgGovernance = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayCtgGovernance.cs"));
        var ctgGateDecisionResolver = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayCtgGateDecisionResolver.cs"));
        var ctgGateOptionsNormalizer = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "AutoplayCtgGateOptionsNormalizer.cs"));
        var parser = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "DynamicPipelineDslParser.cs"));
        var parserState = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "DynamicPipelineDslParseState.cs"));
        var statementParser = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "DynamicPipelineDslStatementParser.cs"));
        var builder = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "DynamicPipelineBuilder.cs"));
        var graphValidator = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "DynamicPipelineGraphValidator.cs"));
        var dynamicDefaults = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "DynamicPipelineDefaults.cs"));
        var dynamicLegacyAdapters = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "DynamicPipelineLegacyAdapters.cs"));
        var definitionNormalizer = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "DynamicPipelineDefinitionNormalizer.cs"));
        var dynamicCompiler = File.ReadAllText(Path.Combine(root, "src", "DoomProvider", "Autoplay", "DynamicPipelineCompiler.cs"));

        Assert.Contains("public sealed record AutoplayOptimizationProfile", profile, StringComparison.Ordinal);
        Assert.DoesNotContain("JsonSerializerOptions", profile, StringComparison.Ordinal);
        Assert.DoesNotContain("TryGetProperty(\"parameters\"", profile, StringComparison.Ordinal);
        Assert.Contains("AutoplayOptimizationProfileJson.FromJsonElement", profile, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayOptimizationProfileJson", profileJson, StringComparison.Ordinal);
        Assert.Contains("TryGetProperty(\"parameters\"", profileJson, StringComparison.Ordinal);
        Assert.Contains("AutoplayOptimizationProfileJsonParameters.Apply", profileJson, StringComparison.Ordinal);
        Assert.DoesNotContain("DoorAimToleranceDegrees = ReadInt", profileJson, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayOptimizationProfileJsonParameters", profileJsonParameters, StringComparison.Ordinal);
        Assert.Contains("DoorAimToleranceDegrees = ReadInt", profileJsonParameters, StringComparison.Ordinal);
        Assert.Contains("AutoplayOptimizationProfileJsonReader.ReadInt", profileJsonParameters, StringComparison.Ordinal);
        Assert.DoesNotContain("private static bool TryGet", profileJsonParameters, StringComparison.Ordinal);
        Assert.DoesNotContain("JsonSerializerOptions", profileJsonParameters, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayOptimizationProfileJsonReader", profileJsonReader, StringComparison.Ordinal);
        Assert.Contains("private static bool TryGet", profileJsonReader, StringComparison.Ordinal);
        Assert.Contains("public static float ReadFloat", profileJsonReader, StringComparison.Ordinal);
        Assert.DoesNotContain("DoorAimToleranceDegrees = ReadInt", profileJsonReader, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayOptimizationProfileParameters", profileParameterCatalog, StringComparison.Ordinal);
        Assert.Contains("\"doorAimToleranceDegrees\"", profileParameterCatalog, StringComparison.Ordinal);
        Assert.Contains("AutoplayOptimizationProfileParameters.ToDictionary", profile, StringComparison.Ordinal);
        Assert.Contains("public sealed record SensorFusion", sensorFusion, StringComparison.Ordinal);
        Assert.DoesNotContain("AutoplaySensorTensorIcd", sensorFusion, StringComparison.Ordinal);
        Assert.Contains("public readonly record struct AutoplaySensorTensor", sensorTensor, StringComparison.Ordinal);
        Assert.Contains("AutoplaySensorTensorIcd.SemanticScore(this, symbol)", sensorTensor, StringComparison.Ordinal);
        Assert.DoesNotContain("public static class AutoplaySensorTensorIcd", sensorTensor, StringComparison.Ordinal);
        Assert.Contains("public static class AutoplaySensorTensorIcd", sensorTensorIcd, StringComparison.Ordinal);
        Assert.Contains("public static float SemanticScore", sensorTensorIcd, StringComparison.Ordinal);
        Assert.Contains("semantic.bridge", sensorTensorIcd, StringComparison.Ordinal);
        Assert.Contains("public sealed record ActionCommand", actionContracts, StringComparison.Ordinal);
        Assert.Contains("public interface IAutoplayStrategy", actionContracts, StringComparison.Ordinal);
        Assert.DoesNotContain("AutoplaySensorTensorIcd", actionContracts, StringComparison.Ordinal);
        Assert.Contains("public interface IControlRuntimeAdapter", controlRuntimeAdapter, StringComparison.Ordinal);
        Assert.DoesNotContain("public sealed record ControlStateTensorPacket", controlRuntimeAdapter, StringComparison.Ordinal);
        Assert.Contains("public sealed record ControlStateTensorPacket", controlStateTensorPacket, StringComparison.Ordinal);
        Assert.Contains("public sealed record ControlSemanticMemoryPacket", controlStateTensorPacket, StringComparison.Ordinal);
        Assert.Contains("SemanticScore(string symbol)", controlStateTensorPacket, StringComparison.Ordinal);
        Assert.DoesNotContain("public sealed record ControlActionPacket", controlStateTensorPacket, StringComparison.Ordinal);
        Assert.Contains("public sealed record ControlActionPacket", controlActionPacket, StringComparison.Ordinal);
        Assert.Contains("ControlDecisionTracePacket DecisionTrace", controlActionPacket, StringComparison.Ordinal);
        Assert.Contains("public sealed record ControlDecisionTracePacket", controlDecisionTracePacket, StringComparison.Ordinal);
        Assert.Contains("public sealed record ControlStageEvaluationPacket", controlDecisionTracePacket, StringComparison.Ordinal);
        Assert.Contains("public sealed record SensorFrame", philosophicalPackets, StringComparison.Ordinal);
        Assert.Contains("public sealed record ZoeAuditResult", philosophicalPackets, StringComparison.Ordinal);
        Assert.DoesNotContain("public interface IPhainesis", philosophicalPackets, StringComparison.Ordinal);
        Assert.Contains("public interface IPhainesis", philosophicalInterfaces, StringComparison.Ordinal);
        Assert.Contains("public interface IZoe", philosophicalInterfaces, StringComparison.Ordinal);
        Assert.DoesNotContain("public sealed class PhilosophicalAutoplayPipeline", philosophicalInterfaces, StringComparison.Ordinal);
        Assert.Contains("public sealed class PhilosophicalAutoplayPipeline", philosophicalPipeline, StringComparison.Ordinal);
        Assert.Contains("zoe.Audit(action, frame.Health)", philosophicalPipeline, StringComparison.Ordinal);
        Assert.Contains("public sealed class DoomRoutePlanner", routePlanner, StringComparison.Ordinal);
        Assert.Contains("public sealed record DoomRouteLoopBudgetInput", routePlanner, StringComparison.Ordinal);
        Assert.Contains("public sealed record DoomRouteLoopBudgetResult", routePlanner, StringComparison.Ordinal);
        Assert.Contains("public sealed class DoomRouteLoopBudgetEvaluator", routePlanner, StringComparison.Ordinal);
        Assert.Contains("RouteRecoverBudget", routePlanner, StringComparison.Ordinal);
        Assert.Contains("public sealed class DoomLandmarkNavigator", routePlanner, StringComparison.Ordinal);
        Assert.Contains("public sealed record PipelineStateDto", pipelineState, StringComparison.Ordinal);
        Assert.Contains("public sealed record PriorityAxisDto", pipelineState, StringComparison.Ordinal);
        Assert.Contains("public interface ILegacyDetAdapter", legacyDetAdapter, StringComparison.Ordinal);
        Assert.Contains("Obsolete", legacyDetAdapter, StringComparison.Ordinal);
        Assert.Contains("public sealed partial record AutoplayPipelineDefinition", definitions, StringComparison.Ordinal);
        Assert.DoesNotContain("public sealed record AutoplayPipelineStageDefinition", definitions, StringComparison.Ordinal);
        Assert.DoesNotContain("public sealed record AutoplayZoeVetoDefinition", definitions, StringComparison.Ordinal);
        Assert.Contains("public sealed record AutoplayPipelineStageDefinition", stageDefinition, StringComparison.Ordinal);
        Assert.Contains("public sealed record AutoplaySemanticSymbolDefinition", semanticDefinitions, StringComparison.Ordinal);
        Assert.Contains("public sealed record AutoplayArbitrationDefinition", semanticDefinitions, StringComparison.Ordinal);
        Assert.Contains("public sealed record AutoplayAisthesisDefinition", layerDefinitions, StringComparison.Ordinal);
        Assert.Contains("public sealed record AutoplayZoeVetoDefinition", layerDefinitions, StringComparison.Ordinal);
        Assert.DoesNotContain("public sealed partial record AutoplayPipelineDefinition", stageDefinition, StringComparison.Ordinal);
        Assert.DoesNotContain("public sealed partial record AutoplayPipelineDefinition", semanticDefinitions, StringComparison.Ordinal);
        Assert.DoesNotContain("public sealed partial record AutoplayPipelineDefinition", layerDefinitions, StringComparison.Ordinal);
        Assert.DoesNotContain("public static AutoplayPipelineDefinition Default", definitions, StringComparison.Ordinal);
        Assert.DoesNotContain("DoorProbeAction", definitions, StringComparison.Ordinal);
        Assert.Contains("public static AutoplayPipelineDefinition Default", defaults, StringComparison.Ordinal);
        Assert.Contains("AutoplayPipelineDefaultStages.Create()", defaults, StringComparison.Ordinal);
        Assert.DoesNotContain("AutoplayPipelineActionTemplates.DoorProbe", defaults, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayPipelineDefaultStages", defaultStages, StringComparison.Ordinal);
        Assert.Contains("AutoplayPipelineActionTemplates.DoorProbe", defaultStages, StringComparison.Ordinal);
        Assert.Contains("\"bridge-route-cruise\"", defaultStages, StringComparison.Ordinal);
        Assert.DoesNotContain("DoorProbeAction", defaults, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayPipelineActionTemplates", actionTemplates, StringComparison.Ordinal);
        Assert.Contains("public static Dictionary<string, string> DoorProbe", actionTemplates, StringComparison.Ordinal);
        Assert.DoesNotContain("public static AutoplayPipelineDefinition Default", actionTemplates, StringComparison.Ordinal);
        Assert.DoesNotContain("public static class AutoplayPipelineDslCompiler", definitions, StringComparison.Ordinal);
        Assert.DoesNotContain("internal sealed class AutoplayPipelineContext", definitions, StringComparison.Ordinal);
        Assert.Contains("public static class AutoplayPipelineDslCompiler", compiler, StringComparison.Ordinal);
        Assert.DoesNotContain("public sealed class DynamicPipelineAutoplayStrategy", compiler, StringComparison.Ordinal);
        Assert.DoesNotContain("internal sealed class AutoplayPipelineContext", compiler, StringComparison.Ordinal);
        Assert.Contains("public sealed class CompiledAutoplayPipeline", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("public sealed class DynamicPipelineAutoplayStrategy", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("public sealed record AutoplayPipelineDecision", runtime, StringComparison.Ordinal);
        Assert.DoesNotContain("internal sealed record CompiledAutoplayPipelineStage", runtime, StringComparison.Ordinal);
        Assert.Contains("public sealed class DynamicPipelineAutoplayStrategy", runtimeStrategy, StringComparison.Ordinal);
        Assert.Contains("CompiledAutoplayPipeline _pipeline", runtimeStrategy, StringComparison.Ordinal);
        Assert.Contains("public sealed record AutoplayPipelineDecision", runtimeDecision, StringComparison.Ordinal);
        Assert.Contains("public sealed record AutoplayPipelineStageEvaluation", runtimeDecision, StringComparison.Ordinal);
        Assert.Contains("internal sealed record CompiledAutoplayPipelineStage", runtimeStage, StringComparison.Ordinal);
        Assert.Contains("AutoplayPipelineStageEvaluation Evaluate", runtimeStage, StringComparison.Ordinal);
        Assert.DoesNotContain("internal sealed class AutoplayPipelineContext", runtime, StringComparison.Ordinal);
        Assert.Contains("internal sealed class AutoplayPipelineContext", pipelineContext, StringComparison.Ordinal);
        Assert.Contains("SensorFusion sensor", pipelineContext, StringComparison.Ordinal);
        Assert.Contains("SemanticScore(string symbol)", pipelineContext, StringComparison.Ordinal);
        Assert.Contains("SemanticScore(\"computer-room\") >= 0.5f", pipelineContext, StringComparison.Ordinal);
        Assert.Contains("SemanticScore(\"bridge\") >= 0.5f", pipelineContext, StringComparison.Ordinal);
        Assert.Contains("SemanticScore(\"central-hall\") >= 0.5f", pipelineContext, StringComparison.Ordinal);
        Assert.DoesNotContain("Sensor.SensorTensor.SemanticScore(\"computer-room\") > 0.2f", pipelineContext, StringComparison.Ordinal);
        Assert.Contains("AutoplayPipelineExpressionCompiler.CompileBooleanExpression", compiler, StringComparison.Ordinal);
        Assert.DoesNotContain("private static bool Compare", compiler, StringComparison.Ordinal);
        Assert.DoesNotContain("private static AutoplayDslValue ResolveValue", compiler, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayPipelineExpressionCompiler", expressionCompiler, StringComparison.Ordinal);
        Assert.DoesNotContain("AutoplayProfileParameterResolver.Resolve", expressionCompiler, StringComparison.Ordinal);
        Assert.DoesNotContain("context.Sensor.Health", expressionCompiler, StringComparison.Ordinal);
        Assert.Contains("AutoplayDslExpressionSyntax.TryReadComparison", expressionCompiler, StringComparison.Ordinal);
        Assert.Contains("AutoplayDslValueComparer.Compare", expressionCompiler, StringComparison.Ordinal);
        Assert.Contains("AutoplayPipelineContextValueResolver.Resolve", expressionCompiler, StringComparison.Ordinal);
        Assert.Contains("DynamicPipelineContextValueResolver.Resolve", expressionCompiler, StringComparison.Ordinal);
        Assert.DoesNotContain("private static bool Compare", expressionCompiler, StringComparison.Ordinal);
        Assert.DoesNotContain("private static AutoplayDslValue ResolveValue", expressionCompiler, StringComparison.Ordinal);
        Assert.DoesNotContain("Split(\"||\"", expressionCompiler, StringComparison.Ordinal);
        Assert.DoesNotContain("\"doorAimToleranceDegrees\" =>", expressionCompiler, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayPipelineContextValueResolver", autoplayContextValueResolver, StringComparison.Ordinal);
        Assert.Contains("AutoplayProfileParameterResolver.Resolve", autoplayContextValueResolver, StringComparison.Ordinal);
        Assert.Contains("context.Sensor.Health", autoplayContextValueResolver, StringComparison.Ordinal);
        Assert.Contains("internal static class DynamicPipelineContextValueResolver", dynamicContextValueResolver, StringComparison.Ordinal);
        Assert.Contains("lethalrisk", dynamicContextValueResolver, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayDslExpressionSyntax", dslSyntax, StringComparison.Ordinal);
        Assert.Contains("ComparisonOperators", dslSyntax, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayDslValueComparer", dslValueComparer, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayProfileParameterResolver", profileParameters, StringComparison.Ordinal);
        Assert.DoesNotContain("\"doorAimToleranceDegrees\" =>", profileParameters, StringComparison.Ordinal);
        Assert.Contains("AutoplayOptimizationProfileParameters.TryGetValue", profileParameters, StringComparison.Ordinal);
        Assert.DoesNotContain("internal readonly record struct AutoplayDslValue", expressionCompiler, StringComparison.Ordinal);
        Assert.Contains("internal readonly record struct AutoplayDslValue", dslValue, StringComparison.Ordinal);
        Assert.Contains("public sealed record CtgProposalPacket", ctgContracts, StringComparison.Ordinal);
        Assert.DoesNotContain("public sealed record CtgProposalPacket", ctgGovernance, StringComparison.Ordinal);
        Assert.Contains("public static class AutoplayCtgGate", ctgGovernance, StringComparison.Ordinal);
        Assert.Contains("AutoplayCtgCouncilEvaluator.Evaluate", ctgGovernance, StringComparison.Ordinal);
        Assert.Contains("AutoplayCtgGateDecisionResolver.Resolve", ctgGovernance, StringComparison.Ordinal);
        Assert.Contains("AutoplayCtgGateOptionsNormalizer.Normalize", ctgGovernance, StringComparison.Ordinal);
        Assert.DoesNotContain("EvaluateLogos", ctgGovernance, StringComparison.Ordinal);
        Assert.DoesNotContain("ApplyDecision", ctgGovernance, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayCtgCouncilEvaluator", ctgCouncilEvaluator, StringComparison.Ordinal);
        Assert.Contains("AutoplayCtgLogosCouncil.Evaluate", ctgCouncilEvaluator, StringComparison.Ordinal);
        Assert.Contains("AutoplayCtgEthosCouncil.Evaluate", ctgCouncilEvaluator, StringComparison.Ordinal);
        Assert.Contains("AutoplayCtgPathosCouncil.Evaluate", ctgCouncilEvaluator, StringComparison.Ordinal);
        Assert.DoesNotContain("EvaluateLogos", ctgCouncilEvaluator, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayCtgCouncilEvidence", ctgCouncilEvidence, StringComparison.Ordinal);
        Assert.Contains("public static float Score", ctgCouncilEvidence, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayCtgLogosCouncil", ctgLogosCouncil, StringComparison.Ordinal);
        Assert.Contains("objective-action-aligned", ctgLogosCouncil, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayCtgEthosCouncil", ctgEthosCouncil, StringComparison.Ordinal);
        Assert.Contains("safety-contract-satisfied", ctgEthosCouncil, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayCtgPathosCouncil", ctgPathosCouncil, StringComparison.Ordinal);
        Assert.Contains("danger-forward-repulsion", ctgPathosCouncil, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayCtgGateDecisionResolver", ctgGateDecisionResolver, StringComparison.Ordinal);
        Assert.Contains("ApplyDecision", ctgGateDecisionResolver, StringComparison.Ordinal);
        Assert.Contains("unknown-fail-closed", ctgGateDecisionResolver, StringComparison.Ordinal);
        Assert.Contains("internal static class AutoplayCtgGateOptionsNormalizer", ctgGateOptionsNormalizer, StringComparison.Ordinal);
        Assert.Contains("Math.Clamp", ctgGateOptionsNormalizer, StringComparison.Ordinal);
        Assert.Contains("public static class DynamicPipelineDslParser", parser, StringComparison.Ordinal);
        Assert.Contains("DynamicPipelineDslStatementParser.Parse", parser, StringComparison.Ordinal);
        Assert.DoesNotContain("parts is [\"event\"", parser, StringComparison.Ordinal);
        Assert.Contains("internal sealed class DynamicPipelineDslParseState", parserState, StringComparison.Ordinal);
        Assert.Contains("AutoplayPipelineDefinition ToDefinition", parserState, StringComparison.Ordinal);
        Assert.Contains("internal static class DynamicPipelineDslStatementParser", statementParser, StringComparison.Ordinal);
        Assert.Contains("parts is [\"event\"", statementParser, StringComparison.Ordinal);
        Assert.Contains("DynamicPipelineGraphValidator.Validate", builder, StringComparison.Ordinal);
        Assert.DoesNotContain("UsesHealthOnly", builder, StringComparison.Ordinal);
        Assert.Contains("internal static class DynamicPipelineGraphValidator", graphValidator, StringComparison.Ordinal);
        Assert.Contains("Zoe veto", graphValidator, StringComparison.Ordinal);
        Assert.Contains("DynamicPipelineDefinitionNormalizer.Normalize", dynamicCompiler, StringComparison.Ordinal);
        Assert.DoesNotContain("DefaultSensors", dynamicCompiler, StringComparison.Ordinal);
        Assert.DoesNotContain("MapLegacyBehavior", dynamicCompiler, StringComparison.Ordinal);
        Assert.Contains("internal static class DynamicPipelineDefinitionNormalizer", definitionNormalizer, StringComparison.Ordinal);
        Assert.DoesNotContain("DefaultSensors", definitionNormalizer, StringComparison.Ordinal);
        Assert.DoesNotContain("MapLegacyBehavior", definitionNormalizer, StringComparison.Ordinal);
        Assert.Contains("DynamicPipelineDefaults.Sensors", definitionNormalizer, StringComparison.Ordinal);
        Assert.Contains("DynamicPipelineLegacyAdapters.ApplyDetect", definitionNormalizer, StringComparison.Ordinal);
        Assert.Contains("internal static class DynamicPipelineDefaults", dynamicDefaults, StringComparison.Ordinal);
        Assert.Contains("public static readonly string[] Sensors", dynamicDefaults, StringComparison.Ordinal);
        Assert.Contains("public static readonly ZoeVetoRule[] ZoeVetoRules", dynamicDefaults, StringComparison.Ordinal);
        Assert.Contains("internal static class DynamicPipelineLegacyAdapters", dynamicLegacyAdapters, StringComparison.Ordinal);
        Assert.Contains("MapLegacyBehavior", dynamicLegacyAdapters, StringComparison.Ordinal);
        Assert.DoesNotContain("source.Split", dynamicCompiler, StringComparison.Ordinal);
    }

    [Fact]
    public void DynamicPipelineDslParser_ReadsExplicitFourLayerBlockStructure()
    {
        var result = DynamicPipelineCompiler.CompileScript("""
            aisthesis {
              sensor visual
              sensor movement
              sensor health
            }
            noesis {
              phainesis {
                event looming from visual
                event stuck from movement
              }
              nous {
                vector loomingVector from looming
                vector stuckVector from stuck
              }
            }
            krisis {
              topos {
                vectors LogosVector PathosVector EthosVector ToposDecisionVector
              }
              kairos {
                priority pathos
                priority ethos
                priority logos
              }
            }
            kinesis {
              kinesis {
                action moveForward
                action turnYaw
              }
              zoe {
                veto when hp < 10
              }
            }
            """);

        Assert.Empty(result.Diagnostics);
        Assert.Equal(["moveForward", "turnYaw"], result.Ast.Kinesis.Motion.Actions);
        Assert.Equal(
            ["LogosVector", "PathosVector", "EthosVector", "ToposDecisionVector"],
            result.Ast.Krisis.Topos.Vectors);
        Assert.Equal(["health"], result.Graph.Nodes.Single(node => node.Stage == DynamicPipelineStageKind.Zoe).Inputs);
    }

    [Fact]
    public void DynamicPipelineCompiler_BlockDslRejectsWrongOrderAndUndefinedEvents()
    {
        var result = DynamicPipelineCompiler.CompileScript("""
            noesis {
              phainesis {
                event looming from visual
              }
              nous {
                vector enemyVector from enemySeen
              }
            }
            aisthesis {
              sensor visual
            }
            krisis {
              kairos {
                priority avoid
              }
            }
            kinesis {
              zoe {
                veto when hp < 10
              }
            }
            """);

        Assert.Contains(result.Diagnostics, diagnostic => diagnostic.Contains("Top-level block order", StringComparison.Ordinal));
        Assert.Contains(result.Diagnostics, diagnostic => diagnostic.Contains("Undefined Phainesis event 'enemySeen'", StringComparison.Ordinal));
        Assert.Contains(result.Diagnostics, diagnostic => diagnostic.Contains("Invalid Kairos priority axis 'avoid'", StringComparison.Ordinal));
    }

    [Fact]
    public void DynamicPipelineCompiler_AdaptsDeprecatedDetectHodosAndBehaviorBlocks()
    {
#pragma warning disable CS0618
        var result = DynamicPipelineCompiler.Compile(new AutoplayPipelineDefinition
        {
            Detect = [new() { Event = "enemySeen", From = "visual" }],
            Hodos = [new() { Vector = "route", From = "enemySeen" }],
            Behavior = ["avoid"],
            Kinesis = new AutoplayKinesisLayerDefinition
            {
                Zoe = new AutoplayZoeDefinition
                {
                    VetoRules = [new() { When = "hp < 10" }]
                }
            }
        });
#pragma warning restore CS0618

        Assert.Empty(result.Diagnostics);
        Assert.Contains(result.DeprecationWarnings, warning => warning.Contains("detect", StringComparison.Ordinal));
        Assert.Contains(result.DeprecationWarnings, warning => warning.Contains("hodos", StringComparison.Ordinal));
        Assert.Contains(result.DeprecationWarnings, warning => warning.Contains("behavior", StringComparison.Ordinal));
        Assert.Contains("pathos", result.Ast.Krisis.Kairos.Priorities);
    }

    [Fact]
    public void DynamicPipelineAutoplayStrategy_CustomDsl_ExecutesCompiledStage()
    {
        var profile = AutoplayOptimizationProfile.Default with
        {
            Pipeline = new AutoplayPipelineDefinition
            {
                Name = "TestPipeline",
                Stages =
                [
                    new AutoplayPipelineStageDefinition
                    {
                        Id = "always-back",
                        Priority = 1,
                        When = "true",
                        Action = new Dictionary<string, string>(StringComparer.Ordinal)
                        {
                            ["moveBackward"] = "true",
                            ["turnYaw"] = "$wallAwayYawDegrees"
                        }
                    }
                ]
            }
        };

        var strategy = new DynamicPipelineAutoplayStrategy(profile);
        var action = strategy.ExecuteTick(
            new SensorFusion([0.3f, 0.3f, 0.3f, 0.3f, 0.3f, 0.3f], 0.9f, 100, 0, "corridor", false, 0, 0),
            recoveryFrames: 0);

        Assert.Equal("TestPipeline", strategy.StrategyName);
        Assert.True(action.MoveBackward);
        Assert.Equal(profile.WallAwayYawDegrees, action.TurnYaw);
    }

    [Fact]
    public void DynamicPipelineAutoplayStrategy_ZoeVetoOverridesKinesisAction()
    {
        var profile = AutoplayOptimizationProfile.Default with
        {
            Pipeline = new AutoplayPipelineDefinition
            {
                Name = "ZoeVetoPipeline",
                Kinesis = new AutoplayKinesisLayerDefinition
                {
                    Zoe = new AutoplayZoeDefinition
                    {
                        VetoRules = [new() { When = "hp < 10" }]
                    }
                },
                Stages =
                [
                    new AutoplayPipelineStageDefinition
                    {
                        Id = "unsafe-forward",
                        Priority = 1,
                        When = "true",
                        Action = new Dictionary<string, string>(StringComparer.Ordinal)
                        {
                            ["moveForward"] = "true",
                            ["attackKey"] = "true"
                        }
                    }
                ]
            }
        };

        var strategy = new DynamicPipelineAutoplayStrategy(profile);
        var decision = strategy.EvaluateTick(
            new SensorFusion([0.2f, 0.2f, 0.2f, 0.2f, 0.2f, 0.2f], 0.9f, 5, 0, "open-space", false, 0, 0),
            recoveryFrames: 0);

        Assert.True(decision.ZoeVetoed);
        Assert.Equal("zoe-veto:hp < 10", decision.SvcEvent);
        Assert.False(decision.Action.MoveForward);
        Assert.False(decision.Action.AttackKey);
    }

    [Fact]
    public void DynamicPipelineAutoplayStrategy_TensorEvidence_DrivesStageArbitration()
    {
        var profile = AutoplayOptimizationProfile.Default with
        {
            Pipeline = new AutoplayPipelineDefinition
            {
                Name = "TensorBackedPipeline",
                SemanticMemory =
                [
                    new() { Id = "bridge", Kind = "route" },
                    new() { Id = "safe-zone", Kind = "safety" }
                ],
                Stages =
                [
                    new AutoplayPipelineStageDefinition
                    {
                        Id = "bridge-stage",
                        Objective = "reach-bridge",
                        Priority = 10,
                        Threshold = 0.8f,
                        Evidence = new Dictionary<string, float>(StringComparer.Ordinal)
                        {
                            ["bridge"] = 1
                        },
                        When = "true",
                        Action = new Dictionary<string, string>(StringComparer.Ordinal)
                        {
                            ["moveForward"] = "true"
                        }
                    },
                    new AutoplayPipelineStageDefinition
                    {
                        Id = "fallback-stage",
                        Objective = "open-door",
                        Priority = 0,
                        When = "true",
                        Action = new Dictionary<string, string>(StringComparer.Ordinal)
                        {
                            ["moveBackward"] = "true"
                        }
                    }
                ]
            }
        };

        var strategy = new DynamicPipelineAutoplayStrategy(profile);
        var decision = strategy.EvaluateTick(
            new SensorFusion([0.1f, 0.1f, 0.1f, 0.1f, 0.1f, 0.1f], 0.9f, 100, 0, "open-space", false, 0, 0)
            {
                SensorTensor = AutoplaySensorTensor.FromChannels(("semantic.bridge", 0.92f))
            },
            recoveryFrames: 0);

        Assert.Equal("bridge-stage", decision.StageId);
        Assert.Equal("reach-bridge", decision.Objective);
        Assert.True(decision.Action.MoveForward);
        Assert.False(decision.Action.MoveBackward);
        Assert.True(decision.SemanticScores["bridge"] >= 0.9f);
    }

    [Fact]
    public void DynamicPipelineAutoplayStrategy_EvidenceThreshold_DeterministicallyArbitratesStages()
    {
        var profile = AutoplayOptimizationProfile.Default with
        {
            Pipeline = new AutoplayPipelineDefinition
            {
                Name = "ArbitratedPipeline",
                Stages =
                [
                    new AutoplayPipelineStageDefinition
                    {
                        Id = "door-stage",
                        Objective = "open-door",
                        Priority = 10,
                        Threshold = 0.8f,
                        Evidence = new Dictionary<string, float>(StringComparer.Ordinal)
                        {
                            ["door"] = 1
                        },
                        When = "true",
                        Action = new Dictionary<string, string>(StringComparer.Ordinal)
                        {
                            ["moveForward"] = "true"
                        }
                    },
                    new AutoplayPipelineStageDefinition
                    {
                        Id = "fallback-stage",
                        Objective = "advance-route",
                        Priority = 0,
                        When = "true",
                        Action = new Dictionary<string, string>(StringComparer.Ordinal)
                        {
                            ["moveBackward"] = "true"
                        }
                    }
                ]
            }
        };

        var strategy = new DynamicPipelineAutoplayStrategy(profile);
        var fallbackAction = strategy.ExecuteTick(
            new SensorFusion([0.1f, 0.1f, 0.1f, 0.1f, 0.1f, 0.1f], 0.95f, 100, 0, "open-space", false, 0, 0),
            recoveryFrames: 0);
        var doorAction = strategy.ExecuteTick(
            new SensorFusion([0.6f, 0.7f, 0.8f, 0.4f, 0.4f, 0.4f], 0.32f, 100, 0, "wall", false, 0, 0),
            recoveryFrames: 0);

        Assert.True(fallbackAction.MoveBackward);
        Assert.False(fallbackAction.MoveForward);
        Assert.True(doorAction.MoveForward);
        Assert.False(doorAction.MoveBackward);
    }

    [Fact]
    public void DynamicPipelineAutoplayStrategy_EvaluateTick_ReportsDeterministicDecisionTrace()
    {
        var profile = AutoplayOptimizationProfile.Default with
        {
            Pipeline = new AutoplayPipelineDefinition
            {
                Name = "TraceablePipeline",
                SemanticMemory =
                [
                    new() { Id = "door", Kind = "navigation-target" },
                    new() { Id = "enemy", Kind = "threat" },
                    new() { Id = "safe-zone", Kind = "safety" }
                ],
                Stages =
                [
                    new AutoplayPipelineStageDefinition
                    {
                        Id = "enemy-stage",
                        Objective = "avoid-enemy",
                        Priority = 20,
                        Threshold = 0.7f,
                        Evidence = new Dictionary<string, float>(StringComparer.Ordinal)
                        {
                            ["enemy"] = 1
                        },
                        When = "true",
                        Action = new Dictionary<string, string>(StringComparer.Ordinal)
                        {
                            ["attackKey"] = "true"
                        }
                    },
                    new AutoplayPipelineStageDefinition
                    {
                        Id = "door-stage",
                        Objective = "open-door",
                        Priority = 10,
                        Threshold = 0.7f,
                        Evidence = new Dictionary<string, float>(StringComparer.Ordinal)
                        {
                            ["door"] = 1
                        },
                        When = "context == wall",
                        Action = new Dictionary<string, string>(StringComparer.Ordinal)
                        {
                            ["useKey"] = "true"
                        }
                    }
                ]
            }
        };

        var strategy = new DynamicPipelineAutoplayStrategy(profile);
        var decision = strategy.EvaluateTick(
            new SensorFusion([0.7f, 0.7f, 0.7f, 0.1f, 0.1f, 0.1f], 0.30f, 100, 0, "wall", false, 18, 0),
            recoveryFrames: 0);

        Assert.Equal("TraceablePipeline", decision.StrategyName);
        Assert.Equal("door-stage", decision.StageId);
        Assert.Equal("open-door", decision.Objective);
        Assert.True(decision.Action.UseKey);
        Assert.False(decision.Action.AttackKey);
        Assert.True(decision.SemanticScores["door"] >= 0.99f);
        Assert.Equal(0, decision.SemanticScores["enemy"]);
        Assert.Contains(decision.StageEvaluations, stage => stage.StageId == "enemy-stage" && !stage.EvidenceMatched);
        Assert.Contains(decision.StageEvaluations, stage => stage.StageId == "door-stage" && stage.Selected);
    }

    [Fact]
    public void DynamicPipelineAutoplayStrategy_EvaluateTick_ProjectsCanonicalPipelineState()
    {
        var profile = AutoplayOptimizationProfile.Default with
        {
            Pipeline = new AutoplayPipelineDefinition
            {
                Name = "PipelineStateProjection",
                SemanticMemory =
                [
                    new() { Id = "door", Kind = "navigation-target" },
                    new() { Id = "corridor", Kind = "route" }
                ],
                Stages =
                [
                    new AutoplayPipelineStageDefinition
                    {
                        Id = "first-door-approach",
                        Objective = "open-door",
                        Priority = 10,
                        Threshold = 0.2f,
                        Evidence = new Dictionary<string, float>(StringComparer.Ordinal)
                        {
                            ["door"] = 1
                        },
                        When = "true",
                        Action = new Dictionary<string, string>(StringComparer.Ordinal)
                        {
                            ["moveForward"] = "true"
                        }
                    }
                ]
            }
        };

        var strategy = new DynamicPipelineAutoplayStrategy(profile);
        var decision = strategy.EvaluateTick(
            new SensorFusion([0.2f, 0.3f, 0.4f, 0.2f, 0.2f, 0.2f], 0.55f, 100, 0, "corridor", false, 0, 4)
            {
                SensorTensor = AutoplaySensorTensor.FromChannels(
                    ("vision.target", 0.42f),
                    ("vision.open", 0.36f),
                    ("motion.forward", 0.32f),
                    ("motion.entrance", 0.18f),
                    ("semantic.door", 0.20f),
                    ("semantic.corridor", 0.36f),
                    ("system.enabled", 1))
            },
            recoveryFrames: 0);

        Assert.True(decision.PipelineState.Aisthesis.RoutePlan.FirstDoorRouteEvidenceReady);
        Assert.Equal("door-approach", decision.PipelineState.Aisthesis.RoutePlan.RouteMode);
        Assert.NotEmpty(decision.PipelineState.Aisthesis.SensorReadings);
        Assert.NotEmpty(decision.PipelineState.Noesis.PhainesisEvents);
        Assert.NotEmpty(decision.PipelineState.Noesis.NousVectors);
        Assert.NotEmpty(decision.PipelineState.Krisis.ToposVectors);
        Assert.NotEqual("none", decision.PipelineState.Krisis.Kairos.SelectedAxis);
        Assert.Equal("FirstDoor", decision.GoalState.Telos);
        Assert.NotEmpty(decision.DebugOverlay.Grid);
        Assert.Equal(decision.PipelineState, decision.AutoplayState.PipelineState);
        Assert.Equal(decision.GoalState, decision.AutoplayState.GoalState);
        Assert.Equal(decision.DebugOverlay, decision.AutoplayState.DebugOverlay);
        Assert.Equal("open-door", decision.Objective);
    }

    [Fact]
    public void DynamicPipelineAutoplayStrategy_ZoeRules_UseEvaluatedKairosContext()
    {
        var compilation = DynamicPipelineCompiler.Compile(AutoplayPipelineDefinition.Default);
        var evaluator = new DynamicPipelineEvaluator(compilation.Graph, AutoplayPipelineDslCompiler.CompileDynamicPredicate);
        var context = new DynamicPipelineContext
        {
            Sensor = new SensorFusion([0.7f, 0.7f, 0.7f, 0.1f, 0.1f, 0.1f], 0.55f, 100, 0, "corridor", false, 0, 0)
            {
                SensorTensor = AutoplaySensorTensor.FromChannels(
                    ("vision.enemy", 0.92f),
                    ("semantic.mapenemy", 0.92f),
                    ("system.combat", 0.88f),
                    ("system.enabled", 1))
            }
        };
        var proposed = new ActionCommand(false, false, false, false, 0, false, true);
        var result = evaluator.Evaluate(context, proposed, [new ZoeVetoRule("selectedAxis == 'pathos'")]);

        Assert.Equal("pathos", result.Context.SelectedAxis);
        Assert.True(result.ZoeVetoed);
        Assert.Equal("zoe-veto:selectedAxis == 'pathos'", result.SvcEvent);
        Assert.False(result.Action.AttackKey);
    }

    [Fact]
    public void AutoplayCtgGate_EthosRejectVetoesAndEnforcedGateStopsAction()
    {
        var action = new ActionCommand(false, false, false, false, 0, false, true);
        var proposal = CreateProposal(action, new Dictionary<string, float>(StringComparer.Ordinal)
        {
            ["enemy"] = 0.05f,
            ["safe-zone"] = 0.8f
        });

        var trace = AutoplayCtgGate.Evaluate(proposal, new CtgGateOptions(EnforceGate: true, TraceOnly: false));

        Assert.True(trace.GateDecision.GateExecuted);
        Assert.Equal(CtgGateDecisionKind.Deny, trace.GateDecision.Decision);
        Assert.Equal("ethos-veto", trace.GateDecision.ReasonCode);
        Assert.True(trace.GateDecision.ActionChangedByGate);
        Assert.False(trace.AppliedAction.AttackKey);
        Assert.Contains(trace.CouncilDecisionTrace, vote => vote.Council == "Ethos" && vote.Vote == CtgCouncilVote.Reject);
    }

    [Fact]
    public void AutoplayCtgGate_UnknownAbstentionsFailClosedWithoutTraceOnlyActionChange()
    {
        var action = new ActionCommand(false, false, false, false, 0, true, false);
        var proposal = CreateProposal(action, new Dictionary<string, float>(StringComparer.Ordinal)
        {
            ["door"] = 0.1f,
            ["corridor"] = 0.1f,
            ["enemy"] = 0.5f,
            ["safe-zone"] = 0.1f
        });

        var trace = AutoplayCtgGate.Evaluate(proposal);

        Assert.Equal(CtgGateDecisionKind.Deny, trace.GateDecision.Decision);
        Assert.Equal("unknown-fail-closed", trace.GateDecision.ReasonCode);
        Assert.True(trace.GateDecision.TraceOnly);
        Assert.False(trace.GateDecision.ActionChangedByGate);
        Assert.True(trace.AppliedAction.UseKey);
    }

    [Fact]
    public void AutoplayCtgGate_TwoOfThreeQuorumAllowsAction()
    {
        var action = new ActionCommand(true, false, false, false, 0, false, false);
        var proposal = CreateProposal(action, new Dictionary<string, float>(StringComparer.Ordinal)
        {
            ["door"] = 0.7f,
            ["corridor"] = 0.7f,
            ["enemy"] = 0.05f,
            ["safe-zone"] = 0.8f
        });

        var trace = AutoplayCtgGate.Evaluate(proposal);

        Assert.Equal(CtgGateDecisionKind.Allow, trace.GateDecision.Decision);
        Assert.Equal("quorum-met", trace.GateDecision.ReasonCode);
        Assert.True(trace.GateDecision.Approvals >= 2);
        Assert.True(trace.AppliedAction.MoveForward);
    }

    [Fact]
    public void SeparatedDoorProbeStrafeRunnerV4_DefaultDsl_StillProbesDoor()
    {
        var strategy = new SeparatedDoorProbeStrafeRunnerV4(AutoplayOptimizationProfile.Default with
        {
            DoorUseDepth = 0.72f,
            DoorAimToleranceDegrees = 10
        });

        var action = strategy.ExecuteTick(
            new SensorFusion([0.72f, 0.76f, 0.80f, 0.60f, 0.64f, 0.68f], 0.70f, 100, 0, "corner", false, 18, 0),
            recoveryFrames: 0);

        Assert.True(action.UseKey);
        Assert.False(action.AttackKey);
    }

    private sealed class SpyPhainesis(List<string> calls) : IPhainesis
    {
        public Phainomenon Extract(SensorFrame frame)
        {
            calls.Add("phainesis");
            Assert.Equal(0.75f, frame.SensorTensor.SemanticScore("enemy"), precision: 2);
            return new Phainomenon
            {
                Events = new Dictionary<string, float>(StringComparer.Ordinal)
                {
                    ["enemySeen"] = 0.75f
                }
            };
        }
    }

    private sealed class SpyNous(List<string> calls) : INous
    {
        public MeaningVectorPacket Vectorize(Phainomenon phainomenon)
        {
            calls.Add("nous");
            return new MeaningVectorPacket
            {
                Source = phainomenon,
                MeaningVectors = new Dictionary<string, float>(StringComparer.Ordinal)
                {
                    ["enemyVector"] = phainomenon.EventScore("enemySeen")
                }
            };
        }
    }

    private sealed class SpyTopos(List<string> calls) : ITopos
    {
        public ToposDecisionVector Deliberate(MeaningVectorPacket nous)
        {
            calls.Add("topos");
            return new ToposDecisionVector
            {
                LogosVector = new Dictionary<string, float>(StringComparer.Ordinal) { ["route"] = 0.2f },
                PathosVector = new Dictionary<string, float>(StringComparer.Ordinal) { ["danger"] = nous.MeaningVectors["enemyVector"] },
                EthosVector = new Dictionary<string, float>(StringComparer.Ordinal) { ["objective"] = 0.4f },
                Decision = "avoid-enemy"
            };
        }
    }

    private sealed class SpyKairos(List<string> calls) : IKairos
    {
        public PriorityAxes Prioritize(ToposDecisionVector decision)
        {
            calls.Add("kairos");
            return new PriorityAxes
            {
                PathosPriority = decision.PathosVector["danger"],
                EthosPriority = 0.4f,
                LogosPriority = 0.2f,
                SelectedAxis = "pathos"
            };
        }
    }

    private sealed class SpyKinesis(List<string> calls) : IKinesis
    {
        public ActionVector Generate(PriorityAxes kairos)
        {
            calls.Add("kinesis");
            Assert.Equal("pathos", kairos.SelectedAxis);
            return new ActionVector { MoveForward = true, Source = "kinesis" };
        }
    }

    private sealed class SpyZoe(List<string> calls) : IZoe
    {
        public ZoeAuditResult Audit(ActionVector action, HealthSignal health)
        {
            calls.Add("zoe");
            Assert.True(action.MoveForward);
            Assert.Equal(8, health.Health);
            return health.IsLikelyFatal
                ? new ZoeAuditResult
                {
                    Action = action with { MoveForward = false, Source = "zoe" },
                    Vetoed = true,
                    Reason = "fatal-avoidance"
                }
                : new ZoeAuditResult { Action = action };
        }
    }

    private static CtgProposalPacket CreateProposal(ActionCommand action, IReadOnlyDictionary<string, float> semanticScores)
    {
        var decision = new AutoplayPipelineDecision(
            "TraceablePipeline",
            "test-stage",
            "test-objective",
            10,
            0.2f,
            semanticScores.Count == 0 ? 0 : semanticScores.Values.Max(),
            semanticScores,
            [],
            action);

        return new CtgProposalPacket(
            "test-trace",
            1,
            "Test",
            "test-objective",
            action,
            decision,
            semanticScores);
    }

    private static string FindRepoRoot(string start)
    {
        var directory = new DirectoryInfo(start);
        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "AIKernel.Doom.slnx")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new InvalidOperationException("Could not locate AIKernel.Doom repository root.");
    }
}
