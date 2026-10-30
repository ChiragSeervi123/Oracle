import assert from 'node:assert/strict'
import test from 'node:test'
import { COMMANDS, matchWhisper, normalize, parseCommand, suggest } from '../src/core/commands.js'

test('normalize trims, lowercases, collapses whitespace and drops a leading slash', () => {
  assert.equal(normalize('  GoLd  '), 'gold')
  assert.equal(normalize('/void'), 'void')
  assert.equal(normalize('\tCRYSTAL\n'), 'crystal')
  assert.equal(normalize(undefined), '')
})

test('every documented command parses, case-insensitively', () => {
  for (const word of ['gold', 'void', 'liquid', 'crystal', 'chaos', 'reset']) {
    const parsed = parseCommand(`  ${word.toUpperCase()} `)
    assert.equal(parsed.ok, true, word)
    assert.equal(parsed.command.word, word)
  }
})

test('aliases resolve to their command', () => {
  assert.equal(parseCommand('stone').command.word, 'medusa')
  assert.equal(parseCommand('restore').command.word, 'reset')
  assert.equal(parseCommand('LEVITATE').command.word, 'gravity')
})

test('empty and unknown input never produce a command', () => {
  assert.deepEqual(parseCommand('   '), { ok: false, reason: 'empty', input: '' })
  const unknown = parseCommand('banana')
  assert.equal(unknown.ok, false)
  assert.equal(unknown.reason, 'unknown')
  assert.equal(unknown.suggestion, null)
})

test('typos suggest the nearest public word', () => {
  assert.equal(parseCommand('cristal').suggestion.word, 'crystal')
  assert.equal(parseCommand('liqiud').suggestion.word, 'liquid')
  assert.equal(parseCommand('gild').suggestion.word, 'gold')
})

test('hidden words are only suggested when one letter away or already discovered', () => {
  assert.equal(suggest('gravty')?.word, 'gravity') // one edit away
  assert.equal(suggest('grvvty'), null) // two edits: stays secret
  assert.equal(suggest('grvvty', ['gravity'])?.word, 'gravity') // unless already found
})

test('whispered words fire on the tail of what was typed', () => {
  assert.equal(matchWhisper('xxgold')?.word, 'gold')
  assert.equal(matchWhisper('golde'), null)
  assert.equal(matchWhisper('hello'), null)
  assert.equal(matchWhisper('turntostone')?.word, 'medusa')
})

test('the registry is well formed', () => {
  const words = new Set()
  for (const command of COMMANDS) {
    assert.ok(['form', 'toggle', 'temporary', 'reset'].includes(command.kind), command.word)
    assert.match(command.color, /^#[0-9a-f]{6}$/)
    assert.ok(command.title && command.line, command.word)
    for (const w of [command.word, ...(command.aliases ?? [])]) {
      assert.ok(!words.has(w), `duplicate word ${w}`)
      words.add(w)
    }
    if (command.hidden) assert.ok(command.riddle, `${command.word} needs a riddle`)
  }
  assert.ok(COMMANDS.filter((c) => !c.hidden).length >= 6)
  assert.ok(COMMANDS.filter((c) => c.hidden).length >= 3)
})
