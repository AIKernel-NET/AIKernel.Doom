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
  const SPAWN_CORRIDOR_GAP_THRESHOLD = 0.42;
  const SPAWN_CORRIDOR_GAP_FRAMES = 74;
  const SPAWN_CORRIDOR_GAP_ALIGN_FRAMES = 10;
  const BRIDGE_BROWN_THRESHOLD = 0.24;
  const BRIDGE_GREEN_HAZARD_THRESHOLD = 0.18;
  const BRIDGE_DOOR_PANEL_THRESHOLD = 0.32;
  const STRATEGY_NAME = "SeparatedDoorProbeStrafeRunnerV4";
  const DEFAULT_AUTOPLAY_PROFILE = {
    version: "0.1.1-dev1",
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
    lowHealthThreshold: 18,
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
  const ENEMY_COLOR_CLUSTERS = [
    { name: "red", r: 176, g: 38, b: 32 },
    { name: "brown", r: 135, g: 82, b: 48 },
    { name: "gray", r: 142, g: 142, b: 132 },
    { name: "pink", r: 184, g: 92, b: 92 }
  ];

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
      this.repeatActionSignature = "";
      this.repeatActionFrames = 0;
      this.repeatTurnFrames = 0;
      this.repeatTurnDirection = "right";
      this.quantizedStallFrames = 0;
      this.quantizedFrameChange = 255;
      this.regionQuantizedFrameChange = 255;
      this.statusBarQuantizedFrameChange = 255;
      this.regionSignature = "000000";
      this.region9Signature = "000000000";
      this.motion9Signature = "000000000";
      this.motion9Delta = 255;
      this.motionForwardProgress = 0;
      this.motionObstacleScore = 0;
      this.motionTurnScore = 0;
      this.motionEntranceScore = 0;
      this.motionStallScore = 0;
      this.priorFootObstacleScore = 0;
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
      this.firstDoorUseFrame = 0;
      this.firstDoorTransitionFrames = 0;
      this.firstDoorUseLatchFrames = 0;
      this.firstDoorUsePulsed = false;
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
        this.repeatActionSignature = "";
        this.repeatActionFrames = 0;
        this.repeatTurnFrames = 0;
        this.repeatTurnDirection = "right";
        this.quantizedStallFrames = 0;
        this.quantizedFrameChange = 255;
        this.regionQuantizedFrameChange = 255;
        this.statusBarQuantizedFrameChange = 255;
        this.regionSignature = "000000";
        this.region9Signature = "000000000";
        this.motion9Signature = "000000000";
        this.motion9Delta = 255;
        this.motionForwardProgress = 0;
        this.motionObstacleScore = 0;
        this.motionTurnScore = 0;
        this.motionEntranceScore = 0;
        this.motionStallScore = 0;
        this.priorFootObstacleScore = 0;
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
        this.firstDoorUseFrame = 0;
        this.firstDoorTransitionFrames = 0;
        this.firstDoorUseLatchFrames = 0;
        this.firstDoorUsePulsed = false;
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
        motion9Signature: this.motion9Signature,
        motion9Delta: this.motion9Delta,
        motionForwardProgress: this.motionForwardProgress,
        motionObstacleScore: this.motionObstacleScore,
        motionTurnScore: this.motionTurnScore,
        motionEntranceScore: this.motionEntranceScore,
        motionStallScore: this.motionStallScore,
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
        cornerSuppressFrames: this.cornerSuppressFrames,
        wallDetachFrames: this.wallDetachFrames,
        wallDetachTurn: this.wallDetachTurn,
        wallSurveyFrames: this.wallSurveyFrames,
        wallSurveyTurn: this.wallSurveyTurn,
        wallSurveyDecisionFrames: this.wallSurveyDecisionFrames,
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
        controlPipeline: this.controlPipeline,
        objective: this.objective,
        activeDetections: activeDetectionsForPipeline(this),
        semanticMemory: this.semanticMemory,
        model: this.modelManifest?.name || "Bonsai-1.7B-Q1_0"
      };
    }

    updateSemanticMemory(frame, context) {
      const memory = this.semanticMemory || createE1M1SemanticMemory();
      const depthEstimate = Number(context?.depthEstimate ?? this.depthEstimate ?? 1);
      const blueFloorHomeThreshold = Number(context?.blueFloorHomeThreshold ?? BLUE_FLOOR_HOME_THRESHOLD);
      const bridgeLaneVisible = Boolean(context?.bridgeLaneVisible);
      const corridorConfidence = clamp01(
        (Number(this.firstDoorCorridorSignature || 0) * 0.46)
        + (Number(this.spawnCorridorGapScore || 0) * 0.24)
        + (Number(this.motionEntranceScore || 0) * 0.14)
        + (Number(this.motionForwardProgress || 0) * 0.08)
        + (Number(this.blueFloorScore || 0) < blueFloorHomeThreshold ? 0.08 : 0));
      const firstDoorConfidence = clamp01(
        (Number(this.firstDoorUseSignature || 0) * 0.38)
        + (Number(this.firstDoorCorridorSignature || 0) * 0.22)
        + ((this.mapDoorSectorMatch || this.wallUseProbeFrames > 0 || this.firstDoorUseAttempted) ? 0.24 : 0)
        + (depthEstimate <= profileNumber(this.profile, "doorApproachDepth", 0.86) ? 0.16 : 0));
      const computerRoomConfidence = clamp01(
        (Number(this.computerRoomScore || 0) * 0.55)
        + (Number(this.darkAreaScore || 0) * 0.2)
        + ((this.darkZoneEntered || this.doorOpenedCount > 0) ? 0.25 : 0));
      const bridgeConfidence = clamp01(
        (Number(this.bridgeBrownScore || 0) * 0.48)
        + (Math.max(Number(this.bridgeGreenLeft || 0), Number(this.bridgeGreenCenter || 0), Number(this.bridgeGreenRight || 0)) * 0.26)
        + (bridgeLaneVisible ? 0.26 : 0));
      const finalRoomConfidence = clamp01(
        (this.finalRoomEntered ? 0.62 : 0)
        + (Number(this.bridgeDoorScore || 0) * 0.22)
        + (this.exitSwitchUseFrames > 0 ? 0.16 : 0));

      memory.phase = inferControlPipeline(this);
      memory.objective = inferObjective(this);
      memory.spawn.blueFloorScore = round2(this.blueFloorScore);
      memory.spawn.courtyardScore = round2(this.courtyardScore);
      memory.spawn.courtyardTurn = this.courtyardTurn;
      memory.firstDoor.corridorConfidence = round2(corridorConfidence);
      memory.firstDoor.corridorBearing = this.spawnCorridorGapTurn !== "none" ? this.spawnCorridorGapTurn : "right";
      memory.firstDoor.doorConfidence = round2(firstDoorConfidence);
      memory.firstDoor.distance = round2(depthEstimate);
      memory.firstDoor.opened = this.doorOpenedCount > 0 || Boolean(context?.firstDoorLikelyOpened);
      memory.computerRoom.confidence = round2(computerRoomConfidence);
      memory.computerRoom.darkAreaScore = round2(this.darkAreaScore);
      memory.computerRoom.enemyZoneMatch = Boolean(this.mapEnemyZoneMatch);
      memory.bridge.confidence = round2(bridgeConfidence);
      memory.bridge.laneTurn = this.bridgeLaneTurn;
      memory.bridge.greenHazard = round2(Math.max(this.bridgeGreenLeft, this.bridgeGreenCenter, this.bridgeGreenRight));
      memory.finalRoom.confidence = round2(finalRoomConfidence);
      memory.finalRoom.exitSwitchArmed = this.exitSwitchUseFrames > 0 || this.exitSwitchPressed;
      memory.motion.forwardProgress = round2(this.motionForwardProgress);
      memory.motion.turning = round2(this.motionTurnScore);
      memory.motion.obstacle = round2(this.motionObstacleScore);
      memory.lastUpdatedFrame = this.predictions;
      this.semanticMemory = memory;
    }

    async predict(state) {
      if (!this.enabled) {
        return neutralAction();
      }

      const startedAt = now();
      this.mode = "predicting";
      try {
        const external = resolveExternalPredictor();
        const action = external
          ? await external.predict(state)
          : await heuristicPredict(state, this.lastAction);

        this.lastAction = this.applyControlRules(action, state);
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
      const quantizedSample = quantizeFrameSample(frame.sample);
      const quantizedRegions = quantizeFrameSample(frame.regionSample);
      const quantizedRegion9 = quantizeFrameSample(frame.region9Sample);
      const previous = selectBobFilteredPreviousFrame(this.frameHistory, quantizedRegion9) || this.previousFrame;
      const frameChange = previous ? averageSampleDelta(previous.sample, frame.sample) : 255;
      const quantizedFrameChange = previous?.quantizedSample ? averageSampleDelta(previous.quantizedSample, quantizedSample) : 255;
      const regionQuantizedFrameChange = previous?.quantizedRegions ? averageSampleDelta(previous.quantizedRegions, quantizedRegions) : 255;
      const region9QuantizedFrameChange = previous?.quantizedRegion9 ? averageSampleDelta(previous.quantizedRegion9, quantizedRegion9) : 255;
      const motion = analyzeRegion9Motion(previous?.quantizedRegion9, quantizedRegion9, this.lastAction);
      const quantizedStatusBar = quantizeFrameSample(frame.statusSample);
      const statusBarQuantizedFrameChange = previous?.quantizedStatusBar ? averageSampleDelta(previous.quantizedStatusBar, quantizedStatusBar) : 255;
      const quantizedDepth = quantizeFrameSample(frame.depthSample);
      const depthSignatureDistance = nearestSignatureDistance(quantizedDepth, this.depthSignatureMemory);
      const depthEstimate = estimateDepthDistance(frame.depthSample);
      const mapHints = state?.mapHints || null;
      const quantizedFace = quantizeFrameSample(frame.faceSample);
      const quantizedAmmo = quantizeFrameSample(frame.ammoSample);
      const ammoState = estimateAmmoState(frame.ammoSample, quantizedAmmo);
      const quantizedHealth = quantizeFrameSample(frame.healthSample);
      const healthState = estimateHealthState(frame.healthSample, quantizedHealth);
      const faceQuantizedFrameChange = previous?.quantizedFace ? averageSampleDelta(previous.quantizedFace, quantizedFace) : 255;
      const visualStallDelta = Math.min(quantizedFrameChange, regionQuantizedFrameChange, region9QuantizedFrameChange);
      const wallPressure = Math.abs((frame.left || 0) - (frame.right || 0)) + Math.max(0, (frame.lowerCenter || 0) - (frame.topCenter || 0));
      const preDoorPhase = this.doorOpenedCount <= 0;
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
      const signatureMatch = this.matchVisualSignature(quantizedSample);
      const knownDepth = depthSignatureDistance <= SIGNATURE_DEPTH_MATCH_THRESHOLD;
      const movementIntent = normalized.move !== "none" || normalized.turn !== "none" || normalized.strafe || normalized.run;
      const rawCornerSignal = estimateCornerSignal(frame, frameChange, visualStallDelta, wallPressure, wallLike);
      const navigableView = looksLikeNavigableView(frame, depthEstimate, rawCornerSignal);
      const openView = looksLikeOpenView(frame, depthEstimate, targetConfidence) || navigableView;
      let effectiveTargetConfidence = navigableView ? Math.min(targetConfidence, 0.35) : targetConfidence;
      const dictionarySuppressed = this.cornerSuppressFrames > 0 || openView;
      const doorApproachDepth = profileNumber(this.profile, "doorApproachDepth", Math.max(DOOR_USE_DEPTH_THRESHOLD, 0.86));
      const knownWall = !dictionarySuppressed
        && (((signatureMatch.kind === "wall" || signatureMatch.kind === "corner") && depthEstimate <= doorApproachDepth)
          || (knownDepth && depthEstimate <= DOOR_USE_DEPTH_THRESHOLD));
      const knownCorner = !dictionarySuppressed && signatureMatch.kind === "corner";
      const cornerSignal = dictionarySuppressed ? Math.min(rawCornerSignal, 0.35) : rawCornerSignal;
      const cornerTrap = !dictionarySuppressed && cornerSignal >= CORNER_SIGNAL_THRESHOLD;
      const pinnedWall = movementIntent && (quantizedStable || knownWall) && (wallPressure > STUCK_WALL_THRESHOLD * 0.35 || wallLike || cornerTrap || knownWall);
      const cornered = looksLikeCorner(frame, Math.min(frameChange, visualStallDelta)) || cornerTrap || knownCorner;
      const looped = this.updateBreadcrumbTrail(state, frame);
      const soundCue = resolveSoundCue(state);
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
        stuckFrames: this.stuckFrames,
        quantizedStallFrames: this.quantizedStallFrames,
        quantizedFrameChange,
        regionQuantizedFrameChange,
        motion
      });
      this.targetConfidence = clamp01(Math.max(effectiveTargetConfidence, enemy.confidence));
      this.soundCueActive = Boolean(soundCue);
      this.quantizedFrameChange = quantizedFrameChange;
      this.regionQuantizedFrameChange = regionQuantizedFrameChange;
      this.statusBarQuantizedFrameChange = statusBarQuantizedFrameChange;
      this.regionSignature = regionSignature(quantizedRegions);
      this.region9Signature = regionSignature(quantizedRegion9);
      this.motion9Signature = motion.signature;
      this.motion9Delta = motion.delta;
      this.motionForwardProgress = motion.forwardProgress;
      this.motionObstacleScore = motion.obstacleScore;
      this.motionTurnScore = motion.turnScore;
      this.motionEntranceScore = motion.entranceScore;
      this.motionStallScore = motion.stallScore;
      const footObstacleScore = clamp01(Number(frame.footObstacleScore || 0));
      const footObstacleMemory = Math.max(footObstacleScore, this.priorFootObstacleScore * 0.82);
      this.priorFootObstacleScore = footObstacleMemory;
      const lastForwardIntent = this.lastAction?.move === "forward" || this.lastAction?.moveForward === true;
      if (lastForwardIntent
        && this.motionForwardProgress <= profileNumber(this.profile, "motionForwardProgressThreshold", MOTION_FORWARD_PROGRESS_THRESHOLD) * 0.55
        && this.regionQuantizedFrameChange <= QUANTIZED_STALL_THRESHOLD + 0.08) {
        this.inputStallFrames = Math.min(MAX_STUCK_COUNTER, this.inputStallFrames + 1);
      } else {
        this.inputStallFrames = Math.max(0, this.inputStallFrames - 1);
      }
      this.motionIntent = motion.intent;
      this.depthSignature = regionSignature(quantizedDepth);
      this.depthEstimate = depthEstimate;
      this.faceSignature = regionSignature(quantizedFace);
      this.faceQuantizedFrameChange = faceQuantizedFrameChange;
      this.cornerSignal = cornerSignal;
      this.signatureMatchKind = signatureMatch.kind;
      this.signatureMatchDistance = signatureMatch.distance;
      this.depthSignatureDistance = depthSignatureDistance;
      this.enemyConfidence = enemy.confidence;
      this.enemyTurn = enemy.turn;
      this.enemyDistance = enemy.distance;
      this.enemyCluster = enemy.cluster;
      this.enemyFireReady = enemy.fireReady;
      this.enemyCenterCellConfidence = enemy.centerCellConfidence || 0;
      this.enemyAllRegionPeak = enemy.allRegionPeak || 0;
      this.enemyLateralBias = enemy.lateralBias || 0;
      this.darkAreaScore = clamp01(Number(frame.darkAreaScore || 0));
      this.gameplayLuma = Number(frame.gameplayLuma || 0);
      this.blueFloorScore = clamp01(Number(frame.blueFloorScore || 0));
      this.courtyardScore = clamp01(Number(frame.courtyardScore || 0));
      this.courtyardTurn = frame.courtyardTurn === "left" || frame.courtyardTurn === "right" ? frame.courtyardTurn : "none";
      this.spawnCorridorGapScore = clamp01(Number(frame.spawnCorridorGapScore || 0));
      this.spawnCorridorGapTurn = frame.spawnCorridorGapTurn === "left" || frame.spawnCorridorGapTurn === "right" ? frame.spawnCorridorGapTurn : "none";
      this.bridgeBrownScore = clamp01(Number(frame.bridgeBrownScore || 0));
      this.bridgeGreenLeft = clamp01(Number(frame.bridgeGreenLeft || 0));
      this.bridgeGreenCenter = clamp01(Number(frame.bridgeGreenCenter || 0));
      this.bridgeGreenRight = clamp01(Number(frame.bridgeGreenRight || 0));
      this.bridgeLaneTurn = frame.bridgeLaneTurn === "left" || frame.bridgeLaneTurn === "right" ? frame.bridgeLaneTurn : "none";
      this.bridgeDoorScore = clamp01(Number(frame.bridgeDoorScore || 0));
      this.computerBlueScore = preDoorPhase ? 0 : clamp01(Number(frame.computerBlueScore || 0));
      this.computerRedLightScore = preDoorPhase ? 0 : clamp01(Number(frame.computerRedLightScore || 0));
      this.computerDarkPanelScore = preDoorPhase ? 0 : clamp01(Number(frame.computerDarkPanelScore || 0));
      this.computerPanelScore = preDoorPhase ? 0 : clamp01(Number(frame.computerPanelScore || 0));
      this.computerRoomScore = preDoorPhase ? 0 : clamp01(Number(frame.computerRoomScore || 0));
      if (this.doorOpenedCount > 0 && !ammoState.likelyEmpty) {
        const alertConfidence = Math.max(enemy.confidence, effectiveTargetConfidence);
        const alertPeakThreshold = profileNumber(this.profile, "combatAlertPeakConfidence", COMBAT_ALERT_PEAK_CONFIDENCE);
        const alertFrames = profileNumber(this.profile, "combatAlertFrames", COMBAT_ALERT_FRAMES);
        if ((enemy.cluster !== "green" && (alertConfidence >= 0.46 || this.enemyConfidencePeak >= alertPeakThreshold)) || faceQuantizedFrameChange >= COMBAT_FACE_DANGER_DELTA) {
          const previousAlertActive = this.enemyAlertFrames > 0;
          this.enemyAlertFrames = alertFrames;
          this.enemyAlertTurn = enemy.turn !== "none" ? enemy.turn : (decodeFaceDirection(frame.faceSample, faceQuantizedFrameChange) < 0 ? "left" : "right");
          this.enemyAlertCluster = enemy.cluster || "none";
          this.enemyAlertDepth = previousAlertActive
            ? Math.min(Number(this.enemyAlertDepth || 1), Number(enemy.distance ?? 1))
            : Number(enemy.distance ?? 1);
          this.enemyAlertPeakConfidence = Math.max(this.enemyAlertPeakConfidence, alertConfidence, this.enemyConfidencePeak);
        } else {
          this.enemyAlertFrames = Math.max(0, this.enemyAlertFrames - 1);
        }
      } else {
        this.enemyAlertFrames = 0;
        this.enemyAlertCluster = "none";
        this.enemyAlertDepth = 1;
        this.enemyAlertPeakConfidence = 0;
      }
      this.ammoSignature = ammoState.signature;
      this.ammoLikelyEmpty = ammoState.likelyEmpty;
      this.healthSignature = healthState.signature;
      this.healthLikelyDead = healthState.likelyDead;
      this.healthZeroScore = healthState.zeroScore || 0;
      this.healthActiveColumns = healthState.activeColumns || 0;
      this.healthActiveCells = healthState.activeCells || 0;
      if (this.doorTransitionArmedFrames > 0) {
        this.doorTransitionArmedFrames -= 1;
      }

      const darkZoneScoreThreshold = profileNumber(this.profile, "darkZoneScoreThreshold", DARK_ZONE_SCORE_THRESHOLD);
      const darkZoneLumaThreshold = profileNumber(this.profile, "darkZoneLumaThreshold", DARK_ZONE_LUMA_THRESHOLD);
      const darkZoneConfirmFrames = profileNumber(this.profile, "darkZoneConfirmFrames", DARK_ZONE_CONFIRM_FRAMES);
      const corridorSignatureThreshold = profileNumber(this.profile, "firstDoorCorridorSignatureThreshold", FIRST_DOOR_CORRIDOR_SIGNATURE_THRESHOLD);
      const corridorConfirmFrames = Math.max(8, Math.min(MAX_STUCK_COUNTER, Math.round(profileNumber(this.profile, "firstDoorCorridorConfirmFrames", FIRST_DOOR_CORRIDOR_CONFIRM_FRAMES))));
      const firstDoorUseSignatureThreshold = profileNumber(this.profile, "firstDoorUseSignatureThreshold", FIRST_DOOR_USE_SIGNATURE_THRESHOLD);
      const firstDoorSpawnScanFrames = profileNumber(this.profile, "firstDoorSpawnScanFrames", FIRST_DOOR_SPAWN_SCAN_FRAMES);
      const blueFloorHomeThreshold = profileNumber(this.profile, "blueFloorHomeThreshold", BLUE_FLOOR_HOME_THRESHOLD);
      const spawnCorridorGapThreshold = profileNumber(this.profile, "spawnCorridorGapThreshold", SPAWN_CORRIDOR_GAP_THRESHOLD);
      this.firstDoorCorridorSignature = scoreFirstDoorCorridorSignature(frame, depthEstimate, this.blueFloorScore, this.spawnCorridorGapScore);
      const darkZoneCandidate = this.gameplayLuma > 0
        && this.gameplayLuma <= darkZoneLumaThreshold
        && (this.darkAreaScore >= darkZoneScoreThreshold || this.gameplayLuma <= 56);
      const hostileZoneSignal = enemy.confidence >= 0.28
        || effectiveTargetConfidence >= 0.42
        || faceQuantizedFrameChange >= COMBAT_FACE_DANGER_DELTA
        || this.enemyAlertFrames > 0
        || this.enemyConfidencePeak >= 0.62;
      const staticDoorKnown = Boolean(mapHints?.firstDoor || mapHints?.doorLines || mapHints?.switchLines);
      const staticDarkKnown = Boolean(mapHints?.darkSectors?.length);
      const staticEnemyZoneKnown = Boolean(mapHints?.enemyThings?.length || mapHints?.thingTypes?.some?.(thing => isEnemyThingType(thing.type)));
      const corridorCandidateFrame = this.predictions >= firstDoorSpawnScanFrames + 90;
      const corridorGapGate = this.spawnCorridorGapScore >= Math.max(0.18, spawnCorridorGapThreshold - 0.08);
      const motionEntranceGate = this.motionEntranceScore >= profileNumber(this.profile, "motionEntranceThreshold", 0.22)
        && this.motionForwardProgress >= profileNumber(this.profile, "motionForwardProgressThreshold", MOTION_FORWARD_PROGRESS_THRESHOLD)
        && this.motionTurnScore < profileNumber(this.profile, "motionTurnSweepThreshold", MOTION_TURN_SWEEP_THRESHOLD)
        && this.blueFloorScore < blueFloorHomeThreshold
        && this.spawnCorridorGapScore >= Math.max(0.14, spawnCorridorGapThreshold - 0.12);
      const motionForwardGate = this.motionForwardProgress >= profileNumber(this.profile, "motionForwardProgressThreshold", MOTION_FORWARD_PROGRESS_THRESHOLD)
        && this.motionStallScore <= 0.7
        && this.motionTurnScore < profileNumber(this.profile, "motionTurnSweepThreshold", MOTION_TURN_SWEEP_THRESHOLD);
      const blueFloorExitedGate = this.predictions >= 300
        && this.blueFloorScore < blueFloorHomeThreshold
        && depthEstimate >= 0.7
        && this.firstDoorCorridorSignature >= corridorSignatureThreshold + 0.08;
      const firstDoorCorridorCandidate = this.doorOpenedCount <= 0
        && this.firstDoorCorridorSignature >= corridorSignatureThreshold
        && corridorCandidateFrame
        && (corridorGapGate || blueFloorExitedGate || motionEntranceGate || this.firstDoorUseAttempted)
        && (motionForwardGate || corridorGapGate || blueFloorExitedGate || this.firstDoorUseAttempted)
        && (this.predictions >= profileNumber(this.profile, "firstDoorSpawnScanFrames", FIRST_DOOR_SPAWN_SCAN_FRAMES) || this.firstDoorUseAttempted);
      if (firstDoorCorridorCandidate) {
        this.firstDoorCorridorFrames = Math.min(MAX_STUCK_COUNTER, this.firstDoorCorridorFrames + 1);
      } else {
        this.firstDoorCorridorFrames = Math.max(0, this.firstDoorCorridorFrames - 1);
      }
      if (!this.firstDoorCorridorLocated
        && (this.firstDoorCorridorFrames >= corridorConfirmFrames
          || (this.predictions >= 300
            && (corridorGapGate || blueFloorExitedGate)
            && this.firstDoorCorridorSignature >= corridorSignatureThreshold + 0.16))) {
        this.firstDoorCorridorLocated = true;
      }

      this.mapDoorSectorMatch = staticDoorKnown
        && this.firstDoorCorridorLocated
        && this.firstDoorUseAttempted
        && this.firstDoorUseSignature >= firstDoorUseSignatureThreshold
        && (this.doorTransitionArmedFrames > 0 || (this.darkZoneFrames > 0 && darkZoneCandidate));
      this.mapDarkSectorMatch = staticDarkKnown && darkZoneCandidate;
      this.mapEnemyZoneMatch = staticEnemyZoneKnown && hostileZoneSignal;
      this.mapSectorId = this.mapDarkSectorMatch ? "visual-dark-zone" : (this.mapDoorSectorMatch ? "door-transition" : "unknown");
      this.updateSemanticMemory(frame, {
        depthEstimate,
        corridorSignatureThreshold,
        spawnCorridorGapThreshold,
        blueFloorHomeThreshold,
        darkZoneCandidate,
        firstDoorLikelyOpened: this.firstDoorTransitionFrames >= 10,
        bridgeLaneVisible: isBridgeLaneVisible(
          this.bridgeBrownScore,
          this.bridgeGreenLeft,
          this.bridgeGreenCenter,
          this.bridgeGreenRight,
          profileNumber(this.profile, "bridgeBrownThreshold", BRIDGE_BROWN_THRESHOLD),
          profileNumber(this.profile, "bridgeGreenHazardThreshold", BRIDGE_GREEN_HAZARD_THRESHOLD)),
        enemy
      });
      if (this.mapDoorSectorMatch && this.mapDarkSectorMatch && this.mapEnemyZoneMatch) {
        this.darkZoneFrames = Math.min(MAX_STUCK_COUNTER, this.darkZoneFrames + 1);
      } else {
        this.darkZoneFrames = Math.max(0, this.darkZoneFrames - 1);
      }

      const firstDoorTransitionCandidate = this.doorOpenedCount === 0
        && this.firstDoorCorridorLocated
        && this.firstDoorUseAttempted
        && this.firstDoorUseSignature >= firstDoorUseSignatureThreshold
        && this.mapDoorSectorMatch
        && (this.doorTransitionArmedFrames > 0 || darkZoneCandidate || this.mapDarkSectorMatch);
      if (firstDoorTransitionCandidate) {
        this.firstDoorTransitionFrames = Math.min(MAX_STUCK_COUNTER, this.firstDoorTransitionFrames + 1);
      } else {
        this.firstDoorTransitionFrames = Math.max(0, this.firstDoorTransitionFrames - 1);
      }

      const computerRoomConfirmFrames = Math.max(4, Math.round(profileNumber(this.profile, "computerRoomConfirmFrames", COMPUTER_ROOM_CONFIRM_FRAMES)));
      const computerRoomVisualAfterDoor = this.computerRoomScore >= 0.24
        && (this.computerBlueScore >= 0.14
          || this.computerRedLightScore >= 0.08
          || (this.computerDarkPanelScore >= 0.30 && this.computerPanelScore >= 0.16))
        && this.gameplayLuma > 0
        && this.gameplayLuma <= 108;
      const firstDoorLikelyOpened = this.firstDoorTransitionFrames >= 10
        || (this.firstDoorCorridorLocated
          && this.firstDoorUseAttempted
          && this.mapDoorSectorMatch
          && this.mapDarkSectorMatch
          && this.darkZoneFrames >= darkZoneConfirmFrames)
        || (this.firstDoorCorridorLocated
          && this.firstDoorUseAttempted
          && this.firstDoorUseSignature >= firstDoorUseSignatureThreshold
          && this.doorTransitionArmedFrames > 0
          && computerRoomVisualAfterDoor);
      const firstDoorOpeningConfirmed = this.doorOpenedCount === 0
        && this.firstDoorCorridorLocated
        && this.firstDoorUseAttempted
        && this.firstDoorUseSignature >= firstDoorUseSignatureThreshold
        && (this.firstDoorTransitionFrames >= 8
          || this.darkZoneFrames >= Math.max(2, Math.floor(darkZoneConfirmFrames * 0.5))
          || (this.mapDoorSectorMatch && (this.mapDarkSectorMatch || darkZoneCandidate || computerRoomVisualAfterDoor))
          || (this.doorTransitionArmedFrames > 0 && computerRoomVisualAfterDoor && hostileZoneSignal));
      if (firstDoorOpeningConfirmed) {
        this.doorOpenedCount = 1;
        this.darkZoneEntered = true;
        this.computerRoomAdvanceFrames = Math.max(
          this.computerRoomAdvanceFrames,
          Math.round(profileNumber(this.profile, "computerRoomAdvanceFrames", COMPUTER_ROOM_ADVANCE_FRAMES)));
        this.wallUseProbeFrames = 0;
        this.wallUseProbeStage = 0;
        this.cornerExitCommitFrames = 0;
        this.hardStuckEscapeFrames = 0;
        this.openStallEscapeFrames = 0;
        this.loopEscapeFrames = 0;
        this.mapSectorId = "door-open-transition";
        this.safetyReason = "first-door-open-confirmed";
      }
      const computerRoomCombatAfterDoor = this.doorOpenedCount > 0
        && this.darkZoneEntered
        && this.mapEnemyZoneMatch
        && this.gameplayLuma > 0
        && this.gameplayLuma <= 80
        && this.enemyAlertFrames >= 4
        && isTrustedEnemyCluster(this.enemyAlertCluster, this.enemyAlertDepth)
        && isTrustedEnemyDepth(this.enemyAlertCluster, this.enemyAlertDepth, this.enemyAlertPeakConfidence);
      const computerRoomCandidate = (firstDoorLikelyOpened && computerRoomVisualAfterDoor)
        || computerRoomCombatAfterDoor;
      if (computerRoomCandidate) {
        this.computerRoomFrames = Math.min(MAX_STUCK_COUNTER, this.computerRoomFrames + 1);
      } else {
        this.computerRoomFrames = Math.max(0, this.computerRoomFrames - 1);
      }

      if (!this.computerRoomEntered && this.computerRoomFrames >= computerRoomConfirmFrames) {
        this.doorOpenedCount = Math.max(this.doorOpenedCount, 1);
        this.darkZoneEntered = true;
        this.computerRoomAdvanceFrames = 0;
        this.wallUseProbeFrames = 0;
        this.wallUseProbeStage = 0;
        this.computerRoomEntered = true;
        this.mapSectorId = "visual-computer-room";
        this.safetyReason = "computer-room-confirmed";
      }

      const centralHallFrame = Number(state?.frame || 0);
      const centralHallLateralBalance = Math.abs(Number(frame.left || 0) - Number(frame.right || 0));
      const centralHallCandidate = this.computerRoomEntered
        && this.doorOpenedCount >= 1
        && centralHallFrame >= 900
        && this.gameplayLuma >= 82
        && this.darkAreaScore <= 0.1
        && depthEstimate >= 0.78
        && openView
        && wallPressure <= 22
        && centralHallLateralBalance <= 36
        && !cornered
        && !knownCorner
        && !cornerTrap;
      if (centralHallCandidate) {
        this.centralHallFrames = Math.min(MAX_STUCK_COUNTER, this.centralHallFrames + 1);
      } else {
        this.centralHallFrames = Math.max(0, this.centralHallFrames - 1);
      }

      if (!this.centralHallEntered && this.centralHallFrames >= 8) {
        this.centralHallEntered = true;
        this.mapSectorId = "visual-central-hall";
        this.safetyReason = "central-hall-confirmed";
      }

      const stairsCandidate = this.computerRoomEntered
        && this.centralHallEntered
        && depthEstimate >= 0.62
        && this.gameplayLuma >= 70
        && wallPressure >= 18
        && regionQuantizedFrameChange >= 0.08;
      if (stairsCandidate) {
        this.stairsCandidateFrames = Math.min(MAX_STUCK_COUNTER, this.stairsCandidateFrames + 1);
      } else {
        this.stairsCandidateFrames = Math.max(0, this.stairsCandidateFrames - 1);
      }

      if (!this.stairsEntered && this.stairsCandidateFrames >= 12) {
        this.stairsEntered = true;
        this.mapSectorId = "visual-stairs";
      }

      const finalRoomCandidate = this.computerRoomEntered
        && this.stairsEntered
        && this.gameplayLuma >= 82
        && this.darkAreaScore <= 0.08
        && depthEstimate >= 0.82
        && openView
        && Boolean(mapHints?.exitLines || mapHints?.switchLines);
      if (finalRoomCandidate) {
        this.finalRoomCandidateFrames = Math.min(MAX_STUCK_COUNTER, this.finalRoomCandidateFrames + 1);
      } else {
        this.finalRoomCandidateFrames = Math.max(0, this.finalRoomCandidateFrames - 1);
      }

      if (!this.finalRoomEntered && this.finalRoomCandidateFrames >= 14) {
        this.finalRoomEntered = true;
        this.mapSectorId = "visual-final-room";
      }

      this.updateCombatMilestones(enemy);
      if (healthState.likelyDead || healthState.zeroScore >= 0.78) {
        this.combatFireFrames = 0;
        this.enemyConfidencePeak = 0;
        this.enemyDropFrames = 0;
        this.safetyReason = "dead-restart";
        this.mobilityMode = "reborn-use";
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

      if (movementIntent && (urgentCorner || (frameChange < STUCK_CHANGE_THRESHOLD && wallPressure > STUCK_WALL_THRESHOLD))) {
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
      } else if (firstDoorLatchActive && this.wallUseProbeFrames <= 0) {
        safe = this.firstDoorUseLatchAdvanceAction();
      } else if (this.wallUseProbeFrames > 0) {
        safe = this.wallUseProbeAction();
        this.wallUseProbeFrames -= 1;
        this.safetyReason = `door-probe-${this.wallUseProbeStage}`;
      } else if (this.wallSurveyFrames > 0) {
        safe = this.wallSurveyAction();
        this.wallSurveyFrames -= 1;
        if (this.wallSurveyFrames === 0) {
          this.wallSurveyDecisionFrames = WALL_SURVEY_DECISION_FRAMES;
        }
        this.safetyReason = "wall-survey";
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
      } else if (wallLike && !openView && depthEstimate < doorApproachDepth) {
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
        && (effectiveTargetConfidence >= TARGET_LOCK_CONFIDENCE || enemy.fireReady || this.safetyReason === "combat" || this.safetyReason === "combat-alert" || this.safetyReason === "dark-combat-alert")
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
      if (safe.use && this.pendingUseResponseFrames <= 0) {
        if (this.doorOpenedCount <= 0 && this.firstDoorCorridorLocated) {
          this.firstDoorUseAttempted = true;
          this.firstDoorUseSignature = this.firstDoorCorridorSignature;
          this.firstDoorUseFrame = Number(state?.frame || 0);
        }
        this.pendingUseResponseFrames = 14;
        this.lastUseDepthEstimate = depthEstimate;
        this.lastUseWasBlocked = wallLike || knownWall || urgentCorner || this.wallUseProbeStage > 0 || depthEstimate <= Math.max(DOOR_USE_DEPTH_THRESHOLD, profileNumber(this.profile, "doorUseDepth", DOOR_USE_DEPTH_THRESHOLD)) + 0.08;
        this.lastUseProbeStage = this.wallUseProbeStage;
      }

      const frameSnapshot = frame.sample?.length ? {
        sample: frame.sample.slice(0),
        quantizedSample,
        quantizedRegions,
        quantizedRegion9,
        quantizedStatusBar,
        quantizedDepth,
        quantizedFace,
        quantizedAmmo,
        quantizedHealth,
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
      const bridgeLaneVisible = this.doorOpenedCount > 0
        && isBridgeLaneVisible(this.bridgeBrownScore, this.bridgeGreenLeft, this.bridgeGreenCenter, this.bridgeGreenRight, bridgeBrownThreshold, bridgeGreenHazardThreshold);
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

        if (this.predictions < firstDoorOpeningForwardLockFrames) {
          return this.openingForwardLockAction(firstDoorOpeningForwardLockFrames);
        }

        const lockedCourtyardActive = this.courtyardRescueFrames > 0
          || (this.predictions >= firstDoorSpawnScanFrames
            && this.courtyardScore >= Math.max(0.22, courtyardRescueThreshold - 0.06));
        if (lockedCourtyardActive) {
          if (this.courtyardRescueFrames <= 0) {
            this.courtyardRescueFrames = courtyardRescueFrames;
            this.courtyardRescueTurnFrames = courtyardRescueTurnFrames;
            this.configureCourtyardRescue();
          }

          return this.courtyardRescueAction(courtyardRescueFrames, courtyardRescueBackFrames);
        }

        const lockedGapActive = this.spawnCorridorGapFrames > 0
          || (this.predictions >= firstDoorSpawnScanFrames
            && (this.spawnCorridorGapScore >= Math.max(0.18, spawnCorridorGapThreshold - 0.06)
              || (this.motionEntranceScore >= profileNumber(this.profile, "motionEntranceThreshold", 0.22)
                && this.motionForwardProgress >= profileNumber(this.profile, "motionForwardProgressThreshold", MOTION_FORWARD_PROGRESS_THRESHOLD)
                && this.motionTurnScore < profileNumber(this.profile, "motionTurnSweepThreshold", MOTION_TURN_SWEEP_THRESHOLD)
                && this.blueFloorScore < blueFloorHomeThreshold
                && this.spawnCorridorGapScore >= Math.max(0.14, spawnCorridorGapThreshold - 0.12))));
        if (lockedGapActive) {
          if (this.spawnCorridorGapFrames <= 0) {
            this.spawnCorridorGapFrames = spawnCorridorGapFrames;
            this.spawnCorridorGapAlignFrames = spawnCorridorGapAlignFrames;
          }

          return this.spawnCorridorGapAction(spawnCorridorGapFrames);
        }

        return this.openingRouteLockAction(firstDoorSpawnScanFrames, firstDoorWallRunFrames, firstDoorOpeningLockFrames);
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

      const computerRoomAdvanceAllowed = this.doorOpenedCount > 0
        && !this.centralHallEntered
        && !bridgeLaneVisible
        && !this.healthLikelyDead
        && this.wallUseProbeFrames <= 0
        && this.safetyReason !== "combat"
        && this.safetyReason !== "combat-alert"
        && this.safetyReason !== "dark-combat-alert";
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
          const courtyardRescueActive = this.courtyardRescueFrames > 0
            || (this.predictions >= firstDoorSpawnScanFrames
              && (this.blueFloorScore >= blueFloorHomeThreshold || this.predictions < firstDoorWallRunFrames + 120)
              && this.courtyardScore >= courtyardRescueThreshold);
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
              && (this.spawnCorridorGapScore >= spawnCorridorGapThreshold
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

          if (this.predictions < firstDoorSpawnScanFrames + 54) {
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

          if (this.predictions < firstDoorWallRunFrames + 120) {
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
        this.wallUseProbeTurn = "none";
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
            return normalizeAction({
              move: backingOff ? "back" : "none",
              turn: turning || backingOff ? turn : "none",
              fire: false,
              strafe: false,
              use: sweepUse || useWindowA || useWindowB,
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
        this.wallUseProbeTurn = "none";
        if (this.wallUseProbeFrames <= 0) {
          this.wallUseProbeFrames = Math.round(profileNumber(this.profile, "firstDoorRetryUseFrames", FIRST_DOOR_RETRY_USE_FRAMES));
        }
        this.strategyPriority = 3;
        this.controlPipeline = "FirstDoor";
        this.safetyReason = firstDoorProbeRecovery ? "first-door-locked-use" : "first-door-probe-lock";
        return this.wallUseProbeAction();
      }

      if (this.cornerExitCommitFrames > 0 && sensor.depthSig >= profileNumber(this.profile, "blockedDepth", 0.28) + 0.18) {
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

      const hardStuckDetected = sensor.stuckTicks >= STUCK_FRAMES && Number(sensor.qDelta || 0) <= QUANTIZED_STALL_THRESHOLD;
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

      const openAdvanceStalled = sensor.contextDict === "open-space"
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

      if (sensor.stuckTicks >= profileNumber(this.profile, "emergencyStuckTicks", EMERGENCY_STUCK_TICKS)) {
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

      if ((objective === "open-first-door" || objective === "find-and-open-first-door") && this.doorOpenedCount <= 0 && this.firstDoorCorridorLocated) {
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

        if (this.firstDoorUseLatchFrames > 0 && this.firstDoorUseAttempted) {
          return this.firstDoorUseLatchAdvanceAction();
        }

        if (this.wallUseProbeFrames > 0) {
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

        this.wallUseProbeStage = Math.max(2, this.wallUseProbeStage || 2);
        this.wallUseProbeTurn = doorConfidence >= 0.48 || this.firstDoorUseAttempted ? "none" : (
          this.spawnCorridorGapTurn !== "none"
            ? this.spawnCorridorGapTurn
            : (this.wallUseProbeTurn === "left" || this.wallUseProbeTurn === "right" ? this.wallUseProbeTurn : "none"));
        this.wallUseProbeFrames = Math.round(profileNumber(this.profile, "firstDoorRetryUseFrames", FIRST_DOOR_RETRY_USE_FRAMES));
        return this.wallUseProbeAction();
      }

      if ((objective === "reach-first-door" || objective === "find-and-open-first-door")
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

        if (this.courtyardRescueFrames > 0
          || (this.predictions >= Number(options.firstDoorSpawnScanFrames ?? FIRST_DOOR_SPAWN_SCAN_FRAMES)
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

        if (this.spawnCorridorGapFrames > 0
          || corridorConfidence >= corridorThreshold
          || this.spawnCorridorGapScore >= Math.max(0.18, Number(options.spawnCorridorGapThreshold ?? SPAWN_CORRIDOR_GAP_THRESHOLD) - 0.06)) {
          if (this.spawnCorridorGapFrames <= 0) {
            this.spawnCorridorGapFrames = Number(options.spawnCorridorGapFrames ?? SPAWN_CORRIDOR_GAP_FRAMES);
            this.spawnCorridorGapAlignFrames = Number(options.spawnCorridorGapAlignFrames ?? SPAWN_CORRIDOR_GAP_ALIGN_FRAMES);
          }

          return this.spawnCorridorGapAction(Number(options.spawnCorridorGapFrames ?? SPAWN_CORRIDOR_GAP_FRAMES));
        }

        return this.openingRouteLockAction(
          Number(options.firstDoorSpawnScanFrames ?? FIRST_DOOR_SPAWN_SCAN_FRAMES),
          Number(options.firstDoorWallRunFrames ?? FIRST_DOOR_RIGHT_WALL_RUN_FRAMES),
          Number(options.firstDoorOpeningLockFrames ?? FIRST_DOOR_OPENING_LOCK_FRAMES));
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
      const turn = Math.abs(wallVector) >= 0.26
        ? (wallVector > 0 ? "left" : "right")
        : (this.targetConfidence >= 0.28 ? targetTurnDirection(frame) : "none");
      const sidePressure = Math.abs(wallVector) >= 0.34;
      this.computerRoomAdvanceFrames = Math.max(0, this.computerRoomAdvanceFrames - 1);
      this.strategyPriority = 2;
      this.strategyContext = "computer-room";
      this.controlPipeline = "ComputerRoom";
      this.safetyReason = "computer-room-advance";
      this.mobilityMode = turn === "none" ? "computer-room-centerline" : `computer-room-trim-${turn}`;
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
      this.mobilityMode = "opening-north-forward";
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

    openingRouteLockAction(scanFrames, wallRunFrames, lockFrames) {
      const frame = Math.max(0, Number(this.predictions || 0));
      this.strategyPriority = 3;
      this.strategyContext = "spawn-home";
      this.controlPipeline = "OpeningHome";
      this.safetyReason = "opening-route-lock";
      this.wallUseProbeFrames = 0;
      this.wallUseProbeStage = 0;
      this.mobilityMode = "opening-lock";

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
      const probingClosedGate = closeEnough || this.depthEstimate <= doorApproachDepth || useWindow;
      const phase = aiming ? "aim" : (approaching ? "approach" : (settleWindow ? "settle" : (pressWindow ? "press-use" : "use")));
      const useSweepTurn = this.wallUseProbeTurn === "left" || this.wallUseProbeTurn === "right"
        ? this.wallUseProbeTurn
        : (firstDoorMode ? "none" : this.turnBias);
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
      const requestedUse = (useWindow && probingClosedGate) || (firstDoorRetryMode && elapsed >= aimFrames + approachFrames);
      const shouldUse = requestedUse && !firstDoorUseLatched;
      if (firstDoorMode && shouldUse) {
        this.firstDoorUseLatchFrames = Math.round(profileNumber(this.profile, "firstDoorUseLatchFrames", FIRST_DOOR_USE_LATCH_FRAMES));
        this.firstDoorUsePulsed = true;
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
      this.wallUseProbeTurn = "none";
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
        use: false,
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
        && this.priorFootObstacleScore >= 0.18
        && this.inputStallFrames >= 2;
      const turningSweep = this.motionIntent.includes("turn") && this.motionTurnScore >= turnSweepThreshold;
      const stalled = this.quantizedStallFrames >= turnStuckFrames || this.stuckFrames >= turnStuckFrames || (blocked && motionStalled) || footObstacleStalled;
      const shouldSkirt = !blocked
        && !turningSweep
        && (motionObstacle || footObstacleStalled || this.inputStallFrames >= 3 || this.quantizedStallFrames >= 2 || this.stuckFrames >= 2 || this.targetConfidence >= 0.24);
      const skirtPhase = skirtFrames > 0 && (this.predictions % Math.max(1, skirtFrames * 2)) < skirtFrames;
      this.strategyPriority = 2;
      this.controlPipeline = "FirstDoor";
      this.safetyReason = blocked && stalled ? "corridor-end-right" : (footObstacleStalled ? "corridor-foot-obstacle" : (motionObstacle ? "corridor-motion-obstacle" : "corridor-transit"));
      this.mobilityMode = blocked && stalled
        ? "corridor-end-face-door"
        : (shouldSkirt && skirtPhase ? "corridor-skirt-left-obstacle" : "corridor-forward-hold");
      return normalizeAction({
        move: blocked && stalled ? "none" : "forward",
        turn: blocked && stalled ? "right" : (shouldSkirt && skirtPhase ? "left" : "none"),
        fire: false,
        strafe: shouldSkirt && skirtPhase,
        use: false,
        run: !(blocked && stalled) && !(shouldSkirt && skirtPhase)
      });
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

    wallHugAction(action, frame, state) {
      this.wallHugSide = chooseWallHugSide(frame, this.wallHugSide);
      const awaySide = oppositeTurn(this.wallHugSide);
      return this.strafeRunAction(action, state, awaySide, `wall-away-${awaySide}`);
    }

    updateCombatMilestones(enemy) {
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
        depthSample: [],
        statusSample: [],
        ammoSample: [],
        ammoSignature: "000000000000000000000",
        ammoLikelyEmpty: false,
        healthSample: [],
        healthSignature: "000000000000000000000000",
        healthLikelyDead: false,
        faceSample: [],
        faceAverage: 0,
        statusBarAverage: 0,
        gameplayLuma: 0,
        darkAreaScore: 0,
        blueFloorScore: 0,
        courtyardScore: 0,
        courtyardTurn: "none",
        spawnCorridorGapScore: 0,
        spawnCorridorGapTurn: "none",
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
    const enemyRegionTotals = new Array(REGION_COLUMNS * REGION_ROWS).fill(0);
    const enemyRegionCounts = new Array(REGION_COLUMNS * REGION_ROWS).fill(0);
    const enemyRegion9Totals = new Array(REGION9_COLUMNS * REGION9_ROWS).fill(0);
    const enemyRegion9Counts = new Array(REGION9_COLUMNS * REGION9_ROWS).fill(0);
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
    let darkAreaTotal = 0;
    let blueFloorTotal = 0;
    let courtyardLowerLeft = 0;
    let courtyardLowerRight = 0;
    let courtyardUpperLeft = 0;
    let courtyardUpperRight = 0;
    let courtyardLowerLeftCount = 0;
    let courtyardLowerRightCount = 0;
    let courtyardUpperLeftCount = 0;
    let courtyardUpperRightCount = 0;
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
    let footObstacleCount = 0;
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
        blueFloorTotal += scoreBlueFloorPaletteIndex(value, rgbaBytes);
        if (row >= Math.floor(SAMPLE_ROWS * 0.56)) {
          const courtyardLower = scoreCourtyardLowerPaletteIndex(value, rgbaBytes);
          if (column < SAMPLE_COLUMNS / 2) {
            courtyardLowerLeft += courtyardLower;
            courtyardLowerLeftCount += 1;
          } else {
            courtyardLowerRight += courtyardLower;
            courtyardLowerRightCount += 1;
          }
        } else if (row <= Math.floor(SAMPLE_ROWS * 0.46)) {
          const courtyardUpper = scoreCourtyardUpperPaletteIndex(value, rgbaBytes);
          if (column < SAMPLE_COLUMNS / 2) {
            courtyardUpperLeft += courtyardUpper;
            courtyardUpperLeftCount += 1;
          } else {
            courtyardUpperRight += courtyardUpper;
            courtyardUpperRightCount += 1;
          }
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
        if (row >= 8 && row <= 12 && column >= 8 && column <= 18) {
          footObstacle += scoreFootObstaclePaletteIndex(value, rgbaBytes);
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
        const enemyScore = scoreEnemyPaletteIndex(value, rgbaBytes);
        enemyRegionTotals[regionIndex] += enemyScore.score;
        enemyRegionCounts[regionIndex] += 1;
        enemyRegion9Totals[region9Index] += enemyScore.score;
        enemyRegion9Counts[region9Index] += 1;
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
      }
    }

    const regionSample = regionTotals.map((total, index) => regionCounts[index] ? Math.round(total / regionCounts[index]) : 0);
    const region9Sample = region9Totals.map((total, index) => region9Counts[index] ? Math.round(total / region9Counts[index]) : 0);
    const enemyRegionSample = enemyRegionTotals.map((total, index) => enemyRegionCounts[index] ? round2(total / enemyRegionCounts[index]) : 0);
    const enemyRegion9Sample = enemyRegion9Totals.map((total, index) => enemyRegion9Counts[index] ? round2(total / enemyRegion9Counts[index]) : 0);
    const enemy = summarizeEnemyRegions(enemyRegionSample, enemyClusterTotals, estimateDepthDistance(depthTotals.map((total, index) => depthCounts[index] ? Math.round(total / depthCounts[index]) : 0)), enemyRegion9Sample);
    const depthSample = depthTotals.map((total, index) => depthCounts[index] ? Math.round(total / depthCounts[index]) : 0);
    const depthEstimate = estimateDepthDistance(depthSample);
    const ammoState = estimateAmmoState(ammoSample, quantizeFrameSample(ammoSample));
    const healthState = estimateHealthState(healthSample, quantizeFrameSample(healthSample));
    const courtyardLeft = (
      (courtyardLowerLeftCount ? courtyardLowerLeft / courtyardLowerLeftCount : 0) * 0.56)
      + ((courtyardUpperLeftCount ? courtyardUpperLeft / courtyardUpperLeftCount : 0) * 0.44);
    const courtyardRight = (
      (courtyardLowerRightCount ? courtyardLowerRight / courtyardLowerRightCount : 0) * 0.56)
      + ((courtyardUpperRightCount ? courtyardUpperRight / courtyardUpperRightCount : 0) * 0.44);
    const courtyardScore = round2(clamp01(Math.max(courtyardLeft, courtyardRight)));
    const courtyardTurn = Math.abs(courtyardLeft - courtyardRight) < 0.08
      ? "none"
      : (courtyardRight > courtyardLeft ? "right" : "left");
    const spawnGapEdges = estimateSpawnCorridorGapEdges(lumaGrid);
    const spawnGapDarkScore = spawnGapCount ? spawnGapDark / spawnGapCount : 0;
    const spawnGapPillarScore = spawnPillarCount ? spawnGapPillar / spawnPillarCount : 0;
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
    const footObstacleScore = round2(clamp01(footObstacleCount ? footObstacle / footObstacleCount : 0));
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
      depthSample,
      depthEstimate,
      statusSample,
      ammoSample,
      ammoSignature: ammoState.signature,
      ammoLikelyEmpty: ammoState.likelyEmpty,
      healthSample,
      healthSignature: healthState.signature,
      healthLikelyDead: healthState.likelyDead,
      faceSample,
      faceAverage: faceSample.length ? Math.round(faceTotal / faceSample.length) : 0,
      statusBarAverage: statusSample.length ? Math.round(statusTotal / statusSample.length) : 0,
      gameplayLuma: gameplayLumaCount ? round2(gameplayLumaTotal / gameplayLumaCount) : 0,
      darkAreaScore: sample.length ? round2(darkAreaTotal / sample.length) : 0,
      blueFloorScore: sample.length ? round2(blueFloorTotal / sample.length) : 0,
      courtyardScore,
      courtyardTurn,
      spawnCorridorGapScore,
      spawnCorridorGapTurn,
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
      enemyRegionSample,
      enemyRegion9Sample,
      enemyConfidence: enemy.confidence,
      enemyTurn: enemy.turn,
      enemyCentered: enemy.centered,
      enemyCluster: enemy.cluster,
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
    if (!rgbaBytes || index < 0 || index > 255) {
      return { score: 0, name: "none" };
    }

    const offset = index * 4;
    return scoreEnemyRgb(rgbaBytes[offset] || 0, rgbaBytes[offset + 1] || 0, rgbaBytes[offset + 2] || 0);
  }

  function scoreDarkPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return { score: 0, luma: 0 };
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max - min;
    const dark = luma <= DARK_ZONE_LUMA_THRESHOLD && saturation >= 8;
    return {
      score: dark ? clamp01((DARK_ZONE_LUMA_THRESHOLD - luma) / DARK_ZONE_LUMA_THRESHOLD) : 0,
      luma
    };
  }

  function scoreBlueFloorPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const brightness = (red + green + blue) / 3;
    const blueDominance = blue - Math.max(red, green);
    const mutedBlue = blue >= 44 && blue <= 190 && brightness >= 24 && brightness <= 150;
    return mutedBlue && blueDominance >= 10
      ? clamp01((blueDominance - 10) / 64)
      : 0;
  }

  function scoreCourtyardLowerPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const brightness = (red + green + blue) / 3;
    const greenDominance = green - Math.max(red, blue);
    const nukageLike = green >= 34 && green <= 190 && brightness >= 18 && brightness <= 150;
    return nukageLike && greenDominance >= 8
      ? clamp01((greenDominance - 8) / 72)
      : 0;
  }

  function scoreCourtyardUpperPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max - min;
    const darkGreen = green >= Math.max(red, blue) - 2 && luma <= 72 && saturation >= 8;
    const paleGray = luma >= 88 && luma <= 196 && saturation <= 24;
    return darkGreen
      ? clamp01((72 - luma) / 72)
      : (paleGray ? clamp01((196 - Math.abs(luma - 142)) / 196) : 0);
  }

  function scoreSpawnCorridorGapPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    const panelDark = luma >= 18 && luma <= 92 && saturation <= 48;
    return panelDark ? clamp01((92 - luma) / 74) : 0;
  }

  function scoreSpawnCorridorPillarPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const brown = red >= green + 6 && green >= blue - 4 && luma >= 42 && luma <= 154;
    const gray = Math.max(red, green, blue) - Math.min(red, green, blue) <= 28 && luma >= 54 && luma <= 178;
    return brown || gray ? clamp01((luma - 32) / 108) : 0;
  }

  function scoreBridgeBrownPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    const brown = red >= green - 2 && green >= blue + 4 && luma >= 38 && luma <= 156 && saturation >= 10;
    return brown ? clamp01((saturation - 8) / 74) : 0;
  }

  function scoreBridgeGreenPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const greenDominance = green - Math.max(red, blue);
    const darkGreenWall = green >= Math.max(red, blue) - 1 && luma >= 18 && luma <= 116;
    const nukage = green >= 28 && greenDominance >= 5 && luma >= 18 && luma <= 158;
    return nukage
      ? clamp01((greenDominance + 12) / 86)
      : (darkGreenWall ? clamp01((116 - luma) / 108) * 0.7 : 0);
  }

  function scoreBridgeDoorPanelPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    const darkDoorBrown = red >= green - 4 && green >= blue - 2 && luma >= 18 && luma <= 96 && saturation >= 10;
    const blackPanel = luma >= 8 && luma <= 42 && saturation <= 36;
    return darkDoorBrown
      ? clamp01((96 - luma) / 78)
      : (blackPanel ? clamp01((42 - luma) / 34) * 0.68 : 0);
  }

  function scoreComputerRoomBluePaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const blueDominance = blue - Math.max(red, green);
    const darkPanelBlue = blue >= 34 && blueDominance >= 6 && luma >= 14 && luma <= 116;
    return darkPanelBlue ? clamp01((blueDominance + 18) / 88) : 0;
  }

  function scoreComputerRoomRedLightPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const redDominance = red - Math.max(green, blue);
    const redLamp = red >= 72 && redDominance >= 24 && luma >= 22 && luma <= 172;
    return redLamp ? clamp01((redDominance - 8) / 120) : 0;
  }

  function scoreComputerRoomDarkPanelPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    const blueFloor = blue >= Math.max(red, green) + 18 && luma >= 28;
    const nukageGreen = green >= Math.max(red, blue) + 18 && luma >= 34;
    const darkConsole = luma >= 8 && luma <= 86 && saturation <= 78 && !blueFloor && !nukageGreen;
    return darkConsole ? clamp01((92 - luma) / 84) : 0;
  }

  function scoreComputerRoomPanelPaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const greenLed = green >= 42 && green >= red + 4 && green >= blue + 8 && luma >= 18 && luma <= 128;
    const amberLed = red >= 48 && green >= 28 && red >= blue + 14 && green >= blue + 8 && luma >= 22 && luma <= 142;
    const grayConsole = Math.abs(red - green) <= 24 && Math.abs(green - blue) <= 28 && luma >= 34 && luma <= 126;
    return greenLed
      ? clamp01((green - blue + 16) / 92)
      : (amberLed ? clamp01((red + green - blue) / 210) : (grayConsole ? 0.28 : 0));
  }

  function scoreFootObstaclePaletteIndex(index, rgbaBytes) {
    if (!rgbaBytes || index < 0 || index > 255) {
      return 0;
    }

    const offset = index * 4;
    const red = rgbaBytes[offset] || 0;
    const green = rgbaBytes[offset + 1] || 0;
    const blue = rgbaBytes[offset + 2] || 0;
    const luma = red * 0.299 + green * 0.587 + blue * 0.114;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    const barrelBrown = red >= green - 2 && green >= blue + 2 && luma >= 34 && luma <= 134 && saturation >= 12;
    const metalGray = saturation <= 30 && luma >= 52 && luma <= 162;
    return barrelBrown
      ? clamp01((saturation - 8) / 78)
      : (metalGray ? clamp01((162 - Math.abs(luma - 96)) / 162) * 0.42 : 0);
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
    let best = { score: 0, name: "none" };
    const brightness = (red + green + blue) / 3;
    const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
    if (brightness < 24 || brightness > 226 || saturation < 18) {
      return best;
    }

    for (let index = 0; index < ENEMY_COLOR_CLUSTERS.length; index += 1) {
      const cluster = ENEMY_COLOR_CLUSTERS[index];
      const dr = red - cluster.r;
      const dg = green - cluster.g;
      const db = blue - cluster.b;
      const distance = Math.sqrt((dr * dr) + (dg * dg) + (db * db));
      const score = Math.max(0, 1 - (distance / 128));
      if (score > best.score) {
        best = { score, name: cluster.name };
      }
    }

    return best.score >= 0.18 ? best : { score: 0, name: "none" };
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
      return Number(depth || 1) < 0.76;
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
      return safeDepth < 0.86 || Number(centerConfidence || 0) >= 0.52;
    }

    return safeDepth < 0.95;
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
        activeCells: 0
      };
    }

    let bright = 0;
    let maxBucket = 0;
    const buckets = new Set();
    for (let index = 0; index < healthSample.length; index += 1) {
      const value = Number(healthSample[index] || 0);
      const bucket = Math.floor(value / WALL_QUANTIZATION_STEP);
      maxBucket = Math.max(maxBucket, bucket);
      if (bucket > 0) {
        buckets.add(bucket);
      }
      if (value >= 32) {
        bright += 1;
      }
    }

    const horizontalSpread = countActiveColumns(quantizedHealth || [], HEALTH_SAMPLE_COLUMNS);
    const sparseDigits = bright > 0 && bright <= 11;
    const compactColumns = horizontalSpread > 0 && horizontalSpread <= 4;
    const limitedBuckets = buckets.size <= 5;
    const hasRedDigitSignal = maxBucket >= 3;
    const zeroScore = clamp01(
      (sparseDigits ? 0.34 : 0)
      + (compactColumns ? 0.28 : 0)
      + (limitedBuckets ? 0.18 : 0)
      + (hasRedDigitSignal ? 0.2 : 0));
    const likelyDead = zeroScore >= 0.78;
    return {
      signature,
      likelyDead,
      zeroScore,
      activeColumns: horizontalSpread,
      activeCells: bright
    };
  }

  function countActiveColumns(sample, columns) {
    if (!sample?.length || columns <= 0) {
      return 0;
    }

    const active = new Set();
    for (let index = 0; index < sample.length; index += 1) {
      if (Number(sample[index] || 0) > 0) {
        active.add(index % columns);
      }
    }

    return active.size;
  }

  function round2(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function averageSampleDelta(previous, current) {
    if (!previous?.length || !current?.length) {
      return 255;
    }

    const count = Math.min(previous.length, current.length);
    let total = 0;
    for (let index = 0; index < count; index += 1) {
      total += Math.abs((previous[index] || 0) - (current[index] || 0));
    }

    return total / count;
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
    const move = action?.move === "forward" ? "forward" : (action?.move === "back" ? "back" : "");
    const turn = action?.turn === "left" || action?.turn === "right" ? "turn" : "";
    const strafe = action?.strafe ? "strafe" : "";
    const parts = [move, turn, strafe].filter(Boolean);
    return parts.length ? parts.join("-") : "idle";
  }

  function quantizeFrameSample(sample) {
    if (!sample?.length) {
      return [];
    }

    const quantized = new Array(sample.length);
    for (let index = 0; index < sample.length; index += 1) {
      quantized[index] = Math.round((sample[index] || 0) / WALL_QUANTIZATION_STEP);
    }

    return quantized;
  }

  function regionSignature(sample) {
    if (!sample?.length) {
      return "000000";
    }

    return sample.map(value => Math.max(0, Math.min(15, value || 0)).toString(16)).join("");
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

    const direction = cue.direction === "right" ? "right" : (cue.direction === "left" ? "left" : null);
    if (direction) {
      return { direction };
    }

    const dx = Number(cue.x ?? cue.dx ?? cue.sourceX);
    if (Number.isFinite(dx) && Math.abs(dx) > 0.1) {
      return { direction: dx > 0 ? "right" : "left" };
    }

    return null;
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
    if (!profile || typeof profile !== "object") {
      return Object.assign({}, DEFAULT_AUTOPLAY_PROFILE);
    }

    return Object.assign({}, DEFAULT_AUTOPLAY_PROFILE, profile);
  }

  function profileNumber(profile, key, fallback) {
    const value = Number(profile?.[key]);
    return Number.isFinite(value) ? value : fallback;
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
    const result = new Array(REGION_COLUMNS * REGION_ROWS);
    for (let index = 0; index < result.length; index += 1) {
      result[index] = clamp01((regions[index] || 0) / 255);
    }
    return result;
  }

  function normalizeRegion9(regions) {
    const result = new Array(REGION9_COLUMNS * REGION9_ROWS);
    for (let index = 0; index < result.length; index += 1) {
      result[index] = clamp01((regions[index] || 0) / 255);
    }
    return result;
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

  function inferControlPipeline(controller) {
    if (!controller || !controller.enabled) {
      return "Idle";
    }

    if (controller.finalRoomEntered) {
      return "ExitRoom";
    }

    if (controller.doorOpenedCount > 1) {
      return "SecondDoor";
    }

    if (controller.doorOpenedCount > 0
      && isBridgeLaneVisible(
        controller.bridgeBrownScore,
        controller.bridgeGreenLeft,
        controller.bridgeGreenCenter,
        controller.bridgeGreenRight,
        profileNumber(controller.profile, "bridgeBrownThreshold", BRIDGE_BROWN_THRESHOLD),
        profileNumber(controller.profile, "bridgeGreenHazardThreshold", BRIDGE_GREEN_HAZARD_THRESHOLD))) {
      return "Bridge";
    }

    if (controller.darkZoneEntered || controller.doorOpenedCount > 0) {
      return "ComputerRoom";
    }

    if (controller.firstDoorCorridorLocated) {
      return "FirstDoor";
    }

    return "OpeningHome";
  }

  function inferObjective(controller) {
    if (!controller || !controller.enabled) {
      return "disabled";
    }

    if (controller.exitSwitchPressed) {
      return "level-clear";
    }

    if (controller.finalRoomEntered) {
      return "press-exit-switch";
    }

    if (controller.stairsEntered || controller.doorOpenedCount > 1) {
      return "reach-final-room";
    }

    if (controller.doorOpenedCount > 0
      && isBridgeLaneVisible(
        controller.bridgeBrownScore,
        controller.bridgeGreenLeft,
        controller.bridgeGreenCenter,
        controller.bridgeGreenRight,
        profileNumber(controller.profile, "bridgeBrownThreshold", BRIDGE_BROWN_THRESHOLD),
        profileNumber(controller.profile, "bridgeGreenHazardThreshold", BRIDGE_GREEN_HAZARD_THRESHOLD))) {
      return "cross-bridge";
    }

    if (controller.computerRoomEntered || controller.darkZoneEntered || controller.doorOpenedCount > 0) {
      return "reach-central-hall";
    }

    if (controller.doorOpenedCount <= 0) {
      return "find-and-open-first-door";
    }

    return "reach-central-hall";
  }

  function activeDetectionsForPipeline(controller) {
    const phase = inferControlPipeline(controller);
    if (!controller || !controller.enabled) {
      return ["objective", "hud"];
    }

    if (phase === "OpeningHome") {
      return ["objective", "motion", "wall", "foot", "hud"];
    }

    if (phase === "FirstDoor") {
      return ["objective", "motion", "door", "wall", "foot", "hud"];
    }

    if (phase === "ComputerRoom") {
      return ["objective", "motion", "computer", "enemy", "wall", "foot", "hud"];
    }

    if (phase === "Bridge") {
      return ["objective", "motion", "wall", "foot", "hud"];
    }

    if (phase === "SecondDoor") {
      return ["objective", "motion", "door", "enemy", "wall", "foot", "hud"];
    }

    if (phase === "ExitRoom") {
      return ["objective", "motion", "door", "hud"];
    }

    return ["objective", "hud"];
  }

  function createE1M1SemanticMemory() {
    return {
      map: "E1M1",
      coordinateHint: "spawn=A/south; corridor=north; courtyard=east; firstDoor=east-after-corridor; bridge=east-southeast; exit=southeast",
      phase: "OpeningHome",
      objective: "find-and-open-first-door",
      spawn: {
        blueFloorScore: 0,
        courtyardScore: 0,
        courtyardTurn: "none"
      },
      firstDoor: {
        corridorConfidence: 0,
        corridorBearing: "right",
        doorConfidence: 0,
        distance: 1,
        opened: false
      },
      computerRoom: {
        confidence: 0,
        darkAreaScore: 0,
        enemyZoneMatch: false
      },
      bridge: {
        confidence: 0,
        laneTurn: "none",
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

  function normalizeAction(action, fallback) {
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
    return {
      move: "none",
      turn: "none",
      fire: false,
      strafe: false,
      use: false,
      run: false
    };
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
