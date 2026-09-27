"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LAST_READ_KEY, parseLastRead, useStoredString, writeStorage } from "@/lib/storage";

// Saves the section you're currently in (the last heading scrolled past the
// top third of the screen) as "last read". Checked at most every 250 ms.
export function ReadingTracker({ topic }: { topic: string }) {
  useEffect(() => {
    const headings = Array.from(document.querySelectorAll<HTMLElement>("article h2[id]"));
    if (!headings.length) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastId = "";

    const check = () => {
      timer = null;
      const line = window.innerHeight / 3;
      const current = headings.filter((h) => h.getBoundingClientRect().top < line).at(-1);
      if (!current || current.id === lastId) return;
      lastId = current.id;
      writeStorage(LAST_READ_KEY, JSON.stringify({ topic, id: current.id, title: current.textContent ?? "" }));
    };
    const onScroll = () => {
      timer ??= setTimeout(check, 250);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [topic]);

  return null;
}

// "Continue where you left off" link, shown only when something was saved.
export function ResumeLink({ topic }: { topic?: string }) {
  const last = parseLastRead(useStoredString(LAST_READ_KEY));
  if (!last || (topic && last.topic !== topic)) return null;
  return (
    <p className="resume">
      <span>Continue where you left off:</span>{" "}
      <Link href={`/${last.topic}#${last.id}`}>{last.title} →</Link>
    </p>
  );
}
