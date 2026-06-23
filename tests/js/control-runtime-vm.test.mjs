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
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/route-loop-budget.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/doom-context.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/sensor-tensor.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/cognition/semantics.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/evidence.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/arbitration.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/decision-trace.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/pipeline-graph.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/zoe-veto.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/gpu-contracts.js");
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

const postDoorLowHealthRoute = router.resolveObjectiveRoute({ health: 35, firstDoorOpened: true, enemyConfidence: 0.1 });
assert(postDoorLowHealthRoute.objective === "enter-computer-room", "post-door low health before room evidence should keep moving into the next route");
assert(postDoorLowHealthRoute.reason === "low-health-goal-first", "post-door low health should expose a goal-first reason");

const centralHallEnemyRoute = router.resolveObjectiveRoute({
  health: 100,
  firstDoorOpened: true,
  centralHallEntered: true,
  enemyConfidence: 0.42,
  enemyDefeatedCount: 0,
  ammoLikelyEmpty: false
});
assert(centralHallEnemyRoute.objective === "engage-front-enemy", "central hall with combat evidence should engage the front enemy");

const centralHallBypassRoute = router.resolveObjectiveRoute({
  health: 42,
  firstDoorOpened: true,
  centralHallEntered: true,
  enemyConfidence: 0.42,
  enemyDefeatedCount: 0,
  ammoLikelyEmpty: false
});
assert(centralHallBypassRoute.objective === "reach-final-room", "low health in central hall should bypass gatekeeper toward the final route");

const exitRoute = router.resolveObjectiveRoute({
  health: 80,
  firstDoorOpened: true,
  finalRoomEntered: true,
  exitSwitchPressed: false
});
assert(exitRoute.objective === "press-exit-switch", "final room should route to the exit switch");

const postDoorCriticalHealthRoute = router.resolveObjectiveRoute({ health: 12, firstDoorOpened: true, enemyConfidence: 0.1 });
assert(postDoorCriticalHealthRoute.objective === "stabilize-safe-zone", "critical health should still use the recovery objective");
assert(postDoorCriticalHealthRoute.reason === "low-health", "critical health should preserve the emergency low-health reason");

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

const postDoorAudioTransitionRuntime = runtimeFactory.create(publicProfile);
postDoorAudioTransitionRuntime.predictions = 3800;
const postDoorAudioTransitionAction = postDoorAudioTransitionRuntime.predict({
  health: 100,
  depthSig: 0.95,
  contextDict: "open-space",
  wallVector: 0,
  soundEvent: true,
  postDoorAudioCue: true,
  doorOpenedCount: 0,
  predictions: 3800,
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.50,
  spawnLandmarkRouteTurn: "right",
  computerRoomConfidence: 0.20,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.4,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0.2
    }
  }
});
assert(postDoorAudioTransitionAction.stage === "post-door-audio-transition-advance", `Post-door audio cue should advance into the computer room before FirstDoor route recovery takes over (actual=${postDoorAudioTransitionAction.stage})`);
assert(postDoorAudioTransitionAction.move === "forward", "Post-door audio transition should keep forward movement");
assert(postDoorAudioTransitionAction.use === false, "Post-door audio transition must not press Use again while the shutter can close");

const postDoorCloseWallRuntime = runtimeFactory.create(publicProfile);
postDoorCloseWallRuntime.predictions = 1800;
const postDoorCloseWallAction = postDoorCloseWallRuntime.predict({
  health: 100,
  depthSig: 0.18,
  contextDict: "wall",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.32,
  motionForwardProgress: -0.01,
  footObstacleScore: 0.57,
  motionObstacleScore: 0.57,
  spawnCorridorGapScore: 0.42,
  spawnCorridorGapTurn: "left",
  spawnLandmarkRouteEvidence: 0.54,
  spawnLandmarkRouteTurn: "left",
  spawnSecretDoorScore: 0.09,
  firstDoorVision9x9Score: 0.15,
  firstDoorUse3x3Score: 0,
  bridgeDoorScore: 0.28,
  semanticMemory: {
    symbols: {
      door: 0.28,
      corridor: 0.34,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.24,
      "computer-room": 0.32
    }
  }
});
assert(postDoorCloseWallAction.stage === "post-door-close-wall-forward-release", `Post-door close-wall doorway state should continue through the shutter instead of idling (actual=${postDoorCloseWallAction.stage})`);
assert(postDoorCloseWallAction.move === "forward", "Post-door close-wall release should keep forward movement");
assert(postDoorCloseWallAction.use === false, "Post-door close-wall release must not press Use again");

const postDoorLowGapIngressLockRuntime = runtimeFactory.create(publicProfile);
postDoorLowGapIngressLockRuntime.predictions = 888;
const postDoorLowGapIngressLockAction = postDoorLowGapIngressLockRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  routeAbortHint: "turn-stall",
  routeDeadEndRisk: false,
  visualEnemyVisible: false,
  trustedCombatEvidence: false,
  audioEnemyConfidence: 0.23,
  computerRoomConfidence: 0.07,
  computerRoomScore: 0.07,
  computerPanelScore: 0.07,
  computerDarkPanelScore: 0.00,
  postDoorTerminalSurface: 0.25,
  bridgeConfidence: 0.12,
  bridgeDoorScore: 0,
  wallVector: 0.34,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 0,
  actionRepeatFrames: 1,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.19,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.3332,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.37,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.30,
      corridor: 0.34,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.12,
      "computer-room": 0.25
    }
  }
});
assert(postDoorLowGapIngressLockAction.stage === "post-door-low-gap-ingress-forward-lock", `Open FirstDoor low-gap ingress should lock straight forward instead of routeFallback yaw (actual=${postDoorLowGapIngressLockAction.stage})`);
assert(postDoorLowGapIngressLockAction.move === "forward", "Open FirstDoor low-gap ingress lock should keep forward pressure into the room");
assert(postDoorLowGapIngressLockAction.turn === "none", "Open FirstDoor low-gap ingress lock should not turn away from the doorway");

const postDoorWeakAudioBeforeIngressRuntime = runtimeFactory.create(publicProfile);
postDoorWeakAudioBeforeIngressRuntime.predictions = 1392;
const postDoorWeakAudioBeforeIngressAction = postDoorWeakAudioBeforeIngressRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  trustedCombatEvidence: false,
  audioEnemyStrong: true,
  computerRoomCombatContext: true,
  audioEnemyConfidence: 0.29,
  audioEnemyDirection: "right",
  enemyCombatYaw: 18,
  computerRoomConfidence: 0.17,
  computerRoomScore: 0.17,
  computerPanelScore: 0.41,
  computerDarkPanelScore: 0.00,
  postDoorTerminalSurface: 0.41,
  bridgeConfidence: 0.31,
  bridgeDoorScore: 0.33,
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 0,
  actionRepeatFrames: 19,
  footObstacleScore: 0.57,
  motionObstacleScore: 0.57,
  spawnCorridorGapScore: 0.37,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.49,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.37,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.20,
      corridor: 0.34,
      enemy: 0.10,
      "safe-zone": 0.2,
      bridge: 0.31,
      "computer-room": 0.41
    }
  }
});
assert(postDoorWeakAudioBeforeIngressAction.stage === "post-door-terminal-ingress-straight-lock", `Weak post-door audio without trusted combat evidence should preserve straight room ingress instead of audio orient or bridge yaw (actual=${postDoorWeakAudioBeforeIngressAction.stage})`);
assert(postDoorWeakAudioBeforeIngressAction.move === "forward", "Weak post-door audio before ingress should keep forward movement");
assert(postDoorWeakAudioBeforeIngressAction.turn === "none", "Weak post-door audio before ingress should not yaw away from the doorway");

const postDoorTerminalAdvanceRuntime = runtimeFactory.create(publicProfile);
postDoorTerminalAdvanceRuntime.predictions = 2502;
const postDoorTerminalAdvanceAction = postDoorTerminalAdvanceRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.10,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.64,
  bridgeConfidence: 0.35,
  motionForwardProgress: 0.32,
  footObstacleScore: 0.58,
  motionObstacleScore: 0.58,
  spawnCorridorGapScore: 0.34,
  spawnLandmarkRouteEvidence: 0.35,
  spawnSecretDoorScore: 0.07,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  bridgeDoorScore: 0.08,
  bridgeLaneVisible: true,
  bridgeGreenHazard: 0.18,
  semanticMemory: {
    symbols: {
      door: 0.15,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.35,
      "computer-room": 0.64
    }
  }
});
assert(["post-door-computer-room-straight-advance", "post-door-bridge-straight-advance"].includes(postDoorTerminalAdvanceAction.stage), `Post-door terminal/bridge evidence should keep straight advance instead of legacy wall follow (actual=${postDoorTerminalAdvanceAction.stage})`);
assert(["enter-computer-control-room", "reach-central-hall"].includes(postDoorTerminalAdvanceAction.objective), "Post-door terminal/bridge evidence should keep a forward route objective");
assert(postDoorTerminalAdvanceAction.move === "forward", "Post-door terminal false-positive should continue forward into the room");
assert(postDoorTerminalAdvanceAction.use === false, "Post-door terminal false-positive must not pulse Use again");

const postDoorObservedWeakTerminalRuntime = runtimeFactory.create(publicProfile);
postDoorObservedWeakTerminalRuntime.predictions = 1389;
const postDoorObservedWeakTerminalAction = postDoorObservedWeakTerminalRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.10,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.37,
  computerRoomScore: 0.10,
  computerPanelScore: 0.37,
  computerDarkPanelScore: 0.10,
  postDoorTerminalSurface: 0.37,
  bridgeConfidence: 0.00,
  wallVector: 0.49,
  motionForwardProgress: 0.50,
  moveRepeatFrames: 0,
  actionRepeatFrames: 5,
  routeTopologyBarrelZoneEvidence: 0.66,
  routeTopologyCenterCorridorAlignment: -0.08,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.29,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.24,
  firstDoorVision9x9Score: 0.40,
  firstDoorVision9x9RedScore: 0.21,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.26,
  bridgeDoorScore: 0.03,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.00,
      "computer-room": 0.37
    }
  }
});
assert(postDoorObservedWeakTerminalAction.stage === "post-door-terminal-surface-straight-advance", `Observed weak terminal surface should advance into the computer room instead of reacquiring the wall face (actual=${postDoorObservedWeakTerminalAction.stage})`);
assert(postDoorObservedWeakTerminalAction.move === "forward", "Observed post-door terminal surface should keep forward movement into the room");
assert(postDoorObservedWeakTerminalAction.turn === "none", "Observed post-door terminal surface should not turn away from the visible console");

const postDoorTerminalSurfaceFalseEnemyRuntime = runtimeFactory.create(publicProfile);
postDoorTerminalSurfaceFalseEnemyRuntime.predictions = 1917;
const postDoorTerminalSurfaceFalseEnemyAction = postDoorTerminalSurfaceFalseEnemyRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  enemyConfidence: 0.25,
  visualEnemyConfidence: 0.25,
  visualEnemyVisible: true,
  visualEnemySuppressed: false,
  audioEnemyConfidence: 0,
  audioEnemyDirection: "none",
  soundEvent: false,
  usePulseCooldown: 18,
  computerRoomConfidence: 0.23,
  computerRoomScore: 0.16,
  computerPanelScore: 0.00,
  computerDarkPanelScore: 0.02,
  postDoorTerminalSurface: 0.45,
  bridgeConfidence: 0.08,
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 0,
  actionRepeatFrames: 7,
  routeTopologyBarrelZoneEvidence: 0.46,
  routeTopologyCenterCorridorAlignment: 0.01,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.40,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.52,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.24,
  firstDoorVision9x9Score: 0.00,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.40,
  bridgeDoorScore: 0.21,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.40,
      enemy: 0.25,
      "safe-zone": 0.2,
      bridge: 0.08,
      "computer-room": 0.23
    }
  }
});
assert(
  ["post-door-terminal-surface-straight-advance", "post-door-bridge-gap-commit-right", "post-door-corridor-gap-straight-advance"].includes(postDoorTerminalSurfaceFalseEnemyAction.stage),
  `Post-door terminal surface should suppress weak brown false enemy and choose a forward route stage instead of no-idle reacquire (actual=${postDoorTerminalSurfaceFalseEnemyAction.stage})`);
assert(postDoorTerminalSurfaceFalseEnemyAction.move === "forward", "Post-door terminal false enemy suppression should preserve forward movement");
assert(postDoorTerminalSurfaceFalseEnemyAction.stage !== "post-door-no-idle-route-reacquire-right", "Post-door terminal false enemy suppression must not fall back to turn-only route reacquire");

const postDoorObservedDarkPanelRuntime = runtimeFactory.create(publicProfile);
postDoorObservedDarkPanelRuntime.predictions = 5037;
const postDoorObservedDarkPanelAction = postDoorObservedDarkPanelRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.12,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.48,
  computerRoomScore: 0.19,
  computerPanelScore: 0.24,
  computerDarkPanelScore: 0.58,
  postDoorTerminalSurface: 0.58,
  bridgeConfidence: 0.55,
  bridgeLaneVisible: false,
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 0,
  actionRepeatFrames: 1,
  routeTopologyBarrelZoneEvidence: 0.66,
  routeTopologyCenterCorridorAlignment: -0.08,
  footObstacleScore: 0.58,
  motionObstacleScore: 0.58,
  spawnCorridorGapScore: 0.36,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.48,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.00,
  firstDoorVision9x9Score: 0.27,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  bridgeGreenHazard: 0.40,
  bridgeDoorScore: 0.31,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.36,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.55,
      "computer-room": 0.48
    }
  }
});
assert(postDoorObservedDarkPanelAction.stage === "post-door-terminal-surface-straight-advance", `Observed post-door dark computer panel should beat no-idle/turn reacquire (actual=${postDoorObservedDarkPanelAction.stage})`);
assert(postDoorObservedDarkPanelAction.move === "forward", "Observed post-door dark computer panel should keep forward movement");
assert(postDoorObservedDarkPanelAction.turn === "none", "Observed post-door dark computer panel should not keep turning right");

const postDoorBridgeDoorFallbackRuntime = runtimeFactory.create(publicProfile);
postDoorBridgeDoorFallbackRuntime.predictions = 3051;
const postDoorBridgeDoorFallbackAction = postDoorBridgeDoorFallbackRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.12,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0,
  computerRoomScore: 0,
  computerPanelScore: 0,
  computerDarkPanelScore: 0,
  postDoorTerminalSurface: 0,
  bridgeConfidence: 0.45,
  bridgeLaneVisible: true,
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 0,
  actionRepeatFrames: 1,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.41,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.53,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.00,
  firstDoorVision9x9Score: 0.17,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  bridgeGreenHazard: 0.45,
  bridgeDoorScore: 0.36,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.36,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.45,
      "computer-room": 0
    }
  }
});
assert(postDoorBridgeDoorFallbackAction.stage === "post-door-terminal-surface-straight-advance", `Post-door bridge-door/gap fallback should advance straight instead of route-reacquire right (actual=${postDoorBridgeDoorFallbackAction.stage})`);
assert(postDoorBridgeDoorFallbackAction.move === "forward", "Post-door bridge-door fallback should keep forward movement");
assert(postDoorBridgeDoorFallbackAction.turn === "none", "Post-door bridge-door fallback should not steer right back into the wall face");

const postDoorForwardWallReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorForwardWallReleaseRuntime.predictions = 5346;
const postDoorForwardWallReleaseAction = postDoorForwardWallReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.10,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.13,
  bridgeConfidence: 0.07,
  wallVector: 0.49,
  motionForwardProgress: 0.02,
  moveRepeatFrames: 45,
  actionRepeatFrames: 45,
  routeDeadEndRisk: false,
  routeTopologyBarrelZoneEvidence: 0.43,
  routeTopologyCenterCorridorAlignment: 0.0,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.34,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.32,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0.13,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: true,
  bridgeGreenHazard: 0.16,
  bridgeDoorScore: 0.01,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.07,
      "computer-room": 0.13
    }
  }
});
assert(postDoorForwardWallReleaseAction.stage === "post-door-forward-wall-release-right", `Post-door negative forward progress should release straight advance and yaw right (actual=${postDoorForwardWallReleaseAction.stage})`);
assert(postDoorForwardWallReleaseAction.move === "none", "Post-door wall release should stop forward pressure before turning");
assert(postDoorForwardWallReleaseAction.turn === "right", "Post-door wall release should yaw right toward the bridge side");

const postDoorLowComputerForwardWallReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorLowComputerForwardWallReleaseRuntime.predictions = 2442;
const postDoorLowComputerForwardWallReleaseAction = postDoorLowComputerForwardWallReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.07,
  bridgeConfidence: 0.07,
  wallVector: 0.49,
  motionForwardProgress: 0.02,
  moveRepeatFrames: 47,
  actionRepeatFrames: 47,
  routeDeadEndRisk: false,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.29,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.18,
  bridgeDoorScore: 0.00,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.01,
      "computer-room": 0.07
    }
  }
});
assert(postDoorLowComputerForwardWallReleaseAction.stage === "post-door-forward-wall-release-right", `Post-door wall release must not depend on computer-room confidence after door open (actual=${postDoorLowComputerForwardWallReleaseAction.stage})`);
assert(postDoorLowComputerForwardWallReleaseAction.move === "none", "Low-confidence post-door wall release should stop forward pressure");
assert(postDoorLowComputerForwardWallReleaseAction.turn === "right", "Low-confidence post-door wall release should yaw right toward the bridge side");

const postDoorLowFootWallReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorLowFootWallReleaseRuntime.predictions = 1883;
const postDoorLowFootWallReleaseAction = postDoorLowFootWallReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.14,
  bridgeConfidence: 0.25,
  wallVector: 0.49,
  motionForwardProgress: 0.03,
  moveRepeatFrames: 106,
  actionRepeatFrames: 106,
  routeDeadEndRisk: false,
  footObstacleScore: 0.57,
  motionObstacleScore: 0.57,
  spawnCorridorGapScore: 0.17,
  spawnCorridorGapTurn: "left",
  spawnLandmarkRouteEvidence: 0.30,
  spawnLandmarkRouteTurn: "left",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.03,
  bridgeDoorScore: 0.09,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.25,
      "computer-room": 0.14
    }
  }
});
assert(postDoorLowFootWallReleaseAction.stage === "post-door-forward-wall-release-right", `Post-door wall release should catch 0.55-band foot pressure when bridge lane is not visible (actual=${postDoorLowFootWallReleaseAction.stage})`);
assert(postDoorLowFootWallReleaseAction.move === "none", "0.55-band post-door wall release should stop forward pressure");
assert(postDoorLowFootWallReleaseAction.turn === "right", "0.55-band post-door wall release should yaw right toward bridge reacquire");

const postDoorZeroProgressReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorZeroProgressReleaseRuntime.predictions = 2103;
const postDoorZeroProgressReleaseAction = postDoorZeroProgressReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.07,
  bridgeConfidence: 0.31,
  wallVector: 0.49,
  motionForwardProgress: 0.00,
  moveRepeatFrames: 6,
  actionRepeatFrames: 6,
  routeDeadEndRisk: false,
  footObstacleScore: 0.57,
  motionObstacleScore: 0.57,
  spawnCorridorGapScore: 0.29,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.43,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: true,
  bridgeGreenHazard: 0.21,
  bridgeDoorScore: 0.01,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.31,
      "computer-room": 0.07
    }
  }
});
assert(postDoorZeroProgressReleaseAction.stage === "post-door-forward-zero-release-right", `Post-door zero-progress wall pressure should release even after repeat counters reset (actual=${postDoorZeroProgressReleaseAction.stage})`);
assert(postDoorZeroProgressReleaseAction.move === "none", "Zero-progress post-door release should stop forward pressure");
assert(postDoorZeroProgressReleaseAction.turn === "right", "Zero-progress post-door release should yaw right toward bridge reacquire");

const postDoorForwardNegativeReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorForwardNegativeReleaseRuntime.predictions = 1682;
const postDoorForwardNegativeReleaseAction = postDoorForwardNegativeReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.10,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.18,
  bridgeConfidence: 0.01,
  wallVector: 0.49,
  motionForwardProgress: -0.06,
  moveRepeatFrames: 2,
  actionRepeatFrames: 2,
  routeDeadEndRisk: false,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.31,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.43,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0.18,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.16,
  bridgeDoorScore: 0.08,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.01,
      "computer-room": 0.18
    }
  }
});
assert(postDoorForwardNegativeReleaseAction.stage === "post-door-forward-negative-release-right", `Post-door negative progress should yaw right even when repeats reset (actual=${postDoorForwardNegativeReleaseAction.stage})`);
assert(postDoorForwardNegativeReleaseAction.move === "none", "Post-door negative release should stop forward pressure before turning");
assert(postDoorForwardNegativeReleaseAction.turn === "right", "Post-door negative release should yaw right toward the bridge side");

const postDoorForwardRepeatReacquireRuntime = runtimeFactory.create(publicProfile);
postDoorForwardRepeatReacquireRuntime.predictions = 2588;
const postDoorForwardRepeatReacquireAction = postDoorForwardRepeatReacquireRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.08,
  bridgeConfidence: 0.32,
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 83,
  actionRepeatFrames: 83,
  routeDeadEndRisk: false,
  routeTopologyWallDistanceNormalized: 0.53,
  routeTopologyBarrelZoneEvidence: 0.47,
  routeTopologyCenterCorridorAlignment: 0.01,
  footObstacleScore: 0.54,
  motionObstacleScore: 0.54,
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: true,
  bridgeGreenHazard: 0.20,
  bridgeDoorScore: 0.00,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.32,
      "computer-room": 0.08
    }
  }
});
assert(postDoorForwardRepeatReacquireAction.stage === "post-door-forward-repeat-reacquire-right", `Post-door repeated straight wall view should reacquire right instead of holding forward (actual=${postDoorForwardRepeatReacquireAction.stage})`);
assert(postDoorForwardRepeatReacquireAction.move === "none", "Repeated post-door straight reacquire should stop forward pressure");
assert(postDoorForwardRepeatReacquireAction.turn === "right", "Repeated post-door straight reacquire should yaw right toward bridge evidence");

const postDoorTerminalForwardRepeatReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorTerminalForwardRepeatReleaseRuntime.predictions = 3890;
const postDoorTerminalForwardRepeatReleaseAction = postDoorTerminalForwardRepeatReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.10,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.09,
  computerRoomScore: 0.08,
  computerPanelScore: 0.45,
  computerDarkPanelScore: 0.32,
  postDoorTerminalSurface: 0.32,
  bridgeConfidence: 0.48,
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 0,
  actionRepeatFrames: 24,
  routeDeadEndRisk: true,
  routeTopologyWallDistanceNormalized: 0.33,
  routeTopologyBarrelZoneEvidence: 1.00,
  routeTopologyCenterCorridorAlignment: -0.31,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.23,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.39,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  bridgeDoorScore: 0.33,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.09,
      "computer-room": 0.09
    }
  }
});
assert(
  postDoorTerminalForwardRepeatReleaseAction.stage === "post-door-terminal-forward-repeat-release-right"
    || postDoorTerminalForwardRepeatReleaseAction.stage === "post-door-terminal-dead-end-release-right",
  `Repeated terminal/wall forward pressure should release right before terminal straight advance (actual=${postDoorTerminalForwardRepeatReleaseAction.stage})`);
assert(postDoorTerminalForwardRepeatReleaseAction.move === "none", "Repeated terminal/wall release should stop forward pressure");
assert(postDoorTerminalForwardRepeatReleaseAction.turn === "right", "Repeated terminal/wall release should yaw right toward the bridge route");

const postDoorTerminalReleaseRightHoldRuntime = runtimeFactory.create(publicProfile);
postDoorTerminalReleaseRightHoldRuntime.predictions = 3904;
const postDoorTerminalReleaseRightHoldAction = postDoorTerminalReleaseRightHoldRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.10,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.12,
  computerRoomScore: 0.08,
  computerPanelScore: 0.07,
  computerDarkPanelScore: 0.38,
  postDoorTerminalSurface: 0.38,
  bridgeConfidence: 0.18,
  wallVector: 0.49,
  motionForwardProgress: 0.05,
  moveRepeatFrames: 0,
  actionRepeatFrames: 2,
  turnRepeatFrames: 2,
  routeDeadEndRisk: false,
  footObstacleScore: 0.33,
  motionObstacleScore: 0.33,
  spawnCorridorGapScore: 0.28,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.40,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.24,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  bridgeDoorScore: 0.01,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.18,
      "computer-room": 0.12
    }
  }
});
assert(postDoorTerminalReleaseRightHoldAction.stage === "post-door-terminal-release-right-hold", `Post-door terminal release should hold right reacquire before terminal advance resumes (actual=${postDoorTerminalReleaseRightHoldAction.stage})`);
assert(postDoorTerminalReleaseRightHoldAction.move === "none", "Post-door terminal release hold should keep forward pressure off");
assert(postDoorTerminalReleaseRightHoldAction.turn === "right", "Post-door terminal release hold should keep yawing right");

const postDoorTerminalHoldBudgetReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorTerminalHoldBudgetReleaseRuntime.predictions = 4870;
const postDoorTerminalHoldBudgetReleaseAction = postDoorTerminalHoldBudgetReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.10,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.14,
  computerRoomScore: 0.14,
  computerPanelScore: 0.08,
  computerDarkPanelScore: 0.54,
  postDoorTerminalSurface: 0.54,
  bridgeConfidence: 0.23,
  wallVector: 0.49,
  motionForwardProgress: 0.05,
  moveRepeatFrames: 6,
  actionRepeatFrames: 6,
  turnRepeatFrames: 4,
  routeLoopBudgetExceeded: true,
  routeAbortHint: "corner-stall",
  routeDeadEndRisk: false,
  footObstacleScore: 0.60,
  motionObstacleScore: 0.60,
  spawnCorridorGapScore: 0.16,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.31,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  bridgeDoorScore: 0.17,
  semanticMemory: {
    symbols: {
      door: 0.17,
      corridor: 0.16,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.23,
      "computer-room": 0.14
    }
  }
});
assert(postDoorTerminalHoldBudgetReleaseAction.stage !== "post-door-terminal-release-right-hold", "Post-door terminal hold should yield when loop budget is exceeded");
assert(postDoorTerminalHoldBudgetReleaseAction.stage === "post-door-terminal-loop-budget-backoff-right", `Post-door loop-budget should first back off from the terminal corner (actual=${postDoorTerminalHoldBudgetReleaseAction.stage})`);
assert(postDoorTerminalHoldBudgetReleaseAction.move === "back", "Post-door loop-budget backoff should move backward at the corner");
assert(postDoorTerminalHoldBudgetReleaseAction.turn === "right", "Post-door loop-budget backoff should yaw right while clearing the corner");

const postDoorTerminalLoopBudgetReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorTerminalLoopBudgetReleaseRuntime.predictions = 4888;
const postDoorTerminalLoopBudgetReleaseAction = postDoorTerminalLoopBudgetReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.10,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.14,
  computerRoomScore: 0.14,
  computerPanelScore: 0.08,
  computerDarkPanelScore: 0.54,
  postDoorTerminalSurface: 0.54,
  bridgeConfidence: 0.23,
  wallVector: 0.49,
  motionForwardProgress: 0.05,
  moveRepeatFrames: 6,
  actionRepeatFrames: 16,
  turnRepeatFrames: 8,
  routeLoopBudgetExceeded: true,
  routeAbortHint: "corner-stall",
  routeDeadEndRisk: false,
  footObstacleScore: 0.60,
  motionObstacleScore: 0.60,
  spawnCorridorGapScore: 0.16,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.31,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  bridgeDoorScore: 0.17,
  semanticMemory: {
    symbols: {
      door: 0.17,
      corridor: 0.16,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.23,
      "computer-room": 0.14
    }
  }
});
assert(postDoorTerminalLoopBudgetReleaseAction.stage === "post-door-terminal-loop-budget-release-right", `Post-door loop-budget should fall back to right release after the backoff pulse (actual=${postDoorTerminalLoopBudgetReleaseAction.stage})`);
assert(postDoorTerminalLoopBudgetReleaseAction.move === "none", "Post-door loop-budget release should keep forward pressure off after the backoff pulse");
assert(postDoorTerminalLoopBudgetReleaseAction.turn === "right", "Post-door loop-budget release should continue yawing right after the backoff pulse");

const postDoorTerminalGapRightAdvanceRuntime = runtimeFactory.create(publicProfile);
postDoorTerminalGapRightAdvanceRuntime.predictions = 4932;
const postDoorTerminalGapRightAdvanceAction = postDoorTerminalGapRightAdvanceRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.12,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.12,
  computerRoomScore: 0.12,
  computerPanelScore: 0.05,
  computerDarkPanelScore: 0.37,
  postDoorTerminalSurface: 0.37,
  bridgeConfidence: 0.16,
  wallVector: 0.42,
  motionForwardProgress: 0.12,
  moveRepeatFrames: 4,
  actionRepeatFrames: 4,
  turnRepeatFrames: 2,
  routeLoopBudgetExceeded: false,
  routeAbortHint: "none",
  routeDeadEndRisk: false,
  footObstacleScore: 0.63,
  motionObstacleScore: 0.63,
  spawnCorridorGapScore: 0.26,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.42,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  bridgeDoorScore: 0.08,
  semanticMemory: {
    symbols: {
      door: 0.08,
      corridor: 0.26,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.16,
      "computer-room": 0.12
    }
  }
});
assert(postDoorTerminalGapRightAdvanceAction.stage === "post-door-terminal-gap-right-advance", `Post-door terminal/gap recovery should advance forward/right instead of stopping in release hold (actual=${postDoorTerminalGapRightAdvanceAction.stage})`);
assert(postDoorTerminalGapRightAdvanceAction.move === "forward", "Post-door terminal/gap recovery should keep forward pressure");
assert(postDoorTerminalGapRightAdvanceAction.turn === "right", "Post-door terminal/gap recovery should keep yawing right");

const postDoorBridgeGapCommitRightRuntime = runtimeFactory.create(publicProfile);
postDoorBridgeGapCommitRightRuntime.predictions = 4688;
const postDoorBridgeGapCommitRightAction = postDoorBridgeGapCommitRightRuntime.predict({
  health: 100,
  depthSig: 0.85,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.12,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.15,
  computerRoomScore: 0.15,
  computerPanelScore: 0.37,
  computerDarkPanelScore: 0.30,
  postDoorTerminalSurface: 0.37,
  bridgeConfidence: 0.23,
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0.27,
  wallVector: 0.56,
  motionForwardProgress: 0.12,
  moveRepeatFrames: 0,
  actionRepeatFrames: 12,
  turnRepeatFrames: 11,
  routeDeadEndRisk: false,
  routePostDoorTerminalDeadEndScore: 0,
  routeTopologyWallDistanceNormalized: 0.56,
  routeTopologyBarrelZoneEvidence: 0.42,
  routeTopologyCenterCorridorAlignment: 0.06,
  footObstacleScore: 0.57,
  motionObstacleScore: 0.57,
  spawnCorridorGapScore: 0.37,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.49,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.27,
      corridor: 0.37,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.23,
      "computer-room": 0.15
    }
  }
});
assert(postDoorBridgeGapCommitRightAction.stage === "post-door-bridge-gap-commit-right", `Post-door bridge/gap evidence should commit forward/right instead of holding turn in place (actual=${postDoorBridgeGapCommitRightAction.stage})`);
assert(postDoorBridgeGapCommitRightAction.move === "forward", "Post-door bridge/gap commit should restore forward pressure");
assert(postDoorBridgeGapCommitRightAction.turn === "right", "Post-door bridge/gap commit should keep a shallow right yaw");

const postDoorBridgeGapWeakSustainRuntime = runtimeFactory.create(publicProfile);
postDoorBridgeGapWeakSustainRuntime.predictions = 4702;
const postDoorBridgeGapWeakSustainAction = postDoorBridgeGapWeakSustainRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.12,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.12,
  computerRoomScore: 0.12,
  computerPanelScore: 0.11,
  computerDarkPanelScore: 0.43,
  postDoorTerminalSurface: 0.43,
  bridgeConfidence: 0.25,
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0.14,
  wallVector: 0.49,
  motionForwardProgress: 0.57,
  moveRepeatFrames: 27,
  actionRepeatFrames: 27,
  turnRepeatFrames: 0,
  routeDeadEndRisk: false,
  routePostDoorTerminalDeadEndScore: 1,
  routeTopologyWallDistanceNormalized: 0.33,
  routeTopologyBarrelZoneEvidence: 1.00,
  routeTopologyCenterCorridorAlignment: -0.32,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.23,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.14,
      corridor: 0.23,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.25,
      "computer-room": 0.12
    }
  }
});
const postDoorWeakBridgeTerminalRightRealignRuntime = runtimeFactory.create(publicProfile);
postDoorWeakBridgeTerminalRightRealignRuntime.predictions = 2058;
const postDoorWeakBridgeTerminalRightRealignAction = postDoorWeakBridgeTerminalRightRealignRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.28,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.12,
  computerRoomScore: 0.12,
  computerPanelScore: 0.15,
  computerDarkPanelScore: 0.38,
  postDoorTerminalSurface: 0.38,
  bridgeConfidence: 0.21,
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.19,
  wallVector: 0.49,
  motionForwardProgress: 0.24,
  moveRepeatFrames: 27,
  actionRepeatFrames: 27,
  turnRepeatFrames: 0,
  routeDeadEndRisk: false,
  routePostDoorTerminalDeadEndScore: 0,
  routeTopologyWallDistanceNormalized: 0.36,
  routeTopologyBarrelZoneEvidence: 0.46,
  routeTopologyCenterCorridorAlignment: -0.06,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.25,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.29,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  blueFloorScore: 0.00,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.19,
      corridor: 0.25,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.21,
      "computer-room": 0.12
    }
  }
});
assert(postDoorWeakBridgeTerminalRightRealignAction.stage === "post-door-weak-bridge-terminal-right-realign", `Weak bridge terminal contact should stop forward pressure and realign right (actual=${postDoorWeakBridgeTerminalRightRealignAction.stage})`);
assert(postDoorWeakBridgeTerminalRightRealignAction.move === "none", "Weak bridge terminal realign should stop forward pressure");
assert(postDoorWeakBridgeTerminalRightRealignAction.turn === "right", "Weak bridge terminal realign should yaw right toward the bridge route");

const postDoorTerminalWallfaceRightRealignRuntime = runtimeFactory.create(publicProfile);
postDoorTerminalWallfaceRightRealignRuntime.predictions = 2694;
const postDoorTerminalWallfaceRightRealignAction = postDoorTerminalWallfaceRightRealignRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.20,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.11,
  computerRoomScore: 0.11,
  computerPanelScore: 0.17,
  computerDarkPanelScore: 0.29,
  postDoorTerminalSurface: 0.29,
  bridgeConfidence: 0.00,
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.00,
  wallVector: 0.49,
  motionForwardProgress: -0.02,
  moveRepeatFrames: 31,
  actionRepeatFrames: 31,
  turnRepeatFrames: 0,
  routeDeadEndRisk: false,
  routePostDoorTerminalDeadEndScore: 0,
  routeTopologyWallDistanceNormalized: 0.34,
  routeTopologyBarrelZoneEvidence: 0.48,
  routeTopologyCenterCorridorAlignment: -0.08,
  footObstacleScore: 0.57,
  motionObstacleScore: 0.57,
  spawnCorridorGapScore: 0.26,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  blueFloorScore: 0.00,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.10,
      corridor: 0.26,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.00,
      "computer-room": 0.11
    }
  }
});
assert(postDoorTerminalWallfaceRightRealignAction.stage === "post-door-terminal-wallface-right-realign", `Terminal wall-face contact should release forward pressure before terminal advance (actual=${postDoorTerminalWallfaceRightRealignAction.stage})`);
assert(postDoorTerminalWallfaceRightRealignAction.move === "none", "Terminal wall-face realign should stop forward pressure");
assert(postDoorTerminalWallfaceRightRealignAction.turn === "right", "Terminal wall-face realign should yaw right toward the bridge route");

assert(postDoorBridgeGapWeakSustainAction.stage === "post-door-bridge-gap-weak-sustain-right", `Weak bridge evidence should sustain forward/right instead of yielding to dead-end release (actual=${postDoorBridgeGapWeakSustainAction.stage})`);
assert(postDoorBridgeGapWeakSustainAction.move === "forward", "Weak bridge sustain should keep forward pressure");
assert(postDoorBridgeGapWeakSustainAction.turn === "right", "Weak bridge sustain should keep a shallow right yaw");

const postDoorBridgeLockSustainRuntime = runtimeFactory.create(publicProfile);
postDoorBridgeLockSustainRuntime.predictions = 4710;
const postDoorBridgeLockSustainAction = postDoorBridgeLockSustainRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.12,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.12,
  computerRoomScore: 0.12,
  computerPanelScore: 0.11,
  computerDarkPanelScore: 0.43,
  postDoorTerminalSurface: 0.43,
  bridgeConfidence: 0.22,
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0.09,
  wallVector: 0.49,
  motionForwardProgress: 0.57,
  moveRepeatFrames: 32,
  actionRepeatFrames: 32,
  turnRepeatFrames: 0,
  routeCorridorBridgeLock: true,
  routeCorridorBridgeLockFrames: 6,
  routeDeadEndRisk: false,
  routePostDoorTerminalDeadEndScore: 1,
  routeTopologyWallDistanceNormalized: 0.33,
  routeTopologyBarrelZoneEvidence: 1.00,
  routeTopologyCenterCorridorAlignment: -0.32,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.28,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.09,
      corridor: 0.20,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.22,
      "computer-room": 0.12
    }
  }
});
assert(postDoorBridgeLockSustainAction.stage === "post-door-bridge-lock-sustain-right", `Post-door bridge lock should sustain forward/right before terminal release (actual=${postDoorBridgeLockSustainAction.stage})`);
assert(postDoorBridgeLockSustainAction.move === "forward", "Post-door bridge lock sustain should keep forward pressure");
assert(postDoorBridgeLockSustainAction.turn === "right", "Post-door bridge lock sustain should keep a shallow right yaw");

const postDoorCentralDoorCorridorUseRuntime = runtimeFactory.create(publicProfile);
postDoorCentralDoorCorridorUseRuntime.predictions = 4820;
const postDoorCentralDoorCorridorUseAction = postDoorCentralDoorCorridorUseRuntime.predict({
  health: 100,
  depthSig: 0.52,
  contextDict: "corridor",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.13,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  usePulseCooldown: 0,
  computerRoomConfidence: 0.16,
  computerRoomScore: 0.16,
  computerPanelScore: 0.16,
  computerDarkPanelScore: 0.53,
  postDoorTerminalSurface: 0.53,
  bridgeConfidence: 0.30,
  bridgeLaneTurn: "none",
  bridgeDoorScore: 0.30,
  wallVector: 0.49,
  motionForwardProgress: 0.29,
  moveRepeatFrames: 80,
  actionRepeatFrames: 80,
  turnRepeatFrames: 0,
  routeCorridorBridgeLock: true,
  routeCorridorBridgeLockFrames: 12,
  routeDeadEndRisk: false,
  footObstacleScore: 0.24,
  motionObstacleScore: 0.24,
  spawnCorridorGapScore: 0.34,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.00,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.30,
      corridor: 0.34,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.30,
      "computer-room": 0.16
    }
  }
});
assert(postDoorCentralDoorCorridorUseAction.stage === "post-door-central-door-corridor-use", `Post-door corridor door evidence should stop and pulse Use instead of keeping bridge lock forever (actual=${postDoorCentralDoorCorridorUseAction.stage})`);
assert(postDoorCentralDoorCorridorUseAction.move === "none", "Post-door central door use should stop before using");
assert(postDoorCentralDoorCorridorUseAction.use === true, "Post-door central door use should pulse Use");

const postDoorCentralDoorBridgeUseRuntime = runtimeFactory.create(publicProfile);
postDoorCentralDoorBridgeUseRuntime.predictions = 4910;
const postDoorCentralDoorBridgeUseAction = postDoorCentralDoorBridgeUseRuntime.predict({
  health: 100,
  depthSig: 0.51,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: true,
  visualEnemyConfidence: 0.28,
  visualEnemySuppressed: false,
  audioEnemyConfidence: 0,
  soundEvent: false,
  usePulseCooldown: 0,
  computerRoomConfidence: 0.18,
  computerRoomScore: 0.18,
  computerPanelScore: 0.00,
  computerDarkPanelScore: 0.63,
  postDoorTerminalSurface: 0.63,
  bridgeConfidence: 0.53,
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0.40,
  wallVector: 0.42,
  motionForwardProgress: 0.05,
  moveRepeatFrames: 10,
  actionRepeatFrames: 10,
  turnRepeatFrames: 3,
  routeLoopBudgetExceeded: false,
  routeAbortHint: "none",
  routeDeadEndRisk: false,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.30,
  spawnCorridorGapTurn: "left",
  spawnLandmarkRouteEvidence: 0.42,
  spawnLandmarkRouteTurn: "left",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: true,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.40,
      corridor: 0.30,
      enemy: 0.28,
      "safe-zone": 0.2,
      bridge: 0.53,
      "computer-room": 0.18
    }
  }
});
assert(postDoorCentralDoorBridgeUseAction.stage === "post-door-central-door-bridge-use", `Post-door bridge-door evidence should Use even when context and enemy chips are noisy (actual=${postDoorCentralDoorBridgeUseAction.stage})`);
assert(postDoorCentralDoorBridgeUseAction.move === "none", "Post-door bridge-door Use should stop before using");
assert(postDoorCentralDoorBridgeUseAction.use === true, "Post-door bridge-door evidence should pulse Use");

const postDoorCentralDoorBridgeMemoryUseRuntime = runtimeFactory.create(publicProfile);
postDoorCentralDoorBridgeMemoryUseRuntime.predictions = 4938;
const postDoorCentralDoorBridgeMemoryUseAction = postDoorCentralDoorBridgeMemoryUseRuntime.predict({
  health: 100,
  depthSig: 0.60,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.12,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  usePulseCooldown: 0,
  computerRoomConfidence: 0.13,
  computerRoomScore: 0.13,
  computerPanelScore: 0.08,
  computerDarkPanelScore: 0.37,
  bridgeConfidence: 0.16,
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.08,
  wallVector: 0.42,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 8,
  actionRepeatFrames: 8,
  turnRepeatFrames: 2,
  routePostDoorBridgeDoorMemoryFrames: 12,
  routeDeadEndRisk: false,
  footObstacleScore: 0.46,
  motionObstacleScore: 0.46,
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.34,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.08,
      corridor: 0.22,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.16,
      "computer-room": 0.13
    }
  }
});
assert(postDoorCentralDoorBridgeMemoryUseAction.stage === "post-door-central-door-bridge-memory-use", `Post-door bridge-door memory should spend Use before terminal reacquire steals focus (actual=${postDoorCentralDoorBridgeMemoryUseAction.stage})`);
assert(postDoorCentralDoorBridgeMemoryUseAction.move === "none", "Post-door bridge-door memory Use should stop before using");
assert(postDoorCentralDoorBridgeMemoryUseAction.use === true, "Post-door bridge-door memory should emit one bounded Use pulse");

const postDoorBridgeMemorySustainRuntime = runtimeFactory.create(publicProfile);
postDoorBridgeMemorySustainRuntime.predictions = 4948;
const postDoorBridgeMemorySustainAction = postDoorBridgeMemorySustainRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.12,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  usePulseCooldown: 48,
  computerRoomConfidence: 0.12,
  computerRoomScore: 0.12,
  computerPanelScore: 0.07,
  computerDarkPanelScore: 0.31,
  bridgeConfidence: 0.12,
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.04,
  wallVector: 0.42,
  motionForwardProgress: 0.12,
  moveRepeatFrames: 10,
  actionRepeatFrames: 10,
  turnRepeatFrames: 2,
  routePostDoorBridgeDoorMemoryFrames: 8,
  routeLoopBudgetExceeded: false,
  routeDeadEndRisk: false,
  routePostDoorTerminalDeadEndScore: 0,
  footObstacleScore: 0.52,
  motionObstacleScore: 0.52,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.31,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.04,
      corridor: 0.20,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.12,
      "computer-room": 0.12
    }
  }
});
assert(postDoorBridgeMemorySustainAction.stage === "post-door-bridge-memory-sustain-right", `Post-door bridge-door memory should sustain right route evidence while Use is cooling down (actual=${postDoorBridgeMemorySustainAction.stage})`);
assert(postDoorBridgeMemorySustainAction.move === "forward", "Post-door bridge-door memory sustain should keep forward pressure");
assert(postDoorBridgeMemorySustainAction.turn === "right", "Post-door bridge-door memory sustain should keep a shallow right yaw");

const postDoorCentralDoorBridgeMemoryFarUseRuntime = runtimeFactory.create(publicProfile);
postDoorCentralDoorBridgeMemoryFarUseRuntime.predictions = 4960;
const postDoorCentralDoorBridgeMemoryFarUseAction = postDoorCentralDoorBridgeMemoryFarUseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.75,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  usePulseCooldown: 0,
  computerRoomConfidence: 0.14,
  computerRoomScore: 0.14,
  computerPanelScore: 0.14,
  computerDarkPanelScore: 0.35,
  postDoorTerminalSurface: 0.37,
  bridgeConfidence: 0.25,
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.18,
  wallVector: 0.42,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 16,
  actionRepeatFrames: 16,
  turnRepeatFrames: 4,
  routePostDoorBridgeDoorMemoryFrames: 1,
  routeLoopBudgetExceeded: false,
  routeDeadEndRisk: false,
  routePostDoorTerminalDeadEndScore: 0,
  routeTopologyWallDistanceNormalized: 0.62,
  routeTopologyBarrelZoneEvidence: 0.35,
  routeTopologyCenterCorridorAlignment: 0.08,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.24,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.41,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.18,
      corridor: 0.29,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.25,
      "computer-room": 0.14
    }
  }
});
assert(postDoorCentralDoorBridgeMemoryFarUseAction.stage === "post-door-central-door-bridge-memory-far-use", `Post-door weak bridge-door structure should allow one far-depth Use even when the short door memory is nearly expired (actual=${postDoorCentralDoorBridgeMemoryFarUseAction.stage})`);
assert(postDoorCentralDoorBridgeMemoryFarUseAction.move === "none", "Post-door weak bridge-door far Use should stop before using");
assert(postDoorCentralDoorBridgeMemoryFarUseAction.use === true, "Post-door weak bridge-door far Use should emit one bounded Use pulse");

const postDoorCentralDoorBridgeGapUseRuntime = runtimeFactory.create(publicProfile);
postDoorCentralDoorBridgeGapUseRuntime.predictions = 4970;
const postDoorCentralDoorBridgeGapUseAction = postDoorCentralDoorBridgeGapUseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.20,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  usePulseCooldown: 0,
  computerRoomConfidence: 0.18,
  computerRoomScore: 0.18,
  computerPanelScore: 0.02,
  computerDarkPanelScore: 0.44,
  postDoorTerminalSurface: 0.44,
  bridgeConfidence: 0.12,
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0.25,
  wallVector: 0.42,
  motionForwardProgress: 0.50,
  moveRepeatFrames: 12,
  actionRepeatFrames: 12,
  turnRepeatFrames: 2,
  routeLoopBudgetExceeded: false,
  routeDeadEndRisk: false,
  routePostDoorTerminalDeadEndScore: 0,
  footObstacleScore: 0.50,
  motionObstacleScore: 0.50,
  spawnCorridorGapScore: 0.34,
  spawnCorridorGapTurn: "left",
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "left",
  spawnSecretDoorScore: 0.00,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.25,
      corridor: 0.34,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.12,
      "computer-room": 0.18
    }
  }
});
assert(postDoorCentralDoorBridgeGapUseAction.stage === "post-door-central-door-bridge-gap-use", `Post-door strong gap plus medium bridge-door evidence should stop and Use instead of committing right (actual=${postDoorCentralDoorBridgeGapUseAction.stage})`);
assert(postDoorCentralDoorBridgeGapUseAction.move === "none", "Post-door bridge-gap Use should stop before using");
assert(postDoorCentralDoorBridgeGapUseAction.use === true, "Post-door bridge-gap Use should emit one bounded Use pulse");

const postDoorCentralDoorTerminalFarUseRuntime = runtimeFactory.create(publicProfile);
postDoorCentralDoorTerminalFarUseRuntime.predictions = 4974;
const postDoorCentralDoorTerminalFarUseAction = postDoorCentralDoorTerminalFarUseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.28,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  usePulseCooldown: 0,
  computerRoomConfidence: 0.14,
  computerRoomScore: 0.14,
  computerPanelScore: 0.10,
  computerDarkPanelScore: 0.52,
  postDoorTerminalSurface: 0.52,
  bridgeConfidence: 0.29,
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.24,
  wallVector: 0.42,
  motionForwardProgress: 0.60,
  moveRepeatFrames: 9,
  actionRepeatFrames: 9,
  turnRepeatFrames: 3,
  routeLoopBudgetExceeded: false,
  routeDeadEndRisk: false,
  routePostDoorTerminalDeadEndScore: 0,
  routeTopologyWallDistanceNormalized: 0.62,
  routeTopologyBarrelZoneEvidence: 0.35,
  routeTopologyCenterCorridorAlignment: 0.08,
  footObstacleScore: 0.60,
  motionObstacleScore: 0.60,
  spawnCorridorGapScore: 0.16,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.31,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.24,
      corridor: 0.16,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.29,
      "computer-room": 0.14
    }
  }
});
assert(postDoorCentralDoorTerminalFarUseAction.stage === "post-door-central-door-terminal-far-use", `Post-door strong terminal surface plus weak bridge-door evidence should stop and Use instead of holding right (actual=${postDoorCentralDoorTerminalFarUseAction.stage})`);
assert(postDoorCentralDoorTerminalFarUseAction.move === "none", "Post-door terminal far Use should stop before using");
assert(postDoorCentralDoorTerminalFarUseAction.use === true, "Post-door terminal far Use should emit one bounded Use pulse");

const postDoorCentralDoorContactRetryUseRuntime = runtimeFactory.create(publicProfile);
postDoorCentralDoorContactRetryUseRuntime.predictions = 5004;
const postDoorCentralDoorContactRetryUseAction = postDoorCentralDoorContactRetryUseRuntime.predict({
  health: 100,
  depthSig: 0.33,
  contextDict: "wall",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.75,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  usePulseCooldown: 0,
  computerRoomConfidence: 0.15,
  computerRoomScore: 0.15,
  computerPanelScore: 0.15,
  computerDarkPanelScore: 0.30,
  bridgeConfidence: 0.18,
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0.12,
  wallVector: 0.42,
  motionForwardProgress: 0.05,
  moveRepeatFrames: 0,
  actionRepeatFrames: 14,
  turnRepeatFrames: 8,
  routeLoopBudgetExceeded: false,
  routeDeadEndRisk: false,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.36,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.48,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.45,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.36,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.18,
      "computer-room": 0.15
    }
  }
});
assert(postDoorCentralDoorContactRetryUseAction.stage === "post-door-central-door-contact-retry-use", `Post-door wall-contact bridge evidence should retry Use instead of yawing away (actual=${postDoorCentralDoorContactRetryUseAction.stage})`);
assert(postDoorCentralDoorContactRetryUseAction.move === "none", "Post-door contact retry should stop before using");
assert(postDoorCentralDoorContactRetryUseAction.use === true, "Post-door contact retry should emit one bounded Use pulse");

const postDoorBlueFloorContactSuppressRuntime = runtimeFactory.create(publicProfile);
postDoorBlueFloorContactSuppressRuntime.predictions = 5012;
const postDoorBlueFloorContactSuppressAction = postDoorBlueFloorContactSuppressRuntime.predict({
  health: 100,
  depthSig: 0.33,
  contextDict: "wall",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.75,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  usePulseCooldown: 0,
  computerRoomConfidence: 0.17,
  computerRoomScore: 0.17,
  computerPanelScore: 0.17,
  computerDarkPanelScore: 0.45,
  postDoorTerminalSurface: 0.45,
  blueFloorScore: 0.29,
  bridgeConfidence: 0.40,
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.38,
  wallVector: 0.42,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 0,
  actionRepeatFrames: 14,
  turnRepeatFrames: 8,
  routeLoopBudgetExceeded: false,
  routeDeadEndRisk: false,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.36,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.48,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.38,
      corridor: 0.36,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.40,
      "computer-room": 0.17
    }
  }
});
assert(postDoorBlueFloorContactSuppressAction.stage !== "post-door-central-door-contact-retry-use", `Blue-floor terminal context must not reuse central-door contact retry (actual=${postDoorBlueFloorContactSuppressAction.stage})`);
assert(postDoorBlueFloorContactSuppressAction.use === false, "Blue-floor terminal context should suppress post-door central-door Use pulses");

const postDoorLeftWallRoomEntryRealignRuntime = runtimeFactory.create(publicProfile);
postDoorLeftWallRoomEntryRealignRuntime.predictions = 5050;
const postDoorLeftWallRoomEntryRealignAction = postDoorLeftWallRoomEntryRealignRuntime.predict({
  health: 100,
  depthSig: 0.97,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.20,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  usePulseCooldown: 0,
  computerRoomConfidence: 0.12,
  computerRoomScore: 0.12,
  computerPanelScore: 0.12,
  computerDarkPanelScore: 0.25,
  postDoorTerminalSurface: 0.28,
  blueFloorScore: 0.00,
  bridgeConfidence: 0.23,
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0.00,
  wallVector: 0.65,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 8,
  actionRepeatFrames: 12,
  turnRepeatFrames: 2,
  routeLoopBudgetExceeded: false,
  routeDeadEndRisk: false,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  courtyardScore: 0.35,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.26,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.41,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.00,
      corridor: 0.26,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.23,
      "computer-room": 0.12
    }
  }
});
assert(postDoorLeftWallRoomEntryRealignAction.stage === "post-door-left-wall-room-entry-realign", `Post-door left-wall entry view should rotate right before straight-advance loops (actual=${postDoorLeftWallRoomEntryRealignAction.stage})`);
assert(postDoorLeftWallRoomEntryRealignAction.move === "none", "Post-door left-wall entry realign should stop forward pressure while turning");
assert(postDoorLeftWallRoomEntryRealignAction.turn === "right", "Post-door left-wall entry realign should yaw right toward the room opening");
assert(postDoorLeftWallRoomEntryRealignAction.use === false, "Post-door left-wall entry realign must not emit Use");

const postDoorBlueFloorBridgeRunRuntime = runtimeFactory.create(publicProfile);
postDoorBlueFloorBridgeRunRuntime.predictions = 5070;
const postDoorBlueFloorBridgeRunAction = postDoorBlueFloorBridgeRunRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.28,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  usePulseCooldown: 0,
  computerRoomConfidence: 0.19,
  computerRoomScore: 0.19,
  computerPanelScore: 0.00,
  computerDarkPanelScore: 0.01,
  postDoorTerminalSurface: 0.55,
  blueFloorScore: 0.21,
  bridgeConfidence: 0.34,
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0.28,
  wallVector: 0.46,
  motionForwardProgress: 0.46,
  moveRepeatFrames: 6,
  actionRepeatFrames: 8,
  turnRepeatFrames: 4,
  routeLoopBudgetExceeded: false,
  routeDeadEndRisk: false,
  footObstacleScore: 0.46,
  motionObstacleScore: 0.46,
  courtyardScore: 0.04,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.40,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.52,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.28,
      corridor: 0.40,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.34,
      "computer-room": 0.19
    }
  }
});
assert(postDoorBlueFloorBridgeRunAction.stage === "post-door-blue-floor-bridge-run", `Blue-floor bridge evidence should run forward/right instead of holding yaw only (actual=${postDoorBlueFloorBridgeRunAction.stage})`);
assert(postDoorBlueFloorBridgeRunAction.move === "forward", "Blue-floor bridge run should keep forward pressure");
assert(postDoorBlueFloorBridgeRunAction.turn === "right", "Blue-floor bridge run should steer toward the bridge route");
assert(postDoorBlueFloorBridgeRunAction.use === false, "Blue-floor bridge run must not emit Use inside the computer room");

const postDoorEntryWallRightPivotRuntime = runtimeFactory.create(publicProfile);
postDoorEntryWallRightPivotRuntime.predictions = 5090;
const postDoorEntryWallRightPivotAction = postDoorEntryWallRightPivotRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.28,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  usePulseCooldown: 0,
  computerRoomConfidence: 0.09,
  computerRoomScore: 0.09,
  computerPanelScore: 0.00,
  computerDarkPanelScore: 0.06,
  postDoorTerminalSurface: 0.42,
  blueFloorScore: 0.00,
  bridgeConfidence: 0.20,
  bridgeLaneTurn: "none",
  bridgeDoorScore: 0.03,
  wallVector: 0.62,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 12,
  actionRepeatFrames: 12,
  turnRepeatFrames: 2,
  routeLoopBudgetExceeded: false,
  routeDeadEndRisk: false,
  footObstacleScore: 0.38,
  motionObstacleScore: 0.38,
  courtyardScore: 0.31,
  courtyardTurn: "right",
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.03,
      corridor: 0.18,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.20,
      "computer-room": 0.09
    }
  }
});
assert(postDoorEntryWallRightPivotAction.stage === "post-door-entry-wall-right-pivot", `Post-door entry wall face should pivot right before bridge-memory sustain pushes forward (actual=${postDoorEntryWallRightPivotAction.stage})`);
assert(postDoorEntryWallRightPivotAction.move === "none", "Post-door entry wall pivot should stop forward pressure");
assert(postDoorEntryWallRightPivotAction.turn === "right", "Post-door entry wall pivot should rotate toward the visible opening");
assert(postDoorEntryWallRightPivotAction.use === false, "Post-door entry wall pivot must not Use");

const postDoorBridgeDoorRightAdvanceRuntime = runtimeFactory.create(publicProfile);
postDoorBridgeDoorRightAdvanceRuntime.predictions = 4718;
const postDoorBridgeDoorRightAdvanceAction = postDoorBridgeDoorRightAdvanceRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.16,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.16,
  computerRoomScore: 0.16,
  computerPanelScore: 0.43,
  computerDarkPanelScore: 0.28,
  postDoorTerminalSurface: 0.43,
  bridgeConfidence: 0.40,
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.31,
  wallVector: 0.49,
  motionForwardProgress: 0.12,
  moveRepeatFrames: 0,
  actionRepeatFrames: 14,
  turnRepeatFrames: 14,
  routeDeadEndRisk: false,
  routePostDoorTerminalDeadEndScore: 0,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.31,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.43,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.07,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.31,
      corridor: 0.31,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.40,
      "computer-room": 0.16
    }
  }
});
assert(postDoorBridgeDoorRightAdvanceAction.stage === "post-door-bridge-door-right-advance", `Post-door right bridge-door alignment should advance after repeated yaw instead of spinning in place (actual=${postDoorBridgeDoorRightAdvanceAction.stage})`);
assert(postDoorBridgeDoorRightAdvanceAction.move === "forward", "Post-door right bridge-door advance should restore forward pressure");
assert(postDoorBridgeDoorRightAdvanceAction.turn === "right", "Post-door right bridge-door advance should keep a shallow right yaw");

const postDoorTerminalReleaseTurnStallRuntime = runtimeFactory.create(publicProfile);
postDoorTerminalReleaseTurnStallRuntime.predictions = 4920;
const postDoorTerminalReleaseTurnStallAction = postDoorTerminalReleaseTurnStallRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.12,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.16,
  computerRoomScore: 0.16,
  computerPanelScore: 0.07,
  computerDarkPanelScore: 0.61,
  postDoorTerminalSurface: 0.61,
  bridgeConfidence: 0.42,
  bridgeLaneTurn: "none",
  bridgeDoorScore: 0.11,
  wallVector: 0.49,
  motionForwardProgress: 0.12,
  moveRepeatFrames: 0,
  actionRepeatFrames: 10,
  turnRepeatFrames: 10,
  routeDeadEndRisk: false,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.16,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.33,
  spawnLandmarkRouteTurn: "none",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.20,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.42,
      "computer-room": 0.16
    }
  }
});
assert(postDoorTerminalReleaseTurnStallAction.stage === "post-door-terminal-release-turn-stall-advance-right", `Post-door terminal release turn-stall should re-enter with forward/right instead of spinning in place (actual=${postDoorTerminalReleaseTurnStallAction.stage})`);
assert(postDoorTerminalReleaseTurnStallAction.move === "forward", "Post-door terminal release turn-stall should restore forward pressure");
assert(postDoorTerminalReleaseTurnStallAction.turn === "right", "Post-door terminal release turn-stall should keep a shallow right yaw");

const postDoorBridgeDoorRightAlignRuntime = runtimeFactory.create(publicProfile);
postDoorBridgeDoorRightAlignRuntime.predictions = 3960;
const postDoorBridgeDoorRightAlignAction = postDoorBridgeDoorRightAlignRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "wall",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.12,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.19,
  computerRoomScore: 0.19,
  computerPanelScore: 0.62,
  computerDarkPanelScore: 0.14,
  postDoorTerminalSurface: 0.62,
  bridgeConfidence: 0.15,
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.40,
  wallVector: 0.36,
  motionForwardProgress: 0.12,
  moveRepeatFrames: 0,
  actionRepeatFrames: 4,
  turnRepeatFrames: 4,
  routeDeadEndRisk: false,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.40,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.52,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.00,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.08,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.15,
      "computer-room": 0.19
    }
  }
});
assert(postDoorBridgeDoorRightAlignAction.stage === "post-door-bridge-door-right-align", `Post-door right bridge-door evidence should align right before terminal advance resumes (actual=${postDoorBridgeDoorRightAlignAction.stage})`);
assert(postDoorBridgeDoorRightAlignAction.move === "none", "Post-door bridge-door right align should stop forward pressure");
assert(postDoorBridgeDoorRightAlignAction.turn === "right", "Post-door bridge-door right align should yaw toward the bridge-side door");

const postDoorTerminalDeadEndReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorTerminalDeadEndReleaseRuntime.predictions = 4480;
const postDoorTerminalDeadEndReleaseAction = postDoorTerminalDeadEndReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.18,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.14,
  computerRoomScore: 0.14,
  computerPanelScore: 0.38,
  computerDarkPanelScore: 0.26,
  postDoorTerminalSurface: 0.38,
  bridgeConfidence: 0.08,
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0.08,
  wallVector: 0.39,
  motionForwardProgress: 0.52,
  moveRepeatFrames: 10,
  actionRepeatFrames: 10,
  turnRepeatFrames: 0,
  gapVector: 0.22,
  corridorVector: 0.10,
  routeDeadEndRisk: true,
  routeTopologyWallDistanceNormalized: 0.39,
  routeTopologyBarrelZoneEvidence: 0.96,
  routeTopologyCenterCorridorAlignment: -0.35,
  footObstacleScore: 0.60,
  motionObstacleScore: 0.60,
  spawnCorridorGapScore: 0.36,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.48,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.24,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.08,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.20,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.08,
      "computer-room": 0.14
    }
  }
});
assert(postDoorTerminalDeadEndReleaseAction.stage === "post-door-terminal-dead-end-release-right", `Post-door terminal dead-end should release right before terminal straight advance resumes (actual=${postDoorTerminalDeadEndReleaseAction.stage})`);
assert(postDoorTerminalDeadEndReleaseAction.move === "none", "Post-door terminal dead-end release should stop forward pressure");
assert(postDoorTerminalDeadEndReleaseAction.turn === "right", "Post-door terminal dead-end release should yaw right toward the bridge route");

const postDoorTerminalTopologyDeadEndReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorTerminalTopologyDeadEndReleaseRuntime.predictions = 4512;
const postDoorTerminalTopologyDeadEndReleaseAction = postDoorTerminalTopologyDeadEndReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.18,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.11,
  computerRoomScore: 0.11,
  computerPanelScore: 0.45,
  computerDarkPanelScore: 0.03,
  postDoorTerminalSurface: 0.45,
  bridgeConfidence: 0.23,
  bridgeLaneTurn: "none",
  bridgeDoorScore: 0.05,
  wallVector: 0.33,
  motionForwardProgress: 0.57,
  moveRepeatFrames: 22,
  actionRepeatFrames: 22,
  turnRepeatFrames: 0,
  gapVector: 0.18,
  corridorVector: 0.08,
  routeDeadEndRisk: false,
  routePostDoorTerminalDeadEndScore: 1,
  routeTopologyWallDistanceNormalized: 0.33,
  routeTopologyBarrelZoneEvidence: 1.00,
  routeTopologyCenterCorridorAlignment: -0.34,
  footObstacleScore: 0.57,
  motionObstacleScore: 0.57,
  spawnCorridorGapScore: 0.34,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.42,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.08,
  semanticMemory: {
    symbols: {
      door: 0.05,
      corridor: 0.18,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.23,
      "computer-room": 0.11
    }
  }
});
assert(postDoorTerminalTopologyDeadEndReleaseAction.stage === "post-door-terminal-dead-end-release-right", `Topology-only terminal dead-end should release right even before routeDeadEndRisk latches (actual=${postDoorTerminalTopologyDeadEndReleaseAction.stage})`);
assert(postDoorTerminalTopologyDeadEndReleaseAction.move === "none", "Topology-only terminal dead-end release should stop forward pressure");
assert(postDoorTerminalTopologyDeadEndReleaseAction.turn === "right", "Topology-only terminal dead-end release should yaw right toward the bridge route");

const postDoorTopologyDeadEndRightRuntime = runtimeFactory.create(publicProfile);
postDoorTopologyDeadEndRightRuntime.predictions = 4044;
const postDoorTopologyDeadEndRightAction = postDoorTopologyDeadEndRightRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.08,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.07,
  computerRoomScore: 0.07,
  computerPanelScore: 0.09,
  computerDarkPanelScore: 0.10,
  postDoorTerminalSurface: 0.26,
  bridgeConfidence: 0.02,
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0.00,
  wallVector: 0.33,
  motionForwardProgress: 0.50,
  moveRepeatFrames: 2,
  actionRepeatFrames: 2,
  turnRepeatFrames: 0,
  routeDeadEndRisk: true,
  routeTopologyWallDistanceNormalized: 0.33,
  routeTopologyBarrelZoneEvidence: 1.00,
  routeTopologyCenterCorridorAlignment: -0.32,
  gapVector: 0.20,
  corridorVector: 0.08,
  wallFlowVector: 0,
  footObstacleScore: 0.57,
  motionObstacleScore: 0.57,
  spawnCorridorGapScore: 0.23,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.40,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.04,
  semanticMemory: {
    symbols: {
      door: 0.10,
      corridor: 0.20,
      enemy: 0,
      "safe-zone": 0.18,
      bridge: 0.02,
      "computer-room": 0.07
    }
  }
});
assert(postDoorTopologyDeadEndRightAction.stage === "post-door-topology-dead-end-right-realign", `Weak post-door topology dead-end should yaw right before corridor-gap advance resumes (actual=${postDoorTopologyDeadEndRightAction.stage})`);
assert(postDoorTopologyDeadEndRightAction.move === "none", "Weak post-door topology dead-end should release forward pressure");
assert(postDoorTopologyDeadEndRightAction.turn === "right", "Weak post-door topology dead-end should yaw right toward the bridge route");

const postDoorReacquireHoldRuntime = runtimeFactory.create(publicProfile);
postDoorReacquireHoldRuntime.predictions = 2594;
const postDoorReacquireHoldAction = postDoorReacquireHoldRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.08,
  bridgeConfidence: 0.32,
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 0,
  turnRepeatFrames: 5,
  actionRepeatFrames: 5,
  routeDeadEndRisk: false,
  routeTopologyWallDistanceNormalized: 0.53,
  routeTopologyBarrelZoneEvidence: 0.47,
  routeTopologyCenterCorridorAlignment: 0.01,
  footObstacleScore: 0.54,
  motionObstacleScore: 0.54,
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: true,
  bridgeGreenHazard: 0.20,
  bridgeDoorScore: 0.00,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.32,
      "computer-room": 0.08
    }
  }
});
assert(postDoorReacquireHoldAction.stage === "post-door-reacquire-right-hold", `Post-door reacquire should hold right yaw for several frames (actual=${postDoorReacquireHoldAction.stage})`);
assert(postDoorReacquireHoldAction.move === "none", "Post-door reacquire hold should not press forward while turning");
assert(postDoorReacquireHoldAction.turn === "right", "Post-door reacquire hold should continue yawing right");

const postDoorObservedWallFaceRuntime = runtimeFactory.create(publicProfile);
postDoorObservedWallFaceRuntime.predictions = 2760;
const postDoorObservedWallFaceAction = postDoorObservedWallFaceRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.08,
  bridgeConfidence: 0.32,
  wallVector: 0.56,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 8,
  actionRepeatFrames: 8,
  footObstacleScore: 0.30,
  motionObstacleScore: 0.30,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.07,
  bridgeDoorScore: 0.00,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.32,
      "computer-room": 0.08
    }
  }
});
assert(postDoorObservedWallFaceAction.stage === "post-door-short-wallface-reacquire-right", `Observed post-door wall face should reacquire right before bridge straight continues (actual=${postDoorObservedWallFaceAction.stage})`);
assert(postDoorObservedWallFaceAction.move === "none", "Observed post-door wall face reacquire should stop forward pressure");
assert(postDoorObservedWallFaceAction.turn === "right", "Observed post-door wall face reacquire should yaw right");

const postDoorBarrelWallBackoffRuntime = runtimeFactory.create(publicProfile);
postDoorBarrelWallBackoffRuntime.predictions = 2920;
const postDoorBarrelWallBackoffAction = postDoorBarrelWallBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.08,
  bridgeConfidence: 0.00,
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 56,
  actionRepeatFrames: 56,
  routeDeadEndRisk: false,
  routeTopologyBarrelZoneEvidence: 0.68,
  routeTopologyCenterCorridorAlignment: -0.08,
  footObstacleScore: 0.54,
  motionObstacleScore: 0.54,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.07,
  bridgeDoorScore: 0.00,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.00,
      "computer-room": 0.08
    }
  }
});
assert(postDoorBarrelWallBackoffAction.stage === "post-door-barrel-wall-backoff-right", `Post-door barrel wall lane should back off before reattempting bridge alignment (actual=${postDoorBarrelWallBackoffAction.stage})`);
assert(postDoorBarrelWallBackoffAction.move === "back", "Post-door barrel wall backoff should step backward");
assert(postDoorBarrelWallBackoffAction.turn === "right", "Post-door barrel wall backoff should yaw right while backing away");

const postDoorObservedWallLaneRuntime = runtimeFactory.create(publicProfile);
postDoorObservedWallLaneRuntime.predictions = 3014;
const postDoorObservedWallLaneAction = postDoorObservedWallLaneRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.08,
  bridgeConfidence: 0.32,
  wallVector: 0.56,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 22,
  actionRepeatFrames: 22,
  routeDeadEndRisk: false,
  routeTopologyBarrelZoneEvidence: 0.63,
  routeTopologyCenterCorridorAlignment: -0.05,
  footObstacleScore: 0.54,
  motionObstacleScore: 0.54,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.07,
  bridgeDoorScore: 0.00,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.32,
      "computer-room": 0.08
    }
  }
});
assert(postDoorObservedWallLaneAction.stage === "post-door-barrel-wall-backoff-right", `Observed post-door wall-lane topology should back off before bridge straight reasserts (actual=${postDoorObservedWallLaneAction.stage})`);
assert(postDoorObservedWallLaneAction.move === "back", "Observed post-door wall-lane backoff should reverse away from the wall lane");
assert(postDoorObservedWallLaneAction.turn === "right", "Observed post-door wall-lane backoff should yaw right toward the bridge side");

const postDoorMovingWallLaneRuntime = runtimeFactory.create(publicProfile);
postDoorMovingWallLaneRuntime.predictions = 3060;
const postDoorMovingWallLaneAction = postDoorMovingWallLaneRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.08,
  bridgeConfidence: 0.32,
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 47,
  actionRepeatFrames: 47,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.07,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.03,
  semanticMemory: {
    symbols: {
      door: 0.15,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.32,
      "computer-room": 0.08
    }
  }
});
assert(postDoorMovingWallLaneAction.stage === "post-door-moving-wall-lane-reacquire-right", `Moving post-door wall-lane should release forward and reacquire right (actual=${postDoorMovingWallLaneAction.stage})`);
assert(postDoorMovingWallLaneAction.move === "none", "Moving wall-lane reacquire should stop forward pressure");
assert(postDoorMovingWallLaneAction.turn === "right", "Moving wall-lane reacquire should yaw right");

const postDoorLongWallFaceRuntime = runtimeFactory.create(publicProfile);
postDoorLongWallFaceRuntime.predictions = 3140;
const postDoorLongWallFaceAction = postDoorLongWallFaceRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.08,
  bridgeConfidence: 0.32,
  wallVector: 0,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 99,
  actionRepeatFrames: 99,
  footObstacleScore: 0.30,
  motionObstacleScore: 0.30,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.07,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.04,
  semanticMemory: {
    symbols: {
      door: 0.15,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.32,
      "computer-room": 0.08
    }
  }
});
assert(postDoorLongWallFaceAction.stage === "post-door-long-wallface-reacquire-right", `Long post-door wall face should stop forward and reacquire right (actual=${postDoorLongWallFaceAction.stage})`);
assert(postDoorLongWallFaceAction.move === "none", "Long wall-face reacquire should stop forward pressure");
assert(postDoorLongWallFaceAction.turn === "right", "Long wall-face reacquire should yaw right");

const postDoorIdleWallFaceRuntime = runtimeFactory.create(publicProfile);
postDoorIdleWallFaceRuntime.predictions = 1420;
const postDoorIdleWallFaceAction = postDoorIdleWallFaceRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.08,
  bridgeConfidence: 0.32,
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 0,
  actionRepeatFrames: 0,
  footObstacleScore: 0.30,
  motionObstacleScore: 0.30,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.07,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.08,
  semanticMemory: {
    symbols: {
      door: 0.15,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.32,
      "computer-room": 0.08
    }
  }
});
assert(postDoorIdleWallFaceAction.stage === "post-door-idle-wallface-reacquire-right", `Idle post-door wall face should keep the route alive by reacquiring right (actual=${postDoorIdleWallFaceAction.stage})`);
assert(postDoorIdleWallFaceAction.move === "none", "Idle wall-face reacquire should stay stopped while turning");
assert(postDoorIdleWallFaceAction.turn === "right", "Idle wall-face reacquire should yaw right");

const postDoorIdleRawWallFaceRuntime = runtimeFactory.create(publicProfile);
postDoorIdleRawWallFaceRuntime.predictions = 1516;
const postDoorIdleRawWallFaceAction = postDoorIdleRawWallFaceRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: true,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.17,
  bridgeConfidence: 0.20,
  wallVector: 0,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 0,
  actionRepeatFrames: 0,
  footObstacleScore: 0.60,
  motionObstacleScore: 0.60,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.24,
  spawnLandmarkRouteTurn: "none",
  spawnSecretDoorScore: 0.00,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.13,
  bridgeDoorScore: 0.08,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.20,
      "computer-room": 0.17
    }
  }
});
assert(postDoorIdleRawWallFaceAction.stage === "post-door-idle-raw-wallface-reacquire-right", `Raw post-door idle wall face should reacquire right before falling to idle (actual=${postDoorIdleRawWallFaceAction.stage})`);
assert(postDoorIdleRawWallFaceAction.move === "none", "Raw idle wall-face reacquire should stay stopped while turning");
assert(postDoorIdleRawWallFaceAction.turn === "right", "Raw idle wall-face reacquire should yaw right");

const postDoorWallFaceSensorFallbackRuntime = runtimeFactory.create(publicProfile);
postDoorWallFaceSensorFallbackRuntime.predictions = 1516;
const postDoorWallFaceSensorFallbackAction = postDoorWallFaceSensorFallbackRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: true,
  visualEnemyConfidence: 0.28,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.13,
  bridgeConfidence: 0.39,
  wallVector: 0,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 8,
  actionRepeatFrames: 8,
  footObstacleScore: 0.60,
  motionObstacleScore: 0.60,
  spawnCorridorGapScore: 0.16,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.39,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.13,
  bridgeDoorScore: 0.09,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.39,
      "computer-room": 0.13
    }
  }
});
assert(["post-door-wallface-sensor-fallback-right", "post-door-slide-stall-forward-release"].includes(postDoorWallFaceSensorFallbackAction.stage), `Post-door wall-face fallback should avoid idle when live values would otherwise stall (actual=${postDoorWallFaceSensorFallbackAction.stage})`);
assert(postDoorWallFaceSensorFallbackAction.move !== "back", "Post-door wall-face fallback should not back away from the post-door route");

const postDoorNoIdleRouteReacquireRuntime = runtimeFactory.create(publicProfile);
postDoorNoIdleRouteReacquireRuntime.predictions = 2400;
const postDoorNoIdleRouteReacquireAction = postDoorNoIdleRouteReacquireRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.0,
  bridgeConfidence: 0.0,
  wallVector: 0,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 0,
  actionRepeatFrames: 0,
  footObstacleScore: 0.12,
  motionObstacleScore: 0.12,
  spawnCorridorGapScore: 0.12,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.12,
  spawnLandmarkRouteTurn: "none",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.00,
  bridgeDoorScore: 0.00,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(postDoorNoIdleRouteReacquireAction.stage === "post-door-no-idle-route-reacquire-right", `Post-door fallback should avoid idle before central hall when no higher route stage matches (actual=${postDoorNoIdleRouteReacquireAction.stage})`);
assert(postDoorNoIdleRouteReacquireAction.move === "none", "Post-door no-idle fallback should not press forward blindly");
assert(postDoorNoIdleRouteReacquireAction.turn === "right", "Post-door no-idle fallback should keep reacquiring right");

const postDoorCorridorGapStraightAdvanceRuntime = runtimeFactory.create(publicProfile);
postDoorCorridorGapStraightAdvanceRuntime.predictions = 2440;
const postDoorCorridorGapStraightAdvanceAction = postDoorCorridorGapStraightAdvanceRuntime.predict({
  health: 100,
  depthSig: 0.86,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.0,
  bridgeConfidence: 0.05,
  wallVector: 0,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 0,
  actionRepeatFrames: 0,
  footObstacleScore: 0.57,
  motionObstacleScore: 0.57,
  spawnCorridorGapScore: 0.33,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.45,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.00,
  bridgeDoorScore: 0.05,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.05,
      "computer-room": 0
    }
  }
});
assert(postDoorCorridorGapStraightAdvanceAction.stage === "post-door-corridor-gap-straight-advance", `Post-door corridor gap should advance straight instead of no-idle route reacquire (actual=${postDoorCorridorGapStraightAdvanceAction.stage})`);
assert(postDoorCorridorGapStraightAdvanceAction.move === "forward", "Post-door corridor gap should keep moving forward");
assert(postDoorCorridorGapStraightAdvanceAction.turn === "none", "Post-door corridor gap should not steer right back into the wall face");

const postDoorThinCorridorGapStraightAdvanceRuntime = runtimeFactory.create(publicProfile);
postDoorThinCorridorGapStraightAdvanceRuntime.predictions = 2247;
const postDoorThinCorridorGapStraightAdvanceAction = postDoorThinCorridorGapStraightAdvanceRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.06,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.0,
  bridgeConfidence: 0.05,
  wallVector: 0,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 0,
  actionRepeatFrames: 0,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.00,
  bridgeDoorScore: 0.00,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.05,
      "computer-room": 0
    }
  }
});
assert(postDoorThinCorridorGapStraightAdvanceAction.stage === "post-door-corridor-gap-straight-advance", `Thin post-door corridor evidence should advance straight instead of reacquiring right (actual=${postDoorThinCorridorGapStraightAdvanceAction.stage})`);
assert(postDoorThinCorridorGapStraightAdvanceAction.move === "forward", "Thin post-door corridor evidence should keep forward pressure");
assert(postDoorThinCorridorGapStraightAdvanceAction.turn === "none", "Thin post-door corridor evidence should not yaw right into the wall face");

const postDoorNoIdleRepeatForwardReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorNoIdleRepeatForwardReleaseRuntime.predictions = 2720;
const postDoorNoIdleRepeatForwardReleaseAction = postDoorNoIdleRepeatForwardReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  routeFallbackYaw: 6,
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.28,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.0,
  bridgeConfidence: 0.07,
  bridgeLaneVisible: false,
  wallVector: 0,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 0,
  actionRepeatFrames: 35,
  turnRepeatFrames: 0,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.31,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.43,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.11,
  bridgeDoorScore: 0.08,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.07,
      "computer-room": 0
    }
  }
});
assert(postDoorNoIdleRepeatForwardReleaseAction.stage === "post-door-no-idle-repeat-forward-release", `Repeated post-door no-idle yaw should release forward even without a route abort hint (actual=${postDoorNoIdleRepeatForwardReleaseAction.stage})`);
assert(postDoorNoIdleRepeatForwardReleaseAction.move === "forward", "Repeated post-door no-idle release should move forward");
assert(postDoorNoIdleRepeatForwardReleaseAction.turn === "none", "Repeated post-door no-idle release should advance straight without re-acquire steering");

const postDoorLateNoIdleForwardReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorLateNoIdleForwardReleaseRuntime.predictions = 2114;
const postDoorLateNoIdleForwardReleaseAction = postDoorLateNoIdleForwardReleaseRuntime.predict({
  health: 100,
  depthSig: 0.80,
  contextDict: "corridor",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  routeFallbackYaw: 8,
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.28,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.0,
  bridgeConfidence: 0.05,
  bridgeLaneVisible: false,
  wallVector: 0,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 0,
  actionRepeatFrames: 3,
  turnRepeatFrames: 0,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.55,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.09,
  bridgeDoorScore: 0.36,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.05,
      "computer-room": 0
    }
  }
});
assert(postDoorLateNoIdleForwardReleaseAction.stage === "post-door-late-no-idle-forward-release", `Late post-door no-idle should release forward even when action repeat resets (actual=${postDoorLateNoIdleForwardReleaseAction.stage})`);
assert(postDoorLateNoIdleForwardReleaseAction.move === "forward", "Late post-door no-idle release should move forward");
assert(postDoorLateNoIdleForwardReleaseAction.turn === "none", "Late post-door no-idle release should advance straight without re-acquire steering");

const postDoorWallFaceMustNotLateForwardRuntime = runtimeFactory.create(publicProfile);
postDoorWallFaceMustNotLateForwardRuntime.predictions = 2300;
const postDoorWallFaceMustNotLateForwardAction = postDoorWallFaceMustNotLateForwardRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  routeFallbackYaw: -8,
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.10,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.07,
  bridgeConfidence: 0.04,
  bridgeLaneVisible: false,
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 4,
  actionRepeatFrames: 4,
  turnRepeatFrames: 0,
  footObstacleScore: 0.57,
  motionObstacleScore: 0.57,
  spawnCorridorGapScore: 0.26,
  spawnCorridorGapTurn: "left",
  spawnLandmarkRouteEvidence: 0.42,
  spawnLandmarkRouteTurn: "left",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeDoorScore: 0.01,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.04,
      "computer-room": 0.07
    }
  }
});
assert(postDoorWallFaceMustNotLateForwardAction.stage !== "post-door-late-no-idle-forward-release", "Post-door wall face without bridge/computer evidence must not use late forward release");
assert(["post-door-short-wallface-reacquire-right", "post-door-idle-raw-wallface-reacquire-right", "post-door-wallface-sensor-fallback-right", "post-door-no-idle-route-reacquire-right"].includes(postDoorWallFaceMustNotLateForwardAction.stage), `Post-door wall face should reacquire instead of pressing into the wall (actual=${postDoorWallFaceMustNotLateForwardAction.stage})`);
assert(postDoorWallFaceMustNotLateForwardAction.move === "none", "Post-door wall-face reacquire should stop forward pressure");
assert(postDoorWallFaceMustNotLateForwardAction.turn === "right", "Post-door wall-face reacquire should yaw right toward the room opening");

const postDoorTurnStallForwardReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorTurnStallForwardReleaseRuntime.predictions = 1880;
const postDoorTurnStallForwardReleaseAction = postDoorTurnStallForwardReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  routeAbortHint: "turn-stall",
  routeLoopBudgetExceeded: true,
  routeFallbackYaw: -6,
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.28,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.14,
  bridgeConfidence: 0.15,
  wallVector: 0,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 94,
  actionRepeatFrames: 94,
  turnRepeatFrames: 94,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.44,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.15,
  bridgeDoorScore: 0.00,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.15,
      "computer-room": 0.14
    }
  }
});
assert(postDoorTurnStallForwardReleaseAction.stage === "post-door-turn-stall-forward-release", `Post-door turn-stall should release forward instead of spinning forever (actual=${postDoorTurnStallForwardReleaseAction.stage})`);
assert(postDoorTurnStallForwardReleaseAction.move === "forward", "Post-door turn-stall release should move forward");
assert(postDoorTurnStallForwardReleaseAction.turn !== "none", "Post-door turn-stall release should keep a route-correction yaw while advancing");

const postDoorBridgeMemoryDeadEndBackoffRuntime = runtimeFactory.create(publicProfile);
postDoorBridgeMemoryDeadEndBackoffRuntime.predictions = 1960;
const postDoorBridgeMemoryDeadEndBackoffAction = postDoorBridgeMemoryDeadEndBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  routePostDoorBridgeDoorMemoryFrames: 12,
  routeDeadEndRisk: true,
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.12,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.10,
  postDoorTerminalSurface: 0.34,
  bridgeConfidence: 0.18,
  wallVector: 0.33,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 6,
  actionRepeatFrames: 6,
  turnRepeatFrames: 3,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.23,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.52,
  spawnLandmarkRouteTurn: "right",
  routeTopologyBarrelZoneEvidence: 1.00,
  routeTopologyCenterCorridorAlignment: -0.35,
  spawnSecretDoorScore: 0.02,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.02,
  bridgeDoorScore: 0.00,
  semanticMemory: {
    symbols: {
      door: 0.10,
      corridor: 0.23,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.18,
      "computer-room": 0.10
    }
  }
});
assert(["post-door-bridge-memory-dead-end-backoff-right", "post-door-terminal-loop-budget-backoff-right"].includes(postDoorBridgeMemoryDeadEndBackoffAction.stage), `Post-door bridge-memory dead-end should back off before sustaining right route memory (actual=${postDoorBridgeMemoryDeadEndBackoffAction.stage})`);
assert(postDoorBridgeMemoryDeadEndBackoffAction.move === "back", "Post-door bridge-memory dead-end should back off from the wall-facing route");
assert(postDoorBridgeMemoryDeadEndBackoffAction.turn === "right", "Post-door bridge-memory dead-end should reacquire toward the bridge corridor");

const postDoorTopologyDeadEndTurnLoopBackoffRuntime = runtimeFactory.create(publicProfile);
postDoorTopologyDeadEndTurnLoopBackoffRuntime.predictions = 2140;
const postDoorTopologyDeadEndTurnLoopBackoffAction = postDoorTopologyDeadEndTurnLoopBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.12,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.10,
  postDoorTerminalSurface: 0.34,
  bridgeConfidence: 0.18,
  wallVector: 0.39,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 3,
  actionRepeatFrames: 3,
  turnRepeatFrames: 129,
  footObstacleScore: 0.58,
  motionObstacleScore: 0.58,
  spawnCorridorGapScore: 0.23,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.52,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.02,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.02,
  bridgeDoorScore: 0.16,
  semanticMemory: {
    symbols: {
      door: 0.10,
      corridor: 0.23,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.18,
      "computer-room": 0.10
    }
  }
});
assert(postDoorTopologyDeadEndTurnLoopBackoffAction.stage === "post-door-topology-dead-end-turn-loop-backoff-right", `Post-door topology dead-end turn loop should back off before weak sustain keeps turning right (actual=${postDoorTopologyDeadEndTurnLoopBackoffAction.stage})`);
assert(postDoorTopologyDeadEndTurnLoopBackoffAction.move === "back", "Post-door topology dead-end turn loop should back off");
assert(postDoorTopologyDeadEndTurnLoopBackoffAction.turn === "right", "Post-door topology dead-end turn loop should reacquire right after backing off");

const postDoorSlideStallForwardReleaseRuntime = runtimeFactory.create(publicProfile);
postDoorSlideStallForwardReleaseRuntime.predictions = 1881;
const postDoorSlideStallForwardReleaseAction = postDoorSlideStallForwardReleaseRuntime.predict({
  health: 100,
  depthSig: 0.88,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  routeFallbackYaw: -5,
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.28,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.10,
  bridgeConfidence: 0.15,
  wallVector: 0,
  motionForwardProgress: 0.08,
  moveRepeatFrames: 8,
  actionRepeatFrames: 8,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.15,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.00,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.02,
  bridgeDoorScore: 0.00,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.15,
      "computer-room": 0.10
    }
  }
});
assert(postDoorSlideStallForwardReleaseAction.stage === "post-door-slide-stall-forward-release", `Post-door slide-stall should release forward instead of continuing no-idle yaw (actual=${postDoorSlideStallForwardReleaseAction.stage})`);
assert(postDoorSlideStallForwardReleaseAction.move === "forward", "Post-door slide-stall release should move forward");

const postDoorBridgeStraightRuntime = runtimeFactory.create(publicProfile);
postDoorBridgeStraightRuntime.predictions = 1558;
const postDoorBridgeStraightAction = postDoorBridgeStraightRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.10,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.13,
  bridgeConfidence: 0.32,
  wallVector: 0.49,
  motionForwardProgress: 0.32,
  moveRepeatFrames: 57,
  actionRepeatFrames: 57,
  footObstacleScore: 0.24,
  motionObstacleScore: 0.24,
  spawnCorridorGapScore: 0.19,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.13,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: true,
  bridgeGreenHazard: 0.18,
  bridgeDoorScore: 0.01,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.32,
      "computer-room": 0.13
    }
  }
});
assert(postDoorBridgeStraightAction.stage === "bridge-poison-straight-lock" || postDoorBridgeStraightAction.stage === "post-door-bridge-straight-advance", `Visible bridge evidence should preserve straight movement toward central hall (actual=${postDoorBridgeStraightAction.stage})`);
assert(postDoorBridgeStraightAction.objective === "reach-central-hall", "Visible bridge evidence should promote the objective toward central hall");
assert(postDoorBridgeStraightAction.move === "forward", "Bridge evidence should keep straight forward pressure");

const postDoorDeadEndRealignRuntime = runtimeFactory.create(publicProfile);
postDoorDeadEndRealignRuntime.predictions = 2520;
const postDoorDeadEndRealignAction = postDoorDeadEndRealignRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.10,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.64,
  bridgeConfidence: 0.35,
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 8,
  actionRepeatFrames: 8,
  routeDeadEndRisk: true,
  routeTopologyBarrelZoneEvidence: 1,
  routeTopologyCenterCorridorAlignment: -0.32,
  routeTextureWallOcclusion: false,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.41,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.07,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.03,
  semanticMemory: {
    symbols: {
      door: 0.15,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.35,
      "computer-room": 0.64
    }
  }
});
assert(postDoorDeadEndRealignAction.stage === "post-door-computer-room-dead-end-right-realign", `Post-door dead-end topology should stop forward pressure and yaw right toward the room route (actual=${postDoorDeadEndRealignAction.stage})`);
assert(postDoorDeadEndRealignAction.move === "none", "Post-door dead-end realign should release forward movement before turning");
assert(postDoorDeadEndRealignAction.turn === "right", "Post-door dead-end realign should turn right toward the bridge side");
assert(postDoorDeadEndRealignAction.use === false, "Post-door dead-end realign must not pulse Use again");

const postDoorWallHugRealignRuntime = runtimeFactory.create(publicProfile);
postDoorWallHugRealignRuntime.predictions = 2580;
const postDoorWallHugRealignAction = postDoorWallHugRealignRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.10,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.64,
  bridgeConfidence: 0.35,
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 198,
  actionRepeatFrames: 198,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.07,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.03,
  semanticMemory: {
    symbols: {
      door: 0.15,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.35,
      "computer-room": 0.64
    }
  }
});
assert(postDoorWallHugRealignAction.stage === "post-door-computer-room-wall-hug-right-realign", `Post-door wall-hug topology should release straight advance before forward pressure continues (actual=${postDoorWallHugRealignAction.stage})`);
assert(postDoorWallHugRealignAction.move === "none", "Post-door wall-hug realign should stop forward pressure before turning");
assert(postDoorWallHugRealignAction.turn === "right", "Post-door wall-hug realign should turn right toward the bridge side");

const postDoorCornerRealignRuntime = runtimeFactory.create(publicProfile);
postDoorCornerRealignRuntime.predictions = 5200;
const postDoorCornerRealignAction = postDoorCornerRealignRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  doorOpenedCount: 1,
  centralHallEntered: false,
  routeMode: "post-door",
  previousRouteMode: "post-door",
  visualEnemyVisible: false,
  visualEnemyConfidence: 0.10,
  visualEnemySuppressed: true,
  audioEnemyConfidence: 0,
  soundEvent: false,
  computerRoomConfidence: 0.51,
  bridgeConfidence: 0.24,
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  moveRepeatFrames: 240,
  actionRepeatFrames: 240,
  routeDeadEndRisk: false,
  routeTopologyBarrelZoneEvidence: 0.50,
  routeTopologyCenterCorridorAlignment: -0.01,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  spawnCorridorGapScore: 0.17,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.32,
  spawnLandmarkRouteTurn: "none",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  bridgeLaneVisible: false,
  bridgeGreenHazard: 0.03,
  semanticMemory: {
    symbols: {
      door: 0.12,
      corridor: 0.2,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.24,
      "computer-room": 0.51
    }
  }
});
assert(postDoorCornerRealignAction.stage === "post-door-long-wallface-reacquire-right", `Post-door moderate corner pressure should release long forward repeats before straight advance (actual=${postDoorCornerRealignAction.stage})`);
assert(postDoorCornerRealignAction.move === "none", "Post-door moderate corner realign should release forward movement before turning");
assert(postDoorCornerRealignAction.turn === "right", "Post-door moderate corner realign should yaw right toward the bridge side");

const postDoorAudioCombatRuntime = runtimeFactory.create(publicProfile);
postDoorAudioCombatRuntime.predictions = 3900;
const postDoorAudioCombatAction = postDoorAudioCombatRuntime.predict({
  health: 25,
  depthSig: 0.95,
  contextDict: "open-space",
  wallVector: 0,
  faceSig: 0.08,
  soundEvent: true,
  postDoorAudioCue: true,
  doorOpenedCount: 0,
  predictions: 3900,
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.50,
  spawnLandmarkRouteTurn: "right",
  computerRoomConfidence: 0.20,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0,
  semanticMemory: {
    symbols: {
      door: 0.4,
      corridor: 0.35,
      enemy: 0.25,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0.2
    }
  }
});
assert(postDoorAudioCombatAction.stage === "post-door-audio-combat-fallback", `Post-door damage plus audio should switch to combat fallback (actual=${postDoorAudioCombatAction.stage})`);
assert(postDoorAudioCombatAction.fire === true, "Post-door audio combat fallback should allow a defensive shot");

const computerRoomAudioOrientRuntime = runtimeFactory.create(publicProfile);
computerRoomAudioOrientRuntime.predictions = 4300;
const computerRoomAudioOrientAction = computerRoomAudioOrientRuntime.predict({
  health: 100,
  depthSig: 0.86,
  contextDict: "computer-room",
  wallVector: 0,
  doorOpenedCount: 1,
  centralHallEntered: false,
  computerRoomConfidence: 0.40,
  audioEnemyConfidence: 0.45,
  audioEnemyDirection: "right",
  audioEnemyStrong: true,
  trustedEnemyThreat: 0.45,
  trustedCombatEvidence: true,
  audioCombatYaw: 18,
  enemyCombatYaw: 18,
  enemyConfidence: 0.05,
  visualEnemyVisible: false,
  semanticMemory: {
    symbols: {
      door: 0.2,
      corridor: 0.35,
      enemy: 0.45,
      "safe-zone": 0.2,
      bridge: 0.1,
      "computer-room": 0.40
    }
  }
});
assert(computerRoomAudioOrientAction.stage === "computer-room-audio-enemy-orient", `Computer-room audio enemy cue should orient before wandering (actual=${computerRoomAudioOrientAction.stage})`);
assert(computerRoomAudioOrientAction.turn === "right", "Audio enemy orientation should turn toward the audio side");
assert(computerRoomAudioOrientAction.strafe === false, "Audio enemy orientation should not strafe into bridge/poison lanes");
assert(computerRoomAudioOrientAction.fire === false, "Side audio cue should not fire before enemy is centered");

const combatVisualCenterRuntime = runtimeFactory.create(publicProfile);
combatVisualCenterRuntime.predictions = 4350;
const combatVisualCenterAction = combatVisualCenterRuntime.predict({
  health: 100,
  depthSig: 0.70,
  contextDict: "computer-room",
  wallVector: 0,
  doorOpenedCount: 1,
  centralHallEntered: false,
  computerRoomConfidence: 0.42,
  enemyConfidence: 0.58,
  visualEnemyConfidence: 0.58,
  trustedEnemyThreat: 0.58,
  trustedCombatEvidence: true,
  faceSig: -0.6,
  visualEnemyVisible: true,
  visualEnemyCentered: false,
  visualEnemyYaw: -14,
  visualEnemyFireReady: false,
  enemyCombatYaw: -14,
  semanticMemory: {
    symbols: {
      door: 0.2,
      corridor: 0.35,
      enemy: 0.58,
      "safe-zone": 0.2,
      bridge: 0.1,
      "computer-room": 0.42
    }
  }
});
assert(combatVisualCenterAction.stage === "combat-visual-center-fire", `Visible off-center enemy should select visual centering combat stage (actual=${combatVisualCenterAction.stage})`);
assert(combatVisualCenterAction.turn === "left", "Visual enemy centering should turn toward the enemy vector");
assert(combatVisualCenterAction.fire === false, "Off-center visual enemy should not fire yet");

const combatVisualFireRuntime = runtimeFactory.create(publicProfile);
combatVisualFireRuntime.predictions = 4360;
const combatVisualFireAction = combatVisualFireRuntime.predict({
  health: 100,
  depthSig: 0.70,
  contextDict: "computer-room",
  wallVector: 0,
  doorOpenedCount: 1,
  centralHallEntered: false,
  computerRoomConfidence: 0.42,
  enemyConfidence: 0.90,
  visualEnemyConfidence: 0.90,
  trustedEnemyThreat: 0.90,
  trustedCombatEvidence: true,
  faceSig: 0.03,
  visualEnemyVisible: true,
  visualEnemyCentered: true,
  visualEnemyYaw: 0,
  visualEnemyFireReady: true,
  enemyCombatYaw: 0,
  semanticMemory: {
    symbols: {
      door: 0.2,
      corridor: 0.35,
      enemy: 0.90,
      "safe-zone": 0.2,
      bridge: 0.1,
      "computer-room": 0.42
    }
  }
});
assert(combatVisualFireAction.stage === "combat-visual-center-fire", `Centered visible enemy should keep visual combat stage (actual=${combatVisualFireAction.stage})`);
assert(combatVisualFireAction.turn === "none", "Centered visual enemy should not keep turning");
assert(combatVisualFireAction.fire === true, "Centered visual enemy should fire");

const combatVisualWeakFalsePositiveRuntime = runtimeFactory.create(publicProfile);
combatVisualWeakFalsePositiveRuntime.predictions = 4370;
const combatVisualWeakFalsePositiveAction = combatVisualWeakFalsePositiveRuntime.predict({
  health: 100,
  depthSig: 0.70,
  contextDict: "computer-room",
  wallVector: 0,
  doorOpenedCount: 1,
  centralHallEntered: false,
  computerRoomConfidence: 0.42,
  enemyConfidence: 0.44,
  visualEnemyConfidence: 0.44,
  enemyStructuralDecoy: true,
  trustedEnemyThreat: 0,
  trustedCombatEvidence: false,
  audioEnemyConfidence: 0.10,
  audioEnemyStrong: false,
  faceSig: 0.0,
  visualEnemyVisible: true,
  visualEnemyCentered: true,
  visualEnemyYaw: 12,
  visualEnemyFireReady: true,
  enemyCombatYaw: 12,
  semanticMemory: {
    symbols: {
      door: 0.2,
      corridor: 0.35,
      enemy: 0.44,
      "safe-zone": 0.2,
      bridge: 0.1,
      "computer-room": 0.42
    }
  }
});
assert(combatVisualWeakFalsePositiveAction.stage !== "combat-visual-center-fire", "Weak visual-only post-door red/brown false positives should not enter fire stage without audio or face evidence");
assert(combatVisualWeakFalsePositiveAction.fire === false, "Weak visual-only post-door false positives must not fire");

const combatVisualMediumFalsePositiveRuntime = runtimeFactory.create(publicProfile);
combatVisualMediumFalsePositiveRuntime.predictions = 4380;
const combatVisualMediumFalsePositiveAction = combatVisualMediumFalsePositiveRuntime.predict({
  health: 100,
  depthSig: 0.43,
  contextDict: "corridor",
  wallVector: 0,
  doorOpenedCount: 1,
  centralHallEntered: false,
  computerRoomConfidence: 0.24,
  enemyConfidence: 0.72,
  visualEnemyConfidence: 0.72,
  enemyStructuralDecoy: true,
  trustedEnemyThreat: 0,
  trustedCombatEvidence: false,
  audioEnemyConfidence: 0.01,
  audioEnemyStrong: false,
  faceSig: 0.0,
  visualEnemyVisible: true,
  visualEnemyCentered: true,
  visualEnemyYaw: 12,
  visualEnemyFireReady: true,
  enemyCombatYaw: 12,
  semanticMemory: {
    symbols: {
      door: 0.2,
      corridor: 0.35,
      enemy: 0.72,
      "safe-zone": 0.2,
      bridge: 0.3,
      "computer-room": 0.24
    }
  }
});
assert(combatVisualMediumFalsePositiveAction.stage !== "combat-visual-center-fire", "Medium visual-only red/brown post-door false positives should not fire without audio or face evidence");
assert(combatVisualMediumFalsePositiveAction.fire === false, "Medium visual-only post-door false positives must not fire");

const lowHealthGoalFirstRuntime = runtimeFactory.create(publicProfile);
lowHealthGoalFirstRuntime.predictions = 4200;
const lowHealthGoalFirstAction = lowHealthGoalFirstRuntime.predict({
  healthSensor: { value: 42, health: 42, lowHealth: true, lowHealthThreshold: 50 },
  health: 100,
  depthSig: 0.86,
  contextDict: "corridor",
  wallVector: 0.08,
  doorOpenedCount: 1,
  soundEvent: true,
  faceSig: 0.8,
  enemyConfidence: 0.7,
  bridgeBrownScore: 0.10,
  bridgeGreenCenter: 0.05,
  bridgeLaneTurn: "right",
  computerRoomConfidence: 0.38,
  semanticMemory: {
    symbols: {
      door: 0.2,
      corridor: 0.35,
      enemy: 0.7,
      "safe-zone": 0.2,
      bridge: 0.45,
      "computer-room": 0.38
    }
  }
});
assert(lowHealthGoalFirstAction.stage === "low-health-goal-first", `Post-door HP under 50 should prioritize goal-first routing over combat (actual=${lowHealthGoalFirstAction.stage})`);
assert(lowHealthGoalFirstAction.move === "forward", "Low-health goal-first should keep moving toward the route");
assert(lowHealthGoalFirstAction.fire === false, "Low-health goal-first should not spend time fighting");

const bridgePoisonLowHealthRuntime = runtimeFactory.create(publicProfile);
bridgePoisonLowHealthRuntime.predictions = 4200;
const bridgePoisonLowHealthAction = bridgePoisonLowHealthRuntime.predict({
  healthSensor: { value: 42, health: 42, lowHealth: true, lowHealthThreshold: 50 },
  health: 100,
  depthSig: 0.72,
  contextDict: "corridor",
  wallVector: 0.08,
  doorOpenedCount: 1,
  enemyConfidence: 0.18,
  bridgeBrownScore: 0.48,
  bridgeGreenCenter: 0.36,
  bridgeLaneTurn: "right",
  bridgeConfidence: 0.52,
  motionForwardProgress: 0.28,
  semanticMemory: {
    symbols: {
      door: 0.2,
      corridor: 0.35,
      enemy: 0.18,
      "safe-zone": 0.2,
      bridge: 0.52,
      "computer-room": 0.38
    }
  }
});
assert(bridgePoisonLowHealthAction.stage === "bridge-poison-straight-lock", `Bridge poison hazard should lock straight movement even under low health (actual=${bridgePoisonLowHealthAction.stage})`);
assert(bridgePoisonLowHealthAction.move === "forward", "Bridge poison lock should keep moving forward");
assert(bridgePoisonLowHealthAction.turn === "none", "Bridge poison lock should suppress lateral drift");
assert(bridgePoisonLowHealthAction.strafe === false, "Bridge poison lock should not strafe toward the poison lane");
assert(bridgePoisonLowHealthAction.run === true, "Bridge poison lock should run across the bridge lane");
assert(bridgePoisonLowHealthAction.fire === false, "Bridge poison lock should not stop to fight");

const criticalHealthRuntime = runtimeFactory.create(publicProfile);
criticalHealthRuntime.predictions = 4200;
const criticalHealthAction = criticalHealthRuntime.predict({
  healthSensor: { value: 12, health: 12, lowHealth: true, lowHealthThreshold: 50 },
  health: 100,
  depthSig: 0.86,
  contextDict: "corridor",
  wallVector: 0.08,
  doorOpenedCount: 1,
  enemyConfidence: 0.7,
  semanticMemory: {
    symbols: {
      door: 0.2,
      corridor: 0.35,
      enemy: 0.7,
      "safe-zone": 0.2,
      bridge: 0.45,
      "computer-room": 0.38
    }
  }
});
assert(criticalHealthAction.stage === "low-health-escape", `Critical HP should still use emergency escape instead of goal-first (actual=${criticalHealthAction.stage})`);

const demoRouteRuntime = runtimeFactory.create(publicProfile);
demoRouteRuntime.predictions = 128;
const demoRouteAction = demoRouteRuntime.predict({
  health: 100,
  depthSig: 0.72,
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

const demoRouteInitialFootSignalRuntime = runtimeFactory.create(publicProfile);
demoRouteInitialFootSignalRuntime.predictions = 128;
const demoRouteInitialFootSignalAction = demoRouteInitialFootSignalRuntime.predict({
  health: 100,
  depthSig: 0.72,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.50,
  footObstacleScore: 0.50,
  footObstacleFlickerScore: 0,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.14,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.30,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(demoRouteInitialFootSignalAction.stage === "demo-spawn-map-centerline", "Initial demo route should ignore open-space foot-noise and keep the deterministic route");
assert(demoRouteInitialFootSignalAction.move === "forward", "Initial open-space foot-noise should not back the route away from the spawn line");

const demoRouteInitialCloseFootClearRuntime = runtimeFactory.create(publicProfile);
demoRouteInitialCloseFootClearRuntime.predictions = 128;
const demoRouteInitialCloseFootClearAction = demoRouteInitialCloseFootClearRuntime.predict({
  health: 100,
  depthSig: 0.42,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.50,
  footObstacleScore: 0.50,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(demoRouteInitialCloseFootClearAction.stage === "demo-spawn-map-centerline", `Opening route should avoid immediate backoff before the visual sweep has stabilized the spawn geometry (actual=${demoRouteInitialCloseFootClearAction.stage})`);
assert(demoRouteInitialCloseFootClearAction.move === "forward", "Opening route should keep forward pressure instead of backing away from the blue-floor lane");

const demoRouteOpeningPillarEvidenceRuntime = runtimeFactory.create(publicProfile);
demoRouteOpeningPillarEvidenceRuntime.predictions = 128;
const demoRouteOpeningPillarEvidenceAction = demoRouteOpeningPillarEvidenceRuntime.predict({
  health: 100,
  depthSig: 0,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  blueFloorScore: 0.00,
  spawnCorridorGapScore: 0.28,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.40,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0.11,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(demoRouteOpeningPillarEvidenceAction.stage === "demo-spawn-map-centerline", `Opening pillar/gap evidence should suppress the early foot-clear backoff (actual=${demoRouteOpeningPillarEvidenceAction.stage})`);
assert(demoRouteOpeningPillarEvidenceAction.move === "forward", "Opening pillar/gap evidence should keep crossing the blue-floor lane");

const demoRouteBlueFloorFootNoiseRuntime = runtimeFactory.create(publicProfile);
demoRouteBlueFloorFootNoiseRuntime.predictions = 128;
const demoRouteBlueFloorFootNoiseAction = demoRouteBlueFloorFootNoiseRuntime.predict({
  health: 100,
  depthSig: 0,
  contextDict: "wall",
  wallVector: 0.2,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  blueFloorScore: 0.28,
  spawnCorridorGapScore: 0.27,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0.45,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(demoRouteBlueFloorFootNoiseAction.stage === "demo-spawn-map-centerline" || demoRouteBlueFloorFootNoiseAction.stage === "demo-spawn-blue-floor-centerline", `Blue-floor opening should suppress foot-noise clear and keep moving forward (actual=${demoRouteBlueFloorFootNoiseAction.stage})`);
assert(demoRouteBlueFloorFootNoiseAction.move === "forward", "Blue-floor opening should cross the blue floor instead of backing away from the route");

const demoRouteArcRuntime = runtimeFactory.create(publicProfile);
demoRouteArcRuntime.predictions = 430;
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
demoRouteSensorReleaseRuntime.predictions = 580;
const demoRouteSensorReleaseAction = demoRouteSensorReleaseRuntime.predict({
  health: 100,
  depthSig: 0.92,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.27,
  footObstacleScore: 0.27,
  actionRepeatFrames: 66,
  turnRepeatFrames: 240,
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
assert(demoRouteSensorReleaseAction.stage === "demo-spawn-map-sensor-release" || demoRouteSensorReleaseAction.stage === "spawn-landmark-pivot-loop-advance", `Long repeated spawn arcs should hand off from the fixed route to sensor-guided yaw (actual=${demoRouteSensorReleaseAction.stage})`);
assert(demoRouteSensorReleaseAction.move === "forward", "Sensor release should keep the route moving forward");
assert(demoRouteSensorReleaseAction.turn === "right", "Sensor release should keep steering toward the detected route gap");
const demoRouteSensorReleaseState = demoRouteSensorReleaseRuntime.status().autoplayState;
assert(demoRouteSensorReleaseState.routeAbortHint === "spawn-route-arc" || demoRouteSensorReleaseState.routeMode === "door-approach", "Sensor release should expose either the exhausted fixed arc budget or the door-approach route handoff");

const spawnSenseSettleRuntime = runtimeFactory.create(publicProfile);
spawnSenseSettleRuntime.predictions = 12;
const spawnSenseSettleAction = spawnSenseSettleRuntime.predict({
  health: 100,
  depthSig: 0.72,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.0,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  doorOpenedCount: 0,
  blueFloorScore: 0,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(spawnSenseSettleAction.stage === "demo-spawn-sense-settle-left", `Opening should sweep left while the first visual packet is still warming up (actual=${spawnSenseSettleAction.stage})`);
assert(spawnSenseSettleAction.move === "none", "Opening settle should not move while the first visual packet is still warming up");
assert(spawnSenseSettleAction.turn === "left", "Opening settle should lightly sweep left to expose pillar edges and depth");

const spawnSenseSettleReturnRuntime = runtimeFactory.create(publicProfile);
spawnSenseSettleReturnRuntime.predictions = 72;
const spawnSenseSettleReturnAction = spawnSenseSettleReturnRuntime.predict({
  health: 100,
  depthSig: 0.72,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.0,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  doorOpenedCount: 0,
  blueFloorScore: 0,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(spawnSenseSettleReturnAction.stage === "demo-spawn-sense-settle-right", `Opening should sweep right after the left sample to recover heading (actual=${spawnSenseSettleReturnAction.stage})`);
assert(spawnSenseSettleReturnAction.move === "none", "Opening return sweep should still avoid translational movement");
assert(spawnSenseSettleReturnAction.turn === "right", "Opening return sweep should recover heading before the blue-floor run");

const blueFloorCenterlineRuntime = runtimeFactory.create(publicProfile);
blueFloorCenterlineRuntime.predictions = 300;
const blueFloorCenterlineAction = blueFloorCenterlineRuntime.predict({
  health: 100,
  depthSig: 0.72,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.20,
  footObstacleScore: 0.20,
  doorOpenedCount: 0,
  blueFloorScore: 0.11,
  spawnCorridorGapScore: 0.26,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(blueFloorCenterlineAction.stage === "demo-spawn-blue-floor-centerline", `Blue-floor opening lane should keep the spawn line before turning NE (actual=${blueFloorCenterlineAction.stage})`);
assert(blueFloorCenterlineAction.move === "forward", "Blue-floor centerline should keep moving forward");
assert(blueFloorCenterlineAction.turn === "none", "Blue-floor centerline should not rotate before the NE cut");

const openLaneNeCutRuntime = runtimeFactory.create(publicProfile);
openLaneNeCutRuntime.predictions = 580;
const openLaneNeCutAction = openLaneNeCutRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  doorOpenedCount: 0,
  blueFloorScore: 0.0,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(openLaneNeCutAction.stage === "demo-spawn-open-lane-ne-cut", `Open-lane spawn route should cut NE when blue floor is not detected but the right ingress evidence is present (actual=${openLaneNeCutAction.stage})`);
assert(openLaneNeCutAction.move === "forward", "Open-lane NE cut should preserve forward pressure");
assert(openLaneNeCutAction.turn === "right", "Open-lane NE cut should steer toward the north-east corridor");

const openingPillarSuppressRuntime = runtimeFactory.create(publicProfile);
openingPillarSuppressRuntime.predictions = 440;
const openingPillarSuppressAction = openingPillarSuppressRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  doorOpenedCount: 0,
  blueFloorScore: 0.0,
  spawnCorridorGapScore: 0.24,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0.07,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(openingPillarSuppressAction.stage === "demo-spawn-open-lane-centerline", `Opening pillar edge should not trigger the NE cut before the blue-floor run has enough travel time (actual=${openingPillarSuppressAction.stage})`);
assert(openingPillarSuppressAction.move === "forward", "Opening pillar suppression should keep forward pressure");
assert(openingPillarSuppressAction.turn === "none", "Opening pillar suppression should avoid early right rotation");

const blueFloorNeCutRuntime = runtimeFactory.create(publicProfile);
blueFloorNeCutRuntime.predictions = 420;
const blueFloorNeCutAction = blueFloorNeCutRuntime.predict({
  health: 100,
  depthSig: 0.90,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.20,
  footObstacleScore: 0.20,
  doorOpenedCount: 0,
  blueFloorScore: 0.11,
  spawnCorridorGapScore: 0.31,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.42,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  spawnSecretDoorScore: 0,
  profileParameters: {
    openCruiseWallVectorDeadZone: 0.08,
    doorAimYawDegrees: 18
  }
});
assert(blueFloorNeCutAction.stage === "demo-spawn-blue-floor-ne-cut", `Blue-floor route should cut NE when the corridor gap is visible before the front wall (actual=${blueFloorNeCutAction.stage})`);
assert(blueFloorNeCutAction.move === "forward", "Blue-floor NE cut should keep forward motion");
assert(blueFloorNeCutAction.turn === "right", "Blue-floor NE cut should steer toward the north-east corridor");

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
  previousRouteMode: "spawn-approach",
  wallVector: 0.2,
  doorOpenedCount: 0,
  predictions: 3200,
  spawnCorridorGapScore: 0.12,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.20,
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

const doorApproachTimeoutRuntime = runtimeFactory.create(publicProfile);
doorApproachTimeoutRuntime.predictions = 3200;
const doorApproachTimeoutAction = doorApproachTimeoutRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.2,
  doorOpenedCount: 0,
  predictions: 3200,
  spawnCorridorGapScore: 0.41,
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
assert(doorApproachTimeoutAction.stage !== "spawn-route-timeout-survey", "Door-approach phase should not fall back to spawn timeout survey while corridor evidence remains");
assert(doorApproachTimeoutAction.move !== "back", "Door-approach timeout suppression should avoid backing away from the FirstDoor ingress");

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
assert(spawnWallPivotAction.turn === "left", "Close-wall spawn pivot should reverse away from the locked gap before reacquiring");
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
assert(spawnGapWallPivotCloseFootAction.stage === "spawn-gap-wall-pivot", `Medium-close route-foot occlusion should stay in the gap wall pivot (actual=${spawnGapWallPivotCloseFootAction.stage})`);
assert(spawnGapWallPivotCloseFootAction.move === "back", "Medium-close route-foot occlusion should back out instead of scraping forward");
assert(spawnGapWallPivotCloseFootAction.turn === "left", "Medium-close route-foot occlusion should reverse away from the locked route gap");

const doorCorridorFootPressureAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.39,
  footObstacleScore: 0.65,
  motionObstacleScore: 0.65,
  contextDict: "corridor",
  wallVector: 0.2,
  doorOpenedCount: 0,
  predictions: 1494,
  actionRepeatFrames: 1,
  spawnSecretDoorScore: 0.06,
  spawnCorridorGapScore: 0.36,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.48,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
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
assert(doorCorridorFootPressureAction.stage === "door-approach-corridor-ingress-hold", `Corridor foot pressure with stable route evidence should hold ingress (actual=${doorCorridorFootPressureAction.stage})`);
assert(doorCorridorFootPressureAction.move === "forward", "Corridor foot pressure with stable route evidence should preserve ingress instead of backing out");

const doorWallIngressHoldAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.23,
  footObstacleScore: 0.50,
  motionObstacleScore: 0.50,
  contextDict: "wall",
  previousRouteMode: "door-approach",
  actionRepeatFrames: 1,
  moveRepeatFrames: 3,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 1778,
  spawnCorridorGapScore: 0.42,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.54,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.09,
  bridgeDoorScore: 0.29,
  firstDoorVision9x9Score: 0.16,
  firstDoorUse3x3Score: 0,
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.42,
      corridor: 0.56,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.29,
      "computer-room": 0
    }
  }
});
assert(doorWallIngressHoldAction.stage === "door-approach-wall-ingress-hold", `Wall contact with strong ingress evidence should hold forward instead of spawn gap backoff (actual=${doorWallIngressHoldAction.stage})`);
assert(doorWallIngressHoldAction.move === "forward", "Wall ingress hold should preserve forward pressure toward the corridor");
assert(doorWallIngressHoldAction.turn === "right", "Wall ingress hold should continue yawing toward the visible ingress side");

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
  bridgeDoorScore: 0.40,
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

const firstDoorWeakBridgeRedPanelAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.95,
  contextDict: "wall",
  wallVector: 0.2,
  doorOpenedCount: 0,
  courtyardScore: 0.24,
  spawnCorridorGapScore: 0.24,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 120,
  spawnLandmarkRouteEvidence: 0.37,
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.17,
  firstDoorVision9x9Score: 0.55,
  firstDoorVision9x9RedScore: 0.59,
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
assert(firstDoorWeakBridgeRedPanelAction.stage === "first-door-route-vision-approach", `Weak bridge-door evidence plus a strong red panel should latch FirstDoor route vision (actual=${firstDoorWeakBridgeRedPanelAction.stage})`);

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

const firstDoorVisionCourtyardBridgeFalsePositiveAction = spawnGapRuntime.predict({
  health: 38,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  doorOpenedCount: 0,
  courtyardScore: 0.34,
  courtyardTurn: "right",
  spawnSecretDoorScore: 0.00,
  spawnCorridorGapScore: 0.36,
  spawnCorridorGapTurn: "right",
  bridgeDoorScore: 0.30,
  firstDoorVision9x9Score: 0.71,
  firstDoorVision9x9RedScore: 0.08,
  firstDoorUse3x3Score: 0.1,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.30,
      "computer-room": 0
    }
  }
});
assert(firstDoorVisionCourtyardBridgeFalsePositiveAction.stage !== "first-door-route-vision-approach", "Courtyard-wall red/bridge-like accents should not latch the FirstDoor 9x9 approach");
assert(firstDoorVisionCourtyardBridgeFalsePositiveAction.stage !== "first-door-route-vision-hold", "Courtyard-wall red/bridge-like accents should not latch the FirstDoor 9x9 hold");

const firstDoorVisionHoldAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.95,
  contextDict: "wall",
  wallVector: 0.2,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.41,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 120,
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.40,
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

const eastWindowRecoverBudgetRuntime = runtimeFactory.create(publicProfile);
eastWindowRecoverBudgetRuntime.predictions = 1500;
const eastWindowRecoverBudgetAction = eastWindowRecoverBudgetRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  doorOpenedCount: 0,
  courtyardScore: 0.34,
  courtyardTurn: "right",
  spawnSecretDoorScore: 0.19,
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
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
assert(eastWindowRecoverBudgetAction.stage === "spawn-route-recover-budget-reacquire", `Recover budget exhaustion should switch from long east-window recovery to structural reacquire (actual=${eastWindowRecoverBudgetAction.stage})`);
assert(eastWindowRecoverBudgetAction.stage !== "spawn-east-window-route-recover", "Recover budget exhaustion should stop the long east-window route recovery stage");

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

const doorApproachLowGapRuntime = runtimeFactory.create(publicProfile);
doorApproachLowGapRuntime.predictions = 1171;
const doorApproachLowGapAction = doorApproachLowGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  actionRepeatFrames: 3,
  previousRouteMode: "door-approach",
  doorOpenedCount: 0,
  courtyardScore: 0.36,
  courtyardTurn: "right",
  spawnSecretDoorScore: 0.07,
  spawnCorridorGapScore: 0.19,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.42,
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
assert(doorApproachLowGapAction.stage === "door-approach-structural-fallback", `Door-approach low-gap state should stay in the door lane instead of spawn east-window survey (actual=${doorApproachLowGapAction.stage})`);
assert(doorApproachLowGapAction.stage !== "spawn-east-window-low-gap-survey", "Door-approach mode should suppress broad spawn east-window low-gap survey");

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
  courtyardTurn: "none",
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

const lateCornerStallRuntime = runtimeFactory.create(publicProfile);
lateCornerStallRuntime.predictions = 5511;
const lateCornerStallAction = lateCornerStallRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  turnRepeatFrames: 10,
  doorOpenedCount: 0,
  courtyardScore: 0.24,
  courtyardTurn: "left",
  spawnSecretDoorScore: 0.04,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.32,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  routeTextureWallOcclusion: false,
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
assert(lateCornerStallAction.stage !== "spawn-corner-stall-backoff", "Late door-approach corner loops should leave the spawn-only corner backoff budget");

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

const landmarkAdvanceBudgetRuntime = runtimeFactory.create(publicProfile);
landmarkAdvanceBudgetRuntime.predictions = 1200;
const landmarkAdvanceBudgetAction = landmarkAdvanceBudgetRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.50,
  footObstacleScore: 0.50,
  actionRepeatFrames: 140,
  previousRouteMode: "door-approach",
  doorOpenedCount: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  spawnSecretDoorScore: 0.06,
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.21,
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
assert(landmarkAdvanceBudgetAction.stage === "spawn-landmark-loop-ingress-trim", `Long weak landmark advance in door-approach should trim toward the ingress lane (actual=${landmarkAdvanceBudgetAction.stage})`);
assert(landmarkAdvanceBudgetAction.move === "forward", "Ingress trim should preserve forward pressure while leaving the clockwise loop");
assert(landmarkAdvanceBudgetAction.turn === "right", "Ingress trim should follow the visible right-side corridor gap instead of the stale clockwise route arc");

const landmarkAdvanceStrongGapRuntime = runtimeFactory.create(publicProfile);
landmarkAdvanceStrongGapRuntime.predictions = 1200;
const landmarkAdvanceStrongGapAction = landmarkAdvanceStrongGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.2,
  motionForwardProgress: 0.27,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  actionRepeatFrames: 140,
  previousRouteMode: "door-approach",
  doorOpenedCount: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  spawnSecretDoorScore: 0.06,
  spawnCorridorGapScore: 0.39,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  firstDoorVision9x9Score: 0.21,
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
assert(landmarkAdvanceStrongGapAction.stage !== "route-planner-landmark-advance-budget-backoff", "Visible gap should suppress advance-budget backoff");
assert(landmarkAdvanceStrongGapAction.move !== "back", "Visible gap should keep structural progress during repeated advance");

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

const firstDoorVisionUseRuntime = runtimeFactory.create(publicProfile);
firstDoorVisionUseRuntime.predictions = 600;
const firstDoorVisionUseAction = firstDoorVisionUseRuntime.predict({
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

const firstDoorGapWallProbeUseRuntime = runtimeFactory.create(publicProfile);
firstDoorGapWallProbeUseRuntime.predictions = 2100;
const firstDoorGapWallProbeUseAction = firstDoorGapWallProbeUseRuntime.predict({
  health: 100,
  depthSig: 0.08,
  contextDict: "wall",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.42,
  motionForwardProgress: 0,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  actionRepeatFrames: 18,
  doorOpenedCount: 0,
  predictions: 2100,
  spawnCorridorGapScore: 0.41,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.53,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.07,
  firstDoorVision9x9Score: 0.39,
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
assert(firstDoorGapWallProbeUseAction.stage === "first-door-gap-wall-probe-use", `High-gap wall contact near the FirstDoor route should probe Use before scraping forward (actual=${firstDoorGapWallProbeUseAction.stage})`);
assert(firstDoorGapWallProbeUseAction.use === true, "High-gap wall contact should emit a bounded Use probe");
assert(firstDoorGapWallProbeUseAction.move === "none", "High-gap wall contact should stop movement while probing Use");

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
assert(firstDoorWallObstacleAction.stage === "spawn-wall-obstacle-turn" || firstDoorWallObstacleAction.stage === "demo-spawn-arc-foot-clear", `Wall obstacle evidence should suppress 9x9-only first-door approach (actual=${firstDoorWallObstacleAction.stage})`);
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
assert(liveWallTextureOcclusionAction.stage === "spawn-wall-obstacle-turn" || liveWallTextureOcclusionAction.stage === "demo-spawn-arc-foot-clear", `Texture-wall occlusion should escape the wall even when depth remains open (actual=${liveWallTextureOcclusionAction.stage})`);
assert(liveWallTextureOcclusionAction.move === "back", "Texture-wall occlusion should back out before resuming the locked route");

const wideGapFootOcclusionAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "spawn-approach",
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
assert(wideGapFootOcclusionAction.stage === "spawn-wall-obstacle-turn" || wideGapFootOcclusionAction.stage === "demo-spawn-arc-foot-clear", `High-confidence foot occlusion should clear before following a wide spawn gap (actual=${wideGapFootOcclusionAction.stage})`);
assert(wideGapFootOcclusionAction.move === "back", "Wide-gap foot occlusion should back out instead of continuing the route");

const highGapFirstDoorFootOcclusionRuntime = runtimeFactory.create(publicProfile);
highGapFirstDoorFootOcclusionRuntime.predictions = 2319;
const highGapFirstDoorFootOcclusionAction = highGapFirstDoorFootOcclusionRuntime.predict({
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

const doorApproachGapRightIngressReleaseRuntime = runtimeFactory.create(publicProfile);
doorApproachGapRightIngressReleaseRuntime.predictions = 1907;
const doorApproachGapRightIngressReleaseAction = doorApproachGapRightIngressReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.39,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.0,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  predictions: 1907,
  spawnCorridorGapScore: 0.41,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.43,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.11,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.055,
  firstDoorUse3x3Score: 0.0,
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
assert(doorApproachGapRightIngressReleaseAction.stage === "door-approach-gap-right-ingress-release", `Door-approach right gap should release toward the visible ingress instead of trimming left (actual=${doorApproachGapRightIngressReleaseAction.stage})`);
assert(doorApproachGapRightIngressReleaseAction.move === "forward", "Door-approach right gap release should preserve forward pressure");
assert(doorApproachGapRightIngressReleaseAction.turn === "right", "Door-approach right gap release should turn into the visible right-side ingress");

const doorApproachRightIngressDeadEndRuntime = runtimeFactory.create(publicProfile);
doorApproachRightIngressDeadEndRuntime.predictions = 6927;
const doorApproachRightIngressDeadEndAction = doorApproachRightIngressDeadEndRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  gapVector: 0.35,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 2,
  moveRepeatFrames: 2,
  turnRepeatFrames: 35,
  doorOpenedCount: 0,
  predictions: 6927,
  spawnCorridorGapScore: 0.25,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.42,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.055,
  firstDoorUse3x3Score: 0.0,
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
assert(doorApproachRightIngressDeadEndAction.stage === "route-dead-end-barrel-trim", `Right-ingress dead-end topology should trim inward instead of continuing release (actual=${doorApproachRightIngressDeadEndAction.stage})`);
assert(doorApproachRightIngressDeadEndAction.move === "forward", "Right-ingress dead-end trim should keep controlled forward pressure");
assert(doorApproachRightIngressDeadEndAction.turn === "right", "Right-ingress dead-end trim should follow the visible ingress gap instead of the old fixed left trim");

const doorApproachLowGapCornerDeadEndRuntime = runtimeFactory.create(publicProfile);
doorApproachLowGapCornerDeadEndRuntime.predictions = 1616;
const doorApproachLowGapCornerDeadEndAction = doorApproachLowGapCornerDeadEndRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 2,
  moveRepeatFrames: 24,
  turnRepeatFrames: 2,
  doorOpenedCount: 0,
  predictions: 1616,
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.40,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.055,
  firstDoorUse3x3Score: 0.0,
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
assert(doorApproachLowGapCornerDeadEndAction.stage === "door-approach-low-gap-dead-end-backoff", `Low-gap dead-end corner should back off before weak-gap pivot pushes into the wall (actual=${doorApproachLowGapCornerDeadEndAction.stage})`);
assert(doorApproachLowGapCornerDeadEndAction.move === "back", "Low-gap dead-end corner should reverse briefly");
assert(doorApproachLowGapCornerDeadEndAction.turn === "left", "Low-gap dead-end corner should yaw away from the dead route line");

const doorApproachLowGapRepeatDeadEndRuntime = runtimeFactory.create(publicProfile);
doorApproachLowGapRepeatDeadEndRuntime.predictions = 2072;
const doorApproachLowGapRepeatDeadEndAction = doorApproachLowGapRepeatDeadEndRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 28,
  moveRepeatFrames: 28,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 2072,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.40,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.11,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.055,
  firstDoorUse3x3Score: 0.0,
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
assert(["door-approach-low-gap-dead-end-repeat-backoff", "door-approach-weak-gap-wall-backoff", "door-approach-weak-gap-loop-release"].includes(doorApproachLowGapRepeatDeadEndAction.stage), `Repeated low-gap dead-end should escape instead of falling into weak-gap forward-left pivot (actual=${doorApproachLowGapRepeatDeadEndAction.stage})`);
assert(doorApproachLowGapRepeatDeadEndAction.stage !== "door-approach-weak-gap-landmark-pivot", "Repeated low-gap dead-end should not continue the forward-left weak-gap pivot");
assert(doorApproachLowGapRepeatDeadEndAction.turn === "right", "Repeated low-gap dead-end should turn back toward the visible gap");

const doorApproachIngressCornerBackoffRuntime = runtimeFactory.create(publicProfile);
doorApproachIngressCornerBackoffRuntime.predictions = 2337;
const doorApproachIngressCornerBackoffAction = doorApproachIngressCornerBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.22,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0.0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 13,
  moveRepeatFrames: 240,
  turnRepeatFrames: 13,
  doorOpenedCount: 0,
  predictions: 2337,
  spawnCorridorGapScore: 0.24,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.055,
  firstDoorUse3x3Score: 0.0,
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
assert(doorApproachIngressCornerBackoffAction.stage === "door-approach-ingress-corner-backoff", `Repeated right-ingress pressure should back off from the corner before continuing (actual=${doorApproachIngressCornerBackoffAction.stage})`);
assert(doorApproachIngressCornerBackoffAction.move === "back", "Repeated right-ingress corner pressure should reverse briefly");
assert(doorApproachIngressCornerBackoffAction.turn === "right", "Repeated right-ingress corner pressure should keep yawing toward the corridor gap");

const doorApproachRightCornerRealignRuntime = runtimeFactory.create(publicProfile);
doorApproachRightCornerRealignRuntime.predictions = 2365;
const doorApproachRightCornerRealignAction = doorApproachRightCornerRealignRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.38,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.50,
  footObstacleScore: 0.50,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 11,
  moveRepeatFrames: 11,
  turnRepeatFrames: 11,
  doorOpenedCount: 0,
  predictions: 2365,
  blueFloorScore: 0,
  spawnCorridorGapScore: 0.25,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
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
assert(doorApproachRightCornerRealignAction.stage === "door-approach-right-corner-realign", `Visible right-corner opening should realign before pushing into the left wall (actual=${doorApproachRightCornerRealignAction.stage})`);
assert(doorApproachRightCornerRealignAction.move === "none", "Right-corner realign should pause forward pressure while the opening is brought toward center");
assert(doorApproachRightCornerRealignAction.turn === "right", "Right-corner realign should yaw toward the visible corridor opening");

const doorApproachLeftRedPanelRealignRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedPanelRealignRuntime.predictions = 2197;
const doorApproachLeftRedPanelRealignAction = doorApproachLeftRedPanelRealignRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 1,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 2197,
  blueFloorScore: 0,
  courtyardScore: 0.35,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.19,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.41,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.01,
  firstDoorVision9x9Score: 0.07,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.48,
      corridor: 0.54,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.01,
      "computer-room": 0
    }
  }
});
assert(doorApproachLeftRedPanelRealignAction.stage === "door-approach-left-red-panel-realign", `Left red door panel should pause weak right-gap pursuit and re-center the door (actual=${doorApproachLeftRedPanelRealignAction.stage})`);
assert(doorApproachLeftRedPanelRealignAction.move === "none", "Left red panel realign should stop forward pressure while aiming");
assert(doorApproachLeftRedPanelRealignAction.turn === "left", "Left red panel realign should yaw toward the visible door panel");

const doorApproachLeftRedPanelQuickUseRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedPanelQuickUseRuntime.predictions = 2734;
const doorApproachLeftRedPanelQuickUseAction = doorApproachLeftRedPanelQuickUseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: -0.23,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 2734,
  blueFloorScore: 0,
  courtyardScore: 0.24,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0,
  firstDoorVision9x9Score: 0.07,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.48,
      corridor: 0.54,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachLeftRedPanelQuickUseAction.stage === "door-approach-left-red-panel-quick-probe-use", `Observed left-red door panel should spend one bounded Use pulse before returning to a release loop (actual=${doorApproachLeftRedPanelQuickUseAction.stage})`);
assert(doorApproachLeftRedPanelQuickUseAction.use === true, "Observed left-red panel should emit a Use pulse while the cooldown is open");

const doorApproachEarlyWeakRedPanelGuardRuntime = runtimeFactory.create(publicProfile);
doorApproachEarlyWeakRedPanelGuardRuntime.predictions = 1020;
const doorApproachEarlyWeakRedPanelGuardAction = doorApproachEarlyWeakRedPanelGuardRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.30,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 1020,
  blueFloorScore: 0,
  courtyardScore: 0.24,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.25,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.00,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.48,
      corridor: 0.54,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachEarlyWeakRedPanelGuardAction.stage !== "door-approach-left-red-panel-quick-probe-use", `Early weak red object should not be treated as the FirstDoor left panel before ingress is established (actual=${doorApproachEarlyWeakRedPanelGuardAction.stage})`);
assert(doorApproachEarlyWeakRedPanelGuardAction.use === false, "Early weak red object should not emit Use before the route reaches the door band");

const doorApproachWeakBridgeDoorQuickUseRuntime = runtimeFactory.create(publicProfile);
doorApproachWeakBridgeDoorQuickUseRuntime.predictions = 1341;
const doorApproachWeakBridgeDoorQuickUseState = {
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 1341,
  blueFloorScore: 0,
  courtyardScore: 0.10,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.41,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.41,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.37,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.48,
      corridor: 0.54,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
};
const doorApproachWeakBridgeDoorQuickUseAction = doorApproachWeakBridgeDoorQuickUseRuntime.predict(doorApproachWeakBridgeDoorQuickUseState);
assert(doorApproachWeakBridgeDoorQuickUseAction.stage === "door-approach-high-bridge-door-probe-use", `A high bridge-door trace should Use even when courtyard red is absent (actual=${doorApproachWeakBridgeDoorQuickUseAction.stage})`);
assert(doorApproachWeakBridgeDoorQuickUseAction.use === true, "High bridge-door trace should emit a stopped Use pulse");
assert(doorApproachWeakBridgeDoorQuickUseAction.move === "none" && doorApproachWeakBridgeDoorQuickUseAction.turn === "none", "High bridge-door Use should hold position");
const doorApproachWeakBridgeDoorHeldPulseAction = doorApproachWeakBridgeDoorQuickUseRuntime.predict(Object.assign({}, doorApproachWeakBridgeDoorQuickUseState, {
  predictions: 1342,
  usePulseCooldown: 89
}));
assert(doorApproachWeakBridgeDoorHeldPulseAction.stage === "door-approach-post-use-door-response-hold", `Use pulse hold should transition into the response window (actual=${doorApproachWeakBridgeDoorHeldPulseAction.stage})`);
assert(doorApproachWeakBridgeDoorHeldPulseAction.use === true, "Use pulse hold should keep the electrical Use signal down for a short bounded window");
assert(doorApproachWeakBridgeDoorHeldPulseAction.move === "none" && doorApproachWeakBridgeDoorHeldPulseAction.turn === "none", "Use pulse hold should remain stationary");

const doorApproachTooWeakBridgeDoorQuickUseRuntime = runtimeFactory.create(publicProfile);
doorApproachTooWeakBridgeDoorQuickUseRuntime.predictions = 1026;
const doorApproachTooWeakBridgeDoorQuickUseAction = doorApproachTooWeakBridgeDoorQuickUseRuntime.predict(Object.assign({}, doorApproachWeakBridgeDoorQuickUseState, {
  predictions: 1026,
  bridgeDoorScore: 0.05,
  spawnCorridorGapScore: 0.21,
  spawnLandmarkRouteEvidence: 0.36
}));
assert(doorApproachTooWeakBridgeDoorQuickUseAction.stage !== "door-approach-weak-bridge-door-probe-use", `A very weak bridge-door trace must not emit early Use (actual=${doorApproachTooWeakBridgeDoorQuickUseAction.stage})`);
assert(doorApproachTooWeakBridgeDoorQuickUseAction.use === false, "Very weak bridge-door trace should wait for stronger door evidence");

const doorApproachLeftRedPanelObservedUseRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedPanelObservedUseRuntime.predictions = 2328;
const doorApproachLeftRedPanelObservedUseAction = doorApproachLeftRedPanelObservedUseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.26,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 2328,
  blueFloorScore: 0,
  courtyardScore: 0.28,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.19,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.24,
  bridgeDoorScore: 0.01,
  firstDoorVision9x9Score: 0.07,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.48,
      corridor: 0.54,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachLeftRedPanelObservedUseAction.stage === "door-approach-memory-contact-probe-use", `Live observed door-contact memory should Use before the red-panel evidence disappears into a route loop (actual=${doorApproachLeftRedPanelObservedUseAction.stage})`);
assert(doorApproachLeftRedPanelObservedUseAction.use === true, "Live observed door-contact memory should emit a bounded Use pulse");

const doorApproachCloseSecretBridgeUseRuntime = runtimeFactory.create(publicProfile);
doorApproachCloseSecretBridgeUseRuntime.predictions = 2715;
const doorApproachCloseSecretBridgeUseAction = doorApproachCloseSecretBridgeUseRuntime.predict({
  health: 100,
  depthSig: 0.96,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.26,
  motionForwardProgress: 0.26,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 6,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 2715,
  blueFloorScore: 0,
  courtyardScore: 0.13,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.50,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.68,
  spawnSecretDoorTurn: "left",
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.15,
  firstDoorVision9x9Score: 0.00,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.48,
      corridor: 0.54,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachCloseSecretBridgeUseAction.stage === "door-approach-close-secret-bridge-contact-use", `Close contact after red panel disappears should emit Use before barrel trim (actual=${doorApproachCloseSecretBridgeUseAction.stage})`);
assert(doorApproachCloseSecretBridgeUseAction.use === true, "Close contact after red panel disappears should emit one bounded Use pulse");
assert(doorApproachCloseSecretBridgeUseAction.move === "none" && doorApproachCloseSecretBridgeUseAction.turn === "none", "Close contact Use should be emitted from a stopped Kinesis state");
const doorApproachCloseSecretBridgePostUseHoldAction = doorApproachCloseSecretBridgeUseRuntime.predict({
  health: 100,
  depthSig: 0.96,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.26,
  motionForwardProgress: 0.26,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 6,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  blueFloorScore: 0,
  courtyardScore: 0.13,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.50,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.68,
  spawnSecretDoorTurn: "left",
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.15,
  firstDoorVision9x9Score: 0.00,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.48,
      corridor: 0.54,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachCloseSecretBridgePostUseHoldAction.stage === "door-approach-post-use-door-response-hold", `After a bounded Use pulse the agent should hold still for the door response window (actual=${doorApproachCloseSecretBridgePostUseHoldAction.stage})`);
assert(doorApproachCloseSecretBridgePostUseHoldAction.use === true, "Post-use hold should keep the bounded electrical Use pulse down briefly without re-deciding Use");
assert(doorApproachCloseSecretBridgePostUseHoldAction.move === "none" && doorApproachCloseSecretBridgePostUseHoldAction.turn === "none", "Post-use hold should keep Kinesis stopped");

const doorApproachPostUseFailedRealignRuntime = runtimeFactory.create(publicProfile);
doorApproachPostUseFailedRealignRuntime.predictions = 1825;
doorApproachPostUseFailedRealignRuntime.lastUsePulsePrediction = 1794;
doorApproachPostUseFailedRealignRuntime.usePulseCooldown = 30;
const doorApproachPostUseFailedRealignAction = doorApproachPostUseFailedRealignRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.26,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 4,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  blueFloorScore: 0,
  courtyardScore: 0.26,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.34,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  spawnSecretDoorTurn: "none",
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.00,
  firstDoorVision9x9Score: 0.00,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.48,
      corridor: 0.54,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachPostUseFailedRealignAction.stage === "door-approach-post-use-failed-left-realign", `After a missed Use pulse the agent should realign left instead of returning to the weak right gap (actual=${doorApproachPostUseFailedRealignAction.stage})`);
assert(doorApproachPostUseFailedRealignAction.use === false, "Post-use failed realign should not emit a second Use pulse during cooldown");
assert(doorApproachPostUseFailedRealignAction.move === "none" && doorApproachPostUseFailedRealignAction.turn === "left", "Post-use failed realign should stop translation and pivot left");

const doorApproachPostUseVisibleDoorSettleRuntime = runtimeFactory.create(publicProfile);
doorApproachPostUseVisibleDoorSettleRuntime.predictions = 3179;
doorApproachPostUseVisibleDoorSettleRuntime.lastUsePulsePrediction = 3151;
doorApproachPostUseVisibleDoorSettleRuntime.usePulseCooldown = 30;
const doorApproachPostUseVisibleDoorSettleAction = doorApproachPostUseVisibleDoorSettleRuntime.predict({
  health: 100,
  depthSig: 0.96,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 3,
  moveRepeatFrames: 0,
  turnRepeatFrames: 3,
  doorOpenedCount: 0,
  blueFloorScore: 0,
  courtyardScore: 0.03,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.50,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.07,
  spawnSecretDoorTurn: "none",
  bridgeLaneTurn: "none",
  bridgeDoorScore: 0.44,
  firstDoorVision9x9Score: 0.00,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.58,
      corridor: 0.50,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.44,
      "computer-room": 0
    }
  }
});
assert(doorApproachPostUseVisibleDoorSettleAction.stage === "door-approach-post-use-visible-door-settle", `Visible door after a failed pulse should wait for retry instead of turning away (actual=${doorApproachPostUseVisibleDoorSettleAction.stage})`);
assert(doorApproachPostUseVisibleDoorSettleAction.move === "none" && doorApproachPostUseVisibleDoorSettleAction.turn === "none", "Visible post-use door settle should keep aim fixed");
assert(doorApproachPostUseVisibleDoorSettleAction.use === false, "Visible post-use door settle should not issue another Use while cooldown is active");

const doorApproachPostUseCooldownSettleRuntime = runtimeFactory.create(publicProfile);
doorApproachPostUseCooldownSettleRuntime.predictions = 1850;
doorApproachPostUseCooldownSettleRuntime.lastUsePulsePrediction = 1794;
doorApproachPostUseCooldownSettleRuntime.usePulseCooldown = 30;
const doorApproachPostUseCooldownSettleAction = doorApproachPostUseCooldownSettleRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.26,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 18,
  moveRepeatFrames: 0,
  turnRepeatFrames: 18,
  doorOpenedCount: 0,
  blueFloorScore: 0,
  courtyardScore: 0.26,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.34,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  spawnSecretDoorTurn: "none",
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.00,
  firstDoorVision9x9Score: 0.00,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.48,
      corridor: 0.54,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachPostUseCooldownSettleAction.stage === "door-approach-post-use-cooldown-settle", `After a short failed-use correction the agent should hold still until the Use pulse cooldown clears (actual=${doorApproachPostUseCooldownSettleAction.stage})`);
assert(doorApproachPostUseCooldownSettleAction.use === false, "Cooldown settle should keep Use released");
assert(doorApproachPostUseCooldownSettleAction.move === "none" && doorApproachPostUseCooldownSettleAction.turn === "none", "Cooldown settle should not drift away from the door face");

const doorApproachPostUseStaleDoorMemoryUseRuntime = runtimeFactory.create(publicProfile);
doorApproachPostUseStaleDoorMemoryUseRuntime.predictions = 3776;
doorApproachPostUseStaleDoorMemoryUseRuntime.lastUsePulsePrediction = 3700;
doorApproachPostUseStaleDoorMemoryUseRuntime.usePulseCooldown = 0;
const doorApproachPostUseStaleDoorMemoryUseAction = doorApproachPostUseStaleDoorMemoryUseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.30,
  footObstacleScore: 0.30,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 0,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 3776,
  blueFloorScore: 0,
  courtyardScore: 0.19,
  courtyardTurn: "none",
  bridgeLaneTurn: "right",
  spawnCorridorGapScore: 0.29,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.41,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.30,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.50,
      corridor: 0.42,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.30,
      "computer-room": 0
    }
  }
});
assert(doorApproachPostUseStaleDoorMemoryUseAction.stage === "door-approach-post-use-stale-door-memory-use", `Stale post-use weak door memory should retry Use instead of idling in visible-door settle (actual=${doorApproachPostUseStaleDoorMemoryUseAction.stage})`);
assert(doorApproachPostUseStaleDoorMemoryUseAction.use === true, "Stale post-use weak door memory should emit a bounded retry Use pulse");
assert(doorApproachPostUseStaleDoorMemoryUseAction.move === "none" && doorApproachPostUseStaleDoorMemoryUseAction.turn === "none", "Stale post-use retry should fire Use from a stopped pose");

const doorApproachPostUseLeftStallBackoffRuntime = runtimeFactory.create(publicProfile);
doorApproachPostUseLeftStallBackoffRuntime.predictions = 2270;
doorApproachPostUseLeftStallBackoffRuntime.lastUsePulsePrediction = 2224;
doorApproachPostUseLeftStallBackoffRuntime.usePulseCooldown = 18;
const doorApproachPostUseLeftStallBackoffAction = doorApproachPostUseLeftStallBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.30,
  motionForwardProgress: 0.05,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 18,
  moveRepeatFrames: 0,
  turnRepeatFrames: 18,
  doorOpenedCount: 0,
  predictions: 2270,
  blueFloorScore: 0,
  courtyardScore: 0.20,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.24,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.09,
  spawnSecretDoorTurn: "none",
  bridgeLaneTurn: "right",
  bridgeDoorScore: 0.20,
  firstDoorVision9x9Score: 0.08,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.48,
      corridor: 0.54,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachPostUseLeftStallBackoffAction.stage === "door-approach-post-use-left-stall-backoff", `A long failed-use left pivot should back off and reacquire instead of spinning away from the door (actual=${doorApproachPostUseLeftStallBackoffAction.stage})`);
assert(doorApproachPostUseLeftStallBackoffAction.move === "back" && doorApproachPostUseLeftStallBackoffAction.turn === "right", "Failed-use left stall backoff should step back and yaw right for a fresh door face");

const doorApproachPostUseRetryRuntime = runtimeFactory.create(publicProfile);
doorApproachPostUseRetryRuntime.predictions = 4348;
doorApproachPostUseRetryRuntime.lastUsePulsePrediction = 2200;
doorApproachPostUseRetryRuntime.usePulseCooldown = 0;
const doorApproachPostUseRetryAction = doorApproachPostUseRetryRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 6,
  moveRepeatFrames: 6,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 4348,
  blueFloorScore: 0,
  courtyardScore: 0.13,
  courtyardTurn: "none",
  bridgeLaneTurn: "right",
  spawnCorridorGapScore: 0.32,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.44,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  bridgeDoorScore: 0.37,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.37,
      "computer-room": 0
    }
  }
});
assert(doorApproachPostUseRetryAction.stage === "door-approach-post-use-retry-bridge-probe-use", `Cooldown-expired post-use door evidence should retry Use instead of another realign loop (actual=${doorApproachPostUseRetryAction.stage})`);
assert(doorApproachPostUseRetryAction.use === true, "Cooldown-expired post-use door evidence should emit a bounded retry Use pulse");

const doorApproachPostUseRedMemoryRetryRuntime = runtimeFactory.create(publicProfile);
doorApproachPostUseRedMemoryRetryRuntime.predictions = 2256;
doorApproachPostUseRedMemoryRetryRuntime.lastUsePulsePrediction = 2110;
doorApproachPostUseRedMemoryRetryRuntime.usePulseCooldown = 0;
const doorApproachPostUseRedMemoryRetryAction = doorApproachPostUseRedMemoryRetryRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 27,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 2256,
  blueFloorScore: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  bridgeLaneTurn: "left",
  spawnCorridorGapScore: 0.24,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.32,
  spawnSecretDoorTurn: "right",
  bridgeDoorScore: 0.05,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.05,
      "computer-room": 0
    }
  }
});
assert(doorApproachPostUseRedMemoryRetryAction.stage === "door-approach-post-use-retry-red-memory-use", `Cooldown-expired post-use weak red memory should retry Use instead of another realign loop (actual=${doorApproachPostUseRedMemoryRetryAction.stage})`);
assert(doorApproachPostUseRedMemoryRetryAction.use === true, "Cooldown-expired post-use weak red memory should emit a bounded retry Use pulse");

const doorApproachPostUseSecretRetryRuntime = runtimeFactory.create(publicProfile);
doorApproachPostUseSecretRetryRuntime.predictions = 4042;
doorApproachPostUseSecretRetryRuntime.lastUsePulsePrediction = 2480;
doorApproachPostUseSecretRetryRuntime.usePulseCooldown = 0;
const doorApproachPostUseSecretRetryAction = doorApproachPostUseSecretRetryRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 6,
  moveRepeatFrames: 6,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 4042,
  blueFloorScore: 0,
  courtyardScore: 0.12,
  courtyardTurn: "right",
  bridgeLaneTurn: "right",
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.50,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.68,
  spawnSecretDoorTurn: "right",
  bridgeDoorScore: 0.17,
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.17,
      "computer-room": 0
    }
  }
});
assert(doorApproachPostUseSecretRetryAction.stage === "door-approach-post-use-retry-secret-probe-use", `Cooldown-expired post-use red/secret evidence should retry Use even when bridgeDoor is weak (actual=${doorApproachPostUseSecretRetryAction.stage})`);
assert(doorApproachPostUseSecretRetryAction.use === true, "Cooldown-expired post-use red/secret evidence should emit a bounded retry Use pulse");

const doorApproachLeftRedPanelTurnSettleAdvanceRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedPanelTurnSettleAdvanceRuntime.predictions = 3942;
const doorApproachLeftRedPanelTurnSettleAdvanceAction = doorApproachLeftRedPanelTurnSettleAdvanceRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 2,
  moveRepeatFrames: 0,
  turnRepeatFrames: 9,
  doorOpenedCount: 0,
  predictions: 3942,
  blueFloorScore: 0,
  courtyardScore: 0.31,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.00,
  bridgeDoorScore: 0.03,
  firstDoorVision9x9Score: 0.07,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.46,
      corridor: 0.46,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.03,
      "computer-room": 0
    }
  }
});
assert(doorApproachLeftRedPanelTurnSettleAdvanceAction.stage === "door-approach-left-red-panel-turn-settle-advance", `Repeated left-red realign should close distance instead of parking in place (actual=${doorApproachLeftRedPanelTurnSettleAdvanceAction.stage})`);
assert(doorApproachLeftRedPanelTurnSettleAdvanceAction.move === "forward", "Left-red turn settle should preserve forward pressure");
assert(doorApproachLeftRedPanelTurnSettleAdvanceAction.turn === "left", "Left-red turn settle should keep yawing into the panel");

const doorApproachLeftRedPanelCornerCenterRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedPanelCornerCenterRuntime.predictions = 3824;
const doorApproachLeftRedPanelCornerCenterAction = doorApproachLeftRedPanelCornerCenterRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 1,
  turnRepeatFrames: 6,
  doorOpenedCount: 0,
  predictions: 3824,
  blueFloorScore: 0,
  courtyardScore: 0.31,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.01,
  firstDoorVision9x9Score: 0.07,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.45,
      corridor: 0.44,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.01,
      "computer-room": 0
    }
  }
});
assert(doorApproachLeftRedPanelCornerCenterAction.stage === "door-approach-left-red-panel-corner-center", `Left-red corner stall should re-center right instead of continuing forward-left into the corner (actual=${doorApproachLeftRedPanelCornerCenterAction.stage})`);
assert(doorApproachLeftRedPanelCornerCenterAction.move === "none", "Left-red corner center should pause forward pressure");
assert(doorApproachLeftRedPanelCornerCenterAction.turn === "right", "Left-red corner center should yaw back toward the door face");

const doorApproachLeftRedPanelUseRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedPanelUseRuntime.predictions = 1889;
const doorApproachLeftRedPanelUseState = {
  health: 100,
  depthSig: 0.72,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.35,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 3,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 1889,
  blueFloorScore: 0,
  courtyardScore: 0.32,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.24,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.24,
  firstDoorVision9x9Score: 0.08,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.50,
      corridor: 0.46,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.24,
      "computer-room": 0
    }
  }
};
const doorApproachLeftRedPanelUseAction = doorApproachLeftRedPanelUseRuntime.predict(doorApproachLeftRedPanelUseState);
assert([
  "door-approach-left-red-panel-probe-use",
  "door-approach-upper-weak-bridge-panel-probe-use"
].includes(doorApproachLeftRedPanelUseAction.stage), `Repeated left red panel realign should spend one bounded Use pulse before another turn loop (actual=${doorApproachLeftRedPanelUseAction.stage})`);
assert(doorApproachLeftRedPanelUseAction.use === true, "Repeated left red panel evidence should emit one Use pulse");
assert(doorApproachLeftRedPanelUseAction.move === "none" && doorApproachLeftRedPanelUseAction.turn === "none", "Repeated left red panel Use should hold position");

const doorApproachLeftRedPanelUseCooldownRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedPanelUseCooldownRuntime.predictions = 1890;
const doorApproachLeftRedPanelUseCooldownAction = doorApproachLeftRedPanelUseCooldownRuntime.predict(Object.assign({}, doorApproachLeftRedPanelUseState, {
  usePulseCooldown: 45
}));
assert(doorApproachLeftRedPanelUseCooldownAction.stage !== "door-approach-left-red-panel-probe-use", "Repeated left red panel should not spend another Use pulse while cooldown is active");
assert(doorApproachLeftRedPanelUseCooldownAction.use === false, "Left red panel cooldown should keep Use released");

const doorApproachEarlyLeftRedPanelRuntime = runtimeFactory.create(publicProfile);
doorApproachEarlyLeftRedPanelRuntime.predictions = 830;
const doorApproachEarlyLeftRedPanelAction = doorApproachEarlyLeftRedPanelRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.35,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 1,
  turnRepeatFrames: 1,
  doorOpenedCount: 0,
  predictions: 830,
  blueFloorScore: 0,
  courtyardScore: 0.32,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.17,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.24,
  bridgeDoorScore: 0.21,
  firstDoorVision9x9Score: 0.08,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.48,
      corridor: 0.54,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.21,
      "computer-room": 0
    }
  }
});
assert(doorApproachEarlyLeftRedPanelAction.stage !== "door-approach-left-red-panel-realign", `Early weak left red object should not steal the spawn route before ingress is established (actual=${doorApproachEarlyLeftRedPanelAction.stage})`);
assert(doorApproachEarlyLeftRedPanelAction.use === false, "Early left red object should not trigger a door Use before ingress is established");

const doorApproachFarLeftRedPanelAdvanceRuntime = runtimeFactory.create(publicProfile);
doorApproachFarLeftRedPanelAdvanceRuntime.predictions = 1488;
const doorApproachFarLeftRedPanelAdvanceAction = doorApproachFarLeftRedPanelAdvanceRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.35,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.60,
  footObstacleScore: 0.60,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 3,
  moveRepeatFrames: 0,
  turnRepeatFrames: 8,
  doorOpenedCount: 0,
  predictions: 1488,
  blueFloorScore: 0,
  courtyardScore: 0.32,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.24,
  firstDoorVision9x9Score: 0.08,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.50,
      corridor: 0.46,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.24,
      "computer-room": 0
    }
  }
});
assert(doorApproachFarLeftRedPanelAdvanceAction.stage === "door-approach-weak-bridge-door-probe-use", `Repeated far left red panel with a bridge-door trace should spend a stopped Use pulse instead of drifting past the door (actual=${doorApproachFarLeftRedPanelAdvanceAction.stage})`);
assert(doorApproachFarLeftRedPanelAdvanceAction.use === true, "Far left red panel follow-up should try one stopped Use pulse once the bridge-door trace is visible");
assert(doorApproachFarLeftRedPanelAdvanceAction.move === "none" && doorApproachFarLeftRedPanelAdvanceAction.turn === "none", "Far left red panel Use should hold position");

const doorApproachLeftRedWallLostCenterRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedWallLostCenterRuntime.predictions = 4146;
const doorApproachLeftRedWallLostCenterAction = doorApproachLeftRedWallLostCenterRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 4146,
  blueFloorScore: 0,
  courtyardScore: 0.33,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.24,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.39,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.00,
  firstDoorVision9x9Score: 0.07,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.46,
      corridor: 0.46,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachLeftRedWallLostCenterAction.stage === "door-approach-left-red-wall-lost-center", `Left-red evidence lost against a blank wall should re-center instead of advancing into the wall (actual=${doorApproachLeftRedWallLostCenterAction.stage})`);
assert(doorApproachLeftRedWallLostCenterAction.move === "none", "Left-red wall-lost center should pause forward pressure");
assert(doorApproachLeftRedWallLostCenterAction.turn === "right", "Left-red wall-lost center should yaw back toward the door face");

const doorApproachLeftRedPanelFarUseRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedPanelFarUseRuntime.predictions = 3513;
const doorApproachLeftRedPanelFarUseState = {
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 2,
  moveRepeatFrames: 2,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 3513,
  blueFloorScore: 0,
  courtyardScore: 0.21,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.24,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  bridgeDoorScore: 0.00,
  firstDoorVision9x9Score: 0.08,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.48,
      corridor: 0.46,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
};
const doorApproachLeftRedPanelFarUseAction = doorApproachLeftRedPanelFarUseRuntime.predict(doorApproachLeftRedPanelFarUseState);
assert(doorApproachLeftRedPanelFarUseAction.stage === "door-approach-left-red-panel-quick-probe-use", `Late weak left-red panel should spend Use before the far fallback window (actual=${doorApproachLeftRedPanelFarUseAction.stage})`);
assert(doorApproachLeftRedPanelFarUseAction.use === true, "Late weak left-red panel should emit one bounded Use pulse");

const doorApproachLeftRedPanelFarUseCooldownRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedPanelFarUseCooldownRuntime.predictions = 3514;
const doorApproachLeftRedPanelFarUseCooldownAction = doorApproachLeftRedPanelFarUseCooldownRuntime.predict(Object.assign({}, doorApproachLeftRedPanelFarUseState, {
  usePulseCooldown: 45
}));
assert(doorApproachLeftRedPanelFarUseCooldownAction.stage !== "door-approach-left-red-panel-far-probe-use", "Late weak left-red panel should not repeat Use while cooldown is active");
assert(doorApproachLeftRedPanelFarUseCooldownAction.use === false, "Late weak left-red panel cooldown should keep Use released");

const doorApproachWeakGapTurnLoopLeftRedRuntime = runtimeFactory.create(publicProfile);
doorApproachWeakGapTurnLoopLeftRedRuntime.predictions = 7097;
const doorApproachWeakGapTurnLoopLeftRedAction = doorApproachWeakGapTurnLoopLeftRedRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  blueFloorScore: 0,
  wallVector: 0.56,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  actionRepeatFrames: 11,
  turnRepeatFrames: 11,
  doorOpenedCount: 0,
  courtyardScore: 0.19,
  courtyardTurn: "left",
  spawnSecretDoorScore: 0.04,
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.34,
  spawnLandmarkRouteTurn: "right",
  bridgeDoorScore: 0.00,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  routeTextureWallOcclusion: false,
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
assert(doorApproachWeakGapTurnLoopLeftRedAction.stage === "door-approach-memory-contact-probe-use", `Long right weak-gap loops with prior door evidence should spend Use before cutting away (actual=${doorApproachWeakGapTurnLoopLeftRedAction.stage})`);
assert(doorApproachWeakGapTurnLoopLeftRedAction.use === true, "Weak-gap door-contact memory should emit one bounded Use pulse");

const doorApproachWeakGapTurnRepeatLeftRedRuntime = runtimeFactory.create(publicProfile);
doorApproachWeakGapTurnRepeatLeftRedRuntime.predictions = 2210;
const doorApproachWeakGapTurnRepeatLeftRedAction = doorApproachWeakGapTurnRepeatLeftRedRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  blueFloorScore: 0,
  wallVector: 0.56,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  actionRepeatFrames: 3,
  turnRepeatFrames: 240,
  doorOpenedCount: 0,
  courtyardScore: 0.21,
  courtyardTurn: "none",
  spawnSecretDoorScore: 0.04,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.32,
  spawnLandmarkRouteTurn: "right",
  bridgeDoorScore: 0.00,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  routeTextureWallOcclusion: false,
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
assert(doorApproachWeakGapTurnRepeatLeftRedAction.stage === "door-approach-memory-contact-probe-use", `Long turn-repeat weak-gap loops with prior door evidence should spend Use before cutting back left (actual=${doorApproachWeakGapTurnRepeatLeftRedAction.stage})`);
assert(doorApproachWeakGapTurnRepeatLeftRedAction.use === true, "Turn-repeat weak-gap door-contact memory should emit one bounded Use pulse");

const doorApproachLateAmbiguousLeftRedRuntime = runtimeFactory.create(publicProfile);
doorApproachLateAmbiguousLeftRedRuntime.predictions = 3859;
const doorApproachLateAmbiguousLeftRedAction = doorApproachLateAmbiguousLeftRedRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  blueFloorScore: 0,
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  actionRepeatFrames: 2,
  turnRepeatFrames: 2,
  doorOpenedCount: 0,
  courtyardScore: 0.20,
  courtyardTurn: "none",
  bridgeLaneTurn: "none",
  spawnSecretDoorScore: 0.00,
  spawnCorridorGapScore: 0.19,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.31,
  spawnLandmarkRouteTurn: "right",
  bridgeDoorScore: 0.00,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  routeTextureWallOcclusion: false,
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
assert(doorApproachLateAmbiguousLeftRedAction.stage === "door-approach-memory-contact-probe-use", `Late ambiguous door-contact evidence should spend Use before cutting the weak right-gap loop (actual=${doorApproachLateAmbiguousLeftRedAction.stage})`);
assert(doorApproachLateAmbiguousLeftRedAction.use === true, "Late ambiguous door-contact evidence should emit one bounded Use pulse");

const doorApproachLateAmbiguousLeftRedUseRuntime = runtimeFactory.create(publicProfile);
doorApproachLateAmbiguousLeftRedUseRuntime.predictions = 3945;
const doorApproachLateAmbiguousLeftRedUseState = {
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  blueFloorScore: 0,
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  actionRepeatFrames: 4,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 3945,
  courtyardScore: 0.21,
  courtyardTurn: "none",
  bridgeLaneTurn: "none",
  spawnSecretDoorScore: 0.04,
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.33,
  spawnLandmarkRouteTurn: "right",
  bridgeDoorScore: 0.00,
  firstDoorVision9x9Score: 0.00,
  firstDoorUse3x3Score: 0,
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
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
};
const doorApproachLateAmbiguousLeftRedUseAction = doorApproachLateAmbiguousLeftRedUseRuntime.predict(doorApproachLateAmbiguousLeftRedUseState);
assert(doorApproachLateAmbiguousLeftRedUseAction.stage === "door-approach-memory-contact-probe-use", `Repeated late ambiguous door-contact evidence should spend Use instead of grinding the wall (actual=${doorApproachLateAmbiguousLeftRedUseAction.stage})`);
assert(doorApproachLateAmbiguousLeftRedUseAction.use === true, "Repeated late ambiguous left-red evidence should emit one bounded Use pulse");

const doorApproachLateAmbiguousWallBackoffRuntime = runtimeFactory.create(publicProfile);
doorApproachLateAmbiguousWallBackoffRuntime.predictions = 5766;
const doorApproachLateAmbiguousWallBackoffAction = doorApproachLateAmbiguousWallBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 3,
  moveRepeatFrames: 1,
  turnRepeatFrames: 3,
  doorOpenedCount: 0,
  predictions: 5766,
  blueFloorScore: 0,
  courtyardScore: 0.29,
  courtyardTurn: "none",
  bridgeLaneTurn: "none",
  spawnSecretDoorScore: 0.06,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  bridgeDoorScore: 0.01,
  firstDoorVision9x9Score: 0.02,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeDeadEndRisk: false,
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.42,
      corridor: 0.52,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.01,
      "computer-room": 0
    }
  }
});
assert(doorApproachLateAmbiguousWallBackoffAction.stage === "door-approach-late-ambiguous-wall-backoff", `Late ambiguous red evidence with no forward progress should back off before it grinds the corner (actual=${doorApproachLateAmbiguousWallBackoffAction.stage})`);
assert(doorApproachLateAmbiguousWallBackoffAction.move === "back", "Late ambiguous wall backoff should reverse before reacquiring the door panel");

const doorApproachLateAmbiguousWallBackoffCappedAction = doorApproachLateAmbiguousWallBackoffRuntime.predict(Object.assign({}, doorApproachLateAmbiguousWallBackoffAction.input || {}, {
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 13,
  moveRepeatFrames: 13,
  turnRepeatFrames: 1,
  doorOpenedCount: 0,
  predictions: 5900,
  blueFloorScore: 0,
  courtyardScore: 0.29,
  courtyardTurn: "none",
  bridgeLaneTurn: "none",
  spawnSecretDoorScore: 0.06,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  bridgeDoorScore: 0.01,
  firstDoorVision9x9Score: 0.02,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeDeadEndRisk: false,
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.42,
      corridor: 0.52,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.01,
      "computer-room": 0
    }
  }
}));
assert(doorApproachLateAmbiguousWallBackoffCappedAction.stage !== "door-approach-late-ambiguous-wall-backoff", "Late ambiguous wall backoff should be capped so it cannot hold reverse indefinitely");

const doorApproachLateAmbiguousBridgeLaneUseRuntime = runtimeFactory.create(publicProfile);
doorApproachLateAmbiguousBridgeLaneUseRuntime.predictions = 4949;
const doorApproachLateAmbiguousBridgeLaneUseAction = doorApproachLateAmbiguousBridgeLaneUseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 5,
  moveRepeatFrames: 5,
  turnRepeatFrames: 6,
  doorOpenedCount: 0,
  predictions: 4949,
  blueFloorScore: 0,
  courtyardScore: 0.29,
  courtyardTurn: "none",
  bridgeLaneTurn: "left",
  spawnSecretDoorScore: 0.06,
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  bridgeDoorScore: 0.00,
  firstDoorVision9x9Score: 0.07,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeDeadEndRisk: false,
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.42,
      corridor: 0.52,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.02,
      "computer-room": 0
    }
  }
});
assert(doorApproachLateAmbiguousBridgeLaneUseAction.stage === "door-approach-left-red-edge-probe-use", `Late ambiguous wall view with left bridge-lane evidence should probe Use instead of backing away (actual=${doorApproachLateAmbiguousBridgeLaneUseAction.stage})`);
assert(doorApproachLateAmbiguousBridgeLaneUseAction.use === true, "Late ambiguous bridge-lane red evidence should emit a bounded Use pulse");

const doorApproachWeakBridgePanelUseRuntime = runtimeFactory.create(publicProfile);
doorApproachWeakBridgePanelUseRuntime.predictions = 1185;
const doorApproachWeakBridgePanelUseAction = doorApproachWeakBridgePanelUseRuntime.predict({
  health: 100,
  depthSig: 0.72,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.40,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 2,
  moveRepeatFrames: 2,
  turnRepeatFrames: 2,
  doorOpenedCount: 0,
  predictions: 1185,
  blueFloorScore: 0,
  courtyardScore: 0.10,
  courtyardTurn: "none",
  bridgeLaneTurn: "none",
  spawnCorridorGapScore: 0.26,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.11,
  firstDoorVision9x9Score: 0.10,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.54,
      corridor: 0.46,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.11,
      "computer-room": 0
    }
  }
});
assert(doorApproachWeakBridgePanelUseAction.stage === "door-approach-weak-bridge-panel-probe-use", `Weak bridge-door panel at close range should spend a bounded Use probe before another realign loop (actual=${doorApproachWeakBridgePanelUseAction.stage})`);
assert(doorApproachWeakBridgePanelUseAction.use === true, "Weak bridge-door panel probe should emit Use");
assert(doorApproachWeakBridgePanelUseAction.move === "none", "Weak bridge-door panel probe should stop movement before pressing Use");

const doorApproachObservedWeakDoorUseRuntime = runtimeFactory.create(publicProfile);
doorApproachObservedWeakDoorUseRuntime.predictions = 1185;
const doorApproachObservedWeakDoorState = {
  health: 100,
  depthSig: 0.72,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.40,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 1,
  turnRepeatFrames: 1,
  doorOpenedCount: 0,
  predictions: 1185,
  blueFloorScore: 0,
  courtyardScore: 0.13,
  courtyardTurn: "none",
  bridgeLaneTurn: "none",
  spawnCorridorGapScore: 0.19,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.16,
  firstDoorVision9x9Score: 0.10,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.54,
      corridor: 0.46,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.16,
      "computer-room": 0
    }
  }
};
const doorApproachObservedWeakDoorUseAction = doorApproachObservedWeakDoorUseRuntime.predict(doorApproachObservedWeakDoorState);
assert(doorApproachObservedWeakDoorUseAction.stage === "door-approach-weak-bridge-panel-probe-use", `Observed weak door panel should spend Use even when the right gap is only 0.19 (actual=${doorApproachObservedWeakDoorUseAction.stage})`);
assert(doorApproachObservedWeakDoorUseAction.use === true, "Observed weak door panel should emit Use");

const doorApproachCpuRightCornerBackoffRuntime = runtimeFactory.create(publicProfile);
doorApproachCpuRightCornerBackoffRuntime.predictions = 1011;
const doorApproachCpuRightCornerBackoffState = {
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.00,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 5,
  moveRepeatFrames: 0,
  turnRepeatFrames: 82,
  routeBackoffUsed: 0,
  routeLoopBudgetExceeded: true,
  routeAbortHint: "turn-stall",
  doorOpenedCount: 0,
  predictions: 1011,
  blueFloorScore: 0,
  courtyardScore: 0.23,
  courtyardTurn: "left",
  bridgeLaneTurn: "none",
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.33,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  bridgeDoorScore: 0.06,
  firstDoorVision9x9Score: 0.36,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.68,
      corridor: 0.44,
      enemy: 0,
      "safe-zone": 0.85,
      bridge: 0.5,
      "computer-room": 0.69
    }
  }
};
const doorApproachCpuRightCornerBackoffAction = doorApproachCpuRightCornerBackoffRuntime.predict(doorApproachCpuRightCornerBackoffState);
assert(doorApproachCpuRightCornerBackoffAction.stage === "door-approach-right-corner-backoff", `CPU weak-door right corner should back off before continuing the turn loop (actual=${doorApproachCpuRightCornerBackoffAction.stage})`);
assert(doorApproachCpuRightCornerBackoffAction.move === "back", "CPU weak-door right corner should reverse before yawing");
assert(doorApproachCpuRightCornerBackoffAction.turn === "right", "CPU weak-door right corner should keep the right door-ingress yaw");

const doorApproachCpuWeakDoorMemoryUseRuntime = runtimeFactory.create(publicProfile);
doorApproachCpuWeakDoorMemoryUseRuntime.predictions = 1011;
const doorApproachCpuWeakDoorMemoryUseAction = doorApproachCpuWeakDoorMemoryUseRuntime.predict(Object.assign({}, doorApproachCpuRightCornerBackoffState, {
  actionRepeatFrames: 6
}));
assert(doorApproachCpuWeakDoorMemoryUseAction.stage === "door-approach-cpu-weak-door-memory-use", `After CPU right-corner backoff, weak door memory should spend a stopped Use pulse (actual=${doorApproachCpuWeakDoorMemoryUseAction.stage})`);
assert(doorApproachCpuWeakDoorMemoryUseAction.move === "none", "CPU weak-door memory Use should stop movement before pressing Use");
assert(doorApproachCpuWeakDoorMemoryUseAction.use === true, "CPU weak-door memory should emit Use after the backoff window");

const doorApproachCloseAmbiguousPanelUseRuntime = runtimeFactory.create(publicProfile);
doorApproachCloseAmbiguousPanelUseRuntime.predictions = 935;
const doorApproachCloseAmbiguousPanelUseAction = doorApproachCloseAmbiguousPanelUseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.10,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  routeLoopBudgetExceeded: false,
  routeDeadEndRisk: false,
  routeDeadEndTrimRequired: false,
  doorOpenedCount: 0,
  predictions: 935,
  blueFloorScore: 0,
  courtyardScore: 0.18,
  courtyardTurn: "none",
  bridgeLaneTurn: "none",
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.32,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  bridgeDoorScore: 0,
  firstDoorVision9x9Score: 0.34,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.68,
      corridor: 0.44,
      enemy: 0,
      "safe-zone": 0.85,
      bridge: 0.26,
      "computer-room": 0.39
    }
  }
});
assert(doorApproachCloseAmbiguousPanelUseAction.stage === "door-approach-close-ambiguous-panel-use", `Close ambiguous CPU door face should spend stopped Use instead of continuing forward/right (actual=${doorApproachCloseAmbiguousPanelUseAction.stage})`);
assert(doorApproachCloseAmbiguousPanelUseAction.move === "none", "Close ambiguous CPU door Use should stop movement before pressing Use");
assert(doorApproachCloseAmbiguousPanelUseAction.use === true, "Close ambiguous CPU door face should emit one bounded Use pulse");

const doorApproachRedPanelDeadEndUseRuntime = runtimeFactory.create(publicProfile);
doorApproachRedPanelDeadEndUseRuntime.predictions = 1033;
const doorApproachRedPanelDeadEndUseAction = doorApproachRedPanelDeadEndUseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.10,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 2,
  moveRepeatFrames: 2,
  turnRepeatFrames: 24,
  routeLoopBudgetExceeded: false,
  routeDeadEndRisk: true,
  routeDeadEndTrimRequired: true,
  routeTopologyBarrelZoneEvidence: 1,
  routeTopologyCenterCorridorAlignment: -0.32,
  doorOpenedCount: 0,
  predictions: 1033,
  blueFloorScore: 0,
  courtyardScore: 0.25,
  courtyardTurn: "none",
  bridgeLaneTurn: "left",
  spawnCorridorGapScore: 0.28,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.40,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  bridgeDoorScore: 0.10,
  firstDoorVision9x9Score: 0.52,
  firstDoorVision9x9RedScore: 0.28,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.61,
      corridor: 0.45,
      enemy: 0,
      "safe-zone": 0.20,
      bridge: 0.10,
      "computer-room": 0.06
    }
  }
});
assert(doorApproachRedPanelDeadEndUseAction.stage === "door-approach-red-panel-dead-end-use", `Near red-panel dead-end should spend stopped Use before barrel trim keeps circling (actual=${doorApproachRedPanelDeadEndUseAction.stage})`);
assert(doorApproachRedPanelDeadEndUseAction.move === "none", "Near red-panel dead-end Use should stop movement before pressing Use");
assert(doorApproachRedPanelDeadEndUseAction.use === true, "Near red-panel dead-end should emit a Use pulse");

const doorApproachObservedWeakDoorCooldownRuntime = runtimeFactory.create(publicProfile);
doorApproachObservedWeakDoorCooldownRuntime.predictions = 1186;
const doorApproachObservedWeakDoorCooldownAction = doorApproachObservedWeakDoorCooldownRuntime.predict(Object.assign({}, doorApproachObservedWeakDoorState, {
  usePulseCooldown: 30
}));
assert(doorApproachObservedWeakDoorCooldownAction.stage !== "door-approach-weak-bridge-panel-probe-use", "Weak door panel should not select another Use stage while the Use pulse cooldown is active");
assert(doorApproachObservedWeakDoorCooldownAction.use === false, "Weak door panel should keep Use released while the pulse cooldown is active");

const doorApproachObservedWeakDoorPulseRuntime = runtimeFactory.create(publicProfile);
doorApproachObservedWeakDoorPulseRuntime.predictions = 1185;
const doorApproachObservedWeakDoorFirstPulse = doorApproachObservedWeakDoorPulseRuntime.predict(doorApproachObservedWeakDoorState);
const doorApproachObservedWeakDoorSecondPulse = doorApproachObservedWeakDoorPulseRuntime.predict(doorApproachObservedWeakDoorState);
assert(doorApproachObservedWeakDoorFirstPulse.use === true, "First weak door pulse should press Use");
assert(doorApproachObservedWeakDoorSecondPulse.stage !== "door-approach-weak-bridge-panel-probe-use", "Second weak door prediction should not re-decide another Use stage");
assert(doorApproachObservedWeakDoorSecondPulse.use === true, "Second weak door prediction should keep the bounded electrical Use pulse down briefly");

const doorApproachObservedUpperWeakDoorRuntime = runtimeFactory.create(publicProfile);
doorApproachObservedUpperWeakDoorRuntime.predictions = 1567;
const doorApproachObservedUpperWeakDoorAction = doorApproachObservedUpperWeakDoorRuntime.predict({
  health: 100,
  depthSig: 0.72,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.42,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 6,
  moveRepeatFrames: 6,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 1567,
  blueFloorScore: 0,
  courtyardScore: 0.06,
  courtyardTurn: "none",
  bridgeLaneTurn: "right",
  spawnCorridorGapScore: 0.30,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.42,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.19,
  bridgeDoorScore: 0.26,
  firstDoorVision9x9Score: 0.08,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  routeDeadEndTrimRequired: true,
  semanticMemory: {
    symbols: {
      door: 0.54,
      corridor: 0.46,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.26,
      "computer-room": 0
    }
  }
});
assert(doorApproachObservedUpperWeakDoorAction.stage === "door-approach-upper-weak-bridge-panel-probe-use", `Upper weak bridge-door evidence should spend Use before dead-end trim keeps circling (actual=${doorApproachObservedUpperWeakDoorAction.stage})`);
assert(doorApproachObservedUpperWeakDoorAction.use === true, "Upper weak bridge-door evidence should emit one Use pulse");

const doorApproachLeftBridgeLaneRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftBridgeLaneRuntime.predictions = 1840;
const doorApproachLeftBridgeLaneAction = doorApproachLeftBridgeLaneRuntime.predict({
  health: 100,
  depthSig: 0.72,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 5,
  moveRepeatFrames: 40,
  turnRepeatFrames: 5,
  doorOpenedCount: 0,
  predictions: 1840,
  blueFloorScore: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  bridgeLaneTurn: "left",
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0,
  firstDoorVision9x9Score: 0.18,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.42,
      corridor: 0.52,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachLeftBridgeLaneAction.stage === "door-approach-left-bridge-lane-realign", `Left bridge lane should recenter the door face before the weak right-gap ingress loop continues (actual=${doorApproachLeftBridgeLaneAction.stage})`);
assert(doorApproachLeftBridgeLaneAction.move === "none", "Left bridge lane realign should stop forward drift");
assert(doorApproachLeftBridgeLaneAction.turn === "right", "Left bridge lane realign should yaw from the left corner toward the door face");

const doorApproachVisibleRedPanelUseRuntime = runtimeFactory.create(publicProfile);
doorApproachVisibleRedPanelUseRuntime.predictions = 2340;
const doorApproachVisibleRedPanelUseAction = doorApproachVisibleRedPanelUseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 2340,
  blueFloorScore: 0,
  courtyardScore: 0.21,
  courtyardTurn: "none",
  bridgeLaneTurn: "left",
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.34,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.11,
  bridgeDoorScore: 0,
  firstDoorVision9x9Score: 0.56,
  firstDoorVision9x9RedScore: 0.27,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.56,
      corridor: 0.39,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachVisibleRedPanelUseAction.stage === "door-approach-visible-red-panel-probe-use", `Visible 9x9 red door panel should stop and Use instead of another left-bridge realign (actual=${doorApproachVisibleRedPanelUseAction.stage})`);
assert(doorApproachVisibleRedPanelUseAction.use === true, "Visible 9x9 red door panel should emit one bounded Use pulse");
assert(doorApproachVisibleRedPanelUseAction.move === "none" && doorApproachVisibleRedPanelUseAction.turn === "none", "Visible 9x9 red door panel Use should be fired from a stopped pose");

const doorApproachLeftBridgeLanePostUseReleaseRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftBridgeLanePostUseReleaseRuntime.predictions = 6450;
doorApproachLeftBridgeLanePostUseReleaseRuntime.lastUsePulsePrediction = 3517;
const doorApproachLeftBridgeLanePostUseReleaseAction = doorApproachLeftBridgeLanePostUseReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 0,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 6450,
  lastUsePulsePrediction: 3517,
  blueFloorScore: 0,
  courtyardScore: 0.22,
  courtyardTurn: "none",
  bridgeLaneTurn: "left",
  spawnCorridorGapScore: 0.24,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  bridgeDoorScore: 0.01,
  firstDoorVision9x9Score: 0.10,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.44,
      corridor: 0.50,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.01,
      "computer-room": 0
    }
  }
});
assert(doorApproachLeftBridgeLanePostUseReleaseAction.stage === "door-approach-left-bridge-lane-post-use-release", `Late left bridge lane should release forward/right instead of parking in realign (actual=${doorApproachLeftBridgeLanePostUseReleaseAction.stage})`);
assert(doorApproachLeftBridgeLanePostUseReleaseAction.move === "forward", "Late left bridge lane release should restore forward pressure");
assert(doorApproachLeftBridgeLanePostUseReleaseAction.turn === "right", "Late left bridge lane release should keep turning toward the door face");

const doorApproachLeftBridgeLaneReleaseRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftBridgeLaneReleaseRuntime.predictions = 3893;
const doorApproachLeftBridgeLaneReleaseAction = doorApproachLeftBridgeLaneReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 2,
  moveRepeatFrames: 0,
  turnRepeatFrames: 11,
  doorOpenedCount: 0,
  blueFloorScore: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  bridgeLaneTurn: "left",
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0,
  firstDoorVision9x9Score: 0.18,
  firstDoorUse3x3Score: 0,
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.42,
      corridor: 0.52,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachLeftBridgeLaneReleaseAction.stage === "door-approach-left-bridge-lane-release", `Long left bridge realign should release into forward/right instead of parking (actual=${doorApproachLeftBridgeLaneReleaseAction.stage})`);
assert(doorApproachLeftBridgeLaneReleaseAction.move === "forward", "Left bridge lane release should resume forward pressure");
assert(doorApproachLeftBridgeLaneReleaseAction.turn === "right", "Left bridge lane release should keep yawing toward the door face");

const doorApproachLeftBridgeLaneUseRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftBridgeLaneUseRuntime.predictions = 1846;
const doorApproachLeftBridgeLaneUseState = {
  health: 100,
  depthSig: 0.72,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 7,
  moveRepeatFrames: 0,
  turnRepeatFrames: 7,
  doorOpenedCount: 0,
  predictions: 1846,
  blueFloorScore: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  bridgeLaneTurn: "left",
  spawnCorridorGapScore: 0.24,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.24,
  bridgeDoorScore: 0.02,
  firstDoorVision9x9Score: 0.18,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.42,
      corridor: 0.52,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.02,
      "computer-room": 0
    }
  }
};
const doorApproachLeftBridgeLaneUseAction = doorApproachLeftBridgeLaneUseRuntime.predict(doorApproachLeftBridgeLaneUseState);
assert(doorApproachLeftBridgeLaneUseAction.stage === "door-approach-left-bridge-lane-probe-use", `Repeated left bridge realign should spend one bounded Use pulse before another yaw loop (actual=${doorApproachLeftBridgeLaneUseAction.stage})`);
assert(doorApproachLeftBridgeLaneUseAction.use === true, "Repeated left bridge realign should emit one Use pulse");

const doorApproachLeftBridgeLaneUseCooldownRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftBridgeLaneUseCooldownRuntime.predictions = 1847;
const doorApproachLeftBridgeLaneUseCooldownAction = doorApproachLeftBridgeLaneUseCooldownRuntime.predict(Object.assign({}, doorApproachLeftBridgeLaneUseState, {
  usePulseCooldown: 45
}));
assert(doorApproachLeftBridgeLaneUseCooldownAction.stage !== "door-approach-left-bridge-lane-probe-use", "Left bridge lane should not spend another Use pulse while cooldown is active");
assert(doorApproachLeftBridgeLaneUseCooldownAction.use === false, "Left bridge lane cooldown should keep Use released");

const doorApproachEarlyLeftRedEdgeMemoryUseRuntime = runtimeFactory.create(publicProfile);
doorApproachEarlyLeftRedEdgeMemoryUseRuntime.predictions = 2484;
const doorApproachEarlyLeftRedEdgeMemoryUseAction = doorApproachEarlyLeftRedEdgeMemoryUseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  blueFloorScore: 0,
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 1,
  turnRepeatFrames: 1,
  doorOpenedCount: 0,
  predictions: 2484,
  courtyardScore: 0.25,
  courtyardTurn: "none",
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0,
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  spawnSecretDoorTurn: "none",
  firstDoorVision9x9Score: 0.08,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
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
assert(doorApproachEarlyLeftRedEdgeMemoryUseAction.stage === "door-approach-left-red-edge-memory-probe-use", `Early red-edge memory should spend Use before repeated realign cycles drift away (actual=${doorApproachEarlyLeftRedEdgeMemoryUseAction.stage})`);
assert(doorApproachEarlyLeftRedEdgeMemoryUseAction.use === true, "Early red-edge memory should emit one bounded Use pulse");

const doorApproachLeftRedSecretPanelRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedSecretPanelRuntime.predictions = 8394;
const doorApproachLeftRedSecretPanelAction = doorApproachLeftRedSecretPanelRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: -0.54,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 2,
  moveRepeatFrames: 4,
  turnRepeatFrames: 2,
  doorOpenedCount: 0,
  predictions: 8394,
  blueFloorScore: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  bridgeLaneTurn: "left",
  spawnCorridorGapScore: 0.19,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.29,
  spawnSecretDoorTurn: "left",
  bridgeDoorScore: 0.01,
  firstDoorVision9x9Score: 0.02,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.42,
      corridor: 0.52,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.01,
      "computer-room": 0
    }
  }
});
assert(doorApproachLeftRedSecretPanelAction.stage === "door-approach-left-red-secret-panel-realign", `Left red panel seen through the secret-door color channel should yaw left instead of bridge-lane right (actual=${doorApproachLeftRedSecretPanelAction.stage})`);
assert(doorApproachLeftRedSecretPanelAction.move === "none", "Left red secret-panel realign should pause movement while aiming");
assert(doorApproachLeftRedSecretPanelAction.turn === "left", "Left red secret-panel realign should turn toward the red panel");

const doorApproachEarlyLeftRedSecretPanelRuntime = runtimeFactory.create(publicProfile);
doorApproachEarlyLeftRedSecretPanelRuntime.predictions = 4459;
const doorApproachEarlyLeftRedSecretPanelAction = doorApproachEarlyLeftRedSecretPanelRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  blueFloorScore: 0,
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  actionRepeatFrames: 3,
  turnRepeatFrames: 3,
  doorOpenedCount: 0,
  predictions: 4459,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.41,
  spawnLandmarkRouteTurn: "left",
  spawnSecretDoorScore: 0.24,
  spawnSecretDoorTurn: "left",
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0,
  courtyardScore: 0.29,
  courtyardTurn: "none",
  firstDoorVision9x9Score: 0.08,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.04,
      "computer-room": 0
    }
  }
});
assert(doorApproachEarlyLeftRedSecretPanelAction.stage === "door-approach-left-red-secret-panel-realign", `Early left red panel evidence should preempt bridge-lane right realign (actual=${doorApproachEarlyLeftRedSecretPanelAction.stage})`);
assert(doorApproachEarlyLeftRedSecretPanelAction.turn === "left", "Early left red secret-panel realign should yaw left immediately");

const doorApproachLateLeftRedSecretPanelUseRuntime = runtimeFactory.create(publicProfile);
doorApproachLateLeftRedSecretPanelUseRuntime.predictions = 4570;
const doorApproachLateLeftRedSecretPanelUseAction = doorApproachLateLeftRedSecretPanelUseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  blueFloorScore: 0,
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  actionRepeatFrames: 3,
  moveRepeatFrames: 3,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 4570,
  spawnCorridorGapScore: 0.23,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.37,
  spawnSecretDoorTurn: "right",
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0.26,
  courtyardScore: 0.02,
  courtyardTurn: "none",
  firstDoorVision9x9Score: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.26,
      "computer-room": 0
    }
  }
});
assert(doorApproachLateLeftRedSecretPanelUseAction.stage === "door-approach-left-red-secret-panel-probe-use", `Late secret-channel door contact should spend Use instead of another left realign cycle (actual=${doorApproachLateLeftRedSecretPanelUseAction.stage})`);
assert(doorApproachLateLeftRedSecretPanelUseAction.use === true, "Late secret-channel door contact should emit one bounded Use pulse");

const doorApproachLeftRedEdgeRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedEdgeRuntime.predictions = 3660;
const doorApproachLeftRedEdgeAction = doorApproachLeftRedEdgeRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  blueFloorScore: 0,
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  actionRepeatFrames: 3,
  turnRepeatFrames: 3,
  doorOpenedCount: 0,
  predictions: 3660,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "left",
  spawnSecretDoorScore: 0.04,
  spawnSecretDoorTurn: "none",
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  firstDoorVision9x9Score: 0.08,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.01,
      "computer-room": 0
    }
  }
});
assert(doorApproachLeftRedEdgeAction.stage === "door-approach-left-red-edge-realign", `Left-edge red panel should preempt bridge-lane right realign even when courtyardTurn is none (actual=${doorApproachLeftRedEdgeAction.stage})`);
assert(doorApproachLeftRedEdgeAction.turn === "left", "Left-edge red panel realign should yaw left");

const doorApproachLeftRedEdgeUseRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedEdgeUseRuntime.predictions = 3660;
const doorApproachLeftRedEdgeUseState = {
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  blueFloorScore: 0,
  wallVector: 0.49,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  actionRepeatFrames: 6,
  turnRepeatFrames: 6,
  doorOpenedCount: 0,
  predictions: 3660,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "left",
  spawnSecretDoorScore: 0.04,
  spawnSecretDoorTurn: "none",
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0,
  courtyardScore: 0.30,
  courtyardTurn: "none",
  firstDoorVision9x9Score: 0.08,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.01,
      "computer-room": 0
    }
  }
};
const doorApproachLeftRedEdgeUseAction = doorApproachLeftRedEdgeUseRuntime.predict(doorApproachLeftRedEdgeUseState);
assert(doorApproachLeftRedEdgeUseAction.stage === "door-approach-left-red-edge-probe-use", `Repeated left-edge red panel evidence should spend one bounded Use pulse before the bridge-lane release pulls away (actual=${doorApproachLeftRedEdgeUseAction.stage})`);
assert(doorApproachLeftRedEdgeUseAction.use === true, "Repeated left-edge red panel evidence should emit one Use pulse");

const doorApproachLeftRedEdgeCooldownRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedEdgeCooldownRuntime.predictions = 3661;
const doorApproachLeftRedEdgeCooldownAction = doorApproachLeftRedEdgeCooldownRuntime.predict(Object.assign({}, doorApproachLeftRedEdgeUseState, {
  usePulseCooldown: 45
}));
assert(doorApproachLeftRedEdgeCooldownAction.stage !== "door-approach-left-red-edge-probe-use", "Left-edge red panel should not repeat Use while the pulse cooldown is active");
assert(doorApproachLeftRedEdgeCooldownAction.use === false, "Left-edge red panel cooldown should keep Use released");

const doorApproachLeftRedEdgeFarUseRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedEdgeFarUseRuntime.predictions = 3756;
const doorApproachLeftRedEdgeFarUseState = {
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  blueFloorScore: 0,
  wallVector: 0.56,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  actionRepeatFrames: 1,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 3756,
  spawnCorridorGapScore: 0.23,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.39,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0,
  courtyardScore: 0.33,
  courtyardTurn: "none",
  firstDoorVision9x9Score: 0.08,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
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
};
const doorApproachLeftRedEdgeFarUseAction = doorApproachLeftRedEdgeFarUseRuntime.predict(doorApproachLeftRedEdgeFarUseState);
assert(["door-approach-left-red-edge-far-probe-use", "door-approach-left-red-edge-memory-probe-use"].includes(doorApproachLeftRedEdgeFarUseAction.stage), `Late left-edge evidence should spend Use even when repeats do not accumulate (actual=${doorApproachLeftRedEdgeFarUseAction.stage})`);
assert(doorApproachLeftRedEdgeFarUseAction.use === true, "Late left-edge evidence should emit one bounded Use pulse");

const doorApproachLeftRedEdgeMemoryUseRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftRedEdgeMemoryUseRuntime.predictions = 4411;
const doorApproachLeftRedEdgeMemoryUseAction = doorApproachLeftRedEdgeMemoryUseRuntime.predict(Object.assign({}, doorApproachLeftRedEdgeFarUseState, {
  predictions: 4411,
  courtyardScore: 0.31,
  bridgeDoorScore: 0.01,
  firstDoorVision9x9Score: 0,
  actionRepeatFrames: 1,
  turnRepeatFrames: 0
}));
assert(doorApproachLeftRedEdgeMemoryUseAction.stage === "door-approach-left-red-edge-memory-probe-use", `Persistent left-edge memory should spend Use before falling back to another realign cycle (actual=${doorApproachLeftRedEdgeMemoryUseAction.stage})`);
assert(doorApproachLeftRedEdgeMemoryUseAction.use === true, "Persistent left-edge memory should emit one bounded Use pulse");

const doorApproachRightIngressLoopReverseRuntime = runtimeFactory.create(publicProfile);
doorApproachRightIngressLoopReverseRuntime.predictions = 3505;
const doorApproachRightIngressLoopReverseAction = doorApproachRightIngressLoopReverseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.35,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 15,
  moveRepeatFrames: 15,
  turnRepeatFrames: 15,
  doorOpenedCount: 0,
  predictions: 3505,
  blueFloorScore: 0,
  courtyardScore: 0.08,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.05,
  firstDoorVision9x9Score: 0.08,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.38,
      corridor: 0.62,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.05,
      "computer-room": 0
    }
  }
});
assert(["door-approach-right-ingress-loop-reverse", "door-approach-right-weak-gap-state-reacquire"].includes(doorApproachRightIngressLoopReverseAction.stage), `Repeated weak right-ingress pursuit should pause and reverse toward the door face (actual=${doorApproachRightIngressLoopReverseAction.stage})`);
assert(doorApproachRightIngressLoopReverseAction.move === "none", "Right ingress loop reverse should stop forward wall grinding");
assert(doorApproachRightIngressLoopReverseAction.turn === "left", "Right ingress loop reverse should yaw back toward the door-side panel");

const doorApproachObservedRightGapRuntime = runtimeFactory.create(publicProfile);
doorApproachObservedRightGapRuntime.predictions = 1665;
const doorApproachObservedRightGapAction = doorApproachObservedRightGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 2,
  moveRepeatFrames: 2,
  turnRepeatFrames: 2,
  doorOpenedCount: 0,
  predictions: 1665,
  blueFloorScore: 0,
  courtyardScore: 0.11,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.26,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.03,
  firstDoorVision9x9Score: 0.08,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeDeadEndRisk: false,
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.38,
      corridor: 0.62,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.03,
      "computer-room": 0
    }
  }
});
assert(doorApproachObservedRightGapAction.stage === "door-approach-right-ingress-loop-reverse", `Observed weak right gap near FirstDoor should recenter before gap-right ingress release resumes (actual=${doorApproachObservedRightGapAction.stage})`);
assert(doorApproachObservedRightGapAction.move === "none", "Observed weak right gap reverse should pause forward pressure");
assert(doorApproachObservedRightGapAction.turn === "left", "Observed weak right gap reverse should yaw toward the door face");

const doorApproachObservedLongRightGapRuntime = runtimeFactory.create(publicProfile);
doorApproachObservedLongRightGapRuntime.predictions = 2630;
const doorApproachObservedLongRightGapAction = doorApproachObservedLongRightGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.67,
  footObstacleScore: 0.67,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 14,
  moveRepeatFrames: 14,
  turnRepeatFrames: 240,
  doorOpenedCount: 0,
  predictions: 2630,
  blueFloorScore: 0,
  courtyardScore: 0.10,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.37,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.03,
  firstDoorVision9x9Score: 0.08,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeDeadEndRisk: false,
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.38,
      corridor: 0.62,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.03,
      "computer-room": 0
    }
  }
});
assert(doorApproachObservedLongRightGapAction.stage === "door-approach-right-gap-turn-loop-reacquire", `Long right-turn weak gap loop should reacquire left before release keeps rotating (actual=${doorApproachObservedLongRightGapAction.stage})`);
assert(doorApproachObservedLongRightGapAction.move === "none", "Long right-turn weak gap reacquire should stop forward pressure");
assert(doorApproachObservedLongRightGapAction.turn === "left", "Long right-turn weak gap reacquire should yaw back toward the door face");

const doorApproachObservedStateRightGapRuntime = runtimeFactory.create(publicProfile);
doorApproachObservedStateRightGapRuntime.predictions = 2238;
const doorApproachObservedStateRightGapAction = doorApproachObservedStateRightGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 11,
  moveRepeatFrames: 11,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 2238,
  blueFloorScore: 0,
  courtyardScore: 0.20,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.23,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  bridgeDoorScore: 0,
  firstDoorVision9x9Score: 0.08,
  firstDoorVision9x9RedScore: 0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeDeadEndRisk: false,
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.38,
      corridor: 0.62,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(["door-approach-right-weak-gap-state-reacquire", "door-approach-memory-contact-probe-use"].includes(doorApproachObservedStateRightGapAction.stage), `Observed weak right-gap state should exit the release loop even when turnRepeatFrames never accumulates (actual=${doorApproachObservedStateRightGapAction.stage})`);
assert(doorApproachObservedStateRightGapAction.move === "none", "Observed weak right-gap state exit should stop forward pressure");
assert(doorApproachObservedStateRightGapAction.turn === "left" || doorApproachObservedStateRightGapAction.use === true, "Observed weak right-gap state should either yaw back toward the door face or spend a bounded Use pulse");

const doorApproachRightIngressThinGapRuntime = runtimeFactory.create(publicProfile);
doorApproachRightIngressThinGapRuntime.predictions = 3114;
const doorApproachRightIngressThinGapAction = doorApproachRightIngressThinGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.35,
  motionForwardProgress: 0.23,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 4,
  moveRepeatFrames: 4,
  turnRepeatFrames: 4,
  doorOpenedCount: 0,
  predictions: 3114,
  blueFloorScore: 0,
  courtyardScore: 0.23,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.19,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.09,
  bridgeDoorScore: 0.03,
  firstDoorVision9x9Score: 0.08,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.38,
      corridor: 0.62,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.03,
      "computer-room": 0
    }
  }
});
assert(doorApproachRightIngressThinGapAction.stage === "door-approach-right-ingress-loop-reverse", `Thin right-ingress gap should reverse before falling into weak-gap pivot (actual=${doorApproachRightIngressThinGapAction.stage})`);
assert(doorApproachRightIngressThinGapAction.move === "none", "Thin right-ingress reverse should stop forward pressure");
assert(doorApproachRightIngressThinGapAction.turn === "left", "Thin right-ingress reverse should yaw back toward the door-side panel");

const doorApproachWeakGapWallBackoffRuntime = runtimeFactory.create(publicProfile);
doorApproachWeakGapWallBackoffRuntime.predictions = 3291;
const doorApproachWeakGapWallBackoffAction = doorApproachWeakGapWallBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 4,
  moveRepeatFrames: 75,
  turnRepeatFrames: 4,
  doorOpenedCount: 0,
  predictions: 3291,
  blueFloorScore: 0,
  courtyardScore: 0.21,
  courtyardTurn: "right",
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.09,
  bridgeDoorScore: 0,
  firstDoorVision9x9Score: 0.10,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.40,
      corridor: 0.54,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(["door-approach-weak-gap-wall-backoff", "door-approach-ingress-move-backoff"].includes(doorApproachWeakGapWallBackoffAction.stage), `Long weak-gap wall pressure should reverse before forward/right keeps scraping the wall (actual=${doorApproachWeakGapWallBackoffAction.stage})`);
assert(doorApproachWeakGapWallBackoffAction.move === "back", "Long weak-gap wall pressure should back off");
assert(doorApproachWeakGapWallBackoffAction.turn === "right", "Long weak-gap wall pressure should yaw back toward the visible gap line");

const doorApproachZeroMotionWeakGapRuntime = runtimeFactory.create(publicProfile);
doorApproachZeroMotionWeakGapRuntime.predictions = 1323;
const doorApproachZeroMotionWeakGapAction = doorApproachZeroMotionWeakGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.00,
  motionObstacleScore: 0.67,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 1,
  turnRepeatFrames: 1,
  doorOpenedCount: 0,
  predictions: 1323,
  blueFloorScore: 0,
  courtyardScore: 0.18,
  courtyardTurn: "right",
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.40,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.00,
  firstDoorVision9x9Score: 0.33,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.40,
      corridor: 0.54,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachZeroMotionWeakGapAction.stage === "door-approach-zero-motion-weak-gap-backoff", `Zero-motion weak-gap wall pressure should back off before weak-gap pivot pushes into the wall (actual=${doorApproachZeroMotionWeakGapAction.stage})`);
assert(doorApproachZeroMotionWeakGapAction.move === "back", "Zero-motion weak-gap pressure should reverse briefly");
assert(doorApproachZeroMotionWeakGapAction.turn === "right", "Zero-motion weak-gap backoff should preserve the visible gap yaw");

const doorApproachFlatWallVisionBackoffRuntime = runtimeFactory.create(publicProfile);
doorApproachFlatWallVisionBackoffRuntime.predictions = 3047;
const doorApproachFlatWallVisionBackoffAction = doorApproachFlatWallVisionBackoffRuntime.predict({
  health: 55,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 3,
  moveRepeatFrames: 3,
  turnRepeatFrames: 3,
  doorOpenedCount: 0,
  predictions: 3047,
  blueFloorScore: 0,
  courtyardScore: 0.21,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.32,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.07,
  bridgeDoorScore: 0,
  firstDoorVision9x9Score: 0.74,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.74,
      corridor: 0.44,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachFlatWallVisionBackoffAction.stage === "door-approach-flat-wall-vision-backoff", `Flat close wall without bridge-door evidence should back off even when first-door vision is overconfident (actual=${doorApproachFlatWallVisionBackoffAction.stage})`);
assert(doorApproachFlatWallVisionBackoffAction.move === "back", "Flat-wall vision backoff should reverse away from the wall");

const doorApproachFeaturelessWallBackoffRuntime = runtimeFactory.create(publicProfile);
doorApproachFeaturelessWallBackoffRuntime.predictions = 6535;
const doorApproachFeaturelessWallBackoffAction = doorApproachFeaturelessWallBackoffRuntime.predict({
  health: 75,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.51,
  motionForwardProgress: 0.40,
  motionObstacleScore: 0.56,
  footObstacleScore: 0.56,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 8,
  moveRepeatFrames: 8,
  turnRepeatFrames: 3,
  doorOpenedCount: 0,
  predictions: 6535,
  blueFloorScore: 0,
  courtyardScore: 0.16,
  courtyardTurn: "right",
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 210,
  spawnLandmarkRouteEvidence: 0.42,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.03,
  firstDoorVision9x9Score: 0.03,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routePlannerAdvanceReady: true,
  routeConfidence: 0.36,
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.03,
      corridor: 0.48,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(doorApproachFeaturelessWallBackoffAction.stage === "door-approach-featureless-wall-backoff", `Feature-poor close wall should back off before structural advance keeps pressing into it (actual=${doorApproachFeaturelessWallBackoffAction.stage})`);
assert(doorApproachFeaturelessWallBackoffAction.move === "back", "Featureless-wall backoff should reverse before the next reacquire turn");

const doorApproachIngressMoveBackoffRuntime = runtimeFactory.create(publicProfile);
doorApproachIngressMoveBackoffRuntime.predictions = 3650;
const doorApproachIngressMoveBackoffAction = doorApproachIngressMoveBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 21,
  turnRepeatFrames: 3,
  doorOpenedCount: 0,
  predictions: 3650,
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachIngressMoveBackoffAction.stage === "door-approach-ingress-move-backoff", `Repeated forward movement into a weak right ingress should back off even when action repeat resets (actual=${doorApproachIngressMoveBackoffAction.stage})`);
assert(doorApproachIngressMoveBackoffAction.move === "back", "Move-repeat ingress stall should reverse briefly");
assert(doorApproachIngressMoveBackoffAction.turn === "right", "Move-repeat ingress stall should keep yawing toward the visible corridor gap");

const doorApproachIngressActionLoopBackoffRuntime = runtimeFactory.create(publicProfile);
doorApproachIngressActionLoopBackoffRuntime.predictions = 973;
const doorApproachIngressActionLoopBackoffAction = doorApproachIngressActionLoopBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 48,
  moveRepeatFrames: 90,
  turnRepeatFrames: 48,
  doorOpenedCount: 0,
  predictions: 973,
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.33,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.09,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachIngressActionLoopBackoffAction.stage === "route-ingress-action-loop-backoff", `Repeated forward/right weak-ingress loop should back off before route escape open advance keeps circling (actual=${doorApproachIngressActionLoopBackoffAction.stage})`);
assert(doorApproachIngressActionLoopBackoffAction.move === "back", "Repeated weak-ingress loop should reverse briefly");
assert(doorApproachIngressActionLoopBackoffAction.turn === "right", "Repeated weak-ingress loop should keep yawing toward the visible gap");

const doorApproachIngressBudgetBackoffRuntime = runtimeFactory.create(publicProfile);
doorApproachIngressBudgetBackoffRuntime.predictions = 760;
const doorApproachIngressBudgetBackoffAction = doorApproachIngressBudgetBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.42,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.22,
  footObstacleScore: 0.22,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 120,
  moveRepeatFrames: 120,
  turnRepeatFrames: 120,
  doorOpenedCount: 0,
  predictions: 760,
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.09,
  bridgeDoorScore: 0.04,
  firstDoorVision9x9Score: 0.21,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachIngressBudgetBackoffAction.stage === "route-ingress-loop-budget-backoff", `Early repeated weak-ingress loop should back off before ingress trim keeps circling (actual=${doorApproachIngressBudgetBackoffAction.stage})`);
assert(doorApproachIngressBudgetBackoffAction.move === "back", "Ingress-loop budget backoff should reverse briefly");
assert(doorApproachIngressBudgetBackoffAction.turn === "right", "Ingress-loop budget backoff should keep yawing toward the visible gap");

const doorApproachFootWallAdvanceRuntime = runtimeFactory.create(publicProfile);
doorApproachFootWallAdvanceRuntime.predictions = 2721;
const doorApproachFootWallAdvanceAction = doorApproachFootWallAdvanceRuntime.predict({
  health: 100,
  depthSig: 0.0,
  contextDict: "wall",
  previousRouteMode: "door-approach",
  wallVector: 0.36,
  motionForwardProgress: 0.18,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.0,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  predictions: 2721,
  spawnCorridorGapScore: 0.40,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.52,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.24,
  bridgeDoorScore: 0.32,
  firstDoorVision9x9Score: 0.05,
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
assert(doorApproachFootWallAdvanceAction.stage === "door-approach-foot-wall-probe-use", `Door-approach foot wall pressure should probe Use when first-door route evidence is strong (actual=${doorApproachFootWallAdvanceAction.stage})`);
assert(doorApproachFootWallAdvanceAction.use === true, "Door-approach foot wall pressure should emit a bounded Use probe");
assert(doorApproachFootWallAdvanceAction.move === "none", "Door-approach foot wall pressure should stop movement while probing Use");

const doorApproachBridgePanelProbeRuntime = runtimeFactory.create(publicProfile);
doorApproachBridgePanelProbeRuntime.predictions = 1363;
const doorApproachBridgePanelProbeAction = doorApproachBridgePanelProbeRuntime.predict({
  health: 100,
  depthSig: 0.0,
  contextDict: "wall",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.36,
  motionForwardProgress: 0.18,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.0,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  predictions: 1363,
  blueFloorScore: 0.29,
  courtyardScore: 0.14,
  spawnCorridorGapScore: 0.39,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.51,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.24,
  bridgeDoorScore: 0.43,
  firstDoorVision9x9Score: 0.20,
  firstDoorVision9x9RedScore: 0.055,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.52,
      corridor: 0.48,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.43,
      "computer-room": 0
    }
  }
});
assert(doorApproachBridgePanelProbeAction.stage === "door-approach-bridge-panel-probe-use", `Strong bridge-door panel should trigger a bounded Use probe even when blue-floor residue remains (actual=${doorApproachBridgePanelProbeAction.stage})`);
assert(doorApproachBridgePanelProbeAction.use === true, "Strong bridge-door panel should emit Use");
assert(doorApproachBridgePanelProbeAction.move === "none", "Bridge panel Use should stop movement before pressing Use");

const doorApproachWeakBridgeFootWallRuntime = runtimeFactory.create(publicProfile);
doorApproachWeakBridgeFootWallRuntime.predictions = 3045;
const doorApproachWeakBridgeFootWallAction = doorApproachWeakBridgeFootWallRuntime.predict({
  health: 100,
  depthSig: 0.03,
  contextDict: "wall",
  previousRouteMode: "door-approach",
  wallVector: 0.36,
  motionForwardProgress: 0.18,
  motionObstacleScore: 0.50,
  footObstacleScore: 0.50,
  footObstacleFlickerScore: 0.0,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  predictions: 3045,
  blueFloorScore: 0,
  courtyardScore: 0.16,
  spawnCorridorGapScore: 0.42,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.54,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.11,
  bridgeDoorScore: 0.29,
  firstDoorVision9x9Score: 0.16,
  firstDoorVision9x9RedScore: 0.04,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeDeadEndTrimRequired: true,
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.42,
      corridor: 0.52,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.29,
      "computer-room": 0
    }
  }
});
assert(doorApproachWeakBridgeFootWallAction.stage !== "door-approach-foot-wall-probe-use", "Weak bridge/door evidence should not spend a Use probe on the blue-floor wall edge");
assert(doorApproachWeakBridgeFootWallAction.use === false, "Weak bridge/door evidence should keep Use disabled until a stronger door panel is visible");

const doorApproachMidWallBridgeProbeRuntime = runtimeFactory.create(publicProfile);
doorApproachMidWallBridgeProbeRuntime.predictions = 3443;
const doorApproachMidWallBridgeProbeState = {
  health: 100,
  depthSig: 0.27,
  contextDict: "wall",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.51,
  motionForwardProgress: -0.74,
  motionObstacleScore: 0.27,
  footObstacleScore: 0.27,
  footObstacleFlickerScore: 0.0,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  predictions: 3443,
  blueFloorScore: 0.01,
  courtyardScore: 0.13,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.39,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.51,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.53,
  bridgeDoorScore: 0.30,
  firstDoorVision9x9Score: 0.17,
  firstDoorVision9x9RedScore: 0.055,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.60,
      corridor: 0.50,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.30,
      "computer-room": 0
    }
  }
};
const doorApproachMidWallBridgeProbeAction = doorApproachMidWallBridgeProbeRuntime.predict(doorApproachMidWallBridgeProbeState);
assert(doorApproachMidWallBridgeProbeAction.stage === "door-approach-mid-wall-bridge-probe-use", `Mid-wall bridge/door evidence should spend one bounded Use pulse before structural fallback backs away (actual=${doorApproachMidWallBridgeProbeAction.stage})`);
assert(doorApproachMidWallBridgeProbeAction.use === true, "Mid-wall bridge/door evidence should emit one Use pulse");

const doorApproachMidWallBridgeCooldownRuntime = runtimeFactory.create(publicProfile);
doorApproachMidWallBridgeCooldownRuntime.predictions = 3444;
const doorApproachMidWallBridgeCooldownAction = doorApproachMidWallBridgeCooldownRuntime.predict(Object.assign({}, doorApproachMidWallBridgeProbeState, {
  usePulseCooldown: 45
}));
assert(doorApproachMidWallBridgeCooldownAction.stage !== "door-approach-mid-wall-bridge-probe-use", "Mid-wall bridge/door evidence should not repeat Use while cooldown is active");
assert(doorApproachMidWallBridgeCooldownAction.use === false, "Mid-wall bridge/door cooldown should keep Use released");

const doorApproachRouteEvidenceAdvanceRuntime = runtimeFactory.create(publicProfile);
doorApproachRouteEvidenceAdvanceRuntime.predictions = 3156;
const doorApproachRouteEvidenceAdvanceAction = doorApproachRouteEvidenceAdvanceRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 23,
  turnRepeatFrames: 6,
  doorOpenedCount: 0,
  predictions: 3156,
  spawnCorridorGapScore: 0.16,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.36,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  spawnWestStairScore: 0.31,
  bridgeDoorScore: 0.54,
  firstDoorVision9x9Score: 0.17,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachRouteEvidenceAdvanceAction.stage === "door-approach-route-evidence-advance", `Door-approach route evidence should keep a door-specific advance instead of falling to open-space cruise (actual=${doorApproachRouteEvidenceAdvanceAction.stage})`);
assert(doorApproachRouteEvidenceAdvanceAction.objective === "approach-first-door", "Door-approach route evidence should preserve the FirstDoor objective");
assert(doorApproachRouteEvidenceAdvanceAction.move === "forward", "Door-approach route evidence should keep forward pressure");
assert(doorApproachRouteEvidenceAdvanceAction.turn === "right", "Door-approach route evidence should follow the corridor yaw");

const doorApproachBridgeBeatsRearSecretRuntime = runtimeFactory.create(publicProfile);
doorApproachBridgeBeatsRearSecretRuntime.predictions = 1315;
const doorApproachBridgeBeatsRearSecretAction = doorApproachBridgeBeatsRearSecretRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.61,
  motionForwardProgress: 0.0,
  motionObstacleScore: 0.50,
  footObstacleScore: 0.50,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 1,
  turnRepeatFrames: 5,
  doorOpenedCount: 0,
  predictions: 1315,
  spawnCorridorGapScore: 0.25,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.68,
  spawnSecretDoorTurn: "right",
  bridgeDoorScore: 0.33,
  firstDoorVision9x9Score: 0.17,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachBridgeBeatsRearSecretAction.stage === "door-approach-route-evidence-advance", `Bridge evidence should beat weak rear-secret pivot inside door-approach (actual=${doorApproachBridgeBeatsRearSecretAction.stage})`);
assert(doorApproachBridgeBeatsRearSecretAction.objective === "approach-first-door", "Bridge evidence should preserve the FirstDoor objective despite rear-secret evidence");

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
assert(stalledWideGapFootOcclusionAction.stage === "spawn-wall-obstacle-turn" || stalledWideGapFootOcclusionAction.stage === "demo-spawn-arc-foot-clear", `Zero-progress foot occlusion should still clear before corridor sustain (actual=${stalledWideGapFootOcclusionAction.stage})`);
assert(stalledWideGapFootOcclusionAction.move === "back", "Zero-progress foot occlusion should back out instead of pressing forward");

const rearLandmarkFootResetRuntime = runtimeFactory.create(publicProfile);
rearLandmarkFootResetRuntime.predictions = 1200;
const rearLandmarkFootResetAction = rearLandmarkFootResetRuntime.predict({
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

const closeRearLandmarkFootResetRuntime = runtimeFactory.create(publicProfile);
closeRearLandmarkFootResetRuntime.predictions = 750;
const closeRearLandmarkFootResetAction = closeRearLandmarkFootResetRuntime.predict({
  health: 100,
  depthSig: 0.10,
  contextDict: "wall",
  previousRouteMode: "spawn-approach",
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

const doorApproachWeakRearLandmarkAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0.22,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  predictions: 1200,
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.48,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.50,
  spawnSecretDoorTurn: "left",
  firstDoorVision9x9Score: 0.33,
  firstDoorVision9x9RedScore: 0.08,
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
assert(doorApproachWeakRearLandmarkAction.stage !== "spawn-rear-landmark-foot-reset", "Door-approach with a visible corridor gap should not abandon the first-door route for a weak rear-landmark reset");

const doorApproachCloseRouteEvidenceAction = spawnGapRuntime.predict({
  health: 100,
  depthSig: 0.08,
  contextDict: "wall",
  previousRouteMode: "door-approach",
  wallVector: 0.2,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.22,
  footObstacleBounceFrames: 0,
  doorOpenedCount: 0,
  predictions: 1300,
  spawnCorridorGapScore: 0.31,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.54,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.45,
  spawnSecretDoorTurn: "left",
  firstDoorVision9x9Score: 0.33,
  firstDoorVision9x9RedScore: 0.08,
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
assert(doorApproachCloseRouteEvidenceAction.stage !== "spawn-rear-landmark-foot-reset", "Door-approach with stable route evidence should not rear-reset only because the view is close to a wall");

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
assert(moderateGapWallTextureOcclusionAction.stage === "spawn-wall-obstacle-turn" || moderateGapWallTextureOcclusionAction.stage === "demo-spawn-arc-foot-clear", `Moderate-gap texture wall should still trigger wall recovery before it scrapes along the side wall (actual=${moderateGapWallTextureOcclusionAction.stage})`);

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

const spawnLandmarkRouteOverrideRuntime = runtimeFactory.create(publicProfile);
spawnLandmarkRouteOverrideRuntime.predictions = 2300;
const spawnLandmarkRouteOverrideAction = spawnLandmarkRouteOverrideRuntime.predict({
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

const spawnLandmarkRouteScanRuntime = runtimeFactory.create(publicProfile);
spawnLandmarkRouteScanRuntime.predictions = 2300;
const spawnLandmarkRouteScanAction = spawnLandmarkRouteScanRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "wall",
  wallVector: 0.2,
  doorOpenedCount: 0,
  previousRouteMode: "spawn-approach",
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
assert(spawnLandmarkRouteScanAction.stage === "spawn-landmark-route-turn" || spawnLandmarkRouteScanAction.stage === "spawn-wall-low-gap-survey", `Strong landmarks with a weak gap should scan in place before committing forward (actual=${spawnLandmarkRouteScanAction.stage})`);
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
  spawnCorridorGapScore: 0.26,
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

const spawnLandmarkWallPivotRuntime = runtimeFactory.create(publicProfile);
spawnLandmarkWallPivotRuntime.predictions = 2300;
const spawnLandmarkWallPivotAction = spawnLandmarkWallPivotRuntime.predict({
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
assert(spawnLandmarkWallPivotAction.stage === "spawn-landmark-wall-pivot" || spawnLandmarkWallPivotAction.stage === "door-approach-landmark-wall-advance", `Strong landmark route plus medium wall pressure should either pivot or advance under route topology (actual=${spawnLandmarkWallPivotAction.stage})`);
assert(spawnLandmarkWallPivotAction.move === "none" || spawnLandmarkWallPivotAction.move === "forward", "Landmark wall correction should avoid backing away from a stable route");
assert(spawnLandmarkWallPivotAction.turn === "left", "Landmark wall pivot should use the landmark-corrected route yaw");

const doorApproachLandmarkWallAdvanceRuntime = runtimeFactory.create(publicProfile);
doorApproachLandmarkWallAdvanceRuntime.predictions = 5028;
const doorApproachLandmarkWallAdvanceAction = doorApproachLandmarkWallAdvanceRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  actionRepeatFrames: 1,
  doorOpenedCount: 0,
  predictions: 5028,
  spawnCorridorGapScore: 0.31,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.54,
  spawnLandmarkRouteTurn: "right",
  spawnLandmarkRouteKind: "first-door-route",
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
assert(["door-approach-landmark-wall-advance", "door-approach-gap-right-ingress-release"].includes(doorApproachLandmarkWallAdvanceAction.stage), `Door-approach landmark wall pressure should advance through the ingress instead of spinning in place (actual=${doorApproachLandmarkWallAdvanceAction.stage})`);
assert(doorApproachLandmarkWallAdvanceAction.move === "forward", "Door-approach landmark wall pressure should keep forward ingress pressure");
assert(doorApproachLandmarkWallAdvanceAction.turn === "right", "Door-approach landmark wall pressure should follow the visible gap yaw");

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

const spawnLandmarkWallScrapeBackoffRuntime = runtimeFactory.create(publicProfile);
spawnLandmarkWallScrapeBackoffRuntime.predictions = 3920;
const spawnLandmarkWallScrapeBackoffAction = spawnLandmarkWallScrapeBackoffRuntime.predict({
  health: 100,
  depthSig: 0.59,
  contextDict: "open-space",
  wallVector: 0.44,
  motionForwardProgress: 0.08,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  actionRepeatFrames: 30,
  doorOpenedCount: 0,
  spawnCorridorGapScore: 0.36,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.48,
  spawnLandmarkRouteTurn: "right",
  spawnLandmarkRouteKind: "first-door-route",
  spawnSecretDoorScore: 0.0,
  firstDoorVision9x9Score: 0.17,
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
assert(spawnLandmarkWallScrapeBackoffAction.stage === "spawn-landmark-wall-scrape-backoff", `Close landmark scrape should back out before rejoining the route (actual=${spawnLandmarkWallScrapeBackoffAction.stage})`);
assert(spawnLandmarkWallScrapeBackoffAction.move === "back", "Close landmark scrape should back away instead of scraping forward");

const spawnBarrelLaneRuntime = runtimeFactory.create(publicProfile);
spawnBarrelLaneRuntime.predictions = 3637;
const spawnBarrelLaneClearanceAction = spawnBarrelLaneRuntime.predict({
  health: 100,
  depthSig: 0.92,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.10,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 3,
  doorOpenedCount: 0,
  predictions: 3637,
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.50,
  spawnLandmarkRouteTurn: "right",
  spawnLandmarkRouteKind: "east-window-anchor",
  spawnSecretDoorScore: 0.68,
  firstDoorVision9x9Score: 0.28,
  firstDoorVision9x9RedScore: 0.0,
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
assert(["spawn-barrel-lane-clearance", "route-dead-end-barrel-trim"].includes(spawnBarrelLaneClearanceAction.stage), `Barrel-lane scrape should step inward before sidewall slip (actual=${spawnBarrelLaneClearanceAction.stage})`);
assert(spawnBarrelLaneClearanceAction.move === "forward", "Barrel-lane scrape should keep moving before the barrel wall-line while trimming inward");
assert(spawnBarrelLaneClearanceAction.turn === "right", `Barrel-lane scrape should yaw toward the FirstDoor ingress lane (actual=${spawnBarrelLaneClearanceAction.stage}/${spawnBarrelLaneClearanceAction.move}/${spawnBarrelLaneClearanceAction.turn}/yaw=${spawnBarrelLaneClearanceAction.turnYaw})`);

const spawnBarrelLaneStableGapRuntime = runtimeFactory.create(publicProfile);
spawnBarrelLaneStableGapRuntime.predictions = 3637;
const spawnBarrelLaneStableGapAction = spawnBarrelLaneStableGapRuntime.predict({
  health: 100,
  depthSig: 0.92,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.10,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 240,
  doorOpenedCount: 0,
  predictions: 3637,
  spawnCorridorGapScore: 0.42,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.54,
  spawnLandmarkRouteTurn: "right",
  spawnLandmarkRouteKind: "east-window-anchor",
  spawnSecretDoorScore: 0.24,
  firstDoorVision9x9Score: 0.28,
  firstDoorVision9x9RedScore: 0.0,
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
assert(spawnBarrelLaneStableGapAction.stage !== "spawn-barrel-lane-clearance", "Stable corridor gap should release barrel-lane clearance instead of steering back toward the entrance side");

const doorApproachDeadEndTrimRuntime = runtimeFactory.create(publicProfile);
doorApproachDeadEndTrimRuntime.predictions = 1098;
const doorApproachDeadEndTrimAction = doorApproachDeadEndTrimRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.10,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 5,
  moveRepeatFrames: 5,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 1098,
  spawnCorridorGapScore: 0.34,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.07,
  firstDoorVision9x9Score: 0.28,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachDeadEndTrimAction.stage === "route-dead-end-barrel-trim", `Door-approach topology dead-end should trim before the topology budget is exhausted (actual=${doorApproachDeadEndTrimAction.stage})`);
assert(doorApproachDeadEndTrimAction.move === "forward", "Door-approach topology trim should keep forward pressure while moving inward");
assert(doorApproachDeadEndTrimAction.turn === "right", "Door-approach topology trim should yaw toward the observed ingress lane");
assert(doorApproachDeadEndTrimRuntime.status().autoplayState.routeAbortHint === "none", "Door-approach topology trim should not require the abort hint budget");

const doorApproachCloseGrayPanelMemoryUseRuntime = runtimeFactory.create(publicProfile);
doorApproachCloseGrayPanelMemoryUseRuntime.predictions = 3032;
const doorApproachCloseGrayPanelMemoryUseAction = doorApproachCloseGrayPanelMemoryUseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.10,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 2,
  moveRepeatFrames: 2,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 3032,
  blueFloorScore: 0,
  courtyardScore: 0.02,
  courtyardTurn: "none",
  bridgeDoorScore: 0.09,
  spawnCorridorGapScore: 0.36,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.48,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.0,
  spawnSecretDoorTurn: "none",
  firstDoorVision9x9Score: 0.28,
  firstDoorVision9x9RedScore: 0.0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.09,
      "computer-room": 0
    }
  }
});
assert(doorApproachCloseGrayPanelMemoryUseAction.stage === "door-approach-close-gray-panel-memory-use", `Close gray panel memory should spend Use before route-dead-end barrel trim keeps pushing (actual=${doorApproachCloseGrayPanelMemoryUseAction.stage})`);
assert(doorApproachCloseGrayPanelMemoryUseAction.use === true, "Close gray panel memory should emit one bounded Use pulse from a stopped Kinesis state");

const doorApproachDeadEndLowRepeatTrimRuntime = runtimeFactory.create(publicProfile);
doorApproachDeadEndLowRepeatTrimRuntime.predictions = 1098;
const doorApproachDeadEndLowRepeatTrimAction = doorApproachDeadEndLowRepeatTrimRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.10,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 5,
  moveRepeatFrames: 5,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 1098,
  spawnCorridorGapScore: 0.30,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.42,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.00,
  firstDoorVision9x9Score: 0.28,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachDeadEndLowRepeatTrimAction.stage === "route-dead-end-barrel-trim", `Strong topology dead-end should trim without waiting for a long repeat window (actual=${doorApproachDeadEndLowRepeatTrimAction.stage})`);

const doorApproachDeadEndRuntime = runtimeFactory.create(publicProfile);
doorApproachDeadEndRuntime.predictions = 1098;
const doorApproachDeadEndAction = doorApproachDeadEndRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.10,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 58,
  moveRepeatFrames: 58,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 1098,
  spawnCorridorGapScore: 0.34,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.07,
  firstDoorVision9x9Score: 0.28,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachDeadEndAction.stage === "door-approach-dead-end-backoff", `Door-approach topology dead-end should back off before repeating clearance (actual=${doorApproachDeadEndAction.stage})`);
assert(doorApproachDeadEndAction.move === "back", "Door-approach topology dead-end should back away from the barrel-side dead route");
assert(doorApproachDeadEndAction.turn === "left", "Door-approach topology dead-end should yaw opposite the route line before reacquiring");
assert(doorApproachDeadEndRuntime.status().autoplayState.routeAbortHint === "door-approach-dead-end", "Door-approach topology dead-end should remain visible as a route abort hint");

const routeDeadEndEarlyOpenBackoffRuntime = runtimeFactory.create(publicProfile);
routeDeadEndEarlyOpenBackoffRuntime.predictions = 614;
const routeDeadEndEarlyOpenBackoffAction = routeDeadEndEarlyOpenBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 34,
  moveRepeatFrames: 39,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 614,
  blueFloorScore: 0,
  courtyardScore: 0.28,
  courtyardTurn: "none",
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.40,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.00,
  firstDoorVision9x9Score: 0.35,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.35,
      corridor: 0.40,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(routeDeadEndEarlyOpenBackoffAction.stage === "route-dead-end-early-open-backoff", `Early topology dead-end should back off before route-escape-loop-open-advance pushes into the wall (actual=${routeDeadEndEarlyOpenBackoffAction.stage})`);
assert(routeDeadEndEarlyOpenBackoffAction.move === "back", "Early topology dead-end should reverse briefly");
assert(routeDeadEndEarlyOpenBackoffAction.turn === "left", "Early topology dead-end should yaw away from the barrel wall-line");

const spawnLandmarkLowGapDeadEndRuntime = runtimeFactory.create(publicProfile);
spawnLandmarkLowGapDeadEndRuntime.predictions = 676;
const spawnLandmarkLowGapDeadEndAction = spawnLandmarkLowGapDeadEndRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 3,
  moveRepeatFrames: 217,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 676,
  blueFloorScore: 0,
  courtyardScore: 0.34,
  courtyardTurn: "left",
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.40,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.00,
  firstDoorVision9x9Score: 0.07,
  firstDoorVision9x9RedScore: 0.0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.50,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0,
      "computer-room": 0
    }
  }
});
assert(spawnLandmarkLowGapDeadEndAction.stage === "spawn-landmark-low-gap-dead-end-backoff", `Low-gap landmark dead-end should back off instead of holding ingress trim forward pressure (actual=${spawnLandmarkLowGapDeadEndAction.stage})`);
assert(spawnLandmarkLowGapDeadEndAction.move === "back", "Low-gap landmark dead-end should reverse away from the wall/barrel lane");
assert(spawnLandmarkLowGapDeadEndAction.turn === "left", "Low-gap landmark dead-end should yaw left to reacquire the ingress line");

const doorApproachLowGapDeadEndTrimRuntime = runtimeFactory.create(publicProfile);
doorApproachLowGapDeadEndTrimRuntime.predictions = 1202;
const doorApproachLowGapDeadEndTrimAction = doorApproachLowGapDeadEndTrimRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.60,
  footObstacleScore: 0.60,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 3,
  moveRepeatFrames: 3,
  turnRepeatFrames: 3,
  doorOpenedCount: 0,
  predictions: 1202,
  spawnCorridorGapScore: 0.26,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.39,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.00,
  bridgeDoorScore: 0.26,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachLowGapDeadEndTrimAction.stage === "route-dead-end-barrel-trim", `Low-gap topology dead-end should trim before falling through to structural advance (actual=${doorApproachLowGapDeadEndTrimAction.stage})`);
assert(doorApproachLowGapDeadEndTrimAction.move === "forward", "Low-gap topology dead-end trim should keep forward pressure");
assert(doorApproachLowGapDeadEndTrimAction.turn === "right", "Low-gap topology dead-end trim should follow the observed ingress lane");

const doorApproachDeadEndBridgePanelRuntime = runtimeFactory.create(publicProfile);
doorApproachDeadEndBridgePanelRuntime.predictions = 4130;
const doorApproachDeadEndBridgePanelState = {
  health: 100,
  depthSig: 0.86,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 3,
  moveRepeatFrames: 10,
  turnRepeatFrames: 2,
  doorOpenedCount: 0,
  predictions: 4130,
  blueFloorScore: 0,
  spawnCorridorGapScore: 0.32,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.49,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.26,
  bridgeDoorScore: 0.43,
  firstDoorVision9x9Score: 0.28,
  firstDoorVision9x9RedScore: 0.04,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeDeadEndTrimRequired: true,
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.58,
      corridor: 0.44,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.43,
      "computer-room": 0
    }
  }
};
const doorApproachDeadEndBridgePanelAction = doorApproachDeadEndBridgePanelRuntime.predict(doorApproachDeadEndBridgePanelState);
assert(doorApproachDeadEndBridgePanelAction.stage === "door-approach-dead-end-bridge-panel-probe-use", `Strong bridge-door evidence inside topology dead-end should spend Use before trim keeps circling (actual=${doorApproachDeadEndBridgePanelAction.stage})`);
assert(doorApproachDeadEndBridgePanelAction.use === true, "Strong bridge-door dead-end should emit one bounded Use pulse");
assert(doorApproachDeadEndBridgePanelAction.move === "none", "Strong bridge-door dead-end Use should stop movement before pressing Use");

const doorApproachDeadEndBridgePanelCooldownRuntime = runtimeFactory.create(publicProfile);
doorApproachDeadEndBridgePanelCooldownRuntime.predictions = 4131;
const doorApproachDeadEndBridgePanelCooldownAction = doorApproachDeadEndBridgePanelCooldownRuntime.predict(Object.assign({}, doorApproachDeadEndBridgePanelState, {
  usePulseCooldown: 45
}));
assert(doorApproachDeadEndBridgePanelCooldownAction.stage !== "door-approach-dead-end-bridge-panel-probe-use", "Strong bridge-door dead-end should not spend another Use pulse while cooldown is active");
assert(doorApproachDeadEndBridgePanelCooldownAction.use === false, "Strong bridge-door dead-end cooldown should keep Use released");

const doorApproachFarBridgePanelRuntime = runtimeFactory.create(publicProfile);
doorApproachFarBridgePanelRuntime.predictions = 3765;
const doorApproachFarBridgePanelState = {
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 3,
  moveRepeatFrames: 3,
  turnRepeatFrames: 4,
  doorOpenedCount: 0,
  predictions: 3765,
  blueFloorScore: 0,
  courtyardScore: 0.00,
  courtyardTurn: "none",
  bridgeLaneTurn: "right",
  spawnSecretDoorScore: 0.00,
  spawnCorridorGapScore: 0.18,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.34,
  spawnLandmarkRouteTurn: "right",
  bridgeDoorScore: 0.31,
  firstDoorVision9x9Score: 0.07,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.54,
      corridor: 0.47,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.31,
      "computer-room": 0
    }
  }
};
const doorApproachFarBridgePanelAction = doorApproachFarBridgePanelRuntime.predict(doorApproachFarBridgePanelState);
assert(doorApproachFarBridgePanelAction.stage === "door-approach-far-bridge-panel-probe-use", `Far-depth bridge-door evidence should spend one Use pulse instead of pushing the door face (actual=${doorApproachFarBridgePanelAction.stage})`);
assert(doorApproachFarBridgePanelAction.use === true, "Far-depth bridge-door evidence should emit a bounded Use pulse");

const doorApproachFarBridgePanelCooldownRuntime = runtimeFactory.create(publicProfile);
doorApproachFarBridgePanelCooldownRuntime.predictions = 3766;
const doorApproachFarBridgePanelCooldownAction = doorApproachFarBridgePanelCooldownRuntime.predict(Object.assign({}, doorApproachFarBridgePanelState, {
  usePulseCooldown: 45
}));
assert(doorApproachFarBridgePanelCooldownAction.stage !== "door-approach-far-bridge-panel-probe-use", "Far-depth bridge-door evidence should not repeat Use while cooldown is active");
assert(doorApproachFarBridgePanelCooldownAction.use === false, "Far-depth bridge-door cooldown should keep Use released");

const doorApproachLeftBridgeSecretPanelRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftBridgeSecretPanelRuntime.predictions = 5065;
const doorApproachLeftBridgeSecretPanelState = {
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 2,
  moveRepeatFrames: 2,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 5065,
  blueFloorScore: 0,
  courtyardScore: 0.31,
  courtyardTurn: "right",
  bridgeLaneTurn: "left",
  spawnSecretDoorScore: 0.68,
  spawnSecretDoorTurn: "right",
  spawnCorridorGapScore: 0.31,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.43,
  spawnLandmarkRouteTurn: "right",
  bridgeDoorScore: 0.17,
  firstDoorVision9x9Score: 0.10,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeDeadEndTrimRequired: true,
  routeTextureWallOcclusion: false,
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.55,
      corridor: 0.45,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.17,
      "computer-room": 0
    }
  }
};
const doorApproachLeftBridgeSecretPanelAction = doorApproachLeftBridgeSecretPanelRuntime.predict(doorApproachLeftBridgeSecretPanelState);
assert(doorApproachLeftBridgeSecretPanelAction.stage === "door-approach-left-bridge-secret-panel-probe-use", `Left bridge/secret panel evidence should spend Use before barrel trim keeps circling (actual=${doorApproachLeftBridgeSecretPanelAction.stage})`);
assert(doorApproachLeftBridgeSecretPanelAction.use === true, "Left bridge/secret panel evidence should emit one bounded Use pulse");

const doorApproachLeftBridgeSecretPanelCooldownRuntime = runtimeFactory.create(publicProfile);
doorApproachLeftBridgeSecretPanelCooldownRuntime.predictions = 5066;
const doorApproachLeftBridgeSecretPanelCooldownAction = doorApproachLeftBridgeSecretPanelCooldownRuntime.predict(Object.assign({}, doorApproachLeftBridgeSecretPanelState, {
  usePulseCooldown: 45
}));
assert(doorApproachLeftBridgeSecretPanelCooldownAction.stage !== "door-approach-left-bridge-secret-panel-probe-use", "Left bridge/secret panel should not spend another Use pulse while cooldown is active");
assert(doorApproachLeftBridgeSecretPanelCooldownAction.use === false, "Left bridge/secret panel cooldown should keep Use released");

const doorApproachMediumBridgePanelRuntime = runtimeFactory.create(publicProfile);
doorApproachMediumBridgePanelRuntime.predictions = 1879;
const doorApproachMediumBridgePanelState = {
  health: 100,
  depthSig: 0.72,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.23,
  footObstacleScore: 0.23,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 4,
  moveRepeatFrames: 4,
  turnRepeatFrames: 4,
  doorOpenedCount: 0,
  predictions: 1879,
  blueFloorScore: 0,
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.50,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.68,
  bridgeDoorScore: 0.33,
  firstDoorVision9x9Score: 0.28,
  firstDoorVision9x9RedScore: 0.04,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.56,
      corridor: 0.44,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.33,
      "computer-room": 0
    }
  }
};
const doorApproachMediumBridgePanelAction = doorApproachMediumBridgePanelRuntime.predict(doorApproachMediumBridgePanelState);
assert(doorApproachMediumBridgePanelAction.stage === "door-approach-medium-bridge-panel-probe-use", `Medium bridge-door evidence should spend Use before route-evidence advance passes the panel (actual=${doorApproachMediumBridgePanelAction.stage})`);
assert(doorApproachMediumBridgePanelAction.use === true, "Medium bridge-door evidence should emit one bounded Use pulse");

const doorApproachBlueFloorCenterlineRuntime = runtimeFactory.create(publicProfile);
doorApproachBlueFloorCenterlineRuntime.predictions = 7420;
const doorApproachBlueFloorCenterlineAction = doorApproachBlueFloorCenterlineRuntime.predict({
  health: 100,
  depthSig: 0.98,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 240,
  moveRepeatFrames: 240,
  turnRepeatFrames: 240,
  doorOpenedCount: 0,
  predictions: 7420,
  blueFloorScore: 0.21,
  courtyardScore: 0.10,
  courtyardTurn: "none",
  bridgeLaneTurn: "none",
  spawnCorridorGapScore: 0.42,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.54,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.00,
  bridgeDoorScore: 0.34,
  firstDoorVision9x9Score: 0.74,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.74,
      corridor: 0.45,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.34,
      "computer-room": 0
    }
  }
});
assert(doorApproachBlueFloorCenterlineAction.stage === "door-approach-blue-floor-centerline-release", `Long blue-floor forward/right pressure should release yaw and cross the centerline (actual=${doorApproachBlueFloorCenterlineAction.stage})`);
assert(doorApproachBlueFloorCenterlineAction.move === "forward", "Blue-floor centerline release should keep forward pressure");
assert(doorApproachBlueFloorCenterlineAction.turn === "none", "Blue-floor centerline release should stop the repeated right yaw");

const doorApproachCorridorBridgeHoldRuntime = runtimeFactory.create(publicProfile);
doorApproachCorridorBridgeHoldRuntime.predictions = 2222;
const doorApproachCorridorBridgeHoldState = {
  health: 100,
  depthSig: 0.70,
  contextDict: "corridor",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.48,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 9,
  moveRepeatFrames: 9,
  turnRepeatFrames: 9,
  doorOpenedCount: 0,
  predictions: 2222,
  blueFloorScore: 0.01,
  courtyardScore: 0.00,
  courtyardTurn: "none",
  bridgeLaneTurn: "none",
  spawnCorridorGapScore: 0.42,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.54,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.00,
  bridgeDoorScore: 0.30,
  firstDoorVision9x9Score: 0.18,
  firstDoorVision9x9RedScore: 0.00,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.54,
      corridor: 0.62,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.30,
      "computer-room": 0
    }
  }
};
const doorApproachCorridorBridgeHoldAction = doorApproachCorridorBridgeHoldRuntime.predict(doorApproachCorridorBridgeHoldState);
assert(doorApproachCorridorBridgeHoldAction.stage === "door-approach-corridor-bridge-centerline-hold", `Corridor bridge-door evidence should hold centerline instead of yawing out of the corridor (actual=${doorApproachCorridorBridgeHoldAction.stage})`);
assert(doorApproachCorridorBridgeHoldAction.move === "forward", "Corridor bridge centerline hold should keep advancing");
assert(doorApproachCorridorBridgeHoldAction.turn === "none", "Corridor bridge centerline hold should remove the repeated right yaw");

const doorApproachCorridorBridgeStickyRuntime = runtimeFactory.create(publicProfile);
doorApproachCorridorBridgeStickyRuntime.predictions = 2230;
const doorApproachCorridorBridgeStickyAction = doorApproachCorridorBridgeStickyRuntime.predict(Object.assign({}, doorApproachCorridorBridgeHoldState, {
  contextDict: "open-space",
  routeCorridorBridgeLockFrames: 8,
  bridgeDoorScore: 0.30,
  courtyardScore: 0.02
}));
assert(doorApproachCorridorBridgeStickyAction.stage === "door-approach-corridor-bridge-centerline-hold", `Sticky corridor bridge lock should keep the centerline hold through one open-space jitter frame (actual=${doorApproachCorridorBridgeStickyAction.stage})`);
assert(doorApproachCorridorBridgeStickyAction.move === "forward", "Sticky corridor bridge hold should keep advancing");
assert(doorApproachCorridorBridgeStickyAction.turn === "none", "Sticky corridor bridge hold should remain yaw-neutral");

const doorApproachCorridorBridgeUseRuntime = runtimeFactory.create(publicProfile);
doorApproachCorridorBridgeUseRuntime.predictions = 2290;
const doorApproachCorridorBridgeUseAction = doorApproachCorridorBridgeUseRuntime.predict(Object.assign({}, doorApproachCorridorBridgeHoldState, {
  depthSig: 0.42,
  bridgeDoorScore: 0.34,
  usePulseCooldown: 0
}));
assert(doorApproachCorridorBridgeUseAction.stage === "door-approach-corridor-bridge-probe-use", `Close corridor bridge-door evidence should spend one bounded Use pulse (actual=${doorApproachCorridorBridgeUseAction.stage})`);
assert(doorApproachCorridorBridgeUseAction.use === true, "Corridor bridge-door probe should emit one Use pulse");

const blueFloorVisionFalsePositiveRuntime = runtimeFactory.create(publicProfile);
blueFloorVisionFalsePositiveRuntime.predictions = 3079;
const blueFloorVisionFalsePositiveAction = blueFloorVisionFalsePositiveRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.20,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.33,
  footObstacleScore: 0.33,
  doorOpenedCount: 0,
  predictions: 3079,
  blueFloorScore: 0.22,
  courtyardScore: 0.12,
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.50,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  bridgeDoorScore: 0.28,
  firstDoorVision9x9Score: 0.55,
  firstDoorVision9x9RedScore: 0.052,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  semanticMemory: {
    symbols: {
      door: 0.55,
      corridor: 0.44,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.28,
      "computer-room": 0
    }
  }
});
assert(!["first-door-route-vision-approach", "first-door-route-vision-hold"].includes(blueFloorVisionFalsePositiveAction.stage), `Blue-floor distant view should not be treated as a vision-only FirstDoor hold (actual=${blueFloorVisionFalsePositiveAction.stage})`);

const doorApproachMidWallBlueUseRuntime = runtimeFactory.create(publicProfile);
doorApproachMidWallBlueUseRuntime.predictions = 2875;
const doorApproachMidWallBlueUseAction = doorApproachMidWallBlueUseRuntime.predict({
  health: 100,
  depthSig: 0.13,
  contextDict: "wall",
  previousRouteMode: "door-approach",
  wallVector: 0.48,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.40,
  footObstacleScore: 0.40,
  doorOpenedCount: 0,
  predictions: 2875,
  blueFloorScore: 0.25,
  courtyardScore: 0.14,
  spawnCorridorGapScore: 0.41,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.53,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.09,
  bridgeDoorScore: 0.31,
  firstDoorVision9x9Score: 0.19,
  firstDoorVision9x9RedScore: 0.02,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  usePulseCooldown: 0,
  semanticMemory: {
    symbols: {
      door: 0.53,
      corridor: 0.62,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.31,
      "computer-room": 0
    }
  }
});
assert(doorApproachMidWallBlueUseAction.stage === "door-approach-mid-wall-bridge-probe-use", `Mid-wall bridge evidence with a blue floor edge should Use instead of advancing (actual=${doorApproachMidWallBlueUseAction.stage})`);
assert(doorApproachMidWallBlueUseAction.use === true, "Mid-wall bridge probe should emit a Use pulse");

const doorApproachDeadEndReacquireRuntime = runtimeFactory.create(publicProfile);
doorApproachDeadEndReacquireRuntime.predictions = 3789;
const doorApproachDeadEndReacquireAction = doorApproachDeadEndReacquireRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 18,
  moveRepeatFrames: 18,
  turnRepeatFrames: 5,
  doorOpenedCount: 0,
  predictions: 3789,
  spawnCorridorGapScore: 0.29,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.41,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.00,
  firstDoorVision9x9Score: 0.30,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachDeadEndReacquireAction.stage === "route-dead-end-heading-reacquire", `Repeated dead-end trim should switch to heading reacquire (actual=${doorApproachDeadEndReacquireAction.stage})`);
assert(doorApproachDeadEndReacquireAction.move === "none", "Repeated dead-end heading reacquire should stop forward pressure");
assert(doorApproachDeadEndReacquireAction.turn === "left", "Repeated dead-end heading reacquire should keep turning northward");

const doorApproachDeadEndOcclusionRuntime = runtimeFactory.create(publicProfile);
doorApproachDeadEndOcclusionRuntime.predictions = 1813;
const doorApproachDeadEndOcclusionAction = doorApproachDeadEndOcclusionRuntime.predict({
  health: 100,
  depthSig: 0.17,
  contextDict: "wall",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.60,
  footObstacleScore: 0.60,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 3,
  moveRepeatFrames: 3,
  turnRepeatFrames: 3,
  doorOpenedCount: 0,
  predictions: 1813,
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.39,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.00,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachDeadEndOcclusionAction.stage === "door-approach-dead-end-occlusion-pivot" || doorApproachDeadEndOcclusionAction.stage === "spawn-gap-wall-pivot", `Texture-occluded topology dead-end should pivot out before structural advance (actual=${doorApproachDeadEndOcclusionAction.stage})`);
assert(doorApproachDeadEndOcclusionAction.move === "back", "Texture-occluded topology dead-end should back away from the wall lane");
assert(doorApproachDeadEndOcclusionAction.turn === "left", "Texture-occluded topology dead-end should reverse the clockwise route line");

const doorApproachEastWallIngressRuntime = runtimeFactory.create(publicProfile);
doorApproachEastWallIngressRuntime.predictions = 1813;
const doorApproachEastWallIngressAction = doorApproachEastWallIngressRuntime.predict({
  health: 100,
  depthSig: 0.17,
  contextDict: "wall",
  previousRouteMode: "door-approach",
  wallVector: 0.36,
  motionForwardProgress: 0.00,
  motionObstacleScore: 0.33,
  footObstacleScore: 0.33,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 4,
  moveRepeatFrames: 4,
  turnRepeatFrames: 98,
  doorOpenedCount: 0,
  predictions: 1813,
  spawnCorridorGapScore: 0.39,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.51,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachEastWallIngressAction.stage === "door-approach-east-wall-ingress-pivot", `North-east ingress wall should reverse the clockwise search turn (actual=${doorApproachEastWallIngressAction.stage})`);
assert(doorApproachEastWallIngressAction.move === "back", "North-east ingress wall pivot should back away while the wall is still close");
assert(doorApproachEastWallIngressAction.turn === "left", "North-east ingress wall pivot should turn northward instead of continuing southward");

const doorApproachWeakGapRearLandmarkRuntime = runtimeFactory.create(publicProfile);
doorApproachWeakGapRearLandmarkRuntime.predictions = 2064;
const doorApproachWeakGapRearLandmarkAction = doorApproachWeakGapRearLandmarkRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 12,
  moveRepeatFrames: 12,
  turnRepeatFrames: 12,
  doorOpenedCount: 0,
  predictions: 2064,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.32,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.68,
  spawnSecretDoorTurn: "left",
  firstDoorVision9x9Score: 0.30,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachWeakGapRearLandmarkAction.stage === "door-approach-weak-gap-landmark-pivot" || doorApproachWeakGapRearLandmarkAction.stage === "door-approach-weak-gap-rear-landmark-pivot", `Weak rear landmark in door-approach should not keep right-forward loop advance (actual=${doorApproachWeakGapRearLandmarkAction.stage})`);
assert(doorApproachWeakGapRearLandmarkAction.move === "forward", "Weak rear landmark pressure should keep inward corridor pressure instead of backing out");
assert(doorApproachWeakGapRearLandmarkAction.turn === "right", "Weak rear landmark pivot should follow the RoutePlanner ingress side instead of the stale left bias");

const doorApproachStrongRearSecretRuntime = runtimeFactory.create(publicProfile);
doorApproachStrongRearSecretRuntime.predictions = 5816;
const doorApproachStrongRearSecretAction = doorApproachStrongRearSecretRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 3,
  moveRepeatFrames: 3,
  turnRepeatFrames: 23,
  doorOpenedCount: 0,
  predictions: 5816,
  spawnCorridorGapScore: 0.19,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 179,
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.77,
  spawnSecretDoorTurn: "left",
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachStrongRearSecretAction.stage === "spawn-secret-route-survey", `Strong rear secret-door view should survey out of stale door-approach instead of continuing weak-gap pivot (actual=${doorApproachStrongRearSecretAction.stage})`);
assert(doorApproachStrongRearSecretAction.move === "none", "Strong rear secret-door survey should stop forward pressure");
assert(doorApproachStrongRearSecretAction.turn === "right", "Strong rear secret-door survey should turn away from the rear landmark");

const doorApproachWeakGapLandmarkRuntime = runtimeFactory.create(publicProfile);
doorApproachWeakGapLandmarkRuntime.predictions = 1784;
const doorApproachWeakGapLandmarkAction = doorApproachWeakGapLandmarkRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 9,
  moveRepeatFrames: 9,
  turnRepeatFrames: 4,
  doorOpenedCount: 0,
  predictions: 1784,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.07,
  spawnSecretDoorTurn: "none",
  firstDoorVision9x9Score: 0.30,
  firstDoorVision9x9RedScore: 0.0,
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
assert(["door-approach-weak-gap-landmark-pivot", "door-approach-gap-right-ingress-release"].includes(doorApproachWeakGapLandmarkAction.stage), `Weak gap landmark pressure should not keep route-planner-landmark-loop-advance (actual=${doorApproachWeakGapLandmarkAction.stage})`);
assert(doorApproachWeakGapLandmarkAction.move === "forward", "Weak gap landmark pressure should trim inward instead of backing out of the ingress");
assert(["left", "right"].includes(doorApproachWeakGapLandmarkAction.turn), "Weak gap landmark pivot should keep turning along the FirstDoor ingress line");

const doorApproachLowGapReacquireRuntime = runtimeFactory.create(publicProfile);
doorApproachLowGapReacquireRuntime.predictions = 3159;
const doorApproachLowGapReacquireAction = doorApproachLowGapReacquireRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.53,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.60,
  footObstacleScore: 0.60,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 16,
  turnRepeatFrames: 8,
  doorOpenedCount: 0,
  predictions: 3159,
  spawnCorridorGapScore: 0.17,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.29,
  spawnLandmarkRouteTurn: "none",
  spawnSecretDoorScore: 0.00,
  bridgeDoorScore: 0.26,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachLowGapReacquireAction.stage === "door-approach-low-gap-reacquire", `Door-approach low-gap wall view should reacquire instead of falling through to open-space cruise (actual=${doorApproachLowGapReacquireAction.stage})`);
assert(doorApproachLowGapReacquireAction.move === "back", "Door-approach low-gap reacquire should back out from the flat wall before scanning again");

const doorApproachLowGapHighSecretRuntime = runtimeFactory.create(publicProfile);
doorApproachLowGapHighSecretRuntime.predictions = 1905;
const doorApproachLowGapHighSecretAction = doorApproachLowGapHighSecretRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.53,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.60,
  footObstacleScore: 0.60,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 4,
  turnRepeatFrames: 22,
  doorOpenedCount: 0,
  predictions: 1905,
  spawnCorridorGapScore: 0.17,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.32,
  spawnLandmarkRouteTurn: "none",
  spawnSecretDoorScore: 0.68,
  spawnSecretDoorTurn: "none",
  bridgeDoorScore: 0,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.0,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
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
assert(doorApproachLowGapHighSecretAction.stage !== "door-approach-low-gap-reacquire", "Door-approach low-gap reacquire should not back away from a high secret-door landmark without a valid FirstDoor gap");

const doorApproachWeakGapLoopReleaseRuntime = runtimeFactory.create(publicProfile);
doorApproachWeakGapLoopReleaseRuntime.predictions = 3716;
const doorApproachWeakGapLoopReleaseAction = doorApproachWeakGapLoopReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 64,
  moveRepeatFrames: 64,
  turnRepeatFrames: 64,
  doorOpenedCount: 0,
  predictions: 3716,
  spawnCorridorGapScore: 0.23,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  spawnSecretDoorTurn: "none",
  firstDoorVision9x9Score: 0.30,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachWeakGapLoopReleaseAction.stage === "door-approach-weak-gap-loop-release", `Repeated weak-gap ingress trim should switch side before grinding along the wall (actual=${doorApproachWeakGapLoopReleaseAction.stage})`);
assert(doorApproachWeakGapLoopReleaseAction.move === "forward", "Weak-gap loop release should preserve forward pressure");
assert(doorApproachWeakGapLoopReleaseAction.turn === "right", "Weak-gap loop release should follow the visible gap yaw after a long left trim");

const doorApproachAdvanceStallBackoffRuntime = runtimeFactory.create(publicProfile);
doorApproachAdvanceStallBackoffRuntime.predictions = 3716;
const doorApproachAdvanceStallBackoffAction = doorApproachAdvanceStallBackoffRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 140,
  moveRepeatFrames: 140,
  turnRepeatFrames: 1,
  doorOpenedCount: 0,
  predictions: 3716,
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  spawnSecretDoorTurn: "none",
  firstDoorVision9x9Score: 0.30,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachAdvanceStallBackoffAction.stage === "door-approach-advance-stall-backoff", `Advance-stall budget should back out before weak-gap release keeps grinding (actual=${doorApproachAdvanceStallBackoffAction.stage})`);
assert(doorApproachAdvanceStallBackoffAction.move === "back", "Advance-stall backoff should reverse briefly before reacquiring the ingress");
assert(doorApproachAdvanceStallBackoffAction.turn === "right", "Advance-stall backoff should preserve the visible ingress yaw");

const doorApproachCornerLoopReleaseRuntime = runtimeFactory.create(publicProfile);
doorApproachCornerLoopReleaseRuntime.predictions = 2404;
const doorApproachCornerLoopReleaseAction = doorApproachCornerLoopReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.49,
  motionForwardProgress: 0.00,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 4,
  moveRepeatFrames: 4,
  turnRepeatFrames: 4,
  doorOpenedCount: 0,
  predictions: 2404,
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.33,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.19,
  spawnSecretDoorTurn: "left",
  firstDoorVision9x9Score: 0.50,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachCornerLoopReleaseAction.stage === "door-approach-corner-loop-release", `Door-approach corner budget should release the weak-gap pivot loop (actual=${doorApproachCornerLoopReleaseAction.stage})`);
assert(doorApproachCornerLoopReleaseAction.move === "back", "Door-approach corner release should keep backing away from the obstacle");
assert(doorApproachCornerLoopReleaseAction.turn === "right", "Door-approach corner release should reverse the previous left escape turn");

const spawnBarrelLaneDetourRuntime = runtimeFactory.create(publicProfile);
spawnBarrelLaneDetourRuntime.predictions = 3637;
const doorApproachSecretNearMissReacquireAction = spawnBarrelLaneDetourRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.10,
  motionForwardProgress: 0.57,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 5,
  doorOpenedCount: 0,
  predictions: 3637,
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.68,
  spawnSecretDoorTurn: "none",
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.05,
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
assert(doorApproachSecretNearMissReacquireAction.stage === "door-approach-secret-near-miss-reacquire", `Strong rear secret evidence with a weak right gap should reacquire instead of pushing the barrel lane (actual=${doorApproachSecretNearMissReacquireAction.stage})`);
assert(doorApproachSecretNearMissReacquireAction.move === "none", "Secret near-miss reacquire should not keep pushing forward");
assert(doorApproachSecretNearMissReacquireAction.turn === "right", "Secret near-miss reacquire should yaw away from the rear secret landmark");

const doorApproachObservedSecretNearMissAction = spawnBarrelLaneDetourRuntime.predict({
  health: 100,
  depthSig: 0.94,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.18,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 3,
  moveRepeatFrames: 37,
  turnRepeatFrames: 0,
  doorOpenedCount: 0,
  predictions: 4439,
  spawnCorridorGapScore: 0.29,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.51,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.45,
  spawnSecretDoorTurn: "right",
  bridgeDoorScore: 0.03,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.05,
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
assert(doorApproachObservedSecretNearMissAction.stage === "door-approach-secret-near-miss-reacquire", `Observed right-side secret near-miss should reacquire instead of trimming into the toxic outer lane (actual=${doorApproachObservedSecretNearMissAction.stage})`);
assert(doorApproachObservedSecretNearMissAction.move === "none", "Observed secret near-miss should pause forward pressure before reacquiring the corridor");

const doorApproachVeryLowGapMoveBackoffAction = spawnBarrelLaneDetourRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.60,
  footObstacleScore: 0.60,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 1,
  moveRepeatFrames: 140,
  turnRepeatFrames: 1,
  doorOpenedCount: 0,
  predictions: 683,
  spawnCorridorGapScore: 0.15,
  spawnCorridorGapTurn: "none",
  spawnCorridorGapLockFrames: 0,
  spawnLandmarkRouteEvidence: 0.39,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.0,
  spawnSecretDoorTurn: "none",
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.05,
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
assert(["door-approach-very-low-gap-move-backoff", "route-dead-end-tight-barrel-recover"].includes(doorApproachVeryLowGapMoveBackoffAction.stage), `Very-low-gap route dead-end should back off before open-space cruise repeats forward movement (actual=${doorApproachVeryLowGapMoveBackoffAction.stage})`);
assert(doorApproachVeryLowGapMoveBackoffAction.move === "back", "Very-low-gap dead-end should reverse briefly");

const routeDeadEndLateBarrelRecoverAction = spawnBarrelLaneDetourRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 10,
  moveRepeatFrames: 25,
  turnRepeatFrames: 10,
  doorOpenedCount: 0,
  predictions: 1905,
  spawnCorridorGapScore: 0.27,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.39,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  spawnSecretDoorTurn: "none",
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.05,
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
assert(["route-dead-end-late-barrel-recover", "door-approach-ingress-corner-backoff"].includes(routeDeadEndLateBarrelRecoverAction.stage), `Late barrel dead-end should recover instead of continuing trim into the wall (actual=${routeDeadEndLateBarrelRecoverAction.stage})`);
assert(routeDeadEndLateBarrelRecoverAction.move === "back", "Late barrel dead-end recover should reverse briefly");

const routeDeadEndLateBarrelWithBridgeDoorAction = spawnBarrelLaneDetourRuntime.predict(Object.assign({}, routeDeadEndLateBarrelRecoverAction.input || {}, {
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.33,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  actionRepeatFrames: 8,
  moveRepeatFrames: 8,
  turnRepeatFrames: 38,
  doorOpenedCount: 0,
  predictions: 7494,
  spawnCorridorGapScore: 0.27,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.39,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.04,
  spawnSecretDoorTurn: "none",
  bridgeDoorScore: 0.17,
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.05,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.17,
      "computer-room": 0
    }
  }
}));
assert(routeDeadEndLateBarrelWithBridgeDoorAction.stage !== "route-dead-end-late-barrel-recover", "Late barrel recover should not pull away when bridge/door evidence is visible inside the approach corridor");

const routeDeadEndTightBarrelRecoverAction = spawnBarrelLaneDetourRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.52,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.66,
  footObstacleScore: 0.66,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 28,
  moveRepeatFrames: 25,
  turnRepeatFrames: 4,
  doorOpenedCount: 0,
  predictions: 3960,
  spawnCorridorGapScore: 0.17,
  spawnCorridorGapTurn: "none",
  spawnCorridorGapLockFrames: 0,
  spawnLandmarkRouteEvidence: 0.41,
  spawnLandmarkRouteTurn: "left",
  spawnSecretDoorScore: 0.06,
  spawnSecretDoorTurn: "none",
  firstDoorVision9x9Score: 0.02,
  firstDoorVision9x9RedScore: 0.0,
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
assert(routeDeadEndTightBarrelRecoverAction.stage === "route-dead-end-tight-barrel-recover", `Tight barrel dead-end should recover before low-gap detour keeps pushing (actual=${routeDeadEndTightBarrelRecoverAction.stage})`);
assert(routeDeadEndTightBarrelRecoverAction.move === "back", "Tight barrel dead-end should reverse out of the wall-line");

const spawnBarrelLaneDetourAction = spawnBarrelLaneDetourRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  wallVector: 0.10,
  motionForwardProgress: 0.57,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 5,
  doorOpenedCount: 0,
  predictions: 3637,
  spawnCorridorGapScore: 0.22,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.46,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.18,
  spawnSecretDoorTurn: "none",
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.05,
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
assert(spawnBarrelLaneDetourAction.stage === "spawn-barrel-lane-detour", `Low-gap barrel-lane scrape should detour before open advance repeats (actual=${spawnBarrelLaneDetourAction.stage})`);
assert(spawnBarrelLaneDetourAction.move === "forward", "Low-gap barrel-lane detour should keep inward pressure instead of backing out of the ingress");
assert(spawnBarrelLaneDetourAction.turn === "right", "Low-gap barrel-lane detour should follow the visible FirstDoor ingress gap");

const doorApproachCorridorBendRuntime = runtimeFactory.create(publicProfile);
doorApproachCorridorBendRuntime.predictions = 5873;
const doorApproachCorridorBendAction = doorApproachCorridorBendRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.00,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  actionRepeatFrames: 5,
  moveRepeatFrames: 5,
  turnRepeatFrames: 10,
  doorOpenedCount: 0,
  predictions: 5873,
  spawnCorridorGapScore: 0.17,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.35,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.06,
  spawnSecretDoorTurn: "none",
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.0,
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
assert(["door-approach-corridor-bend-right-pivot", "door-approach-corridor-bend-right-pivot-sticky"].includes(doorApproachCorridorBendAction.stage), `Door-approach left-corner should pivot into the right-bending corridor before generic corner backoff (actual=${doorApproachCorridorBendAction.stage})`);
assert(doorApproachCorridorBendAction.move !== "back", `Door-approach corridor bend should not back out of the right-bending ingress (actual=${doorApproachCorridorBendAction.stage}/${doorApproachCorridorBendAction.move}/${doorApproachCorridorBendAction.turn})`);
assert(doorApproachCorridorBendAction.turn === "right", "Door-approach corridor bend should yaw right toward the door bend");

const doorApproachCorridorBendReleaseRuntime = runtimeFactory.create(publicProfile);
doorApproachCorridorBendReleaseRuntime.predictions = 5873;
const doorApproachCorridorBendReleaseAction = doorApproachCorridorBendReleaseRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  wallVector: 0.56,
  motionForwardProgress: 0.00,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  actionRepeatFrames: 80,
  moveRepeatFrames: 0,
  turnRepeatFrames: 80,
  doorOpenedCount: 0,
  predictions: 5873,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnCorridorGapLockFrames: 180,
  spawnLandmarkRouteEvidence: 0.37,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.11,
  spawnSecretDoorTurn: "none",
  firstDoorVision9x9Score: 0.05,
  firstDoorVision9x9RedScore: 0.0,
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
assert(doorApproachCorridorBendReleaseAction.stage === "door-approach-corridor-bend-right-release", `Long right-bend pivot should release into forward ingress instead of spinning in place (actual=${doorApproachCorridorBendReleaseAction.stage})`);
assert(doorApproachCorridorBendReleaseAction.move === "forward", "Long right-bend pivot release should move forward through the corridor bend");
assert(doorApproachCorridorBendReleaseAction.turn === "right", "Long right-bend pivot release should keep yawing right while advancing");

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

const doorApproachRouteEscapeLoopReacquireRuntime = runtimeFactory.create(publicProfile);
doorApproachRouteEscapeLoopReacquireRuntime.predictions = 9915;
const doorApproachRouteEscapeLoopReacquireAction = doorApproachRouteEscapeLoopReacquireRuntime.predict({
  health: 100,
  depthSig: 1,
  contextDict: "open-space",
  wallVector: 0.33,
  motionForwardProgress: 0.7,
  motionObstacleScore: 0.57,
  footObstacleScore: 0.57,
  actionRepeatFrames: 25,
  doorOpenedCount: 0,
  routeMode: "door-approach",
  previousRouteMode: "door-approach",
  routeConfidence: 0.62,
  predictions: 9915,
  spawnCorridorGapScore: 0.21,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.39,
  spawnLandmarkRouteTurn: "left",
  spawnSecretDoorScore: 0.06,
  bridgeLaneTurn: "left",
  bridgeDoorScore: 0,
  firstDoorVision9x9Score: 0.07,
  firstDoorUse3x3Score: 0,
  firstDoorUseTurn: "none",
  routeTextureWallOcclusion: false,
  semanticMemory: {
    symbols: {
      door: 0.5,
      corridor: 0.35,
      enemy: 0,
      "safe-zone": 0.2,
      bridge: 0.10,
      "computer-room": 0
    }
  }
});
assert(doorApproachRouteEscapeLoopReacquireAction.stage === "door-approach-route-escape-loop-left-reacquire", `Long door-approach escape loop should back off and reacquire left instead of pressing forward/right (actual=${doorApproachRouteEscapeLoopReacquireAction.stage})`);
assert(doorApproachRouteEscapeLoopReacquireAction.move === "back", "Long door-approach escape loop should reverse before selecting a new route");
assert(doorApproachRouteEscapeLoopReacquireAction.turn === "left", "Long door-approach escape loop should turn left toward the corridor/door side");

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

const spawnSecretDoorEscapeRuntime = runtimeFactory.create(publicProfile);
spawnSecretDoorEscapeRuntime.predictions = 580;
const spawnSecretDoorEscapeAction = spawnSecretDoorEscapeRuntime.predict({
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
assert(spawnSecretDoorEscapeAction.stage === "spawn-secret-route-reset" || spawnSecretDoorEscapeAction.stage === "demo-spawn-arc-foot-clear", `Strong spawn secret door evidence plus low-progress foot contact should force a backing escape instead of route progress (actual=${spawnSecretDoorEscapeAction.stage})`);
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
