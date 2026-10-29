import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { CatmullRomCurve3, MathUtils, Vector3 } from 'three'
import { FINALE_Z, HOLD_LIMIT } from '../core/chapters.js'
import { clamp, damp, easeOutExpo, smoothstep } from '../core/math.js'
import { state } from '../core/state.js'

// Camera choreography as keyframes on the chapter coordinate.
// [c, position, look-at target]
const KEYS = [
  [0.0, [0, 1.95, 9.8], [0, 2.25, 0]],
  [0.55, [0.35, 2.0, 7.6], [0, 2.3, 0]],
  [1.0, [0, 2.2, 5.7], [0, 2.3, 0]],
  [1.55, [-0.15, 2.25, 5.2], [0, 2.3, 0]],
  [2.0, [0, 3.0, -4], [0, 3.1, -30]],
  [2.5, [0, 3.0, -42], [0, 3.0, -70]],
  [3.0, [0, 3.2, -84], [0, 3.0, -106]],
  [3.45, [5.2, 4.2, -93], [0, 3.0, -106]],
  [3.9, [0.4, 3.05, -94.5], [0, 3.0, -108]],
  [4.32, [0, 2.9, -110.5], [0, 2.45, FINALE_Z]],
  [5.0, [0, 1.8, FINALE_Z + 12.5], [0, 1.2, FINALE_Z]],
]

const KEY_C = KEYS.map((k) => k[0])

function cToU(c) {
  const x = clamp(c, KEY_C[0], KEY_C[KEY_C.length - 1])
  let i = 0
  while (i < KEY_C.length - 2 && x > KEY_C[i + 1]) i++
  const local = (x - KEY_C[i]) / (KEY_C[i + 1] - KEY_C[i])
  return (i + local) / (KEY_C.length - 1)
}

// Keep the oracle and its rings in frame on portrait screens.
function baseFov(aspect) {
  const minHorizontal = MathUtils.degToRad(31)
  const vertical = MathUtils.radToDeg(2 * Math.atan(Math.tan(minHorizontal / 2) / aspect))
  return Math.max(35, Math.min(vertical, 68))
}

export default function CameraRig() {
  const size = useThree((s) => s.size)

  const rig = useMemo(
    () => ({
      posCurve: new CatmullRomCurve3(KEYS.map((k) => new Vector3(...k[1])), false, 'centripetal'),
      lookCurve: new CatmullRomCurve3(KEYS.map((k) => new Vector3(...k[2])), false, 'centripetal'),
      pos: new Vector3(),
      look: new Vector3(),
      px: 0,
      py: 0,
    }),
    [],
  )

  useFrame(({ camera, clock }, dt) => {
    const { c } = state
    const u = cToU(c)
    rig.posCurve.getPoint(u, rig.pos)
    rig.lookCurve.getPoint(u, rig.look)

    // On wide screens the subject steps aside so the copy has room to breathe.
    const wide = size.width / size.height > 1.1
    if (wide) {
      const reading = smoothstep(0.55, 1.0, c) * (1 - smoothstep(1.5, 1.85, c))
      rig.pos.x -= reading * 1.05
      rig.look.x -= reading * 1.05
      rig.look.x += smoothstep(2.9, 3.2, c) * (1 - smoothstep(3.45, 3.8, c)) * 2.6
    }

    // Opening dolly from the dark
    const intro = 1 - easeOutExpo(state.intro)
    rig.pos.z += intro * 8.5
    rig.pos.y += intro * 1.4

    // Parallax toward the cursor (subtle, and calmer for reduced motion)
    const amount = state.reducedMotion ? 0.25 : 1
    rig.px = damp(rig.px, state.pointerActive ? state.pointer.x : 0, 2.2, dt)
    rig.py = damp(rig.py, state.pointerActive ? state.pointer.y : 0, 2.2, dt)
    rig.pos.x += rig.px * 0.42 * amount
    rig.pos.y += rig.py * 0.22 * amount

    // Being read: lean in, and tremble as the charge peaks
    const reading = c < HOLD_LIMIT + 0.2 ? state.hold * state.hold : 0
    rig.pos.lerp(rig.look, reading * 0.12)
    if (!state.reducedMotion) {
      const tremble = reading * reading * 0.012 + Math.exp(-state.release * 3) * 0.03
      const t = clock.elapsedTime
      rig.pos.x += Math.sin(t * 37.1) * tremble
      rig.pos.y += Math.sin(t * 41.7 + 1.3) * tremble
    }

    camera.position.copy(rig.pos)
    camera.lookAt(rig.look)

    // The halls roll the world around you
    const hall = smoothstep(1.9, 2.25, c) * (1 - smoothstep(2.75, 3.1, c))
    const roll = Math.sin((c - 1.9) * Math.PI * 0.9) * 0.16 * hall * amount
    camera.rotateZ(roll - rig.px * 0.015 * amount)

    const speed = clamp(Math.abs(state.velocity) * 2.4, 0, 6) * amount
    const fov = baseFov(size.width / size.height) + speed - reading * 2.5
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }

    state.cam.x = camera.position.x
    state.cam.y = camera.position.y
    state.cam.z = camera.position.z
  })

  return null
}
