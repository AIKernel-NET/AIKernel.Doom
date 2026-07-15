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
  Array,
  Date,
  setTimeout
};
sandbox.window = sandbox.self;
sandbox.self.performance = { now: () => 0 };
const context = vm.createContext(sandbox);

[
  "src/DoomWeb/wwwroot/js/autoplay/control/objective-routing.js",
  "src/DoomWeb/wwwroot/js/autoplay/sensor-tensor.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/vision-palette.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/sensory.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/kinesis.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/topos.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/ctg.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/kairos.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/zoe.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/phantasia.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/phainesis.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/nous.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/semantics.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/pipeline-trace.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/combat-route.js",
  "src/DoomWeb/wwwroot/js/autoplay/cognition/routing.js",
  "src/DoomWeb/wwwroot/js/bonsai.js"
].forEach(relativePath => loadScript(context, relativePath));

const Supervisor = context.self.AIKernelBonsaiSupervisor;
assert(typeof Supervisor === "function", "Bonsai supervisor should be exported");

const supervisor = new Supervisor({ log: () => {} });
supervisor.setEnabled(true);
supervisor.doorOpenedCount = 1;
supervisor.computerRoomEntered = true;
supervisor.centralHallEntered = true;
supervisor.centralHallFrames = 42;
supervisor.combatFireFrames = 17;
supervisor.enemyConfidencePeak = 0.72;
supervisor.enemyAlertFrames = 12;
supervisor.objective = "reach-central-hall";
supervisor.controlPipeline = "ComputerRoom";
supervisor.semanticMemory = { symbols: { "computer-room": 1, "first-door": 1 } };

const resetStatus = supervisor.resetAutoplayProgress("post-retry-reset:health-face-blood-death");

assert(resetStatus.milestones.doorOpened === 0, "Retry reset should clear the first-door opened milestone");
assert(resetStatus.milestones.doorOpenedCount === 0, "Retry reset should expose a zero doorOpenedCount milestone");
assert(resetStatus.milestones.computerRoomEntered === false, "Retry reset should clear ComputerRoom phase");
assert(resetStatus.milestones.centralHallEntered === false, "Retry reset should clear CentralHall phase");
assert(resetStatus.doorOpenedCount === 0, "Retry reset should clear top-level doorOpenedCount");
assert(resetStatus.computerRoomEntered === false, "Retry reset should clear top-level ComputerRoom state");
assert(resetStatus.centralHallEntered === false, "Retry reset should clear top-level CentralHall state");
assert(resetStatus.objective === "find-and-open-first-door", "Retry reset should restore the opening objective");
assert(resetStatus.controlPipeline === "OpeningHome", "Retry reset should restore the opening pipeline");
assert(resetStatus.milestones.combatFireFrames === 0, "Retry reset should clear stale combat budget");
assert(resetStatus.milestones.enemyConfidencePeak === 0, "Retry reset should clear stale enemy confidence");
assert(resetStatus.semanticMemory?.symbols?.["computer-room"] !== 1, "Retry reset should replace stale semantic memory");

const staleForwardLock = new Supervisor({ log: () => {} });
staleForwardLock.setEnabled(true);
staleForwardLock.predictions = 12;
staleForwardLock.doorOpenedCount = 0;
staleForwardLock.firstDoorCorridorLocated = false;
staleForwardLock.computerRoomEntered = true;
staleForwardLock.computerRoomFrames = 24;
staleForwardLock.centralHallEntered = true;
staleForwardLock.objective = "reach-central-hall";
staleForwardLock.controlPipeline = "ComputerRoom";
staleForwardLock.semanticMemory = { symbols: { "computer-room": 1 } };

const forwardLockAction = staleForwardLock.openingForwardLockAction(210);
assert(forwardLockAction.move === "none", "Opening forward lock should not skip the initial sense-settle sweep");
assert(forwardLockAction.turn === "left", "Opening forward lock should sweep left first");
assert(forwardLockAction.run === false, "Opening sense-settle sweep should be stationary");
assert(staleForwardLock.computerRoomEntered === false, "Opening sense-settle should clear stale ComputerRoom state");
assert(staleForwardLock.centralHallEntered === false, "Opening sense-settle should clear stale CentralHall state");
assert(staleForwardLock.objective === "find-and-open-first-door", "Opening sense-settle should restore the first-door objective");
assert(staleForwardLock.controlPipeline === "OpeningHome", "Opening sense-settle should restore OpeningHome");
assert(staleForwardLock.mobilityMode === "opening-sense-settle-left", "Opening sense-settle should expose the left sweep mode");

const diagonalForwardLock = new Supervisor({ log: () => {} });
diagonalForwardLock.setEnabled(true);
diagonalForwardLock.predictions = 132;
diagonalForwardLock.doorOpenedCount = 0;
diagonalForwardLock.firstDoorUse3x3Score = 0;
const diagonalForwardLockAction = diagonalForwardLock.openingForwardLockAction(210);
assert(diagonalForwardLockAction.move === "forward", "Opening forward lock should advance after the sense sweep");
assert(diagonalForwardLockAction.turn === "right", "Opening forward lock should hold the right lane input");
assert(diagonalForwardLockAction.strafe === true, "Opening forward lock should use forward-right strafe for the blue-floor cut");
assert(diagonalForwardLockAction.run === true, "Opening forward lock should keep the run key while cutting northeast");

const staleRouteLock = new Supervisor({ log: () => {} });
staleRouteLock.setEnabled(true);
staleRouteLock.predictions = 24;
staleRouteLock.doorOpenedCount = 0;
staleRouteLock.firstDoorCorridorLocated = false;
staleRouteLock.computerRoomEntered = true;
staleRouteLock.objective = "reach-central-hall";
staleRouteLock.controlPipeline = "ComputerRoom";
staleRouteLock.semanticMemory = { symbols: { "computer-room": 1, "central-hall": 1 } };

const routeLockAction = staleRouteLock.openingRouteLockAction(36, 230, 760, { depthSig: 1, wallVector: 0 });
assert(routeLockAction.move === "none", "Opening route lock should finish the initial sense-settle before map advance");
assert(routeLockAction.turn === "right", "Opening route lock should sweep right after the left sample");
assert(staleRouteLock.computerRoomEntered === false, "Opening route lock should clear stale ComputerRoom state");
assert(staleRouteLock.objective === "find-and-open-first-door", "Opening route lock should restore the first-door objective");
assert(staleRouteLock.mobilityMode === "opening-sense-settle-right", "Opening route lock should expose the right sweep mode");

const staleSemanticOpening = new Supervisor({ log: () => {} });
staleSemanticOpening.setEnabled(true);
staleSemanticOpening.predictions = 12;
staleSemanticOpening.doorOpenedCount = 0;
staleSemanticOpening.firstDoorCorridorLocated = true;
staleSemanticOpening.firstDoorUse3x3Score = 0;
staleSemanticOpening.computerRoomEntered = true;
staleSemanticOpening.computerRoomFrames = 36;
staleSemanticOpening.objective = "reach-central-hall";
staleSemanticOpening.controlPipeline = "ComputerRoom";
staleSemanticOpening.semanticMemory = { symbols: { "computer-room": 1 }, phase: "ComputerRoom" };

const semanticOpeningAction = staleSemanticOpening.applySensorFusionStrategy(
  { move: "forward", turn: "right", fire: false, strafe: false, use: false, run: true },
  { contextDict: "open-space", depthSig: 1, wallVector: 0, stuckTicks: 0 },
  {},
  { frame: 12, framebuffer: {} });
assert(semanticOpeningAction.move === "none", "Pre-semantic opening guard should stop stale ComputerRoom forward motion");
assert(semanticOpeningAction.turn === "left", "Pre-semantic opening guard should restore the left sweep");
assert(staleSemanticOpening.computerRoomEntered === false, "Pre-semantic opening guard should clear stale ComputerRoom state");
assert(staleSemanticOpening.objective === "find-and-open-first-door", "Pre-semantic opening guard should restore first-door objective");
assert(staleSemanticOpening.controlPipeline === "OpeningHome", "Pre-semantic opening guard should restore OpeningHome");

const stalePostDoorSemantic = new Supervisor({ log: () => {} });
stalePostDoorSemantic.setEnabled(true);
stalePostDoorSemantic.predictions = 900;
stalePostDoorSemantic.doorOpenedCount = 1;
stalePostDoorSemantic.darkZoneEntered = true;
stalePostDoorSemantic.objective = "reach-central-hall";
stalePostDoorSemantic.controlPipeline = "ComputerRoom";
stalePostDoorSemantic.semanticMemory = {
  phase: "OpeningHome",
  objective: "open-door",
  firstDoor: { opened: false, corridorConfidence: 0.44, doorConfidence: 0.66 },
  computerRoom: { confidence: 0.69 },
  symbols: { door: 0.66, "computer-room": 0.69 }
};
const stalePostDoorSemanticStatus = stalePostDoorSemantic.status();
assert(stalePostDoorSemanticStatus.semanticMemory?.firstDoor?.opened === true, "Post-door status should reconcile stale semantic memory to opened FirstDoor");
assert(stalePostDoorSemanticStatus.semanticMemory?.objective !== "open-door", "Post-door status should not expose a stale pre-door semantic objective");
assert(stalePostDoorSemanticStatus.semanticMemory?.lastMilestoneReason === "status-post-door-reconcile", "Post-door semantic reconcile should report the self-heal reason");

const staleVisualComputerRoom = new Supervisor({ log: () => {} });
staleVisualComputerRoom.setEnabled(true);
staleVisualComputerRoom.predictions = 520;
staleVisualComputerRoom.doorOpenedCount = 0;
staleVisualComputerRoom.firstDoorCorridorLocated = true;
staleVisualComputerRoom.firstDoorUseAttempted = false;
staleVisualComputerRoom.firstDoorUsePulsed = false;
staleVisualComputerRoom.pendingUseResponseFrames = 0;
staleVisualComputerRoom.doorTransitionArmedFrames = 0;
staleVisualComputerRoom.firstDoorTransitionFrames = 0;
staleVisualComputerRoom.computerRoomEntered = false;
staleVisualComputerRoom.computerRoomFrames = 3;
staleVisualComputerRoom.objective = "find-and-open-first-door";
staleVisualComputerRoom.controlPipeline = "OpeningHome";

const staleVisualComputerRoomAction = staleVisualComputerRoom.applySensorFusionStrategy(
  { move: "forward", turn: "none", fire: false, strafe: false, use: false, run: true },
  { contextDict: "open-space", depthSig: 0.88, wallVector: 0, stuckTicks: 0 },
  {
    gameplayLuma: 82,
    blueFloorScore: 0,
    firstDoorVision9x9Score: 0.26,
    computerRoomScore: 0.36,
    computerBlueScore: 0.16,
    computerRedLightScore: 0.10,
    computerDarkPanelScore: 0.34,
    computerPanelScore: 0.22,
    spawnCorridorGapScore: 0.30,
    spawnCorridorGapTurn: "right",
    spawnLandmarkRouteEvidence: 0.45,
    spawnLandmarkRouteTurn: "right"
  },
  { frame: 520, framebuffer: {} });
assert(staleVisualComputerRoom.doorOpenedCount === 0, "Strong ComputerRoom-like visuals must not open FirstDoor without Use evidence");
assert(staleVisualComputerRoom.computerRoomEntered === false, "Strong ComputerRoom-like visuals must not enter ComputerRoom before the door opens");
assert(staleVisualComputerRoom.objective !== "reach-central-hall", "Stale visual ComputerRoom evidence should keep the first-door objective");
assert(staleVisualComputerRoomAction.stage !== "ComputerRoom", "Stale visual ComputerRoom evidence should not emit a ComputerRoom action");

const lateClosedDoorPostDoorLeak = new Supervisor({ log: () => {} });
lateClosedDoorPostDoorLeak.setEnabled(true);
lateClosedDoorPostDoorLeak.predictions = 2780;
lateClosedDoorPostDoorLeak.doorOpenedCount = 0;
lateClosedDoorPostDoorLeak.firstDoorCorridorLocated = true;
lateClosedDoorPostDoorLeak.firstDoorCorridorSignature = 0.72;
lateClosedDoorPostDoorLeak.firstDoorUseAttempted = true;
lateClosedDoorPostDoorLeak.firstDoorUsePulsed = false;
lateClosedDoorPostDoorLeak.pendingUseResponseFrames = 0;
lateClosedDoorPostDoorLeak.doorTransitionArmedFrames = 0;
lateClosedDoorPostDoorLeak.firstDoorTransitionFrames = 0;
lateClosedDoorPostDoorLeak.firstDoorUseLatchFrames = 0;
lateClosedDoorPostDoorLeak.computerRoomEntered = false;
lateClosedDoorPostDoorLeak.computerRoomFrames = 18;
lateClosedDoorPostDoorLeak.computerRoomAdvanceFrames = 42;
lateClosedDoorPostDoorLeak.objective = "reach-central-hall";
lateClosedDoorPostDoorLeak.controlPipeline = "ComputerRoom";
lateClosedDoorPostDoorLeak.semanticMemory = { symbols: { "computer-room": 1 }, phase: "ComputerRoom" };

assert(lateClosedDoorPostDoorLeak.closedFirstDoorPostDoorLeakActive() === true, "Closed first door should detect stale late post-door latch state");
const lateClosedDoorLeakAction = lateClosedDoorPostDoorLeak.applySensorFusionStrategy(
  { move: "forward", turn: "right", fire: false, strafe: false, use: false, run: true },
  { contextDict: "open-space", depthSig: 0.74, wallVector: 0.08, stuckTicks: 0 },
  {
    gameplayLuma: 96,
    blueFloorScore: 0,
    firstDoorVision9x9Score: 0.34,
    firstDoorUse3x3Score: 0.16,
    spawnCorridorGapScore: 0.28,
    spawnCorridorGapTurn: "right"
  },
  { frame: 2780, framebuffer: {} });
assert(lateClosedDoorPostDoorLeak.doorOpenedCount === 0, "Closed-door post-door leak guard must not synthesize a door-open milestone");
assert(lateClosedDoorPostDoorLeak.computerRoomFrames === 0, "Closed-door post-door leak guard should clear stale ComputerRoom frame budget");
assert(lateClosedDoorPostDoorLeak.computerRoomAdvanceFrames === 0, "Closed-door post-door leak guard should clear stale ComputerRoom advance budget");
assert(lateClosedDoorPostDoorLeak.objective === "find-and-open-first-door", "Closed-door post-door leak guard should restore the first-door objective");
assert(lateClosedDoorPostDoorLeak.controlPipeline !== "ComputerRoom", "Closed-door post-door leak guard should prevent ComputerRoom pipeline before the door opens");
assert(lateClosedDoorLeakAction.stage !== "ComputerRoom", "Closed-door post-door leak guard should not emit a ComputerRoom action");

const freshDoorTransitionState = new Supervisor({ log: () => {} });
freshDoorTransitionState.setEnabled(true);
freshDoorTransitionState.doorOpenedCount = 0;
freshDoorTransitionState.firstDoorCorridorLocated = true;
freshDoorTransitionState.firstDoorUseAttempted = true;
freshDoorTransitionState.pendingUseResponseFrames = 8;
freshDoorTransitionState.computerRoomFrames = 2;
freshDoorTransitionState.objective = "reach-central-hall";
freshDoorTransitionState.controlPipeline = "ComputerRoom";
assert(freshDoorTransitionState.closedFirstDoorPostDoorLeakActive() === false, "Fresh Use response window should not be cleared as a stale post-door leak");

const faceVitalWithoutNumericHealth = new Supervisor({ log: () => {} });
faceVitalWithoutNumericHealth.setEnabled(true);
const fixedFaceSample = Array.from({ length: 48 }, (_, index) => (index % 4 === 0 ? 180 : 96));
const fixedFaceFrame = {
  sample: Array.from({ length: 81 }, (_, index) => (index % 5 === 0 ? 128 : 72)),
  faceSample: fixedFaceSample,
  healthSample: [],
  healthHudReady: true,
  left: 0,
  right: 0,
  center: 0
};
const fixedFaceState = {
  sensors: { health: false },
  framebuffer: fixedFaceFrame,
  timestamp: 1000
};
faceVitalWithoutNumericHealth.applyControlRules(
  { move: "none", turn: "none", fire: false, strafe: false, use: false, run: false },
  fixedFaceState);
faceVitalWithoutNumericHealth.applyControlRules(
  { move: "none", turn: "none", fire: false, strafe: false, use: false, run: false },
  Object.assign({}, fixedFaceState, { timestamp: 1016 }));
assert(faceVitalWithoutNumericHealth.healthSensorSnapshot.active === true, "Face vital should stay active when face ROI is present even if numeric health sensor is disabled");
assert(faceVitalWithoutNumericHealth.healthSensorSnapshot.healthSensorEnabled === false, "Face vital test should keep numeric health explicitly disabled");
assert(faceVitalWithoutNumericHealth.healthSensorSnapshot.faceVitalEnabled === true, "Face vital flag should explain why heartbeat diagnostics are active");
assert(faceVitalWithoutNumericHealth.healthSensorSnapshot.faceNoHeartbeatFrames >= 1, "Fixed face ROI should advance no-heartbeat monitoring without numeric health");
assert(faceVitalWithoutNumericHealth.healthSensorSnapshot.faceHeartbeatAlive === false, "Fixed face ROI should not reset logical no-heartbeat monitoring");
assert(faceVitalWithoutNumericHealth.healthSensorSnapshot.faceHeartbeatOpacity > 0.6, "Fixed but observed face ROI should keep the HUD badge visibly alive while no-heartbeat monitoring runs");

const heartbeatOpacityDecay = new Supervisor({ log: () => {} });
heartbeatOpacityDecay.setEnabled(true);
heartbeatOpacityDecay.profile.healthNoHeartbeatDeathFrames = 20;
const pulseFaceA = Array.from({ length: 48 }, (_, index) => (index % 3 === 0 ? 190 : 82));
const pulseFaceB = Array.from({ length: 48 }, (_, index) => (index % 4 === 0 ? 72 : 166));
function createHeartbeatFrame(faceSample, timestamp) {
  return {
    sensors: { health: false },
    timestamp,
    framebuffer: {
      sample: Array.from({ length: 81 }, (_, index) => (index % 6 === 0 ? 132 : 70)),
      faceSample,
      healthSample: [],
      healthHudReady: true,
      healthFaceLifeLevel: 5,
      healthFaceLifePhase: "healthy",
      healthFaceTemplateConfidence: 0.86,
      left: 0,
      right: 0,
      center: 0
    }
  };
}
heartbeatOpacityDecay.applyControlRules(
  { move: "none", turn: "none", fire: false, strafe: false, use: false, run: false },
  createHeartbeatFrame(pulseFaceA, 1600));
heartbeatOpacityDecay.applyControlRules(
  { move: "none", turn: "none", fire: false, strafe: false, use: false, run: false },
  createHeartbeatFrame(pulseFaceB, 1616));
assert(heartbeatOpacityDecay.healthSensorSnapshot.faceHeartbeatAlive === true, "Face signature change should emit a heartbeat pulse even when life level stays constant");
assert(heartbeatOpacityDecay.healthSensorSnapshot.faceHeartbeatOpacity === 1, "Face signature pulse should restore heartbeat opacity");
assert(heartbeatOpacityDecay.healthSensorSnapshot.faceNoHeartbeatFrames === 0, "Accepted face heartbeat pulse should reset the public no-heartbeat counter to explicit zero");
assert(heartbeatOpacityDecay.healthNoHeartbeatFrames === 0, "Accepted face heartbeat pulse should reset the controller no-heartbeat counter to explicit zero");
heartbeatOpacityDecay.applyControlRules(
  { move: "none", turn: "none", fire: false, strafe: false, use: false, run: false },
  createHeartbeatFrame(pulseFaceB, 1632));
assert(heartbeatOpacityDecay.healthSensorSnapshot.faceHeartbeatAlive === false, "Face pose history should not masquerade as a current heartbeat pulse");
assert(heartbeatOpacityDecay.healthSensorSnapshot.faceHeartbeatOpacity < 1, "Face heartbeat opacity should decay when no current pulse is detected");
assert(heartbeatOpacityDecay.healthSensorSnapshot.faceHeartbeatOpacity > 0, "Recent face pose history should keep a visible fading heartbeat instead of disappearing instantly");
assert(heartbeatOpacityDecay.healthSensorSnapshot.faceNoHeartbeatFrames === 1, "First stable frame after a pulse should restart public no-heartbeat history from one");
assert(heartbeatOpacityDecay.healthNoHeartbeatFrames === 1, "First stable frame after a pulse should restart controller no-heartbeat history from one");

const semanticHeartbeat = new Supervisor({ log: () => {} });
semanticHeartbeat.setEnabled(true);
function createSemanticLifeFrame(level, phase, timestamp) {
  return {
    sensors: { health: false },
    timestamp,
    framebuffer: {
      sample: Array.from({ length: 81 }, (_, index) => (index % 6 === 0 ? 132 : 70)),
      faceSample: Array.from({ length: 48 }, () => 0),
      healthSample: [],
      healthHudReady: true,
      healthFaceLifeLevel: level,
      healthFaceLifePhase: phase,
      healthFaceTemplateConfidence: 0.86,
      left: 0,
      right: 0,
      center: 0
    }
  };
}
semanticHeartbeat.applyControlRules(
  { move: "none", turn: "none", fire: false, strafe: false, use: false, run: false },
  createSemanticLifeFrame(5, "healthy", 1700));
semanticHeartbeat.applyControlRules(
  { move: "none", turn: "none", fire: false, strafe: false, use: false, run: false },
  createSemanticLifeFrame(4, "wounded", 1716));
assert(semanticHeartbeat.healthSensorSnapshot.faceVitalEnabled === true, "Semantic face-life evidence should enable face vital diagnostics even when the raw face ROI is temporarily blank");
assert(semanticHeartbeat.healthSensorSnapshot.faceHeartbeatAlive === true, "Semantic face-life change should emit a heartbeat pulse when raw face pixels are unavailable");
assert(semanticHeartbeat.healthSensorSnapshot.faceHeartbeatOpacity === 1, "Semantic heartbeat pulse should restore the visible heart badge");
assert(semanticHeartbeat.healthSensorSnapshot.faceHeartbeatPulseKind === "semantic", "Semantic heartbeat pulse should be diagnosed separately from raw signature pulses");
semanticHeartbeat.applyControlRules(
  { move: "none", turn: "none", fire: false, strafe: false, use: false, run: false },
  createSemanticLifeFrame(4, "wounded", 1732));
assert(semanticHeartbeat.healthSensorSnapshot.faceHeartbeatAlive === false, "Stable semantic face-life evidence should not masquerade as a fresh heartbeat forever");
assert(semanticHeartbeat.healthSensorSnapshot.faceHeartbeatOpacity < 1, "Semantic heartbeat opacity should decay after the pulse");

const faceLifeTemporalFloor = new Supervisor({ log: () => {} });
faceLifeTemporalFloor.setEnabled(true);
faceLifeTemporalFloor.profile.healthFaceLifeMinWindowFrames = 9;
faceLifeTemporalFloor.profile.healthFaceRecoveryConfirmFrames = 7;
const faceLifeSample = Array.from({ length: 48 }, (_, index) => (index % 7 === 0 ? 190 : 88));
function createFaceLifeFrame(level, phase) {
  return {
    sample: Array.from({ length: 81 }, (_, index) => (index % 5 === 0 ? 128 : 72)),
    faceSample: faceLifeSample,
    healthSample: [],
    healthHudReady: true,
    healthFaceLifeLevel: level,
    healthFaceLifePhase: phase,
    healthFaceTemplateConfidence: 0.86,
    left: 0,
    right: 0,
    center: 0
  };
}
faceLifeTemporalFloor.applyControlRules(
  { move: "none", turn: "none", fire: false, strafe: false, use: false, run: false },
  { sensors: { health: false }, framebuffer: createFaceLifeFrame(1, "moribund"), timestamp: 1200 });
faceLifeTemporalFloor.applyControlRules(
  { move: "none", turn: "none", fire: false, strafe: false, use: false, run: false },
  { sensors: { health: false }, framebuffer: createFaceLifeFrame(5, "healthy"), timestamp: 1216 });
assert(faceLifeTemporalFloor.healthSensorSnapshot.faceLifeTemporalFloorApplied === true, "Face life temporal floor should hold recent low vital phase through a single high pose");
assert(faceLifeTemporalFloor.healthSensorSnapshot.faceLifeLevel === 1, "Face life temporal floor should keep moribund level before sustained recovery");
assert(faceLifeTemporalFloor.healthSensorSnapshot.faceLifeRecoveryFrames === 1, "Face life recovery should require multiple high frames before accepting recovery");

const lowLifeNoHeartbeatRetry = new Supervisor({ log: () => {} });
lowLifeNoHeartbeatRetry.setEnabled(true);
lowLifeNoHeartbeatRetry.profile.healthNoHeartbeatDeathFrames = 6;
lowLifeNoHeartbeatRetry.profile.healthDeathUxHoldFrames = 0;
for (let index = 0; index < 7; index += 1) {
  lowLifeNoHeartbeatRetry.applyControlRules(
    { move: "none", turn: "none", fire: false, strafe: false, use: false, run: false },
    { sensors: { health: false }, framebuffer: createFaceLifeFrame(1, "moribund"), timestamp: 1400 + index * 16, frame: index });
}
assert(lowLifeNoHeartbeatRetry.healthSensorSnapshot.lowLifeNoHeartbeatEvidence === true, "Low face vital phase plus missing heartbeat should expose retry evidence");
assert(lowLifeNoHeartbeatRetry.healthSensorSnapshot.likelyDead === true, "Low face vital phase plus missing heartbeat should become likely-dead evidence");
assert(lowLifeNoHeartbeatRetry.healthSensorSnapshot.retryRequested === true, "Low face vital no-heartbeat evidence should request retry after the UX hold is disabled");

const firstFrameMoribundNoHeartbeatRetry = new Supervisor({ log: () => {} });
firstFrameMoribundNoHeartbeatRetry.setEnabled(true);
firstFrameMoribundNoHeartbeatRetry.profile.healthNoHeartbeatDeathFrames = 1;
firstFrameMoribundNoHeartbeatRetry.profile.healthDeathUxHoldFrames = 0;
firstFrameMoribundNoHeartbeatRetry.applyControlRules(
  { move: "none", turn: "none", fire: false, strafe: false, use: false, run: false },
  {
    sensors: { health: false },
    timestamp: 1500,
    framebuffer: {
      sample: Array.from({ length: 81 }, (_, index) => (index % 5 === 0 ? 128 : 72)),
      faceSample: Array.from({ length: 48 }, (_, index) => (index % 3 === 0 ? 190 : 82)),
      healthSample: [],
      healthHudReady: true,
      healthFaceLifeLevel: 1,
      healthFaceLifePhase: "moribund",
      healthFaceTemplateConfidence: 0.78,
      healthFaceBloodScore: 0.78,
      healthFaceBloodRatio: 0.55,
      healthFaceDeathTintScore: 0.58,
      left: 0,
      right: 0,
      center: 0
    }
  });
assert(firstFrameMoribundNoHeartbeatRetry.healthSensorSnapshot.healthFaceTemplateConfidence >= 0.78, "Moribund face confidence alias should survive into the health snapshot");
assert(firstFrameMoribundNoHeartbeatRetry.healthSensorSnapshot.faceNoHeartbeatFrames >= 1, "Moribund first-frame face evidence should advance no-heartbeat monitoring even when raw delta is maximal");
assert(firstFrameMoribundNoHeartbeatRetry.healthSensorSnapshot.retryRequested === true, "Moribund first-frame no-heartbeat evidence should request retry when the threshold is reached");

const postDoorEgressWallPressure = new Supervisor({ log: () => {} });
postDoorEgressWallPressure.setEnabled(true);
postDoorEgressWallPressure.doorOpenedCount = 1;
postDoorEgressWallPressure.computerRoomEntered = true;
postDoorEgressWallPressure.centralHallEntered = false;
postDoorEgressWallPressure.objective = "reach-central-hall";
postDoorEgressWallPressure.bridgeLaneTurn = "right";
postDoorEgressWallPressure.bridgeBrownScore = 0.46;
postDoorEgressWallPressure.bridgeGreenRight = 0.24;
postDoorEgressWallPressure.bridgeGreenLeft = 0.04;
postDoorEgressWallPressure.footObstacleScore = 0.64;
postDoorEgressWallPressure.motionObstacleScore = 0.63;
postDoorEgressWallPressure.computerRoomAdvanceFrames = 40;
const postDoorEgressWallAction = postDoorEgressWallPressure.computerRoomAdvanceAction(
  { wallVector: 0.38, depthSig: 0.82, stuckTicks: 0, footObstacleScore: 0.64 },
  { frame: 2100 });
assert(postDoorEgressWallAction.move === "forward", "ComputerRoom egress should keep forward pressure toward the cross-bridge");
assert(postDoorEgressWallAction.turn === "left", "ComputerRoom egress should release right-wall pressure with a left correction instead of following stale right cues");
assert(postDoorEgressWallAction.strafe === true, "ComputerRoom egress should use lateral trim while wall/foot pressure is high");
assert(postDoorEgressWallPressure.safetyReason === "post-door-computer-room-egress-left-wall-parallel", "ComputerRoom egress should expose the post-door wall-parallel mode");

const postDoorEgressRightCue = new Supervisor({ log: () => {} });
postDoorEgressRightCue.setEnabled(true);
postDoorEgressRightCue.doorOpenedCount = 1;
postDoorEgressRightCue.computerRoomEntered = true;
postDoorEgressRightCue.centralHallEntered = false;
postDoorEgressRightCue.objective = "reach-central-hall";
postDoorEgressRightCue.bridgeLaneTurn = "right";
postDoorEgressRightCue.bridgeBrownScore = 0.50;
postDoorEgressRightCue.bridgeGreenRight = 0.06;
postDoorEgressRightCue.bridgeGreenLeft = 0.04;
postDoorEgressRightCue.footObstacleScore = 0.18;
postDoorEgressRightCue.motionObstacleScore = 0.12;
postDoorEgressRightCue.computerRoomAdvanceFrames = 40;
const postDoorEgressRightCueAction = postDoorEgressRightCue.computerRoomAdvanceAction(
  { wallVector: 0.05, depthSig: 0.82, stuckTicks: 0, footObstacleScore: 0.18 },
  { frame: 2116 });
assert(postDoorEgressRightCueAction.turn === "right", "ComputerRoom egress may follow the right bridge cue only when wall pressure is low");
assert(postDoorEgressRightCueAction.strafe === false, "ComputerRoom egress should not strafe during a clean right cue");

console.log("DOOM_BONSAI_RESET_VM_TEST_OK", {
  objective: resetStatus.objective,
  pipeline: resetStatus.controlPipeline
});
