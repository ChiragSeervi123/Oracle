import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import { BackSide, Color, Object3D, SRGBColorSpace } from 'three'
import { mulberry32 } from '../core/math.js'
import { state } from '../core/state.js'

// The far edge of the world. A faint band of light sits on the horizon, and colossal
// silhouettes stand out in the fog: towers, and two rings the size of buildings that
// echo the oracle's. They only ever read as shapes against the glow.
const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const skyFragment = /* glsl */ `
uniform vec3 uBackground;
uniform vec3 uHorizon;
varying vec3 vDir;
void main() {
  float y = normalize(vDir).y;
  float band = exp(-pow((y - 0.015) * 11.0, 2.0));
  float halo = exp(-pow((y - 0.015) * 3.2, 2.0)) * 0.35;
  gl_FragColor = vec4(uBackground + uHorizon * (band + halo), 1.0);
}
`

export default function Horizon({ tier }) {
  const sky = useRef()
  const towers = useRef()
  const rings = useRef()
  const count = tier === 'high' ? 16 : 9

  const uniforms = useMemo(() => ({ uBackground: { value: new Color() }, uHorizon: { value: new Color() } }), [])

  useLayoutEffect(() => {
    const rand = mulberry32(19)
    const dummy = new Object3D()
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1
      const h = 26 + rand() * 38
      dummy.position.set(side * (44 + rand() * 34), h / 2, 18 - (i / count) * 175 + rand() * 8)
      dummy.rotation.set(0, rand() * Math.PI, 0)
      dummy.scale.set(3 + rand() * 6, h, 3 + rand() * 6)
      dummy.updateMatrix()
      towers.current.setMatrixAt(i, dummy.matrix)
    }
    towers.current.instanceMatrix.needsUpdate = true
  }, [count])

  useFrame(({ camera }) => {
    const W = state.world
    sky.current.position.copy(camera.position)
    uniforms.uBackground.value.setRGB(...W['atmosphere.background'], SRGBColorSpace)
    uniforms.uHorizon.value.setRGB(...W['atmosphere.horizon'], SRGBColorSpace)
    rings.current.children.forEach((ring, i) => (ring.rotation.y = state.clock * (i ? -0.02 : 0.015) + i * 1.2))
  })

  return (
    <group>
      <mesh ref={sky} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[150, 32, 16]} />
        <shaderMaterial
          vertexShader={skyVertex}
          fragmentShader={skyFragment}
          uniforms={uniforms}
          side={BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <instancedMesh ref={towers} args={[undefined, undefined, count]}>
        <boxGeometry />
        <meshBasicMaterial color="#050505" />
      </instancedMesh>
      <group ref={rings}>
        <mesh position={[-68, 20, -48]}>
          <torusGeometry args={[19, 0.7, 8, 96]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
        <mesh position={[74, 26, -118]} rotation-x={0.4}>
          <torusGeometry args={[24, 0.9, 8, 96]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
      </group>
    </group>
  )
}
