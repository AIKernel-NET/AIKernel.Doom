(function () {
  "use strict";

  function requireExpressionDsl(name) {
    const fn = self.AIKernelDoomExpressionDsl?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomExpressionDsl.${name} is not available.`);
    }

    return fn;
  }

  function number(value, fallback = 0) {
    return requireExpressionDsl("number")(value, fallback);
  }

  function readParameter(parameters, name) {
    return requireExpressionDsl("readParameter")(parameters, name);
  }

  function wallVector(state) {
    const value = Number(state?.wallVector);
    if (Number.isFinite(value) && Math.abs(value) <= 1) {
      return value;
    }

    const regions = Array.isArray(state?.screen6Regions) ? state.screen6Regions : [];
    if (regions.length < 6) {
      return 0;
    }

    const left = number(regions[0]) + number(regions[1]) + number(regions[2]) * 1.3;
    const right = number(regions[3]) + number(regions[4]) + number(regions[5]) * 1.3;
    return Math.max(-1, Math.min(1, right - left));
  }

  function createContext(profile, state) {
    const parameters = profile?.parameters || {};
    const depthSig = Math.max(0, Math.min(1.5, number(state?.depthSig, 1)));
    const wall = wallVector(state);
    const qDelta = Math.max(-180, Math.min(180, Math.round(number(state?.qDelta, wall * 30))));
    const combatFaceThreshold = number(readParameter(parameters, "combatFaceThreshold"), 0.35);
    const doorAimToleranceDegrees = number(readParameter(parameters, "doorAimToleranceDegrees"), 10);
    const doorSoftAimToleranceDegrees = number(readParameter(parameters, "doorSoftAimToleranceDegrees"), 24);
    const doorAimYawDegrees = number(readParameter(parameters, "doorAimYawDegrees"), 8);
    const openCruiseYawDegrees = number(readParameter(parameters, "openCruiseYawDegrees"), 7);
    const openCruiseDeadZone = number(readParameter(parameters, "openCruiseWallVectorDeadZone"), 0.08);
    const context = String(state?.contextDict || "corridor").trim().toLowerCase();
    const aimYaw = Math.abs(qDelta) > doorSoftAimToleranceDegrees
      ? Math.max(-24, Math.min(24, qDelta))
      : wall > 0 ? doorAimYawDegrees : -doorAimYawDegrees;

    return {
      profile,
      parameters,
      state,
      depthSig,
      wallVector: wall,
      qDelta,
      context,
      values: {
        true: true,
        false: false,
        health: number(state?.health, 100),
        depthSig,
        faceSig: number(state?.faceSig, 0),
        absFaceSig: Math.abs(number(state?.faceSig, 0)),
        soundEvent: Boolean(state?.soundEvent),
        stuckTicks: number(state?.stuckTicks, 0),
        qDelta,
        absQDelta: Math.abs(qDelta),
        recoveryFrames: number(state?.recoveryFrames, 0),
        wallVector: wall,
        absWallVector: Math.abs(wall),
        context,
        escapeYaw: wall > 0
          ? -number(readParameter(parameters, "emergencyEscapeYawDegrees"), 34)
          : number(readParameter(parameters, "emergencyEscapeYawDegrees"), 34),
        combatYaw: number(state?.faceSig, 0) < -combatFaceThreshold
          ? -number(readParameter(parameters, "combatYawDegrees"), 12)
          : number(readParameter(parameters, "combatYawDegrees"), 12),
        wallAwayYaw: wall > 0
          ? -number(readParameter(parameters, "wallAwayYawDegrees"), 6)
          : number(readParameter(parameters, "wallAwayYawDegrees"), 6),
        openCruiseYaw: Math.abs(wall) < openCruiseDeadZone ? 0 : (wall > 0 ? -openCruiseYawDegrees : openCruiseYawDegrees),
        aimYaw,
        doorProbeYaw: Math.abs(qDelta) <= doorAimToleranceDegrees ? 0 : aimYaw
      }
    };
  }

  self.AIKernelDoomControlContext = Object.freeze({
    createContext,
    wallVector
  });
})();
