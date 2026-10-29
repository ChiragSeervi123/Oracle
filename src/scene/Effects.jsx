import { useFrame } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping, createEffectComponent } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useMemo, useRef } from 'react'
import { Vector2 } from 'three'
import { clamp } from '../core/math.js'
import { state } from '../core/state.js'
import { FinishEffect } from './effects/FinishEffect.js'

const Finish = createEffectComponent(FinishEffect)

export default function Effects({ tier }) {
  const finish = useRef()
  const aberration = useRef()
  const bloom = useRef()
  const offset = useMemo(() => new Vector2(0, 0), [])
  const high = tier === 'high'
  const finishArgs = useMemo(() => [{ grain: high ? 0.045 : 0.035 }], [high])

  useFrame(() => {
    const flash = Math.exp(-state.release * 4) * 0.22
    if (finish.current) {
      const u = finish.current.uniforms
      u.get('uNegative').value = state.negative
      u.get('uFlash').value = flash
    }
    if (aberration.current) {
      const amount = state.reducedMotion
        ? 0
        : clamp(Math.abs(state.velocity) * 0.0011, 0, 0.0035) + state.hold * state.hold * 0.0016 + flash * 0.01
      aberration.current.offset.set(amount, amount * 0.6)
    }
    if (bloom.current) bloom.current.intensity = 0.85 + flash * 6 + state.hold * 0.4
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
