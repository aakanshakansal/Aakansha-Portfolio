import * as THREE from 'three'
import { radialGlowTexture, rng } from './helpers.js'

const NOISE_GLSL = /* glsl */ `
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x) {
    vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
`

export const SUN_POSITION = new THREE.Vector3(600, 260, -1500)

export function createSpace(scene) {
  const pixelRatio = Math.min(window.devicePixelRatio, 2)

  // ---------- Nebula skybox (follows the camera so it feels infinitely far) ----------
  const nebula = new THREE.Mesh(
    new THREE.SphereGeometry(4000, 48, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        ${NOISE_GLSL}
        void main() {
          vec3 d = normalize(vDir);
          float n = fbm(d * 2.5);
          float n2 = fbm(d * 4.5 + vec3(n * 2.0));
          float m1 = smoothstep(0.42, 0.85, n2);
          float m2 = smoothstep(0.48, 0.9, fbm(d * 3.0 + vec3(5.2)));
          vec3 col = vec3(0.010, 0.008, 0.030);
          col += vec3(0.30, 0.09, 0.45) * m1 * 0.55;
          col += vec3(0.04, 0.22, 0.36) * m2 * 0.45;
          col += vec3(0.55, 0.14, 0.34) * pow(m1 * m2, 1.5) * 0.55;
          float band = exp(-pow(d.y * 3.0 + n * 0.9 - 0.25, 2.0) * 2.0);
          col += vec3(0.22, 0.12, 0.40) * band * 0.18;
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  )
  nebula.renderOrder = -2
  scene.add(nebula)

  // ---------- Distant stars ----------
  const STAR_COUNT = 7000
  const random = rng(42)
  const starPos = new Float32Array(STAR_COUNT * 3)
  const starSize = new Float32Array(STAR_COUNT)
  const starPhase = new Float32Array(STAR_COUNT)
  const starColor = new Float32Array(STAR_COUNT * 3)
  const palette = [new THREE.Color('#ffffff'), new THREE.Color('#c7d2fe'), new THREE.Color('#fde68a'), new THREE.Color('#fbcfe8'), new THREE.Color('#a5f3fc')]
  for (let i = 0; i < STAR_COUNT; i++) {
    const v = new THREE.Vector3(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize().multiplyScalar(2600 + random() * 900)
    starPos.set([v.x, v.y, v.z], i * 3)
    starSize[i] = 1 + Math.pow(random(), 6) * 4.5
    starPhase[i] = random() * Math.PI * 2
    palette[Math.floor(random() * palette.length)].toArray(starColor, i * 3)
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1))
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhase, 1))
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(starColor, 3))
  const starMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: pixelRatio } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aPhase; attribute vec3 aColor;
      uniform float uTime; uniform float uPR;
      varying vec3 vColor; varying float vTw;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vTw = 0.65 + 0.35 * sin(uTime * (1.2 + fract(aPhase) * 2.0) + aPhase);
        vColor = aColor;
        gl_PointSize = aSize * uPR * (0.8 + 0.4 * vTw);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor; varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = pow(smoothstep(0.5, 0.0, d), 1.6);
        gl_FragColor = vec4(vColor * vTw * 1.5, a);
      }`,
  })
  const stars = new THREE.Points(starGeo, starMat)
  stars.renderOrder = -1
  scene.add(stars)

  // ---------- Space dust that wraps around the camera (gives a sense of speed) ----------
  const DUST_COUNT = 1400
  const DUST_SIZE = 360
  const dustPos = new Float32Array(DUST_COUNT * 3)
  for (let i = 0; i < DUST_COUNT * 3; i++) dustPos[i] = random() * DUST_SIZE
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uCam: { value: new THREE.Vector3() }, uSize: { value: DUST_SIZE }, uPR: { value: pixelRatio } },
    vertexShader: /* glsl */ `
      uniform vec3 uCam; uniform float uSize; uniform float uPR;
      varying float vAlpha;
      void main() {
        vec3 p = mod(position - uCam + uSize * 0.5, uSize) - uSize * 0.5 + uCam;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(2.2 * uPR * (60.0 / -mv.z), 6.0);
        vAlpha = smoothstep(uSize * 0.5, uSize * 0.15, length(p - uCam));
      }`,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(vec3(0.75, 0.72, 1.0), smoothstep(0.5, 0.0, d) * vAlpha * 0.7);
      }`,
  })
  const dust = new THREE.Points(dustGeo, dustMat)
  dust.frustumCulled = false
  scene.add(dust)

  // ---------- Sun ----------
  const sun = new THREE.Mesh(new THREE.SphereGeometry(70, 32, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.4) }))
  sun.position.copy(SUN_POSITION)
  const sunGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: radialGlowTexture('rgba(255,190,120,1)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })
  )
  sunGlow.scale.setScalar(900)
  sun.add(sunGlow)
  scene.add(sun)

  // ---------- Lights ----------
  scene.add(new THREE.HemisphereLight('#8a7dff', '#160c2a', 0.9))
  const key = new THREE.DirectionalLight('#fff1dd', 2.6)
  key.position.copy(SUN_POSITION).normalize()
  scene.add(key)
  const rim = new THREE.DirectionalLight('#4cc9ff', 0.9)
  rim.position.set(-1, 0.3, 1)
  scene.add(rim)

  return {
    update(time, cameraPosition) {
      nebula.position.copy(cameraPosition)
      stars.position.copy(cameraPosition)
      starMat.uniforms.uTime.value = time
      dustMat.uniforms.uCam.value.copy(cameraPosition)
    },
  }
}
