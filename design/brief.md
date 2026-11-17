# BRIEF — docs-kit (working name)

> A super-light, agent-native docs system. It replaces GitBook: Markdown in a repo, a static site with excellent design, search that humans and agents share, and an agent that keeps the docs in sync with the code.
>
> **Reviewer (Conductor / Claude Code):** this is a proposal, not a finished spec. Challenge every decision. If something can be removed, remove it. If you think a choice is wrong, say why and propose the lighter alternative. Before writing code, verify every version, API and flag mentioned here against the official docs, because some may have changed.

---

## 1. Goals

1. **Human-first design**: clean, professional and personal (own logo, own accent colour). Linear/Vercel-docs quality.
2. **Agent-native at both ends**:
   - *Authoring*: any coding agent can write a correct page and verify it with one command.
   - *Reading*: any agent can find and fetch exactly the right section (llms.txt, `.md` per page, search over MCP).
3. **Search is the core feature**: fast, fuzzy, section-level, and the same index for humans and agents.
4. **Self-updating**: a merge to `main` → the agent updates the affected pages → a PR for review.
5. **As light as possible**: static output, ~0 JS by default, a minimal dependency list, no redundant code.
6. **Reusable**: brand once, connect any repo (vAPI, BrickPilot, …) with one small workflow file.

## Non-goals (v1)

WYSIWYG editor, versioned docs, i18n, comments, analytics, auth/private docs, "Ask AI" chat UI, OpenAPI reference generation. Each one is a possible later add-on, and none is allowed in the core.

---

## 2. Engineering principles (rigorous, enforced in review)

These are the rules. Every PR is reviewed against them.

1. **Code must earn its place.** A line is added only if a current requirement needs it. No speculative options, no "might be useful later".
2. **Platform first.** Use native HTML/CSS before JS (`<dialog>`, `<details>`, Popover API, `:has()`, container queries, `prefers-color-scheme`), and JS before a dependency.
3. **Dependency budget.** Runtime deps are fixed (see §3). Adding one needs a written justification in the PR: what it replaces, its size, why ~50 lines of our own code won't do.
4. **One source of truth per concern.** Content → `content/`. Design tokens → one CSS `@theme` block. Site config → `docs.config.ts`. Nav order → frontmatter `order` + folder structure. Search index → one build output used by all consumers.
5. **No abstraction before the third use.** Duplicate twice; abstract on the third occurrence.
6. **Pure core, thin edges.** All logic (nav tree, section splitting, markdown→text, llms.txt rendering) lives as pure, typed functions in `src/lib/`. Pages and components only call them. Logic is unit-testable without Astro.
7. **Small files.** Soft limit of ~150 lines per file and ~40 lines per function. If it's bigger, split by responsibility.
8. **Strict TypeScript**, no `any`, no barrel files (`index.ts` re-exports), named exports only.
9. **Deletion test.** Before merging, ask: "what breaks if I delete this?" If the answer is "nothing", delete it.
10. **Content is plain Markdown.** No MDX, no imports, no JSX in content. Rich blocks use Markdown directives (`:::note`). An agent must never need to know about components.
11. **Comments explain *why*, never *what*.** Self-explanatory names over comments.
12. **Performance budgets are CI-enforced** (see §9).

---

## 3. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Astro** (latest stable), static output | Content collections + Zod schema. Zero JS by default. |
| Content | `.md` + `remark-directive` | Callouts and steps via `:::note`, `:::warning`, `:::tip`. |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`) | Tokens in one `@theme` block. Evaluate whether `@tailwindcss/typography` is needed, or whether a ~80-line hand-written `.prose` is lighter and more on-brand (preferred). |
| Highlighting | **Shiki** (built into Astro) | Dual light/dark theme via CSS variables, no runtime JS. |
| Search | **MiniSearch** | Lazy-loaded on ⌘K only. The same index is used by the MCP worker. |
| Fonts | **Geist Sans + Geist Mono**, self-hosted variable `woff2` | Two files, `font-display: swap`, preloaded. No font package dependency. |
| Hosting | **Cloudflare Pages** (or Vercel) | Preview deploy per PR. |
| Agent | **`anthropics/claude-code-action@v1`** | In GitHub Actions, on merge to `main`. |
| MCP (phase 3) | Cloudflare Worker | Tools: `search_docs`, `get_page`. |

**Runtime dependency budget:** `astro`, `tailwindcss`, `@tailwindcss/vite`, `remark-directive`, `minisearch`. That's it.
**Dev:** `typescript`, `vitest` (only for `src/lib/`). Link checking via a CI action (e.g. lychee), not an npm dependency.

> Reviewer: if you can drop `remark-directive` with a ~30-line remark plugin of our own, or drop Tailwind entirely in favour of ~300 lines of plain CSS with custom properties, make the case. Lightness wins over familiarity.

---

## 4. Repository structure

```
docs-kit/
├── content/                      # ONLY thing the docs agent may edit
│   ├── index.md
│   ├── getting-started.md
│   └── guides/
│       └── authentication.md
├── public/
│   ├── logo.svg                  # mark + wordmark, uses currentColor
│   ├── favicon.svg
│   └── fonts/                    # Geist variable woff2 ×2
├── src/
│   ├── content.config.ts         # collection + zod schema
│   ├── lib/                      # pure, tested logic — no Astro imports
│   │   ├── nav.ts                # entries → sidebar tree + prev/next
│   │   ├── sections.ts           # markdown → heading-level sections
│   │   ├── text.ts               # markdown → plain text (for index)
│   │   ├── llms.ts               # render llms.txt / llms-full.txt
│   │   └── search.ts             # MiniSearch options (shared w/ MCP)
│   ├── layouts/
│   │   └── Doc.astro             # header + sidebar + content + toc
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Sidebar.astro
│   │   ├── Toc.astro
│   │   ├── Search.astro          # <dialog> + lazy script
│   │   ├── PageActions.astro     # copy .md / open in Claude / ChatGPT
│   │   ├── PrevNext.astro
│   │   └── ThemeToggle.astro
│   ├── styles/
│   │   └── global.css            # @theme tokens + .prose
│   └── pages/
│       ├── [...slug].astro       # HTML
│       ├── [...slug].md.ts       # raw markdown per page
│       ├── llms.txt.ts
│       ├── llms-full.txt.ts
│       └── search.json.ts        # the one search index
├── docs.config.ts                # name, logo, accent, repo url, nav groups
├── AGENTS.md                     # rules for any agent writing docs
├── .github/workflows/
│   ├── ci.yml                    # check + budgets + link check
│   └── docs-sync.yml             # reusable: code change → docs PR
└── mcp/                          # phase 3, optional Cloudflare Worker
```

No `utils/`, no `helpers/`, no `types/` folder. Types live next to the code that owns them.

---

## 5. Content model

```ts
// src/content.config.ts — schema (illustrative)
title: z.string().max(70)
description: z.string().max(160)   // used in llms.txt, meta, search
order: z.number().optional()       // sort within folder; default alpha
draft: z.boolean().default(false)
```

- URL = file path (`content/guides/authentication.md` → `/guides/authentication`).
- Folder = sidebar group. A folder's `index.md` sets the group's title and order.
- Frontmatter has no other fields. Anything else requires a reason.
- Directives: `:::note`, `:::tip`, `:::warning`, `:::danger`, `:::steps` (styles the next ordered list). That's the full set.

---

## 6. UI / UX

### Components (≈ 7, all Astro, no framework islands)

| Component | Implementation | Client JS |
|---|---|---|
| Header: logo, ⌘K trigger, theme toggle, GitHub link | Astro | toggle only |
| Sidebar | generated from `lib/nav.ts`; groups via `<details open>` | 0 |
| Mobile nav | Popover API (`popover` + `popovertarget`) | 0 |
| Search | native `<dialog>`; MiniSearch + index fetched on first open | lazy |
| TOC | h2/h3 from Astro headings; scroll-spy via IntersectionObserver | ~15 lines |
| Code block copy | Shiki output + one delegated click listener | ~5 lines |
| Page actions | Copy page as Markdown · View `.md` · Open in Claude · Open in ChatGPT | ~10 lines |
| Prev / next | from `lib/nav.ts` | 0 |

Theme: an inline `<head>` script (≤ 5 lines) reads `localStorage`/`prefers-color-scheme` before paint to prevent a flash. Total first-party JS target: **≤ 3 KB gzipped** excluding the lazy search chunk.

### Visual design

- **Layout**: 3 columns — sidebar (≈260px) · content (max ~68ch) · TOC (≈220px). TOC hides below `xl`, sidebar becomes a popover below `lg`.
- **Type**: Geist Sans for UI and body, Geist Mono for code. Body 16px/1.7, tight heading tracking, clear scale (e.g. 14 / 16 / 20 / 24 / 32).
- **Colour**: neutral zinc scale + **one accent** (`--accent`, set in `docs.config.ts`), used sparingly: links, active nav item, focus ring, callout borders. Dark mode via swapping CSS variables, with no duplicated `dark:` classes on components.
- **Surface**: hairline borders (`1px` at low alpha), no shadows except the search dialog, small radii (6–8px), generous whitespace.
- **States**: visible focus rings, `:hover` and `:active` on everything interactive, `prefers-reduced-motion` respected.
- **Accessibility**: semantic landmarks, skip link, full keyboard nav in search (↑ ↓ ↵ esc), WCAG AA contrast in both themes.

### Brand / logo

- `logo.svg`: a simple geometric mark + wordmark, single path set, `fill="currentColor"` so it adapts to the theme automatically.
- The same mark is used for `favicon.svg` and a static OG image.
- Per-project branding = swap `logo.svg` + `accent` in `docs.config.ts`. Nothing else.
- *Open:* final product name and accent colour (see §11).

---

## 7. Search — one index, two consumers

**Build time** (`pages/search.json.ts` → `lib/sections.ts`):
1. Split every page into sections at each `##` and `###`.
2. Each record: `{ id, page, title, heading, path: "Guides › Authentication › Tokens", url: "/guides/authentication#tokens", text }`.
3. `text` = markdown stripped to plain text (`lib/text.ts`), code blocks kept but de-weighted.

**Humans** (`Search.astro`):
- ⌘K / `/` opens the `<dialog>`. On the first open, dynamically import MiniSearch and fetch `search.json` (cached after that).
- Field boosts: `title` > `heading` > `text`. Prefix + fuzzy (≈0.2). Results show the breadcrumb path plus a snippet with the match highlighted, and jump straight to the anchor.
- Empty state lists the top-level pages.

**Agents**:
- `GET /llms.txt` follows the llmstxt.org format: H1 name, blockquote summary, H2 sections of `- [Title](url.md): description`.
- `GET /llms-full.txt` contains all pages concatenated, in nav order.
- `GET /<any-page>.md` returns the raw markdown of that page.
- **MCP** (phase 3, `mcp/`): `search_docs(query, limit?)` → sections with url + snippet; `get_page(path)` → markdown. It loads the same `search.json` and the same `lib/search.ts` options, so ranking is identical to the human search.

**Scaling note:** a single JSON index is fine up to a few hundred pages / a few MB. If we ever outgrow it, chunk the index. Do not add Pagefind/Algolia preemptively.

---

## 8. Agent authoring & self-updating docs

### `AGENTS.md` (in the kit, and copied to each connected repo's docs folder)

- Voice: direct, second person, present tense, no marketing language.
- Structure: one idea per section, task-oriented headings ("Authenticate a request", not "Authentication info").
- Always: a working code example per task, frontmatter `description` ≤ 160 chars.
- Never: document internal/private APIs, invent behaviour not in the code, edit outside `content/`.
- Verify: run `npm run check` before finishing.

### `npm run check`

`astro check` (types + schema) → `astro build` → `vitest run` → budget check (§9). One command, non-zero exit on any failure.

### `docs-sync.yml` (reusable workflow, `on: workflow_call`)

1. Trigger: push to `main` in the product repo (the caller workflow is ~10 lines).
2. Gather: the diff of the merged commits + `AGENTS.md` + the current `content/` tree.
3. Run `anthropics/claude-code-action@v1` with a fixed prompt: "Find user-facing changes in this diff. Update or create only the affected pages in `content/`. Run `npm run check`. If nothing user-facing changed, do nothing."
4. Restrict tools via `claude_args` (Read/Edit/Write/Glob/Grep + `Bash(npm run check)` only) and cap `--max-turns`.
5. Output: open (or update) **one** rolling PR, `docs/sync`. Never push to `main`.
6. Guard step in CI: fail if a docs-sync PR touches any path outside `content/`.
7. Use `concurrency` to prevent overlapping runs.

> Reviewer, verify: commits made with the default `GITHUB_TOKEN` don't trigger follow-up workflows, so CI won't run on the agent's PR unless we use a GitHub App token. Decide on the token approach.

**Default topology:** docs live in a `/docs` folder in the product repo (the simplest option, with no cross-repo tokens). A separate docs repo is supported later via the same reusable workflow plus an App token.

---

## 9. Quality gates (CI)

| Gate | Threshold |
|---|---|
| `npm run check` | must pass |
| First-party JS (excl. lazy search) | ≤ 3 KB gzip |
| CSS | ≤ 15 KB gzip |
| Lighthouse (perf / a11y / best practices / SEO) | 100 / 100 / 100 / 100 on a sample page |
| Broken internal links | 0 |
| Runtime deps | must match §3 list exactly (script diff on `package.json`) |
| docs-sync PR scope | only `content/**` changed |

---

## 10. Build plan

**Phase 1: core site**
- Schema, `lib/nav.ts`, layout, sidebar, TOC, prev/next, prose styles, Shiki dual theme, directives, theme toggle, mobile popover nav.
- Done when: sample content renders correctly in both themes, Lighthouse is 100s, and the JS budget is met.

**Phase 2: search + agent surfaces**
- `lib/sections.ts`, `lib/text.ts`, `search.json`, the ⌘K dialog, `.md` endpoints, llms.txt / llms-full.txt, page actions.
- Done when: a search for a word in an h3 jumps to that h3, and `curl /x.md` returns the source.

**Phase 3: automation + MCP**
- `ci.yml` with all gates, reusable `docs-sync.yml`, `AGENTS.md`, the MCP worker.
- Done when: a test PR that changes a function signature in a demo repo produces a correct docs PR, and an MCP client can `search_docs` and `get_page`.

**Phase 4: brand**
- Logo, favicon, OG image, final accent colour, polish pass.

Each phase ends with a **deletion pass**: re-read the diff and remove anything not strictly required.

---

## 11. Open questions (for Zep)

1. Product name? (drives the logo and wordmark)
2. Accent colour?
3. First repo to connect: vAPI or BrickPilot?
4. Cloudflare Pages or Vercel?
5. Public docs only, or will private/internal docs be needed later? (affects whether auth is ever in scope)

---

## 12. Instructions for the reviewing agent

1. Read this brief fully. Don't write code yet.
2. Research and verify: current Astro major + content collections API, Tailwind v4 setup with Astro, Shiki dual-theme config, MiniSearch API, Popover API browser support, the llmstxt.org spec, `claude-code-action@v1` inputs, and MCP server transport options on Cloudflare Workers.
3. Write a **review** covering: what you'd cut, what's missing, anything that's wrong or outdated, and lighter alternatives. Be blunt.
4. Propose the final dependency list and file tree.
5. After approval, build phase by phase, and stop for review after each phase.