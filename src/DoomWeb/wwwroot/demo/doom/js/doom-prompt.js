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
    const commandHistory = [];
    let commandHistoryIndex = 0;
    let wasmApprovalPending = true;
    let lastRuntimeStatus = "";
    const DOOM_PULSE_INPUT_MS = 140;
    const activeDoomInputs = new Set();
    const doomKeyCodes = {
      forward: 0xad,
      back: 0xaf,
      left: 0xac,
      right: 0xae,
      fire: 0xa3,
      use: 32,
      run: 0xb6,
      strafe: 0xb8,
      enter: 13,
      escape: 27
    };
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
      const enemyConfidence = Number(autoplay.enemyConfidence || 0).toFixed(2);
      const enemyDistance = Number(autoplay.enemyDistance ?? 1).toFixed(2);
      const enemyText = `${enemyConfidence}/${autoplay.enemyTurn || "none"}/${autoplay.enemyCluster || "none"}/${autoplay.enemyFireReady ? "fire" : "hold"}/${enemyDistance}`;
      const strategyText = `${autoplay.strategyName || "unknown"}/${autoplay.strategyContext || "unknown"}/p${autoplay.strategyPriority || 0}`;
      const autoplayText = `${autoplay.enabled ? "on" : "off"}/${autoplay.mode || "disabled"}; strategy=${strategyText}; vision=${autoplay.vision || "none"}; zeroCopy=${Boolean(autoplay.zeroCopy)}; safety=${autoplay.safetyReason || "none"}; mobility=${autoplay.mobilityMode || "none"}; wall=${autoplay.wallHugSide || "left"}; target=${targetConfidence}; enemy=${enemyText}; corner=${cornerSignal}; sig=${signatureText}; dict=${dictionaryText}; regions=${autoplay.regionSignature || "000000"}; depthSig=${autoplay.depthSignature || "0000"}; depth=${depthEstimate}; faceSig=${autoplay.faceSignature || "0000000000000000"}; sound=${Boolean(autoplay.soundCueActive)}; stuck=${autoplay.stuckFrames || 0}; qStall=${autoplay.quantizedStallFrames || 0}; qDelta=${quantizedDelta}; rDelta=${regionDelta}; hudDelta=${hudDelta}; faceDelta=${faceDelta}; probe=${probe}; detach=${detach}; survey=${survey}; suppress=${autoplay.cornerSuppressFrames || 0}; repeat=${autoplay.repeatActionFrames || 0}; repeatTurn=${autoplay.repeatTurnFrames || 0}; recovery=${autoplay.recoveryFrames || 0}; loopEscape=${autoplay.loopEscapeFrames || 0}; useCooldown=${autoplay.useCooldown || 0}; predictions=${autoplay.predictions || 0}; reuse=${autoplay.reused || 0}; latency=${Math.round(autoplay.latencyMs || 0)}ms`;
      const text = `runtime=${status.state}; wasm=${status.wasmLoaded}; wad=${status.wadLoaded}; model=${status.modelLoaded}; input=${status.inputReady}; actionInput=${status.actionInputReady}; loop=${status.loopActive}; ${watchdogText}; autoplay=${autoplayText}; frames=${status.frameCount || 0}; fps=${fps}/${targetFps}; work=${workMs}ms; yield=${yieldMs}ms; gpuWait=${gpuWaitMs}ms; gpuTimeouts=${gpuTimeouts}; gpu=${status.gpuDelegate || "pending"}; framebuffer=${status.framebuffer}`;
      runtimeStatus.innerHTML = `<strong>runtime</strong>=${status.state}; wasm=${status.wasmLoaded}; wad=${status.wadLoaded}; model=${status.modelLoaded}; input=${status.inputReady}; actionInput=${status.actionInputReady}; loop=${status.loopActive}; ${watchdogText}; autoplay=${autoplayText}; frames=${status.frameCount || 0}; fps=${fps}/${targetFps}; work=${workMs}ms; yield=${yieldMs}ms; gpuWait=${gpuWaitMs}ms; gpuTimeouts=${gpuTimeouts}; gpu=${status.gpuDelegate || "pending"}; framebuffer=${status.framebuffer}`;
      doomFps.textContent = `320x200 paletted framebuffer; fps=${fps}; cap=${targetFps}; yield=${yieldMs}ms; gpu=${gpuWaitMs}ms/${gpuTimeouts}; auto=${autoplay.enabled ? "on" : "off"}`;
      doomState.textContent = `Status: ${status.state}; fps=${fps}/${targetFps}; autoplay=${autoplay.enabled ? autoplay.mode || "on" : "off"}`;

      if (text !== lastRuntimeStatus && ["ready", "running", "stable", "stopped", "failed"].includes(reason)) {
        const level = status.state === "failed" ? "log-fail" : "log-info";
        appendConsoleLine("[STATE]", level, text);
      }

      lastRuntimeStatus = text;
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
        "help": "commands: yes, doom.status, doom.start, doom.stop, doom.autoplay on, doom.autoplay off, doom.autoplay status, wasm.exports, model.status, legal, clear",
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
          halted.innerHTML = "[ READY ] AIKERNEL.DOOM USER APPROVAL RECORDED.<span>Hosted WAD/model/WASM download and validation completed.</span><span>Capability route ready: aik exec run doom -> doom.start.</span>";
          updateRuntimeStatus(status, "ready");
          appendConsoleLine("[ LOAD ]", "log-ok", `${status.state}: wasmLoaded=${status.wasmLoaded}; wadLoaded=${status.wadLoaded}; modelLoaded=${status.modelLoaded}`);
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
        appendConsoleLine("[ RESP ]", "log-info", `${status.state}: wasmLoaded=${status.wasmLoaded}; wadLoaded=${status.wadLoaded}; modelLoaded=${status.modelLoaded}; autoplay=${autoplay.enabled ? autoplay.mode || "on" : "off"}; vision=${autoplay.vision || "none"}; zeroCopy=${Boolean(autoplay.zeroCopy)}; safety=${autoplay.safetyReason || "none"}; predictions=${autoplay.predictions || 0}; reused=${autoplay.reused || 0}; fps=${status.fps || 0}/${status.targetFps || 30}; yield=${Math.round(status.uiYieldMs || 16)}ms; gpuWait=${Math.round(status.lastGpuWaitMs || 0)}ms; gpuTimeouts=${status.gpuWaitTimeouts || 0}; renderer=${status.renderer}; framebuffer=${status.framebuffer}`);
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
        const enemyConfidence = Number(autoplay.enemyConfidence || 0).toFixed(2);
        const enemyDistance = Number(autoplay.enemyDistance ?? 1).toFixed(2);
        const enemyText = `${enemyConfidence}/${autoplay.enemyTurn || "none"}/${autoplay.enemyCluster || "none"}/${autoplay.enemyFireReady ? "fire" : "hold"}/${enemyDistance}`;
        const strategyText = `${autoplay.strategyName || "unknown"}/${autoplay.strategyContext || "unknown"}/p${autoplay.strategyPriority || 0}`;
        updateRuntimeStatus(status, "autoplay-status");
        appendConsoleLine("[AUTOPLAY]", Boolean(autoplay.zeroCopy) ? "log-ok" : "log-warn", `enabled=${Boolean(autoplay.enabled)}; mode=${autoplay.mode || "disabled"}; strategy=${strategyText}; vision=${autoplay.vision || "none"}; zeroCopy=${Boolean(autoplay.zeroCopy)}; safety=${autoplay.safetyReason || "none"}; mobility=${autoplay.mobilityMode || "none"}; wall=${autoplay.wallHugSide || "left"}; target=${targetConfidence}; enemy=${enemyText}; corner=${cornerSignal}; sig=${signatureText}; dict=${dictionaryText}; regions=${autoplay.regionSignature || "000000"}; depthSig=${autoplay.depthSignature || "0000"}; depth=${depthEstimate}; faceSig=${autoplay.faceSignature || "0000000000000000"}; sound=${Boolean(autoplay.soundCueActive)}; stuck=${autoplay.stuckFrames || 0}; qStall=${autoplay.quantizedStallFrames || 0}; qDelta=${quantizedDelta}; rDelta=${regionDelta}; hudDelta=${hudDelta}; faceDelta=${faceDelta}; probe=${probe}; detach=${detach}; survey=${survey}; suppress=${autoplay.cornerSuppressFrames || 0}; repeat=${autoplay.repeatActionFrames || 0}; repeatTurn=${autoplay.repeatTurnFrames || 0}; recovery=${autoplay.recoveryFrames || 0}; loopEscape=${autoplay.loopEscapeFrames || 0}; useCooldown=${autoplay.useCooldown || 0}; predictions=${autoplay.predictions || 0}; reused=${autoplay.reused || 0}; latency=${Math.round(autoplay.latencyMs || 0)}ms`);
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

      appendConsoleLine("[ RESP ]", "log-info", responses[normalized] || `unknown command: ${command}`);
    }

    window.runWasmCommand = runWasmCommand;

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
      const button = event.target.closest("button[data-command]");
      if (!button) {
        return;
      }

      const command = button.dataset.command;
      button.disabled = true;
      try {
        await runWasmCommand(command);
      } finally {
        button.disabled = false;
        promptInput.focus();
      }
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
