import * as THREE from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import fontData from 'three/examples/fonts/helvetiker_bold.typeface.json'
import { makeLabel } from './helpers.js'

const GRADIENT = ['#c4b5fd', '#f0abfc', '#5eead4'].map((c) => new THREE.Color(c))

function gradientAt(t) {
  const x = t * (GRADIENT.length - 1)
  const i = Math.min(Math.floor(x), GRADIENT.length - 2)
  return GRADIENT[i].clone().lerp(GRADIENT[i + 1], x - i)
}

// Big 3D letters floating at the launch pad. Each letter is a physics body you can knock around.
export function createName(scene, physics, { text, subtitle, position, size = 5 }) {
  const font = new FontLoader().parse(fontData)
  const group = new THREE.Group()
  group.position.copy(position)
  scene.add(group)

  const glyphs = []
  let cursor = 0
  const chars = [...text]
  const visible = chars.filter((c) => c !== ' ').length
  let index = 0
  for (const ch of chars) {
    if (ch === ' ') {
      cursor += size * 0.75
      continue
    }
    const geometry = new TextGeometry(ch, {
      font,
      size,
      depth: size * 0.4,
      curveSegments: 6,
      bevelEnabled: true,
      bevelThickness: size * 0.07,
      bevelSize: size * 0.05,
      bevelSegments: 3,
    })
    geometry.computeBoundingBox()
    const width = geometry.boundingBox.max.x - geometry.boundingBox.min.x
    geometry.center()
    const color = gradientAt(index++ / Math.max(visible - 1, 1))
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.35, emissive: color, emissiveIntensity: 0.18 })
    )
    mesh.position.x = cursor + width / 2
    glyphs.push(mesh)
    cursor += width + size * 0.18
  }

  // Centre the word, then hand each letter to the physics world in world space
  for (const mesh of glyphs) {
    mesh.position.x -= cursor / 2
    mesh.position.add(position)
    scene.add(mesh)
    physics.addBody({ mesh, radius: size * 0.5, mass: size * size * 4, home: true, kind: 'letter' })
  }

  if (subtitle) {
    const label = makeLabel(subtitle, { font: '800 64px Orbitron', color: '#e9e4ff', glow: '#8b5cf6', height: size * 0.55 })
    label.position.y = -size * 1.05
    group.add(label)
  }

  return { width: cursor }
}
