(function () {
  "use strict";

  const CHRONOS_WINDOW_LIMIT = 32;
  const DEFAULT_SNAPSHOT_TIMESTAMP = "1970-01-01T00:00:00.000Z";
  const VISION_GRID_COLUMNS = 9;
  const VISION_GRID_ROWS = 9;

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function clampSigned(value) {
    return Math.max(-1, Math.min(1, Number(value) || 0));
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function normalizeRelativeDirection(value) {
    return value === "left" || value === "right" || value === "center" || value === "front" || value === "behind"
      ? value
      : null;
  }

  function createChronosWindow(overrides = {}) {
    const frames = Array.isArray(overrides.frames) ? overrides.frames.slice(-CHRONOS_WINDOW_LIMIT) : [];
    return { frames };
  }

  function createPhantasiaSnapshot(overrides = {}) {
    return {
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP,
      signature: overrides.signature || "0".repeat(VISION_GRID_COLUMNS * VISION_GRID_ROWS),
      base3x3Signature: overrides.base3x3Signature || "000000000",
      base3x3: overrides.base3x3 || [],
      spatial9x9: overrides.spatial9x9 || [],
      rawSpatial9x9: overrides.rawSpatial9x9 || overrides.spatial9x9 || [],
      dynamicMask9x9: overrides.dynamicMask9x9 || [],
      dynamicMaskCells: Number(overrides.dynamicMaskCells || 0),
      baseDirection: normalizeRelativeDirection(overrides.baseDirection),
      projectile9x9: overrides.projectile9x9 || [],
      projectileScore: round2(clamp01(Number(overrides.projectileScore ?? 0))),
      projectileDirection: normalizeRelativeDirection(overrides.projectileDirection),
      resource9x9: overrides.resource9x9 || [],
      resourceScore: round2(clamp01(Number(overrides.resourceScore ?? 0))),
      resourceDirection: normalizeRelativeDirection(overrides.resourceDirection),
      enemyConfidence: round2(clamp01(Number(overrides.enemyConfidence ?? 0))),
      trustedEnemyThreat: round2(clamp01(Number(overrides.trustedEnemyThreat ?? 0))),
      trustedCombatEvidence: Boolean(overrides.trustedCombatEvidence),
      audioBalance: round2(clampSigned(Number(overrides.audioBalance ?? 0))),
      audioEnergy: round2(clamp01(Number(overrides.audioEnergy ?? 0))),
      audioLowEnergy: round2(clamp01(Number(overrides.audioLowEnergy ?? 0))),
      audioMidEnergy: round2(clamp01(Number(overrides.audioMidEnergy ?? 0))),
      audioHighEnergy: round2(clamp01(Number(overrides.audioHighEnergy ?? 0))),
      audioDominantBand: overrides.audioDominantBand || "none",
      audioEventDetected: Boolean(overrides.audioEventDetected),
      audioEventType: String(overrides.audioEventType || "none").toLowerCase(),
      audioDirection: normalizeRelativeDirection(overrides.audioDirection) || null,
      movementSpeed: round2(clamp01(Number(overrides.movementSpeed ?? 0))),
      motorForward: round2(clampSigned(Number(overrides.motorForward ?? 0))),
      temporalDelta: round2(clamp01(Number(overrides.temporalDelta ?? 0))),
      flowX: round2(clampSigned(Number(overrides.flowX ?? 0))),
      flowY: round2(clampSigned(Number(overrides.flowY ?? 0))),
      dynamicObjectScore: round2(clamp01(Number(overrides.dynamicObjectScore ?? 0))),
      spatialConfidence: round2(clamp01(Number(overrides.spatialConfidence ?? 0))),
      spatialEvent: Boolean(overrides.spatialEvent),
      depthEstimate: round2(clamp01(Number(overrides.depthEstimate ?? 1))),
      firstDoorVision9x9Score: round2(clamp01(Number(overrides.firstDoorVision9x9Score ?? 0))),
      firstDoorUse3x3Score: round2(clamp01(Number(overrides.firstDoorUse3x3Score ?? 0))),
      spawnCorridorGapScore: round2(clamp01(Number(overrides.spawnCorridorGapScore ?? 0))),
      spawnLandmarkRouteEvidence: round2(clamp01(Number(overrides.spawnLandmarkRouteEvidence ?? 0))),
      computerRoomScore: round2(clamp01(Number(overrides.computerRoomScore ?? 0))),
      computerPanelScore: round2(clamp01(Number(overrides.computerPanelScore ?? 0))),
      computerDarkPanelScore: round2(clamp01(Number(overrides.computerDarkPanelScore ?? 0))),
      bridgeDoorScore: round2(clamp01(Number(overrides.bridgeDoorScore ?? 0))),
      healthActiveCells: Number(overrides.healthActiveCells || 0),
      healthZeroScore: round2(clamp01(Number(overrides.healthZeroScore ?? 0))),
      faceDelta: round2(Number(overrides.faceDelta ?? 255)),
      narrowness: round2(clamp01(Number(overrides.narrowness ?? 0))),
      stuckFrames: Number(overrides.stuckFrames || 0),
      inputStallFrames: Number(overrides.inputStallFrames || 0)
    };
  }

  self.AIKernelDoomPhantasia = Object.freeze({
    createChronosWindow,
    createPhantasiaSnapshot,
    normalizeRelativeDirection
  });
})();
