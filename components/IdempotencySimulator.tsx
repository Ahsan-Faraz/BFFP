"use client";

import { useState } from "react";

// Send a request, pretend the response was lost, retry, and watch the server
// state: PUT converges, POST duplicates, PATCH "+$10" keeps adding.

type Kind = "put" | "post" | "patch";

const CARDS: { kind: Kind; request: string; body: string; idempotent: boolean }[] = [
  { kind: "put", request: "PUT /users/123", body: '{ "name": "Ali Khan" }', idempotent: true },
  { kind: "post", request: "POST /orders", body: '{ "item": "Laptop" }', idempotent: false },
  { kind: "patch", request: "PATCH /accounts/1", body: '{ "add": 10 }', idempotent: false },
];

export function IdempotencySimulator() {
  const [sent, setSent] = useState<Record<Kind, number>>({ put: 0, post: 0, patch: 0 });
  const send = (k: Kind) => setSent((s) => ({ ...s, [k]: s[k] + 1 }));

  return (
    <div className="tool">
      <p className="tool-title">Idempotency simulator</p>
      <p className="tool-label">
        Send each request, then press “Retry” as if the connection dropped before the response arrived. Watch what
        the server ends up with.
      </p>
      <div className="idem-grid">
        {CARDS.map((c) => (
          <IdemCard key={c.kind} card={c} count={sent[c.kind]} onSend={() => send(c.kind)} />
        ))}
      </div>
      <div className="tool-actions">
        <button type="button" onClick={() => setSent({ put: 0, post: 0, patch: 0 })}>
          Reset
        </button>
      </div>
    </div>
  );
}

function IdemCard({ card, count, onSend }: { card: (typeof CARDS)[number]; count: number; onSend: () => void }) {
  const bad = !card.idempotent && count > 1;
  return (
    <div className={`idem-card ${bad ? "is-bad" : count > 1 ? "is-ok" : ""}`}>
      <div className="idem-head">
        <code>{card.request}</code>
        <span className={card.idempotent ? "idem-tag ok" : "idem-tag bad"}>
          {card.idempotent ? "idempotent" : "not idempotent"}
        </span>
      </div>
      <code className="idem-body">{card.body}</code>

      <button type="button" className={count === 0 ? "primary" : undefined} onClick={onSend}>
        {count === 0 ? "Send" : "Retry (response lost)"}
      </button>
      <p className="idem-sent">Requests received by server: {count}</p>

      <p className="idem-state-label">Server state</p>
      <pre className="idem-state">{state(card.kind, count)}</pre>
      <p className={`idem-verdict ${bad ? "bad" : ""}`}>{verdict(card.kind, count)}</p>
    </div>
  );
}

function state(kind: Kind, n: number) {
  if (kind === "put") {
    return `users
id  | name
123 | ${n === 0 ? "Ali" : "Ali Khan"}`;
  }
  if (kind === "post") {
    const rows = Array.from({ length: n }, (_, i) => `${i + 1}   | Laptop`).join("\n");
    return `orders\nid  | item\n${rows || "(empty)"}`;
  }
  return `accounts\nid | balance\n1  | $${100 + n * 10}`;
}

function verdict(kind: Kind, n: number) {
  if (n === 0) return "Nothing sent yet.";
  if (kind === "put") return n === 1 ? "Name replaced." : `Sent ${n}× and still one user named Ali Khan. Same final state.`;
  if (kind === "post") return n === 1 ? "Order created." : `${n} orders for one click: duplicates!`;
  return n === 1 ? "$100 → $110." : `Each retry adds again: $${100 + n * 10} instead of $110.`;
}
