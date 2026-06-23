(function () {
  "use strict";

  const WIDTH = 320;
  const HEIGHT = 200;
  const FRAME_BYTES = WIDTH * HEIGHT;
  const OK = 0;
  const MAX_TARGET_FPS = 30;
  const MIN_TARGET_FPS = 5;
  const TARGET_FPS_STEP = 5;
  const MIN_UI_YIELD_MS = 16;
  const LONG_FRAME_MS = 50;
  const EMERGENCY_UI_YIELD_MS = 120;
  const MAX_FRAME_DELAY_MS = 1000;
  const WATCHDOG_INTERVAL_MS = 1000;
  const WATCHDOG_STALL_MS = 2000;
  const WATCHDOG_RESTART_DELAY_MS = 250;
  const AUTOPLAY_KEYS = {
    forward: 0xad,
    back: 0xaf,
    left: 0xac,
    right: 0xae,
    fire: 0xa3,
    strafe: 0xb8,
    use: 0xa2,
    run: 0xb6
  };
  const AUTOPLAY_USE_TAP_FRAMES = 4;
  const AUTOPLAY_USE_TAP_SPACING_FRAMES = 10;
  const AUTOPLAY_RETRY_ENTER_KEY = 13;
  const AUTOPLAY_RETRY_COOLDOWN_FRAMES = 180;
  const AUTOPLAY_RETRY_TAP_FRAMES = 8;
  const AUTOPLAY_RETRY_SETTLE_FRAMES = 60;
  const IS_LITTLE_ENDIAN = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
  const DEFAULT_SNAPSHOT_TIMESTAMP = "1970-01-01T00:00:00.000Z";
  const DOOM_BINARY_ASSET_CACHE = "aikernel-doom-binary-assets-v1";
  const HUD_COMPOSITE_MAX_FPS = 30;
  const GPU_CONTRACTS = requireDoomGpuContracts();
  const RAW_FRAMEBUFFER_TARGET = GPU_CONTRACTS.rawFramebufferTarget;
  const RAW_FRAMEBUFFER_WIRE_NAME = GPU_CONTRACTS.rawFramebufferWireName;
  const HUD_COMPOSITE_TARGET = GPU_CONTRACTS.hudCompositeTarget;
  const HUD_COMPOSITE_WIRE_NAME = GPU_CONTRACTS.hudCompositeWireName;
  const GPU_AISTHESIS_FEATURE_TARGET = GPU_CONTRACTS.aisthesisFeatureTarget;
  const GPU_AISTHESIS_MATRIX_TARGET = GPU_CONTRACTS.aisthesisMatrixTarget;
  const GPU_AISTHESIS_MASK_TARGET = GPU_CONTRACTS.aisthesisMaskTarget;
  const GPU_AISTHESIS_MASK_LAYOUT = GPU_CONTRACTS.aisthesisMaskLayout;
  const GPU_SPATIAL_OUTPUT_TARGET = GPU_CONTRACTS.spatialOutputTarget;
  const GPU_SPATIAL_OUTPUT_FIELDS = GPU_CONTRACTS.spatialOutputFields;
  const SCRIPT_CACHE_KEY = (() => {
    try {
      const params = new URLSearchParams(self.location?.search || "");
      return params.get("doomdev") || params.get("v") || "20260621-hud-panel-connect1";
    } catch {
      return "20260621-hud-panel-connect1";
    }
  })();

  const DEFAULT_MODEL_MANIFEST_URL = "/models/bonsai1.7b/manifest.json";

  function resolveDefaultModelManifestUrl() {
    return self.AIKernelDoomConfig?.modelManifestUrl ||
      self.AIKernelDoomPublic?.modelManifestUrl ||
      DEFAULT_MODEL_MANIFEST_URL;
  }

  function ensureDoomGpuModeState() {
    const root = typeof window !== "undefined" ? window : self;
    const mode = root.AIKernelDoomGpuMode || {};
    if (typeof mode.useGpuRendering !== "boolean") {
      mode.useGpuRendering = true;
    }
    if (typeof mode.gpuPermanentlyDisabled !== "boolean") {
      mode.gpuPermanentlyDisabled = false;
    }
    mode.reason = String(mode.reason || "");
    mode.updatedAt = Number(mode.updatedAt || 0);
    root.AIKernelDoomGpuMode = mode;
    root.useGpuRendering = mode.useGpuRendering;
    root.gpuPermanentlyDisabled = mode.gpuPermanentlyDisabled;
    return mode;
  }

  function isDoomGpuRenderingEnabled() {
    const mode = ensureDoomGpuModeState();
    return mode.useGpuRendering !== false && mode.gpuPermanentlyDisabled !== true;
  }

  function setDoomGpuRenderingMode(useGpu, reason = "") {
    const root = typeof window !== "undefined" ? window : self;
    const mode = ensureDoomGpuModeState();
    if (useGpu && mode.gpuPermanentlyDisabled) {
      return mode;
    }

    mode.useGpuRendering = Boolean(useGpu);
    if (!useGpu) {
      mode.gpuPermanentlyDisabled = true;
    }
    mode.reason = String(reason || (useGpu ? "startup-gpu" : "cpu-fallback"));
    mode.updatedAt = Date.now();
    root.AIKernelDoomGpuMode = mode;
    root.useGpuRendering = mode.useGpuRendering;
    root.gpuPermanentlyDisabled = mode.gpuPermanentlyDisabled;
    try {
      if (typeof root.dispatchEvent === "function" && typeof root.CustomEvent === "function") {
        root.dispatchEvent(new root.CustomEvent("aikernel-doom-gpu-mode-changed", {
          detail: {
            useGpuRendering: mode.useGpuRendering,
            gpuPermanentlyDisabled: mode.gpuPermanentlyDisabled,
            reason: mode.reason,
            updatedAt: mode.updatedAt
          }
        }));
      }
    } catch {
    }
    return mode;
  }

  ensureDoomGpuModeState();
  window.AIKernelDoomSetGpuRenderingMode = setDoomGpuRenderingMode;
  window.AIKernelDoomIsGpuRenderingEnabled = isDoomGpuRenderingEnabled;

  ensureBrowserWebGpuComputeProvider();

  function requireDoomWasmState(name) {
    const fn = self.AIKernelDoomWasmState?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomWasmState.${name} is not available.`);
    }

    return fn;
  }

  function requireDoomActionAdapter(name) {
    const fn = self.AIKernelDoomActionAdapter?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomActionAdapter.${name} is not available.`);
    }

    return fn;
  }

  function requireDoomRetryDispatch(name) {
    const fn = self.AIKernelDoomRetryDispatch?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomRetryDispatch.${name} is not available.`);
    }

    return fn;
  }

  function requireDoomSensorInputs(name) {
    const fn = self.AIKernelDoomSensorInputs?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomSensorInputs.${name} is not available.`);
    }

    return fn;
  }

  function requireDoomBinaryAssets(name) {
    const fn = self.AIKernelDoomBinaryAssets?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomBinaryAssets.${name} is not available.`);
    }

    return fn;
  }

  function requireDoomGpuContracts() {
    const contracts = self.AIKernelDoomGpuContracts;
    if (!contracts || typeof contracts.aisthesisMaskTextureTarget !== "function") {
      throw new Error("AIKernelDoomGpuContracts is not available.");
    }

    return contracts;
  }

  function requireDoomWasmImports(name) {
    const fn = self.AIKernelDoomWasmImports?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomWasmImports.${name} is not available.`);
    }

    return fn;
  }

  function requireDoomNativeAudio(name) {
    const fn = self.AIKernelDoomNativeAudio?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomNativeAudio.${name} is not available.`);
    }

    return fn;
  }

  function requireDoomAuditoryRuntime(name) {
    const fn = self.AIKernelDoomAuditoryRuntime?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomAuditoryRuntime.${name} is not available.`);
    }

    return fn;
  }

  class AIKernelDoomRuntime {
    constructor(options) {
      this.canvas = options.canvas;
      this.moduleUrl = options.moduleUrl || "/demo/doom/module.json";
      this.modelManifestUrl = options.modelManifestUrl || resolveDefaultModelManifestUrl();
      this.autoplayProfileUrl = options.autoplayProfileUrl || "/demo/doom/autoplay-profile.json";
      this.log = options.log || (() => {});
      this.onStatusChange = options.onStatusChange || (() => {});
      this.state = "ready";
      this.renderer = "canvas-fallback";
      this.animationFrame = 0;
      this.frameTimer = 0;
      this.watchdogTimer = 0;
      this.watchdogRestarting = false;
      this.watchdogRestarts = 0;
      this.watchdogLastStallMs = 0;
      this.loopToken = 0;
      this.loopActive = false;
      this.frameCount = 0;
      this.lastFrameAt = 0;
      this.nextFrameDueAt = 0;
      this.fps = 0;
      this.gpuFlushCount = 0;
      this.lastGpuWaitMs = 0;
      this.gpuWaitTimeouts = 0;
      this.fpsSampleFrames = 0;
      this.fpsSampleStartedAt = 0;
      this.noWaitSampleFrames = 0;
      this.targetFps = MAX_TARGET_FPS;
      this.lastFrameWorkMs = 0;
      this.uiYieldMs = MIN_UI_YIELD_MS;
      this.stableLogged = false;
      this.moduleConfig = null;
      this.modelManifest = null;
      this.autoplayProfile = null;
      this.autoplayControllerKind = "bonsai";
      this.controlRuntime = null;
      this.wasmAutoplayReady = false;
      this.wasmAutoplayLastError = "";
      this.lastAutoplayStatus = null;
      this.wadMapHints = null;
      this.instance = null;
      this.exports = null;
      this.wadBytes = null;
      this.wadPtr = 0;
      this.wadMounted = false;
      this.initialized = false;
      this.modelLoaded = false;
      this.loadPromise = null;
      this.downloadAssets = new Map();
      this.downloadProgress = {
        active: false,
        phase: "idle",
        label: "",
        asset: "",
        loadedBytes: 0,
        totalBytes: 0,
        percent: null,
        assets: [],
        updatedAt: 0
      };
      this.downloadLastStatusAt = 0;
      this.pendingInputEvents = [];
      this.inputState = new Map();
      this.manualInputUntil = new Map();
      this.autoplayUsePulseFrames = 0;
      this.autoplayUsePulseSpacingFrames = 0;
      this.autoplayRetryDispatch = requireDoomRetryDispatch("createState")();
      this.palette = defaultPalette();
      this.paletteCache = buildPaletteCache(this.palette);
      this.frameImage = null;
      this.frame32 = null;
      this.webGpuFrameRenderer = false;
      this.gpuFallbackHandled = false;
      this.framebufferPtr = 0;
      this.framebufferView = null;
      this.framebufferMemory = null;
      this.context = null;
      this.lastError = "";
      this.bonsaiSupervisor = self.AIKernelBonsaiSupervisor
        ? new self.AIKernelBonsaiSupervisor({ log: this.log })
        : null;
      this.autoplayEnabled = false;
      this.autoplayManualMove = false;
      this.autoplaySenseOnly = false;
      this.autoplayPending = false;
      this.autoplayMode = "disabled";
      this.autoplayPredictions = 0;
      this.autoplayReused = 0;
      this.autoplayLastLatencyMs = 0;
      this.autoplayVisionMode = "none";
      this.autoplayVisionZeroCopy = false;
      this.autoplayVisionLogged = "";
      this.autoplaySafetyReason = "none";
      this.autoplayStuckFrames = 0;
      this.autoplayRecoveryFrames = 0;
      this.autoplayMobilityMode = "none";
      this.autoplayLoopEscapeFrames = 0;
      this.autoplayWallHugSide = "left";
      this.autoplayTargetConfidence = 0;
      this.autoplaySoundCueActive = false;
      this.audioPlaybackMuted = true;
      this.nativeAudioAvailable = false;
      this.nativeAudioLogged = false;
      this.nativeAudioFramesDrained = 0;
      this.nativeAudioLastEventCount = 0;
      this.nativeAudioLastSnapshot = null;
      this.visualSensorEnabled = true;
      this.audioSensorEnabled = true;
      this.motorSensorEnabled = true;
      this.movementSensorEnabled = true;
      this.compassSensorEnabled = true;
      this.spatialSensorEnabled = true;
      this.healthSensorEnabled = true;
      this.sensorInputs = this.createSensorInputMap();
      this.compassHeading = 0;
      this.gpuRadarHudDisplayState = null;
      this.previousVisionMotionGrid = null;
      this.previousVisionMotionBaseGrid = null;
      this.previousWallPatternMotionGrid = null;
      this.previousWallPatternMotionBaseGrid = null;
      this.previousVisionMotionSignature = "";
      this.lastVisualMotionVector = null;
      this.compassLandmarks = new Map();
      this.autoplayAuditorySnapshot = null;
      this.autoplaySpatialSnapshot = null;
      this.autoplayVisionSensor = null;
      this.autoplayMotorSensor = null;
      this.autoplayMovementSensor = null;
      this.autoplayCompassSensor = null;
      this.autoplaySpatialSensor = null;
      this.autoplayHealthSensor = null;
      this.autoplayCtgCarrier = null;
      this.autoplayCtgObservedScores = null;
      this.autoplayToposDecisionCarrier = null;
      this.autoplayNousCarrier = null;
      this.autoplayNousDetectorResult = null;
      this.autoplayActionSignature = "";
      this.autoplayActionRepeatFrames = 0;
      this.autoplayMoveSignature = "";
      this.autoplayMoveRepeatFrames = 0;
      this.autoplayTurnSignature = "";
      this.autoplayTurnRepeatFrames = 0;
      this.autoplayRepeatActionFrames = 0;
      this.autoplayRepeatTurnFrames = 0;
      this.autoplayQuantizedStallFrames = 0;
      this.autoplayQuantizedFrameChange = 255;
      this.autoplayRegionQuantizedFrameChange = 255;
      this.autoplayStatusBarQuantizedFrameChange = 255;
      this.autoplayRegionSignature = "000000";
      this.autoplayRegion9Signature = "000000000";
      this.autoplayVision9x9Signature = "0".repeat(81);
      this.autoplayMotion9Signature = "000000000";
      this.autoplayMotion9Delta = 255;
      this.autoplayMotionForwardProgress = 0;
      this.autoplayMotionObstacleScore = 0;
      this.autoplayMotionTurnScore = 0;
      this.autoplayMotionEntranceScore = 0;
      this.autoplayMotionStallScore = 0;
      this.autoplayMotionIntent = "idle";
      this.autoplayDepthSignature = "0000";
      this.autoplayDepthEstimate = 1;
      this.autoplayDepthSignatureDistance = 255;
      this.autoplayFaceSignature = "0000000000000000";
      this.autoplayFaceQuantizedFrameChange = 255;
      this.autoplayCornerSignal = 0;
      this.autoplaySignatureMatchKind = "none";
      this.autoplaySignatureMatchDistance = 255;
      this.autoplayWallSignatureCount = 0;
      this.autoplayCornerSignatureCount = 0;
      this.autoplayDepthSignatureCount = 0;
      this.autoplayWallUseProbeFrames = 0;
      this.autoplayWallUseProbeStage = 0;
      this.autoplayWallUseProbeTurn = "left";
      this.autoplayCornerSuppressFrames = 0;
      this.autoplayWallDetachFrames = 0;
      this.autoplayWallDetachTurn = "left";
      this.autoplayWallSurveyFrames = 0;
      this.autoplayWallSurveyTurn = "left";
      this.autoplayWallSurveyDecisionFrames = 0;
      this.autoplayMapRushCorrectionFrames = 0;
      this.autoplayMapRushCorrectionTurn = "left";
      this.autoplayEnemyConfidence = 0;
      this.autoplayEnemyTurn = "none";
      this.autoplayEnemyDistance = 1;
      this.autoplayEnemyCluster = "none";
      this.autoplayEnemyFireReady = false;
      this.autoplayEnemyAllRegionPeak = 0;
      this.autoplayEnemyLateralBias = 0;
      this.autoplayAudioEnemyConfidence = 0;
      this.autoplayAudioEnemyDirection = "none";
      this.autoplayVisualEnemyVisible = false;
      this.autoplayVisualEnemyCentered = false;
      this.autoplayVisualEnemyYaw = 0;
      this.autoplayVisualEnemyFireReady = false;
      this.autoplayEnemyCombatYaw = 0;
      this.autoplayStrategyName = "SensorFusionStrafeProbeV3";
      this.autoplayStrategyContext = "unknown";
      this.autoplayStrategyPriority = 0;
      this.autoplayDecisionStage = "Idle";
      this.autoplayEvidenceScore = 0;
      this.autoplaySemanticScores = null;
      this.autoplayDecisionTrace = null;
      this.autoplayKairosPriorityAxis = null;
      this.autoplayPipelineState = null;
      this.autoplayGoalState = null;
      this.autoplayDebugOverlay = null;
      this.autoplayAutoplayState = null;
      this.autoplayControlPipeline = "Idle";
      this.autoplayObjective = "disabled";
      this.autoplayActiveDetections = ["objective", "hud"];
      this.autoplaySemanticMemory = null;
      this.autoplayLastAction = self.AIKernelBonsai?.neutralAction?.() || {
        move: "none",
        turn: "none",
        fire: false,
        strafe: false,
        use: false,
        run: false
      };
      this.autoplayLastError = "";
      this.gpuFallbackListener = event => {
        const detail = event?.detail || {};
        this.handleGpuLost(detail.kind || "webgpu", detail.info || detail.reason || null, { fromProvider: true });
      };
      window.addEventListener("aikernel-doom-gpu-lost", this.gpuFallbackListener);
    }

    status() {
      const gpuHudStatus = this.createGpuHudStatus();
      return {
        state: this.state,
        renderer: this.renderer,
        usingCpuFallback: Boolean(gpuHudStatus.providerUsingCpuFallback || !isDoomGpuRenderingEnabled()),
        wasmLoaded: Boolean(this.instance),
        wadLoaded: Boolean(this.wadBytes),
        wadMounted: this.wadMounted,
        modelLoaded: this.modelLoaded,
        loopActive: this.loopActive,
        frameCount: this.frameCount,
        fps: this.fps,
        targetFps: this.targetFps,
        lastFrameWorkMs: this.lastFrameWorkMs,
        uiYieldMs: this.uiYieldMs,
        gpuFlushCount: this.gpuFlushCount,
        lastGpuWaitMs: this.lastGpuWaitMs,
        gpuWaitTimeouts: this.gpuWaitTimeouts,
        hudFlowControl: this.createHudFlowControlStatus(),
        gpuHud: gpuHudStatus,
        watchdogRestarting: this.watchdogRestarting,
        watchdogRestarts: this.watchdogRestarts,
        watchdogLastStallMs: this.watchdogLastStallMs,
        inputReady: typeof this.exports?.doom_input === "function",
        actionInputReady: typeof this.exports?.doom_input_action === "function",
        autoplay: {
          enabled: this.autoplayEnabled,
          manualMove: this.autoplayManualMove,
          senseOnly: this.autoplaySenseOnly,
          controller: this.autoplayControllerKind,
          controlReady: this.wasmAutoplayReady,
          gpuHud: gpuHudStatus,
          mode: this.autoplayMode,
          predictions: this.autoplayPredictions,
          reused: this.autoplayReused,
          latencyMs: this.autoplayLastLatencyMs,
          vision: this.autoplayVisionMode,
          zeroCopy: this.autoplayVisionZeroCopy,
          safetyReason: this.autoplaySafetyReason,
          stuckFrames: this.autoplayStuckFrames,
          recoveryFrames: this.autoplayRecoveryFrames,
          loopEscapeFrames: this.autoplayLoopEscapeFrames,
          useCooldown: this.bonsaiSupervisor?.status?.().useCooldown || 0,
          firstDoorUseLatchFrames: this.bonsaiSupervisor?.status?.().firstDoorUseLatchFrames || 0,
          firstDoorUsePulsed: Boolean(this.bonsaiSupervisor?.status?.().firstDoorUsePulsed),
          firstDoorLockedUseCycles: this.bonsaiSupervisor?.status?.().firstDoorLockedUseCycles || 0,
          firstDoorReprobeFrames: this.bonsaiSupervisor?.status?.().firstDoorReprobeFrames || 0,
          firstDoorReprobeTurn: this.bonsaiSupervisor?.status?.().firstDoorReprobeTurn || "none",
          mobilityMode: this.autoplayMobilityMode,
          wallHugSide: this.autoplayWallHugSide,
          targetConfidence: this.autoplayTargetConfidence,
          soundCueActive: this.autoplaySoundCueActive,
          visualMotion: this.lastVisualMotionVector,
          compassLandmarks: this.compassLandmarks.size,
          auditorySnapshot: this.autoplayAuditorySnapshot,
          spatialSnapshot: this.autoplaySpatialSnapshot,
          visionSensor: this.autoplayVisionSensor,
          motorSensor: this.autoplayMotorSensor,
          movementSensor: this.autoplayMovementSensor,
          compassSensor: this.autoplayCompassSensor,
          radarHud: this.gpuRadarHudDisplayState,
          spatialSensor: this.autoplaySpatialSensor,
          ctgCarrier: this.autoplayCtgCarrier,
          ctgObservedScores: this.autoplayCtgObservedScores,
          toposDecisionCarrier: this.autoplayToposDecisionCarrier,
          nousCarrier: this.autoplayNousCarrier,
          nousDetectorResult: this.autoplayNousDetectorResult,
          retryDispatch: requireDoomRetryDispatch("snapshot")(this.autoplayRetryDispatch),
          audioPlayback: {
            muted: this.audioPlaybackMuted,
            enabled: !this.audioPlaybackMuted,
            nativeAvailable: this.nativeAudioAvailable,
            nativeReady: this.nativeAudioStatus(),
            nativeEvents: this.nativeAudioEventCount(),
            nativeFramesDrained: this.nativeAudioFramesDrained,
            nativeAvailableFrames: this.nativeAudioAvailableFrames()
          },
          sensorInputs: this.createSensorStatusMap(),
          actionSignature: this.autoplayActionSignature,
          actionRepeatFrames: this.autoplayActionRepeatFrames,
          moveRepeatFrames: this.autoplayMoveRepeatFrames,
          turnRepeatFrames: this.autoplayTurnRepeatFrames,
          repeatActionFrames: this.autoplayRepeatActionFrames,
          repeatTurnFrames: this.autoplayRepeatTurnFrames,
          quantizedStallFrames: this.autoplayQuantizedStallFrames,
          quantizedFrameChange: this.autoplayQuantizedFrameChange,
          regionQuantizedFrameChange: this.autoplayRegionQuantizedFrameChange,
          statusBarQuantizedFrameChange: this.autoplayStatusBarQuantizedFrameChange,
          regionSignature: this.autoplayRegionSignature,
          region9Signature: this.autoplayRegion9Signature,
          vision9x9Signature: this.autoplayVision9x9Signature,
          motion9Signature: this.autoplayMotion9Signature,
          motion9Delta: this.autoplayMotion9Delta,
          motionForwardProgress: this.autoplayMotionForwardProgress,
          motionObstacleScore: this.autoplayMotionObstacleScore,
          motionTurnScore: this.autoplayMotionTurnScore,
          motionEntranceScore: this.autoplayMotionEntranceScore,
          motionStallScore: this.autoplayMotionStallScore,
          motionIntent: this.autoplayMotionIntent,
          footObstacleScore: this.autoplayFootObstacleScore || 0,
          priorFootObstacleScore: this.autoplayPriorFootObstacleScore || 0,
          footObstacleFlickerScore: this.autoplayFootObstacleFlickerScore || 0,
          footObstacleBounceFrames: this.autoplayFootObstacleBounceFrames || 0,
          footObstacleBandDelta: this.autoplayFootObstacleBandDelta || 0,
          inputStallFrames: this.autoplayInputStallFrames || 0,
          depthSignature: this.autoplayDepthSignature,
          depthEstimate: this.autoplayDepthEstimate,
          faceSignature: this.autoplayFaceSignature,
          faceQuantizedFrameChange: this.autoplayFaceQuantizedFrameChange,
          cornerSignal: this.autoplayCornerSignal,
          signatureMatchKind: this.autoplaySignatureMatchKind,
          signatureMatchDistance: this.autoplaySignatureMatchDistance,
          wallSignatureCount: this.autoplayWallSignatureCount,
          cornerSignatureCount: this.autoplayCornerSignatureCount,
          depthSignatureCount: this.autoplayDepthSignatureCount,
          depthSignatureDistance: this.autoplayDepthSignatureDistance,
          wallUseProbeFrames: this.autoplayWallUseProbeFrames,
          wallUseProbeStage: this.autoplayWallUseProbeStage,
          wallUseProbeTurn: this.autoplayWallUseProbeTurn,
          cornerSuppressFrames: this.autoplayCornerSuppressFrames,
          wallDetachFrames: this.autoplayWallDetachFrames,
          wallDetachTurn: this.autoplayWallDetachTurn,
          wallSurveyFrames: this.autoplayWallSurveyFrames,
          wallSurveyTurn: this.autoplayWallSurveyTurn,
          wallSurveyDecisionFrames: this.autoplayWallSurveyDecisionFrames,
          mapRushCorrectionFrames: this.autoplayMapRushCorrectionFrames,
          mapRushCorrectionBackFrames: this.autoplayMapRushCorrectionBackFrames,
          mapRushCorrectionTurn: this.autoplayMapRushCorrectionTurn,
          mapRushCorrectionReversals: this.autoplayMapRushCorrectionReversals,
          mapDoorSweepFrames: this.autoplayMapDoorSweepFrames,
          mapDoorSweepTurn: this.autoplayMapDoorSweepTurn,
          enemyConfidence: this.autoplayEnemyConfidence,
          enemyTurn: this.autoplayEnemyTurn,
          enemyDistance: this.autoplayEnemyDistance,
          enemyCluster: this.autoplayEnemyCluster,
          enemyFireReady: this.autoplayEnemyFireReady,
          enemyAllRegionPeak: this.autoplayEnemyAllRegionPeak,
          enemyLateralBias: this.autoplayEnemyLateralBias,
          audioEnemyConfidence: this.autoplayAudioEnemyConfidence,
          audioEnemyDirection: this.autoplayAudioEnemyDirection,
          visualEnemyVisible: this.autoplayVisualEnemyVisible,
          visualEnemyCentered: this.autoplayVisualEnemyCentered,
          visualEnemyYaw: this.autoplayVisualEnemyYaw,
          visualEnemyFireReady: this.autoplayVisualEnemyFireReady,
          enemyCombatYaw: this.autoplayEnemyCombatYaw,
          ammoSignature: this.autoplayAmmoSignature || this.bonsaiSupervisor?.status?.().ammoSignature || "",
          ammoLikelyEmpty: Boolean(this.autoplayAmmoLikelyEmpty || this.bonsaiSupervisor?.status?.().ammoLikelyEmpty),
          healthSignature: this.autoplayHealthSignature || this.bonsaiSupervisor?.status?.().healthSignature || "",
          healthLikelyDead: Boolean(this.autoplayHealthLikelyDead || this.bonsaiSupervisor?.status?.().healthLikelyDead),
          healthZeroScore: this.autoplayHealthZeroScore || this.bonsaiSupervisor?.status?.().healthZeroScore || 0,
          healthActiveColumns: this.autoplayHealthActiveColumns || this.bonsaiSupervisor?.status?.().healthActiveColumns || 0,
          healthActiveCells: this.autoplayHealthActiveCells || this.bonsaiSupervisor?.status?.().healthActiveCells || 0,
          healthSensor: this.autoplayHealthSensor || this.bonsaiSupervisor?.status?.().healthSensor || null,
          milestones: this.autoplayMilestones || this.bonsaiSupervisor?.status?.().milestones || {
            doorOpened: 0,
            enemyDefeated: 0,
            combatFireFrames: 0,
            enemyConfidencePeak: 0,
            enemyDropFrames: 0
          },
          strategyName: this.autoplayStrategyName,
          strategyContext: this.autoplayStrategyContext,
          strategyPriority: this.autoplayStrategyPriority,
          decisionStage: this.autoplayDecisionStage,
          evidenceScore: this.autoplayEvidenceScore,
          semanticScores: this.autoplaySemanticScores,
          decisionTrace: this.autoplayDecisionTrace,
          stageEvaluations: this.autoplayStageEvaluations || [],
          kairosPriorityAxis: this.autoplayKairosPriorityAxis || null,
          pipelineState: this.autoplayPipelineState || null,
          goalState: this.autoplayGoalState || null,
          debugOverlay: this.autoplayDebugOverlay || null,
          autoplayState: this.autoplayAutoplayState || null,
          debugRouteValues: this.autoplayDebugRouteValues || null,
          controlPipeline: this.autoplayControlPipeline,
          objective: this.autoplayObjective,
          routeFallbackYaw: this.autoplayRouteFallbackYaw,
          openCruiseYaw: this.autoplayOpenCruiseYaw,
          spawnCorridorGapActionScore: this.autoplaySpawnCorridorGapActionScore,
          spawnCorridorGapActionTurn: this.autoplaySpawnCorridorGapActionTurn,
          activeDetections: this.autoplayActiveDetections,
          semanticMemory: this.autoplaySemanticMemory,
          action: this.autoplayLastAction,
          lastError: this.autoplayLastError
        },
        audio: {
          muted: this.audioPlaybackMuted,
          playbackEnabled: !this.audioPlaybackMuted,
          nativeAvailable: this.nativeAudioAvailable,
          nativeReady: this.nativeAudioStatus(),
          nativeEvents: this.nativeAudioEventCount(),
          nativeFramesDrained: this.nativeAudioFramesDrained,
          nativeAvailableFrames: this.nativeAudioAvailableFrames(),
          leftEnergy: Number(this.autoplayAuditorySnapshot?.leftEnergy || 0),
          rightEnergy: Number(this.autoplayAuditorySnapshot?.rightEnergy || 0),
          balance: Number(this.autoplayAuditorySnapshot?.balance || 0),
          eventDetected: Boolean(this.autoplayAuditorySnapshot?.eventDetected),
          eventType: this.autoplayAuditorySnapshot?.eventType || "none",
          lowEnergy: Number(this.autoplayAuditorySnapshot?.lowEnergy || 0),
          midEnergy: Number(this.autoplayAuditorySnapshot?.midEnergy || 0),
          highEnergy: Number(this.autoplayAuditorySnapshot?.highEnergy || 0),
          dominantBand: this.autoplayAuditorySnapshot?.dominantBand || "none"
        },
        sensors: this.createSensorStatusMap(),
        health: this.autoplayHealthSensor || this.bonsaiSupervisor?.status?.().healthSensor || {
          active: false,
          likelyDead: false,
          retryRequested: false,
          confidence: 0
        },
        gpuDelegate: resolveGpuDelegateName(),
        mapHints: this.wadMapHints ? {
          map: this.wadMapHints.map,
          doorLines: this.wadMapHints.doorLines,
          switchLines: this.wadMapHints.switchLines,
          exitLines: this.wadMapHints.exitLines,
          textureRoles: this.wadMapHints.textureRoles?.length || 0,
          firstDoor: this.wadMapHints.firstDoor || null,
          darkSectors: this.wadMapHints.darkSectors || [],
          enemyThings: this.wadMapHints.enemyThings || [],
          doorTextures: this.wadMapHints.doorTextures || [],
          switchTextures: this.wadMapHints.switchTextures || []
        } : null,
        downloadProgress: this.cloneDownloadProgress(),
        framebuffer: `${WIDTH}x${HEIGHT} paletted-8bit`,
        useGpuRendering: isDoomGpuRenderingEnabled(),
        gpuPermanentlyDisabled: Boolean(ensureDoomGpuModeState().gpuPermanentlyDisabled),
        gpuModeReason: ensureDoomGpuModeState().reason || "",
        lastError: this.lastError
      };
    }

    createGpuHudStatus() {
      const provider = resolveWebGpuProvider();
      const providerStatus = typeof provider?.status === "function"
        ? provider.status()
        : (provider || {});
      const rawState = typeof provider?.getFrameStateBuffer === "function"
        ? provider.getFrameStateBuffer(RAW_FRAMEBUFFER_TARGET)
        : null;
      const hudState = typeof provider?.getFrameStateBuffer === "function"
        ? provider.getFrameStateBuffer(HUD_COMPOSITE_TARGET)
        : null;
      const compositeReady = Boolean(providerStatus?.hudCompositeReady);
      const compositeActive = Boolean(providerStatus?.hudCompositeActive);
      const hudSwapchainActive = Boolean(
        providerStatus?.hudSwapchainActive
        || (providerStatus?.hudOverlayActive && providerStatus?.hudPanelOverlayReady));

      return {
        source: "webgpu-hud-offscreen",
        providerId: providerStatus?.providerId || provider?.providerId || "unknown",
        providerName: providerStatus?.name || provider?.name || "unknown",
        providerBackend: providerStatus?.backend || "unknown",
        providerSupported: Boolean(providerStatus?.supported),
        providerInitialized: Boolean(providerStatus?.initialized),
        adapterReady: Boolean(providerStatus?.adapterReady),
        deviceReady: Boolean(providerStatus?.deviceReady),
        adapterPowerPreference: providerStatus?.adapterPowerPreference || "unknown",
        adapterForceFallback: Boolean(providerStatus?.adapterForceFallback),
        adapterRequestFallbackUsed: Boolean(providerStatus?.adapterRequestFallbackUsed),
        adapterRequestError: providerStatus?.adapterRequestError || "",
        adapterInfo: providerStatus?.adapterInfo || null,
        adapterSummary: providerStatus?.adapterSummary || "unknown",
        providerRendererInitialized: Boolean(providerStatus?.rendererInitialized),
        providerUsingCpuFallback: Boolean(providerStatus?.usingCpuFallback),
        providerGpuPermanentlyDisabled: Boolean(providerStatus?.gpuPermanentlyDisabled),
        providerFallbackReason: providerStatus?.fallbackReason || "",
        providerLastError: providerStatus?.lastError || "",
        providerZeroCopy: Boolean(providerStatus?.zeroCopy),
        rawTextureReady: Boolean(providerStatus?.rawTextureReady),
        storageTextureReady: Boolean(providerStatus?.storageTextureReady),
        gpuBufferReady: Boolean(providerStatus?.gpuBufferReady),
        gpuComputeReady: Boolean(providerStatus?.gpuComputeReady),
        gpuComputeActive: Boolean(providerStatus?.gpuComputeActive),
        displayTarget: RAW_FRAMEBUFFER_TARGET,
        displaySource: hudSwapchainActive ? `${RAW_FRAMEBUFFER_WIRE_NAME}+gpu-hud-single-pass` : RAW_FRAMEBUFFER_WIRE_NAME,
        displayCompositeTarget: compositeActive ? HUD_COMPOSITE_TARGET : "",
        hudCompositeDisplayMode: hudSwapchainActive ? "single-pass" : "raw",
        hudCompositeDisplayUsesOffscreen: false,
        rawCaptureTarget: RAW_FRAMEBUFFER_TARGET,
        rawCaptureSource: RAW_FRAMEBUFFER_WIRE_NAME,
        analysisCaptureSource: RAW_FRAMEBUFFER_WIRE_NAME,
        analysisOverlayExcluded: true,
        cssOverlayMode: hudSwapchainActive ? "reduced" : "full",
        hudOverlayReady: Boolean(providerStatus?.hudOverlayReady),
        hudPanelOverlayReady: Boolean(providerStatus?.hudPanelOverlayReady),
        hudPanelDoubleBuffered: Boolean(providerStatus?.hudPanelDoubleBuffered),
        hudCompositeTarget: providerStatus?.hudCompositeTarget || HUD_COMPOSITE_TARGET,
        hudCompositeReady: compositeReady,
        hudCompositeActive: compositeActive,
        hudCompositeDoubleBuffered: Boolean(providerStatus?.hudCompositeDoubleBuffered),
        hudCompositeMaxFps: Number(providerStatus?.hudCompositeMaxFps || HUD_COMPOSITE_MAX_FPS),
        hudOffscreenCompositeMaxFps: Number(providerStatus?.hudOffscreenCompositeMaxFps || 0),
        hudCompositeFrame: Number(hudState?.frame ?? providerStatus?.hudCompositeFrame ?? 0),
        hudCompositePresentEnabled: Boolean(providerStatus?.hudCompositePresentEnabled),
        hudOffscreenCompositeConfigured: Boolean(providerStatus?.hudOffscreenCompositeConfigured),
        hudOffscreenCompositeEnabled: Boolean(providerStatus?.hudOffscreenCompositeEnabled),
        hudSwapchainActive,
        hudOffscreenCompositeRuntimeDisabled: Boolean(providerStatus?.hudOffscreenCompositeRuntimeDisabled),
        hudOffscreenCompositeFailureCount: Number(providerStatus?.hudOffscreenCompositeFailureCount || 0),
        hudOffscreenCompositeLastError: providerStatus?.hudOffscreenCompositeLastError || "",
        hudOffscreenCompositeLastDisabledAt: Number(providerStatus?.hudOffscreenCompositeLastDisabledAt || 0),
        rawFrame: Number(rawState?.frame ?? this.frameCount ?? 0),
        rawZeroCopy: Boolean(rawState?.zeroCopy),
        hudZeroCopy: Boolean(hudState?.zeroCopy),
        gpuMemory: providerStatus?.gpuMemory || null,
        estimatedGpuMemoryBytes: Number(providerStatus?.estimatedGpuMemoryBytes || providerStatus?.gpuMemory?.totalBytes || 0),
        estimatedGpuMemoryMB: Number(providerStatus?.estimatedGpuMemoryMB || providerStatus?.gpuMemory?.totalMB || 0),
        overlayExcludedFromAnalysis: true,
        gpuAisthesis: providerStatus?.gpuAisthesis || null,
        gpuSpatialReasoning: providerStatus?.gpuSpatialReasoning || null
      };
    }

    async readGpuAisthesisFeatures(options = {}) {
      const provider = resolveWebGpuProvider();
      if (typeof provider?.readGpuAisthesisFeatures === "function") {
        return provider.readGpuAisthesisFeatures(options);
      }

      return {
        ok: false,
        reason: "gpu-aisthesis-readback-unavailable",
        source: GPU_AISTHESIS_FEATURE_TARGET,
        timestamp: new Date().toISOString()
      };
    }

    async readGpuSpatialReasoningOutput(options = {}) {
      const provider = resolveWebGpuProvider();
      if (typeof provider?.readGpuSpatialReasoningOutput === "function") {
        return provider.readGpuSpatialReasoningOutput(options);
      }

      return {
        ok: false,
        reason: "gpu-spatial-readback-unavailable",
        source: GPU_SPATIAL_OUTPUT_TARGET,
        timestamp: new Date().toISOString()
      };
    }

    createHudFlowControlStatus() {
      const fps = Number.isFinite(this.fps) ? this.fps : 0;
      const targetFps = Math.max(MIN_TARGET_FPS, this.targetFps || MAX_TARGET_FPS);
      const workMs = Math.max(0, Number(this.lastFrameWorkMs || 0));
      const gpuWaitMs = Math.max(0, Number(this.lastGpuWaitMs || 0));
      const overloaded = this.watchdogRestarting
        || this.gpuWaitTimeouts > 0
        || workMs >= LONG_FRAME_MS
        || fps < targetFps * 0.55;
      const constrained = overloaded
        || workMs >= 32
        || gpuWaitMs >= 24
        || fps < targetFps * 0.78;

      return {
        source: "runtime-fps-control",
        mode: overloaded ? "minimal" : (constrained ? "reduced" : "full"),
        minIntervalMs: overloaded ? 250 : (constrained ? 125 : 66),
        dropPolicy: "latest-only",
        fps,
        targetFps,
        workMs,
        gpuWaitMs
      };
    }

    async prepare() {
      if (this.state === "running") {
        return this.status();
      }

      if (this.instance && this.wadBytes && this.modelLoaded) {
        return this.status();
      }

      if (this.loadPromise) {
        return this.loadPromise;
      }

      this.state = "loading";
      this.lastError = "";
      this.beginDownloadProgress();
      this.emitStatus("loading");
      this.loadPromise = (async () => {
        try {
          await this.loadRuntime();
          await this.loadModel();
          this.state = "ready";
          this.completeDownloadProgress();
          this.log("[ LOAD ]", "log-ok", "download/load complete: doom.wasm, DOOM1.WAD, and Bonsai model are validated.");
          this.emitStatus("ready");
          return this.status();
        } catch (error) {
          this.state = "failed";
          this.lastError = error instanceof Error ? error.message : String(error);
          this.failDownloadProgress(this.lastError);
          this.log("[ FAIL ]", "log-fail", this.lastError);
          this.emitStatus("failed");
          throw error;
        } finally {
          this.loadPromise = null;
        }
      })();

      return this.loadPromise;
    }

    beginDownloadProgress() {
      this.downloadAssets = new Map();
      this.downloadProgress = {
        active: true,
        phase: "starting",
        label: "Preparing hosted runtime assets",
        asset: "",
        loadedBytes: 0,
        totalBytes: 0,
        percent: null,
        assets: [],
        updatedAt: Date.now()
      };
      this.downloadLastStatusAt = 0;
      this.emitStatus("download-start");
    }

    setDownloadPhase(phase, label) {
      this.downloadProgress = Object.assign({}, this.downloadProgress, {
        active: true,
        phase,
        label,
        updatedAt: Date.now()
      });
      this.emitStatus(`download-${phase}`);
    }

    registerDownloadAsset(key, label, totalBytes = 0) {
      const existing = this.downloadAssets.get(key);
      const asset = Object.assign(existing || {}, {
        key,
        label,
        loadedBytes: existing?.loadedBytes || 0,
        totalBytes: Math.max(normalizeByteCount(totalBytes), existing?.totalBytes || 0),
        percent: null,
        phase: "queued",
        source: existing?.source || "",
        cacheHit: Boolean(existing?.cacheHit),
        done: false
      });
      this.downloadAssets.set(key, asset);
      this.refreshDownloadProgress("download-asset");
      return asset;
    }

    updateDownloadAsset(key, label, progress) {
      const asset = this.downloadAssets.get(key) || this.registerDownloadAsset(key, label, progress?.totalBytes || 0);
      const totalBytes = normalizeByteCount(progress?.totalBytes);
      if (totalBytes > 0) {
        asset.totalBytes = Math.max(asset.totalBytes || 0, totalBytes);
      }

      asset.loadedBytes = Math.max(asset.loadedBytes || 0, normalizeByteCount(progress?.loadedBytes));
      asset.phase = progress?.phase || (progress?.done ? "complete" : "downloading");
      asset.source = progress?.source || asset.source || "";
      asset.cacheHit = Boolean(progress?.cacheHit || asset.cacheHit);
      asset.done = Boolean(progress?.done);
      asset.percent = asset.totalBytes > 0
        ? Math.max(0, Math.min(100, (asset.loadedBytes / asset.totalBytes) * 100))
        : null;
      this.downloadAssets.set(key, asset);
      this.refreshDownloadProgress(progress?.done ? "download-complete" : "download-progress");
    }

    completeDownloadProgress() {
      for (const asset of this.downloadAssets.values()) {
        asset.done = true;
        asset.phase = "complete";
        if (asset.totalBytes > 0) {
          asset.loadedBytes = Math.max(asset.loadedBytes || 0, asset.totalBytes);
          asset.percent = 100;
        }
      }

      this.refreshDownloadProgress("download-complete", {
        active: false,
        phase: "complete",
        label: "Hosted runtime assets validated"
      });
    }

    failDownloadProgress(message) {
      this.refreshDownloadProgress("download-failed", {
        active: false,
        phase: "failed",
        label: message || "Hosted runtime asset download failed"
      });
    }

    refreshDownloadProgress(reason, overrides = {}) {
      const assets = Array.from(this.downloadAssets.values()).map(asset => ({
        key: asset.key,
        label: asset.label,
        loadedBytes: normalizeByteCount(asset.loadedBytes),
        totalBytes: normalizeByteCount(asset.totalBytes),
        percent: Number.isFinite(asset.percent) ? asset.percent : null,
        phase: asset.phase || "queued",
        source: asset.source || "",
        cacheHit: Boolean(asset.cacheHit),
        done: Boolean(asset.done)
      }));
      const loadedBytes = assets.reduce((sum, asset) => sum + Math.min(asset.loadedBytes, asset.totalBytes || asset.loadedBytes), 0);
      const totalBytes = assets.reduce((sum, asset) => sum + asset.totalBytes, 0);
      const activeAsset = assets.find(asset => !asset.done) || assets[assets.length - 1] || null;
      this.downloadProgress = Object.assign({
        active: assets.some(asset => !asset.done),
        phase: activeAsset?.phase || "idle",
        label: activeAsset?.label || this.downloadProgress?.label || "",
        asset: activeAsset?.label || "",
        loadedBytes,
        totalBytes,
        percent: totalBytes > 0 ? Math.max(0, Math.min(100, (loadedBytes / totalBytes) * 100)) : null,
        assets,
        updatedAt: Date.now()
      }, overrides);

      const now = Date.now();
      if (reason !== "download-progress" || now - this.downloadLastStatusAt >= 120) {
        this.downloadLastStatusAt = now;
        this.emitStatus(reason);
      }
    }

    cloneDownloadProgress() {
      const progress = this.downloadProgress || {};
      return {
        active: Boolean(progress.active),
        phase: progress.phase || "idle",
        label: progress.label || "",
        asset: progress.asset || "",
        loadedBytes: normalizeByteCount(progress.loadedBytes),
        totalBytes: normalizeByteCount(progress.totalBytes),
        percent: Number.isFinite(progress.percent) ? progress.percent : null,
        assets: Array.isArray(progress.assets)
          ? progress.assets.map(asset => Object.assign({}, asset))
          : [],
        updatedAt: progress.updatedAt || 0
      };
    }

    async start() {
      if (this.state === "running") {
        return this.status();
      }

      this.lastError = "";

      try {
        await this.prepare();
        await this.ensureCanvas();
        this.mountWad();
        this.callInit();
        this.state = "running";
        this.log("[  RUN ]", "log-ok", "doom.status running");
        this.emitStatus("running");
        this.startLoop();
        return this.status();
      } catch (error) {
        this.state = "failed";
        this.lastError = error instanceof Error ? error.message : String(error);
        this.stopLoop();
        this.log("[ FAIL ]", "log-fail", this.lastError);
        this.emitStatus("failed");
        throw error;
      }
    }

    stop() {
      this.setAutoplay(false);
      this.stopLoop();
      this.state = "stopped";
      this.log("[ STOP ]", "log-info", "doom.status stopped; framebuffer loop halted.");
      this.emitStatus("stopped");
      return this.status();
    }

    ensureCpuCanvasContext(reason = "cpu-renderer") {
      if (this.context && this.frameImage && (this.frame32 || !IS_LITTLE_ENDIAN)) {
        return true;
      }

      this.webGpuFrameRenderer = false;
      this.renderer = reason === "startup-cpu"
        ? "canvas-fallback(cpu-selected)"
        : "canvas-fallback(cpu)";
      this.canvas.width = WIDTH;
      this.canvas.height = HEIGHT;
      this.canvas.hidden = false;
      this.context = this.canvas.getContext("2d", { alpha: false });

      if (!this.context && typeof document !== "undefined") {
        const previous = this.canvas;
        const replacement = document.createElement("canvas");
        Array.from(previous.attributes || []).forEach(attribute => {
          replacement.setAttribute(attribute.name, attribute.value);
        });
        replacement.id = previous.id || "doom-screen";
        replacement.className = previous.className || "";
        replacement.width = WIDTH;
        replacement.height = HEIGHT;
        replacement.hidden = false;
        replacement.tabIndex = previous.tabIndex >= 0 ? previous.tabIndex : 0;
        previous.replaceWith(replacement);
        this.canvas = replacement;
        this.context = replacement.getContext("2d", { alpha: false });
        window.dispatchEvent(new CustomEvent("aikernel-doom-canvas-replaced", {
          detail: { canvas: replacement, reason }
        }));
      }

      if (!this.context) {
        throw new Error("2D canvas context is unavailable.");
      }

      this.frameImage = this.context.createImageData(WIDTH, HEIGHT);
      this.frame32 = IS_LITTLE_ENDIAN ? new Uint32Array(this.frameImage.data.buffer) : null;
      return true;
    }

    handleGpuLost(kind = "webgpu", info = null, options = {}) {
      if (this.gpuFallbackHandled && !isDoomGpuRenderingEnabled()) {
        return this.status();
      }

      this.gpuFallbackHandled = true;
      const detailReason = info?.reason || info?.message || (typeof info === "string" ? info : "");
      const reason = `gpu-lost:${kind}${detailReason ? `:${detailReason}` : ""}`;
      const mode = setDoomGpuRenderingMode(false, reason);
      this.webGpuFrameRenderer = false;
      this.renderer = "canvas-fallback(cpu-after-gpu-lost)";
      const provider = resolveWebGpuProvider();
      if (!options.fromProvider && provider && typeof provider.forceCpuFallback === "function" && !provider.gpuPermanentlyDisabled) {
        provider.forceCpuFallback(kind, info);
      }

      try {
        this.ensureCpuCanvasContext("gpu-lost");
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
      }

      this.log("[ GPU ]", "log-warn", `GPU rendering disabled. Falling back to CPU mode (${mode.reason || reason}).`);
      this.emitStatus("gpu-fallback");
      return this.status();
    }

    async ensureCanvas() {
      if (!this.canvas) {
        throw new Error("doom-screen canvas is missing.");
      }

      this.canvas.width = WIDTH;
      this.canvas.height = HEIGHT;
      this.canvas.hidden = false;
      let provider = null;
      if (isDoomGpuRenderingEnabled()) {
        provider = await ensureDoomRendererProvider(this.log);
        if (!this.webGpuFrameRenderer && typeof provider?.initializeDoomRenderer === "function") {
          this.webGpuFrameRenderer = await provider.initializeDoomRenderer(this.canvas, WIDTH, HEIGHT, this.paletteCache.rgbaBytes);
        }
      } else {
        this.webGpuFrameRenderer = false;
        this.log("[ GPU ]", "log-warn", "CPU rendering mode selected; WebGPU renderer initialization skipped.");
      }

      this.renderer = this.webGpuFrameRenderer ? "WebGpuComputeProvider(texture)" : resolveRendererName();
      if (!this.webGpuFrameRenderer && provider?.lastError) {
        this.log("[ RENDER ]", "log-warn", `WebGPU texture renderer unavailable: ${provider.lastError}; using Canvas fallback.`);
      }
      if (this.webGpuFrameRenderer || (this.context && this.frameImage)) {
        return;
      }

      this.ensureCpuCanvasContext(isDoomGpuRenderingEnabled() ? "gpu-unavailable" : "startup-cpu");
    }

    async loadRuntime() {
      if (this.instance) {
        return;
      }

      this.setDownloadPhase("metadata", "Fetching DOOM runtime manifest");
      this.moduleConfig = await fetchJson(this.moduleUrl);
      const baseUrl = new URL(this.moduleUrl, window.location.href);
      const moduleDir = new URL(".", baseUrl);
      const wasmPath = new URL(this.moduleConfig.entry, moduleDir).pathname;
      const wadPath = this.moduleConfig.wad?.hostedPath || new URL(this.moduleConfig.wad?.hostedFile || "DOOM1.WAD", moduleDir).pathname;

      this.registerDownloadAsset("doom-wasm", "doom.wasm", this.moduleConfig.wasm?.sizeBytes);
      const wasmBytes = await fetchBinary(wasmPath, {
        label: "doom.wasm",
        sizeBytes: this.moduleConfig.wasm?.sizeBytes,
        sha256: this.moduleConfig.wasm?.sha256
      }, progress => this.updateDownloadAsset("doom-wasm", "doom.wasm", progress));

      this.registerDownloadAsset("doom-wad", "DOOM1.WAD", this.moduleConfig.wad?.sizeBytes);
      this.wadBytes = await fetchBinary(wadPath, {
        label: "DOOM1.WAD",
        sizeBytes: this.moduleConfig.wad?.sizeBytes,
        sha256: this.moduleConfig.wad?.sha256,
        cacheName: DOOM_BINARY_ASSET_CACHE
      }, progress => this.updateDownloadAsset("doom-wad", "DOOM1.WAD", progress));
      this.palette = parsePlaypal(this.wadBytes) || this.palette;
      this.paletteCache = buildPaletteCache(this.palette);
      this.wadMapHints = parseWadMapHints(this.wadBytes, "E1M1");
      if (this.wadMapHints) {
        this.log("[  WAD ]", "log-ok", `E1M1 map hints loaded: doors=${this.wadMapHints.doorLines || 0}; switches=${this.wadMapHints.switchLines || 0}; textures=${this.wadMapHints.textureRoles?.length || 0}.`);
      }

      const imports = this.createImports();
      const result = await WebAssembly.instantiate(wasmBytes, imports);
      this.instance = result.instance;
      this.exports = result.instance.exports;
      this.assertExports();
      this.nativeAudioAvailable = this.isNativeAudioAvailable();
      this.log("[ WASM ]", "log-ok", "doom.wasm instantiated and ABI exports linked.");
      this.log("[AUDIO]", this.nativeAudioAvailable ? "log-ok" : "log-warn", this.nativeAudioAvailable
        ? "doom.wasm native audio bridge exports detected."
        : "doom.wasm native audio bridge exports are unavailable; debug cue audio only.");
      this.log("[  WAD ]", "log-ok", "DOOM1.WAD validated and ready for memory-backed mount.");
    }

    async loadModel() {
      if (this.modelLoaded) {
        return;
      }

      this.setDownloadPhase("metadata", "Fetching Bonsai model manifest");
      this.modelManifest = await fetchJson(this.modelManifestUrl);
      this.setDownloadPhase("metadata", "Fetching AutoPlay profile");
      this.autoplayProfile = await fetchJson(this.autoplayProfileUrl).catch(error => {
        this.log("[AUTOPLAY]", "log-warn", `autoplay profile unavailable: ${error instanceof Error ? error.message : String(error)}; using built-in defaults.`);
        return null;
      });
      if (isDoomGpuRenderingEnabled()) {
        this.setDownloadPhase("provider", "Initializing WebGPU provider");
        await initializeWebGpuProvider();
      } else {
        this.setDownloadPhase("provider", "CPU rendering mode selected");
        this.log("[ GPU ]", "log-warn", "CPU mode selected; WebGPU provider initialization skipped.");
      }
      const modelLabel = this.modelManifest.name || this.modelManifest.upstreamFilename || "Bonsai-1.7B model";
      this.registerDownloadAsset("bonsai-model", modelLabel, this.modelManifest.sizeBytes);
      await fetchBinary(this.modelManifest.hostedFile, {
        label: modelLabel,
        sizeBytes: this.modelManifest.sizeBytes,
        sha256: this.modelManifest.sha256,
        cacheName: DOOM_BINARY_ASSET_CACHE
      }, progress => this.updateDownloadAsset("bonsai-model", modelLabel, progress));
      this.modelLoaded = true;
      this.bonsaiSupervisor?.configure(this.modelManifest, this.autoplayProfile);
      this.initializeWasmAutoplayController();
      this.log("[MODEL]", "log-ok", `${this.modelManifest.name || "Bonsai-1.7B"} downloaded and validated.`);
      this.log("[ GPU ]", isDoomGpuRenderingEnabled() ? "log-ok" : "log-warn", `Bonsai supervisor execution surface: ${resolveGpuDelegateName()}.`);
      this.emitStatus("model-ready");
    }

    assertExports() {
      for (const name of ["memory", "malloc", "doom_mount_wad", "doom_init", "doom_tick", "doom_render", "doom_input"]) {
        if (!this.exports?.[name]) {
          throw new Error(`doom.wasm missing export: ${name}`);
        }
      }
    }

    initializeWasmAutoplayController() {
      const controlRuntimeFactory = self.AIKernelDoomControlRuntime?.create;
      if (typeof controlRuntimeFactory === "function") {
        this.controlRuntime = controlRuntimeFactory(this.autoplayProfile || {});
        this.wasmAutoplayReady = true;
        this.autoplayControllerKind = "control-runtime-shim";
        this.wasmAutoplayLastError = "";
        this.log("[AUTOPLAY]", "log-ok", "Doom-scoped Control runtime shim active; native doom.wasm remains engine/I/O only.");
        return true;
      }

      this.controlRuntime = null;
      this.autoplayControllerKind = this.bonsaiSupervisor ? "bonsai" : "fallback";
      this.wasmAutoplayReady = false;
      this.wasmAutoplayLastError = "AIKernel.Control runtime shim is unavailable.";
      return false;
    }

    readWasmAutoplayStatus() {
      if (this.controlRuntime && typeof this.controlRuntime.status === "function") {
        return this.controlRuntime.status();
      }

      return null;
    }

    isNativeAudioAvailable() {
      return requireDoomNativeAudio("isAvailable")(this.exports);
    }

    nativeAudioStatus() {
      return requireDoomNativeAudio("status")(this.exports);
    }

    nativeAudioEventCount() {
      return requireDoomNativeAudio("eventCount")(this.exports);
    }

    nativeAudioAvailableFrames() {
      return requireDoomNativeAudio("availableFrames")(this.exports);
    }

    sendInput(keycode, pressed) {
      if (typeof this.exports?.doom_input !== "function") {
        return false;
      }

      this.exports.doom_input(keycode, pressed ? 1 : 0);
      return true;
    }

    setAutoplay(enabled) {
      const requested = Boolean(enabled);
      if (requested && !this.bonsaiSupervisor && !this.wasmAutoplayReady) {
        this.autoplayLastError = "AutoPlay controller is unavailable.";
        this.log("[AUTOPLAY]", "log-fail", this.autoplayLastError);
        this.emitStatus("autoplay-error");
        return this.status();
      }

      if (requested && !this.modelLoaded) {
        this.autoplayLastError = "Bonsai model is not loaded yet.";
        this.log("[AUTOPLAY]", "log-warn", this.autoplayLastError);
        this.emitStatus("autoplay-wait-model");
        return this.status();
      }

      this.autoplayEnabled = requested;
      if (!requested) {
        this.autoplayManualMove = false;
        this.autoplaySenseOnly = false;
      }
      this.autoplayPending = false;
      this.autoplayMode = requested ? "idle" : "disabled";
      this.bonsaiSupervisor?.setEnabled(requested);
      this.syncAutoplaySupervisorStatus();

      if (requested) {
        const controllerLabel = this.autoplayControllerKind === "control-runtime-shim"
          ? "Control runtime shim"
          : "Bonsai supervisor";
        this.log("[AUTOPLAY]", "log-ok", `${controllerLabel} active: predicting next move...`);
      } else {
        this.releaseAutoplayInputs();
        this.autoplayLastAction = self.AIKernelBonsai?.neutralAction?.() || this.autoplayLastAction;
        this.autoplayActionSignature = "";
        this.autoplayActionRepeatFrames = 0;
        this.autoplayMoveSignature = "";
        this.autoplayMoveRepeatFrames = 0;
        this.autoplayTurnSignature = "";
        this.autoplayTurnRepeatFrames = 0;
        this.autoplayMobilityMode = "none";
        this.autoplayLoopEscapeFrames = 0;
        this.autoplayTargetConfidence = 0;
        this.autoplaySoundCueActive = false;
        this.autoplayAuditorySnapshot = null;
        this.autoplaySpatialSnapshot = null;
        this.autoplayHealthSensor = null;
        this.autoplayCtgCarrier = null;
        this.autoplayCtgObservedScores = null;
        this.autoplayToposDecisionCarrier = null;
        this.autoplayNousCarrier = null;
        this.autoplayNousDetectorResult = null;
        this.clearAutoplayRetryDispatch();
        this.autoplayActionSignature = "";
        this.autoplayActionRepeatFrames = 0;
        this.autoplayMoveSignature = "";
        this.autoplayMoveRepeatFrames = 0;
        this.autoplayTurnSignature = "";
        this.autoplayTurnRepeatFrames = 0;
        this.autoplayRepeatActionFrames = 0;
        this.autoplayRepeatTurnFrames = 0;
        this.autoplayQuantizedStallFrames = 0;
        this.autoplayQuantizedFrameChange = 255;
        this.autoplayRegionQuantizedFrameChange = 255;
        this.autoplayStatusBarQuantizedFrameChange = 255;
        this.autoplayRegionSignature = "000000";
        this.autoplayDepthSignature = "0000";
        this.autoplayDepthEstimate = 1;
        this.autoplayFaceSignature = "0000000000000000";
        this.autoplayFaceQuantizedFrameChange = 255;
        this.autoplayCornerSignal = 0;
        this.autoplaySignatureMatchKind = "none";
        this.autoplaySignatureMatchDistance = 255;
        this.autoplayWallSignatureCount = 0;
        this.autoplayCornerSignatureCount = 0;
        this.autoplayDepthSignatureCount = 0;
        this.autoplayDepthSignatureDistance = 255;
        this.autoplayWallUseProbeFrames = 0;
        this.autoplayWallUseProbeStage = 0;
        this.autoplayWallUseProbeTurn = "left";
        this.autoplayCornerSuppressFrames = 0;
        this.autoplayWallDetachFrames = 0;
        this.autoplayWallDetachTurn = "left";
        this.autoplayWallSurveyFrames = 0;
        this.autoplayWallSurveyTurn = "left";
        this.autoplayWallSurveyDecisionFrames = 0;
        this.autoplayMapRushCorrectionFrames = 0;
        this.autoplayMapRushCorrectionTurn = "left";
        this.autoplayEnemyConfidence = 0;
        this.autoplayEnemyTurn = "none";
        this.autoplayEnemyDistance = 1;
        this.autoplayEnemyCluster = "none";
        this.autoplayEnemyFireReady = false;
      this.autoplayEnemyAllRegionPeak = 0;
      this.autoplayEnemyLateralBias = 0;
      this.autoplayAudioEnemyConfidence = 0;
      this.autoplayAudioEnemyDirection = "none";
      this.autoplayVisualEnemyVisible = false;
      this.autoplayVisualEnemyCentered = false;
      this.autoplayVisualEnemyYaw = 0;
      this.autoplayVisualEnemyFireReady = false;
      this.autoplayEnemyCombatYaw = 0;
      this.autoplayControlPipeline = "Idle";
        this.autoplayObjective = "disabled";
        this.autoplayActiveDetections = ["objective", "hud"];
        this.autoplaySemanticMemory = null;
        this.updateGpuHudOverlayState(null);
        this.log("[AUTOPLAY]", "log-info", "Bonsai idle: manual control restored.");
      }

      this.emitStatus(requested ? "autoplay-on" : "autoplay-off");
      return this.status();
    }

    setAutoplayManualMove(enabled) {
      this.autoplayManualMove = Boolean(enabled);
      if (this.autoplayManualMove) {
        this.releaseAutoplayMoveInputs();
        this.log("[AUTOPLAY]", "log-info", "manual-move debug enabled: AI sensing, Use, and Fire remain active; movement/turning are manual.");
      } else {
        this.log("[AUTOPLAY]", "log-info", "manual-move debug disabled: AI movement control restored.");
      }
      this.emitStatus(this.autoplayManualMove ? "autoplay-manual-move-on" : "autoplay-manual-move-off");
      return this.status();
    }

    setAutoplaySenseOnly(enabled) {
      this.autoplaySenseOnly = Boolean(enabled);
      if (this.autoplaySenseOnly) {
        this.releaseAutoplayInputs();
        this.log("[AUTOPLAY]", "log-info", "sense-only validation enabled: AI sensing and phase detection remain active; all AI inputs are suppressed.");
      } else {
        this.log("[AUTOPLAY]", "log-info", "sense-only validation disabled: AI input output restored.");
      }
      this.emitStatus(this.autoplaySenseOnly ? "autoplay-sense-only-on" : "autoplay-sense-only-off");
      return this.status();
    }

    async captureRawFramebufferDataUrl() {
      const indices = this.framebufferView;
      const palette = this.paletteCache?.rgbaBytes;
      if (!indices || !palette || indices.length < FRAME_BYTES) {
        return "";
      }

      let targetCanvas = null;
      if (typeof OffscreenCanvas === "function") {
        targetCanvas = new OffscreenCanvas(WIDTH, HEIGHT);
      } else if (typeof document !== "undefined" && typeof document.createElement === "function") {
        targetCanvas = document.createElement("canvas");
        targetCanvas.width = WIDTH;
        targetCanvas.height = HEIGHT;
      }

      const context = targetCanvas?.getContext?.("2d", { alpha: false });
      if (!context) {
        return "";
      }

      const image = context.createImageData(WIDTH, HEIGHT);
      const pixels = image.data;
      for (let source = 0, target = 0; source < FRAME_BYTES; source += 1, target += 4) {
        const color = (indices[source] || 0) * 4;
        pixels[target] = palette[color] || 0;
        pixels[target + 1] = palette[color + 1] || 0;
        pixels[target + 2] = palette[color + 2] || 0;
        pixels[target + 3] = 255;
      }
      context.putImageData(image, 0, 0);

      if (typeof targetCanvas.toDataURL === "function") {
        return targetCanvas.toDataURL("image/png");
      }

      if (typeof targetCanvas.convertToBlob === "function") {
        const blob = await targetCanvas.convertToBlob({ type: "image/png" });
        const bytes = new Uint8Array(await blob.arrayBuffer());
        return `data:image/png;base64,${bytesToBase64(bytes)}`;
      }

      return "";
    }

    async captureSenseOnlyFrame() {
      const status = this.status();
      const imageDataUrl = await this.captureRawFramebufferDataUrl();
      return {
        kind: "doom.sense-only.frame-capture",
        senseOnly: Boolean(this.autoplaySenseOnly),
        frame: this.frameCount,
        timestamp: new Date().toISOString(),
        imageDataUrl,
        captureSource: imageDataUrl ? RAW_FRAMEBUFFER_WIRE_NAME : "raw-framebuffer-unavailable",
        captureTarget: RAW_FRAMEBUFFER_TARGET,
        displayTarget: status.gpuHud?.displayTarget || RAW_FRAMEBUFFER_TARGET,
        displaySource: status.gpuHud?.displaySource || RAW_FRAMEBUFFER_WIRE_NAME,
        overlayExcluded: true,
        analysisSafe: Boolean(imageDataUrl),
        hudComposite: status.gpuHud || null,
        signatures: {
          region3x3: this.autoplayRegion9Signature,
          vision9x9: this.autoplayVision9x9Signature,
          motion9: this.autoplayMotion9Signature,
          health: status.autoplay.healthSignature,
          face: status.autoplay.faceSignature,
          depth: status.autoplay.depthSignature
        },
        sensors: status.autoplay.sensorInputs,
        audio: status.audio,
        health: status.health,
        detector: status.autoplay.nousDetectorResult,
        visualMotion: this.lastVisualMotionVector,
        action: status.autoplay.action
      };
    }

    setAudioPlayback(enabled) {
      this.audioPlaybackMuted = !Boolean(enabled);
      this.emitStatus(this.audioPlaybackMuted ? "audio-muted" : "audio-enabled");
      return this.status();
    }

    setAudioMuted(muted) {
      return this.setAudioPlayback(!Boolean(muted));
    }

    createSensorInputMap() {
      return requireDoomSensorInputs("createMap")();
    }

    createSensorState(name, conceptName, englishName, category, enabled, observed = false, metadata = {}) {
      return requireDoomSensorInputs("createState")(name, conceptName, englishName, category, enabled, observed, metadata);
    }

    createSensorStatusMap() {
      return requireDoomSensorInputs("statusMap")(this.sensorInputs);
    }

    sensorConceptName(kind) {
      return requireDoomSensorInputs("conceptName")(kind);
    }

    sensorCategory(kind) {
      return requireDoomSensorInputs("category")(kind);
    }

    isSensorEnabled(kind) {
      return requireDoomSensorInputs("isEnabled")(this.sensorInputs, kind);
    }

    syncSensorFlagsFromMap() {
      this.visualSensorEnabled = this.isSensorEnabled("visual");
      this.audioSensorEnabled = this.isSensorEnabled("audio");
      this.motorSensorEnabled = this.isSensorEnabled("motor");
      this.movementSensorEnabled = this.isSensorEnabled("movement");
      this.compassSensorEnabled = this.isSensorEnabled("compass");
      this.spatialSensorEnabled = this.isSensorEnabled("spatial");
      this.healthSensorEnabled = this.isSensorEnabled("health");
    }

    attachSensorObservation(sensors, key, observed, metadata = {}) {
      return requireDoomSensorInputs("attachObservation")(sensors, key, observed, metadata);
    }

    setSensorInput(kind, enabled) {
      const result = requireDoomSensorInputs("setEnabled")(this.sensorInputs, kind, enabled);
      const normalized = result.normalized;
      const next = result.enabled;

      this.syncSensorFlagsFromMap();
      if (normalized === "audio") {
        if (!this.audioSensorEnabled) {
          this.autoplaySoundCueActive = false;
          this.autoplayAuditorySnapshot = this.createNeutralAuditoryRuntimeSnapshot();
        }
      } else if (normalized === "health") {
        if (!this.healthSensorEnabled) {
          this.autoplayHealthSensor = {
            active: false,
            likelyDead: false,
            retryRequested: false,
            confidence: 0
          };
        }
      }

      this.emitStatus(`${normalized}-sensor-${next ? "enabled" : "cutoff"}`);
      return this.status();
    }

    normalizeSensorKind(kind) {
      return requireDoomSensorInputs("normalizeKind")(kind);
    }

    queueInput(keycode, pressed) {
      if (typeof this.exports?.doom_input !== "function") {
        return false;
      }

      const normalized = pressed ? 1 : 0;
      if (this.inputState.get(keycode) === normalized) {
        return true;
      }

      this.inputState.set(keycode, normalized);
      if (this.pendingInputEvents.length > 32) {
        this.pendingInputEvents.shift();
      }

      this.pendingInputEvents.push({ keycode, pressed: normalized });
      return true;
    }

    queueManualInput(keycode, pressed, holdMs = 0) {
      if (pressed && holdMs > 0) {
        this.manualInputUntil.set(keycode, Number.isFinite(holdMs)
          ? (window.performance?.now?.() || Date.now()) + holdMs
          : Number.POSITIVE_INFINITY);
      } else if (!pressed) {
        this.manualInputUntil.delete(keycode);
      }

      return this.queueInput(keycode, pressed);
    }

    isManualInputActive(keycode) {
      const until = this.manualInputUntil.get(keycode) || 0;
      const active = until > (window.performance?.now?.() || Date.now());
      if (!active && until) {
        this.manualInputUntil.delete(keycode);
      }

      return active;
    }

    mountWad() {
      if (this.wadMounted) {
        return;
      }

      const ptr = this.exports.malloc(this.wadBytes.length);
      if (!ptr) {
        throw new Error("malloc failed while mounting DOOM1.WAD.");
      }

      new Uint8Array(this.exports.memory.buffer, ptr, this.wadBytes.length).set(this.wadBytes);
      const mount = this.exports.doom_mount_wad(ptr, this.wadBytes.length);
      if (mount !== OK) {
        throw new Error(`doom_mount_wad failed with code ${mount}.`);
      }

      if (typeof this.exports.doom_wad_status === "function") {
        const status = this.exports.doom_wad_status();
        if (status !== OK) {
          throw new Error(`doom_wad_status failed with code ${status}.`);
        }
      }

      this.wadPtr = ptr;
      this.wadMounted = true;
    }

    callInit() {
      if (this.initialized) {
        return;
      }

      const init = this.exports.doom_init();
      if (init !== OK) {
        throw new Error(`doom_init failed with code ${init}.`);
      }
      this.initialized = true;
    }

    startLoop() {
      this.stopLoop();
      this.stableLogged = false;
      this.loopActive = true;
      this.targetFps = MAX_TARGET_FPS;
      this.fps = 0;
      this.fpsSampleFrames = 0;
      this.fpsSampleStartedAt = 0;
      this.noWaitSampleFrames = 0;
      this.nextFrameDueAt = 0;
      this.lastFrameWorkMs = 0;
      this.uiYieldMs = MIN_UI_YIELD_MS;
      this.log("[ RENDER ]", "log-ok", `framebuffer active (${this.renderer}, ${WIDTH}x${HEIGHT}, paletted 8bit, target ${this.targetFps}fps, min UI yield ${MIN_UI_YIELD_MS}ms).`);
      const token = ++this.loopToken;
      this.emitStatus("loop-start");

      const scheduleNext = (delay = 0) => {
        if (token !== this.loopToken || this.state !== "running") {
          return;
        }

        const boundedDelay = Math.min(Math.max(0, delay), MAX_FRAME_DELAY_MS);
        this.frameTimer = window.setTimeout(() => {
          if (token !== this.loopToken || this.state !== "running") {
            return;
          }

          this.animationFrame = window.requestAnimationFrame(frame);
        }, boundedDelay);
      };

      this.startWatchdog(token, scheduleNext);

      const frame = async (timestamp) => {
        if (token !== this.loopToken || this.state !== "running") {
          return;
        }

        const frameStartedAt = Number.isFinite(timestamp) ? timestamp : (window.performance?.now?.() || Date.now());
        if (this.nextFrameDueAt && frameStartedAt < this.nextFrameDueAt) {
          scheduleNext(Math.max(0, this.nextFrameDueAt - frameStartedAt));
          return;
        }

        try {
          const workStartedAt = window.performance?.now?.() || Date.now();
          this.pumpInput();
          const tick = this.exports.doom_tick();
          if (tick !== OK) {
            throw new Error(`doom_tick failed with code ${tick}.`);
          }

          const renderResult = this.exports.doom_render();
          await this.drawFrame(renderResult);
          this.drainNativeAudio();
          this.runAutoplay(renderResult);
          this.frameCount += 1;
          const frameEndedAt = window.performance?.now?.() || Date.now();
          this.lastFrameWorkMs = Math.max(0, frameEndedAt - workStartedAt);
          const interval = this.frameIntervalMs();
          this.nextFrameDueAt = this.nextFrameDueAt
            ? Math.max(this.nextFrameDueAt + interval, frameStartedAt + interval)
            : frameStartedAt + interval;
          const waitMs = Math.max(0, this.nextFrameDueAt - frameEndedAt);
          this.uiYieldMs = this.lastFrameWorkMs >= LONG_FRAME_MS ? EMERGENCY_UI_YIELD_MS : MIN_UI_YIELD_MS;
          if (waitMs <= MIN_UI_YIELD_MS) {
            this.noWaitSampleFrames += 1;
          }

          this.lastFrameAt = frameEndedAt;
          this.updateFps(frameEndedAt);
          if (!this.stableLogged) {
            this.stableLogged = true;
            this.log("[ RENDER ]", "log-ok", `framebuffer stable (${this.renderer}, ${WIDTH}x${HEIGHT}, paletted 8bit, cooperative adaptive scheduler, cap ${this.targetFps}fps, UI yield enforced).`);
            this.emitStatus("stable");
          }
        } catch (error) {
          this.state = "failed";
          this.lastError = error instanceof Error ? error.message : String(error);
          this.stopLoop();
          this.log("[ FAIL ]", "log-fail", this.lastError);
          this.emitStatus("failed");
          return;
        }

        if (token === this.loopToken && this.state === "running") {
          const dueDelay = Math.max(0, this.nextFrameDueAt - (window.performance?.now?.() || Date.now()));
          scheduleNext(Math.max(this.uiYieldMs, dueDelay));
        }
      };

      scheduleNext(0);
    }

    startWatchdog(token, scheduleNext) {
      if (this.watchdogTimer) {
        window.clearInterval(this.watchdogTimer);
        this.watchdogTimer = 0;
      }

      this.watchdogTimer = window.setInterval(() => {
        if (token !== this.loopToken || this.state !== "running") {
          return;
        }

        const now = window.performance?.now?.() || Date.now();
        if (this.lastFrameAt && now - this.lastFrameAt > WATCHDOG_STALL_MS) {
          const stallMs = Math.round(now - this.lastFrameAt);
          this.watchdogLastStallMs = stallMs;
          this.log("[ WATCH]", "log-warn", `frame watchdog restart: no frame for ${stallMs}ms; lastError=${this.lastError || "none"}.`);
          this.emitStatus("watchdog");
          this.restartAfterWatchdog(stallMs);
        }
      }, WATCHDOG_INTERVAL_MS);
    }

    async restartAfterWatchdog(stallMs) {
      if (this.watchdogRestarting || this.state !== "running") {
        return;
      }

      this.watchdogRestarting = true;
      this.watchdogRestarts += 1;
      const resumeAutoplay = this.autoplayEnabled;
      try {
        this.releaseAutoplayInputs();
        this.stopLoop();
        this.state = "stopped";
        this.emitStatus("watchdog-stop");
        this.log("[ WATCH]", "log-warn", `stopped stalled runtime after ${stallMs}ms; restarting render loop in ${WATCHDOG_RESTART_DELAY_MS}ms.`);
        await delay(WATCHDOG_RESTART_DELAY_MS);

        if (!this.instance || !this.exports || !this.initialized) {
          await this.start();
          return;
        }

        if (resumeAutoplay && this.modelLoaded) {
          this.autoplayEnabled = true;
          this.autoplayMode = "idle";
          this.bonsaiSupervisor?.setEnabled(true);
        }

        this.state = "running";
        this.nextFrameDueAt = 0;
        this.lastFrameAt = window.performance?.now?.() || Date.now();
        this.startLoop();
        this.log("[ WATCH]", "log-ok", `runtime restarted after watchdog stall; restarts=${this.watchdogRestarts}.`);
        this.emitStatus("watchdog-restart");
      } catch (error) {
        this.state = "failed";
        this.lastError = error instanceof Error ? error.message : String(error);
        this.stopLoop();
        this.log("[ FAIL ]", "log-fail", `watchdog restart failed: ${this.lastError}`);
        this.emitStatus("failed");
      } finally {
        this.watchdogRestarting = false;
      }
    }

    pumpInput() {
      if (typeof this.exports?.doom_input !== "function") {
        return;
      }

      let budget = 8;
      while (budget > 0 && this.pendingInputEvents.length) {
        const event = this.pendingInputEvents.shift();
        this.exports.doom_input(event.keycode, event.pressed);
        budget -= 1;
      }
    }

    runAutoplay(renderResult) {
      if (!this.autoplayEnabled || (!this.bonsaiSupervisor && !this.wasmAutoplayReady)) {
        return;
      }

      if (requireDoomRetryDispatch("snapshot")(this.autoplayRetryDispatch).active) {
        if (this.processAutoplayRetryDispatch()) {
          return;
        }
      }

      const frameIndices = this.resolveFramebufferIndices(renderResult);
      this.updateWebGpuFrameState(frameIndices);
      const gpuVision = self.AIKernelBonsai?.resolveGpuVisionSource?.() || null;
      const useGpuVision = this.visualSensorEnabled && Boolean(gpuVision?.zeroCopy);
      this.autoplayVisionMode = useGpuVision
        ? gpuVision.kind
        : (!this.visualSensorEnabled ? "sensor-cutoff" : (gpuVision?.kind ? `${gpuVision.kind}:cpu-frame-sample` : "cpu-frame-sample"));
      this.autoplayVisionZeroCopy = useGpuVision;
      this.logAutoplayVisionPath();
      if (!this.autoplayPending) {
        const state = this.createAutoplayState(this.visualSensorEnabled ? frameIndices : null, useGpuVision ? gpuVision : null);
        if (this.scheduleAutoplayFrameRetryDispatch(state)) {
          this.processAutoplayRetryDispatch();
          return;
        }

        this.updateGpuHudOverlayState(state);
        this.autoplayPending = true;
        this.autoplayMode = "predicting";
        if (this.tryRunWasmAutoplay(state)) {
          this.autoplayMode = "idle";
          this.autoplayPending = false;
          this.emitStatus("autoplay-predicted");
        } else if (this.bonsaiSupervisor) {
          this.bonsaiSupervisor.predict(state).then(action => {
          this.autoplayLastAction = self.AIKernelBonsai?.normalizeAction?.(action, this.autoplayLastAction) || action;
          this.updateAutoplayKinesisActionLoop(this.autoplayLastAction);
          const status = this.bonsaiSupervisor.status();
          this.applyAutoplaySupervisorStatus(status);
          this.updateGpuHudOverlayState(state);
          this.scheduleAutoplayRetryDispatch(status);
          this.handleDebugAudioPlayback();
          this.autoplayMode = "idle";
          this.autoplayPending = false;
          this.emitStatus("autoplay-predicted");
        }).catch(error => {
          this.autoplayLastError = error instanceof Error ? error.message : String(error);
          this.autoplayMode = "error";
          this.autoplayPending = false;
          this.log("[AUTOPLAY]", "log-fail", this.autoplayLastError);
          this.emitStatus("autoplay-error");
        });
        } else {
          this.autoplayLastError = "No AutoPlay controller accepted the frame.";
          this.autoplayMode = "error";
          this.autoplayPending = false;
          this.emitStatus("autoplay-error");
        }
      } else {
        this.autoplayReused += 1;
      }

      if (this.processAutoplayRetryDispatch()) {
        return;
      }

      this.applyAutoplayAction(this.autoplayLastAction);
    }

    tryRunWasmAutoplay(state) {
      if (!this.wasmAutoplayReady) {
        return false;
      }

      try {
        const wasmState = this.enrichWasmAutoplayStateWithFrame(this.createWasmAutoplayState(state), state);
        if (!this.controlRuntime || typeof this.controlRuntime.predict !== "function") {
          throw new Error("AIKernel.Control runtime shim is unavailable.");
        }

        const rawAction = this.controlRuntime.predict(wasmState);
        this.autoplayLastAction = self.AIKernelBonsai?.normalizeAction?.(rawAction, this.autoplayLastAction) || rawAction;
        this.updateAutoplayKinesisActionLoop(this.autoplayLastAction);
        const wasmStatus = this.readWasmAutoplayStatus() || {};
        const sensorStatus = this.createControlRuntimeSensorStatus(state, wasmState);
        const status = Object.assign({}, wasmStatus, sensorStatus, {
          controller: wasmStatus.controller || "control-runtime-shim",
          controlPipeline: rawAction.pipeline,
          stage: rawAction.stage || rawAction.pipeline,
          objective: rawAction.objective,
          strategyPriority: rawAction.strategyPriority,
          evidenceScore: rawAction.evidenceScore,
          semanticScores: rawAction.semanticScores,
          decisionTrace: wasmStatus.decisionTrace || rawAction.decisionTrace || null,
          ctgCarrier: rawAction.ctgCarrier || wasmStatus.ctgCarrier,
          depthEstimate: wasmState.depthSig,
          stuckFrames: wasmState.stuckTicks,
          recoveryFrames: wasmState.recoveryFrames,
          actionSignature: this.autoplayActionSignature,
          actionRepeatFrames: this.autoplayActionRepeatFrames,
          moveRepeatFrames: this.autoplayMoveRepeatFrames,
          turnRepeatFrames: this.autoplayTurnRepeatFrames,
          activeDetections: wasmState.activeDetections,
          semanticMemory: wasmState.semanticMemory,
          action: this.autoplayLastAction
        });
        this.applyAutoplaySupervisorStatus(status);
        this.updateGpuHudOverlayState(state);
        this.scheduleAutoplayRetryDispatch(status);
        this.handleDebugAudioPlayback();
        return true;
      } catch (error) {
        this.wasmAutoplayReady = false;
        this.autoplayControllerKind = this.bonsaiSupervisor ? "bonsai" : "fallback";
        this.wasmAutoplayLastError = error instanceof Error ? error.message : String(error);
        this.log("[AUTOPLAY]", "log-warn", `Control runtime shim disabled: ${this.wasmAutoplayLastError}; using Bonsai supervisor fallback.`);
        return false;
      }
    }

    createWasmAutoplayState(state) {
      return requireDoomWasmState("createState")(this, state);
    }

    enrichWasmAutoplayStateWithFrame(wasmState, state) {
      const frame = state?.framebuffer || {};
      const maxScore = (...values) => Math.max(0, Math.min(1, values.reduce((best, value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? Math.max(best, parsed) : best;
      }, 0)));
      const previousMilestones = this.autoplayMilestones || {};
      const doorOpenedCount = Math.max(
        Number(wasmState?.doorOpenedCount || 0),
        Number(wasmState?.milestones?.doorOpened || 0),
        Number(wasmState?.milestones?.doorOpenedCount || 0),
        Number(previousMilestones.doorOpened || 0),
        Number(previousMilestones.doorOpenedCount || 0));
      const computerRoomScore = this.round2(maxScore(wasmState?.computerRoomScore, frame.computerRoomScore));
      const computerPanelScore = this.round2(maxScore(wasmState?.computerPanelScore, frame.computerPanelScore));
      const computerDarkPanelScore = this.round2(maxScore(wasmState?.computerDarkPanelScore, frame.computerDarkPanelScore));
      const postDoorTerminalSurface = doorOpenedCount > 0
        ? this.round2(maxScore(
          wasmState?.postDoorTerminalSurface,
          computerPanelScore,
          computerDarkPanelScore,
          computerRoomScore * 0.72))
        : 0;
      const computerRoomConfidence = this.round2(maxScore(
        wasmState?.computerRoomConfidence,
        postDoorTerminalSurface,
        computerRoomScore,
        computerPanelScore * 0.82,
        computerDarkPanelScore * 0.82));
      const semanticMemory = Object.assign({}, wasmState?.semanticMemory || {});
      const symbols = Object.assign({}, semanticMemory.symbols || {});
      symbols["computer-room"] = maxScore(symbols["computer-room"], computerRoomConfidence);

      return Object.assign({}, wasmState || {}, {
        doorOpenedCount,
        computerRoomConfidence,
        computerRoomScore,
        computerPanelScore,
        computerDarkPanelScore,
        postDoorTerminalSurface,
        semanticMemory: Object.assign({}, semanticMemory, {
          symbols,
          computerRoom: Object.assign({}, semanticMemory.computerRoom || {}, {
            confidence: computerRoomConfidence
          })
        })
      });
    }

    resolveWasmAutoplayObjective(signals) {
      return requireDoomWasmState("resolveObjective")(signals);
    }

    createControlRuntimeSensorStatus(state, wasmState) {
      const frame = state?.framebuffer || {};
      const audio = state?.audio || {};
      const motor = state?.motor || {};
      const movement = state?.movement || {};
      const compass = state?.compass || {};
      const visualMotion = state?.visualMotion || frame.visualMotion || {};
      const regionSignature = this.gridSignature(frame.regionSample).padEnd(6, "0").slice(0, 6);
      const region9Signature = this.gridSignature(frame.region9Sample).padEnd(9, "0").slice(0, 9);
      const vision9x9Signature = this.gridSignature(frame.vision9x9Sample).padEnd(81, "0").slice(0, 81);
      const motion9Signature = String(visualMotion.baseSignature || visualMotion.signature || "").padEnd(9, "0").slice(0, 9);
      const previousMilestones = this.autoplayMilestones || this.bonsaiSupervisor?.status?.().milestones || {};
      const doorOpenedCount = Math.max(
        Number(previousMilestones.doorOpened || 0),
        Number(wasmState?.doorOpenedCount || 0));
      const milestones = Object.assign({}, previousMilestones, {
        doorOpened: doorOpenedCount,
        darkAreaScore: this.round2(frame.darkAreaScore),
        gameplayLuma: this.round2(frame.gameplayLuma),
        blueFloorScore: this.round2(frame.blueFloorScore),
        courtyardScore: this.round2(frame.courtyardScore),
        courtyardTurn: frame.courtyardTurn || "none",
        spawnSecretDoorScore: this.round2(frame.spawnSecretDoorScore),
        spawnSecretDoorTurn: frame.spawnSecretDoorTurn || "none",
        spawnWestStairScore: this.round2(frame.spawnWestStairScore),
        spawnWestStairTurn: frame.spawnWestStairTurn || "none",
        spawnCenterAnchorScore: this.round2(frame.spawnCenterAnchorScore),
        spawnCenterAnchorTurn: frame.spawnCenterAnchorTurn || "none",
        spawnCorridorGapScore: this.round2(wasmState?.spawnCorridorGapScore ?? frame.spawnCorridorGapScore),
        spawnCorridorGapTurn: wasmState?.spawnCorridorGapTurn || frame.spawnCorridorGapTurn || "none",
        spawnCorridorGapFrames: wasmState?.spawnCorridorGapLockFrames || frame.spawnCorridorGapFrames || 0,
        bridgeBrownScore: this.round2(frame.bridgeBrownScore),
        bridgeGreenLeft: this.round2(frame.bridgeGreenLeft),
        bridgeGreenCenter: this.round2(frame.bridgeGreenCenter),
        bridgeGreenRight: this.round2(frame.bridgeGreenRight),
        bridgeLaneTurn: frame.bridgeLaneTurn || "none",
        bridgeDoorScore: this.round2(frame.bridgeDoorScore),
        firstDoorCorridorSignature: this.round2(frame.firstDoorCorridorSignature),
        firstDoorVision9x9Score: this.round2(frame.firstDoorVision9x9Score),
        firstDoorVision9x9Box: frame.firstDoorVision9x9Box || null,
        firstDoorVision9x9Heatmap: Array.isArray(frame.firstDoorVision9x9Heatmap) ? frame.firstDoorVision9x9Heatmap : [],
        firstDoorVision9x9RedScore: this.round2(frame.firstDoorVision9x9RedScore),
        firstDoorUse3x3Score: this.round2(frame.firstDoorUse3x3Score),
        firstDoorUse3x3Turn: frame.firstDoorUse3x3Turn || "none",
        firstDoorUse3x3Reason: frame.firstDoorUse3x3Reason || "none",
        computerRoomScore: this.round2(frame.computerRoomScore),
        computerBlueScore: this.round2(frame.computerBlueScore),
        computerRedLightScore: this.round2(frame.computerRedLightScore),
        computerDarkPanelScore: this.round2(frame.computerDarkPanelScore),
        computerPanelScore: this.round2(frame.computerPanelScore),
        combatFireFrames: previousMilestones.combatFireFrames || 0,
        enemyConfidencePeak: Math.max(Number(previousMilestones.enemyConfidencePeak || 0), Number(frame.enemyConfidence || 0)),
        enemyDropFrames: previousMilestones.enemyDropFrames || 0
      });

      return {
        auditorySnapshot: audio,
        visionSensor: {
          active: Array.isArray(frame.vision9x9Sample) && frame.vision9x9Sample.length > 0,
          signature: vision9x9Signature,
          region9Signature,
          cells: Array.isArray(frame.vision9x9Sample) ? frame.vision9x9Sample.length : 0,
          zeroCopy: Boolean(frame.zeroCopy)
        },
        motorSensor: motor,
        movementSensor: movement,
        compassSensor: compass,
        spatialSensor: state?.spatial || state?.spatialSnapshot || null,
        healthSensor: {
          active: true,
          likelyDead: Boolean(frame.healthLikelyDead),
          retryRequested: Boolean(frame.healthLikelyDead),
          retryReason: frame.healthRetryReason || (frame.healthLikelyDead ? "health-death" : "none"),
          confidence: this.round2(Math.max(Number(frame.healthZeroScore || 0), Number(frame.healthDeathTintScore || 0) * 0.78)),
          signature: frame.healthSignature || "",
          activeColumns: Number(frame.healthActiveColumns || 0),
          activeCells: Number(frame.healthActiveCells || 0),
          deathTintScore: this.round2(frame.healthDeathTintScore),
          statusDeathTintScore: this.round2(frame.healthStatusDeathTintScore),
          faceDeathTintScore: this.round2(frame.healthFaceDeathTintScore),
          estimatedPercent: Number(frame.healthEstimatedPercent ?? 100),
          value: Number(frame.healthEstimatedPercent ?? 100),
          health: Number(frame.healthEstimatedPercent ?? 100),
          lowHealth: Number(frame.healthEstimatedPercent ?? 100) > 0 && Number(frame.healthEstimatedPercent ?? 100) < 50,
          lowHealthThreshold: 50
        },
        quantizedFrameChange: this.round2(Number(visualMotion.magnitude || 0) * 255),
        regionQuantizedFrameChange: this.round2(Number(visualMotion.baseMagnitude || 0) * 255),
        statusBarQuantizedFrameChange: this.round2(frame.statusBarQuantizedFrameChange ?? 255),
        regionSignature,
        region9Signature,
        vision9x9Signature,
        motion9Signature,
        motion9Delta: this.round2(Number(visualMotion.magnitude || 0) * 255),
        motionForwardProgress: this.round2(Math.max(0, Number(movement.vectorY || 0))),
        motionObstacleScore: this.round2(frame.footObstacleScore),
        motionTurnScore: this.round2(Math.abs(Number(visualMotion.vectorX || 0))),
        motionEntranceScore: this.round2(frame.spawnCorridorGapScore),
        motionStallScore: this.round2(Number(movement.confidence || 0) <= 0.1 && motor.active ? 0.35 : 0),
        motionIntent: motor.move || "idle",
        footObstacleScore: this.round2(frame.footObstacleScore),
        priorFootObstacleScore: this.round2(frame.priorFootObstacleScore),
        footObstacleFlickerScore: this.round2(frame.footObstacleFlickerScore),
        footObstacleBounceFrames: Number(frame.footObstacleBounceFrames || 0),
        footObstacleBandDelta: this.round2(frame.footObstacleBandDelta),
        inputStallFrames: Number(frame.inputStallFrames || 0),
        depthSignature: frame.depthSignature || "0000",
        depthEstimate: Number(frame.depthEstimate ?? wasmState?.depthSig ?? 1),
        faceSignature: frame.faceSignature || "0000000000000000",
        faceQuantizedFrameChange: this.round2(frame.faceQuantizedFrameChange ?? 255),
        cornerSignal: this.round2(frame.firstDoorUse3x3Score),
        enemyConfidence: this.round2(frame.enemyConfidence),
        enemyTurn: frame.enemyTurn || "none",
        enemyDistance: Number(frame.enemyDistance ?? 1),
        enemyCluster: frame.enemyCluster || "none",
        enemyFireReady: Boolean(frame.enemyCentered),
        enemyAllRegionPeak: this.round2(frame.enemyAllRegionPeak),
        enemyLateralBias: this.round2(frame.enemyLateralBias),
        audioEnemyConfidence: this.round2(wasmState?.audioEnemyConfidence ?? 0),
        audioEnemyDirection: wasmState?.audioEnemyDirection || "none",
        visualEnemyVisible: Boolean(wasmState?.visualEnemyVisible ?? Number(frame.enemyConfidence || 0) >= 0.28),
        visualEnemyCentered: Boolean(wasmState?.visualEnemyCentered ?? frame.enemyCentered),
        visualEnemyYaw: Number(wasmState?.visualEnemyYaw || 0),
        visualEnemyFireReady: Boolean(wasmState?.visualEnemyFireReady ?? frame.enemyCentered),
        enemyCombatYaw: Number(wasmState?.enemyCombatYaw || 0),
        ammoSignature: frame.ammoSignature || "",
        ammoLikelyEmpty: Boolean(frame.ammoLikelyEmpty),
        healthSignature: frame.healthSignature || "",
        healthLikelyDead: Boolean(frame.healthLikelyDead),
        healthZeroScore: this.round2(frame.healthZeroScore),
        healthActiveColumns: Number(frame.healthActiveColumns || 0),
        healthActiveCells: Number(frame.healthActiveCells || 0),
        healthEstimatedPercent: Number(frame.healthEstimatedPercent ?? 100),
        healthRetryReason: frame.healthRetryReason || "none",
        healthDeathTintScore: this.round2(frame.healthDeathTintScore),
        healthStatusDeathTintScore: this.round2(frame.healthStatusDeathTintScore),
        healthFaceDeathTintScore: this.round2(frame.healthFaceDeathTintScore),
        milestones
      };
    }

    applyAutoplaySupervisorStatus(status) {
      if (!status) {
        return;
      }

      this.lastAutoplayStatus = status;
      this.autoplayControllerKind = status.controller || this.autoplayControllerKind;
      this.autoplayPredictions = status.predictions ?? this.autoplayPredictions;
      this.autoplayLastLatencyMs = status.lastLatencyMs ?? this.autoplayLastLatencyMs;
      this.autoplayLastError = status.lastError || "";
      this.autoplaySafetyReason = status.safetyReason || "none";
      this.autoplayStuckFrames = status.stuckFrames || 0;
      this.autoplayRecoveryFrames = status.recoveryFrames || 0;
      this.autoplayMobilityMode = status.mobilityMode || "none";
      this.autoplayLoopEscapeFrames = status.loopEscapeFrames || 0;
      this.autoplayWallHugSide = status.wallHugSide || "left";
      this.autoplayTargetConfidence = status.targetConfidence || 0;
      this.autoplaySoundCueActive = Boolean(status.soundCueActive);
      this.autoplayAuditorySnapshot = status.auditorySnapshot || this.autoplayAuditorySnapshot || null;
      this.autoplaySpatialSnapshot = status.spatialSnapshot || this.autoplaySpatialSnapshot || null;
      this.autoplayVisionSensor = status.visionSensor || this.autoplayVisionSensor || null;
      this.autoplayMotorSensor = status.motorSensor || this.autoplayMotorSensor || null;
      this.autoplayMovementSensor = status.movementSensor || this.autoplayMovementSensor || null;
      this.autoplayCompassSensor = status.compassSensor || this.autoplayCompassSensor || null;
      this.autoplaySpatialSensor = status.spatialSensor || this.autoplaySpatialSensor || null;
      this.autoplayHealthSensor = status.healthSensor || this.autoplayHealthSensor;
      this.autoplayCtgCarrier = status.ctgCarrier || this.autoplayCtgCarrier || null;
      this.autoplayCtgObservedScores = status.ctgObservedScores || this.autoplayCtgObservedScores || null;
      this.autoplayToposDecisionCarrier = status.toposDecisionCarrier || this.autoplayToposDecisionCarrier || null;
      this.autoplayNousCarrier = status.nousCarrier || this.autoplayNousCarrier || null;
      this.autoplayNousDetectorResult = status.nousDetectorResult || status.nousCarrier?.cognitionHints?.nousDetectorResult || this.autoplayNousDetectorResult || null;
      this.autoplayActionSignature = status.actionSignature || this.autoplayActionSignature || "";
      this.autoplayActionRepeatFrames = Math.max(0, Math.floor(Number(status.actionRepeatFrames ?? this.autoplayActionRepeatFrames ?? 0)));
      this.autoplayMoveRepeatFrames = Math.max(0, Math.floor(Number(status.moveRepeatFrames ?? this.autoplayMoveRepeatFrames ?? 0)));
      this.autoplayTurnRepeatFrames = Math.max(0, Math.floor(Number(status.turnRepeatFrames ?? this.autoplayTurnRepeatFrames ?? 0)));
      this.autoplayRepeatActionFrames = status.repeatActionFrames || 0;
      this.autoplayRepeatTurnFrames = status.repeatTurnFrames || 0;
      this.autoplayQuantizedStallFrames = status.quantizedStallFrames || 0;
      this.autoplayQuantizedFrameChange = status.quantizedFrameChange ?? 255;
      this.autoplayRegionQuantizedFrameChange = status.regionQuantizedFrameChange ?? 255;
      this.autoplayStatusBarQuantizedFrameChange = status.statusBarQuantizedFrameChange ?? 255;
      this.autoplayRegionSignature = status.regionSignature || this.autoplayRegionSignature || "000000";
      this.autoplayRegion9Signature = status.region9Signature || this.autoplayRegion9Signature || "000000000";
      this.autoplayVision9x9Signature = status.vision9x9Signature || this.autoplayVision9x9Signature || "0".repeat(81);
      this.autoplayMotion9Signature = status.motion9Signature || this.autoplayMotion9Signature || "000000000";
      this.autoplayMotion9Delta = status.motion9Delta ?? 255;
      this.autoplayMotionForwardProgress = status.motionForwardProgress || 0;
      this.autoplayMotionObstacleScore = status.motionObstacleScore || 0;
      this.autoplayMotionTurnScore = status.motionTurnScore || 0;
      this.autoplayMotionEntranceScore = status.motionEntranceScore || 0;
      this.autoplayMotionStallScore = status.motionStallScore || 0;
      this.autoplayMotionIntent = status.motionIntent || "idle";
      this.autoplayFootObstacleScore = status.footObstacleScore || 0;
      this.autoplayPriorFootObstacleScore = status.priorFootObstacleScore || 0;
      this.autoplayFootObstacleFlickerScore = status.footObstacleFlickerScore || 0;
      this.autoplayFootObstacleBounceFrames = status.footObstacleBounceFrames || 0;
      this.autoplayFootObstacleBandDelta = status.footObstacleBandDelta || 0;
      this.autoplayInputStallFrames = status.inputStallFrames || 0;
      this.autoplayDepthSignature = status.depthSignature || this.autoplayDepthSignature || "0000";
      this.autoplayDepthEstimate = status.depthEstimate ?? this.autoplayDepthEstimate ?? 1;
      this.autoplayFaceSignature = status.faceSignature || this.autoplayFaceSignature || "0000000000000000";
      this.autoplayFaceQuantizedFrameChange = status.faceQuantizedFrameChange ?? 255;
      this.autoplayCornerSignal = status.cornerSignal || 0;
      this.autoplaySignatureMatchKind = status.signatureMatchKind || "none";
      this.autoplaySignatureMatchDistance = status.signatureMatchDistance ?? 255;
      this.autoplayWallSignatureCount = status.wallSignatureCount || 0;
      this.autoplayCornerSignatureCount = status.cornerSignatureCount || 0;
      this.autoplayDepthSignatureCount = status.depthSignatureCount || 0;
      this.autoplayDepthSignatureDistance = status.depthSignatureDistance ?? 255;
      this.autoplayWallUseProbeFrames = status.wallUseProbeFrames || 0;
      this.autoplayWallUseProbeStage = status.wallUseProbeStage || 0;
      this.autoplayWallUseProbeTurn = status.wallUseProbeTurn || "left";
      this.autoplayCornerSuppressFrames = status.cornerSuppressFrames || 0;
      this.autoplayWallDetachFrames = status.wallDetachFrames || 0;
      this.autoplayWallDetachTurn = status.wallDetachTurn || "left";
      this.autoplayWallSurveyFrames = status.wallSurveyFrames || 0;
      this.autoplayWallSurveyTurn = status.wallSurveyTurn || "left";
      this.autoplayWallSurveyDecisionFrames = status.wallSurveyDecisionFrames || 0;
      this.autoplayMapRushCorrectionFrames = status.mapRushCorrectionFrames || 0;
      this.autoplayMapRushCorrectionBackFrames = status.mapRushCorrectionBackFrames || 0;
      this.autoplayMapRushCorrectionTurn = status.mapRushCorrectionTurn || "left";
      this.autoplayMapRushCorrectionReversals = status.mapRushCorrectionReversals || 0;
      this.autoplayMapDoorSweepFrames = status.mapDoorSweepFrames || 0;
      this.autoplayMapDoorSweepTurn = status.mapDoorSweepTurn || "left";
      this.autoplayEnemyConfidence = status.enemyConfidence || 0;
      this.autoplayEnemyTurn = status.enemyTurn || "none";
      this.autoplayEnemyDistance = status.enemyDistance ?? 1;
      this.autoplayEnemyCluster = status.enemyCluster || "none";
      this.autoplayEnemyFireReady = Boolean(status.enemyFireReady);
      this.autoplayEnemyAllRegionPeak = status.enemyAllRegionPeak || 0;
      this.autoplayEnemyLateralBias = status.enemyLateralBias || 0;
      this.autoplayAudioEnemyConfidence = status.audioEnemyConfidence || 0;
      this.autoplayAudioEnemyDirection = status.audioEnemyDirection || "none";
      this.autoplayVisualEnemyVisible = Boolean(status.visualEnemyVisible);
      this.autoplayVisualEnemyCentered = Boolean(status.visualEnemyCentered);
      this.autoplayVisualEnemyYaw = Number.isFinite(Number(status.visualEnemyYaw)) ? Number(status.visualEnemyYaw) : 0;
      this.autoplayVisualEnemyFireReady = Boolean(status.visualEnemyFireReady);
      this.autoplayEnemyCombatYaw = Number.isFinite(Number(status.enemyCombatYaw)) ? Number(status.enemyCombatYaw) : 0;
      this.autoplayStrategyName = status.strategyName || this.autoplayStrategyName;
      this.autoplayStrategyContext = status.strategyContext || this.autoplayStrategyContext || "unknown";
      this.autoplayStrategyPriority = status.strategyPriority || 0;
      this.autoplayDecisionStage = status.stage || status.controlPipeline || "Idle";
      this.autoplayEvidenceScore = Number.isFinite(Number(status.evidenceScore)) ? Number(status.evidenceScore) : 0;
      this.autoplaySemanticScores = status.semanticScores || status.semanticMemory?.symbols || this.autoplaySemanticScores || null;
      this.autoplayDecisionTrace = status.decisionTrace || this.autoplayDecisionTrace || null;
      this.autoplayStageEvaluations = Array.isArray(status.stageEvaluations)
        ? status.stageEvaluations.slice(0, 12)
        : (this.autoplayStageEvaluations || []);
      this.autoplayKairosPriorityAxis = status.kairosPriorityAxis || this.autoplayKairosPriorityAxis || null;
      this.autoplayPipelineState = status.pipelineState || this.autoplayPipelineState || null;
      this.autoplayGoalState = status.goalState || status.autoplayState?.goalState || this.autoplayGoalState || null;
      this.autoplayDebugOverlay = status.debugOverlay || status.autoplayState?.debugOverlay || this.autoplayDebugOverlay || null;
      this.autoplayAutoplayState = status.autoplayState || this.autoplayAutoplayState || null;
      this.autoplayDebugRouteValues = status.debugRouteValues || this.autoplayDebugRouteValues || null;
      this.autoplayControlPipeline = status.controlPipeline || "Idle";
      this.autoplayObjective = status.objective || this.autoplayObjective || "disabled";
      this.autoplayRouteFallbackYaw = Number.isFinite(Number(status.routeFallbackYaw)) ? Number(status.routeFallbackYaw) : this.autoplayRouteFallbackYaw || 0;
      this.autoplayOpenCruiseYaw = Number.isFinite(Number(status.openCruiseYaw)) ? Number(status.openCruiseYaw) : this.autoplayOpenCruiseYaw || 0;
      this.autoplaySpawnCorridorGapActionScore = Number.isFinite(Number(status.spawnCorridorGapScore)) ? Number(status.spawnCorridorGapScore) : this.autoplaySpawnCorridorGapActionScore || 0;
      this.autoplaySpawnCorridorGapActionTurn = status.spawnCorridorGapTurn || this.autoplaySpawnCorridorGapActionTurn || "none";
      this.autoplayActiveDetections = Array.isArray(status.activeDetections) ? status.activeDetections : this.autoplayActiveDetections;
      this.autoplaySemanticMemory = status.semanticMemory || this.autoplaySemanticMemory || null;
      this.autoplayAmmoSignature = status.ammoSignature || this.autoplayAmmoSignature || "";
      this.autoplayAmmoLikelyEmpty = Boolean(status.ammoLikelyEmpty);
      this.autoplayHealthSignature = status.healthSignature || this.autoplayHealthSignature || "";
      this.autoplayHealthLikelyDead = Boolean(status.healthLikelyDead);
      this.autoplayHealthZeroScore = status.healthZeroScore || 0;
      this.autoplayHealthActiveColumns = status.healthActiveColumns || 0;
      this.autoplayHealthActiveCells = status.healthActiveCells || 0;
      this.autoplayHealthEstimatedPercent = Number.isFinite(Number(status.healthEstimatedPercent))
        ? Number(status.healthEstimatedPercent)
        : Number(this.autoplayHealthSensor?.value ?? this.autoplayHealthSensor?.health ?? this.autoplayHealthEstimatedPercent ?? 100);
      this.autoplayMilestones = status.milestones || this.autoplayMilestones || null;
    }

    syncAutoplaySupervisorStatus() {
      const status = this.bonsaiSupervisor?.status?.();
      if (!status) {
        return;
      }

      this.applyAutoplaySupervisorStatus(status);
      this.scheduleAutoplayRetryDispatch(status);
    }

    updateWebGpuFrameState(indices) {
      const provider = window.WebGpuComputeProvider || window.webGpuComputeProvider || window.aikernelWebGpuComputeProvider;
      if (typeof provider?.setFrameState !== "function") {
        return;
      }

      const texture = typeof provider.getFramebufferTexture === "function"
        ? provider.getFramebufferTexture(RAW_FRAMEBUFFER_TARGET)
        : null;
      const status = typeof provider.status === "function" ? provider.status() : null;
      provider.setFrameState(RAW_FRAMEBUFFER_TARGET, {
        width: WIDTH,
        height: HEIGHT,
        format: texture ? "rgba8unorm-gpu-texture" : "paletted-8bit",
        frame: this.frameCount,
        pointer: this.framebufferPtr,
        bytes: FRAME_BYTES,
        zeroCopy: Boolean(texture) && status?.usingCpuFallback === false
      });
    }

    isGpuHudOverlayReady(state, gpuHud = null, frame = null) {
      if (!this.autoplayEnabled || !this.visualSensorEnabled || !state) {
        return false;
      }

      const frameNumber = Number(state.frame ?? this.frameCount ?? 0);
      const frameState = frame || state.framebuffer || {};
      const hasFrameSignal = frameNumber > 0 && (
        Number(frameState.width || 0) > 0
        || Number(frameState.height || 0) > 0
        || Array.isArray(frameState.vision9x9Sample)
        || Array.isArray(frameState.vision9x9)
        || typeof frameState.renderFormat === "string"
        || typeof frameState.format === "string");
      if (!hasFrameSignal) {
        return false;
      }

      const projectedHud = gpuHud || this.resolveGpuHudOverlay(state);
      const projectedValues = projectedHud?.panelValues || projectedHud?.PanelValues || [];
      const projectedCells = projectedHud?.cells || projectedHud?.Cells || projectedHud?.heatCells || projectedHud?.HeatCells || [];
      const projectedRects = projectedHud?.rectangles || projectedHud?.Rectangles || [];
      const projectedRectValues = projectedHud?.rectangleValues || projectedHud?.RectangleValues || projectedHud?.rectValues || projectedHud?.RectValues || [];
      const projectedFlags = projectedHud?.featureFlags || projectedHud?.FeatureFlags || [];
      const hasProjectedHud = Boolean(projectedHud && (
        Number(projectedHud.contractVersion ?? projectedHud.ContractVersion ?? 0) > 0
        || (Array.isArray(projectedValues) && projectedValues.length > 0)
        || (Array.isArray(projectedCells) && projectedCells.length > 0)
        || (Array.isArray(projectedRects) && projectedRects.length > 0)
        || (Array.isArray(projectedRectValues) && projectedRectValues.length > 0)
        || (Array.isArray(projectedFlags) && projectedFlags.length > 0)
        || projectedHud.frameToken
        || projectedHud.FrameToken));

      const autoplayState = this.autoplayAutoplayState || state.autoplayState || state.AutoplayState || {};
      const pipeline = this.autoplayPipelineState
        || state.pipelineState
        || state.PipelineState
        || autoplayState.pipelineState
        || autoplayState.PipelineState
        || null;
      const hasPipeline = Boolean(pipeline && typeof pipeline === "object" && (
        pipeline.aisthesis || pipeline.Aisthesis
        || pipeline.noesis || pipeline.Noesis
        || pipeline.krisis || pipeline.Krisis
        || pipeline.kinesis || pipeline.Kinesis
        || Object.keys(pipeline).length >= 2));

      const goal = this.autoplayGoalState
        || state.goalState
        || state.GoalState
        || autoplayState.goalState
        || autoplayState.GoalState
        || null;
      const objective = String(
        this.autoplayObjective
        || state.objective
        || state.Objective
        || autoplayState.objective
        || autoplayState.Objective
        || "").toLowerCase();
      const stage = String(
        this.autoplayDecisionStage
        || this.autoplayControlPipeline
        || state.controlPipeline
        || state.ControlPipeline
        || "").toLowerCase();
      const hasDecision = Boolean(
        goal
        || (objective && objective !== "disabled" && objective !== "idle" && objective !== "unknown")
        || (stage && stage !== "disabled" && stage !== "idle" && stage !== "unknown"));

      return Boolean(hasProjectedHud || hasPipeline || hasDecision);
    }

    updateGpuHudOverlayState(state) {
      const provider = window.WebGpuComputeProvider || window.webGpuComputeProvider || window.aikernelWebGpuComputeProvider;
      if (typeof provider?.setHudOverlayState !== "function") {
        return;
      }

      const frame = state?.framebuffer || {};
      const gpuHud = this.resolveGpuHudOverlay(state);
      const probeTurn = this.resolveGpuHudProbeTurn();
      const compassHud = this.resolveGpuHudCompassState(state);
      const enemyCircle = this.resolveGpuHudEnemyCircle(state);
      const radarHud = this.resolveEgoRadarHudState(state, compassHud, enemyCircle);
      const hudReady = this.isGpuHudOverlayReady(state, gpuHud, frame);
      if (typeof provider.setHudOverlayEnabled === "function") {
        provider.setHudOverlayEnabled(hudReady);
      }

      const kairosTarget = Math.max(
        Number(this.autoplayTargetConfidence || 0),
        Number(this.autoplayCornerSignal || 0),
        this.autoplayWallUseProbeFrames > 0 ? 1 : 0,
        this.autoplayUsePulseFrames > 0 ? 0.9 : 0,
        this.autoplayRecoveryFrames > 0 ? 0.7 : 0
      );
      const now = Number(self.performance?.now?.() ?? Date.now());
      const previousKairos = this.gpuHudKairosDisplayState || { value: 0, updatedAt: now };
      const kairosDt = previousKairos.updatedAt > 0
        ? Math.max(16, Math.min(220, now - previousKairos.updatedAt))
        : 33;
      const kairosAlpha = kairosTarget >= Number(previousKairos.value || 0)
        ? 1 - Math.pow(0.5, kairosDt / 120)
        : 1 - Math.pow(0.5, kairosDt / 880);
      const kairos = this.smoothHudScalar(Number(previousKairos.value || 0), this.clampHudUnit(kairosTarget), kairosAlpha);
      this.gpuHudKairosDisplayState = {
        value: kairos,
        updatedAt: now
      };
      provider.setHudOverlayState({
        contractVersion: Number(gpuHud?.contractVersion ?? gpuHud?.ContractVersion ?? 1),
        contractName: String(gpuHud?.contractName || gpuHud?.ContractName || "DoomGpuHudOverlay"),
        featureFlags: gpuHud?.featureFlags || gpuHud?.FeatureFlags || [],
        rawFramebufferTarget: String(gpuHud?.rawFramebufferTarget || gpuHud?.RawFramebufferTarget || RAW_FRAMEBUFFER_TARGET),
        rawFrameTarget: gpuHud?.rawFrameTarget || gpuHud?.RawFrameTarget || null,
        hudTarget: String(gpuHud?.hudTarget || gpuHud?.HudTarget || HUD_COMPOSITE_TARGET),
        hudFrameTarget: gpuHud?.hudFrameTarget || gpuHud?.HudFrameTarget || null,
        analysisCaptureSource: String(gpuHud?.analysisCaptureSource || gpuHud?.AnalysisCaptureSource || RAW_FRAMEBUFFER_WIRE_NAME),
        analysisFrameTarget: gpuHud?.analysisFrameTarget || gpuHud?.AnalysisFrameTarget || null,
        displaySource: String(gpuHud?.displaySource || gpuHud?.DisplaySource || RAW_FRAMEBUFFER_WIRE_NAME),
        displayFrameTarget: gpuHud?.displayFrameTarget || gpuHud?.DisplayFrameTarget || null,
        readbackPolicy: String(gpuHud?.readbackPolicy || gpuHud?.ReadbackPolicy || "none"),
        readback: gpuHud?.readback || gpuHud?.Readback || null,
        frameToken: gpuHud?.frameToken || gpuHud?.FrameToken || null,
        rectangleLayout: String(gpuHud?.rectangleLayout || gpuHud?.RectangleLayout || "rect8:left,top,right,bottom,r,g,b,alpha"),
        rectangleBufferLayout: gpuHud?.rectangleBufferLayout || gpuHud?.RectangleBufferLayout || null,
        panelLayout: String(gpuHud?.panelLayout || gpuHud?.PanelLayout || "panel16"),
        panelBufferLayout: gpuHud?.panelBufferLayout || gpuHud?.PanelBufferLayout || null,
        enabled: hudReady,
        heatmapEnabled: Boolean(hudReady && this.visualSensorEnabled),
        cells: this.createGpuHudCells(state, frame),
        panelValues: this.createGpuHudPanelValues(state, frame),
        rectangleValues: this.createGpuHudRectangleValues(state),
        rectangles: this.createGpuHudRectangles(state, frame),
        enemyCircle,
        kairos: this.clampHudUnit(kairos),
        useProbeTurn: probeTurn,
        enemyConfidence: this.clampHudUnit(Number(enemyCircle?.confidence ?? enemyCircle?.Confidence ?? 0)),
        depthEstimate: Math.max(0, Math.min(1.5, Number(frame.depthEstimate ?? this.autoplayDepthEstimate ?? 1))),
        radarHud,
        egoRadar: radarHud,
        compassHeading: radarHud.northAngleDeg,
        compassUsable: radarHud.usableAlpha,
        compassYaw: radarHud.kinesisTurn,
        compassConfidence: radarHud.confidence,
        radarNorthAngleDeg: radarHud.northAngleDeg,
        radarUsableAlpha: radarHud.usableAlpha,
        radarKinesisTurn: radarHud.kinesisTurn,
        radarConfidence: radarHud.confidence,
        radarKinesisForward: radarHud.kinesisForward,
        radarMode: radarHud.mode,
        radarSuppressedAlpha: radarHud.suppressedAlpha,
        radarLostAlpha: radarHud.lostAlpha,
        radarHoldAlpha: radarHud.holdAlpha,
        radarFlickerPhase: radarHud.flickerPhase,
        enemyVisualYaw: radarHud.enemyVisualYaw,
        enemyVisualAlpha: radarHud.enemyVisualAlpha,
        enemyAudioYaw: radarHud.enemyAudioYaw,
        enemyAudioAlpha: radarHud.enemyAudioAlpha,
        enemySignalSuppressed: radarHud.enemySignalSuppressed,
        enemySignalLost: radarHud.enemySignalLost
      });

      const gpuAisthesisState = this.createGpuAisthesisState(state, frame);
      if (typeof provider.setGpuAisthesisState === "function") {
        provider.setGpuAisthesisState(gpuAisthesisState);
      }

      if (typeof provider.setGpuSpatialReasoningState === "function") {
        provider.setGpuSpatialReasoningState(this.createGpuSpatialReasoningState(state, frame, gpuAisthesisState));
      }
    }

    resolveGpuHudProbeTurn() {
      if ((this.autoplayWallUseProbeFrames || 0) > 0 || (this.autoplayWallUseProbeStage || 0) > 0) {
        return this.autoplayWallUseProbeTurn === "right" ? 1 : -1;
      }

      if ((this.autoplayMapDoorSweepFrames || 0) > 0) {
        return this.autoplayMapDoorSweepTurn === "right" ? 1 : -1;
      }

      if ((this.autoplayWallDetachFrames || 0) > 0) {
        return this.autoplayWallDetachTurn === "right" ? 1 : -1;
      }

      return 0;
    }

    resolveGpuHudCompassState(state) {
      const compass = state?.compassSensor || state?.CompassSensor || this.autoplayCompassSensor || {};
      const heading = Number(compass.heading ?? compass.Heading ?? this.compassHeading ?? 0);
      const confidence = this.clampHudUnit(Number(compass.confidence ?? compass.Confidence ?? 0));
      const usable = Number.isFinite(heading)
        && confidence >= 0.12
        && compass.headingUsable !== false
        && compass.HeadingUsable !== false
        && !compass.headingUncertain
        && !compass.HeadingUncertain;
      const action = this.autoplayLastAction || {};
      const yaw = Number(
        state?.recommendedYaw
        ?? state?.autoplayState?.recommendedYaw
        ?? this.autoplayAutoplayState?.recommendedYaw
        ?? this.autoplayRouteFallbackYaw
        ?? action.turnYaw
        ?? 0);

      return {
        heading: Number.isFinite(heading) ? ((heading % 360) + 360) % 360 : 0,
        usable,
        yaw: Number.isFinite(yaw) ? Math.max(-90, Math.min(90, yaw)) : 0,
        confidence
      };
    }

    resolveRadarEnemyDirectionState(state, enemyCircle = null) {
      const autoplayState = this.autoplayAutoplayState
        || state?.autoplayState
        || state?.AutoplayState
        || {};
      const circle = enemyCircle && typeof enemyCircle === "object" ? enemyCircle : null;
      const circleType = String(circle?.type || circle?.Type || "").toLowerCase();
      const circleConfidence = this.clampHudUnit(Number(circle?.confidence ?? circle?.Confidence ?? 0));
      const circleYaw = Number(circle?.yaw ?? circle?.Yaw ?? 0);
      const audio = autoplayState.auditorySnapshot
        || autoplayState.AuditorySnapshot
        || this.autoplayAuditorySnapshot
        || state?.auditorySnapshot
        || state?.AuditorySnapshot
        || state?.audio
        || state?.Audio
        || {};
      const left = Number(audio.leftEnergy ?? audio.LeftEnergy ?? 0);
      const right = Number(audio.rightEnergy ?? audio.RightEnergy ?? 0);
      const total = Math.max(0, left) + Math.max(0, right);
      const balance = Number.isFinite(Number(audio.balance ?? audio.Balance))
        ? Math.max(-1, Math.min(1, Number(audio.balance ?? audio.Balance)))
        : (total > 0 ? Math.max(-1, Math.min(1, (right - left) / total)) : 0);
      const inferredDirection = balance > 0.12 ? "right" : (balance < -0.12 ? "left" : "front");
      const audioDirection = String(
        autoplayState.audioEnemyDirection
        ?? autoplayState.AudioEnemyDirection
        ?? state?.audioEnemyDirection
        ?? state?.AudioEnemyDirection
        ?? this.autoplayAudioEnemyDirection
        ?? inferredDirection
      ).toLowerCase();
      const direction = audioDirection === "left" || audioDirection === "right" || audioDirection === "front"
        ? audioDirection
        : inferredDirection;
      const audioConfidence = this.clampHudUnit(Number(
        autoplayState.audioEnemyConfidence
        ?? autoplayState.AudioEnemyConfidence
        ?? state?.audioEnemyConfidence
        ?? state?.AudioEnemyConfidence
        ?? this.autoplayAudioEnemyConfidence
        ?? 0));
      const energy = Math.max(
        left,
        right,
        Number(audio.lowEnergy ?? audio.LowEnergy ?? 0),
        Number(audio.midEnergy ?? audio.MidEnergy ?? 0),
        Number(audio.highEnergy ?? audio.HighEnergy ?? 0));
      const eventDetected = Boolean(audio.eventDetected ?? audio.EventDetected ?? this.autoplaySoundCueActive);
      const audioAlpha = Math.max(
        audioConfidence,
        circleType === "audio" || circleType === "av" ? circleConfidence : 0,
        eventDetected && energy >= 0.025 ? Math.min(0.72, energy * 0.75 + Math.abs(balance) * 0.18 + 0.18) : 0);
      const visualAlpha = circleType === "visual" || circleType === "av"
        ? circleConfidence
        : this.clampHudUnit(Number(autoplayState.visualEnemyConfidence ?? autoplayState.VisualEnemyConfidence ?? state?.visualEnemyConfidence ?? state?.VisualEnemyConfidence ?? 0));
      const visualYaw = Number.isFinite(circleYaw)
        ? Math.max(-45, Math.min(45, circleYaw))
        : Math.max(-45, Math.min(45, Number(autoplayState.visualEnemyYaw ?? autoplayState.VisualEnemyYaw ?? state?.visualEnemyYaw ?? 0)));
      const audioYaw = direction === "right" ? 24 : (direction === "left" ? -24 : 0);
      const suppressed = Boolean(
        autoplayState.visualEnemySuppressed
        || autoplayState.VisualEnemySuppressed
        || state?.visualEnemySuppressed
        || state?.VisualEnemySuppressed);

      return {
        visualYaw,
        visualAlpha: this.clampHudUnit(visualAlpha),
        audioYaw,
        audioAlpha: this.clampHudUnit(audioAlpha),
        signalSuppressed: suppressed ? 1 : 0,
        signalLost: visualAlpha < 0.08 && audioAlpha < 0.08 && eventDetected ? 1 : 0
      };
    }

    normalizeRadarRelativeYaw(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return 0;
      }

      return ((((numeric + 180) % 360) + 360) % 360) - 180;
    }

    resolveRadarReferenceBearingState(compass, northAngleDeg, previous, rawUsable, suppressed, rawConfidence, riseAlpha, decayAlpha) {
      const referenceCandidates = [
        {
          kind: "edge-snap",
          heading: Number(compass.edgeSnapHeading ?? compass.EdgeSnapHeading),
          confidence: Number(compass.edgeSnapConfidence ?? compass.EdgeSnapConfidence ?? 0)
        },
        {
          kind: "landmark",
          heading: Number(compass.landmarkHeading ?? compass.LandmarkHeading),
          confidence: Number(compass.landmarkConfidence ?? compass.LandmarkConfidence ?? 0)
        },
        {
          kind: "visual-flow",
          heading: Number(compass.visualFlowHeading ?? compass.VisualFlowHeading),
          confidence: Number(rawConfidence || 0) * 0.62
        },
        {
          kind: "motor",
          heading: Number(compass.motorHeading ?? compass.MotorHeading),
          confidence: Number(rawConfidence || 0) * 0.50
        }
      ]
        .filter(candidate => Number.isFinite(candidate.heading) && Number.isFinite(candidate.confidence) && candidate.confidence >= 0.08)
        .sort((left, right) => right.confidence - left.confidence);

      const candidate = referenceCandidates[0] || null;
      const previousAlpha = this.clampHudUnit(Number(previous.referenceAlpha || 0));
      const previousYaw = Number.isFinite(Number(previous.referenceYaw))
        ? this.normalizeRadarRelativeYaw(previous.referenceYaw)
        : 0;
      if (!candidate) {
        return {
          yaw: previousYaw,
          alpha: this.smoothHudScalar(previousAlpha, 0, decayAlpha),
          kind: "none"
        };
      }

      const rawRelativeYaw = this.signedCompassDelta(northAngleDeg, candidate.heading);
      const snappedRelativeYaw = this.normalizeRadarRelativeYaw(Math.round(rawRelativeYaw / 45) * 45);
      const yawDelta = this.normalizeRadarRelativeYaw(snappedRelativeYaw - previousYaw);
      const yawAlpha = candidate.kind === "edge-snap" ? Math.max(riseAlpha, 0.22) : riseAlpha;
      const yaw = this.normalizeRadarRelativeYaw(previousYaw + yawDelta * yawAlpha);
      const shouldShow = !rawUsable || suppressed || rawConfidence < 0.28 || candidate.kind === "edge-snap";
      const targetAlpha = shouldShow ? this.clampHudUnit(candidate.confidence * 1.95) : 0;
      const alpha = this.smoothHudScalar(previousAlpha, targetAlpha, targetAlpha >= previousAlpha ? riseAlpha : decayAlpha);
      return {
        yaw: Math.round(yaw * 100) / 100,
        alpha: this.clampHudUnit(alpha),
        kind: candidate.kind
      };
    }

    resolveEgoRadarHudState(state, compassHud = null, enemyCircle = null) {
      const now = Number(self.performance?.now?.() ?? Date.now());
      const previous = this.gpuRadarHudDisplayState || {};
      const compass = state?.compassSensor || state?.CompassSensor || this.autoplayCompassSensor || {};
      const rawHeadingNumber = Number(compassHud?.heading ?? compass.heading ?? compass.Heading ?? this.compassHeading ?? 0);
      const rawHeading = Number.isFinite(rawHeadingNumber)
        ? this.normalizeCompassHeading(rawHeadingNumber)
        : null;
      const rawConfidence = this.clampHudUnit(Number(compassHud?.confidence ?? compass.confidence ?? compass.Confidence ?? 0));
      const rawUsable = rawHeading !== null
        && Boolean(compassHud?.usable ?? true)
        && compass.headingUsable !== false
        && compass.HeadingUsable !== false
        && !compass.headingUncertain
        && !compass.HeadingUncertain
        && rawConfidence >= 0.02;
      const suppressed = Boolean(
        compass.contextResetActive
        || compass.ContextResetActive
        || compass.combatSurveyActive
        || compass.CombatSurveyActive
        || compass.wallFollowActive
        || compass.WallFollowActive
        || String(compass.headingReliability || compass.HeadingReliability || "").match(/wall|corridor|survey|reset|suppressed/i)
      );
      const action = this.autoplayLastAction || state?.action || state?.Action || {};
      const move = String(action.move || action.Move || "").toLowerCase();
      const turn = String(action.turn || action.Turn || "").toLowerCase();
      const forwardTarget = move === "forward" || action.moveForward || action.forward || action.Forward
        ? 1
        : (move === "back" || move === "backward" || action.moveBack || action.back || action.Back ? -1 : 0);
      const numericTurn = Number(action.turnYaw ?? action.yaw ?? action.Yaw ?? 0);
      const turnFromYaw = Number.isFinite(numericTurn) ? Math.max(-1, Math.min(1, numericTurn / 45)) : 0;
      const turnTarget = turn === "right" || action.turnRight || action.right || action.Right
        ? 1
        : (turn === "left" || action.turnLeft || action.left || action.Left ? -1 : turnFromYaw);
      const previousHeading = Number.isFinite(previous.northAngleDeg)
        ? this.normalizeCompassHeading(previous.northAngleDeg)
        : rawHeading;
      const dt = previous.updatedAt > 0
        ? Math.max(16, Math.min(180, now - previous.updatedAt))
        : 33;
      const riseAlpha = 1 - Math.pow(0.5, dt / 100);
      const decayAlpha = 1 - Math.pow(0.5, dt / 660);
      const actionAlpha = 1 - Math.pow(0.5, dt / 90);
      const holdUntil = rawUsable ? now + 1100 : Number(previous.holdUntil || 0);
      const held = !rawUsable && now < holdUntil;
      const headingTarget = rawHeading !== null ? rawHeading : previousHeading;
      const northAngleDeg = headingTarget === null
        ? 0
        : (previousHeading === null
          ? headingTarget
          : this.normalizeCompassHeading(previousHeading + this.signedCompassDelta(previousHeading, headingTarget) * (rawUsable ? riseAlpha : Math.max(decayAlpha * 0.72, 0.035))));
      const confidenceTarget = rawUsable
        ? Math.max(rawConfidence, 0.20)
        : (held ? Math.max(rawConfidence * 0.7, Number(previous.confidence || 0) * 0.62, 0.10) : 0);
      const usableTarget = rawUsable
        ? 1
        : (held ? Math.max(Number(previous.usableAlpha || 0) * 0.70, 0.18) : 0);
      const modeTarget = rawUsable && !suppressed
        ? 2
        : (rawUsable || held || suppressed ? 1 : 0);
      const confidence = this.smoothHudScalar(Number(previous.confidence || 0), confidenceTarget, rawUsable ? riseAlpha : decayAlpha);
      const usableAlpha = this.smoothHudScalar(Number(previous.usableAlpha || 0), usableTarget, rawUsable ? riseAlpha : decayAlpha);
      const kinesisForward = this.smoothHudScalar(Number(previous.kinesisForward || 0), forwardTarget, actionAlpha);
      const kinesisTurn = this.smoothHudScalar(Number(previous.kinesisTurn || 0), turnTarget, actionAlpha);
      const lowConfidence = confidence < 0.20;
      const flickerPhase = lowConfidence
        ? 0.30 + (0.70 * (0.5 + 0.5 * Math.sin(now / 1000 * 17.0)))
        : 1;
      const enemy = this.resolveRadarEnemyDirectionState(state, enemyCircle);
      const reference = this.resolveRadarReferenceBearingState(compass, northAngleDeg, previous, rawUsable, suppressed, rawConfidence, riseAlpha, decayAlpha);

      this.gpuRadarHudDisplayState = {
        northAngleDeg: Math.round(northAngleDeg * 100) / 100,
        usableAlpha: this.clampHudUnit(usableAlpha),
        confidence: this.clampHudUnit(confidence),
        kinesisForward: Math.max(-1, Math.min(1, kinesisForward)),
        kinesisTurn: Math.max(-1, Math.min(1, kinesisTurn)),
        mode: modeTarget,
        suppressedAlpha: modeTarget === 1 ? 1 : 0,
        lostAlpha: modeTarget === 0 ? 1 : 0,
        holdAlpha: held ? 1 : 0,
        flickerPhase,
        enemyVisualYaw: enemy.visualYaw,
        enemyVisualAlpha: enemy.visualAlpha,
        enemyAudioYaw: enemy.audioYaw,
        enemyAudioAlpha: enemy.audioAlpha,
        enemySignalSuppressed: enemy.signalSuppressed,
        enemySignalLost: enemy.signalLost,
        referenceYaw: reference.yaw,
        referenceAlpha: reference.alpha,
        referenceKind: reference.kind,
        rawHeading,
        rawUsable,
        suppressed,
        held,
        holdUntil,
        updatedAt: now
      };
      return this.gpuRadarHudDisplayState;
    }

    createGpuHudCells(state, frame) {
      const gpuHud = this.resolveGpuHudOverlay(state);
      const projectedCells = gpuHud?.cells || gpuHud?.Cells || gpuHud?.heatCells || gpuHud?.HeatCells || [];
      if (Array.isArray(projectedCells) && projectedCells.length > 0) {
        const cells = projectedCells.slice(0, 81).map(value => this.clampHudUnit(Number(value || 0)));
        while (cells.length < 81) {
          cells.push(0);
        }
        return cells;
      }

      const cells = new Array(81).fill(0);
      if (!frame || typeof frame !== "object") {
        return cells;
      }

      const vision = Array.isArray(frame.vision9x9Sample) ? frame.vision9x9Sample : [];
      const door = Array.isArray(frame.firstDoorVision9x9Heatmap) ? frame.firstDoorVision9x9Heatmap : [];
      const projectile = Array.isArray(frame.projectileVision9x9Sample) ? frame.projectileVision9x9Sample : [];
      const resource = Array.isArray(frame.resourceVision9x9Sample) ? frame.resourceVision9x9Sample : [];
      const enemy9 = Array.isArray(frame.enemyRegion9Sample) ? frame.enemyRegion9Sample : [];
      for (let index = 0; index < cells.length; index += 1) {
        const row = Math.floor(index / 9);
        const column = index % 9;
        const region = Math.floor(row / 3) * 3 + Math.floor(column / 3);
        const base = vision.length > index ? this.clampHudUnit(Number(vision[index] || 0) / 255) * 0.18 : 0;
        const doorScore = door.length > index ? this.clampHudUnit(door[index]) * 0.95 : 0;
        const projectileScore = projectile.length > index ? this.clampHudUnit(projectile[index]) : 0;
        const resourceScore = resource.length > index ? this.clampHudUnit(resource[index]) * 0.44 : 0;
        const enemyScore = enemy9.length > region ? this.clampHudUnit(enemy9[region]) * 0.86 : 0;
        cells[index] = this.clampHudUnit(Math.max(base, doorScore, projectileScore, resourceScore, enemyScore));
      }

      return cells;
    }

    createGpuHudRectangleValues(state) {
      const gpuHud = this.resolveGpuHudOverlay(state);
      const projectedValues = gpuHud?.rectangleValues || gpuHud?.RectangleValues || gpuHud?.rectValues || gpuHud?.RectValues || [];
      if (!Array.isArray(projectedValues) && !ArrayBuffer.isView(projectedValues)) {
        return [];
      }

      return Array.from(projectedValues)
        .slice(0, 128)
        .map(value => {
          const numeric = Number(value || 0);
          return Number.isFinite(numeric) ? numeric : 0;
        });
    }

    createGpuHudRectangles(state, frame) {
      const gpuHud = this.resolveGpuHudOverlay(state);
      const projectedRects = gpuHud?.rectangles || gpuHud?.Rectangles || [];
      if (!Array.isArray(projectedRects) || projectedRects.length <= 0) {
        return [];
      }

      return projectedRects
        .map(rect => this.normalizeGpuHudDirectRect(rect))
        .filter(Boolean)
        .slice(0, 16);
    }

    resolveGpuHudOverlay(state) {
      const debugOverlay = this.autoplayDebugOverlay
        || this.autoplayAutoplayState?.debugOverlay
        || this.autoplayAutoplayState?.DebugOverlay
        || state?.debugOverlay
        || state?.DebugOverlay
        || state?.autoplayState?.debugOverlay
        || state?.autoplayState?.DebugOverlay
        || {};
      return debugOverlay.gpuHud
        || debugOverlay.GpuHud
        || this.autoplayAutoplayState?.gpuHud
        || this.autoplayAutoplayState?.GpuHud
        || state?.gpuHud
        || state?.GpuHud
        || null;
    }

    resolveGpuHudEnemyCircle(state) {
      const debugOverlay = this.autoplayDebugOverlay
        || this.autoplayAutoplayState?.debugOverlay
        || this.autoplayAutoplayState?.DebugOverlay
        || state?.debugOverlay
        || state?.DebugOverlay
        || state?.autoplayState?.debugOverlay
        || state?.autoplayState?.DebugOverlay
        || {};
      const circle = debugOverlay.enemyCircle
        || debugOverlay.EnemyCircle
        || this.autoplayAutoplayState?.enemyCircle
        || this.autoplayAutoplayState?.EnemyCircle
        || state?.enemyCircle
        || state?.EnemyCircle
        || null;
      if (circle && typeof circle === "object") {
        const confidence = this.clampHudUnit(Number(circle.confidence ?? circle.Confidence ?? 0));
        if (Boolean(circle.active ?? circle.Active) && confidence >= 0.24) {
          return circle;
        }
      }

      const autoplayState = this.autoplayAutoplayState
        || state?.autoplayState
        || state?.AutoplayState
        || {};
      const audio = autoplayState.auditorySnapshot
        || autoplayState.AuditorySnapshot
        || this.autoplayAuditorySnapshot
        || state?.auditorySnapshot
        || state?.AuditorySnapshot
        || state?.audio
        || state?.Audio
        || {};
      const left = Number(audio.leftEnergy ?? audio.LeftEnergy ?? 0);
      const right = Number(audio.rightEnergy ?? audio.RightEnergy ?? 0);
      const total = Math.max(0, left) + Math.max(0, right);
      const balance = Number.isFinite(Number(audio.balance ?? audio.Balance))
        ? Math.max(-1, Math.min(1, Number(audio.balance ?? audio.Balance)))
        : (total > 0 ? Math.max(-1, Math.min(1, (right - left) / total)) : 0);
      const inferredDirection = balance > 0.12 ? "right" : (balance < -0.12 ? "left" : "front");
      const audioDirection = String(
        autoplayState.audioEnemyDirection
        ?? autoplayState.AudioEnemyDirection
        ?? state?.audioEnemyDirection
        ?? state?.AudioEnemyDirection
        ?? this.autoplayAudioEnemyDirection
        ?? inferredDirection
      ).toLowerCase();
      const direction = audioDirection === "left" || audioDirection === "right" || audioDirection === "front"
        ? audioDirection
        : inferredDirection;
      const audioConfidence = this.clampHudUnit(Number(
        autoplayState.audioEnemyConfidence
        ?? autoplayState.AudioEnemyConfidence
        ?? state?.audioEnemyConfidence
        ?? state?.AudioEnemyConfidence
        ?? this.autoplayAudioEnemyConfidence
        ?? 0));
      const energy = Math.max(
        left,
        right,
        Number(audio.lowEnergy ?? audio.LowEnergy ?? 0),
        Number(audio.midEnergy ?? audio.MidEnergy ?? 0),
        Number(audio.highEnergy ?? audio.HighEnergy ?? 0));
      const eventDetected = Boolean(audio.eventDetected ?? audio.EventDetected ?? this.autoplaySoundCueActive);
      const confidence = Math.max(
        audioConfidence,
        eventDetected && energy >= 0.025 ? Math.min(0.72, energy * 0.75 + Math.abs(balance) * 0.18 + 0.18) : 0);
      if (confidence < 0.22) {
        return null;
      }

      const yaw = direction === "right" ? 18 : (direction === "left" ? -18 : 0);
      return {
        active: true,
        type: "audio",
        source: "audio-balance-radar",
        yaw,
        direction,
        confidence: this.clampHudUnit(confidence),
        visualConfidence: 0,
        audioConfidence: this.clampHudUnit(confidence),
        left: direction === "right" ? 63 : (direction === "left" ? 21 : 42),
        top: 34,
        width: 21,
        height: 23
      };
    }

    createGpuAisthesisState(state, frame) {
      const debugOverlay = this.autoplayDebugOverlay
        || this.autoplayAutoplayState?.debugOverlay
        || this.autoplayAutoplayState?.DebugOverlay
        || state?.debugOverlay
        || state?.DebugOverlay
        || state?.autoplayState?.debugOverlay
        || state?.autoplayState?.DebugOverlay
        || {};
      const projected = debugOverlay.gpuAisthesis
        || debugOverlay.GpuAisthesis
        || this.autoplayAutoplayState?.gpuAisthesis
        || this.autoplayAutoplayState?.GpuAisthesis
        || state?.gpuAisthesis
        || state?.GpuAisthesis
        || null;
      if (projected && typeof projected === "object") {
        return Object.assign({}, projected, {
          enabled: Boolean((projected.enabled ?? projected.Enabled ?? true) && this.isGpuHudOverlayReady(state, null, frame))
        });
      }

      const combat = this.clampHudUnit(Number(frame?.enemyConfidence ?? this.autoplayEnemyConfidence ?? 0)) > 0.08;
      const door = Math.max(
        Number(frame?.firstDoorVision9x9Score || 0),
        Number(frame?.firstDoorVision9x9RedScore || 0),
        Number(this.autoplayUseProbeConfidence || 0)) > 0.04;
      const features = ["vision-heatmap", "edge-detect", "mask9x9-texture"];
      if (door) {
        features.push("red-panel-detect");
      }
      if (combat) {
        features.push("enemy-direction", "projectile-flow");
      }

      const kairos = state?.pipelineState?.krisis?.kairos
        || state?.pipelineState?.Krisis?.Kairos
        || this.autoplayAutoplayState?.pipelineState?.krisis?.kairos
        || this.autoplayAutoplayState?.PipelineState?.Krisis?.Kairos
        || {};
      const topology = state?.pipelineState?.noesis?.topology
        || state?.pipelineState?.Noesis?.Topology
        || this.autoplayAutoplayState?.pipelineState?.noesis?.topology
        || this.autoplayAutoplayState?.PipelineState?.Noesis?.Topology
        || {};
      const stateVector = [
        this.clampHudUnit(Number(kairos.logos ?? kairos.Logos ?? 0)),
        this.clampHudUnit(Number(kairos.pathos ?? kairos.Pathos ?? 0)),
        this.clampHudUnit(Number(kairos.ethos ?? kairos.Ethos ?? 0)),
        this.clampHudUnit(Number(this.autoplayRouteConfidence ?? state?.routeConfidence ?? 0)),
        this.clampHudUnit(Number(this.autoplayFirstDoorRouteEvidence ?? state?.firstDoorRouteEvidence ?? 0)),
        this.clampHudUnit(Number(this.autoplayUseProbeConfidence ?? state?.useProbeConfidence ?? 0)),
        this.clampHudUnit(Number(topology.wallDistanceNormalized ?? topology.WallDistanceNormalized ?? 1)),
        this.clampHudUnit(Number(topology.barrelZoneEvidence ?? topology.BarrelZoneEvidence ?? 0)),
        this.clampHudUnit((Number(topology.centerCorridorAlignment ?? topology.CenterCorridorAlignment ?? 0) + 1) / 2),
        this.clampHudUnit(combat ? 1 : 0),
        this.clampHudUnit(Math.max(Number(frame?.enemyConfidence ?? 0), Number(this.autoplayEnemyConfidence ?? 0))),
        this.clampHudUnit(Number(state?.zoeLethalRisk ?? this.autoplayZoeLethalRisk ?? 0)),
        this.clampHudUnit(Boolean(state?.lowHealth ?? this.autoplayLowHealth) ? 1 : 0),
        this.clampHudUnit(Boolean(this.autoplayLastAction?.move === "forward" || this.autoplayLastAction?.moveForward) ? 1 : 0),
        this.clampHudUnit(Math.abs(Number(this.autoplayLastAction?.yaw ?? this.autoplayLastAction?.turnYaw ?? 0)) / 32),
        this.clampHudUnit(Boolean(this.autoplayLastAction?.use || this.autoplayLastAction?.useKey) ? 1 : 0)
      ];
      const matrixValues = [5, 1, 16, stateVector.length, ...stateVector];

      return {
        contractVersion: 1,
        contractName: "DoomGpuAisthesis",
        enabled: this.isGpuHudOverlayReady(state, null, frame),
        inputTarget: RAW_FRAMEBUFFER_TARGET,
        inputFrameTarget: GPU_CONTRACTS.rawFramebufferFrameTarget("analysis"),
        hudTarget: HUD_COMPOSITE_TARGET,
        hudFrameTarget: GPU_CONTRACTS.hudCompositeFrameTarget("display"),
        captureSource: RAW_FRAMEBUFFER_WIRE_NAME,
        captureFrameTarget: GPU_CONTRACTS.rawFramebufferFrameTarget("analysis"),
        readbackPolicy: "debug-only",
        readback: {
          kind: "DebugOnly",
          wireName: "debug-only",
          allowsSummary: true,
          allowsFullReadback: true,
          debugOnly: true
        },
        frameToken: GPU_CONTRACTS.frameToken("gpu-aisthesis-js-adapter"),
        output: combat ? "vector+mask+heatmap" : "heatmap+vector",
        maskTextureEnabled: true,
        maskTextureTarget: GPU_AISTHESIS_MASK_TARGET,
        maskTexture: GPU_CONTRACTS.aisthesisMaskTextureTarget(),
        maskTextureLayout: GPU_AISTHESIS_MASK_LAYOUT,
        visionHeatmap: true,
        edgeDetect: true,
        cornerDetect: Boolean(this.autoplayCornerSignal > 0.08),
        redPanelDetect: door,
        enemyDirection: combat,
        projectileFlow: combat,
        features,
        matrixLayout: "matrix:kind,rows,columns,count,values",
        matrixBufferLayout: {
          name: "matrix",
          version: 1,
          stride: 0,
          maxItems: 0,
          maxFloats: 512,
          fields: ["kind", "rows", "columns", "count", "values"],
          summary: "matrix v1 max512"
        },
        matrixKinds: ["ctg-state"],
        matrixKindSummary: "matrices=ctg-state",
        stateVector,
        matrixValues,
        matrixCount: 1,
        matrixFloatCount: matrixValues.length,
        featureCount: features.length,
        stateVectorLayout: "state16:route,loop,door,combat,zoe,logos,pathos,ethos,topology,use",
        stateVectorBufferLayout: {
          name: "state16",
          version: 1,
          stride: 16,
          maxItems: 1,
          maxFloats: 16,
          fields: ["route", "loop", "door", "combat", "zoe", "logos", "pathos", "ethos", "topology", "use"],
          summary: "state16 v1 stride16 max1"
        }
      };
    }

    createGpuSpatialReasoningState(state, frame, gpuAisthesisState) {
      const debugOverlay = this.autoplayDebugOverlay
        || this.autoplayAutoplayState?.debugOverlay
        || this.autoplayAutoplayState?.DebugOverlay
        || state?.debugOverlay
        || state?.DebugOverlay
        || state?.autoplayState?.debugOverlay
        || state?.autoplayState?.DebugOverlay
        || {};
      const projected = debugOverlay.gpuSpatialReasoning
        || debugOverlay.GpuSpatialReasoning
        || this.autoplayAutoplayState?.gpuSpatialReasoning
        || this.autoplayAutoplayState?.GpuSpatialReasoning
        || state?.gpuSpatialReasoning
        || state?.GpuSpatialReasoning
        || null;
      if (projected && typeof projected === "object") {
        return projected;
      }

      const aisthesis = gpuAisthesisState || this.createGpuAisthesisState(state, frame);
      return {
        contractVersion: 1,
        contractName: "DoomGpuSpatialReasoning",
        enabled: Boolean(aisthesis?.enabled ?? aisthesis?.Enabled),
        inputSource: GPU_AISTHESIS_FEATURE_TARGET,
        matrixSource: GPU_AISTHESIS_MATRIX_TARGET,
        maskTextureSource: aisthesis?.maskTextureTarget || aisthesis?.MaskTextureTarget || GPU_AISTHESIS_MASK_TARGET,
        maskTexture: aisthesis?.maskTexture || aisthesis?.MaskTexture || GPU_CONTRACTS.aisthesisMaskTextureTarget(),
        maskTextureLayout: aisthesis?.maskTextureLayout || aisthesis?.MaskTextureLayout || GPU_AISTHESIS_MASK_LAYOUT,
        outputTarget: GPU_SPATIAL_OUTPUT_TARGET,
        inputFrameTarget: aisthesis?.inputFrameTarget || aisthesis?.InputFrameTarget || GPU_CONTRACTS.rawFramebufferFrameTarget("analysis"),
        hudFrameTarget: aisthesis?.hudFrameTarget || aisthesis?.HudFrameTarget || GPU_CONTRACTS.hudCompositeFrameTarget("display"),
        readbackPolicy: "runtime-summary",
        readback: {
          kind: "RuntimeSummary",
          wireName: "runtime-summary",
          allowsSummary: true,
          allowsFullReadback: false,
          debugOnly: false
        },
        frameToken: GPU_CONTRACTS.frameToken("gpu-spatial-js-adapter"),
        featureFlags: ["topos-reduce", "route-reduce", "threat-reduce", "zoe-reduce", "ctg-normalize", "mask-texture-reduce"],
        output: "summary",
        outputVectorLayout: {
          name: "spatial32",
          version: 1,
          stride: 32,
          maxItems: 1,
          maxFloats: 32,
          fields: GPU_SPATIAL_OUTPUT_FIELDS,
          summary: "spatial32 v1 stride32 max1"
        },
        outputFloatCount: 32,
        matrixCount: Number(aisthesis?.matrixCount ?? aisthesis?.MatrixCount ?? aisthesis?.matrices?.length ?? aisthesis?.Matrices?.length ?? 0) || 0,
        matrixFloatCount: Number(aisthesis?.matrixFloatCount ?? aisthesis?.MatrixFloatCount ?? aisthesis?.matrixValues?.length ?? aisthesis?.MatrixValues?.length ?? 0) || 0,
        featureCount: Number(aisthesis?.featureCount ?? aisthesis?.FeatureCount ?? aisthesis?.features?.length ?? aisthesis?.Features?.length ?? 0) || 0,
        summary: "spatial=dto-fallback mask9x9 spatial32"
      };
    }

    normalizeGpuHudDirectRect(rect) {
      if (!rect || typeof rect !== "object") {
        return null;
      }

      const left = Number(rect.left ?? rect.Left ?? 0);
      const top = Number(rect.top ?? rect.Top ?? 0);
      const width = Number(rect.width ?? rect.Width ?? 0);
      const height = Number(rect.height ?? rect.Height ?? 0);
      if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
        return null;
      }

      const color = rect.color || rect.Color || [];
      return {
        kind: String(rect.kind || rect.Kind || "diagnostic").toLowerCase(),
        left,
        top,
        width,
        height,
        score: this.clampHudUnit(Number(rect.score ?? rect.Score ?? rect.confidence ?? rect.Confidence ?? 1)),
        alpha: this.clampHudUnit(Number(rect.alpha ?? rect.Alpha ?? 0.68)),
        color: Array.isArray(color) || ArrayBuffer.isView(color)
          ? Array.from(color).slice(0, 3).map(value => this.clampHudUnit(Number(value || 0)))
          : undefined
      };
    }

    createGpuHudPanelValues(state, frame) {
      const gpuHud = this.resolveGpuHudOverlay(state);
      const projectedValues = gpuHud?.panelValues || gpuHud?.PanelValues || [];
      if (Array.isArray(projectedValues) && projectedValues.length > 0) {
        const values = projectedValues.slice(0, 16).map(value => this.clampHudUnit(Number(value || 0)));
        while (values.length < 16) {
          values.push(0);
        }
        return values;
      }

      const pipeline = this.autoplayPipelineState || {};
      const noesis = pipeline.noesis || pipeline.Noesis || {};
      const krisis = pipeline.krisis || pipeline.Krisis || {};
      const kairos = krisis.kairos || krisis.Kairos || this.autoplayKairosPriorityAxis || {};
      const kinesis = pipeline.kinesis || pipeline.Kinesis || {};
      const values = this.autoplayDebugRouteValues || {};
      const routeConfidence = this.clampHudUnit(Number(this.autoplayRouteConfidence ?? this.autoplayAutoplayState?.routeConfidence ?? values.routeConfidence ?? 0));
      const loopBudget = this.clampHudUnit(Math.max(
        Number(values.routePivotBudget || 0) > 0 ? Number(values.routePivotUsed || 0) / Number(values.routePivotBudget || 1) : 0,
        Number(values.routeSlideBudget || 0) > 0 ? Number(values.routeSlideUsed || 0) / Number(values.routeSlideBudget || 1) : 0,
        Number(values.routeBackoffBudget || 0) > 0 ? Number(values.routeBackoffUsed || 0) / Number(values.routeBackoffBudget || 1) : 0,
        values.routeLoopBudgetExceeded ? 1 : 0
      ));
      const action = this.autoplayLastAction || {};
      const actionActive = action.move && action.move !== "none" || action.turn && action.turn !== "none" || action.use || action.fire;
      const combat = this.clampHudUnit(Math.max(
        Number(frame?.enemyConfidence ?? this.autoplayEnemyConfidence ?? 0),
        Number(this.autoplayAudioEnemyConfidence || 0),
        action.fire ? 1 : 0
      ));
      const zoe = this.clampHudUnit(Math.max(
        this.autoplayPipelineState?.kinesis?.zoe?.vetoed || this.autoplayPipelineState?.Kinesis?.Zoe?.Vetoed ? 1 : 0,
        Number(this.autoplayPipelineState?.kinesis?.zoe?.lethalRisk ?? this.autoplayPipelineState?.Kinesis?.Zoe?.LethalRisk ?? 0),
        this.autoplayHealthEstimatedPercent > 0 && this.autoplayHealthEstimatedPercent < 50 ? 0.55 : 0
      ));
      return [
        this.clampHudUnit(Math.max(Number(frame?.gameplayLuma || 0), Number(frame?.blueFloorScore || 0), Number(frame?.spawnCorridorGapScore || 0))),
        this.clampHudUnit(Math.max(Number(noesis.confidenceFusion || noesis.ConfidenceFusion || 0), routeConfidence, Number(values.routeTopologyBarrelZoneEvidence || 0))),
        this.clampHudUnit(Math.max(Number(kairos.logos || kairos.Logos || 0), Number(kairos.pathos || kairos.Pathos || 0), Number(kairos.ethos || kairos.Ethos || 0))),
        this.clampHudUnit(Math.max(actionActive ? 0.72 : 0, Number(kinesis.actionRepeatFrames || kinesis.ActionRepeatFrames || 0) / 30)),
        routeConfidence,
        loopBudget,
        this.clampHudUnit(Math.max(Number(this.autoplayTargetConfidence || 0), Number(this.autoplayCornerSignal || 0), Number(this.autoplayUseProbeConfidence || 0))),
        combat,
        zoe,
        this.clampHudUnit(Number(kairos.logos || kairos.Logos || 0)),
        this.clampHudUnit(Number(kairos.pathos || kairos.Pathos || 0)),
        this.clampHudUnit(Number(kairos.ethos || kairos.Ethos || 0)),
        this.clampHudUnit(Number(values.routeTopologyWallDistanceNormalized ?? 1)),
        this.clampHudUnit(Number(values.routeTopologyBarrelZoneEvidence || 0)),
        this.clampHudUnit((Number(values.routeTopologyCenterCorridorAlignment || 0) + 1) / 2),
        this.clampHudUnit(Number(this.autoplayUseCooldown || 0) / 90)
      ];
    }

    clampHudUnit(value) {
      const number = Number(value || 0);
      if (!Number.isFinite(number)) {
        return 0;
      }

      return Math.max(0, Math.min(1, number));
    }

    smoothHudScalar(previous, target, alpha) {
      const current = Number.isFinite(previous) ? previous : target;
      return current + (target - current) * Math.max(0, Math.min(1, alpha));
    }

    createAutoplayState(indices, gpuVision) {
      const summary = self.AIKernelBonsai?.summarizeFramebuffer?.(indices, this.paletteCache?.rgbaBytes) || {
        width: WIDTH,
        height: HEIGHT,
        format: "paletted-8bit",
        zeroCopy: false
      };

      const audio = this.audioSensorEnabled
        ? this.createAuditoryRuntimeSnapshot()
        : this.createNeutralAuditoryRuntimeSnapshot();
      audio.source = this.audioSensorEnabled
        ? this.attachAudioRuntimeSource(audio)
        : {
          kind: "audio-state-buffer",
          zeroCopy: false,
          backend: "sensor-cutoff"
      };
      const motor = this.createMotorRuntimeSnapshot();
      const visualMotion = this.createVisualMotionRuntimeSnapshot(summary);
      const movement = this.createMovementRuntimeSnapshot(summary, audio, motor, visualMotion);
      const compass = this.createCompassRuntimeSnapshot(summary, motor, audio, movement, visualMotion);
      const sensors = this.createSensorStatusMap();
      this.attachSensorObservation(sensors, "visual", this.visualSensorEnabled && Boolean(indices), {
        zeroCopy: String(Boolean(gpuVision && this.autoplayVisionZeroCopy)),
        left: String(Number(summary.left || 0)),
        center: String(Number(summary.center || 0)),
        right: String(Number(summary.right || 0)),
        flowX: String(Number(visualMotion.vectorX || 0)),
        flowY: String(Number(visualMotion.vectorY || 0)),
        flowMagnitude: String(Number(visualMotion.magnitude || 0)),
        baseFlowX: String(Number(visualMotion.baseVectorX || 0)),
        baseFlowY: String(Number(visualMotion.baseVectorY || 0)),
        gridColumns: "9",
        gridRows: "9",
        cells: String(Number(summary.vision9x9Sample?.length || 0))
      });
      this.attachSensorObservation(sensors, "audio", this.audioSensorEnabled, {
        leftEnergy: String(Number(audio.leftEnergy || 0)),
        rightEnergy: String(Number(audio.rightEnergy || 0)),
        balance: String(Number(audio.balance || 0)),
        eventDetected: String(Boolean(audio.eventDetected)),
        eventType: String(audio.eventType || "none"),
        lowEnergy: String(Number(audio.lowEnergy || 0)),
        midEnergy: String(Number(audio.midEnergy || 0)),
        highEnergy: String(Number(audio.highEnergy || 0))
      });
      this.attachSensorObservation(sensors, "motor", this.motorSensorEnabled, {
        vectorX: String(Number(motor.vectorX || 0)),
        vectorY: String(Number(motor.vectorY || 0))
      });
      this.attachSensorObservation(sensors, "movement", this.movementSensorEnabled, {
        vectorX: String(Number(movement.vectorX || 0)),
        vectorY: String(Number(movement.vectorY || 0)),
        confidence: String(Number(movement.confidence || 0)),
        derived: "true"
      });
      this.attachSensorObservation(sensors, "compass", this.compassSensorEnabled, {
        heading: String(Number(compass.heading || 0)),
        confidence: String(Number(compass.confidence || 0)),
        source: String(compass.source || "unknown"),
        correctionSource: String(compass.correctionSource || "none"),
        correctionDegrees: String(Number(compass.correctionDegrees || 0)),
        landmark: String(compass.landmarkKind || compass.landmark || "none"),
        landmarkHeading: String(Number(compass.landmarkHeading || 0))
      });
      this.attachSensorObservation(sensors, "spatial", this.spatialSensorEnabled, {
        derived: "true"
      });
      this.attachSensorObservation(sensors, "health", this.healthSensorEnabled, {
        statusRegion: "health",
        faceRegion: "face"
      });

      return {
        timestamp: new Date().toISOString(),
        frame: this.frameCount,
        fps: this.fps,
        framebuffer: Object.assign({}, summary, gpuVision ? {
          renderFormat: "webgpu-texture",
          zeroCopy: this.autoplayVisionZeroCopy,
          source: gpuVision,
          visualMotion
        } : {
          zeroCopy: false,
          visualMotion
        }),
        audio,
        motor,
        movement,
        compass,
        visualMotion,
        mapHints: this.wadMapHints,
        player: {
          health: null,
          ammo: null,
          position: null,
          observed: false
        },
        runtime: {
          renderer: this.renderer,
          gpuDelegate: resolveGpuDelegateName(),
          targetFps: this.targetFps
        },
        sensors
      };
    }

    createMotorRuntimeSnapshot() {
      if (!this.motorSensorEnabled) {
        return {
          active: false,
          move: "none",
          turn: "none",
          strafe: false,
          run: false,
          use: false,
          fire: false,
          vectorX: 0,
          vectorY: 0,
          timestamp: DEFAULT_SNAPSHOT_TIMESTAMP
        };
      }

      const action = this.autoplayLastAction || {};
      const turn = action.turn === "left" ? "left" : (action.turn === "right" ? "right" : "none");
      const move = action.move === "forward" ? "forward" : (action.move === "back" ? "back" : "none");
      return {
        active: move !== "none" || turn !== "none" || Boolean(action.strafe || action.run || action.use || action.fire),
        move,
        turn,
        strafe: Boolean(action.strafe),
        run: Boolean(action.run),
        use: Boolean(action.use),
        fire: Boolean(action.fire),
        vectorX: turn === "right" ? 1 : (turn === "left" ? -1 : 0),
        vectorY: move === "forward" ? 1 : (move === "back" ? -1 : 0),
        timestamp: new Date().toISOString()
      };
    }

    createVisualMotionRuntimeSnapshot(frame) {
      if (!this.visualSensorEnabled) {
        this.previousVisionMotionGrid = null;
        this.previousVisionMotionBaseGrid = null;
        this.previousWallPatternMotionGrid = null;
        this.previousWallPatternMotionBaseGrid = null;
        this.previousVisionMotionSignature = "";
        this.lastVisualMotionVector = {
          active: false,
          vectorX: 0,
          vectorY: 0,
          magnitude: 0,
          confidence: 0,
          baseVectorX: 0,
          baseVectorY: 0,
          baseMagnitude: 0,
          wallPatternVectorX: 0,
          wallPatternVectorY: 0,
          wallPatternMagnitude: 0,
          baseWallPatternVectorX: 0,
          baseWallPatternVectorY: 0,
          baseWallPatternMagnitude: 0,
          signature: "",
          baseSignature: "",
          source: "sensor-cutoff",
          timestamp: DEFAULT_SNAPSHOT_TIMESTAMP
        };
        return this.lastVisualMotionVector;
      }

      const detail = Array.isArray(frame?.vision9x9Sample) && frame.vision9x9Sample.length > 0
        ? frame.vision9x9Sample
        : [];
      const base = Array.isArray(frame?.region9Sample) && frame.region9Sample.length > 0
        ? frame.region9Sample
        : [];
      const detailMask = this.createDynamicMotionMask(frame, 9, 9);
      const baseMask = this.createDynamicMotionMask(frame, 3, 3);
      const staticDetail = this.applyMotionMask(detail, detailMask, 9, 9, this.previousVisionMotionGrid);
      const staticBase = this.applyMotionMask(base, baseMask, 3, 3, this.previousVisionMotionBaseGrid);
      const detailEdge = this.createGridEdgeMap(staticDetail, 9, 9);
      const baseEdge = this.createGridEdgeMap(staticBase, 3, 3);
      const detailFlow = this.estimateGridVisualFlow(this.previousVisionMotionGrid, staticDetail, 9, 9);
      const baseFlow = this.estimateGridVisualFlow(this.previousVisionMotionBaseGrid, staticBase, 3, 3);
      const wallPatternFlow = this.estimateGridVisualFlow(this.previousWallPatternMotionGrid, detailEdge, 9, 9);
      const baseWallPatternFlow = this.estimateGridVisualFlow(this.previousWallPatternMotionBaseGrid, baseEdge, 3, 3);
      const signature = this.gridSignature(detail);
      const baseSignature = this.gridSignature(base);
      this.previousVisionMotionGrid = staticDetail.slice(0);
      this.previousVisionMotionBaseGrid = staticBase.slice(0);
      this.previousWallPatternMotionGrid = detailEdge.slice(0);
      this.previousWallPatternMotionBaseGrid = baseEdge.slice(0);
      this.previousVisionMotionSignature = signature;
      this.lastVisualMotionVector = {
        active: detailFlow.magnitude >= 0.02 || baseFlow.magnitude >= 0.02 || wallPatternFlow.magnitude >= 0.02 || baseWallPatternFlow.magnitude >= 0.02,
        vectorX: this.round2(detailFlow.vectorX),
        vectorY: this.round2(detailFlow.vectorY),
        magnitude: this.round2(detailFlow.magnitude),
        confidence: this.round2(Math.max(0, Math.min(1, Math.max(detailFlow.magnitude, baseFlow.magnitude, wallPatternFlow.magnitude, baseWallPatternFlow.magnitude) * 1.4))),
        baseVectorX: this.round2(baseFlow.vectorX),
        baseVectorY: this.round2(baseFlow.vectorY),
        baseMagnitude: this.round2(baseFlow.magnitude),
        wallPatternVectorX: this.round2(wallPatternFlow.vectorX),
        wallPatternVectorY: this.round2(wallPatternFlow.vectorY),
        wallPatternMagnitude: this.round2(wallPatternFlow.magnitude),
        baseWallPatternVectorX: this.round2(baseWallPatternFlow.vectorX),
        baseWallPatternVectorY: this.round2(baseWallPatternFlow.vectorY),
        baseWallPatternMagnitude: this.round2(baseWallPatternFlow.magnitude),
        dynamicMaskCells: this.countMotionMaskCells(detailMask),
        baseDynamicMaskCells: this.countMotionMaskCells(baseMask),
        direction: Math.abs(detailFlow.vectorX) >= Math.max(0.08, Math.abs(detailFlow.vectorY) * 0.75)
          ? (detailFlow.vectorX > 0 ? "right" : "left")
          : "center",
        signature,
        baseSignature,
        source: "visual-buffer-difference",
        timestamp: new Date().toISOString()
      };
      return this.lastVisualMotionVector;
    }

    createDynamicMotionMask(frame, columns, rows) {
      const width = Math.max(1, Number(columns || 1));
      const height = Math.max(1, Number(rows || 1));
      const totalCells = width * height;
      const mask = new Array(totalCells).fill(false);
      const threshold = 0.12;
      if (width === 9 && height === 9) {
        this.addMaskValues(mask, frame?.projectileVision9x9Sample, width, height, threshold);
        this.addRegion9Mask(mask, frame?.projectileRegion9Sample, width, height, threshold);
        this.addRegion9Mask(mask, frame?.enemyRegion9Sample, width, height, threshold);
      } else if (width === 3 && height === 3) {
        this.addMaskValues(mask, frame?.projectileRegion9Sample, width, height, threshold);
        this.addMaskValues(mask, frame?.enemyRegion9Sample, width, height, threshold);
      }

      return this.dilateMotionMask(mask, width, height);
    }

    addMaskValues(mask, values, columns, rows, threshold) {
      if (!Array.isArray(mask) || !Array.isArray(values)) {
        return;
      }

      const totalCells = Math.min(mask.length, Math.max(1, Number(columns || 1)) * Math.max(1, Number(rows || 1)), values.length);
      for (let index = 0; index < totalCells; index += 1) {
        if (Number(values[index] || 0) >= threshold) {
          mask[index] = true;
        }
      }
    }

    addRegion9Mask(mask, regionValues, columns, rows, threshold) {
      if (!Array.isArray(mask) || !Array.isArray(regionValues) || regionValues.length < 9) {
        return;
      }

      const width = Math.max(1, Number(columns || 1));
      const height = Math.max(1, Number(rows || 1));
      for (let regionRow = 0; regionRow < 3; regionRow += 1) {
        for (let regionColumn = 0; regionColumn < 3; regionColumn += 1) {
          const regionIndex = regionRow * 3 + regionColumn;
          if (Number(regionValues[regionIndex] || 0) < threshold) {
            continue;
          }

          const startY = Math.floor(regionRow * height / 3);
          const endY = Math.max(startY + 1, Math.floor((regionRow + 1) * height / 3));
          const startX = Math.floor(regionColumn * width / 3);
          const endX = Math.max(startX + 1, Math.floor((regionColumn + 1) * width / 3));
          for (let y = startY; y < Math.min(height, endY); y += 1) {
            for (let x = startX; x < Math.min(width, endX); x += 1) {
              mask[y * width + x] = true;
            }
          }
        }
      }
    }

    dilateMotionMask(mask, columns, rows) {
      const width = Math.max(1, Number(columns || 1));
      const height = Math.max(1, Number(rows || 1));
      const totalCells = width * height;
      if (!Array.isArray(mask) || mask.length < totalCells) {
        return new Array(totalCells).fill(false);
      }

      const next = mask.slice(0, totalCells);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const index = y * width + x;
          if (!mask[index]) {
            continue;
          }

          for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy += 1) {
            for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx += 1) {
              next[yy * width + xx] = true;
            }
          }
        }
      }

      return next;
    }

    applyMotionMask(values, mask, columns, rows, previousValues) {
      const width = Math.max(1, Number(columns || 1));
      const height = Math.max(1, Number(rows || 1));
      const totalCells = width * height;
      const next = new Array(totalCells).fill(0);
      for (let index = 0; index < totalCells; index += 1) {
        if (Array.isArray(mask) && mask[index]) {
          next[index] = Array.isArray(previousValues) && previousValues.length > index
            ? Number(previousValues[index] || 0)
            : 0;
        } else {
          next[index] = Array.isArray(values) && values.length > index
            ? Number(values[index] || 0)
            : 0;
        }
      }

      return next;
    }

    countMotionMaskCells(mask) {
      if (!Array.isArray(mask)) {
        return 0;
      }

      let count = 0;
      for (let index = 0; index < mask.length; index += 1) {
        if (mask[index]) {
          count += 1;
        }
      }

      return count;
    }

    estimateGridVisualFlow(previous, current, columns, rows) {
      const width = Math.max(1, Number(columns || 1));
      const height = Math.max(1, Number(rows || 1));
      const totalCells = width * height;
      if (!Array.isArray(previous) || !Array.isArray(current) || previous.length < totalCells || current.length < totalCells) {
        return {
          vectorX: 0,
          vectorY: 0,
          magnitude: 0
        };
      }

      let zeroError = 0;
      for (let row = 0; row < height; row += 1) {
        for (let column = 0; column < width; column += 1) {
          const index = row * width + column;
          zeroError += Math.abs(Number(current[index] || 0) - Number(previous[index] || 0));
        }
      }

      if (zeroError <= 0.001) {
        return {
          vectorX: 0,
          vectorY: 0,
          magnitude: 0
        };
      }

      const maxShift = width >= 6 && height >= 6 ? 2 : 1;
      let bestDx = 0;
      let bestDy = 0;
      let bestError = Number.POSITIVE_INFINITY;
      let bestSamples = 0;
      for (let dy = -maxShift; dy <= maxShift; dy += 1) {
        for (let dx = -maxShift; dx <= maxShift; dx += 1) {
          let error = 0;
          let samples = 0;
          for (let row = 0; row < height; row += 1) {
            const shiftedRow = row + dy;
            if (shiftedRow < 0 || shiftedRow >= height) {
              continue;
            }

            for (let column = 0; column < width; column += 1) {
              const shiftedColumn = column + dx;
              if (shiftedColumn < 0 || shiftedColumn >= width) {
                continue;
              }

              const previousIndex = row * width + column;
              const currentIndex = shiftedRow * width + shiftedColumn;
              error += Math.abs(Number(current[currentIndex] || 0) - Number(previous[previousIndex] || 0));
              samples += 1;
            }
          }

          if (samples > 0) {
            const normalizedError = error / samples;
            if (normalizedError < bestError) {
              bestError = normalizedError;
              bestDx = dx;
              bestDy = dy;
              bestSamples = samples;
            }
          }
        }
      }

      if (bestSamples <= 0 || !Number.isFinite(bestError)) {
        return {
          vectorX: 0,
          vectorY: 0,
          magnitude: 0
        };
      }

      const zeroNormalizedError = zeroError / totalCells;
      const improvement = Math.max(0, zeroNormalizedError - bestError) / Math.max(1, zeroNormalizedError);
      const changeMagnitude = Math.max(0, Math.min(1, zeroError / (totalCells * 255)));
      const strength = Math.max(changeMagnitude, Math.min(1, improvement * 2.2));
      if (strength <= 0.015 || (bestDx === 0 && bestDy === 0)) {
        return {
          vectorX: 0,
          vectorY: 0,
          magnitude: changeMagnitude
        };
      }

      const vectorX = Math.max(-1, Math.min(1, (-bestDx / maxShift) * strength));
      const vectorY = Math.max(-1, Math.min(1, (-bestDy / maxShift) * strength));
      return {
        vectorX,
        vectorY,
        magnitude: Math.max(0, Math.min(1, Math.max(strength, changeMagnitude)))
      };
    }

    createGridEdgeMap(values, columns, rows) {
      const width = Math.max(1, Number(columns || 1));
      const height = Math.max(1, Number(rows || 1));
      const totalCells = width * height;
      const edge = new Array(totalCells).fill(0);
      if (!Array.isArray(values) || values.length < totalCells) {
        return edge;
      }

      for (let row = 0; row < height; row += 1) {
        for (let column = 0; column < width; column += 1) {
          const index = row * width + column;
          const center = Number(values[index] || 0);
          const left = column > 0 ? Number(values[index - 1] || 0) : center;
          const right = column + 1 < width ? Number(values[index + 1] || 0) : center;
          const above = row > 0 ? Number(values[index - width] || 0) : center;
          const below = row + 1 < height ? Number(values[index + width] || 0) : center;
          edge[index] = Math.max(0, Math.min(255, Math.abs(right - left) + Math.abs(below - above)));
        }
      }

      return edge;
    }

    gridSignature(values) {
      if (!Array.isArray(values) || values.length === 0) {
        return "";
      }

      let signature = "";
      const length = Math.min(values.length, 81);
      for (let index = 0; index < length; index += 1) {
        const bucket = Math.max(0, Math.min(15, Math.round(Number(values[index] || 0) / 17)));
        signature += bucket.toString(16);
      }

      return signature;
    }

    round2(value) {
      return Math.round((Number(value) || 0) * 100) / 100;
    }

    createMovementRuntimeSnapshot(frame, audio, motor, visualMotion) {
      if (!this.movementSensorEnabled) {
        return {
          active: false,
          vectorX: 0,
          vectorY: 0,
          speed: 0,
          confidence: 0,
          source: "sensor-cutoff",
          timestamp: DEFAULT_SNAPSHOT_TIMESTAMP
        };
      }

      const left = Number(frame?.left || 0);
      const right = Number(frame?.right || 0);
      const center = Number(frame?.center || 0);
      const visualBias = this.visualSensorEnabled
        ? Math.max(-1, Math.min(1, (right - left) / Math.max(1, left + right + center)))
        : 0;
      const audioBias = this.audioSensorEnabled
        ? Math.max(-1, Math.min(1, Number(audio?.balance || 0)))
        : 0;
      const motorX = this.motorSensorEnabled ? Math.max(-1, Math.min(1, Number(motor?.vectorX || 0))) : 0;
      const motorY = this.motorSensorEnabled ? Math.max(-1, Math.min(1, Number(motor?.vectorY || 0))) : 0;
      const visualFlowX = this.visualSensorEnabled ? Math.max(-1, Math.min(1, Number(visualMotion?.vectorX || 0))) : 0;
      const visualFlowMagnitude = this.visualSensorEnabled ? Math.max(0, Math.min(1, Number(visualMotion?.magnitude || 0))) : 0;
      const baseFlowMagnitude = this.visualSensorEnabled ? Math.max(0, Math.min(1, Number(visualMotion?.baseMagnitude || 0))) : 0;
      const vectorX = Math.max(-1, Math.min(1, (visualBias * 0.24) + (visualFlowX * 0.24) + (audioBias * 0.28) + (motorX * 0.24)));
      const vectorY = Math.max(-1, Math.min(1, motorY * 0.62 + (visualFlowMagnitude >= 0.04 ? Number(visualMotion?.vectorY || 0) * 0.18 : 0) + (baseFlowMagnitude >= 0.04 ? Number(visualMotion?.baseVectorY || 0) * 0.12 : 0) + (Number(frame?.depthEstimate || 1) >= 0.7 ? 0.08 : -0.12)));
      const speed = Math.max(0, Math.min(1, Math.sqrt((vectorX * vectorX) + (vectorY * vectorY))));
      const confidence = Math.max(0, Math.min(1, Math.max(Math.abs(vectorX), Math.abs(vectorY), visualFlowMagnitude * 1.4, baseFlowMagnitude, Number(frame?.footObstacleScore || 0))));
      return {
        active: Boolean(motor?.active) || confidence >= 0.18,
        vectorX: Math.round(vectorX * 100) / 100,
        vectorY: Math.round(vectorY * 100) / 100,
        speed: Math.round(speed * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        source: "visual-audio-motor-fusion",
        timestamp: new Date().toISOString()
      };
    }

    createCompassRuntimeSnapshot(frame, motor, audio, movement, visualMotion) {
      if (!this.compassSensorEnabled) {
        return {
          active: false,
          heading: this.compassHeading,
          origin: "N=0deg",
          baseHeading: this.compassHeading,
          visualBias: 0,
          motorBias: 0,
          visualBiasDelta: 0,
          visualFlowDelta: 0,
          baseFlowDelta: 0,
          motorDelta: 0,
          audioDelta: 0,
          movementDelta: 0,
          landmarkDelta: 0,
          correctionDegrees: 0,
          correctionSource: "sensor-cutoff",
          headingUsable: false,
          headingUncertain: true,
          headingReliability: "sensor-cutoff",
          useCompassForRouting: false,
          confidence: 0,
          source: "sensor-cutoff",
          timestamp: DEFAULT_SNAPSHOT_TIMESTAMP
        };
      }

      const baseHeading = this.normalizeCompassHeading(this.compassHeading);
      const left = Number(frame?.left || 0);
      const right = Number(frame?.right || 0);
      const center = Number(frame?.center || 0);
      const visualDenominator = Math.max(1, left + right + center);
      const visualBias = this.visualSensorEnabled
        ? Math.max(-1, Math.min(1, (right - left) / visualDenominator))
        : 0;
      const visualFlowBias = this.visualSensorEnabled
        ? Math.max(-1, Math.min(1, Number(visualMotion?.vectorX || 0)))
        : 0;
      const visualFlowMagnitude = this.visualSensorEnabled
        ? Math.max(0, Math.min(1, Number(visualMotion?.magnitude || 0)))
        : 0;
      const baseFlowBias = this.visualSensorEnabled
        ? Math.max(-1, Math.min(1, Number(visualMotion?.baseVectorX || 0)))
        : 0;
      const baseFlowMagnitude = this.visualSensorEnabled
        ? Math.max(0, Math.min(1, Number(visualMotion?.baseMagnitude || 0)))
        : 0;
      const wallPatternBias = this.visualSensorEnabled
        ? Math.max(-1, Math.min(1, Number(visualMotion?.wallPatternVectorX || 0)))
        : 0;
      const wallPatternMagnitude = this.visualSensorEnabled
        ? Math.max(0, Math.min(1, Number(visualMotion?.wallPatternMagnitude || 0)))
        : 0;
      const baseWallPatternBias = this.visualSensorEnabled
        ? Math.max(-1, Math.min(1, Number(visualMotion?.baseWallPatternVectorX || 0)))
        : 0;
      const baseWallPatternMagnitude = this.visualSensorEnabled
        ? Math.max(0, Math.min(1, Number(visualMotion?.baseWallPatternMagnitude || 0)))
        : 0;
      const semanticLandmark = this.resolveCompassSemanticLandmark(frame, visualMotion);
      const wallOnlyView = this.isCompassWallOnlyView(frame, visualMotion, motor);
      const corridorOnlyView = !semanticLandmark && !wallOnlyView && this.isCompassAmbiguousCorridorView(frame, visualMotion, motor);
      const motorBias = this.motorSensorEnabled
        ? Math.max(-1, Math.min(1, Number(motor?.vectorX || 0) * 0.42))
        : 0;
      const audioBias = this.audioSensorEnabled
        ? Math.max(-1, Math.min(1, Number(audio?.balance || 0)))
        : 0;
      const movementBias = this.movementSensorEnabled
        ? Math.max(-1, Math.min(1, Number(movement?.vectorX || 0)))
        : 0;
      const supervisorStatus = typeof this.bonsaiSupervisor?.status === "function"
        ? this.bonsaiSupervisor.status()
        : null;
      const healthRetry = Boolean(this.autoplayHealthSensor?.retryRequested || supervisorStatus?.healthSensor?.retryRequested || supervisorStatus?.healthLikelyDead);
      const contextResetActive = Number(supervisorStatus?.semanticContextResetFrames || 0) > 0;
      const combatSurveyActive = Number(supervisorStatus?.combatSurveyFrames || 0) > 0;
      const wallFollowActive = Number(supervisorStatus?.wallFollowFrames || 0) > 0
        || String(supervisorStatus?.safetyReason || "").indexOf("wall-follow") >= 0;
      const wallPatternObservation = Math.max(wallPatternMagnitude, baseWallPatternMagnitude);
      const visualObservation = Math.max(visualFlowMagnitude, baseFlowMagnitude, wallPatternObservation, Math.abs(visualBias) * 0.24);
      const audioObservation = Math.abs(audioBias) >= 0.18 && Math.max(Number(audio?.leftEnergy || 0), Number(audio?.rightEnergy || 0)) >= 0.04;
      const movementObservation = Math.abs(movementBias) >= 0.12 && Number(movement?.confidence || 0) >= 0.18;
      const motorObservation = Math.abs(motorBias) >= 0.12 && (visualObservation >= 0.015 || wallOnlyView || corridorOnlyView);
      const evidence = Math.max(
        Math.abs(visualBias) * 0.35,
        visualFlowMagnitude * 1.65,
        baseFlowMagnitude * 1.25,
        wallPatternObservation * 1.2,
        audioObservation ? Math.abs(audioBias) * 0.8 : 0,
        movementObservation ? Math.abs(movementBias) : 0,
        motorObservation ? Math.abs(motorBias) * 0.65 : 0);
      const frozen = healthRetry || evidence < 0.04 || (!visualObservation && !audioObservation && !movementObservation);
      const edgeLandmark = semanticLandmark || wallOnlyView || corridorOnlyView ? null : this.resolveCompassOrthogonalEdgeLandmark(frame, visualMotion, baseHeading, motor);
      const learnedLandmark = semanticLandmark || edgeLandmark || wallOnlyView || corridorOnlyView ? null : this.resolveCompassLandmark(frame, visualMotion);
      const landmark = semanticLandmark || edgeLandmark || learnedLandmark;
      const visualBiasDelta = visualBias * 2.1;
      const visualFlowDelta = visualFlowBias * 5.4;
      const baseFlowDelta = baseFlowBias * 3.2;
      const wallFlowDeltaRaw = (wallPatternBias * 5.8) + (baseWallPatternBias * 3.6);
      const motorDelta = motorObservation ? motorBias * (wallOnlyView || corridorOnlyView ? 6.8 : 3.1) : 0;
      const audioDelta = audioObservation ? audioBias * 2.8 : 0;
      const movementDelta = movementObservation ? movementBias * 3.6 : 0;
      const wallFlowDelta = this.resolveCompassFlowDelta(motorDelta, wallFlowDeltaRaw, wallOnlyView ? 1.45 : 0.6);
      const landmarkDelta = landmark
        ? Math.max(-1, Math.min(1, (this.signedCompassDelta(baseHeading, landmark.heading) / 45) * landmark.confidence))
        : 0;
      let appliedDelta = 0;
      if (!frozen) {
        if (semanticLandmark?.forced) {
          this.compassHeading = this.normalizeCompassHeading(semanticLandmark.heading);
        } else if (wallOnlyView || corridorOnlyView) {
          const flowLimit = wallOnlyView ? 0.65 : 0.42;
          const flowDelta = this.resolveCompassFlowDelta(motorDelta, visualFlowDelta + baseFlowDelta, flowLimit);
          const inertialDelta = motorDelta + flowDelta + wallFlowDelta + (movementDelta * 0.18);
          this.compassHeading = this.normalizeCompassHeading(baseHeading + inertialDelta);
        } else if (edgeLandmark) {
          const motorHeading = this.normalizeCompassHeading(baseHeading + motorDelta + movementDelta);
          const visualFlowHeading = this.normalizeCompassHeading(baseHeading + visualBiasDelta + visualFlowDelta + baseFlowDelta + wallFlowDelta);
          const edgeSnapHeading = this.normalizeCompassHeading(edgeLandmark.heading);
          const edgeStrength = Math.max(0, Math.min(1, Number(edgeLandmark.confidence || 0) / 0.42));
          const edgeWeight = wallOnlyView ? 0 : 0.2 * edgeStrength;
          this.compassHeading = this.blendCompassHeadings([
            { heading: motorHeading, weight: 0.5 },
            { heading: visualFlowHeading, weight: 0.3 },
            { heading: this.normalizeCompassHeading(baseHeading + wallFlowDelta), weight: Math.min(0.18, wallPatternObservation * 0.22) },
            { heading: edgeSnapHeading, weight: edgeWeight }
          ], baseHeading);
        } else {
          const delta = visualBiasDelta
            + visualFlowDelta
            + baseFlowDelta
            + wallFlowDelta
            + motorDelta
            + audioDelta
            + movementDelta
            + landmarkDelta;
          this.compassHeading = this.normalizeCompassHeading(baseHeading + delta);
        }
        appliedDelta = this.signedCompassDelta(baseHeading, this.compassHeading);
        if (!wallOnlyView && !corridorOnlyView) {
          this.learnCompassLandmark(frame, visualMotion, this.compassHeading);
        }
      }
      const correctionSource = frozen
        ? (healthRetry ? "health-freeze" : "evidence-hold")
        : (semanticLandmark?.forced
          ? `visual-landmark-force:${semanticLandmark.kind}`
          : (semanticLandmark
            ? `visual-landmark:${semanticLandmark.kind}`
            : (wallOnlyView
              ? "motor-dead-reckoning:wall-only-view"
              : (corridorOnlyView
                ? "motor-dead-reckoning:ambiguous-corridor"
              : (edgeLandmark
              ? `visual-edge:${edgeLandmark.kind}`
              : (learnedLandmark ? "learned-visual-signature" : "relative-sensor-fusion"))))));
      const compassConfidence = frozen ? 0 : Math.max(0, Math.min(1, Math.abs(visualBias) * 0.16 + visualFlowMagnitude * 0.28 + baseFlowMagnitude * 0.22 + (motorObservation ? Math.abs(motorBias) * 0.1 : 0) + (audioObservation ? Math.abs(audioBias) * 0.12 : 0) + (movementObservation ? Math.abs(movementBias) * 0.14 : 0) + (landmark ? Number(landmark.confidence || 0) * 0.2 : 0)));
      const headingUsable = !frozen
        && !contextResetActive
        && !combatSurveyActive
        && !wallFollowActive
        && !wallOnlyView
        && !corridorOnlyView
        && (Boolean(semanticLandmark) || Boolean(edgeLandmark) || Boolean(learnedLandmark) || compassConfidence >= 0.24);
      const headingReliability = headingUsable
        ? (semanticLandmark?.forced ? "absolute-forced-landmark" : (landmark ? "absolute-landmark" : "relative-stable"))
        : (contextResetActive
          ? "context-reset"
          : (combatSurveyActive
            ? "combat-survey"
          : (wallFollowActive
            ? "wall-follow"
            : (frozen
              ? (healthRetry ? "health-freeze" : "low-evidence")
              : (wallOnlyView
                ? "wall-unobservable"
                : (corridorOnlyView ? "corridor-ambiguous" : "relative-uncertain"))))));
      return {
        active: !frozen && (this.visualSensorEnabled || this.motorSensorEnabled || this.audioSensorEnabled || this.movementSensorEnabled),
        heading: Math.round(this.normalizeCompassHeading(this.compassHeading) * 100) / 100,
        origin: "N=0deg",
        baseHeading: Math.round(baseHeading * 100) / 100,
        visualBias: Math.round(visualBias * 100) / 100,
        visualFlowBias: Math.round(visualFlowBias * 100) / 100,
        baseFlowBias: Math.round(baseFlowBias * 100) / 100,
        motorBias: Math.round(motorBias * 100) / 100,
        audioBias: Math.round(audioBias * 100) / 100,
        movementBias: Math.round(movementBias * 100) / 100,
        visualBiasDelta: Math.round(visualBiasDelta * 100) / 100,
        visualFlowDelta: Math.round(visualFlowDelta * 100) / 100,
        baseFlowDelta: Math.round(baseFlowDelta * 100) / 100,
        motorDelta: Math.round(motorDelta * 100) / 100,
        audioDelta: Math.round(audioDelta * 100) / 100,
        movementDelta: Math.round(movementDelta * 100) / 100,
        wallFlowDelta: Math.round(wallFlowDelta * 100) / 100,
        wallPatternBias: Math.round(wallPatternBias * 100) / 100,
        wallPatternMagnitude: Math.round(wallPatternMagnitude * 100) / 100,
        baseWallPatternBias: Math.round(baseWallPatternBias * 100) / 100,
        baseWallPatternMagnitude: Math.round(baseWallPatternMagnitude * 100) / 100,
        landmarkDelta: Math.round(landmarkDelta * 100) / 100,
        motorHeading: edgeLandmark ? Math.round(this.normalizeCompassHeading(baseHeading + motorDelta + movementDelta) * 100) / 100 : null,
        visualFlowHeading: edgeLandmark ? Math.round(this.normalizeCompassHeading(baseHeading + visualBiasDelta + visualFlowDelta + baseFlowDelta + wallFlowDelta) * 100) / 100 : null,
        rotationInstructionDelta: Math.round(motorDelta * 100) / 100,
        frameBufferVectorDelta: Math.round((visualFlowDelta + baseFlowDelta) * 100) / 100,
        edgeSnapDelta: edgeLandmark ? Math.round(landmarkDelta * 100) / 100 : 0,
        edgeSnapHeading: edgeLandmark ? Math.round(this.normalizeCompassHeading(edgeLandmark.heading) * 100) / 100 : null,
        edgeSnapConfidence: edgeLandmark ? Math.round(Number(edgeLandmark.confidence || 0) * 100) / 100 : 0,
        edgeSnapWeight: edgeLandmark ? Math.round((0.2 * Math.max(0, Math.min(1, Number(edgeLandmark.confidence || 0) / 0.42))) * 100) / 100 : 0,
        wallOnlyView,
        corridorOnlyView,
        correctionDegrees: Math.round(appliedDelta * 100) / 100,
        correctionSource,
        landmark: landmark ? (landmark.signature || landmark.kind || "") : "",
        landmarkKind: landmark?.kind || (learnedLandmark ? "learned-signature" : ""),
        landmarkLabel: landmark?.label || "",
        landmarkHeading: landmark ? Math.round(this.normalizeCompassHeading(landmark.heading) * 100) / 100 : null,
        landmarkConfidence: landmark ? Math.round(Math.max(0, Math.min(1, Number(landmark.confidence || 0))) * 100) / 100 : 0,
        landmarkForced: Boolean(semanticLandmark?.forced),
        evidence: Math.round(evidence * 100) / 100,
        confidence: compassConfidence,
        headingUsable,
        headingUncertain: !headingUsable,
        headingReliability,
        useCompassForRouting: headingUsable,
        contextResetActive,
        combatSurveyActive,
        wallFollowActive,
        source: frozen ? (healthRetry ? "health-freeze" : "evidence-hold") : "visual-flow-audio-movement-relative",
        timestamp: new Date().toISOString()
      };
    }

    normalizeCompassHeading(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        return 0;
      }

      return ((number % 360) + 360) % 360;
    }

    signedCompassDelta(fromHeading, toHeading) {
      return ((this.normalizeCompassHeading(toHeading) - this.normalizeCompassHeading(fromHeading) + 540) % 360) - 180;
    }

    resolveCompassFlowDelta(motorDelta, flowDelta, limit) {
      const boundedLimit = Math.max(0.1, Math.min(2.4, Number(limit || 1)));
      const motor = Number(motorDelta || 0);
      const flow = Math.max(-boundedLimit, Math.min(boundedLimit, Number(flowDelta || 0)));
      if (Math.abs(motor) >= 0.35 && Math.abs(flow) >= 0.25 && Math.sign(motor) !== Math.sign(flow)) {
        return flow * 0.18;
      }

      return flow;
    }

    blendCompassHeadings(candidates, fallbackHeading) {
      let x = 0;
      let y = 0;
      let weightTotal = 0;
      for (let index = 0; index < candidates.length; index += 1) {
        const item = candidates[index] || {};
        const weight = Math.max(0, Number(item.weight || 0));
        if (weight <= 0) {
          continue;
        }

        const radians = this.normalizeCompassHeading(item.heading) * Math.PI / 180;
        x += Math.cos(radians) * weight;
        y += Math.sin(radians) * weight;
        weightTotal += weight;
      }

      if (weightTotal <= 0 || (Math.abs(x) <= 0.00001 && Math.abs(y) <= 0.00001)) {
        return this.normalizeCompassHeading(fallbackHeading);
      }

      return this.normalizeCompassHeading(Math.atan2(y, x) * 180 / Math.PI);
    }

    isCompassWallOnlyView(frame, visualMotion, motor) {
      const depth = Math.max(0, Math.min(1, Number(frame?.depthEstimate ?? 1)));
      const courtyardScore = Math.max(0, Math.min(1, Number(frame?.courtyardScore || 0)));
      const computerScore = Math.max(0, Math.min(1, Number(frame?.computerRoomScore || 0)));
      const doorScore = Math.max(0, Math.min(1, Number(frame?.firstDoorVision9x9Score || 0)));
      const doorKind = String(frame?.firstDoorVision9x9Box?.kind || "");
      const semanticVisible = courtyardScore >= 0.44
        || computerScore >= 0.52
        || (doorScore >= 0.5 && doorKind === "first-door-9x9-patch");
      if (semanticVisible) {
        return false;
      }

      const wallCandidate = doorKind.includes("wall")
        || doorKind.includes("floor")
        || doorKind.includes("dark-panel")
        || Number(frame?.footObstacleScore || 0) >= 0.32
        || Number(frame?.cornerSignal || 0) >= 0.42;
      const wallFlow = Math.max(
        Math.abs(Number(visualMotion?.wallPatternVectorX || 0)),
        Math.abs(Number(visualMotion?.baseWallPatternVectorX || 0)));
      const wallFlowMagnitude = Math.max(
        Number(visualMotion?.wallPatternMagnitude || 0),
        Number(visualMotion?.baseWallPatternMagnitude || 0));
      const rotationIntent = Math.abs(Number(motor?.vectorX || 0));
      return wallCandidate
        && (depth <= 0.9 || rotationIntent >= 0.4 || wallFlow >= 0.04 || wallFlowMagnitude >= 0.03);
    }

    isCompassAmbiguousCorridorView(frame, visualMotion, motor) {
      const spawnGapScore = Math.max(0, Math.min(1, Number(frame?.spawnCorridorGapScore || 0)));
      const corridorSignature = Math.max(0, Math.min(1, Number(frame?.firstDoorCorridorSignature || 0)));
      const left = Number(frame?.left || 0);
      const right = Number(frame?.right || 0);
      const center = Number(frame?.center || 0);
      const denominator = Math.max(1, left + right + center);
      const symmetry = 1 - Math.min(1, Math.abs(left - right) / denominator);
      const wallFlowMagnitude = Math.max(
        Number(visualMotion?.wallPatternMagnitude || 0),
        Number(visualMotion?.baseWallPatternMagnitude || 0));
      const rotationIntent = Math.abs(Number(motor?.vectorX || 0));
      const doorKind = String(frame?.firstDoorVision9x9Box?.kind || "");
      const falseDoorCandidate = doorKind.includes("wall") || doorKind.includes("floor") || doorKind.includes("dark-panel");
      return symmetry >= 0.74
        && (spawnGapScore >= 0.38 || corridorSignature >= 0.58 || falseDoorCandidate)
        && (rotationIntent >= 0.32 || wallFlowMagnitude >= 0.025 || Number(frame?.depthEstimate ?? 1) <= 0.92);
    }

    resolveCompassSemanticLandmark(frame, visualMotion) {
      const courtyardScore = Math.max(0, Math.min(1, Number(frame?.courtyardScore || 0)));
      const courtyardTurn = frame?.courtyardTurn === "left" || frame?.courtyardTurn === "right"
        ? frame.courtyardTurn
        : "none";
      if (courtyardScore >= 0.52 && courtyardTurn === "none") {
        return {
          kind: "courtyard-facing-east",
          label: "Courtyard E",
          heading: 90,
          confidence: Math.max(0.72, Math.min(1, courtyardScore)),
          forced: true
        };
      }

      if (courtyardScore >= 0.44) {
        return {
          kind: `courtyard-${courtyardTurn || "offset"}`,
          label: "Courtyard",
          heading: 90,
          confidence: Math.max(0.42, Math.min(0.72, courtyardScore * 0.85)),
          forced: false
        };
      }

      const doorBox = frame?.firstDoorVision9x9Box || null;
      const doorKind = String(doorBox?.kind || "");
      const doorScore = Math.max(0, Math.min(1, Number(frame?.firstDoorVision9x9Score || 0)));
      const doorColumn = Number(doorBox?.column);
      const doorCentered = Number.isFinite(doorColumn) && doorColumn >= 3 && doorColumn <= 4;
      const doorLandmark = doorKind === "first-door-9x9-patch" || doorKind === "first-door-dark-panel";
      if (doorLandmark && doorCentered && doorScore >= 0.48) {
        return {
          kind: "first-door-facing-north",
          label: "FirstDoor N",
          heading: 0,
          confidence: Math.max(0.44, Math.min(0.76, doorScore * 0.9)),
          forced: false
        };
      }

      const baseSignature = String(visualMotion?.baseSignature || frame?.region9Signature || "");
      const spawnGapScore = Math.max(0, Math.min(1, Number(frame?.spawnCorridorGapScore || 0)));
      const spawnGapTurn = frame?.spawnCorridorGapTurn === "left" || frame?.spawnCorridorGapTurn === "right"
        ? frame.spawnCorridorGapTurn
        : "none";
      if (spawnGapScore >= 0.46 && spawnGapTurn === "none" && baseSignature) {
        return {
          kind: "spawn-corridor-facing-north",
          label: "Corridor N",
          heading: 0,
          confidence: Math.max(0.36, Math.min(0.64, spawnGapScore * 0.78)),
          forced: false
        };
      }

      return null;
    }

    resolveCompassOrthogonalEdgeLandmark(frame, visualMotion, baseHeading, motor) {
      const grid = Array.isArray(frame?.vision9x9Sample) ? frame.vision9x9Sample : [];
      if (grid.length < 81 || !this.visualSensorEnabled) {
        return null;
      }

      let verticalEnergy = 0;
      let horizontalEnergy = 0;
      let samples = 0;
      for (let row = 1; row < 8; row += 1) {
        for (let column = 1; column < 8; column += 1) {
          const index = row * 9 + column;
          const left = Number(grid[index - 1] || 0);
          const right = Number(grid[index + 1] || 0);
          const above = Number(grid[index - 9] || 0);
          const below = Number(grid[index + 9] || 0);
          verticalEnergy += Math.abs(right - left);
          horizontalEnergy += Math.abs(below - above);
          samples += 1;
        }
      }

      if (samples <= 0) {
        return null;
      }

      verticalEnergy /= samples;
      horizontalEnergy /= samples;
      const dominant = Math.max(verticalEnergy, horizontalEnergy);
      const total = Math.max(1, verticalEnergy + horizontalEnergy);
      const axisSeparation = Math.abs(verticalEnergy - horizontalEnergy) / total;
      const motionMagnitude = Math.max(
        Number(visualMotion?.magnitude || 0),
        Number(visualMotion?.baseMagnitude || 0));
      const diagonalEvidence = 1 - axisSeparation;
      const rotationIntent = Math.abs(Number(motor?.vectorX || 0));
      const frameVector = Math.max(
        Math.abs(Number(visualMotion?.vectorX || 0)),
        Math.abs(Number(visualMotion?.baseVectorX || 0)));
      const rotationVectorEvidence = Math.max(rotationIntent * 0.18, frameVector * 0.24);
      const edgeConfidence = Math.max(0, Math.min(1, (dominant / 42) * 0.58 + Math.max(axisSeparation, diagonalEvidence * 0.72) * 0.28 + rotationVectorEvidence));
      if (edgeConfidence < 0.34 || motionMagnitude > 0.18) {
        return null;
      }

      const snappedHeading = this.normalizeCompassHeading(Math.round(this.normalizeCompassHeading(baseHeading) / 45) * 45);
      const diagonalSnap = diagonalEvidence >= 0.42;
      return {
        kind: diagonalSnap
          ? "orthogonal-diagonal-edge-45-snap"
          : (dominant === verticalEnergy ? "orthogonal-vertical-edge-45-snap" : "orthogonal-horizontal-edge-45-snap"),
        label: diagonalSnap
          ? "Edge 45"
          : (dominant === verticalEnergy ? "Edge V45" : "Edge H45"),
        heading: snappedHeading,
        confidence: Math.min(0.42, edgeConfidence * 0.5),
        forced: false
      };
    }

    resolveCompassLandmark(frame, visualMotion) {
      const signature = String(visualMotion?.baseSignature || frame?.region9Signature || "");
      if (!signature || this.compassLandmarks.size <= 0) {
        return null;
      }

      const landmark = this.compassLandmarks.get(signature);
      if (!landmark) {
        return null;
      }

      return {
        signature,
        heading: landmark.heading,
        confidence: Math.max(0, Math.min(1, Number(landmark.confidence || 0)))
      };
    }

    learnCompassLandmark(frame, visualMotion, heading) {
      const signature = String(visualMotion?.baseSignature || frame?.region9Signature || "");
      const stable = Number(visualMotion?.baseMagnitude || 0) <= 0.08 && Number(visualMotion?.magnitude || 0) <= 0.08;
      if (!signature || !stable) {
        return;
      }

      const previous = this.compassLandmarks.get(signature);
      const confidence = Math.min(1, Number(previous?.confidence || 0) + 0.04);
      const mixedHeading = previous
        ? (Number(previous.heading || 0) * 0.86) + (Number(heading || 0) * 0.14)
        : Number(heading || 0);
      this.compassLandmarks.set(signature, {
        heading: (mixedHeading + 360) % 360,
        confidence,
        seen: Number(previous?.seen || 0) + 1
      });

      if (this.compassLandmarks.size > 96) {
        const first = this.compassLandmarks.keys().next();
        if (!first.done) {
          this.compassLandmarks.delete(first.value);
        }
      }
    }

    createNeutralAuditoryRuntimeSnapshot() {
      return requireDoomAuditoryRuntime("createNeutralSnapshot")(DEFAULT_SNAPSHOT_TIMESTAMP);
    }

    readBridgeAuditorySnapshot() {
      return requireDoomAuditoryRuntime("readBridgeSnapshot")(self);
    }

    audioSnapshotAgeMs(snapshot) {
      return requireDoomAuditoryRuntime("snapshotAgeMs")(snapshot);
    }

    audioSnapshotEnergy(snapshot) {
      return requireDoomAuditoryRuntime("snapshotEnergy")(snapshot);
    }

    createAuditoryRuntimeSnapshot() {
      return requireDoomAuditoryRuntime("createRuntimeSnapshot")(this, {
        defaultTimestamp: DEFAULT_SNAPSHOT_TIMESTAMP,
        global: self
      });
    }

    attachAudioRuntimeSource(audio) {
      return requireDoomAuditoryRuntime("attachRuntimeSource")(audio, {
        global: self,
        label: "doom.audio"
      });
    }

    drainNativeAudio() {
      return requireDoomNativeAudio("drain")(this);
    }

    resetAutoplaySensorState(reason = "sensor-reset") {
      this.lastAutoplayStatus = null;
      this.previousVisionMotionGrid = null;
      this.previousVisionMotionBaseGrid = null;
      this.previousWallPatternMotionGrid = null;
      this.previousWallPatternMotionBaseGrid = null;
      this.previousVisionMotionSignature = "";
      this.lastVisualMotionVector = null;
      this.compassLandmarks = new Map();
      this.compassHeading = 0;
      this.sensorInputs = this.createSensorInputMap();
      this.autoplayUsePulseFrames = 0;
      this.autoplayUsePulseSpacingFrames = 0;
      this.autoplayPending = false;
      this.autoplayMode = this.autoplayEnabled ? "settling" : "disabled";
      this.autoplayPredictions = 0;
      this.autoplayReused = 0;
      this.autoplayStuckFrames = 0;
      this.autoplayRecoveryFrames = 0;
      this.autoplayMobilityMode = "none";
      this.autoplayLoopEscapeFrames = 0;
      this.autoplaySafetyReason = "none";
      this.autoplayTargetConfidence = 0;
      this.autoplaySoundCueActive = false;
      this.autoplayAuditorySnapshot = null;
      this.autoplaySpatialSnapshot = null;
      this.autoplayVisionSensor = null;
      this.autoplayMotorSensor = null;
      this.autoplayMovementSensor = null;
      this.autoplayCompassSensor = null;
      this.autoplaySpatialSensor = null;
      this.autoplayHealthSensor = null;
      this.autoplayCtgCarrier = null;
      this.autoplayCtgObservedScores = null;
      this.autoplayToposDecisionCarrier = null;
      this.autoplayNousCarrier = null;
      this.autoplayNousDetectorResult = null;
      this.autoplayActionSignature = "";
      this.autoplayActionRepeatFrames = 0;
      this.autoplayMoveSignature = "";
      this.autoplayMoveRepeatFrames = 0;
      this.autoplayTurnSignature = "";
      this.autoplayTurnRepeatFrames = 0;
      this.autoplayRepeatActionFrames = 0;
      this.autoplayRepeatTurnFrames = 0;
      this.autoplayQuantizedStallFrames = 0;
      this.autoplayQuantizedFrameChange = 255;
      this.autoplayRegionQuantizedFrameChange = 255;
      this.autoplayStatusBarQuantizedFrameChange = 255;
      this.autoplayRegionSignature = "000000";
      this.autoplayRegion9Signature = "000000000";
      this.autoplayVision9x9Signature = "0".repeat(81);
      this.autoplayMotion9Signature = "000000000";
      this.autoplayMotion9Delta = 255;
      this.autoplayMotionForwardProgress = 0;
      this.autoplayMotionObstacleScore = 0;
      this.autoplayMotionTurnScore = 0;
      this.autoplayMotionEntranceScore = 0;
      this.autoplayMotionStallScore = 0;
      this.autoplayMotionIntent = "idle";
      this.autoplayFootObstacleScore = 0;
      this.autoplayPriorFootObstacleScore = 0;
      this.autoplayFootObstacleFlickerScore = 0;
      this.autoplayFootObstacleBounceFrames = 0;
      this.autoplayFootObstacleBandDelta = 0;
      this.autoplayInputStallFrames = 0;
      this.autoplayDepthSignature = "0000";
      this.autoplayDepthEstimate = 1;
      this.autoplayDepthSignatureDistance = 255;
      this.autoplayFaceSignature = "0000000000000000";
      this.autoplayFaceQuantizedFrameChange = 255;
      this.autoplayCornerSignal = 0;
      this.autoplaySignatureMatchKind = "none";
      this.autoplaySignatureMatchDistance = 255;
      this.autoplayWallSignatureCount = 0;
      this.autoplayCornerSignatureCount = 0;
      this.autoplayDepthSignatureCount = 0;
      this.autoplayWallUseProbeFrames = 0;
      this.autoplayWallUseProbeStage = 0;
      this.autoplayWallUseProbeTurn = "left";
      this.autoplayCornerSuppressFrames = 0;
      this.autoplayWallDetachFrames = 0;
      this.autoplayWallDetachTurn = "left";
      this.autoplayWallSurveyFrames = 0;
      this.autoplayWallSurveyTurn = "left";
      this.autoplayWallSurveyDecisionFrames = 0;
      this.autoplayMapRushCorrectionFrames = 0;
      this.autoplayMapRushCorrectionTurn = "left";
      this.autoplayMapRushCorrectionBackFrames = 0;
      this.autoplayMapDoorSweepFrames = 0;
      this.autoplayEnemyConfidence = 0;
      this.autoplayEnemyTurn = "none";
      this.autoplayEnemyDistance = 1;
      this.autoplayEnemyCluster = "none";
      this.autoplayEnemyFireReady = false;
      this.autoplayEnemyAllRegionPeak = 0;
      this.autoplayEnemyLateralBias = 0;
      this.autoplayAudioEnemyConfidence = 0;
      this.autoplayAudioEnemyDirection = "none";
      this.autoplayVisualEnemyVisible = false;
      this.autoplayVisualEnemyCentered = false;
      this.autoplayVisualEnemyYaw = 0;
      this.autoplayVisualEnemyFireReady = false;
      this.autoplayEnemyCombatYaw = 0;
      this.autoplayStrategyName = "SensorFusionStrafeProbeV3";
      this.autoplayStrategyContext = "retry-settle";
      this.autoplayStrategyPriority = 0;
      this.autoplayDecisionStage = "RetrySettle";
      this.autoplayEvidenceScore = 0;
      this.autoplaySemanticScores = null;
      this.autoplayDecisionTrace = null;
      this.autoplayAmmoSignature = "";
      this.autoplayAmmoLikelyEmpty = false;
      this.autoplayHealthSignature = "";
      this.autoplayHealthLikelyDead = false;
      this.autoplayHealthZeroScore = 0;
      this.autoplayHealthActiveColumns = 0;
      this.autoplayHealthActiveCells = 0;
      this.autoplayHealthEstimatedPercent = 100;
      this.autoplayControlPipeline = "RetrySettle";
      this.autoplayObjective = "retry-after-death";
      this.autoplayActiveDetections = ["objective", "health", "hud"];
      this.autoplaySemanticMemory = null;
      this.autoplayMilestones = {
        doorOpened: 0,
        enemyDefeated: 0,
        combatFireFrames: 0,
        enemyConfidencePeak: 0,
        enemyDropFrames: 0
      };
      this.autoplayStageEvaluations = [];
      this.autoplayKairosPriorityAxis = null;
      this.autoplayPipelineState = null;
      this.autoplayGoalState = null;
      this.autoplayDebugOverlay = null;
      this.autoplayAutoplayState = null;
      this.autoplayDebugRouteValues = null;
      this.autoplayHealthSensor = {
        active: false,
        likelyDead: false,
        retryRequested: false,
        confidence: 0,
        zeroScore: 0,
        activeCells: 0,
        estimatedPercent: 100,
        value: 100,
        health: 100,
        lowHealth: false,
        retryReason: "none"
      };
      this.autoplayLastAction = self.AIKernelBonsai?.neutralAction?.() || {
        move: "none",
        turn: "none",
        fire: false,
        strafe: false,
        use: false,
        run: false
      };
      if (typeof self.AIKernelDoomControlRuntime?.create === "function") {
        this.controlRuntime = self.AIKernelDoomControlRuntime.create(this.autoplayProfile || {});
        this.wasmAutoplayReady = true;
        this.autoplayControllerKind = "control-runtime-shim";
        this.wasmAutoplayLastError = "";
      }

      this.updateGpuHudOverlayState(null);
      this.log("[AUTOPLAY]", "log-info", `sensor state reset: ${reason}.`);
    }

    scheduleAutoplayRetryDispatch(status) {
      requireDoomRetryDispatch("schedule")(this.autoplayRetryDispatch, status, {
        keys: AUTOPLAY_KEYS,
        enterKey: AUTOPLAY_RETRY_ENTER_KEY,
        tapFrames: AUTOPLAY_RETRY_TAP_FRAMES,
        runtimeState: this.state,
        senseOnly: this.autoplaySenseOnly,
        releaseInputs: () => this.releaseAutoplayInputs(),
        resetSensors: (phase, reason) => this.resetAutoplaySensorState(`${phase}:${reason}`),
        queueInput: (keycode, pressed) => this.queueInput(keycode, pressed),
        logQueued: reason => {
          this.log("[AUTOPLAY]", "log-warn", `retry dispatch queued: reason=${reason}.`);
          this.emitStatus("autoplay-retry-dispatch");
        }
      });
    }

    scheduleAutoplayFrameRetryDispatch(state) {
      const frame = state?.framebuffer || {};
      const likelyDead = Boolean(frame.healthLikelyDead);
      const zeroScore = Number(frame.healthZeroScore || 0);
      const activeCells = Number(frame.healthActiveCells || 0);
      const deathTintScore = Number(frame.healthDeathTintScore || frame.deathTintScore || 0);
      const statusDeathTintScore = Number(frame.healthStatusDeathTintScore || 0);
      const faceDeathTintScore = Number(frame.healthFaceDeathTintScore || 0);
      const noHealthDigits = activeCells <= 1 && zeroScore <= 0.36;
      const tintRetry = noHealthDigits
        && deathTintScore >= 0.5
        && (statusDeathTintScore >= 0.36 || faceDeathTintScore >= 0.18);
      const retryRequested = likelyDead || tintRetry || (zeroScore >= 0.82 && activeCells >= 3);
      if (!retryRequested) {
        return false;
      }

      const retryReason = likelyDead
        ? (frame.healthRetryReason || "health-death")
        : (tintRetry ? "health-red-tint-death" : "health-zero-score");
      const status = {
        healthLikelyDead: likelyDead || tintRetry,
        healthZeroScore: zeroScore,
        healthSensor: {
          active: true,
          likelyDead: likelyDead || tintRetry,
          retryRequested: true,
          retryReason,
          zeroScore,
          deathTintScore,
          statusDeathTintScore,
          faceDeathTintScore,
          activeCells,
          activeColumns: Number(frame.healthActiveColumns || 0),
          estimatedPercent: Number(frame.healthEstimatedPercent ?? 0)
        }
      };
      const before = requireDoomRetryDispatch("snapshot")(this.autoplayRetryDispatch);
      const scheduled = requireDoomRetryDispatch("schedule")(this.autoplayRetryDispatch, status, {
        keys: AUTOPLAY_KEYS,
        enterKey: AUTOPLAY_RETRY_ENTER_KEY,
        tapFrames: AUTOPLAY_RETRY_TAP_FRAMES,
        runtimeState: this.state,
        senseOnly: this.autoplaySenseOnly,
        releaseInputs: () => this.releaseAutoplayInputs(),
        resetSensors: (phase, reason) => this.resetAutoplaySensorState(`${phase}:${reason}`),
        queueInput: (keycode, pressed) => this.queueInput(keycode, pressed),
        logQueued: reason => {
          this.log("[AUTOPLAY]", "log-warn", `retry dispatch queued before prediction: reason=${reason}.`);
          this.emitStatus("autoplay-retry-dispatch");
        }
      });
      const after = requireDoomRetryDispatch("snapshot")(this.autoplayRetryDispatch);
      if (scheduled?.scheduled || (!before.active && after.active)) {
        this.neutralizeAutoplayForRetrySignal("retry-dispatch");
        return true;
      }

      if (after.active) {
        this.neutralizeAutoplayForRetrySignal("retry-dispatch");
        return true;
      }

      if (scheduled?.reason === "debounce" || scheduled?.reason === "busy" || scheduled?.reason === "settling") {
        this.neutralizeAutoplayForRetrySignal(`retry-${scheduled.reason}`);
        return true;
      }

      return false;
    }

    neutralizeAutoplayForRetrySignal(mode = "retry-signal") {
      this.autoplayMode = mode;
      this.autoplayPending = false;
      this.autoplayLastAction = self.AIKernelBonsai?.neutralAction?.() || {
        move: "none",
        turn: "none",
        fire: false,
        strafe: false,
        use: false,
        run: false
      };
      this.updateAutoplayKinesisActionLoop(this.autoplayLastAction);
      this.releaseAutoplayInputs();
      this.updateGpuHudOverlayState(null);
    }

    processAutoplayRetryDispatch() {
      return requireDoomRetryDispatch("process")(this.autoplayRetryDispatch, {
        cooldownFrames: AUTOPLAY_RETRY_COOLDOWN_FRAMES,
        settleFrames: AUTOPLAY_RETRY_SETTLE_FRAMES,
        releaseInputs: () => this.releaseAutoplayInputs(),
        releaseMoveInputs: () => this.releaseAutoplayMoveInputs(),
        resetSensors: (phase, reason) => this.resetAutoplaySensorState(`${phase}:${reason}`),
        queueInput: (keycode, pressed) => this.queueInput(keycode, pressed),
        logCompleted: reason => this.log("[AUTOPLAY]", "log-info", `retry dispatch completed: reason=${reason}; settling sensors=${AUTOPLAY_RETRY_SETTLE_FRAMES} frames.`),
        logSettled: reason => this.log("[AUTOPLAY]", "log-ok", `retry sensor settle completed: reason=${reason}.`)
      });
    }

    clearAutoplayRetryDispatch() {
      return requireDoomRetryDispatch("clear")(this.autoplayRetryDispatch, {
        keys: AUTOPLAY_KEYS,
        enterKey: AUTOPLAY_RETRY_ENTER_KEY,
        queueInput: (keycode, pressed) => this.queueInput(keycode, pressed)
      });
    }

    normalizeAutoplayKinesisAction(action) {
      const normalizer = self.AIKernelDoomKinesis?.normalizeAction || self.AIKernelBonsai?.normalizeAction;
      if (typeof normalizer === "function") {
        return normalizer(action, this.autoplayLastAction);
      }

      const safe = action || {};
      return {
        move: safe.move === "forward" ? "forward" : (safe.move === "back" ? "back" : "none"),
        turn: safe.turn === "left" ? "left" : (safe.turn === "right" ? "right" : "none"),
        fire: Boolean(safe.fire),
        strafe: Boolean(safe.strafe),
        use: Boolean(safe.use),
        run: Boolean(safe.run)
      };
    }

    createAutoplayKinesisSignature(action) {
      const signature = self.AIKernelDoomKinesis?.actionSignature;
      if (typeof signature === "function") {
        return signature(action);
      }

      const safe = this.normalizeAutoplayKinesisAction(action);
      return [
        safe.move,
        safe.turn,
        safe.fire ? "f" : "-",
        safe.strafe ? "s" : "-",
        safe.use ? "u" : "-",
        safe.run ? "r" : "-"
      ].join(":");
    }

    updateAutoplayKinesisActionLoop(action) {
      const safe = this.normalizeAutoplayKinesisAction(action);
      const trackable = !safe.fire
        && !safe.use
        && (safe.move !== "none" || safe.turn !== "none" || safe.strafe || safe.run);
      if (!trackable) {
        this.autoplayActionSignature = "";
        this.autoplayActionRepeatFrames = 0;
        this.autoplayMoveSignature = "";
        this.autoplayMoveRepeatFrames = 0;
        this.autoplayTurnSignature = "";
        this.autoplayTurnRepeatFrames = 0;
        return 0;
      }

      const signature = this.createAutoplayKinesisSignature(safe);
      if (signature === this.autoplayActionSignature) {
        this.autoplayActionRepeatFrames = Math.min(240, Number(this.autoplayActionRepeatFrames || 0) + 1);
      } else {
        this.autoplayActionSignature = signature;
        this.autoplayActionRepeatFrames = 1;
      }

      const moveSignature = safe.move !== "none" ? safe.move : "";
      if (moveSignature) {
        this.autoplayMoveRepeatFrames = moveSignature === this.autoplayMoveSignature
          ? Math.min(240, Number(this.autoplayMoveRepeatFrames || 0) + 1)
          : 1;
        this.autoplayMoveSignature = moveSignature;
      } else {
        this.autoplayMoveSignature = "";
        this.autoplayMoveRepeatFrames = 0;
      }

      const turnSignature = safe.turn !== "none" ? safe.turn : "";
      if (turnSignature) {
        this.autoplayTurnRepeatFrames = turnSignature === this.autoplayTurnSignature
          ? Math.min(240, Number(this.autoplayTurnRepeatFrames || 0) + 1)
          : 1;
        this.autoplayTurnSignature = turnSignature;
      } else {
        this.autoplayTurnSignature = "";
        this.autoplayTurnRepeatFrames = 0;
      }

      return this.autoplayActionRepeatFrames;
    }

    applyAutoplayAction(action) {
      requireDoomActionAdapter("applyAction")(action, {
        keys: AUTOPLAY_KEYS,
        ok: OK,
        previousAction: this.autoplayLastAction,
        normalizeAction: self.AIKernelBonsai?.normalizeAction,
        senseOnly: this.autoplaySenseOnly,
        manualMove: this.autoplayManualMove,
        nativeAction: typeof this.exports?.doom_input_action === "function"
          ? (move, turn, fire, strafe) => this.exports.doom_input_action(move, turn, fire, strafe)
          : null,
        resolveUsePulse: wantsUse => this.resolveAutoplayUsePulse(wantsUse),
        queueInput: (keycode, pressed) => this.queueInput(keycode, pressed),
        isManualInputActive: keycode => this.isManualInputActive(keycode),
        clearRetry: () => this.clearAutoplayRetryDispatch(),
        releaseInputs: () => this.releaseAutoplayInputs(),
        playDebugAudio: () => this.handleDebugAudioPlayback()
      });
    }

    handleDebugAudioPlayback() {
      self.AIKernelDoomDebugAudio?.play?.(this.autoplayAuditorySnapshot, {
        muted: this.audioPlaybackMuted
      });
    }

    resolveAutoplayUsePulse(wantsUse) {
      if (!wantsUse) {
        this.autoplayUsePulseFrames = 0;
        this.autoplayUsePulseSpacingFrames = 0;
        return false;
      }

      if (this.autoplayUsePulseFrames > 0) {
        this.autoplayUsePulseFrames -= 1;
        return true;
      }

      if (this.autoplayUsePulseSpacingFrames > 0) {
        this.autoplayUsePulseSpacingFrames -= 1;
        return false;
      }

      this.autoplayUsePulseFrames = AUTOPLAY_USE_TAP_FRAMES - 1;
      this.autoplayUsePulseSpacingFrames = AUTOPLAY_USE_TAP_SPACING_FRAMES;
      return true;
    }

    releaseAutoplayMoveInputs() {
      return requireDoomActionAdapter("releaseMoveInputs")({
        keys: AUTOPLAY_KEYS,
        nativeAction: typeof this.exports?.doom_input_action === "function"
          ? (move, turn, fire, strafe) => this.exports.doom_input_action(move, turn, fire, strafe)
          : null,
        queueInput: (keycode, pressed) => this.queueInput(keycode, pressed)
      });
    }

    releaseAutoplayInputs() {
      this.autoplayUsePulseFrames = 0;
      this.autoplayUsePulseSpacingFrames = 0;
      return requireDoomActionAdapter("releaseInputs")({
        keys: AUTOPLAY_KEYS,
        nativeAction: typeof this.exports?.doom_input_action === "function"
          ? (move, turn, fire, strafe) => this.exports.doom_input_action(move, turn, fire, strafe)
          : null,
        queueInput: (keycode, pressed) => this.queueInput(keycode, pressed)
      });
    }

    logAutoplayVisionPath() {
      const label = `${this.autoplayVisionMode}:${this.autoplayVisionZeroCopy ? "zero-copy" : "fallback"}`;
      if (label === this.autoplayVisionLogged) {
        return;
      }

      this.autoplayVisionLogged = label;
      if (this.autoplayVisionZeroCopy) {
        this.log("[AUTOPLAY]", "log-ok", `Bonsai vision path: ${this.autoplayVisionMode}; zeroCopy=true; framebuffer stays on WebGPU surface.`);
      } else {
        this.log("[AUTOPLAY]", "log-warn", `Bonsai vision path: ${this.autoplayVisionMode}; zeroCopy=false; using lightweight CPU frame summary fallback.`);
      }
    }

    stopLoop() {
      this.loopToken += 1;
      if (this.frameTimer) {
        window.clearTimeout(this.frameTimer);
        this.frameTimer = 0;
      }

      if (this.watchdogTimer) {
        window.clearInterval(this.watchdogTimer);
        this.watchdogTimer = 0;
      }

      if (this.animationFrame) {
        window.cancelAnimationFrame(this.animationFrame);
        this.animationFrame = 0;
      }

      this.loopActive = false;
    }

    async drawFrame(renderResult) {
      const indices = this.resolveFramebufferIndices(renderResult);
      if (!indices) {
        throw new Error("doom_render returned an unsupported framebuffer value.");
      }

      const provider = window.WebGpuComputeProvider || window.webGpuComputeProvider || window.aikernelWebGpuComputeProvider;
      if (this.webGpuFrameRenderer && isDoomGpuRenderingEnabled() && typeof provider?.renderPalettedFrame === "function") {
        try {
          if (provider.renderPalettedFrame(indices)) {
            await this.waitForGpuQueue();
            await yieldToUi();
            return;
          }
        } catch (error) {
          this.handleGpuLost("render", error);
        }
      }

      if (this.webGpuFrameRenderer && typeof provider?.status === "function" && provider.status()?.usingCpuFallback) {
        this.handleGpuLost("provider-fallback", provider.status()?.lastError || null, { fromProvider: true });
      }

      this.ensureCpuCanvasContext("frame-cpu-fallback");
      if (this.frame32) {
        const palette = this.paletteCache.rgba32;
        for (let index = 0; index < FRAME_BYTES; index += 1) {
          this.frame32[index] = palette[indices[index] || 0];
        }
      } else {
        const pixels = this.frameImage.data;
        const palette = this.paletteCache.rgbaBytes;
        for (let source = 0, target = 0; source < FRAME_BYTES; source += 1, target += 4) {
          const color = (indices[source] || 0) * 4;
          pixels[target] = palette[color];
          pixels[target + 1] = palette[color + 1];
          pixels[target + 2] = palette[color + 2];
          pixels[target + 3] = 255;
        }
      }

      this.context.putImageData(this.frameImage, 0, 0);
      await this.waitForGpuQueue();
      await yieldToUi();
    }

    resolveFramebufferIndices(renderResult) {
      if (renderResult instanceof Uint8Array) {
        return renderResult;
      }

      if (typeof renderResult === "number") {
        if (!renderResult) {
          return null;
        }

        return this.getFramebufferView(renderResult);
      }

      return null;
    }

    getFramebufferView(ptr) {
      const memory = this.exports.memory.buffer;
      if (this.framebufferPtr !== ptr || this.framebufferMemory !== memory || !this.framebufferView) {
        this.framebufferPtr = ptr;
        this.framebufferMemory = memory;
        this.framebufferView = new Uint8Array(memory, ptr, FRAME_BYTES);
      }

      return this.framebufferView;
    }

    async waitForGpuQueue() {
      if (!isDoomGpuRenderingEnabled()) {
        this.lastGpuWaitMs = 0;
        return;
      }

      const queue = resolveWebGpuQueue();
      if (!queue?.onSubmittedWorkDone) {
        this.lastGpuWaitMs = 0;
        return;
      }

      const startedAt = window.performance?.now?.() || Date.now();
      const timedOut = Symbol("gpu-timeout");
      const result = await Promise.race([
        queue.onSubmittedWorkDone(),
        delay(48).then(() => timedOut)
      ]);
      if (result === timedOut) {
        this.gpuWaitTimeouts += 1;
      }
      this.lastGpuWaitMs = Math.round((window.performance?.now?.() || Date.now()) - startedAt);
      this.gpuFlushCount += 1;
    }

    emitStatus(reason) {
      this.onStatusChange(this.status(), reason);
    }

    updateFps(now) {
      if (!this.fpsSampleStartedAt) {
        this.fpsSampleStartedAt = now;
      }

      this.fpsSampleFrames += 1;
      const elapsed = now - this.fpsSampleStartedAt;
      if (elapsed >= 500) {
        this.fps = Math.round((this.fpsSampleFrames * 10000) / elapsed) / 10;
        this.adjustTargetFps();
        this.fpsSampleFrames = 0;
        this.noWaitSampleFrames = 0;
        this.fpsSampleStartedAt = now;
        this.emitStatus("fps");
      }
    }

    frameIntervalMs() {
      return 1000 / this.targetFps;
    }

    adjustTargetFps() {
      if (this.targetFps <= MIN_TARGET_FPS || this.fpsSampleFrames <= 0) {
        return;
      }

      const noWaitRatio = this.noWaitSampleFrames / this.fpsSampleFrames;
      const belowCap = this.fps < this.targetFps * 0.9;
      if (!belowCap || noWaitRatio < 0.5) {
        return;
      }

      const previous = this.targetFps;
      this.targetFps = Math.max(MIN_TARGET_FPS, this.targetFps - TARGET_FPS_STEP);
      this.nextFrameDueAt = 0;
      this.log("[ RENDER ]", "log-warn", `framebuffer cap reduced: ${previous}fps -> ${this.targetFps}fps (measured ${this.fps}fps without idle wait).`);
      this.emitStatus("cap-reduced");
    }

    createImports() {
      return requireDoomWasmImports("createImports")(this);
    }
  }

  async function fetchJson(url) {
    return requireDoomBinaryAssets("fetchJson")(url);
  }

  async function fetchBinary(url, expected, onProgress = null) {
    return requireDoomBinaryAssets("fetchBinary")(url, expected, onProgress);
  }

  function normalizeByteCount(value) {
    return requireDoomBinaryAssets("normalizeByteCount")(value);
  }

  function requireDoomWadMetadata(name) {
    const fn = self.AIKernelDoomWadMetadata?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomWadMetadata.${name} is unavailable.`);
    }

    return fn;
  }

  function parseWadMapHints(wadBytes, mapName) {
    return requireDoomWadMetadata("parseMapHints")(wadBytes, mapName);
  }

  function parsePlaypal(wadBytes) {
    return requireDoomWadMetadata("parsePlaypal")(wadBytes);
  }

  function defaultPalette() {
    return requireDoomWadMetadata("defaultPalette")();
  }

  function buildPaletteCache(palette) {
    return requireDoomWadMetadata("buildPaletteCache")(palette);
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, chunk);
    }

    const encoder = typeof btoa === "function"
      ? btoa
      : (typeof window !== "undefined" && typeof window.btoa === "function" ? window.btoa.bind(window) : null);
    return encoder ? encoder(binary) : "";
  }

  function delay(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  async function yieldToUi() {
    await delay(0);
  }

  async function initializeWebGpuProvider() {
    if (!isDoomGpuRenderingEnabled()) {
      return { usingCpuFallback: true, useGpuRendering: false, lastError: ensureDoomGpuModeState().reason || "GPU rendering disabled." };
    }

    const provider = await ensureDoomRendererProvider();
    if (typeof provider?.initialize === "function") {
      await provider.initialize();
    }
  }

  let rendererProviderScriptLoading = null;

  function resolveDoomScriptBase() {
    const fallback = "/js/";
    try {
      const currentScript = document.currentScript;
      if (currentScript?.src) {
        return new URL(".", currentScript.src).pathname;
      }

      const script = Array.from(document.scripts || [])
        .reverse()
        .find(item => /(?:^|\/)doom\.js(?:\?|$)/.test(item.src || ""));
      if (script?.src) {
        return new URL(".", script.src).pathname;
      }
    } catch {
    }

    return fallback;
  }

  async function ensureDoomRendererProvider(log) {
    let provider = window.WebGpuComputeProvider || window.webGpuComputeProvider || window.aikernelWebGpuComputeProvider;
    if (typeof provider?.initializeDoomRenderer === "function") {
      return provider;
    }

    if (typeof document !== "undefined") {
      rendererProviderScriptLoading ||= loadScript(`${resolveDoomScriptBase()}webgpu-provider.js?v=${encodeURIComponent(SCRIPT_CACHE_KEY)}`)
        .catch(error => {
          rendererProviderScriptLoading = null;
          if (typeof log === "function") {
            log("[ RENDER ]", "log-warn", `WebGPU renderer provider reload failed: ${error instanceof Error ? error.message : String(error)}`);
          }
          return null;
        });
      await rendererProviderScriptLoading;
      provider = window.WebGpuComputeProvider || window.webGpuComputeProvider || window.aikernelWebGpuComputeProvider;
      if (typeof provider?.initializeDoomRenderer === "function") {
        return provider;
      }
    }

    return ensureBrowserWebGpuComputeProvider();
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  const WEBGPU_ADAPTER_POWER_PREFERENCE = "high-performance";
  const WEBGPU_ADAPTER_REQUEST_OPTIONS = Object.freeze({
    powerPreference: WEBGPU_ADAPTER_POWER_PREFERENCE,
    forceFallbackAdapter: false
  });

  function cloneWebGpuAdapterRequestOptions() {
    return {
      powerPreference: WEBGPU_ADAPTER_REQUEST_OPTIONS.powerPreference,
      forceFallbackAdapter: WEBGPU_ADAPTER_REQUEST_OPTIONS.forceFallbackAdapter
    };
  }

  async function requestPreferredWebGpuAdapter(gpu) {
    const preferredOptions = cloneWebGpuAdapterRequestOptions();
    try {
      const adapter = await gpu.requestAdapter(preferredOptions);
      if (adapter) {
        return {
          adapter,
          options: preferredOptions,
          fallbackUsed: false,
          requestError: ""
        };
      }
    } catch (error) {
      const fallbackAdapter = await gpu.requestAdapter();
      return {
        adapter: fallbackAdapter,
        options: preferredOptions,
        fallbackUsed: Boolean(fallbackAdapter),
        requestError: error instanceof Error ? error.message : String(error)
      };
    }

    const fallbackAdapter = await gpu.requestAdapter();
    return {
      adapter: fallbackAdapter,
      options: preferredOptions,
      fallbackUsed: Boolean(fallbackAdapter),
      requestError: fallbackAdapter ? "high-performance adapter unavailable; default adapter used" : "WebGPU adapter unavailable"
    };
  }

  async function resolveWebGpuAdapterInfo(adapter) {
    if (!adapter) {
      return null;
    }

    try {
      const info = typeof adapter.requestAdapterInfo === "function"
        ? await adapter.requestAdapterInfo()
        : adapter.info;
      if (!info) {
        return null;
      }

      return {
        vendor: String(info.vendor || ""),
        architecture: String(info.architecture || ""),
        device: String(info.device || ""),
        description: String(info.description || ""),
        subgroupMinSize: Number(info.subgroupMinSize || 0),
        subgroupMaxSize: Number(info.subgroupMaxSize || 0)
      };
    } catch {
      return null;
    }
  }

  function summarizeWebGpuAdapterInfo(info) {
    if (!info || typeof info !== "object") {
      return "unknown";
    }

    const parts = [
      info.description,
      info.device,
      info.vendor,
      info.architecture
    ]
      .map(value => String(value || "").trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" / ") : "unknown";
  }

  function ensureBrowserWebGpuComputeProvider() {
    if (window.WebGpuComputeProvider) {
      if (!window.webGpuComputeProvider) {
        window.webGpuComputeProvider = window.WebGpuComputeProvider;
      }
      return window.WebGpuComputeProvider;
    }

    const frameStates = new Map();
    const frameTextures = new Map();
    const provider = {
      providerId: "webgpu.compute",
      name: "WebGpuComputeProvider",
      backendName: "browser-webgpu",
      supported: Boolean(navigator.gpu),
      usingCpuFallback: !navigator.gpu || !isDoomGpuRenderingEnabled(),
      gpuPermanentlyDisabled: !isDoomGpuRenderingEnabled(),
      fallbackReason: ensureDoomGpuModeState().reason || "",
      initialized: false,
      initializing: null,
      adapter: null,
      adapterInfo: null,
      adapterSummary: "unknown",
      adapterRequestOptions: cloneWebGpuAdapterRequestOptions(),
      adapterRequestFallbackUsed: false,
      adapterRequestError: "",
      device: null,
      queue: null,
      lastError: "",
      async initialize() {
        if (this.initialized || this.initializing) {
          return this.initializing || this.status();
        }

        this.initializing = (async () => {
          if (!isDoomGpuRenderingEnabled()) {
            this.usingCpuFallback = true;
            this.gpuPermanentlyDisabled = true;
            this.fallbackReason = ensureDoomGpuModeState().reason || "GPU rendering disabled by startup selection.";
            this.lastError = this.fallbackReason;
            this.initialized = true;
            return this.status();
          }

          if (!navigator.gpu) {
            this.usingCpuFallback = true;
            this.lastError = "navigator.gpu is unavailable.";
            return this.status();
          }

          try {
            const adapterRequest = await requestPreferredWebGpuAdapter(navigator.gpu);
            this.adapter = adapterRequest.adapter;
            this.adapterRequestOptions = adapterRequest.options;
            this.adapterRequestFallbackUsed = adapterRequest.fallbackUsed;
            this.adapterRequestError = adapterRequest.requestError || "";
            if (!this.adapter) {
              this.usingCpuFallback = true;
              this.lastError = "WebGPU adapter is unavailable.";
              return this.status();
            }

            this.adapterInfo = await resolveWebGpuAdapterInfo(this.adapter);
            this.adapterSummary = summarizeWebGpuAdapterInfo(this.adapterInfo);
            this.device = await this.adapter.requestDevice();
            this.attachDeviceLostHandler(this.device);
            this.queue = this.device.queue;
            this.usingCpuFallback = false;
            this.initialized = true;
            this.lastError = "";
            return this.status();
          } catch (error) {
            this.device = null;
            this.queue = null;
            this.usingCpuFallback = true;
            this.lastError = error instanceof Error ? error.message : String(error);
            return this.status();
          } finally {
            this.initializing = null;
          }
        })();

        return this.initializing;
      },
      attachDeviceLostHandler(device) {
        if (!device?.lost || device.__aikernelDoomLostHandlerAttached) {
          return;
        }

        device.__aikernelDoomLostHandlerAttached = true;
        device.lost.then(info => {
          this.handleGpuLost("webgpu", info);
        }).catch(error => {
          this.handleGpuLost("webgpu", error);
        });
      },
      attachCanvasContextLostHandlers(canvas) {
        if (!canvas || canvas.__aikernelDoomContextLostHandlersAttached) {
          return;
        }

        canvas.__aikernelDoomContextLostHandlersAttached = true;
        canvas.addEventListener("webglcontextlost", event => {
          event.preventDefault();
          this.handleGpuLost("webgl", null);
        });
      },
      disposeGpuResources() {
        try {
          this.device?.destroy?.();
        } catch {
        }
        this.device = null;
        this.queue = null;
        this.adapter = null;
        this.initializing = null;
        frameTextures.clear();
      },
      dispatchGpuLost(kind, info) {
        window.dispatchEvent(new CustomEvent("aikernel-doom-gpu-lost", {
          detail: {
            kind,
            info,
            reason: this.fallbackReason || this.lastError || "gpu-lost",
            status: this.status()
          }
        }));
      },
      handleGpuLost(kind = "webgpu", info = null) {
        if (this.gpuPermanentlyDisabled) {
          return this.status();
        }

        const detailReason = info?.reason || info?.message || (typeof info === "string" ? info : "");
        this.gpuPermanentlyDisabled = true;
        this.usingCpuFallback = true;
        this.fallbackReason = `gpu-lost:${kind}${detailReason ? `:${detailReason}` : ""}`;
        this.lastError = "GPU failure detected. Switching to CPU mode.";
        setDoomGpuRenderingMode(false, this.fallbackReason);
        this.disposeGpuResources();
        this.dispatchGpuLost(kind, info);
        return this.status();
      },
      forceCpuFallback(kind = "forced", info = null) {
        return this.handleGpuLost(kind, info);
      },
      setFrameState(target, state) {
        frameStates.set(target || RAW_FRAMEBUFFER_TARGET, Object.assign({
          providerId: this.providerId,
          backend: (this.usingCpuFallback || !isDoomGpuRenderingEnabled()) ? "cpu-fallback" : this.backendName,
          zeroCopy: false,
          updatedAt: performance.now()
        }, state || {}));
      },
      setDoomFrameTexture(texture) {
        if (texture) {
          frameTextures.set(RAW_FRAMEBUFFER_TARGET, texture);
        } else {
          frameTextures.delete(RAW_FRAMEBUFFER_TARGET);
        }
      },
      createBonsaiVisionBinding(target) {
        const name = target || RAW_FRAMEBUFFER_TARGET;
        const texture = frameTextures.get(name);
        if (texture && !this.usingCpuFallback && isDoomGpuRenderingEnabled()) {
          return {
            providerId: this.providerId,
            backend: this.backendName,
            kind: "webgpu-texture-binding",
            zeroCopy: true,
            texture
          };
        }

        return {
          providerId: this.providerId,
          backend: (this.usingCpuFallback || !isDoomGpuRenderingEnabled()) ? "cpu-fallback" : this.backendName,
          kind: "webgpu-state-buffer",
          zeroCopy: false,
          state: frameStates.get(name) || null
        };
      },
      getDoomFrameTexture() {
        return frameTextures.get(RAW_FRAMEBUFFER_TARGET) || null;
      },
      getFramebufferTexture(target) {
        return frameTextures.get(target || RAW_FRAMEBUFFER_TARGET) || null;
      },
      getFrameStateBuffer(target) {
        return frameStates.get(target || RAW_FRAMEBUFFER_TARGET) || null;
      },
      status() {
        if (!isDoomGpuRenderingEnabled()) {
          this.usingCpuFallback = true;
          this.gpuPermanentlyDisabled = true;
          this.fallbackReason = this.fallbackReason || ensureDoomGpuModeState().reason || "GPU rendering disabled.";
        }

        const deviceReady = Boolean(this.device && this.queue && !this.usingCpuFallback);
        return {
          providerId: this.providerId,
          name: this.name,
          backend: this.usingCpuFallback ? "cpu-fallback" : this.backendName,
          supported: this.supported,
          initialized: this.initialized,
          useGpuRendering: isDoomGpuRenderingEnabled(),
          gpuPermanentlyDisabled: Boolean(this.gpuPermanentlyDisabled || ensureDoomGpuModeState().gpuPermanentlyDisabled),
          fallbackReason: this.fallbackReason || ensureDoomGpuModeState().reason || "",
          adapterReady: Boolean(this.adapter),
          deviceReady,
          adapterPowerPreference: this.adapterRequestOptions?.powerPreference || WEBGPU_ADAPTER_POWER_PREFERENCE,
          adapterForceFallback: Boolean(this.adapterRequestOptions?.forceFallbackAdapter),
          adapterRequestFallbackUsed: Boolean(this.adapterRequestFallbackUsed),
          adapterRequestError: this.adapterRequestError || "",
          adapterInfo: this.adapterInfo,
          adapterSummary: this.adapterSummary,
          rendererInitialized: false,
          zeroCopy: false,
          rawTextureReady: false,
          storageTextureReady: false,
          gpuBufferReady: false,
          gpuComputeReady: false,
          gpuComputeActive: false,
          hudOverlayReady: false,
          hudPanelOverlayReady: false,
          hudPanelDoubleBuffered: false,
          hudCompositeReady: false,
          hudCompositeActive: false,
          hudCompositeDoubleBuffered: false,
          gpuMemory: {
            active: false,
            totalBytes: 0,
            totalMB: 0,
            buffersBytes: 0,
            texturesBytes: 0,
            framebufferBytes: 0,
            hudBytes: 0,
            aisthesisBytes: 0,
            spatialBytes: 0,
            note: this.usingCpuFallback ? "cpu-fallback" : "renderer-unavailable"
          },
          estimatedGpuMemoryBytes: 0,
          estimatedGpuMemoryMB: 0,
          usingCpuFallback: this.usingCpuFallback,
          lastError: this.lastError
        };
      }
    };

    window.WebGpuComputeProvider = provider;
    window.webGpuComputeProvider = provider;
    return provider;
  }

  function resolveWebGpuProvider() {
    ensureBrowserWebGpuComputeProvider();
    return window.WebGpuComputeProvider || window.webGpuComputeProvider || window.aikernelWebGpuComputeProvider || null;
  }

  function resolveRendererName() {
    if (!isDoomGpuRenderingEnabled()) {
      return "canvas-fallback(cpu-selected)";
    }

    const provider = resolveWebGpuProvider();
    if (provider) {
      const status = typeof provider.status === "function" ? provider.status() : provider;
      return status?.usingCpuFallback === false
        ? "canvas-fallback(WebGpuComputeProvider)"
        : "canvas-fallback(WebGpuComputeProvider-cpu)";
    }

    if (navigator.gpu) {
      return "canvas-fallback(webgpu-available)";
    }

    return "canvas-fallback";
  }

  function resolveGpuDelegateName() {
    if (!isDoomGpuRenderingEnabled()) {
      return "CPU mode(WebGPU disabled)";
    }

    const provider = resolveWebGpuProvider();
    if (provider) {
      const status = typeof provider.status === "function" ? provider.status() : provider;
      const backend = status?.backend || (status?.usingCpuFallback ? "cpu-fallback" : "browser-webgpu");
      return `WebGpuComputeProvider(${backend})`;
    }

    if (navigator.gpu) {
      return "navigator.gpu(WebGPU)";
    }

    return "unavailable(canvas-fallback)";
  }

  function resolveWebGpuQueue() {
    if (!isDoomGpuRenderingEnabled()) {
      return null;
    }

    const provider = resolveWebGpuProvider();
    return provider?.device?.queue || provider?.queue || navigator.gpu?.queue || null;
  }

  window.AIKernelDoomRuntime = AIKernelDoomRuntime;
  window.createAIKernelDoomRuntime = options => new AIKernelDoomRuntime(options);
})();
