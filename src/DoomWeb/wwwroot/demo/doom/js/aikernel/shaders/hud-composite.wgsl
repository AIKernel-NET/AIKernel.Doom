// AIKernel canonical v0.1.3 GPU HUD composite shader.
// Shader code must consume already-smoothed runtime values; it must not own
// compass/radar decay, hold, or semantic state transitions.

struct HudInfo {
  compassHeadingDeg: f32,
  compassConfidence: f32,
  compassUsable: f32,
  radarMode: f32,
  kinesisX: f32,
  kinesisY: f32,
  visualEnemyYawDeg: f32,
  visualEnemyAlpha: f32,
  audioEnemyYawDeg: f32,
  audioEnemyAlpha: f32,
  fusedEnemyYawDeg: f32,
  fusedEnemyAlpha: f32,
  sdfLink: f32,
  flicker: f32,
  hold: f32,
  decay: f32,
};

@group(0) @binding(0) var<uniform> hud: HudInfo;
@group(0) @binding(1) var hudComposite: texture_storage_2d<rgba8unorm, write>;

fn front_angle_offset(angleDeg: f32) -> vec2<f32> {
  let angle = radians(angleDeg);
  return vec2<f32>(sin(angle), -cos(angle));
}

fn sd_line(p: vec2<f32>, a: vec2<f32>, b: vec2<f32>) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.00001), 0.0, 1.0);
  return length(pa - ba * h);
}

fn radar_theme(mode: f32, usable: f32) -> vec3<f32> {
  if (mode > 1.5 || usable < 0.5) {
    return vec3<f32>(0.95, 0.20, 0.24);
  }
  if (mode > 0.5) {
    return vec3<f32>(1.0, 0.64, 0.10);
  }
  return vec3<f32>(0.05, 0.92, 1.0);
}

// Fragment/compute callers provide uv in normalized panel-local coordinates.
fn compose_ego_radar_pixel(uv: vec2<f32>, hud: HudInfo, timePhase: f32) -> vec4<f32> {
  let center = vec2<f32>(0.5, 0.5);
  let radius = 0.46;
  let p = uv - center;
  let dist = length(p);
  var color = vec4<f32>(0.0);
  let theme = radar_theme(hud.radarMode, hud.compassUsable);

  let outer = smoothstep(0.012, 0.003, abs(dist - radius));
  let mid = smoothstep(0.010, 0.002, abs(dist - radius * 0.66));
  let inner = smoothstep(0.010, 0.002, abs(dist - radius * 0.33));
  color += vec4<f32>(theme * (outer + mid * 0.35 + inner * 0.30), outer + mid * 0.25 + inner * 0.20);

  let axes = max(smoothstep(0.006, 0.001, abs(p.x)) * step(abs(p.y), radius),
                 smoothstep(0.006, 0.001, abs(p.y)) * step(abs(p.x), radius));
  color += vec4<f32>(theme * axes * 0.35, axes * 0.35);

  let north = center + front_angle_offset(-hud.compassHeadingDeg) * radius * 0.96;
  let northAlpha = clamp(hud.compassConfidence, 0.08, 1.0) * mix(1.0, 0.45 + 0.35 * sin(timePhase * 20.0), step(hud.compassConfidence, 0.20));
  let northDot = smoothstep(0.030, 0.006, distance(uv, north)) * northAlpha;
  color += vec4<f32>(theme * northDot, northDot);

  let kin = center + vec2<f32>(clamp(hud.kinesisX, -1.0, 1.0), -clamp(hud.kinesisY, -1.0, 1.0)) * radius * 0.58;
  let kinLine = smoothstep(0.018, 0.004, sd_line(uv, center, kin));
  let kinDot = smoothstep(0.030, 0.008, distance(uv, kin));
  color += vec4<f32>(theme * (kinLine * 0.45 + kinDot * 0.9), kinLine * 0.35 + kinDot * 0.75);

  let visual = center + front_angle_offset(hud.visualEnemyYawDeg) * radius * 0.52;
  let audio = center + front_angle_offset(hud.audioEnemyYawDeg) * radius * 0.88;
  let visualDot = smoothstep(0.038, 0.008, distance(uv, visual)) * clamp(hud.visualEnemyAlpha, 0.0, 1.0);
  let audioDot = smoothstep(0.045, 0.010, distance(uv, audio)) * clamp(hud.audioEnemyAlpha, 0.0, 1.0);
  color += vec4<f32>(vec3<f32>(1.0, 0.12, 0.38) * visualDot, visualDot);
  color += vec4<f32>(vec3<f32>(1.0, 0.66, 0.12) * audioDot, audioDot);

  let fusionStrength = min(clamp(hud.visualEnemyAlpha, 0.0, 1.0), clamp(hud.audioEnemyAlpha, 0.0, 1.0)) * hud.sdfLink;
  let fusion = smoothstep(0.014, 0.002, sd_line(uv, visual, audio)) * fusionStrength;
  color += vec4<f32>(vec3<f32>(0.20, 1.0, 0.50) * fusion, fusion);

  return color;
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let dims = textureDimensions(hudComposite);
  if (id.x >= dims.x || id.y >= dims.y) {
    return;
  }

  let uv = (vec2<f32>(id.xy) + vec2<f32>(0.5)) / vec2<f32>(dims);
  let radar = compose_ego_radar_pixel(uv, hud, hud.flicker);
  textureStore(
    hudComposite,
    vec2<i32>(id.xy),
    vec4<f32>(clamp(radar.rgb, vec3<f32>(0.0), vec3<f32>(1.0)), clamp(radar.a, 0.0, 1.0)));
}
