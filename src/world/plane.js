import * as THREE from 'three'
import { damp } from './helpers.js'

// Rotate the imported model so its nose points down -Z (the flight direction)
const MODEL_YAW = Math.PI
const MODEL_LENGTH = 6

const MAX_SPEED = 40
const BOOST_SPEED = 80
const CLIMB_SPEED = 20

export async function createPlane(loader, onProgress) {
  const gltf = await loader.loadAsync('/models/aeroplane.glb', (e) => e.total && onProgress?.(e.loaded / e.total))
  const model = gltf.scene

  model.traverse((o) => {
    if (!o.isMesh) return
    const m = o.material
    // The model ships its colour texture in the emissive slot only; use it as the base colour too
    if (m.emissiveMap && !m.map) {
      m.map = m.emissiveMap
      m.color.set('#ffffff')
      m.emissiveIntensity = 0.6
      m.needsUpdate = true
    }
  })

  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  model.position.sub(box.getCenter(new THREE.Vector3()))

  const holder = new THREE.Group()
  holder.add(model)
  holder.scale.setScalar(MODEL_LENGTH / Math.max(size.x, size.y, size.z))
  holder.rotation.y = MODEL_YAW

  const tilt = new THREE.Group() // bank + pitch visuals
  tilt.add(holder)
  const root = new THREE.Group()
  root.add(tilt)

  const state = {
    heading: 0,
    speed: 0,
    vy: 0,
    bank: 0,
    pitch: 0,
    bump: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    forward: new THREE.Vector3(0, 0, -1),
  }

  const tailOffset = new THREE.Vector3(0, 0, MODEL_LENGTH * 0.5)

  return {
    root,
    state,
    radius: MODEL_LENGTH * 0.42,
    maxSpeed: BOOST_SPEED,
    tailPosition(target) {
      return tilt.localToWorld(target.copy(tailOffset))
    },
    reset(position, heading = 0) {
      root.position.set(...position)
      state.heading = heading
      state.speed = 0
      state.vy = 0
      state.bump.set(0, 0, 0)
    },
    update(dt, input, time) {
      let target = 4 // gentle idle drift
      if (input.throttle > 0) target = (input.boost ? BOOST_SPEED : MAX_SPEED) * input.throttle
      else if (input.throttle < 0) target = 14 * input.throttle
      if (input.brake) target = 0
      state.speed = damp(state.speed, target, input.boost ? 1.4 : 1.1, dt)

      const speedFactor = Math.min(Math.abs(state.speed) / MAX_SPEED, 1)
      const turnRate = 1.6 * (0.45 + speedFactor * 0.55)
      state.heading += input.turn * turnRate * dt

      state.vy = damp(state.vy, input.lift * CLIMB_SPEED, 3, dt)

      state.forward.set(-Math.sin(state.heading), 0, -Math.cos(state.heading))
      state.velocity.copy(state.forward).multiplyScalar(state.speed)
      state.velocity.y = state.vy
      state.velocity.add(state.bump)
      state.bump.multiplyScalar(Math.exp(-dt * 2.2))

      root.position.addScaledVector(state.velocity, dt)
      root.position.y = THREE.MathUtils.clamp(root.position.y, -60, 80)
      root.rotation.y = state.heading

      state.bank = damp(state.bank, input.turn * (0.35 + speedFactor * 0.45), 4, dt)
      state.pitch = damp(state.pitch, input.lift * 0.35, 4, dt)
      tilt.rotation.set(state.pitch, 0, state.bank)
      tilt.position.y = Math.sin(time * 1.6) * 0.25
    },
  }
}
