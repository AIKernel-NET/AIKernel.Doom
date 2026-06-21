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
  window: {},
  Date,
  Math,
  Number,
  Object,
  String
};
const context = vm.createContext(sandbox);
const source = readFileSync(
  path.join(repoRoot, "src/DoomWeb/wwwroot/demo/doom/js/doom-download-progress.js"),
  "utf8"
);
vm.runInContext(source, context, { filename: "doom-download-progress.js" });

const progress = context.window.AIKernelDoomDownloadProgress;
assert(progress?.createTracker, "download progress adapter was not exported");
assert(progress.formatBytes(314572800) === "300 MB", "byte formatter should render large model/WAD sizes");

const cacheView = progress.createView({
  active: true,
  phase: "cache-hit",
  asset: "Bonsai model",
  loadedBytes: 314572800,
  totalBytes: 314572800,
  assets: [{ label: "model", cacheHit: true }]
}, { state: "loading" });
assert(cacheView.headline === "Using cached Bonsai model", "cache-hit view should be explicit");
assert(cacheView.detail.includes("model:cache"), "asset summary should preserve cache source");

const tracker = progress.createTracker();
const first = tracker.update({ active: true, percent: 5, loadedBytes: 1024, totalBytes: 10240 }, {}, "download-progress", { now: 1000 });
const second = tracker.update({ active: true, percent: 8, loadedBytes: 2048, totalBytes: 10240 }, {}, "download-progress", { now: 1100 });
const third = tracker.update({ active: true, percent: 15, loadedBytes: 4096, totalBytes: 10240 }, {}, "download-progress", { now: 1200 });

assert(first.shouldLog === true, "first progress update should be logged");
assert(second.shouldLog === false, "same bucket progress should be throttled");
assert(third.shouldLog === true, "new 10 percent bucket should be logged");
assert(tracker.snapshot().lastText.includes("40.0%") || tracker.snapshot().lastText.includes("15.0%"), "tracker should retain latest text");

console.log("DOWNLOAD_PROGRESS_VM_TEST_OK", {
  cache: cacheView.headline,
  first: first.shouldLog,
  second: second.shouldLog,
  third: third.shouldLog
});
