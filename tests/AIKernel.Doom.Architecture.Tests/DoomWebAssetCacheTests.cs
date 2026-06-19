namespace AIKernel.Doom.Architecture.Tests;

public sealed class DoomWebAssetCacheTests
{
    [Fact]
    public void DoomRuntime_CachesProtectedWadAndBonsaiBinariesAfterConsent()
    {
        var script = ReadDoomRuntimeScript();
        var binaryAssets = ReadDoomBinaryAssetsScript();

        Assert.Contains("DOOM_BINARY_ASSET_CACHE", script, StringComparison.Ordinal);
        Assert.Contains("openBinaryAssetCache", binaryAssets, StringComparison.Ordinal);
        Assert.Contains("tryFetchBinaryFromCache", binaryAssets, StringComparison.Ordinal);
        Assert.Contains("cacheSpec ? \"force-cache\" : \"no-cache\"", binaryAssets, StringComparison.Ordinal);
        Assert.Contains("cacheName: DOOM_BINARY_ASSET_CACHE", script, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomRuntime_ValidatesCachedBinariesBeforeUse()
    {
        var binaryAssets = ReadDoomBinaryAssetsScript();

        Assert.Contains("await validateBinaryBytes(bytes, expected, onProgress)", binaryAssets, StringComparison.Ordinal);
        Assert.Contains("await cacheSpec.cache.delete(cacheSpec.request)", binaryAssets, StringComparison.Ordinal);
        Assert.Contains("return fetchBinaryFromNetwork(url, expected, onProgress, cacheSpec, \"reload\")", binaryAssets, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomPrompt_ShowsCacheHitProgress()
    {
        var progress = File.ReadAllText(Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "demo",
            "doom",
            "js",
            "doom-download-progress.js"));

        Assert.Contains("Using cached", progress, StringComparison.Ordinal);
        Assert.Contains("Refreshing cached", progress, StringComparison.Ordinal);
        Assert.Contains("asset.cacheHit", progress, StringComparison.Ordinal);
        Assert.Contains("window.AIKernelDoomDownloadProgress", progress, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomModuleManifest_IdentifiesRuntimeAndCorrespondingSource()
    {
        var manifest = File.ReadAllText(Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "demo",
            "doom",
            "module.json"));

        Assert.Contains("\"entry\": \"doom.wasm\"", manifest, StringComparison.Ordinal);
        Assert.Contains("\"sha256\": \"d0e432c3c9bf8e562a5b36c9eab3381270d7a67bc46a01ebd3f90bb10bfe35ee\"", manifest, StringComparison.Ordinal);
        Assert.Contains("\"doomgenericCommit\": \"dcb7a8dbc7a16ce3dda29382ac9aae9d77d21284\"", manifest, StringComparison.Ordinal);
        Assert.Contains("fetch-doomgeneric.ps1", manifest, StringComparison.Ordinal);
        Assert.Contains("doomgeneric-aikernel.patch", manifest, StringComparison.Ordinal);
    }

    [Fact]
    public void DoomWorker_UsesVersionedRuntimeAssetsToAvoidBrowserCache()
    {
        var root = FindRepoRoot(AppContext.BaseDirectory);
        var worker = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-worker.js"));
        var proxy = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom-worker-proxy.js"));
        var runtime = File.ReadAllText(Path.Combine(root, "src", "DoomWeb", "wwwroot", "js", "doom.js"));

        Assert.Contains("doomdev", proxy, StringComparison.Ordinal);
        Assert.Contains("encodeURIComponent(cacheKey)", proxy, StringComparison.Ordinal);
        Assert.Contains("/demo/doom/js/doom-worker.js?v=", proxy, StringComparison.Ordinal);
        Assert.Contains("const scriptUrl = (path) => `${path}?v=${encodeURIComponent(workerCacheKey)}`;", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay-profile.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/webgpu-provider.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/semantics.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/routing.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/topos.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/ctg.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/sensory.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/vision-palette.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/phainesis.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/nous.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/phantasia.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/kairos.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/kinesis.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/zoe.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/cognition/pipeline-trace.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/sensor-tensor.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/objective-routing.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/expression-dsl.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/doom-context.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/evidence.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/arbitration.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/decision-trace.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/pipeline-graph.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/zoe-veto.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control/runtime-packets.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/wasm-state.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/control-runtime.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/doom-sensor-inputs.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/doom-action-adapter.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/doom-retry-dispatch.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/autoplay/doom-binary-assets.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/doom-wasm-imports.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/doom-native-audio.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/doom-auditory-runtime.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/doom-wad-metadata.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/bonsai.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/doom-debug-audio.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("scriptUrl(\"/demo/doom/js/doom.js\")", worker, StringComparison.Ordinal);
        Assert.Contains("/demo/doom/js/webgpu-provider.js?v=20260618-sensorpanel1", runtime, StringComparison.Ordinal);

        var scripts = string.Concat(worker, proxy, runtime);
        Assert.DoesNotContain("20260617-framefeatures1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260617-sensorstate1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260617-semroute1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260617-approvalapi1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260617-cognition1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260617-splitdebug1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260617-wasmctg1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260617-ctgtrace1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260617-aitrace1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260617-progressfix1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260617-cache-focus", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-sensortensor1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-tensorevidence1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-schemafallback1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-wasmtensor1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-wasmstateadapter1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-tensorschema1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-sensortensormodule1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-ctgobservedsignals1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-kinesismodule1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-toposgovernance1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-toposvectors1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-toposcarrier1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-kinesiscontext1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-semantics1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-routing1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-routingobjective1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-phasepipeline1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-objectiverouting1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-controlruntime1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-controlruntime2", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-controlruntime3", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-activedetections1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-kinesisaction1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-kinesisvector1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-kinesismotion1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-kinesissnapshot1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-kinesismotor1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-kinesiscompass1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-kinesisspatial1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-semanticref1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-decisiontrace1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-arbitration1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-evidence1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-runtimepackets1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-doomcontext1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-actionadapter1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-retrydispatch1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-sensorinputs1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-binaryassets1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-wadmetadata1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-wasmimports1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-nativeaudio1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-sensoryspatial1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-sensoryauditory1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-sensoryvision1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-sensoryhealth1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-nouscarrier1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-phantasia1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-nousmap1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-tensorops1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260618-healthops1", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260616-precision153", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260613-doomweb86", scripts, StringComparison.Ordinal);
        Assert.DoesNotContain("20260612-doomweb3", scripts, StringComparison.Ordinal);
    }

    private static string ReadDoomRuntimeScript()
    {
        return File.ReadAllText(Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "js",
            "doom.js"));
    }

    private static string ReadDoomBinaryAssetsScript()
    {
        return File.ReadAllText(Path.Combine(
            FindRepoRoot(AppContext.BaseDirectory),
            "src",
            "DoomWeb",
            "wwwroot",
            "js",
            "autoplay",
            "doom-binary-assets.js"));
    }

    private static string FindRepoRoot(string start)
    {
        var directory = new DirectoryInfo(start);
        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "AIKernel.Doom.slnx")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new InvalidOperationException("Could not locate AIKernel.Doom repository root.");
    }
}
