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
  Boolean,
  Object
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/cognition/kinesis.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/cognition/zoe.js");

const kinesis = context.self.AIKernelDoomKinesis;
const zoe = context.self.AIKernelDoomZoe;
assert(kinesis?.mapToposDecision, "Kinesis should export mapToposDecision");
assert(zoe?.auditAction, "Zoe should export auditAction");

const generated = kinesis.mapToposDecision({
  enabled: true,
  action: { move: "forward", turn: "left", run: true },
  healthRetryRequested: true,
  healthLikelyDead: true,
  vector: { x: 0.8, y: 0.3 },
  weights: { logos: 0.7, pathos: 0.1 },
  dominantAxis: "LOGOS",
  observed: {},
  firstDoorAlignmentWindow: false
});
assert(generated.action.move !== "none", "Kinesis should no longer veto based on health flags");

const clear = zoe.auditAction({
  action: generated.action,
  health: { likelyDead: false, retryRequested: false, zeroScore: 0.1, activeCells: 12 }
});
assert(clear.vetoed === false, "Zoe should pass through healthy actions");
assert(clear.action.move === generated.action.move, "Zoe should preserve healthy action movement");

const vetoed = zoe.auditAction({
  action: generated.action,
  health: { likelyDead: true, retryRequested: true, retryReason: "health-death", zeroScore: 0.9, activeCells: 0 }
});
assert(vetoed.vetoed === true, "Zoe should veto likely-dead actions");
assert(vetoed.action.move === "none", "Zoe should clear movement on veto");
assert(vetoed.action.fire === false, "Zoe should clear fire on veto");
assert(vetoed.reason === "health-death", "Zoe should preserve retry reason");

console.log("DOOM_ZOE_VM_TEST_OK", {
  generated: generated.action.move,
  vetoed: vetoed.vetoed,
  reason: vetoed.reason
});
