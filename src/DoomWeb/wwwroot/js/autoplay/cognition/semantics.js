(function () {
  "use strict";

  const SEMANTIC_SYMBOLS = Object.freeze([
    "door",
    "corridor",
    "enemy",
    "safe-zone",
    "bridge",
    "computer-room",
    "central-hall",
    "final-room",
    "exit-switch"
  ]);

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function round2(value) {
    return Math.round(number(value) * 100) / 100;
  }

  function turn(value, fallback = "none") {
    return value === "left" || value === "right" ? value : fallback;
  }

  function createSymbol(name, overrides = {}) {
    return {
      name,
      confidence: clamp01(overrides.confidence),
      stableFrames: Math.max(0, Number(overrides.stableFrames) || 0),
      bearing: overrides.bearing || "none",
      evidence: overrides.evidence || "none"
    };
  }

  function createSymbolTable(overrides = {}) {
    return {
      door: createSymbol("door", overrides.door),
      corridor: createSymbol("corridor", overrides.corridor),
      enemy: createSymbol("enemy", overrides.enemy),
      safeZone: createSymbol("safe-zone", overrides.safeZone),
      bridge: createSymbol("bridge", overrides.bridge),
      computerRoom: createSymbol("computer-room", overrides.computerRoom),
      centralHall: createSymbol("central-hall", overrides.centralHall),
      finalRoom: createSymbol("final-room", overrides.finalRoom),
      exitSwitch: createSymbol("exit-switch", overrides.exitSwitch)
    };
  }

  function createE1M1SemanticMemory(overrides = {}) {
    const symbols = createSymbolTable(overrides.symbols);
    return {
      map: "E1M1",
      symbolIndex: SEMANTIC_SYMBOLS.slice(),
      symbols,
      coordinateHint: "spawn=south; firstDoor=north; courtyard=east-after-first-door; computerControlRoom=northwest; bridge=east-southeast; exit=southeast",
      phase: overrides.phase || "OpeningHome",
      objective: overrides.objective || "find-and-open-first-door",
      spawn: {
        blueFloorScore: 0,
        courtyardScore: 0,
        courtyardTurn: "none",
        secretDoorScore: 0,
        secretDoorTurn: "none",
        westStairScore: 0,
        westStairTurn: "none",
        centerAnchorScore: 0,
        centerAnchorTurn: "right",
        landmarkRouteEvidence: 0,
        landmarkRouteTurn: "right",
        landmarkRouteKind: "none"
      },
      firstDoor: {
        corridorConfidence: symbols.corridor.confidence,
        corridorBearing: symbols.corridor.bearing === "left" || symbols.corridor.bearing === "right"
          ? symbols.corridor.bearing
          : "right",
        doorConfidence: symbols.door.confidence,
        distance: 1,
        opened: false
      },
      enemy: {
        confidence: symbols.enemy.confidence,
        threat: 0,
        bearing: symbols.enemy.bearing,
        safeZoneConfidence: symbols.safeZone.confidence
      },
      safeZone: {
        confidence: symbols.safeZone.confidence,
        bearing: symbols.safeZone.bearing
      },
      computerRoom: {
        confidence: symbols.computerRoom.confidence,
        darkAreaScore: 0,
        enemyZoneMatch: false
      },
      centralHall: {
        confidence: symbols.centralHall.confidence,
        entered: false
      },
      bridge: {
        confidence: symbols.bridge.confidence,
        laneTurn: symbols.bridge.bearing === "left" || symbols.bridge.bearing === "right"
          ? symbols.bridge.bearing
          : "none",
        greenHazard: 0
      },
      finalRoom: {
        confidence: 0,
        exitSwitchArmed: false
      },
      motion: {
        forwardProgress: 0,
        turning: 0,
        obstacle: 0
      },
      lastUpdatedFrame: 0
    };
  }

  function ensureSemanticMemory(memory) {
    const next = memory || createE1M1SemanticMemory();
    next.symbols ||= createSymbolTable();
    next.spawn ||= {};
    next.firstDoor ||= {};
    next.enemy ||= {};
    next.safeZone ||= {};
    next.computerRoom ||= {};
    next.centralHall ||= {};
    next.bridge ||= {};
    next.finalRoom ||= {};
    next.motion ||= {};
    return next;
  }

  function updateSymbol(symbol, confidence, bearing, evidence) {
    if (!symbol) {
      return;
    }

    const score = round2(clamp01(confidence));
    symbol.confidence = score;
    symbol.bearing = turn(bearing, symbol.bearing || "none");
    symbol.evidence = evidence || symbol.evidence || "semantic-memory";
    symbol.stableFrames = score >= 0.35 ? Math.max(0, number(symbol.stableFrames)) + 1 : 0;
  }

  function updateE1M1SemanticMemory(memory, observation = {}) {
    const next = ensureSemanticMemory(memory);
    const depthEstimate = number(observation.depthEstimate, 1);
    const blueFloorHomeThreshold = number(observation.blueFloorHomeThreshold, 0.18);
    const bridgeLaneVisible = Boolean(observation.bridgeLaneVisible);
    const greenHazard = Math.max(
      number(observation.bridgeGreenLeft),
      number(observation.bridgeGreenCenter),
      number(observation.bridgeGreenRight));
    const corridorConfidence = clamp01(
      (number(observation.firstDoorCorridorSignature) * 0.46)
      + (number(observation.spawnCorridorGapScore) * 0.24)
      + (number(observation.spawnLandmarkRouteEvidence) * 0.18)
      + (number(observation.motionEntranceScore) * 0.14)
      + (number(observation.motionForwardProgress) * 0.08)
      + (number(observation.blueFloorScore) < blueFloorHomeThreshold ? 0.08 : 0));
    const firstDoorConfidence = clamp01(
      (number(observation.firstDoorUseSignature) * 0.38)
      + (number(observation.firstDoorCorridorSignature) * 0.22)
      + ((observation.mapDoorSectorMatch || number(observation.wallUseProbeFrames) > 0 || observation.firstDoorUseAttempted) ? 0.24 : 0)
      + (depthEstimate <= number(observation.doorApproachDepth, 0.86) ? 0.16 : 0));
    const postDoorTerminalSurface = number(observation.doorOpenedCount) > 0
      ? Math.max(
        number(observation.computerPanelScore),
        number(observation.computerDarkPanelScore),
        number(observation.computerRoomScore))
      : 0;
    const postDoorWeakComputerCue = number(observation.doorOpenedCount) > 0
      && postDoorTerminalSurface >= 0.32
      && (greenHazard >= 0.18
        || number(observation.computerRedLightScore) >= 0.03
        || number(observation.darkAreaScore) >= 0.02
        || number(observation.bridgeDoorScore) >= 0.03);
    const computerRoomConfidence = clamp01(
      (number(observation.computerRoomScore) * 0.55)
      + (number(observation.computerPanelScore) * 0.18)
      + (number(observation.computerDarkPanelScore) * 0.10)
      + (number(observation.computerRedLightScore) * 0.08)
      + (number(observation.darkAreaScore) * 0.2)
      + ((observation.darkZoneEntered || number(observation.doorOpenedCount) > 0) ? 0.18 : 0)
      + (postDoorWeakComputerCue ? 0.12 : 0));
    const bridgeConfidence = clamp01(
      (number(observation.bridgeBrownScore) * 0.48)
      + (greenHazard * 0.26)
      + (bridgeLaneVisible ? 0.26 : 0));
    const finalRoomConfidence = clamp01(
      (observation.finalRoomEntered ? 0.62 : 0)
      + (number(observation.bridgeDoorScore) * 0.22)
      + (number(observation.exitSwitchUseFrames) > 0 ? 0.16 : 0));
    const centralHallConfidence = clamp01(
      (observation.centralHallEntered ? 0.62 : 0)
      + (number(observation.centralHallFrames) / 8 * 0.28)
      + (number(observation.bridgeBrownScore) * 0.1));
    const enemyConfidence = clamp01(Math.max(
      number(observation.enemyConfidence),
      number(observation.enemyConfidencePeak),
      observation.mapEnemyZoneMatch ? 0.35 : 0));
    const safeZoneConfidence = clamp01(
      observation.healthLikelyDead
        ? 0
        : Math.max(
          number(observation.safeZoneConfidence),
          enemyConfidence < 0.28 && number(observation.motionObstacleScore) < 0.35 ? 0.52 : 0));

    next.phase = observation.phase || next.phase || "OpeningHome";
    next.objective = observation.objective || next.objective || "find-and-open-first-door";
    next.spawn.blueFloorScore = round2(observation.blueFloorScore);
    next.spawn.courtyardScore = round2(observation.courtyardScore);
    next.spawn.courtyardTurn = turn(observation.courtyardTurn);
    next.spawn.secretDoorScore = round2(observation.spawnSecretDoorScore);
    next.spawn.secretDoorTurn = turn(observation.spawnSecretDoorTurn);
    next.spawn.westStairScore = round2(observation.spawnWestStairScore);
    next.spawn.westStairTurn = turn(observation.spawnWestStairTurn);
    next.spawn.centerAnchorScore = round2(observation.spawnCenterAnchorScore);
    next.spawn.centerAnchorTurn = turn(observation.spawnCenterAnchorTurn, "right");
    next.spawn.landmarkRouteEvidence = round2(observation.spawnLandmarkRouteEvidence);
    next.spawn.landmarkRouteTurn = turn(observation.spawnLandmarkRouteTurn, "right");
    next.spawn.landmarkRouteKind = observation.spawnLandmarkRouteKind || "none";
    next.firstDoor.corridorConfidence = round2(corridorConfidence);
    next.firstDoor.corridorBearing = turn(observation.spawnCorridorGapTurn, turn(observation.spawnLandmarkRouteTurn, "right"));
    next.firstDoor.doorConfidence = round2(firstDoorConfidence);
    next.firstDoor.distance = round2(depthEstimate);
    next.firstDoor.opened = number(observation.doorOpenedCount) > 0 || Boolean(observation.firstDoorLikelyOpened);
    next.enemy.confidence = round2(enemyConfidence);
    next.enemy.threat = round2(enemyConfidence);
    next.enemy.bearing = turn(observation.enemyAlertTurn, next.enemy.bearing || "none");
    next.enemy.safeZoneConfidence = round2(safeZoneConfidence);
    next.safeZone.confidence = round2(safeZoneConfidence);
    next.safeZone.bearing = turn(observation.safeZoneBearing, next.safeZone.bearing || "none");
    next.computerRoom.confidence = round2(computerRoomConfidence);
    next.computerRoom.darkAreaScore = round2(observation.darkAreaScore);
    next.computerRoom.enemyZoneMatch = Boolean(observation.mapEnemyZoneMatch);
    next.centralHall.confidence = round2(centralHallConfidence);
    next.centralHall.entered = Boolean(observation.centralHallEntered);
    next.bridge.confidence = round2(bridgeConfidence);
    next.bridge.laneTurn = turn(observation.bridgeLaneTurn);
    next.bridge.greenHazard = round2(greenHazard);
    next.finalRoom.confidence = round2(finalRoomConfidence);
    next.finalRoom.exitSwitchArmed = number(observation.exitSwitchUseFrames) > 0 || Boolean(observation.exitSwitchPressed);
    next.motion.forwardProgress = round2(observation.motionForwardProgress);
    next.motion.turning = round2(observation.motionTurnScore);
    next.motion.obstacle = round2(observation.motionObstacleScore);
    next.lastUpdatedFrame = Math.max(0, number(observation.predictions));

    updateSymbol(next.symbols.door, firstDoorConfidence, next.firstDoor.corridorBearing, "first-door");
    updateSymbol(next.symbols.corridor, corridorConfidence, next.firstDoor.corridorBearing, "route-corridor");
    updateSymbol(next.symbols.enemy, enemyConfidence, next.enemy.bearing, "combat");
    updateSymbol(next.symbols.safeZone, safeZoneConfidence, next.safeZone.bearing, "safety");
    updateSymbol(next.symbols.bridge, bridgeConfidence, next.bridge.laneTurn, "bridge-lane");
    updateSymbol(next.symbols.computerRoom, computerRoomConfidence, "none", "computer-room");
    updateSymbol(next.symbols.centralHall, centralHallConfidence, "none", "central-hall");
    updateSymbol(next.symbols.finalRoom, finalRoomConfidence, "none", "final-room");
    updateSymbol(next.symbols.exitSwitch, observation.exitSwitchPressed ? 1 : (number(observation.exitSwitchUseFrames) > 0 ? 0.55 : 0), "none", "exit-switch");

    return next;
  }

  self.AIKernelDoomSemantics = Object.freeze({
    createE1M1SemanticMemory,
    createSymbolTable,
    updateE1M1SemanticMemory,
    semanticSymbols: SEMANTIC_SYMBOLS
  });
})();
