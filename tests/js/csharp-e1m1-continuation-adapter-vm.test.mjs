import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const sourcePath = path.join(
  root,
  "src",
  "DoomWeb",
  "wwwroot",
  "js",
  "autoplay",
  "csharp-e1m1-continuation-adapter.js");
const demoPath = path.join(
  root,
  "src",
  "DoomWeb",
  "wwwroot",
  "demo",
  "doom",
  "js",
  "autoplay",
  "csharp-e1m1-continuation-adapter.js");
const source = readFileSync(sourcePath, "utf8");
const demo = readFileSync(demoPath, "utf8");
assert.equal(source, demo, "source/demo E1M1 continuation adapters must remain byte-identical");

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
      evaluateBrowserE1M1Continuation() {
        return bridgeDecision;
      }
    }
  }
};
sandbox.window = sandbox.self;
vm.runInContext(source, vm.createContext(sandbox), { filename: sourcePath });
const adapter = sandbox.self.AIKernelDoomCSharpE1M1Continuation;
assert.equal(adapter.contractVersion, 1);

const canonicalWad = "1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771";
const emptyFailureTrace = {
  failed: false,
  sessionId: "",
  runId: "",
  runGeneration: 0,
  failureAtControlTick: -1,
  failureCode: "",
  failureSnapshot: null,
  replay: []
};
const emptyCompletionTrace = {
  completed: false,
  sessionId: "",
  runId: "",
  runGeneration: 0,
  completionAtControlTick: -1,
  completionCode: "",
  nativeLevelLoadSequence: -1,
  nativeGametic: -1,
  previousGameState: -1,
  completedGameState: -1,
  gatekeeperIdentity: 0,
  gatekeeperKilled: false,
  gatekeeperKillCountAtAcquisition: -1,
  gatekeeperConfirmedKillCount: -1,
  secondDoorTraversed: false,
  exitDoorTraversed: false,
  exitSwitchUsed: false,
  completionSnapshot: null,
  replay: []
};

const runtime = {
  autoplayCSharpFirstDoorScope: {
    sessionId: "session-1",
    runId: "run-1",
    runGeneration: 3
  },
  autoplayCSharpSessionId: "session-1",
  autoplayCSharpRunId: "run-1",
  autoplayCSharpRunGeneration: 3,
  autoplayManualUseSequence: 19,
  autoplayCSharpNativeAudioCursor: {
    sessionId: "session-1",
    runId: "run-1",
    runGeneration: 3,
    afterSequence: 4
  },
  autoplayCSharpAppliedActionSnapshot: {
    sessionId: "session-1",
    runId: "run-1",
    runGeneration: 3,
    controlTick: 10,
    useAttemptId: 7,
    actionMode: "csharp-exact",
    proposed: { use: true },
    applied: {
      move: "none",
      strafe: false,
      turnYaw: 0,
      fire: false,
      use: true,
      run: false
    },
    use: {
      resolved: true,
      eventQueued: true,
      pulseResolverCalled: false,
      blockedByManualInput: false
    },
    path: { selected: "key-events", senseOnly: false },
    queuedUseInputEventSequence: 91,
    pumpedUseInputEventSequence: 91,
    usePumped: true,
    manualUseSequenceAtDecision: 19
  },
  moduleConfig: { wad: { sha256: canonicalWad } }
};

const postDecision = {
  implementationVersion: "post-computer-room-route-v8",
  contractVersion: 2,
  sessionId: "session-1",
  runId: "run-1",
  runGeneration: 3,
  state: "Complete",
  ownershipDisposition: "Completed",
  completed: true,
  exclusive: false,
  completionTrace: {
    completed: true,
    sessionId: "session-1",
    runId: "run-1",
    runGeneration: 3,
    completionAtControlTick: 101,
    completionCode: "central-hall-entry-confirmed",
    completionSnapshot: {
      state: "Complete",
      playerSectorIndex: 60,
      legIndex: 8,
      legId: "central-hall-entry"
    }
  }
};

function nativeFacts(gameState = 0) {
  return {
    run: {
      available: true,
      gametic: 500,
      leveltime: 450,
      levelstarttic: 50,
      gamestate: gameState,
      gameepisode: 1,
      gamemap: 1,
      levelLoadSequenceAvailable: true,
      levelLoadSequence: 6
    },
    player: {
      available: true,
      xFixed: 3000 * 65536,
      yFixed: -3056 * 65536,
      angleBam: 0x40000000,
      momentumXFixed: 0,
      momentumYFixed: 0,
      sectorIndex: 60,
      health: 83,
      playerState: 0,
      killCount: 2,
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
      gametic: 500,
      count: 1,
      capacity: 64,
      truncated: false,
      actors: [{
        identity: 0x12345678,
        xFixed: 3008 * 65536,
        yFixed: -4416 * 65536,
        sectorIndex: 74,
        type: 11,
        health: 60,
        flags: 0x00400004,
        lineOfSight: true
      }]
    },
    audio: {
      available: true,
      latestSequence: 5,
      events: [{ sequence: 5, sfxId: 20, sfxName: "doropn" }]
    }
  };
}

function nativeFactsAt({
  gametic,
  gameState = 0,
  health = 83,
  playerState = 0,
  killCount = 2,
  playerSectorIndex = 60,
  playerX = 3000,
  playerY = -3056,
  actorSectorIndex = 74
}) {
  const facts = nativeFacts(gameState);
  facts.run.gametic = gametic;
  facts.run.leveltime = gametic - 50;
  facts.player.xFixed = playerX * 65536;
  facts.player.yFixed = playerY * 65536;
  facts.player.sectorIndex = playerSectorIndex;
  facts.player.health = health;
  facts.player.playerState = playerState;
  facts.player.killCount = killCount;
  facts.actorSnapshot.gametic = gametic;
  facts.actorSnapshot.actors[0].sectorIndex = actorSectorIndex;
  return facts;
}

const input = adapter.createInput(runtime, postDecision, nativeFacts());
assert.deepEqual(JSON.parse(JSON.stringify(input)), {
  contractVersion: 1,
  sessionId: "session-1",
  runId: "run-1",
  runGeneration: 3,
  expectedPostComputerRoomControlTick: 101,
  wadContentSha256: canonicalWad,
  nativeLevelFactsAvailable: true,
  nativeLevelLoadSequenceAvailable: true,
  nativeLevelLoadSequence: 6,
  nativeGametic: 500,
  nativeLevelTime: 450,
  nativeGameState: 0,
  nativeGameEpisode: 1,
  nativeGameMap: 1,
  nativePlayerFactsAvailable: true,
  nativePlayerXFixed: 3000 * 65536,
  nativePlayerYFixed: -3056 * 65536,
  nativePlayerAngleBam: 0x40000000,
  nativePlayerMomentumXFixed: 0,
  nativePlayerMomentumYFixed: 0,
  nativePlayerSectorIndex: 60,
  nativePlayerVitalityFactsAvailable: true,
  nativePlayerHealth: 83,
  nativePlayerState: 0,
  nativePlayerKillCount: 2,
  manualUseSequence: 19,
  actorSnapshot: {
    available: true,
    gametic: 500,
    count: 1,
    capacity: 64,
    truncated: false,
    actors: [{
      identity: 0x12345678,
      xFixed: 3008 * 65536,
      yFixed: -4416 * 65536,
      sectorIndex: 74,
      type: 11,
      health: 60,
      flags: 0x00400004,
      lineOfSight: true
    }]
  },
  weaponSnapshot: {
    available: true,
    gametic: 500,
    stateCount: 967,
    readyWeapon: 1,
    pendingWeapon: 10,
    weaponState: 100,
    weaponReadyState: 100,
    refire: 0
  },
  audio: {
    nativeEvents: 5,
    events: [{ sequence: 5, sfxId: 20, sfxName: "doropn" }]
  },
  appliedActionAck: {
    sessionId: "session-1",
    runId: "run-1",
    runGeneration: 3,
    decisionControlTick: 10,
    useAttemptId: 7,
    actionMode: "csharp-exact",
    hostPath: "key-events",
    proposedUse: true,
    appliedUse: true,
    useResolved: true,
    eventQueued: true,
    pulseResolverCalled: false,
    manualBlocked: false,
    senseOnly: false,
    appliedMoveForward: false,
    appliedMoveBackward: false,
    appliedStrafeLeft: false,
    appliedStrafeRight: false,
    appliedTurnYaw: 0,
    appliedAttack: false,
    appliedRun: false,
    queuedUseInputEventSequence: 91,
    pumpedUseInputEventSequence: 91,
    usePumped: true,
    manualUseSequenceAtDecision: 19
  }
});

const mutableFacts = nativeFacts();
const clonedInput = adapter.createInput(runtime, postDecision, mutableFacts);
mutableFacts.actorSnapshot.actors[0].health = 1;
mutableFacts.audio.events[0].sfxName = "mutated";
mutableFacts.player.weapon.weaponState = 101;
assert.equal(clonedInput.actorSnapshot.actors[0].health, 60);
assert.equal(clonedInput.audio.events[0].sfxName, "doropn");
assert.equal(clonedInput.weaponSnapshot.weaponState, 100);

function navigation(overrides = {}) {
  return {
    snapshotVersion: 1,
    geometryVersion: "e1m1-continuation-canonical-route-v2",
    policyVersion: "e1m1-continuation-policy-v2.1",
    active: true,
    legIndex: 0,
    legId: "zigzag-entry-east",
    targetX: 3056,
    targetY: -3072,
    allowedSectors: [60],
    pose: {
      available: true,
      fresh: true,
      reason: "native-player-pose-accepted",
      nativeGametic: 500,
      playerX: 3000,
      playerY: -3056,
      headingDegrees: 90,
      momentumX: 0,
      momentumY: 0,
      playerSectorIndex: 60,
      stationary: true
    },
    targetDistance: 0,
    targetBearingDegrees: 0,
    bearingErrorDegrees: -90,
    routeFrames: 1,
    routeTimeoutFrames: 1020,
    routeRemainingFrames: 1019,
    legFrames: 1,
    legTimeoutFrames: 180,
    legRemainingFrames: 179,
    combatFrames: 0,
    combatTimeoutFrames: 180,
    combatRemainingFrames: 180,
    combatOwnerKind: "none",
    combatOwnerIdentity: 0,
    poseMissingFrames: 0,
    failureCode: "",
    ...overrides
  };
}

function doorTrace(overrides = {}) {
  return {
    traceVersion: 1,
    pendingUseKind: "None",
    pendingUseAttemptId: 0,
    pendingUseDecisionControlTick: -1,
    appliedActionAckReason: "not-expected",
    secondDoorAckAccepted: false,
    secondDoorSlabObserved: false,
    secondDoorTraversed: false,
    exitDoorAckAccepted: false,
    exitDoorSlabObserved: false,
    exitDoorTraversed: false,
    exitSwitchAckAccepted: false,
    levelTransitionConfirmed: false,
    ...overrides
  };
}

function gatekeeperTrace(overrides = {}) {
  return {
    traceVersion: 1,
    expectedRuntimeType: 11,
    expectedSectorIndex: 74,
    expectedSpawnX: 3008,
    expectedSpawnY: -4416,
    snapshotAccepted: true,
    snapshotFresh: true,
    acquiredAlive: true,
    identity: 0x12345678,
    health: 60,
    currentSectorIndex: 74,
    topologyAccepted: false,
    topologyReason: "canonical-gatekeeper-outside-current-adjacent-topology",
    lineOfSight: true,
    bearingErrorDegrees: 0,
    killCountAtAcquisition: 2,
    currentKillCount: 2,
    killCountAdvanced: false,
    killed: false,
    reason: "canonical-gatekeeper-acquired-alive",
    ...overrides
  };
}

function audioTrace(controlTick = 11) {
  return {
    traceVersion: 1,
    catalogVersion: "doom-native-sfx-catalog-v1",
    sourceRevision: "dcb7a8dbc7a16ce3dda29382ac9aae9d77d21284",
    catalogIdentityHash: "2fd2ba92b0ac0761b4c60ea636532420e71475adfb49f33ac1994c37009dd756",
    sessionId: "session-1",
    runId: "run-1",
    runGeneration: 3,
    evaluatedAtControlTick: controlTick,
    latestObservedSequence: 5,
    capacity: 32,
    totalNewEventCount: 1,
    retainedEventCount: 1,
    unknownEventCount: 0,
    truncated: false,
    diagnosticOnly: true,
    events: [{
      catalogVersion: "doom-native-sfx-catalog-v1",
      sourceRevision: "dcb7a8dbc7a16ce3dda29382ac9aae9d77d21284",
      catalogIdentityHash: "2fd2ba92b0ac0761b4c60ea636532420e71475adfb49f33ac1994c37009dd756",
      sessionId: "session-1",
      runId: "run-1",
      runGeneration: 3,
      observedAtControlTick: controlTick,
      sequence: 5,
      sfxId: 20,
      rawSfxName: "doropn",
      normalizedSfxName: "doropn",
      expectedSfxName: "doropn",
      catalogued: true,
      meaningCode: "mechanism-door-open",
      meaningLabel: "Door open",
      classificationReason: "exact-id-name-pair",
      eventIdentityHash: "a".repeat(64),
      diagnosticOnly: true
    }]
  };
}

function quietAudioTrace(controlTick, latestObservedSequence = 5) {
  return {
    ...audioTrace(controlTick),
    latestObservedSequence,
    totalNewEventCount: 0,
    retainedEventCount: 0,
    unknownEventCount: 0,
    truncated: false,
    events: []
  };
}

function semantic(overrides = {}) {
  return {
    telos: "ZigzagRoute",
    objective: "navigate-zigzag",
    doorOpenedCount: 1,
    secondDoorTraversed: false,
    gatekeeperKilled: false,
    exitDoorTraversed: false,
    exitSwitchUsed: false,
    levelCompleted: false,
    ...overrides
  };
}

function threatTrace(overrides = {}) {
  return {
    traceVersion: 1,
    snapshotAccepted: true,
    snapshotFresh: true,
    threatMatched: false,
    identity: 0,
    runtimeType: -1,
    sectorIndex: -1,
    health: 0,
    lineOfSight: false,
    bearingErrorDegrees: 0,
    stationaryFireAuthorized: false,
    reason: "route-threat-none",
    ...overrides
  };
}

function weaponTrace(overrides = {}) {
  return {
    traceVersion: 1,
    snapshotAccepted: true,
    snapshotFresh: true,
    stateCount: 967,
    readyWeapon: 1,
    pendingWeapon: 10,
    weaponState: 100,
    weaponReadyState: 100,
    refire: 0,
    fireOpportunity: true,
    continuationArmed: false,
    continuationOwnerKind: "none",
    continuationTargetIdentity: 0,
    continuationReadyWeapon: -1,
    continuationAuthorizedAtControlTick: -1,
    attackContinuation: false,
    reason: "native-weapon-fire-opportunity",
    ...overrides
  };
}

function unavailableWeaponTrace(reason = "native-weapon-not-evaluated") {
  return {
    traceVersion: 1,
    snapshotAccepted: false,
    snapshotFresh: false,
    stateCount: -1,
    readyWeapon: -1,
    pendingWeapon: -1,
    weaponState: -1,
    weaponReadyState: -1,
    refire: -1,
    fireOpportunity: false,
    continuationArmed: false,
    continuationOwnerKind: "none",
    continuationTargetIdentity: 0,
    continuationReadyWeapon: -1,
    continuationAuthorizedAtControlTick: -1,
    attackContinuation: false,
    reason
  };
}

function vitalityTrace(controlTick = 11, overrides = {}) {
  return {
    traceVersion: 1,
    sessionId: "session-1",
    runId: "run-1",
    runGeneration: 3,
    evaluatedAtControlTick: controlTick,
    available: true,
    fresh: true,
    nativeGametic: 500,
    playerHealth: 83,
    playerState: 0,
    playerKillCount: 2,
    provenance: "native-e1m1-continuation-vitality",
    deathCandidate: false,
    consecutiveDeathGametics: 0,
    requiredDeathGametics: 3,
    nativeDeathConfirmed: false,
    restartRequested: false,
    restartRequestId: "",
    restartReason: "none",
    ...overrides
  };
}

function decision(overrides = {}) {
  const controlTick = overrides.controlTick ?? 11;
  return {
    implementationVersion: "e1m1-continuation-v2",
    policyVersion: "e1m1-continuation-policy-v2.1",
    contractVersion: 1,
    sessionId: "session-1",
    runId: "run-1",
    runGeneration: 3,
    controlTick,
    expectedPostComputerRoomControlTick: 101,
    nativeGametic: 500,
    state: "NavigateZigzag",
    ownershipDisposition: "Exclusive",
    ownerId: "e1m1-continuation.exclusive",
    reasonCode: "second-door-canonical-route",
    action: {
      moveForward: true,
      moveBackward: false,
      strafeLeft: false,
      strafeRight: false,
      turnYaw: 0,
      useKey: false,
      attackKey: false
    },
    runRequested: true,
    exclusive: true,
    completed: false,
    useAttemptId: 0,
    manualUseSequence: 19,
    nativeDeathConfirmed: false,
    restartRequested: false,
    restartRequestId: "",
    restartReason: "none",
    navigation: navigation(),
    doorTrace: doorTrace(),
    gatekeeperTrace: gatekeeperTrace(),
    threatTrace: threatTrace(),
    weaponTrace: weaponTrace(),
    vitalityTrace: vitalityTrace(controlTick),
    semanticProjection: semantic(),
    audioCatalogTrace: audioTrace(controlTick),
    failureTrace: structuredClone(emptyFailureTrace),
    completionTrace: structuredClone(emptyCompletionTrace),
    contractError: "",
    ...overrides
  };
}

bridgeDecision = decision();
const evaluated = adapter.evaluate(input, runtime);
const dispatched = adapter.dispatch(evaluated);
assert.equal(dispatched.mode, "exclusive");
assert.equal(dispatched.exact, true);
assert.equal(dispatched.action.move, "forward");
assert.equal(dispatched.action.source, "csharp-e1m1-continuation");
assert.equal(dispatched.semanticState.telos, "ZigzagRoute");
assert.equal(dispatched.semanticState.doorOpenedCount, 1);
assert.deepEqual(JSON.parse(JSON.stringify(runtime.autoplayCSharpNativeAudioCursor)), {
  sessionId: "session-1",
  runId: "run-1",
  runGeneration: 3,
  afterSequence: 5
});

bridgeDecision = decision({
  controlTick: 12,
  state: "StationarySecondDoorUse",
  reasonCode: "second-door-stationary-use",
  action: {
    moveForward: false,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: true,
    attackKey: false
  },
  runRequested: false,
  useAttemptId: 7,
  semanticProjection: semantic({
    telos: "SecondDoor",
    objective: "open-and-traverse-second-door"
  }),
  doorTrace: doorTrace({
    pendingUseKind: "SecondDoor",
    pendingUseAttemptId: 7,
    pendingUseDecisionControlTick: 12
  }),
  audioCatalogTrace: audioTrace(12)
});
const stationaryUse = adapter.evaluate(input);
assert.equal(adapter.dispatch(stationaryUse).action.use, true);
assert.equal(adapter.dispatch(stationaryUse).action.move, "none");

bridgeDecision = decision({
  controlTick: 13,
  state: "EngageGatekeeper",
  reasonCode: "canonical-gatekeeper-stationary-fire",
  action: {
    moveForward: false,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: false,
    attackKey: true
  },
  runRequested: false,
  gatekeeperTrace: gatekeeperTrace({
    acquiredAlive: true,
    identity: 0x12345678,
    health: 60,
    topologyAccepted: true,
    topologyReason: "canonical-gatekeeper-current-adjacent-topology",
    lineOfSight: true,
    killCountAtAcquisition: 2,
    currentKillCount: 2,
    reason: "canonical-gatekeeper-acquired"
  }),
  navigation: navigation({
    combatOwnerKind: "gatekeeper",
    combatOwnerIdentity: 0x12345678
  }),
  weaponTrace: weaponTrace({
    continuationArmed: true,
    continuationOwnerKind: "gatekeeper",
    continuationTargetIdentity: 0x12345678,
    continuationReadyWeapon: 1,
    continuationAuthorizedAtControlTick: 13
  }),
  semanticProjection: semantic({
    telos: "Gatekeeper",
    objective: "defeat-sector-74-gatekeeper"
  }),
  audioCatalogTrace: audioTrace(13)
});
const stationaryAttack = adapter.evaluate(input);
assert.equal(adapter.dispatch(stationaryAttack).action.fire, true);

const movingAttack = structuredClone(bridgeDecision);
movingAttack.action.moveForward = true;
movingAttack.runRequested = true;
bridgeDecision = movingAttack;
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /stationary/.test(error.message),
  "Attack must remain stationary across the C# wire");

const busyWeaponInput = structuredClone(input);
busyWeaponInput.weaponSnapshot.weaponState = 101;
busyWeaponInput.weaponSnapshot.refire = 1;
const gatekeeperBusyDecision = structuredClone(stationaryAttack);
gatekeeperBusyDecision.controlTick = 14;
gatekeeperBusyDecision.reasonCode = "canonical-gatekeeper-fire-cycle-continuation";
gatekeeperBusyDecision.navigation.combatFrames = 1;
gatekeeperBusyDecision.navigation.combatRemainingFrames = 179;
gatekeeperBusyDecision.weaponTrace = weaponTrace({
  weaponState: 101,
  refire: 1,
  fireOpportunity: false,
  continuationArmed: true,
  continuationOwnerKind: "gatekeeper",
  continuationTargetIdentity: 0x12345678,
  continuationReadyWeapon: 1,
  continuationAuthorizedAtControlTick: 13,
  attackContinuation: true,
  reason: "native-weapon-cycle-not-ready"
});
gatekeeperBusyDecision.vitalityTrace = vitalityTrace(14);
gatekeeperBusyDecision.audioCatalogTrace = quietAudioTrace(14);
bridgeDecision = gatekeeperBusyDecision;
const gatekeeperBusyAttack = adapter.evaluate(busyWeaponInput);
assert.equal(adapter.dispatch(gatekeeperBusyAttack).action.fire, true);
assert.equal(gatekeeperBusyAttack.weaponTrace.attackContinuation, true);

const routeBusyInput = structuredClone(busyWeaponInput);
routeBusyInput.actorSnapshot.actors.push({
  identity: 17,
  xFixed: 3000 * 65536,
  yFixed: -3156 * 65536,
  sectorIndex: 60,
  type: 1,
  health: 20,
  flags: 0x00400004,
  lineOfSight: true
});
routeBusyInput.actorSnapshot.count = 2;
bridgeDecision = decision({
  controlTick: 15,
  state: "InterceptRouteThreat",
  reasonCode: "route-threat-fire-cycle-continuation",
  action: {
    moveForward: false,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: false,
    attackKey: true
  },
  runRequested: false,
  navigation: navigation({
    combatFrames: 1,
    combatRemainingFrames: 179,
    combatOwnerKind: "route-threat",
    combatOwnerIdentity: 17
  }),
  threatTrace: threatTrace({
    threatMatched: true,
    identity: 17,
    runtimeType: 1,
    sectorIndex: 60,
    health: 20,
    lineOfSight: true,
    bearingErrorDegrees: 0,
    stationaryFireAuthorized: true,
    reason: "captured-route-threat-retained-with-line-of-sight"
  }),
  weaponTrace: weaponTrace({
    weaponState: 101,
    refire: 1,
    fireOpportunity: false,
    continuationArmed: true,
    continuationOwnerKind: "route-threat",
    continuationTargetIdentity: 17,
    continuationReadyWeapon: 1,
    continuationAuthorizedAtControlTick: 14,
    attackContinuation: true,
    reason: "native-weapon-cycle-not-ready"
  }),
  semanticProjection: semantic({
    telos: "RouteThreat",
    objective: "intercept-captured-route-enemy"
  }),
  vitalityTrace: vitalityTrace(15),
  audioCatalogTrace: quietAudioTrace(15)
});
const routeBusyAttack = adapter.evaluate(routeBusyInput);
assert.equal(adapter.dispatch(routeBusyAttack).action.fire, true);
assert.equal(routeBusyAttack.weaponTrace.continuationOwnerKind, "route-threat");

const malformedBusyWeaponCases = [
  ["owner", current => { current.weaponTrace.continuationOwnerKind = "route-threat"; }],
  ["identity", current => { current.weaponTrace.continuationTargetIdentity = 99; }],
  ["ready weapon", current => { current.weaponTrace.continuationReadyWeapon = 2; }],
  ["pending weapon", current => { current.weaponTrace.pendingWeapon = 2; }],
  ["ready-state busy claim", current => { current.weaponTrace.weaponState = 100; }],
  ["stale authorization", current => {
    current.weaponTrace.continuationAuthorizedAtControlTick = 12;
  }]
];
for (const [name, mutate] of malformedBusyWeaponCases) {
  bridgeDecision = structuredClone(gatekeeperBusyDecision);
  mutate(bridgeDecision);
  assert.throws(
    () => adapter.evaluate(busyWeaponInput),
    error => error?.aikernelCSharpNextOwner === true,
    `${name} busy-cycle mutation must fail closed`);
}

bridgeDecision = structuredClone(routeBusyAttack);
bridgeDecision.threatTrace.sectorIndex = 82;
bridgeDecision.action.attackKey = true;
routeBusyInput.actorSnapshot.actors[1].sectorIndex = 82;
assert.throws(
  () => adapter.evaluate(routeBusyInput),
  error => error?.aikernelCSharpNextOwner === true && /topology/.test(error.message),
  "route-threat busy-cycle Attack must fail closed outside current/adjacent topology");

const intermissionInput = adapter.createInput(runtime, postDecision, nativeFacts(1));
const completionReplay = {
  controlTick: 30,
  nativeGametic: 500,
  state: "Complete",
  reasonCode: "e1m1-level-completion-confirmed",
  playerSectorIndex: 82,
  legIndex: 15,
  legId: "exit-switch-use-approach",
  routeFrames: 19,
  legFrames: 1,
  combatFrames: 4,
  gatekeeperIdentity: 0x12345678,
  gatekeeperKilled: true,
  gatekeeperKillCountAtAcquisition: 2,
  gatekeeperConfirmedKillCount: 3,
  secondDoorSlabObserved: false,
  exitDoorSlabObserved: false,
  pendingUseKind: "None",
  useAttemptId: 0,
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
  controlTick: 30,
  state: "Complete",
  ownershipDisposition: "Completed",
  ownerId: "e1m1-continuation.completed",
  reasonCode: "e1m1-level-completion-confirmed",
  action: structuredClone(completionReplay.action),
  runRequested: false,
  exclusive: false,
  completed: true,
  navigation: navigation({
    active: false,
    legIndex: 15,
    legId: "exit-switch-use-approach",
    targetX: 2944,
    targetY: -4768,
    allowedSectors: [82],
    pose: {
      available: true,
      fresh: true,
      reason: "native-player-pose-accepted",
      nativeGametic: 500,
      playerX: 2944,
      playerY: -4768,
      headingDegrees: 90,
      momentumX: 0,
      momentumY: 0,
      playerSectorIndex: 82,
      stationary: true
    },
    routeFrames: 19,
    routeRemainingFrames: 1001,
    legFrames: 1,
    legRemainingFrames: 179,
    combatFrames: 4,
    combatRemainingFrames: 176
  }),
  weaponTrace: unavailableWeaponTrace(),
  doorTrace: doorTrace({
    secondDoorAckAccepted: true,
    secondDoorTraversed: true,
    exitDoorAckAccepted: true,
    exitDoorTraversed: true,
    exitSwitchAckAccepted: true,
    levelTransitionConfirmed: true
  }),
  gatekeeperTrace: gatekeeperTrace({
    acquiredAlive: true,
    identity: 0x12345678,
    health: -5,
    killCountAtAcquisition: 2,
    currentKillCount: 3,
    killCountAdvanced: true,
    killed: true,
    reason: "canonical-gatekeeper-kill-confirmed"
  }),
  semanticProjection: semantic({
    telos: "E1M1Complete",
    objective: "level-completed",
    doorOpenedCount: 3,
    secondDoorTraversed: true,
    gatekeeperKilled: true,
    exitDoorTraversed: true,
    exitSwitchUsed: true,
    levelCompleted: true
  }),
  audioCatalogTrace: audioTrace(30),
  vitalityTrace: vitalityTrace(30, {
    available: false,
    fresh: false,
    provenance: "native-e1m1-continuation-vitality-unavailable"
  }),
  completionTrace: {
    completed: true,
    sessionId: "session-1",
    runId: "run-1",
    runGeneration: 3,
    completionAtControlTick: 30,
    completionCode: "e1m1-level-completion-confirmed",
    nativeLevelLoadSequence: 6,
    nativeGametic: 500,
    previousGameState: 0,
    completedGameState: 1,
    gatekeeperIdentity: 0x12345678,
    gatekeeperKilled: true,
    gatekeeperKillCountAtAcquisition: 2,
    gatekeeperConfirmedKillCount: 3,
    secondDoorTraversed: true,
    exitDoorTraversed: true,
    exitSwitchUsed: true,
    completionSnapshot: structuredClone(completionReplay),
    replay: [structuredClone(completionReplay)]
  }
});
const completed = adapter.evaluate(intermissionInput);
const completedDispatch = adapter.dispatch(completed);
assert.equal(completedDispatch.mode, "completed");
assert.equal(completedDispatch.exact, true);
assert.equal(completedDispatch.action.move, "none");
assert.equal(completedDispatch.semanticState.levelCompleted, true);
assert.equal(completedDispatch.semanticState.doorOpenedCount, 3);

const delayedCompletionInput = adapter.createInput(
  runtime,
  postDecision,
  nativeFactsAt({ gametic: 510, gameState: 1 }));
bridgeDecision = structuredClone(completed);
bridgeDecision.controlTick = 34;
bridgeDecision.nativeGametic = 510;
bridgeDecision.vitalityTrace.evaluatedAtControlTick = 34;
bridgeDecision.audioCatalogTrace = quietAudioTrace(34);
const delayedComplete = adapter.evaluate(delayedCompletionInput);
assert.equal(delayedComplete.controlTick, 34);
assert.equal(delayedComplete.nativeGametic, 510);
assert.deepEqual(
  delayedComplete.navigation,
  completed.navigation,
  "delayed Complete must retain the terminal navigation snapshot");
assert.deepEqual(
  delayedComplete.completionTrace,
  completed.completionTrace,
  "delayed Complete must retain the immutable completion trace");

const failureCode = "e1m1-continuation-route-budget-exhausted";
const neutral = {
  moveForward: false,
  moveBackward: false,
  strafeLeft: false,
  strafeRight: false,
  turnYaw: 0,
  useKey: false,
  attackKey: false
};
const failureSnapshot = {
  controlTick: 40,
  nativeGametic: 500,
  state: "FailedSafeStop",
  reasonCode: failureCode,
  playerSectorIndex: 60,
  legIndex: 0,
  legId: "zigzag-entry-east",
  routeFrames: 29,
  legFrames: 29,
  combatFrames: 0,
  gatekeeperIdentity: 0x12345678,
  gatekeeperKilled: false,
  gatekeeperKillCountAtAcquisition: 2,
  gatekeeperConfirmedKillCount: -1,
  secondDoorSlabObserved: false,
  exitDoorSlabObserved: false,
  pendingUseKind: "None",
  useAttemptId: 0,
  action: structuredClone(neutral),
  runRequested: false
};
const delayedFailureInput = adapter.createInput(
  runtime,
  postDecision,
  nativeFactsAt({ gametic: 510 }));
bridgeDecision = decision({
  controlTick: 44,
  nativeGametic: 510,
  state: "FailedSafeStop",
  ownershipDisposition: "FailedSafeStop",
  ownerId: "e1m1-continuation.failed-safe-stop",
  reasonCode: failureCode,
  action: structuredClone(neutral),
  runRequested: false,
  exclusive: true,
  navigation: navigation({
    active: false,
    routeFrames: 29,
    routeRemainingFrames: 991,
    legFrames: 29,
    legRemainingFrames: 151,
    failureCode
  }),
  weaponTrace: unavailableWeaponTrace("native-weapon-terminal-safe-stop"),
  vitalityTrace: vitalityTrace(44, { nativeGametic: 510 }),
  semanticProjection: semantic({
    telos: "FailedSafeStop",
    objective: "preserve-safe-neutral-control"
  }),
  audioCatalogTrace: quietAudioTrace(44),
  failureTrace: {
    failed: true,
    sessionId: "session-1",
    runId: "run-1",
    runGeneration: 3,
    failureAtControlTick: 40,
    failureCode,
    failureSnapshot: structuredClone(failureSnapshot),
    replay: [structuredClone(failureSnapshot)]
  },
  contractError: failureCode
});
const delayedFailure = adapter.evaluate(delayedFailureInput);
assert.equal(adapter.dispatch(delayedFailure).mode, "failed-safe-stop");
assert.equal(delayedFailure.failureTrace.failureAtControlTick, 40);
assert.equal(delayedFailure.navigation.routeFrames, 29);

function deathCandidateDecision(controlTick, gametic, consecutiveDeathGametics) {
  return decision({
    controlTick,
    nativeGametic: gametic,
    navigation: navigation({
      pose: {
        ...navigation().pose,
        nativeGametic: gametic
      }
    }),
    vitalityTrace: vitalityTrace(controlTick, {
      nativeGametic: gametic,
      playerHealth: 0,
      playerState: 1,
      deathCandidate: true,
      consecutiveDeathGametics
    }),
    audioCatalogTrace: quietAudioTrace(controlTick)
  });
}

for (const [controlTick, gametic, count] of [[50, 601, 1], [51, 602, 2]]) {
  const deathInput = adapter.createInput(
    runtime,
    postDecision,
    nativeFactsAt({ gametic, health: 0, playerState: 1 }));
  bridgeDecision = deathCandidateDecision(controlTick, gametic, count);
  const candidate = adapter.evaluate(deathInput);
  assert.equal(candidate.nativeDeathConfirmed, false);
  assert.equal(candidate.vitalityTrace.consecutiveDeathGametics, count);
}

const restartRequestId = "e1m1-continuation:session-1:run-1:3:restart-1";
const restartNavigation = navigation({
  active: false,
  pose: {
    ...navigation().pose,
    nativeGametic: 602
  },
  routeFrames: 42,
  routeRemainingFrames: 978,
  legFrames: 42,
  legRemainingFrames: 138
});
const restartGatekeeperTrace = gatekeeperTrace({
  snapshotAccepted: false,
  snapshotFresh: false,
  topologyAccepted: false,
  topologyReason: "gatekeeper-topology-not-evaluated-this-tick"
});
const restartThreatTrace = threatTrace({
  snapshotAccepted: false,
  snapshotFresh: false
});
const restartInput = adapter.createInput(
  runtime,
  postDecision,
  nativeFactsAt({ gametic: 603, health: 0, playerState: 1 }));
bridgeDecision = decision({
  controlTick: 52,
  nativeGametic: 603,
  state: "AwaitRestart",
  reasonCode: "native-player-death-restart-requested",
  action: structuredClone(neutral),
  runRequested: false,
  navigation: structuredClone(restartNavigation),
  gatekeeperTrace: structuredClone(restartGatekeeperTrace),
  threatTrace: structuredClone(restartThreatTrace),
  weaponTrace: unavailableWeaponTrace(),
  vitalityTrace: vitalityTrace(52, {
    nativeGametic: 603,
    playerHealth: 0,
    playerState: 1,
    deathCandidate: true,
    consecutiveDeathGametics: 3,
    nativeDeathConfirmed: true,
    restartRequested: true,
    restartRequestId,
    restartReason: "native-player-death-confirmed"
  }),
  semanticProjection: semantic({
    telos: "Restart",
    objective: "restart-after-native-death"
  }),
  audioCatalogTrace: quietAudioTrace(52),
  nativeDeathConfirmed: true,
  restartRequested: true,
  restartRequestId,
  restartReason: "native-player-death-confirmed"
});
const restart = adapter.evaluate(restartInput);
assert.equal(adapter.dispatch(restart).mode, "exclusive");
assert.equal(adapter.dispatch(restart).action.move, "none");

const restartEchoInput = adapter.createInput(
  runtime,
  postDecision,
  nativeFactsAt({ gametic: 604, health: 0, playerState: 1 }));
bridgeDecision = structuredClone(restart);
bridgeDecision.controlTick = 53;
bridgeDecision.nativeGametic = 604;
bridgeDecision.vitalityTrace.evaluatedAtControlTick = 53;
bridgeDecision.audioCatalogTrace = quietAudioTrace(53);
const restartEcho = adapter.evaluate(restartEchoInput);
assert.deepEqual(
  restartEcho.navigation,
  restart.navigation,
  "AwaitRestart echo must retain the death-confirmation navigation snapshot");
assert.equal(restartEcho.vitalityTrace.nativeGametic, 603);
assert.equal(restartEcho.vitalityTrace.consecutiveDeathGametics, 3);

const failedRestartInput = adapter.createInput(
  runtime,
  postDecision,
  nativeFactsAt({ gametic: 720, health: 0, playerState: 1 }));
bridgeDecision = structuredClone(delayedFailure);
bridgeDecision.controlTick = 47;
bridgeDecision.nativeGametic = 720;
bridgeDecision.state = "AwaitRestart";
bridgeDecision.ownershipDisposition = "Exclusive";
bridgeDecision.ownerId = "e1m1-continuation.exclusive";
bridgeDecision.reasonCode = "native-player-death-restart-requested-after-failed-safe-stop";
bridgeDecision.contractError = "";
bridgeDecision.nativeDeathConfirmed = true;
bridgeDecision.restartRequested = true;
bridgeDecision.restartRequestId = restartRequestId;
bridgeDecision.restartReason = "native-player-death-confirmed";
bridgeDecision.vitalityTrace = vitalityTrace(47, {
  nativeGametic: 720,
  playerHealth: 0,
  playerState: 1,
  deathCandidate: true,
  consecutiveDeathGametics: 3,
  nativeDeathConfirmed: true,
  restartRequested: true,
  restartRequestId,
  restartReason: "native-player-death-confirmed"
});
bridgeDecision.semanticProjection = semantic({
  telos: "Restart",
  objective: "restart-after-native-death"
});
bridgeDecision.audioCatalogTrace = quietAudioTrace(47);
const failedRestart = adapter.evaluate(failedRestartInput);
assert.equal(adapter.dispatch(failedRestart).mode, "exclusive");
assert.equal(failedRestart.failureTrace.failureCode, failureCode);
assert.deepEqual(failedRestart.navigation, delayedFailure.navigation);

const failedRestartEchoInput = adapter.createInput(
  runtime,
  postDecision,
  nativeFactsAt({ gametic: 721, health: 0, playerState: 1 }));
bridgeDecision = structuredClone(failedRestart);
bridgeDecision.controlTick = 48;
bridgeDecision.nativeGametic = 721;
bridgeDecision.vitalityTrace.evaluatedAtControlTick = 48;
bridgeDecision.audioCatalogTrace = quietAudioTrace(48);
const failedRestartEcho = adapter.evaluate(failedRestartEchoInput);
assert.deepEqual(failedRestartEcho.failureTrace, failedRestart.failureTrace);
assert.deepEqual(failedRestartEcho.navigation, failedRestart.navigation);
assert.equal(failedRestartEcho.vitalityTrace.nativeGametic, 720);

bridgeDecision = decision({
  controlTick: 60,
  state: "NavigateGatekeeper",
  reasonCode: "second-door-far-side-certified",
  navigation: navigation({
    legIndex: 8,
    legId: "sector-72-north-approach",
    targetX: 3008,
    targetY: -4200,
    allowedSectors: [73, 72]
  }),
  doorTrace: doorTrace({
    appliedActionAckReason: "accepted",
    secondDoorAckAccepted: true,
    secondDoorSlabObserved: false,
    secondDoorTraversed: true
  }),
  semanticProjection: semantic({
    telos: "Gatekeeper",
    objective: "defeat-sector-74-gatekeeper",
    doorOpenedCount: 2,
    secondDoorTraversed: true
  }),
  audioCatalogTrace: quietAudioTrace(60),
  vitalityTrace: vitalityTrace(60)
});
const directFarSide = adapter.evaluate(input);
assert.equal(directFarSide.doorTrace.secondDoorSlabObserved, false);
assert.equal(directFarSide.doorTrace.secondDoorTraversed, true);

bridgeDecision = decision({
  controlTick: 61,
  state: "TraverseSecondDoor",
  reasonCode: "second-door-thin-slab-observed",
  navigation: navigation({
    legIndex: 7,
    legId: "second-door-certified-traverse",
    targetX: 3008,
    targetY: -4064,
    allowedSectors: [73]
  }),
  doorTrace: doorTrace({
    appliedActionAckReason: "accepted",
    secondDoorAckAccepted: true,
    secondDoorSlabObserved: true,
    secondDoorTraversed: false
  }),
  semanticProjection: semantic({
    telos: "SecondDoor",
    objective: "open-and-traverse-second-door"
  }),
  audioCatalogTrace: quietAudioTrace(61),
  vitalityTrace: vitalityTrace(61)
});
const slabOnly = adapter.evaluate(input);
assert.equal(slabOnly.doorTrace.secondDoorTraversed, false);
assert.equal(slabOnly.semanticProjection.doorOpenedCount, 1);

const retainedGatekeeperFacts = nativeFactsAt({ gametic: 500, actorSectorIndex: 72 });
const retainedGatekeeperInput = adapter.createInput(runtime, postDecision, retainedGatekeeperFacts);
bridgeDecision = decision({
  controlTick: 62,
  state: "NavigateGatekeeper",
  reasonCode: "canonical-gatekeeper-retained-alive",
  navigation: navigation({
    legIndex: 8,
    legId: "sector-72-north-approach",
    targetX: 3008,
    targetY: -4200,
    allowedSectors: [73, 72]
  }),
  gatekeeperTrace: gatekeeperTrace({
    currentSectorIndex: 72,
    reason: "canonical-gatekeeper-retained-alive"
  }),
  semanticProjection: semantic({
    telos: "Gatekeeper",
    objective: "defeat-sector-74-gatekeeper"
  }),
  audioCatalogTrace: quietAudioTrace(62),
  vitalityTrace: vitalityTrace(62)
});
assert.equal(adapter.evaluate(retainedGatekeeperInput).gatekeeperTrace.currentSectorIndex, 72);

bridgeDecision = structuredClone(stationaryAttack);
bridgeDecision.gatekeeperTrace.topologyAccepted = false;
bridgeDecision.gatekeeperTrace.topologyReason = "canonical-gatekeeper-outside-current-adjacent-topology";
assert.throws(
  () => adapter.evaluate(input),
  error => error?.aikernelCSharpNextOwner === true && /topology/.test(error.message),
  "gatekeeper Attack must fail closed without current topology proof");

const malformedCases = [
  ["session echo", current => { current.sessionId = "other-session"; }, /sessionId mismatch/],
  ["native gametic echo", current => { current.nativeGametic = 501; }, /nativeGametic changed/],
  ["route timeout", current => { current.navigation.routeTimeoutFrames = 1021; }, /route timeout changed/],
  ["canonical waypoint", current => { current.navigation.targetX = 3055; }, /canonical C# route/],
  ["combat owner", current => { current.navigation.combatOwnerKind = "gatekeeper"; }, /combat owner/],
  ["unowned traversal", current => {
    current.doorTrace.secondDoorTraversed = true;
  }, /owned Use acknowledgement/],
  ["door count", current => { current.semanticProjection.doorOpenedCount = 2; }, /doorOpenedCount/],
  ["gatekeeper type", current => { current.gatekeeperTrace.expectedRuntimeType = 3001; }, /runtime type changed/],
  ["audio cursor", current => { current.audioCatalogTrace.latestObservedSequence = 6; }, /unobserved sequence/]
];
for (const [name, mutate, pattern] of malformedCases) {
  bridgeDecision = decision();
  mutate(bridgeDecision);
  assert.throws(
    () => adapter.evaluate(input),
    error => error?.aikernelCSharpNextOwner === true && pattern.test(error.message),
    `${name} mutation must fail closed`);
}

const oldCursor = structuredClone(runtime.autoplayCSharpNativeAudioCursor);
bridgeDecision = decision({ sessionId: "other-session" });
assert.throws(() => adapter.evaluate(input, runtime), error => error?.aikernelCSharpNextOwner === true);
assert.deepEqual(
  JSON.parse(JSON.stringify(runtime.autoplayCSharpNativeAudioCursor)),
  JSON.parse(JSON.stringify(oldCursor)),
  "invalid decisions must not advance the native audio cursor");

const badActorFacts = nativeFacts();
badActorFacts.actorSnapshot.gametic = 499;
assert.throws(
  () => adapter.createInput(runtime, postDecision, badActorFacts),
  error => error?.aikernelCSharpNextOwner === true && /must match native run/.test(error.message));

const badAudioFacts = nativeFacts();
badAudioFacts.audio.events = [
  { sequence: 5, sfxId: 20, sfxName: "doropn" },
  { sequence: 4, sfxId: 21, sfxName: "dorcls" }
];
assert.throws(
  () => adapter.createInput(runtime, postDecision, badAudioFacts),
  error => error?.aikernelCSharpNextOwner === true && /strictly increasing/.test(error.message));

const wrongScopePost = structuredClone(postDecision);
wrongScopePost.runId = "other-run";
assert.throws(
  () => adapter.createInput(runtime, wrongScopePost, nativeFacts()),
  error => error?.aikernelCSharpNextOwner === true && /scope/.test(error.message));

bridgeDecision = decision({
  state: "WaitingForPostCompletion",
  ownershipDisposition: "NotAcquired",
  ownerId: "e1m1-continuation.waiting",
  reasonCode: "post-completion-proof-pending",
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
  contractError: "post-completion-proof-pending",
  navigation: {
    snapshotVersion: 1,
    geometryVersion: "e1m1-continuation-canonical-route-v2",
    policyVersion: "",
    active: false,
    legIndex: -1,
    legId: "",
    targetX: 0,
    targetY: 0,
    allowedSectors: [],
    pose: {
      available: false,
      fresh: false,
      reason: "native-player-pose-unavailable",
      nativeGametic: -1,
      playerX: 0,
      playerY: 0,
      headingDegrees: 0,
      momentumX: 0,
      momentumY: 0,
      playerSectorIndex: -1,
      stationary: false
    },
    targetDistance: 0,
    targetBearingDegrees: 0,
    bearingErrorDegrees: 0,
    routeFrames: 0,
    routeTimeoutFrames: 0,
    routeRemainingFrames: 0,
    legFrames: 0,
    legTimeoutFrames: 0,
    legRemainingFrames: 0,
    combatFrames: 0,
    combatTimeoutFrames: 0,
    combatRemainingFrames: 0,
    combatOwnerKind: "none",
    combatOwnerIdentity: 0,
    poseMissingFrames: 0,
    failureCode: ""
  },
  gatekeeperTrace: {
    traceVersion: 1,
    expectedRuntimeType: 11,
    expectedSectorIndex: 74,
    expectedSpawnX: 3008,
    expectedSpawnY: -4416,
    snapshotAccepted: false,
    snapshotFresh: false,
    acquiredAlive: false,
    identity: 0,
    health: 0,
    currentSectorIndex: -1,
    topologyAccepted: false,
    topologyReason: "gatekeeper-topology-not-evaluated",
    lineOfSight: false,
    bearingErrorDegrees: 0,
    killCountAtAcquisition: -1,
    currentKillCount: -1,
    killCountAdvanced: false,
    killed: false,
    reason: "gatekeeper-not-evaluated"
  },
  threatTrace: {
    traceVersion: 1,
    snapshotAccepted: false,
    snapshotFresh: false,
    threatMatched: false,
    identity: 0,
    runtimeType: -1,
    sectorIndex: -1,
    health: 0,
    lineOfSight: false,
    bearingErrorDegrees: 0,
    stationaryFireAuthorized: false,
    reason: "route-threat-not-evaluated"
  },
  weaponTrace: unavailableWeaponTrace(),
  vitalityTrace: {
    traceVersion: 1,
    sessionId: "",
    runId: "",
    runGeneration: 0,
    evaluatedAtControlTick: 0,
    available: false,
    fresh: false,
    nativeGametic: -1,
    playerHealth: -1,
    playerState: -1,
    playerKillCount: -1,
    provenance: "native-e1m1-continuation-vitality-unavailable",
    deathCandidate: false,
    consecutiveDeathGametics: 0,
    requiredDeathGametics: 3,
    nativeDeathConfirmed: false,
    restartRequested: false,
    restartRequestId: "",
    restartReason: "none"
  },
  semanticProjection: semantic({
    telos: "ZigzagRoute",
    objective: "await-post-completion-proof"
  })
});
const waiting = adapter.evaluate(input);
assert.throws(
  () => adapter.dispatch(waiting),
  error => error?.aikernelCSharpNextOwner === true && /not acquired/.test(error.message),
  "NotAcquired must not fall back to the legacy JS route owner");

console.log("CSHARP_E1M1_CONTINUATION_ADAPTER_VM_TEST_OK");
