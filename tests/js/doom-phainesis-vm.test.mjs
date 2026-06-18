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
    { projectileScore: 0.05, healthActiveCells: 12, healthZeroScore: 0.1, base3x3Signature: "aaaa", movementSpeed: 0.1 },
    { projectileScore: 0.31, dynamicObjectScore: 0.2, temporalDelta: 0.04, flowX: 0.2, healthActiveCells: 9, healthZeroScore: 0.28, audioEnergy: 0.2, audioBalance: -0.4, base3x3Signature: "aaaa", movementSpeed: 0.08, motorForward: 0, stuckFrames: 2 }
  ],
  itemMemory: [{ targetKind: "medkit" }],
  movementEventType: "movement-stall",
  movementConfidence: 0.9
});
assert(evaluated.looming.active === true, "evaluatePhainomenon should detect looming");
assert(evaluated.stuck.active === true, "evaluatePhainomenon should detect stuck state");
assert(evaluated.sensorRecovery.needed === true, "evaluatePhainomenon should request sensor recovery");

const damageEvaluated = phainesis.evaluatePhainomenon({
  frames: [
    { healthActiveCells: 12, healthZeroScore: 0.1, audioEnergy: 0.2, audioBalance: -0.5, projectileScore: 0.04, enemyConfidence: 0.05 },
    { healthActiveCells: 8, healthZeroScore: 0.26, audioEnergy: 0.24, audioMidEnergy: 0.22, audioBalance: -0.5, projectileScore: 0.05, enemyConfidence: 0.05 }
  ]
});
assert(damageEvaluated.damageLocalization.active === true, "evaluatePhainomenon should detect damage localization");

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
  evaluated: evaluated.sensorRecovery.needed
});
