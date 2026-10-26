// North-up radar of the whole system, drawn on a 2D canvas
export function createMinimap(canvas, planets, gates, bounds) {
  const ctx = canvas.getContext('2d')
  const size = canvas.width
  const pad = 18
  const spanX = bounds.max.x - bounds.min.x
  const spanZ = bounds.max.z - bounds.min.z
  const scale = (size - pad * 2) / Math.max(spanX, spanZ)
  const ox = pad + ((size - pad * 2) - spanX * scale) / 2
  const oz = pad + ((size - pad * 2) - spanZ * scale) / 2
  const toMap = (x, z) => [ox + (x - bounds.min.x) * scale, oz + (z - bounds.min.z) * scale]
  let visible = true

  return {
    toggle() {
      visible = !visible
      canvas.classList.toggle('hidden', !visible)
      return visible
    },
    draw(planePosition, heading, time) {
      if (!visible) return
      ctx.clearRect(0, 0, size, size)

      for (const g of gates.gates) {
        const [x, y] = toMap(g.center.x, g.center.z)
        ctx.strokeStyle = g.passed ? '#5eead4' : 'rgba(192,132,252,0.7)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, Math.PI * 2)
        ctx.stroke()
      }

      ctx.font = '700 9px Orbitron, sans-serif'
      ctx.textAlign = 'center'
      for (const p of planets) {
        const [x, y] = toMap(p.position.x, p.position.z)
        ctx.fillStyle = p.section.accent
        ctx.shadowColor = p.section.accent
        ctx.shadowBlur = 8
        ctx.beginPath()
        ctx.arc(x, y, Math.max(4, p.radius * scale), 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle = 'rgba(238,234,255,0.85)'
        ctx.fillText(p.section.label, x, y - Math.max(4, p.radius * scale) - 4)
      }

      const [px, py] = toMap(planePosition.x, planePosition.z)
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(-heading)
      ctx.fillStyle = '#ffffff'
      ctx.shadowColor = '#ffffff'
      ctx.shadowBlur = 6 + Math.sin(time * 6) * 3
      ctx.beginPath()
      ctx.moveTo(0, -7)
      ctx.lineTo(5, 5)
      ctx.lineTo(0, 2)
      ctx.lineTo(-5, 5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    },
  }
}
