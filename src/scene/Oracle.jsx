import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, Euler, IcosahedronGeometry, Quaternion, Raycaster, Vector2, Vector3 } from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { FINALE_Z, ORACLE_Y } from '../core/chapters.js'
import { clamp, damp, smoothstep } from '../core/math.js'
import { state } from '../core/state.js'
import { createOracleMaterial } from './oracleMaterial.js'

// Three gyroscope rings. Free, they tumble on their own axes; while the visitor
// holds, they slerp into one plane facing the camera and become the iris of an eye.
const RINGS = [
  { radius: 1.4, tube: 0.0075, gold: true, tilt: [0.9, 0.3, 0.2], axis: [0.2, 1, 0.3], speed: 0.31, spin: 0.55 },
  { radius: 1.73, tube: 0.014, gold: false, tilt: [0.2, 1.1, 0.5], axis: [1, 0.25, 0.1], speed: -0.21, spin: -0.38 },
  { radius: 2.06, tube: 0.006, gold: true, tilt: [1.3, -0.4, 0.9], axis: [0.3, 0.4, 1], speed: 0.14, spin: 0.22 },
]

const Z = new Vector3(0, 0, 1)
const WHITE = new Color('#ffffff')
const GOLD = new Color('#e9c27c')

export default function Oracle({ tier }) {
  const group = useRef()
  const blob = useRef()
  const ringRefs = useRef([])
  const light = useRef()
  const camera = useThree((s) => s.camera)

  const geometry = useMemo(() => {
    const geo = new IcosahedronGeometry(1, tier === 'high' ? 72 : 36)
    geo.deleteAttribute('uv')
    return mergeVertices(geo)
  }, [tier])

  const material = useMemo(() => createOracleMaterial(), [])
  const goldMaterialProps = { color: '#e2c290', metalness: 1, roughness: 0.22, emissive: '#d9b77e' }

  const tmp = useMemo(
    () => ({
      ray: new Raycaster(),
      ndc: new Vector2(),
      eye: new Vector3(),
      closest: new Vector3(),
      toCenter: new Vector3(),
      pointerDir: new Vector3(0, 0, 1),
      qFree: new Quaternion(),
      qTilt: new Quaternion(),
      qAlign: new Quaternion(),
      qSpin: new Quaternion(),
      axes: RINGS.map((r) => new Vector3(...r.axis).normalize()),
      tilts: RINGS.map((r) => new Quaternion().setFromEuler(new Euler(...r.tilt))),
      strength: 0,
      lock: 0,
    }),
    [],
  )

  useFrame(({ clock }, dt) => {
    const g = group.current
    if (!g) return
    const { c } = state
    const t = clock.elapsedTime
    const u = material.userData.uniforms

    // Choreography: the oracle withdraws upward before the halls, and descends
    // again into the mirrored chamber at the end of the journey.
    const rise = smoothstep(1.5, 1.95, c)
    const descend = 1 - smoothstep(3.95, 4.75, c)
    let travel
    if (c < 2.8) {
      travel = rise
      g.position.set(0, ORACLE_Y + rise * rise * 14, 0)
    } else {
      travel = descend
      g.position.set(0, ORACLE_Y + descend * descend * 12, FINALE_Z)
    }
    g.visible = travel < 0.999
    if (!g.visible) return

    const stretch = Math.sin(Math.PI * travel)
    const breathe = 1 + Math.sin(t * 0.8) * 0.012
    blob.current.scale.set(breathe * (1 - 0.32 * stretch), breathe * (1 + 0.85 * stretch), breathe * (1 - 0.32 * stretch))

    // In the finale the eye is open on its own: it was looking at you all along.
    const finaleGaze = smoothstep(4.5, 4.95, c) * 0.82
    const holdVis = Math.max(smoothstep(0, 1, state.hold), finaleGaze)

    // Direction to the camera in the oracle's frame
    tmp.eye.copy(camera.position).sub(g.position).normalize()

    // Lean toward the cursor: closest point on the pointer ray to the oracle's centre.
    tmp.ndc.set(state.pointer.x, state.pointer.y)
    tmp.ray.setFromCamera(tmp.ndc, camera)
    tmp.ray.ray.closestPointToPoint(g.position, tmp.closest)
    tmp.toCenter.copy(tmp.closest).sub(g.position)
    const dist = tmp.toCenter.length()
    const want = state.pointerActive && !state.touch ? smoothstep(4.2, 0.6, dist) * (1 - holdVis) : 0
    tmp.strength = damp(tmp.strength, want, 3, dt)
    if (dist > 1e-4) tmp.pointerDir.lerp(tmp.toCenter.normalize(), 1 - Math.exp(-5 * dt)).normalize()

    u.uTime.value = t * (state.reducedMotion ? 0.5 : 1)
    u.uHold.value = holdVis
    u.uRipple.value = state.release
    u.uAgitation.value = clamp(Math.abs(state.velocity) * 0.6 + state.hold * state.hold)
    u.uPointerStrength.value = tmp.strength
    u.uPointerDir.value.copy(tmp.pointerDir)
    u.uEye.value.copy(tmp.eye)

    material.color.lerpColors(WHITE, GOLD, state.gold)
    material.iridescence = 0.32 * (1 - state.gold)

    // Gyroscope
    tmp.lock = damp(tmp.lock, holdVis, 4, dt)
    const lock = tmp.lock * tmp.lock * (3 - 2 * tmp.lock)
    tmp.qAlign.setFromUnitVectors(Z, tmp.eye)
    const spinRate = state.reducedMotion ? 0.3 : 1
    ringRefs.current.forEach((ring, i) => {
      if (!ring) return
      const cfg = RINGS[i]
      tmp.qFree.setFromAxisAngle(tmp.axes[i], t * cfg.speed * spinRate).multiply(tmp.tilts[i])
      ring.quaternion.slerpQuaternions(tmp.qFree, tmp.qAlign, lock)
      tmp.qSpin.setFromAxisAngle(Z, t * cfg.spin * (1 + lock * 2.5) * spinRate)
      ring.quaternion.multiply(tmp.qSpin)
      const scale = 1 + lock * (i === 0 ? -0.08 : i === 2 ? 0.06 : 0)
      ring.scale.setScalar(scale)
      const mat = ring.children[0].material
      if (cfg.gold) mat.emissiveIntensity = (0.5 + lock * 3.5 + Math.exp(-state.release * 1.5) * 6) * (1 - state.negative * 0.75)
    })

    light.current.intensity = 2 + holdVis * 55 + Math.exp(-state.release * 1.2) * 120
  })

  return (
    <group ref={group} position={[0, ORACLE_Y, 0]}>
      <mesh ref={blob} geometry={geometry} material={material} />
      {RINGS.map((ring, i) => (
        <group key={i} ref={(el) => (ringRefs.current[i] = el)}>
          <mesh>
            <torusGeometry args={[ring.radius, ring.tube, 10, 280]} />
            {ring.gold ? (
              <meshStandardMaterial {...goldMaterialProps} emissiveIntensity={0.5} />
            ) : (
              <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.12} />
            )}
          </mesh>
          <mesh position={[ring.radius, 0, 0]}>
            <sphereGeometry args={[ring.tube * 4.2 + 0.012, 20, 20]} />
            <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.08} />
          </mesh>
        </group>
      ))}
      <pointLight ref={light} color="#f0c27f" intensity={2} distance={16} decay={2} position={[0, -0.4, 0.8]} />
    </group>
  )
}
