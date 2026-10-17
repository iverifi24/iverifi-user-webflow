face_landmarker.task - Google MediaPipe Face Landmarker (float16)
Source : https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
SHA-256: 64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff  (the same file the iVerifi face engine pins)
Licence: Apache-2.0 (Google MediaPipe)
Used in the browser for the live-photo liveness check (blink / head turn). It runs on the phone; no image leaves the device for it.

This folder is VERSIONED (1.1.1 = @mediapipe/tasks-vision): vercel.json caches /mediapipe/* for a year, so nothing in it may change.
wasm/ is NOT committed: scripts/copy-mediapipe.mjs copies it from node_modules/@mediapipe/tasks-vision before dev and build (and refuses to run on another version).
