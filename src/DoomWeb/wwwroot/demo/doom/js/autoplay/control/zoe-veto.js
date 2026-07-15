(function () {
  "use strict";

  function number(value, fallback = 0) {
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : fallback;
  }

  function faceHealthPercentFromLevel(level, phase) {
    const normalizedPhase = String(phase || "").trim().toLowerCase();
    if (normalizedPhase === "dead" || normalizedPhase === "death" || normalizedPhase === "dead-fixed") {
      return 0;
    }
    if (normalizedPhase === "invulnerable" || normalizedPhase === "god" || normalizedPhase === "iddqd") {
      return 100;
    }

    const parsed = Math.round(number(level, NaN));
    if (!Number.isFinite(parsed)) {
      return NaN;
    }

    if (parsed >= 5) {
      return 100;
    }
    if (parsed === 4) {
      return 75;
    }
    if (parsed === 3) {
      return 55;
    }
    if (parsed === 2) {
      return 30;
    }
    if (parsed === 1) {
      return 12;
    }
    return NaN;
  }

  function meaningfulFaceValue(...values) {
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (value === undefined || value === null) {
        continue;
      }
      const text = String(value).trim().toLowerCase();
      if (text && text !== "unknown" && text !== "none") {
        return value;
      }
    }
    return undefined;
  }

  function isDefinitiveFacePhase(phase) {
    const normalized = String(phase || "").trim().toLowerCase();
    return normalized === "dead"
      || normalized === "death"
      || normalized === "dead-fixed"
      || normalized === "invulnerable"
      || normalized === "god"
      || normalized === "iddqd";
  }

  function resolveHealthPercent(fallback, ...sources) {
    let numericHealth = NaN;
    let faceHealth = NaN;
    let faceConfidence = 0;
    let faceAuthoritative = false;

    sources.forEach(source => {
      if (!source || typeof source !== "object") {
        return;
      }

      const numeric = number(
        source.health
          ?? source.hp
          ?? source.value
          ?? source.estimatedPercent
          ?? source.healthEstimatedPercent,
        NaN);
      if (Number.isFinite(numeric) && !Number.isFinite(numericHealth)) {
        numericHealth = Math.max(0, Math.min(100, numeric));
      }

      const stablePhase = meaningfulFaceValue(
        source.faceLifeTemplatePhase,
        source.healthFaceLifeTemplatePhase,
        source.faceLifePhase,
        source.healthFaceLifePhase);
      const stableLevel = meaningfulFaceValue(
        source.faceLifeTemplateLevel,
        source.healthFaceLifeTemplateLevel,
        source.faceLifeLevel,
        source.healthFaceLifeLevel);
      let candidate = faceHealthPercentFromLevel(stableLevel, stablePhase);
      if (!Number.isFinite(candidate)) {
        const quantizedPhase = meaningfulFaceValue(
          source.faceLifeQuantizedPhase,
          source.healthFaceLifeQuantizedPhase);
        const quantizedLevel = meaningfulFaceValue(
          source.faceLifeQuantizedLevel,
          source.healthFaceLifeQuantizedLevel);
        const quantizedCandidate = faceHealthPercentFromLevel(quantizedLevel, quantizedPhase);
        const quantizedConfidence = Math.max(0, Math.min(1, number(
          source.faceLifeQuantizedConfidence
            ?? source.healthFaceLifeQuantizedConfidence
            ?? source.faceTemplateConfidence
            ?? source.healthFaceTemplateConfidence,
          0)));
        if (Number.isFinite(quantizedCandidate)
            && (isDefinitiveFacePhase(quantizedPhase) || quantizedConfidence >= 0.92)) {
          candidate = quantizedCandidate;
        }
      }
      if (!Number.isFinite(candidate) && Number.isFinite(numeric) && numeric > 0 && numeric <= 5) {
        const phaseHint = meaningfulFaceValue(
          stablePhase,
          source.faceLifePattern,
          source.healthFaceLifePattern);
        if (phaseHint !== undefined || source.faceHeartbeatAlive === true || source.faceSignatureValid === true) {
          candidate = faceHealthPercentFromLevel(numeric, phaseHint);
        }
      }
      const confidence = Math.max(0, Math.min(1, number(
        source.faceLifeTemplateConfidence
          ?? source.healthFaceLifeTemplateConfidence
          ?? source.faceTemplateConfidence
          ?? source.healthFaceTemplateConfidence
          ?? source.faceLifeConfidence
          ?? source.healthFaceLifeConfidence,
        0)));
      if (Number.isFinite(candidate) && confidence >= faceConfidence) {
        faceHealth = candidate;
        faceConfidence = confidence;
        faceAuthoritative = faceAuthoritative
          || Boolean(source.faceLifeTemplateAuthoritative)
          || Boolean(source.healthFaceLifeTemplateAuthoritative);
      }
    });

    const faceTrusted = Number.isFinite(faceHealth)
      && (faceAuthoritative || !Number.isFinite(numericHealth) || numericHealth <= 0);
    const numericLooksLikeFaceLevel = Number.isFinite(faceHealth)
      && Number.isFinite(numericHealth)
      && numericHealth > 0
      && numericHealth <= 5;
    if (faceTrusted || numericLooksLikeFaceLevel) {
      return faceHealth;
    }
    if (Number.isFinite(numericHealth)) {
      return numericHealth;
    }
    return Math.max(0, Math.min(100, number(fallback, 100)));
  }

  function requireFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`AIKernelDoomControlZoeVeto requires ${name}.`);
    }

    return value;
  }

  function hasOwn(object, name) {
    return Object.prototype.hasOwnProperty.call(object || {}, name);
  }

  function resolveDoorOpenedCount(state) {
    return Math.max(
      number(state?.doorOpenedCount, 0),
      number(state?.milestones?.doorOpenedCount, 0),
      number(state?.milestones?.doorOpened, 0),
      number(state?.autoplayState?.doorOpenedCount, 0)
    );
  }

  function hasDoorRouteContext(state) {
    const milestones = state?.milestones;
    return hasOwn(state, "doorOpenedCount")
      || hasOwn(state, "firstDoorOpened")
      || (milestones && typeof milestones === "object" && (
        hasOwn(milestones, "doorOpenedCount")
          || hasOwn(milestones, "doorOpened")
      ))
      || (state?.semanticMemory && typeof state.semanticMemory === "object")
      || typeof state?.currentObjective === "string"
      || typeof state?.semanticObjective === "string";
  }

  function applyZoeVeto(action, state, profile, helpers = {}) {
    const evaluateWhen = requireFunction(helpers.evaluateWhen, "helpers.evaluateWhen");
    const buildContext = requireFunction(helpers.buildContext, "helpers.buildContext");
    const parameters = profile?.parameters || {};
    const lowHealthThreshold = Math.max(1, Math.min(100, Math.round(number(
      state?.lowHealthThreshold ?? parameters.lowHealthThreshold,
      50))));
    const criticalHealthThreshold = Math.max(1, Math.min(lowHealthThreshold, Math.round(number(
      state?.criticalHealthThreshold ?? parameters.criticalHealthThreshold,
      18))));
    const healthSensor = state?.healthSensor && typeof state.healthSensor === "object"
      ? state.healthSensor
      : {};
    const numericHealth = Math.max(
      number(healthSensor.health, NaN),
      number(healthSensor.value, NaN),
      number(healthSensor.estimatedPercent, NaN),
      number(state?.health, NaN),
      number(state?.hp, NaN),
      number(state?.value, NaN),
      number(state?.estimatedPercent, NaN));
    const faceAuthoritative = Boolean(
      healthSensor.faceLifeTemplateAuthoritative
        || healthSensor.healthFaceLifeTemplateAuthoritative
        || state?.faceLifeTemplateAuthoritative
        || state?.healthFaceLifeTemplateAuthoritative);
    const criticalBloodAlive = Boolean(
      healthSensor.criticalBloodAlive
        || state?.criticalBloodAlive
        || state?.healthCriticalBloodAlive);
    const health = Number.isFinite(numericHealth)
      && numericHealth >= lowHealthThreshold
      && !faceAuthoritative
      && !criticalBloodAlive
      && healthSensor.retryRequested !== true
      && healthSensor.likelyDead !== true
      ? Math.max(0, Math.min(100, numericHealth))
      : resolveHealthPercent(100, healthSensor, state);
    const faceVitalEvidence = faceAuthoritative
      || criticalBloodAlive
      || healthSensor.retryRequested === true
      || healthSensor.likelyDead === true
      || state?.retryRequested === true
      || state?.likelyDead === true
      || Boolean(healthSensor.faceVitalEnabled || state?.faceVitalEnabled)
      || Boolean(healthSensor.faceHeartbeatAlive || healthSensor.healthFaceHeartbeatAlive || state?.faceHeartbeatAlive || state?.healthFaceHeartbeatAlive)
      || number(
        healthSensor.faceHeartbeatOpacity
          ?? healthSensor.healthFaceHeartbeatOpacity
          ?? state?.faceHeartbeatOpacity
          ?? state?.healthFaceHeartbeatOpacity,
        0) > 0.05;
    const trustedHealth = state?.healthThreatEvidenceTrusted === false
      && !faceVitalEvidence
      && health > 0
      && health < lowHealthThreshold
      ? 100
      : health;
    const fallbackRisk = trustedHealth <= 0
      ? 1
      : Math.max(0, Math.min(1, (lowHealthThreshold - trustedHealth) / lowHealthThreshold));
    const doorOpenedCount = resolveDoorOpenedCount(state);
    const firstDoorOpened = doorOpenedCount > 0 || state?.firstDoorOpened === true;
    const deathOrRetry = trustedHealth <= 0
      || healthSensor.retryRequested === true
      || healthSensor.likelyDead === true
      || state?.healthRetryRequested === true
      || state?.healthLikelyDead === true;
    const preDoorHealthVetoSuppressed = hasDoorRouteContext(state)
      && !firstDoorOpened
      && !deathOrRetry;
    const lowHealthRaw = trustedHealth > 0 && trustedHealth < lowHealthThreshold;
    const criticalHealthRaw = trustedHealth > 0 && trustedHealth < criticalHealthThreshold;
    const lowHealth = !preDoorHealthVetoSuppressed && lowHealthRaw;
    const criticalHealth = !preDoorHealthVetoSuppressed && criticalHealthRaw;
    const lethalRisk = preDoorHealthVetoSuppressed ? 0 : number(state?.lethalRisk, fallbackRisk);
    const vetoRules = normalizeVetoRules(profile?.pipeline?.kinesis?.zoe?.vetoRules, [
      "hp <= 0",
      "criticalHealth && lethalRisk > 0.65",
      "lethalRisk > 0.90"
    ]);
    const healthState = Object.assign({}, state || {}, {
      health: trustedHealth,
      hp: trustedHealth,
      lowHealthThreshold,
      criticalHealthThreshold,
      lowHealth,
      criticalHealth,
      lowHealthGoalFirst: lowHealth,
      preDoorHealthVetoSuppressed,
      firstDoorOpened,
      doorOpenedCount,
      lethalRisk
    });
    const context = buildContext({
      parameters,
      pipeline: profile?.pipeline || {}
    }, healthState);
    const stageText = [
      action?.stage,
      action?.pipeline,
      action?.objective,
      state?.stage,
      state?.pipeline,
      state?.controlPipeline,
      state?.objective
    ].join(" ").toLowerCase();
    const routeText = [
      state?.currentRoute,
      state?.route,
      state?.routeMode,
      state?.previousRouteMode,
      state?.semanticObjective,
      state?.currentObjective,
      state?.objective
    ].join(" ").toLowerCase();
    const centralHallOpeningBurstOverride = stageText.indexOf("central-hall-opening-burst-fire") >= 0
      && state?.centralHallEntered === true
      && number(state?.enemyDefeatedCount, 0) <= 0
      && state?.ammoLikelyEmpty !== true
      && !deathOrRetry;
    const postDoorGoalRouteOverride = firstDoorOpened
      && !deathOrRetry
      && (lowHealthRaw || criticalHealthRaw)
      && (routeText.indexOf("post-door") >= 0
        || routeText.indexOf("cross-bridge") >= 0
        || routeText.indexOf("central-hall") >= 0
        || routeText.indexOf("bridge") >= 0
        || stageText.indexOf("low-health") >= 0
        || stageText.indexOf("bridge-poison") >= 0
        || stageText.indexOf("computer-room-egress") >= 0
        || stageText.indexOf("post-door-central") >= 0)
      && (String(action?.move || "").toLowerCase() === "forward"
        || stageText.indexOf("low-health") >= 0
        || stageText.indexOf("bridge-poison") >= 0
        || stageText.indexOf("computer-room-egress") >= 0
        || stageText.indexOf("post-door-central") >= 0);

    for (const rule of vetoRules) {
      if (evaluateWhen(context, rule)) {
        if (centralHallOpeningBurstOverride) {
          return Object.assign({}, action || {}, {
            zoeVetoed: false,
            zoeVetoBypassed: true,
            svcEvent: "central-hall-opening-burst-overrides-zoe",
            safetyReason: action?.safetyReason || "central-hall-opening-burst"
          });
        }
        if (postDoorGoalRouteOverride) {
          return Object.assign({}, action || {}, {
            fire: false,
            zoeVetoed: false,
            zoeVetoBypassed: true,
            svcEvent: "post-door-low-health-goal-route-overrides-zoe",
            safetyReason: action?.safetyReason || "post-door-low-health-goal-route"
          });
        }
        return Object.assign({}, action || {}, {
          move: "none",
          turn: "none",
          turnYaw: 0,
          fire: false,
          strafe: false,
          use: false,
          run: false,
          source: "zoe",
          zoeVetoed: true,
          svcEvent: `zoe-veto:${rule}`,
          safetyReason: "zoe-veto"
        });
      }
    }

    return Object.assign({}, action || {}, {
      zoeVetoed: false,
      svcEvent: "none"
    });
  }

  function normalizeVetoRules(values, fallback) {
    if (!Array.isArray(values) || !values.length) {
      return fallback.slice();
    }

    return values
      .map(rule => typeof rule === "string" ? rule : rule?.when)
      .map(rule => String(rule || "").trim())
      .filter(Boolean);
  }

  self.AIKernelDoomControlZoeVeto = Object.freeze({
    applyZoeVeto
  });
})();
