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
  String,
  RegExp
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);
for (const file of ["combat-route.js", "routing.js"]) {
  const source = readFileSync(path.join(repoRoot, "src", "DoomWeb", "wwwroot", "js", "autoplay", "cognition", file), "utf8");
  vm.runInContext(source, context, { filename: file });
}

const routing = context.self.AIKernelDoomRouting;
assert(routing?.inferFirstDoorObjective, "Routing module should expose inferFirstDoorObjective");

const landmarkObjective = routing.inferFirstDoorObjective({
  hasController: true,
  previousObjective: "find-corridor-to-first-door",
  doorOpenedCount: 0,
  firstDoorUseDepth: 0.42,
  firstDoorDarkPanelUseAlignmentScore: 0.42,
  firstDoorAlignmentScore: 0.52,
  depthEstimate: 0.74,
  spawnCorridorGapThreshold: 0.34,
  spawnCorridorGapScore: 0.08,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteFrames: 3,
  motionEntranceScore: 0.02,
  motionEntranceThreshold: 0.22,
  relativeAlignment: { aligned: false, conflict: false },
  predictions: 80,
  firstDoorSpawnScanFrames: 60,
  controlPipeline: "OpeningHome",
  mobilityMode: "opening-map-route"
});

assert(landmarkObjective === "locate-first-door-corridor", "Stable spawn landmark evidence should start first-door corridor localization");

const weakObjective = routing.inferFirstDoorObjective({
  hasController: true,
  previousObjective: "find-corridor-to-first-door",
  doorOpenedCount: 0,
  firstDoorUseDepth: 0.42,
  firstDoorDarkPanelUseAlignmentScore: 0.42,
  firstDoorAlignmentScore: 0.52,
  depthEstimate: 0.74,
  spawnCorridorGapThreshold: 0.34,
  spawnCorridorGapScore: 0.08,
  spawnCorridorGapTurn: "none",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteFrames: 1,
  motionEntranceScore: 0.02,
  motionEntranceThreshold: 0.22,
  relativeAlignment: { aligned: false, conflict: false },
  predictions: 80,
  firstDoorSpawnScanFrames: 60,
  controlPipeline: "OpeningHome",
  mobilityMode: "opening-map-route"
});

assert(weakObjective === "follow-demo-route-to-first-door", "Single-frame landmark evidence should remain a demo route hint, not a corridor lock");

const postEnemyObjective = routing.inferObjective({
  enabled: true,
  centralHallEntered: true,
  enemyDefeatedCount: 1,
  bridgeLaneVisible: true,
  doorOpenedCount: 1
});

assert(postEnemyObjective === "cross-bridge", "Enemy defeat should unblock bridge objective instead of stalling at secure-central-hall");

console.log("DOOM_ROUTING_VM_TEST_OK", { landmarkObjective, weakObjective, postEnemyObjective });
