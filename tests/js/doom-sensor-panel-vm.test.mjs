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
  const source = readFileSync(filePath, "utf8");
  vm.runInContext(source, context, { filename: filePath });
}

const sandbox = {
  self: {},
  console,
  Object,
  Array,
  Set
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/demo/doom/js/doom-sensor-panel.js");

const panel = context.self.AIKernelDoomSensorPanel;
assert(panel?.version === "20260621-sensorpanel3", "sensor panel module should expose the cache-busted layout version");
assert(Array.isArray(panel.panelLayout), "sensor panel module should expose panelLayout");

const panelKeys = panel.panelLayout.map(item => item.key).join("|");
assert(panelKeys === "aisthesis|noesis|krisis|kinesis", "canonical panel order should be Aisthesis, Noesis, Krisis, Kinesis");

const stageKeys = panel.panelLayout.flatMap(item => item.stages.map(stage => stage.key)).join("|");
assert(stageKeys === "primary|phainesis|nous|topos|kairos|motion|zoe", "pipeline stages should follow the formal execution order after Aisthesis");

const aisthesis = panel.panelLayout.find(item => item.key === "aisthesis");
for (const item of panel.panelLayout) {
  assert(!("gridColumn" in item) && !("gridRow" in item), "responsive CSS should own sensor panel grid placement");
}
const aisthesisSensors = aisthesis.stages[0].items.map(item => `${item.type}:${item.key || item.label}`).join("|");
assert(aisthesisSensors.includes("sensor:visual"), "Aisthesis should contain Visual");
assert(aisthesisSensors.includes("sensor:audio"), "Aisthesis should contain Audio");
assert(aisthesisSensors.includes("sensor:movement"), "Aisthesis should contain Movement");
assert(aisthesisSensors.includes("sensor:compass"), "Aisthesis should contain Compass");
assert(aisthesisSensors.includes("detection:foot"), "Aisthesis should contain Collision via the foot detector");
assert(aisthesisSensors.includes("sensor:health"), "Aisthesis should contain Health");

const detectionKeys = panel.panelLayout
  .flatMap(item => item.stages)
  .flatMap(stage => stage.items)
  .filter(item => item.type === "detection")
  .map(item => item.key);
const duplicateDetections = detectionKeys.filter((key, index) => detectionKeys.indexOf(key) !== index);
assert(duplicateDetections.length === 0, `detectors should not be duplicated across panels: ${duplicateDetections.join(",")}`);
for (const key of ["motion", "wall", "enemy", "hud", "computer", "objective", "door", "spatial", "foot", "health"]) {
  assert(detectionKeys.includes(key), `detector ${key} should remain reachable through data-detection-toggle`);
}

const noesis = panel.panelLayout.find(item => item.key === "noesis");
assert(noesis.stages[0].title === "Phainesis", "Noesis first stage should be Phainesis");
assert(noesis.stages[1].title === "Nous", "Noesis second stage should be Nous");

const krisis = panel.panelLayout.find(item => item.key === "krisis");
assert(krisis.stages[0].title === "Topos", "Krisis first stage should be Topos");
assert(krisis.stages[1].title === "Kairos", "Krisis second stage should be Kairos");

const kinesis = panel.panelLayout.find(item => item.key === "kinesis");
assert(kinesis.stages[1].title === "Zoe", "Kinesis second stage should be Zoe");
assert(panel.detectionDescriptors.health.label === "HP Veto", "Health detector should be rendered as Zoe HP veto");

console.log("DOOM_SENSOR_PANEL_VM_TEST_OK", {
  panels: panel.panelLayout.length,
  detections: detectionKeys.length,
  version: panel.version
});
