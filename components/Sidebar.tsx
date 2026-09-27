"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { TopicWithSections } from "@/lib/content";
import { LAST_READ_KEY, parseLastRead, useStoredString } from "@/lib/storage";

export function Sidebar({ topics }: { topics: TopicWithSections[] }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <header className="mobile-bar">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="sidebar"
          className="menu-button"
        >
          {open ? "✕ Close" : "☰ Menu"}
        </button>
        <Link href="/" onClick={close} className="mobile-title">
          Backend from First Principles
        </Link>
      </header>
      <nav id="sidebar" className={`sidebar ${open ? "is-open" : ""}`} aria-label="Topics">
        <Link href="/" onClick={close} className="site-title">
          Backend from First Principles
        </Link>
        <SidebarBody topics={topics} onNavigate={close} />
      </nav>
      {open ? <div className="sidebar-scrim" onClick={close} aria-hidden="true" /> : null}
    </>
  );
}

function SidebarBody({ topics, onNavigate }: { topics: TopicWithSections[]; onNavigate: () => void }) {
  const pathname = usePathname();
  const lastRead = parseLastRead(useStoredString(LAST_READ_KEY));
  const [query, setQuery] = useState("");
  const results = useMemo(() => search(topics, query), [topics, query]);

  return (
    <>
      <div className="search">
        <label htmlFor="search" className="sr-only">
          Search sections
        </label>
        <input
          id="search"
          type="search"
          placeholder="Search sections…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>

      {query.trim().length > 1 ? (
        <div className="search-results">
          <p className="search-count">
            {results.length} section{results.length === 1 ? "" : "s"} match “{query.trim()}”
          </p>
          <ul>
            {results.map((r) => (
              <li key={`${r.topic}-${r.id}`}>
                <Link href={`/${r.topic}#${r.id}`} onClick={onNavigate}>
                  <span className="search-topic">{r.topicShort}</span>
                  <span className="search-title">{r.title}</span>
                  {r.snippet ? <span className="search-snippet">{r.snippet}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ol className="topic-list">
          {topics.map((t, i) => {
            const active = pathname === `/${t.slug}`;
            return (
              <li key={t.slug}>
                {t.ready ? (
                  <Link href={`/${t.slug}`} onClick={onNavigate} className={`topic-link ${active ? "is-active" : ""}`}>
                    <span className="topic-num">{i + 1}</span>
                    {t.title}
                  </Link>
                ) : (
                  <span className="topic-link is-disabled" title="Not built yet">
                    <span className="topic-num">{i + 1}</span>
                    {t.title}
                    <span className="soon">soon</span>
                  </span>
                )}
                {active ? (
                  <ul className="section-list">
                    {t.sections.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/${t.slug}#${s.id}`}
                          onClick={onNavigate}
                          className={lastRead?.topic === t.slug && lastRead.id === s.id ? "is-current" : undefined}
                        >
                          {s.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

type Result = { topic: string; topicShort: string; id: string; title: string; snippet: string };

// Every word must appear in the section title or text. Title matches rank first.
function search(topics: TopicWithSections[], query: string): Result[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (words.join("").length < 2) return [];
  const hits: (Result & { score: number })[] = [];
  for (const t of topics) {
    for (const s of t.sections) {
      const title = s.title.toLowerCase();
      const text = s.text.toLowerCase();
      if (!words.every((w) => title.includes(w) || text.includes(w))) continue;
      const score = words.filter((w) => title.includes(w)).length;
      hits.push({ topic: t.slug, topicShort: t.short, id: s.id, title: s.title, snippet: snippet(s.text, words[0]), score });
    }
  }
  return hits.sort((a, b) => b.score - a.score);
}

function snippet(text: string, word: string) {
  const at = text.toLowerCase().indexOf(word);
  if (at < 0) return "";
  const start = Math.max(0, at - 40);
  return (start > 0 ? "…" : "") + text.slice(start, at + 70).trim() + "…";
}
