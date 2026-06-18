(function () {
  "use strict";

  const DEFAULT_CATEGORY = "control";
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
      message: message.slice(0, 160),
      value: source.value ?? "",
      level: normalizeLevel(source.level),
      priority: Number.isFinite(Number(source.priority)) ? Number(source.priority) : null
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
    if (category.indexOf("control") >= 0) {
      return "C";
    }
    return String(entry?.label || category || "?").trim().slice(0, 1).toUpperCase() || "?";
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
    entriesFromDecisionTrace
  });
})();
