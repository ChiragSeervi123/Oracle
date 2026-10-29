import { BlendFunction, Effect } from 'postprocessing'
import { Uniform } from 'three'

// The final grade, in one pass:
//  - "The Negative": a radial wipe that inverts luminance while keeping hue, so the
//    obsidian world turns to bone-white and gold survives as dark bronze ink.
//  - A champagne seam along the wipe's edge.
//  - Vignette and film grain (grain also kills banding in the dark gradients).
const fragmentShader = /* glsl */ `
uniform float uNegative;
uniform float uGrain;
uniform float uVignette;
uniform float uFlash;

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

vec3 toDisplay(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)); }
vec3 toLinear(vec3 c) { return pow(clamp(c, 0.0, 1.0), vec3(2.2)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 col = toDisplay(inputColor.rgb);

  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float d = length(p);
  float radius = uNegative * (0.6 * aspect + 0.62);
  float inside = 1.0 - smoothstep(radius - 0.035, radius, d);
  inside = uNegative >= 0.999 ? 1.0 : inside * step(0.0001, uNegative);

  float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
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
      ]),
    })
  }
}
