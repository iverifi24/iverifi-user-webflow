// The link that opens the Aadhaar App on the same phone. Run: npm run test:aadhaar-link
import test from "node:test";
import assert from "node:assert/strict";
import { aadhaarAppLink } from "../src/utils/aadhaarApp.ts";

const asBrowser = (ua: string) => Object.defineProperty(globalThis, "navigator", { value: { userAgent: ua }, configurable: true });
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const QR = "https://maadhaar.com/getIntent?value=123456789";

test("on Android the link names the Aadhaar app itself and falls back to its Play Store page, never to VSign's own address", () => {
  asBrowser(ANDROID);
  const link = aadhaarAppLink(QR)!;
  assert.match(link, /^intent:\/\/maadhaar\.com\/getIntent\?value=123456789#Intent;scheme=https;package=in\.gov\.uidai\.pehchaan;/);
  assert.ok(link.includes("S.browser_fallback_url=" + encodeURIComponent("https://play.google.com/store/apps/details?id=in.gov.uidai.pehchaan")));
  assert.ok(!link.startsWith("https://"), "the parked domain is never navigated to");
});

test("off Android, or for an address that is not https, there is no link: the QR is the way in", () => {
  asBrowser(IPHONE);
  assert.equal(aadhaarAppLink(QR), null);
  asBrowser(ANDROID);
  assert.equal(aadhaarAppLink("http://maadhaar.com/getIntent?value=1"), null);
  assert.equal(aadhaarAppLink("not a url"), null);
  assert.equal(aadhaarAppLink(null), null);
});
