"use client";

import { useState, useSyncExternalStore } from "react";

// Splits a JWT on "." and base64url-decodes header + payload, entirely in the
// browser. It never verifies the signature — that's the point of the lesson:
// decoding needs no key, verifying does.

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxNzk5OTk5OTk5fQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

type Part = { json: string; data: Record<string, unknown> } | { error: string };

function decodePart(segment: string): Part {
  try {
    const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    const text = new TextDecoder().decode(bytes);
    const data = JSON.parse(text) as Record<string, unknown>;
    return { json: JSON.stringify(data, null, 2), data };
  } catch {
    return { error: "Not valid base64url-encoded JSON" };
  }
}

// Current minute, read only in the browser (null during prerender) so the
// "expired" label can't mismatch between build time and view time.
const noSubscribe = () => () => {};
function useNowMinute() {
  return useSyncExternalStore(noSubscribe, () => Math.floor(Date.now() / 60000), () => null);
}

function formatTime(value: unknown) {
  if (typeof value !== "number") return null;
  return new Date(value * 1000).toISOString().replace("T", " ").replace(".000Z", " UTC");
}

export function JwtDecoder() {
  const [token, setToken] = useState(SAMPLE);
  const nowMinute = useNowMinute();
  const parts = token.trim().split(".");
  const valid = parts.length === 3;
  const header = valid ? decodePart(parts[0]) : null;
  const payload = valid ? decodePart(parts[1]) : null;
  const payloadData = payload && "data" in payload ? payload.data : null;
  const headerData = header && "data" in header ? header.data : null;
  const exp = payloadData?.exp;
  const alg = headerData?.alg;

  return (
    <div className="tool">
      <p className="tool-title">JWT decoder</p>
      <label htmlFor="jwt-input" className="tool-label">
        Paste a JWT (decoded locally in your browser, nothing is sent anywhere)
      </label>
      <textarea
        id="jwt-input"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        rows={4}
        spellCheck={false}
        className="tool-input"
      />
      <div className="tool-actions">
        <button type="button" onClick={() => setToken(SAMPLE)}>
          Load example from notes
        </button>
        <button type="button" onClick={() => setToken("")}>
          Clear
        </button>
      </div>

      {token.trim() === "" ? null : !valid ? (
        <p className="tool-error">
          A JWS has exactly three dot-separated parts (header.payload.signature). Found {parts.length}.
        </p>
      ) : (
        <>
          <p className="tool-warning">
            ⚠ Anyone holding this token can read the payload below. No key was needed to decode it. It is
            encoded, not encrypted.
          </p>
          <p className="jwt-token" aria-label="Token split into its three parts">
            <span className="tok-h">{parts[0]}</span>.<span className="tok-p">{parts[1]}</span>.
            <span className="tok-s">{parts[2]}</span>
          </p>
          <div className="jwt-grid">
            <JwtPart name="Header" part={header!} tone="h" />
            <JwtPart name="Payload" part={payload!} tone="p" />
          </div>
          <div className="jwt-sig">
            <span className="jwt-part-name">Signature</span>
            <code>{parts[2] || "(empty)"}</code>
            <p>
              Not decoded: it&apos;s raw bytes from{" "}
              {typeof alg === "string" && alg.startsWith("HS")
                ? "an HMAC over header.payload with a shared secret"
                : "signing header.payload"}
              . This tool does <strong>not</strong> verify it. Decoding ≠ verifying.
            </p>
          </div>
          <ul className="jwt-facts">
            {typeof alg === "string" ? (
              <li>
                <strong>alg: {alg}</strong>
                {alg === "none"
                  ? " — unsigned token. A server must never accept this; pin allowed algorithms when verifying."
                  : alg.startsWith("HS")
                    ? " — symmetric: whoever can verify can also sign."
                    : " — asymmetric: only the private-key holder can sign; anyone with the public key can verify."}
              </li>
            ) : null}
            {formatTime(exp) ? (
              <li>
                <strong>exp:</strong> {formatTime(exp)}
                {nowMinute !== null ? ((exp as number) / 60 < nowMinute ? " (expired)" : " (not yet expired)") : null}
              </li>
            ) : null}
            {formatTime(payloadData?.iat) ? (
              <li>
                <strong>iat:</strong> {formatTime(payloadData?.iat)}
              </li>
            ) : null}
          </ul>
        </>
      )}
    </div>
  );
}

function JwtPart({ name, part, tone }: { name: string; part: Part; tone: "h" | "p" }) {
  return (
    <div className={`jwt-part jwt-${tone}`}>
      <span className="jwt-part-name">{name}</span>
      {"error" in part ? <p className="tool-error">{part.error}</p> : <pre>{part.json}</pre>}
    </div>
  );
}
