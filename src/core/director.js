import gsap from 'gsap'
import { audio } from './audio.js'
import { CHAPTERS, HOLD_LIMIT, HOLD_SECONDS, chapterAt } from './chapters.js'
import { damp, smoothstep } from './math.js'
import { createProphecy } from './prophecy.js'
import { emit, hud, state } from './state.js'

// The non-WebGL half of the frame loop: scroll damping, the hold mechanic,
// chapter activation, HUD read-outs and audio. Runs on GSAP's ticker.
export function startDirector() {
  const root = document.documentElement
  let activePanel = -2
  let chapter = -1
  let negative = false
  let frame = 0
  let lastTouched = -1
  let lastHold = -1

  const tick = (time, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.1)
    frame++

    // Scroll → chapter coordinate
    const prev = state.c
    state.c = damp(state.c, state.targetC, state.reducedMotion ? 14 : 3.6, dt)
    state.velocity = damp(state.velocity, (state.c - prev) / Math.max(dt, 1e-4), 5, dt)

    // The reading
    if (state.c > HOLD_LIMIT && state.holding) {
      state.holding = false
      emit('hold', false)
    }
    if (state.holding && !state.locked) {
      state.heldFor += dt
      state.hold = Math.min(1, state.hold + dt / HOLD_SECONDS)
      if (state.hold >= 1) {
        state.locked = true
        state.release = 0
        const prophecy = createProphecy({ heldFor: state.heldFor, entropy: state.entropy })
        emit('reading', prophecy)
        audio.chime()
      }
    } else {
      // Let go too early and it forgets you; after a reading it exhales slowly.
      state.hold = Math.max(0, state.hold - dt * (state.locked || state.release < 3 ? 0.42 : 1.25))
    }
    state.release += dt

    state.gold = damp(state.gold, state.goldTarget, 1.6, dt)
    state.negative = smoothstep(4.17, 4.42, state.c)

    if (Math.abs(state.hold - lastHold) > 0.001) {
      root.style.setProperty('--hold', state.hold.toFixed(3))
      lastHold = state.hold
    }

    // Copy panels
    const panel = CHAPTERS.findIndex((ch) => state.c >= ch.range[0] && state.c <= ch.range[1])
    if (panel !== activePanel && state.entered) {
      activePanel = panel
      emit('panel', panel)
    }

    // HUD
    const current = chapterAt(state.c)
    if (current !== chapter) {
      chapter = current
      emit('chapter', current)
    }
    if (state.negative > 0.5 !== negative) {
      negative = state.negative > 0.5
      root.classList.toggle('is-negative', negative)
    }
    if (frame % 3 === 0) {
      const pct = Math.round((state.c / 5) * 100)
      if (hud.progress) hud.progress.textContent = String(pct).padStart(3, '0')
      if (hud.progressBar) hud.progressBar.style.transform = `scaleX(${(state.c / 5).toFixed(4)})`
      if (hud.coords) {
        const { x, y, z } = state.cam
        hud.coords.textContent = `X ${x.toFixed(2)}  Y ${y.toFixed(2)}  Z ${z.toFixed(2)}`
      }
    }
    if (state.touched !== lastTouched && hud.touched) {
      lastTouched = state.touched
      hud.touched.textContent = String(state.touched).padStart(3, '0')
    }

    audio.update(state, time)
  }

  gsap.ticker.add(tick)
  return () => gsap.ticker.remove(tick)
}
