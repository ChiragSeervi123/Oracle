import { PerformanceMonitor } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useRef, useState } from 'react'
import { state } from '../core/state.js'
import Experience from './Experience.jsx'

// The persistent WebGL layer. It sits fixed behind the copy for the whole journey and,
// if frames drop for a sustained period, lowers the pixel ratio step by step before
// finally giving up the heaviest features (mirror floor, dense geometry).
export default function Stage({ tier: initialTier, onReady }) {
  const [tier, setTier] = useState(initialTier)
  const maxDpr = Math.min(window.devicePixelRatio || 1, initialTier === 'high' ? 1.75 : 1.4)
  const [dpr, setDpr] = useState(maxDpr)
  const current = useRef(maxDpr)
  const strikes = useRef(0)

  const decline = () => {
    if (!state.entered) return // ignore shader-compile hitches during loading
    if (current.current > 1) {
      current.current = Math.max(1, current.current - 0.25)
      setDpr(current.current)
      return
    }
    strikes.current += 1
    if (strikes.current >= 2) {
      setTier('low')
      state.tier = 'low'
    }
  }
  const incline = () => {
    current.current = Math.min(maxDpr, current.current + 0.25)
    setDpr(current.current)
  }

  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        dpr={dpr}
        gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }}
        camera={{ fov: 35, near: 0.1, far: 170, position: [0, 3, 18] }}
        onCreated={({ gl }) => {
          // Reading back every program's info log stalls compilation; only worth it in dev.
          gl.debug.checkShaderErrors = import.meta.env.DEV
        }}
      >
        <PerformanceMonitor onDecline={decline} onIncline={incline} ms={400} iterations={8}>
          <Suspense fallback={null}>
            <Experience tier={tier} onReady={onReady} />
          </Suspense>
        </PerformanceMonitor>
      </Canvas>
    </div>
  )
}
