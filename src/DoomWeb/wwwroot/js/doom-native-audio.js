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

  const RAW_AUDIO_EVENT_EXPORTS = [
    "doom_audio_event_count",
    "doom_audio_event_capacity",
    "doom_audio_event_oldest_sequence",
    "doom_audio_event_available",
    "doom_audio_event_sfx_id",
    "doom_audio_event_sfx_name",
    "doom_audio_event_sfx_name_length"
  ];

  const RAW_RUN_FACT_EXPORTS = [
    "doom_run_facts_available",
    "doom_run_gametic",
    "doom_run_leveltime",
    "doom_run_levelstarttic",
    "doom_run_gamestate",
    "doom_run_gameepisode",
    "doom_run_gamemap",
    "doom_run_level_load_sequence_available",
    "doom_run_level_load_sequence"
  ];

  const RAW_PLAYER_FACT_EXPORTS = [
    "doom_player_facts_available",
    "doom_player_x_fixed",
    "doom_player_y_fixed",
    "doom_player_angle_bam",
    "doom_player_momx_fixed",
    "doom_player_momy_fixed",
    "doom_player_sector_index",
    "doom_player_health",
    "doom_player_state",
    "doom_player_kill_count"
  ];

  const RAW_PLAYER_WEAPON_FACT_EXPORTS = [
    "doom_player_weapon_facts_available",
    "doom_player_ready_weapon",
    "doom_player_pending_weapon",
    "doom_player_weapon_state",
    "doom_player_weapon_ready_state",
    "doom_player_refire",
    "doom_state_count"
  ];

  const RAW_ACTOR_FACT_EXPORTS = [
    "doom_actor_snapshot_available",
    "doom_actor_snapshot_gametic",
    "doom_actor_snapshot_count",
    "doom_actor_snapshot_capacity",
    "doom_actor_snapshot_truncated",
    "doom_actor_identity",
    "doom_actor_x_fixed",
    "doom_actor_y_fixed",
    "doom_actor_sector_index",
    "doom_actor_type",
    "doom_actor_health",
    "doom_actor_flags",
    "doom_actor_line_of_sight"
  ];

  const MIN_INT32 = -0x80000000;
  const MAX_INT32 = 0x7fffffff;
  const MAX_ACTOR_SNAPSHOT_CAPACITY = 64;

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

  function hasFunctions(exports, names) {
    return Boolean(exports && names.every(name => typeof exports[name] === "function"));
  }

  function uint32(value) {
    const number = Number(value);
    return Number.isFinite(number) ? (Math.trunc(number) >>> 0) : 0;
  }

  function int32Export(exports, name, ...args) {
    const value = exports[name](...args);
    if (!Number.isSafeInteger(value) || value < MIN_INT32 || value > MAX_INT32) {
      throw new TypeError(`${name} returned a non-int32 value`);
    }

    return value;
  }

  function uint32Export(exports, name, ...args) {
    return int32Export(exports, name, ...args) >>> 0;
  }

  function booleanExport(exports, name, ...args) {
    const value = int32Export(exports, name, ...args);
    if (value !== 0 && value !== 1) {
      throw new TypeError(`${name} returned a value other than 0 or 1`);
    }

    return value === 1;
  }

  function sectorIndexExport(exports, name, ...args) {
    const value = int32Export(exports, name, ...args);
    if (value < -1) {
      throw new RangeError(`${name} returned a sector index below -1`);
    }

    return value;
  }

  function readSfxName(exports, sequence) {
    const pointer = uint32(exports.doom_audio_event_sfx_name(sequence));
    const length = Math.min(255, uint32(exports.doom_audio_event_sfx_name_length(sequence)));
    if (!pointer || !length || !exports.memory?.buffer || pointer + length > exports.memory.buffer.byteLength) {
      return { sfxName: "", sfxNameBytes: [] };
    }

    const source = new Uint8Array(exports.memory.buffer, pointer, length);
    const sfxNameBytes = Array.from(source);
    let sfxName = "";
    for (const byte of sfxNameBytes) {
      sfxName += String.fromCharCode(byte);
    }

    return { sfxName, sfxNameBytes };
  }

  function readAudioEvents(exports, afterSequence = 0) {
    const requestedAfterSequence = uint32(afterSequence);
    if (!hasFunctions(exports, RAW_AUDIO_EVENT_EXPORTS) || !exports.memory?.buffer) {
      return {
        available: false,
        afterSequence: requestedAfterSequence,
        latestSequence: eventCount(exports),
        oldestAvailableSequence: 0,
        capacity: 0,
        droppedCount: 0,
        events: []
      };
    }

    const latestSequence = uint32(exports.doom_audio_event_count());
    const oldestAvailableSequence = uint32(exports.doom_audio_event_oldest_sequence());
    const capacity = uint32(exports.doom_audio_event_capacity());
    const firstRequestedSequence = requestedAfterSequence + 1;
    const firstSequence = Math.max(oldestAvailableSequence || firstRequestedSequence, firstRequestedSequence);
    const droppedCount = oldestAvailableSequence > firstRequestedSequence
      ? oldestAvailableSequence - firstRequestedSequence
      : 0;
    const events = [];

    for (let sequence = firstSequence; sequence <= latestSequence && events.length < capacity; sequence += 1) {
      if (!exports.doom_audio_event_available(sequence)) {
        continue;
      }

      const name = readSfxName(exports, sequence);
      events.push({
        sequence,
        sfxId: Math.trunc(Number(exports.doom_audio_event_sfx_id(sequence))),
        sfxName: name.sfxName,
        sfxNameBytes: name.sfxNameBytes
      });
    }

    return {
      available: true,
      afterSequence: requestedAfterSequence,
      latestSequence,
      oldestAvailableSequence,
      capacity,
      droppedCount,
      events
    };
  }

  function readRunFacts(exports) {
    if (!hasFunctions(exports, RAW_RUN_FACT_EXPORTS) || !exports.doom_run_facts_available()) {
      return {
        available: false,
        gametic: null,
        leveltime: null,
        levelstarttic: null,
        gamestate: null,
        gameepisode: null,
        gamemap: null,
        levelLoadSequenceAvailable: false,
        levelLoadSequence: null
      };
    }

    const levelLoadSequenceAvailable = Boolean(exports.doom_run_level_load_sequence_available());

    return {
      available: true,
      gametic: Math.trunc(Number(exports.doom_run_gametic())),
      leveltime: Math.trunc(Number(exports.doom_run_leveltime())),
      levelstarttic: Math.trunc(Number(exports.doom_run_levelstarttic())),
      gamestate: Math.trunc(Number(exports.doom_run_gamestate())),
      gameepisode: Math.trunc(Number(exports.doom_run_gameepisode())),
      gamemap: Math.trunc(Number(exports.doom_run_gamemap())),
      levelLoadSequenceAvailable,
      levelLoadSequence: levelLoadSequenceAvailable
        ? uint32(exports.doom_run_level_load_sequence())
        : null
    };
  }

  function readPlayerFacts(exports) {
    if (!hasFunctions(exports, RAW_PLAYER_FACT_EXPORTS) || !exports.doom_player_facts_available()) {
      return {
        available: false,
        xFixed: null,
        yFixed: null,
        angleBam: null,
        momentumXFixed: null,
        momentumYFixed: null,
        sectorIndex: null,
        health: null,
        playerState: null,
        killCount: null,
        weapon: unavailablePlayerWeaponFacts()
      };
    }

    return {
      available: true,
      xFixed: int32Export(exports, "doom_player_x_fixed"),
      yFixed: int32Export(exports, "doom_player_y_fixed"),
      angleBam: uint32Export(exports, "doom_player_angle_bam"),
      momentumXFixed: int32Export(exports, "doom_player_momx_fixed"),
      momentumYFixed: int32Export(exports, "doom_player_momy_fixed"),
      sectorIndex: int32Export(exports, "doom_player_sector_index"),
      health: int32Export(exports, "doom_player_health"),
      playerState: int32Export(exports, "doom_player_state"),
      killCount: int32Export(exports, "doom_player_kill_count"),
      weapon: readPlayerWeaponFacts(exports)
    };
  }

  function unavailablePlayerWeaponFacts() {
    return {
      available: false,
      stateCount: null,
      readyWeapon: null,
      pendingWeapon: null,
      weaponState: null,
      readyState: null,
      refire: null
    };
  }

  function readPlayerWeaponFacts(exports) {
    if (!hasFunctions(exports, RAW_PLAYER_WEAPON_FACT_EXPORTS)) {
      return unavailablePlayerWeaponFacts();
    }

    if (!booleanExport(exports, "doom_player_weapon_facts_available")) {
      return unavailablePlayerWeaponFacts();
    }

    return {
      available: true,
      stateCount: int32Export(exports, "doom_state_count"),
      readyWeapon: int32Export(exports, "doom_player_ready_weapon"),
      pendingWeapon: int32Export(exports, "doom_player_pending_weapon"),
      weaponState: int32Export(exports, "doom_player_weapon_state"),
      readyState: int32Export(exports, "doom_player_weapon_ready_state"),
      refire: int32Export(exports, "doom_player_refire")
    };
  }

  function unavailableActorFacts() {
    return {
      available: false,
      gametic: null,
      count: 0,
      capacity: 0,
      truncated: false,
      actors: []
    };
  }

  function readActorFacts(exports) {
    if (!hasFunctions(exports, RAW_ACTOR_FACT_EXPORTS)) {
      return unavailableActorFacts();
    }

    if (!booleanExport(exports, "doom_actor_snapshot_available")) {
      return unavailableActorFacts();
    }

    const gametic = int32Export(exports, "doom_actor_snapshot_gametic");
    const count = int32Export(exports, "doom_actor_snapshot_count");
    const capacity = int32Export(exports, "doom_actor_snapshot_capacity");
    const truncated = booleanExport(exports, "doom_actor_snapshot_truncated");
    if (gametic < 0) {
      throw new RangeError("doom_actor_snapshot_gametic returned a negative value");
    }
    if (capacity < 0 || capacity > MAX_ACTOR_SNAPSHOT_CAPACITY) {
      throw new RangeError(`doom_actor_snapshot_capacity must be within [0,${MAX_ACTOR_SNAPSHOT_CAPACITY}]`);
    }
    if (count < 0 || count > capacity) {
      throw new RangeError("doom_actor_snapshot_count must be within the reported capacity");
    }

    const actors = [];
    for (let index = 0; index < count; index += 1) {
      actors.push({
        identity: uint32Export(exports, "doom_actor_identity", index),
        xFixed: int32Export(exports, "doom_actor_x_fixed", index),
        yFixed: int32Export(exports, "doom_actor_y_fixed", index),
        sectorIndex: sectorIndexExport(exports, "doom_actor_sector_index", index),
        type: int32Export(exports, "doom_actor_type", index),
        health: int32Export(exports, "doom_actor_health", index),
        flags: uint32Export(exports, "doom_actor_flags", index),
        lineOfSight: booleanExport(exports, "doom_actor_line_of_sight", index)
      });
    }

    return {
      available: true,
      gametic,
      count,
      capacity,
      truncated,
      actors
    };
  }

  function readFirstDoorFacts(exports, afterAudioSequence = 0) {
    return {
      run: readRunFacts(exports),
      player: readPlayerFacts(exports),
      audio: readAudioEvents(exports, afterAudioSequence)
    };
  }

  function readPostComputerRoomFacts(exports) {
    return {
      run: readRunFacts(exports),
      player: readPlayerFacts(exports),
      actorSnapshot: readActorFacts(exports)
    };
  }

  function readNativeFacts(exports, afterAudioSequence = 0) {
    return {
      run: readRunFacts(exports),
      player: readPlayerFacts(exports),
      actorSnapshot: readActorFacts(exports),
      audio: readAudioEvents(exports, afterAudioSequence)
    };
  }

  function readE1M1ContinuationFacts(exports, afterAudioSequence = 0) {
    return readNativeFacts(exports, afterAudioSequence);
  }

  function clamp01(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(0, Math.min(1, number));
  }

  function dominantBandFromRatios(lowRatio, midRatio, highRatio) {
    const low = Number(lowRatio || 0);
    const mid = Number(midRatio || 0);
    const high = Number(highRatio || 0);
    if (high >= mid && high >= low) {
      return "high";
    }
    if (low >= mid && low >= high) {
      return "low";
    }

    return "mid";
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
    const samples = runtime.audioPlaybackMuted
      ? null
      : new Float32Array(sampleCount);
    let leftEnergy = 0;
    let rightEnergy = 0;
    let monoAbsEnergy = 0;
    let monoSquareEnergy = 0;
    let waveformPeak = 0;
    let zeroCrossings = 0;
    let waveformDelta = 0;
    let previousMono = 0;
    let previousSign = 0;

    for (let i = 0, j = 0; i < frames; i += 1, j += channels) {
      const left = source[j] / 32768;
      const right = channels > 1 ? source[j + 1] / 32768 : left;
      if (samples) {
        samples[j] = left;
        if (channels > 1) {
          samples[j + 1] = right;
        }
      }
      leftEnergy += Math.abs(left);
      rightEnergy += Math.abs(right);
      const mono = (left + right) * 0.5;
      const absMono = Math.abs(mono);
      const sign = mono > 0 ? 1 : (mono < 0 ? -1 : previousSign);
      monoAbsEnergy += absMono;
      monoSquareEnergy += mono * mono;
      waveformPeak = Math.max(waveformPeak, absMono);
      if (i > 0) {
        waveformDelta += Math.abs(mono - previousMono);
        if (sign && previousSign && sign !== previousSign) {
          zeroCrossings += 1;
        }
      }
      previousMono = mono;
      if (sign) {
        previousSign = sign;
      }
    }

    const consumed = exports.doom_audio_consume_frames(frames);
    if (consumed <= 0) {
      return null;
    }

    leftEnergy = Math.min(1, leftEnergy / consumed);
    rightEnergy = Math.min(1, rightEnergy / consumed);
    const meanAbsEnergy = clamp01(monoAbsEnergy / consumed);
    const rmsEnergy = clamp01(Math.sqrt(monoSquareEnergy / consumed));
    const peakEnergy = clamp01(Math.max(leftEnergy, rightEnergy, waveformPeak));
    const crestFactor = rmsEnergy > 0.0001
      ? Math.min(12, peakEnergy / rmsEnergy)
      : 0;
    const zeroCrossingRate = consumed > 1
      ? clamp01(zeroCrossings / Math.max(1, consumed - 1))
      : 0;
    const meanDelta = consumed > 1
      ? clamp01(waveformDelta / Math.max(1, consumed - 1))
      : 0;
    const transientScore = clamp01(((crestFactor - 1) / 5) + Math.max(0, peakEnergy - meanAbsEnergy));
    const highRatio = clamp01(Math.max(zeroCrossingRate * 1.8, meanDelta / Math.max(0.001, peakEnergy)));
    const lowRatio = clamp01(1 - highRatio);
    const midRatio = clamp01(1 - Math.abs(0.5 - highRatio) * 1.4);
    const denominator = Math.max(0.0001, leftEnergy + rightEnergy);
    const balance = Math.max(-1, Math.min(1, (rightEnergy - leftEnergy) / denominator));
    const eventCountValue = eventCount(exports);
    const nowMs = Date.now();
    const level = clamp01(Math.sqrt(Math.max(0, peakEnergy) * 2.25));
    const snapshot = {
      active: true,
      leftEnergy: round3(leftEnergy),
      rightEnergy: round3(rightEnergy),
      balance: round3(balance),
      dominantFreq: 0,
      lowEnergy: round3(Math.max(leftEnergy, rightEnergy) * 0.38),
      midEnergy: round3(Math.max(leftEnergy, rightEnergy) * 0.72),
      highEnergy: round3(Math.max(leftEnergy, rightEnergy) * 0.28),
      peakEnergy: round3(peakEnergy),
      level: round3(level),
      attenuation: round3(1 - level),
      waveformPeak: round3(waveformPeak),
      rmsEnergy: round3(rmsEnergy),
      meanAbsEnergy: round3(meanAbsEnergy),
      crestFactor: round3(crestFactor),
      zeroCrossingRate: round3(zeroCrossingRate),
      transientScore: round3(transientScore),
      bandLowRatio: round3(lowRatio),
      bandMidRatio: round3(midRatio),
      bandHighRatio: round3(highRatio),
      spectralCentroidProxy: round3(highRatio),
      dynamicRange: round3(Math.max(0, peakEnergy - rmsEnergy)),
      dominantBand: dominantBandFromRatios(lowRatio, midRatio, highRatio),
      eventDetected: eventCountValue !== runtime.nativeAudioLastEventCount || Math.max(leftEnergy, rightEnergy) > 0.01,
      eventType: "native-sfx",
      timestamp: new Date(nowMs).toISOString(),
      timestampMs: nowMs
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
    readAudioEvents,
    readRunFacts,
    readPlayerFacts,
    readActorFacts,
    readFirstDoorFacts,
    readPostComputerRoomFacts,
    readNativeFacts,
    readE1M1ContinuationFacts,
    drain
  });
})();
