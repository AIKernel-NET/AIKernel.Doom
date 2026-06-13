(function () {
  'use strict';

    const logs = [
      {
        t: "[ DOOM ]",
        c: "log-ok",
        m: "AIKernel.Doom selected for the public prompt surface."
      },
      {
        t: "[ WASM ]",
        c: "log-info",
        m: "DoomWasm.Native overlay registered: STANDALONE_WASM, file I/O disabled, sound stubbed."
      },
      {
        t: "[  ABI ]",
        c: "log-ok",
        m: "Exports armed: main, doom_init, doom_tick, doom_render, doom_input."
      },
      {
        t: "[  ROM ]",
        c: "log-info",
        m: "doom.rom maps entry doom.wasm and capabilities doom.start, doom.stop, doom.status."
      },
      {
        t: "[  WAD ]",
        c: "log-warn",
        m: "Hosted shareware DOOM1.WAD is available at /demo/doom/DOOM1.WAD after approval."
      },
      {
        t: "[MODEL]",
        c: "log-ok",
        m: "Bonsai-1.7B q1_0 GGUF redistribution manifest mounted from /models/bonsai1.7b/manifest.json."
      },
      {
        t: "[GPU  ]",
        c: "log-info",
        m: "WebGpuComputeProvider owns DOOM framebuffer rendering and the Bonsai supervisor execution surface."
      },
      {
        t: "[LEGAL]",
        c: "log-warn",
        m: "Read /demo/doom/terms-and-licenses.html before typing yes."
      },
      {
        t: "[ WAIT ]",
        c: "log-warn",
        m: "doom.wasm generation remains gated by Emscripten and a pinned doomgeneric checkout."
      },
      {
        t: "[  OK  ]",
        c: "log-ok",
        m: "Approval gate armed: hosted WAD, model, WASM, manifests, and metadata. Current estimate: about 270MB, under 300MB."
      },
      {
        t: "--------",
        c: "log-muted",
        m: "AIKERNEL.DOOM PROMPT SUSPENDED. hintWord=yes"
      }
    ];

    const container = document.getElementById("output");
    const halted = document.getElementById("halted");
    const panic = document.getElementById("panic");
    const promptForm = document.getElementById("wasm-prompt");
    const promptInput = document.getElementById("wasm-command");
    const promptSubmit = document.getElementById("wasm-command-run");
    const runtimeStatus = document.getElementById("runtime-status");
    const doomScreen = document.getElementById("doom-screen");
    const doomScreenPanel = document.getElementById("doom-screen-panel");
    const doomFps = document.getElementById("doom-fps");
    const doomController = document.getElementById("doom-controller");
    const doomRuntimePanel = document.getElementById("doom-runtime-panel");
    const doomState = document.getElementById("doom-state");
    const doomDebugBar = document.getElementById("doom-debug-bar");
    const doomDebugOverlay = document.getElementById("doom-debug-overlay");
    const doomOverlayToggle = document.getElementById("doom-overlay-toggle");
    const doomManualMoveToggle = document.getElementById("doom-manual-move-toggle");
    const doomSenseOnlyToggle = document.getElementById("doom-sense-only-toggle");
    const doomDetectionToggles = Array.from(document.querySelectorAll("[data-detection-toggle]"));
    const commandHistory = [];
    let commandHistoryIndex = 0;
    let wasmApprovalPending = true;
    let lastRuntimeStatus = "";
    let lastObjectiveStatus = "";
    let doomDebugOverlayEnabled = true;
    const doomDetectionVisibility = new Map([
      ["motion", true],
      ["objective", true],
      ["door", true],
      ["wall", true],
      ["enemy", true],
      ["computer", true],
      ["foot", true],
      ["hud", true]
    ]);
    const DOOM_PULSE_INPUT_MS = 140;
    const activeDoomInputs = new Set();
    const doomKeyCodes = {
      forward: 0xad,
      back: 0xaf,
      left: 0xac,
      right: 0xae,
      fire: 0xa3,
      use: 0xa2,
      run: 0xb6,
      strafe: 0xb8,
      enter: 13,
      escape: 27
    };
    const doomCheatCodes = new Set(["idfa", "idkfa", "iddqd", "idspispopd", "idclip"]);
    const keyboardDoomKeys = {
      ArrowUp: "forward",
      ArrowDown: "back",
      ArrowLeft: "left",
      ArrowRight: "right",
      ControlLeft: "fire",
      ControlRight: "fire",
      Space: "use",
      ShiftLeft: "run",
      ShiftRight: "run",
      AltLeft: "strafe",
      AltRight: "strafe",
      Enter: "enter",
      Escape: "escape"
    };
    const doomRuntime = window.createAIKernelDoomRuntime
      ? window.createAIKernelDoomRuntime({
        canvas: doomScreen,
        moduleUrl: "/demo/doom/module.json",
        modelManifestUrl: "/models/bonsai1.7b/manifest.json",
        autoplayProfileUrl: "/demo/doom/autoplay-profile.json",
        log: appendConsoleLine,
        onStatusChange: updateRuntimeStatus
      })
      : null;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    function appendLine(log) {
      const line = document.createElement("div");
      line.className = "line";
      line.innerHTML = `<span class="${log.c}">${log.t}</span> ${log.m}`;
      container.appendChild(line);
    }

    function appendConsoleLine(tag, className, message) {
      const line = document.createElement("div");
      const label = document.createElement("span");
      line.className = "line";
      label.className = className;
      label.textContent = tag;
      line.appendChild(label);
      line.appendChild(document.createTextNode(` ${message}`));
      container.appendChild(line);
      container.scrollTop = container.scrollHeight;
    }

    function updateRuntimeStatus(status, reason = "status") {
      const fps = Number.isFinite(status.fps) ? status.fps : 0;
      const targetFps = status.targetFps || 30;
      const workMs = Math.round(status.lastFrameWorkMs || 0);
      const yieldMs = Math.round(status.uiYieldMs || 16);
      const gpuWaitMs = Math.round(status.lastGpuWaitMs || 0);
      const gpuTimeouts = status.gpuWaitTimeouts || 0;
      const watchdogText = `watchdog=${status.watchdogRestarts || 0}/${Math.round(status.watchdogLastStallMs || 0)}ms${status.watchdogRestarting ? ":restarting" : ""}`;
      const autoplay = status.autoplay || {};
      const targetConfidence = Number(autoplay.targetConfidence || 0).toFixed(2);
      const quantizedDelta = Number(autoplay.quantizedFrameChange ?? 255).toFixed(2);
      const regionDelta = Number(autoplay.regionQuantizedFrameChange ?? 255).toFixed(2);
      const hudDelta = Number(autoplay.statusBarQuantizedFrameChange ?? 255).toFixed(2);
      const faceDelta = Number(autoplay.faceQuantizedFrameChange ?? 255).toFixed(2);
      const depthEstimate = Number(autoplay.depthEstimate ?? 1).toFixed(2);
      const cornerSignal = Number(autoplay.cornerSignal || 0).toFixed(2);
      const signatureDistance = Number(autoplay.signatureMatchDistance ?? 255).toFixed(2);
      const signatureText = `${autoplay.signatureMatchKind || "none"}/${signatureDistance}`;
      const dictionaryText = `${autoplay.wallSignatureCount || 0}/${autoplay.cornerSignatureCount || 0}/${autoplay.depthSignatureCount || 0}`;
      const probe = `${autoplay.wallUseProbeStage || 0}:${autoplay.wallUseProbeTurn || "left"}/${autoplay.wallUseProbeFrames || 0}`;
      const detach = `${autoplay.wallDetachTurn || "left"}/${autoplay.wallDetachFrames || 0}`;
      const survey = `${autoplay.wallSurveyTurn || "left"}/${autoplay.wallSurveyFrames || 0}/${autoplay.wallSurveyDecisionFrames || 0}`;
      const mapRush = `${autoplay.mapRushCorrectionTurn || "left"}/${autoplay.mapRushCorrectionFrames || 0}/${autoplay.mapRushCorrectionBackFrames || 0}/${autoplay.mapRushCorrectionReversals || 0}`;
      const mapDoor = `${autoplay.mapDoorSweepTurn || "left"}/${autoplay.mapDoorSweepFrames || 0}`;
      const enemyConfidence = Number(autoplay.enemyConfidence || 0).toFixed(2);
      const enemyDistance = Number(autoplay.enemyDistance ?? 1).toFixed(2);
      const enemyCenter = Number(autoplay.enemyCenterCellConfidence || 0).toFixed(2);
      const enemyText = `${enemyConfidence}/${autoplay.enemyTurn || "none"}/${autoplay.enemyCluster || "none"}/${autoplay.enemyFireReady ? "fire" : "hold"}/${enemyDistance}/c${enemyCenter}`;
      const pipelineText = autoplay.controlPipeline || "Idle";
      const objectiveText = autoplay.objective || "none";
      const detectionText = Array.isArray(autoplay.activeDetections) && autoplay.activeDetections.length > 0
        ? autoplay.activeDetections.join(",")
        : "none";
      const semantic = autoplay.semanticMemory || {};
      const semanticText = `${semantic.phase || pipelineText}/${semantic.objective || objectiveText}/d${semantic.firstDoor?.doorConfidence ?? 0}/c${semantic.firstDoor?.corridorConfidence ?? 0}/b${semantic.bridge?.confidence ?? 0}/f${semantic.finalRoom?.confidence ?? 0}`;
      const strategyText = `${autoplay.strategyName || "unknown"}/${autoplay.strategyContext || "unknown"}/p${autoplay.strategyPriority || 0}`;
      const milestones = autoplay.milestones || {};
      const mapText = `map=${milestones.mapSectorId || "unknown"}/${milestones.mapDoorSectorMatch ? "door" : "-"}${milestones.mapDarkSectorMatch ? "+dark" : ""}${milestones.mapEnemyZoneMatch ? "+enemy" : ""}`;
      const alertText = `alert=${milestones.enemyAlertFrames || 0}/${milestones.enemyAlertTurn || "none"}/${milestones.enemyAlertCluster || "none"}/${Number(milestones.enemyAlertDepth ?? 1).toFixed(2)}/${Number(milestones.enemyAlertPeakConfidence || 0).toFixed(2)}`;
      const progressText = `hall=${milestones.centralHallEntered ? "yes" : "no"}/${milestones.centralHallFrames || 0}; stairs=${milestones.stairsEntered ? "yes" : "no"}/${milestones.stairsCandidateFrames || 0}; final=${milestones.finalRoomEntered ? "yes" : "no"}/${milestones.finalRoomCandidateFrames || 0}`;
      const routeText = `blue=${Number(milestones.blueFloorScore || 0).toFixed(2)}; court=${Number(milestones.courtyardScore || 0).toFixed(2)}/${milestones.courtyardTurn || "none"}/${milestones.courtyardRescueMode || "none"}/${milestones.courtyardRescueFrames || 0}; gap=${Number(milestones.spawnCorridorGapScore || 0).toFixed(2)}/${milestones.spawnCorridorGapTurn || "none"}/${milestones.spawnCorridorGapFrames || 0}; bridge=${Number(milestones.bridgeBrownScore || 0).toFixed(2)}/${Number(milestones.bridgeGreenLeft || 0).toFixed(2)}-${Number(milestones.bridgeGreenCenter || 0).toFixed(2)}-${Number(milestones.bridgeGreenRight || 0).toFixed(2)}/${milestones.bridgeLaneTurn || "none"}/door${Number(milestones.bridgeDoorScore || 0).toFixed(2)}; corridor=${milestones.firstDoorCorridorLocated ? "yes" : "no"}/${milestones.firstDoorCorridorFrames || 0}/${Number(milestones.firstDoorCorridorSignature || 0).toFixed(2)}; deadEnd=${milestones.firstDoorDeadEndTurnFrames || 0}; useSeen=${Boolean(milestones.firstDoorUseAttempted)}/${Number(milestones.firstDoorUseSignature || 0).toFixed(2)}`;
      const computerText = `computer=${milestones.computerRoomEntered ? "yes" : "no"}/${milestones.computerRoomFrames || 0}/${Number(milestones.computerRoomScore || 0).toFixed(2)}/${Number(milestones.computerBlueScore || 0).toFixed(2)}/${Number(milestones.computerRedLightScore || 0).toFixed(2)}/${Number(milestones.computerDarkPanelScore || 0).toFixed(2)}/${Number(milestones.computerPanelScore || 0).toFixed(2)}`;
      const milestoneText = `door=${milestones.doorOpened || 0}; dark=${milestones.darkZoneEntered ? "yes" : "no"}/${milestones.darkZoneFrames || 0}; darkArea=${Number(milestones.darkAreaScore || 0).toFixed(2)}; luma=${Number(milestones.gameplayLuma || 0).toFixed(1)}; ${computerText}; ${routeText}; ${mapText}; ${progressText}; enemy=${milestones.enemyDefeated || 0}; ${alertText}; bursts=${milestones.combatFireFrames || 0}; peak=${Number(milestones.enemyConfidencePeak || 0).toFixed(2)}; drop=${milestones.enemyDropFrames || 0}`;
      const ammoText = `${autoplay.ammoLikelyEmpty ? "empty" : "ok"}/${autoplay.ammoSignature || "000000000000000000000"}`;
      const healthText = `${autoplay.healthLikelyDead ? "dead" : "live"}/z${Number(autoplay.healthZeroScore || 0).toFixed(2)}/c${autoplay.healthActiveColumns || 0}/a${autoplay.healthActiveCells || 0}/${autoplay.healthSignature || "000000000000000000000000"}`;
      const motionText = `${autoplay.motion9Signature || "000000000"}/${Number(autoplay.motion9Delta ?? 255).toFixed(2)}/f${Number(autoplay.motionForwardProgress || 0).toFixed(2)}/o${Number(autoplay.motionObstacleScore || 0).toFixed(2)}/t${Number(autoplay.motionTurnScore || 0).toFixed(2)}/e${Number(autoplay.motionEntranceScore || 0).toFixed(2)}/s${Number(autoplay.motionStallScore || 0).toFixed(2)}/${autoplay.motionIntent || "idle"}`;
      const autoplayText = `${autoplay.enabled ? "on" : "off"}/${autoplay.mode || "disabled"}${autoplay.manualMove ? "/manual-move" : ""}${autoplay.senseOnly ? "/sense-only" : ""}; pipeline=${pipelineText}; objective=${objectiveText}; det=${detectionText}; semantic=${semanticText}; strategy=${strategyText}; vision=${autoplay.vision || "none"}; zeroCopy=${Boolean(autoplay.zeroCopy)}; safety=${autoplay.safetyReason || "none"}; mobility=${autoplay.mobilityMode || "none"}; wall=${autoplay.wallHugSide || "left"}; target=${targetConfidence}; enemy=${enemyText}; ammo=${ammoText}; health=${healthText}; milestones=${milestoneText}; corner=${cornerSignal}; sig=${signatureText}; dict=${dictionaryText}; regions=${autoplay.regionSignature || "000000"}; regions9=${autoplay.region9Signature || "000000000"}; motion9=${motionText}; depthSig=${autoplay.depthSignature || "0000"}; depth=${depthEstimate}; faceSig=${autoplay.faceSignature || "0000000000000000"}; sound=${Boolean(autoplay.soundCueActive)}; stuck=${autoplay.stuckFrames || 0}; qStall=${autoplay.quantizedStallFrames || 0}; qDelta=${quantizedDelta}; rDelta=${regionDelta}; hudDelta=${hudDelta}; faceDelta=${faceDelta}; probe=${probe}; detach=${detach}; survey=${survey}; mapRush=${mapRush}; mapDoor=${mapDoor}; suppress=${autoplay.cornerSuppressFrames || 0}; repeat=${autoplay.repeatActionFrames || 0}; repeatTurn=${autoplay.repeatTurnFrames || 0}; recovery=${autoplay.recoveryFrames || 0}; loopEscape=${autoplay.loopEscapeFrames || 0}; useCooldown=${autoplay.useCooldown || 0}; useLatch=${autoplay.firstDoorUseLatchFrames || 0}/${autoplay.firstDoorUsePulsed ? "pulsed" : "armed"}; predictions=${autoplay.predictions || 0}; reuse=${autoplay.reused || 0}; latency=${Math.round(autoplay.latencyMs || 0)}ms`;
      const text = `runtime=${status.state}; wasm=${status.wasmLoaded}; wad=${status.wadLoaded}; model=${status.modelLoaded}; input=${status.inputReady}; actionInput=${status.actionInputReady}; loop=${status.loopActive}; ${watchdogText}; autoplay=${autoplayText}; frames=${status.frameCount || 0}; fps=${fps}/${targetFps}; work=${workMs}ms; yield=${yieldMs}ms; gpuWait=${gpuWaitMs}ms; gpuTimeouts=${gpuTimeouts}; gpu=${status.gpuDelegate || "pending"}; framebuffer=${status.framebuffer}`;
      runtimeStatus.innerHTML = `<strong>runtime</strong>=${status.state}; wasm=${status.wasmLoaded}; wad=${status.wadLoaded}; model=${status.modelLoaded}; input=${status.inputReady}; actionInput=${status.actionInputReady}; loop=${status.loopActive}; ${watchdogText}; autoplay=${autoplayText}; frames=${status.frameCount || 0}; fps=${fps}/${targetFps}; work=${workMs}ms; yield=${yieldMs}ms; gpuWait=${gpuWaitMs}ms; gpuTimeouts=${gpuTimeouts}; gpu=${status.gpuDelegate || "pending"}; framebuffer=${status.framebuffer}`;
      doomFps.textContent = `320x200 paletted framebuffer; fps=${fps}; cap=${targetFps}; yield=${yieldMs}ms; gpu=${gpuWaitMs}ms/${gpuTimeouts}; auto=${autoplay.enabled ? "on" : "off"}`;
      doomState.textContent = `Status: ${status.state}; fps=${fps}/${targetFps}; autoplay=${autoplay.enabled ? autoplay.mode || "on" : "off"}${autoplay.manualMove ? "; manual-move" : ""}${autoplay.senseOnly ? "; sense-only" : ""}`;
      if (doomDebugBar) {
        doomDebugBar.hidden = doomScreenPanel?.hidden !== false;
      }
      syncManualMoveToggle(status);
      syncSenseOnlyToggle(status);
      syncOverlayToggle();
      syncDetectionToggleButtons(status);
      renderDoomDebugOverlay(status);

      lastObjectiveStatus = objectiveText;

      if (text !== lastRuntimeStatus && ["ready", "running", "stable", "stopped", "failed"].includes(reason)) {
        const level = status.state === "failed" ? "log-fail" : "log-info";
        appendConsoleLine("[STATE]", level, text);
      }

      lastRuntimeStatus = text;
    }

    function createDebugRegion(className, left, top, width, height, label, value = "", options = {}) {
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

    function renderDoomDebugOverlay(status) {
      if (!doomDebugOverlay) {
        return;
      }

      doomDebugOverlay.classList.toggle("is-visible", doomDebugOverlayEnabled);
      if (!doomDebugOverlayEnabled) {
        doomDebugOverlay.replaceChildren();
        return;
      }

      const autoplay = status?.autoplay || {};
      const milestones = autoplay.milestones || {};
      const semantic = autoplay.semanticMemory || {};
      const objective = autoplay.objective || semantic.objective || "none";
      const pipeline = autoplay.controlPipeline || semantic.phase || "Idle";
      const objectiveLabel = objective.replace(/-/g, " ");
      const doorOpened = Number(milestones.doorOpened || 0) > 0;
      const firstDoorPhase = !doorOpened;
      const activeDetections = new Set(Array.isArray(autoplay.activeDetections) ? autoplay.activeDetections : []);
      const phaseDetectionReady = activeDetections.size > 0;
      const detectorEnabled = (key) => doomDetectionVisibility.get(key) !== false && (!phaseDetectionReady || activeDetections.has(key));
      const showMotion = detectorEnabled("motion");
      const showObjective = detectorEnabled("objective");
      const showDoor = detectorEnabled("door");
      const showWall = detectorEnabled("wall");
      const showEnemy = detectorEnabled("enemy");
      const showComputer = detectorEnabled("computer");
      const showFoot = detectorEnabled("foot");
      const showHud = detectorEnabled("hud");
      const wallAvoidActive = /wall|corner|stuck|detach|escape|avoid|survey/.test(String(autoplay.safetyReason || ""))
        || /wall|corner|stuck|detach|escape|avoid|survey/.test(String(autoplay.mobilityMode || ""));
      const region9 = String(autoplay.region9Signature || "000000000").padEnd(9, "0").slice(0, 9);
      const motion9 = String(autoplay.motion9Signature || "000000000").padEnd(9, "0").slice(0, 9);
      const fragment = document.createDocumentFragment();
      const viewHeight = 80;
      const cellWidth = 100 / 3;
      const cellHeight = viewHeight / 3;

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
            fragment.appendChild(createDebugRegion(
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

      if (showObjective) {
        fragment.appendChild(createDebugRegion(
          "is-objective",
          33,
          38,
          34,
          18,
          "OBJECTIVE:",
          objectiveLabel,
          { active: Boolean(autoplay.enabled), slot: 0, priority: "high" }
        ));
      }

      if (showEnemy && doorOpened && (Number(autoplay.enemyConfidence || 0) > 0.22 || Number(autoplay.enemyCenterCellConfidence || 0) > 0.14 || Number(autoplay.enemyAllRegionPeak || 0) > 0.28)) {
        const enemyLeft = autoplay.enemyTurn === "right" ? 67 : (autoplay.enemyTurn === "left" ? 13 : 41);
        fragment.appendChild(createDebugRegion(
          "is-enemy-ring",
          enemyLeft,
          48,
          14,
          14,
          "",
          "",
          { active: true, noLabel: true, priority: "high" }
        ));
        fragment.appendChild(createDebugRegion(
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

      if (showFoot && (Number(autoplay.priorFootObstacleScore || 0) > 0.18 || Number(autoplay.inputStallFrames || 0) > 0)) {
        fragment.appendChild(createDebugRegion(
          "is-foot",
          30,
          64,
          42,
          16,
          "foot",
          `obs=${Number(autoplay.priorFootObstacleScore || 0).toFixed(2)} stall=${autoplay.inputStallFrames || 0}`,
          { active: true, slot: 3, priority: "mid" }
        ));
      }
      if (showWall && wallAvoidActive) {
        fragment.appendChild(createDebugRegion(
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
        fragment.appendChild(createDebugRegion(
          "is-door",
          30,
          18,
          40,
          42,
          "door",
          `corr=${milestones.firstDoorCorridorLocated ? "yes" : "no"} use=${Number(milestones.firstDoorUseSignature || 0).toFixed(2)}`,
          { active: true, slot: 1, priority: "high" }
        ));
      }
      if (showComputer && doorOpened && (Number(milestones.computerRoomScore || 0) > 0.28 || Boolean(milestones.computerRoomEntered))) {
        fragment.appendChild(createDebugRegion(
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
        fragment.appendChild(createDebugRegion(
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
        fragment.appendChild(createDebugRegion(
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

      doomDebugOverlay.replaceChildren(fragment);
    }

    function syncDetectionToggleButtons(status = doomRuntime?.status?.() || {}) {
      const activeDetections = new Set(Array.isArray(status?.autoplay?.activeDetections) ? status.autoplay.activeDetections : []);
      const phaseDetectionReady = activeDetections.size > 0;
      doomDetectionToggles.forEach(button => {
        const key = button.dataset.detectionToggle;
        if (!key) {
          return;
        }

        const enabled = doomDetectionVisibility.get(key) !== false;
        const activeInPhase = !phaseDetectionReady || activeDetections.has(key);
        button.classList.toggle("is-off", !enabled);
        button.classList.toggle("is-phase-off", enabled && !activeInPhase);
        button.setAttribute("aria-pressed", enabled ? "true" : "false");
        button.title = activeInPhase
          ? "Detector is enabled for the current AutoPlay phase."
          : "Detector is user-enabled but inactive in the current AutoPlay phase.";
      });
    }

    async function runWasmCommand(rawCommand) {
      const command = rawCommand.trim();
      const normalized = command.toLowerCase();

      if (!command) {
        return;
      }

      commandHistory.push(command);
      commandHistoryIndex = commandHistory.length;
      appendConsoleLine("aik>", "log-ok", command);

      const responses = {
        "help": "commands: yes, doom.status, doom.phase.check, doom.start, doom.stop, doom.restart-play, doom.autoplay on, doom.autoplay off, doom.autoplay manual-move toggle, doom.autoplay sense-only toggle, doom.autoplay sense-only on, doom.autoplay sense-only off, doom.autoplay status, doom.use-test, doom.cheat <idfa|idkfa|iddqd|idspispopd|idclip>, iddqd, idkfa, idfa, wasm.exports, model.status, legal, copy.logs, clear",
        "doom.status": "suspended: approval required before hosted WAD/model/WASM download or load. hintWord=yes",
        "doom.stop": "ok: no active public runtime process is running.",
        "wasm.exports": "main, doom_init, doom_tick, doom_render, doom_input, doom_input_action, doom_mount_wad, doom_wad_status, malloc, free",
        "model.status": "suspended: approval required before Bonsai-1.7B_Q1_0 GGUF download or load. hintWord=yes",
        "legal": "open /demo/doom/terms-and-licenses.html in a new tab before approval"
      };

      if (["yes", "y", "approve", "accept"].includes(normalized)) {
        wasmApprovalPending = false;
        appendConsoleLine("[  OK  ]", "log-ok", "approval recorded: hosted WAD/model/WASM download and load accepted.");
        if (!doomRuntime) {
          halted.innerHTML = "[ FAILED ] AIKERNEL.DOOM BROWSER RUNTIME UNAVAILABLE.<span>Doom browser runtime script is missing.</span>";
          appendConsoleLine("[ FAIL ]", "log-fail", "Doom browser runtime script is unavailable.");
          return;
        }

        halted.innerHTML = "[ LOADING ] AIKERNEL.DOOM APPROVED DOWNLOAD/LOAD ACTIVE.<span>Fetching and validating doom.wasm, DOOM1.WAD, Bonsai model, manifests, and metadata.</span><span>Protected downloads started only after explicit yes.</span>";
        promptInput.disabled = true;
        promptSubmit.disabled = true;
        try {
          const status = await doomRuntime.prepare();
          doomScreenPanel.hidden = false;
          halted.innerHTML = "[ READY ] AIKERNEL.DOOM USER APPROVAL RECORDED.<span>Hosted WAD/model/WASM download and validation completed.</span><span>Auto start is launching doom.start and doom.autoplay on.</span>";
          updateRuntimeStatus(status, "ready");
          appendConsoleLine("[ LOAD ]", "log-ok", `${status.state}: wasmLoaded=${status.wasmLoaded}; wadLoaded=${status.wadLoaded}; modelLoaded=${status.modelLoaded}`);
          appendConsoleLine("[ RESP ]", "log-info", "auto-start: launching doom.start after approval.");
          const runningStatus = await doomRuntime.start();
          doomRuntimePanel.open = false;
          updateRuntimeStatus(runningStatus, "running");
          appendConsoleLine("[ RESP ]", "log-ok", `${runningStatus.state}: doom_tick -> doom_render loop active.`);
          await advanceDoomTitleToGameplay();
          const autoplayStatus = await doomRuntime.setAutoplay(true);
          updateRuntimeStatus(autoplayStatus, "autoplay-on");
          appendConsoleLine("[AUTOPLAY]", "log-ok", "Bonsai active: predicting next move...");
          halted.innerHTML = "[ RUNNING ] AIKERNEL.DOOM AUTOPLAY ACTIVE.<span>doom_tick -> doom_render is driving the framebuffer.</span><span>Bonsai AutoPlay is enabled; manual keys still temporarily override matching AI inputs.</span>";
        } catch (error) {
          halted.innerHTML = "[ FAILED ] AIKERNEL.DOOM APPROVED LOAD FAILED.<span>Review the console output, hosted manifests, asset hashes, and browser cache state.</span>";
          appendConsoleLine("[ FAIL ]", "log-fail", error instanceof Error ? error.message : String(error));
        } finally {
          promptInput.disabled = false;
          promptSubmit.disabled = false;
        }
        return;
      }

      if (["no", "n", "reject", "deny"].includes(normalized)) {
        await doomRuntime?.stop();
        doomScreenPanel.hidden = true;
        appendConsoleLine("[SUSP]", "log-warn", "approval not granted. Runtime remains suspended. hintWord=yes");
        return;
      }

      if (wasmApprovalPending && ["doom.start", "aik exec run doom"].includes(normalized)) {
        appendConsoleLine("[SUSP]", "log-warn", "approval required before hosted WAD/model/WASM download or load. hintWord=yes");
        return;
      }

      if (!wasmApprovalPending && normalized === "doom.status") {
        const status = doomRuntime?.status() || { state: "ready", renderer: "none", wasmLoaded: false, wadLoaded: false, modelLoaded: false, framebuffer: "320x200 paletted-8bit" };
        const autoplay = status.autoplay || {};
        updateRuntimeStatus(status, "status");
        const milestones = autoplay.milestones || {};
        const motionText = `${autoplay.motion9Signature || "000000000"}/f${Number(autoplay.motionForwardProgress || 0).toFixed(2)}/o${Number(autoplay.motionObstacleScore || 0).toFixed(2)}/t${Number(autoplay.motionTurnScore || 0).toFixed(2)}/e${Number(autoplay.motionEntranceScore || 0).toFixed(2)}`;
        appendConsoleLine("[ RESP ]", "log-info", `${status.state}: wasmLoaded=${status.wasmLoaded}; wadLoaded=${status.wadLoaded}; modelLoaded=${status.modelLoaded}; autoplay=${autoplay.enabled ? autoplay.mode || "on" : "off"}; manualMove=${Boolean(autoplay.manualMove)}; pipeline=${autoplay.controlPipeline || "Idle"}; vision=${autoplay.vision || "none"}; zeroCopy=${Boolean(autoplay.zeroCopy)}; safety=${autoplay.safetyReason || "none"}; motion9=${motionText}; ammo=${autoplay.ammoLikelyEmpty ? "empty" : "ok"}; health=${autoplay.healthLikelyDead ? "dead" : "live"}; doors=${milestones.doorOpened || 0}; enemies=${milestones.enemyDefeated || 0}; predictions=${autoplay.predictions || 0}; reused=${autoplay.reused || 0}; fps=${status.fps || 0}/${status.targetFps || 30}; yield=${Math.round(status.uiYieldMs || 16)}ms; gpuWait=${Math.round(status.lastGpuWaitMs || 0)}ms; gpuTimeouts=${status.gpuWaitTimeouts || 0}; renderer=${status.renderer}; framebuffer=${status.framebuffer}`);
        return;
      }

      if (!wasmApprovalPending && normalized === "model.status") {
        const status = doomRuntime?.status() || { modelLoaded: false };
        updateRuntimeStatus(status, "status");
        const autoplay = status.autoplay || {};
        appendConsoleLine("[ RESP ]", "log-info", `${status.modelLoaded ? "ready" : "loading"}: Bonsai-1.7B_Q1_0 GGUF hostedFile=/models/bonsai1.7b/Bonsai-1.7B-Q1_0.gguf; loaded=${status.modelLoaded}; execution surface=WebGpuComputeProvider; autoplay=${autoplay.enabled ? autoplay.mode || "on" : "off"}`);
        return;
      }

      if (!wasmApprovalPending && normalized === "doom.autoplay on") {
        if (!doomRuntime) {
          appendConsoleLine("[ FAIL ]", "log-fail", "Doom browser runtime script is unavailable.");
          return;
        }

        const status = await doomRuntime.setAutoplay(true);
        updateRuntimeStatus(status, "autoplay-on");
        appendConsoleLine("[AUTOPLAY]", "log-ok", "Bonsai active: predicting next move...");
        return;
      }

      if (!wasmApprovalPending && normalized === "doom.autoplay manual-move toggle") {
        const manualMove = Boolean(doomRuntime?.status?.().autoplay?.manualMove);
        await runWasmCommand(manualMove ? "doom.autoplay manual-move off" : "doom.autoplay manual-move on");
        return;
      }

      if (!wasmApprovalPending && normalized === "doom.autoplay sense-only toggle") {
        const senseOnly = Boolean(doomRuntime?.status?.().autoplay?.senseOnly);
        await runWasmCommand(senseOnly ? "doom.autoplay sense-only off" : "doom.autoplay sense-only on");
        return;
      }

      if (!wasmApprovalPending && (normalized === "doom.autoplay manual-move on" || normalized === "doom.autoplay move manual")) {
        if (!doomRuntime?.setAutoplayManualMove) {
          appendConsoleLine("[ FAIL ]", "log-fail", "manual-move mode is unavailable in this runtime.");
          return;
        }

        const status = await doomRuntime.setAutoplayManualMove(true);
        updateRuntimeStatus(status, "manual-move-on");
        appendConsoleLine("[AUTOPLAY]", "log-info", "manual-move enabled: movement/turning are manual; sensing, Use, and Fire remain active.");
        return;
      }

      if (!wasmApprovalPending && (normalized === "doom.autoplay manual-move off" || normalized === "doom.autoplay move auto")) {
        if (!doomRuntime?.setAutoplayManualMove) {
          appendConsoleLine("[ FAIL ]", "log-fail", "manual-move mode is unavailable in this runtime.");
          return;
        }

        const status = await doomRuntime.setAutoplayManualMove(false);
        updateRuntimeStatus(status, "manual-move-off");
        appendConsoleLine("[AUTOPLAY]", "log-info", "manual-move disabled: AI movement control restored.");
        return;
      }

      if (!wasmApprovalPending && (normalized === "doom.autoplay sense-only on" || normalized === "doom.autoplay validate on")) {
        if (!doomRuntime?.setAutoplaySenseOnly) {
          appendConsoleLine("[ FAIL ]", "log-fail", "sense-only validation mode is unavailable in this runtime.");
          return;
        }

        const status = await doomRuntime.setAutoplaySenseOnly(true);
        updateRuntimeStatus(status, "sense-only-on");
        appendConsoleLine("[AUTOPLAY]", "log-info", "sense-only enabled: manual control only; sensing, phase routing, and detection overlay remain active.");
        return;
      }

      if (!wasmApprovalPending && (normalized === "doom.autoplay sense-only off" || normalized === "doom.autoplay validate off")) {
        if (!doomRuntime?.setAutoplaySenseOnly) {
          appendConsoleLine("[ FAIL ]", "log-fail", "sense-only validation mode is unavailable in this runtime.");
          return;
        }

        const status = await doomRuntime.setAutoplaySenseOnly(false);
        updateRuntimeStatus(status, "sense-only-off");
        appendConsoleLine("[AUTOPLAY]", "log-info", "sense-only disabled: AI inputs are allowed again.");
        return;
      }

      if (!wasmApprovalPending && normalized === "doom.phase.check") {
        const status = doomRuntime?.status() || {};
        updateRuntimeStatus(status, "phase-check");
        appendConsoleLine("[PHASE]", "log-info", formatPhaseCheck(status));
        return;
      }

      if (!wasmApprovalPending && normalized === "doom.autoplay status") {
        const status = doomRuntime?.status() || {};
        const autoplay = status.autoplay || {};
        const targetConfidence = Number(autoplay.targetConfidence || 0).toFixed(2);
        const quantizedDelta = Number(autoplay.quantizedFrameChange ?? 255).toFixed(2);
        const regionDelta = Number(autoplay.regionQuantizedFrameChange ?? 255).toFixed(2);
        const hudDelta = Number(autoplay.statusBarQuantizedFrameChange ?? 255).toFixed(2);
        const faceDelta = Number(autoplay.faceQuantizedFrameChange ?? 255).toFixed(2);
        const depthEstimate = Number(autoplay.depthEstimate ?? 1).toFixed(2);
        const cornerSignal = Number(autoplay.cornerSignal || 0).toFixed(2);
        const signatureDistance = Number(autoplay.signatureMatchDistance ?? 255).toFixed(2);
        const signatureText = `${autoplay.signatureMatchKind || "none"}/${signatureDistance}`;
        const dictionaryText = `${autoplay.wallSignatureCount || 0}/${autoplay.cornerSignatureCount || 0}/${autoplay.depthSignatureCount || 0}`;
        const probe = `${autoplay.wallUseProbeStage || 0}:${autoplay.wallUseProbeTurn || "left"}/${autoplay.wallUseProbeFrames || 0}`;
        const detach = `${autoplay.wallDetachTurn || "left"}/${autoplay.wallDetachFrames || 0}`;
        const survey = `${autoplay.wallSurveyTurn || "left"}/${autoplay.wallSurveyFrames || 0}/${autoplay.wallSurveyDecisionFrames || 0}`;
        const mapRush = `${autoplay.mapRushCorrectionTurn || "left"}/${autoplay.mapRushCorrectionFrames || 0}/${autoplay.mapRushCorrectionBackFrames || 0}/${autoplay.mapRushCorrectionReversals || 0}`;
        const mapDoor = `${autoplay.mapDoorSweepTurn || "left"}/${autoplay.mapDoorSweepFrames || 0}`;
        const enemyConfidence = Number(autoplay.enemyConfidence || 0).toFixed(2);
        const enemyDistance = Number(autoplay.enemyDistance ?? 1).toFixed(2);
        const enemyCenter = Number(autoplay.enemyCenterCellConfidence || 0).toFixed(2);
        const enemyText = `${enemyConfidence}/${autoplay.enemyTurn || "none"}/${autoplay.enemyCluster || "none"}/${autoplay.enemyFireReady ? "fire" : "hold"}/${enemyDistance}/c${enemyCenter}`;
        const pipelineText = autoplay.controlPipeline || "Idle";
        const objectiveText = autoplay.objective || "none";
        const semantic = autoplay.semanticMemory || {};
        const semanticText = `${semantic.phase || pipelineText}/${semantic.objective || objectiveText}/d${semantic.firstDoor?.doorConfidence ?? 0}/c${semantic.firstDoor?.corridorConfidence ?? 0}/b${semantic.bridge?.confidence ?? 0}/f${semantic.finalRoom?.confidence ?? 0}`;
        const strategyText = `${autoplay.strategyName || "unknown"}/${autoplay.strategyContext || "unknown"}/p${autoplay.strategyPriority || 0}`;
        const milestones = autoplay.milestones || {};
        const mapText = `map=${milestones.mapSectorId || "unknown"}/${milestones.mapDoorSectorMatch ? "door" : "-"}${milestones.mapDarkSectorMatch ? "+dark" : ""}${milestones.mapEnemyZoneMatch ? "+enemy" : ""}`;
        const alertText = `alert=${milestones.enemyAlertFrames || 0}/${milestones.enemyAlertTurn || "none"}/${milestones.enemyAlertCluster || "none"}/${Number(milestones.enemyAlertDepth ?? 1).toFixed(2)}/${Number(milestones.enemyAlertPeakConfidence || 0).toFixed(2)}`;
        const progressText = `hall=${milestones.centralHallEntered ? "yes" : "no"}/${milestones.centralHallFrames || 0}; stairs=${milestones.stairsEntered ? "yes" : "no"}/${milestones.stairsCandidateFrames || 0}; final=${milestones.finalRoomEntered ? "yes" : "no"}/${milestones.finalRoomCandidateFrames || 0}`;
        const routeText = `blue=${Number(milestones.blueFloorScore || 0).toFixed(2)}; court=${Number(milestones.courtyardScore || 0).toFixed(2)}/${milestones.courtyardTurn || "none"}/${milestones.courtyardRescueMode || "none"}/${milestones.courtyardRescueFrames || 0}; gap=${Number(milestones.spawnCorridorGapScore || 0).toFixed(2)}/${milestones.spawnCorridorGapTurn || "none"}/${milestones.spawnCorridorGapFrames || 0}; bridge=${Number(milestones.bridgeBrownScore || 0).toFixed(2)}/${Number(milestones.bridgeGreenLeft || 0).toFixed(2)}-${Number(milestones.bridgeGreenCenter || 0).toFixed(2)}-${Number(milestones.bridgeGreenRight || 0).toFixed(2)}/${milestones.bridgeLaneTurn || "none"}/door${Number(milestones.bridgeDoorScore || 0).toFixed(2)}; corridor=${milestones.firstDoorCorridorLocated ? "yes" : "no"}/${milestones.firstDoorCorridorFrames || 0}/${Number(milestones.firstDoorCorridorSignature || 0).toFixed(2)}; deadEnd=${milestones.firstDoorDeadEndTurnFrames || 0}; useSeen=${Boolean(milestones.firstDoorUseAttempted)}/${Number(milestones.firstDoorUseSignature || 0).toFixed(2)}`;
        const computerText = `computer=${milestones.computerRoomEntered ? "yes" : "no"}/${milestones.computerRoomFrames || 0}/${Number(milestones.computerRoomScore || 0).toFixed(2)}/${Number(milestones.computerBlueScore || 0).toFixed(2)}/${Number(milestones.computerRedLightScore || 0).toFixed(2)}/${Number(milestones.computerDarkPanelScore || 0).toFixed(2)}/${Number(milestones.computerPanelScore || 0).toFixed(2)}`;
        const milestoneText = `door=${milestones.doorOpened || 0}; dark=${milestones.darkZoneEntered ? "yes" : "no"}/${milestones.darkZoneFrames || 0}; darkArea=${Number(milestones.darkAreaScore || 0).toFixed(2)}; luma=${Number(milestones.gameplayLuma || 0).toFixed(1)}; ${computerText}; ${routeText}; ${mapText}; ${progressText}; enemy=${milestones.enemyDefeated || 0}; ${alertText}; bursts=${milestones.combatFireFrames || 0}; peak=${Number(milestones.enemyConfidencePeak || 0).toFixed(2)}; drop=${milestones.enemyDropFrames || 0}`;
        const ammoText = `${autoplay.ammoLikelyEmpty ? "empty" : "ok"}/${autoplay.ammoSignature || "000000000000000000000"}`;
        const healthText = `${autoplay.healthLikelyDead ? "dead" : "live"}/z${Number(autoplay.healthZeroScore || 0).toFixed(2)}/c${autoplay.healthActiveColumns || 0}/a${autoplay.healthActiveCells || 0}/${autoplay.healthSignature || "000000000000000000000000"}`;
        const motionText = `${autoplay.motion9Signature || "000000000"}/${Number(autoplay.motion9Delta ?? 255).toFixed(2)}/f${Number(autoplay.motionForwardProgress || 0).toFixed(2)}/o${Number(autoplay.motionObstacleScore || 0).toFixed(2)}/t${Number(autoplay.motionTurnScore || 0).toFixed(2)}/e${Number(autoplay.motionEntranceScore || 0).toFixed(2)}/s${Number(autoplay.motionStallScore || 0).toFixed(2)}/${autoplay.motionIntent || "idle"}`;
        updateRuntimeStatus(status, "autoplay-status");
        appendConsoleLine("[AUTOPLAY]", Boolean(autoplay.zeroCopy) ? "log-ok" : "log-warn", `enabled=${Boolean(autoplay.enabled)}; mode=${autoplay.mode || "disabled"}; manualMove=${Boolean(autoplay.manualMove)}; pipeline=${pipelineText}; objective=${objectiveText}; semantic=${semanticText}; strategy=${strategyText}; vision=${autoplay.vision || "none"}; zeroCopy=${Boolean(autoplay.zeroCopy)}; milestones=${milestoneText}; ammo=${ammoText}; health=${healthText}; safety=${autoplay.safetyReason || "none"}; mobility=${autoplay.mobilityMode || "none"}; wall=${autoplay.wallHugSide || "left"}; target=${targetConfidence}; enemy=${enemyText}; corner=${cornerSignal}; sig=${signatureText}; dict=${dictionaryText}; regions=${autoplay.regionSignature || "000000"}; regions9=${autoplay.region9Signature || "000000000"}; motion9=${motionText}; depthSig=${autoplay.depthSignature || "0000"}; depth=${depthEstimate}; faceSig=${autoplay.faceSignature || "0000000000000000"}; sound=${Boolean(autoplay.soundCueActive)}; stuck=${autoplay.stuckFrames || 0}; qStall=${autoplay.quantizedStallFrames || 0}; qDelta=${quantizedDelta}; rDelta=${regionDelta}; hudDelta=${hudDelta}; faceDelta=${faceDelta}; probe=${probe}; detach=${detach}; survey=${survey}; mapRush=${mapRush}; mapDoor=${mapDoor}; suppress=${autoplay.cornerSuppressFrames || 0}; repeat=${autoplay.repeatActionFrames || 0}; repeatTurn=${autoplay.repeatTurnFrames || 0}; recovery=${autoplay.recoveryFrames || 0}; loopEscape=${autoplay.loopEscapeFrames || 0}; useCooldown=${autoplay.useCooldown || 0}; predictions=${autoplay.predictions || 0}; reused=${autoplay.reused || 0}; latency=${Math.round(autoplay.latencyMs || 0)}ms`);
        return;
      }

      if (!wasmApprovalPending && normalized === "doom.autoplay off") {
        if (!doomRuntime) {
          appendConsoleLine("[ RESP ]", "log-info", "autoplay off: no runtime instance.");
          return;
        }

        const status = await doomRuntime.setAutoplay(false);
        releaseAllDoomInputs();
        updateRuntimeStatus(status, "autoplay-off");
        appendConsoleLine("[AUTOPLAY]", "log-info", "Bonsai idle: waiting for next frame.");
        return;
      }

      if (!wasmApprovalPending && normalized === "doom.use-test") {
        if (!doomRuntime?.status?.()?.inputReady || doomRuntime.status().state !== "running") {
          appendConsoleLine("[ INPUT]", "log-warn", "doom.use-test requires doom.start and a running input queue.");
          return;
        }

        sendDoomInput("use", true, 260);
        appendConsoleLine("[ INPUT]", "log-info", "doom.use-test: KEY_USE(0xa2) held for 260ms; watch for door/open-panel response.");
        return;
      }

      if (!wasmApprovalPending && normalized.startsWith("doom.cheat")) {
        const cheat = normalized.split(/\s+/).slice(1).join("").replace(/[^a-z0-9]/g, "");
        await runDoomCheat(cheat, "doom.cheat");
        return;
      }

      if (!wasmApprovalPending && doomCheatCodes.has(normalized)) {
        await runDoomCheat(normalized, "direct");
        return;
      }

      async function runDoomCheat(cheat, source) {
        if (!doomRuntime?.status?.()?.inputReady || doomRuntime.status().state !== "running") {
          appendConsoleLine("[CHEAT]", "log-warn", `${source} requires doom.start and a running input queue.`);
          return;
        }

        if (!doomCheatCodes.has(cheat)) {
          appendConsoleLine("[CHEAT]", "log-warn", "supported cheats: idfa, idkfa, iddqd, idspispopd, idclip.");
          return;
        }

        await typeDoomCheat(cheat);
        appendConsoleLine("[CHEAT]", "log-ok", `${cheat} sent as DOOM key events.`);
      }

      if (!wasmApprovalPending && normalized === "doom.restart-play") {
        if (!doomRuntime?.status?.()?.inputReady || doomRuntime.status().state !== "running") {
          appendConsoleLine("[ INPUT]", "log-warn", "doom.restart-play requires doom.start and a running input queue.");
          return;
        }

        const wasAutoplay = Boolean(doomRuntime.status().autoplay?.enabled);
        await doomRuntime.setAutoplay(false);
        releaseAllDoomInputs();
        for (let index = 0; index < 3; index += 1) {
          sendDoomInput("use", true, 320);
          await new Promise(resolve => setTimeout(resolve, 430));
          sendDoomInput("enter", true, 220);
          await new Promise(resolve => setTimeout(resolve, 320));
        }
        if (wasAutoplay) {
          await doomRuntime.setAutoplay(true);
        }
        const status = doomRuntime.status();
        updateRuntimeStatus(status, "running");
        appendConsoleLine("[ INPUT]", "log-ok", `doom.restart-play: reborn/menu sequence sent; autoplay=${wasAutoplay ? "restored" : "off"}.`);
        return;
      }

      if (!wasmApprovalPending && ["doom.start", "aik exec run doom"].includes(normalized)) {
        if (!doomRuntime) {
          appendConsoleLine("[ FAIL ]", "log-fail", "Doom browser runtime script is unavailable.");
          return;
        }

        appendConsoleLine("[ RESP ]", "log-info", "doom.start accepted: mounting DOOM1.WAD, calling doom_init, and starting framebuffer loop.");
        doomScreenPanel.hidden = false;
        try {
          const status = await doomRuntime.start();
          doomRuntimePanel.open = false;
          updateRuntimeStatus(status, "running");
          appendConsoleLine("[ RESP ]", "log-ok", `${status.state}: doom_tick -> doom_render loop active.`);
          halted.innerHTML = "[ RUNNING ] AIKERNEL.DOOM FRAMEBUFFER STABLE.<span>doom_tick -> doom_render is driving the 320x200 paletted framebuffer.</span><span>doom.stop halts the render loop safely.</span>";
        } catch (error) {
          appendConsoleLine("[ FAIL ]", "log-fail", error instanceof Error ? error.message : String(error));
        }
        return;
      }

      if (!wasmApprovalPending && normalized === "doom.stop") {
        releaseAllDoomInputs();
        if (doomRuntime) {
          const status = await doomRuntime.stop();
          doomRuntimePanel.open = true;
          updateRuntimeStatus(status, "stopped");
          appendConsoleLine("[ RESP ]", "log-info", `${status.state}: render loop stopped.`);
        } else {
          appendConsoleLine("[ RESP ]", "log-info", "stopped: no runtime instance.");
        }
        return;
      }

      if (normalized === "clear") {
        container.textContent = "";
        return;
      }

      if (normalized === "copy.logs" || normalized === "copy logs") {
        await copyDebugLogs();
        return;
      }

      appendConsoleLine("[ RESP ]", "log-info", responses[normalized] || `unknown command: ${command}`);
    }

    window.runWasmCommand = runWasmCommand;

    async function runButtonCommands(button) {
      const sequence = button.dataset.commandSequence
        ? button.dataset.commandSequence.split("|").map(value => value.trim()).filter(Boolean)
        : [];
      const commands = sequence.length ? sequence : [button.dataset.command].filter(Boolean);
      if (!commands.length) {
        return;
      }

      button.disabled = true;
      try {
        for (const command of commands) {
          await runWasmCommand(command);
        }
      } finally {
        button.disabled = false;
        promptInput.focus();
      }
    }
    window.getAIKernelDoomStatus = function getAIKernelDoomStatus() {
      return doomRuntime?.status?.() || null;
    };
    window.pulseAIKernelDoomInput = function pulseAIKernelDoomInput(name) {
      pulseDoomInput(name);
    };

    window.holdAIKernelDoomInput = function holdAIKernelDoomInput(name, holdMs) {
      sendDoomInput(name, true, Math.max(1, Number(holdMs) || DOOM_PULSE_INPUT_MS));
      setTimeout(() => sendDoomInput(name, false), Math.max(1, Number(holdMs) || DOOM_PULSE_INPUT_MS));
    };

    function sendDoomInput(name, pressed, holdMs = 0) {
      const keycode = doomKeyCodes[name];
      const status = doomRuntime?.status();
      if (!keycode || !status?.inputReady || status.state !== "running") {
        if (pressed) {
          appendConsoleLine("[ INPUT]", "log-warn", "doom input queue is available after doom.start reaches running.");
        }
        return;
      }

      const queued = holdMs > 0 && typeof doomRuntime?.queueManualInput === "function"
        ? doomRuntime.queueManualInput(keycode, pressed, holdMs)
        : doomRuntime?.queueManualInput?.(keycode, pressed, pressed ? Number.POSITIVE_INFINITY : 0) || doomRuntime?.queueInput?.(keycode, pressed);
      if (!queued) {
        return;
      }

      doomState.textContent = `Status: ${doomRuntime.status().state}; input=${name}:${pressed ? "down" : "up"}`;
    }

    function syncManualMoveToggle(status) {
      if (!doomManualMoveToggle) {
        return;
      }

      const manualMove = Boolean(status?.autoplay?.manualMove);
      doomManualMoveToggle.classList.toggle("is-on", manualMove);
      doomManualMoveToggle.setAttribute("aria-pressed", manualMove ? "true" : "false");
      doomManualMoveToggle.textContent = manualMove ? "Manual Move: On" : "Manual Move: Off";
    }

    function syncSenseOnlyToggle(status) {
      if (!doomSenseOnlyToggle) {
        return;
      }

      const senseOnly = Boolean(status?.autoplay?.senseOnly);
      doomSenseOnlyToggle.classList.toggle("is-on", senseOnly);
      doomSenseOnlyToggle.setAttribute("aria-pressed", senseOnly ? "true" : "false");
      doomSenseOnlyToggle.textContent = senseOnly ? "Sense Only: On" : "Sense Only: Off";
    }

    function syncOverlayToggle() {
      if (!doomOverlayToggle) {
        return;
      }

      doomOverlayToggle.classList.toggle("is-on", doomDebugOverlayEnabled);
      doomOverlayToggle.setAttribute("aria-pressed", doomDebugOverlayEnabled ? "true" : "false");
      doomOverlayToggle.textContent = doomDebugOverlayEnabled ? "Detection Overlay: On" : "Detection Overlay: Off";
    }

    function formatPhaseCheck(status = doomRuntime?.status?.() || {}) {
      const autoplay = status.autoplay || {};
      const milestones = autoplay.milestones || {};
      const semantic = autoplay.semanticMemory || {};
      const firstDoor = semantic.firstDoor || {};
      const computerRoom = semantic.computerRoom || {};
      const bridge = semantic.bridge || {};
      const finalRoom = semantic.finalRoom || {};
      const detections = Array.isArray(autoplay.activeDetections) ? autoplay.activeDetections.join(",") : "none";
      const action = autoplay.action || {};
      return `pipeline=${autoplay.controlPipeline || "Idle"}; objective=${autoplay.objective || "none"}; det=${detections}; senseOnly=${Boolean(autoplay.senseOnly)}; manualMove=${Boolean(autoplay.manualMove)}; firstDoor(corr=${Number(firstDoor.corridorConfidence || 0).toFixed(2)},door=${Number(firstDoor.doorConfidence || 0).toFixed(2)},opened=${Boolean(firstDoor.opened)},use=${Boolean(milestones.firstDoorUseAttempted)}/${Number(milestones.firstDoorUseSignature || 0).toFixed(2)}); computer(conf=${Number(computerRoom.confidence || 0).toFixed(2)},dark=${Number(computerRoom.darkAreaScore || milestones.darkAreaScore || 0).toFixed(2)},entered=${Boolean(milestones.computerRoomEntered)}); bridge(conf=${Number(bridge.confidence || 0).toFixed(2)},lane=${bridge.laneTurn || milestones.bridgeLaneTurn || "none"}); final(conf=${Number(finalRoom.confidence || 0).toFixed(2)},entered=${Boolean(milestones.finalRoomEntered)}); motion=${autoplay.motion9Signature || "000000000"}/f${Number(autoplay.motionForwardProgress || 0).toFixed(2)}/t${Number(autoplay.motionTurnScore || 0).toFixed(2)}/s${Number(autoplay.motionStallScore || 0).toFixed(2)}; action=${action.move || "none"}/${action.turn || "none"}/use=${Boolean(action.use)}/fire=${Boolean(action.fire)}`;
    }

    function sendDoomKeycode(keycode, pressed, holdMs = 0) {
      const status = doomRuntime?.status();
      if (!Number.isFinite(keycode) || !status?.inputReady || status.state !== "running") {
        if (pressed) {
          appendConsoleLine("[ INPUT]", "log-warn", "doom input queue is available after doom.start reaches running.");
        }
        return false;
      }

      const queued = holdMs > 0 && typeof doomRuntime?.queueManualInput === "function"
        ? doomRuntime.queueManualInput(keycode, pressed, holdMs)
        : doomRuntime?.queueManualInput?.(keycode, pressed, pressed ? Number.POSITIVE_INFINITY : 0) || doomRuntime?.queueInput?.(keycode, pressed);
      return Boolean(queued);
    }

    async function typeDoomCheat(cheat) {
      releaseAllDoomInputs();
      for (const character of cheat) {
        const keycode = character.charCodeAt(0);
        sendDoomKeycode(keycode, true, 42);
        await delay(54);
        sendDoomKeycode(keycode, false);
        await delay(22);
      }
    }

    async function advanceDoomTitleToGameplay() {
      if (!doomRuntime?.status?.()?.inputReady || doomRuntime.status().state !== "running") {
        appendConsoleLine("[ INPUT]", "log-warn", "auto-start gameplay advance skipped: input queue is not running.");
        return;
      }

      appendConsoleLine("[ INPUT]", "log-info", "auto-start: advancing title/menu to a playable DOOM session.");
      releaseAllDoomInputs();
      await delay(520);
      for (let index = 0; index < 4; index += 1) {
        sendDoomInput("enter", true);
        await delay(150);
        sendDoomInput("enter", false);
        await delay(index === 0 ? 360 : 260);
      }
      await delay(520);
    }

    async function copyDebugLogs() {
      const status = doomRuntime?.status?.() || null;
      const lines = [
        "AIKernel.Doom debug log",
        `capturedAt=${new Date().toISOString()}`,
        "",
        "[console]",
        container.innerText || "",
        "",
        "[runtime-status]",
        runtimeStatus.innerText || "",
        "",
        "[doom-runtime-json]",
        JSON.stringify(status, null, 2)
      ];
      const text = lines.join("\n").trim();
      try {
        await navigator.clipboard.writeText(text);
        appendConsoleLine("[ DEBUG]", "log-ok", "debug log copied to clipboard.");
      } catch (error) {
        window.prompt("Copy AIKernel.Doom debug log", text);
        appendConsoleLine("[ DEBUG]", "log-warn", "clipboard API unavailable; opened copy prompt fallback.");
      }
    }

    function pressDoomInput(name) {
      if (name === "use" || name === "enter" || name === "escape") {
        pulseDoomInput(name);
        return;
      }

      if (activeDoomInputs.has(name)) {
        return;
      }

      activeDoomInputs.add(name);
      sendDoomInput(name, true);
    }

    function pulseDoomInput(name) {
      sendDoomInput(name, true, DOOM_PULSE_INPUT_MS);
      window.setTimeout(() => {
        sendDoomInput(name, false);
      }, DOOM_PULSE_INPUT_MS);
    }

    function releaseDoomInput(name) {
      if (!activeDoomInputs.has(name)) {
        return;
      }

      activeDoomInputs.delete(name);
      sendDoomInput(name, false);
    }

    function releaseAllDoomInputs() {
      for (const name of Array.from(activeDoomInputs)) {
        releaseDoomInput(name);
      }
    }

    doomController.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-command], button[data-command-sequence]");
      if (!button) {
        return;
      }

      await runButtonCommands(button);
    });

    doomDebugBar?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-command], button[data-command-sequence]");
      if (!button) {
        return;
      }

      await runButtonCommands(button);
    });

    doomOverlayToggle?.addEventListener("click", () => {
      doomDebugOverlayEnabled = !doomDebugOverlayEnabled;
      syncOverlayToggle();
      renderDoomDebugOverlay(doomRuntime?.status?.() || {});
      promptInput.focus();
    });

    doomManualMoveToggle?.addEventListener("click", async () => {
      const manualMove = Boolean(doomRuntime?.status?.().autoplay?.manualMove);
      await runWasmCommand(manualMove ? "doom.autoplay manual-move off" : "doom.autoplay manual-move on");
      syncManualMoveToggle(doomRuntime?.status?.() || {});
      promptInput.focus();
    });

    doomSenseOnlyToggle?.addEventListener("click", async () => {
      const senseOnly = Boolean(doomRuntime?.status?.().autoplay?.senseOnly);
      await runWasmCommand(senseOnly ? "doom.autoplay sense-only off" : "doom.autoplay sense-only on");
      syncSenseOnlyToggle(doomRuntime?.status?.() || {});
      promptInput.focus();
    });

    doomDetectionToggles.forEach(button => {
      const key = button.dataset.detectionToggle;
      if (!key) {
        return;
      }

      syncDetectionToggleButtons();
      button.addEventListener("click", () => {
        const enabled = doomDetectionVisibility.get(key) === false;
        doomDetectionVisibility.set(key, enabled);
        syncDetectionToggleButtons();
        renderDoomDebugOverlay(doomRuntime?.status?.() || {});
        promptInput.focus();
      });
    });

    doomController.addEventListener("pointerdown", (event) => {
      const button = event.target.closest("button[data-doom-key]");
      if (!button) {
        return;
      }

      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      pressDoomInput(button.dataset.doomKey);
    });

    doomController.addEventListener("pointerup", (event) => {
      const button = event.target.closest("button[data-doom-key]");
      if (!button) {
        return;
      }

      event.preventDefault();
      releaseDoomInput(button.dataset.doomKey);
    });

    doomController.addEventListener("pointercancel", releaseAllDoomInputs);
    doomController.addEventListener("pointerleave", releaseAllDoomInputs);
    doomController.addEventListener("contextmenu", (event) => {
      if (event.target.closest("button[data-doom-key]")) {
        event.preventDefault();
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.target.closest?.("input, textarea, select")) {
        return;
      }

      const name = keyboardDoomKeys[event.code];
      if (!name) {
        return;
      }

      event.preventDefault();
      pressDoomInput(name);
    });

    window.addEventListener("keyup", (event) => {
      const name = keyboardDoomKeys[event.code];
      if (!name) {
        return;
      }

      event.preventDefault();
      releaseDoomInput(name);
    });

    window.addEventListener("blur", releaseAllDoomInputs);

    promptForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const command = promptInput.value;
      promptInput.value = "";
      await runWasmCommand(command);
      promptInput.focus();
    });

    promptInput.addEventListener("keydown", (event) => {
      if (event.key === "ArrowUp" && commandHistory.length) {
        event.preventDefault();
        commandHistoryIndex = Math.max(0, commandHistoryIndex - 1);
        promptInput.value = commandHistory[commandHistoryIndex] || "";
      } else if (event.key === "ArrowDown" && commandHistory.length) {
        event.preventDefault();
        commandHistoryIndex = Math.min(commandHistory.length, commandHistoryIndex + 1);
        promptInput.value = commandHistory[commandHistoryIndex] || "";
      }
    });

    async function boot() {
      for (const log of logs) {
        if (log.t.includes("WAIT")) {
          await delay(900);
        } else {
          await delay(360);
        }

        appendLine(log);
      }

      await delay(700);

      panic.style.display = "block";
      halted.style.display = "block";
      promptInput.disabled = false;
      promptSubmit.disabled = false;
      promptInput.focus();

      console.info("AIKernel.Doom public prompt deployed.");
    }

    boot();

})();
