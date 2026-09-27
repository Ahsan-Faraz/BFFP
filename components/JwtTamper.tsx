"use client";

import { useEffect, useState } from "react";

// Shows why a readable payload is still safe from edits: the server recomputes
// HMAC-SHA256(header.payload, secret) and compares it to the signature.
// Uses the browser's built-in WebCrypto; nothing leaves the page.

const SERVER_SECRET = "server-secret-9f3k";
const HEADER = { alg: "HS256", typ: "JWT" };
const ORIGINAL = { sub: "42", role: "user", exp: 1799999999 };

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const encodePart = (obj: unknown) => b64url(enc.encode(JSON.stringify(obj)));

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data))));
}

type Result = { sentSig: string; expectedSig: string; payloadPart: string; changed: boolean };

export function JwtTamper() {
  const [payload, setPayload] = useState(ORIGINAL);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const headerPart = encodePart(HEADER);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const originalSig = await hmac(SERVER_SECRET, `${headerPart}.${encodePart(ORIGINAL)}`);
      const payloadPart = encodePart(payload);
      // the attacker either keeps the original signature, or re-signs with a guessed secret
      const sentSig = guess ? await hmac(guess, `${headerPart}.${payloadPart}`) : originalSig;
      const expectedSig = await hmac(SERVER_SECRET, `${headerPart}.${payloadPart}`);
      if (!cancelled) setResult({ sentSig, expectedSig, payloadPart, changed: payload.role !== ORIGINAL.role });
    })();
    return () => {
      cancelled = true;
    };
  }, [payload, guess, headerPart]);

  const valid = result ? result.sentSig === result.expectedSig : null;

  return (
    <div className="tool">
      <p className="tool-title">Try to tamper with a JWT</p>
      <p className="tool-label">
        The server signed this token for Ali (role: user). You&apos;re the attacker: you can read and edit the payload,
        but you don&apos;t know the server&apos;s secret.
      </p>

      <div className="seg" role="group" aria-label="Role in payload">
        {(["user", "moderator", "admin"] as const).map((r) => (
          <button key={r} type="button" aria-pressed={payload.role === r} onClick={() => setPayload({ ...ORIGINAL, role: r })}>
            role: {r}
          </button>
        ))}
      </div>

      <label className="tool-label" htmlFor="secret-guess" style={{ marginTop: 12 }}>
        Re-sign with a guessed secret (leave empty to keep the original signature)
      </label>
      <input
        id="secret-guess"
        className="tool-input"
        value={guess}
        onChange={(e) => setGuess(e.target.value)}
        placeholder="e.g. secret123"
        spellCheck={false}
      />

      {result ? (
        <>
          <p className="jwt-token" aria-label="Token sent to the server">
            <span className="tok-h">{headerPart}</span>.
            <span className={result.changed ? "tok-p tok-changed" : "tok-p"}>{result.payloadPart}</span>.
            <span className="tok-s">{result.sentSig}</span>
          </p>
          <div className="tamper-check">
            <div>
              <span className="jwt-part-name">Signature in token</span>
              <code>{result.sentSig.slice(0, 22)}…</code>
            </div>
            <div>
              <span className="jwt-part-name">Server recomputes with its secret</span>
              <code>{result.expectedSig.slice(0, 22)}…</code>
            </div>
          </div>
          <p className={`verdict ${valid ? "verdict-ok" : "verdict-bad"}`} aria-live="polite">
            {valid
              ? result.changed
                ? "✓ Valid: you guessed the secret, so you can mint any token. This is why the secret must be strong and never shared."
                : "✓ Signatures match: 200 OK, the server trusts role: user."
              : guess
                ? "✗ Wrong secret: the signature doesn't match, so jwt.verify throws → 401."
                : "✗ Signatures don't match: jwt.verify throws → 401. Changing even one character of the payload breaks the signature."}
          </p>
        </>
      ) : null}
    </div>
  );
}
