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
  const IS_LITTLE_ENDIAN = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
  const DEFAULT_SNAPSHOT_TIMESTAMP = "1970-01-01T00:00:00.000Z";
  const DOOM_BINARY_ASSET_CACHE = "aikernel-doom-binary-assets-v1";

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
      this.modelManifestUrl = options.modelManifestUrl || "/models/bonsai1.7b/manifest.json";
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
      this.autoplayStrategyName = "SensorFusionStrafeProbeV3";
      this.autoplayStrategyContext = "unknown";
      this.autoplayStrategyPriority = 0;
      this.autoplayDecisionStage = "Idle";
      this.autoplayEvidenceScore = 0;
      this.autoplaySemanticScores = null;
      this.autoplayDecisionTrace = null;
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
    }

    status() {
      return {
        state: this.state,
        renderer: this.renderer,
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
          ammoSignature: this.bonsaiSupervisor?.status?.().ammoSignature || "",
          ammoLikelyEmpty: Boolean(this.bonsaiSupervisor?.status?.().ammoLikelyEmpty),
          healthSignature: this.bonsaiSupervisor?.status?.().healthSignature || "",
          healthLikelyDead: Boolean(this.bonsaiSupervisor?.status?.().healthLikelyDead),
          healthZeroScore: this.bonsaiSupervisor?.status?.().healthZeroScore || 0,
          healthActiveColumns: this.bonsaiSupervisor?.status?.().healthActiveColumns || 0,
          healthActiveCells: this.bonsaiSupervisor?.status?.().healthActiveCells || 0,
          healthSensor: this.autoplayHealthSensor || this.bonsaiSupervisor?.status?.().healthSensor || null,
          milestones: this.bonsaiSupervisor?.status?.().milestones || {
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
          controlPipeline: this.autoplayControlPipeline,
          objective: this.autoplayObjective,
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
        lastError: this.lastError
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

    async ensureCanvas() {
      if (!this.canvas) {
        throw new Error("doom-screen canvas is missing.");
      }

      this.canvas.width = WIDTH;
      this.canvas.height = HEIGHT;
      this.canvas.hidden = false;
      const provider = await ensureDoomRendererProvider(this.log);
      if (!this.webGpuFrameRenderer && typeof provider?.initializeDoomRenderer === "function") {
        this.webGpuFrameRenderer = await provider.initializeDoomRenderer(this.canvas, WIDTH, HEIGHT, this.paletteCache.rgbaBytes);
      }

      this.renderer = this.webGpuFrameRenderer ? "WebGpuComputeProvider(texture)" : resolveRendererName();
      if (!this.webGpuFrameRenderer && provider?.lastError) {
        this.log("[ RENDER ]", "log-warn", `WebGPU texture renderer unavailable: ${provider.lastError}; using Canvas fallback.`);
      }
      if (this.webGpuFrameRenderer || (this.context && this.frameImage)) {
        return;
      }

      this.context = this.canvas.getContext("2d", { alpha: false });
      if (!this.context) {
        throw new Error("2D canvas context is unavailable.");
      }

      this.frameImage = this.context.createImageData(WIDTH, HEIGHT);
      this.frame32 = IS_LITTLE_ENDIAN ? new Uint32Array(this.frameImage.data.buffer) : null;
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
      this.setDownloadPhase("provider", "Initializing WebGPU provider");
      await initializeWebGpuProvider();
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
      this.log("[ GPU ]", "log-ok", `Bonsai supervisor GPU delegate active: ${resolveGpuDelegateName()}.`);
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

    captureSenseOnlyFrame() {
      const status = this.status();
      const imageDataUrl = this.canvas && typeof this.canvas.toDataURL === "function"
        ? this.canvas.toDataURL("image/png")
        : "";
      return {
        kind: "doom.sense-only.frame-capture",
        senseOnly: Boolean(this.autoplaySenseOnly),
        frame: this.frameCount,
        timestamp: new Date().toISOString(),
        imageDataUrl,
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
        const wasmState = this.createWasmAutoplayState(state);
        if (!this.controlRuntime || typeof this.controlRuntime.predict !== "function") {
          throw new Error("AIKernel.Control runtime shim is unavailable.");
        }

        const rawAction = this.controlRuntime.predict(wasmState);
        this.autoplayLastAction = self.AIKernelBonsai?.normalizeAction?.(rawAction, this.autoplayLastAction) || rawAction;
        const wasmStatus = this.readWasmAutoplayStatus() || {};
        const status = Object.assign({}, wasmStatus, {
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

    resolveWasmAutoplayObjective(signals) {
      return requireDoomWasmState("resolveObjective")(signals);
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
      this.autoplayStrategyName = status.strategyName || this.autoplayStrategyName;
      this.autoplayStrategyContext = status.strategyContext || this.autoplayStrategyContext || "unknown";
      this.autoplayStrategyPriority = status.strategyPriority || 0;
      this.autoplayDecisionStage = status.stage || status.controlPipeline || "Idle";
      this.autoplayEvidenceScore = Number.isFinite(Number(status.evidenceScore)) ? Number(status.evidenceScore) : 0;
      this.autoplaySemanticScores = status.semanticScores || status.semanticMemory?.symbols || this.autoplaySemanticScores || null;
      this.autoplayDecisionTrace = status.decisionTrace || this.autoplayDecisionTrace || null;
      this.autoplayControlPipeline = status.controlPipeline || "Idle";
      this.autoplayObjective = status.objective || this.autoplayObjective || "disabled";
      this.autoplayActiveDetections = Array.isArray(status.activeDetections) ? status.activeDetections : this.autoplayActiveDetections;
      this.autoplaySemanticMemory = status.semanticMemory || this.autoplaySemanticMemory || null;
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
        ? provider.getFramebufferTexture("doom")
        : null;
      const status = typeof provider.status === "function" ? provider.status() : null;
      provider.setFrameState("doom", {
        width: WIDTH,
        height: HEIGHT,
        format: texture ? "rgba8unorm-gpu-texture" : "paletted-8bit",
        frame: this.frameCount,
        pointer: this.framebufferPtr,
        bytes: FRAME_BYTES,
        zeroCopy: Boolean(texture) && status?.usingCpuFallback === false
      });
    }

    updateGpuHudOverlayState(state) {
      const provider = window.WebGpuComputeProvider || window.webGpuComputeProvider || window.aikernelWebGpuComputeProvider;
      if (typeof provider?.setHudOverlayState !== "function") {
        return;
      }

      const frame = state?.framebuffer || {};
      const probeTurn = this.resolveGpuHudProbeTurn();
      const kairos = Math.max(
        Number(this.autoplayTargetConfidence || 0),
        Number(this.autoplayCornerSignal || 0),
        this.autoplayWallUseProbeFrames > 0 ? 1 : 0,
        this.autoplayUsePulseFrames > 0 ? 0.9 : 0,
        this.autoplayRecoveryFrames > 0 ? 0.7 : 0
      );
      provider.setHudOverlayState({
        enabled: Boolean(this.autoplayEnabled && this.visualSensorEnabled && state),
        heatmapEnabled: Boolean(this.visualSensorEnabled),
        cells: this.createGpuHudCells(frame),
        kairos: this.clampHudUnit(kairos),
        useProbeTurn: probeTurn,
        enemyConfidence: this.clampHudUnit(Number(frame.enemyConfidence ?? this.autoplayEnemyConfidence ?? 0)),
        depthEstimate: Math.max(0, Math.min(1.5, Number(frame.depthEstimate ?? this.autoplayDepthEstimate ?? 1)))
      });
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

    createGpuHudCells(frame) {
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

    clampHudUnit(value) {
      const number = Number(value || 0);
      if (!Number.isFinite(number)) {
        return 0;
      }

      return Math.max(0, Math.min(1, number));
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

    scheduleAutoplayRetryDispatch(status) {
      requireDoomRetryDispatch("schedule")(this.autoplayRetryDispatch, status, {
        keys: AUTOPLAY_KEYS,
        enterKey: AUTOPLAY_RETRY_ENTER_KEY,
        tapFrames: AUTOPLAY_RETRY_TAP_FRAMES,
        runtimeState: this.state,
        senseOnly: this.autoplaySenseOnly,
        releaseInputs: () => this.releaseAutoplayInputs(),
        queueInput: (keycode, pressed) => this.queueInput(keycode, pressed),
        logQueued: reason => {
          this.log("[AUTOPLAY]", "log-warn", `retry dispatch queued: reason=${reason}.`);
          this.emitStatus("autoplay-retry-dispatch");
        }
      });
    }

    processAutoplayRetryDispatch() {
      return requireDoomRetryDispatch("process")(this.autoplayRetryDispatch, {
        cooldownFrames: AUTOPLAY_RETRY_COOLDOWN_FRAMES,
        releaseMoveInputs: () => this.releaseAutoplayMoveInputs(),
        queueInput: (keycode, pressed) => this.queueInput(keycode, pressed),
        logCompleted: reason => this.log("[AUTOPLAY]", "log-info", `retry dispatch completed: reason=${reason}.`)
      });
    }

    clearAutoplayRetryDispatch() {
      return requireDoomRetryDispatch("clear")(this.autoplayRetryDispatch, {
        keys: AUTOPLAY_KEYS,
        enterKey: AUTOPLAY_RETRY_ENTER_KEY,
        queueInput: (keycode, pressed) => this.queueInput(keycode, pressed)
      });
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
      if (this.webGpuFrameRenderer && typeof provider?.renderPalettedFrame === "function" && provider.renderPalettedFrame(indices)) {
        await this.waitForGpuQueue();
        await yieldToUi();
        return;
      }

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

  function delay(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  async function yieldToUi() {
    await delay(0);
  }

  async function initializeWebGpuProvider() {
    const provider = await ensureDoomRendererProvider();
    if (typeof provider?.initialize === "function") {
      await provider.initialize();
    }
  }

  let rendererProviderScriptLoading = null;

  async function ensureDoomRendererProvider(log) {
    let provider = window.WebGpuComputeProvider || window.webGpuComputeProvider || window.aikernelWebGpuComputeProvider;
    if (typeof provider?.initializeDoomRenderer === "function") {
      return provider;
    }

    if (typeof document !== "undefined") {
      rendererProviderScriptLoading ||= loadScript("/demo/doom/js/webgpu-provider.js?v=20260618-sensorpanel1")
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
      usingCpuFallback: !navigator.gpu,
      initialized: false,
      initializing: null,
      adapter: null,
      device: null,
      queue: null,
      lastError: "",
      async initialize() {
        if (this.initialized || this.initializing) {
          return this.initializing || this.status();
        }

        this.initializing = (async () => {
          if (!navigator.gpu) {
            this.usingCpuFallback = true;
            this.lastError = "navigator.gpu is unavailable.";
            return this.status();
          }

          try {
            this.adapter = await navigator.gpu.requestAdapter();
            if (!this.adapter) {
              this.usingCpuFallback = true;
              this.lastError = "WebGPU adapter is unavailable.";
              return this.status();
            }

            this.device = await this.adapter.requestDevice();
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
      setFrameState(target, state) {
        frameStates.set(target || "doom", Object.assign({
          providerId: this.providerId,
          backend: this.usingCpuFallback ? "cpu-fallback" : this.backendName,
          zeroCopy: false,
          updatedAt: performance.now()
        }, state || {}));
      },
      setDoomFrameTexture(texture) {
        if (texture) {
          frameTextures.set("doom", texture);
        } else {
          frameTextures.delete("doom");
        }
      },
      createBonsaiVisionBinding(target) {
        const name = target || "doom";
        const texture = frameTextures.get(name);
        if (texture && !this.usingCpuFallback) {
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
          backend: this.usingCpuFallback ? "cpu-fallback" : this.backendName,
          kind: "webgpu-state-buffer",
          zeroCopy: false,
          state: frameStates.get(name) || null
        };
      },
      getDoomFrameTexture() {
        return frameTextures.get("doom") || null;
      },
      getFramebufferTexture(target) {
        return frameTextures.get(target || "doom") || null;
      },
      getFrameStateBuffer(target) {
        return frameStates.get(target || "doom") || null;
      },
      status() {
        return {
          providerId: this.providerId,
          name: this.name,
          backend: this.usingCpuFallback ? "cpu-fallback" : this.backendName,
          supported: this.supported,
          initialized: this.initialized,
          usingCpuFallback: this.usingCpuFallback,
          lastError: this.lastError
        };
      }
    };

    window.WebGpuComputeProvider = provider;
    window.webGpuComputeProvider = provider;
    return provider;
  }

  function resolveRendererName() {
    ensureBrowserWebGpuComputeProvider();
    const provider = window.WebGpuComputeProvider || window.webGpuComputeProvider || window.aikernelWebGpuComputeProvider;
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
    ensureBrowserWebGpuComputeProvider();
    const provider = window.WebGpuComputeProvider || window.webGpuComputeProvider || window.aikernelWebGpuComputeProvider;
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
    ensureBrowserWebGpuComputeProvider();
    const provider = window.WebGpuComputeProvider || window.webGpuComputeProvider || window.aikernelWebGpuComputeProvider;
    return provider?.device?.queue || provider?.queue || navigator.gpu?.queue || null;
  }

  window.AIKernelDoomRuntime = AIKernelDoomRuntime;
  window.createAIKernelDoomRuntime = options => new AIKernelDoomRuntime(options);
})();
