(function () {
  "use strict";

  function compileCanonicalGraph(profile = {}) {
    const pipeline = profile?.pipeline || {};
    const noesis = pipeline.noesis || {};
    const krisis = pipeline.krisis || {};
    const kinesis = pipeline.kinesis || {};
    const sensors = normalizeList(pipeline.aisthesis?.sensors, ["visual", "audio", "movement", "compass", "collision", "health"]);
    const events = normalizeRules(noesis.phainesis?.events, "event", "from", [
      { event: "looming", from: "visual" },
      { event: "stuck", from: "movement" },
      { event: "damage", from: "health" },
      { event: "enemySeen", from: "visual" }
    ]);
    const vectors = normalizeRules(noesis.nous?.vectors, "vector", "from", events.map(rule => ({
      vector: `${rule.event}Vector`,
      from: rule.event
    })));
    const toposVectors = normalizeList(krisis.topos?.vectors, ["LogosVector", "PathosVector", "EthosVector", "ToposDecisionVector"]);
    const priorities = normalizeList(krisis.kairos?.priorities, ["pathos", "ethos", "logos"]);
    const actions = normalizeList(kinesis.kinesis?.actions || kinesis.motion?.actions, ["moveForward", "moveBackward", "turnYaw", "strafe", "shoot"]);

    return {
      version: "dynamic-pipeline-4layer/v1",
      order: ["aisthesis", "phainesis", "nous", "topos", "kairos", "kinesis", "zoe"],
      nodes: [
        node("aisthesis", "Aisthesis", [], sensors),
        node("phainesis", "Phainesis", sensors, events.map(rule => rule.event)),
        node("nous", "Nous", events.map(rule => rule.event), vectors.map(rule => rule.vector)),
        node("topos", "Topos", vectors.map(rule => rule.vector), toposVectors),
        node("kairos", "Kairos", toposVectors, priorities),
        node("kinesis", "Kinesis", priorities, actions),
        node("zoe", "Zoe", ["health"], ["safeAction", "svcEvent"])
      ]
    };
  }

  function normalizeList(values, fallback) {
    return Array.isArray(values) && values.length
      ? Array.from(new Set(values.map(value => String(value || "").trim()).filter(Boolean)))
      : fallback.slice();
  }

  function normalizeRules(values, key, fromKey, fallback) {
    return Array.isArray(values) && values.length
      ? values
        .filter(rule => rule && rule[key])
        .map(rule => ({ [key]: String(rule[key]), [fromKey]: String(rule[fromKey] || "") }))
      : fallback.slice();
  }

  function node(id, stage, inputs, outputs) {
    return {
      id,
      stage,
      inputs: normalizeList(inputs, []),
      outputs: normalizeList(outputs, [])
    };
  }

  self.AIKernelDoomControlPipelineGraph = Object.freeze({
    compileCanonicalGraph
  });
})();
