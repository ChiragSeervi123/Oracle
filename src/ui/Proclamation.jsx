import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { on, state } from '../core/state.js'
import { lexicon } from '../core/worldRuntime.js'

const ALREADY = {
  form: (c) => `The world is already ${c.title.toLowerCase()}.`,
  temporary: (c) => `${c.title} is already loose.`,
  reset: () => 'Nothing to undo. The world is as it was.',
}

// When a word takes effect, its name passes across the world like a title card.
// Each new proclamation replaces the last; their animations never overlap.
export default function Proclamation() {
  const root = useRef(null)
  const [card, setCard] = useState(null)

  useEffect(
    () =>
      on('world', (event) => {
        const { command, status } = event
        if (!command) return
        if (status === 'already') {
          setCard({ key: Date.now(), small: true, title: command.title, line: (ALREADY[command.kind] ?? ALREADY.form)(command) })
          return
        }
        const line =
          status === 'deactivated' ? command.off : status === 'expired' ? command.end ?? command.off : command.line
        const left = lexicon.hiddenLeft().length
        const note = event.firstTime ? `A hidden word. ${left ? `${left} still hidden.` : 'You have found them all.'}` : null
        setCard({ key: Date.now(), title: command.title, line, note, color: command.color, off: status !== 'activated' && status !== 'reset' })
      }),
    [],
  )

  useGSAP(
    () => {
      if (!card) return
      const calm = state.reducedMotion
      gsap
        .timeline({ onComplete: () => setCard(null) })
        .fromTo(
          '.proclaim__title',
          { autoAlpha: 0, filter: calm ? 'none' : 'blur(18px)', letterSpacing: calm ? '0.18em' : '0.6em' },
          { autoAlpha: 1, filter: 'blur(0px)', letterSpacing: '0.18em', duration: calm ? 0.3 : 1.1, ease: 'expo.out' },
        )
        .fromTo('.proclaim__line', { autoAlpha: 0, y: calm ? 0 : 8 }, { autoAlpha: 1, y: 0, duration: 0.7 }, 0.25)
        .to('.proclaim__inner', { autoAlpha: 0, filter: calm ? 'none' : 'blur(10px)', duration: calm ? 0.3 : 0.9, ease: 'power2.in' }, card.small ? 1.6 : 2.4)
    },
    { scope: root, dependencies: [card], revertOnUpdate: true },
  )

  return (
    <div ref={root} className="proclaim" role="status" aria-live="polite">
      {card && (
        <div key={card.key} className={`proclaim__inner${card.small ? ' is-small' : ''}${card.off ? ' is-off' : ''}`}>
          <p className="proclaim__title" style={{ '--word': card.color }}>
            {card.title}
          </p>
          <p className="proclaim__line">{card.line}</p>
          {card.note && <p className="proclaim__note">{card.note}</p>}
        </div>
      )}
    </div>
  )
}
