import { emit } from './state.js'

// Fully synthesised soundscape: no audio files, nothing plays until the visitor opts in.
// A low drone that opens up while the oracle is being held, a shimmer that rises with the
// charge, a bell when a reading lands, and a brighter air in the negative world.
class OracleAudio {
  ctx = null
  enabled = false
  lastUpdate = 0
  stages = new Map()
  out = null
  duckUntil = 0

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

    // Command cues get a lighter reverb send than the ambience, so each stays distinct
    // instead of dissolving into the same long wash.
    this.cueBus = ctx.createGain()
    this.cueBus.connect(master)
    const cueSend = ctx.createGain()
    cueSend.gain.value = 0.22
    this.cueBus.connect(cueSend).connect(verb)

    // Drone
    const filter = (this.filter = ctx.createBiquadFilter())
    filter.type = 'lowpass'
    filter.frequency.value = 360
    filter.Q.value = 0.9
    this.droneGain = ctx.createGain()
    filter.connect(this.droneGain).connect(bus)

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

    this.whiteNoise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const white = this.whiteNoise.getChannelData(0)
    for (let i = 0; i < white.length; i++) white[i] = Math.random() * 2 - 1
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
    const W = s.world
    const brightness = W ? W['audio.brightness'] : 1
    this.filter.frequency.setTargetAtTime((340 + h * h * 2600 + speed * 260 + s.negative * 500) * brightness, t, 0.15)
    this.shimmerGain.gain.setTargetAtTime(h * h * 0.07 + s.negative * 0.012 + (W ? W['audio.shimmer'] : 0) * 0.03, t, 0.12)
    const duck = t < this.duckUntil ? 0.35 : 1 // the drone steps back while a cue speaks
    this.droneGain.gain.setTargetAtTime((W ? W['audio.level'] : 1) * duck, t, 0.12)
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

  // ——— Building blocks for command cues ———

  tone(freq, { type = 'sine', at = 0, attack = 0.005, peak = 0.12, decay = 1.2, glide } = {}) {
    const { ctx } = this
    const t = ctx.currentTime + at
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + attack + decay)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
    osc.connect(g).connect(this.out ?? this.bus)
    osc.start(t)
    osc.stop(t + attack + decay + 0.05)
  }

  hiss({ at = 0, dur = 0.6, type = 'bandpass', freq = 2000, to, q = 0.8, peak = 0.06, attack = 0.01 } = {}) {
    const { ctx } = this
    const t = ctx.currentTime + at
    const src = ctx.createBufferSource()
    src.buffer = this.whiteNoise
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.setValueAtTime(freq, t)
    filter.Q.value = q
    if (to) filter.frequency.exponentialRampToValueAtTime(to, t + attack + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur)
    src.connect(filter).connect(g).connect(this.out ?? this.bus)
    src.start(t, Math.random())
    src.stop(t + attack + dur + 0.05)
  }

  // A struck glass: frequency modulation that fades into a pure tone.
  ping(freq, { at = 0, peak = 0.05, decay = 1.8 } = {}) {
    const { ctx } = this
    const t = ctx.currentTime + at
    const carrier = ctx.createOscillator()
    const mod = ctx.createOscillator()
    const depth = ctx.createGain()
    const g = ctx.createGain()
    carrier.frequency.value = freq
    mod.frequency.value = freq * 3.5
    depth.gain.setValueAtTime(freq * 2, t)
    depth.gain.exponentialRampToValueAtTime(1, t + decay)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    mod.connect(depth).connect(carrier.frequency)
    carrier.connect(g).connect(this.out ?? this.bus)
    ;[carrier, mod].forEach((o) => {
      o.start(t)
      o.stop(t + decay + 0.1)
    })
  }

  // An unknown word: a dull wooden tick.
  murmur() {
    if (!this.enabled || !this.ctx) return
    this.tone(180, { type: 'triangle', glide: 120, decay: 0.14, peak: 0.12 })
  }

  // Each cue plays through its own gain stage so a conflicting command can fade it
  // (RESET silences a running CHAOS pulse). Stages are released once the cue is over.
  command(word, status) {
    if (!this.enabled || !this.ctx) return
    const off = status === 'deactivated' || status === 'expired'
    if (word === 'reset' || off) this.silence(word === 'reset' ? null : word)
    const stage = this.ctx.createGain()
    stage.gain.value = LEVEL[word] ?? 1
    stage.connect(this.cueBus ?? this.bus)
    this.stages.set(word, stage)
    this.duckUntil = this.ctx.currentTime + (word === 'chaos' && !off ? 7 : 1.4)
    setTimeout(() => {
      stage.disconnect()
      if (this.stages.get(word) === stage) this.stages.delete(word)
    }, 9000)
    this.out = stage
    CUES[word]?.call(this, off)
    this.out = null
  }

  silence(word) {
    const t = this.ctx.currentTime
    for (const [w, stage] of this.stages) {
      if (word && w !== word) continue
      stage.gain.setTargetAtTime(0, t, 0.08)
      this.stages.delete(w)
    }
  }
}

// Every cue has its own gesture in the 250 Hz–5 kHz range that laptop and phone speakers
// can actually play; sub-bass is only extra weight for headphones. Pitched material
// sits in the drone's A-minor pentatonic so nothing clashes with it.
const CUES = {
  // a shower of coins: bright bells climbing an arpeggio, then a warm shimmer
  gold() {
    ;[440, 523.25, 659.25, 880, 1046.5, 1318.5].forEach((f, i) => {
      this.tone(f, { at: i * 0.07, peak: 0.16, decay: 1.6 })
      this.tone(f * 2.76, { at: i * 0.07, peak: 0.04, decay: 0.5 })
      this.tone(f * 5.4, { at: i * 0.07, peak: 0.015, decay: 0.2 })
    })
    this.tone(659.25, { at: 0.45, attack: 0.3, peak: 0.05, decay: 2.2 })
    this.tone(880, { at: 0.45, attack: 0.3, peak: 0.04, decay: 2.2 })
  },
  // swallowed: the air is sucked in, then a bright tone dives through the whole range
  void() {
    this.hiss({ freq: 500, to: 5000, attack: 0.42, dur: 0.05, q: 1.2, peak: 0.12 })
    this.tone(1400, { type: 'triangle', at: 0.45, glide: 70, decay: 1.7, peak: 0.14 })
    this.tone(700, { at: 0.45, glide: 35, decay: 1.9, peak: 0.1 })
    this.tone(92, { at: 0.45, glide: 26, decay: 2.4, peak: 0.25 })
  },
  // water: bright drops chirping upward, and a few deeper glugs
  liquid() {
    for (let i = 0; i < 11; i++) {
      const f = 520 + Math.random() * 700
      this.tone(f, { at: i * 0.075 + Math.random() * 0.04, glide: f * 3.2, attack: 0.002, decay: 0.07, peak: 0.24 })
    }
    for (let i = 0; i < 3; i++) this.tone(260 + i * 40, { at: 0.15 + i * 0.28, glide: 520, decay: 0.12, peak: 0.18 })
  },
  // glass: struck crystal falling down a scale, with sparkles above it
  crystal() {
    ;[1760, 1567.98, 1318.51, 1174.66, 1046.5, 880].forEach((f, i) => this.ping(f, { at: i * 0.09, peak: 0.12, decay: 1.6 }))
    for (let i = 0; i < 8; i++) this.ping(2637 + Math.random() * 2000, { at: Math.random() * 0.9, peak: 0.03, decay: 0.5 })
  },
  // the rules break: a sixteen-step glitch over a beat you can hear on any speaker
  chaos(off) {
    if (off) {
      this.tone(659.25, { glide: 329.63, decay: 0.9, peak: 0.12 })
      this.tone(440, { at: 0.2, decay: 1.4, peak: 0.1 })
      return
    }
    const scale = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99]
    for (let i = 0; i < 16; i++) {
      this.tone(scale[Math.floor(Math.random() * scale.length)], { type: 'square', at: i * 0.0625, decay: 0.045, peak: 0.06 })
    }
    for (let k = 0; k < 14; k++) {
      this.tone(240, { at: k * 0.5, glide: 60, decay: 0.16, peak: 0.3 })
      this.hiss({ at: k * 0.5 + 0.25, dur: 0.06, freq: 2200, q: 1.2, peak: 0.12 })
    }
  },
  // rewind and resolve: a tape spinning back, then home
  reset() {
    for (let i = 0; i < 5; i++) this.tone(2400 - i * 250, { type: 'triangle', at: i * 0.1, glide: 500, decay: 0.09, peak: 0.07 })
    ;[220, 261.63, 329.63, 440].forEach((f, i) => this.tone(f, { at: 0.6 + i * 0.03, attack: 0.04, peak: 0.08, decay: 2.2 }))
  },
  // time stops: a chord slows like a tape, and a clock ticks once
  still(off) {
    ;[440, 659.25, 880].forEach((f) =>
      off
        ? this.tone(f / 4, { type: 'triangle', glide: f, attack: 0.02, decay: 0.7, peak: 0.12 })
        : this.tone(f, { type: 'triangle', glide: f / 4, decay: 0.8, peak: 0.12 }),
    )
    this.hiss({ at: off ? 0 : 0.85, dur: 0.02, freq: 3200, q: 4, peak: 0.25 })
  },
  // lift: a rising whistle and air rushing upward (falling when gravity returns)
  gravity(off) {
    const [a, b] = off ? [1760, 220] : [220, 1760]
    this.tone(a, { type: 'triangle', glide: b, attack: 0.1, decay: 1.3, peak: 0.12 })
    this.tone(a * 1.5, { glide: b * 1.5, attack: 0.1, decay: 1.3, peak: 0.05 })
    this.hiss({ q: 2, freq: off ? 5000 : 900, to: off ? 900 : 5000, dur: 1.3, attack: 0.15, peak: 0.07 })
  },
  // seen: a heartbeat with enough body to hear on a phone, then the eye opens
  watch(off) {
    const beat = (at, peak) => {
      this.tone(200, { at, glide: 60, decay: 0.15, peak })
      this.hiss({ at, dur: 0.035, freq: 650, q: 2.5, peak: peak * 0.7 })
    }
    beat(0, 0.4)
    if (off) return
    beat(0.22, 0.3)
    this.hiss({ at: 0.6, freq: 1200, to: 4200, dur: 0.5, attack: 0.25, q: 1.5, peak: 0.06 })
    this.ping(1318.51, { at: 0.9, peak: 0.07, decay: 1.2 })
  },
  // stone: grinding grit, an uneasy A against B♭, and a clack as it sets
  medusa() {
    this.hiss({ freq: 900, to: 320, q: 1.5, dur: 1.6, attack: 0.15, peak: 0.1 })
    for (let i = 0; i < 40; i++) this.hiss({ freq: 700 + Math.random() * 1800, q: 4, at: Math.random() * 1.5, dur: 0.015, peak: 0.12 })
    this.tone(220, { type: 'triangle', attack: 0.3, decay: 2.2, peak: 0.1 })
    this.tone(233.08, { type: 'triangle', attack: 0.3, decay: 2.2, peak: 0.1 })
    this.hiss({ at: 1.6, dur: 0.05, freq: 1500, q: 1, peak: 0.3 })
    this.tone(110, { at: 1.6, glide: 60, decay: 0.3, peak: 0.25 })
  },
}

// Per-cue gain so every word arrives at a similar loudness on small speakers. Measured by
// rendering each cue offline, high-passing at 200 Hz and taking its loudest 200 ms.
const LEVEL = {
  gold: 0.44,
  void: 0.69,
  liquid: 1.21,
  crystal: 0.63,
  chaos: 1.56,
  reset: 0.88,
  still: 1,
  gravity: 1.37,
  watch: 1.46,
  medusa: 1.22,
}

export const audio = new OracleAudio()
