// Copies the MediaPipe WASM runtime from node_modules into public/mediapipe/<version>/wasm so the app serves it from its own origin
// (no third-party CDN at runtime). Runs before `dev` and `build`. The files are large (about 26 MB) and are not committed.
//
// The folder name carries the library version, and vercel.json lets browsers keep everything under /mediapipe/ for a year, which is only
// safe because the files in a versioned folder never change. So this script REFUSES to run if the installed library is not the version
// the app expects: upgrading means moving the model into a new folder, changing MEDIAPIPE_BASE in src/components/live-capture.tsx and
// the version below, together.
//
// Only the two variants FilesetResolver.forVisionTasks() loads are copied: the SIMD build and the no-SIMD fallback. The "module"
// variants are for a mode the app does not use.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_VERSION = "1.1.1";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "node_modules", "@mediapipe", "tasks-vision");
const from = join(pkgDir, "wasm");
const to = join(root, "public", "mediapipe", EXPECTED_VERSION, "wasm");
const FILES = ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"];

if (!existsSync(join(pkgDir, "package.json"))) {
  console.error("copy-mediapipe: @mediapipe/tasks-vision is not installed. Run `npm install` first.");
  process.exit(1);
}
const installed = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")).version;
if (installed !== EXPECTED_VERSION) {
  console.error(
    `copy-mediapipe: @mediapipe/tasks-vision ${installed} is installed but the app expects ${EXPECTED_VERSION}.\n` +
      "Update EXPECTED_VERSION here, the folder public/mediapipe/<version>/ and MEDIAPIPE_BASE in src/components/live-capture.tsx together."
  );
  process.exit(1);
}
if (!FILES.every((f) => existsSync(join(from, f)))) {
  console.error("copy-mediapipe: the library has a different file layout than expected.");
  process.exit(1);
}
rmSync(to, { recursive: true, force: true });
mkdirSync(to, { recursive: true });
for (const f of FILES) copyFileSync(join(from, f), join(to, f));
console.log(`copy-mediapipe: ${FILES.length} WASM files copied to public/mediapipe/${EXPECTED_VERSION}/wasm`);
