import { MeshReflectorMaterial } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { SRGBColorSpace } from 'three'
import { state } from '../core/state.js'

// Polished black floor running the length of the journey. On capable devices it is a
// blurred real-time mirror; elsewhere a glossy metal that only reflects the studio.
// Its colour, reflectivity and roughness follow the world.
export default function Floor({ tier }) {
  const material = useRef()
  const high = tier === 'high'

  useFrame(() => {
    const m = material.current
    if (!m) return
    const W = state.world
    m.color.setRGB(...W['floor.color'], SRGBColorSpace)
    if (high) {
      m.mixStrength = 38 * W['floor.reflect']
      m.roughness = W['floor.roughness']
    } else {
      m.envMapIntensity = 0.45 * W['floor.reflect']
      m.roughness = 0.38 * (W['floor.roughness'] / 0.92)
    }
  })

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, -60]}>
      <planeGeometry args={[260, 260]} />
      {high ? (
        <MeshReflectorMaterial
          ref={material}
          blur={[420, 120]}
          resolution={768}
          mixBlur={1}
          mixStrength={38}
          roughness={0.92}
          depthScale={1.1}
          minDepthThreshold={0.35}
          maxDepthThreshold={1.4}
          color="#0b0b0c"
          metalness={0.55}
          mirror={0.85}
        />
      ) : (
        <meshStandardMaterial ref={material} color="#060607" metalness={0.7} roughness={0.38} envMapIntensity={0.45} />
      )}
    </mesh>
  )
}
