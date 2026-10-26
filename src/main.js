import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { sections, SPAWN, GATES, profile } from './content.js'
import { createSpace } from './world/space.js'
import { createPlanet } from './world/planets.js'
import { createPlane } from './world/plane.js'
import { createTrail } from './world/trail.js'
import { createAsteroids } from './world/asteroids.js'
import { createGates } from './world/gates.js'
import { createName } from './world/name.js'
import { createWarp, createShootingStars, createSecretStar } from './world/effects.js'
import { damp } from './world/helpers.js'
import { createInput } from './input.js'
import { createUI } from './ui.js'
import { createAudio } from './audio.js'
import { createMinimap } from './minimap.js'
import { createMarkers } from './markers.js'
import { createAchievements } from './achievements.js'

const WORLD = {
  min: new THREE.Vector3(-290, -45, -600),
  max: new THREE.Vector3(290, 55, 130),
}
const NAME_POSITION = new THREE.Vector3(0, 10, 22)
const SECRET_POSITION = new THREE.Vector3(230, 48, 115)

const ui = createUI()
const input = createInput()
const audio = createAudio()
const achievements = createAchievements({
  onUnlock(item) {
    ui.toast(`🏆 ${item.title} — ${item.text}`, 3000)
    ui.setTrophies(achievements.count, achievements.total, true)
    audio.chime([783.99, 987.77, 1174.66, 1567.98])
  },
})
ui.setTrophies(achievements.count, achievements.total)

// ---------- Renderer ----------
const canvas = document.getElementById('scene')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 9000)
camera.position.set(0, 20, 110)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.6, 0.85)
composer.addPass(bloom)
composer.addPass(new OutputPass())

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

// ---------- World ----------
ui.setProgress(0.05)
await Promise.all([document.fonts.load('900 96px Orbitron'), document.fonts.load('800 64px Nunito')]).catch(() => {})
ui.setProgress(0.15)

const space = createSpace(scene)
const planets = []
for (const section of sections) {
  const planet = createPlanet(section)
  scene.add(planet.group)
  planets.push(planet)
  ui.setProgress(0.15 + (planets.length / sections.length) * 0.35)
  await new Promise(requestAnimationFrame) // let the loading bar repaint between planets
}

const plane = await createPlane(new GLTFLoader(), (p) => ui.setProgress(0.5 + p * 0.4))
plane.reset(SPAWN.position, SPAWN.heading)
scene.add(plane.root)

const trail = createTrail(scene)
const warp = createWarp(scene)
const shootingStars = createShootingStars(scene)
const secret = createSecretStar(scene, SECRET_POSITION)
const gates = createGates(scene, GATES)
const spawnPoint = new THREE.Vector3(...SPAWN.position)
const physics = createAsteroids(scene, {
  planets,
  bounds: WORLD,
  avoid: [[spawnPoint, 45], [NAME_POSITION, 50], [SECRET_POSITION, 15], ...gates.gates.map((g) => [g.center, 16])],
})
createName(scene, physics, {
  text: profile.name.toUpperCase(),
  subtitle: 'FRONTEND · REACT · THREE.JS',
  position: NAME_POSITION,
  size: 5,
})
const minimap = createMinimap(document.getElementById('minimap'), planets, gates, WORLD)
const markers = createMarkers(document.getElementById('markers'), planets, camera)
ui.setGates(0, gates.total)
ui.setProgress(1)

// ---------- Sections ----------
const explored = new Set()
function openSection(section) {
  ui.openPanel(section)
  if (!sections.includes(section)) return
  explored.add(section.id)
  achievements.unlock('first-planet')
  if (explored.size === sections.length) achievements.unlock('all-planets')
}
function openAchievements() {
  ui.openPanel({ label: 'ACHIEVEMENTS', accent: '#ffd166' }, achievements.html())
}

document.getElementById('panel-body').addEventListener('click', (e) => {
  const link = e.target.closest('a[href]')
  if (link && /^(mailto:|https?:)/.test(link.getAttribute('href'))) achievements.unlock('contact')
  if (e.target.id === 'reset-achievements') {
    achievements.reset()
    ui.setTrophies(0, achievements.total)
    openAchievements()
  }
})

// ---------- Camera ----------
const cam = { yaw: 0, pitch: 0, zoom: 1, shake: 0, intro: 0 }
const lookTarget = new THREE.Vector3().copy(NAME_POSITION)
const desired = new THREE.Vector3()
const tmp = new THREE.Vector3()
let dragging = null
let dragDistance = 0

// Click a planet (or its name) to open its section; show a pointer when hovering one
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const pickables = planets.flatMap((p) => [p.body, p.label])
function planetUnder(e) {
  pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
  raycaster.setFromCamera(pointer, camera)
  return raycaster.intersectObjects(pickables, false)[0]?.object.userData.section ?? null
}

canvas.addEventListener('pointerdown', (e) => {
  dragging = { x: e.clientX, y: e.clientY }
  dragDistance = 0
})
window.addEventListener('pointermove', (e) => {
  if (!dragging) {
    if (started && e.target === canvas && e.pointerType === 'mouse') canvas.style.cursor = planetUnder(e) ? 'pointer' : ''
    return
  }
  const dx = e.clientX - dragging.x
  const dy = e.clientY - dragging.y
  dragDistance += Math.abs(dx) + Math.abs(dy)
  cam.yaw -= dx * 0.006
  cam.pitch = THREE.MathUtils.clamp(cam.pitch + dy * 0.004, -0.5, 0.9)
  dragging = { x: e.clientX, y: e.clientY }
})
window.addEventListener('pointerup', (e) => {
  if (dragging && dragDistance < 6 && started) {
    const section = planetUnder(e)
    if (section) openSection(section)
  }
  dragging = null
})
canvas.addEventListener('wheel', (e) => {
  cam.zoom = THREE.MathUtils.clamp(cam.zoom + e.deltaY * 0.001, 0.6, 2.2)
}, { passive: true })

function updateCamera(dt, time) {
  const s = plane.state
  const pos = plane.root.position
  if (!started) {
    // Cinematic sweep in front of the name while the loader is up
    const a = Math.sin(time * 0.12) * 0.8
    tmp.set(NAME_POSITION.x, NAME_POSITION.y - 2, NAME_POSITION.z + 8)
    desired.set(tmp.x + Math.sin(a) * 62, tmp.y + 6 + Math.sin(time * 0.2) * 4, tmp.z + Math.cos(a) * 62)
    camera.position.lerp(desired, 1 - Math.exp(-dt * 1.5))
    lookTarget.lerp(tmp, 1 - Math.exp(-dt * 2))
    camera.lookAt(lookTarget)
    return
  }
  // Swoop from the intro shot into the chase cam
  cam.intro = Math.min(1, cam.intro + dt * 0.4)
  const follow = 0.8 + cam.intro * cam.intro * 3.7

  if (!dragging) {
    cam.yaw = damp(cam.yaw, 0, 1.2, dt)
    cam.pitch = damp(cam.pitch, 0, 1.2, dt)
  }
  const speedRatio = Math.min(Math.abs(s.speed) / plane.maxSpeed, 1)
  const portrait = camera.aspect < 1 ? 1.7 : 1
  const distance = (15 + speedRatio * 8) * cam.zoom * portrait
  const h = s.heading + cam.yaw
  const p = 0.24 + cam.pitch - s.vy * 0.004
  desired.set(Math.sin(h) * Math.cos(p), Math.sin(p), Math.cos(h) * Math.cos(p)).multiplyScalar(distance).add(pos)
  camera.position.lerp(desired, 1 - Math.exp(-dt * follow))

  tmp.copy(s.forward).multiplyScalar(6 + speedRatio * 6).add(pos)
  tmp.y += 1.5
  lookTarget.lerp(tmp, 1 - Math.exp(-dt * (2 + cam.intro * 6)))
  camera.lookAt(lookTarget)

  if (cam.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * cam.shake
    camera.position.y += (Math.random() - 0.5) * cam.shake
    cam.shake = Math.max(0, cam.shake - dt * 3)
  }

  const targetFov = 60 + speedRatio * 14
  if (Math.abs(camera.fov - targetFov) > 0.05) {
    camera.fov = damp(camera.fov, targetFov, 3, dt)
    camera.updateProjectionMatrix()
  }
}

// ---------- Interaction ----------
let started = false
let nearest = null
let rockHits = 0
const announced = new Set()

function respawn() {
  plane.reset(SPAWN.position, SPAWN.heading)
  ui.toast('Back at the launch pad 🚀')
}

input.on('interact', () => {
  if (!started) return
  if (ui.isPanelOpen) ui.closePanel()
  else if (nearest) openSection(nearest.section)
})
input.on('close', () => {
  ui.closePanel()
  ui.toggleHelp(false)
})
input.on('respawn', () => started && respawn())
input.on('map', () => ui.setButtonOff('btn-map', !minimap.toggle()))
input.on('mute', () => ui.setButtonOff('btn-sound', !audio.toggle()))
input.on('help', () => ui.toggleHelp())

document.getElementById('prompt-btn').addEventListener('click', () => nearest && openSection(nearest.section))
document.getElementById('panel-close').addEventListener('click', () => ui.closePanel())
document.getElementById('btn-sound').addEventListener('click', () => ui.setButtonOff('btn-sound', !audio.toggle()))
document.getElementById('btn-map').addEventListener('click', () => ui.setButtonOff('btn-map', !minimap.toggle()))
document.getElementById('btn-respawn').addEventListener('click', respawn)
document.getElementById('btn-help').addEventListener('click', () => ui.toggleHelp())
document.getElementById('btn-trophy').addEventListener('click', openAchievements)

ui.ready(() => {
  started = true
  audio.start()
  ui.toast('Fly to a planet and press Enter to explore ✨', 4000)
  setTimeout(() => achievements.unlock('launch'), 1800)
})

document.getElementById('skip-link').addEventListener('click', (e) => {
  e.preventDefault()
  document.getElementById('launch').click()
  const all = sections.map((s) => s.html).join('<div class="section-divider"></div>')
  ui.openPanel({ label: 'RÉSUMÉ', accent: '#b794ff' }, all)
})

// ---------- Loop ----------
const clock = new THREE.Clock()
const tail = new THREE.Vector3()
const push = new THREE.Vector3()
const flightDir = new THREE.Vector3()

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 20)
  const time = clock.elapsedTime

  const controls = input.read(started && !ui.isPanelOpen)
  plane.update(dt, controls, time)

  // Keep the plane outside planets and inside the play area
  const pos = plane.root.position
  for (const p of planets) {
    push.subVectors(pos, p.position)
    const minDist = p.radius + plane.radius + 1
    const d = push.length()
    if (d < minDist) {
      push.divideScalar(d)
      pos.copy(p.position).addScaledVector(push, minDist)
      plane.state.bump.addScaledVector(push, 12)
      plane.state.speed *= 0.5
      cam.shake = 0.6
    }
  }
  const margin = 80
  if (pos.x < WORLD.min.x - margin || pos.x > WORLD.max.x + margin || pos.z < WORLD.min.z - margin || pos.z > WORLD.max.z + margin) {
    // Gently steer back towards the centre of the system
    push.set((WORLD.min.x + WORLD.max.x) / 2, 0, (WORLD.min.z + WORLD.max.z) / 2).sub(pos).setY(0).normalize()
    plane.state.bump.addScaledVector(push, dt * 40)
  }

  physics.update(dt, plane, (strength, body) => {
    cam.shake = Math.min(1.2, strength * 0.04)
    audio.bump(strength)
    if (body.kind === 'letter') achievements.unlock('name')
    else if (strength > 2 && ++rockHits >= 15) achievements.unlock('smash')
  })

  gates.update(dt, time, pos, () => {
    audio.chime()
    ui.setGates(gates.count, gates.total)
    achievements.unlock('first-ring')
    if (gates.count === gates.total) {
      achievements.unlock('all-rings')
      audio.chime([523.25, 659.25, 783.99, 1046.5, 1318.5])
    } else {
      ui.toast(`Ring ${gates.count} / ${gates.total} ✨`, 1400)
    }
  })

  if (secret.update(time, pos, plane.radius)) {
    secret.collect()
    cam.shake = 0.5
    achievements.unlock('secret')
  }

  // Nearest planet within its zone
  nearest = null
  let best = Infinity
  for (const p of planets) {
    p.update(time, dt)
    const d = pos.distanceTo(p.position)
    if (d < p.zoneRadius && d < best) {
      best = d
      nearest = p
    }
  }
  if (started) {
    ui.showPrompt(nearest?.section ?? null)
    if (nearest && !announced.has(nearest.section.id)) {
      announced.add(nearest.section.id)
      ui.toast(`Approaching ${nearest.section.label} — press Enter`, 2200)
    }
  }

  const speed = Math.abs(plane.state.speed)
  const speedRatio = Math.min(speed / plane.maxSpeed, 1)
  if (speed > 72) achievements.unlock('boost')

  trail.update(dt, plane.tailPosition(tail), speedRatio)
  updateCamera(dt, time)
  flightDir.copy(plane.state.velocity).normalize()
  warp.update(dt, camera.position, flightDir, controls.boost && speed > 30 ? 1 : speed > 35 ? 0.25 : 0)
  shootingStars.update(dt, camera.position)
  space.update(time, camera.position)
  minimap.draw(pos, plane.state.heading, time)
  markers.update(pos, started && !ui.isPanelOpen)
  ui.setSpeed(speed * 3.6)
  audio.setEngine(speedRatio, controls.boost)

  composer.render()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)
