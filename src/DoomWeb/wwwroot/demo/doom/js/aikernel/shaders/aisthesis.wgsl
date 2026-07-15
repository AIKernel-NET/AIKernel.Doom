// AIKernel canonical v0.1.3 GPU Aisthesis shader skeleton.
// Inputs must be raw framebuffer textures. HUD-composited textures are invalid
// for sensor extraction and should be rejected by the runtime before dispatch.

struct AisthesisFeatureVector {
  values: array<f32, 32>,
};

@group(0) @binding(0) var rawFrame: texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> featureVector: AisthesisFeatureVector;
@group(0) @binding(2) var featureMask: texture_storage_2d<rgba8unorm, write>;

fn luma(rgb: vec3<f32>) -> f32 {
  return dot(rgb, vec3<f32>(0.299, 0.587, 0.114));
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let dims = textureDimensions(rawFrame);
  if (id.x >= dims.x || id.y >= dims.y) {
    return;
  }

  // Canonical channel reservation:
  // 0 heat, 1 red panel, 2 edge, 3 corner, 4 visual enemy, 5 audio fusion hint.
  let pixel = textureLoad(rawFrame, vec2<i32>(id.xy), 0).rgb;
  let brightness = luma(pixel);
  let redPanel = max(pixel.r - max(pixel.g, pixel.b), 0.0);

  if (id.x == dims.x / 2u && id.y == dims.y / 2u) {
    featureVector.values[0] = brightness;
    featureVector.values[1] = redPanel;
  }

  textureStore(
    featureMask,
    vec2<i32>(id.xy),
    vec4<f32>(brightness, redPanel, 0.0, 1.0));
}
