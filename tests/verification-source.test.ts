// Which way each document is verified follows the server's routes. Run: npm run test:routes
import test from "node:test";
import assert from "node:assert/strict";
import { methodsFor, providerLabel, verifiedViaLabel } from "../src/utils/verificationSource.ts";

const routes = { AADHAAR_CARD: ["ovse", "kwik"], PAN_CARD: ["vsign", "digilocker", "kwik"], PASSPORT: ["vsign", "kwik"], VOTER_ID: ["vsign"] } as never;

test("Aadhaar is shared from the Aadhaar App first when the server offers it", () => {
  assert.deepEqual(methodsFor(routes, "AADHAAR_CARD"), ["ovse", "kwik"]);
  assert.equal(providerLabel(methodsFor(routes, "AADHAAR_CARD"), "AADHAAR_CARD"), "Aadhaar App");
});

test("a family member's Aadhaar never uses the account holder's Aadhaar App", () => {
  assert.deepEqual(methodsFor(routes, "FAMILY_AADHAAR"), ["kwik"]);
});

test("PAN, passport and voter ID are checked by number first, and the vendor is never named", () => {
  assert.equal(methodsFor(routes, "PAN_CARD")[0], "vsign");
  assert.equal(methodsFor(routes, "VOTER_ID")[0], "vsign");
  assert.equal(providerLabel(methodsFor(routes, "PASSPORT"), "PASSPORT"), "iVerifi");
  assert.equal(verifiedViaLabel("VSign", "PASSPORT"), "iVerifi");
  assert.equal(verifiedViaLabel("Aadhaar App", "AADHAAR_CARD"), "Aadhaar App");
});

test("before the routes load the app falls back to the camera scan, so nobody is stuck", () => {
  assert.deepEqual(methodsFor(undefined, "AADHAAR_CARD"), ["kwik"]);
});
