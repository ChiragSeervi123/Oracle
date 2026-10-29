import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { CHAPTERS, HOLD_LIMIT, chapterAt } from '../core/chapters.js'
import { state } from '../core/state.js'

// A quiet instrument cursor for fine pointers: a ring that fills while you are being
// read, and a label that tells you what your hand does in the current chapter.
export default function Cursor() {
  const el = useRef(null)
  const label = useRef(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const root = document.documentElement
    root.classList.add('has-cursor')
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let cx = x
    let cy = y
    let text = ''
    let shown = false

    const move = (e) => {
      x = e.clientX
      y = e.clientY
      if (!shown) {
        shown = true
        cx = x
        cy = y
        el.current.classList.add('is-visible')
      }
    }
    const over = (e) => {
      const interactive = e.target instanceof Element && e.target.closest('a, button')
      el.current.classList.toggle('is-link', !!interactive)
    }
    const leave = () => {
      shown = false
      el.current.classList.remove('is-visible')
    }

    const tick = () => {
      cx += (x - cx) * 0.22
      cy += (y - cy) * 0.22
      el.current.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`
      let next = ''
      if (state.entered) {
        if (state.locked) next = 'Release'
        else if (state.holding) next = 'Being read'
        else if (state.c < HOLD_LIMIT) next = 'Hold'
        else next = CHAPTERS[chapterAt(state.c)].cursor
      }
      if (next !== text) {
        text = next
        label.current.textContent = next
      }
      el.current.classList.toggle('is-holding', state.holding || state.hold > 0.02)
    }

    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerover', over, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    gsap.ticker.add(tick)
    return () => {
      root.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      document.documentElement.removeEventListener('pointerleave', leave)
      gsap.ticker.remove(tick)
    }
  }, [])

  return (
    <div ref={el} className="cursor" aria-hidden="true">
      <svg className="cursor__ring" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="18" />
        <circle className="cursor__fill" cx="20" cy="20" r="18" pathLength="1" />
      </svg>
      <span className="cursor__dot" />
      <span ref={label} className="cursor__label" />
    </div>
  )
}
