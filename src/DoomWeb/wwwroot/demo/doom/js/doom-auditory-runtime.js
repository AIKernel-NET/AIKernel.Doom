(function () {
  "use strict";

  const DEFAULT_SNAPSHOT_TIMESTAMP = "1970-01-01T00:00:00.000Z";

  function clamp01(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(0, Math.min(1, number));
  }

  function createNeutralSnapshot(defaultTimestamp = DEFAULT_SNAPSHOT_TIMESTAMP) {
    return {
      active: false,
      leftEnergy: 0,
      rightEnergy: 0,
      balance: 0,
      dominantFreq: 0,
      lowEnergy: 0,
      midEnergy: 0,
      highEnergy: 0,
      peakEnergy: 0,
      level: 0,
      attenuation: 1,
      waveformPeak: 0,
      rmsEnergy: 0,
      meanAbsEnergy: 0,
      crestFactor: 0,
      zeroCrossingRate: 0,
      transientScore: 0,
      bandLowRatio: 0,
      bandMidRatio: 0,
      bandHighRatio: 0,
      spectralCentroidProxy: 0,
      dynamicRange: 0,
      dominantBand: "none",
      eventDetected: false,
      eventType: "none",
      timestamp: defaultTimestamp,
      timestampMs: 0
    };
  }

  function readBridgeSnapshot(global = self) {
    const bridge = global.AIKernelWasmAudioProvider || global.aikernelWasmAudioProvider;
    const status = typeof bridge?.status === "function" ? bridge.status() : null;
    return status?.lastSnapshot || null;
  }

  function snapshotAgeMs(snapshot, nowMs = Date.now()) {
    if (!snapshot) {
      return Number.POSITIVE_INFINITY;
    }

    if (Number.isFinite(Number(snapshot.timestampMs)) && Number(snapshot.timestampMs) > 0) {
      return nowMs - Number(snapshot.timestampMs);
    }

    const timestampMs = Date.parse(snapshot.timestamp || "");
    return Number.isFinite(timestampMs) && timestampMs > 0
      ? nowMs - timestampMs
      : Number.POSITIVE_INFINITY;
  }

  function snapshotEnergy(snapshot) {
    return Math.max(
      Number(snapshot?.leftEnergy || 0),
      Number(snapshot?.rightEnergy || 0),
      Number(snapshot?.lowEnergy || 0),
      Number(snapshot?.midEnergy || 0),
      Number(snapshot?.highEnergy || 0),
      Number(snapshot?.peakEnergy || 0),
      Number(snapshot?.waveformPeak || 0),
      Number(snapshot?.rmsEnergy || 0),
      Number(snapshot?.meanAbsEnergy || 0));
  }

  function createRuntimeSnapshot(runtime, options = {}) {
    const defaultTimestamp = options.defaultTimestamp || DEFAULT_SNAPSHOT_TIMESTAMP;
    const nowMs = Number(options.nowMs || Date.now());
    const runtimeSnapshot = runtime?.autoplayAuditorySnapshot || {};
    const bridgeSnapshot = options.bridgeSnapshot || readBridgeSnapshot(options.global || self);
    const runtimeFresh = snapshotAgeMs(runtimeSnapshot, nowMs) <= 1200;
    const bridgeFresh = snapshotAgeMs(bridgeSnapshot, nowMs) <= 1400;
    const runtimeEnergy = snapshotEnergy(runtimeSnapshot);
    const bridgeEnergy = snapshotEnergy(bridgeSnapshot);
    const snapshot = bridgeFresh && bridgeEnergy > Math.max(0.002, runtimeEnergy)
      ? bridgeSnapshot
      : runtimeSnapshot;
    const fresh = snapshot === bridgeSnapshot ? bridgeFresh : runtimeFresh;
    if (!fresh) {
      return createNeutralSnapshot(defaultTimestamp);
    }

    const peakEnergy = clamp01(snapshotEnergy(snapshot));
    const suppliedLevel = Number(snapshot.level);
    const level = Number.isFinite(suppliedLevel)
      ? clamp01(suppliedLevel)
      : clamp01(Math.sqrt(Math.max(0, peakEnergy) * 2.25));
    const suppliedAttenuation = Number(snapshot.attenuation);
    const attenuation = Number.isFinite(suppliedAttenuation)
      ? clamp01(suppliedAttenuation)
      : clamp01(1 - level);
    const timestampMs = Number(snapshot.timestampMs || Date.parse(snapshot.timestamp || ""));
    return {
      active: Boolean(snapshot.eventDetected) || peakEnergy > 0.002,
      leftEnergy: Number(snapshot.leftEnergy || 0),
      rightEnergy: Number(snapshot.rightEnergy || 0),
      balance: Number(snapshot.balance || 0),
      dominantFreq: Number(snapshot.dominantFreq || 0),
      lowEnergy: Number(snapshot.lowEnergy || 0),
      midEnergy: Number(snapshot.midEnergy || 0),
      highEnergy: Number(snapshot.highEnergy || 0),
      peakEnergy,
      level,
      attenuation,
      waveformPeak: Number(snapshot.waveformPeak || snapshot.peakEnergy || 0),
      rmsEnergy: Number(snapshot.rmsEnergy || 0),
      meanAbsEnergy: Number(snapshot.meanAbsEnergy || 0),
      crestFactor: Number(snapshot.crestFactor || 0),
      zeroCrossingRate: Number(snapshot.zeroCrossingRate || 0),
      transientScore: Number(snapshot.transientScore || 0),
      bandLowRatio: Number(snapshot.bandLowRatio || 0),
      bandMidRatio: Number(snapshot.bandMidRatio || 0),
      bandHighRatio: Number(snapshot.bandHighRatio || 0),
      spectralCentroidProxy: Number(snapshot.spectralCentroidProxy || snapshot.bandHighRatio || 0),
      dynamicRange: Number(snapshot.dynamicRange || Math.max(0, peakEnergy - Number(snapshot.rmsEnergy || 0))),
      dominantBand: snapshot.dominantBand || "none",
      eventDetected: Boolean(snapshot.eventDetected),
      eventType: snapshot.eventType || "none",
      timestamp: snapshot.timestamp || (Number.isFinite(timestampMs) && timestampMs > 0 ? new Date(timestampMs).toISOString() : defaultTimestamp),
      timestampMs: Number.isFinite(timestampMs) && timestampMs > 0 ? timestampMs : 0
    };
  }

  function attachRuntimeSource(audio, options = {}) {
    const global = options.global || self;
    const label = options.label || "doom.audio";
    const bridge = global.AIKernelWasmAudioProvider || global.aikernelWasmAudioProvider;
    if (typeof bridge?.uploadGpuAudioSnapshot === "function") {
      return bridge.uploadGpuAudioSnapshot(label, audio);
    }

    return {
      kind: "audio-state-buffer",
      zeroCopy: false,
      backend: "runtime-status"
    };
  }

  self.AIKernelDoomAuditoryRuntime = Object.freeze({
    createNeutralSnapshot,
    readBridgeSnapshot,
    snapshotAgeMs,
    snapshotEnergy,
    createRuntimeSnapshot,
    attachRuntimeSource
  });
})();
