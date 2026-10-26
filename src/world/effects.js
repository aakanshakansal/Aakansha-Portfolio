import * as THREE from 'three'
import { radialGlowTexture } from './helpers.js'

// Streaks that stretch along the flight direction when boosting
export function createWarp(scene, count = 260, size = 220) {
  const positions = new Float32Array(count * 2 * 3)
  const ends = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) {
    const x = Math.random() * size, y = Math.random() * size, z = Math.random() * size
    positions.set([x, y, z, x, y, z], i * 6)
    ends[i * 2 + 1] = 1
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1))
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uCam: { value: new THREE.Vector3() },
      uDir: { value: new THREE.Vector3(0, 0, -1) },
      uLen: { value: 0 },
      uSize: { value: size },
      uOpacity: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aEnd;
      uniform vec3 uCam; uniform vec3 uDir; uniform float uLen; uniform float uSize;
      varying float vAlpha;
      void main() {
        vec3 p = mod(position - uCam + uSize * 0.5, uSize) - uSize * 0.5 + uCam;
        p -= uDir * uLen * aEnd;
        vAlpha = (1.0 - aEnd) * smoothstep(uSize * 0.5, uSize * 0.1, length(p - uCam));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vAlpha;
      void main() { gl_FragColor = vec4(vec3(0.8, 0.85, 1.6), vAlpha * uOpacity); }`,
  })
  const lines = new THREE.LineSegments(geometry, material)
  lines.frustumCulled = false
  scene.add(lines)

  return {
    update(dt, cameraPosition, direction, intensity) {
      material.uniforms.uCam.value.copy(cameraPosition)
      material.uniforms.uDir.value.copy(direction)
      const u = material.uniforms
      u.uOpacity.value += (intensity - u.uOpacity.value) * (1 - Math.exp(-dt * 4))
      u.uLen.value = 4 + u.uOpacity.value * 22
    },
  }
}

// Occasional meteors streaking across the far sky
export function createShootingStars(scene, max = 3) {
  const stars = []
  for (let i = 0; i < max; i++) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array([3, 2.6, 3.4, 0, 0, 0]), 3))
    const line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    line.frustumCulled = false
    line.visible = false
    scene.add(line)
    stars.push({ line, life: 0, head: new THREE.Vector3(), velocity: new THREE.Vector3() })
  }
  let timer = 1.5

  return {
    update(dt, cameraPosition) {
      timer -= dt
      if (timer <= 0) {
        timer = 1.5 + Math.random() * 3.5
        const s = stars.find((x) => x.life <= 0)
        if (s) {
          const dir = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.6 + 0.1, Math.random() - 0.5).normalize()
          s.head.copy(cameraPosition).addScaledVector(dir, 900)
          s.velocity.set(Math.random() - 0.5, -0.3 - Math.random() * 0.3, Math.random() - 0.5).normalize().multiplyScalar(700)
          s.life = 1.1
          s.line.visible = true
        }
      }
      for (const s of stars) {
        if (s.life <= 0) continue
        s.life -= dt
        s.head.addScaledVector(s.velocity, dt)
        const arr = s.line.geometry.attributes.position.array
        const tailLen = 0.12 * Math.min(1, s.life * 2)
        arr[0] = s.head.x; arr[1] = s.head.y; arr[2] = s.head.z
        arr[3] = s.head.x - s.velocity.x * tailLen
        arr[4] = s.head.y - s.velocity.y * tailLen
        arr[5] = s.head.z - s.velocity.z * tailLen
        s.line.geometry.attributes.position.needsUpdate = true
        if (s.life <= 0) s.line.visible = false
      }
    },
  }
}

// Hidden collectible for curious pilots
export function createSecretStar(scene, position) {
  const group = new THREE.Group()
  group.position.copy(position)
  const star = new THREE.Mesh(
    new THREE.OctahedronGeometry(2.2, 0),
    new THREE.MeshStandardMaterial({ color: '#ffd166', emissive: new THREE.Color('#ffb703').multiplyScalar(2.2), metalness: 0.6, roughness: 0.2 })
  )
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: radialGlowTexture('rgba(255,200,90,1)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })
  )
  glow.scale.setScalar(16)
  group.add(star, glow)
  scene.add(group)
  let collected = false

  return {
    get collected() {
      return collected
    },
    collect() {
      collected = true
      group.visible = false
    },
    update(time, planePosition, radius) {
      if (collected) return false
      star.rotation.y = time * 1.5
      star.rotation.x = Math.sin(time) * 0.4
      group.position.y = position.y + Math.sin(time * 1.3) * 1.5
      glow.material.opacity = 0.7 + Math.sin(time * 4) * 0.3
      return group.position.distanceTo(planePosition) < radius + 3
    },
  }
}
