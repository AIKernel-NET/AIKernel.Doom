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
  Array
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/expression-dsl.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/route-planner.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/doom-context.js");

const adapter = context.self.AIKernelDoomControlContext;
assert(adapter?.createContext, "Doom control context adapter should export createContext");
assert(adapter?.wallVector, "Doom control context adapter should export wallVector");

const wall = adapter.wallVector({
  screen6Regions: [0.1, 0.1, 0.1, 0.3, 0.3, 0.3]
});
assert(Math.abs(wall - 0.66) < 0.0001, "screen region fallback should create a bounded wall vector");

const controlContext = adapter.createContext({
  parameters: {
    doorAimToleranceDegrees: 10,
    doorSoftAimToleranceDegrees: 24,
    doorAimYawDegrees: 8,
    openCruiseWallVectorDeadZone: 0.08,
    openCruiseYawDegrees: 7,
    emergencyEscapeYawDegrees: 34
  }
}, {
  health: 88,
  contextDict: "Open-Space",
  screen6Regions: [0.1, 0.1, 0.1, 0.3, 0.3, 0.3],
  depthSig: 2,
  faceSig: -0.2,
  motionForwardProgress: 0.05,
  footObstacleScore: 0.6,
  motionObstacleScore: 0.6,
  spawnCorridorGapScore: 0.18,
  spawnLandmarkRouteEvidence: 0.2,
  actionRepeatFrames: 24,
  moveRepeatFrames: 20,
  turnRepeatFrames: 13
});

assert(controlContext.context === "open-space", "context dictionary should normalize to lower-case");
assert(controlContext.depthSig === 1.5, "depth signal should be clamped");
assert(controlContext.values.health === 88, "health should be exposed as a DSL value");
assert(controlContext.values.qDelta === 20, "qDelta fallback should derive from wall vector");
assert(controlContext.values.openCruiseYaw === -5, "open cruise yaw should use route planner yaw reacquisition");
assert(controlContext.values.routeFallbackYaw === -5, "route fallback yaw should prefer route planner yaw reacquisition");
assert(controlContext.values.doorProbeYaw === 8, "door probe yaw should use soft aim when qDelta exceeds tolerance");
assert(controlContext.values.currentRoute === "open-space-low-gap-scan", "route planner should expose a stable current route");
assert(controlContext.values.routeMode === "spawn-approach", "route mode should default to spawn approach before FirstDoor evidence");
assert(controlContext.values.recommendedYaw === -5, "route planner should expose recommended yaw");
assert(controlContext.values.actionRepeatFrames === 24, "Kinesis action repeat frames should be exposed as a DSL value");
assert(controlContext.values.moveRepeatFrames === 20, "Kinesis movement repeat frames should be exposed as a DSL value");
assert(controlContext.values.turnRepeatFrames === 13, "Kinesis turn repeat frames should be exposed as a DSL value");
assert(controlContext.values.routeLoopKind === "turn-stall", "Turn-only low-gap repetition should consume turn-stall budget");
assert(controlContext.values.routeLoopBudgetExceeded === true, "Exceeded route loop budget should be exposed as a DSL value");
assert(controlContext.values.routeAbortHint === "turn-stall", "Route loop exhaustion should expose the loop kind as abort hint");

const doorApproachContext = adapter.createContext({}, {
  firstDoorVision9x9Score: 0.4,
  firstDoorUse3x3Score: 0.1,
  doorOpenedCount: 0
});
assert(doorApproachContext.values.routeMode === "door-approach", "FirstDoor visual evidence should switch route mode to door approach");

const postDoorContext = adapter.createContext({}, {
  firstDoorVision9x9Score: 0.4,
  doorOpenedCount: 1
});
assert(postDoorContext.values.routeMode === "post-door", "Opened door milestone should switch route mode to post-door");

const stickyDoorApproachContext = adapter.createContext({}, {
  previousRouteMode: "door-approach",
  firstDoorVision9x9Score: 0.1,
  firstDoorUse3x3Score: 0.0,
  spawnCorridorGapScore: 0.18,
  spawnLandmarkRouteEvidence: 0.41,
  doorOpenedCount: 0
});
assert(stickyDoorApproachContext.values.routeMode === "door-approach", "Door approach mode should remain sticky while route landmark evidence remains visible");

console.log("CONTROL_DOOM_CONTEXT_VM_TEST_OK", {
  wall: Number(wall.toFixed(2)),
  qDelta: controlContext.values.qDelta,
  context: controlContext.context,
  routeMode: controlContext.values.routeMode
});
