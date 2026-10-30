import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Euler, LatheGeometry, Matrix4, Quaternion, Vector2, Vector3 } from 'three'
import { FINALE_Z } from '../core/chapters.js'
import { mulberry32, smoothstep } from '../core/math.js'
import { state } from '../core/state.js'

// CRYSTAL grows quartz out of the mirror floor around both chambers: hexagonal
// prisms with pointed tips, leaning outward, rising one after another from the
// oracle outward. They do not exist in any other world.
const CHAMBERS = [0, FINALE_Z]

export default function Spires({ tier }) {
  const mesh = useRef()
  const perChamber = tier === 'high' ? 24 : 12

  const geometry = useMemo(
    () => new LatheGeometry([new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 0.72), new Vector2(0, 1)], 6),
    [],
  )

  const crystals = useMemo(() => {
    const rand = mulberry32(41)
    const list = []
    CHAMBERS.forEach((z) => {
      for (let i = 0; i < perChamber; i++) {
        const angle = rand() * Math.PI * 2
        const radius = 4.1 + Math.pow(rand(), 0.7) * 4.2
        const lean = 0.12 + rand() * 0.42
        list.push({
          position: new Vector3(Math.cos(angle) * radius, -0.05, z + Math.sin(angle) * radius),
          rotation: new Quaternion().setFromEuler(new Euler(Math.sin(angle) * lean, rand() * Math.PI, -Math.cos(angle) * lean)),
          width: 0.1 + rand() * 0.26,
          height: 0.5 + Math.pow(rand(), 1.6) * 3.1,
          delay: (radius - 4.1) / 4.2 * 0.55 + rand() * 0.1,
        })
      }
    })
    return list
  }, [perChamber])

  const tmp = useMemo(() => ({ m: new Matrix4(), s: new Vector3(), last: -1 }), [])

  useFrame(() => {
    const grow = state.world['structures.spires']
    mesh.current.visible = grow > 0.001 || state.warming
    if (!mesh.current.visible || Math.abs(grow - tmp.last) < 1e-4) return
    tmp.last = grow
    crystals.forEach((c, i) => {
      const k = smoothstep(c.delay, c.delay + 0.45, grow)
      tmp.s.set(c.width * (0.3 + 0.7 * k), c.height * k + 1e-4, c.width * (0.3 + 0.7 * k))
      mesh.current.setMatrixAt(i, tmp.m.compose(c.position, c.rotation, tmp.s))
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, crystals.length]} visible={false}>
      <meshPhysicalMaterial
        color="#cfe6ff"
        metalness={0.78}
        roughness={0.04}
        iridescence={0.9}
        iridescenceIOR={1.5}
        clearcoat={1}
        envMapIntensity={1.5}
        emissive="#0c2236"
        emissiveIntensity={0.45}
        flatShading
      />
    </instancedMesh>
  )
}
