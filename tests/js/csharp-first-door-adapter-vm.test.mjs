import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const sourcePath = path.join(
  repoRoot,
  "src/DoomWeb/wwwroot/js/autoplay/csharp-first-door-adapter.js");
const demoPath = path.join(
  repoRoot,
  "src/DoomWeb/wwwroot/demo/doom/js/autoplay/csharp-first-door-adapter.js");
const doomSourcePath = path.join(repoRoot, "src/DoomWeb/wwwroot/js/doom.js");
const doomDemoPath = path.join(repoRoot, "src/DoomWeb/wwwroot/demo/doom/js/doom.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  assert(Object.is(actual, expected), `${message}: expected ${String(expected)}, got ${String(actual)}`);
}

function assertJsonEqual(actual, expected, message) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertTaggedThrow(callback, fragment, message) {
  let thrown = null;
  try {
    callback();
  } catch (error) {
    thrown = error;
  }

  assert(thrown, `${message}: expected an exception`);
  assert(thrown.aikernelCSharpFirstDoor === true, `${message}: error must be tagged`);
  assert(
    !fragment || String(thrown.message).includes(fragment),
    `${message}: expected message containing ${fragment}, got ${String(thrown.message)}`);
}

function captureThrow(callback, message) {
  try {
    callback();
  } catch (error) {
    return error;
  }

  throw new Error(`${message}: expected an exception`);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const source = readFileSync(sourcePath, "utf8");
const demo = readFileSync(demoPath, "utf8");
assertEqual(demo, source, "source and demo adapters must remain byte-identical");
const doomSource = readFileSync(doomSourcePath, "utf8");
const doomDemo = readFileSync(doomDemoPath, "utf8");
assertEqual(doomDemo, doomSource, "source and demo Doom hosts must remain byte-identical");
assert(
  doomSource.includes("csharpFirstDoor.evaluate(this, wasmState, wasmStatus, state)"),
  "Doom host must pass the original raw autoplay state separately from legacy wasmState");
assert(
  doomSource.includes("this.autoplayCSharpContractVersion = 4;"),
  "Doom host diagnostics must report the v4 C# first-door contract");
assert(
  doomSource.includes("this.paletteGeneration = 1;"),
  "Doom host must assign an explicit generation to its initial palette cache");
assert(
  doomSource.includes("this.paletteGeneration += 1;"),
  "Doom host must advance the palette generation when WAD PLAYPAL replaces the cache");

const sandbox = { self: {}, console };
const context = vm.createContext(sandbox);
vm.runInContext(source, context, { filename: "csharp-first-door-adapter.js" });

const adapter = context.self.AIKernelDoomCSharpFirstDoor;
for (const exported of [
  "createInput",
  "evaluate",
  "validateDecision",
  "allowsLegacy",
  "dispatch",
  "createNeutralAction"
]) {
  assert(typeof adapter?.[exported] === "function", `adapter should export ${exported}`);
}
assertEqual(adapter.contractVersion, 4, "wire contract version should be explicit");

const wadContentSha256 = "1d7d43be501e67d927e415e0b8f3e29c3bf33075e859721816f652a526cac771";

const rawPaletteSample = Array.from({ length: 20 * 13 }, (_, index) => index % 256);
const rawPaletteRgba = Array.from({ length: 256 * 4 }, (_, index) => (index * 17) % 256);

function rawStateFixture(overrides = {}) {
  const base = {
    frame: 37,
    framebuffer: {
      width: 320,
      height: 200,
      format: "paletted-8bit",
      sample: rawPaletteSample.slice()
    }
  };
  return Object.assign({}, base, overrides, {
    framebuffer: Object.assign({}, base.framebuffer, overrides.framebuffer || {})
  });
}

function runtimeFixture() {
  return {
    exports: { marker: "native-exports" },
    modelLoaded: true,
    state: "running",
    frameCount: 37,
    paletteGeneration: 7,
    paletteCache: {
      rgbaBytes: rawPaletteRgba.slice()
    },
    moduleConfig: {
      wad: {
        sha256: wadContentSha256
      }
    },
    autoplayPredictions: 39,
    autoplayManualUseSequence: 5,
    autoplayCSharpFirstDoorScope: {
      sessionId: "browser-session",
      runId: "browser-run-1",
      runGeneration: 1,
      resetRequested: true,
      resetOperationId: "reset-op-1",
      lifecycleEvent: "run-started",
      lifecycleState: "running",
      modelState: "ready"
    },
    autoplayDoorOpenAudioEvidence: {
      eventType: "native-sfx",
      classifiedDoorOpenEvent: true,
      audioFeatures: { peakEnergy: 0.9 }
    },
    autoplayDebugRouteValues: {
      currentRoute: "debug-route-must-not-cross",
      routeMode: "debug-mode-must-not-cross"
    }
  };
}

function wasmStateFixture() {
  return {
    predictions: 41,
    routeMode: "door-approach",
    currentRoute: "first-door-route",
    context: "corridor",
    firstDoorPhaseReady: true,
    firstDoorRouteEvidence: 0.99,
    doorIdentityConfidence: 0.98,
    firstDoorVision9x9Score: 0.55,
    firstDoorVision9x9RedScore: 0.30,
    firstDoorVision9x9Locked: true,
    firstDoorVision9x9LockFrames: 4,
    firstDoorVision9x9Box: {
      kind: "first-door-9x9-patch",
      column: 3,
      score: 0.54,
      redScore: 0.29
    },
    firstDoorUse3x3Score: 0.02,
    bridgeDoorScore: 0.40,
    wallVector: -0.20,
    footObstacleScore: 0.70,
    motionObstacleScore: 0.60,
    wallObstacleScore: 0.50,
    motionForwardProgress: 0.10,
    usePulseCooldownFrames: 2,
    liveComputerRoomConfidence: 0.20,
    postDoorTerminalSurface: 0.15,
    computerRoomEntered: false,
    doorOpenedCount: 0,
    milestones: { doorOpenedCount: 99 }
  };
}

let nativeReadCalls = 0;
let nativeReadArguments = null;
const availableNativeReader = {
  readFirstDoorFacts(exports, afterSequence) {
    nativeReadCalls += 1;
    nativeReadArguments = { exports, afterSequence };
    return {
      run: {
        available: true,
        gametic: 510,
        leveltime: 310,
        levelstarttic: 200,
        gamestate: 1,
        gameepisode: 1,
        gamemap: 1,
        levelLoadSequenceAvailable: true,
        levelLoadSequence: 3
      },
      player: {
        available: true,
        xFixed: -7340032,
        yFixed: 8126464,
        angleBam: 4294967295,
        momentumXFixed: -65536,
        momentumYFixed: 131072,
        sectorIndex: 7,
        health: 82,
        playerState: 0,
        killCount: 1
      },
      audio: {
        available: true,
        latestSequence: 7,
        events: [
          { sequence: 6, sfxId: 12, sfxName: "itemup", sfxNameBytes: [1], eventType: "ignored" },
          { sequence: 7, sfxId: 13, sfxName: "doropn", classifiedDoorOpenEvent: true }
        ]
      }
    };
  },
  readNativeFacts() {
    throw new Error("FirstDoor must use the selective native reader");
  }
};
context.self.AIKernelDoomNativeAudio = availableNativeReader;

const inputRuntime = runtimeFixture();
const inputState = wasmStateFixture();
const input = adapter.createInput(inputRuntime, inputState, {
  predictions: 42,
  debugRouteValues: { currentRoute: "status-debug-route" }
}, rawStateFixture());
assertEqual(nativeReadCalls, 1, "createInput should read native facts exactly once");
assert(nativeReadArguments.exports === inputRuntime.exports, "createInput should use runtime exports");
assertEqual(nativeReadArguments.afterSequence, 0, "createInput should request the raw event ring from sequence zero");
assertJsonEqual(
  {
    contractVersion: input.contractVersion,
    sessionId: input.sessionId,
    runId: input.runId,
    runGeneration: input.runGeneration,
    resetRequested: input.resetRequested,
    resetOperationId: input.resetOperationId,
    lifecycleEvent: input.lifecycleEvent,
    lifecycleState: input.lifecycleState,
    modelState: input.modelState
  },
  {
    contractVersion: 4,
    sessionId: "browser-session",
    runId: "browser-run-1",
    runGeneration: 1,
    resetRequested: true,
    resetOperationId: "reset-op-1",
    lifecycleEvent: "run-started",
    lifecycleState: "running",
    modelState: "ready"
  },
  "explicit lifecycle scope should cross the bridge unchanged");
assertEqual(
  input.wadContentSha256,
  wadContentSha256,
  "verified WAD content identity should cross without rewriting");
assertEqual(input.prediction, 42, "prediction should cross only as a diagnostic counter");
assertJsonEqual(
  {
    available: input.nativeLevelFactsAvailable,
    gametic: input.nativeGametic,
    leveltime: input.nativeLevelTime,
    levelstarttic: input.nativeLevelStartTic,
    gamestate: input.nativeGameState,
    episode: input.nativeGameEpisode,
    map: input.nativeGameMap,
    levelLoadSequenceAvailable: input.nativeLevelLoadSequenceAvailable,
    levelLoadSequence: input.nativeLevelLoadSequence
  },
  {
    available: true,
    gametic: 510,
    leveltime: 310,
    levelstarttic: 200,
    gamestate: 1,
    episode: 1,
    map: 1,
    levelLoadSequenceAvailable: true,
    levelLoadSequence: 3
  },
  "raw native run facts should cross unchanged");
assertJsonEqual(
  {
    available: input.nativePlayerFactsAvailable,
    vitalityAvailable: input.nativePlayerVitalityFactsAvailable,
    xFixed: input.nativePlayerXFixed,
    yFixed: input.nativePlayerYFixed,
    angleBam: input.nativePlayerAngleBam,
    momentumXFixed: input.nativePlayerMomentumXFixed,
    momentumYFixed: input.nativePlayerMomentumYFixed,
    sectorIndex: input.nativePlayerSectorIndex,
    health: input.nativePlayerHealth,
    playerState: input.nativePlayerState,
    killCount: input.nativePlayerKillCount
  },
  {
    available: true,
    vitalityAvailable: true,
    xFixed: -7340032,
    yFixed: 8126464,
    angleBam: 4294967295,
    momentumXFixed: -65536,
    momentumYFixed: 131072,
    sectorIndex: 7,
    health: 82,
    playerState: 0,
    killCount: 1
  },
  "raw native player facts should cross without value conversion");
assertJsonEqual(input.audio, {
  nativeEvents: 7,
  events: [
    { sequence: 6, sfxId: 12, sfxName: "itemup" },
    { sequence: 7, sfxId: 13, sfxName: "doropn" }
  ]
}, "only raw native SFX identity should cross the audio boundary");
assertJsonEqual(input.rawObservation, {
  schemaVersion: 1,
  layout: "pal8-center-20x13-v1",
  available: true,
  frameSequence: 37,
  nativeGameticObservedAtEvaluation: 510,
  sourceWidth: 320,
  sourceHeight: 200,
  gameplayHeight: 168,
  sampleColumns: 20,
  sampleRows: 13,
  paletteGeneration: 7,
  paletteIndicesBase64: Buffer.from(rawPaletteSample).toString("base64"),
  paletteRgbaBase64: Buffer.from(rawPaletteRgba).toString("base64")
}, "raw pal8 sample and PLAYPAL bytes should cross without semantic projection");
for (const forbidden of [
  "debugRouteValues",
  "doorIdentityConfidence",
  "firstDoorRouteEvidence",
  "routeMode",
  "currentRoute",
  "context",
  "firstDoorPhaseReady",
  "firstDoorVisionScore",
  "firstDoorVisionKind",
  "firstDoorVisionColumn",
  "firstDoorVisionLocked",
  "firstDoorVisionLockFrames",
  "firstDoorRedScore",
  "firstDoorUseScore",
  "bridgeDoorScore",
  "alignmentVector",
  "footObstacleScore",
  "motionObstacleScore",
  "wallObstacleScore",
  "motionForwardProgress",
  "usePulseCooldownFrames",
  "computerRoomVisualConfidence",
  "postDoorTerminalSurface",
  "computerRoomEntered",
  "doorOpenedCount"
]) {
  assert(
    !Object.prototype.hasOwnProperty.call(input, forbidden),
    `${forbidden} must not cross as a correctness input`);
}
for (const forbidden of [
  "eventType",
  "peakEnergy",
  "rmsEnergy",
  "classifiedDoorOpenEvent",
  "classifiedDoorFailureEvent"
]) {
  assert(
    !Object.prototype.hasOwnProperty.call(input.audio, forbidden),
    `audio.${forbidden} must not cross as a correctness input`);
}
assertEqual(input.manualUseSequence, 5, "current manual Use sequence should cross as a raw integer");
assertEqual(input.appliedActionAck, null, "missing applied-action snapshot should cross as null");

const unavailableRawObservation = adapter.createInput(
  runtimeFixture(),
  wasmStateFixture(),
  { predictions: 43 },
  {}).rawObservation;
assertJsonEqual(unavailableRawObservation, {
  schemaVersion: 1,
  layout: "pal8-center-20x13-v1",
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
}, "missing raw capture must remain explicitly unavailable without semantic fallback");

for (const invalidRawState of [
  rawStateFixture({ framebuffer: { sample: rawPaletteSample.slice(0, -1) } }),
  rawStateFixture({ framebuffer: { sample: rawPaletteSample.map((value, index) => index === 10 ? 256 : value) } }),
  rawStateFixture({ framebuffer: { width: 319 } }),
  rawStateFixture({ frame: 1.5 })
]) {
  const invalidInput = adapter.createInput(runtimeFixture(), wasmStateFixture(), {}, invalidRawState);
  assertEqual(invalidInput.rawObservation.available, false, "invalid raw capture must fail closed");
  assertEqual(invalidInput.rawObservation.paletteIndicesBase64, "", "invalid raw capture must not leak a partial sample");
  assertEqual(invalidInput.rawObservation.paletteRgbaBase64, "", "invalid raw capture must not leak a palette");
}

const invalidPaletteRuntime = runtimeFixture();
invalidPaletteRuntime.paletteCache.rgbaBytes = rawPaletteRgba.slice(0, -1);
const invalidPaletteInput = adapter.createInput(
  invalidPaletteRuntime,
  wasmStateFixture(),
  {},
  rawStateFixture());
assertEqual(invalidPaletteInput.rawObservation.available, false, "invalid PLAYPAL length must fail closed");

for (const invalidWadSha256 of [
  undefined,
  "1D7D43BE501E67D927E415E0B8F3E29C3BF33075E859721816F652A526CAC771",
  wadContentSha256.slice(0, -1),
  123
]) {
  const invalidWadRuntime = runtimeFixture();
  invalidWadRuntime.moduleConfig.wad.sha256 = invalidWadSha256;
  assertTaggedThrow(
    () => adapter.createInput(invalidWadRuntime, wasmStateFixture(), {}, rawStateFixture()),
    "runtime.moduleConfig.wad.sha256",
    `invalid WAD SHA-256 ${String(invalidWadSha256)} must fail closed`);
}

for (const invalidPaletteGeneration of [undefined, "7", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
  const invalidGenerationRuntime = runtimeFixture();
  invalidGenerationRuntime.paletteGeneration = invalidPaletteGeneration;
  const invalidGenerationInput = adapter.createInput(
    invalidGenerationRuntime,
    wasmStateFixture(),
    {},
    rawStateFixture());
  assertEqual(
    invalidGenerationInput.rawObservation.available,
    false,
    `invalid palette generation ${String(invalidPaletteGeneration)} must fail closed`);
  assertEqual(
    invalidGenerationInput.rawObservation.paletteGeneration,
    0,
    "invalid palette generation must use the unavailable sentinel");
}

function appliedActionSnapshot(overrides = {}) {
  const base = {
    sessionId: "browser-session",
    runId: "browser-run-1",
    runGeneration: 1,
    controlTick: 7,
    useAttemptId: 2,
    actionMode: "csharp-exact",
    proposed: { use: true },
    applied: {
      move: "none",
      turn: "none",
      turnYaw: 0,
      fire: false,
      strafe: false,
      use: true,
      run: false
    },
    use: {
      resolved: true,
      eventQueued: true,
      pulseResolverCalled: false,
      blockedByManualInput: false
    },
    path: {
      selected: "native-action",
      senseOnly: false
    },
    queuedUseInputEventSequence: 19,
    pumpedUseInputEventSequence: 19,
    usePumped: true,
    manualUseSequenceAtDecision: 5
  };
  return Object.assign({}, base, overrides, {
    proposed: Object.assign({}, base.proposed, overrides.proposed || {}),
    applied: Object.assign({}, base.applied, overrides.applied || {}),
    use: Object.assign({}, base.use, overrides.use || {}),
    path: Object.assign({}, base.path, overrides.path || {})
  });
}

const ackRuntime = runtimeFixture();
ackRuntime.autoplayCSharpAppliedActionSnapshot = appliedActionSnapshot();
const ackInput = adapter.createInput(ackRuntime, wasmStateFixture(), {}, rawStateFixture());
assertJsonEqual(ackInput.appliedActionAck, {
  sessionId: "browser-session",
  runId: "browser-run-1",
  runGeneration: 1,
  decisionControlTick: 7,
  useAttemptId: 2,
  actionMode: "csharp-exact",
  hostPath: "native-action",
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
  queuedUseInputEventSequence: 19,
  pumpedUseInputEventSequence: 19,
  usePumped: true,
  manualUseSequenceAtDecision: 5
}, "applied-action acknowledgement should be copied mechanically");

const blockedAckRuntime = runtimeFixture();
blockedAckRuntime.autoplayCSharpAppliedActionSnapshot = appliedActionSnapshot({
  applied: { use: false },
  use: {
    resolved: false,
    eventQueued: false,
    blockedByManualInput: true
  },
  path: { selected: "key-events" },
  queuedUseInputEventSequence: 0,
  pumpedUseInputEventSequence: 0,
  usePumped: false
});
const blockedAck = adapter.createInput(blockedAckRuntime, wasmStateFixture(), {}, rawStateFixture()).appliedActionAck;
assertEqual(blockedAck.manualBlocked, true, "manual blocking must cross without boolean coercion");
assertEqual(blockedAck.appliedUse, false, "blocked Use must retain its raw applied result");
assertEqual(blockedAck.eventQueued, false, "blocked Use must retain its raw queue result");

const malformedAckRuntime = runtimeFixture();
malformedAckRuntime.autoplayCSharpAppliedActionSnapshot = appliedActionSnapshot({
  applied: { strafe: true }
});
assertTaggedThrow(
  () => adapter.createInput(malformedAckRuntime, wasmStateFixture(), {}, rawStateFixture()),
  "directionless applied strafe",
  "directionless strafe acknowledgement should fail closed");
const malformedAckBooleanRuntime = runtimeFixture();
malformedAckBooleanRuntime.autoplayCSharpAppliedActionSnapshot = appliedActionSnapshot({
  usePumped: "true"
});
assertTaggedThrow(
  () => adapter.createInput(malformedAckBooleanRuntime, wasmStateFixture(), {}, rawStateFixture()),
  "usePumped must be boolean",
  "acknowledgement booleans must not be coerced");
const malformedManualSequenceRuntime = runtimeFixture();
malformedManualSequenceRuntime.autoplayManualUseSequence = "5";
assertTaggedThrow(
  () => adapter.createInput(malformedManualSequenceRuntime, wasmStateFixture(), {}, rawStateFixture()),
  "autoplayManualUseSequence",
  "manual Use sequence must remain a raw integer");

context.self.AIKernelDoomNativeAudio = {
  readNativeFacts() {
    return {
      run: { available: false },
      player: { available: false },
      audio: { available: false, latestSequence: 99, events: [{ sequence: 99, sfxId: 1, sfxName: "doropn" }] }
    };
  }
};
const unavailableInput = adapter.createInput(runtimeFixture(), wasmStateFixture(), {}, rawStateFixture());
assertEqual(unavailableInput.nativeLevelFactsAvailable, false, "missing native run facts should be explicit");
assertEqual(unavailableInput.nativeGametic, -1, "missing gametic should use a fail-closed sentinel");
assertEqual(unavailableInput.nativeLevelLoadSequenceAvailable, false, "missing native level-load sequence should be explicit");
assertEqual(unavailableInput.nativeLevelLoadSequence, -1, "missing native level-load sequence should use a sentinel");
assertJsonEqual({
  available: unavailableInput.nativePlayerFactsAvailable,
  vitalityAvailable: unavailableInput.nativePlayerVitalityFactsAvailable,
  xFixed: unavailableInput.nativePlayerXFixed,
  yFixed: unavailableInput.nativePlayerYFixed,
  angleBam: unavailableInput.nativePlayerAngleBam,
  momentumXFixed: unavailableInput.nativePlayerMomentumXFixed,
  momentumYFixed: unavailableInput.nativePlayerMomentumYFixed,
  sectorIndex: unavailableInput.nativePlayerSectorIndex,
  health: unavailableInput.nativePlayerHealth,
  playerState: unavailableInput.nativePlayerState,
  killCount: unavailableInput.nativePlayerKillCount
}, {
  available: false,
  vitalityAvailable: false,
  xFixed: 0,
  yFixed: 0,
  angleBam: 0,
  momentumXFixed: 0,
  momentumYFixed: 0,
  sectorIndex: -1,
  health: 0,
  playerState: -1,
  killCount: 0
}, "unavailable native player facts must use explicit fail-closed sentinels");
assertJsonEqual(unavailableInput.audio, { nativeEvents: 0, events: [] }, "unavailable audio ring must not leak events");
context.self.AIKernelDoomNativeAudio = {
  readNativeFacts() {
    return {
      run: {
        available: true,
        levelLoadSequenceAvailable: true,
        levelLoadSequence: "3"
      },
      player: { available: false },
      audio: { available: false }
    };
  }
};
assertTaggedThrow(
  () => adapter.createInput(runtimeFixture(), wasmStateFixture(), {}, rawStateFixture()),
  "levelLoadSequence",
  "native level-load sequence must remain a raw integer");
for (const invalidPlayer of [
  { available: "true" },
  {
    available: true,
    xFixed: "-7340032",
    yFixed: 8126464,
    angleBam: 0,
    momentumXFixed: 0,
    momentumYFixed: 0,
    sectorIndex: 7,
    health: 100,
    playerState: 0,
    killCount: 0
  },
  {
    available: true,
    xFixed: -7340032,
    yFixed: 8126464,
    angleBam: 4294967296,
    momentumXFixed: 0,
    momentumYFixed: 0,
    sectorIndex: 7,
    health: 100,
    playerState: 0,
    killCount: 0
  },
  {
    available: true,
    xFixed: -7340032,
    yFixed: 8126464,
    angleBam: 0,
    momentumXFixed: 0,
    momentumYFixed: 0,
    sectorIndex: 1.5,
    health: 100,
    playerState: 0,
    killCount: 0
  },
  {
    available: true,
    xFixed: -7340032,
    yFixed: 8126464,
    angleBam: 0,
    momentumXFixed: 0,
    momentumYFixed: 0,
    sectorIndex: 7,
    health: "100",
    playerState: 0,
    killCount: 0
  },
  {
    available: true,
    xFixed: -7340032,
    yFixed: 8126464,
    angleBam: 0,
    momentumXFixed: 0,
    momentumYFixed: 0,
    sectorIndex: 7,
    health: 100,
    playerState: 0,
    killCount: -1
  }
]) {
  context.self.AIKernelDoomNativeAudio = {
    readNativeFacts() {
      return {
        run: { available: false },
        player: invalidPlayer,
        audio: { available: false }
      };
    }
  };
  assertTaggedThrow(
    () => adapter.createInput(runtimeFixture(), wasmStateFixture(), {}, rawStateFixture()),
    "native player",
    "malformed native player facts must fail closed without coercion");
}
delete context.self.AIKernelDoomNativeAudio;
const missingProviderInput = adapter.createInput(runtimeFixture(), wasmStateFixture(), {}, rawStateFixture());
assertEqual(missingProviderInput.nativeLevelFactsAvailable, false, "missing native helper should remain unavailable");
assertJsonEqual(missingProviderInput.audio, { nativeEvents: 0, events: [] }, "missing native helper should be neutral");
context.self.AIKernelDoomNativeAudio = availableNativeReader;

function neutralWireAction() {
  return {
    moveForward: false,
    moveBackward: false,
    strafeLeft: false,
    strafeRight: false,
    turnYaw: 0,
    useKey: false,
    attackKey: false
  };
}

function unavailableProximity(overrides = {}) {
  return Object.assign({
    traceVersion: 1,
    inputAccepted: false,
    available: false,
    fresh: false,
    truth: "Unknown",
    reason: "native-player-proximity-unavailable",
    observationHash: "",
    wadContentSha256: "",
    wadVerified: false,
    nativeGametic: -1,
    nativeGameState: -1,
    nativeGameEpisode: -1,
    nativeGameMap: -1,
    playerXFixed: 0,
    playerYFixed: 0,
    playerAngleBam: 0,
    playerMomentumXFixed: 0,
    playerMomentumYFixed: 0,
    playerSectorIndex: -1,
    playerX: 0,
    playerY: 0,
    playerMomentumX: 0,
    playerMomentumY: 0,
    headingDegrees: 0,
    closestDoorPointX: 0,
    closestDoorPointY: 0,
    distanceToDoorSegment: 0,
    bearingToDoorDegrees: 0,
    bearingErrorDegrees: 0,
    acquisitionMaximumDistance: 0,
    contactApproachMaximumDistance: 0,
    useMaximumDistance: 0,
    withinAcquisitionRange: false,
    withinContactApproachRange: false,
    withinUseRange: false
  }, overrides);
}

function freshUseProximity(overrides = {}) {
  return Object.assign({
    traceVersion: 1,
    inputAccepted: true,
    available: true,
    fresh: true,
    truth: "Yes",
    reason: "native-first-door-proximity-valid",
    observationHash: "a".repeat(64),
    wadContentSha256,
    wadVerified: true,
    nativeGametic: 510,
    nativeGameState: 0,
    nativeGameEpisode: 1,
    nativeGameMap: 1,
    playerXFixed: 98304000,
    playerYFixed: -163577856,
    playerAngleBam: 0,
    playerMomentumXFixed: 0,
    playerMomentumYFixed: 0,
    playerSectorIndex: -1,
    playerX: 1500,
    playerY: -2496,
    playerMomentumX: 0,
    playerMomentumY: 0,
    headingDegrees: 0,
    closestDoorPointX: 1536,
    closestDoorPointY: -2496,
    distanceToDoorSegment: 36,
    bearingToDoorDegrees: 0,
    bearingErrorDegrees: 0,
    acquisitionMaximumDistance: 256,
    contactApproachMaximumDistance: 96,
    useMaximumDistance: 56,
    withinAcquisitionRange: true,
    withinContactApproachRange: true,
    withinUseRange: true
  }, overrides);
}

function openingNavigationSnapshot(overrides = {}) {
  const base = {
    snapshotVersion: 1,
    geometryVersion: "e1m1-first-door-opening-route-v1",
    policyVersion: "first-door-opening-navigation-v1",
    geometryHash: "1".repeat(64),
    wadContentSha256: "",
    status: "NotStarted",
    blockCode: "ControlNotReady",
    active: false,
    legIndex: 0,
    legId: "spawn-north-lane",
    legStartX: 1056,
    legStartY: -3616,
    targetX: 1056,
    targetY: -3008,
    allowedSectors: [38],
    playerRadius: 16,
    barrelRadius: 10,
    portalInset: 24,
    waypointCompletionRadius: 16,
    maximumCrossTrackDistance: 24,
    alignmentToleranceDegrees: 4,
    defaultTurnYaw: 6,
    maximumTurnYaw: 12,
    nativeGametic: -1,
    playerX: 0,
    playerY: 0,
    headingDegrees: 0,
    playerSectorIndex: -1,
    targetDistance: 3188,
    targetBearingDegrees: 289.3,
    bearingErrorDegrees: 70.7,
    doorDistanceToSegment: 1159.972413465079,
    doorBearingDegrees: 65.55604521958347,
    doorBearingErrorDegrees: 24.443954780416533,
    alongTrackDistance: -3616,
    crossTrackDistance: 0,
    portal149SignedSide: 2880,
    portalEvidenceSatisfied: true,
    portal150IntersectionY: -2700.8,
    portal150EvidenceSatisfied: false,
    playerMomentumX: 0,
    playerMomentumY: 0,
    stationaryMomentumMaximum: 0.5,
    stationary: true,
    doorSightlineCertified: false,
    stationaryBearingAligned: false,
    readyForAcquisition: false,
    routeFrames: 0,
    routeTimeoutFrames: 480,
    routeRemainingFrames: 480,
    legFrames: 0,
    legTimeoutFrames: 180,
    legRemainingFrames: 180,
    poseMissingFrames: 0,
    maximumPoseMissingFrames: 30,
    forwardProgressSamples: 0,
    requiredProgressSamples: 30,
    progressWindowStartDistance: 0,
    minimumProgressDistance: 16,
    recoveryCount: 0,
    maximumRecoveries: 2,
    realignAttemptsForLeg: 0,
    forcedStopFrames: 2,
    forcedStopFramesRemaining: 0,
    returningToCertifiedWaypoint: false,
    recoveryWaypointIndex: -1,
    resumeLegIndex: -1,
    sightlineStartedAtControlTick: -1,
    sightlineFrames: 0,
    sightlineTimeoutFrames: 60,
    action: neutralWireAction(),
    failureCode: "",
    observationHash: "2".repeat(64)
  };
  return Object.assign({}, base, overrides, {
    allowedSectors: Array.isArray(overrides.allowedSectors)
      ? overrides.allowedSectors.slice()
      : base.allowedSectors.slice(),
    action: Object.assign({}, base.action, overrides.action || {})
  });
}

function activeOpeningNavigation(overrides = {}) {
  return openingNavigationSnapshot(Object.assign({
    wadContentSha256,
    status: "Navigating",
    blockCode: "WaypointPending",
    active: true,
    nativeGametic: 510,
    playerX: 1056,
    playerY: -3616,
    headingDegrees: 90,
    playerSectorIndex: 38,
    targetDistance: 608,
    targetBearingDegrees: 90,
    bearingErrorDegrees: 0,
    alongTrackDistance: 0,
    crossTrackDistance: 0,
    portal149SignedSide: -736,
    action: Object.assign(neutralWireAction(), { moveForward: true })
  }, overrides));
}

function unavailableAcceptedUseAck(overrides = {}) {
  return Object.assign({
    snapshotVersion: 1,
    available: false,
    sessionId: "",
    runId: "",
    runGeneration: 0,
    acceptedAtControlTick: 0,
    decisionControlTick: 0,
    useAttemptId: 0,
    actionMode: "",
    hostPath: "",
    queuedUseInputEventSequence: 0,
    pumpedUseInputEventSequence: 0,
    usePumped: false,
    manualUseSequenceAtDecision: 0
  }, overrides);
}

function acceptedUseAck(overrides = {}) {
  return Object.assign({
    snapshotVersion: 1,
    available: true,
    sessionId: "browser-session",
    runId: "browser-run-1",
    runGeneration: 1,
    acceptedAtControlTick: 8,
    decisionControlTick: 7,
    useAttemptId: 2,
    actionMode: "csharp-exact",
    hostPath: "native-action",
    queuedUseInputEventSequence: 19,
    pumpedUseInputEventSequence: 19,
    usePumped: true,
    manualUseSequenceAtDecision: 5
  }, overrides);
}

function transitionReplaySnapshot(overrides = {}) {
  const base = {
    snapshotVersion: 4,
    sessionId: "browser-session",
    runId: "browser-run-1",
    runGeneration: 1,
    controlTick: 7,
    eventKind: "state-transition+stationary-use-command",
    previousState: "PreUseStop",
    state: "StationaryUse",
    reasonCode: "pre-use-stop-complete-stationary-use",
    action: Object.assign(neutralWireAction(), { useKey: true }),
    runRequested: false,
    ownershipUnit: "StationaryUse",
    ownershipDisposition: "Exclusive",
    ownerId: "first-door.stationary-use",
    doorIdentityTruth: "Yes",
    computerRoomBlockCode: "NotInConfirmationPhase",
    computerRoomStableFrames: 0,
    proximity: freshUseProximity(),
    openingNavigation: activeOpeningNavigation({
      status: "ReadyForAcquisition",
      blockCode: "None",
      doorSightlineCertified: true,
      stationaryBearingAligned: true,
      portal150EvidenceSatisfied: true,
      readyForAcquisition: true,
      sightlineStartedAtControlTick: 6,
      sightlineFrames: 2,
      action: neutralWireAction()
    }),
    acceptedUseAck: unavailableAcceptedUseAck(),
    observationHash: "b".repeat(64),
    visualContentHash: "c".repeat(64),
    replayObservation: {}
  };
  return Object.assign({}, base, overrides, {
    action: Object.assign({}, base.action, overrides.action || {}),
    proximity: Object.assign({}, base.proximity, overrides.proximity || {}),
    openingNavigation: Object.assign(
      {},
      base.openingNavigation,
      overrides.openingNavigation || {},
      {
        action: Object.assign(
          {},
          base.openingNavigation.action,
          overrides.openingNavigation?.action || {})
      }),
    acceptedUseAck: Object.assign({}, base.acceptedUseAck, overrides.acceptedUseAck || {}),
    replayObservation: Object.assign({}, base.replayObservation, overrides.replayObservation || {})
  });
}

function unavailableVitalityTrace(scope = {}) {
  return {
    traceVersion: 1,
    sessionId: scope.sessionId || "browser-session",
    runId: scope.runId || "browser-run-1",
    runGeneration: scope.runGeneration || 1,
    evaluatedAtControlTick: scope.controlTick || 1,
    available: false,
    fresh: false,
    observationReason: "native-player-vitality-unavailable",
    provenance: "native-player-vitality-unavailable",
    proximityObservationHash: "",
    vitalityObservationHash: "",
    nativeGametic: -1,
    playerHealth: -1,
    playerState: -1,
    playerKillCount: -1,
    deathCandidate: false,
    deathCandidateReason: "native-player-vitality-unavailable",
    consecutiveDeathGametics: 0,
    requiredDeathGametics: 3,
    nativeDeathConfirmed: false,
    confirmedAtNativeGametic: -1,
    confirmedAtControlTick: 0,
    nativeEvidenceAuthoritative: false,
    authority: "none",
    restartRequested: false,
    restartRequestIssuedThisTick: false,
    restartRequestSequence: 0,
    restartRequestId: "",
    restartReason: "none"
  };
}

const audioCatalogIdentityHash = "2fd2ba92b0ac0761b4c60ea636532420e71475adfb49f33ac1994c37009dd756";

function audioCatalogTraceFixture(scope = {}, overrides = {}) {
  const base = {
    traceVersion: 1,
    catalogVersion: "doom-native-sfx-catalog-v1",
    sourceRevision: "dcb7a8dbc7a16ce3dda29382ac9aae9d77d21284",
    catalogIdentityHash: audioCatalogIdentityHash,
    sessionId: scope.sessionId || "browser-session",
    runId: scope.runId || "browser-run-1",
    runGeneration: scope.runGeneration || 1,
    evaluatedAtControlTick: scope.controlTick || 1,
    latestObservedSequence: 0,
    capacity: 32,
    totalNewEventCount: 0,
    retainedEventCount: 0,
    unknownEventCount: 0,
    truncated: false,
    diagnosticOnly: true,
    events: []
  };
  return Object.assign({}, base, overrides, {
    events: Array.isArray(overrides.events) ? overrides.events : base.events
  });
}

function audioCatalogObservationFixture(scope = {}, overrides = {}) {
  const base = {
    catalogVersion: "doom-native-sfx-catalog-v1",
    sourceRevision: "dcb7a8dbc7a16ce3dda29382ac9aae9d77d21284",
    catalogIdentityHash: audioCatalogIdentityHash,
    sessionId: scope.sessionId || "browser-session",
    runId: scope.runId || "browser-run-1",
    runGeneration: scope.runGeneration || 1,
    observedAtControlTick: scope.controlTick || 1,
    sequence: 1,
    sfxId: 20,
    rawSfxName: " SFX_DOROPN ",
    normalizedSfxName: "doropn",
    expectedSfxName: "doropn",
    catalogued: true,
    meaningCode: "mechanism-door-open",
    meaningLabel: "Door open",
    classificationReason: "exact-id-name-pair",
    eventIdentityHash: "b".repeat(64),
    diagnosticOnly: true
  };
  return Object.assign({}, base, overrides);
}

function baseDecision(overrides = {}) {
  const base = {
    implementationVersion: "first-door-control-v6",
    policyVersion: "first-door-policy-v6",
    contractVersion: 4,
    sessionId: "browser-session",
    runId: "browser-run-1",
    previousState: "OpeningTransit",
    nextState: "OpeningTransit",
    state: "OpeningTransit",
    transitioned: false,
    ownershipUnit: "OpeningTransit",
    ownershipDisposition: "NotAcquired",
    action: neutralWireAction(),
    runRequested: false,
    exclusive: false,
    handOffToPostDoor: false,
    completed: false,
    openConfirmed: false,
    openConfirmationSource: "None",
    acceptedOpenEvidenceId: "",
    acceptedOpenEvidenceSource: "None",
    semanticDelta: {
      hasChanges: false,
      sessionId: "browser-session",
      runId: "browser-run-1",
      runGeneration: 1,
      controlTick: 1,
      doorOpenedCount: 0,
      firstDoorOpened: false,
      computerRoomEntered: false,
      source: "None"
    },
    failedUseEvidenceAccepted: false,
    failedUseAudioEventId: "",
    acceptedFailedUseEvidenceId: "",
    acceptedFailedUseEvidenceSource: "None",
    evidenceObservationCode: "none",
    appliedActionAckValid: false,
    appliedActionAckCode: "not-expected",
    useAckWindowActive: false,
    acknowledgedUseDecisionControlTick: 0,
    acknowledgedUseAttemptId: 0,
    acknowledgedManualUseSequence: 0,
    useOutcomeRejectionCode: "",
    ownerId: "first-door.opening-transit",
    reasonCode: "opening-transit",
    runGeneration: 1,
    controlTick: 1,
    stateEnteredAtControlTick: 1,
    prediction: 0,
    manualUseSequence: 5,
    predictionAnomaly: false,
    anomalyCode: "",
    lifecycleState: "running",
    modelState: "ready",
    contractError: "",
    resetOperationId: "reset-op-1",
    lifecycleEvent: "run-started",
    runBoundaryApplied: true,
    doorIdentityTruth: "Yes",
    doorIdentityReason: "first-door-identified",
    doorIdentityConfidence: 0.55,
    proximity: unavailableProximity(),
    vitalityTrace: null,
    audioCatalogTrace: null,
    nativeDeathConfirmed: false,
    restartRequested: false,
    restartRequestId: "",
    restartReason: "none",
    openingNavigation: openingNavigationSnapshot(),
    acquisitionTrace: {},
    acceptedUseAck: unavailableAcceptedUseAck(),
    transitionReplaySnapshots: [],
    nativeLevelFactsAvailable: true,
    nativeLevelLoadSequenceAvailable: true,
    nativeLevelLoadSequence: 3,
    nativeLevelTime: 310,
    nativeGametic: 510,
    nativeLevelStartTic: 200,
    nativeGameState: 1,
    nativeGameEpisode: 1,
    nativeGameMap: 1,
    stateFrame: 0,
    retryCount: 0,
    recoveryCount: 0,
    remainingUseRetries: 4,
    remainingRecoveryAttempts: 6,
    alignmentSweepDirection: 0,
    useAttemptId: 0,
    pendingUseAttemptId: 0,
    pendingUseCorrelationState: "none",
    terminalFailureCode: ""
  };
  const result = Object.assign({}, base, overrides, {
    action: Object.assign({}, base.action, overrides.action || {}),
    semanticDelta: Object.assign({}, base.semanticDelta, overrides.semanticDelta || {}),
    proximity: Object.assign({}, base.proximity, overrides.proximity || {}),
    openingNavigation: Object.assign(
      {},
      base.openingNavigation,
      overrides.openingNavigation || {},
      {
        action: Object.assign({}, base.openingNavigation.action, overrides.openingNavigation?.action || {})
      }),
    acquisitionTrace: overrides.acquisitionTrace || base.acquisitionTrace,
    acceptedUseAck: Object.assign({}, base.acceptedUseAck, overrides.acceptedUseAck || {}),
    transitionReplaySnapshots: overrides.transitionReplaySnapshots || base.transitionReplaySnapshots
  });
  result.vitalityTrace = Object.assign(
    unavailableVitalityTrace(result),
    overrides.vitalityTrace || {});
  result.audioCatalogTrace = audioCatalogTraceFixture(
    result,
    overrides.audioCatalogTrace || {});
  return result;
}

function exclusiveDecision(overrides = {}) {
  const defaults = {
    previousState: "OpeningTransit",
    nextState: "Approach",
    state: "Approach",
    transitioned: true,
    ownershipUnit: "FirstDoorApproach",
    ownershipDisposition: "Exclusive",
    action: Object.assign(neutralWireAction(), { moveForward: true }),
    runRequested: true,
    exclusive: true,
    ownerId: "first-door.approach",
    reasonCode: "route-evidence-stable",
    controlTick: 2,
    semanticDelta: { controlTick: 2 }
  };
  return baseDecision(Object.assign({}, defaults, overrides, {
    action: Object.assign({}, defaults.action, overrides.action || {}),
    semanticDelta: Object.assign({}, defaults.semanticDelta, overrides.semanticDelta || {})
  }));
}

function openingNavigateDecision(overrides = {}) {
  const defaults = {
    previousState: "OpeningTransit",
    nextState: "OpeningNavigate",
    state: "OpeningNavigate",
    transitioned: true,
    ownershipUnit: "OpeningTransit",
    ownershipDisposition: "Exclusive",
    action: Object.assign(neutralWireAction(), { moveForward: true }),
    runRequested: false,
    exclusive: true,
    ownerId: "first-door.opening-transit",
    reasonCode: "opening-navigation:waypoint-pending",
    controlTick: 2,
    semanticDelta: { controlTick: 2 },
    openingNavigation: activeOpeningNavigation()
  };
  return baseDecision(Object.assign({}, defaults, overrides, {
    action: Object.assign({}, defaults.action, overrides.action || {}),
    semanticDelta: Object.assign({}, defaults.semanticDelta, overrides.semanticDelta || {}),
    openingNavigation: Object.assign(
      {},
      defaults.openingNavigation,
      overrides.openingNavigation || {},
      {
        action: Object.assign(
          {},
          defaults.openingNavigation.action,
          overrides.openingNavigation?.action || {})
      })
  }));
}

function handoffDecision(disposition = "HandOff", overrides = {}) {
  const completed = disposition === "Completed";
  const controlTick = completed ? 10 : 9;
  const defaults = {
    previousState: completed ? "AwaitComputerRoom" : "PostOpenShove",
    nextState: completed ? "Complete" : "AwaitComputerRoom",
    state: completed ? "Complete" : "AwaitComputerRoom",
    transitioned: true,
    ownershipUnit: "ComputerRoomEntryConfirmation",
    ownershipDisposition: disposition,
    exclusive: false,
    handOffToPostDoor: true,
    completed,
    openConfirmed: true,
    openConfirmationSource: "TrustedAudio",
    acceptedOpenEvidenceId: "run-1-native-sfx-7",
    acceptedOpenEvidenceSource: "TrustedAudio",
    ownerId: "first-door.computer-room-entry-confirmation",
    reasonCode: completed ? "computer-room-confirmed" : "post-open-shove-complete",
    controlTick,
    semanticDelta: {
      hasChanges: false,
      controlTick,
      doorOpenedCount: 1,
      firstDoorOpened: true,
      computerRoomEntered: completed,
      source: "TrustedAudio"
    }
  };
  return baseDecision(Object.assign({}, defaults, overrides, {
    action: Object.assign({}, defaults.action, overrides.action || {}),
    semanticDelta: Object.assign({}, defaults.semanticDelta, overrides.semanticDelta || {})
  }));
}

function failedSafeDecision(overrides = {}) {
  const defaults = {
    previousState: "AwaitOutcome",
    nextState: "FailedSafeStop",
    state: "FailedSafeStop",
    transitioned: true,
    ownershipUnit: "UseOutcome",
    ownershipDisposition: "FailedSafeStop",
    exclusive: true,
    ownerId: "first-door.failed-safe-stop",
    reasonCode: "retry-budget-exhausted",
    terminalFailureCode: "retry-budget-exhausted",
    controlTick: 12,
    semanticDelta: { controlTick: 12 }
  };
  return baseDecision(Object.assign({}, defaults, overrides, {
    action: Object.assign({}, defaults.action, overrides.action || {}),
    semanticDelta: Object.assign({}, defaults.semanticDelta, overrides.semanticDelta || {})
  }));
}

const packetInput = clone(input);
const notAcquired = baseDecision();
const openingNavigate = openingNavigateDecision();
const exclusive = exclusiveDecision();
const handoff = handoffDecision();
const completed = handoffDecision("Completed");
const failedSafe = failedSafeDecision();
const freshAudioCatalogDecision = baseDecision({
  controlTick: 4,
  semanticDelta: { controlTick: 4 }
});
freshAudioCatalogDecision.audioCatalogTrace = audioCatalogTraceFixture(
  freshAudioCatalogDecision,
  {
    latestObservedSequence: 12,
    totalNewEventCount: 2,
    retainedEventCount: 2,
    unknownEventCount: 1,
    events: [
      audioCatalogObservationFixture(freshAudioCatalogDecision, {
        sequence: 11
      }),
      audioCatalogObservationFixture(freshAudioCatalogDecision, {
        sequence: 12,
        sfxId: 20,
        rawSfxName: "wrong",
        normalizedSfxName: "wrong",
        expectedSfxName: "doropn",
        catalogued: false,
        meaningCode: "unknown-sfx",
        meaningLabel: "Unknown SFX",
        classificationReason: "id-name-mismatch",
        eventIdentityHash: "c".repeat(64)
      })
    ]
  });
assert(adapter.validateDecision(freshAudioCatalogDecision) === freshAudioCatalogDecision,
  "a fresh C# audio catalog trace should cross the JS wire unchanged");
assertEqual(
  freshAudioCatalogDecision.audioCatalogTrace.events[0].meaningCode,
  "mechanism-door-open",
  "JS validation must preserve the C# catalog meaning without reclassifying it");
assertEqual(
  freshAudioCatalogDecision.audioCatalogTrace.events[1].meaningCode,
  "unknown-sfx",
  "JS validation must preserve the C# unknown classification without inferring a meaning");
const truncatedAudioCatalogDecision = baseDecision({
  controlTick: 5,
  semanticDelta: { controlTick: 5 }
});
truncatedAudioCatalogDecision.audioCatalogTrace = audioCatalogTraceFixture(
  truncatedAudioCatalogDecision,
  {
    latestObservedSequence: 35,
    totalNewEventCount: 35,
    retainedEventCount: 32,
    unknownEventCount: 3,
    truncated: true,
    events: Array.from({ length: 32 }, (_, index) => {
      const sequence = index + 4;
      return audioCatalogObservationFixture(truncatedAudioCatalogDecision, {
        sequence,
        eventIdentityHash: sequence.toString(16).padStart(64, "0")
      });
    })
  });
assert(adapter.validateDecision(truncatedAudioCatalogDecision) === truncatedAudioCatalogDecision,
  "a canonical bounded C# audio trace should retain the newest 32 of 35 events");
const readinessLoss = failedSafeDecision({
  previousState: "OpeningNavigate",
  ownershipUnit: "OpeningTransit",
  reasonCode: "control-readiness-lost",
  terminalFailureCode: "control-readiness-lost",
  openingNavigation: openingNavigationSnapshot({
    status: "Failed",
    blockCode: "ControlNotReady",
    active: true,
    nativeGametic: -1,
    action: neutralWireAction(),
    failureCode: "opening-navigation-control-readiness-lost"
  })
});

assert(adapter.allowsLegacy(notAcquired), "NotAcquired should allow the explicit legacy owner");
assert(!adapter.allowsLegacy(openingNavigate), "OpeningNavigate Exclusive must not allow legacy prediction");
assert(!adapter.allowsLegacy(exclusive), "Exclusive must not allow legacy prediction");
assert(adapter.allowsLegacy(handoff), "valid HandOff should allow the next owner");
assert(adapter.allowsLegacy(completed), "valid Completed should allow the next owner");
assert(!adapter.allowsLegacy(failedSafe), "FailedSafeStop must not allow legacy prediction");
assert(!adapter.allowsLegacy(readinessLoss), "readiness-loss FailedSafeStop must not allow legacy prediction");

let bridgeCalls = 0;
let bridgedInput = null;
context.self.aiKernelDoomControl = {
  evaluateBrowserFirstDoor(value) {
    bridgeCalls += 1;
    bridgedInput = value;
    return baseDecision({
      audioCatalogTrace: { latestObservedSequence: 5 }
    });
  }
};
const evaluatedRuntime = runtimeFixture();
const evaluated = adapter.evaluate(evaluatedRuntime, inputState, { predictions: 42 }, rawStateFixture());
assertEqual(bridgeCalls, 1, "evaluate should call the C# bridge exactly once");
assert(evaluated.input === bridgedInput, "evaluate should return the exact input sent to C#");
assertEqual(evaluated.decision.ownershipDisposition, "NotAcquired", "evaluate should return the validated decision packet");
assertEqual(bridgedInput.audio.nativeEvents, 7,
  "the synthetic cursor test requires input audio to be newer than the C# acknowledgement");
assertJsonEqual(evaluatedRuntime.autoplayCSharpNativeAudioCursor, {
  sessionId: "browser-session",
  runId: "browser-run-1",
  runGeneration: 1,
  afterSequence: 5
}, "a validated C# response should commit only the C#-acknowledged native-audio cursor");
adapter.createInput(evaluatedRuntime, inputState, { predictions: 43 }, rawStateFixture({ frame: 38 }));
assertEqual(nativeReadArguments.afterSequence, 5,
  "the next FirstDoor read must preserve events newer than the C#-acknowledged cursor");

const nextRunRuntime = runtimeFixture();
nextRunRuntime.autoplayCSharpNativeAudioCursor = {
  sessionId: "browser-session",
  runId: "browser-run-1",
  runGeneration: 1,
  afterSequence: 7
};
nextRunRuntime.autoplayCSharpFirstDoorScope = Object.assign(
  {},
  nextRunRuntime.autoplayCSharpFirstDoorScope,
  { runId: "browser-run-2", runGeneration: 2 });
adapter.createInput(nextRunRuntime, inputState, {}, rawStateFixture());
assertEqual(nativeReadArguments.afterSequence, 0, "a real run boundary must reset the native-audio cursor");

context.self.aiKernelDoomControl = {
  evaluateBrowserFirstDoor() {
    bridgeCalls += 1;
    return JSON.stringify(exclusiveDecision());
  }
};
const jsonEvaluated = adapter.evaluate(runtimeFixture(), inputState, {}, rawStateFixture());
assertEqual(jsonEvaluated.decision.ownershipDisposition, "Exclusive", "evaluate should accept the bridge JSON ABI");

const monotonicRuntime = runtimeFixture();
monotonicRuntime.autoplayCSharpFirstDoorDecision = baseDecision({ controlTick: 4, semanticDelta: { controlTick: 4 } });
let monotonicBridgeCalls = 0;
context.self.aiKernelDoomControl = {
  evaluateBrowserFirstDoor() {
    monotonicBridgeCalls += 1;
    return baseDecision({ controlTick: 4, semanticDelta: { controlTick: 4 } });
  }
};
assertTaggedThrow(
  () => adapter.evaluate(monotonicRuntime, inputState, {}, rawStateFixture()),
  "monotonically",
  "evaluate should reject a duplicate C# control tick");
assertEqual(monotonicBridgeCalls, 1, "monotonic validation must still use one bridge call");
assert(monotonicRuntime.autoplayCSharpNativeAudioCursor === undefined,
  "a rejected C# response must not acknowledge native audio events");

context.self.aiKernelDoomControl = {
  evaluateBrowserFirstDoor() {
    return "{";
  }
};
assertTaggedThrow(
  () => adapter.evaluate(runtimeFixture(), inputState, {}, rawStateFixture()),
  "malformed JSON",
  "malformed bridge JSON should fail closed");

let legacyCalls = 0;
let legacyArgument = null;
const legacyAction = { move: "back", objective: "legacy-objective", pipeline: "legacy-owner" };
function legacyPredict(state) {
  legacyCalls += 1;
  legacyArgument = state;
  return legacyAction;
}

const rawNotAcquiredState = wasmStateFixture();
const legacyResult = adapter.dispatch(
  { input: packetInput, decision: notAcquired },
  { runtime: runtimeFixture(), wasmState: rawNotAcquiredState, legacyPredict });
assertEqual(legacyResult.mode, "legacy", "NotAcquired should select legacy mode");
assert(legacyResult.action === legacyAction, "NotAcquired should preserve the explicit legacy proposal");
assert(legacyResult.legacyState === rawNotAcquiredState, "NotAcquired should pass the raw state without projection");
assert(legacyArgument === rawNotAcquiredState, "legacy callback should receive the raw state before ownership acquisition");
assertEqual(legacyCalls, 1, "NotAcquired should call legacy exactly once");

legacyCalls = 0;
const openingNavigateResult = adapter.dispatch(
  { input: packetInput, decision: openingNavigate },
  { runtime: runtimeFixture(), wasmState: wasmStateFixture(), legacyPredict });
assertEqual(openingNavigateResult.mode, "exclusive", "OpeningNavigate should remain a C# exact action");
assertEqual(legacyCalls, 0, "OpeningNavigate must not evaluate the legacy controller");
assertEqual(openingNavigateResult.action.move, "forward", "OpeningNavigate should project C# forward mechanically");
assertEqual(openingNavigateResult.action.pipeline, "first-door.opening-transit",
  "OpeningNavigate projection should preserve the C# owner id");
assert(openingNavigateResult.decision.openingNavigation === openingNavigate.openingNavigation,
  "OpeningNavigate snapshot must cross dispatch unchanged");
assertEqual(
  openingNavigateResult.decision.openingNavigation.doorBearingDegrees,
  openingNavigate.openingNavigation.doorBearingDegrees,
  "OpeningNavigate should preserve the C# door bearing without JS recomputation");
assertEqual(
  openingNavigateResult.decision.openingNavigation.doorBearingErrorDegrees,
  openingNavigate.openingNavigation.doorBearingErrorDegrees,
  "OpeningNavigate should preserve the C# door bearing error without JS recomputation");

const waitingForPose = openingNavigateDecision({
  action: neutralWireAction(),
  reasonCode: "opening-navigation:proximity-unavailable",
  openingNavigation: activeOpeningNavigation({
    status: "WaitingForPose",
    blockCode: "ProximityUnavailable",
    nativeGametic: -1,
    readyForAcquisition: false,
    action: neutralWireAction()
  })
});
assert(!adapter.allowsLegacy(waitingForPose),
  "active WaitingForPose must retain exclusive C# ownership while nativeGametic is unavailable");
legacyCalls = 0;
const waitingForPoseResult = adapter.dispatch(
  { input: packetInput, decision: waitingForPose },
  { runtime: runtimeFixture(), wasmState: wasmStateFixture(), legacyPredict });
assertEqual(waitingForPoseResult.mode, "exclusive",
  "active WaitingForPose must remain in the exclusive C# pipeline");
assertEqual(legacyCalls, 0, "active WaitingForPose must not evaluate legacy prediction");
assertJsonEqual(
  {
    move: waitingForPoseResult.action.move,
    turn: waitingForPoseResult.action.turn,
    turnYaw: waitingForPoseResult.action.turnYaw,
    fire: waitingForPoseResult.action.fire,
    strafe: waitingForPoseResult.action.strafe,
    use: waitingForPoseResult.action.use,
    run: waitingForPoseResult.action.run
  },
  { move: "none", turn: "none", turnYaw: 0, fire: false, strafe: false, use: false, run: false },
  "active WaitingForPose must project only a neutral action");

for (const blockCode of ["SightlineBudgetExhausted", "InvalidState"]) {
  const enumProjection = baseDecision({
    openingNavigation: openingNavigationSnapshot({
      status: "Failed",
      blockCode,
      failureCode: `opening-navigation-${blockCode}`
    })
  });
  assert(adapter.allowsLegacy(enumProjection),
    `${blockCode} should remain a valid C# opening-navigation wire enum`);
}

const observedAcquisitionTrace = {
  traceVersion: 1,
  available: true,
  evaluatedAtControlTick: 1,
  transportPhaseReady: false,
  transportRouteMode: "unknown",
  transportCurrentRoute: "unknown",
  routeModeMatches: false,
  currentRouteMatches: false,
  routeCandidate: false,
  routeStableFrames: 0,
  peakRouteStableFrames: 0,
  requiredRouteStableFrames: 3,
  positiveRouteCandidateCount: 0,
  firstRouteCandidateControlTick: 0,
  stablePhaseReady: false,
  routeEvidence: 0.55,
  minimumRouteEvidence: 0.36,
  ready: false,
  blockCode: "RouteModeMismatch",
  acquiredAtControlTick: 0
};
const observedNotAcquired = baseDecision({ acquisitionTrace: observedAcquisitionTrace });
assert(adapter.allowsLegacy(observedNotAcquired), "observer-only acquisition trace must not change legacy admission");
legacyCalls = 0;
const observedLegacyResult = adapter.dispatch(
  { input: packetInput, decision: observedNotAcquired },
  { runtime: runtimeFixture(), wasmState: rawNotAcquiredState, legacyPredict });
assertEqual(observedLegacyResult.mode, "legacy", "observer-only acquisition trace must not change dispatch mode");
assert(observedLegacyResult.action === legacyAction, "observer-only acquisition trace must not change the selected action");
assert(observedLegacyResult.decision.acquisitionTrace === observedAcquisitionTrace,
  "observer-only acquisition trace should remain attached to the decision snapshot");
assertEqual(legacyCalls, 1, "observer-only acquisition trace must not add a behavior callback");

legacyCalls = 0;
legacyArgument = null;
const exclusiveResult = adapter.dispatch(
  { input: packetInput, decision: exclusive },
  { runtime: runtimeFixture(), wasmState: wasmStateFixture(), legacyPredict });
assertEqual(exclusiveResult.mode, "exclusive", "Exclusive should select C# action mode");
assertEqual(legacyCalls, 0, "Exclusive must not evaluate the legacy controller");
assertEqual(exclusiveResult.legacyState, null, "Exclusive must not manufacture a legacy state");
assertJsonEqual(
  {
    move: exclusiveResult.action.move,
    turn: exclusiveResult.action.turn,
    turnYaw: exclusiveResult.action.turnYaw,
    fire: exclusiveResult.action.fire,
    strafe: exclusiveResult.action.strafe,
    use: exclusiveResult.action.use,
    run: exclusiveResult.action.run
  },
  {
    move: "forward",
    turn: "none",
    turnYaw: 0,
    fire: false,
    strafe: false,
    use: false,
    run: true
  },
  "Exclusive should mechanically project only the seven browser action fields");
for (const forbidden of ["objective", "legacyMetadata", "csharpFirstDoorDecision", "action"]) {
  assert(
    !Object.prototype.hasOwnProperty.call(exclusiveResult.action, forbidden),
    `fresh Exclusive action must not contain ${forbidden}`);
}
assertEqual(exclusiveResult.action.pipeline, exclusive.ownerId, "exclusive metadata should come from the C# owner");
assertEqual(exclusiveResult.action.stage, exclusive.reasonCode, "exclusive metadata should come from the C# reason");
assert(exclusiveResult.decision.openingNavigation === exclusive.openingNavigation,
  "opening navigation snapshot must cross dispatch without JS reclassification");

const stationaryUse = exclusiveDecision({
  previousState: "PreUseStop",
  nextState: "StationaryUse",
  state: "StationaryUse",
  ownershipUnit: "StationaryUse",
  ownerId: "first-door.stationary-use",
  reasonCode: "pre-use-stop-complete-stationary-use",
  runRequested: false,
  action: Object.assign(neutralWireAction(), { useKey: true }),
  controlTick: 7,
  semanticDelta: { controlTick: 7 },
  useAttemptId: 2,
  pendingUseAttemptId: 2,
  pendingUseCorrelationState: "use-issued",
  proximity: freshUseProximity(),
  transitionReplaySnapshots: [transitionReplaySnapshot()]
});
const stationaryResult = adapter.dispatch(
  { input: packetInput, decision: stationaryUse },
  { runtime: runtimeFixture(), wasmState: wasmStateFixture(), legacyPredict });
assertEqual(stationaryResult.action.use, true, "stationary Use should be projected exactly");
assertEqual(stationaryResult.action.move, "none", "stationary Use must not inherit movement");
assertEqual(stationaryResult.action.turnYaw, 0, "stationary Use must not inherit yaw");
assertEqual(stationaryResult.decision.transitionReplaySnapshots[0].snapshotVersion, 4,
  "transition replay snapshot v4 must cross dispatch unchanged");
const stationaryReplay = stationaryResult.decision.transitionReplaySnapshots[0];
assertEqual(stationaryReplay.action.useKey, true,
  "transition replay must preserve the outer selected action instead of only nested navigation");
assertEqual(stationaryReplay.runRequested, false,
  "transition replay must preserve the outer run request");
assertEqual(stationaryReplay.ownershipUnit, "StationaryUse",
  "transition replay must preserve the outer ownership unit");
assertEqual(stationaryReplay.ownershipDisposition, "Exclusive",
  "transition replay must preserve the outer ownership disposition");
assertEqual(stationaryReplay.ownerId, "first-door.stationary-use",
  "transition replay must preserve the outer owner id");

const acceptedAckDecision = exclusiveDecision({
  previousState: "StationaryUse",
  nextState: "AwaitOutcome",
  state: "AwaitOutcome",
  ownershipUnit: "UseOutcome",
  ownerId: "first-door.use-outcome",
  reasonCode: "stationary-use-issued",
  runRequested: false,
  action: neutralWireAction(),
  controlTick: 8,
  semanticDelta: { controlTick: 8 },
  appliedActionAckValid: true,
  appliedActionAckCode: "accepted",
  useAckWindowActive: true,
  acknowledgedUseDecisionControlTick: 7,
  acknowledgedUseAttemptId: 2,
  acknowledgedManualUseSequence: 5,
  useAttemptId: 2,
  pendingUseAttemptId: 2,
  pendingUseCorrelationState: "awaiting-outcome",
  proximity: freshUseProximity({ nativeGametic: 511, observationHash: "d".repeat(64) }),
  acceptedUseAck: acceptedUseAck(),
  transitionReplaySnapshots: [
    transitionReplaySnapshot(),
    transitionReplaySnapshot({
      controlTick: 8,
      eventKind: "state-transition+applied-use-ack-accepted",
      previousState: "StationaryUse",
      state: "AwaitOutcome",
      reasonCode: "stationary-use-issued",
      action: neutralWireAction(),
      runRequested: false,
      ownershipUnit: "UseOutcome",
      ownershipDisposition: "Exclusive",
      ownerId: "first-door.use-outcome",
      proximity: freshUseProximity({ nativeGametic: 511, observationHash: "d".repeat(64) }),
      acceptedUseAck: acceptedUseAck(),
      observationHash: "e".repeat(64),
      visualContentHash: "f".repeat(64)
    })
  ]
});
adapter.validateDecision(acceptedAckDecision);

const nativeRestartRequestId = "native-death:1:512:9";
const confirmedVitalityDecision = baseDecision({
  controlTick: 9,
  semanticDelta: { controlTick: 9 },
  nativeDeathConfirmed: true,
  restartRequested: true,
  restartRequestId: nativeRestartRequestId,
  restartReason: "native-player-death-confirmed",
  vitalityTrace: {
    available: true,
    fresh: true,
    observationReason: "native-player-proximity-observed",
    provenance: "native-player-vitality",
    proximityObservationHash: "a".repeat(64),
    vitalityObservationHash: "b".repeat(64),
    nativeGametic: 512,
    playerHealth: 0,
    playerState: 1,
    playerKillCount: 1,
    deathCandidate: true,
    deathCandidateReason: "native-health-and-player-state-dead",
    consecutiveDeathGametics: 3,
    nativeDeathConfirmed: true,
    confirmedAtNativeGametic: 512,
    confirmedAtControlTick: 9,
    nativeEvidenceAuthoritative: true,
    authority: "native-player-vitality",
    restartRequested: true,
    restartRequestIssuedThisTick: true,
    restartRequestSequence: 1,
    restartRequestId: nativeRestartRequestId,
    restartReason: "native-player-death-confirmed"
  }
});
adapter.validateDecision(confirmedVitalityDecision);
assertEqual(confirmedVitalityDecision.restartRequested, true,
  "validated C# native-death restart request should cross unchanged");
assertTaggedThrow(
  () => adapter.validateDecision(Object.assign({}, confirmedVitalityDecision, {
    restartRequestId: "other-request"
  })),
  "restartRequestId does not match vitalityTrace",
  "top-level restart transport must match the C# vitality trace");
assertTaggedThrow(
  () => adapter.validateDecision(baseDecision({
    vitalityTrace: { requiredDeathGametics: 2 }
  })),
  "requiredDeathGametics must be 3",
  "the native death debounce contract must not be relaxed by the JS wire");

const rawHandoffState = wasmStateFixture();
rawHandoffState.nestedReplay = {
  items: [{ value: 1 }],
  bytes: new Uint8Array([2, 4, 6])
};
rawHandoffState.milestones.nested = { value: 3 };
const rawHandoffBefore = clone(rawHandoffState);
const handoffRuntime = runtimeFixture();
handoffRuntime.autoplayMilestones = { existing: true };
legacyCalls = 0;
legacyArgument = null;
function mutatingNextOwner(state) {
  legacyCalls += 1;
  legacyArgument = state;
  state.nestedReplay.items[0].value = 99;
  state.nestedReplay.bytes[0] = 88;
  state.milestones.nested.value = 77;
  return legacyAction;
}
const handoffResult = adapter.dispatch(
  { input: packetInput, decision: handoff },
  { runtime: handoffRuntime, wasmState: rawHandoffState, legacyPredict: mutatingNextOwner });
assertEqual(handoffResult.mode, "handoff", "HandOff should select the explicit next owner");
assertEqual(legacyCalls, 1, "HandOff should call the next owner exactly once");
assert(handoffResult.legacyState !== rawHandoffState, "HandOff should pass a cloned overlay");
assert(legacyArgument === handoffResult.legacyState, "next owner should receive the cloned overlay");
assertEqual(handoffResult.legacyState.doorOpenedCount, 1, "overlay should project the trusted C# delta");
assertEqual(handoffResult.legacyState.milestones.firstDoorOpened, true, "overlay should expose the trusted handoff milestone");
assertEqual(handoffResult.legacyState.computerRoomEntered, false, "HandOff must not project COMPUTERROOM before C# completion");
assertEqual(handoffResult.legacyState.milestones.computerRoomEntered, false, "HandOff milestone must remain C#-confirmed false");
assertEqual(handoffResult.legacyState.nestedReplay.items[0].value, 99, "next owner should receive its own mutable clone");
assertEqual(rawHandoffState.nestedReplay.items[0].value, 1, "nested object mutation must not leak into raw state");
assertEqual(rawHandoffState.nestedReplay.bytes[0], 2, "typed-array mutation must not leak into raw state");
assertEqual(rawHandoffState.milestones.nested.value, 3, "nested milestone mutation must not leak into raw state");
assertJsonEqual(rawHandoffState, rawHandoffBefore, "HandOff must never mutate the raw wasm state");
assertJsonEqual(handoffRuntime.autoplayMilestones, { existing: true }, "HandOff must not mutate legacy runtime milestones");
assertJsonEqual(handoffRuntime.autoplayCSharpSemanticState, {
  sessionId: "browser-session",
  runId: "browser-run-1",
  runGeneration: 1,
  controlTick: 9,
  firstDoorOpened: true,
  computerRoomEntered: false,
  doorOpenedCount: 1,
  source: "TrustedAudio",
  ownerId: "first-door.computer-room-entry-confirmation",
  state: "AwaitComputerRoom",
  reasonCode: "post-open-shove-complete"
}, "HandOff should commit C# semantics to an independent runtime store even when hasChanges is false");

const duplicateStoreBefore = clone(handoffRuntime.autoplayCSharpSemanticState);
let duplicateCallbackCalls = 0;
assertTaggedThrow(
  () => adapter.dispatch(
    { input: packetInput, decision: handoff },
    {
      runtime: handoffRuntime,
      wasmState: rawHandoffState,
      legacyPredict() {
        duplicateCallbackCalls += 1;
        return legacyAction;
      }
    }),
  "strictly increase",
  "duplicate semantic handoff tick should fail before the next owner");
assertEqual(duplicateCallbackCalls, 0, "duplicate semantic handoff must not invoke the next owner");
assertJsonEqual(
  handoffRuntime.autoplayCSharpSemanticState,
  duplicateStoreBefore,
  "duplicate semantic handoff must preserve the committed store");

const rollbackRuntime = runtimeFixture();
rollbackRuntime.autoplayCSharpSemanticState = {
  sessionId: "browser-session",
  runId: "browser-run-1",
  runGeneration: 1,
  controlTick: 8,
  firstDoorOpened: true,
  computerRoomEntered: false,
  doorOpenedCount: 1,
  source: "TrustedAudio",
  ownerId: "first-door.post-open-entry-shove",
  state: "PostOpenShove",
  reasonCode: "open-confirmed:trusted-audio"
};
const rollbackStoreBefore = clone(rollbackRuntime.autoplayCSharpSemanticState);
const nextOwnerFailure = new Error("next-owner-failed");
const rolledBackError = captureThrow(
  () => adapter.dispatch(
    { input: packetInput, decision: handoff },
    {
      runtime: rollbackRuntime,
      wasmState: rawHandoffState,
      legacyPredict() {
        rollbackRuntime.autoplayCSharpSemanticState.controlTick = 999;
        throw nextOwnerFailure;
      }
    }),
  "next-owner failure should propagate");
assert(rolledBackError === nextOwnerFailure, "next-owner exception should be rethrown unchanged");
assert(rolledBackError.aikernelCSharpNextOwner === true, "next-owner exception should carry its own tag");
assert(rolledBackError.aikernelCSharpFirstDoor !== true, "next-owner exception must not become a C# contract error");
assertJsonEqual(
  rollbackRuntime.autoplayCSharpSemanticState,
  rollbackStoreBefore,
  "next-owner exception must roll back the prior semantic store");

const casRuntime = runtimeFixture();
casRuntime.autoplayCSharpSemanticState = clone(rollbackStoreBefore);
let casCallbackCalls = 0;
const casConflictError = captureThrow(
  () => adapter.dispatch(
    { input: packetInput, decision: handoff },
    {
      runtime: casRuntime,
      wasmState: rawHandoffState,
      legacyPredict() {
        casCallbackCalls += 1;
        casRuntime.autoplayCSharpSemanticState = Object.assign({}, rollbackStoreBefore);
        return legacyAction;
      }
    }),
  "semantic store replacement during next-owner evaluation should fail CAS");
assert(
  String(casConflictError?.message || casConflictError).includes("compare-and-set conflict"),
  "CAS conflict should retain its diagnostic message");
assert(
  casConflictError.aikernelCSharpNextOwner === true,
  "CAS conflict should carry the next-owner tag");
assert(
  casConflictError.aikernelCSharpFirstDoor !== true,
  "CAS conflict must not become a C# contract error");
assertEqual(casCallbackCalls, 1, "CAS conflict should be detected after one next-owner call");
assertJsonEqual(casRuntime.autoplayCSharpSemanticState, rollbackStoreBefore, "CAS failure should roll back prior semantics");

for (const [label, malformedAction] of [
  ["null", null],
  ["Promise", Promise.resolve(legacyAction)]
]) {
  const malformedActionRuntime = runtimeFixture();
  malformedActionRuntime.autoplayCSharpSemanticState = clone(rollbackStoreBefore);
  let malformedActionCalls = 0;
  const malformedActionError = captureThrow(
    () => adapter.dispatch(
      { input: packetInput, decision: handoff },
      {
        runtime: malformedActionRuntime,
        wasmState: rawHandoffState,
        legacyPredict() {
          malformedActionCalls += 1;
          return malformedAction;
        }
      }),
    `${label} next-owner action should fail`);
  assertEqual(malformedActionCalls, 1, `${label} next-owner action should be evaluated exactly once`);
  assert(
    malformedActionError.aikernelCSharpNextOwner === true,
    `${label} next-owner action should carry the next-owner tag`);
  assert(
    malformedActionError.aikernelCSharpFirstDoor !== true,
    `${label} next-owner action must not become a C# contract error`);
  assertJsonEqual(
    malformedActionRuntime.autoplayCSharpSemanticState,
    rollbackStoreBefore,
    `${label} next-owner action should roll back semantic state`);
}

legacyCalls = 0;
const completedRuntime = runtimeFixture();
const completedResult = adapter.dispatch(
  { input: packetInput, decision: completed },
  { runtime: completedRuntime, wasmState: wasmStateFixture(), legacyPredict });
assertEqual(completedResult.mode, "completed", "Completed should remain an explicit post-door handoff");
assertEqual(legacyCalls, 1, "Completed should call the explicit next owner exactly once");
assertEqual(completedResult.semanticState.state, "Complete", "Completed should preserve the C# terminal semantic state");
assertEqual(completedResult.semanticState.computerRoomEntered, true, "Completed should commit the C# COMPUTERROOM milestone");
assertEqual(completedResult.legacyState.computerRoomEntered, true, "Completed overlay should project the C# COMPUTERROOM milestone");
assertEqual(completedResult.legacyState.milestones.computerRoomEntered, true, "Completed milestone overlay should be C#-confirmed");

legacyCalls = 0;
const failedResult = adapter.dispatch(
  { input: packetInput, decision: failedSafe },
  { runtime: runtimeFixture(), wasmState: wasmStateFixture(), legacyPredict });
assertEqual(failedResult.mode, "failed-safe-stop", "FailedSafeStop should retain its own mode");
assertEqual(legacyCalls, 0, "FailedSafeStop must not evaluate legacy");
assertJsonEqual(
  {
    move: failedResult.action.move,
    turn: failedResult.action.turn,
    turnYaw: failedResult.action.turnYaw,
    fire: failedResult.action.fire,
    strafe: failedResult.action.strafe,
    use: failedResult.action.use,
    run: failedResult.action.run
  },
  { move: "none", turn: "none", turnYaw: 0, fire: false, strafe: false, use: false, run: false },
  "FailedSafeStop must project a fixed neutral action");

legacyCalls = 0;
const readinessLossResult = adapter.dispatch(
  { input: packetInput, decision: readinessLoss },
  { runtime: runtimeFixture(), wasmState: wasmStateFixture(), legacyPredict });
assertEqual(readinessLossResult.mode, "failed-safe-stop",
  "active navigation readiness loss should remain a typed failed-safe stop");
assertEqual(legacyCalls, 0,
  "active navigation readiness loss must fail before legacy prediction");
assertEqual(readinessLossResult.decision.openingNavigation.nativeGametic, -1,
  "readiness-loss replay should preserve the missing native pose sentinel");

function malformedCase(name, decision, fragment, checkDecisionOnly = true) {
  if (checkDecisionOnly) {
    assert(!adapter.allowsLegacy(decision), `${name}: malformed decision must never allow legacy`);
  }
  let calls = 0;
  assertTaggedThrow(
    () => adapter.dispatch(
      { input: packetInput, decision },
      {
        runtime: runtimeFixture(),
        wasmState: wasmStateFixture(),
        legacyPredict() {
          calls += 1;
          return legacyAction;
        }
      }),
    fragment,
    name);
  assertEqual(calls, 0, `${name}: validation must happen before any legacy callback`);
}

function malformedAudioCatalogDecision(mutate) {
  const decision = clone(freshAudioCatalogDecision);
  mutate(decision.audioCatalogTrace, decision);
  return decision;
}

for (const [name, decision, fragment] of [
  [
    "missing audio catalog trace",
    Object.assign({}, baseDecision(), { audioCatalogTrace: null }),
    "audioCatalogTrace must be an object"
  ],
  [
    "unsupported audio catalog trace version",
    malformedAudioCatalogDecision(trace => { trace.traceVersion = 2; }),
    "audioCatalogTrace.traceVersion"
  ],
  [
    "unsupported audio catalog version",
    malformedAudioCatalogDecision(trace => { trace.catalogVersion = "doom-native-sfx-catalog-v2"; }),
    "audioCatalogTrace.catalogVersion"
  ],
  [
    "unsupported audio catalog source revision",
    malformedAudioCatalogDecision(trace => { trace.sourceRevision = "0".repeat(40); }),
    "audioCatalogTrace.sourceRevision"
  ],
  [
    "noncanonical audio catalog identity hash",
    malformedAudioCatalogDecision(trace => { trace.catalogIdentityHash = "A".repeat(64); }),
    "audioCatalogTrace.catalogIdentityHash"
  ],
  [
    "unsupported canonical audio catalog identity hash",
    malformedAudioCatalogDecision(trace => { trace.catalogIdentityHash = "0".repeat(64); }),
    "audioCatalogTrace.catalogIdentityHash is unsupported"
  ],
  [
    "audio catalog decision tick mismatch",
    malformedAudioCatalogDecision(trace => { trace.evaluatedAtControlTick -= 1; }),
    "audioCatalogTrace tick does not match decision"
  ],
  [
    "audio catalog trace capacity drift",
    malformedAudioCatalogDecision(trace => { trace.capacity = 31; }),
    "audioCatalogTrace.capacity"
  ],
  [
    "audio catalog retained count mismatch",
    malformedAudioCatalogDecision(trace => { trace.retainedEventCount = 1; }),
    "retainedEventCount does not match events length"
  ],
  [
    "audio catalog truncation mismatch",
    malformedAudioCatalogDecision(trace => { trace.truncated = true; }),
    "audioCatalogTrace.truncated"
  ],
  [
    "audio catalog unknown count omits retained unknown",
    malformedAudioCatalogDecision(trace => { trace.unknownEventCount = 0; }),
    "omits a retained unknown event"
  ],
  [
    "audio catalog event sequence is not ordered",
    malformedAudioCatalogDecision(trace => { trace.events[1].sequence = trace.events[0].sequence; }),
    "sequence must be strictly increasing"
  ],
  [
    "audio catalog event metadata mismatch",
    malformedAudioCatalogDecision(trace => { trace.events[0].catalogVersion = "doom-native-sfx-catalog-v2"; }),
    "events[0].catalogVersion"
  ],
  [
    "audio catalog event scope mismatch",
    malformedAudioCatalogDecision(trace => { trace.events[0].runId = "other-run"; }),
    "events[0].runId does not match decision"
  ],
  [
    "noncanonical audio catalog event identity hash",
    malformedAudioCatalogDecision(trace => { trace.events[0].eventIdentityHash = "B".repeat(64); }),
    "events[0].eventIdentityHash"
  ],
  [
    "audio catalog event gains behavior authority",
    malformedAudioCatalogDecision(trace => { trace.events[0].diagnosticOnly = false; }),
    "events[0].diagnosticOnly must be true"
  ],
  [
    "unknown audio catalog classification reason",
    malformedAudioCatalogDecision(trace => { trace.events[0].classificationReason = "guessed-meaning"; }),
    "classificationReason is unknown"
  ],
  [
    "exact audio catalog reason is not catalogued",
    malformedAudioCatalogDecision(trace => { trace.events[0].catalogued = false; }),
    "catalogued does not match classificationReason"
  ],
  [
    "exact audio catalog pair uses unknown meaning",
    malformedAudioCatalogDecision(trace => {
      trace.events[0].meaningCode = "unknown-sfx";
      trace.events[0].meaningLabel = "Unknown SFX";
    }),
    "catalogued pair cannot use the unknown meaning code"
  ],
  [
    "unknown audio catalog pair claims a catalog meaning",
    malformedAudioCatalogDecision(trace => {
      trace.events[1].meaningCode = "mechanism-door-open";
      trace.events[1].meaningLabel = "Door open";
    }),
    "unknown pair must use the unknown meaning code"
  ],
  [
    "audio catalog mismatch contains an exact normalized pair",
    malformedAudioCatalogDecision(trace => {
      trace.events[1].rawSfxName = "SFX_DOROPN";
      trace.events[1].normalizedSfxName = "doropn";
    }),
    "id/name mismatch cannot contain an exact normalized pair"
  ]
]) {
  malformedCase(name, decision, fragment);
}

malformedCase(
  "unsupported version",
  baseDecision({ contractVersion: 2 }),
  "contractVersion");
malformedCase(
  "unknown disposition",
  baseDecision({ ownershipDisposition: "MaybeLegacy" }),
  "ownershipDisposition");
malformedCase(
  "cross-wired ownership unit",
  exclusiveDecision({ ownershipUnit: "DoorFrontAlign" }),
  "requires ownershipUnit FirstDoorApproach");
malformedCase(
  "cross-wired ownership disposition",
  exclusiveDecision({ ownershipDisposition: "HandOff" }),
  "requires ownershipDisposition Exclusive");
malformedCase(
  "cross-wired owner id",
  exclusiveDecision({ ownerId: "first-door.door-front-align" }),
  "requires ownerId first-door.approach");
malformedCase(
  "failed-safe special owner mismatch",
  failedSafeDecision({ ownerId: "first-door.use-outcome" }),
  "requires ownerId first-door.failed-safe-stop");
malformedCase(
  "scope mismatch",
  baseDecision({ runId: "wrong-run", semanticDelta: { runId: "wrong-run" } }),
  "does not match input",
  false);
malformedCase(
  "non-boolean action",
  exclusiveDecision({ action: { moveForward: 1 } }),
  "must be boolean");
malformedCase(
  "malformed yaw",
  exclusiveDecision({ action: { turnYaw: 1.5 } }),
  "turnYaw");
malformedCase(
  "out-of-range yaw",
  exclusiveDecision({ action: { turnYaw: 181 } }),
  "<= 180");
malformedCase(
  "contradictory movement",
  exclusiveDecision({ action: { moveForward: true, moveBackward: true } }),
  "contradictory");
malformedCase(
  "moving Use",
  exclusiveDecision({
    runRequested: false,
    action: { moveForward: true, useKey: true }
  }),
  "stationary");
malformedCase(
  "contract error",
  failedSafeDecision({ contractError: "unsupported-contract-version" }),
  "contractError");
malformedCase(
  "confirmed open missing accepted evidence id",
  handoffDecision("HandOff", { acceptedOpenEvidenceId: "" }),
  "acceptedOpenEvidenceId");
malformedCase(
  "confirmed open accepted source mismatch",
  handoffDecision("HandOff", { acceptedOpenEvidenceSource: "TrustedMilestone" }),
  "must match openConfirmationSource");
malformedCase(
  "unconfirmed open retains evidence",
  baseDecision({
    acceptedOpenEvidenceId: "stale-open-evidence",
    acceptedOpenEvidenceSource: "TrustedAudio"
  }),
  "cannot retain accepted evidence");
malformedCase(
  "unknown failed-use evidence source",
  baseDecision({ acceptedFailedUseEvidenceSource: "GenericAudio" }),
  "acceptedFailedUseEvidenceSource");
malformedCase(
  "unknown door identity truth",
  baseDecision({ doorIdentityTruth: "Maybe" }),
  "doorIdentityTruth");
malformedCase(
  "stationary Use without fresh proximity proof",
  Object.assign({}, stationaryUse, {
    proximity: Object.assign({}, stationaryUse.proximity, { fresh: false })
  }),
  "fresh C# native use-range proof");
malformedCase(
  "out-of-range proximity player angle",
  baseDecision({ proximity: { playerAngleBam: 4294967296 } }),
  "playerAngleBam");
malformedCase(
  "available proximity with noncanonical WAD identity",
  Object.assign({}, stationaryUse, {
    proximity: Object.assign({}, stationaryUse.proximity, {
      wadContentSha256: "0".repeat(64)
    })
  }),
  "canonical DOOM1.WAD");
malformedCase(
  "unsupported opening navigation snapshot version",
  baseDecision({ openingNavigation: { snapshotVersion: 0 } }),
  "openingNavigation.snapshotVersion");
malformedCase(
  "unknown opening navigation status",
  baseDecision({ openingNavigation: { status: "Guessing" } }),
  "openingNavigation.status");
malformedCase(
  "non-finite opening navigation distance",
  baseDecision({ openingNavigation: { targetDistance: Number.NaN } }),
  "openingNavigation.targetDistance");
malformedCase(
  "active opening navigation with noncanonical WAD identity",
  baseDecision({
    openingNavigation: activeOpeningNavigation({ wadContentSha256: "0".repeat(64) })
  }),
  "openingNavigation.active non-failed navigation requires the canonical DOOM1.WAD");
malformedCase(
  "active navigating snapshot without a native gametic",
  openingNavigateDecision({
    openingNavigation: activeOpeningNavigation({ nativeGametic: -1 })
  }),
  "openingNavigation.active navigation requires nativeGametic >= 0");
malformedCase(
  "valid ACK flag without accepted replay snapshot",
  Object.assign({}, acceptedAckDecision, {
    acceptedUseAck: unavailableAcceptedUseAck()
  }),
  "acceptedUseAck replay proof");
malformedCase(
  "accepted ACK with mismatched pumped sequence",
  Object.assign({}, acceptedAckDecision, {
    acceptedUseAck: acceptedUseAck({ pumpedUseInputEventSequence: 20 })
  }),
  "queued/pumped Use replay proof");
malformedCase(
  "stationary-use replay without fresh proximity proof",
  baseDecision({
    controlTick: 7,
    semanticDelta: { controlTick: 7 },
    transitionReplaySnapshots: [transitionReplaySnapshot({ proximity: { fresh: false } })]
  }),
  "fresh C# native use-range proof");
malformedCase(
  "unsupported transition replay snapshot version",
  baseDecision({
    controlTick: 7,
    semanticDelta: { controlTick: 7 },
    transitionReplaySnapshots: [transitionReplaySnapshot({ snapshotVersion: 2 })]
  }),
  "snapshotVersion must be 4");
malformedCase(
  "invalid transition opening navigation projection",
  baseDecision({
    controlTick: 7,
    semanticDelta: { controlTick: 7 },
    transitionReplaySnapshots: [transitionReplaySnapshot({
      openingNavigation: { blockCode: "MaybeBlocked" }
    })]
  }),
  "openingNavigation.blockCode");
malformedCase(
  "invalid replay acknowledgement boolean",
  baseDecision({ appliedActionAckValid: "false" }),
  "appliedActionAckValid");
malformedCase(
  "invalid pending-use replay state",
  stationaryUse && Object.assign({}, stationaryUse, {
    pendingUseCorrelationState: "none"
  }),
  "pendingUseCorrelationState does not match");
malformedCase(
  "invalid handoff flag",
  handoffDecision("HandOff", { handOffToPostDoor: false }),
  "handoff gate");
malformedCase(
  "invalid completed open gate",
  handoffDecision("Completed", {
    openConfirmed: false,
    openConfirmationSource: "None",
    acceptedOpenEvidenceId: "",
    acceptedOpenEvidenceSource: "None",
    semanticDelta: { firstDoorOpened: false, doorOpenedCount: 0, source: "None" }
  }),
  "handoff gate");
malformedCase(
  "semantic scope mismatch",
  handoffDecision("HandOff", { semanticDelta: { runId: "other-run" } }),
  "semanticDelta.runId");
malformedCase(
  "semantic tick mismatch",
  handoffDecision("HandOff", { semanticDelta: { controlTick: 8 } }),
  "semanticDelta.controlTick");
malformedCase(
  "premature COMPUTERROOM semantic delta",
  handoffDecision("HandOff", { semanticDelta: { computerRoomEntered: true } }),
  "semanticDelta.computerRoomEntered");
malformedCase(
  "missing completed COMPUTERROOM semantic delta",
  handoffDecision("Completed", { semanticDelta: { computerRoomEntered: false } }),
  "semanticDelta.computerRoomEntered");
malformedCase(
  "semantic source missing",
  handoffDecision("HandOff", {
    openConfirmationSource: "None",
    semanticDelta: { source: "None" }
  }),
  "trusted source");

console.log("CSHARP_FIRST_DOOR_ADAPTER_VM_TEST_OK");
