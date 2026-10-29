import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { C_MAX } from './chapters.js'
import { state } from './state.js'

gsap.registerPlugin(ScrollTrigger)

// Smooth scroll (Lenis) feeding ScrollTrigger, which maps the scroll track onto
// the chapter coordinate. Reduced-motion visitors get native scrolling.
export function createScroller(track, { reduced }) {
  const lenis = reduced ? null : new Lenis({ lerp: 0.075, wheelMultiplier: 0.85, touchMultiplier: 1.4 })
  const raf = (time) => lenis.raf(time * 1000)

  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
  }

  const trigger = ScrollTrigger.create({
    trigger: track,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      state.targetC = self.progress * C_MAX
    },
  })

  const lock = (locked) => {
    document.documentElement.classList.toggle('is-locked', locked)
    if (lenis) locked ? lenis.stop() : lenis.start()
  }

  const scrollToC = (c, { immediate = false } = {}) => {
    const max = document.documentElement.scrollHeight - window.innerHeight
    const y = (c / C_MAX) * max
    if (lenis) lenis.scrollTo(y, { duration: immediate ? 0 : 2.6, immediate, easing: (t) => 1 - Math.pow(1 - t, 4) })
    else window.scrollTo({ top: y, behavior: 'auto' })
  }

  return {
    lock,
    scrollToC,
    destroy() {
      trigger.kill()
      if (lenis) {
        gsap.ticker.remove(raf)
        lenis.destroy()
      }
    },
  }
}
