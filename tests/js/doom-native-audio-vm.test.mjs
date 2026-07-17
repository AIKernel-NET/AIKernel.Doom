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

let float32Allocations = 0;
class TrackedFloat32Array extends Float32Array {
  constructor(...args) {
    super(...args);
    float32Allocations += 1;
  }
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

  const audioEvents = new Map([
    [5, { sfxId: 34, sfxName: "doropn", pointer: 1024 }],
    [6, { sfxId: 46, sfxName: "itemup", pointer: 1040 }],
    [7, { sfxId: 95, sfxName: "noway", pointer: 1056 }]
  ]);
  for (const event of audioEvents.values()) {
    const bytes = new TextEncoder().encode(event.sfxName);
    new Uint8Array(memory.buffer, event.pointer, bytes.length).set(bytes);
  }

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
    doom_audio_event_count: () => 7,
    doom_audio_event_capacity: () => 3,
    doom_audio_event_oldest_sequence: () => 5,
    doom_audio_event_available: sequence => audioEvents.has(sequence) ? 1 : 0,
    doom_audio_event_sfx_id: sequence => audioEvents.get(sequence)?.sfxId ?? -1,
    doom_audio_event_sfx_name: sequence => audioEvents.get(sequence)?.pointer ?? 0,
    doom_audio_event_sfx_name_length: sequence => audioEvents.get(sequence)?.sfxName.length ?? 0,
    doom_run_facts_available: () => 1,
    doom_run_gametic: () => 412,
    doom_run_leveltime: () => 377,
    doom_run_levelstarttic: () => 35,
    doom_run_gamestate: () => 0,
    doom_run_gameepisode: () => 1,
    doom_run_gamemap: () => 1,
    doom_run_level_load_sequence_available: () => 1,
    doom_run_level_load_sequence: () => 9,
    doom_player_facts_available: () => 1,
    doom_player_x_fixed: () => 69206016,
    doom_player_y_fixed: () => -236978176,
    doom_player_angle_bam: () => -1073741824,
    doom_player_momx_fixed: () => -123456,
    doom_player_momy_fixed: () => 234567,
    doom_player_sector_index: () => 3,
    doom_player_health: () => 82,
    doom_player_state: () => 0,
    doom_player_kill_count: () => 1,
    doom_player_weapon_facts_available: () => 1,
    doom_player_ready_weapon: () => 1,
    doom_player_pending_weapon: () => 10,
    doom_player_weapon_state: () => 17,
    doom_player_weapon_ready_state: () => 13,
    doom_player_refire: () => 2,
    doom_state_count: () => 967,
    doom_actor_snapshot_available: () => 1,
    doom_actor_snapshot_gametic: () => 412,
    doom_actor_snapshot_count: () => 2,
    doom_actor_snapshot_capacity: () => 64,
    doom_actor_snapshot_truncated: () => 0,
    doom_actor_identity: index => index === 0 ? -268435456 : 0x00123456,
    doom_actor_x_fixed: index => index === 0 ? 135266304 : 136314880,
    doom_actor_y_fixed: index => index === 0 ? -173015040 : -174063616,
    doom_actor_sector_index: index => index === 0 ? 54 : -1,
    doom_actor_type: index => index === 0 ? 1 : 2,
    doom_actor_health: index => index === 0 ? 60 : -5,
    doom_actor_flags: index => index === 0 ? 0x00400004 : 0x00500004,
    doom_actor_line_of_sight: index => index === 0 ? 1 : 0
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
  Float32Array: TrackedFloat32Array,
  Int16Array,
  Uint8Array,
  Math,
  Number,
  Object,
  String
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/doom-native-audio.js");

const nativeAudio = context.self.AIKernelDoomNativeAudio;
assert(nativeAudio?.isAvailable, "native audio module should export isAvailable");
assert(nativeAudio?.drain, "native audio module should export drain");
assert(nativeAudio?.readAudioEvents, "native audio module should export raw event reader");
assert(nativeAudio?.readRunFacts, "native audio module should export raw run-fact reader");
assert(nativeAudio?.readPlayerFacts, "native audio module should export raw player-fact reader");
assert(nativeAudio?.readActorFacts, "native audio module should export raw actor-fact reader");
assert(nativeAudio?.readFirstDoorFacts, "native audio module should export selective FirstDoor facts");
assert(nativeAudio?.readPostComputerRoomFacts, "native audio module should export selective post-COMPUTERROOM facts");
assert(nativeAudio?.readNativeFacts, "native audio module should export combined raw-fact reader");
assert(nativeAudio?.readE1M1ContinuationFacts, "native audio module should export E1M1 continuation facts");
assert(nativeAudio.isAvailable({}) === false, "incomplete exports should not be available");
assert(nativeAudio.status({}) === 0, "incomplete exports should report inactive status");
assert(nativeAudio.eventCount({}) === 0, "incomplete exports should report zero events");
assert(nativeAudio.availableFrames({}) === 0, "incomplete exports should report zero frames");
const unavailableFacts = nativeAudio.readNativeFacts({}, 4);
assert(unavailableFacts.run.available === false, "missing run ABI should stay explicitly unavailable");
assert(unavailableFacts.run.gametic === null, "unavailable raw counters must not collapse to observed zero");
assert(unavailableFacts.run.levelLoadSequenceAvailable === false, "missing level-load sequence ABI should stay unavailable");
assert(unavailableFacts.run.levelLoadSequence === null, "unavailable level-load sequence must not collapse to zero");
assert(unavailableFacts.player.available === false, "missing player ABI should stay explicitly unavailable");
assert(unavailableFacts.player.xFixed === null, "unavailable signed fixed coordinates must not collapse to observed zero");
assert(unavailableFacts.player.angleBam === null, "unavailable BAM angle must not collapse to observed zero");
assert(unavailableFacts.player.sectorIndex === null, "unavailable sector index must stay distinct from an engine-reported -1");
assert(unavailableFacts.player.health === null, "unavailable player health must not collapse to observed zero");
assert(unavailableFacts.player.playerState === null, "unavailable player state must stay explicit");
assert(unavailableFacts.player.killCount === null, "unavailable kill count must not collapse to observed zero");
assert(unavailableFacts.player.weapon.available === false, "missing weapon ABI should stay explicitly unavailable");
assert(unavailableFacts.player.weapon.stateCount === null, "unavailable state count must stay explicit");
assert(unavailableFacts.player.weapon.readyWeapon === null, "unavailable ready weapon must not collapse to observed zero");
assert(unavailableFacts.player.weapon.pendingWeapon === null, "unavailable pending weapon must stay explicit");
assert(unavailableFacts.player.weapon.weaponState === null, "unavailable weapon psprite state must stay explicit");
assert(unavailableFacts.player.weapon.readyState === null, "unavailable weapon ready state must stay explicit");
assert(unavailableFacts.player.weapon.refire === null, "unavailable refire must not collapse to observed zero");
assert(unavailableFacts.actorSnapshot.available === false, "missing actor ABI should stay explicitly unavailable");
assert(unavailableFacts.actorSnapshot.gametic === null, "unavailable actor gametic must not collapse to observed zero");
assert(unavailableFacts.actorSnapshot.actors.length === 0, "missing actor ABI must not invent actors");
assert(unavailableFacts.audio.available === false, "missing raw event ABI should stay explicitly unavailable");
assert(unavailableFacts.audio.events.length === 0, "missing raw event ABI should not invent events");

const played = [];
const runtime = createRuntime();
assert(nativeAudio.isAvailable(runtime.exports) === true, "complete native audio exports should be available");
assert(nativeAudio.status(runtime.exports) === 1, "complete native audio exports should expose status");
assert(nativeAudio.eventCount(runtime.exports) === 7, "event count should be read when optional export exists");
assert(nativeAudio.availableFrames(runtime.exports) === 2, "available frame count should be read");

const firstDoorRuntime = createRuntime();
for (const name of Object.keys(firstDoorRuntime.exports).filter(name => name.startsWith("doom_actor_"))) {
  firstDoorRuntime.exports[name] = () => {
    throw new Error(`selective FirstDoor facts must not call ${name}`);
  };
}
const firstDoorFacts = nativeAudio.readFirstDoorFacts(firstDoorRuntime.exports, 6);
assert(firstDoorFacts.run.available === true, "selective FirstDoor facts should include run facts");
assert(firstDoorFacts.player.available === true, "selective FirstDoor facts should include player facts");
assert(firstDoorFacts.audio.events.length === 1 && firstDoorFacts.audio.events[0].sequence === 7, "selective FirstDoor facts should honor the audio sequence cursor");
assert(!("actorSnapshot" in firstDoorFacts), "selective FirstDoor facts should omit actor snapshots");

const postComputerRoomRuntime = createRuntime();
for (const name of Object.keys(postComputerRoomRuntime.exports).filter(name => name.startsWith("doom_audio_"))) {
  postComputerRoomRuntime.exports[name] = () => {
    throw new Error(`selective post-COMPUTERROOM facts must not call ${name}`);
  };
}
const postComputerRoomFacts = nativeAudio.readPostComputerRoomFacts(postComputerRoomRuntime.exports);
assert(postComputerRoomFacts.run.available === true, "selective post-COMPUTERROOM facts should include run facts");
assert(postComputerRoomFacts.player.available === true, "selective post-COMPUTERROOM facts should include player facts");
assert(postComputerRoomFacts.actorSnapshot.count === 2, "selective post-COMPUTERROOM facts should include actor snapshots");
assert(!("audio" in postComputerRoomFacts), "selective post-COMPUTERROOM facts should omit audio events");

const rawFacts = nativeAudio.readNativeFacts(runtime.exports, 4);
const continuationFacts = nativeAudio.readE1M1ContinuationFacts(createRuntime().exports, 4);
assert(
  JSON.stringify(continuationFacts) === JSON.stringify(rawFacts),
  "E1M1 continuation facts should reuse the aggregate fact range, ordering, and audio cursor"
);
assert(rawFacts.run.available === true, "native run facts should preserve availability");
assert(rawFacts.run.gametic === 412, "native gametic should be copied without reinterpretation");
assert(rawFacts.run.leveltime === 377, "native leveltime should be copied without reinterpretation");
assert(rawFacts.run.levelstarttic === 35, "native levelstarttic should be copied without reinterpretation");
assert(rawFacts.run.gamestate === 0, "native gamestate zero should remain an observed value");
assert(rawFacts.run.gameepisode === 1 && rawFacts.run.gamemap === 1, "native episode/map should be copied");
assert(rawFacts.run.levelLoadSequenceAvailable === true, "native level-load sequence availability should be copied");
assert(rawFacts.run.levelLoadSequence === 9, "native level-load sequence should be copied without inference");
assert(rawFacts.player.available === true, "native player facts should preserve availability");
assert(rawFacts.player.xFixed === 69206016, "signed player X fixed point should be copied exactly");
assert(rawFacts.player.yFixed === -236978176, "negative player Y fixed point should be copied exactly");
assert(rawFacts.player.angleBam === 0xc0000000, "signed WASM i32 angle must be reinterpreted as unsigned BAM");
assert(rawFacts.player.momentumXFixed === -123456, "negative player X momentum should be copied exactly");
assert(rawFacts.player.momentumYFixed === 234567, "player Y momentum should be copied exactly");
assert(rawFacts.player.sectorIndex === 3, "map-local player sector index should be copied without semantics");
assert(rawFacts.player.health === 82, "native player health should be copied without visual reinterpretation");
assert(rawFacts.player.playerState === 0, "native player state should be copied without policy");
assert(rawFacts.player.killCount === 1, "native kill count should be copied without inference");
assert(rawFacts.player.weapon.available === true, "native weapon facts should preserve independent availability");
assert(rawFacts.player.weapon.stateCount === 967, "native state-table size should cross as a raw engine bound");
assert(rawFacts.player.weapon.readyWeapon === 1, "ready weapon should cross as a raw engine enum");
assert(rawFacts.player.weapon.pendingWeapon === 10, "wp_nochange should cross as its raw engine enum value");
assert(rawFacts.player.weapon.weaponState === 17, "weapon psprite state should cross as a raw engine state index");
assert(rawFacts.player.weapon.readyState === 13, "weapon ready state should cross as a raw engine state index");
assert(rawFacts.player.weapon.refire === 2, "refire should cross as a raw engine counter");
assert(rawFacts.actorSnapshot.available === true, "native actor snapshot should preserve availability");
assert(rawFacts.actorSnapshot.gametic === 412, "actor snapshot gametic should be copied exactly");
assert(rawFacts.actorSnapshot.count === 2 && rawFacts.actorSnapshot.capacity === 64, "actor snapshot bounds should be copied");
assert(rawFacts.actorSnapshot.truncated === false, "actor truncation flag should be copied exactly");
assert(rawFacts.actorSnapshot.actors.length === 2, "all bounded actor rows should be copied");
assert(rawFacts.actorSnapshot.actors[0].identity === 0xf0000000, "signed WASM actor identity must be reinterpreted as uint32");
assert(rawFacts.actorSnapshot.actors[0].xFixed === 135266304, "actor X fixed point should be copied exactly");
assert(rawFacts.actorSnapshot.actors[0].yFixed === -173015040, "actor Y fixed point should retain its sign");
assert(rawFacts.actorSnapshot.actors[0].sectorIndex === 54, "actor sector index should cross without topology policy");
assert(rawFacts.actorSnapshot.actors[0].type === 1, "actor type should cross without classification");
assert(rawFacts.actorSnapshot.actors[0].health === 60, "actor health should cross without liveness policy");
assert(rawFacts.actorSnapshot.actors[0].flags === 0x00400004, "actor flags should cross as uint32 bits");
assert(rawFacts.actorSnapshot.actors[0].lineOfSight === true, "native LOS bit should cross as a boolean");
assert(rawFacts.actorSnapshot.actors[1].health === -5, "negative native actor health should not be clamped");
assert(rawFacts.actorSnapshot.actors[1].sectorIndex === -1, "invalid native actor sector should preserve its -1 sentinel");
assert(rawFacts.actorSnapshot.actors[1].lineOfSight === false, "false native LOS should remain false");
assert(rawFacts.audio.available === true, "native event ring should preserve availability");
assert(rawFacts.audio.latestSequence === 7, "latest native event sequence should be copied");
assert(rawFacts.audio.oldestAvailableSequence === 5, "oldest retained sequence should be copied");
assert(rawFacts.audio.capacity === 3, "native event ring capacity should be copied");
assert(rawFacts.audio.droppedCount === 0, "an in-range sequence should not report dropped events");
assert(rawFacts.audio.events.length === 3, "all retained events since the requested sequence should be returned");
assert(rawFacts.audio.events[0].sequence === 5 && rawFacts.audio.events[0].sfxId === 34, "event identity should preserve sequence and raw id");
assert(rawFacts.audio.events[0].sfxName === "doropn", "raw SFX name should be copied without classification");
assert(rawFacts.audio.events[1].sfxName === "itemup", "unrelated raw SFX names should not be filtered");
assert(rawFacts.audio.events[2].sfxName === "noway", "multiple events between polls should remain ordered");
assert(rawFacts.audio.events[0].sfxNameBytes.join(",") === "100,111,114,111,112,110", "raw SFX bytes should be copied exactly");

const overflowedFacts = nativeAudio.readAudioEvents(runtime.exports, 2);
assert(overflowedFacts.droppedCount === 2, "expired event sequences should be reported explicitly");
assert(overflowedFacts.events.length === 3 && overflowedFacts.events[0].sequence === 5, "expired sequences should resume at the oldest retained event");
const nextFacts = nativeAudio.readAudioEvents(runtime.exports, 6);
assert(nextFacts.events.length === 1 && nextFacts.events[0].sequence === 7, "sequence polling should return only unread events");

const pendingLevelRuntime = createRuntime();
pendingLevelRuntime.exports.doom_run_level_load_sequence_available = () => 0;
const pendingLevelFacts = nativeAudio.readRunFacts(pendingLevelRuntime.exports);
assert(pendingLevelFacts.available === true, "other native run facts should remain available before GS_LEVEL");
assert(pendingLevelFacts.levelLoadSequenceAvailable === false, "pre-level native sequence should preserve explicit unavailability");
assert(pendingLevelFacts.levelLoadSequence === null, "pre-level native sequence should remain null");

const saturatedLevelRuntime = createRuntime();
saturatedLevelRuntime.exports.doom_run_level_load_sequence = () => 0xffffffff;
const saturatedLevelFacts = nativeAudio.readRunFacts(saturatedLevelRuntime.exports);
assert(saturatedLevelFacts.levelLoadSequence === 0xffffffff, "saturated uint32 level-load sequence should be copied exactly");

const signedSaturatedLevelRuntime = createRuntime();
signedSaturatedLevelRuntime.exports.doom_run_level_load_sequence = () => -1;
const signedSaturatedLevelFacts = nativeAudio.readRunFacts(signedSaturatedLevelRuntime.exports);
assert(signedSaturatedLevelFacts.levelLoadSequence === 0xffffffff, "signed WASM i32 sequence must be reinterpreted as uint32");

const pendingPlayerRuntime = createRuntime();
pendingPlayerRuntime.exports.doom_player_facts_available = () => 0;
const pendingPlayerFacts = nativeAudio.readPlayerFacts(pendingPlayerRuntime.exports);
assert(pendingPlayerFacts.available === false, "native player availability must fail closed before GS_LEVEL/player spawn");
assert(pendingPlayerFacts.sectorIndex === null, "unavailable player facts must not call the sector getter");

const incompletePlayerRuntime = createRuntime();
delete incompletePlayerRuntime.exports.doom_player_sector_index;
const incompletePlayerFacts = nativeAudio.readPlayerFacts(incompletePlayerRuntime.exports);
assert(incompletePlayerFacts.available === false, "an incomplete player ABI must fail closed as a unit");

const pendingWeaponRuntime = createRuntime();
pendingWeaponRuntime.exports.doom_player_weapon_facts_available = () => 0;
pendingWeaponRuntime.exports.doom_player_ready_weapon = () => {
  throw new Error("unavailable weapon facts must not read raw fields");
};
const pendingWeaponFacts = nativeAudio.readPlayerFacts(pendingWeaponRuntime.exports);
assert(pendingWeaponFacts.available === true, "weapon unavailability must not erase independently available player facts");
assert(pendingWeaponFacts.weapon.available === false, "native weapon availability must fail closed before a valid psprite exists");
assert(pendingWeaponFacts.weapon.readyWeapon === null, "unavailable weapon facts must use explicit sentinels");

const incompleteWeaponRuntime = createRuntime();
delete incompleteWeaponRuntime.exports.doom_player_weapon_state;
const incompleteWeaponFacts = nativeAudio.readPlayerFacts(incompleteWeaponRuntime.exports);
assert(incompleteWeaponFacts.available === true, "an incomplete weapon ABI must not erase player facts");
assert(incompleteWeaponFacts.weapon.available === false, "an incomplete weapon ABI must fail closed as a nested unit");

const pendingActorRuntime = createRuntime();
pendingActorRuntime.exports.doom_actor_snapshot_available = () => 0;
pendingActorRuntime.exports.doom_actor_snapshot_count = () => {
  throw new Error("unavailable actor snapshot must not read rows");
};
const pendingActorFacts = nativeAudio.readActorFacts(pendingActorRuntime.exports);
assert(pendingActorFacts.available === false, "native actor availability must fail closed before a snapshot exists");
assert(pendingActorFacts.gametic === null && pendingActorFacts.actors.length === 0, "unavailable actor snapshot must use explicit sentinels");

const incompleteActorRuntime = createRuntime();
delete incompleteActorRuntime.exports.doom_actor_sector_index;
const incompleteActorFacts = nativeAudio.readActorFacts(incompleteActorRuntime.exports);
assert(incompleteActorFacts.available === false, "an incomplete actor ABI must fail closed as a unit");

const clonedActorFacts = nativeAudio.readActorFacts(runtime.exports);
rawFacts.actorSnapshot.actors[0].health = 1;
rawFacts.actorSnapshot.actors[0].sectorIndex = 59;
assert(clonedActorFacts.actors[0].health === 60, "actor reads must return independent value snapshots");
assert(clonedActorFacts.actors[0].sectorIndex === 54, "actor sector reads must return independent value snapshots");

for (const [name, mutate, pattern] of [
  ["capacity", exports => { exports.doom_actor_snapshot_capacity = () => 65; }, /capacity/],
  ["count", exports => { exports.doom_actor_snapshot_count = () => 65; }, /count/],
  ["sector", exports => { exports.doom_actor_sector_index = () => 0x80000000; }, /non-int32/],
  ["sector-sentinel", exports => { exports.doom_actor_sector_index = () => -2; }, /sector index below -1/],
  ["los", exports => { exports.doom_actor_line_of_sight = () => 2; }, /0 or 1/],
  ["player-health", exports => { exports.doom_player_health = () => "82"; }, /non-int32/],
  ["weapon-availability", exports => { exports.doom_player_weapon_facts_available = () => 2; }, /0 or 1/],
  ["ready-weapon", exports => { exports.doom_player_ready_weapon = () => "1"; }, /non-int32/],
  ["pending-weapon", exports => { exports.doom_player_pending_weapon = () => 0x80000000; }, /non-int32/],
  ["weapon-state", exports => { exports.doom_player_weapon_state = () => 1.5; }, /non-int32/],
  ["weapon-ready-state", exports => { exports.doom_player_weapon_ready_state = () => Number.NaN; }, /non-int32/],
  ["weapon-refire", exports => { exports.doom_player_refire = () => Number.POSITIVE_INFINITY; }, /non-int32/],
  ["weapon-state-count", exports => { exports.doom_state_count = () => "967"; }, /non-int32/]
]) {
  const malformedRuntime = createRuntime();
  mutate(malformedRuntime.exports);
  let thrown = null;
  try {
    if (name === "player-health" || name.startsWith("weapon-") || name === "ready-weapon" || name === "pending-weapon") {
      nativeAudio.readPlayerFacts(malformedRuntime.exports);
    } else {
      nativeAudio.readActorFacts(malformedRuntime.exports);
    }
  } catch (error) {
    thrown = error;
  }
  assert(thrown && pattern.test(thrown.message), `malformed native ${name} must fail strict wire validation`);
}

const allocationsBeforePlayback = float32Allocations;
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
assert(float32Allocations === allocationsBeforePlayback + 1, "unmuted native audio should allocate one playback PCM buffer");
assert(played[0].samples instanceof Float32Array, "bridge PCM packet should contain Float32 samples");
assert(played[0].frames === 2 && played[0].channels === 2, "bridge PCM packet should preserve shape");
assert(Math.abs(played[0].snapshot.leftEnergy - 0.5) <= 0.001, "left energy should be normalized");
assert(Math.abs(played[0].snapshot.rightEnergy - 0.5) <= 0.001, "right energy should be normalized");
assert(Math.abs(played[0].snapshot.peakEnergy - 0.5) <= 0.001, "peak energy should be exposed");
assert(played[0].snapshot.level > 0 && played[0].snapshot.level <= 1, "audio level should be normalized");
assert(played[0].snapshot.attenuation >= 0 && played[0].snapshot.attenuation <= 1, "audio attenuation should be normalized");
assert(played[0].snapshot.rmsEnergy > 0, "RMS energy should be exposed");
assert(played[0].snapshot.crestFactor > 0, "crest factor should be exposed");
assert(played[0].snapshot.zeroCrossingRate > 0, "zero crossing rate should be exposed for polarity changes");
assert(played[0].snapshot.bandLowRatio >= 0 && played[0].snapshot.bandHighRatio >= 0, "band ratios should be exposed");
assert(Number.isFinite(played[0].snapshot.timestampMs), "snapshot should expose timestampMs");

const mutedRuntime = createRuntime({ muted: true });
const allocationsBeforeMutedDrain = float32Allocations;
const mutedResult = nativeAudio.drain(mutedRuntime, {
  bridge: {
    playPcm() {
      throw new Error("muted native audio should not call playPcm");
    }
  }
});
assert(mutedResult?.played === false, "muted native audio should still drain without playback");
assert(float32Allocations === allocationsBeforeMutedDrain, "muted native audio should not allocate a playback PCM buffer");
assert(mutedRuntime.consumeCalls === 1, "muted native audio should still consume the native ring once");
assert(mutedRuntime.nativeAudioFramesDrained === 2, "muted native audio should still count drained frames");
for (const key of [
  "leftEnergy",
  "rightEnergy",
  "balance",
  "dominantFreq",
  "lowEnergy",
  "midEnergy",
  "highEnergy",
  "peakEnergy",
  "level",
  "attenuation",
  "waveformPeak",
  "rmsEnergy",
  "meanAbsEnergy",
  "crestFactor",
  "zeroCrossingRate",
  "transientScore",
  "bandLowRatio",
  "bandMidRatio",
  "bandHighRatio",
  "spectralCentroidProxy",
  "dynamicRange",
  "dominantBand",
  "eventDetected",
  "eventType"
]) {
  assert(mutedRuntime.nativeAudioLastSnapshot?.[key] === runtime.nativeAudioLastSnapshot?.[key], `muted native audio should preserve ${key}`);
}

const blockedRuntime = createRuntime({ consumeResult: 0 });
assert(nativeAudio.drain(blockedRuntime) === null, "zero-consume native audio should not publish snapshots");

const sourceAdapter = readFileSync(path.join(repoRoot, "src/DoomWeb/wwwroot/js/doom-native-audio.js"), "utf8");
const demoAdapter = readFileSync(path.join(repoRoot, "src/DoomWeb/wwwroot/demo/doom/js/doom-native-audio.js"), "utf8");
assert(sourceAdapter === demoAdapter, "source and demo native audio transports should stay byte-identical");

console.log("DOOM_NATIVE_AUDIO_VM_TEST_OK", {
  played: played.length,
  drained: runtime.nativeAudioFramesDrained,
  muted: mutedResult.played,
  rawEvents: rawFacts.audio.events.length,
  runGametic: rawFacts.run.gametic,
  levelLoadSequence: rawFacts.run.levelLoadSequence,
  playerSector: rawFacts.player.sectorIndex,
  playerAngleBam: rawFacts.player.angleBam,
  playerHealth: rawFacts.player.health,
  readyWeapon: rawFacts.player.weapon.readyWeapon,
  stateCount: rawFacts.player.weapon.stateCount,
  pendingWeapon: rawFacts.player.weapon.pendingWeapon,
  weaponState: rawFacts.player.weapon.weaponState,
  weaponReadyState: rawFacts.player.weapon.readyState,
  refire: rawFacts.player.weapon.refire,
  actors: rawFacts.actorSnapshot.count
});
