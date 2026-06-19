import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadScript(context, relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  const source = readFileSync(filePath, "utf8");
  vm.runInContext(source, context, { filename: filePath });
}

const sandbox = {
  self: {},
  console,
  Math,
  Number,
  String,
  Boolean,
  Object,
  Array,
  Set,
  Date
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/objective-routing.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/expression-dsl.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/route-planner.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/doom-context.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/sensor-tensor.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/cognition/semantics.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/evidence.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/arbitration.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/decision-trace.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/pipeline-graph.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/zoe-veto.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/runtime-packets.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control-runtime.js");

const router = context.self.AIKernelDoomObjectiveRouting;
const expressionDsl = context.self.AIKernelDoomExpressionDsl;
const doomContext = context.self.AIKernelDoomControlContext;
const sensorTensorModule = context.self.AIKernelDoomSensorTensor;
const semantics = context.self.AIKernelDoomSemantics;
const evidence = context.self.AIKernelDoomControlEvidence;
const arbitration = context.self.AIKernelDoomControlArbitration;
const decisionTrace = context.self.AIKernelDoomDecisionTrace;
const runtimePackets = context.self.AIKernelDoomControlRuntimePackets;
const runtimeFactory = context.self.AIKernelDoomControlRuntime;

assert(router?.resolveObjectiveRoute, "objective routing module was not exported");
assert(expressionDsl?.evaluateWhen, "expression DSL module was not exported");
assert(doomContext?.createContext, "Doom control context adapter was not exported");
assert(sensorTensorModule?.semanticScore, "sensor tensor semantic ICD module was not exported");
assert(semantics?.updateE1M1SemanticMemory, "semantic memory updater was not exported");
assert(evidence?.evidenceScore, "control evidence module was not exported");
assert(arbitration?.evaluateStages, "control arbitration module was not exported");
assert(decisionTrace?.createPacket, "decision trace packet module was not exported");
assert(runtimePackets?.statusFromAction, "control runtime packet module was not exported");
assert(runtimePackets?.compileCanonicalGraph, "control runtime graph compiler was not exported");
assert(runtimePackets?.applyZoeVeto, "control runtime Zoe veto helper was not exported");
assert(runtimeFactory?.create, "control runtime module was not exported");

const preDoorBridgeRoute = router.resolveObjectiveRoute({ semanticObjective: "cross-bridge", firstDoorOpened: false });
assert(preDoorBridgeRoute.objective === "find-corridor-to-first-door", "bridge purpose should stay locked behind first-door route discovery");
assert(preDoorBridgeRoute.reason === "first-door-locked", "pre-door bridge routing should preserve the gate reason");

const openSpaceRoute = router.resolveObjectiveRoute({ semanticObjective: "OpenSpaceCruise", safeZoneConfidence: 0.9, firstDoorOpened: false });
assert(openSpaceRoute.objective === "find-corridor-to-first-door", "safe open-space evidence should not skip first-door route discovery");
assert(openSpaceRoute.reason === "first-door-required", "pre-door unknown objectives should route through the first-door gate");

const bridgeRoute = router.resolveObjectiveRoute({ semanticObjective: "cross-bridge", firstDoorOpened: true });
assert(bridgeRoute.objective === "reach-bridge", "canonical objective routing should normalize bridge purpose");
assert(bridgeRoute.means === "canonical-objective", "canonical routing should expose purpose-to-means trace");

const healthRoute = router.resolveObjectiveRoute({ health: 12, enemyConfidence: 0 });
assert(healthRoute.objective === "stabilize-safe-zone", "low health should route to a safe-zone objective");
assert(healthRoute.reason === "low-health", "low health route should preserve reason");

assert(
  expressionDsl.evaluateWhen({ parameters: { gate: 0.4 }, values: { health: 100, context: "open-space" } }, "health >= 20 && context != 'wall' && $gate >= 0.4"),
  "expression DSL should evaluate parameters, values, and string comparisons"
);

const semanticMemory = semantics.updateE1M1SemanticMemory(semantics.createE1M1SemanticMemory(), {
  phase: "CentralHall",
  objective: "cross-bridge",
  predictions: 42,
  depthEstimate: 0.72,
  firstDoorCorridorSignature: 0.7,
  firstDoorUseSignature: 0.6,
  mapDoorSectorMatch: true,
  wallUseProbeFrames: 1,
  doorOpenedCount: 1,
  computerRoomScore: 0.6,
  darkAreaScore: 0.2,
  bridgeBrownScore: 0.55,
  bridgeGreenCenter: 0.3,
  bridgeLaneVisible: true,
  bridgeLaneTurn: "right",
  enemyConfidence: 0.2
});

assert(semanticMemory.objective === "cross-bridge", "semantic memory should preserve routed objective");
assert(semanticMemory.symbols.bridge.confidence >= 0.6, "semantic memory should update bridge symbol confidence");
assert(semanticMemory.symbols["computerRoom"].confidence >= 0.4, "semantic memory should update computer-room symbol confidence");
assert(semanticMemory.lastUpdatedFrame === 42, "semantic memory should retain frame evidence");

const arbitrationProfile = {
  strategyName: "UnitDynamicPipeline",
  parameters: {
    combatFaceThreshold: 0.35,
    combatYawDegrees: 12,
    openCruiseWallVectorDeadZone: 0.08,
    openCruiseYawDegrees: 7
  },
  pipeline: {
    name: "UnitDynamicPipeline",
    semanticMemory: [
      { id: "bridge" },
      { id: "enemy" }
    ],
    arbitration: {
      defaultThreshold: 0.4
    },
    stages: [
      {
        id: "beta-bridge",
        objective: "reach-bridge",
        priority: 10,
        threshold: 0.4,
        when: "health >= 20",
        evidence: { bridge: 1 },
        action: {
          moveForward: "true",
          turnYaw: "openCruiseYaw",
          runKey: "true"
        }
      },
      {
        id: "alpha-enemy",
        objective: "avoid-enemy",
        priority: 10,
        threshold: 0.4,
        when: "health >= 20",
        evidence: { enemy: 1 },
        action: {
          moveBackward: "true",
          turnYaw: "combatYaw",
          attackKey: "true"
        }
      }
    ]
  }
};

const arbitrationRuntime = runtimeFactory.create(arbitrationProfile);
assert(
  arbitrationRuntime.graph.nodes.map(node => node.id).join(">") === "aisthesis>phainesis>nous>topos>kairos>kinesis>zoe",
  "runtime should compile the canonical 4-layer pipeline graph"
);
const customToposGraph = runtimePackets.compileCanonicalGraph({
  pipeline: {
    krisis: {
      topos: { vectors: ["CustomDecisionVector"] },
      kairos: { priorities: ["logos"] }
    },
    kinesis: {
      kinesis: { actions: ["moveForward"] }
    }
  }
});
assert(
  customToposGraph.nodes.find(node => node.id === "topos").outputs.join(",") === "CustomDecisionVector",
  "Topos graph outputs should be profile-driven"
);
assert(
  customToposGraph.nodes.find(node => node.id === "kairos").inputs.join(",") === "CustomDecisionVector",
  "Kairos graph inputs should follow Topos outputs"
);
const tieAction = arbitrationRuntime.predict({
  health: 100,
  faceSig: 0.7,
  wallVector: 0.2,
  semanticMemory: {
    symbols: {
      bridge: 0.8,
      enemy: 0.8
    }
  }
});

assert(tieAction.stage === "alpha-enemy", "same-priority arbitration should be deterministic by stage id");
assert(tieAction.move === "back", "enemy route should request a back movement");
assert(tieAction.fire === true, "enemy route should request attack");
const tieStatus = arbitrationRuntime.status();
assert(tieStatus.stageEvaluations.length === 1, "selected stage should stop evaluation after deterministic match");
assert(tieStatus.decisionTrace?.version === "control-decision-trace-v1", "status should expose a generic decision trace packet");
assert(tieStatus.decisionTrace.entries.some(item => item.code === "P" && item.category === "priority"), "decision trace should include priority entries");
assert(tieStatus.decisionTrace.entries.some(item => item.code === "T" && item.category === "telos"), "decision trace should include telos entries");
assert(tieStatus.decisionTrace.entries.some(item => item.code === "O" && item.category === "objective"), "decision trace should include objective entries");
assert(tieStatus.graph.nodes[6].inputs.join(",") === "health", "Zoe graph node should receive only health input");

const thresholdRuntime = runtimeFactory.create(arbitrationProfile);
const thresholdAction = thresholdRuntime.predict({
  health: 100,
  semanticMemory: {
    symbols: {
      bridge: 0.2,
      enemy: 0.1
    }
  }
});

assert(thresholdAction.stage === "none", "below-threshold evidence should fail closed");
assert(thresholdAction.move === "none", "below-threshold fallback should be neutral");
assert(thresholdRuntime.status().stageEvaluations.every(item => item.evidenceMatched === false), "threshold misses should be visible in status");

const tensorProfile = {
  strategyName: "UnitTensorPipeline",
  parameters: {
    openCruiseWallVectorDeadZone: 0.08,
    openCruiseYawDegrees: 7
  },
  pipeline: {
    name: "UnitTensorPipeline",
    semanticMemory: [{ id: "bridge" }],
    arbitration: { defaultThreshold: 0.5 },
    stages: [
      {
        id: "bridge-route",
        objective: "reach-bridge",
        priority: 5,
        threshold: 0.5,
        when: "health >= 20 && context != 'wall'",
        evidence: { bridge: 1 },
        action: {
          moveForward: "true",
          turnYaw: "openCruiseYaw",
          runKey: "true"
        }
      }
    ]
  }
};

const sensorTensorData = new Array(32).fill(0);
sensorTensorData[19] = 0.75;
const tensorRuntime = runtimeFactory.create(tensorProfile);
const tensorAction = tensorRuntime.predict({
  health: 100,
  contextDict: "open-space",
  wallVector: 0,
  sensorTensor: {
    shape: [4, 8],
    data: sensorTensorData
  },
  semanticMemory: { symbols: {} }
});

assert(tensorAction.stage === "bridge-route", "sensor tensor bridge evidence should select bridge route");
assert(tensorAction.move === "forward", "bridge route should move forward");
assert(tensorAction.semanticScores.bridge === 0.75, "semantic score should expose tensor-backed bridge evidence");

const vetoProfile = {
  strategyName: "UnitZoeVetoPipeline",
  pipeline: {
    name: "UnitZoeVetoPipeline",
    kinesis: {
      zoe: {
        vetoRules: [{ when: "hp < 10" }]
      }
    },
    stages: [
      {
        id: "unsafe-forward",
        objective: "advance-route",
        priority: 1,
        when: "true",
        action: {
          moveForward: "true",
          attackKey: "true"
        }
      }
    ]
  }
};
const vetoRuntime = runtimeFactory.create(vetoProfile);
const vetoAction = vetoRuntime.predict({ health: 5 });
assert(vetoAction.zoeVetoed === true, "Zoe should veto unsafe low-health actions");
assert(vetoAction.move === "none", "Zoe veto should override movement");
assert(vetoAction.fire === false, "Zoe veto should override attack");
assert(vetoRuntime.status().safetyReason === "zoe-veto", "Zoe veto should be visible in runtime status");

const publicProfile = JSON.parse(readFileSync(path.join(repoRoot, "src/DoomWeb/wwwroot/demo/doom/autoplay-profile.json"), "utf8"));
const demoRouteRuntime = runtimeFactory.create(publicProfile);
const demoRouteAction = demoRouteRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.72,
  doorOpenedCount: 0,
  predictions: 900,
  spawnCorridorGapScore: 0.35,
  spawnCorridorGapTurn: "right",
  semanticMemory: {
    symbols: {
      door: 0.45,
      corridor: 0.45,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(demoRouteAction.stage === "demo-spawn-map-centerline", "Public profile should start with the deterministic demo route before sensor-driven gap cruise");
assert(demoRouteAction.move === "forward", "Demo route should initially move forward from the spawn area");

const demoRouteInitialFootSignalAction = runtimeFactory.create(publicProfile).predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0,
  predictions: 32,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(demoRouteInitialFootSignalAction.stage === "demo-spawn-map-centerline", "Initial demo route should ignore open-space foot-noise and keep the deterministic route");
assert(demoRouteInitialFootSignalAction.move === "forward", "Initial open-space foot-noise should not back the route away from the spawn line");

const demoRouteInitialCloseFootClearAction = runtimeFactory.create(publicProfile).predict({
  health: 100,
  depthSig: 0.42,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0,
  predictions: 32,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(demoRouteInitialCloseFootClearAction.stage === "demo-spawn-initial-foot-clear" || demoRouteInitialCloseFootClearAction.stage === "demo-spawn-arc-foot-clear", `Initial demo route should clear a confirmed close foot obstacle (actual=${demoRouteInitialCloseFootClearAction.stage})`);
assert(demoRouteInitialCloseFootClearAction.move === "back", "Initial close foot-obstacle clear should back out instead of scraping forward");

const demoRouteArcRuntime = runtimeFactory.create(publicProfile);
demoRouteArcRuntime.predictions = 240;
const demoRouteArcFootClearAction = demoRouteArcRuntime.predict({
  health: 100,
  depthSig: 0.42,
  contextDict: "wall",
  wallVector: 0.24,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.46,
  footObstacleScore: 0.46,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.43,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.55,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(demoRouteArcFootClearAction.stage === "demo-spawn-arc-foot-clear", "Arc demo route should also clear foot obstacles before continuing the fixed route");
assert(demoRouteArcFootClearAction.move === "back", "Arc foot-obstacle clear should back out instead of scraping forward");

const demoRouteSensorReleaseRuntime = runtimeFactory.create(publicProfile);
demoRouteSensorReleaseRuntime.predictions = 320;
const demoRouteSensorReleaseAction = demoRouteSensorReleaseRuntime.predict({
  health: 100,
  depthSig: 0.92,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.27,
  footObstacleScore: 0.27,
  actionRepeatFrames: 140,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.39,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.51,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(demoRouteSensorReleaseAction.stage === "demo-spawn-map-sensor-release", "Long repeated spawn arcs should hand off from the fixed route to sensor-guided yaw");
assert(demoRouteSensorReleaseAction.move === "forward", "Sensor release should keep the route moving forward");
assert(demoRouteSensorReleaseAction.turn === "right", "Sensor release should keep steering toward the detected route gap");

const spawnGapRuntime = runtimeFactory.create(publicProfile);
spawnGapRuntime.predictions = 2300;
const spawnGapAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.72,
  doorOpenedCount: 0,
  predictions: 900,
  spawnCorridorGapScore: 0.35,
  spawnCorridorGapTurn: "right",
  semanticMemory: {
    symbols: {
      door: 0.45,
      corridor: 0.45,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnGapAction.stage === "demo-spawn-map-corridor-sustain", "Public profile should keep the deterministic demo route active before handing off to sensor-driven gap cruise");
assert(spawnGapAction.turn === "right", "Public profile should keep turning toward the locked right spawn gap");

const routeTimeoutSurveyRuntime = runtimeFactory.create(publicProfile);
routeTimeoutSurveyRuntime.predictions = 3200;
const routeTimeoutSurveyAction = routeTimeoutSurveyRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  doorOpenedCount: 0,
  predictions: 3200,
  spawnCorridorGapScore: 0.31,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.43,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.45,
      corridor: 0.45,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(routeTimeoutSurveyAction.stage === "spawn-route-timeout-survey", `Late route without first-door evidence should stop forward travel and survey (actual=${routeTimeoutSurveyAction.stage})`);
assert(routeTimeoutSurveyAction.move === "none", "Late route survey should rotate in place when there is no close foot obstacle");

const fallbackFootBlockRuntime = runtimeFactory.create(publicProfile);
fallbackFootBlockRuntime.predictions = 980;
const fallbackFootBlockAction = fallbackFootBlockRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.2,
  motionObstacleScore: 0.2,
  footObstacleScore: 0.6,
  footObstacleFlickerScore: 0.22,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.2,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.1,
  spawnLandmarkRouteTurn: "none",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.25,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.3,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(fallbackFootBlockAction.stage === "wall-follow-fallback", `Last-resort fallback should remain the selected stage for weak route evidence (actual=${fallbackFootBlockAction.stage})`);
assert(fallbackFootBlockAction.move === "back", "Last-resort fallback should back out instead of pushing forward when foot occlusion is strong");

const fallbackOpenSpaceFootNoiseRuntime = runtimeFactory.create(publicProfile);
fallbackOpenSpaceFootNoiseRuntime.predictions = 980;
const fallbackOpenSpaceFootNoiseAction = fallbackOpenSpaceFootNoiseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.2,
  motionObstacleScore: 0.2,
  footObstacleScore: 0.6,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.2,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.1,
  spawnLandmarkRouteTurn: "none",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.25,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.3,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(fallbackOpenSpaceFootNoiseAction.stage === "wall-follow-fallback", `Open-space foot noise should still fall through to the last-resort route stage (actual=${fallbackOpenSpaceFootNoiseAction.stage})`);
assert(fallbackOpenSpaceFootNoiseAction.move !== "back", "Open-space foot noise without flicker or bounce should not force a back-loop");

const spawnWallPivotAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.06,
  footObstacleScore: 0.12,
  contextDict: "wall",
  wallVector: 0.72,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.35,
  spawnCorridorGapTurn: "right",
  semanticMemory: {
    symbols: {
      door: 0.45,
      corridor: 0.45,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnWallPivotAction.stage === "spawn-gap-wall-pivot", `Public profile should leave gap cruise when the route reaches a close wall (actual=${spawnWallPivotAction.stage})`);
assert(spawnWallPivotAction.turn === "right", "Close-wall spawn pivot should turn toward the locked spawn gap");
assert(spawnWallPivotAction.move === "back", "Close-wall spawn pivot should back out when a foot obstacle is visible");

const spawnGapWallPivotCloseFootAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.29,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  contextDict: "wall",
  wallVector: 0.2,
  doorOpenedCount: 0,
  predictions: 900,
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.50,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.24,
  firstDoorVision9x9Score: 0.34,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnGapWallPivotCloseFootAction.stage === "spawn-gap-wall-pivot", "Medium-close route-foot occlusion should stay in the gap wall pivot");
assert(spawnGapWallPivotCloseFootAction.move === "back", "Medium-close route-foot occlusion should back out instead of scraping forward");
assert(spawnGapWallPivotCloseFootAction.turn === "right", "Medium-close route-foot occlusion should keep turning toward the locked route gap");

const spawnWallPivotWithoutFootObstacleAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.06,
  footObstacleScore: 0,
  contextDict: "wall",
  wallVector: 0.72,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.35,
  spawnCorridorGapTurn: "right",
  semanticMemory: {
    symbols: {
      door: 0.45,
      corridor: 0.45,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnWallPivotWithoutFootObstacleAction.stage === "demo-spawn-map-corridor-sustain", "Public profile should keep the route moving when close-wall depth lacks foot-obstacle evidence");
assert(spawnWallPivotWithoutFootObstacleAction.move === "forward", "Close-wall depth without foot-obstacle evidence should re-enter the route");

const firstDoorVisionApproachAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.95,
  contextDict: "wall",
  wallVector: 0.2,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.17,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 120,
  bridgeDoorScore: 0.2,
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.47,
  firstDoorVision9x9RedScore: 0.08,
  firstDoorUse3x3Score: 0.1,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(firstDoorVisionApproachAction.stage === "first-door-route-vision-approach", "Public profile should approach when the first-door 9x9 signature is strong");
assert(firstDoorVisionApproachAction.move === "forward", "First-door vision approach should close distance before using the door");
assert(firstDoorVisionApproachAction.turn === "right", "First-door vision approach should fall back to the locked spawn gap while 3x3 use alignment is absent");

const firstDoorVisionEastWindowFalsePositiveAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  doorOpenedCount: 0,
  courtyardScore: 0.34,
  courtyardTurn: "right",
  spawnSecretDoorScore: 0.24,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  bridgeDoorScore: 0,
  firstDoorVision9x9Score: 0.49,
  firstDoorVision9x9RedScore: 0.08,
  firstDoorUse3x3Score: 0.1,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(firstDoorVisionEastWindowFalsePositiveAction.stage !== "first-door-route-vision-approach", "East-window/courtyard red accents without bridge or corridor-gap evidence should not latch FirstDoor route vision");

const firstDoorVisionHoldAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.95,
  contextDict: "wall",
  wallVector: 0.2,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.31,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 120,
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.40,
  firstDoorVision9x9RedScore: 0.055,
  firstDoorUse3x3Score: 0.1,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(firstDoorVisionHoldAction.stage === "first-door-route-vision-hold", `Moderate first-door 9x9 evidence should hold the door approach before falling back to route recovery (actual=${firstDoorVisionHoldAction.stage})`);
assert(firstDoorVisionHoldAction.move === "forward", "First-door vision hold should continue closing distance while preserving the approach yaw");

const firstDoorWallPatternNoRedAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.95,
  contextDict: "wall",
  wallVector: 0.2,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.17,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 120,
  firstDoorVision9x9Score: 0.47,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0.1,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(firstDoorWallPatternNoRedAction.stage !== "first-door-route-vision-approach", "9x9 wall patterns without red accent evidence should not trigger the high-priority first-door approach");

const firstDoorTextureWallFalsePositiveAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.57,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0.22,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.41,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 120,
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.24,
  firstDoorVision9x9Score: 0.48,
  firstDoorVision9x9RedScore: 0.07,
  firstDoorUse3x3Score: 0.1,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(firstDoorTextureWallFalsePositiveAction.stage !== "first-door-route-vision-approach", "Texture-wall occlusion should suppress high-priority first-door 9x9 false positives even when red accents are present");

const spawnFootPressureSurveyRuntime = runtimeFactory.create(publicProfile);
spawnFootPressureSurveyRuntime.predictions = 1800;
const spawnFootPressureSurveyAction = spawnFootPressureSurveyRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.64,
  motionObstacleScore: 0.60,
  footObstacleScore: 0.60,
  footObstacleFlickerScore: 0.22,
  doorOpenedCount: 0,
  predictions: 1800,
  spawnCorridorGapScore: 0.28,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 120,
  spawnLandmarkRouteEvidence: 0.24,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnFootPressureSurveyAction.stage === "spawn-foot-pressure-survey", `High foot pressure with weak door evidence should survey instead of pushing forward (actual=${spawnFootPressureSurveyAction.stage})`);
assert(spawnFootPressureSurveyAction.move === "back", "Foot-pressure survey should back out before reacquiring the first-door corridor");
assert(spawnFootPressureSurveyAction.turn === "right", "Foot-pressure survey should preserve the route fallback yaw");

const spawnFootWallPivotRuntime = runtimeFactory.create(publicProfile);
spawnFootWallPivotRuntime.predictions = 620;
const spawnFootWallPivotAction = spawnFootWallPivotRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0.2,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0.22,
  doorOpenedCount: 0,
  predictions: 620,
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 120,
  spawnLandmarkRouteEvidence: 0.50,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnFootWallPivotAction.stage === "spawn-foot-wall-pivot", `Foot pressure with a moderate gap should pivot instead of falling into a backing loop (actual=${spawnFootWallPivotAction.stage})`);
assert(spawnFootWallPivotAction.move === "none", "Foot wall pivot should rotate in place rather than backing away from a visible corridor gap");
assert(spawnFootWallPivotAction.turn === "right", "Foot wall pivot should keep the route fallback yaw");

spawnGapRuntime.predictions = 600;
const eastWindowRouteRecoverAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  doorOpenedCount: 0,
  courtyardScore: 0.34,
  courtyardTurn: "right",
  spawnSecretDoorScore: 0.19,
  spawnCorridorGapScore: 0.21,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(eastWindowRouteRecoverAction.stage === "spawn-east-window-route-recover", `East-window evidence should use the demo route recovery stage (actual=${eastWindowRouteRecoverAction.stage})`);
assert(eastWindowRouteRecoverAction.strafe === true, "East-window route recovery should strafe away from the wall while turning");

const eastWindowLowGapSurveyRuntime = runtimeFactory.create(publicProfile);
eastWindowLowGapSurveyRuntime.predictions = 940;
const eastWindowLowGapSurveyAction = eastWindowLowGapSurveyRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  doorOpenedCount: 0,
  courtyardScore: 0.34,
  courtyardTurn: "right",
  spawnSecretDoorScore: 0.07,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(eastWindowLowGapSurveyAction.stage === "spawn-east-window-low-gap-survey", `East-window low-gap recovery should survey instead of driving into the wall (actual=${eastWindowLowGapSurveyAction.stage})`);
assert(eastWindowLowGapSurveyAction.move === "none", "East-window low-gap survey should rotate in place");
assert(eastWindowLowGapSurveyAction.turn === "left", "East-window low-gap survey should keep the demo route left turn");

const eastWindowLowGapLoopAdvanceRuntime = runtimeFactory.create(publicProfile);
eastWindowLowGapLoopAdvanceRuntime.predictions = 1220;
const eastWindowLowGapLoopAdvanceAction = eastWindowLowGapLoopAdvanceRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.57,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  actionRepeatFrames: 12,
  doorOpenedCount: 0,
  courtyardScore: 0.34,
  courtyardTurn: "right",
  spawnSecretDoorScore: 0.04,
  spawnCorridorGapScore: 0.17,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(eastWindowLowGapLoopAdvanceAction.stage === "spawn-east-window-low-gap-loop-advance", `Repeated east-window low-gap survey should advance instead of spinning (actual=${eastWindowLowGapLoopAdvanceAction.stage})`);
assert(eastWindowLowGapLoopAdvanceAction.move === "forward", "Repeated east-window low-gap survey should move forward while correcting yaw");
assert(eastWindowLowGapLoopAdvanceAction.turn === "left", "Repeated east-window low-gap survey should preserve the east-window route turn");

const lowGapTurnStallEscapeRuntime = runtimeFactory.create(publicProfile);
lowGapTurnStallEscapeRuntime.predictions = 1434;
const lowGapTurnStallEscapeAction = lowGapTurnStallEscapeRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.04,
  motionObstacleScore: 0.16,
  footObstacleScore: 0.28,
  turnRepeatFrames: 6,
  doorOpenedCount: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  spawnSecretDoorScore: 0.04,
  spawnCorridorGapScore: 0.16,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.18,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(lowGapTurnStallEscapeAction.stage === "spawn-low-gap-turn-stall-escape", `Turn-only low-gap stall should back off before more survey turns (actual=${lowGapTurnStallEscapeAction.stage})`);
assert(lowGapTurnStallEscapeAction.move === "back", "Turn-only low-gap stall should escape backward");
assert(lowGapTurnStallEscapeAction.turn === "right", "Turn-only low-gap stall should use the route fallback yaw");

const strongStructureNoTurnStallEscapeRuntime = runtimeFactory.create(publicProfile);
strongStructureNoTurnStallEscapeRuntime.predictions = 1434;
const strongStructureNoTurnStallEscapeAction = strongStructureNoTurnStallEscapeRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.04,
  motionObstacleScore: 0.16,
  footObstacleScore: 0.28,
  turnRepeatFrames: 6,
  doorOpenedCount: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  spawnSecretDoorScore: 0.04,
  spawnCorridorGapScore: 0.31,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(strongStructureNoTurnStallEscapeAction.stage !== "spawn-low-gap-turn-stall-escape", "Strong gap/landmark structure should not trigger turn-stall backoff");
assert(strongStructureNoTurnStallEscapeAction.move !== "back", "Strong gap/landmark structure should continue route recovery instead of backing away");

const cornerStallBackoffRuntime = runtimeFactory.create(publicProfile);
cornerStallBackoffRuntime.predictions = 2883;
const cornerStallBackoffAction = cornerStallBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  turnRepeatFrames: 6,
  doorOpenedCount: 0,
  courtyardScore: 0.35,
  courtyardTurn: "left",
  spawnSecretDoorScore: 0.09,
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.41,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(cornerStallBackoffAction.stage === "spawn-corner-stall-backoff", `Corner stall should back off instead of rotating forever (actual=${cornerStallBackoffAction.stage})`);
assert(cornerStallBackoffAction.move === "back", "Corner stall should escape backward before re-aiming");
assert(cornerStallBackoffAction.turn === "right", "Corner stall should keep the route fallback yaw while backing off");

const cornerStrongStructureRuntime = runtimeFactory.create(publicProfile);
cornerStrongStructureRuntime.predictions = 2883;
const cornerStrongStructureAction = cornerStrongStructureRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  turnRepeatFrames: 6,
  doorOpenedCount: 0,
  courtyardScore: 0.35,
  courtyardTurn: "left",
  spawnSecretDoorScore: 0.09,
  spawnCorridorGapScore: 0.35,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.55,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(cornerStrongStructureAction.stage !== "spawn-corner-stall-backoff", "Strong corner structure should not trigger backoff");
assert(cornerStrongStructureAction.move !== "back", "Strong gap and landmark evidence should continue route recovery instead of backing away");

const routeRecoverCornerBackoffRuntime = runtimeFactory.create(publicProfile);
routeRecoverCornerBackoffRuntime.predictions = 1842;
const routeRecoverCornerBackoffAction = routeRecoverCornerBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: -0.25,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  doorOpenedCount: 0,
  courtyardScore: 0.35,
  courtyardTurn: "left",
  spawnSecretDoorScore: 0.07,
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.41,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(routeRecoverCornerBackoffAction.stage === "spawn-route-recover-corner-backoff", `Route recovery with negative progress should back off from the corner (actual=${routeRecoverCornerBackoffAction.stage})`);
assert(routeRecoverCornerBackoffAction.move === "back", "Route recovery corner stall should escape backward");
assert(routeRecoverCornerBackoffAction.turn === "right", "Route recovery corner stall should preserve the route fallback yaw");

const routeRecoverStrongStructureRuntime = runtimeFactory.create(publicProfile);
routeRecoverStrongStructureRuntime.predictions = 1842;
const routeRecoverStrongStructureAction = routeRecoverStrongStructureRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: -0.25,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  doorOpenedCount: 0,
  courtyardScore: 0.35,
  courtyardTurn: "left",
  spawnSecretDoorScore: 0.07,
  spawnCorridorGapScore: 0.35,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.55,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(routeRecoverStrongStructureAction.stage !== "spawn-route-recover-corner-backoff", "Strong route structure should not trigger route-recovery backoff");
assert(routeRecoverStrongStructureAction.move !== "back", "Strong route structure should keep progressing instead of backing away");

const landmarkSlideBackoffRuntime = runtimeFactory.create(publicProfile);
landmarkSlideBackoffRuntime.predictions = 2159;
const landmarkSlideBackoffAction = landmarkSlideBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.25,
  motionObstacleScore: 0.60,
  footObstacleScore: 0.60,
  actionRepeatFrames: 8,
  doorOpenedCount: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  spawnSecretDoorScore: 0.06,
  spawnCorridorGapScore: 0.19,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.39,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(landmarkSlideBackoffAction.stage === "route-planner-landmark-slide-backoff", `Repeated landmark slide with low gap should back off (actual=${landmarkSlideBackoffAction.stage})`);
assert(landmarkSlideBackoffAction.move === "back", "Repeated landmark slide should back off before another loop advance");

const landmarkSlideStrongGapRuntime = runtimeFactory.create(publicProfile);
landmarkSlideStrongGapRuntime.predictions = 2159;
const landmarkSlideStrongGapAction = landmarkSlideStrongGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.25,
  motionObstacleScore: 0.60,
  footObstacleScore: 0.60,
  actionRepeatFrames: 8,
  doorOpenedCount: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  spawnSecretDoorScore: 0.06,
  spawnCorridorGapScore: 0.31,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.39,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(landmarkSlideStrongGapAction.stage !== "route-planner-landmark-slide-backoff", "Visible gap should not trigger landmark slide backoff");
assert(landmarkSlideStrongGapAction.move !== "back", "Visible gap should keep structural route progress");

const landmarkSecretCornerBackoffRuntime = runtimeFactory.create(publicProfile);
landmarkSecretCornerBackoffRuntime.predictions = 1500;
const landmarkSecretCornerBackoffAction = landmarkSecretCornerBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: -0.24,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  doorOpenedCount: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  spawnSecretDoorScore: 0.53,
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "left",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(landmarkSecretCornerBackoffAction.stage === "spawn-landmark-secret-corner-backoff", `Landmark/secret corner conflict should back off instead of route-turn looping (actual=${landmarkSecretCornerBackoffAction.stage})`);
assert(landmarkSecretCornerBackoffAction.move === "back", "Landmark/secret corner conflict should escape backward");

const landmarkSecretVisibleGapRuntime = runtimeFactory.create(publicProfile);
landmarkSecretVisibleGapRuntime.predictions = 1500;
const landmarkSecretVisibleGapAction = landmarkSecretVisibleGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: -0.24,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  doorOpenedCount: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  spawnSecretDoorScore: 0.53,
  spawnCorridorGapScore: 0.31,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "left",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(landmarkSecretVisibleGapAction.stage !== "spawn-landmark-secret-corner-backoff", "Visible gap should suppress landmark/secret conflict backoff");
assert(landmarkSecretVisibleGapAction.move !== "back", "Visible gap should preserve route progress during landmark/secret conflict");

const secretDoorHighEastWindowGuardRuntime = runtimeFactory.create(publicProfile);
secretDoorHighEastWindowGuardRuntime.predictions = 1260;
const secretDoorHighEastWindowGuardAction = secretDoorHighEastWindowGuardRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  doorOpenedCount: 0,
  courtyardScore: 0.34,
  courtyardTurn: "right",
  spawnCorridorGapScore: 0.19,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "left",
  spawnSecretDoorScore: 0.68,
  spawnSecretDoorTurn: "left",
  bridgeDoorScore: 0,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(secretDoorHighEastWindowGuardAction.stage !== "spawn-secret-route-escape", `Medium rear secret-door evidence should not force escape while FirstDoor route evidence remains usable (actual=${secretDoorHighEastWindowGuardAction.stage})`);
assert(secretDoorHighEastWindowGuardAction.stage !== "spawn-east-window-low-gap-survey", "Medium rear secret-door evidence should still guard east-window low-gap survey");
assert(secretDoorHighEastWindowGuardAction.move !== "back", "Medium rear secret-door evidence should not back away unless the stronger reset guard is satisfied");

const spawnWallLowGapSurveyRuntime = runtimeFactory.create(publicProfile);
spawnWallLowGapSurveyRuntime.predictions = 1080;
const spawnWallLowGapSurveyAction = spawnWallLowGapSurveyRuntime.predict({
  health: 100,
  depthSig: 0.62,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.46,
  footObstacleScore: 0.46,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.19,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.31,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.28,
  routeOpenSpaceLowGapEscape: true,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnWallLowGapSurveyAction.stage === "spawn-wall-low-gap-survey", `Wall low-gap recovery should rotate instead of fallback-forward into the wall (actual=${spawnWallLowGapSurveyAction.stage})`);
assert(spawnWallLowGapSurveyAction.move === "none", "Wall low-gap survey should not push into the wall");
assert(spawnWallLowGapSurveyAction.turn === "right", "Wall low-gap survey should keep the route fallback yaw");

const spawnOpenSpaceLowGapSurveyRuntime = runtimeFactory.create(publicProfile);
spawnOpenSpaceLowGapSurveyRuntime.predictions = 1700;
const spawnOpenSpaceLowGapSurveyAction = spawnOpenSpaceLowGapSurveyRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.6,
  footObstacleFlickerScore: 0.24,
  footObstacleBounceFrames: 2,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.16,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "left",
  spawnSecretDoorScore: 0.28,
  spawnWestStairScore: 0.27,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnOpenSpaceLowGapSurveyAction.stage === "spawn-open-space-low-gap-survey", `Open-space low-gap route recovery should use a strong scan before fallback (actual=${spawnOpenSpaceLowGapSurveyAction.stage})`);
assert(spawnOpenSpaceLowGapSurveyAction.move === "back", `Open-space low-gap survey should back away when the foot lane is blocked (actual=${spawnOpenSpaceLowGapSurveyAction.move}, stage=${spawnOpenSpaceLowGapSurveyAction.stage})`);
assert(spawnOpenSpaceLowGapSurveyAction.turn === "left", "Open-space low-gap survey should scan toward the route fallback yaw");

const eastWindowTexturePivotRuntime = runtimeFactory.create(publicProfile);
eastWindowTexturePivotRuntime.predictions = 1500;
const eastWindowTexturePivotAction = eastWindowTexturePivotRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.6,
  motionObstacleScore: 0.6,
  footObstacleScore: 0.6,
  footObstacleFlickerScore: 0.22,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.53,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  courtyardScore: 0.41,
  courtyardTurn: "right",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(eastWindowTexturePivotAction.stage === "spawn-east-window-texture-pivot", `East-window texture occlusion should pivot instead of driving into the wall (actual=${eastWindowTexturePivotAction.stage})`);
assert(eastWindowTexturePivotAction.move === "back", "East-window texture pivots should back out after the texture-occlusion window persists");
assert(eastWindowTexturePivotAction.turn === "left", "East-window texture pivots should keep the left recovery turn");

const lateEastWindowRecoverRuntime = runtimeFactory.create(publicProfile);
lateEastWindowRecoverRuntime.predictions = 2000;
const lateEastWindowRouteRecoverAction = lateEastWindowRecoverRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  doorOpenedCount: 0,
  courtyardScore: 0.35,
  courtyardTurn: "right",
  spawnSecretDoorScore: 0.19,
  spawnCorridorGapScore: 0.18,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(lateEastWindowRouteRecoverAction.stage !== "spawn-east-window-route-recover", "East-window recovery should not pin the route after the early demo recovery window has expired");

const lateOpenSpaceCruiseRuntime = runtimeFactory.create(publicProfile);
lateOpenSpaceCruiseRuntime.predictions = 2100;
const lateOpenSpaceCruiseAction = lateOpenSpaceCruiseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.6,
  motionObstacleScore: 0.15,
  footObstacleScore: 0,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.12,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.1,
  spawnLandmarkRouteTurn: "none",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.25,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.3,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(lateOpenSpaceCruiseAction.stage === "open-space-cruise", "Late open-space scanning should fall back to the broad cruise stage after early route anchors expire");
assert(lateOpenSpaceCruiseAction.move === "forward", "Late open-space cruise should keep moving instead of spinning in place");

const lateTextureWallPivotRuntime = runtimeFactory.create(publicProfile);
lateTextureWallPivotRuntime.predictions = 2540;
const lateTextureWallPivotAction = lateTextureWallPivotRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0.22,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.32,
  spawnLandmarkRouteTurn: "left",
  spawnSecretDoorScore: 0.50,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.25,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.3,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(lateTextureWallPivotAction.stage !== "wall-follow-fallback", `Late low-gap texture-wall recovery should use a structured recovery before fallback wall following (actual=${lateTextureWallPivotAction.stage})`);
assert(lateTextureWallPivotAction.move === "back" || lateTextureWallPivotAction.move === "none", "Late low-gap texture-wall recovery should not push forward into the wall");

const moderateGapTextureWallPivotRuntime = runtimeFactory.create(publicProfile);
moderateGapTextureWallPivotRuntime.predictions = 7653;
const moderateGapTextureWallPivotAction = moderateGapTextureWallPivotRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.65,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.22,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.26,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.19,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.25,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.3,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(moderateGapTextureWallPivotAction.stage !== "spawn-gap-cruise", `Moderate-gap texture-wall recovery should not continue spawn-gap cruise (actual=${moderateGapTextureWallPivotAction.stage})`);
assert(moderateGapTextureWallPivotAction.move === "back" || moderateGapTextureWallPivotAction.move === "none", "Long-lived moderate-gap texture-wall recovery should not push forward into the wall");

spawnGapRuntime.predictions = 600;
const eastWindowSecretAnchorRecoverAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.82,
  contextDict: "open-space",
  wallVector: 0.2,
  doorOpenedCount: 0,
  courtyardScore: 0.43,
  courtyardTurn: "left",
  spawnSecretDoorScore: 0.45,
  spawnCorridorGapScore: 0.33,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(eastWindowSecretAnchorRecoverAction.stage === "spawn-east-window-route-recover", `Strong east-window/secret landmark evidence should recover the route even when gap score is moderate (actual=${eastWindowSecretAnchorRecoverAction.stage})`);
assert(eastWindowSecretAnchorRecoverAction.strafe === true, "Strong east-window recovery should keep lateral separation from the wall");

spawnGapRuntime.predictions = 600;
const eastWindowTextureWallRecoverAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.22,
  doorOpenedCount: 0,
  courtyardScore: 0.40,
  courtyardTurn: "left",
  spawnSecretDoorScore: 0.09,
  spawnCorridorGapScore: 0.18,
  spawnLandmarkRouteEvidence: 0.45,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(eastWindowTextureWallRecoverAction.stage === "spawn-east-window-route-recover", "East-window recovery should stay active when wall texture occlusion is visible");
assert(eastWindowTextureWallRecoverAction.move === "back", "East-window recovery should back out when route-foot obstacle is confirmed");

const firstDoorVisionUseAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.68,
  contextDict: "wall",
  wallVector: 0.2,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.2,
  spawnCorridorGapTurn: "right",
  firstDoorVision9x9Score: 0.38,
  firstDoorUse3x3Score: 0.36,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(firstDoorVisionUseAction.stage === "first-door-close-use", "Public profile should switch to close-use while aligned close to the door");
assert(firstDoorVisionUseAction.use === true, "First-door vision approach should use the door only when close 3x3 alignment is strong");

const firstDoorNearWallFalsePositiveAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.06,
  contextDict: "wall",
  wallVector: 0.2,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.2,
  spawnCorridorGapTurn: "right",
  firstDoorVision9x9Score: 0.38,
  firstDoorUse3x3Score: 0.1,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(firstDoorNearWallFalsePositiveAction.stage === "demo-spawn-map-corridor-sustain", "Close 9x9-only wall patterns should stay on the route until foot-obstacle evidence is present");
assert(firstDoorNearWallFalsePositiveAction.turn === "right", "Close 9x9-only wall patterns should keep steering toward the locked route instead of oscillating away from it");

const firstDoorWallObstacleAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.4,
  footObstacleScore: 0.12,
  footObstacleFlickerScore: 0.22,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.16,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 0,
  spawnLandmarkRouteEvidence: 0.32,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.42,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(firstDoorWallObstacleAction.stage === "spawn-wall-obstacle-turn", "Wall obstacle evidence should suppress 9x9-only first-door approach");
assert(firstDoorWallObstacleAction.move === "back", "Wall obstacle correction should back out while pivoting away from the wall");

const liveWallTextureOcclusionAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.22,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 0,
  spawnLandmarkRouteEvidence: 0.32,
  spawnLandmarkRouteTurn: "right",
  bridgeDoorScore: 0.44,
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(liveWallTextureOcclusionAction.stage === "spawn-wall-obstacle-turn", "Texture-wall occlusion should escape the wall even when depth remains open");
assert(liveWallTextureOcclusionAction.move === "back", "Texture-wall occlusion should back out before resuming the locked route");

const wideGapFootOcclusionAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.22,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  predictions: 1900,
  spawnCorridorGapScore: 0.36,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.48,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(wideGapFootOcclusionAction.stage === "spawn-wall-obstacle-turn", "High-confidence foot occlusion should clear before following a wide spawn gap");
assert(wideGapFootOcclusionAction.move === "back", "Wide-gap foot occlusion should back out instead of continuing the route");

const highGapFirstDoorFootOcclusionAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.69,
  contextDict: "corridor",
  wallVector: 0.2,
  motionForwardProgress: 0.18,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.22,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  predictions: 2319,
  spawnCorridorGapScore: 0.43,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.55,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0.40,
  firstDoorVision9x9RedScore: 0.055,
  firstDoorUse3x3Score: 0.1,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(highGapFirstDoorFootOcclusionAction.stage !== "spawn-wall-obstacle-turn", "High gap and first-door evidence should suppress broad wall-obstacle recovery");
assert(highGapFirstDoorFootOcclusionAction.move !== "back", "High gap and first-door evidence should keep the route approaching instead of backing away");

const stalledWideGapFootOcclusionAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.22,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  predictions: 1100,
  spawnCorridorGapScore: 0.28,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.40,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(stalledWideGapFootOcclusionAction.stage === "spawn-wall-obstacle-turn", "Zero-progress foot occlusion should still clear before corridor sustain");
assert(stalledWideGapFootOcclusionAction.move === "back", "Zero-progress foot occlusion should back out instead of pressing forward");

const rearLandmarkFootResetAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0.22,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  predictions: 1200,
  spawnCorridorGapScore: 0.2,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.32,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.5,
  spawnSecretDoorTurn: "left",
  firstDoorVision9x9Score: 0.33,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(rearLandmarkFootResetAction.stage === "spawn-rear-landmark-foot-reset", "Medium rear landmark plus texture-foot occlusion should reset instead of falling through to wall-follow fallback");
assert(rearLandmarkFootResetAction.move === "back", "Rear landmark foot reset should back away from the obstacle");
assert(rearLandmarkFootResetAction.turn === "right", "Rear landmark foot reset should turn away from the observed rear landmark side");

const closeRearLandmarkFootResetAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.10,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.22,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  predictions: 750,
  spawnCorridorGapScore: 0.36,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.48,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.50,
  spawnSecretDoorTurn: "right",
  firstDoorVision9x9Score: 0.33,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(closeRearLandmarkFootResetAction.stage === "spawn-rear-landmark-foot-reset", "Close medium rear landmark should reset before falling through to wall-follow fallback");
assert(closeRearLandmarkFootResetAction.move === "back", "Close rear landmark reset should back out of the wall contact");

const moderateGapWallTextureOcclusionAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.60,
  footObstacleScore: 0.60,
  footObstacleFlickerScore: 0.22,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.25,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.32,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(moderateGapWallTextureOcclusionAction.stage === "spawn-wall-obstacle-turn", "Moderate-gap texture wall should still trigger wall recovery before it scrapes along the side wall");

const spawnBlueFloorGapRouteAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  doorOpenedCount: 0,
  blueFloorScore: 0.12,
  spawnCorridorGapScore: 0.41,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.53,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.07,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnBlueFloorGapRouteAction.stage === "spawn-blue-floor-gap-route", "Blue-floor landmark with a strong gap should route toward the first-door corridor before wall recovery");
assert(spawnBlueFloorGapRouteAction.move === "forward", "Blue-floor gap route should continue forward toward the corridor opening");

const blueFloorCenterRouteAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.20,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0.57,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  doorOpenedCount: 0,
  blueFloorScore: 0.13,
  spawnCorridorGapScore: 0.33,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.47,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.24,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(blueFloorCenterRouteAction.stage === "spawn-blue-floor-gap-route", `Blue floor plus pillar landmark should override close-wall pivot and rejoin the first-door route (actual=${blueFloorCenterRouteAction.stage})`);
assert(blueFloorCenterRouteAction.move === "forward", "Blue-floor center route should move forward toward the corridor instead of backing along the wall");
assert(blueFloorCenterRouteAction.turn === "right", "Blue-floor center route should keep steering toward the detected gap");

const westStairWithStrongGapAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.50,
  footObstacleScore: 0.50,
  doorOpenedCount: 0,
  spawnWestStairScore: 0.28,
  spawnWestStairTurn: "left",
  spawnCorridorGapScore: 0.39,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.51,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.11,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(westStairWithStrongGapAction.stage !== "spawn-west-stair-route-recover", "West-stair landmark should not stop the route when a strong corridor gap is visible");
assert(westStairWithStrongGapAction.move === "forward", "Strong gap should keep the route moving forward");

const westStairLateRecoverRuntime = runtimeFactory.create(publicProfile);
westStairLateRecoverRuntime.predictions = 1140;
const westStairLateRecoverAction = westStairLateRecoverRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.60,
  footObstacleScore: 0.60,
  doorOpenedCount: 0,
  spawnWestStairScore: 0.37,
  spawnWestStairTurn: "left",
  spawnCorridorGapScore: 0.17,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.41,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(westStairLateRecoverAction.stage === "spawn-west-stair-route-recover", "Late west-stair route recovery should take over when the corridor gap is lost");
assert(westStairLateRecoverAction.move === "forward", "Late west-stair recovery should arc forward instead of spinning in place");

const openDepthWallContextAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.35,
  footObstacleScore: 0,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.23,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 120,
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.3,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(openDepthWallContextAction.stage === "demo-spawn-map-corridor-sustain", "Open-depth wall context should stay on the deterministic locked gap route instead of entering the legacy back-scan");
assert(openDepthWallContextAction.move === "forward", "Open-depth wall context should keep moving when no foot obstacle is visible");
assert(openDepthWallContextAction.turn === "right", "Open-depth wall context should keep turning toward the locked route gap");

const firstDoorDistantWallPatternAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "wall",
  wallVector: 0.2,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.34,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 150,
  spawnSecretDoorScore: 0.08,
  firstDoorVision9x9Score: 0.43,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(firstDoorDistantWallPatternAction.stage === "demo-spawn-map-corridor-sustain", "Distant 9x9-only wall patterns should preserve the deterministic locked spawn gap route");
assert(firstDoorDistantWallPatternAction.turn === "right", "Distant wall-pattern false positives should keep steering toward the gap");

const spawnLandmarkRouteOverrideAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "wall",
  wallVector: 0.2,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.37,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 150,
  spawnLandmarkRouteEvidence: 0.53,
  spawnLandmarkRouteTurn: "left",
  spawnLandmarkRouteKind: "east-window-anchor",
  spawnSecretDoorScore: 0.0,
  firstDoorVision9x9Score: 0.39,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnLandmarkRouteOverrideAction.stage === "spawn-gap-cruise", "Strong spawn landmarks should keep the demo route in the spawn-gap pipeline");
assert(spawnLandmarkRouteOverrideAction.turn === "left", "A stronger spawn landmark route should override the raw gap turn for route recovery");

const spawnLandmarkRouteScanAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "wall",
  wallVector: 0.2,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 20,
  spawnLandmarkRouteEvidence: 0.54,
  spawnLandmarkRouteTurn: "left",
  spawnLandmarkRouteKind: "east-window-anchor",
  spawnSecretDoorScore: 0.0,
  firstDoorVision9x9Score: 0.32,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnLandmarkRouteScanAction.stage === "spawn-landmark-route-turn", "Strong landmarks with a weak gap should scan in place before committing forward");
assert(spawnLandmarkRouteScanAction.move === "none", "Landmark route scans should not drive into the wall while correcting heading");
assert(spawnLandmarkRouteScanAction.turn === "left", "Landmark route scans should use the landmark-corrected route yaw");

const spawnLandmarkTexturePivotRuntime = runtimeFactory.create(publicProfile);
spawnLandmarkTexturePivotRuntime.predictions = 3000;
const spawnLandmarkTexturePivotAction = spawnLandmarkTexturePivotRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.65,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.22,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "left",
  spawnLandmarkRouteKind: "east-window-anchor",
  spawnSecretDoorScore: 0.37,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnLandmarkTexturePivotAction.stage === "spawn-landmark-texture-pivot", `Late landmark route recovery should pivot when wall-texture occlusion persists (actual=${spawnLandmarkTexturePivotAction.stage})`);
assert(spawnLandmarkTexturePivotAction.move === "back", "Long-lived landmark texture pivots should back out instead of scraping forward");
assert(spawnLandmarkTexturePivotAction.turn === "left", "Texture pivots should keep the landmark-corrected route yaw");

const spawnLandmarkWallPivotAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.99,
  contextDict: "open-space",
  wallVector: 0.18,
  motionObstacleScore: 0.33,
  footObstacleScore: 0,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 150,
  spawnLandmarkRouteEvidence: 0.5,
  spawnLandmarkRouteTurn: "left",
  spawnLandmarkRouteKind: "east-window-anchor",
  spawnSecretDoorScore: 0.0,
  firstDoorVision9x9Score: 0.28,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnLandmarkWallPivotAction.stage === "spawn-landmark-wall-pivot", "Strong landmark route plus medium wall pressure should pivot before resuming forward motion");
assert(spawnLandmarkWallPivotAction.move === "none", "Landmark wall pivot should avoid scraping forward into the wall");
assert(spawnLandmarkWallPivotAction.turn === "left", "Landmark wall pivot should use the landmark-corrected route yaw");

const spawnLandmarkPivotLoopAdvanceAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.99,
  contextDict: "open-space",
  wallVector: 0.18,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  actionRepeatFrames: 24,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.40,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.52,
  spawnLandmarkRouteTurn: "right",
  spawnLandmarkRouteKind: "east-window-anchor",
  spawnSecretDoorScore: 0.0,
  firstDoorVision9x9Score: 0.28,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnLandmarkPivotLoopAdvanceAction.stage === "spawn-landmark-pivot-loop-advance", `Repeated landmark wall pivots should resume structural advance (actual=${spawnLandmarkPivotLoopAdvanceAction.stage})`);
assert(spawnLandmarkPivotLoopAdvanceAction.move === "forward", "Repeated landmark pivots should advance once a stable gap and landmark route are still visible");
assert(spawnLandmarkPivotLoopAdvanceAction.turn === "right", "Repeated landmark pivot advance should follow the recommended route yaw");

const repeatedGapPivotAdvanceAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.80,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0.12,
  motionObstacleScore: 0.50,
  footObstacleScore: 0.10,
  actionRepeatFrames: 4,
  doorOpenedCount: 0,
  predictions: 900,
  spawnCorridorGapScore: 0.36,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.20,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.05,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(repeatedGapPivotAdvanceAction.stage === "route-planner-gap-loop-advance", `Repeated gap pivots should prefer structural advance over another pivot (actual=${repeatedGapPivotAdvanceAction.stage})`);
assert(repeatedGapPivotAdvanceAction.move === "forward", "Repeated gap pivots should move forward once the corridor vector is still visible");

const repeatedEscapeSurveyAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.30,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0.0,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.24,
  actionRepeatFrames: 18,
  doorOpenedCount: 0,
  predictions: 980,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.22,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.10,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(repeatedEscapeSurveyAction.stage === "route-escape-loop-survey", `Repeated escape should rotate in place instead of backing forever (actual=${repeatedEscapeSurveyAction.stage})`);
assert(repeatedEscapeSurveyAction.move === "none", "Repeated escape survey should stop the back-loop before selecting a new route");

const escapeOpenAdvanceAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.65,
  motionObstacleScore: 0.10,
  footObstacleScore: 0.05,
  actionRepeatFrames: 9,
  doorOpenedCount: 0,
  predictions: 980,
  spawnCorridorGapScore: 0.32,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.26,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.05,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(escapeOpenAdvanceAction.stage === "route-planner-gap-loop-advance", `When the view opens after an escape loop, route planning should advance (actual=${escapeOpenAdvanceAction.stage})`);
assert(escapeOpenAdvanceAction.move === "forward", "Open view after escape should resume forward route progress");

spawnGapRuntime.predictions = 580;
const earlySpawnSecretDoorEscapeAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  doorOpenedCount: 0,
  predictions: 560,
  spawnCorridorGapScore: 0.23,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.68,
  spawnSecretDoorTurn: "right",
  bridgeDoorScore: 0,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(earlySpawnSecretDoorEscapeAction.stage !== "spawn-secret-route-reset", "Medium rear secret-door evidence should not reset while route progress is still available");
assert(earlySpawnSecretDoorEscapeAction.move !== "back", "Medium rear secret-door evidence should not back away without low-progress foot contact");

spawnGapRuntime.predictions = 580;
const spawnSecretDoorEscapeAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0.02,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.22,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.24,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 120,
  spawnSecretDoorScore: 0.85,
  spawnSecretDoorTurn: "left",
  firstDoorVision9x9Score: 0.32,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnSecretDoorEscapeAction.stage === "spawn-secret-route-reset", "Strong spawn secret door evidence plus low-progress foot contact should force a backing escape instead of route progress");
assert(spawnSecretDoorEscapeAction.move === "back", "Secret-door escape should reverse away from the rear landmark");
assert(spawnSecretDoorEscapeAction.turn === "right", "Secret-door escape should turn away from the observed secret door side");

const lateSpawnSecretRouteSurveyRuntime = runtimeFactory.create(publicProfile);
lateSpawnSecretRouteSurveyRuntime.predictions = 980;
const lateSpawnSecretRouteSurveyAction = lateSpawnSecretRouteSurveyRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.65,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  doorOpenedCount: 0,
  predictions: 980,
  spawnCorridorGapScore: 0.23,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 120,
  spawnSecretDoorScore: 0.68,
  spawnSecretDoorTurn: "right",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(lateSpawnSecretRouteSurveyAction.stage !== "spawn-secret-route-survey", `Medium late secret-door evidence should not take over the FirstDoor route as a survey trigger (actual=${lateSpawnSecretRouteSurveyAction.stage})`);

spawnGapRuntime.predictions = 580;
const spawnSecretDoorSuppressionAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "wall",
  wallVector: 0.2,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.39,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 120,
  spawnSecretDoorScore: 0.68,
  firstDoorVision9x9Score: 0.5,
  firstDoorUse3x3Score: 0.1,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnSecretDoorSuppressionAction.stage !== "spawn-secret-route-reset", "Bright spawn secret door evidence should not reset the route while a strong corridor gap is still visible");
assert(spawnSecretDoorSuppressionAction.move !== "back", "Strong-gap secret-door evidence should preserve FirstDoor route recovery instead of backing away");

console.log("CONTROL_RUNTIME_VM_TEST_OK", {
  bridgeObjective: bridgeRoute.objective,
  deterministicStage: tieAction.stage,
  tensorStage: tensorAction.stage,
  vetoed: vetoAction.zoeVetoed,
  spawnGap: spawnGapAction.turn,
  spawnWallPivot: `${spawnWallPivotAction.move}/${spawnWallPivotAction.turn}`,
  firstDoorVision: firstDoorVisionApproachAction.stage,
  nearWallFalsePositive: firstDoorNearWallFalsePositiveAction.stage,
  rearLandmarkFootReset: rearLandmarkFootResetAction.stage,
  secretEscape: `${spawnSecretDoorEscapeAction.move}/${spawnSecretDoorEscapeAction.turn}`,
  secretSuppression: spawnSecretDoorSuppressionAction.stage
});
