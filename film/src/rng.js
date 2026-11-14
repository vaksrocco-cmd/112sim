// Seeded randomness. The film never calls Math.random or Date.now:
// the same (segment, frame) always gives the same numbers.

/** mulberry32: small, fast 32-bit PRNG. Returns a function giving floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash of a string to an unsigned 32-bit integer. */
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seed for a segment, optionally with a frame index and a salt ("grain", "steam", ...). */
export function seedFor(segmentId, frameIndex = -1, salt = '') {
  return hashString(`${segmentId}|${frameIndex}|${salt}`);
}

/** PRNG that is constant for a whole segment (e.g. where the dust specks sit). */
export function segmentRng(segmentId, salt = '') {
  return mulberry32(seedFor(segmentId, -1, salt));
}

/** PRNG for one frame of one segment (e.g. film grain). */
export function frameRng(segmentId, frameIndex, salt = '') {
  return mulberry32(seedFor(segmentId, frameIndex, salt));
}

/** Convenience helpers on top of a PRNG function. */
export function helpers(rng) {
  return {
    next: rng,
    range: (min, max) => min + (max - min) * rng(),
    int: (min, max) => Math.floor(min + (max - min + 1) * rng()),
    pick: (arr) => arr[Math.floor(rng() * arr.length)],
    // Approximately normal, mean 0, sd 1 (sum of uniforms).
    gauss: () => (rng() + rng() + rng() + rng() - 2) * 1.7320508,
  };
}
