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
    const vetoRules = normalizeVetoRules(profile?.pipeline?.kinesis?.zoe?.vetoRules, [
      "hp < 10",
      "lethalRisk > 0.7"
    ]);
    const health = number(state?.health, 100);
    const healthState = {
      health,
      hp: health,
      lethalRisk: number(state?.lethalRisk, health <= 0 ? 1 : Math.max(0, Math.min(1, (10 - health) / 10)))
    };
    const context = buildContext({ parameters: {}, pipeline: {} }, healthState);

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
