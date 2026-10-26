import * as THREE from 'three'

const GATE_RADIUS = 8

// Neon rings to fly through. Detects a pass when the plane crosses the ring's plane inside its radius.
export function createGates(scene, points) {
  const idle = new THREE.Color('#c084fc').multiplyScalar(3)
  const done = new THREE.Color('#5eead4').multiplyScalar(3)
  const geometry = new THREE.TorusGeometry(GATE_RADIUS, 0.45, 12, 64)

  const gates = points.map((p, i) => {
    const center = new THREE.Vector3(...p)
    const next = new THREE.Vector3(...points[(i + 1) % points.length])
    const normal = next.clone().sub(center).normalize()
    const material = new THREE.MeshBasicMaterial({ color: idle.clone() })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(center)
    mesh.lookAt(next)
    scene.add(mesh)
    return { mesh, material, center, normal, passed: false, side: null, pulse: 0 }
  })

  const local = new THREE.Vector3()

  return {
    gates,
    total: gates.length,
    get count() {
      return gates.filter((g) => g.passed).length
    },
    reset() {
      gates.forEach((g) => {
        g.passed = false
        g.material.color.copy(idle)
      })
    },
    update(dt, time, planePosition, onPass) {
      for (const g of gates) {
        local.subVectors(planePosition, g.center)
        const along = local.dot(g.normal)
        const side = Math.sign(along)
        if (g.side !== null && side !== g.side && Math.abs(along) < 10) {
          const lateral = local.addScaledVector(g.normal, -along).length()
          if (lateral < GATE_RADIUS && !g.passed) {
            g.passed = true
            g.pulse = 1
            g.material.color.copy(done)
            onPass?.(g)
          }
        }
        g.side = side
        g.pulse = Math.max(0, g.pulse - dt * 1.5)
        g.mesh.scale.setScalar(1 + g.pulse * 0.4 + Math.sin(time * 2 + g.center.x) * 0.03)
        g.mesh.rotation.z += dt * (g.passed ? 1.2 : 0.3)
      }
    },
  }
}
