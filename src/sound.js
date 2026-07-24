// ============================================================
// sound.js — tiny chiptune synth using the Web Audio API.
// No audio files: everything is square/triangle beeps, so it
// sounds authentically 8-bit and ships with zero assets.
// ============================================================

let ctx = null
let master = null
let muted = false

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
    master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

// one square/triangle/sawtooth blip
function blip(freq, dur, type = 'square', when = 0, vol = 1, slideTo = null) {
  if (muted) return
  const c = ac()
  const t = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g)
  g.connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

// short white-noise burst (explosions, hits)
function noise(dur, when = 0, vol = 0.5, hp = 400) {
  if (muted) return
  const c = ac()
  const t = c.currentTime + when
  const n = Math.floor(c.sampleRate * dur)
  const buf = c.createBuffer(1, n, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
  const src = c.createBufferSource()
  src.buffer = buf
  const filt = c.createBiquadFilter()
  filt.type = 'highpass'
  filt.frequency.value = hp
  const g = c.createGain()
  g.gain.value = vol
  src.connect(filt); filt.connect(g); g.connect(master)
  src.start(t)
}

export const Sound = {
  get muted() { return muted },
  toggleMute() { muted = !muted; return muted },
  resume() { ac() },

  // ---- UI ----
  hover() { blip(520, 0.04, 'square', 0, 0.5) },
  move() { blip(440, 0.05, 'square', 0, 0.6) },
  select() { blip(660, 0.06, 'square', 0, 0.9); blip(990, 0.08, 'square', 0.05, 0.7) }, // classic "tut-tut"
  confirm() { blip(523, 0.07); blip(659, 0.07, 'square', 0.07); blip(1047, 0.12, 'square', 0.14) },
  back() { blip(400, 0.08, 'square', 0, 0.7, 220) },
  deny() { blip(200, 0.12, 'sawtooth', 0, 0.6, 120) },

  // ---- gameplay ----
  coin() { blip(988, 0.06, 'square'); blip(1319, 0.12, 'square', 0.06) },
  jump() { blip(300, 0.16, 'square', 0, 0.7, 720) },
  hit() { noise(0.12, 0, 0.5, 800); blip(180, 0.1, 'square', 0, 0.5, 90) },
  pop() { blip(660, 0.05, 'triangle', 0, 0.7, 1100) },
  laser() { blip(900, 0.12, 'sawtooth', 0, 0.5, 200) },
  clear() { [523, 659, 784, 1047].forEach((f, i) => blip(f, 0.1, 'square', i * 0.06, 0.7)) },
  combo(n = 1) { blip(600 + n * 90, 0.08, 'square', 0, 0.7, 900 + n * 90) },
  explode() { noise(0.4, 0, 0.7, 200); blip(120, 0.4, 'sawtooth', 0, 0.4, 40) },
  gameover() { [440, 349, 262, 196].forEach((f, i) => blip(f, 0.22, 'square', i * 0.16, 0.7)) },
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => blip(f, 0.14, 'square', i * 0.11, 0.7)) },
  push() { blip(160, 0.06, 'square', 0, 0.5) },
  step() { blip(240, 0.03, 'square', 0, 0.35) },
  bounce() { blip(500, 0.06, 'triangle', 0, 0.6, 900) },

  // ---- Pac-Man ----
  // Iconic "waka-waka" chomp. Pass an alternating boolean each dot so the
  // two half-bites swap tone like the arcade original ("wa" then "ka").
  pacWaka(open) {
    if (open) blip(420, 0.05, 'square', 0, 0.45, 180)
    else blip(180, 0.05, 'square', 0, 0.45, 420)
  },
  // Energizer: bright rising sparkle that announces hunt mode.
  pacPower() {
    blip(523, 0.06, 'square', 0, 0.7)
    blip(784, 0.06, 'square', 0.05, 0.7)
    blip(1047, 0.09, 'square', 0.10, 0.7)
    blip(1568, 0.14, 'triangle', 0.16, 0.6)
  },
  // Eating a frightened ghost: quick rising "blurp".
  pacEatGhost() {
    blip(160, 0.05, 'square', 0, 0.6, 260)
    blip(260, 0.05, 'square', 0.05, 0.6, 440)
    blip(440, 0.09, 'square', 0.10, 0.6, 880)
  },
  // Eyes retreating to the house after being eaten.
  pacRetreat() {
    blip(1200, 0.05, 'triangle', 0, 0.28, 640)
    blip(1000, 0.06, 'triangle', 0.05, 0.28, 520)
  },
  // Classic descending death warble (musical, not an explosion).
  pacDeath() {
    [988, 831, 699, 587, 494, 415, 349, 262].forEach((f, i) =>
      blip(f, 0.15, 'square', i * 0.12, 0.6, f * 0.84))
  },
  // Short intro jingle when a new game starts.
  pacStart() {
    [[523, 0], [784, 0.11], [1047, 0.22], [784, 0.33], [1047, 0.44], [1319, 0.56]]
      .forEach(([f, w]) => blip(f, 0.1, 'square', w, 0.6))
  },
}

export default Sound
