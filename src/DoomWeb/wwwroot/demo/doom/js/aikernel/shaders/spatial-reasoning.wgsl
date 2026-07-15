// AIKernel canonical v0.1.3 GPU Spatial Reasoning shader skeleton.
// Matrix order is fixed: 0 Topos, 1 Route, 2 Threat, 3 Zoe.
// CTG belongs in StateVector, not in a fifth AisMatrix.

struct SpatialInput {
  aisMatrix: array<f32, 324>,
  stateVector: array<f32, 16>,
};

struct SpatialOutput {
  spatialVector: array<f32, 32>,
};

@group(0) @binding(0) var<storage, read> inputData: SpatialInput;
@group(0) @binding(1) var<storage, read_write> outputData: SpatialOutput;

@compute @workgroup_size(32, 1, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= 32u) {
    return;
  }

  let index = id.x;
  if (index < 16u) {
    outputData.spatialVector[index] = inputData.stateVector[index];
    return;
  }

  let cell = (index - 16u) % 81u;
  let route = inputData.aisMatrix[81u + cell];
  let threat = inputData.aisMatrix[162u + cell];
  let zoe = inputData.aisMatrix[243u + cell];
  outputData.spatialVector[index] = route - max(threat, zoe);
}
