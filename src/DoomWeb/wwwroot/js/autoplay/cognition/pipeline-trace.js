(function () {
  "use strict";

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function normalizeAction(action = {}) {
    return {
      move: action.move || (action.moveForward ? "forward" : (action.moveBackward ? "back" : "none")),
      turn: action.turn || (Number(action.turnYaw || 0) > 0 ? "right" : (Number(action.turnYaw || 0) < 0 ? "left" : "none")),
      strafe: Boolean(action.strafe || action.strafeLeft || action.strafeRight),
      use: Boolean(action.use || action.useKey),
      fire: Boolean(action.fire || action.attackKey),
      run: Boolean(action.run)
    };
  }

  function createStage(key, label, active, signal, score) {
    return {
      key,
      label,
      active: Boolean(active),
      signal: String(signal || "idle"),
      score: round2(clamp01(Number(score || 0)))
    };
  }

  function buildRoute(input = {}) {
    return [
      {
        key: "firstDoor",
        label: "First Door",
        complete: Number(input.doorOpenedCount || 0) > 0,
        active: Number(input.doorOpenedCount || 0) <= 0,
        score: round2(clamp01(Math.max(Number(input.firstDoorCorridorSignature || 0), Number(input.firstDoorVision9x9Score || 0), Number(input.spawnLandmarkRouteEvidence || 0)))),
        signal: Number(input.doorOpenedCount || 0) > 0
          ? "opened"
          : (input.firstDoorCorridorLocated ? "approach" : String(input.spawnLandmarkRouteKind || "search"))
      },
      {
        key: "computerRoom",
        label: "Computer Room",
        complete: Boolean(input.computerRoomEntered),
        active: Number(input.doorOpenedCount || 0) > 0 && !input.computerRoomEntered,
        score: round2(clamp01(Math.max(Number(input.computerRoomScore || 0), Number(input.computerPanelScore || 0), Number(input.computerDarkPanelScore || 0)))),
        signal: input.computerRoomEntered ? "entered" : "advance"
      },
      {
        key: "centralHall",
        label: "Central Hall",
        complete: Boolean(input.centralHallEntered),
        active: Boolean(input.computerRoomEntered) && !input.centralHallEntered,
        score: round2(clamp01(Math.max(Number(input.centralHallFrames || 0) / 8, Number(input.bridgeBrownScore || 0)))),
        signal: input.centralHallEntered ? "entered" : "locate"
      },
      {
        key: "frontEnemy",
        label: "Front Enemy",
        complete: Number(input.enemyDefeatedCount || 0) > 0,
        active: Boolean(input.centralHallEntered) && Number(input.enemyDefeatedCount || 0) <= 0,
        score: round2(clamp01(Math.max(Number(input.enemyConfidence || 0), Number(input.targetConfidence || 0), Number(input.enemyConfidencePeak || 0)))),
        signal: Number(input.enemyDefeatedCount || 0) > 0
          ? "defeated"
          : (Number(input.centralHallEnemySweepFrames || 0) > 0 ? `sweep-${input.centralHallEnemySweepTurn || "right"}` : "engage")
      },
      {
        key: "finalRoom",
        label: "Final Room",
        complete: Boolean(input.finalRoomEntered),
        active: Number(input.enemyDefeatedCount || 0) > 0 && !input.finalRoomEntered,
        score: round2(clamp01(Math.max(
          Number(input.bridgeBrownScore || 0),
          Number(input.bridgeDoorScore || 0),
          Number(input.finalRoomCandidateFrames || 0) / 8))),
        signal: input.finalRoomEntered
          ? "entered"
          : (input.bridgeLaneVisible ? "cross-bridge" : "secure-hall")
      },
      {
        key: "exitSwitch",
        label: "Exit Switch",
        complete: Boolean(input.exitSwitchPressed),
        active: Boolean(input.finalRoomEntered) && !input.exitSwitchPressed,
        score: round2(clamp01(Math.max(
          Number(input.exitSwitchUseFrames || 0) / 24,
          input.exitSwitchPressed ? 1 : 0))),
        signal: input.exitSwitchPressed
          ? "pressed"
          : (Number(input.exitSwitchUseFrames || 0) > 0 ? "use" : "approach")
      }
    ];
  }

  function buildTrace(input = {}) {
    const action = normalizeAction(input.action);
    const detections = Array.isArray(input.activeDetections) ? input.activeDetections.slice(0) : [];
    const observed = input.observed || {};
    const carrier = input.carrier || {};
    const selectedAxis = String(carrier.dominantAxis || observed.dominant || "LOGOS").toUpperCase();
    const actionText = `${action.move || "none"}/${action.turn || "none"}${action.strafe ? "/strafe" : ""}${action.use ? "/use" : ""}${action.fire ? "/fire" : ""}`;
    const routeEvidence = Math.max(
      Number(input.spawnLandmarkRouteEvidence || 0),
      Number(input.spawnCorridorGapScore || 0),
      Number(input.firstDoorCorridorSignature || 0),
      Number(input.computerRoomScore || 0),
      Number(input.bridgeBrownScore || 0),
      Number(input.enemyConfidencePeak || 0));
    const pathos = Number(observed.pathos ?? observed.weights?.pathos ?? 0);
    const ethos = Number(observed.ethos ?? observed.weights?.ethos ?? 0);
    const logos = Number(observed.logos ?? observed.weights?.logos ?? 0);
    const healthBlocked = Boolean(input.healthRetryRequested || input.healthLikelyDead);
    const actionActive = action.move !== "none" || action.turn !== "none" || action.strafe || action.use || action.fire;
    return {
      version: "doom-pipeline-trace/v1",
      phase: input.phase || "Idle",
      objective: input.objective || "none",
      priority: Number(input.priority || 0),
      selectedAxis,
      activeDetections: detections,
      action: {
        move: action.move || "none",
        turn: action.turn || "none",
        strafe: Boolean(action.strafe),
        use: Boolean(action.use),
        fire: Boolean(action.fire),
        signature: actionText
      },
      route: buildRoute(input),
      stages: [
        createStage("aisthesis", "Aisthesis", input.enabled, `sensors:${detections.length}`, Math.max(routeEvidence, Number(input.motionForwardProgress || 0))),
        createStage("phainesis", "Phainesis", detections.length > 0, detections.slice(0, 4).join(",") || "none", Math.max(Number(input.motionStallScore || 0), Number(input.enemyConfidence || 0), routeEvidence)),
        createStage("nous", "Nous", Boolean(input.hasNousCarrier || input.hasPhainomenon), `vectors:${Number(input.ternaryVectorCount || 0)}`, Math.max(logos, pathos, ethos)),
        createStage("topos", "Topos", Boolean(carrier.decisionVector), `${selectedAxis}:${carrier.decisionVector?.arrow || "-"}`, Math.max(logos, pathos, ethos)),
        createStage("kairos", "Kairos", Boolean(carrier.kairos || input.safetyReason !== "clear"), input.safetyReason || "monitor", Math.max(Number(observed.kairosBoost || 0), pathos)),
        createStage("kinesis", "Kinesis", actionActive, actionText, actionActive ? 1 : 0),
        createStage("zoe", "Zoe", healthBlocked, healthBlocked ? "retry/veto" : "pass", healthBlocked ? 1 : 0)
      ]
    };
  }

  self.AIKernelDoomPipelineTrace = Object.freeze({
    buildRoute,
    buildTrace,
    version: "20260619-pipelinetrace1"
  });
})();
