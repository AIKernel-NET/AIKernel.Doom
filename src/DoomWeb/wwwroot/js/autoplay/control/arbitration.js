(function () {
  "use strict";

  function fallbackNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function numberOf(value, numberFn, fallback = 0) {
    const parsed = (typeof numberFn === "function" ? numberFn : fallbackNumber)(value, fallback);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function sortStages(stages, numberFn = fallbackNumber) {
    return Array.isArray(stages)
      ? stages
        .filter(stage => stage?.id)
        .slice()
        .sort((a, b) => numberOf(b.priority, numberFn, 0) - numberOf(a.priority, numberFn, 0)
          || String(a.id).localeCompare(String(b.id)))
      : [];
  }

  function evaluateStages(context, stages, options = {}) {
    const numberFn = typeof options.number === "function" ? options.number : fallbackNumber;
    const evaluateWhen = typeof options.evaluateWhen === "function" ? options.evaluateWhen : () => false;
    const evidenceScore = typeof options.evidenceScore === "function" ? options.evidenceScore : () => 0;
    const defaultThreshold = numberOf(options.defaultThreshold, numberFn, 0);
    const evaluations = [];

    for (const stage of stages || []) {
      const conditionMatched = evaluateWhen(context, stage?.when || "false");
      const score = evidenceScore(context, stage);
      const threshold = numberOf(stage?.threshold, numberFn, Object.keys(stage?.evidence || {}).length ? defaultThreshold : 0);
      const evidenceMatched = score + 0.0001 >= threshold;
      const evaluation = {
        stageId: stage.id,
        objective: stage.objective || "idle",
        priority: numberOf(stage.priority, numberFn, 0),
        threshold,
        evidenceScore: score,
        conditionMatched,
        evidenceMatched,
        selected: false
      };
      evaluations.push(evaluation);
      if (conditionMatched && evidenceMatched) {
        evaluation.selected = true;
        return {
          selectedStage: stage,
          selectedEvaluation: evaluation,
          evaluations
        };
      }
    }

    return {
      selectedStage: null,
      selectedEvaluation: null,
      evaluations
    };
  }

  self.AIKernelDoomControlArbitration = Object.freeze({
    sortStages,
    evaluateStages
  });
})();
