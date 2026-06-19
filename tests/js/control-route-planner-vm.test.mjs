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

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/route-planner.js");

const planner = context.self.AIKernelDoomRoutePlanner;
assert(planner?.evaluateRoutePlan, "route planner should export evaluateRoutePlan");
assert(planner?.evaluateLandmarkNavigator, "route planner should export evaluateLandmarkNavigator");

const routePlan = planner.evaluateRoutePlan({
  context: "open-space",
  depthSig: 0.9,
  footObstacleScore: 0.62,
  motionObstacleScore: 0.6,
  motionForwardProgress: 0.05,
  spawnCorridorGapScore: 0.12,
  spawnLandmarkRouteEvidence: 0.30,
  spawnSecretDoorScore: 0.20,
  spawnWestStairScore: 0.10,
  bridgeDoorScore: 0.20,
  gapVector: 0.44,
  useProbeScore: 0.6,
  useProbeAlignment: 0.8
});

assert(routePlan.routeOpenSpaceLowGapScan === true, "route planner should preserve low-gap scan logic");
assert(routePlan.routeOpenSpaceLowGapEscape === false, "low-gap scan should not escape from low progress alone");
assert(routePlan.firstDoorRouteEvidenceReady === true, "route planner should mark first-door evidence ready");
assert(routePlan.currentRoute === "open-space-low-gap-scan", "route planner should expose selected route name");
assert(routePlan.routeConfidence > 0.23, "route planner should expose route confidence");
assert(routePlan.recommendedYaw === 8, "route planner should convert gap vector into recommended yaw");
assert(routePlan.useProbeConfidence > 0.65, "route planner should combine use probe score and alignment");

const alignedButUnseenUseProbeRoutePlan = planner.evaluateRoutePlan({
  useProbeScore: 0,
  useProbeAlignment: 0.96
});
assert(alignedButUnseenUseProbeRoutePlan.useProbeConfidence === 0, "use probe confidence should not rise from alignment without visual 3x3 evidence");

const navigator = planner.evaluateLandmarkNavigator({
  routePlan,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteTurn: "left",
  spawnGapYawDegrees: 14,
  wallVector: 0.5
});

assert(navigator.spawnCorridorGapYaw === 14, "navigator should expose corridor-gap yaw");
assert(navigator.landmarkRouteYaw === 0, "first-door route evidence below 0.28 should not masquerade as landmark yaw");
assert(navigator.routeFallbackYaw === 14, "navigator should fall back to corridor yaw when landmark yaw is not available");
assert(navigator.recommendedYaw === 8, "navigator should preserve route-planner recommended yaw");

const landmarkRoutePlan = planner.evaluateRoutePlan({
  spawnCorridorGapScore: 0.12,
  spawnLandmarkRouteEvidence: 0.31,
  bridgeDoorScore: 0.10
});
const landmarkNavigator = planner.evaluateLandmarkNavigator({
  routePlan: landmarkRoutePlan,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteTurn: "left",
  spawnGapYawDegrees: 14,
  wallVector: 0.5
});
assert(landmarkRoutePlan.currentLandmark === "landmark-route", "landmark route should remain observable without first-door evidence");
assert(landmarkNavigator.landmarkRouteYaw === -14, "navigator should expose landmark yaw for landmark-route evidence");

const openSpaceFootNoiseRoutePlan = planner.evaluateRoutePlan({
  context: "open-space",
  depthSig: 0.62,
  footObstacleScore: 0.42,
  footObstacleFlickerScore: 0.05,
  footObstacleBounceFrames: 0,
  motionObstacleScore: 0.50,
  motionForwardProgress: 0.36,
  spawnCorridorGapScore: 0.36,
  spawnLandmarkRouteEvidence: 0.32,
  spawnSecretDoorScore: 0.20,
  spawnWestStairScore: 0.10
});
assert(openSpaceFootNoiseRoutePlan.routeFootObstacle === false, "open-space mid-depth foot noise should not steal first-door route control");
assert(openSpaceFootNoiseRoutePlan.routeWallObstacle === false, "open-space mid-depth foot noise should not become wall contact");

const openSpaceHighFootTextureRoutePlan = planner.evaluateRoutePlan({
  context: "open-space",
  depthSig: 1.0,
  footObstacleScore: 0.65,
  footObstacleFlickerScore: 0.0,
  footObstacleBounceFrames: 0,
  motionObstacleScore: 0.65,
  motionForwardProgress: 0.0,
  spawnCorridorGapScore: 0.24,
  spawnLandmarkRouteEvidence: 0.36,
  spawnSecretDoorScore: 0.07,
  spawnWestStairScore: 0.19
});
assert(openSpaceHighFootTextureRoutePlan.routeFootObstacle === false, "unconfirmed open-space texture should not be promoted to foot obstacle");
assert(openSpaceHighFootTextureRoutePlan.routeWallObstacle === false, "unconfirmed open-space texture should not become Pathos wall contact");

const strongerLandmarkRoutePlan = planner.evaluateRoutePlan({
  spawnCorridorGapScore: 0.37,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.53,
  spawnLandmarkRouteTurn: "left",
  gapVector: 0.37,
  corridorVector: -0.53,
  bridgeDoorScore: 0.10
});
assert(strongerLandmarkRoutePlan.recommendedYaw < 0, "stronger corridor/landmark vector should override raw gap yaw");

console.log("CONTROL_ROUTE_PLANNER_VM_TEST_OK", {
  route: routePlan.currentRoute,
  yaw: routePlan.recommendedYaw,
  confidence: Number(routePlan.routeConfidence.toFixed(2))
});
