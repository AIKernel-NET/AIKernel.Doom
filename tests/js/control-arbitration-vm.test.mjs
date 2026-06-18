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

const sandbox = { self: {}, Number, Object, String, Math };
const context = vm.createContext(sandbox);
const source = readFileSync(
  path.join(repoRoot, "src/DoomWeb/wwwroot/js/autoplay/control/arbitration.js"),
  "utf8"
);
vm.runInContext(source, context, { filename: "arbitration.js" });

const arbitration = context.self.AIKernelDoomControlArbitration;
assert(arbitration?.sortStages, "control arbitration module was not exported");

const stages = arbitration.sortStages([
  { id: "beta", priority: 10 },
  { id: "alpha", priority: 10 },
  { id: "gamma", priority: 5 }
]);
assert(stages.map(stage => stage.id).join(",") === "alpha,beta,gamma", "same-priority stages should sort deterministically by id");

const selected = arbitration.evaluateStages({}, stages, {
  defaultThreshold: 0.5,
  number: value => Number(value),
  evaluateWhen: () => true,
  evidenceScore: (_context, stage) => stage.id === "alpha" ? 0.75 : 0.9
});
assert(selected.selectedStage.id === "alpha", "first deterministic matching stage should be selected");
assert(selected.evaluations.length === 1, "evaluation should stop after selected stage");
assert(selected.evaluations[0].selected === true, "selected evaluation should be marked");

const blocked = arbitration.evaluateStages({}, [{ id: "door", priority: 1, evidence: { door: 1 } }], {
  defaultThreshold: 0.6,
  number: value => Number(value),
  evaluateWhen: () => true,
  evidenceScore: () => 0.2
});
assert(blocked.selectedStage === null, "below-threshold evidence should fail closed");
assert(blocked.evaluations[0].evidenceMatched === false, "threshold miss should be visible in evaluation trace");

console.log("CONTROL_ARBITRATION_VM_TEST_OK", {
  sorted: stages.map(stage => stage.id).join(","),
  selected: selected.selectedStage.id,
  blocked: blocked.evaluations[0].stageId
});
