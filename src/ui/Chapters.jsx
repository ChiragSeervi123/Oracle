import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useEffect, useRef, useState } from 'react'
import { SITE } from '../core/chapters.js'
import { on, hud, state } from '../core/state.js'
import HoldButton from './HoldButton.jsx'

gsap.registerPlugin(SplitText)

function Prophecy({ data }) {
  const ref = useRef(null)
  useGSAP(
    () => {
      const reduced = state.reducedMotion
      gsap.fromTo(
        '.pw',
        { autoAlpha: 0, filter: reduced ? 'none' : 'blur(12px)', yPercent: reduced ? 0 : 40 },
        { autoAlpha: 1, filter: 'blur(0px)', yPercent: 0, duration: 1.5, stagger: 0.065, ease: 'power3.out', delay: 0.15 },
      )
      gsap.fromTo('[data-meta]', { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12, delay: 0.9 })
    },
    { scope: ref },
  )
  return (
    <div ref={ref} className="prophecy">
      <p className="label" data-meta>
        Reading <b>N°{data.number}</b> &nbsp;·&nbsp; {data.time}
      </p>
      <p className="prophecy__text">
        {data.text.split(' ').map((word, i) => (
          <span className="pw" key={i}>
            {word}{' '}
          </span>
        ))}
      </p>
      <p className="prophecy__meta" data-meta>
        <span>Held {data.held}s</span>
        <span>{data.sign}</span>
        <span>Certainty {data.certainty}%</span>
      </p>
      <p className="prophecy__hint" data-meta>
        Hold again for another reading, or scroll on and leave it behind.
      </p>
    </div>
  )
}

export default function Chapters({ scroller, tier }) {
  const root = useRef(null)
  const touched = useRef(null)
  const [prophecy, setProphecy] = useState(null)
  const shardWords = tier === 'high' ? 'A thousand' : 'Four hundred'
  const shardTotal = tier === 'high' ? 1000 : 400

  useEffect(() => {
    hud.touched = touched.current
    return on('reading', setProphecy)
  }, [])

  // Each panel gets a paused reveal timeline; the director tells us which one is live.
  useGSAP(
    () => {
      const panels = gsap.utils.toArray('.panel')
      const splits = []
      let timelines = null
      let requested = -1

      panels.forEach((panel) => (panel.inert = true))

      const show = (index) => {
        requested = index
        if (!timelines) return
        timelines.forEach((tl, i) => {
          const panel = panels[i]
          if (i === index) {
            panel.inert = false
            tl.timeScale(1).play()
          } else if (tl.progress() > 0) {
            panel.inert = true
            tl.timeScale(2.2).reverse()
          }
        })
      }

      const build = () => {
        timelines = panels.map((panel) => {
          const tl = gsap.timeline({ paused: true })
          tl.set(panel, { autoAlpha: 1 })
          panel.querySelectorAll('[data-split]').forEach((el) => {
            const type = el.dataset.split === 'chars' ? 'chars' : 'words'
            const split = SplitText.create(el, { type, mask: type, [`${type}Class`]: 'sx' })
            splits.push(split)
            tl.fromTo(
              split[type],
              { yPercent: 118 },
              { yPercent: 0, duration: 1.35, ease: 'expo.out', stagger: type === 'chars' ? 0.055 : 0.04 },
              0.05,
            )
          })
          const fades = panel.querySelectorAll('[data-fade]')
          if (fades.length) {
            tl.fromTo(
              fades,
              { autoAlpha: 0, y: 18 },
              { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09 },
              0.35,
            )
          }
          return tl
        })
        if (requested !== -1) show(requested)
      }

      let alive = true
      document.fonts.ready.then(() => alive && build())
      const off = on('panel', show)
      return () => {
        alive = false
        off()
        timelines?.forEach((tl) => tl.kill())
        splits.forEach((s) => s.revert())
      }
    },
    { scope: root },
  )

  const begin = () => scroller.current?.scrollToC(0)

  return (
    <main ref={root} className="panels">
      {/* I — Arrival */}
      <section className="panel panel--arrival" aria-labelledby="title-arrival">
        <p className="label hero__index" data-fade>
          N°001 <span className="rule" /> The Obsidian Hall
        </p>
        <p className="hero__lede" data-fade>
          An instrument
          <br />
          for being read.
        </p>
        <p className="hero__note body" data-fade>
          It does not answer questions. It answers whoever holds still long enough to be seen.
        </p>
        <h1 id="title-arrival" className="hero__title" data-split="chars">
          Oracle
        </h1>
        <p className="hero__cue label" data-fade>
          <i aria-hidden="true" /> Scroll to descend
        </p>
      </section>

      {/* II — The Reading */}
      <section className="panel panel--reading" aria-labelledby="title-reading" data-state={prophecy ? 'read' : 'ask'}>
        <div className="col">
          <p className="label" data-fade>
            II <span className="rule" /> The Reading
          </p>
          <div className="stack">
            <div className="ask">
              <h2 id="title-reading" className="display" data-split>
                Ask nothing. <em>Hold,</em> and be read.
              </h2>
              <p className="body" data-fade>
                Press anywhere and keep still. The rings will find each other and the eye will open. Let go too
                early and it forgets you.
              </p>
            </div>
            {prophecy && <Prophecy key={`${prophecy.number}-${prophecy.count}`} data={prophecy} />}
          </div>
          <HoldButton label={prophecy ? 'Hold to be read again' : 'Hold to be read'} />
        </div>
        <p className="sr-only" aria-live="polite">
          {prophecy ? `Your reading: ${prophecy.text}` : ''}
        </p>
      </section>

      {/* III — Hall of Echoes */}
      <section className="panel panel--halls" aria-labelledby="title-halls">
        <div className="col">
          <p className="label" data-fade>
            III <span className="rule" /> Hall of Echoes
          </p>
          <h2 id="title-halls" className="display" data-split>
            Every question ever asked <em>is still walking here.</em>
          </h2>
          <p className="body" data-fade>
            The hall bends toward your attention. Look somewhere, and the architecture follows.
          </p>
          <p className="hint label" data-fade>
            <span className="only-fine">Move to steer</span>
            <span className="only-coarse">It steers itself. Follow it</span>
          </p>
        </div>
      </section>

      {/* IV — The Multitude */}
      <section className="panel panel--multitude" aria-labelledby="title-multitude">
        <div className="col">
          <p className="label" data-fade>
            IV <span className="rule" /> The Multitude
          </p>
          <h2 id="title-multitude" className="display" data-split>
            {shardWords} answers. <em>None of them yours.</em>
          </h2>
          <p className="body" data-fade>
            Reach into them. They scatter from your hand, and remember it: whatever you touch keeps your gold.
          </p>
          <p className="counter label" data-fade>
            Touched <b ref={touched}>000</b> / {shardTotal}
          </p>
        </div>
      </section>

      {/* V — The Negative */}
      <section className="panel panel--negative" aria-labelledby="title-negative">
        <div className="col col--statement">
          <p className="label" data-fade>
            V <span className="rule" /> The Negative
          </p>
          <h2 id="title-negative" className="display display--xl" data-split>
            You were never asking the oracle. <em>It was always a mirror.</em>
          </h2>
        </div>
        <div className="col col--coda">
          <p className="recall" data-fade>
            {prophecy ? (
              <>
                <span className="label">Your reading · N°{prophecy.number}</span>
                <q>{prophecy.text}</q>
              </>
            ) : (
              <>
                <span className="label">No reading</span>
                You passed through without being read. It noticed anyway.
              </>
            )}
          </p>
          <div className="actions" data-fade>
            <button className="btn btn--ink" onClick={begin}>
              Begin again
            </button>
          </div>
          <footer className="credits label" data-fade>
            <span>
              Designed &amp; built by {SITE.author} · {SITE.year}
            </span>
            <span>Three.js · React Three Fiber · GLSL · GSAP</span>
          </footer>
        </div>
      </section>
    </main>
  )
}
