(function () {
  "use strict";

  const CONTRACT_VERSION = 2;
  const MIN_INT32 = -0x80000000;
  const MAX_INT32 = 0x7fffffff;
  const MAX_UINT32 = 0xffffffff;
  const MAX_ACTOR_SNAPSHOT_CAPACITY = 64;
  const NUMBER_OF_WEAPONS = 9;
  const NO_PENDING_WEAPON = 10;
  const NATIVE_ATTACK_ALIGNMENT_TOLERANCE_DEGREES = 5;
  const STATES = new Set([
    "WaitingForFirstDoorHandoff",
    "EnterComputerRoom",
    "AwaitComputerRoomConfirmation",
    "NavigateMainRoute",
    "RecoverEnemyAlcove",
    "InterceptEnemy",
    "FireReady",
    "Complete",
    "FailedSafeStop"
  ]);
  const DISPOSITIONS = new Set([
    "NotAcquired",
    "Exclusive",
    "Completed",
    "FailedSafeStop"
  ]);

  function fail(message) {
    const error = new Error(`Invalid C# post-COMPUTERROOM route contract: ${message}`);
    error.aikernelCSharpNextOwner = true;
    throw error;
  }

  function requireWire(condition, message) {
    if (!condition) {
      fail(message);
    }
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function finiteNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function safeInteger(value, name, minimum = 0) {
    requireWire(Number.isSafeInteger(value) && value >= minimum, `${name} must be an integer >= ${minimum}`);
  }

  function integerRange(value, name, minimum, maximum) {
    requireWire(
      Number.isSafeInteger(value) && value >= minimum && value <= maximum,
      `${name} must be an integer within [${minimum}, ${maximum}]`);
  }

  function firstBoolean(...values) {
    for (const value of values) {
      if (value === true || value === false) {
        return value;
      }
    }
    return false;
  }

  function copyEnemyRegion9Sample(value) {
    if (value === undefined || value === null) {
      return [];
    }

    requireWire(Array.isArray(value), "enemyRegion9Sample must be an array");
    requireWire(value.length === 9, "enemyRegion9Sample must contain exactly 9 cells");
    return value.map((cell, index) => {
      const numeric = Number(cell);
      requireWire(
        Number.isFinite(numeric) && numeric >= 0 && numeric <= 1,
        `enemyRegion9Sample[${index}] must be finite and in [0,1]`);
      return numeric;
    });
  }

  function unavailableActorSnapshot() {
    return {
      available: false,
      gametic: -1,
      count: 0,
      capacity: 0,
      truncated: false,
      actors: []
    };
  }

  function copyActorSnapshot(value, nativeRun, firstDoorInput) {
    if (value === undefined) {
      return unavailableActorSnapshot();
    }

    requireWire(isRecord(value), "native actorSnapshot must be an object");
    requireWire(typeof value.available === "boolean", "native actorSnapshot.available must be boolean");
    if (!value.available) {
      return unavailableActorSnapshot();
    }

    integerRange(value.gametic, "native actorSnapshot.gametic", 0, MAX_INT32);
    integerRange(
      value.capacity,
      "native actorSnapshot.capacity",
      0,
      MAX_ACTOR_SNAPSHOT_CAPACITY);
    integerRange(value.count, "native actorSnapshot.count", 0, value.capacity);
    requireWire(
      typeof value.truncated === "boolean",
      "native actorSnapshot.truncated must be boolean");
    requireWire(Array.isArray(value.actors), "native actorSnapshot.actors must be an array");
    requireWire(
      value.actors.length === value.count,
      "native actorSnapshot.actors length must equal count");

    requireWire(
      isRecord(nativeRun) && nativeRun.available === true,
      "available native actorSnapshot requires available run facts");
    integerRange(nativeRun.gametic, "native run.gametic", 0, MAX_INT32);
    requireWire(
      value.gametic === nativeRun.gametic,
      "native actorSnapshot.gametic must match native run.gametic");
    requireWire(
      isRecord(firstDoorInput) && firstDoorInput.nativeLevelFactsAvailable === true,
      "available native actorSnapshot requires FirstDoor native level facts");
    integerRange(firstDoorInput.nativeGametic, "FirstDoor input.nativeGametic", 0, MAX_INT32);
    requireWire(
      value.gametic === firstDoorInput.nativeGametic,
      "native actorSnapshot.gametic must match FirstDoor input.nativeGametic");

    const identities = new Set();
    const actors = value.actors.map((actor, index) => {
      const name = `native actorSnapshot.actors[${index}]`;
      requireWire(isRecord(actor), `${name} must be an object`);
      integerRange(actor.identity, `${name}.identity`, 1, MAX_UINT32);
      requireWire(!identities.has(actor.identity), `${name}.identity must be unique`);
      identities.add(actor.identity);
      integerRange(actor.xFixed, `${name}.xFixed`, MIN_INT32, MAX_INT32);
      integerRange(actor.yFixed, `${name}.yFixed`, MIN_INT32, MAX_INT32);
      integerRange(actor.sectorIndex, `${name}.sectorIndex`, -1, MAX_INT32);
      integerRange(actor.type, `${name}.type`, MIN_INT32, MAX_INT32);
      integerRange(actor.health, `${name}.health`, MIN_INT32, MAX_INT32);
      integerRange(actor.flags, `${name}.flags`, 0, MAX_UINT32);
      requireWire(typeof actor.lineOfSight === "boolean", `${name}.lineOfSight must be boolean`);
      return {
        identity: actor.identity,
        xFixed: actor.xFixed,
        yFixed: actor.yFixed,
        sectorIndex: actor.sectorIndex,
        type: actor.type,
        health: actor.health,
        flags: actor.flags,
        lineOfSight: actor.lineOfSight
      };
    });

    return {
      available: true,
      gametic: value.gametic,
      count: value.count,
      capacity: value.capacity,
      truncated: value.truncated,
      actors
    };
  }

  function unavailableWeaponSnapshot() {
    return {
      available: false,
      gametic: -1,
      stateCount: -1,
      readyWeapon: -1,
      pendingWeapon: -1,
      weaponState: -1,
      weaponReadyState: -1,
      refire: -1
    };
  }

  function copyWeaponSnapshot(value, nativeRun, firstDoorInput) {
    if (value === undefined || value === null) {
      return unavailableWeaponSnapshot();
    }
    requireWire(isRecord(value), "native weapon facts must be an object");
    requireWire(typeof value.available === "boolean", "native weapon.available must be boolean");
    if (!value.available) {
      return unavailableWeaponSnapshot();
    }

    requireWire(isRecord(nativeRun) && nativeRun.available === true,
      "available native weapon facts require available run facts");
    integerRange(nativeRun.gametic, "native run.gametic", 0, MAX_INT32);
    requireWire(
      isRecord(firstDoorInput) && firstDoorInput.nativeLevelFactsAvailable === true,
      "available native weapon facts require FirstDoor native level facts");
    integerRange(firstDoorInput.nativeGametic, "FirstDoor input.nativeGametic", 0, MAX_INT32);
    requireWire(
      nativeRun.gametic === firstDoorInput.nativeGametic,
      "native weapon gametic must match FirstDoor input.nativeGametic");
    integerRange(value.readyWeapon, "native weapon.readyWeapon", 0, NUMBER_OF_WEAPONS - 1);
    integerRange(value.pendingWeapon, "native weapon.pendingWeapon", 0, NO_PENDING_WEAPON);
    requireWire(
      value.pendingWeapon === NO_PENDING_WEAPON || value.pendingWeapon < NUMBER_OF_WEAPONS,
      "native weapon.pendingWeapon is not a weapon or no-change sentinel");
    integerRange(value.stateCount, "native weapon.stateCount", 1, MAX_INT32);
    integerRange(value.weaponState, "native weapon.weaponState", 0, value.stateCount - 1);
    integerRange(value.readyState, "native weapon.readyState", 0, value.stateCount - 1);
    integerRange(value.refire, "native weapon.refire", 0, MAX_INT32);
    return {
      available: true,
      gametic: nativeRun.gametic,
      stateCount: value.stateCount,
      readyWeapon: value.readyWeapon,
      pendingWeapon: value.pendingWeapon,
      weaponState: value.weaponState,
      weaponReadyState: value.readyState,
      refire: value.refire
    };
  }

  function createInput(runtime, firstDoorPacket, wasmState = {}, autoplayState = {}, nativeFacts = {}) {
    requireWire(isRecord(runtime), "runtime is required");
    requireWire(isRecord(firstDoorPacket?.decision), "validated FirstDoor decision is required");
    const decision = firstDoorPacket.decision;
    const state = isRecord(autoplayState) ? autoplayState : {};
    const frame = isRecord(state.framebuffer) ? state.framebuffer : {};
    const sensor = isRecord(wasmState) ? wasmState : {};
    const rawObservation = isRecord(firstDoorPacket?.input?.rawObservation)
      ? firstDoorPacket.input.rawObservation
      : {};
    const actorSnapshot = copyActorSnapshot(
      nativeFacts?.actorSnapshot,
      nativeFacts?.run,
      firstDoorPacket?.input);
    const weaponSnapshot = copyWeaponSnapshot(
      nativeFacts?.player?.weapon,
      nativeFacts?.run,
      firstDoorPacket?.input);
    const enemyRegion9Sample = copyEnemyRegion9Sample(frame.enemyRegion9Sample);
    let structuredFrameAvailable = false;
    if (rawObservation.available === true && enemyRegion9Sample.length === 9) {
      const unavailableIdentitySentinel = rawObservation.frameSequence === -1
        || rawObservation.nativeGameticObservedAtEvaluation === -1;
      if (!unavailableIdentitySentinel) {
        safeInteger(rawObservation.frameSequence, "rawObservation.frameSequence");
        safeInteger(
          rawObservation.nativeGameticObservedAtEvaluation,
          "rawObservation.nativeGameticObservedAtEvaluation");
        structuredFrameAvailable = true;
      }
    }
    return {
      contractVersion: CONTRACT_VERSION,
      sessionId: String(decision.sessionId || ""),
      runId: String(decision.runId || ""),
      runGeneration: Number(decision.runGeneration || 0),
      expectedFirstDoorControlTick: Number(decision.controlTick || 0),
      actorSnapshot,
      weaponSnapshot,
      combatObservation: {
        rawFrameSequence: structuredFrameAvailable
          ? rawObservation.frameSequence
          : -1,
        rawNativeGametic: structuredFrameAvailable
          ? rawObservation.nativeGameticObservedAtEvaluation
          : -1,
        enemyRegion9Sample: structuredFrameAvailable
          ? enemyRegion9Sample
          : [],
        visualEnemyVisible: firstBoolean(
          sensor.visualEnemyVisible,
          state.visualEnemyVisible,
          frame.visualEnemyVisible,
          frame.enemyVisible,
          runtime.autoplayVisualEnemyVisible),
        visualEnemyCentered: firstBoolean(
          sensor.visualEnemyCentered,
          state.visualEnemyCentered,
          frame.visualEnemyCentered,
          frame.enemyCentered,
          runtime.autoplayVisualEnemyCentered),
        visualEnemyFireReady: firstBoolean(
          sensor.visualEnemyFireReady,
          state.visualEnemyFireReady,
          frame.visualEnemyFireReady,
          runtime.autoplayVisualEnemyFireReady),
        enemyStructuralDecoy: firstBoolean(
          sensor.enemyStructuralDecoy,
          state.enemyStructuralDecoy,
          frame.enemyStructuralDecoy),
        enemyConfidence: finiteNumber(
          sensor.enemyConfidence
            ?? state.enemyConfidence
            ?? frame.enemyConfidence
            ?? runtime.autoplayEnemyConfidence,
          0),
        visualEnemyYaw: finiteNumber(
          sensor.visualEnemyYaw
            ?? state.visualEnemyYaw
            ?? frame.visualEnemyYaw
            ?? runtime.autoplayVisualEnemyYaw,
          0)
      }
    };
  }

  function validateAction(action) {
    requireWire(isRecord(action), "action must be an object");
    for (const name of [
      "moveForward",
      "moveBackward",
      "strafeLeft",
      "strafeRight",
      "useKey",
      "attackKey"
    ]) {
      requireWire(typeof action[name] === "boolean", `action.${name} must be boolean`);
    }
    requireWire(Number.isSafeInteger(action.turnYaw), "action.turnYaw must be an integer");
    requireWire(action.turnYaw >= -180 && action.turnYaw <= 180, "action.turnYaw is out of range");
    requireWire(!(action.moveForward && action.moveBackward), "forward/backward are contradictory");
    requireWire(!(action.useKey && action.attackKey), "Use and Attack are contradictory");
    requireWire(
      !action.attackKey
        || (!action.moveForward
          && !action.moveBackward
          && !action.strafeLeft
          && !action.strafeRight
          && action.turnYaw === 0),
      "Attack must be stationary");
  }

  function isNeutralAction(action) {
    return action.moveForward === false
      && action.moveBackward === false
      && action.strafeLeft === false
      && action.strafeRight === false
      && action.turnYaw === 0
      && action.useKey === false
      && action.attackKey === false;
  }

  function validateCombatObservation(combat, expected) {
    requireWire(isRecord(combat), "combatObservation is required");
    requireWire(
      Number.isSafeInteger(combat.rawFrameSequence) && combat.rawFrameSequence >= -1,
      "combatObservation.rawFrameSequence must be an integer >= -1");
    requireWire(
      Number.isSafeInteger(combat.rawNativeGametic) && combat.rawNativeGametic >= -1,
      "combatObservation.rawNativeGametic must be an integer >= -1");
    requireWire(
      Array.isArray(combat.enemyRegion9Sample)
        && (combat.enemyRegion9Sample.length === 0 || combat.enemyRegion9Sample.length === 9),
      "combatObservation.enemyRegion9Sample must contain 0 or 9 cells");
    const structuredIdentityAvailable = combat.rawFrameSequence >= 0
      && combat.rawNativeGametic >= 0;
    requireWire(
      (combat.rawFrameSequence >= 0) === (combat.rawNativeGametic >= 0),
      "combatObservation raw identity must be wholly available or unavailable");
    requireWire(
      (combat.enemyRegion9Sample.length === 9) === structuredIdentityAvailable,
      "combatObservation sample availability does not match raw identity");
    for (let index = 0; index < combat.enemyRegion9Sample.length; index += 1) {
      const value = combat.enemyRegion9Sample[index];
      requireWire(
        Number.isFinite(value) && value >= 0 && value <= 1,
        `combatObservation.enemyRegion9Sample[${index}] must be finite and in [0,1]`);
    }
    for (const name of [
      "visualEnemyVisible",
      "visualEnemyCentered",
      "visualEnemyFireReady",
      "enemyStructuralDecoy"
    ]) {
      requireWire(typeof combat[name] === "boolean", `combatObservation.${name} must be boolean`);
    }
    for (const name of ["enemyConfidence", "visualEnemyYaw"]) {
      requireWire(Number.isFinite(combat[name]), `combatObservation.${name} must be finite`);
    }
    if (isRecord(expected)) {
      for (const name of [
        "rawFrameSequence",
        "rawNativeGametic",
        "visualEnemyVisible",
        "visualEnemyCentered",
        "visualEnemyFireReady",
        "enemyStructuralDecoy",
        "enemyConfidence",
        "visualEnemyYaw"
      ]) {
        requireWire(
          combat[name] === expected[name],
          `combatObservation.${name} changed across the C# wire`);
      }
      requireWire(
        combat.enemyRegion9Sample.length === expected.enemyRegion9Sample.length
          && combat.enemyRegion9Sample.every((value, index) =>
            value === expected.enemyRegion9Sample[index]),
        "combatObservation.enemyRegion9Sample changed across the C# wire");
    }
  }

  function validateActorSnapshot(snapshot, expected) {
    requireWire(isRecord(snapshot), "actorSnapshot is required");
    requireWire(typeof snapshot.available === "boolean", "actorSnapshot.available must be boolean");
    integerRange(snapshot.gametic, "actorSnapshot.gametic", -1, MAX_INT32);
    integerRange(
      snapshot.capacity,
      "actorSnapshot.capacity",
      0,
      MAX_ACTOR_SNAPSHOT_CAPACITY);
    integerRange(snapshot.count, "actorSnapshot.count", 0, snapshot.capacity);
    requireWire(typeof snapshot.truncated === "boolean", "actorSnapshot.truncated must be boolean");
    requireWire(Array.isArray(snapshot.actors), "actorSnapshot.actors must be an array");
    requireWire(snapshot.actors.length === snapshot.count, "actorSnapshot.actors length must equal count");
    if (snapshot.available) {
      requireWire(snapshot.gametic >= 0, "available actorSnapshot requires gametic >= 0");
    } else {
      requireWire(
        snapshot.gametic === -1
          && snapshot.count === 0
          && snapshot.capacity === 0
          && snapshot.truncated === false
          && snapshot.actors.length === 0,
        "unavailable actorSnapshot must use canonical sentinels");
    }

    const identities = new Set();
    for (let index = 0; index < snapshot.actors.length; index += 1) {
      const actor = snapshot.actors[index];
      const name = `actorSnapshot.actors[${index}]`;
      requireWire(isRecord(actor), `${name} must be an object`);
      integerRange(actor.identity, `${name}.identity`, 1, MAX_UINT32);
      requireWire(!identities.has(actor.identity), `${name}.identity must be unique`);
      identities.add(actor.identity);
      integerRange(actor.xFixed, `${name}.xFixed`, MIN_INT32, MAX_INT32);
      integerRange(actor.yFixed, `${name}.yFixed`, MIN_INT32, MAX_INT32);
      integerRange(actor.sectorIndex, `${name}.sectorIndex`, -1, MAX_INT32);
      integerRange(actor.type, `${name}.type`, MIN_INT32, MAX_INT32);
      integerRange(actor.health, `${name}.health`, MIN_INT32, MAX_INT32);
      integerRange(actor.flags, `${name}.flags`, 0, MAX_UINT32);
      requireWire(typeof actor.lineOfSight === "boolean", `${name}.lineOfSight must be boolean`);
    }

    if (isRecord(expected)) {
      requireWire(snapshot.available === expected.available, "actorSnapshot.available changed across the C# wire");
      requireWire(snapshot.gametic === expected.gametic, "actorSnapshot.gametic changed across the C# wire");
      requireWire(snapshot.count === expected.count, "actorSnapshot.count changed across the C# wire");
      requireWire(snapshot.capacity === expected.capacity, "actorSnapshot.capacity changed across the C# wire");
      requireWire(snapshot.truncated === expected.truncated, "actorSnapshot.truncated changed across the C# wire");
      requireWire(
        snapshot.actors.length === expected.actors.length
          && snapshot.actors.every((actor, index) => {
            const expectedActor = expected.actors[index];
            return actor.identity === expectedActor.identity
              && actor.xFixed === expectedActor.xFixed
              && actor.yFixed === expectedActor.yFixed
              && actor.sectorIndex === expectedActor.sectorIndex
              && actor.type === expectedActor.type
              && actor.health === expectedActor.health
              && actor.flags === expectedActor.flags
              && actor.lineOfSight === expectedActor.lineOfSight;
          }),
        "actorSnapshot.actors changed across the C# wire");
    }
  }

  function validateWeaponSnapshot(snapshot, expected) {
    requireWire(isRecord(snapshot), "weaponSnapshot is required");
    requireWire(typeof snapshot.available === "boolean", "weaponSnapshot.available must be boolean");
    integerRange(snapshot.gametic, "weaponSnapshot.gametic", -1, MAX_INT32);
    for (const name of [
      "stateCount",
      "readyWeapon",
      "pendingWeapon",
      "weaponState",
      "weaponReadyState",
      "refire"
    ]) {
      integerRange(snapshot[name], `weaponSnapshot.${name}`, -1, MAX_INT32);
    }
    if (snapshot.available) {
      integerRange(snapshot.stateCount, "weaponSnapshot.stateCount", 1, MAX_INT32);
      integerRange(snapshot.readyWeapon, "weaponSnapshot.readyWeapon", 0, NUMBER_OF_WEAPONS - 1);
      integerRange(snapshot.pendingWeapon, "weaponSnapshot.pendingWeapon", 0, NO_PENDING_WEAPON);
      requireWire(
        snapshot.pendingWeapon === NO_PENDING_WEAPON
          || snapshot.pendingWeapon < NUMBER_OF_WEAPONS,
        "weaponSnapshot.pendingWeapon is not a weapon or no-change sentinel");
      requireWire(
        snapshot.gametic >= 0
          && snapshot.weaponState >= 0
          && snapshot.weaponState < snapshot.stateCount
          && snapshot.weaponReadyState >= 0
          && snapshot.weaponReadyState < snapshot.stateCount
          && snapshot.refire >= 0,
        "available weaponSnapshot requires bounded engine facts");
    } else {
      requireWire(
        snapshot.gametic === -1
          && snapshot.stateCount === -1
          && snapshot.readyWeapon === -1
          && snapshot.pendingWeapon === -1
          && snapshot.weaponState === -1
          && snapshot.weaponReadyState === -1
          && snapshot.refire === -1,
        "unavailable weaponSnapshot must use canonical sentinels");
    }
    if (isRecord(expected)) {
      for (const name of [
        "available",
        "gametic",
        "stateCount",
        "readyWeapon",
        "pendingWeapon",
        "weaponState",
        "weaponReadyState",
        "refire"
      ]) {
        requireWire(
          snapshot[name] === expected[name],
          `weaponSnapshot.${name} changed across the C# wire`);
      }
    }
  }

  function exactNativeWeaponFireOpportunity(evidence) {
    return evidence.nativeWeaponSnapshotAccepted
      && evidence.nativeWeaponSnapshotFresh
      && evidence.nativeReadyWeapon >= 0
      && evidence.nativePendingWeapon === NO_PENDING_WEAPON
      && evidence.nativeWeaponStateCount > 0
      && evidence.nativeWeaponState >= 0
      && evidence.nativeWeaponState < evidence.nativeWeaponStateCount
      && evidence.nativeWeaponReadyState >= 0
      && evidence.nativeWeaponReadyState < evidence.nativeWeaponStateCount
      && evidence.nativeWeaponState === evidence.nativeWeaponReadyState
      && evidence.nativeWeaponRefire === 0;
  }

  function validateNativeWeaponContinuation(
    evidence,
    name,
    controlTick,
    action,
    requireCurrentActorAuthority = false) {
    for (const field of [
      "nativeWeaponContinuationArmed",
      "nativeWeaponAttackContinuation"
    ]) {
      requireWire(typeof evidence[field] === "boolean", `${name}.${field} must be boolean`);
    }
    integerRange(
      evidence.nativeWeaponContinuationTargetIdentity,
      `${name}.nativeWeaponContinuationTargetIdentity`,
      0,
      MAX_UINT32);
    integerRange(
      evidence.nativeWeaponContinuationReadyWeapon,
      `${name}.nativeWeaponContinuationReadyWeapon`,
      -1,
      NUMBER_OF_WEAPONS - 1);
    safeInteger(
      evidence.nativeWeaponContinuationAuthorizedAtControlTick,
      `${name}.nativeWeaponContinuationAuthorizedAtControlTick`,
      -1);

    if (evidence.nativeWeaponContinuationArmed) {
      requireWire(
        evidence.nativeWeaponSnapshotAccepted
          && evidence.nativeWeaponSnapshotFresh
          && evidence.nativePendingWeapon === NO_PENDING_WEAPON,
        `${name} armed native weapon continuation requires fresh accepted facts with no pending change`);
      requireWire(
        evidence.nativeWeaponContinuationTargetIdentity > 0
          && evidence.nativeWeaponContinuationTargetIdentity === evidence.nativeActorTargetIdentity,
        `${name} armed native weapon continuation must retain the same native actor target`);
      requireWire(
        evidence.nativeWeaponContinuationReadyWeapon >= 0
          && evidence.nativeWeaponContinuationReadyWeapon === evidence.nativeReadyWeapon,
        `${name} armed native weapon continuation must retain the same ready weapon`);
      requireWire(
        evidence.nativeWeaponContinuationAuthorizedAtControlTick >= 1
          && evidence.nativeWeaponContinuationAuthorizedAtControlTick <= controlTick,
        `${name} armed native weapon continuation authorization tick is not current`);
      requireWire(
        evidence.nativeActorTargetHealth > 0
          && evidence.nativeActorTargetLineOfSight
          && evidence.nativeActorTopologyAccepted
          && evidence.nativeActorTopologyReason === "native-actor-topology-local"
          && Number.isFinite(evidence.nativeActorTargetBearingErrorDegrees)
          && Math.abs(evidence.nativeActorTargetBearingErrorDegrees)
            <= NATIVE_ATTACK_ALIGNMENT_TOLERANCE_DEGREES,
        `${name} armed native weapon continuation lacks current actor proof`);
      if (requireCurrentActorAuthority) {
        requireWire(
          evidence.nativeActorSnapshotAccepted
            && evidence.nativeActorSnapshotFresh
            && evidence.nativeActorMatched
            && evidence.nativeActorTargetRetained
            && evidence.nativeActorCombatTrusted
            && !evidence.nativeActorKillConfirmed,
          `${name} armed native weapon continuation lacks current actor authority`);
      }
    } else {
      requireWire(
        evidence.nativeWeaponContinuationTargetIdentity === 0
          && evidence.nativeWeaponContinuationReadyWeapon === -1
          && evidence.nativeWeaponContinuationAuthorizedAtControlTick === -1,
        `${name} unarmed native weapon continuation must use canonical sentinels`);
    }

    const exactFireOpportunity = exactNativeWeaponFireOpportunity(evidence);
    requireWire(
      evidence.nativeWeaponFireOpportunity === exactFireOpportunity,
      `${name} native weapon fire opportunity does not match exact fresh engine proof`);
    if (evidence.nativeWeaponAttackContinuation) {
      requireWire(
        evidence.nativeWeaponContinuationArmed
          && evidence.playerSectorIndex === 60
          && evidence.nativeActorTargetSectorIndex === 60
          && !exactFireOpportunity
          && evidence.nativeWeaponState !== evidence.nativeWeaponReadyState,
        `${name}.nativeWeaponAttackContinuation lacks a current player-and-actor sector-60 busy-cycle continuation`);
    }
    requireWire(
      evidence.nativeWeaponAttackContinuation
        === (action.attackKey && !exactFireOpportunity),
      `${name}.nativeWeaponAttackContinuation does not match the current C# Attack decision`);
    requireWire(
      !action.attackKey
        || exactFireOpportunity
        || evidence.nativeWeaponAttackContinuation,
      `${name}.action Attack requires an exact fire opportunity or current C# continuation`);
  }

  function validateReplayEntry(entry, name) {
    requireWire(isRecord(entry), `${name} must be an object`);
    safeInteger(entry.controlTick, `${name}.controlTick`, 1);
    safeInteger(entry.nativeGametic, `${name}.nativeGametic`, -1);
    requireWire(STATES.has(entry.state), `${name}.state is unknown`);
    requireWire(typeof entry.reasonCode === "string" && entry.reasonCode.length > 0, `${name}.reasonCode is required`);
    integerRange(entry.playerSectorIndex, `${name}.playerSectorIndex`, -1, MAX_INT32);
    requireWire(Number.isFinite(entry.playerX), `${name}.playerX must be finite`);
    requireWire(Number.isFinite(entry.playerY), `${name}.playerY must be finite`);
    integerRange(entry.legIndex, `${name}.legIndex`, -1, MAX_INT32);
    requireWire(typeof entry.legId === "string", `${name}.legId must be a string`);
    safeInteger(entry.routeFrames, `${name}.routeFrames`);
    safeInteger(entry.legFrames, `${name}.legFrames`);
    integerRange(entry.nativeActorTargetIdentity, `${name}.nativeActorTargetIdentity`, 0, MAX_UINT32);
    integerRange(entry.nativeActorTargetSectorIndex, `${name}.nativeActorTargetSectorIndex`, -1, MAX_INT32);
    integerRange(entry.nativeActorTargetHealth, `${name}.nativeActorTargetHealth`, MIN_INT32, MAX_INT32);
    requireWire(
      typeof entry.nativeActorTargetLineOfSight === "boolean",
      `${name}.nativeActorTargetLineOfSight must be boolean`);
    requireWire(
      Number.isFinite(entry.nativeActorTargetBearingErrorDegrees),
      `${name}.nativeActorTargetBearingErrorDegrees must be finite`);
    requireWire(
      typeof entry.nativeActorTopologyAccepted === "boolean",
      `${name}.nativeActorTopologyAccepted must be boolean`);
    requireWire(
      typeof entry.nativeActorTopologyReason === "string"
        && entry.nativeActorTopologyReason.length > 0
        && entry.nativeActorTopologyReason.length <= 128,
      `${name}.nativeActorTopologyReason must contain 1..128 characters`);
    safeInteger(entry.nativeActorEngagementFrames, `${name}.nativeActorEngagementFrames`);
    requireWire(
      typeof entry.nativeActorCombatReason === "string",
      `${name}.nativeActorCombatReason must be a string`);
    for (const field of [
      "nativeWeaponSnapshotAccepted",
      "nativeWeaponSnapshotFresh",
      "nativeWeaponFireOpportunity",
      "nativeWeaponContinuationArmed",
      "nativeWeaponAttackContinuation"
    ]) {
      requireWire(typeof entry[field] === "boolean", `${name}.${field} must be boolean`);
    }
    integerRange(entry.nativeReadyWeapon, `${name}.nativeReadyWeapon`, -1, NUMBER_OF_WEAPONS - 1);
    integerRange(entry.nativePendingWeapon, `${name}.nativePendingWeapon`, -1, NO_PENDING_WEAPON);
    integerRange(entry.nativeWeaponStateCount, `${name}.nativeWeaponStateCount`, -1, MAX_INT32);
    requireWire(
      entry.nativePendingWeapon < NUMBER_OF_WEAPONS
        || entry.nativePendingWeapon === NO_PENDING_WEAPON,
      `${name}.nativePendingWeapon is not a weapon or no-change sentinel`);
    integerRange(entry.nativeWeaponState, `${name}.nativeWeaponState`, -1, MAX_INT32);
    integerRange(entry.nativeWeaponReadyState, `${name}.nativeWeaponReadyState`, -1, MAX_INT32);
    integerRange(entry.nativeWeaponRefire, `${name}.nativeWeaponRefire`, -1, MAX_INT32);
    requireWire(
      typeof entry.nativeWeaponReason === "string" && entry.nativeWeaponReason.length > 0,
      `${name}.nativeWeaponReason is required`);
    requireWire(
      !entry.nativeWeaponSnapshotFresh || entry.nativeWeaponSnapshotAccepted,
      `${name}.nativeWeaponSnapshotFresh requires an accepted snapshot`);
    if (entry.nativeWeaponSnapshotAccepted) {
      requireWire(
        entry.nativeWeaponStateCount > 0
          && entry.nativeReadyWeapon >= 0
          && entry.nativePendingWeapon >= 0
          && entry.nativeWeaponState >= 0
          && entry.nativeWeaponState < entry.nativeWeaponStateCount
          && entry.nativeWeaponReadyState >= 0
          && entry.nativeWeaponReadyState < entry.nativeWeaponStateCount
          && entry.nativeWeaponRefire >= 0,
        `${name} accepted weapon snapshot lacks bounded engine facts`);
    } else {
      requireWire(
        entry.nativeWeaponStateCount === -1
          && entry.nativeReadyWeapon === -1
          && entry.nativePendingWeapon === -1
          && entry.nativeWeaponState === -1
          && entry.nativeWeaponReadyState === -1
          && entry.nativeWeaponRefire === -1,
        `${name} unavailable weapon snapshot must use canonical sentinels`);
    }
    validateAction(entry.action);
    validateNativeWeaponContinuation(entry, name, entry.controlTick, entry.action);
    requireWire(typeof entry.runRequested === "boolean", `${name}.runRequested must be boolean`);
  }

  function validateFailureTrace(trace, decision) {
    requireWire(isRecord(trace), "failureTrace is required");
    requireWire(typeof trace.failed === "boolean", "failureTrace.failed must be boolean");
    safeInteger(trace.failureAtControlTick, "failureTrace.failureAtControlTick", -1);
    requireWire(typeof trace.failureCode === "string", "failureTrace.failureCode must be a string");
    requireWire(Array.isArray(trace.replay), "failureTrace.replay must be an array");
    requireWire(trace.replay.length <= 32, "failureTrace.replay exceeds its bounded capacity");
    let previousTick = 0;
    for (let index = 0; index < trace.replay.length; index += 1) {
      const entry = trace.replay[index];
      validateReplayEntry(entry, `failureTrace.replay[${index}]`);
      requireWire(entry.controlTick > previousTick, "failureTrace.replay control ticks must strictly increase");
      requireWire(entry.controlTick <= decision.controlTick, "failureTrace.replay cannot lead the decision tick");
      previousTick = entry.controlTick;
    }

    requireWire(
      trace.failed === (decision.state === "FailedSafeStop")
        && trace.failed === (decision.ownershipDisposition === "FailedSafeStop"),
      "failureTrace.failed does not match the FailedSafeStop terminal decision");

    if (!trace.failed) {
      requireWire(trace.failureAtControlTick === -1, "non-failed failureTrace must use tick -1");
      requireWire(trace.failureCode.length === 0, "non-failed failureTrace cannot carry a failure code");
      requireWire(trace.failureSnapshot === null, "non-failed failureTrace cannot carry a failure snapshot");
      requireWire(trace.replay.length === 0, "non-failed failureTrace cannot carry replay evidence");
      return;
    }

    requireWire(trace.failureAtControlTick >= 1, "failed failureTrace requires a positive failure tick");
    requireWire(trace.failureAtControlTick <= decision.controlTick, "failure tick cannot lead the decision tick");
    requireWire(trace.failureCode.length > 0, "failed failureTrace requires a failure code");
    requireWire(
      decision.ownerId === "post-computer-room.failed-safe-stop"
        && decision.exclusive === true
        && decision.completed === false
        && decision.reasonCode === trace.failureCode
        && decision.navigation.failureCode === trace.failureCode
        && isNeutralAction(decision.action)
        && decision.runRequested === false,
      "failed decision lacks the canonical FailedSafeStop ownership and neutral action proof");
    validateReplayEntry(trace.failureSnapshot, "failureTrace.failureSnapshot");
    requireWire(
      trace.failureSnapshot.controlTick === trace.failureAtControlTick,
      "failureSnapshot tick must equal failureAtControlTick");
    requireWire(
      trace.failureSnapshot.state === "FailedSafeStop"
        && trace.failureSnapshot.reasonCode === trace.failureCode
        && isNeutralAction(trace.failureSnapshot.action)
        && trace.failureSnapshot.runRequested === false,
      "failureSnapshot must preserve the canonical FailedSafeStop neutral terminal proof");
    requireWire(trace.replay.length > 0, "failed failureTrace requires bounded replay evidence");
    const finalReplay = trace.replay[trace.replay.length - 1];
    requireWire(
      finalReplay.controlTick === trace.failureAtControlTick
        && JSON.stringify(finalReplay) === JSON.stringify(trace.failureSnapshot),
      "failureSnapshot must be the immutable terminal replay entry");
  }

  function validateCompletionTrace(trace, decision) {
    requireWire(isRecord(trace), "completionTrace is required");
    requireWire(typeof trace.completed === "boolean", "completionTrace.completed must be boolean");
    requireWire(
      typeof trace.sessionId === "string",
      "completionTrace.sessionId must be a string");
    requireWire(
      typeof trace.runId === "string",
      "completionTrace.runId must be a string");
    safeInteger(trace.runGeneration, "completionTrace.runGeneration");
    safeInteger(
      trace.completionAtControlTick,
      "completionTrace.completionAtControlTick",
      -1);
    requireWire(
      typeof trace.completionCode === "string",
      "completionTrace.completionCode must be a string");
    requireWire(Array.isArray(trace.replay), "completionTrace.replay must be an array");
    requireWire(trace.replay.length <= 32, "completionTrace.replay exceeds its bounded capacity");

    let previousTick = 0;
    for (let index = 0; index < trace.replay.length; index += 1) {
      const entry = trace.replay[index];
      validateReplayEntry(entry, `completionTrace.replay[${index}]`);
      requireWire(
        entry.controlTick > previousTick,
        "completionTrace.replay control ticks must strictly increase");
      requireWire(
        entry.controlTick <= decision.controlTick,
        "completionTrace.replay cannot lead the decision tick");
      previousTick = entry.controlTick;
    }

    requireWire(
      trace.completed === (decision.state === "Complete")
        && trace.completed === (decision.ownershipDisposition === "Completed")
        && trace.completed === (decision.completed === true),
      "completionTrace.completed does not match the terminal decision");
    requireWire(
      !(trace.completed && decision.failureTrace?.failed),
      "completionTrace and failureTrace are mutually exclusive");

    if (!trace.completed) {
      requireWire(
        trace.sessionId.length === 0
          && trace.runId.length === 0
          && trace.runGeneration === 0,
        "non-complete completionTrace must use empty run-scope sentinels");
      requireWire(
        trace.completionAtControlTick === -1,
        "non-complete completionTrace must use tick -1");
      requireWire(
        trace.completionCode.length === 0,
        "non-complete completionTrace cannot carry a completion code");
      requireWire(
        trace.completionSnapshot === null,
        "non-complete completionTrace cannot carry a completion snapshot");
      requireWire(
        trace.replay.length === 0,
        "non-complete completionTrace cannot carry replay evidence");
      return;
    }

    requireWire(
      trace.sessionId === decision.sessionId
        && trace.runId === decision.runId
        && trace.runGeneration === decision.runGeneration
        && trace.runGeneration > 0,
      "completionTrace run scope must exactly match the current Complete decision");
    requireWire(
      decision.state === "Complete"
        && decision.ownershipDisposition === "Completed"
        && decision.ownerId === "post-computer-room.central-hall"
        && decision.reasonCode === "central-hall-entry-confirmed"
        && decision.completed === true
        && decision.exclusive === false,
      "current Complete decision lacks the canonical terminal ownership proof");
    requireWire(
      isRecord(decision.semanticProjection)
        && decision.semanticProjection.computerRoomEntered === true
        && decision.semanticProjection.centralHallEntered === true,
      "current Complete decision lacks the canonical COMPUTERROOM and central-hall semantics");
    requireWire(
      trace.completionAtControlTick >= 1
        && trace.completionAtControlTick <= decision.controlTick,
      "completion tick must be positive and cannot lead the decision tick");
    validateReplayEntry(trace.completionSnapshot, "completionTrace.completionSnapshot");
    const snapshot = trace.completionSnapshot;
    requireWire(
      snapshot.controlTick === trace.completionAtControlTick,
      "completionSnapshot tick must equal completionAtControlTick");
    requireWire(
      trace.completionCode === "central-hall-entry-confirmed"
        && snapshot.reasonCode === trace.completionCode,
      "completionSnapshot reason must equal the canonical completion code");
    requireWire(trace.replay.length > 0, "completed completionTrace requires bounded replay evidence");
    const finalReplay = trace.replay[trace.replay.length - 1];
    requireWire(
      finalReplay.controlTick === trace.completionAtControlTick
        && JSON.stringify(finalReplay) === JSON.stringify(snapshot),
      "completionSnapshot must be the immutable terminal replay entry");
    requireWire(
      snapshot.state === "Complete"
        && snapshot.reasonCode === "central-hall-entry-confirmed"
        && snapshot.playerSectorIndex === 60
        && snapshot.legIndex === 8
        && snapshot.legId === "central-hall-entry",
      "completionSnapshot lacks the canonical sector-60 terminal route proof");
    requireWire(
      Number.isSafeInteger(snapshot.routeFrames)
        && snapshot.routeFrames >= 0
        && snapshot.routeFrames < 900
        && Number.isSafeInteger(snapshot.legFrames)
        && snapshot.legFrames >= 0
        && snapshot.legFrames < 180,
      "completionSnapshot exceeds the unchanged route or leg deadline");
    requireWire(
      isNeutralAction(snapshot.action) && snapshot.runRequested === false,
      "completionSnapshot must preserve a neutral no-run terminal action");
    requireWire(
      decision.reasonCode === snapshot.reasonCode
        && isNeutralAction(decision.action)
        && decision.runRequested === false,
      "current Complete decision must preserve the frozen terminal semantics");

    const navigation = decision.navigation;
    requireWire(
      navigation.active === true
        && navigation.recoveringEnemyAlcove === false
        && navigation.legIndex === snapshot.legIndex
        && navigation.legId === snapshot.legId
        && navigation.targetX === 2944
        && navigation.targetY === -3024
        && Array.isArray(navigation.allowedSectors)
        && navigation.allowedSectors.length === 2
        && navigation.allowedSectors[0] === 60
        && navigation.allowedSectors[1] === 71
        && navigation.failureCode === "",
      "current Complete navigation does not match the frozen terminal route");
    requireWire(
      isRecord(decision.proximity)
        && Number.isSafeInteger(decision.proximity.playerSectorIndex)
        && decision.proximity.playerSectorIndex >= -1
        && navigation.playerSectorIndex === decision.proximity.playerSectorIndex,
      "current Complete navigation sector must echo the current proximity sector");
    requireWire(
      navigation.routeTimeoutFrames === 900
        && navigation.legTimeoutFrames === 180,
      "current Complete navigation changed the route or leg deadline");
    requireWire(
      navigation.routeFrames === snapshot.routeFrames
        && navigation.legFrames === snapshot.legFrames,
      "current Complete navigation counters must equal the frozen completion counters");
    requireWire(
      navigation.routeRemainingFrames === 900 - snapshot.routeFrames
        && navigation.legRemainingFrames === 180 - snapshot.legFrames,
      "current Complete navigation remaining budgets do not match the frozen completion counters");
  }

  function validateNavigation(navigation, expectedWeaponSnapshot, action, controlTick) {
    requireWire(isRecord(navigation), "navigation is required");
    requireWire(navigation.snapshotVersion === 7, "navigation.snapshotVersion mismatch");
    integerRange(
      navigation.playerSectorIndex,
      "navigation.playerSectorIndex",
      -1,
      MAX_INT32);
    for (const name of [
      "trustedCombatEvidence",
      "legacyTrustedCombatEvidence",
      "structuredCombatInputAccepted",
      "structuredCombatFresh",
      "structuredCombatCandidate",
      "structuredCombatTrusted",
      "structuredCombatCentered",
      "nativeActorSnapshotAccepted",
      "nativeActorSnapshotFresh",
      "nativeActorVisualEvidenceTrusted",
      "nativeActorMatched",
      "nativeActorTargetRetained",
      "nativeActorCombatTrusted",
      "nativeActorKillConfirmed",
      "nativeActorTargetLineOfSight",
      "nativeActorTopologyAccepted",
      "nativeWeaponSnapshotAccepted",
      "nativeWeaponSnapshotFresh",
      "nativeWeaponFireOpportunity",
      "nativeWeaponContinuationArmed",
      "nativeWeaponAttackContinuation"
    ]) {
      requireWire(typeof navigation[name] === "boolean", `navigation.${name} must be boolean`);
    }
    safeInteger(
      navigation.structuredCombatDistinctFrames,
      "navigation.structuredCombatDistinctFrames");
    safeInteger(
      navigation.structuredCombatSupportCells,
      "navigation.structuredCombatSupportCells");
    requireWire(
      navigation.structuredCombatSupportCells <= 9,
      "navigation.structuredCombatSupportCells is out of range");
    for (const name of [
      "structuredCombatPeak",
      "structuredCombatTotal",
      "structuredCombatCenterCell",
      "structuredCombatLateralBias"
    ]) {
      requireWire(Number.isFinite(navigation[name]), `navigation.${name} must be finite`);
    }
    requireWire(
      typeof navigation.structuredCombatReason === "string",
      "navigation.structuredCombatReason must be a string");
    requireWire(
      !navigation.structuredCombatTrusted
        || (navigation.structuredCombatInputAccepted
          && navigation.structuredCombatFresh
          && navigation.structuredCombatCandidate
          && navigation.structuredCombatDistinctFrames >= 2),
      "trusted structured combat lacks its temporal proof");
    integerRange(
      navigation.nativeActorTargetIdentity,
      "navigation.nativeActorTargetIdentity",
      0,
      MAX_UINT32);
    integerRange(
      navigation.nativeActorTargetType,
      "navigation.nativeActorTargetType",
      -1,
      MAX_INT32);
    integerRange(
      navigation.nativeActorTargetSectorIndex,
      "navigation.nativeActorTargetSectorIndex",
      -1,
      MAX_INT32);
    integerRange(
      navigation.nativeActorTargetHealth,
      "navigation.nativeActorTargetHealth",
      MIN_INT32,
      MAX_INT32);
    integerRange(
      navigation.nativeActorTargetFlags,
      "navigation.nativeActorTargetFlags",
      0,
      MAX_UINT32);
    for (const name of [
      "nativeActorTargetBearingDegrees",
      "nativeActorTargetBearingErrorDegrees"
    ]) {
      requireWire(Number.isFinite(navigation[name]), `navigation.${name} must be finite`);
    }
    safeInteger(navigation.nativeActorEngagementFrames, "navigation.nativeActorEngagementFrames");
    safeInteger(navigation.nativeActorKillCountAtAcquisition, "navigation.nativeActorKillCountAtAcquisition");
    safeInteger(navigation.nativeActorCurrentKillCount, "navigation.nativeActorCurrentKillCount", -1);
    requireWire(
      typeof navigation.nativeActorCombatReason === "string",
      "navigation.nativeActorCombatReason must be a string");
    requireWire(
      typeof navigation.nativeActorTopologyReason === "string"
        && navigation.nativeActorTopologyReason.length > 0
        && navigation.nativeActorTopologyReason.length <= 128,
      "navigation.nativeActorTopologyReason must contain 1..128 characters");
    integerRange(navigation.nativeReadyWeapon, "navigation.nativeReadyWeapon", -1, NUMBER_OF_WEAPONS - 1);
    integerRange(navigation.nativePendingWeapon, "navigation.nativePendingWeapon", -1, NO_PENDING_WEAPON);
    integerRange(navigation.nativeWeaponStateCount, "navigation.nativeWeaponStateCount", -1, MAX_INT32);
    requireWire(
      navigation.nativePendingWeapon < NUMBER_OF_WEAPONS
        || navigation.nativePendingWeapon === NO_PENDING_WEAPON,
      "navigation.nativePendingWeapon is not a weapon or no-change sentinel");
    integerRange(navigation.nativeWeaponState, "navigation.nativeWeaponState", -1, MAX_INT32);
    integerRange(navigation.nativeWeaponReadyState, "navigation.nativeWeaponReadyState", -1, MAX_INT32);
    integerRange(navigation.nativeWeaponRefire, "navigation.nativeWeaponRefire", -1, MAX_INT32);
    requireWire(
      typeof navigation.nativeWeaponReason === "string" && navigation.nativeWeaponReason.length > 0,
      "navigation.nativeWeaponReason is required");
    requireWire(
      !navigation.nativeWeaponSnapshotFresh || navigation.nativeWeaponSnapshotAccepted,
      "navigation.nativeWeaponSnapshotFresh requires an accepted snapshot");
    if (navigation.nativeWeaponSnapshotAccepted) {
      requireWire(
        isRecord(expectedWeaponSnapshot) && expectedWeaponSnapshot.available === true,
        "accepted navigation weapon facts require an available echoed snapshot");
      requireWire(
        navigation.nativeWeaponStateCount === expectedWeaponSnapshot.stateCount
          && navigation.nativeReadyWeapon === expectedWeaponSnapshot.readyWeapon
          && navigation.nativePendingWeapon === expectedWeaponSnapshot.pendingWeapon
          && navigation.nativeWeaponState === expectedWeaponSnapshot.weaponState
          && navigation.nativeWeaponReadyState === expectedWeaponSnapshot.weaponReadyState
          && navigation.nativeWeaponRefire === expectedWeaponSnapshot.refire,
        "navigation weapon facts changed from the echoed native snapshot");
      requireWire(
        navigation.nativeWeaponStateCount > 0
          && navigation.nativeReadyWeapon >= 0
          && navigation.nativePendingWeapon >= 0
          && navigation.nativeWeaponState >= 0
          && navigation.nativeWeaponState < navigation.nativeWeaponStateCount
          && navigation.nativeWeaponReadyState >= 0
          && navigation.nativeWeaponReadyState < navigation.nativeWeaponStateCount
          && navigation.nativeWeaponRefire >= 0,
        "accepted navigation weapon facts lack bounded engine proof");
    } else {
      requireWire(
        navigation.nativeWeaponStateCount === -1
          && navigation.nativeReadyWeapon === -1
          && navigation.nativePendingWeapon === -1
          && navigation.nativeWeaponState === -1
          && navigation.nativeWeaponReadyState === -1
          && navigation.nativeWeaponRefire === -1,
        "unavailable navigation weapon facts must use canonical sentinels");
    }
    validateNativeWeaponContinuation(
      navigation,
      "navigation",
      controlTick,
      action,
      true);
    requireWire(typeof navigation.failureCode === "string", "navigation.failureCode must be a string");
  }

  function validateDecision(decision, input) {
    requireWire(isRecord(decision), "decision must be an object");
    requireWire(decision.implementationVersion === "post-computer-room-route-v8", "implementationVersion mismatch");
    requireWire(decision.policyVersion === "post-computer-room-route-policy-v8", "policyVersion mismatch");
    requireWire(decision.contractVersion === CONTRACT_VERSION, "contractVersion mismatch");
    requireWire(decision.sessionId === input.sessionId, "sessionId mismatch");
    requireWire(decision.runId === input.runId, "runId mismatch");
    requireWire(decision.runGeneration === input.runGeneration, "runGeneration mismatch");
    requireWire(
      decision.expectedFirstDoorControlTick === input.expectedFirstDoorControlTick,
      "FirstDoor completion tick mismatch");
    safeInteger(decision.controlTick, "controlTick", 1);
    requireWire(STATES.has(decision.state), "state is unknown");
    requireWire(DISPOSITIONS.has(decision.ownershipDisposition), "ownershipDisposition is unknown");
    requireWire(typeof decision.ownerId === "string" && decision.ownerId.startsWith("post-computer-room."), "ownerId is invalid");
    requireWire(typeof decision.reasonCode === "string" && decision.reasonCode.length > 0, "reasonCode is required");
    requireWire(typeof decision.exclusive === "boolean", "exclusive must be boolean");
    requireWire(typeof decision.completed === "boolean", "completed must be boolean");
    requireWire(typeof decision.runRequested === "boolean", "runRequested must be boolean");
    validateAction(decision.action);
    validateCombatObservation(decision.combatObservation, input.combatObservation);
    validateActorSnapshot(decision.actorSnapshot, input.actorSnapshot);
    validateWeaponSnapshot(decision.weaponSnapshot, input.weaponSnapshot);
    validateNavigation(
      decision.navigation,
      decision.weaponSnapshot,
      decision.action,
      decision.controlTick);
    validateFailureTrace(decision.failureTrace, decision);
    validateCompletionTrace(decision.completionTrace, decision);
    requireWire(isRecord(decision.semanticProjection), "semanticProjection is required");
    requireWire(typeof decision.semanticProjection.computerRoomEntered === "boolean", "computerRoomEntered must be boolean");
    requireWire(typeof decision.semanticProjection.centralHallEntered === "boolean", "centralHallEntered must be boolean");
    requireWire(
      typeof decision.semanticProjection.firstDoorOpenConfirmationSource === "string",
      "FirstDoor open source is required");
    requireWire(
      decision.ownershipDisposition === "NotAcquired"
        ? decision.semanticProjection.firstDoorOpenConfirmationSource === "None"
        : decision.semanticProjection.firstDoorOpenConfirmationSource !== "None",
      "FirstDoor open source does not match acquisition");
    const computerRoomEntered = decision.semanticProjection.computerRoomEntered;
    requireWire(
      decision.semanticProjection.telos === (computerRoomEntered ? "CentralHall" : "PostDoor"),
      "TELOS does not match COMPUTERROOM confirmation");
    requireWire(
      decision.semanticProjection.objective === (computerRoomEntered
        ? "reach-central-hall"
        : "enter-computer-room"),
      "objective does not match COMPUTERROOM confirmation");
    requireWire(
      !decision.semanticProjection.centralHallEntered || computerRoomEntered,
      "CentralHall cannot precede COMPUTERROOM confirmation");
    requireWire(
      decision.exclusive === (
        decision.ownershipDisposition === "Exclusive"
          || decision.ownershipDisposition === "FailedSafeStop"),
      "exclusive/disposition mismatch");
    requireWire(
      decision.completed === (decision.ownershipDisposition === "Completed"),
      "completed/disposition mismatch");
    return decision;
  }

  function evaluate(input) {
    const bridge = self.aiKernelDoomControl;
    requireWire(
      typeof bridge?.evaluateBrowserPostComputerRoomRoute === "function",
      "C# post-COMPUTERROOM bridge is unavailable");
    const decision = bridge.evaluateBrowserPostComputerRoomRoute(input);
    return validateDecision(
      typeof decision === "string" ? JSON.parse(decision) : decision,
      input);
  }

  function metadata(decision) {
    return {
      source: "csharp-post-computer-room",
      pipeline: decision.ownerId,
      controlPipeline: decision.ownerId,
      phasePipelineId: decision.ownerId,
      phasePipelineExclusive: decision.exclusive,
      stage: decision.reasonCode,
      safetyReason: decision.reasonCode,
      svcEvent: decision.reasonCode,
      actionSequenceId: `csharp-post-room-run-${decision.runGeneration}-tick-${decision.controlTick}`,
      actionSequenceStepId: decision.state
    };
  }

  function projectAction(decision) {
    const action = decision.action;
    const yaw = action.turnYaw;
    return Object.assign({
      move: action.moveForward ? "forward" : (action.moveBackward ? "back" : "none"),
      turn: yaw < 0 ? "left" : (yaw > 0 ? "right" : "none"),
      turnYaw: yaw,
      fire: action.attackKey,
      strafe: action.strafeLeft || action.strafeRight,
      use: action.useKey,
      run: decision.runRequested
    }, metadata(decision));
  }

  function neutralAction(decision) {
    return Object.assign({
      move: "none",
      turn: "none",
      turnYaw: 0,
      fire: false,
      strafe: false,
      use: false,
      run: false
    }, metadata(decision));
  }

  function semanticState(decision) {
    const projection = decision.semanticProjection;
    return {
      sessionId: decision.sessionId,
      runId: decision.runId,
      runGeneration: decision.runGeneration,
      controlTick: decision.controlTick,
      firstDoorOpened: true,
      computerRoomEntered: projection.computerRoomEntered,
      centralHallEntered: projection.centralHallEntered,
      doorOpenedCount: 1,
      source: projection.firstDoorOpenConfirmationSource,
      ownerId: decision.ownerId,
      state: decision.state,
      reasonCode: decision.reasonCode,
      telos: projection.telos,
      objective: projection.objective
    };
  }

  function cloneTransport(value, seen = new Map()) {
    if (value == null || typeof value !== "object") {
      return value;
    }
    if (seen.has(value)) {
      return seen.get(value);
    }
    if (Array.isArray(value)) {
      const cloned = [];
      seen.set(value, cloned);
      for (let index = 0; index < value.length; index += 1) {
        if (Object.prototype.hasOwnProperty.call(value, index)) {
          cloned[index] = cloneTransport(value[index], seen);
        }
      }
      return cloned;
    }
    const tag = Object.prototype.toString.call(value);
    if (tag === "[object ArrayBuffer]") {
      return value.slice(0);
    }
    if (tag === "[object DataView]") {
      const cloned = new DataView(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
      seen.set(value, cloned);
      return cloned;
    }
    if (ArrayBuffer.isView(value)) {
      const cloned = typeof value.slice === "function"
        ? value.slice()
        : new value.constructor(value);
      seen.set(value, cloned);
      return cloned;
    }
    if (tag === "[object Object]") {
      const cloned = {};
      seen.set(value, cloned);
      for (const key of Object.keys(value)) {
        cloned[key] = cloneTransport(value[key], seen);
      }
      return cloned;
    }
    return value;
  }

  function createPostRouteOverlay(legacyState, projectedSemanticState) {
    const raw = isRecord(legacyState) ? cloneTransport(legacyState) : {};
    const milestones = isRecord(raw.milestones) ? raw.milestones : {};
    return Object.assign(raw, {
      doorOpenedCount: Math.max(1, finiteNumber(raw.doorOpenedCount, 0)),
      firstDoorOpened: true,
      computerRoomEntered: projectedSemanticState.computerRoomEntered,
      centralHallEntered: projectedSemanticState.centralHallEntered,
      telos: projectedSemanticState.telos,
      objective: projectedSemanticState.objective,
      milestones: Object.assign({}, milestones, {
        doorOpened: Math.max(1, finiteNumber(milestones.doorOpened, 0)),
        doorOpenedCount: Math.max(1, finiteNumber(milestones.doorOpenedCount, 0)),
        firstDoorOpened: true,
        computerRoomEntered: projectedSemanticState.computerRoomEntered,
        centralHallEntered: projectedSemanticState.centralHallEntered
      }),
      csharpPostComputerRoomSemanticState: Object.assign({}, projectedSemanticState)
    });
  }

  function dispatch(decision, options = {}) {
    requireWire(isRecord(decision), "validated decision is required");
    const projectedSemanticState = semanticState(decision);
    if (decision.ownershipDisposition === "Exclusive") {
      return {
        mode: "exclusive",
        exact: true,
        action: projectAction(decision),
        semanticState: projectedSemanticState,
        decision
      };
    }
    if (decision.ownershipDisposition === "FailedSafeStop") {
      return {
        mode: "failed-safe-stop",
        exact: true,
        action: neutralAction(decision),
        semanticState: projectedSemanticState,
        decision
      };
    }
    if (decision.ownershipDisposition === "Completed") {
      requireWire(typeof options.legacyPredict === "function", "completed route requires the next owner");
      const legacyState = createPostRouteOverlay(options.legacyState, projectedSemanticState);
      const action = options.legacyPredict(legacyState);
      requireWire(isRecord(action), "next-owner action must be an object");
      return {
        mode: "completed",
        exact: false,
        action,
        legacyState,
        semanticState: projectedSemanticState,
        decision
      };
    }

    fail(`post route was not acquired: ${decision.reasonCode}`);
  }

  self.AIKernelDoomCSharpPostComputerRoomRoute = Object.freeze({
    contractVersion: CONTRACT_VERSION,
    createInput,
    validateDecision,
    evaluate,
    dispatch,
    semanticState,
    createPostRouteOverlay,
    projectAction,
    neutralAction
  });
})();
