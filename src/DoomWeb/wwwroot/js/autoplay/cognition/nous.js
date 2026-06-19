(function () {
  "use strict";

  const DEFAULT_SNAPSHOT_TIMESTAMP = "1970-01-01T00:00:00.000Z";
  const REGION9_COLUMNS = 3;
  const REGION9_ROWS = 3;
  const VISION_GRID_COLUMNS = 9;
  const VISION_GRID_ROWS = 9;
  const CTG_ROM_CANON_ID = "ctg-rom-2-4";
  const CTG_ROM_POLICY_ID = "ctg-policy-fail-closed-v1";

  function createNousCarrier(overrides = {}) {
    return {
      normalizedSensorMap: overrides.normalizedSensorMap || {},
      spatial9x9: overrides.spatial9x9 || {
        baseColumns: REGION9_COLUMNS,
        baseRows: REGION9_ROWS,
        baseSignature: "000000000",
        baseFeatures: [],
        columns: VISION_GRID_COLUMNS,
        rows: VISION_GRID_ROWS,
        signature: "0".repeat(VISION_GRID_COLUMNS * VISION_GRID_ROWS),
        features: []
      },
      movementEnvelope: overrides.movementEnvelope || {
        x: "neutral",
        y: "neutral",
        rotation: "neutral"
      },
      healthEnvelope: overrides.healthEnvelope || {
        life: "neutral",
        retry: "neutral"
      },
      bonsaiTernary: overrides.bonsaiTernary || {
        aisthesis: "neutral",
        kinesis: "neutral",
        phantasia: "neutral"
      },
      ctgTrace: overrides.ctgTrace || {
        canonId: CTG_ROM_CANON_ID,
        policyId: CTG_ROM_POLICY_ID,
        gateExecuted: false,
        ternaryTrace: {}
      },
      meaningVectors: overrides.meaningVectors || {},
      cognitionHints: overrides.cognitionHints || {},
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  function createNousDetectorResult(overrides = {}) {
    const createPhainomenon = self.AIKernelDoomPhainesis?.createPhainomenon;
    if (typeof createPhainomenon === "function") {
      return createPhainomenon(overrides);
    }

    return {
      looming: Object.assign({ active: false, direction: null }, overrides.looming || {}),
      damageLocalization: Object.assign({ active: false, direction: null }, overrides.damageLocalization || {}),
      trap: Object.assign({ active: false, kind: null }, overrides.trap || {}),
      stuck: Object.assign({ active: false, evidence: null }, overrides.stuck || {}),
      explorationEntropy: Object.assign({ high: false }, overrides.explorationEntropy || {}),
      itemBacktrack: Object.assign({ suggested: false, targetKind: null }, overrides.itemBacktrack || {}),
      sensorRecovery: Object.assign({ needed: false, reason: null }, overrides.sensorRecovery || {})
    };
  }

  function normalizeNousSensorMap(sensors) {
    const normalized = {};
    const keys = Object.keys(sensors || {}).sort();
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const sensor = sensors[key] || {};
      normalized[key] = {
        name: sensor.name || key,
        conceptName: sensor.conceptName || "",
        englishName: sensor.englishName || key,
        category: sensor.category || (key === "movement" || key === "spatial" ? "derived" : "primary"),
        enabled: sensor.enabled !== false,
        observed: Boolean(sensor.observed),
        metadata: Object.assign({}, sensor.metadata || {})
      };
    }

    return normalized;
  }

  function buildMeaningVectors(phainomenon = {}) {
    const scores = phainomenon.eventScores || {};
    return {
      wallFlowVector: scoreByName(scores, "wallFlow", phainomenon.wallFlow?.strength),
      gapVector: scoreByName(scores, "gap", phainomenon.gap?.score),
      corridorVector: scoreByName(scores, "corridorFlow", phainomenon.corridorFlow?.score),
      stuckVector: scoreByName(scores, "stuck", phainomenon.stuck?.active ? 1 : 0),
      loomingVector: scoreByName(scores, "looming", phainomenon.looming?.active ? 1 : 0),
      enemyVector: scoreByName(scores, "enemyPresence", phainomenon.enemyPresence?.probability),
      damageVector: scoreByName(scores, "damageLocalization", phainomenon.damageLocalization?.active ? 1 : 0),
      projectileVector: scoreByName(scores, "projectileFlow", phainomenon.projectileFlow?.strength),
      threatVector: scoreByName(scores, "threatField", phainomenon.threatField?.score),
      explorationVector: scoreByName(scores, "explorationEntropy", phainomenon.explorationEntropy?.high ? 1 : 0),
      itemVector: scoreByName(scores, "itemBacktrack", phainomenon.itemBacktrack?.suggested ? 1 : 0),
      goalVector: scoreByName(scores, "goalDirection", phainomenon.goalDirection?.score),
      safeZoneVector: scoreByName(scores, "safeZone", phainomenon.safeZone?.score),
      intentVector: scoreByName(scores, "intentConsistency", phainomenon.intentConsistency?.score),
      stabilityVector: scoreByName(scores, "movementStability", phainomenon.movementStability?.score),
      confidenceVector: scoreByName(scores, "confidenceFusion", phainomenon.confidenceFusion?.score)
    };
  }

  function scoreByName(scores, name, fallback) {
    return clamp01(Number((scores && scores[name]) ?? fallback ?? 0));
  }

  function clamp01(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(0, Math.min(1, number));
  }

  self.AIKernelDoomNous = Object.freeze({
    createNousCarrier,
    createNousDetectorResult,
    normalizeNousSensorMap,
    buildMeaningVectors
  });
})();
