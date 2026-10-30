import gsap from 'gsap'
import { useCallback, useEffect, useRef, useState } from 'react'
import { audio } from './core/audio.js'
import { hasWebGL2, detectTier, prefersReducedMotion } from './core/device.js'
import { startDirector } from './core/director.js'
import { bindInput } from './core/input.js'
import { createScroller } from './core/scroll.js'
import { state } from './core/state.js'
import { speak } from './core/worldRuntime.js'
import Stage from './scene/Stage.jsx'
import Chapters from './ui/Chapters.jsx'
import CommandBar from './ui/CommandBar.jsx'
import Cursor from './ui/Cursor.jsx'
import Fallback from './ui/Fallback.jsx'
import Hud from './ui/Hud.jsx'
import Loader from './ui/Loader.jsx'
import Proclamation from './ui/Proclamation.jsx'
import Whisper from './ui/Whisper.jsx'

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

export default function App() {
  const [webgl] = useState(hasWebGL2)
  const [tier] = useState(detectTier)
  const [ready, setReady] = useState(false)
  const [entered, setEntered] = useState(false)
  const track = useRef(null)
  const scroller = useRef(null)

  useEffect(() => {
    if (!webgl) return
    state.reducedMotion = prefersReducedMotion()
    state.tier = tier
    window.scrollTo(0, 0)
    const s = createScroller(track.current, { reduced: state.reducedMotion })
    scroller.current = s
    s.lock(true)
    const stopDirector = startDirector()
    const unbind = bindInput()
    if (import.meta.env.DEV) window.__oracle = { state, scroller: s, speak }
    console.log(
      '%cORACLE%c\nYou looked behind the glass. It noticed.\nThe world obeys a few words. Press / and speak one. Some are hidden.',
      'font: italic 32px serif; color: #d9bb88',
      'font: 12px monospace; color: #8a8378',
    )
    return () => {
      s.destroy()
      stopDirector()
      unbind()
      document.documentElement.classList.remove('is-locked')
    }
  }, [webgl, tier])

  const handleReady = useCallback(() => setReady(true), [])

  const enter = useCallback((withSound) => {
    if (withSound) audio.enable()
    state.entered = true
    scroller.current?.lock(false)
    setEntered(true)
    gsap.to(state, { intro: 1, duration: state.reducedMotion ? 0.01 : 4.6, ease: 'none' })
  }, [])

  if (!webgl) return <Fallback />

  return (
    <>
      <div className="viewport">
        <Stage tier={tier} onReady={handleReady} />
        <Chapters scroller={scroller} tier={tier} />
        <Proclamation />
        <Whisper />
        <Hud scroller={scroller} entered={entered} />
      </div>
      <div ref={track} className="track" aria-hidden="true" />
      <CommandBar />
      <Cursor />
      <Loader ready={ready} onEnter={enter} />
    </>
  )
}
