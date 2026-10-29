import { HOLD_LIMIT } from './chapters.js'
import { emit, state } from './state.js'

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

const isInterface = (target) => target instanceof Element && target.closest('a, button, input, [data-ui]')

let goldTimer

function transmute() {
  state.goldTarget = 1
  emit('toast', 'Au · 79 — transmutation')
  clearTimeout(goldTimer)
  goldTimer = setTimeout(() => {
    state.goldTarget = 0
  }, 14000)
}

export function bindInput() {
  let lastX = 0
  let lastY = 0
  let typed = ''

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
    if (e.code === 'Space' && canHold() && !isInterface(e.target)) {
      e.preventDefault() // in the first chapters Space consults the oracle instead of paging
      if (!e.repeat) beginHold()
      return
    }
    if (e.key.length === 1) {
      typed = (typed + e.key.toLowerCase()).slice(-4)
      if (typed === 'gold') transmute()
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
    clearTimeout(goldTimer)
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
