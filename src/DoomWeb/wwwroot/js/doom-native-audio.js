(function () {
  "use strict";

  const REQUIRED_EXPORTS = [
    "doom_audio_status",
    "doom_audio_sample_rate",
    "doom_audio_channels",
    "doom_audio_buffer",
    "doom_audio_capacity_frames",
    "doom_audio_read_offset_frames",
    "doom_audio_available_frames",
    "doom_audio_consume_frames"
  ];

  function isAvailable(exports) {
    return Boolean(exports && REQUIRED_EXPORTS.every(name => typeof exports[name] === "function"));
  }

  function status(exports) {
    return isAvailable(exports) && typeof exports.doom_audio_status === "function"
      ? exports.doom_audio_status()
      : 0;
  }

  function eventCount(exports) {
    return isAvailable(exports) && typeof exports.doom_audio_event_count === "function"
      ? exports.doom_audio_event_count()
      : 0;
  }

  function availableFrames(exports) {
    return isAvailable(exports)
      ? exports.doom_audio_available_frames()
      : 0;
  }

  function drain(runtime, options = {}) {
    const exports = runtime?.exports;
    if (!isAvailable(exports) || !status(exports)) {
      return null;
    }

    const available = Math.max(0, Math.floor(Number(exports.doom_audio_available_frames() || 0)));
    if (available <= 0) {
      return null;
    }

    const bufferPtr = Number(exports.doom_audio_buffer() || 0);
    const capacity = Math.max(0, Math.floor(Number(exports.doom_audio_capacity_frames() || 0)));
    const readOffset = Math.max(0, Math.floor(Number(exports.doom_audio_read_offset_frames() || 0)));
    const sampleRate = Math.max(8000, Math.floor(Number(exports.doom_audio_sample_rate() || 44100)));
    const channels = Math.max(1, Math.min(2, Math.floor(Number(exports.doom_audio_channels() || 2))));
    const contiguous = Math.max(0, capacity - readOffset);
    const frames = Math.min(available, contiguous, 4096);

    if (!bufferPtr || !capacity || frames <= 0) {
      return null;
    }

    const sampleCount = frames * channels;
    const byteOffset = bufferPtr + (readOffset * channels * 2);
    const source = new Int16Array(exports.memory.buffer, byteOffset, sampleCount);
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

    const consumed = exports.doom_audio_consume_frames(frames);
    if (consumed <= 0) {
      return null;
    }

    leftEnergy = Math.min(1, leftEnergy / consumed);
    rightEnergy = Math.min(1, rightEnergy / consumed);
    const denominator = Math.max(0.0001, leftEnergy + rightEnergy);
    const balance = Math.max(-1, Math.min(1, (rightEnergy - leftEnergy) / denominator));
    const eventCountValue = eventCount(exports);
    const snapshot = {
      active: true,
      leftEnergy: round3(leftEnergy),
      rightEnergy: round3(rightEnergy),
      balance: round3(balance),
      dominantFreq: 0,
      lowEnergy: round3(Math.max(leftEnergy, rightEnergy) * 0.38),
      midEnergy: round3(Math.max(leftEnergy, rightEnergy) * 0.72),
      highEnergy: round3(Math.max(leftEnergy, rightEnergy) * 0.28),
      dominantBand: "mid",
      eventDetected: eventCountValue !== runtime.nativeAudioLastEventCount || Math.max(leftEnergy, rightEnergy) > 0.01,
      eventType: "native-sfx",
      timestamp: new Date().toISOString()
    };

    runtime.nativeAudioLastEventCount = eventCountValue;
    runtime.nativeAudioFramesDrained = Number(runtime.nativeAudioFramesDrained || 0) + consumed;
    runtime.nativeAudioLastSnapshot = snapshot;
    runtime.autoplayAuditorySnapshot = snapshot;

    if (!runtime.nativeAudioLogged) {
      runtime.nativeAudioLogged = true;
      runtime.log?.("[AUDIO]", "log-ok", `native SFX bridge active: ${sampleRate}Hz/${channels}ch ring buffer.`);
    }

    if (runtime.audioPlaybackMuted) {
      return { consumed, frames, channels, sampleRate, snapshot, played: false };
    }

    const bridge = options.bridge || resolveBridge(options.global || self);
    if (typeof bridge?.playPcm === "function") {
      bridge.playPcm({
        samples,
        frames: consumed,
        channels,
        sampleRate,
        snapshot
      });
      return { consumed, frames, channels, sampleRate, snapshot, played: true };
    }

    return { consumed, frames, channels, sampleRate, snapshot, played: false };
  }

  function resolveBridge(global) {
    return global.AIKernelWasmAudioProvider || global.aikernelWasmAudioProvider;
  }

  function round3(value) {
    return Math.round(Number(value || 0) * 1000) / 1000;
  }

  self.AIKernelDoomNativeAudio = Object.freeze({
    isAvailable,
    status,
    eventCount,
    availableFrames,
    drain
  });
})();
