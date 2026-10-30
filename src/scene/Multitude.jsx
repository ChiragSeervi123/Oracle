import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Euler, Matrix4, OctahedronGeometry, Quaternion, Raycaster, SRGBColorSpace, Vector2, Vector3 } from 'three'
import { MULTITUDE_CENTER, RING_Z } from '../core/chapters.js'
import { damp, mulberry32, smoothstep } from '../core/math.js'
import { state } from '../core/state.js'

// The Multitude: crystalline answers orbiting a dark singularity. They flee from the
// cursor, keep the colour of your touch, and finally gather into the portal ring.
const TAU = Math.PI * 2
const RING_RADIUS = 3.4
const CHROME = new Color(1, 1, 1)
const SMOKE = new Color(0.34, 0.34, 0.36)
const GOLD = new Color(1, 0.74, 0.4)
const UPRIGHT = new Quaternion()

const horizonVertex = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`
const horizonFragment = /* glsl */ `
uniform vec3 uColor;
varying vec3 vN;
varying vec3 vV;
void main() {
  float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.5);
  gl_FragColor = vec4(uColor * rim * 3.0, 1.0);
}
`

export default function Multitude({ tier }) {
  const count = tier === 'high' ? 1000 : 400
  const mesh = useRef()
  const root = useRef()
  const horizon = useRef()
  const light = useRef()
  const camera = useThree((s) => s.camera)

  const geometry = useMemo(() => new OctahedronGeometry(1, 0), [])
  const horizonUniforms = useMemo(() => ({ uColor: { value: new Color('#e8bf7e') } }), [])

  const shards = useMemo(() => {
    const rand = mulberry32(7)
    const tilt = new Quaternion().setFromEuler(new Euler(0.42, 0, 0.16))
    const list = []
    for (let i = 0; i < count; i++) {
      // denser toward the singularity, a thin disk that flares at the rim
      const r = 1.5 + Math.pow(rand(), 1.35) * 9.5
      const axis = new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize()
      const tone = rand()
      const spread = (rand() - 0.5) * (rand() - 0.5) * 4
      list.push({
        r,
        theta: rand() * TAU,
        h: spread * (0.25 + r / 9),
        omega: (0.42 + rand() * 0.22) / Math.sqrt(r),
        phi: (i / count) * TAU,
        ringR: RING_RADIUS + (rand() - 0.5) * (rand() - 0.5) * 1.4,
        ringZ: (rand() - 0.5) * 0.5,
        delay: rand(),
        size: 0.026 + Math.pow(rand(), 2) * 0.07,
        stretch: 1.8 + rand() * 2.2,
        axis,
        tumble: (rand() - 0.5) * 2.4,
        phase: rand() * TAU,
        flee: new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
        color: tone < 0.06 ? GOLD : tone < 0.32 ? SMOKE : CHROME,
      })
    }
    return {
      list,
      tilt,
      offsets: new Float32Array(count * 3),
      touched: new Uint8Array(count),
    }
  }, [count])

  const tmp = useMemo(
    () => ({
      m: new Matrix4(),
      p: new Vector3(),
      ring: new Vector3(),
      q: new Quaternion(),
      qRing: new Quaternion(),
      s: new Vector3(),
      diff: new Vector3(),
      closest: new Vector3(),
      ray: new Raycaster(),
      ndc: new Vector2(),
      z: new Vector3(0, 0, 1),
      center: new Vector3(...MULTITUDE_CENTER),
    }),
    [],
  )

  useLayoutEffect(() => {
    shards.list.forEach((s, i) => mesh.current.setColorAt(i, s.color))
    mesh.current.instanceColor.needsUpdate = true
    state.shardCount = count
    state.touched = 0
  }, [shards, count])

  useFrame((_, dt) => {
    const { c } = state
    root.current.visible = c > 2.35 || state.warming
    if (!root.current.visible) return
    const W = state.world
    const t = state.phase.shards
    const { list, tilt, offsets, touched } = shards

    const material = mesh.current.material
    material.color.setRGB(...W['shards.tint'], SRGBColorSpace)
    material.emissive.setRGB(...W['shards.glow'], SRGBColorSpace)
    material.metalness = 1 - W['shards.matte'] * 0.97
    material.roughness = 0.14 + W['shards.matte'] * 0.7

    const scatter = W['shards.scatter']
    const collapse = W['shards.collapse']
    const wobble = W['shards.wobble']
    const align = W['shards.align']
    const lift = W['shards.rise']

    const interactive = state.pointerActive && c > 2.75 && c < 4.15
    if (interactive) {
      tmp.ndc.set(state.pointer.x, state.pointer.y)
      tmp.ray.setFromCamera(tmp.ndc, camera)
    }
    const { origin, direction } = tmp.ray.ray
    let colorsDirty = false
    const ringSpin = t * 0.05

    for (let i = 0; i < list.length; i++) {
      const s = list[i]
      const form = smoothstep(3.35 + s.delay * 0.3, 3.72 + s.delay * 0.3, c)

      // vortex position: VOID draws it in, CHAOS throws it out
      const a = s.theta + t * s.omega * (1 + collapse * 1.5)
      const r = s.r * (1 - collapse * 0.62) * (1 + scatter * 0.35)
      tmp.p.set(Math.cos(a) * r, s.h * (1 - collapse * 0.8), Math.sin(a) * r).applyQuaternion(tilt).add(tmp.center)
      // ring position
      const phi = s.phi + ringSpin
      tmp.ring.set(Math.cos(phi) * s.ringR, 3 + Math.sin(phi) * s.ringR, RING_Z + s.ringZ)
      tmp.p.lerp(tmp.ring, form)

      if (scatter > 0.001) tmp.p.addScaledVector(s.flee, scatter * (1.8 + Math.sin(t * 1.7 + i) * 0.8))
      if (wobble > 0.001) tmp.p.y += Math.sin(t * 2 + s.r * 1.3 + s.phi * 3) * 0.35 * wobble
      if (lift > 0.001) tmp.p.y += lift * (1.4 + Math.sin(t * 0.6 + i * 0.37) * 0.7)

      // flee from the pointer ray
      let tx = 0
      let ty = 0
      let tz = 0
      if (interactive) {
        tmp.diff.copy(tmp.p).sub(origin)
        const along = tmp.diff.dot(direction)
        if (along > 0) {
          tmp.closest.copy(direction).multiplyScalar(along).add(origin)
          tmp.diff.copy(tmp.p).sub(tmp.closest)
          const dist = tmp.diff.length()
          const radius = 1.2
          if (dist < radius && dist > 1e-4) {
            const push = ((radius - dist) / dist) * 1.7 * (1 - form * 0.6)
            tx = tmp.diff.x * push
            ty = tmp.diff.y * push
            tz = tmp.diff.z * push
            if (dist < 0.75 && !touched[i]) {
              touched[i] = 1
              state.touched++
              mesh.current.setColorAt(i, GOLD)
              colorsDirty = true
            }
          }
        }
      }
      const o = i * 3
      offsets[o] = damp(offsets[o], tx, 6, dt)
      offsets[o + 1] = damp(offsets[o + 1], ty, 6, dt)
      offsets[o + 2] = damp(offsets[o + 2], tz, 6, dt)
      tmp.p.x += offsets[o]
      tmp.p.y += offsets[o + 1]
      tmp.p.z += offsets[o + 2]

      // tumbling crystal → aligned along the ring's tangent; CRYSTAL stands them upright
      tmp.q.setFromAxisAngle(s.axis, t * s.tumble * (1 + scatter * 2) + s.phase)
      tmp.qRing.setFromAxisAngle(tmp.z, phi)
      tmp.q.slerp(tmp.qRing, form)
      if (align > 0.001) tmp.q.slerp(UPRIGHT, align * (1 - form))
      tmp.s.set(s.size, s.size * s.stretch, s.size)
      mesh.current.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s))
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (colorsDirty) mesh.current.instanceColor.needsUpdate = true

    const collapseIn = 1 - smoothstep(3.35, 3.85, c)
    horizon.current.scale.setScalar(Math.max(collapseIn, 0.0001) * 0.62 * W['portal.horizonScale'])
    horizonUniforms.uColor.value.setRGB(...W['portal.horizon'], SRGBColorSpace)
    light.current.color.setRGB(...W['portal.horizon'], SRGBColorSpace)
    light.current.intensity = 45 * W['portal.light']
  })

  return (
    <group ref={root}>
      <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
        <meshStandardMaterial metalness={1} roughness={0.14} envMapIntensity={1.35} flatShading />
      </instancedMesh>
      <mesh ref={horizon} position={MULTITUDE_CENTER}>
        <sphereGeometry args={[1, 48, 48]} />
        <shaderMaterial vertexShader={horizonVertex} fragmentShader={horizonFragment} uniforms={horizonUniforms} />
      </mesh>
      <pointLight ref={light} position={MULTITUDE_CENTER} color="#efc27e" intensity={45} distance={20} decay={2} />
    </group>
  )
}
