/**
 * Liveness for the live photo, run in the browser on face landmarks (Google MediaPipe Face Landmarker, 478 points).
 *
 * Pure logic with no imports, so it can be tested without a camera. The camera loop feeds it one `Metrics` per detected frame and it
 * answers which step the person is on, what to tell them, and when a step is done.
 *
 * Steps: "straight" (look at the camera, eyes open), "blink", and one head turn ("turn_left" / "turn_right"). Which turn, and the
 * order of blink and turn, come from the server for each attempt, so a recording cannot be prepared in advance.
 *
 * NOTE for tuning: the thresholds below are sensible starting values. They have not been tuned on real phones yet; they should be
 * checked on a few low-end Android devices and in poor light before this is switched on for everyone.
 *
 * "left" / "right" are the PERSON's left and right. The raw (un-mirrored) front-camera image shows the person's left on the image's
 * right, so turning left moves the nose toward larger x and gives a positive `yaw`. The on-screen preview is mirrored by CSS only.
 */

export type Action = "straight" | "blink" | "turn_left" | "turn_right";

export interface Landmark {
  x: number;
  y: number;
}

export interface Metrics {
  /** number of faces in the frame */
  faces: number;
  /** eye aspect ratio, both eyes averaged: about 0.2-0.3 with the eyes open, much lower closed. It varies from person to person, so a blink is judged against the person's own open-eye value, never an absolute number */
  ear: number;
  /** -1..1, 0 = facing the camera, positive = the person turned to THEIR left */
  yaw: number;
  /** face width as a fraction of the frame width */
  faceW: number;
  /** face centre as a fraction of the frame */
  cx: number;
  cy: number;
  /** face box as fractions of the frame (used to crop) */
  box: { x0: number; y0: number; x1: number; y1: number };
  /** time of the frame in ms */
  t: number;
}

// MediaPipe face mesh indices
const EYE_LEFT = [33, 160, 158, 133, 153, 144];
const EYE_RIGHT = [362, 385, 387, 263, 373, 380];
const NOSE_TIP = 1;
const CHEEK_IMAGE_LEFT = 234;
const CHEEK_IMAGE_RIGHT = 454;
const EYE_OUTER_IMAGE_LEFT = 33;
const EYE_OUTER_IMAGE_RIGHT = 263;

/** distance in "width units": y is scaled by the frame's height/width so a wide frame does not stretch the eye */
const dist = (a: Landmark, b: Landmark, aspect: number) => Math.hypot(a.x - b.x, (a.y - b.y) * aspect);

export function eyeAspectRatio(lm: Landmark[], idx: number[], aspect: number): number {
  const [p1, p2, p3, p4, p5, p6] = idx.map((i) => lm[i]);
  return (dist(p2, p6, aspect) + dist(p3, p5, aspect)) / (2 * dist(p1, p4, aspect) + 1e-9);
}

/**
 * Head turn, -1..1 (0 = facing the camera, positive = turned to the person's left). The nose is placed between the two cheeks AFTER
 * undoing any tilt of the head (the angle of the line between the outer eye corners), so a tilted head is not mistaken for a turn and
 * a face rotated in the picture does not distort the number.
 */
export function yawOf(lm: Landmark[], aspect: number): number {
  const p = (i: number) => ({ x: lm[i].x, y: lm[i].y * aspect });
  const eyeL = p(EYE_OUTER_IMAGE_LEFT);
  const eyeR = p(EYE_OUTER_IMAGE_RIGHT);
  const roll = Math.atan2(eyeR.y - eyeL.y, eyeR.x - eyeL.x);
  const c = Math.cos(-roll);
  const s = Math.sin(-roll);
  const alongEyeLine = (pt: { x: number; y: number }) => pt.x * c - pt.y * s; // the x coordinate once the tilt is undone
  const left = alongEyeLine(p(CHEEK_IMAGE_LEFT));
  const right = alongEyeLine(p(CHEEK_IMAGE_RIGHT));
  const nose = alongEyeLine(p(NOSE_TIP));
  const span = right - left || 1e-9;
  return (nose - left - (right - nose)) / span;
}

/**
 * @param faces landmarks of every face found in the frame (the largest is used)
 * @param aspect video height divided by width
 * @returns null when no face was found
 */
export function metricsFromLandmarks(faces: Landmark[][], t: number, aspect: number): Metrics | null {
  if (!faces.length) return null;
  const width = (f: Landmark[]) => Math.abs(f[CHEEK_IMAGE_RIGHT].x - f[CHEEK_IMAGE_LEFT].x);
  const lm = [...faces].sort((a, b) => width(b) - width(a))[0];
  let x0 = 1;
  let y0 = 1;
  let x1 = 0;
  let y1 = 0;
  for (const p of lm) {
    if (p.x < x0) x0 = p.x;
    if (p.x > x1) x1 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.y > y1) y1 = p.y;
  }
  return {
    faces: faces.length,
    ear: (eyeAspectRatio(lm, EYE_LEFT, aspect) + eyeAspectRatio(lm, EYE_RIGHT, aspect)) / 2,
    yaw: yawOf(lm, aspect),
    faceW: x1 - x0,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    box: { x0, y0, x1, y1 },
    t,
  };
}

// ---- thresholds ---------------------------------------------------------------------------------------------------------------------
export const T = {
  minFaceW: 0.25, // closer than this: "move closer" (also keeps the face large enough for the server's own quality check)
  maxFaceW: 0.8, // bigger than this: "move back"
  maxOffCentreX: 0.22,
  maxOffCentreY: 0.28,
  frontalYaw: 0.12, // |yaw| below this counts as facing the camera
  eyesOpenMin: 0.12, // an EAR below this is not "eyes open" for the straight step
  straightFrames: 8, // consecutive good frames for the straight step
  blinkClosedRatio: 0.7, // closed when EAR < baseline x this
  blinkOpenRatio: 0.85, // reopened when EAR > baseline x this
  blinkMaxClosedMs: 2500, // eyes shut longer than this is not a blink: start over
  blinkFacingYaw: 0.2, // keep facing the camera while blinking
  turnYaw: 0.22, // |yaw| the head must reach in the asked direction
  turnFrames: 3, // consecutive frames at that angle
  armFrames: 3, // frontal frames before the turn is measured (a face already turned does not count)
  stepTimeoutMs: 12000,
};

export type RunnerEvent = "none" | "step_done" | "all_done" | "failed";

export interface RunnerState {
  event: RunnerEvent;
  /** index of the step being worked on (or just finished, for step_done) */
  index: number;
  action: Action;
  /** what to tell the person right now */
  hint: string;
  /** 0..1 for the current step */
  progress: number;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

export const PROMPTS: Record<Action, string> = {
  straight: "Look straight at the camera",
  blink: "Now blink once, slowly",
  turn_left: "Slowly turn your head to your left",
  turn_right: "Slowly turn your head to your right",
};

export class LivenessRunner {
  readonly steps: Action[];
  index = 0;
  private baselineEar = 0;
  private startedAt: number | null = null;
  private streak = 0;
  private ears: number[] = [];
  private sawClosedAt: number | null = null;
  private armed = 0;

  constructor(steps: Action[]) {
    this.steps = steps;
  }

  get action(): Action {
    return this.steps[Math.min(this.index, this.steps.length - 1)];
  }

  /** start the current step over (after a failure) */
  restartStep() {
    this.startedAt = null;
    this.streak = 0;
    this.ears = [];
    this.sawClosedAt = null;
    this.armed = 0;
  }

  private state(event: RunnerEvent, hint: string, progress: number): RunnerState {
    return { event, index: this.index, action: this.action, hint, progress: Math.max(0, Math.min(1, progress)) };
  }

  private advance(): RunnerState {
    const finished = this.index;
    const last = finished >= this.steps.length - 1;
    const doneState = { event: (last ? "all_done" : "step_done") as RunnerEvent, index: finished, action: this.steps[finished], hint: "", progress: 1 };
    if (!last) this.index += 1;
    this.restartStep();
    return doneState;
  }

  push(m: Metrics | null): RunnerState {
    const action = this.action;
    if (this.startedAt === null && m) this.startedAt = m.t;
    if (m && this.startedAt !== null && m.t - this.startedAt > T.stepTimeoutMs) {
      this.restartStep();
      return this.state("failed", "We did not see that. Let's try this step again.", 0);
    }
    if (!m) {
      this.streak = 0;
      this.armed = 0;
      return this.state("none", "Show your face to the camera", 0);
    }
    if (m.faces > 1) {
      this.streak = 0;
      this.armed = 0;
      return this.state("none", "Only one face, please", 0);
    }
    if (m.faceW < T.minFaceW) return this.hold("Move a little closer");
    if (m.faceW > T.maxFaceW) return this.hold("Move back a little");
    if (Math.abs(m.cx - 0.5) > T.maxOffCentreX || Math.abs(m.cy - 0.5) > T.maxOffCentreY) return this.hold("Centre your face in the oval");

    const frontal = Math.abs(m.yaw) < T.frontalYaw;

    if (action === "straight") {
      if (frontal && m.ear > T.eyesOpenMin) {
        this.streak += 1;
        this.ears.push(m.ear);
        if (this.streak >= T.straightFrames) {
          this.baselineEar = median(this.ears);
          return this.advance();
        }
        return this.state("none", PROMPTS.straight, this.streak / T.straightFrames);
      }
      this.streak = 0;
      this.ears = [];
      return this.state("none", PROMPTS.straight, 0);
    }

    if (action === "blink") {
      if (Math.abs(m.yaw) > T.blinkFacingYaw) return this.state("none", "Keep facing the camera, then blink", 0);
      const closed = m.ear < this.baselineEar * T.blinkClosedRatio;
      const reopened = m.ear > this.baselineEar * T.blinkOpenRatio;
      if (this.sawClosedAt === null) {
        if (closed) this.sawClosedAt = m.t;
        return this.state("none", PROMPTS.blink, 0);
      }
      if (m.t - this.sawClosedAt > T.blinkMaxClosedMs) {
        this.sawClosedAt = null; // eyes held shut: not a blink
        return this.state("none", PROMPTS.blink, 0);
      }
      if (reopened) return this.advance();
      return this.state("none", PROMPTS.blink, 0.5);
    }

    // a head turn
    const sign = action === "turn_left" ? 1 : -1;
    if (this.armed < T.armFrames) {
      if (frontal) this.armed += 1;
      else this.armed = 0;
      return this.state("none", "Face the camera first", this.armed / T.armFrames / 2);
    }
    const toward = sign * m.yaw;
    if (toward > T.turnYaw) {
      this.streak += 1;
      if (this.streak >= T.turnFrames) return this.advance();
      return this.state("none", PROMPTS[action], 0.5 + this.streak / T.turnFrames / 2);
    }
    this.streak = 0;
    if (toward < -T.turnYaw) return this.state("none", `That is the other way. ${PROMPTS[action]}`, 0.5);
    return this.state("none", PROMPTS[action], 0.5);
  }

  private hold(hint: string): RunnerState {
    this.streak = 0;
    this.armed = 0;
    return this.state("none", hint, 0);
  }
}
