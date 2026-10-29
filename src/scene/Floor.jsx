import { MeshReflectorMaterial } from '@react-three/drei'

// Polished black floor running the length of the journey. On capable devices it is a
// blurred real-time mirror; elsewhere a glossy metal that only reflects the studio.
export default function Floor({ tier }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, -60]}>
      <planeGeometry args={[260, 260]} />
      {tier === 'high' ? (
        <MeshReflectorMaterial
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
        <meshStandardMaterial color="#060607" metalness={0.7} roughness={0.38} envMapIntensity={0.45} />
      )}
    </mesh>
  )
}
