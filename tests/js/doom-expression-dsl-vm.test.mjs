import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const sandbox = {
  self: {},
  console,
  Math,
  Number,
  String,
  Boolean,
  Object,
  Array
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);
const source = readFileSync(
  path.join(repoRoot, "src/DoomWeb/wwwroot/js/autoplay/control/expression-dsl.js"),
  "utf8");
vm.runInContext(source, context, { filename: "expression-dsl.js" });

const dsl = context.self.AIKernelDoomExpressionDsl;
assert(dsl?.evaluateWhen, "expression DSL should export evaluateWhen");

const empty = { parameters: {}, values: {} };
assert(dsl.evaluateWhen(empty, "(false || false)") === false, "parenthesized false OR false should stay false");
assert(dsl.evaluateWhen(empty, "(false || (false && true))") === false, "nested false group should stay false");
assert(dsl.evaluateWhen(empty, "(true && (false || true))") === true, "nested true group should evaluate true");

const ctx = {
  parameters: { gate: 0.4 },
  values: {
    health: 100,
    context: "open-space",
    routeFootObstacle: false,
    spawnCorridorGapTurnNone: false
  }
};

assert(
  dsl.evaluateWhen(ctx, "health >= 20 && (context != 'wall' || $gate >= 0.4)") === true,
  "comparisons should compose with nested OR groups");
assert(
  dsl.evaluateWhen(ctx, "(routeFootObstacle || spawnCorridorGapTurnNone)") === false,
  "Doom route obstacle OR group should not become true when both inputs are false");
