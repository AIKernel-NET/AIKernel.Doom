(function () {
  "use strict";

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`failed to fetch ${url}: ${response.status}`);
    }

    return response.json();
  }

  async function fetchBinary(url, expected, onProgress = null) {
    const cacheSpec = await openBinaryAssetCache(url, expected);
    if (cacheSpec) {
      const cachedBytes = await tryFetchBinaryFromCache(cacheSpec, expected, onProgress);
      if (cachedBytes) {
        return cachedBytes;
      }
    }

    return fetchBinaryFromNetwork(url, expected, onProgress, cacheSpec, cacheSpec ? "force-cache" : "no-cache");
  }

  async function fetchBinaryFromNetwork(url, expected, onProgress, cacheSpec, cacheMode) {
    const response = await fetch(resolveAssetUrl(url), {
      cache: cacheMode,
      credentials: "same-origin"
    });
    if (!response.ok) {
      throw new Error(`failed to fetch ${expected.label}: ${response.status}`);
    }

    const cachePut = cacheSpec
      ? cacheSpec.cache.put(cacheSpec.request, response.clone()).catch(() => false)
      : null;
    const bytes = await readBinaryResponse(response, expected, onProgress, "downloading", "network");
    try {
      await validateBinaryBytes(bytes, expected, onProgress);
    } catch (error) {
      if (cachePut) {
        try {
          await cachePut;
        } catch {
          // Ignore failed writes while recovering from a failed validation.
        }
      }
      if (cacheSpec) {
        try {
          await cacheSpec.cache.delete(cacheSpec.request);
        } catch {
          // Cache eviction is best-effort; the reload below bypasses stale HTTP cache.
        }
      }

      if (cacheSpec && cacheMode !== "reload") {
        emitBinaryProgress(onProgress, {
          phase: "cache-refresh",
          loadedBytes: 0,
          totalBytes: normalizeByteCount(expected.sizeBytes),
          source: "network",
          cacheHit: false,
          done: false
        });
        return fetchBinaryFromNetwork(url, expected, onProgress, cacheSpec, "reload");
      }

      throw error;
    }
    if (cachePut) {
      await cachePut;
    }

    emitBinaryProgress(onProgress, {
      phase: "complete",
      loadedBytes: bytes.length,
      totalBytes: normalizeByteCount(expected.sizeBytes) || bytes.length,
      source: "network",
      cacheHit: false,
      done: true
    });
    return bytes;
  }

  async function openBinaryAssetCache(url, expected) {
    if (!expected?.cacheName || !globalThis.caches) {
      return null;
    }

    try {
      const cache = await globalThis.caches.open(expected.cacheName);
      const request = new Request(resolveAssetUrl(url), { credentials: "same-origin" });
      return { cache, request };
    } catch {
      return null;
    }
  }

  async function tryFetchBinaryFromCache(cacheSpec, expected, onProgress) {
    let response = null;
    try {
      response = await cacheSpec.cache.match(cacheSpec.request);
    } catch {
      return null;
    }

    if (!response) {
      return null;
    }

    try {
      const bytes = await readBinaryResponse(response, expected, onProgress, "cache-hit", "cache");
      await validateBinaryBytes(bytes, expected, onProgress);
      emitBinaryProgress(onProgress, {
        phase: "complete",
        loadedBytes: bytes.length,
        totalBytes: normalizeByteCount(expected.sizeBytes) || bytes.length,
        source: "cache",
        cacheHit: true,
        done: true
      });
      return bytes;
    } catch {
      try {
        await cacheSpec.cache.delete(cacheSpec.request);
      } catch {
        // Cache eviction is best-effort; the network validation below is authoritative.
      }
      emitBinaryProgress(onProgress, {
        phase: "cache-refresh",
        loadedBytes: 0,
        totalBytes: normalizeByteCount(expected.sizeBytes),
        source: "network",
        cacheHit: false,
        done: false
      });
      return null;
    }
  }

  async function readBinaryResponse(response, expected, onProgress, phase, source) {
    const declaredSize = normalizeByteCount(expected.sizeBytes || response.headers.get("content-length"));
    emitBinaryProgress(onProgress, {
      phase,
      loadedBytes: 0,
      totalBytes: declaredSize,
      source,
      cacheHit: source === "cache",
      done: false
    });

    let bytes;
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      const chunks = [];
      let loadedBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        if (value?.length) {
          chunks.push(value);
          loadedBytes += value.length;
          emitBinaryProgress(onProgress, {
            phase,
            loadedBytes,
            totalBytes: declaredSize,
            source,
            cacheHit: source === "cache",
            done: false
          });
        }
      }

      bytes = concatBytes(chunks);
    } else {
      bytes = new Uint8Array(await response.arrayBuffer());
      emitBinaryProgress(onProgress, {
        phase,
        loadedBytes: bytes.length,
        totalBytes: declaredSize || bytes.length,
        source,
        cacheHit: source === "cache",
        done: false
      });
    }

    return bytes;
  }

  async function validateBinaryBytes(bytes, expected, onProgress) {
    if (expected.sizeBytes && bytes.length !== expected.sizeBytes) {
      throw new Error(`${expected.label} size mismatch: got ${bytes.length}, expected ${expected.sizeBytes}`);
    }

    if (expected.sha256) {
      emitBinaryProgress(onProgress, {
        phase: "validating",
        loadedBytes: bytes.length,
        totalBytes: normalizeByteCount(expected.sizeBytes) || bytes.length,
        done: false
      });
      const actual = await sha256(bytes);
      if (actual !== expected.sha256.toLowerCase()) {
        throw new Error(`${expected.label} sha256 mismatch: got ${actual}, expected ${expected.sha256}`);
      }
    }

    return true;
  }

  function resolveAssetUrl(url) {
    return new URL(url, globalThis.location?.href || "http://localhost/").href;
  }

  function emitBinaryProgress(onProgress, progress) {
    if (typeof onProgress === "function") {
      onProgress(progress);
    }
  }

  function normalizeByteCount(value) {
    const number = Number(value || 0);
    if (!Number.isFinite(number) || number <= 0) {
      return 0;
    }

    return Math.floor(number);
  }

  async function sha256(bytes) {
    if (!globalThis.crypto?.subtle) {
      throw new Error("WebCrypto SHA-256 is unavailable; hosted asset validation cannot proceed.");
    }

    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function concatBytes(chunks) {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    return merged;
  }

  self.AIKernelDoomBinaryAssets = Object.freeze({
    fetchJson,
    fetchBinary,
    normalizeByteCount,
    validateBinaryBytes,
    readBinaryResponse,
    openBinaryAssetCache,
    tryFetchBinaryFromCache
  });
})();
