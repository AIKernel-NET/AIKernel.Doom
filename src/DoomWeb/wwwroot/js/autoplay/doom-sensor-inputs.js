(function () {
  "use strict";

  const DEFAULT_SENSORS = Object.freeze([
    ["visual", "Aisthesis", "visual", "primary", true],
    ["audio", "Aisthesis", "audio", "primary", true],
    ["motor", "Kinesis", "motor", "primary", true],
    ["movement", "Kinesis", "movement", "derived", true],
    ["compass", "Hodos", "compass", "primary", true],
    ["spatial", "Topos", "spatial", "derived", true],
    ["health", "Zoe", "health", "primary", true]
  ]);

  function normalizeKind(kind) {
    const normalized = String(kind || "").toLowerCase();
    if (normalized === "vision") {
      return "visual";
    }

    if (normalized === "auditory") {
      return "audio";
    }

    if (normalized === "move" || normalized === "movement-vector") {
      return "movement";
    }

    if (normalized === "heading" || normalized === "bearing") {
      return "compass";
    }

    return normalized || "unknown";
  }

  function conceptName(kind) {
    const normalized = normalizeKind(kind);
    if (normalized === "visual" || normalized === "audio") {
      return "Aisthesis";
    }

    if (normalized === "motor" || normalized === "movement") {
      return "Kinesis";
    }

    if (normalized === "compass") {
      return "Hodos";
    }

    if (normalized === "health") {
      return "Zoe";
    }

    return normalized === "spatial" ? "Topos" : "";
  }

  function category(kind) {
    const normalized = normalizeKind(kind);
    return normalized === "movement" || normalized === "spatial" ? "derived" : "primary";
  }

  function createState(name, sensorConceptName, englishName, sensorCategory, enabled, observed = false, metadata = {}) {
    return {
      name,
      conceptName: sensorConceptName,
      englishName,
      category: sensorCategory,
      enabled: Boolean(enabled),
      observed: Boolean(observed),
      metadata: Object.assign({}, metadata)
    };
  }

  function createMap() {
    const sensors = {};
    for (const [name, sensorConceptName, englishName, sensorCategory, enabled] of DEFAULT_SENSORS) {
      sensors[name] = createState(name, sensorConceptName, englishName, sensorCategory, enabled);
    }

    return sensors;
  }

  function statusMap(sensorInputs) {
    const clone = {};
    const source = sensorInputs || {};
    const keys = Object.keys(source).sort();
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const sensor = source[key];
      if (sensor && typeof sensor === "object") {
        clone[key] = {
          name: sensor.name || key,
          conceptName: sensor.conceptName || conceptName(key),
          englishName: sensor.englishName || key,
          category: sensor.category || category(key),
          enabled: sensor.enabled !== false,
          observed: Boolean(sensor.observed),
          metadata: Object.assign({}, sensor.metadata || {})
        };
      } else {
        clone[key] = createState(
          key,
          conceptName(key),
          key,
          category(key),
          sensor !== false);
      }
    }

    return clone;
  }

  function isEnabled(sensorInputs, kind) {
    const normalized = normalizeKind(kind);
    const sensor = sensorInputs?.[normalized];
    return sensor && typeof sensor === "object"
      ? sensor.enabled !== false
      : sensor !== false;
  }

  function attachObservation(sensors, key, observed, metadata = {}) {
    const current = sensors[key] || createState(
      key,
      conceptName(key),
      key,
      category(key),
      true);
    sensors[key] = {
      ...current,
      observed: Boolean(observed),
      metadata: Object.assign({}, current.metadata || {}, metadata)
    };

    return sensors[key];
  }

  function setEnabled(sensorInputs, kind, enabled) {
    const normalized = normalizeKind(kind);
    const next = Boolean(enabled);
    const current = sensorInputs?.[normalized];
    sensorInputs[normalized] = current && typeof current === "object"
      ? {
        ...current,
        enabled: next
      }
      : createState(
        normalized,
        conceptName(normalized),
        normalized,
        category(normalized),
        next);

    return {
      normalized,
      enabled: next,
      sensor: sensorInputs[normalized]
    };
  }

  self.AIKernelDoomSensorInputs = Object.freeze({
    createMap,
    createState,
    statusMap,
    conceptName,
    category,
    normalizeKind,
    isEnabled,
    attachObservation,
    setEnabled
  });
})();
