/**
 * Turning the live camera picture into JPEG data for the server. All of it happens on the phone, and every function returns plain
 * base64 (no "data:" prefix), which is what the API expects.
 *
 *  - step frames: small (the server only needs to see a face and its head angle)
 *  - photo frames: the FULL quality frame (up to 1280 px, the size the face engine uses). The face template is made from these,
 *    BEFORE anything is compressed for storage.
 *  - the crop: just the face with a margin, resized and compressed. This is the only picture that is kept.
 * The camera image is never mirrored here (the preview is mirrored by CSS only), so left and right match the liveness logic.
 */

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function toBase64(canvas: HTMLCanvasElement, quality: number): string {
  const url = canvas.toDataURL("image/jpeg", quality);
  return url.slice(url.indexOf(",") + 1);
}

function newCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read the camera picture.");
  return { canvas, ctx };
}

/** the whole frame, scaled down so its longest side is at most `maxSide` */
export function grabJpeg(video: HTMLVideoElement, opts: { maxSide: number; quality: number }): string {
  const w = video.videoWidth;
  const h = video.videoHeight;
  const scale = Math.min(1, opts.maxSide / Math.max(w, h));
  const { canvas, ctx } = newCanvas(w * scale, h * scale);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return toBase64(canvas, opts.quality);
}

/** a square around the face (`box` as fractions of the frame) with room around it, resized to at most `maxSide` */
export function cropJpeg(video: HTMLVideoElement, box: Box, opts: { scale: number; maxSide: number; quality: number }): string {
  const W = video.videoWidth;
  const H = video.videoHeight;
  const cx = ((box.x0 + box.x1) / 2) * W;
  const cy = ((box.y0 + box.y1) / 2) * H;
  const faceSide = Math.max((box.x1 - box.x0) * W, (box.y1 - box.y0) * H);
  const side = Math.min(Math.min(W, H), faceSide * opts.scale);
  const sx = Math.min(Math.max(0, cx - side / 2), W - side);
  const sy = Math.min(Math.max(0, cy - side / 2), H - side);
  const out = Math.min(opts.maxSide, side);
  const { canvas, ctx } = newCanvas(out, out);
  ctx.drawImage(video, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
  return toBase64(canvas, opts.quality);
}
