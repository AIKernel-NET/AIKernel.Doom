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
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/doom-context.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/sensor-tensor.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/cognition/semantics.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/evidence.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/arbitration.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/decision-trace.js");
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
assert(runtimeFactory?.create, "control runtime module was not exported");

const bridgeRoute = router.resolveObjectiveRoute({ semanticObjective: "cross-bridge" });
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

console.log("CONTROL_RUNTIME_VM_TEST_OK", {
  bridgeObjective: bridgeRoute.objective,
  deterministicStage: tieAction.stage,
  tensorStage: tensorAction.stage
});
