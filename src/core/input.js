import { HOLD_LIMIT } from './chapters.js'
import { WHISPER_LIMIT, matchWhisper } from './commands.js'
import { emit, state } from './state.js'
import { speak } from './worldRuntime.js'

export const canHold = () => state.entered && state.c < HOLD_LIMIT

export function beginHold() {
  if (!canHold() || state.locked) return
  if (!state.holding) state.heldFor = 0
  state.holding = true
  emit('hold', true)
}

export function endHold() {
  if (state.holding) emit('hold', false)
  state.holding = false
  state.locked = false
}

const isInterface = (target) =>
  target instanceof Element && target.closest('a, button, input, textarea, select, [contenteditable], [data-ui]')
const isTextField = (target) => target instanceof Element && target.closest('input, textarea, select, [contenteditable]')

// Words typed anywhere are whispered to the world; a known word takes effect the
// moment its last letter lands. Enter submits whatever was typed so far.
let whisper = ''
let idleTimer

function setWhisper(text, status) {
  whisper = status === 'typing' ? text : ''
  emit('whisper', { text, status })
}

function clearWhisper() {
  clearTimeout(idleTimer)
  if (whisper) setWhisper('', 'clear')
}

function submitWhisper() {
  clearTimeout(idleTimer)
  const text = whisper
  const result = speak(text, { source: 'whisper' })
  setWhisper(text, result.ok ? 'matched' : 'unknown')
}

export function bindInput() {
  let lastX = 0
  let lastY = 0

  const move = (e) => {
    state.pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    state.pointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    state.pointerActive = true
    state.touch = e.pointerType === 'touch'
    state.entropy += Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY)
    lastX = e.clientX
    lastY = e.clientY
  }

  const down = (e) => {
    move(e)
    if (e.button > 0 || isInterface(e.target)) return
    beginHold()
  }

  // A lifted finger is no longer pointing at anything.
  const up = (e) => {
    if (e.pointerType === 'touch') state.pointerActive = false
    endHold()
  }

  const keydown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return // never hijack browser shortcuts
    if (isTextField(e.target)) return // a real text field (including the command bar) owns its keys

    if (e.code === 'Space') {
      clearWhisper()
      if (canHold() && !isInterface(e.target)) {
        e.preventDefault() // in the first chapters Space consults the oracle instead of paging
        if (!e.repeat) beginHold()
      }
      return
    }
    if (!state.entered) return

    if (e.key === '/') {
      e.preventDefault()
      clearWhisper()
      emit('command:open')
    } else if (e.key === 'Escape') {
      clearWhisper()
    } else if (e.key === 'Enter' && whisper && !isInterface(e.target)) {
      e.preventDefault()
      submitWhisper()
    } else if (e.key === 'Backspace' && whisper) {
      setWhisper(whisper.slice(0, -1), 'typing')
    } else if (/^[a-z]$/i.test(e.key)) {
      const text = (whisper + e.key.toLowerCase()).slice(-(WHISPER_LIMIT + 4))
      const command = matchWhisper(text)
      clearTimeout(idleTimer)
      if (command) {
        speak(command.word, { source: 'whisper' })
        setWhisper(text, 'matched')
        return
      }
      setWhisper(text, 'typing')
      idleTimer = setTimeout(() => setWhisper(text, text.length >= 3 ? 'unknown' : 'clear'), 1800)
    }
  }

  const keyup = (e) => {
    if (e.code === 'Space') endHold()
  }

  const leave = () => {
    state.pointerActive = false
  }

  const contextmenu = (e) => {
    if (state.holding) e.preventDefault()
  }

  window.addEventListener('pointermove', move, { passive: true })
  window.addEventListener('pointerdown', down)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
  window.addEventListener('keydown', keydown)
  window.addEventListener('keyup', keyup)
  window.addEventListener('blur', endHold)
  window.addEventListener('contextmenu', contextmenu)
  document.documentElement.addEventListener('pointerleave', leave)

  return () => {
    clearTimeout(idleTimer)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerdown', down)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    window.removeEventListener('keydown', keydown)
    window.removeEventListener('keyup', keyup)
    window.removeEventListener('blur', endHold)
    window.removeEventListener('contextmenu', contextmenu)
    document.documentElement.removeEventListener('pointerleave', leave)
  }
}
