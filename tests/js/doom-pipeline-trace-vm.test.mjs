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

const sandbox = {
  self: {},
  console,
  Math,
  Number,
  Object,
  String,
  Boolean,
  Array
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);
const source = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "pipeline-trace.js"), "utf8");
vm.runInContext(source, context, { filename: "pipeline-trace.js" });

const traceModule = context.self.AIKernelDoomPipelineTrace;
assert(traceModule?.buildTrace, "Pipeline trace module should expose buildTrace");

const trace = traceModule.buildTrace({
  enabled: true,
  phase: "ComputerRoom",
  objective: "engage-front-enemy",
  priority: 3,
  activeDetections: ["objective", "enemy", "motion"],
  action: { move: "none", turn: "left", fire: false },
  observed: { logos: 0.3, pathos: 0.48, ethos: 0.62 },
  carrier: { dominantAxis: "ETHOS", decisionVector: { arrow: "<" } },
  doorOpenedCount: 1,
  computerRoomEntered: true,
  centralHallEntered: true,
  enemyDefeatedCount: 0,
  centralHallEnemySweepFrames: 12,
  centralHallEnemySweepTurn: "left",
  enemyConfidencePeak: 0.4,
  finalRoomEntered: false,
  exitSwitchPressed: false
});

assert(trace.version === "doom-pipeline-trace/v1", "Trace version should be stable");
assert(trace.stages.some(stage => stage.key === "topos" && stage.active), "Trace should include active Topos stage");
assert(trace.stages.some(stage => stage.key === "kinesis" && stage.signal === "none/left"), "Trace should include Kinesis action signature");
assert(trace.route.some(item => item.key === "frontEnemy" && item.active && item.signal === "sweep-left"), "Trace should include front-enemy sweep route state");
assert(trace.route.some(item => item.key === "firstDoor" && item.complete), "Trace should mark first door complete");
assert(trace.route.some(item => item.key === "finalRoom" && !item.complete), "Trace should expose final-room route state");
assert(trace.route.some(item => item.key === "exitSwitch" && !item.complete), "Trace should expose exit-switch route state");

console.log("DOOM_PIPELINE_TRACE_VM_TEST_OK", { stages: trace.stages.length, route: trace.route.map(item => item.signal).join(",") });
