(function () {
  "use strict";

  const version = "20260622-gpupathstatus19";
  const passReadinessShape = "Passes.{Aisthesis,SpatialReasoning,HudComposite}:ShaderBound=false,PipelineCached=false,BuiltInExecutor=false,InjectedExecutor=false,ReadyForBuiltIn=false";

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
        if (typeof value === "string") {
          const normalized = value.trim().toLowerCase();
          if (!normalized || normalized === "false" || normalized === "0" || normalized === "off" || normalized === "no") {
            return false;
          }

          return true;
        }

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

  function canonicalPilotMode(pilot) {
    const summary = readObjectCaseInsensitive(pilot, ["summary", "Summary"]) || {};
    const mode = textValue(summary.mode, summary.Mode, "");
    if (mode) {
      return mode.replace(/^fallback-/, "fb-").replace(/-vector$/, "").replace(/-metadata$/, "");
    }

    return textValue(pilot?.source, pilot?.Source, "pilot").replace(/^gpu\./, "");
  }

  function canonicalPilotDelta(pilot) {
    const comparison = readObjectCaseInsensitive(pilot, ["comparison", "Comparison"]) || {};
    if (comparison.available === false || comparison.Available === false) {
      return canonicalPilotMode(pilot);
    }

    const delta = numberValue(comparison.meanAbsDelta, comparison.MeanAbsDelta);
    const state = lowerText(textValue(comparison.thresholdState, comparison.ThresholdState, ""));
    const label = state === "within"
      ? "ok"
      : (state === "observe" ? "obs" : (state === "drift" ? "drift" : ""));
    const history = readObjectCaseInsensitive(pilot, ["history", "History", "canonicalParityHistory", "CanonicalParityHistory", "parityHistory", "ParityHistory"]) || {};
    const required = numberValue(history.requiredStreak, history.RequiredStreak);
    const streak = label === "ok"
      ? numberValue(history.candidateStreak, history.CandidateStreak, history.withinStreak, history.WithinStreak)
      : (label === "obs"
        ? numberValue(history.observeStreak, history.ObserveStreak)
        : (label === "drift" ? numberValue(history.driftStreak, history.DriftStreak) : NaN));
    const streakText = label && Number.isFinite(streak) && Number.isFinite(required) && required > 0
      ? `${Math.max(0, Math.floor(streak))}/${Math.floor(required)}`
      : "";
    if (Number.isFinite(delta) && delta > 0) {
      return label ? `${label}${streakText}:d${delta.toFixed(3)}` : `d${delta.toFixed(3)}`;
    }

    return label ? `${label}${streakText}` : canonicalPilotMode(pilot);
  }

  function canonicalPilotText(aisthesis, spatial) {
    const ais = readObjectCaseInsensitive(aisthesis, ["canonicalPilot", "CanonicalPilot"]);
    const sp = readObjectCaseInsensitive(spatial, ["canonicalPilot", "CanonicalPilot"]);
    const parts = [];
    if (ais) {
      parts.push(`ais:${canonicalPilotDelta(ais)}`);
    }
    if (sp) {
      parts.push(`sp:${canonicalPilotDelta(sp)}`);
    }

    return parts.length > 0 ? ` · canonical=${parts.join("/")}` : "";
  }

  function featureMaskStorageTexture(aisthesis) {
    const pilot = readObjectCaseInsensitive(aisthesis, ["canonicalPilot", "CanonicalPilot"]) || {};
    return boolValue(pilot.featureMaskStorageTexture, pilot.FeatureMaskStorageTexture);
  }

  function passReadinessValue(status, gpuHud, passNames) {
    const bridge = readObjectCaseInsensitive(gpuHud, ["canonicalBridge", "CanonicalBridge"])
      || readObjectCaseInsensitive(status, ["canonicalBridge", "CanonicalBridge"])
      || {};
    const diagnostics = readObjectCaseInsensitive(bridge, ["diagnostics", "Diagnostics"]) || bridge;
    const passes = readObjectCaseInsensitive(diagnostics, ["passes", "Passes"]) || {};
    const aliases = {
      Aisthesis: ["Aisthesis", "aisthesis", "gpu.aisthesis.raw-frame"],
      SpatialReasoning: ["SpatialReasoning", "spatialReasoning", "spatial", "gpu.spatial-reasoning"],
      HudComposite: ["HudComposite", "hudComposite", "hud", "gpu.hud.composite"]
    };
    const labels = {
      Aisthesis: "ais",
      SpatialReasoning: "sp",
      HudComposite: "hud"
    };
    const parts = [];

    for (const name of passNames) {
      const pass = readObjectCaseInsensitive(passes, aliases[name] || [name]) || null;
      if (!pass) {
        continue;
      }

      const ready = boolValue(pass.readyForBuiltIn, pass.ReadyForBuiltIn);
      const shader = boolValue(pass.shaderBound, pass.ShaderBound);
      const pipeline = boolValue(pass.pipelineCached, pass.PipelineCached);
      const builtIn = boolValue(pass.builtInExecutor, pass.BuiltInExecutor);
      const injected = boolValue(pass.injectedExecutor, pass.InjectedExecutor);
      const state = ready
        ? "on"
        : (injected
          ? "inj"
          : (shader && builtIn ? (pipeline ? "warm" : "pipe?") : (shader ? "shader" : "off")));
      parts.push(`${labels[name] || name}:${state}`);
    }

    return parts.join("/");
  }

  function passReadinessText(status, gpuHud, passNames) {
    const value = passReadinessValue(status, gpuHud, passNames);
    return value ? ` · pass=${value}` : "";
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

  function readMetadataCaseInsensitive(source) {
    const metadata = source?.metadata || source?.Metadata;
    if (!metadata || typeof metadata !== "object") {
      return {};
    }

    const normalized = {};
    for (const [key, value] of Object.entries(metadata)) {
      const metadataKey = String(key || "").trim();
      if (metadataKey) {
        normalized[metadataKey] = value === undefined || value === null ? "" : String(value);
      }
    }

    return normalized;
  }

  function canonicalPathRole(label) {
    return lowerText(label || "path");
  }

  function createCanonicalRowMetadata(row) {
    const supplied = readMetadataCaseInsensitive(row);
    const role = canonicalPathRole(textValue(row.label, row.Label, ""));
    const zeroCopy = boolValue(row.zeroCopy, row.ZeroCopy);
    const cpuFallback = boolValue(row.cpuFallback, row.CpuFallback);
    const memoryMB = numberValue(row.memoryMB, row.MemoryMB, row.memoryMb, row.MemoryMb);
    const metadata = {
      pass_id: role,
      path_role: role,
      pilot_state: "dto-projected",
      promotion_gate: "runtime-stamp-required",
      candidate_streak: "0",
      diagnostic_streak: "0",
      required_streak: "0",
      authoritative_ready: "false",
      diagnostic_ready: "false",
      execution_mode: cpuFallback ? "deterministic-fallback" : "browser-webgpu-compute",
      feature_mask_storage_texture: role === "sensor" && zeroCopy ? "true" : "false",
      frame_index: "0",
      pass_readiness: passReadinessShape,
      sample_ticks: "0",
      doom_runtime_stamped: boolValue(row.runtimeStamped, row.RuntimeStamped) ? "true" : "false",
      doom_missing_row: "false",
      doom_label: textValue(row.label, row.Label, role.toUpperCase()),
      doom_mode: textValue(row.mode, row.Mode, "unknown"),
      doom_reason: textValue(canonicalRowReason(row, supplied), "none"),
      doom_tone: textValue(row.tone, row.Tone, "unknown"),
      doom_value: textValue(row.value, row.Value, "none"),
      doom_zero_copy: zeroCopy ? "true" : "false",
      doom_cpu_fallback: cpuFallback ? "true" : "false",
      doom_memory_mb: memoryMB > 0 ? String(memoryMB) : "0"
    };

    return Object.freeze(withPromotionReadinessMetadata(Object.assign(metadata, supplied)));
  }

  function canonicalRowReason(row, suppliedMetadata = null) {
    const supplied = suppliedMetadata || readMetadataCaseInsensitive(row);
    const metadataError = textValue(supplied.metadata_validation_error, supplied.canonicalMetadataValidationError, "");
    return textValue(
      row?.reason,
      row?.Reason,
      metadataError ? `metadata-invalid:${metadataError}` : "");
  }

  function metadataBoolText(value) {
    return value ? "true" : "false";
  }

  function metadataStreakText(value) {
    return String(Math.max(0, Math.floor(numberValue(value))));
  }

  function readMetadataBool(metadata, key) {
    return lowerText(metadata?.[key] || "") === "true";
  }

  function hasMetadataValue(metadata, key) {
    return metadata?.[key] !== undefined
      && metadata?.[key] !== null
      && String(metadata[key]).trim() !== "";
  }

  function readMetadataInt(metadata, key) {
    return Math.max(0, Math.floor(numberValue(metadata?.[key])));
  }

  function splitPromotionGate(gate) {
    const text = lowerText(gate);
    if (!text) {
      return [];
    }

    return text
      .split(";")
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const separator = part.indexOf(":");
        if (separator < 0) {
          return { label: "", gate: part, raw: part };
        }

        const label = part.slice(0, separator).trim();
        const value = part.slice(separator + 1).trim();
        return { label, gate: value, raw: part };
      });
  }

  function resolvePromotionReason(metadata) {
    const gate = lowerText(metadata?.promotion_gate || "");
    if (!gate) {
      return "metadata-missing";
    }

    const gates = splitPromotionGate(gate);
    const blockingComposite = gates.find(item =>
      item.gate
      && item.gate !== "trace-candidate"
      && item.gate !== "not-applicable");
    if (blockingComposite) {
      return blockingComposite.raw || blockingComposite.gate;
    }

    if (gate !== "trace-candidate" && gate !== "not-applicable") {
      return gate;
    }

    if (gate === "not-applicable") {
      return "not-applicable";
    }

    const storageReady = readMetadataBool(metadata, "feature_mask_storage_texture");
    const diagnosticReady = readMetadataBool(metadata, "diagnostic_ready");
    const authoritativeReady = readMetadataBool(metadata, "authoritative_ready");
    const candidateStreak = readMetadataInt(metadata, "candidate_streak");
    const diagnosticStreak = readMetadataInt(metadata, "diagnostic_streak");
    const requiredStreak = readMetadataInt(metadata, "required_streak");
    const diagnosticStable = diagnosticReady && requiredStreak > 0 && diagnosticStreak >= requiredStreak;
    const candidateStable = requiredStreak > 0 && candidateStreak >= requiredStreak;

    if (!storageReady) {
      return "storage-texture-not-ready";
    }

    if (!diagnosticReady) {
      return "diagnostic-not-ready";
    }

    if (!diagnosticStable) {
      return "diagnostic-streak-not-ready";
    }

    if (!candidateStable) {
      return "candidate-streak-not-ready";
    }

    if (!authoritativeReady) {
      return "authoritative-not-ready";
    }

    return "authoritative-ready";
  }

  function withPromotionReadinessMetadata(metadata) {
    const reason = textValue(metadata.promotion_reason, resolvePromotionReason(metadata));
    const storageReady = readMetadataBool(metadata, "feature_mask_storage_texture");
    const diagnosticReady = readMetadataBool(metadata, "diagnostic_ready");
    const candidateStreak = readMetadataInt(metadata, "candidate_streak");
    const diagnosticStreak = readMetadataInt(metadata, "diagnostic_streak");
    const requiredStreak = readMetadataInt(metadata, "required_streak");
    const diagnosticStable = diagnosticReady && requiredStreak > 0 && diagnosticStreak >= requiredStreak;
    const candidateStable = requiredStreak > 0 && candidateStreak >= requiredStreak;
    const candidateReady = storageReady && diagnosticStable && candidateStable;
    if (!hasMetadataValue(metadata, "promotion_reason")) {
      metadata.promotion_reason = reason;
    }
    if (!hasMetadataValue(metadata, "promotion_blocked")) {
      metadata.promotion_blocked = reason === "not-applicable" || reason === "authoritative-ready" ? "false" : "true";
    }
    if (!hasMetadataValue(metadata, "promotion_candidate_ready")) {
      metadata.promotion_candidate_ready = candidateReady ? "true" : "false";
    }
    if (!hasMetadataValue(metadata, "promotion_diagnostic_stable")) {
      metadata.promotion_diagnostic_stable = diagnosticStable ? "true" : "false";
    }
    return metadata;
  }

  function readPilotFrom(source) {
    return readObjectCaseInsensitive(source, ["canonicalPilot", "CanonicalPilot"]) || {};
  }

  function readPilotHistory(source, pilot) {
    return readObjectCaseInsensitive(pilot, ["history", "History", "canonicalParityHistory", "CanonicalParityHistory", "parityHistory", "ParityHistory"])
      || readObjectCaseInsensitive(source, ["canonicalParityHistory", "CanonicalParityHistory", "parityHistory", "ParityHistory"])
      || {};
  }

  function resolveRuntimePilotMetadata(source, fallbackState = "runtime-observed") {
    const pilot = readPilotFrom(source);
    const comparison = readObjectCaseInsensitive(pilot, ["comparison", "Comparison"]) || {};
    const history = readPilotHistory(source, pilot);
    const available = comparison.available ?? comparison.Available;
    const thresholdState = available === false
      ? "unavailable"
      : lowerText(textValue(comparison.thresholdState, comparison.ThresholdState, history.lastThresholdState, history.LastThresholdState, fallbackState));
    const promotionGate = available === false
      ? "unavailable"
      : lowerText(textValue(comparison.promotionGate, comparison.PromotionGate, history.lastPromotionGate, history.LastPromotionGate, "not-applicable"));

    return Object.freeze({
      state: thresholdState || fallbackState,
      gate: promotionGate || "not-applicable",
      candidateStreak: numberValue(history.candidateStreak, history.CandidateStreak),
      diagnosticStreak: numberValue(history.withinStreak, history.WithinStreak, history.diagnosticStreak, history.DiagnosticStreak),
      requiredStreak: numberValue(history.requiredStreak, history.RequiredStreak),
      authoritativeReady: boolValue(history.ready, history.Ready),
      diagnosticReady: boolValue(history.diagnosticReady, history.DiagnosticReady)
    });
  }

  function mergeSensorPilotMetadata(aisthesis, spatial) {
    const ais = resolveRuntimePilotMetadata(aisthesis, "aisthesis-pending");
    const sp = resolveRuntimePilotMetadata(spatial, "spatial-pending");
    return Object.freeze({
      state: `ais:${ais.state};sp:${sp.state}`,
      gate: `ais:${ais.gate};sp:${sp.gate}`,
      candidateStreak: ais.candidateStreak,
      diagnosticStreak: Math.max(ais.diagnosticStreak, sp.diagnosticStreak),
      requiredStreak: Math.max(ais.requiredStreak, sp.requiredStreak),
      authoritativeReady: ais.authoritativeReady,
      diagnosticReady: ais.diagnosticReady || sp.diagnosticReady,
      featureMaskStorageTexture: featureMaskStorageTexture(aisthesis)
    });
  }

  function createRuntimeRowMetadata(row, pilotMetadata = null) {
    const role = canonicalPathRole(row?.label || "path");
    const pilot = pilotMetadata || resolveRuntimePilotMetadata(null);
    const memoryMB = numberValue(row?.memoryMB, row?.memoryMb);
    const metadata = {
      pass_id: role,
      path_role: role,
      pilot_state: textValue(pilot.state, "runtime-observed"),
      promotion_gate: textValue(pilot.gate, "not-applicable"),
      candidate_streak: metadataStreakText(pilot.candidateStreak),
      diagnostic_streak: metadataStreakText(pilot.diagnosticStreak),
      required_streak: metadataStreakText(pilot.requiredStreak),
      authoritative_ready: metadataBoolText(Boolean(pilot.authoritativeReady)),
      diagnostic_ready: metadataBoolText(Boolean(pilot.diagnosticReady)),
      execution_mode: row?.cpuFallback ? "deterministic-fallback" : "browser-webgpu-compute",
      feature_mask_storage_texture: metadataBoolText(Boolean(pilot.featureMaskStorageTexture)),
      frame_index: metadataStreakText(row?.frameIndex),
      pass_readiness: textValue(row?.passReadiness, passReadinessShape),
      sample_ticks: metadataStreakText(row?.sampleTicks),
      doom_runtime_stamped: "true",
      doom_missing_row: "false",
      doom_label: textValue(row?.label, role.toUpperCase()),
      doom_mode: textValue(row?.mode, "runtime"),
      doom_reason: textValue(row?.reason, "none"),
      doom_tone: textValue(row?.tone, "unknown"),
      doom_value: textValue(row?.value, "none"),
      doom_zero_copy: metadataBoolText(Boolean(row?.zeroCopy)),
      doom_cpu_fallback: metadataBoolText(Boolean(row?.cpuFallback)),
      doom_memory_mb: memoryMB > 0 ? String(memoryMB) : "0"
    };

    return Object.freeze(withPromotionReadinessMetadata(metadata));
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
        reason: shortReason(canonicalRowReason(row)),
        metadata: createCanonicalRowMetadata(row)
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
        providerRendererInitialized: false,
        metadata: game.metadata || {}
      }),
      bonsai: Object.freeze({
        mode: textValue(bonsai.mode, "contract"),
        value: bonsai.value || "",
        tone: bonsai.tone || "gpu",
        zeroCopy: Boolean(bonsai.zeroCopy),
        reason: bonsai.reason || "",
        metadata: bonsai.metadata || {}
      }),
      hud: Object.freeze({
        mode: textValue(hud.mode, "contract"),
        value: hud.value || "",
        tone: hud.tone || "gpu",
        compositeActive: false,
        compositeReady: true,
        panelReady: true,
        panelDoubleBuffered: false,
        reason: hud.reason || "",
        metadata: hud.metadata || {}
      }),
      sensor: Object.freeze({
        mode: textValue(sensor.mode, "contract"),
        spatialMode: textValue(sensor.mode, "contract"),
        value: sensor.value || "",
        tone: sensor.tone || "gpu",
        zeroCopy: Boolean(sensor.zeroCopy),
        featureReady: true,
        maskReady: true,
        reason: sensor.reason || "",
        metadata: sensor.metadata || {}
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
    const hudSwapchainActive = boolValue(gpuHud.hudSwapchainActive, gpuHud.HudSwapchainActive)
      || String(hudSource).toLowerCase().includes("gpu-hud-single-pass");
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
    const hudGpuActive = Boolean(hudComposite || hudSwapchainActive);
    const hudMode = hudComposite ? "GPU composite" : (hudGpuActive ? "GPU HUD single-pass" : (hudCompositeReady ? "GPU ready / CSS active" : "DTO/CSS overlay"));
    const hudTone = hudGpuActive ? "gpu" : (hudCompositeReady ? "warn" : (String(hudSource).toLowerCase().includes("fallback") ? "warn" : ""));
    const hudPanelReady = boolValue(gpuHud.hudPanelOverlayReady, gpuHud.HudPanelOverlayReady);
    const hudPanelDoubleBuffered = boolValue(gpuHud.hudPanelDoubleBuffered, gpuHud.HudPanelDoubleBuffered);
    const hudOffscreenConfigured = boolValue(gpuHud.hudOffscreenCompositeConfigured, gpuHud.HudOffscreenCompositeConfigured, gpuHud.hudOffscreenCompositeEnabled, gpuHud.HudOffscreenCompositeEnabled);
    const hudOffscreenEnabled = boolValue(gpuHud.hudOffscreenCompositeEnabled, gpuHud.HudOffscreenCompositeEnabled);
    const hudOffscreenDisabled = boolValue(gpuHud.hudOffscreenCompositeRuntimeDisabled, gpuHud.HudOffscreenCompositeRuntimeDisabled);
    const hudOffscreenFailures = numberValue(gpuHud.hudOffscreenCompositeFailureCount, gpuHud.HudOffscreenCompositeFailureCount);
    const hudOffscreenFps = numberValue(gpuHud.hudOffscreenCompositeMaxFps, gpuHud.HudOffscreenCompositeMaxFps);
    const matrixSource = lowerText(textValue(gpuAisthesis.matrixUploadSource, gpuAisthesis.MatrixUploadSource, gpuAisthesis.matrixSource, gpuAisthesis.MatrixSource, gpuSpatial.matrixUploadSource, gpuSpatial.MatrixUploadSource, ""));
    const cpuPackingFallback = boolValue(gpuAisthesis.cpuPackingFallback, gpuAisthesis.CpuPackingFallback, gpuSpatial.cpuPackingFallback, gpuSpatial.CpuPackingFallback)
      || matrixSource === "js-fallback-flatten";
    const sensorMode = aisthesisComputeActive ? "gpu" : (sensorZero ? "zero" : (aisthesisReady ? "gpu-ready" : "dto"));
    const spatialMode = spatialComputeActive ? "gpu" : (spatialReady ? "gpu-ready" : "dto");
    const sensorMask = boolValue(gpuAisthesis.maskTextureReady, gpuAisthesis.MaskTextureReady);
    const sensorMaskCanonical = featureMaskStorageTexture(gpuAisthesis);
    const sensorTone = aisthesisComputeActive || spatialComputeActive || sensorZero || aisthesisReady || spatialReady ? "gpu" : (sensorFeature ? "warn" : "");
    const gameReason = cpuFallback
      ? (providerLastError || adapterRequestError || (providerSupported ? "cpu-fallback" : "webgpu-unsupported"))
      : (gameTextureReady ? "" : (!deviceReady ? "webgpu-device-pending" : (!providerInitialized ? "provider-pending" : (!providerRendererInitialized ? "renderer-pending" : (!rawTextureReady ? "raw-gpu-texture-missing" : "")))));
    const gameValue = `${gameMode} · ${gpuDelegate} · render=${renderer} · provider=${providerBackend}${adapterText(adapterSummary, adapterPowerPreference, adapterFallbackUsed)} · wait=${waitMs}ms/${waitTimeouts}${memoryText(memoryMb, cpuFallback)}${reasonText(gameReason)}`;
    const bonsaiValue = `${bonsaiMode} · raw=${rawTextureReady ? "zcp" : "copy"} · vision=${vision} · backend=${visionBackend}`;
    const hudPassReadiness = passReadinessValue(status, gpuHud, ["HudComposite"]);
    const hudPassText = hudPassReadiness ? ` · pass=${hudPassReadiness}` : "";
    const hudOffscreenText = hudOffscreenDisabled
      ? ` · offscreen=disabled/${hudOffscreenFailures}`
      : (hudOffscreenConfigured ? ` · offscreen=${hudOffscreenEnabled ? `${hudOffscreenFps || "?"}fps` : "ready"}` : "");
    const hudValue = `${hudMode} · panel=${hudPanelReady ? "gpu" : "dto"}${hudPanelDoubleBuffered ? "x2" : ""}${hudPassText}${hudOffscreenText} · source=${hudSource} · mode=${textValue(gpuHud.cssOverlayMode, gpuHud.CssOverlayMode, "unknown")} · buffers=${gpuBufferReady ? "gpu" : "pending"}`;
    const matrixText = matrixSource ? ` · matrix=${matrixSource}` : "";
    const packText = cpuPackingFallback ? " · pack=cpu" : "";
    const canonicalText = canonicalPilotText(gpuAisthesis, gpuSpatial);
    const sensorPassReadiness = passReadinessValue(status, gpuHud, ["Aisthesis", "SpatialReasoning"]);
    const sensorPassText = sensorPassReadiness ? ` · pass=${sensorPassReadiness}` : "";
    const sensorValue = `ais=${sensorMode} · spatial=${spatialMode}${matrixText}${packText}${canonicalText}${sensorPassText} · compute=${gpuComputeActive ? "active" : (gpuComputeReady ? "ready" : "pending")} · feature=${sensorFeature ? "ready" : "pending"} · mask=${sensorMaskCanonical ? "canonical" : (sensorMask ? "gpu" : "dto")}`;
    const sensorPilotMetadata = mergeSensorPilotMetadata(gpuAisthesis, gpuSpatial);
    const rows = [
      { label: "GAME", mode: gameMode, value: gameValue, tone: gameTone, zeroCopy: gameTextureReady, cpuFallback, memoryMB: memoryMb, reason: gameReason },
      { label: "BONSAI", mode: bonsaiMode, value: bonsaiValue, tone: bonsaiTone, zeroCopy: bonsaiZero, cpuFallback: !bonsaiZero, memoryMB: 0, reason: bonsaiZero ? "" : "readback-copy" },
      { label: "HUD", mode: hudMode, value: hudValue, tone: hudTone, zeroCopy: hudGpuActive, cpuFallback: false, memoryMB: 0, reason: hudGpuActive ? "" : hudMode, passReadiness: hudPassReadiness },
      { label: "SENSOR", mode: `${sensorMode}/${spatialMode}`, value: sensorValue, tone: sensorTone, zeroCopy: sensorZero, cpuFallback: !(aisthesisComputeActive || spatialComputeActive || sensorZero), memoryMB: 0, reason: sensorFeature ? "" : "sensor-feature-pending", passReadiness: sensorPassReadiness }
    ];
    for (const row of rows) {
      row.metadata = createRuntimeRowMetadata(row, row.label === "SENSOR" ? sensorPilotMetadata : null);
    }
    const sensorSummary = aisthesisComputeActive || spatialComputeActive ? "gpu" : (sensorZero ? "zcp" : (aisthesisReady || spatialReady ? "gpu-ready" : "dto"));
    const text = `game=${gameMode}; bonsai=${bonsaiZero ? "zcp" : "copy"}; hud=${hudGpuActive ? "gpu" : (hudCompositeReady ? "ready" : "dto")}; sensor=${sensorSummary}`;
    const shortText = `${gameMode} | B:${bonsaiZero ? "zcp" : "copy"} H:${hudGpuActive ? "gpu" : (hudCompositeReady ? "ready" : "dto")} S:${sensorSummary}`;

    return Object.freeze({
      version,
      rows,
      text,
      shortText,
      game: Object.freeze({ mode: gameMode, value: gameValue, tone: gameTone, cpuFallback, gpuAvailable: gameTextureReady, providerGpuAvailable, rawZeroCopy: rawTextureReady, memoryMB: memoryMb, memoryBytes, reason: shortReason(gameReason), providerBackend, providerSupported, providerInitialized, providerRendererInitialized, deviceReady, adapterPowerPreference, adapterSummary, adapterFallbackUsed, metadata: rows[0].metadata }),
      bonsai: Object.freeze({ mode: bonsaiMode, value: bonsaiValue, tone: bonsaiTone, zeroCopy: bonsaiZero, metadata: rows[1].metadata }),
      hud: Object.freeze({ mode: hudMode, value: hudValue, tone: hudTone, compositeActive: hudComposite, compositeReady: hudCompositeReady, panelReady: hudPanelReady, panelDoubleBuffered: hudPanelDoubleBuffered, metadata: rows[2].metadata }),
      sensor: Object.freeze({ mode: sensorMode, spatialMode, value: sensorValue, tone: sensorTone, zeroCopy: sensorZero, featureReady: sensorFeature, maskReady: sensorMask, gpuComputeReady, gpuComputeActive, gpuBufferReady, canonicalAisthesis: readObjectCaseInsensitive(gpuAisthesis, ["canonicalPilot", "CanonicalPilot"]), canonicalSpatial: readObjectCaseInsensitive(gpuSpatial, ["canonicalPilot", "CanonicalPilot"]), metadata: rows[3].metadata })
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
