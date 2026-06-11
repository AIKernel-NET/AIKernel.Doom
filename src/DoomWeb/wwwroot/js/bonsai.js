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
  const DEPTH_BANDS = 4;
  const FACE_X = 144;
  const FACE_Y = 168;
  const FACE_WIDTH = 32;
  const FACE_HEIGHT = 32;
  const FACE_SAMPLE_COLUMNS = 4;
  const FACE_SAMPLE_ROWS = 4;
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
  const WALL_DETACH_FRAMES = 18;
  const WALL_SURVEY_FRAMES = 16;
  const WALL_SURVEY_BACK_FRAMES = 5;
  const WALL_SURVEY_DECISION_FRAMES = 24;
  const TARGET_LOCK_CONFIDENCE = 0.56;
  const COMBAT_CONFIDENCE_THRESHOLD = 0.42;
  const COMBAT_FIRE_CONFIDENCE = 0.58;
  const COMBAT_CLOSE_DEPTH_THRESHOLD = 0.72;
  const COMBAT_FACE_DANGER_DELTA = 0.32;
  const REPEAT_ACTION_THRESHOLD = 16;
  const REPEAT_TURN_FRAMES = 12;
  const WALL_QUANTIZATION_STEP = 16;
  const QUANTIZED_STALL_THRESHOLD = 1.2;
  const QUANTIZED_WALL_STALL_FRAMES = 3;
  const CORNER_SIGNAL_THRESHOLD = 0.72;
  const WALL_USE_PROBE_FRAMES = 18;
  const WALL_USE_AIM_FRAMES = 8;
  const WALL_USE_APPROACH_FRAMES = 4;
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
  const STRATEGY_NAME = "SensorFusionStrafeProbeV3";
  const EMERGENCY_STUCK_TICKS = 54;
  const BACKSTEP_DEPTH_GUARD = 0.66;
  const ENEMY_COLOR_CLUSTERS = [
    { name: "red", r: 176, g: 38, b: 32 },
    { name: "brown", r: 135, g: 82, b: 48 },
    { name: "green", r: 70, g: 128, b: 62 },
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
      this.strategyName = STRATEGY_NAME;
      this.strategyContext = "unknown";
      this.strategyPriority = 0;
    }

    configure(manifest) {
      this.modelManifest = manifest || null;
      this.log("[AUTOPLAY]", "log-info", `Bonsai supervisor configured: ${manifest?.name || "Bonsai-1.7B"} (${manifest?.quantization || "Q1_0"}).`);
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      this.mode = this.enabled ? "idle" : "disabled";
      if (!this.enabled) {
        this.lastAction = neutralAction();
        this.previousFrame = null;
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
        this.strategyContext = "unknown";
        this.strategyPriority = 0;
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
        quantizedStallFrames: this.quantizedStallFrames,
        quantizedFrameChange: this.quantizedFrameChange,
        regionQuantizedFrameChange: this.regionQuantizedFrameChange,
        statusBarQuantizedFrameChange: this.statusBarQuantizedFrameChange,
        regionSignature: this.regionSignature,
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
        strategyContext: this.strategyContext,
        strategyPriority: this.strategyPriority,
        model: this.modelManifest?.name || "Bonsai-1.7B-Q1_0"
      };
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
      const previous = this.previousFrame;
      const frameChange = previous ? averageSampleDelta(previous.sample, frame.sample) : 255;
      const quantizedSample = quantizeFrameSample(frame.sample);
      const quantizedFrameChange = previous?.quantizedSample ? averageSampleDelta(previous.quantizedSample, quantizedSample) : 255;
      const quantizedRegions = quantizeFrameSample(frame.regionSample);
      const regionQuantizedFrameChange = previous?.quantizedRegions ? averageSampleDelta(previous.quantizedRegions, quantizedRegions) : 255;
      const quantizedStatusBar = quantizeFrameSample(frame.statusSample);
      const statusBarQuantizedFrameChange = previous?.quantizedStatusBar ? averageSampleDelta(previous.quantizedStatusBar, quantizedStatusBar) : 255;
      const quantizedDepth = quantizeFrameSample(frame.depthSample);
      const depthSignatureDistance = nearestSignatureDistance(quantizedDepth, this.depthSignatureMemory);
      const depthEstimate = estimateDepthDistance(frame.depthSample);
      const quantizedFace = quantizeFrameSample(frame.faceSample);
      const faceQuantizedFrameChange = previous?.quantizedFace ? averageSampleDelta(previous.quantizedFace, quantizedFace) : 255;
      const visualStallDelta = Math.min(quantizedFrameChange, regionQuantizedFrameChange);
      const wallPressure = Math.abs((frame.left || 0) - (frame.right || 0)) + Math.max(0, (frame.lowerCenter || 0) - (frame.topCenter || 0));
      const targetConfidence = estimateTargetConfidence(frame);
      const enemy = estimateEnemyPresence(frame);
      const quantizedStable = visualStallDelta <= QUANTIZED_STALL_THRESHOLD;
      const wallLike = looksLikeWall(frame);
      const signatureMatch = this.matchVisualSignature(quantizedSample);
      const knownDepth = depthSignatureDistance <= SIGNATURE_DEPTH_MATCH_THRESHOLD;
      const movementIntent = normalized.move !== "none" || normalized.turn !== "none" || normalized.strafe || normalized.run;
      const rawCornerSignal = estimateCornerSignal(frame, frameChange, visualStallDelta, wallPressure, wallLike);
      const navigableView = looksLikeNavigableView(frame, depthEstimate, rawCornerSignal);
      const openView = looksLikeOpenView(frame, depthEstimate, targetConfidence) || navigableView;
      const effectiveTargetConfidence = navigableView ? Math.min(targetConfidence, 0.35) : targetConfidence;
      const dictionarySuppressed = this.cornerSuppressFrames > 0 || openView;
      const knownWall = !dictionarySuppressed && (signatureMatch.kind === "wall" || signatureMatch.kind === "corner" || (knownDepth && depthEstimate <= DOOR_USE_DEPTH_THRESHOLD));
      const knownCorner = !dictionarySuppressed && signatureMatch.kind === "corner";
      const cornerSignal = dictionarySuppressed ? Math.min(rawCornerSignal, 0.35) : rawCornerSignal;
      const cornerTrap = !dictionarySuppressed && cornerSignal >= CORNER_SIGNAL_THRESHOLD;
      const pinnedWall = movementIntent && (quantizedStable || knownWall) && (wallPressure > STUCK_WALL_THRESHOLD * 0.35 || wallLike || cornerTrap || knownWall);
      const cornered = looksLikeCorner(frame, Math.min(frameChange, visualStallDelta)) || cornerTrap || knownCorner;
      const looped = this.updateBreadcrumbTrail(state, frame);
      const soundCue = resolveSoundCue(state);
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
        regionQuantizedFrameChange
      });
      this.targetConfidence = clamp01(Math.max(effectiveTargetConfidence, enemy.confidence));
      this.soundCueActive = Boolean(soundCue);
      this.quantizedFrameChange = quantizedFrameChange;
      this.regionQuantizedFrameChange = regionQuantizedFrameChange;
      this.statusBarQuantizedFrameChange = statusBarQuantizedFrameChange;
      this.regionSignature = regionSignature(quantizedRegions);
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
      this.strategyContext = sensor.contextDict;
      this.strategyPriority = 0;
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
      if (this.wallSurveyDecisionFrames > 0) {
        this.wallSurveyDecisionFrames -= 1;
      }

      if (this.wallUseProbeFrames > 0) {
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
        safe = neutralAction();
        this.safetyReason = "door-opened";
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
      } else if (enemy.confidence >= COMBAT_CONFIDENCE_THRESHOLD) {
        safe = this.combatAction(safe, frame, state, enemy, faceQuantizedFrameChange);
        this.safetyReason = "combat";
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
      } else if (wallLike && !openView) {
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

      const mayFire = (effectiveTargetConfidence >= TARGET_LOCK_CONFIDENCE || enemy.fireReady) && safe.move !== "back" && !safe.use;
      if (safe.fire && mayFire) {
        this.fireCooldown = FIRE_COOLDOWN_FRAMES;
      } else {
        safe.fire = false;
        if (normalized.fire) {
          this.safetyReason = this.safetyReason === "clear" ? "fire-gated" : this.safetyReason;
        }
      }

      if (safe.move === "forward" && this.safetyReason === "clear" && !safe.fire) {
        safe = navigableView ? this.openAdvanceAction(frame) : this.wallHugAction(safe, frame, state);
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

      this.previousFrame = frame.sample?.length ? {
        sample: frame.sample.slice(0),
        quantizedSample,
        quantizedRegions,
        quantizedStatusBar,
        quantizedDepth,
        quantizedFace,
        left: frame.left || 0,
        right: frame.right || 0,
        center: frame.center || 0
      } : previous;

      return normalizeAction(safe);
    }

    applySensorFusionStrategy(action, sensor, frame, state) {
      const safe = normalizeAction(action);
      const priority = commandPriority(this.safetyReason);
      this.strategyPriority = priority;

      if (priority >= 2) {
        return this.preventUnsafeBackstep(safe, sensor, frame);
      }

      if (sensor.stuckTicks >= EMERGENCY_STUCK_TICKS) {
        this.strategyPriority = 3;
        this.safetyReason = sensor.contextDict === "open-space" ? "open-stuck-break" : "sensor-emergency";
        this.loopEscapeFrames = 0;
        this.recoveryFrames = 0;
        this.repeatTurnFrames = 0;
        return this.sensorEmergencyAction(sensor, frame);
      }

      if (sensor.contextDict === "open-space" && safe.move === "back") {
        this.strategyPriority = 2;
        this.safetyReason = "open-view-forward-guard";
        return this.openAdvanceAction(frame);
      }

      if ((sensor.contextDict === "wall" || sensor.contextDict === "corridor") && safe.move === "forward" && !safe.fire && !safe.use) {
        const side = sensor.wallVector >= 0 ? "left" : "right";
        this.strategyPriority = Math.max(this.strategyPriority, 1);
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

    wallUseProbeAction() {
      const aiming = this.wallUseProbeFrames > WALL_USE_PROBE_FRAMES - WALL_USE_AIM_FRAMES;
      const forceUse = this.wallUseProbeFrames <= WALL_USE_PROBE_FRAMES - WALL_USE_AIM_FRAMES - WALL_USE_APPROACH_FRAMES;
      const closeEnough = this.depthEstimate <= DOOR_USE_DEPTH_THRESHOLD;
      const approaching = !aiming && !closeEnough && !forceUse;
      this.mobilityMode = `door-probe-${this.wallUseProbeStage}`;
      return normalizeAction({
        move: approaching ? "forward" : "none",
        turn: aiming ? this.wallUseProbeTurn : "none",
        fire: false,
        strafe: false,
        use: !aiming && (closeEnough || forceUse),
        run: false
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
      const centered = enemy.centered || enemy.turn === "none";
      const closeEnough = enemy.distance <= COMBAT_CLOSE_DEPTH_THRESHOLD;
      const stableEnough = faceDelta <= COMBAT_FACE_DANGER_DELTA || enemy.confidence >= COMBAT_FIRE_CONFIDENCE + 0.12;
      const burstFrame = ((state?.frame || 0) % 3) === 0;
      const fire = enemy.confidence >= COMBAT_FIRE_CONFIDENCE && centered && closeEnough && stableEnough && burstFrame;

      this.enemyFireReady = fire;
      this.mobilityMode = fire ? "combat-fire" : "combat-aim";
      return normalizeAction(Object.assign({}, action, {
        move: fire || closeEnough ? "none" : "forward",
        turn: enemy.turn,
        fire,
        strafe: !centered,
        use: false,
        run: false
      }));
    }

    wallHugAction(action, frame, state) {
      this.wallHugSide = chooseWallHugSide(frame, this.wallHugSide);
      const awaySide = oppositeTurn(this.wallHugSide);
      return this.strafeRunAction(action, state, awaySide, `wall-away-${awaySide}`);
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
        depthSample: [],
        statusSample: [],
        faceSample: [],
        faceAverage: 0,
        statusBarAverage: 0,
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
    const enemyRegionTotals = new Array(REGION_COLUMNS * REGION_ROWS).fill(0);
    const enemyRegionCounts = new Array(REGION_COLUMNS * REGION_ROWS).fill(0);
    const enemyClusterTotals = new Map();
    const depthTotals = new Array(DEPTH_BANDS).fill(0);
    const depthCounts = new Array(DEPTH_BANDS).fill(0);
    const statusSample = [];
    const faceSample = [];
    let left = 0;
    let center = 0;
    let right = 0;
    let topCenter = 0;
    let lowerCenter = 0;
    let centerContrast = 0;
    let statusTotal = 0;
    let faceTotal = 0;
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
        const regionColumn = Math.min(REGION_COLUMNS - 1, Math.floor(column * REGION_COLUMNS / SAMPLE_COLUMNS));
        const regionRow = Math.min(REGION_ROWS - 1, Math.floor(row * REGION_ROWS / SAMPLE_ROWS));
        const regionIndex = regionRow * REGION_COLUMNS + regionColumn;
        regionTotals[regionIndex] += value;
        regionCounts[regionIndex] += 1;
        const enemyScore = scoreEnemyPaletteIndex(value, rgbaBytes);
        enemyRegionTotals[regionIndex] += enemyScore.score;
        enemyRegionCounts[regionIndex] += 1;
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
    const enemyRegionSample = enemyRegionTotals.map((total, index) => enemyRegionCounts[index] ? round2(total / enemyRegionCounts[index]) : 0);
    const enemy = summarizeEnemyRegions(enemyRegionSample, enemyClusterTotals, estimateDepthDistance(depthTotals.map((total, index) => depthCounts[index] ? Math.round(total / depthCounts[index]) : 0)));
    const depthSample = depthTotals.map((total, index) => depthCounts[index] ? Math.round(total / depthCounts[index]) : 0);
    const depthEstimate = estimateDepthDistance(depthSample);
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
      depthSample,
      depthEstimate,
      statusSample,
      faceSample,
      faceAverage: faceSample.length ? Math.round(faceTotal / faceSample.length) : 0,
      statusBarAverage: statusSample.length ? Math.round(statusTotal / statusSample.length) : 0,
      enemyRegionSample,
      enemyConfidence: enemy.confidence,
      enemyTurn: enemy.turn,
      enemyCentered: enemy.centered,
      enemyCluster: enemy.cluster,
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

  function summarizeEnemyRegions(enemyRegionSample, clusterTotals, depthEstimate) {
    if (!enemyRegionSample?.length) {
      return {
        confidence: 0,
        turn: "none",
        centered: false,
        distance: Number(depthEstimate ?? 1),
        cluster: "none",
        fireReady: false
      };
    }

    const left = ((enemyRegionSample[0] || 0) + (enemyRegionSample[3] || 0)) * 0.5;
    const center = ((enemyRegionSample[1] || 0) + (enemyRegionSample[4] || 0)) * 0.56;
    const right = ((enemyRegionSample[2] || 0) + (enemyRegionSample[5] || 0)) * 0.5;
    let confidence = round2(clamp01(Math.max(left, center, right)));
    const centered = center >= Math.max(left, right) * 0.9;
    const turn = centered ? "none" : (left > right ? "left" : "right");
    let cluster = "none";
    let clusterScore = 0;
    clusterTotals?.forEach((score, name) => {
      if (score > clusterScore) {
        cluster = name;
        clusterScore = score;
      }
    });
    const distance = Number(depthEstimate ?? 1);
    if ((cluster === "brown" || cluster === "gray") && distance >= 0.86) {
      confidence = Math.min(confidence, 0.38);
    }

    return {
      confidence,
      turn,
      centered,
      distance,
      cluster,
      fireReady: confidence >= COMBAT_FIRE_CONFIDENCE && centered && distance <= COMBAT_CLOSE_DEPTH_THRESHOLD
    };
  }

  function estimateEnemyPresence(frame) {
    const distance = Number(frame.depthEstimate ?? estimateDepthDistance(frame.depthSample));
    const summarized = summarizeEnemyRegions(frame.enemyRegionSample, null, distance);
    return {
      confidence: clamp01(Number(frame.enemyConfidence ?? summarized.confidence) || 0),
      turn: frame.enemyTurn || summarized.turn || "none",
      centered: Boolean(frame.enemyCentered ?? summarized.centered),
      distance,
      cluster: frame.enemyCluster || summarized.cluster || "none",
      fireReady: Boolean(frame.enemyFireReady ?? summarized.fireReady)
    };
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
    const depthSig = clamp01(context.depthEstimate ?? frame.depthEstimate ?? estimateDepthDistance(frame.depthSample));
    const wallVector = estimateWallDirectionVector(frame);
    const stuckTicks = Math.max(
      Number(context.stuckFrames || 0),
      Number(context.quantizedStallFrames || 0)
    );
    const contextDict = resolveContextDict(context, depthSig);

    return {
      screen6Regions: normalizeScreenRegions(regions),
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
      wallVector
    };
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
