(function () {
  'use strict';

    const DOOM_DEFAULT_MODEL_MANIFEST_URL = "/models/bonsai1.7b/manifest.json";
    const DOOM_DEFAULT_MODEL_HOSTED_FILE = "/models/bonsai1.7b/Bonsai-1.7B-Q1_0.gguf";
    const doomDeploymentConfig = self.AIKernelDoomConfig || {};
    const doomPublicConfig = self.AIKernelDoomPublic || {};
    const doomSharedModel = {
      manifestUrl: doomDeploymentConfig.modelManifestUrl ||
        doomPublicConfig.modelManifestUrl ||
        DOOM_DEFAULT_MODEL_MANIFEST_URL,
      hostedFile: doomDeploymentConfig.modelHostedFile ||
        doomPublicConfig.modelHostedFile ||
        DOOM_DEFAULT_MODEL_HOSTED_FILE
    };

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
        m: `Bonsai-1.7B q1_0 GGUF redistribution manifest configured at ${doomSharedModel.manifestUrl}; download remains gated by approval. / Bonsai-1.7B q1_0 GGUF の再配布マニフェストは ${doomSharedModel.manifestUrl} に設定済みです。ダウンロードは同意後まで開始しません。`
      },
      {
        t: "[GPU  ]",
        c: "log-warn",
        m: "GPU mode requires approximately 1GB of free VRAM for stable rendering; CPU mode skips WebGPU initialization. / GPUモードの安定動作には約1GBの空きVRAMが必要です。CPUモードではWebGPU初期化を行いません。"
      },
      {
        t: "[LEGAL]",
        c: "log-warn",
        m: "Review terms and licenses before approval. / 起動前に利用規約とライセンスを確認してください。"
      },
      {
        t: "[ AI  ]",
        c: "log-warn",
        m: "AI behavior models may be updated without notice; perception, cognition, and action can change between demo runs. / AIの知覚・認知・行動モデルは予告なく更新され、デモ実行ごとに挙動が変化する場合があります。"
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
        m: "AIKERNEL.DOOM WAITING FOR EXPLICIT USER APPROVAL. Choose GPU mode or CPU mode below; console yes starts GPU mode by default. / AIKernel.Doom は明示的な同意を待機しています。下のボタンでGPUまたはCPUモードを選択してください。aik コンソールの yes は既定でGPUモードを開始します。"
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
    let doomScreen = document.getElementById("doom-screen");
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
    let doomDetectionToggles = Array.from(document.querySelectorAll("[data-detection-toggle]"));
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
    let doomCpuRadarHud = null;
    let doomCpuRadarCanvas = null;
    let doomGpuContractsScriptLoading = null;
    let doomGpuPathStatusScriptLoading = null;
    let doomSensorPanelScriptLoading = null;
    let doomPipelinePanelScriptLoading = null;
    let doomRuntimeFormatScriptLoading = null;
    let doomGoalPanelScriptLoading = null;
    let doomDebugOverlayScriptLoading = null;
    let doomDebugCaptureScriptLoading = null;
    let doomDebugCaptureApi = null;
    let doomObjectiveStatusPanelScriptLoading = null;
    let doomBridgeAudioSnapshot = null;
    let doomAudioHudEnvelope = { left: 0, right: 0, balance: 0, updatedAt: 0 };
    let doomAudioEventHolds = [];
    let doomCompassDisplayState = {
      heading: null,
      confidence: 0,
      usable: 0,
      holdUntil: 0,
      updatedAt: 0,
      reliability: "initial"
    };
    let doomToposClickAudioContext = null;
    let doomPublicLayoutInstalled = false;
    let doomLegalLinks = null;
    let doomPipelineSidePanel = null;
    let doomPipelineSideGrid = null;
    let doomDetectionSummaryPanel = null;
    let doomDebugLogLimitLabel = null;
    const doomSideCards = new Map();

    let sensorUi = {};
    let detectionUi = {};
    let sensorPanelLayout = [];
    let sensorPanelVersion = "loading-sensorpanel";
    refreshSensorPanelDescriptors();
    const commandHistory = [];
    const controllerDebugLogEntries = [];
    const controllerDebugLogSignatureByCategory = new Map();
    const CONTROLLER_DEBUG_LOG_MAX_VISIBLE = 48;
    let commandHistoryIndex = 0;
    let controllerDebugLogSequence = 0;
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
    const keyboardDoomInputs = new Set();
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
    const doomDevCacheKey = (() => {
      try {
        return new URL(window.location.href).searchParams.get("doomdev") || "dev";
      } catch {
        return "dev";
      }
    })();
    let doomRuntime = null;
    function ensureDoomRuntime() {
      if (doomRuntime) {
        return doomRuntime;
      }

      doomRuntime = window.createAIKernelDoomRuntime
        ? window.createAIKernelDoomRuntime({
        canvas: doomScreen,
        moduleUrl: "/demo/doom/module.json",
        modelManifestUrl: doomSharedModel.manifestUrl,
        autoplayProfileUrl: `/demo/doom/autoplay-profile.json?v=${encodeURIComponent(doomDevCacheKey)}`,
        log: appendConsoleLine,
        onStatusChange: queueRuntimeStatusUpdate
      })
        : null;
      window.AIKernelDoomRuntime = doomRuntime;
      return doomRuntime;
    }
    window.AIKernelDoomRuntime = null;
    let doomHasStarted = false;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    let consoleFollowTimer = 0;
    const runtimeStatusFlow = requireRuntimeStatusFlowAdapter("createFlow")();
    let latestRuntimeStatus = null;

    function readDoomDebugRuntimeStatus() {
      const current = typeof doomRuntime?.status === "function" ? doomRuntime.status() : null;
      return current || latestRuntimeStatus || { state: "unknown" };
    }

    function readDoomDebugGpuStatus() {
      const provider = resolveWebGpuProvider();
      const providerStatus = typeof provider?.status === "function" ? provider.status() : (provider || null);
      const status = readDoomDebugRuntimeStatus();
      const autoplay = status?.autoplay || {};
      const resolver = self.AIKernelDoomGpuPathStatus?.resolveGpuPathStatus;
      const path = typeof resolver === "function" ? resolver(status, autoplay) : null;
      return {
        provider: providerStatus,
        path,
        gpuHud: status?.gpuHud || status?.GpuHud || autoplay?.gpuHud || autoplay?.GpuHud || null,
        runtime: {
          renderer: status?.renderer || "unknown",
          gpuDelegate: status?.gpuDelegate || "unknown",
          usingCpuFallback: Boolean(status?.usingCpuFallback),
          lastError: status?.lastError || "",
          lastGpuWaitMs: Number(status?.lastGpuWaitMs || 0),
          gpuWaitTimeouts: Number(status?.gpuWaitTimeouts || 0)
        }
      };
    }

    function refreshDoomDebugRuntimeBridge(reason = "status") {
      window.AIKernelDoomDebugRuntime = Object.freeze({
        version: "20260621-debug-runtime1",
        reason,
        status: readDoomDebugRuntimeStatus,
        gpuStatus: readDoomDebugGpuStatus,
        snapshot() {
          const status = readDoomDebugRuntimeStatus();
          const autoplay = status?.autoplay || {};
          return {
            reason,
            state: status?.state || "unknown",
            objective: autoplay.objective || "none",
            pipeline: autoplay.controlPipeline || "Idle",
            action: autoplay.action || autoplay.currentAction || null,
            gpu: readDoomDebugGpuStatus()
          };
        }
      });
      return window.AIKernelDoomDebugRuntime;
    }

    refreshDoomDebugRuntimeBridge("initial");

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

    function ensureGpuModeState() {
      const mode = window.AIKernelDoomGpuMode || {};
      if (typeof mode.useGpuRendering !== "boolean") {
        mode.useGpuRendering = true;
      }
      if (typeof mode.gpuPermanentlyDisabled !== "boolean") {
        mode.gpuPermanentlyDisabled = false;
      }
      mode.reason = String(mode.reason || "");
      mode.updatedAt = Number(mode.updatedAt || 0);
      window.AIKernelDoomGpuMode = mode;
      window.useGpuRendering = mode.useGpuRendering;
      window.gpuPermanentlyDisabled = mode.gpuPermanentlyDisabled;
      return mode;
    }

    function setStartupGpuMode(useGpu, reason = "") {
      const setter = window.AIKernelDoomSetGpuRenderingMode;
      const mode = typeof setter === "function"
        ? setter(Boolean(useGpu), reason || (useGpu ? "startup-gpu" : "startup-cpu"))
        : ensureGpuModeState();
      if (typeof setter !== "function") {
        mode.useGpuRendering = Boolean(useGpu);
        if (!useGpu) {
          mode.gpuPermanentlyDisabled = true;
        }
        mode.reason = reason || (useGpu ? "startup-gpu" : "startup-cpu");
        mode.updatedAt = Date.now();
        window.AIKernelDoomGpuMode = mode;
        window.useGpuRendering = mode.useGpuRendering;
        window.gpuPermanentlyDisabled = mode.gpuPermanentlyDisabled;
        try {
          window.dispatchEvent(new CustomEvent("aikernel-doom-gpu-mode-changed", {
            detail: {
              useGpuRendering: mode.useGpuRendering,
              gpuPermanentlyDisabled: mode.gpuPermanentlyDisabled,
              reason: mode.reason,
              updatedAt: mode.updatedAt
            }
          }));
        } catch {
        }
      }

      const activeGpu = mode.useGpuRendering !== false && mode.gpuPermanentlyDisabled !== true;
      appendConsoleLine("[ GPU ]", activeGpu ? "log-ok" : "log-warn", activeGpu
        ? "Startup mode selected: GPU rendering. WebGPU pipelines will initialize after approval."
        : "Startup mode selected: CPU rendering. WebGPU initialization will be skipped.");
      return ensureGpuModeState();
    }

    function syncApprovalModeButtons() {
      if (approvalAccept) {
        approvalAccept.textContent = "Start in GPU Mode / GPUで開始";
        approvalAccept.setAttribute("aria-label", "Start AIKernel.Doom in GPU mode");
      }
      if (approvalDecline) {
        approvalDecline.textContent = "Start in CPU Mode / CPUで開始";
        approvalDecline.setAttribute("aria-label", "Start AIKernel.Doom in CPU mode");
      }
    }

    function setApprovalUiState(state = "ready") {
      if (!approvalActions) {
        return;
      }

      syncApprovalModeButtons();
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
        halted.hidden = false;
        halted.classList.add("is-visible");
        halted.innerHTML = "[ LOADING ] AIKERNEL.DOOM APPROVED DOWNLOAD/LOAD ACTIVE.<span>Fetching and validating doom.wasm, DOOM1.WAD, Bonsai model, manifests, and metadata.</span><span>同意後のダウンロードと検証を実行しています。</span>";
      } else if (state === "ready") {
        halted.hidden = false;
        halted.classList.add("is-visible");
        halted.innerHTML = "[ READY ] AIKERNEL.DOOM STARTS AFTER USER APPROVAL.<span>Review the terms and licenses, then choose GPU mode or CPU mode. If you type <code>yes</code> in the aik console, the demo starts in GPU mode by default.</span><span>利用規約とライセンスを確認し、GPUモードまたはCPUモードを選択してください。aik コンソールで <code>yes</code> と入力した場合、デモは既定でGPUモードで開始します。</span><span>This demo requires approximately 1GB of free VRAM for stable GPU rendering. Due to WebGPU and browser limitations, GPU processing may cause a temporary screen blackout if the GPU driver resets. If your system has limited VRAM, consider starting in CPU mode.</span><span>安定したGPU描画には約1GBの空きVRAMが必要です。WebGPUとブラウザの制限により、GPUドライバがリセットされると一時的に画面がブラックアウトする場合があります。VRAMに余裕がない場合は、CPUモードで開始することを検討してください。</span><span>This demo's AI perception, cognition, and behavior models may be updated without notice, so behavior can change between demo runs.</span><span>このデモの AI は知覚・認知・行動モデルが予告なく更新される場合があるため、デモ実行ごとに挙動が変化することがあります。</span>";
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

      const status = doomRuntime?.status?.() || {};
      if (!wasmApprovalPending && status.state === "running") {
        doomHasStarted = true;
      }
      if (doomScreenPanel) {
        doomScreenPanel.hidden = false;
      }
      setDoomRuntimeUiVisibility(status.state ? status : { state: "running" });

      if (doomScreen.tabIndex < 0) {
        doomScreen.tabIndex = 0;
      }

      const allowKeyboardFocus = reason === "user-game-focus"
        || reason === "debug-focus-game"
        || reason.indexOf("manual-keyboard") >= 0;

      if (!allowKeyboardFocus) {
        renderDoomState(doomRuntime?.status?.() || { state: "unknown" }, `focus=display:${reason}`);
        return false;
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
      return focusAikConsole(reason);
    }

    function isEditableKeyboardTarget(target) {
      if (!target || typeof target.closest !== "function") {
        return false;
      }

      return Boolean(target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"));
    }

    function shouldHandleDoomKeyboardEvent(event) {
      if (event.defaultPrevented || isEditableKeyboardTarget(event.target)) {
        return false;
      }

      return document.activeElement === doomScreen;
    }

    function isDoomRuntimeUiVisible(status = doomRuntime?.status?.() || {}) {
      if (wasmApprovalPending) {
        return false;
      }

      if (status?.state === "running") {
        return true;
      }

      return doomHasStarted && (status?.state === "ready" || status?.state === "stopped" || status?.state === "failed");
    }

    function setDoomRuntimeUiVisibility(status = doomRuntime?.status?.() || {}) {
      installDoomPublicDemoLayout();
      const visible = isDoomRuntimeUiVisible(status);
      const gameSurfaceVisible = visible && doomScreenPanel?.hidden === false;
      consoleBody?.classList.toggle("is-doom-running", gameSurfaceVisible);
      if (runtimeStatus) {
        runtimeStatus.hidden = !visible;
      }
      if (doomController) {
        doomController.hidden = !visible;
      }
      if (doomControllerDebugLog) {
        doomControllerDebugLog.hidden = !visible;
      }
      if (doomRuntimePanel) {
        doomRuntimePanel.hidden = !visible;
      }
      if (doomPipelineSidePanel) {
        doomPipelineSidePanel.hidden = !visible;
      }
      if (doomDetectionSummaryPanel) {
        doomDetectionSummaryPanel.hidden = !visible;
      }
      if (doomDebugOverlay) {
        ensureDoomDebugOverlayHost();
        doomDebugOverlay.hidden = !visible;
      }
      if (doomDebugBar) {
        doomDebugBar.hidden = !visible || doomScreenPanel?.hidden !== false;
      }
      if (doomState) {
        doomState.hidden = !visible;
      }
      syncDoomLayoutCardVisibility();

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

      syncDoomLayoutCardVisibility();
      return visible;
    }

    function escapeText(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function installDoomPublicDemoLayout() {
      if (doomPublicLayoutInstalled) {
        return;
      }

      doomPublicLayoutInstalled = true;
      injectDoomPublicLayoutStyles();
      consoleBody?.classList.add("is-doom-public-layout");
      moveDoomToolbarBelowGame();

      let insertionAnchor = doomScreenPanel;
      if (doomDebugBar && consoleBody) {
        doomDebugBar.classList.add("doom-debug-controls-under-game");
        insertionAnchor?.after(doomDebugBar);
        insertionAnchor = doomDebugBar;
      }

      const consoleStack = ensureDoomLayoutSection("doom-aik-console-stack", "doom-aik-console-stack");
      moveAfter(consoleStack, insertionAnchor);
      if (container) {
        consoleStack.appendChild(container);
      }
      if (promptForm) {
        consoleStack.appendChild(promptForm);
      }
      insertionAnchor = consoleStack;

      doomLegalLinks = ensureDoomLegalLinks();
      moveAfter(doomLegalLinks, insertionAnchor);
      insertionAnchor = doomLegalLinks;

      if (halted) {
        halted.classList.add("doom-notice-panel");
        moveAfter(halted, insertionAnchor);
        insertionAnchor = halted;
      }
      if (approvalActions) {
        approvalActions.classList.add("doom-approval-panel");
        moveAfter(approvalActions, insertionAnchor);
        insertionAnchor = approvalActions;
      }
      if (panic) {
        panic.classList.add("doom-notice-panel", "is-panic-panel");
        moveAfter(panic, insertionAnchor);
        insertionAnchor = panic;
      }
      if (runtimeStatus) {
        runtimeStatus.classList.add("doom-runtime-dump");
        consoleBody?.appendChild(runtimeStatus);
      }

      installDoomSideCards();
      ensureDoomControlPanel();
      ensureDoomDebugLogHeader();
      syncDoomLayoutCardVisibility();
    }

    function moveAfter(node, anchor) {
      if (!node || !anchor || !anchor.parentNode) {
        return;
      }

      if (anchor.nextSibling === node) {
        return;
      }

      anchor.parentNode.insertBefore(node, anchor.nextSibling);
    }

    function ensureDoomLayoutSection(id, className) {
      let node = document.getElementById(id);
      if (!node) {
        node = document.createElement("section");
        node.id = id;
        node.className = className;
      }

      if (consoleBody && !node.parentNode) {
        consoleBody.appendChild(node);
      }

      return node;
    }

    function injectDoomPublicLayoutStyles() {
      if (document.getElementById("doom-public-demo-layout-style")) {
        return;
      }

      const style = document.createElement("style");
      style.id = "doom-public-demo-layout-style";
      style.textContent = `
        .console-body.is-doom-public-layout { gap: 12px; }
        .console-body.is-doom-public-layout #doom-screen-panel {
          order: 10;
          background: rgba(12,16,24,.38);
          box-shadow: 0 10px 28px rgba(0,0,0,.18);
        }
        .console-body.is-doom-public-layout #doom-debug-bar { order: 20; }
        .console-body.is-doom-public-layout #doom-aik-console-stack { order: 30; }
        .console-body.is-doom-public-layout #doom-legal-links { order: 40; }
        .console-body.is-doom-public-layout #halted { order: 50; }
        .console-body.is-doom-public-layout #doom-approval-actions { order: 60; }
        .console-body.is-doom-public-layout #panic { order: 70; }
        .console-body.is-doom-public-layout #runtime-status { order: 90; }
        #doom-screen-panel .doom-screen-toolbar { margin: 8px 0 0; padding: 8px 0 0; border-top: 1px solid rgba(255,255,255,.10); }
        #doom-aik-console-stack { display: grid; gap: 8px; }
        #doom-aik-console-stack #output { min-height: 154px; max-height: 228px; }
        #doom-aik-console-stack .prompt-form { border: 1px solid rgba(145,170,210,.22); background: rgba(12,16,24,.78); border-radius: 8px; }
        #doom-debug-bar.doom-debug-controls-under-game { display: grid; gap: 6px; padding: 8px; }
        #doom-debug-bar.doom-debug-controls-under-game > .sensor-toggles,
        #doom-debug-bar.doom-debug-controls-under-game > .detection-toggles {
          display: none !important;
        }
        #doom-debug-bar .doom-sensor-pipeline-title {
          display: block;
          width: fit-content;
          padding: 4px 7px;
          border: 1px solid rgba(255,247,192,.20);
          background: rgba(5,7,8,.06);
          border-radius: 6px;
          color: #fff7c0;
          font: 700 11px/1.2 system-ui, sans-serif;
          text-transform: uppercase;
          text-shadow: 0 1px 3px #000;
        }
        #doom-debug-bar[hidden] { display: none !important; }
        #doom-debug-bar .doom-sensor-toggles {
          display: grid;
          grid-template-columns: 1.04fr repeat(3, minmax(0, 1fr));
          grid-template-rows: auto auto;
          grid-auto-rows: max-content;
          gap: 8px;
          align-items: start;
          padding: 7px;
          border: 1px solid rgba(255,225,122,.22);
          background: rgba(5,7,8,.06);
          border-radius: 8px;
        }
        #doom-debug-bar .doom-detection-toggles.is-panelized { display: none; }
        .doom-sensor-node {
          min-width: 0;
          min-height: 0;
          display: grid;
          grid-template-rows: auto max-content;
          gap: 5px;
          padding: 6px;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(0,0,0,.16);
          border-radius: 7px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.035);
          overflow: hidden;
          align-self: start;
        }
        .doom-sensor-node.is-aisthesis { border-color: rgba(78,190,255,.34); background: rgba(5,18,28,.15); align-self: start; }
        .doom-sensor-node.is-noesis { border-color: rgba(149,255,208,.28); background: rgba(5,24,18,.13); }
        .doom-sensor-node.is-krisis { border-color: rgba(255,225,122,.32); background: rgba(26,22,6,.13); }
        .doom-sensor-node.is-kinesis { border-color: rgba(255,180,142,.30); background: rgba(28,14,7,.13); }
        .doom-sensor-node.is-noesis,
        .doom-sensor-node.is-krisis,
        .doom-sensor-node.is-kinesis {
          align-self: start !important;
          height: fit-content;
        }
        .doom-sensor-node-header {
          min-width: 0;
          padding: 3px 5px;
          border-bottom: 1px solid rgba(255,247,192,.18);
          background: rgba(255,247,192,.06);
        }
        .doom-sensor-node-label {
          display: block;
          color: #fff7c0;
          font: 700 11px/1.15 system-ui, sans-serif;
          text-transform: uppercase;
          text-shadow: 0 1px 3px #000;
        }
        .doom-sensor-node-subtitle {
          display: block;
          margin-top: 2px;
          color: #8ee4ff;
          font: 10px/1.2 ui-monospace, Consolas, monospace;
        }
        .doom-sensor-stages {
          display: grid;
          grid-template-rows: none;
          grid-auto-rows: max-content;
          gap: 6px;
          min-width: 0;
          align-content: start;
        }
        .doom-sensor-stage {
          min-height: 0;
          align-self: start;
        }
        .doom-sensor-node.is-aisthesis .doom-sensor-stages,
        .doom-sensor-node.is-krisis .doom-sensor-stages {
          align-self: start;
        }
        .doom-sensor-node.is-noesis .doom-sensor-stages,
        .doom-sensor-node.is-krisis .doom-sensor-stages,
        .doom-sensor-node.is-kinesis .doom-sensor-stages {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-items: start;
        }
        .doom-sensor-stage-title {
          margin: 0 0 4px;
          color: #d9f0ff;
          font: 700 10px/1.15 system-ui, sans-serif;
          text-transform: uppercase;
        }
        .doom-sensor-node-buttons { display: flex; flex-wrap: wrap; gap: 3px; align-items: flex-start; }
        .doom-sensor-node.is-aisthesis .doom-sensor-node-buttons {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5px;
          align-items: stretch;
        }
        .doom-sensor-node.is-aisthesis .doom-sensor-switch,
        .doom-sensor-node.is-aisthesis .doom-panel-signal-chip {
          width: 100%;
          min-height: 42px;
        }
        @media (min-width: 1280px) {
          #doom-debug-bar .doom-sensor-toggles {
            grid-template-columns: minmax(260px, .95fr) minmax(0, 1.7fr) minmax(280px, 1fr);
            grid-template-rows: auto auto;
            align-items: start;
            align-content: start;
            grid-auto-rows: max-content;
            min-height: 0;
          }
          #doom-debug-bar .doom-sensor-node {
            min-height: 0;
            height: max-content !important;
            align-self: start !important;
          }
          #doom-debug-bar .doom-sensor-stages {
            grid-template-rows: none !important;
            grid-auto-rows: max-content !important;
            align-content: start !important;
          }
          #doom-debug-bar .doom-sensor-stage {
            min-height: 0 !important;
            align-self: start !important;
          }
          #doom-debug-bar .doom-sensor-node[data-sensor-panel="aisthesis"] {
            grid-column: 1 / 2 !important;
            grid-row: 1 / 2 !important;
          }
          #doom-debug-bar .doom-sensor-node[data-sensor-panel="noesis"] {
            grid-column: 2 / 3 !important;
            grid-row: 1 / 2 !important;
          }
          #doom-debug-bar .doom-sensor-node[data-sensor-panel="krisis"] {
            grid-column: 3 / 4 !important;
            grid-row: 1 / 2 !important;
            height: fit-content !important;
            align-self: start !important;
            max-height: max-content;
          }
          #doom-debug-bar .doom-sensor-node[data-sensor-panel="kinesis"] {
            grid-column: 1 / 4 !important;
            grid-row: 2 / 3 !important;
          }
        }
        @media (min-width: 1280px) and (max-width: 1599.98px) {
          #doom-debug-bar .doom-sensor-toggles {
            grid-template-columns: minmax(250px, .9fr) minmax(0, 1.45fr) minmax(250px, .92fr);
          }
          #doom-debug-bar .doom-sensor-node {
            padding: 7px;
          }
          #doom-debug-bar .doom-sensor-node.is-aisthesis .doom-sensor-switch,
          #doom-debug-bar .doom-sensor-node.is-aisthesis .doom-panel-signal-chip {
            min-height: 36px;
          }
        }
        .doom-panel-signal-chip {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          min-width: 0;
          max-width: 100%;
          padding: 3px 5px;
          border: 1px solid rgba(255,247,192,.18);
          border-radius: 5px;
          background: rgba(255,247,192,.04);
          color: #e9fbff;
          font: 9.5px/1.16 ui-monospace, Consolas, monospace;
          overflow: hidden;
        }
        .doom-panel-signal-chip strong { color: #fff7c0; font-weight: 700; }
        .doom-panel-signal-chip span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: .78; }
        .doom-sensor-switch {
          min-width: 0;
          padding: 3px 5px;
          border-radius: 5px;
          border: 1px solid rgba(145,170,210,.36);
          background: rgba(23,33,48,.34);
          color: #f4f8ff;
          font: 9.5px/1.16 ui-monospace, Consolas, monospace;
          text-align: left;
        }
        .doom-sensor-switch.is-on { border-color: rgba(142,228,255,.55); background: rgba(26,47,69,.38); }
        .doom-sensor-switch:not(.is-on) { opacity: .52; }
        .doom-legal-links { padding: 9px 11px; font: 12px/1.45 system-ui, sans-serif; color: #d7e8ff; }
        .doom-legal-links a { color: #8ee4ff; text-decoration: none; border-bottom: 1px solid rgba(142,228,255,.42); }
        .doom-legal-links a:focus-visible, .doom-legal-links a:hover { color: #fff7c0; border-bottom-color: #fff7c0; }
        .doom-legal-links span { display: block; margin-top: 3px; color: #bdd1e8; }
        .doom-notice-panel { padding: 11px 13px; font: 12px/1.48 system-ui, sans-serif; color: #f4f8ff; }
        .doom-notice-panel span { display: block; margin-top: 4px; color: #bdd1e8; }
        .doom-notice-panel.is-panic-panel:empty { display: none !important; }
        .doom-runtime-dump { order: 90; max-height: 220px; }
        #doom-screen-panel .doom-screen-wrap { position: relative; }
        .doom-goal-hud {
          position: absolute;
          left: 50%;
          top: 56%;
          z-index: 66;
          box-sizing: border-box;
          width: min(58%, 420px);
          transform: translate(-50%, -50%);
          display: grid;
          gap: 5px;
          padding: 0;
          border: 0;
          background: transparent;
          box-shadow: none;
          backdrop-filter: none;
          pointer-events: none;
          text-align: center;
          color: #f7fbff;
          text-shadow: 0 2px 8px rgba(0,0,0,.95), 0 0 10px rgba(0,0,0,.65);
        }
        .doom-goal-telos {
          display: grid;
          gap: 2px;
          justify-items: center;
          padding: 1px 0 2px;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          backdrop-filter: none;
        }
        .doom-goal-telos .doom-goal-label,
        .doom-goal-objective-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 16px;
          padding: 1px 6px;
          border: 1px solid rgba(125, 211, 252, .48);
          border-radius: 4px;
          background: rgba(2, 18, 30, .22);
          color: #8ee4ff;
          font: 700 10px/1.1 ui-monospace, Consolas, monospace;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        .doom-goal-telos strong {
          color: #fff7c0;
          font: 800 25px/1.02 system-ui, sans-serif;
          letter-spacing: 0;
          text-transform: uppercase;
        }
        .doom-goal-primary {
          display: inline-flex;
          justify-self: center;
          align-items: center;
          gap: 8px;
          max-width: 100%;
          padding: 2px 6px;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }
        .doom-goal-primary strong {
          min-width: 0;
          color: #f7fbff;
          font: 700 14px/1.15 system-ui, sans-serif;
          letter-spacing: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .doom-goal-sub {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 4px;
          max-width: 100%;
        }
        .doom-goal-chip {
          display: inline-flex;
          align-items: center;
          max-width: 150px;
          padding: 1px 6px;
          border: 1px solid rgba(148, 163, 184, .24);
          border-radius: 999px;
          background: rgba(2, 10, 18, .16);
          color: #dff8ff;
          font: 10px/1.2 ui-monospace, Consolas, monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .doom-goal-chip.is-safety,
        .doom-goal-chip.is-kairos {
          color: #ffe7ad;
          border-color: rgba(255, 225, 122, .32);
          background: rgba(40, 24, 8, .16);
        }
        .doom-goal-chip.is-detection {
          color: #dff8ff;
          border-color: rgba(142, 228, 255, .28);
          background: rgba(4, 24, 34, .14);
        }
        #doom-debug-overlay {
          position: absolute;
          inset: 0;
          display: none;
          pointer-events: none;
          z-index: 60;
          overflow: hidden;
          contain: layout paint;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        #doom-debug-overlay.is-visible { display: block; }
        #doom-debug-overlay .doom-cpu-radar-hud {
          position: absolute;
          right: 3.1%;
          top: 4.2%;
          width: clamp(82px, 19%, 142px);
          aspect-ratio: 1;
          z-index: 57;
          pointer-events: none;
          opacity: .96;
          contain: layout paint;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,.72));
        }
        #doom-debug-overlay .doom-cpu-radar-hud canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        #doom-debug-overlay .doom-cpu-radar-caption {
          position: absolute;
          left: 50%;
          bottom: -13px;
          transform: translateX(-50%);
          color: rgba(190,248,255,.92);
          font: 800 7.5px/1 ui-monospace, Consolas, monospace;
          letter-spacing: 0;
          text-transform: uppercase;
          text-shadow: 0 1px 2px rgba(0,0,0,.95), 0 0 8px rgba(0,220,255,.44);
          white-space: nowrap;
        }
        #doom-debug-overlay.is-gpu-backed { mix-blend-mode: normal; }
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label {
          position: absolute;
          display: none;
          left: calc(var(--label-left, 1.3) * 1%);
          top: calc(var(--label-top, 2.0) * 1%);
          width: calc(var(--label-width, 34) * 1%);
          max-width: calc(var(--label-width, 34) * 1%);
          color: rgba(238,250,255,.94);
          font: 600 9.5px/1.22 ui-monospace, Consolas, monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: 0 1px 2px rgba(0,0,0,.95), 0 0 8px rgba(12,24,32,.65);
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
          pointer-events: none;
          z-index: 46;
        }
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label[data-gpu-label-layout="rect"] {
          display: block;
        }
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label[data-gpu-label-anchor="below"] {
          text-align: center;
          transform: translateX(-50%);
        }
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.priority-high {
          color: rgba(255,220,208,.98);
          text-shadow: 0 1px 2px rgba(0,0,0,.98), 0 0 8px rgba(255,72,54,.38);
          z-index: 50;
        }
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-priority-axis {
          display: block;
          width: calc(var(--label-width, 23) * 1%);
          max-width: calc(var(--label-width, 23) * 1%);
          font: 900 11.6px/1.12 ui-monospace, Consolas, monospace;
          letter-spacing: 0;
          text-transform: uppercase;
          white-space: pre-line;
          overflow: visible;
          text-overflow: clip;
          z-index: 56;
          color: rgba(196,244,255,1);
          text-shadow: 0 1px 2px rgba(0,0,0,.98), 0 0 12px rgba(64,210,255,.68);
        }
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-radar-label {
          display: block;
          width: calc(var(--label-width, 8) * 1%);
          max-width: calc(var(--label-width, 8) * 1%);
          color: rgba(166,248,255,.96);
          font: 900 8px/1 ui-monospace, Consolas, monospace;
          letter-spacing: 0;
          text-transform: uppercase;
          text-align: center;
          white-space: nowrap;
          overflow: visible;
          text-overflow: clip;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          text-shadow: 0 1px 2px rgba(0,0,0,.98), 0 0 9px rgba(0,230,255,.68);
          z-index: 55;
        }
        #doom-debug-overlay .is-priority-axis {
          border-width: 1px;
          background: rgba(4,16,24,.11);
          z-index: 46;
        }
        #doom-debug-overlay .is-priority-axis .debug-region-label {
          font: 800 11.8px/1.14 ui-monospace, Consolas, monospace;
          text-transform: uppercase;
          letter-spacing: 0;
          white-space: pre-line;
          overflow: visible;
          text-overflow: clip;
        }
        #doom-debug-overlay .is-priority-axis.is-axis-logos,
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-priority-axis.is-axis-logos {
          color: rgba(156,230,255,.99);
          border-color: rgba(70,205,255,.90);
          text-shadow: 0 1px 2px rgba(0,0,0,.98), 0 0 10px rgba(52,200,255,.58);
        }
        #doom-debug-overlay .is-priority-axis.is-axis-ethos,
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-priority-axis.is-axis-ethos {
          color: rgba(178,255,192,.99);
          border-color: rgba(64,245,112,.88);
          text-shadow: 0 1px 2px rgba(0,0,0,.98), 0 0 10px rgba(54,230,92,.55);
        }
        #doom-debug-overlay .is-priority-axis.is-axis-pathos,
        #doom-debug-overlay .is-priority-axis.is-fire,
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-priority-axis.is-axis-pathos,
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-priority-axis.is-fire {
          color: rgba(255,214,204,.99);
          border-color: rgba(255,78,54,.92);
          text-shadow: 0 1px 2px rgba(0,0,0,.98), 0 0 11px rgba(255,66,44,.62);
        }
        #doom-debug-overlay .is-priority-axis.is-use,
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-priority-axis.is-use {
          color: rgba(255,235,168,.99);
          border-color: rgba(255,200,64,.90);
          text-shadow: 0 1px 2px rgba(0,0,0,.98), 0 0 10px rgba(255,190,64,.56);
        }
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-door,
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-door-candidate {
          color: rgba(255,210,210,.98);
        }
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-wall,
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-corner-candidate {
          color: rgba(255,231,172,.96);
        }
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-enemy,
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-combat,
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-enemy-circle {
          color: rgba(255,202,194,.98);
        }
        #doom-debug-overlay.is-gpu-backed .debug-gpu-label.is-enemy-circle-audio {
          color: rgba(255,228,174,.98);
        }
        #doom-debug-overlay.is-gpu-backed .debug-region {
          display: none !important;
        }
        #doom-debug-overlay .debug-region {
          position: absolute;
          box-sizing: border-box;
          border: 1px solid rgba(142,228,255,.64);
          background: rgba(8,18,28,.085);
          color: #e9fbff;
          text-shadow: 0 1px 2px rgba(0,0,0,.82);
          border-radius: 4px;
          box-shadow: 0 0 8px rgba(78,190,255,.12), inset 0 0 0 1px rgba(255,255,255,.035);
          opacity: .96;
          overflow: hidden;
        }
        #doom-debug-overlay .debug-region.priority-high { border-width: 1px; }
        #doom-debug-overlay .debug-region.is-vision,
        #doom-debug-overlay .debug-region.is-gap {
          background: rgba(0,0,0,.045);
          box-shadow: none;
          z-index: 12;
        }
        #doom-debug-overlay .debug-region-label {
          position: absolute;
          left: 4px;
          top: 3px;
          max-width: calc(100% - 8px);
          color: inherit;
          font: 10px/1.15 ui-monospace, Consolas, monospace;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }
        #doom-debug-overlay .is-vision-heat {
          border-color: rgba(96,214,255,var(--heat-border-alpha,.34));
          background: rgba(48,174,255,var(--heat-alpha,.16));
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.07), 0 0 6px rgba(60,185,255,.10);
          opacity: .40;
          z-index: 1;
        }
        #doom-debug-overlay .is-grid-3x3 {
          background: transparent !important;
          box-shadow: none !important;
          border-width: 1px;
          opacity: .82;
          z-index: 5;
        }
        #doom-debug-overlay .is-grid-motion {
          border-color: rgba(255,218,103,var(--heat-border-alpha,.44));
          background: rgba(255,210,92,var(--heat-alpha,.16));
        }
        #doom-debug-overlay .is-grid-3x3.is-grid-motion {
          background: transparent !important;
        }
        #doom-debug-overlay .is-door, #doom-debug-overlay .is-door-candidate {
          border-color: rgba(255,73,73,.94);
          background: rgba(84,6,12,.055);
          color: #ffd7d7;
          z-index: 24;
        }
        #doom-debug-overlay .is-wall, #doom-debug-overlay .is-corner-candidate {
          border-color: rgba(255,209,87,.92);
          background: rgba(78,51,5,.045);
          color: #ffe7ac;
          z-index: 18;
        }
        #doom-debug-overlay .is-door-candidate,
        #doom-debug-overlay .is-corner-candidate {
          overflow: visible;
        }
        #doom-debug-overlay .is-door-candidate .debug-region-label,
        #doom-debug-overlay .is-corner-candidate .debug-region-label {
          left: 50%;
          top: calc(100% + 3px);
          max-width: 40vw;
          padding: 2px 5px;
          border: 1px solid rgba(255,255,255,.13);
          border-radius: 4px;
          background: rgba(0,0,0,.20);
          font-size: 9px;
          line-height: 1.15;
          white-space: nowrap;
          transform: translateX(-50%);
          opacity: .92;
        }
        #doom-debug-overlay .is-door-candidate .debug-region-label {
          border-color: rgba(255,73,73,.42);
        }
        #doom-debug-overlay .is-corner-candidate .debug-region-label {
          border-color: rgba(255,209,87,.38);
        }
        #doom-debug-overlay .is-enemy, #doom-debug-overlay .is-combat-alert {
          border-color: rgba(255,80,80,.96);
          background: rgba(72,5,7,.11);
          color: #ffd2d2;
          z-index: 36;
        }
        #doom-debug-overlay .is-enemy-circle {
          border: 1px solid rgba(255,80,80,.96);
          background: rgba(255,16,24,.045);
          color: #ffd2d2;
          border-radius: 50%;
          box-shadow: 0 0 12px rgba(255,48,32,.24), inset 0 0 0 1px rgba(255,210,190,.12);
          z-index: 40;
          overflow: visible;
        }
        #doom-debug-overlay .is-enemy-circle-visual {
          border-width: 1px;
          border-color: rgba(255,74,68,.96);
          background: rgba(255,28,32,.035);
          box-shadow: 0 0 12px rgba(255,48,32,.22), inset 0 0 0 1px rgba(255,210,190,.12);
        }
        #doom-debug-overlay .is-enemy-circle-audio {
          border-width: 1px;
          border-color: rgba(255,190,74,.90);
          background: rgba(255,174,42,.030);
          color: #ffe4ae;
          box-shadow: 0 0 15px rgba(255,180,48,.22), inset 0 0 0 1px rgba(255,238,184,.12);
        }
        #doom-debug-overlay .is-enemy-circle-av {
          border-color: rgba(255,74,68,.96);
          background: rgba(255,32,32,.040);
          box-shadow: 0 0 0 1px rgba(255,190,74,.42), 0 0 16px rgba(255,54,40,.26), inset 0 0 0 1px rgba(255,226,186,.16);
        }
        #doom-debug-overlay .is-enemy-circle .debug-region-label {
          left: 50%;
          top: calc(100% + 4px);
          max-width: 34vw;
          padding: 2px 5px;
          border: 1px solid rgba(255,80,80,.42);
          border-radius: 4px;
          background: rgba(0,0,0,.22);
          color: #ffd2d2;
          font-size: 9px;
          line-height: 1.15;
          white-space: nowrap;
          transform: translateX(-50%);
        }
        #doom-debug-overlay .is-enemy-circle-audio .debug-region-label {
          border-color: rgba(255,190,74,.42);
          color: #ffe4ae;
        }
        #doom-debug-overlay .is-enemy-circle-av .debug-region-label {
          border-color: rgba(255,190,74,.50);
          color: #ffe2d2;
        }
        #doom-debug-overlay .is-zoe-warning {
          border-color: rgba(255,189,87,.92);
          background: rgba(56,34,5,.12);
          color: #ffe6ae;
          z-index: 38;
        }
        #doom-debug-overlay .is-zoe-veto {
          border-color: rgba(255,73,73,.96);
          background: rgba(74,4,8,.18);
          color: #ffd4d4;
          z-index: 44;
        }
        #doom-debug-overlay .is-objective {
          border-color: rgba(142,228,255,.82);
          background: rgba(8,28,46,.085);
          z-index: 30;
        }
        #doom-debug-overlay .is-kairos-pulse { animation: doom-debug-pulse .65s ease-in-out infinite alternate; }
        #doom-debug-overlay .debug-probe-arrow {
          position: absolute;
          left: 46%;
          top: 63%;
          width: 8%;
          height: 10%;
          display: grid;
          place-items: center;
          color: #fff7c0;
          font: 700 22px/1 ui-monospace, Consolas, monospace;
          text-shadow: 0 0 10px rgba(255,220,100,.78);
          pointer-events: none;
        }
        #doom-debug-overlay .debug-probe-arrow.is-left { transform: translateX(-40%); }
        #doom-debug-overlay .debug-probe-arrow.is-right { transform: translateX(40%); }
        @keyframes doom-debug-pulse { from { opacity: .45; } to { opacity: 1; } }
        .side.is-doom-card-stack { display: flex; flex-direction: column; gap: 12px; align-self: stretch; }
        details.doom-side-card { overflow: hidden; }
        details.doom-side-card[hidden] { display: none !important; }
        details.doom-side-card > summary { list-style: none; display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; cursor: pointer; padding: 9px 10px; border-bottom: 1px solid rgba(255,255,255,.10); color: #fff7c0; font: 700 12px/1.22 system-ui, sans-serif; letter-spacing: 0; }
        details.doom-side-card > summary::-webkit-details-marker { display: none; }
        details.doom-side-card > summary::after { content: "fold"; color: #8ee4ff; font: 10px/1 ui-monospace, Consolas, monospace; opacity: .78; }
        details.doom-side-card[open] > summary::after { content: "open"; }
        .doom-side-card-subtitle { grid-column: 1 / span 2; margin-top: -4px; color: #8f9aaa; font: 10px/1.22 ui-monospace, Consolas, monospace; font-weight: 400; }
        .doom-side-card-body { padding: 10px; }
        .doom-side-card-body > .doom-card-content { border: 0 !important; background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .doom-control-panel-grid { display: grid; gap: 9px; }
        .doom-control-command-row, .doom-control-keypad { display: flex; flex-wrap: wrap; gap: 6px; }
        .doom-control-keypad { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .doom-control-panel-grid button { min-width: 0; padding: 7px 8px; font-size: 11px; }
        #doom-state { min-height: 18px; color: #bdd1e8; font: 11px/1.35 ui-monospace, Consolas, monospace; overflow-wrap: anywhere; }
        .doom-side-pipeline-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .doom-side-pipeline-card { min-width: 0; padding: 8px; border: 1px solid rgba(255,255,255,.13); background: rgba(0,0,0,.22); border-radius: 6px; }
        .doom-side-pipeline-card h4 { margin: 0 0 5px; color: #fff7c0; font: 700 11px/1.2 system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0; }
        .doom-side-pipeline-card pre { margin: 0; color: #d9f0ff; font: 10px/1.34 ui-monospace, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
        .doom-side-pipeline-card.is-zoe { border-color: rgba(255,73,73,.70); background: rgba(56,5,7,.24); }
        .doom-side-pipeline-card.is-zoe-warning { border-color: rgba(255,189,87,.62); background: rgba(52,33,7,.22); }
        .doom-objective-status-grid { display: grid; gap: 7px; }
        .doom-objective-status-row { display: grid; grid-template-columns: 76px 1fr; gap: 8px; align-items: start; padding: 6px 7px; border: 1px solid rgba(255,255,255,.11); background: rgba(0,0,0,.14); border-radius: 6px; min-width: 0; }
        .doom-objective-status-row strong { color: #fff7c0; font: 700 10px/1.25 ui-monospace, Consolas, monospace; text-transform: uppercase; }
        .doom-objective-status-row span { color: #d9f0ff; font: 11px/1.32 ui-monospace, Consolas, monospace; overflow-wrap: anywhere; }
        .doom-objective-status-row.is-telos { border-color: rgba(142,228,255,.38); background: rgba(5,32,44,.16); }
        .doom-objective-status-row.is-priority { border-color: rgba(255,225,122,.36); background: rgba(40,31,7,.16); }
        .doom-objective-status-row.is-gpu { border-color: rgba(78,190,255,.44); background: rgba(6,25,40,.16); }
        .doom-objective-status-row.is-warn { border-color: rgba(255,189,87,.58); background: rgba(52,33,7,.18); }
        .doom-objective-status-row.is-health.is-warn { border-color: rgba(255,189,87,.58); background: rgba(52,33,7,.22); }
        .doom-objective-status-row.is-health.is-danger { border-color: rgba(255,73,73,.70); background: rgba(56,5,7,.24); }
        .doom-detection-summary-grid { display: grid; gap: 6px; }
        .doom-detection-summary-row { display: grid; grid-template-columns: 68px 1fr; gap: 8px; align-items: start; padding: 5px 7px; border: 1px solid rgba(255,255,255,.11); background: rgba(0,0,0,.14); border-radius: 6px; }
        .doom-detection-summary-row strong { color: #fff7c0; font: 700 10px/1.25 ui-monospace, Consolas, monospace; text-transform: uppercase; }
        .doom-detection-summary-row span { color: #d9f0ff; font: 11px/1.3 ui-monospace, Consolas, monospace; overflow-wrap: anywhere; }
        .doom-detection-summary-row.is-danger { border-color: rgba(255,73,73,.55); background: rgba(56,5,7,.20); }
        .doom-detection-summary-row.is-door { border-color: rgba(255,189,87,.45); }
        .doom-detection-summary-row.is-vision { border-color: rgba(78,190,255,.40); }
        .doom-control-log-entry { display: grid; grid-template-columns: 30px 1fr; gap: 5px; align-items: start; padding: 2px 0; }
        .doom-control-log-entry.is-warn, .doom-control-log-entry.is-pathos { color: #ffd36f; }
        .doom-control-log-entry.is-fail, .doom-control-log-entry.is-error { color: #ff8d8d; }
        .doom-control-log-entry.is-priority { color: #fff7c0; }
        .doom-control-log-entry.is-telos, .doom-control-log-entry.is-objective { color: #8ee4ff; }
        .doom-control-log-entry.is-action { color: #d9f0ff; }
        .doom-control-log-entry.is-action.is-warn { color: #ffd36f; }
        .doom-control-log-label { color: #95ffd0; font-weight: 700; }
        .doom-controller-debug-log-head { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .doom-debug-log-title { color: #fff7c0; font: 700 11px/1.2 system-ui, sans-serif; }
        .doom-debug-log-limit { color: #8ee4ff; font: 10px/1.2 ui-monospace, Consolas, monospace; }
        .doom-debug-log-filters { display: flex; flex-wrap: wrap; gap: 5px; }
        .doom-control-panel-debug-log {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          max-height: clamp(240px, 34vh, 520px);
        }
        .doom-control-panel-debug-log .doom-controller-debug-log-head {
          margin-bottom: 4px;
        }
        .doom-control-panel-debug-log ol {
          flex: 1 1 auto;
          min-height: 0;
          gap: 1px;
          overflow: auto;
        }
        .doom-control-panel-debug-log .doom-control-log-entry,
        .doom-control-panel-debug-log .doom-control-log-empty {
          grid-template-columns: 2.35em minmax(0, 1fr);
          gap: 2px;
          font-size: 0.5rem;
          line-height: 1.02;
        }
        @media (min-width: 1280px) {
          .console-body.is-doom-running #doom-aik-console-stack {
            grid-template-rows: auto auto !important;
            align-self: start !important;
            height: auto !important;
            max-height: var(--doom-desktop-screen-height, var(--doom-xlarge-screen-height, min(52vh, 620px))) !important;
          }
          .console-body.is-doom-running #doom-aik-console-stack #output {
            min-height: 112px !important;
            max-height: clamp(132px, 20vh, 240px) !important;
          }
          .console-body.is-doom-running #doom-aik-console-stack #wasm-prompt {
            align-self: start !important;
          }
          .console-body.is-doom-running #doom-debug-bar {
            grid-template-columns: auto minmax(0, 1fr);
            grid-template-rows: auto auto;
            grid-template-areas:
              "title actions"
              "sensors sensors";
            gap: 7px 9px;
            align-items: center;
            padding-top: 7px;
          }
          .console-body.is-doom-running #doom-debug-bar .doom-debug-help {
            display: none !important;
          }
          .console-body.is-doom-running #doom-debug-bar .doom-sensor-pipeline-title {
            grid-area: title;
            align-self: center;
            white-space: nowrap;
            margin: 0;
          }
          .console-body.is-doom-running #doom-debug-bar .doom-debug-actions {
            grid-area: actions;
            align-self: center;
            justify-content: flex-start;
            gap: 6px;
          }
          .console-body.is-doom-running #doom-debug-bar .doom-debug-actions > button {
            flex: 0 1 auto;
            min-width: 0;
            min-height: 28px;
            padding: 5px 9px;
            white-space: nowrap;
          }
        }
        @media (min-width: 1280px) and (max-width: 1499.98px) {
          .console-body.is-doom-running {
            grid-template-columns: minmax(0, 1fr) !important;
            grid-template-areas:
              "screen"
              "console"
              "debug"
              "legal"
              "actions"
              "status" !important;
          }
          .console-body.is-doom-running #doom-aik-console-stack {
            grid-area: console !important;
            width: 100%;
            height: auto !important;
            max-height: none !important;
          }
          .console-body.is-doom-running #doom-aik-console-stack #output {
            min-height: 92px !important;
            max-height: clamp(112px, 16vh, 176px) !important;
            font-size: 0.68rem;
            line-height: 1.22;
          }
          .console-body.is-doom-running #doom-aik-console-stack #wasm-prompt {
            min-height: 46px;
          }
        }
        @media (max-width: 1279.98px) {
          .console-body.is-doom-running #doom-debug-bar {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) !important;
            grid-template-areas:
              "title"
              "actions"
              "sensors" !important;
            gap: 9px;
            align-items: stretch;
          }
          .console-body.is-doom-running #doom-debug-bar .doom-sensor-pipeline-title {
            grid-area: title !important;
            justify-self: start;
            margin: 0;
          }
          .console-body.is-doom-running #doom-debug-bar .doom-debug-actions {
            grid-area: actions !important;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(118px, 1fr));
            gap: 7px;
            width: 100%;
            margin: 0;
            align-self: stretch;
            justify-content: stretch;
          }
          .console-body.is-doom-running #doom-debug-bar .doom-debug-actions > button {
            width: 100%;
            min-width: 0;
            min-height: 32px;
            padding: 5px 8px;
            white-space: nowrap;
          }
          .console-body.is-doom-running #doom-debug-bar .doom-sensor-toggles {
            grid-area: sensors !important;
            margin-top: 0;
          }
        }
        @media (max-width: 980px) {
          .shell { grid-template-columns: 1fr !important; }
          .doom-side-pipeline-grid { grid-template-columns: 1fr; }
          #doom-debug-bar .doom-sensor-toggles { grid-template-columns: 1fr; }
        }
      `;
      document.head.appendChild(style);
    }

    function moveDoomToolbarBelowGame() {
      if (!doomScreenPanel) {
        return;
      }

      const toolbar = doomScreenPanel.querySelector(".doom-screen-toolbar");
      const wrap = doomScreenPanel.querySelector(".doom-screen-wrap");
      if (toolbar && wrap && toolbar.previousElementSibling !== wrap) {
        wrap.after(toolbar);
      }
    }

    function ensureDoomDebugOverlayHost() {
      if (!doomDebugOverlay || !doomScreenPanel) {
        return;
      }

      const wrap = doomScreenPanel.querySelector(".doom-screen-wrap");
      if (!wrap) {
        return;
      }

      const oldCard = doomDebugOverlay.closest?.("details.doom-side-card");
      doomDebugOverlay.classList.remove("doom-card-content");
      if (doomDebugOverlay.parentElement !== wrap) {
        wrap.appendChild(doomDebugOverlay);
      }

      if (oldCard && oldCard.querySelectorAll(".doom-card-content").length === 0) {
        oldCard.remove();
      }
    }

    function ensureDoomDetectionSummaryPanel() {
      if (doomDetectionSummaryPanel) {
        return doomDetectionSummaryPanel;
      }

      doomDetectionSummaryPanel = document.getElementById("doom-detection-summary-panel") || document.createElement("section");
      doomDetectionSummaryPanel.id = "doom-detection-summary-panel";
      doomDetectionSummaryPanel.className = "doom-detection-summary-panel doom-card-content";
      doomDetectionSummaryPanel.textContent = "Detection overlay is rendered on the game screen.";
      return doomDetectionSummaryPanel;
    }

    function ensureDoomLegalLinks() {
      let node = document.getElementById("doom-legal-links");
      const existingPromptLegal = document.querySelector(".prompt-legal");
      if (!node && existingPromptLegal) {
        node = existingPromptLegal;
        node.id = "doom-legal-links";
        node.classList.add("doom-legal-links");
        return node;
      }

      if (!node) {
        node = document.createElement("section");
        node.id = "doom-legal-links";
        node.className = "panel doom-legal-links";
        node.innerHTML = `<strong>Terms / 利用規約</strong> <a href="/demo/doom/terms-and-licenses.html" target="_blank" rel="noopener noreferrer">AIKernel.Doom Terms and License Notices</a><span>Review the license notices before approval. / 起動前に利用規約とライセンス表示を確認してください。</span>`;
      } else {
        node.classList.add("doom-legal-links");
      }

      return node;
    }

    function installDoomSideCards() {
      const side = document.querySelector(".side");
      if (!side) {
        return;
      }

      side.classList.add("is-doom-card-stack");
      ensureDoomDebugOverlayHost();
      const controlCard = wrapDoomSideCard(doomController, "Control", "manual input and runtime switches", true);
      doomPipelineSidePanel = doomPipelineSidePanel || document.getElementById("doom-pipeline-side-panel") || document.createElement("section");
      doomPipelineSidePanel.id = "doom-pipeline-side-panel";
      doomPipelineSidePanel.className = "doom-pipeline-side-panel doom-card-content";
      doomPipelineSideGrid = doomPipelineSideGrid || doomPipelineSidePanel.querySelector(".doom-side-pipeline-grid") || document.createElement("div");
      doomPipelineSideGrid.className = "doom-side-pipeline-grid";
      doomPipelineSidePanel.replaceChildren(doomPipelineSideGrid);
      const decisionCard = wrapDoomSideCard(doomPipelineSidePanel, "Decision Detail", "Aisthesis / Noesis / Krisis / Kinesis", true, "decision");
      const stateCard = wrapDoomSideCard(doomRuntimePanel, "Objective / Status", "current route and state summaries", true);
      const overlayCard = wrapDoomSideCard(ensureDoomDetectionSummaryPanel(), "Detection Summary", "overlay status and vision scores", true);
      const logCard = wrapDoomSideCard(doomControllerDebugLog, "Doom Debug Log", "sequential command/action trace", true);

      for (const card of [controlCard, decisionCard, stateCard, overlayCard, logCard]) {
        if (card) {
          side.appendChild(card);
        }
      }
      ensureDoomDebugOverlayHost();
    }

    function wrapDoomSideCard(node, title, subtitle = "", open = true, key = "") {
      if (!node) {
        return null;
      }

      const existing = node.closest?.("details.doom-side-card");
      if (existing) {
        return existing;
      }

      const card = document.createElement("details");
      card.className = `panel doom-side-card ${key ? `is-${key}` : ""}`.trim();
      if (open) {
        card.open = true;
      }

      const summary = document.createElement("summary");
      const label = document.createElement("span");
      label.textContent = title;
      summary.appendChild(label);
      if (subtitle) {
        const sub = document.createElement("span");
        sub.className = "doom-side-card-subtitle";
        sub.textContent = subtitle;
        summary.appendChild(sub);
      }

      const body = document.createElement("div");
      body.className = "doom-side-card-body";
      node.classList.remove("panel");
      node.classList.add("doom-card-content");
      node.parentNode?.insertBefore(card, node);
      body.appendChild(node);
      card.appendChild(summary);
      card.appendChild(body);
      doomSideCards.set(node.id || title, card);
      return card;
    }

    function syncDoomLayoutCardVisibility() {
      for (const [, card] of doomSideCards) {
        const content = card.querySelector(".doom-card-content");
        card.hidden = Boolean(content?.hidden);
      }
    }

    function ensureDoomControlPanel() {
      if (!doomController || doomController.dataset.controlPanelRestored === "true") {
        return;
      }

      doomController.dataset.controlPanelRestored = "true";
      let stateNode = doomState;
      if (stateNode?.parentNode !== doomController) {
        stateNode = document.getElementById("doom-state") || document.createElement("div");
        stateNode.id = "doom-state";
      }

      const grid = document.createElement("div");
      grid.className = "doom-control-panel-grid";
      const stateWrap = document.createElement("div");
      stateWrap.className = "doom-control-state-wrap";
      stateWrap.appendChild(stateNode);

      const commandRow = document.createElement("div");
      commandRow.className = "doom-control-command-row";
      const commands = [
        ["Status", "doom.status"],
        ["Phase", "doom.phase.check"],
        ["Autoplay", "doom.autoplay toggle"],
        ["Manual", "doom.autoplay manual-move toggle"],
        ["Sense", "doom.autoplay sense-only toggle"],
        ["Model", "model.status"],
        ["Exports", "wasm.exports"],
        ["Copy", "copy.logs"],
        ["Clear", "clear"]
      ];
      for (const [label, command] of commands) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.command = command;
        button.textContent = label;
        commandRow.appendChild(button);
      }

      const keypad = document.createElement("div");
      keypad.className = "doom-control-keypad";
      const keys = [
        ["Forward", "forward"],
        ["Back", "back"],
        ["Left", "left"],
        ["Right", "right"],
        ["Use", "use"],
        ["Fire", "fire"],
        ["Run", "run"],
        ["Strafe", "strafe"]
      ];
      for (const [label, key] of keys) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.doomKey = key;
        button.textContent = label;
        keypad.appendChild(button);
      }

      grid.appendChild(stateWrap);
      grid.appendChild(commandRow);
      grid.appendChild(keypad);
      if (doomControllerDebugLog) {
        doomControllerDebugLog.classList.add("doom-control-panel-debug-log");
        grid.appendChild(doomControllerDebugLog);
      }
      doomController.replaceChildren(grid);
      ensureDoomDebugLogHeader();
      renderControllerDebugLog();
    }

    function ensureDoomDebugLogHeader() {
      if (!doomControllerDebugLog || doomControllerDebugLog.dataset.headerRestored === "true") {
        return;
      }

      doomControllerDebugLog.dataset.headerRestored = "true";
      const existingHeader = doomControllerDebugLog.querySelector(".doom-controller-debug-log-head");
      if (existingHeader) {
        let title = existingHeader.querySelector(".doom-debug-log-title")
          || existingHeader.querySelector("span")
          || existingHeader.firstElementChild;
        if (!title) {
          title = document.createElement("div");
          existingHeader.insertBefore(title, existingHeader.firstChild);
        }
        title.classList.add("doom-debug-log-title");
        title.textContent = "Doom Debug Log";

        doomDebugLogLimitLabel = existingHeader.querySelector("[data-debug-log-limit-label]");
        if (!doomDebugLogLimitLabel) {
          doomDebugLogLimitLabel = document.createElement("div");
          doomDebugLogLimitLabel.className = "doom-debug-log-limit";
          doomDebugLogLimitLabel.dataset.debugLogLimitLabel = "true";
          doomDebugLogLimitLabel.textContent = `SEQ(${controllerDebugLogLimit})`;
          const filterAnchor = existingHeader.querySelector(".doom-controller-debug-filters, .doom-debug-log-filters");
          existingHeader.insertBefore(doomDebugLogLimitLabel, filterAnchor || null);
        }

        ensureDoomDebugLogFilterButton(
          existingHeader.querySelector(".doom-controller-debug-filters, .doom-debug-log-filters"),
          "action",
          "Act"
        );
        doomControllerDebugFilters = Array.from(document.querySelectorAll("[data-debug-log-filter]"));
        return;
      }

      const existingFilterRow = doomControllerDebugLog.querySelector(".debug-row");
      const header = document.createElement("div");
      header.className = "doom-controller-debug-log-head";
      const title = document.createElement("div");
      title.className = "doom-debug-log-title";
      title.textContent = "Doom Debug Log";
      doomDebugLogLimitLabel = document.createElement("div");
      doomDebugLogLimitLabel.className = "doom-debug-log-limit";
      doomDebugLogLimitLabel.dataset.debugLogLimitLabel = "true";
      doomDebugLogLimitLabel.textContent = `SEQ(${controllerDebugLogLimit})`;
      const filters = document.createElement("div");
      filters.className = "doom-debug-log-filters";
      if (existingFilterRow) {
        for (const button of Array.from(existingFilterRow.querySelectorAll("button[data-debug-log-filter]"))) {
          filters.appendChild(button);
        }
        existingFilterRow.remove();
      }
      ensureDoomDebugLogFilterButton(filters, "action", "Act");

      header.appendChild(title);
      header.appendChild(doomDebugLogLimitLabel);
      header.appendChild(filters);
      doomControllerDebugLog.insertBefore(header, doomControllerDebugLog.firstChild);
      doomControllerDebugFilters = Array.from(document.querySelectorAll("[data-debug-log-filter]"));
    }

    function ensureDoomDebugLogFilterButton(container, filter, label) {
      if (!container) {
        return null;
      }

      const normalized = normalizeControllerDebugCategory(filter);
      const existing = Array.from(container.querySelectorAll("button[data-debug-log-filter]"))
        .find(button => normalizeControllerDebugCategory(button.dataset.debugLogFilter || "") === normalized);
      if (existing) {
        return existing;
      }

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.debugLogFilter = normalized;
      button.setAttribute("aria-pressed", "false");
      button.textContent = label;
      container.appendChild(button);
      return button;
    }

    function resolveDoomEnemyCue(autoplay = {}, noesis = {}) {
      const resolver = self.AIKernelDoomPipelinePanel?.resolveEnemyCue;
      if (typeof resolver === "function") {
        const cue = resolver(autoplay);
        if (cue) {
          return cue;
        }
      }

      const overlay = autoplay.debugOverlay || autoplay.DebugOverlay || autoplay.autoplayState?.debugOverlay || {};
      const circle = overlay.enemyCircle || overlay.EnemyCircle || null;
      const actualFiring = Boolean(autoplay.action?.fire || autoplay.currentAction?.fire);
      if (circle && typeof circle === "object") {
        const confidence = Math.max(0, Math.min(1, Number(circle.confidence ?? circle.Confidence ?? 0) || 0));
        const active = Boolean(circle.active ?? circle.Active) || confidence >= 0.18;
        const type = String(circle.type || circle.Type || "visual").toLowerCase();
        const yaw = Number(circle.yaw ?? circle.Yaw ?? 0);
        const typeLabel = type === "av" ? "A/V" : labelize(type);
        return {
          active,
          type,
          typeLabel,
          yaw: Number.isFinite(yaw) ? yaw : 0,
          direction: circle.direction || circle.Direction || "front",
          confidence,
          visualConfidence: Math.max(0, Math.min(1, Number(circle.visualConfidence ?? circle.VisualConfidence ?? 0) || 0)),
          audioConfidence: Math.max(0, Math.min(1, Number(circle.audioConfidence ?? circle.AudioConfidence ?? 0) || 0)),
          text: active ? `${typeLabel}=${confidence.toFixed(2)} yaw=${Number.isFinite(yaw) ? Math.round(yaw) : 0}` : "calm",
          short: active ? `${typeLabel} ${Number.isFinite(yaw) ? Math.round(yaw) : 0}deg ${confidence.toFixed(2)}` : "calm"
        };
      }

      if ((autoplay.debugOverlay || autoplay.DebugOverlay || autoplay.autoplayState?.debugOverlay) && !actualFiring) {
        return {
          active: false,
          type: "none",
          typeLabel: "None",
          yaw: 0,
          direction: "none",
          confidence: 0,
          visualConfidence: 0,
          audioConfidence: 0,
          text: "calm",
          short: "calm"
        };
      }

      const events = noesis.phainesisEvents || noesis.PhainesisEvents || {};
      const visual = Math.max(0, Math.min(1, Number(autoplay.enemyConfidence ?? autoplay.visualEnemyConfidence ?? 0) || 0));
      const audio = Math.max(0, Math.min(1, Number(autoplay.audioEnemyConfidence ?? events.enemyPresence ?? events.EnemyPresence ?? 0) || 0));
      const confidence = Math.max(visual, audio);
      const yaw = Number(autoplay.enemyCombatYaw ?? autoplay.visualEnemyYaw ?? 0);
      const type = audio >= 0.24 && visual >= 0.35 ? "av" : (audio >= visual ? "audio" : "visual");
      const typeLabel = type === "av" ? "A/V" : labelize(type);
      const active = confidence >= 0.18 || actualFiring;
      return {
        active,
        type,
        typeLabel,
        yaw: Number.isFinite(yaw) ? yaw : 0,
        direction: autoplay.audioEnemyDirection || autoplay.enemyTurn || "front",
        confidence,
        visualConfidence: visual,
        audioConfidence: audio,
        text: active ? `vis=${visual.toFixed(2)} aud=${audio.toFixed(2)} yaw=${Number.isFinite(yaw) ? Math.round(yaw) : 0}` : "calm",
        short: active ? `${typeLabel} ${Number.isFinite(yaw) ? Math.round(yaw) : 0}deg ${confidence.toFixed(2)}` : "calm"
      };
    }

    function updateDoomSidePipelinePanel(status = doomRuntime?.status?.() || {}) {
      if (!doomPipelineSideGrid) {
        return;
      }

      const autoplay = status?.autoplay || {};
      const pipeline = autoplay.pipelineState || autoplay.PipelineState || null;
      const aisthesis = pipeline?.aisthesis || pipeline?.Aisthesis || {};
      const sensorReadings = aisthesis.sensorReadings || aisthesis.SensorReadings || {};
      const route = aisthesis.routePlan || aisthesis.RoutePlan || {};
      const noesis = pipeline?.noesis || pipeline?.Noesis || {};
      const krisis = pipeline?.krisis || pipeline?.Krisis || {};
      const kinesis = pipeline?.kinesis || pipeline?.Kinesis || {};
      const topology = noesis.topology || noesis.Topology || {};
      const kairos = krisis.kairos || krisis.Kairos || {};
      const zoe = kinesis.zoe || kinesis.Zoe || {};
      const action = autoplay.action || autoplay.currentAction || {};
      const health = Number(zoe.health ?? zoe.Health ?? autoplay.healthEstimatedPercent ?? autoplay.healthSensor?.value ?? autoplay.healthSensor?.health ?? 100);
      const lethalRisk = Number(zoe.lethalRisk ?? zoe.LethalRisk ?? autoplay.lethalRisk ?? 0);
      const zoeVetoed = Boolean(zoe.vetoed || zoe.Vetoed || autoplay.zoeVetoed);
      const zoeWarning = Boolean(zoe.warning || zoe.Warning || zoe.lowHealth || zoe.LowHealth) || lethalRisk >= 0.50 || health < Number(zoe.healthThreshold ?? zoe.HealthThreshold ?? 50);
      const enemyCue = resolveDoomEnemyCue(autoplay, noesis);
      const bridgeHazard = Number(autoplay.bridgeGreenHazard ?? autoplay.milestones?.bridgeGreenCenter ?? 0);
      const axis = String(kairos.selectedAxis || kairos.SelectedAxis || autoplay.kairosPriorityAxis?.selectedAxis || "monitor").toUpperCase();
      const cards = [
        {
          key: "aisthesis",
          title: "Aisthesis",
          body: [
            `route=${labelize(route.currentRoute || route.CurrentRoute || autoplay.autoplayState?.currentRoute || "none")}`,
            `mode=${labelize(route.routeMode || route.RouteMode || autoplay.autoplayState?.routeMode || "none")}`,
            `conf=${Number(route.routeConfidence ?? route.RouteConfidence ?? autoplay.routeConfidence ?? 0).toFixed(2)}`,
            `visual=${Number(sensorReadings.visual ?? sensorReadings.Visual ?? 0).toFixed(2)} movement=${Number(sensorReadings.movement ?? sensorReadings.Movement ?? 0).toFixed(2)}`,
            `bridge=${Number(autoplay.bridgeConfidence ?? 0).toFixed(2)} poison=${bridgeHazard.toFixed(2)}`
          ].join("\n")
        },
        {
          key: "noesis",
          title: "Noesis",
          body: [
            `events=${Array.isArray(noesis.eventLabels || noesis.EventLabels) ? (noesis.eventLabels || noesis.EventLabels).slice(0, 3).map(labelize).join(" > ") : "none"}`,
            `wall=${Number(topology.wallDistanceNormalized ?? topology.WallDistanceNormalized ?? 0).toFixed(2)}`,
            `barrel=${Number(topology.barrelZoneEvidence ?? topology.BarrelZoneEvidence ?? 0).toFixed(2)}`,
            `align=${Number(topology.centerCorridorAlignment ?? topology.CenterCorridorAlignment ?? 0).toFixed(2)}`
          ].join("\n")
        },
        {
          key: "krisis",
          title: "Krisis",
          body: [
            `axis=${axis}`,
            `L=${Number(kairos.logos ?? kairos.Logos ?? 0).toFixed(2)} P=${Number(kairos.pathos ?? kairos.Pathos ?? 0).toFixed(2)} E=${Number(kairos.ethos ?? kairos.Ethos ?? 0).toFixed(2)}`,
            `loop=${labelize(route.routeLoopKind || route.RouteLoopKind || autoplay.autoplayState?.routeLoopKind || "none")}`,
            `abort=${route.routeAbortHint || route.RouteAbortHint || autoplay.routeAbortHint || "none"}`,
            `combat=${enemyCue.text}`
          ].join("\n")
        },
        {
          key: "kinesis",
          title: "Kinesis",
          zoe: zoeVetoed,
          warning: !zoeVetoed && zoeWarning,
          body: [
            `action=${action.move || "none"}/${action.turn || "none"} use=${Boolean(action.use)} fire=${Boolean(action.fire)}`,
            `repeat=${autoplay.actionRepeatFrames || autoplay.repeatActionFrames || 0} turn=${autoplay.repeatTurnFrames || 0}`,
            `useCd=${autoplay.useCooldown || kinesis.usePulseCooldownFrames || kinesis.UsePulseCooldownFrames || 0}`,
            `hp=${Number.isFinite(health) ? Math.round(health) : 100} zoe=${zoeVetoed ? "VETO" : (zoeWarning ? "warn" : "clear")} risk=${lethalRisk.toFixed(2)}`,
            `enemy=${enemyCue.short}`
          ].join("\n")
        }
      ];

      const fragment = document.createDocumentFragment();
      for (const card of cards) {
        const node = document.createElement("section");
        node.className = `doom-side-pipeline-card is-${card.key}${card.zoe ? " is-zoe" : (card.warning ? " is-zoe-warning" : "")}`;
        const title = document.createElement("h4");
        title.textContent = card.title;
        const body = document.createElement("pre");
        body.textContent = card.body;
        node.appendChild(title);
        node.appendChild(body);
        fragment.appendChild(node);
      }

      doomPipelineSideGrid.replaceChildren(fragment);
    }

    function updateDoomDetectionSummary(status = {}, gpuHudActive = false) {
      const panel = ensureDoomDetectionSummaryPanel();
      if (!panel) {
        return;
      }

      const autoplay = status?.autoplay || {};
      const milestones = autoplay.milestones || {};
      const heatmap = Array.isArray(milestones.firstDoorVision9x9Heatmap)
        ? milestones.firstDoorVision9x9Heatmap
        : [];
      const heatMax = heatmap.reduce((max, value) => Math.max(max, Number(value) || 0), 0);
      const box = milestones.firstDoorVision9x9Box || {};
      const route = autoplay.autoplayState || {};
      const routeName = route.currentRoute || route.CurrentRoute || autoplay.currentRoute || "none";
      const routeMode = route.routeMode || route.RouteMode || autoplay.routeMode || "none";
      const routeConfidence = Number(route.routeConfidence ?? route.RouteConfidence ?? autoplay.routeConfidence ?? 0);
      const pipeline = autoplay.pipelineState || autoplay.PipelineState || {};
      const noesis = pipeline.noesis || pipeline.Noesis || {};
      const enemyCue = resolveDoomEnemyCue(autoplay, noesis);
      const rows = [
        {
          key: "overlay",
          label: "Overlay",
          value: doomDebugOverlayEnabled ? `${gpuHudActive ? "GPU" : "DOM"} HUD / game screen` : "Off",
          tone: doomDebugOverlayEnabled ? "vision" : ""
        },
        {
          key: "vision",
          label: "Vision",
          value: `heat=${heatMax.toFixed(2)} cells=${heatmap.filter(value => Number(value) >= 0.08).length}`,
          tone: "vision"
        },
        {
          key: "door",
          label: "Door",
          value: `box=${Number(box.score || 0).toFixed(2)} use=${Number(milestones.firstDoorUse3x3Score || 0).toFixed(2)} red=${Number(box.redScore || 0).toFixed(2)}`,
          tone: "door"
        },
        {
          key: "combat",
          label: "Combat",
          value: enemyCue.active ? enemyCue.text : "calm",
          tone: enemyCue.active ? "danger" : ""
        },
        {
          key: "route",
          label: "Route",
          value: `${labelize(routeName)} / ${labelize(routeMode)} ${routeConfidence.toFixed(2)}`,
          tone: ""
        }
      ];

      const grid = document.createElement("div");
      grid.className = "doom-detection-summary-grid";
      for (const row of rows) {
        const node = document.createElement("div");
        node.className = `doom-detection-summary-row ${row.tone ? `is-${row.tone}` : ""}`.trim();
        const label = document.createElement("strong");
        label.textContent = row.label;
        const value = document.createElement("span");
        value.textContent = row.value;
        node.append(label, value);
        grid.appendChild(node);
      }

      panel.replaceChildren(grid);
    }

    function updateDoomObjectiveStatusPanel(status = {}) {
      if (!doomRuntimePanel) {
        return;
      }

      const options = {
        resolvers: {
          labelize,
          resolveTelosObjective,
          resolvePrimaryObjective,
          resolvePriorityAction
        }
      };
      const panel = self.AIKernelDoomObjectiveStatusPanel;
      if (typeof panel?.renderObjectiveStatusPanel === "function") {
        panel.renderObjectiveStatusPanel(doomRuntimePanel, status, options);
        return;
      }

      doomRuntimePanel.textContent = "Objective status panel loading";
      loadDoomObjectiveStatusPanelScript()?.then(loaded => {
        if (typeof loaded?.renderObjectiveStatusPanel === "function") {
          loaded.renderObjectiveStatusPanel(doomRuntimePanel, status, options);
        }
      });
    }

    const FALLBACK_DISPLAY_LABELS = {
      "find-corridor-to-first-door": "Find Door Corridor",
      "locate-first-door-corridor": "Lock Door Corridor",
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
    };

    function labelize(value) {
      const formatter = self.AIKernelDoomGoalPanel?.labelize;
      if (typeof formatter === "function") {
        return formatter(value);
      }

      const key = String(value || "none");
      if (FALLBACK_DISPLAY_LABELS[key]) {
        return FALLBACK_DISPLAY_LABELS[key];
      }

      return key
        .replace(/[-_]+/g, " ")
        .replace(/\b\w/g, letter => letter.toUpperCase());
    }

    function resolveGoalPanelValue(name, fallback, autoplay) {
      const resolver = self.AIKernelDoomGoalPanel?.[name];
      return typeof resolver === "function" ? resolver(autoplay) : fallback(autoplay);
    }

    function fallbackPrimaryObjective(autoplay) {
      const milestones = autoplay?.milestones || {};
      const objective = String(autoplay?.objective || "");
      if (!autoplay?.enabled) {
        return "Idle";
      }

      if (autoplay.healthLikelyDead || autoplay.healthSensor?.retryRequested || autoplay.retryDispatch?.active) {
        return "Recover From Death";
      }

      if (objective === "press-exit-switch" || milestones.finalRoomEntered || autoplay.controlPipeline === "ExitRoom") {
        return "Press Exit Switch";
      }

      if (objective === "engage-front-enemy"
        || objective === "secure-central-hall"
        || objective === "cross-bridge"
        || objective === "reach-bridge"
        || objective === "reach-central-hall"
        || objective === "reach-final-room"
        || objective === "level-clear") {
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

    function resolvePrimaryObjective(autoplay) {
      return resolveGoalPanelValue("resolvePrimaryObjective", fallbackPrimaryObjective, autoplay);
    }

    function fallbackTelosObjective(autoplay) {
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

    function resolveTelosObjective(autoplay) {
      return resolveGoalPanelValue("resolveTelosObjective", fallbackTelosObjective, autoplay);
    }

    function fallbackKairosSignal(autoplay) {
      if (autoplay?.retryDispatch?.active) {
        return "Kairos: Retry";
      }

      if ((autoplay?.firstDoorUseLatchFrames || 0) > 0) {
        return `Kairos: Use Latch ${autoplay.firstDoorUseLatchFrames}`;
      }

      if ((autoplay?.useCooldown || 0) > 0) {
        return `Kairos: Use Cooldown ${autoplay.useCooldown}`;
      }

      const phainomenon = autoplay?.phainomenon || autoplay?.nousDetectorResult;
      return phainomenon?.sensorRecovery?.needed ? "Kairos: Recovery" : "";
    }

    function resolveKairosSignal(autoplay) {
      return resolveGoalPanelValue("resolveKairosSignal", fallbackKairosSignal, autoplay);
    }

    function fallbackSubObjectives(autoplay) {
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

    function resolveSubObjectives(autoplay) {
      return resolveGoalPanelValue("resolveSubObjectives", fallbackSubObjectives, autoplay);
    }

    function fallbackPriorityPrefix(autoplay) {
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

    function resolvePriorityPrefix(autoplay) {
      return resolveGoalPanelValue("resolvePriorityPrefix", fallbackPriorityPrefix, autoplay);
    }

    function fallbackPriorityAction(autoplay) {
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

    function resolvePriorityAction(autoplay) {
      return resolveGoalPanelValue("resolvePriorityAction", fallbackPriorityAction, autoplay);
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
      latestRuntimeStatus = status || latestRuntimeStatus;
      refreshDoomDebugRuntimeBridge(reason);
      loadDoomSensorPanelScript();
      loadDoomGpuPathStatusScript();
      loadDoomRuntimeFormatScript();
      loadDoomPipelinePanelScript();
      loadDoomGoalPanelScript();
      loadDoomDebugOverlayScript();
      runtimeStatusFlow.queue(attachGpuHudStatus(status), reason, {
        light: syncRuntimeStatusLight,
        update: updateRuntimeStatus
      });
    }

    function attachGpuHudStatus(status) {
      if (!status || status.gpuHud || status.GpuHud) {
        return status;
      }

      const latest = doomRuntime?.status?.();
      const gpuHud = latest?.gpuHud || latest?.GpuHud || null;
      if (!gpuHud) {
        return status;
      }

      const autoplay = status.autoplay || {};
      const latestAutoplay = latest?.autoplay || {};
      return Object.assign({}, status, {
        gpuHud,
        debugOverlay: status.debugOverlay || latest.debugOverlay || null,
        autoplay: Object.assign({}, autoplay, {
          gpuHud: autoplay.gpuHud || latestAutoplay.gpuHud || gpuHud,
          debugOverlay: autoplay.debugOverlay || latestAutoplay.debugOverlay || latest.debugOverlay || status.debugOverlay || null
        })
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

    function controllerDebugActionEntryFromStatus(status, reason = "status") {
      return requireControllerDebugLogAdapter("actionEntryFromStatus")(status, reason);
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
      doomDebugLogLimitLabel = doomDebugLogLimitLabel
        || doomControllerDebugLog.querySelector("[data-debug-log-limit-label]");
      if (doomDebugLogLimitLabel) {
        doomDebugLogLimitLabel.textContent = `SEQ(${limit})`;
      }
      const entries = controllerDebugLogEntries
        .filter(entry => controllerDebugEntryMatches(entry, controllerDebugLogFilter))
        .slice(-limit);
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
          label.textContent = Number.isFinite(Number(entry.sequence))
            ? `#${String(entry.sequence).slice(-2).padStart(2, "0")}`
            : controllerDebugCategoryGlyph(entry);
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
      doomControllerDebugLogList.scrollTop = doomControllerDebugLogList.scrollHeight;
      window.AIKernelDoomLastControllerDebugLog = getControllerDebugLogEntries(controllerDebugLogLimit);
    }

    function getControllerDebugLogEntries(limit = controllerDebugLogLimit, filter = controllerDebugLogFilter) {
      const count = Math.max(1, Math.min(100, Number(limit) || resolveControllerDebugLogLimit()));
      return controllerDebugLogEntries
        .filter(entry => controllerDebugEntryMatches(entry, filter || "all"))
        .slice(-count)
        .map(entry => Object.assign({}, entry));
    }

    function pushControllerDebugLog(entry, options = {}) {
      const normalized = normalizeControllerDebugEntry(entry, options.category || "control");
      normalized.sequence = Number.isFinite(Number(normalized.sequence))
        ? Number(normalized.sequence)
        : ++controllerDebugLogSequence;
      const signature = `${normalized.category}|${normalized.label}|${normalized.message}|${normalized.value}`;
      if (options.dedupe !== false && controllerDebugLogSignatureByCategory.get(normalized.category) === signature) {
        return null;
      }

      controllerDebugLogSignatureByCategory.set(normalized.category, signature);
      controllerDebugLogEntries.push(normalized);
      const maxEntries = Math.max(12, Math.min(320, Number(options.maxEntries) || 160));
      if (controllerDebugLogEntries.length > maxEntries) {
        controllerDebugLogEntries.splice(0, controllerDebugLogEntries.length - maxEntries);
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
      for (let index = 0; index < values.length; index += 1) {
        const normalized = normalizeControllerDebugEntry(values[index], options.category || "control");
        normalized.sequence = Number.isFinite(Number(normalized.sequence))
          ? Number(normalized.sequence)
          : ++controllerDebugLogSequence;
        controllerDebugLogEntries.push(normalized);
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
      controllerDebugLogSequence = 0;
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
      pushControllerDebugLog(controllerDebugActionEntryFromStatus(status, reason), {
        dedupe: false,
        autoLimit: true,
        maxEntries: 180
      });
    }

    function syncRuntimeStatusLight(status, reason = "status") {
      latestRuntimeStatus = status || latestRuntimeStatus;
      refreshDoomDebugRuntimeBridge(reason);
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
      syncToposDetailToggle();
      syncAudioPlaybackToggle(status);
      syncDetectionToggleButtons(status);
      syncControllerDebugLog(status, reason);
      updateDoomSidePipelinePanel(status);
      updateDoomObjectiveStatusPanel(status);
      ensureDoomSpatialHud();
      ensureDoomGoalHud();
      ensureDoomToposHud();
      updateDoomSpatialHud(status);
      updateDoomGoalHud(status);
      updateDoomToposHud(status);
      renderDoomDebugOverlay(status);
      syncDoomLayoutCardVisibility();
      const control = status?.hudFlowControl || {};
      const fps = Number.isFinite(status?.fps) ? Number(status.fps).toFixed(1) : "0.0";
      doomFps.textContent = `320x200 paletted framebuffer; fps=${fps}; hud=${control.mode || "adaptive"}; drop=${runtimeStatusFlow.snapshot().droppedFrames}; auto=${status?.autoplay?.enabled ? "on" : "off"}`;
    }

    function updateRuntimeStatus(status, reason = "status") {
      latestRuntimeStatus = status || latestRuntimeStatus;
      refreshDoomDebugRuntimeBridge(reason);
      renderDownloadProgress(status?.downloadProgress, status, reason);
      if (!setDoomRuntimeUiVisibility(status)) {
        lastRuntimeStatus = "";
        lastObjectiveStatus = "";
        return;
      }

      const runtimeFormatter = self.AIKernelDoomRuntimeFormat;
      if (typeof runtimeFormatter?.formatRuntimeStatus === "function") {
        const formatted = runtimeFormatter.formatRuntimeStatus(status, {
          droppedFrames: runtimeStatusFlow.snapshot().droppedFrames
        });
        runtimeStatus.innerHTML = formatted.html;
        doomFps.textContent = formatted.fpsText;
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
        updateDoomSidePipelinePanel(status);
        updateDoomObjectiveStatusPanel(status);
        syncDoomLayoutCardVisibility();

        lastObjectiveStatus = formatted.objectiveText || "none";
        if (formatted.text !== lastRuntimeStatus && ["stopped", "failed"].includes(reason)) {
          const level = status.state === "failed" ? "log-fail" : "log-info";
          appendConsoleLine("[STATE]", level, formatted.text);
        }
        lastRuntimeStatus = formatted.text;
        return;
      }

      loadDoomRuntimeFormatScript();

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
      const phainesisText = Array.isArray(autoplay.activeDetections) && autoplay.activeDetections.length > 0
        ? autoplay.activeDetections.join(",")
        : "none";
      const semantic = autoplay.semanticMemory || {};
      const semanticText = `${semantic.phase || pipelineText}/${semantic.objective || objectiveText}/d${semantic.firstDoor?.doorConfidence ?? 0}/c${semantic.firstDoor?.corridorConfidence ?? 0}/b${semantic.bridge?.confidence ?? 0}/f${semantic.finalRoom?.confidence ?? 0}`;
      const strategyText = `${autoplay.strategyName || "unknown"}/${autoplay.strategyContext || "unknown"}/p${autoplay.strategyPriority || 0}`;
      const stageEvalText = Array.isArray(autoplay.stageEvaluations) && autoplay.stageEvaluations.length > 0
        ? autoplay.stageEvaluations.slice(0, 5).map(item => `${item.stageId || "?"}:${item.conditionMatched ? "T" : "f"}/${item.evidenceMatched ? "E" : "e"}`).join(",")
        : "none";
      const debugRoute = autoplay.debugRouteValues || {};
      const routeTextureText = debugRoute.routeTextureWallOcclusion ? "/tex!" : "";
      const routeEastText = debugRoute.eastWindowRecoverAnchor ? "/east!" : "";
      const routeMode = debugRoute.routeMode || autoplay.routeMode || autoplay.autoplayState?.routeMode || "";
      const routeModeText = routeMode ? `/mode=${routeMode}` : "";
      const routeLoopKind = debugRoute.routeLoopKind || autoplay.routeLoopKind || autoplay.autoplayState?.routeLoopKind || "none";
      const routeLoopExceeded = Boolean(debugRoute.routeLoopBudgetExceeded || autoplay.routeLoopBudgetExceeded || autoplay.autoplayState?.routeLoopBudgetExceeded);
      const routeLoopUsed = Math.max(Number(debugRoute.routePivotUsed || 0), Number(debugRoute.routeSlideUsed || 0), Number(debugRoute.routeBackoffUsed || 0), Number(debugRoute.routeRecoverUsed || 0));
      const routeLoopBudget = Math.max(Number(debugRoute.routePivotBudget || 0), Number(debugRoute.routeSlideBudget || 0), Number(debugRoute.routeBackoffBudget || 0), Number(debugRoute.routeRecoverBudget || 0));
      const routeLoopText = routeLoopKind !== "none" || routeLoopExceeded ? `/loop=${routeLoopKind}${routeLoopExceeded ? "!" : ""}:${Math.round(routeLoopUsed)}/${Math.round(routeLoopBudget)}` : "";
      const routeDebugText = `ctx=${debugRoute.context || "?"}${routeModeText}/d${Number(debugRoute.depthSig || 0).toFixed(2)}/foot${Number(debugRoute.footObstacleScore || 0).toFixed(2)}${debugRoute.routeFootObstacle ? "!" : ""}/mo${Number(debugRoute.motionObstacleScore || 0).toFixed(2)}${routeTextureText}${routeEastText}/gap${Number(debugRoute.spawnCorridorGapScore || 0).toFixed(2)}/sec${Number(debugRoute.spawnSecretDoorScore || 0).toFixed(2)}/lm${Number(debugRoute.spawnLandmarkRouteEvidence || 0).toFixed(2)}${routeLoopText}`;
      const milestones = autoplay.milestones || {};
      const mapText = `map=${milestones.mapSectorId || "unknown"}/${milestones.mapDoorSectorMatch ? "door" : "-"}${milestones.mapDarkSectorMatch ? "+dark" : ""}${milestones.mapEnemyZoneMatch ? "+enemy" : ""}`;
      const alertText = `alert=${milestones.enemyAlertFrames || 0}/${milestones.enemyAlertTurn || "none"}/${milestones.enemyAlertCluster || "none"}/${Number(milestones.enemyAlertDepth ?? 1).toFixed(2)}/${Number(milestones.enemyAlertPeakConfidence || 0).toFixed(2)}`;
      const progressText = `hall=${milestones.centralHallEntered ? "yes" : "no"}/${milestones.centralHallFrames || 0}; stairs=${milestones.stairsEntered ? "yes" : "no"}/${milestones.stairsCandidateFrames || 0}; final=${milestones.finalRoomEntered ? "yes" : "no"}/${milestones.finalRoomCandidateFrames || 0}`;
      const routeText = `blue=${Number(milestones.blueFloorScore || 0).toFixed(2)}; court=${Number(milestones.courtyardScore || 0).toFixed(2)}/${milestones.courtyardTurn || "none"}/${milestones.courtyardRescueMode || "none"}/${milestones.courtyardRescueFrames || 0}; secret=${Number(milestones.spawnSecretDoorScore || 0).toFixed(2)}/${milestones.spawnSecretDoorTurn || "none"}; stair=${Number(milestones.spawnWestStairScore || 0).toFixed(2)}/${milestones.spawnWestStairTurn || "none"}; gap=${Number(milestones.spawnCorridorGapScore || 0).toFixed(2)}/${milestones.spawnCorridorGapTurn || "none"}/${milestones.spawnCorridorGapFrames || 0}/yaw${Number(autoplay.routeFallbackYaw || 0).toFixed(0)}/${autoplay.spawnCorridorGapActionTurn || "none"}; bridge=${Number(milestones.bridgeBrownScore || 0).toFixed(2)}/${Number(milestones.bridgeGreenLeft || 0).toFixed(2)}-${Number(milestones.bridgeGreenCenter || 0).toFixed(2)}-${Number(milestones.bridgeGreenRight || 0).toFixed(2)}/${milestones.bridgeLaneTurn || "none"}/door${Number(milestones.bridgeDoorScore || 0).toFixed(2)}; corridor=${milestones.firstDoorCorridorLocated ? "yes" : "no"}/${milestones.firstDoorCorridorFrames || 0}/${Number(milestones.firstDoorCorridorSignature || 0).toFixed(2)}/v9${Number(milestones.firstDoorVision9x9Score || 0).toFixed(2)}/r${Number(milestones.firstDoorVision9x9RedScore || 0).toFixed(2)}; deadEnd=${milestones.firstDoorDeadEndTurnFrames || 0}; useSeen=${Boolean(milestones.firstDoorUseAttempted)}/${Number(milestones.firstDoorUseSignature || 0).toFixed(2)}/3x3${Number(milestones.firstDoorUse3x3Score || 0).toFixed(2)}/${milestones.firstDoorUse3x3Turn || "none"}`;
      const computerText = `computer=${milestones.computerRoomEntered ? "yes" : "no"}/${milestones.computerRoomFrames || 0}/${Number(milestones.computerRoomScore || 0).toFixed(2)}/${Number(milestones.computerBlueScore || 0).toFixed(2)}/${Number(milestones.computerRedLightScore || 0).toFixed(2)}/${Number(milestones.computerDarkPanelScore || 0).toFixed(2)}/${Number(milestones.computerPanelScore || 0).toFixed(2)}`;
      const milestoneText = `door=${milestones.doorOpened || 0}; dark=${milestones.darkZoneEntered ? "yes" : "no"}/${milestones.darkZoneFrames || 0}; darkArea=${Number(milestones.darkAreaScore || 0).toFixed(2)}; luma=${Number(milestones.gameplayLuma || 0).toFixed(1)}; ${computerText}; ${routeText}; ${mapText}; ${progressText}; enemy=${milestones.enemyDefeated || 0}; ${alertText}; bursts=${milestones.combatFireFrames || 0}; peak=${Number(milestones.enemyConfidencePeak || 0).toFixed(2)}; drop=${milestones.enemyDropFrames || 0}`;
      const ammoText = `${autoplay.ammoLikelyEmpty ? "empty" : "ok"}/${autoplay.ammoSignature || "000000000000000000000"}`;
      const healthValue = Number(autoplay.healthEstimatedPercent ?? autoplay.healthSensor?.value ?? autoplay.healthSensor?.health ?? 100);
      const healthText = `${autoplay.healthLikelyDead ? "dead" : "live"}/hp${Number.isFinite(healthValue) ? Math.round(healthValue) : 100}/z${Number(autoplay.healthZeroScore || 0).toFixed(2)}/c${autoplay.healthActiveColumns || 0}/a${autoplay.healthActiveCells || 0}/${autoplay.healthSignature || "000000000000000000000000"}`;
      const retryDispatch = autoplay.retryDispatch || {};
      const retryText = `${retryDispatch.active ? "active" : "idle"}/${retryDispatch.cooldownFrames || 0}/${retryDispatch.reason || "none"}`;
      const movement = autoplay.movementSensor || {};
      const audioSnapshot = autoplay.auditorySnapshot || status.audio || {};
      const audioEnergy = Math.max(Number(audioSnapshot.leftEnergy || 0), Number(audioSnapshot.rightEnergy || 0));
      const audioText = `${audioSnapshot.eventDetected ? "event" : "idle"}/${audioSnapshot.eventType || "none"}/${audioEnergy.toFixed(3)}/b${Number(audioSnapshot.lowEnergy || 0).toFixed(3)}-${Number(audioSnapshot.midEnergy || 0).toFixed(3)}-${Number(audioSnapshot.highEnergy || 0).toFixed(3)}`;
      const visualMotion = autoplay.visualMotion || {};
      const nous = autoplay.nousCarrier || {};
      const detector = autoplay.phainomenon || autoplay.nousDetectorResult || nous.cognitionHints?.phainomenon || nous.cognitionHints?.nousDetectorResult || {};
      const motionText = `${autoplay.motion9Signature || "000000000"}/${Number(autoplay.motion9Delta ?? 255).toFixed(2)}/f${Number(autoplay.motionForwardProgress || 0).toFixed(2)}/o${Number(autoplay.motionObstacleScore || 0).toFixed(2)}/t${Number(autoplay.motionTurnScore || 0).toFixed(2)}/e${Number(autoplay.motionEntranceScore || 0).toFixed(2)}/s${Number(autoplay.motionStallScore || 0).toFixed(2)}/${autoplay.motionIntent || "idle"}`;
      const footText = `${Number(autoplay.footObstacleScore || 0).toFixed(2)}/${Number(autoplay.priorFootObstacleScore || 0).toFixed(2)}/f${Number(autoplay.footObstacleFlickerScore || 0).toFixed(2)}/b${autoplay.footObstacleBounceFrames || 0}/d${Number(autoplay.footObstacleBandDelta || 0).toFixed(2)}`;
      const visualFlowText = `${Number(visualMotion.vectorX || 0).toFixed(2)}/${Number(visualMotion.vectorY || 0).toFixed(2)}/m${Number(visualMotion.magnitude || 0).toFixed(2)}/b${Number(visualMotion.baseMagnitude || 0).toFixed(2)}/lm${autoplay.compassLandmarks || 0}`;
      const nousText = `${nous.bonsaiTernary?.aisthesis || "neutral"}/${nous.bonsaiTernary?.kinesis || "neutral"}/${nous.bonsaiTernary?.phantasia || "neutral"}`;
      const phainesisEvidenceText = `loom=${detector.looming?.active ? detector.looming.direction || "active" : "-"}; dmg=${detector.damageLocalization?.active ? detector.damageLocalization.direction || "active" : "-"}; trap=${detector.trap?.active ? detector.trap.kind || "active" : "-"}; stuck=${detector.stuck?.active ? "yes" : "no"}; ent=${detector.explorationEntropy?.high ? "high" : "ok"}; item=${detector.itemBacktrack?.suggested ? detector.itemBacktrack.targetKind || "yes" : "-"}; rec=${detector.sensorRecovery?.needed ? detector.sensorRecovery.reason || "yes" : "-"}`;
      const action = autoplay.action || {};
      const actionText = `${action.move || "none"}/${action.turn || "none"}/use=${Boolean(action.use)}/fire=${Boolean(action.fire)}/run=${Boolean(action.run)}`;
      const autoplayText = `${autoplay.enabled ? "on" : "off"}/${autoplay.mode || "disabled"}${autoplay.manualMove ? "/manual-move" : ""}${autoplay.senseOnly ? "/sense-only" : ""}; pipeline=${pipelineText}; objective=${objectiveText}; action=${actionText}; phainesis=${phainesisText}; semantic=${semanticText}; strategy=${strategyText}; eval=${stageEvalText}; routeDbg=${routeDebugText}; vision=${autoplay.vision || "none"}; zeroCopy=${Boolean(autoplay.zeroCopy)}; safety=${autoplay.safetyReason || "none"}; mobility=${autoplay.mobilityMode || "none"}; move=${Number(movement.vectorX || 0).toFixed(2)}/${Number(movement.vectorY || 0).toFixed(2)}/${Number(movement.confidence || 0).toFixed(2)}; flow=${visualFlowText}; nous=${nousText}; phainesisEvidence=${phainesisEvidenceText}; wall=${autoplay.wallHugSide || "left"}; target=${targetConfidence}; enemy=${enemyText}; ammo=${ammoText}; health=${healthText}; retry=${retryText}; milestones=${milestoneText}; corner=${cornerSignal}; sig=${signatureText}; dict=${dictionaryText}; regions=${autoplay.regionSignature || "000000"}; regions9=${autoplay.region9Signature || "000000000"}; vision9x9=${String(autoplay.vision9x9Signature || "").slice(0, 18)}; motion9=${motionText}; foot=${footText}; depthSig=${autoplay.depthSignature || "0000"}; depth=${depthEstimate}; faceSig=${autoplay.faceSignature || "0000000000000000"}; sound=${Boolean(autoplay.soundCueActive)}; audio=${audioText}; stuck=${autoplay.stuckFrames || 0}; qStall=${autoplay.quantizedStallFrames || 0}; qDelta=${quantizedDelta}; rDelta=${regionDelta}; hudDelta=${hudDelta}; faceDelta=${faceDelta}; probe=${probe}; detach=${detach}; survey=${survey}; mapRush=${mapRush}; mapDoor=${mapDoor}; suppress=${autoplay.cornerSuppressFrames || 0}; repeat=${autoplay.repeatActionFrames || 0}; kRepeat=${autoplay.actionRepeatFrames || 0}; repeatTurn=${autoplay.repeatTurnFrames || 0}; recovery=${autoplay.recoveryFrames || 0}; loopEscape=${autoplay.loopEscapeFrames || 0}; useCooldown=${autoplay.useCooldown || 0}; useLatch=${autoplay.firstDoorUseLatchFrames || 0}/${autoplay.firstDoorUsePulsed ? "pulsed" : "armed"}; predictions=${autoplay.predictions || 0}; reuse=${autoplay.reused || 0}; latency=${Math.round(autoplay.latencyMs || 0)}ms`;
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
      updateDoomSidePipelinePanel(status);
      updateDoomObjectiveStatusPanel(status);
      syncDoomLayoutCardVisibility();

      lastObjectiveStatus = objectiveText;

      if (text !== lastRuntimeStatus && ["stopped", "failed"].includes(reason)) {
        const level = status.state === "failed" ? "log-fail" : "log-info";
        appendConsoleLine("[STATE]", level, text);
      }

      lastRuntimeStatus = text;
    }

    function renderDoomDebugOverlay(status) {
      if (!doomDebugOverlay) {
        return;
      }

      ensureDoomDebugOverlayHost();
      const gpuHudActive = syncGpuHudOverlay(status);
      const cpuRadarActive = shouldRenderCpuRadarHud(status, gpuHudActive);
      doomDebugOverlay.classList.toggle("is-visible", doomDebugOverlayEnabled || cpuRadarActive);
      if (!doomDebugOverlayEnabled) {
        doomDebugOverlay.replaceChildren();
        drawCpuRadarHud(status, gpuHudActive);
        updateDoomDetectionSummary(status, gpuHudActive);
        return;
      }

      doomDebugOverlay.classList.toggle("is-gpu-backed", gpuHudActive);
      doomDebugOverlay.dataset.cssOverlayMode = gpuHudActive ? "reduced" : "full";
      updateDoomDetectionSummary(status, gpuHudActive);

      const overlayRenderer = self.AIKernelDoomDebugOverlay;
      if (typeof overlayRenderer?.renderDebugOverlay === "function") {
        overlayRenderer.renderDebugOverlay(doomDebugOverlay, status, { detectionVisibility: doomDetectionVisibility, gpuBacked: gpuHudActive, gpuHud: status?.gpuHud || null });
        drawCpuRadarHud(status, gpuHudActive);
        return;
      }

      loadDoomDebugOverlayScript()?.then(panel => {
        if (typeof panel?.renderDebugOverlay === "function") {
          const latestStatus = doomRuntime?.status?.() || status;
          panel.renderDebugOverlay(doomDebugOverlay, latestStatus, { detectionVisibility: doomDetectionVisibility, gpuBacked: gpuHudActive, gpuHud: latestStatus?.gpuHud || null });
          drawCpuRadarHud(latestStatus, gpuHudActive);
        }
      });
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
      const runtimeGpuHud = status?.gpuHud || {};
      const runtimeCompositeActive = Boolean(runtimeGpuHud.hudCompositeActive || runtimeGpuHud.compositeActive);
      const provider = resolveWebGpuProvider();
      if (typeof provider?.setHudOverlayEnabled !== "function") {
        return runtimeCompositeActive;
      }

      const providerStatus = typeof provider.status === "function" ? provider.status() : {};
      const renderer = `${status?.renderer || ""} ${providerStatus?.backend || ""}`;
      const webGpuReady = Boolean(providerStatus?.rendererInitialized || providerStatus?.hudOverlayReady || providerStatus?.zeroCopy);
      const ready = Boolean(webGpuReady && providerStatus?.usingCpuFallback === false && /webgpu/i.test(renderer));
      const autoplayActive = Boolean(status?.autoplay?.enabled);
      provider.setHudOverlayEnabled(Boolean(ready && (doomDebugOverlayEnabled || autoplayActive)));
      const nextStatus = typeof provider.status === "function" ? provider.status() : providerStatus;
      return runtimeCompositeActive || Boolean(nextStatus?.hudCompositeActive || nextStatus?.hudOverlayActive || (ready && (doomDebugOverlayEnabled || autoplayActive) && nextStatus?.hudOverlayEnabled));
    }

    function firstFiniteNumber(values, fallback = 0) {
      for (const value of values) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          return numeric;
        }
      }

      return fallback;
    }

    function clampUnit(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return 0;
      }

      return Math.max(0, Math.min(1, numeric));
    }

    function normalizeRadarYaw(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return 0;
      }

      let yaw = numeric % 360;
      if (yaw > 180) {
        yaw -= 360;
      } else if (yaw < -180) {
        yaw += 360;
      }

      return yaw;
    }

    function directionToRadarYaw(direction, fallback = 0) {
      const text = String(direction || "").toLowerCase();
      if (text.includes("left")) {
        return -70;
      }

      if (text.includes("right")) {
        return 70;
      }

      if (text.includes("rear") || text.includes("back")) {
        return 180;
      }

      if (text.includes("front") || text.includes("center") || text.includes("forward")) {
        return 0;
      }

      return fallback;
    }

    function shouldRenderCpuRadarHud(status = {}, gpuHudActive = false) {
      if (gpuHudActive) {
        return false;
      }

      const mode = window.AIKernelDoomGpuMode || {};
      const gpuHud = status?.gpuHud || status?.autoplay?.gpuHud || {};
      const rendererText = `${status?.renderer || ""} ${status?.gpuDelegate || ""} ${gpuHud.providerBackend || ""}`;
      const cpuSelected = mode.useGpuRendering === false
        || mode.gpuPermanentlyDisabled === true
        || status?.useGpuRendering === false
        || status?.usingCpuFallback === true
        || gpuHud.providerUsingCpuFallback === true
        || gpuHud.providerGpuPermanentlyDisabled === true
        || /cpu/i.test(rendererText);
      const active = status?.state === "running" || status?.autoplay?.enabled || status?.loopActive;
      return Boolean(cpuSelected && active);
    }

    function ensureCpuRadarHudHost() {
      if (!doomDebugOverlay) {
        return null;
      }

      if (doomCpuRadarHud && doomCpuRadarHud.isConnected && doomCpuRadarCanvas) {
        return doomCpuRadarHud;
      }

      doomCpuRadarHud = document.createElement("div");
      doomCpuRadarHud.className = "doom-cpu-radar-hud";
      doomCpuRadarHud.dataset.renderer = "cpu-canvas";

      doomCpuRadarCanvas = document.createElement("canvas");
      doomCpuRadarCanvas.width = 160;
      doomCpuRadarCanvas.height = 160;
      doomCpuRadarCanvas.setAttribute("aria-label", "CPU fallback ego radar");
      doomCpuRadarHud.appendChild(doomCpuRadarCanvas);

      const caption = document.createElement("div");
      caption.className = "doom-cpu-radar-caption";
      caption.textContent = "CPU RADAR";
      doomCpuRadarHud.appendChild(caption);

      doomDebugOverlay.appendChild(doomCpuRadarHud);
      return doomCpuRadarHud;
    }

    function resolveCpuRadarPacket(status = {}) {
      const autoplay = status?.autoplay || {};
      const radar = autoplay.radarHud || autoplay.egoRadar || status.radarHud || status.egoRadar || {};
      const compass = autoplay.compassSensor || {};
      const action = autoplay.action || autoplay.currentAction || {};
      const move = String(action.move || action.Move || "").toLowerCase();
      const turn = String(action.turn || action.Turn || "").toLowerCase();
      const forwardFromAction = move === "forward" || action.forward || action.moveForward
        ? 1
        : (move === "back" || move === "backward" || action.back || action.moveBack ? -1 : 0);
      const turnFromAction = turn === "right" || action.right || action.turnRight
        ? 1
        : (turn === "left" || action.left || action.turnLeft ? -1 : 0);
      const audioYawFallback = directionToRadarYaw(autoplay.audioEnemyDirection, firstFiniteNumber([autoplay.enemyCombatYaw], 0));
      const visualYawFallback = firstFiniteNumber([autoplay.visualEnemyYaw, autoplay.enemyCombatYaw], 0);
      const mode = firstFiniteNumber([radar.mode, radar.Mode], 2);

      return {
        northAngleDeg: normalizeRadarYaw(firstFiniteNumber([radar.northAngleDeg, radar.NorthAngleDeg, compass.heading, compass.Heading], 0)),
        confidence: clampUnit(firstFiniteNumber([radar.confidence, radar.Confidence, compass.confidence, compass.Confidence], 0)),
        usableAlpha: clampUnit(firstFiniteNumber([radar.usableAlpha, radar.UsableAlpha], radar.rawUsable === false ? 0 : 1)),
        kinesisForward: Math.max(-1, Math.min(1, firstFiniteNumber([radar.kinesisForward, radar.KinesisForward], forwardFromAction))),
        kinesisTurn: Math.max(-1, Math.min(1, firstFiniteNumber([radar.kinesisTurn, radar.KinesisTurn], turnFromAction))),
        mode,
        suppressedAlpha: clampUnit(firstFiniteNumber([radar.suppressedAlpha, radar.SuppressedAlpha], mode === 1 ? 1 : 0)),
        lostAlpha: clampUnit(firstFiniteNumber([radar.lostAlpha, radar.LostAlpha], mode === 0 ? 1 : 0)),
        flickerPhase: clampUnit(firstFiniteNumber([radar.flickerPhase, radar.FlickerPhase], 1)),
        enemyVisualYaw: normalizeRadarYaw(firstFiniteNumber([radar.enemyVisualYaw, radar.EnemyVisualYaw], visualYawFallback)),
        enemyVisualAlpha: clampUnit(firstFiniteNumber([radar.enemyVisualAlpha, radar.EnemyVisualAlpha], autoplay.visualEnemyVisible ? Math.max(autoplay.enemyConfidence || 0, 0.45) : autoplay.enemyConfidence || 0)),
        enemyAudioYaw: normalizeRadarYaw(firstFiniteNumber([radar.enemyAudioYaw, radar.EnemyAudioYaw], audioYawFallback)),
        enemyAudioAlpha: clampUnit(firstFiniteNumber([radar.enemyAudioAlpha, radar.EnemyAudioAlpha], autoplay.audioEnemyConfidence || 0)),
        enemySignalSuppressed: Boolean(radar.enemySignalSuppressed || radar.EnemySignalSuppressed),
        enemySignalLost: Boolean(radar.enemySignalLost || radar.EnemySignalLost)
      };
    }

    function radarPoint(center, radius, yawDeg, scale = 1) {
      const angle = Number(yawDeg || 0) * Math.PI / 180;
      return {
        x: center.x + Math.sin(angle) * radius * scale,
        y: center.y - Math.cos(angle) * radius * scale
      };
    }

    function drawCpuRadarCircle(ctx, point, radius, color, alpha, glow = 0) {
      const a = clampUnit(alpha);
      if (a <= 0.015) {
        return;
      }

      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = Math.max(1, radius * 0.28);
      if (glow > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
      }
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = Math.min(1, a * 0.85);
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius * 1.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function drawCpuRadarHud(status = {}, gpuHudActive = false) {
      if (!shouldRenderCpuRadarHud(status, gpuHudActive)) {
        doomCpuRadarHud?.remove?.();
        doomCpuRadarHud = null;
        doomCpuRadarCanvas = null;
        return false;
      }

      const host = ensureCpuRadarHudHost();
      const canvas = doomCpuRadarCanvas;
      const ctx = canvas?.getContext?.("2d");
      if (!host || !canvas || !ctx) {
        return false;
      }

      const cssSize = Math.max(82, Math.round(host.getBoundingClientRect().width || 128));
      const dpr = Math.max(1, Math.min(2, Number(window.devicePixelRatio || 1)));
      const pixelSize = Math.round(cssSize * dpr);
      if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
        canvas.width = pixelSize;
        canvas.height = pixelSize;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssSize, cssSize);

      const radar = resolveCpuRadarPacket(status);
      const center = { x: cssSize / 2, y: cssSize / 2 };
      const radius = cssSize * 0.42;
      const lost = radar.lostAlpha > 0.35 || radar.mode <= 0 || radar.confidence < 0.05;
      const suppressed = !lost && (radar.suppressedAlpha > 0.35 || radar.mode === 1);
      const theme = lost
        ? { main: "rgba(255,78,84,.88)", grid: "rgba(255,78,84,.28)", fill: "rgba(56,8,10,.16)" }
        : (suppressed
          ? { main: "rgba(255,178,48,.92)", grid: "rgba(255,178,48,.28)", fill: "rgba(42,28,4,.15)" }
          : { main: "rgba(34,235,255,.92)", grid: "rgba(34,235,255,.25)", fill: "rgba(0,30,38,.14)" });
      const confidenceAlpha = clampUnit(radar.confidence * (radar.confidence < 0.20 ? Math.max(0.30, radar.flickerPhase) : 1));

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = theme.fill;
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius * 1.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      for (const scale of [0.33, 0.66]) {
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius * scale, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(center.x, center.y - radius);
      ctx.lineTo(center.x, center.y + radius);
      ctx.moveTo(center.x - radius, center.y);
      ctx.lineTo(center.x + radius, center.y);
      ctx.stroke();
      ctx.strokeStyle = theme.main;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      const north = radarPoint(center, radius, radar.northAngleDeg, 1);
      ctx.save();
      ctx.globalAlpha = Math.max(0.18, confidenceAlpha);
      ctx.fillStyle = theme.main;
      ctx.shadowColor = theme.main;
      ctx.shadowBlur = 7 * confidenceAlpha;
      ctx.font = `900 ${Math.max(9, cssSize * 0.085)}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("▲", north.x, north.y);
      ctx.restore();

      const move = {
        x: center.x + radar.kinesisTurn * radius * 0.55,
        y: center.y - radar.kinesisForward * radius * 0.55
      };
      ctx.save();
      ctx.strokeStyle = "rgba(190,248,255,.75)";
      ctx.fillStyle = "rgba(190,248,255,.92)";
      ctx.lineWidth = Math.max(2, cssSize * 0.018);
      ctx.shadowColor = "rgba(64,220,255,.55)";
      ctx.shadowBlur = 7;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(move.x, move.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(move.x, move.y, Math.max(2.2, cssSize * 0.025), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const visual = radarPoint(center, radius, radar.enemyVisualYaw, 0.62);
      const audio = radarPoint(center, radius, radar.enemyAudioYaw, 0.88);
      if (radar.enemyVisualAlpha > 0.06 && radar.enemyAudioAlpha > 0.06) {
        ctx.save();
        ctx.globalAlpha = Math.min(radar.enemyVisualAlpha, radar.enemyAudioAlpha) * 0.82;
        ctx.strokeStyle = "rgba(64,255,146,.86)";
        ctx.lineWidth = Math.max(1, cssSize * 0.010);
        ctx.shadowColor = "rgba(64,255,146,.55)";
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.moveTo(visual.x, visual.y);
        ctx.lineTo(audio.x, audio.y);
        ctx.stroke();
        ctx.restore();
      }
      drawCpuRadarCircle(ctx, audio, Math.max(2.4, cssSize * 0.025), "rgba(255,186,64,.96)", radar.enemyAudioAlpha, 7);
      drawCpuRadarCircle(ctx, visual, Math.max(2.6, cssSize * 0.027), "rgba(255,78,88,.98)", radar.enemyVisualAlpha, 8);

      ctx.save();
      ctx.fillStyle = theme.main;
      ctx.globalAlpha = .88;
      ctx.font = `800 ${Math.max(6, cssSize * 0.047)}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("F", center.x, center.y - radius - 7);
      ctx.restore();
      return true;
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
      doomSpatialHud.style.cssText = "position:absolute;left:8px;top:8px;z-index:90;display:grid;grid-template-columns:24px minmax(78px,96px);grid-template-rows:auto auto;align-items:end;gap:4px 6px;max-width:138px;padding:5px 6px;border:1px solid rgba(80,255,160,.45);background:rgba(0,0,0,.22);color:#b9ffd4;font:10px ui-monospace,Consolas,monospace;pointer-events:none;";

      const leftGauge = document.createElement("div");
      leftGauge.style.cssText = "width:9px;height:38px;border:1px solid rgba(185,255,212,.55);display:flex;align-items:flex-end;background:rgba(20,40,30,.18);";
      doomAudioLeftFill = document.createElement("div");
      doomAudioLeftFill.style.cssText = "width:100%;height:100%;background:#6bff9b;transform:scaleY(0);transform-origin:bottom;";
      leftGauge.appendChild(doomAudioLeftFill);

      const rightGauge = document.createElement("div");
      rightGauge.style.cssText = "width:9px;height:38px;border:1px solid rgba(185,255,212,.55);display:flex;align-items:flex-end;background:rgba(20,40,30,.18);";
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
      doomSpatialEventIcon.style.cssText = "position:absolute;z-index:9;width:18px;height:18px;border-radius:50%;border:1px solid rgba(255,240,120,.95);background:rgba(255,80,40,.78);box-shadow:0 0 14px rgba(255,120,40,.8);transform:translate(-50%,-50%);pointer-events:none;";
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

    function fallbackSensorDescriptors() {
      return {
        visual: { label: "Visual", signal: "9x9 frame", panel: "aisthesis", stage: "primary" },
        audio: { label: "Audio", signal: "stereo energy", panel: "aisthesis", stage: "primary" },
        movement: { label: "Movement", signal: "motion vector", panel: "aisthesis", stage: "primary" },
        compass: { label: "Compass", signal: "heading vector", panel: "aisthesis", stage: "primary" },
        health: { label: "Health", signal: "life state", panel: "aisthesis", stage: "primary" },
        spatial: { label: "Spatial", signal: "Topos state", panel: "krisis", stage: "topos" },
        motor: { label: "Motor", signal: "input vector", panel: "kinesis", stage: "motion" }
      };
    }

    function fallbackDetectionDescriptors() {
      return {
        motion: { label: "Looming", signal: "flow / approach" },
        wall: { label: "Stuck", signal: "wall / trap" },
        health: { label: "HP Veto", signal: "life audit" },
        enemy: { label: "Enemy", signal: "enemy seen" },
        hud: { label: "Entropy", signal: "HUD / uncertainty" },
        computer: { label: "Item", signal: "backtrack / room" },
        objective: { label: "Objective", signal: "Telos route" },
        door: { label: "Door", signal: "open target" },
        spatial: { label: "Spatial", signal: "decision field" },
        foot: { label: "Collision", signal: "foot contact" }
      };
    }

    function fallbackSensorPanelLayout() {
      return [
        { key: "aisthesis", className: "is-aisthesis", title: "Aisthesis", subtitle: "Perception layer", stages: [{ key: "primary", title: "Primary sensors", items: [{ type: "sensor", key: "visual" }, { type: "sensor", key: "audio" }, { type: "sensor", key: "movement" }, { type: "sensor", key: "compass" }, { type: "detection", key: "foot" }, { type: "sensor", key: "health" }] }] },
        { key: "noesis", className: "is-noesis", title: "Noesis", subtitle: "Cognition layer", stages: [{ key: "phainesis", title: "Phainesis", items: [{ type: "detection", key: "motion" }, { type: "detection", key: "wall" }, { type: "detection", key: "enemy" }, { type: "detection", key: "hud" }, { type: "detection", key: "computer" }] }] },
        { key: "krisis", className: "is-krisis", title: "Krisis", subtitle: "Judgement layer", stages: [{ key: "topos", title: "Topos", items: [{ type: "sensor", key: "spatial" }, { type: "detection", key: "objective" }, { type: "detection", key: "door" }, { type: "detection", key: "spatial" }] }] },
        { key: "kinesis", className: "is-kinesis", title: "Kinesis", subtitle: "Action layer", stages: [{ key: "motion", title: "Kinesis", items: [{ type: "sensor", key: "motor" }, { type: "detection", key: "health" }] }] }
      ];
    }

    function refreshSensorPanelDescriptors() {
      const panel = self.AIKernelDoomSensorPanel || {};
      sensorUi = typeof panel.cloneSensorDescriptors === "function"
        ? panel.cloneSensorDescriptors()
        : fallbackSensorDescriptors();
      detectionUi = typeof panel.cloneDetectionDescriptors === "function"
        ? panel.cloneDetectionDescriptors()
        : fallbackDetectionDescriptors();
      sensorPanelLayout = Array.isArray(panel.panelLayout)
        ? panel.panelLayout
        : fallbackSensorPanelLayout();
      sensorPanelVersion = panel.version || "fallback-sensorpanel";
      return panel;
    }

    function loadDoomSensorPanelScript() {
      if (self.AIKernelDoomSensorPanel || doomSensorPanelScriptLoading) {
        return doomSensorPanelScriptLoading;
      }

      doomSensorPanelScriptLoading = new Promise(resolve => {
        const script = document.createElement("script");
        script.src = `/demo/doom/js/doom-sensor-panel.js?v=${encodeURIComponent(doomDevCacheKey)}`;
        script.async = false;
        script.onload = () => {
          refreshSensorPanelDescriptors();
          resolve(self.AIKernelDoomSensorPanel || null);
        };
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      });
      return doomSensorPanelScriptLoading;
    }

    function loadDoomPipelinePanelScript() {
      if (self.AIKernelDoomPipelinePanel || doomPipelinePanelScriptLoading) {
        return doomPipelinePanelScriptLoading;
      }

      doomPipelinePanelScriptLoading = loadDoomGpuContractsScript().then(() => new Promise(resolve => {
        const script = document.createElement("script");
        script.src = `/demo/doom/js/doom-pipeline-panel.js?v=${encodeURIComponent(doomDevCacheKey)}`;
        script.async = false;
        script.onload = () => resolve(self.AIKernelDoomPipelinePanel || null);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      }));
      return doomPipelinePanelScriptLoading;
    }

    function loadDoomGoalPanelScript() {
      if (self.AIKernelDoomGoalPanel || doomGoalPanelScriptLoading) {
        return doomGoalPanelScriptLoading;
      }

      doomGoalPanelScriptLoading = new Promise(resolve => {
        const script = document.createElement("script");
        script.src = `/demo/doom/js/doom-goal-panel.js?v=${encodeURIComponent(doomDevCacheKey)}`;
        script.async = false;
        script.onload = () => {
          if (self.AIKernelDoomGoalPanel?.version) {
            document.documentElement.dataset.doomGoalPanelVersion = self.AIKernelDoomGoalPanel.version;
          }
          resolve(self.AIKernelDoomGoalPanel || null);
        };
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      });
      return doomGoalPanelScriptLoading;
    }

    function loadDoomObjectiveStatusPanelScript() {
      if (self.AIKernelDoomObjectiveStatusPanel || doomObjectiveStatusPanelScriptLoading) {
        return doomObjectiveStatusPanelScriptLoading;
      }

      doomObjectiveStatusPanelScriptLoading = loadDoomGpuPathStatusScript().then(() => new Promise(resolve => {
        const script = document.createElement("script");
        script.src = `/demo/doom/js/doom-objective-status-panel.js?v=${encodeURIComponent(doomDevCacheKey)}`;
        script.async = false;
        script.onload = () => resolve(self.AIKernelDoomObjectiveStatusPanel || null);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      }));
      return doomObjectiveStatusPanelScriptLoading;
    }

    function loadDoomDebugOverlayScript() {
      if (self.AIKernelDoomDebugOverlay || doomDebugOverlayScriptLoading) {
        return doomDebugOverlayScriptLoading;
      }

      doomDebugOverlayScriptLoading = new Promise(resolve => {
        const script = document.createElement("script");
        script.src = `/demo/doom/js/doom-debug-overlay.js?v=${encodeURIComponent(doomDevCacheKey)}`;
        script.async = false;
        script.onload = () => resolve(self.AIKernelDoomDebugOverlay || null);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      });
      return doomDebugOverlayScriptLoading;
    }

    function gpuContractValue(name, fallback) {
      const value = self.AIKernelDoomGpuContracts?.[name];
      return typeof value === "string" && value.length > 0 ? value : fallback;
    }

    function loadDoomGpuContractsScript() {
      if (self.AIKernelDoomGpuContracts || doomGpuContractsScriptLoading) {
        return doomGpuContractsScriptLoading || Promise.resolve(self.AIKernelDoomGpuContracts || null);
      }

      doomGpuContractsScriptLoading = new Promise(resolve => {
        const script = document.createElement("script");
        const publicScriptBase = self.AIKernelDoomPublic?.scriptBase;
        const scriptBase = typeof publicScriptBase === "string" && publicScriptBase.length > 0 ? publicScriptBase : "/js/";
        script.src = `${scriptBase}autoplay/gpu-contracts.js?v=${encodeURIComponent(doomDevCacheKey)}`;
        script.async = false;
        script.onload = () => resolve(self.AIKernelDoomGpuContracts || null);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      });
      return doomGpuContractsScriptLoading;
    }

    function loadDoomDebugCaptureScript() {
      if (self.AIKernelDoomDebugCaptureModule || doomDebugCaptureScriptLoading) {
        return doomDebugCaptureScriptLoading;
      }

      doomDebugCaptureScriptLoading = loadDoomGpuContractsScript().then(() => new Promise(resolve => {
        const script = document.createElement("script");
        script.src = `/demo/doom/js/doom-debug-capture.js?v=${encodeURIComponent(doomDevCacheKey)}`;
        script.async = false;
        script.onload = () => resolve(self.AIKernelDoomDebugCaptureModule || null);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      }));
      return doomDebugCaptureScriptLoading;
    }

    function loadDoomRuntimeFormatScript() {
      if (self.AIKernelDoomRuntimeFormat || doomRuntimeFormatScriptLoading) {
        return doomRuntimeFormatScriptLoading;
      }

      doomRuntimeFormatScriptLoading = loadDoomGpuPathStatusScript().then(() => new Promise(resolve => {
        const script = document.createElement("script");
        script.src = `/demo/doom/js/doom-runtime-format.js?v=${encodeURIComponent(doomDevCacheKey)}`;
        script.async = false;
        script.onload = () => resolve(self.AIKernelDoomRuntimeFormat || null);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      }));
      return doomRuntimeFormatScriptLoading;
    }

    function loadDoomGpuPathStatusScript() {
      if (self.AIKernelDoomGpuPathStatus || doomGpuPathStatusScriptLoading) {
        return doomGpuPathStatusScriptLoading || Promise.resolve(self.AIKernelDoomGpuPathStatus || null);
      }

      doomGpuPathStatusScriptLoading = new Promise(resolve => {
        const script = document.createElement("script");
        script.src = `/demo/doom/js/doom-gpu-path-status.js?v=${encodeURIComponent(doomDevCacheKey)}`;
        script.async = false;
        script.onload = () => resolve(self.AIKernelDoomGpuPathStatus || null);
        script.onerror = () => resolve(null);
        document.head.appendChild(script);
      });
      return doomGpuPathStatusScriptLoading;
    }

    function ensureDoomToposHud() {
      if (doomToposHud || !doomScreen) {
        return;
      }

      const pipelinePanel = self.AIKernelDoomPipelinePanel;
      if (typeof pipelinePanel?.ensureToposHud === "function") {
        doomToposHud = pipelinePanel.ensureToposHud({ doomScreen, doomScreenPanel, node: doomToposHud });
        return;
      }

      const host = doomScreen.parentElement || doomScreenPanel;
      if (!host) {
        return;
      }

      if (!host.style.position) {
        host.style.position = "relative";
      }

      doomToposHud = document.createElement("div");
      doomToposHud.className = "doom-topos-hud";
      doomToposHud.setAttribute("aria-label", "Topos and CTG observed carrier");
      doomToposHud.style.cssText = "position:absolute;right:10px;top:10px;z-index:160;width:240px;max-width:32vw;margin:0;padding:7px 9px;border:1px solid rgba(255,225,122,.48);background:rgba(10,12,8,.07);color:#ffeaa0;font:10px/1.28 ui-monospace,Consolas,monospace;text-shadow:0 1px 2px #000;white-space:pre-wrap;pointer-events:none;overflow:hidden;";
      host.appendChild(doomToposHud);
    }

    function updateDoomToposHud(status) {
      if (!doomToposHud) {
        return;
      }

      const pipelinePanel = self.AIKernelDoomPipelinePanel;
      if (typeof pipelinePanel?.renderToposHud === "function") {
        pipelinePanel.renderToposHud(doomToposHud, status, { detail: doomToposDetailEnabled });
      } else {
        doomToposHud.textContent = "[CTG]\n  panel module loading\n\n[Topos]\n  waiting for pipeline view";
        loadDoomPipelinePanelScript()?.then(() => {
          if (self.AIKernelDoomPipelinePanel?.renderToposHud) {
            self.AIKernelDoomPipelinePanel.renderToposHud(doomToposHud, status, { detail: doomToposDetailEnabled });
          }
        });
      }
    }

    function createSensorToggleButton(key) {
      const descriptor = sensorUi[key] || { label: `${key} Sensor`, signal: "sensor input" };
      const button = document.createElement("button");
      button.type = "button";
      button.className = "doom-sensor-switch is-on";
      button.dataset.sensorToggle = key;
      button.dataset.sensorLabel = descriptor.label;
      button.dataset.sensorSignal = descriptor.signal;
      button.dataset.command = `doom.sensor ${key} toggle`;
      button.setAttribute("aria-pressed", "true");
      renderSensorButtonContent(button, descriptor.label, descriptor.signal, true);
      return button;
    }

    function getOrCreateSensorToggle(sensorRow, key) {
      const existing = sensorRow.querySelector(`[data-sensor-toggle="${key}"]`)
        || document.querySelector(`[data-sensor-toggle="${key}"]`);
      if (existing) {
        existing.classList.remove("doom-debug-switch");
        existing.classList.add("doom-sensor-switch");
        return existing;
      }

      return createSensorToggleButton(key);
    }

    function createDetectionToggleButton(key) {
      const descriptor = detectionUi[key] || { label: labelize(key), signal: "detector" };
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.detectionToggle = key;
      button.setAttribute("aria-pressed", "true");
      button.textContent = descriptor.label || labelize(key);
      button.title = descriptor.signal || "Detector panel";
      return button;
    }

    function getOrCreateDetectionToggle(key) {
      const existing = document.querySelector(`[data-detection-toggle="${key}"]`);
      if (existing) {
        const descriptor = detectionUi[key] || {};
        if (descriptor.label) {
          existing.textContent = descriptor.label;
        }
        if (descriptor.signal) {
          existing.dataset.detectionSignal = descriptor.signal;
        }
        return existing;
      }

      return createDetectionToggleButton(key);
    }

    function createSensorSignalChip(item) {
      const chip = document.createElement("span");
      chip.className = "doom-panel-signal-chip";
      chip.dataset.panelSignal = item.label || "signal";
      const label = document.createElement("strong");
      label.textContent = item.label || "Signal";
      const detail = document.createElement("span");
      detail.textContent = item.signal || "pending";
      chip.appendChild(label);
      chip.appendChild(detail);
      return chip;
    }

    function appendSensorPanelItem(stageBody, item, sensorRow) {
      if (!item || !item.type) {
        return;
      }

      if (item.type === "sensor") {
        stageBody.appendChild(getOrCreateSensorToggle(sensorRow, item.key));
        return;
      }

      if (item.type === "detection") {
        stageBody.appendChild(getOrCreateDetectionToggle(item.key));
        return;
      }

      if (item.type === "signal") {
        stageBody.appendChild(createSensorSignalChip(item));
      }
    }

    function ensureDoomSensorPipelineTitle(sensorRow) {
      if (!doomDebugBar) {
        return null;
      }

      let title = doomDebugBar.querySelector(".doom-sensor-pipeline-title");
      if (!title) {
        title = document.createElement("div");
        title.className = "doom-sensor-pipeline-title";
        title.textContent = "Sensor Pipeline";
      }

      if (sensorRow) {
        if (title.nextElementSibling !== sensorRow) {
          sensorRow.before(title);
        }
      } else if (!title.parentNode) {
        doomDebugBar.appendChild(title);
      }

      return title;
    }

    function ensureDoomSensorToggleRow() {
      if (!doomDebugBar) {
        return;
      }

      refreshSensorPanelDescriptors();
      if (!self.AIKernelDoomSensorPanel) {
        loadDoomSensorPanelScript()?.then(panel => {
          if (!panel || !doomDebugBar) {
            return;
          }

          refreshSensorPanelDescriptors();
          const currentRow = doomDebugBar.querySelector(".doom-sensor-toggles");
          if (currentRow) {
            currentRow.dataset.sensorPanelVersion = "";
          }
          ensureDoomSensorToggleRow();
        });
      }

      let sensorRow = doomDebugBar.querySelector(".doom-sensor-toggles");
      if (!sensorRow) {
        sensorRow = document.createElement("div");
        sensorRow.className = "doom-sensor-toggles";
        doomDebugBar.appendChild(sensorRow);
      }
      ensureDoomSensorPipelineTitle(sensorRow);

      if (sensorRow.dataset.sensorPanelVersion !== sensorPanelVersion) {
        sensorRow.dataset.sensorPanelVersion = sensorPanelVersion;
        sensorRow.replaceChildren();
        for (const panel of sensorPanelLayout) {
          const node = document.createElement("section");
          node.className = `doom-sensor-node ${panel.className || ""}`.trim();
          node.dataset.sensorPanel = panel.key;
          node.setAttribute("aria-label", `${panel.title} ${panel.subtitle || ""}`.trim());
          if (panel.gridColumn) {
            node.style.gridColumn = panel.gridColumn;
          }
          if (panel.gridRow) {
            node.style.gridRow = panel.gridRow;
          }

          const header = document.createElement("header");
          header.className = "doom-sensor-node-header";
          const nodeLabel = document.createElement("div");
          nodeLabel.className = "doom-sensor-node-label";
          nodeLabel.textContent = panel.title || labelize(panel.key);
          const subtitle = document.createElement("div");
          subtitle.className = "doom-sensor-node-subtitle";
          subtitle.textContent = panel.subtitle || "";
          header.appendChild(nodeLabel);
          header.appendChild(subtitle);
          node.appendChild(header);

          const stages = document.createElement("div");
          stages.className = "doom-sensor-stages";
          if ((panel.stages || []).length === 1) {
            stages.classList.add("is-single-stage");
          }

          for (const stage of panel.stages || []) {
            const stageNode = document.createElement("section");
            stageNode.className = "doom-sensor-stage";
            stageNode.dataset.sensorStage = stage.key || "";
            const stageTitle = document.createElement("div");
            stageTitle.className = "doom-sensor-stage-title";
            stageTitle.textContent = stage.title || labelize(stage.key);
            const stageBody = document.createElement("div");
            stageBody.className = "doom-sensor-node-buttons";
            for (const item of stage.items || []) {
              appendSensorPanelItem(stageBody, item, sensorRow);
            }
            stageNode.appendChild(stageTitle);
            stageNode.appendChild(stageBody);
            stages.appendChild(stageNode);
          }

          node.appendChild(stages);
          sensorRow.appendChild(node);
        }
      }

      doomSensorToggles = Array.from(document.querySelectorAll("[data-sensor-toggle]"));
      doomDetectionToggles = Array.from(document.querySelectorAll("[data-detection-toggle]"));
      const detectionSource = doomDebugBar.querySelector(".doom-detection-toggles");
      if (detectionSource) {
        detectionSource.classList.add("is-panelized");
        detectionSource.setAttribute("aria-hidden", "true");
      }
      syncSensorToggles();
      syncDetectionToggleButtons();
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
      track.style.cssText = "position:relative;overflow:hidden;border:1px solid rgba(230,240,255,.28);background:rgba(16,24,32,.24);";
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

    function runDetectionToggleButton(button) {
      const key = button?.dataset?.detectionToggle;
      if (!key) {
        return false;
      }

      const enabled = doomDetectionVisibility.get(key) === false;
      doomDetectionVisibility.set(key, enabled);
      syncDetectionToggleButtons();
      renderDoomDebugOverlay(doomRuntime?.status?.() || {});
      focusPromptUnlessGameRunning();
      return true;
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

    function normalizeCompassDisplayHeading(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        return null;
      }

      return ((number % 360) + 360) % 360;
    }

    function shortestCompassDisplayDelta(from, to) {
      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        return 0;
      }

      return ((((to - from) % 360) + 540) % 360) - 180;
    }

    function smoothCompassScalar(previous, target, alpha) {
      const current = Number.isFinite(previous) ? previous : target;
      return current + (target - current) * Math.max(0, Math.min(1, alpha));
    }

    function updateCompassDisplayState(compass) {
      const now = Number(self.performance?.now?.() ?? Date.now());
      const previous = doomCompassDisplayState || {};
      const previousHeading = normalizeCompassDisplayHeading(previous.heading);
      const rawHeading = normalizeCompassDisplayHeading(compass?.heading);
      const rawConfidence = clampHud01(compass?.confidence);
      const rawUsable = rawHeading !== null
        && compass?.headingUsable !== false
        && !compass?.headingUncertain;
      const dt = previous.updatedAt > 0 ? Math.max(16, Math.min(180, now - previous.updatedAt)) : 33;
      const riseAlpha = 1 - Math.pow(0.5, dt / 110);
      const decayAlpha = 1 - Math.pow(0.5, dt / 620);
      const targetHeading = rawHeading !== null ? rawHeading : previousHeading;
      const nextHeading = targetHeading === null
        ? 0
        : (previousHeading === null
          ? targetHeading
          : normalizeCompassDisplayHeading(previousHeading + shortestCompassDisplayDelta(previousHeading, targetHeading) * (rawUsable ? riseAlpha : Math.max(decayAlpha * 0.72, 0.035))));
      const holdUntil = rawUsable
        ? now + 1100
        : Number(previous.holdUntil || 0);
      const held = !rawUsable && now < holdUntil;
      const confidenceTarget = rawUsable
        ? Math.max(rawConfidence, 0.34)
        : (held ? Math.max(rawConfidence * 0.7, Number(previous.confidence || 0) * 0.62, 0.14) : 0);
      const usableTarget = rawUsable ? 1 : (held ? Math.max(Number(previous.usable || 0) * 0.70, 0.22) : 0);
      const confidence = smoothCompassScalar(Number(previous.confidence || 0), confidenceTarget, rawUsable ? riseAlpha : decayAlpha);
      const usable = smoothCompassScalar(Number(previous.usable || 0), usableTarget, rawUsable ? riseAlpha : decayAlpha);

      doomCompassDisplayState = {
        heading: nextHeading,
        confidence: clampHud01(confidence),
        usable: clampHud01(usable),
        holdUntil,
        updatedAt: now,
        reliability: rawUsable
          ? String(compass?.headingReliability || "usable")
          : (held ? "decay-hold" : String(compass?.headingReliability || "low-evidence"))
      };
      return Object.assign({ rawHeading, rawUsable, held }, doomCompassDisplayState);
    }

    function syncCompassNeedle(button, status) {
      if (!button || button.dataset.sensorToggle !== "compass") {
        return;
      }

      const compass = status?.autoplay?.compassSensor || {};
      const display = updateCompassDisplayState(compass);
      const heading = Number(display.heading);
      const headingUsable = display.usable >= 0.24;
      const needle = document.createElement("span");
      needle.className = "sensor-compass-needle";
      needle.classList.toggle("is-uncertain", !display.rawUsable);
      needle.classList.toggle("is-decaying", Boolean(display.held));
      needle.style.setProperty("--compass-signal-opacity", (0.34 + display.confidence * 0.66).toFixed(3));
      const arrow = document.createElement("span");
      arrow.className = "sensor-compass-arrow";
      arrow.textContent = "→";
      const label = document.createElement("span");
      label.className = "sensor-compass-readout";
      button.classList.toggle("is-compass-uncertain", !display.rawUsable);
      if (Number.isFinite(heading) && headingUsable) {
        arrow.style.setProperty("--compass-needle-angle", `${(heading - 90).toFixed(1)}deg`);
        label.textContent = display.held
          ? `estimate ${Math.round(heading)}deg / c ${display.confidence.toFixed(2)} / hold`
          : `estimate ${Math.round(heading)}deg / c ${display.confidence.toFixed(2)}`;
      } else if (Number.isFinite(heading)) {
        arrow.style.setProperty("--compass-needle-angle", `${(heading - 90).toFixed(1)}deg`);
        label.textContent = `estimate ? / c ${display.confidence.toFixed(2)} / ${display.reliability}`;
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
        "help": "commands: yes, doom.gpu cpu, doom.gpu gpu, doom.gpu status, doom.status, doom.phase.check, doom.gui.selftest, doom.start, doom.stop, doom.restart-play, doom.audio toggle, doom.audio on, doom.audio off, doom.audio test, doom.audio status, doom.sensor <visual|audio|motor|movement|compass|spatial|health> <toggle|on|off>, doom.autoplay toggle, doom.autoplay on, doom.autoplay off, doom.autoplay manual-move toggle, doom.autoplay sense-only toggle, doom.autoplay sense-only on, doom.autoplay sense-only off, doom.autoplay status, doom.use-test, doom.cheat <idfa|idkfa|iddqd|idspispopd|idclip>, iddqd, idkfa, idfa, wasm.exports, model.status, legal, copy.logs, clear",
        "doom.status": "suspended: approval required before hosted WAD/model/WASM download or load. Choose GPU/CPU below or type yes for GPU mode.",
        "doom.stop": "ok: no active public runtime process is running.",
        "wasm.exports": "main, doom_init, doom_tick, doom_render, doom_input, doom_input_action, doom_mount_wad, doom_wad_status, malloc, free",
        "model.status": "suspended: approval required before Bonsai-1.7B_Q1_0 GGUF download or load. Choose GPU/CPU below or type yes for GPU mode.",
        "legal": "open /demo/doom/terms-and-licenses.html in a new tab before approval"
      };

      if (wasmApprovalPending && (normalized === "doom.gpu cpu" || normalized === "gpu cpu")) {
        setStartupGpuMode(false, "startup-cpu");
        appendConsoleLine("[ RESP ]", "log-warn", "CPU mode armed. Type yes to start without WebGPU initialization.");
        return false;
      }

      if (wasmApprovalPending && (normalized === "doom.gpu gpu" || normalized === "gpu gpu")) {
        const mode = setStartupGpuMode(true, "startup-gpu");
        const activeGpu = mode.useGpuRendering !== false && mode.gpuPermanentlyDisabled !== true;
        appendConsoleLine("[ RESP ]", activeGpu ? "log-ok" : "log-warn", activeGpu
          ? "GPU mode armed. Type yes to start with WebGPU initialization."
          : "GPU mode cannot be re-enabled in this session after CPU/fallback was selected.");
        return false;
      }

      if (["yes", "y", "approve", "accept"].includes(normalized)) {
        if (!window.AIKernelDoomGpuMode || window.AIKernelDoomGpuMode.useGpuRendering !== false) {
          ensureGpuModeState();
        }
        wasmApprovalPending = false;
        setApprovalUiState("loading");
        downloadProgressTracker.reset();
        appendConsoleLine("[  OK  ]", "log-ok", "approval recorded: hosted WAD/model/WASM download and load accepted.");
        const runtime = ensureDoomRuntime();
        if (!runtime) {
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
          const status = await runtime.prepare();
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
        appendConsoleLine("[SUSP]", "log-warn", "approval required before hosted WAD/model/WASM download or load. Type yes in the aik console or use the approval button.");
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

      if (!wasmApprovalPending && normalized === "doom.gpu status") {
        await loadDoomGpuPathStatusScript();
        const gpu = readDoomDebugGpuStatus();
        const rows = Array.isArray(gpu.path?.rows) ? gpu.path.rows : [];
        appendConsoleLine("[ GPU ]", gpu.runtime.usingCpuFallback ? "log-warn" : "log-info", `runtime renderer=${gpu.runtime.renderer}; delegate=${gpu.runtime.gpuDelegate}; useGpu=${gpu.runtime.useGpuRendering !== false}; fallback=${gpu.runtime.usingCpuFallback}; reason=${gpu.runtime.gpuModeReason || "none"}; error=${gpu.runtime.lastError || "none"}.`);
        appendConsoleLine("[ GPU ]", gpu.provider?.usingCpuFallback ? "log-warn" : "log-info", `provider=${gpu.provider?.name || "none"}; backend=${gpu.provider?.backend || "unknown"}; useGpu=${gpu.provider?.useGpuRendering !== false}; disabled=${Boolean(gpu.provider?.gpuPermanentlyDisabled)}; reason=${gpu.provider?.fallbackReason || "none"}; initialized=${Boolean(gpu.provider?.initialized)}; renderer=${Boolean(gpu.provider?.rendererInitialized)}; zeroCopy=${Boolean(gpu.provider?.zeroCopy)}; memory=${Number(gpu.provider?.estimatedGpuMemoryMB || gpu.provider?.gpuMemory?.totalMB || 0).toFixed(2)}MB.`);
        if (rows.length > 0) {
          rows.forEach(row => appendConsoleLine(`[ ${row.label} ]`, row.tone === "gpu" ? "log-ok" : (row.tone === "warn" ? "log-warn" : "log-info"), row.value));
        }
        return;
      }

      if (!wasmApprovalPending && normalized === "model.status") {
        const status = doomRuntime?.status() || { modelLoaded: false };
        updateRuntimeStatus(status, "status");
        const autoplay = status.autoplay || {};
        appendConsoleLine("[ RESP ]", "log-info", `${status.modelLoaded ? "ready" : "loading"}: Bonsai-1.7B_Q1_0 GGUF hostedFile=${doomSharedModel.hostedFile}; manifest=${doomSharedModel.manifestUrl}; shared=${Boolean(doomPublicConfig.sharedModel || doomDeploymentConfig.sharedModel)}; loaded=${status.modelLoaded}; execution surface=WebGpuComputeProvider; autoplay=${autoplay.enabled ? autoplay.mode || "on" : "off"}`);
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
        const frame = await captureAnalysisFrame({ publish: true });
        window.AIKernelDoomLastSenseCapture = frame;
        const safe = frame.analysisSafe ? "analysis-safe" : "not-analysis-safe";
        appendConsoleLine("[CAPTURE]", frame.ok ? "log-ok" : "log-warn", `frame=${frame.frame || 0}; usage=${frame.usage}; source=${frame.source}; overlayExcluded=${frame.overlayExcluded ? "yes" : "no"}; image=${frame.dataUrl ? "yes" : "status-only"}; ${safe}; reason=${frame.reason || "none"}.`);
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
        const routeText = `blue=${Number(milestones.blueFloorScore || 0).toFixed(2)}; court=${Number(milestones.courtyardScore || 0).toFixed(2)}/${milestones.courtyardTurn || "none"}/${milestones.courtyardRescueMode || "none"}/${milestones.courtyardRescueFrames || 0}; secret=${Number(milestones.spawnSecretDoorScore || 0).toFixed(2)}/${milestones.spawnSecretDoorTurn || "none"}; stair=${Number(milestones.spawnWestStairScore || 0).toFixed(2)}/${milestones.spawnWestStairTurn || "none"}; gap=${Number(milestones.spawnCorridorGapScore || 0).toFixed(2)}/${milestones.spawnCorridorGapTurn || "none"}/${milestones.spawnCorridorGapFrames || 0}/yaw${Number(autoplay.routeFallbackYaw || 0).toFixed(0)}/${autoplay.spawnCorridorGapActionTurn || "none"}; bridge=${Number(milestones.bridgeBrownScore || 0).toFixed(2)}/${Number(milestones.bridgeGreenLeft || 0).toFixed(2)}-${Number(milestones.bridgeGreenCenter || 0).toFixed(2)}-${Number(milestones.bridgeGreenRight || 0).toFixed(2)}/${milestones.bridgeLaneTurn || "none"}/door${Number(milestones.bridgeDoorScore || 0).toFixed(2)}; corridor=${milestones.firstDoorCorridorLocated ? "yes" : "no"}/${milestones.firstDoorCorridorFrames || 0}/${Number(milestones.firstDoorCorridorSignature || 0).toFixed(2)}/v9${Number(milestones.firstDoorVision9x9Score || 0).toFixed(2)}; deadEnd=${milestones.firstDoorDeadEndTurnFrames || 0}; useSeen=${Boolean(milestones.firstDoorUseAttempted)}/${Number(milestones.firstDoorUseSignature || 0).toFixed(2)}`;
        const computerText = `computer=${milestones.computerRoomEntered ? "yes" : "no"}/${milestones.computerRoomFrames || 0}/${Number(milestones.computerRoomScore || 0).toFixed(2)}/${Number(milestones.computerBlueScore || 0).toFixed(2)}/${Number(milestones.computerRedLightScore || 0).toFixed(2)}/${Number(milestones.computerDarkPanelScore || 0).toFixed(2)}/${Number(milestones.computerPanelScore || 0).toFixed(2)}`;
        const milestoneText = `door=${milestones.doorOpened || 0}; dark=${milestones.darkZoneEntered ? "yes" : "no"}/${milestones.darkZoneFrames || 0}; darkArea=${Number(milestones.darkAreaScore || 0).toFixed(2)}; luma=${Number(milestones.gameplayLuma || 0).toFixed(1)}; ${computerText}; ${routeText}; ${mapText}; ${progressText}; enemy=${milestones.enemyDefeated || 0}; ${alertText}; bursts=${milestones.combatFireFrames || 0}; peak=${Number(milestones.enemyConfidencePeak || 0).toFixed(2)}; drop=${milestones.enemyDropFrames || 0}`;
        const ammoText = `${autoplay.ammoLikelyEmpty ? "empty" : "ok"}/${autoplay.ammoSignature || "000000000000000000000"}`;
        const healthValue = Number(autoplay.healthEstimatedPercent ?? autoplay.healthSensor?.value ?? autoplay.healthSensor?.health ?? 100);
        const healthText = `${autoplay.healthLikelyDead ? "dead" : "live"}/hp${Number.isFinite(healthValue) ? Math.round(healthValue) : 100}/z${Number(autoplay.healthZeroScore || 0).toFixed(2)}/c${autoplay.healthActiveColumns || 0}/a${autoplay.healthActiveCells || 0}/${autoplay.healthSignature || "000000000000000000000000"}`;
        const motionText = `${autoplay.motion9Signature || "000000000"}/${Number(autoplay.motion9Delta ?? 255).toFixed(2)}/f${Number(autoplay.motionForwardProgress || 0).toFixed(2)}/o${Number(autoplay.motionObstacleScore || 0).toFixed(2)}/t${Number(autoplay.motionTurnScore || 0).toFixed(2)}/e${Number(autoplay.motionEntranceScore || 0).toFixed(2)}/s${Number(autoplay.motionStallScore || 0).toFixed(2)}/${autoplay.motionIntent || "idle"}`;
        const footText = `${Number(autoplay.footObstacleScore || 0).toFixed(2)}/${Number(autoplay.priorFootObstacleScore || 0).toFixed(2)}/f${Number(autoplay.footObstacleFlickerScore || 0).toFixed(2)}/b${autoplay.footObstacleBounceFrames || 0}/d${Number(autoplay.footObstacleBandDelta || 0).toFixed(2)}`;
        updateRuntimeStatus(status, "autoplay-status");
        appendConsoleLine("[AUTOPLAY]", Boolean(autoplay.zeroCopy) ? "log-ok" : "log-warn", `enabled=${Boolean(autoplay.enabled)}; mode=${autoplay.mode || "disabled"}; manualMove=${Boolean(autoplay.manualMove)}; pipeline=${pipelineText}; objective=${objectiveText}; semantic=${semanticText}; strategy=${strategyText}; vision=${autoplay.vision || "none"}; zeroCopy=${Boolean(autoplay.zeroCopy)}; milestones=${milestoneText}; ammo=${ammoText}; health=${healthText}; safety=${autoplay.safetyReason || "none"}; mobility=${autoplay.mobilityMode || "none"}; wall=${autoplay.wallHugSide || "left"}; target=${targetConfidence}; enemy=${enemyText}; corner=${cornerSignal}; sig=${signatureText}; dict=${dictionaryText}; regions=${autoplay.regionSignature || "000000"}; regions9=${autoplay.region9Signature || "000000000"}; motion9=${motionText}; foot=${footText}; depthSig=${autoplay.depthSignature || "0000"}; depth=${depthEstimate}; faceSig=${autoplay.faceSignature || "0000000000000000"}; sound=${Boolean(autoplay.soundCueActive)}; stuck=${autoplay.stuckFrames || 0}; qStall=${autoplay.quantizedStallFrames || 0}; qDelta=${quantizedDelta}; rDelta=${regionDelta}; hudDelta=${hudDelta}; faceDelta=${faceDelta}; probe=${probe}; detach=${detach}; survey=${survey}; mapRush=${mapRush}; mapDoor=${mapDoor}; suppress=${autoplay.cornerSuppressFrames || 0}; repeat=${autoplay.repeatActionFrames || 0}; kRepeat=${autoplay.actionRepeatFrames || 0}; repeatTurn=${autoplay.repeatTurnFrames || 0}; recovery=${autoplay.recoveryFrames || 0}; loopEscape=${autoplay.loopEscapeFrames || 0}; useCooldown=${autoplay.useCooldown || 0}; predictions=${autoplay.predictions || 0}; reused=${autoplay.reused || 0}; latency=${Math.round(autoplay.latencyMs || 0)}ms`);
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
    installDoomPublicDemoLayout();
    setApprovalNoticeHtml("ready");
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

    let doomGuiSelfTest = null;
    try {
      doomGuiSelfTest = window.AIKernelDoomGuiSelfTest?.install?.({
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
      }) || null;
    } catch (error) {
      appendConsoleLine("[GUI  ]", "log-warn", `self-test hooks disabled: ${String(error?.message || error || "unknown error")}`);
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

    function ensureRawCaptureAnchor() {
      let node = document.getElementById("doom-raw-frame-capture");
      if (!node) {
        node = document.createElement("a");
        node.id = "doom-raw-frame-capture";
        node.hidden = true;
        node.setAttribute("aria-hidden", "true");
        node.download = "aikernel-doom-raw-frame.png";
        document.body.appendChild(node);
      }

      return node;
    }

    function publishGameFrameCapture(capture) {
      const node = ensureRawCaptureAnchor();
      const dataUrl = capture?.dataUrl || capture?.imageDataUrl || "";
      node.href = dataUrl || "#";
      node.dataset.ok = capture?.ok ? "true" : "false";
      node.dataset.source = capture?.source || capture?.captureSource || "unknown";
      node.dataset.overlayExcluded = capture?.overlayExcluded !== false ? "true" : "false";
      node.dataset.reason = capture?.reason || "";
      node.dataset.frame = capture?.frame !== null && capture?.frame !== undefined ? String(capture.frame) : "";
      node.dataset.timestamp = capture?.timestamp || new Date().toISOString();
      node.dataset.contentType = capture?.contentType || "image/png";
      window.AIKernelDoomLastPublishedRawCapture = {
        ok: node.dataset.ok === "true",
        source: node.dataset.source,
        overlayExcluded: node.dataset.overlayExcluded === "true",
        reason: node.dataset.reason,
        frame: node.dataset.frame,
        timestamp: node.dataset.timestamp
      };
      return node;
    }

    function createUnavailableDebugCaptureApi() {
      async function unavailableFrame(options = {}) {
        const usage = options?.allowDisplayFallback === true
          ? "debug-display-fallback"
          : "analysis-raw-framebuffer";
        const frame = {
          ok: false,
          reason: "debug-capture-module-unavailable",
          overlayExcluded: true,
          usage,
          analysisSafe: false,
          timestamp: new Date().toISOString()
        };
        if (options?.publish !== false) {
          publishGameFrameCapture(frame);
        }
        return frame;
      }

      return Object.freeze({
        version: "debugcapture-unavailable",
        captureGameFrame: unavailableFrame,
        captureRawGameFrame: unavailableFrame,
        captureAnalysisFrame: unavailableFrame,
        captureDisplayFrame: (options = {}) => unavailableFrame(Object.assign({}, options, {
          allowDisplayFallback: true
        })),
        captureGpuAisthesisFeatures: () => ({
          ok: false,
          reason: "debug-capture-module-unavailable",
          source: gpuContractValue("aisthesisFeatureTarget", "doom.gpu.aisthesis.features"),
          usage: "debug-gpu-aisthesis-readback",
          timestamp: new Date().toISOString()
        }),
        captureGpuSpatialReasoningOutput: () => ({
          ok: false,
          reason: "debug-capture-module-unavailable",
          source: gpuContractValue("spatialOutputTarget", "doom.gpu.spatial.reasoning"),
          usage: "debug-gpu-spatial-reasoning-readback",
          timestamp: new Date().toISOString()
        }),
        getLastPublishedCapture: () => window.AIKernelDoomLastPublishedRawCapture || null
      });
    }

    function installDoomDebugCaptureApi(module = self.AIKernelDoomDebugCaptureModule) {
      if (doomDebugCaptureApi) {
        return doomDebugCaptureApi;
      }

      if (typeof module?.createDebugCapture === "function") {
        doomDebugCaptureApi = module.createDebugCapture({
          getRuntime: () => doomRuntime,
          getCanvas: () => doomScreen,
          getGpuAisthesisFeatures: options => doomRuntime?.readGpuAisthesisFeatures?.(options) || {
            ok: false,
            reason: "gpu-aisthesis-readback-unavailable",
            source: gpuContractValue("aisthesisFeatureTarget", "doom.gpu.aisthesis.features")
          },
          getGpuSpatialReasoningOutput: options => doomRuntime?.readGpuSpatialReasoningOutput?.(options) || {
            ok: false,
            reason: "gpu-spatial-reasoning-readback-unavailable",
            source: gpuContractValue("spatialOutputTarget", "doom.gpu.spatial.reasoning")
          },
          publishCapture: publishGameFrameCapture,
          getLastPublishedCapture: () => window.AIKernelDoomLastPublishedRawCapture || null
        });
      } else {
        doomDebugCaptureApi = createUnavailableDebugCaptureApi();
      }

      window.AIKernelDoomDebugCapture = doomDebugCaptureApi;
      return doomDebugCaptureApi;
    }

    async function ensureDoomDebugCaptureApi() {
      if (doomDebugCaptureApi) {
        return doomDebugCaptureApi;
      }

      const module = self.AIKernelDoomDebugCaptureModule || await loadDoomDebugCaptureScript();
      return installDoomDebugCaptureApi(module);
    }

    async function captureGameFrame(options = {}) {
      return (await ensureDoomDebugCaptureApi()).captureGameFrame(options);
    }

    async function captureRawGameFrame(options = {}) {
      return (await ensureDoomDebugCaptureApi()).captureRawGameFrame(options);
    }

    async function captureAnalysisFrame(options = {}) {
      return (await ensureDoomDebugCaptureApi()).captureAnalysisFrame(options);
    }

    async function captureDisplayFrame(options = {}) {
      return (await ensureDoomDebugCaptureApi()).captureDisplayFrame(options);
    }

    async function captureGpuAisthesisFeatures(options = {}) {
      return (await ensureDoomDebugCaptureApi()).captureGpuAisthesisFeatures(options);
    }

    async function captureGpuSpatialReasoningOutput(options = {}) {
      return (await ensureDoomDebugCaptureApi()).captureGpuSpatialReasoningOutput(options);
    }

    function getLastPublishedCapture() {
      return (doomDebugCaptureApi || window.AIKernelDoomDebugCapture)?.getLastPublishedCapture?.()
        || window.AIKernelDoomLastPublishedRawCapture
        || null;
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
      captureRawGameFrame,
      captureAnalysisFrame,
      captureDisplayFrame,
      captureGpuAisthesisFeatures,
      captureGpuSpatialReasoningOutput,
      getLastPublishedCapture,
      getSchemaDefinitions,
      sendSchemaDefinitions,
      runCommand: (command, options = {}) => runWasmCommand(command, options),
      approve: () => runWasmCommand("yes", { echo: false, source: "debug-api" }),
      runGuiSelfTest: (options = {}) => options.log
        ? window.runAIKernelDoomGuiSelfTestCommand?.()
        : doomGuiSelfTest?.runDoomGuiSelfTest?.()
    };
    window.AIKernelDoomDebugCapture = Object.freeze({
      captureAnalysisFrame,
      captureDisplayFrame,
      captureRawGameFrame,
      captureGameFrame,
      captureGpuAisthesisFeatures,
      captureGpuSpatialReasoningOutput,
      getLastPublishedCapture
    });

    const doomDebugCaptureBridgeResultId = "doom-debug-capture-bridge-result";

    function ensureDebugCaptureBridgeResultNode() {
      let node = document.getElementById(doomDebugCaptureBridgeResultId);
      if (!node) {
        node = document.createElement("script");
        node.id = doomDebugCaptureBridgeResultId;
        node.type = "application/json";
        node.hidden = true;
        node.setAttribute("aria-hidden", "true");
        node.textContent = "";
        document.body.appendChild(node);
      }

      return node;
    }

    function writeDebugCaptureBridgeResult(kind, result) {
      const node = ensureDebugCaptureBridgeResultNode();

      const payload = {
        kind,
        timestamp: new Date().toISOString(),
        result
      };
      node.textContent = JSON.stringify(payload);
      node.dataset.kind = kind;
      node.dataset.timestamp = payload.timestamp;
      node.dataset.ok = result?.ok === true ? "true" : "false";
    }

    function ensureDebugCaptureBridgeButton(kind, label, capture) {
      const id = `doom-debug-capture-${kind}-trigger`;
      let button = document.getElementById(id);
      if (button) {
        return button;
      }

      button = document.createElement("button");
      button.id = id;
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-label", label);
      button.dataset.debugCaptureTrigger = kind;
      button.tabIndex = -1;
      Object.assign(button.style, {
        position: "fixed",
        left: "0",
        top: kind === "analysis" ? "0" : "12px",
        width: "8px",
        height: "8px",
        opacity: "0",
        zIndex: "2147483600",
        pointerEvents: "auto"
      });
      button.addEventListener("click", () => {
        capture()
          .then(frame => writeDebugCaptureBridgeResult(kind, frame))
          .catch(error => writeDebugCaptureBridgeResult(kind, {
            ok: false,
            reason: String(error?.message || error || `capture-${kind}-failed`),
            analysisSafe: kind === "analysis",
            overlayExcluded: kind === "analysis"
          }));
      });
      document.body.appendChild(button);
      return button;
    }

    function installDebugCaptureBridgeApiSurface() {
      if (window.AIKernelDoomDebugCaptureBridge) {
        return window.AIKernelDoomDebugCaptureBridge;
      }

      window.AIKernelDoomDebugCaptureBridge = Object.freeze({
        captureAnalysis: async () => {
          const frame = await captureAnalysisFrame({ publish: true });
          writeDebugCaptureBridgeResult("analysis", frame);
          return frame;
        },
        captureDisplay: async () => {
          const frame = await captureDisplayFrame({ publish: true });
          writeDebugCaptureBridgeResult("display", frame);
          return frame;
        },
        getLastResult: () => {
          const node = ensureDebugCaptureBridgeResultNode();
          try {
            return JSON.parse(node.textContent || "null");
          } catch {
            return null;
          }
        }
      });

      return window.AIKernelDoomDebugCaptureBridge;
    }

    function installDebugCaptureBridge() {
      if (document.documentElement.dataset.doomDebugCaptureBridge === "installed") {
        installDebugCaptureBridgeApiSurface();
        return;
      }

      document.documentElement.dataset.doomDebugCaptureBridge = "installed";
      ensureDebugCaptureBridgeResultNode();
      ensureDebugCaptureBridgeButton("analysis", "AIKernel raw analysis capture", () => captureAnalysisFrame({ publish: true }));
      ensureDebugCaptureBridgeButton("display", "AIKernel display capture", () => captureDisplayFrame({ publish: true }));
      document.addEventListener("aikernel-doom-debug-capture-analysis", () => {
        captureAnalysisFrame({ publish: true })
          .then(frame => writeDebugCaptureBridgeResult("analysis", frame))
          .catch(error => writeDebugCaptureBridgeResult("analysis", {
            ok: false,
            reason: String(error?.message || error || "capture-analysis-failed"),
            analysisSafe: false,
            overlayExcluded: true
          }));
      });
      document.addEventListener("aikernel-doom-debug-capture-display", () => {
        captureDisplayFrame({ publish: true })
          .then(frame => writeDebugCaptureBridgeResult("display", frame))
          .catch(error => writeDebugCaptureBridgeResult("display", {
            ok: false,
            reason: String(error?.message || error || "capture-display-failed"),
            analysisSafe: false,
            overlayExcluded: false
          }));
      });
      installDebugCaptureBridgeApiSurface();
    }

    installDebugCaptureBridge();

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

    function toggleToposDetailView(event) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      doomToposDetailEnabled = !doomToposDetailEnabled;
      playToposToggleClick();
      syncToposDetailToggle();
      updateDoomToposHud(doomRuntime?.status?.() || {});
      focusPromptUnlessGameRunning();
    }

    function playToposToggleClick() {
      const status = doomRuntime?.status?.() || {};
      if (status.audioPlayback?.muted !== false) {
        return;
      }

      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) {
        return;
      }

      try {
        doomToposClickAudioContext = doomToposClickAudioContext || new AudioContextCtor();
        const context = doomToposClickAudioContext;
        const now = context.currentTime;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(doomToposDetailEnabled ? 1040 : 740, now);
        oscillator.frequency.exponentialRampToValueAtTime(doomToposDetailEnabled ? 1320 : 620, now + 0.045);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.018, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now);
        oscillator.stop(now + 0.065);
      } catch {
        // The HUD click is optional and must never affect gameplay control.
      }
    }

    function bindToposDetailToggle() {
      if (!doomToposDetailToggle || doomToposDetailToggle.dataset.ctgToggleBound === "true") {
        return;
      }

      doomToposDetailToggle.dataset.ctgToggleBound = "true";
      doomToposDetailToggle.addEventListener("click", toggleToposDetailView);
    }

    function syncToposDetailToggle() {
      if (!doomToposDetailToggle) {
        return;
      }

      bindToposDetailToggle();
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
      return `pipeline=${autoplay.controlPipeline || "Idle"}; objective=${autoplay.objective || "none"}; phainesis=${detections}; senseOnly=${Boolean(autoplay.senseOnly)}; manualMove=${Boolean(autoplay.manualMove)}; firstDoor(corr=${Number(firstDoor.corridorConfidence || 0).toFixed(2)},door=${Number(firstDoor.doorConfidence || 0).toFixed(2)},v9=${Number(milestones.firstDoorVision9x9Score || 0).toFixed(2)},opened=${Boolean(firstDoor.opened)},use=${Boolean(milestones.firstDoorUseAttempted)}/${Number(milestones.firstDoorUseSignature || 0).toFixed(2)}); computer(conf=${Number(computerRoom.confidence || 0).toFixed(2)},dark=${Number(computerRoom.darkAreaScore || milestones.darkAreaScore || 0).toFixed(2)},entered=${Boolean(milestones.computerRoomEntered)}); bridge(conf=${Number(bridge.confidence || 0).toFixed(2)},lane=${bridge.laneTurn || milestones.bridgeLaneTurn || "none"}); final(conf=${Number(finalRoom.confidence || 0).toFixed(2)},entered=${Boolean(milestones.finalRoomEntered)}); motion=${autoplay.motion9Signature || "000000000"}/f${Number(autoplay.motionForwardProgress || 0).toFixed(2)}/t${Number(autoplay.motionTurnScore || 0).toFixed(2)}/s${Number(autoplay.motionStallScore || 0).toFixed(2)}; action=${action.move || "none"}/${action.turn || "none"}/use=${Boolean(action.use)}/fire=${Boolean(action.fire)}`;
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
        toggleToposDetailView(event);
        return;
      }

      const autoplayButton = event.target.closest("#doom-autoplay-toggle");
      if (autoplayButton && runAutoplayToggleButton(autoplayButton)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const sensorButton = event.target.closest("button[data-sensor-toggle]");
      if (sensorButton && runSensorToggleButton(sensorButton)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const detectionButton = event.target.closest("button[data-detection-toggle]");
      if (detectionButton && runDetectionToggleButton(detectionButton)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      const button = event.target.closest("button[data-command], button[data-command-sequence]");
      if (!button) {
        return;
      }

      event.stopPropagation();
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
    });

    window.addEventListener("aikernel-doom-canvas-replaced", event => {
      const replacement = event?.detail?.canvas || document.getElementById("doom-screen");
      if (replacement) {
        doomScreen = replacement;
      }
    });

    window.addEventListener("aikernel-doom-gpu-lost", event => {
      const detail = event?.detail || {};
      appendConsoleLine("[ GPU ]", "log-warn", `GPU rendering disabled. Falling back to CPU mode (${detail.reason || detail.kind || "gpu-lost"}).`);
      updateRuntimeStatus(doomRuntime?.status?.() || latestRuntimeStatus || {}, "gpu-fallback");
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
      if (!shouldHandleDoomKeyboardEvent(event)) {
        return;
      }

      const name = keyboardDoomKeys[event.code];
      if (!name) {
        return;
      }

      keyboardDoomInputs.add(name);
      event.preventDefault();
      pressDoomInput(name);
    });

    window.addEventListener("keyup", (event) => {
      const name = keyboardDoomKeys[event.code];
      if (!name || !keyboardDoomInputs.has(name)) {
        return;
      }

      keyboardDoomInputs.delete(name);
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
      setStartupGpuMode(true, "startup-gpu");
      runApprovalUiCommand("yes");
    });

    approvalDecline?.addEventListener("click", () => {
      setStartupGpuMode(false, "startup-cpu");
      runApprovalUiCommand("yes");
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

      if (panic) {
        panic.hidden = false;
      }
      panic.style.display = "block";
      setApprovalNoticeHtml("ready");
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
