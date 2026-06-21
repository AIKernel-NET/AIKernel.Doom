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

function createRuntime({ muted = false, consumeResult = 2 } = {}) {
  const memory = { buffer: new ArrayBuffer(4096) };
  const bufferPtr = 256;
  const channels = 2;
  const frames = 2;
  const pcm = new Int16Array(memory.buffer, bufferPtr, frames * channels);
  pcm[0] = 32767;
  pcm[1] = 0;
  pcm[2] = 0;
  pcm[3] = -32768;

  let consumeCalls = 0;
  const exports = {
    memory,
    doom_audio_status: () => 1,
    doom_audio_sample_rate: () => 44100,
    doom_audio_channels: () => channels,
    doom_audio_buffer: () => bufferPtr,
    doom_audio_capacity_frames: () => 8,
    doom_audio_read_offset_frames: () => 0,
    doom_audio_available_frames: () => frames,
    doom_audio_consume_frames: requested => {
      consumeCalls += 1;
      assert(requested === frames, "native audio should consume the available frame count");
      return consumeResult;
    },
    doom_audio_event_count: () => 7
  };
  const logs = [];

  return {
    exports,
    audioPlaybackMuted: muted,
    nativeAudioLastEventCount: 0,
    nativeAudioFramesDrained: 0,
    nativeAudioLastSnapshot: null,
    autoplayAuditorySnapshot: null,
    nativeAudioLogged: false,
    log: (tag, level, message) => logs.push({ tag, level, message }),
    get consumeCalls() {
      return consumeCalls;
    },
    logs
  };
}

const sandbox = {
  self: {},
  console,
  Array,
  Date,
  Float32Array,
  Int16Array,
  Math,
  Number,
  Object
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/doom-native-audio.js");

const nativeAudio = context.self.AIKernelDoomNativeAudio;
assert(nativeAudio?.isAvailable, "native audio module should export isAvailable");
assert(nativeAudio?.drain, "native audio module should export drain");
assert(nativeAudio.isAvailable({}) === false, "incomplete exports should not be available");
assert(nativeAudio.status({}) === 0, "incomplete exports should report inactive status");
assert(nativeAudio.eventCount({}) === 0, "incomplete exports should report zero events");
assert(nativeAudio.availableFrames({}) === 0, "incomplete exports should report zero frames");

const played = [];
const runtime = createRuntime();
assert(nativeAudio.isAvailable(runtime.exports) === true, "complete native audio exports should be available");
assert(nativeAudio.status(runtime.exports) === 1, "complete native audio exports should expose status");
assert(nativeAudio.eventCount(runtime.exports) === 7, "event count should be read when optional export exists");
assert(nativeAudio.availableFrames(runtime.exports) === 2, "available frame count should be read");

const result = nativeAudio.drain(runtime, {
  bridge: {
    playPcm(payload) {
      played.push(payload);
      return true;
    }
  }
});

assert(result?.consumed === 2, "drain should consume native audio frames");
assert(result.played === true, "drain should forward unmuted PCM to bridge");
assert(runtime.consumeCalls === 1, "drain should consume once");
assert(runtime.nativeAudioFramesDrained === 2, "drain should update drained frame count");
assert(runtime.nativeAudioLastEventCount === 7, "drain should update event count");
assert(runtime.nativeAudioLastSnapshot?.eventType === "native-sfx", "drain should publish native SFX snapshot");
assert(runtime.autoplayAuditorySnapshot === runtime.nativeAudioLastSnapshot, "drain should mirror snapshot to autoplay audio");
assert(runtime.logs.length === 1 && runtime.logs[0].tag === "[AUDIO]", "drain should log first activation");
assert(played.length === 1, "bridge should receive one PCM packet");
assert(played[0].samples instanceof Float32Array, "bridge PCM packet should contain Float32 samples");
assert(played[0].frames === 2 && played[0].channels === 2, "bridge PCM packet should preserve shape");
assert(Math.abs(played[0].snapshot.leftEnergy - 0.5) <= 0.001, "left energy should be normalized");
assert(Math.abs(played[0].snapshot.rightEnergy - 0.5) <= 0.001, "right energy should be normalized");

const mutedRuntime = createRuntime({ muted: true });
const mutedResult = nativeAudio.drain(mutedRuntime, {
  bridge: {
    playPcm() {
      throw new Error("muted native audio should not call playPcm");
    }
  }
});
assert(mutedResult?.played === false, "muted native audio should still drain without playback");
assert(mutedRuntime.nativeAudioFramesDrained === 2, "muted native audio should still count drained frames");

const blockedRuntime = createRuntime({ consumeResult: 0 });
assert(nativeAudio.drain(blockedRuntime) === null, "zero-consume native audio should not publish snapshots");

console.log("DOOM_NATIVE_AUDIO_VM_TEST_OK", {
  played: played.length,
  drained: runtime.nativeAudioFramesDrained,
  muted: mutedResult.played
});
