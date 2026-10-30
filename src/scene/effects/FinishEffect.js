import { BlendFunction, Effect } from 'postprocessing'
import { Color, Uniform, Vector2 } from 'three'

// The final grade, in one pass:
//  - A colour grade driven by the world (exposure, tint, saturation, contrast).
//  - A gravitational lens around the world's focus (VOID).
//  - An acknowledgement ring in the colour of the last spoken command.
//  - "The Negative": a radial wipe that inverts luminance while keeping hue, so the
//    obsidian world turns to bone-white and gold survives as dark bronze ink.
//  - Vignette and film grain (grain also kills banding in the dark gradients).
const fragmentShader = /* glsl */ `
uniform float uNegative;
uniform float uGrain;
uniform float uVignette;
uniform float uFlash;
uniform float uExposure;
uniform vec3 uTint;
uniform float uSaturation;
uniform float uContrast;
uniform float uLens;
uniform vec2 uFocus;
uniform float uAck;
uniform vec3 uAckColor;

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

vec3 toDisplay(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)); }
vec3 toLinear(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(2.2)); }

void mainUv(inout vec2 uv) {
  if (uLens > 0.001) {
    vec2 d = (uv - uFocus) * vec2(aspect, 1.0);
    float r = length(d);
    float bend = uLens * 0.0045 / (r * r + 0.012) * smoothstep(0.55, 0.05, r);
    uv -= (d / max(r, 1e-4)) * bend / vec2(aspect, 1.0);
  }
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 col = toDisplay(inputColor.rgb * uExposure);

  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(luma), col, uSaturation);
  col = clamp((col - 0.5) * uContrast + 0.5, 0.0, 1.0) * uTint;

  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float d = length(p);

  if (uAck > 0.0 && uAck < 1.0) {
    float ackRadius = uAck * (0.25 + aspect);
    float ring = exp(-pow((length((uv - uFocus) * vec2(aspect, 1.0)) - ackRadius) * 38.0, 2.0));
    col += uAckColor * ring * (1.0 - uAck) * 0.5;
  }

  float radius = uNegative * (0.6 * aspect + 0.62);
  float inside = 1.0 - smoothstep(radius - 0.035, radius, d);
  inside = uNegative >= 0.999 ? 1.0 : inside * step(0.0001, uNegative);

  luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
  vec3 inverted = clamp(col + (1.0 - 2.0 * luma), 0.0, 1.0);
  col = mix(col, inverted, inside);

  float seam = exp(-pow((d - radius) * 55.0, 2.0)) * step(0.0001, uNegative) * (1.0 - step(0.999, uNegative));
  col += vec3(1.0, 0.86, 0.62) * seam * 0.85;

  col += vec3(1.0, 0.9, 0.75) * uFlash;

  float vig = smoothstep(1.15, 0.25, length((uv - 0.5) * vec2(1.0, 1.1)) * 1.25);
  col *= mix(1.0, vig, uVignette);

  col += (hash(uv * resolution + fract(time * 7.13) * 91.7) - 0.5) * uGrain;

  outputColor = vec4(toLinear(col), inputColor.a);
}
`

export class FinishEffect extends Effect {
  constructor({ grain = 0.045, vignette = 0.55 } = {}) {
    super('FinishEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['uNegative', new Uniform(0)],
        ['uGrain', new Uniform(grain)],
        ['uVignette', new Uniform(vignette)],
        ['uFlash', new Uniform(0)],
        ['uExposure', new Uniform(1)],
        ['uTint', new Uniform(new Color(1, 1, 1))],
        ['uSaturation', new Uniform(1)],
        ['uContrast', new Uniform(1)],
        ['uLens', new Uniform(0)],
        ['uFocus', new Uniform(new Vector2(0.5, 0.5))],
        ['uAck', new Uniform(0)],
        ['uAckColor', new Uniform(new Color(1, 1, 1))],
      ]),
    })
  }
}
