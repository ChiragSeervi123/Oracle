// The laws of the world, as data.
// DEFAULT_WORLD is the obsidian-and-chrome baseline. FORMS are mutually exclusive
// states the world can take; MODIFIERS layer on top of whichever form is active.
// Preset values either replace a default or adjust it: ['mul', k], ['add', k], ['max', k].
// Pure JavaScript (no three.js, no DOM) so it can be unit-tested in Node.

export const DEFAULT_WORLD = {
  time: { scale: 1 },
  oracle: {
    color: '#ffffff',
    metalness: 1,
    roughness: 0.055,
    iridescence: 0.32,
    clearcoat: 0.5,
    env: 1.2,
    glow: '#000000',
    displacement: 1,
    flow: 1,
    liquid: 0,
    crystal: 0,
    molten: 0,
    moltenColor: '#ff7a1a',
    rise: 0,
    react: 1,
    gaze: 0,
    scale: 1,
  },
  rings: {
    gold: '#e2c290',
    chrome: '#ffffff',
    glow: 1,
    matte: 0,
    speed: 1,
    radius: 1,
    spread: 0,
    orbit: 0,
    cage: 0,
    wobble: 0,
    chaos: 0,
    lift: 0,
  },
  moons: { color: '#ffffff', matte: 0, speed: 1, radius: 1, scatter: 0, inward: 0 },
  dust: {
    color: '#f1d7a8',
    opacity: 1,
    size: 1,
    density: 1,
    speed: 1,
    rise: 1,
    turbulence: 0,
    well: 0,
    swirl: 0,
  },
  atmosphere: {
    background: '#050505',
    fog: '#050505',
    fogNear: 13,
    fogFar: 46,
    env: 1,
    envSpin: 0,
    horizon: '#17110b',
    exposure: 1,
    tint: '#ffffff',
    saturation: 1,
    contrast: 1,
    bloom: 1,
    aberration: 0,
    strobe: 0,
    lens: 0,
    shaft: 1,
    shaftColor: '#f6e2bd',
  },
  floor: { color: '#0b0b0c', reflect: 1, roughness: 0.92, ripple: 0, rippleColor: '#f0d2a0' },
  monoliths: { color: '#060608', roughness: 0.3, line: '#ffe4b8', lineGlow: 2.4, float: 0 },
  hall: { strip: '#ffe4b8', stripGlow: 1, frame: '#353538', matte: 0, twist: 1, wobble: 0, chaos: 0, lift: 0 },
  shards: { tint: '#ffffff', glow: '#000000', matte: 0, spin: 1, scatter: 0, collapse: 0, wobble: 0, align: 0, rise: 0 },
  portal: { horizon: '#e8bf7e', horizonScale: 1, light: 1 },
  structures: { spires: 0 },
  audio: { brightness: 1, shimmer: 0, level: 1 },
}

export const FORMS = {
  gold: {
    oracle: { color: '#ffc45c', roughness: 0.09, iridescence: 0.04, molten: 1, env: 1.4, displacement: 1.12 },
    rings: { gold: '#ffcd6a', chrome: '#f3c56c', glow: 1.8 },
    moons: { color: '#ffd27a' },
    dust: { color: '#ffae3d', size: 1.3, rise: 2.8, turbulence: 0.3 },
    atmosphere: {
      background: '#070402',
      fog: '#080503',
      horizon: '#3b2208',
      tint: '#ffe8c8',
      saturation: 1.08,
      bloom: 1.3,
      shaft: 1.8,
      shaftColor: '#ffc978',
    },
    floor: { color: '#120a03', rippleColor: '#ffbd55' },
    monoliths: { color: '#0a0604', line: '#ffc978', lineGlow: 3.4 },
    hall: { strip: '#ffc35a', stripGlow: 1.6, frame: '#3a2a12' },
    shards: { tint: '#ffd27a', glow: '#1a0d00' },
    portal: { horizon: '#ffb347', light: 1.6 },
    audio: { brightness: 1.35, shimmer: 0.2 },
  },

  void: {
    oracle: {
      color: '#08080a',
      roughness: 0.03,
      iridescence: 0.02,
      clearcoat: 1,
      env: 0.7,
      displacement: 0.45,
      flow: 0.45,
      scale: 0.86,
    },
    rings: { gold: '#ffb36b', chrome: '#2b2b33', glow: 2.6, speed: 2.4, orbit: 1, spread: 0.55 },
    moons: { color: '#b9b2a8', inward: 1, speed: 2.2 },
    dust: { color: '#a49a90', opacity: 0.85, density: 0.75, rise: 0, well: 1, swirl: 1.4, speed: 0.8 },
    atmosphere: {
      background: '#020202',
      fog: '#020202',
      fogNear: 5,
      fogFar: 30,
      env: 0.4,
      horizon: '#000000',
      exposure: 0.92,
      saturation: 0.55,
      tint: '#dfe3ff',
      bloom: 1.35,
      lens: 1,
      shaft: 0.15,
    },
    floor: { color: '#050506', reflect: 0.75 },
    monoliths: { lineGlow: 0.35 },
    hall: { stripGlow: 0.45, frame: '#141418' },
    shards: { collapse: 0.65, spin: 2.2, tint: '#9a948c' },
    portal: { horizonScale: 1.7, horizon: '#ffa94d', light: 0.6 },
    audio: { brightness: 0.55, level: 1.25 },
  },

  liquid: {
    oracle: { color: '#eef4f8', roughness: 0.015, iridescence: 0.55, displacement: 1.3, flow: 2.1, liquid: 1, react: 1.6 },
    rings: { wobble: 1, speed: 0.75 },
    moons: { speed: 0.7 },
    dust: { turbulence: 1, speed: 1.7, swirl: 0.35, size: 1.1 },
    atmosphere: { tint: '#e6f3ff', envSpin: 0.06, bloom: 1.05, horizon: '#0d1418' },
    floor: { ripple: 1, reflect: 1.2, roughness: 0.86, rippleColor: '#cfe8ff' },
    hall: { wobble: 1 },
    shards: { wobble: 1, spin: 0.8 },
    audio: { brightness: 1.1, shimmer: 0.1 },
  },

  crystal: {
    oracle: {
      crystal: 1,
      color: '#d6ecff',
      metalness: 0.92,
      roughness: 0.07,
      iridescence: 1,
      clearcoat: 1,
      env: 1.1,
      displacement: 0.2,
      flow: 0.25,
      glow: '#06101a',
    },
    rings: { cage: 1, gold: '#d4efff', chrome: '#eef8ff', glow: 1.15, speed: 0.6 },
    moons: { color: '#d8f0ff' },
    dust: { color: '#d9efff', size: 0.75, speed: 0.35, rise: 0.4 },
    atmosphere: {
      background: '#030509',
      fog: '#04060a',
      horizon: '#0e1b2b',
      tint: '#e0efff',
      saturation: 0.82,
      contrast: 1.12,
      bloom: 1.2,
      shaftColor: '#d2e8ff',
    },
    floor: { color: '#080b10', reflect: 1.15, roughness: 0.75, rippleColor: '#bfe3ff' },
    monoliths: { color: '#070a10', line: '#bfe3ff', lineGlow: 2.8 },
    hall: { strip: '#cfe9ff', frame: '#2a3440' },
    shards: { tint: '#e4f6ff', align: 1, spin: 0.5 },
    portal: { horizon: '#a8dcff' },
    structures: { spires: 1 },
    audio: { brightness: 1.5, shimmer: 0.35 },
  },

  medusa: {
    time: { scale: 0.3 },
    oracle: { color: '#8c877f', metalness: 0.02, roughness: 0.82, iridescence: 0.001, clearcoat: 0.001, env: 0.75, displacement: 0.9 },
    rings: { gold: '#8c877f', chrome: '#7d786f', glow: 0, matte: 1 },
    moons: { color: '#8c877f', matte: 1 },
    dust: { color: '#a19b91', speed: 0.5 },
    atmosphere: { saturation: 0, contrast: 1.08, tint: '#f4f1ea', bloom: 0.55, horizon: '#161514', shaft: 0.6, shaftColor: '#e8e4dc' },
    floor: { color: '#121110', reflect: 0.45 },
    monoliths: { color: '#2c2a27', roughness: 0.9, lineGlow: 0.3, line: '#d6d2ca' },
    hall: { strip: '#bdb8ae', stripGlow: 0.6, frame: '#3a3834', matte: 1 },
    shards: { tint: '#8c877f', matte: 1 },
    portal: { horizon: '#c9c4ba', light: 0.6 },
    audio: { brightness: 0.7, level: 0.85 },
  },
}

export const MODIFIERS = {
  gravity: {
    oracle: { rise: 1 },
    rings: { lift: 1 },
    dust: { rise: 7 },
    monoliths: { float: 1 },
    hall: { lift: 1 },
    shards: { rise: 1 },
  },
  watch: {
    oracle: { gaze: 1 },
  },
  still: {
    time: { scale: 0 },
    atmosphere: { saturation: ['mul', 0.85], contrast: ['mul', 1.04] },
    audio: { level: ['mul', 0.35] },
  },
  chaos: {
    time: { scale: ['max', 1.6] },
    oracle: { flow: ['mul', 3], displacement: ['mul', 1.5], react: 3 },
    rings: { chaos: 1, speed: ['mul', 3.5], spread: ['add', 0.4] },
    moons: { scatter: 1, speed: ['mul', 3] },
    dust: { turbulence: ['add', 2], speed: ['mul', 2.5] },
    atmosphere: { envSpin: ['add', 1.1], bloom: ['mul', 1.35], aberration: 1, strobe: 1 },
    floor: { ripple: ['add', 0.6] },
    hall: { chaos: 1 },
    shards: { scatter: 1, spin: ['mul', 3] },
    audio: { brightness: ['mul', 1.4] },
  },
}

// Modifiers always apply in this order, whatever order they were spoken in.
export const MODIFIER_ORDER = ['gravity', 'watch', 'still', 'chaos']

// When each system starts changing and how long it takes, in seconds: the change
// starts at the oracle and travels outward through the world.
export const TIMING = {
  time: [0, 1.2],
  oracle: [0, 1.5],
  rings: [0.12, 1.6],
  moons: [0.18, 1.6],
  audio: [0, 1.6],
  floor: [0.3, 1.9],
  atmosphere: [0.25, 2.2],
  dust: [0.45, 2.2],
  monoliths: [0.55, 2],
  hall: [0.55, 2],
  shards: [0.55, 2],
  portal: [0.55, 2],
  structures: [0.7, 2.6],
}

// Per-command pacing: a multiplier on TIMING and an easing curve.
export const PACING = {
  gold: [1, 'inOut'],
  void: [1.35, 'inOut'],
  liquid: [0.9, 'inOut'],
  crystal: [1.15, 'inOut'],
  medusa: [1.7, 'inOut'],
  reset: [1.1, 'inOut'],
  still: [0.9, 'out'],
  gravity: [1.25, 'inOut'],
  watch: [0.7, 'inOut'],
  chaos: [0.45, 'out'],
  calm: [1.2, 'inOut'],
}

export const EASING = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -9 * t)),
}

export function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16)
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255]
}

const isColor = (v) => typeof v === 'string' && v.startsWith('#')

function apply(base, override) {
  if (!Array.isArray(override)) return override
  const [op, k] = override
  if (op === 'mul') return base * k
  if (op === 'add') return base + k
  if (op === 'max') return Math.max(base, k)
  throw new Error(`Unknown world operation "${op}"`)
}

// DEFAULT ⊕ form ⊕ modifiers → a complete world description.
export function composeWorld(form = null, modifiers = []) {
  const world = structuredClone(DEFAULT_WORLD)
  const layers = []
  if (form) layers.push(FORMS[form])
  MODIFIER_ORDER.filter((m) => modifiers.includes(m)).forEach((m) => layers.push(MODIFIERS[m]))
  for (const layer of layers) {
    for (const [group, values] of Object.entries(layer)) {
      for (const [key, value] of Object.entries(values)) world[group][key] = apply(world[group][key], value)
    }
  }
  return world
}

// Nested world → flat channels ('oracle.color' → [r, g, b] in sRGB 0..1).
export function flattenWorld(world) {
  const flat = {}
  for (const [group, values] of Object.entries(world)) {
    for (const [key, value] of Object.entries(values)) flat[`${group}.${key}`] = isColor(value) ? hexToRgb(value) : value
  }
  return flat
}

export const CHANNELS = Object.keys(flattenWorld(DEFAULT_WORLD))
export const groupOf = (channel) => channel.slice(0, channel.indexOf('.'))
