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
    implementationVersion: "post-computer-room-route-v6",
    policyVersion: "post-computer-room-route-policy-v6",
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
      snapshotVersion: 5,
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

bridgeDecision = decision({
  state: "Complete",
  ownershipDisposition: "Completed",
  ownerId: "post-computer-room.central-hall",
  reasonCode: "central-hall-entry-confirmed",
  action: {
    moveForward: false,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: false,
    attackKey: false
  },
  runRequested: false,
  exclusive: false,
  completed: true,
  semanticProjection: {
    telos: "CentralHall",
    objective: "reach-central-hall",
    computerRoomEntered: true,
    centralHallEntered: true,
    firstDoorOpenConfirmationSource: "TrustedAudio"
  }
});
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
  error => error?.aikernelCSharpNextOwner === true && /Attack requires/.test(error.message),
  "Attack cannot be projected outside a fresh native weapon opportunity");

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
bridgeDecision = decision({
  state: "FailedSafeStop",
  ownershipDisposition: "FailedSafeStop",
  ownerId: "post-computer-room.failed-safe-stop",
  reasonCode: failureReplayEntry.reasonCode,
  action: {
    moveForward: false,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: false,
    attackKey: false
  },
  failureTrace: {
    failed: true,
    failureAtControlTick: 101,
    failureCode: failureReplayEntry.reasonCode,
    failureSnapshot: JSON.parse(JSON.stringify(failureReplayEntry)),
    replay: [JSON.parse(JSON.stringify(failureReplayEntry))]
  }
});
assert.equal(adapter.evaluate(input).failureTrace.failed, true, "bounded immutable failure evidence should validate");

const malformedReplayAction = JSON.parse(JSON.stringify(failureReplayEntry));
malformedReplayAction.action.moveForward = true;
malformedReplayAction.action.moveBackward = true;
bridgeDecision = decision({
  failureTrace: {
    failed: true,
    failureAtControlTick: 101,
    failureCode: failureReplayEntry.reasonCode,
    failureSnapshot: JSON.parse(JSON.stringify(malformedReplayAction)),
    replay: [JSON.parse(JSON.stringify(malformedReplayAction))]
  }
});
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /contradictory/.test(error.message),
  "failure replay actions must preserve the strict ActionCommand wire shape");

const malformedReplayRun = JSON.parse(JSON.stringify(failureReplayEntry));
malformedReplayRun.runRequested = 0;
bridgeDecision = decision({
  failureTrace: {
    failed: true,
    failureAtControlTick: 101,
    failureCode: failureReplayEntry.reasonCode,
    failureSnapshot: JSON.parse(JSON.stringify(malformedReplayRun)),
    replay: [JSON.parse(JSON.stringify(malformedReplayRun))]
  }
});
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /runRequested/.test(error.message),
  "failure replay runRequested must remain a boolean");

const malformedReplayWeaponOpportunity = JSON.parse(JSON.stringify(failureReplayEntry));
malformedReplayWeaponOpportunity.nativeWeaponFireOpportunity = true;
bridgeDecision = decision({
  failureTrace: {
    failed: true,
    failureAtControlTick: 101,
    failureCode: failureReplayEntry.reasonCode,
    failureSnapshot: JSON.parse(JSON.stringify(malformedReplayWeaponOpportunity)),
    replay: [JSON.parse(JSON.stringify(malformedReplayWeaponOpportunity))]
  }
});
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /exact fresh engine proof/.test(error.message),
  "failure replay fire opportunities must equal the raw weapon-cycle proof");

bridgeDecision = decision({
  failureTrace: {
    failed: true,
    failureAtControlTick: 101,
    failureCode: failureReplayEntry.reasonCode,
    failureSnapshot: JSON.parse(JSON.stringify(failureReplayEntry)),
    replay: [{ ...failureReplayEntry, nativeActorTargetHealth: 1 }]
  }
});
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
