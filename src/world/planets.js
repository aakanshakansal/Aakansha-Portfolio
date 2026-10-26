import * as THREE from 'three'
import { fbm3, makeLabel, rng } from './helpers.js'

function mixPalette(colors, t) {
  t = Math.min(Math.max(t, 0), 1) * (colors.length - 1)
  const i = Math.min(Math.floor(t), colors.length - 2)
  return colors[i].clone().lerp(colors[i + 1], t - i)
}

// Paints an equirectangular texture from 3D noise so it wraps seamlessly on the sphere
function planetTexture(hexColors, seed, style) {
  const W = 512, H = 256
  const colors = hexColors.map((c) => new THREE.Color(c))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(W, H)
  const o = seed * 17.31
  for (let y = 0; y < H; y++) {
    const phi = (y / H) * Math.PI
    for (let x = 0; x < W; x++) {
      const theta = (x / W) * Math.PI * 2
      const px = Math.sin(phi) * Math.cos(theta) * 2
      const py = Math.cos(phi) * 2
      const pz = Math.sin(phi) * Math.sin(theta) * 2
      const n = fbm3(px * 1.4 + o, py * 1.4, pz * 1.4, 4)
      let t
      if (style === 'bands') {
        t = 0.5 + 0.5 * Math.sin(py * 4.5 + n * 6)
      } else {
        t = Math.min(Math.max((n - 0.3) * 2.2, 0), 1)
      }
      const detail = fbm3(px * 9 + o, py * 9, pz * 9, 2)
      const c = mixPalette(colors, t)
      const shade = 0.82 + detail * 0.36
      const i = (y * W + x) * 4
      img.data[i] = Math.min(255, c.r * 255 * shade)
      img.data[i + 1] = Math.min(255, c.g * 255 * shade)
      img.data[i + 2] = Math.min(255, c.b * 255 * shade)
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

function cloudTexture(seed) {
  const W = 512, H = 256
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(W, H)
  const o = seed * 31.7 + 5
  for (let y = 0; y < H; y++) {
    const phi = (y / H) * Math.PI
    for (let x = 0; x < W; x++) {
      const theta = (x / W) * Math.PI * 2
      const px = Math.sin(phi) * Math.cos(theta) * 3
      const py = Math.cos(phi) * 3
      const pz = Math.sin(phi) * Math.sin(theta) * 3
      const n = fbm3(px + o, py * 1.8, pz, 5)
      const a = Math.min(Math.max((n - 0.5) / 0.22, 0), 1)
      const i = (y * W + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255
      img.data[i + 3] = a * 210
    }
  }
  ctx.putImageData(img, 0, 0)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function atmosphere(radius, color) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.12, 48, 32),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vV;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
        void main() {
          float f = pow(1.0 - max(dot(vN, vV), 0.0), 4.0) * 0.8;
          gl_FragColor = vec4(uColor * 1.2, f);
        }`,
    })
  )
}

function ring(radius, color) {
  const inner = radius * 1.35, outer = radius * 2.1
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(inner, outer, 128, 1),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(color) }, uInner: { value: inner }, uOuter: { value: outer } },
      vertexShader: /* glsl */ `
        varying vec3 vPos;
        void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform float uInner; uniform float uOuter; varying vec3 vPos;
        void main() {
          float t = (length(vPos.xy) - uInner) / (uOuter - uInner);
          float bands = 0.55 + 0.45 * sin(t * 48.0) * sin(t * 13.0 + 1.3);
          float edge = smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.85, t);
          gl_FragColor = vec4(uColor * (0.45 + bands * 0.35), edge * bands * 0.45);
        }`,
    })
  )
  mesh.rotation.x = -Math.PI / 2 + 0.35
  mesh.rotation.y = 0.2
  return mesh
}

function station(accent) {
  const group = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({ color: '#c9c3e6', metalness: 0.7, roughness: 0.35 })
  const glow = new THREE.MeshStandardMaterial({ color: '#111', emissive: new THREE.Color(accent).multiplyScalar(2.5) })
  const panel = new THREE.MeshStandardMaterial({ color: '#1e3a8a', metalness: 0.4, roughness: 0.3, emissive: '#1d4ed8', emissiveIntensity: 0.4 })
  const torus = new THREE.Mesh(new THREE.TorusGeometry(7, 0.9, 16, 64), metal)
  const lights = new THREE.Mesh(new THREE.TorusGeometry(7, 0.25, 8, 64), glow)
  lights.scale.setScalar(1.13)
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 6, 24), metal)
  hub.rotation.x = Math.PI / 2
  group.add(torus, lights, hub)
  for (let i = 0; i < 4; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 7, 8), metal)
    spoke.rotation.z = (i * Math.PI) / 2
    spoke.position.set(Math.cos((i * Math.PI) / 2 + Math.PI / 2) * 3.5, Math.sin((i * Math.PI) / 2 + Math.PI / 2) * 3.5, 0)
    group.add(spoke)
  }
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 6, 8), metal)
    arm.rotation.x = Math.PI / 2
    arm.position.z = side * 6
    const p = new THREE.Mesh(new THREE.BoxGeometry(9, 0.15, 3.5), panel)
    p.position.z = side * 9.5
    group.add(arm, p)
  }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), glow)
  beacon.position.y = 2.2
  group.add(beacon)
  group.userData.beacon = beacon
  return group
}

export function createPlanet(section) {
  const { position, radius, colors, style, seed, ring: hasRing } = section.planet
  const random = rng(seed * 101)
  const group = new THREE.Group()
  group.position.set(...position)

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 48),
    new THREE.MeshStandardMaterial({ map: planetTexture(colors, seed, style), roughness: 0.9, metalness: 0 })
  )
  body.rotation.z = 0.3
  body.userData.section = section
  group.add(body, atmosphere(radius, section.accent))
  if (hasRing) group.add(ring(radius, colors[2]))

  // Gas giants (banded) get no cloud layer
  let clouds = null
  if (style !== 'bands') {
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.025, 64, 48),
      new THREE.MeshStandardMaterial({ map: cloudTexture(seed), transparent: true, depthWrite: false, roughness: 1 })
    )
    clouds.rotation.z = 0.3
    group.add(clouds)
  }

  const label = makeLabel(section.label, { glow: section.accent, height: Math.max(6, radius * 0.38) })
  label.position.y = radius + 9
  label.userData.section = section
  const sub = makeLabel(section.subtitle, { font: '700 56px Nunito', color: section.accent, glow: '#000000', height: 2.6 })
  sub.position.y = radius + 4
  group.add(label, sub)

  // Moons (experience companies / projects) orbit with their name tags
  const orbit = new THREE.Group()
  orbit.rotation.x = 0.18
  group.add(orbit)
  const moons = []
  const moonNames = section.moons ?? []
  moonNames.forEach((name, i) => {
    const angle = (i / moonNames.length) * Math.PI * 2
    const r = radius * (hasRing ? 2.45 : 1.75)
    const pivot = new THREE.Group()
    pivot.position.set(Math.cos(angle) * r, (random() - 0.5) * radius * 0.4, Math.sin(angle) * r)
    const moonColor = new THREE.Color(colors[1]).lerp(new THREE.Color('#ffffff'), 0.35 + random() * 0.3)
    const moon = new THREE.Mesh(
      new THREE.IcosahedronGeometry(radius * 0.13 + 1, 2),
      new THREE.MeshStandardMaterial({ color: moonColor, roughness: 0.8, flatShading: true })
    )
    const tag = makeLabel(name, { font: '800 64px Nunito', glow: section.accent, height: 2.6 })
    tag.position.y = radius * 0.13 + 3.2
    pivot.add(moon, tag)
    orbit.add(pivot)
    moons.push(moon)
  })

  // Skills float around their planet as glowing text rings
  const tagRings = []
  if (section.tags) {
    const half = Math.ceil(section.tags.length / 2)
    ;[section.tags.slice(0, half), section.tags.slice(half)].forEach((list, ringIndex) => {
      const tagRing = new THREE.Group()
      tagRing.rotation.set(ringIndex ? -0.45 : 0.3, 0, ringIndex ? 0.25 : -0.15)
      list.forEach((name, i) => {
        const angle = (i / list.length) * Math.PI * 2
        const r = radius * (1.65 + ringIndex * 0.45)
        const tag = makeLabel(name, { font: '800 64px Orbitron', glow: section.accent, height: 2.8 })
        tag.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r)
        tagRing.add(tag)
      })
      group.add(tagRing)
      tagRings.push(tagRing)
    })
  }

  let spaceStation = null
  if (section.station) {
    spaceStation = station(section.accent)
    spaceStation.position.set(radius + 22, 6, 0)
    group.add(spaceStation)
  }

  return {
    group,
    body,
    label,
    section,
    radius,
    zoneRadius: radius * 2 + 22,
    position: group.position,
    update(time, dt) {
      body.rotation.y += dt * 0.04
      if (clouds) clouds.rotation.y += dt * 0.065
      orbit.rotation.y += dt * 0.08
      moons.forEach((m) => (m.rotation.y += dt * 0.5))
      tagRings.forEach((r, i) => (r.rotation.y += dt * (i ? -0.06 : 0.05)))
      if (spaceStation) {
        spaceStation.rotation.z += dt * 0.2
        spaceStation.position.y = 6 + Math.sin(time * 0.6) * 1.5
        spaceStation.userData.beacon.scale.setScalar(1 + Math.sin(time * 4) * 0.4)
      }
    },
  }
}
