(function () {
  "use strict";

  function normalizeAction(action = {}) {
    return {
      move: action.move === "back" || action.move === "backward" ? "back" : (action.move === "forward" ? "forward" : "none"),
      turn: action.turn === "left" ? "left" : (action.turn === "right" ? "right" : "none"),
      fire: Boolean(action.fire),
      strafe: Boolean(action.strafe),
      use: Boolean(action.use),
      run: Boolean(action.run)
    };
  }

  function neutralAction(source = {}) {
    return normalizeAction({
      move: "none",
      turn: "none",
      fire: false,
      strafe: false,
      use: false,
      run: false,
      source: source.source || "zoe"
    });
  }

  function normalizeHealthSignal(health = {}) {
    return {
      likelyDead: Boolean(health.likelyDead),
      retryRequested: Boolean(health.retryRequested),
      zeroScore: Number(health.zeroScore || 0),
      activeCells: Number(health.activeCells || 0),
      retryReason: health.retryReason || "none"
    };
  }

  function auditAction(input = {}) {
    const action = normalizeAction(input.action);
    const health = normalizeHealthSignal(input.health);
    if (health.retryRequested || health.likelyDead) {
      return {
        action: neutralAction(),
        vetoed: true,
        reason: health.retryRequested ? (health.retryReason || "health-retry") : "health-death",
        health
      };
    }

    return {
      action,
      vetoed: false,
      reason: "clear",
      health
    };
  }

  self.AIKernelDoomZoe = Object.freeze({
    normalizeHealthSignal,
    auditAction
  });
})();
