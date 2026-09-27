"use client";

import { useState } from "react";

// Toggle cookie attributes and see, for each kind of request, whether the
// browser attaches sessionId=abc123 to it.

type SameSite = "None" | "Lax" | "Strict";

const SCENARIOS = [
  { id: "same", from: "notes.app", what: "You click a link inside notes.app", method: "GET" },
  { id: "link", from: "other-site.com", what: "You click a link to notes.app from another site", method: "GET" },
  { id: "form", from: "evil.com", what: "Hidden form auto-submits to notes.app/notes/7/delete", method: "POST", csrf: true },
  { id: "fetch", from: "evil.com", what: "Script calls fetch('https://notes.app/api/notes')", method: "GET", csrf: true },
  { id: "http", from: "notes.app", what: "Request over plain http:// (no TLS)", method: "GET" },
] as const;

function isSent(id: string, sameSite: SameSite, secure: boolean): { sent: boolean; why: string } {
  if (sameSite === "None" && !secure) return { sent: false, why: "Browsers reject SameSite=None without Secure" };
  switch (id) {
    case "same":
      return { sent: true, why: "Same-site request" };
    case "link":
      return sameSite === "Strict"
        ? { sent: false, why: "Strict: never on cross-site requests" }
        : { sent: true, why: "Top-level link click (GET)" };
    case "form":
      return sameSite === "None"
        ? { sent: true, why: "Cross-site POST carries the cookie: CSRF!" }
        : { sent: false, why: `${sameSite}: no cross-site POST` };
    case "fetch":
      return sameSite === "None"
        ? { sent: true, why: "Background cross-site request carries the cookie" }
        : { sent: false, why: `${sameSite}: no cross-site background requests` };
    default:
      return secure ? { sent: false, why: "Secure: HTTPS only" } : { sent: true, why: "Sent in plain text on the network" };
  }
}

export function CookiePlayground() {
  const [sameSite, setSameSite] = useState<SameSite>("Lax");
  const [secure, setSecure] = useState(true);
  const [httpOnly, setHttpOnly] = useState(true);
  const settings = `${sameSite}-${secure}`;

  return (
    <div className="tool">
      <p className="tool-title">Cookie playground</p>
      <code className="cookie-header">
        Set-Cookie: sessionId=abc123; SameSite={sameSite}
        {secure ? "; Secure" : ""}
        {httpOnly ? "; HttpOnly" : ""}
      </code>

      <div className="sim-controls">
        <fieldset className="choice">
          <legend>SameSite</legend>
          <div className="seg">
            {(["None", "Lax", "Strict"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={sameSite === v} onClick={() => setSameSite(v)}>
                {v}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="sim-check">
          <input type="checkbox" checked={secure} onChange={(e) => setSecure(e.target.checked)} /> Secure
        </label>
        <label className="sim-check">
          <input type="checkbox" checked={httpOnly} onChange={(e) => setHttpOnly(e.target.checked)} /> HttpOnly
        </label>
      </div>

      <ul className="cookie-rows">
        {SCENARIOS.map((s) => {
          const r = isSent(s.id, sameSite, secure);
          const danger = r.sent && "csrf" in s;
          return (
            <li key={s.id} className={danger ? "is-danger" : undefined}>
              <div className="cookie-what">
                <span className="cookie-method">{s.method}</span> {s.what}
              </div>
              <div className="cookie-lane">
                <span className="cookie-origin">{s.from}</span>
                <span className="cookie-track">
                  {/* key restarts the slide animation whenever the settings change */}
                  <span key={settings} className={r.sent ? "cookie-chip is-sent" : "cookie-chip is-blocked"}>
                    {r.sent ? "🍪 sent" : "✗ blocked"}
                  </span>
                </span>
                <span className="cookie-origin">notes.app</span>
              </div>
              <div className="cookie-why">{r.why}</div>
            </li>
          );
        })}
      </ul>

      <div className="xss">
        <p className="tool-label">An XSS script injected into notes.app runs:</p>
        <pre className="sim-code">{`> document.cookie\n${httpOnly ? '""' : '"sessionId=abc123"'}`}</pre>
        <p className={`verdict ${httpOnly ? "verdict-ok" : "verdict-bad"}`}>
          {httpOnly
            ? "✓ HttpOnly: JavaScript can't read the cookie, so the script can't steal it."
            : "✗ Without HttpOnly the script reads the session ID and can send it to the attacker."}
        </p>
      </div>
    </div>
  );
}
