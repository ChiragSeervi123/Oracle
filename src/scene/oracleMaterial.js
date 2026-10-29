import { Color, MeshPhysicalMaterial, Vector3 } from 'three'
import { simplex3 } from './glsl/simplex.js'

// Liquid chrome: a physical metal whose vertices are displaced by layered noise,
// with normals rebuilt analytically from neighbouring samples so the reflections
// flow with the surface. While the visitor holds, a socket opens toward the camera
// and a gold iris ignites inside it.
const vertexHead = /* glsl */ `
uniform float uTime;
uniform float uHold;
uniform float uRipple;
uniform float uAgitation;
uniform float uPointerStrength;
uniform vec3 uPointerDir;
uniform vec3 uEye;
varying float vFacing;

${simplex3}

float displace(vec3 n) {
  float t = uTime;
  float facing = dot(n, uEye);
  float socket = smoothstep(0.8, 0.995, facing);
  float lip = smoothstep(0.6, 0.78, facing) * (1.0 - smoothstep(0.78, 0.9, facing));

  // mercury: broad slow swells, a softer secondary current, and a tremor that only
  // surfaces while the oracle is being read
  float flow = snoise(n * 0.75 + vec3(0.0, t * 0.13, t * 0.05)) * 0.115;
  flow += snoise(n * 1.45 + vec3(t * 0.17, -t * 0.09, 0.0)) * (0.026 + uHold * 0.03);
  flow += snoise(n * 3.6 - vec3(0.0, t * 0.42, 0.0)) * (0.003 + uHold * 0.012 + uAgitation * 0.02);
  // the surface calms around the eye so it reads clearly
  flow *= 1.0 - socket * uHold * 0.75;

  // it leans toward the visitor's attention
  float lean = max(dot(n, uPointerDir), 0.0);
  float d = flow + pow(lean, 6.0) * 0.24 * uPointerStrength;

  d += (lip * 0.085 - socket * 0.34) * uHold;

  // a single shock ring travels from the iris across the body after a reading
  float ang = acos(clamp(facing, -1.0, 1.0));
  d += 0.08 * exp(-uRipple * 0.85) * exp(-pow((ang - uRipple * 1.9) * 5.0, 2.0));
  return d;
}
`

const normalChunk = /* glsl */ `
vec3 sN = normalize(position);
vec3 refAxis = abs(sN.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
vec3 tA = normalize(cross(sN, refAxis));
vec3 tB = normalize(cross(sN, tA));
vec3 nA = normalize(sN + tA * 0.012);
vec3 nB = normalize(sN + tB * 0.012);
vec3 oraclePos = sN * (1.0 + displace(sN));
vec3 pA = nA * (1.0 + displace(nA));
vec3 pB = nB * (1.0 + displace(nB));
vec3 objectNormal = normalize(cross(pA - oraclePos, pB - oraclePos));
vFacing = dot(sN, uEye);
`

const irisChunk = /* glsl */ `
float irisCore = smoothstep(0.955, 0.996, vFacing);
float irisRing = smoothstep(0.895, 0.925, vFacing) * (1.0 - smoothstep(0.93, 0.952, vFacing));
float irisOn = uHold * uHold;
totalEmissiveRadiance += uIris * (irisCore * 6.0 + irisRing * 1.6) * irisOn;
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
      .replace('#include <common>', '#include <common>\nuniform float uHold;\nuniform vec3 uIris;\nvarying float vFacing;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${irisChunk}`)
  }
  material.customProgramCacheKey = () => 'oracle-liquid-chrome'
  material.userData.uniforms = uniforms
  return material
}
