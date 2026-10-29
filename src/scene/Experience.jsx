import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { FINALE_Z } from '../core/chapters.js'
import CameraRig from './CameraRig.jsx'
import Chamber from './Chamber.jsx'
import Dust from './Dust.jsx'
import Effects from './Effects.jsx'
import Floor from './Floor.jsx'
import Hall from './Hall.jsx'
import Multitude from './Multitude.jsx'
import Oracle from './Oracle.jsx'
import Studio from './Studio.jsx'

// Fires once the first frames (and therefore every shader) have rendered.
function ReadySignal({ onReady }) {
  const frames = useRef(0)
  useFrame(() => {
    frames.current++
    if (frames.current === 4) onReady?.()
  })
  return null
}

export default function Experience({ tier, onReady }) {
  return (
    <>
      <color attach="background" args={['#050505']} />
      <fog attach="fog" args={['#050505', 13, 46]} />
      <CameraRig />
      <Studio />
      <Oracle tier={tier} />
      <Chamber z={0} />
      <Chamber z={FINALE_Z} />
      <Hall />
      <Multitude tier={tier} />
      <Dust tier={tier} />
      <Floor tier={tier} />
      <Effects tier={tier} />
      <ReadySignal onReady={onReady} />
    </>
  )
}
