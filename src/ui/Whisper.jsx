import { useEffect, useRef, useState } from 'react'
import { on } from '../core/state.js'

// Letters typed anywhere, shown faintly as they are whispered. A known word flares
// and dissolves; an unknown one fades without changing anything.
export default function Whisper() {
  const [whisper, setWhisper] = useState({ text: '', status: 'clear' })
  const timer = useRef()

  useEffect(() => {
    const off = on('whisper', (next) => {
      clearTimeout(timer.current)
      setWhisper(next)
      if (next.status === 'matched' || next.status === 'unknown') {
        timer.current = setTimeout(() => setWhisper({ text: '', status: 'clear' }), 1400)
      }
    })
    return () => {
      off()
      clearTimeout(timer.current)
    }
  }, [])

  const visible = whisper.status !== 'clear' && whisper.text
  return (
    <p className={`whisper is-${whisper.status}${visible ? ' is-visible' : ''}`} aria-hidden="true">
      <span className="whisper__text">{whisper.text}</span>
      <span className="whisper__note">{whisper.status === 'unknown' ? 'not a word it knows' : 'Enter to speak'}</span>
    </p>
  )
}
