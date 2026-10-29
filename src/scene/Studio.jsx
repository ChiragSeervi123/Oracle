import { Environment, Lightformer } from '@react-three/drei'
import { BackSide } from 'three'

// A procedural light studio baked once into the environment map. No HDR downloads.
// A tonal sky gives the chrome soft gradations instead of mirroring pure black; tall
// softbox strips draw its liquid highlights, and a gold ring warms every reflection.
const skyVertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const skyFragment = /* glsl */ `
varying vec3 vDir;
void main() {
  float y = vDir.y;
  vec3 zenith = vec3(0.06, 0.06, 0.065);
  vec3 horizon = vec3(0.16, 0.135, 0.11);
  vec3 ground = vec3(0.012, 0.011, 0.01);
  vec3 col = y > 0.0
    ? mix(horizon, zenith, pow(smoothstep(0.0, 0.85, y), 0.6))
    : mix(horizon, ground, pow(smoothstep(0.0, 0.35, -y), 0.7));
  // a faint warm band right on the horizon line
  col += vec3(0.32, 0.22, 0.12) * exp(-pow(y * 18.0, 2.0)) * 0.6;
  gl_FragColor = vec4(col, 1.0);
}
`

export default function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <mesh scale={80}>
        <sphereGeometry args={[1, 48, 24]} />
        <shaderMaterial vertexShader={skyVertex} fragmentShader={skyFragment} side={BackSide} depthWrite={false} />
      </mesh>
      <Lightformer form="rect" intensity={2.4} color="#ffffff" position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[12, 5, 1]} />
      <Lightformer form="rect" intensity={4} color="#f6f1e8" position={[-7, 3, 3]} rotation-y={Math.PI / 2} scale={[1.4, 12, 1]} />
      <Lightformer form="rect" intensity={2.6} color="#f6f1e8" position={[7, 3, -1]} rotation-y={-Math.PI / 2} scale={[0.7, 12, 1]} />
      <Lightformer form="rect" intensity={0.7} color="#ffffff" position={[0, 2.5, 10]} rotation-y={Math.PI} scale={[10, 3, 1]} />
      <Lightformer form="ring" intensity={2.4} color="#e7c48d" position={[0, 2.5, -10]} scale={5} />
      <Lightformer form="circle" intensity={1.6} color="#e9c690" position={[4, 6, 6]} scale={1.2} />
    </Environment>
  )
}
