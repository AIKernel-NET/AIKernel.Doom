(function () {
  "use strict";

  function requireExpressionDsl(name) {
    const fn = self.AIKernelDoomExpressionDsl?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomExpressionDsl.${name} is not available.`);
    }

    return fn;
  }

  function requireSensorTensor(name) {
    const fn = self.AIKernelDoomSensorTensor?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomSensorTensor.${name} is not available.`);
    }

    return fn;
  }

  function number(value, fallback = 0) {
    return requireExpressionDsl("number")(value, fallback);
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, number(value)));
  }

  function normalizeSymbol(symbol) {
    return requireSensorTensor("normalizeSymbol")(symbol);
  }

  function camelName(symbol) {
    return normalizeSymbol(symbol).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
  }

  function confidenceValue(value) {
    if (value && typeof value === "object") {
      return clamp01(value.confidence ?? value.score ?? value.value);
    }

    return clamp01(value);
  }

  function semanticMemoryScore(state, symbol) {
    const symbols = state?.semanticMemory?.symbols || {};
    const normalized = normalizeSymbol(symbol);
    const camel = camelName(normalized);
    return Math.max(
      confidenceValue(symbols[normalized]),
      confidenceValue(symbols[camel])
    );
  }

  function directScore(state, symbol) {
    const camel = camelName(symbol);
    return clamp01(state?.[`${camel}Confidence`]);
  }

  function sensorTensorScore(state, symbol) {
    const normalized = normalizeSymbol(symbol);
    const packet = state?.sensorTensor || state?.sensorTensorPacket || null;
    if (!packet?.data) {
      return 0;
    }

    return requireSensorTensor("semanticScore")(packet, normalized);
  }

  function semanticScore(state, symbol) {
    const normalized = normalizeSymbol(symbol);
    if (!normalized) {
      return 0;
    }

    const memoryScore = semanticMemoryScore(state, normalized);
    const score = Math.max(memoryScore, directScore(state, normalized), sensorTensorScore(state, normalized));
    if (normalized === "safe-zone") {
      return Math.max(score, clamp01(state?.safeZoneConfidence));
    }

    return score;
  }

  function semanticScores(state, profile) {
    const symbols = new Set();
    for (const symbol of profile?.pipeline?.semanticMemory || []) {
      symbols.add(normalizeSymbol(symbol.id));
    }

    for (const stage of profile?.pipeline?.stages || []) {
      for (const symbol of Object.keys(stage?.evidence || {})) {
        symbols.add(normalizeSymbol(symbol));
      }
    }

    return Object.fromEntries(Array.from(symbols).sort().map(symbol => [symbol, semanticScore(state, symbol)]));
  }

  function evidenceScore(context, stage) {
    const evidence = stage?.evidence || {};
    const entries = Object.entries(evidence);
    if (entries.length === 0) {
      return 1;
    }

    return clamp01(entries.reduce((total, [symbol, weight]) => (
      total + semanticScore(context.state, symbol) * number(weight, 0)
    ), 0));
  }

  self.AIKernelDoomControlEvidence = Object.freeze({
    normalizeSymbol,
    semanticScore,
    semanticScores,
    evidenceScore
  });
})();
