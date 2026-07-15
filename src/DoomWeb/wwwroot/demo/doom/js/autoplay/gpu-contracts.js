(function () {
  "use strict";

  const RAW_FRAMEBUFFER_TARGET = "doom";
  const RAW_FRAMEBUFFER_WIRE_NAME = "raw-framebuffer";
  const HUD_COMPOSITE_TARGET = "doom-hud";
  const HUD_COMPOSITE_WIRE_NAME = "hud-composite-offscreen";
  const DISPLAY_CANVAS_FALLBACK_TARGET = "display-canvas";
  const DISPLAY_CANVAS_FALLBACK_WIRE_NAME = "display-canvas-fallback";
  const HUD_CELLS_TARGET = "doom.hud.cells9x9";
  const HUD_PANEL_VALUES_TARGET = "doom.hud.panel.values";
  const HUD_PRIORITY_RECTS_TARGET = "doom.hud.priority.rects";
  const AISTHESIS_INFO_TARGET = "doom.gpu.aisthesis.info";
  const AISTHESIS_MATRIX_TARGET = "doom.gpu.aisthesis.matrix";
  const AISTHESIS_FEATURE_TARGET = "doom.gpu.aisthesis.features";
  const AISTHESIS_MASK_TARGET = "doom.gpu.aisthesis.mask9x9";
  const AISTHESIS_MASK_WIRE_NAME = "gpu-aisthesis-mask9x9";
  const AISTHESIS_MASK_LAYOUT = "mask9x9:heat,red,edge,corner";
  const SPATIAL_INFO_TARGET = "doom.gpu.spatial.info";
  const SPATIAL_OUTPUT_TARGET = "doom.gpu.spatial.reasoning";
  const HUD_GRID_SIZE = 9;
  const HUD_CELL_COUNT = HUD_GRID_SIZE * HUD_GRID_SIZE;
  const HUD_UNIFORM_FLOAT_COUNT = 36;
  const HUD_PANEL_VALUE_COUNT = 16;
  const HUD_RECT_COUNT = 16;
  const HUD_LABEL_COUNT = 16;
  const HUD_RECT_STRIDE = 8;
  const HUD_RECT_FLOAT_COUNT = HUD_RECT_COUNT * HUD_RECT_STRIDE;
  const AISTHESIS_INFO_FLOAT_COUNT = 16;
  const AISTHESIS_MATRIX_FLOAT_COUNT = 512;
  const AISTHESIS_FEATURE_FLOAT_COUNT = 32;
  const SPATIAL_INFO_FLOAT_COUNT = 16;
  const SPATIAL_OUTPUT_FLOAT_COUNT = 32;
  const STATE_VECTOR_FLOAT_COUNT = 16;
  const HUD_RECT_FIELDS = Object.freeze(["left", "top", "right", "bottom", "r", "g", "b", "alpha"]);
  const HUD_PANEL_BORDER_PIXELS = 1;
  const HUD_PANEL_RECTS = Object.freeze({
    title: Object.freeze({ left: 0.020, top: 0.662, right: 0.985, bottom: 0.692 }),
    cards: Object.freeze({
      aisthesis: Object.freeze({ left: 0.020, top: 0.700, right: 0.255, bottom: 0.970 }),
      noesis: Object.freeze({ left: 0.270, top: 0.700, right: 0.500, bottom: 0.830 }),
      krisis: Object.freeze({ left: 0.515, top: 0.700, right: 0.745, bottom: 0.830 }),
      kinesis: Object.freeze({ left: 0.760, top: 0.700, right: 0.985, bottom: 0.830 }),
      route: Object.freeze({ left: 0.270, top: 0.845, right: 0.500, bottom: 0.970 }),
      combat: Object.freeze({ left: 0.515, top: 0.845, right: 0.745, bottom: 0.970 }),
      zoe: Object.freeze({ left: 0.760, top: 0.845, right: 0.985, bottom: 0.970 })
    })
  });
  const HUD_PANEL_FIELDS = Object.freeze([
    "aisthesis",
    "noesis",
    "krisis",
    "kinesis",
    "route",
    "loop",
    "door",
    "combat",
    "zoe",
    "logos",
    "pathos",
    "ethos",
    "wall",
    "barrel",
    "alignment",
    "use"
  ]);
  const STATE_VECTOR_FIELDS = Object.freeze(["route", "loop", "door", "combat", "zoe", "logos", "pathos", "ethos", "topology", "use"]);
  const SPATIAL_OUTPUT_FIELDS = Object.freeze([
    "enabled",
    "route",
    "cost",
    "threat",
    "zoe",
    "ctg",
    "yaw",
    "frame",
    "matrixCount",
    "matrixFloats",
    "luma",
    "red",
    "edge",
    "corner",
    "cornerAverage",
    "outputCode",
    "reserved16",
    "reserved17",
    "reserved18",
    "reserved19",
    "maskHeat",
    "maskRed",
    "maskEdge",
    "maskCorner"
  ]);

  function frameTarget(kind, target, wireName, usage, hudExcluded) {
    return {
      kind,
      target,
      wireName,
      usage,
      hudExcluded: Boolean(hudExcluded)
    };
  }

  function rawFramebufferTarget(usage = "analysis") {
    return frameTarget("RawFramebuffer", RAW_FRAMEBUFFER_TARGET, RAW_FRAMEBUFFER_WIRE_NAME, usage, true);
  }

  function hudCompositeTarget(usage = "display") {
    return frameTarget("HudCompositeOffscreen", HUD_COMPOSITE_TARGET, HUD_COMPOSITE_WIRE_NAME, usage, false);
  }

  function displayCanvasFallbackTarget(usage = "debug") {
    return frameTarget("DisplayCanvasFallback", DISPLAY_CANVAS_FALLBACK_TARGET, DISPLAY_CANVAS_FALLBACK_WIRE_NAME, usage, false);
  }

  function frameToken(phase = "dto-fallback", rawTarget = RAW_FRAMEBUFFER_TARGET, hudTarget = HUD_COMPOSITE_TARGET) {
    return {
      frameId: 0,
      rawTarget,
      hudTarget,
      phase,
      providerStamped: false
    };
  }

  function aisthesisMaskTextureTarget() {
    return {
      kind: "AisthesisMask",
      target: AISTHESIS_MASK_TARGET,
      wireName: AISTHESIS_MASK_WIRE_NAME,
      format: "rgba8unorm",
      width: 9,
      height: 9,
      usage: "analysis-mask",
      hudExcluded: true
    };
  }

  self.AIKernelDoomGpuContracts = Object.freeze({
    rawFramebufferTarget: RAW_FRAMEBUFFER_TARGET,
    rawFramebufferWireName: RAW_FRAMEBUFFER_WIRE_NAME,
    hudCompositeTarget: HUD_COMPOSITE_TARGET,
    hudCompositeWireName: HUD_COMPOSITE_WIRE_NAME,
    displayCanvasFallbackTarget: DISPLAY_CANVAS_FALLBACK_TARGET,
    displayCanvasFallbackWireName: DISPLAY_CANVAS_FALLBACK_WIRE_NAME,
    hudCellsTarget: HUD_CELLS_TARGET,
    hudPanelValuesTarget: HUD_PANEL_VALUES_TARGET,
    hudPriorityRectsTarget: HUD_PRIORITY_RECTS_TARGET,
    aisthesisInfoTarget: AISTHESIS_INFO_TARGET,
    aisthesisMatrixTarget: AISTHESIS_MATRIX_TARGET,
    aisthesisFeatureTarget: AISTHESIS_FEATURE_TARGET,
    aisthesisMaskTarget: AISTHESIS_MASK_TARGET,
    aisthesisMaskWireName: AISTHESIS_MASK_WIRE_NAME,
    aisthesisMaskLayout: AISTHESIS_MASK_LAYOUT,
    spatialInfoTarget: SPATIAL_INFO_TARGET,
    spatialOutputTarget: SPATIAL_OUTPUT_TARGET,
    hudGridSize: HUD_GRID_SIZE,
    hudCellCount: HUD_CELL_COUNT,
    hudUniformFloatCount: HUD_UNIFORM_FLOAT_COUNT,
    hudPanelValueCount: HUD_PANEL_VALUE_COUNT,
    hudRectCount: HUD_RECT_COUNT,
    hudLabelCount: HUD_LABEL_COUNT,
    hudRectStride: HUD_RECT_STRIDE,
    hudRectFloatCount: HUD_RECT_FLOAT_COUNT,
    hudRectFields: HUD_RECT_FIELDS,
    hudPanelBorderPixels: HUD_PANEL_BORDER_PIXELS,
    hudPanelRects: HUD_PANEL_RECTS,
    hudPanelLayoutName: "panel16",
    hudPanelFields: HUD_PANEL_FIELDS,
    stateVectorLayoutName: "state16",
    stateVectorFloatCount: STATE_VECTOR_FLOAT_COUNT,
    stateVectorFields: STATE_VECTOR_FIELDS,
    aisthesisInfoFloatCount: AISTHESIS_INFO_FLOAT_COUNT,
    aisthesisMatrixFloatCount: AISTHESIS_MATRIX_FLOAT_COUNT,
    aisthesisFeatureFloatCount: AISTHESIS_FEATURE_FLOAT_COUNT,
    spatialInfoFloatCount: SPATIAL_INFO_FLOAT_COUNT,
    spatialOutputFloatCount: SPATIAL_OUTPUT_FLOAT_COUNT,
    spatialOutputLayoutName: "spatial32",
    spatialOutputFields: SPATIAL_OUTPUT_FIELDS,
    rawFramebufferFrameTarget: rawFramebufferTarget,
    hudCompositeFrameTarget: hudCompositeTarget,
    displayCanvasFallbackFrameTarget: displayCanvasFallbackTarget,
    frameToken,
    aisthesisMaskTextureTarget
  });
})();
