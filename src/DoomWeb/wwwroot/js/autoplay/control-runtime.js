(function () {
  "use strict";

  const CONTROL_RUNTIME_ID = "doom-scoped-control-runtime-shim";

  function requireExpressionDsl(name) {
    const fn = self.AIKernelDoomExpressionDsl?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomExpressionDsl.${name} is not available.`);
    }

    return fn;
  }

  function requireDecisionTrace(name) {
    const fn = self.AIKernelDoomDecisionTrace?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomDecisionTrace.${name} is not available.`);
    }

    return fn;
  }

  function requireControlEvidence(name) {
    const fn = self.AIKernelDoomControlEvidence?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomControlEvidence.${name} is not available.`);
    }

    return fn;
  }

  function requireControlContext(name) {
    const fn = self.AIKernelDoomControlContext?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomControlContext.${name} is not available.`);
    }

    return fn;
  }

  function requireControlArbitration(name) {
    const fn = self.AIKernelDoomControlArbitration?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomControlArbitration.${name} is not available.`);
    }

    return fn;
  }

  function requireRuntimePackets(name) {
    const fn = self.AIKernelDoomControlRuntimePackets?.[name];
    if (typeof fn !== "function") {
      throw new Error(`AIKernelDoomControlRuntimePackets.${name} is not available.`);
    }

    return fn;
  }

  function number(value, fallback = 0) {
    return requireExpressionDsl("number")(value, fallback);
  }

  function buildContext(profile, state) {
    return requireControlContext("createContext")(profile, state);
  }

  function valueOf(context, token) {
    return requireExpressionDsl("valueOf")(context, token);
  }

  function evaluateWhen(context, expression) {
    return requireExpressionDsl("evaluateWhen")(context, expression);
  }

  function evidenceScore(context, stage) {
    return requireControlEvidence("evidenceScore")(context, stage);
  }

  function actionFromStage(context, stage) {
    return requireRuntimePackets("actionFromStage")(context, stage, {
      controller: "control-runtime-shim",
      evaluateWhen,
      valueOf,
      number,
      evidenceScore,
      semanticScores
    });
  }

  function idleAction(state, profile) {
    return requireRuntimePackets("idleAction")(state, profile, {
      controller: "control-runtime-shim",
      semanticScores
    });
  }

  function semanticScores(state, profile) {
    return requireControlEvidence("semanticScores")(state, profile);
  }

  function compile(profile) {
    const pipeline = profile?.pipeline || {};
    const defaultThreshold = number(pipeline?.arbitration?.defaultThreshold, 0);
    const stages = requireControlArbitration("sortStages")(pipeline.stages, number);

    return {
      id: CONTROL_RUNTIME_ID,
      strategyName: pipeline.name || profile?.strategyName || "DynamicPipeline",
      predict(state) {
        const context = buildContext(profile, state || {});
        const arbitration = requireControlArbitration("evaluateStages")(context, stages, {
          defaultThreshold,
          number,
          evaluateWhen,
          evidenceScore
        });
        const evaluations = arbitration.evaluations;
        if (arbitration.selectedStage) {
          this.lastAction = actionFromStage(context, arbitration.selectedStage);
          this.predictions += 1;
          this.lastStatus = statusFromAction(this.lastAction, evaluations, context, this.predictions);
          return this.lastAction;
        }

        this.lastAction = idleAction(state || {}, profile);
        this.predictions += 1;
        this.lastStatus = statusFromAction(this.lastAction, evaluations, context, this.predictions);
        return this.lastAction;
      },
      status() {
        if (this.lastStatus) {
          return this.lastStatus;
        }

        return requireRuntimePackets("initializedStatus")({
          strategyName: this.strategyName,
          controller: "control-runtime-shim",
          runtimeId: CONTROL_RUNTIME_ID,
          predictions: this.predictions,
          createDecisionTrace: requireDecisionTrace("createPacket")
        });
      },
      predictions: 0,
      lastAction: null,
      lastStatus: null
    };
  }

  function statusFromAction(action, evaluations, context, predictions) {
    return requireRuntimePackets("statusFromAction")(action, evaluations, context, predictions, {
      runtimeId: CONTROL_RUNTIME_ID,
      controller: "control-runtime-shim",
      createDecisionTrace: requireDecisionTrace("createPacket")
    });
  }

  self.AIKernelDoomControlRuntime = Object.freeze({
    runtimeId: CONTROL_RUNTIME_ID,
    create: compile
  });
})();
