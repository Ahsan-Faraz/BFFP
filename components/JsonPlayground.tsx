"use client";

import { useState } from "react";

// Runs your text through JSON.parse, exactly like express.json() would.

const EXAMPLES: [string, string][] = [
  ["Object", '{\n  "name": "Ali",\n  "age": 25,\n  "active": true,\n  "skills": ["Node", "Postgres"],\n  "address": { "city": "Rawalpindi", "country": "Pakistan" }\n}'],
  ["Array at top level", '[1, 2, 3]'],
  ["Just a string", '"hello"'],
  ["Just a number", "42"],
  ["null", "null"],
  ["Unquoted key", '{ name: "Ali" }'],
  ["Trailing comma", '{ "age": 25, }'],
  ["Comment", '{ "age": 25 // years\n}'],
  ["Single quotes", "{ 'name': 'Ali' }"],
];

function describe(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

export function JsonPlayground() {
  const [text, setText] = useState(EXAMPLES[0][1]);

  let result: { ok: true; type: string; value: unknown } | { ok: false; error: string };
  try {
    const value: unknown = JSON.parse(text);
    result = { ok: true, type: describe(value), value };
  } catch (e) {
    result = { ok: false, error: (e as Error).message };
  }

  return (
    <div className="tool">
      <p className="tool-title">JSON playground</p>
      <div className="rm-examples">
        {EXAMPLES.map(([label, value]) => (
          <button key={label} type="button" aria-pressed={text === value} onClick={() => setText(value)}>
            {label}
          </button>
        ))}
      </div>
      <label htmlFor="json-input" className="tool-label">
        Edit the text. It goes through <code>JSON.parse()</code> on every keystroke.
      </label>
      <textarea
        id="json-input"
        className="tool-input"
        rows={7}
        value={text}
        spellCheck={false}
        onChange={(e) => setText(e.target.value)}
      />
      {result.ok ? (
        <>
          <p className="verdict verdict-ok">✓ Valid JSON. Top-level value: {result.type}</p>
          <pre className="sim-code">
            {`JSON.parse(text)   // typeof → "${typeof result.value}"\n${JSON.stringify(result.value, null, 2)}`}
          </pre>
        </>
      ) : (
        <>
          <p className="verdict verdict-bad">✗ Invalid JSON. express.json() would reply 400 Bad Request.</p>
          <pre className="sim-code">{`SyntaxError: ${result.error}`}</pre>
        </>
      )}
    </div>
  );
}
