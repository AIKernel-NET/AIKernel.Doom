(function () {
  "use strict";

  const version = "20260621-gpupathstatus8";

  function readObjectCaseInsensitive(source, names) {
    if (!source || typeof source !== "object") {
      return null;
    }

    for (const name of names) {
      if (source[name] && typeof source[name] === "object") {
        return source[name];
      }
    }

    return null;
  }

  function textValue(...values) {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }

    return "";
  }

  function boolValue(...values) {
    for (const value of values) {
      if (value !== undefined && value !== null) {
        return Boolean(value);
      }
    }

    return false;
  }

  function numberValue(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) {
        return number;
      }
    }

    return 0;
  }

  function memoryText(megabytes, cpuFallback) {
    if (megabytes > 0) {
      const digits = megabytes >= 10 ? 0 : 2;
      return ` · mem≈${megabytes.toFixed(digits)}MB`;
    }

    return cpuFallback ? " · mem=0MB" : "";
  }

  function adapterText(summary, preference, fallbackUsed) {
    const pref = String(preference || "").trim();
    const adapter = String(summary || "").trim();
    const parts = [];
    if (pref) {
      parts.push(`pref=${pref}`);
    }
    if (adapter && adapter !== "unknown") {
      parts.push(`adapter=${adapter}`);
    }
    if (fallbackUsed) {
      parts.push("adapterFallback=default");
    }

    return parts.length > 0 ? ` · ${parts.join(" · ")}` : "";
  }

  function shortReason(value) {
    const text = String(value || "").trim();
    if (!text) {
      return "";
    }

    return text
      .replace(/^Error:\s*/i, "")
      .replace(/\s+/g, " ")
      .slice(0, 52);
  }

  function reasonText(value) {
    const reason = shortReason(value);
    return reason ? ` · reason=${reason}` : "";
  }

  function lowerText(value) {
    return String(value || "").toLowerCase();
  }

  function resolveSource(status = {}, autoplayOverride = null) {
    const autoplay = autoplayOverride || status.autoplay || {};
    const runtime = readObjectCaseInsensitive(autoplay, ["runtime", "Runtime"]) || {};
    const framebuffer = readObjectCaseInsensitive(autoplay, ["framebuffer", "Framebuffer"]) || {};
    const overlay = readObjectCaseInsensitive(autoplay, ["debugOverlay", "DebugOverlay"]) || {};
    const statusGpuHud = readObjectCaseInsensitive(status, ["gpuHud", "GpuHud"]) || {};
    const autoplayGpuHud = readObjectCaseInsensitive(autoplay, ["gpuHud", "GpuHud"]) || {};
    const overlayGpuHud = readObjectCaseInsensitive(overlay, ["gpuHud", "GpuHud"]) || {};
    const gpuHud = Object.assign({}, overlayGpuHud, autoplayGpuHud, statusGpuHud);
    const gpuAisthesis = readObjectCaseInsensitive(gpuHud, ["gpuAisthesis", "GpuAisthesis"])
      || readObjectCaseInsensitive(statusGpuHud, ["gpuAisthesis", "GpuAisthesis"])
      || readObjectCaseInsensitive(autoplayGpuHud, ["gpuAisthesis", "GpuAisthesis"])
      || readObjectCaseInsensitive(overlayGpuHud, ["gpuAisthesis", "GpuAisthesis"])
      || readObjectCaseInsensitive(overlay, ["gpuAisthesis", "GpuAisthesis"])
      || {};
    const gpuSpatial = readObjectCaseInsensitive(gpuHud, ["gpuSpatialReasoning", "GpuSpatialReasoning"])
      || readObjectCaseInsensitive(statusGpuHud, ["gpuSpatialReasoning", "GpuSpatialReasoning"])
      || readObjectCaseInsensitive(autoplayGpuHud, ["gpuSpatialReasoning", "GpuSpatialReasoning"])
      || readObjectCaseInsensitive(overlayGpuHud, ["gpuSpatialReasoning", "GpuSpatialReasoning"])
      || readObjectCaseInsensitive(overlay, ["gpuSpatialReasoning", "GpuSpatialReasoning"])
      || {};
    const gpuPathStatus = readObjectCaseInsensitive(gpuHud, ["gpuPathStatus", "GpuPathStatus"])
      || readObjectCaseInsensitive(statusGpuHud, ["gpuPathStatus", "GpuPathStatus"])
      || readObjectCaseInsensitive(autoplayGpuHud, ["gpuPathStatus", "GpuPathStatus"])
      || readObjectCaseInsensitive(overlayGpuHud, ["gpuPathStatus", "GpuPathStatus"])
      || readObjectCaseInsensitive(overlay, ["gpuPathStatus", "GpuPathStatus"])
      || readObjectCaseInsensitive(autoplay, ["gpuPathStatus", "GpuPathStatus"])
      || readObjectCaseInsensitive(status, ["gpuPathStatus", "GpuPathStatus"])
      || null;

    return {
      autoplay,
      runtime,
      framebuffer,
      overlay,
      gpuHud,
      gpuAisthesis,
      gpuSpatial,
      gpuPathStatus
    };
  }

  function readRowsCaseInsensitive(source) {
    const rows = source?.rows || source?.Rows;
    return Array.isArray(rows) ? rows : [];
  }

  function normalizeCanonicalGpuPathStatus(source) {
    if (!source || typeof source !== "object") {
      return null;
    }

    const rows = readRowsCaseInsensitive(source)
      .map(row => ({
        label: textValue(row.label, row.Label, "").toUpperCase(),
        value: textValue(row.value, row.Value, row.mode, row.Mode, ""),
        tone: lowerText(textValue(row.tone, row.Tone, "")),
        mode: textValue(row.mode, row.Mode, ""),
        zeroCopy: boolValue(row.zeroCopy, row.ZeroCopy),
        cpuFallback: boolValue(row.cpuFallback, row.CpuFallback),
        memoryMB: numberValue(row.memoryMB, row.MemoryMB, row.memoryMb, row.MemoryMb),
        reason: shortReason(textValue(row.reason, row.Reason, ""))
      }))
      .filter(row => row.label && row.value);

    if (rows.length === 0) {
      return null;
    }

    const game = rows.find(row => row.label === "GAME") || rows[0];
    const bonsai = rows.find(row => row.label === "BONSAI") || {};
    const hud = rows.find(row => row.label === "HUD") || {};
    const sensor = rows.find(row => row.label === "SENSOR") || {};
    const text = textValue(source.text, source.Text, "game=contract; bonsai=contract; hud=contract; sensor=contract");
    const shortText = textValue(source.shortText, source.ShortText, "GPU contract");

    return Object.freeze({
      version,
      rows,
      text,
      shortText,
      game: Object.freeze({
        mode: textValue(game.mode, "GPU contract"),
        value: game.value || "",
        tone: game.tone || "gpu",
        cpuFallback: Boolean(game.cpuFallback),
        gpuAvailable: !game.cpuFallback,
        providerGpuAvailable: !game.cpuFallback,
        rawZeroCopy: Boolean(game.zeroCopy),
        memoryMB: Number(game.memoryMB || 0),
        memoryBytes: 0,
        reason: game.reason || "",
        providerBackend: "contract",
        providerSupported: true,
        providerInitialized: false,
        providerRendererInitialized: false
      }),
      bonsai: Object.freeze({
        mode: textValue(bonsai.mode, "contract"),
        value: bonsai.value || "",
        tone: bonsai.tone || "gpu",
        zeroCopy: Boolean(bonsai.zeroCopy)
      }),
      hud: Object.freeze({
        mode: textValue(hud.mode, "contract"),
        value: hud.value || "",
        tone: hud.tone || "gpu",
        compositeActive: false,
        compositeReady: true,
        panelReady: true,
        panelDoubleBuffered: false
      }),
      sensor: Object.freeze({
        mode: textValue(sensor.mode, "contract"),
        spatialMode: textValue(sensor.mode, "contract"),
        value: sensor.value || "",
        tone: sensor.tone || "gpu",
        zeroCopy: Boolean(sensor.zeroCopy),
        featureReady: true,
        maskReady: true
      }),
      canonical: true
    });
  }

  function hasRuntimeTelemetry(status, runtime, framebuffer, gpuHud) {
    return Boolean(
      status?.renderer
      || status?.gpuDelegate
      || status?.lastGpuWaitMs
      || status?.gpuWaitTimeouts
      || status?.usingCpuFallback
      || runtime?.gpuDelegate
      || runtime?.GpuDelegate
      || framebuffer?.source
      || framebuffer?.zeroCopy !== undefined
      || gpuHud?.providerBackend
      || gpuHud?.ProviderBackend
      || gpuHud?.hudCompositeActive
      || gpuHud?.HudCompositeActive
      || gpuHud?.providerInitialized
      || gpuHud?.ProviderInitialized);
  }

  function resolveGpuPathStatus(status = {}, autoplayOverride = null) {
    const source = resolveSource(status, autoplayOverride);
    const { autoplay, runtime, framebuffer, gpuHud, gpuAisthesis, gpuSpatial, gpuPathStatus } = source;
    const canonical = normalizeCanonicalGpuPathStatus(gpuPathStatus);
    if (canonical && !hasRuntimeTelemetry(status, runtime, framebuffer, gpuHud)) {
      return canonical;
    }

    const gpuDelegate = textValue(status.gpuDelegate, runtime.gpuDelegate, runtime.GpuDelegate, "pending");
    const renderer = textValue(status.renderer, runtime.renderer, runtime.Renderer, "unknown");
    const vision = textValue(autoplay.vision, framebuffer.renderFormat, framebuffer.kind, framebuffer.source?.kind, "none");
    const visionBackend = textValue(framebuffer.source?.backend, framebuffer.backend, "unknown");
    const hudSource = textValue(gpuHud.displaySource, gpuHud.DisplaySource, gpuHud.hudTarget, gpuHud.HudTarget, "none");
    const aisthesisReady = boolValue(gpuAisthesis.computeReady, gpuAisthesis.ComputeReady, gpuAisthesis.zeroCopyReady, gpuAisthesis.ZeroCopyReady);
    const spatialReady = boolValue(gpuSpatial.computeReady, gpuSpatial.ComputeReady);
    const aisthesisComputeActive = boolValue(gpuAisthesis.gpuComputeActive, gpuAisthesis.GpuComputeActive);
    const spatialComputeActive = boolValue(gpuSpatial.gpuComputeActive, gpuSpatial.GpuComputeActive);
    const rawZeroCopy = boolValue(gpuHud.rawZeroCopy, gpuHud.RawZeroCopy, status.rawZeroCopy, framebuffer.zeroCopy);
    const zeroCopy = boolValue(autoplay.zeroCopy, rawZeroCopy, gpuAisthesis.zeroCopyReady, gpuAisthesis.ZeroCopyReady);
    const bonsaiZero = boolValue(autoplay.zeroCopy, framebuffer.zeroCopy);
    const hudCompositeReady = boolValue(gpuHud.hudCompositeReady, gpuHud.HudCompositeReady);
    const hudComposite = boolValue(gpuHud.hudCompositeActive, gpuHud.HudCompositeActive, gpuHud.compositeActive, gpuHud.CompositeActive);
    const sensorZero = boolValue(gpuAisthesis.zeroCopyReady, gpuAisthesis.ZeroCopyReady);
    const sensorFeature = boolValue(gpuAisthesis.featureBufferReady, gpuAisthesis.FeatureBufferReady, gpuAisthesis.maskTextureReady, gpuAisthesis.MaskTextureReady);
    const backendText = lowerText(`${gpuDelegate} ${renderer} ${vision}`);
    const rendererText = lowerText(renderer);
    const providerCpuFallback = Boolean(gpuHud.providerUsingCpuFallback ?? gpuHud.ProviderUsingCpuFallback);
    const providerBackend = textValue(gpuHud.providerBackend, gpuHud.ProviderBackend, status.backend, "unknown");
    const providerSupported = boolValue(gpuHud.providerSupported, gpuHud.ProviderSupported, status.supported, true);
    const providerInitialized = boolValue(gpuHud.providerInitialized, gpuHud.ProviderInitialized, status.initialized);
    const providerRendererInitialized = boolValue(gpuHud.providerRendererInitialized, gpuHud.ProviderRendererInitialized, status.rendererInitialized);
    const providerLastError = textValue(gpuHud.providerLastError, gpuHud.ProviderLastError, status.lastError, runtime.lastError);
    const adapterPowerPreference = textValue(gpuHud.adapterPowerPreference, gpuHud.AdapterPowerPreference, status.adapterPowerPreference, "unknown");
    const adapterSummary = textValue(gpuHud.adapterSummary, gpuHud.AdapterSummary, status.adapterSummary, "");
    const adapterFallbackUsed = boolValue(gpuHud.adapterRequestFallbackUsed, gpuHud.AdapterRequestFallbackUsed, status.adapterRequestFallbackUsed);
    const adapterRequestError = textValue(gpuHud.adapterRequestError, gpuHud.AdapterRequestError, status.adapterRequestError, "");
    const deviceReady = boolValue(gpuHud.deviceReady, gpuHud.DeviceReady, status.deviceReady, providerInitialized && !providerCpuFallback);
    const rawTextureReady = boolValue(gpuHud.rawTextureReady, gpuHud.RawTextureReady, status.rawTextureReady, rawZeroCopy);
    const gpuBufferReady = boolValue(gpuHud.gpuBufferReady, gpuHud.GpuBufferReady, status.gpuBufferReady);
    const gpuComputeReady = boolValue(gpuHud.gpuComputeReady, gpuHud.GpuComputeReady, status.gpuComputeReady);
    const gpuComputeActive = boolValue(gpuHud.gpuComputeActive, gpuHud.GpuComputeActive, status.gpuComputeActive, aisthesisComputeActive || spatialComputeActive);
    const cpuFallback = Boolean(status.usingCpuFallback || runtime.usingCpuFallback || runtime.UsingCpuFallback)
      || providerCpuFallback
      || backendText.includes("cpu-fallback")
      || backendText.includes("webgpucomputeprovider-cpu")
      || backendText.includes("unavailable");
    const canvasFallback = rendererText.includes("canvas-fallback");
    const gpuMemory = readObjectCaseInsensitive(gpuHud, ["gpuMemory", "GpuMemory"])
      || readObjectCaseInsensitive(status, ["gpuMemory", "GpuMemory"])
      || {};
    const memoryBytes = numberValue(
      gpuMemory.totalBytes,
      gpuMemory.TotalBytes,
      gpuHud.estimatedGpuMemoryBytes,
      gpuHud.EstimatedGpuMemoryBytes,
      status.estimatedGpuMemoryBytes,
      status.EstimatedGpuMemoryBytes);
    const memoryMb = numberValue(
      gpuMemory.totalMB,
      gpuMemory.TotalMB,
      gpuHud.estimatedGpuMemoryMB,
      gpuHud.EstimatedGpuMemoryMB,
      status.estimatedGpuMemoryMB,
      status.EstimatedGpuMemoryMB,
      memoryBytes > 0 ? memoryBytes / (1024 * 1024) : 0);
    const gameTextureReady = !cpuFallback && deviceReady && (
      rendererText.includes("webgpucomputeprovider(texture)")
      || rendererText.includes("webgpu-texture")
      || rawTextureReady);
    const providerGpuAvailable = !cpuFallback && (
      backendText.includes("webgpu")
      || backendText.includes("navigator.gpu")
      || zeroCopy
      || aisthesisReady
      || spatialReady);
    const waitMs = Math.round(Number(status.lastGpuWaitMs || 0));
    const waitTimeouts = Number(status.gpuWaitTimeouts || 0);
    const gameMode = cpuFallback
      ? "CPU fallback"
      : (gameTextureReady ? "GPU" : (canvasFallback ? "Canvas CPU" : (providerGpuAvailable ? "GPU pending" : "pending")));
    const gameTone = cpuFallback || canvasFallback ? "warn" : (gameTextureReady ? "gpu" : "");
    const bonsaiMode = bonsaiZero ? "zero-copy" : "CPU/readback";
    const bonsaiTone = bonsaiZero ? "gpu" : (vision.includes("none") ? "" : "warn");
    const hudMode = hudComposite ? "GPU composite" : (hudCompositeReady ? "GPU ready / CSS active" : "DTO/CSS overlay");
    const hudTone = hudComposite ? "gpu" : (hudCompositeReady ? "warn" : (String(hudSource).toLowerCase().includes("fallback") ? "warn" : ""));
    const hudPanelReady = boolValue(gpuHud.hudPanelOverlayReady, gpuHud.HudPanelOverlayReady);
    const hudPanelDoubleBuffered = boolValue(gpuHud.hudPanelDoubleBuffered, gpuHud.HudPanelDoubleBuffered);
    const matrixSource = lowerText(textValue(gpuAisthesis.matrixUploadSource, gpuAisthesis.MatrixUploadSource, gpuAisthesis.matrixSource, gpuAisthesis.MatrixSource, gpuSpatial.matrixUploadSource, gpuSpatial.MatrixUploadSource, ""));
    const cpuPackingFallback = boolValue(gpuAisthesis.cpuPackingFallback, gpuAisthesis.CpuPackingFallback, gpuSpatial.cpuPackingFallback, gpuSpatial.CpuPackingFallback)
      || matrixSource === "js-fallback-flatten";
    const sensorMode = aisthesisComputeActive ? "gpu" : (sensorZero ? "zero" : (aisthesisReady ? "gpu-ready" : "dto"));
    const spatialMode = spatialComputeActive ? "gpu" : (spatialReady ? "gpu-ready" : "dto");
    const sensorMask = boolValue(gpuAisthesis.maskTextureReady, gpuAisthesis.MaskTextureReady);
    const sensorTone = aisthesisComputeActive || spatialComputeActive || sensorZero || aisthesisReady || spatialReady ? "gpu" : (sensorFeature ? "warn" : "");
    const gameReason = cpuFallback
      ? (providerLastError || adapterRequestError || (providerSupported ? "cpu-fallback" : "webgpu-unsupported"))
      : (gameTextureReady ? "" : (!deviceReady ? "webgpu-device-pending" : (!providerInitialized ? "provider-pending" : (!providerRendererInitialized ? "renderer-pending" : (!rawTextureReady ? "raw-gpu-texture-missing" : "")))));
    const gameValue = `${gameMode} · ${gpuDelegate} · render=${renderer} · provider=${providerBackend}${adapterText(adapterSummary, adapterPowerPreference, adapterFallbackUsed)} · wait=${waitMs}ms/${waitTimeouts}${memoryText(memoryMb, cpuFallback)}${reasonText(gameReason)}`;
    const bonsaiValue = `${bonsaiMode} · raw=${rawTextureReady ? "zcp" : "copy"} · vision=${vision} · backend=${visionBackend}`;
    const hudValue = `${hudMode} · panel=${hudPanelReady ? "gpu" : "dto"}${hudPanelDoubleBuffered ? "x2" : ""} · source=${hudSource} · mode=${textValue(gpuHud.cssOverlayMode, gpuHud.CssOverlayMode, "unknown")} · buffers=${gpuBufferReady ? "gpu" : "pending"}`;
    const matrixText = matrixSource ? ` · matrix=${matrixSource}` : "";
    const packText = cpuPackingFallback ? " · pack=cpu" : "";
    const sensorValue = `ais=${sensorMode} · spatial=${spatialMode}${matrixText}${packText} · compute=${gpuComputeActive ? "active" : (gpuComputeReady ? "ready" : "pending")} · feature=${sensorFeature ? "ready" : "pending"} · mask=${sensorMask ? "gpu" : "dto"}`;
    const rows = [
      { label: "GAME", value: gameValue, tone: gameTone },
      { label: "BONSAI", value: bonsaiValue, tone: bonsaiTone },
      { label: "HUD", value: hudValue, tone: hudTone },
      { label: "SENSOR", value: sensorValue, tone: sensorTone }
    ];
    const sensorSummary = aisthesisComputeActive || spatialComputeActive ? "gpu" : (sensorZero ? "zcp" : (aisthesisReady || spatialReady ? "gpu-ready" : "dto"));
    const text = `game=${gameMode}; bonsai=${bonsaiZero ? "zcp" : "copy"}; hud=${hudComposite ? "gpu" : (hudCompositeReady ? "ready" : "dto")}; sensor=${sensorSummary}`;
    const shortText = `${gameMode} | B:${bonsaiZero ? "zcp" : "copy"} H:${hudComposite ? "gpu" : (hudCompositeReady ? "ready" : "dto")} S:${sensorSummary}`;

    return Object.freeze({
      version,
      rows,
      text,
      shortText,
      game: Object.freeze({ mode: gameMode, value: gameValue, tone: gameTone, cpuFallback, gpuAvailable: gameTextureReady, providerGpuAvailable, rawZeroCopy: rawTextureReady, memoryMB: memoryMb, memoryBytes, reason: shortReason(gameReason), providerBackend, providerSupported, providerInitialized, providerRendererInitialized, deviceReady, adapterPowerPreference, adapterSummary, adapterFallbackUsed }),
      bonsai: Object.freeze({ mode: bonsaiMode, value: bonsaiValue, tone: bonsaiTone, zeroCopy: bonsaiZero }),
      hud: Object.freeze({ mode: hudMode, value: hudValue, tone: hudTone, compositeActive: hudComposite, compositeReady: hudCompositeReady, panelReady: hudPanelReady, panelDoubleBuffered: hudPanelDoubleBuffered }),
      sensor: Object.freeze({ mode: sensorMode, spatialMode, value: sensorValue, tone: sensorTone, zeroCopy: sensorZero, featureReady: sensorFeature, maskReady: sensorMask, gpuComputeReady, gpuComputeActive, gpuBufferReady })
    });
  }

  if (self.document?.documentElement?.dataset) {
    self.document.documentElement.dataset.doomGpuPathStatusVersion = version;
  }

  const api = Object.freeze({
    version,
    resolveGpuPathStatus
  });

  self.AIKernelDoomGpuPathStatus = api;
  if (typeof globalThis !== "undefined") {
    globalThis.AIKernelDoomGpuPathStatus = api;
  }
})();
