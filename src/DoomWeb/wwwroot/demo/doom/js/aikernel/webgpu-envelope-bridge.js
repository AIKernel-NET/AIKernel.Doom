// AIKernel.NET canonical GPU canonical browser envelope bridge.
// This file intentionally keeps policy in C# DTOs and uses JavaScript as a
// thin WebGPU adapter boundary. Real WebGPU pass executors can attach command
// encoders without changing the envelope shape.

const SCHEMA = "aikernel.gpu.dispatch";
const BACKEND_WEBGPU = 2;
const TARGET_RAW_FRAMEBUFFER = 1;
const TARGET_HUD_COMPOSITE = 2;
const TARGET_FEATURE_MASK = 4;
const PASS_AISTHESIS = 1;
const PASS_SPATIAL_REASONING = 2;
const PASS_HUD_COMPOSITE = 3;
const PASS_ID_AISTHESIS = "gpu.aisthesis.raw-frame";
const PASS_ID_SPATIAL_REASONING = "gpu.spatial-reasoning";
const PASS_ID_HUD_COMPOSITE = "gpu.hud.composite";
const VECTOR_STRIDE = 32;
const GPU_BUFFER_USAGE = globalThis.GPUBufferUsage ?? {
    MAP_READ: 1,
    COPY_SRC: 4,
    COPY_DST: 8,
    UNIFORM: 64,
    STORAGE: 128
};
const GPU_TEXTURE_USAGE = globalThis.GPUTextureUsage ?? {
    COPY_SRC: 1,
    COPY_DST: 2,
    TEXTURE_BINDING: 4,
    STORAGE_BINDING: 8,
    RENDER_ATTACHMENT: 16
};
const GPU_MAP_MODE = globalThis.GPUMapMode ?? {
    READ: 1
};
const GPU_METADATA_KEYS = Object.freeze({
    authoritativeReady: "authoritative_ready",
    candidateStreak: "candidate_streak",
    diagnosticReady: "diagnostic_ready",
    diagnosticStreak: "diagnostic_streak",
    featureMaskStorageTexture: "feature_mask_storage_texture",
    frameIndex: "frame_index",
    metadataValidationError: "metadata_validation_error",
    passId: "pass_id",
    passReadiness: "pass_readiness",
    pathRole: "path_role",
    pilotState: "pilot_state",
    promotionBlocked: "promotion_blocked",
    promotionCandidateReady: "promotion_candidate_ready",
    promotionDiagnosticStable: "promotion_diagnostic_stable",
    promotionGate: "promotion_gate",
    promotionReason: "promotion_reason",
    requiredStreak: "required_streak",
    sampleTicks: "sample_ticks"
});
const GPU_EXECUTION_MODE = "execution_mode";
const GPU_VALUES = Object.freeze({
    execution: Object.freeze({
        browserWebGpuCompute: "browser-webgpu-compute",
        csharpDeterministic: "csharp-deterministic",
        deterministicFallback: "deterministic-fallback"
    }),
    pathRole: Object.freeze({
        game: "game",
        bonsai: "bonsai",
        hud: "hud",
        sensor: "sensor"
    }),
    pilotState: Object.freeze({
        browserBuiltinCompute: "browser-builtin-compute",
        browserDeterministicFallback: "browser-deterministic-fallback",
        descriptorReady: "descriptor-ready",
        descriptorNativeCandidate: "descriptor-native-candidate",
        notEvaluated: "not-evaluated"
    }),
    promotionGate: Object.freeze({
        traceCandidate: "trace-candidate",
        fallback: "fallback",
        notEvaluated: "not-evaluated",
        notApplicable: "not-applicable",
        runtimeStampRequired: "runtime-stamp-required"
    })
});
const GPU_REQUIRED_METADATA_KEYS = Object.freeze([
    GPU_METADATA_KEYS.authoritativeReady,
    GPU_METADATA_KEYS.candidateStreak,
    GPU_METADATA_KEYS.diagnosticReady,
    GPU_METADATA_KEYS.diagnosticStreak,
    GPU_METADATA_KEYS.featureMaskStorageTexture,
    GPU_METADATA_KEYS.frameIndex,
    GPU_METADATA_KEYS.passId,
    GPU_METADATA_KEYS.passReadiness,
    GPU_METADATA_KEYS.pathRole,
    GPU_METADATA_KEYS.pilotState,
    GPU_METADATA_KEYS.promotionGate,
    GPU_METADATA_KEYS.requiredStreak,
    GPU_METADATA_KEYS.sampleTicks,
    GPU_EXECUTION_MODE
]);
const GPU_BOOL_METADATA_KEYS = Object.freeze([
    GPU_METADATA_KEYS.authoritativeReady,
    GPU_METADATA_KEYS.diagnosticReady,
    GPU_METADATA_KEYS.featureMaskStorageTexture
]);
const GPU_INTEGER_METADATA_KEYS = Object.freeze([
    GPU_METADATA_KEYS.candidateStreak,
    GPU_METADATA_KEYS.diagnosticStreak,
    GPU_METADATA_KEYS.frameIndex,
    GPU_METADATA_KEYS.requiredStreak,
    GPU_METADATA_KEYS.sampleTicks
]);
const GPU_ALLOWED_EXECUTION_MODES = Object.freeze(new Set([
    GPU_VALUES.execution.browserWebGpuCompute,
    GPU_VALUES.execution.csharpDeterministic,
    GPU_VALUES.execution.deterministicFallback,
    "native-cuda-abi",
    "native-cuda-abi-probe",
    "native-dawn-descriptor",
    "native-dawn-compute"
]));
const GPU_ALLOWED_PATH_ROLES = Object.freeze(new Set(Object.values(GPU_VALUES.pathRole)));
const GPU_ALLOWED_PILOT_STATES = Object.freeze(new Set([
    GPU_VALUES.pilotState.browserBuiltinCompute,
    GPU_VALUES.pilotState.browserDeterministicFallback,
    GPU_VALUES.pilotState.descriptorReady,
    GPU_VALUES.pilotState.descriptorNativeCandidate,
    GPU_VALUES.pilotState.notEvaluated,
    "probe-ready",
    "probe-native-candidate",
    "runtime-observed",
    "dto-projected"
]));
const GPU_ALLOWED_PROMOTION_GATES = Object.freeze(new Set([
    GPU_VALUES.promotionGate.traceCandidate,
    GPU_VALUES.promotionGate.fallback,
    GPU_VALUES.promotionGate.notEvaluated,
    GPU_VALUES.promotionGate.notApplicable,
    GPU_VALUES.promotionGate.runtimeStampRequired,
    "native-bridge-required"
]));
const CANONICAL_PASSES = Object.freeze([
    {
        name: "Aisthesis",
        shortName: "aisthesis",
        passId: PASS_ID_AISTHESIS,
        passKind: PASS_AISTHESIS
    },
    {
        name: "SpatialReasoning",
        shortName: "spatialReasoning",
        passId: PASS_ID_SPATIAL_REASONING,
        passKind: PASS_SPATIAL_REASONING
    },
    {
        name: "HudComposite",
        shortName: "hudComposite",
        passId: PASS_ID_HUD_COMPOSITE,
        passKind: PASS_HUD_COMPOSITE
    }
]);

export function createWebGpuEnvelopeBridge(options = {}) {
    const executor = options.executor ?? createNullWebGpuExecutor();
    let disposed = false;

    function ensureActive() {
        if (disposed) {
            throw new Error("AIKernel WebGPU canonical envelope bridge has been disposed.");
        }
    }

    return {
        isWebGpuSupported() {
            if (disposed) {
                return false;
            }

            if (typeof executor.isWebGpuSupported === "function") {
                return executor.isWebGpuSupported();
            }

            return typeof navigator !== "undefined" && !!navigator.gpu;
        },

        async dispatchAisthesisEnvelope(envelope) {
            ensureActive();
            const normalized = normalizeEnvelope(envelope);
            requirePass(normalized, PASS_AISTHESIS, PASS_ID_AISTHESIS);
            if (normalized.MetadataValidationError) {
                return createAisthesisFallback(normalized, metadataInvalidReason(normalized));
            }

            if (typeof executor.dispatchAisthesisEnvelope === "function") {
                const dispatched = await executor.dispatchAisthesisEnvelope(normalized);
                if (dispatched) {
                    return dispatched;
                }
            }

            return createAisthesisFallback(normalized, executorFallbackReason(executor));
        },

        async dispatchSpatialReasoningEnvelope(envelope) {
            ensureActive();
            const normalized = normalizeEnvelope(envelope);
            requirePass(normalized, PASS_SPATIAL_REASONING, PASS_ID_SPATIAL_REASONING);
            if (normalized.MetadataValidationError) {
                return createSpatialFallback(normalized, metadataInvalidReason(normalized));
            }

            if (typeof executor.dispatchSpatialReasoningEnvelope === "function") {
                const dispatched = await executor.dispatchSpatialReasoningEnvelope(normalized);
                if (dispatched) {
                    return dispatched;
                }
            }

            return createSpatialFallback(normalized, executorFallbackReason(executor));
        },

        async dispatchHudCompositeEnvelope(envelope) {
            ensureActive();
            const normalized = normalizeEnvelope(envelope);
            requirePass(normalized, PASS_HUD_COMPOSITE, PASS_ID_HUD_COMPOSITE);
            if (normalized.MetadataValidationError) {
                return createHudFallback(normalized);
            }

            if (typeof executor.dispatchHudCompositeEnvelope === "function") {
                const dispatched = await executor.dispatchHudCompositeEnvelope(normalized);
                if (dispatched) {
                    return dispatched;
                }
            }

            return createHudFallback(normalized);
        },

        async DispatchAisthesisEnvelopeAsync(envelope) {
            return this.dispatchAisthesisEnvelope(envelope);
        },

        async DispatchSpatialReasoningEnvelopeAsync(envelope) {
            return this.dispatchSpatialReasoningEnvelope(envelope);
        },

        async DispatchHudCompositeEnvelopeAsync(envelope) {
            return this.dispatchHudCompositeEnvelope(envelope);
        },

        dispose() {
            disposed = true;
            if (typeof executor.dispose === "function") {
                executor.dispose();
            }
        }
    };
}

export function createWebGpuBrowserExecutor(options = {}) {
    const textureRegistry = options.textureRegistry ?? null;
    const shaderSources = options.shaderSources ?? {};
    const passExecutors = options.passExecutors ?? {};
    const onDeviceLost = typeof options.onDeviceLost === "function"
        ? options.onDeviceLost
        : () => {};
    const notifyFallback = typeof options.onFallback === "function"
        ? options.onFallback
        : () => {};
    const moduleCache = new Map();
    let adapter = options.adapter ?? null;
    let device = options.device ?? null;
    let queue = options.queue ?? device?.queue ?? null;
    let initialized = !!device;
    let disposed = false;
    let deviceLost = false;
    let lostReason = null;
    let fallbackCount = 0;
    let lastFallbackReason = null;

    if (device) {
        observeDeviceLost(device);
    }

    async function initialize() {
        ensureExecutorActive();
        if (initialized) {
            return !!device && !deviceLost;
        }

        if (typeof navigator === "undefined" || !navigator.gpu) {
            onFallback("navigator-gpu-unavailable");
            initialized = true;
            return false;
        }

        adapter = adapter ?? await navigator.gpu.requestAdapter(options.requestAdapterOptions ?? {});
        if (!adapter) {
            onFallback("webgpu-adapter-unavailable");
            initialized = true;
            return false;
        }

        device = await adapter.requestDevice(options.requestDeviceDescriptor ?? {});
        queue = device.queue;
        observeDeviceLost(device);
        initialized = true;
        return true;
    }

    function observeDeviceLost(targetDevice) {
        if (!targetDevice?.lost || targetDevice.__aikernelCanonicalLostObserved) {
            return;
        }

        Object.defineProperty(targetDevice, "__aikernelCanonicalLostObserved", {
            value: true,
            configurable: false
        });
        targetDevice.lost.then(info => {
            deviceLost = true;
            lostReason = info?.reason ?? "unknown";
            onDeviceLost({ kind: "webgpu", reason: lostReason, info });
        }).catch(error => {
            deviceLost = true;
            lostReason = error?.message ?? "unknown";
            onDeviceLost({ kind: "webgpu", reason: lostReason, error });
        });
    }

    function ensureExecutorActive() {
        if (disposed) {
            throw new Error("AIKernel WebGPU canonical browser executor has been disposed.");
        }
    }

    function onFallback(reason) {
        fallbackCount += 1;
        lastFallbackReason = reason ?? "unknown";
        notifyFallback(lastFallbackReason);
    }

    function targetTexture(target) {
        if (!textureRegistry) {
            return null;
        }

        if (typeof textureRegistry.get === "function") {
            return textureRegistry.get(target.TargetId) ?? textureRegistry.get(target.Role) ?? null;
        }

        if (typeof textureRegistry.resolve === "function") {
            return textureRegistry.resolve(target) ?? null;
        }

        return textureRegistry[target.TargetId] ?? textureRegistry[target.Role] ?? null;
    }

    function resolvePassExecutor(shortName, envelope) {
        if (!passExecutors) {
            return null;
        }

        if (typeof passExecutors === "function") {
            return passExecutors;
        }

        const candidates = [
            shortName,
            envelope.PassId,
            String(envelope.PassKind),
            `pass:${envelope.PassKind}`
        ];

        for (const candidate of candidates) {
            const executor = passExecutors[candidate];
            if (typeof executor === "function") {
                return executor;
            }
        }

        const builtIn = builtInPassExecutor(shortName, envelope);
        if (builtIn) {
            return builtIn;
        }

        return null;
    }

    function builtInPassExecutor(shortName, envelope) {
        if (options.useBuiltInPassExecutors === false) {
            return null;
        }

        if (shortName === "aisthesis" || envelope.PassKind === PASS_AISTHESIS) {
            return executeAisthesisComputePass;
        }

        if (shortName === "spatialReasoning" || envelope.PassKind === PASS_SPATIAL_REASONING) {
            return executeSpatialReasoningComputePass;
        }

        if (shortName === "hudComposite" || envelope.PassKind === PASS_HUD_COMPOSITE) {
            return executeHudCompositeComputePass;
        }

        return null;
    }

    function shaderModule(passId) {
        if (!device) {
            return null;
        }

        if (moduleCache.has(passId)) {
            return moduleCache.get(passId);
        }

        const source = shaderSources[passId];
        if (!source) {
            return null;
        }

        const module = device.createShaderModule({
            label: `AIKernel ${passId}`,
            code: source
        });
        moduleCache.set(passId, module);
        return module;
    }

    function hasShaderSource(passId) {
        const source = shaderSources[passId];
        return typeof source === "string" && source.trim().length > 0;
    }

    function hasInjectedPassExecutor(shortName, passId, passKind) {
        if (!passExecutors) {
            return false;
        }

        if (typeof passExecutors === "function") {
            return true;
        }

        return [
            shortName,
            passId,
            String(passKind),
            `pass:${passKind}`
        ].some(candidate => typeof passExecutors[candidate] === "function");
    }

    function browserPassDiagnostics() {
        const builtInEnabled = options.useBuiltInPassExecutors !== false;
        return Object.fromEntries(CANONICAL_PASSES.map(pass => {
            const shaderBound = hasShaderSource(pass.passId);
            const builtInExecutor = builtInEnabled;
            return [
                pass.name,
                {
                    PassId: pass.passId,
                    PassKind: pass.passKind,
                    ShaderBound: shaderBound,
                    PipelineCached: moduleCache.has(pass.passId),
                    BuiltInExecutor: builtInExecutor,
                    InjectedExecutor: hasInjectedPassExecutor(pass.shortName, pass.passId, pass.passKind),
                    ReadyForBuiltIn: !!device && !!queue && !deviceLost && shaderBound && builtInExecutor
                }
            ];
        }));
    }

    function browserPassReadiness() {
        return formatPassReadiness(browserPassDiagnostics());
    }

    async function dispatchIfReady(envelope, expectedKind, expectedId, readiness = {}) {
        requirePass(envelope, expectedKind, expectedId);
        if (!await initialize() || deviceLost) {
            onFallback(deviceLost ? `device-lost:${lostReason ?? "unknown"}` : "webgpu-unavailable");
            return null;
        }

        const raw = requireTarget(envelope, "raw", TARGET_RAW_FRAMEBUFFER);
        if ((readiness.requireRawZeroCopy ?? true) && !raw.ZeroCopy) {
            onFallback("raw-target-not-zero-copy");
            return null;
        }

        const rawTexture = targetTexture(raw);
        if ((readiness.requireRawTexture ?? true) && !rawTexture) {
            onFallback("raw-texture-not-bound");
            return null;
        }

        const module = shaderModule(envelope.PassId);
        if (!module) {
            onFallback(`shader-not-bound:${envelope.PassId}`);
            return null;
        }

        return { raw, rawTexture, module };
    }

    function createBufferValuesReader(envelope) {
        return name => {
            const buffer = name && envelope?.Buffers
                ? envelope.Buffers.find(item => item.Name === name)
                : null;
            return buffer?.Values ?? [];
        };
    }

    function createBufferDescriptorReader(envelope) {
        return name => {
            const buffer = name && envelope?.Buffers
                ? envelope.Buffers.find(item => item.Name === name)
                : null;
            return buffer ?? null;
        };
    }

    function bufferValuesFromDescriptor(envelope, name) {
        const buffer = name && envelope?.Buffers
            ? envelope.Buffers.find(item => item.Name === name)
            : null;
        return buffer?.Values ?? [];
    }

    function createStorageBufferFromValues(values, usage = 0, label = "AIKernel canonical storage input") {
        if (!device) {
            return null;
        }

        const source = values instanceof Float32Array ? values : new Float32Array(values ?? []);
        const buffer = device.createBuffer({
            label,
            size: Math.max(source.byteLength, 4),
            usage: usage || GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST | GPU_BUFFER_USAGE.COPY_SRC
        });

        if (source.byteLength > 0) {
            queue.writeBuffer(buffer, 0, source.buffer, source.byteOffset, source.byteLength);
        }

        return buffer;
    }

    function scalarValue(scalars, name, fallback = 0) {
        const value = scalars?.[name];
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function createHudUniformValues(envelope) {
        const scalars = envelope?.Scalars ?? {};
        return new Float32Array([
            scalarValue(scalars, "compassHeadingDegrees"),
            scalarValue(scalars, "compassConfidence"),
            scalarValue(scalars, "compassUsable"),
            scalarValue(scalars, "radarMode"),
            scalarValue(scalars, "kinesisX"),
            scalarValue(scalars, "kinesisY"),
            scalarValue(scalars, "visualEnemyYawDegrees"),
            scalarValue(scalars, "visualEnemyConfidence"),
            scalarValue(scalars, "audioEnemyYawDegrees"),
            scalarValue(scalars, "audioEnemyConfidence"),
            scalarValue(scalars, "fusedEnemyYawDegrees"),
            scalarValue(scalars, "fusedEnemyConfidence"),
            scalarValue(scalars, "sdfLink"),
            scalarValue(scalars, "flicker", 1),
            scalarValue(scalars, "hold"),
            scalarValue(scalars, "decay")
        ]);
    }

    function createOutputBuffer(floatCount, usage = 0, label = "AIKernel canonical storage output") {
        if (!device) {
            return null;
        }

        return device.createBuffer({
            label,
            size: Math.max(floatCount * Float32Array.BYTES_PER_ELEMENT, 4),
            usage: usage || GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_SRC | GPU_BUFFER_USAGE.COPY_DST
        });
    }

    function createFeatureMaskTexture(target, label = "AIKernel canonical aisthesis feature mask") {
        if (!device || typeof device.createTexture !== "function") {
            return null;
        }

        return device.createTexture({
            label,
            size: {
                width: Math.max(1, target.Width),
                height: Math.max(1, target.Height),
                depthOrArrayLayers: 1
            },
            format: "rgba8unorm",
            usage: GPU_TEXTURE_USAGE.STORAGE_BINDING | GPU_TEXTURE_USAGE.TEXTURE_BINDING | GPU_TEXTURE_USAGE.COPY_SRC
        });
    }

    async function readFloatBuffer(buffer, floatCount) {
        if (!device || !buffer || floatCount <= 0) {
            return [];
        }

        const byteLength = floatCount * Float32Array.BYTES_PER_ELEMENT;
        const readback = device.createBuffer({
            label: "AIKernel canonical readback",
            size: Math.max(byteLength, 4),
            usage: GPU_BUFFER_USAGE.COPY_DST | GPU_BUFFER_USAGE.MAP_READ
        });
        const encoder = device.createCommandEncoder({ label: "AIKernel canonical readback encoder" });
        encoder.copyBufferToBuffer(buffer, 0, readback, 0, byteLength);
        queue.submit([encoder.finish()]);
        await readback.mapAsync(GPU_MAP_MODE.READ, 0, byteLength);
        const values = Array.from(new Float32Array(readback.getMappedRange(0, byteLength).slice(0)));
        readback.unmap();
        return values;
    }

    async function createComputePipeline(passId, module) {
        if (!device || !module) {
            return null;
        }

        const cacheKey = `pipeline:${passId}`;
        if (moduleCache.has(cacheKey)) {
            return moduleCache.get(cacheKey);
        }

        const descriptor = {
            label: `AIKernel ${passId} pipeline`,
            layout: "auto",
            compute: {
                module,
                entryPoint: "main"
            }
        };
        if (typeof device.createComputePipeline !== "function" &&
            typeof device.createComputePipelineAsync !== "function") {
            return null;
        }

        const pipeline = typeof device.createComputePipeline === "function"
            ? device.createComputePipeline(descriptor)
            : await device.createComputePipelineAsync(descriptor);
        moduleCache.set(cacheKey, pipeline);
        return pipeline;
    }

    function textureView(rawTexture) {
        if (!rawTexture) {
            return null;
        }

        if (typeof rawTexture.createView === "function") {
            return rawTexture.createView();
        }

        if (rawTexture.view) {
            return rawTexture.view;
        }

        if (typeof rawTexture.texture?.createView === "function") {
            return rawTexture.texture.createView();
        }

        return null;
    }

    async function executeAisthesisComputePass(context) {
        const view = textureView(context.rawTexture);
        if (!view) {
            onFallback("raw-texture-view-unavailable");
            return null;
        }

        const outputBuffer = createOutputBuffer(
            VECTOR_STRIDE,
            GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_SRC | GPU_BUFFER_USAGE.COPY_DST,
            "AIKernel canonical aisthesis feature vector");
        const maskTexture = createFeatureMaskTexture(context.rawTarget);
        const maskView = textureView(maskTexture);
        const pipeline = await createComputePipeline(context.envelope.PassId, context.shaderModule);
        if (!outputBuffer || !maskTexture || !maskView || !pipeline) {
            onFallback("aisthesis-command-encoder-unavailable");
            return null;
        }

        const bindGroup = device.createBindGroup({
            label: "AIKernel canonical aisthesis bind group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: view },
                { binding: 1, resource: { buffer: outputBuffer } },
                { binding: 2, resource: maskView }
            ]
        });
        const encoder = device.createCommandEncoder({ label: "AIKernel canonical aisthesis encoder" });
        const pass = encoder.beginComputePass({ label: "AIKernel canonical aisthesis pass" });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(
            Math.max(1, Math.ceil(context.rawTarget.Width / 8)),
            Math.max(1, Math.ceil(context.rawTarget.Height / 8)),
            1);
        pass.end();
        queue.submit([encoder.finish()]);

        const vector = await readFloatBuffer(outputBuffer, VECTOR_STRIDE);
        return {
            Frame: frameToken(context.envelope, context.rawTarget),
            FeatureVector: padVector(vector, VECTOR_STRIDE),
            MaskTexture: {
                TargetId: `${context.rawTarget.TargetId}:feature-mask`,
                Kind: TARGET_FEATURE_MASK,
                Backend: BACKEND_WEBGPU,
                Width: context.rawTarget.Width,
                Height: context.rawTarget.Height,
                PixelFormat: context.rawTarget.PixelFormat,
                ZeroCopy: context.rawTarget.ZeroCopy
            },
            Diagnostics: diagnostics(context.envelope, context.rawTarget, Object.assign(computeMetadata(), {
                [GPU_METADATA_KEYS.featureMaskStorageTexture]: "true",
                [GPU_METADATA_KEYS.passReadiness]: browserPassReadiness()
            }))
        };
    }

    async function executeSpatialReasoningComputePass(context) {
        const inputBuffer = createStorageBufferFromValues(
            createSpatialInputValues(context.envelope),
            GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST,
            "AIKernel canonical spatial input");
        const outputBuffer = createOutputBuffer(
            VECTOR_STRIDE,
            GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_SRC | GPU_BUFFER_USAGE.COPY_DST,
            "AIKernel canonical spatial output");
        const pipeline = await createComputePipeline(context.envelope.PassId, context.shaderModule);
        if (!inputBuffer || !outputBuffer || !pipeline) {
            onFallback("spatial-command-encoder-unavailable");
            return null;
        }

        const bindGroup = device.createBindGroup({
            label: "AIKernel canonical spatial bind group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: inputBuffer } },
                { binding: 1, resource: { buffer: outputBuffer } }
            ]
        });
        const encoder = device.createCommandEncoder({ label: "AIKernel canonical spatial encoder" });
        const pass = encoder.beginComputePass({ label: "AIKernel canonical spatial pass" });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(1, 1, 1);
        pass.end();
        queue.submit([encoder.finish()]);

        const raw = requireTarget(context.envelope, "raw", TARGET_RAW_FRAMEBUFFER);
        const vector = await readFloatBuffer(outputBuffer, VECTOR_STRIDE);
        return {
            Frame: frameToken(context.envelope, raw),
            SpatialVector: padVector(vector, VECTOR_STRIDE),
            Diagnostics: diagnostics(context.envelope, raw, computeMetadata(browserPassReadiness()))
        };
    }

    async function executeHudCompositeComputePass(context) {
        const hudTarget = context.envelope.Targets.find(item => item.Role === "hud");
        if (!hudTarget) {
            onFallback("hud-target-not-declared");
            return null;
        }

        const hudTexture = targetTexture(hudTarget);
        const hudView = textureView(hudTexture);
        if (!hudView) {
            onFallback("hud-texture-view-unavailable");
            return null;
        }

        const uniformBuffer = createStorageBufferFromValues(
            createHudUniformValues(context.envelope),
            GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
            "AIKernel canonical hud uniform input");
        const pipeline = await createComputePipeline(context.envelope.PassId, context.shaderModule);
        if (!uniformBuffer || !pipeline) {
            onFallback("hud-command-encoder-unavailable");
            return null;
        }

        const bindGroup = device.createBindGroup({
            label: "AIKernel canonical hud composite bind group",
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: uniformBuffer } },
                { binding: 1, resource: hudView }
            ]
        });
        const encoder = device.createCommandEncoder({ label: "AIKernel canonical hud composite encoder" });
        const pass = encoder.beginComputePass({ label: "AIKernel canonical hud composite pass" });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(
            Math.max(1, Math.ceil(hudTarget.Width / 8)),
            Math.max(1, Math.ceil(hudTarget.Height / 8)),
            1);
        pass.end();
        queue.submit([encoder.finish()]);

        return {
            TargetId: hudTarget.TargetId,
            Kind: TARGET_HUD_COMPOSITE,
            Backend: BACKEND_WEBGPU,
            Width: hudTarget.Width,
            Height: hudTarget.Height,
            PixelFormat: hudTarget.PixelFormat,
            ZeroCopy: hudTarget.ZeroCopy
        };
    }

    function createSpatialInputValues(envelope) {
        const matrices = ["ais-matrix:topos", "ais-matrix:route", "ais-matrix:threat", "ais-matrix:zoe"];
        const values = [];
        for (const name of matrices) {
            values.push(...padVector(bufferValuesFromDescriptor(envelope, name), 81));
        }

        values.push(...padVector(bufferValuesFromDescriptor(envelope, "state-vector"), 16));
        return values;
    }

    async function executeInjectedPass(shortName, envelope, ready) {
        const passExecutor = resolvePassExecutor(shortName, envelope);
        if (!passExecutor) {
            onFallback(`${shortName}-pass-executor-not-bound`);
            return null;
        }

        const result = await passExecutor({
            adapter,
            device,
            queue,
            envelope,
            rawTarget: ready.raw,
            rawTexture: ready.rawTexture,
            shaderModule: ready.module,
            targets: envelope.Targets,
            buffers: envelope.Buffers,
            scalars: envelope.Scalars,
            featureFlags: envelope.FeatureFlags,
            resolveTexture: targetTexture,
            bufferValues: createBufferValuesReader(envelope),
            bufferDescriptor: createBufferDescriptorReader(envelope),
            bufferValuesFromDescriptor,
            createStorageBufferFromValues,
            createOutputBuffer,
            readFloatBuffer,
            fallback: {
                aisthesis: createAisthesisFallback,
                spatial: createSpatialFallback,
                hud: createHudFallback
            }
        });

        if (!result) {
            onFallback(`${shortName}-pass-executor-returned-empty`);
            return null;
        }

        return result;
    }

    return {
        isWebGpuSupported() {
            return !disposed &&
                !deviceLost &&
                (typeof navigator !== "undefined" && !!navigator.gpu || !!device);
        },

        async initialize() {
            return initialize();
        },

        getDiagnostics() {
            return {
                Initialized: initialized,
                DeviceLost: deviceLost,
                LostReason: lostReason,
                FallbackCount: fallbackCount,
                LastFallbackReason: lastFallbackReason,
                HasDevice: !!device,
                HasQueue: !!queue,
                ShaderModuleCount: moduleCache.size,
                HasTextureRegistry: !!textureRegistry,
                UseBuiltInPassExecutors: options.useBuiltInPassExecutors !== false,
                HasPassExecutors: !!passExecutors && (
                    typeof passExecutors === "function" ||
                    Object.keys(passExecutors).length > 0),
                Passes: browserPassDiagnostics(),
                PassReadiness: browserPassReadiness()
            };
        },

        async dispatchAisthesisEnvelope(envelope) {
            const ready = await dispatchIfReady(envelope, PASS_AISTHESIS, PASS_ID_AISTHESIS);
            if (!ready) {
                return null;
            }

            return executeInjectedPass("aisthesis", envelope, ready);
        },

        async dispatchSpatialReasoningEnvelope(envelope) {
            const ready = await dispatchIfReady(envelope, PASS_SPATIAL_REASONING, PASS_ID_SPATIAL_REASONING, {
                requireRawTexture: false,
                requireRawZeroCopy: false
            });
            if (!ready) {
                return null;
            }

            return executeInjectedPass("spatialReasoning", envelope, ready);
        },

        async dispatchHudCompositeEnvelope(envelope) {
            const ready = await dispatchIfReady(envelope, PASS_HUD_COMPOSITE, PASS_ID_HUD_COMPOSITE, {
                requireRawTexture: false,
                requireRawZeroCopy: false
            });
            if (!ready) {
                return null;
            }

            return executeInjectedPass("hudComposite", envelope, ready);
        },

        dispose() {
            disposed = true;
            moduleCache.clear();
            adapter = null;
            device = null;
            queue = null;
        }
    };
}

export function createNullWebGpuExecutor() {
    return {
        isWebGpuSupported() {
            return typeof navigator !== "undefined" && !!navigator.gpu;
        }
    };
}

function createAisthesisFallback(envelope, fallbackReason = null) {
    const raw = requireTarget(envelope, "raw", TARGET_RAW_FRAMEBUFFER);
    const vector = createVector();
    vector[0] = raw.Width;
    vector[1] = raw.Height;
    vector[2] = raw.ZeroCopy ? 1 : 0;
    vector[3] = Object.keys(envelope.FeatureFlags).filter(key => envelope.FeatureFlags[key]).length;

    return {
        Frame: frameToken(envelope, raw),
        FeatureVector: vector,
        MaskTexture: {
            TargetId: `${raw.TargetId}:feature-mask`,
            Kind: TARGET_FEATURE_MASK,
            Backend: BACKEND_WEBGPU,
            Width: raw.Width,
            Height: raw.Height,
            PixelFormat: raw.PixelFormat,
            ZeroCopy: raw.ZeroCopy
        },
        Diagnostics: diagnostics(envelope, raw, fallbackMetadata(fallbackReason), fallbackReason)
    };
}

function createSpatialFallback(envelope, fallbackReason = null) {
    const raw = requireTarget(envelope, "raw", TARGET_RAW_FRAMEBUFFER);
    const vector = createVector();
    const matrices = ["ais-matrix:topos", "ais-matrix:route", "ais-matrix:threat", "ais-matrix:zoe"];

    matrices.forEach((name, index) => {
        const buffer = envelope.Buffers.find(item => item.Name === name);
        const summary = summarize(buffer?.Values ?? []);
        const offset = index * 4;
        vector[offset] = summary.average;
        vector[offset + 1] = summary.max;
        vector[offset + 2] = summary.min;
        vector[offset + 3] = summary.active;
    });

    const state = envelope.Buffers.find(item => item.Name === "state-vector");
    if (state) {
        const limit = Math.min(state.Values.length, VECTOR_STRIDE - 16);
        for (let index = 0; index < limit; index += 1) {
            vector[16 + index] = state.Values[index];
        }
    }

    return {
        Frame: frameToken(envelope, raw),
        SpatialVector: vector,
        Diagnostics: diagnostics(envelope, raw, fallbackMetadata(fallbackReason), fallbackReason)
    };
}

function createHudFallback(envelope) {
    const raw = requireTarget(envelope, "raw", TARGET_RAW_FRAMEBUFFER);
    const hud = envelope.Targets.find(item => item.Role === "hud");
    if (hud) {
        return {
            TargetId: hud.TargetId,
            Kind: TARGET_HUD_COMPOSITE,
            Backend: BACKEND_WEBGPU,
            Width: hud.Width,
            Height: hud.Height,
            PixelFormat: hud.PixelFormat,
            ZeroCopy: hud.ZeroCopy
        };
    }

    return {
        TargetId: `${raw.TargetId}:hud-composite`,
        Kind: TARGET_HUD_COMPOSITE,
        Backend: BACKEND_WEBGPU,
        Width: raw.Width,
        Height: raw.Height,
        PixelFormat: 3,
        ZeroCopy: raw.ZeroCopy
    };
}

function normalizeEnvelope(input) {
    const envelope = {
        Schema: valueOf(input, "Schema", "schema") ?? SCHEMA,
        Version: valueOf(input, "Version", "version") ?? "0.1.3",
        PassId: valueOf(input, "PassId", "passId"),
        PassKind: valueOf(input, "PassKind", "passKind"),
        Frame: normalizeFrame(valueOf(input, "Frame", "frame")),
        Targets: (valueOf(input, "Targets", "targets") ?? []).map(normalizeTarget),
        Buffers: (valueOf(input, "Buffers", "buffers") ?? []).map(normalizeBuffer),
        FeatureFlags: valueOf(input, "FeatureFlags", "featureFlags") ?? {},
        Scalars: valueOf(input, "Scalars", "scalars") ?? {},
        Labels: valueOf(input, "Labels", "labels") ?? [],
        Metadata: metadataOf(valueOf(input, "Metadata", "metadata")),
        Tags: valueOf(input, "Tags", "tags") ?? {}
    };

    if (envelope.Schema !== SCHEMA) {
        throw new Error(`Unsupported AIKernel GPU envelope schema: ${envelope.Schema}`);
    }

    if (!envelope.PassId) {
        throw new Error("AIKernel GPU envelope is missing PassId.");
    }

    if (!envelope.Frame.FrameId) {
        throw new Error("AIKernel GPU envelope is missing Frame.FrameId.");
    }

    envelope.MetadataValidationError = validateCanonicalEnvelopeMetadata(envelope.Metadata, envelope);
    return envelope;
}

function requirePass(envelope, passKind, passId) {
    if (envelope.PassKind !== passKind || envelope.PassId !== passId) {
        throw new Error(`Unexpected AIKernel GPU pass. Expected ${passId}/${passKind}.`);
    }
}

function requireTarget(envelope, role, kind) {
    const target = envelope.Targets.find(item => item.Role === role);
    if (!target) {
        throw new Error(`AIKernel GPU envelope is missing target role '${role}'.`);
    }

    if (target.Kind !== kind) {
        throw new Error(`AIKernel GPU target '${role}' has invalid kind ${target.Kind}.`);
    }

    return target;
}

function normalizeFrame(frame = {}) {
    return {
        FrameId: valueOf(frame, "FrameId", "frameId") ?? "frame-0",
        FrameIndex: numberOf(valueOf(frame, "FrameIndex", "frameIndex")),
        SampleTicks: numberOf(valueOf(frame, "SampleTicks", "sampleTicks"))
    };
}

function normalizeTarget(target) {
    return {
        Role: valueOf(target, "Role", "role") ?? "",
        TargetId: valueOf(target, "TargetId", "targetId") ?? "",
        Kind: numberOf(valueOf(target, "Kind", "kind")),
        Backend: numberOf(valueOf(target, "Backend", "backend")),
        Width: numberOf(valueOf(target, "Width", "width")),
        Height: numberOf(valueOf(target, "Height", "height")),
        PixelFormat: numberOf(valueOf(target, "PixelFormat", "pixelFormat")),
        ZeroCopy: !!valueOf(target, "ZeroCopy", "zeroCopy")
    };
}

function normalizeBuffer(buffer) {
    return {
        Name: valueOf(buffer, "Name", "name") ?? "",
        LayoutName: valueOf(buffer, "LayoutName", "layoutName") ?? "",
        Stride: numberOf(valueOf(buffer, "Stride", "stride")),
        Count: numberOf(valueOf(buffer, "Count", "count")),
        Values: Array.from(valueOf(buffer, "Values", "values") ?? [])
    };
}

function frameToken(envelope, raw) {
    return {
        FrameId: envelope.Frame.FrameId,
        FrameIndex: envelope.Frame.FrameIndex,
        SampleTicks: envelope.Frame.SampleTicks,
        RawTarget: raw
    };
}

function diagnostics(envelope, raw, metadata = {}, fallbackReason = null) {
    const estimate = Math.max(0, raw.Width) * Math.max(0, raw.Height);
    const reason = textOf(fallbackReason) || (raw.ZeroCopy ? null : "raw-target-not-zero-copy");
    return {
        Backend: "WebGpu",
        ZeroCopy: raw.ZeroCopy,
        Readback: raw.ZeroCopy ? 0 : 3,
        FallbackReason: reason,
        FrameId: envelope.Frame.FrameId,
        PassId: envelope.PassId,
        MemoryEstimate: estimate,
        Metadata: canonicalMetadata(envelope, metadata)
    };
}

function computeMetadata(passReadiness = null) {
    return {
        [GPU_METADATA_KEYS.authoritativeReady]: "false",
        [GPU_METADATA_KEYS.candidateStreak]: "1",
        [GPU_METADATA_KEYS.diagnosticReady]: "true",
        [GPU_METADATA_KEYS.diagnosticStreak]: "1",
        ...(passReadiness ? { [GPU_METADATA_KEYS.passReadiness]: passReadiness } : {}),
        [GPU_METADATA_KEYS.pilotState]: GPU_VALUES.pilotState.browserBuiltinCompute,
        [GPU_METADATA_KEYS.promotionGate]: GPU_VALUES.promotionGate.traceCandidate,
        [GPU_METADATA_KEYS.requiredStreak]: "1",
        [GPU_EXECUTION_MODE]: GPU_VALUES.execution.browserWebGpuCompute
    };
}

function fallbackMetadata(fallbackReason = null) {
    const reason = textOf(fallbackReason);
    const validationError = reason.startsWith("metadata-invalid:")
        ? reason.slice("metadata-invalid:".length)
        : "";
    return {
        [GPU_METADATA_KEYS.passReadiness]: formatPassReadiness(),
        [GPU_METADATA_KEYS.pilotState]: GPU_VALUES.pilotState.browserDeterministicFallback,
        [GPU_METADATA_KEYS.promotionGate]: GPU_VALUES.promotionGate.fallback,
        [GPU_EXECUTION_MODE]: GPU_VALUES.execution.deterministicFallback,
        ...(validationError ? { [GPU_METADATA_KEYS.metadataValidationError]: validationError } : {})
    };
}

function canonicalMetadata(envelope, overrides = {}) {
    const passId = envelope.PassId;
    const envelopeMetadata = metadataOf(valueOf(envelope, "Metadata", "metadata"));
    const metadata = {
        [GPU_METADATA_KEYS.authoritativeReady]: "false",
        [GPU_METADATA_KEYS.candidateStreak]: "0",
        [GPU_METADATA_KEYS.diagnosticReady]: "false",
        [GPU_METADATA_KEYS.diagnosticStreak]: "0",
        [GPU_METADATA_KEYS.featureMaskStorageTexture]: "false",
        [GPU_METADATA_KEYS.frameIndex]: `${Math.max(0, numberOf(envelope.Frame.FrameIndex))}`,
        [GPU_METADATA_KEYS.passId]: passId,
        [GPU_METADATA_KEYS.passReadiness]: formatPassReadiness(),
        [GPU_METADATA_KEYS.pathRole]: resolvePathRole(passId),
        [GPU_METADATA_KEYS.pilotState]: GPU_VALUES.pilotState.notEvaluated,
        [GPU_METADATA_KEYS.promotionGate]: GPU_VALUES.promotionGate.notEvaluated,
        [GPU_METADATA_KEYS.requiredStreak]: "0",
        [GPU_METADATA_KEYS.sampleTicks]: `${Math.max(0, numberOf(envelope.Frame.SampleTicks))}`,
        ...envelopeMetadata,
        ...overrides
    };
    return sortObject(Object.assign(metadata, evaluatePromotionReadiness(metadata)));
}

function validateCanonicalEnvelopeMetadata(metadata, envelope) {
    if (!metadata || Object.keys(metadata).length === 0) {
        return "metadata-required";
    }

    for (const key of GPU_REQUIRED_METADATA_KEYS) {
        if (isBlank(metadata[key])) {
            return key;
        }
    }

    if (metadata[GPU_METADATA_KEYS.passId] !== envelope.PassId) {
        return GPU_METADATA_KEYS.passId;
    }

    if (!GPU_ALLOWED_PATH_ROLES.has(metadata[GPU_METADATA_KEYS.pathRole])) {
        return GPU_METADATA_KEYS.pathRole;
    }

    if (!GPU_ALLOWED_EXECUTION_MODES.has(metadata[GPU_EXECUTION_MODE])) {
        return GPU_EXECUTION_MODE;
    }

    if (!GPU_ALLOWED_PILOT_STATES.has(metadata[GPU_METADATA_KEYS.pilotState])) {
        return GPU_METADATA_KEYS.pilotState;
    }

    if (!GPU_ALLOWED_PROMOTION_GATES.has(metadata[GPU_METADATA_KEYS.promotionGate])) {
        return GPU_METADATA_KEYS.promotionGate;
    }

    for (const key of GPU_BOOL_METADATA_KEYS) {
        const value = `${metadata[key]}`.toLowerCase();
        if (value !== "true" && value !== "false") {
            return key;
        }
    }

    for (const key of GPU_INTEGER_METADATA_KEYS) {
        const value = Number(metadata[key]);
        if (!Number.isFinite(value) || Math.floor(value) !== value || value < 0) {
            return key;
        }
    }

    if (!metadata[GPU_METADATA_KEYS.passReadiness].startsWith("Passes.{Aisthesis,SpatialReasoning,HudComposite}:")) {
        return GPU_METADATA_KEYS.passReadiness;
    }

    return "";
}

function metadataOf(value) {
    if (!value || typeof value !== "object") {
        return {};
    }

    const metadata = {};
    for (const [key, raw] of Object.entries(value)) {
        if (key && raw !== null && raw !== undefined) {
            metadata[key] = `${raw}`;
        }
    }

    return metadata;
}

function metadataInvalidReason(envelope) {
    const key = textOf(envelope?.MetadataValidationError) || "metadata-invalid";
    return `metadata-invalid:${key}`;
}

function executorFallbackReason(executor) {
    if (!executor || typeof executor.getDiagnostics !== "function") {
        return null;
    }

    const diagnostics = executor.getDiagnostics();
    return textOf(diagnostics?.LastFallbackReason) || null;
}

function isBlank(value) {
    return value === undefined || value === null || `${value}`.trim() === "";
}

function evaluatePromotionReadiness(metadata) {
    const gate = textOf(metadata[GPU_METADATA_KEYS.promotionGate]) || GPU_VALUES.promotionGate.notEvaluated;
    const authoritativeReady = boolOf(metadata[GPU_METADATA_KEYS.authoritativeReady]);
    const diagnosticReady = boolOf(metadata[GPU_METADATA_KEYS.diagnosticReady]);
    const storageTextureReady = boolOf(metadata[GPU_METADATA_KEYS.featureMaskStorageTexture]);
    const candidateStreak = Math.max(0, numberOf(metadata[GPU_METADATA_KEYS.candidateStreak]));
    const diagnosticStreak = Math.max(0, numberOf(metadata[GPU_METADATA_KEYS.diagnosticStreak]));
    const requiredStreak = Math.max(0, numberOf(metadata[GPU_METADATA_KEYS.requiredStreak]));

    let blocked = true;
    let candidateReady = false;
    let diagnosticStable = false;
    let reason = gate;

    if (gate === "not-applicable") {
        blocked = false;
        reason = "not-applicable";
    } else if (gate === GPU_VALUES.promotionGate.traceCandidate && requiredStreak > 0) {
        diagnosticStable = diagnosticReady && diagnosticStreak >= requiredStreak;
        const candidateStable = candidateStreak >= requiredStreak;
        candidateReady = storageTextureReady && diagnosticStable && candidateStable;
        blocked = !storageTextureReady;
        if (candidateReady && authoritativeReady) {
            reason = "authoritative-ready";
        } else if (!storageTextureReady) {
            reason = "storage-texture-not-ready";
        } else if (!diagnosticReady) {
            reason = "diagnostic-not-ready";
        } else if (!diagnosticStable || !candidateStable) {
            reason = "streak-not-ready";
        } else {
            reason = "authoritative-not-ready";
        }
    } else if (gate === GPU_VALUES.promotionGate.traceCandidate) {
        reason = "metadata-invalid";
    }

    return {
        [GPU_METADATA_KEYS.promotionBlocked]: boolText(blocked),
        [GPU_METADATA_KEYS.promotionCandidateReady]: boolText(candidateReady),
        [GPU_METADATA_KEYS.promotionDiagnosticStable]: boolText(diagnosticStable),
        [GPU_METADATA_KEYS.promotionReason]: reason
    };
}

function formatPassReadiness(passes = null) {
    const passRows = CANONICAL_PASSES.map(pass => {
        const value = passes?.[pass.name] ?? {};
        return `${pass.name}{` +
            `ShaderBound=${boolText(value.ShaderBound)},` +
            `PipelineCached=${boolText(value.PipelineCached)},` +
            `BuiltInExecutor=${boolText(value.BuiltInExecutor)},` +
            `InjectedExecutor=${boolText(value.InjectedExecutor)},` +
            `ReadyForBuiltIn=${boolText(value.ReadyForBuiltIn)}}`;
    });

    return `Passes.{Aisthesis,SpatialReasoning,HudComposite}:` + passRows.join(";");
}

function boolText(value) {
    return value ? "true" : "false";
}

function boolOf(value) {
    return `${value}`.toLowerCase() === "true";
}

function textOf(value) {
    return value === undefined || value === null ? "" : `${value}`;
}

function resolvePathRole(passId) {
    const normalized = `${passId ?? ""}`.toLowerCase();
    if (normalized.includes("aisthesis") || normalized.includes("spatial") || normalized.includes("sensor")) {
        return GPU_VALUES.pathRole.sensor;
    }

    if (normalized.includes("hud")) {
        return GPU_VALUES.pathRole.hud;
    }

    if (normalized.includes("bonsai")) {
        return GPU_VALUES.pathRole.bonsai;
    }

    if (normalized.includes("game")) {
        return GPU_VALUES.pathRole.game;
    }

    return "unknown";
}

function sortObject(values) {
    return Object.fromEntries(
        Object.entries(values)
            .filter(([, value]) => value !== undefined && value !== null)
            .sort(([left], [right]) => left.localeCompare(right)));
}

function summarize(values) {
    if (!values.length) {
        return { average: 0, max: 0, min: 0, active: 0 };
    }

    let sum = 0;
    let max = -Infinity;
    let min = Infinity;
    let active = 0;
    for (const value of values) {
        const current = Number(value) || 0;
        sum += current;
        max = Math.max(max, current);
        min = Math.min(min, current);
        if (current > 0.5) {
            active += 1;
        }
    }

    return {
        average: sum / values.length,
        max,
        min,
        active
    };
}

function createVector() {
    return Array.from({ length: VECTOR_STRIDE }, () => 0);
}

function padVector(values, length) {
    const output = Array.from({ length }, () => 0);
    const source = Array.from(values ?? []);
    const limit = Math.min(source.length, length);
    for (let index = 0; index < limit; index += 1) {
        output[index] = Number(source[index]) || 0;
    }

    return output;
}

function numberOf(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function valueOf(source, pascalName, camelName) {
    if (!source) {
        return undefined;
    }

    if (Object.prototype.hasOwnProperty.call(source, pascalName)) {
        return source[pascalName];
    }

    return source[camelName];
}

globalThis.AIKernelWebGpu = {
    ...(globalThis.AIKernelWebGpu ?? {}),
    createWebGpuEnvelopeBridge,
    createWebGpuBrowserExecutor,
    createNullWebGpuExecutor
};
