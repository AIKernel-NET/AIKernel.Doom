(function () {
  "use strict";

  const version = "20260619-pipelinepanel6";

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function labelize(value) {
    return String(value || "none")
      .replace(/[-_.]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b([a-z])/g, match => match.toUpperCase()) || "None";
  }

  function formatScore(value) {
    return clamp01(Number(value || 0)).toFixed(2);
  }

  function readObjectCaseInsensitive(source, names) {
    if (!source || typeof source !== "object") {
      return null;
    }

    for (let index = 0; index < names.length; index += 1) {
      if (source[names[index]] !== undefined && source[names[index]] !== null) {
        return source[names[index]];
      }
    }

    return null;
  }

  function readDictionaryCaseInsensitive(source, names) {
    const value = readObjectCaseInsensitive(source, names);
    return value && typeof value === "object" ? value : {};
  }

  function resolvePipelineState(autoplay) {
    return autoplay?.pipelineState || autoplay?.PipelineState || null;
  }

  function summarizeDictionary(values, limit = 3) {
    const entries = Object.entries(values || {})
      .filter(([, value]) => Number.isFinite(Number(value)))
      .sort((left, right) => Number(right[1]) - Number(left[1]))
      .slice(0, limit)
      .map(([key, value]) => `${labelize(key)}=${formatScore(value)}`);
    return entries.length > 0 ? entries.join(" ") : "none";
  }

  function summarizeLabels(values, limit = 4) {
    return Array.isArray(values) && values.length > 0
      ? values.slice(0, limit).map(labelize).join(" > ")
      : "none";
  }

  function summarizeVector4(values) {
    return Array.isArray(values) && values.length >= 4
      ? `[${values.slice(0, 4).map(value => formatScore(value)).join(",")}]`
      : "none";
  }

  function readOptionalNumberCaseInsensitive(source, names) {
    const value = readObjectCaseInsensitive(source, names);
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : null;
  }

  function formatActionComponent(label, repeatFrames) {
    const frames = Math.max(0, Math.floor(Number(repeatFrames) || 0));
    return label !== "none" && frames > 0 ? `${label}(${frames})` : label;
  }

  function formatPipelineAction(kinesis) {
    const move = kinesis?.moveForward || kinesis?.MoveForward
      ? "forward"
      : (kinesis?.moveBackward || kinesis?.MoveBackward ? "back" : "none");
    const turnYaw = Number(kinesis?.turnYaw ?? kinesis?.TurnYaw ?? 0);
    const turn = turnYaw > 0 ? "right" : (turnYaw < 0 ? "left" : "none");
    const actionRepeat = readOptionalNumberCaseInsensitive(kinesis, ["actionRepeatFrames", "ActionRepeatFrames"]) ?? 0;
    const moveRepeat = readOptionalNumberCaseInsensitive(kinesis, ["moveRepeatFrames", "MoveRepeatFrames"]) ?? actionRepeat;
    const turnRepeat = readOptionalNumberCaseInsensitive(kinesis, ["turnRepeatFrames", "TurnRepeatFrames"]) ?? actionRepeat;
    const flags = [];
    if (kinesis?.useKey || kinesis?.UseKey) {
      flags.push("use");
    }
    if (kinesis?.attackKey || kinesis?.AttackKey) {
      flags.push("fire");
    }

    return `${formatActionComponent(move, moveRepeat)}/${formatActionComponent(turn, turnRepeat)}${flags.length ? `/${flags.join("/")}` : ""}`;
  }

  function formatFourLayerPipelineState(pipeline, autoplay, options = {}) {
    const aisthesis = readObjectCaseInsensitive(pipeline, ["aisthesis", "Aisthesis"]) || {};
    const noesis = readObjectCaseInsensitive(pipeline, ["noesis", "Noesis"]) || {};
    const krisis = readObjectCaseInsensitive(pipeline, ["krisis", "Krisis"]) || {};
    const kinesis = readObjectCaseInsensitive(pipeline, ["kinesis", "Kinesis"]) || {};
    const sensorReadings = readDictionaryCaseInsensitive(aisthesis, ["sensorReadings", "SensorReadings"]);
    const routePlan = readObjectCaseInsensitive(aisthesis, ["routePlan", "RoutePlan"]) || {};
    const events = readDictionaryCaseInsensitive(noesis, ["phainesisEvents", "PhainesisEvents"]);
    const eventLabels = readObjectCaseInsensitive(noesis, ["eventLabels", "EventLabels"]) || [];
    const meaningVector4 = readObjectCaseInsensitive(noesis, ["meaningVector4", "MeaningVector4"]) || [];
    const vectors = readDictionaryCaseInsensitive(noesis, ["nousVectors", "NousVectors"]);
    const toposVectors = readDictionaryCaseInsensitive(krisis, ["toposVectors", "ToposVectors"]);
    const toposLabels = readObjectCaseInsensitive(krisis, ["toposLabels", "ToposLabels"]) || [];
    const kairos = readObjectCaseInsensitive(krisis, ["kairos", "Kairos"]) || {};
    const axis = String(kairos.selectedAxis || kairos.SelectedAxis || "logos").toUpperCase();
    const zoe = readObjectCaseInsensitive(kinesis, ["zoe", "Zoe"]) || {};
    const routeEvidence = routePlan.firstDoorRouteEvidence ?? routePlan.FirstDoorRouteEvidence ?? autoplay?.spawnCorridorGapScore ?? 0;
    const routeReady = routePlan.firstDoorRouteEvidenceReady ?? routePlan.FirstDoorRouteEvidenceReady ?? false;
    const routeName = routePlan.currentRoute || routePlan.CurrentRoute || autoplay?.autoplayState?.currentRoute || "unknown";
    const routeConfidence = routePlan.routeConfidence ?? routePlan.RouteConfidence ?? autoplay?.routeConfidence ?? 0;
    const recommendedYaw = routePlan.recommendedYaw ?? routePlan.RecommendedYaw ?? autoplay?.recommendedYaw ?? 0;
    const routeActionHint = routePlan.routeActionHint || routePlan.RouteActionHint || autoplay?.routeActionHint || "none";
    const routeMode = routePlan.routeMode || routePlan.RouteMode || autoplay?.debugRouteValues?.routeMode || autoplay?.routeMode || autoplay?.autoplayState?.routeMode || "spawn-approach";
    const routeLoopKind = routePlan.routeLoopKind || routePlan.RouteLoopKind || autoplay?.debugRouteValues?.routeLoopKind || autoplay?.autoplayState?.routeLoopKind || "none";
    const routeLoopExceeded = Boolean(routePlan.routeLoopBudgetExceeded || routePlan.RouteLoopBudgetExceeded || autoplay?.debugRouteValues?.routeLoopBudgetExceeded || autoplay?.autoplayState?.routeLoopBudgetExceeded);
    const routeLoopUsed = Math.max(
      Number(routePlan.routePivotUsed ?? routePlan.RoutePivotUsed ?? autoplay?.debugRouteValues?.routePivotUsed ?? 0),
      Number(routePlan.routeSlideUsed ?? routePlan.RouteSlideUsed ?? autoplay?.debugRouteValues?.routeSlideUsed ?? 0),
      Number(routePlan.routeBackoffUsed ?? routePlan.RouteBackoffUsed ?? autoplay?.debugRouteValues?.routeBackoffUsed ?? 0));
    const routeLoopBudget = Math.max(
      Number(routePlan.routePivotBudget ?? routePlan.RoutePivotBudget ?? autoplay?.debugRouteValues?.routePivotBudget ?? 0),
      Number(routePlan.routeSlideBudget ?? routePlan.RouteSlideBudget ?? autoplay?.debugRouteValues?.routeSlideBudget ?? 0),
      Number(routePlan.routeBackoffBudget ?? routePlan.RouteBackoffBudget ?? autoplay?.debugRouteValues?.routeBackoffBudget ?? 0));
    const routeLoopText = routeLoopKind !== "none" || routeLoopExceeded
      ? `${labelize(routeLoopKind)}${routeLoopExceeded ? "!" : ""} ${Math.round(routeLoopUsed)}/${Math.round(routeLoopBudget)}`
      : "none";
    const useProbeConfidence = routePlan.useProbeConfidence ?? routePlan.UseProbeConfidence ?? autoplay?.useProbeConfidence ?? 0;
    const zoeVetoed = zoe.vetoed ?? zoe.Vetoed;
    const zoeRisk = zoe.lethalRisk ?? zoe.LethalRisk;
    const zoeReason = zoe.lastReason || zoe.LastReason || "none";
    const zoeThreshold = zoe.healthThreshold ?? zoe.HealthThreshold ?? 10;
    const zoeOverride = zoe.overrideAction || zoe.OverrideAction || "none";
    const simple = [
      "[Aisthesis]",
      `  Sensors: ${summarizeDictionary(sensorReadings)}`,
      `  Route: ${labelize(routeName)} mode=${labelize(routeMode)} conf=${formatScore(routeConfidence)} yaw=${Number(recommendedYaw) || 0}`,
      `  Loop: ${routeLoopText}`,
      `  Hint: ${labelize(routeActionHint)} useProbe=${formatScore(useProbeConfidence)}`,
      `  FirstDoor: evidence=${formatScore(routeEvidence)} ready=${routeReady ? "yes" : "no"}`,
      "",
      "[Noesis]",
      `  Labels: ${summarizeLabels(eventLabels)}`,
      `  Events: ${summarizeDictionary(events)}`,
      `  Vector4: ${summarizeVector4(meaningVector4)}`,
      `  Vectors: ${summarizeDictionary(vectors)}`,
      "",
      "[Krisis]",
      `  Kairos: Axis ${axis} L=${formatScore(kairos.logos ?? kairos.Logos)} P=${formatScore(kairos.pathos ?? kairos.Pathos)} E=${formatScore(kairos.ethos ?? kairos.Ethos)}`,
      `  Topos Labels: ${summarizeLabels(toposLabels)}`,
      `  Topos: ${summarizeDictionary(toposVectors)}`,
      "",
      "[Kinesis]",
      `  Action: ${formatPipelineAction(kinesis)}`,
      `  Zoe: ${zoeVetoed ? "veto" : "clear"} risk=${formatScore(zoeRisk)} threshold=${zoeThreshold}`,
      `  Zoe detail: reason=${labelize(zoeReason)} override=${labelize(zoeOverride)}`
    ];
    if (!options.detail) {
      return simple.join("\n");
    }

    return [
      ...simple,
      "",
      "[DTO]",
      `  Goal: ${(autoplay.goalState || autoplay.autoplayState?.goalState)?.telos || resolveTelosObjective(autoplay)}`,
      `  Route: ${(autoplay.autoplayState || {}).currentRoute || "unknown"} / ${routeMode}`,
      `  Loop: ${routeLoopText}`,
      `  Landmark: ${(autoplay.autoplayState || {}).currentLandmark || "none"}`
    ].join("\n");
  }

  function resolveKairosAxisPacket(autoplay) {
    const direct = autoplay?.kairosPriorityAxis || autoplay?.KairosPriorityAxis || null;
    if (direct) {
      return direct;
    }

    const pipeline = resolvePipelineState(autoplay);
    const krisis = readObjectCaseInsensitive(pipeline, ["krisis", "Krisis"]);
    return readObjectCaseInsensitive(krisis, ["kairos", "Kairos"]);
  }

  function axisValue(packet, lower, upper) {
    return clamp01(packet?.[lower] ?? packet?.[upper] ?? 0);
  }

  function arrowFromDegrees(value) {
    const heading = ((Number(value) % 360) + 360) % 360;
    if (heading >= 337.5 || heading < 22.5) {
      return "^";
    }
    if (heading < 67.5) {
      return "^>";
    }
    if (heading < 112.5) {
      return ">";
    }
    if (heading < 157.5) {
      return "v>";
    }
    if (heading < 202.5) {
      return "v";
    }
    if (heading < 247.5) {
      return "<v";
    }
    if (heading < 292.5) {
      return "<";
    }
    return "<^";
  }

  function resolveTelosObjective(autoplay) {
    const objective = autoplay?.objective || "";
    if (objective === "retry-after-death") {
      return "Recovery";
    }

    if (objective.indexOf("computer") >= 0 || objective === "reach-central-hall" || objective === "engage-front-enemy") {
      return "ComputerRoom";
    }

    if (objective.indexOf("first-door") >= 0 || objective.indexOf("corridor") >= 0) {
      return "FirstDoor";
    }

    if (objective === "level-clear" || objective === "press-exit-switch") {
      return "Exit";
    }

    return autoplay?.telos || autoplay?.controlPipeline || "Monitor";
  }

  function resolveObservedScores(autoplay) {
    const kairosAxis = resolveKairosAxisPacket(autoplay);
    const kairosTotal = axisValue(kairosAxis, "logos", "Logos")
      + axisValue(kairosAxis, "pathos", "Pathos")
      + axisValue(kairosAxis, "ethos", "Ethos");
    if (kairosAxis && kairosTotal > 0.01) {
      const logos = axisValue(kairosAxis, "logos", "Logos");
      const pathos = axisValue(kairosAxis, "pathos", "Pathos");
      const ethos = axisValue(kairosAxis, "ethos", "Ethos");
      const total = Math.max(0.0001, logos + pathos + ethos);
      const selectedAxis = String(kairosAxis.selectedAxis || kairosAxis.SelectedAxis || "").trim().toUpperCase();
      const dominant = selectedAxis === "PATHOS" || selectedAxis === "ETHOS" || selectedAxis === "LOGOS"
        ? selectedAxis
        : (pathos >= Math.max(logos, ethos) ? "PATHOS" : (ethos >= Math.max(logos, pathos) ? "ETHOS" : "LOGOS"));
      return {
        logos,
        pathos,
        ethos,
        dominant,
        headingRel: logos,
        routeEvidence: logos,
        danger: pathos,
        stuck: pathos,
        dangerKind: pathos > 0.18 ? "kairos" : "none",
        weights: {
          logos: logos / total,
          pathos: pathos / total,
          ethos: ethos / total
        }
      };
    }

    const carrierScores = autoplay.ctgObservedScores || autoplay.ctgCarrier?.observedScores;
    const carrierScoreTotal = Number(carrierScores?.logos || 0)
      + Number(carrierScores?.pathos || 0)
      + Number(carrierScores?.ethos || 0);
    if (carrierScores && carrierScoreTotal > 0.01) {
      return carrierScores;
    }

    const milestones = autoplay?.milestones || {};
    const compass = autoplay?.compassSensor || {};
    const headingConfidence = clamp01(Number(compass.confidence || 0));
    const headingRel = compass.headingUsable === false || compass.headingUncertain
      ? Math.min(headingConfidence, 0.34)
      : Math.max(
        headingConfidence,
        compass.headingReliability === "absolute-landmark" || compass.headingReliability === "absolute-forced-landmark" ? 0.82 : 0.48);
    const routeEvidence = Math.max(
      Number(milestones.firstDoorVision9x9Score || 0),
      Number(milestones.firstDoorCorridorSignature || 0),
      Number(milestones.computerRoomScore || 0),
      Number(milestones.computerPanelScore || 0),
      Number(milestones.spawnCorridorGapScore || 0),
      Number(milestones.spawnLandmarkRouteEvidence || autoplay.spawnLandmarkRouteEvidence || 0));
    const logos = clamp01((headingRel * 0.46) + (routeEvidence * 0.42) + (autoplay.controlPipeline ? 0.12 : 0));
    const projectile = Number(autoplay.projectileScore || autoplay.phantasiaSnapshot?.projectileScore || 0);
    const enemy = Number(autoplay.enemyConfidence || 0);
    const dynamicObject = Number(autoplay.phantasiaSnapshot?.dynamicObjectScore || autoplay.dynamicObjectScore || 0);
    const health = autoplay.healthLikelyDead || autoplay.healthSensor?.retryRequested ? 1 : 0;
    const danger = clamp01(Math.max(projectile, enemy, dynamicObject, health));
    const footBounce = Number(autoplay.footObstacleBounceFrames || 0) >= 3
      ? Number(autoplay.footObstacleFlickerScore || 0)
      : 0;
    const stuck = clamp01(Math.max(Number(autoplay.motionStallScore || 0), Number(autoplay.stuckFrames || 0) / 12, footBounce));
    const pathos = clamp01(Math.max(danger, stuck));
    const ethos = clamp01((resolveTelosObjective(autoplay) === "Recovery" ? 1 : 0.38)
      + (autoplay.retryDispatch?.active ? 0.32 : 0)
      + ((milestones.doorOpened || 0) > 0 || milestones.computerRoomEntered ? 0.18 : 0));
    const total = Math.max(0.0001, logos + pathos + ethos);
    const dangerKind = health > 0
      ? "health"
      : (projectile >= Math.max(enemy, dynamicObject) && projectile > 0.18
        ? "projectile"
        : (enemy >= Math.max(dynamicObject, 0.18) ? "enemy" : (dynamicObject > 0.18 ? "dynamic" : "none")));
    return {
      logos,
      pathos,
      ethos,
      headingRel,
      routeEvidence,
      danger,
      stuck,
      dangerKind,
      weights: {
        logos: logos / total,
        pathos: pathos / total,
        ethos: ethos / total
      }
    };
  }

  function resolveVector(autoplay, turn, move) {
    const spatial = autoplay?.spatialSensor || autoplay?.spatialSnapshot || {};
    const fused = Number(spatial.fusedDirection);
    if (Number.isFinite(fused)) {
      return `${arrowFromDegrees(fused)} ${Math.round(((fused % 360) + 360) % 360)}deg`;
    }

    if (turn === "left") {
      return "<";
    }
    if (turn === "right") {
      return ">";
    }
    if (move === "forward" || String(move).indexOf("forward") >= 0) {
      return "^";
    }
    if (move === "back" || String(move).indexOf("back") >= 0) {
      return "v";
    }

    return "-";
  }

  function resolveDecision(autoplay, scores) {
    const carrier = autoplay.toposDecisionCarrier || autoplay.ctgCarrier?.toposDecision || {};
    const carrierVector = carrier?.decisionVector || null;
    if (carrierVector) {
      const x = Number(carrierVector.x || 0);
      const y = Number(carrierVector.y || 0);
      const observedAction = autoplay?.action || autoplay?.currentAction || autoplay?.lastAction || {};
      const hasObservedAction = Boolean(
        observedAction.move && observedAction.move !== "none"
        || observedAction.turn && observedAction.turn !== "none"
        || observedAction.use
        || observedAction.fire);
      const vectorMagnitude = Math.hypot(x, y);
      if (vectorMagnitude > 0.05 || !hasObservedAction) {
        return {
          dominant: carrier.dominantAxis || scores.dominant || "LOGOS",
          confidence: Number(carrier.confidence || Math.max(scores.logos, scores.pathos, scores.ethos)),
          vector: `${carrierVector.arrow || resolveVector(autoplay, carrierVector.turn, carrierVector.move)} x=${x.toFixed(2)} y=${y.toFixed(2)}`,
          source: labelize(carrier.source || "vector-superposition"),
          feedback: carrier.feedbackApplied ? labelize(carrier.feedbackReason || "applied") : "observed"
        };
      }
    }

    const dominant = scores.pathos >= Math.max(scores.logos, scores.ethos)
      ? "PATHOS"
      : (scores.ethos >= Math.max(scores.logos, scores.pathos) ? "ETHOS" : "LOGOS");
    const confidence = clamp01(Math.max(scores.logos, scores.pathos, scores.ethos));
    const observedAction = autoplay?.action || autoplay?.currentAction || autoplay?.lastAction || {};
    const turn = observedAction.turn || autoplay?.wallUseProbeTurn || autoplay?.enemyTurn || "none";
    const move = observedAction.move || autoplay?.mobilityMode || "none";
    const source = autoplay?.safetyReason && autoplay.safetyReason !== "none"
      ? labelize(autoplay.safetyReason)
      : labelize(autoplay?.controlPipeline || autoplay?.strategyName || "Observed");
    return {
      dominant,
      confidence,
      vector: resolveVector(autoplay, turn, move),
      source,
      feedback: "observed"
    };
  }

  function resolveTopos(autoplay) {
    const milestones = autoplay?.milestones || {};
    const debugRoute = autoplay?.debugRouteValues || {};
    const target = resolveTelosObjective(autoplay);
    const phase = labelize(autoplay?.controlPipeline || autoplay?.semanticMemory?.phase || "Unknown");
    const depth = Number(autoplay?.depthEstimate ?? autoplay?.spatialSnapshot?.confidence ?? NaN);
    const distance = Number.isFinite(depth) ? `depth=${depth.toFixed(2)}` : "unknown";
    const corridor = Boolean(
      milestones.firstDoorCorridorLocated
      || milestones.spawnCorridorGapFrames
      || debugRoute.spawnCorridorGapScore > 0.32
      || autoplay?.compassSensor?.headingReliability === "corridor-ambiguous");
    let routeKind = autoplay.spawnLandmarkRouteKind || milestones.spawnLandmarkRouteKind || "none";
    let routeEvidence = Number(autoplay.spawnLandmarkRouteEvidence || milestones.spawnLandmarkRouteEvidence || debugRoute.spawnLandmarkRouteEvidence || 0);
    const corridorGap = Number(milestones.spawnCorridorGapScore || debugRoute.spawnCorridorGapScore || 0);
    const secretDoor = Number(milestones.spawnSecretDoorScore || debugRoute.spawnSecretDoorScore || 0);
    const westStair = Number(milestones.spawnWestStairScore || debugRoute.spawnWestStairScore || 0);
    if (routeKind === "none") {
      if (corridorGap >= Math.max(0.32, routeEvidence)) {
        routeKind = "corridor-gap";
        routeEvidence = corridorGap;
      } else if (secretDoor >= Math.max(0.32, routeEvidence)) {
        routeKind = "rear-landmark-avoidance";
        routeEvidence = secretDoor;
      } else if (westStair >= Math.max(0.28, routeEvidence)) {
        routeKind = "west-stair-anchor";
        routeEvidence = westStair;
      } else if (routeEvidence >= 0.28) {
        routeKind = "landmark-route";
      } else if (debugRoute.routeTextureWallOcclusion) {
        routeKind = "texture-wall-occlusion";
        routeEvidence = Math.max(routeEvidence, Number(debugRoute.motionObstacleScore || 0));
      }
    }
    return {
      target,
      phase,
      distance,
      corridor: corridor ? "true" : "false",
      routeKind: labelize(routeKind),
      routeEvidence
    };
  }

  function resolveKairos(autoplay) {
    const axis = resolveKairosAxisPacket(autoplay);
    if (axis) {
      const selectedAxis = String(axis.selectedAxis || axis.SelectedAxis || "logos").toUpperCase();
      return {
        state: `Axis ${selectedAxis}`,
        trigger: autoplay?.contextResetReason || autoplay?.safetyReason || "kairos-priority-axis"
      };
    }

    const signal = autoplay?.kairosSignal || autoplay?.ctgCarrier?.kairos?.state || "";
    if (signal) {
      const parts = String(signal).split(":");
      return {
        state: (parts[1] || parts[0] || "Active").trim(),
        trigger: autoplay?.contextResetReason || autoplay?.safetyReason || "timing-window"
      };
    }

    if (autoplay?.topologicalTransitionBlocked) {
      return { state: "Topology Hold", trigger: "transition-matrix" };
    }
    if (autoplay?.combatContextActive) {
      return { state: "Combat Watch", trigger: "dynamic-mask" };
    }

    return { state: "Monitor", trigger: autoplay?.safetyReason || "none" };
  }

  function resolvePipelineTrace(autoplay) {
    const trace = autoplay?.pipelineTrace || {};
    if (Array.isArray(trace.stages)) {
      return trace;
    }

    const action = autoplay?.action || autoplay?.currentAction || autoplay?.lastAction || {};
    return {
      version: "doom-pipeline-trace/fallback",
      phase: autoplay?.controlPipeline || "Idle",
      objective: autoplay?.objective || "none",
      priority: Number(autoplay?.strategyPriority || autoplay?.priority || 0),
      selectedAxis: autoplay?.toposDecisionCarrier?.dominantAxis || "LOGOS",
      activeDetections: Array.isArray(autoplay?.activeDetections) ? autoplay.activeDetections : [],
      action: {
        signature: `${action.move || "none"}/${action.turn || "none"}${action.use ? "/use" : ""}${action.fire ? "/fire" : ""}`
      },
      route: [],
      stages: []
    };
  }

  function formatStageTrace(trace) {
    const stages = Array.isArray(trace?.stages) ? trace.stages : [];
    if (stages.length === 0) {
      return "  no stage trace";
    }

    return stages
      .map(stage => {
        const mark = stage.active ? "*" : "-";
        return `  ${mark} ${stage.label || labelize(stage.key)} ${formatScore(stage.score)} ${stage.signal || "idle"}`;
      })
      .join("\n");
  }

  function formatRouteTrace(trace) {
    const route = Array.isArray(trace?.route) ? trace.route : [];
    if (route.length === 0) {
      return "  no route trace";
    }

    return route
      .map(item => {
        const mark = item.complete ? "done" : (item.active ? "active" : "wait");
        return `  ${mark} ${item.label || labelize(item.key)} ${formatScore(item.score)} ${item.signal || "none"}`;
      })
      .join("\n");
  }

  function formatActivePipelineSummary(trace) {
    const stages = Array.isArray(trace?.stages) ? trace.stages : [];
    const active = stages
      .filter(stage => stage.active)
      .map(stage => stage.label || labelize(stage.key));
    return active.length > 0 ? active.join(" > ") : labelize(trace?.phase || "Idle");
  }

  function formatHeading(compass) {
    const heading = Number(compass?.heading);
    if (!Number.isFinite(heading)) {
      return "unknown";
    }

    return `${Math.round((((heading % 360) + 360) % 360) * 10) / 10}deg`;
  }

  function formatFacing(compass) {
    if (compass?.headingUsable === false || compass?.headingUncertain) {
      return "unknown";
    }

    const heading = Number(compass?.heading);
    if (!Number.isFinite(heading)) {
      return "unknown";
    }

    const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    const index = Math.round((((heading % 360) + 360) % 360) / 45) % names.length;
    return `${names[index]} rel=${formatScore(compass.confidence)}`;
  }

  function formatLandmark(compass, autoplay) {
    const kind = compass?.landmarkKind || compass?.landmarkLabel || autoplay?.signatureMatchKind || autoplay?.spawnLandmarkRouteKind || "none";
    const confidence = Number(compass?.landmarkConfidence ?? autoplay?.targetConfidence ?? autoplay?.spawnLandmarkRouteEvidence ?? 0);
    return `${labelize(kind)} (${formatScore(confidence)})`;
  }

  function formatToposHud(status, options = {}) {
    const autoplay = status?.autoplay || {};
    if (!autoplay.enabled) {
      return "[CTG]\n  idle\n\n[Topos]\n  waiting for autoplay";
    }

    const pipelineState = resolvePipelineState(autoplay);
    if (pipelineState) {
      return formatFourLayerPipelineState(pipelineState, autoplay, options);
    }

    const scores = resolveObservedScores(autoplay);
    const decision = resolveDecision(autoplay, scores);
    const topos = resolveTopos(autoplay);
    const compass = autoplay.compassSensor || {};
    const kairos = resolveKairos(autoplay);
    const trace = resolvePipelineTrace(autoplay);
    const weights = scores.weights || { logos: 0, pathos: 0, ethos: 0 };
    const simpleLines = [
      "[CTG]",
      `  Dominant: ${decision.dominant}`,
      `  Vector: ${decision.vector} (${formatScore(decision.confidence)})`,
      `  W: L=${formatScore(weights.logos)} P=${formatScore(weights.pathos)} E=${formatScore(weights.ethos)}`,
      "",
      "[Topos]",
      `  Target: ${topos.target}`,
      `  Phase: ${topos.phase}`,
      `  Route: ${topos.routeKind} (${formatScore(topos.routeEvidence)})`,
      "",
      "[Kairos]",
      `  ${kairos.state}${kairos.trigger && kairos.trigger !== "none" ? ` / ${kairos.trigger}` : ""}`,
      "",
      "[Pipeline]",
      `  ${formatActivePipelineSummary(trace)}`,
      `  Action: ${trace.action?.signature || "none"}`
    ];
    const detailLines = [
      "[CTG OBSERVED]",
      `  LOGOS: dist=${topos.distance} headingRel=${formatScore(scores.headingRel)} corridor=${topos.corridor}`,
      `  PATHOS: danger=${formatScore(scores.danger)} (${scores.dangerKind}) stuck=${formatScore(scores.stuck)}`,
      `  ETHOS: TELOS=${topos.target} Obj=${labelize(autoplay.objective || "Monitor")}`,
      `  W: L=${formatScore(weights.logos)} P=${formatScore(weights.pathos)} E=${formatScore(weights.ethos)}`,
      "",
      "[CTG DECISION CARRIER]",
      `  Vector: ${decision.vector} (${formatScore(decision.confidence)})`,
      `  Dominant: ${decision.dominant}`,
      `  Source: ${decision.source}`,
      `  Feedback: ${decision.feedback}`,
      "",
      "[Topos]",
      `  Target: ${topos.target}`,
      `  Phase: ${topos.phase}`,
      `  Distance: ${topos.distance}`,
      `  Route: ${topos.routeKind} (${formatScore(topos.routeEvidence)})`,
      "",
      "[Spatial]",
      `  Facing: ${formatFacing(compass)}`,
      `  Landmark: ${formatLandmark(compass, autoplay)}`,
      `  CorridorMode: ${topos.corridor}`,
      "",
      "[Hodos]",
      `  Heading: ${formatHeading(compass)}`,
      `  Reliability: ${String(compass.headingReliability || "unknown")}`,
      "",
      "[Kairos]",
      `  State: ${kairos.state}`,
      `  Trigger: ${kairos.trigger}`,
      "",
      "[Pipeline]",
      `  Phase: ${labelize(trace.phase || topos.phase)} / Priority: ${Number(trace.priority || 0)}`,
      `  Axis: ${trace.selectedAxis || decision.dominant}`,
      `  Action: ${trace.action?.signature || "none"}`,
      formatStageTrace(trace),
      "",
      "[Route]",
      formatRouteTrace(trace)
    ];
    return (options.detail ? detailLines : simpleLines).join("\n");
  }

  function ensureToposHud(options = {}) {
    const doomScreen = options.doomScreen || null;
    const doomScreenPanel = options.doomScreenPanel || null;
    const host = doomScreen?.parentElement || doomScreenPanel;
    if (!host) {
      return null;
    }

    if (!host.style.position) {
      host.style.position = "relative";
    }

    let node = options.node || host.querySelector?.(".doom-topos-hud") || null;
    if (!node) {
      node = document.createElement("pre");
      node.className = "doom-topos-hud";
      node.setAttribute("aria-label", "Topos and CTG observed carrier");
      node.style.cssText = "position:absolute;right:10px;top:10px;z-index:8;min-width:210px;max-width:280px;margin:0;padding:8px 10px;border:1px solid rgba(255,225,122,.48);background:rgba(10,12,8,.68);color:#ffeaa0;font:10px/1.34 ui-monospace,Consolas,monospace;text-shadow:0 1px 2px #000;white-space:pre-wrap;pointer-events:none;";
      host.appendChild(node);
    }

    node.dataset.pipelinePanelVersion = version;
    return node;
  }

  function renderToposHud(node, status, options = {}) {
    if (!node) {
      return;
    }

    node.textContent = formatToposHud(status, options);
  }

  if (self.document?.documentElement?.dataset) {
    self.document.documentElement.dataset.doomPipelinePanelVersion = version;
  }

  self.AIKernelDoomPipelinePanel = Object.freeze({
    version,
    ensureToposHud,
    formatToposHud,
    renderToposHud,
    resolveObservedScores,
    formatFourLayerPipelineState
  });
})();
