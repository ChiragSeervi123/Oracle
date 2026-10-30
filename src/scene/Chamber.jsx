import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, Color, DoubleSide, Object3D, SRGBColorSpace } from 'three'
import { FINALE_Z } from '../core/chapters.js'
import { smoothstep } from '../core/math.js'
import { state } from '../core/state.js'

// An arc of obsidian slabs behind the oracle with a gap at its centre: the gate to the halls.
const RADIUS = 10.5
const SLABS = [
  [-74, 8.2],
  [-58, 11.4],
  [-43, 9.1],
  [-28, 13.6],
  [-12, 10.6],
  [12, 11.1],
  [28, 14.2],
  [43, 8.8],
  [58, 12.9],
  [74, 7.9],
].map(([deg, h], i) => {
  const a = (deg * Math.PI) / 180
  // how high this slab floats when gravity turns, and its own drift
  const lift = 0.7 + ((Math.sin(i * 91.7) * 43758.5) % 1 + 1) % 1 * 2.2
  return { x: RADIUS * Math.sin(a), z: -RADIUS * Math.cos(a), ry: -a, h, lift, side: i < 5 ? 1 : -1, line: i % 2 === 0 }
})
const SLAB_W = 1.05
const SLAB_D = 0.32
const TICKS = 144

const shaftVertex = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPosW = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const shaftFragment = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;
varying vec3 vNormalW;
varying vec3 vPosW;
varying vec2 vUv;
void main() {
  vec3 V = normalize(cameraPosition - vPosW);
  float facing = abs(dot(normalize(vNormalW), V));
  float body = pow(facing, 2.5);
  float streaks = 0.55 + 0.45 * sin(vUv.x * 62.0 + uTime * 0.21) * sin(vUv.x * 23.0 - uTime * 0.13);
  float vertical = smoothstep(0.0, 0.35, vUv.y) * mix(0.35, 1.0, vUv.y);
  float alpha = body * streaks * vertical * uIntensity;
  gl_FragColor = vec4(uColor * alpha, alpha);
}
`

export default function Chamber({ z = 0 }) {
  const slabs = useRef()
  const lines = useRef()
  const ticks = useRef()
  const dial = useRef()
  const root = useRef()
  const isFinale = z === FINALE_Z

  const shaftUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uIntensity: { value: 0.12 }, uColor: { value: new Color('#f6e2bd') } }),
    [],
  )
  const cache = useMemo(() => ({ dummy: new Object3D(), part: new Object3D(), lastFloat: -1 }), [])

  // Slab i and its hairline, lifted by `float` (GRAVITY) at world time `t`.
  const place = (float, t) => {
    const { dummy, part } = cache
    SLABS.forEach((s, i) => {
      const drift = float * (s.lift + Math.sin(t * 0.55 + i * 1.3) * 0.22)
      dummy.position.set(s.x, s.h / 2 + drift, s.z)
      dummy.rotation.set(0, s.ry, Math.sin(t * 0.33 + i) * 0.06 * float)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()

      part.position.set(0, 0, 0)
      part.rotation.set(0, 0, 0)
      part.scale.set(SLAB_W, s.h, SLAB_D)
      part.updateMatrix()
      part.matrix.premultiply(dummy.matrix)
      slabs.current.setMatrixAt(i, part.matrix)

      // gold hairline inset into the face of every other slab, on the edge nearest the gate
      part.position.set(s.side * (SLAB_W / 2 - 0.16), -s.h * 0.04, SLAB_D / 2 + 0.004)
      part.scale.set(0.012, s.line ? s.h * 0.78 : 0.0001, 0.004)
      part.updateMatrix()
      part.matrix.premultiply(dummy.matrix)
      lines.current.setMatrixAt(i, part.matrix)
    })
    slabs.current.instanceMatrix.needsUpdate = true
    lines.current.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => {
    place(0, 0)
    const { dummy } = cache
    for (let i = 0; i < TICKS; i++) {
      const a = (i / TICKS) * Math.PI * 2
      const major = i % 12 === 0
      const len = major ? 0.28 : 0.09
      dummy.position.set(Math.cos(a) * (3.32 + len / 2), 0, Math.sin(a) * (3.32 + len / 2))
      dummy.rotation.set(0, -a, 0)
      dummy.scale.set(len, 0.002, major ? 0.014 : 0.007)
      dummy.updateMatrix()
      ticks.current.setMatrixAt(i, dummy.matrix)
    }
    ticks.current.instanceMatrix.needsUpdate = true
  }, [])

  useFrame((_, dt) => {
    const { c } = state
    const near = isFinale ? c > 3.7 : c < 2.4
    root.current.visible = near
    if (!near) return
    const W = state.world

    const slab = slabs.current.material
    slab.color.setRGB(...W['monoliths.color'], SRGBColorSpace)
    slab.roughness = W['monoliths.roughness']
    const line = W['monoliths.line']
    lines.current.material.color.setRGB(line[0], line[1], line[2], SRGBColorSpace).multiplyScalar(W['monoliths.lineGlow'])

    const float = W['monoliths.float']
    if (float > 0.0005 || cache.lastFloat > 0.0005) place(float, state.clock)
    cache.lastFloat = float

    const hold = isFinale ? smoothstep(4.5, 4.95, c) * 0.6 : state.hold
    dial.current.rotation.y += dt * W['time.scale'] * (0.015 + hold * hold * 0.7)
    shaftUniforms.uTime.value = state.clock
    shaftUniforms.uColor.value.setRGB(...W['atmosphere.shaftColor'], SRGBColorSpace)
    // light would read as soot once the world inverts, so the finale shaft fades out
    const glow = 0.1 + hold * 0.22 + Math.exp(-state.release * 1.4) * (isFinale ? 0 : 0.5)
    shaftUniforms.uIntensity.value = glow * W['atmosphere.shaft'] * (1 - state.negative)
  })

  return (
    <group ref={root} position={[0, 0, z]}>
      <instancedMesh ref={slabs} args={[undefined, undefined, SLABS.length]}>
        <boxGeometry />
        <meshPhysicalMaterial
          color="#060608"
          roughness={0.3}
          metalness={0.3}
          clearcoat={0.55}
          clearcoatRoughness={0.12}
          envMapIntensity={0.45}
        />
      </instancedMesh>
      <instancedMesh ref={lines} args={[undefined, undefined, SLABS.length]}>
        <boxGeometry />
        <meshBasicMaterial color={[2.4, 1.85, 1.15]} toneMapped={false} />
      </instancedMesh>

      <group ref={dial} position={[0, 0.004, 0]}>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[3.08, 3.094, 256]} />
          <meshBasicMaterial color={[1.6, 1.25, 0.8]} toneMapped={false} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2}>
          <ringGeometry args={[2.62, 2.626, 256]} />
          <meshBasicMaterial color={[0.5, 0.46, 0.4]} toneMapped={false} />
        </mesh>
        <instancedMesh ref={ticks} args={[undefined, undefined, TICKS]}>
          <boxGeometry />
          <meshBasicMaterial color={[0.75, 0.68, 0.56]} toneMapped={false} />
        </instancedMesh>
      </group>

      <mesh position={[0, 7.2, 0]}>
        <cylinderGeometry args={[0.35, 3.4, 14.4, 64, 1, true]} />
        <shaderMaterial
          vertexShader={shaftVertex}
          fragmentShader={shaftFragment}
          uniforms={shaftUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}
