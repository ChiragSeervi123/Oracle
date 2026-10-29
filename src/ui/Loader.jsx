import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'

const LINES = ['Cooling the obsidian', 'Polishing the chrome', 'Aligning the rings', 'It is ready to see you']

// The threshold. Counts up while fonts load and every shader compiles, then asks
// how the visitor wants to enter — sound is never started without that choice.
export default function Loader({ ready, onEnter }) {
  const root = useRef(null)
  const count = useRef(null)
  const bar = useRef(null)
  const firstButton = useRef(null)
  const progress = useRef({ value: 0 })
  const [fontsReady, setFontsReady] = useState(false)
  const [line, setLine] = useState(0)
  const [gate, setGate] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true))
  }, [])

  const target = ready ? 100 : fontsReady ? 66 : 30

  useEffect(() => {
    const tween = gsap.to(progress.current, {
      value: target,
      duration: target === 100 ? 1.2 : 2.6,
      ease: 'power2.out',
      onUpdate: () => {
        const v = progress.current.value
        if (count.current) count.current.textContent = String(Math.round(v)).padStart(3, '0')
        if (bar.current) bar.current.style.transform = `scaleX(${v / 100})`
        setLine(v >= 99.5 ? 3 : v > 60 ? 2 : v > 28 ? 1 : 0)
      },
      onComplete: () => target === 100 && setGate(true),
    })
    return () => tween.kill()
  }, [target])

  useEffect(() => {
    if (gate) firstButton.current?.focus({ preventScroll: true })
  }, [gate])

  const { contextSafe } = useGSAP({ scope: root })

  const enter = contextSafe((withSound) => {
    if (!gate) return
    setGate(false)
    onEnter(withSound)
    gsap
      .timeline({ onComplete: () => setGone(true) })
      .to('.loader__inner', { autoAlpha: 0, y: -24, duration: 0.7, ease: 'power2.in' })
      .to('.loader__shutter--top', { yPercent: -101, duration: 1.6, ease: 'expo.inOut' }, 0.4)
      .to('.loader__shutter--bottom', { yPercent: 101, duration: 1.6, ease: 'expo.inOut' }, 0.4)
      .to('.loader__seam', { scaleX: 0, autoAlpha: 0, duration: 0.8, ease: 'power3.inOut' }, 0.3)
  })

  if (gone) return null

  return (
    <div ref={root} className="loader" role="dialog" aria-modal="true" aria-label="Enter ORACLE">
      <div className="loader__shutter loader__shutter--top" />
      <div className="loader__shutter loader__shutter--bottom" />
      <div className="loader__seam" />
      <div className="loader__inner">
        <p className="label">ORACLE &nbsp;·&nbsp; N°001</p>
        <div className="loader__count" aria-hidden="true">
          <span ref={count}>000</span>
        </div>
        <div className="loader__bar" aria-hidden="true">
          <i ref={bar} />
        </div>
        <p className="loader__line" aria-live="polite">
          {LINES[line]}
          {line < 3 && <span className="loader__dots">…</span>}
        </p>
        <div className={`loader__gate${gate ? ' is-open' : ''}`}>
          <button ref={firstButton} className="btn btn--gold" onClick={() => enter(true)} tabIndex={gate ? 0 : -1}>
            Enter with sound
          </button>
          <button className="btn" onClick={() => enter(false)} tabIndex={gate ? 0 : -1}>
            Enter in silence
          </button>
        </div>
        <p className="loader__hint">Headphones recommended. When it asks, hold still.</p>
      </div>
    </div>
  )
}
