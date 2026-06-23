(function () {
  "use strict";

  const version = "20260621-debugoverlay-gpu1";
  const overlayRenderCache = new WeakMap();
  const overlayRenderIntervalMs = 42;
  const gpuHudLabelHoldMs = 1100;
  const gpuHudHeldLabels = new Map();

  function nowMs() {
    return Number(self.performance?.now?.() ?? Date.now());
  }

  function isUrgentOverlayFrame(status) {
    const autoplay = status?.autoplay || {};
    return Boolean(
      autoplay.healthLikelyDead
      || autoplay.zoeVetoed
      || autoplay.retryDispatch?.active
      || autoplay.action?.fire
      || autoplay.currentAction?.fire
      || autoplay.action?.use
      || autoplay.currentAction?.use
      || autoplay.debugOverlay?.ZoeVetoed
      || autoplay.DebugOverlay?.ZoeVetoed
    );
  }

  function shouldSkipOverlayRender(overlay, status, options) {
    if (options?.force || isUrgentOverlayFrame(status)) {
      return false;
    }

    const now = nowMs();
    const previous = overlayRenderCache.get(overlay);
    if (previous && now - previous.lastRenderAt < overlayRenderIntervalMs) {
      return true;
    }

    overlayRenderCache.set(overlay, { lastRenderAt: now });
    return false;
  }

  function isGpuBackedOverlay(options = {}) {
    const gpuHud = options.gpuHud || {};
    return Boolean(
      options.gpuBacked
      || gpuHud.hudCompositeActive
      || gpuHud.compositeActive
      || gpuHud.cssOverlayMode === "reduced"
    );
  }

  function isHighPriorityRegion(region) {
    const kind = String(region?.kind || region?.Kind || "").toLowerCase();
    const priority = String(region?.priority || region?.Priority || "mid").toLowerCase();
    return priority === "high"
      || kind === "combat"
      || kind === "zoe"
      || kind === "enemy"
      || kind === "enemy-circle"
      || kind.includes("objective")
      || kind === "door"
      || kind === "bridge";
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
  }

  function resolvePriorityAction(autoplay) {
    const resolver = self.AIKernelDoomGoalPanel?.resolvePriorityAction;
    if (typeof resolver === "function") {
      return resolver(autoplay);
    }

    if (!autoplay?.enabled) {
      return "Idle";
    }

    if (autoplay?.retryDispatch?.active || autoplay?.healthLikelyDead) {
      return "[P] Retry Now";
    }

    if (autoplay?.currentAction?.use || autoplay?.action?.use || (autoplay?.firstDoorUseLatchFrames || 0) > 0) {
      return "[L] Use / Open";
    }

    return "[L] Approach Target";
  }

  function resolveKairosSignal(autoplay) {
    const resolver = self.AIKernelDoomGoalPanel?.resolveKairosSignal;
    if (typeof resolver === "function") {
      return resolver(autoplay);
    }

    if (autoplay?.retryDispatch?.active) {
      return "Kairos: Retry";
    }

    if ((autoplay?.firstDoorUseLatchFrames || 0) > 0) {
      return `Kairos: Use Latch ${autoplay.firstDoorUseLatchFrames}`;
    }

    return "";
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

  function readValueCaseInsensitive(source, names) {
    if (!source || typeof source !== "object") {
      return undefined;
    }

    for (let index = 0; index < names.length; index += 1) {
      const value = source[names[index]];
      if (value !== undefined && value !== null) {
        return value;
      }
    }

    return undefined;
  }

  function resolveKairosAxisPacket(autoplay) {
    const direct = autoplay?.kairosPriorityAxis || autoplay?.KairosPriorityAxis || null;
    if (direct) {
      return direct;
    }

    const pipeline = autoplay?.pipelineState || autoplay?.PipelineState || null;
    const krisis = readObjectCaseInsensitive(pipeline, ["krisis", "Krisis"]);
    return readObjectCaseInsensitive(krisis, ["kairos", "Kairos"]);
  }

  function resolveDebugOverlayDto(autoplay) {
    return autoplay?.debugOverlay
      || autoplay?.DebugOverlay
      || autoplay?.autoplayState?.debugOverlay
      || autoplay?.AutoplayState?.DebugOverlay
      || null;
  }

  function resolveKairosAxisLabel(autoplay) {
    const packet = resolveKairosAxisPacket(autoplay);
    if (!packet) {
      return "";
    }

    const axis = String(packet.selectedAxis || packet.SelectedAxis || "logos").trim().toUpperCase();
    if (axis !== "PATHOS" && axis !== "ETHOS" && axis !== "LOGOS") {
      return "";
    }

    const score = axis === "PATHOS"
      ? packet.pathos ?? packet.Pathos
      : (axis === "ETHOS" ? packet.ethos ?? packet.Ethos : packet.logos ?? packet.Logos);
    return `${axis} ${clamp01(score).toFixed(2)}`;
  }

  function resolvePriorityAxisClass(autoplay, priorityLabel = "") {
    const packet = resolveKairosAxisPacket(autoplay);
    const rawAxis = String(packet?.selectedAxis || packet?.SelectedAxis || "").toLowerCase();
    const label = String(priorityLabel || "").toLowerCase();
    const axis = rawAxis === "pathos" || rawAxis === "ethos" ? rawAxis : "logos";
    const actionClass = label.includes("fire")
      ? " is-fire"
      : (label.includes("use") || label.includes("open") ? " is-use" : "");
    return `is-axis-${axis}${actionClass}`;
  }

  function formatOverlayLabelText(className, label, value = "") {
    const name = String(className || "");
    const rawLabel = String(label || "");
    const rawValue = String(value || "");
    if (name.includes("is-priority-axis")) {
      const title = rawLabel.replace(/:+$/, "").trim().toUpperCase() || "PRIORITY";
      return rawValue ? `${title}\n${rawValue.toUpperCase()}` : title;
    }

    if (name.includes("is-route-target")) {
      return rawValue ? `${rawLabel.toUpperCase()}\n${rawValue}` : rawLabel.toUpperCase();
    }

    return rawValue ? `${rawLabel} ${rawValue}` : rawLabel;
  }

  function createRegion(className, left, top, width, height, label, value = "", options = {}) {
    const region = document.createElement("div");
    const priority = options.priority ? `priority-${options.priority}` : "";
    region.className = `debug-region ${className} ${priority} ${options.active ? "is-detected" : ""}`.trim();
    region.style.left = `${left}%`;
    region.style.top = `${top}%`;
    region.style.width = `${width}%`;
    region.style.height = `${height}%`;
    if (options.slot !== undefined) {
      region.dataset.labelSlot = String(options.slot);
    }

    if (!options.noLabel) {
      const labelNode = document.createElement("span");
      labelNode.className = "debug-region-label";
      labelNode.textContent = formatOverlayLabelText(className, label, value);
      region.appendChild(labelNode);
    }

    return region;
  }

  function normalizeLabelPercent(value, fallback = 0) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return fallback;
    }

    const percent = numeric > 0 && numeric < 1 ? numeric * 100 : numeric;
    return Math.max(0, Math.min(100, percent));
  }

  function resolveGpuLabelRect(options = {}) {
    const left = normalizeLabelPercent(options.left ?? options.Left, NaN);
    const top = normalizeLabelPercent(options.top ?? options.Top, NaN);
    const width = normalizeLabelPercent(options.width ?? options.Width, NaN);
    const height = normalizeLabelPercent(options.height ?? options.Height, NaN);
    if (!Number.isFinite(left) || !Number.isFinite(top) || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return null;
    }

    return { left, top, width, height };
  }

  function applyGpuLabelRect(node, rect, anchor = "inside") {
    const safeAnchor = String(anchor || "inside").toLowerCase();
    const insideLeft = Math.min(98, rect.left + 0.55);
    const insideTop = Math.min(97, rect.top + 0.75);
    let labelLeft = insideLeft;
    let labelTop = insideTop;
    let labelWidth = Math.max(10, Math.min(52, rect.width - 1));

    if (safeAnchor === "below") {
      labelLeft = Math.max(4, Math.min(96, rect.left + rect.width / 2));
      labelTop = rect.top + rect.height + 0.75;
      if (labelTop > 95) {
        labelTop = Math.max(1.5, rect.top - 3.5);
      }
      labelWidth = Math.max(16, Math.min(56, rect.width * 1.35));
    }

    node.dataset.gpuLabelLayout = "rect";
    node.dataset.gpuLabelAnchor = safeAnchor;
    node.style.setProperty("--label-left", labelLeft.toFixed(3));
    node.style.setProperty("--label-top", labelTop.toFixed(3));
    node.style.setProperty("--label-width", labelWidth.toFixed(3));
  }

  function createGpuTextLabel(className, label, value = "", options = {}) {
    const node = document.createElement("div");
    const priority = options.priority ? `priority-${options.priority}` : "";
    const holdClass = options.held ? "is-held" : "";
    node.className = `debug-gpu-label ${className} ${priority} ${options.active ? "is-detected" : ""} ${holdClass}`.trim();
    node.textContent = formatOverlayLabelText(className, label, value);
    node.dataset.labelSlot = String(options.slot ?? 0);
    node.dataset.gpuHudLabel = "true";
    node.dataset.gpuLabelLayout = "diagnostic";
    node.style.setProperty("--label-slot", String(options.slot ?? 0));
    node.style.setProperty("--label-alpha", clamp01(options.holdAlpha ?? 1).toFixed(3));
    if (options.source) {
      node.dataset.source = String(options.source);
    }
    const rect = resolveGpuLabelRect(options);
    if (rect) {
      applyGpuLabelRect(node, rect, options.anchor ?? options.Anchor);
    }

    return node;
  }

  function normalizeGpuHudLabels(dto) {
    const gpuHud = readObjectCaseInsensitive(dto, ["gpuHud", "GpuHud"]);
    const labels = readValueCaseInsensitive(gpuHud, ["labels", "Labels"]);
    return Array.isArray(labels) ? labels : [];
  }

  function gpuHudLabelHoldKey(label) {
    const className = String(label?.className || label?.ClassName || "is-diagnostic").toLowerCase();
    const labelText = String(label?.label || label?.Label || "").toLowerCase();
    const left = normalizeLabelPercent(label?.left ?? label?.Left, 0).toFixed(1);
    const top = normalizeLabelPercent(label?.top ?? label?.Top, 0).toFixed(1);
    return `${className}|${labelText}|${left}|${top}`;
  }

  function shouldHoldGpuHudLabel(label) {
    const className = String(label?.className || label?.ClassName || "").toLowerCase();
    const priority = String(label?.priority || label?.Priority || "mid").toLowerCase();
    if (className.includes("is-radar-label") || className.includes("is-priority-axis")) {
      return false;
    }

    return priority === "high"
      || className.includes("route")
      || className.includes("door")
      || className.includes("wall")
      || className.includes("corner")
      || className.includes("enemy")
      || className.includes("combat")
      || className.includes("zoe");
  }

  function mergeHeldGpuHudLabels(labels) {
    const now = nowMs();
    const current = Array.isArray(labels) ? labels.filter(Boolean) : [];
    const currentKeys = new Set();

    for (const label of current) {
      if (!shouldHoldGpuHudLabel(label)) {
        continue;
      }

      const key = gpuHudLabelHoldKey(label);
      currentKeys.add(key);
      gpuHudHeldLabels.set(key, {
        label: { ...label },
        expiresAt: now + gpuHudLabelHoldMs
      });
    }

    const held = [];
    for (const [key, entry] of gpuHudHeldLabels.entries()) {
      if (!entry || entry.expiresAt <= now) {
        gpuHudHeldLabels.delete(key);
        continue;
      }

      if (currentKeys.has(key)) {
        continue;
      }

      const remaining = Math.max(0, Math.min(1, (entry.expiresAt - now) / gpuHudLabelHoldMs));
      held.push({
        ...entry.label,
        active: false,
        Active: false,
        source: "gpu-hud-held-label",
        Source: "gpu-hud-held-label",
        __held: true,
        __holdAlpha: 0.28 + remaining * 0.62
      });
    }

    return current.concat(held);
  }

  function renderGpuHudLabels(fragment, labels, startSlot = 0) {
    let slot = startSlot;
    const renderLabels = mergeHeldGpuHudLabels(labels);
    for (let index = 0; index < renderLabels.length; index += 1) {
      const label = renderLabels[index] || {};
      const text = label.label || label.Label || "";
      if (!text) {
        continue;
      }

      const node = createGpuTextLabel(
        label.className || label.ClassName || "is-diagnostic",
        text,
        label.value || label.Value || "",
        {
          active: label.active ?? label.Active ?? true,
          slot: label.slot ?? label.Slot ?? slot,
          priority: label.priority || label.Priority || "mid",
          source: label.source || label.Source || "gpu-hud-dto",
          left: label.left ?? label.Left,
          top: label.top ?? label.Top,
          width: label.width ?? label.Width,
          height: label.height ?? label.Height,
          anchor: label.anchor || label.Anchor || "inside",
          held: Boolean(label.__held),
          holdAlpha: label.__holdAlpha ?? 1
        }
      );
      fragment.appendChild(node);
      slot += 1;
    }

    return slot;
  }

  function renderDtoGrid(fragment, grid) {
    if (!Array.isArray(grid) || grid.length <= 0) {
      return;
    }

    const columns = grid.some(cell => Number(cell.column ?? cell.Column) >= 3) ? 9 : 3;
    const rows = grid.some(cell => Number(cell.row ?? cell.Row) >= 3) ? 9 : 3;
    const isAimGrid = columns === 3 && rows === 3;
    const cellWidth = 100 / columns;
    const cellHeight = 80 / rows;
    for (let index = 0; index < grid.length; index += 1) {
      const cell = grid[index] || {};
      const score = clamp01(cell.score ?? cell.Score);
      if (score < 0.08) {
        continue;
      }

      const column = Math.max(0, Math.min(columns - 1, Number(cell.column ?? cell.Column ?? 0)));
      const row = Math.max(0, Math.min(rows - 1, Number(cell.row ?? cell.Row ?? 0)));
      const kind = String(cell.kind || cell.Kind || "scan").toLowerCase();
      const node = createRegion(
        `is-vision-heat ${isAimGrid ? "is-grid-3x3" : "is-grid-9x9"} is-grid-${kind}`,
        column * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight,
        "",
        "",
        { active: Boolean(cell.active ?? cell.Active), noLabel: true, priority: "low" }
      );
      node.style.zIndex = isAimGrid ? "5" : "1";
      node.style.setProperty("--heat-alpha", Math.max(0.035, score * 0.18).toFixed(3));
      node.style.setProperty("--heat-border-alpha", Math.max(0.16, score * 0.56).toFixed(3));
      fragment.appendChild(node);
    }
  }

  function normalizeGridScore(value) {
    const score = Number(value) || 0;
    return clamp01(score > 1 ? score / 255 : score);
  }

  function normalizeVision9x9Cells(source) {
    if (typeof source === "string") {
      const signature = source.trim().padEnd(81, "0").slice(0, 81);
      return Array.from({ length: 81 }, (_, index) => ({
        row: Math.floor(index / 9),
        column: index % 9,
        score: clamp01((Number.parseInt(signature[index], 16) || 0) / 15),
        kind: "vision",
        active: false
      }));
    }

    if (!Array.isArray(source)) {
      return [];
    }

    return Array.from({ length: 81 }, (_, index) => {
      const value = source[index];
      if (value && typeof value === "object") {
        return {
          row: Math.max(0, Math.min(8, Number(value.row ?? value.Row ?? Math.floor(index / 9)) || 0)),
          column: Math.max(0, Math.min(8, Number(value.column ?? value.Column ?? (index % 9)) || 0)),
          score: normalizeGridScore(value.score ?? value.Score ?? value.value ?? value.Value),
          kind: String(value.kind || value.Kind || "vision").toLowerCase(),
          active: Boolean(value.active ?? value.Active)
        };
      }

      return {
        row: Math.floor(index / 9),
        column: index % 9,
        score: normalizeGridScore(value),
        kind: "vision",
        active: false
      };
    });
  }

  function renderDtoVision9x9(fragment, dto, autoplay) {
    const source = readValueCaseInsensitive(dto, ["vision9x9", "Vision9x9", "vision9x9Heatmap", "Vision9x9Heatmap"])
      ?? readValueCaseInsensitive(autoplay?.milestones, ["firstDoorVision9x9Heatmap", "FirstDoorVision9x9Heatmap"])
      ?? readValueCaseInsensitive(autoplay, ["vision9x9Signature", "Vision9x9Signature"]);
    const cells = normalizeVision9x9Cells(source);
    if (cells.length <= 0) {
      return;
    }

    const cellWidth = 100 / 9;
    const cellHeight = 80 / 9;
    for (let index = 0; index < 81; index += 1) {
      const cell = cells[index] || {};
      const score = clamp01(cell.score ?? cell.Score);
      const kind = String(cell.kind || cell.Kind || "vision").toLowerCase();
      const column = Math.max(0, Math.min(8, Number(cell.column ?? cell.Column ?? (index % 9)) || 0));
      const row = Math.max(0, Math.min(8, Number(cell.row ?? cell.Row ?? Math.floor(index / 9)) || 0));
      const node = createRegion(
        `is-vision-heat is-grid-9x9 is-grid-${kind}`,
        column * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight,
        "",
        "",
        { active: Boolean(cell.active ?? cell.Active), noLabel: true, priority: "low" }
      );
      node.style.zIndex = "1";
      node.style.setProperty("--heat-alpha", Math.max(0.012, score * 0.16).toFixed(3));
      node.style.setProperty("--heat-border-alpha", Math.max(0.06, score * 0.50).toFixed(3));
      fragment.appendChild(node);
    }
  }

  function asArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    return value && typeof value === "object" ? [value] : [];
  }

  function normalizeCandidate(candidate, kind) {
    if (!candidate || typeof candidate !== "object") {
      return null;
    }

    const left = Number(candidate.left ?? candidate.Left);
    const top = Number(candidate.top ?? candidate.Top);
    const width = Number(candidate.width ?? candidate.Width);
    const height = Number(candidate.height ?? candidate.Height);
    if (Number.isFinite(left) && Number.isFinite(top) && Number.isFinite(width) && Number.isFinite(height)) {
      return {
        left,
        top,
        width,
        height,
        label: candidate.label || candidate.Label || (kind === "door" ? "door" : "corner"),
        value: candidate.value || candidate.Value || "",
        score: clamp01(candidate.score ?? candidate.Score),
        redScore: clamp01(candidate.redScore ?? candidate.RedScore),
        edgeScore: clamp01(candidate.edgeScore ?? candidate.EdgeScore)
      };
    }

    const column = Math.max(0, Math.min(8, Number(candidate.column ?? candidate.Column ?? 0) || 0));
    const row = Math.max(0, Math.min(8, Number(candidate.row ?? candidate.Row ?? 0) || 0));
    const columns = Math.max(1, Math.min(9, Number(candidate.columns ?? candidate.Columns ?? 1) || 1));
    const rows = Math.max(1, Math.min(9, Number(candidate.rows ?? candidate.Rows ?? 1) || 1));
    return {
      left: (column / 9) * 100,
      top: (row / 9) * 80,
      width: (columns / 9) * 100,
      height: (rows / 9) * 80,
      label: candidate.label || candidate.Label || (kind === "door" ? "door" : "corner"),
      value: candidate.value || candidate.Value || "",
      score: clamp01(candidate.score ?? candidate.Score),
      redScore: clamp01(candidate.redScore ?? candidate.RedScore),
      edgeScore: clamp01(candidate.edgeScore ?? candidate.EdgeScore)
    };
  }

  function renderCandidateList(fragment, candidates, kind) {
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = normalizeCandidate(candidates[index], kind);
      if (!candidate) {
        continue;
      }

      const value = candidate.value || `score=${candidate.score.toFixed(2)} red=${candidate.redScore.toFixed(2)} edge=${candidate.edgeScore.toFixed(2)}`;
      const node = createRegion(
        kind === "door" ? "is-door is-door-candidate" : "is-wall is-corner-candidate",
        candidate.left,
        candidate.top,
        candidate.width,
        candidate.height,
        candidate.label,
        value,
        { active: true, slot: index, priority: kind === "door" ? "high" : "mid" }
      );
      node.style.zIndex = kind === "door" ? "42" : "34";
      node.dataset.candidateKind = kind;
      fragment.appendChild(node);
    }
  }

  function renderCandidateLabels(fragment, candidates, kind, startSlot = 0) {
    let slot = startSlot;
    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = normalizeCandidate(candidates[index], kind);
      if (!candidate) {
        continue;
      }

      const value = candidate.value || `score=${candidate.score.toFixed(2)} red=${candidate.redScore.toFixed(2)} edge=${candidate.edgeScore.toFixed(2)}`;
      const node = createGpuTextLabel(
        kind === "door" ? "is-door is-door-candidate" : "is-wall is-corner-candidate",
        kind === "door" ? "DOOR" : "CORNER",
        value,
        {
          active: true,
          slot,
          priority: kind === "door" ? "high" : "mid",
          source: "gpu-hud-rect",
          left: candidate.left,
          top: candidate.top,
          width: candidate.width,
          height: candidate.height,
          anchor: "below"
        }
      );
      node.dataset.candidateKind = kind;
      fragment.appendChild(node);
      slot += 1;
    }

    return slot;
  }

  function normalizeEnemyCircle(circle) {
    if (!circle || typeof circle !== "object") {
      return null;
    }

    const typeRaw = String(circle.type || circle.Type || circle.source || circle.Source || "visual").toLowerCase();
    const type = typeRaw === "audio" || typeRaw === "av" ? typeRaw : "visual";
    const confidence = clamp01(circle.confidence ?? circle.Confidence ?? circle.score ?? circle.Score);
    if (confidence < 0.08 && !(circle.active ?? circle.Active)) {
      return null;
    }

    const yaw = Number(circle.yaw ?? circle.Yaw ?? 0) || 0;
    const direction = String(circle.direction || circle.Direction || (yaw < -4 ? "left" : (yaw > 4 ? "right" : "front"))).toLowerCase();
    const yawClamped = Math.max(-32, Math.min(32, yaw));
    const fallbackLeft = type === "audio"
      ? (direction === "left" ? 18 : (direction === "right" ? 66 : 41))
      : Math.max(10, Math.min(78, 43 + (yawClamped / 32) * 22));
    const left = Number(circle.left ?? circle.Left ?? fallbackLeft);
    const top = Number(circle.top ?? circle.Top ?? (type === "audio" ? 34 : 31));
    const width = Number(circle.width ?? circle.Width ?? (type === "visual" ? 12 : (type === "audio" ? 21 : 17)));
    const height = Number(circle.height ?? circle.Height ?? (type === "visual" ? 14 : (type === "audio" ? 23 : 19)));
    return {
      type,
      yaw,
      direction,
      confidence,
      left,
      top,
      width,
      height,
      active: Boolean(circle.active ?? circle.Active ?? true),
      label: circle.label || circle.Label || (type === "audio" ? "ENEMY AUDIO" : (type === "av" ? "ENEMY A/V" : "ENEMY")),
      value: circle.value || circle.Value || `${type} ${direction} ${confidence.toFixed(2)}`
    };
  }

  function styleEnemyCircleNode(node, circle) {
    if (!node?.style || !circle) {
      return;
    }

    node.dataset.enemyType = circle.type;
    node.dataset.enemyDirection = circle.direction;
    node.dataset.enemyYaw = String(Math.round(circle.yaw));
    node.dataset.enemyConfidence = circle.confidence.toFixed(2);
    node.style.zIndex = circle.type === "av" ? "43" : (circle.type === "visual" ? "42" : "40");
    if (circle.type === "audio") {
      node.style.borderColor = "rgba(255,190,74,.88)";
      node.style.background = "rgba(255,174,42,.035)";
      node.style.boxShadow = "0 0 15px rgba(255,180,48,.22), inset 0 0 0 1px rgba(255,238,184,.12)";
    } else if (circle.type === "av") {
      node.style.borderColor = "rgba(255,74,68,.94)";
      node.style.background = "rgba(255,32,32,.040)";
      node.style.boxShadow = "0 0 0 1px rgba(255,190,74,.42), 0 0 16px rgba(255,54,40,.26), inset 0 0 0 1px rgba(255,226,186,.16)";
    }
  }

  function renderDtoEnemyCircle(fragment, circle) {
    const normalized = normalizeEnemyCircle(circle);
    if (!normalized) {
      return false;
    }

    const node = createRegion(
      `is-enemy-circle is-enemy-circle-${normalized.type}`,
      normalized.left,
      normalized.top,
      normalized.width,
      normalized.height,
      normalized.label,
      normalized.value,
      { active: normalized.active, priority: "high" }
    );
    styleEnemyCircleNode(node, normalized);
    fragment.appendChild(node);
    return true;
  }

  function renderDtoEnemyCircleLabel(fragment, circle, slot = 0) {
    const normalized = normalizeEnemyCircle(circle);
    if (!normalized) {
      return false;
    }

    const node = createGpuTextLabel(
      `is-enemy-circle is-enemy-circle-${normalized.type}`,
      normalized.label,
      normalized.value,
      {
        active: normalized.active,
        slot,
        priority: "high",
        source: "gpu-hud-rect",
        left: normalized.left,
        top: normalized.top,
        width: normalized.width,
        height: normalized.height,
        anchor: "below"
      }
    );
    node.dataset.enemyType = normalized.type;
    node.dataset.enemyDirection = normalized.direction;
    node.dataset.enemyYaw = String(Math.round(normalized.yaw));
    node.dataset.enemyConfidence = normalized.confidence.toFixed(2);
    fragment.appendChild(node);
    return true;
  }

  function resolveCandidateSources(dto, autoplay) {
    const doorCandidates = asArray(readValueCaseInsensitive(dto, ["doorCandidates", "DoorCandidates"]));
    const cornerCandidates = asArray(readValueCaseInsensitive(dto, ["cornerCandidates", "CornerCandidates"]));
    const box = readValueCaseInsensitive(autoplay?.milestones, ["firstDoorVision9x9Box", "FirstDoorVision9x9Box"]);
    if (!box || typeof box !== "object") {
      return { doorCandidates, cornerCandidates };
    }

    const kind = String(box.kind || box.Kind || "").toLowerCase();
    if (kind === "first-door-wall-pattern" || kind === "first-door-floor-red") {
      return { doorCandidates, cornerCandidates: cornerCandidates.concat(box) };
    }

    return { doorCandidates: doorCandidates.concat(box), cornerCandidates };
  }

  function renderDtoCandidates(fragment, dto, autoplay) {
    const sources = resolveCandidateSources(dto, autoplay);
    renderCandidateList(fragment, sources.doorCandidates, "door");
    renderCandidateList(fragment, sources.cornerCandidates, "corner");
  }

  function renderDtoCandidateLabels(fragment, dto, autoplay, startSlot = 0) {
    const sources = resolveCandidateSources(dto, autoplay);
    let slot = renderCandidateLabels(fragment, sources.doorCandidates, "door", startSlot);
    slot = renderCandidateLabels(fragment, sources.cornerCandidates, "corner", slot);
    return slot;
  }

  function renderDtoRegions(fragment, regions, options = {}) {
    if (!Array.isArray(regions)) {
      return options.labelStartSlot || 0;
    }

    let labelSlot = options.labelStartSlot || 0;
    for (let index = 0; index < regions.length; index += 1) {
      const region = regions[index] || {};
      const kind = String(region.kind || region.Kind || "objective").toLowerCase();
      if (options.skipEnemyCircle && kind === "enemy-circle") {
        continue;
      }
      if (options.gpuBacked && !isHighPriorityRegion(region)) {
        continue;
      }
      if (options.gpuBacked) {
        const className = region.className || region.ClassName || `is-${kind}`;
        fragment.appendChild(createGpuTextLabel(
          className,
          region.label || region.Label || kind.toUpperCase(),
          region.value || region.Value || "",
          {
            active: Boolean(region.active ?? region.Active),
            priority: String(region.priority || region.Priority || "mid").toLowerCase(),
            slot: labelSlot,
            source: "gpu-hud-rect",
            left: region.left ?? region.Left,
            top: region.top ?? region.Top,
            width: region.width ?? region.Width,
            height: region.height ?? region.Height,
            anchor: "inside"
          }
        ));
        labelSlot += 1;
        continue;
      }

      const className = region.className || region.ClassName || `is-${kind}`;
      const node = createRegion(
        className,
        Number(region.left ?? region.Left ?? 0),
        Number(region.top ?? region.Top ?? 0),
        Number(region.width ?? region.Width ?? 0),
        Number(region.height ?? region.Height ?? 0),
        region.label || region.Label || "",
        region.value || region.Value || "",
        {
          active: Boolean(region.active ?? region.Active),
          priority: String(region.priority || region.Priority || "mid").toLowerCase(),
          slot: index
        }
      );
      if (kind === "combat") {
        styleCombatNode(node);
      } else if (kind === "bridge") {
        styleBridgeNode(node);
      } else if (kind === "zoe") {
        styleZoeNode(node, region);
      } else if (kind === "enemy-circle") {
        styleEnemyCircleNode(node, normalizeEnemyCircle(region));
      }

      fragment.appendChild(node);
    }

    return labelSlot;
  }

  function renderDtoUseProbe(fragment, useProbe) {
    if (!useProbe || !(useProbe.active ?? useProbe.Active)) {
      return;
    }

    const direction = String(useProbe.direction || useProbe.Direction || "none").toLowerCase();
    const arrow = document.createElement("div");
    arrow.className = `debug-probe-arrow is-${direction}`;
    arrow.textContent = direction === "left" ? "<" : (direction === "right" ? ">" : "^");
    arrow.title = `UseProbe ${direction}; frames=${Number(useProbe.frames ?? useProbe.Frames ?? 0)} conf=${clamp01(useProbe.confidence ?? useProbe.Confidence).toFixed(2)}`;
    fragment.appendChild(arrow);
  }

  function renderDtoOverlay(overlay, dto, options = {}) {
    const fragment = document.createDocumentFragment();
    const gpuBacked = isGpuBackedOverlay(options);
    if (gpuBacked) {
      const gpuLabels = normalizeGpuHudLabels(dto);
      let slot = gpuLabels.length > 0
        ? renderGpuHudLabels(fragment, gpuLabels, 0)
        : renderDtoCandidateLabels(fragment, dto, options.autoplay || null, 0);
      if (gpuLabels.length <= 0) {
        const enemyCircle = readValueCaseInsensitive(dto, ["enemyCircle", "EnemyCircle"]);
        const renderedEnemyCircle = renderDtoEnemyCircleLabel(fragment, enemyCircle, slot);
        if (renderedEnemyCircle) {
          slot += 1;
        }
        slot = renderDtoRegions(fragment, dto.regions || dto.Regions || [], { skipEnemyCircle: renderedEnemyCircle, gpuBacked, labelStartSlot: slot });
      }
      if (dto.kairosBlink ?? dto.KairosBlink) {
        fragment.appendChild(createGpuTextLabel(
          "is-kairos-pulse",
          dto.kairosLabel || dto.KairosLabel || "Kairos",
          "",
          { active: true, slot, priority: "high", source: "gpu-hud-shader" }
        ));
      }
    } else {
      renderDtoVision9x9(fragment, dto, options.autoplay || null);
      renderDtoGrid(fragment, dto.grid || dto.Grid || []);
      renderDtoCandidates(fragment, dto, options.autoplay || null);
      const enemyCircle = readValueCaseInsensitive(dto, ["enemyCircle", "EnemyCircle"]);
      const renderedEnemyCircle = renderDtoEnemyCircle(fragment, enemyCircle);
      renderDtoRegions(fragment, dto.regions || dto.Regions || [], { skipEnemyCircle: renderedEnemyCircle, gpuBacked });
      if (dto.kairosBlink ?? dto.KairosBlink) {
        fragment.appendChild(createRegion(
          "is-kairos-pulse",
          24,
          33,
          52,
          24,
          dto.kairosLabel || dto.KairosLabel || "Kairos",
          "",
          { active: true, slot: 0, priority: "high" }
        ));
      }
      renderDtoUseProbe(fragment, dto.useProbe || dto.UseProbe);
    }
    overlay.dataset.cssOverlayMode = gpuBacked ? "reduced" : "full";
    overlay.replaceChildren(fragment);
    return true;
  }

  function appendVision9x9Heatmap(fragment, milestones) {
    const heatmap = Array.isArray(milestones?.firstDoorVision9x9Heatmap)
      ? milestones.firstDoorVision9x9Heatmap
      : [];
    if (heatmap.length <= 0) {
      return;
    }

    const cellWidth = 100 / 9;
    const cellHeight = 80 / 9;
    for (let index = 0; index < Math.min(81, heatmap.length); index += 1) {
      const score = clamp01(Number(heatmap[index] || 0));
      if (score < 0.08) {
        continue;
      }

      const column = index % 9;
      const row = Math.floor(index / 9);
      const cell = createRegion(
        "is-vision-heat",
        column * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight,
        "",
        "",
        { active: false, noLabel: true, priority: "low" }
      );
      cell.style.zIndex = "1";
      cell.style.setProperty("--heat-alpha", Math.max(0.035, score * 0.18).toFixed(3));
      cell.style.setProperty("--heat-border-alpha", Math.max(0.16, score * 0.56).toFixed(3));
      fragment.appendChild(cell);
    }
  }

  function appendKairosPulse(fragment, autoplay) {
    const kairos = resolveKairosSignal(autoplay);
    if (!kairos) {
      return;
    }

    fragment.appendChild(createRegion(
      "is-kairos-pulse",
      24,
      33,
      52,
      24,
      kairos,
      "",
      { active: true, slot: 0, priority: "high" }
    ));
  }

  function appendKairosAxisPulse(fragment, autoplay) {
    const label = resolveKairosAxisLabel(autoplay);
    if (!label) {
      return;
    }

    const axis = label.split(" ")[0].toLowerCase();
    fragment.appendChild(createRegion(
      `is-kairos-axis is-axis-${axis}`,
      36,
      62,
      28,
      8,
      "KAIROS",
      label,
      { active: true, slot: 2, priority: axis === "pathos" ? "high" : "mid" }
    ));
  }

  function appendUseProbeArrow(fragment, autoplay) {
    const probeFrames = Number(autoplay?.wallUseProbeFrames || 0);
    const latchFrames = Number(autoplay?.firstDoorUseLatchFrames || 0);
    if (probeFrames <= 0 && latchFrames <= 0) {
      return;
    }

    const turn = autoplay?.wallUseProbeTurn === "left" || autoplay?.wallUseProbeTurn === "right"
      ? autoplay.wallUseProbeTurn
      : "none";
    const arrow = document.createElement("div");
    arrow.className = `debug-probe-arrow is-${turn}`;
    arrow.textContent = turn === "left" ? "<" : (turn === "right" ? ">" : "^");
    arrow.title = `UseProbe ${turn}; frames=${probeFrames || latchFrames}`;
    fragment.appendChild(arrow);
  }

  function styleCombatNode(node) {
    if (!node?.style) {
      return;
    }

    node.style.borderColor = "rgba(255,72,64,.92)";
    node.style.background = "rgba(60,8,8,.22)";
    node.style.color = "#ffd4c8";
    node.style.boxShadow = "0 0 16px rgba(255,48,32,.35), inset 0 0 0 1px rgba(255,180,160,.10)";
  }

  function styleBridgeNode(node) {
    if (!node?.style) {
      return;
    }

    node.style.borderColor = "rgba(94,232,204,.86)";
    node.style.background = "rgba(3,38,35,.18)";
    node.style.color = "#cdfcf2";
    node.style.boxShadow = "0 0 14px rgba(80,230,200,.24), inset 0 0 0 1px rgba(170,255,236,.10)";
  }

  function styleZoeNode(node, region = {}) {
    if (!node?.style) {
      return;
    }

    const label = `${region.label || region.Label || ""} ${region.value || region.Value || ""}`;
    const vetoed = /veto/i.test(label);
    if (node.classList?.toggle) {
      node.classList.toggle("is-zoe-veto", vetoed);
      node.classList.toggle("is-zoe-warning", !vetoed);
    } else {
      node.className = `${node.className || ""} ${vetoed ? "is-zoe-veto" : "is-zoe-warning"}`.trim();
    }
    node.style.borderColor = vetoed ? "rgba(255,73,73,.92)" : "rgba(255,189,87,.88)";
    node.style.background = vetoed ? "rgba(64,4,7,.24)" : "rgba(54,34,5,.18)";
    node.style.color = vetoed ? "#ffd4d4" : "#ffe6ae";
    node.style.boxShadow = vetoed
      ? "0 0 18px rgba(255,48,32,.36), inset 0 0 0 1px rgba(255,180,160,.12)"
      : "0 0 14px rgba(255,180,60,.24), inset 0 0 0 1px rgba(255,228,160,.10)";
  }

  function hasActiveLabel(activeDetections, predicate) {
    if (!activeDetections || typeof activeDetections.forEach !== "function") {
      return false;
    }

    let matched = false;
    activeDetections.forEach(label => {
      if (!matched && predicate(String(label || ""))) {
        matched = true;
      }
    });
    return matched;
  }

  function appendCombatAlert(fragment, autoplay, activeDetections, options = {}) {
    const visual = clamp01(autoplay?.enemyConfidence);
    const center = clamp01(autoplay?.enemyCenterCellConfidence);
    const peak = clamp01(autoplay?.enemyAllRegionPeak);
    const audio = clamp01(autoplay?.audioEnemyConfidence);
    const stageText = `${autoplay?.stage || ""} ${autoplay?.controlPipeline || ""} ${autoplay?.mobilityMode || ""} ${autoplay?.safetyReason || ""}`;
    const active = visual > 0.22
      || center > 0.14
      || peak > 0.28
      || audio > 0.24
      || Boolean(autoplay?.action?.fire || autoplay?.currentAction?.fire)
      || /combat|enemy|fire/i.test(stageText)
      || hasActiveLabel(activeDetections, label => /combat|enemy|threat|audio-enemy/i.test(label));
    if (!active) {
      return;
    }

    const visualTurn = autoplay?.enemyTurn || "none";
    const audioDirection = autoplay?.audioEnemyDirection || "none";
    const firing = Boolean(autoplay?.action?.fire || autoplay?.currentAction?.fire || autoplay?.enemyFireReady || autoplay?.visualEnemyFireReady);
    const value = `vis=${visual.toFixed(2)} ${visualTurn} aud=${audio.toFixed(2)} ${audioDirection} center=${center.toFixed(2)} ${firing ? "FIRE" : "HOLD"}`;
    if (options.gpuBacked) {
      fragment.appendChild(createGpuTextLabel(
        "is-combat is-combat-alert",
        "COMBAT",
        value,
        {
          active: true,
          slot: options.slot ?? 0,
          priority: "high",
          source: "gpu-hud-shader",
          left: 28,
          top: 5,
          width: 44,
          height: 12,
          anchor: "inside"
        }
      ));
      return true;
    }

    const node = createRegion(
      "is-combat is-combat-alert",
      28,
      5,
      44,
      12,
      "COMBAT",
      value,
      { active: true, slot: 0, priority: "high" }
    );
    styleCombatNode(node);
    fragment.appendChild(node);
    return true;
  }

  function appendRuntimeGpuLabel(fragment, className, label, value, slot, options = {}) {
    fragment.appendChild(createGpuTextLabel(
      className,
      label,
      value,
      {
        active: options.active !== false,
        slot,
        priority: options.priority || "mid",
        source: options.source || "gpu-hud-shader",
        left: options.left,
        top: options.top,
        width: options.width,
        height: options.height,
        anchor: options.anchor
      }
    ));
    return slot + 1;
  }

  function appendRadarHudLabels(fragment, slot) {
    const labels = [
      ["is-radar-front", "FRONT", 84.9, 3.4, 7.2, 3.0],
      ["is-radar-left", "L-TURN", 75.0, 15.5, 8.4, 3.0],
      ["is-radar-right", "R-TURN", 92.3, 15.5, 8.4, 3.0],
      ["is-radar-rear", "REAR", 84.9, 29.3, 7.2, 3.0]
    ];
    let nextSlot = slot;
    for (const [className, label, left, top, width, height] of labels) {
      fragment.appendChild(createGpuTextLabel(
        `is-radar-label ${className}`,
        label,
        "",
        {
          active: true,
          slot: nextSlot,
          priority: "low",
          source: "ego-radar-js-label",
          left,
          top,
          width,
          height,
          anchor: "inside"
        }
      ));
      nextSlot += 1;
    }
    return nextSlot;
  }

  function renderGpuRuntimeOverlay(fragment, autoplay, context) {
    let slot = 0;
    if (appendCombatAlert(fragment, autoplay, context.activeDetections, { gpuBacked: true, slot })) {
      slot += 1;
    }

    if (context.showPriority) {
      slot = appendRuntimeGpuLabel(fragment, `is-objective is-priority-axis ${resolvePriorityAxisClass(autoplay, context.priorityLabel)}`, "PRIORITY:", context.priorityLabel, slot, {
        priority: "high",
        active: Boolean(autoplay.enabled),
        left: 3.0,
        top: 55.0,
        width: 25.5,
        height: 8.4,
        anchor: "inside"
      });
    }

    slot = appendRadarHudLabels(fragment, slot);

    const doorOpened = context.doorOpened;
    if (context.showEnemy && doorOpened && (Number(autoplay.enemyConfidence || 0) > 0.22 || Number(autoplay.enemyCenterCellConfidence || 0) > 0.14 || Number(autoplay.enemyAllRegionPeak || 0) > 0.28)) {
      slot = appendRuntimeGpuLabel(
        fragment,
        "is-enemy is-target-card",
        "ENEMY:",
        `${autoplay.enemyCluster || "unknown"} ${Number(autoplay.enemyConfidence || 0).toFixed(2)} all=${Number(autoplay.enemyAllRegionPeak || 0).toFixed(2)} ${autoplay.enemyFireReady ? "fire" : "hold"}`,
        slot,
        { priority: "high" }
      );
    }

    if (context.showFoot && (Number(autoplay.priorFootObstacleScore || 0) > 0.18
      || Number(autoplay.footObstacleFlickerScore || 0) > 0.32
      || Number(autoplay.footObstacleBounceFrames || 0) > 0
      || Number(autoplay.inputStallFrames || 0) > 0)) {
      slot = appendRuntimeGpuLabel(
        fragment,
        "is-foot",
        "FOOT",
        `obs=${Number(autoplay.priorFootObstacleScore || 0).toFixed(2)} flicker=${Number(autoplay.footObstacleFlickerScore || 0).toFixed(2)} bounce=${autoplay.footObstacleBounceFrames || 0} stall=${autoplay.inputStallFrames || 0}`,
        slot,
        { priority: Number(autoplay.footObstacleBounceFrames || 0) >= 3 ? "high" : "mid" }
      );
    }

    if (context.showWall && context.wallAvoidActive) {
      slot = appendRuntimeGpuLabel(
        fragment,
        "is-wall",
        "WALL",
        `${autoplay.safetyReason || "active"} ${autoplay.mobilityMode || "avoid"}`,
        slot,
        { priority: "high" }
      );
    }

    const milestones = context.milestones;
    if (context.showDoor && context.firstDoorPhase && (Boolean(milestones.firstDoorCorridorLocated) || Number(milestones.firstDoorUseSignature || 0) > 0.48 || Number(milestones.spawnCorridorGapScore || 0) > 0.18)) {
      slot = appendRuntimeGpuLabel(
        fragment,
        "is-door",
        "DOOR",
        `corr=${milestones.firstDoorCorridorLocated ? "yes" : "no"} use=${Number(milestones.firstDoorUseSignature || 0).toFixed(2)} 3x3=${Number(milestones.firstDoorUse3x3Score || 0).toFixed(2)}/${milestones.firstDoorUse3x3Turn || "none"}`,
        slot,
        { priority: "high" }
      );
    }

    const firstDoorVision9x9Box = milestones.firstDoorVision9x9Box || null;
    if (context.showDoor && context.firstDoorPhase && firstDoorVision9x9Box && Number(firstDoorVision9x9Box.score || 0) >= 0.24) {
      const wallPattern = firstDoorVision9x9Box.kind === "first-door-wall-pattern";
      const floorRed = firstDoorVision9x9Box.kind === "first-door-floor-red";
      slot = appendRuntimeGpuLabel(
        fragment,
        wallPattern || floorRed ? "is-wall is-corner-candidate" : "is-door is-door-candidate",
        floorRed ? "FLOOR RED" : (wallPattern ? "WALL PATTERN" : "DOOR 9x9"),
        `patch=${Number(firstDoorVision9x9Box.score || 0).toFixed(2)} red=${Number(firstDoorVision9x9Box.redScore || 0).toFixed(2)} edge=${Number(firstDoorVision9x9Box.edgeScore || 0).toFixed(2)}`,
        slot,
        { priority: wallPattern || floorRed ? "mid" : "high", source: "gpu-hud-rect" }
      );
    }

    if (context.showWall && context.firstDoorPhase && Number(autoplay.cornerSignal || 0) >= 0.48) {
      slot = appendRuntimeGpuLabel(
        fragment,
        "is-wall is-corner-candidate",
        "CORNER",
        `corner=${Number(autoplay.cornerSignal || 0).toFixed(2)}`,
        slot,
        { priority: "mid", source: "gpu-hud-rect" }
      );
    }

    if (context.showComputer && doorOpened && (Number(milestones.computerRoomScore || 0) > 0.28 || Boolean(milestones.computerRoomEntered))) {
      slot = appendRuntimeGpuLabel(
        fragment,
        "is-computer",
        "COMPUTER",
        `${Number(milestones.computerRoomScore || 0).toFixed(2)} blue=${Number(milestones.computerBlueScore || 0).toFixed(2)} red=${Number(milestones.computerRedLightScore || 0).toFixed(2)} dark=${Number(milestones.computerDarkPanelScore || 0).toFixed(2)} panel=${Number(milestones.computerPanelScore || 0).toFixed(2)}`,
        slot,
        { priority: "mid" }
      );
    }

    if (context.showSpatial && autoplay.spatialSnapshot?.eventDetected) {
      const spatial = autoplay.spatialSnapshot;
      slot = appendRuntimeGpuLabel(
        fragment,
        "is-spatial",
        "SPATIAL",
        `${spatial.eventType || "event"} ${Number(spatial.confidence || 0).toFixed(2)}`,
        slot,
        { priority: "high" }
      );
    }

    if (context.showHealth && (autoplay.healthSensor?.retryRequested || autoplay.healthLikelyDead || Number(autoplay.healthZeroScore || 0) >= 0.78)) {
      const health = autoplay.healthSensor || {};
      slot = appendRuntimeGpuLabel(
        fragment,
        "is-health",
        "HEALTH",
        `z=${Number(health.zeroScore ?? autoplay.healthZeroScore ?? 0).toFixed(2)} face=${Number(health.faceQuantizedFrameChange ?? autoplay.faceQuantizedFrameChange ?? 255).toFixed(2)}`,
        slot,
        { priority: "high" }
      );
    }
  }

  function detectorEnabled(key, activeDetections, detectionVisibility) {
    const visible = typeof detectionVisibility?.get === "function"
      ? detectionVisibility.get(key) !== false
      : detectionVisibility?.[key] !== false;
    return visible;
  }

  function renderDebugOverlay(overlay, status = {}, options = {}) {
    if (!overlay) {
      return false;
    }

    if (shouldSkipOverlayRender(overlay, status, options)) {
      return true;
    }

    const autoplay = status?.autoplay || {};
    const dto = resolveDebugOverlayDto(autoplay);
    if (dto && (
      Array.isArray(dto.grid || dto.Grid)
      || Array.isArray(dto.regions || dto.Regions)
      || readValueCaseInsensitive(dto, ["vision9x9", "Vision9x9", "vision9x9Heatmap", "Vision9x9Heatmap"]) !== undefined
      || readValueCaseInsensitive(dto, ["doorCandidates", "DoorCandidates"]) !== undefined
      || readValueCaseInsensitive(dto, ["cornerCandidates", "CornerCandidates"]) !== undefined
      || readValueCaseInsensitive(dto, ["enemyCircle", "EnemyCircle"]) !== undefined
      || readValueCaseInsensitive(autoplay?.milestones, ["firstDoorVision9x9Heatmap", "FirstDoorVision9x9Heatmap"]) !== undefined
      || readValueCaseInsensitive(autoplay?.milestones, ["firstDoorVision9x9Box", "FirstDoorVision9x9Box"]) !== undefined
    )) {
      return renderDtoOverlay(overlay, dto, { ...options, autoplay });
    }

    const milestones = autoplay.milestones || {};
    const gpuBacked = isGpuBackedOverlay(options);
    const semantic = autoplay.semanticMemory || {};
    const objective = autoplay.objective || semantic.objective || "none";
    const pipeline = autoplay.controlPipeline || semantic.phase || "Idle";
    const priorityLabel = resolvePriorityAction(autoplay);
    const doorOpened = Number(milestones.doorOpened || 0) > 0;
    const firstDoorPhase = !doorOpened;
    const activeDetections = new Set(Array.isArray(autoplay.activeDetections) ? autoplay.activeDetections : []);
    const detectionVisibility = options.detectionVisibility || {};
    const showMotion = detectorEnabled("motion", activeDetections, detectionVisibility);
    const showPriority = detectorEnabled("objective", activeDetections, detectionVisibility);
    const showDoor = detectorEnabled("door", activeDetections, detectionVisibility);
    const showWall = detectorEnabled("wall", activeDetections, detectionVisibility);
    const showEnemy = detectorEnabled("enemy", activeDetections, detectionVisibility);
    const showComputer = detectorEnabled("computer", activeDetections, detectionVisibility);
    const showFoot = detectorEnabled("foot", activeDetections, detectionVisibility);
    const showHud = detectorEnabled("hud", activeDetections, detectionVisibility);
    const showSpatial = detectorEnabled("spatial", activeDetections, detectionVisibility);
    const showHealth = detectorEnabled("health", activeDetections, detectionVisibility);
    const wallAvoidActive = /wall|corner|stuck|detach|escape|avoid|survey/.test(String(autoplay.safetyReason || ""))
      || /wall|corner|stuck|detach|escape|avoid|survey/.test(String(autoplay.mobilityMode || ""));
    const region9 = String(autoplay.region9Signature || "000000000").padEnd(9, "0").slice(0, 9);
    const motion9 = String(autoplay.motion9Signature || "000000000").padEnd(9, "0").slice(0, 9);
    const fragment = document.createDocumentFragment();
    if (gpuBacked) {
      renderGpuRuntimeOverlay(fragment, autoplay, {
        activeDetections,
        priorityLabel,
        milestones,
        doorOpened,
        firstDoorPhase,
        showPriority,
        showDoor,
        showWall,
        showEnemy,
        showComputer,
        showFoot,
        showSpatial,
        showHealth,
        wallAvoidActive
      });
      overlay.dataset.cssOverlayMode = "reduced";
      overlay.replaceChildren(fragment);
      return true;
    }

    const viewHeight = 80;
    const cellWidth = 100 / 3;
    const cellHeight = viewHeight / 3;
    appendVision9x9Heatmap(fragment, milestones);

    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        const index = row * 3 + column;
        const regionBucket = Number.parseInt(region9[index], 16) || 0;
        const motionBucket = Number.parseInt(motion9[index], 16) || 0;
        const value = `${region9[index]}/${motion9[index]}\nmotion score: ${(motionBucket / 15).toFixed(2)}\nmotion: ${motionBucket}/15\nscore: ${(regionBucket / 15).toFixed(2)}`;
        let className = "is-vision";
        if (index === 4 && Number(autoplay.enemyCenterCellConfidence || 0) > 0.18) {
          className = "is-enemy";
        } else if (index === 2 || index === 5 || index === 8) {
          className = "is-gap";
        }
        const motionActive = Number(motion9[index] || 0) >= 4;
        if (showMotion && (motionActive || (index === 4 && Number(autoplay.enemyCenterCellConfidence || 0) > 0.18) || (firstDoorPhase && (index === 2 || index === 5 || index === 8) && Number(milestones.spawnCorridorGapScore || 0) > 0.18))) {
          const region = createRegion(
            className,
            column * cellWidth,
            row * cellHeight,
            cellWidth,
            cellHeight,
            `r${index}`,
            value,
            { active: true, slot: row, priority: "low" }
          );
          region.style.zIndex = "2";
          fragment.appendChild(region);
        }
      }
    }

    appendKairosPulse(fragment, autoplay);
    appendKairosAxisPulse(fragment, autoplay);
    appendUseProbeArrow(fragment, autoplay);
    appendCombatAlert(fragment, autoplay, activeDetections);

    if (showPriority) {
      fragment.appendChild(createRegion(
        `is-objective is-priority-axis ${resolvePriorityAxisClass(autoplay, priorityLabel)}`,
        61,
        5.6,
        23,
        10,
        "PRIORITY:",
        priorityLabel,
        { active: Boolean(autoplay.enabled), slot: 0, priority: "high" }
      ));
    }

    if (showEnemy && doorOpened && (Number(autoplay.enemyConfidence || 0) > 0.22 || Number(autoplay.enemyCenterCellConfidence || 0) > 0.14 || Number(autoplay.enemyAllRegionPeak || 0) > 0.28)) {
      const enemyLeft = autoplay.enemyTurn === "right" ? 67 : (autoplay.enemyTurn === "left" ? 13 : 41);
      fragment.appendChild(createRegion("is-enemy-ring", enemyLeft, 48, 14, 14, "", "", { active: true, noLabel: true, priority: "high" }));
      fragment.appendChild(createRegion(
        "is-enemy is-target-card",
        autoplay.enemyTurn === "right" ? 63 : (autoplay.enemyTurn === "left" ? 9 : 34),
        46,
        18,
        12,
        "ENEMY:",
        `${autoplay.enemyCluster || "unknown"} ${Number(autoplay.enemyConfidence || 0).toFixed(2)} all=${Number(autoplay.enemyAllRegionPeak || 0).toFixed(2)} ${autoplay.enemyFireReady ? "fire" : "hold"}`,
        { active: true, slot: 0, priority: "high" }
      ));
    }

    if (showFoot && (Number(autoplay.priorFootObstacleScore || 0) > 0.18
      || Number(autoplay.footObstacleFlickerScore || 0) > 0.32
      || Number(autoplay.footObstacleBounceFrames || 0) > 0
      || Number(autoplay.inputStallFrames || 0) > 0)) {
      fragment.appendChild(createRegion(
        "is-foot",
        30,
        64,
        42,
        16,
        "foot",
        `obs=${Number(autoplay.priorFootObstacleScore || 0).toFixed(2)} flicker=${Number(autoplay.footObstacleFlickerScore || 0).toFixed(2)} bounce=${autoplay.footObstacleBounceFrames || 0} stall=${autoplay.inputStallFrames || 0}`,
        { active: true, slot: 3, priority: Number(autoplay.footObstacleBounceFrames || 0) >= 3 ? "high" : "mid" }
      ));
    }

    if (showWall && wallAvoidActive) {
      fragment.appendChild(createRegion(
        "is-wall",
        autoplay.wallHugSide === "right" ? 58 : 4,
        22,
        38,
        42,
        "WALL AVOID",
        `${autoplay.safetyReason || "active"}\n${autoplay.mobilityMode || "avoid"}`,
        { active: true, slot: 1, priority: "high" }
      ));
    }

    if (showDoor && firstDoorPhase && (Boolean(milestones.firstDoorCorridorLocated) || Number(milestones.firstDoorUseSignature || 0) > 0.48 || Number(milestones.spawnCorridorGapScore || 0) > 0.18)) {
      fragment.appendChild(createRegion(
        "is-door",
        30,
        18,
        40,
        42,
        "door",
        `corr=${milestones.firstDoorCorridorLocated ? "yes" : "no"} use=${Number(milestones.firstDoorUseSignature || 0).toFixed(2)} 3x3=${Number(milestones.firstDoorUse3x3Score || 0).toFixed(2)}/${milestones.firstDoorUse3x3Turn || "none"}`,
        { active: true, slot: 1, priority: "high" }
      ));
    }

    const firstDoorVision9x9Box = milestones.firstDoorVision9x9Box || null;
    if (showDoor && firstDoorPhase && firstDoorVision9x9Box && Number(firstDoorVision9x9Box.score || 0) >= 0.24) {
      const boxColumn = Number(firstDoorVision9x9Box.column || 0);
      const boxRow = Number(firstDoorVision9x9Box.row || 0);
      const boxColumns = Math.max(1, Number(firstDoorVision9x9Box.columns || 2));
      const boxRows = Math.max(1, Number(firstDoorVision9x9Box.rows || 2));
      const wallPattern = firstDoorVision9x9Box.kind === "first-door-wall-pattern";
      const floorRed = firstDoorVision9x9Box.kind === "first-door-floor-red";
      fragment.appendChild(createRegion(
        wallPattern || floorRed ? "is-wall is-corner-candidate" : "is-door is-door-candidate",
        (boxColumn / 9) * 100,
        (boxRow / 9) * 80,
        (boxColumns / 9) * 100,
        (boxRows / 9) * 80,
        floorRed ? "floor red" : (wallPattern ? "wall pattern" : "door 9x9"),
        `patch=${Number(firstDoorVision9x9Box.score || 0).toFixed(2)} red=${Number(firstDoorVision9x9Box.redScore || 0).toFixed(2)} edge=${Number(firstDoorVision9x9Box.edgeScore || 0).toFixed(2)}`,
        { active: true, slot: 2, priority: wallPattern || floorRed ? "mid" : "high" }
      ));
    }

    if (showWall && firstDoorPhase && Number(autoplay.cornerSignal || 0) >= 0.48) {
      const wallLeft = autoplay.wallHugSide === "right" ? 58 : 8;
      fragment.appendChild(createRegion(
        "is-wall is-corner-candidate",
        wallLeft,
        18,
        34,
        48,
        "wall corner",
        `corner=${Number(autoplay.cornerSignal || 0).toFixed(2)}`,
        { active: true, slot: 2, priority: "mid" }
      ));
    }

    if (showComputer && doorOpened && (Number(milestones.computerRoomScore || 0) > 0.28 || Boolean(milestones.computerRoomEntered))) {
      fragment.appendChild(createRegion(
        "is-computer",
        20,
        8,
        60,
        48,
        "computer",
        `${Number(milestones.computerRoomScore || 0).toFixed(2)} blue=${Number(milestones.computerBlueScore || 0).toFixed(2)} red=${Number(milestones.computerRedLightScore || 0).toFixed(2)} dark=${Number(milestones.computerDarkPanelScore || 0).toFixed(2)} panel=${Number(milestones.computerPanelScore || 0).toFixed(2)}`,
        { active: true, slot: 0, priority: "mid" }
      ));
    }

    if (showEnemy && doorOpened && (Number(autoplay.enemyConfidence || 0) > 0.28 || Number(autoplay.enemyCenterCellConfidence || 0) > 0.18 || Number(autoplay.enemyAllRegionPeak || 0) > 0.28)) {
      fragment.appendChild(createRegion(
        "is-enemy",
        36,
        18,
        28,
        34,
        "enemy",
        `${Number(autoplay.enemyConfidence || 0).toFixed(2)} ${autoplay.enemyTurn || "none"} all=${Number(autoplay.enemyAllRegionPeak || 0).toFixed(2)}`,
        { active: true, slot: 2, priority: "high" }
      ));
    }

    if (showHud && !gpuBacked) {
      fragment.appendChild(createRegion(
        "is-hud",
        0,
        80,
        100,
        20,
        "hud",
        `objective=${objective} phase=${pipeline} health=${autoplay.healthLikelyDead ? "dead" : "live"} ammo=${autoplay.ammoLikelyEmpty ? "empty" : "ok"}`,
        { active: Boolean(autoplay.enabled), slot: 0, priority: "low" }
      ));
    }

    if (showSpatial && autoplay.spatialSnapshot?.eventDetected) {
      const spatial = autoplay.spatialSnapshot;
      const x = Math.max(4, Math.min(86, Number(spatial.hudX ?? 0.5) * 100 - 7));
      const y = Math.max(4, Math.min(70, Number(spatial.hudY ?? 0.45) * 80 - 7));
      fragment.appendChild(createRegion(
        "is-spatial",
        x,
        y,
        14,
        14,
        "spatial",
        `${spatial.eventType || "event"} ${Number(spatial.confidence || 0).toFixed(2)}`,
        { active: true, slot: 2, priority: "high" }
      ));
    }

    if (showHealth && (autoplay.healthSensor?.retryRequested || autoplay.healthLikelyDead || Number(autoplay.healthZeroScore || 0) >= 0.78)) {
      const health = autoplay.healthSensor || {};
      fragment.appendChild(createRegion(
        "is-health",
        2,
        72,
        34,
        8,
        "health retry",
        `z=${Number(health.zeroScore ?? autoplay.healthZeroScore ?? 0).toFixed(2)} face=${Number(health.faceQuantizedFrameChange ?? autoplay.faceQuantizedFrameChange ?? 255).toFixed(2)}`,
        { active: true, slot: 0, priority: "high" }
      ));
    }

    overlay.dataset.cssOverlayMode = gpuBacked ? "reduced" : "full";
    overlay.replaceChildren(fragment);
    return true;
  }

  if (self.document?.documentElement?.dataset) {
    self.document.documentElement.dataset.doomDebugOverlayVersion = version;
  }

  self.AIKernelDoomDebugOverlay = Object.freeze({
    version,
    resolveDebugOverlayDto,
    renderDebugOverlay
  });
})();
