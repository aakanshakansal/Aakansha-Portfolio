import * as THREE from 'three'
import { rng } from './helpers.js'

const PLANE_MASS = 60

function rockGeometry(seed) {
  const geometry = new THREE.IcosahedronGeometry(1, 1)
  const pos = geometry.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    // Displacement depends only on the vertex position so shared corners stay welded
    const d =
      1 +
      0.22 * Math.sin(v.x * 3.1 + seed) * Math.sin(v.y * 2.7 + seed * 2) * Math.sin(v.z * 3.3 + seed * 3) +
      0.12 * Math.sin(v.x * 7.0 + v.z * 5.0 + seed)
    v.multiplyScalar(d)
    pos.setXYZ(i, v.x, v.y * 0.85, v.z)
  }
  geometry.computeVertexNormals()
  return geometry
}

// Simple sphere physics shared by asteroids and the floating name letters.
// Bodies with a `home` are gently pulled back to their resting pose after being knocked.
export function createAsteroids(scene, { planets, avoid = [], count = 110, bounds }) {
  const random = rng(7)
  const geometries = [0, 1, 2, 3, 4].map((s) => rockGeometry(s * 1.7 + 0.3))
  const materials = ['#6f6584', '#7c6a62', '#58627a', '#8a7aa8'].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true })
  )

  const bodies = []

  function addBody({ mesh, radius, mass, home = null, kind = 'rock' }) {
    const body = {
      mesh,
      radius,
      mass,
      kind,
      start: mesh.position.clone(),
      home: home ? mesh.position.clone() : null,
      homeQuaternion: mesh.quaternion.clone(),
      velocity: new THREE.Vector3(),
      spin: new THREE.Vector3(),
      knocked: 0,
    }
    bodies.push(body)
    return body
  }

  const p = new THREE.Vector3()
  let attempts = 0
  let rocks = 0
  while (rocks < count && attempts++ < 5000) {
    p.set(
      THREE.MathUtils.lerp(bounds.min.x, bounds.max.x, random()),
      THREE.MathUtils.lerp(bounds.min.y, bounds.max.y, random()),
      THREE.MathUtils.lerp(bounds.min.z, bounds.max.z, random())
    )
    const size = 1.2 + Math.pow(random(), 2.5) * 6
    if (planets.some((pl) => p.distanceTo(pl.position) < pl.radius * 2.3 + size + 8)) continue
    if (avoid.some(([a, r]) => p.distanceTo(a) < r + size)) continue

    const mesh = new THREE.Mesh(geometries[rocks % geometries.length], materials[Math.floor(random() * materials.length)])
    mesh.position.copy(p)
    mesh.scale.setScalar(size)
    mesh.rotation.set(random() * 6, random() * 6, random() * 6)
    scene.add(mesh)
    const body = addBody({ mesh, radius: size * 0.95, mass: size * size * size })
    body.velocity.set((random() - 0.5) * 0.6, (random() - 0.5) * 0.3, (random() - 0.5) * 0.6)
    body.spin.set((random() - 0.5) * 0.4, (random() - 0.5) * 0.4, (random() - 0.5) * 0.4)
    rocks++
  }

  const n = new THREE.Vector3()
  const rel = new THREE.Vector3()
  const spring = new THREE.Vector3()
  const euler = new THREE.Euler()
  const dq = new THREE.Quaternion()

  function collide(a, b, aPos, bPos, aVel, bVel, aMass, bMass, restitution) {
    n.subVectors(bPos, aPos)
    const dist = n.length()
    const minDist = a + b
    if (dist >= minDist || dist === 0) return 0
    n.divideScalar(dist)
    const overlap = minDist - dist
    const total = aMass + bMass
    aPos.addScaledVector(n, (-overlap * bMass) / total)
    bPos.addScaledVector(n, (overlap * aMass) / total)
    rel.subVectors(aVel, bVel)
    const vn = rel.dot(n)
    if (vn <= 0) return 0
    const j = (vn * (1 + restitution)) / (1 / aMass + 1 / bMass)
    aVel.addScaledVector(n, -j / aMass)
    bVel.addScaledVector(n, j / bMass)
    return vn
  }

  const planeVelocity = new THREE.Vector3()

  return {
    bodies,
    addBody,
    reset() {
      bodies.forEach((b) => {
        b.mesh.position.copy(b.start)
        b.velocity.set(0, 0, 0)
      })
    },
    update(dt, plane, onHit, ghost = false) {
      const planePos = plane.root.position
      planeVelocity.copy(plane.state.velocity)
      let strongest = 0
      let strongestBody = null

      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i]
        const pos = b.mesh.position

        // Plane vs body
        const hit = ghost ? 0 : collide(plane.radius, b.radius, planePos, pos, planeVelocity, b.velocity, PLANE_MASS, b.mass, 0.6)
        if (hit > 0) {
          b.spin.x += (Math.random() - 0.5) * hit * 0.08
          b.spin.y += (Math.random() - 0.5) * hit * 0.08
          b.spin.z += (Math.random() - 0.5) * hit * 0.05
          b.knocked = 4
          if (hit > strongest) {
            strongest = hit
            strongestBody = b
          }
        }

        // Body vs body
        for (let k = i + 1; k < bodies.length; k++) {
          const o = bodies[k]
          collide(b.radius, o.radius, pos, o.mesh.position, b.velocity, o.velocity, b.mass, o.mass, 0.5)
        }

        // Body vs planet: bounce off the surface
        for (const pl of planets) {
          n.subVectors(pos, pl.position)
          const d = n.length()
          const minD = pl.radius + b.radius
          if (d < minD) {
            n.divideScalar(d)
            pos.copy(pl.position).addScaledVector(n, minD)
            const vn = b.velocity.dot(n)
            if (vn < 0) b.velocity.addScaledVector(n, -1.6 * vn)
          }
        }

        if (b.home) {
          // After a short tumble, float back into place
          b.knocked = Math.max(0, b.knocked - dt)
          if (b.knocked < 2.5) {
            spring.subVectors(b.home, pos)
            b.velocity.addScaledVector(spring, dt * 1.2)
            b.velocity.multiplyScalar(Math.exp(-dt * 1.6))
            b.spin.multiplyScalar(Math.exp(-dt * 2.5))
            b.mesh.quaternion.slerp(b.homeQuaternion, 1 - Math.exp(-dt * 1.5))
          }
        } else {
          b.velocity.multiplyScalar(Math.exp(-dt * 0.12))
        }

        pos.addScaledVector(b.velocity, dt)
        dq.setFromEuler(euler.set(b.spin.x * dt, b.spin.y * dt, b.spin.z * dt))
        b.mesh.quaternion.multiply(dq)
      }

      if (strongest > 0) {
        // Transfer the impulse back to the plane as a knock-back and lost speed
        plane.state.bump.add(planeVelocity.sub(plane.state.velocity).multiplyScalar(0.8))
        plane.state.speed *= 0.75
        onHit?.(strongest, strongestBody)
      }
    },
  }
}
