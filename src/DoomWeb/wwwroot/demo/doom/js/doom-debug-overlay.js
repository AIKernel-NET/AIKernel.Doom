(function () {
  "use strict";

  const version = "20260619-debugoverlay3";

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
      labelNode.textContent = value ? `${label} ${value}` : label;
      region.appendChild(labelNode);
    }

    return region;
  }

  function renderDtoGrid(fragment, grid) {
    if (!Array.isArray(grid) || grid.length <= 0) {
      return;
    }

    const columns = grid.some(cell => Number(cell.column ?? cell.Column) >= 3) ? 9 : 3;
    const rows = grid.some(cell => Number(cell.row ?? cell.Row) >= 3) ? 9 : 3;
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
        `is-vision-heat is-grid-${kind}`,
        column * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight,
        "",
        "",
        { active: Boolean(cell.active ?? cell.Active), noLabel: true, priority: "low" }
      );
      node.style.setProperty("--heat-alpha", Math.max(0.05, score * 0.32).toFixed(3));
      node.style.setProperty("--heat-border-alpha", Math.max(0.08, score * 0.72).toFixed(3));
      fragment.appendChild(node);
    }
  }

  function renderDtoRegions(fragment, regions) {
    if (!Array.isArray(regions)) {
      return;
    }

    for (let index = 0; index < regions.length; index += 1) {
      const region = regions[index] || {};
      const kind = String(region.kind || region.Kind || "objective").toLowerCase();
      fragment.appendChild(createRegion(
        `is-${kind}`,
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
      ));
    }
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

  function renderDtoOverlay(overlay, dto) {
    const fragment = document.createDocumentFragment();
    renderDtoGrid(fragment, dto.grid || dto.Grid || []);
    renderDtoRegions(fragment, dto.regions || dto.Regions || []);
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
      cell.style.setProperty("--heat-alpha", Math.max(0.05, score * 0.32).toFixed(3));
      cell.style.setProperty("--heat-border-alpha", Math.max(0.08, score * 0.72).toFixed(3));
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

  function detectorEnabled(key, activeDetections, detectionVisibility) {
    const visible = typeof detectionVisibility?.get === "function"
      ? detectionVisibility.get(key) !== false
      : detectionVisibility?.[key] !== false;
    return visible && (activeDetections.size <= 0 || activeDetections.has(key));
  }

  function renderDebugOverlay(overlay, status = {}, options = {}) {
    if (!overlay) {
      return false;
    }

    const autoplay = status?.autoplay || {};
    const dto = resolveDebugOverlayDto(autoplay);
    if (dto && (Array.isArray(dto.grid || dto.Grid) || Array.isArray(dto.regions || dto.Regions))) {
      return renderDtoOverlay(overlay, dto);
    }

    const milestones = autoplay.milestones || {};
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
    const viewHeight = 80;
    const cellWidth = 100 / 3;
    const cellHeight = viewHeight / 3;
    appendVision9x9Heatmap(fragment, milestones);
    appendKairosPulse(fragment, autoplay);
    appendKairosAxisPulse(fragment, autoplay);
    appendUseProbeArrow(fragment, autoplay);

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
          fragment.appendChild(createRegion(
            className,
            column * cellWidth,
            row * cellHeight,
            cellWidth,
            cellHeight,
            `r${index}`,
            value,
            { active: true, slot: row, priority: "low" }
          ));
        }
      }
    }

    if (showPriority) {
      fragment.appendChild(createRegion("is-objective", 33, 49, 34, 16, "PRIORITY:", priorityLabel, { active: Boolean(autoplay.enabled), slot: 0, priority: "high" }));
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

    if (showHud) {
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
