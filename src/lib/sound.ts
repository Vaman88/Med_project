// Small synthesized sounds, so the game needs no audio files. Everything is
// quiet and short; the context is created only after a tap or click.
export type SoundName = "pick" | "plop" | "chop" | "scoop" | "mash" | "stir" | "sizzle" | "chime" | "done" | "nudge";
export const SOUND_KEY = "healthy-steps-sound-v1";

type Ctx = AudioContext;
let ctx: Ctx | null = null;
function audio(): Ctx | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}
function tone(c: Ctx, freq: number, start: number, dur: number, gain: number, type: OscillatorType = "sine", slideTo?: number) {
  const osc = c.createOscillator(), g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.02);
}
function noise(c: Ctx, start: number, dur: number, gain: number, freq: number, q = 0.8) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(), filter = c.createBiquadFilter(), g = c.createGain();
  filter.type = "bandpass"; filter.frequency.value = freq; filter.Q.value = q;
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(c.currentTime + start);
}

/** Small random pitch change (about ±8%), so repeated chops and squishes never sound robotic. */
const vary = () => 0.92 + Math.random() * 0.16;

/** How each food sounds under the knife: crunchy foods are bright, soft ones dull, juicy ones splash. */
const CHOP_VOICE: Record<string, { crisp: number; thud: number; wet: number }> = {
  carrot: { crisp: 2600, thud: 190, wet: 0 },
  pepper: { crisp: 2200, thud: 170, wet: 0.35 },
  tomato: { crisp: 1500, thud: 140, wet: 1 },
  strawberry: { crisp: 1400, thud: 150, wet: 0.8 },
  banana: { crisp: 1000, thud: 120, wet: 0.2 },
};

export interface SoundOptions {
  /** The food being cut or mashed, for a food-specific sound. */
  food?: string;
  /** 0 to 1: how far along (mash gets softer and lower as it gets smoother). */
  level?: number;
  /** 0 to 1.5: how fast the child is stirring or whisking (louder, brighter). */
  speed?: number;
}

export function playSound(name: SoundName, opts: SoundOptions = {}) {
  const c = audio();
  if (!c) return;
  const v = vary();
  switch (name) {
    case "pick": tone(c, 520 * v, 0, 0.09, 0.05, "sine", 640 * v); break;
    case "plop": tone(c, 300 * v, 0, 0.14, 0.07, "sine", 150 * v); noise(c, 0, 0.05, 0.03, 900 * v); break;
    case "chop": {
      const voice = CHOP_VOICE[opts.food ?? ""] ?? { crisp: 1800, thud: 160, wet: 0 };
      noise(c, 0, 0.06, 0.13, voice.crisp * v, 1.3);
      tone(c, voice.thud * v, 0, 0.09, 0.07, "triangle", 70 * v);
      if (voice.wet > 0) noise(c, 0.02, 0.1, 0.05 * voice.wet, 850 * v, 0.7);
      break;
    }
    case "scoop": noise(c, 0, 0.18, 0.04, 500 * v); tone(c, 260 * v, 0.26, 0.18, 0.06, "sine", 120 * v); break;
    case "mash": {
      const level = Math.min(1, Math.max(0, opts.level ?? 0));
      tone(c, (130 - level * 35) * v, 0, 0.14, 0.09 - level * 0.03, "triangle", 60 * v);
      noise(c, 0, 0.13, 0.06 - level * 0.02, (620 - level * 220) * v, 1.6);
      break;
    }
    case "stir": {
      const speed = Math.min(1.5, Math.max(0.2, opts.speed ?? 0.5));
      noise(c, 0, 0.13, 0.015 + speed * 0.022, (700 + speed * 600) * v, 0.6);
      // A soft clink on the rim when whisking fast.
      if (speed > 1.1) tone(c, 2400 * v, 0.03, 0.08, 0.012, "sine");
      break;
    }
    case "nudge": tone(c, 440 * v, 0, 0.12, 0.035, "sine", 520 * v); break;
    case "sizzle": noise(c, 0, 0.35, 0.03, 5200 * v, 0.4); break;
    case "chime": tone(c, 660, 0, 0.35, 0.05); tone(c, 880, 0.12, 0.4, 0.04); break;
    case "done": tone(c, 523, 0, 0.3, 0.05); tone(c, 659, 0.12, 0.3, 0.05); tone(c, 784, 0.24, 0.5, 0.05); break;
  }
}
