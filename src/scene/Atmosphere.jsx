import { useFrame, useThree } from '@react-three/fiber'
import { SRGBColorSpace } from 'three'
import { state } from '../core/state.js'

// Background, fog depth and the strength and orientation of the studio light, all
// following the world. Rotating the environment sweeps its light across every surface.
export default function Atmosphere() {
  const scene = useThree((s) => s.scene)

  useFrame(() => {
    const W = state.world
    scene.background?.setRGB?.(...W['atmosphere.background'], SRGBColorSpace)
    if (scene.fog) {
      scene.fog.color.setRGB(...W['atmosphere.fog'], SRGBColorSpace)
      scene.fog.near = W['atmosphere.fogNear']
      scene.fog.far = W['atmosphere.fogFar']
    }
    scene.environmentIntensity = W['atmosphere.env']
    scene.environmentRotation.y = state.phase.env
  })

  return null
}
