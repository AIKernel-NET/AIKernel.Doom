(function () {
  "use strict";

  const FRAME_TARGET = "doom";
  const WORKGROUP_SIZE = 8;

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
@group(0) @binding(0) var frameSampler: sampler;
@group(0) @binding(1) var frameTexture: texture_2d<f32>;

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

@fragment
fn fragmentMain(input: VertexOut) -> @location(0) vec4<f32> {
  return textureSample(frameTexture, frameSampler, input.uv);
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
            { binding: 1, resource: frameTexture.createView() }
          ]
        });
        const indexUpload = new Uint32Array(framePixels);
        const infoUpload = new Uint32Array([width, height, 0, 0]);

        this.renderer = {
          canvas,
          context,
          width,
          height,
          framePixels,
          indexBuffer,
          paletteBuffer,
          infoBuffer,
          frameTexture,
          computePipeline,
          computeBindGroup,
          renderPipeline,
          renderBindGroup,
          indexUpload,
          infoUpload,
          frame: 0
        };
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
        usingCpuFallback: this.usingCpuFallback,
        lastError: this.lastError
      };
    }
  }

  const existingProvider = window.WebGpuComputeProvider;
  if (!existingProvider || typeof existingProvider.initializeDoomRenderer !== "function") {
    window.WebGpuComputeProvider = new BrowserWebGpuComputeProvider();
  }

  window.webGpuComputeProvider = window.WebGpuComputeProvider;
  window.aikernelWebGpuComputeProvider = window.WebGpuComputeProvider;
})();
