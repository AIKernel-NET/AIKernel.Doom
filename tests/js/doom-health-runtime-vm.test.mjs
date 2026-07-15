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
    status: () => ({
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
    })
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
  autoplayCSharpDecisionSnapshot: { stale: true },
  autoplayCSharpAppliedActionSnapshot: { stale: true },
  autoplayCSharpSemanticState: { stale: true },
  autoplayCSharpDispatchMode: "exclusive",
  autoplayCSharpExactAction: true,
  autoplayCSharpRetryHandled: true,
  autoplayCSharpFirstDoorFaulted: true
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

const promptGlyphStart = promptSource.indexOf("function resolveLifeGlyph(autoplay = {}, zoe = {})");
const promptGlyphEnd = promptSource.indexOf("function formatAutoplayHealthText", promptGlyphStart);
const promptGlyph = promptSource.slice(promptGlyphStart, promptGlyphEnd);
assert(promptGlyphStart >= 0 && promptGlyphEnd > promptGlyphStart, "prompt life-glyph resolver should remain discoverable");
assert(promptGlyph.indexOf("autoplay.healthFaceLifePhase") < promptGlyph.indexOf("health.faceLifeTemplatePhase"), "prompt should prefer stabilized life phase over raw template phase");
assert(promptGlyph.indexOf("autoplay.healthFaceLifeLevel") < promptGlyph.indexOf("health.faceLifeTemplateLevel"), "prompt should prefer stabilized life level over raw template level");
assert(promptGlyph.includes("const heartbeat = heartbeatAlive || phase === \"invulnerable\""), "prompt heartbeat label should use canonical explicit-boolean precedence");

console.log("DOOM_HEALTH_RUNTIME_VM_TEST_OK", {
  publishedLevel: published.autoplayHealthSensor.faceLifeLevel,
  debounceFrames: exactRuntime.autoplayRetryDispatch.healthRetryFrames,
  retryActive: retry.snapshot(exactRuntime.autoplayRetryDispatch).active
});
