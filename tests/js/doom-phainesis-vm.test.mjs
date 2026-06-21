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
  Object,
  Boolean,
  Array
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/cognition/phainesis.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/cognition/nous.js");

const phainesis = context.self.AIKernelDoomPhainesis;
const nous = context.self.AIKernelDoomNous;
assert(phainesis?.createPhainomenon, "Phainesis should export createPhainomenon");
assert(phainesis?.evaluatePhainomenon, "Phainesis should export evaluatePhainomenon");
assert(phainesis?.activePhainesisEvents, "Phainesis should export activePhainesisEvents");

const phainomenon = phainesis.createPhainomenon({
  looming: { active: true, direction: "front" },
  damageLocalization: { active: true, direction: "left" },
  trap: { active: true, kind: "narrow-audio-burst" },
  stuck: { active: true, evidence: "input-stall" },
  explorationEntropy: { high: true },
  itemBacktrack: { suggested: true, targetKind: "resource" },
  sensorRecovery: { needed: true, reason: "movement-stall" }
});

const events = phainesis.activePhainesisEvents({
  phainomenon,
  healthRetry: true,
  visualEventDetected: true,
  audioEventDetected: true,
  movementEventDetected: true,
  movementEventType: "movement-stall",
  spatialEventDetected: true
});
assert(events.join("|") === "health-retry|visual-attention|audio-event|movement-stall|spatial-event|looming|damage-localization|trap|stuck|exploration-entropy|item-backtrack|sensor-recovery", "Phainesis events should remain deterministic");

const graceEvents = phainesis.activePhainesisEvents({
  phainomenon,
  doorTransitionGraceActive: true,
  movementEventDetected: true,
  movementEventType: "movement-stall"
});
assert(!graceEvents.includes("movement-stall"), "door transition grace should suppress movement-stall projection");
assert(!graceEvents.includes("stuck"), "door transition grace should suppress stuck projection");
assert(!graceEvents.includes("sensor-recovery"), "door transition grace should suppress sensor recovery projection");
assert(graceEvents.includes("looming"), "door transition grace should not suppress independent Phainesis events");

const compat = nous.createNousDetectorResult({ stuck: { active: true } });
assert(compat.stuck.active === true, "Nous compatibility factory should delegate to Phainesis");
assert(compat.stuck.evidence === null, "delegated Phainesis defaults should preserve stuck evidence shape");

const evaluated = phainesis.evaluatePhainomenon({
  nousCarrier: { movementEnvelope: { y: "positive" } },
  frames: [
    { projectileScore: 0.05, healthActiveCells: 12, healthZeroScore: 0.1, base3x3Signature: "aaaa", depthSignature: "1111", movementSpeed: 0.1, actionSignature: "forward:none:-:-:-:r", actionRepeatFrames: 13 },
    { projectileScore: 0.06, healthActiveCells: 12, healthZeroScore: 0.1, base3x3Signature: "aaaa", depthSignature: "1111", movementSpeed: 0.09, actionSignature: "forward:none:-:-:-:r", actionRepeatFrames: 14 },
    { projectileScore: 0.07, healthActiveCells: 12, healthZeroScore: 0.1, base3x3Signature: "aaaa", depthSignature: "1111", movementSpeed: 0.08, actionSignature: "forward:none:-:-:-:r", actionRepeatFrames: 15 },
    { projectileScore: 0.08, healthActiveCells: 12, healthZeroScore: 0.1, base3x3Signature: "aaaa", depthSignature: "1111", movementSpeed: 0.09, actionSignature: "forward:none:-:-:-:r", actionRepeatFrames: 16 },
    { projectileScore: 0.05, healthActiveCells: 12, healthZeroScore: 0.1, base3x3Signature: "aaaa", depthSignature: "1111", movementSpeed: 0.08, actionSignature: "forward:none:-:-:-:r", actionRepeatFrames: 17 },
    { projectileScore: 0.31, dynamicObjectScore: 0.2, temporalDelta: 0.04, flowX: 0.2, healthActiveCells: 9, healthZeroScore: 0.28, audioEnergy: 0.2, audioBalance: -0.4, base3x3Signature: "aaaa", depthSignature: "1111", movementSpeed: 0.08, motorForward: 0, stuckFrames: 2, actionSignature: "forward:none:-:-:-:r", actionRepeatFrames: 18 }
  ],
  itemMemory: [{ targetKind: "medkit" }],
  movementEventType: "movement-stall",
  movementConfidence: 0.9
});
assert(evaluated.looming.active === true, "evaluatePhainomenon should detect looming");
assert(evaluated.stuck.active === true, "evaluatePhainomenon should detect stuck state");
assert(evaluated.sensorRecovery.needed === true, "evaluatePhainomenon should request sensor recovery");

const counterOnlyEvaluated = phainesis.evaluatePhainomenon({
  nousCarrier: { movementEnvelope: { y: "positive" } },
  frames: [
    { base3x3Signature: "new1", depthSignature: "2000", movementSpeed: 0.05, temporalDelta: 0.12, flowX: 0.16, flowY: 0.05, stuckFrames: 2, motorForward: 1 }
  ]
});
assert(counterOnlyEvaluated.stuck.active === false, "stuck counters alone should not bypass Kinesis/repeated-world evidence");

const repeatedKinesisEvaluated = phainesis.evaluatePhainomenon({
  nousCarrier: { movementEnvelope: { y: "positive" } },
  frames: [
    { base3x3Signature: "abca", movementSpeed: 0.08, temporalDelta: 0.04, flowX: 0.01, flowY: 0.01, actionSignature: "forward:right:-:-:-:r", actionRepeatFrames: 13 },
    { base3x3Signature: "abca", movementSpeed: 0.07, temporalDelta: 0.04, flowX: 0.01, flowY: 0.01, actionSignature: "forward:right:-:-:-:r", actionRepeatFrames: 14 },
    { base3x3Signature: "abca", movementSpeed: 0.08, temporalDelta: 0.04, flowX: 0.01, flowY: 0.01, actionSignature: "forward:right:-:-:-:r", actionRepeatFrames: 15 },
    { base3x3Signature: "abca", movementSpeed: 0.07, temporalDelta: 0.04, flowX: 0.01, flowY: 0.01, actionSignature: "forward:right:-:-:-:r", actionRepeatFrames: 16 },
    { base3x3Signature: "abca", movementSpeed: 0.08, temporalDelta: 0.04, flowX: 0.01, flowY: 0.01, actionSignature: "forward:right:-:-:-:r", actionRepeatFrames: 17 },
    { base3x3Signature: "abca", movementSpeed: 0.06, temporalDelta: 0.04, flowX: 0.01, flowY: 0.01, actionSignature: "forward:right:-:-:-:r", actionRepeatFrames: 18, motorForward: 1 }
  ]
});
assert(repeatedKinesisEvaluated.stuck.active === true, "repeated Kinesis action with low motion should detect stuck state");
assert(repeatedKinesisEvaluated.stuck.evidence === "kinesis-repeat", "repeated Kinesis action should expose kinesis-repeat evidence");

const repeatedButMovingEvaluated = phainesis.evaluatePhainomenon({
  nousCarrier: { movementEnvelope: { y: "positive" } },
  frames: [
    { base3x3Signature: "zzzz", movementSpeed: 0.42, temporalDelta: 0.2, flowX: 0.16, flowY: 0.05, actionSignature: "forward:right:-:-:-:r", actionRepeatFrames: 18, motorForward: 1 }
  ]
});
assert(repeatedButMovingEvaluated.stuck.active === false, "repeated Kinesis action should not be stuck while motion is progressing");

const shortRepeatEvaluated = phainesis.evaluatePhainomenon({
  nousCarrier: { movementEnvelope: { y: "positive" } },
  frames: [
    { base3x3Signature: "short", movementSpeed: 0.06, temporalDelta: 0.04, flowX: 0.01, flowY: 0.01, actionSignature: "forward:right:-:-:-:r", actionRepeatFrames: 5, motorForward: 1 }
  ]
});
assert(shortRepeatEvaluated.stuck.active === false, "short Kinesis repeats should not be enough for stuck evidence");

const changingSignatureEvaluated = phainesis.evaluatePhainomenon({
  nousCarrier: { movementEnvelope: { y: "positive" } },
  frames: [
    { base3x3Signature: "a111", movementSpeed: 0.07, temporalDelta: 0.12, flowX: 0.10, flowY: 0.05, actionSignature: "forward:right:-:-:-:r", actionRepeatFrames: 18, motorForward: 1 },
    { base3x3Signature: "b222", movementSpeed: 0.07, temporalDelta: 0.14, flowX: 0.10, flowY: 0.05, actionSignature: "forward:right:-:-:-:r", actionRepeatFrames: 19, motorForward: 1 }
  ]
});
assert(changingSignatureEvaluated.stuck.active === false, "changing visual signatures should suppress repeated-action stuck evidence");

const useRepeatEvaluated = phainesis.evaluatePhainomenon({
  nousCarrier: { movementEnvelope: { y: "positive" } },
  frames: [
    { base3x3Signature: "use1", movementSpeed: 0.05, temporalDelta: 0.03, flowX: 0.01, flowY: 0.01, actionSignature: "forward:none:-:-:u:-", actionRepeatFrames: 24, motorForward: 1 }
  ]
});
assert(useRepeatEvaluated.stuck.active === false, "Use/action repeats should not become Kinesis stuck evidence");
const expectedEventScores = [
  "wallFlow",
  "corridorFlow",
  "gap",
  "stuck",
  "oscillation",
  "looming",
  "enemyPresence",
  "damageLocalization",
  "projectileFlow",
  "threatField",
  "explorationEntropy",
  "itemBacktrack",
  "goalDirection",
  "safeZone",
  "intentConsistency",
  "movementStability",
  "confidenceFusion"
];
for (const name of expectedEventScores) {
  assert(Object.prototype.hasOwnProperty.call(evaluated.eventScores, name), `Phainesis event score should include ${name}`);
}

const vectors = nous.buildMeaningVectors(evaluated);
const expectedVectors = [
  "wallFlowVector",
  "gapVector",
  "corridorVector",
  "stuckVector",
  "loomingVector",
  "enemyVector",
  "damageVector",
  "projectileVector",
  "threatVector",
  "explorationVector",
  "itemVector",
  "goalVector",
  "safeZoneVector",
  "intentVector",
  "stabilityVector",
  "confidenceVector"
];
for (const name of expectedVectors) {
  assert(Object.prototype.hasOwnProperty.call(vectors, name), `Nous vector should include ${name}`);
}

const damageEvaluated = phainesis.evaluatePhainomenon({
  frames: [
    { healthActiveCells: 12, healthZeroScore: 0.1, audioEnergy: 0.2, audioBalance: -0.5, projectileScore: 0.04, enemyConfidence: 0.05 },
    { healthActiveCells: 8, healthZeroScore: 0.26, audioEnergy: 0.24, audioMidEnergy: 0.22, audioBalance: -0.5, projectileScore: 0.05, enemyConfidence: 0.05 }
  ]
});
assert(damageEvaluated.damageLocalization.active === true, "evaluatePhainomenon should detect damage localization");

const audioEnemyEvaluated = phainesis.evaluatePhainomenon({
  frames: [
    { audioEnergy: 0.16, audioMidEnergy: 0.14, audioHighEnergy: 0.08, audioBalance: 0.42, audioEventDetected: true, audioEventType: "native-sfx", enemyConfidence: 0.03 },
    { audioEnergy: 0.22, audioMidEnergy: 0.2, audioHighEnergy: 0.1, audioBalance: 0.62, audioEventDetected: true, audioEventType: "native-sfx", enemyConfidence: 0.03 }
  ]
});
assert(audioEnemyEvaluated.enemyPresence.active === true, "combat-like audio should raise enemy presence without visual confirmation");
assert(audioEnemyEvaluated.enemyPresence.direction === "right", "stereo balance should localize audio enemy to the right");
assert(audioEnemyEvaluated.threatField.direction === "right", "audio enemy localization should feed threat field direction");

const terminalMaskedEnemyEvaluated = phainesis.evaluatePhainomenon({
  frames: [
    {
      audioEnergy: 0.18,
      audioMidEnergy: 0.17,
      audioHighEnergy: 0.08,
      audioBalance: 0.58,
      audioEventDetected: true,
      audioEventType: "native-sfx",
      enemyConfidence: 0.38,
      computerRoomScore: 0.34,
      computerPanelScore: 0.62,
      computerDarkPanelScore: 0.28,
      baseDirection: "front"
    }
  ]
});
assert(terminalMaskedEnemyEvaluated.enemyPresence.active === true, "Computer terminal visual decoys should not suppress real combat audio");
assert(terminalMaskedEnemyEvaluated.enemyPresence.visualSuppressed === true, "Computer terminal visual decoys should be masked from visual enemy vectors");
assert(terminalMaskedEnemyEvaluated.enemyPresence.direction === "right", "Side combat audio should drive enemy direction when the front view is a terminal decoy");
assert(terminalMaskedEnemyEvaluated.enemyPresence.source === "audio-terminal-mask", "Terminal mask should be visible as an enemy source reason");

const useAudioEvaluated = phainesis.evaluatePhainomenon({
  frames: [
    { audioEnergy: 0.24, audioMidEnergy: 0.22, audioHighEnergy: 0.12, audioBalance: 0.65, audioEventDetected: true, audioEventType: "use-success-gate", enemyConfidence: 0.03 }
  ]
});
assert(useAudioEvaluated.enemyPresence.active === false, "Use success/failure audio should not be classified as an enemy");

const itemEvaluated = phainesis.evaluatePhainomenon({
  frames: [
    { healthActiveCells: 7, healthZeroScore: 0.5, projectileScore: 0.03, enemyConfidence: 0.03, audioEnergy: 0.05 }
  ],
  itemMemory: [{ targetKind: "medkit" }]
});
assert(itemEvaluated.itemBacktrack.suggested === true, "evaluatePhainomenon should suggest item backtrack");

console.log("DOOM_PHAINESIS_VM_TEST_OK", {
  events: events.length,
  graceEvents: graceEvents.length,
  delegated: compat.stuck.active,
  evaluated: evaluated.sensorRecovery.needed,
  eventScores: expectedEventScores.length,
  vectors: expectedVectors.length
});
