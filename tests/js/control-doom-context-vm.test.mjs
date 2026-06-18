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
  faceSig: -0.2
});

assert(controlContext.context === "open-space", "context dictionary should normalize to lower-case");
assert(controlContext.depthSig === 1.5, "depth signal should be clamped");
assert(controlContext.values.health === 88, "health should be exposed as a DSL value");
assert(controlContext.values.qDelta === 20, "qDelta fallback should derive from wall vector");
assert(controlContext.values.openCruiseYaw === -7, "open cruise yaw should turn away from right wall pressure");
assert(controlContext.values.doorProbeYaw === 8, "door probe yaw should use soft aim when qDelta exceeds tolerance");

console.log("CONTROL_DOOM_CONTEXT_VM_TEST_OK", {
  wall: Number(wall.toFixed(2)),
  qDelta: controlContext.values.qDelta,
  context: controlContext.context
});
