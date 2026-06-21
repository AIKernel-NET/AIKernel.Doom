(function () {
  "use strict";

  const SENSOR_TENSOR_ROWS = 4;
  const SENSOR_TENSOR_COLS = 8;
  const SENSOR_TENSOR_SIZE = SENSOR_TENSOR_ROWS * SENSOR_TENSOR_COLS;
  const DEFAULT_WALL_QUANTIZATION_STEP = 16;
  const SENSOR_TENSOR_ICD = Object.freeze({
    version: "doom-sensor-tensor-v1",
    rows: SENSOR_TENSOR_ROWS,
    cols: SENSOR_TENSOR_COLS,
    channels: Object.freeze({
      "vision.depth": [0, 0],
      "vision.target": [0, 1],
      "vision.enemy": [0, 2],
      "vision.wall": [0, 3],
      "vision.corner": [0, 4],
      "vision.dark": [0, 5],
      "vision.open": [0, 6],
      "vision.blueFloor": [0, 7],
      "motion.forward": [1, 0],
      "motion.obstacle": [1, 1],
      "motion.turn": [1, 2],
      "motion.entrance": [1, 3],
      "motion.stall": [1, 4],
      "motion.inputStall": [1, 5],
      "motion.stuck": [1, 6],
      "motion.delta": [1, 7],
      "semantic.door": [2, 0],
      "semantic.corridor": [2, 1],
      "semantic.computer": [2, 2],
      "semantic.bridge": [2, 3],
      "semantic.finalRoom": [2, 4],
      "semantic.mapDoor": [2, 5],
      "semantic.mapDark": [2, 6],
      "semantic.mapEnemy": [2, 7],
      "system.ammo": [3, 0],
      "system.health": [3, 1],
      "system.audio": [3, 2],
      "system.combat": [3, 3],
      "system.priority": [3, 4],
      "system.ctg": [3, 5],
      "system.kairos": [3, 6],
      "system.enabled": [3, 7]
    })
  });
  const STABLE_SEMANTIC_SYMBOLS = Object.freeze([
    "door",
    "corridor",
    "enemy",
    "safe-zone",
    "bridge",
    "computer-room"
  ]);
  const SEMANTIC_SYMBOL_CHANNELS = Object.freeze({
    door: Object.freeze(["semantic.door", "semantic.mapDoor"]),
    corridor: Object.freeze(["semantic.corridor", "motion.entrance", "vision.open"]),
    enemy: Object.freeze(["vision.enemy", "semantic.mapEnemy", "system.combat"]),
    bridge: Object.freeze(["semantic.bridge"]),
    "computer-room": Object.freeze(["semantic.computer"]),
    computer: Object.freeze(["semantic.computer"]),
    "final-room": Object.freeze(["semantic.finalRoom"])
  });

  function clamp01(value) {
    const numeric = Number(value || 0);
    return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0;
  }

  function round2(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function normalizeSymbol(symbol) {
    return String(symbol || "")
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-");
  }

  function averageSampleDelta(previous, current) {
    if (!previous?.length || !current?.length) {
      return 255;
    }

    const count = Math.min(previous.length, current.length);
    let total = 0;
    for (let index = 0; index < count; index += 1) {
      total += Math.abs((previous[index] || 0) - (current[index] || 0));
    }

    return total / count;
  }

  function quantizeFrameSample(sample, step = DEFAULT_WALL_QUANTIZATION_STEP) {
    if (!sample?.length) {
      return [];
    }

    const quantizationStep = Math.max(1, Number(step || DEFAULT_WALL_QUANTIZATION_STEP));
    const quantized = new Array(sample.length);
    for (let index = 0; index < sample.length; index += 1) {
      quantized[index] = Math.round((sample[index] || 0) / quantizationStep);
    }

    return quantized;
  }

  function regionSignature(sample, fallback = "000000") {
    if (!sample?.length) {
      return fallback;
    }

    return sample.map(value => Math.max(0, Math.min(15, value || 0)).toString(16)).join("");
  }

  function normalizeFixedRegions(regions, size) {
    const length = Math.max(0, Number(size || 0));
    const result = new Array(length);
    for (let index = 0; index < result.length; index += 1) {
      result[index] = clamp01((regions?.[index] || 0) / 255);
    }

    return result;
  }

  function normalizeScreenRegions(regions, columns = 3, rows = 2) {
    return normalizeFixedRegions(regions, Math.max(0, Number(columns || 0) * Number(rows || 0)));
  }

  function normalizeRegion9(regions, columns = 3, rows = 3) {
    return normalizeFixedRegions(regions, Math.max(0, Number(columns || 0) * Number(rows || 0)));
  }

  function offset(channel) {
    const position = SENSOR_TENSOR_ICD.channels[channel];
    if (!position) {
      return -1;
    }

    return (position[0] * SENSOR_TENSOR_COLS) + position[1];
  }

  function setChannel(data, channel, value) {
    const index = offset(channel);
    if (index < 0) {
      return;
    }

    data[index] = clamp01(value);
  }

  function readChannel(packet, channel) {
    const index = offset(channel);
    if (index < 0 || !packet?.data) {
      return 0;
    }

    return Number(packet.data[index] || 0);
  }

  function semanticScore(packet, symbol) {
    const normalized = normalizeSymbol(symbol);
    const read = channel => clamp01(readChannel(packet, channel));
    if (normalized === "safe-zone") {
      const danger = Math.max(read("vision.enemy"), read("semantic.mapEnemy"), read("system.combat"));
      const stuck = Math.max(read("motion.stall"), read("motion.inputStall"), read("motion.stuck"));
      return clamp01(Math.min(read("system.health"), 1 - danger, 1 - stuck));
    }

    const channels = SEMANTIC_SYMBOL_CHANNELS[normalized] || [];
    let score = 0;
    for (const channel of channels) {
      score = Math.max(score, read(channel));
    }

    return score;
  }

  function semanticScores(packet, symbols = STABLE_SEMANTIC_SYMBOLS) {
    const result = {};
    for (const symbol of symbols) {
      const normalized = normalizeSymbol(symbol);
      if (normalized) {
        result[normalized] = semanticScore(packet, normalized);
      }
    }

    return result;
  }

  function buildPacket(controller, features = {}) {
    const data = new Float32Array(SENSOR_TENSOR_SIZE);
    const set = (channel, value) => setChannel(data, channel, value);
    const memory = controller?.semanticMemory || {};
    const firstDoor = memory.firstDoor || {};
    const computerRoom = memory.computerRoom || {};
    const bridge = memory.bridge || {};
    const finalRoom = memory.finalRoom || {};
    const ctgConfidence = Number(controller?.ctgCarrier?.confidence || 0);
    const kairos = controller?.toposDecisionCarrier?.kairos || controller?.ctgCarrier?.kairos || {};
    const visualDelta = Math.min(
      Number(features.quantizedFrameChange ?? controller?.quantizedFrameChange ?? 255),
      Number(features.regionQuantizedFrameChange ?? controller?.regionQuantizedFrameChange ?? 255));

    set("vision.depth", features.depthEstimate ?? controller?.depthEstimate);
    set("vision.target", Math.max(Number(controller?.targetConfidence || 0), Number(controller?.enemyConfidence || 0)));
    set("vision.enemy", controller?.enemyConfidence);
    set("vision.wall", Math.max(features.wallLike || features.knownWall ? 1 : 0, Number(features.wallPressure || 0) / 96));
    set("vision.corner", Math.max(Number(controller?.cornerSignal || 0), features.knownCorner || features.cornerTrap ? 1 : 0));
    set("vision.dark", controller?.darkAreaScore);
    set("vision.open", features.openView || features.navigableView ? 1 : 0);
    set("vision.blueFloor", controller?.blueFloorScore);
    set("motion.forward", controller?.motionForwardProgress);
    set("motion.obstacle", controller?.motionObstacleScore);
    set("motion.turn", controller?.motionTurnScore);
    set("motion.entrance", controller?.motionEntranceScore);
    set("motion.stall", controller?.motionStallScore);
    set("motion.inputStall", Number(controller?.inputStallFrames || 0) / 12);
    set("motion.stuck", Math.max(Number(controller?.stuckFrames || 0), Number(controller?.quantizedStallFrames || 0)) / 20);
    set("motion.delta", Number.isFinite(visualDelta) ? visualDelta / 12 : 0);
    set("semantic.door", firstDoor.doorConfidence);
    set("semantic.corridor", firstDoor.corridorConfidence);
    set("semantic.computer", computerRoom.confidence);
    set("semantic.bridge", bridge.confidence);
    set("semantic.finalRoom", finalRoom.confidence);
    set("semantic.mapDoor", controller?.mapDoorSectorMatch ? 1 : 0);
    set("semantic.mapDark", controller?.mapDarkSectorMatch ? 1 : 0);
    set("semantic.mapEnemy", controller?.mapEnemyZoneMatch ? 1 : 0);
    set("system.ammo", controller?.ammoLikelyEmpty ? 0 : 1);
    set("system.health", controller?.healthLikelyDead ? 0 : Number(controller?.healthEstimatedPercent ?? 100) / 100);
    set("system.audio", controller?.soundCueActive || controller?.auditorySnapshot?.eventDetected ? 1 : 0);
    set("system.combat", controller?.combatContextActive || Number(controller?.enemyAlertFrames || 0) > 0 ? 1 : 0);
    set("system.priority", Number(controller?.strategyPriority || 0) / 100);
    set("system.ctg", ctgConfidence);
    set("system.kairos", kairos.active ? Math.max(0.5, Number(kairos.boost || 0)) : 0);
    set("system.enabled", controller?.enabled ? 1 : 0);

    return {
      version: SENSOR_TENSOR_ICD.version,
      rows: SENSOR_TENSOR_ROWS,
      cols: SENSOR_TENSOR_COLS,
      data,
      get(channel) {
        return readChannel({ data }, channel);
      }
    };
  }

  function readEvidence(controller) {
    const packet = controller?.sensorTensorPacket || null;
    if (!packet?.data) {
      return {
        routeEvidence: 0,
        corridorConfidence: 0,
        danger: 0,
        stuck: 0,
        door: 0,
        corridor: 0,
        computerRoom: 0,
        bridge: 0,
        source: "none"
      };
    }

    const read = channel => readChannel(packet, channel);
    const door = read("semantic.door");
    const corridor = read("semantic.corridor");
    const computerRoom = read("semantic.computer");
    const bridge = read("semantic.bridge");
    const openView = read("vision.open");
    const blueFloor = read("vision.blueFloor");
    const routeEvidence = clamp01(Math.max(
      door,
      corridor,
      computerRoom,
      bridge,
      read("semantic.finalRoom"),
      read("semantic.mapDoor") * 0.9,
      openView * 0.38,
      blueFloor * 0.42));

    return {
      routeEvidence,
      corridorConfidence: clamp01(Math.max(corridor, read("motion.entrance"), openView * 0.28)),
      danger: clamp01(Math.max(
        read("vision.enemy"),
        read("semantic.mapEnemy"),
        read("system.combat"),
        1 - read("system.health"))),
      stuck: clamp01(Math.max(
        read("motion.stall"),
        read("motion.inputStall"),
        read("motion.stuck"),
        read("motion.obstacle") * 0.5)),
      door,
      corridor,
      computerRoom,
      bridge,
      source: packet.version || SENSOR_TENSOR_ICD.version
    };
  }

  function serializePacket(packet) {
    if (!packet?.data) {
      return null;
    }

    const channelValues = {};
    for (const channel of Object.keys(SENSOR_TENSOR_ICD.channels)) {
      channelValues[channel] = round2(readChannel(packet, channel));
    }

    return {
      version: packet.version || SENSOR_TENSOR_ICD.version,
      shape: [SENSOR_TENSOR_ROWS, SENSOR_TENSOR_COLS],
      data: Array.from(packet.data, value => round2(value)),
      channels: channelValues,
      semantic: Object.assign(semanticScores(packet), {
        combat: channelValues["system.combat"]
      })
    };
  }

  self.AIKernelDoomSensorTensor = Object.freeze({
    icd: SENSOR_TENSOR_ICD,
    rows: SENSOR_TENSOR_ROWS,
    cols: SENSOR_TENSOR_COLS,
    size: SENSOR_TENSOR_SIZE,
    averageSampleDelta,
    buildPacket,
    normalizeFixedRegions,
    normalizeRegion9,
    normalizeScreenRegions,
    normalizeSymbol,
    quantizeFrameSample,
    readChannel,
    readEvidence,
    regionSignature,
    semanticScore,
    semanticScores,
    serializePacket
  });
})();
