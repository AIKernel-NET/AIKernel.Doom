(function () {
  "use strict";

  const version = "20260621-debugcapture3";

  function contractValue(name, fallback) {
    const value = self.AIKernelDoomGpuContracts?.[name];
    return typeof value === "string" && value.length > 0 ? value : fallback;
  }

  function rawFramebufferUnavailableSource() {
    return `${contractValue("rawFramebufferWireName", "raw-framebuffer")}-unavailable`;
  }

  function rawFramebufferTarget() {
    return contractValue("rawFramebufferTarget", "doom");
  }

  function displayCanvasFallbackSource() {
    return contractValue("displayCanvasFallbackWireName", "display-canvas-fallback");
  }

  function aisthesisFeatureSource() {
    return contractValue("aisthesisFeatureTarget", "doom.gpu.aisthesis.features");
  }

  function spatialReasoningSource() {
    return contractValue("spatialOutputTarget", "doom.gpu.spatial.reasoning");
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeRuntimeCapture(capture, usage) {
    return {
      ok: Boolean(capture?.imageDataUrl),
      contentType: "image/png",
      width: 320,
      height: 200,
      dataUrl: capture?.imageDataUrl || "",
      source: capture?.captureSource || rawFramebufferUnavailableSource(),
      captureTarget: capture?.captureTarget || rawFramebufferTarget(),
      displayTarget: capture?.displayTarget || capture?.hudComposite?.displayTarget || "",
      displaySource: capture?.displaySource || capture?.hudComposite?.displaySource || "",
      overlayExcluded: capture?.overlayExcluded !== false,
      usage,
      analysisSafe: capture?.overlayExcluded !== false && Boolean(capture?.imageDataUrl),
      hudComposite: capture?.hudComposite || null,
      timestamp: capture?.timestamp || nowIso(),
      frame: capture?.frame ?? null
    };
  }

  function suppressedDisplayFallback(capture, usage) {
    return {
      ok: false,
      reason: "raw-framebuffer-unavailable",
      contentType: "image/png",
      width: 320,
      height: 200,
      dataUrl: "",
      source: capture?.captureSource || `${displayCanvasFallbackSource()}-suppressed`,
      overlayExcluded: false,
      usage,
      analysisSafe: false,
      timestamp: capture?.timestamp || nowIso(),
      frame: capture?.frame ?? null
    };
  }

  function unavailableFrame(reason, usage) {
    return {
      ok: false,
      reason,
      overlayExcluded: true,
      usage,
      analysisSafe: false,
      timestamp: nowIso()
    };
  }

  function displayCanvasFallback(canvas, usage) {
    return {
      ok: true,
      contentType: "image/png",
      width: canvas.width || canvas.clientWidth || 0,
      height: canvas.height || canvas.clientHeight || 0,
      dataUrl: canvas.toDataURL("image/png"),
      source: displayCanvasFallbackSource(),
      overlayExcluded: false,
      usage,
      analysisSafe: false,
      timestamp: nowIso()
    };
  }

  function createDebugCapture(options = {}) {
    const getRuntime = typeof options.getRuntime === "function"
      ? options.getRuntime
      : () => options.runtime || null;
    const getCanvas = typeof options.getCanvas === "function"
      ? options.getCanvas
      : () => options.canvas || null;
    const publishCapture = typeof options.publishCapture === "function"
      ? options.publishCapture
      : () => null;
    const getLastPublishedCapture = typeof options.getLastPublishedCapture === "function"
      ? options.getLastPublishedCapture
      : () => self.AIKernelDoomLastPublishedRawCapture || null;
    const getGpuAisthesisFeatures = typeof options.getGpuAisthesisFeatures === "function"
      ? options.getGpuAisthesisFeatures
      : null;
    const getGpuSpatialReasoningOutput = typeof options.getGpuSpatialReasoningOutput === "function"
      ? options.getGpuSpatialReasoningOutput
      : null;

    async function captureGameFrame(captureOptions = {}) {
      const allowDisplayFallback = captureOptions?.allowDisplayFallback === true;
      const publish = captureOptions?.publish !== false;
      const usage = allowDisplayFallback ? "debug-display-fallback" : "analysis-raw-framebuffer";
      const runtime = getRuntime();

      if (runtime && typeof runtime.captureSenseOnlyFrame === "function") {
        const capture = await runtime.captureSenseOnlyFrame();
        const frame = capture?.overlayExcluded === false && !allowDisplayFallback
          ? suppressedDisplayFallback(capture, usage)
          : normalizeRuntimeCapture(capture, usage);
        if (publish) {
          publishCapture(frame);
        }
        return frame;
      }

      const canvas = getCanvas();
      if (!allowDisplayFallback || !canvas || typeof canvas.toDataURL !== "function") {
        const frame = unavailableFrame(
          allowDisplayFallback ? "game-canvas-unavailable" : rawFramebufferUnavailableSource(),
          usage);
        if (publish) {
          publishCapture(frame);
        }
        return frame;
      }

      const frame = displayCanvasFallback(canvas, usage);
      if (publish) {
        publishCapture(frame);
      }
      return frame;
    }

    async function captureRawGameFrame(captureOptions = {}) {
      return captureGameFrame(Object.assign({}, captureOptions, {
        allowDisplayFallback: false
      }));
    }

    async function captureAnalysisFrame(captureOptions = {}) {
      return captureRawGameFrame(Object.assign({}, captureOptions, {
        publish: captureOptions?.publish !== false
      }));
    }

    async function captureDisplayFrame(captureOptions = {}) {
      return captureGameFrame(Object.assign({}, captureOptions, {
        allowDisplayFallback: true,
        publish: captureOptions?.publish !== false
      }));
    }

    async function captureGpuAisthesisFeatures(captureOptions = {}) {
      if (!getGpuAisthesisFeatures) {
        return {
          ok: false,
          reason: "gpu-aisthesis-readback-unavailable",
          source: aisthesisFeatureSource(),
          usage: "debug-gpu-aisthesis-readback",
          timestamp: nowIso()
        };
      }

      const capture = await getGpuAisthesisFeatures(captureOptions);
      return Object.assign({
        ok: Boolean(capture?.ok),
        source: capture?.source || aisthesisFeatureSource(),
        usage: "debug-gpu-aisthesis-readback",
        timestamp: nowIso()
      }, capture || {});
    }

    async function captureGpuSpatialReasoningOutput(captureOptions = {}) {
      if (!getGpuSpatialReasoningOutput) {
        return {
          ok: false,
          reason: "gpu-spatial-reasoning-readback-unavailable",
          source: spatialReasoningSource(),
          usage: "debug-gpu-spatial-reasoning-readback",
          timestamp: nowIso()
        };
      }

      const capture = await getGpuSpatialReasoningOutput(captureOptions);
      return Object.assign({
        ok: Boolean(capture?.ok),
        source: capture?.source || spatialReasoningSource(),
        usage: "debug-gpu-spatial-reasoning-readback",
        timestamp: nowIso()
      }, capture || {});
    }

    return Object.freeze({
      version,
      captureGameFrame,
      captureRawGameFrame,
      captureAnalysisFrame,
      captureDisplayFrame,
      captureGpuAisthesisFeatures,
      captureGpuSpatialReasoningOutput,
      getLastPublishedCapture
    });
  }

  if (self.document?.documentElement?.dataset) {
    self.document.documentElement.dataset.doomDebugCaptureVersion = version;
  }

  self.AIKernelDoomDebugCaptureModule = Object.freeze({
    version,
    createDebugCapture
  });
})();
