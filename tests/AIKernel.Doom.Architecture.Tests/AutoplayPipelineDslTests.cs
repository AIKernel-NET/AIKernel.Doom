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
