"use client";

import { useRef, useState } from "react";

// Sends a pretend request through authenticate -> authorize -> handler and
// lights up each stage, so you can see exactly where 401 / 403 / 500 come from.

type Role = "user" | "moderator" | "admin";
type TokenKind = "valid" | "missing" | "tampered";
type StageState = "idle" | "active" | "pass" | "fail";

const ROUTES = [
  { id: "list", method: "GET", path: "/notes", roles: ["user", "moderator", "admin"], handler: "getNotes", ok: 200 },
  { id: "delete", method: "DELETE", path: "/notes/:id", roles: ["admin", "moderator"], handler: "deleteNote", ok: 204 },
  { id: "dead", method: "GET", path: "/admin/dead-zone", roles: ["admin"], handler: "getDeadZoneNotes", ok: 200 },
] as const;

const STAGES = ["Request", "authenticate", "authorize", "handler"] as const;

type Outcome = { failAt: number; status: number; why: string; bad: boolean };

function evaluate(token: TokenKind, role: Role, routeId: string, tryCatch: boolean): Outcome {
  const route = ROUTES.find((r) => r.id === routeId)!;
  if (token !== "valid") {
    const reason = token === "missing" ? "No token was sent" : "The signature doesn't match";
    return tryCatch
      ? { failAt: 1, status: 401, why: `${reason}: jwt.verify throws, the catch returns 401 authentication failed.`, bad: true }
      : { failAt: 1, status: 500, why: `${reason}: jwt.verify throws and nothing catches it, so Express answers 500. That's the bug in the original notes.`, bad: true };
  }
  if (!(route.roles as readonly string[]).includes(role)) {
    return { failAt: 2, status: 403, why: `Authenticated as ${role}, but ${route.path} only allows: ${route.roles.join(", ")}.`, bad: true };
  }
  return { failAt: 4, status: route.ok, why: `Token valid, role ${role} is allowed, so ${route.handler} runs.`, bad: false };
}

export function RbacSimulator() {
  const [token, setToken] = useState<TokenKind>("valid");
  const [role, setRole] = useState<Role>("user");
  const [routeId, setRouteId] = useState<string>("delete");
  const [tryCatch, setTryCatch] = useState(true);
  const [phase, setPhase] = useState(-1); // index of the stage being animated; 4 = done
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const route = ROUTES.find((r) => r.id === routeId)!;

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase(-1);
    setOutcome(null);
  };

  const send = () => {
    reset();
    const result = evaluate(token, role, routeId, tryCatch);
    const last = Math.min(result.failAt, 3);
    for (let i = 0; i <= last; i++) timers.current.push(setTimeout(() => setPhase(i), i * 550));
    timers.current.push(
      setTimeout(() => {
        setPhase(4);
        setOutcome(result);
      }, (last + 1) * 550),
    );
  };

  const stageState = (i: number): StageState => {
    if (phase < 0) return "idle";
    if (phase < 4) return i < phase ? "pass" : i === phase ? "active" : "idle";
    if (!outcome) return "idle";
    if (i < outcome.failAt) return "pass";
    return i === outcome.failAt ? "fail" : "idle";
  };

  return (
    <div className="tool">
      <p className="tool-title">RBAC request simulator</p>

      <div className="sim-controls">
        <Choice label="Token" value={token} onChange={(v) => { setToken(v); reset(); }} options={[["valid", "Valid JWT"], ["missing", "No token"], ["tampered", "Tampered"]]} />
        <Choice label="Role in token" value={role} onChange={(v) => { setRole(v); reset(); }} disabled={token !== "valid"} options={[["user", "user"], ["moderator", "moderator"], ["admin", "admin"]]} />
        <Choice
          label="Route"
          value={routeId}
          onChange={(v) => { setRouteId(v); reset(); }}
          options={ROUTES.map((r) => [r.id, `${r.method} ${r.path}`] as [string, string])}
        />
        <label className="sim-check">
          <input type="checkbox" checked={tryCatch} onChange={(e) => { setTryCatch(e.target.checked); reset(); }} />
          try/catch around <code>jwt.verify</code>
        </label>
      </div>

      <pre className="sim-code">
        {`app.${route.method.toLowerCase()}('${route.path}', authenticate, authorize(${route.roles
          .map((r) => `'${r}'`)
          .join(", ")}), ${route.handler})`}
      </pre>

      <div className="pipeline">
        {STAGES.map((name, i) => (
          <div key={name} className="pipeline-item">
            <div className={`stage stage-${stageState(i)}`}>
              <span className="stage-name">{name}</span>
              <span className="stage-sub">
                {i === 0
                  ? `${route.method} ${route.path}`
                  : i === 1
                    ? token === "valid" ? "verify JWT" : token === "missing" ? "no token" : "bad signature"
                    : i === 2
                      ? `role: ${token === "valid" ? role : "?"}`
                      : route.handler}
              </span>
            </div>
            <span className="pipeline-arrow" aria-hidden="true">→</span>
          </div>
        ))}
        <div className={`status ${outcome ? (outcome.bad ? "status-bad" : "status-ok") : ""}`}>
          {outcome ? outcome.status : "…"}
        </div>
      </div>

      <p className="sim-why" aria-live="polite">
        {outcome ? outcome.why : "Pick a token, role and route, then send the request."}
      </p>
      <div className="tool-actions">
        <button type="button" className="primary" onClick={send}>
          Send request
        </button>
      </div>
    </div>
  );
}

function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [string, string][];
  disabled?: boolean;
}) {
  return (
    <fieldset className="choice" disabled={disabled}>
      <legend>{label}</legend>
      <div className="seg">
        {options.map(([v, text]) => (
          <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v as T)}>
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
