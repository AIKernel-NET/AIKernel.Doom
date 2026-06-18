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

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/cognition/kairos.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/cognition/kinesis.js");

const kairos = context.self.AIKernelDoomKairos;
const kinesis = context.self.AIKernelDoomKinesis;
assert(kairos?.composeFirstDoorPriorityContext, "Kairos should export composeFirstDoorPriorityContext");
assert(kairos?.resolveMonitoringState, "Kairos should export resolveMonitoringState");
assert(kairos?.resolvePriorityAxes, "Kairos should export resolvePriorityAxes");
assert(kairos?.normalizePriorityAxes, "Kairos should export normalizePriorityAxes");

const firstDoor = kairos.composeFirstDoorPriorityContext({
  firstDoorContext: true,
  firstDoorUseDepth: 0.42,
  firstDoorUseSignatureThreshold: 0.7,
  firstDoorRetrySignatureTolerance: 0.1,
  firstDoorAlignmentScore: 0.82,
  firstDoorUse3x3Score: 0.92,
  firstDoorCorridorSignature: 0.76,
  firstDoorVision9x9Score: 0.72,
  spawnCorridorGapScore: 0.5,
  routeEvidence: 0.54,
  danger: 0.12,
  pathos: 0.18,
  depthEstimate: 0.4,
  wallHugSide: "left",
  useCooldown: 0,
  firstDoorUseAttempted: false
});
assert(firstDoor.firstDoorAlignmentWindow === true, "Kairos should own first-door alignment readiness");
assert(firstDoor.contactUseReady === true, "Kairos should own first-door contact readiness");

const monitoring = kairos.resolveMonitoringState({
  reason: "combat-relocalization",
  contextResetActive: false,
  combatEvidence: true,
  combatContextActive: true,
  trustedEnemyThreat: 0.4,
  danger: 0.12,
  stuck: 0.1
});
assert(monitoring.active === true, "Kairos should own abnormal monitoring activation");
assert(monitoring.state === "Survey", "relocalization should take precedence in Kairos monitoring");
assert(monitoring.boost >= 0.7, "Kairos monitoring should emit deterministic boost");

const priority = kairos.resolvePriorityAxes({
  carrier: {
    dominantAxis: "LOGOS",
    weights: { logos: 0.42, pathos: 0.18, ethos: 0.4 }
  },
  observed: { logos: 0.5, ethos: 0.48, pathos: 0.18, danger: 0.12, stuck: 0.1 },
  firstDoor
});

assert(priority.dominantAxis === "LOGOS", "Kairos should preserve the selected Topos axis");
assert(priority.shouldAdvanceFirstDoor === true, "Kairos should own first-door priority gating");
assert(priority.contactUseReady === true, "Kairos should carry contact use readiness");
assert(priority.pathosDominant === false, "Kairos should not mark LOGOS route as PATHOS dominant");

const contact = kinesis.mapToposDecision({
  enabled: true,
  action: { move: "forward", turn: "none", run: true },
  vector: { x: 0.1, y: 0.66 },
  kairos: priority
});
assert(contact.action.use === true, "Kinesis should convert Kairos contact priority into use action");
assert(contact.reason === "logos-ethos-contact-use", "Kinesis should keep deterministic contact reason");

const danger = kairos.resolvePriorityAxes({
  carrier: { dominantAxis: "PATHOS", weights: { pathos: 0.8 } },
  observed: { pathos: 0.7, danger: 0.1, stuck: 0.6 },
  firstDoor: { firstDoorAlignmentWindow: false, depthEstimate: 0.7, wallHugSide: "right" }
});
const escape = kinesis.mapToposDecision({
  enabled: true,
  action: { move: "none", turn: "none" },
  vector: { x: 0.1, y: 0.1 },
  kairos: danger
});
assert(escape.action.move === "forward", "Kinesis should only generate movement from Kairos priority");
assert(escape.action.turn === "left", "Kinesis should use Kairos wall-hug hint for stall recovery");

console.log("DOOM_KAIROS_VM_TEST_OK", {
  selected: priority.selectedAxis,
  monitoring: monitoring.state,
  contact: contact.reason,
  escape: escape.reason
});
