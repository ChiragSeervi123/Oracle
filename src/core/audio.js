import { emit } from './state.js'

// Fully synthesised soundscape: no audio files, nothing plays until the visitor opts in.
// A low drone that opens up while the oracle is being held, a shimmer that rises with the
// charge, a bell when a reading lands, and a brighter air in the negative world.
class OracleAudio {
  ctx = null
  enabled = false
  lastUpdate = 0

  build() {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return false
    const ctx = (this.ctx = new Ctx())

    const master = (this.master = ctx.createGain())
    master.gain.value = 0
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -12
    limiter.ratio.value = 6
    master.connect(limiter).connect(ctx.destination)

    // Long, dark hall reverb from a generated impulse response.
    const verb = ctx.createConvolver()
    verb.buffer = this.impulse(4.5, 2.4)
    const verbGain = ctx.createGain()
    verbGain.gain.value = 0.55
    verb.connect(verbGain).connect(master)

    const bus = (this.bus = ctx.createGain())
    bus.gain.value = 1
    bus.connect(master)
    bus.connect(verb)

    // Drone
    const filter = (this.filter = ctx.createBiquadFilter())
    filter.type = 'lowpass'
    filter.frequency.value = 360
    filter.Q.value = 0.9
    filter.connect(bus)

    const voices = [
      { type: 'sine', freq: 55, gain: 0.32 },
      { type: 'sine', freq: 82.41, gain: 0.18, detune: 5 },
      { type: 'triangle', freq: 110, gain: 0.07, detune: -7 },
      { type: 'sine', freq: 27.5, gain: 0.25 },
    ]
    this.drone = voices.map((v) => {
      const osc = ctx.createOscillator()
      osc.type = v.type
      osc.frequency.value = v.freq
      osc.detune.value = v.detune || 0
      const g = ctx.createGain()
      g.gain.value = v.gain
      osc.connect(g).connect(filter)
      osc.start()
      return { osc, base: v.freq }
    })

    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.06
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 120
    lfo.connect(lfoGain).connect(filter.frequency)
    lfo.start()

    // Shimmer, rises with the hold
    this.shimmerGain = ctx.createGain()
    this.shimmerGain.gain.value = 0
    this.shimmerGain.connect(bus)
    this.shimmer = [880, 1318.5, 1760.7].map((f, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = f
      osc.detune.value = (i - 1) * 9
      const g = ctx.createGain()
      g.gain.value = 0.33 / (i + 1)
      osc.connect(g).connect(this.shimmerGain)
      osc.start()
      return osc
    })

    // Air: band-passed noise
    const noise = ctx.createBufferSource()
    noise.buffer = this.noiseBuffer(3)
    noise.loop = true
    const band = (this.airFilter = ctx.createBiquadFilter())
    band.type = 'bandpass'
    band.frequency.value = 900
    band.Q.value = 0.7
    this.airGain = ctx.createGain()
    this.airGain.gain.value = 0.018
    noise.connect(band).connect(this.airGain).connect(bus)
    noise.start()
    return true
  }

  noiseBuffer(seconds) {
    const { ctx } = this
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      // Brownian-ish noise: softer than white
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
      data[i] = last * 3.5
    }
    return buffer
  }

  impulse(seconds, decay) {
    const { ctx } = this
    const length = ctx.sampleRate * seconds
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch)
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
    return buffer
  }

  async enable() {
    if (!this.ctx && !this.build()) return
    await this.ctx.resume()
    this.enabled = true
    this.master.gain.cancelScheduledValues(this.ctx.currentTime)
    this.master.gain.setTargetAtTime(0.6, this.ctx.currentTime, 1.2)
    emit('audio', true)
  }

  disable() {
    if (this.ctx) this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25)
    this.enabled = false
    emit('audio', false)
  }

  toggle() {
    return this.enabled ? this.disable() : this.enable()
  }

  update(s, time) {
    if (!this.enabled || !this.ctx || time - this.lastUpdate < 0.05) return
    this.lastUpdate = time
    const t = this.ctx.currentTime
    const h = s.hold
    const speed = Math.min(Math.abs(s.velocity), 2)
    this.filter.frequency.setTargetAtTime(340 + h * h * 2600 + speed * 260 + s.negative * 500, t, 0.15)
    this.shimmerGain.gain.setTargetAtTime(h * h * 0.07 + s.negative * 0.012, t, 0.12)
    this.drone.forEach(({ osc, base }) => osc.frequency.setTargetAtTime(base * (1 + h * 0.059), t, 0.2))
    this.airGain.gain.setTargetAtTime(0.018 + speed * 0.03 + s.negative * 0.02, t, 0.2)
    this.airFilter.frequency.setTargetAtTime(900 + speed * 900 + s.negative * 1600, t, 0.2)
  }

  // The reading lands: a struck bell with inharmonic partials over a falling sub.
  chime() {
    if (!this.enabled || !this.ctx) return
    const { ctx } = this
    const t = ctx.currentTime
    const root = 392
    ;[1, 2, 2.76, 4.07, 5.4, 6.8].forEach((ratio, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = root * ratio
      const peak = 0.22 / (i + 1)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(peak, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 5.5 - i * 0.6)
      osc.connect(g).connect(this.bus)
      osc.start(t)
      osc.stop(t + 6)
    })
    const sub = ctx.createOscillator()
    const sg = ctx.createGain()
    sub.frequency.setValueAtTime(110, t)
    sub.frequency.exponentialRampToValueAtTime(36, t + 1.4)
    sg.gain.setValueAtTime(0.45, t)
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.8)
    sub.connect(sg).connect(this.bus)
    sub.start(t)
    sub.stop(t + 2)
  }
}

export const audio = new OracleAudio()
