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
        m: "Review terms and licenses before approval. / 起動前に利用規約とライセンスを確認してください。"
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
        m: "AIKERNEL.DOOM WAITING FOR EXPLICIT USER APPROVAL. Type yes in the aik console or use the approval button below. / aik コンソールで yes と入力するか、下のボタンで同意して起動できます。"
      }
    ];

    const container = document.getElementById("output");
    const consoleBody = document.querySelector(".console-body");
    const halted = document.getElementById("halted");
    const panic = document.getElementById("panic");
    const promptForm = document.getElementById("wasm-prompt");
    const promptInput = document.getElementById("wasm-command");
    const promptSubmit = document.getElementById("wasm-command-run");
    const approvalActions = document.getElementById("doom-approval-actions");
    const approvalAccept = document.getElementById("doom-approval-accept");
    const approvalDecline = document.getElementById("doom-approval-decline");
    const runtimeStatus = document.getElementById("runtime-status");
    const doomScreen = document.getElementById("doom-screen");
    const doomScreenPanel = document.getElementById("doom-screen-panel");
    const doomFps = document.getElementById("doom-fps");
    const doomController = document.getElementById("doom-controller");
    const doomRuntimePanel = document.getElementById("doom-runtime-panel");
    const doomState = document.getElementById("doom-state");
    const doomControllerDebugLog = document.getElementById("doom-controller-debug-log");
    const doomControllerDebugLogList = document.getElementById("doom-controller-debug-log-list");
    let doomControllerDebugFilters = Array.from(document.querySelectorAll("[data-debug-log-filter]"));
    const doomDebugBar = document.getElementById("doom-debug-bar");
    const doomDebugOverlay = document.getElementById("doom-debug-overlay");
    const doomOverlayToggle = document.getElementById("doom-overlay-toggle");
    let doomAutoplayToggle = document.getElementById("doom-autoplay-toggle");
    const doomManualMoveToggle = document.getElementById("doom-manual-move-toggle");
    const doomSenseOnlyToggle = document.getElementById("doom-sense-only-toggle");
    let doomSensorToggles = Array.from(document.querySelectorAll("[data-sensor-toggle]"));
    const doomDetectionToggles = Array.from(document.querySelectorAll("[data-detection-toggle]"));
    let doomSpatialHud = null;
    let doomGoalHud = null;
    let doomToposHud = null;
    let doomAudioLeftFill = null;
    let doomAudioRightFill = null;
    let doomAudioLowFill = null;
    let doomAudioMidFill = null;
    let doomAudioHighFill = null;
    let doomAudioReadout = null;
    let doomSpatialEventIcon = null;
    let doomAudioEventBadge = null;
    let doomAudioPlaybackToggle = document.getElementById("doom-audio-playback-toggle");
    let doomToposDetailToggle = document.getElementById("doom-topos-detail-toggle");
    let doomBridgeAudioSnapshot = null;
    let doomAudioHudEnvelope = { left: 0, right: 0, balance: 0, updatedAt: 0 };
    let doomAudioEventHolds = [];

    const sensorUi = {
      visual: { label: "Visual", signal: "9x9 frame", group: "is-sense", layer: "Aisthesis" },
      audio: { label: "Audio", signal: "stereo energy", group: "is-sense", layer: "Aisthesis" },
      motor: { label: "Motor", signal: "input vector", group: "is-motion", layer: "Kinesis" },
      movement: { label: "Movement", signal: "motion vector", group: "is-motion", layer: "Kinesis" },
      compass: { label: "Compass", signal: "heading vector", group: "is-heading", layer: "Hodos" },
      spatial: { label: "Spatial", signal: "fused vector", group: "is-space", layer: "Topos" },
      health: { label: "Health", signal: "life state", group: "is-life", layer: "Zoe" }
    };
    const commandHistory = [];
    const controllerDebugLogEntries = [];
    const controllerDebugLogSignatureByCategory = new Map();
    const CONTROLLER_DEBUG_LOG_MAX_VISIBLE = 18;
    let commandHistoryIndex = 0;
    let controllerDebugLogFilter = "all";
    let controllerDebugLogLimit = CONTROLLER_DEBUG_LOG_MAX_VISIBLE;
    let controllerDebugLogAutoLimit = true;
    let controllerDebugLogResizeObserver = null;
    let wasmApprovalPending = true;
    let lastRuntimeStatus = "";
    let lastObjectiveStatus = "";
    const downloadProgressTracker = requireDownloadProgressAdapter("createTracker")();
    let doomDebugOverlayEnabled = true;
    let doomToposDetailEnabled = false;
    const doomDetectionVisibility = new Map([
      ["motion", true],
      ["objective", true],
      ["door", true],
      ["wall", true],
      ["enemy", true],
      ["computer", true],
      ["foot", true],
      ["hud", true],
      ["audio", true],
      ["movement", true],
      ["spatial", true],
      ["health", true]
    ]);
    const DOOM_PULSE_INPUT_MS = 140;
    const doomSchemaDefinitionUrls = [
      "/demo/doom/autoplay-action.schema.json",
      "/demo/doom/autoplay-profile.schema.json",
      "/demo/doom/autoplay-sensor-tensor.schema.json",
      "/demo/doom/autoplay-state.schema.json",
      "/demo/doom/autoplay-status.schema.json"
    ];
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
      KeyW: "forward",
      KeyS: "back",
      KeyA: "left",
      KeyD: "right",
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
        onStatusChange: queueRuntimeStatusUpdate
      })
      : null;
    window.AIKernelDoomRuntime = doomRuntime;
    let doomHasStarted = false;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let consoleFollowTimer = 0;
    const runtimeStatusFlow = requireRuntimeStatusFlowAdapter("createFlow")();
    let latestRuntimeStatus = null;

    function appendLine(log) {
      const line = document.createElement("div");
      line.className = "line";
      line.innerHTML = `<span class="${log.c}">${log.t}</span> ${log.m}`;
      container.appendChild(line);
      followConsoleOutput(false);
    }

    function appendConsoleLine(tag, className, message, options = {}) {
      const line = document.createElement("div");
      const label = document.createElement("span");
      line.className = "line";
      label.className = className;
      label.textContent = tag;
      line.appendChild(label);
      line.appendChild(document.createTextNode(` ${message}`));
      container.appendChild(line);
      followConsoleOutput(Boolean(options.pageFollow));
    }

    function setApprovalUiState(state = "ready") {
      if (!approvalActions) {
        return;
      }

      const waiting = state === "ready" || state === "suspended" || state === "failed";
      const busy = state === "loading";
      const hidden = state === "hidden" || state === "running";
      approvalActions.dataset.state = state;
      approvalActions.classList.toggle("is-collapsed", hidden);
      approvalActions.setAttribute("aria-hidden", hidden ? "true" : "false");
      [approvalAccept, approvalDecline].forEach(button => {
        if (button) {
          button.disabled = !waiting || busy || hidden;
        }
      });
    }

    function setApprovalNoticeHtml(state = "ready") {
      if (!halted) {
        return;
      }

      if (state === "loading") {
        halted.classList.add("is-visible");
        halted.innerHTML = "[ LOADING ] AIKERNEL.DOOM APPROVED DOWNLOAD/LOAD ACTIVE.<span>Fetching and validating doom.wasm, DOOM1.WAD, Bonsai model, manifests, and metadata.</span><span>同意後のダウンロードと検証を実行しています。</span>";
      } else if (state === "ready") {
        halted.classList.add("is-visible");
        halted.innerHTML = "[ READY ] AIKERNEL.DOOM STARTS AFTER USER APPROVAL.<span>The public demo asks for consent before downloading DOOM1.WAD, Bonsai-1.7B, and doom.wasm. Type <code>yes</code> in the aik console or use the approval button below. Current protected size estimate: about 270MB, under 300MB.</span><span>利用規約とライセンスを確認し、aik コンソールで <code>yes</code> と入力するか下のボタンで同意すると、約300MBのデータ取得を許可して Doom デモを起動します。</span>";
      }
    }

    function scrollConsoleHistoryToTail() {
      if (!container) {
        return;
      }

      const target = Math.max(0, container.scrollHeight - container.clientHeight);
      if (typeof container.scrollTo === "function") {
        container.scrollTo({ top: target, left: 0, behavior: "auto" });
      } else {
        container.scrollTop = target;
      }
      container.scrollTop = target;
    }

    function followConsoleOutput(pageFollow = false) {
      if (!container) {
        return;
      }

      scrollConsoleHistoryToTail();
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => {
          scrollConsoleHistoryToTail();
          window.requestAnimationFrame(scrollConsoleHistoryToTail);
          const tail = container.lastElementChild;
          const keepGameViewport = document.activeElement === doomScreen && doomRuntime?.status?.().state === "running";
          if (pageFollow && !keepGameViewport && tail && typeof tail.scrollIntoView === "function") {
            tail.scrollIntoView({ block: "end", inline: "nearest" });
          }
        });
      }
      window.clearTimeout(consoleFollowTimer);
      consoleFollowTimer = window.setTimeout(scrollConsoleHistoryToTail, 80);
    }

    function renderDownloadProgress(progress, status = {}, reason = "") {
      if (!progress || wasmApprovalPending) {
        return;
      }

      const view = downloadProgressTracker.update(progress, status, reason);
      if (!view) {
        return;
      }

      if (halted && view.active) {
        halted.classList.add("is-visible");
        halted.innerHTML = `[ LOADING ] AIKERNEL.DOOM APPROVED DOWNLOAD/LOAD ACTIVE.<span>${escapeText(view.headline)}</span><span>${escapeText(view.detail)}</span>`;
      }

      if (view.shouldLog) {
        appendConsoleLine("[ LOAD ]", view.logClass, view.progressText);
      }
    }

    function focusDoomViewport(reason = "runtime") {
      if (!doomScreen) {
        return false;
      }

      doomHasStarted = true;
      if (doomScreenPanel) {
        doomScreenPanel.hidden = false;
      }
      setDoomRuntimeUiVisibility(doomRuntime?.status?.() || { state: "running" });

      if (doomScreen.tabIndex < 0) {
        doomScreen.tabIndex = 0;
      }

      const applyFocus = () => {
        scrollDoomRuntimeIntoView(reason);
        try {
          doomScreen.focus({ preventScroll: true });
        } catch {
          doomScreen.focus();
          scrollDoomRuntimeIntoView(reason);
        }

        renderDoomState(doomRuntime?.status?.() || { state: "unknown" }, `focus=game:${reason}`);
      };

      applyFocus();
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(applyFocus);
      }
      window.setTimeout?.(applyFocus, 120);
      window.setTimeout?.(applyFocus, 360);
      window.setTimeout?.(applyFocus, 900);

      return true;
    }

    function scrollDoomRuntimeIntoView(reason = "runtime") {
      const anchor = doomScreenPanel || doomScreen;
      if (!anchor || typeof window.scrollTo !== "function") {
        return;
      }

      const margin = reason.indexOf("approved") >= 0 ? 10 : 12;
      const anchorRect = anchor.getBoundingClientRect();
      const top = anchorRect.top + window.scrollY;
      const target = top - margin;

      window.scrollTo({
        top: Math.max(0, Math.round(target)),
        left: window.scrollX || 0,
        behavior: "auto"
      });
    }

    function focusAikConsole(reason = "prompt") {
      if (!promptInput || promptInput.disabled) {
        return false;
      }

      try {
        promptInput.focus({ preventScroll: true });
      } catch {
        promptInput.focus();
      }

      return document.activeElement === promptInput;
    }

    function focusPromptUnlessGameRunning(reason = "prompt") {
      const status = doomRuntime?.status?.() || {};
      if (status.state === "running" && doomScreenPanel?.hidden === false) {
        return focusDoomViewport(`release-console:${reason}`);
      }

      return focusAikConsole(reason);
    }

    function isDoomRuntimeUiVisible(status = doomRuntime?.status?.() || {}) {
      return doomHasStarted || status?.state === "running";
    }

    function setDoomRuntimeUiVisibility(status = doomRuntime?.status?.() || {}) {
      const visible = isDoomRuntimeUiVisible(status);
      const gameSurfaceVisible = visible && doomScreenPanel?.hidden === false;
      consoleBody?.classList.toggle("is-doom-running", gameSurfaceVisible);
      if (runtimeStatus) {
        runtimeStatus.hidden = !visible;
      }
      if (doomController) {
        doomController.hidden = !visible;
      }
      if (doomRuntimePanel) {
        doomRuntimePanel.hidden = !visible;
      }
      if (doomDebugBar) {
        doomDebugBar.hidden = !visible || doomScreenPanel?.hidden !== false;
      }
      if (doomState) {
        doomState.hidden = !visible;
      }

      if (!visible) {
        setGpuHudOverlayEnabled(false);
        if (doomDebugOverlay) {
          doomDebugOverlay.classList.remove("is-visible");
          doomDebugOverlay.replaceChildren();
        }

        const hudNodes = [
          doomSpatialHud,
          doomGoalHud,
          doomToposHud,
          doomSpatialEventIcon,
          doomAudioEventBadge
        ];
        for (const node of hudNodes) {
          if (node) {
            node.hidden = true;
          }
        }
      }

      return visible;
    }

    function escapeText(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    const DISPLAY_LABELS = {
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
    };

    function labelize(value) {
      const key = String(value || "none");
      if (DISPLAY_LABELS[key]) {
        return DISPLAY_LABELS[key];
      }

      return key
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
    }

    function resolvePrimaryObjective(autoplay) {
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
      const milestones = autoplay?.milestones || {};
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

      if (milestones.firstDoorCorridorLocated || milestones.firstDoorUseAttempted || autoplay.controlPipeline === "FirstDoor" || autoplay.controlPipeline === "OpeningHome") {
        return "FirstDoor";
      }

      return String(autoplay.controlPipeline || autoplay.objective || "Idle")
        .replace(/[^A-Za-z0-9]+/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase())
        .replace(/\s+/g, "");
    }

    function resolveSubObjectives(autoplay) {
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
      if (!autoplay?.enabled) {
        return "Idle";
      }

      const prefix = resolvePriorityPrefix(autoplay);
      const action = autoplay.currentAction || autoplay.lastAction || {};
      const safety = String(autoplay.safetyReason || "");
      const mobility = String(autoplay.mobilityMode || "");
      if (autoplay.healthLikelyDead || autoplay.healthSensor?.retryRequested || autoplay.retryDispatch?.active) {
        return `[P] Retry Now`;
      }

      if (action.fire || /combat-fire|front-enemy|combat/i.test(safety) || /combat-fire|combat-aim/i.test(mobility)) {
        return `[P] Fire`;
      }

      if (action.use || (autoplay.firstDoorUseLatchFrames || 0) > 0 || /use|probe/i.test(safety) || /use|probe/i.test(mobility)) {
        return `[${prefix}] ${prefix === "P" ? "Probe Safety" : "Use / Open"}`;
      }

      if (prefix === "P") {
        return `[P] Avoid Threat`;
      }

      if (/survey|context-reset|relocalization/i.test(safety) || /survey/i.test(mobility)) {
        return `[${prefix}] Survey`;
      }

      if (prefix === "E") {
        return `[E] Pursue Goal`;
      }

      if (/first-door|door-probe|door/i.test(mobility) || autoplay.controlPipeline === "FirstDoor") {
        return `[L] Align Door`;
      }

      if (/computer|bridge|advance|corridor|transit/i.test(mobility) || autoplay.controlPipeline === "ComputerRoom") {
        return `[L] Advance Route`;
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

      return `[L] Approach Target`;
    }

    function resolveKairosSignal(autoplay) {
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

      if (autoplay?.nousDetectorResult?.sensorRecovery?.needed) {
        return "Kairos: Recovery";
      }

      return "";
    }

    function renderDoomState(status, note = "") {
      if (!setDoomRuntimeUiVisibility(status)) {
        return;
      }

      const autoplay = status?.autoplay || {};
      const fps = Number.isFinite(status?.fps) ? Number(status.fps).toFixed(1) : "0.0";
      const targetFps = status?.targetFps || 0;
      const modeFlags = [
        autoplay.manualMove ? "manual-move" : "",
        autoplay.senseOnly ? "sense-only" : "",
        note || ""
      ].filter(Boolean).join(" / ");

      doomState.textContent = `Status: ${status?.state || "unknown"} · fps=${fps}/${targetFps} · autoplay=${autoplay.enabled ? autoplay.mode || "on" : "off"}${modeFlags ? ` · ${modeFlags}` : ""}`;
    }

    function queueRuntimeStatusUpdate(status, reason = "status") {
      runtimeStatusFlow.queue(status, reason, {
        light: syncRuntimeStatusLight,
        update: updateRuntimeStatus
      });
    }

    function requireDownloadProgressAdapter(name) {
      const fn = window.AIKernelDoomDownloadProgress?.[name];
      if (typeof fn !== "function") {
        throw new Error(`AIKernelDoomDownloadProgress.${name} is not available.`);
      }

      return fn;
    }

    function requireRuntimeStatusFlowAdapter(name) {
      const fn = window.AIKernelDoomRuntimeStatusFlow?.[name];
      if (typeof fn !== "function") {
        throw new Error(`AIKernelDoomRuntimeStatusFlow.${name} is not available.`);
      }

      return fn;
    }

    function requireControllerDebugLogAdapter(name) {
      const fn = window.AIKernelDoomControllerDebugLog?.[name];
      if (typeof fn !== "function") {
        throw new Error(`AIKernelDoomControllerDebugLog.${name} is not available.`);
      }

      return fn;
    }

    function normalizeControllerDebugCategory(value) {
      return requireControllerDebugLogAdapter("normalizeCategory")(value);
    }

    function normalizeControllerDebugEntry(entry, fallbackCategory = "control") {
      return requireControllerDebugLogAdapter("normalizeEntry")(entry, fallbackCategory);
    }

    function controllerDebugEntriesFromDecisionTrace(trace, optionText, reason = "status") {
      return requireControllerDebugLogAdapter("entriesFromDecisionTrace")(trace, optionText, reason);
    }

    function controllerDebugEntryMatches(entry, filter) {
      return requireControllerDebugLogAdapter("entryMatches")(entry, filter);
    }

    function controllerDebugCategoryGlyph(entry) {
      return requireControllerDebugLogAdapter("categoryGlyph")(entry);
    }

    function estimateControllerDebugLogLimit() {
      if (!doomControllerDebugLog || !doomControllerDebugLogList) {
        return controllerDebugLogLimit;
      }

      const header = doomControllerDebugLog.querySelector(".doom-controller-debug-log-head");
      const headerHeight = header?.getBoundingClientRect?.().height || 0;
      const style = getComputedStyle(doomControllerDebugLog);
      const paddingY = (Number.parseFloat(style.paddingTop || "0") || 0)
        + (Number.parseFloat(style.paddingBottom || "0") || 0);
      const availableHeight = Math.max(
        0,
        Math.min(
          doomControllerDebugLogList.clientHeight || 0,
          doomControllerDebugLog.clientHeight - headerHeight - paddingY
        )
      );
      const sample = doomControllerDebugLogList.querySelector(".doom-control-log-entry, .doom-control-log-empty");
      const sampleHeight = sample?.getBoundingClientRect?.().height || 12;
      const rowGap = Number.parseFloat(getComputedStyle(doomControllerDebugLogList).rowGap || "3") || 3;
      return Math.max(4, Math.min(
        CONTROLLER_DEBUG_LOG_MAX_VISIBLE,
        Math.floor((availableHeight + rowGap) / Math.max(8, sampleHeight + rowGap))
      ));
    }

    function resolveControllerDebugLogLimit() {
      if (!controllerDebugLogAutoLimit) {
        return Math.max(1, Math.min(CONTROLLER_DEBUG_LOG_MAX_VISIBLE, Number(controllerDebugLogLimit) || CONTROLLER_DEBUG_LOG_MAX_VISIBLE));
      }

      controllerDebugLogLimit = estimateControllerDebugLogLimit();
      return controllerDebugLogLimit;
    }

    function renderControllerDebugLog() {
      if (!doomControllerDebugLog || !doomControllerDebugLogList) {
        return;
      }

      doomControllerDebugLog.dataset.filter = controllerDebugLogFilter;
      for (const button of doomControllerDebugFilters) {
        const active = normalizeControllerDebugCategory(button.dataset.debugLogFilter || "all") === controllerDebugLogFilter;
        button.classList.toggle("is-on", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      }

      const limit = resolveControllerDebugLogLimit();
      doomControllerDebugLog.dataset.limit = String(limit);
      const entries = controllerDebugLogEntries
        .filter(entry => controllerDebugEntryMatches(entry, controllerDebugLogFilter))
        .slice(0, limit);
      const fragment = document.createDocumentFragment();
      if (!entries.length) {
        const empty = document.createElement("li");
        empty.className = "doom-control-log-empty";
        empty.textContent = "awaiting control telemetry";
        fragment.appendChild(empty);
      } else {
        for (const entry of entries) {
          const item = document.createElement("li");
          item.className = `doom-control-log-entry is-${entry.category} is-${entry.level}`;
          const label = document.createElement("span");
          label.className = "doom-control-log-label";
          label.textContent = controllerDebugCategoryGlyph(entry);
          label.title = entry.label;
          const message = document.createElement("span");
          message.className = "doom-control-log-message";
          message.textContent = entry.message;
          item.title = `${entry.timestamp} ${entry.category}: ${entry.message}`;
          item.appendChild(label);
          item.appendChild(message);
          fragment.appendChild(item);
        }
      }

      doomControllerDebugLogList.replaceChildren(fragment);
      window.AIKernelDoomLastControllerDebugLog = getControllerDebugLogEntries(controllerDebugLogLimit);
    }

    function getControllerDebugLogEntries(limit = controllerDebugLogLimit, filter = controllerDebugLogFilter) {
      const count = Math.max(1, Math.min(100, Number(limit) || resolveControllerDebugLogLimit()));
      return controllerDebugLogEntries
        .filter(entry => controllerDebugEntryMatches(entry, filter || "all"))
        .slice(0, count)
        .map(entry => Object.assign({}, entry));
    }

    function pushControllerDebugLog(entry, options = {}) {
      const normalized = normalizeControllerDebugEntry(entry, options.category || "control");
      const signature = `${normalized.category}|${normalized.label}|${normalized.message}|${normalized.value}`;
      if (options.dedupe !== false && controllerDebugLogSignatureByCategory.get(normalized.category) === signature) {
        return null;
      }

      controllerDebugLogSignatureByCategory.set(normalized.category, signature);
      controllerDebugLogEntries.unshift(normalized);
      const maxEntries = Math.max(12, Math.min(200, Number(options.maxEntries) || 72));
      if (controllerDebugLogEntries.length > maxEntries) {
        controllerDebugLogEntries.length = maxEntries;
      }
      if (Number.isFinite(Number(options.limit))) {
        controllerDebugLogLimit = Math.max(1, Math.min(CONTROLLER_DEBUG_LOG_MAX_VISIBLE, Number(options.limit)));
        controllerDebugLogAutoLimit = false;
      } else if (options.autoLimit !== false) {
        controllerDebugLogAutoLimit = true;
      }
      renderControllerDebugLog();
      return Object.assign({}, normalized);
    }

    function setControllerDebugLogEntries(entries, options = {}) {
      controllerDebugLogEntries.length = 0;
      controllerDebugLogSignatureByCategory.clear();
      if (Number.isFinite(Number(options.limit))) {
        controllerDebugLogLimit = Math.max(1, Math.min(CONTROLLER_DEBUG_LOG_MAX_VISIBLE, Number(options.limit)));
        controllerDebugLogAutoLimit = false;
      } else if (options.autoLimit !== false) {
        controllerDebugLogAutoLimit = true;
      }
      const values = Array.isArray(entries) ? entries : [entries];
      for (let index = values.length - 1; index >= 0; index -= 1) {
        const normalized = normalizeControllerDebugEntry(values[index], options.category || "control");
        controllerDebugLogEntries.unshift(normalized);
        controllerDebugLogSignatureByCategory.set(
          normalized.category,
          `${normalized.category}|${normalized.label}|${normalized.message}|${normalized.value}`
        );
      }
      renderControllerDebugLog();
      return getControllerDebugLogEntries(controllerDebugLogLimit, controllerDebugLogFilter);
    }

    function setControllerDebugLogFilter(filter = "all") {
      controllerDebugLogFilter = normalizeControllerDebugCategory(filter || "all");
      renderControllerDebugLog();
      return controllerDebugLogFilter;
    }

    function clearControllerDebugLog() {
      controllerDebugLogEntries.length = 0;
      controllerDebugLogSignatureByCategory.clear();
      renderControllerDebugLog();
    }

    function setControllerDebugMessage(message, options = {}) {
      const payload = message && typeof message === "object"
        ? message
        : Object.assign({}, options, { message });
      return pushControllerDebugLog(payload, options);
    }

    function scheduleControllerDebugLogRender() {
      if (!controllerDebugLogAutoLimit) {
        return;
      }

      window.requestAnimationFrame(() => renderControllerDebugLog());
    }

    function observeControllerDebugLogLayout() {
      if (!doomControllerDebugLog || controllerDebugLogResizeObserver) {
        return;
      }

      if (typeof ResizeObserver === "function") {
        controllerDebugLogResizeObserver = new ResizeObserver(scheduleControllerDebugLogRender);
        controllerDebugLogResizeObserver.observe(doomControllerDebugLog);
        if (doomController) {
          controllerDebugLogResizeObserver.observe(doomController);
        }
      }
      window.addEventListener("resize", scheduleControllerDebugLogRender, { passive: true });
      window.visualViewport?.addEventListener?.("resize", scheduleControllerDebugLogRender, { passive: true });
      window.visualViewport?.addEventListener?.("scroll", scheduleControllerDebugLogRender, { passive: true });
    }

    function syncControllerDebugLog(status = {}, reason = "status") {
      const autoplay = status?.autoplay || {};
      const semantic = autoplay.semanticMemory || {};
      const control = status?.hudFlowControl || {};
      const telos = resolveTelosObjective(autoplay);
      const objective = autoplay.objective || semantic.objective || "none";
      const pipeline = autoplay.controlPipeline || semantic.phase || "Idle";
      const priority = Number(autoplay.strategyPriority ?? autoplay.priority ?? 0);
      const optionText = `auto=${autoplay.enabled ? "on" : "off"} manual=${Boolean(autoplay.manualMove)} sense=${Boolean(autoplay.senseOnly)} hud=${control.mode || "adaptive"}`;
      const traceEntries = controllerDebugEntriesFromDecisionTrace(autoplay.decisionTrace, optionText, reason);
      if (traceEntries.length) {
        setControllerDebugLogEntries(traceEntries, { autoLimit: true });
        return;
      }

      pushControllerDebugLog({
        category: "priority",
        label: "PRIORITY",
        message: `${Number.isFinite(priority) ? priority : 0} ${autoplay.strategyName || pipeline}`,
        value: priority,
        level: priority >= 2 ? "warn" : "info"
      });
      pushControllerDebugLog({
        category: "telos",
        label: "TELOS",
        message: telos || "Monitor runtime",
        value: telos
      });
      pushControllerDebugLog({
        category: "objective",
        label: "OBJECTIVE",
        message: `${objective} via ${pipeline}`,
        value: objective
      });
      pushControllerDebugLog({
        category: "control",
        label: "CONTROL",
        message: `${reason}: ${optionText}`,
        value: optionText
      });
    }

    function syncRuntimeStatusLight(status, reason = "status") {
      latestRuntimeStatus = status || latestRuntimeStatus;
      renderDownloadProgress(status?.downloadProgress, status, reason);
      if (!setDoomRuntimeUiVisibility(status)) {
        return;
      }

      renderDoomState(status, reason);
      syncSensorToggles(status);
      syncAutoplayToggle(status);
      syncManualMoveToggle(status);
      syncSenseOnlyToggle(status);
      syncOverlayToggle();
      syncAudioPlaybackToggle(status);
      syncControllerDebugLog(status, reason);
      const control = status?.hudFlowControl || {};
      const fps = Number.isFinite(status?.fps) ? Number(status.fps).toFixed(1) : "0.0";
      doomFps.textContent = `320x200 paletted framebuffer; fps=${fps}; hud=${control.mode || "adaptive"}; drop=${runtimeStatusFlow.snapshot().droppedFrames}; auto=${status?.autoplay?.enabled ? "on" : "off"}`;
    }

    function updateRuntimeStatus(status, reason = "status") {
      latestRuntimeStatus = status || latestRuntimeStatus;
      renderDownloadProgress(status?.downloadProgress, status, reason);
      if (!setDoomRuntimeUiVisibility(status)) {
        lastRuntimeStatus = "";
        lastObjectiveStatus = "";
        return;
      }

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
      const routeText = `blue=${Number(milestones.blueFloorScore || 0).toFixed(2)}; court=${Number(milestones.courtyardScore || 0).toFixed(2)}/${milestones.courtyardTurn || "none"}/${milestones.courtyardRescueMode || "none"}/${milestones.courtyardRescueFrames || 0}; secret=${Number(milestones.spawnSecretDoorScore || 0).toFixed(2)}/${milestones.spawnSecretDoorTurn || "none"}; stair=${Number(milestones.spawnWestStairScore || 0).toFixed(2)}/${milestones.spawnWestStairTurn || "none"}; gap=${Number(milestones.spawnCorridorGapScore || 0).toFixed(2)}/${milestones.spawnCorridorGapTurn || "none"}/${milestones.spawnCorridorGapFrames || 0}; bridge=${Number(milestones.bridgeBrownScore || 0).toFixed(2)}/${Number(milestones.bridgeGreenLeft || 0).toFixed(2)}-${Number(milestones.bridgeGreenCenter || 0).toFixed(2)}-${Number(milestones.bridgeGreenRight || 0).toFixed(2)}/${milestones.bridgeLaneTurn || "none"}/door${Number(milestones.bridgeDoorScore || 0).toFixed(2)}; corridor=${milestones.firstDoorCorridorLocated ? "yes" : "no"}/${milestones.firstDoorCorridorFrames || 0}/${Number(milestones.firstDoorCorridorSignature || 0).toFixed(2)}/v9${Number(milestones.firstDoorVision9x9Score || 0).toFixed(2)}; deadEnd=${milestones.firstDoorDeadEndTurnFrames || 0}; useSeen=${Boolean(milestones.firstDoorUseAttempted)}/${Number(milestones.firstDoorUseSignature || 0).toFixed(2)}`;
      const computerText = `computer=${milestones.computerRoomEntered ? "yes" : "no"}/${milestones.computerRoomFrames || 0}/${Number(milestones.computerRoomScore || 0).toFixed(2)}/${Number(milestones.computerBlueScore || 0).toFixed(2)}/${Number(milestones.computerRedLightScore || 0).toFixed(2)}/${Number(milestones.computerDarkPanelScore || 0).toFixed(2)}/${Number(milestones.computerPanelScore || 0).toFixed(2)}`;
      const milestoneText = `door=${milestones.doorOpened || 0}; dark=${milestones.darkZoneEntered ? "yes" : "no"}/${milestones.darkZoneFrames || 0}; darkArea=${Number(milestones.darkAreaScore || 0).toFixed(2)}; luma=${Number(milestones.gameplayLuma || 0).toFixed(1)}; ${computerText}; ${routeText}; ${mapText}; ${progressText}; enemy=${milestones.enemyDefeated || 0}; ${alertText}; bursts=${milestones.combatFireFrames || 0}; peak=${Number(milestones.enemyConfidencePeak || 0).toFixed(2)}; drop=${milestones.enemyDropFrames || 0}`;
      const ammoText = `${autoplay.ammoLikelyEmpty ? "empty" : "ok"}/${autoplay.ammoSignature || "000000000000000000000"}`;
      const healthText = `${autoplay.healthLikelyDead ? "dead" : "live"}/z${Number(autoplay.healthZeroScore || 0).toFixed(2)}/c${autoplay.healthActiveColumns || 0}/a${autoplay.healthActiveCells || 0}/${autoplay.healthSignature || "000000000000000000000000"}`;
      const retryDispatch = autoplay.retryDispatch || {};
      const retryText = `${retryDispatch.active ? "active" : "idle"}/${retryDispatch.cooldownFrames || 0}/${retryDispatch.reason || "none"}`;
      const movement = autoplay.movementSensor || {};
      const audioSnapshot = autoplay.auditorySnapshot || status.audio || {};
      const audioEnergy = Math.max(Number(audioSnapshot.leftEnergy || 0), Number(audioSnapshot.rightEnergy || 0));
      const audioText = `${audioSnapshot.eventDetected ? "event" : "idle"}/${audioSnapshot.eventType || "none"}/${audioEnergy.toFixed(3)}/b${Number(audioSnapshot.lowEnergy || 0).toFixed(3)}-${Number(audioSnapshot.midEnergy || 0).toFixed(3)}-${Number(audioSnapshot.highEnergy || 0).toFixed(3)}`;
      const visualMotion = autoplay.visualMotion || {};
      const nous = autoplay.nousCarrier || {};
      const detector = autoplay.nousDetectorResult || nous.cognitionHints?.nousDetectorResult || {};
      const motionText = `${autoplay.motion9Signature || "000000000"}/${Number(autoplay.motion9Delta ?? 255).toFixed(2)}/f${Number(autoplay.motionForwardProgress || 0).toFixed(2)}/o${Number(autoplay.motionObstacleScore || 0).toFixed(2)}/t${Number(autoplay.motionTurnScore || 0).toFixed(2)}/e${Number(autoplay.motionEntranceScore || 0).toFixed(2)}/s${Number(autoplay.motionStallScore || 0).toFixed(2)}/${autoplay.motionIntent || "idle"}`;
      const footText = `${Number(autoplay.footObstacleScore || 0).toFixed(2)}/${Number(autoplay.priorFootObstacleScore || 0).toFixed(2)}/f${Number(autoplay.footObstacleFlickerScore || 0).toFixed(2)}/b${autoplay.footObstacleBounceFrames || 0}/d${Number(autoplay.footObstacleBandDelta || 0).toFixed(2)}`;
      const visualFlowText = `${Number(visualMotion.vectorX || 0).toFixed(2)}/${Number(visualMotion.vectorY || 0).toFixed(2)}/m${Number(visualMotion.magnitude || 0).toFixed(2)}/b${Number(visualMotion.baseMagnitude || 0).toFixed(2)}/lm${autoplay.compassLandmarks || 0}`;
      const nousText = `${nous.bonsaiTernary?.aisthesis || "neutral"}/${nous.bonsaiTernary?.kinesis || "neutral"}/${nous.bonsaiTernary?.phantasia || "neutral"}`;
      const nousDetectorText = `loom=${detector.looming?.active ? detector.looming.direction || "active" : "-"}; dmg=${detector.damageLocalization?.active ? detector.damageLocalization.direction || "active" : "-"}; trap=${detector.trap?.active ? detector.trap.kind || "active" : "-"}; stuck=${detector.stuck?.active ? "yes" : "no"}; ent=${detector.explorationEntropy?.high ? "high" : "ok"}; item=${detector.itemBacktrack?.suggested ? detector.itemBacktrack.targetKind || "yes" : "-"}; rec=${detector.sensorRecovery?.needed ? detector.sensorRecovery.reason || "yes" : "-"}`;
      const autoplayText = `${autoplay.enabled ? "on" : "off"}/${autoplay.mode || "disabled"}${autoplay.manualMove ? "/manual-move" : ""}${autoplay.senseOnly ? "/sense-only" : ""}; pipeline=${pipelineText}; objective=${objectiveText}; det=${detectionText}; semantic=${semanticText}; strategy=${strategyText}; vision=${autoplay.vision || "none"}; zeroCopy=${Boolean(autoplay.zeroCopy)}; safety=${autoplay.safetyReason || "none"}; mobility=${autoplay.mobilityMode || "none"}; move=${Number(movement.vectorX || 0).toFixed(2)}/${Number(movement.vectorY || 0).toFixed(2)}/${Number(movement.confidence || 0).toFixed(2)}; flow=${visualFlowText}; nous=${nousText}; nousDet=${nousDetectorText}; wall=${autoplay.wallHugSide || "left"}; target=${targetConfidence}; enemy=${enemyText}; ammo=${ammoText}; health=${healthText}; retry=${retryText}; milestones=${milestoneText}; corner=${cornerSignal}; sig=${signatureText}; dict=${dictionaryText}; regions=${autoplay.regionSignature || "000000"}; regions9=${autoplay.region9Signature || "000000000"}; vision9x9=${String(autoplay.vision9x9Signature || "").slice(0, 18)}; motion9=${motionText}; foot=${footText}; depthSig=${autoplay.depthSignature || "0000"}; depth=${depthEstimate}; faceSig=${autoplay.faceSignature || "0000000000000000"}; sound=${Boolean(autoplay.soundCueActive)}; audio=${audioText}; stuck=${autoplay.stuckFrames || 0}; qStall=${autoplay.quantizedStallFrames || 0}; qDelta=${quantizedDelta}; rDelta=${regionDelta}; hudDelta=${hudDelta}; faceDelta=${faceDelta}; probe=${probe}; detach=${detach}; survey=${survey}; mapRush=${mapRush}; mapDoor=${mapDoor}; suppress=${autoplay.cornerSuppressFrames || 0}; repeat=${autoplay.repeatActionFrames || 0}; repeatTurn=${autoplay.repeatTurnFrames || 0}; recovery=${autoplay.recoveryFrames || 0}; loopEscape=${autoplay.loopEscapeFrames || 0}; useCooldown=${autoplay.useCooldown || 0}; useLatch=${autoplay.firstDoorUseLatchFrames || 0}/${autoplay.firstDoorUsePulsed ? "pulsed" : "armed"}; predictions=${autoplay.predictions || 0}; reuse=${autoplay.reused || 0}; latency=${Math.round(autoplay.latencyMs || 0)}ms`;
      const text = `runtime=${status.state}; wasm=${status.wasmLoaded}; wad=${status.wadLoaded}; model=${status.modelLoaded}; input=${status.inputReady}; actionInput=${status.actionInputReady}; loop=${status.loopActive}; ${watchdogText}; autoplay=${autoplayText}; frames=${status.frameCount || 0}; fps=${fps}/${targetFps}; work=${workMs}ms; yield=${yieldMs}ms; gpuWait=${gpuWaitMs}ms; gpuTimeouts=${gpuTimeouts}; gpu=${status.gpuDelegate || "pending"}; framebuffer=${status.framebuffer}`;
      runtimeStatus.innerHTML = `<strong>runtime</strong>=${status.state}; wasm=${status.wasmLoaded}; wad=${status.wadLoaded}; model=${status.modelLoaded}; input=${status.inputReady}; actionInput=${status.actionInputReady}; loop=${status.loopActive}; ${watchdogText}; autoplay=${autoplayText}; frames=${status.frameCount || 0}; fps=${fps}/${targetFps}; work=${workMs}ms; yield=${yieldMs}ms; gpuWait=${gpuWaitMs}ms; gpuTimeouts=${gpuTimeouts}; gpu=${status.gpuDelegate || "pending"}; framebuffer=${status.framebuffer}`;
      const hudControl = status.hudFlowControl || {};
      doomFps.textContent = `320x200 paletted framebuffer; fps=${fps}; cap=${targetFps}; yield=${yieldMs}ms; gpu=${gpuWaitMs}ms/${gpuTimeouts}; hud=${hudControl.mode || "adaptive"}/drop${runtimeStatusFlow.snapshot().droppedFrames}; auto=${autoplay.enabled ? "on" : "off"}`;
      renderDoomState(status);
      setDoomRuntimeUiVisibility(status);
      syncAutoplayToggle(status);
      syncManualMoveToggle(status);
      syncSenseOnlyToggle(status);
      syncOverlayToggle();
      syncToposDetailToggle();
      syncSensorToggles(status);
      syncDetectionToggleButtons(status);
      ensureDoomSpatialHud();
      ensureDoomGoalHud();
      ensureDoomToposHud();
      updateDoomSpatialHud(status);
      updateDoomGoalHud(status);
      updateDoomToposHud(status);
      syncAudioPlaybackToggle(status);
      renderDoomDebugOverlay(status);
      syncControllerDebugLog(status, reason);

      lastObjectiveStatus = objectiveText;

      if (text !== lastRuntimeStatus && ["stopped", "failed"].includes(reason)) {
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
        setGpuHudOverlayEnabled(false);
        doomDebugOverlay.replaceChildren();
        return;
      }

      const gpuHudActive = syncGpuHudOverlay(status);
      doomDebugOverlay.classList.toggle("is-gpu-backed", gpuHudActive);
      if (gpuHudActive) {
        doomDebugOverlay.replaceChildren();
        return;
      }

      const autoplay = status?.autoplay || {};
      const milestones = autoplay.milestones || {};
      const semantic = autoplay.semanticMemory || {};
      const objective = autoplay.objective || semantic.objective || "none";
      const pipeline = autoplay.controlPipeline || semantic.phase || "Idle";
      const priorityLabel = resolvePriorityAction(autoplay);
      const doorOpened = Number(milestones.doorOpened || 0) > 0;
      const firstDoorPhase = !doorOpened;
      const activeDetections = new Set(Array.isArray(autoplay.activeDetections) ? autoplay.activeDetections : []);
      const phaseDetectionReady = activeDetections.size > 0;
      const detectorEnabled = (key) => doomDetectionVisibility.get(key) !== false && (!phaseDetectionReady || activeDetections.has(key));
      const showMotion = detectorEnabled("motion");
      const showPriority = detectorEnabled("objective");
      const showDoor = detectorEnabled("door");
      const showWall = detectorEnabled("wall");
      const showEnemy = detectorEnabled("enemy");
      const showComputer = detectorEnabled("computer");
      const showFoot = detectorEnabled("foot");
      const showHud = detectorEnabled("hud");
      const showSpatial = detectorEnabled("spatial");
      const showHealth = detectorEnabled("health");
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

      if (showPriority) {
        fragment.appendChild(createDebugRegion(
          "is-objective",
          33,
          49,
          34,
          16,
          "PRIORITY:",
          priorityLabel,
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

      if (showFoot && (Number(autoplay.priorFootObstacleScore || 0) > 0.18
        || Number(autoplay.footObstacleFlickerScore || 0) > 0.32
        || Number(autoplay.footObstacleBounceFrames || 0) > 0
        || Number(autoplay.inputStallFrames || 0) > 0)) {
        fragment.appendChild(createDebugRegion(
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
        fragment.appendChild(createDebugRegion(
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
        fragment.appendChild(createDebugRegion(
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
      if (showSpatial && autoplay.spatialSnapshot?.eventDetected) {
        const spatial = autoplay.spatialSnapshot;
        const x = Math.max(4, Math.min(86, Number(spatial.hudX ?? 0.5) * 100 - 7));
        const y = Math.max(4, Math.min(70, Number(spatial.hudY ?? 0.45) * 80 - 7));
        fragment.appendChild(createDebugRegion(
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
        fragment.appendChild(createDebugRegion(
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

      doomDebugOverlay.replaceChildren(fragment);
    }

    function resolveWebGpuProvider() {
      return window.WebGpuComputeProvider || window.webGpuComputeProvider || window.aikernelWebGpuComputeProvider || null;
    }

    function setGpuHudOverlayEnabled(enabled) {
      const provider = resolveWebGpuProvider();
      if (typeof provider?.setHudOverlayEnabled !== "function") {
        return false;
      }

      const next = Boolean(enabled);
      provider.setHudOverlayEnabled(next);
      return next;
    }

    function syncGpuHudOverlay(status = doomRuntime?.status?.() || {}) {
      const provider = resolveWebGpuProvider();
      if (typeof provider?.setHudOverlayEnabled !== "function") {
        return false;
      }

      const providerStatus = typeof provider.status === "function" ? provider.status() : {};
      const renderer = `${status?.renderer || ""} ${providerStatus?.backend || ""}`;
      const ready = Boolean(providerStatus?.hudOverlayReady && providerStatus?.usingCpuFallback === false && /webgpu/i.test(renderer));
      provider.setHudOverlayEnabled(Boolean(doomDebugOverlayEnabled && ready));
      const nextStatus = typeof provider.status === "function" ? provider.status() : providerStatus;
      return Boolean(nextStatus?.hudOverlayActive);
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
        const score = clampHud01(Number(heatmap[index] || 0));
        if (score < 0.08) {
          continue;
        }

        const column = index % 9;
        const row = Math.floor(index / 9);
        const cell = createDebugRegion(
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

      fragment.appendChild(createDebugRegion(
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

    function ensureDoomSpatialHud() {
      if (doomSpatialHud || !doomScreen) {
        return;
      }

      const host = doomScreen.parentElement || doomScreenPanel;
      if (!host) {
        return;
      }

      if (!host.style.position) {
        host.style.position = "relative";
      }

      doomSpatialHud = document.createElement("div");
      doomSpatialHud.className = "doom-spatial-hud";
      doomSpatialHud.style.cssText = "position:absolute;left:8px;top:8px;z-index:8;display:grid;grid-template-columns:24px minmax(78px,96px);grid-template-rows:auto auto;align-items:end;gap:4px 6px;max-width:138px;padding:5px 6px;border:1px solid rgba(80,255,160,.45);background:rgba(0,0,0,.62);color:#b9ffd4;font:10px ui-monospace,Consolas,monospace;pointer-events:none;";

      const leftGauge = document.createElement("div");
      leftGauge.style.cssText = "width:9px;height:38px;border:1px solid rgba(185,255,212,.55);display:flex;align-items:flex-end;background:rgba(20,40,30,.55);";
      doomAudioLeftFill = document.createElement("div");
      doomAudioLeftFill.style.cssText = "width:100%;height:100%;background:#6bff9b;transform:scaleY(0);transform-origin:bottom;";
      leftGauge.appendChild(doomAudioLeftFill);

      const rightGauge = document.createElement("div");
      rightGauge.style.cssText = "width:9px;height:38px;border:1px solid rgba(185,255,212,.55);display:flex;align-items:flex-end;background:rgba(20,40,30,.55);";
      doomAudioRightFill = document.createElement("div");
      doomAudioRightFill.style.cssText = "width:100%;height:100%;background:#7ab7ff;transform:scaleY(0);transform-origin:bottom;";
      rightGauge.appendChild(doomAudioRightFill);

      const gaugeRack = document.createElement("div");
      gaugeRack.style.cssText = "grid-row:1;grid-column:1;display:flex;align-items:flex-end;gap:3px;";
      gaugeRack.appendChild(leftGauge);
      gaugeRack.appendChild(rightGauge);

      doomAudioReadout = document.createElement("div");
      doomAudioReadout.id = "doom-audio-readout";
      doomAudioReadout.style.cssText = "grid-row:1;grid-column:2;min-width:0;line-height:1.25;text-shadow:0 1px 2px #000;white-space:normal;overflow:hidden;";
      doomAudioReadout.textContent = "L 0.00 R 0.00";
      const bandRack = document.createElement("div");
      bandRack.style.cssText = "grid-row:2;grid-column:1 / span 2;width:100%;display:grid;grid-template-rows:repeat(3,5px);gap:2px;";
      doomAudioLowFill = createAudioBandFill("#8ee4ff");
      doomAudioMidFill = createAudioBandFill("#ffe17a");
      doomAudioHighFill = createAudioBandFill("#ff8fb4");
      bandRack.appendChild(createAudioBandTrack(doomAudioLowFill, "L"));
      bandRack.appendChild(createAudioBandTrack(doomAudioMidFill, "M"));
      bandRack.appendChild(createAudioBandTrack(doomAudioHighFill, "H"));

      doomSpatialHud.appendChild(gaugeRack);
      doomSpatialHud.appendChild(doomAudioReadout);
      doomSpatialHud.appendChild(bandRack);
      doomAudioEventBadge = document.createElement("div");
      doomAudioEventBadge.className = "doom-audio-event-rack";
      doomAudioEventBadge.style.cssText = "grid-column:1 / span 2;display:flex;flex-wrap:wrap;align-items:center;gap:3px;min-width:0;max-width:138px;max-height:42px;overflow:hidden;";
      doomAudioEventBadge.hidden = true;
      doomSpatialHud.appendChild(doomAudioEventBadge);
      host.appendChild(doomSpatialHud);

      doomSpatialEventIcon = document.createElement("div");
      doomSpatialEventIcon.className = "doom-spatial-event";
      doomSpatialEventIcon.style.cssText = "position:absolute;z-index:9;width:18px;height:18px;border-radius:50%;border:2px solid rgba(255,240,120,.95);background:rgba(255,80,40,.78);box-shadow:0 0 14px rgba(255,120,40,.8);transform:translate(-50%,-50%);pointer-events:none;";
      doomSpatialEventIcon.hidden = true;
      host.appendChild(doomSpatialEventIcon);

      if (doomDebugBar && !doomAutoplayToggle) {
        const doomDebugActions = doomDebugBar.querySelector(".doom-debug-actions") || doomDebugBar;
        doomAutoplayToggle = document.createElement("button");
        doomAutoplayToggle.id = "doom-autoplay-toggle";
        doomAutoplayToggle.type = "button";
        doomAutoplayToggle.dataset.command = "doom.autoplay toggle";
        doomAutoplayToggle.className = "doom-debug-switch doom-autoplay-switch is-off";
        doomAutoplayToggle.setAttribute("aria-pressed", "false");
        doomAutoplayToggle.textContent = "Autoplay: Off";
        doomDebugActions.appendChild(doomAutoplayToggle);
      }

      if (doomDebugBar && !doomAudioPlaybackToggle) {
        const doomDebugActions = doomDebugBar.querySelector(".doom-debug-actions") || doomDebugBar;
        doomAudioPlaybackToggle = document.createElement("button");
        doomAudioPlaybackToggle.type = "button";
        doomAudioPlaybackToggle.dataset.command = "doom.audio toggle";
        doomAudioPlaybackToggle.className = "doom-debug-switch doom-audio-switch is-off";
        doomAudioPlaybackToggle.setAttribute("aria-pressed", "false");
        doomAudioPlaybackToggle.textContent = "Audio Off";
        doomDebugActions.appendChild(doomAudioPlaybackToggle);
      }

      if (doomDebugBar && !doomToposDetailToggle) {
        const doomDebugActions = doomDebugBar.querySelector(".doom-debug-actions") || doomDebugBar;
        doomToposDetailToggle = document.createElement("button");
        doomToposDetailToggle.id = "doom-topos-detail-toggle";
        doomToposDetailToggle.type = "button";
        doomToposDetailToggle.className = "doom-debug-switch doom-topos-detail-switch";
        doomToposDetailToggle.setAttribute("aria-pressed", "false");
        doomToposDetailToggle.textContent = "CTG: Simple";
        doomDebugActions.appendChild(doomToposDetailToggle);
      }

      ensureDoomSensorToggleRow();
    }

    function ensureDoomGoalHud() {
      if (doomGoalHud || !doomScreen) {
        return;
      }

      const host = doomScreen.parentElement || doomScreenPanel;
      if (!host) {
        return;
      }

      if (!host.style.position) {
        host.style.position = "relative";
      }

      doomGoalHud = document.createElement("div");
      doomGoalHud.className = "doom-goal-hud";
      doomGoalHud.setAttribute("aria-live", "polite");
      host.appendChild(doomGoalHud);
    }

    function updateDoomGoalHud(status) {
      if (!doomGoalHud) {
        return;
      }

      const autoplay = status?.autoplay || {};
      const telos = resolveTelosObjective(autoplay);
      const primary = resolvePrimaryObjective(autoplay);
      const subObjectives = resolveSubObjectives(autoplay);
      const fragment = document.createDocumentFragment();
      const telosNode = document.createElement("div");
      const telosLabel = document.createElement("span");
      const telosValue = document.createElement("strong");
      telosNode.className = "doom-goal-telos";
      telosLabel.className = "doom-goal-label";
      telosLabel.textContent = "TELOS";
      telosValue.textContent = telos;
      telosNode.appendChild(telosLabel);
      telosNode.appendChild(telosValue);
      fragment.appendChild(telosNode);

      const primaryNode = document.createElement("div");
      primaryNode.className = "doom-goal-primary";
      const objectiveLabel = document.createElement("span");
      const objectiveValue = document.createElement("strong");
      objectiveLabel.className = "doom-goal-objective-label";
      objectiveLabel.textContent = "OBJECTIVE";
      objectiveValue.textContent = primary;
      primaryNode.appendChild(objectiveLabel);
      primaryNode.appendChild(objectiveValue);
      fragment.appendChild(primaryNode);

      const subNode = document.createElement("div");
      subNode.className = "doom-goal-sub";
      for (let index = 0; index < Math.min(subObjectives.length, 7); index += 1) {
        const item = subObjectives[index];
        const chip = document.createElement("span");
        chip.className = `doom-goal-chip is-${item.kind || "monitor"}`;
        chip.textContent = item.label || "Monitoring";
        subNode.appendChild(chip);
      }
      fragment.appendChild(subNode);
      doomGoalHud.replaceChildren(fragment);
    }

    function ensureDoomToposHud() {
      if (doomToposHud || !doomScreen) {
        return;
      }

      const host = doomScreen.parentElement || doomScreenPanel;
      if (!host) {
        return;
      }

      if (!host.style.position) {
        host.style.position = "relative";
      }

      doomToposHud = document.createElement("pre");
      doomToposHud.className = "doom-topos-hud";
      doomToposHud.setAttribute("aria-label", "Topos and CTG observed carrier");
      doomToposHud.style.cssText = "position:absolute;right:10px;top:10px;z-index:8;min-width:210px;max-width:280px;margin:0;padding:8px 10px;border:1px solid rgba(255,225,122,.48);background:rgba(10,12,8,.68);color:#ffeaa0;font:10px/1.34 ui-monospace,Consolas,monospace;text-shadow:0 1px 2px #000;white-space:pre-wrap;pointer-events:none;";
      host.appendChild(doomToposHud);
    }

    function updateDoomToposHud(status) {
      if (!doomToposHud) {
        return;
      }

      const autoplay = status?.autoplay || {};
      if (!autoplay.enabled) {
        doomToposHud.textContent = "[CTG OBSERVED]\n  idle\n\n[Topos]\n  waiting for autoplay";
        return;
      }

      const carrier = autoplay.toposDecisionCarrier || autoplay.ctgCarrier?.toposDecision || {};
      const scores = autoplay.ctgObservedScores || autoplay.ctgCarrier?.observedScores || resolveObservedCtgScores(autoplay);
      const decision = resolveObservedDecisionCarrier(autoplay, scores, carrier);
      const topos = resolveObservedToposCarrier(autoplay);
      const compass = autoplay.compassSensor || {};
      const kairos = resolveKairosCarrier(autoplay);
      const weights = scores.weights || { logos: 0, pathos: 0, ethos: 0 };
      const simpleLines = [
        "[CTG]",
        `  Dominant: ${decision.dominant}`,
        `  Vector: ${decision.vector} (${formatHudScore(decision.confidence)})`,
        `  W: L=${formatHudScore(weights.logos)} P=${formatHudScore(weights.pathos)} E=${formatHudScore(weights.ethos)}`,
        "",
        "[Topos]",
        `  Target: ${topos.target}`,
        `  Phase: ${topos.phase}`,
        `  Distance: ${topos.distance}`,
        "",
        "[Kairos]",
        `  ${kairos.state}${kairos.trigger && kairos.trigger !== "none" ? ` / ${kairos.trigger}` : ""}`
      ];
      const detailLines = [
        "[CTG OBSERVED]",
        `  LOGOS: dist=${topos.distance} headingRel=${formatHudScore(scores.headingRel)} corridor=${topos.corridor}`,
        `  PATHOS: danger=${formatHudScore(scores.danger)} (${scores.dangerKind}) stuck=${formatHudScore(scores.stuck)}`,
        `  ETHOS: TELOS=${topos.target} Obj=${labelize(autoplay.objective || "Monitor")}`,
        `  W: L=${formatHudScore(weights.logos)} P=${formatHudScore(weights.pathos)} E=${formatHudScore(weights.ethos)}`,
        "",
        "[CTG DECISION CARRIER]",
        `  Vector: ${decision.vector} (${formatHudScore(decision.confidence)})`,
        `  Dominant: ${decision.dominant}`,
        `  Source: ${decision.source}`,
        `  Feedback: ${decision.feedback}`,
        "",
        "[Topos]",
        `  Target: ${topos.target}`,
        `  Phase: ${topos.phase}`,
        `  Distance: ${topos.distance}`,
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
        `  Trigger: ${kairos.trigger}`
      ];
      doomToposHud.textContent = (doomToposDetailEnabled ? detailLines : simpleLines).join("\n");
    }

    function resolveObservedCtgScores(autoplay) {
      const milestones = autoplay?.milestones || {};
      const compass = autoplay?.compassSensor || {};
      const headingConfidence = clampHud01(Number(compass.confidence || 0));
      const headingRel = compass.headingUsable === false || compass.headingUncertain
        ? Math.min(headingConfidence, 0.34)
        : Math.max(headingConfidence, compass.headingReliability === "absolute-landmark" || compass.headingReliability === "absolute-forced-landmark" ? 0.82 : 0.48);
      const routeEvidence = Math.max(
        Number(milestones.firstDoorVision9x9Score || 0),
        Number(milestones.firstDoorCorridorSignature || 0),
        Number(milestones.computerRoomScore || 0),
        Number(milestones.computerPanelScore || 0),
        Number(milestones.spawnCorridorGapScore || 0));
      const logos = clampHud01((headingRel * 0.46) + (routeEvidence * 0.42) + (autoplay.controlPipeline ? 0.12 : 0));
      const projectile = Number(autoplay.projectileScore || autoplay.phantasiaSnapshot?.projectileScore || 0);
      const enemy = Number(autoplay.enemyConfidence || 0);
      const dynamicObject = Number(autoplay.phantasiaSnapshot?.dynamicObjectScore || autoplay.dynamicObjectScore || 0);
      const health = autoplay.healthLikelyDead || autoplay.healthSensor?.retryRequested ? 1 : 0;
      const danger = clampHud01(Math.max(projectile, enemy, dynamicObject, health));
      const footBounce = Number(autoplay.footObstacleBounceFrames || 0) >= 3
        ? Number(autoplay.footObstacleFlickerScore || 0)
        : 0;
      const stuck = clampHud01(Math.max(Number(autoplay.motionStallScore || 0), Number(autoplay.stuckFrames || 0) / 12, footBounce));
      const pathos = clampHud01(Math.max(danger, stuck));
      const ethos = clampHud01((resolveTelosObjective(autoplay) === "Recovery" ? 1 : 0.38)
        + (autoplay.retryDispatch?.active ? 0.32 : 0)
        + ((milestones.doorOpened || 0) > 0 || milestones.computerRoomEntered ? 0.18 : 0));
      const dangerKind = health > 0
        ? "health"
        : (projectile >= Math.max(enemy, dynamicObject) && projectile > 0.18
          ? "projectile"
          : (enemy >= Math.max(dynamicObject, 0.18) ? "enemy" : (dynamicObject > 0.18 ? "dynamic" : "none")));
      return { logos, pathos, ethos, headingRel, danger, stuck, dangerKind };
    }

    function resolveObservedDecisionCarrier(autoplay, scores, carrier) {
      const carrierVector = carrier?.decisionVector || null;
      if (carrierVector) {
        const x = Number(carrierVector.x || 0);
        const y = Number(carrierVector.y || 0);
        return {
          dominant: carrier.dominantAxis || scores.dominant || "LOGOS",
          confidence: Number(carrier.confidence || Math.max(scores.logos, scores.pathos, scores.ethos)),
          vector: `${carrierVector.arrow || resolveObservedVector(autoplay, carrierVector.turn, carrierVector.move)} x=${x.toFixed(2)} y=${y.toFixed(2)}`,
          source: labelize(carrier.source || "vector-superposition"),
          feedback: carrier.feedbackApplied ? labelize(carrier.feedbackReason || "applied") : "observed"
        };
      }

      const dominant = scores.pathos >= Math.max(scores.logos, scores.ethos)
        ? "PATHOS"
        : (scores.ethos >= Math.max(scores.logos, scores.pathos) ? "ETHOS" : "LOGOS");
      const confidence = clampHud01(Math.max(scores.logos, scores.pathos, scores.ethos));
      const turn = autoplay?.lastAction?.turn || autoplay?.wallUseProbeTurn || autoplay?.enemyTurn || "none";
      const move = autoplay?.lastAction?.move || autoplay?.mobilityMode || "none";
      const vector = resolveObservedVector(autoplay, turn, move);
      const source = autoplay?.safetyReason && autoplay.safetyReason !== "none"
        ? labelize(autoplay.safetyReason)
        : labelize(autoplay?.controlPipeline || autoplay?.strategyName || "Observed");
      return { dominant, confidence, vector, source, feedback: "observed" };
    }

    function resolveObservedToposCarrier(autoplay) {
      const milestones = autoplay?.milestones || {};
      const target = resolveTelosObjective(autoplay);
      const phase = labelize(autoplay?.controlPipeline || autoplay?.semanticMemory?.phase || "Unknown");
      const depth = Number(autoplay?.depthEstimate ?? autoplay?.spatialSnapshot?.confidence ?? NaN);
      const distance = Number.isFinite(depth)
        ? `depth=${depth.toFixed(2)}`
        : "unknown";
      const corridor = Boolean(milestones.firstDoorCorridorLocated || milestones.spawnCorridorGapFrames || autoplay?.compassSensor?.headingReliability === "corridor-ambiguous");
      return { target, phase, distance, corridor: corridor ? "true" : "false" };
    }

    function resolveKairosCarrier(autoplay) {
      const signal = resolveKairosSignal(autoplay);
      if (signal) {
        const parts = signal.split(":");
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

    function resolveObservedVector(autoplay, turn, move) {
      const spatial = autoplay?.spatialSensor || autoplay?.spatialSnapshot || {};
      const fused = Number(spatial.fusedDirection);
      if (Number.isFinite(fused)) {
        return `${directionArrowFromDegrees(fused)} ${Math.round(((fused % 360) + 360) % 360)}deg`;
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

    function directionArrowFromDegrees(value) {
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

    function formatHudScore(value) {
      return clampHud01(Number(value || 0)).toFixed(2);
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
      return `${names[index]} rel=${formatHudScore(compass.confidence)}`;
    }

    function formatLandmark(compass, autoplay) {
      const kind = compass?.landmarkKind || compass?.landmarkLabel || autoplay?.signatureMatchKind || "none";
      const confidence = Number(compass?.landmarkConfidence ?? autoplay?.targetConfidence ?? 0);
      return `${labelize(kind)} (${formatHudScore(confidence)})`;
    }

    function ensureDoomSensorToggleRow() {
      if (!doomDebugBar) {
        return;
      }

      let sensorRow = doomDebugBar.querySelector(".doom-sensor-toggles");
      if (!sensorRow) {
        sensorRow = document.createElement("div");
        sensorRow.className = "doom-sensor-toggles";
        doomDebugBar.appendChild(sensorRow);
      }

      const sensors = ["visual", "audio", "motor", "movement", "compass", "spatial", "health"];
      for (let index = 0; index < sensors.length; index += 1) {
        const key = sensors[index];
        const descriptor = sensorUi[key] || { label: `${key} Sensor`, signal: "sensor input", group: "", layer: "Sensor" };
        if (sensorRow.querySelector(`[data-sensor-toggle="${key}"]`)) {
          continue;
        }

        let host = descriptor.group ? sensorRow.querySelector(`.doom-sensor-node.${descriptor.group} .doom-sensor-node-buttons`) : null;
        if (!host) {
          const node = document.createElement("div");
          node.className = `doom-sensor-node ${descriptor.group || ""}`.trim();
          node.setAttribute("aria-label", `${descriptor.label} sensor`);
          const nodeLabel = document.createElement("div");
          nodeLabel.className = "doom-sensor-node-label";
          nodeLabel.textContent = descriptor.layer || "Sensor";
          host = document.createElement("div");
          host.className = "doom-sensor-node-buttons";
          node.appendChild(nodeLabel);
          node.appendChild(host);
          if (sensorRow.childElementCount > 0) {
            const link = document.createElement("div");
            link.className = "doom-sensor-link";
            link.setAttribute("aria-hidden", "true");
            link.textContent = ">";
            sensorRow.appendChild(link);
          }
          sensorRow.appendChild(node);
        }

        const button = document.createElement("button");
        button.type = "button";
        button.className = "doom-debug-switch doom-sensor-switch is-on";
        button.dataset.sensorToggle = key;
        button.dataset.sensorLabel = descriptor.label;
        button.dataset.sensorSignal = descriptor.signal;
        button.dataset.command = `doom.sensor ${key} toggle`;
        button.setAttribute("aria-pressed", "true");
        renderSensorButtonContent(button, descriptor.label, descriptor.signal, true);
        host.appendChild(button);
      }

      doomSensorToggles = Array.from(document.querySelectorAll("[data-sensor-toggle]"));
      syncSensorToggles();
    }

    function updateDoomSpatialHud(status) {
      if (!doomSpatialHud) {
        return;
      }

      const autoplay = status?.autoplay || {};
      const runtimeAudio = autoplay.auditorySnapshot || status?.audio || {};
      const providerBridgeAudio = window.AIKernelWasmAudioProvider?.status?.().lastSnapshot || null;
      const bridgeAudio = fresherAudioSnapshot(doomBridgeAudioSnapshot, providerBridgeAudio);
      const audio = selectHudAudioSnapshot(runtimeAudio, bridgeAudio);
      const spatial = autoplay.spatialSnapshot || {};
      const leftRaw = clampHud01(Number(audio.leftEnergy || 0));
      const rightRaw = clampHud01(Number(audio.rightEnergy || 0));
      const balance = Math.max(-1, Math.min(1, Number(audio.balance || 0)));
      const audioEnvelope = updateAudioHudEnvelope(leftRaw, rightRaw, balance);
      const left = audioHudLevel(audioEnvelope.left);
      const right = audioHudLevel(audioEnvelope.right);
      if (doomAudioLeftFill) {
        doomAudioLeftFill.style.transform = `scaleY(${left.toFixed(3)})`;
      }
      if (doomAudioRightFill) {
        doomAudioRightFill.style.transform = `scaleY(${right.toFixed(3)})`;
      }
      if (doomAudioReadout) {
        doomAudioReadout.textContent = `L ${leftRaw.toFixed(3)} R ${rightRaw.toFixed(3)} B ${balance.toFixed(2)}`;
      }
      updateAudioBandBars(audio);

      updateAudioEventBadge(audio, spatial, leftRaw, rightRaw, balance, autoplay);
      const eventActive = (doomDetectionVisibility.get("audio") !== false && Boolean(audio.eventDetected))
        || (doomDetectionVisibility.get("spatial") !== false && Boolean(spatial.eventDetected));
      if (!doomSpatialEventIcon) {
        return;
      }

      doomSpatialEventIcon.hidden = !eventActive;
      if (!eventActive) {
        return;
      }

      const x = clampHud01(Number(spatial.hudX ?? 0.5));
      const y = clampHud01(Number(spatial.hudY ?? 0.45));
      doomSpatialEventIcon.style.left = `${(x * 100).toFixed(2)}%`;
      doomSpatialEventIcon.style.top = `${(y * 100).toFixed(2)}%`;
      doomSpatialEventIcon.title = `${audio.eventType || spatial.eventType || "spatial-event"} ${Number(spatial.confidence || 0).toFixed(2)}`;
    }

    function createAudioBandTrack(fill, label) {
      const track = document.createElement("div");
      track.style.cssText = "position:relative;overflow:hidden;border:1px solid rgba(230,240,255,.28);background:rgba(16,24,32,.7);";
      const text = document.createElement("span");
      text.textContent = label;
      text.style.cssText = "position:absolute;left:3px;top:-1px;z-index:1;color:rgba(255,255,255,.72);font:700 7px/7px ui-monospace,Consolas,monospace;text-shadow:0 1px 2px #000;";
      track.appendChild(fill);
      track.appendChild(text);
      return track;
    }

    function createAudioBandFill(color) {
      const fill = document.createElement("div");
      fill.style.cssText = `width:100%;height:100%;background:${color};transform:scaleX(0);transform-origin:left;opacity:.9;`;
      return fill;
    }

    function updateAudioBandBars(audio) {
      const low = audioHudLevel(Number(audio?.lowEnergy || 0));
      const mid = audioHudLevel(Number(audio?.midEnergy || 0));
      const high = audioHudLevel(Number(audio?.highEnergy || 0));
      if (doomAudioLowFill) {
        doomAudioLowFill.style.transform = `scaleX(${low.toFixed(3)})`;
      }
      if (doomAudioMidFill) {
        doomAudioMidFill.style.transform = `scaleX(${mid.toFixed(3)})`;
      }
      if (doomAudioHighFill) {
        doomAudioHighFill.style.transform = `scaleX(${high.toFixed(3)})`;
      }
    }

    function updateAudioEventBadge(audio, spatial, leftRaw, rightRaw, balance, autoplay = {}) {
      if (!doomAudioEventBadge) {
        return;
      }

      const now = typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
      const audioType = normalizeHudEventType(audio?.eventType);
      const spatialType = normalizeHudEventType(spatial?.eventType);
      const eventType = audioType !== "none" ? audioType : spatialType;
      const phaseText = String(`${autoplay?.objective || ""} ${autoplay?.controlPipeline || ""} ${autoplay?.strategyContext || ""}`).toLowerCase();
      const postFirstDoor = Number(autoplay?.doorOpenedCount || 0) > 0
        || phaseText.indexOf("computer") >= 0
        || phaseText.indexOf("central") >= 0;
      if (postFirstDoor) {
        doomAudioEventHolds = doomAudioEventHolds.filter(item => item.eventType !== "use-failed-voice" && item.eventType !== "use-listen");
      }
      const useListenFrames = Math.max(
        Number(autoplay?.pendingUseResponseFrames || 0),
        Number(autoplay?.firstDoorUseLatchFrames || 0));
      if (!postFirstDoor && doomDetectionVisibility.get("audio") !== false && useListenFrames > 0) {
        rememberAudioEventChip({
          eventType: "use-listen",
          label: audioEventLabel("use-listen"),
          until: now + 520,
          balance,
          energy: Math.max(Number(leftRaw || 0), Number(rightRaw || 0))
        });
      }

      const eventDetected = doomDetectionVisibility.get("audio") !== false
        && eventType !== "none"
        && (Boolean(audio?.eventDetected) || Boolean(spatial?.eventDetected));
      const energy = Math.max(Number(leftRaw || 0), Number(rightRaw || 0), Number(audio?.lowEnergy || 0), Number(audio?.midEnergy || 0), Number(audio?.highEnergy || 0));
      const staleUseFailure = postFirstDoor && (eventType === "use-failed-voice" || eventType === "use-listen");
      if (!staleUseFailure && eventDetected && (energy >= 0.001 || eventType.indexOf("use-") === 0)) {
        rememberAudioEventChip({
          eventType,
          label: audioEventLabel(eventType),
          until: now + 1800,
          balance,
          energy
        });
      }

      doomAudioEventHolds = doomAudioEventHolds.filter(item => now <= Number(item.until || 0)).slice(-3);
      if (doomAudioEventHolds.length <= 0) {
        doomAudioEventBadge.hidden = true;
        return;
      }

      doomAudioEventBadge.hidden = false;
      const fragment = document.createDocumentFragment();
      for (let index = 0; index < doomAudioEventHolds.length; index += 1) {
        fragment.appendChild(createAudioEventChip(doomAudioEventHolds[index]));
      }
      doomAudioEventBadge.replaceChildren(fragment);
    }

    function rememberAudioEventChip(next) {
      const eventType = normalizeHudEventType(next?.eventType);
      if (eventType === "none") {
        return;
      }

      const side = Number(next.balance || 0) > 0.18 ? "R" : (Number(next.balance || 0) < -0.18 ? "L" : "C");
      const key = `${eventType}:${side}`;
      for (let index = 0; index < doomAudioEventHolds.length; index += 1) {
        if (doomAudioEventHolds[index].key === key) {
          doomAudioEventHolds[index] = Object.assign({}, next, { eventType, side, key });
          return;
        }
      }

      doomAudioEventHolds.push(Object.assign({}, next, { eventType, side, key }));
      if (doomAudioEventHolds.length > 3) {
        doomAudioEventHolds = doomAudioEventHolds.slice(-3);
      }
    }

    function createAudioEventChip(item) {
      const chip = document.createElement("span");
      const energyText = Math.max(0, Math.min(1, Number(item.energy || 0))).toFixed(3);
      chip.textContent = `${item.label} ${item.side || "C"} e=${energyText}`;
      chip.style.cssText = "flex:0 0 auto;white-space:nowrap;padding:2px 4px;border:1px solid rgba(255,220,120,.72);background:rgba(40,24,8,.78);color:#ffe59a;font:9px ui-monospace,Consolas,monospace;text-shadow:0 1px 2px #000;box-shadow:0 0 10px rgba(255,170,40,.24);";
      if (item.eventType === "use-success-gate") {
        chip.style.borderColor = "rgba(120,255,180,.82)";
        chip.style.background = "rgba(8,36,22,.82)";
        chip.style.color = "#bfffd3";
      } else if (item.eventType === "use-failed-voice") {
        chip.style.borderColor = "rgba(255,110,100,.9)";
        chip.style.background = "rgba(46,10,8,.84)";
        chip.style.color = "#ffc5bd";
      } else if (item.eventType === "use-listen") {
        chip.style.borderColor = "rgba(120,190,255,.86)";
        chip.style.background = "rgba(8,22,46,.82)";
        chip.style.color = "#cbe6ff";
      }
      return chip;
    }

    function normalizeHudEventType(value) {
      const text = String(value || "none").trim().toLowerCase();
      return text && text !== "none" ? text : "none";
    }

    function audioEventLabel(eventType) {
      if (eventType === "use-success-gate") {
        return "Door motion";
      }

      if (eventType === "use-failed-voice") {
        return "Use failed";
      }

      if (eventType === "use-response") {
        return "Use response";
      }

      if (eventType === "use-listen") {
        return "Use listen";
      }

      if (eventType.indexOf("spatial") >= 0) {
        return "Spatial cue";
      }

      return "Audio cue";
    }

    window.addEventListener("aikernel-audio-cue", event => {
      doomBridgeAudioSnapshot = event.detail || null;
      ensureDoomSpatialHud();
      updateDoomSpatialHud(doomRuntime?.status?.() || {});
    });

    window.setInterval(() => {
      if (!doomSpatialHud || doomScreenPanel?.hidden !== false) {
        return;
      }

      updateDoomSpatialHud(doomRuntime?.status?.() || {});
    }, 200);

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

    function syncAudioPlaybackToggle(status = doomRuntime?.status?.() || {}) {
      if (!doomAudioPlaybackToggle) {
        return;
      }

      const muted = status?.audio?.muted !== false;
      doomAudioPlaybackToggle.textContent = muted ? "Audio Off" : "Audio On";
      doomAudioPlaybackToggle.classList.toggle("is-off", muted);
      doomAudioPlaybackToggle.classList.toggle("is-on", !muted);
      doomAudioPlaybackToggle.setAttribute("aria-pressed", muted ? "false" : "true");
      doomAudioPlaybackToggle.title = muted
        ? "Debug audio playback is muted."
        : "Debug audio playback is enabled through the WASM audio bridge when available.";
    }

    function renderSensorButtonContent(button, label, signal, enabled) {
      if (!button) {
        return;
      }

      const title = document.createElement("span");
      title.className = "sensor-title";
      title.textContent = label;

      const detail = document.createElement("span");
      detail.className = "sensor-signal";
      detail.textContent = button.dataset.sensorToggle === "compass"
        ? signal
        : `${enabled ? "On" : "Off"} / ${signal}`;

      button.replaceChildren(title, detail);
    }

    function formatSignedNumber(value, digits = 1) {
      const number = Number(value || 0);
      if (!Number.isFinite(number) || Math.abs(number) < 0.005) {
        return `+${Number(0).toFixed(digits)}`;
      }

      return `${number >= 0 ? "+" : ""}${number.toFixed(digits)}`;
    }

    function compactCompassSource(source) {
      const text = String(source || "").trim();
      if (!text) {
        return "relative";
      }

      if (text.indexOf("courtyard-facing-east") >= 0) {
        return "courtyard -> E";
      }

      if (text.indexOf("first-door-facing-north") >= 0) {
        return "first door -> N";
      }

      if (text.indexOf("first-door-facing-east") >= 0) {
        return "first door -> E";
      }

      if (text.indexOf("spawn-corridor-facing-north") >= 0) {
        return "corridor -> N";
      }

      if (text.indexOf("orthogonal-diagonal-edge-45-snap") >= 0) {
        return "edge diag -> 45";
      }

      if (text.indexOf("orthogonal-vertical-edge-45-snap") >= 0) {
        return "edge V -> 45";
      }

      if (text.indexOf("orthogonal-horizontal-edge-45-snap") >= 0) {
        return "edge H -> 45";
      }

      if (text.indexOf("learned") >= 0) {
        return "learned landmark";
      }

      if (text.indexOf("health-freeze") >= 0) {
        return "health freeze";
      }

      if (text.indexOf("evidence-hold") >= 0) {
        return "evidence hold";
      }

      if (text.indexOf("sensor-cutoff") >= 0) {
        return "sensor cutoff";
      }

      if (text.indexOf("movement-audio-relative") >= 0) {
        return "movement+audio fusion";
      }

      if (text.indexOf("relative-sensor-fusion") >= 0) {
        return "relative sensor fusion";
      }

      return text.length > 32 ? `${text.slice(0, 32)}...` : text;
    }

    function compassSignalText(status, descriptor) {
      const autoplay = status?.autoplay || {};
      const compass = autoplay.compassSensor || {};
      const heading = Number(compass.heading);
      if (!Number.isFinite(heading)) {
        return descriptor.signal;
      }

      const confidence = Number(compass.confidence || 0);
      const headingUsable = compass.headingUsable !== false && !compass.headingUncertain;
      const reliability = String(compass.headingReliability || (headingUsable ? "stable" : "uncertain"));
      const source = compactCompassSource(compass.correctionSource || compass.source);
      const motorDelta = Number(compass.rotationInstructionDelta ?? compass.motorDelta ?? 0);
      const frameDelta = Number(compass.frameBufferVectorDelta ?? ((Number(compass.visualFlowDelta || 0) + Number(compass.baseFlowDelta || 0))));
      const wallFlowDelta = Number(compass.wallFlowDelta || 0);
      const wallPatternMagnitude = Math.max(Number(compass.wallPatternMagnitude || 0), Number(compass.baseWallPatternMagnitude || 0));
      const visualDelta = Number(compass.visualBiasDelta || 0) + frameDelta;
      const edgeDelta = Number(compass.edgeSnapDelta || 0);
      const edgeWeight = Number(compass.edgeSnapWeight || 0);
      const landmarkDelta = Number(compass.landmarkDelta || 0);
      const correction = Number(compass.correctionDegrees || 0);
      const rawLandmarkHeading = compass.landmarkHeading;
      const landmarkHeading = rawLandmarkHeading == null || rawLandmarkHeading === ""
        ? Number.NaN
        : Number(rawLandmarkHeading);
      const landmarkText = compass.landmarkLabel || compass.landmarkKind || compass.landmark || "none";
      const landmarkLine = Number.isFinite(landmarkHeading)
        ? `lm ${landmarkText} ${Math.round(landmarkHeading)}deg${compass.landmarkForced ? " force" : ""}`
        : `lm ${landmarkText}`;
      return [
        `fuse ${source}`,
        `d ${formatSignedNumber(correction)} rot ${formatSignedNumber(motorDelta)} fb ${formatSignedNumber(frameDelta)}`,
        `vis ${formatSignedNumber(visualDelta)} wall ${formatSignedNumber(wallFlowDelta)} m${wallPatternMagnitude.toFixed(2)}`,
        `edge ${formatSignedNumber(edgeDelta)} w${edgeWeight.toFixed(2)} ${compass.wallOnlyView ? "wall-only" : (compass.corridorOnlyView ? "corridor" : "open")} / ${landmarkLine} ${formatSignedNumber(landmarkDelta)}`
      ].join("\n");
    }

    function sensorSignalText(status, key) {
      const autoplay = status?.autoplay || {};
      const descriptor = sensorUi[key] || { signal: "sensor input" };

      if (key === "visual") {
        const signature = String(autoplay.vision9x9Signature || autoplay.region9Signature || "").trim();
        return signature ? `9x9 ${signature.slice(0, 9)}` : descriptor.signal;
      }

      if (key === "audio") {
        const audio = status?.audio || autoplay.auditorySnapshot || {};
        const left = Number(audio.leftEnergy || 0);
        const right = Number(audio.rightEnergy || 0);
        if (left > 0 || right > 0 || audio.eventDetected) {
          return `L ${left.toFixed(2)} R ${right.toFixed(2)}`;
        }
        return descriptor.signal;
      }

      if (key === "motor") {
        const action = autoplay.action || {};
        if (action.move || action.turn || action.fire || action.use) {
          return `${action.move || "idle"} / ${action.turn || "hold"}`;
        }
        return descriptor.signal;
      }

      if (key === "movement") {
        const forward = Number(autoplay.motionForwardProgress || 0);
        const stall = Number(autoplay.motionStallScore || 0);
        if (forward > 0 || stall > 0) {
          return `f ${forward.toFixed(2)} / s ${stall.toFixed(2)}`;
        }
        return descriptor.signal;
      }

      if (key === "compass") {
        return compassSignalText(status, descriptor);
      }

      if (key === "spatial") {
        const spatial = autoplay.spatialSnapshot || autoplay.spatialSensor || {};
        const direction = Number(spatial.fusedDirection ?? spatial.direction);
        if (Number.isFinite(direction)) {
          const confidence = Number(spatial.confidence || 0);
          return `${Math.round(direction)} deg / c ${confidence.toFixed(2)}`;
        }
        return descriptor.signal;
      }

      if (key === "health") {
        const health = status?.health || autoplay.healthSensor || {};
        if (health.likelyDead || health.retryRequested) {
          return "retry signal";
        }
        const confidence = Number(health.confidence || 0);
        if (health.active || confidence > 0) {
          return `live / c ${confidence.toFixed(2)}`;
        }
        return descriptor.signal;
      }

      return descriptor.signal;
    }

    function syncSensorButton(button, label, signal, enabled) {
      if (!button) {
        return;
      }

      renderSensorButtonContent(button, label, signal, enabled);
      button.classList.toggle("is-on", enabled);
      button.classList.toggle("is-off", !enabled);
      button.setAttribute("aria-pressed", enabled ? "true" : "false");
      button.title = enabled
        ? `${label} is active; catches ${signal}.`
        : `${label} is cut off; catches ${signal} when enabled.`;
    }

    function syncCompassNeedle(button, status) {
      if (!button || button.dataset.sensorToggle !== "compass") {
        return;
      }

      const compass = status?.autoplay?.compassSensor || {};
      const heading = Number(compass.heading);
      const headingUsable = Number.isFinite(heading)
        && compass.headingUsable !== false
        && !compass.headingUncertain;
      const needle = document.createElement("span");
      needle.className = "sensor-compass-needle";
      needle.classList.toggle("is-uncertain", !headingUsable);
      const arrow = document.createElement("span");
      arrow.className = "sensor-compass-arrow";
      arrow.textContent = "→";
      const label = document.createElement("span");
      label.className = "sensor-compass-readout";
      button.classList.toggle("is-compass-uncertain", !headingUsable);
      if (headingUsable) {
        arrow.style.setProperty("--compass-needle-angle", `${(heading - 90).toFixed(1)}deg`);
        label.textContent = `estimate ${Math.round(heading)}deg / c ${Number(compass.confidence || 0).toFixed(2)}`;
      } else if (Number.isFinite(heading)) {
        arrow.style.setProperty("--compass-needle-angle", `${(heading - 90).toFixed(1)}deg`);
        label.textContent = `estimate ? / c ${Number(compass.confidence || 0).toFixed(2)} / ${String(compass.headingReliability || "low-evidence")}`;
      } else {
        arrow.style.setProperty("--compass-needle-angle", "-90deg");
        label.textContent = "estimate ? / hold";
      }

      needle.appendChild(arrow);
      needle.appendChild(label);
      const detail = button.querySelector(".sensor-signal");
      if (detail) {
        button.insertBefore(needle, detail);
      } else {
        button.appendChild(needle);
      }
    }

    function sensorInputEnabled(sensors, key) {
      const value = sensors?.[key];
      if (value && typeof value === "object") {
        return value.enabled !== false;
      }

      return value !== false;
    }

    function syncSensorToggles(status = latestRuntimeStatus || doomRuntime?.status?.() || {}) {
      const sensors = status?.sensors || status?.autoplay?.sensorInputs || {};
      for (let index = 0; index < doomSensorToggles.length; index += 1) {
        const button = doomSensorToggles[index];
        const key = button.dataset.sensorToggle;
        if (!key) {
          continue;
        }

        const descriptor = sensorUi[key] || {};
        syncSensorButton(
          button,
          button.dataset.sensorLabel || descriptor.label || `${key} Sensor`,
          sensorSignalText(status, key),
          sensorInputEnabled(sensors, key)
        );
        syncCompassNeedle(button, status);
      }
    }

    function syncSingleSensorToggle(kind, enabled, status = latestRuntimeStatus || {}, button = null) {
      const normalized = normalizeSensorToggleKind(kind);
      const target = button || doomSensorToggles.find(item => normalizeSensorToggleKind(item.dataset.sensorToggle) === normalized);
      if (!target) {
        return;
      }

      const descriptor = sensorUi[normalized] || {};
      syncSensorButton(
        target,
        target.dataset.sensorLabel || descriptor.label || `${normalized} Sensor`,
        sensorSignalText(status, normalized),
        Boolean(enabled)
      );
      if (normalized === "compass") {
        syncCompassNeedle(target, status);
      }
    }

    function normalizeSensorToggleKind(kind) {
      const text = String(kind || "").toLowerCase();
      return text === "vision" ? "visual" : text;
    }

    function createOptimisticSensorStatus(kind, enabled, baseStatus = latestRuntimeStatus) {
      const status = baseStatus || {};
      const normalized = normalizeSensorToggleKind(kind);
      const currentSensors = status.sensors || status.autoplay?.sensorInputs || {};
      const currentSensor = currentSensors[normalized] || {};
      const nextSensor = currentSensor && typeof currentSensor === "object"
        ? Object.assign({}, currentSensor, { enabled: Boolean(enabled) })
        : { enabled: Boolean(enabled) };
      const sensors = Object.assign({}, currentSensors, { [normalized]: nextSensor });
      const autoplay = Object.assign({}, status.autoplay || {}, {
        sensorInputs: Object.assign({}, status.autoplay?.sensorInputs || {}, sensors)
      });
      latestRuntimeStatus = Object.assign({}, status, { sensors, autoplay });
      return latestRuntimeStatus;
    }

    function applyOptimisticSensorToggle(kind, enabled, options = {}) {
      const status = createOptimisticSensorStatus(kind, enabled);
      if (options.button) {
        syncSingleSensorToggle(kind, enabled, status, options.button);
      } else {
        syncRuntimeStatusLight(status, `${normalizeSensorToggleKind(kind)}-sensor-pending`);
      }
      return status;
    }

    function setSensorInputAsync(kind, enabled, options = {}) {
      const normalized = normalizeSensorToggleKind(kind);
      const promise = Promise.resolve(doomRuntime?.setSensorInput?.(normalized, enabled));
      promise.then(status => {
        latestRuntimeStatus = status || latestRuntimeStatus;
        const nextStatus = status || createOptimisticSensorStatus(normalized, enabled);
        if (options.button) {
          syncSingleSensorToggle(normalized, enabled, nextStatus, options.button);
        } else {
          syncRuntimeStatusLight(nextStatus, `${normalized}-sensor-${enabled ? "on" : "off"}`);
        }
        if (options.log) {
          appendConsoleLine("[SENSOR]", enabled ? "log-ok" : "log-warn", `${normalized} sensor ${enabled ? "enabled" : "cut off"}.`);
        }
      }).catch(error => {
        const restored = createOptimisticSensorStatus(normalized, !enabled);
        if (options.button) {
          syncSingleSensorToggle(normalized, !enabled, restored, options.button);
        } else {
          syncRuntimeStatusLight(restored, `${normalized}-sensor-failed`);
        }
        appendConsoleLine("[SENSOR]", "log-fail", error instanceof Error ? error.message : String(error));
      });
      return promise;
    }

    function runSensorToggleButton(button) {
      if (!button || !doomRuntime?.setSensorInput) {
        return false;
      }

      const kind = normalizeSensorToggleKind(button.dataset.sensorToggle);
      const current = latestRuntimeStatus?.sensors || latestRuntimeStatus?.autoplay?.sensorInputs || {};
      const enabled = !sensorInputEnabled(current, kind);
      button.dataset.pendingSensor = "true";
      button.setAttribute("aria-busy", "true");
      applyOptimisticSensorToggle(kind, enabled, { button });
      setSensorInputAsync(kind, enabled, { button }).finally(() => {
        delete button.dataset.pendingSensor;
        button.removeAttribute("aria-busy");
      });
      try {
        doomScreen?.focus?.({ preventScroll: true });
      } catch {
      }
      return true;
    }

    function clampHud01(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        return 0;
      }

      return Math.max(0, Math.min(1, number));
    }

    function audioTimestampMs(snapshot) {
      if (!snapshot) {
        return Number.NaN;
      }

      const direct = Number(snapshot.timestampMs);
      if (Number.isFinite(direct) && direct > 0) {
        return direct;
      }

      const parsed = Date.parse(snapshot.timestamp || "");
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    }

    function audioSnapshotAgeMs(snapshot) {
      const timestampMs = audioTimestampMs(snapshot);
      if (!Number.isFinite(timestampMs)) {
        return Number.POSITIVE_INFINITY;
      }

      return Math.max(0, Date.now() - timestampMs);
    }

    function audioSnapshotEnergy(snapshot) {
      if (!snapshot) {
        return 0;
      }

      return Math.max(
        Number(snapshot.leftEnergy || 0),
        Number(snapshot.rightEnergy || 0),
        Number(snapshot.lowEnergy || 0),
        Number(snapshot.midEnergy || 0),
        Number(snapshot.highEnergy || 0)
      );
    }

    function fresherAudioSnapshot(first, second) {
      if (!first) {
        return second || null;
      }

      if (!second) {
        return first;
      }

      return audioSnapshotAgeMs(second) <= audioSnapshotAgeMs(first) ? second : first;
    }

    function selectHudAudioSnapshot(runtimeAudio, bridgeAudio) {
      const runtimeType = normalizeHudEventType(runtimeAudio?.eventType);
      if (Boolean(runtimeAudio?.eventDetected)
        && runtimeType.indexOf("use-") === 0) {
        return runtimeAudio;
      }

      if (!bridgeAudio) {
        return runtimeAudio || {};
      }

      const bridgeAgeMs = audioSnapshotAgeMs(bridgeAudio);
      if (bridgeAgeMs > 1600) {
        return runtimeAudio || {};
      }

      const runtimeEnergy = audioSnapshotEnergy(runtimeAudio);
      const bridgeEnergy = audioSnapshotEnergy(bridgeAudio);
      return bridgeEnergy >= Math.max(0.001, runtimeEnergy)
        ? bridgeAudio
        : runtimeAudio || {};
    }

    function updateAudioHudEnvelope(leftRaw, rightRaw, balance) {
      const now = typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
      const previousAt = doomAudioHudEnvelope.updatedAt || now;
      const elapsedMs = Math.max(0, now - previousAt);
      const decay = Math.pow(0.34, elapsedMs / 1000);
      const hasCurrentSignal = leftRaw > 0.001 || rightRaw > 0.001;
      const heldLeft = clampHud01(doomAudioHudEnvelope.left * decay);
      const heldRight = clampHud01(doomAudioHudEnvelope.right * decay);
      const nextLeft = hasCurrentSignal ? leftRaw : heldLeft;
      const nextRight = hasCurrentSignal ? rightRaw : heldRight;
      const nextBalance = hasCurrentSignal
        ? balance
        : doomAudioHudEnvelope.balance;

      doomAudioHudEnvelope = {
        left: nextLeft,
        right: nextRight,
        balance: nextBalance,
        updatedAt: now
      };

      return doomAudioHudEnvelope;
    }

    function audioHudLevel(value) {
      const energy = clampHud01(value);
      if (energy <= 0.0005) {
        return 0;
      }

      return Math.max(0.06, Math.min(1, Math.sqrt(energy * 2.25)));
    }

    async function runWasmCommand(rawCommand, options = {}) {
      const command = String(rawCommand || "").trim();
      const normalized = command.toLowerCase();
      const echoCommand = options.echo !== false;

      if (!command) {
        return false;
      }

      if (echoCommand) {
        commandHistory.push(command);
        commandHistoryIndex = commandHistory.length;
        appendConsoleLine("aik>", "log-ok", command);
      }

      const responses = {
        "help": "commands: yes, doom.status, doom.phase.check, doom.gui.selftest, doom.start, doom.stop, doom.restart-play, doom.audio toggle, doom.audio on, doom.audio off, doom.audio test, doom.audio status, doom.sensor <visual|audio|motor|movement|compass|spatial|health> <toggle|on|off>, doom.autoplay toggle, doom.autoplay on, doom.autoplay off, doom.autoplay manual-move toggle, doom.autoplay sense-only toggle, doom.autoplay sense-only on, doom.autoplay sense-only off, doom.autoplay status, doom.use-test, doom.cheat <idfa|idkfa|iddqd|idspispopd|idclip>, iddqd, idkfa, idfa, wasm.exports, model.status, legal, copy.logs, clear",
        "doom.status": "suspended: approval required before hosted WAD/model/WASM download or load. Type yes in the aik console or use the approval button below.",
        "doom.stop": "ok: no active public runtime process is running.",
        "wasm.exports": "main, doom_init, doom_tick, doom_render, doom_input, doom_input_action, doom_mount_wad, doom_wad_status, malloc, free",
        "model.status": "suspended: approval required before Bonsai-1.7B_Q1_0 GGUF download or load. Type yes in the aik console or use the approval button below.",
        "legal": "open /demo/doom/terms-and-licenses.html in a new tab before approval"
      };

      if (["yes", "y", "approve", "accept"].includes(normalized)) {
        wasmApprovalPending = false;
        setApprovalUiState("loading");
        downloadProgressTracker.reset();
        appendConsoleLine("[  OK  ]", "log-ok", "approval recorded: hosted WAD/model/WASM download and load accepted.");
        if (!doomRuntime) {
          halted.innerHTML = "[ FAILED ] AIKERNEL.DOOM BROWSER RUNTIME UNAVAILABLE.<span>Doom browser runtime script is missing.</span>";
          setApprovalUiState("failed");
          appendConsoleLine("[ FAIL ]", "log-fail", "Doom browser runtime script is unavailable.");
          return false;
        }

        setApprovalNoticeHtml("loading");
        promptInput.disabled = true;
        promptSubmit.disabled = true;
        let gameStarted = false;
        try {
          const status = await doomRuntime.prepare();
          doomScreenPanel.hidden = false;
          halted.innerHTML = "[ READY ] AIKERNEL.DOOM USER APPROVAL RECORDED.<span>Hosted WAD/model/WASM download and validation completed.</span><span>Auto start is launching doom.start and doom.autoplay on.</span>";
          updateRuntimeStatus(status, "ready");
          appendConsoleLine("[ LOAD ]", "log-ok", `${status.state}: wasmLoaded=${status.wasmLoaded}; wadLoaded=${status.wadLoaded}; modelLoaded=${status.modelLoaded}`);
          appendConsoleLine("[ RESP ]", "log-info", "auto-start: launching doom.start after approval.");
          const runningStatus = await doomRuntime.start();
          doomHasStarted = true;
          doomRuntimePanel.open = false;
          updateRuntimeStatus(runningStatus, "running");
          appendConsoleLine("[ RESP ]", "log-ok", `${runningStatus.state}: doom_tick -> doom_render loop active.`);
          focusDoomViewport("approved-running");
          await advanceDoomTitleToGameplay();
          const autoplayStatus = await doomRuntime.setAutoplay(true);
          updateRuntimeStatus(autoplayStatus, "autoplay-on");
          appendConsoleLine("[AUTOPLAY]", "log-ok", "Bonsai active: predicting next move...");
          halted.innerHTML = "[ RUNNING ] AIKERNEL.DOOM AUTOPLAY ACTIVE.<span>doom_tick -> doom_render is driving the framebuffer.</span><span>Bonsai AutoPlay is enabled; manual keys still temporarily override matching AI inputs.</span>";
          setApprovalUiState("running");
          gameStarted = true;
        } catch (error) {
          halted.innerHTML = "[ FAILED ] AIKERNEL.DOOM APPROVED LOAD FAILED.<span>Review the console output, hosted manifests, asset hashes, and browser cache state.</span>";
          setApprovalUiState("failed");
          appendConsoleLine("[ FAIL ]", "log-fail", error instanceof Error ? error.message : String(error));
        } finally {
          promptInput.disabled = false;
          promptSubmit.disabled = false;
          if (!gameStarted) {
            setApprovalUiState("failed");
          }
        }
        if (gameStarted) {
          focusDoomViewport("approved-start");
          return true;
        }

        return false;
      }

      if (["no", "n", "reject", "deny"].includes(normalized)) {
        await doomRuntime?.stop();
        wasmApprovalPending = true;
        doomHasStarted = false;
        setDoomRuntimeUiVisibility({ state: "suspended" });
        doomScreenPanel.hidden = true;
        setApprovalNoticeHtml("ready");
        setApprovalUiState("ready");
        appendConsoleLine("[SUSP]", "log-warn", "approval not granted. Runtime remains suspended.");
        return false;
      }

      if (wasmApprovalPending && ["doom.start", "aik exec run doom"].includes(normalized)) {
        appendConsoleLine("[SUSP]", "log-warn", "approval required before hosted WAD/model/WASM download or load. Type yes in the aik console or use the approval button below.");
        return false;
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

      if (!wasmApprovalPending && normalized === "doom.audio toggle") {
        const muted = doomRuntime?.status?.().audio?.muted !== false;
        await runWasmCommand(muted ? "doom.audio on" : "doom.audio off");
        return;
      }

      if (!wasmApprovalPending && (normalized === "doom.audio on" || normalized === "doom.audio off")) {
        if (!doomRuntime?.setAudioPlayback) {
          appendConsoleLine("[ AUDIO]", "log-warn", "debug audio playback control is unavailable in this runtime.");
          return;
        }

        const enabled = normalized === "doom.audio on";
        window.AIKernelWasmAudioProvider?.setEnabled?.(enabled);
        const status = await Promise.resolve(doomRuntime.setAudioPlayback(enabled));
        updateRuntimeStatus(status, enabled ? "audio-on" : "audio-off");
        const bridge = window.AIKernelWasmAudioProvider?.status?.() || {};
        appendConsoleLine("[ AUDIO]", enabled ? "log-ok" : "log-info", `debug audio playback ${enabled ? "enabled" : "muted"}; bridge=${bridge.contextState || "unknown"}.`);
        return;
      }

      if (!wasmApprovalPending && normalized === "doom.audio test") {
        window.AIKernelWasmAudioProvider?.setEnabled?.(true);
        const status = doomRuntime?.setAudioPlayback
          ? await Promise.resolve(doomRuntime.setAudioPlayback(true))
          : (doomRuntime?.status?.() || {});
        window.AIKernelWasmAudioProvider?.testCue?.();
        updateRuntimeStatus(status, "audio-test");
        const bridge = window.AIKernelWasmAudioProvider?.status?.() || {};
        appendConsoleLine("[ AUDIO]", "log-ok", `debug audio test cue requested; bridge=${bridge.contextState || "unknown"}; lastError=${bridge.lastError || "none"}.`);
        return;
      }

      if (!wasmApprovalPending && normalized === "doom.audio status") {
        const status = doomRuntime?.status?.() || {};
        updateRuntimeStatus(status, "audio-status");
        const audio = status.audio || {};
        const bridge = window.AIKernelWasmAudioProvider?.status?.() || {};
        const bridgeAudio = bridge.lastSnapshot || {};
        appendConsoleLine("[ AUDIO]", audio.muted === false ? "log-ok" : "log-info", `muted=${audio.muted !== false}; bridge=${bridge.contextState || "unknown"}; native=${audio.nativeAvailable ? "yes" : "no"}/${audio.nativeReady ? "ready" : "off"}; nativeEvents=${audio.nativeEvents || 0}; nativeFrames=${audio.nativeFramesDrained || 0}; pending=${audio.nativeAvailableFrames || 0}; pcm=${bridge.pcmPacketCount || 0}/${bridge.pcmFramesPlayed || 0}/g${Number(bridge.lastPcmGain || 0).toFixed(1)}/p${Number(bridge.lastPcmPeak || 0).toFixed(2)}; left=${Number(audio.leftEnergy || 0).toFixed(2)}; right=${Number(audio.rightEnergy || 0).toFixed(2)}; bridgeLeft=${Number(bridgeAudio.leftEnergy || 0).toFixed(2)}; bridgeRight=${Number(bridgeAudio.rightEnergy || 0).toFixed(2)}; balance=${Number(audio.balance || bridgeAudio.balance || 0).toFixed(2)}; bands=${Number(audio.lowEnergy || 0).toFixed(2)}/${Number(audio.midEnergy || 0).toFixed(2)}/${Number(audio.highEnergy || 0).toFixed(2)}/${audio.dominantBand || "none"}; event=${audio.eventType || bridgeAudio.eventType || "none"}; lastError=${bridge.lastError || "none"}`);
        return;
      }

      if (!wasmApprovalPending && normalized.startsWith("doom.sensor ")) {
        if (!doomRuntime?.setSensorInput) {
          appendConsoleLine("[SENSOR]", "log-warn", "sensor cutoff control is unavailable in this runtime.");
          return;
        }

        const parts = normalized.split(/\s+/);
        const kind = normalizeSensorToggleKind(parts[1]);
        const current = latestRuntimeStatus?.sensors || latestRuntimeStatus?.autoplay?.sensorInputs || {};
        let enabled = parts[2] === "on";
        if (parts[2] === "toggle") {
          enabled = !sensorInputEnabled(current, kind);
        } else if (parts[2] !== "on" && parts[2] !== "off") {
          appendConsoleLine("[SENSOR]", "log-warn", "usage: doom.sensor <visual|audio|motor|movement|compass|spatial|health> <toggle|on|off>");
          return;
        }

        applyOptimisticSensorToggle(kind, enabled);
        setSensorInputAsync(kind, enabled, { log: true });
        return;
      }

      if (!wasmApprovalPending && normalized === "doom.autoplay toggle") {
        const enabled = !Boolean(latestRuntimeStatus?.autoplay?.enabled);
        await runWasmCommand(enabled ? "doom.autoplay on" : "doom.autoplay off");
        return true;
      }

      if (!wasmApprovalPending && normalized === "doom.autoplay on") {
        if (!doomRuntime) {
          appendConsoleLine("[ FAIL ]", "log-fail", "Doom browser runtime script is unavailable.");
          return;
        }

        const status = await doomRuntime.setAutoplay(true);
        updateRuntimeStatus(status, "autoplay-on");
        appendConsoleLine("[AUTOPLAY]", "log-ok", "Bonsai active: predicting next move...");
        return true;
      }

      if (!wasmApprovalPending && normalized === "doom.autoplay manual-move toggle") {
        const manualMove = Boolean(latestRuntimeStatus?.autoplay?.manualMove);
        await runWasmCommand(manualMove ? "doom.autoplay manual-move off" : "doom.autoplay manual-move on");
        return;
      }

      if (!wasmApprovalPending && normalized === "doom.autoplay sense-only toggle") {
        const senseOnly = Boolean(latestRuntimeStatus?.autoplay?.senseOnly);
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

      if (normalized === "doom.gui.selftest") {
        const result = await doomGuiSelfTest?.runDoomGuiSelfTest?.();
        if (!result) {
          appendConsoleLine("[ GUI ]", "log-warn", "GUI selftest module is unavailable.");
          return false;
        }
        appendConsoleLine(
          "[ GUI ]",
          result.ok ? "log-ok" : "log-warn",
          `${result.ok ? "pass" : "check"}: ${result.passed}/${result.total} controls verified; ${result.summary}`
        );
        return false;
      }

      if (!wasmApprovalPending && (normalized === "doom.capture" || normalized === "doom.sense.capture")) {
        if (!doomRuntime?.captureSenseOnlyFrame) {
          appendConsoleLine("[CAPTURE]", "log-warn", "sense-only capture is unavailable in this runtime.");
          return;
        }

        const capture = await doomRuntime.captureSenseOnlyFrame();
        window.AIKernelDoomLastSenseCapture = capture;
        const signatures = capture.signatures || {};
        appendConsoleLine("[CAPTURE]", "log-ok", `frame=${capture.frame || 0}; senseOnly=${Boolean(capture.senseOnly)}; image=${capture.imageDataUrl ? "yes" : "status-only"}; region3x3=${signatures.region3x3 || "000000000"}; vision9x9=${String(signatures.vision9x9 || "").slice(0, 18)}; motion9=${signatures.motion9 || "000000000"}; audio=${capture.audio?.eventType || "none"}; detector=${capture.detector ? "yes" : "none"}.`);
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
        const routeText = `blue=${Number(milestones.blueFloorScore || 0).toFixed(2)}; court=${Number(milestones.courtyardScore || 0).toFixed(2)}/${milestones.courtyardTurn || "none"}/${milestones.courtyardRescueMode || "none"}/${milestones.courtyardRescueFrames || 0}; secret=${Number(milestones.spawnSecretDoorScore || 0).toFixed(2)}/${milestones.spawnSecretDoorTurn || "none"}; stair=${Number(milestones.spawnWestStairScore || 0).toFixed(2)}/${milestones.spawnWestStairTurn || "none"}; gap=${Number(milestones.spawnCorridorGapScore || 0).toFixed(2)}/${milestones.spawnCorridorGapTurn || "none"}/${milestones.spawnCorridorGapFrames || 0}; bridge=${Number(milestones.bridgeBrownScore || 0).toFixed(2)}/${Number(milestones.bridgeGreenLeft || 0).toFixed(2)}-${Number(milestones.bridgeGreenCenter || 0).toFixed(2)}-${Number(milestones.bridgeGreenRight || 0).toFixed(2)}/${milestones.bridgeLaneTurn || "none"}/door${Number(milestones.bridgeDoorScore || 0).toFixed(2)}; corridor=${milestones.firstDoorCorridorLocated ? "yes" : "no"}/${milestones.firstDoorCorridorFrames || 0}/${Number(milestones.firstDoorCorridorSignature || 0).toFixed(2)}/v9${Number(milestones.firstDoorVision9x9Score || 0).toFixed(2)}; deadEnd=${milestones.firstDoorDeadEndTurnFrames || 0}; useSeen=${Boolean(milestones.firstDoorUseAttempted)}/${Number(milestones.firstDoorUseSignature || 0).toFixed(2)}`;
        const computerText = `computer=${milestones.computerRoomEntered ? "yes" : "no"}/${milestones.computerRoomFrames || 0}/${Number(milestones.computerRoomScore || 0).toFixed(2)}/${Number(milestones.computerBlueScore || 0).toFixed(2)}/${Number(milestones.computerRedLightScore || 0).toFixed(2)}/${Number(milestones.computerDarkPanelScore || 0).toFixed(2)}/${Number(milestones.computerPanelScore || 0).toFixed(2)}`;
        const milestoneText = `door=${milestones.doorOpened || 0}; dark=${milestones.darkZoneEntered ? "yes" : "no"}/${milestones.darkZoneFrames || 0}; darkArea=${Number(milestones.darkAreaScore || 0).toFixed(2)}; luma=${Number(milestones.gameplayLuma || 0).toFixed(1)}; ${computerText}; ${routeText}; ${mapText}; ${progressText}; enemy=${milestones.enemyDefeated || 0}; ${alertText}; bursts=${milestones.combatFireFrames || 0}; peak=${Number(milestones.enemyConfidencePeak || 0).toFixed(2)}; drop=${milestones.enemyDropFrames || 0}`;
        const ammoText = `${autoplay.ammoLikelyEmpty ? "empty" : "ok"}/${autoplay.ammoSignature || "000000000000000000000"}`;
        const healthText = `${autoplay.healthLikelyDead ? "dead" : "live"}/z${Number(autoplay.healthZeroScore || 0).toFixed(2)}/c${autoplay.healthActiveColumns || 0}/a${autoplay.healthActiveCells || 0}/${autoplay.healthSignature || "000000000000000000000000"}`;
        const motionText = `${autoplay.motion9Signature || "000000000"}/${Number(autoplay.motion9Delta ?? 255).toFixed(2)}/f${Number(autoplay.motionForwardProgress || 0).toFixed(2)}/o${Number(autoplay.motionObstacleScore || 0).toFixed(2)}/t${Number(autoplay.motionTurnScore || 0).toFixed(2)}/e${Number(autoplay.motionEntranceScore || 0).toFixed(2)}/s${Number(autoplay.motionStallScore || 0).toFixed(2)}/${autoplay.motionIntent || "idle"}`;
        const footText = `${Number(autoplay.footObstacleScore || 0).toFixed(2)}/${Number(autoplay.priorFootObstacleScore || 0).toFixed(2)}/f${Number(autoplay.footObstacleFlickerScore || 0).toFixed(2)}/b${autoplay.footObstacleBounceFrames || 0}/d${Number(autoplay.footObstacleBandDelta || 0).toFixed(2)}`;
        updateRuntimeStatus(status, "autoplay-status");
        appendConsoleLine("[AUTOPLAY]", Boolean(autoplay.zeroCopy) ? "log-ok" : "log-warn", `enabled=${Boolean(autoplay.enabled)}; mode=${autoplay.mode || "disabled"}; manualMove=${Boolean(autoplay.manualMove)}; pipeline=${pipelineText}; objective=${objectiveText}; semantic=${semanticText}; strategy=${strategyText}; vision=${autoplay.vision || "none"}; zeroCopy=${Boolean(autoplay.zeroCopy)}; milestones=${milestoneText}; ammo=${ammoText}; health=${healthText}; safety=${autoplay.safetyReason || "none"}; mobility=${autoplay.mobilityMode || "none"}; wall=${autoplay.wallHugSide || "left"}; target=${targetConfidence}; enemy=${enemyText}; corner=${cornerSignal}; sig=${signatureText}; dict=${dictionaryText}; regions=${autoplay.regionSignature || "000000"}; regions9=${autoplay.region9Signature || "000000000"}; motion9=${motionText}; foot=${footText}; depthSig=${autoplay.depthSignature || "0000"}; depth=${depthEstimate}; faceSig=${autoplay.faceSignature || "0000000000000000"}; sound=${Boolean(autoplay.soundCueActive)}; stuck=${autoplay.stuckFrames || 0}; qStall=${autoplay.quantizedStallFrames || 0}; qDelta=${quantizedDelta}; rDelta=${regionDelta}; hudDelta=${hudDelta}; faceDelta=${faceDelta}; probe=${probe}; detach=${detach}; survey=${survey}; mapRush=${mapRush}; mapDoor=${mapDoor}; suppress=${autoplay.cornerSuppressFrames || 0}; repeat=${autoplay.repeatActionFrames || 0}; repeatTurn=${autoplay.repeatTurnFrames || 0}; recovery=${autoplay.recoveryFrames || 0}; loopEscape=${autoplay.loopEscapeFrames || 0}; useCooldown=${autoplay.useCooldown || 0}; predictions=${autoplay.predictions || 0}; reused=${autoplay.reused || 0}; latency=${Math.round(autoplay.latencyMs || 0)}ms`);
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
        doomHasStarted = true;
        updateRuntimeStatus(status, "running");
        appendConsoleLine("[ INPUT]", "log-ok", `doom.restart-play: reborn/menu sequence sent; autoplay=${wasAutoplay ? "restored" : "off"}.`);
        focusDoomViewport("restart-play");
        return true;
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
          doomHasStarted = true;
          doomRuntimePanel.open = false;
          updateRuntimeStatus(status, "running");
          appendConsoleLine("[ RESP ]", "log-ok", `${status.state}: doom_tick -> doom_render loop active.`);
          halted.innerHTML = "[ RUNNING ] AIKERNEL.DOOM FRAMEBUFFER STABLE.<span>doom_tick -> doom_render is driving the 320x200 paletted framebuffer.</span><span>doom.stop halts the render loop safely.</span>";
          focusDoomViewport("doom-start");
          return true;
        } catch (error) {
          appendConsoleLine("[ FAIL ]", "log-fail", error instanceof Error ? error.message : String(error));
        }
        return false;
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
    window.pushAIKernelDoomControllerDebugLog = pushControllerDebugLog;
    window.setAIKernelDoomControllerDebugMessage = setControllerDebugMessage;
    window.setAIKernelDoomControllerDebugLogEntries = setControllerDebugLogEntries;
    window.setAIKernelDoomControllerDebugLogFilter = setControllerDebugLogFilter;
    window.clearAIKernelDoomControllerDebugLog = clearControllerDebugLog;
    observeControllerDebugLogLayout();
    renderControllerDebugLog();

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
        focusPromptUnlessGameRunning();
      }
    }

    const doomGuiSelfTest = window.AIKernelDoomGuiSelfTest?.install?.({
      delay,
      getDoomRuntime: () => doomRuntime,
      getWasmApprovalPending: () => wasmApprovalPending,
      getOverlayEnabled: () => doomDebugOverlayEnabled,
      setOverlayEnabled: value => {
        doomDebugOverlayEnabled = Boolean(value);
      },
      getToposDetailEnabled: () => doomToposDetailEnabled,
      setToposDetailEnabled: value => {
        doomToposDetailEnabled = Boolean(value);
      },
      getDetectionVisible: key => doomDetectionVisibility.get(key) !== false,
      setDetectionVisible: (key, value) => {
        doomDetectionVisibility.set(key, Boolean(value));
      },
      sensorInputEnabled,
      runWasmCommand,
      appendConsoleLine,
      ensureDoomSpatialHud,
      ensureDoomGoalHud,
      ensureDoomToposHud,
      ensureDoomSensorToggleRow,
      syncManualMoveToggle,
      syncSenseOnlyToggle,
      syncOverlayToggle,
      syncToposDetailToggle,
      syncSensorToggles,
      syncSingleSensorToggle,
      syncAutoplayToggle,
      syncDetectionToggleButtons,
      syncAudioPlaybackToggle,
      pushControllerDebugLog,
      setControllerDebugMessage,
      setControllerDebugLogFilter,
      renderDoomDebugOverlay,
      updateDoomToposHud,
      elements: () => ({
        promptInput,
        doomController,
        doomControllerDebugLog,
        doomControllerDebugLogList,
        doomDebugBar,
        doomOverlayToggle,
        doomAutoplayToggle,
        doomManualMoveToggle,
        doomSenseOnlyToggle,
        doomAudioPlaybackToggle,
        doomToposDetailToggle
      })
    });
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

    function getConsoleLogEntries(limit = 250) {
      const lines = Array.from(container?.querySelectorAll?.(".line") || []);
      return lines.slice(Math.max(0, lines.length - Math.max(1, Number(limit) || 250))).map((line, index) => {
        const label = line.querySelector("span");
        const tag = (label?.textContent || "").trim();
        const text = (line.textContent || "").trim();
        return {
          index,
          tag,
          level: label?.className || "",
          message: tag && text.startsWith(tag) ? text.slice(tag.length).trim() : text,
          text
        };
      });
    }

    function captureGameFrame() {
      if (!doomScreen || typeof doomScreen.toDataURL !== "function") {
        return {
          ok: false,
          reason: "game-canvas-unavailable",
          timestamp: new Date().toISOString()
        };
      }

      return {
        ok: true,
        contentType: "image/png",
        width: doomScreen.width || doomScreen.clientWidth || 0,
        height: doomScreen.height || doomScreen.clientHeight || 0,
        dataUrl: doomScreen.toDataURL("image/png"),
        timestamp: new Date().toISOString()
      };
    }

    async function getSchemaDefinitions() {
      const schemas = await Promise.all(doomSchemaDefinitionUrls.map(async url => {
        const response = await fetch(url, { cache: "no-cache" });
        return {
          url,
          ok: response.ok,
          status: response.status,
          schema: response.ok ? await response.json() : null
        };
      }));
      return {
        version: "20260618-palette1",
        timestamp: new Date().toISOString(),
        schemas
      };
    }

    async function sendSchemaDefinitions(target = "/api/doom/schema-definitions", options = {}) {
      const endpoint = typeof target === "string"
        ? target
        : (options.endpoint || "/api/doom/schema-definitions");
      const payload = target && typeof target === "object" && Array.isArray(target.schemas)
        ? target
        : await getSchemaDefinitions();
      window.AIKernelDoomLastSchemaDefinitions = payload;

      let response;
      try {
        response = await fetch(endpoint, {
          method: options.method || "POST",
          headers: Object.assign({ "content-type": "application/json" }, options.headers || {}),
          body: JSON.stringify(payload)
        });
      } catch (error) {
        if (options.allowLocalFallback === false) {
          throw error;
        }

        return {
          ok: true,
          status: 0,
          statusText: "local-fallback",
          endpoint,
          transport: "local-cache",
          reason: String(error?.message || error || "fetch-failed"),
          payload
        };
      }

      if (response.status === 404 && options.allowLocalFallback !== false) {
        return {
          ok: true,
          status: response.status,
          statusText: response.statusText,
          endpoint,
          transport: "local-cache",
          reason: "schema-endpoint-not-found",
          payload
        };
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        endpoint,
        transport: "http",
        payload
      };
    }

    function getDebugState() {
      const runtime = doomRuntime?.status?.() || null;
      return {
        timestamp: new Date().toISOString(),
        debugApi: {
          version: "20260618-palette1"
        },
        approvalPending: wasmApprovalPending,
        approvalUiState: approvalActions?.dataset?.state || "unknown",
        runtime,
        sensorTensor: runtime?.autoplay?.sensorTensor || null,
        gui: window.getAIKernelDoomGuiSnapshot?.() || null,
        controllerDebugLog: getControllerDebugLogEntries(controllerDebugLogLimit, controllerDebugLogFilter),
        lastDownloadProgress: downloadProgressTracker.snapshot().lastText || "",
        guiSelfTest: window.AIKernelDoomLastGuiSelfTest || null
      };
    }

    window.AIKernelDoomDebugApi = {
      getState: getDebugState,
      getAnalysisLogs: (limit = 250) => ({
        timestamp: new Date().toISOString(),
        state: getDebugState(),
        logs: getConsoleLogEntries(limit)
      }),
      getSensorTensor: () => getDebugState().sensorTensor,
      getConsoleLogs: getConsoleLogEntries,
      getControllerDebugLog: getControllerDebugLogEntries,
      pushControllerDebugLog,
      setControllerDebugMessage,
      setControllerDebugLogEntries,
      setControllerDebugLogFilter,
      clearControllerDebugLog,
      captureGameFrame,
      getSchemaDefinitions,
      sendSchemaDefinitions,
      runCommand: (command, options = {}) => runWasmCommand(command, options),
      approve: () => runWasmCommand("yes", { echo: false, source: "debug-api" }),
      runGuiSelfTest: (options = {}) => options.log
        ? window.runAIKernelDoomGuiSelfTestCommand?.()
        : doomGuiSelfTest?.runDoomGuiSelfTest?.()
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

      renderDoomState(doomRuntime.status(), `input=${name}:${pressed ? "down" : "up"}`);
    }

    function syncAutoplayToggle(status) {
      if (!doomAutoplayToggle) {
        return;
      }

      const enabled = Boolean(status?.autoplay?.enabled);
      doomAutoplayToggle.classList.toggle("is-on", enabled);
      doomAutoplayToggle.classList.toggle("is-off", !enabled);
      doomAutoplayToggle.setAttribute("aria-pressed", enabled ? "true" : "false");
      doomAutoplayToggle.textContent = enabled ? "Autoplay: On" : "Autoplay: Off";
    }

    function createOptimisticAutoplayStatus(enabled, baseStatus = latestRuntimeStatus) {
      const status = baseStatus || {};
      const autoplay = Object.assign({}, status.autoplay || {}, {
        enabled: Boolean(enabled),
        mode: enabled ? (status.autoplay?.mode || "pending") : "disabled"
      });
      latestRuntimeStatus = Object.assign({}, status, { autoplay });
      return latestRuntimeStatus;
    }

    function runAutoplayToggleButton(button = doomAutoplayToggle) {
      if (!button || !doomRuntime?.setAutoplay) {
        return false;
      }

      const enabled = !Boolean(latestRuntimeStatus?.autoplay?.enabled);
      button.setAttribute("aria-busy", "true");
      const optimistic = createOptimisticAutoplayStatus(enabled);
      syncAutoplayToggle(optimistic);
      pushControllerDebugLog({
        category: "control",
        label: "CONTROL",
        message: enabled ? "autoplay enable requested" : "autoplay disable requested",
        level: "info"
      }, { dedupe: false });

      Promise.resolve(doomRuntime.setAutoplay(enabled)).then(status => {
        if (!enabled) {
          releaseAllDoomInputs();
        }
        updateRuntimeStatus(status, enabled ? "autoplay-on" : "autoplay-off");
        appendConsoleLine(
          "[AUTOPLAY]",
          enabled ? "log-ok" : "log-info",
          enabled ? "Bonsai active: predicting next move..." : "Bonsai idle: AI input disabled."
        );
      }).catch(error => {
        const restored = createOptimisticAutoplayStatus(!enabled);
        syncAutoplayToggle(restored);
        pushControllerDebugLog({
          category: "control",
          label: "CONTROL",
          message: `autoplay toggle failed: ${error instanceof Error ? error.message : String(error)}`,
          level: "error"
        }, { dedupe: false });
        appendConsoleLine("[AUTOPLAY]", "log-fail", error instanceof Error ? error.message : String(error));
      }).finally(() => {
        button.removeAttribute("aria-busy");
      });

      try {
        doomScreen?.focus?.({ preventScroll: true });
      } catch {
      }
      return true;
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
      syncGpuHudOverlay();
    }

    function syncToposDetailToggle() {
      if (!doomToposDetailToggle) {
        return;
      }

      doomToposDetailToggle.classList.toggle("is-on", doomToposDetailEnabled);
      doomToposDetailToggle.setAttribute("aria-pressed", doomToposDetailEnabled ? "true" : "false");
      doomToposDetailToggle.textContent = doomToposDetailEnabled ? "CTG: Detail" : "CTG: Simple";
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
      return `pipeline=${autoplay.controlPipeline || "Idle"}; objective=${autoplay.objective || "none"}; det=${detections}; senseOnly=${Boolean(autoplay.senseOnly)}; manualMove=${Boolean(autoplay.manualMove)}; firstDoor(corr=${Number(firstDoor.corridorConfidence || 0).toFixed(2)},door=${Number(firstDoor.doorConfidence || 0).toFixed(2)},v9=${Number(milestones.firstDoorVision9x9Score || 0).toFixed(2)},opened=${Boolean(firstDoor.opened)},use=${Boolean(milestones.firstDoorUseAttempted)}/${Number(milestones.firstDoorUseSignature || 0).toFixed(2)}); computer(conf=${Number(computerRoom.confidence || 0).toFixed(2)},dark=${Number(computerRoom.darkAreaScore || milestones.darkAreaScore || 0).toFixed(2)},entered=${Boolean(milestones.computerRoomEntered)}); bridge(conf=${Number(bridge.confidence || 0).toFixed(2)},lane=${bridge.laneTurn || milestones.bridgeLaneTurn || "none"}); final(conf=${Number(finalRoom.confidence || 0).toFixed(2)},entered=${Boolean(milestones.finalRoomEntered)}); motion=${autoplay.motion9Signature || "000000000"}/f${Number(autoplay.motionForwardProgress || 0).toFixed(2)}/t${Number(autoplay.motionTurnScore || 0).toFixed(2)}/s${Number(autoplay.motionStallScore || 0).toFixed(2)}; action=${action.move || "none"}/${action.turn || "none"}/use=${Boolean(action.use)}/fire=${Boolean(action.fire)}`;
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
      const debugFilterButton = event.target.closest("button[data-debug-log-filter]");
      if (debugFilterButton) {
        event.preventDefault();
        setControllerDebugLogFilter(debugFilterButton.dataset.debugLogFilter || "all");
        focusPromptUnlessGameRunning();
        return;
      }

      const button = event.target.closest("button[data-command], button[data-command-sequence]");
      if (!button) {
        return;
      }

      await runButtonCommands(button);
    });

    doomDebugBar?.addEventListener("click", async (event) => {
      const detailButton = event.target.closest("#doom-topos-detail-toggle");
      if (detailButton) {
        doomToposDetailEnabled = !doomToposDetailEnabled;
        syncToposDetailToggle();
        updateDoomToposHud(doomRuntime?.status?.() || {});
        focusPromptUnlessGameRunning();
        return;
      }

      const autoplayButton = event.target.closest("#doom-autoplay-toggle");
      if (autoplayButton && runAutoplayToggleButton(autoplayButton)) {
        event.preventDefault();
        return;
      }

      const sensorButton = event.target.closest("button[data-sensor-toggle]");
      if (sensorButton && runSensorToggleButton(sensorButton)) {
        event.preventDefault();
        return;
      }

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
      focusPromptUnlessGameRunning();
    });

    doomManualMoveToggle?.addEventListener("click", async () => {
      const manualMove = Boolean(latestRuntimeStatus?.autoplay?.manualMove);
      await runWasmCommand(manualMove ? "doom.autoplay manual-move off" : "doom.autoplay manual-move on");
      syncManualMoveToggle(latestRuntimeStatus || {});
      focusPromptUnlessGameRunning();
    });

    doomSenseOnlyToggle?.addEventListener("click", async () => {
      const senseOnly = Boolean(latestRuntimeStatus?.autoplay?.senseOnly);
      await runWasmCommand(senseOnly ? "doom.autoplay sense-only off" : "doom.autoplay sense-only on");
      syncSenseOnlyToggle(latestRuntimeStatus || {});
      focusPromptUnlessGameRunning();
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
        focusPromptUnlessGameRunning();
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
      const focusGame = await runWasmCommand(command);
      if (focusGame) {
        focusDoomViewport("command-submit");
      } else {
        focusPromptUnlessGameRunning();
      }
    });

    async function runApprovalUiCommand(command) {
      [approvalAccept, approvalDecline].forEach(button => {
        if (button) {
          button.disabled = true;
        }
      });
      const focusGame = await runWasmCommand(command, { echo: false, source: "approval-ui" });
      if (focusGame) {
        focusDoomViewport("approval-button");
      } else {
        focusPromptUnlessGameRunning();
      }
    }

    approvalAccept?.addEventListener("click", () => {
      runApprovalUiCommand("yes");
    });

    approvalDecline?.addEventListener("click", () => {
      runApprovalUiCommand("no");
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

    setDoomRuntimeUiVisibility(doomRuntime?.status?.() || { state: "suspended" });

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
      halted.classList.add("is-visible");
      promptInput.disabled = false;
      promptSubmit.disabled = false;
      setApprovalUiState("ready");
      focusPromptUnlessGameRunning();
      if (doomGuiSelfTest?.shouldAutoRun?.()) {
        await delay(120);
        const result = await doomGuiSelfTest.runDoomGuiSelfTest?.();
        window.AIKernelDoomLastGuiSelfTestAuto = result || null;
        focusPromptUnlessGameRunning("auto-gui-selftest");
      }

      console.info("AIKernel.Doom public prompt deployed.");
    }

    boot();

})();
