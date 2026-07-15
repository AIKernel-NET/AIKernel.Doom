(function () {
  "use strict";

  const version = "20260622-objectivestatus-gpu2";

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
    "secure-central-hall": "Secure Central Hall",
    "cross-bridge": "Cross Bridge",
    "reach-bridge": "Reach Cross Bridge",
    "reach-final-room": "Reach Exit Route",
    "press-exit-switch": "Press Exit Switch",
    "level-clear": "Level Clear"
  });

  function labelize(value) {
    const formatter = self.AIKernelDoomGoalPanel?.labelize;
    if (typeof formatter === "function") {
      return formatter(value);
    }

    const key = String(value || "none");
    if (displayLabels[key]) {
      return displayLabels[key];
    }

    return key
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function resolveWith(options, name, fallback, autoplay) {
    const resolver = options?.resolvers?.[name] || self.AIKernelDoomGoalPanel?.[name];
    return typeof resolver === "function" ? resolver(autoplay) : fallback(autoplay);
  }

  function fallbackTelos(autoplay) {
    const dto = autoplay?.goalState || autoplay?.GoalState || autoplay?.autoplayState?.goalState || null;
    if (dto?.telos || dto?.Telos) {
      return dto.telos || dto.Telos;
    }

    return labelize(autoplay?.controlPipeline || autoplay?.objective || "Idle");
  }

  function fallbackObjective(autoplay) {
    const dto = autoplay?.goalState || autoplay?.GoalState || autoplay?.autoplayState?.goalState || null;
    if (dto?.objective || dto?.Objective) {
      return dto.objective || dto.Objective;
    }

    return labelize(autoplay?.objective || autoplay?.controlPipeline || "Idle");
  }

  function fallbackPriority(autoplay) {
    const dto = autoplay?.goalState || autoplay?.GoalState || autoplay?.autoplayState?.goalState || null;
    if (dto?.priority || dto?.Priority) {
      return dto.priority || dto.Priority;
    }

    const axis = String(autoplay?.toposDecisionCarrier?.dominantAxis || autoplay?.kairosPriorityAxis?.selectedAxis || "logos").toLowerCase();
    if (axis === "pathos") {
      return "[P] Avoid Threat";
    }

    if (axis === "ethos") {
      return "[E] Pursue Goal";
    }

    return "[L] Approach Target";
  }

  function resolveGpuRuntimeRows(status, autoplay) {
    const resolver = self.AIKernelDoomGpuPathStatus?.resolveGpuPathStatus;
    const resolved = typeof resolver === "function" ? resolver(status, autoplay) : null;
    if (Array.isArray(resolved?.rows)) {
      return resolved.rows;
    }

    return [
      { label: "GAME", value: "pending · provider status unavailable", tone: "" },
      { label: "BONSAI", value: "pending · vision status unavailable", tone: "" },
      { label: "HUD", value: "pending · composite status unavailable", tone: "" },
      { label: "SENSOR", value: "pending · Aisthesis status unavailable", tone: "" }
    ];
  }

  function normalizeLifePhase(value) {
    const text = String(value || "unknown").toLowerCase();
    if (text === "healthy"
      || text === "wounded"
      || text === "damaged"
      || text === "critical"
      || text === "moribund"
      || text === "dead"
      || text === "invulnerable") {
      return text;
    }

    return "unknown";
  }

  function firstKnownLifePhase(...values) {
    for (const value of values) {
      const phase = normalizeLifePhase(value);
      if (phase !== "unknown") {
        return phase;
      }
    }

    return "unknown";
  }

  function firstExplicitBoolean(...values) {
    for (const value of values) {
      if (value === true || value === false) {
        return value;
      }
      if (value === 1 || value === 0) {
        return value === 1;
      }
      if (value === "true" || value === "false") {
        return value === "true";
      }
    }

    return false;
  }

  function resolveLifeLevel(phase, ...values) {
    for (const value of values) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        continue;
      }

      const level = Math.max(0, Math.min(5, Math.round(parsed)));
      if (phase !== "dead" && phase !== "unknown" && level === 0) {
        continue;
      }

      return level;
    }

    return NaN;
  }

  function resolveLifeStatus(autoplay = {}, zoe = {}) {
    const health = autoplay.healthSensor || {};
    const phase = firstKnownLifePhase(
      autoplay.healthLikelyDead || health.likelyDead ? "dead" : undefined,
      autoplay.healthFaceLifePhase,
      health.healthFaceLifePhase,
      autoplay.faceLifePhase,
      health.faceLifePhase,
      zoe.faceLifePhase,
      zoe.FaceLifePhase,
      health.faceLifeTemplatePhase,
      health.healthFaceLifeTemplatePhase,
      health.faceLifeQuantizedPhase,
      health.healthFaceLifeQuantizedPhase);
    const rawLevel = resolveLifeLevel(
      phase,
      autoplay.healthFaceLifeLevel,
      health.healthFaceLifeLevel,
      autoplay.faceLifeLevel,
      health.faceLifeLevel,
      zoe.faceLifeLevel,
      zoe.FaceLifeLevel,
      health.faceLifeTemplateLevel,
      health.healthFaceLifeTemplateLevel,
      health.faceLifeQuantizedLevel,
      health.healthFaceLifeQuantizedLevel);
    const fallbackLevel = phase === "healthy" || phase === "invulnerable" ? 5
      : (phase === "wounded" ? 4
        : (phase === "damaged" ? 3
          : (phase === "critical" ? 2
            : (phase === "moribund" ? 1 : 0))));
    const level = Number.isFinite(rawLevel)
      ? Math.max(0, Math.min(5, Math.round(rawLevel)))
      : fallbackLevel;
    const heartbeatAlive = firstExplicitBoolean(
      health.faceHeartbeatAlive,
      health.healthFaceHeartbeatAlive,
      autoplay.faceHeartbeatAlive,
      autoplay.healthFaceHeartbeatAlive);
    const opacity = Math.max(0, Math.min(1, Number(
      health.faceHeartbeatVisualOpacity
      ?? health.healthFaceHeartbeatVisualOpacity
      ?? autoplay.faceHeartbeatVisualOpacity
      ?? autoplay.healthFaceHeartbeatVisualOpacity
      ?? health.faceHeartbeatOpacity
      ?? health.healthFaceHeartbeatOpacity
      ?? autoplay.faceHeartbeatOpacity
      ?? autoplay.healthFaceHeartbeatOpacity
      ?? (heartbeatAlive ? 1 : 0)) || 0));
    const heartbeat = heartbeatAlive || phase === "invulnerable" ? "hb" : `fade${opacity.toFixed(2)}`;
    const symbol = phase === "invulnerable" ? "∞" : (phase === "dead" ? "0" : String(level));
    return {
      phase,
      symbol,
      heartbeat,
      warning: phase === "critical" || phase === "moribund",
      dead: phase === "dead" || autoplay.healthLikelyDead || health.likelyDead,
      value: `vital ${symbol} ${phase} ${heartbeat}`
    };
  }

  function applyRowMetadataDataset(rowNode, metadata = {}) {
    if (!rowNode?.dataset || !metadata || typeof metadata !== "object") {
      return;
    }

    const mappings = [
      ["passId", "pass_id"],
      ["pathRole", "path_role"],
      ["pilotState", "pilot_state"],
      ["promotionGate", "promotion_gate"],
      ["promotionBlocked", "promotion_blocked"],
      ["promotionCandidateReady", "promotion_candidate_ready"],
      ["promotionDiagnosticStable", "promotion_diagnostic_stable"],
      ["promotionReason", "promotion_reason"],
      ["candidateStreak", "candidate_streak"],
      ["diagnosticStreak", "diagnostic_streak"],
      ["requiredStreak", "required_streak"],
      ["authoritativeReady", "authoritative_ready"],
      ["diagnosticReady", "diagnostic_ready"],
      ["featureMaskStorageTexture", "feature_mask_storage_texture"],
      ["passReadiness", "pass_readiness"],
      ["doomRuntimeStamped", "doom_runtime_stamped"],
      ["doomZeroCopy", "doom_zero_copy"],
      ["doomCpuFallback", "doom_cpu_fallback"],
      ["doomMemoryMb", "doom_memory_mb"]
    ];

    for (const [datasetKey, metadataKey] of mappings) {
      const value = metadata[metadataKey];
      if (value !== undefined && value !== null && value !== "") {
        rowNode.dataset[datasetKey] = String(value);
      }
    }
  }

  function resolveRows(status = {}, options = {}) {
    const autoplay = status?.autoplay || {};
    const milestones = autoplay.milestones || {};
    const route = autoplay.autoplayState || {};
    const pipeline = autoplay.pipelineState || autoplay.PipelineState || {};
    const krisis = pipeline.krisis || pipeline.Krisis || {};
    const kairos = krisis.kairos || krisis.Kairos || {};
    const kinesis = pipeline.kinesis || pipeline.Kinesis || {};
    const action = autoplay.action || kinesis.action || kinesis.Action || {};
    const zoe = kinesis.zoe || kinesis.Zoe || {};
    const life = resolveLifeStatus(autoplay, zoe);
    const lethalRisk = Number(zoe.lethalRisk ?? zoe.LethalRisk ?? autoplay.lethalRisk ?? 0);
    const telos = resolveWith(options, "resolveTelosObjective", fallbackTelos, autoplay);
    const objective = resolveWith(options, "resolvePrimaryObjective", fallbackObjective, autoplay);
    const priority = resolveWith(options, "resolvePriorityAction", fallbackPriority, autoplay);
    const routeName = route.currentRoute || route.CurrentRoute || autoplay.currentRoute || "none";
    const routeMode = route.routeMode || route.RouteMode || autoplay.routeMode || "none";
    const routeConfidence = Number(route.routeConfidence ?? route.RouteConfidence ?? autoplay.routeConfidence ?? 0);
    const selectedAxis = kairos.selectedAxis || kairos.SelectedAxis || autoplay.kairosPriorityAxis || "monitor";
    const useState = `use=${Boolean(action.use)} cooldown=${Number(autoplay.useCooldown || 0)} latch=${Number(autoplay.firstDoorUseLatchFrames || 0)}`;
    const healthTone = life.dead || Boolean(zoe.vetoed ?? zoe.Vetoed)
      ? "health is-danger"
      : (life.warning || lethalRisk >= 0.50 ? "health is-warn" : "health");
    const progress = [
      `door=${milestones.doorOpened || 0}`,
      `computer=${milestones.computerRoomEntered ? "yes" : "no"}`,
      `hall=${milestones.centralHallEntered ? "yes" : "no"}`,
      `enemy=${milestones.enemyDefeated || 0}`
    ].join(" / ");

    return [
      { label: "TELOS", value: telos || "Monitor runtime", tone: "telos" },
      { label: "OBJECTIVE", value: objective || labelize(autoplay.objective || "Idle"), tone: "" },
      { label: "PRIORITY", value: priority || "Monitor", tone: "priority" },
      { label: "ROUTE", value: `${labelize(routeName)} / ${labelize(routeMode)} ${routeConfidence.toFixed(2)}`, tone: "" },
      { label: "KAIROS", value: `${labelize(selectedAxis)} ${Number(kairos.confidence ?? kairos.Confidence ?? routeConfidence).toFixed(2)}`, tone: "" },
      ...resolveGpuRuntimeRows(status, autoplay),
      { label: "ACTION", value: `${action.move || "none"} / ${action.turn || "none"} / fire=${Boolean(action.fire)} / ${useState}`, tone: "" },
      { label: "FACE VITAL", value: `${life.value} risk=${Number.isFinite(lethalRisk) ? lethalRisk.toFixed(2) : "0.00"}`, tone: healthTone },
      { label: "PROGRESS", value: progress, tone: "" }
    ];
  }

  function renderObjectiveStatusPanel(node, status = {}, options = {}) {
    if (!node) {
      return [];
    }

    const documentRef = node.ownerDocument || self.document;
    if (!documentRef?.createElement) {
      const rows = resolveRows(status, options);
      node.textContent = rows.map(row => `${row.label}: ${row.value}`).join("\n");
      return rows;
    }

    const rows = resolveRows(status, options);
    const grid = documentRef.createElement("div");
    grid.className = "doom-objective-status-grid";
    for (const row of rows) {
      const rowNode = documentRef.createElement("div");
      rowNode.className = `doom-objective-status-row ${row.tone ? `is-${row.tone}` : ""}`.trim();
      const label = documentRef.createElement("strong");
      label.textContent = row.label;
      const value = documentRef.createElement("span");
      value.textContent = row.value;
      applyRowMetadataDataset(rowNode, row.metadata);
      rowNode.append(label, value);
      grid.appendChild(rowNode);
    }

    node.replaceChildren(grid);
    return rows;
  }

  if (self.document?.documentElement?.dataset) {
    self.document.documentElement.dataset.doomObjectiveStatusPanelVersion = version;
  }

  self.AIKernelDoomObjectiveStatusPanel = Object.freeze({
    version,
    labelize,
    resolveRows,
    applyRowMetadataDataset,
    renderObjectiveStatusPanel
  });
})();
