(function () {
  "use strict";

  const WIDTH = 320;
  const HEIGHT = 200;
  const GAMEPLAY_HEIGHT = 168;
  const STATUS_BAR_HEIGHT = HEIGHT - GAMEPLAY_HEIGHT;
  const SAMPLE_COLUMNS = 20;
  const SAMPLE_ROWS = 13;
  const REGION_COLUMNS = 3;
  const REGION_ROWS = 2;
  const REGION9_COLUMNS = 3;
  const REGION9_ROWS = 3;
  const VISION_GRID_COLUMNS = 9;
  const VISION_GRID_ROWS = 9;
  const SPATIAL_HISTORY_LIMIT = 12;
  const CHRONOS_WINDOW_LIMIT = 32;
  const ITEM_MEMORY_LIMIT = 12;
  const RESIDENT_MASK_THRESHOLD = 0.16;
  const DEPTH_BANDS = 4;
  const FACE_X = 144;
  const FACE_Y = 168;
  const FACE_WIDTH = 32;
  const FACE_HEIGHT = 32;
  const FACE_SAMPLE_COLUMNS = 4;
  const FACE_SAMPLE_ROWS = 4;
  const AMMO_X = 0;
  const AMMO_Y = 168;
  const AMMO_WIDTH = 56;
  const AMMO_HEIGHT = 24;
  const AMMO_SAMPLE_COLUMNS = 7;
  const AMMO_SAMPLE_ROWS = 3;
  const HEALTH_X = 58;
  const HEALTH_Y = 168;
  const HEALTH_WIDTH = 64;
  const HEALTH_HEIGHT = 24;
  const HEALTH_SAMPLE_COLUMNS = 8;
  const HEALTH_SAMPLE_ROWS = 3;
  const FIRE_COOLDOWN_FRAMES = 10;
  const STUCK_CHANGE_THRESHOLD = 2.5;
  const STUCK_WALL_THRESHOLD = 16;
  const STUCK_FRAMES = 8;
  const CORNER_RECOVERY_FRAMES = 34;
  const CORNER_REVERSAL_FRAMES = 16;
  const USE_COOLDOWN_FRAMES = 45;
  const STRAFE_RUN_CYCLE_FRAMES = 24;
  const BREADCRUMB_SAMPLE_INTERVAL = 6;
  const BREADCRUMB_WINDOW = 50;
  const LOOP_VISIT_RADIUS = 9;
  const LOOP_VISIT_THRESHOLD = 6;
  const LOOP_ESCAPE_FRAMES = 30;
  const HARD_STUCK_ESCAPE_FRAMES = 28;
  const HARD_STUCK_BACK_FRAMES = 7;
  const HARD_STUCK_TURN_FRAMES = 17;
  const OPEN_ADVANCE_STALL_FRAMES = 6;
  const OPEN_STALL_ESCAPE_FRAMES = 24;
  const OPEN_STALL_USE_HOLD_FRAMES = 4;
  const OPEN_STALL_TURN_FRAMES = 12;
  const WALL_DETACH_FRAMES = 18;
  const WALL_SURVEY_FRAMES = 16;
  const WALL_SURVEY_BACK_FRAMES = 5;
  const WALL_SURVEY_DECISION_FRAMES = 24;
  const WALL_FOLLOW_FRAMES = 72;
  const CONTEXT_RESET_SURVEY_FRAMES = 54;
  const CONTEXT_RESET_COOLDOWN_FRAMES = 90;
  const CORNER_EXIT_COMMIT_FRAMES = 36;
  const TARGET_LOCK_CONFIDENCE = 0.56;
  const COMBAT_CONFIDENCE_THRESHOLD = 0.42;
  const COMBAT_FIRE_CONFIDENCE = 0.5;
  const COMBAT_CLOSE_DEPTH_THRESHOLD = 1.0;
  const COMBAT_FACE_DANGER_DELTA = 0.32;
  const COMBAT_ALERT_FRAMES = 46;
  const COMBAT_ALERT_PEAK_CONFIDENCE = 0.62;
  const COMBAT_ALERT_MAX_DEPTH = 0.85;
  const COMBAT_BURST_FRAMES = 32;
  const COMBAT_BURST_SHOTS = 2;
  const DOOR_TRANSITION_ARMED_FRAMES = 240;
  const DARK_ZONE_CONFIRM_FRAMES = 5;
  const DARK_ZONE_SCORE_THRESHOLD = 0.3;
  const DARK_ZONE_LUMA_THRESHOLD = 78;
  const REPEAT_ACTION_THRESHOLD = 16;
  const REPEAT_TURN_FRAMES = 12;
  const WALL_QUANTIZATION_STEP = 16;
  const QUANTIZED_STALL_THRESHOLD = 1.2;
  const QUANTIZED_WALL_STALL_FRAMES = 3;
  const CORNER_SIGNAL_THRESHOLD = 0.72;
  const WALL_USE_PROBE_FRAMES = 48;
  const WALL_USE_AIM_FRAMES = 7;
  const WALL_USE_APPROACH_FRAMES = 5;
  const WALL_USE_SETTLE_FRAMES = 3;
  const WALL_USE_HOLD_FRAMES = 8;
  const FIRST_DOOR_PRESS_FRAMES = 10;
  const FIRST_DOOR_USE_SWEEP_FRAMES = 8;
  const FIRST_DOOR_USE_HOLD_FRAMES = 18;
  const FIRST_DOOR_RETRY_USE_FRAMES = 72;
  const FIRST_DOOR_USE_LATCH_FRAMES = 150;
  const FIRST_DOOR_RETRY_SIGNATURE_TOLERANCE = 0.08;
  const FIRST_DOOR_USE_DEPTH = 0.72;
  const FIRST_DOOR_APPROACH_DEPTH = 0.94;
  const FIRST_DOOR_SETTLE_FRAMES = 6;
  const FIRST_DOOR_NO_TURN_USE_FRAMES = 22;
  const FIRST_DOOR_USE_ALIGNMENT_SCORE = 0.58;
  const FIRST_DOOR_DARK_PANEL_USE_ALIGNMENT_SCORE = 0.38;
  const FIRST_DOOR_RED_ACCENT_THRESHOLD = 0.065;
  const COMPUTER_ROOM_ADVANCE_FRAMES = 220;
  const EXIT_SWITCH_USE_FRAMES = 140;
  const LATE_DOOR_USE_FRAMES = 120;
  const COMPUTER_ROOM_CONFIRM_FRAMES = 8;
  const WALL_USE_PROBE_CHANGE_THRESHOLD = 1.2;
  const MAX_STUCK_COUNTER = 60;
  const DOOR_USE_DEPTH_THRESHOLD = 0.55;
  const DEEP_CORNER_DEPTH_THRESHOLD = 0.3;
  const CORNER_SUPPRESS_FRAMES = 60;
  const OPEN_VIEW_DEPTH_THRESHOLD = 0.62;
  const SIGNATURE_DICTIONARY_LIMIT = 48;
  const SIGNATURE_WALL_MATCH_THRESHOLD = 1.1;
  const SIGNATURE_CORNER_MATCH_THRESHOLD = 0.9;
  const SIGNATURE_DEPTH_MATCH_THRESHOLD = 0.75;
  const MAP_RUSH_LOOKOUT_FRAMES = 66;
  const MAP_RUSH_BACKOFF_FRAMES = 7;
  const MAP_DOOR_SWEEP_FRAMES = 72;
  const MAP_DOOR_SWEEP_BACKOFF_FRAMES = 5;
  const MAP_DOOR_SWEEP_TURN_FRAMES = 18;
  const MAP_DOOR_SWEEP_USE_FRAMES = 10;
  const FIRST_DOOR_CORRIDOR_SEARCH_FRAMES = 96;
  const FIRST_DOOR_CORRIDOR_BACK_FRAMES = 8;
  const FIRST_DOOR_CORRIDOR_TURN_FRAMES = 30;
  const FIRST_DOOR_PROBE_MIN_FRAMES = 520;
  const FIRST_DOOR_SEARCH_INTERVAL_FRAMES = 320;
  const FIRST_DOOR_SPAWN_ROUTE_FRAMES = 720;
  const FIRST_DOOR_SPAWN_SCAN_FRAMES = 36;
  const FIRST_DOOR_OPENING_LOCK_FRAMES = 760;
  const FIRST_DOOR_OPENING_FORWARD_LOCK_FRAMES = 210;
  const FIRST_DOOR_RIGHT_WALL_RUN_FRAMES = 230;
  const FIRST_DOOR_CORRIDOR_TRANSIT_FRAMES = 360;
  const FIRST_DOOR_CORRIDOR_TURN_DEPTH = 0.24;
  const FIRST_DOOR_CORRIDOR_TURN_STUCK_FRAMES = 14;
  const FIRST_DOOR_CORRIDOR_SKIRT_FRAMES = 18;
  const MOTION_FORWARD_PROGRESS_THRESHOLD = 0.16;
  const MOTION_OBSTACLE_THRESHOLD = 0.42;
  const MOTION_TURN_SWEEP_THRESHOLD = 0.34;
  const FIRST_DOOR_CORRIDOR_CONFIRM_FRAMES = 12;
  const BLUE_FLOOR_HOME_THRESHOLD = 0.18;
  const FIRST_DOOR_CORRIDOR_SIGNATURE_THRESHOLD = 0.58;
  const FIRST_DOOR_USE_SIGNATURE_THRESHOLD = 0.54;
  const COURTYARD_RESCUE_THRESHOLD = 0.34;
  const COURTYARD_RESCUE_FRAMES = 72;
  const COURTYARD_RESCUE_BACK_FRAMES = 10;
  const COURTYARD_RESCUE_TURN_FRAMES = 18;
  const FIRST_DOOR_DEAD_END_TURN_FRAMES = 30;
  const FIRST_DOOR_DEAD_END_DEPTH = 0.5;
  const SPAWN_SECRET_DOOR_THRESHOLD = 0.26;
  const SPAWN_WEST_STAIR_THRESHOLD = 0.2;
  const SPAWN_CORRIDOR_GAP_THRESHOLD = 0.42;
  const SPAWN_CORRIDOR_GAP_FRAMES = 74;
  const SPAWN_CORRIDOR_GAP_ALIGN_FRAMES = 10;
  const BRIDGE_BROWN_THRESHOLD = 0.24;
  const BRIDGE_GREEN_HAZARD_THRESHOLD = 0.18;
  const BRIDGE_DOOR_PANEL_THRESHOLD = 0.32;
  const STRATEGY_NAME = "SeparatedDoorProbeStrafeRunnerV4";
  const AUTOPLAY_PROFILE = self.AIKernelDoomAutoplayProfile || {
    normalize(profile, defaults) {
      const parameters = profile?.parameters && typeof profile.parameters === "object"
        ? profile.parameters
        : {};
      return profile && typeof profile === "object"
        ? Object.assign({}, defaults, profile, parameters, { parameters, pipeline: profile.pipeline || null })
        : Object.assign({}, defaults);
    },
    number(profile, key, fallback) {
      const value = Number(profile?.parameters?.[key] ?? profile?.[key]);
      return Number.isFinite(value) ? value : fallback;
    },
    validate() {
      return { valid: true, errors: [] };
    }
  };
  const DEFAULT_AUTOPLAY_PROFILE = {
    version: "0.1.3-dev1",
    strategyName: STRATEGY_NAME,
    doorAimToleranceDegrees: 14,
    doorSoftAimToleranceDegrees: 28,
    doorAimYawDegrees: 10,
    doorAimFrames: WALL_USE_AIM_FRAMES,
    doorApproachFrames: WALL_USE_APPROACH_FRAMES,
    emergencyStuckTicks: 54,
    doorProbeStuckTicks: 12,
    doorSettleFrames: WALL_USE_SETTLE_FRAMES,
    doorUseHoldFrames: WALL_USE_HOLD_FRAMES,
    doorUseDepth: 0.62,
    doorApproachDepth: 0.86,
    firstDoorUseDepth: FIRST_DOOR_USE_DEPTH,
    firstDoorApproachDepth: FIRST_DOOR_APPROACH_DEPTH,
    firstDoorSettleFrames: FIRST_DOOR_SETTLE_FRAMES,
    firstDoorNoTurnUseFrames: FIRST_DOOR_NO_TURN_USE_FRAMES,
    blockedDepth: 0.28,
    combatFaceThreshold: 0.35,
    combatAlertFrames: COMBAT_ALERT_FRAMES,
    combatAlertPeakConfidence: COMBAT_ALERT_PEAK_CONFIDENCE,
    combatAlertMaxDepth: COMBAT_ALERT_MAX_DEPTH,
    combatBurstFrames: COMBAT_BURST_FRAMES,
    combatBurstShots: COMBAT_BURST_SHOTS,
    darkZoneScoreThreshold: DARK_ZONE_SCORE_THRESHOLD,
    darkZoneLumaThreshold: DARK_ZONE_LUMA_THRESHOLD,
    darkZoneConfirmFrames: DARK_ZONE_CONFIRM_FRAMES,
    doorTransitionArmedFrames: 720,
    combatYawDegrees: 18,
    lowHealthThreshold: 50,
    criticalHealthThreshold: 18,
    emergencyEscapeYawDegrees: 34,
    wallAwayYawDegrees: 10,
    openCruiseYawDegrees: 7,
    enableStrafeRun: false,
    openCruiseWallVectorDeadZone: 0.08,
    firstDoorRushFrames: 2400,
    firstDoorRushDepth: 0.58,
    firstDoorRushWallVectorLimit: 0.22,
    firstDoorBearingFrames: 220,
    firstDoorCorridorSearchFrames: FIRST_DOOR_CORRIDOR_SEARCH_FRAMES,
    firstDoorCorridorBackFrames: FIRST_DOOR_CORRIDOR_BACK_FRAMES,
    firstDoorCorridorTurnFrames: FIRST_DOOR_CORRIDOR_TURN_FRAMES,
    firstDoorProbeMinFrames: FIRST_DOOR_PROBE_MIN_FRAMES,
    firstDoorSearchIntervalFrames: FIRST_DOOR_SEARCH_INTERVAL_FRAMES,
    firstDoorSpawnRouteFrames: FIRST_DOOR_SPAWN_ROUTE_FRAMES,
    firstDoorSpawnScanFrames: FIRST_DOOR_SPAWN_SCAN_FRAMES,
    firstDoorOpeningLockFrames: FIRST_DOOR_OPENING_LOCK_FRAMES,
    firstDoorOpeningForwardLockFrames: FIRST_DOOR_OPENING_FORWARD_LOCK_FRAMES,
    firstDoorRightWallRunFrames: FIRST_DOOR_RIGHT_WALL_RUN_FRAMES,
    firstDoorCorridorTransitFrames: FIRST_DOOR_CORRIDOR_TRANSIT_FRAMES,
    firstDoorCorridorTurnDepth: FIRST_DOOR_CORRIDOR_TURN_DEPTH,
    firstDoorCorridorTurnStuckFrames: FIRST_DOOR_CORRIDOR_TURN_STUCK_FRAMES,
    firstDoorCorridorSkirtFrames: FIRST_DOOR_CORRIDOR_SKIRT_FRAMES,
    motionForwardProgressThreshold: MOTION_FORWARD_PROGRESS_THRESHOLD,
    motionObstacleThreshold: MOTION_OBSTACLE_THRESHOLD,
    motionTurnSweepThreshold: MOTION_TURN_SWEEP_THRESHOLD,
    motionEntranceThreshold: 0.22,
    firstDoorCorridorConfirmFrames: FIRST_DOOR_CORRIDOR_CONFIRM_FRAMES,
    blueFloorHomeThreshold: BLUE_FLOOR_HOME_THRESHOLD,
    firstDoorCorridorSignatureThreshold: FIRST_DOOR_CORRIDOR_SIGNATURE_THRESHOLD,
    firstDoorUseSignatureThreshold: FIRST_DOOR_USE_SIGNATURE_THRESHOLD,
    firstDoorPressFrames: FIRST_DOOR_PRESS_FRAMES,
    firstDoorUseSweepFrames: 0,
    firstDoorUseHoldFrames: FIRST_DOOR_USE_HOLD_FRAMES,
    firstDoorRetryUseFrames: FIRST_DOOR_RETRY_USE_FRAMES,
    firstDoorUseLatchFrames: FIRST_DOOR_USE_LATCH_FRAMES,
    firstDoorReprobeFrames: 36,
    firstDoorReprobeBackFrames: 8,
    firstDoorReprobeTurnFrames: 16,
    firstDoorRetrySignatureTolerance: FIRST_DOOR_RETRY_SIGNATURE_TOLERANCE,
    computerRoomAdvanceFrames: COMPUTER_ROOM_ADVANCE_FRAMES,
    exitSwitchUseFrames: EXIT_SWITCH_USE_FRAMES,
    lateDoorUseFrames: LATE_DOOR_USE_FRAMES,
    computerRoomConfirmFrames: COMPUTER_ROOM_CONFIRM_FRAMES,
    courtyardRescueThreshold: COURTYARD_RESCUE_THRESHOLD,
    courtyardRescueFrames: COURTYARD_RESCUE_FRAMES,
    courtyardRescueBackFrames: COURTYARD_RESCUE_BACK_FRAMES,
    courtyardRescueTurnFrames: COURTYARD_RESCUE_TURN_FRAMES,
    firstDoorDeadEndTurnFrames: FIRST_DOOR_DEAD_END_TURN_FRAMES,
    firstDoorDeadEndDepth: FIRST_DOOR_DEAD_END_DEPTH,
    spawnSecretDoorThreshold: SPAWN_SECRET_DOOR_THRESHOLD,
    spawnWestStairThreshold: SPAWN_WEST_STAIR_THRESHOLD,
    spawnCorridorGapThreshold: SPAWN_CORRIDOR_GAP_THRESHOLD,
    spawnCorridorGapFrames: SPAWN_CORRIDOR_GAP_FRAMES,
    spawnCorridorGapAlignFrames: SPAWN_CORRIDOR_GAP_ALIGN_FRAMES,
    bridgeBrownThreshold: BRIDGE_BROWN_THRESHOLD,
    bridgeGreenHazardThreshold: BRIDGE_GREEN_HAZARD_THRESHOLD,
    bridgeDoorPanelThreshold: BRIDGE_DOOR_PANEL_THRESHOLD,
    semanticRouteLockFrames: 660,
    semanticCorridorConfidenceThreshold: 0.62,
    semanticBridgeStraightFrames: 96,
    semanticFinalImpSuppressFrames: 90,
    e1m1ThingCounts: {
      skill12: {
        monsters: { imps: 2, sergeants: 0, troopers: 2 },
        powerups: { armorBonuses: 25, blueArmors: 1, greenArmors: 1, healthBonuses: 12, medikits: 3, stimpacks: 1 },
        weapons: { shotguns: 1 },
        ammunition: { ammoClips: 2, bulletBoxes: 1, shells: 3, shellBoxes: 3 }
      },
      skill3: {
        monsters: { imps: 2, sergeants: 0, troopers: 4 },
        powerups: { armorBonuses: 25, blueArmors: 1, greenArmors: 1, healthBonuses: 12, medikits: 3, stimpacks: 1 },
        weapons: { shotguns: 1 },
        ammunition: { ammoClips: 2, bulletBoxes: 1, shells: 3, shellBoxes: 3 }
      },
      skill45: {
        monsters: { imps: 4, sergeants: 16, troopers: 9 },
        powerups: { armorBonuses: 25, blueArmors: 1, greenArmors: 1, healthBonuses: 13, medikits: 3, stimpacks: 1 },
        weapons: { shotguns: 1 },
        ammunition: { ammoClips: 2, bulletBoxes: 1, shells: 3, shellBoxes: 3 }
      }
    },
    mapRushLookoutFrames: MAP_RUSH_LOOKOUT_FRAMES,
    mapRushBackoffFrames: MAP_RUSH_BACKOFF_FRAMES,
    mapRushOpenWallVectorLimit: 0.14,
    mapRushOpenDelta: 1.85,
    mapDoorSweepFrames: MAP_DOOR_SWEEP_FRAMES
  };
  const EMERGENCY_STUCK_TICKS = 54;
  const BACKSTEP_DEPTH_GUARD = 0.66;
  const CTG_ROM_CANON_ID = "Canon.CTG.Monolith";
  const CTG_ROM_POLICY_ID = "ctg-rom.monolith.v0.1.3";
  const DEFAULT_SNAPSHOT_TIMESTAMP = "1970-01-01T00:00:00.000Z";

  class AIKernelBonsaiSupervisor {
    constructor(options) {
      this.log = options?.log || function () {};
      this.modelManifest = null;
      this.enabled = false;
      this.mode = "idle";
      this.lastAction = neutralAction();
      this.predictions = 0;
      this.reused = 0;
      this.lastLatencyMs = 0;
      this.lastError = "";
      this.previousFrame = null;
      this.frameHistory = [];
      this.stuckFrames = 0;
      this.turnBias = "left";
      this.fireCooldown = 0;
      this.safetyReason = "none";
      this.recoveryFrames = 0;
      this.recoveryTurn = "left";
      this.useCooldown = 0;
      this.mobilityMode = "idle";
      this.breadcrumbTrail = [];
      this.loopEscapeFrames = 0;
      this.loopEscapeTurn = "left";
      this.hardStuckEscapeFrames = 0;
      this.hardStuckEscapeTurn = "left";
      this.openAdvanceStallFrames = 0;
      this.openStallEscapeFrames = 0;
      this.openStallEscapeTurn = "left";
      this.cornerExitCommitFrames = 0;
      this.cornerExitTurn = "left";
      this.mapRushCorrectionFrames = 0;
      this.mapRushCorrectionBackFrames = 0;
      this.mapRushCorrectionTurn = "left";
      this.mapRushCorrectionReversals = 0;
      this.mapDoorSweepFrames = 0;
      this.mapDoorSweepTurn = "left";
      this.firstDoorCorridorSearchFrames = 0;
      this.firstDoorCorridorSearchTurn = "right";
      this.courtyardRescueFrames = 0;
      this.courtyardRescueTurnFrames = 0;
      this.courtyardRescueTurn = "left";
      this.courtyardRescueMode = "center-left";
      this.courtyardScore = 0;
      this.courtyardTurn = "none";
      this.spawnSecretDoorScore = 0;
      this.spawnSecretDoorTurn = "none";
      this.spawnWestStairScore = 0;
      this.spawnWestStairTurn = "none";
      this.spawnCenterAnchorScore = 0;
      this.spawnCenterAnchorTurn = "right";
      this.spawnLandmarkRouteEvidence = 0;
      this.spawnLandmarkRouteTurn = "right";
      this.spawnLandmarkRouteKind = "none";
      this.spawnLandmarkRouteFrames = 0;
      this.firstDoorDeadEndTurnFrames = 0;
      this.spawnCorridorGapScore = 0;
      this.spawnCorridorGapTurn = "none";
      this.spawnCorridorGapFrames = 0;
      this.spawnCorridorGapAlignFrames = 0;
      this.bridgeBrownScore = 0;
      this.bridgeGreenLeft = 0;
      this.bridgeGreenCenter = 0;
      this.bridgeGreenRight = 0;
      this.bridgeLaneTurn = "none";
      this.bridgeDoorScore = 0;
      this.wallHugSide = "left";
      this.targetConfidence = 0;
      this.soundCueActive = false;
      this.auditorySnapshot = createAuditorySnapshot();
      this.spatialSnapshot = createSpatialSnapshot();
      this.visionSensorSnapshot = createVisionSensorSnapshot();
      this.motorSensorSnapshot = createMotorSensorSnapshot();
      this.movementSensorSnapshot = createMovementSensorSnapshot();
      this.compassSensorSnapshot = createCompassSensorSnapshot();
      this.spatialSensorSnapshot = createSpatialSensorSnapshot();
      this.healthSensorSnapshot = createHealthSensorSnapshot();
      this.ctgCarrier = createCtgCarrier();
      this.ctgObservedScores = createCtgObservedScores();
      this.toposDecisionCarrier = createToposDecisionCarrier();
      this.toposEthosObjective = "find-and-open-first-door";
      this.toposEthosFrames = 0;
      this.nousCarrier = createNousCarrier();
      this.sensorDetections = [];
      this.spatialHistory = [];
      this.chronosWindow = createChronosWindow();
      this.phantasiaSnapshot = createPhantasiaSnapshot();
      this.phainomenon = createPhainomenon();
      this.nousDetectorResult = this.phainomenon;
      this.itemMemory = [];
      this.repeatActionSignature = "";
      this.repeatActionFrames = 0;
      this.kinesisActionSignature = "";
      this.kinesisActionRepeatFrames = 0;
      this.repeatTurnFrames = 0;
      this.repeatTurnDirection = "right";
      this.quantizedStallFrames = 0;
      this.quantizedFrameChange = 255;
      this.regionQuantizedFrameChange = 255;
      this.statusBarQuantizedFrameChange = 255;
      this.regionSignature = "000000";
      this.region9Signature = "000000000";
      this.vision9x9Signature = "0".repeat(VISION_GRID_COLUMNS * VISION_GRID_ROWS);
      this.motion9Signature = "000000000";
      this.motion9Delta = 255;
      this.motionForwardProgress = 0;
      this.motionObstacleScore = 0;
      this.motionTurnScore = 0;
      this.motionEntranceScore = 0;
      this.motionStallScore = 0;
      this.footObstacleScore = 0;
      this.priorFootObstacleScore = 0;
      this.footObstacleFlickerScore = 0;
      this.footObstacleBandDelta = 0;
      this.footObstacleBounceFrames = 0;
      this.inputStallFrames = 0;
      this.motionIntent = "idle";
      this.depthSignature = "0000";
      this.depthEstimate = 1;
      this.faceSignature = "0000000000000000";
      this.faceQuantizedFrameChange = 255;
      this.cornerSignal = 0;
      this.wallSignatureMemory = [];
      this.cornerSignatureMemory = [];
      this.depthSignatureMemory = [];
      this.signatureMatchKind = "none";
      this.signatureMatchDistance = 255;
      this.depthSignatureDistance = 255;
      this.wallUseProbeFrames = 0;
      this.wallUseProbeStage = 0;
      this.wallUseProbeTurn = "left";
      this.pendingUseResponseFrames = 0;
      this.lastUseDepthEstimate = 1;
      this.lastUseWasBlocked = false;
      this.lastUseProbeStage = 0;
      this.doorTransitionArmedFrames = 0;
      this.darkZoneFrames = 0;
      this.darkZoneEntered = false;
      this.darkAreaScore = 0;
      this.gameplayLuma = 0;
      this.blueFloorScore = 0;
      this.mapDoorSectorMatch = false;
      this.mapDarkSectorMatch = false;
      this.mapEnemyZoneMatch = false;
      this.mapSectorId = "unknown";
      this.firstDoorCorridorLocated = false;
      this.firstDoorCorridorFrames = 0;
      this.firstDoorCorridorSignature = 0;
      this.firstDoorUseAttempted = false;
      this.firstDoorUseSignature = 0;
      this.firstDoorVision9x9Score = 0;
      this.firstDoorVision9x9Box = null;
      this.firstDoorVision9x9Heatmap = [];
      this.firstDoorVision9x9RedScore = 0;
      this.firstDoorUse3x3Score = 0;
      this.firstDoorUse3x3Turn = "none";
      this.firstDoorUse3x3Reason = "none";
      this.firstDoorUseFrame = 0;
      this.firstDoorTransitionFrames = 0;
      this.firstDoorUseLatchFrames = 0;
      this.firstDoorUsePulsed = false;
      this.firstDoorLockedUseCycles = 0;
      this.firstDoorReprobeFrames = 0;
      this.firstDoorReprobeTurn = "right";
      this.firstDoorCorridorSuppressFrames = 0;
      this.firstDoorWallOnlyCandidateFrames = 0;
      this.computerRoomAdvanceFrames = 0;
      this.computerRoomFrames = 0;
      this.computerRoomEntered = false;
      this.computerRoomScore = 0;
      this.computerBlueScore = 0;
      this.computerRedLightScore = 0;
      this.computerDarkPanelScore = 0;
      this.computerPanelScore = 0;
      this.centralHallFrames = 0;
      this.centralHallEntered = false;
      this.centralHallEnemySweepFrames = 0;
      this.centralHallEnemySweepTurn = "right";
      this.stairsCandidateFrames = 0;
      this.stairsEntered = false;
      this.finalRoomCandidateFrames = 0;
      this.finalRoomEntered = false;
      this.exitSwitchUseFrames = 0;
      this.exitSwitchPressed = false;
      this.cornerSuppressFrames = 0;
      this.wallDetachFrames = 0;
      this.wallDetachTurn = "left";
      this.wallSurveyFrames = 0;
      this.wallSurveyTurn = "left";
      this.wallSurveyDecisionFrames = 0;
      this.wallFollowFrames = 0;
      this.wallFollowSide = "right";
      this.semanticContextResetFrames = 0;
      this.semanticContextResetCooldownFrames = 0;
      this.contextResetReason = "none";
      this.combatSurveyFrames = 0;
      this.combatSurveyTurn = "right";
      this.combatContextActive = false;
      this.topologicalTransitionBlocked = false;
      this.enemyConfidence = 0;
      this.enemyTurn = "none";
      this.enemyDistance = 1;
      this.enemyCluster = "none";
      this.enemyFireReady = false;
      this.enemyCenterCellConfidence = 0;
      this.enemyAllRegionPeak = 0;
      this.enemyLateralBias = 0;
      this.ammoSignature = "000000000000000000000";
      this.ammoLikelyEmpty = false;
      this.healthSignature = "000000000000000000000000";
      this.healthLikelyDead = false;
      this.healthZeroScore = 0;
      this.healthActiveColumns = 0;
      this.healthActiveCells = 0;
      this.healthDeathTintScore = 0;
      this.healthStatusDeathTintScore = 0;
      this.healthFaceDeathTintScore = 0;
      this.healthEstimatedPercent = 100;
      this.doorOpenedCount = 0;
      this.enemyDefeatedCount = 0;
      this.combatFireFrames = 0;
      this.enemyConfidencePeak = 0;
      this.enemyDropFrames = 0;
      this.combatBurstFrames = 0;
      this.combatBurstShots = 0;
      this.enemyAlertFrames = 0;
      this.enemyAlertTurn = "none";
      this.enemyAlertCluster = "none";
      this.enemyAlertDepth = 1;
      this.enemyAlertPeakConfidence = 0;
      this.profile = Object.assign({}, DEFAULT_AUTOPLAY_PROFILE);
      this.strategyName = STRATEGY_NAME;
      this.strategyContext = "unknown";
      this.strategyPriority = 0;
      this.controlPipeline = "OpeningHome";
      this.objective = "find-and-open-first-door";
      this.semanticMemory = createE1M1SemanticMemory();
    }

    configure(manifest, profile) {
      this.modelManifest = manifest || null;
      this.profile = normalizeAutoplayProfile(profile);
      this.strategyName = this.profile.strategyName || STRATEGY_NAME;
      const validation = AUTOPLAY_PROFILE.validate(profile || this.profile);
      if (!validation.valid) {
        this.log("[AUTOPLAY]", "log-warn", `autoplay profile validation warnings: ${validation.errors.join("; ")}`);
      }
      this.log("[AUTOPLAY]", "log-info", `Bonsai supervisor configured: ${manifest?.name || "Bonsai-1.7B"} (${manifest?.quantization || "Q1_0"}); strategy=${this.strategyName}; profile=${this.profile.version || "unknown"}.`);
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      this.mode = this.enabled ? "idle" : "disabled";
      if (this.enabled) {
        this.controlPipeline = "Idle";
        this.objective = "disabled";
        this.semanticMemory = createE1M1SemanticMemory();
      } else {
        this.lastAction = neutralAction();
        this.previousFrame = null;
        this.frameHistory = [];
        this.stuckFrames = 0;
        this.fireCooldown = 0;
        this.safetyReason = "none";
        this.recoveryFrames = 0;
        this.recoveryTurn = "left";
        this.useCooldown = 0;
        this.mobilityMode = "idle";
        this.breadcrumbTrail = [];
        this.loopEscapeFrames = 0;
        this.loopEscapeTurn = "left";
        this.openAdvanceStallFrames = 0;
        this.openStallEscapeFrames = 0;
        this.openStallEscapeTurn = "left";
        this.cornerExitCommitFrames = 0;
        this.cornerExitTurn = "left";
        this.mapRushCorrectionFrames = 0;
        this.mapRushCorrectionBackFrames = 0;
        this.mapRushCorrectionTurn = "left";
        this.mapRushCorrectionReversals = 0;
        this.mapDoorSweepFrames = 0;
        this.mapDoorSweepTurn = "left";
        this.firstDoorCorridorSearchFrames = 0;
        this.firstDoorCorridorSearchTurn = "right";
        this.courtyardRescueFrames = 0;
        this.courtyardRescueTurnFrames = 0;
        this.courtyardRescueTurn = "left";
        this.courtyardRescueMode = "center-left";
        this.courtyardScore = 0;
        this.courtyardTurn = "none";
        this.spawnSecretDoorScore = 0;
        this.spawnSecretDoorTurn = "none";
        this.spawnWestStairScore = 0;
        this.spawnWestStairTurn = "none";
        this.spawnCenterAnchorScore = 0;
        this.spawnCenterAnchorTurn = "right";
        this.spawnLandmarkRouteEvidence = 0;
        this.spawnLandmarkRouteTurn = "right";
        this.spawnLandmarkRouteKind = "none";
        this.spawnLandmarkRouteFrames = 0;
        this.firstDoorDeadEndTurnFrames = 0;
        this.spawnCorridorGapScore = 0;
        this.spawnCorridorGapTurn = "none";
        this.spawnCorridorGapFrames = 0;
        this.spawnCorridorGapAlignFrames = 0;
        this.bridgeBrownScore = 0;
        this.bridgeGreenLeft = 0;
        this.bridgeGreenCenter = 0;
        this.bridgeGreenRight = 0;
        this.bridgeLaneTurn = "none";
        this.bridgeDoorScore = 0;
        this.wallHugSide = "left";
        this.targetConfidence = 0;
        this.soundCueActive = false;
        this.auditorySnapshot = createAuditorySnapshot();
        this.spatialSnapshot = createSpatialSnapshot();
        this.visionSensorSnapshot = createVisionSensorSnapshot();
        this.motorSensorSnapshot = createMotorSensorSnapshot();
        this.movementSensorSnapshot = createMovementSensorSnapshot();
        this.compassSensorSnapshot = createCompassSensorSnapshot();
        this.spatialSensorSnapshot = createSpatialSensorSnapshot();
        this.healthSensorSnapshot = createHealthSensorSnapshot();
        this.ctgCarrier = createCtgCarrier();
        this.ctgObservedScores = createCtgObservedScores();
        this.toposDecisionCarrier = createToposDecisionCarrier();
        this.toposEthosObjective = "find-and-open-first-door";
        this.toposEthosFrames = 0;
        this.nousCarrier = createNousCarrier();
        this.sensorDetections = [];
        this.spatialHistory = [];
        this.chronosWindow = createChronosWindow();
        this.phantasiaSnapshot = createPhantasiaSnapshot();
        this.phainomenon = createPhainomenon();
        this.nousDetectorResult = this.phainomenon;
        this.itemMemory = [];
        this.repeatActionSignature = "";
        this.repeatActionFrames = 0;
        this.kinesisActionSignature = "";
        this.kinesisActionRepeatFrames = 0;
        this.repeatTurnFrames = 0;
        this.repeatTurnDirection = "right";
        this.quantizedStallFrames = 0;
        this.quantizedFrameChange = 255;
        this.regionQuantizedFrameChange = 255;
        this.statusBarQuantizedFrameChange = 255;
        this.regionSignature = "000000";
        this.region9Signature = "000000000";
        this.vision9x9Signature = "0".repeat(VISION_GRID_COLUMNS * VISION_GRID_ROWS);
        this.motion9Signature = "000000000";
        this.motion9Delta = 255;
        this.motionForwardProgress = 0;
        this.motionObstacleScore = 0;
        this.motionTurnScore = 0;
        this.motionEntranceScore = 0;
        this.motionStallScore = 0;
        this.footObstacleScore = 0;
        this.priorFootObstacleScore = 0;
        this.footObstacleFlickerScore = 0;
        this.footObstacleBandDelta = 0;
        this.footObstacleBounceFrames = 0;
        this.inputStallFrames = 0;
        this.motionIntent = "idle";
        this.depthSignature = "0000";
        this.depthEstimate = 1;
        this.faceSignature = "0000000000000000";
        this.faceQuantizedFrameChange = 255;
        this.cornerSignal = 0;
        this.wallSignatureMemory = [];
        this.cornerSignatureMemory = [];
        this.depthSignatureMemory = [];
        this.signatureMatchKind = "none";
        this.signatureMatchDistance = 255;
        this.depthSignatureDistance = 255;
        this.wallUseProbeFrames = 0;
        this.wallUseProbeStage = 0;
        this.wallUseProbeTurn = "left";
        this.pendingUseResponseFrames = 0;
        this.lastUseDepthEstimate = 1;
        this.lastUseWasBlocked = false;
        this.lastUseProbeStage = 0;
        this.doorTransitionArmedFrames = 0;
        this.darkZoneFrames = 0;
        this.darkZoneEntered = false;
        this.darkAreaScore = 0;
        this.gameplayLuma = 0;
        this.blueFloorScore = 0;
        this.mapDoorSectorMatch = false;
        this.mapDarkSectorMatch = false;
        this.mapEnemyZoneMatch = false;
        this.mapSectorId = "unknown";
        this.firstDoorCorridorLocated = false;
        this.firstDoorCorridorFrames = 0;
        this.firstDoorCorridorSignature = 0;
        this.firstDoorUseAttempted = false;
        this.firstDoorUseSignature = 0;
        this.firstDoorVision9x9Score = 0;
        this.firstDoorVision9x9Box = null;
        this.firstDoorVision9x9Heatmap = [];
        this.firstDoorVision9x9RedScore = 0;
        this.firstDoorUse3x3Score = 0;
        this.firstDoorUse3x3Turn = "none";
        this.firstDoorUse3x3Reason = "none";
        this.firstDoorUseFrame = 0;
        this.firstDoorTransitionFrames = 0;
        this.firstDoorUseLatchFrames = 0;
        this.firstDoorUsePulsed = false;
        this.firstDoorLockedUseCycles = 0;
        this.firstDoorReprobeFrames = 0;
        this.firstDoorReprobeTurn = "right";
        this.firstDoorCorridorSuppressFrames = 0;
        this.firstDoorWallOnlyCandidateFrames = 0;
        this.computerRoomAdvanceFrames = 0;
        this.computerRoomFrames = 0;
        this.computerRoomEntered = false;
        this.computerRoomScore = 0;
        this.computerBlueScore = 0;
        this.computerRedLightScore = 0;
        this.computerDarkPanelScore = 0;
        this.computerPanelScore = 0;
        this.centralHallFrames = 0;
        this.centralHallEntered = false;
        this.centralHallEnemySweepFrames = 0;
        this.centralHallEnemySweepTurn = "right";
        this.stairsCandidateFrames = 0;
        this.stairsEntered = false;
        this.finalRoomCandidateFrames = 0;
        this.finalRoomEntered = false;
        this.exitSwitchUseFrames = 0;
        this.exitSwitchPressed = false;
        this.cornerSuppressFrames = 0;
        this.wallDetachFrames = 0;
        this.wallDetachTurn = "left";
        this.wallSurveyFrames = 0;
        this.wallSurveyTurn = "left";
        this.wallSurveyDecisionFrames = 0;
        this.wallFollowFrames = 0;
        this.wallFollowSide = "right";
        this.semanticContextResetFrames = 0;
        this.semanticContextResetCooldownFrames = 0;
        this.contextResetReason = "none";
        this.combatSurveyFrames = 0;
        this.combatSurveyTurn = "right";
        this.combatContextActive = false;
        this.topologicalTransitionBlocked = false;
        this.enemyConfidence = 0;
        this.enemyTurn = "none";
        this.enemyDistance = 1;
        this.enemyCluster = "none";
        this.enemyFireReady = false;
        this.enemyCenterCellConfidence = 0;
        this.enemyAllRegionPeak = 0;
        this.enemyLateralBias = 0;
        this.ammoSignature = "000000000000000000000";
        this.ammoLikelyEmpty = false;
        this.healthSignature = "000000000000000000000000";
        this.healthLikelyDead = false;
        this.healthZeroScore = 0;
        this.healthActiveColumns = 0;
        this.healthActiveCells = 0;
        this.healthDeathTintScore = 0;
        this.healthStatusDeathTintScore = 0;
        this.healthFaceDeathTintScore = 0;
        this.healthEstimatedPercent = 100;
        this.doorOpenedCount = 0;
        this.enemyDefeatedCount = 0;
        this.combatFireFrames = 0;
        this.enemyConfidencePeak = 0;
        this.enemyDropFrames = 0;
        this.combatBurstFrames = 0;
        this.combatBurstShots = 0;
        this.enemyAlertFrames = 0;
        this.enemyAlertTurn = "none";
        this.enemyAlertCluster = "none";
        this.enemyAlertDepth = 1;
        this.enemyAlertPeakConfidence = 0;
        this.strategyContext = "unknown";
        this.strategyPriority = 0;
        this.controlPipeline = "OpeningHome";
        this.objective = "find-and-open-first-door";
        this.semanticMemory = createE1M1SemanticMemory();
      }
      return this.status();
    }

    status() {
      return {
        enabled: this.enabled,
        mode: this.mode,
        strategyName: this.strategyName,
        predictions: this.predictions,
        reused: this.reused,
        lastLatencyMs: this.lastLatencyMs,
        lastAction: this.lastAction,
        lastError: this.lastError,
        safetyReason: this.safetyReason,
        stuckFrames: this.stuckFrames,
        recoveryFrames: this.recoveryFrames,
        loopEscapeFrames: this.loopEscapeFrames,
        useCooldown: this.useCooldown,
        mobilityMode: this.mobilityMode,
        wallHugSide: this.wallHugSide,
        targetConfidence: this.targetConfidence,
        soundCueActive: this.soundCueActive,
        auditorySnapshot: this.auditorySnapshot,
        spatialSnapshot: this.spatialSnapshot,
        visionSensor: this.visionSensorSnapshot,
        motorSensor: this.motorSensorSnapshot,
        movementSensor: this.movementSensorSnapshot,
        compassSensor: this.compassSensorSnapshot,
        spatialSensor: this.spatialSensorSnapshot,
        healthSensor: this.healthSensorSnapshot,
        sensorTensor: serializeSensorTensorPacket(this.sensorTensorPacket),
        ctgCarrier: this.ctgCarrier,
        ctgObservedScores: this.ctgObservedScores,
        toposDecisionCarrier: this.toposDecisionCarrier,
        nousCarrier: this.nousCarrier,
        phainomenon: this.phainomenon,
        nousDetectorResult: this.nousDetectorResult,
        phantasiaSnapshot: this.phantasiaSnapshot,
        sensorDetections: this.sensorDetections,
        actionSignature: this.kinesisActionSignature,
        actionRepeatFrames: this.kinesisActionRepeatFrames,
        repeatActionFrames: this.repeatActionFrames,
        repeatTurnFrames: this.repeatTurnFrames,
        openAdvanceStallFrames: this.openAdvanceStallFrames,
        openStallEscapeFrames: this.openStallEscapeFrames,
        cornerExitCommitFrames: this.cornerExitCommitFrames,
        cornerExitTurn: this.cornerExitTurn,
        mapRushCorrectionFrames: this.mapRushCorrectionFrames,
        mapRushCorrectionBackFrames: this.mapRushCorrectionBackFrames,
        mapRushCorrectionTurn: this.mapRushCorrectionTurn,
        mapRushCorrectionReversals: this.mapRushCorrectionReversals,
        mapDoorSweepFrames: this.mapDoorSweepFrames,
        mapDoorSweepTurn: this.mapDoorSweepTurn,
        firstDoorCorridorSearchFrames: this.firstDoorCorridorSearchFrames,
        firstDoorCorridorSearchTurn: this.firstDoorCorridorSearchTurn,
        courtyardRescueFrames: this.courtyardRescueFrames,
        courtyardRescueTurnFrames: this.courtyardRescueTurnFrames,
        courtyardRescueTurn: this.courtyardRescueTurn,
        courtyardRescueMode: this.courtyardRescueMode,
        firstDoorDeadEndTurnFrames: this.firstDoorDeadEndTurnFrames,
        spawnCorridorGapFrames: this.spawnCorridorGapFrames,
        spawnCorridorGapAlignFrames: this.spawnCorridorGapAlignFrames,
        bridgeBrownScore: round2(this.bridgeBrownScore),
        bridgeGreenLeft: round2(this.bridgeGreenLeft),
        bridgeGreenCenter: round2(this.bridgeGreenCenter),
        bridgeGreenRight: round2(this.bridgeGreenRight),
        bridgeLaneTurn: this.bridgeLaneTurn,
        bridgeDoorScore: round2(this.bridgeDoorScore),
        quantizedStallFrames: this.quantizedStallFrames,
        quantizedFrameChange: this.quantizedFrameChange,
        regionQuantizedFrameChange: this.regionQuantizedFrameChange,
        statusBarQuantizedFrameChange: this.statusBarQuantizedFrameChange,
        regionSignature: this.regionSignature,
        region9Signature: this.region9Signature,
        vision9x9Signature: this.vision9x9Signature,
        motion9Signature: this.motion9Signature,
        motion9Delta: this.motion9Delta,
        motionForwardProgress: this.motionForwardProgress,
        motionObstacleScore: this.motionObstacleScore,
        motionTurnScore: this.motionTurnScore,
        motionEntranceScore: this.motionEntranceScore,
        motionStallScore: this.motionStallScore,
        footObstacleScore: round2(this.footObstacleScore),
        footObstacleFlickerScore: round2(this.footObstacleFlickerScore),
        footObstacleBandDelta: round2(this.footObstacleBandDelta),
        footObstacleBounceFrames: this.footObstacleBounceFrames,
        inputStallFrames: this.inputStallFrames,
        priorFootObstacleScore: round2(this.priorFootObstacleScore),
        motionIntent: this.motionIntent,
        depthSignature: this.depthSignature,
        depthEstimate: this.depthEstimate,
        faceSignature: this.faceSignature,
        faceQuantizedFrameChange: this.faceQuantizedFrameChange,
        cornerSignal: this.cornerSignal,
        wallSignatureCount: this.wallSignatureMemory.length,
        cornerSignatureCount: this.cornerSignatureMemory.length,
        depthSignatureCount: this.depthSignatureMemory.length,
        signatureMatchKind: this.signatureMatchKind,
        signatureMatchDistance: this.signatureMatchDistance,
        depthSignatureDistance: this.depthSignatureDistance,
        wallUseProbeFrames: this.wallUseProbeFrames,
        wallUseProbeStage: this.wallUseProbeStage,
        wallUseProbeTurn: this.wallUseProbeTurn,
        pendingUseResponseFrames: this.pendingUseResponseFrames,
        lastUseDepthEstimate: round2(this.lastUseDepthEstimate),
        lastUseWasBlocked: this.lastUseWasBlocked,
        lastUseProbeStage: this.lastUseProbeStage,
        firstDoorUseLatchFrames: this.firstDoorUseLatchFrames,
        firstDoorUsePulsed: this.firstDoorUsePulsed,
        firstDoorLockedUseCycles: this.firstDoorLockedUseCycles,
        firstDoorReprobeFrames: this.firstDoorReprobeFrames,
        firstDoorReprobeTurn: this.firstDoorReprobeTurn,
        firstDoorCorridorSuppressFrames: this.firstDoorCorridorSuppressFrames,
        cornerSuppressFrames: this.cornerSuppressFrames,
        wallDetachFrames: this.wallDetachFrames,
        wallDetachTurn: this.wallDetachTurn,
        wallSurveyFrames: this.wallSurveyFrames,
        wallSurveyTurn: this.wallSurveyTurn,
        wallSurveyDecisionFrames: this.wallSurveyDecisionFrames,
        wallFollowFrames: this.wallFollowFrames,
        wallFollowSide: this.wallFollowSide,
        semanticContextResetFrames: this.semanticContextResetFrames,
        semanticContextResetCooldownFrames: this.semanticContextResetCooldownFrames,
        contextResetReason: this.contextResetReason,
        combatSurveyFrames: this.combatSurveyFrames,
        combatSurveyTurn: this.combatSurveyTurn,
        combatContextActive: this.combatContextActive,
        topologicalTransitionBlocked: this.topologicalTransitionBlocked,
        enemyConfidence: this.enemyConfidence,
        enemyTurn: this.enemyTurn,
        enemyDistance: this.enemyDistance,
        enemyCluster: this.enemyCluster,
        enemyFireReady: this.enemyFireReady,
        enemyCenterCellConfidence: round2(this.enemyCenterCellConfidence),
        enemyAllRegionPeak: round2(this.enemyAllRegionPeak),
        enemyLateralBias: round2(this.enemyLateralBias),
        ammoSignature: this.ammoSignature,
        ammoLikelyEmpty: this.ammoLikelyEmpty,
        healthSignature: this.healthSignature,
        healthLikelyDead: this.healthLikelyDead,
        healthZeroScore: round2(this.healthZeroScore),
        healthActiveColumns: this.healthActiveColumns,
        healthActiveCells: this.healthActiveCells,
        healthEstimatedPercent: this.healthEstimatedPercent,
        healthDeathTintScore: round2(this.healthDeathTintScore),
        healthStatusDeathTintScore: round2(this.healthStatusDeathTintScore),
        healthFaceDeathTintScore: round2(this.healthFaceDeathTintScore),
        milestones: {
          doorOpened: this.doorOpenedCount,
          enemyDefeated: this.enemyDefeatedCount,
          darkZoneEntered: this.darkZoneEntered,
          darkZoneFrames: this.darkZoneFrames,
          doorTransitionArmedFrames: this.doorTransitionArmedFrames,
          darkAreaScore: round2(this.darkAreaScore),
          gameplayLuma: round2(this.gameplayLuma),
          blueFloorScore: round2(this.blueFloorScore),
          courtyardScore: round2(this.courtyardScore),
          courtyardTurn: this.courtyardTurn,
          courtyardRescueFrames: this.courtyardRescueFrames,
          spawnSecretDoorScore: round2(this.spawnSecretDoorScore),
          spawnSecretDoorTurn: this.spawnSecretDoorTurn,
          spawnWestStairScore: round2(this.spawnWestStairScore),
          spawnWestStairTurn: this.spawnWestStairTurn,
          spawnCenterAnchorScore: round2(this.spawnCenterAnchorScore),
          spawnCenterAnchorTurn: this.spawnCenterAnchorTurn,
          spawnLandmarkRouteEvidence: round2(this.spawnLandmarkRouteEvidence),
          spawnLandmarkRouteTurn: this.spawnLandmarkRouteTurn,
          spawnLandmarkRouteKind: this.spawnLandmarkRouteKind,
          spawnLandmarkRouteFrames: this.spawnLandmarkRouteFrames,
          spawnCorridorGapScore: round2(this.spawnCorridorGapScore),
          spawnCorridorGapTurn: this.spawnCorridorGapTurn,
          spawnCorridorGapFrames: this.spawnCorridorGapFrames,
          bridgeBrownScore: round2(this.bridgeBrownScore),
          bridgeGreenLeft: round2(this.bridgeGreenLeft),
          bridgeGreenCenter: round2(this.bridgeGreenCenter),
          bridgeGreenRight: round2(this.bridgeGreenRight),
          bridgeLaneTurn: this.bridgeLaneTurn,
          bridgeDoorScore: round2(this.bridgeDoorScore),
          firstDoorDeadEndTurnFrames: this.firstDoorDeadEndTurnFrames,
          mapDoorSectorMatch: this.mapDoorSectorMatch,
          mapDarkSectorMatch: this.mapDarkSectorMatch,
          mapEnemyZoneMatch: this.mapEnemyZoneMatch,
          mapSectorId: this.mapSectorId,
          firstDoorCorridorLocated: this.firstDoorCorridorLocated,
          firstDoorCorridorFrames: this.firstDoorCorridorFrames,
          firstDoorCorridorSignature: round2(this.firstDoorCorridorSignature),
          firstDoorUseAttempted: this.firstDoorUseAttempted,
          firstDoorUseSignature: round2(this.firstDoorUseSignature),
          firstDoorUseFrame: this.firstDoorUseFrame,
          firstDoorTransitionFrames: this.firstDoorTransitionFrames,
          firstDoorVision9x9Score: round2(this.firstDoorVision9x9Score || 0),
          firstDoorVision9x9Box: this.firstDoorVision9x9Box || null,
          firstDoorVision9x9Heatmap: Array.isArray(this.firstDoorVision9x9Heatmap) ? this.firstDoorVision9x9Heatmap : [],
          firstDoorVision9x9RedScore: round2(this.firstDoorVision9x9RedScore || 0),
          firstDoorUse3x3Score: round2(this.firstDoorUse3x3Score || 0),
          firstDoorUse3x3Turn: this.firstDoorUse3x3Turn || "none",
          firstDoorUse3x3Reason: this.firstDoorUse3x3Reason || "none",
          computerRoomAdvanceFrames: this.computerRoomAdvanceFrames,
          computerRoomEntered: this.computerRoomEntered,
          computerRoomFrames: this.computerRoomFrames,
          computerRoomScore: round2(this.computerRoomScore),
          computerBlueScore: round2(this.computerBlueScore),
          computerRedLightScore: round2(this.computerRedLightScore),
          computerDarkPanelScore: round2(this.computerDarkPanelScore),
          computerPanelScore: round2(this.computerPanelScore),
          centralHallEntered: this.centralHallEntered,
          centralHallFrames: this.centralHallFrames,
          centralHallEnemySweepFrames: this.centralHallEnemySweepFrames,
          centralHallEnemySweepTurn: this.centralHallEnemySweepTurn,
          stairsEntered: this.stairsEntered,
          stairsCandidateFrames: this.stairsCandidateFrames,
          finalRoomEntered: this.finalRoomEntered,
          finalRoomCandidateFrames: this.finalRoomCandidateFrames,
          exitSwitchUseFrames: this.exitSwitchUseFrames,
          exitSwitchPressed: this.exitSwitchPressed,
          staticMapMatch: {
            firstDoorKnown: this.mapDoorSectorMatch,
            darkZoneCandidate: this.darkAreaScore >= profileNumber(this.profile, "darkZoneScoreThreshold", DARK_ZONE_SCORE_THRESHOLD)
              && this.gameplayLuma > 0
              && this.gameplayLuma <= profileNumber(this.profile, "darkZoneLumaThreshold", DARK_ZONE_LUMA_THRESHOLD),
            requiresDoorTransition: this.doorTransitionArmedFrames > 0
          },
          combatFireFrames: this.combatFireFrames,
          combatBurstFrames: this.combatBurstFrames,
          combatBurstShots: this.combatBurstShots,
          enemyConfidencePeak: round2(this.enemyConfidencePeak),
          enemyDropFrames: this.enemyDropFrames,
          enemyAlertFrames: this.enemyAlertFrames,
          enemyAlertTurn: this.enemyAlertTurn,
          enemyAlertCluster: this.enemyAlertCluster,
          enemyAlertDepth: round2(this.enemyAlertDepth),
          enemyAlertPeakConfidence: round2(this.enemyAlertPeakConfidence)
        },
        strategyContext: this.strategyContext,
        strategyPriority: this.strategyPriority,
        currentAction: normalizeAction(this.lastAction),
        controlPipeline: this.controlPipeline,
        objective: this.objective,
        activeDetections: activeDetectionsForPipeline(this),
        pipelineTrace: buildAutoplayPipelineTrace(this),
        semanticMemory: this.semanticMemory,
        model: this.modelManifest?.name || "Bonsai-1.7B-Q1_0"
      };
    }

    updateSemanticMemory(frame, context) {
      const depthEstimate = Number(context?.depthEstimate ?? this.depthEstimate ?? 1);
      this.semanticMemory = updateE1M1SemanticMemory(this.semanticMemory, {
        phase: inferControlPipeline(this),
        objective: inferObjective(this),
        predictions: this.predictions,
        depthEstimate,
        blueFloorHomeThreshold: Number(context?.blueFloorHomeThreshold ?? BLUE_FLOOR_HOME_THRESHOLD),
        bridgeLaneVisible: Boolean(context?.bridgeLaneVisible),
        firstDoorLikelyOpened: Boolean(context?.firstDoorLikelyOpened),
        doorApproachDepth: profileNumber(this.profile, "doorApproachDepth", 0.86),
        firstDoorCorridorSignature: this.firstDoorCorridorSignature,
        firstDoorUseSignature: this.firstDoorUseSignature,
        firstDoorUseAttempted: this.firstDoorUseAttempted,
        spawnCorridorGapScore: this.spawnCorridorGapScore,
        spawnCorridorGapTurn: this.spawnCorridorGapTurn,
        motionEntranceScore: this.motionEntranceScore,
        motionForwardProgress: this.motionForwardProgress,
        motionTurnScore: this.motionTurnScore,
        motionObstacleScore: this.motionObstacleScore,
        blueFloorScore: this.blueFloorScore,
        courtyardScore: this.courtyardScore,
        courtyardTurn: this.courtyardTurn,
        spawnSecretDoorScore: this.spawnSecretDoorScore,
        spawnSecretDoorTurn: this.spawnSecretDoorTurn,
        spawnWestStairScore: this.spawnWestStairScore,
        spawnWestStairTurn: this.spawnWestStairTurn,
        spawnCenterAnchorScore: this.spawnCenterAnchorScore,
        spawnCenterAnchorTurn: this.spawnCenterAnchorTurn,
        spawnLandmarkRouteEvidence: this.spawnLandmarkRouteEvidence,
        spawnLandmarkRouteTurn: this.spawnLandmarkRouteTurn,
        spawnLandmarkRouteKind: this.spawnLandmarkRouteKind,
        mapDoorSectorMatch: this.mapDoorSectorMatch,
        mapEnemyZoneMatch: this.mapEnemyZoneMatch,
        wallUseProbeFrames: this.wallUseProbeFrames,
        doorOpenedCount: this.doorOpenedCount,
        computerRoomScore: this.computerRoomScore,
        darkAreaScore: this.darkAreaScore,
        darkZoneEntered: this.darkZoneEntered,
        bridgeBrownScore: this.bridgeBrownScore,
        bridgeGreenLeft: this.bridgeGreenLeft,
        bridgeGreenCenter: this.bridgeGreenCenter,
        bridgeGreenRight: this.bridgeGreenRight,
        bridgeLaneTurn: this.bridgeLaneTurn,
        bridgeDoorScore: this.bridgeDoorScore,
        finalRoomEntered: this.finalRoomEntered,
        exitSwitchUseFrames: this.exitSwitchUseFrames,
        exitSwitchPressed: this.exitSwitchPressed,
        enemyConfidence: this.enemyConfidence,
        enemyConfidencePeak: this.enemyConfidencePeak,
        enemyAlertTurn: this.enemyAlertTurn,
        healthLikelyDead: this.healthLikelyDead
      });
    }

    async predict(state) {
      if (!this.enabled) {
        return neutralAction();
      }

      const startedAt = now();
      this.mode = "predicting";
      try {
        const external = resolveExternalPredictor();
        const predictorState = Object.assign({}, state || {}, {
          kinesisActionRepeatFrames: this.kinesisActionRepeatFrames,
          actionRepeatFrames: this.kinesisActionRepeatFrames,
          repeatActionFrames: this.repeatActionFrames,
          repeatTurnFrames: this.repeatTurnFrames
        });
        const action = external
          ? await external.predict(predictorState)
          : await heuristicPredict(predictorState, this.lastAction);

        this.lastAction = this.applyControlRules(action, predictorState);
        this.predictions += 1;
        this.lastLatencyMs = Math.round(now() - startedAt);
        this.mode = "idle";
        this.lastError = "";
        return this.lastAction;
      } catch (error) {
        this.lastError = error instanceof Error ? error.message : String(error);
        this.mode = "error";
        return this.lastAction;
      }
    }

    applyControlRules(action, state) {
      const frame = state?.framebuffer || {};
      const normalized = normalizeAction(action, this.lastAction);
      const features = buildAutoplayFrameFeatures(this, normalized, state, frame);
      const {
        quantizedSample,
        quantizedRegions,
        quantizedRegion9,
        quantizedVision9x9,
        previous,
        frameChange,
        quantizedFrameChange,
        regionQuantizedFrameChange,
        region9QuantizedFrameChange,
        motion,
        quantizedStatusBar,
        statusBarQuantizedFrameChange,
        quantizedDepth,
        depthSignatureDistance,
        depthEstimate,
        mapHints,
        quantizedFace,
        quantizedAmmo,
        ammoState,
        quantizedHealth,
        healthSensorEnabled,
        faceQuantizedFrameChange,
        visualStallDelta,
        faceDeathScore,
        healthState,
        wallPressure,
        quantizedStable,
        wallLike,
        signatureMatch,
        knownWall,
        knownCorner,
        movementIntent,
        navigableView,
        openView,
        dictionarySuppressed,
        doorApproachDepth,
        cornerSignal,
        cornerTrap,
        pinnedWall,
        cornered,
        looped,
        soundCue,
        sensor
      } = features;
      let enemy = features.enemy;
      let effectiveTargetConfidence = features.effectiveTargetConfidence;
      let auditorySnapshot = features.auditorySnapshot;
      updateAutoplaySensorState(this, features, state, frame, normalized);
      if (this.doorTransitionArmedFrames > 0) {
        this.doorTransitionArmedFrames -= 1;
      }
      if (this.semanticContextResetCooldownFrames > 0) {
        this.semanticContextResetCooldownFrames -= 1;
      }
      if (this.semanticContextResetFrames > 0) {
        this.semanticContextResetFrames -= 1;
        if (this.semanticContextResetFrames <= 0) {
          this.contextResetReason = "none";
        }
      }
      if (this.combatSurveyFrames > 0) {
        this.combatSurveyFrames -= 1;
      }
      const contextResetReason = this.detectContextDiscontinuity(frame, state, quantizedFrameChange, regionQuantizedFrameChange, depthSignatureDistance, enemy);
      if (contextResetReason && this.semanticContextResetCooldownFrames <= 0) {
        if (contextResetReason === "combat-visual-discontinuity") {
          this.startCombatLocalRelocalization(contextResetReason, frame);
        } else {
          this.startSemanticContextReset(contextResetReason, frame);
        }
      }

      const routeState = updateAutoplaySemanticRouteState(this, features, state, frame, enemy, effectiveTargetConfidence, auditorySnapshot);
      const combatContextActive = routeState.combatContextActive;
      if (this.centralHallEntered && Number(this.enemyDefeatedCount || 0) <= 0 && !this.ammoLikelyEmpty) {
        this.stairsEntered = false;
        this.stairsCandidateFrames = 0;
        this.finalRoomEntered = false;
        this.finalRoomCandidateFrames = 0;
        this.exitSwitchPressed = false;
        this.exitSwitchUseFrames = 0;
      }

      if (this.healthSensorSnapshot.retryRequested) {
        this.combatFireFrames = 0;
        this.enemyConfidencePeak = 0;
        this.enemyDropFrames = 0;
        this.strategyContext = "health-retry";
        this.strategyPriority = 100;
        this.controlPipeline = "Retry";
        this.objective = "retry-after-death";
        this.safetyReason = "dead-restart";
        this.mobilityMode = "reborn-use";
        this.auditorySnapshot = auditorySnapshot;
        this.spatialSnapshot = buildSpatialSnapshot(state, auditorySnapshot);
        this.ctgCarrier = createCtgCarrier({
          phase: "Retry",
          pipeline: "Retry",
          lastDecision: "retry-requested",
          confidence: this.healthSensorSnapshot.confidence,
          timestamp: this.healthSensorSnapshot.timestamp,
          retryRequested: true,
          retryReason: "health-death",
          retryPriority: this.healthSensorSnapshot.retryPriority,
          ternaryTrace: this.nousCarrier?.bonsaiTernary || {}
        });
        this.nousCarrier = buildNousCarrier(this, state, this.healthSensorSnapshot.timestamp);
        this.lastAction = normalizeAction({
          move: "none",
          turn: "none",
          fire: false,
          strafe: false,
          use: ((state?.frame || 0) % 18) < 5,
          run: false
        });
        return this.lastAction;
      }
      if (this.pendingUseResponseFrames > 0) {
        const useResponseDelta = Math.max(quantizedFrameChange, regionQuantizedFrameChange);
        const depthImprovedAfterUse = this.lastUseWasBlocked
          && depthEstimate >= OPEN_VIEW_DEPTH_THRESHOLD
          && depthEstimate - this.lastUseDepthEstimate >= 0.18;
        const useOpenedView = useResponseDelta > WALL_USE_PROBE_CHANGE_THRESHOLD
          && depthImprovedAfterUse
          && (openView || navigableView || (!wallLike && !knownWall));
        if (useOpenedView) {
          this.doorTransitionArmedFrames = Math.max(
            this.doorTransitionArmedFrames,
            profileNumber(this.profile, "doorTransitionArmedFrames", DOOR_TRANSITION_ARMED_FRAMES));
          this.pendingUseResponseFrames = 0;
          this.safetyReason = "door-transition-armed";
          this.lastUseWasBlocked = false;
        } else {
          this.pendingUseResponseFrames -= 1;
        }
      }
      this.strategyContext = sensor.contextDict;
      this.strategyPriority = 0;
      this.controlPipeline = inferControlPipeline(this);
      this.objective = inferObjective(this);
      this.mobilityMode = "walk";
      if (this.cornerSuppressFrames > 0) {
        this.cornerSuppressFrames -= 1;
      }

      if (pinnedWall) {
        this.quantizedStallFrames = Math.min(MAX_STUCK_COUNTER, this.quantizedStallFrames + 1);
      } else {
        this.quantizedStallFrames = Math.max(0, this.quantizedStallFrames - 1);
      }

      const quantizedWallStuck = this.quantizedStallFrames >= QUANTIZED_WALL_STALL_FRAMES || (cornerTrap && this.quantizedStallFrames >= 2) || (knownWall && movementIntent);
      const urgentCorner = cornered || knownCorner || quantizedWallStuck;
      const deepCorner = urgentCorner && this.depthEstimate <= DEEP_CORNER_DEPTH_THRESHOLD;
      const doorTransitionGraceActive = isDoorTransitionGraceActive(this, state);
      const preDoorDemoRouteGraceActive = isPreDoorDemoRouteGraceActive(this, {
        depthEstimate: this.depthEstimate,
        movementSpeed: Math.max(Number(this.motionForwardProgress || 0), Number(this.movementSensorSnapshot?.confidence || 0))
      });
      const legacyDoorTransitionCleared = clearLegacyDoorTransitionInterventions(this);
      if (preDoorDemoRouteGraceActive) {
        this.wallFollowFrames = 0;
        this.hardStuckEscapeFrames = 0;
        this.openStallEscapeFrames = 0;
        this.loopEscapeFrames = 0;
        this.recoveryFrames = 0;
      }
      const footBounceStall = movementIntent
        && Number(this.footObstacleBounceFrames || 0) >= 3
        && Number(this.footObstacleFlickerScore || 0) >= 0.42;
      const localMinimaTrap = movementIntent
        && !openView
        && !navigableView
        && !doorTransitionGraceActive
        && !preDoorDemoRouteGraceActive
        && this.wallUseProbeFrames <= 0
        && (this.motionStallScore >= 0.74 || footBounceStall)
        && this.motionForwardProgress <= profileNumber(this.profile, "motionForwardProgressThreshold", MOTION_FORWARD_PROGRESS_THRESHOLD) * 0.8
        && (this.depthEstimate <= 0.72 || wallPressure > STUCK_WALL_THRESHOLD || this.inputStallFrames >= 4 || footBounceStall);
      const combatStallTrap = combatContextActive
        && !openView
        && !doorTransitionGraceActive
        && !preDoorDemoRouteGraceActive
        && this.wallUseProbeFrames <= 0
        && (this.motionStallScore >= 0.62 || this.inputStallFrames >= 3 || this.movementSensorSnapshot?.eventType === "movement-stall")
        && (this.depthEstimate <= 0.82 || wallPressure > STUCK_WALL_THRESHOLD * 0.65 || this.priorFootObstacleScore >= 0.18 || footBounceStall);
      if ((localMinimaTrap || combatStallTrap) && this.wallFollowFrames <= 0) {
        this.wallFollowFrames = WALL_FOLLOW_FRAMES;
        this.wallFollowSide = chooseWallHugSide(frame, this.wallFollowSide);
      }

      if (!preDoorDemoRouteGraceActive
        && !legacyDoorTransitionCleared
        && movementIntent
        && (urgentCorner || (frameChange < STUCK_CHANGE_THRESHOLD && wallPressure > STUCK_WALL_THRESHOLD))) {
        this.stuckFrames = Math.min(MAX_STUCK_COUNTER, this.stuckFrames + 1);
      } else {
        this.stuckFrames = Math.max(0, this.stuckFrames - 1);
      }

      if ((state?.frame || 0) % 90 === 0) {
        this.turnBias = this.turnBias === "left" ? "right" : "left";
      }

      let safe = Object.assign({}, normalized);
      this.safetyReason = "clear";
      if (this.useCooldown > 0) {
        this.useCooldown -= 1;
      }
      if (this.firstDoorUseLatchFrames > 0) {
        this.firstDoorUseLatchFrames -= 1;
      }
      if (this.wallSurveyDecisionFrames > 0) {
        this.wallSurveyDecisionFrames -= 1;
      }

      const urgentDarkCombat = this.darkZoneEntered
        && this.mapEnemyZoneMatch
        && this.enemyAlertFrames > 0
        && !this.ammoLikelyEmpty;
      const firstDoorLatchActive = this.doorOpenedCount <= 0
        && this.firstDoorCorridorLocated
        && this.firstDoorUseAttempted
        && this.firstDoorUseLatchFrames > 0;

      if (urgentDarkCombat) {
        safe = this.combatAlertAction(safe, frame, state);
        this.safetyReason = "dark-combat-alert";
      } else if (this.combatSurveyFrames > 0) {
        safe = this.combatSurveyAction();
        this.combatSurveyFrames -= 1;
        this.safetyReason = "combat-relocalization";
      } else if (firstDoorLatchActive) {
        safe = this.firstDoorUseLatchAdvanceAction();
      } else if (this.wallUseProbeFrames > 0) {
        if (this.shouldReprobeFirstDoorUse()) {
          this.startFirstDoorReprobe(profileNumber(this.profile, "firstDoorReprobeFrames", 36));
          safe = this.firstDoorReprobeAction(profileNumber(this.profile, "firstDoorReprobeFrames", 36));
        } else {
          safe = this.wallUseProbeAction();
          this.wallUseProbeFrames -= 1;
          this.safetyReason = `door-probe-${this.wallUseProbeStage}`;
        }
      } else if (this.wallSurveyFrames > 0) {
        safe = this.wallSurveyAction();
        this.wallSurveyFrames -= 1;
        if (this.wallSurveyFrames === 0) {
          this.wallSurveyDecisionFrames = WALL_SURVEY_DECISION_FRAMES;
        }
        this.safetyReason = "wall-survey";
      } else if (this.wallFollowFrames > 0 && !preDoorDemoRouteGraceActive && !doorTransitionGraceActive) {
        if (openView || navigableView) {
          this.wallFollowFrames = 0;
          safe = this.openAdvanceAction(frame);
          this.safetyReason = "open-view-wall-follow";
        } else {
          safe = this.wallFollowAction(safe, frame, state);
          this.wallFollowFrames -= 1;
          this.safetyReason = "wall-follow-local-minima";
        }
      } else if (this.wallUseProbeStage > 0 && visualStallDelta <= WALL_USE_PROBE_CHANGE_THRESHOLD) {
        if (this.wallUseProbeStage === 1) {
          this.wallUseProbeStage = 2;
          this.wallUseProbeTurn = chooseDoorProbeTurn(frame, this.turnBias);
          this.wallUseProbeFrames = WALL_USE_PROBE_FRAMES;
          safe = this.wallUseProbeAction();
          this.safetyReason = "door-probe-2";
        } else if (this.wallUseProbeStage === 2) {
          this.wallUseProbeStage = 3;
          this.wallUseProbeTurn = oppositeTurn(this.wallUseProbeTurn);
          this.wallUseProbeFrames = WALL_USE_PROBE_FRAMES;
          safe = this.wallUseProbeAction();
          this.safetyReason = "door-probe-3";
        } else {
          this.wallUseProbeStage = 0;
          this.cornerSuppressFrames = CORNER_SUPPRESS_FRAMES;
          this.stuckFrames = 0;
          this.quantizedStallFrames = 0;
          rejectSignature(this.cornerSignatureMemory, quantizedSample, SIGNATURE_CORNER_MATCH_THRESHOLD * 2.5);
          rejectSignature(this.depthSignatureMemory, quantizedDepth, SIGNATURE_DEPTH_MATCH_THRESHOLD * 2);
          safe = this.openViewExploreAction(frame);
          this.safetyReason = "door-probe-failed";
        }
      } else if (this.wallUseProbeStage > 0) {
        this.wallUseProbeStage = 0;
        this.quantizedStallFrames = 0;
        const depthImprovedAfterUse = this.lastUseWasBlocked
          && depthEstimate >= OPEN_VIEW_DEPTH_THRESHOLD
          && depthEstimate - this.lastUseDepthEstimate >= 0.18;
        if (this.doorOpenedCount > 0 && depthImprovedAfterUse && (openView || navigableView || (!wallLike && !knownWall))) {
          safe = neutralAction();
          this.safetyReason = "door-opened";
          this.doorOpenedCount += 1;
          this.lastUseWasBlocked = false;
        } else {
          safe = this.openViewExploreAction(frame);
          this.safetyReason = "door-probe-drift";
        }
      } else if (this.wallDetachFrames > 0) {
        if (openView) {
          this.wallDetachFrames = 0;
          this.quantizedStallFrames = 0;
          safe = this.openAdvanceAction(frame);
          this.safetyReason = "open-view-detach";
        } else {
          safe = this.wallDetachAction();
          this.wallDetachFrames -= 1;
          this.safetyReason = "wall-detach";
        }
      } else if (dictionarySuppressed && (quantizedWallStuck || this.stuckFrames >= STUCK_FRAMES)) {
        this.repeatTurnFrames = 0;
        this.repeatActionFrames = 0;
        this.repeatActionSignature = "";
        if (openView) {
          this.wallDetachFrames = 0;
          this.quantizedStallFrames = 0;
          safe = this.openAdvanceAction(frame);
          this.safetyReason = "open-view-detach";
        } else {
          this.wallDetachFrames = WALL_DETACH_FRAMES;
          this.wallDetachTurn = chooseEscapeTurn(frame, this.turnBias);
          safe = this.wallDetachAction();
          this.safetyReason = "wall-detach";
        }
      } else if (!dictionarySuppressed && (urgentCorner || this.stuckFrames >= STUCK_FRAMES)) {
        this.loopEscapeFrames = 0;
        this.repeatTurnFrames = 0;
        this.repeatActionFrames = 0;
        this.repeatActionSignature = "";
        if (deepCorner && this.useCooldown > 0) {
          this.recoveryFrames = Math.max(this.recoveryFrames, CORNER_RECOVERY_FRAMES + 10);
          this.recoveryTurn = chooseEscapeTurn(frame, this.turnBias);
          safe = this.cornerRecoveryAction();
          this.mobilityMode = "escape";
          this.safetyReason = "deep-corner";
        } else if (this.useCooldown === 0) {
          if (this.wallSurveyDecisionFrames <= 0) {
            this.wallSurveyFrames = WALL_SURVEY_FRAMES;
            this.wallSurveyTurn = chooseEscapeTurn(frame, this.turnBias);
            safe = this.wallSurveyAction();
            this.safetyReason = "wall-survey";
          } else {
            this.wallUseProbeStage = 1;
            this.wallUseProbeTurn = "none";
            this.wallUseProbeFrames = WALL_USE_PROBE_FRAMES;
            this.useCooldown = USE_COOLDOWN_FRAMES;
            safe = this.wallUseProbeAction();
            this.safetyReason = "door-probe-1";
          }
        } else {
          this.recoveryFrames = CORNER_RECOVERY_FRAMES;
          this.recoveryTurn = chooseEscapeTurn(frame, this.turnBias);
          safe = {
            move: "back",
            turn: this.recoveryTurn,
            fire: false,
            strafe: true,
            use: false,
            run: false
          };
          this.mobilityMode = "escape";
          this.safetyReason = knownCorner ? "known-corner" : (cornered ? "corner-trap" : (quantizedWallStuck ? "quantized-wall" : "wall-recovery"));
        }
        this.stuckFrames = 0;
        this.quantizedStallFrames = 0;
      } else if (this.loopEscapeFrames > 0) {
        if (openView) {
          this.loopEscapeFrames = 0;
          this.quantizedStallFrames = 0;
          safe = this.openAdvanceAction(frame);
          this.safetyReason = "open-view-loop";
        } else {
          safe = this.loopEscapeAction();
          this.loopEscapeFrames -= 1;
          this.safetyReason = "loop-escape";
        }
      } else if (looped) {
        if (openView) {
          this.loopEscapeFrames = 0;
          this.quantizedStallFrames = 0;
          safe = this.openAdvanceAction(frame);
          this.safetyReason = "open-view-loop";
        } else {
          this.loopEscapeFrames = LOOP_ESCAPE_FRAMES;
          this.loopEscapeTurn = this.turnBias === "left" ? "right" : "left";
          safe = this.loopEscapeAction();
          this.safetyReason = "breadcrumb-loop";
        }
      } else if (this.centralHallEntered
        && this.objective === "engage-front-enemy"
        && !this.ammoLikelyEmpty
        && Math.max(Number(this.targetConfidence || 0), Number(enemy.confidence || 0)) >= 0.24
        && enemy.cluster !== "green"
        && enemy.cluster !== "gate"
        && !String(enemy.cluster || "").startsWith("gate-")) {
        safe = this.enemyLockAction(safe, frame, state);
        this.safetyReason = "central-hall-front-enemy-lock";
      } else if (this.centralHallEntered
        && this.mapEnemyZoneMatch
        && !this.ammoLikelyEmpty
        && enemy.confidence >= Math.max(0.46, COMBAT_CONFIDENCE_THRESHOLD)
        && enemy.distance <= 1.05
        && enemy.cluster !== "none"
        && enemy.cluster !== "green"
        && enemy.cluster !== "gate"
        && !String(enemy.cluster || "").startsWith("gate-")) {
        safe = this.combatAction(safe, frame, state, enemy, faceQuantizedFrameChange);
        this.safetyReason = "central-hall-front-enemy";
      } else if (this.centralHallEntered
        && this.objective === "engage-front-enemy"
        && Number(this.enemyDefeatedCount || 0) <= 0
        && !this.ammoLikelyEmpty) {
        safe = this.centralHallEnemySweepAction(safe, frame, state);
        this.safetyReason = "central-hall-front-enemy-sweep";
      } else if (enemy.confidence >= COMBAT_CONFIDENCE_THRESHOLD
        && this.darkZoneEntered
        && this.mapEnemyZoneMatch
        && isTrustedEnemyCluster(enemy.cluster, enemy.distance)
        && isTrustedEnemyDepth(enemy.cluster, enemy.distance, enemy.confidence, enemy.centerCellConfidence)) {
        safe = this.combatAction(safe, frame, state, enemy, faceQuantizedFrameChange);
        this.safetyReason = "combat";
      } else if (this.doorOpenedCount > 0 && this.enemyAlertFrames > 0 && !this.ammoLikelyEmpty) {
        safe = this.combatAlertAction(safe, frame, state);
        this.safetyReason = "combat-alert";
      } else if (soundCue) {
        safe = this.soundSourceAction(soundCue);
        this.safetyReason = "sound-source";
      } else if (effectiveTargetConfidence >= TARGET_LOCK_CONFIDENCE) {
        safe = this.enemyLockAction(safe, frame, state);
        this.safetyReason = "enemy-lock";
      } else if (this.recoveryFrames > 0) {
        safe = this.cornerRecoveryAction();
        this.recoveryFrames -= 1;
        this.safetyReason = "corner-recovery";
      } else if (wallLike && !openView && !doorTransitionGraceActive && depthEstimate < doorApproachDepth) {
        if (this.useCooldown === 0) {
          safe.use = true;
          this.useCooldown = USE_COOLDOWN_FRAMES;
          this.safetyReason = "door-check";
          this.mobilityMode = "door-check";
        } else {
          this.wallDetachFrames = Math.max(this.wallDetachFrames, Math.floor(WALL_DETACH_FRAMES / 2));
          this.wallDetachTurn = chooseEscapeTurn(frame, this.turnBias);
          safe = this.wallDetachAction();
          this.safetyReason = "wall-avoid";
        }
      }

      const mayFire = !ammoState.likelyEmpty
        && ((effectiveTargetConfidence >= TARGET_LOCK_CONFIDENCE || enemy.fireReady || this.safetyReason === "combat" || this.safetyReason === "combat-alert" || this.safetyReason === "dark-combat-alert")
          || (this.safetyReason === "central-hall-front-enemy-sweep"
            && this.centralHallEntered
            && this.objective === "engage-front-enemy"
            && Number(this.enemyDefeatedCount || 0) <= 0
            && Math.max(Number(this.targetConfidence || 0), Number(enemy.confidence || 0), Number(this.enemyCenterCellConfidence || 0)) >= 0.18))
        && safe.move !== "back"
        && !safe.use;
      if (safe.fire && mayFire) {
        this.fireCooldown = FIRE_COOLDOWN_FRAMES;
      } else {
        safe.fire = false;
        if (normalized.fire) {
          this.safetyReason = this.safetyReason === "clear" ? "fire-gated" : this.safetyReason;
        }
      }

      if (safe.move === "forward" && this.safetyReason === "clear" && !safe.fire) {
        const openCruise = navigableView || openView || (this.depthEstimate >= OPEN_VIEW_DEPTH_THRESHOLD && effectiveTargetConfidence < TARGET_LOCK_CONFIDENCE);
        safe = openCruise ? this.openAdvanceAction(frame) : this.wallHugAction(safe, frame, state);
      }

      if (this.safetyReason === "clear") {
        safe = this.applyRepeatTurnBreaker(safe, effectiveTargetConfidence);
      } else {
        this.repeatActionFrames = 0;
        this.repeatActionSignature = "";
      }
      this.learnVisualSignature(quantizedSample, {
        wall: !openView && !navigableView && (wallLike || quantizedWallStuck),
        corner: !dictionarySuppressed && (cornered || this.safetyReason === "corner-trap" || this.safetyReason === "deep-corner")
      });
      this.learnDepthSignature(quantizedDepth, !dictionarySuppressed && (wallLike || urgentCorner));

      safe = this.applySensorFusionStrategy(safe, sensor, frame, state);
      safe = this.applyCtgToposFeedback(safe, sensor, frame, state);
      updateKinesisActionLoop(this, safe);
      if (safe.use && this.pendingUseResponseFrames <= 0) {
        if (this.doorOpenedCount <= 0 && this.firstDoorCorridorLocated) {
        this.firstDoorUseAttempted = true;
        this.firstDoorUseSignature = Math.max(this.firstDoorCorridorSignature, this.firstDoorVision9x9Score);
          this.firstDoorUseFrame = Number(state?.frame || 0);
        }
        this.pendingUseResponseFrames = 30;
        this.lastUseDepthEstimate = depthEstimate;
        this.lastUseWasBlocked = wallLike || knownWall || urgentCorner || this.wallUseProbeStage > 0 || depthEstimate <= Math.max(DOOR_USE_DEPTH_THRESHOLD, profileNumber(this.profile, "doorUseDepth", DOOR_USE_DEPTH_THRESHOLD)) + 0.08;
        this.lastUseProbeStage = this.wallUseProbeStage;
      }
      if (safe.use || this.pendingUseResponseFrames > 0 || this.firstDoorUseLatchFrames > 0 || this.firstDoorUsePulsed) {
        auditorySnapshot = classifyUseAuditoryResponse(this, auditorySnapshot, {
          quantizedFrameChange,
          regionQuantizedFrameChange,
          visualStallDelta,
          depthEstimate
        });
      }

      this.auditorySnapshot = auditorySnapshot;
      this.spatialSnapshot = buildSpatialSnapshot(state, auditorySnapshot);
      refreshSensorCognition(this, state, frame, {
        quantizedVision9x9,
        motion,
        auditorySnapshot,
        action: safe
      });
      this.ctgCarrier = createCtgCarrier({
        phase: this.semanticMemory?.phase || this.controlPipeline,
        pipeline: this.controlPipeline,
        lastDecision: this.enabled ? "policy-carried" : "disabled",
        confidence: this.spatialSnapshot.confidence,
        timestamp: this.spatialSnapshot.timestamp,
        observedScores: this.ctgObservedScores,
        toposDecision: this.toposDecisionCarrier,
        decisionVector: this.toposDecisionCarrier?.decisionVector,
        kairos: this.toposDecisionCarrier?.kairos,
        ethosTarget: this.toposDecisionCarrier?.ethosTarget,
        feedbackApplied: Boolean(this.toposDecisionCarrier?.feedbackApplied),
        gateExecuted: false,
        ternaryTrace: this.nousCarrier?.bonsaiTernary || {}
      });
      this.nousCarrier = buildNousCarrier(this, state, this.spatialSnapshot.timestamp);

      const frameSnapshot = frame.sample?.length ? {
        sample: frame.sample.slice(0),
        quantizedSample,
        quantizedRegions,
        quantizedRegion9,
        quantizedVision9x9,
        quantizedStatusBar,
        quantizedDepth,
        quantizedFace,
        quantizedAmmo,
        quantizedHealth,
        footObstacleBandSample: Array.isArray(frame.footObstacleBandSample) ? frame.footObstacleBandSample.slice(0) : [],
        actionSignature: this.kinesisActionSignature,
        actionRepeatFrames: this.kinesisActionRepeatFrames,
        motionForwardProgress: this.motionForwardProgress,
        footObstacleFlickerScore: this.footObstacleFlickerScore,
        footObstacleBounceFrames: this.footObstacleBounceFrames,
        depthSignature: this.depthSignature,
        left: frame.left || 0,
        right: frame.right || 0,
        center: frame.center || 0
      } : null;
      if (frameSnapshot) {
        this.previousFrame = frameSnapshot;
        this.frameHistory.push(frameSnapshot);
        if (this.frameHistory.length > 12) {
          this.frameHistory.shift();
        }
      } else {
        this.previousFrame = previous;
      }

      return normalizeAction(safe);
    }

    applyCtgToposFeedback(action, sensor, frame, state) {
      let safe = normalizeAction(action);
      const objective = inferObjective(this);
      if (this.toposEthosObjective !== objective) {
        this.toposEthosObjective = objective;
        this.toposEthosFrames = 0;
      } else {
        this.toposEthosFrames = Math.min(MAX_STUCK_COUNTER, Number(this.toposEthosFrames || 0) + 1);
      }

      const observedScores = buildCtgObservedScores(this, safe, sensor, frame, state);
      const carrier = buildToposDecisionCarrier(this, safe, observedScores, sensor, frame, state);
      const feedback = mapToposDecisionToKinesis(this, safe, carrier, observedScores, sensor, frame, state);
      safe = feedback.action;
      this.ctgObservedScores = observedScores;
      this.toposDecisionCarrier = {
        ...carrier,
        feedbackApplied: Boolean(feedback.applied),
        feedbackReason: feedback.reason || "none",
        mappedAction: describeActionVector(safe)
      };
      return normalizeAction(safe);
    }

    applySensorFusionStrategy(action, sensor, frame, state) {
      const safe = normalizeAction(action);
      const firstDoorRushFrames = profileNumber(this.profile, "firstDoorRushFrames", 1500);
      const firstDoorRushDepth = profileNumber(this.profile, "firstDoorRushDepth", 0.74);
      const firstDoorRushWallVectorLimit = profileNumber(this.profile, "firstDoorRushWallVectorLimit", 0.22);
      const firstDoorBearingFrames = Math.max(0, Math.round(profileNumber(this.profile, "firstDoorBearingFrames", 220)));
      const firstDoorUseThreshold = profileNumber(this.profile, "firstDoorUseSignatureThreshold", FIRST_DOOR_USE_SIGNATURE_THRESHOLD);
      const firstDoorRetryTolerance = profileNumber(this.profile, "firstDoorRetrySignatureTolerance", FIRST_DOOR_RETRY_SIGNATURE_TOLERANCE);
      const mapRushLookoutFrames = Math.max(18, Math.round(profileNumber(this.profile, "mapRushLookoutFrames", MAP_RUSH_LOOKOUT_FRAMES)));
      const mapRushBackoffFrames = Math.max(0, Math.round(profileNumber(this.profile, "mapRushBackoffFrames", MAP_RUSH_BACKOFF_FRAMES)));
      const mapRushOpenWallVectorLimit = profileNumber(this.profile, "mapRushOpenWallVectorLimit", 0.14);
      const mapRushOpenDelta = profileNumber(this.profile, "mapRushOpenDelta", 1.85);
      const mapDoorSweepFrames = Math.max(30, Math.round(profileNumber(this.profile, "mapDoorSweepFrames", MAP_DOOR_SWEEP_FRAMES)));
      const firstDoorCorridorSearchFrames = Math.max(36, Math.round(profileNumber(this.profile, "firstDoorCorridorSearchFrames", FIRST_DOOR_CORRIDOR_SEARCH_FRAMES)));
      const firstDoorCorridorBackFrames = Math.max(0, Math.round(profileNumber(this.profile, "firstDoorCorridorBackFrames", FIRST_DOOR_CORRIDOR_BACK_FRAMES)));
      const firstDoorCorridorTurnFrames = Math.max(8, Math.round(profileNumber(this.profile, "firstDoorCorridorTurnFrames", FIRST_DOOR_CORRIDOR_TURN_FRAMES)));
      const firstDoorProbeMinFrames = Math.max(firstDoorBearingFrames + 60, Math.round(profileNumber(this.profile, "firstDoorProbeMinFrames", FIRST_DOOR_PROBE_MIN_FRAMES)));
      const firstDoorSearchIntervalFrames = Math.max(160, Math.round(profileNumber(this.profile, "firstDoorSearchIntervalFrames", FIRST_DOOR_SEARCH_INTERVAL_FRAMES)));
      const firstDoorSpawnRouteFrames = Math.max(240, Math.round(profileNumber(this.profile, "firstDoorSpawnRouteFrames", FIRST_DOOR_SPAWN_ROUTE_FRAMES)));
      const firstDoorSpawnScanFrames = Math.max(12, Math.round(profileNumber(this.profile, "firstDoorSpawnScanFrames", FIRST_DOOR_SPAWN_SCAN_FRAMES)));
      const firstDoorOpeningLockFrames = Math.max(firstDoorSpawnRouteFrames, Math.round(profileNumber(this.profile, "firstDoorOpeningLockFrames", FIRST_DOOR_OPENING_LOCK_FRAMES)));
      const firstDoorOpeningForwardLockFrames = Math.max(30, Math.round(profileNumber(this.profile, "firstDoorOpeningForwardLockFrames", FIRST_DOOR_OPENING_FORWARD_LOCK_FRAMES)));
      const firstDoorWallRunFrames = Math.max(80, Math.round(profileNumber(this.profile, "firstDoorRightWallRunFrames", FIRST_DOOR_RIGHT_WALL_RUN_FRAMES)));
      const firstDoorCorridorTransitFrames = Math.max(80, Math.round(profileNumber(this.profile, "firstDoorCorridorTransitFrames", FIRST_DOOR_CORRIDOR_TRANSIT_FRAMES)));
      const firstDoorCorridorTurnDepth = profileNumber(this.profile, "firstDoorCorridorTurnDepth", FIRST_DOOR_CORRIDOR_TURN_DEPTH);
      const firstDoorCorridorTurnStuckFrames = Math.max(4, Math.round(profileNumber(this.profile, "firstDoorCorridorTurnStuckFrames", FIRST_DOOR_CORRIDOR_TURN_STUCK_FRAMES)));
      const firstDoorCorridorSkirtFrames = Math.max(0, Math.round(profileNumber(this.profile, "firstDoorCorridorSkirtFrames", FIRST_DOOR_CORRIDOR_SKIRT_FRAMES)));
      const blueFloorHomeThreshold = profileNumber(this.profile, "blueFloorHomeThreshold", BLUE_FLOOR_HOME_THRESHOLD);
      const courtyardRescueThreshold = profileNumber(this.profile, "courtyardRescueThreshold", COURTYARD_RESCUE_THRESHOLD);
      const courtyardRescueFrames = Math.max(24, Math.round(profileNumber(this.profile, "courtyardRescueFrames", COURTYARD_RESCUE_FRAMES)));
      const courtyardRescueBackFrames = Math.max(0, Math.round(profileNumber(this.profile, "courtyardRescueBackFrames", COURTYARD_RESCUE_BACK_FRAMES)));
      const courtyardRescueTurnFrames = Math.max(6, Math.round(profileNumber(this.profile, "courtyardRescueTurnFrames", COURTYARD_RESCUE_TURN_FRAMES)));
      const firstDoorDeadEndTurnFrames = Math.max(10, Math.round(profileNumber(this.profile, "firstDoorDeadEndTurnFrames", FIRST_DOOR_DEAD_END_TURN_FRAMES)));
      const firstDoorDeadEndDepth = profileNumber(this.profile, "firstDoorDeadEndDepth", FIRST_DOOR_DEAD_END_DEPTH);
      const spawnCorridorGapThreshold = profileNumber(this.profile, "spawnCorridorGapThreshold", SPAWN_CORRIDOR_GAP_THRESHOLD);
      const spawnCorridorGapFrames = Math.max(24, Math.round(profileNumber(this.profile, "spawnCorridorGapFrames", SPAWN_CORRIDOR_GAP_FRAMES)));
      const spawnCorridorGapAlignFrames = Math.max(4, Math.round(profileNumber(this.profile, "spawnCorridorGapAlignFrames", SPAWN_CORRIDOR_GAP_ALIGN_FRAMES)));
      const bridgeBrownThreshold = profileNumber(this.profile, "bridgeBrownThreshold", BRIDGE_BROWN_THRESHOLD);
      const bridgeGreenHazardThreshold = profileNumber(this.profile, "bridgeGreenHazardThreshold", BRIDGE_GREEN_HAZARD_THRESHOLD);
      const bridgeGreenHazard = Math.max(this.bridgeGreenLeft, this.bridgeGreenCenter, this.bridgeGreenRight);
      const bridgeVisualCueStrong = this.computerRoomEntered
        && (this.bridgeBrownScore >= bridgeBrownThreshold * 0.55
          || bridgeGreenHazard >= bridgeGreenHazardThreshold + 0.08
          || this.bridgeDoorScore >= Math.max(0.18, BRIDGE_DOOR_PANEL_THRESHOLD - 0.1));
      const bridgeLaneVisible = this.doorOpenedCount > 0
        && (!isComputerPanelStillVisible(this) || bridgeVisualCueStrong)
        && isBridgeLaneVisible(this.bridgeBrownScore, this.bridgeGreenLeft, this.bridgeGreenCenter, this.bridgeGreenRight, bridgeBrownThreshold, bridgeGreenHazardThreshold);
      const legacyDoorTransitionCleared = clearLegacyDoorTransitionInterventions(this);
      const stallSuppressedByRoute = legacyDoorTransitionCleared || isPreDoorDemoRouteGraceActive(this, {
        depthEstimate: this.depthEstimate,
        movementSpeed: Math.max(Number(this.motionForwardProgress || 0), Number(this.movementSensorSnapshot?.confidence || 0))
      });
      if (legacyDoorTransitionCleared && this.doorOpenedCount > 0 && !this.computerRoomEntered && !this.finalRoomEntered) {
        this.computerRoomAdvanceFrames = Math.max(this.computerRoomAdvanceFrames, 36);
        return this.computerRoomAdvanceAction(sensor, frame);
      }

      const firstDoorReprobeTotalFrames = Math.max(20, Math.round(profileNumber(this.profile, "firstDoorReprobeFrames", 36)));
      if (this.firstDoorReprobeFrames > 0) {
        return this.firstDoorReprobeAction(firstDoorReprobeTotalFrames);
      }

      if (this.shouldReprobeFirstDoorUse()) {
        this.startFirstDoorReprobe(firstDoorReprobeTotalFrames);
        return this.firstDoorReprobeAction(firstDoorReprobeTotalFrames);
      }

      const semanticAction = this.semanticObjectiveAction(sensor, frame, {
        bridgeLaneVisible,
        courtyardRescueFrames,
        courtyardRescueBackFrames,
        courtyardRescueTurnFrames,
        firstDoorSpawnScanFrames,
        firstDoorWallRunFrames,
        firstDoorOpeningLockFrames,
        spawnCorridorGapFrames,
        spawnCorridorGapAlignFrames,
        spawnCorridorGapThreshold,
        blueFloorHomeThreshold,
        doorApproachDepth: profileNumber(this.profile, "doorApproachDepth", 0.86)
      });
      if (semanticAction) {
        return semanticAction;
      }

      const openingRouteLocked = this.doorOpenedCount <= 0
        && !this.firstDoorCorridorLocated
        && this.predictions <= firstDoorOpeningLockFrames;
      if (openingRouteLocked) {
        this.wallUseProbeFrames = 0;
        this.wallUseProbeStage = 0;
        this.hardStuckEscapeFrames = 0;
        this.openStallEscapeFrames = 0;
        this.loopEscapeFrames = 0;
        this.recoveryFrames = 0;
        this.repeatTurnFrames = 0;
        this.enemyAlertFrames = 0;
        this.enemyAlertCluster = "none";
        this.enemyAlertTurn = "none";
        this.enemyConfidencePeak = 0;
        this.combatFireFrames = 0;
        this.useCooldown = Math.min(this.useCooldown, 3);
        this.strategyPriority = 3;
        this.strategyContext = "spawn-home";
        this.controlPipeline = "OpeningHome";
        this.safetyReason = "opening-route-lock";

        const earlyFirstDoorPatch = this.firstDoorVision9x9Box || null;
        const earlyFirstDoorPatchStrong = this.predictions >= firstDoorSpawnScanFrames
          && earlyFirstDoorPatch?.kind === "first-door-9x9-patch"
          && Number(earlyFirstDoorPatch.score || this.firstDoorVision9x9Score || 0) >= 0.46
          && Number(earlyFirstDoorPatch.redScore || this.firstDoorVision9x9RedScore || 0) >= 0.12
          && Number(earlyFirstDoorPatch.edgeScore || 0) >= 0.30
          && this.blueFloorScore < blueFloorHomeThreshold + 0.12;
        if (earlyFirstDoorPatchStrong) {
          this.firstDoorCorridorLocated = true;
          this.firstDoorCorridorFrames = corridorConfirmFrames;
          this.strategyContext = "semantic-first-door";
          this.controlPipeline = "FirstDoor";
          this.safetyReason = "opening-door-patch-lock";
          return this.firstDoorUseAimCorrectionAction(
            this.firstDoorUseAlignmentState(earlyFirstDoorPatch),
            "opening-first-door-9x9-lock",
            { keepProbeFrames: true });
        }

        const spawnLandmarkScanReady = this.predictions >= Math.max(18, firstDoorSpawnScanFrames - 12);
        const spawnLandmarkRouteStable = spawnLandmarkScanReady
          && Number(this.spawnLandmarkRouteFrames || 0) >= 2
          && Number(this.spawnLandmarkRouteEvidence || 0) >= 0.28;
        const spawnSecretDoorAnchorVisible = spawnLandmarkScanReady
          && spawnLandmarkRouteStable
          && this.spawnLandmarkRouteKind === "secret-door-anchor"
          && this.spawnSecretDoorScore >= profileNumber(this.profile, "spawnSecretDoorThreshold", SPAWN_SECRET_DOOR_THRESHOLD)
          && this.firstDoorVision9x9RedScore < FIRST_DOOR_RED_ACCENT_THRESHOLD
          && this.firstDoorUse3x3Score < FIRST_DOOR_DARK_PANEL_USE_ALIGNMENT_SCORE
          && this.courtyardScore < Math.max(0.18, courtyardRescueThreshold - 0.12);
        const spawnWestStairAnchorVisible = spawnLandmarkScanReady
          && spawnLandmarkRouteStable
          && this.spawnLandmarkRouteKind === "west-stair-anchor"
          && this.spawnWestStairScore >= profileNumber(this.profile, "spawnWestStairThreshold", SPAWN_WEST_STAIR_THRESHOLD)
          && this.firstDoorVision9x9RedScore < FIRST_DOOR_RED_ACCENT_THRESHOLD
          && this.firstDoorUse3x3Score < FIRST_DOOR_DARK_PANEL_USE_ALIGNMENT_SCORE
          && this.courtyardScore < Math.max(0.18, courtyardRescueThreshold - 0.12);
        if (spawnSecretDoorAnchorVisible) {
          return this.openingSpawnLandmarkAnchorAction("secret-door", "left");
        }

        if (spawnWestStairAnchorVisible) {
          return this.openingSpawnLandmarkAnchorAction("west-stair", "right");
        }

        if (this.predictions < firstDoorOpeningForwardLockFrames) {
          return this.openingForwardLockAction(firstDoorOpeningForwardLockFrames);
        }

        const lockedCourtyardSuppressed = Number(this.firstDoorCorridorSuppressFrames || 0) > 0;
        const lockedCourtyardActive = this.courtyardRescueFrames > 0
          || (this.predictions >= firstDoorSpawnScanFrames
            && !lockedCourtyardSuppressed
            && this.courtyardTurn !== "none"
            && this.courtyardScore >= Math.max(0.08, courtyardRescueThreshold - 0.24));
        if (lockedCourtyardActive) {
          if (this.courtyardRescueFrames <= 0) {
            this.courtyardRescueFrames = courtyardRescueFrames;
            this.courtyardRescueTurnFrames = courtyardRescueTurnFrames;
            this.configureCourtyardRescue();
          }

          return this.courtyardRescueAction(courtyardRescueFrames, courtyardRescueBackFrames);
        }

        const lockedGapSuppressed = Number(this.firstDoorCorridorSuppressFrames || 0) > 0;
        const lockedGapActive = !lockedGapSuppressed
          && (this.spawnCorridorGapFrames > 0
          || (this.predictions >= firstDoorSpawnScanFrames
            && (this.spawnCorridorGapScore >= Math.max(0.18, spawnCorridorGapThreshold - 0.06)
              || (this.motionEntranceScore >= profileNumber(this.profile, "motionEntranceThreshold", 0.22)
                && this.motionForwardProgress >= profileNumber(this.profile, "motionForwardProgressThreshold", MOTION_FORWARD_PROGRESS_THRESHOLD)
                && this.motionTurnScore < profileNumber(this.profile, "motionTurnSweepThreshold", MOTION_TURN_SWEEP_THRESHOLD)
                && this.blueFloorScore < blueFloorHomeThreshold
                && this.spawnCorridorGapScore >= Math.max(0.14, spawnCorridorGapThreshold - 0.12)))));
        if (lockedGapActive) {
          if (this.spawnCorridorGapFrames <= 0) {
            this.spawnCorridorGapFrames = spawnCorridorGapFrames;
            this.spawnCorridorGapAlignFrames = spawnCorridorGapAlignFrames;
          }

          return this.spawnCorridorGapAction(spawnCorridorGapFrames);
        }

        return this.openingRouteLockAction(firstDoorSpawnScanFrames, firstDoorWallRunFrames, firstDoorOpeningLockFrames, sensor);
      }

      const lateDoorCandidate = this.doorOpenedCount > 0
        && !this.healthLikelyDead
        && this.useCooldown === 0
        && (this.finalRoomEntered
          || (this.stairsEntered
            && (this.bridgeDoorScore >= Math.max(0.18, profileNumber(this.profile, "bridgeDoorPanelThreshold", BRIDGE_DOOR_PANEL_THRESHOLD) - 0.08)
              || this.mapDoorSweepFrames > 0)));
      if (lateDoorCandidate) {
        if (this.exitSwitchUseFrames <= 0 && !this.exitSwitchPressed) {
          this.exitSwitchUseFrames = Math.round(profileNumber(this.profile, "lateDoorUseFrames", LATE_DOOR_USE_FRAMES));
        }

        return this.exitSwitchAction(sensor);
      }

      const firstDoorAdvanceCandidate = !this.computerRoomEntered
        && !this.centralHallEntered
        && (this.doorOpenedCount > 0 || this.firstDoorTransitionFrames >= 10);
      if (firstDoorAdvanceCandidate) {
        this.wallUseProbeFrames = 0;
        this.wallUseProbeStage = 0;
        this.cornerExitCommitFrames = 0;
        this.hardStuckEscapeFrames = 0;
        this.openStallEscapeFrames = 0;
        this.loopEscapeFrames = 0;
        this.recoveryFrames = 0;
        this.mapDoorSweepFrames = 0;
        if (this.computerRoomAdvanceFrames <= 0) {
          this.computerRoomAdvanceFrames = Math.round(profileNumber(this.profile, "computerRoomAdvanceFrames", COMPUTER_ROOM_ADVANCE_FRAMES));
        }

        return this.computerRoomAdvanceAction(sensor, frame);
      }

      if (bridgeLaneVisible
        && !this.centralHallEntered
        && this.wallUseProbeFrames <= 0
        && this.safetyReason !== "combat"
        && this.safetyReason !== "combat-alert"
        && this.safetyReason !== "dark-combat-alert") {
        return this.bridgeLaneGuardAction();
      }

      if (this.finalRoomEntered) {
        if (this.exitSwitchUseFrames <= 0 && !this.exitSwitchPressed) {
          this.exitSwitchUseFrames = Math.round(profileNumber(this.profile, "exitSwitchUseFrames", EXIT_SWITCH_USE_FRAMES));
        }

        return this.exitSwitchAction(sensor);
      }

      const combatSafetyActive = (this.safetyReason === "combat"
        || this.safetyReason === "combat-alert"
        || this.safetyReason === "dark-combat-alert")
        && Number(this.enemyConfidence || 0) >= COMBAT_CONFIDENCE_THRESHOLD;
      const computerRoomAdvanceAllowed = this.doorOpenedCount > 0
        && !this.centralHallEntered
        && !bridgeLaneVisible
        && !this.healthLikelyDead
        && this.wallUseProbeFrames <= 0
        && !combatSafetyActive;
      if (computerRoomAdvanceAllowed
        && (this.computerRoomAdvanceFrames > 0 || this.darkZoneEntered || this.doorTransitionArmedFrames > 0)) {
        if (this.computerRoomAdvanceFrames <= 0) {
          this.computerRoomAdvanceFrames = Math.round(profileNumber(this.profile, "computerRoomAdvanceFrames", COMPUTER_ROOM_ADVANCE_FRAMES));
        }

        return this.computerRoomAdvanceAction(sensor, frame);
      }

      const mapGuidedFirstDoor = Boolean(state?.mapHints?.doorLines || state?.mapHints?.switchLines)
        && this.doorOpenedCount <= 0
        && this.predictions <= firstDoorRushFrames
        && !this.soundCueActive
        && this.enemyConfidence < COMBAT_CONFIDENCE_THRESHOLD + 0.18;
      if (mapGuidedFirstDoor) {
        const firstDoorRelativeAngle = Number(state?.mapHints?.firstDoor?.relativeAngle ?? 0);
        const firstDoorBearingTurn = firstDoorRelativeAngle < -8 ? "right" : (firstDoorRelativeAngle > 8 ? "left" : "none");
        const stillInSpawnOpenArea = this.blueFloorScore >= blueFloorHomeThreshold
          || (this.predictions < firstDoorSpawnRouteFrames && !this.firstDoorCorridorLocated);
        if (stillInSpawnOpenArea) {
          this.wallUseProbeFrames = 0;
          this.wallUseProbeStage = 0;
          this.strategyPriority = 2;
          this.safetyReason = "map-spawn-corridor-route";
          const courtyardRescueSuppressed = Number(this.firstDoorCorridorSuppressFrames || 0) > 0;
          const courtyardRescueActive = this.courtyardRescueFrames > 0
            || (this.predictions >= firstDoorSpawnScanFrames
              && !courtyardRescueSuppressed
              && (this.blueFloorScore >= blueFloorHomeThreshold || this.predictions < firstDoorWallRunFrames + 120)
              && this.courtyardTurn !== "none"
              && this.courtyardScore >= Math.max(0.08, courtyardRescueThreshold - 0.24));
          if (courtyardRescueActive) {
            if (this.courtyardRescueFrames <= 0) {
              this.courtyardRescueFrames = courtyardRescueFrames;
              this.courtyardRescueTurnFrames = courtyardRescueTurnFrames;
              this.configureCourtyardRescue();
            }

            return this.courtyardRescueAction(courtyardRescueFrames, courtyardRescueBackFrames);
          }

          const spawnCorridorGapActive = this.spawnCorridorGapFrames > 0
            || (this.predictions >= firstDoorSpawnScanFrames
              && (this.spawnCorridorGapScore >= Math.max(0.16, spawnCorridorGapThreshold - 0.04)
                || (this.motionEntranceScore >= profileNumber(this.profile, "motionEntranceThreshold", 0.22)
                  && this.motionForwardProgress >= profileNumber(this.profile, "motionForwardProgressThreshold", MOTION_FORWARD_PROGRESS_THRESHOLD)
                  && this.motionTurnScore < profileNumber(this.profile, "motionTurnSweepThreshold", MOTION_TURN_SWEEP_THRESHOLD)
                  && this.blueFloorScore < blueFloorHomeThreshold
                  && this.spawnCorridorGapScore >= Math.max(0.14, spawnCorridorGapThreshold - 0.12))));
          if (spawnCorridorGapActive) {
            if (this.spawnCorridorGapFrames <= 0) {
              this.spawnCorridorGapFrames = spawnCorridorGapFrames;
              this.spawnCorridorGapAlignFrames = spawnCorridorGapAlignFrames;
            }

            return this.spawnCorridorGapAction(spawnCorridorGapFrames);
          }

          if (this.predictions < firstDoorSpawnScanFrames) {
            this.mobilityMode = "spawn-look-right-outer-wall";
            return normalizeAction({
              move: "none",
              turn: firstDoorBearingTurn !== "none" ? firstDoorBearingTurn : "right",
              fire: false,
              strafe: false,
              use: false,
              run: false
            });
          }

          if (this.predictions < firstDoorSpawnScanFrames + 42
            && this.spawnCorridorGapScore < Math.max(0.14, spawnCorridorGapThreshold - 0.12)) {
            this.mobilityMode = "spawn-route-a-to-c-right-align";
            return normalizeAction({
              move: "forward",
              turn: "right",
              fire: false,
              strafe: false,
              use: false,
              run: true
            });
          }

          if (this.predictions < firstDoorWallRunFrames + 84
            && this.spawnCorridorGapScore < Math.max(0.16, spawnCorridorGapThreshold - 0.08)) {
            const driftTurn = Math.abs(sensor.wallVector) > 16
              ? (sensor.wallVector > 0 ? "left" : "right")
              : (this.blueFloorScore >= blueFloorHomeThreshold ? "right" : "none");
            this.mobilityMode = "spawn-route-a-to-c-center";
            return normalizeAction({
              move: "forward",
              turn: driftTurn,
              fire: false,
              strafe: false,
              use: false,
              run: true
            });
          }

          if (this.predictions < firstDoorSpawnRouteFrames || this.blueFloorScore >= blueFloorHomeThreshold) {
            this.mobilityMode = this.blueFloorScore >= blueFloorHomeThreshold
              ? "spawn-route-blue-floor-exit"
              : "spawn-route-corridor-sweep";
            return normalizeAction({
              move: "forward",
              turn: this.blueFloorScore >= blueFloorHomeThreshold ? "right" : "left",
              fire: false,
              strafe: false,
              use: false,
              run: true
            });
          }
        }
        const firstDoorProbeAllowed = this.firstDoorCorridorLocated
          && (this.predictions >= firstDoorProbeMinFrames
            || this.doorTransitionArmedFrames > 0
            || this.darkZoneFrames > 0);
        const firstDoorCorridorTransitActive = this.firstDoorCorridorLocated
          && !this.firstDoorUseAttempted
          && this.wallUseProbeFrames <= 0
          && this.predictions <= firstDoorProbeMinFrames + firstDoorCorridorTransitFrames
          && sensor.depthSig > firstDoorCorridorTurnDepth;
        if (firstDoorCorridorTransitActive) {
          this.firstDoorDeadEndTurnFrames = 0;
          this.firstDoorCorridorSearchFrames = 0;
          this.hardStuckEscapeFrames = 0;
          this.openStallEscapeFrames = 0;
          return this.firstDoorCorridorTransitAction(sensor, firstDoorCorridorTurnDepth, firstDoorCorridorTurnStuckFrames, firstDoorCorridorSkirtFrames);
        }

        const firstDoorDeadEndTurnNeeded = this.firstDoorDeadEndTurnFrames > 0
          || (this.firstDoorCorridorLocated
            && !this.firstDoorUseAttempted
            && this.wallUseProbeFrames <= 0
            && sensor.depthSig <= firstDoorDeadEndDepth
            && (this.quantizedStallFrames >= 2 || this.stuckFrames >= 5));
        if (firstDoorDeadEndTurnNeeded) {
          if (this.firstDoorDeadEndTurnFrames <= 0) {
            this.firstDoorDeadEndTurnFrames = firstDoorDeadEndTurnFrames;
          }

          this.firstDoorDeadEndTurnFrames -= 1;
          this.wallUseProbeFrames = 0;
          this.wallUseProbeStage = 0;
          this.strategyPriority = 2;
          this.safetyReason = "map-first-door-dead-end-right";
          this.mobilityMode = "corridor-dead-end-right-turn";
          return normalizeAction({
            move: "none",
            turn: "right",
            fire: false,
            strafe: false,
            use: false,
            run: false
          });
        }

        const canSearchFirstDoorCorridor = this.firstDoorCorridorLocated
          || this.firstDoorCorridorFrames >= Math.min(8, corridorConfirmFrames);
        const firstDoorPeriodicSearch = canSearchFirstDoorCorridor
          && this.predictions > firstDoorBearingFrames + 80
          && ((this.predictions - firstDoorBearingFrames) % firstDoorSearchIntervalFrames) <= 3;
        const firstDoorGuidedUseLock = this.firstDoorCorridorLocated
          && this.firstDoorUseAttempted
          && (this.firstDoorUseSignature >= firstDoorUseThreshold - firstDoorRetryTolerance || this.mapDoorSectorMatch)
          && this.useCooldown === 0;
      if (firstDoorGuidedUseLock) {
          this.cornerExitCommitFrames = 0;
          this.hardStuckEscapeFrames = 0;
          this.openStallEscapeFrames = 0;
          this.loopEscapeFrames = 0;
          this.recoveryFrames = 0;
          this.wallDetachFrames = 0;
          this.wallSurveyFrames = 0;
          this.mapRushCorrectionFrames = 0;
          this.mapRushCorrectionBackFrames = 0;
        this.mapDoorSweepFrames = 0;
        this.firstDoorCorridorSearchFrames = 0;
        this.wallUseProbeStage = Math.max(2, this.wallUseProbeStage || 2);
        this.wallUseProbeTurn = this.firstDoorProbeTurn("none");
          if (this.wallUseProbeFrames <= 0) {
            this.wallUseProbeFrames = Math.round(profileNumber(this.profile, "firstDoorRetryUseFrames", FIRST_DOOR_RETRY_USE_FRAMES));
          }
          this.strategyPriority = 3;
          this.controlPipeline = "FirstDoor";
          this.safetyReason = "first-door-guided-use-lock";
          return this.wallUseProbeAction();
        }
        const firstDoorSearchNeeded = this.firstDoorCorridorSearchFrames > 0
          || (firstDoorPeriodicSearch && this.wallUseProbeFrames <= 0)
          || (canSearchFirstDoorCorridor
            && !firstDoorProbeAllowed
            && (this.wallUseProbeFrames > 0
              || sensor.depthSig < firstDoorRushDepth
              || this.quantizedStallFrames >= 3
              || this.stuckFrames >= 8));
        if (firstDoorSearchNeeded) {
          if (this.firstDoorCorridorSearchFrames <= 0) {
            this.firstDoorCorridorSearchFrames = firstDoorCorridorSearchFrames;
            this.firstDoorCorridorSearchTurn = firstDoorBearingTurn !== "none"
              ? firstDoorBearingTurn
              : (sensor.wallVector >= 0 ? "left" : "right");
          }
          this.wallUseProbeFrames = 0;
          this.wallUseProbeStage = 0;
          this.useCooldown = Math.min(this.useCooldown, 6);
          this.firstDoorCorridorSearchFrames -= 1;
          return this.firstDoorCorridorSearchAction(
            firstDoorCorridorSearchFrames,
            firstDoorCorridorBackFrames,
            firstDoorCorridorTurnFrames);
        }
        if (this.wallUseProbeFrames > 0) {
          this.strategyPriority = 2;
          this.safetyReason = "map-first-door-probe";
          return this.wallUseProbeAction();
        }

        if (firstDoorBearingTurn !== "none" && this.predictions <= firstDoorBearingFrames && sensor.depthSig >= 0.25) {
          this.strategyPriority = 2;
          this.safetyReason = "map-first-door-bearing";
          this.mobilityMode = `map-bearing-rush-${firstDoorBearingTurn}`;
          this.mapRushCorrectionFrames = 0;
          this.mapRushCorrectionBackFrames = 0;
          this.mapDoorSweepFrames = 0;
          return normalizeAction({
            move: "forward",
            turn: firstDoorBearingTurn,
            fire: false,
            strafe: false,
            use: false,
            run: true
          });
        }

        if (sensor.depthSig >= firstDoorRushDepth && !safe.use) {
          const sidePressure = Math.abs(sensor.wallVector) >= firstDoorRushWallVectorLimit;
          const visuallyPinned = Number(sensor.qDelta || 0) <= QUANTIZED_STALL_THRESHOLD + 0.2 || this.quantizedStallFrames >= 2;
          const rushStalled = sensor.stuckTicks >= 16 || this.stuckFrames >= 20 || this.quantizedStallFrames >= 20;
          const doorSweepNeeded = sensor.stuckTicks >= 42 || this.stuckFrames >= 48 || this.quantizedStallFrames >= 48 || this.mapDoorSweepFrames > 0;
          const viewOpened = !rushStalled && (sensor.contextDict === "open-space"
            || (!visuallyPinned && !sidePressure && Number(sensor.qDelta || 0) >= mapRushOpenDelta)
            || (!visuallyPinned
              && Math.abs(sensor.wallVector) <= mapRushOpenWallVectorLimit
              && this.targetConfidence <= 0.3
              && this.regionQuantizedFrameChange >= 0.18));

          if (doorSweepNeeded && this.useCooldown === 0) {
            if (this.mapDoorSweepFrames <= 0) {
              this.mapDoorSweepFrames = mapDoorSweepFrames;
              this.mapDoorSweepTurn = firstDoorBearingTurn !== "none"
                ? firstDoorBearingTurn
                : (sensor.wallVector >= 0 ? "left" : "right");
            }
            const elapsed = mapDoorSweepFrames - this.mapDoorSweepFrames;
            const turn = elapsed < MAP_DOOR_SWEEP_BACKOFF_FRAMES + MAP_DOOR_SWEEP_TURN_FRAMES
              ? this.mapDoorSweepTurn
              : oppositeTurn(this.mapDoorSweepTurn);
            const useWindowA = elapsed >= MAP_DOOR_SWEEP_BACKOFF_FRAMES + MAP_DOOR_SWEEP_TURN_FRAMES
              && elapsed < MAP_DOOR_SWEEP_BACKOFF_FRAMES + MAP_DOOR_SWEEP_TURN_FRAMES + MAP_DOOR_SWEEP_USE_FRAMES;
            const useWindowB = elapsed >= MAP_DOOR_SWEEP_BACKOFF_FRAMES + (MAP_DOOR_SWEEP_TURN_FRAMES * 2) + MAP_DOOR_SWEEP_USE_FRAMES;
            const backingOff = elapsed < MAP_DOOR_SWEEP_BACKOFF_FRAMES;
            const turning = !backingOff && !useWindowA && !useWindowB;
            const sweepUse = !backingOff;
            this.mapDoorSweepFrames -= 1;
            if (this.mapDoorSweepFrames <= 0) {
              this.mapDoorSweepFrames = 0;
              this.mapDoorSweepTurn = oppositeTurn(this.mapDoorSweepTurn);
            }
            this.strategyPriority = 2;
            this.safetyReason = "map-door-sweep";
            this.mobilityMode = backingOff
              ? `map-door-sweep-back-${turn}`
              : (turning ? `map-door-sweep-turn-use-${turn}` : "map-door-sweep-use");
            const sweepUseRequested = sweepUse || useWindowA || useWindowB;
            if (sweepUseRequested) {
              const sweepAlignment = this.firstDoorUseAlignmentState();
              if (!sweepAlignment.ready) {
                return this.firstDoorUseAimCorrectionAction(sweepAlignment, "map-door-sweep-use-angle");
              }
            }

            return normalizeAction({
              move: backingOff ? "back" : "none",
              turn: turning || backingOff ? turn : "none",
              fire: false,
              strafe: false,
              use: sweepUseRequested,
              run: false
            });
          }

          if (viewOpened) {
            this.mapRushCorrectionFrames = 0;
            this.mapRushCorrectionBackFrames = 0;
            this.mapRushCorrectionReversals = 0;
            this.mapDoorSweepFrames = 0;
          } else {
            if (sidePressure || visuallyPinned || rushStalled) {
              if (this.mapRushCorrectionFrames <= 0) {
                this.mapRushCorrectionTurn = sensor.wallVector >= 0 ? "left" : "right";
                this.mapRushCorrectionFrames = mapRushLookoutFrames;
                this.mapRushCorrectionBackFrames = mapRushBackoffFrames;
                this.mapRushCorrectionReversals = 0;
              }
            } else {
              this.mapRushCorrectionFrames = Math.max(0, this.mapRushCorrectionFrames - 1);
              this.mapRushCorrectionBackFrames = 0;
            }
          }

          if (this.mapRushCorrectionFrames >= 3) {
            if (this.mapRushCorrectionFrames === Math.max(8, mapRushLookoutFrames - 48) && this.mapRushCorrectionReversals < 1) {
              this.mapRushCorrectionTurn = oppositeTurn(this.mapRushCorrectionTurn);
              this.mapRushCorrectionBackFrames = Math.max(3, Math.floor(mapRushBackoffFrames / 2));
              this.mapRushCorrectionReversals += 1;
            }
            const turn = this.mapRushCorrectionTurn;
            this.strategyPriority = 2;
            this.mapRushCorrectionFrames -= 1;
            if (this.mapRushCorrectionFrames <= 0) {
              this.mapRushCorrectionTurn = oppositeTurn(this.mapRushCorrectionTurn);
              this.mapRushCorrectionFrames = Math.max(24, Math.floor(mapRushLookoutFrames / 2));
              this.mapRushCorrectionBackFrames = Math.max(3, Math.floor(mapRushBackoffFrames / 2));
              this.mapRushCorrectionReversals += 1;
            }
            const backingOff = this.mapRushCorrectionBackFrames > 0;
            if (backingOff) {
              this.mapRushCorrectionBackFrames -= 1;
            }
            this.safetyReason = backingOff ? "map-rush-open-view-backoff" : "map-rush-open-view-turn";
            this.mobilityMode = `${this.safetyReason}-${turn}`;
            this.cornerExitTurn = turn;
            return normalizeAction({
              move: backingOff ? "back" : "none",
              turn,
              fire: false,
              strafe: false,
              use: false,
              run: false
            });
          }

          this.strategyPriority = 2;
          this.safetyReason = "map-first-door-rush";
          this.mobilityMode = "map-corridor-rush";
          this.mapRushCorrectionFrames = 0;
          this.mapRushCorrectionBackFrames = 0;
          this.mapRushCorrectionReversals = 0;
          this.hardStuckEscapeFrames = 0;
          this.openStallEscapeFrames = 0;
          return normalizeAction({
            move: "forward",
            turn: firstDoorBearingTurn,
            fire: false,
            strafe: false,
            use: false,
            run: true
          });
        }

        if (firstDoorProbeAllowed
          && sensor.depthSig <= Math.max(profileNumber(this.profile, "doorApproachDepth", 0.86), firstDoorRushDepth)
          && this.wallUseProbeFrames <= 0
          && this.useCooldown === 0) {
          this.wallUseProbeStage = Math.max(1, this.wallUseProbeStage || 1);
          this.wallUseProbeTurn = firstDoorBearingTurn;
          this.wallUseProbeFrames = WALL_USE_PROBE_FRAMES;
          this.strategyPriority = 2;
          this.safetyReason = "map-first-door-probe";
          return this.wallUseProbeAction();
        }
      }

      const firstDoorProbeRecovery = this.doorOpenedCount <= 0
        && this.firstDoorCorridorLocated
        && this.firstDoorUseAttempted
        && (this.firstDoorUseSignature >= firstDoorUseThreshold - firstDoorRetryTolerance || this.mapDoorSectorMatch)
        && this.useCooldown === 0;
      const firstDoorInteractionLocked = firstDoorProbeRecovery
        || (this.doorOpenedCount <= 0
          && this.firstDoorCorridorLocated
          && this.wallUseProbeFrames > 0
          && (this.firstDoorUseAttempted || this.firstDoorUseSignature >= firstDoorUseThreshold - firstDoorRetryTolerance));
      if (firstDoorInteractionLocked) {
        this.cornerExitCommitFrames = 0;
        this.hardStuckEscapeFrames = 0;
        this.openStallEscapeFrames = 0;
        this.loopEscapeFrames = 0;
        this.recoveryFrames = 0;
        this.wallDetachFrames = 0;
        this.wallSurveyFrames = 0;
        this.mapRushCorrectionFrames = 0;
        this.mapRushCorrectionBackFrames = 0;
        this.mapDoorSweepFrames = 0;
        this.firstDoorCorridorSearchFrames = 0;
        this.wallUseProbeStage = Math.max(2, this.wallUseProbeStage || 2);
        this.wallUseProbeTurn = this.firstDoorProbeTurn("none");
        if (this.wallUseProbeFrames <= 0) {
          this.wallUseProbeFrames = Math.round(profileNumber(this.profile, "firstDoorRetryUseFrames", FIRST_DOOR_RETRY_USE_FRAMES));
        }
        this.strategyPriority = 3;
        this.controlPipeline = "FirstDoor";
        this.safetyReason = firstDoorProbeRecovery ? "first-door-locked-use" : "first-door-probe-lock";
        return this.wallUseProbeAction();
      }

      const computerRoomIngressActive = this.computerRoomEntered
        && Number(this.computerRoomAdvanceFrames || 0) > 0
        && !this.finalRoomEntered
        && !this.healthLikelyDead
        && this.wallUseProbeFrames <= 0
        && !combatSafetyActive;
      if (computerRoomIngressActive) {
        this.cornerExitCommitFrames = 0;
        this.hardStuckEscapeFrames = 0;
        return this.computerRoomAdvanceAction(sensor, frame);
      }

      const computerRoomEgressContext = this.computerRoomEntered
        && !this.centralHallEntered
        && this.doorOpenedCount > 0
        && !this.healthLikelyDead
        && this.wallUseProbeFrames <= 0
        && !combatSafetyActive;
      const computerRoomEgressCue = computerRoomEgressContext
        && (sensor.contextDict === "open-space"
          || Number(sensor.depthSig || 0) >= 0.56
          || Number(this.computerRoomScore || 0) >= 0.10
          || Number(this.computerPanelScore || 0) >= 0.22
          || Number(this.bridgeBrownScore || 0) >= 0.08
          || Math.max(Number(this.bridgeGreenLeft || 0), Number(this.bridgeGreenCenter || 0), Number(this.bridgeGreenRight || 0)) >= 0.10);
      const computerRoomFalseStuck = computerRoomEgressCue
        && Number(sensor.depthSig || 0) >= 0.48
        && Number(sensor.qDelta || 0) <= QUANTIZED_STALL_THRESHOLD
        && Math.abs(Number(sensor.wallVector || 0)) <= 0.58;
      if (computerRoomFalseStuck) {
        this.cornerExitCommitFrames = 0;
        this.hardStuckEscapeFrames = 0;
        this.openStallEscapeFrames = 0;
        this.computerRoomAdvanceFrames = Math.max(this.computerRoomAdvanceFrames, 36);
        return this.computerRoomAdvanceAction(sensor, frame);
      }

      if (this.cornerExitCommitFrames > 0 && sensor.depthSig >= profileNumber(this.profile, "blockedDepth", 0.28) + 0.18) {
        if (computerRoomEgressCue && Number(sensor.depthSig || 0) >= 0.56) {
          this.cornerExitCommitFrames = 0;
          this.hardStuckEscapeFrames = 0;
          this.computerRoomAdvanceFrames = Math.max(this.computerRoomAdvanceFrames, 24);
          return this.computerRoomAdvanceAction(sensor, frame);
        }

        this.cornerExitCommitFrames -= 1;
        this.strategyPriority = 2;
        this.safetyReason = "corner-exit-commit";
        this.mobilityMode = `corner-exit-${this.cornerExitTurn}`;
        return normalizeAction({
          move: "forward",
          turn: this.cornerExitTurn,
          fire: false,
          strafe: true,
          use: false,
          run: true
        });
      }

      const hardStuckDetected = !stallSuppressedByRoute
        && sensor.stuckTicks >= STUCK_FRAMES
        && Number(sensor.qDelta || 0) <= QUANTIZED_STALL_THRESHOLD;
      if (hardStuckDetected || this.hardStuckEscapeFrames > 0) {
        if (this.hardStuckEscapeFrames <= 0) {
          this.hardStuckEscapeFrames = HARD_STUCK_ESCAPE_FRAMES;
          this.hardStuckEscapeTurn = sensor.wallVector >= 0 ? "left" : "right";
          this.cornerExitTurn = this.hardStuckEscapeTurn;
        }
        const turn = this.hardStuckEscapeTurn || (sensor.wallVector >= 0 ? "left" : "right");
        const elapsed = HARD_STUCK_ESCAPE_FRAMES - this.hardStuckEscapeFrames;
        this.hardStuckEscapeFrames -= 1;
        this.strategyPriority = 3;
        this.safetyReason = "hard-stuck-escape";
        this.mobilityMode = elapsed < HARD_STUCK_BACK_FRAMES
          ? `hard-back-${turn}`
          : elapsed < HARD_STUCK_TURN_FRAMES
            ? `hard-turn-${turn}`
            : `hard-forward-${turn}`;
        this.turnBias = turn;
        if (elapsed < HARD_STUCK_BACK_FRAMES) {
          return normalizeAction({
            move: "back",
            turn,
            fire: false,
            strafe: false,
            use: false,
            run: false
          });
        }
        if (elapsed < HARD_STUCK_TURN_FRAMES) {
          return normalizeAction({
            move: "none",
            turn,
            fire: false,
            strafe: false,
            use: false,
            run: false
          });
        }
        if (this.hardStuckEscapeFrames <= 0) {
          this.cornerExitCommitFrames = CORNER_EXIT_COMMIT_FRAMES;
          this.cornerExitTurn = turn;
        }
        return normalizeAction({
          move: "forward",
          turn,
          fire: false,
          strafe: true,
          use: false,
          run: true
        });
      }

      this.hardStuckEscapeFrames = Math.max(0, this.hardStuckEscapeFrames - 1);

      const centralRouteActive = this.computerRoomEntered
        && !this.finalRoomEntered
        && (this.controlPipeline === "ComputerRoom"
          || this.centralHallEntered
          || this.objective === "reach-central-hall"
          || this.objective === "cross-bridge"
          || this.objective === "engage-front-enemy");
      if (centralRouteActive) {
        this.openAdvanceStallFrames = 0;
        this.openStallEscapeFrames = 0;
      }
      if (this.doorOpenedCount <= 0) {
        this.openAdvanceStallFrames = 0;
        this.openStallEscapeFrames = 0;
      }
      const openAdvanceStalled = this.doorOpenedCount > 0
        && !centralRouteActive
        && !stallSuppressedByRoute
        && sensor.contextDict === "open-space"
        && safe.move === "forward"
        && safe.turn === "none"
        && !safe.fire
        && !safe.use
        && Number(sensor.qDelta || 0) <= QUANTIZED_STALL_THRESHOLD;
      if (openAdvanceStalled) {
        this.openAdvanceStallFrames += 1;
      } else {
        this.openAdvanceStallFrames = Math.max(0, this.openAdvanceStallFrames - 1);
      }
      if (this.openAdvanceStallFrames >= OPEN_ADVANCE_STALL_FRAMES || this.openStallEscapeFrames > 0) {
        if (this.targetConfidence >= COMBAT_CONFIDENCE_THRESHOLD && !this.ammoLikelyEmpty) {
          this.openStallEscapeFrames = 0;
          this.openAdvanceStallFrames = 0;
          this.strategyPriority = 2;
          this.safetyReason = "open-stall-combat";
          return normalizeAction(Object.assign({}, safe, {
            move: "none",
            fire: false,
            use: false,
            run: false
          }));
        }

        if (this.openStallEscapeFrames <= 0) {
          this.openStallEscapeFrames = OPEN_STALL_ESCAPE_FRAMES;
          this.openStallEscapeTurn = sensor.wallVector >= 0 ? "left" : "right";
          this.openAdvanceStallFrames = 0;
        }
        const turn = this.openStallEscapeTurn || oppositeTurn(this.turnBias);
        const elapsed = OPEN_STALL_ESCAPE_FRAMES - this.openStallEscapeFrames;
        this.openStallEscapeFrames -= 1;
        this.strategyPriority = 2;
        this.safetyReason = "open-stall-probe";
        this.mobilityMode = elapsed === 0
          ? "open-stall-use"
          : elapsed < OPEN_STALL_USE_HOLD_FRAMES
            ? "open-stall-use-hold"
            : elapsed < OPEN_STALL_TURN_FRAMES
              ? `open-stall-align-${turn}`
              : `open-stall-forward-${turn}`;
        this.turnBias = turn;
        if (elapsed < OPEN_STALL_USE_HOLD_FRAMES) {
          if (elapsed === 0) {
            this.useCooldown = USE_COOLDOWN_FRAMES;
          }
          return normalizeAction({
            move: "none",
            turn: "none",
            fire: false,
            strafe: false,
            use: true,
            run: false
          });
        }
        if (elapsed < OPEN_STALL_TURN_FRAMES) {
          return normalizeAction({
            move: "none",
            turn,
            fire: false,
            strafe: false,
            use: false,
            run: false
          });
        }
        return normalizeAction({
          move: "forward",
          turn: elapsed < OPEN_STALL_TURN_FRAMES + 5 ? turn : "none",
          fire: false,
          strafe: elapsed < OPEN_STALL_TURN_FRAMES + 5,
          use: false,
          run: true
        });
      }

      if (!stallSuppressedByRoute && sensor.stuckTicks >= profileNumber(this.profile, "emergencyStuckTicks", EMERGENCY_STUCK_TICKS)) {
        this.strategyPriority = 3;
        this.safetyReason = sensor.contextDict === "open-space" ? "open-stuck-break" : "sensor-emergency";
        this.loopEscapeFrames = 0;
        this.recoveryFrames = 0;
        this.repeatTurnFrames = 0;
        return this.sensorEmergencyAction(sensor, frame);
      }

      const priority = commandPriority(this.safetyReason);
      this.strategyPriority = priority;

      if (priority >= 2) {
        return this.preventUnsafeBackstep(safe, sensor, frame);
      }

      if (sensor.contextDict === "open-space" && safe.move === "back") {
        this.strategyPriority = 2;
        this.safetyReason = "open-view-forward-guard";
        return this.openAdvanceAction(frame);
      }

      if ((sensor.contextDict === "wall" || sensor.contextDict === "corridor") && safe.move === "forward" && !safe.fire && !safe.use) {
        const side = sensor.wallVector >= 0 ? "left" : "right";
        this.strategyPriority = Math.max(this.strategyPriority, 1);
        if (sensor.depthSig >= 0.78 && this.targetConfidence < 0.4 && sensor.stuckTicks < STUCK_FRAMES) {
          this.mobilityMode = "corridor-advance";
          return normalizeAction(Object.assign({}, safe, {
            move: "forward",
            turn: "none",
            strafe: false,
            use: false,
            run: true
          }));
        }

        if (sensor.stuckTicks >= STUCK_FRAMES) {
          this.mobilityMode = `sensor-wall-backoff-${side}`;
          return normalizeAction(Object.assign({}, safe, {
            move: "back",
            turn: side,
            strafe: false,
            use: sensor.contextDict === "wall" && this.useCooldown === 0,
            run: false
          }));
        }

        this.mobilityMode = `sensor-wall-away-${side}`;
        return normalizeAction(Object.assign({}, safe, {
          turn: side,
          strafe: true,
          run: true
        }));
      }

      return this.preventUnsafeBackstep(safe, sensor, frame);
    }

    sensorEmergencyAction(sensor, frame) {
      const turn = sensor.wallVector > 0 ? "left" : (sensor.wallVector < 0 ? "right" : oppositeTurn(this.turnBias));
      this.turnBias = turn;
      this.mobilityMode = sensor.contextDict === "open-space" ? "sensor-open-escape" : "sensor-wall-escape";
      if (sensor.contextDict === "open-space") {
        const cycle = this.predictions % 36;
        return normalizeAction({
          move: cycle < 12 ? "back" : "forward",
          turn,
          fire: false,
          strafe: cycle >= 12,
          use: false,
          run: cycle >= 12
        });
      }

      if (sensor.depthSig >= BACKSTEP_DEPTH_GUARD) {
        return normalizeAction({
          move: "forward",
          turn,
          fire: false,
          strafe: true,
          use: sensor.contextDict === "wall" && this.useCooldown === 0,
          run: true
        });
      }

      return normalizeAction({
        move: "none",
        turn,
        fire: false,
        strafe: true,
        use: sensor.contextDict === "wall" && this.useCooldown === 0,
        run: false
      });
    }

    preventUnsafeBackstep(action, sensor, frame) {
      const safe = normalizeAction(action);
      if (safe.move !== "back" || sensor.depthSig < BACKSTEP_DEPTH_GUARD || this.safetyReason === "wall-survey") {
        return safe;
      }

      const turn = chooseEscapeTurn(frame, this.turnBias);
      this.strategyPriority = Math.max(this.strategyPriority, 2);
      this.mobilityMode = "backstep-guard";
      this.safetyReason = this.safetyReason === "clear" ? "backstep-guard" : this.safetyReason;
      return normalizeAction(Object.assign({}, safe, {
        move: "none",
        turn,
        strafe: true,
        run: false
      }));
    }

    matchVisualSignature(quantizedSample) {
      if (!quantizedSample?.length) {
        return { kind: "none", distance: 255 };
      }

      const cornerDistance = nearestSignatureDistance(quantizedSample, this.cornerSignatureMemory);
      if (cornerDistance <= SIGNATURE_CORNER_MATCH_THRESHOLD) {
        return { kind: "corner", distance: cornerDistance };
      }

      const wallDistance = nearestSignatureDistance(quantizedSample, this.wallSignatureMemory);
      if (wallDistance <= SIGNATURE_WALL_MATCH_THRESHOLD) {
        return { kind: "wall", distance: wallDistance };
      }

      return { kind: "none", distance: Math.min(cornerDistance, wallDistance) };
    }

    learnVisualSignature(quantizedSample, flags) {
      if (!quantizedSample?.length) {
        return;
      }

      if (flags?.corner) {
        rememberSignature(this.cornerSignatureMemory, quantizedSample, SIGNATURE_CORNER_MATCH_THRESHOLD);
      } else if (flags?.wall) {
        rememberSignature(this.wallSignatureMemory, quantizedSample, SIGNATURE_WALL_MATCH_THRESHOLD);
      }
    }

    learnDepthSignature(quantizedDepth, active) {
      if (!active || !quantizedDepth?.length) {
        return;
      }

      rememberSignature(this.depthSignatureMemory, quantizedDepth, SIGNATURE_DEPTH_MATCH_THRESHOLD);
    }

    applyRepeatTurnBreaker(action, targetConfidence) {
      if (this.repeatTurnFrames > 0) {
        this.repeatTurnFrames -= 1;
        this.safetyReason = "repeat-turn";
        return this.repeatTurnAction();
      }

      const safe = normalizeAction(action);
      const signature = actionSignature(safe);
      const canBreak = safe.move !== "none" && !safe.fire && !safe.use && targetConfidence < TARGET_LOCK_CONFIDENCE;
      if (canBreak && signature === this.repeatActionSignature) {
        this.repeatActionFrames += 1;
      } else {
        this.repeatActionSignature = signature;
        this.repeatActionFrames = canBreak ? 1 : 0;
      }

      if (canBreak && this.repeatActionFrames >= REPEAT_ACTION_THRESHOLD) {
        this.repeatTurnDirection = oppositeTurn(safe.turn || this.turnBias);
        this.repeatTurnFrames = REPEAT_TURN_FRAMES;
        this.repeatActionFrames = 0;
        this.repeatActionSignature = "";
        this.safetyReason = "repeat-turn";
        return this.repeatTurnAction();
      }

      return safe;
    }

    repeatTurnAction() {
      this.mobilityMode = "repeat-turn";
      return normalizeAction({
        move: "forward",
        turn: this.repeatTurnDirection,
        fire: false,
        strafe: true,
        use: false,
        run: true
      });
    }

    semanticObjectiveAction(sensor, frame, options = {}) {
      if (!this.enabled) {
        return null;
      }

      const objective = this.objective || inferObjective(this);
      const routeLockFrames = Math.max(180, Math.round(profileNumber(this.profile, "semanticRouteLockFrames", 660)));
      const corridorThreshold = profileNumber(this.profile, "semanticCorridorConfidenceThreshold", 0.62);
      const doorApproachDepth = Number(options.doorApproachDepth ?? profileNumber(this.profile, "firstDoorApproachDepth", profileNumber(this.profile, "doorApproachDepth", 0.86)));
      const depth = Number(sensor?.depthSig ?? this.depthEstimate ?? 1);
      const corridorConfidence = Number(this.semanticMemory?.firstDoor?.corridorConfidence || 0);
      const doorConfidence = Number(this.semanticMemory?.firstDoor?.doorConfidence || 0);
      const firstDoorUseThreshold = profileNumber(this.profile, "firstDoorUseSignatureThreshold", FIRST_DOOR_USE_SIGNATURE_THRESHOLD);
      const firstDoorRetryTolerance = profileNumber(this.profile, "firstDoorRetrySignatureTolerance", FIRST_DOOR_RETRY_SIGNATURE_TOLERANCE);

      if (this.centralHallEntered && Number(this.enemyDefeatedCount || 0) <= 0 && !this.ammoLikelyEmpty) {
        this.exitSwitchPressed = false;
        this.exitSwitchUseFrames = 0;
        this.finalRoomEntered = false;
        this.finalRoomCandidateFrames = 0;
        if (objective === "press-exit-switch"
          || objective === "level-clear"
          || objective === "reach-final-room"
          || objective === "cross-bridge") {
          this.strategyPriority = 3;
          this.strategyContext = "central-hall-combat";
          this.controlPipeline = "ComputerRoom";
          this.safetyReason = "central-hall-front-enemy-hold";
          return null;
        }
      }

      if (objective === "press-exit-switch" && this.finalRoomEntered) {
        this.strategyPriority = 3;
        this.strategyContext = "semantic-final-objective";
        this.controlPipeline = "ExitRoom";
        this.safetyReason = "semantic-exit-switch";
        return this.exitSwitchAction(sensor);
      }

      if (objective === "cross-bridge" && options.bridgeLaneVisible) {
        this.strategyPriority = 3;
        this.strategyContext = "semantic-bridge-objective";
        this.controlPipeline = "Bridge";
        if (this.motionTurnScore >= profileNumber(this.profile, "motionTurnSweepThreshold", MOTION_TURN_SWEEP_THRESHOLD)) {
          this.safetyReason = "semantic-bridge-straighten";
          this.mobilityMode = "bridge-straighten-forward";
          return normalizeAction({
            move: "forward",
            turn: "none",
            fire: false,
            strafe: false,
            use: false,
            run: true
          });
        }

        return this.bridgeLaneGuardAction();
      }

      if ((objective === "open-first-door" || objective === "align-first-door" || objective === "approach-first-door" || objective === "find-and-open-first-door") && this.doorOpenedCount <= 0 && this.firstDoorCorridorLocated) {
        this.cornerExitCommitFrames = 0;
        this.hardStuckEscapeFrames = 0;
        this.openStallEscapeFrames = 0;
        this.loopEscapeFrames = 0;
        this.recoveryFrames = 0;
        this.wallDetachFrames = 0;
        this.wallSurveyFrames = 0;
        this.mapRushCorrectionFrames = 0;
        this.mapRushCorrectionBackFrames = 0;
        this.mapDoorSweepFrames = 0;
        this.firstDoorCorridorSearchFrames = 0;
        this.strategyPriority = 3;
        this.strategyContext = "semantic-first-door";
        this.controlPipeline = "FirstDoor";
        this.safetyReason = "semantic-first-door-probe";

        const firstDoorRetryReady = this.firstDoorUseAttempted
          || this.firstDoorUseSignature >= firstDoorUseThreshold - firstDoorRetryTolerance
          || this.wallUseProbeStage >= 2;
        const firstDoorSensorStall = this.movementSensorSnapshot?.eventType === "movement-stall"
          && Number(this.movementSensorSnapshot?.confidence || 0) >= 0.55
          && Boolean(this.phainomenon?.sensorRecovery?.needed || this.phainomenon?.stuck?.active || sensor.stuckTicks >= 1);
        const firstDoorPatch = this.firstDoorVision9x9Box || null;
        const firstDoorUseAlignment = this.firstDoorUseAlignmentState(firstDoorPatch);
        const firstDoorPatchScore = Number(firstDoorPatch?.score || this.firstDoorVision9x9Score || 0);
        const firstDoorEdgeOnlyCandidate = firstDoorUseAlignment.reason === "first-door-9x9-patch"
          && !firstDoorUseAlignment.visualEvidenceReady
          && !firstDoorUseAlignment.centered3x3
          && !firstDoorUseAlignment.doorPatchKind
          && Number(firstDoorUseAlignment.redScore || 0) < FIRST_DOOR_RED_ACCENT_THRESHOLD;
        const firstDoorWallOnlyCandidate = (firstDoorUseAlignment.reason === "first-door-wall-pattern"
            && !firstDoorUseAlignment.visualEvidenceReady
            && !firstDoorUseAlignment.centered3x3
            && !firstDoorUseAlignment.doorPatchKind
            && Number(this.firstDoorUse3x3Score || 0) < 0.18
            && (firstDoorPatchScore < 0.52 || Number(firstDoorUseAlignment.redScore || 0) < 0.26))
          || firstDoorEdgeOnlyCandidate;
        if (firstDoorWallOnlyCandidate) {
          this.firstDoorWallOnlyCandidateFrames = Math.min(MAX_STUCK_COUNTER, Number(this.firstDoorWallOnlyCandidateFrames || 0) + 1);
        } else {
          this.firstDoorWallOnlyCandidateFrames = Math.max(0, Number(this.firstDoorWallOnlyCandidateFrames || 0) - 1);
        }
        const firstDoorWallOnlyPersistent = Number(this.firstDoorWallOnlyCandidateFrames || 0) >= 3
          || Number(this.depthEstimate || 1) <= 0.18;
        const firstDoorCloseCorridorWall = this.firstDoorCorridorLocated
          && depth <= profileNumber(this.profile, "firstDoorApproachDepth", FIRST_DOOR_APPROACH_DEPTH)
          && this.firstDoorCorridorSignature >= firstDoorUseThreshold - firstDoorRetryTolerance;
        const firstDoorStrongCorridorWall = this.firstDoorCorridorLocated
          && this.firstDoorCorridorSignature >= firstDoorUseThreshold + 0.08;
        if (!firstDoorRetryReady && firstDoorWallOnlyCandidate && firstDoorWallOnlyPersistent && depth <= 0.22) {
          const resetTurn = this.spawnCorridorGapTurn === "left" || this.spawnCorridorGapTurn === "right"
            ? this.spawnCorridorGapTurn
            : oppositeTurn(this.turnBias);
          return this.resetFirstDoorSemanticLock("first-door-wall-contact-reset", resetTurn);
        }
        if (!firstDoorRetryReady && firstDoorWallOnlyCandidate && firstDoorWallOnlyPersistent && firstDoorCloseCorridorWall) {
          this.wallUseProbeStage = Math.max(2, this.wallUseProbeStage || 2);
          this.wallUseProbeTurn = this.firstDoorProbeTurn("none");
          this.wallUseProbeFrames = Math.round(profileNumber(this.profile, "firstDoorRetryUseFrames", FIRST_DOOR_RETRY_USE_FRAMES));
          this.useCooldown = 0;
          this.strategyPriority = 3;
          this.safetyReason = "semantic-first-door-close-wall-probe";
          this.mobilityMode = "semantic-door-close-wall-probe";
          return this.wallUseProbeAction();
        }
        if (!firstDoorRetryReady && firstDoorWallOnlyCandidate && firstDoorWallOnlyPersistent && !firstDoorStrongCorridorWall) {
          const resetTurn = this.spawnCorridorGapTurn === "left" || this.spawnCorridorGapTurn === "right"
            ? this.spawnCorridorGapTurn
            : oppositeTurn(this.turnBias);
          return this.resetFirstDoorSemanticLock("first-door-wall-only-reset", resetTurn);
        }
        const firstDoorNearDarkPanelReady = firstDoorUseAlignment.ready
          && firstDoorPatch?.kind === "first-door-dark-panel"
          && firstDoorPatchScore >= 0.32
          && this.firstDoorUse3x3Turn === "none"
          && Number(this.firstDoorUse3x3Score || 0) >= FIRST_DOOR_DARK_PANEL_USE_ALIGNMENT_SCORE
          && depth <= profileNumber(this.profile, "firstDoorUseDepth", FIRST_DOOR_USE_DEPTH) + 0.08;
        const firstDoorPatchUseReady = firstDoorUseAlignment.ready
          && (this.firstDoorVision9x9Score >= 0.54 || firstDoorNearDarkPanelReady)
          && this.firstDoorCorridorSignature >= firstDoorUseThreshold - firstDoorRetryTolerance
          && this.useCooldown === 0;
        const firstDoorPatchNeedsAim = firstDoorPatch
          && !firstDoorPatchUseReady
          && firstDoorUseAlignment.doorPatchKind
          && this.firstDoorVision9x9Score >= 0.5
          && this.wallUseProbeFrames <= 0
          && !this.firstDoorUseAttempted;
        const firstDoorUseFailedByAudio = this.firstDoorUseAttempted
          && this.auditorySnapshot?.eventType === "use-failed-voice";
        const firstDoor3x3Turn = this.firstDoorUse3x3Turn === "left" || this.firstDoorUse3x3Turn === "right"
          ? this.firstDoorUse3x3Turn
          : (firstDoorUseAlignment.turn === "left" || firstDoorUseAlignment.turn === "right" ? firstDoorUseAlignment.turn : "none");
        const firstDoor3x3RecenterNeeded = !this.firstDoorUseAttempted
          && this.wallUseProbeFrames <= 0
          && firstDoor3x3Turn !== "none"
          && this.firstDoorCorridorLocated
          && this.firstDoorCorridorSignature >= firstDoorUseThreshold - firstDoorRetryTolerance
          && depth <= 0.86
          && Number(this.firstDoorUse3x3Score || 0) < FIRST_DOOR_USE_ALIGNMENT_SCORE
          && firstDoorUseAlignment.visualEvidenceReady
          && (firstDoorUseAlignment.patchUseAngle || Number(this.firstDoorVision9x9Score || 0) >= 0.32);
        const firstDoorPreUseStall = !this.firstDoorUseAttempted
          && firstDoorSensorStall
          && !firstDoorPatchUseReady
          && (this.wallUseProbeFrames > 0
            || this.quantizedStallFrames >= 8
            || (Number(this.motionStallScore || 0) >= 0.9 && this.inputStallFrames >= 3));
        const firstDoorCloseContactUse = !this.firstDoorUseAttempted
          && this.useCooldown === 0
          && this.firstDoorUseLatchFrames <= 0
          && this.firstDoorCorridorLocated
          && this.firstDoorCorridorSignature >= firstDoorUseThreshold - firstDoorRetryTolerance
          && depth <= 0.32
          && (firstDoorUseAlignment.ready || firstDoorNearDarkPanelReady)
          && (Number(this.stuckFrames || 0) >= 42
            || Number(this.inputStallFrames || 0) >= 8
            || Number(this.motionStallScore || 0) >= 0.82);
        const firstDoorContactUseFallback = !this.firstDoorUseAttempted
          && this.useCooldown === 0
          && this.firstDoorUseLatchFrames <= 0
          && this.wallUseProbeFrames <= 0
          && this.firstDoorCorridorLocated
          && this.firstDoorCorridorSignature >= firstDoorUseThreshold - firstDoorRetryTolerance
          && depth <= 0.34
          && firstDoor3x3Turn === "none"
          && firstDoorUseAlignment.reason !== "first-door-wall-pattern"
          && firstDoorUseAlignment.reason !== "first-door-floor-red"
          && (firstDoorUseAlignment.ready
            || firstDoorNearDarkPanelReady
            || (firstDoorUseAlignment.patchUseAngle
              && firstDoorUseAlignment.visualEvidenceReady
              && Number(this.firstDoorUse3x3Score || 0) >= 0.30)
            || (firstDoorUseAlignment.patchUseAngle
              && Number(this.firstDoorVision9x9Score || 0) >= 0.54));

        if (firstDoorUseFailedByAudio) {
          const reprobeFrames = profileNumber(this.profile, "firstDoorReprobeFrames", 36);
          const candidateTurn = firstDoor3x3Turn === "left" || firstDoor3x3Turn === "right"
            ? firstDoor3x3Turn
            : (firstDoorUseAlignment.turn === "left" || firstDoorUseAlignment.turn === "right"
              ? firstDoorUseAlignment.turn
              : "none");
          const weakFailedCandidate = (firstDoorUseAlignment.reason === "first-door-wall-pattern"
              || firstDoorUseAlignment.reason === "first-door-floor-red")
            && !firstDoorUseAlignment.visualEvidenceReady
            && !firstDoorUseAlignment.centered3x3;
          const failedTurn = weakFailedCandidate
            ? (Number.isFinite(firstDoorUseAlignment.column)
              ? (firstDoorUseAlignment.column < 4 ? "right" : "left")
              : (this.wallUseProbeTurn === "left" || this.wallUseProbeTurn === "right"
                ? oppositeTurn(this.wallUseProbeTurn)
                : oppositeTurn(this.turnBias)))
            : (candidateTurn !== "none"
              ? candidateTurn
              : (this.wallUseProbeTurn === "left" || this.wallUseProbeTurn === "right"
                ? this.wallUseProbeTurn
                : this.turnBias));
          const keepFirstDoorAfterAudioFailure = this.firstDoorCorridorLocated
            && this.firstDoorCorridorSignature >= firstDoorUseThreshold - firstDoorRetryTolerance;
          if (this.firstDoorLockedUseCycles >= 4 && !keepFirstDoorAfterAudioFailure) {
            return this.resetFirstDoorSemanticLock("first-door-audio-lock-reset", failedTurn);
          }

          this.firstDoorUseAttempted = false;
          this.firstDoorUseSignature = 0;
          this.firstDoorUseLatchFrames = 0;
          this.firstDoorUsePulsed = false;
          this.startFirstDoorReprobe(reprobeFrames, failedTurn);
          this.strategyPriority = 3;
          this.safetyReason = "first-door-audio-reprobe";
          return this.firstDoorReprobeAction(reprobeFrames);
        }

        if (firstDoorContactUseFallback) {
          this.firstDoorUseLatchFrames = Math.round(profileNumber(this.profile, "firstDoorUseLatchFrames", FIRST_DOOR_USE_LATCH_FRAMES));
          this.firstDoorUsePulsed = true;
          this.firstDoorUseAttempted = true;
          this.firstDoorUseSignature = Math.max(this.firstDoorCorridorSignature, this.firstDoorVision9x9Score);
          this.strategyPriority = 3;
          this.strategyContext = "semantic-first-door";
          this.controlPipeline = "FirstDoor";
          this.safetyReason = `first-door-contact-use-${firstDoorUseAlignment.reason || "corridor"}`;
          this.mobilityMode = "semantic-door-contact-use";
          return normalizeAction({
            move: "none",
            turn: "none",
            fire: false,
            strafe: false,
            use: true,
            run: false
          });
        }

        if (firstDoor3x3RecenterNeeded) {
          this.strategyPriority = 3;
          this.strategyContext = "semantic-first-door";
          this.controlPipeline = "FirstDoor";
          this.safetyReason = "first-door-3x3-recenter";
          this.mobilityMode = `semantic-door-3x3-recenter-${firstDoor3x3Turn}`;
          return normalizeAction({
            move: depth > 0.46 ? "forward" : "none",
            turn: firstDoor3x3Turn,
            fire: false,
            strafe: false,
            use: false,
            run: false
          });
        }

        if (this.firstDoorUseLatchFrames > 0 && this.firstDoorUseAttempted) {
          return this.firstDoorUseLatchAdvanceAction();
        }

        if (firstDoorCloseContactUse) {
          this.firstDoorUseLatchFrames = Math.round(profileNumber(this.profile, "firstDoorUseLatchFrames", FIRST_DOOR_USE_LATCH_FRAMES));
          this.firstDoorUsePulsed = true;
          this.firstDoorUseAttempted = true;
          this.firstDoorUseSignature = Math.max(this.firstDoorCorridorSignature, this.firstDoorVision9x9Score);
          this.strategyPriority = 3;
          this.strategyContext = "semantic-first-door";
          this.controlPipeline = "FirstDoor";
          this.safetyReason = `first-door-close-contact-use-${firstDoorUseAlignment.reason}`;
          this.mobilityMode = "semantic-door-close-contact-use";
          return normalizeAction({
            move: "none",
            turn: "none",
            fire: false,
            strafe: false,
            use: true,
            run: false
          });
        }

        if (!firstDoorRetryReady && firstDoorPatchUseReady && this.wallUseProbeFrames <= 0) {
          this.wallUseProbeStage = Math.max(2, this.wallUseProbeStage || 2);
          this.wallUseProbeTurn = this.firstDoorProbeTurn("none");
          this.wallUseProbeFrames = Math.round(profileNumber(this.profile, "firstDoorRetryUseFrames", FIRST_DOOR_RETRY_USE_FRAMES));
          this.strategyPriority = 3;
          this.safetyReason = "semantic-first-door-9x9-use-probe";
          this.mobilityMode = "semantic-door-9x9-probe";
          return this.wallUseProbeAction();
        }

        if (firstDoorPatchNeedsAim) {
          return this.firstDoorUseAimCorrectionAction(firstDoorUseAlignment, "semantic-first-door-3x3-aim");
        }

        const firstDoorWeakDistantProbe = this.wallUseProbeFrames > 0
          && this.wallUseProbeStage >= 2
          && !this.firstDoorUseAttempted
          && !firstDoorUseAlignment.ready
          && !firstDoorUseAlignment.doorPatchKind
          && depth >= 0.90
          && Number(this.firstDoorUse3x3Score || 0) < 0.22
          && firstDoorPatchScore < 0.54;
        if (firstDoorWeakDistantProbe) {
          const reprobeTurn = this.spawnCorridorGapTurn === "left" || this.spawnCorridorGapTurn === "right"
            ? this.spawnCorridorGapTurn
            : (this.wallUseProbeTurn === "left" || this.wallUseProbeTurn === "right"
              ? oppositeTurn(this.wallUseProbeTurn)
              : oppositeTurn(this.turnBias));
          const reprobeFrames = Math.max(30, Math.round(profileNumber(this.profile, "firstDoorReprobeFrames", 36)));
          this.startFirstDoorReprobe(reprobeFrames, reprobeTurn);
          this.strategyPriority = 3;
          this.strategyContext = "semantic-first-door";
          this.controlPipeline = "FirstDoor";
          this.safetyReason = "first-door-weak-distant-probe-reprobe";
          return this.firstDoorReprobeAction(reprobeFrames);
        }

        if (this.wallUseProbeFrames > 0) {
          return this.wallUseProbeAction();
        }

        if (firstDoorPreUseStall) {
          const searchFrames = Math.max(36, Math.round(profileNumber(this.profile, "firstDoorCorridorSearchFrames", FIRST_DOOR_CORRIDOR_SEARCH_FRAMES)));
          const backFrames = Math.max(0, Math.round(profileNumber(this.profile, "firstDoorCorridorBackFrames", FIRST_DOOR_CORRIDOR_BACK_FRAMES)));
          const turnFrames = Math.max(8, Math.round(profileNumber(this.profile, "firstDoorCorridorTurnFrames", FIRST_DOOR_CORRIDOR_TURN_FRAMES)));
          const fallbackTurn = this.spawnCorridorGapTurn !== "none"
            ? this.spawnCorridorGapTurn
            : (sensor.wallVector >= 0 ? "left" : "right");
          this.wallUseProbeFrames = 0;
          this.wallUseProbeStage = 0;
          this.firstDoorCorridorSearchFrames = searchFrames;
          this.firstDoorCorridorSearchTurn = this.firstDoorProbeTurn(fallbackTurn);
          this.strategyPriority = 3;
          this.safetyReason = "semantic-first-door-pre-use-realign";
          return this.firstDoorCorridorSearchAction(searchFrames, backFrames, turnFrames);
        }

        if (!firstDoorRetryReady
          && firstDoorSensorStall
          && (doorConfidence >= 0.12 || this.firstDoorCorridorSignature >= firstDoorUseThreshold - firstDoorRetryTolerance)) {
          this.wallUseProbeStage = Math.max(2, this.wallUseProbeStage || 2);
          this.wallUseProbeTurn = this.firstDoorProbeTurn("none");
          this.wallUseProbeFrames = Math.round(profileNumber(this.profile, "firstDoorRetryUseFrames", FIRST_DOOR_RETRY_USE_FRAMES));
          this.strategyPriority = 3;
          this.safetyReason = "semantic-first-door-stall-probe";
          this.mobilityMode = "semantic-door-stall-probe";
          return this.wallUseProbeAction();
        }

        if (!firstDoorRetryReady && depth > doorApproachDepth && doorConfidence < 0.68 && !this.mapDoorSectorMatch) {
          this.mobilityMode = "semantic-door-approach";
          return normalizeAction({
            move: "forward",
            turn: this.spawnCorridorGapTurn !== "none" ? this.spawnCorridorGapTurn : "none",
            fire: false,
            strafe: false,
            use: false,
            run: false
          });
        }

        const fallbackAlignment = this.firstDoorUseAlignmentState(firstDoorPatch);
        if (!fallbackAlignment.ready
          && fallbackAlignment.doorPatchKind
          && (this.firstDoorVision9x9Score >= 0.42
            || Number(firstDoorPatch?.redScore || 0) >= FIRST_DOOR_RED_ACCENT_THRESHOLD
            || Number(this.firstDoorUse3x3Score || 0) >= 0.22)) {
          return this.firstDoorUseAimCorrectionAction(fallbackAlignment, "semantic-first-door-use-angle");
        }

        this.wallUseProbeStage = Math.max(2, this.wallUseProbeStage || 2);
        this.wallUseProbeTurn = doorConfidence >= 0.48 || this.firstDoorUseAttempted ? this.firstDoorProbeTurn("none") : (
          this.spawnCorridorGapTurn !== "none"
            ? this.spawnCorridorGapTurn
            : (this.wallUseProbeTurn === "left" || this.wallUseProbeTurn === "right" ? this.wallUseProbeTurn : "none"));
        this.wallUseProbeFrames = Math.round(profileNumber(this.profile, "firstDoorRetryUseFrames", FIRST_DOOR_RETRY_USE_FRAMES));
        return this.wallUseProbeAction();
      }

      if ((objective === "find-corridor-to-first-door" || objective === "follow-demo-route-to-first-door" || objective === "recover-via-east-window" || objective === "locate-first-door-corridor" || objective === "enter-first-door-corridor" || objective === "reach-first-door" || objective === "find-and-open-first-door")
        && this.doorOpenedCount <= 0
        && !this.firstDoorCorridorLocated
        && this.predictions <= routeLockFrames) {
        this.wallUseProbeFrames = 0;
        this.wallUseProbeStage = 0;
        this.hardStuckEscapeFrames = 0;
        this.openStallEscapeFrames = 0;
        this.loopEscapeFrames = 0;
        this.recoveryFrames = 0;
        this.repeatTurnFrames = 0;
        this.enemyAlertFrames = 0;
        this.enemyConfidencePeak = 0;
        this.combatFireFrames = 0;
        this.strategyPriority = 3;
        this.strategyContext = "semantic-opening-route";
        this.controlPipeline = "OpeningHome";
        this.safetyReason = "semantic-route-lock";

        const routeCourtyardSuppressed = Number(this.firstDoorCorridorSuppressFrames || 0) > 0;
        if (this.courtyardRescueFrames > 0
          || (this.predictions >= Number(options.firstDoorSpawnScanFrames ?? FIRST_DOOR_SPAWN_SCAN_FRAMES)
            && !routeCourtyardSuppressed
            && this.courtyardScore >= Math.max(0.22, profileNumber(this.profile, "courtyardRescueThreshold", COURTYARD_RESCUE_THRESHOLD) - 0.06))) {
          if (this.courtyardRescueFrames <= 0) {
            this.courtyardRescueFrames = Number(options.courtyardRescueFrames ?? COURTYARD_RESCUE_FRAMES);
            this.courtyardRescueTurnFrames = Number(options.courtyardRescueTurnFrames ?? COURTYARD_RESCUE_TURN_FRAMES);
            this.configureCourtyardRescue();
          }

          return this.courtyardRescueAction(
            Number(options.courtyardRescueFrames ?? COURTYARD_RESCUE_FRAMES),
            Number(options.courtyardRescueBackFrames ?? COURTYARD_RESCUE_BACK_FRAMES));
        }

        const routeGapSuppressed = Number(this.firstDoorCorridorSuppressFrames || 0) > 0;
        if (!routeGapSuppressed
          && (this.spawnCorridorGapFrames > 0
          || corridorConfidence >= corridorThreshold
          || this.spawnCorridorGapScore >= Math.max(0.18, Number(options.spawnCorridorGapThreshold ?? SPAWN_CORRIDOR_GAP_THRESHOLD) - 0.06))) {
          if (this.spawnCorridorGapFrames <= 0) {
            this.spawnCorridorGapFrames = Number(options.spawnCorridorGapFrames ?? SPAWN_CORRIDOR_GAP_FRAMES);
            this.spawnCorridorGapAlignFrames = Number(options.spawnCorridorGapAlignFrames ?? SPAWN_CORRIDOR_GAP_ALIGN_FRAMES);
          }

          return this.spawnCorridorGapAction(Number(options.spawnCorridorGapFrames ?? SPAWN_CORRIDOR_GAP_FRAMES));
        }

        return this.openingRouteLockAction(
          Number(options.firstDoorSpawnScanFrames ?? FIRST_DOOR_SPAWN_SCAN_FRAMES),
          Number(options.firstDoorWallRunFrames ?? FIRST_DOOR_RIGHT_WALL_RUN_FRAMES),
          Number(options.firstDoorOpeningLockFrames ?? FIRST_DOOR_OPENING_LOCK_FRAMES),
          sensor);
      }

      return null;
    }

    spawnCorridorGapAction(totalFrames) {
      const elapsed = Math.max(0, totalFrames - this.spawnCorridorGapFrames);
      const alignFrames = Math.max(1, this.spawnCorridorGapAlignFrames || SPAWN_CORRIDOR_GAP_ALIGN_FRAMES);
      const turn = this.spawnCorridorGapTurn !== "none" ? this.spawnCorridorGapTurn : "right";
      this.spawnCorridorGapFrames = Math.max(0, this.spawnCorridorGapFrames - 1);
      this.strategyPriority = 2;
      this.safetyReason = "spawn-corridor-gap";
      const depth = Number(this.depthEstimate || 1);
      const stalledForward = Number(this.motionStallScore || 0) >= 0.9
        && Number(this.inputStallFrames || 0) >= 6
        && elapsed >= alignFrames + 8;
      const commitBlocked = elapsed >= alignFrames
        && (depth <= 0.22 || stalledForward);
      if (commitBlocked) {
        this.mobilityMode = `spawn-gap-blocked-realign-${turn}`;
        return normalizeAction({
          move: depth <= 0.12 ? "back" : (depth <= 0.22 ? "none" : "forward"),
          turn,
          fire: false,
          strafe: false,
          use: false,
          run: depth > 0.22
        });
      }

      this.mobilityMode = elapsed < alignFrames
        ? `spawn-gap-align-${turn}`
        : "spawn-gap-commit-forward";
      return normalizeAction({
        move: elapsed < alignFrames ? "none" : "forward",
        turn: elapsed < alignFrames ? turn : "none",
        fire: false,
        strafe: false,
        use: false,
        run: elapsed >= alignFrames
      });
    }

    bridgeLaneGuardAction() {
      const laneTurn = this.bridgeLaneTurn !== "none"
        ? this.bridgeLaneTurn
        : (this.bridgeGreenLeft > this.bridgeGreenRight + 0.05 ? "right" : (this.bridgeGreenRight > this.bridgeGreenLeft + 0.05 ? "left" : "none"));
      const edgeHazard = Math.max(this.bridgeGreenLeft, this.bridgeGreenRight);
      const shouldStrafe = this.bridgeGreenCenter >= BRIDGE_GREEN_HAZARD_THRESHOLD
        || edgeHazard >= BRIDGE_GREEN_HAZARD_THRESHOLD + 0.08;
      this.strategyPriority = 2;
      this.safetyReason = "bridge-lane-guard";
      this.mobilityMode = laneTurn === "none" ? "bridge-keep-brown" : `bridge-avoid-green-${laneTurn}`;
      return normalizeAction({
        move: "forward",
        turn: laneTurn,
        fire: false,
        strafe: shouldStrafe,
        use: false,
        run: false
      });
    }

    computerRoomAdvanceAction(sensor, frame) {
      const wallVector = Number(sensor?.wallVector || 0);
      const openLaneStall = this.computerRoomEntered
        && !this.centralHallEntered
        && Number(sensor?.depthSig ?? this.depthEstimate ?? 1) >= 0.74
        && (Number(this.quantizedStallFrames || 0) >= 18
          || Number(this.stuckFrames || 0) >= 18
          || Number(this.motionStallScore || 0) >= 0.82);
      const openLaneSurvey = openLaneStall
        && (Number(this.quantizedStallFrames || 0) >= 36
          || Number(this.inputStallFrames || 0) >= 12
          || Number(this.stuckFrames || 0) >= 36);
      const openLaneSurveyTurn = openLaneSurvey
        ? ((Math.floor(Number(this.predictions || 0) / 18) % 2) === 0 ? "right" : "left")
        : "none";
      const bridgeCueStrong = Number(this.bridgeBrownScore || 0) >= 0.24
        || Number(this.bridgeDoorScore || 0) >= 0.22
        || Math.max(Number(this.bridgeGreenLeft || 0), Number(this.bridgeGreenCenter || 0), Number(this.bridgeGreenRight || 0)) >= 0.40;
      const bridgeCueTurn = !openLaneStall
        && bridgeCueStrong
        && (this.bridgeLaneTurn === "left" || this.bridgeLaneTurn === "right")
        ? this.bridgeLaneTurn
        : "none";
      const turn = openLaneSurvey
        ? openLaneSurveyTurn
        : (openLaneStall
        ? "none"
        : (bridgeCueTurn !== "none"
        ? bridgeCueTurn
        : (Math.abs(wallVector) >= 0.26
          ? (wallVector > 0 ? "left" : "right")
          : (this.targetConfidence >= 0.28 ? targetTurnDirection(frame) : "none"))));
      const sidePressure = !openLaneStall && Math.abs(wallVector) >= 0.34;
      this.computerRoomAdvanceFrames = Math.max(0, this.computerRoomAdvanceFrames - 1);
      this.strategyPriority = 2;
      this.strategyContext = "computer-room";
      this.controlPipeline = "ComputerRoom";
      this.safetyReason = "computer-room-advance";
      this.mobilityMode = openLaneSurvey
        ? `computer-room-open-lane-survey-${turn}`
        : (openLaneStall ? "computer-room-open-lane-forward" : (turn === "none" ? "computer-room-centerline" : `computer-room-trim-${turn}`));
      return normalizeAction({
        move: "forward",
        turn,
        fire: false,
        strafe: sidePressure,
        use: false,
        run: true
      });
    }

    exitSwitchAction(sensor) {
      const frames = Math.max(0, this.exitSwitchUseFrames || 0);
      const depth = Number(sensor?.depthSig ?? this.depthEstimate ?? 1);
      const closeEnough = depth <= profileNumber(this.profile, "doorApproachDepth", 0.86)
        || this.stuckFrames >= 8
        || this.quantizedStallFrames >= 8;
      const usePulse = closeEnough && ((frames % 12) < 6);
      this.exitSwitchUseFrames = Math.max(0, frames - 1);
      if (usePulse) {
        this.exitSwitchPressed = true;
      }

      this.cornerExitCommitFrames = 0;
      this.hardStuckEscapeFrames = 0;
      this.openStallEscapeFrames = 0;
      this.loopEscapeFrames = 0;
      this.recoveryFrames = 0;
      this.wallDetachFrames = 0;
      this.wallSurveyFrames = 0;
      this.mapRushCorrectionFrames = 0;
      this.mapRushCorrectionBackFrames = 0;
      this.mapDoorSweepFrames = 0;
      this.strategyPriority = 3;
      this.strategyContext = "exit-room";
      this.controlPipeline = "ExitRoom";
      this.safetyReason = "exit-switch-use";
      this.mobilityMode = usePulse ? "exit-switch-use" : "exit-switch-approach";
      return normalizeAction({
        move: usePulse ? "none" : "forward",
        turn: "none",
        fire: false,
        strafe: false,
        use: usePulse,
        run: !usePulse
      });
    }

    openingForwardLockAction(totalFrames) {
      this.strategyPriority = 3;
      this.strategyContext = "spawn-home";
      this.controlPipeline = "OpeningHome";
      this.safetyReason = "opening-forward-lock";
      this.mobilityMode = "opening-map-straight-center";
      this.wallUseProbeFrames = 0;
      this.wallUseProbeStage = 0;
      this.spawnCorridorGapFrames = 0;
      this.courtyardRescueFrames = 0;
      return normalizeAction({
        move: "forward",
        turn: "none",
        fire: false,
        strafe: false,
        use: false,
        run: true
      });
    }

    openingSpawnLandmarkAnchorAction(kind, turn) {
      const safeKind = kind === "west-stair" ? "west-stair" : "secret-door";
      const safeTurn = turn === "right" ? "right" : "left";
      this.strategyPriority = 3;
      this.strategyContext = "spawn-home-landmark";
      this.controlPipeline = "OpeningHome";
      this.safetyReason = `opening-${safeKind}-anchor`;
      this.mobilityMode = `opening-${safeKind}-anchor-${safeTurn}`;
      this.wallUseProbeFrames = 0;
      this.wallUseProbeStage = 0;
      this.spawnCorridorGapFrames = 0;
      this.courtyardRescueFrames = 0;
      return normalizeAction({
        move: "none",
        turn: safeTurn,
        fire: false,
        strafe: false,
        use: false,
        run: false
      });
    }

    openingMapRouteAction(sensor, scanFrames, wallRunFrames, lockFrames) {
      const frame = Math.max(0, Number(this.predictions || 0));
      const wallVector = Number(sensor?.wallVector || 0);
      const depth = Number(sensor?.depthSig ?? this.depthEstimate ?? 1);
      const obstacle = Math.max(
        Number(this.motionObstacleScore || 0),
        Number(this.footObstacleScore || 0),
        Number(this.footObstacleFlickerScore || 0),
        Number(this.priorFootObstacleScore || 0));
      const routeFrame = Math.max(0, frame - Math.max(0, scanFrames));
      const footBounceBlocked = Number(this.footObstacleBounceFrames || 0) >= 3;
      const obstacleBlocked = depth <= 0.24 || obstacle >= 0.46 || footBounceBlocked || Number(this.inputStallFrames || 0) >= 4;
      const sidePressure = Math.abs(wallVector) >= 0.24;
      const awayTurn = sidePressure
        ? (wallVector > 0 ? "left" : "right")
        : ((Math.floor(routeFrame / 24) % 2) === 0 ? "right" : "left");
      const courtyardThreshold = profileNumber(this.profile, "courtyardRescueThreshold", COURTYARD_RESCUE_THRESHOLD);
      const spawnSecretDoorThreshold = profileNumber(this.profile, "spawnSecretDoorThreshold", SPAWN_SECRET_DOOR_THRESHOLD);
      const spawnWestStairThreshold = profileNumber(this.profile, "spawnWestStairThreshold", SPAWN_WEST_STAIR_THRESHOLD);
      const eastWindowRecoveryFrames = Math.max(96, Math.round(profileNumber(this.profile, "eastWindowRecoveryFrames", 132)));
      const courtyardWindowVisible = this.courtyardTurn !== "none"
        && this.courtyardScore >= Math.max(0.08, courtyardThreshold - 0.24)
        && frame >= Math.max(24, scanFrames);
      const eastWindowVisible = this.courtyardTurn === "right"
        && this.courtyardScore >= Math.max(0.18, courtyardThreshold - 0.1)
        && frame >= Math.max(24, scanFrames);
      const landmarkRouteStable = Number(this.spawnLandmarkRouteFrames || 0) >= 2
        && Number(this.spawnLandmarkRouteEvidence || 0) >= 0.28;
      const secretDoorAnchorVisible = this.spawnSecretDoorScore >= spawnSecretDoorThreshold
        && landmarkRouteStable
        && this.spawnLandmarkRouteKind === "secret-door-anchor"
        && this.firstDoorVision9x9RedScore < FIRST_DOOR_RED_ACCENT_THRESHOLD
        && this.firstDoorUse3x3Score < FIRST_DOOR_DARK_PANEL_USE_ALIGNMENT_SCORE
        && this.courtyardScore < Math.max(0.18, courtyardThreshold - 0.12)
        && frame >= Math.max(18, scanFrames - 12);
      const westStairAnchorVisible = this.spawnWestStairScore >= spawnWestStairThreshold
        && landmarkRouteStable
        && this.spawnLandmarkRouteKind === "west-stair-anchor"
        && this.firstDoorVision9x9RedScore < FIRST_DOOR_RED_ACCENT_THRESHOLD
        && this.firstDoorUse3x3Score < FIRST_DOOR_DARK_PANEL_USE_ALIGNMENT_SCORE
        && this.courtyardScore < Math.max(0.18, courtyardThreshold - 0.12)
        && frame >= Math.max(18, scanFrames - 12);

      this.strategyPriority = 3;
      this.strategyContext = "spawn-home-map-route";
      this.controlPipeline = "OpeningHome";
      this.safetyReason = obstacleBlocked
        ? (footBounceBlocked ? "opening-map-foot-bounce-obstacle" : "opening-map-route-obstacle")
        : "opening-map-route";
      this.wallUseProbeFrames = 0;
      this.wallUseProbeStage = 0;

      if (!this.firstDoorCorridorLocated && secretDoorAnchorVisible) {
        return this.openingSpawnLandmarkAnchorAction("secret-door", "left");
      }

      if (!this.firstDoorCorridorLocated && westStairAnchorVisible) {
        return this.openingSpawnLandmarkAnchorAction("west-stair", "right");
      }

      if ((this.courtyardRescueFrames > 0 && this.courtyardRescueMode === "east-window-wall-left")
        || ((eastWindowVisible || courtyardWindowVisible) && !this.firstDoorCorridorLocated)) {
        if (this.courtyardRescueFrames <= 0 || this.courtyardRescueMode !== "east-window-wall-left") {
          this.courtyardRescueFrames = eastWindowRecoveryFrames;
          this.courtyardRescueMode = "east-window-wall-left";
          this.courtyardRescueTurn = "left";
        }

        return this.eastWindowRouteRecoveryAction(eastWindowRecoveryFrames, sensor);
      }

      if (obstacleBlocked) {
        this.mobilityMode = `opening-map-centerline-recover-${awayTurn}`;
        return normalizeAction({
          move: depth <= 0.12 ? "back" : "none",
          turn: awayTurn,
          fire: false,
          strafe: depth > 0.12,
          use: false,
          run: false
        });
      }

      if (routeFrame < 72) {
        this.mobilityMode = "opening-map-straight-center";
        return normalizeAction({
          move: "forward",
          turn: sidePressure ? awayTurn : "none",
          fire: false,
          strafe: sidePressure,
          use: false,
          run: true
        });
      }

      if (routeFrame < 150) {
        this.mobilityMode = "opening-map-ne-arc";
        return normalizeAction({
          move: "forward",
          turn: sidePressure ? awayTurn : "right",
          fire: false,
          strafe: sidePressure,
          use: false,
          run: !sidePressure
        });
      }

      if (routeFrame < 245) {
        this.mobilityMode = "opening-map-ne-centerline";
        return normalizeAction({
          move: "forward",
          turn: sidePressure ? awayTurn : "none",
          fire: false,
          strafe: sidePressure,
          use: false,
          run: true
        });
      }

      if (routeFrame < Math.max(300, lockFrames - scanFrames)) {
        this.mobilityMode = "opening-map-corridor-mouth-sweep";
        return normalizeAction({
          move: "forward",
          turn: sidePressure ? awayTurn : (((Math.floor(routeFrame / 45) % 2) === 0) ? "right" : "left"),
          fire: false,
          strafe: sidePressure,
          use: false,
          run: !sidePressure
        });
      }

      this.mobilityMode = "opening-map-slow-ne-rescan";
      return normalizeAction({
        move: "none",
        turn: "right",
        fire: false,
        strafe: false,
        use: false,
        run: false
      });
    }

    eastWindowRouteRecoveryAction(totalFrames, sensor) {
      const total = Math.max(72, Math.round(totalFrames || 132));
      const elapsed = Math.max(0, total - Number(this.courtyardRescueFrames || 0));
      const depth = Number(sensor?.depthSig ?? this.depthEstimate ?? 1);
      const closeWall = depth <= 0.22 || Number(this.motionStallScore || 0) >= 0.76 || Number(this.inputStallFrames || 0) >= 4;
      this.courtyardRescueFrames = Math.max(0, Number(this.courtyardRescueFrames || 0) - 1);
      this.strategyPriority = 3;
      this.strategyContext = "spawn-east-window-recovery";
      this.controlPipeline = "OpeningHome";
      this.safetyReason = "opening-east-window-recovery";

      if (elapsed < 42 && !closeWall) {
        this.mobilityMode = "opening-east-window-forward-to-wall";
        return normalizeAction({
          move: "forward",
          turn: "none",
          fire: false,
          strafe: false,
          use: false,
          run: true
        });
      }

      if (elapsed < 72 || closeWall) {
        this.mobilityMode = "opening-east-window-left-turn";
        return normalizeAction({
          move: "none",
          turn: "left",
          fire: false,
          strafe: false,
          use: false,
          run: false
        });
      }

      this.mobilityMode = "opening-east-window-enter-corridor";
      return normalizeAction({
        move: "forward",
        turn: "none",
        fire: false,
        strafe: false,
        use: false,
        run: true
      });
    }

    openingRouteLockAction(scanFrames, wallRunFrames, lockFrames, sensor = null) {
      const frame = Math.max(0, Number(this.predictions || 0));
      this.strategyPriority = 3;
      this.strategyContext = "spawn-home";
      this.controlPipeline = "OpeningHome";
      this.safetyReason = "opening-route-lock";
      this.wallUseProbeFrames = 0;
      this.wallUseProbeStage = 0;
      this.mobilityMode = "opening-lock";

      const routeSensor = sensor || buildSensorFusionPacket({
          frame: this.previousFrame || {},
          depthEstimate: this.depthEstimate,
          stuckFrames: this.stuckFrames,
          quantizedStallFrames: this.quantizedStallFrames,
          motion: this.movementSensorSnapshot || {}
        });
      return this.openingMapRouteAction(
        routeSensor,
        scanFrames,
        wallRunFrames,
        lockFrames);

      if (frame < scanFrames) {
        this.mobilityMode = "opening-lock-scan-right-gap";
        return normalizeAction({
          move: "none",
          turn: "right",
          fire: false,
          strafe: false,
          use: false,
          run: false
        });
      }

      if (frame < scanFrames + 54) {
        this.mobilityMode = "opening-lock-align-right-gap";
        return normalizeAction({
          move: "forward",
          turn: "right",
          fire: false,
          strafe: false,
          use: false,
          run: true
        });
      }

      if (frame < wallRunFrames + 120) {
        this.mobilityMode = "opening-lock-blue-floor-center";
        return normalizeAction({
          move: "forward",
          turn: "none",
          fire: false,
          strafe: false,
          use: false,
          run: true
        });
      }

      if (frame < Math.min(lockFrames, wallRunFrames + 300)) {
        this.mobilityMode = "opening-lock-left-corridor-sweep";
        return normalizeAction({
          move: "forward",
          turn: "left",
          fire: false,
          strafe: false,
          use: false,
          run: true
        });
      }

      this.mobilityMode = "opening-lock-wide-left-rescan";
      return normalizeAction({
        move: "none",
        turn: "left",
        fire: false,
        strafe: false,
        use: false,
        run: false
      });
    }

    configureCourtyardRescue() {
      if (this.courtyardTurn === "right") {
        this.courtyardRescueMode = "right-courtyard-left-to-corridor";
        this.courtyardRescueTurn = "left";
        this.courtyardRescueTurnFrames = Math.max(18, this.courtyardRescueTurnFrames || COURTYARD_RESCUE_TURN_FRAMES);
        return;
      }

      if (this.courtyardTurn === "left") {
        this.courtyardRescueMode = "left-courtyard-forward-north";
        this.courtyardRescueTurn = "none";
        this.courtyardRescueTurnFrames = Math.max(4, Math.floor((this.courtyardRescueTurnFrames || COURTYARD_RESCUE_TURN_FRAMES) / 3));
        return;
      }

      this.courtyardRescueMode = "center-left";
      this.courtyardRescueTurn = "left";
      this.courtyardRescueTurnFrames = Math.max(14, this.courtyardRescueTurnFrames || COURTYARD_RESCUE_TURN_FRAMES);
    }

    courtyardRescueAction(totalFrames, backFrames = COURTYARD_RESCUE_BACK_FRAMES) {
      const turn = this.courtyardRescueTurn || "left";
      const elapsed = Math.max(0, totalFrames - this.courtyardRescueFrames);
      const alignFrames = Math.max(1, this.courtyardRescueTurnFrames || COURTYARD_RESCUE_TURN_FRAMES);
      this.courtyardRescueFrames = Math.max(0, this.courtyardRescueFrames - 1);
      this.strategyPriority = 2;
      this.safetyReason = "spawn-courtyard-rescue";
      if (this.courtyardRescueMode === "right-forward") {
        this.mobilityMode = "spawn-courtyard-right-forward-corridor";
        return normalizeAction({
          move: "forward",
          turn: "none",
          fire: false,
          strafe: false,
          use: false,
          run: true
        });
      }

      if (elapsed < backFrames) {
        this.mobilityMode = "spawn-courtyard-back-from-window";
        return normalizeAction({
          move: "back",
          turn: "none",
          fire: false,
          strafe: false,
          use: false,
          run: false
        });
      }

      const turnElapsed = elapsed - backFrames;
      this.mobilityMode = turnElapsed < alignFrames
        ? `spawn-courtyard-${this.courtyardRescueMode || "center-left"}-${turn}`
        : "spawn-courtyard-enter-corridor";
      return normalizeAction({
        move: turnElapsed < alignFrames ? "none" : "forward",
        turn: turnElapsed < alignFrames ? turn : "none",
        fire: false,
        strafe: false,
        use: false,
        run: turnElapsed >= alignFrames
      });
    }

    firstDoorUseAlignmentState(patch = this.firstDoorVision9x9Box || null) {
      const box = patch || this.firstDoorVision9x9Box || null;
      const column = Number(box?.column ?? -1);
      const row = Number(box?.row ?? -1);
      const kind = String(box?.kind || "none");
      const patchUseAngle = box
        && column >= 3
        && column <= 4
        && row >= 2
        && row <= 5;
      const redScore = Number(box?.redScore || 0);
      const redReady = kind === "first-door-9x9-patch" && redScore >= FIRST_DOOR_RED_ACCENT_THRESHOLD;
      const darkPanelReady = kind === "first-door-dark-panel"
        && Number(box?.darkPanelScore || 0) >= 0.24
        && Number(box?.edgeScore || 0) >= 0.30;
      const use3x3Score = Number(this.firstDoorUse3x3Score || 0);
      const closeDarkPanelReady = Boolean(darkPanelReady
        && patchUseAngle
        && this.firstDoorUse3x3Turn === "none"
        && use3x3Score >= FIRST_DOOR_DARK_PANEL_USE_ALIGNMENT_SCORE
        && Number(this.depthEstimate || 1) <= FIRST_DOOR_USE_DEPTH + 0.08);
      const centered3x3 = this.firstDoorUse3x3Turn === "none"
        && (use3x3Score >= FIRST_DOOR_USE_ALIGNMENT_SCORE
          || (darkPanelReady && use3x3Score >= FIRST_DOOR_DARK_PANEL_USE_ALIGNMENT_SCORE))
        || closeDarkPanelReady;
      const doorPatchKind = redReady || darkPanelReady;
      const visualEvidenceReady = doorPatchKind;
      const ready = Boolean(patchUseAngle && centered3x3 && visualEvidenceReady && doorPatchKind);
      let turn = "none";
      const semanticBearing = this.semanticMemory?.firstDoor?.corridorBearing === "left" || this.semanticMemory?.firstDoor?.corridorBearing === "right"
        ? this.semanticMemory.firstDoor.corridorBearing
        : "none";
      if (!doorPatchKind && kind !== "none") {
        turn = "none";
      } else if (doorPatchKind && patchUseAngle && !centered3x3) {
        turn = this.firstDoorUse3x3Reason === "edge-gap"
          ? "none"
          : (this.firstDoorUse3x3Turn === "left" || this.firstDoorUse3x3Turn === "right"
          ? this.firstDoorUse3x3Turn
          : "none");
      } else if (box && column < 3) {
        turn = "left";
      } else if (box && column > 4) {
        turn = "right";
      } else if (this.firstDoorUse3x3Turn === "left" || this.firstDoorUse3x3Turn === "right") {
        turn = this.firstDoorUse3x3Turn;
      } else if (!visualEvidenceReady) {
        turn = semanticBearing !== "none"
          ? semanticBearing
          : (this.spawnCorridorGapTurn !== "none"
            ? this.spawnCorridorGapTurn
            : (this.wallUseProbeTurn === "left" || this.wallUseProbeTurn === "right" ? this.wallUseProbeTurn : "right"));
      } else if (this.wallUseProbeTurn === "left" || this.wallUseProbeTurn === "right") {
        turn = this.wallUseProbeTurn;
      }

      const reason = ready
        ? "ready"
        : (!doorPatchKind && kind !== "none"
          ? kind
          : (!visualEvidenceReady
            ? "door-visual-evidence"
            : (!patchUseAngle ? "outside-30deg" : (centered3x3 ? "unknown" : this.firstDoorUse3x3Reason || "center-weak"))));
      return {
        ready,
        turn,
        reason,
        redScore: round2(redScore),
        patchUseAngle: Boolean(patchUseAngle),
        centered3x3,
        doorPatchKind,
        visualEvidenceReady,
        column,
        row,
        kind
      };
    }

    firstDoorFalseCandidateRecoveryAction(alignment) {
      const state = alignment || this.firstDoorUseAlignmentState();
      const edgeOnlyPatch = state.reason === "first-door-9x9-patch"
        && !state.visualEvidenceReady
        && !state.centered3x3
        && !state.doorPatchKind
        && Number(state.redScore || 0) < FIRST_DOOR_RED_ACCENT_THRESHOLD;
      if (state.reason !== "first-door-wall-pattern" && state.reason !== "first-door-floor-red" && !edgeOnlyPatch) {
        return null;
      }

      const firstDoorUseThreshold = profileNumber(this.profile, "firstDoorUseSignatureThreshold", FIRST_DOOR_USE_SIGNATURE_THRESHOLD);
      const firstDoorRetryTolerance = profileNumber(this.profile, "firstDoorRetrySignatureTolerance", FIRST_DOOR_RETRY_SIGNATURE_TOLERANCE);
      const weakWallPattern = (state.reason === "first-door-wall-pattern" || edgeOnlyPatch)
        && (Number(state.redScore || 0) < FIRST_DOOR_RED_ACCENT_THRESHOLD
          || (!state.visualEvidenceReady
            && !state.centered3x3
            && !state.doorPatchKind
            && Number(state.redScore || 0) < 0.26));
      const lowDoorEvidence = weakWallPattern
        && (Number(this.firstDoorUse3x3Score || 0) < 0.42
          || Number(this.firstDoorVision9x9Score || 0) < 0.6
          || Number(this.motionStallScore || 0) >= 0.8);
      const activeCorridorProbe = !this.firstDoorUseAttempted
        && this.wallUseProbeStage >= 2
        && Number(this.firstDoorCorridorSignature || 0) >= firstDoorUseThreshold - firstDoorRetryTolerance
        && Number(this.wallUseProbeFrames || 0) > 0;
      const corridorAnchoredProbe = activeCorridorProbe
        && Number(this.wallUseProbeFrames || 0) > 90
        && !lowDoorEvidence;
      if (corridorAnchoredProbe) {
        return null;
      }

      const candidateColumn = Number(state.column);
      const awayTurn = Number.isFinite(candidateColumn)
        ? (candidateColumn < 4 ? "right" : "left")
        : (this.spawnCorridorGapTurn === "left" || this.spawnCorridorGapTurn === "right" ? this.spawnCorridorGapTurn : this.turnBias);
      const stalledWallPattern = lowDoorEvidence
        && (Number(this.motionStallScore || 0) >= 0.82
          || Number(this.inputStallFrames || 0) >= 3
          || Number(this.quantizedStallFrames || 0) >= 8
          || Number(this.depthEstimate || 1) <= 0.12);
      const activeDetachFrames = Number(this.firstDoorCorridorProbeDetachFrames || 0);
      const contactCorridorUseProbe = activeCorridorProbe
        && lowDoorEvidence
        && state.ready
        && Number(this.depthEstimate || 1) <= 0.75
        && (activeDetachFrames >= 36 || Number(this.depthEstimate || 1) <= 0.20)
        && this.useCooldown === 0
        && this.firstDoorUseLatchFrames <= 0;
      if (contactCorridorUseProbe) {
        this.firstDoorUseLatchFrames = Math.round(profileNumber(this.profile, "firstDoorUseLatchFrames", FIRST_DOOR_USE_LATCH_FRAMES));
        this.firstDoorUsePulsed = true;
        this.firstDoorUseAttempted = true;
        this.firstDoorUseSignature = Math.max(this.firstDoorCorridorSignature, this.firstDoorVision9x9Score);
        this.strategyPriority = 3;
        this.strategyContext = "semantic-first-door";
        this.controlPipeline = "FirstDoor";
        this.safetyReason = `first-door-contact-corridor-use-${state.reason}`;
        this.mobilityMode = "semantic-door-contact-use-probe";
        return normalizeAction({
          move: "none",
          turn: "none",
          fire: false,
          strafe: false,
          use: true,
          run: false
        });
      }
      if (activeCorridorProbe && lowDoorEvidence && Number(this.depthEstimate || 1) >= 0.64) {
        const probeTurn = this.wallUseProbeTurn === "left" || this.wallUseProbeTurn === "right"
          ? this.wallUseProbeTurn
          : (this.firstDoorReprobeTurn === "left" || this.firstDoorReprobeTurn === "right"
            ? this.firstDoorReprobeTurn
            : this.turnBias);
        const distantWeakWallProbe = state.reason === "first-door-wall-pattern"
          && Number(this.depthEstimate || 1) >= 0.86
          && Number(this.wallUseProbeFrames || 0) >= Math.max(90, Math.round(profileNumber(this.profile, "firstDoorRetryUseFrames", FIRST_DOOR_RETRY_USE_FRAMES) * 0.72))
          && Number(this.firstDoorUse3x3Score || 0) < 0.30
          && Number(state.redScore || 0) < 0.26;
        if (distantWeakWallProbe) {
          const reprobeTurn = this.spawnCorridorGapTurn === "left" || this.spawnCorridorGapTurn === "right"
            ? this.spawnCorridorGapTurn
            : (probeTurn === "left" || probeTurn === "right" ? oppositeTurn(probeTurn) : "right");
          const reprobeFrames = Math.max(30, Math.round(profileNumber(this.profile, "firstDoorReprobeFrames", 36)));
          this.startFirstDoorReprobe(reprobeFrames, reprobeTurn);
          this.strategyPriority = 3;
          this.strategyContext = "semantic-first-door";
          this.controlPipeline = "FirstDoor";
          this.safetyReason = "first-door-distant-wall-probe-reprobe";
          return this.firstDoorReprobeAction(reprobeFrames);
        }
        const corridorProbeStalled = Number(this.motionStallScore || 0) >= 0.94
          || Number(this.inputStallFrames || 0) >= 6
          || Number(this.quantizedStallFrames || 0) >= 18;
        if (corridorProbeStalled) {
          this.firstDoorCorridorProbeDetachFrames = Math.min(
            MAX_STUCK_COUNTER,
            Number(this.firstDoorCorridorProbeDetachFrames || 0) + 1);
        } else {
          this.firstDoorCorridorProbeDetachFrames = Math.max(
            0,
            Number(this.firstDoorCorridorProbeDetachFrames || 0) - 1);
        }
        const detachFrameCount = Number(this.firstDoorCorridorProbeDetachFrames || 0);
        if (corridorProbeStalled && detachFrameCount >= 48 && Number(this.depthEstimate || 1) >= 0.86) {
          const surveyTurn = this.spawnCorridorGapTurn === "left" || this.spawnCorridorGapTurn === "right"
            ? this.spawnCorridorGapTurn
            : (probeTurn === "left" || probeTurn === "right" ? oppositeTurn(probeTurn) : "left");
          const action = this.resetFirstDoorSemanticLock("first-door-long-wall-pattern-survey", surveyTurn);
          this.firstDoorCorridorSuppressFrames = Math.max(this.firstDoorCorridorSuppressFrames, 168);
          this.firstDoorCorridorProbeDetachFrames = 0;
          return action;
        }
        const detachPhase = detachFrameCount % 96;
        const baseDetachTurn = probeTurn === "left" || probeTurn === "right" ? oppositeTurn(probeTurn) : "right";
        const detachTurn = detachPhase < 24
          ? baseDetachTurn
          : oppositeTurn(baseDetachTurn);
        const sweepTurn = this.spawnCorridorGapTurn === "left" || this.spawnCorridorGapTurn === "right"
          ? this.spawnCorridorGapTurn
          : (probeTurn === "left" || probeTurn === "right" ? probeTurn : detachTurn);
        const corridorProbeSweep = corridorProbeStalled
          && Number(this.depthEstimate || 1) >= 0.64
          && detachPhase >= 24
          && detachPhase < 60;
        this.strategyPriority = 3;
        this.strategyContext = "semantic-first-door";
        this.controlPipeline = "FirstDoor";
        this.safetyReason = corridorProbeSweep
          ? `first-door-corridor-probe-sweep-${state.reason}`
          : (corridorProbeStalled
          ? `first-door-corridor-probe-detach-${state.reason}`
          : `first-door-corridor-probe-advance-${state.reason}`);
        this.mobilityMode = corridorProbeSweep
          ? `first-door-corridor-probe-sweep-${sweepTurn}`
          : (corridorProbeStalled
          ? `first-door-corridor-probe-detach-${detachTurn}`
          : "first-door-corridor-probe-advance");
        return normalizeAction({
          move: corridorProbeSweep ? "none" : "forward",
          turn: corridorProbeSweep
            ? sweepTurn
            : (corridorProbeStalled
            ? detachTurn
            : (this.spawnCorridorGapTurn === "left" || this.spawnCorridorGapTurn === "right"
            ? this.spawnCorridorGapTurn
            : "none")),
          fire: false,
          strafe: corridorProbeStalled && !corridorProbeSweep,
          use: false,
          run: !corridorProbeSweep
        });
      }
      if (stalledWallPattern) {
        const reprobeFrames = Math.max(36, Math.round(profileNumber(this.profile, "firstDoorReprobeFrames", 36)));
        this.startFirstDoorReprobe(reprobeFrames, awayTurn);
        this.strategyPriority = 3;
        this.strategyContext = "semantic-first-door";
        this.controlPipeline = "FirstDoor";
        this.safetyReason = `first-door-low-evidence-detach-${state.reason}`;
        this.mobilityMode = `first-door-low-evidence-detach-${awayTurn}`;
        return this.firstDoorReprobeAction(reprobeFrames);
      }

      if (lowDoorEvidence && Number(this.depthEstimate || 1) >= 0.86) {
        this.wallUseProbeFrames = 0;
        this.wallUseProbeStage = 0;
        this.strategyPriority = 2;
        this.strategyContext = "semantic-first-door";
        this.controlPipeline = "FirstDoor";
        this.safetyReason = `first-door-low-evidence-scout-${state.reason}`;
        this.mobilityMode = "first-door-low-evidence-forward";
        return normalizeAction({
          move: "forward",
          turn: "none",
          fire: false,
          strafe: false,
          use: false,
          run: true
        });
      }

      if (lowDoorEvidence && !this.firstDoorUseAttempted && this.firstDoorLockedUseCycles >= 4) {
        return this.resetFirstDoorSemanticLock(`first-door-low-evidence-reset-${state.reason}`, awayTurn);
      }

      const reprobeFrames = Math.max(30, Math.round(profileNumber(this.profile, "firstDoorReprobeFrames", 36)));
      this.startFirstDoorReprobe(reprobeFrames, awayTurn);
      this.strategyPriority = 3;
      this.strategyContext = "semantic-first-door";
      this.controlPipeline = "FirstDoor";
      this.safetyReason = `first-door-false-candidate-${state.reason}`;
      this.mobilityMode = `first-door-false-candidate-recover-${awayTurn}`;
      return this.firstDoorReprobeAction(reprobeFrames);
    }

    resetFirstDoorSemanticLock(reason, preferredTurn = "right") {
      const turn = preferredTurn === "left" || preferredTurn === "right" ? preferredTurn : "right";
      this.firstDoorCorridorLocated = false;
      this.firstDoorCorridorFrames = 0;
      this.firstDoorCorridorSignature = 0;
      this.firstDoorUseAttempted = false;
      this.firstDoorUsePulsed = false;
      this.firstDoorUseLatchFrames = 0;
      this.firstDoorUseSignature = 0;
      this.firstDoorLockedUseCycles = 0;
      this.firstDoorReprobeFrames = 0;
      this.firstDoorReprobeTurn = turn;
      this.firstDoorWallOnlyCandidateFrames = 0;
      this.wallUseProbeFrames = 0;
      this.wallUseProbeStage = 0;
      this.wallUseProbeTurn = turn;
      this.courtyardRescueFrames = 0;
      this.courtyardRescueTurnFrames = 0;
      this.spawnCorridorGapFrames = 0;
      this.spawnCorridorGapAlignFrames = 0;
      this.firstDoorCorridorSuppressFrames = Math.max(54, Math.round(profileNumber(this.profile, "firstDoorCorridorSearchFrames", FIRST_DOOR_CORRIDOR_SEARCH_FRAMES) * 0.6));
      this.strategyPriority = 2;
      this.strategyContext = "semantic-opening-route";
      this.controlPipeline = "OpeningHome";
      this.safetyReason = reason;
      this.mobilityMode = `first-door-lock-reset-${turn}`;
      return normalizeAction({
        move: "back",
        turn,
        fire: false,
        strafe: false,
        use: false,
        run: false
      });
    }

    firstDoorUseAimCorrectionAction(alignment, reason, options = {}) {
      const state = alignment || this.firstDoorUseAlignmentState();
      const falseCandidateAction = this.firstDoorFalseCandidateRecoveryAction(state);
      if (falseCandidateAction) {
        return falseCandidateAction;
      }

      const centeredApproach = state.patchUseAngle
        && state.visualEvidenceReady
        && !state.centered3x3
        && state.turn === "none"
        && (state.reason !== "edge-gap" || state.doorPatchKind);
      const closeEdgeRecovery = state.reason === "edge-gap"
        && Number(this.depthEstimate || 1) <= 0.28
        && Number(this.motionStallScore || 0) >= 0.62;
      const turn = centeredApproach
        ? "none"
        : (state.turn === "left" || state.turn === "right"
        ? state.turn
        : this.firstDoorProbeTurn("none"));
      if (!options.keepProbeFrames) {
        this.wallUseProbeFrames = 0;
        this.wallUseProbeStage = 0;
      }
      const firstDoorUseThreshold = profileNumber(this.profile, "firstDoorUseSignatureThreshold", FIRST_DOOR_USE_SIGNATURE_THRESHOLD);
      const firstDoorRetryTolerance = profileNumber(this.profile, "firstDoorRetrySignatureTolerance", FIRST_DOOR_RETRY_SIGNATURE_TOLERANCE);
      const weakCenteredUseProbe = centeredApproach
        && false
        && this.doorOpenedCount <= 0
        && this.firstDoorCorridorLocated
        && !this.firstDoorUseAttempted
        && this.useCooldown === 0
        && this.firstDoorUseLatchFrames <= 0
        && Number(this.depthEstimate || 1) <= 0.58
        && Number(this.firstDoorCorridorSignature || 0) >= firstDoorUseThreshold - firstDoorRetryTolerance
        && Number(this.firstDoorVision9x9Score || 0) >= 0.44;
      const closeDoorPatchUseProbe = centeredApproach
        && false
        && state.doorPatchKind
        && state.patchUseAngle
        && this.doorOpenedCount <= 0
        && this.firstDoorCorridorLocated
        && !this.firstDoorUseAttempted
        && this.useCooldown === 0
        && this.firstDoorUseLatchFrames <= 0
        && Number(this.depthEstimate || 1) <= 0.72
        && (state.reason === "edge-gap" || Number(this.firstDoorVision9x9Score || 0) >= 0.34)
        && (Number(this.firstDoorVision9x9Score || 0) >= 0.30
          || Number(this.semanticMemory?.firstDoor?.doorConfidence || 0) >= 0.46);
      const closeRedPatchUseProbe = state.doorPatchKind
        && false
        && state.patchUseAngle
        && this.doorOpenedCount <= 0
        && this.firstDoorCorridorLocated
        && !this.firstDoorUseAttempted
        && this.useCooldown === 0
        && this.firstDoorUseLatchFrames <= 0
        && Number(this.depthEstimate || 1) <= 0.58
        && Number(state.redScore || 0) >= FIRST_DOOR_RED_ACCENT_THRESHOLD * 2;
      if (weakCenteredUseProbe || closeDoorPatchUseProbe || closeRedPatchUseProbe) {
        this.firstDoorUseLatchFrames = Math.round(profileNumber(this.profile, "firstDoorUseLatchFrames", FIRST_DOOR_USE_LATCH_FRAMES));
        this.firstDoorUsePulsed = true;
        this.firstDoorUseAttempted = true;
        this.firstDoorUseSignature = Math.max(this.firstDoorCorridorSignature, this.firstDoorVision9x9Score);
        this.strategyPriority = 3;
        this.strategyContext = "semantic-first-door";
        this.controlPipeline = "FirstDoor";
        this.safetyReason = closeRedPatchUseProbe
          ? `${reason}-close-red-patch-use`
          : (closeDoorPatchUseProbe
          ? `${reason}-close-door-patch-use`
          : `${reason}-weak-centered-use`);
        this.mobilityMode = closeRedPatchUseProbe
          ? "semantic-door-close-red-patch-use-probe"
          : (closeDoorPatchUseProbe
          ? "semantic-door-close-patch-use-probe"
          : "semantic-door-weak-use-probe");
        return normalizeAction({
          move: "none",
          turn: "none",
          fire: false,
          strafe: false,
          use: true,
          run: false
        });
      }
      this.strategyPriority = 3;
      this.strategyContext = "semantic-first-door";
      this.controlPipeline = "FirstDoor";
      this.safetyReason = `${reason}-${state.reason || "align"}`;
      this.mobilityMode = centeredApproach
        ? "semantic-door-approach-center"
        : (closeEdgeRecovery
          ? `semantic-door-edge-recover-${turn === "none" ? "center" : turn}`
          : `semantic-door-align-${turn === "none" ? "center" : turn}`);
      return normalizeAction({
        move: centeredApproach ? "forward" : (closeEdgeRecovery ? "back" : "none"),
        turn,
        fire: false,
        strafe: false,
        use: false,
        run: false
      });
    }

    shouldReprobeFirstDoorUse(options = {}) {
      if (this.doorOpenedCount > 0
        || !this.firstDoorCorridorLocated
        || !this.firstDoorUseAttempted
        || (this.wallUseProbeFrames > 0 && !options.allowProbeInterrupt)
        || this.firstDoorReprobeFrames > 0) {
        return false;
      }

      if (this.firstDoorUseLatchFrames > 0 && !options.allowLatch) {
        return false;
      }

      const firstDoorUseThreshold = profileNumber(this.profile, "firstDoorUseSignatureThreshold", FIRST_DOOR_USE_SIGNATURE_THRESHOLD);
      const firstDoorRetryTolerance = profileNumber(this.profile, "firstDoorRetrySignatureTolerance", FIRST_DOOR_RETRY_SIGNATURE_TOLERANCE);
      const plausibleDoor = this.firstDoorUseSignature >= firstDoorUseThreshold - firstDoorRetryTolerance
        || this.firstDoorCorridorSignature >= firstDoorUseThreshold - firstDoorRetryTolerance
        || Number(this.semanticMemory?.firstDoor?.doorConfidence || 0) >= 0.58
        || this.mapDoorSectorMatch;
      if (!plausibleDoor) {
        return false;
      }

      const movementStalled = this.movementSensorSnapshot?.eventType === "movement-stall";
      const noForwardProgress = Number(this.motionForwardProgress || 0) <= 0.04
        || Number(this.movementSensorSnapshot?.vectorY || 0) <= 0.04;
      const persistentStall = this.quantizedStallFrames >= 28
        || this.stuckFrames >= 30
        || this.inputStallFrames >= 18
        || (Number(this.motionStallScore || 0) >= 0.9 && this.inputStallFrames >= 6);
      return noForwardProgress && (persistentStall || movementStalled);
    }

    startFirstDoorReprobe(totalFrames, preferredTurn = "none") {
      this.firstDoorLockedUseCycles = (this.firstDoorLockedUseCycles || 0) + 1;
      this.firstDoorReprobeFrames = Math.max(20, Math.round(totalFrames || profileNumber(this.profile, "firstDoorReprobeFrames", 36)));
      const corridorGapTurn = (this.spawnCorridorGapTurn === "left" || this.spawnCorridorGapTurn === "right")
        && Number(this.spawnCorridorGapScore || 0) >= 0.18
        ? this.spawnCorridorGapTurn
        : "none";
      this.firstDoorReprobeTurn = preferredTurn === "left" || preferredTurn === "right"
        ? preferredTurn
        : (corridorGapTurn !== "none"
          ? corridorGapTurn
          : ((this.firstDoorLockedUseCycles % 2) === 0 ? "left" : "right"));
      if (this.firstDoorUseAttempted) {
        this.firstDoorUseAttempted = false;
        this.firstDoorUseSignature = 0;
      }
      this.firstDoorUseLatchFrames = 0;
      this.wallUseProbeFrames = 0;
      this.wallUseProbeStage = 0;
      this.wallUseProbeTurn = this.firstDoorReprobeTurn;
      this.useCooldown = Math.min(this.useCooldown, 2);
    }

    firstDoorReprobeAction(totalFrames) {
      const total = Math.max(20, Math.round(totalFrames || profileNumber(this.profile, "firstDoorReprobeFrames", 36)));
      const closeWall = Number(this.depthEstimate || 1) <= 0.18
        && Number(this.motionStallScore || 0) >= 0.62;
      const backFrames = Math.max(closeWall ? 16 : 4, Math.round(profileNumber(this.profile, "firstDoorReprobeBackFrames", 8)));
      const turnFrames = Math.max(closeWall ? 20 : 8, Math.round(profileNumber(this.profile, "firstDoorReprobeTurnFrames", 16)));
      const elapsed = Math.max(0, total - this.firstDoorReprobeFrames);
      const turn = this.firstDoorReprobeTurn || "right";
      this.firstDoorReprobeFrames = Math.max(0, this.firstDoorReprobeFrames - 1);
      this.strategyPriority = 3;
      this.strategyContext = "semantic-first-door";
      this.controlPipeline = "FirstDoor";
      this.safetyReason = "first-door-reprobe";

      const alignment = this.firstDoorUseAlignmentState();
      const weakWallPattern = alignment.reason === "first-door-wall-pattern"
        && (Number(alignment.redScore || 0) < FIRST_DOOR_RED_ACCENT_THRESHOLD
          || (!alignment.visualEvidenceReady
            && !alignment.centered3x3
            && !alignment.doorPatchKind
            && Number(alignment.redScore || 0) < 0.26))
        && !alignment.visualEvidenceReady
        && !alignment.centered3x3;
      const firstDoorUseThreshold = profileNumber(this.profile, "firstDoorUseSignatureThreshold", FIRST_DOOR_USE_SIGNATURE_THRESHOLD);
      const firstDoorRetryTolerance = profileNumber(this.profile, "firstDoorRetrySignatureTolerance", FIRST_DOOR_RETRY_SIGNATURE_TOLERANCE);
      const reprobeCorridorEvidenceStrong = this.firstDoorCorridorLocated
        && Number(this.firstDoorCorridorSignature || 0) >= firstDoorUseThreshold - firstDoorRetryTolerance;
      const weakPatternStalled = weakWallPattern
        && !reprobeCorridorEvidenceStrong
        && Number(this.firstDoorUse3x3Score || 0) < 0.42
        && Number(this.firstDoorVision9x9Score || 0) < 0.62
        && (Number(this.firstDoorLockedUseCycles || 0) >= 3
          || elapsed >= backFrames + turnFrames
          || Number(this.motionStallScore || 0) >= 0.88
          || Number(this.inputStallFrames || 0) >= 4);
      if (weakPatternStalled) {
        this.firstDoorReprobeFrames = 0;
        this.wallUseProbeFrames = 0;
        this.wallUseProbeStage = 0;
        this.strategyPriority = 3;
        this.strategyContext = "semantic-first-door";
        this.controlPipeline = "FirstDoor";
        this.safetyReason = "first-door-reprobe-weak-pattern-scout";
        this.mobilityMode = `first-door-reprobe-weak-pattern-scout-${oppositeTurn(turn)}`;
        return normalizeAction({
          move: "forward",
          turn: oppositeTurn(turn),
          fire: false,
          strafe: false,
          use: false,
          run: true
        });
      }

      if (elapsed < backFrames) {
        this.mobilityMode = `first-door-reprobe-back-${turn}`;
        return normalizeAction({
          move: "back",
          turn: "none",
          fire: false,
          strafe: false,
          use: false,
          run: false
        });
      }

      if (elapsed < backFrames + turnFrames) {
        this.mobilityMode = closeWall
          ? `first-door-reprobe-detach-${turn}`
          : `first-door-reprobe-align-${turn}`;
        return normalizeAction({
          move: closeWall ? "back" : "none",
          turn,
          fire: false,
          strafe: false,
          use: false,
          run: false
        });
      }

      if (elapsed >= backFrames + turnFrames || this.firstDoorReprobeFrames <= 0) {
        const farReprobeApproach = this.firstDoorCorridorLocated
          && Number(this.depthEstimate || 1) >= 0.72
          && Number(this.firstDoorCorridorSignature || 0) >= firstDoorUseThreshold - firstDoorRetryTolerance
          && !alignment.ready;
        if (farReprobeApproach) {
          this.firstDoorReprobeFrames = 0;
          this.wallUseProbeFrames = 0;
          this.wallUseProbeStage = 0;
          this.useCooldown = Math.min(this.useCooldown, 2);
          this.strategyPriority = 3;
          this.strategyContext = "semantic-first-door";
          this.controlPipeline = "FirstDoor";
          this.safetyReason = "first-door-reprobe-approach";
          this.mobilityMode = "first-door-reprobe-approach-forward";
          return normalizeAction({
            move: "forward",
            turn: this.spawnCorridorGapTurn === "left" || this.spawnCorridorGapTurn === "right" ? this.spawnCorridorGapTurn : "none",
            fire: false,
            strafe: false,
            use: false,
            run: false
          });
        }

        const lowEvidenceLoop = Number(this.firstDoorLockedUseCycles || 0) >= 3
          && Number(this.depthEstimate || 1) >= 0.72
          && Number(this.firstDoorUse3x3Score || 0) < 0.34
          && Number(this.firstDoorVision9x9Score || 0) < 0.58
          && !alignment.ready;
        if (lowEvidenceLoop) {
          this.firstDoorReprobeFrames = 0;
          this.wallUseProbeFrames = 0;
          this.wallUseProbeStage = 0;
          this.useCooldown = Math.min(this.useCooldown, 2);
          this.strategyPriority = 3;
          this.strategyContext = "semantic-first-door";
          this.controlPipeline = "FirstDoor";
          this.safetyReason = "first-door-reprobe-low-evidence-scout";
          this.mobilityMode = "first-door-reprobe-scout-forward";
          return normalizeAction({
            move: "forward",
            turn: this.spawnCorridorGapTurn === "left" || this.spawnCorridorGapTurn === "right" ? this.spawnCorridorGapTurn : "none",
            fire: false,
            strafe: false,
            use: false,
            run: true
          });
        }

        this.firstDoorUseAttempted = false;
        this.firstDoorUsePulsed = false;
        this.firstDoorUseLatchFrames = 0;
        this.wallUseProbeStage = 2;
        this.wallUseProbeTurn = this.firstDoorProbeTurn(turn);
        this.wallUseProbeFrames = Math.round(profileNumber(this.profile, "firstDoorRetryUseFrames", FIRST_DOOR_RETRY_USE_FRAMES));
        this.useCooldown = 0;
        this.safetyReason = "first-door-reprobe-use-probe";
        this.mobilityMode = "first-door-reprobe-use-probe";
        return this.wallUseProbeAction();
      }

      this.mobilityMode = "first-door-reprobe-ready";
      return normalizeAction({
        move: "none",
        turn: "none",
        fire: false,
        strafe: false,
        use: false,
        run: false
      });
    }

    firstDoorProbeTurn(fallback = "none") {
      if (this.firstDoorLockedUseCycles > 0
        && (this.firstDoorReprobeTurn === "left" || this.firstDoorReprobeTurn === "right")) {
        return this.firstDoorReprobeTurn;
      }

      return fallback === "left" || fallback === "right" ? fallback : "none";
    }

    wallUseProbeAction() {
      const firstDoorMode = this.doorOpenedCount <= 0 && this.firstDoorCorridorLocated;
      const firstDoorRetryMode = firstDoorMode && this.firstDoorUseAttempted;
      const aimFrames = firstDoorRetryMode ? 2 : profileNumber(this.profile, "doorAimFrames", WALL_USE_AIM_FRAMES);
      const approachFrames = firstDoorRetryMode
        ? Math.max(4, Math.floor(profileNumber(this.profile, "firstDoorPressFrames", FIRST_DOOR_PRESS_FRAMES) / 2))
        : firstDoorMode
        ? Math.max(profileNumber(this.profile, "doorApproachFrames", WALL_USE_APPROACH_FRAMES), profileNumber(this.profile, "firstDoorPressFrames", FIRST_DOOR_PRESS_FRAMES))
        : profileNumber(this.profile, "doorApproachFrames", WALL_USE_APPROACH_FRAMES);
      const settleFrames = firstDoorMode
        ? Math.max(profileNumber(this.profile, "doorSettleFrames", WALL_USE_SETTLE_FRAMES), profileNumber(this.profile, "firstDoorSettleFrames", FIRST_DOOR_SETTLE_FRAMES))
        : (firstDoorRetryMode ? 1 : profileNumber(this.profile, "doorSettleFrames", WALL_USE_SETTLE_FRAMES));
      const holdFrames = firstDoorMode
        ? Math.max(profileNumber(this.profile, "doorUseHoldFrames", WALL_USE_HOLD_FRAMES), profileNumber(this.profile, "firstDoorUseHoldFrames", FIRST_DOOR_USE_HOLD_FRAMES))
        : profileNumber(this.profile, "doorUseHoldFrames", WALL_USE_HOLD_FRAMES);
      const pressFrames = firstDoorMode ? profileNumber(this.profile, "firstDoorPressFrames", FIRST_DOOR_PRESS_FRAMES) : 0;
      const useSweepFrames = firstDoorRetryMode ? 0 : (firstDoorMode ? profileNumber(this.profile, "firstDoorUseSweepFrames", FIRST_DOOR_USE_SWEEP_FRAMES) : 0);
      const retryFrames = firstDoorRetryMode ? profileNumber(this.profile, "firstDoorRetryUseFrames", FIRST_DOOR_RETRY_USE_FRAMES) : 0;
      const totalFrames = Math.max(WALL_USE_PROBE_FRAMES, retryFrames, aimFrames + approachFrames + settleFrames + holdFrames);
      const elapsed = Math.max(0, totalFrames - this.wallUseProbeFrames);
      const doorUseDepth = firstDoorMode
        ? profileNumber(this.profile, "firstDoorUseDepth", profileNumber(this.profile, "doorUseDepth", FIRST_DOOR_USE_DEPTH))
        : profileNumber(this.profile, "doorUseDepth", DOOR_USE_DEPTH_THRESHOLD);
      const doorApproachDepth = firstDoorMode
        ? profileNumber(this.profile, "firstDoorApproachDepth", profileNumber(this.profile, "doorApproachDepth", FIRST_DOOR_APPROACH_DEPTH))
        : profileNumber(this.profile, "doorApproachDepth", Math.max(doorUseDepth, 0.86));
      const closeEnough = this.depthEstimate <= doorUseDepth;
      const aiming = elapsed < aimFrames;
      const approachWindow = elapsed >= aimFrames && elapsed < aimFrames + approachFrames;
      const settleWindow = elapsed >= aimFrames + approachFrames && elapsed < aimFrames + approachFrames + settleFrames;
      const useWindow = elapsed >= aimFrames + approachFrames + settleFrames;
      const useElapsed = useWindow ? elapsed - aimFrames - approachFrames - settleFrames : 0;
      const noTurnUseWindow = firstDoorMode
        && useWindow
        && useElapsed < profileNumber(this.profile, "firstDoorNoTurnUseFrames", FIRST_DOOR_NO_TURN_USE_FRAMES);
      const approaching = approachWindow && !closeEnough && this.depthEstimate > doorUseDepth;
      const pressWindow = firstDoorMode && useWindow && elapsed < aimFrames + approachFrames + settleFrames + pressFrames;
      const useSweepWindow = firstDoorMode && useWindow && elapsed < aimFrames + approachFrames + settleFrames + useSweepFrames;
      const firstDoorUseDepthReady = firstDoorMode
        ? this.depthEstimate <= doorUseDepth + 0.08
        : true;
      const probingClosedGate = firstDoorMode
        ? (closeEnough || firstDoorUseDepthReady)
        : (closeEnough || this.depthEstimate <= doorApproachDepth || useWindow);
      const phase = aiming ? "aim" : (approaching ? "approach" : (settleWindow ? "settle" : (pressWindow ? "press-use" : "use")));
      const firstDoorAlignment = firstDoorMode ? this.firstDoorUseAlignmentState() : null;
      const alignmentTurn = firstDoorAlignment?.turn === "left" || firstDoorAlignment?.turn === "right"
        ? firstDoorAlignment.turn
        : "none";
      const firstDoorUseThreshold = profileNumber(this.profile, "firstDoorUseSignatureThreshold", FIRST_DOOR_USE_SIGNATURE_THRESHOLD);
      const firstDoorRetryTolerance = profileNumber(this.profile, "firstDoorRetrySignatureTolerance", FIRST_DOOR_RETRY_SIGNATURE_TOLERANCE);
      const weakFirstDoorUseProbe = firstDoorMode
        && useWindow
        && false
        && !this.firstDoorUseAttempted
        && firstDoorAlignment
        && !firstDoorAlignment.ready
        && firstDoorAlignment.patchUseAngle
        && firstDoorAlignment.visualEvidenceReady
        && alignmentTurn === "none"
        && Number(this.depthEstimate || 1) <= 0.58
        && Number(this.firstDoorVision9x9Score || 0) >= 0.48
        && Number(this.firstDoorCorridorSignature || 0) >= firstDoorUseThreshold - firstDoorRetryTolerance;
      const closeCorridorUseProbe = firstDoorMode
        && useWindow
        && false
        && !this.firstDoorUseAttempted
        && firstDoorAlignment?.patchUseAngle
        && firstDoorAlignment?.visualEvidenceReady
        && alignmentTurn === "none"
        && Number(this.depthEstimate || 1) <= 0.52
        && Number(this.firstDoorCorridorSignature || 0) >= firstDoorUseThreshold - firstDoorRetryTolerance
        && (Number(this.firstDoorVision9x9Score || 0) >= 0.30
          || Number(this.semanticMemory?.firstDoor?.doorConfidence || 0) >= 0.50);
      const closeRedPatchUseProbe = firstDoorMode
        && useWindow
        && !this.firstDoorUseAttempted
        && firstDoorAlignment?.patchUseAngle
        && firstDoorAlignment?.centered3x3
        && firstDoorAlignment?.doorPatchKind
        && Number(firstDoorAlignment?.redScore || 0) >= FIRST_DOOR_RED_ACCENT_THRESHOLD * 2
        && Number(this.depthEstimate || 1) <= 0.58
        && Number(this.firstDoorCorridorSignature || 0) >= firstDoorUseThreshold - firstDoorRetryTolerance;
      const stalledWallPatternUseProbe = firstDoorMode
        && useWindow
        && false
        && !this.firstDoorUseAttempted
        && firstDoorAlignment?.patchUseAngle
        && firstDoorAlignment?.reason === "first-door-wall-pattern"
        && Number(this.depthEstimate || 1) <= 0.24
        && Number(this.motionStallScore || 0) >= 0.82
        && Number(this.firstDoorCorridorSignature || 0) >= firstDoorUseThreshold - firstDoorRetryTolerance;
      const useSweepTurn = this.wallUseProbeTurn === "left" || this.wallUseProbeTurn === "right"
        ? this.wallUseProbeTurn
        : (firstDoorMode ? alignmentTurn : this.turnBias);
      if (firstDoorMode && firstDoorAlignment) {
        const falseCandidateAction = this.firstDoorFalseCandidateRecoveryAction(firstDoorAlignment);
        if (falseCandidateAction) {
          return falseCandidateAction;
        }
      }

      const weakDistantProbe = firstDoorMode
        && this.wallUseProbeStage >= 2
        && !this.firstDoorUseAttempted
        && !firstDoorAlignment?.ready
        && !firstDoorAlignment?.doorPatchKind
        && Number(this.depthEstimate || 1) >= 0.90
        && Number(this.firstDoorUse3x3Score || 0) < 0.22
        && Number(this.firstDoorVision9x9Score || 0) < 0.54;
      if (weakDistantProbe) {
        const reprobeTurn = this.spawnCorridorGapTurn === "left" || this.spawnCorridorGapTurn === "right"
          ? this.spawnCorridorGapTurn
          : (this.wallUseProbeTurn === "left" || this.wallUseProbeTurn === "right"
            ? oppositeTurn(this.wallUseProbeTurn)
            : oppositeTurn(this.turnBias));
        const reprobeFrames = Math.max(30, Math.round(profileNumber(this.profile, "firstDoorReprobeFrames", 36)));
        this.startFirstDoorReprobe(reprobeFrames, reprobeTurn);
        this.strategyPriority = 3;
        this.strategyContext = "semantic-first-door";
        this.controlPipeline = "FirstDoor";
        this.safetyReason = "first-door-weak-distant-probe-reprobe";
        return this.firstDoorReprobeAction(reprobeFrames);
      }

      if (firstDoorMode
        && firstDoorAlignment?.ready
        && this.depthEstimate <= doorUseDepth + 0.08
        && this.useCooldown === 0
        && this.firstDoorUseLatchFrames <= 0) {
        this.firstDoorUseLatchFrames = Math.round(profileNumber(this.profile, "firstDoorUseLatchFrames", FIRST_DOOR_USE_LATCH_FRAMES));
        this.firstDoorUsePulsed = true;
        this.firstDoorUseAttempted = true;
        this.firstDoorUseSignature = Math.max(this.firstDoorCorridorSignature, this.firstDoorVision9x9Score);
        this.mobilityMode = "semantic-door-use-ready";
        this.safetyReason = "first-door-use-ready";
        return normalizeAction({
          move: "none",
          turn: "none",
          fire: false,
          strafe: false,
          use: true,
          run: false
        });
      }

      const centeredDoorApproach = firstDoorAlignment
        && firstDoorAlignment.patchUseAngle
        && firstDoorAlignment.visualEvidenceReady
        && !firstDoorAlignment.centered3x3;
      if (firstDoorMode && firstDoorAlignment && !firstDoorAlignment.ready && aiming && (alignmentTurn !== "none" || centeredDoorApproach)) {
        return this.firstDoorUseAimCorrectionAction(firstDoorAlignment, "first-door-probe-aim", { keepProbeFrames: true });
      }
      if ((weakFirstDoorUseProbe || closeCorridorUseProbe || closeRedPatchUseProbe || stalledWallPatternUseProbe)
        && this.useCooldown === 0
        && this.firstDoorUseLatchFrames <= 0) {
        this.firstDoorUseLatchFrames = Math.round(profileNumber(this.profile, "firstDoorUseLatchFrames", FIRST_DOOR_USE_LATCH_FRAMES));
        this.firstDoorUsePulsed = true;
        this.firstDoorUseAttempted = true;
        this.firstDoorUseSignature = Math.max(this.firstDoorCorridorSignature, this.firstDoorVision9x9Score);
        this.strategyPriority = 3;
        this.strategyContext = "semantic-first-door";
        this.controlPipeline = "FirstDoor";
        this.safetyReason = stalledWallPatternUseProbe
          ? "first-door-stalled-wall-pattern-use"
          : (closeRedPatchUseProbe ? "first-door-close-red-patch-use" : (closeCorridorUseProbe ? "first-door-close-corridor-use" : "first-door-weak-use"));
        this.mobilityMode = stalledWallPatternUseProbe
          ? "semantic-door-stalled-wall-use-probe"
          : (closeRedPatchUseProbe ? "semantic-door-close-red-use-probe" : (closeCorridorUseProbe ? "semantic-door-close-use-probe" : "semantic-door-weak-use-probe"));
        return normalizeAction({
          move: "none",
          turn: "none",
          fire: false,
          strafe: false,
          use: true,
          run: false
        });
      }
      if (firstDoorMode && firstDoorAlignment && !firstDoorAlignment.ready && (useWindow || firstDoorRetryMode)) {
        this.wallUseProbeFrames = Math.max(
          Number(this.wallUseProbeFrames || 0),
          Math.round(profileNumber(this.profile, "firstDoorSettleFrames", FIRST_DOOR_SETTLE_FRAMES)) + 8);
        return this.firstDoorUseAimCorrectionAction(firstDoorAlignment, "first-door-use-angle", { keepProbeFrames: true });
      }

      const retrySweepTurn = firstDoorRetryMode && useWindow
        ? (useSweepTurn === "none" ? "none" : (((elapsed - aimFrames - approachFrames - settleFrames) % 18) < 9 ? useSweepTurn : oppositeTurn(useSweepTurn)))
        : "none";
      const firstDoorUseAdvance = firstDoorMode
        && useWindow
        && (this.depthEstimate > doorUseDepth * 0.72 || pressWindow || firstDoorRetryMode);
      const firstDoorUsePress = firstDoorMode && useWindow;
      const firstDoorUseLatched = firstDoorMode && this.firstDoorUseLatchFrames > 0;
      const turnCommand = noTurnUseWindow || settleWindow
        ? "none"
        : (retrySweepTurn !== "none" ? retrySweepTurn : (!firstDoorRetryMode && (aiming || useSweepWindow) ? useSweepTurn : "none"));
      const requestedUse = firstDoorMode
        ? ((useWindow || (firstDoorRetryMode && elapsed >= aimFrames + approachFrames))
          && Boolean(firstDoorAlignment?.ready)
          && firstDoorUseDepthReady)
          || weakFirstDoorUseProbe
          || closeCorridorUseProbe
          || closeRedPatchUseProbe
          || stalledWallPatternUseProbe
        : ((useWindow && probingClosedGate) || (firstDoorRetryMode && elapsed >= aimFrames + approachFrames));
      const shouldUse = requestedUse && !firstDoorUseLatched;
      if (firstDoorMode && shouldUse) {
        this.firstDoorUseLatchFrames = Math.round(profileNumber(this.profile, "firstDoorUseLatchFrames", FIRST_DOOR_USE_LATCH_FRAMES));
        this.firstDoorUsePulsed = true;
        this.firstDoorUseAttempted = true;
        this.firstDoorUseSignature = Math.max(this.firstDoorCorridorSignature, this.firstDoorVision9x9Score);
      }
      this.mobilityMode = `door-probe-${this.wallUseProbeStage}-${firstDoorUseLatched ? "latched-forward" : phase}`;
      return normalizeAction({
        move: shouldUse ? "none" : (approaching || pressWindow || firstDoorUseAdvance || firstDoorUsePress || firstDoorUseLatched ? "forward" : "none"),
        turn: (shouldUse || firstDoorUsePress || firstDoorUseLatched) ? "none" : turnCommand,
        fire: false,
        strafe: false,
        use: shouldUse,
        run: false
      });
    }

    firstDoorUseLatchAdvanceAction() {
      const latchTotal = Math.max(24, Math.round(profileNumber(this.profile, "firstDoorUseLatchFrames", FIRST_DOOR_USE_LATCH_FRAMES)));
      const latchElapsed = Math.max(0, latchTotal - Number(this.firstDoorUseLatchFrames || 0));
      const latchUseProbe = latchElapsed < 18 || (latchElapsed % 18) < 5;
      if (latchElapsed >= 18 && this.shouldReprobeFirstDoorUse({ allowLatch: true })) {
        const reprobeFrames = profileNumber(this.profile, "firstDoorReprobeFrames", 36);
        this.startFirstDoorReprobe(reprobeFrames);
        return this.firstDoorReprobeAction(reprobeFrames);
      }

      this.cornerExitCommitFrames = 0;
      this.hardStuckEscapeFrames = 0;
      this.openStallEscapeFrames = 0;
      this.loopEscapeFrames = 0;
      this.recoveryFrames = 0;
      this.wallDetachFrames = 0;
      this.wallSurveyFrames = 0;
      this.mapRushCorrectionFrames = 0;
      this.mapRushCorrectionBackFrames = 0;
      this.mapDoorSweepFrames = 0;
      this.firstDoorCorridorSearchFrames = 0;
      this.wallUseProbeStage = Math.max(2, this.wallUseProbeStage || 2);
      this.wallUseProbeTurn = this.firstDoorProbeTurn("none");
      this.strategyPriority = 3;
      this.strategyContext = "semantic-first-door";
      this.controlPipeline = "FirstDoor";
      this.safetyReason = "first-door-use-latch";
      this.mobilityMode = "first-door-latched-forward";
      return normalizeAction({
        move: "forward",
        turn: "none",
        fire: false,
        strafe: false,
        use: latchUseProbe,
        run: false
      });
    }

    firstDoorCorridorSearchAction(totalFrames, backFrames, turnFrames) {
      const elapsed = Math.max(0, totalFrames - this.firstDoorCorridorSearchFrames);
      const turn = this.firstDoorCorridorSearchTurn || "right";
      this.strategyPriority = 2;
      this.safetyReason = "map-first-door-corridor-search";
      if (elapsed < backFrames) {
        this.mobilityMode = `first-door-search-back-${turn}`;
        return normalizeAction({
          move: "back",
          turn: oppositeTurn(turn),
          fire: false,
          strafe: false,
          use: false,
          run: false
        });
      }

      if (elapsed < backFrames + turnFrames) {
        this.mobilityMode = `first-door-search-scan-${turn}`;
        return normalizeAction({
          move: "none",
          turn,
          fire: false,
          strafe: false,
          use: false,
          run: false
        });
      }

      this.mobilityMode = `first-door-search-enter-${turn}`;
      return normalizeAction({
        move: "forward",
        turn,
        fire: false,
        strafe: false,
        use: false,
        run: true
      });
    }

    firstDoorCorridorTransitAction(sensor, turnDepth, turnStuckFrames, skirtFrames = FIRST_DOOR_CORRIDOR_SKIRT_FRAMES) {
      const blocked = Number(sensor?.depthSig ?? this.depthEstimate ?? 1) <= turnDepth;
      const forwardThreshold = profileNumber(this.profile, "motionForwardProgressThreshold", MOTION_FORWARD_PROGRESS_THRESHOLD);
      const obstacleThreshold = profileNumber(this.profile, "motionObstacleThreshold", MOTION_OBSTACLE_THRESHOLD);
      const turnSweepThreshold = profileNumber(this.profile, "motionTurnSweepThreshold", MOTION_TURN_SWEEP_THRESHOLD);
      const forwardIntent = this.motionIntent.includes("forward");
      const motionObstacle = forwardIntent
        && this.motionObstacleScore >= obstacleThreshold
        && this.motionForwardProgress <= forwardThreshold;
      const motionStalled = forwardIntent
        && this.motionStallScore >= 0.72
        && this.motionForwardProgress <= forwardThreshold * 0.75;
      const footObstacleStalled = forwardIntent
        && (this.priorFootObstacleScore >= 0.18 || Number(this.footObstacleBounceFrames || 0) >= 3)
        && (this.inputStallFrames >= 2 || Number(this.footObstacleFlickerScore || 0) >= 0.42);
      const cognitionStalled = forwardIntent
        && (this.movementSensorSnapshot?.eventType === "movement-stall"
          || Boolean(this.phainomenon?.sensorRecovery?.needed));
      const turningSweep = this.motionIntent.includes("turn") && this.motionTurnScore >= turnSweepThreshold;
      const stalled = this.quantizedStallFrames >= turnStuckFrames || this.stuckFrames >= turnStuckFrames || (blocked && motionStalled) || footObstacleStalled || cognitionStalled;
      const corridorStallTurn = stalled
        && (blocked || motionStalled || footObstacleStalled || cognitionStalled || Boolean(this.phainomenon?.stuck?.active));
      const shouldSkirt = !blocked
        && !turningSweep
        && (motionObstacle || footObstacleStalled || this.inputStallFrames >= 3 || this.quantizedStallFrames >= 2 || this.stuckFrames >= 2 || this.targetConfidence >= 0.24);
      const skirtPhase = skirtFrames > 0 && (this.predictions % Math.max(1, skirtFrames * 2)) < skirtFrames;
      this.strategyPriority = 2;
      this.controlPipeline = "FirstDoor";
      this.safetyReason = corridorStallTurn ? "corridor-stall-right" : (footObstacleStalled ? "corridor-foot-obstacle" : (motionObstacle ? "corridor-motion-obstacle" : "corridor-transit"));
      this.mobilityMode = corridorStallTurn
        ? "corridor-stall-right-turn"
        : (shouldSkirt && skirtPhase ? "corridor-skirt-left-obstacle" : "corridor-forward-hold");
      return normalizeAction({
        move: corridorStallTurn ? "none" : "forward",
        turn: corridorStallTurn ? "right" : (shouldSkirt && skirtPhase ? "left" : "none"),
        fire: false,
        strafe: !corridorStallTurn && shouldSkirt && skirtPhase,
        use: false,
        run: !corridorStallTurn && !(shouldSkirt && skirtPhase)
      });
    }

    resolveCombatContext(enemy, targetConfidence, hostileZoneSignal) {
      const trustedEnemy = getTrustedEnemyThreatFromCandidate(enemy);
      const trustedAlert = this.enemyAlertFrames > 0
        && !this.enemyStructuralDecoy
        && isTrustedEnemyCluster(this.enemyAlertCluster, this.enemyAlertDepth)
        && isTrustedEnemyDepth(this.enemyAlertCluster, this.enemyAlertDepth, this.enemyAlertPeakConfidence);
      return Boolean(hostileZoneSignal && (trustedEnemy >= 0.26 || trustedAlert))
        || trustedEnemy >= 0.36
        || (Number(targetConfidence || 0) >= 0.48 && trustedEnemy >= 0.24)
        || hasPostDoorEnemyMemoryEvidence(this)
        || trustedAlert
        || (Number(this.enemyConfidencePeak || 0) >= 0.56 && trustedEnemy >= 0.28)
        || (Number(this.combatFireFrames || 0) > 0 && trustedEnemy >= 0.2);
    }

    detectContextDiscontinuity(frame, state, quantizedFrameChange, regionQuantizedFrameChange, depthSignatureDistance, enemy) {
      const frameIndex = Number(state?.frame || this.predictions || 0);
      if (frameIndex < 80 || this.semanticContextResetCooldownFrames > 0 || this.healthLikelyDead) {
        return null;
      }

      const combatContext = this.resolveCombatContext(enemy, this.targetConfidence, this.mapEnemyZoneMatch || this.enemyAlertFrames > 0);
      if (combatContext) {
        const combatVisionBreak = Number(quantizedFrameChange || 0) >= 28
          && Number(regionQuantizedFrameChange || 0) >= 10;
        const dynamicInterference = Number(enemy?.confidence || 0) >= 0.32
          || Number(frame?.projectileScore || 0) >= 0.16
          || Number(this.enemyAlertFrames || 0) > 0;
        const uncontrolledMotion = Number(this.motionForwardProgress || 0) <= 0.1
          && Number(this.motionTurnScore || 0) <= 0.18;
        if (combatVisionBreak && dynamicInterference && uncontrolledMotion) {
          return "combat-visual-discontinuity";
        }
      }

      const turnIntent = this.motionIntent.includes("turn") || this.lastAction?.turn === "left" || this.lastAction?.turn === "right";
      const forwardIntent = this.motionIntent.includes("forward") || this.lastAction?.move === "forward";
      const calmMotor = !turnIntent
        && (!forwardIntent || Number(this.motionForwardProgress || 0) <= 0.08)
        && Number(this.motionTurnScore || 0) <= 0.12;
      const severeVisionBreak = Number(quantizedFrameChange || 0) >= 42
        && Number(regionQuantizedFrameChange || 0) >= 16;
      const depthBreak = Number(depthSignatureDistance || 0) >= 2.4;
      const lowDynamicInterference = Number(enemy?.confidence || 0) < 0.32
        && Number(frame?.projectileScore || 0) < 0.16
        && !this.soundCueActive;
      if (calmMotor && lowDynamicInterference && severeVisionBreak && depthBreak) {
        return "visual-context-discontinuity";
      }

      return null;
    }

    startCombatLocalRelocalization(reason, frame) {
      this.combatSurveyFrames = Math.max(this.combatSurveyFrames, Math.floor(CONTEXT_RESET_SURVEY_FRAMES * 0.45));
      this.combatSurveyTurn = chooseEscapeTurn(frame, this.turnBias);
      this.semanticContextResetCooldownFrames = Math.max(this.semanticContextResetCooldownFrames, Math.floor(CONTEXT_RESET_COOLDOWN_FRAMES * 0.6));
      this.contextResetReason = reason || "combat-local-relocalization";
      this.repeatActionFrames = 0;
      this.repeatTurnFrames = 0;
      this.repeatActionSignature = "";
      this.signatureMatchKind = "combat-relocalization";
      this.safetyReason = "combat-relocalization";
    }

    startSemanticContextReset(reason, frame) {
      this.semanticContextResetFrames = CONTEXT_RESET_SURVEY_FRAMES;
      this.semanticContextResetCooldownFrames = CONTEXT_RESET_COOLDOWN_FRAMES;
      this.contextResetReason = reason || "context-reset";
      this.wallSurveyFrames = Math.max(this.wallSurveyFrames, WALL_SURVEY_FRAMES);
      this.wallSurveyTurn = chooseEscapeTurn(frame, this.turnBias);
      this.wallSurveyDecisionFrames = 0;
      this.repeatActionFrames = 0;
      this.repeatTurnFrames = 0;
      this.repeatActionSignature = "";
      this.quantizedStallFrames = 0;
      this.stuckFrames = 0;
      this.signatureMatchKind = "context-reset";
      this.mapSectorId = this.doorOpenedCount > 0 || this.darkZoneEntered ? "context-reset-after-door" : "context-reset-survey";
      this.safetyReason = "context-reset";
    }

    wallDetachAction() {
      this.mobilityMode = "wall-detach";
      return normalizeAction({
        move: "forward",
        turn: this.wallDetachTurn,
        fire: false,
        strafe: true,
        use: false,
        run: true
      });
    }

    wallSurveyAction() {
      const backing = this.wallSurveyFrames > WALL_SURVEY_FRAMES - WALL_SURVEY_BACK_FRAMES;
      this.mobilityMode = "wall-survey";
      return normalizeAction({
        move: backing ? "back" : "none",
        turn: this.wallSurveyTurn,
        fire: false,
        strafe: true,
        use: false,
        run: false
      });
    }

    combatSurveyAction() {
      this.mobilityMode = "combat-survey";
      return normalizeAction({
        move: "none",
        turn: this.combatSurveyTurn,
        fire: false,
        strafe: false,
        use: false,
        run: false
      });
    }

    openViewExploreAction(frame) {
      this.mobilityMode = "open-explore";
      return normalizeAction({
        move: "forward",
        turn: chooseOpenViewTurn(frame, this.turnBias),
        fire: false,
        strafe: true,
        use: false,
        run: true
      });
    }

    openAdvanceAction(frame) {
      this.mobilityMode = "open-advance";
      return normalizeAction({
        move: "forward",
        turn: chooseOpenAdvanceTurn(frame),
        fire: false,
        strafe: false,
        use: false,
        run: true
      });
    }

    cornerRecoveryAction() {
      const reversing = this.recoveryFrames > CORNER_RECOVERY_FRAMES - CORNER_REVERSAL_FRAMES;
      this.mobilityMode = "escape";
      return normalizeAction({
        move: reversing ? "back" : "none",
        turn: this.recoveryTurn,
        fire: false,
        strafe: true,
        use: false,
        run: false
      });
    }

    loopEscapeAction() {
      this.mobilityMode = "loop-escape";
      return normalizeAction({
        move: "forward",
        turn: this.loopEscapeTurn,
        fire: false,
        strafe: true,
        use: false,
        run: true
      });
    }

    soundSourceAction(soundCue) {
      const direction = soundCue.direction === "right" ? "right" : (soundCue.direction === "left" ? "left" : this.turnBias);
      this.mobilityMode = "sound-hunt";
      return normalizeAction({
        move: "forward",
        turn: direction,
        fire: false,
        strafe: true,
        use: false,
        run: true
      });
    }

    enemyLockAction(action, frame, state) {
      const fire = ((state?.frame || 0) % 3) === 0;
      const turn = targetTurnDirection(frame);
      const confidence = Math.max(
        Number(this.targetConfidence || 0),
        Number(this.enemyConfidence || 0),
        Number(this.enemyCenterCellConfidence || 0));
      this.enemyFireReady = fire;
      if (fire) {
        this.combatFireFrames += 1;
        this.enemyConfidencePeak = Math.max(this.enemyConfidencePeak, confidence);
        this.enemyDropFrames = 0;
      }

      this.mobilityMode = "enemy-lock";
      return normalizeAction(Object.assign({}, action, {
        move: fire ? "none" : "forward",
        turn,
        fire,
        strafe: false,
        use: false,
        run: false
      }));
    }

    combatAction(action, frame, state, enemy, faceDelta) {
      const fireConfidence = profileNumber(this.profile, "combatFireConfidence", COMBAT_FIRE_CONFIDENCE);
      const closeDepth = profileNumber(this.profile, "combatCloseDepth", COMBAT_CLOSE_DEPTH_THRESHOLD);
      const ammoState = estimateAmmoState(frame.ammoSample, quantizeFrameSample(frame.ammoSample));
      const centerCellLocked = Number(enemy.centerCellConfidence || 0) >= fireConfidence;
      const centered = enemy.centered || enemy.turn === "none" || centerCellLocked;
      const closeEnough = enemy.distance <= closeDepth;
      const stableEnough = faceDelta <= COMBAT_FACE_DANGER_DELTA || enemy.confidence >= fireConfidence + 0.12;
      const burstWindow = Math.max(12, Math.round(profileNumber(this.profile, "combatBurstFrames", COMBAT_BURST_FRAMES)));
      const burstShots = Math.max(1, Math.round(profileNumber(this.profile, "combatBurstShots", COMBAT_BURST_SHOTS)));
      if (centered && closeEnough && enemy.confidence >= fireConfidence && this.combatBurstFrames <= 0) {
        this.combatBurstFrames = burstWindow;
        this.combatBurstShots = burstShots;
      }

      const burstElapsed = Math.max(0, burstWindow - this.combatBurstFrames);
      const burstInterval = Math.max(7, Math.floor(burstWindow / Math.max(1, burstShots)));
      const burstFrame = this.combatBurstFrames > 0
        && this.combatBurstShots > 0
        && (burstElapsed % burstInterval) === 0;
      const fire = !ammoState.likelyEmpty
        && (enemy.confidence >= fireConfidence || centerCellLocked)
        && centered
        && closeEnough
        && stableEnough
        && burstFrame;

      this.enemyFireReady = fire;
      if (fire) {
        this.combatFireFrames += 1;
        this.combatBurstShots = Math.max(0, this.combatBurstShots - 1);
      }
      if (this.combatBurstFrames > 0) {
        this.combatBurstFrames -= 1;
      }
      this.mobilityMode = fire ? "combat-fire" : "combat-aim";
      const strafeSide = enemy.turn === "right" ? "left" : "right";
      return normalizeAction(Object.assign({}, action, {
        move: ammoState.likelyEmpty ? "forward" : (closeEnough ? "none" : "forward"),
        turn: centerCellLocked ? "none" : enemy.turn,
        fire,
        strafe: true,
        strafeSide,
        use: false,
        run: ammoState.likelyEmpty || !centered
      }));
    }

    combatAlertAction(action, frame, state) {
      const direction = this.enemyAlertTurn === "left" || this.enemyAlertTurn === "right"
        ? this.enemyAlertTurn
        : targetTurnDirection(frame);
      const centered = direction === "none" || Math.abs((frame.left || 0) - (frame.right || 0)) < 18;
      const burstFrame = ((state?.frame || 0) % 3) === 0;
      const alertPeakThreshold = profileNumber(this.profile, "combatAlertPeakConfidence", COMBAT_ALERT_PEAK_CONFIDENCE);
      const cluster = String(this.enemyAlertCluster || "none");
      const trustedEnemyCluster = isTrustedEnemyCluster(cluster, this.enemyAlertDepth);
      const trustedDepth = isTrustedEnemyDepth(cluster, this.enemyAlertDepth, this.enemyAlertPeakConfidence);
      const trustedEnemyZone = this.darkZoneEntered
        && this.mapEnemyZoneMatch
        && !this.enemyStructuralDecoy
        && trustedDepth
        && Number(this.enemyAlertPeakConfidence || 0) >= alertPeakThreshold
        && trustedEnemyCluster;
      const fire = trustedEnemyZone && centered && burstFrame;
      const strafeSide = direction === "right" ? "left" : "right";

      this.enemyAlertFrames = Math.max(0, this.enemyAlertFrames - 1);
      this.mobilityMode = fire ? "combat-alert-fire" : `combat-alert-hold-${direction}`;
      if (fire) {
        this.combatFireFrames += 1;
      }

      return normalizeAction(Object.assign({}, action, {
        move: "none",
        turn: direction,
        fire,
        strafe: !centered,
        strafeSide,
        use: false,
        run: false
      }));
    }

    centralHallEnemySweepAction(action, frame, state) {
      const plan = requireCombatRouteCognition("planCentralHallEnemySweep")({
        action,
        ammoLikelyEmpty: this.ammoLikelyEmpty,
        defaultSweepFrames: profileNumber(this.profile, "centralHallEnemySweepFrames", 72),
        depth: this.depthEstimate,
        enemyCenterCellConfidence: this.enemyCenterCellConfidence,
        enemyConfidence: this.enemyConfidence,
        enemyStructuralDecoy: this.enemyStructuralDecoy,
        trustedCombatEvidence: hasTrustedCombatEvidence(this),
        trustedEnemyThreat: getTrustedEnemyThreat(this),
        fireCooldown: this.fireCooldown,
        frameIndex: state?.frame,
        inputStallFrames: this.inputStallFrames,
        left: frame?.left,
        motionStallScore: this.motionStallScore,
        right: frame?.right,
        sweepFrames: this.centralHallEnemySweepFrames,
        sweepTurn: this.centralHallEnemySweepTurn,
        targetConfidence: this.targetConfidence,
        targetTurn: targetTurnDirection(frame)
      });

      this.centralHallEnemySweepFrames = plan.sweepFrames;
      this.centralHallEnemySweepTurn = plan.sweepTurn;
      if (plan.probeFire) {
        this.combatFireFrames += 1;
        this.enemyFireReady = true;
        this.enemyConfidencePeak = Math.max(this.enemyConfidencePeak, plan.frontConfidence);
        this.enemyDropFrames = 0;
      }

      this.strategyPriority = plan.strategyPriority;
      this.strategyContext = plan.strategyContext;
      this.controlPipeline = plan.controlPipeline;
      this.mobilityMode = plan.mobilityMode;
      return normalizeAction(Object.assign({}, action, plan.action));
    }

    wallFollowAction(action, frame, state) {
      this.wallFollowSide = chooseWallHugSide(frame, this.wallFollowSide);
      const awaySide = oppositeTurn(this.wallFollowSide);
      this.mobilityMode = `wall-follow-${this.wallFollowSide}`;
      return this.strafeRunAction(action, state, awaySide, `wall-follow-${this.wallFollowSide}`);
    }

    wallHugAction(action, frame, state) {
      this.wallHugSide = chooseWallHugSide(frame, this.wallHugSide);
      const awaySide = oppositeTurn(this.wallHugSide);
      return this.strafeRunAction(action, state, awaySide, `wall-away-${awaySide}`);
    }

    updateCombatMilestones(enemy) {
      if (this.centralHallEntered && Number(this.enemyDefeatedCount || 0) <= 0 && !this.ammoLikelyEmpty) {
        const frontConfidence = Math.max(
          Number(enemy?.confidence || 0),
          Number(this.targetConfidence || 0),
          Number(this.enemyCenterCellConfidence || 0));
        if (frontConfidence >= 0.22 || this.enemyFireReady) {
          this.enemyConfidencePeak = Math.max(this.enemyConfidencePeak, frontConfidence);
          this.enemyDropFrames = 0;
          return;
        }

        const hadFrontEngagement = this.combatFireFrames >= 8 && this.enemyConfidencePeak >= 0.22;
        if (!hadFrontEngagement) {
          return;
        }

        if (frontConfidence <= 0.14) {
          this.enemyDropFrames += 1;
        } else {
          this.enemyDropFrames = Math.max(0, this.enemyDropFrames - 1);
        }

        if (this.enemyDropFrames >= 16) {
          this.enemyDefeatedCount += 1;
          this.combatFireFrames = 0;
          this.enemyConfidencePeak = 0;
          this.enemyDropFrames = 0;
          this.enemyAlertFrames = 0;
          this.safetyReason = "central-hall-front-enemy-defeated";
        }

        return;
      }

      if (!this.darkZoneEntered) {
        this.enemyConfidencePeak = 0;
        this.enemyDropFrames = 0;
        return;
      }

      if (!this.mapEnemyZoneMatch
        || !isTrustedEnemyDepth(this.enemyAlertCluster, this.enemyAlertDepth, this.enemyAlertPeakConfidence)
        || Number(this.enemyAlertPeakConfidence || 0) < profileNumber(this.profile, "combatAlertPeakConfidence", COMBAT_ALERT_PEAK_CONFIDENCE)
        || !isTrustedEnemyCluster(this.enemyAlertCluster, this.enemyAlertDepth)) {
        this.enemyDropFrames = 0;
        return;
      }

      if (this.ammoLikelyEmpty || enemy.cluster === "green") {
        this.combatFireFrames = 0;
        this.enemyDropFrames = 0;
        return;
      }

      const fireConfidence = profileNumber(this.profile, "combatFireConfidence", COMBAT_FIRE_CONFIDENCE);
      if (enemy.confidence >= fireConfidence) {
        if (enemy.cluster !== "none") {
          this.enemyConfidencePeak = Math.max(this.enemyConfidencePeak, enemy.confidence);
        }
        this.enemyDropFrames = 0;
        return;
      }

      const hadEngagement = this.combatFireFrames >= 16 && this.enemyConfidencePeak >= Math.max(0.68, fireConfidence + 0.14);
      if (!hadEngagement) {
        return;
      }

      if (enemy.confidence <= 0.24) {
        this.enemyDropFrames += 1;
      } else {
        this.enemyDropFrames = Math.max(0, this.enemyDropFrames - 1);
      }

      if (this.enemyDropFrames >= 22) {
        this.enemyDefeatedCount += 1;
        this.combatFireFrames = 0;
        this.enemyConfidencePeak = 0;
        this.enemyDropFrames = 0;
      }
    }

    strafeRunAction(action, state, forcedSide, mode) {
      const frame = state?.frame || 0;
      const side = forcedSide || (Math.floor(frame / STRAFE_RUN_CYCLE_FRAMES) % 2 === 0 ? "left" : "right");
      this.mobilityMode = mode || `strafe-run-${side}`;
      return normalizeAction(Object.assign({}, action, {
        move: "forward",
        turn: side,
        fire: false,
        strafe: true,
        use: false,
        run: true
      }));
    }

    updateBreadcrumbTrail(state, frame) {
      const frameIndex = state?.frame || 0;
      if (frameIndex % BREADCRUMB_SAMPLE_INTERVAL !== 0) {
        return false;
      }

      const point = breadcrumbPoint(state, frame);
      this.breadcrumbTrail.push(point);
      while (this.breadcrumbTrail.length > BREADCRUMB_WINDOW) {
        this.breadcrumbTrail.shift();
      }

      if (this.breadcrumbTrail.length < Math.min(18, BREADCRUMB_WINDOW)) {
        return false;
      }

      let visits = 0;
      for (let index = 0; index < this.breadcrumbTrail.length - 4; index += 1) {
        if (distance(point, this.breadcrumbTrail[index]) <= LOOP_VISIT_RADIUS) {
          visits += 1;
        }
      }

      return visits >= LOOP_VISIT_THRESHOLD;
    }
  }

  function buildAutoplayFrameFeatures(controller, normalized, state, frame) {
    const quantizedSample = quantizeFrameSample(frame.sample);
    const quantizedRegions = quantizeFrameSample(frame.regionSample);
    const quantizedRegion9 = quantizeFrameSample(frame.region9Sample);
    const quantizedVision9x9 = quantizeFrameSample(frame.vision9x9Sample);
    const previous = selectBobFilteredPreviousFrame(controller.frameHistory, quantizedRegion9) || controller.previousFrame;
    const frameChange = previous ? averageSampleDelta(previous.sample, frame.sample) : 255;
    const quantizedFrameChange = previous?.quantizedSample ? averageSampleDelta(previous.quantizedSample, quantizedSample) : 255;
    const regionQuantizedFrameChange = previous?.quantizedRegions ? averageSampleDelta(previous.quantizedRegions, quantizedRegions) : 255;
    const region9QuantizedFrameChange = previous?.quantizedRegion9 ? averageSampleDelta(previous.quantizedRegion9, quantizedRegion9) : 255;
    const motion = analyzeRegion9Motion(previous?.quantizedRegion9, quantizedRegion9, controller.lastAction);
    const quantizedStatusBar = quantizeFrameSample(frame.statusSample);
    const statusBarQuantizedFrameChange = previous?.quantizedStatusBar ? averageSampleDelta(previous.quantizedStatusBar, quantizedStatusBar) : 255;
    const quantizedDepth = quantizeFrameSample(frame.depthSample);
    const depthSignatureDistance = nearestSignatureDistance(quantizedDepth, controller.depthSignatureMemory);
    const depthEstimate = estimateDepthDistance(frame.depthSample);
    const mapHints = state?.mapHints || null;
    const quantizedFace = quantizeFrameSample(frame.faceSample);
    const quantizedAmmo = quantizeFrameSample(frame.ammoSample);
    const ammoState = estimateAmmoState(frame.ammoSample, quantizedAmmo);
    const quantizedHealth = quantizeFrameSample(frame.healthSample);
    const healthSensorEnabled = sensorEnabled(state?.sensors, "health");
    const rawHealthState = Object.assign(
      estimateHealthState(frame.healthSample, quantizedHealth),
      {
        deathTintScore: clamp01(Number(frame.healthDeathTintScore ?? frame.deathTintScore ?? 0)),
        statusDeathTintScore: clamp01(Number(frame.healthStatusDeathTintScore ?? 0)),
        faceDeathTintScore: clamp01(Number(frame.healthFaceDeathTintScore ?? 0))
      });
    const rawFaceQuantizedFrameChange = previous?.quantizedFace ? averageSampleDelta(previous.quantizedFace, quantizedFace) : 255;
    const faceQuantizedFrameChange = healthSensorEnabled ? rawFaceQuantizedFrameChange : 255;
    const visualStallDelta = Math.min(quantizedFrameChange, regionQuantizedFrameChange, region9QuantizedFrameChange);
    const faceDeathScore = healthSensorEnabled
      ? Math.max(estimateFaceDeathScore(quantizedFace), rawHealthState.faceDeathTintScore * 0.75)
      : 0;
    const healthState = healthSensorEnabled
      ? refineHealthState(rawHealthState, faceDeathScore, faceQuantizedFrameChange, visualStallDelta)
      : createDisabledHealthState(rawHealthState.signature);
    const wallPressure = Math.abs((frame.left || 0) - (frame.right || 0)) + Math.max(0, (frame.lowerCenter || 0) - (frame.topCenter || 0));
    const preDoorPhase = controller.doorOpenedCount <= 0;
    const targetConfidence = preDoorPhase ? 0 : estimateTargetConfidence(frame);
    let enemy = estimateEnemyPresence(frame);
    if (preDoorPhase) {
      enemy = {
        confidence: 0,
        turn: "none",
        centered: false,
        distance: 1,
        cluster: "none",
        centerCellConfidence: 0,
        fireReady: false
      };
    }

    const quantizedStable = visualStallDelta <= QUANTIZED_STALL_THRESHOLD;
    const wallLike = looksLikeWall(frame);
    const signatureMatch = controller.matchVisualSignature(quantizedSample);
    const knownDepth = depthSignatureDistance <= SIGNATURE_DEPTH_MATCH_THRESHOLD;
    const movementIntent = normalized.move !== "none" || normalized.turn !== "none" || normalized.strafe || normalized.run;
    const rawCornerSignal = estimateCornerSignal(frame, frameChange, visualStallDelta, wallPressure, wallLike);
    const navigableView = looksLikeNavigableView(frame, depthEstimate, rawCornerSignal);
    const openView = looksLikeOpenView(frame, depthEstimate, targetConfidence) || navigableView;
    let effectiveTargetConfidence = navigableView ? Math.min(targetConfidence, 0.35) : targetConfidence;
    const dictionarySuppressed = controller.cornerSuppressFrames > 0 || openView;
    const doorApproachDepth = profileNumber(controller.profile, "doorApproachDepth", Math.max(DOOR_USE_DEPTH_THRESHOLD, 0.86));
    const knownWall = !dictionarySuppressed
      && (((signatureMatch.kind === "wall" || signatureMatch.kind === "corner") && depthEstimate <= doorApproachDepth)
        || (knownDepth && depthEstimate <= DOOR_USE_DEPTH_THRESHOLD));
    const knownCorner = !dictionarySuppressed && signatureMatch.kind === "corner";
    const cornerSignal = dictionarySuppressed ? Math.min(rawCornerSignal, 0.35) : rawCornerSignal;
    const cornerTrap = !dictionarySuppressed && cornerSignal >= CORNER_SIGNAL_THRESHOLD;
    const pinnedWall = movementIntent && (quantizedStable || knownWall) && (wallPressure > STUCK_WALL_THRESHOLD * 0.35 || wallLike || cornerTrap || knownWall);
    const cornered = looksLikeCorner(frame, Math.min(frameChange, visualStallDelta)) || cornerTrap || knownCorner;
    const looped = controller.updateBreadcrumbTrail(state, frame);
    const soundCue = resolveSoundCue(state);
    let auditorySnapshot = buildAuditorySnapshot(state);
    auditorySnapshot = classifyUseAuditoryResponse(controller, auditorySnapshot, {
      quantizedFrameChange,
      regionQuantizedFrameChange,
      visualStallDelta,
      depthEstimate
    });
    const staticMapDoorBias = Boolean(mapHints?.doorLines || mapHints?.switchLines);
    const staticGateCandidate = !soundCue
      && !openView
      && depthEstimate <= (staticMapDoorBias ? Math.max(doorApproachDepth, 0.9) : doorApproachDepth)
      && visualStallDelta <= QUANTIZED_STALL_THRESHOLD + (staticMapDoorBias ? 0.75 : 0.45)
      && faceQuantizedFrameChange <= COMBAT_FACE_DANGER_DELTA
      && (wallLike || knownWall || signatureMatch.kind === "wall" || signatureMatch.kind === "corner")
      && (enemy.cluster === "brown" || enemy.cluster === "gray" || enemy.distance >= 0.76);
    if (staticGateCandidate) {
      enemy = Object.assign({}, enemy, {
        confidence: Math.min(enemy.confidence, 0.24),
        turn: "none",
        fireReady: false,
        cluster: enemy.cluster === "none" ? "gate" : `gate-${enemy.cluster}`
      });
      effectiveTargetConfidence = Math.min(effectiveTargetConfidence, 0.28);
    }

    const sensor = buildSensorFusionPacket({
      frame,
      depthEstimate,
      faceQuantizedFrameChange,
      knownWall,
      knownCorner,
      cornered,
      cornerTrap,
      wallLike,
      openView,
      navigableView,
      soundCue,
      stuckFrames: controller.stuckFrames,
      quantizedStallFrames: controller.quantizedStallFrames,
      quantizedFrameChange,
      regionQuantizedFrameChange,
      motion
    });

    return {
      quantizedSample,
      quantizedRegions,
      quantizedRegion9,
      quantizedVision9x9,
      previous,
      frameChange,
      quantizedFrameChange,
      regionQuantizedFrameChange,
      region9QuantizedFrameChange,
      motion,
      quantizedStatusBar,
      statusBarQuantizedFrameChange,
      quantizedDepth,
      depthSignatureDistance,
      depthEstimate,
      mapHints,
      quantizedFace,
      quantizedAmmo,
      ammoState,
      quantizedHealth,
      healthSensorEnabled,
      faceQuantizedFrameChange,
      visualStallDelta,
      faceDeathScore,
      healthState,
      wallPressure,
      targetConfidence,
      enemy,
      quantizedStable,
      wallLike,
      signatureMatch,
      knownDepth,
      knownWall,
      knownCorner,
      movementIntent,
      rawCornerSignal,
      navigableView,
      openView,
      effectiveTargetConfidence,
      dictionarySuppressed,
      doorApproachDepth,
      cornerSignal,
      cornerTrap,
      pinnedWall,
      cornered,
      looped,
      soundCue,
      auditorySnapshot,
      sensor
    };
  }

  function updateAutoplaySensorState(controller, features, state, frame, action) {
    const {
      quantizedRegions,
      quantizedRegion9,
      quantizedVision9x9,
      previous,
      quantizedFrameChange,
      regionQuantizedFrameChange,
      motion,
      quantizedDepth,
      depthSignatureDistance,
      depthEstimate,
      quantizedFace,
      ammoState,
      healthSensorEnabled,
      faceQuantizedFrameChange,
      faceDeathScore,
      healthState,
      cornerSignal,
      signatureMatch,
      soundCue,
      enemy,
      effectiveTargetConfidence,
      auditorySnapshot
    } = features;

    controller.targetConfidence = clamp01(Math.max(effectiveTargetConfidence, enemy.confidence));
    controller.soundCueActive = Boolean(soundCue);
    controller.quantizedFrameChange = quantizedFrameChange;
    controller.regionQuantizedFrameChange = regionQuantizedFrameChange;
    controller.statusBarQuantizedFrameChange = features.statusBarQuantizedFrameChange;
    controller.regionSignature = regionSignature(quantizedRegions);
    controller.region9Signature = regionSignature(quantizedRegion9);
    controller.vision9x9Signature = regionSignature(quantizedVision9x9).padEnd(VISION_GRID_COLUMNS * VISION_GRID_ROWS, "0").slice(0, VISION_GRID_COLUMNS * VISION_GRID_ROWS);
    controller.motion9Signature = motion.signature;
    controller.motion9Delta = motion.delta;
    controller.motionForwardProgress = motion.forwardProgress;
    controller.motionObstacleScore = motion.obstacleScore;
    controller.motionTurnScore = motion.turnScore;
    controller.motionEntranceScore = motion.entranceScore;
    controller.motionStallScore = motion.stallScore;

    const footObstacleScore = clamp01(Number(frame.footObstacleScore || 0));
    controller.footObstacleScore = footObstacleScore;
    const footObstacleBandDelta = previous?.footObstacleBandSample
      ? averageSampleDelta(previous.footObstacleBandSample, frame.footObstacleBandSample || [])
      : 0;
    controller.footObstacleBandDelta = footObstacleBandDelta;
    const footObstacleMemory = Math.max(footObstacleScore, controller.priorFootObstacleScore * 0.82);
    controller.priorFootObstacleScore = footObstacleMemory;
    const lastForwardIntent = controller.lastAction?.move === "forward" || controller.lastAction?.moveForward === true;
    const footObstacleFlicker = clamp01((footObstacleBandDelta / 7.5) * 0.7 + footObstacleMemory * 0.35);
    const footBounceStallEvidence = lastForwardIntent
      && footObstacleFlicker >= 0.42
      && controller.motionForwardProgress <= profileNumber(controller.profile, "motionForwardProgressThreshold", MOTION_FORWARD_PROGRESS_THRESHOLD) * 0.9;
    controller.footObstacleFlickerScore = footObstacleFlicker;
    if (footBounceStallEvidence) {
      controller.footObstacleBounceFrames = Math.min(MAX_STUCK_COUNTER, Number(controller.footObstacleBounceFrames || 0) + 1);
    } else {
      controller.footObstacleBounceFrames = Math.max(0, Number(controller.footObstacleBounceFrames || 0) - 1);
    }

    if (lastForwardIntent
      && ((controller.motionForwardProgress <= profileNumber(controller.profile, "motionForwardProgressThreshold", MOTION_FORWARD_PROGRESS_THRESHOLD) * 0.55
        && controller.regionQuantizedFrameChange <= QUANTIZED_STALL_THRESHOLD + 0.08)
        || controller.footObstacleBounceFrames >= 2)) {
      controller.inputStallFrames = Math.min(MAX_STUCK_COUNTER, controller.inputStallFrames + 1);
    } else {
      controller.inputStallFrames = Math.max(0, controller.inputStallFrames - 1);
    }

    controller.motionIntent = motion.intent;
    controller.depthSignature = regionSignature(quantizedDepth);
    controller.depthEstimate = depthEstimate;
    controller.faceSignature = regionSignature(quantizedFace);
    controller.faceQuantizedFrameChange = faceQuantizedFrameChange;
    controller.cornerSignal = cornerSignal;
    controller.signatureMatchKind = signatureMatch.kind;
    controller.signatureMatchDistance = signatureMatch.distance;
    controller.depthSignatureDistance = depthSignatureDistance;
    controller.enemyConfidence = enemy.confidence;
    controller.enemyTurn = enemy.turn;
    controller.enemyDistance = enemy.distance;
    controller.enemyCluster = enemy.cluster;
    controller.enemyStructuralDecoy = Boolean(enemy.structuralDecoy);
    controller.enemyFireReady = enemy.fireReady;
    controller.enemyCenterCellConfidence = enemy.centerCellConfidence || 0;
    controller.enemyAllRegionPeak = enemy.allRegionPeak || 0;
    controller.enemyLateralBias = enemy.lateralBias || 0;
    controller.darkAreaScore = clamp01(Number(frame.darkAreaScore || 0));
    controller.gameplayLuma = Number(frame.gameplayLuma || 0);
    controller.blueFloorScore = clamp01(Number(frame.blueFloorScore || 0));
    controller.courtyardScore = clamp01(Number(frame.courtyardScore || 0));
    controller.courtyardTurn = frame.courtyardTurn === "left" || frame.courtyardTurn === "right" ? frame.courtyardTurn : "none";
    controller.spawnSecretDoorScore = clamp01(Number(frame.spawnSecretDoorScore || 0));
    controller.spawnSecretDoorTurn = frame.spawnSecretDoorTurn === "left" || frame.spawnSecretDoorTurn === "right" ? frame.spawnSecretDoorTurn : "none";
    controller.spawnWestStairScore = clamp01(Number(frame.spawnWestStairScore || 0));
    controller.spawnWestStairTurn = frame.spawnWestStairTurn === "left" || frame.spawnWestStairTurn === "right" ? frame.spawnWestStairTurn : "none";
    controller.spawnCenterAnchorScore = clamp01(Number(frame.spawnCenterAnchorScore || 0));
    controller.spawnCenterAnchorTurn = frame.spawnCenterAnchorTurn === "left" || frame.spawnCenterAnchorTurn === "right" ? frame.spawnCenterAnchorTurn : "right";
    const routeHint = resolveSpawnLandmarkRouteHint(controller, frame);
    controller.spawnLandmarkRouteEvidence = routeHint.evidence;
    controller.spawnLandmarkRouteTurn = routeHint.turn;
    controller.spawnLandmarkRouteKind = routeHint.kind;
    controller.spawnLandmarkRouteFrames = routeHint.evidence >= 0.28
      ? Math.min(MAX_STUCK_COUNTER, Number(controller.spawnLandmarkRouteFrames || 0) + 1)
      : Math.max(0, Number(controller.spawnLandmarkRouteFrames || 0) - 1);
    controller.spawnCorridorGapScore = clamp01(Number(frame.spawnCorridorGapScore || 0));
    controller.spawnCorridorGapTurn = frame.spawnCorridorGapTurn === "left" || frame.spawnCorridorGapTurn === "right" ? frame.spawnCorridorGapTurn : "none";
    controller.bridgeBrownScore = clamp01(Number(frame.bridgeBrownScore || 0));
    controller.bridgeGreenLeft = clamp01(Number(frame.bridgeGreenLeft || 0));
    controller.bridgeGreenCenter = clamp01(Number(frame.bridgeGreenCenter || 0));
    controller.bridgeGreenRight = clamp01(Number(frame.bridgeGreenRight || 0));
    controller.bridgeLaneTurn = frame.bridgeLaneTurn === "left" || frame.bridgeLaneTurn === "right" ? frame.bridgeLaneTurn : "none";
    controller.bridgeDoorScore = clamp01(Number(frame.bridgeDoorScore || 0));
    controller.computerBlueScore = clamp01(Number(frame.computerBlueScore || 0));
    controller.computerRedLightScore = clamp01(Number(frame.computerRedLightScore || 0));
    controller.computerDarkPanelScore = clamp01(Number(frame.computerDarkPanelScore || 0));
    controller.computerPanelScore = clamp01(Number(frame.computerPanelScore || 0));
    controller.computerRoomScore = clamp01(Number(frame.computerRoomScore || 0));

    updateEnemyAlertState(controller, frame, enemy, effectiveTargetConfidence, ammoState, faceQuantizedFrameChange);

    controller.ammoSignature = ammoState.signature;
    controller.ammoLikelyEmpty = ammoState.likelyEmpty;
    controller.healthSignature = healthState.signature;
    controller.healthLikelyDead = healthState.likelyDead;
    controller.healthZeroScore = healthState.zeroScore || 0;
    controller.healthActiveColumns = healthState.activeColumns || 0;
    controller.healthActiveCells = healthState.activeCells || 0;
    controller.healthDeathTintScore = healthState.deathTintScore || 0;
    controller.healthStatusDeathTintScore = healthState.statusDeathTintScore || 0;
    controller.healthFaceDeathTintScore = healthState.faceDeathTintScore || 0;
    controller.healthEstimatedPercent = Number.isFinite(Number(healthState.estimatedPercent))
      ? Math.max(0, Math.min(100, Math.round(Number(healthState.estimatedPercent))))
      : 100;
    controller.healthSensorSnapshot = createHealthSensorSnapshot({
      active: healthSensorEnabled,
      likelyDead: controller.healthLikelyDead,
      zeroScore: controller.healthZeroScore,
      deathTintScore: controller.healthDeathTintScore,
      statusDeathTintScore: controller.healthStatusDeathTintScore,
      faceDeathTintScore: controller.healthFaceDeathTintScore,
      activeColumns: controller.healthActiveColumns,
      activeCells: controller.healthActiveCells,
      estimatedPercent: controller.healthEstimatedPercent,
      value: controller.healthEstimatedPercent,
      health: controller.healthEstimatedPercent,
      lowHealthThreshold: profileNumber(controller.profile, "lowHealthThreshold", 50),
      signature: controller.healthSignature,
      faceSignature: controller.faceSignature,
      faceDeathScore,
      faceQuantizedFrameChange,
      freezeScore: healthState.freezeScore,
      retryReason: healthState.retryReason,
      timestamp: state?.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    });
    controller.auditorySnapshot = auditorySnapshot;
    controller.spatialSnapshot = buildSpatialSnapshot(state, auditorySnapshot);
    refreshSensorCognition(controller, state, frame, {
      quantizedVision9x9,
      motion,
      auditorySnapshot,
      action
    });
  }

  function updateEnemyAlertState(controller, frame, enemy, effectiveTargetConfidence, ammoState, faceQuantizedFrameChange) {
    if (controller.doorOpenedCount > 0 && !ammoState.likelyEmpty) {
      const alertConfidence = Math.max(enemy.confidence, effectiveTargetConfidence);
      const alertPeakThreshold = profileNumber(controller.profile, "combatAlertPeakConfidence", COMBAT_ALERT_PEAK_CONFIDENCE);
      const alertFrames = profileNumber(controller.profile, "combatAlertFrames", COMBAT_ALERT_FRAMES);
      const trustedEnemyAlert = isTrustedEnemyCluster(enemy.cluster, enemy.distance)
        && isTrustedEnemyDepth(enemy.cluster, enemy.distance, alertConfidence, enemy.centerCellConfidence)
        && !enemy.structuralDecoy;
      if (trustedEnemyAlert
        && ((alertConfidence >= 0.46 || controller.enemyConfidencePeak >= alertPeakThreshold)
          || faceQuantizedFrameChange >= COMBAT_FACE_DANGER_DELTA)) {
        const previousAlertActive = controller.enemyAlertFrames > 0;
        controller.enemyAlertFrames = alertFrames;
        controller.enemyAlertTurn = enemy.turn !== "none" ? enemy.turn : (decodeFaceDirection(frame.faceSample, faceQuantizedFrameChange) < 0 ? "left" : "right");
        controller.enemyAlertCluster = enemy.cluster || "none";
        controller.enemyAlertDepth = previousAlertActive
          ? Math.min(Number(controller.enemyAlertDepth || 1), Number(enemy.distance ?? 1))
          : Number(enemy.distance ?? 1);
        controller.enemyAlertPeakConfidence = Math.max(controller.enemyAlertPeakConfidence, alertConfidence, controller.enemyConfidencePeak);
      } else {
        controller.enemyAlertFrames = Math.max(0, controller.enemyAlertFrames - 1);
      }
    } else {
      controller.enemyAlertFrames = 0;
      controller.enemyAlertCluster = "none";
      controller.enemyAlertDepth = 1;
      controller.enemyAlertPeakConfidence = 0;
    }
  }

  function resolveSpawnLandmarkRouteHint(controller, frame) {
    const gapScore = clamp01(Number(frame?.spawnCorridorGapScore || controller?.spawnCorridorGapScore || 0));
    const centerAnchorScore = clamp01(Number(frame?.spawnCenterAnchorScore || controller?.spawnCenterAnchorScore || 0));
    const courtyardScore = clamp01(Number(frame?.courtyardScore || controller?.courtyardScore || 0));
    const secretScore = clamp01(Number(frame?.spawnSecretDoorScore || controller?.spawnSecretDoorScore || 0));
    const westStairScore = clamp01(Number(frame?.spawnWestStairScore || controller?.spawnWestStairScore || 0));
    const candidates = [
      {
        kind: "corridor-gap",
        evidence: gapScore,
        turn: frame?.spawnCorridorGapTurn === "left" || frame?.spawnCorridorGapTurn === "right" ? frame.spawnCorridorGapTurn : "right"
      },
      {
        kind: "spawn-center-anchor",
        evidence: centerAnchorScore,
        turn: frame?.spawnCenterAnchorTurn === "left" || frame?.spawnCenterAnchorTurn === "right" ? frame.spawnCenterAnchorTurn : "right"
      },
      {
        kind: "east-window-anchor",
        evidence: courtyardScore * 0.82,
        turn: "left"
      },
      {
        kind: "secret-door-anchor",
        evidence: secretScore * 0.78,
        turn: "left"
      },
      {
        kind: "west-stair-anchor",
        evidence: westStairScore * 0.78,
        turn: "right"
      }
    ];
    let best = candidates[0];
    for (let index = 1; index < candidates.length; index += 1) {
      if (candidates[index].evidence > best.evidence) {
        best = candidates[index];
      }
    }

    const previousFrames = Number(controller?.spawnLandmarkRouteFrames || 0);
    const stableBonus = Math.min(0.12, previousFrames * 0.015);
    return {
      kind: best.evidence >= 0.12 ? best.kind : "none",
      turn: best.evidence >= 0.12 ? best.turn : "right",
      evidence: round2(clamp01(best.evidence + stableBonus))
    };
  }

  function updateAutoplaySemanticRouteState(controller, features, state, frame, enemy, effectiveTargetConfidence, auditorySnapshot) {
    const {
      depthEstimate,
      mapHints,
      faceQuantizedFrameChange,
      regionQuantizedFrameChange,
      wallPressure,
      cornered,
      knownCorner,
      cornerTrap,
      openView
    } = features;
    const darkZoneScoreThreshold = profileNumber(controller.profile, "darkZoneScoreThreshold", DARK_ZONE_SCORE_THRESHOLD);
    const darkZoneLumaThreshold = profileNumber(controller.profile, "darkZoneLumaThreshold", DARK_ZONE_LUMA_THRESHOLD);
    const darkZoneConfirmFrames = profileNumber(controller.profile, "darkZoneConfirmFrames", DARK_ZONE_CONFIRM_FRAMES);
    const corridorSignatureThreshold = profileNumber(controller.profile, "firstDoorCorridorSignatureThreshold", FIRST_DOOR_CORRIDOR_SIGNATURE_THRESHOLD);
    const corridorConfirmFrames = Math.max(8, Math.min(MAX_STUCK_COUNTER, Math.round(profileNumber(controller.profile, "firstDoorCorridorConfirmFrames", FIRST_DOOR_CORRIDOR_CONFIRM_FRAMES))));
    const firstDoorUseSignatureThreshold = profileNumber(controller.profile, "firstDoorUseSignatureThreshold", FIRST_DOOR_USE_SIGNATURE_THRESHOLD);
    const firstDoorSpawnScanFrames = profileNumber(controller.profile, "firstDoorSpawnScanFrames", FIRST_DOOR_SPAWN_SCAN_FRAMES);
    const blueFloorHomeThreshold = profileNumber(controller.profile, "blueFloorHomeThreshold", BLUE_FLOOR_HOME_THRESHOLD);
    const spawnCorridorGapThreshold = profileNumber(controller.profile, "spawnCorridorGapThreshold", SPAWN_CORRIDOR_GAP_THRESHOLD);

    controller.firstDoorVision9x9Score = clamp01(Number(frame.firstDoorVision9x9Score || 0));
    controller.firstDoorVision9x9Box = frame.firstDoorVision9x9Box || null;
    controller.firstDoorVision9x9Heatmap = Array.isArray(frame.firstDoorVision9x9Heatmap) ? frame.firstDoorVision9x9Heatmap : [];
    controller.firstDoorVision9x9RedScore = clamp01(Number(frame.firstDoorVision9x9RedScore || 0));
    const firstDoorUse3x3 = scoreFirstDoorUseAlignment3x3(frame, controller.spawnCorridorGapScore, controller.spawnCorridorGapTurn);
    controller.firstDoorUse3x3Score = firstDoorUse3x3.score;
    controller.firstDoorUse3x3Turn = firstDoorUse3x3.turn;
    controller.firstDoorUse3x3Reason = firstDoorUse3x3.reason;
    if (controller.firstDoorCorridorSuppressFrames > 0) {
      controller.firstDoorCorridorSuppressFrames -= 1;
    }

    const baseFirstDoorCorridorSignature = scoreFirstDoorCorridorSignature(frame, depthEstimate, controller.blueFloorScore, controller.spawnCorridorGapScore);
    controller.firstDoorCorridorSignature = clamp01(
      (baseFirstDoorCorridorSignature * 0.84)
      + (controller.firstDoorVision9x9Score * 0.24));
    const darkZoneCandidate = controller.gameplayLuma > 0
      && controller.gameplayLuma <= darkZoneLumaThreshold
      && (controller.darkAreaScore >= darkZoneScoreThreshold || controller.gameplayLuma <= 56);
    const hostileZoneSignal = enemy.confidence >= 0.28
      || effectiveTargetConfidence >= 0.42
      || faceQuantizedFrameChange >= COMBAT_FACE_DANGER_DELTA
      || controller.enemyAlertFrames > 0
      || controller.enemyConfidencePeak >= 0.62;
    const combatContextActive = controller.resolveCombatContext(enemy, effectiveTargetConfidence, hostileZoneSignal);
    controller.combatContextActive = combatContextActive;
    const staticDoorKnown = Boolean(mapHints?.firstDoor || mapHints?.doorLines || mapHints?.switchLines);
    const staticDarkKnown = Boolean(mapHints?.darkSectors?.length);
    const staticEnemyZoneKnown = Boolean(mapHints?.enemyThings?.length || mapHints?.thingTypes?.some?.(thing => isEnemyThingType(thing.type)));
    const corridorCandidateFrame = controller.predictions >= firstDoorSpawnScanFrames + 90;
    const corridorGapGate = controller.spawnCorridorGapScore >= Math.max(0.18, spawnCorridorGapThreshold - 0.08);
    const motionEntranceGate = controller.motionEntranceScore >= profileNumber(controller.profile, "motionEntranceThreshold", 0.22)
      && controller.motionForwardProgress >= profileNumber(controller.profile, "motionForwardProgressThreshold", MOTION_FORWARD_PROGRESS_THRESHOLD)
      && controller.motionTurnScore < profileNumber(controller.profile, "motionTurnSweepThreshold", MOTION_TURN_SWEEP_THRESHOLD)
      && controller.blueFloorScore < blueFloorHomeThreshold
      && controller.spawnCorridorGapScore >= Math.max(0.14, spawnCorridorGapThreshold - 0.12);
    const motionForwardGate = controller.motionForwardProgress >= profileNumber(controller.profile, "motionForwardProgressThreshold", MOTION_FORWARD_PROGRESS_THRESHOLD)
      && controller.motionStallScore <= 0.7
      && controller.motionTurnScore < profileNumber(controller.profile, "motionTurnSweepThreshold", MOTION_TURN_SWEEP_THRESHOLD);
    const blueFloorExitedGate = controller.predictions >= 300
      && controller.blueFloorScore < blueFloorHomeThreshold
      && depthEstimate >= 0.7
      && controller.firstDoorCorridorSignature >= corridorSignatureThreshold + 0.08;
    const lateCorridorRecoveryGate = controller.predictions >= 420
      && controller.firstDoorCorridorSuppressFrames <= 0
      && controller.blueFloorScore < blueFloorHomeThreshold + 0.08
      && depthEstimate >= 0.65
      && controller.firstDoorCorridorSignature >= corridorSignatureThreshold + 0.04
      && controller.spawnCorridorGapScore >= Math.max(0.20, spawnCorridorGapThreshold - 0.20);
    const wallContactBeforeCorridor = !controller.firstDoorCorridorLocated
      && !controller.firstDoorUseAttempted
      && depthEstimate <= 0.22;
    const spawnLandmarkConflict = controller.doorOpenedCount <= 0
      && !controller.firstDoorUseAttempted
      && (controller.spawnSecretDoorScore >= Math.max(0.18, profileNumber(controller.profile, "spawnSecretDoorThreshold", SPAWN_SECRET_DOOR_THRESHOLD) - 0.08)
        || controller.spawnWestStairScore >= Math.max(0.16, profileNumber(controller.profile, "spawnWestStairThreshold", SPAWN_WEST_STAIR_THRESHOLD) - 0.04))
      && controller.firstDoorVision9x9RedScore < FIRST_DOOR_RED_ACCENT_THRESHOLD
      && controller.firstDoorUse3x3Score < FIRST_DOOR_DARK_PANEL_USE_ALIGNMENT_SCORE
      && controller.courtyardScore < Math.max(0.12, COURTYARD_RESCUE_THRESHOLD - 0.20);
    const firstDoorCorridorCandidate = controller.doorOpenedCount <= 0
      && controller.firstDoorCorridorSuppressFrames <= 0
      && !wallContactBeforeCorridor
      && !spawnLandmarkConflict
      && controller.firstDoorCorridorSignature >= corridorSignatureThreshold
      && corridorCandidateFrame
      && (corridorGapGate || blueFloorExitedGate || lateCorridorRecoveryGate || motionEntranceGate || controller.firstDoorUseAttempted)
      && (motionForwardGate || corridorGapGate || blueFloorExitedGate || lateCorridorRecoveryGate || controller.firstDoorUseAttempted)
      && (controller.predictions >= profileNumber(controller.profile, "firstDoorSpawnScanFrames", FIRST_DOOR_SPAWN_SCAN_FRAMES) || controller.firstDoorUseAttempted);
    if (wallContactBeforeCorridor || spawnLandmarkConflict) {
      controller.firstDoorCorridorFrames = 0;
      if (spawnLandmarkConflict && controller.firstDoorCorridorLocated && !controller.firstDoorUseAttempted) {
        controller.firstDoorCorridorLocated = false;
        controller.firstDoorCorridorSuppressFrames = Math.max(controller.firstDoorCorridorSuppressFrames, 18);
      }
    } else if (firstDoorCorridorCandidate) {
      controller.firstDoorCorridorFrames = Math.min(MAX_STUCK_COUNTER, controller.firstDoorCorridorFrames + 1);
    } else {
      controller.firstDoorCorridorFrames = Math.max(0, controller.firstDoorCorridorFrames - 1);
    }
    if (!controller.firstDoorCorridorLocated
      && !wallContactBeforeCorridor
      && !spawnLandmarkConflict
      && (controller.firstDoorCorridorFrames >= corridorConfirmFrames
        || lateCorridorRecoveryGate
        || (controller.predictions >= 300
          && (corridorGapGate || blueFloorExitedGate)
          && controller.firstDoorCorridorSignature >= corridorSignatureThreshold + 0.16))) {
      controller.firstDoorCorridorLocated = true;
    }

    controller.mapDoorSectorMatch = staticDoorKnown
      && controller.firstDoorCorridorLocated
      && controller.firstDoorUseAttempted
      && controller.firstDoorUseSignature >= firstDoorUseSignatureThreshold
      && (controller.doorTransitionArmedFrames > 0 || (controller.darkZoneFrames > 0 && darkZoneCandidate));
    controller.mapDarkSectorMatch = staticDarkKnown && darkZoneCandidate;
    controller.mapEnemyZoneMatch = staticEnemyZoneKnown && hostileZoneSignal;
    controller.mapSectorId = controller.mapDarkSectorMatch ? "visual-dark-zone" : (controller.mapDoorSectorMatch ? "door-transition" : "unknown");
    controller.updateSemanticMemory(frame, {
      depthEstimate,
      corridorSignatureThreshold,
      spawnCorridorGapThreshold,
      blueFloorHomeThreshold,
      darkZoneCandidate,
      firstDoorLikelyOpened: controller.firstDoorTransitionFrames >= 10,
      bridgeLaneVisible: isBridgeLaneVisible(
        controller.bridgeBrownScore,
        controller.bridgeGreenLeft,
        controller.bridgeGreenCenter,
        controller.bridgeGreenRight,
        profileNumber(controller.profile, "bridgeBrownThreshold", BRIDGE_BROWN_THRESHOLD),
        profileNumber(controller.profile, "bridgeGreenHazardThreshold", BRIDGE_GREEN_HAZARD_THRESHOLD)),
      enemy
    });
    if (controller.mapDoorSectorMatch && controller.mapDarkSectorMatch && controller.mapEnemyZoneMatch) {
      controller.darkZoneFrames = Math.min(MAX_STUCK_COUNTER, controller.darkZoneFrames + 1);
    } else {
      controller.darkZoneFrames = Math.max(0, controller.darkZoneFrames - 1);
    }

    const firstDoorTransitionCandidate = controller.doorOpenedCount === 0
      && controller.firstDoorCorridorLocated
      && controller.firstDoorUseAttempted
      && controller.firstDoorUseSignature >= firstDoorUseSignatureThreshold
      && controller.mapDoorSectorMatch
      && (controller.doorTransitionArmedFrames > 0 || darkZoneCandidate || controller.mapDarkSectorMatch);
    if (firstDoorTransitionCandidate) {
      controller.firstDoorTransitionFrames = Math.min(MAX_STUCK_COUNTER, controller.firstDoorTransitionFrames + 1);
    } else {
      controller.firstDoorTransitionFrames = Math.max(0, controller.firstDoorTransitionFrames - 1);
    }

    const computerRoomConfirmFrames = Math.max(4, Math.round(profileNumber(controller.profile, "computerRoomConfirmFrames", COMPUTER_ROOM_CONFIRM_FRAMES)));
    const computerRoomVisualAfterDoor = controller.computerRoomScore >= 0.24
      && (controller.computerBlueScore >= 0.14
        || controller.computerRedLightScore >= 0.08
        || (controller.computerDarkPanelScore >= 0.30 && controller.computerPanelScore >= 0.16))
      && controller.gameplayLuma > 0
      && controller.gameplayLuma <= 108;
    const computerRoomWhiteWallRecovery = controller.doorOpenedCount === 0
      && controller.firstDoorCorridorLocated
      && controller.blueFloorScore < blueFloorHomeThreshold
      && controller.computerRoomScore >= 0.10
      && controller.computerDarkPanelScore >= 0.24
      && controller.computerPanelScore >= 0.16
      && controller.gameplayLuma > 0
      && controller.gameplayLuma <= 112
      && !controller.healthLikelyDead;
    const computerRoomPanelAfterDoor = controller.doorOpenedCount > 0
      && controller.darkZoneEntered
      && controller.computerRoomScore >= 0.14
      && controller.computerPanelScore >= 0.54
      && controller.gameplayLuma > 0
      && controller.gameplayLuma <= 108;
    const postDoorBridgeCue = Math.max(controller.bridgeGreenLeft, controller.bridgeGreenCenter, controller.bridgeGreenRight);
    const computerRoomRouteAfterDoor = controller.doorOpenedCount > 0
      && depthEstimate >= 0.72
      && controller.gameplayLuma > 0
      && (controller.firstDoorCorridorLocated || controller.spawnCorridorGapScore >= 0.24 || controller.corridorConfidence >= 0.58)
      && (controller.bridgeBrownScore >= 0.22
        || postDoorBridgeCue >= 0.30
        || controller.bridgeDoorScore >= 0.10
        || controller.darkAreaScore >= 0.05)
      && !controller.healthLikelyDead;
    const postDoorTerminalSurface = Math.max(
      controller.computerPanelScore,
      controller.computerDarkPanelScore,
      controller.computerRoomScore);
    const postDoorWeakComputerPanelCue = controller.doorOpenedCount > 0
      && depthEstimate >= 0.82
      && controller.gameplayLuma > 0
      && controller.gameplayLuma <= 112
      && postDoorTerminalSurface >= 0.32
      && controller.computerRoomScore >= 0.08
      && (postDoorBridgeCue >= 0.18
        || controller.computerRedLightScore >= 0.03
        || controller.darkAreaScore >= 0.02
        || controller.bridgeBrownScore >= 0.12
        || controller.bridgeDoorScore >= 0.03)
      && !controller.healthLikelyDead;
    const visualPostDoorRecovery = controller.doorOpenedCount === 0
      && controller.firstDoorCorridorLocated
      && !controller.firstDoorUseAttempted
      && (computerRoomVisualAfterDoor || computerRoomWhiteWallRecovery)
      && controller.blueFloorScore < blueFloorHomeThreshold
      && controller.predictions >= firstDoorSpawnScanFrames + 120;
    const postDoorAudioType = normalizeAuditoryEventType(auditorySnapshot?.eventType || controller.auditorySnapshot?.eventType);
    const postDoorAudioEnergy = Math.max(
      Number(auditorySnapshot?.leftEnergy || 0),
      Number(auditorySnapshot?.rightEnergy || 0),
      Number(auditorySnapshot?.lowEnergy || 0),
      Number(auditorySnapshot?.midEnergy || 0),
      Number(auditorySnapshot?.highEnergy || 0),
      Number(controller.auditorySnapshot?.leftEnergy || 0),
      Number(controller.auditorySnapshot?.rightEnergy || 0),
      Number(controller.auditorySnapshot?.lowEnergy || 0),
      Number(controller.auditorySnapshot?.midEnergy || 0),
      Number(controller.auditorySnapshot?.highEnergy || 0));
    const firstDoorAudioFailure = controller.auditorySnapshot?.eventType === "use-failed-voice"
      || auditorySnapshot?.eventType === "use-failed-voice";
    const firstDoorNativeSfxCue = controller.doorOpenedCount === 0
      && controller.firstDoorCorridorLocated
      && !firstDoorAudioFailure
      && (postDoorAudioType === "native-sfx"
        || postDoorAudioType === "doom-native-sfx"
        || postDoorAudioType === "use-success-gate"
        || postDoorAudioType === "use-response")
      && postDoorAudioEnergy >= 0.002
      && (controller.firstDoorUseAttempted
        || controller.firstDoorUsePulsed
        || controller.pendingUseResponseFrames > 0
        || controller.doorTransitionArmedFrames > 0
        || controller.firstDoorTransitionFrames > 0);
    const postDoorAudioSpatialCue = firstDoorNativeSfxCue
      && (computerRoomVisualAfterDoor
        || computerRoomWhiteWallRecovery
        || controller.computerRoomScore >= 0.10
        || controller.computerDarkPanelScore >= 0.20
        || controller.computerPanelScore >= 0.12
        || hostileZoneSignal);
    const firstDoorLikelyOpened = controller.firstDoorTransitionFrames >= 10
      || visualPostDoorRecovery
      || postDoorAudioSpatialCue
      || (controller.firstDoorCorridorLocated
        && controller.firstDoorUseAttempted
        && controller.mapDoorSectorMatch
        && controller.mapDarkSectorMatch
        && controller.darkZoneFrames >= darkZoneConfirmFrames)
      || (controller.firstDoorCorridorLocated
        && controller.firstDoorUseAttempted
        && controller.firstDoorUseSignature >= firstDoorUseSignatureThreshold
        && controller.doorTransitionArmedFrames > 0
        && computerRoomVisualAfterDoor);
    const firstDoorAudioSuccess = controller.auditorySnapshot?.eventType === "use-success-gate"
      || auditorySnapshot?.eventType === "use-success-gate"
      || postDoorAudioSpatialCue;
    const firstDoorOpeningConfirmed = controller.doorOpenedCount === 0
      && controller.firstDoorCorridorLocated
      && firstDoorAudioSuccess
      && !firstDoorAudioFailure
      && ((controller.firstDoorUseAttempted
          && controller.firstDoorUseSignature >= firstDoorUseSignatureThreshold)
        || visualPostDoorRecovery)
      && (controller.firstDoorTransitionFrames >= 8
        || controller.darkZoneFrames >= Math.max(2, Math.floor(darkZoneConfirmFrames * 0.5))
        || (controller.mapDoorSectorMatch && (controller.mapDarkSectorMatch || darkZoneCandidate || computerRoomVisualAfterDoor))
        || (controller.doorTransitionArmedFrames > 0 && computerRoomVisualAfterDoor && hostileZoneSignal)
        || postDoorAudioSpatialCue
        || visualPostDoorRecovery);
    if (firstDoorOpeningConfirmed) {
      controller.doorOpenedCount = 1;
      controller.darkZoneEntered = true;
      controller.computerRoomAdvanceFrames = Math.max(
        controller.computerRoomAdvanceFrames,
        Math.round(profileNumber(controller.profile, "computerRoomAdvanceFrames", COMPUTER_ROOM_ADVANCE_FRAMES)));
      controller.doorTransitionArmedFrames = Math.max(
        controller.doorTransitionArmedFrames,
        Math.round(profileNumber(controller.profile, "doorTransitionArmedFrames", DOOR_TRANSITION_ARMED_FRAMES)));
      controller.useCooldown = Math.max(
        controller.useCooldown,
        Math.round(profileNumber(controller.profile, "firstDoorShutterUseLockFrames", USE_COOLDOWN_FRAMES * 3)));
      controller.pendingUseResponseFrames = 0;
      controller.lastUseWasBlocked = false;
      controller.wallUseProbeFrames = 0;
      controller.wallUseProbeStage = 0;
      controller.firstDoorUseLatchFrames = 0;
      controller.firstDoorUsePulsed = false;
      controller.firstDoorUseAttempted = false;
      controller.firstDoorUseSignature = 0;
      controller.cornerExitCommitFrames = 0;
      controller.hardStuckEscapeFrames = 0;
      controller.openStallEscapeFrames = 0;
      controller.loopEscapeFrames = 0;
      controller.mapSectorId = "door-open-transition";
      controller.safetyReason = "first-door-open-confirmed";
    }

    const computerRoomCombatAfterDoor = controller.doorOpenedCount > 0
      && controller.darkZoneEntered
      && controller.mapEnemyZoneMatch
      && controller.gameplayLuma > 0
      && controller.gameplayLuma <= 80
      && controller.enemyAlertFrames >= 4
      && isTrustedEnemyCluster(controller.enemyAlertCluster, controller.enemyAlertDepth)
      && isTrustedEnemyDepth(controller.enemyAlertCluster, controller.enemyAlertDepth, controller.enemyAlertPeakConfidence);
    const firstDoorTopologyAllowsComputerRoom = controller.doorOpenedCount > 0
      || controller.darkZoneEntered
      || visualPostDoorRecovery
      || postDoorAudioSpatialCue
      || computerRoomWhiteWallRecovery
      || controller.firstDoorTransitionFrames >= 10
      || (controller.firstDoorUseAttempted && controller.doorTransitionArmedFrames > 0);
    const combatTransitionStable = !combatContextActive
      || controller.doorOpenedCount > 0
      || controller.darkZoneFrames >= Math.max(3, Math.floor(darkZoneConfirmFrames * 0.6))
      || controller.firstDoorTransitionFrames >= 12;
    controller.topologicalTransitionBlocked = Boolean(computerRoomVisualAfterDoor && (!firstDoorTopologyAllowsComputerRoom || !combatTransitionStable));
    const postDoorTopologyStable = controller.doorOpenedCount > 0 && controller.darkZoneEntered;
    const computerRoomCandidate = !controller.topologicalTransitionBlocked
      && (((firstDoorLikelyOpened || postDoorTopologyStable) && (computerRoomVisualAfterDoor || computerRoomPanelAfterDoor))
        || computerRoomCombatAfterDoor
        || computerRoomRouteAfterDoor
        || postDoorWeakComputerPanelCue);
    if (computerRoomCandidate) {
      controller.computerRoomFrames = Math.min(MAX_STUCK_COUNTER, controller.computerRoomFrames + 1);
    } else {
      controller.computerRoomFrames = Math.max(0, controller.computerRoomFrames - 1);
    }

    if (!controller.computerRoomEntered && controller.computerRoomFrames >= computerRoomConfirmFrames) {
      controller.doorOpenedCount = Math.max(controller.doorOpenedCount, 1);
      controller.darkZoneEntered = true;
      controller.computerRoomAdvanceFrames = Math.max(
        controller.computerRoomAdvanceFrames,
        Math.max(36, Math.round(profileNumber(controller.profile, "computerRoomIngressFrames", COMPUTER_ROOM_ADVANCE_FRAMES * 0.35))));
      controller.wallUseProbeFrames = 0;
      controller.wallUseProbeStage = 0;
      controller.cornerExitCommitFrames = 0;
      controller.hardStuckEscapeFrames = 0;
      controller.openStallEscapeFrames = 0;
      controller.loopEscapeFrames = 0;
      controller.firstDoorUseLatchFrames = 0;
      controller.firstDoorUsePulsed = false;
      controller.firstDoorUseAttempted = false;
      controller.firstDoorUseSignature = 0;
      controller.computerRoomEntered = true;
      controller.mapSectorId = "visual-computer-room";
      controller.safetyReason = "computer-room-confirmed";
    }

    const centralHallFrame = Number(state?.frame || 0);
    const centralHallLateralBalance = Math.abs(Number(frame.left || 0) - Number(frame.right || 0));
    const computerPanelStillVisible = controller.computerRoomScore >= 0.12
      || controller.computerPanelScore >= 0.34
      || controller.computerDarkPanelScore >= 0.16
      || controller.computerRedLightScore >= 0.05;
    const bridgeExitCandidate = controller.computerRoomEntered
      && controller.doorOpenedCount >= 1
      && centralHallFrame >= 420
      && depthEstimate >= 0.9
      && controller.bridgeBrownScore >= 0.38
      && (controller.bridgeBrownScore >= 0.48
        || controller.bridgeDoorScore >= 0.16
        || Math.max(controller.bridgeGreenLeft, controller.bridgeGreenCenter, controller.bridgeGreenRight) >= 0.08)
      && controller.computerRoomFrames >= 48
      && !cornered
      && !knownCorner
      && !cornerTrap;
    const centralHallVisualCandidate = controller.computerRoomEntered
      && controller.doorOpenedCount >= 1
      && centralHallFrame >= 900
      && controller.gameplayLuma >= 82
      && controller.darkAreaScore <= 0.1
      && depthEstimate >= 0.78
      && openView
      && wallPressure <= 22
      && centralHallLateralBalance <= 36
      && !computerPanelStillVisible
      && !cornered
      && !knownCorner
      && !cornerTrap;
    const centralHallCandidate = bridgeExitCandidate || centralHallVisualCandidate;
    if (centralHallCandidate) {
      controller.centralHallFrames = Math.min(MAX_STUCK_COUNTER, controller.centralHallFrames + 1);
    } else {
      controller.centralHallFrames = Math.max(0, controller.centralHallFrames - 1);
    }

    if (!controller.centralHallEntered && controller.centralHallFrames >= 8) {
      controller.centralHallEntered = true;
      controller.mapSectorId = "visual-central-hall";
      controller.safetyReason = "central-hall-confirmed";
    }

    const stairsCandidate = controller.computerRoomEntered
      && controller.centralHallEntered
      && depthEstimate >= 0.62
      && controller.gameplayLuma >= 70
      && wallPressure >= 18
      && regionQuantizedFrameChange >= 0.08;
    if (stairsCandidate) {
      controller.stairsCandidateFrames = Math.min(MAX_STUCK_COUNTER, controller.stairsCandidateFrames + 1);
    } else {
      controller.stairsCandidateFrames = Math.max(0, controller.stairsCandidateFrames - 1);
    }

    if (!controller.stairsEntered && controller.stairsCandidateFrames >= 12) {
      controller.stairsEntered = true;
      controller.mapSectorId = "visual-stairs";
    }

    const finalRoomCandidate = controller.computerRoomEntered
      && controller.stairsEntered
      && controller.gameplayLuma >= 82
      && controller.darkAreaScore <= 0.08
      && depthEstimate >= 0.82
      && openView
      && Boolean(mapHints?.exitLines || mapHints?.switchLines);
    if (finalRoomCandidate) {
      controller.finalRoomCandidateFrames = Math.min(MAX_STUCK_COUNTER, controller.finalRoomCandidateFrames + 1);
    } else {
      controller.finalRoomCandidateFrames = Math.max(0, controller.finalRoomCandidateFrames - 1);
    }

    if (!controller.finalRoomEntered && controller.finalRoomCandidateFrames >= 14) {
      controller.finalRoomEntered = true;
      controller.mapSectorId = "visual-final-room";
    }

    controller.updateCombatMilestones(enemy);
    controller.sensorTensorPacket = buildSensorTensorPacket(controller, features);
    return {
      combatContextActive,
      darkZoneCandidate,
      firstDoorLikelyOpened
    };
  }

  function buildSensorTensorPacket(controller, features = {}) {
    return requireSensorTensor("buildPacket")(controller, features);
  }

  function readSensorTensorChannel(packet, channel) {
    return requireSensorTensor("readChannel")(packet, channel);
  }

  function readSensorTensorEvidence(controller) {
    return requireSensorTensor("readEvidence")(controller);
  }

  function serializeSensorTensorPacket(packet) {
    return requireSensorTensor("serializePacket")(packet);
  }

  function requireSensorTensor(name) {
    const fn = self.AIKernelDoomSensorTensor?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomSensorTensor.${name} is not loaded.`);
    }

    return fn;
  }

  function resolveExternalPredictor() {
    const candidates = [
      self.BonsaiRuntime,
      self.bonsai,
      self.AIKernelBonsaiRuntime
    ];

    return candidates.find(candidate => typeof candidate?.predict === "function") || null;
  }

  function resolveGpuVisionSource() {
    const provider = self.WebGpuComputeProvider || self.webGpuComputeProvider || self.aikernelWebGpuComputeProvider;
    if (!provider) {
      return null;
    }

    if (typeof provider.createBonsaiVisionBinding === "function") {
      const binding = provider.createBonsaiVisionBinding("doom");
      if (!binding) {
        return null;
      }

      return {
        kind: binding.kind || "webgpu-texture-binding",
        zeroCopy: Boolean(binding.zeroCopy),
        binding
      };
    }

    if (typeof provider.getDoomFrameTexture === "function") {
      const texture = provider.getDoomFrameTexture();
      if (!texture) {
        return null;
      }

      return {
        kind: "webgpu-texture",
        zeroCopy: true,
        texture
      };
    }

    if (typeof provider.getFramebufferTexture === "function") {
      const texture = provider.getFramebufferTexture("doom");
      if (!texture) {
        return null;
      }

      return {
        kind: "webgpu-framebuffer-texture",
        zeroCopy: true,
        texture
      };
    }

    if (typeof provider.getFrameStateBuffer === "function") {
      const buffer = provider.getFrameStateBuffer("doom");
      if (!buffer) {
        return null;
      }

      return {
        kind: "webgpu-state-buffer",
        zeroCopy: Boolean(buffer.zeroCopy),
        buffer
      };
    }

    return null;
  }

  async function heuristicPredict(state, previous) {
    await delay(0);
    const frame = state?.framebuffer || {};
    const stats = state?.player || {};
    const phase = Math.floor((state?.frame || 0) / 30) % 8;
    const center = frame.center || 0;
    const left = frame.left || 0;
    const right = frame.right || 0;
    const targetConfidence = estimateTargetConfidence(frame);

    return normalizeAction({
      move: stats.health === 0 ? "none" : "forward",
      turn: left > right + 12 ? "right" : (right > left + 12 ? "left" : (phase < 4 ? "left" : "right")),
      fire: targetConfidence >= 0.62,
      strafe: phase === 6 && targetConfidence < 0.5,
      use: false,
      run: targetConfidence < 0.5
    }, previous);
  }

  function summarizeFramebuffer(indices, rgbaBytes) {
    if (!indices) {
      return {
        width: WIDTH,
        height: HEIGHT,
        format: "paletted-8bit",
        sample: [],
        regionSample: [],
        region9Sample: [],
        vision9x9Sample: [],
        projectileRegion9Sample: [],
        projectileVision9x9Sample: [],
        projectileScore: 0,
        resourceRegion9Sample: [],
        resourceVision9x9Sample: [],
        resourceScore: 0,
        depthSample: [],
        statusSample: [],
        ammoSample: [],
        ammoSignature: "000000000000000000000",
        ammoLikelyEmpty: false,
        healthSample: [],
        healthSignature: "000000000000000000000000",
        healthLikelyDead: false,
        healthZeroScore: 0,
        healthActiveColumns: 0,
        healthActiveCells: 0,
        healthRetryReason: "none",
        healthDeathTintScore: 0,
        healthStatusDeathTintScore: 0,
        healthFaceDeathTintScore: 0,
        faceSample: [],
        faceAverage: 0,
        statusBarAverage: 0,
        gameplayLuma: 0,
        darkAreaScore: 0,
        blueFloorScore: 0,
        courtyardScore: 0,
        courtyardTurn: "none",
        spawnSecretDoorScore: 0,
        spawnSecretDoorTurn: "none",
        spawnWestStairScore: 0,
        spawnWestStairTurn: "none",
        spawnCenterAnchorScore: 0,
        spawnCenterAnchorTurn: "right",
        spawnCorridorGapScore: 0,
        spawnCorridorGapTurn: "none",
        firstDoorVision9x9Score: 0,
        firstDoorVision9x9Box: null,
        firstDoorVision9x9Heatmap: [],
        firstDoorVision9x9RedScore: 0,
        firstDoorUse3x3Score: 0,
        firstDoorUse3x3Turn: "none",
        firstDoorUse3x3Reason: "none",
        bridgeBrownScore: 0,
        bridgeGreenLeft: 0,
        bridgeGreenCenter: 0,
        bridgeGreenRight: 0,
        bridgeLaneTurn: "none",
        bridgeDoorScore: 0,
        computerBlueScore: 0,
        computerRedLightScore: 0,
        computerDarkPanelScore: 0,
        computerPanelScore: 0,
        computerRoomScore: 0,
        footObstacleScore: 0,
        enemyRegionSample: [],
        enemyConfidence: 0,
        enemyTurn: "none",
        enemyCentered: false,
        enemyCluster: "none",
        center: 0,
        left: 0,
        right: 0
      };
    }

    const sample = [];
    const regionTotals = new Array(REGION_COLUMNS * REGION_ROWS).fill(0);
    const regionCounts = new Array(REGION_COLUMNS * REGION_ROWS).fill(0);
    const region9Totals = new Array(REGION9_COLUMNS * REGION9_ROWS).fill(0);
    const region9Counts = new Array(REGION9_COLUMNS * REGION9_ROWS).fill(0);
    const vision9x9Totals = new Array(VISION_GRID_COLUMNS * VISION_GRID_ROWS).fill(0);
    const vision9x9Counts = new Array(VISION_GRID_COLUMNS * VISION_GRID_ROWS).fill(0);
    const firstDoorVision9x9DoorTotals = new Array(VISION_GRID_COLUMNS * VISION_GRID_ROWS).fill(0);
    const firstDoorVision9x9DoorCounts = new Array(VISION_GRID_COLUMNS * VISION_GRID_ROWS).fill(0);
    const firstDoorVision9x9DoorMax = new Array(VISION_GRID_COLUMNS * VISION_GRID_ROWS).fill(0);
    const firstDoorVision9x9RedTotals = new Array(VISION_GRID_COLUMNS * VISION_GRID_ROWS).fill(0);
    const firstDoorVision9x9RedCounts = new Array(VISION_GRID_COLUMNS * VISION_GRID_ROWS).fill(0);
    const firstDoorVision9x9RedMax = new Array(VISION_GRID_COLUMNS * VISION_GRID_ROWS).fill(0);
    const enemyRegionTotals = new Array(REGION_COLUMNS * REGION_ROWS).fill(0);
    const enemyRegionCounts = new Array(REGION_COLUMNS * REGION_ROWS).fill(0);
    const enemyRegion9Totals = new Array(REGION9_COLUMNS * REGION9_ROWS).fill(0);
    const enemyRegion9Counts = new Array(REGION9_COLUMNS * REGION9_ROWS).fill(0);
    const projectileRegion9Max = new Array(REGION9_COLUMNS * REGION9_ROWS).fill(0);
    const projectileVision9x9Max = new Array(VISION_GRID_COLUMNS * VISION_GRID_ROWS).fill(0);
    const resourceRegion9Max = new Array(REGION9_COLUMNS * REGION9_ROWS).fill(0);
    const resourceVision9x9Max = new Array(VISION_GRID_COLUMNS * VISION_GRID_ROWS).fill(0);
    const enemyClusterTotals = new Map();
    const depthTotals = new Array(DEPTH_BANDS).fill(0);
    const depthCounts = new Array(DEPTH_BANDS).fill(0);
    const statusSample = [];
    const ammoSample = [];
    const healthSample = [];
    const faceSample = [];
    const lumaGrid = new Array(SAMPLE_COLUMNS * SAMPLE_ROWS).fill(0);
    let left = 0;
    let center = 0;
    let right = 0;
    let topCenter = 0;
    let lowerCenter = 0;
    let centerContrast = 0;
    let statusTotal = 0;
    let faceTotal = 0;
    let gameplayLumaTotal = 0;
    let gameplayLumaCount = 0;
    let gameplayDeathTintTotal = 0;
    let gameplayDeathTintMax = 0;
    let gameplayDeathTintCount = 0;
    let statusDeathTintTotal = 0;
    let statusDeathTintMax = 0;
    let statusDeathTintCount = 0;
    let faceDeathTintTotal = 0;
    let faceDeathTintMax = 0;
    let faceDeathTintCount = 0;
    let darkAreaTotal = 0;
    let blueFloorTotal = 0;
    let blueFloorLowerTotal = 0;
    let blueFloorLowerMax = 0;
    let blueFloorLowerCount = 0;
    let courtyardLowerLeft = 0;
    let courtyardLowerRight = 0;
    let courtyardUpperLeft = 0;
    let courtyardUpperRight = 0;
    let courtyardLowerLeftMax = 0;
    let courtyardLowerRightMax = 0;
    let courtyardUpperLeftMax = 0;
    let courtyardUpperRightMax = 0;
    let courtyardLowerLeftCount = 0;
    let courtyardLowerRightCount = 0;
    let courtyardUpperLeftCount = 0;
    let courtyardUpperRightCount = 0;
    let spawnSecretDoorTotal = 0;
    let spawnSecretDoorWeightedX = 0;
    let spawnSecretDoorMax = 0;
    let spawnSecretDoorCount = 0;
    let spawnWestStairDark = 0;
    let spawnWestStairLamp = 0;
    let spawnWestStairWeightedX = 0;
    let spawnWestStairCount = 0;
    let spawnGapDark = 0;
    let spawnGapPillar = 0;
    let spawnGapWeightedX = 0;
    let spawnGapCount = 0;
    let spawnPillarCount = 0;
    let bridgeBrown = 0;
    let bridgeBrownCount = 0;
    let bridgeGreenLeft = 0;
    let bridgeGreenCenter = 0;
    let bridgeGreenRight = 0;
    let bridgeGreenLeftCount = 0;
    let bridgeGreenCenterCount = 0;
    let bridgeGreenRightCount = 0;
    let bridgeDoorPanel = 0;
    let bridgeDoorPanelCount = 0;
    let computerBlue = 0;
    let computerBlueCount = 0;
    let computerRedLight = 0;
    let computerRedLightCount = 0;
    let computerDarkPanel = 0;
    let computerDarkPanelCount = 0;
    let computerPanel = 0;
    let computerPanelCount = 0;
    let footObstacle = 0;
    let footObstacleMax = 0;
    let footObstacleCount = 0;
    const footObstacleBandSample = [];
    let projectileTotal = 0;
    let projectileCount = 0;
    let resourceTotal = 0;
    let resourceCount = 0;
    let leftCount = 0;
    let centerCount = 0;
    let rightCount = 0;
    let topCenterCount = 0;
    let lowerCenterCount = 0;

    for (let row = 0; row < SAMPLE_ROWS; row += 1) {
      const y = Math.min(GAMEPLAY_HEIGHT - 1, Math.floor((row + 0.5) * GAMEPLAY_HEIGHT / SAMPLE_ROWS));
      for (let column = 0; column < SAMPLE_COLUMNS; column += 1) {
        const x = Math.min(WIDTH - 1, Math.floor((column + 0.5) * WIDTH / SAMPLE_COLUMNS));
        const value = indices[y * WIDTH + x] || 0;
        sample.push(value);
        const darkScore = scoreDarkPaletteIndex(value, rgbaBytes);
        lumaGrid[row * SAMPLE_COLUMNS + column] = darkScore.luma;
        darkAreaTotal += darkScore.score;
        const deathTintScore = scoreDeathTintPaletteIndex(value, rgbaBytes);
        gameplayDeathTintTotal += deathTintScore;
        gameplayDeathTintMax = Math.max(gameplayDeathTintMax, deathTintScore);
        gameplayDeathTintCount += 1;
        const blueFloorCell = scoreBlueFloorPaletteIndex(value, rgbaBytes);
        blueFloorTotal += blueFloorCell;
        if (row >= Math.floor(SAMPLE_ROWS * 0.50)) {
          blueFloorLowerTotal += blueFloorCell;
          blueFloorLowerMax = Math.max(blueFloorLowerMax, blueFloorCell);
          blueFloorLowerCount += 1;
        }
        if (row >= Math.floor(SAMPLE_ROWS * 0.56)) {
          const courtyardLower = scoreCourtyardLowerPaletteIndex(value, rgbaBytes);
          if (column < SAMPLE_COLUMNS / 2) {
            courtyardLowerLeft += courtyardLower;
            courtyardLowerLeftMax = Math.max(courtyardLowerLeftMax, courtyardLower);
            courtyardLowerLeftCount += 1;
          } else {
            courtyardLowerRight += courtyardLower;
            courtyardLowerRightMax = Math.max(courtyardLowerRightMax, courtyardLower);
            courtyardLowerRightCount += 1;
          }
        } else if (row <= Math.floor(SAMPLE_ROWS * 0.46)) {
          const courtyardUpper = scoreCourtyardUpperPaletteIndex(value, rgbaBytes);
          if (column < SAMPLE_COLUMNS / 2) {
            courtyardUpperLeft += courtyardUpper;
            courtyardUpperLeftMax = Math.max(courtyardUpperLeftMax, courtyardUpper);
            courtyardUpperLeftCount += 1;
          } else {
            courtyardUpperRight += courtyardUpper;
            courtyardUpperRightMax = Math.max(courtyardUpperRightMax, courtyardUpper);
            courtyardUpperRightCount += 1;
          }
        }
        if (row >= 1 && row <= 9 && column >= 1 && column <= 18) {
          const xBias = ((column + 0.5) / SAMPLE_COLUMNS) * 2 - 1;
          const secretScore = scoreSpawnSecretDoorPaletteIndex(value, rgbaBytes);
          spawnSecretDoorTotal += secretScore;
          spawnSecretDoorWeightedX += secretScore * xBias;
          if (secretScore > spawnSecretDoorMax) {
            spawnSecretDoorMax = secretScore;
          }

          spawnSecretDoorCount += 1;
        }
        if (row >= 2 && row <= 9 && column >= 0 && column <= 10) {
          const xBias = ((column + 0.5) / SAMPLE_COLUMNS) * 2 - 1;
          const darkScoreForStairs = scoreSpawnWestStairDarkPaletteIndex(value, rgbaBytes);
          const lampScore = scoreSpawnWestStairLampPaletteIndex(value, rgbaBytes);
          const stairScore = (darkScoreForStairs * 0.54) + (lampScore * 0.46);
          spawnWestStairDark += darkScoreForStairs;
          spawnWestStairLamp += lampScore;
          spawnWestStairWeightedX += stairScore * xBias;
          spawnWestStairCount += 1;
        }
        if (row >= 3 && row <= 7 && column >= 6 && column <= 17) {
          const gapScore = scoreSpawnCorridorGapPaletteIndex(value, rgbaBytes);
          const xBias = ((column + 0.5) / SAMPLE_COLUMNS) * 2 - 1;
          spawnGapDark += gapScore;
          spawnGapWeightedX += gapScore * xBias;
          spawnGapCount += 1;
          if ((column >= 6 && column <= 8) || (column >= 13 && column <= 16)) {
            spawnGapPillar += scoreSpawnCorridorPillarPaletteIndex(value, rgbaBytes);
            spawnPillarCount += 1;
          }
        }
        if (row >= Math.floor(SAMPLE_ROWS * 0.54)) {
          const brownScore = scoreBridgeBrownPaletteIndex(value, rgbaBytes);
          const greenScore = scoreBridgeGreenPaletteIndex(value, rgbaBytes);
          bridgeBrown += brownScore;
          bridgeBrownCount += 1;
          if (column < SAMPLE_COLUMNS / 3) {
            bridgeGreenLeft += greenScore;
            bridgeGreenLeftCount += 1;
          } else if (column > (SAMPLE_COLUMNS * 2) / 3) {
            bridgeGreenRight += greenScore;
            bridgeGreenRightCount += 1;
          } else {
            bridgeGreenCenter += greenScore;
            bridgeGreenCenterCount += 1;
          }
        }
        if (row >= 3 && row <= 8 && column >= 6 && column <= 13) {
          bridgeDoorPanel += scoreBridgeDoorPanelPaletteIndex(value, rgbaBytes);
          bridgeDoorPanelCount += 1;
        }
        if (row >= 1 && row <= 10 && column >= 3 && column <= 18) {
          computerBlue += scoreComputerRoomBluePaletteIndex(value, rgbaBytes);
          computerBlueCount += 1;
        }
        if (row >= 0 && row <= 5 && column >= 2 && column <= 19) {
          computerRedLight += scoreComputerRoomRedLightPaletteIndex(value, rgbaBytes);
          computerRedLightCount += 1;
        }
        if (row >= 1 && row <= 10 && column >= 2 && column <= 19) {
          computerDarkPanel += scoreComputerRoomDarkPanelPaletteIndex(value, rgbaBytes);
          computerPanel += scoreComputerRoomPanelPaletteIndex(value, rgbaBytes);
          computerDarkPanelCount += 1;
          computerPanelCount += 1;
        }
        if (row >= 6 && row <= 12 && column >= 7 && column <= 19) {
          const footScore = scoreFootObstaclePaletteIndex(value, rgbaBytes);
          footObstacle += footScore;
          if (footScore > footObstacleMax) {
            footObstacleMax = footScore;
          }

          footObstacleBandSample.push(Math.round(clamp01(footScore) * 15));
          footObstacleCount += 1;
        }
        if (darkScore.luma > 0) {
          gameplayLumaTotal += darkScore.luma;
          gameplayLumaCount += 1;
        }
        const regionColumn = Math.min(REGION_COLUMNS - 1, Math.floor(column * REGION_COLUMNS / SAMPLE_COLUMNS));
        const regionRow = Math.min(REGION_ROWS - 1, Math.floor(row * REGION_ROWS / SAMPLE_ROWS));
        const regionIndex = regionRow * REGION_COLUMNS + regionColumn;
        regionTotals[regionIndex] += value;
        regionCounts[regionIndex] += 1;
        const region9Column = Math.min(REGION9_COLUMNS - 1, Math.floor(column * REGION9_COLUMNS / SAMPLE_COLUMNS));
        const region9Row = Math.min(REGION9_ROWS - 1, Math.floor(row * REGION9_ROWS / SAMPLE_ROWS));
        const region9Index = region9Row * REGION9_COLUMNS + region9Column;
        region9Totals[region9Index] += value;
        region9Counts[region9Index] += 1;
        const vision9x9Column = Math.min(VISION_GRID_COLUMNS - 1, Math.floor(column * VISION_GRID_COLUMNS / SAMPLE_COLUMNS));
        const vision9x9Row = Math.min(VISION_GRID_ROWS - 1, Math.floor(row * VISION_GRID_ROWS / SAMPLE_ROWS));
        const vision9x9Index = vision9x9Row * VISION_GRID_COLUMNS + vision9x9Column;
        vision9x9Totals[vision9x9Index] += value;
        vision9x9Counts[vision9x9Index] += 1;
        const firstDoorDoorScore = Math.max(
          scoreBridgeDoorPanelPaletteIndex(value, rgbaBytes),
          scoreBridgeBrownPaletteIndex(value, rgbaBytes) * 0.64,
          scoreSpawnCorridorPillarPaletteIndex(value, rgbaBytes) * 0.34);
        const firstDoorRedScore = scoreFirstDoorRedAccentPaletteIndex(value, rgbaBytes);
        firstDoorVision9x9DoorTotals[vision9x9Index] += firstDoorDoorScore;
        firstDoorVision9x9DoorCounts[vision9x9Index] += 1;
        if (firstDoorDoorScore > firstDoorVision9x9DoorMax[vision9x9Index]) {
          firstDoorVision9x9DoorMax[vision9x9Index] = firstDoorDoorScore;
        }
        firstDoorVision9x9RedTotals[vision9x9Index] += firstDoorRedScore;
        firstDoorVision9x9RedCounts[vision9x9Index] += 1;
        if (firstDoorRedScore > firstDoorVision9x9RedMax[vision9x9Index]) {
          firstDoorVision9x9RedMax[vision9x9Index] = firstDoorRedScore;
        }
        const enemyScore = scoreEnemyPaletteIndex(value, rgbaBytes);
        enemyRegionTotals[regionIndex] += enemyScore.score;
        enemyRegionCounts[regionIndex] += 1;
        enemyRegion9Totals[region9Index] += enemyScore.score;
        enemyRegion9Counts[region9Index] += 1;
        const projectileScore = scoreProjectilePaletteIndex(value, rgbaBytes);
        if (projectileScore > projectileRegion9Max[region9Index]) {
          projectileRegion9Max[region9Index] = projectileScore;
        }
        if (projectileScore > projectileVision9x9Max[vision9x9Index]) {
          projectileVision9x9Max[vision9x9Index] = projectileScore;
        }
        projectileTotal += projectileScore;
        projectileCount += 1;
        const resourceScore = scoreResourcePaletteIndex(value, rgbaBytes);
        if (resourceScore > resourceRegion9Max[region9Index]) {
          resourceRegion9Max[region9Index] = resourceScore;
        }
        if (resourceScore > resourceVision9x9Max[vision9x9Index]) {
          resourceVision9x9Max[vision9x9Index] = resourceScore;
        }
        resourceTotal += resourceScore;
        resourceCount += 1;
        if (enemyScore.score > 0) {
          enemyClusterTotals.set(enemyScore.name, (enemyClusterTotals.get(enemyScore.name) || 0) + enemyScore.score);
        }
        if (column >= SAMPLE_COLUMNS / 3 && column <= (SAMPLE_COLUMNS * 2) / 3) {
          const depthIndex = Math.min(DEPTH_BANDS - 1, Math.floor(row * DEPTH_BANDS / SAMPLE_ROWS));
          depthTotals[depthIndex] += value;
          depthCounts[depthIndex] += 1;
        }

        if (column < SAMPLE_COLUMNS / 3) {
          left += value;
          leftCount += 1;
        } else if (column > (SAMPLE_COLUMNS * 2) / 3) {
          right += value;
          rightCount += 1;
        } else {
          center += value;
          centerCount += 1;
          if (row < SAMPLE_ROWS / 3) {
            topCenter += value;
            topCenterCount += 1;
          } else if (row > (SAMPLE_ROWS * 2) / 3) {
            lowerCenter += value;
            lowerCenterCount += 1;
          }
        }
      }
    }

    for (let column = 0; column < SAMPLE_COLUMNS; column += 1) {
      const x = Math.min(WIDTH - 1, Math.floor((column + 0.5) * WIDTH / SAMPLE_COLUMNS));
      const y = Math.min(HEIGHT - 1, GAMEPLAY_HEIGHT + Math.floor(STATUS_BAR_HEIGHT / 2));
      const value = indices[y * WIDTH + x] || 0;
      statusSample.push(value);
      statusTotal += value;
      const deathTintScore = scoreDeathTintPaletteIndex(value, rgbaBytes);
      statusDeathTintTotal += deathTintScore;
      statusDeathTintMax = Math.max(statusDeathTintMax, deathTintScore);
      statusDeathTintCount += 1;
    }

    for (let row = 0; row < AMMO_SAMPLE_ROWS; row += 1) {
      const y = Math.min(HEIGHT - 1, AMMO_Y + Math.floor((row + 0.5) * AMMO_HEIGHT / AMMO_SAMPLE_ROWS));
      for (let column = 0; column < AMMO_SAMPLE_COLUMNS; column += 1) {
        const x = Math.min(WIDTH - 1, AMMO_X + Math.floor((column + 0.5) * AMMO_WIDTH / AMMO_SAMPLE_COLUMNS));
        ammoSample.push(indices[y * WIDTH + x] || 0);
      }
    }

    for (let row = 0; row < HEALTH_SAMPLE_ROWS; row += 1) {
      const y = Math.min(HEIGHT - 1, HEALTH_Y + Math.floor((row + 0.5) * HEALTH_HEIGHT / HEALTH_SAMPLE_ROWS));
      for (let column = 0; column < HEALTH_SAMPLE_COLUMNS; column += 1) {
        const x = Math.min(WIDTH - 1, HEALTH_X + Math.floor((column + 0.5) * HEALTH_WIDTH / HEALTH_SAMPLE_COLUMNS));
        healthSample.push(indices[y * WIDTH + x] || 0);
      }
    }

    for (let row = 0; row < FACE_SAMPLE_ROWS; row += 1) {
      const y = Math.min(HEIGHT - 1, FACE_Y + Math.floor((row + 0.5) * FACE_HEIGHT / FACE_SAMPLE_ROWS));
      for (let column = 0; column < FACE_SAMPLE_COLUMNS; column += 1) {
        const x = Math.min(WIDTH - 1, FACE_X + Math.floor((column + 0.5) * FACE_WIDTH / FACE_SAMPLE_COLUMNS));
        const value = indices[y * WIDTH + x] || 0;
        faceSample.push(value);
        faceTotal += value;
        const deathTintScore = scoreDeathTintPaletteIndex(value, rgbaBytes);
        faceDeathTintTotal += deathTintScore;
        faceDeathTintMax = Math.max(faceDeathTintMax, deathTintScore);
        faceDeathTintCount += 1;
      }
    }

    const regionSample = regionTotals.map((total, index) => regionCounts[index] ? Math.round(total / regionCounts[index]) : 0);
    const region9Sample = region9Totals.map((total, index) => region9Counts[index] ? Math.round(total / region9Counts[index]) : 0);
    const vision9x9Sample = vision9x9Totals.map((total, index) => vision9x9Counts[index] ? Math.round(total / vision9x9Counts[index]) : 0);
    const firstDoorVision9x9DoorSample = firstDoorVision9x9DoorTotals.map((total, index) => {
      if (!firstDoorVision9x9DoorCounts[index]) {
        return 0;
      }

      return round2(clamp01(Math.max(
        total / firstDoorVision9x9DoorCounts[index],
        firstDoorVision9x9DoorMax[index] * 0.62)));
    });
    const firstDoorVision9x9RedSample = firstDoorVision9x9RedTotals.map((total, index) => {
      if (!firstDoorVision9x9RedCounts[index]) {
        return 0;
      }

      return round2(clamp01(Math.max(
        total / firstDoorVision9x9RedCounts[index],
        firstDoorVision9x9RedMax[index] * 0.72)));
    });
    const firstDoorVision9x9 = scoreFirstDoorVision9x9Signature(
      vision9x9Sample,
      firstDoorVision9x9DoorSample,
      firstDoorVision9x9RedSample);
    const enemyRegionSample = enemyRegionTotals.map((total, index) => enemyRegionCounts[index] ? round2(total / enemyRegionCounts[index]) : 0);
    const enemyRegion9Sample = enemyRegion9Totals.map((total, index) => enemyRegion9Counts[index] ? round2(total / enemyRegion9Counts[index]) : 0);
    const projectileRegion9Sample = applyMorphologyMask(projectileRegion9Max, REGION9_COLUMNS, REGION9_ROWS, "dilation", 1);
    const projectileVision9x9Sample = applyMorphologyMask(projectileVision9x9Max, VISION_GRID_COLUMNS, VISION_GRID_ROWS, "dilation", 1);
    const resourceRegion9Sample = applyMorphologyMask(resourceRegion9Max, REGION9_COLUMNS, REGION9_ROWS, "dilation", 1);
    const resourceVision9x9Sample = applyMorphologyMask(resourceVision9x9Max, VISION_GRID_COLUMNS, VISION_GRID_ROWS, "dilation", 1);
    const enemy = summarizeEnemyRegions(enemyRegionSample, enemyClusterTotals, estimateDepthDistance(depthTotals.map((total, index) => depthCounts[index] ? Math.round(total / depthCounts[index]) : 0)), enemyRegion9Sample);
    const depthSample = depthTotals.map((total, index) => depthCounts[index] ? Math.round(total / depthCounts[index]) : 0);
    const depthEstimate = estimateDepthDistance(depthSample);
    const ammoState = estimateAmmoState(ammoSample, quantizeFrameSample(ammoSample));
    const gameplayDeathTintAverage = gameplayDeathTintCount ? gameplayDeathTintTotal / gameplayDeathTintCount : 0;
    const statusDeathTintAverage = statusDeathTintCount ? statusDeathTintTotal / statusDeathTintCount : 0;
    const faceDeathTintAverage = faceDeathTintCount ? faceDeathTintTotal / faceDeathTintCount : 0;
    const gameplayDeathTintScore = round2(clamp01(Math.max(gameplayDeathTintAverage * 1.16, gameplayDeathTintMax * 0.72)));
    const statusDeathTintScore = round2(clamp01(Math.max(statusDeathTintAverage * 1.08, statusDeathTintMax * 0.68)));
    const faceDeathTintScore = round2(clamp01(Math.max(faceDeathTintAverage * 1.12, faceDeathTintMax * 0.78)));
    const deathTintScore = round2(clamp01(Math.max(
      (gameplayDeathTintScore * 0.54) + (statusDeathTintScore * 0.28) + (faceDeathTintScore * 0.18),
      faceDeathTintScore * 0.82,
      statusDeathTintScore * 0.72)));
    const rawHealthState = Object.assign(
      estimateHealthState(healthSample, quantizeFrameSample(healthSample)),
      {
        deathTintScore,
        statusDeathTintScore,
        faceDeathTintScore
      });
    const summaryFaceDeathScore = Math.max(estimateFaceDeathScore(quantizeFrameSample(faceSample)), faceDeathTintScore * 0.75);
    const healthState = refineHealthState(rawHealthState, summaryFaceDeathScore, 255, 255);
    const courtyardLowerLeftScore = ((courtyardLowerLeftCount ? courtyardLowerLeft / courtyardLowerLeftCount : 0) * 0.68)
      + (courtyardLowerLeftMax * 0.32);
    const courtyardLowerRightScore = ((courtyardLowerRightCount ? courtyardLowerRight / courtyardLowerRightCount : 0) * 0.68)
      + (courtyardLowerRightMax * 0.32);
    const courtyardUpperLeftScore = ((courtyardUpperLeftCount ? courtyardUpperLeft / courtyardUpperLeftCount : 0) * 0.72)
      + (courtyardUpperLeftMax * 0.28);
    const courtyardUpperRightScore = ((courtyardUpperRightCount ? courtyardUpperRight / courtyardUpperRightCount : 0) * 0.72)
      + (courtyardUpperRightMax * 0.28);
    const courtyardLeft = (courtyardLowerLeftScore * 0.56) + (courtyardUpperLeftScore * 0.44);
    const courtyardRight = (courtyardLowerRightScore * 0.56) + (courtyardUpperRightScore * 0.44);
    const courtyardScore = round2(clamp01(Math.max(courtyardLeft, courtyardRight)));
    const courtyardTurn = Math.abs(courtyardLeft - courtyardRight) < 0.08
      ? "none"
      : (courtyardRight > courtyardLeft ? "right" : "left");
    const blueFloorAverage = sample.length ? blueFloorTotal / sample.length : 0;
    const blueFloorLowerAverage = blueFloorLowerCount ? blueFloorLowerTotal / blueFloorLowerCount : 0;
    const blueFloorLocal = (blueFloorLowerAverage * 0.72) + (blueFloorLowerMax * 0.28);
    const blueFloorScore = round2(clamp01(Math.max(blueFloorAverage, blueFloorLocal * 0.72)));
    const spawnSecretDoorAverage = spawnSecretDoorCount ? spawnSecretDoorTotal / spawnSecretDoorCount : 0;
    const spawnSecretDoorScore = round2(clamp01(Math.max(spawnSecretDoorAverage * 1.7, spawnSecretDoorMax * 0.68)));
    const spawnSecretDoorCenter = spawnSecretDoorTotal > 0
      ? spawnSecretDoorWeightedX / spawnSecretDoorTotal
      : 0;
    const spawnSecretDoorTurn = spawnSecretDoorScore < 0.08 || Math.abs(spawnSecretDoorCenter) < 0.08
      ? "none"
      : (spawnSecretDoorCenter > 0 ? "right" : "left");
    const spawnWestStairDarkScore = spawnWestStairCount ? spawnWestStairDark / spawnWestStairCount : 0;
    const spawnWestStairLampScore = spawnWestStairCount ? spawnWestStairLamp / spawnWestStairCount : 0;
    const spawnWestStairScore = round2(clamp01((spawnWestStairDarkScore * 0.48) + (spawnWestStairLampScore * 0.86)));
    const spawnWestStairCenter = (spawnWestStairDark + spawnWestStairLamp) > 0
      ? spawnWestStairWeightedX / (spawnWestStairDark + spawnWestStairLamp)
      : -0.45;
    const spawnWestStairTurn = spawnWestStairScore < 0.08 || Math.abs(spawnWestStairCenter) < 0.08
      ? "none"
      : (spawnWestStairCenter > 0 ? "right" : "left");
    const spawnGapEdges = estimateSpawnCorridorGapEdges(lumaGrid);
    const spawnGapDarkScore = spawnGapCount ? spawnGapDark / spawnGapCount : 0;
    const spawnGapPillarScore = spawnPillarCount ? spawnGapPillar / spawnPillarCount : 0;
    const spawnCenterAnchorScore = round2(clamp01(
      (blueFloorScore * 0.56)
      + (spawnGapPillarScore * 0.34)
      + (spawnGapEdges.score * 0.10)));
    const spawnCenterAnchorTurn = spawnCenterAnchorScore >= 0.12 ? "right" : "none";
    const spawnCorridorGapScore = round2(clamp01(
      (spawnGapDarkScore * 0.36)
      + (spawnGapPillarScore * 0.24)
      + (spawnGapEdges.score * 0.4)));
    const spawnGapCenter = (spawnGapDark + spawnGapEdges.weight) > 0
      ? (spawnGapWeightedX + spawnGapEdges.weightedX) / (spawnGapDark + spawnGapEdges.weight)
      : 0;
    const spawnCorridorGapTurn = Math.abs(spawnGapCenter) < 0.08
      ? "none"
      : (spawnGapCenter > 0 ? "right" : "left");
    const bridgeBrownScore = round2(clamp01(bridgeBrownCount ? bridgeBrown / bridgeBrownCount : 0));
    const bridgeGreenLeftScore = round2(clamp01(bridgeGreenLeftCount ? bridgeGreenLeft / bridgeGreenLeftCount : 0));
    const bridgeGreenCenterScore = round2(clamp01(bridgeGreenCenterCount ? bridgeGreenCenter / bridgeGreenCenterCount : 0));
    const bridgeGreenRightScore = round2(clamp01(bridgeGreenRightCount ? bridgeGreenRight / bridgeGreenRightCount : 0));
    const bridgeLaneTurn = chooseBridgeLaneTurn(bridgeGreenLeftScore, bridgeGreenCenterScore, bridgeGreenRightScore);
    const bridgeDoorScore = round2(clamp01(bridgeDoorPanelCount ? bridgeDoorPanel / bridgeDoorPanelCount : 0));
    const computerBlueScore = round2(clamp01(computerBlueCount ? computerBlue / computerBlueCount : 0));
    const computerRedLightScore = round2(clamp01(computerRedLightCount ? computerRedLight / computerRedLightCount : 0));
    const computerDarkPanelScore = round2(clamp01(computerDarkPanelCount ? computerDarkPanel / computerDarkPanelCount : 0));
    const computerPanelScore = round2(clamp01(computerPanelCount ? computerPanel / computerPanelCount : 0));
    const darkAreaAverage = sample.length ? darkAreaTotal / sample.length : 0;
    const computerRoomScore = round2(clamp01(
      (computerBlueScore * 0.28)
      + (computerRedLightScore * 0.22)
      + (computerDarkPanelScore * 0.24)
      + (computerPanelScore * 0.18)
      + (darkAreaAverage * 0.08)));
    const footObstacleAverage = footObstacleCount ? footObstacle / footObstacleCount : 0;
    const footObstacleScore = round2(clamp01(Math.max(footObstacleAverage, footObstacleMax * 0.65)));
    const centerAverage = centerCount ? Math.round(center / centerCount) : 0;
    for (let index = 0; index < sample.length; index += 1) {
      centerContrast += Math.abs(sample[index] - centerAverage);
    }

    return {
      width: WIDTH,
      height: HEIGHT,
      format: "paletted-8bit",
      sample,
      regionSample,
      region9Sample,
      vision9x9Sample,
      depthSample,
      depthEstimate,
      statusSample,
      ammoSample,
      ammoSignature: ammoState.signature,
      ammoLikelyEmpty: ammoState.likelyEmpty,
      healthSample,
      healthSignature: healthState.signature,
      healthLikelyDead: healthState.likelyDead,
      healthEstimatedPercent: healthState.estimatedPercent,
      healthZeroScore: healthState.zeroScore || 0,
      healthActiveColumns: healthState.activeColumns || 0,
      healthActiveCells: healthState.activeCells || 0,
      healthRetryReason: healthState.retryReason || "none",
      healthDeathTintScore: healthState.deathTintScore || 0,
      healthStatusDeathTintScore: healthState.statusDeathTintScore || 0,
      healthFaceDeathTintScore: healthState.faceDeathTintScore || 0,
      faceSample,
      faceAverage: faceSample.length ? Math.round(faceTotal / faceSample.length) : 0,
      statusBarAverage: statusSample.length ? Math.round(statusTotal / statusSample.length) : 0,
      gameplayLuma: gameplayLumaCount ? round2(gameplayLumaTotal / gameplayLumaCount) : 0,
      darkAreaScore: sample.length ? round2(darkAreaTotal / sample.length) : 0,
      blueFloorScore,
      courtyardScore,
      courtyardTurn,
      spawnSecretDoorScore,
      spawnSecretDoorTurn,
      spawnWestStairScore,
      spawnWestStairTurn,
      spawnCenterAnchorScore,
      spawnCenterAnchorTurn,
      spawnCorridorGapScore,
      spawnCorridorGapTurn,
      firstDoorVision9x9Score: firstDoorVision9x9.score,
      firstDoorVision9x9Box: firstDoorVision9x9.box,
      firstDoorVision9x9Heatmap: firstDoorVision9x9.heatmap,
      firstDoorVision9x9RedScore: firstDoorVision9x9.redScore,
      bridgeBrownScore,
      bridgeGreenLeft: bridgeGreenLeftScore,
      bridgeGreenCenter: bridgeGreenCenterScore,
      bridgeGreenRight: bridgeGreenRightScore,
      bridgeLaneTurn,
      bridgeDoorScore,
      computerBlueScore,
      computerRedLightScore,
      computerDarkPanelScore,
      computerPanelScore,
      computerRoomScore,
      footObstacleScore,
      footObstacleBandSample,
      enemyRegionSample,
      enemyRegion9Sample,
      projectileRegion9Sample,
      projectileVision9x9Sample,
      projectileScore: round2(clamp01(Math.max(maxArray(projectileVision9x9Sample), projectileCount ? projectileTotal / projectileCount : 0))),
      resourceRegion9Sample,
      resourceVision9x9Sample,
      resourceScore: round2(clamp01(Math.max(maxArray(resourceVision9x9Sample), resourceCount ? resourceTotal / resourceCount : 0))),
      enemyConfidence: enemy.confidence,
      enemyTurn: enemy.turn,
      enemyCentered: enemy.centered,
      enemyCluster: enemy.cluster,
      enemyStructuralDecoy: Boolean(enemy.structuralDecoy),
      enemyCenterCellConfidence: enemy.centerCellConfidence,
      center: centerAverage,
      left: leftCount ? Math.round(left / leftCount) : 0,
      right: rightCount ? Math.round(right / rightCount) : 0,
      topCenter: topCenterCount ? Math.round(topCenter / topCenterCount) : 0,
      lowerCenter: lowerCenterCount ? Math.round(lowerCenter / lowerCenterCount) : 0,
      contrast: sample.length ? Math.round(centerContrast / sample.length) : 0
    };
  }

  function scoreEnemyPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreEnemyPaletteIndex")(index, rgbaBytes);
  }

  function scoreProjectilePaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreProjectilePaletteIndex")(index, rgbaBytes);
  }

  function scoreResourcePaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreResourcePaletteIndex")(index, rgbaBytes);
  }

  function rgbToHsv(red, green, blue) {
    return requireVisionPalette("rgbToHsv")(red, green, blue);
  }

  function hueInRange(hue, min, max) {
    return requireVisionPalette("hueInRange")(hue, min, max);
  }

  function applyMorphologyMask(values, columns, rows, operation, iterations) {
    const source = Array.isArray(values) ? values : [];
    const width = Math.max(1, Number(columns || 1));
    const height = Math.max(1, Number(rows || 1));
    const total = width * height;
    let current = new Array(total).fill(0);
    for (let index = 0; index < total; index += 1) {
      current[index] = clamp01(Number(source[index] || 0));
    }

    const loops = Math.max(1, Number(iterations || 1));
    for (let pass = 0; pass < loops; pass += 1) {
      const next = new Array(total).fill(0);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          let value = operation === "erosion" ? 1 : 0;
          for (let oy = -1; oy <= 1; oy += 1) {
            const yy = y + oy;
            if (yy < 0 || yy >= height) {
              continue;
            }

            for (let ox = -1; ox <= 1; ox += 1) {
              const xx = x + ox;
              if (xx < 0 || xx >= width) {
                continue;
              }

              const neighbor = current[yy * width + xx] || 0;
              value = operation === "erosion" ? Math.min(value, neighbor) : Math.max(value, neighbor);
            }
          }

          next[y * width + x] = value >= RESIDENT_MASK_THRESHOLD ? round2(value) : 0;
        }
      }

      current = next;
    }

    return current;
  }

  function maxArray(values) {
    if (!Array.isArray(values) || values.length === 0) {
      return 0;
    }

    let max = 0;
    for (let index = 0; index < values.length; index += 1) {
      const value = Number(values[index] || 0);
      if (value > max) {
        max = value;
      }
    }

    return max;
  }

  function scoreDarkPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreDarkPaletteIndex")(index, rgbaBytes);
  }

  function scoreDeathTintPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreDeathTintPaletteIndex")(index, rgbaBytes);
  }

  function scoreBlueFloorPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreBlueFloorPaletteIndex")(index, rgbaBytes);
  }

  function scoreCourtyardLowerPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreCourtyardLowerPaletteIndex")(index, rgbaBytes);
  }

  function scoreCourtyardUpperPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreCourtyardUpperPaletteIndex")(index, rgbaBytes);
  }

  function scoreSpawnSecretDoorPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreSpawnSecretDoorPaletteIndex")(index, rgbaBytes);
  }

  function scoreSpawnWestStairDarkPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreSpawnWestStairDarkPaletteIndex")(index, rgbaBytes);
  }

  function scoreSpawnWestStairLampPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreSpawnWestStairLampPaletteIndex")(index, rgbaBytes);
  }

  function scoreSpawnCorridorGapPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreSpawnCorridorGapPaletteIndex")(index, rgbaBytes);
  }

  function scoreSpawnCorridorPillarPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreSpawnCorridorPillarPaletteIndex")(index, rgbaBytes);
  }

  function scoreBridgeBrownPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreBridgeBrownPaletteIndex")(index, rgbaBytes);
  }

  function scoreBridgeGreenPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreBridgeGreenPaletteIndex")(index, rgbaBytes);
  }

  function scoreBridgeDoorPanelPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreBridgeDoorPanelPaletteIndex")(index, rgbaBytes);
  }

  function scoreFirstDoorRedAccentPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreFirstDoorRedAccentPaletteIndex")(index, rgbaBytes);
  }

  function scoreComputerRoomBluePaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreComputerRoomBluePaletteIndex")(index, rgbaBytes);
  }

  function scoreComputerRoomRedLightPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreComputerRoomRedLightPaletteIndex")(index, rgbaBytes);
  }

  function scoreComputerRoomDarkPanelPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreComputerRoomDarkPanelPaletteIndex")(index, rgbaBytes);
  }

  function scoreComputerRoomPanelPaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreComputerRoomPanelPaletteIndex")(index, rgbaBytes);
  }

  function scoreFootObstaclePaletteIndex(index, rgbaBytes) {
    return requireVisionPalette("scoreFootObstaclePaletteIndex")(index, rgbaBytes);
  }

  function chooseBridgeLaneTurn(left, center, right) {
    const hazardLeft = Number(left || 0);
    const hazardCenter = Number(center || 0);
    const hazardRight = Number(right || 0);
    if (hazardCenter >= Math.max(BRIDGE_GREEN_HAZARD_THRESHOLD, Math.min(hazardLeft, hazardRight) + 0.04)) {
      return hazardLeft > hazardRight ? "right" : "left";
    }

    if (hazardLeft >= hazardRight + 0.06) {
      return "right";
    }

    if (hazardRight >= hazardLeft + 0.06) {
      return "left";
    }

    return "none";
  }

  function isBridgeLaneVisible(brown, left, center, right, brownThreshold, greenThreshold) {
    const bridgeBrown = Number(brown || 0);
    const greenHazard = Math.max(Number(left || 0), Number(center || 0), Number(right || 0));
    return bridgeBrown >= brownThreshold || (bridgeBrown >= brownThreshold * 0.45 && greenHazard >= greenThreshold);
  }

  function isComputerPanelStillVisible(controller) {
    if (!controller) {
      return false;
    }

    return Number(controller.computerRoomScore || 0) >= 0.12
      || Number(controller.computerPanelScore || 0) >= 0.34
      || Number(controller.computerDarkPanelScore || 0) >= 0.16
      || Number(controller.computerRedLightScore || 0) >= 0.05;
  }

  function estimateSpawnCorridorGapEdges(lumaGrid) {
    if (!lumaGrid?.length) {
      return { score: 0, weight: 0, weightedX: 0 };
    }

    let edgeTotal = 0;
    let darkTotal = 0;
    let pairCount = 0;
    let weight = 0;
    let weightedX = 0;
    for (let row = 3; row <= 7; row += 1) {
      for (let column = 9; column <= 17; column += 1) {
        const index = row * SAMPLE_COLUMNS + column;
        const luma = Number(lumaGrid[index] || 0);
        const left = Number(lumaGrid[index - 1] || luma);
        const right = Number(lumaGrid[index + 1] || luma);
        const up = Number(lumaGrid[index - SAMPLE_COLUMNS] || luma);
        const down = Number(lumaGrid[index + SAMPLE_COLUMNS] || luma);
        const verticalEdge = Math.abs(right - left);
        const horizontalEdge = Math.abs(down - up);
        const darkPocket = clamp01((96 - luma) / 96);
        const edge = clamp01((verticalEdge * 0.75 + horizontalEdge * 0.25 - 10) / 54);
        const sampleScore = clamp01((edge * 0.68) + (darkPocket * 0.32));
        const xBias = ((column + 0.5) / SAMPLE_COLUMNS) * 2 - 1;
        edgeTotal += edge;
        darkTotal += darkPocket;
        weight += sampleScore;
        weightedX += sampleScore * xBias;
        pairCount += 1;
      }
    }

    const edgeScore = pairCount ? edgeTotal / pairCount : 0;
    const darkScore = pairCount ? darkTotal / pairCount : 0;
    return {
      score: clamp01((edgeScore * 0.62) + (darkScore * 0.38)),
      weight,
      weightedX
    };
  }

  function scoreEnemyRgb(red, green, blue) {
    return requireVisionPalette("scoreEnemyRgb")(red, green, blue);
  }

  function isEnemyThingType(type) {
    return new Set([9, 16, 58, 3001, 3002, 3003, 3004, 3005, 3006]).has(Number(type));
  }

  function isTrustedEnemyCluster(cluster, depth = 1) {
    const value = String(cluster || "none");
    if (value === "none" || value === "green" || value === "gate" || value.startsWith("gate-")) {
      return false;
    }

    if (value === "brown" || value === "gray") {
      const safeDepth = Number(depth || 1);
      return safeDepth >= 0.18 && safeDepth < 0.76;
    }

    return true;
  }

  function isTrustedEnemyDepth(cluster, depth = 1, confidence = 0, centerConfidence = 0) {
    const value = String(cluster || "none");
    const safeDepth = Number(depth || 1);
    if (value === "red" || value === "pink") {
      return safeDepth <= 1.05 && (Number(confidence || 0) >= 0.52 || Number(centerConfidence || 0) >= 0.42);
    }

    if (value === "brown" || value === "gray") {
      return Number(centerConfidence || 0) >= 0.52
        || (safeDepth >= 0.18 && safeDepth < 0.72 && Number(confidence || 0) >= 0.72);
    }

    return safeDepth < 0.95;
  }

  function getTrustedEnemyThreatFromCandidate(enemy) {
    const cluster = String(enemy?.cluster || "none");
    const depth = Number(enemy?.distance ?? 1);
    const confidence = clamp01(Number(enemy?.confidence || 0));
    const centerConfidence = clamp01(Number(enemy?.centerCellConfidence || 0));
    if (Boolean(enemy?.structuralDecoy)) {
      return Math.min(confidence, 0.10);
    }

    if (isTrustedEnemyCluster(cluster, depth)
      && isTrustedEnemyDepth(cluster, depth, confidence, centerConfidence)) {
      return confidence;
    }

    if (cluster === "brown" || cluster === "gray") {
      return Math.min(confidence, depth >= 0.72 && centerConfidence < 0.52 ? 0.12 : 0.24);
    }

    if (cluster === "none" || cluster === "green" || cluster === "gate" || cluster.startsWith("gate-")) {
      return Math.min(confidence, 0.1);
    }

    return Math.min(confidence, 0.28);
  }

  function hasPostDoorEnemyMemoryEvidence(controller) {
    const terminalSurface = Math.max(
      Number(controller?.computerPanelScore || 0),
      Number(controller?.computerDarkPanelScore || 0),
      Number(controller?.computerRoomScore || 0));
    const visualTrace = Math.max(
      Number(controller?.enemyConfidence || 0),
      Number(controller?.enemyAllRegionPeak || 0),
      Number(controller?.enemyCenterCellConfidence || 0));
    return Number(controller?.doorOpenedCount || 0) > 0
      && !controller?.enemyStructuralDecoy
      && Number(controller?.enemyConfidencePeak || 0) >= 0.62
      && visualTrace >= 0.08
      && terminalSurface >= 0.28;
  }

  function getTrustedEnemyThreat(controller) {
    const direct = getTrustedEnemyThreatFromCandidate({
      cluster: controller?.enemyCluster,
      distance: controller?.enemyDistance ?? controller?.depthEstimate,
      confidence: controller?.enemyConfidence,
      centerCellConfidence: controller?.enemyCenterCellConfidence,
      structuralDecoy: controller?.enemyStructuralDecoy
    });
    const alertTrusted = Number(controller?.enemyAlertFrames || 0) > 0
      && !controller?.enemyStructuralDecoy
      && isTrustedEnemyCluster(controller?.enemyAlertCluster, controller?.enemyAlertDepth)
      && isTrustedEnemyDepth(
        controller?.enemyAlertCluster,
        controller?.enemyAlertDepth,
        controller?.enemyAlertPeakConfidence,
        controller?.enemyCenterCellConfidence);
    const alert = alertTrusted ? clamp01(Number(controller?.enemyAlertPeakConfidence || 0) * 0.72) : 0;
    const memory = hasPostDoorEnemyMemoryEvidence(controller)
      ? Math.min(0.34, Number(controller?.enemyConfidencePeak || 0) * 0.42)
      : 0;
    return Math.max(direct, alert, memory);
  }

  function hasTrustedCombatEvidence(controller) {
    const trustedEnemy = getTrustedEnemyThreat(controller);
    const phainomenon = controller?.phainomenon || controller?.nousDetectorResult;
    const looming = Boolean(phainomenon?.looming?.active);
    const damage = Boolean(phainomenon?.damageLocalization?.active);
    const alertTrusted = Number(controller?.enemyAlertFrames || 0) > 0
      && !controller?.enemyStructuralDecoy
      && isTrustedEnemyCluster(controller?.enemyAlertCluster, controller?.enemyAlertDepth)
      && isTrustedEnemyDepth(
        controller?.enemyAlertCluster,
        controller?.enemyAlertDepth,
        controller?.enemyAlertPeakConfidence,
        controller?.enemyCenterCellConfidence);
    const projectile = looming && clamp01(Number(controller?.projectileScore || controller?.phantasiaSnapshot?.projectileScore || 0)) >= 0.16;
    return trustedEnemy >= 0.26 || hasPostDoorEnemyMemoryEvidence(controller) || alertTrusted || projectile || damage;
  }

  function detectEnemyStructureDecoy(enemyRegion9Sample = [], cluster = "none", depth = 1) {
    const value = String(cluster || "none");
    if (value !== "brown" && value !== "gray") {
      return false;
    }

    if (!Array.isArray(enemyRegion9Sample) || enemyRegion9Sample.length < 9) {
      return false;
    }

    const safeDepth = Number(depth ?? 1);
    const rows = [0, 0, 0];
    const columns = [0, 0, 0];
    let total = 0;
    let peak = 0;
    for (let index = 0; index < 9; index += 1) {
      const score = clamp01(Number(enemyRegion9Sample[index] || 0));
      rows[Math.floor(index / 3)] += score;
      columns[index % 3] += score;
      total += score;
      peak = Math.max(peak, score);
    }

    if (total <= 0) {
      return false;
    }

    const maxColumn = Math.max(...columns);
    const maxRow = Math.max(...rows);
    const center = clamp01(Number(enemyRegion9Sample[4] || 0));
    const verticalSpan = Math.min(...rows) / Math.max(0.001, maxRow);
    const columnDominance = maxColumn / total;
    const topBottomPresent = rows[0] >= total * 0.18 && rows[2] >= total * 0.14;
    const pillarLike = columnDominance >= 0.42 && verticalSpan >= 0.34 && topBottomPresent;
    const broadWallLike = maxRow > 0 && peak <= 0.62 && rows[1] >= total * 0.24 && verticalSpan >= 0.28;
    return safeDepth >= 0.30
      && center < 0.50
      && (pillarLike || broadWallLike);
  }

  function summarizeEnemyRegions(enemyRegionSample, clusterTotals, depthEstimate, enemyRegion9Sample = null) {
    if (!enemyRegionSample?.length) {
      return {
        confidence: 0,
        turn: "none",
        centered: false,
        distance: Number(depthEstimate ?? 1),
        cluster: "none",
        centerCellConfidence: 0,
        structuralDecoy: false,
        fireReady: false
      };
    }

    const left = ((enemyRegionSample[0] || 0) + (enemyRegionSample[3] || 0)) * 0.5;
    const center = ((enemyRegionSample[1] || 0) + (enemyRegionSample[4] || 0)) * 0.56;
    const right = ((enemyRegionSample[2] || 0) + (enemyRegionSample[5] || 0)) * 0.5;
    const centerCellConfidence = round2(clamp01(Number(enemyRegion9Sample?.[4] || 0)));
    let allRegionPeak = 0;
    let weightedColumn = 0;
    let weight = 0;
    if (enemyRegion9Sample?.length >= 9) {
      for (let index = 0; index < 9; index += 1) {
        const score = Number(enemyRegion9Sample[index] || 0);
        const column = index % 3;
        const x = column === 0 ? -1 : (column === 2 ? 1 : 0);
        allRegionPeak = Math.max(allRegionPeak, score);
        weightedColumn += score * x;
        weight += score;
      }
    }

    const lateralBias = weight > 0 ? weightedColumn / weight : 0;
    let confidence = round2(clamp01(Math.max(left, center, right, allRegionPeak * 1.02, centerCellConfidence * 1.08)));
    const centered = center >= Math.max(left, right) * 0.9 || centerCellConfidence >= Math.max(left, right, center, allRegionPeak) * 0.82;
    const turn = centered ? "none" : (Math.abs(lateralBias) >= 0.14 ? (lateralBias < 0 ? "left" : "right") : (left > right ? "left" : "right"));
    let cluster = "none";
    let clusterScore = 0;
    clusterTotals?.forEach((score, name) => {
      if (score > clusterScore) {
        cluster = name;
        clusterScore = score;
      }
    });
    const distance = Number(depthEstimate ?? 1);
    if ((cluster === "brown" || cluster === "gray") && distance >= 0.78) {
      confidence = Math.min(confidence, 0.28);
    }
    const structuralDecoy = detectEnemyStructureDecoy(enemyRegion9Sample, cluster, distance);
    if (structuralDecoy) {
      confidence = Math.min(confidence, 0.18);
    }
    if (cluster === "none") {
      confidence = Math.min(confidence, 0.22);
    }

    return {
      confidence,
      turn,
      centered,
      distance,
      cluster,
      centerCellConfidence,
      structuralDecoy,
      allRegionPeak: round2(clamp01(allRegionPeak)),
      lateralBias: round2(lateralBias),
      fireReady: confidence >= COMBAT_FIRE_CONFIDENCE && centered && distance <= COMBAT_CLOSE_DEPTH_THRESHOLD
    };
  }

  function estimateEnemyPresence(frame) {
    const distance = Number(frame.depthEstimate ?? estimateDepthDistance(frame.depthSample));
    const summarized = summarizeEnemyRegions(frame.enemyRegionSample, null, distance, frame.enemyRegion9Sample);
    const centerCellConfidence = clamp01(Number(frame.enemyCenterCellConfidence ?? summarized.centerCellConfidence) || 0);
    return {
      confidence: clamp01(Math.max(Number(frame.enemyConfidence ?? summarized.confidence) || 0, centerCellConfidence)),
      turn: frame.enemyTurn || summarized.turn || "none",
      centered: Boolean(frame.enemyCentered ?? summarized.centered) || centerCellConfidence >= COMBAT_FIRE_CONFIDENCE,
      distance,
      cluster: frame.enemyCluster || summarized.cluster || "none",
      centerCellConfidence,
      structuralDecoy: Boolean(frame.enemyStructuralDecoy ?? summarized.structuralDecoy),
      allRegionPeak: clamp01(Number(frame.enemyAllRegionPeak ?? summarized.allRegionPeak) || 0),
      lateralBias: Number(frame.enemyLateralBias ?? summarized.lateralBias) || 0,
      fireReady: Boolean(frame.enemyFireReady ?? summarized.fireReady)
    };
  }

  function estimateAmmoState(ammoSample, quantizedAmmo) {
    const signature = regionSignature(quantizedAmmo || []);
    if (!ammoSample?.length) {
      return {
        signature,
        likelyEmpty: false
      };
    }

    let bright = 0;
    let nonZeroBuckets = 0;
    let maxBucket = 0;
    for (let index = 0; index < ammoSample.length; index += 1) {
      const value = Number(ammoSample[index] || 0);
      if (value > 32) {
        bright += 1;
      }

      const bucket = Number(quantizedAmmo?.[index] || 0);
      if (bucket > 0) {
        nonZeroBuckets += 1;
        maxBucket = Math.max(maxBucket, bucket);
      }
    }

    const horizontalSpread = countActiveColumns(quantizedAmmo || [], AMMO_SAMPLE_COLUMNS);
    const likelyEmpty = bright <= 2 || nonZeroBuckets <= 2 || (horizontalSpread <= 2 && maxBucket <= 5);
    return {
      signature,
      likelyEmpty
    };
  }

  function estimateHealthState(healthSample, quantizedHealth) {
    const signature = regionSignature(quantizedHealth || []);
    if (!healthSample?.length) {
      return {
        signature,
        likelyDead: false,
        zeroScore: 0,
        activeColumns: 0,
        activeCells: 0,
        estimatedPercent: 100
      };
    }

    let activeCells = 0;
    let maxBucket = 0;
    const buckets = new Set();
    for (let index = 0; index < healthSample.length; index += 1) {
      const value = Number(healthSample[index] || 0);
      const bucket = Math.max(
        Number(quantizedHealth?.[index] || 0),
        Math.floor(value / WALL_QUANTIZATION_STEP));
      maxBucket = Math.max(maxBucket, bucket);
      if (bucket > 0) {
        buckets.add(bucket);
        activeCells += 1;
      }
    }

    const horizontalSpread = countActiveColumns(quantizedHealth || [], HEALTH_SAMPLE_COLUMNS);
    const sparseDigits = activeCells > 0 && activeCells <= 11;
    const compactColumns = horizontalSpread > 0 && horizontalSpread <= 4;
    const limitedBuckets = buckets.size <= 5;
    const hasRedDigitSignal = maxBucket >= 3;
    const noHudSignal = activeCells === 0 && maxBucket === 0;
    const zeroScore = clamp01(
      (noHudSignal ? 0.26 : 0)
      + (sparseDigits ? 0.34 : 0)
      + (compactColumns ? 0.28 : 0)
      + (limitedBuckets ? 0.18 : 0)
      + (hasRedDigitSignal ? 0.2 : 0));
    const likelyDead = zeroScore >= 0.78;
    const density = activeCells / Math.max(1, healthSample.length);
    const spread = horizontalSpread / Math.max(1, HEALTH_SAMPLE_COLUMNS);
    const estimatedPercent = likelyDead
      ? 0
      : Math.round(clamp01(Math.max(
        (density * 0.76) + (spread * 0.24),
        noHudSignal ? 0 : (1 - zeroScore) * 0.82)) * 100);
    return {
      signature,
      likelyDead,
      zeroScore,
      activeColumns: horizontalSpread,
      activeCells,
      estimatedPercent,
      faceDeathScore: 0,
      freezeScore: 0,
      retryReason: likelyDead ? "health-zero-score" : "none"
    };
  }

  function refineHealthState(healthState, faceDeathScore, faceQuantizedFrameChange, visualStallDelta) {
    return requireSensoryCognition("refineHealthState")(healthState, faceDeathScore, faceQuantizedFrameChange, visualStallDelta);
  }

  function estimateFaceDeathScore(quantizedFace) {
    return requireSensoryCognition("estimateFaceDeathScore")(quantizedFace);
  }

  function createDisabledHealthState(signature) {
    return requireSensoryCognition("createDisabledHealthState")(signature);
  }

  function countActiveColumns(sample, columns) {
    return requireSensoryCognition("countActiveColumns")(sample, columns);
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function averageSampleDelta(previous, current) {
    return requireSensorTensor("averageSampleDelta")(previous, current);
  }

  function selectBobFilteredPreviousFrame(history, currentRegion9) {
    if (!Array.isArray(history) || !history.length || !currentRegion9?.length) {
      return null;
    }

    let bestFrame = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = 0; index < history.length; index += 1) {
      const candidate = history[index];
      if (!candidate?.quantizedRegion9?.length) {
        continue;
      }

      const regionScore = averageSampleDelta(candidate.quantizedRegion9, currentRegion9);
      const agePenalty = (history.length - index) * 0.015;
      const score = regionScore + agePenalty;
      if (score < bestScore) {
        bestScore = score;
        bestFrame = candidate;
      }
    }

    return bestFrame;
  }

  function analyzeRegion9Motion(previous, current, action) {
    return requireKinesisCognition("analyzeRegion9Motion")(previous, current, action);
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

  function resolveMotionIntent(action) {
    return requireKinesisCognition("resolveMotionIntent")(action);
  }

  function quantizeFrameSample(sample) {
    return requireSensorTensor("quantizeFrameSample")(sample, WALL_QUANTIZATION_STEP);
  }

  function regionSignature(sample) {
    return requireSensorTensor("regionSignature")(sample, "000000");
  }

  function estimateDepthDistance(depthSample) {
    if (!depthSample?.length) {
      return 1;
    }

    const far = depthSample[0] || 0;
    const mid = depthSample[Math.min(DEPTH_BANDS - 1, 1)] || 0;
    const near = depthSample[depthSample.length - 1] || 0;
    const wallFill = Math.max(0, near - ((far + mid) / 2));
    const closeScore = Math.max(0, Math.min(1, wallFill / 96));
    return Math.round((1 - closeScore) * 100) / 100;
  }

  function nearestSignatureDistance(sample, dictionary) {
    if (!dictionary?.length) {
      return 255;
    }

    let best = 255;
    for (let index = 0; index < dictionary.length; index += 1) {
      best = Math.min(best, averageSampleDelta(sample, dictionary[index]));
      if (best === 0) {
        break;
      }
    }

    return best;
  }

  function rememberSignature(dictionary, sample, duplicateThreshold) {
    if (nearestSignatureDistance(sample, dictionary) <= duplicateThreshold) {
      return;
    }

    dictionary.push(sample.slice(0));
    while (dictionary.length > SIGNATURE_DICTIONARY_LIMIT) {
      dictionary.shift();
    }
  }

  function rejectSignature(dictionary, sample, threshold) {
    if (!sample?.length || !dictionary?.length) {
      return;
    }

    for (let index = dictionary.length - 1; index >= 0; index -= 1) {
      if (averageSampleDelta(sample, dictionary[index]) <= threshold) {
        dictionary.splice(index, 1);
      }
    }
  }

  function looksLikeWall(frame) {
    const sideImbalance = Math.abs((frame.left || 0) - (frame.right || 0));
    const verticalPressure = Math.max(0, (frame.lowerCenter || 0) - (frame.topCenter || 0));
    const lowContrast = (frame.contrast || 0) < 20;
    return sideImbalance > 42 || (verticalPressure > 32 && lowContrast);
  }

  function looksLikeOpenView(frame, depthEstimate, targetConfidence) {
    const regions = frame.regionSample || [];
    const center = frame.center || 0;
    const left = frame.left || 0;
    const right = frame.right || 0;
    const lowerCenter = frame.lowerCenter || 0;
    const sideBalance = Math.abs(left - right);
    const centerRelief = center + 14 < Math.max(left, right) || lowerCenter + 12 < Math.max(left, right);
    const distant = Number(depthEstimate) >= OPEN_VIEW_DEPTH_THRESHOLD;
    const splitCorridor = regions.length >= 6 && Math.min(regions[1] || 0, regions[4] || 0) + 10 < Math.max(regions[0] || 0, regions[2] || 0, regions[3] || 0, regions[5] || 0);
    return targetConfidence < TARGET_LOCK_CONFIDENCE && (distant || centerRelief || splitCorridor) && sideBalance < 58;
  }

  function looksLikeNavigableView(frame, depthEstimate, cornerSignal) {
    const regions = frame.regionSample || [];
    const distant = Number(depthEstimate) >= OPEN_VIEW_DEPTH_THRESHOLD;
    const notCorner = Number(cornerSignal || 0) < 0.55;
    const lower = frame.lowerCenter || 0;
    const top = frame.topCenter || 0;
    const center = frame.center || 0;
    const left = frame.left || 0;
    const right = frame.right || 0;
    const sideBalance = Math.abs(left - right);
    const hasForwardRelief = center + 18 < Math.max(left, right, lower) || top + 12 < lower || sideBalance < 70;
    const corridor = regions.length >= 6 && Math.min(regions[1] || 0, regions[4] || 0) + 18 < Math.max(regions[0] || 0, regions[2] || 0, regions[3] || 0, regions[5] || 0);
    return distant && notCorner && (hasForwardRelief || corridor);
  }

  function scoreFirstDoorVision9x9Signature(vision9x9Sample, firstDoorDoorSample, firstDoorRedSample) {
    if (!Array.isArray(vision9x9Sample)
      || !Array.isArray(firstDoorDoorSample)
      || vision9x9Sample.length < VISION_GRID_COLUMNS * VISION_GRID_ROWS
      || firstDoorDoorSample.length < VISION_GRID_COLUMNS * VISION_GRID_ROWS) {
      return {
        score: 0,
        box: null,
        heatmap: [],
        redScore: 0
      };
    }

    const redSample = Array.isArray(firstDoorRedSample) ? firstDoorRedSample : [];
    const heatmap = new Array(VISION_GRID_COLUMNS * VISION_GRID_ROWS).fill(0);
    let bestScore = 0;
    let bestBox = null;
    let bestRedScore = 0;
    for (let row = 1; row < VISION_GRID_ROWS - 1; row += 1) {
      for (let column = 1; column < VISION_GRID_COLUMNS - 1; column += 1) {
        const i0 = row * VISION_GRID_COLUMNS + column;
        const i1 = i0 + 1;
        const i2 = i0 + VISION_GRID_COLUMNS;
        const i3 = i2 + 1;
        const raw0 = Number(vision9x9Sample[i0] || 0);
        const raw1 = Number(vision9x9Sample[i1] || 0);
        const raw2 = Number(vision9x9Sample[i2] || 0);
        const raw3 = Number(vision9x9Sample[i3] || 0);
        const rawMin = Math.min(raw0, raw1, raw2, raw3);
        const rawMax = Math.max(raw0, raw1, raw2, raw3);
        const rawAvg = (raw0 + raw1 + raw2 + raw3) * 0.25;
        const quant0 = Math.round(raw0 / WALL_QUANTIZATION_STEP);
        const quant1 = Math.round(raw1 / WALL_QUANTIZATION_STEP);
        const quant2 = Math.round(raw2 / WALL_QUANTIZATION_STEP);
        const quant3 = Math.round(raw3 / WALL_QUANTIZATION_STEP);
        const quantSpread = Math.max(quant0, quant1, quant2, quant3) - Math.min(quant0, quant1, quant2, quant3);
        const door0 = Number(firstDoorDoorSample[i0] || 0);
        const door1 = Number(firstDoorDoorSample[i1] || 0);
        const door2 = Number(firstDoorDoorSample[i2] || 0);
        const door3 = Number(firstDoorDoorSample[i3] || 0);
        const doorAvg = clamp01((door0 + door1 + door2 + door3) * 0.25);
        const doorPeak = Math.max(door0, door1, door2, door3);
        const red0 = Number(redSample[i0] || 0);
        const red1 = Number(redSample[i1] || 0);
        const red2 = Number(redSample[i2] || 0);
        const red3 = Number(redSample[i3] || 0);
        const redAvg = clamp01((red0 + red1 + red2 + red3) * 0.25);
        const redPeak = Math.max(red0, red1, red2, red3);
        const redEvidence = clamp01((redAvg * 0.68) + (redPeak * 0.32));
        const leftIndex0 = row * VISION_GRID_COLUMNS + Math.max(0, column - 1);
        const leftIndex1 = (row + 1) * VISION_GRID_COLUMNS + Math.max(0, column - 1);
        const rightIndex0 = row * VISION_GRID_COLUMNS + Math.min(VISION_GRID_COLUMNS - 1, column + 2);
        const rightIndex1 = (row + 1) * VISION_GRID_COLUMNS + Math.min(VISION_GRID_COLUMNS - 1, column + 2);
        const aboveIndex0 = Math.max(0, row - 1) * VISION_GRID_COLUMNS + column;
        const aboveIndex1 = Math.max(0, row - 1) * VISION_GRID_COLUMNS + column + 1;
        const belowIndex0 = Math.min(VISION_GRID_ROWS - 1, row + 2) * VISION_GRID_COLUMNS + column;
        const belowIndex1 = Math.min(VISION_GRID_ROWS - 1, row + 2) * VISION_GRID_COLUMNS + column + 1;
        const leftAvg = (Number(vision9x9Sample[leftIndex0] || 0) + Number(vision9x9Sample[leftIndex1] || 0)) * 0.5;
        const rightAvg = (Number(vision9x9Sample[rightIndex0] || 0) + Number(vision9x9Sample[rightIndex1] || 0)) * 0.5;
        const aboveAvg = (Number(vision9x9Sample[aboveIndex0] || 0) + Number(vision9x9Sample[aboveIndex1] || 0)) * 0.5;
        const belowAvg = (Number(vision9x9Sample[belowIndex0] || 0) + Number(vision9x9Sample[belowIndex1] || 0)) * 0.5;
        const sideContrast = clamp01(Math.max(Math.abs(leftAvg - rawAvg), Math.abs(rightAvg - rawAvg)) / 96);
        const verticalContrast = clamp01(Math.max(Math.abs(aboveAvg - rawAvg), Math.abs(belowAvg - rawAvg)) / 112);
        const stripeContrast = clamp01(Math.abs((raw0 + raw2) - (raw1 + raw3)) / 192);
        const edgePattern = clamp01((sideContrast * 0.42) + (verticalContrast * 0.22) + (stripeContrast * 0.36));
        const darkPanelBand = row >= 2 && row <= 5;
        const darkPanelEvidence = darkPanelBand
          ? clamp01(((doorAvg * 0.72) + (doorPeak * 0.28)) * edgePattern * 1.35)
          : 0;
        const uniformPatch = clamp01((56 - (rawMax - rawMin)) / 56);
        const quantizedPatch = clamp01((4 - quantSpread) / 4);
        const centerDistance = Math.abs((column + 1) - ((VISION_GRID_COLUMNS - 1) * 0.5)) / ((VISION_GRID_COLUMNS - 1) * 0.5);
        const centerWeight = clamp01(1 - centerDistance);
        const midLowerWeight = row >= 3 && row <= 6 ? 1 : (row >= 2 && row <= 7 ? 0.66 : 0.32);
        const redDoorBand = row >= 2 && row <= 4;
        const floorRedRisk = row >= 6
          ? redEvidence
          : (row === 5 ? redEvidence * (belowAvg > rawAvg + 10 ? 0.92 : 0.72) : 0);
        const floorRedCandidate = row >= 5
          && redEvidence >= FIRST_DOOR_RED_ACCENT_THRESHOLD * 0.68;
        const doorRedEvidence = redDoorBand ? redEvidence : 0;
        const redGate = clamp01(doorRedEvidence / FIRST_DOOR_RED_ACCENT_THRESHOLD);
        const darkRedRectangle = redDoorBand
          && doorRedEvidence >= FIRST_DOOR_RED_ACCENT_THRESHOLD * 0.78
          && uniformPatch >= 0.42
          && quantizedPatch >= 0.42
          && centerWeight >= 0.34;
        const orangeWallPenalty = redGate < 0.72 && doorAvg >= 0.24
          ? (centerWeight >= 0.78 ? 0.08 : 0.18)
          : 0;
        const baseScore = clamp01(
          (doorAvg * 0.24)
          + (doorPeak * 0.08)
          + (doorRedEvidence * (darkRedRectangle ? 0.34 : 0.24))
          + (darkPanelEvidence * 0.18)
          + (quantizedPatch * 0.11)
          + (uniformPatch * 0.07)
          + (edgePattern * 0.14)
          + (centerWeight * 0.06)
          + (midLowerWeight * 0.06)
          + (darkRedRectangle ? 0.06 : 0)
          - orangeWallPenalty
          - (floorRedRisk * 0.48));
        const score = floorRedCandidate ? Math.min(baseScore, 0.2) : baseScore;
        const kind = floorRedRisk >= FIRST_DOOR_RED_ACCENT_THRESHOLD
          ? "first-door-floor-red"
          : (doorRedEvidence >= FIRST_DOOR_RED_ACCENT_THRESHOLD && (edgePattern >= 0.22 || darkRedRectangle)
          ? "first-door-9x9-patch"
          : (darkPanelBand && darkPanelEvidence >= 0.24 && centerWeight >= 0.55 && midLowerWeight >= 0.66
            ? "first-door-dark-panel"
            : "first-door-wall-pattern"));
        heatmap[i0] = Math.max(heatmap[i0], score);
        heatmap[i1] = Math.max(heatmap[i1], score);
        heatmap[i2] = Math.max(heatmap[i2], score);
        heatmap[i3] = Math.max(heatmap[i3], score);
        bestRedScore = Math.max(bestRedScore, doorRedEvidence);
        if (score > bestScore) {
          bestScore = score;
          bestBox = {
            column,
            row,
            columns: 2,
            rows: 2,
            score: round2(score),
            redScore: round2(doorRedEvidence),
            edgeScore: round2(edgePattern),
            doorScore: round2(doorAvg),
            darkPanelScore: round2(darkPanelEvidence),
            kind
          };
        }
      }
    }

    return {
      score: round2(bestScore),
      box: bestScore >= 0.24 ? bestBox : null,
      heatmap: heatmap.map(value => round2(value)),
      redScore: round2(bestRedScore)
    };
  }

  function scoreFirstDoorCorridorSignature(frame, depthEstimate, blueFloorScore, spawnCorridorGapScore = 0) {
    const regions = frame.regionSample || [];
    if (regions.length < REGION_COLUMNS * REGION_ROWS) {
      return 0;
    }

    const region9 = frame.region9Sample || [];
    const leftWall = ((regions[0] || 0) * 0.55) + ((regions[3] || 0) * 0.45);
    const centerDepthRelief = clamp01(Number(depthEstimate || 0));
    const center = ((regions[1] || 0) + (regions[4] || 0)) * 0.5;
    const right = ((regions[2] || 0) + (regions[5] || 0)) * 0.5;
    const topCenter = Number(region9[1] || 0);
    const middleCenter = Number(region9[4] || 0);
    const middleRight = Number(region9[5] || 0);
    const lowerCenter9 = Number(region9[7] || 0);
    const verticalPocket = region9.length >= 9
      ? clamp01((Math.max(region9[0] || 0, region9[2] || 0, region9[3] || 0, region9[6] || 0, region9[8] || 0) - Math.min(topCenter, middleCenter, lowerCenter9) + 12) / 112)
      : 0;
    const rightGap = region9.length >= 9
      ? clamp01((Math.max(topCenter, middleCenter) - middleRight + 20) / 112)
      : 0;
    const leftDominance = clamp01((leftWall - Math.max(center, right) + 28) / 96);
    const rightPocket = clamp01((Math.abs(right - center) + Math.max(0, center - right)) / 96);
    const blueGone = clamp01((BLUE_FLOOR_HOME_THRESHOLD - Number(blueFloorScore || 0)) / BLUE_FLOOR_HOME_THRESHOLD);
    const lowerRelief = clamp01(((frame.lowerCenter || 0) + 18 - (frame.topCenter || 0)) / 128);
    const notFlatWall = clamp01((Number(frame.contrast || 0) + Math.abs(right - leftWall)) / 96);

    return clamp01(
      (leftDominance * 0.28)
      + (centerDepthRelief * 0.24)
      + (rightPocket * 0.18)
      + (blueGone * 0.18)
      + (lowerRelief * 0.06)
      + (notFlatWall * 0.06)
      + (verticalPocket * 0.16)
      + (rightGap * 0.1)
      + (clamp01(spawnCorridorGapScore) * 0.22));
  }

  function scoreFirstDoorUseAlignment3x3(frame, spawnCorridorGapScore = 0, spawnCorridorGapTurn = "none") {
    const regions = frame.region9Sample || [];
    if (regions.length < REGION9_COLUMNS * REGION9_ROWS) {
      return { score: 0, turn: "none", reason: "no-region9" };
    }

    const topCenter = Number(regions[1] || 0);
    const middleLeft = Number(regions[3] || 0);
    const middleCenter = Number(regions[4] || 0);
    const middleRight = Number(regions[5] || 0);
    const lowerLeft = Number(regions[6] || 0);
    const lowerCenter = Number(regions[7] || 0);
    const lowerRight = Number(regions[8] || 0);
    const centerColumn = (topCenter + middleCenter + lowerCenter) / 3;
    const leftColumn = (Number(regions[0] || 0) + middleLeft + lowerLeft) / 3;
    const rightColumn = (Number(regions[2] || 0) + middleRight + lowerRight) / 3;
    const centerDominance = clamp01((centerColumn - Math.max(leftColumn, rightColumn) + 38) / 92);
    const lowerContact = clamp01((lowerCenter - Math.max(lowerLeft, lowerRight) + 34) / 92);
    const verticalContinuity = clamp01((96 - (Math.max(topCenter, middleCenter, lowerCenter) - Math.min(topCenter, middleCenter, lowerCenter))) / 96);
    const sideGap = rightColumn + 8 < centerColumn ? "right" : (leftColumn + 8 < centerColumn ? "left" : "none");
    const gapTurn = spawnCorridorGapTurn === "left" || spawnCorridorGapTurn === "right" ? spawnCorridorGapTurn : sideGap;
    const redPanelEvidence = clamp01(Number(frame.firstDoorVision9x9RedScore || 0));
    const visionDoorEvidence = clamp01(Number(frame.firstDoorVision9x9Score || 0));
    const redAlignmentGate = clamp01(redPanelEvidence / FIRST_DOOR_RED_ACCENT_THRESHOLD);
    const redCenteredBonus = redPanelEvidence >= FIRST_DOOR_RED_ACCENT_THRESHOLD * 0.78
      ? redPanelEvidence * 0.28
      : 0;
    const edgePenalty = gapTurn !== "none" && Number(spawnCorridorGapScore || 0) >= 0.18
      ? Math.max(0.08, 0.34 - (redAlignmentGate * 0.24))
      : 0;
    const score = clamp01(
      (centerDominance * 0.38)
      + (lowerContact * 0.24)
      + (verticalContinuity * 0.22)
      + (clamp01(Number(frame.bridgeDoorScore || 0)) * 0.16)
      + (visionDoorEvidence * 0.08)
      + redCenteredBonus
      - edgePenalty);

    if (score >= 0.58) {
      return { score: round2(score), turn: "none", reason: "center-3x3" };
    }

    return {
      score: round2(score),
      turn: gapTurn,
      reason: redCenteredBonus > 0.01
        ? "red-panel"
        : (gapTurn === "none" ? "center-weak" : "edge-gap")
    };
  }

  function looksLikeCorner(frame, frameChange) {
    const left = frame.left || 0;
    const right = frame.right || 0;
    const center = frame.center || 0;
    const lowerCenter = frame.lowerCenter || 0;
    const contrast = frame.contrast || 0;
    const bothSidesClose = Math.min(left, right) > 82 && center > 72;
    const pressedIntoGeometry = lowerCenter > center + 18 || contrast < 14;
    const symmetricWall = Math.abs(left - right) < 18 && Math.abs(center - Math.round((left + right) / 2)) < 18;
    return frameChange < STUCK_CHANGE_THRESHOLD * 2.4 && ((bothSidesClose && pressedIntoGeometry) || (symmetricWall && contrast < 18));
  }

  function estimateCornerSignal(frame, frameChange, quantizedFrameChange, wallPressure, wallLike) {
    const left = frame.left || 0;
    const right = frame.right || 0;
    const center = frame.center || 0;
    const topCenter = frame.topCenter || 0;
    const lowerCenter = frame.lowerCenter || 0;
    const contrast = frame.contrast || 0;
    const sideAverage = Math.round((left + right) / 2);
    const symmetricSides = Math.abs(left - right) < 20;
    const centerLocked = Math.abs(center - sideAverage) < 22;
    const lowerPressure = lowerCenter > center + 10;
    const verticalPressure = Math.max(0, lowerCenter - topCenter);

    let score = 0;
    if (quantizedFrameChange <= QUANTIZED_STALL_THRESHOLD) {
      score += 0.32;
    }
    if (frameChange < STUCK_CHANGE_THRESHOLD * 2.2) {
      score += 0.16;
    }
    if (wallLike) {
      score += 0.18;
    }
    if (contrast < 18) {
      score += 0.15;
    }
    if (wallPressure > STUCK_WALL_THRESHOLD * 0.45 || verticalPressure > 20) {
      score += 0.16;
    }
    if (symmetricSides && centerLocked) {
      score += 0.14;
    }
    if (Math.min(left, right) > 68 && center > 56) {
      score += 0.16;
    }
    if (lowerPressure) {
      score += 0.12;
    }

    return Math.max(0, Math.min(1, score));
  }

  function chooseEscapeTurn(frame, fallback) {
    const vector = estimateWallDirectionVector(frame);
    if (Math.abs(vector) > 8) {
      return vector > 0 ? "left" : "right";
    }

    const left = frame.left || 0;
    const right = frame.right || 0;
    if (Math.abs(left - right) < 8) {
      return fallback === "left" ? "right" : "left";
    }

    return left > right ? "right" : "left";
  }

  function chooseDoorProbeTurn(frame, fallback) {
    const vector = estimateWallDirectionVector(frame);
    if (Math.abs(vector) > 8) {
      return vector > 0 ? "right" : "left";
    }

    const left = frame.left || 0;
    const right = frame.right || 0;
    if (Math.abs(left - right) < 8) {
      return fallback || "left";
    }

    return left > right ? "left" : "right";
  }

  function chooseOpenViewTurn(frame, fallback) {
    const vector = estimateWallDirectionVector(frame);
    if (Math.abs(vector) > 12) {
      return vector > 0 ? "left" : "right";
    }

    return fallback || "left";
  }

  function chooseOpenAdvanceTurn(frame) {
    const left = frame.left || 0;
    const right = frame.right || 0;
    const center = frame.center || 0;
    const sideImbalance = Math.abs(left - right);
    if (sideImbalance < 42 || center + 12 < Math.max(left, right)) {
      return "none";
    }

    return left > right ? "right" : "left";
  }

  function estimateWallDirectionVector(frame) {
    const regions = frame.regionSample;
    if (!regions?.length || regions.length < REGION_COLUMNS * REGION_ROWS) {
      return (frame.right || 0) - (frame.left || 0);
    }

    const left = (regions[0] || 0) + ((regions[3] || 0) * 1.35);
    const right = (regions[2] || 0) + ((regions[5] || 0) * 1.35);
    const nearWeight = 1 + Math.max(0, 1 - (Number(frame.depthEstimate ?? estimateDepthDistance(frame.depthSample)) || 1));
    return (right - left) * nearWeight;
  }

  function chooseWallHugSide(frame, fallback) {
    const left = frame.left || 0;
    const right = frame.right || 0;
    if (Math.abs(left - right) < 10) {
      return fallback || "left";
    }

    return left > right ? "right" : "left";
  }

  function targetTurnDirection(frame) {
    const left = frame.left || 0;
    const right = frame.right || 0;
    if (Math.abs(left - right) < 10) {
      return "none";
    }

    return left > right ? "right" : "left";
  }

  function resolveSoundCue(state) {
    const cue = state?.sound || state?.audio || state?.soundCue;
    if (!cue || cue.active === false) {
      return null;
    }

    if (cue.eventDetected === false || cue.active === false) {
      return null;
    }

    const direction = cue.direction === "right" ? "right" : (cue.direction === "left" ? "left" : null);
    if (direction) {
      return {
        direction,
        leftEnergy: clamp01(Number(cue.leftEnergy ?? cue.leftLevel ?? cue.left ?? 0)),
        rightEnergy: clamp01(Number(cue.rightEnergy ?? cue.rightLevel ?? cue.right ?? 0)),
        balance: Math.max(-1, Math.min(1, Number(cue.balance ?? 0) || 0)),
        dominantFreq: Number(cue.dominantFreq ?? cue.frequency ?? 0),
        eventType: normalizeAuditoryEventType(cue.eventType)
      };
    }

    return null;
  }

  function createAuditorySnapshot(overrides = {}) {
    return requireSensoryCognition("createAuditorySnapshot")(overrides);
  }

  function buildAuditorySnapshot(state) {
    return requireSensoryCognition("buildAuditorySnapshot")(state);
  }

  function buildAudioBandEnergy(source, dominantFreq, totalEnergy) {
    return requireSensoryCognition("buildAudioBandEnergy")(source, dominantFreq, totalEnergy);
  }

  function chooseDominantAudioBand(lowEnergy, midEnergy, highEnergy) {
    return requireSensoryCognition("chooseDominantAudioBand")(lowEnergy, midEnergy, highEnergy);
  }

  function classifyUseAuditoryResponse(controller, auditory, context) {
    const pending = Number(controller?.pendingUseResponseFrames || 0) > 0
      || Boolean(controller?.firstDoorUsePulsed)
      || Number(controller?.firstDoorUseLatchFrames || 0) > 0;
    if (!pending || !auditory) {
      return auditory;
    }

    const energy = Math.max(Number(auditory.leftEnergy || 0), Number(auditory.rightEnergy || 0));
    const low = Number(auditory.lowEnergy || 0);
    const mid = Number(auditory.midEnergy || 0);
    const high = Number(auditory.highEnergy || 0);
    const bandEnergy = Math.max(low, mid, high);
    const rawEventType = normalizeAuditoryEventType(auditory.eventType);
    const nativeUseSfx = rawEventType === "native-sfx" || rawEventType === "doom-native-sfx";
    const audibleResponse = Boolean(auditory.eventDetected)
      || energy >= 0.002
      || bandEnergy >= 0.002;
    const visualResponse = Math.max(Number(context?.quantizedFrameChange || 0), Number(context?.regionQuantizedFrameChange || 0));
    if (!audibleResponse && visualResponse < 0.18) {
      return auditory;
    }

    const blockedBeforeUse = Boolean(controller?.lastUseWasBlocked);
    const gateLike = visualResponse >= 0.28
      || Number(context?.regionQuantizedFrameChange || 0) >= 0.2
      || Number(context?.visualStallDelta || 255) >= 0.18
      || Number(controller?.doorTransitionArmedFrames || 0) > 0;
    const shutterOpenLike = nativeUseSfx
      && (energy >= 0.018 || bandEnergy >= 0.018)
      && (gateLike || visualResponse >= 0.08 || Number(context?.depthEstimate || 0) >= 0.65);
    const voiceLike = high >= Math.max(0.012, low * 0.75) || mid >= 0.018;
    let eventType = rawEventType === "none" ? "use-response" : rawEventType;
    if (rawEventType === "use-success-gate") {
      eventType = "use-success-gate";
    } else if (rawEventType === "use-failed-voice") {
      eventType = "use-failed-voice";
    } else if (shutterOpenLike) {
      eventType = "use-success-gate";
    } else if (gateLike && (visualResponse >= 0.22 || !blockedBeforeUse) && (low >= 0.006 || energy >= 0.006 || bandEnergy >= 0.006)) {
      eventType = "use-success-gate";
    } else if (blockedBeforeUse || voiceLike || energy >= 0.006 || bandEnergy >= 0.006) {
      eventType = "use-failed-voice";
    }

    return createAuditorySnapshot(Object.assign({}, auditory, {
      eventType,
      eventDetected: true,
      lowEnergy: low,
      midEnergy: mid,
      highEnergy: high,
      dominantBand: auditory.dominantBand || chooseDominantAudioBand(low, mid, high)
    }));
  }

  function createSpatialSnapshot(overrides = {}) {
    return requireSensoryCognition("createSpatialSnapshot")(overrides);
  }

  function buildSpatialSnapshot(state, auditory) {
    const source = state?.spatialSnapshot || {};
    const derived = deriveSpatialSnapshot(state, auditory);
    return createSpatialSnapshot({
      visualDirection: Number(source.visualDirection ?? derived.visualDirection),
      auditoryCorrection: Number(source.auditoryCorrection ?? derived.auditoryCorrection),
      fusedDirection: Number(source.fusedDirection ?? derived.fusedDirection),
      confidence: Number(source.confidence ?? derived.confidence),
      timestamp: source.timestamp || derived.timestamp,
      eventDetected: Boolean(source.eventDetected ?? derived.eventDetected),
      eventType: source.eventType || derived.eventType,
      hudX: Number(source.hudX ?? derived.hudX),
      hudY: Number(source.hudY ?? derived.hudY),
      gain: Number(source.gain ?? derived.gain)
    });
  }

  function createVisionSensorSnapshot(overrides = {}) {
    return requireSensoryCognition("createVisionSensorSnapshot")(overrides);
  }

  function createMotorSensorSnapshot(overrides = {}) {
    return requireKinesisCognition("createMotorSensorSnapshot")(overrides);
  }

  function createMovementSensorSnapshot(overrides = {}) {
    return requireKinesisCognition("createMovementSensorSnapshot")(overrides);
  }

  function createCompassSensorSnapshot(overrides = {}) {
    return requireKinesisCognition("createCompassSensorSnapshot")(overrides);
  }

  function createSpatialSensorSnapshot(overrides = {}) {
    return requireKinesisCognition("createSpatialSensorSnapshot")(overrides);
  }

  function createNousCarrier(overrides = {}) {
    return requireNousCognition("createNousCarrier")(overrides);
  }

  function createChronosWindow(overrides = {}) {
    return requirePhantasiaCognition("createChronosWindow")(overrides);
  }

  function createPhantasiaSnapshot(overrides = {}) {
    return requirePhantasiaCognition("createPhantasiaSnapshot")(overrides);
  }

  function createPhainomenon(overrides = {}) {
    return requirePhainesisCognition("createPhainomenon")(overrides);
  }

  function createNousDetectorResult(overrides = {}) {
    return createPhainomenon(overrides);
  }

  function activePhainesisEvents(input = {}) {
    return requirePhainesisCognition("activePhainesisEvents")(input);
  }

  function buildPhantasiaSnapshot(controller, frame, timestamp) {
    const vision = controller.visionSensorSnapshot || createVisionSensorSnapshot();
    const movement = controller.movementSensorSnapshot || createMovementSensorSnapshot();
    const motor = controller.motorSensorSnapshot || createMotorSensorSnapshot();
    const health = controller.healthSensorSnapshot || createHealthSensorSnapshot();
    const audio = controller.auditorySnapshot || createAuditorySnapshot();
    const spatial = controller.spatialSensorSnapshot || createSpatialSensorSnapshot();
    const previous = controller.phantasiaSnapshot || createPhantasiaSnapshot();
    const projectile9x9 = Array.isArray(frame?.projectileVision9x9Sample) ? frame.projectileVision9x9Sample : [];
    const resource9x9 = Array.isArray(frame?.resourceVision9x9Sample) ? frame.resourceVision9x9Sample : [];
    const dynamicMask9x9 = createDynamicObstacleMask(frame, VISION_GRID_COLUMNS, VISION_GRID_ROWS);
    const staticSpatial9x9 = applyStaticObstacleMask(vision.quantized, dynamicMask9x9, previous.spatial9x9, VISION_GRID_COLUMNS * VISION_GRID_ROWS);
    const dynamicMaskCells = countMaskCells(dynamicMask9x9);
    const dynamicMaskCoverage = dynamicMaskCells / Math.max(1, VISION_GRID_COLUMNS * VISION_GRID_ROWS);
    const projectileDirection = gridDominantDirection(projectile9x9, VISION_GRID_COLUMNS)
      || gridDominantDirection(frame?.projectileRegion9Sample, REGION9_COLUMNS);
    const resourceDirection = gridDominantDirection(resource9x9, VISION_GRID_COLUMNS)
      || gridDominantDirection(frame?.resourceRegion9Sample, REGION9_COLUMNS);
    const temporalDelta = estimateTemporalDifference(previous.spatial9x9, staticSpatial9x9);
    const flow = estimateDenseGridFlow(previous.spatial9x9, staticSpatial9x9, VISION_GRID_COLUMNS, VISION_GRID_ROWS);
    const depth = Number(controller.depthEstimate ?? frame?.depthEstimate ?? 1);
    const narrowness = clamp01(((1 - depth) * 0.58) + (Number(controller.cornerSignal || 0) * 0.42));
    const trustedEnemyThreat = getTrustedEnemyThreat(controller);
    const trustedCombatEvidence = trustedEnemyThreat >= 0.26
      || Number(controller.enemyAlertFrames || 0) > 0
      || Number(controller.projectileScore || frame?.projectileScore || 0) >= 0.16;
    return createPhantasiaSnapshot({
      timestamp,
      signature: vision.signature,
      base3x3Signature: controller.region9Signature,
      base3x3: normalizeRegion9(frame?.region9Sample),
      spatial9x9: staticSpatial9x9,
      rawSpatial9x9: vision.quantized,
      dynamicMask9x9,
      dynamicMaskCells,
      baseDirection: coarseBaseDirection(frame),
      projectile9x9,
      projectileScore: frame?.projectileScore,
      projectileDirection,
      resource9x9,
      resourceScore: frame?.resourceScore,
      resourceDirection,
      enemyConfidence: Math.max(Number(frame?.enemyConfidence || 0), Number(controller.enemyConfidence || 0)),
      trustedEnemyThreat,
      trustedCombatEvidence,
      audioBalance: audio.balance,
      audioEnergy: Math.max(Number(audio.leftEnergy || 0), Number(audio.rightEnergy || 0)),
      audioLowEnergy: audio.lowEnergy,
      audioMidEnergy: audio.midEnergy,
      audioHighEnergy: audio.highEnergy,
      audioDominantBand: audio.dominantBand,
      audioEventDetected: Boolean(audio.eventDetected),
      audioEventType: audio.eventType,
      audioDirection: audio.balance > 0.12 ? "right" : (audio.balance < -0.12 ? "left" : "front"),
      movementSpeed: movement.speed,
      motionForwardProgress: controller.motionForwardProgress,
      motorForward: motor.vectorY,
      actionSignature: controller.kinesisActionSignature,
      actionRepeatFrames: controller.kinesisActionRepeatFrames,
      temporalDelta,
      flowX: flow.flowX,
      flowY: flow.flowY,
      dynamicObjectScore: Math.max(flow.dynamicScore, temporalDelta, dynamicMaskCoverage, Number(frame?.projectileScore || 0), trustedEnemyThreat * 0.4),
      spatialConfidence: spatial.confidence,
      spatialEvent: spatial.eventDetected,
      depthEstimate: depth,
      depthSignature: controller.depthSignature,
      footObstacleFlickerScore: controller.footObstacleFlickerScore,
      footObstacleBounceFrames: controller.footObstacleBounceFrames,
      firstDoorVision9x9Score: controller.firstDoorVision9x9Score || frame?.firstDoorVision9x9Score || 0,
      firstDoorUse3x3Score: controller.firstDoorUse3x3Score || frame?.firstDoorUse3x3Score || 0,
      spawnCorridorGapScore: controller.spawnCorridorGapScore || frame?.spawnCorridorGapScore || 0,
      spawnLandmarkRouteEvidence: controller.spawnLandmarkRouteEvidence || 0,
      computerRoomScore: controller.computerRoomScore || frame?.computerRoomScore || 0,
      computerPanelScore: controller.computerPanelScore || frame?.computerPanelScore || 0,
      computerDarkPanelScore: controller.computerDarkPanelScore || frame?.computerDarkPanelScore || 0,
      bridgeDoorScore: controller.bridgeDoorScore || frame?.bridgeDoorScore || 0,
      healthActiveCells: health.activeCells,
      healthZeroScore: health.zeroScore,
      faceDelta: health.faceQuantizedFrameChange,
      narrowness,
      stuckFrames: controller.stuckFrames,
      inputStallFrames: controller.inputStallFrames
    });
  }

  function pushChronosFrame(chronosWindow, snapshot) {
    if (!chronosWindow || !Array.isArray(chronosWindow.frames)) {
      return createChronosWindow({ frames: [snapshot] });
    }

    chronosWindow.frames.push(snapshot);
    while (chronosWindow.frames.length > CHRONOS_WINDOW_LIMIT) {
      chronosWindow.frames.shift();
    }

    return chronosWindow;
  }

  function rememberResourceCandidate(controller, snapshot) {
    if (!controller || !snapshot || snapshot.resourceScore < 0.22) {
      return;
    }

    const healthy = Number(snapshot.healthActiveCells || 0) >= 10 && Number(snapshot.healthZeroScore || 0) < 0.34;
    if (!healthy) {
      return;
    }

    if (!Array.isArray(controller.itemMemory)) {
      controller.itemMemory = [];
    }

    controller.itemMemory.push({
      targetKind: "resource",
      direction: snapshot.resourceDirection || "center",
      confidence: snapshot.resourceScore,
      signature: snapshot.signature,
      timestamp: snapshot.timestamp
    });
    while (controller.itemMemory.length > ITEM_MEMORY_LIMIT) {
      controller.itemMemory.shift();
    }
  }

  function evaluateNousDetectorResult(nousCarrier, chronosWindow, spatialHistory, controller) {
    const frames = Array.isArray(chronosWindow?.frames) ? chronosWindow.frames : [];
    const latest = frames.length > 0 ? frames[frames.length - 1] : createPhantasiaSnapshot();
    const demoRouteGraceActive = isPreDoorDemoRouteGraceActive(controller, latest);
    const preDoorNoCombat = controller?.doorOpenedCount <= 0 && !hasTrustedCombatEvidence(controller);
    return requirePhainesisCognition("evaluatePhainomenon")({
      nousCarrier,
      frames,
      latest,
      spatialHistory,
      itemMemory: controller?.itemMemory,
      demoRouteGraceActive,
      preDoorNoCombat,
      movementEventType: controller?.movementSensorSnapshot?.eventType || "movement",
      movementConfidence: Number(controller?.movementSensorSnapshot?.confidence || 0)
    });
  }

  function countRecentSignature(frames, signature, limit) {
    if (!signature || !Array.isArray(frames)) {
      return 0;
    }

    let count = 0;
    const start = Math.max(0, frames.length - limit);
    for (let index = start; index < frames.length; index += 1) {
      if (frames[index]?.signature === signature) {
        count += 1;
      }
    }

    return count;
  }

  function estimateTemporalDifference(previousValues, currentValues) {
    if (!Array.isArray(previousValues) || !Array.isArray(currentValues) || previousValues.length === 0 || currentValues.length === 0) {
      return 0;
    }

    const length = Math.min(previousValues.length, currentValues.length);
    let total = 0;
    for (let index = 0; index < length; index += 1) {
      total += Math.abs(Number(currentValues[index] || 0) - Number(previousValues[index] || 0));
    }

    return clamp01(total / (length * 255));
  }

  function createDynamicObstacleMask(frame, columns, rows) {
    const width = Math.max(1, Number(columns || 1));
    const height = Math.max(1, Number(rows || 1));
    const total = width * height;
    const mask = new Array(total).fill(false);
    const threshold = 0.12;
    if (width === VISION_GRID_COLUMNS && height === VISION_GRID_ROWS) {
      addMaskFromValues(mask, frame?.projectileVision9x9Sample, width, height, threshold);
      addRegion9ObstacleMask(mask, frame?.projectileRegion9Sample, width, height, threshold);
      addRegion9ObstacleMask(mask, frame?.enemyRegion9Sample, width, height, threshold);
    } else if (width === REGION9_COLUMNS && height === REGION9_ROWS) {
      addMaskFromValues(mask, frame?.projectileRegion9Sample, width, height, threshold);
      addMaskFromValues(mask, frame?.enemyRegion9Sample, width, height, threshold);
    }

    return dilateObstacleMask(mask, width, height);
  }

  function addMaskFromValues(mask, values, columns, rows, threshold) {
    if (!Array.isArray(mask) || !Array.isArray(values)) {
      return;
    }

    const total = Math.min(mask.length, Math.max(1, Number(columns || 1)) * Math.max(1, Number(rows || 1)), values.length);
    for (let index = 0; index < total; index += 1) {
      if (Number(values[index] || 0) >= threshold) {
        mask[index] = true;
      }
    }
  }

  function addRegion9ObstacleMask(mask, values, columns, rows, threshold) {
    if (!Array.isArray(mask) || !Array.isArray(values) || values.length < 9) {
      return;
    }

    const width = Math.max(1, Number(columns || 1));
    const height = Math.max(1, Number(rows || 1));
    for (let regionRow = 0; regionRow < REGION9_ROWS; regionRow += 1) {
      for (let regionColumn = 0; regionColumn < REGION9_COLUMNS; regionColumn += 1) {
        const regionIndex = regionRow * REGION9_COLUMNS + regionColumn;
        if (Number(values[regionIndex] || 0) < threshold) {
          continue;
        }

        const startY = Math.floor(regionRow * height / REGION9_ROWS);
        const endY = Math.max(startY + 1, Math.floor((regionRow + 1) * height / REGION9_ROWS));
        const startX = Math.floor(regionColumn * width / REGION9_COLUMNS);
        const endX = Math.max(startX + 1, Math.floor((regionColumn + 1) * width / REGION9_COLUMNS));
        for (let y = startY; y < Math.min(height, endY); y += 1) {
          for (let x = startX; x < Math.min(width, endX); x += 1) {
            mask[y * width + x] = true;
          }
        }
      }
    }
  }

  function dilateObstacleMask(mask, columns, rows) {
    const width = Math.max(1, Number(columns || 1));
    const height = Math.max(1, Number(rows || 1));
    const total = width * height;
    if (!Array.isArray(mask) || mask.length < total) {
      return new Array(total).fill(false);
    }

    const next = mask.slice(0, total);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        if (!mask[index]) {
          continue;
        }

        for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy += 1) {
          for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx += 1) {
            next[yy * width + xx] = true;
          }
        }
      }
    }

    return next;
  }

  function applyStaticObstacleMask(values, mask, previousValues, totalCells) {
    const total = Math.max(1, Number(totalCells || 1));
    const next = new Array(total).fill(0);
    for (let index = 0; index < total; index += 1) {
      if (Array.isArray(mask) && mask[index]) {
        next[index] = Array.isArray(previousValues) && previousValues.length > index
          ? Number(previousValues[index] || 0)
          : 0;
      } else {
        next[index] = Array.isArray(values) && values.length > index
          ? Number(values[index] || 0)
          : 0;
      }
    }

    return next;
  }

  function countMaskCells(mask) {
    if (!Array.isArray(mask)) {
      return 0;
    }

    let count = 0;
    for (let index = 0; index < mask.length; index += 1) {
      if (mask[index]) {
        count += 1;
      }
    }

    return count;
  }

  function estimateDenseGridFlow(previousValues, currentValues, columns, rows) {
    const width = Math.max(1, Number(columns || 1));
    const height = Math.max(1, Number(rows || 1));
    const total = width * height;
    if (!Array.isArray(previousValues) || !Array.isArray(currentValues) || previousValues.length < total || currentValues.length < total) {
      return { flowX: 0, flowY: 0, dynamicScore: 0 };
    }

    let weightedX = 0;
    let weightedY = 0;
    let weightTotal = 0;
    let dynamicTotal = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = y * width + x;
        const current = Number(currentValues[index] || 0);
        let bestDifference = Math.abs(current - Number(previousValues[index] || 0));
        let bestX = 0;
        let bestY = 0;
        for (let oy = -1; oy <= 1; oy += 1) {
          const yy = y + oy;
          if (yy < 0 || yy >= height) {
            continue;
          }

          for (let ox = -1; ox <= 1; ox += 1) {
            const xx = x + ox;
            if (xx < 0 || xx >= width) {
              continue;
            }

            const candidate = Math.abs(current - Number(previousValues[yy * width + xx] || 0));
            if (candidate < bestDifference) {
              bestDifference = candidate;
              bestX = ox;
              bestY = oy;
            }
          }
        }

        const sameCellDifference = Math.abs(current - Number(previousValues[index] || 0));
        const weight = clamp01(sameCellDifference / 255);
        weightedX += bestX * weight;
        weightedY += bestY * weight;
        weightTotal += weight;
        dynamicTotal += sameCellDifference;
      }
    }

    if (weightTotal <= 0) {
      return { flowX: 0, flowY: 0, dynamicScore: clamp01(dynamicTotal / (total * 255)) };
    }

    return {
      flowX: clampSigned(weightedX / weightTotal),
      flowY: clampSigned(weightedY / weightTotal),
      dynamicScore: clamp01(dynamicTotal / (total * 255))
    };
  }

  function gridDominantDirection(values, columns) {
    if (!Array.isArray(values) || values.length === 0) {
      return null;
    }

    const width = Math.max(1, Number(columns || REGION9_COLUMNS));
    let left = 0;
    let center = 0;
    let right = 0;
    for (let index = 0; index < values.length; index += 1) {
      const score = Number(values[index] || 0);
      const column = index % width;
      if (column < width / 3) {
        left += score;
      } else if (column >= (width * 2) / 3) {
        right += score;
      } else {
        center += score;
      }
    }

    const peak = Math.max(left, center, right);
    if (peak <= 0.04) {
      return null;
    }

    if (Math.abs(left - right) <= 0.03 && center >= peak * 0.72) {
      return "center";
    }

    return right > left ? "right" : "left";
  }

  function coarseBaseDirection(frame) {
    const left = Number(frame?.left || 0);
    const center = Number(frame?.center || 0);
    const right = Number(frame?.right || 0);
    const peak = Math.max(left, center, right);
    if (peak <= 0) {
      return null;
    }

    if (Math.abs(left - right) <= Math.max(4, peak * 0.08) && center >= peak * 0.72) {
      return "center";
    }

    return right > left ? "right" : "left";
  }

  function normalizeRelativeDirection(value) {
    return value === "left" || value === "right" || value === "center" || value === "behind"
      ? value
      : null;
  }

  function refreshSensorCognition(controller, state, frame, context) {
    const timestamp = state?.timestamp || context?.auditorySnapshot?.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP;
    const sensors = state?.sensors || {};
    const quantizedVision9x9 = normalizeVision9x9(context?.quantizedVision9x9);
    const visionConfidence = sensorEnabled(sensors, "visual") ? estimateTargetConfidence(frame) : 0;
    const auditory = context?.auditorySnapshot || createAuditorySnapshot({ timestamp });
    const motor = buildMotorSensorSnapshot(state, context?.action, timestamp);
    const movement = buildMovementSensorSnapshot(state, frame, context?.motion, auditory, motor, timestamp);
    const compass = buildCompassSensorSnapshot(state, movement, auditory, timestamp);
    controller.visionSensorSnapshot = createVisionSensorSnapshot({
      active: sensorEnabled(sensors, "visual") && quantizedVision9x9.length > 0,
      quantized: quantizedVision9x9,
      signature: regionSignature(quantizedVision9x9).padEnd(VISION_GRID_COLUMNS * VISION_GRID_ROWS, "0").slice(0, VISION_GRID_COLUMNS * VISION_GRID_ROWS),
      left: frame?.left || 0,
      center: frame?.center || 0,
      right: frame?.right || 0,
      confidence: visionConfidence,
      eventDetected: visionConfidence >= 0.62 || Number(frame?.enemyConfidence || 0) >= 0.5,
      timestamp
    });
    controller.motorSensorSnapshot = motor;
    controller.movementSensorSnapshot = movement;
    controller.compassSensorSnapshot = compass;
    appendSpatialHistory(controller, controller.spatialSnapshot);
    controller.spatialSensorSnapshot = buildSpatialSensorSnapshot(controller.spatialSnapshot, controller.spatialHistory, movement, compass);
    controller.nousCarrier = buildNousCarrier(controller, state, timestamp);
    controller.phantasiaSnapshot = buildPhantasiaSnapshot(controller, frame, timestamp);
    rememberResourceCandidate(controller, controller.phantasiaSnapshot);
    controller.chronosWindow = pushChronosFrame(controller.chronosWindow, controller.phantasiaSnapshot);
    controller.phainomenon = evaluateNousDetectorResult(controller.nousCarrier, controller.chronosWindow, controller.spatialHistory, controller);
    controller.nousDetectorResult = controller.phainomenon;
    controller.sensorDetections = buildSensorDetections(controller);
    controller.nousCarrier = buildNousCarrier(controller, state, timestamp);
  }

  function buildMotorSensorSnapshot(state, action, timestamp) {
    const sensors = state?.sensors || {};
    const source = state?.motor || {};
    const safeAction = action || source;
    const active = sensorEnabled(sensors, "motor") && Boolean(source.active || safeAction.move !== "none" || safeAction.turn !== "none" || safeAction.strafe || safeAction.run || safeAction.use || safeAction.fire);
    const turn = safeAction.turn === "left" ? "left" : (safeAction.turn === "right" ? "right" : (source.turn || "none"));
    const move = safeAction.move === "forward" ? "forward" : (safeAction.move === "back" ? "back" : (source.move || "none"));
    return createMotorSensorSnapshot({
      active,
      move,
      turn,
      strafe: Boolean(safeAction.strafe ?? source.strafe),
      run: Boolean(safeAction.run ?? source.run),
      use: Boolean(safeAction.use ?? source.use),
      fire: Boolean(safeAction.fire ?? source.fire),
      vectorX: turn === "right" ? 1 : (turn === "left" ? -1 : Number(source.vectorX || 0)),
      vectorY: move === "forward" ? 1 : (move === "back" ? -1 : Number(source.vectorY || 0)),
      timestamp
    });
  }

  function buildMovementSensorSnapshot(state, frame, motion, auditory, motor, timestamp) {
    const sensors = state?.sensors || {};
    if (!sensorEnabled(sensors, "movement")) {
      return createMovementSensorSnapshot({ timestamp, eventType: "none" });
    }

    const left = Number(frame?.left || 0);
    const right = Number(frame?.right || 0);
    const center = Number(frame?.center || 0);
    const visualBias = sensorEnabled(sensors, "visual")
      ? clampSigned((right - left) / Math.max(1, left + right + center))
      : 0;
    const auditoryBias = sensorEnabled(sensors, "audio") ? clampSigned(Number(auditory?.balance || 0)) : 0;
    const motorX = sensorEnabled(sensors, "motor") ? clampSigned(Number(motor?.vectorX || 0)) : 0;
    const motorY = sensorEnabled(sensors, "motor") ? clampSigned(Number(motor?.vectorY || 0)) : 0;
    const forwardProgress = clamp01(Number(motion?.forwardProgress || 0));
    const obstacle = clamp01(Number(motion?.obstacleScore || 0));
    const stallScore = clamp01(Number(motion?.stallScore || 0));
    const visualFlow = state?.visualMotion || {};
    const visualMotionMagnitude = clamp01(Number(visualFlow.magnitude || visualFlow.baseMagnitude || 0));
    const intentForward = motorY > 0.45;
    const intentBlocked = intentForward
      && forwardProgress <= 0.08
      && (stallScore >= 0.72 || obstacle >= 0.42 || visualMotionMagnitude <= 0.03);
    const vectorX = clampSigned((visualBias * 0.36) + (auditoryBias * 0.34) + (motorX * 0.3));
    const vectorY = intentBlocked
      ? clampSigned((forwardProgress * 0.34) - (obstacle * 0.22))
      : clampSigned((motorY * 0.62) + (forwardProgress * 0.28) - (obstacle * 0.22));
    const confidence = clamp01(Math.max(Math.abs(vectorX), Math.abs(vectorY), forwardProgress, obstacle, intentBlocked ? stallScore : 0));
    return createMovementSensorSnapshot({
      active: Boolean(motor?.active) || confidence >= 0.18,
      vectorX,
      vectorY,
      confidence,
      eventDetected: intentBlocked || confidence >= 0.42 || obstacle >= 0.55,
      eventType: intentBlocked || obstacle >= 0.55 ? "movement-stall" : "movement",
      timestamp
    });
  }

  function buildCompassSensorSnapshot(state, movement, auditory, timestamp) {
    const sensors = state?.sensors || {};
    const source = state?.compass || {};
    if (!sensorEnabled(sensors, "compass")) {
      return createCompassSensorSnapshot({ timestamp, source: "sensor-cutoff" });
    }

    if (source.source === "health-freeze" || Number(source.confidence || 0) <= 0 && source.source === "evidence-hold") {
      return createCompassSensorSnapshot({
        active: false,
        heading: Number.isFinite(Number(source.heading)) ? Number(source.heading) : 0,
        origin: source.origin || "N=0deg",
        baseHeading: Number.isFinite(Number(source.baseHeading)) ? Number(source.baseHeading) : Number(source.heading || 0),
        vectorX: 0,
        vectorY: 0,
        confidence: 0,
        source: source.source || "evidence-hold",
        correctionSource: source.correctionSource || source.source || "evidence-hold",
        landmark: source.landmark || "",
        landmarkKind: source.landmarkKind || "",
        landmarkLabel: source.landmarkLabel || "",
        landmarkHeading: source.landmarkHeading,
        landmarkConfidence: source.landmarkConfidence,
        landmarkForced: source.landmarkForced,
        headingUsable: false,
        headingUncertain: true,
        headingReliability: source.headingReliability || source.source || "evidence-hold",
        useCompassForRouting: false,
        contextResetActive: source.contextResetActive,
        wallFollowActive: source.wallFollowActive,
        wallOnlyView: source.wallOnlyView,
        corridorOnlyView: source.corridorOnlyView,
        timestamp
      });
    }

    const movementX = Number(movement?.vectorX || 0);
    const movementY = Number(movement?.vectorY || 0);
    const audioBias = sensorEnabled(sensors, "audio") ? Number(auditory?.balance || 0) : 0;
    const sourceFlow = clampSigned(Number(source.visualFlowBias || 0));
    const sourceConfidence = clamp01(Number(source.confidence || 0));
    const vectorX = clampSigned((movementX * 0.58) + (audioBias * 0.18) + (sourceFlow * sourceConfidence * 0.24));
    const vectorY = clampSigned(Number(movement?.vectorY || 0));
    const derivedHeading = ((Math.atan2(vectorX, Math.max(0.001, vectorY)) * 180 / Math.PI) + 360) % 360;
    const heading = Number.isFinite(Number(source.heading)) ? Number(source.heading) : derivedHeading;
    const baseHeading = Number.isFinite(Number(source.baseHeading)) ? Number(source.baseHeading) : heading;
    const confidence = clamp01(Math.max(sourceConfidence, Number(movement?.confidence || 0) * 0.8));
    return createCompassSensorSnapshot({
      active: Boolean(source.active) || confidence >= 0.18,
      heading,
      origin: source.origin || "N=0deg",
      baseHeading,
      vectorX,
      vectorY,
      visualBias: source.visualBias,
      visualFlowBias: source.visualFlowBias,
      baseFlowBias: source.baseFlowBias,
      motorBias: source.motorBias,
      audioBias: source.audioBias,
      movementBias: source.movementBias,
      visualBiasDelta: source.visualBiasDelta,
      visualFlowDelta: source.visualFlowDelta,
      baseFlowDelta: source.baseFlowDelta,
      motorDelta: source.motorDelta,
      audioDelta: source.audioDelta,
      movementDelta: source.movementDelta,
      landmarkDelta: source.landmarkDelta,
      motorHeading: source.motorHeading,
      visualFlowHeading: source.visualFlowHeading,
      rotationInstructionDelta: source.rotationInstructionDelta,
      frameBufferVectorDelta: source.frameBufferVectorDelta,
      edgeSnapDelta: source.edgeSnapDelta,
      edgeSnapHeading: source.edgeSnapHeading,
      edgeSnapConfidence: source.edgeSnapConfidence,
      edgeSnapWeight: source.edgeSnapWeight,
      correctionDegrees: source.correctionDegrees,
      correctionSource: source.correctionSource,
      landmark: source.landmark,
      landmarkKind: source.landmarkKind,
      landmarkLabel: source.landmarkLabel,
      landmarkHeading: source.landmarkHeading,
      landmarkConfidence: source.landmarkConfidence,
      landmarkForced: source.landmarkForced,
      evidence: source.evidence,
      confidence,
      headingUsable: source.headingUsable,
      headingUncertain: source.headingUncertain,
      headingReliability: source.headingReliability,
      useCompassForRouting: source.useCompassForRouting,
      contextResetActive: source.contextResetActive,
      wallFollowActive: source.wallFollowActive,
      wallOnlyView: source.wallOnlyView,
      corridorOnlyView: source.corridorOnlyView,
      source: source.source || "movement-audio-relative",
      timestamp
    });
  }

  function appendSpatialHistory(controller, spatial) {
    if (!Array.isArray(controller.spatialHistory)) {
      controller.spatialHistory = [];
    }

    controller.spatialHistory.push({
      fusedDirection: Number(spatial?.fusedDirection || 0),
      confidence: clamp01(Number(spatial?.confidence || 0)),
      hudX: clamp01(Number(spatial?.hudX ?? 0.5)),
      hudY: clamp01(Number(spatial?.hudY ?? 0.45)),
      eventDetected: Boolean(spatial?.eventDetected),
      eventType: spatial?.eventType || "none",
      timestamp: spatial?.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    });
    while (controller.spatialHistory.length > SPATIAL_HISTORY_LIMIT) {
      controller.spatialHistory.shift();
    }
  }

  function buildSpatialSensorSnapshot(spatial, history, movement, compass) {
    const frames = Array.isArray(history) ? history : [];
    let direction = Number(spatial?.fusedDirection || 0);
    let confidence = clamp01(Number(spatial?.confidence || 0));
    let hudX = clamp01(Number(spatial?.hudX ?? 0.5));
    let hudY = clamp01(Number(spatial?.hudY ?? 0.45));
    let activeEvents = 0;
    if (frames.length > 0) {
      let directionTotal = 0;
      let confidenceTotal = 0;
      let hudXTotal = 0;
      let hudYTotal = 0;
      for (let index = 0; index < frames.length; index += 1) {
        const item = frames[index];
        directionTotal += Number(item.fusedDirection || 0);
        confidenceTotal += Number(item.confidence || 0);
        hudXTotal += Number(item.hudX ?? 0.5);
        hudYTotal += Number(item.hudY ?? 0.45);
        if (item.eventDetected) {
          activeEvents += 1;
        }
      }

      direction = directionTotal / frames.length;
      confidence = clamp01(confidenceTotal / frames.length);
      hudX = clamp01(hudXTotal / frames.length);
      hudY = clamp01(hudYTotal / frames.length);
    }

    const directionRadians = direction * Math.PI / 180;
    const compassConfidence = clamp01(Number(compass?.confidence || 0));
    const movementConfidence = clamp01(Number(movement?.confidence || 0));
    const fusedConfidence = Math.max(confidence, movementConfidence * 0.35, compassConfidence * 0.25);
    return createSpatialSensorSnapshot({
      active: Boolean(spatial?.eventDetected) || Boolean(movement?.active) || Boolean(compass?.active),
      vectorX: Math.sin(directionRadians),
      vectorY: Math.cos(directionRadians),
      fusedDirection: direction,
      confidence: fusedConfidence,
      historyFrames: frames.length,
      eventDetected: Boolean(spatial?.eventDetected) || (activeEvents >= 2 && fusedConfidence >= 0.18),
      eventType: spatial?.eventType || (activeEvents >= 2 ? "spatial-persistence" : "spatial-event"),
      hudX,
      hudY,
      timestamp: spatial?.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP
    });
  }

  function buildSensorDetections(controller) {
    const doorTransitionGraceActive = isDoorTransitionGraceActive(controller);
    return activePhainesisEvents({
      phainomenon: controller.phainomenon || controller.nousDetectorResult || createNousDetectorResult(),
      doorTransitionGraceActive,
      healthRetry: Boolean(controller.healthSensorSnapshot?.retryRequested),
      visualEventDetected: Boolean(controller.visionSensorSnapshot?.eventDetected),
      audioEventDetected: Boolean(controller.auditorySnapshot?.eventDetected),
      movementEventDetected: Boolean(controller.movementSensorSnapshot?.eventDetected),
      movementEventType: controller.movementSensorSnapshot?.eventType || "movement",
      spatialEventDetected: Boolean(controller.spatialSensorSnapshot?.eventDetected)
    });
  }

  function buildNousCarrier(controller, state, timestamp) {
    const health = controller.healthSensorSnapshot || createHealthSensorSnapshot();
    const movement = controller.movementSensorSnapshot || createMovementSensorSnapshot();
    const spatial = controller.spatialSensorSnapshot || createSpatialSensorSnapshot();
    const visual = controller.visionSensorSnapshot || createVisionSensorSnapshot();
    const audio = controller.auditorySnapshot || createAuditorySnapshot();
    const aisthesisScore = health.retryRequested
      ? 0
      : Math.max(Number(visual.confidence || 0), Number(audio.leftEnergy || 0), Number(audio.rightEnergy || 0));
    const kinesisScore = Number(movement.confidence || 0);
    const phantasiaScore = Number(spatial.confidence || 0);
    const bonsaiTernary = {
      aisthesis: health.retryRequested ? "negative" : ternaryScore(aisthesisScore),
      kinesis: ternaryScore(kinesisScore),
      phantasia: ternaryScore(phantasiaScore)
    };
    const phainomenon = controller.phainomenon || controller.nousDetectorResult || createNousDetectorResult();
    const meaningVectors = requireNousCognition("buildMeaningVectors")(phainomenon);
    return createNousCarrier({
      normalizedSensorMap: normalizeNousSensorMap(state?.sensors || {}),
      spatial9x9: {
        baseColumns: REGION9_COLUMNS,
        baseRows: REGION9_ROWS,
        baseSignature: controller.phantasiaSnapshot?.base3x3Signature || controller.region9Signature || "000000000",
        baseFeatures: controller.phantasiaSnapshot?.base3x3 || [],
        columns: VISION_GRID_COLUMNS,
        rows: VISION_GRID_ROWS,
        signature: visual.signature,
        features: visual.quantized,
        projectileMask: controller.phantasiaSnapshot?.projectile9x9 || [],
        resourceMask: controller.phantasiaSnapshot?.resource9x9 || [],
        temporalDelta: controller.phantasiaSnapshot?.temporalDelta || 0,
        flowX: controller.phantasiaSnapshot?.flowX || 0,
        flowY: controller.phantasiaSnapshot?.flowY || 0
      },
      movementEnvelope: {
        x: movement.turn,
        y: movement.advance,
        rotation: ternarySigned(Number(movement.vectorX || 0))
      },
      healthEnvelope: {
        life: health.retryRequested ? "negative" : (health.likelyDead ? "negative" : "positive"),
        retry: health.retryRequested ? "positive" : "neutral"
      },
      bonsaiTernary,
      ctgTrace: {
        canonId: CTG_ROM_CANON_ID,
        policyId: CTG_ROM_POLICY_ID,
        gateExecuted: false,
        ternaryTrace: bonsaiTernary
      },
      meaningVectors,
      cognitionHints: {
        retryRequested: Boolean(health.retryRequested),
        spatialEvent: Boolean(spatial.eventDetected),
        routeHint: controller.controlPipeline || "Idle",
        activeDetections: controller.sensorDetections || [],
        phainomenon,
        nousDetectorResult: controller.nousDetectorResult || phainomenon,
        meaningVectors,
        audioBands: {
          low: audio.lowEnergy || 0,
          mid: audio.midEnergy || 0,
          high: audio.highEnergy || 0,
          dominant: audio.dominantBand || "none"
        }
      },
      timestamp
    });
  }

  function isDoorTransitionGraceActive(controller, state) {
    if (!controller) {
      return false;
    }

    if (Number(controller.pendingUseResponseFrames || 0) > 0
      || Number(controller.doorTransitionArmedFrames || 0) > 0
      || Number(controller.firstDoorUseLatchFrames || 0) > 0) {
      return true;
    }

    const frame = Number(state?.frame || controller.predictions || 0);
    const useFrame = Number(controller.firstDoorUseFrame || 0);
    return controller.doorOpenedCount > 0
      && useFrame > 0
      && frame >= useFrame
      && frame - useFrame <= 36
      && !controller.finalRoomEntered;
  }

  function clearLegacyDoorTransitionInterventions(controller) {
    if (!controller) {
      return false;
    }

    const active = Number(controller.doorTransitionArmedFrames || 0) > 0
      || (Number(controller.doorOpenedCount || 0) > 0
        && !controller.computerRoomEntered
        && !controller.finalRoomEntered);
    if (!active) {
      return false;
    }

    controller.wallUseProbeFrames = 0;
    controller.wallUseProbeStage = 0;
    controller.pendingUseResponseFrames = 0;
    controller.lastUseWasBlocked = false;
    controller.firstDoorReprobeFrames = 0;
    controller.firstDoorUseLatchFrames = 0;
    controller.firstDoorUsePulsed = false;
    controller.wallFollowFrames = 0;
    controller.wallDetachFrames = 0;
    controller.wallSurveyFrames = 0;
    controller.wallSurveyDecisionFrames = 0;
    controller.hardStuckEscapeFrames = 0;
    controller.openStallEscapeFrames = 0;
    controller.loopEscapeFrames = 0;
    controller.recoveryFrames = 0;
    controller.repeatTurnFrames = 0;
    controller.repeatActionFrames = 0;
    controller.repeatActionSignature = "";
    controller.mapRushCorrectionFrames = 0;
    controller.mapRushCorrectionBackFrames = 0;
    controller.mapDoorSweepFrames = 0;
    controller.firstDoorCorridorSearchFrames = 0;
    controller.stuckFrames = Math.min(Number(controller.stuckFrames || 0), 1);
    controller.quantizedStallFrames = Math.min(Number(controller.quantizedStallFrames || 0), 1);
    controller.inputStallFrames = Math.min(Number(controller.inputStallFrames || 0), 1);
    return true;
  }

  function isPreDoorDemoRouteGraceActive(controller, latest) {
    if (!controller || controller.doorOpenedCount > 0) {
      return false;
    }

    if (controller.firstDoorUseAttempted
      || Number(controller.wallUseProbeFrames || 0) > 0
      || Number(controller.firstDoorUseLatchFrames || 0) > 0) {
      return false;
    }

    const depth = Number(controller.depthEstimate ?? latest?.depthEstimate ?? 1);
    if (depth < 0.38) {
      return false;
    }

    const spawnCorridorGapThreshold = profileNumber(controller.profile, "spawnCorridorGapThreshold", SPAWN_CORRIDOR_GAP_THRESHOLD);
    const routeEvidence = Math.max(
      Number(controller.spawnCorridorGapScore || 0),
      Number(controller.spawnLandmarkRouteEvidence || 0),
      Number(controller.firstDoorCorridorSignature || 0),
      Number(controller.firstDoorVision9x9Score || 0),
      Number(controller.motionEntranceScore || 0));
    const movingEvidence = Math.max(
      Number(controller.motionForwardProgress || 0),
      Number(controller.motionTurnScore || 0),
      Number(latest?.movementSpeed || 0));
    const routeVisible = controller.firstDoorCorridorLocated
      || Number(controller.spawnCorridorGapFrames || 0) > 0
      || Number(controller.spawnLandmarkRouteFrames || 0) >= 2
      || routeEvidence >= Math.max(0.18, spawnCorridorGapThreshold - 0.08);

    return Boolean(routeVisible && movingEvidence >= 0.04);
  }

  function normalizeNousSensorMap(sensors) {
    return requireNousCognition("normalizeNousSensorMap")(sensors);
  }

  function sensorEnabled(sensors, name) {
    const value = sensors?.[name];
    if (value && typeof value === "object") {
      return value.enabled !== false;
    }

    return value !== false;
  }

  function deriveSpatialSnapshot(state, auditory) {
    const sensors = state?.sensors || {};
    const timestamp = state?.timestamp || auditory?.timestamp || DEFAULT_SNAPSHOT_TIMESTAMP;
    if (!sensorEnabled(sensors, "spatial")) {
      return createSpatialSnapshot({ timestamp, eventType: "none" });
    }

    const frame = sensorEnabled(sensors, "visual") ? (state?.framebuffer || {}) : {};
    const motor = sensorEnabled(sensors, "motor") ? (state?.motor || {}) : {};
    const compass = sensorEnabled(sensors, "compass") ? (state?.compass || {}) : {};
    const left = Number(frame.left || 0);
    const right = Number(frame.right || 0);
    const center = Number(frame.center || 0);
    const total = Math.max(1, left + right + center);
    const visualBias = clampSigned((right - left) / total);
    const visualMotion = state?.visualMotion || frame?.visualMotion || {};
    const visualFlowBias = clampSigned(Number(visualMotion.vectorX || 0));
    const visualFlowConfidence = clamp01(Number(visualMotion.confidence || visualMotion.magnitude || 0));
    const motorBias = clampSigned(Number(motor.vectorX || 0) * 0.45);
    const heading = Number(compass.heading || 0);
    const compassRelative = (((heading + 540) % 360) - 180) / 180;
    const compassBias = clampSigned(compassRelative) * clamp01(Number(compass.confidence || 0));
    const auditoryBalance = sensorEnabled(sensors, "audio") ? Number(auditory?.balance || 0) : 0;
    const auditoryCorrection = clampSigned(auditoryBalance) * 35;
    const visualDirection = clampSigned((visualBias * 0.46) + (visualFlowBias * 0.22) + (motorBias * 0.22) + (compassBias * 0.1)) * 45;
    const fusedDirection = visualDirection + auditoryCorrection;
    const audioEnergy = sensorEnabled(sensors, "audio") ? Math.max(Number(auditory?.leftEnergy || 0), Number(auditory?.rightEnergy || 0)) : 0;
    const visualConfidence = sensorEnabled(sensors, "visual")
      ? Math.max(estimateTargetConfidence(frame), visualFlowConfidence * 0.72)
      : 0;
    const compassConfidence = clamp01(Number(compass.confidence || 0));
    const confidence = clamp01(Math.max(visualConfidence, audioEnergy * 0.85, compassConfidence * 0.55));
    const spatialTurn = Math.abs(fusedDirection) >= 18 && confidence >= 0.35;
    const eventDetected = Boolean(auditory?.eventDetected) || visualConfidence >= 0.62 || spatialTurn || visualFlowConfidence >= 0.22;
    const eventType = auditory?.eventDetected
      ? auditory.eventType
      : (visualConfidence >= 0.62 ? "attention" : (eventDetected ? "spatial-event" : "none"));
    const hudX = clamp01(0.5 + clampSigned(fusedDirection / 90) * 0.4);
    const hudY = clamp01(0.46 - confidence * 0.16);
    return createSpatialSnapshot({
      visualDirection,
      auditoryCorrection,
      fusedDirection,
      confidence,
      timestamp,
      eventDetected,
      eventType,
      hudX,
      hudY,
      gain: 35
    });
  }

  function createHealthSensorSnapshot(overrides = {}) {
    return requireSensoryCognition("createHealthSensorSnapshot")(overrides);
  }

  function buildCtgObservedScores(controller, action, sensor, frame, state) {
    const tensorEvidence = readSensorTensorEvidence(controller);
    const compass = controller.compassSensorSnapshot || createCompassSensorSnapshot();
    const directRouteEvidence = clamp01(Math.max(
      Number(controller.firstDoorVision9x9Score || 0),
      Number(controller.firstDoorCorridorSignature || 0),
      Number(controller.computerRoomScore || 0),
      Number(controller.computerPanelScore || 0),
      Number(controller.spawnCorridorGapScore || 0),
      Number(controller.spawnLandmarkRouteEvidence || 0),
      Number(controller.bridgeDoorScore || 0),
      Number(controller.bridgeBrownScore || 0)));
    const directCorridorConfidence = clamp01(Math.max(
      Number(controller.spawnCorridorGapScore || 0),
      Number(controller.spawnLandmarkRouteEvidence || 0),
      Number(controller.firstDoorCorridorLocated ? 0.82 : 0),
      compass.headingReliability === "corridor-ambiguous" ? 0.72 : 0));
    const projectileRaw = clamp01(Number(controller.projectileScore || controller.phantasiaSnapshot?.projectileScore || 0));
    const enemy = getTrustedEnemyThreat(controller);
    const dynamicObjectRaw = clamp01(Number(controller.phantasiaSnapshot?.dynamicObjectScore || controller.dynamicObjectScore || 0));
    const projectileContext = enemy > 0.34
      || Boolean(controller.phainomenon?.looming?.active)
      || Boolean(controller.phainomenon?.damageLocalization?.active);
    const projectile = projectileContext ? projectileRaw : projectileRaw * 0.22;
    const dynamicThreatContext = enemy > 0.35
      || Boolean(controller.phainomenon?.looming?.active)
      || Boolean(controller.phainomenon?.damageLocalization?.active);
    const terminalUseFocus = controller.exitSwitchPressed
      || controller.finalRoomEntered
      || Number(controller.exitSwitchUseFrames || 0) > 0
      || String(controller.safetyReason || "") === "exit-switch-use";
    const doorTransitionGraceActive = isDoorTransitionGraceActive(controller, state);
    const footBounceConfirmed = Number(controller.footObstacleBounceFrames || 0) >= 3
      && Number(controller.footObstacleFlickerScore || 0) >= 0.42;
    const stuckRaw = clamp01(Math.max(
      Number(controller.motionStallScore || 0),
      Number(controller.stuckFrames || 0) / 12,
      Number(controller.quantizedStallFrames || 0) / 10,
      footBounceConfirmed ? Number(controller.footObstacleFlickerScore || 0) : 0,
      sensor?.stuckTicks ? Number(sensor.stuckTicks || 0) / 4 : 0));
    const stuckConfirmed = Number(controller.stuckFrames || 0) >= 2
      || Number(controller.quantizedStallFrames || 0) >= 3
      || footBounceConfirmed
      || sensor?.stuckTicks >= 2
      || (controller.movementSensorSnapshot?.eventType === "movement-stall" && Number(controller.movementSensorSnapshot?.confidence || 0) >= 0.55);
    const firstRouteWarmup = Number(controller.predictions || 0) < 36
      && controller.doorOpenedCount <= 0
      && Number(controller.depthEstimate || 1) > 0.48
      && !controller.firstDoorUseAttempted;
    const movingEvidence = Math.max(
      Number(controller.motionForwardProgress || 0),
      Number(controller.motionTurnScore || 0),
      Number(controller.motionEntranceScore || 0));
    const preDoorDemoRouteGraceActive = isPreDoorDemoRouteGraceActive(controller, {
      depthEstimate: controller.depthEstimate,
      movementSpeed: Math.max(movingEvidence, Number(controller.movementSensorSnapshot?.confidence || 0))
    });
    const firstDoorUseSignatureThreshold = profileNumber(controller.profile, "firstDoorUseSignatureThreshold", FIRST_DOOR_USE_SIGNATURE_THRESHOLD);
    const firstDoorRetrySignatureTolerance = profileNumber(controller.profile, "firstDoorRetrySignatureTolerance", FIRST_DOOR_RETRY_SIGNATURE_TOLERANCE);
    const observedSignals = composeCtgObservedSignals({
      tensorEvidence,
      headingConfidence: compass.confidence,
      headingUnavailable: compass.headingUsable === false || compass.headingUncertain,
      headingAbsolute: compass.headingReliability === "absolute-landmark" || compass.headingReliability === "absolute-forced-landmark",
      directRouteEvidence,
      directCorridorConfidence,
      hasControlPipeline: Boolean(controller.controlPipeline),
      projectileRaw,
      enemy,
      dynamicObjectRaw,
      projectileContext,
      dynamicThreatContext,
      healthThreat: controller.healthLikelyDead || controller.healthSensorSnapshot?.retryRequested,
      terminalUseFocus,
      doorTransitionGraceActive,
      stuckRaw,
      stuckConfirmed,
      firstRouteWarmup,
      preDoorDemoRouteGraceActive,
      firstDoorClosed: controller.doorOpenedCount <= 0,
      firstDoorContext: controller.firstDoorCorridorLocated || controller.controlPipeline === "FirstDoor",
      firstDoorUseDepthLimit: profileNumber(controller.profile, "firstDoorUseDepth", FIRST_DOOR_USE_DEPTH) + 0.18,
      firstDoorUseEvidence: Number(controller.firstDoorUse3x3Score || 0) >= FIRST_DOOR_DARK_PANEL_USE_ALIGNMENT_SCORE - 0.08
        || Number(controller.firstDoorCorridorSignature || 0) >= firstDoorUseSignatureThreshold - firstDoorRetrySignatureTolerance,
      firstDoorUseBlockedByThreat: Boolean(controller.phainomenon?.looming?.active)
        || Boolean(controller.phainomenon?.damageLocalization?.active),
      firstDoorUseAttempted: Boolean(controller.firstDoorUseAttempted),
      depthEstimate: controller.depthEstimate,
      movingEvidence,
      doorOpened: controller.doorOpenedCount > 0,
      computerRoomEntered: Boolean(controller.computerRoomEntered),
      finalRoomEntered: Boolean(controller.finalRoomEntered),
      phainesisStuckActive: Boolean(controller.phainomenon?.stuck?.active),
      nousStuckActive: Boolean(controller.nousDetectorResult?.stuck?.active),
      darkZoneEntered: Boolean(controller.darkZoneEntered),
      controlPipeline: controller.controlPipeline,
      computerRoomAdvanceActive: Number(controller.computerRoomAdvanceFrames || 0) > 0
    });
    const kairos = resolveKairosMonitoringCarrier(controller, observedSignals.danger, observedSignals.stuck);
    const pathosBase = clamp01(Math.max(observedSignals.danger, observedSignals.stuck));
    const nonlinearPathos = kairos.active
      ? clamp01(Math.pow(Math.max(pathosBase, 0.32), 2) * 3.4 + kairos.boost * 0.42)
      : clamp01(Math.pow(pathosBase, 2) * 1.12);
    const pathos = clamp01(Math.max(pathosBase, nonlinearPathos));
    const ethos = observedSignals.terminalUseFocus
      ? Math.max(resolveToposEthosScore(controller), 0.92)
      : resolveToposEthosScore(controller);
    return createCtgObservedScores({
      logos: observedSignals.logos,
      pathos,
      ethos,
      headingRel: observedSignals.headingRel,
      routeEvidence: observedSignals.routeEvidence,
      corridorConfidence: observedSignals.corridorConfidence,
      corridorPenalty: observedSignals.corridorPenalty,
      danger: observedSignals.danger,
      dangerKind: observedSignals.dangerKind,
      stuck: observedSignals.stuck,
      kairosBoost: kairos.boost,
      kairosState: kairos.state,
      kairosTrigger: kairos.trigger,
      objective: inferObjective(controller),
      phase: inferControlPipeline(controller),
      timestamp: state?.timestamp || state?.frame || DEFAULT_SNAPSHOT_TIMESTAMP
    });
  }

  function buildToposDecisionCarrier(controller, action, observedScores, sensor, frame, state) {
    return requireToposCognition("composeDecisionCarrier")({
      logosVector: getToposLogosVector(controller, action, sensor, frame, state),
      pathosVector: getToposPathosVector(controller, action, sensor, frame, state),
      ethosVector: getToposEthosVector(controller, action, sensor, frame, state),
      observed: observedScores,
      stableFrames: controller.toposEthosFrames
    });
  }

  function getToposLogosVector(controller, action, sensor, frame, state) {
    const patch = controller.firstDoorVision9x9Box || null;
    return requireToposCognition("resolveLogosVector")({
      firstDoorUseTurn: controller.firstDoorUse3x3Turn,
      patchVisible: Boolean(patch),
      patchColumn: patch?.column,
      patchColumns: patch?.columns,
      patchScore: patch?.score || controller.firstDoorVision9x9Score,
      gridColumns: VISION_GRID_COLUMNS,
      doorOpened: controller.doorOpenedCount > 0,
      computerRoomEntered: Boolean(controller.computerRoomEntered),
      bridgeLaneTurn: controller.bridgeLaneTurn,
      actionTurn: action.turn,
      bridgeBrownScore: controller.bridgeBrownScore,
      spawnCorridorGapTurn: controller.spawnCorridorGapTurn,
      spawnLandmarkRouteTurn: controller.spawnLandmarkRouteTurn,
      spawnLandmarkRouteEvidence: controller.spawnLandmarkRouteEvidence,
      spawnLandmarkRouteKind: controller.spawnLandmarkRouteKind,
      depthEstimate: controller.depthEstimate
    });
  }

  function getToposPathosVector(controller, action, sensor, frame, state) {
    const enemy = getTrustedEnemyThreat(controller);
    const preDoorDemoRouteGraceActive = isPreDoorDemoRouteGraceActive(controller, {
      depthEstimate: controller.depthEstimate,
      movementSpeed: Math.max(
        Number(controller.motionForwardProgress || 0),
        Number(controller.motionTurnScore || 0),
        Number(controller.motionEntranceScore || 0),
        Number(controller.movementSensorSnapshot?.confidence || 0))
    });
    return requireToposCognition("resolvePathosVector")({
      motionStallScore: controller.motionStallScore,
      stuckFrames: controller.stuckFrames,
      quantizedStallFrames: controller.quantizedStallFrames,
      footObstacleBounceFrames: controller.footObstacleBounceFrames,
      footObstacleFlickerScore: controller.footObstacleFlickerScore,
      projectileRaw: controller.projectileScore || controller.phantasiaSnapshot?.projectileScore,
      enemy,
      dynamicRaw: controller.phantasiaSnapshot?.dynamicObjectScore,
      dynamicThreatContext: enemy > 0.35
        || Boolean(controller.phainomenon?.looming?.active)
        || Boolean(controller.phainomenon?.damageLocalization?.active),
      healthThreat: controller.healthLikelyDead || controller.healthSensorSnapshot?.retryRequested,
      enemyLateralBias: controller.enemyLateralBias,
      depthEstimate: controller.depthEstimate,
      preDoorDemoRouteGraceActive,
      actionTurn: action.turn,
      wallHugSide: controller.wallHugSide
    });
  }

  function getToposEthosVector(controller, action, sensor, frame, state) {
    const objective = inferObjective(controller);
    const preDoorDemoRouteGraceActive = isPreDoorDemoRouteGraceActive(controller, {
      depthEstimate: controller.depthEstimate,
      movementSpeed: Math.max(
        Number(controller.motionForwardProgress || 0),
        Number(controller.motionTurnScore || 0),
        Number(controller.motionEntranceScore || 0),
        Number(controller.movementSensorSnapshot?.confidence || 0))
    });
    return requireToposCognition("resolveEthosVector")({
      objective,
      spawnCorridorGapTurn: controller.spawnCorridorGapTurn,
      spawnLandmarkRouteTurn: controller.spawnLandmarkRouteTurn,
      spawnLandmarkRouteEvidence: controller.spawnLandmarkRouteEvidence,
      spawnLandmarkRouteKind: controller.spawnLandmarkRouteKind,
      firstDoorCorridorSearchTurn: controller.firstDoorCorridorSearchTurn,
      firstDoorUseTurn: controller.firstDoorUse3x3Turn,
      bridgeLaneTurn: controller.bridgeLaneTurn,
      wallHugSide: controller.wallHugSide,
      preDoorDemoRouteGraceActive,
      stableFrames: controller.toposEthosFrames
    });
  }

  function mapToposDecisionToKinesis(controller, action, carrier, observedScores, sensor, frame, state) {
    const safe = normalizeAction(action);
    const vector = carrier.decisionVector || normalizeToposVector();
    const firstDoorKairosContext = composeKairosFirstDoorContext({
      firstDoorContext: controller.doorOpenedCount <= 0 && (controller.firstDoorCorridorLocated || controller.controlPipeline === "FirstDoor"),
      firstDoorUseDepth: profileNumber(controller.profile, "firstDoorUseDepth", FIRST_DOOR_USE_DEPTH),
      firstDoorUseSignatureThreshold: profileNumber(controller.profile, "firstDoorUseSignatureThreshold", FIRST_DOOR_USE_SIGNATURE_THRESHOLD),
      firstDoorRetrySignatureTolerance: profileNumber(controller.profile, "firstDoorRetrySignatureTolerance", FIRST_DOOR_RETRY_SIGNATURE_TOLERANCE),
      firstDoorAlignmentScore: FIRST_DOOR_DARK_PANEL_USE_ALIGNMENT_SCORE,
      firstDoorUse3x3Score: controller.firstDoorUse3x3Score,
      firstDoorCorridorSignature: controller.firstDoorCorridorSignature,
      firstDoorVision9x9Score: controller.firstDoorVision9x9Score,
      spawnCorridorGapScore: controller.spawnCorridorGapScore,
      routeEvidence: observedScores.routeEvidence,
      danger: observedScores.danger,
      pathos: observedScores.pathos,
      depthEstimate: controller.depthEstimate,
      wallHugSide: controller.wallHugSide,
      useCooldown: controller.useCooldown,
      firstDoorUseAttempted: controller.firstDoorUseAttempted
    });
    const kairos = resolveKairosPriorityAxes({
      carrier,
      observed: observedScores,
      firstDoor: firstDoorKairosContext
    });
    const feedback = mapKinesisToposDecision({
      action: safe,
      enabled: controller.enabled,
      vector,
      kairos,
      safetyReason: controller.safetyReason
    });
    const audited = auditZoeAction(feedback.action, {
      likelyDead: Boolean(controller.healthLikelyDead),
      retryRequested: Boolean(controller.healthSensorSnapshot?.retryRequested),
      zeroScore: Number(controller.healthZeroScore || controller.healthSensorSnapshot?.zeroScore || 0),
      activeCells: Number(controller.healthActiveCells || controller.healthSensorSnapshot?.activeCells || 0),
      retryReason: controller.healthSensorSnapshot?.retryReason || "none"
    });
    const safeFeedback = audited.vetoed
      ? Object.assign({}, feedback, {
        action: audited.action,
        applied: false,
        vetoed: true,
        reason: `zoe-${audited.reason}`
      })
      : Object.assign({}, feedback, {
        action: audited.action,
        vetoed: false
      });

    if (safeFeedback.applied && controller.safetyReason !== "dead-restart" && controller.safetyReason !== "door-opened") {
      controller.safetyReason = `ctg-topos-${safeFeedback.reason}`;
      controller.mobilityMode = `ctg-topos-${carrier.dominantAxis.toLowerCase()}`;
    }

    return safeFeedback;
  }

  function createCtgObservedScores(overrides = {}) {
    return requireCtgCognition("createObservedScores")(overrides);
  }

  function composeCtgObservedSignals(input = {}) {
    return requireCtgCognition("composeObservedSignals")(input);
  }

  function createToposDecisionCarrier(overrides = {}) {
    return requireToposCognition("createDecisionCarrier")(overrides);
  }

  function createCtgCarrier(overrides = {}) {
    return requireCtgCognition("createCarrier")(overrides);
  }

  function mapKinesisToposDecision(input = {}) {
    return requireKinesisCognition("mapToposDecision")(input);
  }

  function auditZoeAction(action, health) {
    return requireZoeCognition("auditAction")({ action, health });
  }

  function resolveKairosPriorityAxes(input = {}) {
    return requireKairosCognition("resolvePriorityAxes")(input);
  }

  function composeKairosFirstDoorContext(input = {}) {
    return requireKairosCognition("composeFirstDoorPriorityContext")(input);
  }

  function resolveKairosMonitoringCarrier(controller, danger, stuck) {
    const reason = String(controller?.safetyReason || "none");
    const doorTransitionGraceActive = isDoorTransitionGraceActive(controller);
    return requireKairosCognition("resolveMonitoringState")({
      reason,
      doorTransitionGraceActive,
      contextResetActive: Number(controller?.contextResetFrames || 0) > 0,
      contextResetReason: controller?.contextResetReason,
      recoveryActive: Number(controller?.recoveryFrames || 0) > 0 || Number(controller?.loopEscapeFrames || 0) > 0,
      useProbeActive: Number(controller?.pendingUseResponseFrames || 0) > 0 || Number(controller?.wallUseProbeFrames || 0) > 0,
      trustedEnemyThreat: getTrustedEnemyThreat(controller),
      projectileScore: controller?.projectileScore || controller?.phantasiaSnapshot?.projectileScore || 0,
      loomingActive: Boolean(controller?.phainomenon?.looming?.active),
      damageLocalizationActive: Boolean(controller?.phainomenon?.damageLocalization?.active),
      combatEvidence: hasTrustedCombatEvidence(controller),
      combatContextActive: Boolean(controller?.combatContextActive),
      enemyAlertActive: Number(controller?.enemyAlertFrames || 0) > 0,
      danger,
      stuck
    });
  }

  function resolveToposEthosScore(controller) {
    const objective = inferObjective(controller);
    const memory = controller?.semanticMemory || {};
    return requireToposCognition("resolveEthosScore")({
      objective,
      stableFrames: controller?.toposEthosFrames,
      preDoorDemoRouteGraceActive: isPreDoorDemoRouteGraceActive(controller, {
        depthEstimate: controller?.depthEstimate,
        movementSpeed: Math.max(
          Number(controller?.motionForwardProgress || 0),
          Number(controller?.motionTurnScore || 0),
          Number(controller?.motionEntranceScore || 0),
          Number(controller?.movementSensorSnapshot?.confidence || 0))
      }),
      firstDoorDoorConfidence: memory.firstDoor?.doorConfidence,
      firstDoorCorridorConfidence: memory.firstDoor?.corridorConfidence,
      computerRoomConfidence: memory.computerRoom?.confidence,
      bridgeConfidence: memory.bridge?.confidence,
      finalRoomConfidence: memory.finalRoom?.confidence,
      hasControlPipeline: Boolean(controller?.controlPipeline),
      milestoneReached: controller?.doorOpenedCount > 0 || controller?.computerRoomEntered
    });
  }

  function normalizeToposVector(vector = {}) {
    return requireToposCognition("normalizeVector")(vector);
  }

  function requireToposCognition(name) {
    const fn = self.AIKernelDoomTopos?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom Topos cognition module is missing: ${name}`);
    }

    return fn;
  }

  function requireCtgCognition(name) {
    const fn = self.AIKernelDoomCtg?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom CTG cognition module is missing: ${name}`);
    }

    return fn;
  }

  function requireKinesisCognition(name) {
    const fn = self.AIKernelDoomKinesis?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom Kinesis cognition module is missing: ${name}`);
    }

    return fn;
  }

  function requireKairosCognition(name) {
    const fn = self.AIKernelDoomKairos?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom Kairos cognition module is missing: ${name}`);
    }

    return fn;
  }

  function requireZoeCognition(name) {
    const fn = self.AIKernelDoomZoe?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom Zoe cognition module is missing: ${name}`);
    }

    return fn;
  }

  function requirePipelineTraceCognition(name) {
    const fn = self.AIKernelDoomPipelineTrace?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom pipeline trace module is missing: ${name}`);
    }

    return fn;
  }

  function requireCombatRouteCognition(name) {
    const fn = self.AIKernelDoomCombatRoute?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom combat route module is missing: ${name}`);
    }

    return fn;
  }

  function requirePhainesisCognition(name) {
    const fn = self.AIKernelDoomPhainesis?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom Phainesis cognition module is missing: ${name}`);
    }

    return fn;
  }

  function requireNousCognition(name) {
    const fn = self.AIKernelDoomNous?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom Nous cognition module is missing: ${name}`);
    }

    return fn;
  }

  function requirePhantasiaCognition(name) {
    const fn = self.AIKernelDoomPhantasia?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom Phantasia cognition module is missing: ${name}`);
    }

    return fn;
  }

  function actionTurnToX(turn) {
    return requireKinesisCognition("actionTurnToX")(turn);
  }

  function describeActionVector(action) {
    return requireKinesisCognition("describeActionVector")(action);
  }

  function clampSigned(value) {
    return Math.max(-1, Math.min(1, Number(value) || 0));
  }

  function ternarySigned(value, threshold = 0.22) {
    return requireKinesisCognition("ternarySigned")(value, threshold);
  }

  function ternaryScore(value, low = 0.25, high = 0.62) {
    return requireKinesisCognition("ternaryScore")(value, low, high);
  }

  function normalizeVision9x9(values) {
    return requireSensoryCognition("normalizeVision9x9")(values);
  }

  function normalizeAuditoryEventType(value) {
    return requireSensoryCognition("normalizeAuditoryEventType")(value);
  }

  function requireSensoryCognition(name) {
    const fn = self.AIKernelDoomSensory?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom sensory cognition module is missing: ${name}`);
    }

    return fn;
  }

  function requireVisionPalette(name) {
    const fn = self.AIKernelDoomVisionPalette?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom vision palette module is missing: ${name}`);
    }

    return fn;
  }

  function breadcrumbPoint(state, frame) {
    const position = state?.player?.position || state?.position;
    const x = Number(position?.x ?? position?.[0]);
    const y = Number(position?.y ?? position?.[1]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x, y };
    }

    return {
      x: (frame.left || 0) - (frame.right || 0),
      y: ((frame.center || 0) * 0.5) + ((frame.lowerCenter || 0) * 0.35) + ((frame.topCenter || 0) * 0.15)
    };
  }

  function distance(a, b) {
    const dx = (a?.x || 0) - (b?.x || 0);
    const dy = (a?.y || 0) - (b?.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function actionSignature(action) {
    return requireKinesisCognition("actionSignature")(action);
  }

  function updateKinesisActionLoop(controller, action) {
    if (!controller) {
      return 0;
    }

    const safe = normalizeAction(action);
    const trackable = !safe.fire
      && !safe.use
      && (safe.move !== "none" || safe.turn !== "none" || safe.strafe || safe.run);
    if (!trackable) {
      controller.kinesisActionSignature = "";
      controller.kinesisActionRepeatFrames = 0;
      return 0;
    }

    const signature = actionSignature(safe);
    if (signature === controller.kinesisActionSignature) {
      controller.kinesisActionRepeatFrames = Math.min(
        MAX_STUCK_COUNTER,
        Number(controller.kinesisActionRepeatFrames || 0) + 1);
    } else {
      controller.kinesisActionSignature = signature;
      controller.kinesisActionRepeatFrames = 1;
    }

    return controller.kinesisActionRepeatFrames;
  }

  function oppositeTurn(turn) {
    if (turn === "left") {
      return "right";
    }

    if (turn === "right") {
      return "left";
    }

    return "right";
  }

  function estimateTargetConfidence(frame) {
    const center = frame.center || 0;
    const left = frame.left || 0;
    const right = frame.right || 0;
    const contrast = frame.contrast || 0;
    const isolation = Math.abs(center - Math.round((left + right) / 2));
    const notWall = looksLikeWall(frame) ? 0.35 : 1;
    const confidence = ((isolation / 80) * 0.55 + (contrast / 96) * 0.45) * notWall;
    return Math.max(0, Math.min(1, confidence));
  }

  function buildSensorFusionPacket(context) {
    const frame = context.frame || {};
    const regions = frame.regionSample || [];
    const region9 = frame.region9Sample || [];
    const depthSig = clamp01(context.depthEstimate ?? frame.depthEstimate ?? estimateDepthDistance(frame.depthSample));
    const wallVector = estimateWallDirectionVector(frame);
    const stuckTicks = Math.max(
      Number(context.stuckFrames || 0),
      Number(context.quantizedStallFrames || 0)
    );
    const contextDict = resolveContextDict(context, depthSig);

    return {
      screen6Regions: normalizeScreenRegions(regions),
      screen9Regions: normalizeRegion9(region9),
      depthSig,
      health: null,
      faceSig: decodeFaceDirection(frame.faceSample, context.faceQuantizedFrameChange),
      contextDict,
      soundEvent: Boolean(context.soundCue),
      stuckTicks,
      qDelta: Math.round(Math.min(
        Number(context.quantizedFrameChange ?? 255),
        Number(context.regionQuantizedFrameChange ?? 255)
      ) * 100) / 100,
      wallVector,
      motion9Signature: context.motion?.signature || "000000000",
      forwardProgress: Number(context.motion?.forwardProgress || 0),
      turningMotion: Number(context.motion?.turnScore || 0),
      obstacleMotion: Number(context.motion?.obstacleScore || 0),
      entranceMotion: Number(context.motion?.entranceScore || 0),
      motionIntent: context.motion?.intent || "idle"
    };
  }

  function normalizeAutoplayProfile(profile) {
    return AUTOPLAY_PROFILE.normalize(profile, DEFAULT_AUTOPLAY_PROFILE);
  }

  function profileNumber(profile, key, fallback) {
    return AUTOPLAY_PROFILE.number(profile, key, fallback);
  }

  function resolveContextDict(context, depthSig) {
    if (context.openView || context.navigableView) {
      return "open-space";
    }

    if (context.knownCorner || context.cornered || context.cornerTrap) {
      return "corner";
    }

    if (context.knownWall || context.wallLike) {
      return depthSig > OPEN_VIEW_DEPTH_THRESHOLD ? "corridor" : "wall";
    }

    return depthSig > OPEN_VIEW_DEPTH_THRESHOLD ? "open-space" : "corridor";
  }

  function normalizeScreenRegions(regions) {
    return requireSensorTensor("normalizeScreenRegions")(regions, REGION_COLUMNS, REGION_ROWS);
  }

  function normalizeRegion9(regions) {
    return requireSensorTensor("normalizeRegion9")(regions, REGION9_COLUMNS, REGION9_ROWS);
  }

  function decodeFaceDirection(faceSample, faceDelta) {
    if (!faceSample?.length || Number(faceDelta || 0) < COMBAT_FACE_DANGER_DELTA) {
      return 0;
    }

    const half = Math.floor(faceSample.length / 2);
    let left = 0;
    let right = 0;
    for (let index = 0; index < faceSample.length; index += 1) {
      if ((index % FACE_SAMPLE_COLUMNS) < FACE_SAMPLE_COLUMNS / 2) {
        left += faceSample[index] || 0;
      } else {
        right += faceSample[index] || 0;
      }
    }

    const delta = right - left;
    if (Math.abs(delta) < half * 8) {
      return 0;
    }

    return delta > 0 ? 1 : -1;
  }

  function commandPriority(reason) {
    return requireKinesisCognition("commandPriority")(reason);
  }

  function relativeCorridorAlignment(controller, turn) {
    if (!controller || (turn !== "left" && turn !== "right")) {
      return { aligned: false, conflict: false, confidence: 0 };
    }

    const targetSign = turn === "right" ? 1 : -1;
    const compass = controller.compassSensorSnapshot || {};
    const components = [
      Number(compass.motorDelta || 0),
      Number(compass.rotationInstructionDelta || 0),
      Number(compass.visualFlowDelta || 0),
      Number(compass.frameBufferVectorDelta || 0),
      Number(compass.movementDelta || 0)
    ];
    let aligned = 0;
    let conflict = 0;
    let total = 0;
    for (let index = 0; index < components.length; index += 1) {
      const value = components[index];
      if (Math.abs(value) < 0.8) {
        continue;
      }

      total += 1;
      if (Math.sign(value) === targetSign) {
        aligned += 1;
      } else {
        conflict += 1;
      }
    }

    const vectorX = Number(compass.vectorX || 0);
    if (Math.abs(vectorX) >= 0.12) {
      total += 1;
      if (Math.sign(vectorX) === targetSign) {
        aligned += 1;
      } else {
        conflict += 1;
      }
    }

    const confidence = total > 0 ? aligned / total : 0;
    return {
      aligned: aligned > 0 && aligned >= conflict,
      conflict: conflict > aligned && conflict >= 2,
      confidence
    };
  }

  function firstDoorDemoObjectiveRank(objective) {
    return requireRoutingCognition("rankFirstDoorObjective")(objective);
  }

  function stabilizeFirstDoorDemoObjective(controller, candidate) {
    return requireRoutingCognition("stabilizeFirstDoorObjective")({
      candidate,
      previousObjective: controller?.objective,
      healthLikelyDead: Boolean(controller?.healthLikelyDead),
      healthRetryRequested: Boolean(controller?.healthSensorSnapshot?.retryRequested),
      doorOpenedCount: controller?.doorOpenedCount,
      firstDoorCorridorLocated: Boolean(controller?.firstDoorCorridorLocated),
      firstDoorUseAttempted: Boolean(controller?.firstDoorUseAttempted),
      firstDoorUseLatchFrames: controller?.firstDoorUseLatchFrames,
      wallUseProbeFrames: controller?.wallUseProbeFrames
    });
  }

  function inferFirstDoorDemoObjective(controller) {
    if (!controller) {
      return requireRoutingCognition("inferFirstDoorObjective")({ hasController: false });
    }

    const firstDoorUseThreshold = profileNumber(controller.profile, "firstDoorUseSignatureThreshold", FIRST_DOOR_USE_SIGNATURE_THRESHOLD);
    const firstDoorRetryTolerance = profileNumber(controller.profile, "firstDoorRetrySignatureTolerance", FIRST_DOOR_RETRY_SIGNATURE_TOLERANCE);
    const firstDoorUseDepth = profileNumber(controller.profile, "firstDoorUseDepth", FIRST_DOOR_USE_DEPTH);
    const spawnCorridorGapThreshold = profileNumber(controller.profile, "spawnCorridorGapThreshold", SPAWN_CORRIDOR_GAP_THRESHOLD);
    const gapTurn = controller.spawnCorridorGapTurn === "left" || controller.spawnCorridorGapTurn === "right"
      ? controller.spawnCorridorGapTurn
      : "none";
    return requireRoutingCognition("inferFirstDoorObjective")({
      previousObjective: controller.objective,
      healthLikelyDead: Boolean(controller.healthLikelyDead),
      healthRetryRequested: Boolean(controller.healthSensorSnapshot?.retryRequested),
      doorOpenedCount: controller.doorOpenedCount,
      computerRoomEntered: Boolean(controller.computerRoomEntered),
      firstDoorUseThreshold,
      firstDoorRetryTolerance,
      firstDoorUseDepth,
      firstDoorDarkPanelUseAlignmentScore: FIRST_DOOR_DARK_PANEL_USE_ALIGNMENT_SCORE,
      firstDoorAlignmentScore: FIRST_DOOR_USE_ALIGNMENT_SCORE,
      depthEstimate: Number(controller.depthEstimate || 1),
      firstDoorCorridorLocated: Boolean(controller.firstDoorCorridorLocated),
      firstDoorCorridorFrames: controller.firstDoorCorridorFrames,
      courtyardRescueFrames: controller.courtyardRescueFrames,
      courtyardRescueMode: controller.courtyardRescueMode,
      firstDoorUseAttempted: Boolean(controller.firstDoorUseAttempted),
      firstDoorUseLatchFrames: controller.firstDoorUseLatchFrames,
      wallUseProbeFrames: controller.wallUseProbeFrames,
      firstDoorUse3x3Score: controller.firstDoorUse3x3Score,
      firstDoorUseSignature: controller.firstDoorUseSignature,
      firstDoorVision9x9Score: controller.firstDoorVision9x9Score,
      firstDoorUse3x3Turn: controller.firstDoorUse3x3Turn,
      spawnCorridorGapThreshold,
      spawnCorridorGapTurn: gapTurn,
      spawnCorridorGapScore: controller.spawnCorridorGapScore,
      spawnCorridorGapFrames: controller.spawnCorridorGapFrames,
      spawnLandmarkRouteEvidence: controller.spawnLandmarkRouteEvidence,
      spawnLandmarkRouteFrames: controller.spawnLandmarkRouteFrames,
      spawnLandmarkRouteTurn: controller.spawnLandmarkRouteTurn,
      spawnLandmarkRouteKind: controller.spawnLandmarkRouteKind,
      motionEntranceScore: controller.motionEntranceScore,
      motionEntranceThreshold: profileNumber(controller.profile, "motionEntranceThreshold", 0.22),
      relativeAlignment: relativeCorridorAlignment(controller, gapTurn),
      predictions: controller.predictions,
      firstDoorSpawnScanFrames: profileNumber(controller.profile, "firstDoorSpawnScanFrames", FIRST_DOOR_SPAWN_SCAN_FRAMES),
      controlPipeline: controller.controlPipeline,
      mobilityMode: controller.mobilityMode
    });
  }

  function buildAutoplayPipelineTrace(controller) {
    if (!controller) {
      return requirePipelineTraceCognition("buildTrace")({ enabled: false });
    }

    const detections = activeDetectionsForPipeline(controller);
    return requirePipelineTraceCognition("buildTrace")({
      enabled: Boolean(controller.enabled),
      phase: controller.controlPipeline || "Idle",
      objective: inferObjective(controller),
      priority: Number(controller.strategyPriority || 0),
      activeDetections: detections,
      action: controller.lastAction,
      observed: controller.ctgObservedScores,
      carrier: controller.toposDecisionCarrier,
      healthRetryRequested: Boolean(controller.healthSensorSnapshot?.retryRequested),
      healthLikelyDead: Boolean(controller.healthLikelyDead),
      safetyReason: controller.safetyReason,
      hasNousCarrier: Boolean(controller.nousCarrier),
      hasPhainomenon: Boolean(controller.phainomenon),
      ternaryVectorCount: Object.keys(controller.nousCarrier?.bonsaiTernary || {}).length,
      motionForwardProgress: controller.motionForwardProgress,
      motionStallScore: controller.motionStallScore,
      spawnLandmarkRouteEvidence: controller.spawnLandmarkRouteEvidence,
      spawnLandmarkRouteKind: controller.spawnLandmarkRouteKind,
      spawnCorridorGapScore: controller.spawnCorridorGapScore,
      firstDoorCorridorSignature: controller.firstDoorCorridorSignature,
      firstDoorVision9x9Score: controller.firstDoorVision9x9Score,
      firstDoorCorridorLocated: Boolean(controller.firstDoorCorridorLocated),
      doorOpenedCount: controller.doorOpenedCount,
    computerRoomEntered: Boolean(controller.computerRoomEntered),
    computerRoomScore: controller.computerRoomScore,
    computerPanelScore: controller.computerPanelScore,
    computerDarkPanelScore: controller.computerDarkPanelScore,
    centralHallEntered: Boolean(controller.centralHallEntered),
    centralHallFrames: controller.centralHallFrames,
    centralHallEnemySweepFrames: controller.centralHallEnemySweepFrames,
    centralHallEnemySweepTurn: controller.centralHallEnemySweepTurn,
    bridgeBrownScore: controller.bridgeBrownScore,
    bridgeDoorScore: controller.bridgeDoorScore,
    bridgeLaneVisible: Boolean(controller.bridgeLaneVisible),
    finalRoomCandidateFrames: controller.finalRoomCandidateFrames,
    finalRoomEntered: Boolean(controller.finalRoomEntered),
    exitSwitchUseFrames: controller.exitSwitchUseFrames,
    exitSwitchPressed: Boolean(controller.exitSwitchPressed),
    enemyConfidence: controller.enemyConfidence,
    targetConfidence: controller.targetConfidence,
    enemyConfidencePeak: controller.enemyConfidencePeak,
      enemyDefeatedCount: controller.enemyDefeatedCount
    });
  }

  function controllerBridgeLaneVisible(controller) {
    return isBridgeLaneVisible(
      controller.bridgeBrownScore,
      controller.bridgeGreenLeft,
      controller.bridgeGreenCenter,
      controller.bridgeGreenRight,
      profileNumber(controller.profile, "bridgeBrownThreshold", BRIDGE_BROWN_THRESHOLD),
      profileNumber(controller.profile, "bridgeGreenHazardThreshold", BRIDGE_GREEN_HAZARD_THRESHOLD));
  }

  function inferControlPipeline(controller) {
    if (!controller) {
      return requireRoutingCognition("inferControlPipeline")({ enabled: false });
    }

    const bridgeLaneVisible = controllerBridgeLaneVisible(controller);
    return requireRoutingCognition("inferControlPipeline")({
      enabled: Boolean(controller.enabled),
      healthRetryRequested: Boolean(controller.healthSensorSnapshot?.retryRequested),
      healthLikelyDead: Boolean(controller.healthLikelyDead),
      doorTransitionGraceActive: isDoorTransitionGraceActive(controller),
      computerRoomEntered: Boolean(controller.computerRoomEntered),
      centralHallEntered: Boolean(controller.centralHallEntered),
      doorOpenedCount: controller.doorOpenedCount,
      firstDoorObjective: inferFirstDoorDemoObjective(controller),
      enemyDefeatedCount: controller.enemyDefeatedCount,
      ammoLikelyEmpty: Boolean(controller.ammoLikelyEmpty),
      finalRoomEntered: Boolean(controller.finalRoomEntered),
      movementStallActive: controller.movementSensorSnapshot?.eventType === "movement-stall"
        && Number(controller.movementSensorSnapshot?.confidence || 0) >= 0.55
        && Number(controller.stuckFrames || 0) >= 2,
      computerPanelVisible: isComputerPanelStillVisible(controller),
      bridgeLaneVisible,
      firstDoorCorridorLocated: Boolean(controller.firstDoorCorridorLocated)
    });
  }

  function inferObjective(controller) {
    if (!controller) {
      return requireRoutingCognition("inferObjective")({ enabled: false });
    }

    return requireRoutingCognition("inferObjective")({
      enabled: Boolean(controller.enabled),
      healthRetryRequested: Boolean(controller.healthSensorSnapshot?.retryRequested),
      healthLikelyDead: Boolean(controller.healthLikelyDead),
      exitSwitchPressed: Boolean(controller.exitSwitchPressed),
      centralHallEntered: Boolean(controller.centralHallEntered),
      enemyDefeatedCount: controller.enemyDefeatedCount,
      finalRoomEntered: Boolean(controller.finalRoomEntered),
      stairsEntered: Boolean(controller.stairsEntered),
      doorOpenedCount: controller.doorOpenedCount,
      computerRoomEntered: Boolean(controller.computerRoomEntered),
      doorTransitionGraceActive: isDoorTransitionGraceActive(controller),
      firstDoorObjective: inferFirstDoorDemoObjective(controller),
      bridgeLaneVisible: controllerBridgeLaneVisible(controller),
      controlPipeline: controller.controlPipeline
    });
  }

  function activeDetectionsForPipeline(controller) {
    if (!controller) {
      return requireRoutingCognition("activeDetectionsForPipeline")({ enabled: false });
    }

    return requireRoutingCognition("activeDetectionsForPipeline")({
      enabled: Boolean(controller.enabled),
      phase: inferControlPipeline(controller),
      healthRetryRequested: Boolean(controller.healthSensorSnapshot?.retryRequested),
      healthLikelyDead: Boolean(controller.healthLikelyDead),
      auditoryEventDetected: Boolean(controller.auditorySnapshot?.eventDetected),
      spatialEventDetected: Boolean(controller.spatialSnapshot?.eventDetected),
      sensorDetections: Array.isArray(controller.sensorDetections) ? controller.sensorDetections : [],
      semanticContextResetFrames: controller.semanticContextResetFrames,
      topologicalTransitionBlocked: Boolean(controller.topologicalTransitionBlocked),
      wallFollowFrames: controller.wallFollowFrames,
      combatContextActive: Boolean(controller.combatContextActive),
      trustedCombatEvidence: hasTrustedCombatEvidence(controller),
      combatSurveyFrames: controller.combatSurveyFrames
    });
  }

  function createE1M1SemanticMemory() {
    return requireSemanticCognition("createE1M1SemanticMemory")();
  }

  function updateE1M1SemanticMemory(memory, observation) {
    return requireSemanticCognition("updateE1M1SemanticMemory")(memory, observation);
  }

  function normalizeAction(action, fallback) {
    return requireKinesisCognition("normalizeAction")(action, fallback);
  }

  function neutralAction() {
    return requireKinesisCognition("neutralAction")();
  }

  function requireSemanticCognition(name) {
    const fn = self.AIKernelDoomSemantics?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom semantic cognition module is missing: ${name}`);
    }

    return fn;
  }

  function requireRoutingCognition(name) {
    const fn = self.AIKernelDoomRouting?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernel.Doom routing cognition module is missing: ${name}`);
    }

    return fn;
  }

  function delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  function now() {
    return self.performance?.now?.() || Date.now();
  }

  self.AIKernelBonsaiSupervisor = AIKernelBonsaiSupervisor;
  self.AIKernelBonsai = {
    resolveGpuVisionSource,
    summarizeFramebuffer,
    normalizeAction,
    neutralAction
  };
})();
