#!/usr/bin/env python3
"""Soundtrack for "Vanaema köögis". Deterministic: numpy + scipy, seeded noise, no clock.

One stereo track per film segment, exactly as long as its clip, built from the same
timings as the animation in ../src/segments/*.js. Loop segments wrap seamlessly; the
room tone and the clock are continuous across every clip join.

  python3 film/audio/make_audio.py            # writes film/out/audio/...
"""
import os, subprocess, sys, wave, zlib
import numpy as np
import scipy.signal as sg

SR = 48000
MASTER_DB = 8.0   # overall level: quiet room around -38 dBFS, loudest event (the doorbell) around -4
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'out', 'audio')
SEGMENTS = {'intro': (12, False), 's1': (24, True), 'onset_s2': (4, False), 's2': (24, True),
            'onset_s3': (6, False), 's3': (30, True), 'end_good': (8, False)}

# Where things are on screen, as a stereo position (-1 left … +1 right).
PAN = {'helgi': -0.08, 'cup': -0.55, 'clock': 0.35, 'right_hand': -0.32, 'envelope': 0.2, 'hands': -0.2,
       'chair': -0.1, 'slumped': -0.22, 'door': 0.85}

def n(seconds): return int(round(seconds * SR))
def rng(name): return np.random.default_rng(zlib.crc32(name.encode()))
def db(x): return 10 ** (x / 20)
def tt(dur): return np.arange(n(dur)) / SR

# ───────── building blocks ─────────
def shaped_noise(count, shape, r):
    """Noise with a given spectrum shape(f). Periodic over its own length, so it loops."""
    f = np.fft.rfftfreq(count, 1 / SR)
    spec = (r.normal(size=f.size) + 1j * r.normal(size=f.size)) * shape(np.maximum(f, 1.0))
    spec[0] = 0
    x = np.fft.irfft(spec, count)
    return x / np.sqrt(np.mean(x ** 2))

def band(lo, hi):
    return lambda f: 1 / (1 + (lo / f) ** 4) / (1 + (f / hi) ** 4)

def bump(centre, width):  # log-gaussian band
    return lambda f: np.exp(-((np.log(f) - np.log(centre)) ** 2) / (2 * width ** 2))

def hann(dur, power=1.0):
    return np.sin(np.pi * np.linspace(0, 1, n(dur), endpoint=False)) ** (2 * power)

def flutter(dur, r, rate=9.0):
    """Slow irregular 0…1 envelope, for cloth and friction."""
    x = shaped_noise(n(dur), lambda f: 1 / (1 + (f / rate) ** 4), r)
    return np.clip(0.55 + 0.45 * x, 0, None)

def resonator(x, freq, bw):
    rr = np.exp(-np.pi * bw / SR); c = 2 * rr * np.cos(2 * np.pi * freq / SR)
    return sg.lfilter([1 - c + rr * rr], [1, -c, rr * rr], x)

def lowpass(x, freq, order=2):
    return sg.sosfilt(sg.butter(order, freq, 'low', fs=SR, output='sos'), x)

def highpass(x, freq, order=2):
    return sg.sosfilt(sg.butter(order, freq, 'high', fs=SR, output='sos'), x)

class Bus:
    def __init__(self, seconds, loop):
        self.N = n(seconds); self.loop = loop; self.x = np.zeros((self.N, 2))
    def add(self, sig, at, gain=1.0, pan=0.0):
        a = (pan + 1) * np.pi / 4; lr = np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1) * gain * np.sqrt(2) * 0.7071
        i = n(at)
        if self.loop:
            idx = (i + np.arange(len(sig))) % self.N
            np.add.at(self.x, idx, lr)
        else:
            j = min(self.N, i + len(sig))
            if j > i >= 0: self.x[i:j] += lr[:j - i]

# ───────── sounds ─────────
def cloth(dur, r):
    return shaped_noise(n(dur), band(700, 5500), r) * flutter(dur, r) * hann(dur)

def paper(dur, r):
    e = tt(dur); env = np.minimum(1, e / 0.012) * np.exp(-e * (3.2 / dur))
    return shaped_noise(n(dur), band(2400, 9000), r) * env * flutter(dur, r, 30)

def rub(dur, r):
    return shaped_noise(n(dur), band(1100, 4200), r) * hann(dur) * flutter(dur, r, 20)

def drag(dur, r):
    return shaped_noise(n(dur), band(250, 2600), r) * hann(dur, 0.6) * flutter(dur, r, 14)

def pat(r, weight=1.0):
    """A hand or arm coming down on the table: soft, cloth-muffled."""
    e = tt(0.4); f = 68 + 46 * np.exp(-e * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-e * 20)
    slap = lowpass(r.normal(size=e.size), 900) * np.exp(-e * 60) * 2.2
    return (weight * body + slap) * np.minimum(1, e / 0.003)

def clink(r, pitch=1.0, soft=1.0):
    e = tt(0.55)
    y = sum(a * np.sin(2 * np.pi * f * pitch * e + p) * np.exp(-e * d) for f, a, d, p in
            [(1320, .5, 22, 0), (2140, 1, 28, 1), (3460, .7, 40, 2), (5230, .45, 55, 3), (7880, .25, 80, 4)])
    return (y + 0.5 * r.normal(size=e.size) * np.exp(-e * 900)) * np.minimum(1, e / (0.0015 * soft))

def tick(freq, r):
    e = tt(0.04)
    return np.sin(2 * np.pi * freq * e) * np.exp(-e * 190) + 0.45 * r.normal(size=e.size) * np.exp(-e * 520)

def creak(dur, r, rate0=28, rate1=52, tones=(480, 1150, 1900, 2900)):
    """Wood under load: irregular stick-slip pulses ringing a few resonances."""
    count = n(dur); x = np.zeros(count); t = 0.0
    while t < dur:
        u = t / dur; rate = (rate0 + (rate1 - rate0) * u) * (1 + 0.35 * r.normal())
        x[min(count - 1, n(t))] += 0.5 + r.random()
        t += 1 / max(8.0, rate)
    y = sum(resonator(x, f * (1 + 0.03 * r.normal()), 55 + 0.03 * f) / (1 + k) for k, f in enumerate(tones))
    return y * hann(dur, 0.5) * flutter(dur, r, 6)

def footstep(r):
    e = tt(0.35); f = 62 + 40 * np.exp(-e * 30)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-e * 26) + 1.6 * lowpass(r.normal(size=e.size), 1300) * np.exp(-e * 48)
    y[:n(0.004)] += 0.5 * r.normal(size=n(0.004))
    return lowpass(y, 2600)

def latch(r):
    e = tt(0.06)
    c = lambda f: np.sin(2 * np.pi * f * e) * np.exp(-e * 150) + 0.4 * r.normal(size=e.size) * np.exp(-e * 400)
    y = np.zeros(n(0.2)); a = c(1700); b = c(950)
    y[:a.size] += a; y[n(0.085):n(0.085) + b.size] += 0.8 * b
    return y

def doorbell():
    def bell(freq, dur=1.7):
        e = tt(dur)
        return sum(a * np.sin(2 * np.pi * freq * h * e) * np.exp(-e * (2.0 + 0.9 * h)) for h, a in
                   [(1, 1), (2.0, .45), (2.76, .3), (5.4, .12)]) * np.minimum(1, e * 350)
    y = np.zeros(n(2.5)); a, b = bell(659.3), bell(523.3)
    y[:a.size] += a; o = n(0.62); y[o:o + b.size] += b[:y.size - o]
    return y

def engine(dur, r):
    """An idling diesel outside, heard through the house: low and steady."""
    e = tt(dur); f0 = 26.7 * (1 + 0.004 * np.sin(2 * np.pi * 0.7 * e)); ph = 2 * np.pi * np.cumsum(f0) / SR
    y = sum(np.sin(k * ph + r.random() * 6.28) * (0.6 + 0.4 * r.random()) / k ** 0.7 for k in range(2, 12))
    y += 2.0 * shaped_noise(e.size, band(60, 420), r) * (0.7 + 0.3 * np.sin(ph))
    return lowpass(y, 500) / 4

def breath_noise(count, r):
    return shaped_noise(count, bump(1400, 0.55), r), shaped_noise(count, bump(720, 0.65), r)

def breathing(seconds, period, r, shape_split=0.42, depth=None):
    """In-breath then longer out-breath, every `period` seconds. Loops when seconds/period is whole."""
    count = n(seconds); t = np.arange(count) / SR; u = (t % period) / period
    a = shape_split
    inh = np.where(u < a - 0.02, np.sin(np.pi * np.clip((u - 0.01) / (a - 0.03), 0, 1)) ** 2, 0.0)
    exh = np.where(u > a + 0.02, np.sin(np.pi * np.clip((u - a - 0.02) / (0.97 - a - 0.02), 0, 1)) ** 1.5, 0.0)
    air_in, air_out = breath_noise(count, r)
    d = depth(t) if depth else 1.0
    return d * (0.75 * inh * air_in + 1.0 * exh * air_out)

# ───────── Helgi's voice: wordless, in step with her mouth ─────────
VOWELS = {'a': (850, 1220, 2810), 'e': (560, 1950, 2750), 'i': (330, 2500, 3100), 'o': (500, 920, 2700),
          'u': (380, 950, 2670), 'x': (620, 1420, 2600)}  # x = neutral "uh"
def voice(seconds, syllables, base_hz, r, slur=0.0):
    """syllables: (start, end, loudness 0…1, vowel, pitch from/to in semitones, onset 'm' | '' | 'hum')."""
    count = n(seconds); out = np.zeros(count)
    for (t0, t1, amp, vowel, st0, st1, onset) in syllables:
        i0, i1 = max(0, n(t0)), min(count, n(t1)); m = i1 - i0
        if m <= 0: continue
        e = np.arange(m) / SR; dur = m / SR
        st = st0 + (st1 - st0) * (e / dur)
        f0 = base_hz * 2 ** (st / 12) * (1 + 0.012 * np.sin(2 * np.pi * 5.3 * (t0 + e)) + 0.008 * shaped_noise(m, lambda f: 1 / (1 + (f / 12) ** 4), r))
        ph = 2 * np.pi * np.cumsum(f0) / SR
        tilt = 1.05 + 0.6 * slur  # slurred speech is duller: fewer high harmonics
        src = sum(np.sin(k * ph) / k ** tilt for k in range(1, int(5200 / (base_hz * 1.4)) + 1))
        src *= 1 + 0.05 * shaped_noise(m, lambda f: 1 / (1 + (f / 30) ** 4), r)  # shimmer
        src += (0.05 + 0.05 * slur) * r.normal(size=m)                             # breath
        att, rel = (0.05 + 0.06 * slur), (0.08 + 0.08 * slur)
        env = np.minimum(1, e / att) * np.minimum(1, (dur - e) / rel)
        env = np.clip(env, 0, 1) ** 1.5
        F = np.array(VOWELS[vowel], float); X = np.array(VOWELS['x'], float)
        F = F + (X - F) * (0.25 + 0.5 * slur)          # slurred speech: vowels collapse toward "uh"
        bws = np.array([90, 110, 160]) * (1 + 0.8 * slur)
        if onset == 'hum':                             # closed mouth
            y = resonator(src * env, 270, 90) + 0.12 * resonator(src * env, 1100, 300)
        else:
            y = src * env
            for f, bw in zip(F, bws): y = resonator(y, f, bw)
            if onset == 'm':                           # a nasal start, like m or n
                k = np.clip(e / 0.075, 0, 1); nas = resonator(src * env, 270, 90)
                y = y * k ** 2 + 0.5 * nas * (1 - k ** 2)
        out[i0:i1] += amp * y / (np.abs(y).max() + 1e-9)
    return highpass(out, 110)

# ───────── shared layers ─────────
ROOM_SHAPE = lambda f: 1 / f ** 1.1 * (f > 35) * np.exp(-f / 2500)
def room_tone(seconds, name):
    """Loops over its clip and is the same signal near both ends of every clip, so joins are continuous."""
    count = n(seconds); t = np.arange(count) / SR; out = np.zeros((count, 2))
    edge = np.minimum(t, seconds - t); w = np.where(edge < 0.6, np.cos(np.pi / 2 * edge / 0.6), 0.0)
    for ch in range(2):
        common = np.tile(shaped_noise(n(2), ROOM_SHAPE, rng(f'room-common-{ch}')), count // n(2))
        own = shaped_noise(count, ROOM_SHAPE, rng(f'room-{name}-{ch}'))
        out[:, ch] = w * common + np.sqrt(1 - w * w) * own
    hum = 0.24 * np.sin(2 * np.pi * 50 * t) + 0.12 * np.sin(2 * np.pi * 100 * t) + 0.06 * np.sin(2 * np.pi * 150 * t)
    return db(-46) * (out + hum[:, None])

def clock(bus, seconds, pan_at=lambda s: PAN['clock']):
    r = rng('clock'); a, b = tick(2600, r), tick(2050, r)
    for s in range(int(seconds)):
        bus.add(a if s % 2 == 0 else 0.8 * b, s, db(-33), pan_at(s))

def reverb(x, loop):
    """A small kitchen. Circular for loops, so the tail of the end lands on the start."""
    r = rng('room-ir'); m = n(0.4); e = np.arange(m) / SR; out = np.zeros_like(x)
    for ch in range(2):
        ir = lowpass(r.normal(size=m), 5000) * np.exp(-e * 17); ir[:n(0.004)] = 0; ir /= np.sqrt(np.sum(ir ** 2))
        if loop:
            out[:, ch] = np.fft.irfft(np.fft.rfft(x[:, ch]) * np.fft.rfft(ir, len(x)), len(x))
        else:
            out[:, ch] = sg.fftconvolve(x[:, ch], ir)[:len(x)]
    return x + db(-13) * out

# ───────── the seven segments ─────────
def build(name, with_voice=True):
    seconds, loop = SEGMENTS[name]; r = rng(name)
    fx = Bus(seconds, loop)          # everything that happens in the room (gets the room's reverb)
    vo = Bus(seconds, loop)          # Helgi's voice, kept apart so it can be left out

    if name == 'intro':
        clock(fx, seconds)
        fx.add(cloth(0.9, r), 0.9, db(-40), PAN['cup'] / 2)            # small gesture with the cup
        fx.add(cloth(0.9, r), 3.0, db(-38), PAN['helgi'])              # cup up to her lips
        fx.add(cloth(0.7, r), 4.3, db(-39), PAN['helgi'])              # and down
        fx.add(cloth(1.1, r), 7.1, db(-38), PAN['cup'] / 2)            # across to the saucer
        fx.add(clink(r), 8.5, db(-21), PAN['cup'])                     # the cup lands (frame 255)
        fx.add(clink(r, 1.06, 2), 8.62, db(-31), PAN['cup'])           # and rocks once or twice
        fx.add(clink(r, 0.97, 3), 8.76, db(-37), PAN['cup'])
        fx.add(clink(r, 1.03, 3), 8.9, db(-43), PAN['cup'])
        fx.add(cloth(0.8, r), 8.8, db(-40), PAN['right_hand'])         # hand back to the table
        fx.add(pat(r, 0.3), 9.58, db(-36), PAN['right_hand'])
        vo.add(voice(seconds, [   # chatting happily, then losing the thread
            (0.00, 0.38, .55, 'e', 2, 3, ''), (0.36, 0.82, .8, 'a', 3, 1, 'm'), (0.80, 1.17, .75, 'i', 2, 2, ''),
            (1.15, 1.64, 1.0, 'a', 4, 1, 'm'), (1.62, 2.07, .6, 'o', 1, 0, ''), (2.05, 2.52, .85, 'e', 2, 0, 'm'),
            (2.50, 2.97, .7, 'a', 0, -3, ''),
            (5.05, 5.40, .6, 'e', 1, 1, ''), (5.38, 5.82, .85, 'a', 2, 0, 'm'), (5.80, 6.22, .7, 'x', 0, 1, ''),
            (6.20, 6.64, .5, 'e', 1, 0, 'm'), (6.62, 7.15, .4, 'x', 0, -2, ''),
            (9.75, 10.17, .55, 'x', 0, 1, 'm'), (10.60, 11.05, .45, 'e', 1, -2, ''),
        ], 188, rng('voice-intro'), slur=0.0), 0, db(-17), PAN['helgi'])

    if name == 's1':
        clock(fx, seconds)
        fx.add(cloth(1.6, r), 4.4, db(-43), PAN['helgi'])              # turns to the window
        fx.add(cloth(1.4, r), 7.6, db(-43), PAN['helgi'])              # and back
        fx.add(cloth(1.2, r), 12.0, db(-39), PAN['envelope'])          # left hand comes up to the envelope
        fx.add(pat(r, 0.15), 13.25, db(-40), PAN['envelope'])          # fingertips on the table
        for at, d in [(13.3, .3), (13.62, .23), (13.87, .33), (14.22, .28), (14.52, .38), (14.92, .28)]:
            fx.add(paper(d, r), at, db(-36), PAN['envelope'])          # pushing the envelope back and forth
        fx.add(cloth(1.0, r), 15.5, db(-40), PAN['envelope'])          # hand back to her lap
        fx.add(cloth(1.5, r), 16.9, db(-44), PAN['helgi'])             # shakes her head
        vo.add(voice(seconds, [   # looking for words
            (0.35, 0.70, .6, 'e', 1, 1, ''), (0.68, 1.15, .75, 'x', 1, -1, 'm'),
            (2.25, 2.64, .65, 'e', 1, 2, 'm'), (2.62, 3.12, .8, 'a', 2, 0, ''), (3.10, 3.62, .55, 'x', 0, -2, 'm'),
            (9.65, 11.25, .9, 'a', -1, 3, ''),                         # a long, questioning "aah…?"
            (20.30, 21.00, .35, 'x', 0, -1, 'hum'),
        ], 174, rng('voice-s1'), slur=0.12), 0, db(-18), PAN['helgi'])

    if name == 'onset_s2':
        clock(fx, seconds)
        fx.add(cloth(0.7, r), 1.5, db(-38), PAN['right_hand'])         # she tries to lift her right arm
        fx.add(cloth(0.6, r), 2.1, db(-40), PAN['right_hand'])         # it wavers
        fx.add(pat(r, 1.0), 2.85, db(-25), PAN['right_hand'])          # and drops back to the table
        fx.add(cloth(1.0, r), 2.8, db(-39), PAN['hands'])              # her left hand comes across
        fx.add(pat(r, 0.1), 3.84, db(-42), PAN['hands'])
        vo.add(voice(seconds, [(2.95, 3.45, .5, 'x', -1, 2, 'hum')], 170, rng('voice-onset_s2'), slur=0.5), 0, db(-22), PAN['helgi'])

    if name == 's2':
        clock(fx, seconds)
        fx.add(breathing(seconds, seconds / 7, rng('breath-s2')), 0, db(-49), PAN['helgi'])   # a little faster than before
        gasp_in, gasp_out = breath_noise(n(0.5), r)[0] * hann(0.5), breath_noise(n(0.9), r)[1] * hann(0.9, 0.7)
        fx.add(gasp_in, 6.5, db(-37), PAN['helgi'])                    # the effort of trying to move the arm
        fx.add(creak(0.5, r, 30, 44), 6.75, db(-42), PAN['chair'])
        fx.add(cloth(1.2, r), 6.6, db(-41), PAN['right_hand'])
        fx.add(gasp_out, 8.4, db(-37), PAN['helgi'])
        for at, d in [(10.3, .45), (10.78, .47), (11.27, .43), (11.72, .5), (12.27, .38), (12.67, .55)]:
            fx.add(rub(d, r), at, db(-40), PAN['hands'])               # rubbing the weak arm
        fx.add(cloth(0.8, r), 14.1, db(-43), PAN['helgi'])             # looks up at you
        fx.add(cloth(0.9, r), 18.8, db(-44), PAN['helgi'])
        vo.add(voice(seconds, [   # trying to speak: slow, thick, the vowels running together
            (7.05, 7.95, .4, 'x', -2, -3, 'hum'),
            (14.85, 15.26, .7, 'e', 0, 0, 'm'), (15.20, 15.76, .9, 'a', 1, -1, ''), (15.70, 16.30, .65, 'o', -1, -3, 'm'),
            (16.90, 17.38, .75, 'a', 0, 1, ''), (17.32, 17.91, .85, 'e', 0, -1, 'm'), (17.85, 18.50, .6, 'x', -2, -4, ''),
        ], 160, rng('voice-s2'), slur=1.0), 0, db(-19), PAN['helgi'])

    if name == 'onset_s3':
        clock(fx, seconds)
        fx.add(cloth(0.9, r), 1.8, db(-40), PAN['hands'])              # her left hand lets go
        sigh = breath_noise(n(2.3), r)[1] * hann(2.3, 0.6) * np.linspace(1, 0.6, n(2.3))
        fx.add(sigh, 2.05, db(-33), PAN['helgi'])                      # a long breath out as she goes
        fx.add(drag(0.95, r), 2.0, db(-36), PAN['right_hand'])         # sleeve dragging across the table
        fx.add(creak(1.7, r, 16, 38), 2.5, db(-31), PAN['chair'])      # the chair takes her weight
        fx.add(cloth(0.9, r), 3.0, db(-35), PAN['right_hand'] - 0.2)   # the arm slides off the edge and hangs
        fx.add(pat(r, 0.5), 4.22, db(-33), PAN['chair'])               # her shoulder settles against the chair back
        fx.add(creak(0.5, r, 22, 14), 4.75, db(-38), PAN['chair'])

    if name == 's3':
        clock(fx, seconds)
        depth = lambda t: 0.88 + 0.08 * np.sin(2 * np.pi * t / 30) + 0.04 * np.sin(4 * np.pi * t / 30)
        fx.add(breathing(seconds, 5.0, rng('breath-s3'), depth=depth), 0, db(-33), PAN['slumped'])  # in step with the picture

    if name == 'end_good':
        turn = lambda s: 0.5 - 0.5 * np.cos(np.pi * np.clip((s - 1.0) / 1.5, 0, 1))      # the camera turns right
        clock(fx, seconds, lambda s: PAN['clock'] - 0.6 * turn(s))
        door = lambda s: PAN['door'] - 0.4 * turn(s)
        e = tt(seconds); idle = engine(seconds, r) * np.minimum(1, e / 1.0) * (0.55 + 0.45 * np.clip((e - 1.3) / 0.5, 0, 1))
        fx.add(idle, 0, db(-38), 0.5)                                   # the ambulance outside
        fx.add(doorbell(), 0.12, db(-17), door(0))
        fx.add(lowpass(latch(r), 1900), 1.25, db(-27), door(1.25))      # the front door, out of sight
        fx.add(lowpass(creak(0.5, r, 40, 26, (620, 1380, 2200)), 2000), 1.35, db(-37), door(1.4))
        fx.add(footstep(r), 1.85, db(-31), door(1.85))                  # steps in the hallway
        fx.add(footstep(r), 2.35, db(-28), door(2.35))
        fx.add(footstep(r), 2.8, db(-25), door(2.8))                    # and into the doorway
        fx.add(footstep(r), 3.4, db(-24), door(3.4))
        fx.add(footstep(r), 4.0, db(-24), door(4.0))
        fx.add(cloth(1.9, r), 2.5, db(-37), door(3.4))                  # jacket
        fx.add(cloth(1.0, r), 1.5, db(-43), PAN['helgi'] - 0.3)         # Helgi turns her head to the door

    wet = fx.x + (vo.x if with_voice else 0)
    wet = reverb(wet, loop)
    if not loop:                                                        # no clicks at a clip's own ends
        k = n(0.02); wet[-k:] *= np.linspace(1, 0, k)[:, None]
    return room_tone(seconds, name) + wet, reverb(vo.x, loop)

def save(path, x):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    peak = np.abs(x).max()
    assert peak < 0.9, f'{path} peaks at {peak:.2f}'
    with wave.open(path + '.wav', 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).round().astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path + '.wav', '-c:a', 'aac', '-b:a', '128k', path + '.m4a'], check=True)

if __name__ == '__main__':
    for name in SEGMENTS:
        full, voice_only = build(name, True)
        plain, _ = build(name, False)
        full, voice_only, plain = (x * db(MASTER_DB) for x in (full, voice_only, plain))
        save(os.path.join(OUT, 'with_voice', name), full)
        save(os.path.join(OUT, 'without_voice', name), plain)
        if np.abs(voice_only).max() > 0: save(os.path.join(OUT, 'voice_only', name), voice_only)
        print(f'{name:9s} {len(full) / SR:5.1f} s  peak {20 * np.log10(np.abs(full).max()):6.1f} dBFS  rms {20 * np.log10(np.sqrt(np.mean(full ** 2))):6.1f} dBFS')
