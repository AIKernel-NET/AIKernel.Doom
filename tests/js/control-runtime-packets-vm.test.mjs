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
  Number,
  Object
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/runtime-packets.js");

const packets = context.self.AIKernelDoomControlRuntimePackets;
assert(packets?.actionFromStage, "runtime packet module should export actionFromStage");
assert(packets?.idleAction, "runtime packet module should export idleAction");
assert(packets?.statusFromAction, "runtime packet module should export statusFromAction");

const action = packets.actionFromStage(
  {
    profile: { strategyName: "PacketProfile" },
    state: { semanticMemory: {} },
    values: { run: true, yaw: -3 }
  },
  {
    id: "door-route",
    objective: "open-door",
    priority: 7,
    action: {
      moveForward: "true",
      turnYaw: "yaw",
      useKey: "true",
      runKey: "run"
    }
  },
  {
    evaluateWhen: (state, expression) => expression === "true" || state.values[expression] === true,
    valueOf: (state, token) => state.values[token] ?? token,
    evidenceScore: () => 0.66,
    semanticScores: () => ({ door: 0.8 }),
    number: value => Number(value) || 0
  }
);

assert(action.move === "forward", "stage action should map moveForward to forward");
assert(action.turn === "left", "negative yaw should map to left turn");
assert(action.use === true, "stage action should preserve use command");
assert(action.evidenceScore === 0.66, "stage action should include evidence score");
assert(action.semanticScores.door === 0.8, "stage action should include semantic scores");

const status = packets.statusFromAction(action, [{ id: "door-route" }], { profile: { strategyName: "PacketProfile" } }, 3, {
  runtimeId: "packet-runtime",
  createDecisionTrace: payload => ({ version: "trace-test", payload })
});

assert(status.runtimeId === "packet-runtime", "status should preserve runtime id");
assert(status.controlPipeline === "door-route", "status should expose selected pipeline");
assert(status.decisionTrace.payload.objective === "open-door", "status should build decision trace from action");
assert(status.stageEvaluations.length === 1, "status should preserve stage evaluations");

const initialized = packets.initializedStatus({
  runtimeId: "packet-runtime",
  strategyName: "PacketProfile",
  predictions: 2,
  createDecisionTrace: payload => ({ version: "trace-test", payload })
});

assert(initialized.stage === "initialized", "initialized status should expose initialized stage");
assert(initialized.decisionTrace.payload.predictions === 2, "initialized status should pass prediction count to trace");

console.log("CONTROL_RUNTIME_PACKETS_VM_TEST_OK", {
  move: action.move,
  turn: action.turn,
  stage: status.stage
});
