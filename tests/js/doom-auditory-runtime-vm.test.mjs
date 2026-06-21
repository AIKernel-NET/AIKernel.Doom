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
}

const sandbox = {
  self: {},
  console,
  Date,
  Math,
  Number,
  Object
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/doom-auditory-runtime.js");

const auditory = context.self.AIKernelDoomAuditoryRuntime;
assert(auditory?.createRuntimeSnapshot, "auditory runtime module should export createRuntimeSnapshot");
assert(auditory?.attachRuntimeSource, "auditory runtime module should export attachRuntimeSource");

const neutral = auditory.createNeutralSnapshot("zero");
assert(neutral.timestamp === "zero", "neutral snapshot should use supplied timestamp");
assert(neutral.active === false && neutral.dominantBand === "none", "neutral snapshot should be inactive");

const nowMs = Date.parse("2026-06-18T00:00:01.000Z");
const runtimeSnapshot = {
  leftEnergy: 0.12,
  rightEnergy: 0.08,
  lowEnergy: 0.03,
  eventDetected: false,
  eventType: "runtime",
  timestampMs: nowMs - 500
};
const bridgeSnapshot = {
  leftEnergy: 0.45,
  rightEnergy: 0.42,
  balance: -0.03,
  midEnergy: 0.5,
  dominantBand: "mid",
  eventDetected: true,
  eventType: "bridge",
  timestampMs: nowMs - 300
};
const runtime = { autoplayAuditorySnapshot: runtimeSnapshot };
const bridgeGlobal = {
  AIKernelWasmAudioProvider: {
    status() {
      return { lastSnapshot: bridgeSnapshot };
    }
  }
};

assert(auditory.readBridgeSnapshot(bridgeGlobal) === bridgeSnapshot, "readBridgeSnapshot should return provider snapshot");
assert(auditory.snapshotAgeMs({ timestampMs: nowMs - 250 }, nowMs) === 250, "snapshotAgeMs should use timestampMs");
assert(auditory.snapshotAgeMs({ timestamp: "2026-06-18T00:00:00.750Z" }, nowMs) === 250, "snapshotAgeMs should parse timestamp");
assert(auditory.snapshotEnergy({ leftEnergy: 0.1, midEnergy: 0.6 }) === 0.6, "snapshotEnergy should use strongest band");

const bridgePreferred = auditory.createRuntimeSnapshot(runtime, {
  global: bridgeGlobal,
  nowMs,
  defaultTimestamp: "zero"
});
assert(bridgePreferred.eventType === "bridge", "fresh higher-energy bridge snapshot should be preferred");
assert(bridgePreferred.active === true, "eventful bridge snapshot should be active");
assert(bridgePreferred.timestamp === new Date(bridgeSnapshot.timestampMs).toISOString(), "timestampMs should be serialized");

const runtimePreferred = auditory.createRuntimeSnapshot(runtime, {
  bridgeSnapshot: { leftEnergy: 0.01, timestampMs: nowMs - 300, eventType: "quiet-bridge" },
  nowMs,
  defaultTimestamp: "zero"
});
assert(runtimePreferred.eventType === "runtime", "runtime snapshot should win when bridge energy is lower");
assert(runtimePreferred.active === true, "runtime snapshot should be active when energy is present");

const stale = auditory.createRuntimeSnapshot({
  autoplayAuditorySnapshot: { leftEnergy: 0.9, timestampMs: nowMs - 5000, eventType: "stale" }
}, {
  bridgeSnapshot: { leftEnergy: 0.8, timestampMs: nowMs - 5000, eventType: "stale-bridge" },
  nowMs,
  defaultTimestamp: "zero"
});
assert(stale.timestamp === "zero" && stale.active === false, "stale snapshots should collapse to neutral");

const uploads = [];
const uploaded = auditory.attachRuntimeSource({ active: true }, {
  label: "doom.audio",
  global: {
    AIKernelWasmAudioProvider: {
      uploadGpuAudioSnapshot(label, audio) {
        uploads.push({ label, audio });
        return { kind: "gpu-audio", zeroCopy: true };
      }
    }
  }
});
assert(uploaded.kind === "gpu-audio" && uploaded.zeroCopy === true, "attachRuntimeSource should use GPU bridge when present");
assert(uploads.length === 1 && uploads[0].label === "doom.audio", "attachRuntimeSource should pass label to bridge");

const fallback = auditory.attachRuntimeSource({ active: false }, { global: {} });
assert(fallback.kind === "audio-state-buffer", "attachRuntimeSource should expose runtime fallback");
assert(fallback.zeroCopy === false, "fallback source should not claim zero-copy");

console.log("DOOM_AUDITORY_RUNTIME_VM_TEST_OK", {
  bridge: bridgePreferred.eventType,
  runtime: runtimePreferred.eventType,
  upload: uploaded.kind
});
