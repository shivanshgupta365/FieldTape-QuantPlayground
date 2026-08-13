/**
 * Procedural ambient engine — nature beds and calm music, synthesised live.
 *
 * Nothing is streamed or bundled. Every sound is generated with the Web Audio
 * API, for three reasons that matter for a product you intend to sell:
 *
 *  1. No licensing. Library music needs a commercial sync licence per track and
 *     per platform. Synthesised audio is ours outright, forever, everywhere.
 *  2. No payload. A twenty-minute ambient bed is a few KB of code instead of
 *     forty megabytes of MP3, so first paint is unaffected.
 *  3. No loop points. Generated audio never repeats, so long sessions do not
 *     develop the ten-second itch that a looped track always does.
 *
 * Browsers refuse to start audio without a user gesture, so the context is
 * created lazily on the first play() call and never before.
 */

export type TrackId = "valley" | "lakeside" | "barn" | "snowline" | "market"

export interface TrackMeta {
  id: TrackId
  title: string
  blurb: string
}

export const TRACKS: TrackMeta[] = [
  { id: "valley", title: "Valley Morning", blurb: "Warm pads, distant cowbells, a slow breeze" },
  { id: "lakeside", title: "Lakeside", blurb: "Water, gulls, and a soft pentatonic drift" },
  { id: "barn", title: "Barn at Dusk", blurb: "Low strings, crickets, settling timber" },
  { id: "snowline", title: "Snowline", blurb: "Sparse bells and high wind, very still" },
  { id: "market", title: "Market Day", blurb: "Light plucked motif with a walking pulse" },
]

/** Pentatonic scales avoid the semitone clashes that make random notes sour. */
const SCALES: Record<TrackId, number[]> = {
  valley: [220.0, 246.94, 293.66, 329.63, 392.0],
  lakeside: [174.61, 196.0, 233.08, 261.63, 311.13],
  barn: [130.81, 146.83, 174.61, 196.0, 233.08],
  snowline: [349.23, 392.0, 466.16, 523.25, 622.25],
  market: [261.63, 293.66, 349.23, 392.0, 440.0],
}

const TEMPO: Record<TrackId, number> = {
  valley: 3.4,
  lakeside: 4.2,
  barn: 4.8,
  snowline: 6.0,
  market: 1.6,
}

export class AmbientEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noiseSource: AudioBufferSourceNode | null = null
  private nodes: AudioNode[] = []
  private timer: number | null = null
  private current: TrackId | null = null
  private volume = 0.5

  get playing(): boolean {
    return this.current !== null
  }

  get track(): TrackId | null {
    return this.current
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
    }
    return this.ctx
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value))
    if (this.master && this.ctx) {
      // Ramp, never assign. A step change in gain is an audible click.
      this.master.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 0.08)
    }
  }

  async play(id: TrackId): Promise<void> {
    const ctx = this.ensureContext()
    if (ctx.state === "suspended") await ctx.resume()
    this.stop(false)
    this.current = id

    this.startBed(id)
    this.scheduleNotes(id)
  }

  /** Filtered noise: wind, water, or room tone depending on the band. */
  private startBed(id: TrackId): void {
    const ctx = this.ctx!
    const seconds = 4
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    // Brown-ish noise. White noise is hissy and fatiguing; integrating it
    // tilts energy to the low end and reads as wind or water instead.
    let last = 0
    for (let i = 0; i < data.length; i += 1) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true

    const filter = ctx.createBiquadFilter()
    filter.type = id === "snowline" ? "highpass" : "lowpass"
    filter.frequency.value = id === "snowline" ? 900 : id === "lakeside" ? 1400 : 620
    filter.Q.value = 0.6

    const gain = ctx.createGain()
    gain.gain.value = 0
    gain.gain.linearRampToValueAtTime(id === "market" ? 0.05 : 0.11, ctx.currentTime + 2.5)

    // Slow LFO on the filter so the bed breathes rather than sitting static.
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.06
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 180
    lfo.connect(lfoGain).connect(filter.frequency)
    lfo.start()

    source.connect(filter).connect(gain).connect(this.master!)
    source.start()

    this.noiseSource = source
    this.nodes.push(filter, gain, lfo, lfoGain)
  }

  /** Sparse notes from the scale, with a long tail so they overlap into pads. */
  private scheduleNotes(id: TrackId): void {
    const scale = SCALES[id]
    const gap = TEMPO[id]
    let step = 0

    const fire = () => {
      if (!this.ctx || this.current !== id) return
      const ctx = this.ctx
      const now = ctx.currentTime

      // Walk the scale rather than picking at random: adjacent motion sounds
      // composed, pure randomness sounds like a wind chime falling downstairs.
      step += Math.random() < 0.62 ? 1 : -1
      const index = ((step % scale.length) + scale.length) % scale.length
      const freq = scale[index]! * (Math.random() < 0.22 ? 2 : 1)

      const osc = ctx.createOscillator()
      osc.type = id === "market" ? "triangle" : "sine"
      osc.frequency.value = freq

      const gain = ctx.createGain()
      const peak = id === "market" ? 0.1 : 0.075
      const tail = id === "market" ? 1.4 : 5.5
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(peak, now + 0.25)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + tail)

      // Gentle stereo placement so successive notes do not stack in the centre.
      const pan = ctx.createStereoPanner()
      pan.pan.value = Math.random() * 1.2 - 0.6

      osc.connect(gain).connect(pan).connect(this.master!)
      osc.start(now)
      osc.stop(now + tail + 0.1)

      const jitter = gap * (0.7 + Math.random() * 0.7)
      this.timer = window.setTimeout(fire, jitter * 1000)
    }

    fire()
  }

  stop(fade = true): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer)
      this.timer = null
    }
    const ctx = this.ctx
    if (ctx && this.noiseSource) {
      const source = this.noiseSource
      if (fade && this.master) {
        this.master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
        window.setTimeout(() => {
          try { source.stop() } catch { /* already stopped */ }
          if (this.master) this.master.gain.value = this.volume
        }, 450)
      } else {
        try { source.stop() } catch { /* already stopped */ }
      }
      this.noiseSource = null
    }
    for (const node of this.nodes) {
      try { (node as OscillatorNode).stop?.() } catch { /* not a source */ }
      try { node.disconnect() } catch { /* already detached */ }
    }
    this.nodes = []
    this.current = null
  }
}

/** One engine per tab. Audio contexts are a limited resource. */
let singleton: AmbientEngine | null = null
export function ambientEngine(): AmbientEngine {
  if (!singleton) singleton = new AmbientEngine()
  return singleton
}
