import { useFrame, useThree } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping, createEffectComponent } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useMemo, useRef } from 'react'
import { Vector2, Vector3 } from 'three'
import { clamp } from '../core/math.js'
import { state } from '../core/state.js'
import { now } from '../core/worldRuntime.js'
import { FinishEffect } from './effects/FinishEffect.js'

const Finish = createEffectComponent(FinishEffect)
const ACK_SECONDS = 1.6

export default function Effects({ tier }) {
  const finish = useRef()
  const aberration = useRef()
  const bloom = useRef()
  const camera = useThree((s) => s.camera)
  const offset = useMemo(() => new Vector2(0, 0), [])
  const focus = useMemo(() => new Vector3(), [])
  const high = tier === 'high'
  const finishArgs = useMemo(() => [{ grain: high ? 0.045 : 0.035 }], [high])

  useFrame(() => {
    const W = state.world
    const flash = Math.exp(-state.release * 4) * 0.22
    // CHAOS pulses the light at 120 bpm (never for reduced motion, and well below flash-risk rates)
    const strobe = state.reducedMotion ? 0 : W['atmosphere.strobe'] * Math.pow(Math.max(0, Math.sin(state.phase.beat * Math.PI)), 8) * 0.16

    // where the world's focus sits on screen (the lens and the acknowledgement ring centre there)
    focus.fromArray(state.focus).project(camera)
    const onScreen = focus.z < 1 && Math.abs(focus.x) < 1.6 && Math.abs(focus.y) < 1.6

    if (finish.current) {
      const u = finish.current.uniforms
      u.get('uNegative').value = state.negative
      u.get('uFlash').value = flash
      u.get('uExposure').value = W['atmosphere.exposure'] * (1 + strobe)
      u.get('uTint').value.setRGB(...W['atmosphere.tint'])
      u.get('uSaturation').value = W['atmosphere.saturation']
      u.get('uContrast').value = W['atmosphere.contrast']
      u.get('uLens').value = onScreen ? W['atmosphere.lens'] : 0
      u.get('uFocus').value.set(focus.x * 0.5 + 0.5, focus.y * 0.5 + 0.5)
      const age = (now() - state.ack.start) / ACK_SECONDS
      u.get('uAck').value = state.reducedMotion ? 0 : age
      u.get('uAckColor').value.setRGB(...state.ack.color)
    }
    if (aberration.current) {
      const amount = state.reducedMotion
        ? 0
        : clamp(Math.abs(state.velocity) * 0.0011, 0, 0.0035) +
          state.hold * state.hold * 0.0016 +
          flash * 0.01 +
          W['atmosphere.aberration'] * 0.0022
      aberration.current.offset.set(amount, amount * 0.6)
    }
    if (bloom.current) bloom.current.intensity = (0.85 + flash * 6 + state.hold * 0.4) * W['atmosphere.bloom'] * (1 + strobe * 2)
  })

  return (
    <EffectComposer multisampling={high ? 4 : 0}>
      <Bloom ref={bloom} mipmapBlur intensity={0.85} luminanceThreshold={0.82} luminanceSmoothing={0.18} radius={0.72} />
      {high && <ChromaticAberration ref={aberration} offset={offset} radialModulation modulationOffset={0.35} />}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Finish ref={finish} args={finishArgs} />
    </EffectComposer>
  )
}
