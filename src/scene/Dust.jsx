import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Vector3 } from 'three'
import { FINALE_Z, ORACLE_Y } from '../core/chapters.js'
import { mulberry32 } from '../core/math.js'
import { state } from '../core/state.js'

// Gilded dust suspended in the dark. The volume wraps around the camera so it fills
// the entire journey with a single draw call; while the oracle is being read, the
// motes spiral in toward it.
const BOX = [26, 10, 26]

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uHold;
uniform float uPixelRatio;
uniform vec3 uCam;
uniform vec3 uAttract;
attribute float aSeed;
varying float vAlpha;

void main() {
  vec3 box = vec3(${BOX.map((v) => v.toFixed(1)).join(', ')});
  vec3 p = position;
  p.y += uTime * (0.04 + aSeed * 0.07);
  p.x += sin(uTime * 0.17 + aSeed * 31.0) * 0.35;
  p.z += cos(uTime * 0.13 + aSeed * 17.0) * 0.35;

  vec3 rel = mod(p - uCam + box * 0.5, box) - box * 0.5;
  vec3 world = uCam + rel;
  world.y = max(world.y, 0.05);

  vec3 toA = uAttract - world;
  float dA = length(toA);
  float pull = uHold * smoothstep(9.0, 0.5, dA);
  vec3 dir = toA / max(dA, 0.001);
  world += dir * pull * min(dA, 4.0) * 0.55 + normalize(cross(dir, vec3(0.0, 1.0, 0.0)) + 0.0001) * pull * 1.1;

  vec4 mv = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;

  vec3 edge = abs(rel) / (box * 0.5);
  float fade = 1.0 - smoothstep(0.75, 1.0, max(max(edge.x, edge.y), edge.z));
  fade *= smoothstep(1.2, 3.5, -mv.z); // never bloom into the lens
  vAlpha = fade * (0.2 + 0.8 * aSeed) * (1.0 + pull * 2.5);
  gl_PointSize = min((0.6 + aSeed * 1.6) * uPixelRatio * (30.0 / max(-mv.z, 0.5)), 9.0 * uPixelRatio);
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
      uHold: { value: 0 },
      uPixelRatio: { value: 1 },
      uCam: { value: new Vector3() },
      uAttract: { value: new Vector3(0, ORACLE_Y, 0) },
      uColor: { value: new Color('#f1d7a8') },
    }),
    [],
  )

  useFrame(({ clock, camera }) => {
    uniforms.uTime.value = clock.elapsedTime * (state.reducedMotion ? 0.3 : 1)
    uniforms.uHold.value = state.c < 2.5 ? state.hold * state.hold : 0
    uniforms.uPixelRatio.value = dpr
    uniforms.uCam.value.copy(camera.position)
    uniforms.uAttract.value.set(0, ORACLE_Y, state.c > 3 ? FINALE_Z : 0)
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
