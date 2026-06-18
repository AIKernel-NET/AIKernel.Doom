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
      lastSnapshot = {
        active: true,
        leftEnergy: left,
        rightEnergy: right,
        balance,
        dominantFreq: frequency,
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
      lastSnapshot = {
        active: true,
        leftEnergy,
        rightEnergy,
        balance: clampPan(snapshot.balance),
        dominantFreq: Number(snapshot.dominantFreq || 0),
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

  class AIKernelDoomWorkerProxy {
    constructor(options) {
      this.canvas = options.canvas;
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
      this.worker = new Worker("/demo/doom/js/doom-worker.js?v=20260618-auditoryruntime1", { name: "AIKernel.Doom" });
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

      const offscreen = this.canvas.transferControlToOffscreen();
      this.worker.postMessage({
        type: "init",
        canvas: offscreen,
        moduleUrl: options.moduleUrl,
        modelManifestUrl: options.modelManifestUrl,
        autoplayProfileUrl: options.autoplayProfileUrl
      }, [offscreen]);
    }

    handleMessage(message) {
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
        return;
      }

      if (message.type === "log") {
        this.onLog(message.tag, message.className, message.text);
        return;
      }

      if (message.type === "status") {
        this.statusCache = this.normalizeStatus(message.status || {});
        this.onStatusChange(this.statusCache, message.reason);
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
        }
      }
    }

    normalizeStatus(status) {
      const renderer = status.renderer || this.statusCache.renderer || "canvas";
      const workerRenderer = renderer.includes("worker") ? renderer : `${renderer} worker`;
      return Object.assign({}, this.statusCache, status, {
        renderer: workerRenderer,
        executionThread: "worker"
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
      this.worker.postMessage({ type: "call", id, method, args: args || [] });
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
      if (!capture.imageDataUrl && this.canvas && typeof this.canvas.toDataURL === "function") {
        try {
          capture.imageDataUrl = this.canvas.toDataURL("image/png");
        } catch {
        }
      }

      return capture;
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

  window.createAIKernelDoomRuntime = function createAIKernelDoomRuntime(options) {
    if (canUseWorkerRuntime(options.canvas)) {
      return new AIKernelDoomWorkerProxy(options);
    }

    if (window.AIKernelDoomRuntime) {
      return new window.AIKernelDoomRuntime(options);
    }

    return null;
  };
})();
