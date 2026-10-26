import * as THREE from 'three'

// Edge-of-screen arrows pointing to planets that are off-screen
export function createMarkers(container, planets, camera) {
  const items = planets.map((p) => {
    const el = document.createElement('div')
    el.className = 'marker'
    el.style.setProperty('--c', p.section.accent)
    el.innerHTML = `<i></i><span>${p.section.label}</span><small></small>`
    container.appendChild(el)
    return { p, el, arrow: el.querySelector('i'), distance: el.querySelector('small'), visible: false }
  })
  const v = new THREE.Vector3()

  return {
    update(planePosition, enabled) {
      const w = window.innerWidth
      const h = window.innerHeight
      for (const item of items) {
        v.copy(item.p.position).project(camera)
        let x = v.x
        let y = v.y
        const behind = v.z > 1
        if (behind) {
          x = -x
          y = -y
        }
        const onScreen = !behind && Math.abs(x) < 0.96 && Math.abs(y) < 0.94
        const show = enabled && !onScreen
        if (show !== item.visible) {
          item.visible = show
          item.el.classList.toggle('show', show)
        }
        if (!show) continue

        if (behind && Math.abs(x) < 0.01 && Math.abs(y) < 0.01) y = -1
        const m = Math.max(Math.abs(x) / 0.9, Math.abs(y) / 0.8)
        x /= m
        y /= m
        const sx = ((x + 1) / 2) * w
        const sy = ((1 - y) / 2) * h
        item.el.style.transform = `translate(${sx}px, ${sy}px)`
        item.arrow.style.transform = `rotate(${Math.atan2(-y, x)}rad)`
        item.distance.textContent = `${Math.round(item.p.position.distanceTo(planePosition))} m`
      }
    },
  }
}
