(function () {
  "use strict";

  const CONTRACT_VERSION = 1;
  const MIN_INT32 = -2147483648;
  const MAX_INT32 = 2147483647;
  const MAX_UINT32 = 4294967295;
  const MAX_ACTOR_CAPACITY = 64;
  const NUMBER_OF_WEAPONS = 9;
  const NO_PENDING_WEAPON = 10;
  const MAX_NATIVE_AUDIO_EVENTS_PER_PACKET = 256;
  const CANONICAL_DOOM1_WAD_SHA256 = "1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771";
  const GEOMETRY_VERSION = "e1m1-continuation-canonical-route-v2";
  const POLICY_VERSION = "e1m1-continuation-policy-v2";
  const AUDIO_CATALOG_VERSION = "doom-native-sfx-catalog-v1";
  const AUDIO_CATALOG_SOURCE_REVISION = "dcb7a8dbc7a16ce3dda29382ac9aae9d77d21284";
  const AUDIO_CATALOG_IDENTITY_HASH = "2fd2ba92b0ac0761b4c60ea636532420e71475adfb49f33ac1994c37009dd756";
  const AUDIO_TRACE_CAPACITY = 32;
  const REPLAY_CAPACITY = 32;
  const ROUTE_TIMEOUT_FRAMES = 900;
  const LEG_TIMEOUT_FRAMES = 180;
  const COMBAT_TIMEOUT_FRAMES = 180;
  const MAXIMUM_POSE_MISSING_FRAMES = 30;
  const CANONICAL_WAYPOINTS = Object.freeze([
    Object.freeze({ id: "zigzag-entry-east", x: 3056, y: -3072, sectors: Object.freeze([60]) }),
    Object.freeze({ id: "zigzag-west-dogleg", x: 2900, y: -3216, sectors: Object.freeze([60]) }),
    Object.freeze({ id: "zigzag-east-dogleg", x: 3196, y: -3340, sectors: Object.freeze([60]) }),
    Object.freeze({ id: "zigzag-south-return", x: 3024, y: -3544, sectors: Object.freeze([60]) }),
    Object.freeze({ id: "zigzag-safe-floor-portal", x: 3008, y: -3592, sectors: Object.freeze([60, 56]) }),
    Object.freeze({ id: "second-door-north-lane", x: 3008, y: -3984, sectors: Object.freeze([56]) }),
    Object.freeze({ id: "second-door-use-approach", x: 3008, y: -3984, sectors: Object.freeze([56]) }),
    Object.freeze({ id: "second-door-certified-traverse", x: 3008, y: -4064, sectors: Object.freeze([73]) }),
    Object.freeze({ id: "sector-72-north-approach", x: 3008, y: -4200, sectors: Object.freeze([73, 72]) }),
    Object.freeze({ id: "sector-74-gatekeeper-approach", x: 3008, y: -4400, sectors: Object.freeze([74]) }),
    Object.freeze({ id: "sector-74-south-clearance", x: 3008, y: -4528, sectors: Object.freeze([74, 78]) }),
    Object.freeze({ id: "sector-78-exit-lane", x: 3008, y: -4560, sectors: Object.freeze([78]) }),
    Object.freeze({ id: "exit-door-use-approach", x: 3008, y: -4616, sectors: Object.freeze([80]) }),
    Object.freeze({ id: "exit-door-certified-traverse", x: 3008, y: -4660, sectors: Object.freeze([81, 84]) }),
    Object.freeze({ id: "exit-room-entry", x: 3008, y: -4704, sectors: Object.freeze([84, 82]) }),
    Object.freeze({ id: "exit-switch-use-approach", x: 2944, y: -4768, sectors: Object.freeze([82]) })
  ]);
  const STATES = new Set([
    "WaitingForPostCompletion",
    "NavigateZigzag",
    "ApproachSecondDoor",
    "PreUseStopSecondDoor",
    "StationarySecondDoorUse",
    "AwaitSecondDoorAck",
    "TraverseSecondDoor",
    "NavigateGatekeeper",
    "InterceptRouteThreat",
    "EngageGatekeeper",
    "NavigateExitDoor",
    "PreUseStopExitDoor",
    "StationaryExitDoorUse",
    "AwaitExitDoorAck",
    "EnterExitRoom",
    "ApproachExitSwitch",
    "PreUseStopExitSwitch",
    "StationaryExitUse",
    "AwaitExitAck",
    "AwaitLevelCompletion",
    "AwaitRestart",
    "Complete",
    "FailedSafeStop"
  ]);
  const DISPOSITIONS = new Set([
    "NotAcquired",
    "Exclusive",
    "Completed",
    "FailedSafeStop"
  ]);
  const USE_KINDS = new Set(["None", "SecondDoor", "ExitDoor", "ExitSwitch"]);
  const KNOWN_ROUTE_SECTORS = new Set([60, 56, 75, 76, 73, 72, 74, 78, 80, 81, 84, 82]);
  const WEAPON_CONTINUATION_OWNER_KINDS = new Set(["none", "route-threat", "gatekeeper"]);
  const AUDIO_CLASSIFICATION_REASONS = new Set([
    "exact-id-name-pair",
    "empty-sfx-name",
    "sfx-id-out-of-range",
    "id-name-mismatch"
  ]);

  function fail(message) {
    const error = new Error(`Invalid C# E1M1 continuation contract: ${message}`);
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

  function requireBoolean(value, name) {
    requireWire(typeof value === "boolean", `${name} must be boolean`);
  }

  function requireString(value, name) {
    requireWire(typeof value === "string", `${name} must be a string`);
  }

  function requireNonEmptyString(value, name) {
    requireWire(typeof value === "string" && value.length > 0, `${name} must be a non-empty string`);
  }

  function requireInteger(value, name, minimum = Number.MIN_SAFE_INTEGER, maximum = Number.MAX_SAFE_INTEGER) {
    requireWire(
      Number.isSafeInteger(value) && value >= minimum && value <= maximum,
      `${name} must be an integer within [${minimum}, ${maximum}]`);
  }

  function requireFinite(value, name) {
    requireWire(Number.isFinite(value), `${name} must be finite`);
  }

  function requireCanonicalSha256(value, name) {
    requireWire(
      typeof value === "string" && /^[0-9a-f]{64}$/.test(value),
      `${name} must be a canonical lowercase SHA-256`);
  }

  function resolveRuntimeScope(runtime) {
    requireWire(isRecord(runtime), "runtime is required");
    const scope = isRecord(runtime.autoplayCSharpFirstDoorScope)
      ? runtime.autoplayCSharpFirstDoorScope
      : {};
    const sessionId = Object.prototype.hasOwnProperty.call(scope, "sessionId")
      ? scope.sessionId
      : (runtime.autoplayCSharpFirstDoorSessionId ?? runtime.autoplayCSharpSessionId);
    const runId = Object.prototype.hasOwnProperty.call(scope, "runId")
      ? scope.runId
      : (runtime.autoplayCSharpFirstDoorRunId ?? runtime.autoplayCSharpRunId);
    const runGeneration = Object.prototype.hasOwnProperty.call(scope, "runGeneration")
      ? scope.runGeneration
      : (runtime.autoplayCSharpFirstDoorRunGeneration ?? runtime.autoplayCSharpRunGeneration);
    requireNonEmptyString(sessionId, "runtime C# scope.sessionId");
    requireNonEmptyString(runId, "runtime C# scope.runId");
    requireInteger(runGeneration, "runtime C# scope.runGeneration", 1);
    return { sessionId, runId, runGeneration };
  }

  function validateFrozenPostDecision(postDecision, scope) {
    requireWire(isRecord(postDecision), "validated post-COMPUTERROOM decision is required");
    requireWire(postDecision.implementationVersion === "post-computer-room-route-v8",
      "post decision implementationVersion mismatch");
    requireWire(postDecision.contractVersion === 2, "post decision contractVersion mismatch");
    requireWire(postDecision.state === "Complete", "post decision must be Complete");
    requireWire(postDecision.ownershipDisposition === "Completed",
      "post decision must have Completed ownership");
    requireWire(postDecision.completed === true && postDecision.exclusive === false,
      "post decision lacks terminal ownership semantics");
    requireWire(
      postDecision.sessionId === scope.sessionId
        && postDecision.runId === scope.runId
        && postDecision.runGeneration === scope.runGeneration,
      "post decision scope does not match the current runtime scope");
    requireWire(isRecord(postDecision.completionTrace), "post completionTrace is required");
    const trace = postDecision.completionTrace;
    requireWire(trace.completed === true, "post completionTrace must be completed");
    requireWire(
      trace.sessionId === scope.sessionId
        && trace.runId === scope.runId
        && trace.runGeneration === scope.runGeneration,
      "post completionTrace scope mismatch");
    requireInteger(trace.completionAtControlTick, "post completionAtControlTick", 1);
    requireWire(trace.completionCode === "central-hall-entry-confirmed",
      "post completion code is not canonical");
    requireWire(isRecord(trace.completionSnapshot), "post completion snapshot is required");
    requireWire(
      trace.completionSnapshot.state === "Complete"
        && trace.completionSnapshot.playerSectorIndex === 60
        && trace.completionSnapshot.legIndex === 8
        && trace.completionSnapshot.legId === "central-hall-entry",
      "post completion snapshot lacks the frozen sector-60 proof");
    return trace.completionAtControlTick;
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

  function copyActorSnapshot(value, nativeRun) {
    if (value == null) {
      return unavailableActorSnapshot();
    }
    requireWire(isRecord(value), "native actorSnapshot must be an object");
    requireBoolean(value.available, "native actorSnapshot.available");
    if (!value.available) {
      requireWire(!Array.isArray(value.actors) || value.actors.length === 0,
        "unavailable native actorSnapshot cannot carry actors");
      return unavailableActorSnapshot();
    }
    requireWire(isRecord(nativeRun) && nativeRun.available === true,
      "available native actorSnapshot requires available run facts");
    requireInteger(value.gametic, "native actorSnapshot.gametic", 0, MAX_INT32);
    requireWire(value.gametic === nativeRun.gametic,
      "native actorSnapshot.gametic must match native run.gametic");
    requireInteger(value.capacity, "native actorSnapshot.capacity", 0, MAX_ACTOR_CAPACITY);
    requireInteger(value.count, "native actorSnapshot.count", 0, value.capacity);
    requireBoolean(value.truncated, "native actorSnapshot.truncated");
    requireWire(Array.isArray(value.actors), "native actorSnapshot.actors must be an array");
    requireWire(value.actors.length === value.count,
      "native actorSnapshot.actors length must equal count");
    const identities = new Set();
    const actors = value.actors.map((actor, index) => {
      const name = `native actorSnapshot.actors[${index}]`;
      requireWire(isRecord(actor), `${name} must be an object`);
      requireInteger(actor.identity, `${name}.identity`, 1, MAX_UINT32);
      requireWire(!identities.has(actor.identity), `${name}.identity must be unique`);
      identities.add(actor.identity);
      requireInteger(actor.xFixed, `${name}.xFixed`, MIN_INT32, MAX_INT32);
      requireInteger(actor.yFixed, `${name}.yFixed`, MIN_INT32, MAX_INT32);
      requireInteger(actor.sectorIndex, `${name}.sectorIndex`, -1, MAX_INT32);
      requireInteger(actor.type, `${name}.type`, MIN_INT32, MAX_INT32);
      requireInteger(actor.health, `${name}.health`, MIN_INT32, MAX_INT32);
      requireInteger(actor.flags, `${name}.flags`, 0, MAX_UINT32);
      requireBoolean(actor.lineOfSight, `${name}.lineOfSight`);
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

  function copyWeaponSnapshot(value, nativeRun) {
    if (value == null) {
      return unavailableWeaponSnapshot();
    }
    requireWire(isRecord(value), "native weapon facts must be an object");
    requireBoolean(value.available, "native weapon.available");
    if (!value.available) {
      return unavailableWeaponSnapshot();
    }
    requireWire(isRecord(nativeRun) && nativeRun.available === true,
      "available native weapon facts require available run facts");
    requireInteger(value.stateCount, "native weapon.stateCount", 1, MAX_INT32);
    requireInteger(value.readyWeapon, "native weapon.readyWeapon", 0, NUMBER_OF_WEAPONS - 1);
    requireInteger(value.pendingWeapon, "native weapon.pendingWeapon", 0, NO_PENDING_WEAPON);
    requireWire(value.pendingWeapon === NO_PENDING_WEAPON || value.pendingWeapon < NUMBER_OF_WEAPONS,
      "native weapon.pendingWeapon is not a weapon or no-change sentinel");
    requireInteger(value.weaponState, "native weapon.weaponState", 0, value.stateCount - 1);
    requireInteger(value.readyState, "native weapon.readyState", 0, value.stateCount - 1);
    requireInteger(value.refire, "native weapon.refire", 0, MAX_INT32);
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

  function copyAudio(value) {
    if (value == null) {
      return { nativeEvents: 0, events: [] };
    }
    requireWire(isRecord(value), "native audio facts must be an object");
    requireBoolean(value.available, "native audio.available");
    if (!value.available) {
      requireWire(!Array.isArray(value.events) || value.events.length === 0,
        "unavailable native audio cannot carry events");
      return { nativeEvents: 0, events: [] };
    }
    requireInteger(value.latestSequence, "native audio.latestSequence", 0, MAX_UINT32);
    requireWire(Array.isArray(value.events), "native audio.events must be an array");
    requireWire(value.events.length <= MAX_NATIVE_AUDIO_EVENTS_PER_PACKET,
      `native audio.events exceeds ${MAX_NATIVE_AUDIO_EVENTS_PER_PACKET}`);
    let previousSequence = 0;
    const events = value.events.map((event, index) => {
      const name = `native audio.events[${index}]`;
      requireWire(isRecord(event), `${name} must be an object`);
      requireInteger(event.sequence, `${name}.sequence`, 1, MAX_UINT32);
      requireWire(event.sequence > previousSequence, `${name}.sequence must be strictly increasing`);
      requireWire(event.sequence <= value.latestSequence,
        `${name}.sequence exceeds native audio.latestSequence`);
      previousSequence = event.sequence;
      requireInteger(event.sfxId, `${name}.sfxId`, -1, MAX_INT32);
      requireString(event.sfxName, `${name}.sfxName`);
      requireWire(event.sfxName.length <= 64, `${name}.sfxName is too long`);
      return { sequence: event.sequence, sfxId: event.sfxId, sfxName: event.sfxName };
    });
    return { nativeEvents: value.latestSequence, events };
  }

  function copyAppliedActionAck(snapshot) {
    if (snapshot == null) {
      return null;
    }
    requireWire(isRecord(snapshot), "applied action snapshot must be an object");
    requireWire(isRecord(snapshot.proposed), "applied action snapshot.proposed must be an object");
    requireWire(isRecord(snapshot.applied), "applied action snapshot.applied must be an object");
    requireWire(isRecord(snapshot.use), "applied action snapshot.use must be an object");
    requireWire(isRecord(snapshot.path), "applied action snapshot.path must be an object");
    requireNonEmptyString(snapshot.sessionId, "applied action snapshot.sessionId");
    requireNonEmptyString(snapshot.runId, "applied action snapshot.runId");
    requireInteger(snapshot.runGeneration, "applied action snapshot.runGeneration", 1);
    requireInteger(snapshot.controlTick, "applied action snapshot.controlTick", 1);
    requireInteger(snapshot.useAttemptId, "applied action snapshot.useAttemptId", 0);
    requireNonEmptyString(snapshot.actionMode, "applied action snapshot.actionMode");
    requireNonEmptyString(snapshot.path.selected, "applied action snapshot.path.selected");
    for (const [value, name] of [
      [snapshot.proposed.use, "proposed.use"],
      [snapshot.applied.use, "applied.use"],
      [snapshot.use.resolved, "use.resolved"],
      [snapshot.use.eventQueued, "use.eventQueued"],
      [snapshot.use.pulseResolverCalled, "use.pulseResolverCalled"],
      [snapshot.use.blockedByManualInput, "use.blockedByManualInput"],
      [snapshot.path.senseOnly, "path.senseOnly"],
      [snapshot.applied.strafe, "applied.strafe"],
      [snapshot.applied.fire, "applied.fire"],
      [snapshot.applied.run, "applied.run"],
      [snapshot.usePumped, "usePumped"]
    ]) {
      requireBoolean(value, `applied action snapshot.${name}`);
    }
    requireWire(["none", "forward", "back"].includes(snapshot.applied.move),
      "applied action snapshot.applied.move is unknown");
    requireWire(snapshot.applied.strafe === false,
      "directionless applied strafe cannot cross the C# acknowledgement contract");
    requireInteger(snapshot.applied.turnYaw, "applied action snapshot.applied.turnYaw", -180, 180);
    requireInteger(snapshot.queuedUseInputEventSequence,
      "applied action snapshot.queuedUseInputEventSequence", 0);
    requireInteger(snapshot.pumpedUseInputEventSequence,
      "applied action snapshot.pumpedUseInputEventSequence", 0);
    requireInteger(snapshot.manualUseSequenceAtDecision,
      "applied action snapshot.manualUseSequenceAtDecision", 0);
    return {
      sessionId: snapshot.sessionId,
      runId: snapshot.runId,
      runGeneration: snapshot.runGeneration,
      decisionControlTick: snapshot.controlTick,
      useAttemptId: snapshot.useAttemptId,
      actionMode: snapshot.actionMode,
      hostPath: snapshot.path.selected,
      proposedUse: snapshot.proposed.use,
      appliedUse: snapshot.applied.use,
      useResolved: snapshot.use.resolved,
      eventQueued: snapshot.use.eventQueued,
      pulseResolverCalled: snapshot.use.pulseResolverCalled,
      manualBlocked: snapshot.use.blockedByManualInput,
      senseOnly: snapshot.path.senseOnly,
      appliedMoveForward: snapshot.applied.move === "forward",
      appliedMoveBackward: snapshot.applied.move === "back",
      appliedStrafeLeft: false,
      appliedStrafeRight: false,
      appliedTurnYaw: snapshot.applied.turnYaw,
      appliedAttack: snapshot.applied.fire,
      appliedRun: snapshot.applied.run,
      queuedUseInputEventSequence: snapshot.queuedUseInputEventSequence,
      pumpedUseInputEventSequence: snapshot.pumpedUseInputEventSequence,
      usePumped: snapshot.usePumped,
      manualUseSequenceAtDecision: snapshot.manualUseSequenceAtDecision
    };
  }

  function createInput(runtime, postDecision, nativeFacts = {}) {
    const scope = resolveRuntimeScope(runtime);
    const expectedPostComputerRoomControlTick = validateFrozenPostDecision(postDecision, scope);
    requireWire(isRecord(nativeFacts), "native continuation facts are required");
    const run = isRecord(nativeFacts.run) ? nativeFacts.run : null;
    requireWire(isRecord(run), "native run facts are required");
    requireBoolean(run.available, "native run.available");
    const runAvailable = run.available;
    if (runAvailable) {
      requireInteger(run.gametic, "native run.gametic", 0, MAX_INT32);
      requireInteger(run.leveltime, "native run.leveltime", 0, MAX_INT32);
      requireInteger(run.gamestate, "native run.gamestate", 0, 3);
      requireInteger(run.gameepisode, "native run.gameepisode", 0, MAX_INT32);
      requireInteger(run.gamemap, "native run.gamemap", 0, MAX_INT32);
      requireBoolean(run.levelLoadSequenceAvailable, "native run.levelLoadSequenceAvailable");
      if (run.levelLoadSequenceAvailable) {
        requireInteger(run.levelLoadSequence, "native run.levelLoadSequence", 0, MAX_UINT32);
      }
    }
    const player = isRecord(nativeFacts.player) ? nativeFacts.player : null;
    requireWire(isRecord(player), "native player facts are required");
    requireBoolean(player.available, "native player.available");
    if (player.available) {
      requireWire(runAvailable, "available native player requires available run facts");
      requireInteger(player.xFixed, "native player.xFixed", MIN_INT32, MAX_INT32);
      requireInteger(player.yFixed, "native player.yFixed", MIN_INT32, MAX_INT32);
      requireInteger(player.angleBam, "native player.angleBam", 0, MAX_UINT32);
      requireInteger(player.momentumXFixed, "native player.momentumXFixed", MIN_INT32, MAX_INT32);
      requireInteger(player.momentumYFixed, "native player.momentumYFixed", MIN_INT32, MAX_INT32);
      requireInteger(player.sectorIndex, "native player.sectorIndex", -1, MAX_INT32);
      requireInteger(player.health, "native player.health", MIN_INT32, MAX_INT32);
      requireInteger(player.playerState, "native player.playerState", 0, 2);
      requireInteger(player.killCount, "native player.killCount", 0, MAX_INT32);
    }
    const actorSnapshot = copyActorSnapshot(nativeFacts.actorSnapshot, run);
    const weaponSnapshot = copyWeaponSnapshot(player.weapon, run);
    const audio = copyAudio(nativeFacts.audio);
    requireCanonicalSha256(runtime?.moduleConfig?.wad?.sha256, "runtime.moduleConfig.wad.sha256");
    requireWire(runtime.moduleConfig.wad.sha256 === CANONICAL_DOOM1_WAD_SHA256,
      "runtime WAD identity is not canonical DOOM1.WAD");
    requireInteger(runtime.autoplayManualUseSequence, "runtime.autoplayManualUseSequence", 0);
    return {
      contractVersion: CONTRACT_VERSION,
      sessionId: scope.sessionId,
      runId: scope.runId,
      runGeneration: scope.runGeneration,
      expectedPostComputerRoomControlTick,
      wadContentSha256: runtime.moduleConfig.wad.sha256,
      nativeLevelFactsAvailable: runAvailable,
      nativeLevelLoadSequenceAvailable: runAvailable && run.levelLoadSequenceAvailable === true,
      nativeLevelLoadSequence: runAvailable && run.levelLoadSequenceAvailable === true
        ? run.levelLoadSequence
        : -1,
      nativeGametic: runAvailable ? run.gametic : -1,
      nativeLevelTime: runAvailable ? run.leveltime : -1,
      nativeGameState: runAvailable ? run.gamestate : -1,
      nativeGameEpisode: runAvailable ? run.gameepisode : -1,
      nativeGameMap: runAvailable ? run.gamemap : -1,
      nativePlayerFactsAvailable: player.available,
      nativePlayerXFixed: player.available ? player.xFixed : 0,
      nativePlayerYFixed: player.available ? player.yFixed : 0,
      nativePlayerAngleBam: player.available ? player.angleBam : 0,
      nativePlayerMomentumXFixed: player.available ? player.momentumXFixed : 0,
      nativePlayerMomentumYFixed: player.available ? player.momentumYFixed : 0,
      nativePlayerSectorIndex: player.available ? player.sectorIndex : -1,
      nativePlayerVitalityFactsAvailable: player.available,
      nativePlayerHealth: player.available ? player.health : -1,
      nativePlayerState: player.available ? player.playerState : -1,
      nativePlayerKillCount: player.available ? player.killCount : -1,
      manualUseSequence: runtime.autoplayManualUseSequence,
      actorSnapshot,
      weaponSnapshot,
      audio,
      appliedActionAck: copyAppliedActionAck(runtime.autoplayCSharpAppliedActionSnapshot)
    };
  }

  function validateAction(action, runRequested, name = "action") {
    requireWire(isRecord(action), `${name} must be an object`);
    for (const property of [
      "moveForward", "moveBackward", "strafeLeft", "strafeRight", "useKey", "attackKey"
    ]) {
      requireBoolean(action[property], `${name}.${property}`);
    }
    requireInteger(action.turnYaw, `${name}.turnYaw`, -180, 180);
    requireBoolean(runRequested, `${name} runRequested`);
    requireWire(!(action.moveForward && action.moveBackward), `${name} forward/backward are contradictory`);
    requireWire(!(action.strafeLeft && action.strafeRight), `${name} left/right strafe are contradictory`);
    requireWire(!(action.useKey && action.attackKey), `${name} Use and Attack are contradictory`);
    requireWire(
      action.moveBackward === false && action.strafeLeft === false && action.strafeRight === false,
      `${name} contains movement outside the C# canonical action set`);
    requireWire([-6, 0, 6].includes(action.turnYaw),
      `${name}.turnYaw is outside the C# canonical action set`);
    requireWire(runRequested === action.moveForward,
      `${name} runRequested must exactly follow C# forward movement`);
    requireWire(!action.moveForward || action.turnYaw === 0,
      `${name} cannot turn while moving forward`);
    if (action.useKey || action.attackKey) {
      requireWire(
        !action.moveForward
          && !action.moveBackward
          && !action.strafeLeft
          && !action.strafeRight
          && action.turnYaw === 0
          && runRequested === false,
        `${name} Use/Attack must be stationary`);
    }
  }

  function isNeutralAction(action, runRequested) {
    return action.moveForward === false
      && action.moveBackward === false
      && action.strafeLeft === false
      && action.strafeRight === false
      && action.turnYaw === 0
      && action.useKey === false
      && action.attackKey === false
      && runRequested === false;
  }

  function validatePose(pose, input, expectCurrent) {
    requireWire(isRecord(pose), "navigation.pose is required");
    requireBoolean(pose.available, "navigation.pose.available");
    requireBoolean(pose.fresh, "navigation.pose.fresh");
    requireNonEmptyString(pose.reason, "navigation.pose.reason");
    requireInteger(pose.nativeGametic, "navigation.pose.nativeGametic", -1, MAX_INT32);
    for (const property of ["playerX", "playerY", "headingDegrees", "momentumX", "momentumY"]) {
      requireFinite(pose[property], `navigation.pose.${property}`);
    }
    requireInteger(pose.playerSectorIndex, "navigation.pose.playerSectorIndex", -1, MAX_INT32);
    requireBoolean(pose.stationary, "navigation.pose.stationary");
    requireWire(!pose.fresh || pose.available, "fresh navigation pose must be available");
    if (expectCurrent && pose.available
      && pose.reason === "native-player-pose-accepted" && input.nativeGameState === 0) {
      requireWire(input.nativePlayerFactsAvailable === true,
        "accepted navigation pose requires current native player facts");
      requireWire(pose.nativeGametic === input.nativeGametic,
        "navigation pose gametic changed across the C# wire");
      requireWire(pose.playerSectorIndex === input.nativePlayerSectorIndex,
        "navigation pose sector changed across the C# wire");
      requireWire(pose.playerX === input.nativePlayerXFixed / 65536,
        "navigation pose playerX changed across the C# wire");
      requireWire(pose.playerY === input.nativePlayerYFixed / 65536,
        "navigation pose playerY changed across the C# wire");
      requireWire(pose.momentumX === input.nativePlayerMomentumXFixed / 65536,
        "navigation pose momentumX changed across the C# wire");
      requireWire(pose.momentumY === input.nativePlayerMomentumYFixed / 65536,
        "navigation pose momentumY changed across the C# wire");
    }
  }

  function validateNavigation(navigation, decision, input) {
    requireWire(isRecord(navigation), "navigation is required");
    requireWire(navigation.snapshotVersion === 1, "navigation.snapshotVersion must be 1");
    requireWire(navigation.geometryVersion === GEOMETRY_VERSION, "navigation.geometryVersion mismatch");
    requireBoolean(navigation.active, "navigation.active");
    requireInteger(navigation.legIndex, "navigation.legIndex", -1, 15);
    requireString(navigation.legId, "navigation.legId");
    requireFinite(navigation.targetX, "navigation.targetX");
    requireFinite(navigation.targetY, "navigation.targetY");
    requireWire(Array.isArray(navigation.allowedSectors), "navigation.allowedSectors must be an array");
    const waitingSnapshot = navigation.active === false
      && navigation.legIndex === -1
      && navigation.legId === ""
      && navigation.allowedSectors.length === 0
      && navigation.policyVersion === "";
    requireWire(
      navigation.policyVersion === POLICY_VERSION || waitingSnapshot,
      "navigation.policyVersion mismatch");
    requireWire(navigation.allowedSectors.length <= 2,
      "navigation.allowedSectors exceeds canonical waypoint width");
    for (let index = 0; index < navigation.allowedSectors.length; index += 1) {
      requireInteger(navigation.allowedSectors[index], `navigation.allowedSectors[${index}]`, 0, MAX_INT32);
      requireWire(KNOWN_ROUTE_SECTORS.has(navigation.allowedSectors[index]),
        `navigation.allowedSectors[${index}] is outside the canonical route`);
    }
    if (!waitingSnapshot) {
      const waypoint = CANONICAL_WAYPOINTS[navigation.legIndex];
      requireWire(Boolean(waypoint), "navigation leg index is outside the canonical route");
      requireWire(
        navigation.legId === waypoint.id
          && navigation.targetX === waypoint.x
          && navigation.targetY === waypoint.y
          && navigation.allowedSectors.length === waypoint.sectors.length
          && navigation.allowedSectors.every((sector, index) => sector === waypoint.sectors[index]),
        "navigation waypoint changed from the canonical C# route");
    }
    validatePose(navigation.pose, input, navigation.active);
    for (const property of ["targetDistance", "targetBearingDegrees", "bearingErrorDegrees"]) {
      requireFinite(navigation[property], `navigation.${property}`);
    }
    for (const property of ["routeFrames", "legFrames", "combatFrames"]) {
      requireInteger(navigation[property], `navigation.${property}`, 0, MAX_INT32);
    }
    requireInteger(navigation.poseMissingFrames, "navigation.poseMissingFrames", 0,
      MAXIMUM_POSE_MISSING_FRAMES);
    const routeTimeout = waitingSnapshot ? 0 : ROUTE_TIMEOUT_FRAMES;
    const legTimeout = waitingSnapshot ? 0 : LEG_TIMEOUT_FRAMES;
    const combatTimeout = waitingSnapshot ? 0 : COMBAT_TIMEOUT_FRAMES;
    requireWire(navigation.routeTimeoutFrames === routeTimeout,
      "navigation route timeout changed");
    requireWire(navigation.legTimeoutFrames === legTimeout,
      "navigation leg timeout changed");
    requireWire(navigation.combatTimeoutFrames === combatTimeout,
      "navigation combat timeout changed");
    requireInteger(navigation.routeRemainingFrames, "navigation.routeRemainingFrames", 0, routeTimeout);
    requireInteger(navigation.legRemainingFrames, "navigation.legRemainingFrames", 0, legTimeout);
    requireInteger(navigation.combatRemainingFrames, "navigation.combatRemainingFrames", 0, combatTimeout);
    requireWire(
      navigation.routeRemainingFrames === Math.max(0, routeTimeout - navigation.routeFrames),
      "navigation route remaining budget mismatch");
    requireWire(
      navigation.legRemainingFrames === Math.max(0, legTimeout - navigation.legFrames),
      "navigation leg remaining budget mismatch");
    requireWire(
      navigation.combatRemainingFrames === Math.max(0, combatTimeout - navigation.combatFrames),
      "navigation combat remaining budget mismatch");
    requireString(navigation.failureCode, "navigation.failureCode");
    requireWire(["none", "route-threat", "gatekeeper"].includes(navigation.combatOwnerKind),
      "navigation.combatOwnerKind is unknown");
    requireInteger(navigation.combatOwnerIdentity, "navigation.combatOwnerIdentity", 0, MAX_UINT32);
    requireWire(
      (navigation.combatOwnerKind === "none") === (navigation.combatOwnerIdentity === 0),
      "navigation combat owner kind/identity mismatch");
    const expectedActive = decision.ownershipDisposition === "Exclusive"
      && decision.state !== "AwaitRestart";
    requireWire(navigation.active === expectedActive,
      "navigation.active does not match C# ownership/terminal state");
    if (navigation.active) {
      requireWire(navigation.legIndex >= 0 && navigation.legId.length > 0,
        "active navigation requires a canonical leg");
    }
    if (decision.state === "InterceptRouteThreat") {
      requireWire(
        navigation.combatOwnerKind === "route-threat"
          && navigation.combatOwnerIdentity > 0
          && navigation.combatOwnerIdentity === decision.threatTrace.identity,
        "route-threat state lacks its exact C# combat owner");
    }
    if (decision.state === "EngageGatekeeper" && decision.gatekeeperTrace.identity > 0) {
      requireWire(
        navigation.combatOwnerKind === "gatekeeper"
          && navigation.combatOwnerIdentity === decision.gatekeeperTrace.identity,
        "gatekeeper state lacks its exact C# combat owner");
    }
  }

  function validateDoorTrace(trace, decision) {
    requireWire(isRecord(trace), "doorTrace is required");
    requireWire(trace.traceVersion === 1, "doorTrace.traceVersion must be 1");
    requireWire(USE_KINDS.has(trace.pendingUseKind), "doorTrace.pendingUseKind is unknown");
    requireInteger(trace.pendingUseAttemptId, "doorTrace.pendingUseAttemptId", 0);
    requireInteger(trace.pendingUseDecisionControlTick, "doorTrace.pendingUseDecisionControlTick", -1);
    requireNonEmptyString(trace.appliedActionAckReason, "doorTrace.appliedActionAckReason");
    for (const property of [
      "secondDoorAckAccepted", "secondDoorSlabObserved", "secondDoorTraversed",
      "exitDoorAckAccepted", "exitDoorSlabObserved", "exitDoorTraversed",
      "exitSwitchAckAccepted", "levelTransitionConfirmed"
    ]) {
      requireBoolean(trace[property], `doorTrace.${property}`);
    }
    if (trace.pendingUseKind === "None") {
      requireWire(
        trace.pendingUseAttemptId === 0 && trace.pendingUseDecisionControlTick === -1,
        "empty pending Use must use canonical sentinels");
    } else {
      requireWire(
        trace.pendingUseAttemptId > 0
          && trace.pendingUseDecisionControlTick >= 1
          && trace.pendingUseDecisionControlTick <= decision.controlTick,
        "pending Use lacks a current attempt identity");
    }
    requireWire(!trace.secondDoorSlabObserved || trace.secondDoorAckAccepted,
      "second-door slab cannot precede its owned Use acknowledgement");
    requireWire(!trace.secondDoorTraversed || trace.secondDoorAckAccepted,
      "second door traversal requires its owned Use acknowledgement");
    requireWire(!trace.exitDoorSlabObserved || trace.exitDoorAckAccepted,
      "exit-door slab cannot precede its owned Use acknowledgement");
    requireWire(!trace.exitDoorTraversed || trace.exitDoorAckAccepted,
      "exit door traversal requires its owned Use acknowledgement");
    requireWire(!trace.exitSwitchAckAccepted || trace.exitDoorTraversed,
      "exit switch acknowledgement cannot precede exit-door traversal");
    requireWire(!trace.levelTransitionConfirmed || trace.exitSwitchAckAccepted,
      "level transition requires the owned exit-switch acknowledgement");
    requireWire(trace.levelTransitionConfirmed === decision.completed,
      "doorTrace level transition does not match decision completion");
    requireWire(decision.useAttemptId === trace.pendingUseAttemptId,
      "decision useAttemptId does not echo doorTrace");
    if (decision.action.useKey) {
      requireWire(trace.pendingUseKind !== "None" && trace.pendingUseAttemptId > 0,
        "stationary Use action requires an owned pending attempt");
    }
  }

  function validateGatekeeperTrace(trace, decision, input) {
    requireWire(isRecord(trace), "gatekeeperTrace is required");
    requireWire(trace.traceVersion === 1, "gatekeeperTrace.traceVersion must be 1");
    requireWire(trace.expectedRuntimeType === 11, "gatekeeper runtime type changed");
    requireWire(trace.expectedSectorIndex === 74, "gatekeeper sector changed");
    requireWire(trace.expectedSpawnX === 3008 && trace.expectedSpawnY === -4416,
      "gatekeeper spawn changed");
    for (const property of [
      "snapshotAccepted", "snapshotFresh", "acquiredAlive", "lineOfSight",
      "killCountAdvanced", "killed"
    ]) {
      requireBoolean(trace[property], `gatekeeperTrace.${property}`);
    }
    requireInteger(trace.identity, "gatekeeperTrace.identity", 0, MAX_UINT32);
    requireInteger(trace.health, "gatekeeperTrace.health", MIN_INT32, MAX_INT32);
    requireInteger(trace.currentSectorIndex, "gatekeeperTrace.currentSectorIndex", -1, MAX_INT32);
    requireBoolean(trace.topologyAccepted, "gatekeeperTrace.topologyAccepted");
    requireNonEmptyString(trace.topologyReason, "gatekeeperTrace.topologyReason");
    requireFinite(trace.bearingErrorDegrees, "gatekeeperTrace.bearingErrorDegrees");
    requireInteger(trace.killCountAtAcquisition, "gatekeeperTrace.killCountAtAcquisition", -1, MAX_INT32);
    requireInteger(trace.currentKillCount, "gatekeeperTrace.currentKillCount", -1, MAX_INT32);
    requireNonEmptyString(trace.reason, "gatekeeperTrace.reason");
    requireWire(!trace.snapshotFresh || trace.snapshotAccepted,
      "fresh gatekeeper snapshot must be accepted");
    requireWire(!trace.acquiredAlive || trace.identity > 0,
      "acquired gatekeeper requires an identity");
    if (decision.navigation.active && trace.snapshotFresh && trace.acquiredAlive && !trace.killed
      && input.nativeGameState === 0 && input.actorSnapshot.available) {
      const current = input.actorSnapshot.actors.find(actor => actor.identity === trace.identity);
      requireWire(Boolean(current), "fresh gatekeeper is absent from the current actor snapshot");
      requireWire(
        current.type === trace.expectedRuntimeType
          && current.sectorIndex === trace.currentSectorIndex
          && current.health === trace.health
          && current.lineOfSight === trace.lineOfSight,
        "gatekeeper facts changed across the C# wire");
    }
    if (decision.navigation.active && trace.snapshotFresh && trace.killed
      && input.nativeGameState === 0 && input.actorSnapshot.available) {
      const current = input.actorSnapshot.actors.find(actor => actor.identity === trace.identity);
      if (current) {
        requireWire(
          current.type === trace.expectedRuntimeType
            && current.sectorIndex === trace.currentSectorIndex
            && current.health === trace.health,
          "killed gatekeeper facts changed across the C# wire");
      } else {
        requireWire(
          trace.currentSectorIndex === -1 && trace.health === 0 && trace.lineOfSight === false,
          "absent killed gatekeeper must use canonical current-fact sentinels");
      }
    }
    requireWire(!trace.topologyAccepted || trace.currentSectorIndex >= 0,
      "accepted gatekeeper topology requires a current actor sector");
    requireWire(
      trace.killCountAdvanced === (trace.killed
        || (trace.killCountAtAcquisition >= 0
          && trace.currentKillCount > trace.killCountAtAcquisition)),
      "gatekeeper kill-count advance is not the exact C# monotonic proof");
    requireWire(!trace.killed || (trace.acquiredAlive && trace.identity > 0 && trace.killCountAdvanced),
      "gatekeeper kill proof is incomplete");
    if (decision.navigation.active && input.nativePlayerVitalityFactsAvailable) {
      requireWire(trace.currentKillCount === input.nativePlayerKillCount,
        "gatekeeper current kill count changed across the C# wire");
    }
  }

  function validateThreatTrace(trace, decision, input) {
    requireWire(isRecord(trace), "threatTrace is required");
    requireWire(trace.traceVersion === 1, "threatTrace.traceVersion must be 1");
    for (const property of [
      "snapshotAccepted", "snapshotFresh", "threatMatched", "lineOfSight",
      "stationaryFireAuthorized"
    ]) {
      requireBoolean(trace[property], `threatTrace.${property}`);
    }
    requireInteger(trace.identity, "threatTrace.identity", 0, MAX_UINT32);
    requireInteger(trace.runtimeType, "threatTrace.runtimeType", -1, MAX_INT32);
    requireInteger(trace.sectorIndex, "threatTrace.sectorIndex", -1, MAX_INT32);
    requireInteger(trace.health, "threatTrace.health", MIN_INT32, MAX_INT32);
    requireFinite(trace.bearingErrorDegrees, "threatTrace.bearingErrorDegrees");
    requireNonEmptyString(trace.reason, "threatTrace.reason");
    requireWire(!trace.snapshotFresh || trace.snapshotAccepted,
      "fresh route-threat snapshot must be accepted");
    if (!trace.threatMatched) {
      requireWire(
        trace.identity === 0 && trace.runtimeType === -1 && trace.sectorIndex === -1
          && trace.health === 0 && trace.lineOfSight === false
          && trace.stationaryFireAuthorized === false,
        "unmatched route threat must use canonical sentinels");
    } else {
      requireWire(
        trace.identity > 0 && trace.runtimeType >= 0 && trace.sectorIndex >= 0 && trace.health > 0,
        "matched route threat lacks a live native actor identity");
      if (decision.navigation.active && trace.snapshotFresh
        && input.nativeGameState === 0 && input.actorSnapshot.available) {
        const current = input.actorSnapshot.actors.find(actor => actor.identity === trace.identity);
        requireWire(Boolean(current), "fresh route threat is absent from the current actor snapshot");
        requireWire(
          current.type === trace.runtimeType
            && current.sectorIndex === trace.sectorIndex
            && current.health === trace.health
            && current.lineOfSight === trace.lineOfSight,
          "route threat changed across the C# wire");
      }
    }
    requireWire(
      trace.stationaryFireAuthorized
        === (decision.state === "InterceptRouteThreat" && decision.action.attackKey),
      "route-threat stationary-fire authorization does not match the action");
    requireWire(
      decision.state !== "InterceptRouteThreat" || trace.threatMatched,
      "route-threat interception requires a matched actor");
    if (decision.state === "InterceptRouteThreat" && decision.action.attackKey) {
      requireWire(trace.stationaryFireAuthorized,
        "route-threat Attack lacks C# stationary-fire authorization");
    }
  }

  function isCurrentOrAdjacentRouteSector(playerSector, actorSector) {
    if (playerSector === actorSector) {
      return true;
    }
    return {
      60: [56],
      56: [60, 75],
      75: [56, 76],
      76: [75, 73],
      73: [76, 72],
      72: [73, 74],
      74: [72, 78],
      78: [74, 80],
      80: [78, 81],
      81: [80, 84],
      84: [81, 82],
      82: [84]
    }[playerSector]?.includes(actorSector) === true;
  }

  function validateWeaponTrace(trace, decision, input) {
    requireWire(isRecord(trace), "weaponTrace is required");
    requireWire(trace.traceVersion === 1, "weaponTrace.traceVersion must be 1");
    for (const property of [
      "snapshotAccepted", "snapshotFresh", "fireOpportunity",
      "continuationArmed", "attackContinuation"
    ]) {
      requireBoolean(trace[property], `weaponTrace.${property}`);
    }
    requireInteger(trace.stateCount, "weaponTrace.stateCount", -1, MAX_INT32);
    requireInteger(trace.readyWeapon, "weaponTrace.readyWeapon", -1, NUMBER_OF_WEAPONS - 1);
    requireInteger(trace.pendingWeapon, "weaponTrace.pendingWeapon", -1, NO_PENDING_WEAPON);
    requireInteger(trace.weaponState, "weaponTrace.weaponState", -1, MAX_INT32);
    requireInteger(trace.weaponReadyState, "weaponTrace.weaponReadyState", -1, MAX_INT32);
    requireInteger(trace.refire, "weaponTrace.refire", -1, MAX_INT32);
    requireWire(WEAPON_CONTINUATION_OWNER_KINDS.has(trace.continuationOwnerKind),
      "weaponTrace.continuationOwnerKind is unknown");
    requireInteger(trace.continuationTargetIdentity,
      "weaponTrace.continuationTargetIdentity", 0, MAX_UINT32);
    requireInteger(trace.continuationReadyWeapon,
      "weaponTrace.continuationReadyWeapon", -1, NUMBER_OF_WEAPONS - 1);
    requireInteger(trace.continuationAuthorizedAtControlTick,
      "weaponTrace.continuationAuthorizedAtControlTick", -1);
    requireNonEmptyString(trace.reason, "weaponTrace.reason");
    requireWire(!trace.snapshotFresh || trace.snapshotAccepted,
      "fresh weaponTrace must be accepted");

    if (!trace.snapshotAccepted) {
      requireWire(
        trace.snapshotFresh === false
          && trace.stateCount === -1
          && trace.readyWeapon === -1
          && trace.pendingWeapon === -1
          && trace.weaponState === -1
          && trace.weaponReadyState === -1
          && trace.refire === -1
          && trace.fireOpportunity === false,
        "unavailable weaponTrace must use canonical sentinels");
    } else {
      requireWire(
        trace.stateCount > 0
          && trace.readyWeapon >= 0
          && (trace.pendingWeapon === NO_PENDING_WEAPON
            || (trace.pendingWeapon >= 0 && trace.pendingWeapon < NUMBER_OF_WEAPONS))
          && trace.weaponState >= 0
          && trace.weaponState < trace.stateCount
          && trace.weaponReadyState >= 0
          && trace.weaponReadyState < trace.stateCount
          && trace.refire >= 0,
        "accepted weaponTrace has an invalid native weapon shape");
      if (decision.navigation.active) {
        requireWire(
          input.weaponSnapshot.available
            && input.weaponSnapshot.gametic === input.nativeGametic
            && trace.stateCount === input.weaponSnapshot.stateCount
            && trace.readyWeapon === input.weaponSnapshot.readyWeapon
            && trace.pendingWeapon === input.weaponSnapshot.pendingWeapon
            && trace.weaponState === input.weaponSnapshot.weaponState
            && trace.weaponReadyState === input.weaponSnapshot.weaponReadyState
            && trace.refire === input.weaponSnapshot.refire,
          "weaponTrace changed current native weapon facts across the C# wire");
      }
      const expectedReason = !trace.snapshotFresh
        ? "native-weapon-snapshot-not-fresh"
        : trace.pendingWeapon !== NO_PENDING_WEAPON
          ? "native-weapon-change-pending"
          : trace.weaponState !== trace.weaponReadyState
            ? "native-weapon-cycle-not-ready"
            : trace.refire !== 0
              ? "native-weapon-refire-pending"
              : "native-weapon-fire-opportunity";
      requireWire(trace.reason === expectedReason,
        "weaponTrace reason does not match current native weapon facts");
    }

    const exactFireOpportunity = trace.snapshotAccepted
      && trace.snapshotFresh
      && trace.pendingWeapon === NO_PENDING_WEAPON
      && trace.weaponState === trace.weaponReadyState
      && trace.refire === 0;
    requireWire(trace.fireOpportunity === exactFireOpportunity,
      "weaponTrace fire opportunity is not exact");
    if (!decision.navigation.active) {
      requireWire(!trace.snapshotAccepted && !trace.continuationArmed,
        "inactive terminal/waiting weaponTrace must be canonical unavailable");
    }

    if (!trace.continuationArmed) {
      requireWire(
        trace.continuationOwnerKind === "none"
          && trace.continuationTargetIdentity === 0
          && trace.continuationReadyWeapon === -1
          && trace.continuationAuthorizedAtControlTick === -1
          && trace.attackContinuation === false,
        "unarmed weaponTrace must use canonical continuation sentinels");
    } else {
      requireWire(
        trace.snapshotAccepted
          && trace.snapshotFresh
          && trace.pendingWeapon === NO_PENDING_WEAPON
          && decision.navigation.active
          && decision.ownershipDisposition === "Exclusive"
          && decision.navigation.pose.available
          && decision.navigation.pose.fresh
          && decision.navigation.pose.stationary
          && trace.continuationOwnerKind !== "none"
          && trace.continuationTargetIdentity > 0
          && trace.continuationReadyWeapon === trace.readyWeapon
          && trace.continuationAuthorizedAtControlTick
            >= decision.controlTick - decision.navigation.combatFrames
          && trace.continuationAuthorizedAtControlTick <= decision.controlTick
          && decision.navigation.combatOwnerKind === trace.continuationOwnerKind
          && decision.navigation.combatOwnerIdentity === trace.continuationTargetIdentity,
        "armed weaponTrace lacks a current typed combat authority");
      if (trace.continuationOwnerKind === "route-threat") {
        requireWire(
          decision.state === "InterceptRouteThreat"
            && decision.threatTrace.snapshotAccepted
            && decision.threatTrace.snapshotFresh
            && decision.threatTrace.threatMatched
            && decision.threatTrace.identity === trace.continuationTargetIdentity
            && decision.threatTrace.health > 0
            && decision.threatTrace.lineOfSight
            && Math.abs(decision.threatTrace.bearingErrorDegrees) <= 5
            && isCurrentOrAdjacentRouteSector(
              decision.navigation.pose.playerSectorIndex,
              decision.threatTrace.sectorIndex),
          "route-threat weapon continuation lacks target, topology, sightline, or alignment proof");
      } else {
        requireWire(
          decision.state === "EngageGatekeeper"
            && decision.gatekeeperTrace.snapshotAccepted
            && decision.gatekeeperTrace.snapshotFresh
            && decision.gatekeeperTrace.acquiredAlive
            && !decision.gatekeeperTrace.killed
            && decision.gatekeeperTrace.identity === trace.continuationTargetIdentity
            && decision.gatekeeperTrace.health > 0
            && decision.gatekeeperTrace.topologyAccepted
            && decision.gatekeeperTrace.lineOfSight
            && Math.abs(decision.gatekeeperTrace.bearingErrorDegrees) <= 5,
          "gatekeeper weapon continuation lacks target, topology, sightline, or alignment proof");
      }
    }

    requireWire(
      trace.attackContinuation === (decision.action.attackKey && !trace.fireOpportunity),
      "weaponTrace busy-cycle Attack continuation does not match the action");
    if (trace.attackContinuation) {
      requireWire(
        trace.continuationArmed
          && trace.weaponState !== trace.weaponReadyState,
        "weaponTrace Attack continuation is not a typed busy weapon cycle");
    }
    requireWire(
      decision.action.attackKey
        === (trace.continuationArmed && (trace.fireOpportunity || trace.attackContinuation)),
      "Attack does not match the C# weapon continuation authority");
  }

  function validateVitalityTrace(trace, decision, input) {
    requireWire(isRecord(trace), "vitalityTrace is required");
    requireWire(trace.traceVersion === 1, "vitalityTrace.traceVersion must be 1");
    requireString(trace.sessionId, "vitalityTrace.sessionId");
    requireString(trace.runId, "vitalityTrace.runId");
    requireInteger(trace.runGeneration, "vitalityTrace.runGeneration", 0);
    requireInteger(trace.evaluatedAtControlTick, "vitalityTrace.evaluatedAtControlTick", 0);
    requireBoolean(trace.available, "vitalityTrace.available");
    requireBoolean(trace.fresh, "vitalityTrace.fresh");
    requireInteger(trace.nativeGametic, "vitalityTrace.nativeGametic", -1, MAX_INT32);
    requireInteger(trace.playerHealth, "vitalityTrace.playerHealth", MIN_INT32, MAX_INT32);
    requireInteger(trace.playerState, "vitalityTrace.playerState", -1, MAX_INT32);
    requireInteger(trace.playerKillCount, "vitalityTrace.playerKillCount", -1, MAX_INT32);
    requireWire(
      trace.provenance === "native-e1m1-continuation-vitality"
        || trace.provenance === "native-e1m1-continuation-vitality-unavailable",
      "vitalityTrace.provenance is unknown");
    requireBoolean(trace.deathCandidate, "vitalityTrace.deathCandidate");
    requireInteger(trace.consecutiveDeathGametics, "vitalityTrace.consecutiveDeathGametics", 0, MAX_INT32);
    requireWire(trace.requiredDeathGametics === 3,
      "vitalityTrace.requiredDeathGametics must remain 3");
    requireBoolean(trace.nativeDeathConfirmed, "vitalityTrace.nativeDeathConfirmed");
    requireBoolean(trace.restartRequested, "vitalityTrace.restartRequested");
    requireString(trace.restartRequestId, "vitalityTrace.restartRequestId");
    requireNonEmptyString(trace.restartReason, "vitalityTrace.restartReason");

    if (decision.ownershipDisposition === "NotAcquired") {
      requireWire(
        trace.sessionId === "" && trace.runId === "" && trace.runGeneration === 0
          && trace.evaluatedAtControlTick === 0 && trace.available === false
          && trace.fresh === false && trace.nativeGametic === -1
          && trace.playerHealth === -1 && trace.playerState === -1
          && trace.playerKillCount === -1 && trace.deathCandidate === false
          && trace.consecutiveDeathGametics === 0 && trace.nativeDeathConfirmed === false
          && trace.restartRequested === false && trace.restartRequestId === ""
          && trace.restartReason === "none",
        "waiting vitalityTrace must use canonical sentinels");
      return;
    }

    requireWire(
      trace.sessionId === decision.sessionId
        && trace.runId === decision.runId
        && trace.runGeneration === decision.runGeneration
        && trace.evaluatedAtControlTick === decision.controlTick,
      "vitalityTrace scope/tick mismatch");
    requireWire(!trace.fresh || trace.available,
      "fresh vitality evidence must be available");
    requireWire(
      trace.provenance === (trace.available
        ? "native-e1m1-continuation-vitality"
        : "native-e1m1-continuation-vitality-unavailable"),
      "vitalityTrace provenance does not match availability");
    if (trace.available && decision.state !== "Complete" && decision.state !== "AwaitRestart") {
      requireWire(
        input.nativeLevelFactsAvailable === true
          && input.nativeGameState === 0
          && input.nativeGameEpisode === 1
          && input.nativeGameMap === 1
          && input.nativeLevelLoadSequenceAvailable === true
          && input.nativePlayerVitalityFactsAvailable === true,
        "available vitalityTrace lacks current E1M1 native facts");
      requireWire(
        trace.nativeGametic === input.nativeGametic
          && trace.playerHealth === input.nativePlayerHealth
          && trace.playerState === input.nativePlayerState
          && trace.playerKillCount === input.nativePlayerKillCount,
        "vitalityTrace changed current native player facts across the C# wire");
      requireWire(
        trace.deathCandidate === (trace.playerHealth <= 0 || trace.playerState === 1),
        "vitalityTrace deathCandidate does not match current native facts");
    } else if (trace.available) {
      requireWire(trace.nativeGametic >= 0 && trace.nativeGametic <= input.nativeGametic,
        "terminal vitalityTrace cannot lead the current native gametic");
    }
    requireWire(
      trace.nativeDeathConfirmed === (trace.consecutiveDeathGametics >= trace.requiredDeathGametics),
      "vitalityTrace death confirmation lacks the required distinct-gametic evidence");
    requireWire(trace.nativeDeathConfirmed === decision.nativeDeathConfirmed,
      "vitalityTrace nativeDeathConfirmed does not match decision");
    requireWire(trace.restartRequested === decision.restartRequested,
      "vitalityTrace restartRequested does not match decision");
    requireWire(trace.restartRequestId === decision.restartRequestId,
      "vitalityTrace restartRequestId does not match decision");
    requireWire(trace.restartReason === decision.restartReason,
      "vitalityTrace restartReason does not match decision");
    if (trace.nativeDeathConfirmed) {
      requireWire(
        trace.available && trace.deathCandidate
          && trace.consecutiveDeathGametics >= trace.requiredDeathGametics
          && trace.restartRequestId === `e1m1-continuation:${decision.sessionId}:${decision.runId}:${decision.runGeneration}:restart-1`
          && trace.restartReason === "native-player-death-confirmed",
        "vitalityTrace restart proof is not canonical");
    }
  }

  function validateSemanticProjection(projection, decision) {
    requireWire(isRecord(projection), "semanticProjection is required");
    requireNonEmptyString(projection.telos, "semanticProjection.telos");
    requireNonEmptyString(projection.objective, "semanticProjection.objective");
    requireInteger(projection.doorOpenedCount, "semanticProjection.doorOpenedCount", 1, 3);
    for (const property of [
      "secondDoorTraversed", "gatekeeperKilled", "exitDoorTraversed",
      "exitSwitchUsed", "levelCompleted"
    ]) {
      requireBoolean(projection[property], `semanticProjection.${property}`);
    }
    requireWire(projection.secondDoorTraversed === decision.doorTrace.secondDoorTraversed,
      "semantic secondDoorTraversed does not match doorTrace");
    requireWire(projection.gatekeeperKilled === decision.gatekeeperTrace.killed,
      "semantic gatekeeperKilled does not match gatekeeperTrace");
    requireWire(projection.exitDoorTraversed === decision.doorTrace.exitDoorTraversed,
      "semantic exitDoorTraversed does not match doorTrace");
    requireWire(projection.exitSwitchUsed === decision.doorTrace.exitSwitchAckAccepted,
      "semantic exitSwitchUsed does not match doorTrace");
    requireWire(projection.levelCompleted === decision.completed,
      "semantic levelCompleted does not match decision completion");
    const expectedDoorCount = 1 + (projection.secondDoorTraversed ? 1 : 0)
      + (projection.exitDoorTraversed ? 1 : 0);
    requireWire(projection.doorOpenedCount === expectedDoorCount,
      "semantic doorOpenedCount is not the exact C# door progression");
    const expectedSemantic = {
      WaitingForPostCompletion: ["ZigzagRoute", "await-post-completion-proof"],
      NavigateZigzag: ["ZigzagRoute", "navigate-zigzag"],
      ApproachSecondDoor: ["SecondDoor", "open-and-traverse-second-door"],
      PreUseStopSecondDoor: ["SecondDoor", "open-and-traverse-second-door"],
      StationarySecondDoorUse: ["SecondDoor", "open-and-traverse-second-door"],
      AwaitSecondDoorAck: ["SecondDoor", "open-and-traverse-second-door"],
      TraverseSecondDoor: ["SecondDoor", "open-and-traverse-second-door"],
      InterceptRouteThreat: ["RouteThreat", "intercept-captured-route-enemy"],
      NavigateGatekeeper: ["Gatekeeper", "defeat-sector-74-gatekeeper"],
      EngageGatekeeper: ["Gatekeeper", "defeat-sector-74-gatekeeper"],
      NavigateExitDoor: ["ExitDoor", "open-exit-door-and-enter-exit-room"],
      PreUseStopExitDoor: ["ExitDoor", "open-exit-door-and-enter-exit-room"],
      StationaryExitDoorUse: ["ExitDoor", "open-exit-door-and-enter-exit-room"],
      AwaitExitDoorAck: ["ExitDoor", "open-exit-door-and-enter-exit-room"],
      EnterExitRoom: ["ExitDoor", "open-exit-door-and-enter-exit-room"],
      ApproachExitSwitch: ["ExitSwitch", "activate-e1m1-exit-switch"],
      PreUseStopExitSwitch: ["ExitSwitch", "activate-e1m1-exit-switch"],
      StationaryExitUse: ["ExitSwitch", "activate-e1m1-exit-switch"],
      AwaitExitAck: ["ExitSwitch", "activate-e1m1-exit-switch"],
      AwaitLevelCompletion: ["E1M1Completion", "confirm-native-intermission-transition"],
      Complete: ["E1M1Complete", "level-completed"],
      AwaitRestart: ["Restart", "restart-after-native-death"],
      FailedSafeStop: ["FailedSafeStop", "preserve-safe-neutral-control"]
    }[decision.state];
    requireWire(Boolean(expectedSemantic), "semantic state mapping is missing");
    requireWire(
      projection.telos === expectedSemantic[0] && projection.objective === expectedSemantic[1],
      "semantic TELOS/objective does not exactly match the C# state");
  }

  function normalizeSfxName(value) {
    const normalized = value.trim().toLowerCase();
    return normalized.startsWith("sfx_") ? normalized.slice(4) : normalized;
  }

  function validateAudioObservation(observation, index, trace, decision) {
    const name = `audioCatalogTrace.events[${index}]`;
    requireWire(isRecord(observation), `${name} must be an object`);
    requireWire(observation.catalogVersion === AUDIO_CATALOG_VERSION, `${name}.catalogVersion mismatch`);
    requireWire(observation.sourceRevision === AUDIO_CATALOG_SOURCE_REVISION, `${name}.sourceRevision mismatch`);
    requireWire(observation.catalogIdentityHash === trace.catalogIdentityHash,
      `${name}.catalogIdentityHash mismatch`);
    requireWire(
      observation.sessionId === decision.sessionId
        && observation.runId === decision.runId
        && observation.runGeneration === decision.runGeneration,
      `${name} scope mismatch`);
    requireWire(observation.observedAtControlTick === decision.controlTick, `${name} tick mismatch`);
    requireInteger(observation.sequence, `${name}.sequence`, 1, MAX_UINT32);
    requireInteger(observation.sfxId, `${name}.sfxId`, -1, MAX_INT32);
    for (const property of ["rawSfxName", "normalizedSfxName", "expectedSfxName"]) {
      requireString(observation[property], `${name}.${property}`);
    }
    requireBoolean(observation.catalogued, `${name}.catalogued`);
    requireNonEmptyString(observation.meaningCode, `${name}.meaningCode`);
    requireNonEmptyString(observation.meaningLabel, `${name}.meaningLabel`);
    requireWire(AUDIO_CLASSIFICATION_REASONS.has(observation.classificationReason),
      `${name}.classificationReason is unknown`);
    requireCanonicalSha256(observation.eventIdentityHash, `${name}.eventIdentityHash`);
    requireWire(observation.diagnosticOnly === true, `${name}.diagnosticOnly must be true`);
    requireWire(observation.normalizedSfxName === normalizeSfxName(observation.rawSfxName),
      `${name}.normalizedSfxName is not canonical`);
    requireWire(observation.catalogued === (observation.classificationReason === "exact-id-name-pair"),
      `${name}.catalogued does not match classificationReason`);
  }

  function validateAudioTrace(trace, decision, input) {
    requireWire(isRecord(trace), "audioCatalogTrace is required");
    requireWire(trace.traceVersion === 1, "audioCatalogTrace.traceVersion must be 1");
    requireWire(trace.catalogVersion === AUDIO_CATALOG_VERSION, "audio catalogVersion mismatch");
    requireWire(trace.sourceRevision === AUDIO_CATALOG_SOURCE_REVISION, "audio sourceRevision mismatch");
    requireWire(trace.catalogIdentityHash === AUDIO_CATALOG_IDENTITY_HASH,
      "audio catalogIdentityHash mismatch");
    requireWire(
      trace.sessionId === decision.sessionId
        && trace.runId === decision.runId
        && trace.runGeneration === decision.runGeneration,
      "audioCatalogTrace scope mismatch");
    requireWire(trace.evaluatedAtControlTick === decision.controlTick,
      "audioCatalogTrace control tick mismatch");
    requireInteger(trace.latestObservedSequence, "audioCatalogTrace.latestObservedSequence", 0, MAX_UINT32);
    requireWire(trace.latestObservedSequence <= input.audio.nativeEvents,
      "audioCatalogTrace acknowledged an unobserved sequence");
    requireWire(trace.capacity === AUDIO_TRACE_CAPACITY, "audio trace capacity changed");
    requireInteger(trace.totalNewEventCount, "audioCatalogTrace.totalNewEventCount", 0,
      MAX_NATIVE_AUDIO_EVENTS_PER_PACKET);
    requireInteger(trace.retainedEventCount, "audioCatalogTrace.retainedEventCount", 0, AUDIO_TRACE_CAPACITY);
    requireInteger(trace.unknownEventCount, "audioCatalogTrace.unknownEventCount", 0,
      MAX_NATIVE_AUDIO_EVENTS_PER_PACKET);
    requireBoolean(trace.truncated, "audioCatalogTrace.truncated");
    requireWire(trace.diagnosticOnly === true, "audioCatalogTrace.diagnosticOnly must be true");
    requireWire(Array.isArray(trace.events), "audioCatalogTrace.events must be an array");
    requireWire(trace.events.length === trace.retainedEventCount,
      "audio retainedEventCount mismatch");
    requireWire(trace.retainedEventCount === Math.min(trace.totalNewEventCount, AUDIO_TRACE_CAPACITY),
      "audio retained count is inconsistent");
    requireWire(trace.truncated === (trace.totalNewEventCount > AUDIO_TRACE_CAPACITY),
      "audio truncated flag is inconsistent");
    let previousSequence = 0;
    for (let index = 0; index < trace.events.length; index += 1) {
      validateAudioObservation(trace.events[index], index, trace, decision);
      const nativeEvent = input.audio.events.find(
        event => event.sequence === trace.events[index].sequence);
      requireWire(
        Boolean(nativeEvent)
          && nativeEvent.sfxId === trace.events[index].sfxId
          && nativeEvent.sfxName === trace.events[index].rawSfxName,
        `audioCatalogTrace.events[${index}] changed native audio facts across the C# wire`);
      requireWire(trace.events[index].sequence > previousSequence,
        `audioCatalogTrace.events[${index}] is not strictly ordered`);
      requireWire(trace.events[index].sequence <= trace.latestObservedSequence,
        `audioCatalogTrace.events[${index}] exceeds latestObservedSequence`);
      previousSequence = trace.events[index].sequence;
    }
    requireWire(
      trace.unknownEventCount === trace.events.filter(event => !event.catalogued).length,
      "audio unknownEventCount does not match retained classification evidence");
    if (trace.totalNewEventCount > 0) {
      requireWire(previousSequence === trace.latestObservedSequence,
        "audio latest retained sequence mismatch");
    }
  }

  function validateReplayEntry(entry, name) {
    requireWire(isRecord(entry), `${name} must be an object`);
    requireInteger(entry.controlTick, `${name}.controlTick`, 1);
    requireInteger(entry.nativeGametic, `${name}.nativeGametic`, -1, MAX_INT32);
    requireWire(STATES.has(entry.state), `${name}.state is unknown`);
    requireNonEmptyString(entry.reasonCode, `${name}.reasonCode`);
    requireInteger(entry.playerSectorIndex, `${name}.playerSectorIndex`, -1, MAX_INT32);
    requireInteger(entry.legIndex, `${name}.legIndex`, -1, 15);
    requireString(entry.legId, `${name}.legId`);
    requireInteger(entry.routeFrames, `${name}.routeFrames`, 0, MAX_INT32);
    requireInteger(entry.legFrames, `${name}.legFrames`, 0, MAX_INT32);
    requireInteger(entry.combatFrames, `${name}.combatFrames`, 0, MAX_INT32);
    requireInteger(entry.gatekeeperIdentity, `${name}.gatekeeperIdentity`, 0, MAX_UINT32);
    requireBoolean(entry.gatekeeperKilled, `${name}.gatekeeperKilled`);
    requireInteger(entry.gatekeeperKillCountAtAcquisition,
      `${name}.gatekeeperKillCountAtAcquisition`, -1, MAX_INT32);
    requireInteger(entry.gatekeeperConfirmedKillCount,
      `${name}.gatekeeperConfirmedKillCount`, -1, MAX_INT32);
    requireBoolean(entry.secondDoorSlabObserved, `${name}.secondDoorSlabObserved`);
    requireBoolean(entry.exitDoorSlabObserved, `${name}.exitDoorSlabObserved`);
    requireWire(!entry.gatekeeperKilled
      || (entry.gatekeeperIdentity > 0
        && entry.gatekeeperKillCountAtAcquisition >= 0
        && entry.gatekeeperConfirmedKillCount > entry.gatekeeperKillCountAtAcquisition),
    `${name} gatekeeper kill proof is incomplete`);
    requireWire(USE_KINDS.has(entry.pendingUseKind), `${name}.pendingUseKind is unknown`);
    requireInteger(entry.useAttemptId, `${name}.useAttemptId`, 0);
    requireBoolean(entry.runRequested, `${name}.runRequested`);
    validateAction(entry.action, entry.runRequested, `${name}.action`);
  }

  function validateReplay(replay, decision, name) {
    requireWire(Array.isArray(replay), `${name} must be an array`);
    requireWire(replay.length <= REPLAY_CAPACITY, `${name} exceeds bounded capacity`);
    let previousTick = 0;
    for (let index = 0; index < replay.length; index += 1) {
      validateReplayEntry(replay[index], `${name}[${index}]`);
      requireWire(replay[index].controlTick > previousTick, `${name} ticks must strictly increase`);
      requireWire(replay[index].controlTick <= decision.controlTick, `${name} cannot lead decision tick`);
      previousTick = replay[index].controlTick;
    }
  }

  function actionsEqual(left, right) {
    return left.moveForward === right.moveForward
      && left.moveBackward === right.moveBackward
      && left.strafeLeft === right.strafeLeft
      && left.strafeRight === right.strafeRight
      && left.turnYaw === right.turnYaw
      && left.useKey === right.useKey
      && left.attackKey === right.attackKey;
  }

  function validateFrozenTerminalSnapshot(decision, snapshot, terminalState, terminalReason) {
    requireWire(snapshot.state === terminalState,
      "terminal replay snapshot state changed");
    requireWire(snapshot.reasonCode === terminalReason,
      "terminal replay snapshot reason changed");
    requireWire(
      decision.navigation.active === false
        && decision.navigation.pose.playerSectorIndex === snapshot.playerSectorIndex
        && decision.navigation.legIndex === snapshot.legIndex
        && decision.navigation.legId === snapshot.legId
        && decision.navigation.routeFrames === snapshot.routeFrames
        && decision.navigation.legFrames === snapshot.legFrames
        && decision.navigation.combatFrames === snapshot.combatFrames,
      "terminal navigation is not correlated to its frozen replay snapshot");
    requireWire(
      decision.gatekeeperTrace.identity === snapshot.gatekeeperIdentity
        && decision.gatekeeperTrace.killed === snapshot.gatekeeperKilled
        && decision.gatekeeperTrace.killCountAtAcquisition
          === snapshot.gatekeeperKillCountAtAcquisition
        && (snapshot.gatekeeperKilled
          ? decision.gatekeeperTrace.currentKillCount === snapshot.gatekeeperConfirmedKillCount
          : snapshot.gatekeeperConfirmedKillCount === -1)
        && decision.doorTrace.secondDoorSlabObserved === snapshot.secondDoorSlabObserved
        && decision.doorTrace.exitDoorSlabObserved === snapshot.exitDoorSlabObserved,
      "terminal route/combat proof changed from its frozen replay snapshot");
    requireWire(
      decision.doorTrace.pendingUseKind === snapshot.pendingUseKind
        && decision.useAttemptId === snapshot.useAttemptId
        && decision.runRequested === snapshot.runRequested
        && actionsEqual(decision.action, snapshot.action),
      "terminal action/use proof changed from its frozen replay snapshot");
  }

  function validateFailureTrace(trace, decision) {
    requireWire(isRecord(trace), "failureTrace is required");
    requireBoolean(trace.failed, "failureTrace.failed");
    requireString(trace.sessionId, "failureTrace.sessionId");
    requireString(trace.runId, "failureTrace.runId");
    requireInteger(trace.runGeneration, "failureTrace.runGeneration", 0);
    requireInteger(trace.failureAtControlTick, "failureTrace.failureAtControlTick", -1);
    requireString(trace.failureCode, "failureTrace.failureCode");
    validateReplay(trace.replay, decision, "failureTrace.replay");
    const failedTerminal = decision.state === "FailedSafeStop";
    const failedThenRestart = decision.state === "AwaitRestart" && trace.failed;
    requireWire(trace.failed === (failedTerminal || failedThenRestart),
      "failureTrace does not match terminal state");
    if (!trace.failed) {
      requireWire(
        trace.sessionId === "" && trace.runId === "" && trace.runGeneration === 0
          && trace.failureAtControlTick === -1 && trace.failureCode === ""
          && trace.failureSnapshot === null && trace.replay.length === 0,
        "non-failed failureTrace must use canonical sentinels");
      return;
    }
    requireWire(
      trace.sessionId === decision.sessionId
        && trace.runId === decision.runId
        && trace.runGeneration === decision.runGeneration,
      "failureTrace scope mismatch");
    requireWire(trace.failureAtControlTick >= 1 && trace.failureAtControlTick <= decision.controlTick,
      "failureTrace tick is invalid");
    validateReplayEntry(trace.failureSnapshot, "failureTrace.failureSnapshot");
    requireWire(trace.replay.length > 0, "failed trace requires replay evidence");
    requireWire(JSON.stringify(trace.failureSnapshot) === JSON.stringify(trace.replay.at(-1)),
      "failure snapshot is not the immutable terminal replay entry");
    requireWire(
      trace.failureAtControlTick === trace.failureSnapshot.controlTick
        && trace.failureCode === trace.failureSnapshot.reasonCode
        && trace.failureSnapshot.nativeGametic <= decision.nativeGametic
        && decision.navigation.failureCode === trace.failureCode,
      "failureTrace does not correlate to its frozen failure snapshot");
    requireWire(!failedTerminal || decision.reasonCode === trace.failureCode,
      "FailedSafeStop decision lost its failure code");
    requireWire(!failedThenRestart
      || decision.reasonCode === "native-player-death-restart-requested-after-failed-safe-stop",
    "failed terminal restart reasonCode is not canonical");
    validateFrozenTerminalSnapshot(
      decision,
      trace.failureSnapshot,
      "FailedSafeStop",
      trace.failureCode);
  }

  function validateCompletionTrace(trace, decision, input) {
    requireWire(isRecord(trace), "completionTrace is required");
    requireBoolean(trace.completed, "completionTrace.completed");
    requireString(trace.sessionId, "completionTrace.sessionId");
    requireString(trace.runId, "completionTrace.runId");
    requireInteger(trace.runGeneration, "completionTrace.runGeneration", 0);
    requireInteger(trace.completionAtControlTick, "completionTrace.completionAtControlTick", -1);
    requireString(trace.completionCode, "completionTrace.completionCode");
    requireInteger(trace.nativeLevelLoadSequence, "completionTrace.nativeLevelLoadSequence", -1, MAX_UINT32);
    requireInteger(trace.nativeGametic, "completionTrace.nativeGametic", -1, MAX_INT32);
    requireInteger(trace.previousGameState, "completionTrace.previousGameState", -1, 3);
    requireInteger(trace.completedGameState, "completionTrace.completedGameState", -1, 3);
    requireInteger(trace.gatekeeperIdentity, "completionTrace.gatekeeperIdentity", 0, MAX_UINT32);
    requireInteger(trace.gatekeeperKillCountAtAcquisition,
      "completionTrace.gatekeeperKillCountAtAcquisition", -1, MAX_INT32);
    requireInteger(trace.gatekeeperConfirmedKillCount,
      "completionTrace.gatekeeperConfirmedKillCount", -1, MAX_INT32);
    for (const property of [
      "gatekeeperKilled", "secondDoorTraversed", "exitDoorTraversed", "exitSwitchUsed"
    ]) {
      requireBoolean(trace[property], `completionTrace.${property}`);
    }
    validateReplay(trace.replay, decision, "completionTrace.replay");
    requireWire(trace.completed === decision.completed, "completionTrace does not match decision completion");
    if (!trace.completed) {
      requireWire(
        trace.sessionId === "" && trace.runId === "" && trace.runGeneration === 0
          && trace.completionAtControlTick === -1 && trace.completionCode === ""
          && trace.nativeLevelLoadSequence === -1 && trace.nativeGametic === -1
          && trace.previousGameState === -1 && trace.completedGameState === -1
          && trace.gatekeeperIdentity === 0 && trace.gatekeeperKilled === false
          && trace.gatekeeperKillCountAtAcquisition === -1
          && trace.gatekeeperConfirmedKillCount === -1
          && trace.secondDoorTraversed === false && trace.exitDoorTraversed === false
          && trace.exitSwitchUsed === false && trace.completionSnapshot === null
          && trace.replay.length === 0,
        "non-complete completionTrace must use canonical sentinels");
      return;
    }
    requireWire(
      trace.sessionId === decision.sessionId
        && trace.runId === decision.runId
        && trace.runGeneration === decision.runGeneration,
      "completionTrace scope mismatch");
    requireWire(trace.completionCode === "e1m1-level-completion-confirmed",
      "completionTrace code mismatch");
    requireWire(trace.completionAtControlTick >= 1 && trace.completionAtControlTick <= decision.controlTick,
      "completionTrace tick is invalid");
    requireWire(
      trace.nativeLevelLoadSequence === input.nativeLevelLoadSequence
        && trace.nativeGametic >= 0
        && trace.nativeGametic <= input.nativeGametic
        && trace.previousGameState === 0
        && trace.completedGameState === 1,
      "completionTrace lacks the current GS_LEVEL to GS_INTERMISSION proof");
    requireWire(
      trace.gatekeeperIdentity > 0 && trace.gatekeeperKilled
        && trace.gatekeeperKillCountAtAcquisition >= 0
        && trace.gatekeeperConfirmedKillCount > trace.gatekeeperKillCountAtAcquisition
        && trace.secondDoorTraversed && trace.exitDoorTraversed && trace.exitSwitchUsed,
      "completionTrace lacks required route and combat proof");
    validateReplayEntry(trace.completionSnapshot, "completionTrace.completionSnapshot");
    requireWire(trace.replay.length > 0, "completed trace requires replay evidence");
    requireWire(JSON.stringify(trace.completionSnapshot) === JSON.stringify(trace.replay.at(-1)),
      "completion snapshot is not the immutable terminal replay entry");
    requireWire(
      trace.completionAtControlTick === trace.completionSnapshot.controlTick
        && trace.nativeGametic === trace.completionSnapshot.nativeGametic
        && trace.gatekeeperIdentity === trace.completionSnapshot.gatekeeperIdentity
        && trace.gatekeeperKillCountAtAcquisition
          === trace.completionSnapshot.gatekeeperKillCountAtAcquisition
        && trace.gatekeeperConfirmedKillCount
          === trace.completionSnapshot.gatekeeperConfirmedKillCount
        && trace.gatekeeperIdentity === decision.gatekeeperTrace.identity
        && trace.gatekeeperKillCountAtAcquisition
          === decision.gatekeeperTrace.killCountAtAcquisition
        && trace.gatekeeperConfirmedKillCount === decision.gatekeeperTrace.currentKillCount,
      "completionTrace combat proof changed from its frozen completion snapshot");
    validateFrozenTerminalSnapshot(
      decision,
      trace.completionSnapshot,
      "Complete",
      "e1m1-level-completion-confirmed");
  }

  function validateDecision(decision, input) {
    requireWire(isRecord(decision), "decision must be an object");
    requireWire(decision.implementationVersion === "e1m1-continuation-v2",
      "implementationVersion mismatch");
    requireWire(decision.policyVersion === POLICY_VERSION, "policyVersion mismatch");
    requireWire(decision.contractVersion === CONTRACT_VERSION, "contractVersion mismatch");
    requireWire(decision.sessionId === input.sessionId, "sessionId mismatch");
    requireWire(decision.runId === input.runId, "runId mismatch");
    requireWire(decision.runGeneration === input.runGeneration, "runGeneration mismatch");
    requireWire(decision.expectedPostComputerRoomControlTick === input.expectedPostComputerRoomControlTick,
      "post completion tick mismatch");
    requireInteger(decision.controlTick, "controlTick", 1);
    requireWire(decision.nativeGametic === input.nativeGametic,
      "nativeGametic changed across the C# wire");
    requireWire(STATES.has(decision.state), "state is unknown");
    requireWire(DISPOSITIONS.has(decision.ownershipDisposition), "ownershipDisposition is unknown");
    requireNonEmptyString(decision.ownerId, "ownerId");
    requireWire(decision.ownerId.startsWith("e1m1-continuation."), "ownerId is outside E1M1 continuation");
    requireNonEmptyString(decision.reasonCode, "reasonCode");
    requireBoolean(decision.runRequested, "runRequested");
    requireBoolean(decision.exclusive, "exclusive");
    requireBoolean(decision.completed, "completed");
    requireInteger(decision.useAttemptId, "useAttemptId", 0);
    requireWire(decision.manualUseSequence === input.manualUseSequence,
      "manualUseSequence changed across the C# wire");
    requireBoolean(decision.nativeDeathConfirmed, "nativeDeathConfirmed");
    requireBoolean(decision.restartRequested, "restartRequested");
    requireString(decision.restartRequestId, "restartRequestId");
    requireNonEmptyString(decision.restartReason, "restartReason");
    requireString(decision.contractError, "contractError");
    validateAction(decision.action, decision.runRequested);
    requireWire(
      decision.exclusive === (
        decision.ownershipDisposition === "Exclusive"
          || decision.ownershipDisposition === "FailedSafeStop"),
      "exclusive/disposition mismatch");
    requireWire(decision.completed === (decision.ownershipDisposition === "Completed"),
      "completed/disposition mismatch");
    const expectedDisposition = decision.state === "WaitingForPostCompletion"
      ? "NotAcquired"
      : (decision.state === "Complete"
        ? "Completed"
        : (decision.state === "FailedSafeStop" ? "FailedSafeStop" : "Exclusive"));
    requireWire(decision.ownershipDisposition === expectedDisposition,
      "state/ownershipDisposition mismatch");
    const expectedOwnerId = {
      NotAcquired: "e1m1-continuation.waiting",
      Exclusive: "e1m1-continuation.exclusive",
      Completed: "e1m1-continuation.completed",
      FailedSafeStop: "e1m1-continuation.failed-safe-stop"
    }[decision.ownershipDisposition];
    requireWire(decision.ownerId === expectedOwnerId, "ownerId/disposition mismatch");
    if (decision.ownershipDisposition === "NotAcquired") {
      requireWire(
        decision.state === "WaitingForPostCompletion"
          && isNeutralAction(decision.action, decision.runRequested)
          && decision.contractError.length > 0,
        "NotAcquired decision lacks a fail-closed waiting proof");
    } else if (decision.ownershipDisposition === "FailedSafeStop") {
      requireWire(decision.contractError === decision.reasonCode,
        "FailedSafeStop contractError must echo its failure code");
    } else {
      requireWire(decision.contractError === "", "acquired decision cannot carry contractError");
    }
    if (decision.state === "FailedSafeStop" || decision.state === "Complete"
      || decision.state === "AwaitRestart") {
      requireWire(isNeutralAction(decision.action, decision.runRequested),
        "terminal/restart decision must be neutral");
    }
    if (decision.nativeDeathConfirmed) {
      const restartAfterFailure = decision.failureTrace?.failed === true;
      requireWire(
        decision.state === "AwaitRestart" && decision.restartRequested
          && decision.restartRequestId.length > 0
          && decision.restartReason === "native-player-death-confirmed",
        "native death lacks a restart request");
      requireWire(
        decision.reasonCode === (restartAfterFailure
          ? "native-player-death-restart-requested-after-failed-safe-stop"
          : "native-player-death-restart-requested"),
        "native death restart reasonCode does not match frozen failure state");
    } else {
      requireWire(
        decision.restartRequested === false
          && decision.restartRequestId === ""
          && decision.restartReason === "none",
        "live decision cannot carry restart state");
    }
    validateNavigation(decision.navigation, decision, input);
    validateDoorTrace(decision.doorTrace, decision);
    validateGatekeeperTrace(decision.gatekeeperTrace, decision, input);
    validateThreatTrace(decision.threatTrace, decision, input);
    validateWeaponTrace(decision.weaponTrace, decision, input);
    validateVitalityTrace(decision.vitalityTrace, decision, input);
    requireWire(!decision.gatekeeperTrace.killed || decision.doorTrace.secondDoorTraversed,
      "gatekeeper kill cannot precede certified second-door traversal");
    requireWire(!decision.doorTrace.exitDoorAckAccepted || decision.gatekeeperTrace.killed,
      "exit-door acknowledgement cannot precede the required gatekeeper kill");
    if (decision.action.useKey || decision.action.attackKey) {
      requireWire(
        decision.navigation.pose.available
          && decision.navigation.pose.fresh
          && decision.navigation.pose.stationary
          && decision.navigation.pose.nativeGametic === input.nativeGametic,
        "Use/Attack requires a fresh stationary native pose");
    }
    if (decision.action.attackKey) {
      requireWire(
        decision.state === "InterceptRouteThreat" || decision.state === "EngageGatekeeper",
        "Attack is outside a C# combat owner state");
      requireWire(
        decision.weaponTrace.fireOpportunity || decision.weaponTrace.attackContinuation,
        "Attack lacks an exact native weapon opportunity or typed busy-cycle continuation");
      if (decision.state === "EngageGatekeeper") {
        requireWire(
          decision.gatekeeperTrace.snapshotAccepted
            && decision.gatekeeperTrace.snapshotFresh
            && decision.gatekeeperTrace.acquiredAlive
            && decision.gatekeeperTrace.topologyAccepted
            && decision.gatekeeperTrace.lineOfSight
            && Math.abs(decision.gatekeeperTrace.bearingErrorDegrees) <= 5,
          "gatekeeper Attack lacks current topology, sightline, and alignment proof");
      }
    }
    validateSemanticProjection(decision.semanticProjection, decision);
    validateAudioTrace(decision.audioCatalogTrace, decision, input);
    validateFailureTrace(decision.failureTrace, decision);
    validateCompletionTrace(decision.completionTrace, decision, input);
    requireWire(!(decision.failureTrace.failed && decision.completionTrace.completed),
      "failure and completion traces are mutually exclusive");
    return decision;
  }

  function nativeAudioCursorForScope(runtime, scope) {
    const cursor = runtime?.autoplayCSharpNativeAudioCursor;
    if (!isRecord(cursor)
      || cursor.sessionId !== scope.sessionId
      || cursor.runId !== scope.runId
      || cursor.runGeneration !== scope.runGeneration) {
      return 0;
    }
    return Number.isSafeInteger(cursor.afterSequence) && cursor.afterSequence >= 0
      ? cursor.afterSequence
      : 0;
  }

  function commitNativeAudioCursor(runtime, input, decision) {
    requireWire(isRecord(runtime), "runtime is required for audio cursor commit");
    requireWire(isRecord(input) && isRecord(decision), "validated input and decision are required");
    requireWire(
      decision.sessionId === input.sessionId
        && decision.runId === input.runId
        && decision.runGeneration === input.runGeneration,
      "audio cursor scope mismatch");
    const latestSequence = decision.audioCatalogTrace.latestObservedSequence;
    requireInteger(latestSequence, "audio cursor latestObservedSequence", 0, MAX_UINT32);
    runtime.autoplayCSharpNativeAudioCursor = {
      sessionId: input.sessionId,
      runId: input.runId,
      runGeneration: input.runGeneration,
      afterSequence: Math.max(nativeAudioCursorForScope(runtime, input), latestSequence)
    };
  }

  function evaluate(input, runtime) {
    requireWire(isRecord(input), "input is required");
    const bridge = self.aiKernelDoomControl;
    requireWire(typeof bridge?.evaluateBrowserE1M1Continuation === "function",
      "C# E1M1 continuation bridge is unavailable");
    const raw = bridge.evaluateBrowserE1M1Continuation(input);
    const decision = validateDecision(typeof raw === "string" ? JSON.parse(raw) : raw, input);
    if (runtime !== undefined) {
      commitNativeAudioCursor(runtime, input, decision);
    }
    return decision;
  }

  function metadata(decision) {
    return {
      source: "csharp-e1m1-continuation",
      pipeline: decision.ownerId,
      controlPipeline: decision.ownerId,
      phasePipelineId: decision.ownerId,
      phasePipelineExclusive: decision.exclusive,
      stage: decision.reasonCode,
      safetyReason: decision.reasonCode,
      svcEvent: decision.reasonCode,
      actionSequenceId: `csharp-e1m1-run-${decision.runGeneration}-tick-${decision.controlTick}`,
      actionSequenceStepId: decision.state,
      useAttemptId: decision.useAttemptId
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
      computerRoomEntered: true,
      centralHallEntered: true,
      doorOpenedCount: projection.doorOpenedCount,
      secondDoorTraversed: projection.secondDoorTraversed,
      gatekeeperKilled: projection.gatekeeperKilled,
      exitDoorTraversed: projection.exitDoorTraversed,
      exitSwitchUsed: projection.exitSwitchUsed,
      levelCompleted: projection.levelCompleted,
      ownerId: decision.ownerId,
      state: decision.state,
      reasonCode: decision.reasonCode,
      telos: projection.telos,
      objective: projection.objective
    };
  }

  function dispatch(decision) {
    requireWire(isRecord(decision), "validated decision is required");
    if (decision.ownershipDisposition === "NotAcquired") {
      fail(`E1M1 continuation was not acquired: ${decision.reasonCode}`);
    }
    const semantic = semanticState(decision);
    if (decision.ownershipDisposition === "Exclusive") {
      return { mode: "exclusive", exact: true, action: projectAction(decision), semanticState: semantic, decision };
    }
    if (decision.ownershipDisposition === "FailedSafeStop") {
      return {
        mode: "failed-safe-stop",
        exact: true,
        action: neutralAction(decision),
        semanticState: semantic,
        decision
      };
    }
    if (decision.ownershipDisposition === "Completed") {
      return {
        mode: "completed",
        exact: true,
        action: neutralAction(decision),
        semanticState: semantic,
        decision
      };
    }
    fail(`unsupported ownership disposition: ${decision.ownershipDisposition}`);
  }

  self.AIKernelDoomCSharpE1M1Continuation = Object.freeze({
    contractVersion: CONTRACT_VERSION,
    createInput,
    validateDecision,
    evaluate,
    dispatch,
    semanticState,
    projectAction,
    neutralAction,
    commitNativeAudioCursor
  });
})();
