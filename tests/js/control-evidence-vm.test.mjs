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

function loadScript(context, relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  vm.runInContext(readFileSync(filePath, "utf8"), context, { filename: filePath });
}

const sandbox = { self: {}, Number, Object, String, Math, Set, Float32Array };
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/expression-dsl.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/sensor-tensor.js");
loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/control/evidence.js");

const evidence = context.self.AIKernelDoomControlEvidence;
assert(evidence?.semanticScore, "control evidence module was not exported");

const sensorTensorData = new Array(32).fill(0);
sensorTensorData[19] = 0.75;
const state = {
  bridgeConfidence: 0.2,
  computerRoomConfidence: 0.3,
  semanticMemory: {
    symbols: {
      bridge: { confidence: 0.6 },
      computerRoom: { confidence: 0.8 }
    }
  },
  sensorTensor: {
    shape: [4, 8],
    data: sensorTensorData
  }
};

assert(evidence.semanticScore(state, "bridge") === 0.75, "tensor evidence should win over direct and memory evidence");
assert(evidence.semanticScore(state, "computer-room") === 0.8, "camelCase semantic memory confidence should be readable");

const profile = {
  pipeline: {
    semanticMemory: [{ id: "bridge" }],
    stages: [{ evidence: { "computer-room": 1, enemy: 1 } }]
  }
};
const scores = evidence.semanticScores(state, profile);
assert(scores.bridge === 0.75, "semanticScores should expose bridge score");
assert(scores["computer-room"] === 0.8, "semanticScores should expose computer-room score");
assert(scores.enemy === 0, "missing evidence should default to zero");

const weighted = evidence.evidenceScore({ state }, { evidence: { bridge: 0.5, "computer-room": 0.5 } });
assert(weighted === 0.775, "weighted evidence should combine semantic scores deterministically");

console.log("CONTROL_EVIDENCE_VM_TEST_OK", {
  bridge: scores.bridge,
  computerRoom: scores["computer-room"],
  weighted
});
