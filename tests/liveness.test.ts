// Tests for the liveness logic (src/lib/liveness.ts). No camera needed: synthetic landmarks and metrics.
// Run: npm run test:liveness   (uses Node's built-in test runner)
import test from "node:test";
import assert from "node:assert/strict";
import { LivenessRunner, metricsFromLandmarks, eyeAspectRatio, T } from "../src/lib/liveness.ts";
import type { Metrics, Landmark } from "../src/lib/liveness.ts";

// ---- landmarks -> measurements --------------------------------------------------------------------------------------------------
function face(over: { noseX?: number; eyeOpen?: number; left?: number; right?: number } = {}): Landmark[] {
  const lm: Landmark[] = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 }));
  const left = over.left ?? 0.3;
  const right = over.right ?? 0.7;
  lm[234] = { x: left, y: 0.5 };
  lm[454] = { x: right, y: 0.5 };
  lm[1] = { x: over.noseX ?? 0.5, y: 0.55 };
  const v = over.eyeOpen ?? 0.02; // vertical eye opening
  // left eye: corners 33 / 133, lids 160-144 and 158-153; right eye: corners 362 / 263, lids 385-380 and 387-373
  lm[33] = { x: 0.4, y: 0.45 };
  lm[133] = { x: 0.46, y: 0.45 };
  lm[160] = { x: 0.42, y: 0.45 - v / 2 };
  lm[144] = { x: 0.42, y: 0.45 + v / 2 };
  lm[158] = { x: 0.44, y: 0.45 - v / 2 };
  lm[153] = { x: 0.44, y: 0.45 + v / 2 };
  lm[362] = { x: 0.54, y: 0.45 };
  lm[263] = { x: 0.6, y: 0.45 };
  lm[385] = { x: 0.56, y: 0.45 - v / 2 };
  lm[380] = { x: 0.56, y: 0.45 + v / 2 };
  lm[387] = { x: 0.58, y: 0.45 - v / 2 };
  lm[373] = { x: 0.58, y: 0.45 + v / 2 };
  return lm;
}

test("eye aspect ratio is about 0.33 for the open test eye and near 0 closed; the frame's shape is corrected for", () => {
  assert.ok(Math.abs(eyeAspectRatio(face(), [33, 160, 158, 133, 153, 144], 1) - 0.333) < 0.01);
  assert.ok(eyeAspectRatio(face({ eyeOpen: 0.002 }), [33, 160, 158, 133, 153, 144], 1) < 0.05);
  // a 4:3 frame (height/width = 0.75) makes vertical distances smaller in width units
  assert.ok(Math.abs(eyeAspectRatio(face(), [33, 160, 158, 133, 153, 144], 0.75) - 0.25) < 0.01);
});

test("yaw is 0 facing the camera and positive when the nose moves toward the image's right (the person turning to THEIR left)", () => {
  assert.ok(Math.abs(metricsFromLandmarks([face()], 0, 1)!.yaw) < 1e-9);
  assert.ok(metricsFromLandmarks([face({ noseX: 0.6 })], 0, 1)!.yaw > 0.4);
  assert.ok(metricsFromLandmarks([face({ noseX: 0.4 })], 0, 1)!.yaw < -0.4);
});

function tilted(lm: Landmark[], degrees: number): Landmark[] {
  const r = (degrees * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return lm.map((p) => ({ x: 0.5 + (p.x - 0.5) * c - (p.y - 0.5) * s, y: 0.5 + (p.x - 0.5) * s + (p.y - 0.5) * c }));
}

test("a tilted head is not mistaken for a turn, and a real turn still shows when the head is tilted", () => {
  for (const deg of [-35, -15, 15, 35, 90]) {
    assert.ok(Math.abs(metricsFromLandmarks([tilted(face(), deg)], 0, 1)!.yaw) < 0.02, `tilt ${deg} with the nose centred is still facing the camera`);
    const turned = metricsFromLandmarks([tilted(face({ noseX: 0.6 }), deg)], 0, 1)!.yaw;
    assert.ok(turned > 0.4, `tilt ${deg} with the nose moved right still reads as a left turn (got ${turned.toFixed(2)})`);
  }
});

test("metrics: no face is null, two faces are counted, the largest face is used", () => {
  assert.equal(metricsFromLandmarks([], 0, 1), null);
  const small = face({ left: 0.45, right: 0.55 });
  const m = metricsFromLandmarks([small, face()], 0, 1)!;
  assert.equal(m.faces, 2);
  assert.ok(m.box.x1 >= 0.7 - 1e-9 || m.box.x0 <= 0.3 + 1e-9, "the larger face drives the box");
});

// ---- the runner -------------------------------------------------------------------------------------------------------------------
let clock = 0;
const m = (over: Partial<Metrics> = {}): Metrics => {
  clock += 80;
  return { faces: 1, ear: 0.3, yaw: 0, faceW: 0.4, cx: 0.5, cy: 0.5, box: { x0: 0.3, y0: 0.2, x1: 0.7, y1: 0.8 }, t: clock, ...over };
};
const feed = (r: LivenessRunner, frames: Partial<Metrics>[]) => frames.map((f) => r.push(m(f)));
const events = (r: LivenessRunner, frames: Partial<Metrics>[]) => feed(r, frames).map((s) => s.event);
const frontal = (n: number) => Array.from({ length: n }, () => ({}));

test("straight completes after enough frames facing the camera with eyes open, and a glance away starts the count over", () => {
  const r = new LivenessRunner(["straight", "blink", "turn_left"]);
  assert.ok(!events(r, frontal(T.straightFrames - 1)).includes("step_done"));
  feed(r, [{ yaw: 0.5 }]); // looked away: the streak resets
  assert.ok(!events(r, frontal(T.straightFrames - 1)).includes("step_done"));
  assert.equal(events(r, frontal(1))[0], "step_done");
  assert.equal(r.action, "blink");
});

test("straight does not count closed eyes", () => {
  const r = new LivenessRunner(["straight", "blink", "turn_left"]);
  assert.ok(!events(r, Array.from({ length: 20 }, () => ({ ear: 0.05 }))).includes("step_done"));
});

function afterStraight(steps: ("straight" | "blink" | "turn_left" | "turn_right")[]) {
  const r = new LivenessRunner(steps);
  events(r, frontal(T.straightFrames));
  return r;
}

test("a blink needs the eyes to close and then open again", () => {
  const closedThenOpen = afterStraight(["straight", "blink", "turn_left"]);
  assert.deepEqual(events(closedThenOpen, [{}, { ear: 0.1 }, { ear: 0.1 }, { ear: 0.3 }]).slice(-1), ["step_done"]);

  const never = afterStraight(["straight", "blink", "turn_left"]);
  assert.ok(!events(never, Array.from({ length: 30 }, () => ({}))).includes("step_done"), "open eyes the whole time is not a blink");

  const stuckShut = afterStraight(["straight", "blink", "turn_left"]);
  const shut = Array.from({ length: 60 }, () => ({ ear: 0.05 }));
  assert.ok(!events(stuckShut, shut).includes("step_done"), "eyes held shut and never reopened is not a blink");
});

test("a blink while looking away does not count", () => {
  const r = afterStraight(["straight", "blink", "turn_left"]);
  assert.ok(!events(r, [{ ear: 0.1, yaw: 0.5 }, { ear: 0.3, yaw: 0.5 }]).includes("step_done"));
});

test("turn_left needs the head to turn to the person's left (positive yaw), turn_right the other way", () => {
  const left = afterStraight(["straight", "turn_left", "blink"]);
  assert.ok(!events(left, frontal(4).concat(Array.from({ length: 6 }, () => ({ yaw: -0.4 })))).includes("step_done"), "the wrong way does not count");
  assert.equal(events(left, Array.from({ length: T.turnFrames }, () => ({ yaw: 0.4 }))).slice(-1)[0], "step_done");

  const right = afterStraight(["straight", "turn_right", "blink"]);
  feed(right, frontal(4));
  assert.equal(events(right, Array.from({ length: T.turnFrames }, () => ({ yaw: -0.4 }))).slice(-1)[0], "step_done");
});

test("a head that is ALREADY turned does not count: the person must face the camera first", () => {
  const r = afterStraight(["straight", "turn_left", "blink"]);
  assert.ok(!events(r, Array.from({ length: 12 }, () => ({ yaw: 0.4 }))).includes("step_done"));
  feed(r, frontal(T.armFrames));
  assert.equal(events(r, Array.from({ length: T.turnFrames }, () => ({ yaw: 0.4 }))).slice(-1)[0], "step_done");
});

test("finishing the last step says all_done", () => {
  const r = afterStraight(["straight", "blink", "turn_left"]);
  assert.equal(events(r, [{}, { ear: 0.1 }, { ear: 0.3 }]).slice(-1)[0], "step_done");
  feed(r, frontal(T.armFrames));
  assert.equal(events(r, Array.from({ length: T.turnFrames }, () => ({ yaw: 0.4 }))).slice(-1)[0], "all_done");
});

test("two faces, a face too far away, too close or off to the side get a hint and never progress", () => {
  const r = new LivenessRunner(["straight", "blink", "turn_left"]);
  const run = (f: Partial<Metrics>) => {
    const s = feed(r, Array.from({ length: 20 }, () => f));
    return s[s.length - 1];
  };
  assert.match(run({ faces: 2 }).hint, /one face/i);
  assert.match(run({ faceW: 0.1 }).hint, /closer/i);
  assert.match(run({ faceW: 0.95 }).hint, /back/i);
  assert.match(run({ cx: 0.05 }).hint, /centre/i);
  assert.equal(r.index, 0, "never left the first step");
  assert.match(r.push(null).hint, /show your face/i);
});

test("a step that takes too long fails, and restarting it works", () => {
  const r = new LivenessRunner(["straight", "blink", "turn_left"]);
  feed(r, [{ yaw: 0.5 }]);
  clock += T.stepTimeoutMs + 1000;
  const s = r.push(m({ yaw: 0.5 }));
  assert.equal(s.event, "failed");
  assert.equal(events(r, frontal(T.straightFrames)).slice(-1)[0], "step_done", "it can be done after the failure");
});
