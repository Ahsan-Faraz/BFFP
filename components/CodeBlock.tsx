import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

// Highlighting runs at build time on the server; the browser receives plain
// HTML with no highlighter JavaScript. Only the languages the notes use are loaded.
const LANGS = ["javascript", "typescript", "json", "bash", "http", "nginx", "yaml"];

let highlighter: Promise<HighlighterCore> | null = null;

function getHighlighter() {
  highlighter ??= createHighlighterCore({
    themes: [import("shiki/themes/github-dark.mjs")],
    langs: [
      import("shiki/langs/javascript.mjs"),
      import("shiki/langs/typescript.mjs"),
      import("shiki/langs/json.mjs"),
      import("shiki/langs/bash.mjs"),
      import("shiki/langs/http.mjs"),
      import("shiki/langs/nginx.mjs"),
      import("shiki/langs/yaml.mjs"),
    ],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

const ALIASES: Record<string, string> = { js: "javascript", ts: "typescript", sh: "bash", shell: "bash" };

export async function CodeBlock({ code, lang = "text" }: { code: string; lang?: string }) {
  const resolved = ALIASES[lang] ?? lang;
  const hl = await getHighlighter();
  const html = hl.codeToHtml(code, {
    lang: LANGS.includes(resolved) ? resolved : "text",
    theme: "github-dark",
  });
  return (
    <figure className="codeblock">
      {lang !== "text" ? <figcaption className="codeblock-lang">{lang}</figcaption> : null}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </figure>
  );
}
