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
  Object,
  String
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/cognition/topos.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/cognition/ctg.js");

const topos = context.self.AIKernelDoomTopos;
const ctg = context.self.AIKernelDoomCtg;
assert(topos?.resolvePathosVector, "Topos module should export resolvePathosVector");
assert(topos?.resolveEthosVector, "Topos module should export resolveEthosVector");
assert(ctg?.composeObservedSignals, "CTG module should export composeObservedSignals");

const guardedPathos = topos.resolvePathosVector({
  preDoorDemoRouteGraceActive: true,
  motionStallScore: 0.7,
  stuckFrames: 7,
  quantizedStallFrames: 5,
  depthEstimate: 0.62,
  projectileRaw: 0,
  enemy: 0,
  dynamicRaw: 0
});
assert(guardedPathos.move === "none", "Pre-door route grace should not turn weak stall into a back vector");
assert(guardedPathos.y === 0, "Pre-door route grace should keep Pathos neutral while route is viable");

const unguardedPathos = topos.resolvePathosVector({
  motionStallScore: 0.7,
  stuckFrames: 7,
  quantizedStallFrames: 5,
  depthEstimate: 0.62,
  projectileRaw: 0,
  enemy: 0,
  dynamicRaw: 0
});
assert(unguardedPathos.move === "back", "Without route grace, confirmed stall should still repel");

const ethos = topos.resolveEthosVector({
  objective: "follow-demo-route-to-first-door",
  preDoorDemoRouteGraceActive: true,
  spawnCorridorGapTurn: "right",
  stableFrames: 18
});
assert(ethos.move === "forward", "Pre-door route Ethos should keep forward pressure");
assert(ethos.turn === "right", "Pre-door route Ethos should preserve gap direction");

const observed = ctg.composeObservedSignals({
  preDoorDemoRouteGraceActive: true,
  firstDoorClosed: true,
  firstDoorUseAttempted: false,
  stuckRaw: 0.9,
  stuckConfirmed: true,
  depthEstimate: 0.62,
  projectileRaw: 0,
  enemy: 0,
  dynamicObjectRaw: 0
});
assert(observed.stuck <= 0.36, "CTG observed stuck should be capped while pre-door route remains viable");
assert(observed.danger === 0, "Pre-door route cap should not invent danger");

console.log("DOOM_TOPOS_VM_TEST_OK", {
  guarded: guardedPathos,
  unguarded: unguardedPathos,
  ethos,
  stuck: observed.stuck
});
