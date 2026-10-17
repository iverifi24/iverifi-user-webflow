// Copies the MediaPipe WASM runtime from node_modules into public/mediapipe/wasm so the app serves it from its own origin
// (no third-party CDN at runtime). Runs before `dev` and `build`. The files are large (about 26 MB) and are not committed.
// Only the two variants FilesetResolver.forVisionTasks() loads are copied: the SIMD build and the no-SIMD fallback. The "module"
// variants are for a mode the app does not use.
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const to = join(root, "public", "mediapipe", "wasm");
const FILES = ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"];

if (!FILES.every((f) => existsSync(join(from, f)))) {
  console.error("copy-mediapipe: @mediapipe/tasks-vision is missing or has a different layout. Run `npm install` first.");
  process.exit(1);
}
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
for (const f of FILES) copyFileSync(join(from, f), join(to, f));
console.log(`copy-mediapipe: ${FILES.length} WASM files copied to public/mediapipe/wasm`);
