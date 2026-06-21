(function () {
  "use strict";

  const DEFAULT_CATEGORY = "control";
  const ACTION_CATEGORY = "action";
  const KNOWN_LEVELS = new Set(["info", "ok", "warn", "error"]);
  const ACTIVE_LEVELS = new Set(["active", "observed", "ready", "selected"]);
  const WARN_LEVELS = new Set(["blocked", "failed", "fail"]);

  function normalizeCategory(value) {
    return String(value || DEFAULT_CATEGORY)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 28) || DEFAULT_CATEGORY;
  }

  function normalizeLevel(value) {
    const level = String(value || "").trim().toLowerCase();
    if (KNOWN_LEVELS.has(level)) {
      return level;
    }
    if (ACTIVE_LEVELS.has(level)) {
      return "ok";
    }
    if (WARN_LEVELS.has(level)) {
      return "warn";
    }
    return "info";
  }

  function normalizeEntry(entry, fallbackCategory = DEFAULT_CATEGORY) {
    const source = entry && typeof entry === "object" ? entry : { message: entry };
    const category = normalizeCategory(source.category || source.kind || source.type || fallbackCategory);
    const label = String(source.code || source.label || category.toUpperCase()).trim().slice(0, 16) || category.toUpperCase();
    const message = String(source.message ?? source.value ?? source.text ?? "").trim() || label;
    return {
      id: String(source.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      timestamp: source.timestamp || new Date().toISOString(),
      category,
      label,
      message: message.slice(0, 260),
      value: source.value ?? "",
      level: normalizeLevel(source.level),
      priority: Number.isFinite(Number(source.priority)) ? Number(source.priority) : null,
      commandSignature: source.commandSignature || source.signature || "",
      repeatFrames: Number.isFinite(Number(source.repeatFrames)) ? Number(source.repeatFrames) : null,
      prediction: Number.isFinite(Number(source.prediction)) ? Number(source.prediction) : null
    };
  }

  function entryMatches(entry, filter) {
    const normalized = normalizeCategory(filter || "all");
    return normalized === "all"
      || entry.category === normalized
      || entry.category.indexOf(normalized) >= 0
      || String(entry.label || "").toLowerCase().indexOf(normalized) >= 0;
  }

  function categoryGlyph(entry) {
    const category = normalizeCategory(entry?.category || entry?.label || DEFAULT_CATEGORY);
    if (category.indexOf("priority") >= 0) {
      return "P";
    }
    if (category.indexOf("telos") >= 0) {
      return "T";
    }
    if (category.indexOf("objective") >= 0) {
      return "O";
    }
    if (category.indexOf("option") >= 0) {
      return "S";
    }
    if (category.indexOf(ACTION_CATEGORY) >= 0 || category.indexOf("command") >= 0) {
      return "A";
    }
    if (category.indexOf("control") >= 0) {
      return "C";
    }
    return String(entry?.label || category || "?").trim().slice(0, 1).toUpperCase() || "?";
  }

  function readObject(value) {
    return value && typeof value === "object" ? value : {};
  }

  function readField(source, camel, pascal = "") {
    const object = readObject(source);
    if (Object.prototype.hasOwnProperty.call(object, camel)) {
      return object[camel];
    }
    if (pascal && Object.prototype.hasOwnProperty.call(object, pascal)) {
      return object[pascal];
    }
    return undefined;
  }

  function readNumber(...values) {
    for (const value of values) {
      const number = Number(value);
      if (Number.isFinite(number)) {
        return number;
      }
    }
    return 0;
  }

  function readText(...values) {
    for (const value of values) {
      const text = String(value ?? "").trim();
      if (text) {
        return text;
      }
    }
    return "";
  }

  function readBoolean(value) {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    const text = String(value ?? "").trim().toLowerCase();
    return text === "true" || text === "1" || text === "yes" || text === "on";
  }

  function normalizeAction(action) {
    const source = readObject(action);
    const move = readText(
      readField(source, "move", "Move"),
      readField(source, "moveForward", "MoveForward") ? "forward" : "",
      readField(source, "moveBackward", "MoveBackward") ? "back" : "",
      "none"
    ).toLowerCase();
    const turn = readText(
      readField(source, "turn", "Turn"),
      readField(source, "turnLeft", "TurnLeft") ? "left" : "",
      readField(source, "turnRight", "TurnRight") ? "right" : "",
      "none"
    ).toLowerCase();

    return {
      move,
      turn,
      strafe: readBoolean(readField(source, "strafe", "Strafe")),
      run: readBoolean(readField(source, "run", "Run")),
      use: readBoolean(readField(source, "use", "Use")),
      fire: readBoolean(readField(source, "fire", "Fire"))
    };
  }

  function actionSignature(action) {
    const normalized = normalizeAction(action);
    const parts = [];
    if (normalized.move && normalized.move !== "none") {
      parts.push(normalized.move);
    }
    if (normalized.turn && normalized.turn !== "none") {
      parts.push(`turn:${normalized.turn}`);
    }
    if (normalized.strafe) {
      parts.push("strafe");
    }
    if (normalized.run) {
      parts.push("run");
    }
    if (normalized.use) {
      parts.push("use");
    }
    if (normalized.fire) {
      parts.push("fire");
    }
    return parts.length ? parts.join("+") : "idle";
  }

  function actionEntryFromStatus(status = {}, reason = "status") {
    const autoplay = readObject(status.autoplay || status.Autoplay);
    const semantic = readObject(autoplay.semanticMemory || autoplay.SemanticMemory);
    const pipelineState = readObject(autoplay.pipelineState || autoplay.PipelineState);
    const kinesis = readObject(pipelineState.kinesis || pipelineState.Kinesis);
    const kinesisAction = readObject(kinesis.action || kinesis.Action);
    const action = readObject(autoplay.action || autoplay.currentAction || autoplay.lastAction || kinesisAction);
    const signature = actionSignature(action);
    const prediction = readNumber(autoplay.predictions, autoplay.Predictions, status.frameCount, status.FrameCount);
    const repeat = readNumber(
      autoplay.actionRepeatFrames,
      autoplay.repeatActionFrames,
      kinesis.actionRepeatFrames,
      kinesis.ActionRepeatFrames
    );
    const moveRepeat = readNumber(autoplay.moveRepeatFrames, kinesis.moveRepeatFrames, kinesis.MoveRepeatFrames);
    const turnRepeat = readNumber(autoplay.repeatTurnFrames, autoplay.turnRepeatFrames, kinesis.turnRepeatFrames, kinesis.TurnRepeatFrames);
    const useCooldown = readNumber(autoplay.useCooldown, kinesis.usePulseCooldownFrames, kinesis.UsePulseCooldownFrames);
    const phase = readText(autoplay.controlPipeline, autoplay.pipeline, semantic.phase, status.state, "Idle");
    const stage = readText(
      autoplay.strategyContext,
      autoplay.mobilityMode,
      autoplay.safetyReason,
      autoplay.strategyName,
      phase
    );
    const objective = readText(autoplay.objective, semantic.objective, "none");
    const loop = readText(autoplay.routeLoopKind, autoplay.routeAbortHint, autoplay.autoplayState?.routeLoopKind, "none");
    const enabled = readBoolean(autoplay.enabled);
    const repeatText = `rep=${repeat} move=${moveRepeat} turn=${turnRepeat}`;
    const pulseText = useCooldown > 0 ? ` useCd=${useCooldown}` : "";
    const loopText = loop && loop !== "none" ? ` loop=${loop}` : "";
    const reasonText = reason && reason !== "status" ? ` ${reason}` : "";
    const active = signature !== "idle";
    const level = repeat >= 18 || turnRepeat >= 12 ? "warn" : (active ? "ok" : "info");
    const message = `#${prediction} ${signature} ${repeatText}${pulseText} phase=${phase} stage=${stage} obj=${objective}${loopText}${reasonText}`;

    return normalizeEntry({
      id: `action-${prediction}-${signature}-${repeat}-${moveRepeat}-${turnRepeat}-${Date.now()}`,
      category: ACTION_CATEGORY,
      label: "ACT",
      message,
      value: signature,
      level,
      commandSignature: signature,
      repeatFrames: repeat,
      prediction,
      enabled
    }, ACTION_CATEGORY);
  }

  function entriesFromDecisionTrace(trace, optionText, reason = "status") {
    const entries = Array.isArray(trace?.entries) ? trace.entries : [];
    if (!entries.length) {
      return [];
    }

    const timestamp = trace.timestamp || new Date().toISOString();
    const prediction = Number.isFinite(Number(trace.predictions)) ? Number(trace.predictions) : 0;
    const mapped = entries.map((entry, index) => normalizeEntry({
      id: `trace-${prediction}-${index}-${entry?.category || DEFAULT_CATEGORY}-${entry?.code || ""}`,
      timestamp,
      category: entry?.category || DEFAULT_CATEGORY,
      code: entry?.code,
      label: entry?.label,
      message: entry?.message,
      value: entry?.value ?? "",
      level: entry?.level,
      priority: entry?.meta?.priority ?? (entry?.category === "priority" ? entry?.value : null)
    }, DEFAULT_CATEGORY));

    mapped.push(normalizeEntry({
      id: `trace-${prediction}-control-options`,
      timestamp,
      category: DEFAULT_CATEGORY,
      code: "C",
      message: `${reason}: ${optionText}`,
      value: optionText,
      level: "info"
    }, DEFAULT_CATEGORY));
    return mapped;
  }

  window.AIKernelDoomControllerDebugLog = Object.freeze({
    normalizeCategory,
    normalizeLevel,
    normalizeEntry,
    entryMatches,
    categoryGlyph,
    actionSignature,
    actionEntryFromStatus,
    entriesFromDecisionTrace
  });
})();
