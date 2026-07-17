import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const sourcePath = path.join(root, "src", "DoomWeb", "wwwroot", "js", "autoplay", "csharp-post-computer-room-route-adapter.js");
const demoPath = path.join(root, "src", "DoomWeb", "wwwroot", "demo", "doom", "js", "autoplay", "csharp-post-computer-room-route-adapter.js");
const source = readFileSync(sourcePath, "utf8");
const demo = readFileSync(demoPath, "utf8");
assert.equal(source, demo, "source/demo post-COMPUTERROOM adapters must remain byte-identical");

let bridgeDecision = null;
const sandbox = {
  console,
  JSON,
  Number,
  Boolean,
  String,
  Error,
  Object,
  Array,
  Set,
  Math,
  self: {
    aiKernelDoomControl: {
      evaluateBrowserPostComputerRoomRoute() {
        return bridgeDecision;
      }
    }
  }
};
sandbox.window = sandbox.self;
vm.runInContext(source, vm.createContext(sandbox), { filename: sourcePath });
const adapter = sandbox.self.AIKernelDoomCSharpPostComputerRoomRoute;
assert.equal(adapter.contractVersion, 2);

const firstDoorPacket = {
  input: {
    nativeLevelFactsAvailable: true,
    nativeGametic: 300,
    rawObservation: {
      available: true,
      frameSequence: 501,
      nativeGameticObservedAtEvaluation: 300
    }
  },
  decision: {
    sessionId: "session-1",
    runId: "run-1",
    runGeneration: 3,
    controlTick: 101
  }
};
const runtime = {
  autoplayVisualEnemyVisible: true,
  autoplayVisualEnemyCentered: false,
  autoplayVisualEnemyFireReady: false,
  autoplayVisualEnemyYaw: 18,
  autoplayEnemyConfidence: 0.76
};
const enemyRegion9Sample = [0.01, 0.01, 0, 0, 0.14, 0.01, 0, 0.14, 0];
const nativeFacts = {
  run: { available: true, gametic: 300 },
  player: {
    weapon: {
      available: true,
      stateCount: 967,
      readyWeapon: 1,
      pendingWeapon: 10,
      weaponState: 100,
      readyState: 100,
      refire: 0
    }
  },
  actorSnapshot: {
    available: true,
    gametic: 300,
    count: 2,
    capacity: 64,
    truncated: false,
    actors: [
      {
        identity: 0xf0000000,
        xFixed: 135266304,
        yFixed: -173015040,
        sectorIndex: 54,
        type: 1,
        health: 60,
        flags: 0x00400004,
        lineOfSight: true
      },
      {
        identity: 0x00123456,
        xFixed: 136314880,
        yFixed: -174063616,
        sectorIndex: 59,
        type: 2,
        health: -5,
        flags: 0x00500004,
        lineOfSight: false
      }
    ]
  }
};
const input = adapter.createInput(runtime, firstDoorPacket, {}, {
  framebuffer: { enemyRegion9Sample }
}, nativeFacts);
assert.notEqual(input.combatObservation.enemyRegion9Sample, enemyRegion9Sample);
assert.notEqual(input.actorSnapshot, nativeFacts.actorSnapshot);
assert.notEqual(input.actorSnapshot.actors, nativeFacts.actorSnapshot.actors);
assert.notEqual(input.actorSnapshot.actors[0], nativeFacts.actorSnapshot.actors[0]);
assert.notEqual(input.weaponSnapshot, nativeFacts.player.weapon);
nativeFacts.actorSnapshot.actors[0].health = 1;
nativeFacts.actorSnapshot.actors[0].sectorIndex = 59;
assert.equal(input.actorSnapshot.actors[0].health, 60, "native actor rows must be cloned before crossing the C# wire");
assert.equal(input.actorSnapshot.actors[0].sectorIndex, 54, "native actor sector rows must be cloned before crossing the C# wire");
nativeFacts.actorSnapshot.actors[0].health = 60;
nativeFacts.actorSnapshot.actors[0].sectorIndex = 54;
nativeFacts.player.weapon.weaponState = 101;
assert.equal(input.weaponSnapshot.weaponState, 100, "native weapon facts must be cloned before crossing the C# wire");
nativeFacts.player.weapon.weaponState = 100;
assert.deepEqual(JSON.parse(JSON.stringify(input)), {
  contractVersion: 2,
  sessionId: "session-1",
  runId: "run-1",
  runGeneration: 3,
  expectedFirstDoorControlTick: 101,
  actorSnapshot: {
    available: true,
    gametic: 300,
    count: 2,
    capacity: 64,
    truncated: false,
    actors: [
      {
        identity: 0xf0000000,
        xFixed: 135266304,
        yFixed: -173015040,
        sectorIndex: 54,
        type: 1,
        health: 60,
        flags: 0x00400004,
        lineOfSight: true
      },
      {
        identity: 0x00123456,
        xFixed: 136314880,
        yFixed: -174063616,
        sectorIndex: 59,
        type: 2,
        health: -5,
        flags: 0x00500004,
        lineOfSight: false
      }
    ]
  },
  weaponSnapshot: {
    available: true,
    gametic: 300,
    stateCount: 967,
    readyWeapon: 1,
    pendingWeapon: 10,
    weaponState: 100,
    weaponReadyState: 100,
    refire: 0
  },
  combatObservation: {
    rawFrameSequence: 501,
    rawNativeGametic: 300,
    enemyRegion9Sample,
    visualEnemyVisible: true,
    visualEnemyCentered: false,
    visualEnemyFireReady: false,
    enemyStructuralDecoy: false,
    enemyConfidence: 0.76,
    visualEnemyYaw: 18
  }
});

const unavailableStructuredInput = adapter.createInput(runtime, {
  input: { rawObservation: { available: false } },
  decision: firstDoorPacket.decision
}, {}, { framebuffer: { enemyRegion9Sample } });
assert.equal(unavailableStructuredInput.combatObservation.rawFrameSequence, -1);
assert.equal(unavailableStructuredInput.combatObservation.rawNativeGametic, -1);
assert.deepEqual(
  JSON.parse(JSON.stringify(unavailableStructuredInput.combatObservation.enemyRegion9Sample)),
  []);

for (const rawObservation of [
  { available: true, frameSequence: -1, nativeGameticObservedAtEvaluation: -1 },
  { available: true, frameSequence: 777, nativeGameticObservedAtEvaluation: -1 },
  { available: true, frameSequence: -1, nativeGameticObservedAtEvaluation: 333 }
]) {
  const sentinelInput = adapter.createInput(runtime, {
    input: { rawObservation },
    decision: firstDoorPacket.decision
  }, {}, { framebuffer: { enemyRegion9Sample } });
  assert.equal(sentinelInput.combatObservation.rawFrameSequence, -1);
  assert.equal(sentinelInput.combatObservation.rawNativeGametic, -1);
  assert.deepEqual(
    JSON.parse(JSON.stringify(sentinelInput.combatObservation.enemyRegion9Sample)),
    []);
}

for (const invalidSample of [
  [0, 0],
  [0, 0, 0, 0, Number.NaN, 0, 0, 0, 0],
  [0, 0, 0, 0, 1.01, 0, 0, 0, 0]
]) {
  assert.throws(
    () => adapter.createInput(runtime, firstDoorPacket, {}, {
      framebuffer: { enemyRegion9Sample: invalidSample }
    }),
    error => error?.aikernelCSharpNextOwner === true && /enemyRegion9Sample/.test(error.message));
}

const unavailableActorInput = adapter.createInput(runtime, firstDoorPacket, {}, {}, {
  run: { available: true, gametic: 300 },
  actorSnapshot: { available: false, gametic: 999, count: 4, capacity: 64, truncated: true, actors: [{}] }
});
assert.deepEqual(JSON.parse(JSON.stringify(unavailableActorInput.actorSnapshot)), {
  available: false,
  gametic: -1,
  count: 0,
  capacity: 0,
  truncated: false,
  actors: []
}, "unavailable actor facts must be canonicalized without leaking stale rows");

const unavailableWeaponInput = adapter.createInput(runtime, firstDoorPacket, {}, {}, {
  run: { available: true, gametic: 300 },
  player: { weapon: { available: false, readyWeapon: 1, weaponState: 100 } }
});
assert.deepEqual(JSON.parse(JSON.stringify(unavailableWeaponInput.weaponSnapshot)), {
  available: false,
  gametic: -1,
  stateCount: -1,
  readyWeapon: -1,
  pendingWeapon: -1,
  weaponState: -1,
  weaponReadyState: -1,
  refire: -1
}, "unavailable weapon facts must use canonical sentinels");

for (const mutate of [
  weapon => { weapon.stateCount = 0; },
  weapon => { weapon.readyWeapon = 9; },
  weapon => { weapon.pendingWeapon = 9; },
  weapon => { weapon.weaponState = -1; },
  weapon => { weapon.weaponState = weapon.stateCount; },
  weapon => { weapon.readyState = "100"; },
  weapon => { weapon.refire = -1; }
]) {
  const malformed = JSON.parse(JSON.stringify(nativeFacts));
  mutate(malformed.player.weapon);
  assert.throws(
    () => adapter.createInput(runtime, firstDoorPacket, {}, {}, malformed),
    error => error?.aikernelCSharpNextOwner === true && /native weapon/.test(error.message),
    "malformed native weapon facts must fail before C# evaluation");
}

for (const mutate of [
  facts => { facts.actorSnapshot.gametic = 299; },
  facts => { facts.actorSnapshot.capacity = 65; },
  facts => { facts.actorSnapshot.count = 1; },
  facts => { facts.actorSnapshot.actors[1].identity = facts.actorSnapshot.actors[0].identity; },
  facts => { facts.actorSnapshot.actors[0].sectorIndex = -2; },
  facts => { facts.actorSnapshot.actors[0].lineOfSight = 1; },
  facts => { facts.actorSnapshot.actors[0].flags = -1; }
]) {
  const malformed = JSON.parse(JSON.stringify(nativeFacts));
  mutate(malformed);
  assert.throws(
    () => adapter.createInput(runtime, firstDoorPacket, {}, {}, malformed),
    error => error?.aikernelCSharpNextOwner === true && /actorSnapshot|native run|FirstDoor/.test(error.message),
    "malformed native actor snapshots must fail before C# evaluation");
}

const staleFirstDoorPacket = JSON.parse(JSON.stringify(firstDoorPacket));
staleFirstDoorPacket.input.nativeGametic = 299;
assert.throws(
  () => adapter.createInput(runtime, staleFirstDoorPacket, {}, {}, nativeFacts),
  error => error?.aikernelCSharpNextOwner === true && /FirstDoor input.nativeGametic/.test(error.message),
  "actor snapshots must share the FirstDoor native gametic");

function decision(overrides = {}) {
  return {
    implementationVersion: "post-computer-room-route-v8",
    policyVersion: "post-computer-room-route-policy-v8",
    contractVersion: 2,
    sessionId: "session-1",
    runId: "run-1",
    runGeneration: 3,
    controlTick: 101,
    expectedFirstDoorControlTick: 101,
    nativeGametic: 300,
    state: "InterceptEnemy",
    ownershipDisposition: "Exclusive",
    ownerId: "post-computer-room.combat",
    reasonCode: "trusted-enemy-intercept",
    action: {
      moveForward: false,
      moveBackward: false,
      strafeLeft: false,
      strafeRight: false,
      turnYaw: 12,
      useKey: false,
      attackKey: false
    },
    runRequested: false,
    exclusive: true,
    completed: false,
    combatObservation: JSON.parse(JSON.stringify(input.combatObservation)),
    actorSnapshot: JSON.parse(JSON.stringify(input.actorSnapshot)),
    weaponSnapshot: JSON.parse(JSON.stringify(input.weaponSnapshot)),
    navigation: {
      snapshotVersion: 7,
      trustedCombatEvidence: true,
      legacyTrustedCombatEvidence: true,
      structuredCombatInputAccepted: false,
      structuredCombatFresh: false,
      structuredCombatCandidate: false,
      structuredCombatTrusted: false,
      structuredCombatDistinctFrames: 0,
      structuredCombatPeak: 0,
      structuredCombatTotal: 0,
      structuredCombatSupportCells: 0,
      structuredCombatCenterCell: 0,
      structuredCombatLateralBias: 0,
      structuredCombatCentered: false,
      structuredCombatReason: "structured-combat-not-evaluated",
      playerSectorIndex: 54,
      nativeActorSnapshotAccepted: true,
      nativeActorSnapshotFresh: true,
      nativeActorVisualEvidenceTrusted: true,
      nativeActorMatched: true,
      nativeActorTargetRetained: false,
      nativeActorCombatTrusted: true,
      nativeActorKillConfirmed: false,
      nativeActorTargetIdentity: 0xf0000000,
      nativeActorTargetType: 1,
      nativeActorTargetSectorIndex: 54,
      nativeActorTargetHealth: 60,
      nativeActorTargetFlags: 0x00400004,
      nativeActorTargetLineOfSight: true,
      nativeActorTopologyAccepted: true,
      nativeActorTopologyReason: "native-actor-topology-current-sector",
      nativeActorTargetBearingDegrees: 18,
      nativeActorTargetBearingErrorDegrees: 18,
      nativeActorEngagementFrames: 1,
      nativeActorKillCountAtAcquisition: 1,
      nativeActorCurrentKillCount: 1,
      nativeActorCombatReason: "native-actor-target-acquired",
      nativeWeaponSnapshotAccepted: true,
      nativeWeaponSnapshotFresh: true,
      nativeWeaponStateCount: 967,
      nativeReadyWeapon: 1,
      nativePendingWeapon: 10,
      nativeWeaponState: 100,
      nativeWeaponReadyState: 100,
      nativeWeaponRefire: 0,
      nativeWeaponFireOpportunity: true,
      nativeWeaponContinuationArmed: false,
      nativeWeaponContinuationTargetIdentity: 0,
      nativeWeaponContinuationReadyWeapon: -1,
      nativeWeaponContinuationAuthorizedAtControlTick: -1,
      nativeWeaponAttackContinuation: false,
      nativeWeaponReason: "native-weapon-fire-opportunity",
      failureCode: ""
    },
    failureTrace: {
      failed: false,
      failureAtControlTick: -1,
      failureCode: "",
      failureSnapshot: null,
      replay: []
    },
    completionTrace: {
      completed: false,
      sessionId: "",
      runId: "",
      runGeneration: 0,
      completionAtControlTick: -1,
      completionCode: "",
      completionSnapshot: null,
      replay: []
    },
    semanticProjection: {
      telos: "CentralHall",
      objective: "reach-central-hall",
      computerRoomEntered: true,
      centralHallEntered: false,
      firstDoorOpenConfirmationSource: "TrustedAudio"
    },
    ...overrides
  };
}

bridgeDecision = decision();
const intercept = adapter.evaluate(input);
const interceptDispatch = adapter.dispatch(intercept);
assert.equal(interceptDispatch.mode, "exclusive");
assert.equal(interceptDispatch.exact, true);
assert.equal(interceptDispatch.action.turn, "right");
assert.equal(interceptDispatch.action.fire, false);
assert.equal(interceptDispatch.semanticState.ownerId, "post-computer-room.combat");
assert.equal(interceptDispatch.semanticState.state, "InterceptEnemy");
assert.equal(interceptDispatch.semanticState.telos, "CentralHall");

bridgeDecision = decision({
  state: "AwaitComputerRoomConfirmation",
  ownerId: "post-computer-room.main-route",
  reasonCode: "computer-room-confirmation-pending",
  action: {
    moveForward: false,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: false,
    attackKey: false
  },
  semanticProjection: {
    telos: "PostDoor",
    objective: "enter-computer-room",
    computerRoomEntered: false,
    centralHallEntered: false,
    firstDoorOpenConfirmationSource: "TrustedAudio"
  }
});
const awaitingRoom = adapter.dispatch(adapter.evaluate(input));
assert.equal(awaitingRoom.semanticState.telos, "PostDoor");
assert.equal(awaitingRoom.semanticState.objective, "enter-computer-room");
assert.equal(awaitingRoom.semanticState.computerRoomEntered, false);
assert.equal(awaitingRoom.semanticState.ownerId, "post-computer-room.main-route");

bridgeDecision = decision({
  state: "FireReady",
  reasonCode: "trusted-front-enemy-fire",
  action: {
    moveForward: false,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: false,
    attackKey: true
  }
});
assert.equal(adapter.dispatch(adapter.evaluate(input)).action.fire, true, "centered C# FireReady must project attack");

bridgeDecision = decision({
  state: "FireReady",
  reasonCode: "trusted-front-enemy-fire",
  action: {
    moveForward: true,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: false,
    attackKey: true
  }
});
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /Attack must be stationary/.test(error.message),
  "Attack cannot be combined with route movement");

bridgeDecision = decision({
  state: "NavigateMainRoute",
  ownerId: "post-computer-room.main-route",
  reasonCode: "post-computer-room-main-route",
  action: {
    moveForward: true,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: false,
    attackKey: false
  },
  runRequested: true
});
const decoyRoute = adapter.dispatch(adapter.evaluate(input));
assert.equal(decoyRoute.action.move, "forward");
assert.equal(decoyRoute.action.fire, false, "route-owned structural decoy decisions must not fire");

const completionAction = {
  moveForward: false,
  moveBackward: false,
  strafeLeft: false,
  strafeRight: false,
  turnYaw: 0,
  useKey: false,
  attackKey: false
};
const completionNavigation = {
  ...JSON.parse(JSON.stringify(decision().navigation)),
  active: true,
  recoveringEnemyAlcove: false,
  playerSectorIndex: 60,
  playerX: 2944,
  playerY: -3024,
  legIndex: 8,
  legId: "central-hall-entry",
  targetX: 2944,
  targetY: -3024,
  allowedSectors: [60, 71],
  routeFrames: 899,
  routeTimeoutFrames: 900,
  routeRemainingFrames: 1,
  legFrames: 179,
  legTimeoutFrames: 180,
  legRemainingFrames: 1
};
const completionReplayEntry = {
  controlTick: 101,
  nativeGametic: 300,
  state: "Complete",
  reasonCode: "central-hall-entry-confirmed",
  playerSectorIndex: 60,
  playerX: 2944,
  playerY: -3024,
  legIndex: 8,
  legId: "central-hall-entry",
  routeFrames: 899,
  legFrames: 179,
  nativeActorTargetIdentity: completionNavigation.nativeActorTargetIdentity,
  nativeActorTargetSectorIndex: completionNavigation.nativeActorTargetSectorIndex,
  nativeActorTargetHealth: completionNavigation.nativeActorTargetHealth,
  nativeActorTargetLineOfSight: completionNavigation.nativeActorTargetLineOfSight,
  nativeActorTargetBearingErrorDegrees:
    completionNavigation.nativeActorTargetBearingErrorDegrees,
  nativeActorTopologyAccepted: completionNavigation.nativeActorTopologyAccepted,
  nativeActorTopologyReason: completionNavigation.nativeActorTopologyReason,
  nativeActorEngagementFrames: completionNavigation.nativeActorEngagementFrames,
  nativeActorCombatReason: completionNavigation.nativeActorCombatReason,
  nativeWeaponSnapshotAccepted: completionNavigation.nativeWeaponSnapshotAccepted,
  nativeWeaponSnapshotFresh: completionNavigation.nativeWeaponSnapshotFresh,
  nativeWeaponStateCount: completionNavigation.nativeWeaponStateCount,
  nativeReadyWeapon: completionNavigation.nativeReadyWeapon,
  nativePendingWeapon: completionNavigation.nativePendingWeapon,
  nativeWeaponFireOpportunity: completionNavigation.nativeWeaponFireOpportunity,
  nativeWeaponContinuationArmed: completionNavigation.nativeWeaponContinuationArmed,
  nativeWeaponContinuationTargetIdentity:
    completionNavigation.nativeWeaponContinuationTargetIdentity,
  nativeWeaponContinuationReadyWeapon:
    completionNavigation.nativeWeaponContinuationReadyWeapon,
  nativeWeaponContinuationAuthorizedAtControlTick:
    completionNavigation.nativeWeaponContinuationAuthorizedAtControlTick,
  nativeWeaponAttackContinuation: completionNavigation.nativeWeaponAttackContinuation,
  nativeWeaponState: completionNavigation.nativeWeaponState,
  nativeWeaponReadyState: completionNavigation.nativeWeaponReadyState,
  nativeWeaponRefire: completionNavigation.nativeWeaponRefire,
  nativeWeaponReason: completionNavigation.nativeWeaponReason,
  action: JSON.parse(JSON.stringify(completionAction)),
  runRequested: false
};
const canonicalCompletedDecision = decision({
  state: "Complete",
  ownershipDisposition: "Completed",
  ownerId: "post-computer-room.central-hall",
  reasonCode: "central-hall-entry-confirmed",
  action: completionAction,
  runRequested: false,
  exclusive: false,
  completed: true,
  proximity: { playerSectorIndex: 60 },
  navigation: completionNavigation,
  completionTrace: {
    completed: true,
    sessionId: "session-1",
    runId: "run-1",
    runGeneration: 3,
    completionAtControlTick: 101,
    completionCode: "central-hall-entry-confirmed",
    completionSnapshot: JSON.parse(JSON.stringify(completionReplayEntry)),
    replay: [JSON.parse(JSON.stringify(completionReplayEntry))]
  },
  semanticProjection: {
    telos: "CentralHall",
    objective: "reach-central-hall",
    computerRoomEntered: true,
    centralHallEntered: true,
    firstDoorOpenConfirmationSource: "TrustedAudio"
  }
});
bridgeDecision = JSON.parse(JSON.stringify(canonicalCompletedDecision));
const completedFirstDoorSemanticState = {
  sessionId: input.sessionId,
  runId: input.runId,
  runGeneration: input.runGeneration,
  controlTick: input.expectedFirstDoorControlTick,
  firstDoorOpened: true,
  computerRoomEntered: true,
  doorOpenedCount: 1,
  source: "TrustedAudio",
  ownerId: "first-door.computer-room-entry-confirmation",
  state: "Complete",
  reasonCode: "computer-room-entry-confirmed"
};
let completedNextOwnerState = null;
const completed = adapter.dispatch(adapter.evaluate(input), {
  legacyState: {
    next: true,
    milestones: { doorOpened: 1 },
    csharpFirstDoorSemanticState: completedFirstDoorSemanticState
  },
  legacyPredict: state => {
    completedNextOwnerState = state;
    return { move: state.next ? "forward" : "none" };
  }
});
assert.equal(completed.mode, "completed");
assert.equal(completed.exact, false);
assert.equal(completed.action.move, "forward");
assert.equal(completed.semanticState.ownerId, "post-computer-room.central-hall");
assert.equal(completed.semanticState.state, "Complete");
assert.equal(completed.semanticState.centralHallEntered, true);
assert.equal(completedNextOwnerState.centralHallEntered, true);
assert.equal(completedNextOwnerState.computerRoomEntered, true);
assert.equal(completedNextOwnerState.telos, "CentralHall");
assert.equal(completedNextOwnerState.objective, "reach-central-hall");
assert.equal(completedNextOwnerState.milestones.centralHallEntered, true);
assert.deepEqual(
  JSON.parse(JSON.stringify(completedNextOwnerState.csharpFirstDoorSemanticState)),
  JSON.parse(JSON.stringify(completedFirstDoorSemanticState)),
  "post-route overlay must preserve the committed FirstDoor namespace");
assert.equal(completedNextOwnerState.csharpPostComputerRoomSemanticState.state, "Complete");
assert.equal(completedNextOwnerState.csharpPostComputerRoomSemanticState.ownerId, "post-computer-room.central-hall");

let completedWithoutFirstDoorState = null;
adapter.dispatch(adapter.evaluate(input), {
  legacyState: { next: true, milestones: { doorOpened: 1 } },
  legacyPredict: state => {
    completedWithoutFirstDoorState = state;
    return { move: "none" };
  }
});
assert.equal(
  Object.prototype.hasOwnProperty.call(completedWithoutFirstDoorState, "csharpFirstDoorSemanticState"),
  false,
  "post-route overlay must not synthesize FirstDoor proof from post semantics");
assert.equal(
  completedWithoutFirstDoorState.csharpPostComputerRoomSemanticState.ownerId,
  "post-computer-room.central-hall");

const delayedCompletedDecision = JSON.parse(JSON.stringify(canonicalCompletedDecision));
delayedCompletedDecision.controlTick = 400;
delayedCompletedDecision.navigation.playerSectorIndex = 59;
delayedCompletedDecision.proximity.playerSectorIndex = 59;
bridgeDecision = delayedCompletedDecision;
assert.equal(
  adapter.evaluate(input).completionTrace.completionAtControlTick,
  101,
  "delayed Complete projection must retain the exact frozen completion tick");
assert.equal(
  adapter.evaluate(input).navigation.playerSectorIndex,
  59,
  "delayed Complete must echo the current next-owner sector without rewriting frozen sector-60 proof");
assert.equal(
  adapter.evaluate(input).completionTrace.completionSnapshot.playerSectorIndex,
  60,
  "delayed Complete must retain the immutable sector-60 completion snapshot");

bridgeDecision = decision({ completionTrace: undefined });
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /completionTrace is required/.test(error.message),
  "every post-route decision must carry the typed completion trace");

const nonCompleteReplay = decision();
nonCompleteReplay.completionTrace.replay = [JSON.parse(JSON.stringify(completionReplayEntry))];
bridgeDecision = nonCompleteReplay;
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /non-complete completionTrace/.test(error.message),
  "non-complete decisions must retain empty completion sentinels and no replay");

const nonCompleteCode = decision();
nonCompleteCode.completionTrace.completionCode = "central-hall-entry-confirmed";
bridgeDecision = nonCompleteCode;
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /completion code/.test(error.message),
  "non-complete decisions cannot retain a terminal completion code");

for (const [description, mutate] of [
  ["session", trace => { trace.sessionId = "old-session"; }],
  ["run", trace => { trace.runId = "old-run"; }],
  ["generation", trace => { trace.runGeneration = 1; }],
  ["tick", trace => { trace.completionAtControlTick = 0; }],
  ["snapshot", trace => {
    trace.completionSnapshot = JSON.parse(JSON.stringify(completionReplayEntry));
  }]
]) {
  const malformed = decision();
  mutate(malformed.completionTrace);
  bridgeDecision = malformed;
  assert.throws(
    () => adapter.evaluate(input),
    error => error?.aikernelCSharpNextOwner === true && /non-complete completionTrace/.test(error.message),
    `non-complete completion ${description} must use its exact empty sentinel`);
}

const transplantedOldRunTrace = JSON.parse(JSON.stringify(canonicalCompletedDecision));
transplantedOldRunTrace.completionTrace.sessionId = "old-session";
transplantedOldRunTrace.completionTrace.runId = "old-run";
transplantedOldRunTrace.completionTrace.runGeneration = 2;
bridgeDecision = transplantedOldRunTrace;
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /run scope/.test(error.message),
  "a structurally valid frozen completion trace from an old run must fail closed");

for (const [description, mutate] of [
  ["state-only Complete", value => { value.state = "Complete"; }],
  ["disposition-only Completed", value => { value.ownershipDisposition = "Completed"; }],
  ["flag-only completed", value => { value.completed = true; }],
  ["state/disposition without flag", value => {
    value.state = "Complete";
    value.ownershipDisposition = "Completed";
  }]
]) {
  const partialTerminal = decision();
  mutate(partialTerminal);
  bridgeDecision = partialTerminal;
  assert.throws(
    () => adapter.evaluate(input),
    error => error?.aikernelCSharpNextOwner === true
      && /completionTrace\.completed/.test(error.message),
    `${description} must not bypass completion-trace equivalence`);
}

for (const [description, mutate] of [
  ["completion flag", value => { value.completionTrace.completed = false; }],
  ["future completion tick", value => {
    value.completionTrace.completionAtControlTick = 102;
    value.completionTrace.completionSnapshot.controlTick = 102;
    value.completionTrace.replay[0].controlTick = 102;
  }],
  ["completion tick mismatch", value => { value.completionTrace.completionAtControlTick = 100; }],
  ["completion code type", value => { value.completionTrace.completionCode = 1; }],
  ["completion code", value => { value.completionTrace.completionCode = "other"; }],
  ["missing completion snapshot", value => { value.completionTrace.completionSnapshot = null; }],
  ["empty completion replay", value => { value.completionTrace.replay = []; }],
  ["completion replay order", value => {
    value.completionTrace.replay.unshift(
      JSON.parse(JSON.stringify(value.completionTrace.replay[0])));
  }],
  ["terminal replay identity", value => {
    value.completionTrace.replay[0].nativeActorTargetHealth += 1;
  }],
  ["terminal state", value => {
    value.completionTrace.completionSnapshot.state = "NavigateMainRoute";
    value.completionTrace.replay[0].state = "NavigateMainRoute";
  }],
  ["terminal reason", value => {
    value.completionTrace.completionSnapshot.reasonCode = "other";
    value.completionTrace.replay[0].reasonCode = "other";
  }],
  ["terminal sector", value => {
    value.completionTrace.completionSnapshot.playerSectorIndex = 59;
    value.completionTrace.replay[0].playerSectorIndex = 59;
  }],
  ["terminal leg index", value => {
    value.completionTrace.completionSnapshot.legIndex = 7;
    value.completionTrace.replay[0].legIndex = 7;
  }],
  ["terminal leg id", value => {
    value.completionTrace.completionSnapshot.legId = "sector-71-south-lane";
    value.completionTrace.replay[0].legId = "sector-71-south-lane";
  }],
  ["route deadline", value => {
    value.completionTrace.completionSnapshot.routeFrames = 900;
    value.completionTrace.replay[0].routeFrames = 900;
  }],
  ["negative route frame", value => {
    value.completionTrace.completionSnapshot.routeFrames = -1;
    value.completionTrace.replay[0].routeFrames = -1;
  }],
  ["leg deadline", value => {
    value.completionTrace.completionSnapshot.legFrames = 180;
    value.completionTrace.replay[0].legFrames = 180;
  }],
  ["non-integer leg frame", value => {
    value.completionTrace.completionSnapshot.legFrames = 179.5;
    value.completionTrace.replay[0].legFrames = 179.5;
  }],
  ["terminal movement", value => {
    value.completionTrace.completionSnapshot.action.moveForward = true;
    value.completionTrace.replay[0].action.moveForward = true;
  }],
  ["terminal run", value => {
    value.completionTrace.completionSnapshot.runRequested = true;
    value.completionTrace.replay[0].runRequested = true;
  }],
  ["current route counter", value => { value.navigation.routeFrames = 898; }],
  ["current leg counter", value => { value.navigation.legFrames = 178; }],
  ["current route remaining", value => { value.navigation.routeRemainingFrames = 0; }],
  ["current leg remaining", value => { value.navigation.legRemainingFrames = 0; }],
  ["current route timeout", value => { value.navigation.routeTimeoutFrames = 901; }],
  ["current leg timeout", value => { value.navigation.legTimeoutFrames = 181; }],
  ["current/proximity sector mismatch", value => { value.navigation.playerSectorIndex = 59; }],
  ["current inactive route", value => { value.navigation.active = false; }],
  ["current alcove recovery", value => { value.navigation.recoveringEnemyAlcove = true; }],
  ["current terminal leg", value => { value.navigation.legIndex = 7; }],
  ["current terminal leg id", value => { value.navigation.legId = "other"; }],
  ["current terminal target x", value => { value.navigation.targetX = 2943; }],
  ["current terminal target y", value => { value.navigation.targetY = -3023; }],
  ["current terminal sectors", value => { value.navigation.allowedSectors = [71, 60]; }],
  ["current terminal failure code", value => { value.navigation.failureCode = "stale-failure"; }],
  ["current terminal state", value => { value.state = "NavigateMainRoute"; }],
  ["current terminal disposition", value => { value.ownershipDisposition = "Exclusive"; }],
  ["current terminal owner", value => { value.ownerId = "post-computer-room.main-route"; }],
  ["current terminal reason", value => { value.reasonCode = "other"; }],
  ["current terminal completed flag", value => { value.completed = false; }],
  ["current terminal exclusive flag", value => { value.exclusive = true; }],
  ["missing terminal semantics", value => { value.semanticProjection = null; }],
  ["COMPUTERROOM semantic false", value => {
    value.semanticProjection.computerRoomEntered = false;
  }],
  ["central-hall semantic false", value => {
    value.semanticProjection.centralHallEntered = false;
  }],
  ["current terminal movement", value => { value.action.moveForward = true; }],
  ["current terminal run", value => { value.runRequested = true; }]
]) {
  const malformed = JSON.parse(JSON.stringify(canonicalCompletedDecision));
  mutate(malformed);
  bridgeDecision = malformed;
  assert.throws(
    () => adapter.evaluate(input),
    error => error?.aikernelCSharpNextOwner === true
      && /completion|Complete|terminal|deadline|budget/.test(error.message),
    `malformed ${description} completion evidence must fail closed`);
}

const contradictoryTerminal = JSON.parse(JSON.stringify(canonicalCompletedDecision));
contradictoryTerminal.failureTrace = {
  failed: true,
  failureAtControlTick: 101,
  failureCode: "central-hall-entry-confirmed",
  failureSnapshot: JSON.parse(JSON.stringify(completionReplayEntry)),
  replay: [JSON.parse(JSON.stringify(completionReplayEntry))]
};
bridgeDecision = contradictoryTerminal;
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true
    && /mutually exclusive|failureTrace\.failed/.test(error.message),
  "failure and completion traces must never both claim the same terminal decision");

bridgeDecision = decision({
  combatObservation: {
    ...JSON.parse(JSON.stringify(input.combatObservation)),
    rawNativeGametic: -1
  }
});
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true
    && /raw identity|sample availability|changed across/.test(error.message));

bridgeDecision = decision({
  navigation: {
    ...decision().navigation,
    structuredCombatInputAccepted: true,
    structuredCombatFresh: true,
    structuredCombatCandidate: true,
    structuredCombatTrusted: true,
    structuredCombatDistinctFrames: 1
  }
});
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true
    && /temporal proof/.test(error.message));

for (const mutate of [
  navigation => { navigation.nativeActorTargetSectorIndex = -2; },
  navigation => { navigation.nativeActorTopologyAccepted = 1; },
  navigation => { navigation.nativeActorTopologyReason = ""; },
  navigation => { navigation.nativeActorTopologyReason = "x".repeat(129); }
]) {
  const malformedNavigation = JSON.parse(JSON.stringify(decision().navigation));
  mutate(malformedNavigation);
  bridgeDecision = decision({ navigation: malformedNavigation });
  assert.throws(
    () => adapter.evaluate(input),
    error => error?.aikernelCSharpNextOwner === true
      && /nativeActorTargetSectorIndex|nativeActorTopology/.test(error.message),
    "navigation topology evidence must pass strict wire shape and range validation");
}

bridgeDecision = decision({
  actorSnapshot: {
    ...JSON.parse(JSON.stringify(input.actorSnapshot)),
    actors: input.actorSnapshot.actors.map((actor, index) => ({
      ...actor,
      sectorIndex: index === 0 ? actor.sectorIndex + 1 : actor.sectorIndex
    }))
  }
});
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /actorSnapshot\.actors changed/.test(error.message),
  "C# decisions must echo the exact native actor snapshot supplied on input");

bridgeDecision = decision({
  weaponSnapshot: {
    ...JSON.parse(JSON.stringify(input.weaponSnapshot)),
    refire: 1
  }
});
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /weaponSnapshot\.refire changed/.test(error.message),
  "C# decisions must echo the exact native weapon snapshot supplied on input");

bridgeDecision = decision({
  navigation: {
    ...decision().navigation,
    nativeWeaponFireOpportunity: false
  }
});
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /fire opportunity does not match/.test(error.message),
  "fire opportunity must carry exact ready-state proof");

const busyNativeFacts = JSON.parse(JSON.stringify(nativeFacts));
busyNativeFacts.player.weapon.weaponState = 101;
const busyInput = adapter.createInput(runtime, firstDoorPacket, {}, {
  framebuffer: { enemyRegion9Sample }
}, busyNativeFacts);
bridgeDecision = decision({
  state: "FireReady",
  weaponSnapshot: JSON.parse(JSON.stringify(busyInput.weaponSnapshot)),
  action: {
    moveForward: false,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: false,
    attackKey: true
  },
  navigation: {
    ...decision().navigation,
    nativeWeaponFireOpportunity: false,
    nativeWeaponState: 101,
    nativeWeaponReason: "native-weapon-cycle-busy"
  }
});
assert.throws(
  () => adapter.evaluate(busyInput),
  error => error?.aikernelCSharpNextOwner === true && /[Cc]ontinuation|Attack requires/.test(error.message),
  "Attack cannot be projected outside a fresh native weapon opportunity");

bridgeDecision = decision({
  weaponSnapshot: JSON.parse(JSON.stringify(busyInput.weaponSnapshot)),
  action: {
    moveForward: false,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: false,
    attackKey: false
  },
  navigation: {
    ...decision().navigation,
    nativeWeaponFireOpportunity: false,
    nativeWeaponState: 101,
    nativeWeaponReason: "native-weapon-cycle-busy"
  }
});
assert.equal(
  adapter.evaluate(busyInput).action.attackKey,
  false,
  "non-sector-60 busy weapon behavior must remain a neutral C# hold");

const sector60BusyNativeFacts = JSON.parse(JSON.stringify(busyNativeFacts));
sector60BusyNativeFacts.actorSnapshot.actors[0].sectorIndex = 60;
const sector60BusyInput = adapter.createInput(runtime, firstDoorPacket, {}, {
  framebuffer: { enemyRegion9Sample }
}, sector60BusyNativeFacts);
const busyContinuationNavigation = {
  ...decision().navigation,
  playerSectorIndex: 60,
  nativeActorTargetRetained: true,
  nativeActorTargetSectorIndex: 60,
  nativeActorTopologyReason: "native-actor-topology-local",
  nativeActorTargetBearingDegrees: 0,
  nativeActorTargetBearingErrorDegrees: 0,
  nativeWeaponFireOpportunity: false,
  nativeWeaponContinuationArmed: true,
  nativeWeaponContinuationTargetIdentity: 0xf0000000,
  nativeWeaponContinuationReadyWeapon: 1,
  nativeWeaponContinuationAuthorizedAtControlTick: 100,
  nativeWeaponAttackContinuation: true,
  nativeWeaponState: 101,
  nativeWeaponReason: "native-weapon-cycle-busy"
};
const busyContinuationAction = {
  moveForward: false,
  moveBackward: false,
  strafeLeft: false,
  strafeRight: false,
  turnYaw: 0,
  useKey: false,
  attackKey: true
};
bridgeDecision = decision({
  state: "FireReady",
  reasonCode: "native-live-target-fire-cycle-continuation",
  action: busyContinuationAction,
  actorSnapshot: JSON.parse(JSON.stringify(sector60BusyInput.actorSnapshot)),
  weaponSnapshot: JSON.parse(JSON.stringify(sector60BusyInput.weaponSnapshot)),
  navigation: busyContinuationNavigation
});
assert.equal(
  adapter.evaluate(sector60BusyInput).action.attackKey,
  true,
  "exact C# sector-60 busy-cycle continuation must pass mechanical transport validation");

for (const [description, mutate] of [
  ["stale weapon facts", value => { value.navigation.nativeWeaponSnapshotFresh = false; }],
  ["rejected weapon facts", value => {
    value.navigation.nativeWeaponSnapshotAccepted = false;
    value.navigation.nativeWeaponSnapshotFresh = false;
    value.navigation.nativeWeaponStateCount = -1;
    value.navigation.nativeReadyWeapon = -1;
    value.navigation.nativePendingWeapon = -1;
    value.navigation.nativeWeaponState = -1;
    value.navigation.nativeWeaponReadyState = -1;
    value.navigation.nativeWeaponRefire = -1;
  }],
  ["pending weapon change", value => {
    value.input.weaponSnapshot.pendingWeapon = 1;
    value.decision.weaponSnapshot.pendingWeapon = 1;
    value.navigation.nativePendingWeapon = 1;
  }],
  ["changed target", value => { value.navigation.nativeWeaponContinuationTargetIdentity = 0x00123456; }],
  ["changed ready weapon", value => { value.navigation.nativeWeaponContinuationReadyWeapon = 2; }],
  ["future authorization", value => { value.navigation.nativeWeaponContinuationAuthorizedAtControlTick = 102; }],
  ["rejected actor snapshot", value => {
    value.navigation.nativeActorSnapshotAccepted = false;
    value.navigation.nativeActorSnapshotFresh = false;
  }],
  ["stale actor snapshot", value => { value.navigation.nativeActorSnapshotFresh = false; }],
  ["unmatched actor", value => { value.navigation.nativeActorMatched = false; }],
  ["unretained actor", value => { value.navigation.nativeActorTargetRetained = false; }],
  ["untrusted combat actor", value => { value.navigation.nativeActorCombatTrusted = false; }],
  ["already killed actor", value => { value.navigation.nativeActorKillConfirmed = true; }],
  ["non-sector-60 player", value => { value.navigation.playerSectorIndex = 71; }],
  ["non-sector-60 target", value => { value.navigation.nativeActorTargetSectorIndex = 59; }],
  ["dead target", value => { value.navigation.nativeActorTargetHealth = 0; }],
  ["lost line of sight", value => { value.navigation.nativeActorTargetLineOfSight = false; }],
  ["rejected topology", value => { value.navigation.nativeActorTopologyAccepted = false; }],
  ["misaligned target", value => { value.navigation.nativeActorTargetBearingErrorDegrees = 5.01; }],
  ["ready rather than busy", value => {
    value.input.weaponSnapshot.weaponState = 100;
    value.decision.weaponSnapshot.weaponState = 100;
    value.navigation.nativeWeaponState = 100;
    value.navigation.nativeWeaponFireOpportunity = true;
  }],
  ["moving continuation", value => { value.action.moveForward = true; }]
]) {
  const malformed = {
    input: JSON.parse(JSON.stringify(sector60BusyInput)),
    decision: JSON.parse(JSON.stringify(decision({
      state: "FireReady",
      reasonCode: "native-live-target-fire-cycle-continuation",
      action: busyContinuationAction,
      actorSnapshot: sector60BusyInput.actorSnapshot,
      weaponSnapshot: sector60BusyInput.weaponSnapshot,
      navigation: busyContinuationNavigation
    })))
  };
  malformed.navigation = malformed.decision.navigation;
  malformed.action = malformed.decision.action;
  mutate(malformed);
  bridgeDecision = malformed.decision;
  assert.throws(
    () => adapter.evaluate(malformed.input),
    error => error?.aikernelCSharpNextOwner === true
      && /[Cc]ontinuation|sector-60|stationary/.test(error.message),
    `malformed ${description} continuation must fail closed`);
}

const residualUnarmedNavigation = JSON.parse(JSON.stringify(decision().navigation));
residualUnarmedNavigation.nativeWeaponContinuationTargetIdentity = 0xf0000000;
bridgeDecision = decision({ navigation: residualUnarmedNavigation });
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /canonical sentinels/.test(error.message),
  "unarmed continuation evidence must not retain a C# authorization latch");

const failureReplayEntry = {
  controlTick: 101,
  nativeGametic: 300,
  state: "FailedSafeStop",
  reasonCode: "post-computer-room-route-budget-exhausted",
  playerSectorIndex: 7,
  playerX: 2062.625,
  playerY: -2513.90625,
  legIndex: 2,
  legId: "enemy-alcove-south-clearance",
  routeFrames: 900,
  legFrames: 180,
  nativeActorTargetIdentity: 0,
  nativeActorTargetSectorIndex: -1,
  nativeActorTargetHealth: 0,
  nativeActorTargetLineOfSight: false,
  nativeActorTargetBearingErrorDegrees: 0,
  nativeActorTopologyAccepted: false,
  nativeActorTopologyReason: "native-actor-topology-not-evaluated",
  nativeActorEngagementFrames: 0,
  nativeActorCombatReason: "native-actor-not-matched",
  nativeWeaponSnapshotAccepted: true,
  nativeWeaponSnapshotFresh: true,
  nativeWeaponStateCount: 967,
  nativeReadyWeapon: 1,
  nativePendingWeapon: 10,
  nativeWeaponFireOpportunity: false,
  nativeWeaponContinuationArmed: false,
  nativeWeaponContinuationTargetIdentity: 0,
  nativeWeaponContinuationReadyWeapon: -1,
  nativeWeaponContinuationAuthorizedAtControlTick: -1,
  nativeWeaponAttackContinuation: false,
  nativeWeaponState: 101,
  nativeWeaponReadyState: 100,
  nativeWeaponRefire: 0,
  nativeWeaponReason: "native-weapon-cycle-busy",
  action: {
    moveForward: false,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: false,
    attackKey: false
  },
  runRequested: false
};
const continuationReplayEntry = {
  ...JSON.parse(JSON.stringify(failureReplayEntry)),
  state: "FireReady",
  reasonCode: "native-live-target-fire-cycle-continuation",
  playerSectorIndex: 60,
  nativeActorTargetIdentity: 0xf0000000,
  nativeActorTargetSectorIndex: 60,
  nativeActorTargetHealth: 60,
  nativeActorTargetLineOfSight: true,
  nativeActorTargetBearingErrorDegrees: 0,
  nativeActorTopologyAccepted: true,
  nativeActorTopologyReason: "native-actor-topology-local",
  nativeActorEngagementFrames: 2,
  nativeActorCombatReason: "native-actor-target-retained",
  nativeWeaponContinuationArmed: true,
  nativeWeaponContinuationTargetIdentity: 0xf0000000,
  nativeWeaponContinuationReadyWeapon: 1,
  nativeWeaponContinuationAuthorizedAtControlTick: 100,
  nativeWeaponAttackContinuation: true,
  nativeWeaponReason: "native-weapon-cycle-busy",
  action: JSON.parse(JSON.stringify(busyContinuationAction))
};
bridgeDecision = decision({
  state: "FireReady",
  reasonCode: continuationReplayEntry.reasonCode,
  action: busyContinuationAction,
  actorSnapshot: JSON.parse(JSON.stringify(sector60BusyInput.actorSnapshot)),
  weaponSnapshot: JSON.parse(JSON.stringify(sector60BusyInput.weaponSnapshot)),
  navigation: busyContinuationNavigation,
  failureTrace: {
    failed: false,
    failureAtControlTick: -1,
    failureCode: "",
    failureSnapshot: null,
    replay: [JSON.parse(JSON.stringify(continuationReplayEntry))]
  }
});
assert.throws(
  () => adapter.evaluate(sector60BusyInput),
  error => error?.aikernelCSharpNextOwner === true
    && /non-failed failureTrace cannot carry replay evidence/.test(error.message),
  "a non-failed decision must reject stale replay evidence even when structurally valid");

const malformedContinuationReplay = JSON.parse(JSON.stringify(continuationReplayEntry));
malformedContinuationReplay.nativeActorTargetBearingErrorDegrees = 5.01;
bridgeDecision = decision({
  state: "FireReady",
  reasonCode: continuationReplayEntry.reasonCode,
  action: busyContinuationAction,
  actorSnapshot: JSON.parse(JSON.stringify(sector60BusyInput.actorSnapshot)),
  weaponSnapshot: JSON.parse(JSON.stringify(sector60BusyInput.weaponSnapshot)),
  navigation: busyContinuationNavigation,
  failureTrace: {
    failed: false,
    failureAtControlTick: -1,
    failureCode: "",
    failureSnapshot: null,
    replay: [malformedContinuationReplay]
  }
});
assert.throws(
  () => adapter.evaluate(sector60BusyInput),
  error => error?.aikernelCSharpNextOwner === true && /actor proof/.test(error.message),
  "replay continuation evidence must fail closed when alignment exceeds the unchanged tolerance");

const malformedContinuationPlayerSectorReplay = JSON.parse(JSON.stringify(continuationReplayEntry));
malformedContinuationPlayerSectorReplay.playerSectorIndex = 71;
bridgeDecision = decision({
  state: "FireReady",
  reasonCode: continuationReplayEntry.reasonCode,
  action: busyContinuationAction,
  actorSnapshot: JSON.parse(JSON.stringify(sector60BusyInput.actorSnapshot)),
  weaponSnapshot: JSON.parse(JSON.stringify(sector60BusyInput.weaponSnapshot)),
  navigation: busyContinuationNavigation,
  failureTrace: {
    failed: false,
    failureAtControlTick: -1,
    failureCode: "",
    failureSnapshot: null,
    replay: [malformedContinuationPlayerSectorReplay]
  }
});
assert.throws(
  () => adapter.evaluate(sector60BusyInput),
  error => error?.aikernelCSharpNextOwner === true && /player-and-actor sector-60/.test(error.message),
  "replay continuation evidence must fail closed outside player sector 60");

const canonicalFailedDecision = decision({
  state: "FailedSafeStop",
  ownershipDisposition: "FailedSafeStop",
  ownerId: "post-computer-room.failed-safe-stop",
  reasonCode: failureReplayEntry.reasonCode,
  action: JSON.parse(JSON.stringify(failureReplayEntry.action)),
  navigation: {
    ...JSON.parse(JSON.stringify(decision().navigation)),
    failureCode: failureReplayEntry.reasonCode
  },
  failureTrace: {
    failed: true,
    failureAtControlTick: 101,
    failureCode: failureReplayEntry.reasonCode,
    failureSnapshot: JSON.parse(JSON.stringify(failureReplayEntry)),
    replay: [JSON.parse(JSON.stringify(failureReplayEntry))]
  }
});
bridgeDecision = canonicalFailedDecision;
assert.equal(adapter.evaluate(input).failureTrace.failed, true, "bounded immutable failure evidence should validate");

const transplantedFailedTrace = decision({
  failureTrace: JSON.parse(JSON.stringify(canonicalFailedDecision.failureTrace))
});
bridgeDecision = transplantedFailedTrace;
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true
    && /failureTrace\.failed/.test(error.message),
  "a valid failed trace transplanted onto an active Exclusive decision must fail closed");

for (const [description, mutate] of [
  ["state-only FailedSafeStop", value => { value.state = "FailedSafeStop"; }],
  ["disposition-only FailedSafeStop", value => {
    value.ownershipDisposition = "FailedSafeStop";
  }]
]) {
  const partialFailure = decision();
  mutate(partialFailure);
  bridgeDecision = partialFailure;
  assert.throws(
    () => adapter.evaluate(input),
    error => error?.aikernelCSharpNextOwner === true
      && /failureTrace\.failed/.test(error.message),
    `${description} must not bypass failure-trace equivalence`);
}

for (const [description, mutate] of [
  ["failed owner", value => { value.ownerId = "post-computer-room.combat"; }],
  ["failed exclusive flag", value => { value.exclusive = false; }],
  ["failed completed flag", value => { value.completed = true; }],
  ["failed current reason", value => { value.reasonCode = "other-failure"; }],
  ["failed navigation code", value => { value.navigation.failureCode = "other-failure"; }],
  ["failed current movement", value => { value.action.moveForward = true; }],
  ["failed current run", value => { value.runRequested = true; }],
  ["failed snapshot state", value => {
    value.failureTrace.failureSnapshot.state = "NavigateMainRoute";
    value.failureTrace.replay[0].state = "NavigateMainRoute";
  }],
  ["failed snapshot movement", value => {
    value.failureTrace.failureSnapshot.action.moveForward = true;
    value.failureTrace.replay[0].action.moveForward = true;
  }],
  ["failed snapshot run", value => {
    value.failureTrace.failureSnapshot.runRequested = true;
    value.failureTrace.replay[0].runRequested = true;
  }]
]) {
  const malformedFailure = JSON.parse(JSON.stringify(canonicalFailedDecision));
  mutate(malformedFailure);
  bridgeDecision = malformedFailure;
  assert.throws(
    () => adapter.evaluate(input),
    error => error?.aikernelCSharpNextOwner === true
      && /canonical FailedSafeStop|failureSnapshot/.test(error.message),
    `malformed ${description} terminal evidence must fail closed`);
}

const malformedReplayAction = JSON.parse(JSON.stringify(failureReplayEntry));
malformedReplayAction.action.moveForward = true;
malformedReplayAction.action.moveBackward = true;
bridgeDecision = JSON.parse(JSON.stringify(canonicalFailedDecision));
bridgeDecision.failureTrace.failureSnapshot = JSON.parse(JSON.stringify(malformedReplayAction));
bridgeDecision.failureTrace.replay = [JSON.parse(JSON.stringify(malformedReplayAction))];
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /contradictory/.test(error.message),
  "failure replay actions must preserve the strict ActionCommand wire shape");

const malformedReplayRun = JSON.parse(JSON.stringify(failureReplayEntry));
malformedReplayRun.runRequested = 0;
bridgeDecision = JSON.parse(JSON.stringify(canonicalFailedDecision));
bridgeDecision.failureTrace.failureSnapshot = JSON.parse(JSON.stringify(malformedReplayRun));
bridgeDecision.failureTrace.replay = [JSON.parse(JSON.stringify(malformedReplayRun))];
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /runRequested/.test(error.message),
  "failure replay runRequested must remain a boolean");

const malformedReplayWeaponOpportunity = JSON.parse(JSON.stringify(failureReplayEntry));
malformedReplayWeaponOpportunity.nativeWeaponFireOpportunity = true;
bridgeDecision = JSON.parse(JSON.stringify(canonicalFailedDecision));
bridgeDecision.failureTrace.failureSnapshot = JSON.parse(JSON.stringify(malformedReplayWeaponOpportunity));
bridgeDecision.failureTrace.replay = [JSON.parse(JSON.stringify(malformedReplayWeaponOpportunity))];
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /exact fresh engine proof/.test(error.message),
  "failure replay fire opportunities must equal the raw weapon-cycle proof");

bridgeDecision = JSON.parse(JSON.stringify(canonicalFailedDecision));
bridgeDecision.failureTrace.replay = [{ ...failureReplayEntry, nativeActorTargetHealth: 1 }];
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /immutable terminal replay/.test(error.message),
  "failure snapshots must remain identical to the captured terminal replay entry");
assert.deepEqual(
  JSON.parse(JSON.stringify(completed.legacyState)),
  JSON.parse(JSON.stringify(completedNextOwnerState)),
  "completed dispatch must return the exact post-route overlay passed to the next owner");

bridgeDecision = decision({ sessionId: "other-session" });
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /sessionId mismatch/.test(error.message));

console.log("CSHARP_POST_COMPUTER_ROOM_ROUTE_ADAPTER_VM_TEST_OK");
