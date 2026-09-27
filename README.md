# Backend from First Principles — study site

A static study site built from my backend notes (Next.js 16 App Router, TypeScript, Tailwind, MDX).

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # every page is prerendered static HTML
```

## Editing notes

Each topic is one file in `content/` (`auth.mdx`, and later `http.mdx`, `routing.mdx`, `serialization.mdx`).
To fix a note, edit only that file. Sidebar sections and search come from its `## ` headings automatically.
A topic appears in the sidebar as soon as its MDX file exists (the order is set in `lib/topics.ts`).

These components work in any MDX file without importing them:

| Component | Use |
| --- | --- |
| `<Summary>` | The one line to remember, at the top of each section |
| `<Callout type="trap">` | Interview trap box |
| fenced code blocks | Highlighted at build time (shiki) |
| `<StepDiagram actors steps />` or `<StepDiagram panels captions />` | Step-through SVG sequence diagram |
| `<StepDiagram scenarios={[{ label, ... }]} />` | Same, with a toggle between alternative flows |
| `<JwtDecoder />` / `<JwtTamper />` | Decode a JWT; try editing one and watch the signature check fail |
| `<RbacSimulator />` | Send a request through authenticate → authorize → handler |
| `<CookiePlayground />` | Toggle SameSite / Secure / HttpOnly and see which requests carry the cookie |
| `<IdempotencySimulator />` | Retry PUT / POST / PATCH and watch the server state |
| `<RouteMatcher />` | Watch Express match a URL top to bottom and fill req.params / req.query |
| `<JsonPlayground />` | Run text through JSON.parse and see valid / invalid |

Diagrams take an optional `debug` prop: one string per step (or one array per panel) with the real request, response, command or log line for that step.
| `<Quiz id questions />` | Quiz with flashcard mode; revealed answers saved in localStorage |

## Deploying

Push to GitHub and import the repo in Vercel, with **Root Directory** set to `backend-notes`. No environment variables are needed.

## Dependencies beyond create-next-app

- `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx`: the official Next.js MDX setup.
- `remark-gfm`: GitHub-style tables and strikethrough in MDX (the comparison tables need it).
- `shiki`: build-time syntax highlighting, so the browser gets no highlighter JavaScript.
