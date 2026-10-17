import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, Eye, Loader2, RotateCcw, ScanFace, ShieldCheck, Smartphone, Sun } from "lucide-react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCreateLivePhotoChallengeMutation, useGetLivePhotoStatusQuery, useSubmitLivePhotoMutation } from "@/redux/api";
import { LivenessRunner, PROMPTS, metricsFromLandmarks } from "@/lib/liveness";
import type { Action, Metrics, RunnerState } from "@/lib/liveness";
import { cropJpeg, grabJpeg } from "@/lib/capture-frames";

interface Props {
  /** called once the live photo is saved */
  onDone: () => void;
  /** when given, a "Do this later" button is shown if the camera cannot be used */
  onLater?: () => void;
}

type Phase = "consent" | "loading" | "running" | "submitting" | "done" | "error";

const STEP_LABEL: Record<Action, string> = {
  straight: "Look at the camera",
  blink: "Blink",
  turn_left: "Turn left",
  turn_right: "Turn right",
};

const SMALL = { maxSide: 640, quality: 0.7 }; // step frames: big enough for the engine's own face-size check, small enough to send quickly
const PHOTO = { maxSide: 1280, quality: 0.92 }; // the full-quality frames the face template is made from
const CROP = { scale: 1.4, maxSide: 640, quality: 0.8 }; // the only picture that is kept: the face, compressed

// Versioned folder: what is in it never changes, so the browser can keep it for a year. When the library or model is upgraded the
// folder (and this number) changes. scripts/copy-mediapipe.mjs refuses to run if the installed library has a different version.
export const MEDIAPIPE_BASE = "/mediapipe/1.1.1";

// The face-landmark model is loaded once and reused (loading it is the slow part).
let landmarkerPromise: Promise<FaceLandmarker> | null = null;
function loadLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker: FL, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(`${MEDIAPIPE_BASE}/wasm`);
      const make = (delegate: "GPU" | "CPU") =>
        FL.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: `${MEDIAPIPE_BASE}/face_landmarker.task`, delegate },
          runningMode: "VIDEO",
          numFaces: 2, // two faces in the picture is refused
        });
      try {
        return await make("GPU");
      } catch {
        return await make("CPU");
      }
    })().catch((e) => {
      landmarkerPromise = null;
      throw e;
    });
  }
  return landmarkerPromise;
}

class CameraProblem extends Error {}

// The oval guide as a path from the top, clockwise, in a 100 x 133.33 box: 62% wide, 74% tall, centred (the same oval that is cut out of the dimming).
const RING = "M50 17.3 A31 49.3 0 0 1 50 115.9 A31 49.3 0 0 1 50 17.3";

function ActionIcon({ action }: { action?: Action }) {
  const cls = "h-5 w-5";
  if (action === "blink") return <Eye className={cls} />;
  if (action === "turn_left") return <ArrowLeft className={cls} />; // the picture is mirrored, so "your left" is the left of the screen
  if (action === "turn_right") return <ArrowRight className={cls} />;
  return <ScanFace className={cls} />;
}

function friendlyError(e: unknown): string {
  if (e instanceof CameraProblem) return e.message;
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera access is blocked. Allow the camera for this site in your browser settings, then try again.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "No camera was found on this device.";
  if (name === "NotReadableError") return "The camera is being used by another app. Close it and try again.";
  const message = (e as { data?: { message?: string } })?.data?.message;
  if (message) return message;
  return "Something went wrong. Please try again.";
}

interface Collected {
  frames: Partial<Record<Action, string[]>>;
  photoFrames: string[];
  crop: string;
  keys: Set<string>;
  turnCandidates: { score: number; b64: string }[];
  lastTurnAt: number;
}
const freshCollected = (): Collected => ({ frames: {}, photoFrames: [], crop: "", keys: new Set(), turnCandidates: [], lastTurnAt: 0 });

export function LiveCapture({ onDone, onLater }: Props) {
  const [phase, setPhase] = useState<Phase>("consent");
  const [consent, setConsent] = useState(false);
  const [steps, setSteps] = useState<Action[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [hint, setHint] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const runnerRef = useRef<LivenessRunner | null>(null);
  const challengeIdRef = useRef("");
  const collectedRef = useRef<Collected>(freshCollected());

  const [createChallenge] = useCreateLivePhotoChallengeMutation();
  const [submit] = useSubmitLivePhotoMutation();
  // the consent wording comes from the server: what is shown is exactly what is recorded
  const { data: statusData, refetch: refetchStatus } = useGetLivePhotoStatusQuery();
  const consentInfo = statusData?.data?.consent;
  const consentVersionRef = useRef("");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const ensureCamera = useCallback(async () => {
    if (streamRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) throw new CameraProblem("This browser cannot open the camera.");
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    streamRef.current = stream;
    const video = videoRef.current;
    if (!video) throw new CameraProblem("The camera view is not ready.");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    for (let i = 0; i < 60 && !video.videoWidth; i += 1) await new Promise((r) => setTimeout(r, 50));
    if (!video.videoWidth) throw new CameraProblem("The camera did not start. Please try again.");
  }, []);

  const finish = useCallback(async () => {
    setPhase("submitting");
    stopCamera();
    const runner = runnerRef.current;
    const c = collectedRef.current;
    if (!runner || !c.photoFrames.length || !c.crop) {
      setError("We could not capture a clear photo. Please try again.");
      setPhase("error");
      return;
    }
    try {
      await submit({
        challenge_id: challengeIdRef.current,
        consent: true,
        consent_version: consentVersionRef.current,
        steps: runner.steps.map((action) => ({ action, passed: true, frames: c.frames[action] ?? [] })),
        photo_frames: c.photoFrames,
        crop: c.crop,
      }).unwrap();
      setPhase("done");
      onDone();
    } catch (e) {
      if ((e as { data?: { code?: string } })?.data?.code === "CONSENT_OUTDATED") {
        // the wording changed while the person was on this screen: show the new text and ask again
        setConsent(false);
        void refetchStatus();
        setError(friendlyError(e));
        setPhase("consent");
        return;
      }
      setError(friendlyError(e));
      setPhase("error");
    }
  }, [onDone, refetchStatus, stopCamera, submit]);

  // the camera loop: detect a face about 14 times a second and feed the liveness logic
  useEffect(() => {
    if (phase !== "running") return;
    let raf = 0;
    let last = 0;
    let stopped = false;
    let shownHint = "";
    let shownProgress = -1;

    const handle = (m: Metrics | null, video: HTMLVideoElement) => {
      const runner = runnerRef.current;
      if (!runner) return;
      const action = runner.action;
      const s = runner.push(m);
      collect(action, s, m, video);
      if (s.event === "failed") resetStep(action);
      const nextHint = s.event === "step_done" || s.event === "all_done" ? PROMPTS[runner.action] : s.hint || PROMPTS[runner.action];
      const nextProgress = Math.round(s.progress * 20) / 20;
      if (nextHint !== shownHint) {
        shownHint = nextHint;
        setHint(nextHint);
      }
      if (nextProgress !== shownProgress) {
        shownProgress = nextProgress;
        setProgress(nextProgress);
      }
      if (s.event === "step_done") {
        setStepIndex(runner.index);
        try {
          navigator.vibrate?.(30); // a small tap on phones that support it
        } catch {
          /* not supported */
        }
      }
      if (s.event === "all_done") {
        stopped = true;
        setStepIndex(runner.steps.length);
        void finish();
      }
    };

    const collect = (action: Action, s: RunnerState, m: Metrics | null, video: HTMLVideoElement) => {
      if (!m) return;
      const c = collectedRef.current;
      const once = (key: string) => {
        if (c.keys.has(key)) return false;
        c.keys.add(key);
        return true;
      };
      const addSmall = () => {
        (c.frames[action] ??= []).push(grabJpeg(video, SMALL));
      };
      const addPhoto = () => {
        c.photoFrames.push(grabJpeg(video, PHOTO));
        c.crop = cropJpeg(video, m.box, CROP); // the latest, most settled face is the one kept
      };
      const done = s.event === "step_done" || s.event === "all_done";
      if (action === "straight") {
        if (s.progress >= 0.4 && once("s1")) addSmall();
        if (s.progress >= 0.55 && once("p1")) addPhoto();
        if (s.progress >= 0.7 && once("s2")) addSmall();
        if (s.progress >= 0.85 && once("p2")) addPhoto();
        if (done) {
          if (once("s3")) addSmall();
          if (once("p3")) addPhoto();
        }
      } else if (action === "blink") {
        if (s.progress >= 0.5 && once("b1")) addSmall();
        if (done && once("b2")) addSmall();
      } else {
        // a head turn: keep the three frames where the head was turned the most
        const score = Math.abs(m.yaw);
        if ((score > 0.15 && m.t - c.lastTurnAt > 150) || done) {
          c.lastTurnAt = m.t;
          c.turnCandidates.push({ score, b64: grabJpeg(video, SMALL) });
          c.turnCandidates.sort((a, b) => b.score - a.score);
          c.turnCandidates.length = Math.min(c.turnCandidates.length, 3);
        }
        if (done) c.frames[action] = c.turnCandidates.map((x) => x.b64);
      }
    };

    const resetStep = (action: Action) => {
      const c = collectedRef.current;
      const prefix = action === "straight" ? ["s", "p"] : action === "blink" ? ["b"] : ["t"];
      [...c.keys].forEach((k) => {
        if (prefix.some((p) => k.startsWith(p))) c.keys.delete(k);
      });
      delete c.frames[action];
      if (action === "straight") {
        c.photoFrames = [];
        c.crop = "";
      }
      if (action !== "straight" && action !== "blink") c.turnCandidates = [];
    };

    const tick = () => {
      if (stopped) return;
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      const now = performance.now();
      if (video && landmarker && video.readyState >= 2 && video.videoWidth && now - last >= 70) {
        last = now;
        let m: Metrics | null = null;
        try {
          const res = landmarker.detectForVideo(video, now);
          m = metricsFromLandmarks(res.faceLandmarks, now, video.videoHeight / video.videoWidth);
        } catch {
          m = null;
        }
        handle(m, video);
      }
      if (!stopped) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
    };
  }, [phase, finish]);

  const begin = useCallback(async () => {
    if (!consentInfo) return;
    consentVersionRef.current = consentInfo.version;
    setError("");
    setPhase("loading");
    try {
      const [landmarker] = await Promise.all([loadLandmarker(), ensureCamera()]);
      landmarkerRef.current = landmarker;
      // the challenge is asked for last, so its two minutes start when the person is ready
      const challenge = await createChallenge().unwrap();
      challengeIdRef.current = challenge.data.challenge_id;
      runnerRef.current = new LivenessRunner(challenge.data.steps);
      collectedRef.current = freshCollected();
      setSteps(challenge.data.steps);
      setStepIndex(0);
      setProgress(0);
      setHint(PROMPTS.straight);
      setPhase("running");
    } catch (e) {
      stopCamera();
      setError(friendlyError(e));
      setPhase("error");
    }
  }, [consentInfo, createChallenge, ensureCamera, stopCamera]);

  // one ring for the whole check: finished steps plus how far the current step is
  const overall = steps.length ? Math.min(1, (stepIndex + (stepIndex >= steps.length ? 0 : progress)) / steps.length) : 0;

  const showCamera = phase === "loading" || phase === "running" || phase === "submitting";

  return (
    <div className="space-y-4">
      {phase === "consent" && (
        <div className="space-y-4">
          {error && (
            <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
              {error}
            </p>
          )}
          {!consentInfo ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-3 gap-2 text-center text-[11px] leading-tight text-muted-foreground">
                <li className="rounded-xl border border-border bg-muted/40 p-2">
                  <Sun className="mx-auto mb-1 h-4 w-4 text-amber-500" />
                  Good, even light on your face
                </li>
                <li className="rounded-xl border border-border bg-muted/40 p-2">
                  <ScanFace className="mx-auto mb-1 h-4 w-4 text-[var(--iverifi-accent)]" />
                  No mask, cap or dark glasses
                </li>
                <li className="rounded-xl border border-border bg-muted/40 p-2">
                  <Smartphone className="mx-auto mb-1 h-4 w-4 text-sky-500" />
                  Hold the phone at eye level
                </li>
              </ul>
              <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--iverifi-accent)]" />
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{consentInfo.title}</p>
                  {consentInfo.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                <span>{consentInfo.checkbox}</span>
              </label>
              <Button variant="brand" className="h-11 w-full" disabled={!consent} onClick={() => void begin()}>
                <Camera className="h-4 w-4" /> Start
              </Button>
            </>
          )}
        </div>
      )}

      <div className={showCamera ? "relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-3xl bg-black shadow-lg ring-1 ring-black/10" : "hidden"}>
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
        {/* everything outside the oval is dimmed */}
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-[74%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]" style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }} />
        {/* the oval doubles as the progress ring for the whole check; it turns green when everything is captured */}
        <svg aria-hidden="true" viewBox="0 0 100 133.33" className="pointer-events-none absolute inset-0 h-full w-full">
          <path d={RING} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.6" />
          <path
            d={RING}
            fill="none"
            pathLength={100}
            stroke={overall >= 1 ? "#10b981" : "#2dd4bf"}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="100"
            strokeDashoffset={100 - Math.round(overall * 100)}
            style={{ transition: "stroke-dashoffset 250ms linear, stroke 300ms" }}
          />
        </svg>

        {phase === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 px-6 text-center text-sm text-white">
            <Loader2 className="h-7 w-7 animate-spin" />
            <p className="font-medium">Starting the camera…</p>
            <p className="text-xs text-white/70">The first time can take a few seconds.</p>
          </div>
        )}

        {phase === "running" && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent px-4 pb-4 pt-12 text-center text-white">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur motion-safe:animate-pulse">
              <ActionIcon action={steps[stepIndex]} />
            </div>
            <p aria-live="polite" className="text-base font-semibold leading-snug drop-shadow">
              {hint}
            </p>
          </div>
        )}

        {phase === "submitting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 px-6 text-center text-sm text-white">
            <Loader2 className="h-7 w-7 animate-spin" />
            <p className="font-medium">Checking your photo…</p>
            <p className="text-xs text-white/70">Please hold still, this takes a moment.</p>
          </div>
        )}
      </div>

      {phase === "running" && (
        <div className="space-y-2 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            Step {Math.min(stepIndex + 1, steps.length)} of {steps.length}
          </p>
          <ol className="flex items-center justify-center gap-2 text-xs">
            {steps.map((a, i) => (
              <li
                key={`${a}-${i}`}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors ${
                  i < stepIndex ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : i === stepIndex ? "border-[var(--iverifi-accent)] bg-[var(--iverifi-accent)]/10 text-foreground" : "border-border text-muted-foreground"
                }`}
              >
                {i < stepIndex && <Check className="h-3 w-3" />}
                {STEP_LABEL[a]}
              </li>
            ))}
          </ol>
        </div>
      )}

      {phase === "error" && (
        <div className="space-y-3">
          <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
          <Button variant="brand" className="h-11 w-full" onClick={() => void begin()}>
            <RotateCcw className="h-4 w-4" /> Try again
          </Button>
          {onLater && (
            <Button variant="outline" className="h-11 w-full" onClick={onLater}>
              Not now
            </Button>
          )}
        </div>
      )}

      {phase === "loading" && onLater && (
        <Button variant="ghost" className="h-9 w-full text-muted-foreground" onClick={onLater}>
          Not now
        </Button>
      )}

      {phase === "done" && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
            <Check className="h-9 w-9 text-emerald-500" />
          </div>
          <p className="text-base font-semibold text-foreground">Live photo saved</p>
          <p className="text-xs text-muted-foreground">It is now your profile picture.</p>
        </div>
      )}
    </div>
  );
}
