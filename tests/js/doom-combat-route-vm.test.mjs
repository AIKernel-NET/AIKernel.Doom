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
const source = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", "combat-route.js"), "utf8");
vm.runInContext(source, context, { filename: "combat-route.js" });

const combatRoute = context.self.AIKernelDoomCombatRoute;
assert(combatRoute?.planCentralHallEnemySweep, "Combat route module should expose central-hall sweep planning");
assert(combatRoute?.inferPostEnemyObjective, "Combat route module should expose post-enemy objective routing");

const sweep = combatRoute.planCentralHallEnemySweep({
  targetTurn: "none",
  sweepFrames: 0,
  sweepTurn: "right",
  defaultSweepFrames: 72,
  depth: 0.82,
  motionStallScore: 0.1,
  inputStallFrames: 0,
  targetConfidence: 0.2,
  enemyConfidence: 0.1,
  enemyCenterCellConfidence: 0.13,
  frameIndex: 12,
  fireCooldown: 0,
  left: 80,
  right: 84,
  ammoLikelyEmpty: false
});

assert(sweep.probeFire === true, "Weak centered front-enemy evidence should permit a short probe shot");
assert(sweep.action.fire === true && sweep.action.move === "none", "Probe fire should hold movement");
assert(sweep.mobilityMode === "central-hall-enemy-probe-fire", "Probe fire should expose a route-specific mode");

const structuralDecoySweep = combatRoute.planCentralHallEnemySweep({
  targetTurn: "none",
  sweepFrames: 0,
  sweepTurn: "right",
  defaultSweepFrames: 72,
  depth: 0.82,
  motionStallScore: 0.1,
  inputStallFrames: 0,
  targetConfidence: 0.8,
  enemyConfidence: 0.8,
  enemyCenterCellConfidence: 0.72,
  enemyStructuralDecoy: true,
  trustedCombatEvidence: false,
  trustedEnemyThreat: 0,
  frameIndex: 14,
  fireCooldown: 0,
  left: 80,
  right: 84,
  ammoLikelyEmpty: false
});

assert(structuralDecoySweep.probeFire === false, "Structural decoys should suppress probe fire");
assert(structuralDecoySweep.action.fire === false, "Structural decoys must not fire even with high raw visual confidence");

const yawCenteredHold = combatRoute.planCentralHallEnemySweep({
  targetTurn: "right",
  sweepFrames: 18,
  sweepTurn: "right",
  depth: 0.82,
  motionStallScore: 0.1,
  inputStallFrames: 0,
  targetConfidence: 0.24,
  enemyConfidence: 0.24,
  enemyCenterCellConfidence: 0.04,
  enemyCombatYaw: 4,
  frameIndex: 13,
  fireCooldown: 0,
  left: 42,
  right: 96,
  ammoLikelyEmpty: false
});

assert(yawCenteredHold.action.turn === "none", "Enemy yaw inside the deadband should suppress stale turn hints");
assert(yawCenteredHold.action.move === "none", "Centered aim hold should not drift forward while acquiring the shot");
assert(yawCenteredHold.mobilityMode === "central-hall-enemy-aim-hold", "Yaw-centered hold should expose a stable aim mode");

const fineAimHold = combatRoute.planCentralHallEnemySweep({
  targetTurn: "right",
  sweepFrames: 18,
  sweepTurn: "right",
  depth: 0.82,
  motionStallScore: 0.1,
  inputStallFrames: 0,
  targetConfidence: 0.22,
  enemyConfidence: 0.22,
  enemyCenterCellConfidence: 0.04,
  enemyCombatYaw: 12,
  frameIndex: 13,
  fireCooldown: 0,
  left: 42,
  right: 96,
  ammoLikelyEmpty: false
});

assert(fineAimHold.action.turn === "none", "Near-center aim should pulse rather than turn every frame");

const fineAimPulse = combatRoute.planCentralHallEnemySweep({
  targetTurn: "right",
  sweepFrames: 18,
  sweepTurn: "right",
  depth: 0.82,
  motionStallScore: 0.1,
  inputStallFrames: 0,
  targetConfidence: 0.22,
  enemyConfidence: 0.22,
  enemyCenterCellConfidence: 0.04,
  enemyCombatYaw: 12,
  frameIndex: 15,
  fireCooldown: 0,
  left: 42,
  right: 96,
  ammoLikelyEmpty: false
});

assert(fineAimPulse.action.turn === "right", "Near-center aim should still emit periodic corrective turn pulses");

const route = combatRoute.inferPostEnemyObjective({
  centralHallEntered: true,
  enemyDefeatedCount: 1,
  bridgeLaneVisible: true,
  finalRoomEntered: false,
  exitSwitchPressed: false
});

assert(route === "cross-bridge", "After front enemy is defeated, bridge evidence should become the next objective");

const decoyRoute = combatRoute.inferPostEnemyObjective({
  centralHallEntered: true,
  enemyDefeatedCount: 0,
  bridgeLaneVisible: true,
  finalRoomEntered: false,
  exitSwitchPressed: false,
  enemyStructuralDecoy: true,
  trustedCombatEvidence: false
});

assert(decoyRoute === "cross-bridge", "Structural decoys should let the post-door objective continue toward bridge evidence");

console.log("DOOM_COMBAT_ROUTE_VM_TEST_OK", { fire: sweep.action.fire, route });
