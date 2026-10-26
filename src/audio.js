// Every sound is synthesized with Web Audio, so there are no audio files to download
export function createAudio() {
  let ctx = null
  let master, engineOsc, engineSub, engineFilter, engineGain, noiseBuffer
  let enabled = true

  function start() {
    if (ctx) return
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = enabled ? 0.55 : 0
    master.connect(ctx.destination)

    // Engine hum
    engineFilter = ctx.createBiquadFilter()
    engineFilter.type = 'lowpass'
    engineFilter.frequency.value = 300
    engineGain = ctx.createGain()
    engineGain.gain.value = 0.03
    engineOsc = ctx.createOscillator()
    engineOsc.type = 'sawtooth'
    engineOsc.frequency.value = 48
    engineSub = ctx.createOscillator()
    engineSub.type = 'triangle'
    engineSub.frequency.value = 96
    engineOsc.connect(engineFilter)
    engineSub.connect(engineFilter)
    engineFilter.connect(engineGain).connect(master)
    engineOsc.start()
    engineSub.start()

    // Ambient space pad: a slow-breathing chord
    const padGain = ctx.createGain()
    padGain.gain.value = 0.045
    const padFilter = ctx.createBiquadFilter()
    padFilter.type = 'lowpass'
    padFilter.frequency.value = 900
    padFilter.connect(padGain).connect(master)
    ;[110, 164.81, 246.94, 329.63].forEach((f, i) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      o.detune.value = (i - 1.5) * 6
      const g = ctx.createGain()
      g.gain.value = 0.25
      const lfo = ctx.createOscillator()
      lfo.frequency.value = 0.05 + i * 0.03
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = 0.2
      lfo.connect(lfoGain).connect(g.gain)
      o.connect(g).connect(padFilter)
      o.start()
      lfo.start()
    })

    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }

  return {
    start,
    get enabled() {
      return enabled
    },
    toggle() {
      enabled = !enabled
      if (ctx) master.gain.setTargetAtTime(enabled ? 0.55 : 0, ctx.currentTime, 0.1)
      return enabled
    },
    setEngine(ratio, boosting) {
      if (!ctx) return
      const t = ctx.currentTime
      engineOsc.frequency.setTargetAtTime(44 + ratio * 70, t, 0.15)
      engineSub.frequency.setTargetAtTime(88 + ratio * 140, t, 0.15)
      engineFilter.frequency.setTargetAtTime(220 + ratio * (boosting ? 2200 : 1200), t, 0.2)
      engineGain.gain.setTargetAtTime(0.02 + ratio * 0.06, t, 0.2)
    },
    bump(strength) {
      if (!ctx) return
      const t = ctx.currentTime
      const src = ctx.createBufferSource()
      src.buffer = noiseBuffer
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 300 + Math.min(strength, 60) * 25
      const g = ctx.createGain()
      g.gain.setValueAtTime(Math.min(0.15 + strength * 0.02, 0.7), t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      src.connect(filter).connect(g).connect(master)
      src.start(t)
      src.stop(t + 0.5)
    },
    chime(notes = [659.25, 830.61, 987.77, 1318.5]) {
      if (!ctx) return
      const t = ctx.currentTime
      notes.forEach((f, i) => {
        const o = ctx.createOscillator()
        o.type = 'sine'
        o.frequency.value = f
        const g = ctx.createGain()
        const at = t + i * 0.07
        g.gain.setValueAtTime(0, at)
        g.gain.linearRampToValueAtTime(0.12, at + 0.02)
        g.gain.exponentialRampToValueAtTime(0.001, at + 0.6)
        o.connect(g).connect(master)
        o.start(at)
        o.stop(at + 0.65)
      })
    },
  }
}
