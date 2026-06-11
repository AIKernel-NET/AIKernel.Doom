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
    use: 32,
    run: 0xb6
  };
  const IS_LITTLE_ENDIAN = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;

  ensureBrowserWebGpuComputeProvider();

  class AIKernelDoomRuntime {
    constructor(options) {
      this.canvas = options.canvas;
      this.moduleUrl = options.moduleUrl || "/demo/doom/module.json";
      this.modelManifestUrl = options.modelManifestUrl || "/models/bonsai1.7b/manifest.json";
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
      this.autoplayRepeatActionFrames = 0;
      this.autoplayRepeatTurnFrames = 0;
      this.autoplayQuantizedStallFrames = 0;
      this.autoplayQuantizedFrameChange = 255;
      this.autoplayRegionQuantizedFrameChange = 255;
      this.autoplayStatusBarQuantizedFrameChange = 255;
      this.autoplayRegionSignature = "000000";
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
      this.autoplayEnemyConfidence = 0;
      this.autoplayEnemyTurn = "none";
      this.autoplayEnemyDistance = 1;
      this.autoplayEnemyCluster = "none";
      this.autoplayEnemyFireReady = false;
      this.autoplayStrategyName = "SensorFusionStrafeProbeV3";
      this.autoplayStrategyContext = "unknown";
      this.autoplayStrategyPriority = 0;
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
          mobilityMode: this.autoplayMobilityMode,
          wallHugSide: this.autoplayWallHugSide,
          targetConfidence: this.autoplayTargetConfidence,
          soundCueActive: this.autoplaySoundCueActive,
          repeatActionFrames: this.autoplayRepeatActionFrames,
          repeatTurnFrames: this.autoplayRepeatTurnFrames,
          quantizedStallFrames: this.autoplayQuantizedStallFrames,
          quantizedFrameChange: this.autoplayQuantizedFrameChange,
          regionQuantizedFrameChange: this.autoplayRegionQuantizedFrameChange,
          statusBarQuantizedFrameChange: this.autoplayStatusBarQuantizedFrameChange,
          regionSignature: this.autoplayRegionSignature,
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
          enemyConfidence: this.autoplayEnemyConfidence,
          enemyTurn: this.autoplayEnemyTurn,
          enemyDistance: this.autoplayEnemyDistance,
          enemyCluster: this.autoplayEnemyCluster,
          enemyFireReady: this.autoplayEnemyFireReady,
          strategyName: this.autoplayStrategyName,
          strategyContext: this.autoplayStrategyContext,
          strategyPriority: this.autoplayStrategyPriority,
          action: this.autoplayLastAction,
          lastError: this.autoplayLastError
        },
        gpuDelegate: resolveGpuDelegateName(),
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

      const imports = this.createImports();
      const result = await WebAssembly.instantiate(wasmBytes, imports);
      this.instance = result.instance;
      this.exports = result.instance.exports;
      this.assertExports();
      this.log("[ WASM ]", "log-ok", "doom.wasm instantiated and ABI exports linked.");
      this.log("[  WAD ]", "log-ok", "DOOM1.WAD validated and ready for memory-backed mount.");
    }

    async loadModel() {
      if (this.modelLoaded) {
        return;
      }

      this.modelManifest = await fetchJson(this.modelManifestUrl);
      await initializeWebGpuProvider();
      await fetchBinary(this.modelManifest.hostedFile, {
        label: this.modelManifest.name || this.modelManifest.upstreamFilename || "Bonsai-1.7B model",
        sizeBytes: this.modelManifest.sizeBytes,
        sha256: this.modelManifest.sha256
      });
      this.modelLoaded = true;
      this.bonsaiSupervisor?.configure(this.modelManifest);
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
      this.autoplayPending = false;
      this.autoplayMode = requested ? "idle" : "disabled";
      this.bonsaiSupervisor?.setEnabled(requested);

      if (requested) {
        this.log("[AUTOPLAY]", "log-ok", "Bonsai active: predicting next move...");
      } else {
        this.releaseAutoplayInputs();
        this.autoplayLastAction = self.AIKernelBonsai?.neutralAction?.() || this.autoplayLastAction;
        this.autoplayMobilityMode = "none";
        this.autoplayLoopEscapeFrames = 0;
        this.autoplayTargetConfidence = 0;
        this.autoplaySoundCueActive = false;
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
        this.autoplayEnemyConfidence = 0;
        this.autoplayEnemyTurn = "none";
        this.autoplayEnemyDistance = 1;
        this.autoplayEnemyCluster = "none";
        this.autoplayEnemyFireReady = false;
        this.log("[AUTOPLAY]", "log-info", "Bonsai idle: manual control restored.");
      }

      this.emitStatus(requested ? "autoplay-on" : "autoplay-off");
      return this.status();
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
      const useGpuVision = Boolean(gpuVision?.zeroCopy);
      this.autoplayVisionMode = useGpuVision
        ? gpuVision.kind
        : (gpuVision?.kind ? `${gpuVision.kind}:cpu-frame-sample` : "cpu-frame-sample");
      this.autoplayVisionZeroCopy = useGpuVision;
      this.logAutoplayVisionPath();
      const indices = useGpuVision ? null : frameIndices;
      if (!this.autoplayPending) {
        const state = this.createAutoplayState(indices, useGpuVision ? gpuVision : null);
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
          this.autoplayRepeatActionFrames = status.repeatActionFrames || 0;
          this.autoplayRepeatTurnFrames = status.repeatTurnFrames || 0;
          this.autoplayQuantizedStallFrames = status.quantizedStallFrames || 0;
          this.autoplayQuantizedFrameChange = status.quantizedFrameChange ?? 255;
          this.autoplayRegionQuantizedFrameChange = status.regionQuantizedFrameChange ?? 255;
          this.autoplayStatusBarQuantizedFrameChange = status.statusBarQuantizedFrameChange ?? 255;
          this.autoplayRegionSignature = status.regionSignature || "000000";
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
          this.autoplayEnemyConfidence = status.enemyConfidence || 0;
          this.autoplayEnemyTurn = status.enemyTurn || "none";
          this.autoplayEnemyDistance = status.enemyDistance ?? 1;
          this.autoplayEnemyCluster = status.enemyCluster || "none";
          this.autoplayEnemyFireReady = Boolean(status.enemyFireReady);
          this.autoplayStrategyName = status.strategyName || this.autoplayStrategyName;
          this.autoplayStrategyContext = status.strategyContext || "unknown";
          this.autoplayStrategyPriority = status.strategyPriority || 0;
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

      this.applyAutoplayAction(this.autoplayLastAction);
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
      return {
        frame: this.frameCount,
        fps: this.fps,
        framebuffer: gpuVision
          ? {
            width: WIDTH,
            height: HEIGHT,
            format: "webgpu-texture",
            zeroCopy: this.autoplayVisionZeroCopy,
            source: gpuVision
          }
          : (self.AIKernelBonsai?.summarizeFramebuffer?.(indices, this.paletteCache?.rgbaBytes) || {
            width: WIDTH,
            height: HEIGHT,
            format: "paletted-8bit",
            zeroCopy: false
          }),
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
        }
      };
    }

    applyAutoplayAction(action) {
      const normalized = self.AIKernelBonsai?.normalizeAction?.(action, this.autoplayLastAction) || action || {};
      const move = normalized.move === "forward" ? 1 : (normalized.move === "back" ? -1 : 0);
      const turn = normalized.turn === "right" ? 1 : (normalized.turn === "left" ? -1 : 0);
      const desired = {
        forward: normalized.move === "forward",
        back: normalized.move === "back",
        left: normalized.turn === "left",
        right: normalized.turn === "right",
        fire: Boolean(normalized.fire),
        strafe: Boolean(normalized.strafe),
        use: Boolean(normalized.use),
        run: Boolean(normalized.run)
      };

      if (typeof this.exports?.doom_input_action === "function") {
        const result = this.exports.doom_input_action(move, turn, normalized.fire ? 1 : 0, normalized.strafe ? 1 : 0);
        if (result === OK) {
          if (!this.isManualInputActive(AUTOPLAY_KEYS.use)) {
            this.queueInput(AUTOPLAY_KEYS.use, desired.use);
          }
          if (!this.isManualInputActive(AUTOPLAY_KEYS.run)) {
            this.queueInput(AUTOPLAY_KEYS.run, desired.run);
          }
          return;
        }
      }

      for (const [name, keycode] of Object.entries(AUTOPLAY_KEYS)) {
        if (this.isManualInputActive(keycode)) {
          continue;
        }
        this.queueInput(keycode, desired[name]);
      }
    }

    releaseAutoplayInputs() {
      if (typeof this.exports?.doom_input_action === "function") {
        this.exports.doom_input_action(0, 0, 0, 0);
      }

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
    const response = await fetch(url, { cache: "force-cache" });
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
