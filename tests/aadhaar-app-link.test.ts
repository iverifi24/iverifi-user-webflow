// Where a person installs the Aadhaar App (the QR is the way to share; there is no link that opens the app). Run: npm run test:aadhaar-link
import test from "node:test";
import assert from "node:assert/strict";
import { aadhaarAppStoreLink } from "../src/utils/aadhaarApp.ts";

const asBrowser = (ua: string) => Object.defineProperty(globalThis, "navigator", { value: { userAgent: ua }, configurable: true });
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36";

test("on Android the install link is the Aadhaar App's Play Store page, and never VSign's own address", () => {
  asBrowser(ANDROID);
  const link = aadhaarAppStoreLink()!;
  assert.equal(link, "https://play.google.com/store/apps/details?id=in.gov.uidai.pehchaan");
  assert.ok(!link.includes("maadhaar.com"));
});

test("where there is no verified address (iPhone, computer) there is no link, and the screen says what to search for", () => {
  asBrowser(IPHONE);
  assert.equal(aadhaarAppStoreLink(), null);
  asBrowser(DESKTOP);
  assert.equal(aadhaarAppStoreLink(), null);
});
