import { useState } from 'react'
import { SITE } from '../core/chapters.js'
import { createProphecy } from '../core/prophecy.js'

// Without WebGL 2 the chamber cannot be built, but the oracle can still read you.
export default function Fallback() {
  const [reading, setReading] = useState(null)

  return (
    <main className="fallback">
      <div className="fallback__orb" aria-hidden="true">
        <span />
      </div>
      <p className="label">ORACLE &nbsp;·&nbsp; N°001</p>
      <h1 className="fallback__title">Oracle</h1>
      <p className="body">
        This chamber is built in WebGL 2, which your browser or device hasn’t made available. Try a recent Chrome,
        Edge, Firefox or Safari with hardware acceleration switched on. The oracle will read you anyway.
      </p>
      <button
        className="btn btn--gold"
        onClick={() => setReading(createProphecy({ heldFor: 1 + Math.random() * 3, entropy: Math.random() * 1e4 }))}
      >
        {reading ? 'Be read again' : 'Be read'}
      </button>
      {reading && (
        <blockquote className="fallback__reading" aria-live="polite">
          <p className="label">
            Reading N°{reading.number} · {reading.sign}
          </p>
          <p>{reading.text}</p>
        </blockquote>
      )}
      <p className="label fallback__credit">
        {SITE.author} · {SITE.year}
      </p>
    </main>
  )
}
