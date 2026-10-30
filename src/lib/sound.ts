// Small synthesized sounds, so the game needs no audio files. Everything is
// quiet and short; the context is created only after a tap or click.
export type SoundName = "pick" | "plop" | "chop" | "scoop" | "mash" | "stir" | "sizzle" | "chime" | "done";
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

export function playSound(name: SoundName) {
  const c = audio();
  if (!c) return;
  switch (name) {
    case "pick": tone(c, 520, 0, 0.09, 0.05, "sine", 640); break;
    case "plop": tone(c, 300, 0, 0.14, 0.07, "sine", 150); noise(c, 0, 0.05, 0.03, 900); break;
    case "chop": noise(c, 0, 0.07, 0.12, 1800, 1.2); tone(c, 160, 0, 0.08, 0.05, "triangle", 90); break;
    case "scoop": noise(c, 0, 0.18, 0.04, 500); tone(c, 260, 0.26, 0.18, 0.06, "sine", 120); break;
    case "mash": tone(c, 130, 0, 0.14, 0.09, "triangle", 70); noise(c, 0, 0.1, 0.05, 600); break;
    case "stir": noise(c, 0, 0.12, 0.025, 1200, 0.5); break;
    case "sizzle": noise(c, 0, 0.35, 0.03, 5200, 0.4); break;
    case "chime": tone(c, 660, 0, 0.35, 0.05); tone(c, 880, 0.12, 0.4, 0.04); break;
    case "done": tone(c, 523, 0, 0.3, 0.05); tone(c, 659, 0.12, 0.3, 0.05); tone(c, 784, 0.24, 0.5, 0.05); break;
  }
}
