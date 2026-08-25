/* ==========================================================================
   PARTY — the things every CyberGrill table needs and none of them owns.

   Sound, confetti and the music bed. This file is inlined into each table page
   at build time (look for the PARTY markers), so it shares the page's scope
   and can use $ and el directly. It is deliberately not an ES module: pasting
   it in costs nothing at runtime, and one copy of a card snap serves UNO, Ludo
   and whatever comes next.

   What a page owes this file:
     #fx          a full-screen canvas for the confetti
     #musicChip   something to toggle the music with, wired up by the page
   ========================================================================== */

/* ==========================================================================
   SOUND
   --------------------------------------------------------------------------
   A card is not a beep. Everything here is built the way the real noise is
   built: a burst of noise shaped by a filter, plus a short pitched transient
   underneath it, all sitting in a small room.
   
   If you drop real recordings into the repo's audio/ folder they are used
   instead — see audio/README.md. Anything missing falls back to these.
   ========================================================================== */
let AC = null, sound = true, BUS = null, WET = null, NOISE = null;
const SAMPLES = Object.create(null);

function ac() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
  if (AC && AC.state === 'suspended') AC.resume();
  if (AC && !BUS) buildBus();
  return AC;
}

/* a small room, made from decaying noise — without it everything sounds like
   it is happening inside your skull */
function buildBus() {
  const c = AC;
  BUS = c.createGain(); BUS.gain.value = 1; BUS.connect(c.destination);
  try {
    const len = Math.floor(c.sampleRate * 0.42);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (i < 60 ? i / 60 : 1);
      }
    }
    const conv = c.createConvolver(); conv.buffer = ir;
    WET = c.createGain(); WET.gain.value = 0.16;
    WET.connect(conv); conv.connect(c.destination);
  } catch (e) { WET = null; }
  /* one noise buffer, reused for every rustle and click */
  const n = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const nd = n.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  NOISE = n;
}

/* one shaped burst of noise: the raw material of card sounds */
function hiss(o) {
  const c = ac(); if (!c || !sound) return;
  const at = c.currentTime + (o.delay || 0);
  const src = c.createBufferSource();
  src.buffer = NOISE;
  src.loop = true;
  src.playbackRate.value = 0.7 + Math.random() * 0.6;
  const f = c.createBiquadFilter();
  f.type = o.type || 'bandpass';
  f.frequency.setValueAtTime(o.f1, at);
  if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.f2), at + o.dur);
  f.Q.value = o.q === undefined ? 1.1 : o.q;
  const g = c.createGain();
  const peak = (o.gain === undefined ? .18 : o.gain);
  const rise = o.rise === undefined ? .006 : o.rise;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + rise);
  g.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
  src.connect(f); f.connect(g); g.connect(BUS);
  if (WET && o.room !== false) g.connect(WET);
  src.start(at + Math.random() * 0.02);
  src.stop(at + o.dur + .05);
}

/* a short pitched body — the thump under a slap, the wood in a click */
function body(o) {
  const c = ac(); if (!c || !sound) return;
  const at = c.currentTime + (o.delay || 0);
  const osc = c.createOscillator(), g = c.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f1, at);
  if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), at + o.dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(o.gain === undefined ? .12 : o.gain, at + (o.rise || .004));
  g.gain.exponentialRampToValueAtTime(0.0001, at + o.dur);
  osc.connect(g); g.connect(BUS);
  if (WET && o.room !== false) g.connect(WET);
  osc.start(at); osc.stop(at + o.dur + .05);
}

/* kept for the music, which is written in notes rather than noise */
function tone(f, d, t, v, dl, slide) {
  if (!sound) return; const c = ac(); if (!c) return;
  const t0 = c.currentTime + (dl || 0), o = c.createOscillator(), g = c.createGain();
  o.type = t || 'triangle'; o.frequency.setValueAtTime(f, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + d);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v || .1, t0 + .012);
  g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
  o.connect(g); g.connect(BUS || c.destination);
  if (WET) g.connect(WET);
  o.start(t0); o.stop(t0 + d + .03);
}

/* a real recording, if one was dropped in for this event */
function sample(name, gain) {
  const c = ac(); if (!c || !sound) return false;
  const buf = SAMPLES[name]; if (!buf) return false;
  const src = c.createBufferSource(); src.buffer = buf;
  const g = c.createGain(); g.gain.value = gain === undefined ? 1 : gain;
  src.connect(g); g.connect(BUS);
  src.start();
  return true;
}

const SFX = {
  /* a card snapping down on the pile */
  play() {
    if (sample('play')) return;
    hiss({ f1: 5200, f2: 1400, dur: .07, q: .7, gain: .3 });
    body({ f1: 260, f2: 90, dur: .06, gain: .09, type: 'triangle' });
  },
  /* one card dragged off the deck */
  draw() {
    if (sample('draw')) return;
    hiss({ f1: 1100, f2: 3400, dur: .09, q: 1.6, gain: .16, rise: .03 });
    hiss({ f1: 4200, f2: 1200, dur: .05, q: .8, gain: .12, delay: .07 });
  },
  /* the whole deck riffled */
  shuffle() {
    if (sample('shuffle')) return;
    for (let i = 0; i < 14; i++)
      hiss({ f1: 1800 + Math.random() * 2600, dur: .045, q: 2.2, gain: .07, delay: i * .028 + Math.random() * .012 });
  },
  /* somebody loses their turn */
  skip() {
    if (sample('skip')) return;
    hiss({ f1: 400, f2: 2600, dur: .13, q: 2.4, gain: .16, rise: .05 });
    body({ f1: 180, f2: 70, dur: .16, gain: .1, type: 'triangle', delay: .1 });
  },
  /* the table turns around */
  rev() {
    if (sample('rev')) return;
    hiss({ f1: 500, f2: 3200, dur: .22, q: 3.2, gain: .13, rise: .12 });
    hiss({ f1: 3200, f2: 500, dur: .2, q: 3.2, gain: .11, rise: .06, delay: .2 });
  },
  /* a +2 or +4 landing on somebody */
  hit() {
    if (sample('hit')) return;
    body({ f1: 150, f2: 42, dur: .3, gain: .2, type: 'sine' });
    hiss({ f1: 2600, f2: 600, dur: .13, q: .6, gain: .22 });
  },
  /* the shout */
  uno() {
    if (sample('uno')) return;
    hiss({ f1: 3000, f2: 900, dur: .09, q: .5, gain: .2 });
    [784, 1047, 1319].forEach((f, i) => body({ f1: f, dur: .3, gain: .075, type: 'triangle', delay: i * .055, rise: .008 }));
  },
  /* the round is over */
  win() {
    if (sample('win')) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      body({ f1: f, dur: .5, gain: .085, type: 'triangle', delay: i * .085, rise: .01 });
      body({ f1: f * 2, dur: .3, gain: .03, type: 'sine', delay: i * .085 });
    });
    /* the room reacting */
    for (let i = 0; i < 26; i++)
      hiss({ f1: 1400 + Math.random() * 3000, dur: .07, q: 1.8, gain: .045, delay: .12 + Math.random() * .8 });
  },
  /* that will not go down */
  bad() {
    if (sample('bad')) return;
    body({ f1: 130, f2: 74, dur: .17, gain: .14, type: 'triangle' });
    hiss({ f1: 700, f2: 300, dur: .09, q: 1.4, gain: .08 });
  },
  /* a small wooden click for the interface */
  tick() {
    if (sample('tick')) return;
    hiss({ f1: 2600, dur: .022, q: 2.6, gain: .1, room: false });
    body({ f1: 900, f2: 520, dur: .025, gain: .035, type: 'triangle', room: false });
  }
};

/* Real recordings win over anything generated. Drop 44.1k mp3 or ogg files
   named after the events above into audio/ and they are picked up here; the
   game keeps working exactly as before if the folder is empty. */
const SAMPLE_NAMES = ['play', 'draw', 'shuffle', 'skip', 'rev', 'hit', 'uno', 'win', 'bad', 'tick'];
/* every table page sits one folder below the site root except the nested ones,
   which say so by setting window.CG_AUDIO before this runs */
const AUDIO_DIR = window.CG_AUDIO || '../audio/';
/* A page opened straight off the disk cannot fetch its neighbours, and the
   browser logs a CORS complaint for every attempt. There is nothing to load
   there, so do not ask. */
const canLoadFiles = () => location.protocol === 'http:' || location.protocol === 'https:';
let audioManifest = null;
async function getManifest() {
  if (audioManifest) return audioManifest;
  try {
    const r = await fetch(AUDIO_DIR + 'manifest.json', { cache: 'force-cache' });
    audioManifest = r.ok ? await r.json() : [];
  } catch (e) { audioManifest = []; }
  return audioManifest;
}
async function loadSamples() {
  const c = ac(); if (!c || !canLoadFiles()) return;
  const have = await getManifest();
  if (!have.length) return;
  await Promise.all(SAMPLE_NAMES.map(async n => {
    const file = ['mp3', 'ogg', 'wav'].map(e => n + '.' + e).find(f => have.indexOf(f) !== -1);
    if (!file) return;
    try {
      const r = await fetch(AUDIO_DIR + file, { cache: 'force-cache' });
      if (!r.ok) return;
      SAMPLES[n] = await c.decodeAudioData(await r.arrayBuffer());
    } catch (e) { /* the generated one stands in */ }
  }));
}

/* ---------------- confetti ---------------- */
const cv = $('#fx'), ctx = cv.getContext('2d');
let parts = [];
function fit() { cv.width = innerWidth; cv.height = innerHeight; }
addEventListener('resize', fit); fit();
function burst(x, y, n, colors) {
  for (let i = 0; i < (n || 40); i++) {
    const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 10;
    parts.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4, g: .25 + Math.random() * .15,
      life: 1, dec: .008 + Math.random() * .01, c: (colors || PALETTE)[(Math.random() * (colors || PALETTE).length) | 0],
      w: 4 + Math.random() * 7, h: 4 + Math.random() * 11, r: Math.random() * 6, vr: (Math.random() - .5) * .4
    });
  }
}
(function loop() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter(p => p.life > 0 && p.y < cv.height + 60);
  parts.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= .99; p.r += p.vr; p.life -= p.dec;
    ctx.save(); ctx.globalAlpha = Math.max(0, p.life); ctx.translate(p.x, p.y); ctx.rotate(p.r);
    ctx.fillStyle = p.c; ctx.shadowBlur = 10; ctx.shadowColor = p.c;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
  });
  requestAnimationFrame(loop);
})();

/* ==========================================================================
   THE BED
   --------------------------------------------------------------------------
   A four-bar loop built out of oscillators, scheduled a beat ahead so it does
   not stutter. It sits almost out of hearing until somebody drops to one
   card, and then a second layer creeps in on top.
   ========================================================================== */
const music = (() => {
  const BPM = 88, BEAT = 60 / BPM, BAR = BEAT * 4;
  /* Am - F - C - G, an old friend, transposed low */
  const PROG = [
    { root: 55.00, ch: [220.00, 261.63, 329.63] },   /* A minor  */
    { root: 43.65, ch: [174.61, 220.00, 261.63] },   /* F major  */
    { root: 65.41, ch: [196.00, 261.63, 329.63] },   /* C major  */
    { root: 49.00, ch: [196.00, 246.94, 293.66] }    /* G major  */
  ];
  let on = false, master = null, bedGain = null, tenseGain = null,
      timer = null, next = 0, bar = 0, tenseWanted = false, fileBed;

  function build() {
    const c = ac(); if (!c) return false;
    master = c.createGain(); master.gain.value = 0; master.connect(c.destination);
    bedGain = c.createGain(); bedGain.gain.value = 1; bedGain.connect(master);
    tenseGain = c.createGain(); tenseGain.gain.value = 0; tenseGain.connect(master);
    return true;
  }

  function voice(dest, type, freq, at, dur, peak, detune) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(peak, at + dur * .22);
    g.gain.exponentialRampToValueAtTime(.0001, at + dur);
    o.connect(g); g.connect(dest); o.start(at); o.stop(at + dur + .05);
  }

  function scheduleBar(at) {
    const c = ac(); if (!c) return;
    const P = PROG[bar % PROG.length];

    /* bass, on the one and the three */
    voice(bedGain, 'sine', P.root, at, BEAT * 1.7, .10);
    voice(bedGain, 'sine', P.root, at + BEAT * 2, BEAT * 1.7, .075);
    voice(bedGain, 'triangle', P.root * 2, at, BEAT * 1.2, .022);

    /* a pad that just hangs there */
    P.ch.forEach((f, i) => {
      voice(bedGain, 'triangle', f, at, BAR * .96, .018, i * 4 - 4);
      voice(bedGain, 'sine', f * 2, at, BAR * .9, .006);
    });

    /* the tense layer: an eighth-note arpeggio that only gets through when
       tenseGain is open */
    for (let i = 0; i < 8; i++) {
      const f = P.ch[i % P.ch.length] * (i > 4 ? 2 : 1);
      voice(tenseGain, 'square', f, at + i * BEAT / 2, BEAT * .34, .028);
    }
    /* and a quiet tick on every beat, so the loop has a pulse */
    for (let i = 0; i < 4; i++) voice(bedGain, 'sine', 1800, at + i * BEAT, .035, i === 0 ? .012 : .006);

    bar++;
  }

  function pump() {
    const c = ac(); if (!c) return;
    while (next < c.currentTime + .6) {
      if (next < c.currentTime) next = c.currentTime + .06;
      scheduleBar(next);
      next += BAR;
    }
  }

  return {
    get on() { return on; },
    toggle() { on ? this.stop() : this.start(); return on; },
    /* If audio/music.mp3 is there, play that instead of building a loop out of
       oscillators. audio/music-tense.mp3 becomes the layer that fades in when
       somebody is one card away. */
    async useFiles() {
      const c = ac(); if (!c || !master) return false;
      if (fileBed !== undefined) return !!fileBed;
      fileBed = null;
      if (!canLoadFiles()) return false;
      const have = await getManifest();
      for (const [name, dest] of [['music', 'bed'], ['music-tense', 'tense']]) {
        for (const ext of ['mp3', 'ogg']) {
          if (have.indexOf(name + '.' + ext) === -1) continue;
          try {
            const r = await fetch(AUDIO_DIR + name + '.' + ext, { cache: 'force-cache' });
            if (!r.ok) continue;
            const buf = await c.decodeAudioData(await r.arrayBuffer());
            const src = c.createBufferSource();
            src.buffer = buf; src.loop = true;
            src.connect(dest === 'bed' ? bedGain : tenseGain);
            src.start();
            if (dest === 'bed') fileBed = src;
            break;
          } catch (e) { }
        }
      }
      return !!fileBed;
    },
    start() {
      const c = ac(); if (!c) return;
      if (!master && !build()) return;
      on = true;
      this.useFiles().then(usingFiles => { if (usingFiles) { clearInterval(timer); timer = null; } });
      master.gain.cancelScheduledValues(c.currentTime);
      master.gain.setValueAtTime(master.gain.value, c.currentTime);
      master.gain.linearRampToValueAtTime(.6, c.currentTime + 1.4);
      next = c.currentTime + .08;
      pump();
      clearInterval(timer); timer = setInterval(pump, 200);
    },
    stop() {
      const c = ac(); if (!c || !master) { on = false; return; }
      on = false;
      master.gain.cancelScheduledValues(c.currentTime);
      master.gain.setValueAtTime(master.gain.value, c.currentTime);
      master.gain.linearRampToValueAtTime(0, c.currentTime + .5);
      clearInterval(timer); timer = null;
    },
    /* somebody is one card away — lean on it */
    tense(v) {
      tenseWanted = !!v;
      const c = ac(); if (!c || !tenseGain) return;
      tenseGain.gain.cancelScheduledValues(c.currentTime);
      tenseGain.gain.setValueAtTime(tenseGain.gain.value, c.currentTime);
      tenseGain.gain.linearRampToValueAtTime(v ? 1 : 0, c.currentTime + (v ? 1.6 : 1.1));
    },
    sting() {   /* a short lift at the end of a round */
      [523, 659, 784, 1047].forEach((f, i) => tone(f, .3, 'triangle', .08, i * .09));
    }
  };
})();
