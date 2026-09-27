import fs from "node:fs";
import path from "node:path";
import { TOPICS, type Topic } from "./topics";
import { slugify } from "./slug";

// Reads /content/*.mdx at build time to derive the sidebar sections and the
// search index. Every "## Heading" in an MDX file becomes a section, so fixing
// a note only ever means editing the MDX file.

export type Section = { id: string; title: string; text: string };
export type TopicWithSections = Topic & { ready: boolean; sections: Section[] };

const CONTENT_DIR = path.join(process.cwd(), "content");

export function topicFile(slug: string) {
  return path.join(CONTENT_DIR, `${slug}.mdx`);
}

export function readyTopicSlugs(): string[] {
  return TOPICS.filter((t) => fs.existsSync(topicFile(t.slug))).map((t) => t.slug);
}

export function getTopics(): TopicWithSections[] {
  return TOPICS.map((t) => {
    const file = topicFile(t.slug);
    if (!fs.existsSync(file)) return { ...t, ready: false, sections: [] };
    return { ...t, ready: true, sections: parseSections(fs.readFileSync(file, "utf8")) };
  });
}

function parseSections(source: string): Section[] {
  const sections: Section[] = [];
  let current: { title: string; lines: string[] } | null = null;
  let inFence = false;

  for (const line of stripMdxSyntax(source).split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    const heading = !inFence && /^##\s+(.+)$/.exec(line);
    if (heading) {
      if (current) sections.push(toSection(current));
      current = { title: heading[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(toSection(current));
  return sections;
}

function toSection({ title, lines }: { title: string; lines: string[] }): Section {
  const text = lines
    .join(" ")
    .replace(/[`*_>#|]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return { id: slugify(title), title, text };
}

// Removes ESM exports and self-closing JSX components (diagram data, quizzes),
// and drops the tags of wrapping components while keeping their text.
function stripMdxSyntax(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const atLineStart = i === 0 || src[i - 1] === "\n";
    if (atLineStart && src.startsWith("export ", i)) {
      i = skipBalanced(src, i, true);
      continue;
    }
    if (src[i] === "<" && /[A-Z/]/.test(src[i + 1] ?? "")) {
      const end = skipBalanced(src, i, false);
      const tag = src.slice(i, end);
      i = end;
      if (!tag.endsWith("/>")) out += " ";
      continue;
    }
    out += src[i++];
  }
  return out;
}

// Scans forward, tracking {}, [], () and string quotes. For exports it stops at
// the end of the line where depth returns to 0; for tags it stops after the
// closing ">" at depth 0.
function skipBalanced(src: string, start: number, untilLineEnd: boolean): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if ("{[(".includes(c)) depth++;
    else if ("}])".includes(c)) depth--;
    else if (!untilLineEnd && c === ">" && depth === 0) return i + 1;
    else if (untilLineEnd && c === "\n" && depth === 0) return i + 1;
  }
  return src.length;
}
