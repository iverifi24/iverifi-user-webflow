// The link that opens the Aadhaar App on the same phone. Run: npm run test:aadhaar-link
import test from "node:test";
import assert from "node:assert/strict";
import { aadhaarAppLink } from "../src/utils/aadhaarApp.ts";

const asBrowser = (ua: string) => Object.defineProperty(globalThis, "navigator", { value: { userAgent: ua }, configurable: true });
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const QR = "https://maadhaar.com/getIntent?value=123456789";

test("on Android the link names the Aadhaar app itself and falls back to the page, never to VSign's own address or the Play Store", () => {
  asBrowser(ANDROID);
  const link = aadhaarAppLink(QR)!;
  assert.match(link, /^intent:\/\/maadhaar\.com\/getIntent\?value=123456789#Intent;scheme=https;package=in\.gov\.uidai\.pehchaan;/);
  assert.ok(!link.includes("play.google.com"), "a request the app does not take does not send the person to the Play Store");
  Object.defineProperty(globalThis, "window", { value: { location: { href: "https://usertest.iverifi.io/a/atk_x" } }, configurable: true });
  assert.ok(aadhaarAppLink(QR)!.includes("S.browser_fallback_url=" + encodeURIComponent("https://usertest.iverifi.io/a/atk_x")), "it comes back to the page, which shows the QR");
  Object.defineProperty(globalThis, "window", { value: undefined, configurable: true });
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

import { aadhaarAppLaunchLink } from "../src/utils/aadhaarApp.ts";
test("the plain launch link opens the Aadhaar app by its package on Android only", () => {
  asBrowser(ANDROID);
  assert.match(aadhaarAppLaunchLink()!, /^intent:#Intent;action=android\.intent\.action\.MAIN;category=android\.intent\.category\.LAUNCHER;package=in\.gov\.uidai\.pehchaan;/);
  asBrowser(IPHONE);
  assert.equal(aadhaarAppLaunchLink(), null);
});
