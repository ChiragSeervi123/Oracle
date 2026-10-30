import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { Color, Matrix4, Quaternion, SRGBColorSpace, Vector3 } from 'three'
import { clamp, damp, smoothstep } from '../core/math.js'
import { state } from '../core/state.js'

// Hall of Echoes: a corridor of floating frames. As you travel it twists into a helix,
// it bends toward wherever you look, and a pulse of light runs ahead of you.
// The world can make it ripple like a ribbon, break out of plane, or lift.
const COUNT = 28
const START = -11
const GAP = 2.85
const HALF = 2.1
const BAR = 0.16
const DEPTH = 0.42
const CENTER_Y = 3
const INSET = HALF - BAR / 2 - 0.004

const BARS = [
  [0, HALF, 2 * HALF + BAR, BAR],
  [0, -HALF, 2 * HALF + BAR, BAR],
  [-HALF, 0, BAR, 2 * HALF - BAR],
  [HALF, 0, BAR, 2 * HALF - BAR],
]
const STRIPS = [
  [0, INSET, 2 * INSET, 0.014],
  [0, -INSET, 2 * INSET, 0.014],
  [-INSET, 0, 0.014, 2 * INSET],
  [INSET, 0, 0.014, 2 * INSET],
]

const CHROME = new Color(0.92, 0.92, 0.92)
const isChrome = (i) => i % 6 === 3

export default function Hall() {
  const bars = useRef()
  const strips = useRef()
  const root = useRef()

  const cache = useMemo(() => {
    const local = (list, depth, z) =>
      list.map(([x, y, sx, sy]) => new Matrix4().compose(new Vector3(x, y, z), new Quaternion(), new Vector3(sx, sy, depth)))
    return {
      barLocal: local(BARS, DEPTH, 0),
      stripLocal: local(STRIPS, 0.01, DEPTH / 2 + 0.004),
      frame: new Matrix4(),
      out: new Matrix4(),
      pos: new Vector3(),
      quat: new Quaternion(),
      tilt: new Quaternion(),
      one: new Vector3(1, 1, 1),
      axis: new Vector3(0, 0, 1),
      chaosAxes: Array.from({ length: COUNT }, (_, i) =>
        new Vector3(Math.sin(i * 7.3), Math.cos(i * 3.1), Math.sin(i * 1.7) * 0.3).normalize(),
      ),
      strip: new Color(),
      obsidian: new Color(),
      frameKey: '',
      bend: { x: 0, y: 0 },
    }
  }, [])

  useLayoutEffect(() => {
    for (let i = 0; i < COUNT * 4; i++) strips.current.setColorAt(i, cache.strip.setRGB(1, 0.78, 0.48))
  }, [cache])

  useFrame((_, dt) => {
    const { c } = state
    root.current.visible = (c > 1.45 && c < 3.45) || state.warming
    if (!root.current.visible) return
    const W = state.world
    const t = state.phase.hall
    const camZ = state.cam.z

    // Frame finish: obsidian frames take the world's colour, chrome frames go matte with it.
    const frame = W['hall.frame']
    const matte = W['hall.matte']
    const key = `${frame.map((v) => v.toFixed(3)).join()}|${matte.toFixed(3)}`
    if (key !== cache.frameKey) {
      cache.frameKey = key
      cache.obsidian.setRGB(frame[0], frame[1], frame[2], SRGBColorSpace)
      for (let i = 0; i < COUNT; i++) {
        const color = isChrome(i) ? cache.strip.copy(CHROME).lerp(cache.obsidian, matte) : cache.obsidian
        for (let b = 0; b < 4; b++) bars.current.setColorAt(i * 4 + b, color)
      }
      bars.current.instanceColor.needsUpdate = true
      bars.current.material.metalness = 0.92 * (1 - matte)
      bars.current.material.roughness = 0.17 + matte * 0.68
    }

    const inHall = smoothstep(1.85, 2.1, c) * (1 - smoothstep(2.9, 3.15, c))
    // Touch screens scroll with the finger, so there the hall steers itself.
    const steered = state.pointerActive && !state.touch
    const aimX = steered ? state.pointer.x : Math.sin(state.clock * 0.31) * 0.55
    const aimY = steered ? state.pointer.y : Math.cos(state.clock * 0.23) * 0.4
    cache.bend.x = damp(cache.bend.x, aimX * inHall, 2.2, dt)
    cache.bend.y = damp(cache.bend.y, aimY * inHall, 2.2, dt)
    const twist = smoothstep(1.85, 2.95, c) * 0.105 * W['hall.twist']
    const wave = camZ - 5 - ((t * 0.22) % 1) * 46
    const wobble = W['hall.wobble']
    const chaos = W['hall.chaos']
    const lift = W['hall.lift']
    const glow = W['hall.stripGlow']
    const strip = W['hall.strip']

    for (let i = 0; i < COUNT; i++) {
      const z = START - i * GAP
      const ahead = clamp((camZ - z) / 38)
      const bend = ahead * ahead
      cache.pos.set(
        cache.bend.x * 3.4 * bend + Math.sin(t * 1.3 + i * 0.45) * 0.6 * wobble,
        CENTER_Y + cache.bend.y * 1.9 * bend + Math.cos(t * 1.1 + i * 0.5) * 0.35 * wobble + lift * (0.6 + Math.sin(t * 0.7 + i * 1.7) * 0.5),
        z,
      )
      cache.quat.setFromAxisAngle(cache.axis, i * twist + Math.sin(t * 0.12 + i * 0.4) * 0.018 + Math.sin(t + i * 0.3) * 0.15 * wobble)
      if (chaos > 0.001) cache.quat.multiply(cache.tilt.setFromAxisAngle(cache.chaosAxes[i], chaos * (0.5 + Math.sin(t * 2.1 + i) * 0.6)))
      cache.frame.compose(cache.pos, cache.quat, cache.one)

      for (let b = 0; b < 4; b++) {
        bars.current.setMatrixAt(i * 4 + b, cache.out.multiplyMatrices(cache.frame, cache.barLocal[b]))
        strips.current.setMatrixAt(i * 4 + b, cache.out.multiplyMatrices(cache.frame, cache.stripLocal[b]))
      }

      const pulse = Math.exp(-(((z - wave) / 2.4) ** 2))
      cache.strip.setRGB(strip[0], strip[1], strip[2], SRGBColorSpace).multiplyScalar((0.28 + pulse * 3.2) * glow)
      for (let b = 0; b < 4; b++) strips.current.setColorAt(i * 4 + b, cache.strip)
    }
    bars.current.instanceMatrix.needsUpdate = true
    strips.current.instanceMatrix.needsUpdate = true
    strips.current.instanceColor.needsUpdate = true
  })

  return (
    <group ref={root}>
      <instancedMesh ref={bars} args={[undefined, undefined, COUNT * 4]} frustumCulled={false}>
        <boxGeometry />
        <meshPhysicalMaterial roughness={0.17} metalness={0.92} clearcoat={0.6} clearcoatRoughness={0.1} envMapIntensity={1.1} />
      </instancedMesh>
      <instancedMesh ref={strips} args={[undefined, undefined, COUNT * 4]} frustumCulled={false}>
        <boxGeometry />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
