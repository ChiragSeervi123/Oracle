import { beginHold, endHold } from '../core/input.js'

const TICKS = Array.from({ length: 48 }, (_, i) => i)

// The seal: an explicit, accessible way to be read (pointer, touch, Enter or Space).
// Its ring fills from the shared --hold variable the director writes every frame.
export default function HoldButton({ label }) {
  const start = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    beginHold()
  }
  const keyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    if (!e.repeat) beginHold()
  }
  const keyUp = (e) => {
    if (e.key === 'Enter' || e.key === ' ') endHold()
  }

  return (
    <button
      className="seal"
      onPointerDown={start}
      onPointerUp={endHold}
      onPointerCancel={endHold}
      onKeyDown={keyDown}
      onKeyUp={keyUp}
      onBlur={endHold}
      onContextMenu={(e) => e.preventDefault()}
      data-fade
    >
      <span className="seal__dial" aria-hidden="true">
        <svg viewBox="0 0 120 120">
          {TICKS.map((i) => (
            <line
              key={i}
              x1="60"
              y1={i % 6 === 0 ? 3 : 6}
              x2="60"
              y2="10"
              transform={`rotate(${(i / TICKS.length) * 360} 60 60)`}
            />
          ))}
          <circle className="seal__track" cx="60" cy="60" r="50" />
          <circle className="seal__fill" cx="60" cy="60" r="50" pathLength="1" />
        </svg>
        <span className="seal__core" />
      </span>
      <span className="seal__label">
        {label}
        <small>Press and hold · or hold Space</small>
      </span>
    </button>
  )
}
