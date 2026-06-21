(function () {
  "use strict";

  function number(value, fallback = 0) {
    const converted = Number(value);
    return Number.isFinite(converted) ? converted : fallback;
  }

  function requireFunction(value, name) {
    if (typeof value !== "function") {
      throw new Error(`AIKernelDoomControlZoeVeto requires ${name}.`);
    }

    return value;
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
    const health = number(state?.healthSensor?.value ?? state?.healthSensor?.health ?? state?.health, 100);
    const fallbackRisk = health <= 0
      ? 1
      : Math.max(0, Math.min(1, (lowHealthThreshold - health) / lowHealthThreshold));
    const lethalRisk = number(state?.lethalRisk, fallbackRisk);
    const vetoRules = normalizeVetoRules(profile?.pipeline?.kinesis?.zoe?.vetoRules, [
      "hp <= 0",
      "criticalHealth && lethalRisk > 0.65",
      "lethalRisk > 0.90"
    ]);
    const healthState = Object.assign({}, state || {}, {
      health,
      hp: health,
      lowHealthThreshold,
      criticalHealthThreshold,
      lowHealth: health > 0 && health < lowHealthThreshold,
      criticalHealth: health > 0 && health < criticalHealthThreshold,
      lowHealthGoalFirst: health > 0 && health < lowHealthThreshold,
      lethalRisk
    });
    const context = buildContext({
      parameters,
      pipeline: profile?.pipeline || {}
    }, healthState);

    for (const rule of vetoRules) {
      if (evaluateWhen(context, rule)) {
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
