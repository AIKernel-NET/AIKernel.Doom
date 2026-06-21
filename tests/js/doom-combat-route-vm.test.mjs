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

const route = combatRoute.inferPostEnemyObjective({
  centralHallEntered: true,
  enemyDefeatedCount: 1,
  bridgeLaneVisible: true,
  finalRoomEntered: false,
  exitSwitchPressed: false
});

assert(route === "cross-bridge", "After front enemy is defeated, bridge evidence should become the next objective");

console.log("DOOM_COMBAT_ROUTE_VM_TEST_OK", { fire: sweep.action.fire, route });
