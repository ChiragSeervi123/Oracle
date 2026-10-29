// The whole journey is described by a single "chapter coordinate" c in [0, 5].
// Scroll maps linearly onto c; the camera, the scenes and the copy all key off it.
export const C_MAX = 5

// start: where the HUD considers the chapter to begin; range: when its copy is on screen.
export const CHAPTERS = [
  { id: 'arrival', numeral: 'I', name: 'Arrival', start: 0, range: [-1, 0.42], anchor: 0, cursor: 'Hold' },
  { id: 'reading', numeral: 'II', name: 'The Reading', start: 0.62, range: [0.78, 1.6], anchor: 1.12, cursor: 'Hold' },
  { id: 'halls', numeral: 'III', name: 'Hall of Echoes', start: 1.8, range: [2.06, 2.82], anchor: 2.3, cursor: 'Steer' },
  { id: 'multitude', numeral: 'IV', name: 'The Multitude', start: 2.92, range: [3.02, 3.78], anchor: 3.3, cursor: 'Touch' },
  { id: 'negative', numeral: 'V', name: 'The Negative', start: 4.12, range: [4.66, 9], anchor: 5, cursor: '' },
]

export const chapterAt = (c) => {
  let i = 0
  while (i < CHAPTERS.length - 1 && c >= CHAPTERS[i + 1].start) i++
  return i
}

export const HOLD_LIMIT = 1.62 // past this point the oracle withdraws and can no longer be consulted
export const HOLD_SECONDS = 2.6

export const ORACLE_Y = 2.3
export const FINALE_Z = -124
export const MULTITUDE_CENTER = [0, 3, -106]
export const RING_Z = -108

export const SITE = {
  author: 'Chirag Seervi',
  year: 2026,
  repo: 'https://github.com/ChiragSeervi123/ORACLE',
}
