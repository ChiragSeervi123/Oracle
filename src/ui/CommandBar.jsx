import { useEffect, useRef, useState } from 'react'
import { on } from '../core/state.js'
import { lexicon, speak } from '../core/worldRuntime.js'

const riddleFor = () => {
  const hidden = lexicon.hiddenLeft()
  return hidden.length ? hidden[Math.floor(Math.random() * hidden.length)].riddle : null
}

// The place to speak to the world on purpose: "/" or the Speak button opens it.
// Known words are offered as chips; hidden ones join them once found.
export default function CommandBar() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [, refresh] = useState(0)
  const input = useRef(null)
  const panel = useRef(null)
  const returnFocus = useRef(null)
  const historyIndex = useRef(-1)

  const close = () => {
    setOpen(false)
    setFeedback(null)
    setValue('')
    historyIndex.current = -1
    const target = returnFocus.current
    returnFocus.current = null
    if (target?.isConnected) target.focus({ preventScroll: true })
  }

  useEffect(() => {
    const offs = [
      on('command:open', () => {
        returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        setOpen(true)
      }),
      on('world', () => refresh((n) => n + 1)),
    ]
    return () => offs.forEach((off) => off())
  }, [])

  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => input.current?.focus({ preventScroll: true }))
    const outside = (e) => {
      if (panel.current && !panel.current.contains(e.target) && !e.target.closest?.('.hud__speak')) close()
    }
    document.addEventListener('pointerdown', outside)
    return () => {
      cancelAnimationFrame(id)
      document.removeEventListener('pointerdown', outside)
    }
  }, [open])

  const say = (word) => {
    const result = speak(word, { source: 'bar' })
    if (result.ok) {
      close()
      return
    }
    if (result.reason === 'empty') {
      setFeedback({ text: 'Say a word. Or press Esc to leave it unsaid.' })
      return
    }
    setFeedback(
      result.suggestion
        ? { text: `It does not know “${result.input}”.`, suggestion: result.suggestion }
        : { text: `It does not know “${result.input}”.`, riddle: riddleFor() },
    )
    input.current?.select()
  }

  const keyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const { history } = lexicon
      if (!history.length) return
      e.preventDefault()
      historyIndex.current = Math.max(-1, Math.min(history.length - 1, historyIndex.current + (e.key === 'ArrowUp' ? 1 : -1)))
      setValue(historyIndex.current === -1 ? '' : history[historyIndex.current].toUpperCase())
    } else if (e.key === 'Tab' && value.trim()) {
      const typed = value.trim().toLowerCase()
      const match = lexicon.known().find((c) => c.word.startsWith(typed))
      if (match) {
        e.preventDefault()
        setValue(match.word.toUpperCase())
      }
    }
  }

  const active = lexicon.active()
  const isActive = (word) => active.form === word || active.modifiers.includes(word) || active.temporary.includes(word)
  const hiddenLeft = lexicon.hiddenLeft().length

  return (
    <div
      ref={panel}
      className={`speak${open ? ' is-open' : ''}`}
      data-ui
      role="dialog"
      aria-label="Speak a word to the world"
      aria-hidden={!open}
      inert={!open}
    >
      <form
        className="speak__field"
        onSubmit={(e) => {
          e.preventDefault()
          say(value)
        }}
      >
        <label className="sr-only" htmlFor="speak-input">
          A word for the world
        </label>
        <span className="speak__glyph" aria-hidden="true" />
        <input
          id="speak-input"
          ref={input}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            historyIndex.current = -1
          }}
          onKeyDown={keyDown}
          placeholder="Speak a word…"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={24}
          aria-describedby="speak-feedback"
        />
        <button type="submit" className="speak__go">
          Speak
        </button>
      </form>

      <ul className="speak__words" aria-label="Words it knows">
        {lexicon.known().map((c) => (
          <li key={c.word}>
            <button type="button" className={isActive(c.word) ? 'is-active' : ''} onClick={() => say(c.word)} aria-pressed={isActive(c.word)}>
              {c.title}
            </button>
          </li>
        ))}
      </ul>

      <p id="speak-feedback" className="speak__feedback" aria-live="polite">
        {feedback?.text}
        {feedback?.suggestion && (
          <>
            {' '}
            Did you mean{' '}
            <button type="button" onClick={() => say(feedback.suggestion.word)}>
              {feedback.suggestion.title}
            </button>
            ?
          </>
        )}
        {feedback?.riddle && <em> It whispers: {feedback.riddle}</em>}
      </p>

      <p className="speak__meta">
        <span className="only-fine">↑↓ history · Tab completes · Esc closes</span>
        <span className="only-coarse">Tap a word, or type your own</span>
        <span>{hiddenLeft ? `${hiddenLeft} ${hiddenLeft === 1 ? 'word is' : 'words are'} still hidden` : 'Every word found'}</span>
      </p>
    </div>
  )
}
