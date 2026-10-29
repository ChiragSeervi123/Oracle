import { mulberry32 } from './math.js'

// A small oracular grammar. Every reading is seeded by how the visitor behaved:
// how long they held, how much they moved, and the exact moment they let go.
const OPENINGS = [
  'Before the next full moon,',
  'Long after you stop waiting,',
  'When the light leaves the room twice,',
  'In a room you have not yet entered,',
  'Before winter learns your name,',
  'At the exact moment you look away,',
  'Somewhere between two cities,',
  'On a {day} you will not remember,',
  'When the third bell is finally silent,',
]

const SUBJECTS = [
  'the door you closed',
  'a name you almost forgot',
  'the thing you abandoned',
  'the version of you that stayed behind',
  'a question you swallowed',
  'an unfinished sentence',
  'the stranger who already knows you',
  'a letter you never sent',
  'the quiet you have been avoiding',
]

const VERBS = [
  'will return',
  'will knock, softly,',
  'will find its way back to you',
  'will ask to be finished',
  'will open',
  'will finally answer',
  'will wait for you',
]

const ENDINGS = [
  'wearing gold.',
  'in a voice that sounds like yours.',
  'without apology.',
  'and you will know it by its silence.',
  'carrying the key you thought you lost.',
  'smaller than you remember.',
  'and this time, you will be ready.',
  'as if it had never left.',
]

const SIGNS = [
  'The Ninth Mirror',
  'The Drowned Key',
  'The Quiet Crown',
  'The Second Door',
  'The Gilded Hour',
  'The Hollow Star',
  'The Patient Wolf',
  'The Open Hand',
  'The Last Lantern',
]

const DAYS = ['Tuesday', 'Wednesday', 'Thursday', 'Sunday', 'Monday']

let readings = 0

export function createProphecy({ heldFor = 2.6, entropy = 0 } = {}) {
  const now = new Date()
  const seed = (now.getTime() ^ Math.floor(heldFor * 1000) * 2654435761 ^ Math.floor(entropy * 997)) >>> 0
  const rand = mulberry32(seed)
  const pick = (list) => list[Math.floor(rand() * list.length)]

  readings += 1
  const opening = pick(OPENINGS).replace('{day}', pick(DAYS))
  const text = `${opening} ${pick(SUBJECTS)} ${pick(VERBS)} ${pick(ENDINGS)}`.replace(',,', ',')

  return {
    text,
    number: String(1000 + Math.floor(rand() * 8999)).padStart(4, '0'),
    sign: pick(SIGNS),
    certainty: 61 + Math.floor(rand() * 37),
    held: heldFor.toFixed(2),
    time: now.toTimeString().slice(0, 8),
    count: readings,
  }
}
