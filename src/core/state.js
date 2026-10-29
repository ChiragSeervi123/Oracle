// Shared, mutable experience state.
// Everything here changes every frame, so it deliberately lives outside React:
// the render loop, the UI director and the audio engine all read and write it directly.
export const state = {
  entered: false, // visitor has passed the gate
  intro: 0, // 0..1 opening dolly, tweened by GSAP

  targetC: 0, // chapter coordinate requested by scroll (0..5)
  c: 0, // damped chapter coordinate used by everything visual
  velocity: 0, // damped dc/dt

  pointer: { x: 0, y: 0 }, // normalised device coords
  pointerActive: false,
  touch: false,

  holding: false, // visitor is pressing
  locked: false, // a reading fired; must release before the next one
  hold: 0, // 0..1 charge of the reading
  heldFor: 0, // seconds held in the current attempt
  release: 99, // seconds since the last reading fired (drives the shock ripple)
  entropy: 0, // accumulated pointer movement, seeds the prophecy

  gold: 0, // easter egg: transmutation 0..1
  goldTarget: 0,
  negative: 0, // finale inversion 0..1

  touched: 0, // shards the visitor has touched
  shardCount: 0,

  cam: { x: 0, y: 0, z: 0 },
  reducedMotion: false,
  tier: 'high',
}

const listeners = new Map()

export function on(type, fn) {
  if (!listeners.has(type)) listeners.set(type, new Set())
  listeners.get(type).add(fn)
  return () => listeners.get(type)?.delete(fn)
}

export function emit(type, payload) {
  listeners.get(type)?.forEach((fn) => fn(payload))
}

// DOM nodes the frame loop writes into directly (no React re-render per frame).
export const hud = {}
