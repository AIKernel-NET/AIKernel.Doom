(function () {
  "use strict";

  const GPU_CONTRACTS = requireGpuContracts();
  const FRAME_TARGET = GPU_CONTRACTS.rawFramebufferTarget;
  const RAW_FRAMEBUFFER_WIRE_NAME = GPU_CONTRACTS.rawFramebufferWireName;
  const WORKGROUP_SIZE = 8;
  const HUD_GRID_SIZE = GPU_CONTRACTS.hudGridSize;
  const HUD_CELL_COUNT = GPU_CONTRACTS.hudCellCount;
  const HUD_UNIFORM_FLOATS = GPU_CONTRACTS.hudUniformFloatCount;
  const HUD_PANEL_VALUE_COUNT = GPU_CONTRACTS.hudPanelValueCount;
  const HUD_RECT_COUNT = GPU_CONTRACTS.hudRectCount;
  const HUD_LABEL_COUNT = GPU_CONTRACTS.hudLabelCount;
  const HUD_RECT_STRIDE = GPU_CONTRACTS.hudRectStride;
  const HUD_RECT_FLOATS = GPU_CONTRACTS.hudRectFloatCount;
  const HUD_PANEL_RECTS = GPU_CONTRACTS.hudPanelRects || fallbackHudPanelRects();
  const HUD_PANEL_BORDER_PIXELS = Number(GPU_CONTRACTS.hudPanelBorderPixels || 1);
  const GPU_AISTHESIS_INFO_FLOATS = GPU_CONTRACTS.aisthesisInfoFloatCount;
  const GPU_AISTHESIS_MATRIX_FLOATS = GPU_CONTRACTS.aisthesisMatrixFloatCount;
  const GPU_AISTHESIS_FEATURE_FLOATS = GPU_CONTRACTS.aisthesisFeatureFloatCount;
  const GPU_SPATIAL_INFO_FLOATS = GPU_CONTRACTS.spatialInfoFloatCount;
  const GPU_SPATIAL_OUTPUT_FLOATS = GPU_CONTRACTS.spatialOutputFloatCount;
  const GPU_SPATIAL_OUTPUT_FIELDS = GPU_CONTRACTS.spatialOutputFields;
  const HUD_RECT_FIELDS = GPU_CONTRACTS.hudRectFields;
  const HUD_PANEL_FIELDS = GPU_CONTRACTS.hudPanelFields;
  const HUD_PANEL_LAYOUT_NAME = GPU_CONTRACTS.hudPanelLayoutName;
  const GPU_STATE_VECTOR_FIELDS = GPU_CONTRACTS.stateVectorFields;
  const GPU_STATE_VECTOR_LAYOUT_NAME = GPU_CONTRACTS.stateVectorLayoutName;
  const GPU_STATE_VECTOR_FLOATS = GPU_CONTRACTS.stateVectorFloatCount;
  const GPU_SPATIAL_OUTPUT_LAYOUT_NAME = GPU_CONTRACTS.spatialOutputLayoutName;
  const HUD_COMPOSITE_TARGET = GPU_CONTRACTS.hudCompositeTarget;
  const HUD_COMPOSITE_WIRE_NAME = GPU_CONTRACTS.hudCompositeWireName;
  const HUD_CELLS_TARGET = GPU_CONTRACTS.hudCellsTarget;
  const HUD_PANEL_VALUES_TARGET = GPU_CONTRACTS.hudPanelValuesTarget;
  const HUD_PRIORITY_RECTS_TARGET = GPU_CONTRACTS.hudPriorityRectsTarget;
  const GPU_AISTHESIS_INFO_TARGET = GPU_CONTRACTS.aisthesisInfoTarget;
  const GPU_AISTHESIS_MATRIX_TARGET = GPU_CONTRACTS.aisthesisMatrixTarget;
  const GPU_AISTHESIS_FEATURE_TARGET = GPU_CONTRACTS.aisthesisFeatureTarget;
  const GPU_AISTHESIS_MASK_TARGET = GPU_CONTRACTS.aisthesisMaskTarget;
  const GPU_AISTHESIS_MASK_WIRE_NAME = GPU_CONTRACTS.aisthesisMaskWireName;
  const GPU_AISTHESIS_MASK_LAYOUT = GPU_CONTRACTS.aisthesisMaskLayout;
  const GPU_SPATIAL_INFO_TARGET = GPU_CONTRACTS.spatialInfoTarget;
  const GPU_SPATIAL_OUTPUT_TARGET = GPU_CONTRACTS.spatialOutputTarget;
  const HUD_COMPOSITE_MAX_FPS = 30;
  const HUD_COMPOSITE_MIN_INTERVAL_MS = 1000 / HUD_COMPOSITE_MAX_FPS;
  const WEBGPU_ADAPTER_POWER_PREFERENCE = "high-performance";
  const WEBGPU_ADAPTER_REQUEST_OPTIONS = Object.freeze({
    powerPreference: WEBGPU_ADAPTER_POWER_PREFERENCE,
    forceFallbackAdapter: false
  });

  function fallbackHudPanelRects() {
    return {
      title: { left: 0.020, top: 0.662, right: 0.985, bottom: 0.692 },
      cards: {
        aisthesis: { left: 0.020, top: 0.700, right: 0.255, bottom: 0.970 },
        noesis: { left: 0.270, top: 0.700, right: 0.500, bottom: 0.830 },
        krisis: { left: 0.515, top: 0.700, right: 0.745, bottom: 0.830 },
        kinesis: { left: 0.760, top: 0.700, right: 0.985, bottom: 0.830 },
        route: { left: 0.270, top: 0.845, right: 0.500, bottom: 0.970 },
        combat: { left: 0.515, top: 0.845, right: 0.745, bottom: 0.970 },
        zoe: { left: 0.760, top: 0.845, right: 0.985, bottom: 0.970 }
      }
    };
  }

  function wgslFloat(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(4) : "0.0000";
  }

  function wgslPanelMin(key) {
    const rect = HUD_PANEL_RECTS.cards?.[key] || fallbackHudPanelRects().cards[key];
    return `vec2<f32>(${wgslFloat(rect.left)}, ${wgslFloat(rect.top)})`;
  }

  function wgslPanelMax(key) {
    const rect = HUD_PANEL_RECTS.cards?.[key] || fallbackHudPanelRects().cards[key];
    return `vec2<f32>(${wgslFloat(rect.right)}, ${wgslFloat(rect.bottom)})`;
  }

  function requireGpuContracts() {
    const contracts = self.AIKernelDoomGpuContracts;
    if (!contracts || typeof contracts.aisthesisMaskTextureTarget !== "function") {
      throw new Error("AIKernelDoomGpuContracts is not available.");
    }

    return contracts;
  }

  function cloneWebGpuAdapterRequestOptions() {
    return {
      powerPreference: WEBGPU_ADAPTER_REQUEST_OPTIONS.powerPreference,
      forceFallbackAdapter: WEBGPU_ADAPTER_REQUEST_OPTIONS.forceFallbackAdapter
    };
  }

  async function requestPreferredWebGpuAdapter(gpu) {
    const preferredOptions = cloneWebGpuAdapterRequestOptions();
    try {
      const adapter = await gpu.requestAdapter(preferredOptions);
      if (adapter) {
        return {
          adapter,
          options: preferredOptions,
          fallbackUsed: false,
          requestError: ""
        };
      }
    } catch (error) {
      const fallbackAdapter = await gpu.requestAdapter();
      return {
        adapter: fallbackAdapter,
        options: preferredOptions,
        fallbackUsed: Boolean(fallbackAdapter),
        requestError: error instanceof Error ? error.message : String(error)
      };
    }

    const fallbackAdapter = await gpu.requestAdapter();
    return {
      adapter: fallbackAdapter,
      options: preferredOptions,
      fallbackUsed: Boolean(fallbackAdapter),
      requestError: fallbackAdapter ? "high-performance adapter unavailable; default adapter used" : "WebGPU adapter unavailable"
    };
  }

  async function resolveWebGpuAdapterInfo(adapter) {
    if (!adapter) {
      return null;
    }

    try {
      const info = typeof adapter.requestAdapterInfo === "function"
        ? await adapter.requestAdapterInfo()
        : adapter.info;
      if (!info) {
        return null;
      }

      return {
        vendor: String(info.vendor || ""),
        architecture: String(info.architecture || ""),
        device: String(info.device || ""),
        description: String(info.description || ""),
        subgroupMinSize: Number(info.subgroupMinSize || 0),
        subgroupMaxSize: Number(info.subgroupMaxSize || 0)
      };
    } catch {
      return null;
    }
  }

  function summarizeWebGpuAdapterInfo(info) {
    if (!info || typeof info !== "object") {
      return "unknown";
    }

    const parts = [
      info.description,
      info.device,
      info.vendor,
      info.architecture
    ]
      .map(value => String(value || "").trim())
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" / ") : "unknown";
  }

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

  const GPU_AISTHESIS_COMPUTE_SHADER = `
struct FrameInfo {
  width: u32,
  height: u32,
  frame: u32,
  _pad: u32,
};

struct GpuAisthesisInfo {
  enabled: f32,
  zeroCopyReady: f32,
  storageTextureReady: f32,
  matrixCount: f32,
  matrixFloatCount: f32,
  visionHeatmap: f32,
  edgeDetect: f32,
  cornerDetect: f32,
  redPanelDetect: f32,
  enemyDirection: f32,
  projectileFlow: f32,
  outputCode: f32,
  featureCount: f32,
  maskTexture: f32,
  _pad1: f32,
  _pad2: f32,
};

@group(0) @binding(0) var<uniform> ai: GpuAisthesisInfo;
@group(0) @binding(1) var<storage, read> matrices: array<f32>;
@group(0) @binding(2) var<storage, read_write> features: array<f32>;
@group(0) @binding(3) var inputFrame: texture_2d<f32>;
@group(0) @binding(4) var<uniform> info: FrameInfo;
@group(0) @binding(5) var<storage, read_write> gpuHeatCells: array<f32>;
@group(0) @binding(6) var outputMask: texture_storage_2d<rgba8unorm, write>;

var<workgroup> lumaCells: array<f32, ${HUD_CELL_COUNT}>;
var<workgroup> redCells: array<f32, ${HUD_CELL_COUNT}>;
var<workgroup> edgeCells: array<f32, ${HUD_CELL_COUNT}>;
var<workgroup> cornerCells: array<f32, ${HUD_CELL_COUNT}>;
var<workgroup> redXCells: array<f32, ${HUD_CELL_COUNT}>;
var<workgroup> redYCells: array<f32, ${HUD_CELL_COUNT}>;

fn luma(color: vec4<f32>) -> f32 {
  return dot(color.rgb, vec3<f32>(0.299, 0.587, 0.114));
}

fn redScore(color: vec4<f32>) -> f32 {
  return clamp(color.r - max(color.g, color.b) * 0.84, 0.0, 1.0);
}

fn samplePoint(axis: u32, extent: u32) -> u32 {
  return min(extent - 1u, ((axis * 2u + 1u) * extent) / ${HUD_GRID_SIZE * 2}u);
}

fn previousCoord(axis: u32) -> u32 {
  if (axis == 0u) {
    return 0u;
  }

  return axis - 1u;
}

@compute @workgroup_size(${HUD_GRID_SIZE}, ${HUD_GRID_SIZE}, 1)
fn main(@builtin(local_invocation_id) localId: vec3<u32>) {
  let cellIndex = localId.y * ${HUD_GRID_SIZE}u + localId.x;

  if (cellIndex == 0u) {
    for (var clearIndex = 0u; clearIndex < ${GPU_AISTHESIS_FEATURE_FLOATS}u; clearIndex = clearIndex + 1u) {
      features[clearIndex] = 0.0;
    }

    features[0] = ai.enabled;
    features[6] = ai.matrixCount;
    features[7] = ai.matrixFloatCount;
    features[8] = ai.outputCode;
    features[9] = f32(info.frame);
    features[12] = matrices[0];
    features[13] = ai.visionHeatmap;
    features[14] = ai.edgeDetect;
    features[15] = ai.redPanelDetect;
    features[18] = ai.enemyDirection;
    features[19] = ai.projectileFlow;
  }

  workgroupBarrier();

  if (info.width == 0u || info.height == 0u || ai.enabled < 0.5 || ai.zeroCopyReady < 0.5) {
    return;
  }

  let x = samplePoint(localId.x, info.width);
  let y = samplePoint(localId.y, info.height);
  let color = textureLoad(inputFrame, vec2<i32>(i32(x), i32(y)), 0);
  let centerLuma = luma(color);
  let left = textureLoad(inputFrame, vec2<i32>(i32(previousCoord(x)), i32(y)), 0);
  let right = textureLoad(inputFrame, vec2<i32>(i32(min(info.width - 1u, x + 1u)), i32(y)), 0);
  let up = textureLoad(inputFrame, vec2<i32>(i32(x), i32(previousCoord(y))), 0);
  let down = textureLoad(inputFrame, vec2<i32>(i32(x), i32(min(info.height - 1u, y + 1u))), 0);
  let dx = abs(luma(left) - luma(right));
  let dy = abs(luma(up) - luma(down));
  let edge = dx + dy;
  let corner = dx * dy;
  let red = redScore(color);
  let normalizedX = (f32(localId.x) - ${Math.floor((HUD_GRID_SIZE - 1) / 2)}.0) / ${Math.max(1, Math.floor((HUD_GRID_SIZE - 1) / 2))}.0;
  let normalizedY = (f32(localId.y) - ${Math.floor((HUD_GRID_SIZE - 1) / 2)}.0) / ${Math.max(1, Math.floor((HUD_GRID_SIZE - 1) / 2))}.0;

  lumaCells[cellIndex] = centerLuma;
  redCells[cellIndex] = red;
  edgeCells[cellIndex] = edge;
  cornerCells[cellIndex] = corner;
  redXCells[cellIndex] = red * normalizedX;
  redYCells[cellIndex] = red * normalizedY;

  let heatValue = max(red, max(edge * 0.34, corner * 1.25));
  if (ai.visionHeatmap > 0.5) {
    gpuHeatCells[cellIndex] = clamp(heatValue, 0.0, 1.0);
  }
  if (ai.maskTexture > 0.5) {
    textureStore(
      outputMask,
      vec2<i32>(i32(localId.x), i32(localId.y)),
      vec4<f32>(
        clamp(heatValue, 0.0, 1.0),
        clamp(red, 0.0, 1.0),
        clamp(edge, 0.0, 1.0),
        clamp(corner * 4.0, 0.0, 1.0)));
  }

  workgroupBarrier();

  if (cellIndex != 0u) {
    return;
  }

  var lumaSum = 0.0;
  var redMax = 0.0;
  var edgeSum = 0.0;
  var redMass = 0.0;
  var redX = 0.0;
  var redY = 0.0;
  var cornerMax = 0.0;
  var cornerSum = 0.0;

  for (var index = 0u; index < ${HUD_CELL_COUNT}u; index = index + 1u) {
    lumaSum = lumaSum + lumaCells[index];
    edgeSum = edgeSum + edgeCells[index];
    redMax = max(redMax, redCells[index]);
    redMass = redMass + redCells[index];
    redX = redX + redXCells[index];
    redY = redY + redYCells[index];
    cornerMax = max(cornerMax, cornerCells[index]);
    cornerSum = cornerSum + cornerCells[index];
  }

  let sampleCount = f32(${HUD_CELL_COUNT}u);
  features[1] = clamp(lumaSum / sampleCount, 0.0, 1.0);
  features[2] = clamp(redMax, 0.0, 1.0);
  features[3] = clamp(edgeSum / sampleCount, 0.0, 1.0);
  features[4] = clamp(redMass / sampleCount, 0.0, 1.0);
  if (redMass > 0.0001) {
    features[10] = clamp(redX / redMass, -1.0, 1.0);
    features[11] = clamp(redY / redMass, -1.0, 1.0);
  }
  features[16] = clamp(cornerMax, 0.0, 1.0);
  features[17] = clamp(cornerSum / sampleCount, 0.0, 1.0);
}
`;

  const GPU_SPATIAL_REASONING_SHADER = `
struct GpuSpatialInfo {
  enabled: f32,
  matrixCount: f32,
  matrixFloatCount: f32,
  featureCount: f32,
  routeReasoning: f32,
  threatReasoning: f32,
  zoeReasoning: f32,
  ctgReasoning: f32,
  outputCode: f32,
  maskTexture: f32,
  _pad1: f32,
  _pad2: f32,
  _pad3: f32,
  _pad4: f32,
  _pad5: f32,
  _pad6: f32,
};

@group(0) @binding(0) var<uniform> spatial: GpuSpatialInfo;
@group(0) @binding(1) var<storage, read> features: array<f32>;
@group(0) @binding(2) var<storage, read> matrices: array<f32>;
@group(0) @binding(3) var<storage, read_write> output: array<f32>;
@group(0) @binding(4) var maskTexture: texture_2d<f32>;

fn matrixMax(kindWanted: f32) -> f32 {
  var offset = 0u;
  var result = 0.0;
  loop {
    if (offset + 4u > ${GPU_AISTHESIS_MATRIX_FLOATS}u) {
      break;
    }

    let matrixKind = matrices[offset];
    let valueCount = u32(max(matrices[offset + 3u], 0.0));
    if (valueCount == 0u) {
      break;
    }

    if (abs(matrixKind - kindWanted) < 0.25) {
      var index = 0u;
      loop {
        if (index >= valueCount || offset + 4u + index >= ${GPU_AISTHESIS_MATRIX_FLOATS}u) {
          break;
        }

        result = max(result, matrices[offset + 4u + index]);
        index = index + 1u;
      }
    }

    offset = offset + 4u + valueCount;
  }

  return clamp(result, 0.0, 1.0);
}

fn maskMax() -> vec4<f32> {
  if (spatial.maskTexture < 0.5) {
    return vec4<f32>(0.0);
  }

  var result = vec4<f32>(0.0);
  for (var row = 0u; row < ${HUD_GRID_SIZE}u; row = row + 1u) {
    for (var column = 0u; column < ${HUD_GRID_SIZE}u; column = column + 1u) {
      let color = textureLoad(maskTexture, vec2<i32>(i32(column), i32(row)), 0);
      result = max(result, color);
    }
  }

  return clamp(result, vec4<f32>(0.0), vec4<f32>(1.0));
}

@compute @workgroup_size(1, 1, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x != 0u) {
    return;
  }

  for (var clearIndex = 0u; clearIndex < ${GPU_SPATIAL_OUTPUT_FLOATS}u; clearIndex = clearIndex + 1u) {
    output[clearIndex] = 0.0;
  }

  if (spatial.enabled < 0.5 || features[0] < 0.5) {
    return;
  }

  let topos = matrixMax(1.0);
  let routeCost = matrixMax(2.0);
  let threat = max(matrixMax(3.0), max(features[18], features[19]) * 0.5);
  let zoe = matrixMax(4.0);
  let ctg = matrixMax(5.0);
  let redPanel = max(features[2], features[4]);
  let edge = features[3];
  let mask = maskMax();
  let maskHeat = mask.r;
  let maskRed = mask.g;
  let maskEdge = mask.b;
  let maskCorner = mask.a;

  output[0] = 1.0;
  output[1] = clamp(max(topos, max(max(redPanel, maskRed) * 0.72, max(edge, maskEdge) * 0.45)), 0.0, 1.0);
  output[2] = routeCost;
  output[3] = clamp(max(threat, max(maskHeat * 0.20, maskCorner * 0.16)), 0.0, 1.0);
  output[4] = zoe;
  output[5] = ctg;
  output[6] = clamp(features[10], -1.0, 1.0);
  output[7] = features[9];
  output[8] = spatial.matrixCount;
  output[9] = spatial.matrixFloatCount;
  output[10] = features[1];
  output[11] = max(features[2], maskRed);
  output[12] = max(features[3], maskEdge);
  output[13] = max(features[16], maskCorner);
  output[14] = features[17];
  output[15] = spatial.outputCode;
  output[20] = maskHeat;
  output[21] = maskRed;
  output[22] = maskEdge;
  output[23] = maskCorner;
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
  rectCount: f32,
  compassHeading: f32,
  compassUsable: f32,
  compassYaw: f32,
  compassConfidence: f32,
  enemyCircleActive: f32,
  enemyCircleX: f32,
  enemyCircleY: f32,
  enemyCircleRadius: f32,
  enemyCircleVisual: f32,
  enemyCircleAudio: f32,
  _enemyPad0: f32,
  _enemyPad1: f32,
};

@group(0) @binding(0) var frameSampler: sampler;
@group(0) @binding(1) var frameTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> hud: HudInfo;
@group(0) @binding(3) var<storage, read> hudCells: array<f32>;
@group(0) @binding(4) var panelOverlay: texture_2d<f32>;

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
    let cellX = min(u32(floor(gridUv.x * ${HUD_GRID_SIZE}.0)), ${HUD_GRID_SIZE - 1}u);
    let cellY = min(u32(floor(gridUv.y * ${HUD_GRID_SIZE}.0)), ${HUD_GRID_SIZE - 1}u);
    let cell = cellY * ${HUD_GRID_SIZE}u + cellX;
    let value = clamp(hudCells[cell], 0.0, 1.0);
    let local = fract(gridUv * vec2<f32>(${HUD_GRID_SIZE}.0, ${HUD_GRID_SIZE}.0));
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

  let enemy = clamp(hud.enemyConfidence * hud.enemyCircleActive, 0.0, 1.0);
  if (enemy > 0.01) {
    let enemyCenter = vec2<f32>(clamp(hud.enemyCircleX, 0.0, 1.0), clamp(hud.enemyCircleY, 0.0, 1.0));
    let enemyRadius = clamp(hud.enemyCircleRadius, 0.030, 0.160);
    let enemyDelta = (uv - enemyCenter) * vec2<f32>(1.12, 1.0);
    let ring = 1.0 - smoothstep(0.0, 0.014, abs(length(enemyDelta) - enemyRadius));
    let audioOnly = step(0.5, hud.enemyCircleAudio) * (1.0 - step(0.5, hud.enemyCircleVisual));
    let ringColor = mix(vec3<f32>(1.0, 0.18, 0.08), vec3<f32>(1.0, 0.62, 0.12), audioOnly);
    color = alphaComposite(color, vec4<f32>(ringColor, ring * enemy * 0.58));
  }

  let nearWall = clamp(1.05 - hud.depthEstimate, 0.0, 1.0);
  let footGlow = smoothstep(0.66, 0.98, uv.y) * nearWall * 0.16;
  color = alphaComposite(color, vec4<f32>(1.0, 0.42, 0.08, footGlow));
  return alphaComposite(color, textureSample(panelOverlay, frameSampler, uv));
}
`;

  const BLIT_SHADER = `
@group(0) @binding(0) var frameSampler: sampler;
@group(0) @binding(1) var displayTexture: texture_2d<f32>;

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
  return textureSample(displayTexture, frameSampler, input.uv);
}
`;

  const HUD_PANEL_SHADER = `
struct FrameInfo {
  width: u32,
  height: u32,
  frame: u32,
  _pad: u32,
};

struct HudInfo {
  timeSeconds: f32,
  enabled: f32,
  heatmapEnabled: f32,
  kairos: f32,
  useProbeTurn: f32,
  enemyConfidence: f32,
  depthEstimate: f32,
  rectCount: f32,
  compassHeading: f32,
  compassUsable: f32,
  compassYaw: f32,
  compassConfidence: f32,
  enemyCircleActive: f32,
  enemyCircleX: f32,
  enemyCircleY: f32,
  enemyCircleRadius: f32,
  enemyCircleVisual: f32,
  enemyCircleAudio: f32,
  _enemyPad0: f32,
  _enemyPad1: f32,
};

@group(0) @binding(0) var<uniform> hud: HudInfo;
@group(0) @binding(1) var<storage, read> panel: array<f32>;
@group(0) @binding(2) var outputPanel: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(3) var<uniform> info: FrameInfo;
@group(0) @binding(4) var<storage, read> rects: array<f32>;

fn rectMask(uv: vec2<f32>, minCorner: vec2<f32>, maxCorner: vec2<f32>) -> f32 {
  let insideX = step(minCorner.x, uv.x) * step(uv.x, maxCorner.x);
  let insideY = step(minCorner.y, uv.y) * step(uv.y, maxCorner.y);
  return insideX * insideY;
}

fn pixelSize(width: f32) -> vec2<f32> {
  return vec2<f32>(
    width / max(1.0, f32(info.width)),
    width / max(1.0, f32(info.height))
  );
}

fn borderMask(uv: vec2<f32>, minCorner: vec2<f32>, maxCorner: vec2<f32>, width: f32) -> f32 {
  let outer = rectMask(uv, minCorner, maxCorner);
  let pixelWidth = pixelSize(width);
  let inner = rectMask(uv, minCorner + pixelWidth, maxCorner - pixelWidth);
  return max(0.0, outer - inner);
}

fn hudBorderWidth() -> f32 {
  return ${wgslFloat(HUD_PANEL_BORDER_PIXELS)};
}

fn alphaComposite(base: vec4<f32>, overlay: vec4<f32>) -> vec4<f32> {
  let alpha = clamp(overlay.a, 0.0, 1.0);
  return vec4<f32>(base.rgb * (1.0 - alpha) + overlay.rgb * alpha, base.a + alpha * (1.0 - base.a));
}

fn layerColor(layer: u32, value: f32) -> vec3<f32> {
  let v = clamp(value, 0.0, 1.0);
  if (layer == 0u) {
    return vec3<f32>(0.18, 0.70, 1.0) * (0.48 + v * 0.52);
  }
  if (layer == 1u) {
    return vec3<f32>(0.30, 1.0, 0.68) * (0.42 + v * 0.58);
  }
  if (layer == 2u) {
    return vec3<f32>(1.0, 0.84, 0.24) * (0.38 + v * 0.62);
  }
  return vec3<f32>(1.0, 0.36, 0.24) * (0.42 + v * 0.58);
}

fn addLayerCard(color: vec4<f32>, uv: vec2<f32>, layer: u32, value: f32, minCorner: vec2<f32>, maxCorner: vec2<f32>) -> vec4<f32> {
  let fill = rectMask(uv, minCorner, maxCorner);
  let border = borderMask(uv, minCorner, maxCorner, hudBorderWidth());
  let barWidth = mix(minCorner.x + 0.018, maxCorner.x - 0.018, clamp(value, 0.0, 1.0));
  let bar = rectMask(uv, vec2<f32>(minCorner.x + 0.018, maxCorner.y - 0.026), vec2<f32>(barWidth, maxCorner.y - 0.014));
  let base = vec4<f32>(0.010, 0.014, 0.018, fill * 0.36);
  let edge = vec4<f32>(layerColor(layer, value), border * (0.26 + value * 0.28));
  let meter = vec4<f32>(layerColor(layer, value), bar * (0.28 + value * 0.30));
  return alphaComposite(alphaComposite(alphaComposite(color, base), edge), meter);
}

fn addDiagnosticRect(color: vec4<f32>, uv: vec2<f32>, index: u32) -> vec4<f32> {
  let base = index * 8u;
  let minCorner = vec2<f32>(clamp(rects[base + 0u], 0.0, 1.0), clamp(rects[base + 1u], 0.0, 1.0));
  let maxCorner = vec2<f32>(clamp(rects[base + 2u], 0.0, 1.0), clamp(rects[base + 3u], 0.0, 1.0));
  if (maxCorner.x <= minCorner.x || maxCorner.y <= minCorner.y) {
    return color;
  }

  let rectColor = vec3<f32>(
    clamp(rects[base + 4u], 0.0, 1.0),
    clamp(rects[base + 5u], 0.0, 1.0),
    clamp(rects[base + 6u], 0.0, 1.0)
  );
  let alpha = clamp(rects[base + 7u], 0.0, 1.0);
  let fill = rectMask(uv, minCorner, maxCorner);
  let border = borderMask(uv, minCorner, maxCorner, hudBorderWidth());
  let borderSize = pixelSize(hudBorderWidth());
  let innerGlow = rectMask(
    uv,
    minCorner + borderSize,
    maxCorner - borderSize
  );
  let filled = alphaComposite(color, vec4<f32>(rectColor, fill * alpha * 0.055));
  let edged = alphaComposite(filled, vec4<f32>(rectColor, border * alpha * 0.92));
  return alphaComposite(edged, vec4<f32>(rectColor, innerGlow * alpha * 0.020));
}

fn segmentMask(point: vec2<f32>, start: vec2<f32>, finish: vec2<f32>, width: f32) -> f32 {
  let pa = point - start;
  let ba = finish - start;
  let h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.00001), 0.0, 1.0);
  let dist = length(pa - ba * h);
  return 1.0 - smoothstep(width, width * 1.8, dist);
}

fn compassMask(uv: vec2<f32>, center: vec2<f32>, radius: f32, aspect: f32) -> f32 {
  let delta = vec2<f32>((uv.x - center.x) * aspect, uv.y - center.y);
  return 1.0 - smoothstep(0.0035, 0.0075, abs(length(delta) - radius));
}

fn compassNeedle(color: vec4<f32>, uv: vec2<f32>, center: vec2<f32>, degrees: f32, aspect: f32, lengthScale: f32, needleColor: vec3<f32>, alpha: f32) -> vec4<f32> {
  let angle = degrees * 0.01745329252;
  let direction = vec2<f32>(sin(angle) / aspect, -cos(angle));
  let finish = center + direction * lengthScale;
  let start = center - direction * 0.010;
  let mask = segmentMask(uv, start, finish, 0.0030);
  return alphaComposite(color, vec4<f32>(needleColor, mask * alpha));
}

fn addCompassHud(color: vec4<f32>, uv: vec2<f32>) -> vec4<f32> {
  let center = vec2<f32>(0.912, 0.118);
  let aspect = f32(info.width) / max(1.0, f32(info.height));
  let ring = compassMask(uv, center, 0.058, aspect);
  let usable = clamp(hud.compassUsable, 0.0, 1.0);
  let confidence = clamp(hud.compassConfidence, 0.0, 1.0);
  let scanHeading = hud.timeSeconds * 104.0;
  let heading = mix(scanHeading, hud.compassHeading, usable);
  let ringColor = mix(vec3<f32>(1.0, 0.75, 0.18), vec3<f32>(0.26, 0.88, 1.0), usable);
  var next = alphaComposite(color, vec4<f32>(0.004, 0.012, 0.018, ring * 0.16));
  next = alphaComposite(next, vec4<f32>(ringColor, ring * (0.24 + confidence * 0.28)));

  let northMask = segmentMask(uv, center + vec2<f32>(0.0, -0.058), center + vec2<f32>(0.0, -0.044), 0.0020);
  next = alphaComposite(next, vec4<f32>(0.95, 0.97, 0.82, northMask * 0.60));
  next = compassNeedle(next, uv, center, heading, aspect, 0.047, ringColor, 0.58 + confidence * 0.34);
  next = compassNeedle(next, uv, center, hud.compassYaw, aspect, 0.036, vec3<f32>(1.0, 0.88, 0.30), 0.54);

  let centerDelta = vec2<f32>((uv.x - center.x) * aspect, uv.y - center.y);
  let centerDot = 1.0 - smoothstep(0.000, 0.007, length(centerDelta));
  return alphaComposite(next, vec4<f32>(1.0, 0.96, 0.66, centerDot * 0.72));
}

@compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= info.width || id.y >= info.height) {
    return;
  }

  let uv = vec2<f32>(
    (f32(id.x) + 0.5) / f32(info.width),
    (f32(id.y) + 0.5) / f32(info.height)
  );
  var color = vec4<f32>(0.0, 0.0, 0.0, 0.0);
  if (hud.enabled < 0.5) {
    textureStore(outputPanel, vec2<i32>(i32(id.x), i32(id.y)), color);
    return;
  }

  let pulse = 0.5 + 0.5 * sin(hud.timeSeconds * 9.0);
  color = addCompassHud(color, uv);
  color = addLayerCard(color, uv, 0u, panel[0], ${wgslPanelMin("aisthesis")}, ${wgslPanelMax("aisthesis")});
  color = addLayerCard(color, uv, 1u, panel[1], ${wgslPanelMin("noesis")}, ${wgslPanelMax("noesis")});
  color = addLayerCard(color, uv, 2u, panel[2], ${wgslPanelMin("krisis")}, ${wgslPanelMax("krisis")});
  color = addLayerCard(color, uv, 3u, panel[3], ${wgslPanelMin("kinesis")}, ${wgslPanelMax("kinesis")});
  color = addLayerCard(color, uv, 1u, panel[5], ${wgslPanelMin("route")}, ${wgslPanelMax("route")});
  color = addLayerCard(color, uv, 2u, panel[7], ${wgslPanelMin("combat")}, ${wgslPanelMax("combat")});
  color = addLayerCard(color, uv, 3u, panel[8], ${wgslPanelMin("zoe")}, ${wgslPanelMax("zoe")});

  let combat = clamp(panel[7], 0.0, 1.0);
  let combatMask = rectMask(uv, vec2<f32>(0.280, 0.055), vec2<f32>(0.720, 0.142));
  color = alphaComposite(color, vec4<f32>(1.0, 0.16, 0.08, combatMask * combat * (0.18 + pulse * 0.18)));

  let zoe = clamp(panel[8], 0.0, 1.0);
  let zoeMask = borderMask(uv, vec2<f32>(0.010, 0.010), vec2<f32>(0.990, 0.990), hudBorderWidth());
  color = alphaComposite(color, vec4<f32>(1.0, 0.04, 0.04, zoeMask * zoe * (0.18 + pulse * 0.28)));

  let diagnosticRectCount = min(u32(max(hud.rectCount, 0.0)), ${HUD_RECT_COUNT}u);
  for (var rectIndex = 0u; rectIndex < diagnosticRectCount; rectIndex = rectIndex + 1u) {
    color = addDiagnosticRect(color, uv, rectIndex);
  }

  textureStore(outputPanel, vec2<i32>(i32(id.x), i32(id.y)), color);
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
      this.adapterInfo = null;
      this.adapterSummary = "unknown";
      this.adapterRequestOptions = cloneWebGpuAdapterRequestOptions();
      this.adapterRequestFallbackUsed = false;
      this.adapterRequestError = "";
      this.device = null;
      this.queue = null;
      this.frameStates = new Map();
      this.frameTextures = new Map();
      this.lastError = "";
      this.renderer = null;
      this.hudOverlayEnabled = false;
      this.hudCompassDisplayState = {
        heading: null,
        yaw: 0,
        confidence: 0,
        usable: 0,
        holdUntil: 0,
        updatedAt: 0
      };
      this.hudOverlayState = {
        contractVersion: 0,
        contractName: "none",
        enabled: false,
        heatmapEnabled: true,
        cells: new Array(HUD_CELL_COUNT).fill(0),
        kairos: 0,
        useProbeTurn: 0,
        enemyConfidence: 0,
        enemyCircle: null,
        enemyCircleActive: 0,
        enemyCircleX: 0.5,
        enemyCircleY: 0.5,
        enemyCircleRadius: 0.08,
        enemyCircleVisual: 0,
        enemyCircleAudio: 0,
        depthEstimate: 1,
        compassHeading: 0,
        compassUsable: 0,
        compassYaw: 0,
        compassConfidence: 0,
        rectangles: [],
        rectangleValues: [],
        rectangleSource: "none",
        rectangleLayout: `rect${HUD_RECT_STRIDE}:${HUD_RECT_FIELDS.join(",")}`,
        panelLayout: HUD_PANEL_LAYOUT_NAME,
        rawFramebufferTarget: FRAME_TARGET,
        rawFrameTarget: normalizeGpuFrameTarget(null, "RawFramebuffer", FRAME_TARGET, RAW_FRAMEBUFFER_WIRE_NAME, "analysis", true),
        hudTarget: HUD_COMPOSITE_TARGET,
        hudFrameTarget: normalizeGpuFrameTarget(null, "HudCompositeOffscreen", HUD_COMPOSITE_TARGET, HUD_COMPOSITE_WIRE_NAME, "display", false),
        analysisCaptureSource: RAW_FRAMEBUFFER_WIRE_NAME,
        analysisFrameTarget: normalizeGpuFrameTarget(null, "RawFramebuffer", FRAME_TARGET, RAW_FRAMEBUFFER_WIRE_NAME, "analysis", true),
        displaySource: HUD_COMPOSITE_WIRE_NAME,
        displayFrameTarget: normalizeGpuFrameTarget(null, "HudCompositeOffscreen", HUD_COMPOSITE_TARGET, HUD_COMPOSITE_WIRE_NAME, "display", false),
        readbackPolicy: "none",
        readback: normalizeGpuReadbackPolicy(null, "none"),
        frameToken: normalizeGpuFrameToken(null, FRAME_TARGET, HUD_COMPOSITE_TARGET, 0, "provider-init"),
        featureFlags: []
      };
      this.gpuAisthesisState = {
        enabled: false,
        inputTarget: FRAME_TARGET,
        inputFrameTarget: normalizeGpuFrameTarget(null, "RawFramebuffer", FRAME_TARGET, RAW_FRAMEBUFFER_WIRE_NAME, "analysis", true),
        hudTarget: HUD_COMPOSITE_TARGET,
        hudFrameTarget: normalizeGpuFrameTarget(null, "HudCompositeOffscreen", HUD_COMPOSITE_TARGET, HUD_COMPOSITE_WIRE_NAME, "display", false),
        captureSource: RAW_FRAMEBUFFER_WIRE_NAME,
        captureFrameTarget: normalizeGpuFrameTarget(null, "RawFramebuffer", FRAME_TARGET, RAW_FRAMEBUFFER_WIRE_NAME, "analysis", true),
        readbackPolicy: "debug-only",
        readback: normalizeGpuReadbackPolicy(null, "debug-only"),
        frameToken: normalizeGpuFrameToken(null, FRAME_TARGET, HUD_COMPOSITE_TARGET, 0, "provider-init"),
        output: "composite",
        visionHeatmap: false,
        edgeDetect: false,
        cornerDetect: false,
        redPanelDetect: false,
        enemyDirection: false,
        projectileFlow: false,
        features: []
      };
      this.gpuSpatialReasoningState = {
        contractVersion: 0,
        contractName: "DoomGpuSpatialReasoning",
        enabled: false,
        inputSource: GPU_AISTHESIS_FEATURE_TARGET,
        matrixSource: GPU_AISTHESIS_MATRIX_TARGET,
        outputTarget: GPU_SPATIAL_OUTPUT_TARGET,
        inputFrameTarget: normalizeGpuFrameTarget(null, "RawFramebuffer", FRAME_TARGET, RAW_FRAMEBUFFER_WIRE_NAME, "analysis", true),
        hudFrameTarget: normalizeGpuFrameTarget(null, "HudCompositeOffscreen", HUD_COMPOSITE_TARGET, HUD_COMPOSITE_WIRE_NAME, "display", false),
        readbackPolicy: "runtime-summary",
        readback: normalizeGpuReadbackPolicy(null, "runtime-summary"),
        frameToken: normalizeGpuFrameToken(null, FRAME_TARGET, HUD_COMPOSITE_TARGET, 0, "provider-init"),
        outputVectorLayout: normalizeGpuFlatBufferLayout(null, GPU_SPATIAL_OUTPUT_LAYOUT_NAME, GPU_SPATIAL_OUTPUT_FLOATS, 1, GPU_SPATIAL_OUTPUT_FIELDS, GPU_SPATIAL_OUTPUT_FLOATS),
        outputFloatCount: GPU_SPATIAL_OUTPUT_FLOATS,
        matrixCount: 0,
        matrixFloatCount: 0,
        featureFlags: []
      };
      this.gpuAisthesisLastSummary = null;
      this.gpuSpatialReasoningLastSummary = null;
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
          const adapterRequest = await requestPreferredWebGpuAdapter(navigator.gpu);
          this.adapter = adapterRequest.adapter;
          this.adapterRequestOptions = adapterRequest.options;
          this.adapterRequestFallbackUsed = adapterRequest.fallbackUsed;
          this.adapterRequestError = adapterRequest.requestError || "";
          if (!this.adapter) {
            this.usingCpuFallback = true;
            this.lastError = "WebGPU adapter is unavailable.";
            return this.status();
          }

          this.adapterInfo = await resolveWebGpuAdapterInfo(this.adapter);
          this.adapterSummary = summarizeWebGpuAdapterInfo(this.adapterInfo);
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
          label: HUD_CELLS_TARGET,
          size: HUD_CELL_COUNT * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const hudPanelBuffer = this.device.createBuffer({
          label: HUD_PANEL_VALUES_TARGET,
          size: HUD_PANEL_VALUE_COUNT * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const hudRectBuffer = this.device.createBuffer({
          label: HUD_PRIORITY_RECTS_TARGET,
          size: HUD_RECT_FLOATS * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const gpuAisthesisInfoBuffer = this.device.createBuffer({
          label: GPU_AISTHESIS_INFO_TARGET,
          size: GPU_AISTHESIS_INFO_FLOATS * 4,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const gpuAisthesisMatrixBuffer = this.device.createBuffer({
          label: GPU_AISTHESIS_MATRIX_TARGET,
          size: GPU_AISTHESIS_MATRIX_FLOATS * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        const gpuAisthesisFeatureBuffer = this.device.createBuffer({
          label: GPU_AISTHESIS_FEATURE_TARGET,
          size: GPU_AISTHESIS_FEATURE_FLOATS * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        const gpuSpatialInfoBuffer = this.device.createBuffer({
          label: GPU_SPATIAL_INFO_TARGET,
          size: GPU_SPATIAL_INFO_FLOATS * 4,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const gpuSpatialOutputBuffer = this.device.createBuffer({
          label: GPU_SPATIAL_OUTPUT_TARGET,
          size: GPU_SPATIAL_OUTPUT_FLOATS * 4,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST
        });
        const frameTexture = this.device.createTexture({
          label: "doom.frame.rgba8unorm",
          size: { width, height },
          format: "rgba8unorm",
          usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
        });
        const gpuAisthesisMaskTexture = this.device.createTexture({
          label: GPU_AISTHESIS_MASK_TARGET,
          size: { width: HUD_GRID_SIZE, height: HUD_GRID_SIZE },
          format: "rgba8unorm",
          usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
        });
        const hudPanelTextures = [0, 1].map(index => this.device.createTexture({
          label: `doom.hud.panel.overlay.${index}`,
          size: { width, height },
          format: "rgba8unorm",
          usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
        }));
        const hudCompositeTextures = [0, 1].map(index => this.device.createTexture({
          label: `doom.hud.composite.${index}`,
          size: { width, height },
          format,
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
        }));
        const computePipeline = this.device.createComputePipeline({
          label: "doom.palette.compute",
          layout: "auto",
          compute: {
            module: this.device.createShaderModule({ code: PALETTE_COMPUTE_SHADER }),
            entryPoint: "main"
          }
        });
        const panelComputePipeline = this.device.createComputePipeline({
          label: "doom.hud.panel.compute",
          layout: "auto",
          compute: {
            module: this.device.createShaderModule({ code: HUD_PANEL_SHADER }),
            entryPoint: "main"
          }
        });
        const gpuAisthesisComputePipeline = this.device.createComputePipeline({
          label: "doom.gpu.aisthesis.compute",
          layout: "auto",
          compute: {
            module: this.device.createShaderModule({ code: GPU_AISTHESIS_COMPUTE_SHADER }),
            entryPoint: "main"
          }
        });
        const gpuSpatialReasoningComputePipeline = this.device.createComputePipeline({
          label: "doom.gpu.spatial.reasoning.compute",
          layout: "auto",
          compute: {
            module: this.device.createShaderModule({ code: GPU_SPATIAL_REASONING_SHADER }),
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
        const panelComputeBindGroups = hudPanelTextures.map((texture, index) => this.device.createBindGroup({
          label: `doom.hud.panel.compute.bindings.${index}`,
          layout: panelComputePipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: hudInfoBuffer } },
            { binding: 1, resource: { buffer: hudPanelBuffer } },
            { binding: 2, resource: texture.createView() },
            { binding: 3, resource: { buffer: infoBuffer } },
            { binding: 4, resource: { buffer: hudRectBuffer } }
          ]
        }));
        const gpuAisthesisComputeBindGroup = this.device.createBindGroup({
          label: "doom.gpu.aisthesis.compute.bindings",
          layout: gpuAisthesisComputePipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: gpuAisthesisInfoBuffer } },
            { binding: 1, resource: { buffer: gpuAisthesisMatrixBuffer } },
            { binding: 2, resource: { buffer: gpuAisthesisFeatureBuffer } },
            { binding: 3, resource: frameTexture.createView() },
            { binding: 4, resource: { buffer: infoBuffer } },
            { binding: 5, resource: { buffer: hudCellsBuffer } },
            { binding: 6, resource: gpuAisthesisMaskTexture.createView() }
          ]
        });
        const gpuSpatialReasoningComputeBindGroup = this.device.createBindGroup({
          label: "doom.gpu.spatial.reasoning.compute.bindings",
          layout: gpuSpatialReasoningComputePipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: gpuSpatialInfoBuffer } },
            { binding: 1, resource: { buffer: gpuAisthesisFeatureBuffer } },
            { binding: 2, resource: { buffer: gpuAisthesisMatrixBuffer } },
            { binding: 3, resource: { buffer: gpuSpatialOutputBuffer } },
            { binding: 4, resource: gpuAisthesisMaskTexture.createView() }
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
        const blitPipeline = this.device.createRenderPipeline({
          label: "doom.present.blit.pipeline",
          layout: "auto",
          vertex: {
            module: this.device.createShaderModule({ code: BLIT_SHADER }),
            entryPoint: "vertexMain"
          },
          fragment: {
            module: this.device.createShaderModule({ code: BLIT_SHADER }),
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
        const renderBindGroups = hudPanelTextures.map((texture, index) => this.device.createBindGroup({
          label: `doom.present.bindings.${index}`,
          layout: renderPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: sampler },
            { binding: 1, resource: frameTexture.createView() },
            { binding: 2, resource: { buffer: hudInfoBuffer } },
            { binding: 3, resource: { buffer: hudCellsBuffer } },
            { binding: 4, resource: texture.createView() }
          ]
        }));
        const hudCompositePresentBindGroups = hudCompositeTextures.map((texture, index) => this.device.createBindGroup({
          label: `doom.hud.composite.present.bindings.${index}`,
          layout: blitPipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: sampler },
            { binding: 1, resource: texture.createView() }
          ]
        }));
        const indexUpload = new Uint32Array(framePixels);
        const infoUpload = new Uint32Array([width, height, 0, 0]);
        const hudInfoUpload = new Float32Array(HUD_UNIFORM_FLOATS);
        const hudCellsUpload = new Float32Array(HUD_CELL_COUNT);
        const hudPanelUpload = new Float32Array(HUD_PANEL_VALUE_COUNT);
        const hudRectUpload = new Float32Array(HUD_RECT_FLOATS);
        const gpuAisthesisInfoUpload = new Float32Array(GPU_AISTHESIS_INFO_FLOATS);
        const gpuAisthesisMatrixUpload = new Float32Array(GPU_AISTHESIS_MATRIX_FLOATS);
        const gpuAisthesisFeatureUpload = new Float32Array(GPU_AISTHESIS_FEATURE_FLOATS);
        const gpuSpatialInfoUpload = new Float32Array(GPU_SPATIAL_INFO_FLOATS);
        const gpuSpatialOutputUpload = new Float32Array(GPU_SPATIAL_OUTPUT_FLOATS);

        this.renderer = {
          canvas,
          context,
          format,
          width,
          height,
          framePixels,
          indexBuffer,
          paletteBuffer,
          infoBuffer,
          hudInfoBuffer,
          hudCellsBuffer,
          hudPanelBuffer,
          hudRectBuffer,
          gpuAisthesisInfoBuffer,
          gpuAisthesisMatrixBuffer,
          gpuAisthesisFeatureBuffer,
          gpuSpatialInfoBuffer,
          gpuSpatialOutputBuffer,
          frameTexture,
          gpuAisthesisMaskTexture,
          hudPanelTextures,
          hudCompositeTextures,
          computePipeline,
          computeBindGroup,
          panelComputePipeline,
          panelComputeBindGroups,
          gpuAisthesisComputePipeline,
          gpuAisthesisComputeBindGroup,
          gpuSpatialReasoningComputePipeline,
          gpuSpatialReasoningComputeBindGroup,
          renderPipeline,
          renderBindGroups,
          blitPipeline,
          hudCompositePresentBindGroups,
          indexUpload,
          infoUpload,
          hudInfoUpload,
          hudCellsUpload,
          hudPanelUpload,
          hudRectUpload,
          gpuAisthesisInfoUpload,
          gpuAisthesisMatrixUpload,
          gpuAisthesisFeatureUpload,
          gpuSpatialInfoUpload,
          gpuSpatialOutputUpload,
          hudOverlayEnabled: this.hudOverlayEnabled,
          hudPanelIndex: 0,
          hudCompositeIndex: 0,
          hudCompositeReady: false,
          hudCompositeLastUpdateAt: Number.NEGATIVE_INFINITY,
          hudCompositeFrame: 0,
          gpuAisthesisFrame: 0,
          gpuSpatialReasoningFrame: 0,
          frame: 0
        };
        this.writeHudOverlayBuffers(this.renderer);
        this.writeGpuAisthesisBuffers(this.renderer);
        this.writeGpuSpatialReasoningBuffers(this.renderer);
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
      if (Array.isArray(state.rectangles) || ArrayBuffer.isView(state.rectangles)) {
        next.rectangles = Array.from(state.rectangles).slice(0, HUD_RECT_COUNT);
      } else if (Array.isArray(state.rects) || ArrayBuffer.isView(state.rects)) {
        next.rectangles = Array.from(state.rects).slice(0, HUD_RECT_COUNT);
      }
      next.contractVersion = Number(state.contractVersion ?? state.ContractVersion ?? next.contractVersion ?? 0) || 0;
      next.contractName = String(state.contractName || state.ContractName || next.contractName || "DoomGpuHudOverlay");
      const enemyCircleInput = Object.prototype.hasOwnProperty.call(state, "enemyCircle")
        ? state.enemyCircle
        : (Object.prototype.hasOwnProperty.call(state, "EnemyCircle") ? state.EnemyCircle : null);
      const enemyCircle = normalizeHudEnemyCircle(enemyCircleInput);
      next.enemyCircle = enemyCircle.source;
      next.enemyCircleActive = enemyCircle.active;
      next.enemyCircleX = enemyCircle.x;
      next.enemyCircleY = enemyCircle.y;
      next.enemyCircleRadius = enemyCircle.radius;
      next.enemyCircleVisual = enemyCircle.visual;
      next.enemyCircleAudio = enemyCircle.audio;
      next.rectangleLayout = String(state.rectangleLayout || state.RectangleLayout || next.rectangleLayout || `rect${HUD_RECT_STRIDE}:${HUD_RECT_FIELDS.join(",")}`);
      next.rectangleBufferLayout = normalizeGpuFlatBufferLayout(
        state.rectangleBufferLayout || state.RectangleBufferLayout || next.rectangleBufferLayout,
        `rect${HUD_RECT_STRIDE}`,
        HUD_RECT_STRIDE,
        HUD_RECT_COUNT,
        HUD_RECT_FIELDS);
      next.panelLayout = String(state.panelLayout || state.PanelLayout || next.panelLayout || HUD_PANEL_LAYOUT_NAME);
      next.panelBufferLayout = normalizeGpuFlatBufferLayout(
        state.panelBufferLayout || state.PanelBufferLayout || next.panelBufferLayout,
        HUD_PANEL_LAYOUT_NAME,
        HUD_PANEL_VALUE_COUNT,
        1,
        HUD_PANEL_FIELDS);
      next.rawFramebufferTarget = String(state.rawFramebufferTarget || state.RawFramebufferTarget || next.rawFramebufferTarget || FRAME_TARGET);
      next.rawFrameTarget = normalizeGpuFrameTarget(state.rawFrameTarget || state.RawFrameTarget || next.rawFrameTarget, "RawFramebuffer", next.rawFramebufferTarget, RAW_FRAMEBUFFER_WIRE_NAME, "analysis", true);
      next.hudTarget = String(state.hudTarget || state.HudTarget || next.hudTarget || HUD_COMPOSITE_TARGET);
      next.hudFrameTarget = normalizeGpuFrameTarget(state.hudFrameTarget || state.HudFrameTarget || next.hudFrameTarget, "HudCompositeOffscreen", next.hudTarget, HUD_COMPOSITE_WIRE_NAME, "display", false);
      next.analysisCaptureSource = String(state.analysisCaptureSource || state.AnalysisCaptureSource || next.analysisCaptureSource || RAW_FRAMEBUFFER_WIRE_NAME);
      next.analysisFrameTarget = normalizeGpuFrameTarget(state.analysisFrameTarget || state.AnalysisFrameTarget || next.analysisFrameTarget, "RawFramebuffer", next.rawFramebufferTarget, next.analysisCaptureSource, "analysis", true);
      next.displaySource = String(state.displaySource || state.DisplaySource || next.displaySource || HUD_COMPOSITE_WIRE_NAME);
      next.displayFrameTarget = normalizeGpuFrameTarget(state.displayFrameTarget || state.DisplayFrameTarget || next.displayFrameTarget, "HudCompositeOffscreen", next.hudTarget, next.displaySource, "display", false);
      next.readbackPolicy = String(state.readbackPolicy || state.ReadbackPolicy || next.readbackPolicy || "none");
      next.readback = normalizeGpuReadbackPolicy(state.readback || state.Readback || next.readback, next.readbackPolicy);
      next.frameToken = normalizeGpuFrameToken(state.frameToken || state.FrameToken || next.frameToken, next.rawFramebufferTarget, next.hudTarget, this.renderer?.frame || 0, "hud-overlay");
      const featureFlags = state.featureFlags || state.FeatureFlags || next.featureFlags || [];
      next.featureFlags = Array.isArray(featureFlags)
        ? featureFlags.map(value => String(value)).slice(0, HUD_LABEL_COUNT)
        : [];
      const projectedRectangleValues = state.rectangleValues || state.RectangleValues || state.rectValues || state.RectValues || [];
      const hasProjectedRectangles = (Array.isArray(projectedRectangleValues) || ArrayBuffer.isView(projectedRectangleValues)) && projectedRectangleValues.length > 0;
      if (hasProjectedRectangles) {
        next.rectangleValues = Array.from(projectedRectangleValues)
          .slice(0, HUD_RECT_FLOATS)
          .map(value => finiteGpuScalar(value));
        next.rectangleSource = hasProjectedRectangles ? "dto-flat" : "js-fallback-pack";
      } else {
        next.rectangleValues = [];
        next.rectangleSource = "js-fallback-pack";
      }
      next.rectangleFloatCount = next.rectangleValues.length;
      next.rectangleCount = Math.min(
        HUD_RECT_COUNT,
        Math.floor((Number(state.rectangleCount ?? state.RectangleCount) || next.rectangleValues.length / HUD_RECT_STRIDE || next.rectangles?.length || 0)));
      this.hudOverlayState = next;
      if (this.renderer) {
        this.writeHudOverlayBuffers(this.renderer);
      }
      return true;
    }

    setGpuAisthesisState(state) {
      if (!state || typeof state !== "object") {
        return false;
      }

      const inputTarget = String(state.inputTarget || state.InputTarget || FRAME_TARGET);
      const hudTarget = String(state.hudTarget || state.HudTarget || HUD_COMPOSITE_TARGET);
      const features = Array.isArray(state.features || state.Features)
        ? Array.from(state.features || state.Features).map(value => String(value)).slice(0, HUD_LABEL_COUNT)
        : [];
      const sourceMatrices = state.matrices || state.Matrices || [];
      const projectedMatrixValues = state.matrixValues || state.MatrixValues || [];
      const hasProjectedMatrixValues = Array.isArray(projectedMatrixValues) || ArrayBuffer.isView(projectedMatrixValues);
      const flattenedMatrices = hasProjectedMatrixValues && projectedMatrixValues.length > 0
        ? {
          matrixCount: Number(state.matrixCount ?? state.MatrixCount ?? 0) || 0,
          values: Array.from(projectedMatrixValues).slice(0, GPU_AISTHESIS_MATRIX_FLOATS).map(value => finiteGpuScalar(value))
        }
        : flattenGpuAisthesisMatrices(sourceMatrices, state.stateVector || state.StateVector || []);
      const matrixKinds = normalizeGpuStringList(state.matrixKinds || state.MatrixKinds || matrixKindsFromMatrices(sourceMatrices));
      const matrixBufferLayout = normalizeGpuFlatBufferLayout(
        state.matrixBufferLayout || state.MatrixBufferLayout,
        "matrix",
        0,
        0,
        ["kind", "rows", "columns", "count", "values"],
        GPU_AISTHESIS_MATRIX_FLOATS);
      const stateVectorBufferLayout = normalizeGpuFlatBufferLayout(
        state.stateVectorBufferLayout || state.StateVectorBufferLayout,
        GPU_STATE_VECTOR_LAYOUT_NAME,
        GPU_STATE_VECTOR_FLOATS,
        1,
        GPU_STATE_VECTOR_FIELDS);
      this.gpuAisthesisState = {
        contractVersion: Number(state.contractVersion ?? state.ContractVersion ?? 0) || 0,
        contractName: String(state.contractName || state.ContractName || "DoomGpuAisthesis"),
        enabled: Boolean(state.enabled ?? state.Enabled),
        inputTarget,
        inputFrameTarget: normalizeGpuFrameTarget(state.inputFrameTarget || state.InputFrameTarget, "RawFramebuffer", inputTarget, RAW_FRAMEBUFFER_WIRE_NAME, "analysis", true),
        hudTarget,
        hudFrameTarget: normalizeGpuFrameTarget(state.hudFrameTarget || state.HudFrameTarget, "HudCompositeOffscreen", hudTarget, HUD_COMPOSITE_WIRE_NAME, "display", false),
        captureSource: String(state.captureSource || state.CaptureSource || RAW_FRAMEBUFFER_WIRE_NAME),
        captureFrameTarget: normalizeGpuFrameTarget(state.captureFrameTarget || state.CaptureFrameTarget, "RawFramebuffer", inputTarget, String(state.captureSource || state.CaptureSource || RAW_FRAMEBUFFER_WIRE_NAME), "analysis", true),
        readbackPolicy: String(state.readbackPolicy || state.ReadbackPolicy || "debug-only"),
        readback: normalizeGpuReadbackPolicy(state.readback || state.Readback, String(state.readbackPolicy || state.ReadbackPolicy || "debug-only")),
        frameToken: normalizeGpuFrameToken(state.frameToken || state.FrameToken, inputTarget, hudTarget, this.renderer?.frame || 0, "gpu-aisthesis"),
        output: String(state.output || state.Output || "composite"),
        maskTextureEnabled: Boolean(state.maskTextureEnabled ?? state.MaskTextureEnabled ?? true),
        maskTextureTarget: String(state.maskTextureTarget || state.MaskTextureTarget || state.maskTexture?.target || state.MaskTexture?.Target || GPU_AISTHESIS_MASK_TARGET),
        maskTexture: normalizeGpuTextureTarget(state.maskTexture || state.MaskTexture, "AisthesisMask", GPU_AISTHESIS_MASK_TARGET, GPU_AISTHESIS_MASK_WIRE_NAME, "rgba8unorm", HUD_GRID_SIZE, HUD_GRID_SIZE, "analysis-mask", true),
        maskTextureLayout: String(state.maskTextureLayout || state.MaskTextureLayout || GPU_AISTHESIS_MASK_LAYOUT),
        visionHeatmap: Boolean(state.visionHeatmap ?? state.VisionHeatmap),
        edgeDetect: Boolean(state.edgeDetect ?? state.EdgeDetect),
        cornerDetect: Boolean(state.cornerDetect ?? state.CornerDetect),
        redPanelDetect: Boolean(state.redPanelDetect ?? state.RedPanelDetect),
        enemyDirection: Boolean(state.enemyDirection ?? state.EnemyDirection),
        projectileFlow: Boolean(state.projectileFlow ?? state.ProjectileFlow),
        features,
        matrixKinds,
        matrixKindSummary: String(state.matrixKindSummary || state.MatrixKindSummary || summarizeMatrixKinds(matrixKinds)),
        matrixLayout: String(state.matrixLayout || state.MatrixLayout || "matrix:kind,rows,columns,count,values"),
        matrixBufferLayout,
        stateVectorLayout: String(state.stateVectorLayout || state.StateVectorLayout || GPU_STATE_VECTOR_LAYOUT_NAME),
        stateVectorBufferLayout,
        bufferLayoutSummary: String(state.bufferLayoutSummary || state.BufferLayoutSummary || `${matrixBufferLayout.summary}; ${stateVectorBufferLayout.summary}`),
        matrixCount: flattenedMatrices.matrixCount,
        matrixFloatCount: flattenedMatrices.values.length,
        matrixSource: hasProjectedMatrixValues && projectedMatrixValues.length > 0 ? "dto-flat" : "js-fallback-flatten",
        matrixValues: flattenedMatrices.values,
        zeroCopyReady: Boolean(this.getFramebufferTexture(inputTarget)),
        storageTextureReady: Boolean(this.renderer?.frameTexture),
        summary: String(state.summary || state.Summary || "")
      };
      if (this.renderer) {
        this.writeGpuAisthesisBuffers(this.renderer);
      }
      return true;
    }

    writeGpuAisthesisBuffers(renderer = this.renderer) {
      if (!renderer || !this.queue) {
        return;
      }

      if (renderer.gpuAisthesisInfoBuffer && renderer.gpuAisthesisInfoUpload) {
        renderer.gpuAisthesisInfoUpload.fill(0);
        const state = this.gpuAisthesisState || {};
        renderer.gpuAisthesisInfoUpload[0] = state.enabled ? 1 : 0;
        renderer.gpuAisthesisInfoUpload[1] = state.zeroCopyReady ? 1 : 0;
        renderer.gpuAisthesisInfoUpload[2] = state.storageTextureReady ? 1 : 0;
        renderer.gpuAisthesisInfoUpload[3] = finiteGpuScalar(state.matrixCount || 0);
        renderer.gpuAisthesisInfoUpload[4] = finiteGpuScalar(state.matrixFloatCount || 0);
        renderer.gpuAisthesisInfoUpload[5] = state.visionHeatmap ? 1 : 0;
        renderer.gpuAisthesisInfoUpload[6] = state.edgeDetect ? 1 : 0;
        renderer.gpuAisthesisInfoUpload[7] = state.cornerDetect ? 1 : 0;
        renderer.gpuAisthesisInfoUpload[8] = state.redPanelDetect ? 1 : 0;
        renderer.gpuAisthesisInfoUpload[9] = state.enemyDirection ? 1 : 0;
        renderer.gpuAisthesisInfoUpload[10] = state.projectileFlow ? 1 : 0;
        renderer.gpuAisthesisInfoUpload[11] = gpuAisthesisOutputCode(state.output);
        renderer.gpuAisthesisInfoUpload[12] = finiteGpuScalar(state.features?.length || 0);
        renderer.gpuAisthesisInfoUpload[13] = state.maskTextureEnabled ? 1 : 0;
        this.queue.writeBuffer(renderer.gpuAisthesisInfoBuffer, 0, renderer.gpuAisthesisInfoUpload);
      }

      if (renderer.gpuAisthesisMatrixBuffer && renderer.gpuAisthesisMatrixUpload) {
        renderer.gpuAisthesisMatrixUpload.fill(0);
        const values = this.gpuAisthesisState?.matrixValues || [];
        const count = Math.min(GPU_AISTHESIS_MATRIX_FLOATS, values.length || 0);
        for (let index = 0; index < count; index += 1) {
          renderer.gpuAisthesisMatrixUpload[index] = finiteGpuScalar(values[index]);
        }
        this.queue.writeBuffer(renderer.gpuAisthesisMatrixBuffer, 0, renderer.gpuAisthesisMatrixUpload);
      }

      if (renderer.gpuAisthesisFeatureBuffer && renderer.gpuAisthesisFeatureUpload && !this.gpuAisthesisState?.enabled) {
        renderer.gpuAisthesisFeatureUpload.fill(0);
        this.queue.writeBuffer(renderer.gpuAisthesisFeatureBuffer, 0, renderer.gpuAisthesisFeatureUpload);
      }
    }

    setGpuSpatialReasoningState(state) {
      if (!state || typeof state !== "object") {
        return false;
      }

      const aisthesis = this.gpuAisthesisState || {};
      const inputFrameTarget = normalizeGpuFrameTarget(
        state.inputFrameTarget || state.InputFrameTarget || aisthesis.inputFrameTarget,
        "RawFramebuffer",
        aisthesis.inputTarget || FRAME_TARGET,
        RAW_FRAMEBUFFER_WIRE_NAME,
        "analysis",
        true);
      const hudFrameTarget = normalizeGpuFrameTarget(
        state.hudFrameTarget || state.HudFrameTarget || aisthesis.hudFrameTarget,
        "HudCompositeOffscreen",
        aisthesis.hudTarget || HUD_COMPOSITE_TARGET,
        HUD_COMPOSITE_WIRE_NAME,
        "display",
        false);
      const featureFlags = state.featureFlags || state.FeatureFlags || [];
      const normalizedFeatureFlags = normalizeGpuStringList(featureFlags);
      const outputVectorLayout = normalizeGpuFlatBufferLayout(
        state.outputVectorLayout || state.OutputVectorLayout,
        GPU_SPATIAL_OUTPUT_LAYOUT_NAME,
        GPU_SPATIAL_OUTPUT_FLOATS,
        1,
        GPU_SPATIAL_OUTPUT_FIELDS,
        GPU_SPATIAL_OUTPUT_FLOATS);
      const matrixKinds = normalizeGpuStringList(state.matrixKinds || state.MatrixKinds || aisthesis.matrixKinds || []);
      this.gpuSpatialReasoningState = {
        contractVersion: Number(state.contractVersion ?? state.ContractVersion ?? 0) || 0,
        contractName: String(state.contractName || state.ContractName || "DoomGpuSpatialReasoning"),
        enabled: Boolean(state.enabled ?? state.Enabled),
        inputSource: String(state.inputSource || state.InputSource || GPU_AISTHESIS_FEATURE_TARGET),
        matrixSource: String(state.matrixSource || state.MatrixSource || GPU_AISTHESIS_MATRIX_TARGET),
        maskTextureSource: String(state.maskTextureSource || state.MaskTextureSource || aisthesis.maskTextureTarget || GPU_AISTHESIS_MASK_TARGET),
        maskTexture: normalizeGpuTextureTarget(state.maskTexture || state.MaskTexture || aisthesis.maskTexture, "AisthesisMask", GPU_AISTHESIS_MASK_TARGET, GPU_AISTHESIS_MASK_WIRE_NAME, "rgba8unorm", HUD_GRID_SIZE, HUD_GRID_SIZE, "analysis-mask", true),
        maskTextureLayout: String(state.maskTextureLayout || state.MaskTextureLayout || aisthesis.maskTextureLayout || GPU_AISTHESIS_MASK_LAYOUT),
        outputTarget: String(state.outputTarget || state.OutputTarget || GPU_SPATIAL_OUTPUT_TARGET),
        inputFrameTarget,
        hudFrameTarget,
        readbackPolicy: String(state.readbackPolicy || state.ReadbackPolicy || "runtime-summary"),
        readback: normalizeGpuReadbackPolicy(state.readback || state.Readback, String(state.readbackPolicy || state.ReadbackPolicy || "runtime-summary")),
        frameToken: normalizeGpuFrameToken(state.frameToken || state.FrameToken, inputFrameTarget.target, hudFrameTarget.target, this.renderer?.frame || 0, "gpu-spatial-reasoning"),
        featureFlags: normalizedFeatureFlags,
        featureFlagSummary: String(state.featureFlagSummary || state.FeatureFlagSummary || (normalizedFeatureFlags.length > 0 ? `reducers=${normalizedFeatureFlags.join("+")}` : "reducers=none")),
        matrixKinds,
        matrixKindSummary: String(state.matrixKindSummary || state.MatrixKindSummary || aisthesis.matrixKindSummary || summarizeMatrixKinds(matrixKinds)),
        outputVectorLayout,
        outputFloatCount: Number(state.outputFloatCount ?? state.OutputFloatCount ?? GPU_SPATIAL_OUTPUT_FLOATS) || GPU_SPATIAL_OUTPUT_FLOATS,
        outputLayoutSummary: String(state.outputLayoutSummary || state.OutputLayoutSummary || outputVectorLayout.summary),
        matrixCount: Number(state.matrixCount ?? state.MatrixCount ?? aisthesis.matrixCount ?? 0) || 0,
        matrixFloatCount: Number(state.matrixFloatCount ?? state.MatrixFloatCount ?? aisthesis.matrixFloatCount ?? 0) || 0,
        featureCount: Number(state.featureCount ?? state.FeatureCount ?? aisthesis.features?.length ?? 0) || 0,
        maskTextureReady: Boolean(aisthesis.maskTextureEnabled ?? aisthesis.MaskTextureEnabled ?? this.renderer?.gpuAisthesisMaskTexture),
        output: String(state.output || state.Output || "summary"),
        summary: String(state.summary || state.Summary || "")
      };
      if (this.renderer) {
        this.writeGpuSpatialReasoningBuffers(this.renderer);
      }
      return true;
    }

    writeGpuSpatialReasoningBuffers(renderer = this.renderer) {
      if (!renderer || !this.queue) {
        return;
      }

      if (renderer.gpuSpatialInfoBuffer && renderer.gpuSpatialInfoUpload) {
        renderer.gpuSpatialInfoUpload.fill(0);
        const state = this.gpuSpatialReasoningState || {};
        renderer.gpuSpatialInfoUpload[0] = state.enabled ? 1 : 0;
        renderer.gpuSpatialInfoUpload[1] = finiteGpuScalar(state.matrixCount || this.gpuAisthesisState?.matrixCount || 0);
        renderer.gpuSpatialInfoUpload[2] = finiteGpuScalar(state.matrixFloatCount || this.gpuAisthesisState?.matrixFloatCount || 0);
        renderer.gpuSpatialInfoUpload[3] = finiteGpuScalar(state.featureCount || this.gpuAisthesisState?.features?.length || 0);
        renderer.gpuSpatialInfoUpload[4] = state.featureFlags?.includes("route-reduce") ? 1 : 0;
        renderer.gpuSpatialInfoUpload[5] = state.featureFlags?.includes("threat-reduce") ? 1 : 0;
        renderer.gpuSpatialInfoUpload[6] = state.featureFlags?.includes("zoe-reduce") ? 1 : 0;
        renderer.gpuSpatialInfoUpload[7] = state.featureFlags?.includes("ctg-normalize") ? 1 : 0;
        renderer.gpuSpatialInfoUpload[8] = gpuSpatialReasoningOutputCode(state.output);
        renderer.gpuSpatialInfoUpload[9] = state.maskTextureReady ? 1 : 0;
        this.queue.writeBuffer(renderer.gpuSpatialInfoBuffer, 0, renderer.gpuSpatialInfoUpload);
      }

      if (renderer.gpuSpatialOutputBuffer && renderer.gpuSpatialOutputUpload && !this.gpuSpatialReasoningState?.enabled) {
        renderer.gpuSpatialOutputUpload.fill(0);
        this.queue.writeBuffer(renderer.gpuSpatialOutputBuffer, 0, renderer.gpuSpatialOutputUpload);
      }
    }

    async readGpuSpatialReasoningOutput(options = {}) {
      const renderer = this.renderer;
      const byteLength = GPU_SPATIAL_OUTPUT_FLOATS * 4;
      const policy = normalizeGpuReadbackPolicy(this.gpuSpatialReasoningState?.readback, this.gpuSpatialReasoningState?.readbackPolicy || "runtime-summary");
      if (!policy.allowsSummary && !policy.allowsFullReadback) {
        return gpuSpatialReasoningReadbackUnavailable("gpu-spatial-readback-disabled-by-policy", {
          readbackPolicy: policy
        });
      }

      if (options?.raw === true && !policy.allowsFullReadback) {
        return gpuSpatialReasoningReadbackUnavailable("gpu-spatial-raw-readback-disabled-by-policy", {
          readbackPolicy: policy
        });
      }

      if (!renderer || this.usingCpuFallback || !this.device || !this.queue) {
        return gpuSpatialReasoningReadbackUnavailable("webgpu-renderer-unavailable");
      }

      if (!renderer.gpuSpatialOutputBuffer) {
        return gpuSpatialReasoningReadbackUnavailable("gpu-spatial-output-buffer-unavailable");
      }

      const readback = this.device.createBuffer({
        label: "doom.gpu.spatial.reasoning.readback",
        size: byteLength,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      });

      try {
        const encoder = this.device.createCommandEncoder({ label: "doom.gpu.spatial.reasoning.readback.encoder" });
        encoder.copyBufferToBuffer(renderer.gpuSpatialOutputBuffer, 0, readback, 0, byteLength);
        this.queue.submit([encoder.finish()]);
        const readMode = globalThis.GPUMapMode?.READ ?? 1;
        await readback.mapAsync(readMode);
        const mapped = readback.getMappedRange();
        const rawValues = Array.from(new Float32Array(mapped).slice(0, GPU_SPATIAL_OUTPUT_FLOATS));
        const values = options?.raw === true
          ? rawValues
          : rawValues.map(value => roundGpuFeature(value));
        readback.unmap();
        const result = {
          ok: true,
          source: GPU_SPATIAL_OUTPUT_TARGET,
          frame: renderer.gpuSpatialReasoningFrame || 0,
          readbackPolicy: policy,
          floatCount: GPU_SPATIAL_OUTPUT_FLOATS,
          values: policy.allowsFullReadback ? values : [],
          summary: summarizeGpuSpatialReasoningOutput(values)
        };
        this.gpuSpatialReasoningLastSummary = {
          source: result.source,
          frame: result.frame,
          floatCount: result.floatCount,
          readbackPolicy: result.readbackPolicy,
          summary: result.summary,
          capturedAt: Date.now()
        };
        return result;
      } catch (error) {
        try {
          readback.unmap();
        } catch {
          // Ignore unmap failures when mapAsync did not complete.
        }
        return {
          ok: false,
          reason: "gpu-spatial-readback-failed",
          error: error instanceof Error ? error.message : String(error),
          source: GPU_SPATIAL_OUTPUT_TARGET,
          frame: renderer.gpuSpatialReasoningFrame || 0,
          floatCount: GPU_SPATIAL_OUTPUT_FLOATS
        };
      } finally {
        if (typeof readback.destroy === "function") {
          readback.destroy();
        }
      }
    }

    async readGpuAisthesisFeatures(options = {}) {
      const renderer = this.renderer;
      const byteLength = GPU_AISTHESIS_FEATURE_FLOATS * 4;
      const policy = normalizeGpuReadbackPolicy(this.gpuAisthesisState?.readback, this.gpuAisthesisState?.readbackPolicy || "debug-only");
      if (!policy.allowsSummary && !policy.allowsFullReadback) {
        return gpuAisthesisReadbackUnavailable("gpu-aisthesis-readback-disabled-by-policy", {
          readbackPolicy: policy
        });
      }

      if (options?.raw === true && !policy.allowsFullReadback) {
        return gpuAisthesisReadbackUnavailable("gpu-aisthesis-raw-readback-disabled-by-policy", {
          readbackPolicy: policy
        });
      }

      if (!renderer || this.usingCpuFallback || !this.device || !this.queue) {
        return gpuAisthesisReadbackUnavailable("webgpu-renderer-unavailable");
      }

      if (!renderer.gpuAisthesisFeatureBuffer) {
        return gpuAisthesisReadbackUnavailable("gpu-aisthesis-feature-buffer-unavailable");
      }

      const readback = this.device.createBuffer({
        label: "doom.gpu.aisthesis.features.readback",
        size: byteLength,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
      });

      try {
        const encoder = this.device.createCommandEncoder({ label: "doom.gpu.aisthesis.features.readback.encoder" });
        encoder.copyBufferToBuffer(renderer.gpuAisthesisFeatureBuffer, 0, readback, 0, byteLength);
        this.queue.submit([encoder.finish()]);
        const readMode = globalThis.GPUMapMode?.READ ?? 1;
        await readback.mapAsync(readMode);
        const mapped = readback.getMappedRange();
        const rawValues = Array.from(new Float32Array(mapped).slice(0, GPU_AISTHESIS_FEATURE_FLOATS));
        const values = options?.raw === true
          ? rawValues
          : rawValues.map(value => roundGpuFeature(value));
        readback.unmap();
        const result = {
          ok: true,
          source: GPU_AISTHESIS_FEATURE_TARGET,
          frame: renderer.gpuAisthesisFrame || 0,
          readbackPolicy: policy,
          floatCount: GPU_AISTHESIS_FEATURE_FLOATS,
          values: policy.allowsFullReadback ? values : [],
          summary: summarizeGpuAisthesisFeatures(values)
        };
        this.gpuAisthesisLastSummary = {
          source: result.source,
          frame: result.frame,
          floatCount: result.floatCount,
          readbackPolicy: result.readbackPolicy,
          summary: result.summary,
          capturedAt: Date.now()
        };
        return result;
      } catch (error) {
        try {
          readback.unmap();
        } catch {
          // Ignore unmap failures when mapAsync did not complete.
        }
        return {
          ok: false,
          reason: "gpu-aisthesis-feature-readback-failed",
          error: error instanceof Error ? error.message : String(error),
          source: GPU_AISTHESIS_FEATURE_TARGET,
          frame: renderer.gpuAisthesisFrame || 0,
          floatCount: GPU_AISTHESIS_FEATURE_FLOATS
        };
      } finally {
        if (typeof readback.destroy === "function") {
          readback.destroy();
        }
      }
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
      this.hudCompassDisplayState = resolveHudCompassDisplayState(this.hudCompassDisplayState, state, now);
      renderer.hudInfoUpload[8] = this.hudCompassDisplayState.heading;
      renderer.hudInfoUpload[9] = this.hudCompassDisplayState.usable;
      renderer.hudInfoUpload[10] = this.hudCompassDisplayState.yaw;
      renderer.hudInfoUpload[11] = this.hudCompassDisplayState.confidence;
      renderer.hudInfoUpload[12] = state.enemyCircleActive ? 1 : 0;
      renderer.hudInfoUpload[13] = clamp01(Number(state.enemyCircleX ?? 0.5));
      renderer.hudInfoUpload[14] = clamp01(Number(state.enemyCircleY ?? 0.5));
      renderer.hudInfoUpload[15] = Math.max(0.03, Math.min(0.16, Number(state.enemyCircleRadius ?? 0.08)));
      renderer.hudInfoUpload[16] = state.enemyCircleVisual ? 1 : 0;
      renderer.hudInfoUpload[17] = state.enemyCircleAudio ? 1 : 0;
      renderer.hudInfoUpload[18] = 0;
      renderer.hudInfoUpload[19] = 0;
      renderer.hudCellsUpload.fill(0);
      const cells = state.cells || [];
      const count = Math.min(HUD_CELL_COUNT, cells.length || 0);
      for (let index = 0; index < count; index += 1) {
        const raw = Number(cells[index] || 0);
        renderer.hudCellsUpload[index] = clamp01(raw > 1 ? raw / 255 : raw);
      }

      let rectCount = 0;
      if (renderer.hudRectBuffer && renderer.hudRectUpload) {
        renderer.hudRectUpload.fill(0);
        const rectangleValues = Array.isArray(state.rectangleValues) ? state.rectangleValues : [];
        if (rectangleValues.length > 0) {
          const floatCount = Math.min(HUD_RECT_FLOATS, rectangleValues.length);
          for (let index = 0; index < floatCount; index += 1) {
            renderer.hudRectUpload[index] = finiteGpuScalar(rectangleValues[index]);
          }
          rectCount = Math.min(HUD_RECT_COUNT, Math.floor(floatCount / HUD_RECT_STRIDE));
        } else {
          const rects = Array.isArray(state.rectangles) ? state.rectangles : [];
          rectCount = Math.min(HUD_RECT_COUNT, rects.length || 0);
          for (let index = 0; index < rectCount; index += 1) {
            writeHudRect(renderer.hudRectUpload, index, rects[index]);
          }
        }
      }
      renderer.hudInfoUpload[7] = rectCount;

      this.queue.writeBuffer(renderer.hudInfoBuffer, 0, renderer.hudInfoUpload);
      this.queue.writeBuffer(renderer.hudCellsBuffer, 0, renderer.hudCellsUpload);
      if (renderer.hudPanelBuffer && renderer.hudPanelUpload) {
        renderer.hudPanelUpload.fill(0);
        const panelValues = state.panelValues || state.panelCells || [];
        const panelCount = Math.min(HUD_PANEL_VALUE_COUNT, panelValues.length || 0);
        for (let index = 0; index < panelCount; index += 1) {
          renderer.hudPanelUpload[index] = clamp01(Number(panelValues[index] || 0));
        }
        this.queue.writeBuffer(renderer.hudPanelBuffer, 0, renderer.hudPanelUpload);
      }
      if (renderer.hudRectBuffer && renderer.hudRectUpload) {
        this.queue.writeBuffer(renderer.hudRectBuffer, 0, renderer.hudRectUpload);
      }
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

      if (this.gpuAisthesisState?.enabled && renderer.gpuAisthesisComputePipeline && renderer.gpuAisthesisComputeBindGroup) {
        const aisthesisPass = encoder.beginComputePass({ label: "doom.gpu.aisthesis.compute.pass" });
        aisthesisPass.setPipeline(renderer.gpuAisthesisComputePipeline);
        aisthesisPass.setBindGroup(0, renderer.gpuAisthesisComputeBindGroup);
        aisthesisPass.dispatchWorkgroups(1);
        aisthesisPass.end();
        renderer.gpuAisthesisFrame = renderer.frame;
      }

      if (this.gpuSpatialReasoningState?.enabled && renderer.gpuSpatialReasoningComputePipeline && renderer.gpuSpatialReasoningComputeBindGroup) {
        const spatialPass = encoder.beginComputePass({ label: "doom.gpu.spatial.reasoning.compute.pass" });
        spatialPass.setPipeline(renderer.gpuSpatialReasoningComputePipeline);
        spatialPass.setBindGroup(0, renderer.gpuSpatialReasoningComputeBindGroup);
        spatialPass.dispatchWorkgroups(1);
        spatialPass.end();
        renderer.gpuSpatialReasoningFrame = renderer.frame;
      }

      const hudActive = Boolean(renderer.hudOverlayEnabled && this.hudOverlayState?.enabled !== false && !this.usingCpuFallback);
      const now = performance?.now?.() || Date.now();
      const compositeDue = hudActive
        && (!renderer.hudCompositeReady || now - renderer.hudCompositeLastUpdateAt >= HUD_COMPOSITE_MIN_INTERVAL_MS);
      if (compositeDue) {
        renderer.hudPanelIndex = (renderer.hudPanelIndex + 1) % 2;
        const panelPass = encoder.beginComputePass({ label: "doom.hud.panel.compute.pass" });
        panelPass.setPipeline(renderer.panelComputePipeline);
        panelPass.setBindGroup(0, renderer.panelComputeBindGroups[renderer.hudPanelIndex]);
        panelPass.dispatchWorkgroups(
          Math.ceil(renderer.width / WORKGROUP_SIZE),
          Math.ceil(renderer.height / WORKGROUP_SIZE)
        );
        panelPass.end();

        renderer.hudCompositeIndex = (renderer.hudCompositeIndex + 1) % 2;
        const compositePass = encoder.beginRenderPass({
          label: "doom.hud.composite.pass",
          colorAttachments: [{
            view: renderer.hudCompositeTextures[renderer.hudCompositeIndex].createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: "clear",
            storeOp: "store"
          }]
        });
        compositePass.setPipeline(renderer.renderPipeline);
        compositePass.setBindGroup(0, renderer.renderBindGroups[renderer.hudPanelIndex]);
        compositePass.draw(3);
        compositePass.end();

        renderer.hudCompositeReady = true;
        renderer.hudCompositeLastUpdateAt = now;
        renderer.hudCompositeFrame = renderer.frame;
      }

      const colorAttachment = renderer.context.getCurrentTexture().createView();
      if (hudActive && renderer.hudCompositeReady) {
        const presentPass = encoder.beginRenderPass({
          label: "doom.hud.composite.present.pass",
          colorAttachments: [{
            view: colorAttachment,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: "clear",
            storeOp: "store"
          }]
        });
        presentPass.setPipeline(renderer.blitPipeline);
        presentPass.setBindGroup(0, renderer.hudCompositePresentBindGroups[renderer.hudCompositeIndex]);
        presentPass.draw(3);
        presentPass.end();
      } else {
        const renderPass = encoder.beginRenderPass({
          label: "doom.present.raw.pass",
          colorAttachments: [{
            view: colorAttachment,
            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: "clear",
            storeOp: "store"
          }]
        });
        renderPass.setPipeline(renderer.renderPipeline);
        renderPass.setBindGroup(0, renderer.renderBindGroups[renderer.hudPanelIndex]);
        renderPass.draw(3);
        renderPass.end();
      }

      this.queue.submit([encoder.finish()]);
      this.setFrameState(FRAME_TARGET, {
        width: renderer.width,
        height: renderer.height,
        format: "rgba8unorm-gpu-texture",
        frame: renderer.frame,
        zeroCopy: true
      });
      this.setDoomFrameTexture(renderer.frameTexture);
      if (renderer.hudCompositeReady) {
        this.setFrameState(HUD_COMPOSITE_TARGET, {
          width: renderer.width,
          height: renderer.height,
          format: `${renderer.format}-hud-composite`,
          frame: renderer.hudCompositeFrame,
          zeroCopy: true,
          overlayExcluded: false,
          sourceFrame: renderer.frame,
          maxFps: HUD_COMPOSITE_MAX_FPS
        });
        this.setHudCompositeTexture(renderer.hudCompositeTextures[renderer.hudCompositeIndex]);
      }
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

    setHudCompositeTexture(texture) {
      if (texture) {
        this.frameTextures.set(HUD_COMPOSITE_TARGET, texture);
      } else {
        this.frameTextures.delete(HUD_COMPOSITE_TARGET);
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

    getHudCompositeTexture() {
      return this.frameTextures.get(HUD_COMPOSITE_TARGET) || null;
    }

    getFramebufferTexture(target) {
      return this.frameTextures.get(target || FRAME_TARGET) || null;
    }

    getGpuAisthesisMaskTexture() {
      return this.renderer?.gpuAisthesisMaskTexture || null;
    }

    getFrameStateBuffer(target) {
      return this.frameStates.get(target || FRAME_TARGET) || null;
    }

    status() {
      const compositeReady = Boolean(this.renderer?.hudCompositeTextures?.length === 2 && this.renderer?.blitPipeline) && !this.usingCpuFallback;
      const compositeActive = Boolean(this.renderer?.hudCompositeReady && this.hudOverlayEnabled && this.hudOverlayState?.enabled !== false && !this.usingCpuFallback);
      const gpuAisthesisState = this.gpuAisthesisState || {};
      const gpuAisthesisStatus = Object.assign({}, gpuAisthesisState);
      delete gpuAisthesisStatus.matrixValues;
      const gpuSpatialReasoningState = this.gpuSpatialReasoningState || {};
      const gpuMemory = estimateGpuMemory(this.renderer, this.usingCpuFallback);
      const gpuAisthesisComputeReady = Boolean(this.renderer?.gpuAisthesisComputePipeline && this.renderer?.gpuAisthesisComputeBindGroup);
      const gpuSpatialComputeReady = Boolean(this.renderer?.gpuSpatialReasoningComputePipeline && this.renderer?.gpuSpatialReasoningComputeBindGroup);
      const deviceReady = Boolean(this.device && this.queue && !this.usingCpuFallback);
      const rawTextureReady = Boolean(this.renderer?.frameTexture && this.frameTextures.get(FRAME_TARGET) && deviceReady);
      const storageTextureReady = Boolean(this.renderer?.frameTexture && deviceReady);
      const gpuBufferReady = Boolean(
        this.renderer?.indexBuffer
        && this.renderer?.paletteBuffer
        && this.renderer?.hudCellsBuffer
        && this.renderer?.gpuAisthesisMatrixBuffer
        && this.renderer?.gpuSpatialOutputBuffer
        && deviceReady);
      const gpuAisthesisGpuComputeActive = Boolean(
        gpuAisthesisState?.enabled
        && gpuAisthesisComputeReady
        && rawTextureReady
        && gpuBufferReady
        && this.renderer?.gpuAisthesisFrame
        && deviceReady);
      const gpuSpatialGpuComputeActive = Boolean(
        gpuSpatialReasoningState?.enabled
        && gpuSpatialComputeReady
        && gpuBufferReady
        && this.renderer?.gpuSpatialReasoningFrame
        && deviceReady);
      const gpuAisthesisCpuPackingFallback = String(gpuAisthesisState?.matrixSource || "").toLowerCase() === "js-fallback-flatten";
      return {
        providerId: this.providerId,
        name: this.name,
        backend: this.usingCpuFallback ? "cpu-fallback" : this.backendName,
        supported: this.supported,
        initialized: this.initialized,
        adapterReady: Boolean(this.adapter),
        deviceReady,
        adapterPowerPreference: this.adapterRequestOptions?.powerPreference || WEBGPU_ADAPTER_POWER_PREFERENCE,
        adapterForceFallback: Boolean(this.adapterRequestOptions?.forceFallbackAdapter),
        adapterRequestFallbackUsed: Boolean(this.adapterRequestFallbackUsed),
        adapterRequestError: this.adapterRequestError || "",
        adapterInfo: this.adapterInfo,
        adapterSummary: this.adapterSummary,
        rendererInitialized: Boolean(this.renderer),
        zeroCopy: rawTextureReady,
        rawTextureReady,
        storageTextureReady,
        gpuBufferReady,
        gpuComputeReady: Boolean((gpuAisthesisComputeReady || gpuSpatialComputeReady) && deviceReady),
        gpuComputeActive: Boolean(gpuAisthesisGpuComputeActive || gpuSpatialGpuComputeActive),
        hudOverlayReady: Boolean(this.renderer?.hudInfoBuffer) && !this.usingCpuFallback,
        hudPanelOverlayReady: Boolean(this.renderer?.hudPanelBuffer && this.renderer?.hudPanelTextures?.length === 2) && !this.usingCpuFallback,
        hudPanelDoubleBuffered: Boolean(this.renderer?.hudPanelTextures?.length === 2) && !this.usingCpuFallback,
        hudCompositeReady: compositeReady,
        hudCompositeDoubleBuffered: Boolean(this.renderer?.hudCompositeTextures?.length === 2) && !this.usingCpuFallback,
        hudCompositeTarget: HUD_COMPOSITE_TARGET,
        rawFramebufferTarget: FRAME_TARGET,
        displayTarget: compositeReady ? HUD_COMPOSITE_TARGET : FRAME_TARGET,
        displaySource: compositeActive ? HUD_COMPOSITE_WIRE_NAME : RAW_FRAMEBUFFER_WIRE_NAME,
        rawCaptureTarget: FRAME_TARGET,
        analysisCaptureSource: RAW_FRAMEBUFFER_WIRE_NAME,
        analysisOverlayExcluded: true,
        cssOverlayMode: compositeActive ? "reduced" : "full",
        hudCompositeMaxFps: HUD_COMPOSITE_MAX_FPS,
        hudCompositeFrame: this.renderer?.hudCompositeFrame || 0,
        hudCompositeActive: compositeActive,
        hudOverlayEnabled: this.hudOverlayEnabled,
        hudOverlayActive: Boolean(this.renderer?.hudInfoBuffer && this.hudOverlayEnabled && this.hudOverlayState?.enabled !== false && !this.usingCpuFallback),
        hudContractVersion: Number(this.hudOverlayState?.contractVersion || 0),
        hudContractName: this.hudOverlayState?.contractName || "none",
        hudRectSource: this.hudOverlayState?.rectangleSource || "none",
        hudRectFloatCount: Number(this.hudOverlayState?.rectangleFloatCount || 0),
        hudRectCount: Number(this.hudOverlayState?.rectangleCount || 0),
        hudRectangleLayout: this.hudOverlayState?.rectangleLayout || `rect${HUD_RECT_STRIDE}:${HUD_RECT_FIELDS.join(",")}`,
        hudRectangleBufferLayout: this.hudOverlayState?.rectangleBufferLayout || null,
        hudPanelBufferLayout: this.hudOverlayState?.panelBufferLayout || null,
        hudRawFrameTarget: this.hudOverlayState?.rawFrameTarget || null,
        hudDisplayFrameTarget: this.hudOverlayState?.displayFrameTarget || null,
        hudFrameToken: this.hudOverlayState?.frameToken || null,
        hudReadbackPolicy: this.hudOverlayState?.readbackPolicy || "none",
        hudReadback: this.hudOverlayState?.readback || null,
        hudAnalysisCaptureSource: this.hudOverlayState?.analysisCaptureSource || RAW_FRAMEBUFFER_WIRE_NAME,
        hudFeatureFlags: this.hudOverlayState?.featureFlags || [],
        gpuMemory,
        estimatedGpuMemoryBytes: gpuMemory.totalBytes,
        estimatedGpuMemoryMB: gpuMemory.totalMB,
        gpuAisthesis: Object.assign({}, gpuAisthesisStatus, {
          infoBufferReady: Boolean(this.renderer?.gpuAisthesisInfoBuffer),
          infoFloatCount: GPU_AISTHESIS_INFO_FLOATS,
          computeReady: gpuAisthesisComputeReady,
          gpuComputeActive: gpuAisthesisGpuComputeActive,
          cpuPackingFallback: gpuAisthesisCpuPackingFallback,
          matrixUploadSource: gpuAisthesisState?.matrixSource || "none",
          featureBufferReady: Boolean(this.renderer?.gpuAisthesisFeatureBuffer),
          featureReadbackReady: Boolean(this.renderer?.gpuAisthesisFeatureBuffer && this.device && !this.usingCpuFallback),
          featureFloatCount: GPU_AISTHESIS_FEATURE_FLOATS,
          featureFrame: this.renderer?.gpuAisthesisFrame || 0,
          heatCellsGpuWritable: Boolean(this.renderer?.hudCellsBuffer && this.renderer?.gpuAisthesisComputeBindGroup && !this.usingCpuFallback),
          heatCellsTarget: HUD_CELLS_TARGET,
          maskTextureReady: Boolean(this.renderer?.gpuAisthesisMaskTexture && this.renderer?.gpuAisthesisComputeBindGroup && !this.usingCpuFallback),
          maskTextureTarget: gpuAisthesisState?.maskTextureTarget || GPU_AISTHESIS_MASK_TARGET,
          maskTexture: gpuAisthesisState?.maskTexture || normalizeGpuTextureTarget(null, "AisthesisMask", GPU_AISTHESIS_MASK_TARGET, GPU_AISTHESIS_MASK_WIRE_NAME, "rgba8unorm", HUD_GRID_SIZE, HUD_GRID_SIZE, "analysis-mask", true),
          maskTextureLayout: gpuAisthesisState?.maskTextureLayout || GPU_AISTHESIS_MASK_LAYOUT,
          zeroCopyReady: Boolean(gpuAisthesisState?.enabled && rawTextureReady),
          storageTextureReady,
          rawTextureReady,
          gpuBufferReady,
          lastSummary: this.gpuAisthesisLastSummary
        }),
        gpuSpatialReasoning: Object.assign({}, gpuSpatialReasoningState, {
          infoBufferReady: Boolean(this.renderer?.gpuSpatialInfoBuffer),
          infoFloatCount: GPU_SPATIAL_INFO_FLOATS,
          computeReady: gpuSpatialComputeReady,
          gpuComputeActive: gpuSpatialGpuComputeActive,
          matrixUploadSource: gpuAisthesisState?.matrixSource || "none",
          cpuPackingFallback: gpuAisthesisCpuPackingFallback,
          outputBufferReady: Boolean(this.renderer?.gpuSpatialOutputBuffer),
          outputReadbackReady: Boolean(this.renderer?.gpuSpatialOutputBuffer && this.device && !this.usingCpuFallback),
          outputFloatCount: GPU_SPATIAL_OUTPUT_FLOATS,
          outputFrame: this.renderer?.gpuSpatialReasoningFrame || 0,
          featureInputReady: Boolean(this.renderer?.gpuAisthesisFeatureBuffer),
          matrixInputReady: Boolean(this.renderer?.gpuAisthesisMatrixBuffer),
          maskTextureInputReady: Boolean(this.renderer?.gpuAisthesisMaskTexture),
          rawTextureInputReady: rawTextureReady,
          gpuBufferReady,
          aisthesisFeatureFrame: this.renderer?.gpuAisthesisFrame || 0,
          lastSummary: this.gpuSpatialReasoningLastSummary
        }),
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

  function normalizeHudCompassHeading(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return null;
    }

    return ((number % 360) + 360) % 360;
  }

  function shortestHudCompassDelta(from, to) {
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      return 0;
    }

    return ((((to - from) % 360) + 540) % 360) - 180;
  }

  function smoothHudCompassScalar(previous, target, alpha) {
    const current = Number.isFinite(previous) ? previous : target;
    return current + (target - current) * Math.max(0, Math.min(1, alpha));
  }

  function resolveHudCompassDisplayState(previousState, hudState, nowSeconds) {
    const previous = previousState || {};
    const nowMs = Number(nowSeconds || 0) * 1000;
    const rawHeading = normalizeHudCompassHeading(hudState?.compassHeading);
    const previousHeading = normalizeHudCompassHeading(previous.heading);
    const rawYaw = Math.max(-90, Math.min(90, Number(hudState?.compassYaw ?? previous.yaw ?? 0)));
    const rawConfidence = clamp01(Number(hudState?.compassConfidence ?? 0));
    const rawUsable = rawHeading !== null && Boolean(hudState?.compassUsable) && rawConfidence >= 0.02;
    const dt = previous.updatedAt > 0 ? Math.max(16, Math.min(180, nowMs - previous.updatedAt)) : 33;
    const riseAlpha = 1 - Math.pow(0.5, dt / 100);
    const decayAlpha = 1 - Math.pow(0.5, dt / 660);
    const holdUntil = rawUsable
      ? nowMs + 1100
      : Number(previous.holdUntil || 0);
    const held = !rawUsable && nowMs < holdUntil;
    const targetHeading = rawHeading !== null ? rawHeading : previousHeading;
    const heading = targetHeading === null
      ? 0
      : (previousHeading === null
        ? targetHeading
        : normalizeHudCompassHeading(previousHeading + shortestHudCompassDelta(previousHeading, targetHeading) * (rawUsable ? riseAlpha : Math.max(decayAlpha * 0.72, 0.035))));
    const confidenceTarget = rawUsable
      ? Math.max(rawConfidence, 0.34)
      : (held ? Math.max(rawConfidence * 0.7, Number(previous.confidence || 0) * 0.62, 0.14) : 0);
    const usableTarget = rawUsable
      ? 1
      : (held ? Math.max(Number(previous.usable || 0) * 0.70, 0.22) : 0);
    const yaw = smoothHudCompassScalar(Number(previous.yaw || 0), rawYaw, rawUsable ? riseAlpha : decayAlpha);
    const confidence = smoothHudCompassScalar(Number(previous.confidence || 0), confidenceTarget, rawUsable ? riseAlpha : decayAlpha);
    const usable = smoothHudCompassScalar(Number(previous.usable || 0), usableTarget, rawUsable ? riseAlpha : decayAlpha);

    return {
      heading: heading ?? 0,
      yaw: Math.max(-90, Math.min(90, yaw)),
      confidence: clamp01(confidence),
      usable: clamp01(usable),
      holdUntil,
      updatedAt: nowMs
    };
  }

  function textureBytes(width, height, count = 1, bytesPerPixel = 4) {
    const safeWidth = Math.max(0, Math.floor(Number(width) || 0));
    const safeHeight = Math.max(0, Math.floor(Number(height) || 0));
    const safeCount = Math.max(0, Math.floor(Number(count) || 0));
    return safeWidth * safeHeight * safeCount * bytesPerPixel;
  }

  function mb(bytes) {
    const value = Number(bytes) || 0;
    return Math.round((value / (1024 * 1024)) * 100) / 100;
  }

  function estimateGpuMemory(renderer, usingCpuFallback) {
    if (!renderer || usingCpuFallback) {
      return {
        active: false,
        totalBytes: 0,
        totalMB: 0,
        buffersBytes: 0,
        texturesBytes: 0,
        framebufferBytes: 0,
        hudBytes: 0,
        aisthesisBytes: 0,
        spatialBytes: 0,
        scope: "doom-known-webgpu-allocations",
        note: usingCpuFallback ? "cpu-fallback" : "renderer-unavailable"
      };
    }

    const width = renderer.width || 0;
    const height = renderer.height || 0;
    const frameBytes = textureBytes(width, height);
    const hudPanelTextureBytes = textureBytes(width, height, renderer.hudPanelTextures?.length || 0);
    const hudCompositeTextureBytes = textureBytes(width, height, renderer.hudCompositeTextures?.length || 0);
    const maskTextureBytes = textureBytes(HUD_GRID_SIZE, HUD_GRID_SIZE);
    const coreBuffersBytes = ((renderer.framePixels || 0) * 4)
      + (256 * 16)
      + 16
      + (HUD_UNIFORM_FLOATS * 4)
      + (HUD_CELL_COUNT * 4)
      + (HUD_PANEL_VALUE_COUNT * 4)
      + (HUD_RECT_FLOATS * 4);
    const aisthesisBuffersBytes = (GPU_AISTHESIS_INFO_FLOATS * 4)
      + (GPU_AISTHESIS_MATRIX_FLOATS * 4)
      + (GPU_AISTHESIS_FEATURE_FLOATS * 4);
    const spatialBuffersBytes = (GPU_SPATIAL_INFO_FLOATS * 4)
      + (GPU_SPATIAL_OUTPUT_FLOATS * 4);
    const buffersBytes = coreBuffersBytes + aisthesisBuffersBytes + spatialBuffersBytes;
    const texturesBytes = frameBytes + hudPanelTextureBytes + hudCompositeTextureBytes + maskTextureBytes;
    const hudBytes = (HUD_UNIFORM_FLOATS * 4)
      + (HUD_CELL_COUNT * 4)
      + (HUD_PANEL_VALUE_COUNT * 4)
      + (HUD_RECT_FLOATS * 4)
      + hudPanelTextureBytes
      + hudCompositeTextureBytes;
    const aisthesisBytes = aisthesisBuffersBytes + maskTextureBytes;
    const spatialBytes = spatialBuffersBytes;
    const totalBytes = buffersBytes + texturesBytes;

    return {
      active: true,
      totalBytes,
      totalMB: mb(totalBytes),
      buffersBytes,
      buffersMB: mb(buffersBytes),
      texturesBytes,
      texturesMB: mb(texturesBytes),
      framebufferBytes: frameBytes,
      framebufferMB: mb(frameBytes),
      hudBytes,
      hudMB: mb(hudBytes),
      aisthesisBytes,
      aisthesisMB: mb(aisthesisBytes),
      spatialBytes,
      spatialMB: mb(spatialBytes),
      hudCompositeBytes: hudCompositeTextureBytes,
      hudCompositeMB: mb(hudCompositeTextureBytes),
      zeroCopyReady: Boolean(renderer.frameTexture),
      scope: "doom-known-webgpu-allocations",
      note: "provider-known-framebuffer-hud-aisthesis-only"
    };
  }

  function clampUnit(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.max(0, Math.min(1, number));
  }

  function finiteGpuScalar(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return 0;
    }

    return number;
  }

  function normalizeGpuFrameTarget(target, fallbackKind, fallbackTarget, fallbackWireName, fallbackUsage, fallbackHudExcluded) {
    const source = target && typeof target === "object" ? target : {};
    const kind = String(source.kind || source.Kind || fallbackKind || "");
    const providerTarget = String(source.target || source.Target || fallbackTarget || "");
    const wireName = String(source.wireName || source.WireName || fallbackWireName || "");
    return {
      kind,
      target: providerTarget,
      wireName,
      usage: String(source.usage || source.Usage || fallbackUsage || ""),
      hudExcluded: Boolean(source.hudExcluded ?? source.HudExcluded ?? fallbackHudExcluded),
      summary: `${kind || "target"}:${providerTarget || wireName}`
    };
  }

  function normalizeGpuTextureTarget(target, fallbackKind, fallbackTarget, fallbackWireName, fallbackFormat, fallbackWidth, fallbackHeight, fallbackUsage, fallbackHudExcluded) {
    const source = target && typeof target === "object" ? target : {};
    const kind = String(source.kind || source.Kind || fallbackKind || "");
    const providerTarget = String(source.target || source.Target || fallbackTarget || "");
    const wireName = String(source.wireName || source.WireName || fallbackWireName || "");
    const width = Math.max(0, Math.floor(Number(source.width ?? source.Width ?? fallbackWidth ?? 0) || 0));
    const height = Math.max(0, Math.floor(Number(source.height ?? source.Height ?? fallbackHeight ?? 0) || 0));
    const format = String(source.format || source.Format || fallbackFormat || "rgba8unorm");
    return {
      kind,
      target: providerTarget,
      wireName,
      format,
      width,
      height,
      usage: String(source.usage || source.Usage || fallbackUsage || ""),
      hudExcluded: Boolean(source.hudExcluded ?? source.HudExcluded ?? fallbackHudExcluded),
      summary: `${kind || "texture"}:${providerTarget || wireName}:${width}x${height}:${format}`
    };
  }

  function normalizeGpuReadbackPolicy(policy, fallbackWireName) {
    const source = policy && typeof policy === "object" ? policy : {};
    const wireName = String(source.wireName || source.WireName || fallbackWireName || "none").toLowerCase();
    const kind = String(source.kind || source.Kind || (
      wireName === "debug-only" ? "DebugOnly" : (wireName === "runtime-summary" ? "RuntimeSummary" : "None")));
    return {
      kind,
      wireName,
      allowsSummary: Boolean(source.allowsSummary ?? source.AllowsSummary ?? (wireName === "debug-only" || wireName === "runtime-summary")),
      allowsFullReadback: Boolean(source.allowsFullReadback ?? source.AllowsFullReadback ?? wireName === "debug-only"),
      debugOnly: Boolean(source.debugOnly ?? source.DebugOnly ?? wireName === "debug-only"),
      summary: `${kind}:${wireName}`
    };
  }

  function normalizeGpuFrameToken(token, rawTarget, hudTarget, frameId, phase) {
    const source = token && typeof token === "object" ? token : {};
    const resolvedFrameId = Number(source.frameId ?? source.FrameId ?? frameId ?? 0) || 0;
    return {
      frameId: resolvedFrameId,
      rawTarget: String(source.rawTarget || source.RawTarget || rawTarget || FRAME_TARGET),
      hudTarget: String(source.hudTarget || source.HudTarget || hudTarget || HUD_COMPOSITE_TARGET),
      phase: String(source.phase || source.Phase || phase || "provider"),
      providerStamped: Boolean(source.providerStamped ?? source.ProviderStamped ?? resolvedFrameId > 0)
    };
  }

  function normalizeGpuFlatBufferLayout(layout, fallbackName, fallbackStride, fallbackMaxItems, fallbackFields, fallbackMaxFloats) {
    const source = layout && typeof layout === "object" ? layout : {};
    const fields = source.fields || source.Fields || fallbackFields || [];
    const maxItems = Number(source.maxItems ?? source.MaxItems ?? fallbackMaxItems ?? 0) || 0;
    const stride = Number(source.stride ?? source.Stride ?? fallbackStride ?? 0) || 0;
    const explicitMaxFloats = Number(source.maxFloats ?? source.MaxFloats ?? fallbackMaxFloats ?? 0) || 0;
    const maxFloats = explicitMaxFloats > 0
      ? explicitMaxFloats
      : (stride > 0 && maxItems > 0 ? stride * maxItems : 0);
    const name = String(source.name || source.Name || fallbackName || "layout");
    const version = Number(source.version ?? source.Version ?? 1) || 1;
    return {
      name,
      version,
      stride,
      maxItems,
      maxFloats,
      fields: Array.isArray(fields) ? fields.map(value => String(value)).slice(0, 32) : [],
      summary: String(source.summary || source.Summary || `${name} v${version} stride${stride} max${maxItems}`)
    };
  }

  function normalizeGpuStringList(values, limit = HUD_LABEL_COUNT) {
    return Array.isArray(values)
      ? values.map(value => String(value)).filter(Boolean).slice(0, Math.max(0, limit))
      : [];
  }

  function matrixKindsFromMatrices(matrices) {
    return Array.isArray(matrices)
      ? matrices
        .map(matrix => String(matrix?.kind || matrix?.Kind || "").trim())
        .filter(Boolean)
        .slice(0, HUD_LABEL_COUNT)
      : [];
  }

  function summarizeMatrixKinds(kinds) {
    return Array.isArray(kinds) && kinds.length > 0
      ? `matrices=${kinds.join("+")}`
      : "matrices=none";
  }

  function roundGpuFeature(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return 0;
    }

    return Math.round(number * 10000) / 10000;
  }

  function gpuAisthesisReadbackUnavailable(reason, extra = {}) {
    return {
      ok: false,
      reason,
      source: GPU_AISTHESIS_FEATURE_TARGET,
      frame: 0,
      floatCount: GPU_AISTHESIS_FEATURE_FLOATS,
      values: [],
      summary: null,
      ...extra
    };
  }

  function gpuSpatialReasoningReadbackUnavailable(reason, extra = {}) {
    return {
      ok: false,
      reason,
      source: GPU_SPATIAL_OUTPUT_TARGET,
      frame: 0,
      floatCount: GPU_SPATIAL_OUTPUT_FLOATS,
      values: [],
      summary: null,
      ...extra
    };
  }

  function summarizeGpuAisthesisFeatures(values) {
    const read = index => Number(values?.[index] || 0);
    return {
      enabled: read(0) >= 0.5,
      lumaAverage: read(1),
      redMaximum: read(2),
      edgeAverage: read(3),
      redMass: read(4),
      matrixCount: read(6),
      matrixFloatCount: read(7),
      outputCode: read(8),
      frame: read(9),
      redCentroid: {
        x: read(10),
        y: read(11)
      },
      firstMatrixValue: read(12),
      visionHeatmap: read(13) >= 0.5,
      edgeDetect: read(14) >= 0.5,
      redPanelDetect: read(15) >= 0.5,
      cornerMaximum: read(16),
      cornerAverage: read(17),
      enemyDirection: read(18) >= 0.5,
      projectileFlow: read(19) >= 0.5
    };
  }

  function summarizeGpuSpatialReasoningOutput(values) {
    const read = index => Number(values?.[index] || 0);
    return {
      enabled: read(0) >= 0.5,
      routeScore: read(1),
      routeCost: read(2),
      threatScore: read(3),
      zoeScore: read(4),
      ctgScore: read(5),
      recommendedYaw: read(6),
      frame: read(7),
      matrixCount: read(8),
      matrixFloatCount: read(9),
      lumaAverage: read(10),
      redMaximum: read(11),
      edgeAverage: read(12),
      cornerMaximum: read(13),
      cornerAverage: read(14),
      outputCode: read(15),
      maskHeat: read(20),
      maskRed: read(21),
      maskEdge: read(22),
      maskCorner: read(23)
    };
  }

  function gpuSpatialReasoningOutputCode(output) {
    const text = String(output || "summary").toLowerCase();
    if (text.includes("action")) {
      return 3;
    }

    if (text.includes("vector")) {
      return 2;
    }

    if (text.includes("summary")) {
      return 1;
    }

    return 0;
  }

  function gpuAisthesisOutputCode(output) {
    const text = String(output || "composite").toLowerCase();
    if (text.includes("mask")) {
      return 3;
    }

    if (text.includes("vector")) {
      return 2;
    }

    if (text.includes("heatmap")) {
      return 1;
    }

    return 0;
  }

  function normalizeCssPercent(value, fallback = 0) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }

    return Math.max(0, Math.min(1, number > 1 ? number / 100 : number));
  }

  function hasOwnAny(source, names) {
    if (!source || typeof source !== "object") {
      return false;
    }

    return names.some(name => Object.prototype.hasOwnProperty.call(source, name));
  }

  function enemyYawToScreenX(circle, visual, audio, confidence) {
    let yaw = Number(circle.yaw ?? circle.Yaw ?? circle.bearing ?? circle.Bearing ?? 0);
    if (!Number.isFinite(yaw)) {
      yaw = 0;
    }

    if (Math.abs(yaw) < 0.01) {
      const direction = String(circle.direction || circle.Direction || "").toLowerCase();
      if (direction.includes("left")) {
        yaw = -42;
      } else if (direction.includes("right")) {
        yaw = 42;
      }
    }

    const audioOnly = audio && !visual;
    const fieldOfView = audioOnly ? 115 : 74;
    const maxOffset = audioOnly ? 0.43 : 0.39;
    const confidenceBias = audioOnly ? 0.84 + confidence * 0.16 : 0.92 + confidence * 0.08;
    return clamp01(0.5 + Math.max(-1, Math.min(1, yaw / fieldOfView)) * maxOffset * confidenceBias);
  }

  function gpuMatrixKindCode(kind) {
    const text = String(kind || "").toLowerCase();
    if (text.includes("topos")) {
      return 1;
    }
    if (text.includes("route")) {
      return 2;
    }
    if (text.includes("threat") || text.includes("combat")) {
      return 3;
    }
    if (text.includes("zoe") || text.includes("veto")) {
      return 4;
    }
    if (text.includes("ctg") || text.includes("state")) {
      return 5;
    }
    return 0;
  }

  function flattenGpuAisthesisMatrices(matrices, stateVector) {
    const output = [];
    let matrixCount = 0;
    const sourceMatrices = Array.isArray(matrices) ? matrices : [];
    for (let index = 0; index < sourceMatrices.length && output.length < GPU_AISTHESIS_MATRIX_FLOATS - 4; index += 1) {
      const matrix = sourceMatrices[index] || {};
      const values = Array.isArray(matrix.values || matrix.Values) ? (matrix.values || matrix.Values) : [];
      const rows = Math.max(1, Math.min(GPU_STATE_VECTOR_FLOATS, Number(matrix.rows ?? matrix.Rows ?? 1) || 1));
      const columns = Math.max(1, Math.min(GPU_STATE_VECTOR_FLOATS, Number(matrix.columns ?? matrix.Columns ?? values.length ?? 1) || 1));
      const valueCount = Math.min(values.length, rows * columns, GPU_AISTHESIS_MATRIX_FLOATS - output.length - 4);
      output.push(gpuMatrixKindCode(matrix.kind || matrix.Kind), rows, columns, valueCount);
      for (let valueIndex = 0; valueIndex < valueCount; valueIndex += 1) {
        output.push(clamp01(Number(values[valueIndex] || 0)));
      }
      matrixCount += 1;
    }

    if (matrixCount <= 0 && Array.isArray(stateVector) && stateVector.length > 0 && output.length < GPU_AISTHESIS_MATRIX_FLOATS - 4) {
      const valueCount = Math.min(stateVector.length, GPU_STATE_VECTOR_FLOATS, GPU_AISTHESIS_MATRIX_FLOATS - output.length - 4);
      output.push(5, 1, GPU_STATE_VECTOR_FLOATS, valueCount);
      for (let index = 0; index < valueCount; index += 1) {
        output.push(clamp01(Number(stateVector[index] || 0)));
      }
      matrixCount = 1;
    }

    return { matrixCount, values: output };
  }

  function parseHudRectColor(rect) {
    const kind = String(rect?.kind || rect?.Kind || rect?.type || rect?.Type || "diagnostic").toLowerCase();
    if (Array.isArray(rect?.color)) {
      return [
        clampUnit(rect.color[0]),
        clampUnit(rect.color[1]),
        clampUnit(rect.color[2])
      ];
    }

    if (Array.isArray(rect?.Color)) {
      return [
        clampUnit(rect.Color[0]),
        clampUnit(rect.Color[1]),
        clampUnit(rect.Color[2])
      ];
    }

    if (kind.includes("enemy") || kind.includes("combat") || kind.includes("zoe")) {
      return [1.0, 0.14, 0.10];
    }

    if (kind.includes("door")) {
      return [1.0, 0.76, 0.16];
    }

    if (kind.includes("bridge")) {
      return [0.18, 0.95, 0.68];
    }

    if (kind.includes("corner") || kind.includes("wall")) {
      return [1.0, 0.40, 0.10];
    }

    return [0.20, 0.82, 1.0];
  }

  function normalizeHudEnemyCircle(circle) {
    if (!circle || typeof circle !== "object") {
      return {
        source: null,
        active: 0,
        x: 0.5,
        y: 0.5,
        radius: 0.08,
        visual: 0,
        audio: 0
      };
    }

    const confidence = clampUnit(circle.confidence ?? circle.Confidence ?? circle.score ?? circle.Score ?? 0);
    const active = Boolean(circle.active ?? circle.Active) && confidence >= 0.24;
    const type = String(circle.type || circle.Type || "").toLowerCase();
    const visual = type === "visual" || type === "av" ? 1 : 0;
    const audio = type === "audio" || type === "av" ? 1 : 0;
    const hasExplicitCenter = hasOwnAny(circle, ["centerX", "CenterX", "screenX", "ScreenX", "normalizedX", "NormalizedX"]);
    const hasExplicitBox = hasOwnAny(circle, ["left", "Left", "x", "X"]);
    const width = normalizeCssPercent(circle.width ?? circle.Width ?? (audio && !visual ? 21 : 12));
    const height = normalizeCssPercent(circle.height ?? circle.Height ?? (audio && !visual ? 23 : 14));
    const x = hasExplicitCenter
      ? normalizeCssPercent(circle.centerX ?? circle.CenterX ?? circle.screenX ?? circle.ScreenX ?? circle.normalizedX ?? circle.NormalizedX, 0.5)
      : (hasExplicitBox
        ? clamp01(normalizeCssPercent(circle.left ?? circle.Left ?? circle.x ?? circle.X ?? 42) + width * 0.5)
        : enemyYawToScreenX(circle, visual, audio, confidence));
    const y = hasOwnAny(circle, ["centerY", "CenterY", "screenY", "ScreenY", "normalizedY", "NormalizedY"])
      ? normalizeCssPercent(circle.centerY ?? circle.CenterY ?? circle.screenY ?? circle.ScreenY ?? circle.normalizedY ?? circle.NormalizedY, audio && !visual ? 0.38 : 0.36)
      : (hasOwnAny(circle, ["top", "Top", "y", "Y"])
        ? clamp01(normalizeCssPercent(circle.top ?? circle.Top ?? circle.y ?? circle.Y ?? (audio && !visual ? 34 : 31)) + height * 0.5)
        : clamp01(audio && !visual ? 0.38 : 0.36));
    const radius = Math.max(0.03, Math.min(0.16, Math.max(width, height) * 0.5));

    return {
      source: circle,
      active: active ? 1 : 0,
      x,
      y,
      radius,
      visual,
      audio
    };
  }

  function writeHudRect(target, index, rect) {
    if (!target || !rect || typeof rect !== "object") {
      return;
    }

    const base = index * 8;
    const left = normalizeCssPercent(rect.left ?? rect.Left ?? rect.x ?? rect.X ?? 0);
    const top = normalizeCssPercent(rect.top ?? rect.Top ?? rect.y ?? rect.Y ?? 0);
    const width = normalizeCssPercent(rect.width ?? rect.Width ?? rect.w ?? rect.W ?? 0);
    const height = normalizeCssPercent(rect.height ?? rect.Height ?? rect.h ?? rect.H ?? 0);
    const right = Math.max(left, Math.min(1, left + width));
    const bottom = Math.max(top, Math.min(1, top + height));
    const color = parseHudRectColor(rect);
    const score = clampUnit(rect.score ?? rect.Score ?? rect.confidence ?? rect.Confidence ?? 1);
    const alpha = clampUnit(rect.alpha ?? rect.Alpha ?? (0.62 + score * 0.28));

    target[base] = left;
    target[base + 1] = top;
    target[base + 2] = right;
    target[base + 3] = bottom;
    target[base + 4] = color[0];
    target[base + 5] = color[1];
    target[base + 6] = color[2];
    target[base + 7] = alpha;
  }

  const existingProvider = window.WebGpuComputeProvider;
  if (!existingProvider || typeof existingProvider.initializeDoomRenderer !== "function") {
    window.WebGpuComputeProvider = new BrowserWebGpuComputeProvider();
  }

  window.webGpuComputeProvider = window.WebGpuComputeProvider;
  window.aikernelWebGpuComputeProvider = window.WebGpuComputeProvider;
})();
