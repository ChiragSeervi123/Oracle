import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  Color,
  Euler,
  IcosahedronGeometry,
  Matrix4,
  OctahedronGeometry,
  Quaternion,
  Raycaster,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { FINALE_Z, ORACLE_Y } from '../core/chapters.js'
import { getCommand } from '../core/commands.js'
import { clamp, damp, smoothstep } from '../core/math.js'
import { state } from '../core/state.js'
import { hexToRgb } from '../core/world.js'
import { worldFrom, worldProgress, worldTarget, worldTransition } from '../core/worldRuntime.js'
import { createOracleMaterial } from './oracleMaterial.js'

// Three gyroscope rings. Free, they tumble on their own axes; while the visitor
// holds, they slerp into one plane facing the camera and become the iris of an eye.
// World commands can also fold them into an accretion disk, a crystal cage, a wobble
// or a storm.
const RINGS = [
  { radius: 1.4, tube: 0.0075, gold: true, tilt: [0.9, 0.3, 0.2], axis: [0.2, 1, 0.3], speed: 0.31, spin: 0.55 },
  { radius: 1.73, tube: 0.014, gold: false, tilt: [0.2, 1.1, 0.5], axis: [1, 0.25, 0.1], speed: -0.21, spin: -0.38 },
  { radius: 2.06, tube: 0.006, gold: true, tilt: [1.3, -0.4, 0.9], axis: [0.3, 0.4, 1], speed: 0.14, spin: 0.22 },
]

// Small artifacts on inclined orbits outside the rings.
const MOONS = [
  { r: 2.5, incl: 0.42, node: 0.2, speed: 0.62, size: 0.05, phase: 0 },
  { r: 2.75, incl: -0.3, node: 1.4, speed: 0.48, size: 0.04, phase: 2.1 },
  { r: 3.0, incl: 0.85, node: 2.6, speed: 0.4, size: 0.06, phase: 4.0 },
  { r: 2.35, incl: -0.65, node: 3.7, speed: 0.7, size: 0.035, phase: 1.2 },
  { r: 3.25, incl: 0.15, node: 5.0, speed: 0.33, size: 0.045, phase: 5.2 },
  { r: 2.9, incl: 1.1, node: 0.9, speed: 0.52, size: 0.03, phase: 3.3 },
]

const X = new Vector3(1, 0, 0)
const Y = new Vector3(0, 1, 0)
const Z = new Vector3(0, 0, 1)
const ORBIT = RINGS.map((_, i) =>
  new Quaternion().setFromAxisAngle(X, (i - 1) * 0.07).multiply(new Quaternion().setFromUnitVectors(Z, Y)),
)
// three orthogonal rings, turned so that none of them is seen edge-on
const CAGE_TURN = new Quaternion().setFromEuler(new Euler(0.42, 0.62, 0.18))
const CAGE = [X, Y, Z].map((axis) => new Quaternion().setFromUnitVectors(Z, axis).premultiply(CAGE_TURN))
const srgb = (color, rgb) => color.setRGB(rgb[0], rgb[1], rgb[2], SRGBColorSpace)
const randomAxis = (seed) => new Vector3(Math.sin(seed * 12.9), Math.cos(seed * 78.2), Math.sin(seed * 37.7)).normalize()

export default function Oracle({ tier }) {
  const group = useRef()
  const blob = useRef()
  const ringRefs = useRef([])
  const moons = useRef()
  const light = useRef()
  const camera = useThree((s) => s.camera)

  const geometry = useMemo(() => {
    const geo = new IcosahedronGeometry(1, tier === 'high' ? 72 : 36)
    geo.deleteAttribute('uv')
    return mergeVertices(geo)
  }, [tier])

  const moonGeometry = useMemo(() => new OctahedronGeometry(1, 0), [])
  const material = useMemo(() => createOracleMaterial(), [])
  const goldMaterialProps = { color: '#e2c290', metalness: 1, roughness: 0.22, emissive: '#d9b77e' }

  const tmp = useMemo(
    () => ({
      ray: new Raycaster(),
      ndc: new Vector2(),
      eye: new Vector3(),
      gaze: new Vector3(0, 0, 1),
      gazePoint: new Vector3(),
      closest: new Vector3(),
      toCenter: new Vector3(),
      pointerDir: new Vector3(0, 0, 1),
      qAlign: new Quaternion(),
      qSpin: new Quaternion(),
      qWobble: new Quaternion(),
      qChaos: new Quaternion(),
      qMix: new Quaternion(),
      axes: RINGS.map((r) => new Vector3(...r.axis).normalize()),
      tilts: RINGS.map((r) => new Quaternion().setFromEuler(new Euler(...r.tilt))),
      wobbleAxes: RINGS.map((_, i) => randomAxis(i + 1.3)),
      chaosAxes: RINGS.map((_, i) => randomAxis(i + 7.1)),
      spins: RINGS.map(() => 0),
      scatter: MOONS.map((_, i) => randomAxis(i + 3.7)),
      matrix: new Matrix4(),
      p: new Vector3(),
      q: new Quaternion(),
      s: new Vector3(),
      euler: new Euler(0, 0, 0, 'YXZ'),
      tumble: new Euler(),
      frontColor: new Color(),
      strength: 0,
      lock: 0,
      chaosPhase: 0,
    }),
    [],
  )

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    const W = state.world
    const P = state.phase
    const { c } = state
    const u = material.userData.uniforms

    // Choreography: the oracle withdraws upward before the halls, and descends
    // again into the mirrored chamber at the end of the journey.
    const rise = smoothstep(1.5, 1.95, c)
    const descend = 1 - smoothstep(3.95, 4.75, c)
    const levitate = W['oracle.rise'] * 0.55
    let travel
    if (c < 2.8) {
      travel = rise
      g.position.set(0, ORACLE_Y + levitate + rise * rise * 14, 0)
    } else {
      travel = descend
      g.position.set(0, ORACLE_Y + levitate + descend * descend * 12, FINALE_Z)
    }
    g.visible = travel < 0.999
    if (!g.visible) return

    const stretch = Math.sin(Math.PI * travel)
    const breathe = (1 + Math.sin(state.clock * 0.8) * 0.012) * W['oracle.scale']
    blob.current.scale.set(breathe * (1 - 0.32 * stretch), breathe * (1 + 0.85 * stretch), breathe * (1 - 0.32 * stretch))

    // In the finale the eye is open on its own: it was looking at you all along.
    // WATCH opens it too, and points it at the cursor.
    const gazeAmount = W['oracle.gaze']
    const finaleGaze = smoothstep(4.5, 4.95, c) * 0.82
    const holdVis = Math.max(smoothstep(0, 1, state.hold), finaleGaze, gazeAmount * 0.9)

    tmp.ndc.set(state.pointer.x, state.pointer.y)
    tmp.ray.setFromCamera(tmp.ndc, camera)
    tmp.eye.copy(camera.position).sub(g.position).normalize()
    if (gazeAmount > 0.001) {
      tmp.ray.ray.at(camera.position.distanceTo(g.position) * 0.45, tmp.gazePoint)
      tmp.gazePoint.sub(g.position).normalize()
      tmp.gaze.lerp(tmp.gazePoint, 1 - Math.exp(-6 * dt)).normalize()
      tmp.eye.lerp(tmp.gaze, gazeAmount).normalize()
    }

    // Lean toward the cursor: closest point on the pointer ray to the oracle's centre.
    tmp.ray.ray.closestPointToPoint(g.position, tmp.closest)
    tmp.toCenter.copy(tmp.closest).sub(g.position)
    const dist = tmp.toCenter.length()
    const react = clamp(W['oracle.react'], 0, 2.5)
    const want = state.pointerActive && !state.touch ? smoothstep(4.2, 0.6, dist) * (1 - holdVis) * react : 0
    tmp.strength = damp(tmp.strength, want, 3, dt)
    if (dist > 1e-4) tmp.pointerDir.lerp(tmp.toCenter.normalize(), 1 - Math.exp(-5 * dt)).normalize()

    u.uTime.value = P.oracle
    u.uHold.value = holdVis
    u.uRipple.value = state.release
    u.uAgitation.value = clamp(Math.abs(state.velocity) * 0.6 + state.hold * state.hold + W['rings.chaos'] * 0.6)
    u.uPointerStrength.value = tmp.strength
    u.uPointerDir.value.copy(tmp.pointerDir)
    u.uEye.value.copy(tmp.eye)
    u.uDisplacement.value = W['oracle.displacement']
    u.uLiquid.value = W['oracle.liquid']
    u.uCrystal.value = W['oracle.crystal']
    u.uRise.value = W['oracle.rise']
    u.uGemSpin.value = P.oracle * 0.12
    u.uMolten.value = W['oracle.molten'] * (0.78 + 0.22 * Math.sin(state.clock * 2.3))
    srgb(u.uMoltenColor.value, W['oracle.moltenColor'])
    srgb(u.uIris.value, W['rings.gold'])

    // The new material spreads from the eye: from/to come straight from the world
    // machine, and the front advances with the oracle's share of the transition.
    const from = worldFrom()
    const to = worldTarget()
    srgb(u.uFromColor.value, from['oracle.color'])
    srgb(u.uToColor.value, to['oracle.color'])
    u.uFromSurface.value.set(from['oracle.metalness'], from['oracle.roughness'])
    u.uToSurface.value.set(to['oracle.metalness'], to['oracle.roughness'])
    srgb(u.uFromGlow.value, from['oracle.glow'])
    srgb(u.uToGlow.value, to['oracle.glow'])
    const p = worldProgress('oracle')
    u.uFront.value = p * 3.6
    const cause = getCommand(worldTransition().cause ?? '')
    if (cause && p > 0 && p < 1) srgb(u.uFrontColor.value, hexToRgb(cause.color)).multiplyScalar(Math.sin(p * Math.PI) * 2.2)
    else u.uFrontColor.value.setRGB(0, 0, 0)

    material.iridescence = Math.max(0.001, W['oracle.iridescence'])
    material.clearcoat = Math.max(0.001, W['oracle.clearcoat'])
    material.envMapIntensity = W['oracle.env']

    // Gyroscope
    tmp.lock = damp(tmp.lock, holdVis, 4, dt)
    const lock = tmp.lock * tmp.lock * (3 - 2 * tmp.lock)
    tmp.qAlign.setFromUnitVectors(Z, tmp.eye)
    const orbit = W['rings.orbit']
    const cage = W['rings.cage']
    const wobble = W['rings.wobble']
    const chaos = W['rings.chaos']
    const ringStep = dt * W['time.scale'] * W['rings.speed'] * (state.reducedMotion ? 0.3 : 1)
    tmp.chaosPhase += dt * chaos * 2.6 * (state.reducedMotion ? 0.3 : 1)
    const matte = W['rings.matte']
    const flash = Math.exp(-state.release * 1.5) * 6

    ringRefs.current.forEach((ring, i) => {
      if (!ring) return
      const cfg = RINGS[i]
      const q = ring.quaternion
      q.setFromAxisAngle(tmp.axes[i], P.rings * cfg.speed).multiply(tmp.tilts[i])
      if (orbit > 0.001) q.slerp(ORBIT[i], orbit)
      if (cage > 0.001) q.slerp(CAGE[i], cage)
      if (wobble > 0.001) q.multiply(tmp.qWobble.setFromAxisAngle(tmp.wobbleAxes[i], Math.sin(P.rings * 1.9 + i * 2.1) * 0.38 * wobble))
      if (chaos > 0.001) {
        tmp.qChaos.setFromAxisAngle(tmp.chaosAxes[i], tmp.chaosPhase * (1.3 + i * 0.9))
        q.slerp(tmp.qMix.copy(tmp.qChaos).multiply(q), chaos)
      }
      q.slerp(tmp.qAlign, lock)
      tmp.spins[i] += ringStep * cfg.spin * (1 + lock * 2.5)
      q.multiply(tmp.qSpin.setFromAxisAngle(Z, tmp.spins[i]))

      const scale = W['rings.radius'] * (1 + W['rings.spread'] * (i - 1) * 0.55) * (1 + lock * (i === 0 ? -0.08 : i === 2 ? 0.06 : 0))
      ring.scale.setScalar(scale)
      ring.position.y = W['rings.lift'] * (i - 1) * 0.5

      const [band, bead] = ring.children
      if (cfg.gold) {
        srgb(band.material.color, W['rings.gold'])
        srgb(band.material.emissive, W['rings.gold'])
        band.material.emissiveIntensity = (0.5 + lock * 3.5 + flash) * (1 - state.negative * 0.75) * W['rings.glow']
      } else {
        srgb(band.material.color, W['rings.chrome'])
      }
      band.material.metalness = 1 - matte * 0.97
      band.material.roughness = (cfg.gold ? 0.22 : 0.12) + matte * 0.65
      srgb(bead.material.color, W['rings.chrome'])
      bead.material.metalness = band.material.metalness
      bead.material.roughness = 0.08 + matte * 0.7
    })

    // Orbiting artifacts
    const m = moons.current
    srgb(m.material.color, W['moons.color'])
    m.material.metalness = 1 - W['moons.matte'] * 0.97
    m.material.roughness = 0.1 + W['moons.matte'] * 0.7
    const inward = W['moons.inward']
    const scatter = W['moons.scatter']
    MOONS.forEach((moon, i) => {
      const r = moon.r * W['moons.radius'] * (1 - inward * 0.6)
      const angle = moon.phase + P.moons * moon.speed * (1 + inward * 1.6)
      tmp.p.set(Math.cos(angle) * r, 0, Math.sin(angle) * r).applyEuler(tmp.euler.set(moon.incl, moon.node, 0))
      tmp.p.addScaledVector(tmp.scatter[i], scatter * (1.4 + Math.sin(state.clock * 2 + i) * 0.4))
      tmp.q.setFromEuler(tmp.tumble.set(P.moons * 1.3 + i, P.moons * 0.9 + i * 2, 0))
      tmp.s.setScalar(moon.size * (1 - inward * 0.35))
      m.setMatrixAt(i, tmp.matrix.compose(tmp.p, tmp.q, tmp.s))
    })
    m.instanceMatrix.needsUpdate = true

    srgb(light.current.color, W['rings.gold'])
    light.current.intensity = (2 + holdVis * 55 + Math.exp(-state.release * 1.2) * 120) * Math.max(W['rings.glow'], 0.15)
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
      <instancedMesh ref={moons} args={[moonGeometry, undefined, MOONS.length]} frustumCulled={false}>
        <meshStandardMaterial metalness={1} roughness={0.1} flatShading />
      </instancedMesh>
      <pointLight ref={light} color="#f0c27f" intensity={2} distance={16} decay={2} position={[0, -0.4, 0.8]} />
    </group>
  )
}
