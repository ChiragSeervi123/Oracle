// The words the oracle understands. Pure JavaScript, unit-tested in Node.
// kind: 'form' (one at a time) · 'toggle' (layers on top) · 'temporary' · 'reset'
export const COMMANDS = [
  {
    word: 'gold',
    kind: 'form',
    title: 'Gold',
    line: 'Au · 79. Everything remembers its first metal.',
    color: '#ffc45c',
  },
  {
    word: 'void',
    kind: 'form',
    title: 'Void',
    line: 'The light is pulled toward the centre.',
    color: '#ffa94d',
  },
  {
    word: 'liquid',
    kind: 'form',
    title: 'Liquid',
    line: 'Nothing here keeps its shape.',
    color: '#cfe8ff',
  },
  {
    word: 'crystal',
    kind: 'form',
    title: 'Crystal',
    line: 'The oracle freezes into facets.',
    color: '#bfe3ff',
  },
  {
    word: 'chaos',
    kind: 'temporary',
    duration: 7,
    title: 'Chaos',
    line: 'The rules forget themselves. Briefly.',
    end: 'The rules remember.',
    color: '#ff6a4a',
  },
  {
    word: 'reset',
    kind: 'reset',
    aliases: ['restore'],
    title: 'Reset',
    line: 'Obsidian, chrome, and silence again.',
    color: '#f0d2a0',
  },
  {
    word: 'still',
    kind: 'toggle',
    hidden: true,
    title: 'Still',
    line: 'Time holds its breath. You do not.',
    off: 'Time breathes again.',
    riddle: 'It asks you to hold still. You could ask the same of time.',
    color: '#dfe7ff',
  },
  {
    word: 'gravity',
    kind: 'toggle',
    hidden: true,
    aliases: ['levitate'],
    title: 'Gravity',
    line: 'Down has changed its mind.',
    off: 'The stones remember the ground.',
    riddle: 'The stones are heavy only because something insists.',
    color: '#f6e2bd',
  },
  {
    word: 'watch',
    kind: 'toggle',
    hidden: true,
    title: 'Watch',
    line: 'It will not look away from you now.',
    off: 'It lowers its gaze.',
    riddle: 'It has been looking at you all along. Ask it to keep looking.',
    color: '#f3c98a',
  },
  {
    word: 'medusa',
    kind: 'form',
    hidden: true,
    aliases: ['stone'],
    title: 'Medusa',
    line: 'Everything that meets her gaze turns to stone.',
    riddle: 'One glance from her, and the world becomes a sculpture.',
    color: '#d6d2ca',
  },
]

const BY_WORD = new Map()
for (const command of COMMANDS) {
  BY_WORD.set(command.word, command)
  command.aliases?.forEach((alias) => BY_WORD.set(alias, command))
}

export const getCommand = (word) => BY_WORD.get(word)

export function normalize(input) {
  return String(input ?? '')
    .trim()
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/\s+/g, ' ')
}

export function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1))
      previous = current
    }
  }
  return row[b.length]
}

// The closest known word, without giving away hidden ones unless the visitor is
// already one letter from it (or has found it before).
export function suggest(input, discovered = []) {
  let best = null
  for (const [word, command] of BY_WORD) {
    const d = distance(input, word)
    const secret = command.hidden && !discovered.includes(command.word)
    const limit = secret ? 1 : word.length <= 4 ? 1 : 2
    if (d <= limit && (!best || d < best.d)) best = { command, d }
  }
  return best?.command ?? null
}

export function parseCommand(input, { discovered = [] } = {}) {
  const word = normalize(input)
  if (!word) return { ok: false, reason: 'empty', input: word }
  const command = BY_WORD.get(word)
  if (command) return { ok: true, command, input: word }
  return { ok: false, reason: 'unknown', input: word, suggestion: suggest(word, discovered) }
}

// Global typing: does the tail of what was typed name a command?
export function matchWhisper(buffer) {
  let found = null
  for (const [word, command] of BY_WORD) {
    if (buffer.endsWith(word) && (!found || word.length > found.word.length)) found = { word, command }
  }
  return found?.command ?? null
}

export const WHISPER_LIMIT = Math.max(...[...BY_WORD.keys()].map((w) => w.length))
