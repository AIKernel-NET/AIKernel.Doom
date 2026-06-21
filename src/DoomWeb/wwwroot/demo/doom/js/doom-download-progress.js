(function () {
  "use strict";

  const DEFAULT_LOG_INTERVAL_MS = 1200;

  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!Number.isFinite(value) || value <= 0) {
      return "0 B";
    }

    const units = ["B", "KB", "MB", "GB"];
    let scaled = value;
    let unit = 0;
    while (scaled >= 1024 && unit < units.length - 1) {
      scaled /= 1024;
      unit += 1;
    }

    const digits = unit === 0 || scaled >= 100 ? 0 : 1;
    return `${scaled.toFixed(digits)} ${units[unit]}`;
  }

  function summarizeAssets(progress) {
    const assets = Array.isArray(progress?.assets) ? progress.assets : [];
    return assets
      .filter(asset => asset?.label)
      .map(asset => {
        const percent = asset.cacheHit || asset.source === "cache" || asset.phase === "cache-hit"
          ? "cache"
          : (Number.isFinite(asset.percent)
            ? `${Math.round(asset.percent)}%`
            : (asset.done ? "done" : asset.phase || "queued"));
        return `${asset.label}:${percent}`;
      })
      .join(" ");
  }

  function createView(progress, status = {}) {
    if (!progress) {
      return null;
    }

    const active = Boolean(progress.active || status?.state === "loading");
    if (!active && progress.phase !== "complete" && progress.phase !== "failed") {
      return null;
    }

    const percent = Number(progress.percent);
    const percentText = Number.isFinite(percent)
      ? `${percent.toFixed(percent >= 99.5 ? 0 : 1)}%`
      : "receiving";
    const loadedText = formatBytes(progress.loadedBytes);
    const totalText = Number(progress.totalBytes) > 0 ? formatBytes(progress.totalBytes) : "unknown size";
    const asset = progress.asset || progress.label || "runtime assets";
    const summary = summarizeAssets(progress);
    const headline = progress.phase === "cache-hit"
      ? `Using cached ${asset}`
      : (progress.phase === "cache-refresh"
        ? `Refreshing cached ${asset}`
        : (progress.phase === "validating"
          ? `Validating ${asset}`
          : `${asset} ${percentText}`));
    const detail = `${loadedText} / ${totalText}${summary ? ` · ${summary}` : ""}`;
    const progressText = `${headline}; ${detail}`;
    return {
      active,
      phase: progress.phase || "receiving",
      asset,
      headline,
      detail,
      progressText,
      bucket: Number.isFinite(percent) ? Math.floor(percent / 10) : -1,
      logClass: progress.phase === "validating" ? "log-info" : "log-ok"
    };
  }

  function createTracker() {
    const state = {
      lastText: "",
      lastLogAt: 0,
      lastBucket: -1
    };

    return {
      reset() {
        state.lastText = "";
        state.lastLogAt = 0;
        state.lastBucket = -1;
      },
      snapshot() {
        return Object.assign({}, state);
      },
      update(progress, status = {}, reason = "", options = {}) {
        const view = createView(progress, status);
        if (!view) {
          return null;
        }

        const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
        const configuredInterval = Number(options.minLogIntervalMs ?? DEFAULT_LOG_INTERVAL_MS);
        const intervalMs = Number.isFinite(configuredInterval)
          ? Math.max(0, configuredInterval)
          : DEFAULT_LOG_INTERVAL_MS;
        const shouldLog = view.active && (
          reason !== "download-progress"
          || view.bucket !== state.lastBucket
          || now - state.lastLogAt >= intervalMs
        );

        state.lastText = view.progressText;
        if (shouldLog) {
          state.lastLogAt = now;
          state.lastBucket = view.bucket;
        }

        return Object.assign({ shouldLog }, view);
      }
    };
  }

  window.AIKernelDoomDownloadProgress = Object.freeze({
    formatBytes,
    summarizeAssets,
    createView,
    createTracker
  });
})();
