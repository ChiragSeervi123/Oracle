import { audio } from './audio.js'
import { COMMANDS, getCommand, parseCommand } from './commands.js'
import { emit, state } from './state.js'
import { hexToRgb } from './world.js'
import { createWorldMachine } from './worldMachine.js'

// Connects the pure world machine to the running experience: world clocks, floor
// ripples, sound cues, UI events, and which hidden words this visitor has found.
export const now = () => performance.now() / 1000

const machine = createWorldMachine(now())
state.world = machine.current

const STORAGE_KEY = 'oracle:words'
const discovered = new Set()
try {
  JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]').forEach((w) => getCommand(w)?.hidden && discovered.add(w))
} catch {
  // storage can be unavailable (private mode, blocked site data): discoveries just won't persist
}

const history = []

export const lexicon = {
  history,
  known: () => COMMANDS.filter((c) => !c.hidden || discovered.has(c.word)),
  hiddenLeft: () => COMMANDS.filter((c) => c.hidden && !discovered.has(c.word)),
  active: () => machine.summary(),
}

export const worldTransition = () => machine.transition
export const worldFrom = () => machine.from
export const worldTarget = () => machine.target
export const worldProgress = (group) => machine.progress(group, now())

export function ripple(x, z, color, strength = 1) {
  state.ripples.push({ x, z, start: now(), strength, color })
  if (state.ripples.length > 6) state.ripples.shift()
}

function acknowledge(command) {
  const color = hexToRgb(command.color)
  state.ack = { start: now(), color }
  ripple(state.focus[0], state.focus[2], color, command.kind === 'reset' ? 0.7 : 1.15)
}

// Speak a word to the world. Invalid words never touch the world's state.
export function speak(input, { source = 'bar' } = {}) {
  const parsed = parseCommand(input, { discovered: [...discovered] })
  if (!parsed.ok) {
    if (parsed.reason === 'unknown') audio.murmur()
    emit('world', { status: parsed.reason, input: parsed.input, suggestion: parsed.suggestion, source })
    return { ok: false, ...parsed }
  }

  const { command } = parsed
  const result = machine.execute(command, now())
  const firstTime = command.hidden && !discovered.has(command.word)
  if (firstTime) {
    discovered.add(command.word)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...discovered]))
    } catch {
      // see above
    }
  }
  const at = history.indexOf(command.word)
  if (at !== -1) history.splice(at, 1)
  history.unshift(command.word)
  history.length = Math.min(history.length, 8)

  if (result.status !== 'already') {
    acknowledge(command)
    audio.command(command.word, result.status)
  }
  emit('world', { ...result, firstTime, source })
  return { ok: true, ...result }
}

// Called every frame by the director.
export function tickWorld(t, dt) {
  for (const event of machine.tick(t)) {
    const command = getCommand(event.word)
    audio.command(event.word, 'expired')
    emit('world', { status: 'expired', command, state: event.state })
  }

  const W = machine.current
  const step = dt * W['time.scale']
  const calm = state.reducedMotion
  const P = state.phase
  state.clock += step
  P.oracle += step * W['oracle.flow'] * (calm ? 0.5 : 1)
  P.rings += step * W['rings.speed'] * (calm ? 0.3 : 1)
  P.moons += step * W['moons.speed'] * (calm ? 0.4 : 1)
  P.dust += step * W['dust.speed'] * (calm ? 0.3 : 1)
  P.rise += step * W['dust.speed'] * W['dust.rise'] * (calm ? 0.3 : 1)
  P.swirl += step * W['dust.swirl']
  P.shards += step * W['shards.spin'] * (calm ? 0.4 : 1)
  P.hall += step
  P.env += step * W['atmosphere.envSpin'] * (calm ? 0.3 : 1)
  // Once nothing is spinning the light or the dust, they settle back to where they
  // started, so RESET really does restore the original lighting and particles.
  const settle = 1 - Math.exp(-0.8 * dt)
  if (W['atmosphere.envSpin'] < 0.01) P.env += (Math.round(P.env / (Math.PI * 2)) * Math.PI * 2 - P.env) * settle
  if (W['dust.swirl'] < 0.01) P.swirl -= P.swirl * settle
  P.waves += step * (calm ? 0.5 : 1)
  P.beat += dt * 2 // CHAOS lights pulse at 120 bpm, in real time
}
