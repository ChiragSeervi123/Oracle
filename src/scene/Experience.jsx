import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { FINALE_Z } from '../core/chapters.js'
import { state } from '../core/state.js'
import Atmosphere from './Atmosphere.jsx'
import CameraRig from './CameraRig.jsx'
import Chamber from './Chamber.jsx'
import Dust from './Dust.jsx'
import Effects from './Effects.jsx'
import Floor from './Floor.jsx'
import Hall from './Hall.jsx'
import Horizon from './Horizon.jsx'
import Multitude from './Multitude.jsx'
import Oracle from './Oracle.jsx'
import Ripples from './Ripples.jsx'
import Spires from './Spires.jsx'
import Studio from './Studio.jsx'

// The first frames draw every object once (behind the loader) so that each shader is
// compiled before the visitor can reach it; then it reports ready.
function ReadySignal({ onReady }) {
  const frames = useRef(0)
  useFrame(() => {
    frames.current++
    state.warming = frames.current < 4
    if (frames.current === 6) onReady?.()
  })
  return null
}

export default function Experience({ tier, onReady }) {
  return (
    <>
      <color attach="background" args={['#050505']} />
      <fog attach="fog" args={['#050505', 13, 46]} />
      <CameraRig />
      <Atmosphere />
      <Studio />
      <Horizon tier={tier} />
      <Oracle tier={tier} />
      <Chamber z={0} />
      <Chamber z={FINALE_Z} />
      <Spires tier={tier} />
      <Hall />
      <Multitude tier={tier} />
      <Dust tier={tier} />
      <Floor tier={tier} />
      <Ripples />
      <Effects tier={tier} />
      <ReadySignal onReady={onReady} />
    </>
  )
}
