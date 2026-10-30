import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, SRGBColorSpace, Vector3 } from 'three'
import { mulberry32 } from '../core/math.js'
import { state } from '../core/state.js'

// Gilded dust suspended in the dark. The volume wraps around the camera so it fills
// the entire journey with a single draw call. It drifts with world time, gathers
// toward the oracle while it is being read, and obeys the world: rising embers,
// turbulence, rain that falls upward, or an accretion spiral around the focal point.
const BOX = [26, 10, 26]

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uRise;
uniform float uHold;
uniform float uPixelRatio;
uniform float uSize;
uniform float uDensity;
uniform float uOpacity;
uniform float uTurbulence;
uniform float uWell;
uniform float uSwirl;
uniform vec3 uCam;
uniform vec3 uFocus;
attribute float aSeed;
varying float vAlpha;

void main() {
  vec3 box = vec3(${BOX.map((v) => v.toFixed(1)).join(', ')});
  vec3 p = position;
  p.y += uRise * (0.04 + aSeed * 0.07);
  p.x += sin(uTime * 0.17 + aSeed * 31.0) * 0.35;
  p.z += cos(uTime * 0.13 + aSeed * 17.0) * 0.35;

  vec3 rel = mod(p - uCam + box * 0.5, box) - box * 0.5;
  vec3 world = uCam + rel;

  if (uTurbulence > 0.001) {
    world += vec3(
      sin(world.y * 1.3 + uTime * 1.7 + aSeed * 6.0),
      sin(world.z * 1.1 + uTime * 1.3 + aSeed * 3.0),
      cos(world.x * 1.2 - uTime * 1.5)
    ) * 0.35 * uTurbulence;
  }
  world.y = max(world.y, 0.05);

  // gravity well: a differential spiral that flattens into a disk around the focus
  vec3 toF = world - uFocus;
  float dF = length(toF);
  if (uWell > 0.001 || uSwirl > 0.001) {
    float influence = smoothstep(14.0, 0.0, dF);
    float angle = uSwirl * influence * 2.5 / (dF * 0.35 + 0.4);
    float cs = cos(angle);
    float sn = sin(angle);
    toF.xz = mat2(cs, -sn, sn, cs) * toF.xz;
    toF *= 1.0 - uWell * influence * 0.72;
    toF.y *= 1.0 - uWell * influence * 0.6;
    world = uFocus + toF;
    dF = length(toF);
  }

  // while the oracle is being read, the motes spiral in toward it
  float pull = uHold * smoothstep(9.0, 0.5, dF);
  vec3 dir = -toF / max(dF, 0.001);
  world += dir * pull * min(dF, 4.0) * 0.55 + normalize(cross(dir, vec3(0.0, 1.0, 0.0)) + 0.0001) * pull * 1.1;

  vec4 mv = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;

  vec3 edge = abs(rel) / (box * 0.5);
  float fade = 1.0 - smoothstep(0.75, 1.0, max(max(edge.x, edge.y), edge.z));
  fade *= smoothstep(1.2, 3.5, -mv.z); // never bloom into the lens
  fade *= 1.0 - smoothstep(uDensity - 0.04, uDensity, aSeed);
  vAlpha = fade * (0.2 + 0.8 * aSeed) * (1.0 + pull * 2.5) * uOpacity;
  gl_PointSize = min((0.6 + aSeed * 1.6) * uPixelRatio * uSize * (30.0 / max(-mv.z, 0.5)), 9.0 * uPixelRatio * uSize);
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  gl_FragColor = vec4(uColor, a * vAlpha * 0.55);
}
`

export default function Dust({ tier }) {
  const count = tier === 'high' ? 2200 : 900
  const dpr = useThree((s) => s.viewport.dpr)

  const geometry = useMemo(() => {
    const rand = mulberry32(3)
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = rand() * BOX[0]
      positions[i * 3 + 1] = rand() * BOX[1]
      positions[i * 3 + 2] = rand() * BOX[2]
      seeds[i] = rand()
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    geo.setAttribute('aSeed', new BufferAttribute(seeds, 1))
    return geo
  }, [count])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRise: { value: 0 },
      uHold: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 1 },
      uDensity: { value: 1 },
      uOpacity: { value: 1 },
      uTurbulence: { value: 0 },
      uWell: { value: 0 },
      uSwirl: { value: 0 },
      uCam: { value: new Vector3() },
      uFocus: { value: new Vector3() },
      uColor: { value: new Color('#f1d7a8') },
    }),
    [],
  )

  useFrame(({ camera }) => {
    const W = state.world
    uniforms.uTime.value = state.phase.dust
    uniforms.uRise.value = state.phase.rise
    uniforms.uHold.value = state.c < 2.5 ? state.hold * state.hold : 0
    uniforms.uPixelRatio.value = dpr
    uniforms.uSize.value = W['dust.size']
    uniforms.uDensity.value = W['dust.density'] + 0.04
    uniforms.uOpacity.value = W['dust.opacity']
    uniforms.uTurbulence.value = W['dust.turbulence']
    uniforms.uWell.value = W['dust.well']
    uniforms.uSwirl.value = state.phase.swirl
    uniforms.uColor.value.setRGB(...W['dust.color'], SRGBColorSpace)
    uniforms.uCam.value.copy(camera.position)
    uniforms.uFocus.value.fromArray(state.focus)
  })

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  )
}
