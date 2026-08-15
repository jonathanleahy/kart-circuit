// WebAudio layer. Engine hum and skid rumble are synthesized (pitch-shiftable,
// zero assets); one-shots and music are optional files from public/sfx|music,
// so the game stays fully playable before `npm run gen:audio` has been run.

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null

  private engineOsc: OscillatorNode | null = null
  private engineOsc2: OscillatorNode | null = null
  private engineFilter: BiquadFilterNode | null = null
  private engineGain: GainNode | null = null

  private noise: AudioBufferSourceNode | null = null
  private skidGain: GainNode | null = null

  private oneShots = new Map<string, AudioBuffer>()
  private musicEl: HTMLAudioElement | null = null
  private started = false

  public musicMuted = false

  init(): void {
    if (this.started) return
    this.started = true
    const Ctx = window.AudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    this.ctx = ctx
    void ctx.resume()

    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(ctx.destination)

    this.engineOsc = ctx.createOscillator()
    this.engineOsc.type = 'sawtooth'
    this.engineOsc2 = ctx.createOscillator()
    this.engineOsc2.type = 'square'
    this.engineFilter = ctx.createBiquadFilter()
    this.engineFilter.type = 'lowpass'
    this.engineFilter.frequency.value = 700
    this.engineGain = ctx.createGain()
    this.engineGain.gain.value = 0
    const g2 = ctx.createGain()
    g2.gain.value = 0.35
    this.engineOsc.connect(this.engineFilter)
    this.engineOsc2.connect(g2)
    g2.connect(this.engineFilter)
    this.engineFilter.connect(this.engineGain)
    this.engineGain.connect(this.master)
    this.engineOsc.start()
    this.engineOsc2.start()

    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.noise = ctx.createBufferSource()
    this.noise.buffer = noiseBuf
    this.noise.loop = true
    const noiseFilter = ctx.createBiquadFilter()
    noiseFilter.type = 'bandpass'
    noiseFilter.frequency.value = 400
    this.skidGain = ctx.createGain()
    this.skidGain.gain.value = 0
    this.noise.connect(noiseFilter)
    noiseFilter.connect(this.skidGain)
    this.skidGain.connect(this.master)
    this.noise.start()

    for (const name of ['checkpoint', 'lap', 'finish', 'go', 'skid']) {
      void this.loadOneShot(name)
    }

    this.musicEl = new Audio('/music/loop.mp3')
    this.musicEl.loop = true
    this.musicEl.volume = 0.32
    this.musicEl.addEventListener('canplaythrough', () => {
      void this.musicEl?.play().catch(() => {})
    })
    this.musicEl.addEventListener('error', () => {
      this.musicEl = null
    })
    void this.musicEl.play().catch(() => {})
  }

  private async loadOneShot(name: string): Promise<void> {
    if (!this.ctx) return
    try {
      const res = await fetch(`/sfx/${name}.mp3`)
      if (!res.ok) return
      const buf = await this.ctx.decodeAudioData(await res.arrayBuffer())
      this.oneShots.set(name, buf)
    } catch {
      // asset missing (gen:audio not run yet) — silently skip
    }
  }

  play(name: string): void {
    const buf = this.oneShots.get(name)
    if (!buf || !this.ctx || !this.master) return
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    src.connect(this.master)
    src.start()
  }

  update(speedNorm: number, throttle: number, skidAmount: number, boosting = false): void {
    if (!this.ctx || !this.engineGain || !this.engineOsc || !this.engineOsc2) return
    const t = this.ctx.currentTime
    const boostKick = boosting ? 46 : 0
    const base = 52 + speedNorm * 150 + throttle * 14 + boostKick
    this.engineOsc.frequency.setTargetAtTime(base, t, 0.06)
    this.engineOsc2.frequency.setTargetAtTime(base * 2.01, t, 0.06)
    this.engineGain.gain.setTargetAtTime(
      0.035 + throttle * 0.05 + speedNorm * 0.03 + (boosting ? 0.03 : 0),
      t,
      0.08,
    )
    this.skidGain?.gain.setTargetAtTime(skidAmount * 0.16, t, 0.05)
  }

  toggleMusicMute(): boolean {
    this.musicMuted = !this.musicMuted
    if (this.musicEl) this.musicEl.muted = this.musicMuted
    return this.musicMuted
  }
}
