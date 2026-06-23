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
  Array,
  Set
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/cognition/sensory.js");

const sensory = context.self.AIKernelDoomSensory;
assert(sensory?.createHealthSensorSnapshot, "sensory should export createHealthSensorSnapshot");
assert(sensory?.refineHealthState, "sensory should export refineHealthState");

const tintSnapshot = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.26,
  activeCells: 0,
  activeColumns: 0,
  estimatedPercent: 100,
  deathTintScore: 0.64,
  statusDeathTintScore: 0.43,
  faceDeathTintScore: 0.02
});
assert(tintSnapshot.likelyDead === true, "red death tint should mark health as likely dead");
assert(tintSnapshot.retryRequested === true, "red death tint should request retry");
assert(tintSnapshot.retryReason === "health-red-tint-death", "red death tint should expose retry reason");
assert(tintSnapshot.estimatedPercent === 0, "red death tint should collapse health percent to zero");

const refined = sensory.refineHealthState({
  likelyDead: false,
  zeroScore: 0.26,
  activeCells: 0,
  activeColumns: 0,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  deathTintScore: 0.64,
  statusDeathTintScore: 0.43,
  faceDeathTintScore: 0.02,
  retryReason: "none"
}, 0, 255, 255);
assert(refined.likelyDead === true, "refined red death tint should mark health as likely dead");
assert(refined.retryReason === "health-red-tint-death", "refined red death tint should preserve retry reason");
assert(refined.estimatedPercent === 0, "refined red death tint should collapse health percent to zero");

const weakTint = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.26,
  activeCells: 0,
  activeColumns: 0,
  estimatedPercent: 100,
  deathTintScore: 0.38,
  statusDeathTintScore: 0.22
});
assert(weakTint.likelyDead === false, "weak red tint should not mark likely dead");
assert(weakTint.retryRequested === false, "weak red tint should not request retry");

console.log("DOOM_SENSORY_HEALTH_VM_TEST_OK", {
  reason: tintSnapshot.retryReason,
  tint: tintSnapshot.deathTintScore,
  weak: weakTint.likelyDead
});
