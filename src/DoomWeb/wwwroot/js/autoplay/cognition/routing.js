(function () {
  "use strict";

  const RESETTABLE_FIRST_DOOR_OBJECTIVES = Object.freeze([
    "find-corridor-to-first-door",
    "follow-demo-route-to-first-door",
    "locate-first-door-corridor",
    "recover-via-east-window"
  ]);

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function rankFirstDoorObjective(objective) {
    switch (objective) {
      case "find-corridor-to-first-door":
      case "follow-demo-route-to-first-door":
      case "locate-first-door-corridor":
        return 1;
      case "recover-via-east-window":
      case "enter-first-door-corridor":
      case "approach-first-door":
        return 2;
      case "align-first-door":
      case "open-first-door":
        return 3;
      case "enter-computer-control-room":
        return 4;
      case "reach-central-hall":
        return 5;
      default:
        return 0;
    }
  }

  function stabilizeFirstDoorObjective(input = {}) {
    const candidate = input.candidate || "";
    if (!candidate || input.healthLikelyDead || input.healthRetryRequested) {
      return candidate;
    }

    const previous = input.previousObjective || "";
    const previousRank = rankFirstDoorObjective(previous);
    const candidateRank = rankFirstDoorObjective(candidate);
    const staleDoorProgress = number(input.doorOpenedCount) <= 0
      && !input.firstDoorCorridorLocated
      && !input.firstDoorUseAttempted
      && number(input.firstDoorUseLatchFrames) <= 0
      && number(input.wallUseProbeFrames) <= 0
      && RESETTABLE_FIRST_DOOR_OBJECTIVES.includes(candidate);
    if (staleDoorProgress) {
      return candidate;
    }

    if (previousRank > candidateRank && previousRank < 4 && number(input.doorOpenedCount) <= 0) {
      return previous;
    }

    return candidate;
  }

  function inferFirstDoorObjective(input = {}) {
    if (input.hasController === false) {
      return "find-corridor-to-first-door";
    }

    if (number(input.doorOpenedCount) > 0 && !input.computerRoomEntered) {
      return "enter-computer-control-room";
    }

    if (number(input.doorOpenedCount) > 0) {
      return null;
    }

    const firstDoorUseThreshold = number(input.firstDoorUseThreshold);
    const firstDoorRetryTolerance = number(input.firstDoorRetryTolerance);
    const firstDoorUseDepth = number(input.firstDoorUseDepth);
    const firstDoorDarkPanelUseAlignmentScore = number(input.firstDoorDarkPanelUseAlignmentScore);
    const firstDoorAlignmentScore = number(input.firstDoorAlignmentScore);
    const nearDoor = number(input.depthEstimate, 1) <= firstDoorUseDepth + 0.08;
    const corridorEstablished = Boolean(input.firstDoorCorridorLocated)
      || number(input.firstDoorCorridorFrames) >= 4;
    const eastWindowRecovery = number(input.courtyardRescueFrames) > 0
      && input.courtyardRescueMode === "east-window-wall-left";
    const activeUseProbe = Boolean(input.firstDoorUseAttempted)
      || number(input.firstDoorUseLatchFrames) > 0;
    const alignedUseProbe = number(input.wallUseProbeFrames) > 0
      && nearDoor
      && (number(input.firstDoorUse3x3Score) >= firstDoorDarkPanelUseAlignmentScore - 0.08
        || number(input.firstDoorUseSignature) >= firstDoorUseThreshold - firstDoorRetryTolerance);
    const useEvidence = activeUseProbe
      || alignedUseProbe
      || (corridorEstablished
        && nearDoor
        && (number(input.firstDoorUse3x3Score) >= firstDoorDarkPanelUseAlignmentScore - 0.08
          || (number(input.firstDoorUseSignature) >= firstDoorUseThreshold + 0.06
            && number(input.firstDoorVision9x9Score) >= 0.46)));
    if (useEvidence) {
      return stabilizeFirstDoorObjective(Object.assign({}, input, { candidate: "open-first-door" }));
    }

    const recenterNeeded = corridorEstablished
      && nearDoor
      && (input.firstDoorUse3x3Turn === "left" || input.firstDoorUse3x3Turn === "right")
      && number(input.firstDoorUse3x3Score) < firstDoorAlignmentScore;
    if (recenterNeeded) {
      return stabilizeFirstDoorObjective(Object.assign({}, input, { candidate: "align-first-door" }));
    }

    if (corridorEstablished) {
      return stabilizeFirstDoorObjective(Object.assign({}, input, { candidate: "approach-first-door" }));
    }

    if (eastWindowRecovery) {
      return stabilizeFirstDoorObjective(Object.assign({}, input, { candidate: "recover-via-east-window" }));
    }

    const gapTurn = input.spawnCorridorGapTurn === "left" || input.spawnCorridorGapTurn === "right"
      ? input.spawnCorridorGapTurn
      : "none";
    const relativeAlignment = input.relativeAlignment || {};
    const visualGap = number(input.spawnCorridorGapScore) >= Math.max(0.18, number(input.spawnCorridorGapThreshold) - 0.08);
    const motionEntrance = number(input.motionEntranceScore) >= number(input.motionEntranceThreshold, 0.22);
    const alignmentStarted = number(input.spawnCorridorGapFrames) > 0
      || (gapTurn !== "none"
        && visualGap
        && !relativeAlignment.conflict
        && (relativeAlignment.aligned || motionEntrance || number(input.predictions) >= number(input.firstDoorSpawnScanFrames)));
    const demoRouteActive = input.controlPipeline === "OpeningHome"
      || /^opening-map/.test(String(input.mobilityMode || ""))
      || number(input.predictions) < number(input.firstDoorSpawnScanFrames);
    return stabilizeFirstDoorObjective(Object.assign({}, input, {
      candidate: alignmentStarted
        ? "locate-first-door-corridor"
        : (demoRouteActive ? "follow-demo-route-to-first-door" : "find-corridor-to-first-door")
    }));
  }

  function inferControlPipeline(input = {}) {
    if (!input.enabled) {
      return "Idle";
    }

    if (input.healthRetryRequested || input.healthLikelyDead) {
      return "Retry";
    }

    if (input.doorTransitionGraceActive) {
      return input.computerRoomEntered ? "ComputerRoom" : "FirstDoor";
    }

    if (input.computerRoomEntered && !input.centralHallEntered) {
      return "ComputerRoom";
    }

    if (number(input.doorOpenedCount) <= 0) {
      const objective = input.firstDoorObjective || inferFirstDoorObjective(input);
      return objective === "find-corridor-to-first-door"
        || objective === "follow-demo-route-to-first-door"
        || objective === "recover-via-east-window"
        || objective === "locate-first-door-corridor"
        ? "OpeningHome"
        : "FirstDoor";
    }

    if (number(input.doorOpenedCount) > 0 && !input.computerRoomEntered) {
      return "FirstDoor";
    }

    if (input.centralHallEntered && number(input.enemyDefeatedCount) <= 0 && !input.ammoLikelyEmpty) {
      return "ComputerRoom";
    }

    if (input.finalRoomEntered) {
      return "ExitRoom";
    }

    if (input.movementStallActive) {
      return "SensorRecovery";
    }

    if (number(input.doorOpenedCount) > 1) {
      return "SecondDoor";
    }

    if (input.computerRoomEntered && !input.centralHallEntered) {
      return "ComputerRoom";
    }

    if (number(input.doorOpenedCount) > 0 && !input.computerPanelVisible && input.bridgeLaneVisible) {
      return "Bridge";
    }

    if (input.computerRoomEntered) {
      return "ComputerRoom";
    }

    if (input.firstDoorCorridorLocated) {
      return "FirstDoor";
    }

    return "OpeningHome";
  }

  function inferObjective(input = {}) {
    if (!input.enabled) {
      return "disabled";
    }

    if (input.healthRetryRequested || input.healthLikelyDead) {
      return "retry-after-death";
    }

    if (input.exitSwitchPressed) {
      return "level-clear";
    }

    if (input.centralHallEntered) {
      return number(input.enemyDefeatedCount) > 0
        ? "secure-central-hall"
        : "engage-front-enemy";
    }

    if (input.finalRoomEntered) {
      return "press-exit-switch";
    }

    if (input.stairsEntered || number(input.doorOpenedCount) > 1) {
      return "reach-final-room";
    }

    if (number(input.doorOpenedCount) > 0 && !input.computerRoomEntered) {
      return "enter-computer-control-room";
    }

    const firstDoorObjective = input.firstDoorObjective || inferFirstDoorObjective(input);
    if (input.doorTransitionGraceActive) {
      return input.computerRoomEntered ? "reach-central-hall" : firstDoorObjective;
    }

    if (input.computerRoomEntered && input.bridgeLaneVisible) {
      return "cross-bridge";
    }

    if (input.computerRoomEntered) {
      return "reach-central-hall";
    }

    if (input.controlPipeline === "SensorRecovery") {
      return "restore-relative-motion";
    }

    if (number(input.doorOpenedCount) <= 0) {
      return firstDoorObjective;
    }

    return firstDoorObjective || "reach-central-hall";
  }

  function activeDetectionsForPipeline(input = {}) {
    const phase = input.phase || inferControlPipeline(input);
    const withSensorEvents = (detections) => {
      let next = detections;
      if (input.healthRetryRequested || input.healthLikelyDead) {
        next = [...next, "health"];
      }

      if (input.auditoryEventDetected || input.spatialEventDetected) {
        next = [...next, "audio", "spatial"];
      }

      if (Array.isArray(input.sensorDetections) && input.sensorDetections.length > 0) {
        next = [...next, ...input.sensorDetections];
      }
      if (number(input.semanticContextResetFrames) > 0) {
        next = [...next, "context-reset"];
      }
      if (input.topologicalTransitionBlocked) {
        next = [...next, "topology-blocked"];
      }
      if (number(input.wallFollowFrames) > 0) {
        next = [...next, "wall-follow"];
      }
      if (input.combatContextActive && input.trustedCombatEvidence) {
        next = [...next, "combat-context"];
      }
      if (number(input.combatSurveyFrames) > 0) {
        next = [...next, "combat-survey"];
      }

      return Array.from(new Set(next));
    };
    if (!input.enabled) {
      return withSensorEvents(["objective", "hud"]);
    }

    if (phase === "Retry") {
      return withSensorEvents(["objective", "health", "hud"]);
    }

    if (phase === "SensorRecovery") {
      return withSensorEvents(["objective", "motion", "movement", "spatial", "wall", "hud"]);
    }

    if (phase === "OpeningHome") {
      return withSensorEvents(["objective", "motion", "wall", "foot", "hud"]);
    }

    if (phase === "FirstDoor") {
      return withSensorEvents(["objective", "motion", "door", "wall", "foot", "hud"]);
    }

    if (phase === "ComputerRoom") {
      const detections = ["objective", "motion", "computer", "wall", "foot", "hud"];
      if (input.trustedCombatEvidence) {
        detections.push("enemy");
      }
      return withSensorEvents(detections);
    }

    if (phase === "Bridge") {
      return withSensorEvents(["objective", "motion", "wall", "foot", "hud"]);
    }

    if (phase === "SecondDoor") {
      const detections = ["objective", "motion", "door", "wall", "foot", "hud"];
      if (input.trustedCombatEvidence) {
        detections.push("enemy");
      }
      return withSensorEvents(detections);
    }

    if (phase === "ExitRoom") {
      return withSensorEvents(["objective", "motion", "door", "hud"]);
    }

    return withSensorEvents(["objective", "hud"]);
  }

  self.AIKernelDoomRouting = Object.freeze({
    activeDetectionsForPipeline,
    inferControlPipeline,
    inferFirstDoorObjective,
    inferObjective,
    rankFirstDoorObjective,
    stabilizeFirstDoorObjective
  });
})();
