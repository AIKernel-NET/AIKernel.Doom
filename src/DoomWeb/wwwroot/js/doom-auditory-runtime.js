(function () {
  "use strict";

  const DEFAULT_SNAPSHOT_TIMESTAMP = "1970-01-01T00:00:00.000Z";

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
      dominantBand: "none",
      eventDetected: false,
      eventType: "none",
      timestamp: defaultTimestamp
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
      Number(snapshot?.highEnergy || 0));
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

    return {
      active: Boolean(snapshot.eventDetected) || snapshotEnergy(snapshot) > 0.002,
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
      timestamp: snapshot.timestamp || (snapshot.timestampMs ? new Date(Number(snapshot.timestampMs)).toISOString() : defaultTimestamp)
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
