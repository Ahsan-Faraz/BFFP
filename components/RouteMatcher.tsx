"use client";

import { useRef, useState } from "react";

// Type a request; watch Express check the e-commerce routes top to bottom,
// stop at the first match, and fill req.params / req.query.

type Route = { method: string; path: string; handler: string; status: number; catchAll?: boolean };

const ROUTES: Route[] = [
  { method: "GET", path: "/api/v1/products", handler: "listProducts", status: 200 },
  { method: "GET", path: "/api/v1/products/:productId", handler: "getProduct", status: 200 },
  { method: "GET", path: "/api/v1/products/:productId/reviews", handler: "getReviews", status: 200 },
  { method: "POST", path: "/api/v1/products", handler: "createProduct", status: 201 },
  { method: "PATCH", path: "/api/v1/products/:productId", handler: "updateProduct", status: 200 },
  { method: "DELETE", path: "/api/v1/products/:productId", handler: "deleteProduct", status: 204 },
  { method: "GET", path: "/api/v1/users/:userId/orders", handler: "getUserOrders", status: 200 },
  { method: "GET", path: "/api/v1/users/:userId/orders/:orderId", handler: "getUserOrder", status: 200 },
];
const CATCH_ALL: Route = { method: "USE", path: "*", handler: "404 handler", status: 404, catchAll: true };

const EXAMPLES: [string, string][] = [
  ["GET", "/api/v1/products?category=shoes&page=2&limit=20"],
  ["GET", "/api/v1/products/123"],
  ["GET", "/api/v1/products/123/reviews"],
  ["GET", "/api/v1/users/123/orders/456"],
  ["DELETE", "/api/v1/products/123"],
  ["DELETE", "/api/v1/products"],
  ["GET", "/api/v1/getUsers"],
];

// Express matching: method must match, static segments compare case-insensitively,
// ":name" captures one segment, a trailing slash is ignored, the query string is not part of matching.
function match(route: Route, method: string, pathname: string): Record<string, string> | null {
  if (route.catchAll) return {};
  if (route.method !== method) return null;
  const want = route.path.split("/").filter(Boolean);
  const got = pathname.split("/").filter(Boolean);
  if (want.length !== got.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(":")) params[want[i].slice(1)] = decodeURIComponent(got[i]);
    else if (want[i].toLowerCase() !== got[i].toLowerCase()) return null;
  }
  return params;
}

type Result = { index: number; params: Record<string, string>; query: Record<string, string>; route: Route };

export function RouteMatcher() {
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState(EXAMPLES[0][1]);
  const [catchAllFirst, setCatchAllFirst] = useState(false);
  const [checking, setChecking] = useState(-1);
  const [result, setResult] = useState<Result | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const routes = catchAllFirst ? [CATCH_ALL, ...ROUTES] : [...ROUTES, CATCH_ALL];

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setChecking(-1);
    setResult(null);
  };

  const send = () => {
    stop();
    const parsed = new URL(url.trim() || "/", "http://x");
    const index = routes.findIndex((r) => match(r, method, parsed.pathname) !== null);
    const route = routes[index];
    const outcome: Result = {
      index,
      route,
      params: match(route, method, parsed.pathname) ?? {},
      query: Object.fromEntries(parsed.searchParams),
    };
    for (let i = 0; i <= index; i++) timers.current.push(setTimeout(() => setChecking(i), i * 220));
    timers.current.push(setTimeout(() => setResult(outcome), index * 220 + 250));
  };

  const rowState = (i: number) => {
    if (result) return i < result.index ? "miss" : i === result.index ? "hit" : "idle";
    if (checking < 0) return "idle";
    return i < checking ? "miss" : i === checking ? "active" : "idle";
  };

  return (
    <div className="tool">
      <p className="tool-title">Route matcher</p>
      <div className="rm-input">
        <select value={method} onChange={(e) => { setMethod(e.target.value); stop(); }} aria-label="HTTP method">
          {["GET", "POST", "PATCH", "PUT", "DELETE"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <input
          value={url}
          onChange={(e) => { setUrl(e.target.value); stop(); }}
          spellCheck={false}
          aria-label="Request URL"
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button type="button" className="primary" onClick={send}>
          Send
        </button>
      </div>
      <div className="rm-examples">
        {EXAMPLES.map(([m, u]) => (
          <button key={m + u} type="button" onClick={() => { setMethod(m); setUrl(u); stop(); }}>
            {m} {u.replace("/api/v1", "")}
          </button>
        ))}
      </div>
      <label className="sim-check">
        <input type="checkbox" checked={catchAllFirst} onChange={(e) => { setCatchAllFirst(e.target.checked); stop(); }} />
        Mistake: put the catch-all at the top
      </label>

      <ol className="rm-routes">
        {routes.map((r, i) => (
          <li key={r.method + r.path} className={`rm-${rowState(i)}`}>
            <code>
              {r.catchAll ? "app.use((req, res) => res.status(404)…)" : `app.${r.method.toLowerCase()}('${r.path}', ${r.handler})`}
            </code>
            <span className="rm-mark">{rowState(i) === "miss" ? "✗" : rowState(i) === "hit" ? "✓ match" : ""}</span>
          </li>
        ))}
      </ol>

      {result ? (
        <div className="rm-result">
          <pre className="sim-code">
            {`req.params = ${JSON.stringify(result.params)}\nreq.query  = ${JSON.stringify(result.query)}\n\n${
              result.route.catchAll
                ? `HTTP/1.1 404 Not Found\n\n{ "error": "Route not found" }`
                : `→ ${result.route.handler}(req, res)\nHTTP/1.1 ${result.route.status} ${
                    { 200: "OK", 201: "Created", 204: "No Content" }[result.route.status]
                  }`
            }`}
          </pre>
          <p className={`verdict ${result.route.catchAll ? "verdict-bad" : "verdict-ok"}`}>
            {result.route.catchAll
              ? catchAllFirst
                ? "The catch-all sits first, so it swallows every request before the real routes get a chance."
                : "No route matched this method + path, so the catch-all at the bottom answered 404."
              : `Matched route #${result.index + 1}. Express stops at the first match.`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
