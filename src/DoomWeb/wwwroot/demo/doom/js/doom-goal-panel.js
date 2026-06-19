(function () {
  "use strict";

  const version = "20260619-goalpanel2";

  const displayLabels = Object.freeze({
    "find-corridor-to-first-door": "Find Door Corridor",
    "follow-demo-route-to-first-door": "Follow Demo Route",
    "recover-via-east-window": "East Window Recovery",
    "locate-first-door-corridor": "Lock Door Corridor",
    "enter-first-door-corridor": "Enter Door Corridor",
    "align-first-door": "Align First Door",
    "approach-first-door": "Approach First Door",
    "open-first-door": "Open First Door",
    "enter-computer-control-room": "Enter Computer Room",
    "reach-central-hall": "Reach Central Hall",
    "engage-front-enemy": "Engage Front Enemy",
    "secure-central-hall": "Secure Central Hall"
  });

  function labelize(value) {
    const key = String(value || "none");
    if (displayLabels[key]) {
      return displayLabels[key];
    }

    return key
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function resolveGoalState(autoplay) {
    return autoplay?.goalState || autoplay?.GoalState || autoplay?.autoplayState?.goalState || autoplay?.AutoplayState?.GoalState || null;
  }

  function resolvePrimaryObjective(autoplay) {
    const dto = resolveGoalState(autoplay);
    if (dto?.objective || dto?.Objective) {
      return dto.objective || dto.Objective;
    }

    const milestones = autoplay?.milestones || {};
    const objective = String(autoplay?.objective || "");
    if (!autoplay?.enabled) {
      return "Idle";
    }

    if (autoplay.healthLikelyDead || autoplay.healthSensor?.retryRequested || autoplay.retryDispatch?.active) {
      return "Recover From Death";
    }

    if (milestones.finalRoomEntered || autoplay.controlPipeline === "ExitRoom") {
      return "Reach Exit";
    }

    if (objective === "engage-front-enemy" || objective === "secure-central-hall") {
      return labelize(objective);
    }

    if (objective === "find-corridor-to-first-door"
      || objective === "follow-demo-route-to-first-door"
      || objective === "recover-via-east-window"
      || objective === "locate-first-door-corridor"
      || objective === "enter-first-door-corridor"
      || objective === "align-first-door"
      || objective === "approach-first-door"
      || objective === "open-first-door"
      || objective === "enter-computer-control-room") {
      return labelize(objective);
    }

    if (milestones.centralHallEntered || milestones.stairsEntered || milestones.computerRoomEntered || autoplay.controlPipeline === "ComputerRoom") {
      return "Navigate Control Room";
    }

    if ((milestones.doorOpened || 0) > 0 || milestones.darkZoneEntered || (milestones.computerRoomAdvanceFrames || 0) > 0) {
      return "Reach Computer Control Room";
    }

    if (milestones.firstDoorCorridorLocated || milestones.firstDoorUseAttempted || autoplay.controlPipeline === "FirstDoor") {
      return "Open First Door";
    }

    if (autoplay.controlPipeline === "OpeningHome") {
      return "Locate First Door Corridor";
    }

    return labelize(autoplay.controlPipeline || autoplay.objective || "Idle");
  }

  function resolveTelosObjective(autoplay) {
    const dto = resolveGoalState(autoplay);
    if (dto?.telos || dto?.Telos) {
      return dto.telos || dto.Telos;
    }

    const milestones = autoplay?.milestones || {};
    const objective = String(autoplay?.objective || "");
    if (!autoplay?.enabled) {
      return "Idle";
    }

    if (autoplay.healthLikelyDead || autoplay.healthSensor?.retryRequested || autoplay.retryDispatch?.active) {
      return "Recovery";
    }

    if (milestones.finalRoomEntered || autoplay.controlPipeline === "ExitRoom") {
      return "Exit";
    }

    if (milestones.centralHallEntered || milestones.stairsEntered || milestones.computerRoomEntered || autoplay.controlPipeline === "ComputerRoom") {
      return "ComputerRoom";
    }

    if ((milestones.doorOpened || 0) > 0 || milestones.darkZoneEntered || (milestones.computerRoomAdvanceFrames || 0) > 0) {
      return "ComputerRoom";
    }

    if (objective.indexOf("first-door") >= 0
      || objective.indexOf("corridor") >= 0
      || milestones.firstDoorCorridorLocated
      || milestones.firstDoorUseAttempted
      || autoplay.controlPipeline === "FirstDoor"
      || autoplay.controlPipeline === "OpeningHome"
      || String(autoplay.controlPipeline || "").indexOf("demo-spawn") >= 0) {
      return "FirstDoor";
    }

    return String(autoplay.controlPipeline || autoplay.objective || "Idle")
      .replace(/[^A-Za-z0-9]+/g, " ")
      .replace(/\b\w/g, letter => letter.toUpperCase())
      .replace(/\s+/g, "");
  }

  function resolveKairosSignal(autoplay) {
    const dto = resolveGoalState(autoplay);
    if (dto?.kairosSignal || dto?.KairosSignal) {
      return dto.kairosSignal || dto.KairosSignal;
    }

    const milestones = autoplay?.milestones || {};
    if (autoplay?.retryDispatch?.active) {
      return "Kairos: Retry";
    }

    if ((autoplay?.firstDoorUseLatchFrames || 0) > 0) {
      return `Kairos: Use Latch ${autoplay.firstDoorUseLatchFrames}`;
    }

    if ((autoplay?.wallUseProbeFrames || 0) > 0) {
      return `Kairos: Probe ${autoplay.wallUseProbeFrames}`;
    }

    if ((autoplay?.useCooldown || 0) > 0) {
      return `Kairos: Use Cooldown ${autoplay.useCooldown}`;
    }

    if ((autoplay?.combatSurveyFrames || 0) > 0) {
      return `Kairos: Combat Survey ${autoplay.combatSurveyFrames}`;
    }

    if ((autoplay?.semanticContextResetFrames || 0) > 0) {
      return `Kairos: Context Reset ${autoplay.semanticContextResetFrames}`;
    }

    if ((milestones.firstDoorTransitionFrames || 0) > 0) {
      return `Kairos: Door Transition ${milestones.firstDoorTransitionFrames}`;
    }

    if ((milestones.computerRoomAdvanceFrames || 0) > 0) {
      return `Kairos: Advance ${milestones.computerRoomAdvanceFrames}`;
    }

    const phainomenon = autoplay?.phainomenon || autoplay?.nousDetectorResult;
    if (phainomenon?.sensorRecovery?.needed) {
      return "Kairos: Recovery";
    }

    return "";
  }

  function resolveSubObjectives(autoplay) {
    const dto = resolveGoalState(autoplay);
    const dtoChips = dto?.subObjectives || dto?.SubObjectives;
    if (Array.isArray(dtoChips) && dtoChips.length > 0) {
      return dtoChips.map(item => ({
        kind: item.kind || item.Kind || "objective",
        label: item.label || item.Label || "Monitoring"
      }));
    }

    const parts = [];
    if (autoplay?.objective) {
      parts.push({ kind: "objective", label: labelize(autoplay.objective) });
    }

    if (autoplay?.safetyReason && !["none", "clear"].includes(autoplay.safetyReason)) {
      parts.push({ kind: "safety", label: labelize(autoplay.safetyReason) });
    }

    if (autoplay?.mobilityMode && !["none", "idle"].includes(autoplay.mobilityMode)) {
      parts.push({ kind: "motion", label: labelize(autoplay.mobilityMode) });
    }

    const kairos = resolveKairosSignal(autoplay);
    if (kairos) {
      parts.push({ kind: "kairos", label: kairos });
    }

    const detections = Array.isArray(autoplay?.activeDetections) ? autoplay.activeDetections : [];
    for (let index = 0; index < Math.min(detections.length, 4); index += 1) {
      const detection = detections[index];
      if (detection && detection !== "objective") {
        parts.push({ kind: "detection", label: labelize(detection) });
      }
    }

    return parts.length ? parts : [{ kind: "monitor", label: "Monitoring" }];
  }

  function resolvePriorityPrefix(autoplay) {
    const dto = resolveGoalState(autoplay);
    const dtoAxis = String(dto?.priorityAxis || dto?.PriorityAxis || "").trim().toUpperCase();
    if (dtoAxis === "PATHOS") {
      return "P";
    }

    if (dtoAxis === "ETHOS") {
      return "E";
    }

    if (dtoAxis === "LOGOS") {
      return "L";
    }

    const carrier = autoplay?.toposDecisionCarrier || autoplay?.ctgCarrier?.toposDecision || {};
    const dominant = String(carrier.dominantAxis || "").toUpperCase();
    if (dominant === "PATHOS") {
      return "P";
    }

    if (dominant === "ETHOS") {
      return "E";
    }

    if (dominant === "LOGOS") {
      return "L";
    }

    const safety = String(autoplay?.safetyReason || "");
    const mobility = String(autoplay?.mobilityMode || "");
    if (/pathos|avoid|escape|detach|wall-follow|turn-away/i.test(safety) || /pathos|avoid|escape|detach|wall-follow/i.test(mobility)) {
      return "P";
    }

    if (/ethos|goal|objective|advance|route|computer|bridge/i.test(safety) || /ethos|goal|objective|advance|route|computer|bridge/i.test(mobility)) {
      return "E";
    }

    return "L";
  }

  function resolvePriorityAction(autoplay) {
    const dto = resolveGoalState(autoplay);
    if (dto?.priority || dto?.Priority) {
      return dto.priority || dto.Priority;
    }

    if (!autoplay?.enabled) {
      return "Idle";
    }

    const prefix = resolvePriorityPrefix(autoplay);
    const action = autoplay.currentAction || autoplay.lastAction || {};
    const safety = String(autoplay.safetyReason || "");
    const mobility = String(autoplay.mobilityMode || "");
    if (autoplay.healthLikelyDead || autoplay.healthSensor?.retryRequested || autoplay.retryDispatch?.active) {
      return "[P] Retry Now";
    }

    if (action.fire || /combat-fire|front-enemy|combat/i.test(safety) || /combat-fire|combat-aim/i.test(mobility)) {
      return "[P] Fire";
    }

    if (action.use || (autoplay.firstDoorUseLatchFrames || 0) > 0 || /use|probe/i.test(safety) || /use|probe/i.test(mobility)) {
      return `[${prefix}] ${prefix === "P" ? "Probe Safety" : "Use / Open"}`;
    }

    if (prefix === "P") {
      return "[P] Avoid Threat";
    }

    if (/survey|context-reset|relocalization/i.test(safety) || /survey/i.test(mobility)) {
      return `[${prefix}] Survey`;
    }

    if (prefix === "E") {
      return "[E] Pursue Goal";
    }

    if (/first-door|door-probe|door/i.test(mobility) || autoplay.controlPipeline === "FirstDoor") {
      return "[L] Align Door";
    }

    if (/computer|bridge|advance|corridor|transit/i.test(mobility) || autoplay.controlPipeline === "ComputerRoom") {
      return "[L] Advance Route";
    }

    const move = String(action.move || "none");
    const turn = String(action.turn || "none");
    if (move !== "none" && turn !== "none") {
      return `[L] ${labelize(move)} + Turn ${labelize(turn)}`;
    }

    if (move !== "none") {
      return `[L] ${labelize(move)}`;
    }

    if (turn !== "none") {
      return `[L] Turn ${labelize(turn)}`;
    }

    return "[L] Approach Target";
  }

  self.AIKernelDoomGoalPanel = Object.freeze({
    version,
    displayLabels,
    labelize,
    resolveGoalState,
    resolvePrimaryObjective,
    resolveTelosObjective,
    resolveSubObjectives,
    resolvePriorityPrefix,
    resolvePriorityAction,
    resolveKairosSignal
  });
})();
