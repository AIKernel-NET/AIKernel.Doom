import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { TextDecoder, TextEncoder } from "node:util";

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

const logs = [];
const warnings = [];
const sandbox = {
  self: {},
  console: {
    log(message) {
      logs.push(String(message));
    },
    warn(message) {
      warnings.push(String(message));
    }
  },
  Array,
  BigInt,
  DataView,
  Date,
  Error,
  Number,
  Object,
  String,
  TextDecoder,
  Uint8Array
};
sandbox.window = sandbox.self;
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/doom-wasm-imports.js");

const wasmImports = context.self.AIKernelDoomWasmImports;
assert(wasmImports?.createImports, "WASM import adapter should export createImports");
assert(wasmImports?.concatBytes, "WASM import adapter should export concatBytes");

const joined = wasmImports.concatBytes([new Uint8Array([1, 2]), new Uint8Array([3])]);
assert(joined.length === 3 && joined[2] === 3, "concatBytes should preserve byte order");

const memory = { buffer: new ArrayBuffer(65536) };
const runtime = { exports: { memory } };
const imports = wasmImports.createImports(runtime, {
  console: sandbox.console,
  textDecoder: new TextDecoder()
});
const view = new DataView(memory.buffer);
const bytes = new Uint8Array(memory.buffer);
const text = new TextEncoder().encode("hello wasi\n");
bytes.set(text, 128);
view.setUint32(16, 128, true);
view.setUint32(20, text.length, true);

assert(imports.env.emscripten_sleep(1) === 0, "emscripten sleep stub should return success");
assert(imports.env.__syscall_unlinkat() === 0, "unlinkat stub should return success");
assert(imports.wasi_snapshot_preview1.args_sizes_get(32, 36) === 0, "args_sizes_get should return success");
assert(view.getUint32(32, true) === 0, "args_sizes_get should write argc=0");
assert(view.getUint32(36, true) === 0, "args_sizes_get should write argv buffer size=0");

assert(imports.wasi_snapshot_preview1.fd_write(1, 16, 1, 40) === 0, "fd_write should return success");
assert(view.getUint32(40, true) === text.length, "fd_write should write byte count");
assert(logs[0] === "hello wasi", "fd_write stdout should log trimmed text");

view.setUint32(48, 128, true);
view.setUint32(52, text.length, true);
assert(imports.wasi_snapshot_preview1.fd_write(2, 48, 1, 56) === 0, "fd_write stderr should return success");
assert(warnings[0] === "hello wasi", "fd_write stderr should warn trimmed text");

assert(imports.wasi_snapshot_preview1.fd_read(0, 16, 1, 60) === 0, "fd_read should return success");
assert(view.getUint32(60, true) === 0, "fd_read should report no bytes read");

assert(imports.wasi_snapshot_preview1.clock_time_get(0, 0, 64) === 0, "clock_time_get should return success");
assert(view.getBigUint64(64, true) > 0n, "clock_time_get should write a nanosecond timestamp");

assert(imports.wasi_snapshot_preview1.fd_seek(0, 0n, 0, 72) === 0, "fd_seek should return success");
assert(view.getBigUint64(72, true) === 0n, "fd_seek should write zero offset");

let procExitMessage = "";
try {
  imports.wasi_snapshot_preview1.proc_exit(7);
} catch (error) {
  procExitMessage = error.message;
}
assert(procExitMessage === "WASI proc_exit(7)", "proc_exit should throw an explicit error");

console.log("DOOM_WASM_IMPORTS_VM_TEST_OK", {
  stdout: logs.length,
  stderr: warnings.length,
  written: view.getUint32(40, true)
});
