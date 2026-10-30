import { getCommand } from './commands.js'
import { CHANNELS, EASING, PACING, TIMING, composeWorld, flattenWorld, groupOf } from './world.js'

const copy = (value) => (Array.isArray(value) ? value.slice() : value)
const snapshot = (values) => Object.fromEntries(CHANNELS.map((c) => [c, copy(values[c])]))
const GROUP = Object.fromEntries(CHANNELS.map((c) => [c, groupOf(c)]))

// Owns which form and modifiers are active, and blends every world channel from where
// it currently is toward the composed target. Every retarget starts from the live
// values, so commands can interrupt each other at any moment without a jump.
// Pure: time is always passed in (seconds), nothing touches the DOM or three.js.
export function createWorldMachine(now = 0) {
  const current = flattenWorld(composeWorld())
  let from = snapshot(current)
  let target = snapshot(current)
  let transition = { start: now - 1e3, tempo: 1, ease: 'inOut', cause: null }
  let form = null
  const toggles = new Set()
  const timers = new Map() // temporary command → expiry time

  const modifiers = () => [...toggles, ...timers.keys()]

  function summary() {
    return {
      form,
      modifiers: [...toggles].sort(),
      temporary: [...timers.keys()],
      pristine: !form && toggles.size === 0 && timers.size === 0,
    }
  }

  function retarget(t, pace, cause) {
    from = snapshot(current)
    target = flattenWorld(composeWorld(form, modifiers()))
    const [tempo, ease] = PACING[pace] ?? PACING.gold
    transition = { start: t, tempo, ease, cause }
  }

  function progress(group, t) {
    const [delay, duration] = TIMING[group]
    const x = (t - transition.start - delay * transition.tempo) / (duration * transition.tempo)
    if (x <= 0) return 0
    if (x >= 1) return 1
    return EASING[transition.ease](x)
  }

  function execute(commandOrWord, t) {
    const command = typeof commandOrWord === 'string' ? getCommand(commandOrWord) : commandOrWord
    if (!command) return { status: 'unknown', command: null, state: summary() }
    let status = 'already'

    if (command.kind === 'reset') {
      if (!summary().pristine) {
        form = null
        toggles.clear()
        timers.clear()
        retarget(t, 'reset', command.word)
        status = 'reset'
      }
    } else if (command.kind === 'form') {
      if (form !== command.word) {
        form = command.word
        retarget(t, command.word, command.word)
        status = 'activated'
      }
    } else if (command.kind === 'toggle') {
      status = toggles.delete(command.word) ? 'deactivated' : (toggles.add(command.word), 'activated')
      retarget(t, command.word, command.word)
    } else if (command.kind === 'temporary') {
      if (!timers.has(command.word)) {
        timers.set(command.word, t + command.duration)
        retarget(t, command.word, command.word)
        status = 'activated'
      }
    }
    return { status, command, state: summary() }
  }

  function tick(t) {
    const events = []
    for (const [word, until] of timers) {
      if (t < until) continue
      timers.delete(word)
      events.push({ type: 'expired', word })
    }
    if (events.length) {
      retarget(t, 'calm', events[0].word)
      events.forEach((e) => (e.state = summary()))
    }

    const progressByGroup = {}
    for (const channel of CHANNELS) {
      const group = GROUP[channel]
      const p = (progressByGroup[group] ??= progress(group, t))
      const a = from[channel]
      const b = target[channel]
      if (Array.isArray(a)) {
        const out = current[channel]
        for (let i = 0; i < a.length; i++) out[i] = a[i] + (b[i] - a[i]) * p
      } else {
        current[channel] = a + (b - a) * p
      }
    }
    return events
  }

  return {
    current,
    execute,
    tick,
    progress,
    summary,
    get from() {
      return from
    },
    get target() {
      return target
    },
    get transition() {
      return transition
    },
  }
}
