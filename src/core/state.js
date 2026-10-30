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

  negative: 0, // finale inversion 0..1

  // The world's laws (see core/world.js): flat channels such as 'oracle.color',
  // blended every frame by the world machine.
  world: null,
  clock: 0, // world time: stops when the world is STILL, the camera does not
  phase: { oracle: 0, rings: 0, moons: 0, dust: 0, rise: 0, swirl: 0, shards: 0, hall: 0, env: 0, waves: 0, beat: 0 },
  focus: [0, 2.3, 0], // where the world's attention is: the oracle, the singularity, the finale
  ripples: [], // floor ripple events: { x, z, start, strength, color }
  ack: { start: -99, color: [1, 1, 1] }, // last command acknowledgement

  touched: 0, // shards the visitor has touched
  shardCount: 0,

  cam: { x: 0, y: 0, z: 0 },
  warming: true, // first frames behind the loader: draw everything once so every shader compiles
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
