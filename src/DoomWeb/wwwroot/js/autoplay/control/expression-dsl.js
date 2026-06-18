(function () {
  "use strict";

  const EXPRESSION_DSL_ID = "doom-scoped-expression-dsl-v1";

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function readParameter(parameters, name) {
    if (Object.prototype.hasOwnProperty.call(parameters || {}, name)) {
      return parameters[name];
    }

    return 0;
  }

  function valueOf(context, token) {
    const text = String(token || "").trim();
    if (!text) {
      return false;
    }

    if (text.startsWith("$")) {
      return readParameter(context?.parameters, text.slice(1));
    }

    if (text.startsWith("-") && text.length > 1) {
      return -number(valueOf(context, text.slice(1)), 0);
    }

    if (/^-?\d+(\.\d+)?$/.test(text)) {
      return number(text, 0);
    }

    if (Object.prototype.hasOwnProperty.call(context?.values || {}, text)) {
      return context.values[text];
    }

    if ((text.startsWith("\"") && text.endsWith("\"")) || (text.startsWith("'") && text.endsWith("'"))) {
      return text.slice(1, -1);
    }

    return text;
  }

  function compare(left, right, op) {
    if (typeof left === "string" || typeof right === "string") {
      const same = String(left).toLowerCase() === String(right).toLowerCase();
      return op === "==" ? same : (op === "!=" ? !same : false);
    }

    if (typeof left === "boolean" || typeof right === "boolean") {
      const same = Boolean(left) === Boolean(right);
      return op === "==" ? same : (op === "!=" ? !same : false);
    }

    const lhs = number(left, 0);
    const rhs = number(right, 0);
    switch (op) {
      case ">=": return lhs >= rhs;
      case "<=": return lhs <= rhs;
      case "==": return Math.abs(lhs - rhs) <= 0.0001;
      case "!=": return Math.abs(lhs - rhs) > 0.0001;
      case ">": return lhs > rhs;
      case "<": return lhs < rhs;
      default: return false;
    }
  }

  function evaluateAtom(context, atom) {
    const text = String(atom || "").trim();
    for (const op of [">=", "<=", "==", "!=", ">", "<"]) {
      const index = text.indexOf(op);
      if (index > 0) {
        return compare(valueOf(context, text.slice(0, index)), valueOf(context, text.slice(index + op.length)), op);
      }
    }

    return Boolean(valueOf(context, text));
  }

  function evaluateWhen(context, expression) {
    const text = String(expression || "false").trim();
    if (text.toLowerCase() === "true") {
      return true;
    }

    if (text.toLowerCase() === "false") {
      return false;
    }

    return text
      .split("||")
      .some(orTerm => orTerm
        .split("&&")
        .every(andTerm => evaluateAtom(context, andTerm)));
  }

  self.AIKernelDoomExpressionDsl = Object.freeze({
    dslId: EXPRESSION_DSL_ID,
    number,
    readParameter,
    valueOf,
    compare,
    evaluateAtom,
    evaluateWhen
  });
})();
