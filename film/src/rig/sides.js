// Left/right rule from FILM_SPEC.md. The camera is the caller, sitting across
// the table from Helgi, so HER right side appears on the LEFT of the frame.
// Every stroke sign in S2 (mouth corner, cheek, arm) is on her right side.
// Use these constants instead of writing "left"/"right" by hand in drawing code.

export const SCREEN_LEFT = -1;
export const SCREEN_RIGHT = 1;

export const PATIENT_RIGHT = SCREEN_LEFT;
export const PATIENT_LEFT = SCREEN_RIGHT;

/** Suffix convention for rig parameters: "R" = her right, "L" = her left. */
export const SIDE_OF_SUFFIX = { R: PATIENT_RIGHT, L: PATIENT_LEFT };
