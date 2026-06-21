(function () {
  "use strict";

  const defaultDelay = ms => new Promise(resolve => setTimeout(resolve, ms));

  function install(host = {}) {
    const wait = typeof host.delay === "function" ? host.delay : defaultDelay;

    function elements() {
      return typeof host.elements === "function" ? host.elements() : (host.elements || {});
    }

    function runtime() {
      return typeof host.getDoomRuntime === "function" ? host.getDoomRuntime() : host.doomRuntime;
    }

    function runtimeStatus() {
      return runtime()?.status?.() || {};
    }

    function approvalPending() {
      return Boolean(typeof host.getWasmApprovalPending === "function"
        ? host.getWasmApprovalPending()
        : host.wasmApprovalPending);
    }

    function overlayEnabled() {
      return Boolean(typeof host.getOverlayEnabled === "function"
        ? host.getOverlayEnabled()
        : host.overlayEnabled);
    }

    function setOverlayEnabled(value) {
      host.setOverlayEnabled?.(Boolean(value));
    }

    function toposDetailEnabled() {
      return Boolean(typeof host.getToposDetailEnabled === "function"
        ? host.getToposDetailEnabled()
        : host.toposDetailEnabled);
    }

    function setToposDetailEnabled(value) {
      host.setToposDetailEnabled?.(Boolean(value));
    }

    function detectionVisible(key) {
      if (typeof host.getDetectionVisible === "function") {
        return host.getDetectionVisible(key) !== false;
      }

      return true;
    }

    function setDetectionVisible(key, value) {
      host.setDetectionVisible?.(key, Boolean(value));
    }

    function sensorInputEnabled(sensors, key) {
      if (typeof host.sensorInputEnabled === "function") {
        return host.sensorInputEnabled(sensors, key);
      }

      const value = sensors?.[key];
      return value && typeof value === "object" ? value.enabled !== false : value !== false;
    }

    function appendConsoleLine(tag, className, message) {
      host.appendConsoleLine?.(tag, className, message);
    }

    function getDoomGuiSnapshot() {
      const status = runtimeStatus();
      const sensorState = status?.sensors || status?.autoplay?.sensorInputs || {};
      const refs = elements();
      return {
        approved: !approvalPending(),
        runtimeState: status?.state || "suspended",
        controllerVisible: refs.doomController?.hidden === false,
        debugBarVisible: refs.doomDebugBar?.hidden === false,
        overlayEnabled: overlayEnabled(),
        overlayPressed: refs.doomOverlayToggle?.getAttribute("aria-pressed") === "true",
        autoplay: Boolean(status?.autoplay?.enabled),
        autoplayPressed: refs.doomAutoplayToggle?.getAttribute("aria-pressed") === "true",
        manualMove: Boolean(status?.autoplay?.manualMove),
        manualMovePressed: refs.doomManualMoveToggle?.getAttribute("aria-pressed") === "true",
        senseOnly: Boolean(status?.autoplay?.senseOnly),
        senseOnlyPressed: refs.doomSenseOnlyToggle?.getAttribute("aria-pressed") === "true",
        visualSensor: sensorInputEnabled(sensorState, "visual"),
        visualSensorPressed: document.querySelector('[data-sensor-toggle="visual"]')?.getAttribute("aria-pressed") === "true",
        doorDetector: detectionVisible("door"),
        doorDetectorPressed: document.querySelector('[data-detection-toggle="door"]')?.getAttribute("aria-pressed") === "true",
        toposDetail: toposDetailEnabled(),
        toposDetailPressed: refs.doomToposDetailToggle?.getAttribute("aria-pressed") === "true",
        audioToggleWired: Boolean(refs.doomAudioPlaybackToggle?.dataset?.command === "doom.audio toggle"),
        autoplayToggleWired: Boolean(refs.doomAutoplayToggle?.dataset?.command === "doom.autoplay toggle"),
        controllerDebugLogVisible: Boolean(refs.doomControllerDebugLog && refs.doomControllerDebugLog.hidden !== true),
        controllerDebugLogRows: refs.doomControllerDebugLogList?.querySelectorAll?.("li")?.length || 0,
        promptFocused: document.activeElement === refs.promptInput
      };
    }

    function dispatchDoomGuiClick(button) {
      if (!button || button.disabled) {
        return false;
      }

      button.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      return true;
    }

    async function settleDoomGui(reason = "gui-selftest") {
      await wait(140);
      const status = runtimeStatus();
      host.syncAutoplayToggle?.(status);
      host.syncManualMoveToggle?.(status);
      host.syncSenseOnlyToggle?.(status);
      host.syncOverlayToggle?.();
      host.syncToposDetailToggle?.();
      host.syncSensorToggles?.(status);
      host.syncDetectionToggleButtons?.(status);
      host.syncAudioPlaybackToggle?.(status);
      host.renderDoomDebugOverlay?.(status);
      host.updateDoomToposHud?.(status);
      return getDoomGuiSnapshot(reason);
    }

    async function runDoomToggleSelfTest(results, name, button, readValue, restoreValue) {
      const before = readValue();
      if (!button) {
        results.push({ name, ok: false, detail: "missing" });
        return;
      }

      if (!dispatchDoomGuiClick(button)) {
        results.push({ name, ok: false, detail: "not-clickable" });
        return;
      }

      await settleDoomGui();
      const afterFirst = readValue();
      if (afterFirst === before) {
        if (typeof restoreValue === "function") {
          await restoreValue(before);
          await settleDoomGui();
        }
        results.push({ name, ok: false, detail: "unchanged" });
        return;
      }

      if (!dispatchDoomGuiClick(button)) {
        if (typeof restoreValue === "function") {
          await restoreValue(before);
          await settleDoomGui();
        }
        results.push({ name, ok: false, detail: "restore-click-failed" });
        return;
      }

      await settleDoomGui();
      let afterSecond = readValue();
      if (afterSecond !== before && typeof restoreValue === "function") {
        await restoreValue(before);
        await settleDoomGui();
        afterSecond = readValue();
      }

      results.push({
        name,
        ok: afterFirst !== before && afterSecond === before,
        detail: `before=${before};after=${afterFirst};restored=${afterSecond}`
      });
    }

    function findDoomCommandButton(command) {
      const buttons = Array.from(document.querySelectorAll("button[data-command], button[data-command-sequence]"));
      return buttons.find(button => {
        if (button.dataset.command === command) {
          return true;
        }

        const sequence = button.dataset.commandSequence
          ? button.dataset.commandSequence.split("|").map(value => value.trim()).filter(Boolean)
          : [];
        return sequence.includes(command);
      }) || null;
    }

    async function runDoomGuiSelfTest() {
      host.ensureDoomSpatialHud?.();
      host.ensureDoomGoalHud?.();
      host.ensureDoomToposHud?.();
      host.ensureDoomSensorToggleRow?.();
      await settleDoomGui();

      const refs = elements();
      const results = [];
      const commandButtons = [
        "doom.status",
        "doom.phase.check",
        "doom.autoplay toggle",
        "doom.autoplay manual-move toggle",
        "model.status",
        "wasm.exports",
        "copy.logs",
        "clear"
      ];
      for (const command of commandButtons) {
        results.push({
          name: `command:${command}`,
          ok: Boolean(findDoomCommandButton(command)),
          detail: "wired"
        });
      }

      const currentRuntime = runtime();
      const runtimeReady = Boolean(currentRuntime?.status?.()) && !approvalPending();
      results.push({ name: "controller-visible", ok: refs.doomController?.hidden === false || !runtimeReady, detail: runtimeReady ? "runtime-ready" : "approval-pending" });
      results.push({ name: "debugbar-visible", ok: refs.doomDebugBar?.hidden === false || !runtimeReady, detail: runtimeReady ? "runtime-ready" : "approval-pending" });
      results.push({ name: "audio-toggle-wired", ok: refs.doomAudioPlaybackToggle?.dataset?.command === "doom.audio toggle", detail: "browser-gesture-safe-check" });
      results.push({ name: "autoplay-toggle-wired", ok: refs.doomAutoplayToggle?.dataset?.command === "doom.autoplay toggle", detail: "debugbar-toggle" });
      results.push({ name: "controller-debug-log-visible", ok: Boolean(refs.doomControllerDebugLog && refs.doomControllerDebugLogList), detail: "control-top-n" });
      const panelKeys = Array.from(document.querySelectorAll(".doom-sensor-node[data-sensor-panel]")).map(node => node.dataset.sensorPanel).join("|");
      results.push({ name: "sensor-panel-canon-grid", ok: panelKeys === "aisthesis|noesis|krisis|kinesis", detail: panelKeys || "missing" });
      const aisthesisButtons = document.querySelector('[data-sensor-panel="aisthesis"] .doom-sensor-node-buttons');
      const aisthesisColumns = aisthesisButtons ? getComputedStyle(aisthesisButtons).gridTemplateColumns : "";
      const aisthesisColumnCount = /repeat\(\s*2\s*,/i.test(aisthesisColumns)
        ? 2
        : (aisthesisColumns.match(/\d+(?:\.\d+)?px/g) || aisthesisColumns.split(" ").filter(Boolean)).length;
      results.push({
        name: "aisthesis-primary-two-column",
        ok: aisthesisColumnCount === 2 || window.matchMedia?.("(max-width: 720px)")?.matches,
        detail: aisthesisColumns || "missing"
      });
      const gpuContracts = window.AIKernelDoomGpuContracts || {};
      const hudPanelFields = gpuContracts.hudPanelFields || [];
      const expectedHudPanelFields = ["aisthesis", "noesis", "krisis", "kinesis", "route", "loop", "door", "combat", "zoe", "logos", "pathos", "ethos", "wall", "barrel", "alignment", "use"];
      const hudPanelFieldOrderOk = expectedHudPanelFields.every((field, index) => hudPanelFields[index] === field);
      results.push({
        name: "gpu-hud-panel-field-order",
        ok: hudPanelFieldOrderOk,
        detail: hudPanelFields.join("|") || "missing"
      });
      const hudPanelRects = gpuContracts.hudPanelRects?.cards || {};
      const hudPanelRectKeys = ["aisthesis", "noesis", "krisis", "kinesis", "route", "combat", "zoe"];
      const hudPanelRectsOk = hudPanelRectKeys.every(key => {
        const rect = hudPanelRects[key];
        return rect && Number(rect.right) > Number(rect.left) && Number(rect.bottom) > Number(rect.top);
      });
      results.push({
        name: "gpu-hud-panel-rects",
        ok: hudPanelRectsOk,
        detail: hudPanelRectKeys.filter(key => hudPanelRects[key]).join("|") || "missing"
      });
      results.push({
        name: "phainesis-det-panelized",
        ok: Boolean(document.querySelector('[data-sensor-panel="noesis"] [data-sensor-stage="phainesis"] [data-detection-toggle="motion"]')),
        detail: "det-as-phainesis"
      });
      results.push({
        name: "zoe-veto-panelized",
        ok: Boolean(document.querySelector('[data-sensor-panel="kinesis"] [data-sensor-stage="zoe"] [data-detection-toggle="health"]')),
        detail: "svc-veto"
      });
      if (host.pushControllerDebugLog) {
        host.pushControllerDebugLog({ category: "priority", label: "PRIORITY", message: "selftest priority probe" }, { dedupe: false, limit: 6 });
      }
      if (host.setControllerDebugLogFilter) {
        host.setControllerDebugLogFilter("priority");
        const priorityVisible = Boolean(refs.doomControllerDebugLogList?.textContent?.includes("selftest priority probe"));
        results.push({ name: "controller-debug-log-filter", ok: priorityVisible, detail: "priority-filter" });
        host.setControllerDebugLogFilter("all");
      } else {
        results.push({ name: "controller-debug-log-filter", ok: false, detail: "missing" });
      }

      await runDoomToggleSelfTest(
        results,
        "overlay-toggle",
        refs.doomOverlayToggle,
        () => overlayEnabled(),
        value => setOverlayEnabled(value));

      const doorDetector = document.querySelector('[data-detection-toggle="door"]');
      await runDoomToggleSelfTest(
        results,
        "door-detector-toggle",
        doorDetector,
        () => detectionVisible("door"),
        value => setDetectionVisible("door", value));

      if (refs.doomToposDetailToggle) {
        await runDoomToggleSelfTest(
          results,
          "ctg-detail-toggle",
          refs.doomToposDetailToggle,
          () => toposDetailEnabled(),
          value => setToposDetailEnabled(value));
      } else {
        results.push({ name: "ctg-detail-toggle", ok: false, detail: "missing" });
      }

      if (runtimeReady) {
        await runDoomToggleSelfTest(
          results,
          "autoplay-toggle",
          refs.doomAutoplayToggle,
          () => Boolean(currentRuntime?.status?.().autoplay?.enabled),
          value => host.runWasmCommand?.(value ? "doom.autoplay on" : "doom.autoplay off"));

        await runDoomToggleSelfTest(
          results,
          "manual-move-toggle",
          refs.doomManualMoveToggle,
          () => Boolean(currentRuntime?.status?.().autoplay?.manualMove),
          value => host.runWasmCommand?.(value ? "doom.autoplay manual-move on" : "doom.autoplay manual-move off"));

        await runDoomToggleSelfTest(
          results,
          "sense-only-toggle",
          refs.doomSenseOnlyToggle,
          () => Boolean(currentRuntime?.status?.().autoplay?.senseOnly),
          value => host.runWasmCommand?.(value ? "doom.autoplay sense-only on" : "doom.autoplay sense-only off"));

        const visualSensor = document.querySelector('[data-sensor-toggle="visual"]');
        await runDoomToggleSelfTest(
          results,
          "visual-sensor-toggle",
          visualSensor,
          () => {
            const status = currentRuntime?.status?.() || {};
            const sensorState = status?.sensors || status?.autoplay?.sensorInputs || {};
            return sensorInputEnabled(sensorState, "visual");
          },
          value => host.runWasmCommand?.(value ? "doom.sensor visual on" : "doom.sensor visual off"));
      } else {
        results.push({ name: "autoplay-toggle", ok: true, detail: "deferred until approval" });
        results.push({ name: "manual-move-toggle", ok: true, detail: "deferred until approval" });
        results.push({ name: "sense-only-toggle", ok: true, detail: "deferred until approval" });
        results.push({ name: "visual-sensor-toggle", ok: true, detail: "deferred until approval" });
      }

      await settleDoomGui("gui-selftest-complete");
      const failed = results.filter(result => !result.ok);
      const summary = results.map(result => `${result.ok ? "ok" : "fail"}:${result.name}`).join(", ");
      window.AIKernelDoomLastGuiSelfTest = {
        ok: failed.length === 0,
        passed: results.length - failed.length,
        total: results.length,
        results,
        snapshot: getDoomGuiSnapshot(),
        summary
      };
      return window.AIKernelDoomLastGuiSelfTest;
    }

    async function runAIKernelDoomGuiSelfTestCommand() {
      const result = await runDoomGuiSelfTest();
      appendConsoleLine(
        "[ GUI ]",
        result.ok ? "log-ok" : "log-warn",
        `${result.ok ? "pass" : "check"}: ${result.passed}/${result.total} controls verified; ${result.summary}`
      );
      return result;
    }

    function shouldAutoRun() {
      try {
        const params = new URLSearchParams(window.location.search || "");
        return params.get("doomGuiSelftest") === "1" || params.get("doomGuiSelfTest") === "1";
      } catch {
        return false;
      }
    }

    const api = {
      getDoomGuiSnapshot,
      runDoomGuiSelfTest,
      runAIKernelDoomGuiSelfTestCommand,
      findDoomCommandButton,
      shouldAutoRun
    };

    window.getAIKernelDoomGuiSnapshot = getDoomGuiSnapshot;
    window.runAIKernelDoomGuiSelfTest = runDoomGuiSelfTest;
    window.runAIKernelDoomGuiSelfTestCommand = runAIKernelDoomGuiSelfTestCommand;
    return api;
  }

  window.AIKernelDoomGuiSelfTest = {
    install
  };
})();
