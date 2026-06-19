namespace AIKernel.Doom.Architecture.Tests;

using System.Text.Json;
using AIKernel.Doom.Provider.Autoplay;

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

        Assert.True(new[] { "door", "corridor", "enemy", "safe-zone", "bridge", "computer-room" }.All(symbols.Contains));
        Assert.Contains("open-door", objectives);
        Assert.Contains("reach-bridge", objectives);
        Assert.Contains("avoid-enemy", objectives);
        Assert.Equal("deterministic-weighted-priority", pipeline.GetProperty("arbitration").GetProperty("mode").GetString());

        var stageIds = pipeline.GetProperty("stages")
            .EnumerateArray()
            .Select(stage => stage.GetProperty("id").GetString())
            .ToHashSet(StringComparer.Ordinal);

        Assert.Contains("bridge-route-cruise", stageIds);
        Assert.Contains("computer-room-route-cruise", stageIds);
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
    }

    [Fact]
    public void PipelineStateDto_FromContext_ExposesCanonicalLayersAndKairosAxis()
    {
        var routePlan = new DoomRoutePlannerResult
        {
            FirstDoorRouteEvidence = 0.4f,
            FirstDoorRouteEvidenceReady = true
        };
        var context = new DynamicPipelineContext
        {
            SensorReadings = new Dictionary<string, float>(StringComparer.Ordinal) { ["visual"] = 0.5f },
            Events = new Dictionary<string, float>(StringComparer.Ordinal) { ["gap"] = 0.6f },
            MeaningVectors = new Dictionary<string, float>(StringComparer.Ordinal) { ["gapVector"] = 0.6f },
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
            RoutePlan = routePlan
        };
        var action = new ActionCommand(true, false, false, false, 0, false, false);

        var state = PipelineStateDto.From(context, action);

        Assert.Equal(0.5f, state.Aisthesis.SensorReadings["visual"], precision: 2);
        Assert.True(state.Aisthesis.RoutePlan.FirstDoorRouteEvidenceReady);
        Assert.Equal(0.6f, state.Noesis.PhainesisEvents["gap"], precision: 2);
        Assert.Equal(0.6f, state.Krisis.ToposVectors["LogosVector"], precision: 2);
        Assert.Equal("logos", state.Krisis.Kairos.SelectedAxis);
        Assert.True(state.Krisis.Kairos.IsLogosDominant);
        Assert.True(state.Kinesis.MoveForward);
        Assert.Equal(20, state.Kinesis.ActionRepeatFrames);
        Assert.Equal(20, state.Kinesis.MoveRepeatFrames);
        Assert.Equal(6, state.Kinesis.TurnRepeatFrames);
    }

    [Fact]
    public void DynamicPipelineDslCompiler_ResolvesKinesisRepeatCounters()
    {
        var predicate = AutoplayPipelineDslCompiler.CompileDynamicPredicate(
            "actionRepeatFrames >= 20 && moveRepeatFrames >= 12 && turnRepeatFrames >= 6");
        var aliasPredicate = AutoplayPipelineDslCompiler.CompileDynamicPredicate(
            "kinesisActionRepeatFrames >= 20 && kinesisMoveRepeatFrames >= 12 && repeatTurnFrames >= 6");
        var context = new DynamicPipelineContext
        {
            ActionRepeatFrames = 20,
            MoveRepeatFrames = 12,
            TurnRepeatFrames = 6
        };

        Assert.True(predicate(context));
        Assert.True(aliasPredicate(context));
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
                ["spatial"] = 0.42f
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
        Assert.Equal("right", state.DebugOverlay.UseProbe.Direction);
        Assert.Equal(0.68f, state.DebugOverlay.UseProbe.Confidence, precision: 2);
        Assert.Equal("forward", state.SuggestedAction.Move);
        Assert.False(state.PipelineState.Kinesis.Zoe.Vetoed);
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
