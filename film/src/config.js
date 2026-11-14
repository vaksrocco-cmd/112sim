// Fixed numbers from FILM_SPEC.md. Everything else imports them from here.

export const FRAME_W = 1920;
export const FRAME_H = 1080;
export const FPS = 30;

// World space is larger than the frame so the camera can sway and turn.
export const WORLD_W = 2600;
export const WORLD_H = 1200;

/** Number of rendered frames in a segment of `durationS` seconds. */
export function frameCount(durationS) {
  const n = durationS * FPS;
  const rounded = Math.round(n);
  if (Math.abs(n - rounded) > 1e-9) {
    throw new Error(`durationS ${durationS} is not a whole number of frames at ${FPS} fps`);
  }
  return rounded;
}
