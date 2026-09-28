"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";

// A step-through sequence diagram in plain SVG. Each step is one arrow between
// two lanes (or a note on one lane when from === to), revealed one at a time.
// A dot travels along the current arrow and lanes that change state flash.
// `debug` shows what you'd actually see on the wire for the current step
// (HTTP request/response, Redis command, log line): one string per step, or
// for side-by-side panels one array per panel.
//
// Single diagram: `actors` + `steps` (each step has its own caption).
// Side-by-side: `panels` + `captions`; one control drives every panel, and a
// panel can sit a step out with `null`.
// Alternatives: `scenarios` = [{ label, ...any of the above }] adds a toggle.

export type Actor = { id: string; label: string; sub?: string };
export type Step = {
  from: string;
  to: string;
  label: string;
  caption?: string;
  dashed?: boolean; // responses / redirects
  tone?: "bad";
  state?: Record<string, string>; // actorId -> text ("\n" for new lines)
};
export type Panel = { title?: string; actors: Actor[]; steps: (Step | null)[] };
type Debug = (string | null)[];
type Config = { actors?: Actor[]; steps?: Step[]; panels?: Panel[]; captions?: string[]; debug?: Debug | Debug[] };
type Scenario = Config & { label: string };
type Props = Config & { title: string; scenarios?: Scenario[]; colWidth?: number };

const ROW_H = 32;
const TOP = 56;
const PLAY_MS = 2200;

export function StepDiagram({ title, scenarios, colWidth, ...single }: Props) {
  const [scenario, setScenario] = useState(0);
  const [current, setCurrent] = useState(-1);
  const [playing, setPlaying] = useState(false);

  const config: Config = scenarios?.[scenario] ?? single;
  const panels: Panel[] = config.panels ?? [{ actors: config.actors ?? [], steps: config.steps ?? [] }];
  const total = Math.max(...panels.map((p) => p.steps.length));
  const captions = Array.from({ length: total }, (_, i) => config.captions?.[i] ?? panels[0].steps[i]?.caption ?? "");
  const atEnd = current >= total - 1;
  const debugFor = (p: number): string | null | undefined => {
    const d = config.debug;
    if (!d || current < 0) return null;
    return panels.length > 1 ? (d[p] as Debug | undefined)?.[current] : (d as Debug)[current];
  };
  const debugBlocks = panels.map((panel, p) => ({ title: panel.title, text: debugFor(p) }));

  // Autoplay stops by itself at the last step; any manual navigation also stops it.
  const isPlaying = playing && !atEnd;
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => setCurrent((c) => Math.min(c + 1, total - 1)), PLAY_MS);
    return () => clearInterval(id);
  }, [isPlaying, total]);

  const go = (i: number) => setCurrent(Math.max(-1, Math.min(total - 1, i)));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(current + 1);
    else if (e.key === "ArrowLeft") go(current - 1);
    else return;
    e.preventDefault();
    setPlaying(false);
  };
  const togglePlay = () => {
    if (isPlaying) return setPlaying(false);
    // show a step immediately instead of waiting for the first tick
    setCurrent(atEnd || current < 0 ? 0 : current + 1);
    setPlaying(true);
  };

  return (
    <figure className="diagram" tabIndex={0} onKeyDown={onKey} aria-label={`${title}. Use left and right arrow keys to step.`}>
      <figcaption className="diagram-title">{title}</figcaption>

      {scenarios ? (
        <div className="seg" role="group" aria-label="Scenario">
          {scenarios.map((s, i) => (
            <button
              key={s.label}
              type="button"
              aria-pressed={i === scenario}
              onClick={() => {
                setScenario(i);
                setCurrent(-1);
                setPlaying(false);
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className={`diagram-stage ${panels.length > 1 ? "is-stacked" : "is-split"}`}>
      <div className={panels.length > 1 ? "diagram-panels" : "diagram-visual"}>
        {panels.map((panel, i) => (
          <PanelSvg
            key={`${scenario}-${i}`}
            panel={panel}
            current={current}
            rows={total}
            colWidth={colWidth ?? (panels.length > 1 ? 128 : 150)}
          />
        ))}
      </div>

      <div className="diagram-side">
      <p className="diagram-caption" aria-live="polite">
        {current >= 0 ? (
          <>
            <span className="diagram-count">
              {current + 1}/{total}
            </span>
            {captions[current]}
          </>
        ) : (
          "Press ▶ Play or “Next step”. Arrow keys work too."
        )}
      </p>

      <div className="diagram-controls">
        <button type="button" onClick={() => { setPlaying(false); go(current - 1); }} disabled={current < 0}>
          ← Back
        </button>
        <button type="button" className="primary" onClick={() => { setPlaying(false); go(current + 1); }} disabled={atEnd}>
          Next step →
        </button>
        <button type="button" onClick={togglePlay}>
          {isPlaying ? "❚❚ Pause" : "▶ Play"}
        </button>
        <button type="button" onClick={() => { setPlaying(false); go(-1); }} disabled={current < 0}>
          Reset
        </button>
      </div>

      {config.debug ? (
        <div className="debug" aria-live="polite">
          <p className="debug-title">Debug view</p>
          <div className={panels.length > 1 ? "debug-grid" : undefined}>
            {debugBlocks.map((block, i) => (
              <div key={i} className="debug-block">
                {panels.length > 1 && block.title ? <span className="debug-panel">{block.title}</span> : null}
                <pre>{current < 0 ? "Step through the diagram to see requests and responses." : (block.text ?? "(nothing happens here)")}</pre>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      </div>
      </div>
    </figure>
  );
}

function PanelSvg({ panel, current, rows, colWidth }: { panel: Panel; current: number; rows: number; colWidth: number }) {
  const uid = useId().replace(/:/g, "");
  const { actors, steps } = panel;
  const width = actors.length * colWidth;
  const x = (id: string) => (actors.findIndex((a) => a.id === id) + 0.5) * colWidth;

  // Latest state per actor up to the current step; `changed` = updated by this step.
  const stateful = actors.filter((a) => steps.some((s) => s?.state?.[a.id] !== undefined));
  const stateNow: Record<string, string> = {};
  steps.slice(0, current + 1).forEach((s) => Object.assign(stateNow, s?.state));
  const changed = new Set(Object.keys(steps[current]?.state ?? {}));
  const maxLines = Math.max(1, ...steps.flatMap((s) => Object.values(s?.state ?? {}).map((t) => t.split("\n").length)));
  const stateTop = TOP + rows * ROW_H + 8;
  const stateH = stateful.length ? maxLines * 15 + 30 : 0;
  const height = stateTop + stateH + 4;

  return (
    <div className="diagram-panel">
      {panel.title ? <p className="diagram-panel-title">{panel.title}</p> : null}
      <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: actors.length * 125, maxWidth: width * 1.1 }} role="img" aria-label={panel.title ?? "sequence diagram"}>
        <defs>
          {(["cur", "past", "bad"] as const).map((k) => (
            <marker key={k} id={`${uid}-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" style={{ fill: `var(--sd-${k})` }} />
            </marker>
          ))}
        </defs>

        {actors.map((a) => (
          <g key={a.id}>
            <line x1={x(a.id)} x2={x(a.id)} y1={48} y2={TOP + rows * ROW_H} style={{ stroke: "var(--border)" }} strokeDasharray="3 4" />
            <rect
              x={x(a.id) - colWidth / 2 + 8}
              y={6}
              width={colWidth - 16}
              height={a.sub ? 42 : 34}
              rx={6}
              style={{ fill: "var(--surface)", stroke: "var(--border)" }}
            />
            <text x={x(a.id)} y={a.sub ? 24 : 27} textAnchor="middle" className="sd-actor">
              {a.label}
            </text>
            {a.sub ? (
              <text x={x(a.id)} y={39} textAnchor="middle" className="sd-sub">
                {a.sub}
              </text>
            ) : null}
          </g>
        ))}

        {steps.map((s, i) => {
          if (!s || i > current) return null;
          const isCurrent = i === current;
          const kind = s.tone === "bad" ? "bad" : isCurrent ? "cur" : "past";
          const y = TOP + i * ROW_H + 20;
          const color = `var(--sd-${kind})`;
          const opacity = isCurrent ? 1 : 0.55;

          if (s.from === s.to) {
            const w = colWidth - 14;
            return (
              <g key={i} opacity={opacity}>
                <rect
                  x={x(s.from) - w / 2}
                  y={y - 14}
                  width={w}
                  height={22}
                  rx={4}
                  className={isCurrent ? "sd-pulse" : undefined}
                  style={{ fill: "var(--bg)", stroke: color }}
                  strokeWidth={isCurrent ? 1.6 : 1}
                />
                <text x={x(s.from)} y={y + 1} textAnchor="middle" className="sd-label" style={{ fill: color }}>
                  {s.label}
                </text>
              </g>
            );
          }

          const x1 = x(s.from);
          const x2 = x(s.to);
          const dir = x2 > x1 ? 1 : -1;
          return (
            <g key={i} opacity={opacity}>
              <line
                x1={x1 + dir * 3}
                x2={x2 - dir * 3}
                y1={y}
                y2={y}
                style={{ stroke: color }}
                strokeWidth={isCurrent ? 2 : 1.3}
                strokeDasharray={s.dashed ? "5 4" : undefined}
                markerEnd={`url(#${uid}-${kind})`}
              />
              <text
                x={(x1 + x2) / 2}
                y={y - 6}
                textAnchor="middle"
                className="sd-label"
                style={{ fill: isCurrent ? "var(--fg)" : "var(--muted)" }}
                fontWeight={isCurrent ? 600 : 400}
              >
                {s.label}
              </text>
              {isCurrent ? (
                // the "packet": travels from sender to receiver; remounts (restarts) every step
                <circle
                  key={`dot-${current}`}
                  cx={x1}
                  cy={y}
                  r={4.5}
                  className="sd-dot"
                  style={{ fill: color, ["--dx" as string]: `${x2 - x1}px` }}
                />
              ) : null}
            </g>
          );
        })}

        {stateful.map((a) => {
          const text = stateNow[a.id];
          const w = colWidth - 12;
          return (
            <g key={a.id}>
              <rect
                key={changed.has(a.id) ? `flash-${current}` : "still"}
                x={x(a.id) - w / 2}
                y={stateTop}
                width={w}
                height={stateH - 6}
                rx={6}
                className={changed.has(a.id) ? "sd-flash" : undefined}
                style={{ fill: "var(--surface)", stroke: "var(--border)" }}
              />
              <text x={x(a.id)} y={stateTop + 15} textAnchor="middle" className="sd-sub">
                {a.label} holds
              </text>
              {(text ?? "—").split("\n").map((line, j) => (
                <text key={j} x={x(a.id)} y={stateTop + 32 + j * 15} textAnchor="middle" className="sd-state">
                  {line}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
