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

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/pipeline-graph.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/zoe-veto.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/runtime-packets.js");

const graph = context.self.AIKernelDoomControlPipelineGraph;
const zoeVeto = context.self.AIKernelDoomControlZoeVeto;
const packets = context.self.AIKernelDoomControlRuntimePackets;
assert(graph?.compileCanonicalGraph, "control pipeline graph module should export compileCanonicalGraph");
assert(zoeVeto?.applyZoeVeto, "control Zoe veto module should export applyZoeVeto");
assert(packets?.actionFromStage, "runtime packet module should export actionFromStage");
assert(packets?.idleAction, "runtime packet module should export idleAction");
assert(packets?.statusFromAction, "runtime packet module should export statusFromAction");
assert(packets?.compileCanonicalGraph, "runtime packet module should retain compileCanonicalGraph compatibility export");

const customGraph = graph.compileCanonicalGraph({
  pipeline: {
    krisis: {
      topos: { vectors: ["CustomDecisionVector"] },
      kairos: { priorities: ["logos"] }
    },
    kinesis: {
      motion: { actions: ["turnYaw"] }
    }
  }
});
assert(customGraph.nodes.map(node => node.id).join(">") === "aisthesis>phainesis>nous>topos>kairos>kinesis>zoe", "pipeline graph should keep canonical order");
assert(customGraph.nodes.find(node => node.id === "kairos").inputs[0] === "CustomDecisionVector", "Kairos should consume the configured Topos vector");
assert(packets.compileCanonicalGraph({}).version === "dynamic-pipeline-4layer/v1", "runtime packets should delegate graph compatibility export");
const vetoed = packets.applyZoeVeto({ move: "forward", fire: true }, { health: 4 }, { pipeline: { kinesis: { zoe: { vetoRules: [{ when: "hp < 10" }] } } } }, {
  evaluateWhen: (context, expression) => expression === "hp < 10" && context.values.hp < 10,
  buildContext: (profile, state) => ({ profile, state, values: state })
});
assert(vetoed.zoeVetoed === true, "runtime packets should delegate Zoe veto compatibility export");
assert(vetoed.move === "none" && vetoed.fire === false, "delegated Zoe veto should neutralize unsafe action");

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
assert(action.turnYaw === -3, "stage action should preserve the numeric turn yaw");
assert(action.use === true, "stage action should preserve use command");
assert(action.evidenceScore === 0.66, "stage action should include evidence score");
assert(action.semanticScores.door === 0.8, "stage action should include semantic scores");

const status = packets.statusFromAction(action, [{ id: "door-route" }], {
  profile: { strategyName: "PacketProfile" },
  values: {
    currentRoute: "first-door-route",
    routeMode: "door-approach",
    routeLoopKind: "slide-stall",
    routeAbortHint: "slide-stall",
    routeLoopBudgetExceeded: true,
    routeSlideUsed: 8,
    routeSlideBudget: 6,
    currentLandmark: "spawn-corridor-gap",
    routeConfidence: 0.74,
    recommendedYaw: 9,
    useProbeConfidence: 0.68,
    firstDoorRouteEvidence: 0.42,
    firstDoorRouteEvidenceReady: true,
    actionRepeatFrames: 20,
    moveRepeatFrames: 20,
    turnRepeatFrames: 6,
    lethalRisk: 0.8
  }
}, 3, {
  runtimeId: "packet-runtime",
  createDecisionTrace: payload => ({ version: "trace-test", payload })
});

assert(status.runtimeId === "packet-runtime", "status should preserve runtime id");
assert(status.controlPipeline === "door-route", "status should expose selected pipeline");
assert(status.decisionTrace.payload.objective === "open-door", "status should build decision trace from action");
assert(status.stageEvaluations.length === 1, "status should preserve stage evaluations");
assert(status.pipelineState?.krisis?.kairos?.selectedAxis, "status should expose PipelineState DTO");
assert(status.pipelineState?.noesis?.phainesisEvents?.goalDirection > 0, "PipelineState should expose non-empty Phainesis events");
assert(status.pipelineState?.noesis?.eventLabels?.includes("door-route"), "PipelineState should expose Phainesis event labels");
assert(Array.isArray(status.pipelineState?.noesis?.meaningVector4) && status.pipelineState.noesis.meaningVector4.length === 4, "PipelineState should expose compact Noesis Vector4");
assert(status.pipelineState?.noesis?.nousVectors?.goalVector > 0, "PipelineState should expose non-empty Nous vectors");
assert(status.pipelineState?.krisis?.toposVectors?.LogosVector > 0, "PipelineState should expose non-empty Topos vectors");
assert(status.pipelineState?.krisis?.toposLabels?.includes("route-abort"), "PipelineState should expose Topos labels");
assert(status.pipelineState?.kinesis?.turnYaw === -3, "PipelineState should expose numeric Kinesis yaw");
assert(status.pipelineState?.kinesis?.actionRepeatFrames === 20, "PipelineState should expose Kinesis action repeat frames");
assert(status.pipelineState?.kinesis?.moveRepeatFrames === 20, "PipelineState should expose Kinesis movement repeat frames");
assert(status.pipelineState?.kinesis?.turnRepeatFrames === 6, "PipelineState should expose Kinesis turn repeat frames");
assert(status.pipelineState?.aisthesis?.routePlan?.routeMode === "door-approach", "PipelineState route plan should expose route mode");
assert(status.pipelineState?.aisthesis?.routePlan?.routeLoopKind === "slide-stall", "PipelineState route plan should expose route loop kind");
assert(status.pipelineState?.aisthesis?.routePlan?.routeLoopBudgetExceeded === true, "PipelineState route plan should expose loop budget exhaustion");
assert(status.goalState?.telos === "FirstDoor", "status should expose GoalState DTO");
assert(status.debugOverlay?.regions?.length > 0, "status should expose DebugOverlay DTO regions");
assert(status.autoplayState?.goalState?.priority, "status should expose aggregate AutoplayState DTO");
assert(status.autoplayState?.currentRoute === "first-door-route", "aggregate AutoplayState should preserve route planner route name");
assert(status.autoplayState?.routeAbortHint === "slide-stall", "aggregate AutoplayState should preserve route abort hint");
assert(status.autoplayState?.recommendedYaw === 9, "aggregate AutoplayState should preserve recommended yaw");
assert(status.autoplayState?.suggestedAction?.yaw === -3, "aggregate AutoplayState should preserve action yaw over fallback yaw");
assert(status.debugOverlay?.useProbe?.confidence === 0.68, "DebugOverlay should expose UseProbe confidence");
assert(status.pipelineState?.kinesis?.zoe?.vetoed === true, "PipelineState should expose Zoe veto state");
assert(status.debugRouteValues?.routeLoopKind === "slide-stall", "debug route values should expose route loop kind");
assert(status.debugRouteValues?.routeLoopBudgetExceeded === true, "debug route values should expose loop budget exhaustion");

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
