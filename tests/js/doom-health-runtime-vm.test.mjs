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
  return source;
}

const gpuContracts = {
  rawFramebufferTarget: "raw",
  rawFramebufferWireName: "raw",
  hudCompositeTarget: "hud",
  hudCompositeWireName: "hud",
  aisthesisFeatureTarget: "features",
  aisthesisMatrixTarget: "matrix",
  aisthesisMaskTarget: "mask",
  aisthesisMaskLayout: {},
  spatialOutputTarget: "spatial",
  spatialOutputFields: [],
  rawFramebufferFrameTarget: phase => `raw:${phase}`,
  hudCompositeFrameTarget: phase => `hud:${phase}`,
  frameToken: source => ({ source }),
  aisthesisMaskTextureTarget: () => "mask-texture"
};

const sandbox = {
  console,
  Math,
  Number,
  Boolean,
  Object,
  Array,
  String,
  Date,
  Map,
  Set,
  Promise,
  Error,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Uint8Array,
  Uint32Array,
  URL,
  URLSearchParams,
  location: { search: "" },
  navigator: {},
  document: { currentScript: null, scripts: [] },
  crypto: { randomUUID: () => "health-runtime-test" },
  CustomEvent: class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
    }
  },
  addEventListener() {},
  dispatchEvent() {},
  AIKernelDoomGpuContracts: gpuContracts,
  WebGpuComputeProvider: {
    status: () => ({ usingCpuFallback: true, gpuPermanentlyDisabled: true })
  }
};
sandbox.self = sandbox;
sandbox.window = sandbox;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/doom-native-audio.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/doom-retry-dispatch.js");
const doomSource = loadScript(context, "src/DoomWeb/wwwroot/js/doom.js");
const promptSource = readFileSync(
  path.join(repoRoot, "src/DoomWeb/wwwroot/demo/doom/js/doom-prompt.js"),
  "utf8");
const Runtime = context.AIKernelDoomRuntimeClass;
const retry = context.AIKernelDoomRetryDispatch;
assert(typeof Runtime === "function", "doom runtime class should be exported for deterministic health tests");

const published = Object.create(Runtime.prototype);
published.publishAutoplayFrameHealth({
  healthSensor: {
    active: true,
    signature: "health-signature",
    likelyDead: true,
    retryRequested: true,
    faceLifePhase: "moribund",
    faceLifeLevel: 1,
    faceHeartbeatAlive: false,
    healthFaceHeartbeatAlive: false,
    faceNoHeartbeatFrames: 48,
    zeroScore: 0.82,
    activeColumns: 12,
    activeCells: 54,
    estimatedPercent: 9
  },
  framebuffer: {}
});
assert(published.autoplayHealthSensor.faceLifePhase === "moribund", "current frame health should publish before C# exact return");
assert(published.autoplayHealthSensor.faceLifeLevel === 1, "current stabilized life level should publish before C# exact return");
assert(published.autoplayHealthSensor.faceHeartbeatAlive === false, "current canonical heartbeat false should publish without stale supervisor merging");
assert(published.autoplayHealthLikelyDead === true, "current likely-dead state should publish before dispatch ownership is evaluated");
assert(published.autoplayHealthEstimatedPercent === 9, "current health percent should publish with the health snapshot");

let publicSupervisorStatusCalls = 0;
const publicRuntime = Object.create(Runtime.prototype);
Object.assign(publicRuntime, {
  state: "running",
  renderer: "test",
  autoplayHealthSensor: {
    active: true,
    faceLifePhase: "moribund",
    faceLifeLevel: 1,
    likelyDead: false,
    retryRequested: false,
    faceHeartbeatAlive: false,
    healthFaceHeartbeatAlive: false,
    faceHeartbeatScore: 1,
    faceHeartbeatVisualOpacity: 0.75
  },
  bonsaiSupervisor: {
    status: () => {
      publicSupervisorStatusCalls += 1;
      return {
        healthLikelyDead: true,
        retryRequested: true,
        faceHeartbeatAlive: true,
        healthFaceHeartbeatAlive: true,
        healthSensor: {
          faceLifePhase: "healthy",
          faceLifeLevel: 5,
          likelyDead: true,
          retryRequested: true,
          faceHeartbeatAlive: true,
          healthFaceHeartbeatAlive: true
        }
      };
    }
  },
  autoplayMilestones: {},
  autoplayCSharpSemanticState: {
    sessionId: "semantic-session",
    runId: "semantic-session:run-1",
    runGeneration: 1,
    controlTick: 529,
    firstDoorOpened: true,
    computerRoomEntered: true,
    doorOpenedCount: 1,
    source: "TrustedAudio",
    ownerId: "first-door.computer-room-entry-confirmation",
    state: "Complete",
    reasonCode: "computer-room-entry-confirmed"
  },
  autoplayCSharpPostComputerRoomSemanticState: {
    sessionId: "semantic-session",
    runId: "semantic-session:run-1",
    runGeneration: 1,
    controlTick: 529,
    firstDoorOpened: true,
    computerRoomEntered: true,
    centralHallEntered: false,
    doorOpenedCount: 1,
    source: "TrustedAudio",
    ownerId: "post-computer-room.main-route",
    state: "NavigateMainRoute",
    reasonCode: "post-computer-room-main-route",
    telos: "CentralHall",
    objective: "reach-central-hall"
  },
  autoplayRetryDispatch: retry.createState(),
  compassLandmarks: new Map()
});
publicRuntime.createGpuHudStatus = () => ({});
publicRuntime.createHudFlowControlStatus = () => ({});
publicRuntime.createSensorStatusMap = () => ({});
publicRuntime.cloneDownloadProgress = () => ({});
publicRuntime.sanitizeOpeningHealthRetryStatus = status => status;
publicRuntime.applyAutoplayInvulnerableHealthHint = () => {};
publicRuntime.resolveDoorOpenAudioEvidence = () => null;
publicRuntime.nativeAudioStatus = () => false;
publicRuntime.nativeAudioEventCount = () => 0;
publicRuntime.nativeAudioAvailableFrames = () => 0;
const publicStatus = publicRuntime.status();
assert(publicStatus.autoplay.faceHeartbeatAlive === false, "public status must preserve current canonical heartbeat false over stale supervisor true");
assert(publicStatus.autoplay.healthFaceHeartbeatAlive === false, "public status heartbeat alias must preserve current canonical false");
assert(publicStatus.autoplay.healthSensor.faceHeartbeatAlive === false, "public health snapshot must not resurrect logical heartbeat from stale aliases or score telemetry");
assert(publicStatus.autoplay.faceLifePhase === "moribund", "current low face-life phase must outrank a stale supervisor healthy phase");
assert(publicStatus.autoplay.faceLifeLevel === 1, "current face-life level 1 must not be overwritten by a stale level 5");
assert(publicStatus.autoplay.healthSensor.faceLifeLevel === 1, "canonical health snapshot must preserve the lower current face-life level");
assert(publicStatus.autoplay.healthLikelyDead === false, "public status must preserve current alive evidence over stale supervisor death");
assert(publicStatus.autoplay.healthSensor.retryRequested === false, "public status must preserve current no-retry evidence over stale supervisor retry");
assert(publicStatus.autoplay.healthSensor.faceHeartbeatVisualOpacity === 0.75, "public status should keep visual heartbeat opacity as diagnostic-only telemetry");
assert(publicStatus.autoplay.csharpFirstDoorSemanticState.ownerId === "first-door.computer-room-entry-confirmation", "compatibility FirstDoor telemetry must retain the committed FirstDoor owner");
assert(publicStatus.autoplay.csharpFirstDoorCommittedSemanticState.state === "Complete", "explicit committed FirstDoor telemetry must retain Complete");
assert(publicStatus.autoplay.csharpPostComputerRoomSemanticState.ownerId === "post-computer-room.main-route", "post-route telemetry must remain in its own namespace");
assert(publicStatus.autoplay.csharpPostComputerRoomSemanticState.state === "NavigateMainRoute", "post-route state must not overwrite committed FirstDoor state");
assert(publicSupervisorStatusCalls === 1, "one public status must reuse one supervisor snapshot instead of rebuilding it seven times");
assert(publicStatus.autoplay.statusTransport?.source === "runtime-predicted-boundary-coalescer", "public status must identify the worker-side predicted status coalescer");

let predictedNow = 1000;
context.performance = { now: () => predictedNow };
let predictedStatusBuilds = 0;
const predictedReasons = [];
const predictedRuntime = Object.create(Runtime.prototype);
Object.assign(predictedRuntime, {
  state: "running",
  autoplayMode: "idle",
  autoplayCSharpFirstDoorDecision: {
    ownerId: "first-door.opening-transit",
    ownershipDisposition: "Exclusive",
    state: "NavigateToDoor",
    reasonCode: "approach-first-door",
    audioCatalogTrace: { latestObservedSequence: 4 }
  },
  autoplayCSharpPostComputerRoomDecision: null,
  autoplayLastAction: { move: 1, turn: 0, fire: false, use: false, phasePipelineId: "first-door.opening-transit" },
  autoplayCSharpAppliedActionSnapshot: null,
  autoplayHealthSensor: { likelyDead: false, retryRequested: false, nativePlayerHealth: 100, nativePlayerKillCount: 0 },
  autoplayRetryDispatch: { active: false },
  autoplayMilestones: {},
  autoplayCSharpDispatchMode: "csharp-exact",
  autoplayCSharpPostComputerRoomDispatchMode: "none",
  autoplayCSharpLifecycleEvent: "none",
  autoplayCSharpResetOperationId: "run-1:reset-1",
  lastQueuedUseInputEventSequence: 0,
  lastPumpedUseInputEventSequence: 0,
  autoplayPredictedStatusLastEmittedAt: 0,
  autoplayPredictedStatusCriticalFingerprint: "",
  autoplayPredictedStatusActionFingerprint: "",
  autoplayPredictedStatusEmitted: 0,
  autoplayPredictedStatusSuppressed: 0,
  status() {
    predictedStatusBuilds += 1;
    return { marker: predictedStatusBuilds };
  },
  onStatusChange(status, reason) {
    predictedReasons.push({ status, reason });
  }
});
assert(predictedRuntime.emitStatus("autoplay-predicted") === true, "the first predicted status boundary must emit");
assert(predictedStatusBuilds === 1, "the first predicted status must build exactly once");
predictedNow = 1010;
assert(predictedRuntime.emitStatus("autoplay-predicted") === false, "an identical predicted boundary must be suppressed before status construction");
assert(predictedStatusBuilds === 1 && predictedRuntime.autoplayPredictedStatusSuppressed === 1, "same-boundary suppression must avoid status construction and count the drop");
predictedRuntime.autoplayLastAction.actionSequenceId = "first-door:tick-2";
predictedNow = 1011;
assert(predictedRuntime.emitStatus("autoplay-predicted") === false, "a tick-varying action sequence id must not defeat equal-action status coalescing");
assert(predictedStatusBuilds === 1, "a transport-only sequence id change must not rebuild public status");
predictedRuntime.autoplayLastAction.move = -1;
predictedNow = 1020;
assert(predictedRuntime.emitStatus("autoplay-predicted") === false, "a non-critical action change inside 125ms must wait for the fps heartbeat");
predictedRuntime.autoplayCSharpFirstDoorDecision.reasonCode = "stationary-use-ready";
predictedNow = 1030;
assert(predictedRuntime.emitStatus("autoplay-predicted") === true, "a C# reason boundary must bypass the non-critical action interval");
predictedRuntime.autoplayLastAction.fire = true;
predictedNow = 1031;
assert(predictedRuntime.emitStatus("autoplay-predicted") === true, "a fire boundary must emit immediately");
predictedRuntime.autoplayHealthSensor.likelyDead = true;
predictedNow = 1032;
assert(predictedRuntime.emitStatus("autoplay-predicted") === true, "a death boundary must emit immediately");
predictedRuntime.autoplayCSharpFirstDoorDecision.audioCatalogTrace.latestObservedSequence = 5;
predictedNow = 1033;
assert(predictedRuntime.emitStatus("autoplay-predicted") === true, "a native audio sequence boundary must emit immediately");
predictedRuntime.autoplayLastAction.use = true;
predictedNow = 1034;
assert(predictedRuntime.emitStatus("autoplay-predicted") === true, "a stationary Use boundary must emit immediately");
predictedRuntime.autoplayCSharpFirstDoorDecision.restartRequested = true;
predictedRuntime.autoplayCSharpFirstDoorDecision.restartRequestId = "native-death:1:512:9";
predictedNow = 1035;
assert(predictedRuntime.emitStatus("autoplay-predicted") === true, "a C# restart boundary must emit immediately");
predictedNow = 1036;
assert(predictedRuntime.emitStatus("fps") === true, "the existing fps heartbeat must never be suppressed");
assert(predictedStatusBuilds === 8, "only emitted predicted boundaries and the fps heartbeat may build public status");
assert(predictedReasons.at(-1)?.reason === "fps", "the unsuppressed heartbeat reason must reach the status consumer");

const staleLegacyAudioEvidence = {
  semanticClass: "unclassified-sfx",
  semanticLabel: "Unclassified SFX"
};
const freshCatalogObservation = {
  sequence: 42,
  sfxId: 43,
  rawSfxName: "brssit",
  normalizedSfxName: "brssit",
  expectedSfxName: "brssit",
  catalogued: true,
  meaningCode: "enemy-sight-baron",
  meaningLabel: "Baron of Hell sight",
  classificationReason: "exact-id-name-pair",
  eventIdentityHash: "a".repeat(64),
  diagnosticOnly: true
};
const freshAudioCatalogTrace = {
  evaluatedAtControlTick: 530,
  totalNewEventCount: 1,
  events: [freshCatalogObservation]
};
const freshCatalogRuntime = Object.create(Runtime.prototype);
Object.assign(freshCatalogRuntime, publicRuntime, {
  autoplayEnabled: true,
  autoplayMode: "idle",
  autoplayLastError: "",
  wasmAutoplayLastError: "",
  autoplayCSharpFirstDoorFaulted: false,
  autoplayCSharpFirstDoorDecision: {
    controlTick: 530,
    audioCatalogTrace: freshAudioCatalogTrace
  },
  autoplayCSharpPostComputerRoomDecision: null
});
freshCatalogRuntime.resolveDoorOpenAudioEvidence = () => staleLegacyAudioEvidence;
const freshCatalogStatus = freshCatalogRuntime.status();
assert(freshCatalogStatus.audio.semanticEventType === "enemy-sight-baron", "fresh C# catalog meaning code must project mechanically as the public semantic type");
assert(freshCatalogStatus.audio.semanticLabel === "Baron of Hell sight", "fresh C# catalog meaning label must project mechanically to the HUD status");
assert(freshCatalogStatus.audio.catalogFresh === true, "same-tick non-empty C# catalog trace must be fresh");
assert(freshCatalogStatus.audio.audioCatalogTrace === freshAudioCatalogTrace, "public status must carry the exact validated C# catalog trace");
assert(freshCatalogStatus.audio.audioCatalogObservation === freshCatalogObservation, "public status must carry the latest retained C# catalog observation");
assert(freshCatalogStatus.audio.catalogSfxId === 43 && freshCatalogStatus.audio.catalogRawSfxName === "brssit", "public catalog diagnostics must retain the raw SFX id/name pair");
assert(freshCatalogStatus.autoplay.audioCatalogObservation === freshCatalogObservation, "autoplay diagnostics must carry the latest catalog observation for capture harnesses");
assert(freshCatalogStatus.autoplay.doorOpenAudioEvidence === null, "C# catalog status must suppress the stale legacy door-open display fallback");

freshCatalogRuntime.autoplayCSharpFirstDoorDecision = {
  controlTick: 531,
  audioCatalogTrace: {
    evaluatedAtControlTick: 531,
    totalNewEventCount: 0,
    events: []
  }
};
const retainedCatalogStatus = freshCatalogRuntime.status();
assert(retainedCatalogStatus.audio.semanticEventType === "none", "a retained diagnostic must not relatch the prior event as current semantics");
assert(retainedCatalogStatus.audio.audioCatalogObservation === null, "a later empty tick must expose no current catalog event");
assert(retainedCatalogStatus.audio.audioCatalogLastObservation === freshCatalogObservation, "the last validated C# catalog event must remain separately visible for diagnostics");
assert(retainedCatalogStatus.autoplay.audioCatalogLastObservation === freshCatalogObservation, "capture diagnostics must retain the separate last catalogued observation");
assert(retainedCatalogStatus.audio.catalogLastObservedAtControlTick === 530, "retained catalog diagnostics must preserve their C# observation tick");
assert(retainedCatalogStatus.audio.catalogLastAgeControlTicks === 1, "retained catalog diagnostics must publish a non-authoritative control-tick age");

freshCatalogRuntime.autoplayCSharpRunGeneration = 2;
const changedScopeCatalogStatus = freshCatalogRuntime.status();
assert(changedScopeCatalogStatus.audio.audioCatalogLastObservation === null, "a changed C# run scope must clear the retained catalog diagnostic");

const emptyCatalogTrace = {
  evaluatedAtControlTick: 531,
  totalNewEventCount: 0,
  events: []
};
const emptyCatalogRuntime = Object.create(Runtime.prototype);
Object.assign(emptyCatalogRuntime, publicRuntime, {
  autoplayEnabled: true,
  autoplayMode: "idle",
  autoplayLastError: "",
  wasmAutoplayLastError: "",
  autoplayCSharpFirstDoorFaulted: false,
  autoplayCSharpFirstDoorDecision: {
    controlTick: 531,
    audioCatalogTrace: emptyCatalogTrace
  },
  autoplayCSharpPostComputerRoomDecision: null
});
emptyCatalogRuntime.resolveDoorOpenAudioEvidence = () => staleLegacyAudioEvidence;
const emptyCatalogStatus = emptyCatalogRuntime.status();
assert(emptyCatalogStatus.audio.semanticEventType === "none", "current-tick empty C# catalog trace must clear the stale semantic type");
assert(emptyCatalogStatus.audio.semanticLabel === "No audio event", "current-tick empty C# catalog trace must clear stale Unclassified SFX");
assert(emptyCatalogStatus.audio.catalogFresh === false, "empty C# catalog trace must not be fresh");
assert(emptyCatalogStatus.audio.audioCatalogObservation === null, "empty C# catalog trace must not project a prior observation");
assert(emptyCatalogStatus.autoplay.doorOpenAudioEvidence === null, "empty C# catalog trace must still suppress stale legacy display evidence");

const staleCatalogRuntime = Object.create(Runtime.prototype);
Object.assign(staleCatalogRuntime, publicRuntime, {
  autoplayEnabled: true,
  autoplayMode: "idle",
  autoplayLastError: "",
  wasmAutoplayLastError: "",
  autoplayCSharpFirstDoorFaulted: false,
  autoplayCSharpFirstDoorDecision: {
    controlTick: 532,
    audioCatalogTrace: {
      evaluatedAtControlTick: 531,
      totalNewEventCount: 1,
      events: [freshCatalogObservation]
    }
  },
  autoplayCSharpPostComputerRoomDecision: null
});
staleCatalogRuntime.resolveDoorOpenAudioEvidence = () => staleLegacyAudioEvidence;
const staleCatalogStatus = staleCatalogRuntime.status();
assert(staleCatalogStatus.audio.semanticEventType === "none" && staleCatalogStatus.audio.semanticLabel === "No audio event", "prior-tick C# catalog trace must not relatch a stale SFX label");
assert(staleCatalogStatus.audio.audioCatalogObservation === null, "prior-tick C# catalog trace must not expose its retained event as current");

for (const [name, inactiveState] of [
  ["disabled", { autoplayEnabled: false }],
  ["stopped", { state: "stopped" }],
  ["controller-error", { autoplayMode: "error", autoplayLastError: "C# controller failed" }],
  ["csharp-fault", { autoplayCSharpFirstDoorFaulted: true }]
]) {
  const inactiveCatalogRuntime = Object.create(Runtime.prototype);
  Object.assign(inactiveCatalogRuntime, publicRuntime, {
    autoplayEnabled: true,
    autoplayMode: "idle",
    autoplayLastError: "",
    wasmAutoplayLastError: "",
    autoplayCSharpFirstDoorFaulted: false,
    autoplayCSharpFirstDoorDecision: {
      controlTick: 530,
      audioCatalogTrace: freshAudioCatalogTrace
    },
    autoplayCSharpPostComputerRoomDecision: null
  }, inactiveState);
  inactiveCatalogRuntime.resolveDoorOpenAudioEvidence = () => staleLegacyAudioEvidence;
  const inactiveStatus = inactiveCatalogRuntime.status();
  assert(inactiveStatus.audio.semanticEventType === "none" && inactiveStatus.audio.semanticLabel === "No audio event", `${name} control must not relatch the last C# catalog event`);
  assert(inactiveStatus.audio.catalogFresh === false && inactiveStatus.audio.audioCatalogObservation === null, `${name} control must expose no fresh C# catalog observation`);
  assert(inactiveStatus.autoplay.doorOpenAudioEvidence === null, `${name} C# status must continue suppressing stale legacy audio evidence`);
}

const legacyAudioRuntime = Object.create(Runtime.prototype);
Object.assign(legacyAudioRuntime, publicRuntime, {
  autoplayCSharpFirstDoorDecision: null,
  autoplayCSharpPostComputerRoomDecision: null
});
legacyAudioRuntime.resolveDoorOpenAudioEvidence = () => staleLegacyAudioEvidence;
const legacyAudioStatus = legacyAudioRuntime.status();
assert(legacyAudioStatus.audio.semanticEventType === "unclassified-sfx", "legacy audio display fallback may remain when no C# decision exists");
assert(legacyAudioStatus.audio.semanticLabel === "Unclassified SFX", "legacy audio label may remain when C# is absent");
assert(legacyAudioStatus.autoplay.doorOpenAudioEvidence === staleLegacyAudioEvidence, "no-C# status must preserve legacy display evidence compatibility");

const missingFaceRuntime = Object.create(Runtime.prototype);
Object.assign(missingFaceRuntime, publicRuntime, {
  autoplayHealthSensor: {
    active: true,
    faceVitalEnabled: true,
    faceLifePhase: "healthy",
    faceLifeLevel: 5,
    faceSignature: "0440044004400440",
    faceSignatureValid: false,
    faceLifeTemplateAuthoritative: false,
    faceLifeTemplateSource: "none",
    faceLifeTemplateConfidence: 0,
    faceLifePattern: "unknown",
    faceHeartbeatAlive: false,
    healthFaceHeartbeatAlive: false,
    likelyDead: false,
    retryRequested: false
  },
  bonsaiSupervisor: {
    status: () => ({
      faceLifePhase: "healthy",
      faceLifeLevel: 5,
      faceSignatureValid: false,
      faceLifeTemplateAuthoritative: false,
      faceLifeTemplateSource: "none",
      faceLifeTemplateConfidence: 0,
      faceLifePattern: "unknown",
      healthSensor: {
        faceLifePhase: "healthy",
        faceLifeLevel: 5,
        faceSignatureValid: false,
        faceLifeTemplateAuthoritative: false,
        faceLifeTemplateSource: "none",
        faceLifeTemplateConfidence: 0,
        faceLifePattern: "unknown"
      }
    })
  }
});
const missingFaceStatus = missingFaceRuntime.status();
assert(missingFaceStatus.autoplay.faceLifePhase === "unknown", "missing face evidence must not publish a synthetic healthy phase");
assert(missingFaceStatus.autoplay.faceLifeLevel === 0, "missing face evidence must not publish a synthetic level 5");
assert(missingFaceStatus.autoplay.healthSensor.faceLifePhase === "unknown", "canonical health snapshot must retain missing face provenance");

const dev1054NativeHealthRuntime = Object.create(Runtime.prototype);
Object.assign(dev1054NativeHealthRuntime, publicRuntime, {
  autoplayHealthSensor: {
    active: true,
    faceVitalEnabled: true,
    signature: "67677777677777776777777767777777677777776777777767777777677777776777777767777777",
    activeColumns: 0,
    activeCells: 0,
    sampleColumns: 8,
    sampleCells: 24,
    estimatedPercent: 100,
    value: 100,
    health: 100,
    faceSignature: "0440044004400440",
    faceSignatureValid: false,
    faceLifePhase: "healthy",
    healthFaceLifePhase: "healthy",
    faceLifeLevel: 5,
    healthFaceLifeLevel: 5,
    faceLifeTemplatePhase: "unknown",
    healthFaceLifeTemplatePhase: "unknown",
    faceLifeTemplateLevel: 0,
    healthFaceLifeTemplateLevel: 0,
    faceLifeTemplateAuthoritative: false,
    healthFaceLifeTemplateAuthoritative: false,
    faceLifeTemplateSource: "none",
    faceLifeQuantizedPhase: "unknown",
    faceLifeQuantizedLevel: 0,
    faceHeartbeatAlive: false,
    healthFaceHeartbeatAlive: false,
    faceNoHeartbeatFrames: 0,
    faceBloodScore: 0.66,
    faceBloodRatio: 0.47,
    faceDeathTintScore: 0.49,
    likelyDead: false,
    retryRequested: false
  },
  bonsaiSupervisor: {
    status: () => ({
      healthSensor: {
        estimatedPercent: 100,
        value: 100,
        health: 100,
        faceSignature: "0440044004400440",
        faceSignatureValid: false,
        faceLifePhase: "healthy",
        faceLifeLevel: 5,
        faceLifeTemplatePhase: "unknown",
        faceLifeTemplateLevel: 0,
        faceLifeTemplateAuthoritative: false,
        faceLifeTemplateSource: "none",
        faceLifeQuantizedPhase: "unknown",
        faceLifeQuantizedLevel: 0,
        faceHeartbeatAlive: false,
        faceBloodScore: 0.66,
        faceBloodRatio: 0.47,
        faceDeathTintScore: 0.49
      }
    })
  },
  autoplayCSharpFirstDoorDecision: {
    controlTick: 1013,
    vitalityTrace: {
      available: true,
      fresh: true,
      nativeGametic: 1075,
      playerHealth: 79,
      playerState: 0,
      playerKillCount: 3,
      provenance: "native-player-struct-v1"
    }
  }
});
const dev1054NativeHealthStatus = dev1054NativeHealthRuntime.status();
assert(dev1054NativeHealthStatus.autoplay.faceLifePhase === "unknown", "dev1054 invalid non-heartbeat face must not publish temporal healthy");
assert(dev1054NativeHealthStatus.autoplay.faceLifeLevel === 0, "dev1054 invalid non-heartbeat face must remain level 0");
assert(dev1054NativeHealthStatus.autoplay.healthSensor.estimatedPercent === 79, "current native C# health must replace stale ROI percent 100");
assert(dev1054NativeHealthStatus.autoplay.healthSensor.value === 79, "current native C# health must replace stale public value 100");
assert(dev1054NativeHealthStatus.autoplay.healthSensor.health === 79, "current native C# health must replace stale public health 100");
assert(dev1054NativeHealthStatus.health.health === 79, "top-level public health snapshot must share the native C# value");
assert(dev1054NativeHealthStatus.autoplay.healthSensor.numericHealthSource === "native-csharp-vitality", "native public health projection must retain its source");
assert(dev1054NativeHealthStatus.autoplay.healthSensor.nativeHealthGametic === 1075, "native public health projection must retain the current gametic");

const continuationNativeHealthRuntime = Object.create(Runtime.prototype);
Object.assign(continuationNativeHealthRuntime, dev1054NativeHealthRuntime, {
  autoplayCSharpE1M1ContinuationDecision: {
    controlTick: 57,
    vitalityTrace: {
      available: true,
      fresh: true,
      nativeGametic: 2201,
      playerHealth: 23,
      playerState: 0,
      playerKillCount: 5,
      provenance: "native-e1m1-continuation-vitality-v1"
    }
  }
});
const continuationNativeHealthStatus = continuationNativeHealthRuntime.status();
assert(continuationNativeHealthStatus.autoplay.healthSensor.health === 23, "current E1M1 continuation vitality must outrank the frozen FirstDoor health");
assert(continuationNativeHealthStatus.autoplay.healthSensor.value === 23, "continuation native health must remain the public numeric value");
assert(continuationNativeHealthStatus.autoplay.healthSensor.nativeHealthGametic === 2201, "continuation health projection must retain its current native gametic");
assert(continuationNativeHealthStatus.autoplay.healthSensor.numericHealthProvenance === "native-e1m1-continuation-vitality-v1", "continuation health projection must retain C# provenance");

const continuationMissingVitalityRuntime = Object.create(Runtime.prototype);
Object.assign(continuationMissingVitalityRuntime, dev1054NativeHealthRuntime, {
  autoplayCSharpE1M1ContinuationActive: true,
  autoplayCSharpE1M1ContinuationDecision: {
    controlTick: 58,
    vitalityTrace: {
      available: false,
      fresh: false,
      nativeGametic: -1,
      playerHealth: -1,
      provenance: "native-e1m1-continuation-vitality-v1"
    }
  }
});
assert(
  continuationMissingVitalityRuntime.resolveCurrentCSharpNativeHealth() === null,
  "active continuation with a transient missing vitality sample must never fall back to frozen FirstDoor health");

const authoritativeLowFaceRuntime = Object.create(Runtime.prototype);
Object.assign(authoritativeLowFaceRuntime, publicRuntime, {
  autoplayHealthSensor: {
    active: true,
    estimatedPercent: 100,
    value: 100,
    health: 100,
    faceSignature: "0440044004400440",
    faceSignatureValid: false,
    faceLifePhase: "healthy",
    healthFaceLifePhase: "healthy",
    faceLifeLevel: 5,
    healthFaceLifeLevel: 5,
    faceLifeTemplatePhase: "moribund",
    healthFaceLifeTemplatePhase: "moribund",
    faceLifeTemplateLevel: 1,
    healthFaceLifeTemplateLevel: 1,
    faceLifeTemplateAuthoritative: true,
    healthFaceLifeTemplateAuthoritative: true,
    faceLifeTemplateSource: "quantized-phase",
    faceLifeTemplateConfidence: 0.86,
    faceLifeQuantizedPhase: "moribund",
    faceLifeQuantizedLevel: 1,
    faceHeartbeatAlive: false,
    healthFaceHeartbeatAlive: false,
    faceNoHeartbeatFrames: 12,
    likelyDead: false,
    retryRequested: false
  },
  autoplayCSharpFirstDoorDecision: null
});
const authoritativeLowFaceStatus = authoritativeLowFaceRuntime.status();
assert(authoritativeLowFaceStatus.autoplay.faceLifePhase === "moribund", "authoritative low face template must outrank stale temporal healthy");
assert(authoritativeLowFaceStatus.autoplay.faceLifeLevel === 1, "authoritative level 1 must not be overwritten by stale level 5");
assert(authoritativeLowFaceStatus.autoplay.healthSensor.faceLifeLevel === 1, "canonical public health must retain authoritative level 1");

const disagreeingTemplateAliasesRuntime = Object.create(Runtime.prototype);
Object.assign(disagreeingTemplateAliasesRuntime, publicRuntime, {
  autoplayHealthSensor: {
    active: true,
    faceSignature: "0440044004400440",
    faceSignatureValid: false,
    healthFaceLifePhase: "healthy",
    healthFaceLifeLevel: 5,
    faceLifePhase: "moribund",
    faceLifeLevel: 1,
    healthFaceLifeTemplatePhase: "unknown",
    healthFaceLifeTemplateLevel: 5,
    faceLifeTemplatePhase: "moribund",
    faceLifeTemplateLevel: 1,
    healthFaceLifeTemplateAuthoritative: true,
    faceLifeTemplateAuthoritative: true,
    faceLifeTemplateSource: "quantized-phase",
    faceLifeTemplateConfidence: 0.86,
    faceHeartbeatAlive: false,
    healthFaceHeartbeatAlive: false,
    faceNoHeartbeatFrames: 12,
    likelyDead: false,
    retryRequested: false
  },
  bonsaiSupervisor: null,
  autoplayCSharpFirstDoorDecision: null
});
const disagreeingTemplateAliasesStatus = disagreeingTemplateAliasesRuntime.status();
assert(disagreeingTemplateAliasesStatus.autoplay.faceLifePhase === "moribund", "non-health template phase alias must survive a health-prefixed unknown/stale alias");
assert(disagreeingTemplateAliasesStatus.autoplay.faceLifeLevel === 1, "the lowest supported template/temporal alias must win when aliases disagree");

const disagreeingQuantizedAliasesRuntime = Object.create(Runtime.prototype);
Object.assign(disagreeingQuantizedAliasesRuntime, publicRuntime, {
  autoplayHealthSensor: {
    active: true,
    faceSignature: "0440044004400440",
    faceSignatureValid: false,
    healthFaceLifePhase: "healthy",
    healthFaceLifeLevel: 5,
    faceLifePhase: "healthy",
    faceLifeLevel: 5,
    healthFaceLifeQuantizedPhase: "unknown",
    healthFaceLifeQuantizedLevel: 5,
    faceLifeQuantizedPhase: "moribund",
    faceLifeQuantizedLevel: 1,
    healthFaceLifeTemplateAuthoritative: false,
    faceLifeTemplateAuthoritative: false,
    faceLifeTemplateSource: "quantized-phase",
    faceLifeTemplateConfidence: 0.86,
    faceHeartbeatAlive: false,
    healthFaceHeartbeatAlive: false,
    faceNoHeartbeatFrames: 12,
    likelyDead: false,
    retryRequested: false
  },
  bonsaiSupervisor: null,
  autoplayCSharpFirstDoorDecision: null
});
const disagreeingQuantizedAliasesStatus = disagreeingQuantizedAliasesRuntime.status();
assert(disagreeingQuantizedAliasesStatus.autoplay.faceLifePhase === "moribund", "supported non-health quantized phase must survive a health-prefixed unknown alias");
assert(disagreeingQuantizedAliasesStatus.autoplay.faceLifeLevel === 1, "supported quantized level 1 must outrank stale temporal and quantized level 5 aliases");

const invulnerableRuntime = Object.create(Runtime.prototype);
Object.assign(invulnerableRuntime, publicRuntime, {
  autoplayHealthSensor: {
    active: true,
    faceLifePhase: "moribund",
    healthFaceLifePhase: "moribund",
    faceLifeLevel: 1,
    healthFaceLifeLevel: 1,
    faceHeartbeatAlive: false,
    healthFaceHeartbeatAlive: false,
    likelyDead: false,
    retryRequested: false
  },
  bonsaiSupervisor: null,
  autoplayHealthInvulnerableFrames: 10,
  autoplayHealthLikelyDead: false
});
invulnerableRuntime.applyAutoplayInvulnerableHealthHint = Runtime.prototype.applyAutoplayInvulnerableHealthHint;
const invulnerableStatus = invulnerableRuntime.status();
assert(invulnerableStatus.autoplay.faceLifePhase === "invulnerable", "top-level status must reflect the applied invulnerable hint");
assert(invulnerableStatus.autoplay.faceLifeLevel === 5, "top-level invulnerable status must use level 5");
assert(invulnerableStatus.autoplay.healthSensor.healthFaceLifeLevel === 5, "invulnerable health aliases must remain synchronized");
assert(invulnerableStatus.autoplay.faceHeartbeatAlive === true, "top-level heartbeat must match the invulnerable health snapshot");

const exactBlockStart = doomSource.indexOf("if (this.autoplayCSharpExactAction) {", doomSource.indexOf("tryRunWasmAutoplay(state)"));
const exactBlockEnd = doomSource.indexOf("this.autoplayControllerKind = \"control-runtime-shim\";", exactBlockStart);
assert(exactBlockStart >= 0 && exactBlockEnd > exactBlockStart, "exact C# dispatch block should remain discoverable");
assert(!doomSource.slice(exactBlockStart, exactBlockEnd).includes("clearAutoplayRetryDispatch"), "exact C# dispatch must not clear an in-progress death debounce");
const nativeRestartTransport = doomSource.indexOf("if (this.scheduleCSharpNativeRestartDispatch(csharpFirstDoorDecision))", doomSource.indexOf("tryRunWasmAutoplay(state)"));
const downstreamOwnerDispatch = doomSource.indexOf("const dispatch = csharpFirstDoor.dispatch", nativeRestartTransport);
assert(nativeRestartTransport >= 0 && downstreamOwnerDispatch > nativeRestartTransport, "validated native restart transport must precede every downstream owner dispatch");

const faultBlockStart = doomSource.indexOf("if (this.autoplayCSharpFirstDoorFaulted) {");
const faultBlockEnd = doomSource.indexOf("try {", faultBlockStart);
assert(faultBlockStart >= 0 && faultBlockEnd > faultBlockStart, "latched C# fault block should remain discoverable");
assert(!doomSource.slice(faultBlockStart, faultBlockEnd).includes("clearAutoplayRetryDispatch"), "latched C# fault frames must not clear an in-progress death debounce");
assert(doomSource.includes("controlFaceDelta <= 24"), "control-runtime heartbeat pulse must reject sentinel delta 255");
assert(doomSource.includes("runtimeFaceDelta <= 24"), "runtime heartbeat pulse must reject sentinel delta 255");
assert(doomSource.includes("this.autoplayCSharpSemanticState = dispatch.semanticState || this.autoplayCSharpSemanticState;"), "successful FirstDoor dispatch must retain its transactional semantic store");
assert(!doomSource.includes("this.autoplayCSharpSemanticState = postComputerRoomDispatch?.semanticState"), "post-route semantic state must never overwrite the FirstDoor CAS store");
assert((doomSource.match(/this\.autoplayCSharpPostComputerRoomSemanticState = null;/g) || []).length >= 5, "constructor and every fault/run boundary must clear post-route semantic state");
assert((doomSource.match(/this\.autoplayCSharpE1M1ContinuationDecision = null;/g) || []).length >= 5, "constructor and every fault/run boundary must clear the E1M1 continuation decision");
assert(doomSource.indexOf("if (this.autoplayCSharpE1M1ContinuationActive)") < doomSource.indexOf("this.createWasmAutoplayState(state)"), "active E1M1 continuation must bypass legacy frame enrichment");

let continuationFastEvaluations = 0;
let continuationLegacyFrameReads = 0;
let continuationFaceRetrySchedules = 0;
let continuationAppliedActions = 0;
let continuationStatusEmits = 0;
const continuationFastRuntime = Object.create(Runtime.prototype);
Object.assign(continuationFastRuntime, {
  autoplayEnabled: true,
  bonsaiSupervisor: null,
  wasmAutoplayReady: true,
  autoplayRetryDispatch: retry.createState(),
  autoplayCSharpE1M1ContinuationActive: true,
  autoplayCSharpRetryHandled: false,
  autoplayPending: false,
  autoplayReused: 0,
  autoplayLastAction: null,
  refreshCSharpNativeLevelLoadBoundary: () => false,
  processAutoplayRetryDispatch: () => false,
  tryRunWasmAutoplay(state) {
    assert(state === null, "continuation fast path must evaluate from native facts without a legacy sensor state");
    continuationFastEvaluations += 1;
    this.autoplayCSharpExactAction = true;
    this.autoplayLastAction = {
      move: "forward",
      turn: "none",
      fire: false,
      strafe: false,
      use: false,
      run: true
    };
    return true;
  },
  resolveLatestFramebufferIndices() {
    continuationLegacyFrameReads += 1;
    return null;
  },
  updateWebGpuFrameState() {
    continuationLegacyFrameReads += 1;
  },
  createAutoplayState() {
    continuationLegacyFrameReads += 1;
    return {};
  },
  scheduleAutoplayFrameRetryDispatch() {
    continuationFaceRetrySchedules += 1;
    return false;
  },
  emitStatus(reason) {
    assert(reason === "autoplay-predicted", "continuation fast path must publish the normal predicted boundary");
    continuationStatusEmits += 1;
  },
  applyAutoplayAction(action, options) {
    assert(action === this.autoplayLastAction, "continuation fast path must apply the exact C# action");
    assert(options?.exactAction === true, "continuation fast path must remain exact");
    continuationAppliedActions += 1;
  }
});
continuationFastRuntime.runAutoplay({ staleFramebuffer: true });
assert(continuationFastEvaluations === 1, "active continuation must evaluate exactly once per native frame");
assert(continuationLegacyFrameReads === 0, "active continuation must skip framebuffer/GPU/legacy sensor construction");
assert(continuationFaceRetrySchedules === 0, "active continuation must skip JS face/heartbeat retry heuristics");
assert(continuationAppliedActions === 1, "active continuation must apply one exact C# action");
assert(continuationStatusEmits === 1, "active continuation must emit one coalescible predicted status boundary");

const csharpDeathAuthorityRuntime = Object.create(Runtime.prototype);
Object.assign(csharpDeathAuthorityRuntime, {
  autoplayCSharpE1M1ContinuationDecision: null,
  autoplayCSharpPostComputerRoomDecision: {
    ownershipDisposition: "Exclusive"
  },
  autoplayCSharpFirstDoorDecision: {
    ownershipDisposition: "Completed"
  }
});
assert(csharpDeathAuthorityRuntime.csharpNativeDeathAuthorityActive() === true, "an exact C# post-route owner must suppress JS face retry authority");
csharpDeathAuthorityRuntime.autoplayCSharpPostComputerRoomDecision = null;
csharpDeathAuthorityRuntime.autoplayCSharpFirstDoorDecision = {
  ownershipDisposition: "NotAcquired"
};
assert(csharpDeathAuthorityRuntime.csharpNativeDeathAuthorityActive() === false, "a genuinely unacquired C# owner may leave the legacy retry path available");

const deathState = {
  healthSensor: {
    active: true,
    likelyDead: true,
    retryRequested: true,
    retryReason: "health-face-life-no-heartbeat",
    faceLifePhase: "moribund",
    faceLifeLevel: 1,
    faceHeartbeatAlive: false,
    faceNoHeartbeatFrames: 120,
    estimatedPercent: 5
  },
  framebuffer: {}
};
const exactRuntime = Object.create(Runtime.prototype);
Object.assign(exactRuntime, {
  autoplayEnabled: true,
  bonsaiSupervisor: null,
  wasmAutoplayReady: true,
  autoplayCSharpExactAction: false,
  autoplayCSharpRetryHandled: false,
  autoplayRetryDispatch: retry.createState(),
  autoplayPending: false,
  autoplayMode: "idle",
  visualSensorEnabled: false,
  autoplayVisionZeroCopy: false,
  state: "running",
  retryProcessCalls: 0,
  exactRuns: 0
});
exactRuntime.resolveLatestFramebufferIndices = () => null;
exactRuntime.updateWebGpuFrameState = () => {};
exactRuntime.logAutoplayVisionPath = () => {};
exactRuntime.createAutoplayState = () => deathState;
exactRuntime.updateGpuHudOverlayState = () => {};
exactRuntime.emitStatus = () => {};
exactRuntime.applyAutoplayAction = () => {};
exactRuntime.tryRunWasmAutoplay = function () {
  this.autoplayCSharpExactAction = true;
  this.exactRuns += 1;
  return true;
};
exactRuntime.processAutoplayRetryDispatch = function () {
  this.retryProcessCalls += 1;
  return true;
};
exactRuntime.scheduleAutoplayFrameRetryDispatch = function (status) {
  const result = retry.schedule(this.autoplayRetryDispatch, status, {
    runtimeState: "running",
    senseOnly: false,
    keys: { use: 0xa2 },
    enterKey: 13,
    tapFrames: 8,
    releaseInputs() {},
    resetSensors() {},
    queueInput() {}
  });
  return result.scheduled || retry.snapshot(this.autoplayRetryDispatch).active;
};

exactRuntime.runAutoplay(null);
assert(exactRuntime.autoplayRetryDispatch.healthRetryFrames === 1, "first death frame should survive exact C# ownership as debounce frame one");
exactRuntime.runAutoplay(null);
assert(exactRuntime.autoplayRetryDispatch.healthRetryFrames === 2, "second death frame should survive exact C# ownership as debounce frame two");
exactRuntime.runAutoplay(null);
assert(exactRuntime.autoplayRetryDispatch.healthRetryFrames === 3, "third consecutive death frame should reach the retry threshold under exact C# ownership");
assert(retry.snapshot(exactRuntime.autoplayRetryDispatch).active === true, "third consecutive death frame should queue the bounded retry sequence");
assert(exactRuntime.exactRuns === 2, "retry dispatch should preempt C# action evaluation on the scheduling frame");
assert(exactRuntime.retryProcessCalls === 1, "queued retry should begin processing on the third death frame");

const nativeExactRuntime = Object.create(Runtime.prototype);
const nativeQueued = [];
Object.assign(nativeExactRuntime, {
  state: "running",
  autoplaySenseOnly: false,
  autoplayCSharpRetryHandled: false,
  autoplayRetryDispatch: retry.createState(),
  releaseAutoplayInputs() {},
  releaseAutoplayMoveInputs() {},
  resetAutoplaySensorState() {},
  queueInput(keycode, pressed) {
    nativeQueued.push({ keycode, pressed });
  },
  log() {},
  emitStatus() {}
});
const nativeHandled = nativeExactRuntime.scheduleCSharpNativeRestartDispatch({
  ownershipDisposition: "Completed",
  nativeDeathConfirmed: true,
  restartRequested: true,
  restartRequestId: "native-death:1:512:9",
  restartReason: "native-player-death-confirmed",
  vitalityTrace: {
    consecutiveDeathGametics: 3,
    requiredDeathGametics: 3,
    nativeEvidenceAuthoritative: true,
    authority: "native-player-vitality"
  }
});
assert(nativeHandled === true, "exact C# native restart should enter and process the existing retry sequence");
assert(nativeExactRuntime.autoplayCSharpRetryHandled === true, "exact C# restart should suppress the stale exact gameplay action");
assert(retry.snapshot(nativeExactRuntime.autoplayRetryDispatch).active === true, "exact C# native restart should leave the bounded sequence active");
assert(nativeQueued.length === 1 && nativeQueued[0].keycode === 0xa2 && nativeQueued[0].pressed === true, "exact C# native restart should mechanically queue the first Use press");
for (let step = 0; step < 32 && !nativeQueued.some(item => item.keycode === 13 && item.pressed === true); step += 1) {
  nativeExactRuntime.processAutoplayRetryDispatch();
}
assert(nativeQueued.some(item => item.keycode === 0xa2 && item.pressed === false), "exact C# native restart should mechanically release Use");
assert(nativeQueued.some(item => item.keycode === 13 && item.pressed === true), "exact C# native restart should mechanically queue Enter after Use");

const activeBoundaryState = retry.createState();
retry.schedule(activeBoundaryState, {
  csharpFirstDoor: {
    restartRequested: true,
    restartRequestId: "native-death:1:700:boundary",
    restartReason: "native-player-death-confirmed"
  }
}, {
  runtimeState: "running",
  senseOnly: false,
  keys: { use: 0xa2 },
  enterKey: 13,
  tapFrames: 8,
  releaseInputs() {},
  resetSensors() {}
});
let activeBoundaryChecks = 0;
let staleActiveRetryProcesses = 0;
const activeBoundaryResets = [];
const activeBoundaryQueued = [];
const activeBoundaryRuntime = Object.create(Runtime.prototype);
Object.assign(activeBoundaryRuntime, {
  autoplayEnabled: true,
  bonsaiSupervisor: null,
  wasmAutoplayReady: true,
  autoplayRetryDispatch: activeBoundaryState,
  autoplayPending: true,
  visualSensorEnabled: false,
  autoplayLastAction: {},
  refreshCSharpNativeLevelLoadBoundary() {
    activeBoundaryChecks += 1;
    return true;
  },
  resetAutoplaySensorState(reason) {
    activeBoundaryResets.push(reason);
  },
  releaseAutoplayInputs() {},
  releaseAutoplayMoveInputs() {},
  queueInput(keycode, pressed) {
    activeBoundaryQueued.push({ keycode, pressed });
  },
  resolveLatestFramebufferIndices() {
    return null;
  },
  updateWebGpuFrameState() {},
  logAutoplayVisionPath() {},
  applyAutoplayAction() {}
});
activeBoundaryRuntime.processAutoplayRetryDispatch = function () {
  if (retry.snapshot(this.autoplayRetryDispatch).active) {
    staleActiveRetryProcesses += 1;
  }
  return Runtime.prototype.processAutoplayRetryDispatch.call(this);
};
activeBoundaryRuntime.runAutoplay(null);
assert(activeBoundaryChecks === 1, "native level-load boundary must be checked before an active retry can preempt autoplay");
assert(staleActiveRetryProcesses === 0, "stale Use/Enter retry steps must not execute after the native level-load boundary");
assert(retry.snapshot(activeBoundaryRuntime.autoplayRetryDispatch).active === false, "native level-load boundary must clear the active retry sequence");
assert(activeBoundaryResets.length === 1 && activeBoundaryResets[0] === "native-level-load", "native level-load boundary must reset sensors with fresh-run provenance");
assert(activeBoundaryQueued.some(item => item.keycode === 0xa2 && item.pressed === false), "native level-load clear must release Use");
assert(activeBoundaryQueued.some(item => item.keycode === 13 && item.pressed === false), "native level-load clear must release Enter");

let nativeLevelLoadSequence = 41;
let nativeLevelStartTic = 390;
const nativeBoundaryRuntime = Object.create(Runtime.prototype);
Object.assign(nativeBoundaryRuntime, {
  exports: {
    doom_run_facts_available: () => 1,
    doom_run_gametic: () => 900,
    doom_run_leveltime: () => 12,
    doom_run_levelstarttic: () => nativeLevelStartTic,
    doom_run_gamestate: () => 0,
    doom_run_gameepisode: () => 1,
    doom_run_gamemap: () => 1,
    doom_run_level_load_sequence_available: () => 1,
    doom_run_level_load_sequence: () => nativeLevelLoadSequence
  },
  autoplayCSharpNativeLevelLoadBaselinePending: true,
  autoplayCSharpNativeLevelLoadSequence: 0,
  autoplayCSharpSessionId: "native-boundary-session",
  autoplayCSharpRunGeneration: 4,
  autoplayCSharpRunId: "native-boundary-session:run-4",
  autoplayCSharpResetOperationSequence: 6,
  autoplayCSharpFirstDoorDecision: { stale: true },
  autoplayCSharpPostComputerRoomDecision: { stale: true },
  autoplayCSharpPostComputerRoomDispatchMode: "exclusive",
  autoplayCSharpPostComputerRoomSemanticState: { stale: true },
  autoplayCSharpE1M1ContinuationActive: true,
  autoplayCSharpE1M1ContinuationDecision: { stale: true },
  autoplayCSharpE1M1ContinuationDispatchMode: "exclusive",
  autoplayCSharpE1M1ContinuationSemanticState: { stale: true },
  autoplayCSharpDecisionSnapshot: { stale: true },
  autoplayCSharpAppliedActionSnapshot: { stale: true },
  autoplayCSharpSemanticState: { stale: true },
  autoplayCSharpDispatchMode: "exclusive",
  autoplayCSharpExactAction: true,
  autoplayCSharpRetryHandled: true,
  autoplayCSharpFirstDoorFaulted: true,
  autoplayCSharpLatestAudioCatalogObservation: freshCatalogObservation,
  autoplayCSharpLatestAudioCatalogScopeKey: "native-boundary-session|native-boundary-session:run-4|4",
  autoplayCSharpLatestAudioCatalogControlTick: 530
});
assert(nativeBoundaryRuntime.refreshCSharpNativeLevelLoadBoundary() === false, "first native sequence should establish only the run baseline");
assert(nativeBoundaryRuntime.autoplayCSharpNativeLevelLoadSequence === 41, "native run baseline must retain the first observed sequence");
nativeLevelLoadSequence = 42;
nativeLevelStartTic = 512;
assert(nativeBoundaryRuntime.refreshCSharpNativeLevelLoadBoundary() === true, "same-map level-load sequence increment must establish a fresh run boundary");
assert(nativeBoundaryRuntime.autoplayCSharpRunGeneration === 5, "same-map level load must advance the C# run generation exactly once");
assert(nativeBoundaryRuntime.autoplayCSharpRunId === "native-boundary-session:native-level-load-42:run-5", "same-map level load must create an isolated run id");
assert(nativeBoundaryRuntime.autoplayCSharpResetRequested === true, "same-map level load must request a C# session reset");
assert(nativeBoundaryRuntime.autoplayCSharpLifecycleEvent === "run-restarted", "same-map level load must publish restart lifecycle provenance");
assert(nativeBoundaryRuntime.autoplayCSharpResetOperationId === "native-boundary-session:native-level-load-42:run-5:reset-7", "same-map level load must create a unique reset operation id");
assert(nativeBoundaryRuntime.autoplayCSharpFirstDoorDecision === null, "fresh run must isolate the prior FirstDoor decision");
assert(nativeBoundaryRuntime.autoplayCSharpPostComputerRoomDecision === null, "fresh run must isolate the prior post-COMPUTERROOM decision");
assert(nativeBoundaryRuntime.autoplayCSharpSemanticState === null, "fresh run must isolate the prior FirstDoor semantic store");
assert(nativeBoundaryRuntime.autoplayCSharpPostComputerRoomSemanticState === null, "fresh run must isolate the prior post-route semantic store");
assert(nativeBoundaryRuntime.autoplayCSharpE1M1ContinuationActive === false, "fresh run must deactivate the prior E1M1 continuation owner");
assert(nativeBoundaryRuntime.autoplayCSharpE1M1ContinuationDecision === null, "fresh run must isolate the prior E1M1 continuation decision");
assert(nativeBoundaryRuntime.autoplayCSharpE1M1ContinuationSemanticState === null, "fresh run must isolate the prior E1M1 continuation semantic store");
assert(nativeBoundaryRuntime.autoplayCSharpLatestAudioCatalogObservation === null, "native level load must clear retained audio diagnostics from the prior run");
assert(nativeBoundaryRuntime.autoplayCSharpNativeRunBoundary.previousSequence === 41, "fresh-run evidence must retain the previous native sequence");
assert(nativeBoundaryRuntime.autoplayCSharpNativeRunBoundary.sequence === 42, "fresh-run evidence must retain the current native sequence");
assert(nativeBoundaryRuntime.autoplayCSharpNativeRunBoundary.gameepisode === 1 && nativeBoundaryRuntime.autoplayCSharpNativeRunBoundary.gamemap === 1, "same-map restart proof must retain unchanged episode/map facts");

const noNativeRestartRuntime = Object.create(Runtime.prototype);
const preservedFaceDebounce = retry.createState();
preservedFaceDebounce.healthRetryFrames = 2;
Object.assign(noNativeRestartRuntime, {
  autoplayRetryDispatch: preservedFaceDebounce,
  autoplayCSharpRetryHandled: false
});
assert(noNativeRestartRuntime.scheduleCSharpNativeRestartDispatch({ restartRequested: false }) === false, "ordinary exact decisions must not enter native restart transport");
assert(preservedFaceDebounce.healthRetryFrames === 2, "ordinary exact decisions must not erase an in-progress face retry debounce");

const contractFaultRuntime = Object.create(Runtime.prototype);
Object.assign(contractFaultRuntime, {
  autoplayCSharpFirstDoorDecision: null,
  autoplayCSharpDecisionSnapshot: null,
  autoplayCSharpFirstDoorScope: {
    sessionId: "fault-session",
    runId: "fault-session:native-level-load-7:run-3",
    runGeneration: 3,
    lifecycleState: "running"
  },
  autoplayCSharpSessionId: "fault-session",
  autoplayCSharpRunId: "fault-session:native-level-load-7:run-3",
  autoplayCSharpRunGeneration: 3,
  autoplayCSharpNativeLevelLoadSequence: 7,
  frameCount: 812
});
const contractFaultSnapshot = contractFaultRuntime.createCSharpFirstDoorContractFaultSnapshot(
  "typed-controller-wire-fault");
assert(contractFaultSnapshot.contractFault === true
  && contractFaultSnapshot.contractError === "typed-controller-wire-fault",
"a disabled C# controller snapshot must retain an explicit top-level contract fault");
assert(contractFaultSnapshot.sessionId === "fault-session"
  && contractFaultSnapshot.runId === "fault-session:native-level-load-7:run-3"
  && contractFaultSnapshot.runGeneration === 3
  && contractFaultSnapshot.nativeLevelLoadSequence === 7,
"a disabled C# controller snapshot must retain current top-level run identity for live FAIL classification");
assert(contractFaultSnapshot.scope.nativeLevelLoadSequence === 7,
  "the nested diagnostic scope must retain the same native load sequence as the top-level fault identity");

const promptGlyphStart = promptSource.indexOf("function resolveLifeGlyph(autoplay = {}, zoe = {})");
const promptGlyphEnd = promptSource.indexOf("function formatAutoplayHealthText", promptGlyphStart);
const promptGlyph = promptSource.slice(promptGlyphStart, promptGlyphEnd);
assert(promptGlyphStart >= 0 && promptGlyphEnd > promptGlyphStart, "prompt life-glyph resolver should remain discoverable");
assert(promptGlyph.indexOf("autoplay.healthFaceLifePhase") < promptGlyph.indexOf("health.faceLifeTemplatePhase"), "prompt should prefer stabilized life phase over raw template phase");
assert(promptGlyph.indexOf("autoplay.healthFaceLifeLevel") < promptGlyph.indexOf("health.faceLifeTemplateLevel"), "prompt should prefer stabilized life level over raw template level");
assert(promptGlyph.includes("const heartbeat = heartbeatAlive || phase === \"invulnerable\""), "prompt heartbeat label should use canonical explicit-boolean precedence");
assert(promptSource.includes("statusAudio.catalogSource === \"csharp-native-sfx-catalog\""), "prompt must treat the C# catalog projection, including No audio event, as authoritative");
assert(promptSource.includes("statusAudio.audioCatalogLastObservation"), "prompt must render the separate retained C# catalog diagnostic when the current tick is empty");
assert(promptSource.includes("catalogSfx=${catalogObservationKind}:${String(catalogObservation.sfxId)}:${String(catalogObservation.rawSfxName || \"\")}"), "prompt diagnostics must carry current/last provenance plus the raw catalog SFX id/name pair without classifying it in JS");

const reducedCapEvents = [];
const reducedCapRuntime = Object.create(Runtime.prototype);
Object.assign(reducedCapRuntime, {
  targetFps: 30,
  fps: 20,
  fpsSampleFrames: 10,
  noWaitSampleFrames: 6,
  targetFpsRecoverySamples: 4,
  nextFrameDueAt: 100,
  log() {},
  emitStatus(reason) { reducedCapEvents.push(reason); }
});
reducedCapRuntime.adjustTargetFps();
assert(reducedCapRuntime.targetFps === 25 && reducedCapEvents.at(-1) === "cap-reduced", "sustained no-wait overload must still reduce the adaptive cap once");
assert(reducedCapRuntime.targetFpsRecoverySamples === 0, "an overload reduction must clear recovery hysteresis");

const recoveredCapEvents = [];
const recoveredCapRuntime = Object.create(Runtime.prototype);
Object.assign(recoveredCapRuntime, {
  targetFps: 15,
  fps: 15,
  fpsSampleFrames: 10,
  noWaitSampleFrames: 0,
  targetFpsRecoverySamples: 5,
  nextFrameDueAt: 100,
  log() {},
  emitStatus(reason) { recoveredCapEvents.push(reason); }
});
recoveredCapRuntime.adjustTargetFps();
assert(recoveredCapRuntime.targetFps === 20 && recoveredCapEvents.at(-1) === "cap-recovered", "six sustained headroom samples must recover one adaptive-cap step");
assert(recoveredCapRuntime.targetFpsRecoverySamples === 0 && recoveredCapRuntime.nextFrameDueAt === 0, "cap recovery must reset its hysteresis and scheduler deadline");

const watchdogVisibilityRuntime = Object.create(Runtime.prototype);
context.document.visibilityState = "hidden";
assert(watchdogVisibilityRuntime.isWatchdogPageVisible() === false, "hidden pages must not authorize watchdog restarts");
context.document.visibilityState = "visible";
context.document.hasFocus = () => false;
assert(watchdogVisibilityRuntime.isWatchdogPageVisible() === false, "unfocused pages must not authorize watchdog restarts");
context.document.hasFocus = () => true;
assert(watchdogVisibilityRuntime.isWatchdogPageVisible() === true, "visible focused pages may authorize watchdog observation");

const originalGpuProvider = context.WebGpuComputeProvider;
let rejectOldGpuFence = null;
context.AIKernelDoomGpuMode.useGpuRendering = true;
context.AIKernelDoomGpuMode.gpuPermanentlyDisabled = false;
context.WebGpuComputeProvider = {
  queue: {
    onSubmittedWorkDone: () => new Promise((resolve, reject) => {
      rejectOldGpuFence = reject;
    })
  }
};
let staleGpuLostCalls = 0;
const staleGpuFenceRuntime = Object.create(Runtime.prototype);
Object.assign(staleGpuFenceRuntime, {
  loopToken: 7,
  loopActive: true,
  frameTimer: 0,
  watchdogTimer: 0,
  animationFrame: 0,
  gpuQueueFencePending: null,
  gpuQueueFenceGeneration: 3,
  gpuQueueStaleCompletions: 0,
  gpuFlushCount: 0,
  gpuWaitTimeouts: 0,
  lastGpuWaitMs: 0,
  handleGpuLost() { staleGpuLostCalls += 1; }
});
staleGpuFenceRuntime.waitForGpuQueue();
assert(staleGpuFenceRuntime.gpuQueueFencePending, "a submitted GPU queue fence must be tracked without blocking the frame loop");
staleGpuFenceRuntime.stopLoop();
assert(staleGpuFenceRuntime.gpuQueueFenceGeneration === 4 && staleGpuFenceRuntime.gpuQueueFencePending === null,
  "stopping a loop must invalidate and detach its outstanding GPU fence");
rejectOldGpuFence(new Error("late old-loop device loss"));
await new Promise(resolve => setTimeout(resolve, 0));
assert(staleGpuLostCalls === 0, "an old-loop GPU rejection must not disable the replacement renderer");
assert(staleGpuFenceRuntime.gpuQueueStaleCompletions === 1,
  "an old-loop GPU rejection must be retained only as a stale diagnostic");
context.WebGpuComputeProvider = originalGpuProvider;

const completedRecoveryEvents = [];
const completedRecoveryRuntime = Object.create(Runtime.prototype);
Object.assign(completedRecoveryRuntime, {
  watchdogRecoveryPending: false,
  watchdogRecoveryKind: "",
  watchdogRecoveryReason: "",
  watchdogRecoveryStartedAt: 0,
  watchdogRestartArmed: true,
  selfHealCount: 0,
  lastSelfHealKind: "none",
  lastSelfHealReason: "",
  lastSelfHealAt: 0,
  watchdogRestarts: 1,
  log() {},
  emitStatus(reason) { completedRecoveryEvents.push(reason); }
});
completedRecoveryRuntime.beginWatchdogRecovery("frame-watchdog", "stall:4000ms");
assert(completedRecoveryRuntime.selfHealCount === 0 && completedRecoveryRuntime.watchdogRecoveryPending === true
  && completedRecoveryRuntime.watchdogRestartArmed === false,
"starting a replacement loop must remain recovery-pending and must not claim a self-heal");
assert(completedRecoveryRuntime.completeWatchdogRecovery() === true,
  "the first fully completed replacement frame must certify watchdog recovery");
assert(completedRecoveryRuntime.selfHealCount === 1 && completedRecoveryRuntime.watchdogRecoveryPending === false
  && completedRecoveryRuntime.watchdogRestartArmed === true
  && completedRecoveryEvents.at(-1) === "watchdog-recovered",
"a completed replacement frame must record exactly one self-heal and re-arm the watchdog");

const originalPerformance = context.performance;
const originalSetTimeout = context.setTimeout;
const originalClearTimeout = context.clearTimeout;
const originalSetInterval = context.setInterval;
const originalClearInterval = context.clearInterval;
const originalDocumentAddEventListener = context.document.addEventListener;
const originalDocumentRemoveEventListener = context.document.removeEventListener;
let watchdogClock = 100;
let watchdogTick = null;
let visibilityChangeHandler = null;
context.performance = { now: () => watchdogClock };
context.setTimeout = () => 90;
context.clearTimeout = () => {};
context.setInterval = callback => {
  watchdogTick = callback;
  return 91;
};
context.clearInterval = () => {};
context.document.addEventListener = (type, handler) => {
  if (type === "visibilitychange") visibilityChangeHandler = handler;
};
context.document.removeEventListener = (type, handler) => {
  if (type === "visibilitychange" && visibilityChangeHandler === handler) {
    visibilityChangeHandler = null;
  }
};

let startupWatchdogRestarts = 0;
const startupWatchdogRuntime = Object.create(Runtime.prototype);
Object.assign(startupWatchdogRuntime, {
  state: "running",
  loopToken: 0,
  loopActive: false,
  frameTimer: 0,
  watchdogTimer: 0,
  animationFrame: 0,
  gpuQueueFencePending: null,
  gpuQueueFenceGeneration: 0,
  gpuQueueFenceStartedAt: 0,
  watchdogRecoveryPending: false,
  watchdogRestartArmed: true,
  watchdogRestarting: false,
  gpuFallbackRestarting: false,
  watchdogVisibleStallSamples: 0,
  watchdogSuspendedForVisibility: false,
  lastFrameAt: 0,
  log() {},
  emitStatus() {},
  restartAfterWatchdog() { startupWatchdogRestarts += 1; }
});
startupWatchdogRuntime.startLoop();
const startupWatchdogTick = watchdogTick;
assert(startupWatchdogRuntime.lastFrameAt === 100,
  "a fresh loop must establish a first-frame watchdog baseline before scheduling frame work");
watchdogClock = 2101;
startupWatchdogTick();
assert(startupWatchdogRestarts === 0,
  "the first visible startup stall sample must not restart before consecutive confirmation");
watchdogClock = 3101;
startupWatchdogTick();
assert(startupWatchdogRestarts === 1 && startupWatchdogRuntime.watchdogRestartArmed === false,
  "a fresh loop that produces no frame must enter the bounded watchdog restart path");
startupWatchdogRuntime.stopLoop();

let hardFenceGpuLostCalls = 0;
context.WebGpuComputeProvider = {
  queue: { onSubmittedWorkDone: () => new Promise(() => {}) }
};
context.AIKernelDoomGpuMode.useGpuRendering = true;
context.AIKernelDoomGpuMode.gpuPermanentlyDisabled = false;
watchdogClock = 500;
watchdogTick = null;
const hardFenceRuntime = Object.create(Runtime.prototype);
Object.assign(hardFenceRuntime, {
  state: "running",
  loopToken: 21,
  loopActive: true,
  frameTimer: 0,
  watchdogTimer: 0,
  animationFrame: 0,
  gpuQueueFencePending: null,
  gpuQueueFenceGeneration: 8,
  gpuQueueFenceStartedAt: 0,
  gpuQueueStaleCompletions: 0,
  gpuQueueHardTimeouts: 0,
  gpuFlushCount: 0,
  gpuWaitTimeouts: 0,
  lastGpuWaitMs: 0,
  watchdogRecoveryPending: false,
  watchdogRestartArmed: true,
  watchdogRestarting: false,
  gpuFallbackRestarting: false,
  watchdogVisibleStallSamples: 0,
  watchdogSuspendedForVisibility: false,
  lastFrameAt: 500,
  lastError: "",
  log() {},
  emitStatus() {},
  handleGpuLost() { hardFenceGpuLostCalls += 1; }
});
hardFenceRuntime.waitForGpuQueue();
hardFenceRuntime.startWatchdog(21);
hardFenceRuntime.startWatchdogVisibilityObserver(21);
const hardFenceWatchdogTick = watchdogTick;
assert(typeof visibilityChangeHandler === "function",
  "watchdog timing must observe visibility transitions even when interval callbacks are throttled");
context.document.visibilityState = "hidden";
watchdogClock = 600;
visibilityChangeHandler();
context.document.visibilityState = "visible";
watchdogClock = 8500;
visibilityChangeHandler();
watchdogClock = 12499;
hardFenceRuntime.lastFrameAt = watchdogClock;
hardFenceWatchdogTick();
assert(hardFenceGpuLostCalls === 0 && hardFenceRuntime.gpuQueueFencePending,
  "hidden time plus the first 3999 resumed visible milliseconds must not exhaust the GPU fence deadline");
watchdogClock = 12500;
hardFenceRuntime.lastFrameAt = watchdogClock;
hardFenceWatchdogTick();
assert(hardFenceGpuLostCalls === 1 && hardFenceRuntime.gpuQueueHardTimeouts === 1
  && hardFenceRuntime.gpuQueueFencePending === null
  && hardFenceRuntime.gpuQueueFenceGeneration === 9,
  "a never-settling current GPU fence must retire its generation and enter CPU fallback once");
hardFenceRuntime.stopLoop();
context.WebGpuComputeProvider = originalGpuProvider;

let timedRecoveryReleased = 0;
const timedRecoveryRuntime = Object.create(Runtime.prototype);
Object.assign(timedRecoveryRuntime, {
  state: "running",
  loopToken: 12,
  loopActive: true,
  frameTimer: 0,
  watchdogTimer: 0,
  animationFrame: 0,
  gpuQueueFencePending: null,
  gpuQueueFenceGeneration: 0,
  watchdogRecoveryPending: false,
  watchdogRecoveryKind: "",
  watchdogRecoveryReason: "",
  watchdogRecoveryStartedAt: 0,
  watchdogRestartArmed: true,
  watchdogRestarting: false,
  gpuFallbackRestarting: false,
  watchdogVisibleStallSamples: 0,
  watchdogSuspendedForVisibility: false,
  selfHealCount: 0,
  lastError: "",
  releaseAutoplayInputs() { timedRecoveryReleased += 1; },
  log() {},
  emitStatus() {}
});
timedRecoveryRuntime.beginWatchdogRecovery("gpu-fallback", "old-device-lost");
timedRecoveryRuntime.startWatchdog(12);
assert(typeof watchdogTick === "function", "watchdog recovery timeout must be driven by the visible-page watchdog");
context.document.visibilityState = "hidden";
watchdogClock = 8100;
watchdogTick();
context.document.visibilityState = "visible";
watchdogClock = 8200;
watchdogTick();
watchdogClock = 12199;
watchdogTick();
assert(timedRecoveryRuntime.state === "running" && timedRecoveryRuntime.watchdogRecoveryPending === true,
  "hidden time and the first 3999 visible milliseconds must not exhaust the recovery window");
watchdogClock = 12200;
watchdogTick();
assert(timedRecoveryRuntime.state === "failed" && timedRecoveryRuntime.watchdogRecoveryPending === false
  && timedRecoveryRuntime.watchdogRestartArmed === false && timedRecoveryRuntime.selfHealCount === 0
  && timedRecoveryReleased === 1,
"a visible replacement loop that produces no complete frame for the bounded recovery window must fail closed");
context.performance = originalPerformance;
context.setTimeout = originalSetTimeout;
context.clearTimeout = originalClearTimeout;
context.setInterval = originalSetInterval;
context.clearInterval = originalClearInterval;
context.document.addEventListener = originalDocumentAddEventListener;
context.document.removeEventListener = originalDocumentRemoveEventListener;
context.document.visibilityState = "visible";

const drawFrameStart = doomSource.indexOf("async drawFrame(renderResult)");
const drawFrameEnd = doomSource.indexOf("resolveFramebufferIndices(renderResult)", drawFrameStart);
const drawFrameSource = doomSource.slice(drawFrameStart, drawFrameEnd);
const startLoopStart = doomSource.indexOf("startLoop(options = {})");
const startLoopEnd = doomSource.indexOf("isWatchdogPageVisible()", startLoopStart);
const startLoopSource = doomSource.slice(startLoopStart, startLoopEnd);
assert(!drawFrameSource.includes("await this.waitForGpuQueue()"), "frame drawing must not serially await a GPU queue fence");
assert(!drawFrameSource.includes("await yieldToUi()"), "frame drawing must not add a second UI yield inside the outer scheduler");
assert(doomSource.includes("if (token !== this.loopToken || this.state !== \"running\") {\n            return;\n          }\n          this.drainNativeAudio();"), "a GPU fallback must invalidate the old frame before audio or C# control runs");
assert(!doomSource.includes("this.handleGpuLost(\"frame-loop\""), "the outer frame catch must not misclassify arbitrary CPU exceptions as GPU loss");
assert(doomSource.includes("WATCHDOG_REQUIRED_VISIBLE_STALLS"), "watchdog recovery must require consecutive visible stall observations");
assert(doomSource.includes("gpuQueueFenceGeneration !== fenceGeneration"), "GPU queue completion callbacks must reject stale loop generations");
assert(startLoopSource.includes("this.lastFrameAt = window.performance?.now?.() || Date.now();"), "fresh loops must arm first-frame watchdog timing before frame scheduling");
assert(doomSource.includes("GPU_QUEUE_HARD_TIMEOUT_MS"), "current GPU fences must have a long visible hard deadline in addition to the short diagnostic warning");
assert(doomSource.includes("visibilitychange"), "watchdog visibility timing must not rely solely on throttled interval callbacks");
assert(doomSource.includes("WATCHDOG_RECOVERY_FRAME_TIMEOUT_MS"), "watchdog replacement loops must have a bounded first-complete-frame deadline");
assert(doomSource.includes("startLoop({ preservePerformance: true, watchdogRestartArmed: false })"), "watchdog and GPU restarts must preserve the current cap and wait for a successful recovery frame");

console.log("DOOM_HEALTH_RUNTIME_VM_TEST_OK", {
  publishedLevel: published.autoplayHealthSensor.faceLifeLevel,
  debounceFrames: exactRuntime.autoplayRetryDispatch.healthRetryFrames,
  retryActive: retry.snapshot(exactRuntime.autoplayRetryDispatch).active
});
