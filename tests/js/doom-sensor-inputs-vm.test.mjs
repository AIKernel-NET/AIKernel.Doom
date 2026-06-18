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
  Boolean,
  String,
  Array
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/doom-sensor-inputs.js");

const sensors = context.self.AIKernelDoomSensorInputs;
assert(sensors?.createMap, "sensor input module should export createMap");
assert(sensors?.statusMap, "sensor input module should export statusMap");
assert(sensors?.setEnabled, "sensor input module should export setEnabled");

const map = sensors.createMap();
assert(map.visual.conceptName === "Aisthesis", "visual should be classified as Aisthesis");
assert(map.movement.conceptName === "Aisthesis", "movement should be classified as Aisthesis");
assert(map.compass.conceptName === "Aisthesis", "compass should be classified as Aisthesis");
assert(map.health.conceptName === "Aisthesis", "health should be classified as Aisthesis");
assert(map.motor.conceptName === "Kinesis", "motor should be classified as Kinesis");
assert(map.spatial.conceptName === "Krisis", "spatial should be classified as Krisis");
assert(map.spatial.category === "derived", "spatial should be a derived sensor");
assert(sensors.normalizeKind("vision") === "visual", "vision alias should normalize to visual");
assert(sensors.normalizeKind("movement-vector") === "movement", "movement-vector alias should normalize to movement");
assert(sensors.normalizeKind("bearing") === "compass", "bearing alias should normalize to compass");

const setResult = sensors.setEnabled(map, "auditory", false);
assert(setResult.normalized === "audio", "auditory should normalize to audio before toggling");
assert(setResult.enabled === false, "setEnabled should return the requested enabled state");
assert(sensors.isEnabled(map, "audio") === false, "audio should be disabled after toggle");

const status = sensors.statusMap(map);
status.audio.metadata.mutated = true;
assert(map.audio.metadata.mutated !== true, "statusMap should clone metadata");
assert(status.audio.enabled === false, "statusMap should expose disabled audio");

sensors.attachObservation(status, "movement", true, { source: "vm", detail: "flow" });
assert(status.movement.observed === true, "attachObservation should mark sensor observed");
assert(status.movement.metadata.source === "vm", "attachObservation should merge metadata");

console.log("DOOM_SENSOR_INPUTS_VM_TEST_OK", {
  sensors: Object.keys(map).length,
  audio: status.audio.enabled,
  movementObserved: status.movement.observed
});
