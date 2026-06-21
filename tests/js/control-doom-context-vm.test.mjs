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

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/expression-dsl.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/route-planner.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/route-loop-budget.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/doom-context.js");

const adapter = context.self.AIKernelDoomControlContext;
assert(adapter?.createContext, "Doom control context adapter should export createContext");
assert(adapter?.wallVector, "Doom control context adapter should export wallVector");

const wall = adapter.wallVector({
  screen6Regions: [0.1, 0.1, 0.1, 0.3, 0.3, 0.3]
});
assert(Math.abs(wall - 0.66) < 0.0001, "screen region fallback should create a bounded wall vector");

const controlContext = adapter.createContext({
  parameters: {
    doorAimToleranceDegrees: 10,
    doorSoftAimToleranceDegrees: 24,
    doorAimYawDegrees: 8,
    openCruiseWallVectorDeadZone: 0.08,
    openCruiseYawDegrees: 7,
    emergencyEscapeYawDegrees: 34
  }
}, {
  health: 88,
  contextDict: "Open-Space",
  screen6Regions: [0.1, 0.1, 0.1, 0.3, 0.3, 0.3],
  depthSig: 2,
  faceSig: -0.2,
  motionForwardProgress: 0.05,
  footObstacleScore: 0.6,
  motionObstacleScore: 0.6,
  spawnCorridorGapScore: 0.18,
  spawnLandmarkRouteEvidence: 0.2,
  actionRepeatFrames: 24,
  moveRepeatFrames: 20,
  turnRepeatFrames: 13,
  predictions: 103,
  lastUsePulsePrediction: 100
});

assert(controlContext.context === "open-space", "context dictionary should normalize to lower-case");
assert(controlContext.depthSig === 1.5, "depth signal should be clamped");
assert(controlContext.values.health === 88, "health should be exposed as a DSL value");
assert(controlContext.values.qDelta === 20, "qDelta fallback should derive from wall vector");
assert(controlContext.values.openCruiseYaw === -5, "open cruise yaw should use route planner yaw reacquisition");
assert(controlContext.values.routeFallbackYaw === -5, "route fallback yaw should prefer route planner yaw reacquisition");
assert(controlContext.values.doorProbeYaw === 8, "door probe yaw should use soft aim when qDelta exceeds tolerance");
assert(controlContext.values.currentRoute === "open-space-low-gap-scan", "route planner should expose a stable current route");
assert(controlContext.values.routeMode === "spawn-approach", "route mode should default to spawn approach before FirstDoor evidence");
assert(controlContext.values.recommendedYaw === -5, "route planner should expose recommended yaw");
assert(controlContext.values.actionRepeatFrames === 24, "Kinesis action repeat frames should be exposed as a DSL value");
assert(controlContext.values.moveRepeatFrames === 20, "Kinesis movement repeat frames should be exposed as a DSL value");
assert(controlContext.values.turnRepeatFrames === 13, "Kinesis turn repeat frames should be exposed as a DSL value");
assert(controlContext.values.usePulseAgeFrames === 3, "Use pulse age should be derived from predictions and lastUsePulsePrediction");
assert(controlContext.values.routeLoopKind === "turn-stall", "Turn-only low-gap repetition should consume turn-stall budget");
assert(controlContext.values.routeLoopBudgetExceeded === true, "Exceeded route loop budget should be exposed as a DSL value");
assert(controlContext.values.routeAbortHint === "turn-stall", "Route loop exhaustion should expose the loop kind as abort hint");
assert(controlContext.values.routeLoopBudgetSource === "js-fallback-route-loop-budget", "JS route loop evaluator should be marked as fallback when no canonical DTO exists");

const canonicalRouteLoopContext = adapter.createContext({}, {
  contextDict: "open-space",
  motionForwardProgress: 0.05,
  footObstacleScore: 0.6,
  motionObstacleScore: 0.6,
  spawnCorridorGapScore: 0.18,
  spawnLandmarkRouteEvidence: 0.2,
  actionRepeatFrames: 24,
  moveRepeatFrames: 20,
  turnRepeatFrames: 13,
  pipelineState: {
    aisthesis: {
      routePlan: {
        RouteMode: "door-approach",
        RouteLoopKind: "canonical-loop",
        RouteAbortHint: "canonical-abort",
        RouteLoopBudgetExceeded: true,
        RouteRecoverUsed: 42,
        RouteRecoverBudget: 99
      }
    }
  }
});
assert(canonicalRouteLoopContext.values.routeLoopBudgetSource === "csharp-route-loop-budget", "Canonical C# route loop DTO should override the JS fallback evaluator");
assert(canonicalRouteLoopContext.values.routeLoopKind === "canonical-loop", "Canonical C# route loop kind should be preserved");
assert(canonicalRouteLoopContext.values.routeAbortHint === "canonical-abort", "Canonical C# route abort hint should be preserved");
assert(canonicalRouteLoopContext.values.routeRecoverUsed === 42, "Canonical C# route loop metrics should be projected into DSL values");
assert(canonicalRouteLoopContext.values.routeRecoverBudget === 99, "Canonical C# route loop budget should be projected into DSL values");

const doorApproachContext = adapter.createContext({}, {
  firstDoorVision9x9Score: 0.4,
  firstDoorUse3x3Score: 0.1,
  doorOpenedCount: 0
});
assert(doorApproachContext.values.routeMode === "door-approach", "FirstDoor visual evidence should switch route mode to door approach");

const postDoorContext = adapter.createContext({}, {
  firstDoorVision9x9Score: 0.4,
  doorOpenedCount: 1
});
assert(postDoorContext.values.routeMode === "post-door", "Opened door milestone should switch route mode to post-door");
assert(postDoorContext.values.currentRoute === "post-door-corridor-route", "Post-door mode should stop reporting spawn landmark routes before ComputerRoom evidence is present");

const postDoorMilestoneContext = adapter.createContext({}, {
  firstDoorVision9x9Score: 0.4,
  milestones: {
    doorOpened: 1
  }
});
assert(postDoorMilestoneContext.values.doorOpenedCount === 1, "Control context should import door-opened milestones into DSL values");
assert(postDoorMilestoneContext.values.routeMode === "post-door", "Door-opened milestones should switch route mode to post-door");

const postDoorMilestoneTerminalContext = adapter.createContext({}, {
  milestones: {
    doorOpened: 1,
    computerRoomScore: 0.10,
    computerDarkPanelScore: 0.48,
    computerPanelScore: 0.27
  }
});
assert(postDoorMilestoneTerminalContext.values.postDoorTerminalSurface === 0.48, "Control context should project post-door terminal surface from milestone sensor scores");
assert(postDoorMilestoneTerminalContext.values.computerDarkPanelScore === 0.48, "Milestone computer dark panel score should be available to DSL conditions");
assert(postDoorMilestoneTerminalContext.values.currentRoute === "computer-room-route", "Post-door terminal evidence should promote the route label to ComputerRoom");

const stickyDoorApproachContext = adapter.createContext({}, {
  previousRouteMode: "door-approach",
  firstDoorVision9x9Score: 0.1,
  firstDoorUse3x3Score: 0.0,
  spawnCorridorGapScore: 0.18,
  spawnLandmarkRouteEvidence: 0.41,
  doorOpenedCount: 0
});
assert(stickyDoorApproachContext.values.routeMode === "door-approach", "Door approach mode should remain sticky while route landmark evidence remains visible");

const corridorBridgeLockContext = adapter.createContext({}, {
  contextDict: "corridor",
  previousRouteMode: "door-approach",
  depthSig: 0.70,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  spawnCorridorGapScore: 0.42,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.54,
  spawnLandmarkRouteTurn: "right",
  bridgeDoorScore: 0.30,
  firstDoorVision9x9Score: 0.18,
  firstDoorUse3x3Score: 0.0,
  doorOpenedCount: 0
});
assert(corridorBridgeLockContext.values.routeCorridorBridgeLock === true, "Corridor bridge evidence should raise a short route lock");
assert(corridorBridgeLockContext.values.routeCorridorBridgeLockFrames >= 18, "Fresh corridor bridge lock should seed sticky frames");

const stickyCorridorBridgeLockContext = adapter.createContext({}, {
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  routeCorridorBridgeLockFrames: 8,
  depthSig: 0.74,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.50,
  spawnLandmarkRouteTurn: "right",
  bridgeDoorScore: 0.24,
  courtyardScore: 0.02,
  firstDoorVision9x9Score: 0.18,
  firstDoorUse3x3Score: 0.0,
  doorOpenedCount: 0
});
assert(stickyCorridorBridgeLockContext.values.routeCorridorBridgeLock === true, "Corridor bridge lock should survive one open-space jitter frame");
assert(stickyCorridorBridgeLockContext.values.routeCorridorBridgeLockFrames === 7, "Sticky corridor bridge lock should decay predictably");

const courtyardCorridorBridgeReleaseContext = adapter.createContext({}, {
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  routeCorridorBridgeLockFrames: 8,
  depthSig: 0.74,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.65,
  footObstacleScore: 0.65,
  spawnCorridorGapScore: 0.38,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.50,
  spawnLandmarkRouteTurn: "right",
  bridgeDoorScore: 0.24,
  courtyardScore: 0.34,
  firstDoorVision9x9Score: 0.18,
  firstDoorUse3x3Score: 0.0,
  doorOpenedCount: 0
});
assert(courtyardCorridorBridgeReleaseContext.values.routeCorridorBridgeLock === false, "Courtyard evidence should release stale corridor bridge lock");
assert(courtyardCorridorBridgeReleaseContext.values.routeCorridorBridgeLockFrames === 0, "Released corridor bridge lock should clear sticky frames");

const postDoorBridgeLockContext = adapter.createContext({}, {
  contextDict: "open-space",
  previousRouteMode: "post-door",
  doorOpenedCount: 1,
  centralHallEntered: false,
  visualEnemySuppressed: true,
  enemyConfidence: 0,
  visualEnemyConfidence: 0,
  depthSig: 0.74,
  bridgeDoorScore: 0.24,
  computerRoomConfidence: 0.12,
  computerPanelScore: 0.12,
  computerDarkPanelScore: 0.43,
  spawnCorridorGapScore: 0.31,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.38,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0
});
assert(postDoorBridgeLockContext.values.routeMode === "post-door", "Door-opened evidence should keep route mode in post-door");
assert(postDoorBridgeLockContext.values.routeCorridorBridgeLock === true, "Post-door bridge/gap evidence should raise the corridor bridge lock");
assert(postDoorBridgeLockContext.values.routeCorridorBridgeLockFrames >= 18, "Fresh post-door bridge lock should seed sticky frames");

const weakGapPostDoorBridgeLockContext = adapter.createContext({}, {
  contextDict: "open-space",
  previousRouteMode: "post-door",
  doorOpenedCount: 1,
  centralHallEntered: false,
  visualEnemySuppressed: true,
  enemyConfidence: 0,
  visualEnemyConfidence: 0,
  depthSig: 1,
  bridgeDoorScore: 0.33,
  computerRoomConfidence: 0.14,
  computerPanelScore: 0.14,
  computerDarkPanelScore: 0.39,
  postDoorTerminalSurface: 0.39,
  spawnCorridorGapScore: 0.27,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.39,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0
});
assert(weakGapPostDoorBridgeLockContext.values.routeCorridorBridgeLock === true, "Post-door bridge-door evidence should lock even when the gap is only weakly visible");
assert(weakGapPostDoorBridgeLockContext.values.routeCorridorBridgeLockFrames >= 18, "Weak-gap post-door bridge lock should seed sticky frames");
assert(weakGapPostDoorBridgeLockContext.values.routePostDoorBridgeDoorMemory === true, "Post-door bridge-door evidence should seed the bridge-door memory");
assert(weakGapPostDoorBridgeLockContext.values.routePostDoorBridgeDoorMemoryFrames >= 24, "Post-door bridge-door memory should hold long enough for the Use stage to consume it");

const stickyPostDoorBridgeDoorMemoryContext = adapter.createContext({}, {
  contextDict: "open-space",
  previousRouteMode: "post-door",
  routePostDoorBridgeDoorMemoryFrames: 9,
  doorOpenedCount: 1,
  centralHallEntered: false,
  visualEnemySuppressed: true,
  enemyConfidence: 0,
  visualEnemyConfidence: 0,
  depthSig: 0.68,
  bridgeDoorScore: 0.07,
  computerRoomConfidence: 0.12,
  computerPanelScore: 0.12,
  computerDarkPanelScore: 0.31,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.31,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0
});
assert(stickyPostDoorBridgeDoorMemoryContext.values.routePostDoorBridgeDoorMemory === true, "Post-door bridge-door memory should survive a weak jitter frame");
assert(stickyPostDoorBridgeDoorMemoryContext.values.routePostDoorBridgeDoorMemoryFrames === 8, "Post-door bridge-door memory should decay predictably");

const stickyPostDoorBridgeLockContext = adapter.createContext({}, {
  contextDict: "open-space",
  previousRouteMode: "post-door",
  routeCorridorBridgeLockFrames: 8,
  doorOpenedCount: 1,
  centralHallEntered: false,
  visualEnemySuppressed: true,
  enemyConfidence: 0,
  visualEnemyConfidence: 0,
  depthSig: 0.72,
  bridgeDoorScore: 0.10,
  computerRoomConfidence: 0.11,
  computerPanelScore: 0.10,
  computerDarkPanelScore: 0.38,
  spawnCorridorGapScore: 0.20,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.28,
  spawnLandmarkRouteTurn: "right",
  firstDoorUse3x3Score: 0
});
assert(stickyPostDoorBridgeLockContext.values.routeCorridorBridgeLock === true, "Weak post-door bridge evidence should keep the route lock sticky");
assert(stickyPostDoorBridgeLockContext.values.routeCorridorBridgeLockFrames === 7, "Weak post-door bridge lock should decay predictably");

const releasedPostDoorBridgeLockContext = adapter.createContext({}, {
  contextDict: "open-space",
  previousRouteMode: "post-door",
  routeCorridorBridgeLockFrames: 8,
  doorOpenedCount: 1,
  centralHallEntered: false,
  visualEnemySuppressed: true,
  enemyConfidence: 0,
  visualEnemyConfidence: 0,
  depthSig: 0.72,
  bridgeDoorScore: 0.04,
  computerRoomConfidence: 0.11,
  computerPanelScore: 0.10,
  computerDarkPanelScore: 0.38,
  spawnCorridorGapScore: 0.12,
  spawnLandmarkRouteEvidence: 0.20,
  firstDoorUse3x3Score: 0
});
assert(releasedPostDoorBridgeLockContext.values.routeCorridorBridgeLock === false, "Post-door bridge lock should release when both bridge and gap evidence disappear");
assert(releasedPostDoorBridgeLockContext.values.routeCorridorBridgeLockFrames === 0, "Released post-door bridge lock should clear sticky frames");

const terminalMaskedEnemyContext = adapter.createContext({}, {
  enemyConfidence: 0.38,
  visualEnemyConfidence: 0.38,
  faceSig: 0.02,
  audioEnemyConfidence: 0.34,
  audioEnemyDirection: "right",
  computerRoomScore: 0.34,
  computerPanelScore: 0.62,
  computerDarkPanelScore: 0.28
});
assert(terminalMaskedEnemyContext.values.visualEnemySuppressed === true, "Computer terminal surfaces should suppress front visual enemy vectors when side audio is strong");
assert(terminalMaskedEnemyContext.values.visualEnemyVisible === false, "Suppressed terminal visual should not count as a visible enemy");
assert(terminalMaskedEnemyContext.values.enemyCombatYaw > 0, "Side audio should steer combat yaw after terminal visual suppression");

const terminalSurfaceOnlyEnemyContext = adapter.createContext({}, {
  doorOpenedCount: 1,
  enemyConfidence: 0.25,
  visualEnemyConfidence: 0.25,
  faceSig: 0.01,
  audioEnemyConfidence: 0,
  audioEnemyDirection: "none",
  postDoorTerminalSurface: 0.45,
  computerRoomScore: 0.16,
  computerPanelScore: 0,
  computerDarkPanelScore: 0.02,
  firstDoorVision9x9RedScore: 0
});
assert(terminalSurfaceOnlyEnemyContext.values.postDoorTerminalSurface === 0.45, "Control context should preserve C#/WASM post-door terminal surface evidence");
assert(terminalSurfaceOnlyEnemyContext.values.visualEnemySuppressed === true, "Weak terminal-surface-only brown blobs should be suppressed without requiring an audio cue");
assert(terminalSurfaceOnlyEnemyContext.values.visualEnemyVisible === false, "Suppressed terminal-surface-only visual evidence should not block route stages");

const strongRearSecretContext = adapter.createContext({}, {
  previousRouteMode: "door-approach",
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0.0,
  spawnCorridorGapScore: 0.19,
  spawnLandmarkRouteEvidence: 0.35,
  spawnSecretDoorScore: 0.77,
  doorOpenedCount: 0
});
assert(strongRearSecretContext.values.routeMode === "spawn-approach", "Strong rear secret-door evidence should release stale door-approach mode when FirstDoor evidence is weak");

const advanceStallContext = adapter.createContext({}, {
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  predictions: 1200,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.50,
  footObstacleScore: 0.50,
  actionRepeatFrames: 0,
  kinesisActionRepeatFrames: 140,
  spawnCorridorGapScore: 0.21,
  spawnLandmarkRouteEvidence: 0.36,
  firstDoorVision9x9Score: 0.21,
  firstDoorUse3x3Score: 0.0,
  doorOpenedCount: 0
});
assert(advanceStallContext.values.routeLoopKind === "advance-stall", "Long weak-gap landmark advance should consume the advance budget");
assert(advanceStallContext.values.routeAbortHint === "advance-stall", "Advance budget exhaustion should expose advance-stall as the route abort hint");
assert(advanceStallContext.values.routeAdvanceExceeded === true, "Advance budget exhaustion should be visible as a typed DSL value");

const ingressLoopContext = adapter.createContext({}, {
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  predictions: 760,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.22,
  footObstacleScore: 0.22,
  actionRepeatFrames: 120,
  kinesisActionRepeatFrames: 120,
  moveRepeatFrames: 120,
  turnRepeatFrames: 120,
  spawnCorridorGapScore: 0.21,
  spawnLandmarkRouteEvidence: 0.36,
  firstDoorVision9x9Score: 0.21,
  firstDoorUse3x3Score: 0.0,
  doorOpenedCount: 0
});
assert(ingressLoopContext.values.routeLoopKind === "ingress-loop", "Repeated forward/right weak-ingress pursuit should consume the ingress budget before foot-obstacle evidence is strong");
assert(ingressLoopContext.values.routeAbortHint === "ingress-loop", "Ingress budget exhaustion should expose ingress-loop as the route abort hint");
assert(ingressLoopContext.values.routeIngressExceeded === true, "Ingress budget exhaustion should be visible as a typed DSL value");
assert(ingressLoopContext.values.routeIngressUsed === 120, "Ingress budget should count the repeated action window");

const topologyDeadEndContext = adapter.createContext({}, {
  contextDict: "open-space",
  previousRouteMode: "door-approach",
  predictions: 920,
  depthSig: 1.0,
  motionForwardProgress: 0.70,
  motionObstacleScore: 0.60,
  footObstacleScore: 0.60,
  footObstacleFlickerScore: 0,
  footObstacleBounceFrames: 0,
  actionRepeatFrames: 0,
  moveRepeatFrames: 48,
  turnRepeatFrames: 0,
  spawnCorridorGapScore: 0.35,
  spawnCorridorGapTurn: "right",
  spawnLandmarkRouteEvidence: 0.42,
  spawnLandmarkRouteTurn: "right",
  spawnSecretDoorScore: 0.10,
  firstDoorVision9x9Score: 0.28,
  firstDoorUse3x3Score: 0.0,
  doorOpenedCount: 0
});
assert(topologyDeadEndContext.values.routeMode === "door-approach", "Topology dead-end fixture should remain in door-approach mode");
assert(topologyDeadEndContext.values.routeDeadEndRisk === true, "Topology dead-end fixture should expose phase-level dead-end risk");
assert(topologyDeadEndContext.values.routeDeadEndTrimRequired === true, "Topology dead-end fixture should expose trim-required evidence before action selection");
assert(topologyDeadEndContext.values.routeLoopKind === "door-approach-dead-end", "Sustained topology dead-end should consume the topology budget");
assert(topologyDeadEndContext.values.routeAbortHint === "door-approach-dead-end", "Topology budget exhaustion should expose a route abort hint without adding an action");
assert(topologyDeadEndContext.values.routeTopologyExceeded === true, "Topology budget exhaustion should be visible as a typed DSL value");
assert(topologyDeadEndContext.values.routeTopologyUsed === 48, "Topology budget should be consumed by movement repeat frames");

const earlyRecoverContext = adapter.createContext({}, {
  contextDict: "open-space",
  predictions: 1200,
  courtyardScore: 0.34,
  spawnSecretDoorScore: 0.18,
  spawnCorridorGapScore: 0.20,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0.0,
  doorOpenedCount: 0
});
assert(earlyRecoverContext.values.routeAbortHint === "none", "East-window route recovery should keep its budget before the recover limit is reached");
assert(earlyRecoverContext.values.routeRecoverUsed === 300, "East-window route recovery budget should count frames after the recovery observation window");

const exhaustedRecoverContext = adapter.createContext({}, {
  contextDict: "open-space",
  predictions: 1500,
  courtyardScore: 0.34,
  spawnSecretDoorScore: 0.18,
  spawnCorridorGapScore: 0.20,
  firstDoorVision9x9Score: 0.05,
  firstDoorUse3x3Score: 0.0,
  doorOpenedCount: 0
});
assert(exhaustedRecoverContext.values.routeLoopKind === "recover-stall", "Long east-window recovery should consume the recover budget");
assert(exhaustedRecoverContext.values.routeAbortHint === "recover-stall", "Recover budget exhaustion should expose recover-stall as the route abort hint");
assert(exhaustedRecoverContext.values.routeRecoverExceeded === true, "Recover budget exhaustion should be visible as a typed DSL value");

console.log("CONTROL_DOOM_CONTEXT_VM_TEST_OK", {
  wall: Number(wall.toFixed(2)),
  qDelta: controlContext.values.qDelta,
  context: controlContext.context,
  routeMode: controlContext.values.routeMode
});
