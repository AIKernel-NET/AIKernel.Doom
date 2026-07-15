(function () {
  "use strict";

  function normalize(profile, defaults) {
    const base = defaults && typeof defaults === "object" ? defaults : {};
    if (!profile || typeof profile !== "object") {
      return Object.assign({}, base, {
        parameters: Object.assign({}, base.parameters || {}),
        pipeline: base.pipeline || null
      });
    }

    const parameters = profile.parameters && typeof profile.parameters === "object"
      ? Object.assign({}, profile.parameters)
      : {};

    return Object.assign({}, base, profile, parameters, {
      parameters,
      pipeline: profile.pipeline || base.pipeline || null
    });
  }

  function number(profile, key, fallback) {
    const value = Number(profile?.parameters?.[key] ?? profile?.[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function validate(profile) {
    const errors = [];
    if (!profile || typeof profile !== "object") {
      errors.push("profile must be an object");
      return { valid: false, errors };
    }

    if (profile.version !== undefined && typeof profile.version !== "string") {
      errors.push("version must be a string");
    }

    if (profile.strategyName !== undefined && typeof profile.strategyName !== "string") {
      errors.push("strategyName must be a string");
    }

    if (profile.parameters !== undefined && (!profile.parameters || typeof profile.parameters !== "object" || Array.isArray(profile.parameters))) {
      errors.push("parameters must be an object");
    }

    if (profile.pipeline !== undefined && (!profile.pipeline || typeof profile.pipeline !== "object" || Array.isArray(profile.pipeline))) {
      errors.push("pipeline must be an object");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  self.AIKernelDoomAutoplayProfile = {
    normalize,
    number,
    validate
  };
})();
