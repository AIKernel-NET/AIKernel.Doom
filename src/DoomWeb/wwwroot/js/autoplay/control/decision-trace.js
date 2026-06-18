(function () {
  "use strict";

  const DECISION_TRACE_VERSION = "control-decision-trace-v1";
  const DEFAULT_ENTRY_LIMIT = 28;
  const CATEGORY_CODES = Object.freeze({
    priority: "P",
    telos: "T",
    objective: "O",
    evidence: "E",
    semantic: "S",
    stage: "A",
    runtime: "R",
    safety: "F"
  });

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function round2(value) {
    return Math.round(number(value) * 100) / 100;
  }

  function normalizeText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function normalizeCategory(category) {
    return normalizeText(category, "runtime").toLowerCase();
  }

  function codeForCategory(category) {
    const normalized = normalizeCategory(category);
    return CATEGORY_CODES[normalized] || normalized.slice(0, 1).toUpperCase() || "R";
  }

  function entry(category, message, options = {}) {
    const normalized = normalizeCategory(category);
    const hasValue = options.value !== undefined && options.value !== null;
    return {
      category: normalized,
      code: codeForCategory(normalized),
      message: normalizeText(message, normalized),
      value: hasValue ? round2(options.value) : null,
      level: normalizeText(options.level, "info"),
      selected: Boolean(options.selected),
      meta: options.meta && typeof options.meta === "object" ? options.meta : {}
    };
  }

  function topN(entries, limit = DEFAULT_ENTRY_LIMIT) {
    const safeLimit = Math.max(1, Math.min(64, Math.round(number(limit, DEFAULT_ENTRY_LIMIT))));
    return (Array.isArray(entries) ? entries : [])
      .filter(item => item && typeof item === "object")
      .slice(0, safeLimit);
  }

  function orderedSemanticEntries(scores, limit) {
    return Object.entries(scores || {})
      .map(([symbol, score]) => ({ symbol, score: number(score, 0) }))
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score) || a.symbol.localeCompare(b.symbol))
      .slice(0, limit);
  }

  function stageLevel(stage) {
    if (stage?.selected) {
      return "selected";
    }

    if (stage?.conditionMatched && stage?.evidenceMatched) {
      return "ready";
    }

    return "filtered";
  }

  function createPacket(input = {}) {
    const entries = [];
    const priority = number(input.priority, 0);
    const evidence = number(input.evidenceScore, 0);
    const objective = normalizeText(input.objective, "idle");
    const stage = normalizeText(input.stage, "none");
    const pipeline = normalizeText(input.pipeline, "none");

    entries.push(entry("telos", objective, { level: objective === "idle" ? "idle" : "active" }));
    entries.push(entry("objective", stage, { level: stage === "none" ? "idle" : "active" }));
    entries.push(entry("priority", `priority ${round2(priority)}`, { value: priority, level: priority > 0 ? "active" : "idle" }));
    entries.push(entry("evidence", `evidence ${round2(evidence)}`, { value: evidence, level: evidence > 0 ? "active" : "idle" }));

    for (const stageEval of input.stageEvaluations || []) {
      entries.push(entry("stage", stageEval.stageId || "stage", {
        value: stageEval.evidenceScore,
        level: stageLevel(stageEval),
        selected: Boolean(stageEval.selected),
        meta: {
          objective: stageEval.objective || "idle",
          priority: number(stageEval.priority, 0),
          threshold: number(stageEval.threshold, 0),
          conditionMatched: Boolean(stageEval.conditionMatched),
          evidenceMatched: Boolean(stageEval.evidenceMatched)
        }
      }));
    }

    for (const item of orderedSemanticEntries(input.semanticScores, 8)) {
      entries.push(entry("semantic", item.symbol, {
        value: item.score,
        level: item.score > 0 ? "observed" : "idle"
      }));
    }

    return {
      version: DECISION_TRACE_VERSION,
      runtimeId: normalizeText(input.runtimeId, "control-runtime"),
      controller: normalizeText(input.controller, "control-runtime"),
      strategyName: normalizeText(input.strategyName, "DynamicPipeline"),
      pipeline,
      stage,
      objective,
      priority: round2(priority),
      evidenceScore: round2(evidence),
      predictions: Math.max(0, Math.round(number(input.predictions, 0))),
      entries: topN(entries, input.limit),
      stageEvaluations: Array.isArray(input.stageEvaluations) ? input.stageEvaluations.slice(0, 16) : [],
      semanticScores: Object.assign({}, input.semanticScores || {})
    };
  }

  self.AIKernelDoomDecisionTrace = Object.freeze({
    version: DECISION_TRACE_VERSION,
    createPacket,
    entry,
    topN
  });
})();
