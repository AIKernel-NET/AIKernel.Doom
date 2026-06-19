(function () {
  "use strict";

  const version = "20260619-runtimeformat2";

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function fixed(value, digits = 2, fallback = 0) {
    return number(value, fallback).toFixed(digits);
  }

  function bool(value) {
    return Boolean(value);
  }

  function htmlEscape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stageEvaluationsText(autoplay) {
    return Array.isArray(autoplay.stageEvaluations) && autoplay.stageEvaluations.length > 0
      ? autoplay.stageEvaluations
        .slice(0, 5)
        .map(item => `${item.stageId || "?"}:${item.conditionMatched ? "T" : "f"}/${item.evidenceMatched ? "E" : "e"}`)
        .join(",")
      : "none";
  }

  function routeDebugText(autoplay) {
    const debugRoute = autoplay.debugRouteValues || {};
    const routeTextureText = debugRoute.routeTextureWallOcclusion ? "/tex!" : "";
    const routeEastText = debugRoute.eastWindowRecoverAnchor ? "/east!" : "";
    const routeMode = debugRoute.routeMode || autoplay.routeMode || autoplay.autoplayState?.routeMode || "";
    const routeModeText = routeMode ? `/mode=${routeMode}` : "";
    const loopKind = debugRoute.routeLoopKind || autoplay.routeLoopKind || autoplay.autoplayState?.routeLoopKind || "none";
    const loopExceeded = Boolean(debugRoute.routeLoopBudgetExceeded || autoplay.routeLoopBudgetExceeded || autoplay.autoplayState?.routeLoopBudgetExceeded);
    const loopUsed = Math.max(
      number(debugRoute.routePivotUsed),
      number(debugRoute.routeSlideUsed),
      number(debugRoute.routeBackoffUsed));
    const loopBudget = Math.max(
      number(debugRoute.routePivotBudget),
      number(debugRoute.routeSlideBudget),
      number(debugRoute.routeBackoffBudget));
    const loopText = loopKind !== "none" || loopExceeded
      ? `/loop=${loopKind}${loopExceeded ? "!" : ""}:${Math.round(loopUsed)}/${Math.round(loopBudget)}`
      : "";
    return `ctx=${debugRoute.context || "?"}${routeModeText}` +
      `/d${fixed(debugRoute.depthSig)}` +
      `/foot${fixed(debugRoute.footObstacleScore)}${debugRoute.routeFootObstacle ? "!" : ""}` +
      `/mo${fixed(debugRoute.motionObstacleScore)}${routeTextureText}${routeEastText}` +
      `/gap${fixed(debugRoute.spawnCorridorGapScore)}` +
      `/sec${fixed(debugRoute.spawnSecretDoorScore)}` +
      `/lm${fixed(debugRoute.spawnLandmarkRouteEvidence)}${loopText}`;
  }

  function milestonesText(status, autoplay) {
    const milestones = autoplay.milestones || {};
    const mapText = `map=${milestones.mapSectorId || "unknown"}/${milestones.mapDoorSectorMatch ? "door" : "-"}${milestones.mapDarkSectorMatch ? "+dark" : ""}${milestones.mapEnemyZoneMatch ? "+enemy" : ""}`;
    const alertText = `alert=${milestones.enemyAlertFrames || 0}/${milestones.enemyAlertTurn || "none"}/${milestones.enemyAlertCluster || "none"}/${fixed(milestones.enemyAlertDepth, 2, 1)}/${fixed(milestones.enemyAlertPeakConfidence)}`;
    const progressText = `hall=${milestones.centralHallEntered ? "yes" : "no"}/${milestones.centralHallFrames || 0}; stairs=${milestones.stairsEntered ? "yes" : "no"}/${milestones.stairsCandidateFrames || 0}; final=${milestones.finalRoomEntered ? "yes" : "no"}/${milestones.finalRoomCandidateFrames || 0}`;
    const routeText = `blue=${fixed(milestones.blueFloorScore)}; court=${fixed(milestones.courtyardScore)}/${milestones.courtyardTurn || "none"}/${milestones.courtyardRescueMode || "none"}/${milestones.courtyardRescueFrames || 0}; secret=${fixed(milestones.spawnSecretDoorScore)}/${milestones.spawnSecretDoorTurn || "none"}; stair=${fixed(milestones.spawnWestStairScore)}/${milestones.spawnWestStairTurn || "none"}; gap=${fixed(milestones.spawnCorridorGapScore)}/${milestones.spawnCorridorGapTurn || "none"}/${milestones.spawnCorridorGapFrames || 0}/yaw${number(autoplay.routeFallbackYaw).toFixed(0)}/${autoplay.spawnCorridorGapActionTurn || "none"}; bridge=${fixed(milestones.bridgeBrownScore)}/${fixed(milestones.bridgeGreenLeft)}-${fixed(milestones.bridgeGreenCenter)}-${fixed(milestones.bridgeGreenRight)}/${milestones.bridgeLaneTurn || "none"}/door${fixed(milestones.bridgeDoorScore)}; corridor=${milestones.firstDoorCorridorLocated ? "yes" : "no"}/${milestones.firstDoorCorridorFrames || 0}/${fixed(milestones.firstDoorCorridorSignature)}/v9${fixed(milestones.firstDoorVision9x9Score)}/r${fixed(milestones.firstDoorVision9x9RedScore)}; deadEnd=${milestones.firstDoorDeadEndTurnFrames || 0}; useSeen=${bool(milestones.firstDoorUseAttempted)}/${fixed(milestones.firstDoorUseSignature)}/3x3${fixed(milestones.firstDoorUse3x3Score)}/${milestones.firstDoorUse3x3Turn || "none"}`;
    const computerText = `computer=${milestones.computerRoomEntered ? "yes" : "no"}/${milestones.computerRoomFrames || 0}/${fixed(milestones.computerRoomScore)}/${fixed(milestones.computerBlueScore)}/${fixed(milestones.computerRedLightScore)}/${fixed(milestones.computerDarkPanelScore)}/${fixed(milestones.computerPanelScore)}`;
    return `door=${milestones.doorOpened || 0}; dark=${milestones.darkZoneEntered ? "yes" : "no"}/${milestones.darkZoneFrames || 0}; darkArea=${fixed(milestones.darkAreaScore)}; luma=${fixed(milestones.gameplayLuma, 1)}; ${computerText}; ${routeText}; ${mapText}; ${progressText}; enemy=${milestones.enemyDefeated || 0}; ${alertText}; bursts=${milestones.combatFireFrames || 0}; peak=${fixed(milestones.enemyConfidencePeak)}; drop=${milestones.enemyDropFrames || 0}`;
  }

  function formatAutoplayText(status) {
    const autoplay = status.autoplay || {};
    const semantic = autoplay.semanticMemory || {};
    const pipelineText = autoplay.controlPipeline || "Idle";
    const objectiveText = autoplay.objective || "none";
    const targetConfidence = fixed(autoplay.targetConfidence);
    const signatureDistance = fixed(autoplay.signatureMatchDistance, 2, 255);
    const signatureText = `${autoplay.signatureMatchKind || "none"}/${signatureDistance}`;
    const dictionaryText = `${autoplay.wallSignatureCount || 0}/${autoplay.cornerSignatureCount || 0}/${autoplay.depthSignatureCount || 0}`;
    const phainesisText = Array.isArray(autoplay.activeDetections) && autoplay.activeDetections.length > 0 ? autoplay.activeDetections.join(",") : "none";
    const semanticText = `${semantic.phase || pipelineText}/${semantic.objective || objectiveText}/d${semantic.firstDoor?.doorConfidence ?? 0}/c${semantic.firstDoor?.corridorConfidence ?? 0}/b${semantic.bridge?.confidence ?? 0}/f${semantic.finalRoom?.confidence ?? 0}`;
    const strategyText = `${autoplay.strategyName || "unknown"}/${autoplay.strategyContext || "unknown"}/p${autoplay.strategyPriority || 0}`;
    const enemyText = `${fixed(autoplay.enemyConfidence)}/${autoplay.enemyTurn || "none"}/${autoplay.enemyCluster || "none"}/${autoplay.enemyFireReady ? "fire" : "hold"}/${fixed(autoplay.enemyDistance, 2, 1)}/c${fixed(autoplay.enemyCenterCellConfidence)}`;
    const ammoText = `${autoplay.ammoLikelyEmpty ? "empty" : "ok"}/${autoplay.ammoSignature || "000000000000000000000"}`;
    const healthText = `${autoplay.healthLikelyDead ? "dead" : "live"}/z${fixed(autoplay.healthZeroScore)}/c${autoplay.healthActiveColumns || 0}/a${autoplay.healthActiveCells || 0}/${autoplay.healthSignature || "000000000000000000000000"}`;
    const retryDispatch = autoplay.retryDispatch || {};
    const retryText = `${retryDispatch.active ? "active" : "idle"}/${retryDispatch.cooldownFrames || 0}/${retryDispatch.reason || "none"}`;
    const movement = autoplay.movementSensor || {};
    const visualMotion = autoplay.visualMotion || {};
    const nous = autoplay.nousCarrier || {};
    const detector = autoplay.phainomenon || autoplay.nousDetectorResult || nous.cognitionHints?.phainomenon || nous.cognitionHints?.nousDetectorResult || {};
    const audioSnapshot = autoplay.auditorySnapshot || status.audio || {};
    const audioEnergy = Math.max(number(audioSnapshot.leftEnergy), number(audioSnapshot.rightEnergy));
    const audioText = `${audioSnapshot.eventDetected ? "event" : "idle"}/${audioSnapshot.eventType || "none"}/${audioEnergy.toFixed(3)}/b${number(audioSnapshot.lowEnergy).toFixed(3)}-${number(audioSnapshot.midEnergy).toFixed(3)}-${number(audioSnapshot.highEnergy).toFixed(3)}`;
    const action = autoplay.action || {};
    const actionText = `${action.move || "none"}/${action.turn || "none"}/use=${bool(action.use)}/fire=${bool(action.fire)}/run=${bool(action.run)}`;
    const visualFlowText = `${fixed(visualMotion.vectorX)}/${fixed(visualMotion.vectorY)}/m${fixed(visualMotion.magnitude)}/b${fixed(visualMotion.baseMagnitude)}/lm${autoplay.compassLandmarks || 0}`;
    const nousText = `${nous.bonsaiTernary?.aisthesis || "neutral"}/${nous.bonsaiTernary?.kinesis || "neutral"}/${nous.bonsaiTernary?.phantasia || "neutral"}`;
    const phainesisEvidenceText = `loom=${detector.looming?.active ? detector.looming.direction || "active" : "-"}; dmg=${detector.damageLocalization?.active ? detector.damageLocalization.direction || "active" : "-"}; trap=${detector.trap?.active ? detector.trap.kind || "active" : "-"}; stuck=${detector.stuck?.active ? "yes" : "no"}; ent=${detector.explorationEntropy?.high ? "high" : "ok"}; item=${detector.itemBacktrack?.suggested ? detector.itemBacktrack.targetKind || "yes" : "-"}; rec=${detector.sensorRecovery?.needed ? detector.sensorRecovery.reason || "yes" : "-"}`;
    const motionText = `${autoplay.motion9Signature || "000000000"}/${fixed(autoplay.motion9Delta, 2, 255)}/f${fixed(autoplay.motionForwardProgress)}/o${fixed(autoplay.motionObstacleScore)}/t${fixed(autoplay.motionTurnScore)}/e${fixed(autoplay.motionEntranceScore)}/s${fixed(autoplay.motionStallScore)}/${autoplay.motionIntent || "idle"}`;
    const footText = `${fixed(autoplay.footObstacleScore)}/${fixed(autoplay.priorFootObstacleScore)}/f${fixed(autoplay.footObstacleFlickerScore)}/b${autoplay.footObstacleBounceFrames || 0}/d${fixed(autoplay.footObstacleBandDelta)}`;
    const probe = `${autoplay.wallUseProbeStage || 0}:${autoplay.wallUseProbeTurn || "left"}/${autoplay.wallUseProbeFrames || 0}`;
    const detach = `${autoplay.wallDetachTurn || "left"}/${autoplay.wallDetachFrames || 0}`;
    const survey = `${autoplay.wallSurveyTurn || "left"}/${autoplay.wallSurveyFrames || 0}/${autoplay.wallSurveyDecisionFrames || 0}`;
    const mapRush = `${autoplay.mapRushCorrectionTurn || "left"}/${autoplay.mapRushCorrectionFrames || 0}/${autoplay.mapRushCorrectionBackFrames || 0}/${autoplay.mapRushCorrectionReversals || 0}`;
    const mapDoor = `${autoplay.mapDoorSweepTurn || "left"}/${autoplay.mapDoorSweepFrames || 0}`;

    return {
      pipelineText,
      objectiveText,
      text: `${autoplay.enabled ? "on" : "off"}/${autoplay.mode || "disabled"}${autoplay.manualMove ? "/manual-move" : ""}${autoplay.senseOnly ? "/sense-only" : ""}; pipeline=${pipelineText}; objective=${objectiveText}; action=${actionText}; phainesis=${phainesisText}; semantic=${semanticText}; strategy=${strategyText}; eval=${stageEvaluationsText(autoplay)}; routeDbg=${routeDebugText(autoplay)}; vision=${autoplay.vision || "none"}; zeroCopy=${bool(autoplay.zeroCopy)}; safety=${autoplay.safetyReason || "none"}; mobility=${autoplay.mobilityMode || "none"}; move=${fixed(movement.vectorX)}/${fixed(movement.vectorY)}/${fixed(movement.confidence)}; flow=${visualFlowText}; nous=${nousText}; phainesisEvidence=${phainesisEvidenceText}; wall=${autoplay.wallHugSide || "left"}; target=${targetConfidence}; enemy=${enemyText}; ammo=${ammoText}; health=${healthText}; retry=${retryText}; milestones=${milestonesText(status, autoplay)}; corner=${fixed(autoplay.cornerSignal)}; sig=${signatureText}; dict=${dictionaryText}; regions=${autoplay.regionSignature || "000000"}; regions9=${autoplay.region9Signature || "000000000"}; vision9x9=${String(autoplay.vision9x9Signature || "").slice(0, 18)}; motion9=${motionText}; foot=${footText}; depthSig=${autoplay.depthSignature || "0000"}; depth=${fixed(autoplay.depthEstimate, 2, 1)}; faceSig=${autoplay.faceSignature || "0000000000000000"}; sound=${bool(autoplay.soundCueActive)}; audio=${audioText}; stuck=${autoplay.stuckFrames || 0}; qStall=${autoplay.quantizedStallFrames || 0}; qDelta=${fixed(autoplay.quantizedFrameChange, 2, 255)}; rDelta=${fixed(autoplay.regionQuantizedFrameChange, 2, 255)}; hudDelta=${fixed(autoplay.statusBarQuantizedFrameChange, 2, 255)}; faceDelta=${fixed(autoplay.faceQuantizedFrameChange, 2, 255)}; probe=${probe}; detach=${detach}; survey=${survey}; mapRush=${mapRush}; mapDoor=${mapDoor}; suppress=${autoplay.cornerSuppressFrames || 0}; repeat=${autoplay.repeatActionFrames || 0}; kRepeat=${autoplay.actionRepeatFrames || 0}; repeatTurn=${autoplay.repeatTurnFrames || 0}; recovery=${autoplay.recoveryFrames || 0}; loopEscape=${autoplay.loopEscapeFrames || 0}; useCooldown=${autoplay.useCooldown || 0}; useLatch=${autoplay.firstDoorUseLatchFrames || 0}/${autoplay.firstDoorUsePulsed ? "pulsed" : "armed"}; predictions=${autoplay.predictions || 0}; reuse=${autoplay.reused || 0}; latency=${Math.round(number(autoplay.latencyMs))}ms`
    };
  }

  function formatRuntimeStatus(status, options = {}) {
    const fps = Number.isFinite(status?.fps) ? number(status.fps) : 0;
    const targetFps = status?.targetFps || 30;
    const workMs = Math.round(number(status?.lastFrameWorkMs));
    const yieldMs = Math.round(number(status?.uiYieldMs, 16));
    const gpuWaitMs = Math.round(number(status?.lastGpuWaitMs));
    const gpuTimeouts = status?.gpuWaitTimeouts || 0;
    const watchdogText = `watchdog=${status?.watchdogRestarts || 0}/${Math.round(number(status?.watchdogLastStallMs))}ms${status?.watchdogRestarting ? ":restarting" : ""}`;
    const autoplay = formatAutoplayText(status || {});
    const droppedFrames = options.droppedFrames || 0;
    const hudControl = status?.hudFlowControl || {};
    const text = `runtime=${status?.state}; wasm=${status?.wasmLoaded}; wad=${status?.wadLoaded}; model=${status?.modelLoaded}; input=${status?.inputReady}; actionInput=${status?.actionInputReady}; loop=${status?.loopActive}; ${watchdogText}; autoplay=${autoplay.text}; frames=${status?.frameCount || 0}; fps=${fps}/${targetFps}; work=${workMs}ms; yield=${yieldMs}ms; gpuWait=${gpuWaitMs}ms; gpuTimeouts=${gpuTimeouts}; gpu=${status?.gpuDelegate || "pending"}; framebuffer=${status?.framebuffer}`;
    return {
      text,
      html: `<strong>runtime</strong>=${htmlEscape(status?.state)}; wasm=${htmlEscape(status?.wasmLoaded)}; wad=${htmlEscape(status?.wadLoaded)}; model=${htmlEscape(status?.modelLoaded)}; input=${htmlEscape(status?.inputReady)}; actionInput=${htmlEscape(status?.actionInputReady)}; loop=${htmlEscape(status?.loopActive)}; ${htmlEscape(watchdogText)}; autoplay=${htmlEscape(autoplay.text)}; frames=${htmlEscape(status?.frameCount || 0)}; fps=${htmlEscape(fps)}/${htmlEscape(targetFps)}; work=${htmlEscape(workMs)}ms; yield=${htmlEscape(yieldMs)}ms; gpuWait=${htmlEscape(gpuWaitMs)}ms; gpuTimeouts=${htmlEscape(gpuTimeouts)}; gpu=${htmlEscape(status?.gpuDelegate || "pending")}; framebuffer=${htmlEscape(status?.framebuffer)}`,
      fpsText: `320x200 paletted framebuffer; fps=${fps}; cap=${targetFps}; yield=${yieldMs}ms; gpu=${gpuWaitMs}ms/${gpuTimeouts}; hud=${hudControl.mode || "adaptive"}/drop${droppedFrames}; auto=${status?.autoplay?.enabled ? "on" : "off"}`,
      objectiveText: autoplay.objectiveText,
      pipelineText: autoplay.pipelineText
    };
  }

  if (self.document?.documentElement?.dataset) {
    self.document.documentElement.dataset.doomRuntimeFormatVersion = version;
  }

  self.AIKernelDoomRuntimeFormat = Object.freeze({
    version,
    formatAutoplayText,
    formatRuntimeStatus,
    routeDebugText
  });
})();
