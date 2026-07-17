(function () {
  "use strict";

  const CONTRACT_VERSION = 4;
  const MIN_WIRE_INT = -2147483648;
  const MAX_WIRE_INT = 2147483647;
  const MAX_UINT32 = 4294967295;
  const CANONICAL_DOOM1_WAD_SHA256 = "1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771";
  const OPENING_NAVIGATION_GEOMETRY_VERSION = "e1m1-first-door-opening-route-v1";
  const OPENING_NAVIGATION_POLICY_VERSION = "first-door-opening-navigation-v1";
  const RAW_OBSERVATION_SCHEMA_VERSION = 1;
  const RAW_OBSERVATION_LAYOUT = "pal8-center-20x13-v1";
  const RAW_SOURCE_WIDTH = 320;
  const RAW_SOURCE_HEIGHT = 200;
  const RAW_GAMEPLAY_HEIGHT = 168;
  const RAW_SAMPLE_COLUMNS = 20;
  const RAW_SAMPLE_ROWS = 13;
  const RAW_SAMPLE_LENGTH = RAW_SAMPLE_COLUMNS * RAW_SAMPLE_ROWS;
  const RAW_PALETTE_LENGTH = 256 * 4;
  const AUDIO_CATALOG_TRACE_VERSION = 1;
  const AUDIO_CATALOG_VERSION = "doom-native-sfx-catalog-v1";
  const AUDIO_CATALOG_SOURCE_REVISION = "dcb7a8dbc7a16ce3dda29382ac9aae9d77d21284";
  const AUDIO_CATALOG_IDENTITY_HASH = "2fd2ba92b0ac0761b4c60ea636532420e71475adfb49f33ac1994c37009dd756";
  const AUDIO_CATALOG_TRACE_CAPACITY = 32;
  const MAX_NATIVE_AUDIO_EVENTS_PER_PACKET = 256;
  const MAX_NATIVE_SFX_ID = 108;
  const UNKNOWN_SFX_MEANING_CODE = "unknown-sfx";
  const UNKNOWN_SFX_MEANING_LABEL = "Unknown SFX";
  const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const AUDIO_CATALOG_CLASSIFICATION_REASONS = new Set([
    "exact-id-name-pair",
    "empty-sfx-name",
    "sfx-id-out-of-range",
    "id-name-mismatch"
  ]);
  const OWNERSHIP_DISPOSITIONS = new Set([
    "NotAcquired",
    "Exclusive",
    "HandOff",
    "Completed",
    "FailedSafeStop"
  ]);
  const CONTROL_STATES = new Set([
    "OpeningTransit",
    "OpeningNavigate",
    "Approach",
    "FailedUseReapproach",
    "Align",
    "Contact",
    "PreUseStop",
    "StationaryUse",
    "AwaitOutcome",
    "PostOpenShove",
    "AwaitComputerRoom",
    "Complete",
    "FailedSafeStop"
  ]);
  const OWNERSHIP_UNITS = new Set([
    "OpeningTransit",
    "FirstDoorApproach",
    "DoorFrontAlign",
    "StationaryUse",
    "UseOutcome",
    "PostOpenEntryShove",
    "ComputerRoomEntryConfirmation"
  ]);
  const OPEN_SOURCES = new Set([
    "None",
    "NativeDoorCount",
    "TrustedMilestone",
    "TrustedAudio"
  ]);
  const EVIDENCE_PROVENANCE = new Set([
    "None",
    "NativeEngine",
    "TrustedMilestone",
    "ClassifiedNativeAudio",
    "VisualInference"
  ]);
  const EVIDENCE_TRUTH = new Set(["Unknown", "No", "Yes"]);
  const OPENING_NAVIGATION_STATUSES = new Set([
    "NotStarted",
    "WaitingForPose",
    "Navigating",
    "Realigning",
    "ReturningToCertifiedWaypoint",
    "SightlineAlign",
    "ReadyForAcquisition",
    "Failed"
  ]);
  const OPENING_NAVIGATION_BLOCK_CODES = new Set([
    "None",
    "ControlNotReady",
    "ProximityUnavailable",
    "DuplicatePose",
    "PoseRewind",
    "WrongContentOrMap",
    "WaypointPending",
    "BearingAlignmentPending",
    "PortalEvidencePending",
    "CrossTrackExceeded",
    "ProgressWindowPending",
    "StallDetected",
    "RecoveryInProgress",
    "SightlineBearingPending",
    "StationaryProofPending",
    "AcquisitionEvidencePending",
    "SightlineBudgetExhausted",
    "PoseMissingBudgetExhausted",
    "LegBudgetExhausted",
    "RouteBudgetExhausted",
    "RecoveryBudgetExhausted",
    "InvalidState",
    "InvalidPolicy"
  ]);
  const PENDING_USE_CORRELATION_STATES = new Set([
    "none",
    "use-issued",
    "awaiting-outcome"
  ]);
  const STATE_OWNERSHIP = Object.freeze({
    OpeningTransit: Object.freeze({
      unit: "OpeningTransit",
      disposition: "NotAcquired",
      ownerId: "first-door.opening-transit"
    }),
    OpeningNavigate: Object.freeze({
      unit: "OpeningTransit",
      disposition: "Exclusive",
      ownerId: "first-door.opening-transit"
    }),
    Approach: Object.freeze({
      unit: "FirstDoorApproach",
      disposition: "Exclusive",
      ownerId: "first-door.approach"
    }),
    FailedUseReapproach: Object.freeze({
      unit: "UseOutcome",
      disposition: "Exclusive",
      ownerId: "first-door.use-outcome"
    }),
    Align: Object.freeze({
      unit: "DoorFrontAlign",
      disposition: "Exclusive",
      ownerId: "first-door.door-front-align"
    }),
    Contact: Object.freeze({
      unit: "DoorFrontAlign",
      disposition: "Exclusive",
      ownerId: "first-door.door-front-align"
    }),
    PreUseStop: Object.freeze({
      unit: "DoorFrontAlign",
      disposition: "Exclusive",
      ownerId: "first-door.door-front-align"
    }),
    StationaryUse: Object.freeze({
      unit: "StationaryUse",
      disposition: "Exclusive",
      ownerId: "first-door.stationary-use"
    }),
    AwaitOutcome: Object.freeze({
      unit: "UseOutcome",
      disposition: "Exclusive",
      ownerId: "first-door.use-outcome"
    }),
    PostOpenShove: Object.freeze({
      unit: "PostOpenEntryShove",
      disposition: "Exclusive",
      ownerId: "first-door.post-open-entry-shove"
    }),
    AwaitComputerRoom: Object.freeze({
      unit: "ComputerRoomEntryConfirmation",
      disposition: "HandOff",
      ownerId: "first-door.computer-room-entry-confirmation"
    }),
    Complete: Object.freeze({
      unit: "ComputerRoomEntryConfirmation",
      disposition: "Completed",
      ownerId: "first-door.computer-room-entry-confirmation"
    }),
    FailedSafeStop: Object.freeze({
      unit: null,
      disposition: "FailedSafeStop",
      ownerId: "first-door.failed-safe-stop"
    })
  });

  function taggedError(message, cause) {
    const error = cause instanceof Error ? cause : new Error(String(message));
    if (cause instanceof Error && message && error.message.indexOf(message) < 0) {
      const wrapped = new Error(`${message}: ${error.message}`);
      wrapped.cause = error;
      wrapped.aikernelCSharpFirstDoor = true;
      return wrapped;
    }

    error.aikernelCSharpFirstDoor = true;
    return error;
  }

  function fail(message) {
    throw taggedError(message);
  }

  function requireWire(condition, message) {
    if (!condition) {
      fail(`Invalid C# FirstDoor wire contract: ${message}`);
    }
  }

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function isPlainRecord(value) {
    return isRecord(value) && Object.prototype.toString.call(value) === "[object Object]";
  }

  function boundedInteger(value, fallback, minimum, maximum = Number.MAX_SAFE_INTEGER) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }

    return Math.max(minimum, Math.min(maximum, Math.trunc(number)));
  }

  function stringValue(value, fallback = "") {
    return typeof value === "string" ? value : fallback;
  }

  function firstString(...values) {
    for (const value of values) {
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }

    return "";
  }

  function firstFinite(values, fallback = 0) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) {
        return number;
      }
    }

    return fallback;
  }

  function copyExactBytes(value, expectedLength) {
    if (!value || !Number.isSafeInteger(value.length) || value.length !== expectedLength) {
      return null;
    }

    const bytes = new Array(expectedLength);
    for (let index = 0; index < expectedLength; index += 1) {
      const item = Number(value[index]);
      if (!Number.isSafeInteger(item) || item < 0 || item > 255) {
        return null;
      }

      bytes[index] = item;
    }

    return bytes;
  }

  function encodeBase64(bytes) {
    let encoded = "";
    for (let index = 0; index < bytes.length; index += 3) {
      const first = bytes[index];
      const hasSecond = index + 1 < bytes.length;
      const hasThird = index + 2 < bytes.length;
      const second = hasSecond ? bytes[index + 1] : 0;
      const third = hasThird ? bytes[index + 2] : 0;
      encoded += BASE64_ALPHABET[(first >>> 2) & 63];
      encoded += BASE64_ALPHABET[((first & 3) << 4) | ((second >>> 4) & 15)];
      encoded += hasSecond
        ? BASE64_ALPHABET[((second & 15) << 2) | ((third >>> 6) & 3)]
        : "=";
      encoded += hasThird ? BASE64_ALPHABET[third & 63] : "=";
    }

    return encoded;
  }

  function createRawObservation(runtime, rawState, nativeRun, nativeRunAvailable) {
    const sourceState = isRecord(rawState) ? rawState : {};
    const framebuffer = isRecord(sourceState.framebuffer) ? sourceState.framebuffer : {};
    const sample = copyExactBytes(framebuffer.sample, RAW_SAMPLE_LENGTH);
    const palette = copyExactBytes(runtime?.paletteCache?.rgbaBytes, RAW_PALETTE_LENGTH);
    const frameSequence = Number(sourceState.frame);
    const paletteGeneration = runtime?.paletteGeneration;
    const dimensionsMatch = Number(framebuffer.width) === RAW_SOURCE_WIDTH
      && Number(framebuffer.height) === RAW_SOURCE_HEIGHT;
    const available = sample !== null
      && palette !== null
      && dimensionsMatch
      && Number.isSafeInteger(frameSequence)
      && frameSequence >= 0
      && Number.isSafeInteger(paletteGeneration)
      && paletteGeneration > 0;

    if (!available) {
      return {
        schemaVersion: RAW_OBSERVATION_SCHEMA_VERSION,
        layout: RAW_OBSERVATION_LAYOUT,
        available: false,
        frameSequence: -1,
        nativeGameticObservedAtEvaluation: -1,
        sourceWidth: -1,
        sourceHeight: -1,
        gameplayHeight: -1,
        sampleColumns: 0,
        sampleRows: 0,
        paletteGeneration: 0,
        paletteIndicesBase64: "",
        paletteRgbaBase64: ""
      };
    }

    return {
      schemaVersion: RAW_OBSERVATION_SCHEMA_VERSION,
      layout: RAW_OBSERVATION_LAYOUT,
      available: true,
      frameSequence,
      nativeGameticObservedAtEvaluation: nativeRunAvailable
        ? boundedInteger(nativeRun.gametic, -1, -1)
        : -1,
      sourceWidth: RAW_SOURCE_WIDTH,
      sourceHeight: RAW_SOURCE_HEIGHT,
      gameplayHeight: RAW_GAMEPLAY_HEIGHT,
      sampleColumns: RAW_SAMPLE_COLUMNS,
      sampleRows: RAW_SAMPLE_ROWS,
      paletteGeneration,
      paletteIndicesBase64: encodeBase64(sample),
      paletteRgbaBase64: encodeBase64(palette)
    };
  }

  function scopeValue(scope, name, fallback) {
    return Object.prototype.hasOwnProperty.call(scope, name) ? scope[name] : fallback;
  }

  function resolveControlScope(runtime) {
    const scope = isRecord(runtime?.autoplayCSharpFirstDoorScope)
      ? runtime.autoplayCSharpFirstDoorScope
      : {};
    const lifecycleState = firstString(
      scopeValue(scope, "lifecycleState", undefined),
      runtime?.autoplayCSharpFirstDoorLifecycleState,
      runtime?.state) || "unknown";
    let modelState = firstString(
      scopeValue(scope, "modelState", undefined),
      runtime?.autoplayCSharpFirstDoorModelState);
    if (!modelState) {
      modelState = runtime?.modelLoaded === true
        ? "ready"
        : (runtime?.downloadProgress?.active === true || runtime?.loadPromise ? "loading" : "unknown");
    }

    return {
      sessionId: firstString(
        scopeValue(scope, "sessionId", undefined),
        runtime?.autoplayCSharpFirstDoorSessionId),
      runId: firstString(
        scopeValue(scope, "runId", undefined),
        runtime?.autoplayCSharpFirstDoorRunId),
      runGeneration: boundedInteger(
        scopeValue(scope, "runGeneration", runtime?.autoplayCSharpFirstDoorRunGeneration),
        0,
        0),
      resetRequested: scopeValue(
        scope,
        "resetRequested",
        runtime?.autoplayCSharpFirstDoorResetRequested) === true,
      resetOperationId: firstString(
        scopeValue(scope, "resetOperationId", undefined),
        runtime?.autoplayCSharpFirstDoorResetOperationId),
      lifecycleEvent: firstString(
        scopeValue(scope, "lifecycleEvent", undefined),
        runtime?.autoplayCSharpFirstDoorLifecycleEvent) || "none",
      lifecycleState,
      modelState
    };
  }

  function unavailableNativeFacts() {
    return {
      run: {
        available: false,
        gametic: null,
        leveltime: null,
        levelstarttic: null,
        gamestate: null,
        gameepisode: null,
        gamemap: null,
        levelLoadSequenceAvailable: false,
        levelLoadSequence: null
      },
      audio: {
        available: false,
        latestSequence: 0,
        events: []
      },
      player: {
        available: false,
        xFixed: null,
        yFixed: null,
        angleBam: null,
        momentumXFixed: null,
        momentumYFixed: null,
        sectorIndex: null,
        health: null,
        playerState: null,
        killCount: null
      }
    };
  }

  function nativeAudioCursorForScope(runtime, scope) {
    const cursor = runtime?.autoplayCSharpNativeAudioCursor;
    if (!isRecord(cursor)
      || cursor.sessionId !== scope.sessionId
      || cursor.runId !== scope.runId
      || cursor.runGeneration !== scope.runGeneration) {
      return 0;
    }

    return boundedInteger(cursor.afterSequence, 0, 0, MAX_WIRE_INT);
  }

  function readNativeFacts(runtime, scope) {
    const reader = self.AIKernelDoomNativeAudio;
    const read = typeof reader?.readFirstDoorFacts === "function"
      ? reader.readFirstDoorFacts
      : reader?.readNativeFacts;
    if (typeof read !== "function") {
      return unavailableNativeFacts();
    }

    const facts = read.call(
      reader,
      runtime?.exports,
      nativeAudioCursorForScope(runtime, scope));
    return isRecord(facts) ? facts : unavailableNativeFacts();
  }

  function commitNativeAudioCursor(runtime, input, decision) {
    if (!isRecord(runtime)
      || !isRecord(input)
      || !isRecord(decision)
      || decision.sessionId !== input.sessionId
      || decision.runId !== input.runId
      || decision.runGeneration !== input.runGeneration) {
      return;
    }

    const latestSequence = boundedInteger(
      decision.audioCatalogTrace.latestObservedSequence,
      0,
      0,
      MAX_WIRE_INT);
    const currentSequence = nativeAudioCursorForScope(runtime, input);
    runtime.autoplayCSharpNativeAudioCursor = {
      sessionId: input.sessionId,
      runId: input.runId,
      runGeneration: input.runGeneration,
      afterSequence: Math.max(currentSequence, latestSequence)
    };
  }

  function copyNativeAudio(audio) {
    if (!isRecord(audio) || audio.available !== true) {
      return { nativeEvents: 0, events: [] };
    }

    const events = Array.isArray(audio.events)
      ? audio.events
        .filter(isRecord)
        .map(event => ({
          sequence: boundedInteger(event.sequence, 0, 0),
          sfxId: boundedInteger(event.sfxId, -1, -1, MAX_WIRE_INT),
          sfxName: stringValue(event.sfxName)
        }))
      : [];
    return {
      nativeEvents: boundedInteger(audio.latestSequence, 0, 0, MAX_WIRE_INT),
      events
    };
  }

  function copyNativePlayer(player) {
    if (!isRecord(player)) {
      return {
        available: false,
        xFixed: 0,
        yFixed: 0,
        angleBam: 0,
        momentumXFixed: 0,
        momentumYFixed: 0,
        sectorIndex: -1,
        health: 0,
        playerState: -1,
        killCount: 0
      };
    }

    requireBoolean(player.available, "native player.available");
    if (!player.available) {
      return {
        available: false,
        xFixed: 0,
        yFixed: 0,
        angleBam: 0,
        momentumXFixed: 0,
        momentumYFixed: 0,
        sectorIndex: -1,
        health: 0,
        playerState: -1,
        killCount: 0
      };
    }

    for (const name of [
      "xFixed",
      "yFixed",
      "momentumXFixed",
      "momentumYFixed",
      "health",
      "playerState"
    ]) {
      requireIntegerRange(player[name], `native player.${name}`, MIN_WIRE_INT, MAX_WIRE_INT);
    }
    requireIntegerRange(player.angleBam, "native player.angleBam", 0, MAX_UINT32);
    requireIntegerRange(player.sectorIndex, "native player.sectorIndex", -1, MAX_WIRE_INT);
    requireIntegerRange(player.killCount, "native player.killCount", 0, MAX_WIRE_INT);

    return {
      available: true,
      xFixed: player.xFixed,
      yFixed: player.yFixed,
      angleBam: player.angleBam,
      momentumXFixed: player.momentumXFixed,
      momentumYFixed: player.momentumYFixed,
      sectorIndex: player.sectorIndex,
      health: player.health,
      playerState: player.playerState,
      killCount: player.killCount
    };
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
    requireSafeInteger(snapshot.runGeneration, "applied action snapshot.runGeneration", 1);
    requireSafeInteger(snapshot.controlTick, "applied action snapshot.controlTick", 1);
    requireSafeInteger(snapshot.useAttemptId, "applied action snapshot.useAttemptId", 0);
    requireNonEmptyString(snapshot.actionMode, "applied action snapshot.actionMode");
    requireNonEmptyString(snapshot.path.selected, "applied action snapshot.path.selected");
    requireBoolean(snapshot.proposed.use, "applied action snapshot.proposed.use");
    requireBoolean(snapshot.applied.use, "applied action snapshot.applied.use");
    requireBoolean(snapshot.use.resolved, "applied action snapshot.use.resolved");
    requireBoolean(snapshot.use.eventQueued, "applied action snapshot.use.eventQueued");
    requireBoolean(snapshot.use.pulseResolverCalled, "applied action snapshot.use.pulseResolverCalled");
    requireBoolean(snapshot.use.blockedByManualInput, "applied action snapshot.use.blockedByManualInput");
    requireBoolean(snapshot.path.senseOnly, "applied action snapshot.path.senseOnly");
    requireWire(
      snapshot.applied.move === "none"
        || snapshot.applied.move === "forward"
        || snapshot.applied.move === "back",
      "applied action snapshot.applied.move is unknown");
    requireBoolean(snapshot.applied.strafe, "applied action snapshot.applied.strafe");
    requireWire(
      snapshot.applied.strafe === false,
      "directionless applied strafe cannot cross the C# acknowledgement contract");
    requireSafeInteger(snapshot.applied.turnYaw, "applied action snapshot.applied.turnYaw", -180);
    requireWire(snapshot.applied.turnYaw <= 180, "applied action snapshot.applied.turnYaw must be <= 180");
    requireBoolean(snapshot.applied.fire, "applied action snapshot.applied.fire");
    requireBoolean(snapshot.applied.run, "applied action snapshot.applied.run");
    requireSafeInteger(
      snapshot.queuedUseInputEventSequence,
      "applied action snapshot.queuedUseInputEventSequence",
      0);
    requireSafeInteger(
      snapshot.pumpedUseInputEventSequence,
      "applied action snapshot.pumpedUseInputEventSequence",
      0);
    requireBoolean(snapshot.usePumped, "applied action snapshot.usePumped");
    requireSafeInteger(
      snapshot.manualUseSequenceAtDecision,
      "applied action snapshot.manualUseSequenceAtDecision",
      0);

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

  function createInput(runtime, wasmState = {}, previousStatus = {}, rawState = {}) {
    try {
      const state = isRecord(wasmState) ? wasmState : {};
      const status = isRecord(previousStatus) ? previousStatus : {};
      const scope = resolveControlScope(runtime);
      const nativeFacts = readNativeFacts(runtime, scope);
      const nativeRun = isRecord(nativeFacts.run) ? nativeFacts.run : {};
      const nativePlayer = copyNativePlayer(nativeFacts.player);
      const nativeRunAvailable = nativeRun.available === true;
      const nativeLevelLoadSequenceAvailable = nativeRunAvailable
        && nativeRun.levelLoadSequenceAvailable === true;
      requireSafeInteger(runtime?.autoplayManualUseSequence, "runtime.autoplayManualUseSequence", 0);
      if (nativeLevelLoadSequenceAvailable) {
        requireSafeInteger(nativeRun.levelLoadSequence, "native levelLoadSequence", 0);
      }
      const wadContentSha256 = runtime?.moduleConfig?.wad?.sha256;
      requireCanonicalSha256(wadContentSha256, "runtime.moduleConfig.wad.sha256");

      return {
        contractVersion: CONTRACT_VERSION,
        wadContentSha256,
        sessionId: scope.sessionId,
        runId: scope.runId,
        runGeneration: scope.runGeneration,
        prediction: Math.max(0, Math.trunc(firstFinite([
          status.predictions,
          state.predictions,
          state.autoplayPredictions,
          runtime?.autoplayPredictions
        ]))),
        resetRequested: scope.resetRequested,
        resetOperationId: scope.resetOperationId,
        lifecycleEvent: scope.lifecycleEvent,
        lifecycleState: scope.lifecycleState,
        modelState: scope.modelState,
        nativeLevelFactsAvailable: nativeRunAvailable,
        nativeGametic: nativeRunAvailable ? boundedInteger(nativeRun.gametic, -1, -1) : -1,
        nativeLevelTime: nativeRunAvailable ? boundedInteger(nativeRun.leveltime, -1, -1) : -1,
        nativeLevelStartTic: nativeRunAvailable ? boundedInteger(nativeRun.levelstarttic, -1, -1) : -1,
        nativeGameState: nativeRunAvailable ? boundedInteger(nativeRun.gamestate, -1, -1, MAX_WIRE_INT) : -1,
        nativeGameEpisode: nativeRunAvailable ? boundedInteger(nativeRun.gameepisode, -1, -1, MAX_WIRE_INT) : -1,
        nativeGameMap: nativeRunAvailable ? boundedInteger(nativeRun.gamemap, -1, -1, MAX_WIRE_INT) : -1,
        nativeLevelLoadSequenceAvailable,
        nativeLevelLoadSequence: nativeLevelLoadSequenceAvailable
          ? nativeRun.levelLoadSequence
          : -1,
        nativePlayerFactsAvailable: nativePlayer.available,
        nativePlayerVitalityFactsAvailable: nativePlayer.available,
        nativePlayerXFixed: nativePlayer.xFixed,
        nativePlayerYFixed: nativePlayer.yFixed,
        nativePlayerAngleBam: nativePlayer.angleBam,
        nativePlayerMomentumXFixed: nativePlayer.momentumXFixed,
        nativePlayerMomentumYFixed: nativePlayer.momentumYFixed,
        nativePlayerSectorIndex: nativePlayer.sectorIndex,
        nativePlayerHealth: nativePlayer.health,
        nativePlayerState: nativePlayer.playerState,
        nativePlayerKillCount: nativePlayer.killCount,
        rawObservation: createRawObservation(runtime, rawState, nativeRun, nativeRunAvailable),
        manualUseSequence: runtime.autoplayManualUseSequence,
        audio: copyNativeAudio(nativeFacts.audio),
        appliedActionAck: copyAppliedActionAck(runtime?.autoplayCSharpAppliedActionSnapshot)
      };
    } catch (error) {
      throw taggedError("Failed to create C# FirstDoor input", error);
    }
  }

  function requireNonEmptyString(value, name) {
    requireWire(typeof value === "string" && value.length > 0, `${name} must be a non-empty string`);
  }

  function requireBoolean(value, name) {
    requireWire(typeof value === "boolean", `${name} must be boolean`);
  }

  function requireSafeInteger(value, name, minimum = Number.MIN_SAFE_INTEGER) {
    requireWire(Number.isSafeInteger(value) && value >= minimum, `${name} must be an integer >= ${minimum}`);
  }

  function requireIntegerRange(value, name, minimum, maximum) {
    requireWire(
      Number.isSafeInteger(value) && value >= minimum && value <= maximum,
      `${name} must be an integer within [${minimum}, ${maximum}]`);
  }

  function requireCanonicalSha256(value, name) {
    requireWire(
      typeof value === "string" && /^[0-9a-f]{64}$/.test(value),
      `${name} must be a canonical lowercase SHA-256`);
  }

  function requireFiniteRange(value, name, minimum, maximum) {
    requireWire(
      Number.isFinite(value) && value >= minimum && value <= maximum,
      `${name} must be finite within [${minimum}, ${maximum}]`);
  }

  function requireFiniteNumber(value, name) {
    requireWire(Number.isFinite(value), `${name} must be finite`);
  }

  function validateAction(action, runRequested) {
    requireWire(isRecord(action), "action must be an object");
    for (const name of [
      "moveForward",
      "moveBackward",
      "strafeLeft",
      "strafeRight",
      "useKey",
      "attackKey"
    ]) {
      requireBoolean(action[name], `action.${name}`);
    }
    requireSafeInteger(action.turnYaw, "action.turnYaw", -180);
    requireWire(action.turnYaw <= 180, "action.turnYaw must be <= 180");
    requireWire(!(action.moveForward && action.moveBackward), "forward/backward actions are contradictory");
    requireWire(!(action.strafeLeft && action.strafeRight), "left/right strafe actions are contradictory");
    requireWire(!(action.useKey && action.attackKey), "Use and Attack cannot be asserted together");
    if (action.useKey) {
      requireWire(
        !action.moveForward
          && !action.moveBackward
          && !action.strafeLeft
          && !action.strafeRight
          && action.turnYaw === 0
          && runRequested === false,
        "Use must be stationary");
    }
  }

  function isNeutralWireAction(action, runRequested) {
    return !action.moveForward
      && !action.moveBackward
      && !action.strafeLeft
      && !action.strafeRight
      && action.turnYaw === 0
      && !action.useKey
      && !action.attackKey
      && runRequested === false;
  }

  function validateSemanticDelta(delta, decision) {
    requireWire(isRecord(delta), "semanticDelta must be an object");
    if (Object.prototype.hasOwnProperty.call(delta, "hasChanges")) {
      requireBoolean(delta.hasChanges, "semanticDelta.hasChanges");
    }
    requireNonEmptyString(delta.sessionId, "semanticDelta.sessionId");
    requireNonEmptyString(delta.runId, "semanticDelta.runId");
    requireSafeInteger(delta.runGeneration, "semanticDelta.runGeneration", 1);
    requireSafeInteger(delta.controlTick, "semanticDelta.controlTick", 1);
    requireSafeInteger(delta.doorOpenedCount, "semanticDelta.doorOpenedCount", 0);
    requireBoolean(delta.firstDoorOpened, "semanticDelta.firstDoorOpened");
    requireBoolean(delta.computerRoomEntered, "semanticDelta.computerRoomEntered");
    requireWire(OPEN_SOURCES.has(delta.source), "semanticDelta.source is unknown");
    requireWire(delta.sessionId === decision.sessionId, "semanticDelta.sessionId does not match decision scope");
    requireWire(delta.runId === decision.runId, "semanticDelta.runId does not match decision scope");
    requireWire(delta.runGeneration === decision.runGeneration, "semanticDelta.runGeneration does not match decision scope");
    requireWire(delta.controlTick === decision.controlTick, "semanticDelta.controlTick does not match decision tick");
    requireWire(delta.firstDoorOpened === decision.openConfirmed, "semanticDelta.firstDoorOpened does not match openConfirmed");
    requireWire(
      delta.computerRoomEntered === decision.completed,
      "semanticDelta.computerRoomEntered does not match completed");
    requireWire(delta.source === decision.openConfirmationSource, "semanticDelta.source does not match openConfirmationSource");
    if (delta.firstDoorOpened) {
      requireWire(delta.doorOpenedCount >= 1, "opened semantic delta requires doorOpenedCount >= 1");
      requireWire(delta.source !== "None", "opened semantic delta requires a trusted source");
    } else {
      requireWire(delta.doorOpenedCount === 0, "closed semantic delta must not claim an opened door count");
      requireWire(delta.source === "None", "closed semantic delta must have source None");
    }
  }

  function validateStateOwnership(decision) {
    const expected = STATE_OWNERSHIP[decision.state];
    requireWire(Boolean(expected), "state has no ownership mapping");
    if (decision.state !== "FailedSafeStop") {
      requireWire(
        decision.ownershipUnit === expected.unit,
        `state ${decision.state} requires ownershipUnit ${expected.unit}`);
    }
    requireWire(
      decision.ownershipDisposition === expected.disposition,
      `state ${decision.state} requires ownershipDisposition ${expected.disposition}`);
    requireWire(
      decision.ownerId === expected.ownerId,
      `state ${decision.state} requires ownerId ${expected.ownerId}`);
  }

  function validateAcceptedEvidence(decision) {
    requireWire(typeof decision.acceptedOpenEvidenceId === "string", "acceptedOpenEvidenceId must be a string");
    requireWire(
      OPEN_SOURCES.has(decision.acceptedOpenEvidenceSource),
      "acceptedOpenEvidenceSource is unknown");
    if (decision.openConfirmed) {
      requireNonEmptyString(decision.acceptedOpenEvidenceId, "acceptedOpenEvidenceId");
      requireWire(decision.openConfirmationSource !== "None", "confirmed open requires a non-None source");
      requireWire(
        decision.acceptedOpenEvidenceSource === decision.openConfirmationSource,
        "acceptedOpenEvidenceSource must match openConfirmationSource");
    } else {
      requireWire(decision.openConfirmationSource === "None", "unconfirmed open must have source None");
      requireWire(decision.acceptedOpenEvidenceId.length === 0, "unconfirmed open cannot retain accepted evidence");
      requireWire(decision.acceptedOpenEvidenceSource === "None", "unconfirmed open evidence source must be None");
    }

    requireBoolean(decision.failedUseEvidenceAccepted, "failedUseEvidenceAccepted");
    requireWire(typeof decision.failedUseAudioEventId === "string", "failedUseAudioEventId must be a string");
    requireWire(
      typeof decision.acceptedFailedUseEvidenceId === "string",
      "acceptedFailedUseEvidenceId must be a string");
    requireWire(
      EVIDENCE_PROVENANCE.has(decision.acceptedFailedUseEvidenceSource),
      "acceptedFailedUseEvidenceSource is unknown");
    if (decision.failedUseEvidenceAccepted) {
      requireNonEmptyString(decision.failedUseAudioEventId, "failedUseAudioEventId");
      requireWire(
        decision.acceptedFailedUseEvidenceId === decision.failedUseAudioEventId,
        "accepted failed-use evidence id must match the audio event id");
      requireWire(
        decision.acceptedFailedUseEvidenceSource === "ClassifiedNativeAudio",
        "accepted failed-use evidence must come from ClassifiedNativeAudio");
    } else {
      requireWire(decision.failedUseAudioEventId.length === 0, "unaccepted failed-use audio id must be empty");
      requireWire(decision.acceptedFailedUseEvidenceId.length === 0, "unaccepted failed-use evidence id must be empty");
      requireWire(decision.acceptedFailedUseEvidenceSource === "None", "unaccepted failed-use source must be None");
    }
    requireNonEmptyString(decision.evidenceObservationCode, "evidenceObservationCode");
  }

  function validateProximity(proximity, name) {
    requireWire(isRecord(proximity), `${name} must be an object`);
    requireWire(proximity.traceVersion === 1, `${name}.traceVersion must be 1`);
    for (const property of [
      "inputAccepted",
      "available",
      "fresh",
      "wadVerified",
      "withinAcquisitionRange",
      "withinContactApproachRange",
      "withinUseRange"
    ]) {
      requireBoolean(proximity[property], `${name}.${property}`);
    }
    requireWire(EVIDENCE_TRUTH.has(proximity.truth), `${name}.truth is unknown`);
    requireNonEmptyString(proximity.reason, `${name}.reason`);
    requireWire(typeof proximity.observationHash === "string", `${name}.observationHash must be a string`);
    requireWire(typeof proximity.wadContentSha256 === "string", `${name}.wadContentSha256 must be a string`);
    if (proximity.observationHash.length > 0) {
      requireCanonicalSha256(proximity.observationHash, `${name}.observationHash`);
    }
    if (proximity.wadContentSha256.length > 0) {
      requireCanonicalSha256(proximity.wadContentSha256, `${name}.wadContentSha256`);
    }
    requireSafeInteger(proximity.nativeGametic, `${name}.nativeGametic`, -1);
    for (const property of ["nativeGameState", "nativeGameEpisode", "nativeGameMap"]) {
      requireIntegerRange(proximity[property], `${name}.${property}`, -1, MAX_WIRE_INT);
    }
    for (const property of [
      "playerXFixed",
      "playerYFixed",
      "playerMomentumXFixed",
      "playerMomentumYFixed"
    ]) {
      requireIntegerRange(proximity[property], `${name}.${property}`, MIN_WIRE_INT, MAX_WIRE_INT);
    }
    requireIntegerRange(proximity.playerAngleBam, `${name}.playerAngleBam`, 0, MAX_UINT32);
    requireIntegerRange(proximity.playerSectorIndex, `${name}.playerSectorIndex`, -1, MAX_WIRE_INT);
    for (const property of [
      "playerX",
      "playerY",
      "playerMomentumX",
      "playerMomentumY",
      "headingDegrees",
      "closestDoorPointX",
      "closestDoorPointY",
      "distanceToDoorSegment",
      "bearingToDoorDegrees",
      "bearingErrorDegrees",
      "acquisitionMaximumDistance",
      "contactApproachMaximumDistance",
      "useMaximumDistance"
    ]) {
      requireFiniteNumber(proximity[property], `${name}.${property}`);
    }

    if (proximity.available) {
      requireWire(proximity.inputAccepted, `${name}.available requires inputAccepted`);
      requireWire(proximity.truth === "Yes", `${name}.available requires truth Yes`);
      requireWire(proximity.wadVerified, `${name}.available requires verified WAD identity`);
      requireWire(
        proximity.wadContentSha256 === CANONICAL_DOOM1_WAD_SHA256,
        `${name}.available requires the canonical DOOM1.WAD SHA-256`);
      requireCanonicalSha256(proximity.observationHash, `${name}.observationHash`);
      requireWire(proximity.nativeGametic >= 0, `${name}.available requires nativeGametic >= 0`);
      requireWire(
        proximity.nativeGameState === 0
          && proximity.nativeGameEpisode === 1
          && proximity.nativeGameMap === 1,
        `${name}.available requires the E1M1 native level scope`);
      requireFiniteRange(proximity.headingDegrees, `${name}.headingDegrees`, 0, 360);
      requireWire(proximity.headingDegrees < 360, `${name}.headingDegrees must be < 360`);
      requireFiniteRange(proximity.bearingToDoorDegrees, `${name}.bearingToDoorDegrees`, 0, 360);
      requireWire(proximity.bearingToDoorDegrees < 360, `${name}.bearingToDoorDegrees must be < 360`);
      requireFiniteRange(proximity.bearingErrorDegrees, `${name}.bearingErrorDegrees`, -180, 180);
      requireWire(proximity.distanceToDoorSegment >= 0, `${name}.distanceToDoorSegment must be >= 0`);
      requireWire(
        proximity.useMaximumDistance > 0
          && proximity.useMaximumDistance < 64
          && proximity.contactApproachMaximumDistance >= proximity.useMaximumDistance
          && proximity.acquisitionMaximumDistance >= proximity.contactApproachMaximumDistance,
        `${name} distance policy is inconsistent`);
      const epsilon = 1e-9;
      requireWire(
        proximity.withinAcquisitionRange
          === (proximity.distanceToDoorSegment <= proximity.acquisitionMaximumDistance + epsilon),
        `${name}.withinAcquisitionRange is inconsistent with distance`);
      requireWire(
        proximity.withinContactApproachRange
          === (proximity.distanceToDoorSegment <= proximity.contactApproachMaximumDistance + epsilon),
        `${name}.withinContactApproachRange is inconsistent with distance`);
      requireWire(
        proximity.withinUseRange
          === (proximity.distanceToDoorSegment <= proximity.useMaximumDistance + epsilon),
        `${name}.withinUseRange is inconsistent with distance`);
    } else {
      requireWire(!proximity.inputAccepted, `${name}.unavailable cannot claim inputAccepted`);
      requireWire(!proximity.fresh, `${name}.unavailable cannot be fresh`);
      requireWire(proximity.truth !== "Yes", `${name}.unavailable cannot claim truth Yes`);
      requireWire(
        !proximity.withinAcquisitionRange
          && !proximity.withinContactApproachRange
          && !proximity.withinUseRange,
        `${name}.unavailable cannot claim a distance range`);
    }
    if (proximity.fresh) {
      requireWire(proximity.inputAccepted && proximity.available, `${name}.fresh requires accepted available input`);
    }
    if (proximity.wadVerified) {
      requireWire(
        proximity.wadContentSha256 === CANONICAL_DOOM1_WAD_SHA256,
        `${name}.wadVerified requires the canonical DOOM1.WAD SHA-256`);
    }
  }

  function validateVitalityTrace(trace, decision) {
    requireWire(isRecord(trace), "vitalityTrace must be an object");
    requireWire(trace.traceVersion === 1, "vitalityTrace.traceVersion must be 1");
    requireNonEmptyString(trace.sessionId, "vitalityTrace.sessionId");
    requireNonEmptyString(trace.runId, "vitalityTrace.runId");
    requireSafeInteger(trace.runGeneration, "vitalityTrace.runGeneration", 1);
    requireSafeInteger(trace.evaluatedAtControlTick, "vitalityTrace.evaluatedAtControlTick", 1);
    requireWire(trace.sessionId === decision.sessionId, "vitalityTrace.sessionId does not match decision");
    requireWire(trace.runId === decision.runId, "vitalityTrace.runId does not match decision");
    requireWire(trace.runGeneration === decision.runGeneration, "vitalityTrace.runGeneration does not match decision");
    requireWire(trace.evaluatedAtControlTick === decision.controlTick, "vitalityTrace tick does not match decision");
    for (const name of [
      "available",
      "fresh",
      "deathCandidate",
      "nativeDeathConfirmed",
      "nativeEvidenceAuthoritative",
      "restartRequested",
      "restartRequestIssuedThisTick"
    ]) {
      requireBoolean(trace[name], `vitalityTrace.${name}`);
    }
    for (const name of [
      "observationReason",
      "provenance",
      "deathCandidateReason",
      "authority",
      "restartReason"
    ]) {
      requireNonEmptyString(trace[name], `vitalityTrace.${name}`);
    }
    requireWire(typeof trace.proximityObservationHash === "string", "vitalityTrace.proximityObservationHash must be a string");
    requireWire(typeof trace.vitalityObservationHash === "string", "vitalityTrace.vitalityObservationHash must be a string");
    requireWire(typeof trace.restartRequestId === "string", "vitalityTrace.restartRequestId must be a string");
    if (trace.proximityObservationHash.length > 0) {
      requireCanonicalSha256(trace.proximityObservationHash, "vitalityTrace.proximityObservationHash");
    }
    if (trace.vitalityObservationHash.length > 0) {
      requireCanonicalSha256(trace.vitalityObservationHash, "vitalityTrace.vitalityObservationHash");
    }
    requireSafeInteger(trace.nativeGametic, "vitalityTrace.nativeGametic", -1);
    requireIntegerRange(trace.playerHealth, "vitalityTrace.playerHealth", MIN_WIRE_INT, MAX_WIRE_INT);
    requireIntegerRange(trace.playerState, "vitalityTrace.playerState", -1, MAX_WIRE_INT);
    requireIntegerRange(trace.playerKillCount, "vitalityTrace.playerKillCount", -1, MAX_WIRE_INT);
    requireSafeInteger(trace.consecutiveDeathGametics, "vitalityTrace.consecutiveDeathGametics", 0);
    requireWire(trace.requiredDeathGametics === 3, "vitalityTrace.requiredDeathGametics must be 3");
    requireSafeInteger(trace.confirmedAtNativeGametic, "vitalityTrace.confirmedAtNativeGametic", -1);
    requireSafeInteger(trace.confirmedAtControlTick, "vitalityTrace.confirmedAtControlTick", 0);
    requireSafeInteger(trace.restartRequestSequence, "vitalityTrace.restartRequestSequence", 0);

    requireWire(!trace.fresh || trace.available, "fresh vitalityTrace requires available native facts");
    requireWire(!trace.deathCandidate || trace.available, "death candidate requires available native facts");
    if (trace.available) {
      requireWire(trace.nativeGametic >= 0, "available vitalityTrace requires nativeGametic >= 0");
      requireWire(trace.playerState >= 0, "available vitalityTrace requires playerState >= 0");
      requireWire(trace.playerKillCount >= 0, "available vitalityTrace requires playerKillCount >= 0");
      requireCanonicalSha256(trace.proximityObservationHash, "vitalityTrace.proximityObservationHash");
      requireCanonicalSha256(trace.vitalityObservationHash, "vitalityTrace.vitalityObservationHash");
    } else {
      requireWire(!trace.fresh, "unavailable vitalityTrace cannot be fresh");
      requireWire(trace.nativeGametic === -1, "unavailable vitalityTrace must use nativeGametic -1");
      requireWire(
        trace.playerHealth === -1 && trace.playerState === -1 && trace.playerKillCount === -1,
        "unavailable vitalityTrace must use player fact sentinels");
      requireWire(
        trace.proximityObservationHash.length === 0 && trace.vitalityObservationHash.length === 0,
        "unavailable vitalityTrace cannot carry observation hashes");
    }

    if (trace.nativeDeathConfirmed) {
      requireWire(trace.consecutiveDeathGametics >= 3, "confirmed native death requires three death gametics");
      requireWire(trace.confirmedAtNativeGametic >= 0, "confirmed native death requires a native gametic");
      requireWire(trace.confirmedAtControlTick >= 1, "confirmed native death requires a control tick");
      requireWire(trace.nativeEvidenceAuthoritative, "confirmed native death must be authoritative");
      requireWire(trace.authority === "native-player-vitality", "confirmed native death authority is invalid");
      requireWire(trace.restartRequested, "confirmed native death must request restart");
      requireWire(trace.restartRequestSequence === 1, "confirmed native death restart sequence must be 1");
      requireNonEmptyString(trace.restartRequestId, "vitalityTrace.restartRequestId");
      requireWire(trace.restartReason === "native-player-death-confirmed", "native restart reason is invalid");
    } else {
      requireWire(!trace.nativeEvidenceAuthoritative, "unconfirmed native death cannot be authoritative");
      requireWire(trace.authority === "none", "unconfirmed native death authority must be none");
      requireWire(!trace.restartRequested, "unconfirmed native death cannot request restart");
      requireWire(!trace.restartRequestIssuedThisTick, "unconfirmed native death cannot issue restart");
      requireWire(trace.restartRequestSequence === 0, "unconfirmed native death restart sequence must be 0");
      requireWire(trace.restartRequestId.length === 0, "unconfirmed native death restart id must be empty");
      requireWire(trace.restartReason === "none", "unconfirmed native death restart reason must be none");
    }
    requireWire(
      !trace.restartRequestIssuedThisTick || trace.restartRequested,
      "issued restart requires an active restart request");
    requireWire(decision.nativeDeathConfirmed === trace.nativeDeathConfirmed, "nativeDeathConfirmed does not match vitalityTrace");
    requireWire(decision.restartRequested === trace.restartRequested, "restartRequested does not match vitalityTrace");
    requireWire(decision.restartRequestId === trace.restartRequestId, "restartRequestId does not match vitalityTrace");
    requireWire(decision.restartReason === trace.restartReason, "restartReason does not match vitalityTrace");
  }

  function normalizeWireSfxName(value) {
    const normalized = value.trim().toLowerCase();
    return normalized.startsWith("sfx_") ? normalized.slice(4) : normalized;
  }

  function validateAudioCatalogObservation(observation, index, trace, decision) {
    const name = `audioCatalogTrace.events[${index}]`;
    requireWire(isRecord(observation), `${name} must be an object`);
    requireWire(
      observation.catalogVersion === AUDIO_CATALOG_VERSION,
      `${name}.catalogVersion is unsupported`);
    requireWire(
      observation.sourceRevision === AUDIO_CATALOG_SOURCE_REVISION,
      `${name}.sourceRevision is unsupported`);
    requireCanonicalSha256(observation.catalogIdentityHash, `${name}.catalogIdentityHash`);
    requireWire(
      observation.catalogIdentityHash === trace.catalogIdentityHash,
      `${name}.catalogIdentityHash does not match trace`);
    requireNonEmptyString(observation.sessionId, `${name}.sessionId`);
    requireNonEmptyString(observation.runId, `${name}.runId`);
    requireSafeInteger(observation.runGeneration, `${name}.runGeneration`, 1);
    requireSafeInteger(observation.observedAtControlTick, `${name}.observedAtControlTick`, 1);
    requireWire(observation.sessionId === decision.sessionId, `${name}.sessionId does not match decision`);
    requireWire(observation.runId === decision.runId, `${name}.runId does not match decision`);
    requireWire(
      observation.runGeneration === decision.runGeneration,
      `${name}.runGeneration does not match decision`);
    requireWire(
      observation.observedAtControlTick === decision.controlTick,
      `${name}.observedAtControlTick does not match decision`);
    requireSafeInteger(observation.sequence, `${name}.sequence`, 1);
    requireIntegerRange(observation.sfxId, `${name}.sfxId`, -1, MAX_WIRE_INT);
    for (const property of ["rawSfxName", "normalizedSfxName", "expectedSfxName"]) {
      requireWire(
        typeof observation[property] === "string",
        `${name}.${property} must be a string`);
    }
    requireBoolean(observation.catalogued, `${name}.catalogued`);
    requireNonEmptyString(observation.meaningCode, `${name}.meaningCode`);
    requireNonEmptyString(observation.meaningLabel, `${name}.meaningLabel`);
    requireWire(
      AUDIO_CATALOG_CLASSIFICATION_REASONS.has(observation.classificationReason),
      `${name}.classificationReason is unknown`);
    requireCanonicalSha256(observation.eventIdentityHash, `${name}.eventIdentityHash`);
    requireWire(observation.diagnosticOnly === true, `${name}.diagnosticOnly must be true`);

    const normalizedRawName = normalizeWireSfxName(observation.rawSfxName);
    requireWire(
      observation.normalizedSfxName === normalizedRawName,
      `${name}.normalizedSfxName is not the canonical raw name`);
    const exactPair = observation.classificationReason === "exact-id-name-pair";
    requireWire(
      observation.catalogued === exactPair,
      `${name}.catalogued does not match classificationReason`);
    const idInCatalog = observation.sfxId >= 0 && observation.sfxId <= MAX_NATIVE_SFX_ID;
    const rawNameEmpty = observation.rawSfxName.trim().length === 0;

    if (exactPair) {
      requireWire(idInCatalog, `${name} exact pair requires a catalog SFX id`);
      requireWire(!rawNameEmpty, `${name} exact pair requires a raw SFX name`);
      requireNonEmptyString(observation.expectedSfxName, `${name}.expectedSfxName`);
      requireWire(
        observation.normalizedSfxName === observation.expectedSfxName,
        `${name} exact pair requires the expected normalized SFX name`);
      requireWire(
        observation.meaningCode !== UNKNOWN_SFX_MEANING_CODE,
        `${name} catalogued pair cannot use the unknown meaning code`);
      requireWire(
        observation.meaningLabel !== UNKNOWN_SFX_MEANING_LABEL,
        `${name} catalogued pair cannot use the unknown meaning label`);
      return;
    }

    requireWire(
      observation.meaningCode === UNKNOWN_SFX_MEANING_CODE,
      `${name} unknown pair must use the unknown meaning code`);
    requireWire(
      observation.meaningLabel === UNKNOWN_SFX_MEANING_LABEL,
      `${name} unknown pair must use the unknown meaning label`);
    if (observation.classificationReason === "empty-sfx-name") {
      requireWire(rawNameEmpty, `${name} empty-name classification requires an empty raw name`);
      requireWire(
        observation.normalizedSfxName.length === 0,
        `${name} empty-name classification requires an empty normalized name`);
      return;
    }
    if (observation.classificationReason === "sfx-id-out-of-range") {
      requireWire(!rawNameEmpty, `${name} out-of-range classification requires a raw name`);
      requireWire(!idInCatalog, `${name} out-of-range classification requires an out-of-range id`);
      requireWire(
        observation.expectedSfxName.length === 0,
        `${name} out-of-range classification cannot claim an expected name`);
      return;
    }

    requireWire(!rawNameEmpty, `${name} id/name mismatch requires a raw name`);
    requireWire(idInCatalog, `${name} id/name mismatch requires a catalog SFX id`);
    requireNonEmptyString(observation.expectedSfxName, `${name}.expectedSfxName`);
    requireWire(
      observation.normalizedSfxName !== observation.expectedSfxName,
      `${name} id/name mismatch cannot contain an exact normalized pair`);
  }

  function validateAudioCatalogTrace(trace, decision) {
    requireWire(isRecord(trace), "audioCatalogTrace must be an object");
    requireWire(
      trace.traceVersion === AUDIO_CATALOG_TRACE_VERSION,
      `audioCatalogTrace.traceVersion must be ${AUDIO_CATALOG_TRACE_VERSION}`);
    requireWire(
      trace.catalogVersion === AUDIO_CATALOG_VERSION,
      "audioCatalogTrace.catalogVersion is unsupported");
    requireWire(
      trace.sourceRevision === AUDIO_CATALOG_SOURCE_REVISION,
      "audioCatalogTrace.sourceRevision is unsupported");
    requireCanonicalSha256(trace.catalogIdentityHash, "audioCatalogTrace.catalogIdentityHash");
    requireWire(
      trace.catalogIdentityHash === AUDIO_CATALOG_IDENTITY_HASH,
      "audioCatalogTrace.catalogIdentityHash is unsupported");
    requireNonEmptyString(trace.sessionId, "audioCatalogTrace.sessionId");
    requireNonEmptyString(trace.runId, "audioCatalogTrace.runId");
    requireSafeInteger(trace.runGeneration, "audioCatalogTrace.runGeneration", 1);
    requireSafeInteger(trace.evaluatedAtControlTick, "audioCatalogTrace.evaluatedAtControlTick", 1);
    requireWire(trace.sessionId === decision.sessionId, "audioCatalogTrace.sessionId does not match decision");
    requireWire(trace.runId === decision.runId, "audioCatalogTrace.runId does not match decision");
    requireWire(
      trace.runGeneration === decision.runGeneration,
      "audioCatalogTrace.runGeneration does not match decision");
    requireWire(
      trace.evaluatedAtControlTick === decision.controlTick,
      "audioCatalogTrace tick does not match decision");
    requireSafeInteger(trace.latestObservedSequence, "audioCatalogTrace.latestObservedSequence", 0);
    requireWire(
      trace.capacity === AUDIO_CATALOG_TRACE_CAPACITY,
      `audioCatalogTrace.capacity must be ${AUDIO_CATALOG_TRACE_CAPACITY}`);
    requireIntegerRange(
      trace.totalNewEventCount,
      "audioCatalogTrace.totalNewEventCount",
      0,
      MAX_NATIVE_AUDIO_EVENTS_PER_PACKET);
    requireIntegerRange(
      trace.retainedEventCount,
      "audioCatalogTrace.retainedEventCount",
      0,
      AUDIO_CATALOG_TRACE_CAPACITY);
    requireIntegerRange(
      trace.unknownEventCount,
      "audioCatalogTrace.unknownEventCount",
      0,
      MAX_NATIVE_AUDIO_EVENTS_PER_PACKET);
    requireBoolean(trace.truncated, "audioCatalogTrace.truncated");
    requireWire(trace.diagnosticOnly === true, "audioCatalogTrace.diagnosticOnly must be true");
    requireWire(Array.isArray(trace.events), "audioCatalogTrace.events must be an array");
    requireWire(
      trace.retainedEventCount === trace.events.length,
      "audioCatalogTrace.retainedEventCount does not match events length");
    requireWire(
      trace.retainedEventCount === Math.min(trace.totalNewEventCount, AUDIO_CATALOG_TRACE_CAPACITY),
      "audioCatalogTrace retained count is inconsistent with total count");
    requireWire(
      trace.truncated === (trace.totalNewEventCount > AUDIO_CATALOG_TRACE_CAPACITY),
      "audioCatalogTrace.truncated is inconsistent with total count");
    requireWire(
      trace.unknownEventCount <= trace.totalNewEventCount,
      "audioCatalogTrace.unknownEventCount exceeds total count");

    let previousSequence = 0;
    let retainedUnknownCount = 0;
    for (let index = 0; index < trace.events.length; index += 1) {
      const observation = trace.events[index];
      validateAudioCatalogObservation(observation, index, trace, decision);
      requireWire(
        observation.sequence > previousSequence,
        `audioCatalogTrace.events[${index}].sequence must be strictly increasing`);
      requireWire(
        observation.sequence <= trace.latestObservedSequence,
        `audioCatalogTrace.events[${index}].sequence exceeds latestObservedSequence`);
      previousSequence = observation.sequence;
      if (!observation.catalogued) {
        retainedUnknownCount += 1;
      }
    }

    if (trace.totalNewEventCount > 0) {
      requireWire(
        previousSequence === trace.latestObservedSequence,
        "audioCatalogTrace latest retained sequence does not match latestObservedSequence");
    }
    const omittedCount = trace.totalNewEventCount - trace.retainedEventCount;
    requireWire(
      trace.unknownEventCount >= retainedUnknownCount,
      "audioCatalogTrace.unknownEventCount omits a retained unknown event");
    requireWire(
      trace.unknownEventCount <= retainedUnknownCount + omittedCount,
      "audioCatalogTrace.unknownEventCount cannot be produced by retained and omitted events");
  }

  function validateOpeningNavigation(snapshot, name) {
    requireWire(isRecord(snapshot), `${name} must be an object`);
    requireWire(snapshot.snapshotVersion === 1, `${name}.snapshotVersion must be 1`);
    requireWire(
      snapshot.geometryVersion === OPENING_NAVIGATION_GEOMETRY_VERSION,
      `${name}.geometryVersion is unsupported`);
    requireWire(
      snapshot.policyVersion === OPENING_NAVIGATION_POLICY_VERSION,
      `${name}.policyVersion is unsupported`);
    requireCanonicalSha256(snapshot.geometryHash, `${name}.geometryHash`);
    requireWire(typeof snapshot.wadContentSha256 === "string", `${name}.wadContentSha256 must be a string`);
    if (snapshot.wadContentSha256.length > 0) {
      requireCanonicalSha256(snapshot.wadContentSha256, `${name}.wadContentSha256`);
    }
    requireWire(OPENING_NAVIGATION_STATUSES.has(snapshot.status), `${name}.status is unknown`);
    requireWire(OPENING_NAVIGATION_BLOCK_CODES.has(snapshot.blockCode), `${name}.blockCode is unknown`);
    for (const property of [
      "active",
      "portalEvidenceSatisfied",
      "portal150EvidenceSatisfied",
      "stationary",
      "doorSightlineCertified",
      "stationaryBearingAligned",
      "readyForAcquisition",
      "returningToCertifiedWaypoint"
    ]) {
      requireBoolean(snapshot[property], `${name}.${property}`);
    }
    requireSafeInteger(snapshot.legIndex, `${name}.legIndex`, 0);
    requireNonEmptyString(snapshot.legId, `${name}.legId`);
    requireWire(Array.isArray(snapshot.allowedSectors), `${name}.allowedSectors must be an array`);
    for (let index = 0; index < snapshot.allowedSectors.length; index += 1) {
      requireIntegerRange(
        snapshot.allowedSectors[index],
        `${name}.allowedSectors[${index}]`,
        0,
        MAX_WIRE_INT);
    }
    requireSafeInteger(snapshot.nativeGametic, `${name}.nativeGametic`, -1);
    requireIntegerRange(snapshot.playerSectorIndex, `${name}.playerSectorIndex`, -1, MAX_WIRE_INT);
    for (const property of [
      "routeFrames",
      "routeTimeoutFrames",
      "routeRemainingFrames",
      "legFrames",
      "legTimeoutFrames",
      "legRemainingFrames",
      "poseMissingFrames",
      "maximumPoseMissingFrames",
      "forwardProgressSamples",
      "requiredProgressSamples",
      "recoveryCount",
      "maximumRecoveries",
      "realignAttemptsForLeg",
      "forcedStopFrames",
      "forcedStopFramesRemaining",
      "sightlineFrames",
      "sightlineTimeoutFrames"
    ]) {
      requireSafeInteger(snapshot[property], `${name}.${property}`, 0);
    }
    for (const property of [
      "legStartX",
      "legStartY",
      "targetX",
      "targetY",
      "playerRadius",
      "barrelRadius",
      "portalInset",
      "waypointCompletionRadius",
      "maximumCrossTrackDistance",
      "alignmentToleranceDegrees",
      "playerX",
      "playerY",
      "targetDistance",
      "doorDistanceToSegment",
      "alongTrackDistance",
      "crossTrackDistance",
      "portal149SignedSide",
      "portal150IntersectionY",
      "playerMomentumX",
      "playerMomentumY",
      "stationaryMomentumMaximum",
      "progressWindowStartDistance",
      "minimumProgressDistance"
    ]) {
      requireFiniteNumber(snapshot[property], `${name}.${property}`);
    }
    requireSafeInteger(snapshot.defaultTurnYaw, `${name}.defaultTurnYaw`, 1);
    requireSafeInteger(snapshot.maximumTurnYaw, `${name}.maximumTurnYaw`, 1);
    requireIntegerRange(snapshot.recoveryWaypointIndex, `${name}.recoveryWaypointIndex`, -1, MAX_WIRE_INT);
    requireIntegerRange(snapshot.resumeLegIndex, `${name}.resumeLegIndex`, -1, MAX_WIRE_INT);
    requireSafeInteger(
      snapshot.sightlineStartedAtControlTick,
      `${name}.sightlineStartedAtControlTick`,
      -1);
    requireWire(
      snapshot.defaultTurnYaw <= snapshot.maximumTurnYaw,
      `${name} turn-yaw policy is inconsistent`);
    requireWire(
      snapshot.realignAttemptsForLeg <= 1,
      `${name}.realignAttemptsForLeg exceeds the bounded reaim policy`);
    requireWire(
      snapshot.forcedStopFramesRemaining <= snapshot.forcedStopFrames,
      `${name}.forcedStopFramesRemaining exceeds the stop policy`);
    requireWire(
      snapshot.returningToCertifiedWaypoint
        ? snapshot.recoveryWaypointIndex >= 0 && snapshot.resumeLegIndex > 0
        : snapshot.recoveryWaypointIndex === -1 && snapshot.resumeLegIndex === -1,
      `${name} recovery indices do not match recovery state`);
    requireWire(
      snapshot.sightlineStartedAtControlTick >= 0
        ? snapshot.sightlineFrames >= 1
        : snapshot.sightlineFrames === 0 && !snapshot.doorSightlineCertified,
      `${name} sightline clock is inconsistent`);
    requireFiniteRange(snapshot.headingDegrees, `${name}.headingDegrees`, 0, 360);
    requireWire(snapshot.headingDegrees < 360, `${name}.headingDegrees must be < 360`);
    requireFiniteRange(snapshot.targetBearingDegrees, `${name}.targetBearingDegrees`, 0, 360);
    requireWire(snapshot.targetBearingDegrees < 360, `${name}.targetBearingDegrees must be < 360`);
    requireFiniteRange(snapshot.bearingErrorDegrees, `${name}.bearingErrorDegrees`, -180, 180);
    requireFiniteRange(snapshot.doorBearingDegrees, `${name}.doorBearingDegrees`, 0, 360);
    requireWire(snapshot.doorBearingDegrees < 360, `${name}.doorBearingDegrees must be < 360`);
    requireFiniteRange(snapshot.doorBearingErrorDegrees, `${name}.doorBearingErrorDegrees`, -180, 180);
    validateAction(snapshot.action, false);
    requireWire(typeof snapshot.failureCode === "string", `${name}.failureCode must be a string`);
    requireCanonicalSha256(snapshot.observationHash, `${name}.observationHash`);
    requireWire(
      snapshot.readyForAcquisition === (snapshot.status === "ReadyForAcquisition"),
      `${name}.readyForAcquisition does not match status`);
    if (snapshot.readyForAcquisition) {
      requireWire(
        snapshot.active
          && snapshot.doorSightlineCertified
          && snapshot.stationary
          && snapshot.stationaryBearingAligned
          && snapshot.portal150EvidenceSatisfied
          && snapshot.sightlineStartedAtControlTick >= 0
          && isNeutralWireAction(snapshot.action, false),
        `${name}.ReadyForAcquisition requires current stationary certified topology`);
    }
    if (snapshot.active) {
      if (snapshot.status !== "Failed") {
        requireWire(
          snapshot.wadContentSha256 === CANONICAL_DOOM1_WAD_SHA256,
          `${name}.active non-failed navigation requires the canonical DOOM1.WAD SHA-256`);
      }
      if (snapshot.status === "WaitingForPose") {
        requireWire(
          isNeutralWireAction(snapshot.action, false) && !snapshot.readyForAcquisition,
          `${name}.WaitingForPose must remain neutral and not ready`);
      } else if (snapshot.status !== "Failed") {
        requireWire(snapshot.nativeGametic >= 0, `${name}.active navigation requires nativeGametic >= 0`);
      }
      if (snapshot.nativeGametic < 0) {
        requireWire(
          snapshot.status === "WaitingForPose" || snapshot.status === "Failed",
          `${name}.nativeGametic -1 is limited to pose abstention or failure`);
        requireWire(
          isNeutralWireAction(snapshot.action, false),
          `${name}.missing-pose snapshot must remain neutral`);
      }
    }
  }

  function requireFreshUseProximity(proximity, name) {
    requireWire(
      proximity.inputAccepted
        && proximity.available
        && proximity.fresh
        && proximity.wadVerified
        && proximity.withinUseRange,
      `${name} requires fresh C# native use-range proof`);
  }

  function validateAcceptedUseAck(ack, name, scope) {
    requireWire(isRecord(ack), `${name} must be an object`);
    requireWire(ack.snapshotVersion === 1, `${name}.snapshotVersion must be 1`);
    requireBoolean(ack.available, `${name}.available`);
    for (const property of ["sessionId", "runId", "actionMode", "hostPath"]) {
      requireWire(typeof ack[property] === "string", `${name}.${property} must be a string`);
    }
    for (const property of [
      "runGeneration",
      "acceptedAtControlTick",
      "decisionControlTick",
      "useAttemptId",
      "queuedUseInputEventSequence",
      "pumpedUseInputEventSequence",
      "manualUseSequenceAtDecision"
    ]) {
      requireSafeInteger(ack[property], `${name}.${property}`, 0);
    }
    requireBoolean(ack.usePumped, `${name}.usePumped`);

    if (ack.available) {
      requireNonEmptyString(ack.sessionId, `${name}.sessionId`);
      requireNonEmptyString(ack.runId, `${name}.runId`);
      requireWire(ack.runGeneration > 0, `${name}.runGeneration must be > 0`);
      requireWire(ack.acceptedAtControlTick > 0, `${name}.acceptedAtControlTick must be > 0`);
      requireWire(ack.decisionControlTick > 0, `${name}.decisionControlTick must be > 0`);
      requireWire(ack.useAttemptId > 0, `${name}.useAttemptId must be > 0`);
      requireWire(ack.actionMode === "csharp-exact", `${name}.actionMode must be csharp-exact`);
      requireWire(
        ack.hostPath === "native-action" || ack.hostPath === "key-events",
        `${name}.hostPath must identify an exact Use host path`);
      requireWire(
        ack.queuedUseInputEventSequence > 0
          && ack.pumpedUseInputEventSequence === ack.queuedUseInputEventSequence
          && ack.usePumped,
        `${name} must retain exact queued/pumped Use replay proof`);
      requireWire(
        ack.acceptedAtControlTick > ack.decisionControlTick,
        `${name}.acceptedAtControlTick must follow decisionControlTick`);
      if (isRecord(scope)) {
        requireWire(ack.sessionId === scope.sessionId, `${name}.sessionId does not match replay scope`);
        requireWire(ack.runId === scope.runId, `${name}.runId does not match replay scope`);
        requireWire(ack.runGeneration === scope.runGeneration, `${name}.runGeneration does not match replay scope`);
        requireWire(
          ack.acceptedAtControlTick <= scope.controlTick,
          `${name}.acceptedAtControlTick exceeds replay controlTick`);
      }
    } else {
      requireWire(
        ack.sessionId.length === 0
          && ack.runId.length === 0
          && ack.runGeneration === 0
          && ack.acceptedAtControlTick === 0
          && ack.decisionControlTick === 0
          && ack.useAttemptId === 0
          && ack.actionMode.length === 0
          && ack.hostPath.length === 0
          && ack.queuedUseInputEventSequence === 0
          && ack.pumpedUseInputEventSequence === 0
          && !ack.usePumped
          && ack.manualUseSequenceAtDecision === 0,
        `${name}.unavailable snapshot must be cleared`);
    }
  }

  function validateTransitionReplaySnapshots(decision) {
    const snapshots = decision.transitionReplaySnapshots;
    requireWire(Array.isArray(snapshots), "transitionReplaySnapshots must be an array");
    requireWire(snapshots.length <= 64, "transitionReplaySnapshots exceeds replay capacity");
    let previousControlTick = 0;
    for (let index = 0; index < snapshots.length; index += 1) {
      const snapshot = snapshots[index];
      const name = `transitionReplaySnapshots[${index}]`;
      requireWire(isRecord(snapshot), `${name} must be an object`);
      requireWire(snapshot.snapshotVersion === 4, `${name}.snapshotVersion must be 4`);
      requireNonEmptyString(snapshot.sessionId, `${name}.sessionId`);
      requireNonEmptyString(snapshot.runId, `${name}.runId`);
      requireSafeInteger(snapshot.runGeneration, `${name}.runGeneration`, 1);
      requireSafeInteger(snapshot.controlTick, `${name}.controlTick`, 1);
      requireWire(snapshot.sessionId === decision.sessionId, `${name}.sessionId does not match decision scope`);
      requireWire(snapshot.runId === decision.runId, `${name}.runId does not match decision scope`);
      requireWire(snapshot.runGeneration === decision.runGeneration, `${name}.runGeneration does not match decision scope`);
      requireWire(snapshot.controlTick <= decision.controlTick, `${name}.controlTick exceeds decision controlTick`);
      requireWire(snapshot.controlTick > previousControlTick, `${name}.controlTick must increase strictly`);
      previousControlTick = snapshot.controlTick;
      requireNonEmptyString(snapshot.eventKind, `${name}.eventKind`);
      requireWire(CONTROL_STATES.has(snapshot.previousState), `${name}.previousState is unknown`);
      requireWire(CONTROL_STATES.has(snapshot.state), `${name}.state is unknown`);
      requireNonEmptyString(snapshot.reasonCode, `${name}.reasonCode`);
      requireBoolean(snapshot.runRequested, `${name}.runRequested`);
      validateAction(snapshot.action, snapshot.runRequested);
      requireWire(OWNERSHIP_UNITS.has(snapshot.ownershipUnit), `${name}.ownershipUnit is unknown`);
      requireWire(
        OWNERSHIP_DISPOSITIONS.has(snapshot.ownershipDisposition),
        `${name}.ownershipDisposition is unknown`);
      requireNonEmptyString(snapshot.ownerId, `${name}.ownerId`);
      requireWire(snapshot.ownerId.startsWith("first-door."), `${name}.ownerId must be owned by FirstDoor`);
      const expectedOwnership = STATE_OWNERSHIP[snapshot.state];
      requireWire(Boolean(expectedOwnership), `${name}.state has no ownership mapping`);
      if (snapshot.state !== "FailedSafeStop") {
        requireWire(
          snapshot.ownershipUnit === expectedOwnership.unit,
          `${name}.ownershipUnit does not match state`);
      }
      requireWire(
        snapshot.ownershipDisposition === expectedOwnership.disposition,
        `${name}.ownershipDisposition does not match state`);
      requireWire(snapshot.ownerId === expectedOwnership.ownerId, `${name}.ownerId does not match state`);
      if (snapshot.runRequested) {
        requireWire(
          (snapshot.state === "Approach" || snapshot.state === "PostOpenShove")
            && snapshot.action.moveForward,
          `${name}.runRequested requires a forward approach or post-open shove`);
      }
      if (snapshot.ownershipDisposition === "NotAcquired"
          || snapshot.ownershipDisposition === "HandOff"
          || snapshot.ownershipDisposition === "Completed"
          || snapshot.ownershipDisposition === "FailedSafeStop") {
        requireWire(
          isNeutralWireAction(snapshot.action, snapshot.runRequested),
          `${name} non-exclusive/released/failed replay action must be neutral`);
      }
      requireWire(EVIDENCE_TRUTH.has(snapshot.doorIdentityTruth), `${name}.doorIdentityTruth is unknown`);
      requireNonEmptyString(snapshot.computerRoomBlockCode, `${name}.computerRoomBlockCode`);
      requireSafeInteger(snapshot.computerRoomStableFrames, `${name}.computerRoomStableFrames`, 0);
      requireWire(typeof snapshot.observationHash === "string", `${name}.observationHash must be a string`);
      requireWire(typeof snapshot.visualContentHash === "string", `${name}.visualContentHash must be a string`);
      if (snapshot.observationHash.length > 0) {
        requireCanonicalSha256(snapshot.observationHash, `${name}.observationHash`);
      }
      if (snapshot.visualContentHash.length > 0) {
        requireCanonicalSha256(snapshot.visualContentHash, `${name}.visualContentHash`);
      }
      requireWire(isRecord(snapshot.replayObservation), `${name}.replayObservation must be an object`);
      validateProximity(snapshot.proximity, `${name}.proximity`);
      validateOpeningNavigation(snapshot.openingNavigation, `${name}.openingNavigation`);
      validateAcceptedUseAck(snapshot.acceptedUseAck, `${name}.acceptedUseAck`, snapshot);
      if (snapshot.eventKind.includes("stationary-use-command")) {
        requireFreshUseProximity(snapshot.proximity, `${name}.proximity`);
      }
      if (snapshot.eventKind.includes("applied-use-ack-accepted")) {
        requireWire(snapshot.acceptedUseAck.available, `${name} accepted ACK event requires replay proof`);
      }
    }
  }

  function validateReplayFields(decision) {
    validateProximity(decision.proximity, "proximity");
    validateOpeningNavigation(decision.openingNavigation, "openingNavigation");
    validateAcceptedUseAck(decision.acceptedUseAck, "acceptedUseAck", decision);
    validateTransitionReplaySnapshots(decision);
    if (decision.action.useKey) {
      requireFreshUseProximity(decision.proximity, "proximity");
    }
    requireBoolean(decision.appliedActionAckValid, "appliedActionAckValid");
    requireNonEmptyString(decision.appliedActionAckCode, "appliedActionAckCode");
    if (decision.appliedActionAckValid) {
      requireWire(decision.appliedActionAckCode === "accepted", "valid applied-action acknowledgement must be accepted");
      requireWire(decision.acceptedUseAck.available, "valid applied-action acknowledgement requires acceptedUseAck replay proof");
      requireWire(
        decision.acceptedUseAck.acceptedAtControlTick === decision.controlTick,
        "acceptedUseAck must identify the current acknowledgement tick");
    }
    requireBoolean(decision.useAckWindowActive, "useAckWindowActive");
    requireSafeInteger(
      decision.acknowledgedUseDecisionControlTick,
      "acknowledgedUseDecisionControlTick",
      0);
    requireSafeInteger(decision.acknowledgedUseAttemptId, "acknowledgedUseAttemptId", 0);
    requireSafeInteger(decision.acknowledgedManualUseSequence, "acknowledgedManualUseSequence", 0);
    requireWire(typeof decision.useOutcomeRejectionCode === "string", "useOutcomeRejectionCode must be a string");
    if (decision.useAckWindowActive) {
      requireWire(
        decision.acknowledgedUseDecisionControlTick > 0 && decision.acknowledgedUseAttemptId > 0,
        "active Use acknowledgement window requires replay ids");
      requireWire(decision.acceptedUseAck.available, "active Use acknowledgement window requires acceptedUseAck replay proof");
      requireWire(
        decision.acceptedUseAck.decisionControlTick === decision.acknowledgedUseDecisionControlTick
          && decision.acceptedUseAck.useAttemptId === decision.acknowledgedUseAttemptId
          && decision.acceptedUseAck.manualUseSequenceAtDecision === decision.acknowledgedManualUseSequence,
        "acceptedUseAck does not match the active Use acknowledgement window");
    } else {
      requireWire(
        decision.acknowledgedUseDecisionControlTick === 0
          && decision.acknowledgedUseAttemptId === 0
          && decision.acknowledgedManualUseSequence === 0,
        "inactive Use acknowledgement window must clear replay ids");
    }

    requireSafeInteger(decision.stateEnteredAtControlTick, "stateEnteredAtControlTick", 1);
    requireWire(
      decision.stateEnteredAtControlTick <= decision.controlTick,
      "stateEnteredAtControlTick cannot exceed controlTick");
    requireSafeInteger(decision.prediction, "prediction", 0);
    requireSafeInteger(decision.manualUseSequence, "manualUseSequence", 0);
    requireBoolean(decision.predictionAnomaly, "predictionAnomaly");
    requireWire(typeof decision.anomalyCode === "string", "anomalyCode must be a string");
    requireNonEmptyString(decision.lifecycleState, "lifecycleState");
    requireNonEmptyString(decision.modelState, "modelState");
    requireWire(typeof decision.resetOperationId === "string", "resetOperationId must be a string");
    requireNonEmptyString(decision.lifecycleEvent, "lifecycleEvent");
    requireBoolean(decision.runBoundaryApplied, "runBoundaryApplied");
    requireWire(EVIDENCE_TRUTH.has(decision.doorIdentityTruth), "doorIdentityTruth is unknown");
    requireNonEmptyString(decision.doorIdentityReason, "doorIdentityReason");
    requireFiniteRange(decision.doorIdentityConfidence, "doorIdentityConfidence", 0, 1);
    requireBoolean(decision.nativeLevelFactsAvailable, "nativeLevelFactsAvailable");
    requireBoolean(
      decision.nativeLevelLoadSequenceAvailable,
      "nativeLevelLoadSequenceAvailable");
    requireSafeInteger(decision.nativeLevelLoadSequence, "nativeLevelLoadSequence", -1);
    requireWire(
      decision.nativeLevelLoadSequenceAvailable
        ? decision.nativeLevelLoadSequence >= 0
        : decision.nativeLevelLoadSequence === -1,
      "nativeLevelLoadSequence availability and value are inconsistent");
    for (const name of [
      "nativeLevelTime",
      "nativeGametic",
      "nativeLevelStartTic",
      "nativeGameState",
      "nativeGameEpisode",
      "nativeGameMap"
    ]) {
      requireSafeInteger(decision[name], name, -1);
    }
    for (const name of [
      "stateFrame",
      "retryCount",
      "recoveryCount",
      "remainingUseRetries",
      "remainingRecoveryAttempts",
      "useAttemptId",
      "pendingUseAttemptId"
    ]) {
      requireSafeInteger(decision[name], name, 0);
    }
    requireWire(
      decision.alignmentSweepDirection === -1
        || decision.alignmentSweepDirection === 0
        || decision.alignmentSweepDirection === 1,
      "alignmentSweepDirection must be -1, 0, or 1");
    requireWire(
      PENDING_USE_CORRELATION_STATES.has(decision.pendingUseCorrelationState),
      "pendingUseCorrelationState is unknown");
    const pendingState = decision.state === "StationaryUse" || decision.state === "AwaitOutcome";
    requireWire(
      decision.pendingUseAttemptId === (pendingState ? decision.useAttemptId : 0),
      "pendingUseAttemptId does not match the current state");
    requireWire(
      decision.pendingUseCorrelationState === (
        decision.state === "StationaryUse"
          ? "use-issued"
          : (decision.state === "AwaitOutcome" ? "awaiting-outcome" : "none")),
      "pendingUseCorrelationState does not match the current state");
    requireWire(typeof decision.terminalFailureCode === "string", "terminalFailureCode must be a string");
    requireWire(
      decision.terminalFailureCode === (decision.state === "FailedSafeStop" ? decision.reasonCode : ""),
      "terminalFailureCode does not match terminal state");
  }

  function validHandoffGate(decision) {
    const delta = decision.semanticDelta;
    return decision.handOffToPostDoor === true
      && decision.openConfirmed === true
      && delta?.firstDoorOpened === true
      && delta.computerRoomEntered === decision.completed
      && Number.isSafeInteger(delta.doorOpenedCount)
      && delta.doorOpenedCount >= 1
      && delta.source !== "None"
      && delta.sessionId === decision.sessionId
      && delta.runId === decision.runId
      && delta.runGeneration === decision.runGeneration
      && delta.controlTick === decision.controlTick;
  }

  function validateDisposition(decision) {
    const disposition = decision.ownershipDisposition;
    if (disposition === "NotAcquired") {
      requireWire(decision.exclusive === false, "NotAcquired cannot be exclusive");
      requireWire(decision.handOffToPostDoor === false, "NotAcquired cannot hand off");
      requireWire(decision.completed === false, "NotAcquired cannot be completed");
      requireWire(isNeutralWireAction(decision.action, decision.runRequested), "NotAcquired must carry a neutral C# action");
      return;
    }

    if (disposition === "Exclusive") {
      requireWire(decision.exclusive === true, "Exclusive disposition must be exclusive");
      requireWire(decision.handOffToPostDoor === false, "Exclusive disposition cannot hand off");
      requireWire(decision.completed === false, "Exclusive disposition cannot be completed");
      return;
    }

    if (disposition === "HandOff" || disposition === "Completed") {
      requireWire(decision.exclusive === false, `${disposition} cannot be exclusive`);
      requireWire(decision.completed === (disposition === "Completed"), `${disposition} completed flag is inconsistent`);
      requireWire(validHandoffGate(decision), `${disposition} requires an explicit trusted semantic handoff gate`);
      requireWire(isNeutralWireAction(decision.action, decision.runRequested), `${disposition} must release a neutral C# action`);
      return;
    }

    requireWire(disposition === "FailedSafeStop", "ownershipDisposition is unknown");
    requireWire(decision.exclusive === true, "FailedSafeStop must remain exclusive");
    requireWire(decision.handOffToPostDoor === false, "FailedSafeStop cannot hand off");
    requireWire(decision.completed === false, "FailedSafeStop cannot be completed");
    requireWire(isNeutralWireAction(decision.action, decision.runRequested), "FailedSafeStop must be neutral");
  }

  function validateDecision(decision, options = {}) {
    requireWire(isRecord(decision), "decision must be an object");
    requireWire(decision.contractVersion === CONTRACT_VERSION, `contractVersion must be ${CONTRACT_VERSION}`);
    requireNonEmptyString(decision.implementationVersion, "implementationVersion");
    requireNonEmptyString(decision.policyVersion, "policyVersion");
    requireNonEmptyString(decision.sessionId, "sessionId");
    requireNonEmptyString(decision.runId, "runId");
    requireSafeInteger(decision.runGeneration, "runGeneration", 1);
    requireSafeInteger(decision.controlTick, "controlTick", 1);
    requireWire(CONTROL_STATES.has(decision.previousState), "previousState is unknown");
    requireWire(CONTROL_STATES.has(decision.nextState), "nextState is unknown");
    requireWire(CONTROL_STATES.has(decision.state), "state is unknown");
    requireWire(decision.nextState === decision.state, "nextState must equal state");
    requireBoolean(decision.transitioned, "transitioned");
    requireWire(decision.transitioned === (decision.previousState !== decision.state), "transitioned does not match state change");
    requireWire(OWNERSHIP_UNITS.has(decision.ownershipUnit), "ownershipUnit is unknown");
    requireWire(OWNERSHIP_DISPOSITIONS.has(decision.ownershipDisposition), "ownershipDisposition is unknown");
    requireNonEmptyString(decision.ownerId, "ownerId");
    requireWire(decision.ownerId.startsWith("first-door."), "ownerId must be owned by FirstDoor");
    requireNonEmptyString(decision.reasonCode, "reasonCode");
    requireBoolean(decision.runRequested, "runRequested");
    requireBoolean(decision.exclusive, "exclusive");
    requireBoolean(decision.handOffToPostDoor, "handOffToPostDoor");
    requireBoolean(decision.completed, "completed");
    requireBoolean(decision.openConfirmed, "openConfirmed");
    requireBoolean(decision.nativeDeathConfirmed, "nativeDeathConfirmed");
    requireBoolean(decision.restartRequested, "restartRequested");
    requireWire(typeof decision.restartRequestId === "string", "restartRequestId must be a string");
    requireNonEmptyString(decision.restartReason, "restartReason");
    requireWire(OPEN_SOURCES.has(decision.openConfirmationSource), "openConfirmationSource is unknown");
    requireWire(typeof decision.contractError === "string" && decision.contractError.length === 0, "contractError must be empty");
    validateAction(decision.action, decision.runRequested);
    validateSemanticDelta(decision.semanticDelta, decision);
    validateStateOwnership(decision);
    validateAcceptedEvidence(decision);
    validateReplayFields(decision);
    validateVitalityTrace(decision.vitalityTrace, decision);
    validateAudioCatalogTrace(decision.audioCatalogTrace, decision);
    validateDisposition(decision);

    const input = options.input;
    if (isRecord(input)) {
      requireWire(input.contractVersion === CONTRACT_VERSION, "input contractVersion changed before dispatch");
      requireWire(decision.sessionId === input.sessionId, "decision sessionId does not match input");
      requireWire(decision.runId === input.runId, "decision runId does not match input");
      requireWire(decision.runGeneration === input.runGeneration, "decision runGeneration does not match input");
    }

    const previous = options.previousDecision;
    if (isRecord(previous) && previous.sessionId === decision.sessionId) {
      requireWire(
        Number.isSafeInteger(previous.controlTick) && decision.controlTick > previous.controlTick,
        "controlTick must increase monotonically within a browser session");
    }

    return decision;
  }

  function evaluate(runtime, wasmState, previousStatus, rawState) {
    try {
      const bridge = self.aiKernelDoomControl;
      if (typeof bridge?.evaluateBrowserFirstDoor !== "function") {
        fail("C# FirstDoor control bridge is unavailable");
      }

      const input = createInput(runtime, wasmState, previousStatus, rawState);
      const returned = bridge.evaluateBrowserFirstDoor(input);
      let decision = returned;
      if (typeof returned === "string") {
        try {
          decision = JSON.parse(returned);
        } catch (error) {
          throw taggedError("C# FirstDoor bridge returned malformed JSON", error);
        }
      }

      validateDecision(decision, {
        input,
        previousDecision: runtime?.autoplayCSharpFirstDoorDecision
      });
      commitNativeAudioCursor(runtime, input, decision);
      return { input, decision };
    } catch (error) {
      throw taggedError("C# FirstDoor evaluation failed", error);
    }
  }

  function allowsLegacy(decision) {
    try {
      validateDecision(decision);
      return decision.ownershipDisposition === "NotAcquired"
        || decision.ownershipDisposition === "HandOff"
        || decision.ownershipDisposition === "Completed";
    } catch {
      return false;
    }
  }

  function projectionMetadata(decision) {
    const ownerId = firstString(decision?.ownerId) || "first-door.failed-safe-stop";
    const reasonCode = firstString(decision?.reasonCode) || "failed-safe-stop";
    const runGeneration = boundedInteger(decision?.runGeneration, 0, 0);
    const controlTick = boundedInteger(decision?.controlTick, 0, 0);
    const state = firstString(decision?.state) || "FailedSafeStop";
    return {
      source: "csharp-first-door",
      pipeline: ownerId,
      controlPipeline: ownerId,
      phasePipelineId: ownerId,
      phasePipelineExclusive: decision?.exclusive === true,
      stage: reasonCode,
      safetyReason: reasonCode,
      svcEvent: reasonCode,
      actionSequenceId: `csharp-first-door-run-${runGeneration}-tick-${controlTick}`,
      actionSequenceStepId: state
    };
  }

  function createNeutralAction(decision) {
    return Object.assign({
      move: "none",
      turn: "none",
      turnYaw: 0,
      fire: false,
      strafe: false,
      use: false,
      run: false
    }, projectionMetadata(decision));
  }

  function createExclusiveAction(decision) {
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
    }, projectionMetadata(decision));
  }

  function createSemanticCandidate(decision) {
    requireWire(validHandoffGate(decision), "semantic handoff gate is invalid");
    const delta = decision.semanticDelta;
    return {
      sessionId: delta.sessionId,
      runId: delta.runId,
      runGeneration: delta.runGeneration,
      controlTick: delta.controlTick,
      firstDoorOpened: true,
      computerRoomEntered: delta.computerRoomEntered,
      doorOpenedCount: delta.doorOpenedCount,
      source: delta.source,
      ownerId: decision.ownerId,
      state: decision.state,
      reasonCode: decision.reasonCode
    };
  }

  function deepCloneTransport(value, seen = new Map()) {
    if (value == null || typeof value !== "object") {
      return value;
    }
    if (seen.has(value)) {
      return seen.get(value);
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
    if (Array.isArray(value)) {
      const cloned = [];
      seen.set(value, cloned);
      for (let index = 0; index < value.length; index += 1) {
        if (Object.prototype.hasOwnProperty.call(value, index)) {
          cloned[index] = deepCloneTransport(value[index], seen);
        }
      }
      return cloned;
    }
    if (tag === "[object Object]") {
      const cloned = {};
      seen.set(value, cloned);
      for (const key of Object.keys(value)) {
        cloned[key] = deepCloneTransport(value[key], seen);
      }
      return cloned;
    }

    return value;
  }

  function createHandoffOverlay(wasmState, semanticState) {
    const raw = isRecord(wasmState) ? deepCloneTransport(wasmState) : {};
    const milestones = isRecord(raw.milestones) ? raw.milestones : {};
    return Object.assign(raw, {
      doorOpenedCount: semanticState.doorOpenedCount,
      firstDoorOpened: true,
      computerRoomEntered: semanticState.computerRoomEntered,
      milestones: Object.assign({}, milestones, {
        doorOpened: semanticState.doorOpenedCount,
        doorOpenedCount: semanticState.doorOpenedCount,
        firstDoorOpened: true,
        computerRoomEntered: semanticState.computerRoomEntered
      }),
      csharpFirstDoorSemanticState: Object.assign({}, semanticState)
    });
  }

  function captureSemanticTransaction(runtime) {
    const hadOwnStore = Object.prototype.hasOwnProperty.call(runtime, "autoplayCSharpSemanticState");
    const reference = runtime.autoplayCSharpSemanticState;
    const snapshot = deepCloneTransport(reference);
    return {
      hadOwnStore,
      reference,
      snapshot,
      signature: JSON.stringify(snapshot)
    };
  }

  function restoreSemanticTransaction(runtime, transaction) {
    if (!transaction.hadOwnStore) {
      delete runtime.autoplayCSharpSemanticState;
      return;
    }

    runtime.autoplayCSharpSemanticState = deepCloneTransport(transaction.snapshot);
  }

  function semanticTransactionUnchanged(runtime, transaction) {
    return runtime.autoplayCSharpSemanticState === transaction.reference
      && JSON.stringify(runtime.autoplayCSharpSemanticState) === transaction.signature;
  }

  function requireFreshSemanticCandidate(existing, candidate) {
    if (!isRecord(existing) || existing.sessionId !== candidate.sessionId) {
      return;
    }

    requireSafeInteger(existing.controlTick, "existing semantic controlTick", 1);
    requireWire(
      candidate.controlTick > existing.controlTick,
      "semantic handoff controlTick must strictly increase within a session");
  }

  function tagNextOwnerError(error) {
    if (error && (typeof error === "object" || typeof error === "function")) {
      try {
        error.aikernelCSharpNextOwner = true;
        return error;
      } catch {
        // Fall through to a writable wrapper without reclassifying it as a C# contract error.
      }
    }

    const wrapped = new Error(error instanceof Error ? error.message : String(error));
    wrapped.cause = error;
    wrapped.aikernelCSharpNextOwner = true;
    return wrapped;
  }

  function dispatchSemanticHandoff(runtime, decision, wasmState, legacyPredict) {
    requireWire(isRecord(runtime), "runtime is required to commit a semantic handoff");
    requireWire(typeof legacyPredict === "function", "legacyPredict must be a function for an explicit next owner");
    const candidate = createSemanticCandidate(decision);
    requireFreshSemanticCandidate(runtime.autoplayCSharpSemanticState, candidate);
    const transaction = captureSemanticTransaction(runtime);
    const legacyState = createHandoffOverlay(wasmState, candidate);
    let action;
    try {
      action = legacyPredict(legacyState);
    } catch (error) {
      restoreSemanticTransaction(runtime, transaction);
      throw tagNextOwnerError(error);
    }

    if (!isPlainRecord(action)) {
      restoreSemanticTransaction(runtime, transaction);
      throw tagNextOwnerError(new Error("next-owner action must be a synchronous non-null plain object"));
    }

    if (!semanticTransactionUnchanged(runtime, transaction)) {
      restoreSemanticTransaction(runtime, transaction);
      throw tagNextOwnerError(new Error("semantic handoff compare-and-set conflict"));
    }

    runtime.autoplayCSharpSemanticState = candidate;
    return {
      action,
      legacyState,
      semanticState: Object.assign({}, candidate)
    };
  }

  function invokeLegacy(legacyPredict, legacyState) {
    requireWire(typeof legacyPredict === "function", "legacyPredict must be a function for an explicit legacy owner");
    return legacyPredict(legacyState);
  }

  function dispatch(controlPacket, options = {}) {
    try {
      requireWire(isRecord(controlPacket), "controlPacket must be an object");
      const input = controlPacket.input;
      const decision = controlPacket.decision;
      validateDecision(decision, { input });
      const runtime = options.runtime;
      const wasmState = isRecord(options.wasmState) ? options.wasmState : {};
      const existingSemanticState = isRecord(runtime?.autoplayCSharpSemanticState)
        ? deepCloneTransport(runtime.autoplayCSharpSemanticState)
        : null;

      if (decision.ownershipDisposition === "NotAcquired") {
        return {
          mode: "legacy",
          action: invokeLegacy(options.legacyPredict, wasmState),
          legacyState: wasmState,
          semanticState: existingSemanticState,
          decision
        };
      }

      if (decision.ownershipDisposition === "Exclusive") {
        return {
          mode: "exclusive",
          action: createExclusiveAction(decision),
          legacyState: null,
          semanticState: existingSemanticState,
          decision
        };
      }

      if (decision.ownershipDisposition === "HandOff"
        || decision.ownershipDisposition === "Completed") {
        const handoff = dispatchSemanticHandoff(
          runtime,
          decision,
          wasmState,
          options.legacyPredict);
        return {
          mode: decision.ownershipDisposition === "HandOff" ? "handoff" : "completed",
          action: handoff.action,
          legacyState: handoff.legacyState,
          semanticState: handoff.semanticState,
          decision
        };
      }

      requireWire(decision.ownershipDisposition === "FailedSafeStop", "unsupported ownership disposition");
      return {
        mode: "failed-safe-stop",
        action: createNeutralAction(decision),
        legacyState: null,
        semanticState: existingSemanticState,
        decision
      };
    } catch (error) {
      if (error?.aikernelCSharpNextOwner === true) {
        throw error;
      }
      throw taggedError("C# FirstDoor dispatch failed", error);
    }
  }

  self.AIKernelDoomCSharpFirstDoor = Object.freeze({
    contractVersion: CONTRACT_VERSION,
    createInput,
    evaluate,
    validateDecision,
    allowsLegacy,
    dispatch,
    createNeutralAction
  });
})();
