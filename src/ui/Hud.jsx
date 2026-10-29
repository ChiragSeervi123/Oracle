import { useEffect, useRef, useState } from 'react'
import { audio } from '../core/audio.js'
import { CHAPTERS } from '../core/chapters.js'
import { hud, on } from '../core/state.js'

// Restrained instrument panel: brand, current chapter, sound, chapter index, live
// camera coordinates and progress. Numeric read-outs are written by the director loop.
export default function Hud({ scroller, entered }) {
  const [chapter, setChapter] = useState(0)
  const [sound, setSound] = useState(false)
  const [toast, setToast] = useState('')
  const coords = useRef(null)
  const progress = useRef(null)
  const progressBar = useRef(null)

  useEffect(() => {
    hud.coords = coords.current
    hud.progress = progress.current
    hud.progressBar = progressBar.current
    const offs = [
      on('chapter', setChapter),
      on('audio', setSound),
      on('toast', (message) => {
        setToast(message)
        setTimeout(() => setToast(''), 4200)
      }),
    ]
    return () => offs.forEach((off) => off())
  }, [])

  const current = CHAPTERS[chapter]

  return (
    <div className={`hud${entered ? ' is-visible' : ''}`}>
      <header className="hud__top">
        <a className="hud__brand" href="#" onClick={(e) => (e.preventDefault(), scroller.current?.scrollToC(0))}>
          <span className="hud__sigil" aria-hidden="true" />
          ORACLE <span className="hud__dim">N°001</span>
        </a>
        <p className="hud__chapter" aria-live="polite">
          <span key={chapter} className="hud__chapter-text">
            {current.numeral} <span className="hud__dim">—</span> {current.name}
          </span>
        </p>
        <button className="hud__sound" onClick={() => audio.toggle()} aria-pressed={sound}>
          <span className={`bars${sound ? ' is-on' : ''}`} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          Sound <span className="hud__dim">{sound ? 'On' : 'Off'}</span>
        </button>
      </header>

      <nav className="hud__nav" aria-label="Chapters">
        {CHAPTERS.map((ch, i) => (
          <button
            key={ch.id}
            className={i === chapter ? 'is-active' : ''}
            onClick={() => scroller.current?.scrollToC(ch.anchor)}
            aria-label={`Chapter ${ch.numeral}: ${ch.name}`}
            aria-current={i === chapter ? 'step' : undefined}
          >
            <em>{ch.name}</em>
            <span>{ch.numeral}</span>
          </button>
        ))}
      </nav>

      <footer className="hud__foot">
        <span className="hud__coords" ref={coords}>
          X 0.00 Y 0.00 Z 0.00
        </span>
        <span className="hud__progress">
          <i>
            <b ref={progressBar} />
          </i>
          <span ref={progress}>000</span>%
        </span>
      </footer>

      <p className={`toast${toast ? ' is-visible' : ''}`} role="status">
        {toast}
      </p>
    </div>
  )
}
