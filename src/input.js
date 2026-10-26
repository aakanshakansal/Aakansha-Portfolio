const HOLD = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['Space', 'KeyE'],
  down: ['KeyQ', 'KeyC'],
  boost: ['ShiftLeft', 'ShiftRight'],
  brake: ['KeyB'],
}

const ACTIONS = {
  Enter: 'interact',
  NumpadEnter: 'interact',
  Escape: 'close',
  KeyR: 'respawn',
  KeyM: 'map',
  KeyL: 'mute',
  KeyH: 'help',
}

const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

export function createInput() {
  const keys = new Set()
  const listeners = {}
  const touch = { turn: 0, throttle: 0, up: false, down: false, boost: false }
  const emit = (action) => (listeners[action] ?? []).forEach((fn) => fn())

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey) return
    if (PREVENT.has(e.code)) e.preventDefault()
    keys.add(e.code)
    if (!e.repeat && ACTIONS[e.code]) emit(ACTIONS[e.code])
  })
  window.addEventListener('keyup', (e) => keys.delete(e.code))
  window.addEventListener('blur', () => keys.clear())

  // ---------- Touch joystick ----------
  const joy = document.getElementById('joy')
  const knob = document.getElementById('joy-knob')
  let joyId = null
  const moveJoy = (e) => {
    const rect = joy.getBoundingClientRect()
    let x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
    let y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)
    const len = Math.hypot(x, y)
    if (len > 1) { x /= len; y /= len }
    knob.style.transform = `translate(${x * 34}px, ${y * 34}px)`
    touch.turn = Math.abs(x) > 0.15 ? -x : 0
    touch.throttle = Math.abs(y) > 0.15 ? -y : 0
  }
  joy.addEventListener('pointerdown', (e) => {
    joyId = e.pointerId
    joy.setPointerCapture(e.pointerId)
    moveJoy(e)
  })
  joy.addEventListener('pointermove', (e) => e.pointerId === joyId && moveJoy(e))
  const endJoy = (e) => {
    if (e.pointerId !== joyId) return
    joyId = null
    knob.style.transform = ''
    touch.turn = touch.throttle = 0
  }
  joy.addEventListener('pointerup', endJoy)
  joy.addEventListener('pointercancel', endJoy)

  document.querySelectorAll('.touch-btns button').forEach((btn) => {
    const k = btn.dataset.k
    const set = (v) => (e) => {
      e.preventDefault()
      touch[k] = v
      btn.classList.toggle('active', v)
    }
    btn.addEventListener('pointerdown', set(true))
    btn.addEventListener('pointerup', set(false))
    btn.addEventListener('pointerleave', set(false))
    btn.addEventListener('pointercancel', set(false))
  })

  const held = (name) => HOLD[name].some((code) => keys.has(code))
  const clamp1 = (v) => Math.max(-1, Math.min(1, v))

  // Gamepad (standard mapping): RT/LT throttle, left stick turn, right stick climb,
  // A interact, B close, X boost, Y respawn
  const pad = { turn: 0, throttle: 0, lift: 0, boost: false }
  const padPrev = []
  const deadzone = (v) => (Math.abs(v) < 0.15 ? 0 : v)
  function pollGamepad() {
    const gp = navigator.getGamepads?.().find((g) => g)
    if (!gp) {
      pad.turn = pad.throttle = pad.lift = 0
      pad.boost = false
      return
    }
    const b = (i) => gp.buttons[i]?.value ?? 0
    pad.turn = -deadzone(gp.axes[0] ?? 0)
    pad.lift = -deadzone(gp.axes[3] ?? 0)
    pad.throttle = b(7) - b(6)
    pad.boost = b(2) > 0.5
    ;[[0, 'interact'], [1, 'close'], [3, 'respawn']].forEach(([i, action]) => {
      const pressed = b(i) > 0.5
      if (pressed && !padPrev[i]) emit(action)
      padPrev[i] = pressed
    })
  }

  return {
    on(action, fn) {
      ;(listeners[action] ??= []).push(fn)
    },
    read(enabled = true) {
      pollGamepad()
      if (!enabled) return { throttle: 0, turn: 0, lift: 0, boost: false, brake: true }
      return {
        throttle: clamp1((held('forward') ? 1 : 0) - (held('back') ? 1 : 0) + touch.throttle + pad.throttle),
        turn: clamp1((held('left') ? 1 : 0) - (held('right') ? 1 : 0) + touch.turn + pad.turn),
        lift: clamp1((held('up') || touch.up ? 1 : 0) - (held('down') || touch.down ? 1 : 0) + pad.lift),
        boost: held('boost') || touch.boost || pad.boost,
        brake: held('brake'),
      }
    },
  }
}
