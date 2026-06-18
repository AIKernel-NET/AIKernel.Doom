(function () {
  "use strict";

  const FRAME_TARGET = "doom";
  const WORKGROUP_SIZE = 8;
  const HUD_GRID_SIZE = 9;
  const HUD_CELL_COUNT = HUD_GRID_SIZE * HUD_GRID_SIZE;
  const HUD_UNIFORM_FLOATS = 8;

  const PALETTE_COMPUTE_SHADER = `
struct FrameInfo {
  width: u32,
  height: u32,
  frame: u32,
  _pad: u32,
};

@group(0) @binding(0) var<storage, read> indices: array<u32>;
@group(0) @binding(1) var<storage, read> palette: array<vec4<f32>>;
@group(0) @binding(2) var outputFrame: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var<uniform> info: FrameInfo;

@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= info.width || id.y >= info.height) {
    return;
  }

  let pixel = id.y * info.width + id.x;
  let colorIndex = indices[pixel] & 255u;
  textureStore(outputFrame, vec2<i32>(i32(id.x), i32(id.y)), palette[colorIndex]);
}
`;

  const PRESENT_SHADER = `
struct HudInfo {
  timeSeconds: f32,
  enabled: f32,
  heatmapEnabled: f32,
  kairos: f32,
  useProbeTurn: f32,
  enemyConfidence: f32,
  depthEstimate: f32,
  _pad0: f32,
};

@group(0) @binding(0) var frameSampler: sampler;
@group(0) @binding(1) var frameTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> hud: HudInfo;
@group(0) @binding(3) var<storage, read> hudCells: array<f32>;

struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOut {
  var positions = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0)
  );
  var uvs = array<vec2<f32>, 3>(
    vec2<f32>(0.0, 1.0),
    vec2<f32>(2.0, 1.0),
    vec2<f32>(0.0, -1.0)
  );

  var out: VertexOut;
  out.position = vec4<f32>(positions[vertexIndex], 0.0, 1.0);
  out.uv = uvs[vertexIndex];
  return out;
}

fn alphaComposite(base: vec4<f32>, overlay: vec4<f32>) -> vec4<f32> {
  let alpha = clamp(overlay.a, 0.0, 1.0);
  return vec4<f32>(base.rgb * (1.0 - alpha) + overlay.rgb * alpha, 1.0);
}

fn heatColor(value: f32) -> vec3<f32> {
  let v = clamp(value, 0.0, 1.0);
  let cold = vec3<f32>(0.05, 0.22, 0.95);
  let mid = vec3<f32>(0.02, 0.92, 0.72);
  let hot = vec3<f32>(1.0, 0.76, 0.08);
  let fire = vec3<f32>(1.0, 0.16, 0.06);
  let lowT = clamp(v * 2.0, 0.0, 1.0);
  let highT = clamp((v - 0.5) * 2.0, 0.0, 1.0);
  let low = cold * (1.0 - lowT) + mid * lowT;
  let high = hot * (1.0 - highT) + fire * highT;
  let chooseHigh = step(0.5, v);
  return low * (1.0 - chooseHigh) + high * chooseHigh;
}

fn rectGlow(uv: vec2<f32>, minCorner: vec2<f32>, maxCorner: vec2<f32>, soft: f32) -> f32 {
  let insideX = step(minCorner.x, uv.x) * step(uv.x, maxCorner.x);
  let insideY = step(minCorner.y, uv.y) * step(uv.y, maxCorner.y);
  let inside = insideX * insideY;
  let dx = max(max(minCorner.x - uv.x, 0.0), uv.x - maxCorner.x);
  let dy = max(max(minCorner.y - uv.y, 0.0), uv.y - maxCorner.y);
  let outsideGlow = 1.0 - smoothstep(0.0, soft, length(vec2<f32>(dx, dy)));
  return max(inside, outsideGlow * 0.72);
}

@fragment
fn fragmentMain(input: VertexOut) -> @location(0) vec4<f32> {
  let uv = clamp(input.uv, vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 1.0));
  var color = textureSample(frameTexture, frameSampler, input.uv);
  if (hud.enabled < 0.5) {
    return color;
  }

  if (hud.heatmapEnabled > 0.5 && uv.y < 0.82) {
    let gridUv = vec2<f32>(clamp(uv.x, 0.0, 0.999), clamp(uv.y / 0.82, 0.0, 0.999));
    let cellX = min(u32(floor(gridUv.x * 9.0)), 8u);
    let cellY = min(u32(floor(gridUv.y * 9.0)), 8u);
    let cell = cellY * 9u + cellX;
    let value = clamp(hudCells[cell], 0.0, 1.0);
    let local = fract(gridUv * vec2<f32>(9.0, 9.0));
    let edge = max(abs(local.x - 0.5), abs(local.y - 0.5));
    let cellInterior = 1.0 - smoothstep(0.42, 0.5, edge);
    let intensity = smoothstep(0.08, 0.78, value);
    color = alphaComposite(color, vec4<f32>(heatColor(value), cellInterior * intensity * 0.34));
  }

  let pulse = 0.5 + 0.5 * sin(hud.timeSeconds * 8.4823);
  let kairos = clamp(hud.kairos, 0.0, 1.0);
  let kairosGlow = rectGlow(uv, vec2<f32>(0.31, 0.39), vec2<f32>(0.69, 0.67), 0.04);
  color = alphaComposite(color, vec4<f32>(0.05 + 0.25 * pulse, 0.82, 1.0, kairosGlow * kairos * (0.12 + pulse * 0.20)));

  let turn = clamp(hud.useProbeTurn, -1.0, 1.0);
  if (abs(turn) > 0.05) {
    let arrowCenter = vec2<f32>(0.5 + 0.22 * turn, 0.48);
    let delta = uv - arrowCenter;
    let body = 1.0 - smoothstep(0.0, 0.115, length(vec2<f32>(delta.x * 1.5, delta.y * 3.4)));
    let noseDelta = uv - (arrowCenter + vec2<f32>(0.07 * turn, 0.0));
    let nose = 1.0 - smoothstep(0.0, 0.078, length(vec2<f32>(noseDelta.x * 1.1, noseDelta.y * 3.0)));
    color = alphaComposite(color, vec4<f32>(1.0, 0.84, 0.18, max(body * 0.22, nose * 0.42)));
  }

  let enemy = clamp(hud.enemyConfidence, 0.0, 1.0);
  if (enemy > 0.01) {
    let enemyDelta = (uv - vec2<f32>(0.5, 0.50)) * vec2<f32>(1.12, 1.0);
    let ring = 1.0 - smoothstep(0.0, 0.018, abs(length(enemyDelta) - 0.13));
    color = alphaComposite(color, vec4<f32>(1.0, 0.18, 0.08, ring * enemy * 0.54));
  }

  let nearWall = clamp(1.05 - hud.depthEstimate, 0.0, 1.0);
  let footGlow = smoothstep(0.66, 0.98, uv.y) * nearWall * 0.16;
  return alphaComposite(color, vec4<f32>(1.0, 0.42, 0.08, footGlow));
}
`;

  class BrowserWebGpuComputeProvider {
    constructor() {
      this.providerId = "webgpu.compute";
      this.name = "WebGpuComputeProvider";
      this.backendName = "browser-webgpu";
      this.supported = Boolean(navigator.gpu);
      this.usingCpuFallback = !this.supported;
      this.initialized = false;
      this.initializing = null;
      this.adapter = null;
      this.device = null;
      this.queue = null;
      this.frameStates = new Map();
      this.frameTextures = new Map();
      this.lastError = "";
      this.renderer = null;
      this.hudOverlayEnabled = false;
      this.hudOverlayState = {
        enabled: false,
        heatmapEnabled: true,
        cells: new Array(HUD_CELL_COUNT).fill(0),
        kairos: 0,
        useProbeTurn: 0,
        enemyConfidence: 0,
        depthEstimate: 1
      };
    }

    async initialize() {
      if (this.initialized || this.initializing) {
        return this.initializing || this.status();
      }

      this.initializing = (async () => {
        if (!navigator.gpu) {
          this.usingCpuFallback = true;
          this.lastError = "navigator.gpu is unavailable.";
          return this.status();
        }

        try {
          this.adapter = await navigator.gpu.requestAdapter();
          if (!this.adapter) {
            this.usingCpuFallback = true;
            this.lastError = "WebGPU adapter is unavailable.";
            return this.status();
          }

          this.device = await this.adapter.requestDevice();
          this.queue = this.device.queue;
          this.usingCpuFallback = false;
          this.initialized = true;
          this.lastError = "";
          return this.status();
        } catch (error) {
          this.device = null;
          this.queue = null;
          this.usingCpuFallback = true;
          this.lastError = error instanceof Error ? error.message : String(error);
          return this.status();
        } finally {
          this.initializing = null;
        }
      })();

      return this.initializing;
    }

    async initializeDoomRenderer(canvas, width, height, paletteBytes) {
      await this.initialize();
      if (this.usingCpuFallback || !this.device || !canvas) {
        return false;
      }

      try {
        if (this.renderer?.canvas === canvas && this.renderer.width === width && this.renderer.height === height) {
          return true;
        }

        const context = canvas.getContext("webgpu");
        if (!context) {
          this.usingCpuFallback = true;
          this.lastError = "WebGPU canvas context is unavailable.";
          return false;
        }

        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
          device: this.device,
          format,
          alphaMode: "opaque"
        });

        const framePixels = width * height;
        const indexBuffer = this.device.createBuffer({
          label: "doom.frame.indices",
          size: framePixels * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const paletteBuffer = this.device.createBuffer({
          label: "doom.palette.rgba",
          size: 256 * 16,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const infoBuffer = this.device.createBuffer({
          label: "doom.frame.info",
          size: 16,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const hudInfoBuffer = this.device.createBuffer({
          label: "doom.hud.info",
          size: HUD_UNIFORM_FLOATS * 4,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const hudCellsBuffer = this.device.createBuffer({
          label: "doom.hud.cells9x9",
          size: HUD_CELL_COUNT * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const frameTexture = this.device.createTexture({
          label: "doom.frame.rgba8unorm",
          size: { width, height },
          format: "rgba8unorm",
          usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
        });
        const computePipeline = this.device.createComputePipeline({
          label: "doom.palette.compute",
          layout: "auto",
          compute: {
            module: this.device.createShaderModule({ code: PALETTE_COMPUTE_SHADER }),
            entryPoint: "main"
          }
        });
        const computeBindGroup = this.device.createBindGroup({
          label: "doom.palette.compute.bindings",
          layout: computePipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: indexBuffer } },
            { binding: 1, resource: { buffer: paletteBuffer } },
            { binding: 2, resource: frameTexture.createView() },
            { binding: 3, resource: { buffer: infoBuffer } }
          ]
        });
        const renderPipeline = this.device.createRenderPipeline({
          label: "doom.present.pipeline",
          layout: "auto",
          vertex: {
            module: this.device.createShaderModule({ code: PRESENT_SHADER }),
            entryPoint: "vertexMain"
          },
          fragment: {
            module: this.device.createShaderModule({ code: PRESENT_SHADER }),
            entryPoint: "fragmentMain",
            targets: [{ format }]
          },
          primitive: { topology: "triangle-list" }
        });
        const sampler = this.device.createSampler({
          label: "doom.present.nearest",
          magFilter: "nearest",
          minFilter: "nearest"
        });
        const renderBindGroup = this.device.createBindGroup({
          label: "doom.present.bindings",
          layout: renderPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: sampler },
            { binding: 1, resource: frameTexture.createView() },
            { binding: 2, resource: { buffer: hudInfoBuffer } },
            { binding: 3, resource: { buffer: hudCellsBuffer } }
          ]
        });
        const indexUpload = new Uint32Array(framePixels);
        const infoUpload = new Uint32Array([width, height, 0, 0]);
        const hudInfoUpload = new Float32Array(HUD_UNIFORM_FLOATS);
        const hudCellsUpload = new Float32Array(HUD_CELL_COUNT);

        this.renderer = {
          canvas,
          context,
          width,
          height,
          framePixels,
          indexBuffer,
          paletteBuffer,
          infoBuffer,
          hudInfoBuffer,
          hudCellsBuffer,
          frameTexture,
          computePipeline,
          computeBindGroup,
          renderPipeline,
          renderBindGroup,
          indexUpload,
          infoUpload,
          hudInfoUpload,
          hudCellsUpload,
          hudOverlayEnabled: this.hudOverlayEnabled,
          frame: 0
        };
        this.writeHudOverlayBuffers(this.renderer);
        this.updatePalette(paletteBytes);
        this.setDoomFrameTexture(frameTexture);
        return true;
      } catch (error) {
        this.renderer = null;
        this.usingCpuFallback = true;
        this.lastError = error instanceof Error ? error.message : String(error);
        this.setDoomFrameTexture(null);
        return false;
      }
    }

    updatePalette(paletteBytes) {
      if (!this.renderer || !this.device || !paletteBytes) {
        return;
      }

      const paletteFloats = new Float32Array(256 * 4);
      for (let index = 0; index < 256; index += 1) {
        const offset = index * 4;
        paletteFloats[offset] = (paletteBytes[offset] || 0) / 255;
        paletteFloats[offset + 1] = (paletteBytes[offset + 1] || 0) / 255;
        paletteFloats[offset + 2] = (paletteBytes[offset + 2] || 0) / 255;
        paletteFloats[offset + 3] = 1;
      }
      this.queue.writeBuffer(this.renderer.paletteBuffer, 0, paletteFloats);
    }

    setHudOverlayEnabled(enabled) {
      this.hudOverlayEnabled = Boolean(enabled);
      if (this.renderer) {
        this.renderer.hudOverlayEnabled = this.hudOverlayEnabled;
        this.writeHudOverlayBuffers(this.renderer);
      }
      return this.status();
    }

    setHudOverlayState(state) {
      if (!state || typeof state !== "object") {
        return false;
      }

      const next = Object.assign({}, this.hudOverlayState, state);
      if (Array.isArray(state.cells) || ArrayBuffer.isView(state.cells)) {
        next.cells = Array.from(state.cells).slice(0, HUD_CELL_COUNT);
      }
      this.hudOverlayState = next;
      if (this.renderer) {
        this.writeHudOverlayBuffers(this.renderer);
      }
      return true;
    }

    writeHudOverlayBuffers(renderer = this.renderer) {
      if (!renderer || !this.queue || !renderer.hudInfoBuffer || !renderer.hudCellsBuffer) {
        return;
      }

      const state = this.hudOverlayState || {};
      const now = (performance?.now?.() || Date.now()) / 1000;
      const enabled = Boolean(renderer.hudOverlayEnabled && state.enabled !== false && !this.usingCpuFallback);
      renderer.hudInfoUpload[0] = now;
      renderer.hudInfoUpload[1] = enabled ? 1 : 0;
      renderer.hudInfoUpload[2] = state.heatmapEnabled === false ? 0 : 1;
      renderer.hudInfoUpload[3] = clamp01(Number(state.kairos || 0));
      renderer.hudInfoUpload[4] = Math.max(-1, Math.min(1, Number(state.useProbeTurn || 0)));
      renderer.hudInfoUpload[5] = clamp01(Number(state.enemyConfidence || 0));
      renderer.hudInfoUpload[6] = Math.max(0, Math.min(1.5, Number(state.depthEstimate ?? 1)));
      renderer.hudInfoUpload[7] = 0;

      renderer.hudCellsUpload.fill(0);
      const cells = state.cells || [];
      const count = Math.min(HUD_CELL_COUNT, cells.length || 0);
      for (let index = 0; index < count; index += 1) {
        const raw = Number(cells[index] || 0);
        renderer.hudCellsUpload[index] = clamp01(raw > 1 ? raw / 255 : raw);
      }

      this.queue.writeBuffer(renderer.hudInfoBuffer, 0, renderer.hudInfoUpload);
      this.queue.writeBuffer(renderer.hudCellsBuffer, 0, renderer.hudCellsUpload);
    }

    renderPalettedFrame(indices) {
      if (!this.renderer || this.usingCpuFallback || !indices) {
        return false;
      }

      const renderer = this.renderer;
      const count = Math.min(renderer.framePixels, indices.length);
      for (let index = 0; index < count; index += 1) {
        renderer.indexUpload[index] = indices[index] || 0;
      }

      renderer.frame += 1;
      renderer.infoUpload[2] = renderer.frame;
      this.queue.writeBuffer(renderer.indexBuffer, 0, renderer.indexUpload);
      this.queue.writeBuffer(renderer.infoBuffer, 0, renderer.infoUpload);
      this.writeHudOverlayBuffers(renderer);

      const encoder = this.device.createCommandEncoder({ label: "doom.frame.encoder" });
      const computePass = encoder.beginComputePass({ label: "doom.palette.compute.pass" });
      computePass.setPipeline(renderer.computePipeline);
      computePass.setBindGroup(0, renderer.computeBindGroup);
      computePass.dispatchWorkgroups(
        Math.ceil(renderer.width / WORKGROUP_SIZE),
        Math.ceil(renderer.height / WORKGROUP_SIZE)
      );
      computePass.end();

      const colorAttachment = renderer.context.getCurrentTexture().createView();
      const renderPass = encoder.beginRenderPass({
        label: "doom.present.pass",
        colorAttachments: [{
          view: colorAttachment,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store"
        }]
      });
      renderPass.setPipeline(renderer.renderPipeline);
      renderPass.setBindGroup(0, renderer.renderBindGroup);
      renderPass.draw(3);
      renderPass.end();

      this.queue.submit([encoder.finish()]);
      this.setFrameState(FRAME_TARGET, {
        width: renderer.width,
        height: renderer.height,
        format: "rgba8unorm-gpu-texture",
        frame: renderer.frame,
        zeroCopy: true
      });
      this.setDoomFrameTexture(renderer.frameTexture);
      return true;
    }

    setFrameState(target, state) {
      this.frameStates.set(target || FRAME_TARGET, Object.assign({
        providerId: this.providerId,
        backend: this.usingCpuFallback ? "cpu-fallback" : this.backendName,
        zeroCopy: Boolean(this.frameTextures.get(target || FRAME_TARGET)),
        updatedAt: performance.now()
      }, state || {}));
    }

    setDoomFrameTexture(texture) {
      if (texture) {
        this.frameTextures.set(FRAME_TARGET, texture);
      } else {
        this.frameTextures.delete(FRAME_TARGET);
      }
    }

    createBonsaiVisionBinding(target) {
      const name = target || FRAME_TARGET;
      const texture = this.frameTextures.get(name);
      if (texture && !this.usingCpuFallback) {
        return {
          providerId: this.providerId,
          backend: this.backendName,
          kind: "webgpu-texture-binding",
          zeroCopy: true,
          texture,
          textureFormat: "rgba8unorm",
          width: this.renderer?.width || 0,
          height: this.renderer?.height || 0
        };
      }

      return {
        providerId: this.providerId,
        backend: this.usingCpuFallback ? "cpu-fallback" : this.backendName,
        kind: "webgpu-state-buffer",
        zeroCopy: false,
        state: this.frameStates.get(name) || null
      };
    }

    getDoomFrameTexture() {
      return this.frameTextures.get(FRAME_TARGET) || null;
    }

    getFramebufferTexture(target) {
      return this.frameTextures.get(target || FRAME_TARGET) || null;
    }

    getFrameStateBuffer(target) {
      return this.frameStates.get(target || FRAME_TARGET) || null;
    }

    status() {
      return {
        providerId: this.providerId,
        name: this.name,
        backend: this.usingCpuFallback ? "cpu-fallback" : this.backendName,
        supported: this.supported,
        initialized: this.initialized,
        rendererInitialized: Boolean(this.renderer),
        zeroCopy: Boolean(this.frameTextures.get(FRAME_TARGET)) && !this.usingCpuFallback,
        hudOverlayReady: Boolean(this.renderer?.hudInfoBuffer) && !this.usingCpuFallback,
        hudOverlayEnabled: this.hudOverlayEnabled,
        hudOverlayActive: Boolean(this.renderer?.hudInfoBuffer && this.hudOverlayEnabled && this.hudOverlayState?.enabled !== false && !this.usingCpuFallback),
        usingCpuFallback: this.usingCpuFallback,
        lastError: this.lastError
      };
    }
  }

  function clamp01(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, Math.min(1, value));
  }

  const existingProvider = window.WebGpuComputeProvider;
  if (!existingProvider || typeof existingProvider.initializeDoomRenderer !== "function") {
    window.WebGpuComputeProvider = new BrowserWebGpuComputeProvider();
  }

  window.webGpuComputeProvider = window.WebGpuComputeProvider;
  window.aikernelWebGpuComputeProvider = window.WebGpuComputeProvider;
})();
