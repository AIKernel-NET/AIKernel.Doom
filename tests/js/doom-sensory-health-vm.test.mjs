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

const sparseModernSample = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.56,
  activeCells: 18,
  activeColumns: 6,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 38,
  value: 38,
  health: 38,
  deathTintScore: 0.08,
  statusDeathTintScore: 0.04,
  faceDeathTintScore: 0.02
});
assert(sparseModernSample.sampleColumns === 16, "modern health samples should preserve the 16-column sampler width");
assert(sparseModernSample.lowHealth === true, "compact low-health samples should remain available to Zoe as low health");
assert(sparseModernSample.likelyDead === false, "compact low-health samples should not be treated as death without tint or face evidence");

const faceBloodDeath = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.38,
  activeCells: 24,
  activeColumns: 8,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  deathTintScore: 0.57,
  statusDeathTintScore: 0.68,
  faceDeathTintScore: 0.58,
  faceBloodScore: 0.79,
  faceBloodRatio: 0.55,
  freezeScore: 0.7,
  faceNoHeartbeatFrames: 18,
  faceQuantizedFrameChange: 0.05
});
assert(faceBloodDeath.likelyDead === true, "blood-covered face should override healthy digit samples and mark likely death");
assert(faceBloodDeath.retryRequested === true, "blood-covered face death should request retry");
assert(faceBloodDeath.retryReason === "health-face-blood-death", "blood-covered face death should expose a specific retry reason");
assert(faceBloodDeath.health === 0, "blood-covered face death should collapse health to zero");

const transientBloodFace = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.38,
  activeCells: 24,
  activeColumns: 8,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  deathTintScore: 0.57,
  statusDeathTintScore: 0.68,
  faceDeathTintScore: 0.58,
  faceBloodScore: 0.79,
  faceBloodRatio: 0.55,
  freezeScore: 0.7,
  faceNoHeartbeatFrames: 3,
  faceQuantizedFrameChange: 0.05
});
assert(transientBloodFace.likelyDead === false, "short blood-face evidence at healthy HP should not immediately mark death");
assert(transientBloodFace.retryRequested === false, "short blood-face evidence should not request retry before no-heartbeat confirmation");

const livingBloodFaceHeartbeat = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.38,
  activeCells: 28,
  activeColumns: 8,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 28,
  value: 28,
  health: 28,
  deathTintScore: 0.57,
  statusDeathTintScore: 0.68,
  faceDeathTintScore: 0.58,
  faceBloodScore: 0.79,
  faceBloodRatio: 0.55,
  freezeScore: 0.7,
  faceSignature: "1234432112344321",
  faceQuantizedFrameChange: 1.2
});
assert(livingBloodFaceHeartbeat.faceHeartbeatAlive === true, "changing face direction should be treated as a living face heartbeat");
assert(livingBloodFaceHeartbeat.likelyDead === false, "bloodied living face heartbeat should not mark death");
assert(livingBloodFaceHeartbeat.retryRequested === false, "bloodied living face heartbeat should not request retry");
assert(livingBloodFaceHeartbeat.lowHealth === true, "bloodied living face should remain low-health evidence");
assert(livingBloodFaceHeartbeat.criticalBloodAlive === true, "bloodied living face heartbeat should become Zoe danger evidence");
assert(livingBloodFaceHeartbeat.healthDangerReason === "face-heartbeat-blood", "bloodied living face heartbeat should expose a Zoe danger reason");

const highDamageFaceHeartbeat = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.38,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  deathTintScore: 0.50,
  statusDeathTintScore: 0.52,
  faceDeathTintScore: 0.58,
  faceBloodScore: 0.79,
  faceBloodRatio: 0.55,
  faceSignature: "1234432112344321",
  facePoseDiversity: 3,
  faceQuantizedFrameChange: 18
});
assert(highDamageFaceHeartbeat.likelyDead === false, "heavy blood with a cycling face must remain alive evidence, not death");
assert(highDamageFaceHeartbeat.retryRequested === false, "heavy blood with a cycling face must not request retry");
assert(highDamageFaceHeartbeat.faceHeartbeatAlive === true, "large damaged-face motion should remain a heartbeat");
assert(highDamageFaceHeartbeat.faceLifePattern === "alive-damaged", "high blood plus heartbeat should expose alive-damaged face state");
assert(highDamageFaceHeartbeat.criticalBloodAlive === true, "alive-damaged face should become survival danger evidence even when HP digits still read 100");

const normalFaceBloodTint = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.38,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  deathTintScore: 0.49,
  statusDeathTintScore: 0.68,
  faceDeathTintScore: 0.49,
  faceBloodScore: 0.65,
  faceBloodRatio: 0.22,
  faceSignature: "1234432112344321",
  faceQuantizedFrameChange: 1.2
});
assert(normalFaceBloodTint.likelyDead === false, "ordinary Doom face tint must not mark death without broad blood coverage");
assert(normalFaceBloodTint.health === 100, "ordinary Doom face tint must not lower numeric health by itself");

const noHeartbeatDeath = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.44,
  activeCells: 22,
  activeColumns: 8,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  deathTintScore: 0.38,
  statusDeathTintScore: 0.18,
  faceDeathTintScore: 0.24,
  faceBloodScore: 0.06,
  faceBloodRatio: 0.02,
  freezeScore: 0.5,
  faceQuantizedFrameChange: 0.04,
  faceNoHeartbeatFrames: 120,
  noHeartbeatDeathFrames: 90
});
assert(noHeartbeatDeath.likelyDead === true, "long face heartbeat loss with death-face evidence should mark death even without blood");
assert(noHeartbeatDeath.retryRequested === true, "long face heartbeat loss death should request retry");
assert(noHeartbeatDeath.retryReason === "health-no-heartbeat-death", "long face heartbeat loss death should expose a specific retry reason");

const invalidFaceSignatureDeath = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.38,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  deathTintScore: 0.52,
  statusDeathTintScore: 0.68,
  faceDeathTintScore: 0.49,
  faceSignature: "0000000000000000",
  faceQuantizedFrameChange: 255,
  freezeScore: 0.5,
  faceNoHeartbeatFrames: 120,
  noHeartbeatDeathFrames: 90
});
assert(invalidFaceSignatureDeath.faceSignatureValid === false, "all-zero face signature should be treated as invalid");
assert(invalidFaceSignatureDeath.faceHeartbeatAlive === false, "invalid face signature must not synthesize a heartbeat from max frame delta");
assert(invalidFaceSignatureDeath.likelyDead === true, "invalid face signature plus sustained death tint should mark death");
assert(invalidFaceSignatureDeath.retryReason === "health-no-heartbeat-death", "invalid face signature death should use no-heartbeat retry");

const shortNoHeartbeat = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.44,
  activeCells: 22,
  activeColumns: 8,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  deathTintScore: 0.38,
  statusDeathTintScore: 0.18,
  faceDeathTintScore: 0.24,
  freezeScore: 0.5,
  faceQuantizedFrameChange: 0.04,
  faceNoHeartbeatFrames: 12,
  noHeartbeatDeathFrames: 90
});
assert(shortNoHeartbeat.likelyDead === false, "short face heartbeat loss should not mark death");
assert(shortNoHeartbeat.retryRequested === false, "short face heartbeat loss should not request retry");

console.log("DOOM_SENSORY_HEALTH_VM_TEST_OK", {
  reason: tintSnapshot.retryReason,
  tint: tintSnapshot.deathTintScore,
  weak: weakTint.likelyDead,
  low: sparseModernSample.health,
  faceBlood: faceBloodDeath.retryReason,
  noHeartbeat: noHeartbeatDeath.retryReason
});
