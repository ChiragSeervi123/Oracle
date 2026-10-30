import { Color, MeshPhysicalMaterial, Vector2, Vector3 } from 'three'
import { simplex3 } from './glsl/simplex.js'

// Liquid chrome: a physical metal whose vertices are displaced by layered noise,
// with normals rebuilt analytically from neighbouring samples so reflections flow
// with the surface. While the visitor holds, a socket opens toward the camera and a
// gold iris ignites inside it.
// World commands reshape it: the surface can freeze into a faceted quartz crystal,
// drip upward, slosh, or crack with molten seams, and every new material spreads
// across it as a wave that starts at the eye.
const vertexHead = /* glsl */ `
uniform float uTime;
uniform float uHold;
uniform float uRipple;
uniform float uAgitation;
uniform float uPointerStrength;
uniform vec3 uPointerDir;
uniform vec3 uEye;
uniform float uDisplacement;
uniform float uLiquid;
uniform float uCrystal;
uniform float uRise;
uniform float uGemSpin;
varying float vFacing;
varying float vFlow;

${simplex3}

// A double-terminated quartz: six prism walls capped by two six-sided pyramids.
float gemRadius(vec3 n) {
  float m = 0.0;
  for (int k = 0; k < 6; k++) {
    float a = float(k) * 1.0471976 + uGemSpin;
    vec2 d = vec2(cos(a), sin(a));
    m = max(m, dot(n, vec3(d.x, 0.0, d.y)) / 0.6);
    m = max(m, dot(n, normalize(vec3(d.x, 1.15, d.y))) / 0.88);
    m = max(m, dot(n, normalize(vec3(d.x, -1.15, d.y))) / 0.88);
  }
  return 1.0 / m;
}

float surface(vec3 n, out float flow) {
  float t = uTime;
  float facing = dot(n, uEye);
  float socket = smoothstep(0.8, 0.995, facing);
  float lip = smoothstep(0.6, 0.78, facing) * (1.0 - smoothstep(0.78, 0.9, facing));

  // mercury: broad slow swells, a softer secondary current, and a tremor that only
  // surfaces while the oracle is being read
  flow = snoise(n * 0.75 + vec3(0.0, t * 0.13, t * 0.05)) * 0.115;
  flow += snoise(n * 1.45 + vec3(t * 0.17, -t * 0.09, 0.0)) * (0.026 + uHold * 0.03);
  flow += snoise(n * 3.6 - vec3(0.0, t * 0.42, 0.0)) * (0.003 + uHold * 0.012 + uAgitation * 0.02);
  if (uLiquid > 0.001) flow += snoise(n * 1.1 + vec3(t * 0.55, t * 0.4, -t * 0.45)) * 0.09 * uLiquid;
  flow *= uDisplacement * (1.0 - socket * uHold * 0.75);

  // it leans toward the visitor's attention, and drips upward when gravity turns
  float lean = max(dot(n, uPointerDir), 0.0);
  float fluid = 1.0 + flow + pow(lean, 6.0) * 0.24 * uPointerStrength + pow(max(n.y, 0.0), 4.0) * 0.38 * uRise;
  float r = uCrystal > 0.001 ? mix(fluid, gemRadius(n) + flow * 0.12, uCrystal) : fluid;

  // the eye works in every form
  r += (lip * 0.085 - socket * 0.34) * uHold;

  // a single shock ring travels from the iris across the body after a reading
  float ang = acos(clamp(facing, -1.0, 1.0));
  r += 0.08 * exp(-uRipple * 0.85) * exp(-pow((ang - uRipple * 1.9) * 5.0, 2.0));
  return r;
}
`

const normalChunk = /* glsl */ `
vec3 sN = normalize(position);
vec3 refAxis = abs(sN.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
vec3 tA = normalize(cross(sN, refAxis));
vec3 tB = normalize(cross(sN, tA));
vec3 nA = normalize(sN + tA * 0.012);
vec3 nB = normalize(sN + tB * 0.012);
float flowHere;
float flowA;
float flowB;
vec3 oraclePos = sN * surface(sN, flowHere);
vec3 pA = nA * surface(nA, flowA);
vec3 pB = nB * surface(nB, flowB);
vec3 objectNormal = normalize(cross(pA - oraclePos, pB - oraclePos));
vFacing = dot(sN, uEye);
vFlow = flowHere;
`

const fragmentHead = /* glsl */ `
uniform float uHold;
uniform vec3 uIris;
uniform vec3 uFromColor;
uniform vec3 uToColor;
uniform vec2 uFromSurface;
uniform vec2 uToSurface;
uniform vec3 uFromGlow;
uniform vec3 uToGlow;
uniform float uFront;
uniform vec3 uFrontColor;
uniform float uMolten;
uniform vec3 uMoltenColor;
uniform float uCrystal;
uniform vec3 uEdgeColor;
varying float vFacing;
varying float vFlow;
`

// The new material has reached every point whose angle from the eye is behind the front.
const materialChunk = /* glsl */ `
float waveAngle = acos(clamp(vFacing, -1.0, 1.0));
float arrived = 1.0 - smoothstep(uFront - 0.3, uFront, waveAngle);
diffuseColor.rgb = mix(uFromColor, uToColor, arrived);
metalnessFactor = mix(uFromSurface.x, uToSurface.x, arrived);
roughnessFactor = mix(uFromSurface.y, uToSurface.y, arrived);
`

const emissiveChunk = /* glsl */ `
totalEmissiveRadiance += mix(uFromGlow, uToGlow, arrived);
totalEmissiveRadiance += uFrontColor * exp(-pow((waveAngle - uFront) * 9.0, 2.0)) * step(uFront, 3.4);
if (uMolten > 0.001) {
  float seam = smoothstep(0.0, -0.085, vFlow);
  totalEmissiveRadiance += uMoltenColor * uMolten * seam * seam * 3.2;
}
if (uCrystal > 0.001) {
  float edge = clamp(length(fwidth(normal)) * 7.0 - 0.2, 0.0, 1.0);
  totalEmissiveRadiance += uEdgeColor * edge * uCrystal;
}
float irisCore = smoothstep(0.955, 0.996, vFacing);
float irisRing = smoothstep(0.895, 0.925, vFacing) * (1.0 - smoothstep(0.93, 0.952, vFacing));
totalEmissiveRadiance += uIris * (irisCore * 6.0 + irisRing * 1.6) * uHold * uHold;
`

export function createOracleMaterial() {
  const uniforms = {
    uTime: { value: 0 },
    uHold: { value: 0 },
    uRipple: { value: 99 },
    uAgitation: { value: 0 },
    uPointerStrength: { value: 0 },
    uPointerDir: { value: new Vector3(0, 0, 1) },
    uEye: { value: new Vector3(0, 0, 1) },
    uIris: { value: new Color('#f3c98a') },
    uDisplacement: { value: 1 },
    uLiquid: { value: 0 },
    uCrystal: { value: 0 },
    uRise: { value: 0 },
    uGemSpin: { value: 0 },
    uFromColor: { value: new Color('#ffffff') },
    uToColor: { value: new Color('#ffffff') },
    uFromSurface: { value: new Vector2(1, 0.055) },
    uToSurface: { value: new Vector2(1, 0.055) },
    uFromGlow: { value: new Color(0, 0, 0) },
    uToGlow: { value: new Color(0, 0, 0) },
    uFront: { value: 4 },
    uFrontColor: { value: new Color(0, 0, 0) },
    uMolten: { value: 0 },
    uMoltenColor: { value: new Color('#ff7a1a') },
    uEdgeColor: { value: new Color('#bfe3ff') },
  }

  const material = new MeshPhysicalMaterial({
    color: '#ffffff',
    metalness: 1,
    roughness: 0.055,
    clearcoat: 0.5,
    clearcoatRoughness: 0.04,
    iridescence: 0.32,
    iridescenceIOR: 1.55,
    iridescenceThicknessRange: [160, 520],
    envMapIntensity: 1.2,
  })

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertexHead}`)
      .replace('#include <beginnormal_vertex>', normalChunk)
      .replace('#include <begin_vertex>', 'vec3 transformed = oraclePos;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${fragmentHead}`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${materialChunk}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${emissiveChunk}`)
  }
  material.customProgramCacheKey = () => 'oracle-liquid-chrome-v2'
  material.userData.uniforms = uniforms
  return material
}
