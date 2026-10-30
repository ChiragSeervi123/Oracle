import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, SRGBColorSpace, Vector2, Vector4 } from 'three'
import { state } from '../core/state.js'
import { now } from '../core/worldRuntime.js'

// Light travelling across the mirror floor: a ring for every spoken command and every
// reading, and a standing swell of waves while the world is LIQUID. A single additive
// disc that follows the world's focus, a hair above the floor.
const MAX = 6
const SIZE = 40

const vertexShader = /* glsl */ `
varying vec2 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec4 uEvents[${MAX}];
uniform vec3 uColors[${MAX}];
uniform vec2 uCenter;
uniform float uWaves;
uniform float uWavePhase;
uniform vec3 uWaveColor;
varying vec2 vWorld;

void main() {
  vec3 col = vec3(0.0);
  for (int i = 0; i < ${MAX}; i++) {
    vec4 e = uEvents[i];
    float age = uTime - e.z;
    if (age < 0.0 || age > 6.0 || e.w <= 0.0) continue;
    float d = distance(vWorld, e.xy);
    float front = age * 3.4;
    float crest = exp(-pow((d - front) * 2.4, 2.0)) + exp(-pow((d - front + 1.0) * 3.0, 2.0)) * 0.4;
    col += uColors[i] * crest * exp(-age * 0.7) * e.w * smoothstep(19.0, 7.0, d);
  }
  if (uWaves > 0.001) {
    float d = distance(vWorld, uCenter);
    float swell = pow(0.5 + 0.5 * sin(d * 3.4 - uWavePhase * 2.6), 7.0);
    col += uWaveColor * swell * uWaves * 0.5 * smoothstep(14.0, 3.0, d) * smoothstep(1.4, 3.2, d);
  }
  gl_FragColor = vec4(col, 1.0);
}
`

export default function Ripples() {
  const mesh = useRef()
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uEvents: { value: Array.from({ length: MAX }, () => new Vector4(0, 0, -99, 0)) },
      uColors: { value: Array.from({ length: MAX }, () => new Color()) },
      uCenter: { value: new Vector2() },
      uWaves: { value: 0 },
      uWavePhase: { value: 0 },
      uWaveColor: { value: new Color() },
    }),
    [],
  )

  useFrame(() => {
    const W = state.world
    const [fx, , fz] = state.focus
    mesh.current.position.set(fx, 0.006, fz)
    uniforms.uTime.value = now()
    uniforms.uCenter.value.set(fx, fz)
    uniforms.uWaves.value = W['floor.ripple']
    uniforms.uWavePhase.value = state.phase.waves
    uniforms.uWaveColor.value.setRGB(...W['floor.rippleColor'], SRGBColorSpace)
    for (let i = 0; i < MAX; i++) {
      const r = state.ripples[i]
      if (!r) {
        uniforms.uEvents.value[i].w = 0
        continue
      }
      uniforms.uEvents.value[i].set(r.x, r.z, r.start, r.strength)
      uniforms.uColors.value[i].setRGB(r.color[0], r.color[1], r.color[2], SRGBColorSpace).multiplyScalar(1.6)
    }
  })

  return (
    <mesh ref={mesh} rotation-x={-Math.PI / 2} renderOrder={2}>
      <planeGeometry args={[SIZE, SIZE]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}
