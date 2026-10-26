import * as THREE from 'three'

// Glowing exhaust particles emitted from the plane's tail
export function createTrail(scene, count = 400) {
  const positions = new Float32Array(count * 3)
  const ages = new Float32Array(count).fill(99)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aAge', new THREE.BufferAttribute(ages, 1))

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uPR: { value: Math.min(window.devicePixelRatio, 2) }, uLife: { value: 1.1 } },
    vertexShader: /* glsl */ `
      attribute float aAge; uniform float uPR; uniform float uLife;
      varying float vLife;
      void main() {
        vLife = clamp(1.0 - aAge / uLife, 0.0, 1.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPR * (14.0 + 26.0 * (1.0 - vLife)) * (10.0 / -mv.z) * vLife;
      }`,
    fragmentShader: /* glsl */ `
      varying float vLife;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        vec3 col = mix(vec3(0.55, 0.25, 1.0), vec3(0.6, 1.4, 1.6), vLife);
        gl_FragColor = vec4(col * 1.4, smoothstep(0.5, 0.0, d) * vLife * 0.8);
      }`,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  scene.add(points)

  let cursor = 0
  let carry = 0
  const tmp = new THREE.Vector3()

  return {
    update(dt, emitPosition, speedRatio) {
      for (let i = 0; i < count; i++) ages[i] += dt
      carry += dt * (25 + speedRatio * 220)
      while (carry >= 1) {
        carry -= 1
        tmp.copy(emitPosition)
        tmp.x += (Math.random() - 0.5) * 0.4
        tmp.y += (Math.random() - 0.5) * 0.4
        tmp.z += (Math.random() - 0.5) * 0.4
        positions.set([tmp.x, tmp.y, tmp.z], cursor * 3)
        ages[cursor] = Math.random() * 0.1
        cursor = (cursor + 1) % count
      }
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.aAge.needsUpdate = true
    },
  }
}
