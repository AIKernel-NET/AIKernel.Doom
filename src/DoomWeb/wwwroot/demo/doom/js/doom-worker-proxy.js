(function () {
  "use strict";

  function createAIKernelDoomAudioBridge() {
    let audioContext = null;
    let masterGain = null;
    let enabled = false;
    let lastError = "";
    let lastCueAt = 0;
    let lastSnapshot = null;
    let pcmScheduleTime = 0;
    let pcmPacketCount = 0;
    let pcmFramesPlayed = 0;
    let lastPcmGain = 0;
    let lastPcmPeak = 0;

    function clamp01(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        return 0;
      }

      return Math.max(0, Math.min(1, number));
    }

    function clampPan(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        return 0;
      }

      return Math.max(-1, Math.min(1, number));
    }

    function audioLevelFromPeak(peakEnergy) {
      return clamp01(Math.sqrt(Math.max(0, clamp01(peakEnergy)) * 2.25));
    }

    function audioAttenuationFromLevel(level) {
      return clamp01(1 - clamp01(level));
    }

    function finiteAudioNumber(value, fallback = 0) {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    }

    function audioFeatureFields(snapshot, peakEnergy, defaults = {}) {
      const peak = clamp01(peakEnergy);
      const suppliedLevel = Number(snapshot?.level);
      const level = Number.isFinite(suppliedLevel)
        ? clamp01(suppliedLevel)
        : audioLevelFromPeak(peak);
      const suppliedAttenuation = Number(snapshot?.attenuation);
      const attenuation = Number.isFinite(suppliedAttenuation)
        ? clamp01(suppliedAttenuation)
        : audioAttenuationFromLevel(level);
      const rmsEnergy = clamp01(finiteAudioNumber(snapshot?.rmsEnergy, defaults.rmsEnergy ?? peak * 0.58));
      const meanAbsEnergy = clamp01(finiteAudioNumber(snapshot?.meanAbsEnergy, defaults.meanAbsEnergy ?? Math.min(peak, rmsEnergy * 0.88)));
      const crestFactor = Math.max(0, Math.min(12, finiteAudioNumber(snapshot?.crestFactor, rmsEnergy > 0.0001 ? peak / rmsEnergy : 0)));
      const zeroCrossingRate = clamp01(finiteAudioNumber(snapshot?.zeroCrossingRate, defaults.zeroCrossingRate ?? 0));
      const bandHighRatio = clamp01(finiteAudioNumber(snapshot?.bandHighRatio, defaults.bandHighRatio ?? zeroCrossingRate));
      const bandLowRatio = clamp01(finiteAudioNumber(snapshot?.bandLowRatio, defaults.bandLowRatio ?? (1 - bandHighRatio)));
      const bandMidRatio = clamp01(finiteAudioNumber(snapshot?.bandMidRatio, defaults.bandMidRatio ?? (1 - Math.abs(0.5 - bandHighRatio) * 1.4)));
      return {
        peakEnergy: peak,
        level,
        attenuation,
        waveformPeak: clamp01(finiteAudioNumber(snapshot?.waveformPeak, defaults.waveformPeak ?? peak)),
        rmsEnergy,
        meanAbsEnergy,
        crestFactor,
        zeroCrossingRate,
        transientScore: clamp01(finiteAudioNumber(snapshot?.transientScore, defaults.transientScore ?? Math.max(0, peak - meanAbsEnergy))),
        bandLowRatio,
        bandMidRatio,
        bandHighRatio,
        spectralCentroidProxy: clamp01(finiteAudioNumber(snapshot?.spectralCentroidProxy, defaults.spectralCentroidProxy ?? bandHighRatio)),
        dynamicRange: clamp01(finiteAudioNumber(snapshot?.dynamicRange, defaults.dynamicRange ?? Math.max(0, peak - rmsEnergy)))
      };
    }

    function ensureContext() {
      if (audioContext) {
        return audioContext;
      }

      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) {
        lastError = "WebAudio AudioContext is unavailable.";
        return null;
      }

      audioContext = new AudioContextCtor();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.85;
      masterGain.connect(audioContext.destination);
      return audioContext;
    }

    function playTone(snapshot, options) {
      if (!enabled) {
        return false;
      }

      const context = ensureContext();
      if (!context) {
        return false;
      }

      if (context.state === "suspended") {
        context.resume()
          .then(function () {
            playTone(snapshot, options);
          })
          .catch(function (error) {
            lastError = error instanceof Error ? error.message : String(error);
          });
        return false;
      }

      if (context.state !== "running") {
        lastError = `WebAudio context is ${context.state}.`;
        return false;
      }

      const now = context.currentTime;
      if (!options?.force && lastCueAt && now - lastCueAt < 0.12) {
        return false;
      }

      lastCueAt = now;
      const left = clamp01(snapshot?.leftEnergy ?? 0.2);
      const right = clamp01(snapshot?.rightEnergy ?? 0.2);
      const balance = clampPan(snapshot?.balance ?? (right - left));
      const energy = Math.max(left, right, 0.16);
      const dominant = Number(snapshot?.dominantFreq || snapshot?.dominantFrequency || 0);
      const frequency = Number.isFinite(dominant) && dominant > 20
        ? Math.max(120, Math.min(1600, dominant))
        : 260 + energy * 520;
      const duration = options?.duration ?? 0.22;
      const volume = Math.max(0.18, Math.min(0.68, 0.22 + energy * 0.38));
      const peakEnergy = clamp01(Math.max(left, right, energy));
      const features = audioFeatureFields(snapshot, peakEnergy, {
        rmsEnergy: peakEnergy * 0.58,
        meanAbsEnergy: peakEnergy * 0.42,
        bandLowRatio: 0.34,
        bandMidRatio: 0.52,
        bandHighRatio: 0.14
      });
      lastSnapshot = {
        active: true,
        leftEnergy: left,
        rightEnergy: right,
        balance,
        dominantFreq: frequency,
        lowEnergy: clamp01(finiteAudioNumber(snapshot?.lowEnergy, peakEnergy * 0.38)),
        midEnergy: clamp01(finiteAudioNumber(snapshot?.midEnergy, peakEnergy * 0.72)),
        highEnergy: clamp01(finiteAudioNumber(snapshot?.highEnergy, peakEnergy * 0.28)),
        ...features,
        dominantBand: snapshot?.dominantBand || "mid",
        eventDetected: true,
        eventType: snapshot?.eventType || "debug-audio-cue",
        timestamp: new Date().toISOString(),
        timestampMs: Date.now()
      };
      try {
        window.dispatchEvent(new CustomEvent("aikernel-audio-cue", { detail: lastSnapshot }));
      } catch {
      }

      const oscillator = context.createOscillator();
      const cueGain = context.createGain();
      const stereoPanner = typeof context.createStereoPanner === "function"
        ? context.createStereoPanner()
        : null;

      oscillator.type = options?.type || "triangle";
      oscillator.frequency.setValueAtTime(frequency, now);
      cueGain.gain.setValueAtTime(0.0001, now);
      cueGain.gain.linearRampToValueAtTime(volume, now + 0.012);
      cueGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      if (stereoPanner) {
        stereoPanner.pan.setValueAtTime(balance, now);
        oscillator.connect(cueGain);
        cueGain.connect(stereoPanner);
        stereoPanner.connect(masterGain);
      } else {
        oscillator.connect(cueGain);
        cueGain.connect(masterGain);
      }

      oscillator.onended = function () {
        try {
          oscillator.disconnect();
          cueGain.disconnect();
          stereoPanner?.disconnect();
        } catch {
        }
      };
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
      return true;
    }

    function playPcm(payload) {
      if (!enabled) {
        return false;
      }

      const context = ensureContext();
      if (!context) {
        return false;
      }

      if (context.state === "suspended") {
        context.resume()
          .then(function () {
            playPcm(payload);
          })
          .catch(function (error) {
            lastError = error instanceof Error ? error.message : String(error);
          });
        return false;
      }

      if (context.state !== "running") {
        lastError = `WebAudio context is ${context.state}.`;
        return false;
      }

      const frames = Math.max(0, Math.floor(Number(payload?.frames || 0)));
      const channels = Math.max(1, Math.min(2, Math.floor(Number(payload?.channels || 2))));
      const sampleRate = Math.max(8000, Math.floor(Number(payload?.sampleRate || 44100)));
      const samples = payload?.samples instanceof Float32Array
        ? payload.samples
        : new Float32Array(payload?.samples || []);

      if (!frames || samples.length < frames * channels) {
        return false;
      }

      const requestedGain = Math.max(0.5, Math.min(24, Number(payload?.gain || 6)));
      let rawPeak = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const value = Math.abs(samples[i] || 0);
        if (value > rawPeak) {
          rawPeak = value;
        }
      }

      const adaptiveGain = rawPeak > 0.0005
        ? Math.min(24, Math.max(requestedGain, 0.55 / rawPeak))
        : requestedGain;
      const buffer = context.createBuffer(2, frames, sampleRate);
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      let scaledLeftEnergy = 0;
      let scaledRightEnergy = 0;
      let scaledPeak = 0;

      for (let i = 0, j = 0; i < frames; i += 1, j += channels) {
        const l = Math.max(-1, Math.min(1, (samples[j] || 0) * adaptiveGain));
        const r = channels > 1
          ? Math.max(-1, Math.min(1, (samples[j + 1] || 0) * adaptiveGain))
          : l;
        left[i] = l;
        right[i] = r;
        const absLeft = Math.abs(l);
        const absRight = Math.abs(r);
        scaledLeftEnergy += absLeft;
        scaledRightEnergy += absRight;
        if (absLeft > scaledPeak) {
          scaledPeak = absLeft;
        }
        if (absRight > scaledPeak) {
          scaledPeak = absRight;
        }
      }

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(masterGain);
      source.onended = function () {
        try {
          source.disconnect();
        } catch {
        }
      };
      const now = context.currentTime;
      if (!pcmScheduleTime || pcmScheduleTime < now || pcmScheduleTime - now > 0.18) {
        pcmScheduleTime = now + 0.012;
      }

      source.start(pcmScheduleTime);
      pcmScheduleTime += frames / sampleRate;
      pcmPacketCount += 1;
      pcmFramesPlayed += frames;
      lastPcmGain = adaptiveGain;
      lastPcmPeak = scaledPeak;

      const snapshot = payload?.snapshot || {};
      const leftEnergy = frames > 0
        ? Math.max(clamp01(snapshot.leftEnergy * adaptiveGain), clamp01(scaledLeftEnergy / frames))
        : clamp01(snapshot.leftEnergy);
      const rightEnergy = frames > 0
        ? Math.max(clamp01(snapshot.rightEnergy * adaptiveGain), clamp01(scaledRightEnergy / frames))
        : clamp01(snapshot.rightEnergy);
      const peakEnergy = clamp01(Math.max(leftEnergy, rightEnergy, scaledPeak, Number(snapshot.peakEnergy || 0), Number(snapshot.waveformPeak || 0)));
      const features = audioFeatureFields(snapshot, peakEnergy, {
        waveformPeak: scaledPeak,
        rmsEnergy: Math.max(leftEnergy, rightEnergy) * 0.7,
        meanAbsEnergy: Math.max(leftEnergy, rightEnergy) * 0.58
      });
      lastSnapshot = {
        active: true,
        leftEnergy,
        rightEnergy,
        balance: clampPan(snapshot.balance),
        dominantFreq: Number(snapshot.dominantFreq || 0),
        lowEnergy: clamp01(Number(snapshot.lowEnergy || 0)),
        midEnergy: clamp01(Number(snapshot.midEnergy || 0)),
        highEnergy: clamp01(Number(snapshot.highEnergy || 0)),
        ...features,
        dominantBand: snapshot.dominantBand || "none",
        eventDetected: true,
        eventType: snapshot.eventType || "doom-native-sfx",
        timestamp: new Date().toISOString(),
        timestampMs: Date.now()
      };
      lastCueAt = now;

      try {
        window.dispatchEvent(new CustomEvent("aikernel-audio-cue", { detail: lastSnapshot }));
      } catch {
      }

      return true;
    }

    function setEnabled(value) {
      enabled = Boolean(value);
      const context = ensureContext();
      if (!context) {
        return status();
      }

      if (!enabled) {
        pcmScheduleTime = 0;
        return status();
      }

      const resume = context.state === "suspended"
        ? context.resume()
        : Promise.resolve();
      resume
        .then(function () {
          playTone({ leftEnergy: 0.72, rightEnergy: 0.72, balance: 0, dominantFreq: 660, eventType: "audio-enabled" }, {
            duration: 0.32,
            force: true,
            type: "sine"
          });
        })
        .catch(function (error) {
          lastError = error instanceof Error ? error.message : String(error);
        });
      return status();
    }

    function status() {
      return {
        enabled,
        contextState: audioContext?.state || "uninitialized",
        lastSnapshot,
        lastCueAt,
        lastError,
        pcmPacketCount,
        pcmFramesPlayed,
        lastPcmGain,
        lastPcmPeak
      };
    }

    return {
      setEnabled,
      testCue() {
        enabled = true;
        return playTone({ leftEnergy: 0.85, rightEnergy: 0.85, balance: 0, dominantFreq: 740, eventType: "audio-test" }, {
          duration: 0.42,
          force: true,
          type: "sine"
        });
      },
      playSpatialCue(snapshot) {
        return playTone(snapshot, { duration: 0.12 });
      },
      playPcm,
      status
    };
  }

  function ensureAIKernelDoomAudioBridge() {
    if (!window.AIKernelWasmAudioProvider) {
      window.AIKernelWasmAudioProvider = createAIKernelDoomAudioBridge();
      window.aikernelWasmAudioProvider = window.AIKernelWasmAudioProvider;
    }

    return window.AIKernelWasmAudioProvider;
  }

  ensureAIKernelDoomAudioBridge();

  function resolveDoomScriptBase() {
    const fallback = "/js/";
    try {
      const currentScript = document.currentScript;
      if (currentScript?.src) {
        return new URL(".", currentScript.src).pathname;
      }

      const script = Array.from(document.scripts || [])
        .reverse()
        .find(item => /(?:^|\/)doom-worker-proxy\.js(?:\?|$)/.test(item.src || ""));
      if (script?.src) {
        return new URL(".", script.src).pathname;
      }
    } catch {
    }

    return fallback;
  }

  class AIKernelDoomWorkerProxy {
    constructor(options) {
      this.canvas = options.canvas;
      this.moduleUrl = options.moduleUrl;
      this.modelManifestUrl = options.modelManifestUrl;
      this.autoplayProfileUrl = options.autoplayProfileUrl;
      this.onLog = options.log || function () {};
      this.onStatusChange = options.onStatusChange || function () {};
      this.statusCache = {
        state: "suspended",
        renderer: "worker-pending",
        wasmLoaded: false,
        wadLoaded: false,
        wadMounted: false,
        modelLoaded: false,
        loopActive: false,
        frameCount: 0,
        fps: 0,
        targetFps: 30,
        inputReady: false,
        framebuffer: "320x200 paletted-8bit",
        lastError: ""
      };
      this.requests = new Map();
      this.nextId = 1;
      this.gpuModeState = normalizeGpuModeState();
      this.cacheKey = (() => {
        try {
          return new URL(globalThis.location.href).searchParams.get("doomdev") || "dev";
        } catch {
          return "dev";
        }
      })();
      this.scriptBase = resolveDoomScriptBase();
      this.worker = null;
      this.rebuildingCpuSurface = false;
      this.cpuFallbackSurfaceRecovered = false;
      this.cpuFallbackRecoveredReason = "";
      this.cpuFallbackSuppressLoggedReason = "";
      this.selfHealCount = 0;
      this.lastSelfHeal = {
        kind: "none",
        reason: "",
        recoveredAt: 0
      };
      this.startWorker(this.canvas, this.gpuModeState);
      this.gpuModeListener = event => {
        this.postGpuMode(event?.detail || window.AIKernelDoomGpuMode);
      };
      this.pageReleaseListener = () => this.disposeWorkerGpuResources("page-transition");
      window.addEventListener("aikernel-doom-gpu-mode-changed", this.gpuModeListener);
      window.addEventListener("pagehide", this.pageReleaseListener, { capture: true });
      window.addEventListener("beforeunload", this.pageReleaseListener, { capture: true });
    }

    startWorker(canvas, gpuMode) {
      this.gpuResourcesReleasePosted = false;
      this.workerHostReady = false;
      this.pendingWorkerInit = { canvas, gpuMode };
      const cacheKey = this.cacheKey;
      this.worker = new Worker(`${this.scriptBase}doom-worker.js?v=${encodeURIComponent(cacheKey)}`, {
        name: "AIKernel.Doom",
        type: "module"
      });
      this.ready = new Promise((resolve, reject) => {
        this.resolveReady = resolve;
        this.rejectReady = reject;
      });

      this.worker.onmessage = event => this.handleMessage(event.data || {});
      this.worker.onerror = event => {
        const message = event.message || "DOOM worker failed.";
        this.statusCache = Object.assign({}, this.statusCache, {
          state: "failed",
          lastError: message
        });
        this.rejectReady?.(new Error(message));
        this.rejectAll(message);
        this.onStatusChange(this.statusCache, "worker-error");
      };

    }

    postGpuMode(mode) {
      this.gpuModeState = normalizeGpuModeState(mode);
      if (this.gpuModeState.useGpuRendering) {
        this.cpuFallbackSurfaceRecovered = false;
        this.cpuFallbackRecoveredReason = "";
        this.cpuFallbackSuppressLoggedReason = "";
      }
      if (this.worker && this.workerHostReady) {
        this.worker.postMessage({
          type: "gpu-mode",
          gpuMode: this.gpuModeState
        });
      }
    }

    disposeWorkerGpuResources(reason = "page-transition") {
      if (!this.worker || this.gpuResourcesReleasePosted) {
        return;
      }

      this.gpuResourcesReleasePosted = true;
      try {
        this.worker.postMessage({
          type: "dispose-gpu",
          reason
        });
      } catch {
      }
    }

    handleMessage(message) {
      if (message.type === "host-ready") {
        const pendingInit = this.pendingWorkerInit;
        if (!pendingInit || !this.worker) {
          return;
        }

        try {
          const offscreen = pendingInit.canvas.transferControlToOffscreen();
          this.workerHostReady = true;
          this.pendingWorkerInit = null;
          this.worker.postMessage({
            type: "init",
            canvas: offscreen,
            moduleUrl: this.moduleUrl,
            modelManifestUrl: this.modelManifestUrl,
            autoplayProfileUrl: this.autoplayProfileUrl,
            gpuMode: pendingInit.gpuMode
          }, [offscreen]);
        } catch (error) {
          const text = error instanceof Error ? error.message : String(error);
          this.statusCache = Object.assign({}, this.statusCache, { state: "failed", lastError: text });
          this.rejectReady?.(new Error(text));
          this.onStatusChange(this.statusCache, "worker-host-init-error");
        }
        return;
      }

      if (message.type === "ready") {
        this.statusCache = this.normalizeStatus(message.status || {});
        this.resolveReady?.(this.statusCache);
        this.onLog("[WORKER]", "log-ok", "DOOM runtime isolated in Web Worker with OffscreenCanvas.");
        this.onStatusChange(this.statusCache, "worker-ready");
        return;
      }

      if (message.type === "init-error") {
        const error = message.error || "DOOM worker initialization failed.";
        this.statusCache = Object.assign({}, this.statusCache, { state: "failed", lastError: error });
        this.rejectReady?.(new Error(error));
        this.rejectAll(error);
        this.onStatusChange(this.statusCache, "worker-init-error");
        return;
      }

      if (message.type === "fatal") {
        const error = message.detail || message.error || "DOOM worker fatal error.";
        this.statusCache = Object.assign({}, this.statusCache, {
          state: "failed",
          loopActive: false,
          lastError: error
        });
        this.rejectAll(error);
        this.onLog("[WORKER]", "log-fail", error);
        this.onStatusChange(this.statusCache, "worker-fatal");
        if (/gpu|webgpu|context|surface/i.test(error)) {
          this.rebuildCpuWorkerAfterGpuFallback("worker-fatal-gpu-surface", this.statusCache);
        }
        return;
      }

      if (message.type === "log") {
        this.onLog(message.tag, message.className, message.text);
        return;
      }

      if (message.type === "status") {
        this.statusCache = this.normalizeStatus(message.status || {});
        this.onStatusChange(this.statusCache, message.reason);
        if (this.shouldRebuildCpuWorkerAfterGpuFallback(this.statusCache, message.reason)) {
          this.rebuildCpuWorkerAfterGpuFallback(message.reason || "gpu-fallback-status", this.statusCache);
        }
        return;
      }

      if (message.type === "audio-cue") {
        ensureAIKernelDoomAudioBridge().playSpatialCue(message.snapshot || {});
        return;
      }

      if (message.type === "audio-pcm") {
        const samples = message.samples
          ? new Float32Array(message.samples)
          : new Float32Array();
        ensureAIKernelDoomAudioBridge().playPcm({
          samples,
          frames: message.frames,
          channels: message.channels,
          sampleRate: message.sampleRate,
          snapshot: message.snapshot || {}
        });
        return;
      }

      if (message.type === "response") {
        const request = this.requests.get(message.id);
        if (!request) {
          return;
        }

        this.requests.delete(message.id);
        if (message.error) {
          request.reject(new Error(message.error));
        } else {
          this.statusCache = this.normalizeStatus(message.result || {});
          request.resolve(this.statusCache);
          if (this.shouldRebuildCpuWorkerAfterGpuFallback(this.statusCache, "response")) {
            this.rebuildCpuWorkerAfterGpuFallback("gpu-fallback-response", this.statusCache);
          }
        }
      }
    }

    shouldRebuildCpuWorkerAfterGpuFallback(status, reason = "") {
      if (this.rebuildingCpuSurface) {
        return false;
      }

      const reasonText = String(reason || "");
      const fallbackReason = String(
        status?.gpuHud?.providerFallbackReason
        || status?.gpuHud?.fallbackReason
        || status?.lastError
        || ""
      );
      const state = String(status?.state || "");
      const renderer = String(status?.renderer || "");
      const usingCpuFallback = Boolean(
        status?.usingCpuFallback
        || status?.gpuHud?.providerUsingCpuFallback
        || status?.gpuHud?.providerBackend === "cpu-fallback"
        || /canvas-fallback|cpu/i.test(renderer)
      );
      const gpuFallbackReason = /gpu-lost|gpu-fallback|webgpu|context lost|surface/i.test(`${reasonText} ${fallbackReason}`);
      const fatalAfterRecovery = /failed|fatal/i.test(state) || /worker-fatal|init-error|rebuild-failed/i.test(reasonText);
      const recoveredCpuFallback = this.cpuFallbackSurfaceRecovered
        && usingCpuFallback
        && gpuFallbackReason
        && !fatalAfterRecovery;
      if (recoveredCpuFallback) {
        const suppressReason = fallbackReason || reasonText || "cpu-fallback";
        if (this.cpuFallbackSuppressLoggedReason !== suppressReason) {
          this.cpuFallbackSuppressLoggedReason = suppressReason;
          this.onLog("[ SELF-HEAL ]", "log-info", `CPU fallback surface is stable; duplicate GPU fallback WDT suppressed (${suppressReason}).`);
        }
        return false;
      }

      const stoppedDuringFallback = /gpu-fallback/.test(reasonText) && status?.state !== "running";
      const failedAfterFallback = status?.state === "failed" && (status?.usingCpuFallback || gpuFallbackReason);
      const providerGpuLost = !this.cpuFallbackSurfaceRecovered && Boolean(status?.gpuHud?.providerGpuPermanentlyDisabled) && gpuFallbackReason;
      return Boolean(stoppedDuringFallback || failedAfterFallback || providerGpuLost);
    }

    setCpuFallbackMode(reason) {
      const mode = {
        useGpuRendering: false,
        gpuPermanentlyDisabled: true,
        reason: String(reason || "gpu-fallback-worker-rebuild"),
        updatedAt: Date.now()
      };
      window.AIKernelDoomGpuMode = mode;
      window.useGpuRendering = false;
      window.gpuPermanentlyDisabled = true;
      this.gpuModeState = normalizeGpuModeState(mode);
      try {
        if (typeof window.AIKernelDoomSetGpuRenderingMode === "function") {
          window.AIKernelDoomSetGpuRenderingMode(false, mode.reason);
        }
      } catch {
      }
      return this.gpuModeState;
    }

    replaceCanvasForCpuFallback(reason) {
      const previous = this.canvas || document.getElementById("doom-screen");
      if (!previous?.parentNode) {
        throw new Error("DOOM canvas is unavailable for CPU fallback rebuild.");
      }

      const replacement = document.createElement("canvas");
      Array.from(previous.attributes || []).forEach(attribute => {
        replacement.setAttribute(attribute.name, attribute.value);
      });
      replacement.id = previous.id || "doom-screen";
      replacement.className = previous.className || "";
      replacement.width = previous.width || 320;
      replacement.height = previous.height || 200;
      replacement.hidden = false;
      replacement.tabIndex = previous.tabIndex >= 0 ? previous.tabIndex : 0;
      previous.replaceWith(replacement);
      this.canvas = replacement;
      window.dispatchEvent(new CustomEvent("aikernel-doom-canvas-replaced", {
        detail: { canvas: replacement, reason }
      }));
      return replacement;
    }

    async rebuildCpuWorkerAfterGpuFallback(reason = "gpu-fallback", status = this.statusCache) {
      if (this.rebuildingCpuSurface) {
        return;
      }

      this.rebuildingCpuSurface = true;
      this.cpuFallbackSurfaceRecovered = false;
      this.cpuFallbackRecoveredReason = "";
      this.cpuFallbackSuppressLoggedReason = "";
      const startAfterRebuild = Boolean(status?.wasmLoaded || status?.wadLoaded || status?.modelLoaded || status?.state === "running" || status?.state === "failed");
      const resumeAutoplay = Boolean(status?.autoplay?.enabled);
      const rebuildReason = `gpu-surface-rebuild:${reason}`;
      this.onLog("[ SELF-HEAL ]", "log-warn", `GPU/browser display surface fault contained; rebuilding Doom worker in CPU mode (${reason}).`);
      this.onLog("[ WDT ]", "log-warn", `CPU fallback display-surface reboot started (${rebuildReason}).`);
      this.setCpuFallbackMode(rebuildReason);

      try {
        this.rejectAll("GPU fallback worker rebuild");
        try {
          this.worker?.terminate?.();
        } catch {
        }

        const replacement = this.replaceCanvasForCpuFallback(rebuildReason);
        this.statusCache = Object.assign({}, this.statusCache, {
          state: "recovering",
          loopActive: false,
          renderer: "canvas-fallback(cpu-rebuild) worker",
          usingCpuFallback: true,
          lastError: ""
        });
        this.onStatusChange(this.statusCache, "gpu-fallback-worker-rebuild");
        this.startWorker(replacement, this.gpuModeState);
        await this.ready;
        this.onLog("[ WDT ]", "log-info", "CPU fallback worker ready; restarting DOOM after display-surface rebuild.");

        if (startAfterRebuild) {
          const running = await this.start();
          this.onStatusChange(running, "gpu-fallback-worker-started");
        }

        if (resumeAutoplay) {
          const autoplay = await this.setAutoplay(true);
          this.onStatusChange(autoplay, "gpu-fallback-autoplay-restored");
          this.onLog("[AUTOPLAY]", "log-info", "autoplay restored after GPU display-surface rebuild.");
        }

        this.cpuFallbackSurfaceRecovered = true;
        this.cpuFallbackRecoveredReason = rebuildReason;
        this.selfHealCount += 1;
        this.lastSelfHeal = {
          kind: "gpu-display-surface",
          reason: rebuildReason,
          recoveredAt: Date.now()
        };
        this.statusCache = Object.assign({}, this.statusCache, {
          selfHeal: Object.assign({}, this.statusCache.selfHeal || {}, {
            count: this.selfHealCount,
            kind: this.lastSelfHeal.kind,
            reason: this.lastSelfHeal.reason,
            recoveredAt: this.lastSelfHeal.recoveredAt,
            cpuFallbackSurfaceRecovered: this.cpuFallbackSurfaceRecovered,
            cpuFallbackRecoveredReason: this.cpuFallbackRecoveredReason
          })
        });
        this.onLog("[ SELF-HEAL ]", "log-ok", `AIKernel.Doom self-healed: GPU path disabled, CPU renderer rebuilt, control loop resumed; recoveries=${this.selfHealCount}.`);
        this.onStatusChange(this.statusCache, "gpu-fallback-worker-self-healed");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.statusCache = Object.assign({}, this.statusCache, {
          state: "failed",
          loopActive: false,
          lastError: message
        });
        this.onLog("[ FAIL ]", "log-fail", `CPU fallback worker rebuild failed: ${message}`);
        this.onStatusChange(this.statusCache, "gpu-fallback-worker-rebuild-failed");
      } finally {
        this.rebuildingCpuSurface = false;
      }
    }

    normalizeStatus(status) {
      const renderer = status.renderer || this.statusCache.renderer || "canvas";
      const workerRenderer = renderer.includes("worker") ? renderer : `${renderer} worker`;
      const workerSelfHeal = status.selfHeal || {};
      return Object.assign({}, this.statusCache, status, {
        renderer: workerRenderer,
        executionThread: "worker",
        selfHeal: {
          count: Math.max(Number(workerSelfHeal.count || 0), this.selfHealCount),
          kind: workerSelfHeal.kind || this.lastSelfHeal.kind || "none",
          reason: workerSelfHeal.reason || this.lastSelfHeal.reason || "",
          recoveredAt: Number(workerSelfHeal.recoveredAt || this.lastSelfHeal.recoveredAt || 0),
          cpuFallbackSurfaceRecovered: this.cpuFallbackSurfaceRecovered,
          cpuFallbackRecoveredReason: this.cpuFallbackRecoveredReason
        }
      });
    }

    rejectAll(message) {
      for (const request of this.requests.values()) {
        request.reject(new Error(message));
      }
      this.requests.clear();
    }

    async call(method, args) {
      await this.ready;
      const id = this.nextId++;
      const promise = new Promise((resolve, reject) => {
        this.requests.set(id, { resolve, reject });
      });
      this.gpuModeState = normalizeGpuModeState();
      this.worker.postMessage({
        type: "call",
        id,
        method,
        args: args || [],
        gpuMode: this.gpuModeState
      });
      return promise;
    }

    prepare() {
      return this.call("prepare");
    }

    start() {
      return this.call("start");
    }

    stop() {
      return this.call("stop");
    }

    setAutoplay(enabled) {
      return this.call("setAutoplay", [enabled]);
    }

    setAutoplayManualMove(enabled) {
      return this.call("setAutoplayManualMove", [enabled]);
    }

    setAutoplaySenseOnly(enabled) {
      return this.call("setAutoplaySenseOnly", [enabled]);
    }

    setAutoplayInvulnerableHint(frames = 1800) {
      return this.call("setAutoplayInvulnerableHint", [frames]);
    }

    resetAutoplaySensorState(reason = "sensor-reset") {
      return this.call("resetAutoplaySensorState", [reason]);
    }

    setAudioPlayback(enabled) {
      ensureAIKernelDoomAudioBridge().setEnabled(Boolean(enabled));
      return this.call("setAudioPlayback", [enabled]);
    }

    setAudioMuted(muted) {
      ensureAIKernelDoomAudioBridge().setEnabled(!Boolean(muted));
      return this.call("setAudioMuted", [muted]);
    }

    setSensorInput(kind, enabled) {
      return this.call("setSensorInput", [kind, enabled]);
    }

    async captureSenseOnlyFrame() {
      const capture = await this.call("captureSenseOnlyFrame");
      if (!capture.imageDataUrl && !capture.overlayExcluded && this.canvas && typeof this.canvas.toDataURL === "function") {
        try {
          capture.imageDataUrl = this.canvas.toDataURL("image/png");
          capture.captureSource = "display-canvas-fallback";
          capture.overlayExcluded = false;
        } catch {
        }
      }

      return capture;
    }

    captureHealthFaceDiagnostics(options = {}) {
      return this.call("captureHealthFaceDiagnostics", [options]);
    }

    status() {
      return this.statusCache;
    }

    queueInput(keycode, pressed) {
      if (!this.worker || this.statusCache.state !== "running") {
        return false;
      }

      this.worker.postMessage({ type: "input", keycode, pressed });
      return true;
    }

    queueManualInput(keycode, pressed, holdMs = 0) {
      if (!this.worker || this.statusCache.state !== "running") {
        return false;
      }

      this.worker.postMessage({ type: "manual-input", keycode, pressed, holdMs });
      return true;
    }
  }

  function canUseWorkerRuntime(canvas) {
    return Boolean(
      window.Worker &&
      window.OffscreenCanvas &&
      canvas?.transferControlToOffscreen
    );
  }

  function normalizeGpuModeState(mode) {
    const source = mode || window.AIKernelDoomGpuMode || {};
    const useGpuRendering = source.useGpuRendering !== false;
    return {
      useGpuRendering,
      gpuPermanentlyDisabled: source.gpuPermanentlyDisabled === true || !useGpuRendering,
      reason: String(source.reason || (useGpuRendering ? "startup-gpu" : "startup-cpu")),
      updatedAt: Number(source.updatedAt || Date.now())
    };
  }

  window.createAIKernelDoomRuntime = function createAIKernelDoomRuntime(options) {
    if (canUseWorkerRuntime(options.canvas)) {
      return new AIKernelDoomWorkerProxy(options);
    }

    const RuntimeCtor = window.AIKernelDoomRuntimeClass;
    if (RuntimeCtor) {
      return new RuntimeCtor(options);
    }

    return null;
  };
})();
