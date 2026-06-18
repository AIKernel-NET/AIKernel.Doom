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

function createHeaders(length = 0) {
  return {
    get(name) {
      return String(name).toLowerCase() === "content-length" && length > 0
        ? String(length)
        : null;
    }
  };
}

function createArrayBufferResponse(bytes) {
  return {
    headers: createHeaders(bytes.length),
    async arrayBuffer() {
      return bytes.slice().buffer;
    }
  };
}

function createStreamResponse(chunks) {
  let index = 0;
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  return {
    headers: createHeaders(total),
    body: {
      getReader() {
        return {
          async read() {
            if (index >= chunks.length) {
              return { done: true, value: undefined };
            }

            const value = chunks[index];
            index += 1;
            return { done: false, value };
          }
        };
      }
    }
  };
}

const sandbox = {
  self: {},
  console,
  URL,
  Uint8Array,
  Array,
  Number,
  Object,
  String
};
sandbox.window = sandbox.self;
sandbox.globalThis = sandbox;
sandbox.location = { href: "https://example.test/demo/doom/" };
const context = vm.createContext(sandbox);

loadScript(context, "src/DoomWeb/wwwroot/js/autoplay/doom-binary-assets.js");

const binaryAssets = context.self.AIKernelDoomBinaryAssets;
assert(binaryAssets?.fetchBinary, "binary asset module should export fetchBinary");
assert(binaryAssets?.readBinaryResponse, "binary asset module should export readBinaryResponse");
assert(binaryAssets?.tryFetchBinaryFromCache, "binary asset module should export tryFetchBinaryFromCache");
assert(binaryAssets?.validateBinaryBytes, "binary asset module should export validateBinaryBytes");

assert(binaryAssets.normalizeByteCount("42.9") === 42, "normalizeByteCount should floor positive values");
assert(binaryAssets.normalizeByteCount("-2") === 0, "normalizeByteCount should reject negative values");
assert(binaryAssets.normalizeByteCount("oops") === 0, "normalizeByteCount should reject non-numeric values");

const streamedProgress = [];
const streamed = await binaryAssets.readBinaryResponse(
  createStreamResponse([new Uint8Array([1, 2]), new Uint8Array([3])]),
  { label: "streamed asset", sizeBytes: 3 },
  progress => streamedProgress.push(progress),
  "downloading",
  "network"
);

assert(streamed.length === 3, "streamed response should concatenate all chunks");
assert(streamed[0] === 1 && streamed[1] === 2 && streamed[2] === 3, "streamed response should preserve byte order");
assert(streamedProgress.length === 3, "streamed response should emit initial and chunk progress");
assert(streamedProgress.at(-1).loadedBytes === 3, "streamed progress should finish at total loaded bytes");

let cacheDeleted = false;
const cacheProgress = [];
const cachedBytes = await binaryAssets.tryFetchBinaryFromCache({
  request: { url: "https://example.test/demo/doom/asset.bin" },
  cache: {
    async match() {
      return createArrayBufferResponse(new Uint8Array([8, 9, 10]));
    },
    async delete() {
      cacheDeleted = true;
      return true;
    }
  }
}, { label: "cached asset", sizeBytes: 3 }, progress => cacheProgress.push(progress));

assert(cachedBytes?.length === 3, "valid cache hit should return cached bytes");
assert(cachedBytes[2] === 10, "valid cache hit should preserve cached bytes");
assert(cacheDeleted === false, "valid cache hit should not delete cache entry");
assert(cacheProgress.some(item => item.cacheHit === true), "valid cache hit should report cache source");
assert(cacheProgress.at(-1).done === true, "valid cache hit should emit complete progress");

let invalidDeleted = false;
const invalidProgress = [];
const invalidResult = await binaryAssets.tryFetchBinaryFromCache({
  request: { url: "https://example.test/demo/doom/stale.bin" },
  cache: {
    async match() {
      return createArrayBufferResponse(new Uint8Array([1, 2]));
    },
    async delete() {
      invalidDeleted = true;
      return true;
    }
  }
}, { label: "stale asset", sizeBytes: 3 }, progress => invalidProgress.push(progress));

assert(invalidResult === null, "invalid cache entry should fall back to network");
assert(invalidDeleted === true, "invalid cache entry should be deleted");
assert(invalidProgress.some(item => item.phase === "cache-refresh"), "invalid cache entry should emit refresh progress");

console.log("DOOM_BINARY_ASSETS_VM_TEST_OK", {
  streamed: streamed.length,
  cacheHit: cachedBytes.length,
  cacheRefresh: invalidDeleted
});
