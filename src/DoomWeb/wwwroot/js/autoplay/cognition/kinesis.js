(function () {
  "use strict";

  const REGION9_COLUMNS = 3;
  const REGION9_ROWS = 3;
  const DEFAULT_SNAPSHOT_TIMESTAMP = "1970-01-01T00:00:00.000Z";

  function clampSigned(value) {
    return Math.max(-1, Math.min(1, Number(value) || 0));
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function averageValues(...values) {
    if (!values.length) {
      return 0;
    }

    let total = 0;
    for (let index = 0; index < values.length; index += 1) {
      total += Number(values[index] || 0);
    }

    return total / values.length;
  }

  function normalizeAction(action = {}, fallback = null) {
    const source = action || fallback || {};
    return {
      move: source.move === "back" || source.move === "backward" ? "back" : (source.move === "forward" ? "forward" : "none"),
      turn: source.turn === "left" ? "left" : (source.turn === "right" ? "right" : "none"),
      fire: Boolean(source.fire),
      strafe: Boolean(source.strafe),
      use: Boolean(source.use),
      run: Boolean(source.run)
    };
  }

  function neutralAction() {
    return normalizeAction();
  }

  function actionSignature(action) {
    const safe = normalizeAction(action);
    return [
      safe.move,
      safe.turn,
      safe.fire ? "f" : "-",
      safe.strafe ? "s" : "-",
      safe.use ? "u" : "-",
      safe.run ? "r" : "-"
    ].join(":");
  }

  function actionTurnToX(turn) {
    return turn === "right" ? 1 : (turn === "left" ? -1 : 0);
  }

  function describeActionVector(action) {
    const safe = normalizeAction(action);
    return `${safe.turn || "none"}:${safe.move || "none"}${safe.use ? ":use" : ""}${safe.fire ? ":fire" : ""}`;
  }

  function commandPriority(reason) {
    if (reason === "loop-escape" || reason === "breadcrumb-loop" || reason === "sensor-emergency") {
      return 3;
    }

    if (String(reason || "").startsWith("door-probe") || reason === "wall-survey" || reason === "combat") {
      return 2;
    }

    if (reason && reason !== "clear" && reason !== "none") {
      return 1;
    }

    return 0;
  }

  function ternarySigned(value, threshold = 0.22) {
    const parsed = Number(value) || 0;
    if (parsed >= threshold) {
      return "positive";
    }

    if (parsed <= -threshold) {
      return "negative";
    }

    return "neutral";
  }

  function ternaryScore(value, low = 0.25, high = 0.62) {
    const parsed = clamp01(Number(value) || 0);
    if (parsed >= high) {
      return "positive";
    }

    if (parsed <= low) {
      return "negative";
    }

    return "neutral";
  }

  function resolveMotionIntent(action) {
    const safe = normalizeAction(action);
    const move = safe.move === "forward" ? "forward" : (safe.move === "back" ? "back" : "");
    const turn = safe.turn === "left" || safe.turn === "right" ? "turn" : "";
    const strafe = safe.strafe ? "strafe" : "";
    const parts = [move, turn, strafe].filter(Boolean);
    return parts.length ? parts.join("-") : "idle";
  }

  function analyzeRegion9Motion(previous, current, action) {
    const safe = normalizeAction(action);
    const fallback = {
      signature: "000000000",
      delta: 255,
      forwardProgress: 0,
      obstacleScore: 0,
      turnScore: 0,
      entranceScore: 0,
      stallScore: 0,
      intent: resolveMotionIntent(safe)
    };
    if (!previous?.length || !current?.length) {
      return fallback;
    }

    const count = Math.min(REGION9_COLUMNS * REGION9_ROWS, previous.length, current.length);
    const motion = new Array(REGION9_COLUMNS * REGION9_ROWS).fill(0);
    let total = 0;
    for (let index = 0; index < count; index += 1) {
      const value = Math.abs((current[index] || 0) - (previous[index] || 0));
      motion[index] = value;
      total += value;
    }

    const top = averageValues(motion[0], motion[1], motion[2]);
    const middle = averageValues(motion[3], motion[4], motion[5]);
    const bottom = averageValues(motion[6], motion[7], motion[8]);
    const left = averageValues(motion[0], motion[3], motion[6]);
    const center = averageValues(motion[1], motion[4], motion[7]);
    const right = averageValues(motion[2], motion[5], motion[8]);
    const centerObstacle = averageValues(motion[4], motion[7]);
    const sideMotion = averageValues(left, right);
    const delta = count ? total / count : 255;
    const forwardProgress = clamp01((center * 0.55 + top * 0.25 + middle * 0.2) / 4);
    const obstacleScore = clamp01((centerObstacle - sideMotion * 0.35 + bottom * 0.12) / 4);
    const turnScore = clamp01(Math.abs(left - right) / 4);
    const entranceScore = clamp01(right / 4);
    const stallScore = clamp01(1 - (delta / 2.2));
    const signature = motion
      .map(value => Math.max(0, Math.min(15, Math.round(value))).toString(16))
      .join("");

    return {
      signature,
      delta: round2(delta),
      forwardProgress: round2(forwardProgress),
      obstacleScore: round2(obstacleScore),
      turnScore: round2(turnScore),
      entranceScore: round2(entranceScore),
      stallScore: round2(stallScore),
      intent: resolveMotionIntent(safe)
    };
  }

  function createMovementSensorSnapshot(overrides = {}) {
    const vectorX = clampSigned(Number(overrides.vectorX ?? 0));
    const vectorY = clampSigned(Number(overrides.vectorY ?? 0));
    const speed = clamp01(Number(overrides.speed ?? Math.sqrt((vectorX * vectorX) + (vectorY * vectorY))));
    const confidence = clamp01(Number(overrides.confidence ?? speed));
    return {
      active: Boolean(overrides.active),
      vectorX: round2(vectorX),
      vectorY: round2(vectorY),
      speed: round2(speed),
      turn: ternarySigned(vectorX),
      advance: ternarySigned(vectorY),
      confidence: round2(confidence),
      eventDetected: Boolean(overrides.eventDetected ?? confidence >= 0.42),
      eventType: overrides.eventType || "movement",
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  function createMotorSensorSnapshot(overrides = {}) {
    const vectorX = clampSigned(Number(overrides.vectorX ?? 0));
    const vectorY = clampSigned(Number(overrides.vectorY ?? 0));
    return {
      active: Boolean(overrides.active),
      move: overrides.move || "none",
      turn: overrides.turn || "none",
      strafe: Boolean(overrides.strafe),
      run: Boolean(overrides.run),
      use: Boolean(overrides.use),
      fire: Boolean(overrides.fire),
      vectorX: round2(vectorX),
      vectorY: round2(vectorY),
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  function createCompassSensorSnapshot(overrides = {}) {
    const heading = ((Number(overrides.heading ?? 0) % 360) + 360) % 360;
    const baseHeading = ((Number(overrides.baseHeading ?? heading) % 360) + 360) % 360;
    const vectorX = clampSigned(Number(overrides.vectorX ?? 0));
    const vectorY = clampSigned(Number(overrides.vectorY ?? 0));
    const active = Boolean(overrides.active);
    const confidence = round2(clamp01(Number(overrides.confidence ?? 0)));
    const headingUsable = overrides.headingUsable == null
      ? active && confidence >= 0.05 && !overrides.headingUncertain
      : overrides.headingUsable !== false && !overrides.headingUncertain;
    return {
      active,
      heading: round2(heading),
      origin: overrides.origin || "N=0deg",
      baseHeading: round2(baseHeading),
      vectorX: round2(vectorX),
      vectorY: round2(vectorY),
      visualBias: round2(clampSigned(Number(overrides.visualBias || 0))),
      visualFlowBias: round2(clampSigned(Number(overrides.visualFlowBias || 0))),
      baseFlowBias: round2(clampSigned(Number(overrides.baseFlowBias || 0))),
      motorBias: round2(clampSigned(Number(overrides.motorBias || 0))),
      audioBias: round2(clampSigned(Number(overrides.audioBias || 0))),
      movementBias: round2(clampSigned(Number(overrides.movementBias || 0))),
      visualBiasDelta: round2(Number(overrides.visualBiasDelta || 0)),
      visualFlowDelta: round2(Number(overrides.visualFlowDelta || 0)),
      baseFlowDelta: round2(Number(overrides.baseFlowDelta || 0)),
      motorDelta: round2(Number(overrides.motorDelta || 0)),
      audioDelta: round2(Number(overrides.audioDelta || 0)),
      movementDelta: round2(Number(overrides.movementDelta || 0)),
      landmarkDelta: round2(Number(overrides.landmarkDelta || 0)),
      motorHeading: overrides.motorHeading == null ? null : round2(Number(overrides.motorHeading)),
      visualFlowHeading: overrides.visualFlowHeading == null ? null : round2(Number(overrides.visualFlowHeading)),
      rotationInstructionDelta: round2(Number(overrides.rotationInstructionDelta || 0)),
      frameBufferVectorDelta: round2(Number(overrides.frameBufferVectorDelta || 0)),
      edgeSnapDelta: round2(Number(overrides.edgeSnapDelta || 0)),
      edgeSnapHeading: overrides.edgeSnapHeading == null ? null : round2(Number(overrides.edgeSnapHeading)),
      edgeSnapConfidence: round2(clamp01(Number(overrides.edgeSnapConfidence || 0))),
      edgeSnapWeight: round2(clamp01(Number(overrides.edgeSnapWeight || 0))),
      correctionDegrees: round2(Number(overrides.correctionDegrees || 0)),
      correctionSource: overrides.correctionSource || "relative-sensor-fusion",
      landmark: overrides.landmark || "",
      landmarkKind: overrides.landmarkKind || "",
      landmarkLabel: overrides.landmarkLabel || "",
      landmarkHeading: overrides.landmarkHeading == null ? null : round2(Number(overrides.landmarkHeading)),
      landmarkConfidence: round2(clamp01(Number(overrides.landmarkConfidence || 0))),
      landmarkForced: Boolean(overrides.landmarkForced),
      evidence: round2(clamp01(Number(overrides.evidence || 0))),
      confidence,
      headingUsable,
      headingUncertain: !headingUsable,
      headingReliability: overrides.headingReliability || (headingUsable ? "relative-stable" : "relative-uncertain"),
      useCompassForRouting: headingUsable && overrides.useCompassForRouting !== false,
      contextResetActive: Boolean(overrides.contextResetActive),
      wallFollowActive: Boolean(overrides.wallFollowActive),
      wallOnlyView: Boolean(overrides.wallOnlyView),
      corridorOnlyView: Boolean(overrides.corridorOnlyView),
      source: overrides.source || "relative-sensor-fusion",
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  function createSpatialSensorSnapshot(overrides = {}) {
    return {
      active: Boolean(overrides.active),
      vectorX: round2(clampSigned(Number(overrides.vectorX ?? 0))),
      vectorY: round2(clampSigned(Number(overrides.vectorY ?? 0))),
      fusedDirection: round2(Number(overrides.fusedDirection ?? 0)),
      confidence: round2(clamp01(Number(overrides.confidence ?? 0))),
      historyFrames: Number(overrides.historyFrames || 0),
      eventDetected: Boolean(overrides.eventDetected),
      eventType: overrides.eventType || "none",
      hudX: round2(clamp01(Number(overrides.hudX ?? 0.5))),
      hudY: round2(clamp01(Number(overrides.hudY ?? 0.45))),
      timestamp: overrides.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    };
  }

  function turnFromX(x) {
    const value = clampSigned(x);
    if (value > 0) {
      return "right";
    }
    if (value < 0) {
      return "left";
    }

    return "none";
  }

  function mapToposDecision(input = {}) {
    const safe = normalizeAction(input.action);
    if (!input.enabled || safe.fire) {
      return { action: safe, applied: false, reason: "guarded" };
    }

    const vector = input.vector || {};
    const kairos = input.kairos || {};
    const dominantAxis = kairos.dominantAxis || "LOGOS";
    const pathosDominant = Boolean(kairos.pathosDominant);
    const danger = Number(kairos.danger || 0);
    const stuck = Number(kairos.stuck || 0);
    const pathos = Number(kairos.pathos || 0);
    const firstDoorAlignmentWindow = Boolean(kairos.firstDoorAlignmentWindow);
    const contactUseReady = Boolean(kairos.contactUseReady);
    const shouldAdvanceFirstDoor = Boolean(kairos.shouldAdvanceFirstDoor);
    const depthEstimate = Number(kairos.depthEstimate || 1);
    const routeAdvanceProtected = shouldAdvanceFirstDoor || Boolean(kairos.routeAdvanceProtected);
    const wallHugSide = kairos.wallHugSide === "left" || kairos.wallHugSide === "right" ? kairos.wallHugSide : "none";
    let next = { ...safe };
    let applied = false;
    let reason = "none";

    if (safe.use) {
      next.run = false;
      return { action: normalizeAction(next), applied: false, reason: "use-preserved" };
    }

    if (pathosDominant && pathos >= 0.62 && !firstDoorAlignmentWindow) {
      const stallOnly = danger < 0.32 && stuck >= 0.58 && depthEstimate > 0.46;
      if (stallOnly && routeAdvanceProtected) {
        next.move = "forward";
        next.run = true;
        next.turn = Math.abs(Number(vector.x || 0)) >= 0.18 ? turnFromX(vector.x) : "none";
        applied = true;
        reason = "logos-ethos-route-protected";
      } else if (stallOnly) {
        next.move = "forward";
        next.run = false;
        next.turn = Math.abs(Number(vector.x || 0)) >= 0.18
          ? turnFromX(vector.x)
          : (wallHugSide === "left" ? "right" : "left");
        applied = true;
        reason = "pathos-stall-wall-follow";
      } else if (Number(vector.y || 0) < -0.28) {
        next.move = "back";
        next.run = false;
        applied = true;
        reason = "pathos-repulsion";
      }

      if (!stallOnly && Math.abs(Number(vector.x || 0)) >= 0.22) {
        next.turn = Number(vector.x || 0) > 0 ? "right" : "left";
        applied = true;
        reason = reason === "none" ? "pathos-turn-away" : reason;
      }
    } else {
      if ((next.move === "none" || String(input.safetyReason || "").startsWith("first-door-reprobe"))
        && Number(vector.y || 0) >= 0.34
        && shouldAdvanceFirstDoor) {
        next.move = "forward";
        next.run = pathos < 0.42;
        applied = true;
        reason = "logos-ethos-door-approach";
      } else if (next.move === "none" && Number(vector.y || 0) >= 0.52) {
        next.move = "forward";
        applied = true;
        reason = `${dominantAxis.toLowerCase()}-forward`;
      } else if (next.move === "forward" && pathos >= 0.48) {
        next.run = false;
        applied = true;
        reason = dominantAxis === "PATHOS" ? "pathos-run-suppression" : `${dominantAxis.toLowerCase()}-run-suppression`;
      }

      if (next.turn === "none" && Math.abs(Number(vector.x || 0)) >= 0.26) {
        next.turn = Number(vector.x || 0) > 0 ? "right" : "left";
        applied = true;
        reason = reason === "none" ? `${dominantAxis.toLowerCase()}-turn` : reason;
      }
    }

    if (contactUseReady && Math.abs(Number(vector.x || 0)) <= 0.44) {
      next.move = "none";
      next.turn = Number(vector.x || 0) > 0.18 ? "right" : (Number(vector.x || 0) < -0.18 ? "left" : "none");
      next.use = true;
      next.run = false;
      applied = true;
      reason = "logos-ethos-contact-use";
    }

    return { action: normalizeAction(next), applied, reason };
  }

  self.AIKernelDoomKinesis = Object.freeze({
    actionSignature,
    actionTurnToX,
    analyzeRegion9Motion,
    commandPriority,
    createCompassSensorSnapshot,
    createMovementSensorSnapshot,
    createMotorSensorSnapshot,
    createSpatialSensorSnapshot,
    describeActionVector,
    mapToposDecision,
    neutralAction,
    normalizeAction,
    resolveMotionIntent,
    ternaryScore,
    ternarySigned
  });
})();
