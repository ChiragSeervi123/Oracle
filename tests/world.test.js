import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CHANNELS,
  DEFAULT_WORLD,
  FORMS,
  MODIFIERS,
  PACING,
  TIMING,
  composeWorld,
  flattenWorld,
  hexToRgb,
} from '../src/core/world.js'
import { COMMANDS } from '../src/core/commands.js'
import { createWorldMachine } from '../src/core/worldMachine.js'

const DEFAULT_FLAT = flattenWorld(DEFAULT_WORLD)
const SETTLED = 20 // seconds: longer than any transition

const close = (a, b, eps = 1e-6) =>
  Array.isArray(a) ? a.every((v, i) => Math.abs(v - b[i]) < eps) : Math.abs(a - b) < eps

function assertWorld(actual, expected, message) {
  for (const channel of CHANNELS) assert.ok(close(actual[channel], expected[channel]), `${message}: ${channel}`)
}

test('every preset only touches channels that exist, with values of the right type', () => {
  for (const [name, preset] of Object.entries({ ...FORMS, ...MODIFIERS })) {
    for (const [group, values] of Object.entries(preset)) {
      assert.ok(DEFAULT_WORLD[group], `${name}: unknown group ${group}`)
      for (const [key, value] of Object.entries(values)) {
        const base = DEFAULT_WORLD[group][key]
        assert.notEqual(base, undefined, `${name}: unknown channel ${group}.${key}`)
        if (typeof base === 'string') assert.match(value, /^#[0-9a-f]{6}$/, `${name}: ${group}.${key}`)
        else assert.ok(typeof value === 'number' || Array.isArray(value), `${name}: ${group}.${key}`)
      }
    }
  }
})

test('every command has pacing, and every system has timing', () => {
  for (const command of COMMANDS) assert.ok(PACING[command.word], command.word)
  for (const group of Object.keys(DEFAULT_WORLD)) assert.ok(TIMING[group], group)
})

test('composing nothing gives the default world', () => {
  assert.deepEqual(composeWorld(), DEFAULT_WORLD)
})

test('modifiers apply relative operations in a fixed order', () => {
  const stillChaos = composeWorld(null, ['chaos', 'still'])
  assert.equal(stillChaos.time.scale, 1.6) // chaos breaks the stillness, whichever was spoken first
  const medusaStill = composeWorld('medusa', ['still'])
  assert.equal(medusaStill.time.scale, 0)
  const goldStill = composeWorld('gold', ['still'])
  assert.ok(Math.abs(goldStill.atmosphere.saturation - 1.08 * 0.85) < 1e-9)
})

test('hex colours convert to sRGB triples', () => {
  assert.deepEqual(hexToRgb('#ff8000'), [1, 128 / 255, 0])
})

test('a form blends from the default to its target and settles there', () => {
  const m = createWorldMachine(0)
  const result = m.execute('gold', 1)
  assert.equal(result.status, 'activated')
  m.tick(1.2)
  assert.ok(!close(m.current['oracle.color'], DEFAULT_FLAT['oracle.color']), 'oracle has started to change')
  m.tick(1 + SETTLED)
  assertWorld(m.current, flattenWorld(composeWorld('gold')), 'settled gold')
})

test('switching mid-transition starts from the live values, without a jump', () => {
  const m = createWorldMachine(0)
  m.execute('gold', 0)
  m.tick(0.7)
  const before = structuredClone(m.current)
  m.execute('crystal', 0.7)
  m.tick(0.7)
  assertWorld(m.current, before, 'continuity at the interruption')
  m.tick(SETTLED)
  assertWorld(m.current, flattenWorld(composeWorld('crystal')), 'settled crystal')
})

test('repeating the active form is acknowledged but does not restart the transition', () => {
  const m = createWorldMachine(0)
  m.execute('void', 0)
  const start = m.transition.start
  assert.equal(m.execute('void', 0.5).status, 'already')
  assert.equal(m.transition.start, start)
})

test('toggles switch on and off and layer over the active form', () => {
  const m = createWorldMachine(0)
  m.execute('gold', 0)
  assert.equal(m.execute('still', 1).status, 'activated')
  m.tick(SETTLED)
  assert.equal(m.current['time.scale'], 0)
  assert.deepEqual(m.summary().modifiers, ['still'])
  assert.equal(m.execute('still', SETTLED).status, 'deactivated')
  m.tick(SETTLED * 2)
  assertWorld(m.current, flattenWorld(composeWorld('gold')), 'gold without still')
})

test('chaos is temporary and returns to the prior state, not to the default', () => {
  const m = createWorldMachine(0)
  m.execute('liquid', 0)
  assert.equal(m.execute('chaos', 1).status, 'activated')
  assert.equal(m.execute('chaos', 2).status, 'already')
  m.tick(3)
  assert.equal(m.summary().temporary[0], 'chaos')
  const events = m.tick(1 + 7.01)
  assert.equal(events[0]?.type, 'expired')
  assert.equal(m.summary().form, 'liquid')
  m.tick(30)
  assertWorld(m.current, flattenWorld(composeWorld('liquid')), 'back to liquid')
})

test('reset returns to the exact baseline from every state', () => {
  const states = [['gold'], ['void'], ['liquid'], ['crystal'], ['medusa'], ['chaos'], ['still'], ['gravity'], ['watch'], ['crystal', 'still', 'gravity', 'watch', 'chaos']]
  for (const words of states) {
    const m = createWorldMachine(0)
    words.forEach((w, i) => m.execute(w, i * 0.1))
    m.tick(0.6) // interrupt mid-transition
    assert.equal(m.execute('reset', 0.6).status, 'reset', words.join('+'))
    m.tick(SETTLED)
    assertWorld(m.current, DEFAULT_FLAT, `reset from ${words.join('+')}`)
    assert.equal(m.summary().pristine, true)
  }
})

test('reset on a pristine world changes nothing', () => {
  const m = createWorldMachine(0)
  const start = m.transition.start
  assert.equal(m.execute('reset', 1).status, 'already')
  assert.equal(m.transition.start, start)
})

test('unknown commands leave the world untouched', () => {
  const m = createWorldMachine(0)
  m.execute('gold', 0)
  m.tick(SETTLED)
  const before = structuredClone(m.current)
  assert.equal(m.execute('banana', SETTLED).status, 'unknown')
  m.tick(SETTLED * 2)
  assertWorld(m.current, before, 'unchanged')
  assert.equal(m.summary().form, 'gold')
})

test('rapid switching never produces invalid values', () => {
  const m = createWorldMachine(0)
  const words = ['gold', 'chaos', 'void', 'still', 'liquid', 'crystal', 'gravity', 'reset', 'medusa', 'watch', 'gold']
  let t = 0
  for (let i = 0; i < 400; i++) {
    t += 0.016
    if (i % 7 === 0) m.execute(words[(i / 7) % words.length], t)
    m.tick(t)
    for (const channel of CHANNELS) {
      const value = m.current[channel]
      const values = Array.isArray(value) ? value : [value]
      assert.ok(values.every(Number.isFinite), `${channel} at step ${i}`)
    }
  }
})
