(function () {
  "use strict";

  const version = "20260621-pipelinepanel-gpu6";
  const panelRenderCache = new WeakMap();
  const thoughtGridSmoothingCache = new WeakMap();
  const panelRenderIntervalMs = 58;
  const fallbackHudPanelRects = Object.freeze({
    title: Object.freeze({ left: 0.020, top: 0.662, right: 0.985, bottom: 0.692 }),
    cards: Object.freeze({
      aisthesis: Object.freeze({ left: 0.020, top: 0.700, right: 0.255, bottom: 0.970 }),
      noesis: Object.freeze({ left: 0.270, top: 0.700, right: 0.500, bottom: 0.830 }),
      krisis: Object.freeze({ left: 0.515, top: 0.700, right: 0.745, bottom: 0.830 }),
      kinesis: Object.freeze({ left: 0.760, top: 0.700, right: 0.985, bottom: 0.830 }),
      route: Object.freeze({ left: 0.270, top: 0.845, right: 0.500, bottom: 0.970 }),
      combat: Object.freeze({ left: 0.515, top: 0.845, right: 0.745, bottom: 0.970 }),
      zoe: Object.freeze({ left: 0.760, top: 0.845, right: 0.985, bottom: 0.970 })
    })
  });

  function resolveHudPanelRects() {
    return self.AIKernelDoomGpuContracts?.hudPanelRects || fallbackHudPanelRects;
  }

  function nowMs() {
    return Number(self.performance?.now?.() ?? Date.now());
  }

  function isUrgentPanelFrame(autoplay, pipelineState) {
    const kinesis = readObjectCaseInsensitive(pipelineState || {}, ["kinesis", "Kinesis"]) || {};
    return Boolean(
      autoplay?.healthLikelyDead
      || autoplay?.retryDispatch?.active
      || autoplay?.action?.fire
      || autoplay?.currentAction?.fire
      || autoplay?.action?.use
      || autoplay?.currentAction?.use
      || kinesis.attackKey
      || kinesis.AttackKey
      || kinesis.useKey
      || kinesis.UseKey
      || isZoeVetoed(pipelineState, autoplay)
    );
  }

  function shouldSkipPanelRender(node, mode, autoplay, pipelineState, options) {
    if (options?.force || isUrgentPanelFrame(autoplay, pipelineState)) {
      return false;
    }

    const now = nowMs();
    const previous = panelRenderCache.get(node);
    if (previous && previous.mode === mode && now - previous.lastRenderAt < panelRenderIntervalMs) {
      return true;
    }

    panelRenderCache.set(node, { mode, lastRenderAt: now });
    return false;
  }

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

  function beginThoughtGridSmoothing(node) {
    const now = nowMs();
    let state = thoughtGridSmoothingCache.get(node);
    if (!state) {
      state = { values: new Map(), lastAt: now, dt: 33 };
      thoughtGridSmoothingCache.set(node, state);
      return state;
    }

    state.dt = Math.max(16, Math.min(180, now - Number(state.lastAt || now)));
    state.lastAt = now;
    return state;
  }

  function smoothThoughtGridValue(state, key, value, halfLifeMs = 240) {
    const target = Number(value);
    if (!Number.isFinite(target)) {
      return 0;
    }

    const previous = state?.values?.has(key) ? Number(state.values.get(key)) : target;
    const alpha = 1 - Math.pow(0.5, Math.max(16, Number(state?.dt || 33)) / Math.max(60, halfLifeMs));
    const next = previous + (target - previous) * Math.max(0, Math.min(1, alpha));
    state?.values?.set(key, next);
    return next;
  }

  function smoothThoughtScore(state, key, value, halfLifeMs = 240) {
    return formatScore(smoothThoughtGridValue(state, key, value, halfLifeMs));
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

  function resolveDebugOverlay(autoplay) {
    return autoplay?.debugOverlay
      || autoplay?.DebugOverlay
      || autoplay?.autoplayState?.debugOverlay
      || autoplay?.AutoplayState?.DebugOverlay
      || null;
  }

  function resolveEnemyCircle(autoplay) {
    const overlay = resolveDebugOverlay(autoplay);
    const circle = overlay?.enemyCircle || overlay?.EnemyCircle || null;
    if (!circle || typeof circle !== "object") {
      return null;
    }

    const active = Boolean(circle.active ?? circle.Active);
    const confidence = clamp01(circle.confidence ?? circle.Confidence ?? 0);
    if (!active && confidence < 0.18) {
      return null;
    }

    const type = String(circle.type || circle.Type || circle.source || circle.Source || "visual").toLowerCase();
    const yaw = Number(circle.yaw ?? circle.Yaw ?? 0);
    const direction = String(circle.direction || circle.Direction || (yaw < -2 ? "left" : (yaw > 2 ? "right" : "front")));
    return {
      type: type === "av" || type === "audio" || type === "visual" ? type : "visual",
      yaw: Number.isFinite(yaw) ? yaw : 0,
      direction,
      confidence,
      visualConfidence: clamp01(circle.visualConfidence ?? circle.VisualConfidence ?? 0),
      audioConfidence: clamp01(circle.audioConfidence ?? circle.AudioConfidence ?? 0),
      active: active || confidence >= 0.18
    };
  }

  function resolveEnemyCue(autoplay) {
    const overlay = resolveDebugOverlay(autoplay);
    const circle = resolveEnemyCircle(autoplay);
    const action = autoplay?.action || autoplay?.currentAction || {};
    const actualFiring = Boolean(action.fire);
    const firing = Boolean(actualFiring || autoplay?.enemyFireReady || autoplay?.visualEnemyFireReady);
    if (circle) {
      const typeLabel = circle.type === "av" ? "A/V" : labelize(circle.type);
      return {
        active: circle.active,
        type: circle.type,
        typeLabel,
        yaw: circle.yaw,
        direction: circle.direction,
        confidence: circle.confidence,
        visualConfidence: circle.visualConfidence,
        audioConfidence: circle.audioConfidence,
        firing,
        text: `${typeLabel}=${formatScore(circle.confidence)} yaw=${Math.round(circle.yaw)} ${firing ? "fire" : "hold"}`,
        short: `${typeLabel} ${Math.round(circle.yaw)}deg ${formatScore(circle.confidence)}`
      };
    }

    if (overlay && !actualFiring) {
      return {
        active: false,
        type: "none",
        typeLabel: "None",
        yaw: 0,
        direction: "none",
        confidence: 0,
        visualConfidence: 0,
        audioConfidence: 0,
        firing: false,
        text: "calm",
        short: "calm"
      };
    }

    const visual = clamp01(autoplay?.enemyConfidence ?? autoplay?.visualEnemyConfidence ?? 0);
    const audio = clamp01(autoplay?.audioEnemyConfidence ?? 0);
    const confidence = Math.max(visual, audio);
    const yaw = Number(autoplay?.enemyCombatYaw ?? autoplay?.visualEnemyYaw ?? 0);
    const type = audio >= 0.24 && visual >= 0.35 ? "av" : (audio >= visual ? "audio" : "visual");
    const direction = autoplay?.audioEnemyDirection || autoplay?.enemyTurn || (yaw < -2 ? "left" : (yaw > 2 ? "right" : "front"));
    return {
      active: confidence >= 0.18 || firing,
      type,
      typeLabel: type === "av" ? "A/V" : labelize(type),
      yaw: Number.isFinite(yaw) ? yaw : 0,
      direction,
      confidence,
      visualConfidence: visual,
      audioConfidence: audio,
      firing,
      text: confidence >= 0.18 || firing
        ? `vis=${formatScore(visual)} aud=${formatScore(audio)} yaw=${Math.round(Number.isFinite(yaw) ? yaw : 0)} ${firing ? "fire" : "hold"}`
        : "calm",
      short: confidence >= 0.18 || firing
        ? `${type === "av" ? "A/V" : labelize(type)} ${Math.round(Number.isFinite(yaw) ? yaw : 0)}deg ${formatScore(confidence)}`
        : "calm"
    };
  }

  function resolveZoeStateFromPipeline(pipeline) {
    const kinesis = readObjectCaseInsensitive(pipeline || {}, ["kinesis", "Kinesis"]) || {};
    return readObjectCaseInsensitive(kinesis, ["zoe", "Zoe"]) || {};
  }

  function isZoeVetoed(pipeline, autoplay) {
    const zoe = resolveZoeStateFromPipeline(pipeline);
    return Boolean(zoe.vetoed ?? zoe.Vetoed ?? autoplay?.zoeVetoed);
  }

  function isZoeWarning(pipeline, autoplay) {
    const zoe = resolveZoeStateFromPipeline(pipeline);
    const lethalRisk = Number(zoe.lethalRisk ?? zoe.LethalRisk ?? autoplay?.lethalRisk ?? 0);
    const health = Number(zoe.health ?? zoe.Health ?? autoplay?.healthEstimatedPercent ?? autoplay?.healthSensor?.value ?? 100);
    const threshold = Number(zoe.healthThreshold ?? zoe.HealthThreshold ?? 50);
    return isZoeVetoed(pipeline, autoplay)
      || Boolean(zoe.warning ?? zoe.Warning ?? zoe.lowHealth ?? zoe.LowHealth ?? zoe.criticalHealth ?? zoe.CriticalHealth)
      || lethalRisk >= 0.50
      || (Number.isFinite(health) && health > 0 && health < threshold);
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

  function formatSigned(value) {
    const numeric = Number(value || 0);
    return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
  }

  function summarizeTopology(topology) {
    if (!topology || typeof topology !== "object") {
      return "none";
    }

    const wall = topology.wallDistanceNormalized ?? topology.WallDistanceNormalized ?? 1;
    const centerX = topology.centerlineDirectionX ?? topology.CenterlineDirectionX ?? 0;
    const centerY = topology.centerlineDirectionY ?? topology.CenterlineDirectionY ?? 0;
    const barrel = topology.barrelZoneEvidence ?? topology.BarrelZoneEvidence ?? 0;
    const corridorX = topology.corridorDirectionHintX ?? topology.CorridorDirectionHintX ?? 0;
    const corridorY = topology.corridorDirectionHintY ?? topology.CorridorDirectionHintY ?? 0;
    const alignment = topology.centerCorridorAlignment ?? topology.CenterCorridorAlignment ?? ((Number(centerX) || 0) * (Number(corridorX) || 0) + (Number(centerY) || 0) * (Number(corridorY) || 0));
    const deadEnd = Boolean(topology.deadEndRisk ?? topology.DeadEndRisk);
    return `wall=${formatScore(wall)} barrel=${formatScore(barrel)} align=${formatSigned(alignment)} risk=${deadEnd ? "dead-end" : "clear"} center=(${formatSigned(centerX)},${formatScore(centerY)}) corridor=(${formatSigned(corridorX)},${formatScore(corridorY)})`;
  }

  function summarizeTopologyCompact(topology) {
    if (!topology || typeof topology !== "object") {
      return "topology=none";
    }

    const wall = topology.wallDistanceNormalized ?? topology.WallDistanceNormalized ?? 1;
    const barrel = topology.barrelZoneEvidence ?? topology.BarrelZoneEvidence ?? 0;
    const alignment = topology.centerCorridorAlignment ?? topology.CenterCorridorAlignment ?? 0;
    const deadEnd = Boolean(topology.deadEndRisk ?? topology.DeadEndRisk);
    return `wall=${formatScore(wall)} barrel=${formatScore(barrel)} align=${formatSigned(alignment)} ${deadEnd ? "dead-end" : "clear"}`;
  }

  function resolveGpuPathSummary(autoplay, status = null) {
    const resolver = self.AIKernelDoomGpuPathStatus?.resolveGpuPathStatus;
    if (typeof resolver !== "function") {
      return {
        text: "game=pending; bonsai=pending; hud=pending; sensor=pending",
        shortText: "GPU pending"
      };
    }

    const runtimeStatus = status || autoplay?.runtimeStatus || autoplay?.RuntimeStatus || {};
    return resolver(Object.assign({}, runtimeStatus, {
      autoplay,
      gpuHud: readObjectCaseInsensitive(autoplay, ["gpuHud", "GpuHud"]) || readObjectCaseInsensitive(runtimeStatus, ["gpuHud", "GpuHud"]) || null
    }));
  }

  function readOptionalNumberCaseInsensitive(source, names) {
    const value = readObjectCaseInsensitive(source, names);
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : null;
  }

  function readOptionalIntegerCaseInsensitive(source, names, minimum = 0) {
    const value = readObjectCaseInsensitive(source, names);
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(minimum, Math.floor(numeric)) : null;
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

  function formatUsePulse(kinesis) {
    const cooldown = readOptionalNumberCaseInsensitive(kinesis, ["usePulseCooldownFrames", "UsePulseCooldownFrames"]) ?? 0;
    const suppressed = readOptionalNumberCaseInsensitive(kinesis, ["usePulseSuppressedFrames", "UsePulseSuppressedFrames"]) ?? 0;
    const lastPulse = readOptionalIntegerCaseInsensitive(kinesis, ["lastUsePulsePrediction", "LastUsePulsePrediction"], -1);
    const parts = [`cd=${cooldown}`];
    if (suppressed > 0) {
      parts.push(`sup=${suppressed}`);
    }

    if (lastPulse !== null && lastPulse >= 0) {
      parts.push(`last=${lastPulse}`);
    }

    return parts.join(" ");
  }

  function readRouteLoopMetric(routePlan, debugRoute, kind, suffix) {
    const read = (name) => Number(routePlan[`route${name}${suffix}`] ?? routePlan[`Route${name}${suffix}`] ?? debugRoute?.[`route${name}${suffix}`] ?? 0);
    if (kind === "turn-stall") {
      return read("Pivot");
    }
    if (kind === "slide-stall") {
      return read("Slide");
    }
    if (kind === "corner-stall") {
      return read("Backoff");
    }
    if (kind === "advance-stall") {
      return read("Advance");
    }
    if (kind === "recover-stall") {
      return read("Recover");
    }
    if (kind === "door-approach-dead-end") {
      return read("Topology");
    }
    if (kind === "spawn-route-arc") {
      return read("Arc");
    }

    return Math.max(read("Pivot"), read("Slide"), read("Backoff"), read("Advance"), read("Recover"), read("Arc"));
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
    const topology = readObjectCaseInsensitive(noesis, ["topology", "Topology"]) || null;
    const vectors = readDictionaryCaseInsensitive(noesis, ["nousVectors", "NousVectors"]);
    const toposVectors = readDictionaryCaseInsensitive(krisis, ["toposVectors", "ToposVectors"]);
    const toposLabels = readObjectCaseInsensitive(krisis, ["toposLabels", "ToposLabels"]) || [];
    const kairos = readObjectCaseInsensitive(krisis, ["kairos", "Kairos"]) || {};
    const axis = String(kairos.selectedAxis || kairos.SelectedAxis || "logos").toUpperCase();
    const zoe = resolveZoeStateFromPipeline(pipeline);
    const routeEvidence = routePlan.firstDoorRouteEvidence ?? routePlan.FirstDoorRouteEvidence ?? autoplay?.spawnCorridorGapScore ?? 0;
    const routeReady = routePlan.firstDoorRouteEvidenceReady ?? routePlan.FirstDoorRouteEvidenceReady ?? false;
    const routeName = routePlan.currentRoute || routePlan.CurrentRoute || autoplay?.autoplayState?.currentRoute || "unknown";
    const routeConfidence = routePlan.routeConfidence ?? routePlan.RouteConfidence ?? autoplay?.routeConfidence ?? 0;
    const recommendedYaw = routePlan.recommendedYaw ?? routePlan.RecommendedYaw ?? autoplay?.recommendedYaw ?? 0;
    const routeActionHint = routePlan.routeActionHint || routePlan.RouteActionHint || autoplay?.routeActionHint || "none";
    const routeMode = routePlan.routeMode || routePlan.RouteMode || autoplay?.debugRouteValues?.routeMode || autoplay?.routeMode || autoplay?.autoplayState?.routeMode || "spawn-approach";
    const routeLoopKind = routePlan.routeLoopKind || routePlan.RouteLoopKind || autoplay?.debugRouteValues?.routeLoopKind || autoplay?.autoplayState?.routeLoopKind || "none";
    const routeLoopExceeded = Boolean(routePlan.routeLoopBudgetExceeded || routePlan.RouteLoopBudgetExceeded || autoplay?.debugRouteValues?.routeLoopBudgetExceeded || autoplay?.autoplayState?.routeLoopBudgetExceeded);
    const routeLoopUsed = readRouteLoopMetric(routePlan, autoplay?.debugRouteValues, routeLoopKind, "Used");
    const routeLoopBudget = readRouteLoopMetric(routePlan, autoplay?.debugRouteValues, routeLoopKind, "Budget");
    const routeLoopText = routeLoopKind !== "none" || routeLoopExceeded
      ? `${labelize(routeLoopKind)}${routeLoopExceeded ? "!" : ""} ${Math.round(routeLoopUsed)}/${Math.round(routeLoopBudget)}`
      : "none";
    const useProbeConfidence = routePlan.useProbeConfidence ?? routePlan.UseProbeConfidence ?? autoplay?.useProbeConfidence ?? 0;
    const routeDeadEndTrim = Boolean(routePlan.routeDeadEndTrimRequired ?? routePlan.RouteDeadEndTrimRequired ?? autoplay?.debugRouteValues?.routeDeadEndTrimRequired);
    const gpuPathSummary = resolveGpuPathSummary(autoplay, options.status);
    const gpuHudSummary = resolveGpuHudSummary(autoplay);
    const gpuAisthesisSummary = resolveGpuAisthesisSummary(autoplay);
    const gpuSpatialSummary = resolveGpuSpatialReasoningSummary(autoplay);
    const zoeVetoed = Boolean(zoe.vetoed ?? zoe.Vetoed);
    const zoeWarning = Boolean(zoe.warning ?? zoe.Warning ?? zoe.lowHealth ?? zoe.LowHealth ?? zoe.criticalHealth ?? zoe.CriticalHealth);
    const zoeRisk = zoe.lethalRisk ?? zoe.LethalRisk;
    const zoeReason = zoe.lastReason || zoe.LastReason || "none";
    const zoeThreshold = zoe.healthThreshold ?? zoe.HealthThreshold ?? 10;
    const zoeOverride = zoe.overrideAction || zoe.OverrideAction || "none";
    const zoeHealth = zoe.health ?? zoe.Health ?? autoplay?.healthEstimatedPercent ?? autoplay?.healthSensor?.value ?? 100;
    const zoeLabel = zoeVetoed ? "ZOE VETO" : (zoeWarning ? "Zoe=warn" : "Zoe=clear");
    const compact = [
      zoeVetoed ? "[CTG SIMPLE] ZOE VETO" : "[CTG SIMPLE]",
      `  [A] ${labelize(routeName)} ${formatScore(routeConfidence)} loop=${routeLoopText}${routeDeadEndTrim ? " trim" : ""} ${gpuHudSummary}`,
      `  [G] ${gpuPathSummary.shortText}`,
      `  [N] ${summarizeLabels(eventLabels, 2)} ${summarizeTopologyCompact(topology)}`,
      `  [Kr] ${axis} L=${formatScore(kairos.logos ?? kairos.Logos)} P=${formatScore(kairos.pathos ?? kairos.Pathos)} E=${formatScore(kairos.ethos ?? kairos.Ethos)}`,
      `  [Ki] ${formatPipelineAction(kinesis)} ${zoeLabel} hp=${Number.isFinite(Number(zoeHealth)) ? Math.round(Number(zoeHealth)) : 100} Use=${formatUsePulse(kinesis)}`
    ];
    const detailSections = [
      "[Aisthesis]",
      `  Sensors: ${summarizeDictionary(sensorReadings)}`,
      `  Route: ${labelize(routeName)} mode=${labelize(routeMode)} conf=${formatScore(routeConfidence)} yaw=${Number(recommendedYaw) || 0}`,
      `  Loop: ${routeLoopText}`,
      `  Hint: ${labelize(routeActionHint)} useProbe=${formatScore(useProbeConfidence)} trim=${routeDeadEndTrim ? "yes" : "no"}`,
      `  FirstDoor: evidence=${formatScore(routeEvidence)} ready=${routeReady ? "yes" : "no"}`,
      `  GPU Path: ${gpuPathSummary.text}`,
      `  GPU HUD: ${gpuHudSummary}`,
      `  GPU Aisthesis: ${gpuAisthesisSummary}`,
      `  GPU Spatial: ${gpuSpatialSummary}`,
      "",
      "[Noesis]",
      `  Labels: ${summarizeLabels(eventLabels)}`,
      `  Events: ${summarizeDictionary(events)}`,
      `  Vector4: ${summarizeVector4(meaningVector4)}`,
      `  Topology: ${summarizeTopology(topology)}`,
      `  Vectors: ${summarizeDictionary(vectors)}`,
      "",
      "[Krisis]",
      `  Kairos: Axis ${axis} L=${formatScore(kairos.logos ?? kairos.Logos)} P=${formatScore(kairos.pathos ?? kairos.Pathos)} E=${formatScore(kairos.ethos ?? kairos.Ethos)}`,
      `  Topos Labels: ${summarizeLabels(toposLabels)}`,
      `  Topos: ${summarizeDictionary(toposVectors)}`,
      "",
      "[Kinesis]",
      `  Action: ${formatPipelineAction(kinesis)}`,
      `  Use Pulse: ${formatUsePulse(kinesis)}`,
      ...(zoeVetoed ? ["  [ZOE VETO] Safe-control override active"] : (zoeWarning ? ["  [ZOE WARN] Health or risk is elevated"] : [])),
      `  Zoe: ${zoeVetoed ? "veto" : (zoeWarning ? "warn" : "clear")} hp=${Number.isFinite(Number(zoeHealth)) ? Math.round(Number(zoeHealth)) : 100} risk=${formatScore(zoeRisk)} threshold=${zoeThreshold}`,
      `  Zoe detail: reason=${labelize(zoeReason)} override=${labelize(zoeOverride)}`
    ];
    if (!options.detail) {
      return compact.join("\n");
    }

    return [
      ...detailSections,
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
    const rawAutoplay = status?.autoplay || {};
    const autoplay = Object.assign({}, rawAutoplay, {
      runtimeStatus: status || null,
      gpuHud: readObjectCaseInsensitive(rawAutoplay, ["gpuHud", "GpuHud"])
        || readObjectCaseInsensitive(status, ["gpuHud", "GpuHud"])
        || null,
      debugOverlay: readObjectCaseInsensitive(rawAutoplay, ["debugOverlay", "DebugOverlay"])
        || readObjectCaseInsensitive(status, ["debugOverlay", "DebugOverlay"])
        || null
    });
    if (!autoplay.enabled) {
      return "[CTG]\n  idle\n\n[Topos]\n  waiting for autoplay";
    }

    const pipelineState = resolvePipelineState(autoplay);
    if (pipelineState) {
      return formatFourLayerPipelineState(pipelineState, autoplay, Object.assign({ status }, options));
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
      node = document.createElement("div");
      node.className = "doom-topos-hud";
      node.setAttribute("aria-label", "Topos and CTG observed carrier");
      host.appendChild(node);
    }

    node.dataset.pipelinePanelVersion = version;
    return node;
  }

  function applyToposHudMode(node, detail) {
    node.dataset.ctgHudMode = detail ? "detail" : "simple";
    node.classList.toggle("is-detail-overlay", Boolean(detail));
    node.classList.toggle("is-simple-summary", !detail);
    if (detail) {
      const vetoed = node.classList.contains("is-zoe-veto");
      const warning = node.classList.contains("is-zoe-warning");
      const border = vetoed ? "rgba(255,73,73,.78)" : (warning ? "rgba(255,189,87,.66)" : "rgba(255,225,122,.52)");
      const background = vetoed ? "rgba(42,4,6,.26)" : (warning ? "rgba(42,28,7,.23)" : "rgba(5,7,8,.22)");
      node.style.cssText = `position:absolute;inset:10px;z-index:160;margin:0;padding:10px;border:1px solid ${border};background:${background};color:#ffeaa0;font:10px/1.34 ui-monospace,Consolas,monospace;text-shadow:0 1px 3px #000;pointer-events:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:8px;overflow:hidden;white-space:normal;box-shadow:${vetoed ? "0 0 18px rgba(255,40,40,.34),0 0 14px rgba(0,0,0,.24)" : (warning ? "0 0 16px rgba(255,180,60,.22),0 0 14px rgba(0,0,0,.20)" : "0 0 14px rgba(0,0,0,.14)")};transition:opacity .24s ease,background-color .24s ease,border-color .24s ease;`;
      return;
    }

    const vetoed = node.classList.contains("is-zoe-veto");
    const warning = node.classList.contains("is-zoe-warning");
    node.style.cssText = `position:absolute;right:10px;top:10px;z-index:160;width:232px;max-width:32vw;margin:0;padding:7px 9px;border:1px solid ${vetoed ? "rgba(255,73,73,.82)" : (warning ? "rgba(255,189,87,.58)" : "rgba(255,225,122,.34)")};background:${vetoed ? "rgba(56,5,7,.26)" : (warning ? "rgba(45,30,8,.23)" : "rgba(5,7,8,.22)")};color:${vetoed ? "#ffd2d2" : "#ffeaa0"};font:9.5px/1.48 ui-monospace,Consolas,monospace;font-weight:400;text-shadow:0 1px 3px #000;white-space:pre-wrap;pointer-events:none;overflow:hidden;box-shadow:${vetoed ? "0 0 16px rgba(255,36,36,.38)" : (warning ? "0 0 12px rgba(255,180,60,.18)" : "none")};transition:opacity .24s ease,background-color .24s ease,border-color .24s ease;`;
  }

  function splitHudSections(text) {
    const sections = [];
    let current = null;
    const lines = String(text || "").split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const match = lines[index].match(/^\[([^\]]+)\]$/);
      if (match) {
        if (current) {
          sections.push(current);
        }
        current = { title: match[1], lines: [] };
      } else if (current && lines[index].trim()) {
        current.lines.push(lines[index].replace(/^  /, ""));
      }
    }

    if (current) {
      sections.push(current);
    }

    return sections;
  }

  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function cssRect(rect) {
    if (!rect) {
      return "";
    }

    const normalized = Number(rect.right) >= Number(rect.left) && Number(rect.bottom) >= Number(rect.top);
    const left = normalized ? Number(rect.left) * 100 : Number(rect.left);
    const top = normalized ? Number(rect.top) * 100 : Number(rect.top);
    const width = normalized ? (Number(rect.right) - Number(rect.left)) * 100 : Number(rect.width);
    const height = normalized ? (Number(rect.bottom) - Number(rect.top)) * 100 : Number(rect.height);
    return [
      "position:absolute",
      `left:${left.toFixed(3)}%`,
      `top:${top.toFixed(3)}%`,
      `width:${width.toFixed(3)}%`,
      `height:${height.toFixed(3)}%`
    ].join(";");
  }

  function appendDetailCard(documentRef, node, section) {
    const card = documentRef.createElement("section");
    card.className = `doom-ctg-detail-card doom-ctg-detail-card-${String(section.title || "section").toLowerCase()}`;
    const vetoCard = section.title === "Kinesis" && section.lines.some(line => /ZOE VETO|Zoe:\s*veto/i.test(String(line || "")));
    const warningCard = !vetoCard && section.title === "Kinesis" && section.lines.some(line => /ZOE WARN|Zoe:\s*warn/i.test(String(line || "")));
    card.classList.toggle("is-zoe-veto-card", vetoCard);
    card.classList.toggle("is-zoe-warning-card", warningCard);
    card.style.cssText = `min-width:0;min-height:0;padding:7px 8px;border:1px solid ${vetoCard ? "rgba(255,73,73,.76)" : (warningCard ? "rgba(255,189,87,.62)" : "rgba(255,255,255,.16)")};background:${vetoCard ? "rgba(64,4,7,.26)" : (warningCard ? "rgba(48,32,7,.23)" : "rgba(10,14,16,.20)")};overflow:auto;box-sizing:border-box;box-shadow:${vetoCard ? "inset 0 0 0 1px rgba(255,160,160,.16),0 0 14px rgba(255,30,30,.22)" : (warningCard ? "inset 0 0 0 1px rgba(255,210,130,.12),0 0 12px rgba(255,180,60,.18)" : "none")};`;

    const title = documentRef.createElement("div");
    title.className = "doom-ctg-detail-title";
    title.textContent = section.title;
    title.style.cssText = "margin:0 0 6px;padding:0 0 4px;border-bottom:1px solid rgba(255,247,192,.30);color:#fff7c0;font:700 10px/1.2 system-ui,sans-serif;letter-spacing:0;text-transform:uppercase;";
    card.appendChild(title);

    const body = documentRef.createElement("div");
    body.className = "doom-ctg-detail-body";
    body.style.cssText = "margin:0;color:#ffeaa0;font:10px/1.34 ui-monospace,Consolas,monospace;white-space:normal;overflow-wrap:anywhere;";
    appendHighlightedLines(documentRef, body, section.lines);
    card.appendChild(body);

    node.appendChild(card);
  }

  function readCombatSummary(autoplay) {
    const cue = resolveEnemyCue(autoplay);
    if (!cue.active) {
      return "calm";
    }

    return cue.text;
  }

  function appendThoughtGridCard(documentRef, node, card) {
    const element = documentRef.createElement("section");
    element.className = `doom-thought-grid-card is-${card.key}`;
    element.dataset.hudPanel = card.key;
    const layout = resolveHudPanelRects();
    const rect = card.rect || layout.cards?.[card.key] || null;
    const aligned = Boolean(rect);
    element.style.cssText = [
      aligned ? cssRect(rect) : `grid-column:${card.column}`,
      aligned ? "" : `grid-row:${card.row}`,
      "min-width:0",
      "min-height:0",
      "display:grid",
      "grid-template-rows:auto 1fr",
      "padding:0",
      `border:${aligned ? "0" : `1px solid ${card.border || "rgba(255,255,255,.16)"}`}`,
      `background:${aligned ? "transparent" : (card.background || "rgba(0,0,0,.20)")}`,
      `border-radius:${aligned ? "0" : "4px"}`,
      "box-sizing:border-box",
      "overflow:hidden",
      `z-index:${card.zIndex || 0}`,
      aligned ? "box-shadow:none" : "box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)"
    ].filter(Boolean).join(";");

    const title = documentRef.createElement("div");
    title.textContent = card.title;
    title.style.cssText = `min-width:0;padding:${aligned ? "3px 7px 0" : "3px 5px"};border-bottom:${aligned ? "0" : "1px solid rgba(255,247,192,.14)"};background:${aligned ? "transparent" : (card.headerBackground || "rgba(255,247,192,.07)")};color:#fff7c0;font:700 ${aligned ? "clamp(7.2px,.58vw,8.8px)/1.05" : "9px/1.1"} system-ui,sans-serif;text-transform:uppercase;letter-spacing:0;text-shadow:0 1px 3px #000;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
    element.appendChild(title);

    const body = documentRef.createElement("div");
    body.textContent = card.body;
    body.style.cssText = `min-width:0;min-height:0;padding:${aligned ? "1px 7px 4px" : "4px 5px"};color:${card.color || "#ffeaa0"};font:${card.bodyFont || (aligned ? "400 clamp(6.8px,.52vw,8.2px)/1.10" : "9px/1.24")} ui-monospace,Consolas,monospace;white-space:${aligned ? "pre-wrap" : "pre-wrap"};overflow:hidden;text-overflow:clip;overflow-wrap:anywhere;text-shadow:0 1px 3px #000;`;
    element.appendChild(body);
    node.appendChild(element);
  }

  function appendThoughtGridHeader(documentRef, node, pipelineState, autoplay) {
    const layout = resolveHudPanelRects();
    const header = documentRef.createElement("div");
    header.className = "doom-thought-grid-title";
    header.style.cssText = `${cssRect(layout.title)};min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 7px;border:0;background:transparent;border-radius:0;color:#fff7c0;font:700 9.5px/1.05 system-ui,sans-serif;text-transform:uppercase;letter-spacing:0;text-shadow:0 1px 3px #000;overflow:hidden;box-sizing:border-box;`;

    const title = documentRef.createElement("span");
    title.textContent = "AIKernel Pipeline";
    const status = documentRef.createElement("span");
    const zoe = resolveZoeStateFromPipeline(pipelineState);
    const hp = Number(zoe.health ?? zoe.Health ?? autoplay?.healthEstimatedPercent ?? 100);
    const objective = autoplay?.objective || autoplay?.semanticMemory?.objective || "objective";
    status.textContent = `${labelize(objective)} · HP ${Number.isFinite(hp) ? Math.round(hp) : "?"}`;
    status.style.cssText = "min-width:0;color:#8ee4ff;font:10px/1.15 ui-monospace,Consolas,monospace;text-transform:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
    header.append(title, status);
    node.appendChild(header);
  }

  function resolveDebugOverlayPacket(autoplay) {
    return autoplay?.debugOverlay
      || autoplay?.DebugOverlay
      || autoplay?.autoplayState?.debugOverlay
      || autoplay?.AutoplayState?.DebugOverlay
      || {};
  }

  function resolveGpuHudSummary(autoplay) {
    const overlay = resolveDebugOverlayPacket(autoplay);
    const overlayGpuHud = readObjectCaseInsensitive(overlay, ["gpuHud", "GpuHud"]) || null;
    const providerGpuHud = readObjectCaseInsensitive(autoplay, ["gpuHud", "GpuHud"]) || null;
    const gpuHud = overlayGpuHud || providerGpuHud;
    if (!gpuHud) {
      return "hud=idle";
    }

    const cells = gpuHud.cells || gpuHud.Cells || gpuHud.heatCells || gpuHud.HeatCells || [];
    const panelValues = gpuHud.panelValues || gpuHud.PanelValues || [];
    const rectangles = gpuHud.rectangles || gpuHud.Rectangles || [];
    const rectangleValues = gpuHud.rectangleValues || gpuHud.RectangleValues || [];
    const labels = gpuHud.labels || gpuHud.Labels || [];
    const compositeActive = Boolean(providerGpuHud?.hudCompositeActive ?? providerGpuHud?.HudCompositeActive ?? providerGpuHud?.compositeActive ?? providerGpuHud?.CompositeActive);
    const mode = String(gpuHud.cssOverlayMode || gpuHud.CssOverlayMode || providerGpuHud?.cssOverlayMode || providerGpuHud?.CssOverlayMode || "reduced").toLowerCase();
    const layout = readObjectCaseInsensitive(gpuHud, ["rectangleBufferLayout", "RectangleBufferLayout"])
      || readObjectCaseInsensitive(providerGpuHud, ["hudRectangleBufferLayout", "HudRectangleBufferLayout"]);
    const layoutName = String(layout?.name || layout?.Name || "").trim();
    const frameTarget = readObjectCaseInsensitive(gpuHud, ["analysisFrameTarget", "AnalysisFrameTarget"])
      || readObjectCaseInsensitive(providerGpuHud, ["hudRawFrameTarget", "HudRawFrameTarget"]);
    const targetText = frameTarget ? ` ${String(frameTarget.wireName || frameTarget.WireName || frameTarget.kind || frameTarget.Kind || "target")}` : "";
    const readback = readObjectCaseInsensitive(gpuHud, ["readback", "Readback"])
      || readObjectCaseInsensitive(providerGpuHud, ["hudReadback", "HudReadback"]);
    const readbackText = readback ? ` rb=${String(readback.wireName || readback.WireName || "none")}` : "";
    const summary = String(gpuHud.summary || gpuHud.Summary || "").trim();
    if (summary) {
      const text = `${summary}${layoutName ? ` ${layoutName}` : ""}${targetText}${readbackText}`;
      return compositeActive
        ? text.replace(/^hud=([^\s]+)/, "hud=$1 cmp")
        : text;
    }

    const source = overlayGpuHud ? "dto" : (compositeActive ? "gpu" : "status");
    const counts = [
      `cells${Array.isArray(cells) ? cells.length : 0}`,
      `rect${Array.isArray(rectangles) ? rectangles.length : 0}`,
      `rflat${Array.isArray(rectangleValues) ? rectangleValues.length : 0}`,
      `txt${Array.isArray(labels) ? labels.length : 0}`
    ];
    if (Array.isArray(panelValues) && panelValues.length > 0) {
      counts.push(`panel${panelValues.length}`);
    }

    return `hud=${source}${compositeActive ? " cmp" : ""} ${counts.join(" ")} ${mode}`;
  }

  function resolveGpuAisthesisSummary(autoplay) {
    const overlay = resolveDebugOverlayPacket(autoplay);
    const overlayGpuAisthesis = readObjectCaseInsensitive(overlay, ["gpuAisthesis", "GpuAisthesis"]) || null;
    const providerGpuAisthesis = readObjectCaseInsensitive(autoplay?.gpuHud, ["gpuAisthesis", "GpuAisthesis"]) || null;
    const gpuAisthesis = overlayGpuAisthesis || providerGpuAisthesis;
    if (!gpuAisthesis) {
      return "gpu=idle";
    }

    const enabled = Boolean(gpuAisthesis.enabled ?? gpuAisthesis.Enabled);
    const zeroCopy = Boolean(gpuAisthesis.zeroCopyReady ?? gpuAisthesis.ZeroCopyReady);
    const matrixCount = Number(gpuAisthesis.matrixCount ?? gpuAisthesis.MatrixCount ?? (gpuAisthesis.matrices || gpuAisthesis.Matrices || []).length ?? 0);
    const matrixFloatCount = Number(gpuAisthesis.matrixFloatCount ?? gpuAisthesis.MatrixFloatCount ?? 0);
    const features = gpuAisthesis.features || gpuAisthesis.Features || [];
    const featureText = Array.isArray(features) && features.length > 0 ? features.slice(0, 2).join("+") : "features";
    const infoReady = Boolean(providerGpuAisthesis?.infoBufferReady ?? providerGpuAisthesis?.InfoBufferReady ?? gpuAisthesis.infoBufferReady ?? gpuAisthesis.InfoBufferReady);
    const computeReady = Boolean(providerGpuAisthesis?.computeReady ?? providerGpuAisthesis?.ComputeReady ?? gpuAisthesis.computeReady ?? gpuAisthesis.ComputeReady);
    const featureReady = Boolean(providerGpuAisthesis?.featureBufferReady ?? providerGpuAisthesis?.FeatureBufferReady ?? gpuAisthesis.featureBufferReady ?? gpuAisthesis.FeatureBufferReady);
    const readbackReady = Boolean(providerGpuAisthesis?.featureReadbackReady ?? providerGpuAisthesis?.FeatureReadbackReady ?? gpuAisthesis.featureReadbackReady ?? gpuAisthesis.FeatureReadbackReady);
    const heatReady = Boolean(providerGpuAisthesis?.heatCellsGpuWritable ?? providerGpuAisthesis?.HeatCellsGpuWritable ?? gpuAisthesis.heatCellsGpuWritable ?? gpuAisthesis.HeatCellsGpuWritable);
    const maskReady = Boolean(providerGpuAisthesis?.maskTextureReady ?? providerGpuAisthesis?.MaskTextureReady ?? gpuAisthesis.maskTextureReady ?? gpuAisthesis.MaskTextureReady);
    const matrixSource = String(providerGpuAisthesis?.matrixSource ?? providerGpuAisthesis?.MatrixSource ?? gpuAisthesis.matrixSource ?? gpuAisthesis.MatrixSource ?? "").toLowerCase();
    const matrixSourceText = matrixSource === "dto-flat" ? " flat" : (matrixSource === "js-fallback-flatten" ? " jsflat" : "");
    const layout = readObjectCaseInsensitive(gpuAisthesis, ["matrixBufferLayout", "MatrixBufferLayout"])
      || readObjectCaseInsensitive(providerGpuAisthesis, ["matrixBufferLayout", "MatrixBufferLayout"]);
    const layoutName = String(layout?.name || layout?.Name || "").trim();
    const layoutText = layoutName ? ` ${layoutName}` : "";
    const matrixKindSummary = String(
      providerGpuAisthesis?.matrixKindSummary
      || providerGpuAisthesis?.MatrixKindSummary
      || gpuAisthesis.matrixKindSummary
      || gpuAisthesis.MatrixKindSummary
      || "").trim();
    const matrixKindText = matrixKindSummary ? ` ${matrixKindSummary}` : "";
    const bufferLayoutSummary = String(
      providerGpuAisthesis?.bufferLayoutSummary
      || providerGpuAisthesis?.BufferLayoutSummary
      || gpuAisthesis.bufferLayoutSummary
      || gpuAisthesis.BufferLayoutSummary
      || "").trim();
    const bufferLayoutText = bufferLayoutSummary ? ` layout=${bufferLayoutSummary}` : "";
    const captureTarget = readObjectCaseInsensitive(gpuAisthesis, ["captureFrameTarget", "CaptureFrameTarget"]);
    const captureText = captureTarget ? ` ${String(captureTarget.wireName || captureTarget.WireName || captureTarget.kind || captureTarget.Kind || "raw")}` : "";
    const readback = readObjectCaseInsensitive(gpuAisthesis, ["readback", "Readback"]);
    const readbackText = readback ? ` rb=${String(readback.wireName || readback.WireName || "none")}` : "";
    const lastSummaryPacket = readObjectCaseInsensitive(providerGpuAisthesis || gpuAisthesis, ["lastSummary", "LastSummary"]);
    const lastSummary = readObjectCaseInsensitive(lastSummaryPacket, ["summary", "Summary"]);
    const readbackSummary = lastSummary
      ? ` luma=${formatScore(lastSummary.lumaAverage ?? lastSummary.LumaAverage)} red=${formatScore(lastSummary.redMaximum ?? lastSummary.RedMaximum)} edge=${formatScore(lastSummary.edgeAverage ?? lastSummary.EdgeAverage)} corner=${formatScore(lastSummary.cornerMaximum ?? lastSummary.CornerMaximum)}`
      : "";
    const controlText = `${infoReady ? " ctl" : ""}${computeReady ? " cmp" : ""}${featureReady ? " vec" : ""}${readbackReady ? " rb" : ""}${heatReady ? " heat" : ""}${maskReady ? " mask" : ""}${matrixSourceText}`;
    const canonicalSummary = String(gpuAisthesis.summary || gpuAisthesis.Summary || "").trim();
    if (canonicalSummary && !controlText) {
      return `${canonicalSummary}${layoutText}${captureText}${readbackText}${matrixKindText}${bufferLayoutText}${readbackSummary}`;
    }

    return enabled
      ? `gpu=${zeroCopy ? "zero" : "dto"}${controlText} m${Number.isFinite(matrixCount) ? matrixCount : 0}${matrixFloatCount > 0 ? ` f${matrixFloatCount}` : ""}${layoutText}${captureText}${readbackText} ${featureText}${matrixKindText}${bufferLayoutText}${readbackSummary}`
      : "gpu=off";
  }

  function resolveGpuSpatialReasoningSummary(autoplay) {
    const overlay = resolveDebugOverlayPacket(autoplay);
    const overlayGpuSpatial = readObjectCaseInsensitive(overlay, ["gpuSpatialReasoning", "GpuSpatialReasoning"]) || null;
    const providerGpuSpatial = readObjectCaseInsensitive(autoplay?.gpuHud, ["gpuSpatialReasoning", "GpuSpatialReasoning"]) || null;
    const gpuSpatial = overlayGpuSpatial || providerGpuSpatial;
    if (!gpuSpatial) {
      return "spatial=idle";
    }

    const enabled = Boolean(gpuSpatial.enabled ?? gpuSpatial.Enabled);
    const computeReady = Boolean(providerGpuSpatial?.computeReady ?? providerGpuSpatial?.ComputeReady ?? gpuSpatial.computeReady ?? gpuSpatial.ComputeReady);
    const outputReady = Boolean(providerGpuSpatial?.outputBufferReady ?? providerGpuSpatial?.OutputBufferReady ?? gpuSpatial.outputBufferReady ?? gpuSpatial.OutputBufferReady);
    const inputReady = Boolean(providerGpuSpatial?.featureInputReady ?? providerGpuSpatial?.FeatureInputReady ?? gpuSpatial.featureInputReady ?? gpuSpatial.FeatureInputReady);
    const matrixReady = Boolean(providerGpuSpatial?.matrixInputReady ?? providerGpuSpatial?.MatrixInputReady ?? gpuSpatial.matrixInputReady ?? gpuSpatial.MatrixInputReady);
    const maskReady = Boolean(providerGpuSpatial?.maskTextureInputReady ?? providerGpuSpatial?.MaskTextureInputReady ?? gpuSpatial.maskTextureInputReady ?? gpuSpatial.MaskTextureInputReady);
    const matrixCount = Number(gpuSpatial.matrixCount ?? gpuSpatial.MatrixCount ?? 0);
    const matrixFloatCount = Number(gpuSpatial.matrixFloatCount ?? gpuSpatial.MatrixFloatCount ?? 0);
    const featureCount = Number(gpuSpatial.featureCount ?? gpuSpatial.FeatureCount ?? 0);
    const layout = readObjectCaseInsensitive(gpuSpatial, ["outputVectorLayout", "OutputVectorLayout"]);
    const layoutName = String(layout?.name || layout?.Name || "").trim();
    const readback = readObjectCaseInsensitive(gpuSpatial, ["readback", "Readback"]);
    const readbackText = readback ? ` rb=${String(readback.wireName || readback.WireName || "none")}` : "";
    const matrixKindSummary = String(
      providerGpuSpatial?.matrixKindSummary
      || providerGpuSpatial?.MatrixKindSummary
      || gpuSpatial.matrixKindSummary
      || gpuSpatial.MatrixKindSummary
      || "").trim();
    const matrixKindText = matrixKindSummary ? ` ${matrixKindSummary}` : "";
    const featureFlagSummary = String(
      providerGpuSpatial?.featureFlagSummary
      || providerGpuSpatial?.FeatureFlagSummary
      || gpuSpatial.featureFlagSummary
      || gpuSpatial.FeatureFlagSummary
      || "").trim();
    const featureFlagText = featureFlagSummary ? ` ${featureFlagSummary}` : "";
    const outputLayoutSummary = String(
      providerGpuSpatial?.outputLayoutSummary
      || providerGpuSpatial?.OutputLayoutSummary
      || gpuSpatial.outputLayoutSummary
      || gpuSpatial.OutputLayoutSummary
      || "").trim();
    const outputLayoutText = outputLayoutSummary ? ` layout=${outputLayoutSummary}` : "";
    const lastSummaryPacket = readObjectCaseInsensitive(providerGpuSpatial || gpuSpatial, ["lastSummary", "LastSummary"]);
    const lastSummary = readObjectCaseInsensitive(lastSummaryPacket, ["summary", "Summary"]);
    const readbackSummary = lastSummary
      ? ` route=${formatScore(lastSummary.routeScore ?? lastSummary.RouteScore)} threat=${formatScore(lastSummary.threatScore ?? lastSummary.ThreatScore)} zoe=${formatScore(lastSummary.zoeScore ?? lastSummary.ZoeScore)} yaw=${formatSigned(lastSummary.recommendedYaw ?? lastSummary.RecommendedYaw)} mask=${formatScore(lastSummary.maskHeat ?? lastSummary.MaskHeat)}/${formatScore(lastSummary.maskRed ?? lastSummary.MaskRed)}/${formatScore(lastSummary.maskEdge ?? lastSummary.MaskEdge)}/${formatScore(lastSummary.maskCorner ?? lastSummary.MaskCorner)}`
      : "";
    const controlText = `${inputReady ? " in" : ""}${matrixReady ? " mat" : ""}${maskReady ? " mask" : ""}${computeReady ? " cmp" : ""}${outputReady ? " out" : ""}`;
    const canonicalSummary = String(gpuSpatial.summary || gpuSpatial.Summary || "").trim();
    if (canonicalSummary && !controlText) {
      return `${canonicalSummary}${layoutName ? ` ${layoutName}` : ""}${readbackText}${matrixKindText}${featureFlagText}${outputLayoutText}${readbackSummary}`;
    }

    return enabled
      ? `spatial=gpu${controlText} m${Number.isFinite(matrixCount) ? matrixCount : 0}${matrixFloatCount > 0 ? ` f${matrixFloatCount}` : ""}${featureCount > 0 ? ` feat${featureCount}` : ""}${layoutName ? ` ${layoutName}` : ""}${readbackText}${matrixKindText}${featureFlagText}${outputLayoutText}${readbackSummary}`
      : "spatial=off";
  }

  function renderThoughtGridHud(node, pipelineState, autoplay) {
    const documentRef = node.ownerDocument || self.document;
    if (!documentRef?.createElement) {
      node.textContent = formatFourLayerPipelineState(pipelineState, autoplay, { detail: false });
      return;
    }

    const aisthesis = readObjectCaseInsensitive(pipelineState, ["aisthesis", "Aisthesis"]) || {};
    const noesis = readObjectCaseInsensitive(pipelineState, ["noesis", "Noesis"]) || {};
    const krisis = readObjectCaseInsensitive(pipelineState, ["krisis", "Krisis"]) || {};
    const kinesis = readObjectCaseInsensitive(pipelineState, ["kinesis", "Kinesis"]) || {};
    const routePlan = readObjectCaseInsensitive(aisthesis, ["routePlan", "RoutePlan"]) || {};
    const topology = readObjectCaseInsensitive(noesis, ["topology", "Topology"]) || null;
    const kairos = readObjectCaseInsensitive(krisis, ["kairos", "Kairos"]) || {};
    const eventLabels = readObjectCaseInsensitive(noesis, ["eventLabels", "EventLabels"]) || [];
    const routeName = routePlan.currentRoute || routePlan.CurrentRoute || autoplay?.autoplayState?.currentRoute || "unknown";
    const routeMode = routePlan.routeMode || routePlan.RouteMode || autoplay?.autoplayState?.routeMode || "spawn-approach";
    const routeConfidence = routePlan.routeConfidence ?? routePlan.RouteConfidence ?? autoplay?.routeConfidence ?? 0;
    const routeLoopKind = routePlan.routeLoopKind || routePlan.RouteLoopKind || autoplay?.autoplayState?.routeLoopKind || "none";
    const routeLoopExceeded = Boolean(routePlan.routeLoopBudgetExceeded || routePlan.RouteLoopBudgetExceeded || autoplay?.autoplayState?.routeLoopBudgetExceeded);
    const routeLoopUsed = readRouteLoopMetric(routePlan, autoplay?.debugRouteValues, routeLoopKind, "Used");
    const routeLoopBudget = readRouteLoopMetric(routePlan, autoplay?.debugRouteValues, routeLoopKind, "Budget");
    const axis = String(kairos.selectedAxis || kairos.SelectedAxis || "logos").toUpperCase();
    const zoe = resolveZoeStateFromPipeline(pipelineState);
    const zoeVetoed = Boolean(zoe.vetoed ?? zoe.Vetoed);
    const zoeWarning = isZoeWarning(pipelineState, autoplay);
    const smoothing = beginThoughtGridSmoothing(node);
    const routeConfidenceText = smoothThoughtScore(smoothing, "routeConfidence", routeConfidence, 260);
    const routeLoopUsedText = Math.round(smoothThoughtGridValue(smoothing, "routeLoopUsed", routeLoopUsed, 220));
    const kairosLogosText = smoothThoughtScore(smoothing, "kairosLogos", kairos.logos ?? kairos.Logos, 210);
    const kairosPathosText = smoothThoughtScore(smoothing, "kairosPathos", kairos.pathos ?? kairos.Pathos, 210);
    const kairosEthosText = smoothThoughtScore(smoothing, "kairosEthos", kairos.ethos ?? kairos.Ethos, 210);
    const zoeHealthRaw = Number(zoe.health ?? zoe.Health);
    const zoeHealthText = Number.isFinite(zoeHealthRaw)
      ? Math.round(smoothThoughtGridValue(smoothing, "zoeHealth", zoeHealthRaw, 420))
      : "?";
    const zoeRiskText = smoothThoughtScore(smoothing, "zoeRisk", zoe.lethalRisk ?? zoe.LethalRisk, 280);

    clearNode(node);
    setZoeVetoHudState(node, pipelineState, autoplay);
    node.dataset.ctgHudMode = "simple";
    node.dataset.ctgLayout = "gpu-panel";
    node.classList.add("is-thought-grid");
    node.classList.remove("is-detail-overlay", "is-simple-summary");
    node.style.cssText = `position:absolute;inset:0;z-index:160;margin:0;padding:0;border:0;background:transparent;color:#ffeaa0;pointer-events:none;display:block;overflow:hidden;border-radius:0;box-shadow:${zoeVetoed ? "inset 0 0 0 1px rgba(255,36,36,.34),0 0 22px rgba(255,36,36,.26)" : (zoeWarning ? "inset 0 0 0 1px rgba(255,180,60,.20),0 0 16px rgba(255,180,60,.16)" : "none")};transition:opacity .24s ease,box-shadow .24s ease;`;

    appendThoughtGridHeader(documentRef, node, pipelineState, autoplay);
    const combatSummary = readCombatSummary(autoplay);
    const combatActive = combatSummary !== "calm";
    const gpuPath = resolveGpuPathSummary(autoplay);
    const gpuHud = resolveGpuHudSummary(autoplay);
    const gpuAisthesis = resolveGpuAisthesisSummary(autoplay);
    const gpuSpatial = resolveGpuSpatialReasoningSummary(autoplay);
    const cards = [
      { key: "aisthesis", title: "Aisthesis", column: "1", row: "2 / span 2", body: `${labelize(routeName)} c=${routeConfidenceText}\n${labelize(routeMode)} ${labelize(routeLoopKind)}${routeLoopExceeded ? "!" : ""}\n${gpuPath.shortText}\n${gpuHud}\n${gpuAisthesis}\n${gpuSpatial}`, color: "#8ee4ff", border: "rgba(78,190,255,.36)", headerBackground: "rgba(78,190,255,.10)", bodyFont: "400 clamp(6.1px,.47vw,7.3px)/1.05" },
      { key: "noesis", title: "Noesis", column: "2", row: "2", body: `${summarizeLabels(eventLabels, 2)}\n${summarizeTopologyCompact(topology)}`, color: "#95ffd0", border: "rgba(149,255,208,.28)", headerBackground: "rgba(149,255,208,.08)" },
      { key: "krisis", title: "Krisis", column: "3", row: "2", body: `${axis}\nL=${kairosLogosText} P=${kairosPathosText} E=${kairosEthosText}`, color: "#ffe17a", border: "rgba(255,225,122,.34)", headerBackground: "rgba(255,225,122,.08)" },
      { key: "kinesis", title: "Kinesis", column: "4", row: "2", body: formatPipelineAction(kinesis), color: "#ffb48e", border: "rgba(255,180,142,.32)", headerBackground: "rgba(255,180,142,.08)" },
      { key: "route", title: "Route", column: "2", row: "3", body: `${labelize(routeLoopKind)}${routeLoopExceeded ? "!" : ""}\n${routeLoopUsedText}/${Math.round(routeLoopBudget)}`, color: routeLoopExceeded ? "#ff9a8f" : "#ffeaa0", border: routeLoopExceeded ? "rgba(255,73,73,.50)" : "rgba(255,255,255,.14)", headerBackground: routeLoopExceeded ? "rgba(255,73,73,.10)" : "rgba(255,247,192,.06)" },
      { key: "combat", title: "Combat", column: "3", row: "3", body: combatSummary, color: combatActive ? "#ff9a8f" : "#ffeaa0", border: combatActive ? "rgba(255,73,73,.58)" : "rgba(255,255,255,.14)", headerBackground: combatActive ? "rgba(255,73,73,.10)" : "rgba(255,247,192,.06)", background: combatActive ? "rgba(56,5,7,.22)" : "rgba(0,0,0,.20)", zIndex: combatActive ? 2 : 0 },
      { key: "zoe", title: "Zoe", column: "4", row: "3", body: `${zoeVetoed ? "VETO" : (zoeWarning ? "warn" : "clear")}\nhp=${zoeHealthText} risk=${zoeRiskText}`, color: zoeVetoed ? "#ff5959" : (zoeWarning ? "#ffd36f" : "#ffeaa0"), border: zoeVetoed ? "rgba(255,73,73,.70)" : (zoeWarning ? "rgba(255,189,87,.54)" : "rgba(255,255,255,.14)"), headerBackground: zoeVetoed ? "rgba(255,73,73,.10)" : (zoeWarning ? "rgba(255,189,87,.08)" : "rgba(255,247,192,.06)"), background: zoeVetoed ? "rgba(64,4,7,.24)" : (zoeWarning ? "rgba(48,32,7,.21)" : "rgba(0,0,0,.20)"), zIndex: zoeVetoed ? 4 : (zoeWarning ? 3 : 0) }
    ];
    for (let index = 0; index < cards.length; index += 1) {
      appendThoughtGridCard(documentRef, node, cards[index]);
    }
  }

  function lineColor(line) {
    const text = String(line || "");
    if (/ZOE VETO|Zoe:\s*veto/i.test(text)) {
      return "#ff5959";
    }
    if (/risk=dead-end|Loop: .*!.*/i.test(text)) {
      return "#ff9a8f";
    }
    if (/barrel=|align=|trim=yes|Topology:|Movement=|Action:|Kinesis:/i.test(text)) {
      return "#8ee4ff";
    }
    if (/Kairos:|Topos:|Route:|Hint:/i.test(text)) {
      return "#ffe17a";
    }
    return "#ffeaa0";
  }

  function setZoeVetoHudState(node, pipelineState, autoplay) {
    const vetoed = isZoeVetoed(pipelineState, autoplay);
    const warning = !vetoed && isZoeWarning(pipelineState, autoplay);
    node.classList.toggle("is-zoe-veto", vetoed);
    node.classList.toggle("is-zoe-warning", warning);
    node.dataset.zoeVeto = vetoed ? "true" : "false";
    node.dataset.zoeWarning = warning ? "true" : "false";
    return vetoed;
  }

  function appendHighlightedLines(documentRef, body, lines) {
    const source = Array.isArray(lines) && lines.length > 0 ? lines : ["none"];
    for (let index = 0; index < source.length; index += 1) {
      const row = documentRef.createElement("div");
      row.className = "doom-ctg-detail-line";
      row.textContent = source[index];
      row.style.cssText = `min-height:12px;color:${lineColor(source[index])};`;
      body.appendChild(row);
    }
  }

  function renderPipelineDetailGrid(node, pipelineState, autoplay) {
    const documentRef = node.ownerDocument || self.document;
    if (!documentRef?.createElement) {
      node.textContent = formatFourLayerPipelineState(pipelineState, autoplay, { detail: true });
      return;
    }

    clearNode(node);
    const detailText = formatFourLayerPipelineState(pipelineState, autoplay, { detail: true });
    setZoeVetoHudState(node, pipelineState, autoplay);
    applyToposHudMode(node, true);
    const sections = splitHudSections(detailText);
    const wanted = new Set(["Aisthesis", "Noesis", "Krisis", "Kinesis"]);
    const cards = sections.filter(section => wanted.has(section.title)).slice(0, 4);
    for (let index = 0; index < cards.length; index += 1) {
      appendDetailCard(documentRef, node, cards[index]);
    }
  }

  function renderToposHud(node, status, options = {}) {
    if (!node) {
      return;
    }

    const rawAutoplay = status?.autoplay || {};
    const autoplay = Object.assign({}, rawAutoplay, {
      runtimeStatus: status || null,
      gpuHud: readObjectCaseInsensitive(rawAutoplay, ["gpuHud", "GpuHud"])
        || readObjectCaseInsensitive(status, ["gpuHud", "GpuHud"])
        || null,
      debugOverlay: readObjectCaseInsensitive(rawAutoplay, ["debugOverlay", "DebugOverlay"])
        || readObjectCaseInsensitive(status, ["debugOverlay", "DebugOverlay"])
        || null
    });
    const pipelineState = autoplay.enabled ? resolvePipelineState(autoplay) : null;
    const mode = options.detail && pipelineState ? "detail" : (pipelineState ? "thought-grid" : "text");
    if (shouldSkipPanelRender(node, mode, autoplay, pipelineState, options)) {
      return;
    }

    if (options.detail && pipelineState) {
      renderPipelineDetailGrid(node, pipelineState, autoplay);
      return;
    }

    if (pipelineState) {
      renderThoughtGridHud(node, pipelineState, autoplay);
      return;
    }

    setZoeVetoHudState(node, pipelineState, autoplay);
    applyToposHudMode(node, false);
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
    resolveEnemyCue,
    formatFourLayerPipelineState
  });
})();
