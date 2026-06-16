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

  ensureBrowserWebGpuComputeProvider();

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
      this.wadMapHints = null;
      this.instance = null;
      this.exports = null;
      this.wadBytes = null;
      this.wadPtr = 0;
      this.wadMounted = false;
      this.initialized = false;
      this.modelLoaded = false;
      this.loadPromise = null;
      this.pendingInputEvents = [];
      this.inputState = new Map();
      this.manualInputUntil = new Map();
      this.autoplayUsePulseFrames = 0;
      this.autoplayUsePulseSpacingFrames = 0;
      this.autoplayRetrySequence = [];
      this.autoplayRetryWaitFrames = 0;
      this.autoplayRetryCooldownFrames = 0;
      this.autoplayRetryReason = "none";
      this.autoplayHealthRetryFrames = 0;
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
      this.lastDebugAudioAt = 0;
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
        watchdogRestarting: this.watchdogRestarting,
        watchdogRestarts: this.watchdogRestarts,
        watchdogLastStallMs: this.watchdogLastStallMs,
        inputReady: typeof this.exports?.doom_input === "function",
        actionInputReady: typeof this.exports?.doom_input_action === "function",
        autoplay: {
          enabled: this.autoplayEnabled,
          manualMove: this.autoplayManualMove,
          senseOnly: this.autoplaySenseOnly,
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
          retryDispatch: {
            active: this.autoplayRetrySequence.length > 0 || this.autoplayRetryWaitFrames > 0,
            cooldownFrames: this.autoplayRetryCooldownFrames,
            reason: this.autoplayRetryReason
          },
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
        framebuffer: `${WIDTH}x${HEIGHT} paletted-8bit`,
        lastError: this.lastError
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
      this.emitStatus("loading");
      this.loadPromise = (async () => {
        try {
          await this.loadRuntime();
          await this.loadModel();
          this.state = "ready";
          this.log("[ LOAD ]", "log-ok", "download/load complete: doom.wasm, DOOM1.WAD, and Bonsai model are validated.");
          this.emitStatus("ready");
          return this.status();
        } catch (error) {
          this.state = "failed";
          this.lastError = error instanceof Error ? error.message : String(error);
          this.log("[ FAIL ]", "log-fail", this.lastError);
          this.emitStatus("failed");
          throw error;
        } finally {
          this.loadPromise = null;
        }
      })();

      return this.loadPromise;
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

      this.moduleConfig = await fetchJson(this.moduleUrl);
      const baseUrl = new URL(this.moduleUrl, window.location.href);
      const moduleDir = new URL(".", baseUrl);
      const wasmPath = new URL(this.moduleConfig.entry, moduleDir).pathname;
      const wadPath = this.moduleConfig.wad?.hostedPath || new URL(this.moduleConfig.wad?.hostedFile || "DOOM1.WAD", moduleDir).pathname;

      const wasmBytes = await fetchBinary(wasmPath, {
        label: "doom.wasm",
        sizeBytes: this.moduleConfig.wasm?.sizeBytes,
        sha256: this.moduleConfig.wasm?.sha256
      });

      this.wadBytes = await fetchBinary(wadPath, {
        label: "DOOM1.WAD",
        sizeBytes: this.moduleConfig.wad?.sizeBytes,
        sha256: this.moduleConfig.wad?.sha256
      });
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

      this.modelManifest = await fetchJson(this.modelManifestUrl);
      this.autoplayProfile = await fetchJson(this.autoplayProfileUrl).catch(error => {
        this.log("[AUTOPLAY]", "log-warn", `autoplay profile unavailable: ${error instanceof Error ? error.message : String(error)}; using built-in defaults.`);
        return null;
      });
      await initializeWebGpuProvider();
      await fetchBinary(this.modelManifest.hostedFile, {
        label: this.modelManifest.name || this.modelManifest.upstreamFilename || "Bonsai-1.7B model",
        sizeBytes: this.modelManifest.sizeBytes,
        sha256: this.modelManifest.sha256
      });
      this.modelLoaded = true;
      this.bonsaiSupervisor?.configure(this.modelManifest, this.autoplayProfile);
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

    isNativeAudioAvailable() {
      return Boolean(
        this.exports
        && typeof this.exports.doom_audio_status === "function"
        && typeof this.exports.doom_audio_sample_rate === "function"
        && typeof this.exports.doom_audio_channels === "function"
        && typeof this.exports.doom_audio_buffer === "function"
        && typeof this.exports.doom_audio_capacity_frames === "function"
        && typeof this.exports.doom_audio_read_offset_frames === "function"
        && typeof this.exports.doom_audio_available_frames === "function"
        && typeof this.exports.doom_audio_consume_frames === "function"
      );
    }

    nativeAudioStatus() {
      return this.isNativeAudioAvailable() && typeof this.exports.doom_audio_status === "function"
        ? this.exports.doom_audio_status()
        : 0;
    }

    nativeAudioEventCount() {
      return this.isNativeAudioAvailable() && typeof this.exports.doom_audio_event_count === "function"
        ? this.exports.doom_audio_event_count()
        : 0;
    }

    nativeAudioAvailableFrames() {
      return this.isNativeAudioAvailable()
        ? this.exports.doom_audio_available_frames()
        : 0;
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
      if (requested && !this.bonsaiSupervisor) {
        this.autoplayLastError = "Bonsai supervisor script is unavailable.";
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
        this.log("[AUTOPLAY]", "log-ok", "Bonsai active: predicting next move...");
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
      return {
        visual: this.createSensorState("visual", "Aisthesis", "visual", "primary", true),
        audio: this.createSensorState("audio", "Aisthesis", "audio", "primary", true),
        motor: this.createSensorState("motor", "Kinesis", "motor", "primary", true),
        movement: this.createSensorState("movement", "Kinesis", "movement", "derived", true),
        compass: this.createSensorState("compass", "Hodos", "compass", "primary", true),
        spatial: this.createSensorState("spatial", "Topos", "spatial", "derived", true),
        health: this.createSensorState("health", "Zoe", "health", "primary", true)
      };
    }

    createSensorState(name, conceptName, englishName, category, enabled, observed = false, metadata = {}) {
      return {
        name,
        conceptName,
        englishName,
        category,
        enabled: Boolean(enabled),
        observed: Boolean(observed),
        metadata: Object.assign({}, metadata)
      };
    }

    createSensorStatusMap() {
      const clone = {};
      const keys = Object.keys(this.sensorInputs).sort();
      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index];
        const sensor = this.sensorInputs[key];
        if (sensor && typeof sensor === "object") {
          clone[key] = {
            name: sensor.name || key,
            conceptName: sensor.conceptName || this.sensorConceptName(key),
            englishName: sensor.englishName || key,
            category: sensor.category || this.sensorCategory(key),
            enabled: sensor.enabled !== false,
            observed: Boolean(sensor.observed),
            metadata: Object.assign({}, sensor.metadata || {})
          };
        } else {
          clone[key] = this.createSensorState(
            key,
            this.sensorConceptName(key),
            key,
            this.sensorCategory(key),
            sensor !== false);
        }
      }

      return clone;
    }

    sensorConceptName(kind) {
      if (kind === "visual" || kind === "audio") {
        return "Aisthesis";
      }

      if (kind === "motor" || kind === "movement") {
        return "Kinesis";
      }

      if (kind === "compass") {
        return "Hodos";
      }

      if (kind === "health") {
        return "Zoe";
      }

      return kind === "spatial" ? "Topos" : "";
    }

    sensorCategory(kind) {
      return kind === "movement" || kind === "spatial" ? "derived" : "primary";
    }

    isSensorEnabled(kind) {
      const normalized = this.normalizeSensorKind(kind);
      const sensor = this.sensorInputs[normalized];
      return sensor && typeof sensor === "object"
        ? sensor.enabled !== false
        : sensor !== false;
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
      const current = sensors[key] || this.createSensorState(
        key,
          this.sensorConceptName(key),
          key,
          this.sensorCategory(key),
          true);
      sensors[key] = {
        ...current,
        observed: Boolean(observed),
        metadata: Object.assign({}, current.metadata || {}, metadata)
      };
    }

    setSensorInput(kind, enabled) {
      const normalized = this.normalizeSensorKind(kind);
      const next = Boolean(enabled);
      const current = this.sensorInputs[normalized];
      this.sensorInputs[normalized] = current && typeof current === "object"
        ? {
          ...current,
          enabled: next
        }
        : this.createSensorState(
          normalized,
          this.sensorConceptName(normalized),
          normalized,
          this.sensorCategory(normalized),
          next);

      this.syncSensorFlagsFromMap();
      if (normalized === "visual") {
        this.visualSensorEnabled = this.isSensorEnabled("visual");
      } else if (normalized === "audio") {
        this.audioSensorEnabled = this.isSensorEnabled("audio");
        if (!this.audioSensorEnabled) {
          this.autoplaySoundCueActive = false;
          this.autoplayAuditorySnapshot = this.createNeutralAuditoryRuntimeSnapshot();
        }
      } else if (normalized === "motor") {
        this.motorSensorEnabled = this.isSensorEnabled("motor");
      } else if (normalized === "movement") {
        this.movementSensorEnabled = this.isSensorEnabled("movement");
      } else if (normalized === "compass") {
        this.compassSensorEnabled = this.isSensorEnabled("compass");
      } else if (normalized === "spatial") {
        this.spatialSensorEnabled = this.isSensorEnabled("spatial");
      } else if (normalized === "health") {
        this.healthSensorEnabled = this.isSensorEnabled("health");
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
      const normalized = String(kind || "").toLowerCase();
      if (normalized === "vision") {
        return "visual";
      }

      if (normalized === "auditory") {
        return "audio";
      }

      if (normalized === "move" || normalized === "movement-vector") {
        return "movement";
      }

      if (normalized === "heading" || normalized === "bearing") {
        return "compass";
      }

      return normalized || "unknown";
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
      if (!this.autoplayEnabled || !this.bonsaiSupervisor) {
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
        this.autoplayPending = true;
        this.autoplayMode = "predicting";
        this.bonsaiSupervisor.predict(state).then(action => {
          this.autoplayLastAction = self.AIKernelBonsai?.normalizeAction?.(action, this.autoplayLastAction) || action;
          const status = this.bonsaiSupervisor.status();
          this.autoplayPredictions = status.predictions;
          this.autoplayLastLatencyMs = status.lastLatencyMs;
          this.autoplayLastError = status.lastError || "";
          this.autoplaySafetyReason = status.safetyReason || "none";
          this.autoplayStuckFrames = status.stuckFrames || 0;
          this.autoplayRecoveryFrames = status.recoveryFrames || 0;
          this.autoplayMobilityMode = status.mobilityMode || "none";
          this.autoplayLoopEscapeFrames = status.loopEscapeFrames || 0;
          this.autoplayWallHugSide = status.wallHugSide || "left";
          this.autoplayTargetConfidence = status.targetConfidence || 0;
          this.autoplaySoundCueActive = Boolean(status.soundCueActive);
          this.autoplayAuditorySnapshot = status.auditorySnapshot || null;
          this.autoplaySpatialSnapshot = status.spatialSnapshot || null;
          this.autoplayVisionSensor = status.visionSensor || null;
          this.autoplayMotorSensor = status.motorSensor || null;
          this.autoplayMovementSensor = status.movementSensor || null;
          this.autoplayCompassSensor = status.compassSensor || null;
          this.autoplaySpatialSensor = status.spatialSensor || null;
          this.autoplayHealthSensor = status.healthSensor || this.autoplayHealthSensor;
          this.autoplayCtgCarrier = status.ctgCarrier || null;
          this.autoplayCtgObservedScores = status.ctgObservedScores || null;
          this.autoplayToposDecisionCarrier = status.toposDecisionCarrier || null;
          this.autoplayNousCarrier = status.nousCarrier || null;
          this.autoplayNousDetectorResult = status.nousDetectorResult || status.nousCarrier?.cognitionHints?.nousDetectorResult || null;
          this.autoplayRepeatActionFrames = status.repeatActionFrames || 0;
          this.autoplayRepeatTurnFrames = status.repeatTurnFrames || 0;
          this.autoplayQuantizedStallFrames = status.quantizedStallFrames || 0;
          this.autoplayQuantizedFrameChange = status.quantizedFrameChange ?? 255;
          this.autoplayRegionQuantizedFrameChange = status.regionQuantizedFrameChange ?? 255;
          this.autoplayStatusBarQuantizedFrameChange = status.statusBarQuantizedFrameChange ?? 255;
          this.autoplayRegionSignature = status.regionSignature || "000000";
          this.autoplayRegion9Signature = status.region9Signature || "000000000";
          this.autoplayVision9x9Signature = status.vision9x9Signature || "0".repeat(81);
          this.autoplayMotion9Signature = status.motion9Signature || "000000000";
          this.autoplayMotion9Delta = status.motion9Delta ?? 255;
          this.autoplayMotionForwardProgress = status.motionForwardProgress || 0;
          this.autoplayMotionObstacleScore = status.motionObstacleScore || 0;
          this.autoplayMotionTurnScore = status.motionTurnScore || 0;
          this.autoplayMotionEntranceScore = status.motionEntranceScore || 0;
          this.autoplayMotionStallScore = status.motionStallScore || 0;
          this.autoplayMotionIntent = status.motionIntent || "idle";
          this.autoplayDepthSignature = status.depthSignature || "0000";
          this.autoplayDepthEstimate = status.depthEstimate ?? 1;
          this.autoplayFaceSignature = status.faceSignature || "0000000000000000";
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
          this.autoplayStrategyContext = status.strategyContext || "unknown";
          this.autoplayStrategyPriority = status.strategyPriority || 0;
          this.autoplayControlPipeline = status.controlPipeline || "Idle";
          this.autoplayObjective = status.objective || "disabled";
          this.autoplayActiveDetections = Array.isArray(status.activeDetections) ? status.activeDetections : this.autoplayActiveDetections;
          this.autoplaySemanticMemory = status.semanticMemory || null;
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
        this.autoplayReused += 1;
      }

      if (this.processAutoplayRetryDispatch()) {
        return;
      }

      this.applyAutoplayAction(this.autoplayLastAction);
    }

    syncAutoplaySupervisorStatus() {
      const status = this.bonsaiSupervisor?.status?.();
      if (!status) {
        return;
      }

      this.autoplayStrategyName = status.strategyName || this.autoplayStrategyName;
      this.autoplayStrategyContext = status.strategyContext || this.autoplayStrategyContext;
      this.autoplayStrategyPriority = status.strategyPriority || this.autoplayStrategyPriority;
      this.autoplayControlPipeline = status.controlPipeline || this.autoplayControlPipeline;
      this.autoplayObjective = status.objective || this.autoplayObjective;
      this.autoplayActiveDetections = Array.isArray(status.activeDetections) ? status.activeDetections : this.autoplayActiveDetections;
      this.autoplaySemanticMemory = status.semanticMemory || this.autoplaySemanticMemory;
      this.autoplayAuditorySnapshot = status.auditorySnapshot || this.autoplayAuditorySnapshot;
      this.autoplaySpatialSnapshot = status.spatialSnapshot || this.autoplaySpatialSnapshot;
      this.autoplayVisionSensor = status.visionSensor || this.autoplayVisionSensor;
      this.autoplayMotorSensor = status.motorSensor || this.autoplayMotorSensor;
      this.autoplayMovementSensor = status.movementSensor || this.autoplayMovementSensor;
      this.autoplayCompassSensor = status.compassSensor || this.autoplayCompassSensor;
      this.autoplaySpatialSensor = status.spatialSensor || this.autoplaySpatialSensor;
      this.autoplayHealthSensor = status.healthSensor || this.autoplayHealthSensor;
      this.autoplayCtgCarrier = status.ctgCarrier || this.autoplayCtgCarrier;
      this.autoplayCtgObservedScores = status.ctgObservedScores || this.autoplayCtgObservedScores;
      this.autoplayToposDecisionCarrier = status.toposDecisionCarrier || this.autoplayToposDecisionCarrier;
      this.autoplayNousCarrier = status.nousCarrier || this.autoplayNousCarrier;
      this.autoplayNousDetectorResult = status.nousDetectorResult || status.nousCarrier?.cognitionHints?.nousDetectorResult || this.autoplayNousDetectorResult;
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
      return {
        active: false,
        leftEnergy: 0,
        rightEnergy: 0,
        balance: 0,
        dominantFreq: 0,
        lowEnergy: 0,
        midEnergy: 0,
        highEnergy: 0,
        dominantBand: "none",
        eventDetected: false,
        eventType: "none",
        timestamp: DEFAULT_SNAPSHOT_TIMESTAMP
      };
    }

    readBridgeAuditorySnapshot() {
      const bridge = self.AIKernelWasmAudioProvider || self.aikernelWasmAudioProvider;
      const status = typeof bridge?.status === "function" ? bridge.status() : null;
      return status?.lastSnapshot || null;
    }

    audioSnapshotAgeMs(snapshot) {
      if (!snapshot) {
        return Number.POSITIVE_INFINITY;
      }

      if (Number.isFinite(Number(snapshot.timestampMs)) && Number(snapshot.timestampMs) > 0) {
        return Date.now() - Number(snapshot.timestampMs);
      }

      const timestampMs = Date.parse(snapshot.timestamp || "");
      return Number.isFinite(timestampMs) && timestampMs > 0
        ? Date.now() - timestampMs
        : Number.POSITIVE_INFINITY;
    }

    audioSnapshotEnergy(snapshot) {
      return Math.max(
        Number(snapshot?.leftEnergy || 0),
        Number(snapshot?.rightEnergy || 0),
        Number(snapshot?.lowEnergy || 0),
        Number(snapshot?.midEnergy || 0),
        Number(snapshot?.highEnergy || 0));
    }

    createAuditoryRuntimeSnapshot() {
      const runtimeSnapshot = this.autoplayAuditorySnapshot || {};
      const bridgeSnapshot = this.readBridgeAuditorySnapshot();
      const runtimeFresh = this.audioSnapshotAgeMs(runtimeSnapshot) <= 1200;
      const bridgeFresh = this.audioSnapshotAgeMs(bridgeSnapshot) <= 1400;
      const runtimeEnergy = this.audioSnapshotEnergy(runtimeSnapshot);
      const bridgeEnergy = this.audioSnapshotEnergy(bridgeSnapshot);
      const snapshot = bridgeFresh && bridgeEnergy > Math.max(0.002, runtimeEnergy)
        ? bridgeSnapshot
        : runtimeSnapshot;
      const fresh = snapshot === bridgeSnapshot ? bridgeFresh : runtimeFresh;
      if (!fresh) {
        return this.createNeutralAuditoryRuntimeSnapshot();
      }

      return {
        active: Boolean(snapshot.eventDetected) || this.audioSnapshotEnergy(snapshot) > 0.002,
        leftEnergy: Number(snapshot.leftEnergy || 0),
        rightEnergy: Number(snapshot.rightEnergy || 0),
        balance: Number(snapshot.balance || 0),
        dominantFreq: Number(snapshot.dominantFreq || 0),
        lowEnergy: Number(snapshot.lowEnergy || 0),
        midEnergy: Number(snapshot.midEnergy || 0),
        highEnergy: Number(snapshot.highEnergy || 0),
        dominantBand: snapshot.dominantBand || "none",
        eventDetected: Boolean(snapshot.eventDetected),
        eventType: snapshot.eventType || "none",
        timestamp: snapshot.timestamp || (snapshot.timestampMs ? new Date(Number(snapshot.timestampMs)).toISOString() : DEFAULT_SNAPSHOT_TIMESTAMP)
      };
    }

    attachAudioRuntimeSource(audio) {
      const bridge = self.AIKernelWasmAudioProvider || self.aikernelWasmAudioProvider;
      if (typeof bridge?.uploadGpuAudioSnapshot === "function") {
        return bridge.uploadGpuAudioSnapshot("doom.audio", audio);
      }

      return {
        kind: "audio-state-buffer",
        zeroCopy: false,
        backend: "runtime-status"
      };
    }

    drainNativeAudio() {
      if (!this.isNativeAudioAvailable() || !this.nativeAudioStatus()) {
        return;
      }

      const available = Math.max(0, Math.floor(Number(this.exports.doom_audio_available_frames() || 0)));
      if (available <= 0) {
        return;
      }

      const bufferPtr = Number(this.exports.doom_audio_buffer() || 0);
      const capacity = Math.max(0, Math.floor(Number(this.exports.doom_audio_capacity_frames() || 0)));
      const readOffset = Math.max(0, Math.floor(Number(this.exports.doom_audio_read_offset_frames() || 0)));
      const sampleRate = Math.max(8000, Math.floor(Number(this.exports.doom_audio_sample_rate() || 44100)));
      const channels = Math.max(1, Math.min(2, Math.floor(Number(this.exports.doom_audio_channels() || 2))));
      const contiguous = Math.max(0, capacity - readOffset);
      const frames = Math.min(available, contiguous, 4096);

      if (!bufferPtr || !capacity || frames <= 0) {
        return;
      }

      const sampleCount = frames * channels;
      const byteOffset = bufferPtr + (readOffset * channels * 2);
      const source = new Int16Array(this.exports.memory.buffer, byteOffset, sampleCount);
      const samples = new Float32Array(sampleCount);
      let leftEnergy = 0;
      let rightEnergy = 0;

      for (let i = 0, j = 0; i < frames; i += 1, j += channels) {
        const left = source[j] / 32768;
        const right = channels > 1 ? source[j + 1] / 32768 : left;
        samples[j] = left;
        if (channels > 1) {
          samples[j + 1] = right;
        }
        leftEnergy += Math.abs(left);
        rightEnergy += Math.abs(right);
      }

      const consumed = this.exports.doom_audio_consume_frames(frames);
      if (consumed <= 0) {
        return;
      }

      leftEnergy = Math.min(1, leftEnergy / consumed);
      rightEnergy = Math.min(1, rightEnergy / consumed);
      const denominator = Math.max(0.0001, leftEnergy + rightEnergy);
      const balance = Math.max(-1, Math.min(1, (rightEnergy - leftEnergy) / denominator));
      const eventCount = this.nativeAudioEventCount();
      const snapshot = {
        active: true,
        leftEnergy: Math.round(leftEnergy * 1000) / 1000,
        rightEnergy: Math.round(rightEnergy * 1000) / 1000,
        balance: Math.round(balance * 1000) / 1000,
        dominantFreq: 0,
        lowEnergy: Math.round(Math.max(leftEnergy, rightEnergy) * 0.38 * 1000) / 1000,
        midEnergy: Math.round(Math.max(leftEnergy, rightEnergy) * 0.72 * 1000) / 1000,
        highEnergy: Math.round(Math.max(leftEnergy, rightEnergy) * 0.28 * 1000) / 1000,
        dominantBand: "mid",
        eventDetected: eventCount !== this.nativeAudioLastEventCount || Math.max(leftEnergy, rightEnergy) > 0.01,
        eventType: "native-sfx",
        timestamp: new Date().toISOString()
      };

      this.nativeAudioLastEventCount = eventCount;
      this.nativeAudioFramesDrained += consumed;
      this.nativeAudioLastSnapshot = snapshot;
      this.autoplayAuditorySnapshot = snapshot;

      if (!this.nativeAudioLogged) {
        this.nativeAudioLogged = true;
        this.log("[AUDIO]", "log-ok", `native SFX bridge active: ${sampleRate}Hz/${channels}ch ring buffer.`);
      }

      if (this.audioPlaybackMuted) {
        return;
      }

      const bridge = self.AIKernelWasmAudioProvider || self.aikernelWasmAudioProvider;
      if (typeof bridge?.playPcm === "function") {
        bridge.playPcm({
          samples,
          frames: consumed,
          channels,
          sampleRate,
          snapshot
        });
      }
    }

    scheduleAutoplayRetryDispatch(status) {
      if (this.autoplaySenseOnly || this.state !== "running") {
        return;
      }

      if (this.autoplayRetryCooldownFrames > 0) {
        this.autoplayRetryCooldownFrames -= 1;
      }

      const healthRetryRequested = Boolean(
        status?.healthSensor?.retryRequested &&
        (status?.healthSensor?.likelyDead || status?.healthSensor?.retryReason !== "none"));
      this.autoplayHealthRetryFrames = healthRetryRequested
        ? Math.min(12, Number(this.autoplayHealthRetryFrames || 0) + 1)
        : 0;
      const retryRequested = healthRetryRequested;
      if (!retryRequested) {
        if (this.autoplayRetrySequence.length > 0 || this.autoplayRetryWaitFrames > 0) {
          this.clearAutoplayRetryDispatch();
        }
        return;
      }
      if (this.autoplayHealthRetryFrames < 3) {
        return;
      }
      if (!retryRequested || this.autoplayRetrySequence.length > 0 || this.autoplayRetryWaitFrames > 0 || this.autoplayRetryCooldownFrames > 0) {
        return;
      }

      this.autoplayRetryReason = status?.healthSensor?.retryReason || "health-death";
      this.releaseAutoplayInputs();
      this.autoplayRetrySequence = [];
      for (let index = 0; index < 3; index += 1) {
        this.autoplayRetrySequence.push(
          { keycode: AUTOPLAY_KEYS.use, pressed: true },
          { waitFrames: AUTOPLAY_RETRY_TAP_FRAMES },
          { keycode: AUTOPLAY_KEYS.use, pressed: false },
          { waitFrames: AUTOPLAY_RETRY_TAP_FRAMES },
          { keycode: AUTOPLAY_RETRY_ENTER_KEY, pressed: true },
          { waitFrames: AUTOPLAY_RETRY_TAP_FRAMES },
          { keycode: AUTOPLAY_RETRY_ENTER_KEY, pressed: false },
          { waitFrames: AUTOPLAY_RETRY_TAP_FRAMES });
      }

      this.log("[AUTOPLAY]", "log-warn", `retry dispatch queued: reason=${this.autoplayRetryReason}.`);
      this.emitStatus("autoplay-retry-dispatch");
    }

    processAutoplayRetryDispatch() {
      if (this.autoplayRetryWaitFrames > 0) {
        this.autoplayRetryWaitFrames -= 1;
        this.releaseAutoplayMoveInputs();
        return true;
      }

      if (this.autoplayRetrySequence.length <= 0) {
        return false;
      }

      const step = this.autoplayRetrySequence.shift();
      if (step.waitFrames) {
        this.autoplayRetryWaitFrames = step.waitFrames;
        this.releaseAutoplayMoveInputs();
        return true;
      }

      this.queueInput(step.keycode, step.pressed);
      if (this.autoplayRetrySequence.length <= 0) {
        this.autoplayRetryCooldownFrames = AUTOPLAY_RETRY_COOLDOWN_FRAMES;
        this.log("[AUTOPLAY]", "log-info", `retry dispatch completed: reason=${this.autoplayRetryReason}.`);
      }

      return true;
    }

    clearAutoplayRetryDispatch() {
      this.autoplayRetrySequence = [];
      this.autoplayRetryWaitFrames = 0;
      this.autoplayRetryCooldownFrames = 0;
      this.autoplayRetryReason = "none";
      this.queueInput(AUTOPLAY_KEYS.use, false);
      this.queueInput(AUTOPLAY_RETRY_ENTER_KEY, false);
    }

    applyAutoplayAction(action) {
      const normalized = self.AIKernelBonsai?.normalizeAction?.(action, this.autoplayLastAction) || action || {};
      if (this.autoplaySenseOnly) {
        this.clearAutoplayRetryDispatch();
        this.releaseAutoplayInputs();
        return;
      }

      const move = normalized.move === "forward" ? 1 : (normalized.move === "back" ? -1 : 0);
      const turn = normalized.turn === "right" ? 1 : (normalized.turn === "left" ? -1 : 0);
      const aiMoveAllowed = !this.autoplayManualMove;
      const usePressed = this.resolveAutoplayUsePulse(Boolean(normalized.use));
      const desired = {
        forward: aiMoveAllowed && normalized.move === "forward",
        back: aiMoveAllowed && normalized.move === "back",
        left: aiMoveAllowed && normalized.turn === "left",
        right: aiMoveAllowed && normalized.turn === "right",
        fire: Boolean(normalized.fire),
        strafe: aiMoveAllowed && Boolean(normalized.strafe),
        use: usePressed,
        run: Boolean(normalized.run)
      };

      if (typeof this.exports?.doom_input_action === "function" && aiMoveAllowed) {
        const result = this.exports.doom_input_action(move, turn, normalized.fire ? 1 : 0, normalized.strafe ? 1 : 0);
        if (result === OK) {
          if (!this.isManualInputActive(AUTOPLAY_KEYS.use)) {
            this.queueInput(AUTOPLAY_KEYS.use, desired.use);
          }
          if (!this.isManualInputActive(AUTOPLAY_KEYS.run)) {
            this.queueInput(AUTOPLAY_KEYS.run, desired.run);
          }
          this.handleDebugAudioPlayback();
          return;
        }
      }

      for (const [name, keycode] of Object.entries(AUTOPLAY_KEYS)) {
        if (this.autoplayManualMove && (name === "forward" || name === "back" || name === "left" || name === "right" || name === "strafe")) {
          continue;
        }
        if (this.isManualInputActive(keycode)) {
          continue;
        }
        this.queueInput(keycode, desired[name]);
      }
      this.handleDebugAudioPlayback();
    }

    handleDebugAudioPlayback() {
      if (this.audioPlaybackMuted) {
        return;
      }

      const snapshot = this.autoplayAuditorySnapshot;
      if (!snapshot?.eventDetected || Math.max(Number(snapshot.leftEnergy || 0), Number(snapshot.rightEnergy || 0)) < 0.08) {
        return;
      }

      const now = self.performance?.now?.() || Date.now();
      if (this.lastDebugAudioAt && now - this.lastDebugAudioAt < 160) {
        return;
      }

      this.lastDebugAudioAt = now;
      const bridge = self.AIKernelWasmAudioProvider || self.aikernelWasmAudioProvider;
      if (typeof bridge?.playSpatialCue === "function") {
        bridge.playSpatialCue(snapshot);
      }
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
      if (typeof this.exports?.doom_input_action === "function") {
        this.exports.doom_input_action(0, 0, 0, 0);
      }

      for (const name of ["forward", "back", "left", "right", "strafe"]) {
        this.queueInput(AUTOPLAY_KEYS[name], false);
      }
    }

    releaseAutoplayInputs() {
      if (typeof this.exports?.doom_input_action === "function") {
        this.exports.doom_input_action(0, 0, 0, 0);
      }

      this.autoplayUsePulseFrames = 0;
      this.autoplayUsePulseSpacingFrames = 0;
      for (const keycode of Object.values(AUTOPLAY_KEYS)) {
        this.queueInput(keycode, false);
      }
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
      const runtime = this;

      function memoryView() {
        return new DataView(runtime.exports.memory.buffer);
      }

      function writeU32(ptr, value) {
        memoryView().setUint32(ptr, value, true);
      }

      function writeU64(ptr, value) {
        memoryView().setBigUint64(ptr, BigInt(value), true);
      }

      function fdWrite(fd, iovs, iovsLen, nwritten) {
        let written = 0;
        const memory = new Uint8Array(runtime.exports.memory.buffer);
        const view = memoryView();
        const chunks = [];
        let captured = 0;
        for (let index = 0; index < iovsLen; index += 1) {
          const iov = iovs + index * 8;
          const ptr = view.getUint32(iov, true);
          const len = view.getUint32(iov + 4, true);
          written += len;
          if (captured < 2048) {
            const take = Math.min(len, 2048 - captured);
            chunks.push(memory.slice(ptr, ptr + take));
            captured += take;
          }
        }

        if (chunks.length) {
          const text = new TextDecoder().decode(concatBytes(chunks)).trim();
          if (text) {
            console[fd === 2 ? "warn" : "log"](text);
          }
        }

        writeU32(nwritten, written);
        return 0;
      }

      return {
        env: {
          emscripten_sleep: () => 0,
          emscripten_notify_memory_growth: () => {},
          __syscall_unlinkat: () => 0,
          __syscall_rmdir: () => 0,
          __syscall_renameat: () => 0,
          _emscripten_system: () => 0
        },
        wasi_snapshot_preview1: {
          args_sizes_get: (argc, argvBufSize) => {
            writeU32(argc, 0);
            writeU32(argvBufSize, 0);
            return 0;
          },
          args_get: () => 0,
          proc_exit: (code) => {
            throw new Error(`WASI proc_exit(${code})`);
          },
          clock_time_get: (_clockId, _precision, timePtr) => {
            writeU64(timePtr, BigInt(Date.now()) * 1000000n);
            return 0;
          },
          fd_write: fdWrite,
          fd_read: (_fd, _iovs, _iovsLen, nread) => {
            writeU32(nread, 0);
            return 0;
          },
          fd_close: () => 0,
          fd_seek: (_fd, _offset, _whence, newOffset) => {
            writeU64(newOffset, 0);
            return 0;
          }
        }
      };
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`failed to fetch ${url}: ${response.status}`);
    }
    return response.json();
  }

  async function fetchBinary(url, expected) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`failed to fetch ${expected.label}: ${response.status}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (expected.sizeBytes && bytes.length !== expected.sizeBytes) {
      throw new Error(`${expected.label} size mismatch: got ${bytes.length}, expected ${expected.sizeBytes}`);
    }

    if (expected.sha256) {
      const actual = await sha256(bytes);
      if (actual !== expected.sha256.toLowerCase()) {
        throw new Error(`${expected.label} sha256 mismatch: got ${actual}, expected ${expected.sha256}`);
      }
    }

    return bytes;
  }

  async function sha256(bytes) {
    if (!window.crypto?.subtle) {
      throw new Error("WebCrypto SHA-256 is unavailable; hosted asset validation cannot proceed.");
    }

    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function parseWadMapHints(wadBytes, mapName) {
    const directory = readWadDirectory(wadBytes);
    if (!directory?.length) {
      return null;
    }

    const mapIndex = directory.findIndex(entry => entry.name === mapName);
    if (mapIndex < 0) {
      return null;
    }

    const lumps = new Map();
    for (let index = mapIndex + 1; index < directory.length; index += 1) {
      const entry = directory[index];
      if (/^E\dM\d$/.test(entry.name) || /^MAP\d\d$/.test(entry.name)) {
        break;
      }

      lumps.set(entry.name, entry);
    }

    const linedefs = parseLinedefs(wadBytes, lumps.get("LINEDEFS"));
    const vertexes = parseVertexes(wadBytes, lumps.get("VERTEXES"));
    const sidedefs = parseSidedefs(wadBytes, lumps.get("SIDEDEFS"));
    const sectors = parseSectors(wadBytes, lumps.get("SECTORS"));
    const things = parseThings(wadBytes, lumps.get("THINGS"));
    const textureRoles = buildTextureRoles(linedefs, sidedefs, sectors);
    const doorLines = linedefs.filter(line => isDoorSpecial(line.special));
    const switchLines = linedefs.filter(line => isSwitchSpecial(line.special));
    const exitLines = linedefs.filter(line => isExitSpecial(line.special));

    return {
      map: mapName,
      source: "DOOM1.WAD static lump analysis",
      lumps: Array.from(lumps.keys()),
      counts: {
        things: things.length,
        linedefs: linedefs.length,
        vertexes: vertexes.length,
        sidedefs: sidedefs.length,
        sectors: sectors.length
      },
      playerStart: summarizePlayerStart(things),
      firstDoor: summarizeNearestDoor(doorLines, sidedefs, vertexes, summarizePlayerStart(things)),
      darkSectors: summarizeDarkSectors(sectors),
      enemyThings: summarizeEnemyThings(things),
      doorLines: doorLines.length,
      switchLines: switchLines.length,
      exitLines: exitLines.length,
      doorSpecials: summarizeSpecials(doorLines),
      switchSpecials: summarizeSpecials(switchLines),
      exitSpecials: summarizeSpecials(exitLines),
      thingTypes: summarizeThings(things),
      textureRoles,
      doorTextures: textureRoles.filter(role => role.role === "door").map(role => role.texture),
      switchTextures: textureRoles.filter(role => role.role === "switch").map(role => role.texture),
      generatedAt: new Date().toISOString()
    };
  }

  function readWadDirectory(wadBytes) {
    if (wadBytes.length < 12) {
      return [];
    }

    const view = new DataView(wadBytes.buffer, wadBytes.byteOffset, wadBytes.byteLength);
    const lumpCount = view.getInt32(4, true);
    const directoryOffset = view.getInt32(8, true);
    if (lumpCount <= 0 || directoryOffset <= 0 || directoryOffset + lumpCount * 16 > wadBytes.length) {
      return [];
    }

    const directory = [];
    for (let index = 0; index < lumpCount; index += 1) {
      const entry = directoryOffset + index * 16;
      directory.push({
        name: readWadName(wadBytes, entry + 8),
        offset: view.getInt32(entry, true),
        size: view.getInt32(entry + 4, true)
      });
    }

    return directory;
  }

  function parseLinedefs(wadBytes, lump) {
    if (!isValidLump(wadBytes, lump, 14)) {
      return [];
    }

    const view = new DataView(wadBytes.buffer, wadBytes.byteOffset + lump.offset, lump.size);
    const lines = [];
    for (let offset = 0; offset + 14 <= lump.size; offset += 14) {
      lines.push({
        startVertex: view.getInt16(offset, true),
        endVertex: view.getInt16(offset + 2, true),
        flags: view.getInt16(offset + 4, true),
        special: view.getInt16(offset + 6, true),
        tag: view.getInt16(offset + 8, true),
        rightSidedef: view.getInt16(offset + 10, true),
        leftSidedef: view.getInt16(offset + 12, true)
      });
    }

    return lines;
  }

  function parseVertexes(wadBytes, lump) {
    if (!isValidLump(wadBytes, lump, 4)) {
      return [];
    }

    const view = new DataView(wadBytes.buffer, wadBytes.byteOffset + lump.offset, lump.size);
    const vertexes = [];
    for (let offset = 0; offset + 4 <= lump.size; offset += 4) {
      vertexes.push({
        x: view.getInt16(offset, true),
        y: view.getInt16(offset + 2, true)
      });
    }

    return vertexes;
  }

  function parseSidedefs(wadBytes, lump) {
    if (!isValidLump(wadBytes, lump, 30)) {
      return [];
    }

    const view = new DataView(wadBytes.buffer, wadBytes.byteOffset + lump.offset, lump.size);
    const sides = [];
    for (let offset = 0; offset + 30 <= lump.size; offset += 30) {
      sides.push({
        xOffset: view.getInt16(offset, true),
        yOffset: view.getInt16(offset + 2, true),
        upper: readWadName(wadBytes, lump.offset + offset + 4),
        lower: readWadName(wadBytes, lump.offset + offset + 12),
        middle: readWadName(wadBytes, lump.offset + offset + 20),
        sector: view.getInt16(offset + 28, true)
      });
    }

    return sides;
  }

  function parseSectors(wadBytes, lump) {
    if (!isValidLump(wadBytes, lump, 26)) {
      return [];
    }

    const view = new DataView(wadBytes.buffer, wadBytes.byteOffset + lump.offset, lump.size);
    const sectors = [];
    for (let offset = 0; offset + 26 <= lump.size; offset += 26) {
      sectors.push({
        floorHeight: view.getInt16(offset, true),
        ceilingHeight: view.getInt16(offset + 2, true),
        floorTexture: readWadName(wadBytes, lump.offset + offset + 4),
        ceilingTexture: readWadName(wadBytes, lump.offset + offset + 12),
        lightLevel: view.getInt16(offset + 20, true),
        special: view.getInt16(offset + 22, true),
        tag: view.getInt16(offset + 24, true)
      });
    }

    return sectors;
  }

  function parseThings(wadBytes, lump) {
    if (!isValidLump(wadBytes, lump, 10)) {
      return [];
    }

    const view = new DataView(wadBytes.buffer, wadBytes.byteOffset + lump.offset, lump.size);
    const things = [];
    for (let offset = 0; offset + 10 <= lump.size; offset += 10) {
      things.push({
        x: view.getInt16(offset, true),
        y: view.getInt16(offset + 2, true),
        angle: view.getInt16(offset + 4, true),
        type: view.getInt16(offset + 6, true),
        flags: view.getInt16(offset + 8, true)
      });
    }

    return things;
  }

  function buildTextureRoles(linedefs, sidedefs, sectors) {
    const roleByTexture = new Map();
    const remember = (texture, role, weight) => {
      if (!texture || texture === "-") {
        return;
      }

      const current = roleByTexture.get(texture) || { texture, role, door: 0, switch: 0, exit: 0, wall: 0, sector: 0 };
      current[role] += weight;
      if (current.door >= current.switch && current.door >= current.exit && current.door >= current.wall) {
        current.role = "door";
      } else if (current.switch >= current.exit && current.switch >= current.wall) {
        current.role = "switch";
      } else if (current.exit >= current.wall) {
        current.role = "exit";
      } else {
        current.role = "wall";
      }
      roleByTexture.set(texture, current);
    };

    for (const line of linedefs) {
      const role = isDoorSpecial(line.special)
        ? "door"
        : (isSwitchSpecial(line.special) ? "switch" : (isExitSpecial(line.special) ? "exit" : "wall"));
      const weight = role === "wall" ? 1 : 8;
      for (const sideIndex of [line.rightSidedef, line.leftSidedef]) {
        if (sideIndex < 0 || sideIndex >= sidedefs.length) {
          continue;
        }

        const side = sidedefs[sideIndex];
        remember(side.upper, role, weight);
        remember(side.lower, role, weight);
        remember(side.middle, role, weight);
      }
    }

    for (const sector of sectors) {
      remember(sector.floorTexture, "sector", 1);
      remember(sector.ceilingTexture, "sector", 1);
    }

    return Array.from(roleByTexture.values())
      .sort((left, right) => roleRank(left.role) - roleRank(right.role) || right.door + right.switch + right.exit - (left.door + left.switch + left.exit))
      .slice(0, 96);
  }

  function isValidLump(wadBytes, lump, recordSize) {
    return Boolean(lump)
      && lump.size >= recordSize
      && lump.offset >= 0
      && lump.offset + lump.size <= wadBytes.length;
  }

  function isDoorSpecial(special) {
    return new Set([1, 26, 27, 28, 31, 32, 33, 34, 46, 61, 63, 86, 90, 103, 106, 108, 109, 117, 118]).has(Number(special));
  }

  function isSwitchSpecial(special) {
    return new Set([7, 9, 11, 14, 15, 18, 20, 21, 23, 29, 41, 42, 43, 45, 49, 50, 51, 55, 71, 101, 102, 103, 111, 112, 113, 114, 115, 116, 122, 123]).has(Number(special));
  }

  function isExitSpecial(special) {
    return new Set([11, 51, 52, 124]).has(Number(special));
  }

  function summarizeSpecials(lines) {
    const counts = new Map();
    for (const line of lines) {
      counts.set(line.special, (counts.get(line.special) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((left, right) => Number(left[0]) - Number(right[0]))
      .map(([special, count]) => ({ special: Number(special), count }));
  }

  function summarizeThings(things) {
    const counts = new Map();
    for (const thing of things) {
      counts.set(thing.type, (counts.get(thing.type) || 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((left, right) => Number(left[0]) - Number(right[0]))
      .map(([type, count]) => ({ type: Number(type), count }));
  }

  function summarizeDarkSectors(sectors) {
    return sectors
      .map((sector, index) => ({
        id: index,
        lightLevel: sector.lightLevel,
        floorTexture: sector.floorTexture,
        ceilingTexture: sector.ceilingTexture
      }))
      .filter(sector => sector.lightLevel <= 128)
      .sort((left, right) => left.lightLevel - right.lightLevel)
      .slice(0, 16);
  }

  function summarizeEnemyThings(things) {
    return things
      .filter(thing => isEnemyThingType(thing.type))
      .map(thing => ({
        x: thing.x,
        y: thing.y,
        angle: thing.angle,
        type: thing.type,
        flags: thing.flags
      }))
      .slice(0, 64);
  }

  function isEnemyThingType(type) {
    return new Set([9, 16, 58, 3001, 3002, 3003, 3004, 3005, 3006]).has(Number(type));
  }

  function summarizePlayerStart(things) {
    const start = things.find(thing => thing.type === 1);
    return start ? {
      x: start.x,
      y: start.y,
      angle: start.angle
    } : null;
  }

  function summarizeNearestDoor(doorLines, sidedefs, vertexes, playerStart) {
    if (!playerStart || !doorLines.length || !vertexes.length) {
      return null;
    }

    let best = null;
    for (const line of doorLines) {
      const start = vertexes[line.startVertex];
      const end = vertexes[line.endVertex];
      if (!start || !end) {
        continue;
      }

      const centerX = (start.x + end.x) / 2;
      const centerY = (start.y + end.y) / 2;
      const distance = Math.hypot(centerX - playerStart.x, centerY - playerStart.y);
      const angle = normalizeDegrees(Math.atan2(centerY - playerStart.y, centerX - playerStart.x) * 180 / Math.PI);
      const relativeAngle = normalizeSignedDegrees(angle - Number(playerStart.angle || 0));
      const side = sidedefs[line.rightSidedef] || null;
      const candidate = {
        distance: round2(distance),
        angle: round2(angle),
        relativeAngle: round2(relativeAngle),
        special: line.special,
        tag: line.tag,
        texture: side?.middle || "",
        center: { x: round2(centerX), y: round2(centerY) }
      };
      if (!best || candidate.distance < best.distance) {
        best = candidate;
      }
    }

    return best;
  }

  function normalizeDegrees(value) {
    return ((Number(value || 0) % 360) + 360) % 360;
  }

  function normalizeSignedDegrees(value) {
    return ((Number(value || 0) + 540) % 360) - 180;
  }

  function round2(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function roleRank(role) {
    return role === "door" ? 0 : (role === "switch" ? 1 : (role === "exit" ? 2 : 3));
  }

  function parsePlaypal(wadBytes) {
    if (wadBytes.length < 12) {
      return null;
    }

    const view = new DataView(wadBytes.buffer, wadBytes.byteOffset, wadBytes.byteLength);
    const lumpCount = view.getInt32(4, true);
    const directoryOffset = view.getInt32(8, true);
    if (lumpCount <= 0 || directoryOffset <= 0 || directoryOffset + lumpCount * 16 > wadBytes.length) {
      return null;
    }

    for (let index = 0; index < lumpCount; index += 1) {
      const entry = directoryOffset + index * 16;
      const offset = view.getInt32(entry, true);
      const size = view.getInt32(entry + 4, true);
      const name = readWadName(wadBytes, entry + 8);
      if (name === "PLAYPAL" && size >= 768 && offset + 768 <= wadBytes.length) {
        return wadBytes.slice(offset, offset + 768);
      }
    }

    return null;
  }

  function readWadName(bytes, offset) {
    let name = "";
    for (let index = 0; index < 8; index += 1) {
      const byte = bytes[offset + index];
      if (!byte) {
        break;
      }
      name += String.fromCharCode(byte);
    }
    return name;
  }

  function defaultPalette() {
    const palette = new Uint8Array(256 * 3);
    for (let index = 0; index < 256; index += 1) {
      palette[index * 3] = index;
      palette[index * 3 + 1] = index;
      palette[index * 3 + 2] = index;
    }
    return palette;
  }

  function buildPaletteCache(palette) {
    const rgba32 = new Uint32Array(256);
    const rgbaBytes = new Uint8ClampedArray(256 * 4);

    for (let index = 0; index < 256; index += 1) {
      const source = index * 3;
      const target = index * 4;
      const red = palette[source] || 0;
      const green = palette[source + 1] || 0;
      const blue = palette[source + 2] || 0;

      rgbaBytes[target] = red;
      rgbaBytes[target + 1] = green;
      rgbaBytes[target + 2] = blue;
      rgbaBytes[target + 3] = 255;
      rgba32[index] = 0xff000000 | (blue << 16) | (green << 8) | red;
    }

    return { rgba32, rgbaBytes };
  }

  function concatBytes(chunks) {
    const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
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
      rendererProviderScriptLoading ||= loadScript("/demo/doom/js/webgpu-provider.js?v=20260612-doomweb3")
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
})();
