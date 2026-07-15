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
assert(sensory?.classifyFaceLifeSignature, "sensory should export classifyFaceLifeSignature");
assert(sensory?.listFaceLifeSampleDictionary, "sensory should export listFaceLifeSampleDictionary");

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
assert(livingBloodFaceHeartbeat.faceLifePhase === "moribund", "bloodied living face should expose a moribund face-life phase without marking death");

const invulnerableFace = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.18,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: "1234432112344321",
  facePoseDiversity: 3,
  faceQuantizedFrameChange: 1.2,
  invulnerable: true
});
assert(invulnerableFace.faceLifePhase === "invulnerable", "god-mode face should be a separate life phase");
assert(invulnerableFace.likelyDead === false, "god-mode face must not mark death");

const templateCriticalFace = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.18,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: "1234432112344321",
  faceQuantizedFrameChange: 1.2,
  facePoseDiversity: 3,
  faceLifeTemplateLevel: 2,
  faceTemplateConfidence: 0.82
});
assert(templateCriticalFace.faceLifeTemplateAuthoritative === true, "known face template should become authoritative above confidence threshold");
assert(templateCriticalFace.faceLifePhase === "critical", "known level-2 face template should map to critical");
assert(templateCriticalFace.faceLifeLevel === 2, "known level-2 face template should preserve level 2");
assert(templateCriticalFace.health === 30, "authoritative face template should override stale numeric HP with phase percent");
assert(templateCriticalFace.healthDangerReason === "face-template-critical", "authoritative critical face should become Zoe danger evidence");
assert(templateCriticalFace.likelyDead === false, "critical face template with heartbeat should remain alive");

const weakTemplateFace = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.18,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: "1234432112344321",
  faceQuantizedFrameChange: 1.2,
  facePoseDiversity: 3,
  faceLifeQuantizedLevel: 1,
  faceTemplateConfidence: 0.2
});
assert(weakTemplateFace.faceLifeTemplateAuthoritative === false, "weak known face template should not override numeric HP");
assert(weakTemplateFace.health === 100, "weak known face template should leave numeric HP intact");
assert(weakTemplateFace.likelyDead === false, "weak known face template should not request death recovery");

const quantizedMoribundFace = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.18,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: "0000000000000000",
  faceQuantizedFrameChange: 255,
  faceNoHeartbeatFrames: 12,
  facePoseDiversity: 0,
  faceLifeQuantizedLevel: 1,
  faceTemplateConfidence: 0.78
});
assert(quantizedMoribundFace.faceLifeTemplateSource === "quantized-level", "low face quantization should remain traceable as quantized evidence");
assert(quantizedMoribundFace.faceLifePhase === "moribund", "strong low face quantization should override stale numeric HP as moribund");
assert(quantizedMoribundFace.health === 12, "strong low face quantization should map to moribund health percent");
assert(quantizedMoribundFace.lowHealth === true, "strong low face quantization should become Zoe low-health evidence");
assert(quantizedMoribundFace.likelyDead === false, "strong low face quantization alone should not request death recovery");

const livingHealthyFaceWithNoisyLowQuantization = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.18,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: "1234432112344321",
  faceQuantizedFrameChange: 1.2,
  facePoseDiversity: 3,
  faceBloodScore: 0.12,
  faceBloodRatio: 0.06,
  faceLifeQuantizedLevel: 2,
  faceTemplateConfidence: 0.78
});
assert(livingHealthyFaceWithNoisyLowQuantization.faceHeartbeatAlive === true, "changing healthy face should retain heartbeat evidence");
assert(livingHealthyFaceWithNoisyLowQuantization.faceLifeTemplateAuthoritative === false, "low quantization should not override a living healthy heartbeat without blood evidence");
assert(livingHealthyFaceWithNoisyLowQuantization.health === 100, "noisy low quantization should leave healthy numeric state intact");
assert(livingHealthyFaceWithNoisyLowQuantization.lowHealth === false, "noisy low quantization should not trigger Zoe low-health state");

const templateDeathFace = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.18,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  deathTintScore: 0.18,
  faceDeathTintScore: 0.18,
  faceSignature: "1234432112344321",
  faceQuantizedFrameChange: 0.04,
  faceNoHeartbeatFrames: 96,
  faceLifeQuantizedLevel: 0,
  faceTemplateConfidence: 0.88
});
assert(templateDeathFace.likelyDead === true, "known dead-face template should mark death even when stale HP digits read 100");
assert(templateDeathFace.retryRequested === true, "known dead-face template should request retry");
assert(templateDeathFace.retryReason === "health-face-template-death", "known dead-face template should expose a specific retry reason");
assert(templateDeathFace.health === 0, "known dead-face template should collapse stale numeric HP to zero");

const templateInvulnerableFace = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.18,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: "1234432112344321",
  faceQuantizedFrameChange: 1.2,
  facePoseDiversity: 3,
  faceLifeQuantizedPhase: "invulnerable",
  faceTemplateConfidence: 0.72
});
assert(templateInvulnerableFace.faceLifePhase === "invulnerable", "explicit invulnerable face template should map to invulnerable");
assert(templateInvulnerableFace.health === 100, "explicit invulnerable face template should remain full health");
assert(templateInvulnerableFace.likelyDead === false, "explicit invulnerable face template must not mark death");

const canonicalFaceTemplatePhases = [
  { level: 5, phase: "healthy", health: 100 },
  { level: 4, phase: "wounded", health: 80 },
  { level: 3, phase: "damaged", health: 55 },
  { level: 2, phase: "critical", health: 30 },
  { level: 1, phase: "moribund", health: 12 },
  { level: 0, phase: "dead", health: 0 },
  { level: "∞", phase: "invulnerable", health: 100 }
];
canonicalFaceTemplatePhases.forEach(face => {
  const snapshot = sensory.createHealthSensorSnapshot({
    active: true,
    zeroScore: face.phase === "dead" ? 0.5 : 0.18,
    activeCells: 80,
    activeColumns: 16,
    sampleCells: 80,
    sampleColumns: 16,
    estimatedPercent: 100,
    value: 100,
    health: 100,
    faceSignature: "1234432112344321",
    faceQuantizedFrameChange: face.phase === "dead" ? 0.04 : 1.2,
    facePoseDiversity: face.phase === "dead" ? 1 : 3,
    faceNoHeartbeatFrames: face.phase === "dead" ? 96 : 0,
    faceLifeTemplateLevel: face.level,
    faceTemplateConfidence: 0.84
  });
  assert(snapshot.faceLifeTemplateAuthoritative === true, `canonical face template ${face.phase} should be authoritative`);
  assert(snapshot.faceLifePhase === face.phase, `canonical face template level ${face.level} should map to ${face.phase} (actual=${snapshot.faceLifePhase})`);
  assert(snapshot.health === face.health, `canonical face template ${face.phase} should map to health ${face.health} (actual=${snapshot.health})`);
});

const faceSampleDictionary = sensory.listFaceLifeSampleDictionary();
assert(faceSampleDictionary.length >= 42, "sample-derived face dictionary should include every documented face sprite slot");
const samplePhases = new Set(faceSampleDictionary.map(sample => sample.phase));
["healthy", "wounded", "damaged", "critical", "moribund", "dead", "invulnerable"].forEach(phase => {
  assert(samplePhases.has(phase), `sample-derived face dictionary should cover ${phase}`);
});
const sampleIds = new Set(faceSampleDictionary.map(sample => sample.id));
assert(sampleIds.size === faceSampleDictionary.length, "sample-derived face dictionary should not contain duplicate ids");
const duplicateSignatureGroups = new Map();
faceSampleDictionary.forEach(sample => {
  const list = duplicateSignatureGroups.get(sample.signature) || [];
  list.push(sample);
  duplicateSignatureGroups.set(sample.signature, list);
});
const ambiguousGroups = [...duplicateSignatureGroups.values()].filter(group => new Set(group.map(sample => sample.phase)).size > 1);
assert(ambiguousGroups.length >= 1, "sample dictionary should expose known 4x4 quantization ambiguities");
faceSampleDictionary.forEach(sample => {
  const classified = sensory.classifyFaceLifeSignature(sample.signature);
  assert(classified.authoritative === true, `sample ${sample.id} should classify authoritatively`);
  assert(classified.candidates.includes(sample.id), `sample ${sample.id} should remain visible in classifier candidates`);
  if (classified.phase !== sample.phase) {
    assert(classified.ambiguous === true, `sample ${sample.id} may differ only when its signature is ambiguous`);
    assert(classified.level <= sample.level, `ambiguous sample ${sample.id} should resolve conservatively toward lower life`);
  }
});

const sampleCritical = faceSampleDictionary.find(sample => sample.id === "front-hit-2");
const criticalWithZeroFeatureDefaults = sensory.classifyFaceLifeSignature(sampleCritical.signature, {
  faceRedScore: 0,
  faceBloodRatio: 0,
  faceEyeWhiteScore: 0,
  faceEyeYellowScore: 0,
  faceEyeRedScore: 0,
  faceEdgeScore: 0,
  faceLumaScore: 0
});
assert(criticalWithZeroFeatureDefaults.authoritative === true, "zero-valued absent feature defaults must not suppress exact face dictionary matches");
assert(criticalWithZeroFeatureDefaults.phase === "critical", "zero-valued absent feature defaults should preserve exact critical face classification");
const criticalByDictionary = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.18,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: sampleCritical.signature,
  faceQuantizedFrameChange: 1.2,
  facePoseDiversity: 3
});
assert(criticalByDictionary.faceLifeTemplateSource === "sample-dictionary", "sample critical face should come from the face dictionary");
assert(criticalByDictionary.faceLifePhase === "critical", "sample critical face should override stale HP digits");
assert(criticalByDictionary.health === 30, "sample critical face should map to canonical critical percent");

const sampleDead = faceSampleDictionary.find(sample => sample.phase === "dead");
const deadByDictionary = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.18,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: sampleDead.signature,
  faceQuantizedFrameChange: 0.04,
  facePoseDiversity: 1,
  faceNoHeartbeatFrames: 96
});
assert(deadByDictionary.faceLifeTemplateSource === "sample-dictionary", "sample dead face should come from the face dictionary");
assert(deadByDictionary.faceLifePhase === "dead", "sample dead face should map to the dead phase");
assert(deadByDictionary.likelyDead === true, "sample dead face should mark stale HP digits as death");
assert(deadByDictionary.retryReason === "health-face-template-death", "sample dead face should request template death recovery");

const noisyDeadByDictionary = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.18,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: sampleDead.signature,
  faceQuantizedFrameChange: 1.2,
  facePoseDiversity: 1,
  faceNoHeartbeatFrames: 96
});
assert(noisyDeadByDictionary.faceLifePhase === "dead", "sample dead face should remain dead when GPU sampling adds slight frame noise");
assert(noisyDeadByDictionary.faceHeartbeatAlive === false, "sample dead face noise must not synthesize a living heartbeat");
assert(noisyDeadByDictionary.retryRequested === true, "sample dead face with sampling noise should still request retry");

const sampleInvulnerable = faceSampleDictionary.find(sample => sample.phase === "invulnerable");
const invulnerableByDictionary = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.18,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: sampleInvulnerable.signature,
  faceQuantizedFrameChange: 1.2,
  facePoseDiversity: 3
});
assert(invulnerableByDictionary.faceLifeTemplateSource === "sample-dictionary", "sample invulnerable face should come from the face dictionary");
assert(invulnerableByDictionary.faceLifePhase === "invulnerable", "sample invulnerable face should remain a separate phase");
assert(invulnerableByDictionary.health === 100, "sample invulnerable face should keep full health");
assert(invulnerableByDictionary.likelyDead === false, "sample invulnerable face should never request death recovery");

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

const liveOpeningFaceTint = sensory.createHealthSensorSnapshot({
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
  statusDeathTintScore: 0.22,
  faceDeathTintScore: 0.49,
  faceBloodScore: 0.66,
  faceBloodRatio: 0.46,
  faceEyeWhiteScore: 0.2,
  faceEyeYellowScore: 0.46,
  faceEyeRedScore: 0.77,
  faceEdgeScore: 0.53,
  faceLumaScore: 0.31,
  faceSignature: "0440043003d00440",
  faceQuantizedFrameChange: 1.2
});
assert(liveOpeningFaceTint.likelyDead === false, "live opening Doomguy face tint must not mark death");
assert(liveOpeningFaceTint.lowHealth === false, "live opening Doomguy face tint must not become low-health evidence by itself");
assert(liveOpeningFaceTint.health === 100, "live opening Doomguy face tint must not lower health from stale numeric 100");
assert(liveOpeningFaceTint.faceLifePhase === "healthy", "unmatched live face tint at full HP should stay healthy instead of falling back to critical blood-band");

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

const fixedFaceDeath = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.38,
  activeCells: 22,
  activeColumns: 8,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  deathTintScore: 0.18,
  statusDeathTintScore: 0.12,
  faceDeathTintScore: 0.08,
  faceBloodScore: 0.05,
  faceBloodRatio: 0.02,
  faceSignature: "1234432112344321",
  facePoseDiversity: 1,
  faceFixedFrames: 96,
  faceNoHeartbeatFrames: 54,
  fixedFaceDeathFrames: 90,
  freezeScore: 0.5,
  faceQuantizedFrameChange: 0.04
});
assert(fixedFaceDeath.likelyDead === true, "fixed valid face with no heartbeat should mark death even when HP digits remain stale");
assert(fixedFaceDeath.retryRequested === true, "fixed valid face death should request retry");
assert(fixedFaceDeath.retryReason === "health-fixed-face-death", "fixed valid face death should expose a specific retry reason");
assert(fixedFaceDeath.health === 0, "fixed valid face death should collapse stale HP digits to zero");

const fixedFaceDeathWithStaleHealthyDigits = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.18,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  deathTintScore: 0.06,
  statusDeathTintScore: 0.04,
  faceDeathTintScore: 0.02,
  faceBloodScore: 0.04,
  faceBloodRatio: 0.02,
  faceSignature: "1234432112344321",
  facePoseDiversity: 1,
  faceFixedFrames: 128,
  faceNoHeartbeatFrames: 120,
  fixedFaceDeathFrames: 72,
  noHeartbeatDeathFrames: 90,
  freezeScore: 0.5,
  faceQuantizedFrameChange: 0.04
});
assert(fixedFaceDeathWithStaleHealthyDigits.likelyDead === true, "long fixed face heartbeat loss should override stale 100 HP digits");
assert(fixedFaceDeathWithStaleHealthyDigits.retryRequested === true, "long fixed face heartbeat loss should request retry");
assert(fixedFaceDeathWithStaleHealthyDigits.retryReason === "health-fixed-face-death", "long fixed face heartbeat loss should use fixed-face retry semantics");
assert(fixedFaceDeathWithStaleHealthyDigits.health === 0, "long fixed face heartbeat loss should collapse stale healthy digits to zero");

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

const moribundTemplateNoHeartbeat = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.38,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  deathTintScore: 0.16,
  statusDeathTintScore: 0.14,
  faceDeathTintScore: 0.18,
  faceBloodScore: 0.22,
  faceBloodRatio: 0.14,
  faceSignature: "0000000000000000",
  faceQuantizedFrameChange: 255,
  facePoseDiversity: 0,
  faceLifeQuantizedLevel: 1,
  faceTemplateConfidence: 0.78,
  freezeScore: 0.5,
  faceNoHeartbeatFrames: 54,
  noHeartbeatDeathFrames: 90
});
assert(moribundTemplateNoHeartbeat.faceLifeQuantizedPhase === "moribund", "quantized moribund face phase should be preserved for telemetry");
assert(moribundTemplateNoHeartbeat.faceHeartbeatAlive === false, "all-zero face sample should not create a heartbeat");
assert(moribundTemplateNoHeartbeat.faceHeartbeatOpacity < 0.5, "missing heartbeat should decay the face vital badge");
assert(moribundTemplateNoHeartbeat.likelyDead === true, "moribund face template plus sustained no-heartbeat should override stale 100 HP");
assert(moribundTemplateNoHeartbeat.retryReason === "health-no-heartbeat-death", "moribund no-heartbeat death should use retry watchdog semantics");

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

const missingFaceEvidence = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.2,
  activeCells: 71,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: "0000000000000000",
  faceQuantizedFrameChange: 255,
  facePoseDiversity: 0,
  faceBloodScore: 0,
  faceBloodRatio: 0,
  faceDeathTintScore: 0
});
assert(missingFaceEvidence.faceSignatureValid === false, "missing face evidence should keep all-zero signature invalid");
assert(missingFaceEvidence.faceLifePhase === "unknown", "missing face evidence must not inherit stale numeric HP as healthy face life");
assert(missingFaceEvidence.faceLifeLevel === 0, "missing face evidence should keep face life level unknown");
assert(missingFaceEvidence.faceHeartbeatOpacity === 0, "missing face evidence should not render an opaque heartbeat badge");
assert(missingFaceEvidence.health === 100, "missing face evidence should leave numeric HP telemetry available");
assert(missingFaceEvidence.likelyDead === false, "missing face evidence alone should not mark death");

const healthFaceHeartbeatAliases = sensory.createHealthSensorSnapshot({
  active: true,
  healthFaceLifePhase: "damaged",
  healthFaceLifeLevel: 3,
  healthFaceHeartbeatScore: 0.5,
  healthFaceNoHeartbeatFrames: 6,
  faceSignature: "1234567812345678",
  faceQuantizedFrameChange: 4,
  facePoseDiversity: 2
});
assert(healthFaceHeartbeatAliases.healthFaceHeartbeatAlive === healthFaceHeartbeatAliases.faceHeartbeatAlive, "healthFace heartbeat alive alias should mirror canonical heartbeat state");
assert(healthFaceHeartbeatAliases.healthFaceHeartbeatOpacity === healthFaceHeartbeatAliases.faceHeartbeatOpacity, "healthFace heartbeat opacity alias should mirror canonical opacity");
assert(healthFaceHeartbeatAliases.healthFaceNoHeartbeatFrames === healthFaceHeartbeatAliases.faceNoHeartbeatFrames, "healthFace no-heartbeat frames alias should mirror canonical frames");

const missingFaceCpuZeroPercent = sensory.createHealthSensorSnapshot({
  active: true,
  zeroScore: 0.38,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16,
  estimatedPercent: 0,
  value: 0,
  health: 0,
  faceSignature: "0000000000000000",
  faceQuantizedFrameChange: 255,
  facePoseDiversity: 0,
  faceBloodScore: 0,
  faceBloodRatio: 0,
  faceDeathTintScore: 0,
  deathTintScore: 0.14,
  statusDeathTintScore: 0.12
});
assert(missingFaceCpuZeroPercent.faceSignatureValid === false, "CPU fallback all-zero face sample should remain invalid");
assert(missingFaceCpuZeroPercent.faceLifePhase === "unknown", "CPU fallback missing face sample should not synthesize a life phase");
assert(missingFaceCpuZeroPercent.health === 100, "CPU fallback zero percent without face evidence should be treated as unknown/live");
assert(missingFaceCpuZeroPercent.lowHealth === false, "CPU fallback zero percent without face evidence must not trigger low-health Zoe routing");
assert(missingFaceCpuZeroPercent.healthDangerReason === "none", "CPU fallback missing face evidence should not emit low-health danger");

const observedPulseMustRemainLogicallyDead = sensory.refineHealthState({
  active: true,
  faceSignature: "1234567812345678",
  faceLifePhase: "moribund",
  faceLifeLevel: 1,
  faceTemplateConfidence: 0.9,
  faceHeartbeatAlive: false,
  healthFaceHeartbeatAlive: false,
  faceHeartbeatScore: 1,
  faceHeartbeatCurrentPulse: false,
  faceHeartbeatPulseAccepted: true,
  faceHeartbeatPulseKind: "observed",
  faceNoHeartbeatFrames: 48,
  noHeartbeatDeathFrames: 90,
  estimatedPercent: 12,
  value: 12,
  health: 12,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16
}, 0, 0, 0);
assert(observedPulseMustRemainLogicallyDead.faceHeartbeatAlive === false, "refineHealthState must preserve explicit logical heartbeat false");
assert(observedPulseMustRemainLogicallyDead.healthFaceHeartbeatAlive === false, "refineHealthState alias must preserve explicit logical heartbeat false");
assert(observedPulseMustRemainLogicallyDead.faceNoHeartbeatFrames === 48, "observation-only pulse must not reset no-heartbeat history");

const unknownTemporalDeltaMustNotCreateHeartbeat = sensory.refineHealthState({
  active: true,
  hudReady: true,
  faceSignature: "1234567812345678",
  faceLifePhase: "moribund",
  faceLifeLevel: 1,
  faceTemplateConfidence: 0.9,
  faceHeartbeatScore: 1,
  faceNoHeartbeatFrames: 48,
  noHeartbeatDeathFrames: 90,
  estimatedPercent: 12,
  value: 12,
  health: 12,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16
}, 0, 255, 255);
assert(unknownTemporalDeltaMustNotCreateHeartbeat.faceHeartbeatAlive === false, "sentinel face delta must not synthesize a logical heartbeat");
assert(unknownTemporalDeltaMustNotCreateHeartbeat.healthFaceHeartbeatAlive === false, "sentinel face delta must keep the logical heartbeat alias false");
assert(unknownTemporalDeltaMustNotCreateHeartbeat.faceHeartbeatScore === 1, "sentinel regression should preserve score telemetry without promoting it to life evidence");
assert(unknownTemporalDeltaMustNotCreateHeartbeat.faceNoHeartbeatFrames === 48, "sentinel face delta must preserve accumulated no-heartbeat history");

const unknownSnapshotDeltaMustNotCreateHeartbeat = sensory.createHealthSensorSnapshot({
  active: true,
  hudReady: true,
  faceSignature: "1234567812345678",
  faceLifePhase: "moribund",
  faceLifeLevel: 1,
  faceTemplateConfidence: 0.9,
  faceHeartbeatScore: 1,
  faceQuantizedFrameChange: 255,
  faceNoHeartbeatFrames: 48,
  noHeartbeatDeathFrames: 90,
  estimatedPercent: 12,
  activeCells: 80,
  activeColumns: 16,
  sampleCells: 80,
  sampleColumns: 16
});
assert(unknownSnapshotDeltaMustNotCreateHeartbeat.faceHeartbeatAlive === false, "health snapshot must not convert sentinel temporal data into a logical heartbeat");
assert(unknownSnapshotDeltaMustNotCreateHeartbeat.faceNoHeartbeatFrames === 48, "health snapshot sentinel must not reset the no-heartbeat counter");

const dev1054InvalidFaceMustNotBecomeHealthy = sensory.refineHealthState({
  active: true,
  hudReady: true,
  signature: "67677777677777776777777767777777677777776777777767777777677777776777777767777777",
  activeColumns: 0,
  activeCells: 0,
  sampleColumns: 8,
  sampleCells: 24,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: "0440044004400440",
  faceSignatureValid: false,
  faceLifePhase: "healthy",
  healthFaceLifePhase: "healthy",
  faceLifeLevel: 5,
  healthFaceLifeLevel: 5,
  faceLifeTemplatePhase: "unknown",
  faceLifeTemplateLevel: 0,
  faceLifeTemplateAuthoritative: false,
  faceLifeTemplateSource: "none",
  faceLifeQuantizedPhase: "unknown",
  faceLifeQuantizedLevel: 0,
  faceHeartbeatAlive: false,
  healthFaceHeartbeatAlive: false,
  faceNoHeartbeatFrames: 0,
  faceBloodScore: 0.66,
  faceBloodRatio: 0.47,
  faceDeathTintScore: 0.49,
  deathTintScore: 0.49,
  statusDeathTintScore: 0.22
}, 0, 255, 255);
assert(dev1054InvalidFaceMustNotBecomeHealthy.faceSignatureValid === false, "dev1054 explicit invalid face signature must remain invalid");
assert(dev1054InvalidFaceMustNotBecomeHealthy.faceLifeTemplateAuthoritative === false, "dev1054 unknown face template must remain non-authoritative");
assert(dev1054InvalidFaceMustNotBecomeHealthy.faceLifePhase === "unknown", "dev1054 invalid non-heartbeat face must not synthesize healthy from blood/tint diagnostics");
assert(dev1054InvalidFaceMustNotBecomeHealthy.faceLifeLevel === 0, "dev1054 invalid non-heartbeat face must not overwrite unknown level 0 with level 5");
assert(dev1054InvalidFaceMustNotBecomeHealthy.health === 100, "visual face correction must leave numeric ROI telemetry available for native projection");

const supportedLevelOneMustOutrankStaleLevelFive = sensory.refineHealthState({
  active: true,
  hudReady: true,
  activeColumns: 16,
  activeCells: 80,
  sampleColumns: 16,
  sampleCells: 80,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: "0440044004400440",
  faceSignatureValid: false,
  faceLifePhase: "healthy",
  healthFaceLifePhase: "healthy",
  faceLifeLevel: 5,
  healthFaceLifeLevel: 5,
  faceLifeTemplatePhase: "unknown",
  faceLifeTemplateLevel: 0,
  faceLifeQuantizedPhase: "moribund",
  faceLifeQuantizedLevel: 1,
  faceTemplateConfidence: 0.86,
  faceHeartbeatAlive: false,
  healthFaceHeartbeatAlive: false,
  faceNoHeartbeatFrames: 12
}, 0, 255, 255);
assert(supportedLevelOneMustOutrankStaleLevelFive.faceLifeTemplateSource === "quantized-phase", "supported low quantization must remain traceable");
assert(supportedLevelOneMustOutrankStaleLevelFive.faceLifeTemplateAuthoritative === true, "supported level-1 quantization must be authoritative");
assert(supportedLevelOneMustOutrankStaleLevelFive.faceLifePhase === "moribund", "supported level 1 must outrank stale temporal healthy");
assert(supportedLevelOneMustOutrankStaleLevelFive.faceLifeLevel === 1, "supported level 1 must not be overwritten by stale level 5");
assert(supportedLevelOneMustOutrankStaleLevelFive.health === 12, "supported moribund authority must project its bounded face fallback health");

const evidenceFreeExplicitInvulnerability = sensory.refineHealthState({
  active: true,
  hudReady: true,
  estimatedPercent: 100,
  value: 100,
  health: 100,
  faceSignature: "0440044004400440",
  faceSignatureValid: false,
  faceLifePhase: "healthy",
  faceLifeLevel: 5,
  faceHeartbeatAlive: false,
  healthFaceHeartbeatAlive: false,
  invulnerable: true
}, 0, 255, 255);
assert(evidenceFreeExplicitInvulnerability.faceLifePhase === "invulnerable", "explicit invulnerability must remain the evidence-free level-5 override");
assert(evidenceFreeExplicitInvulnerability.faceLifeLevel === 5, "explicit invulnerability must preserve level 5");
assert(evidenceFreeExplicitInvulnerability.faceLifeTemplateSource === "invulnerable-hint", "explicit invulnerability must retain its provenance");

console.log("DOOM_SENSORY_HEALTH_VM_TEST_OK", {
  reason: tintSnapshot.retryReason,
  tint: tintSnapshot.deathTintScore,
  weak: weakTint.likelyDead,
  low: sparseModernSample.health,
  faceBlood: faceBloodDeath.retryReason,
  noHeartbeat: noHeartbeatDeath.retryReason
});
