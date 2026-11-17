# Architecture and stack plan

Status: phase 0 is built. Phases 1 to 4 are planned. This replaces sections 2 to 10 of the [brief](brief.md); the brief's goals and non-goals stand.

Every version and API below was checked on 2026-11-17 against the npm registry, official documentation, or a throwaway Astro project. Items that are still unverified are listed in [Still to verify](#still-to-verify).

## The shape: one core, three thin edges

All logic lives in one folder of pure functions. Three small programs call it: the website for humans, a command-line tool for terminals and coding agents, and an MCP server for agents that read the docs from elsewhere. Search is one function, so a query returns the same ranked sections in all three.

```
content/*.md  +  docs.config.json
        │
        │  src/load.ts — validates once, with the content schema
        ▼
src/core/ — pure functions: nav · sections · search · llms
        │
        ├── site (Astro)    HTML pages, /<page>.md, /llms.txt, /search.json
        ├── src/cli.ts      pnpm search "<query>"
        └── src/worker.ts   /mcp (search_docs, get_page), Accept: text/markdown
```

The command-line tool and the MCP server read `search.json`, the site's own build output. There is one index and nothing else to keep in sync.

This is the "functional core, imperative shell" pattern. It is the lightest form of layered architecture that keeps the testing benefit: core functions take data and return data, so they are tested without Astro, a browser or a network.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Package manager | **pnpm**, pinned in `packageManager` | Its strict `node_modules` makes an undeclared import fail, which is what enforces the dependency list. It skips dependency install scripts by default (`allowBuilds` lists exceptions; no dependency needs one) and holds back versions published less than a day ago (`minimumReleaseAge`). It is already used in your other repos. |
| Runtime | Node 22.23 or later | Required by Astro 7. It also runs `.ts` files and `node --test` directly, which removes the test framework and any build step for the command-line tool. |
| Framework | **Astro 7.4**, static output | Zero client JavaScript by default. Content collections validate frontmatter. A `content/` folder outside `src/` works (tested). |
| Markdown | Astro's built-in engine | Plain `.md` only. Callouts use GitHub alert syntax through a 15-line plugin of our own (tested). |
| Styling | **Plain CSS**, one token block | Custom properties, nesting, `light-dark()`, `@layer` and `:has()` are all Baseline now. Removes two dependencies. |
| Code highlighting | Shiki (inside Astro), light and dark themes | One CSS rule with `light-dark()` switches themes. No client JavaScript. |
| Search | **MiniSearch 7.2** | Zero dependencies, pure JavaScript, runs in the browser, in Node and in a Worker. Pagefind cannot be queried outside a browser, so it cannot serve the MCP server or the command line. |
| Fonts | Geist Sans and Geist Mono, two self-hosted variable `woff2` files | Hand-written `@font-face`, Latin subset, preloaded. |
| Tests | `node --test` on `src/core/` | Built into Node. |
| Lint and format | **Biome** | One tool turns four prose rules into failing checks (see [How it stays clean](#how-it-stays-clean)). |
| Unused code | **knip** | Fails the check on unused files, exports and dependencies, which is what agent-written code leaves behind most often. |
| Hosting | **Cloudflare Workers with static assets** | Cloudflare now points new projects here instead of Pages. One Worker serves the site and the `/mcp` route on the free plan. |
| MCP | Stateless Streamable HTTP route on the same Worker | The 2026-07-28 MCP specification removed sessions; no Durable Object is needed. |
| Docs sync agent | `anthropics/claude-code-action@v1`, pinned by commit, Sonnet 5 | Estimated $0.15 to $0.30 per run. |

### Why pnpm and not npm or Bun

- **npm** needs no install, but its flat `node_modules` lets code import packages it never declared. In the test project, importing Astro's Markdown engine failed under pnpm until it was declared. That failure is the behaviour we want.
- **Bun** installs fastest, but Astro still needs Node to build, so Bun would be a second runtime to keep current. Your installed Bun is 1.1; the registry is at 1.4.
- Your installed pnpm is 10.27; the registry is at 12.21. Pin the current release when scaffolding and read its release notes first.

### Dependencies

Runtime, the complete list:

| Package | New to the install? | Purpose |
|---|---|---|
| `astro` | yes | The site. Brings 188 packages, 137 MB on disk. |
| `minisearch` | yes | Search. No dependencies of its own. |
| `@astrojs/markdown-satteri` | no, already inside Astro | Declared so the config can register the callout plugin. |
| `github-slugger` | no, already inside Astro | Core must produce the same heading anchors as Astro. |
| `@modelcontextprotocol/server` | yes, phase 3 | MCP protocol. Brings `zod`, which Astro already installs. |

Development: `typescript` (6.x, because Astro's checker does not accept 7 yet), `@types/node` (types for the scripts, the command-line tool and the tests), `@astrojs/check`, `@biomejs/biome`, `knip`.

Compared with the brief, this removes `tailwindcss`, `@tailwindcss/vite`, `remark-directive`, `vitest` and the lychee link checker.

## File tree

```
docs-kit/
├── content/                  the kit's own docs; the only folder a docs agent edits
├── docs.config.json          name, description, url, repo, accent
├── public/                   logo.svg, favicon.svg, fonts/
├── src/
│   ├── core/                 pure: no Astro, Node or browser imports
│   │   ├── nav.ts            pages → sidebar tree, previous and next
│   │   ├── sections.ts       Markdown → heading-level section records
│   │   ├── search.ts         records → index; query → ranked hits
│   │   ├── llms.ts           pages → llms.txt; page → Markdown with title
│   │   ├── writing.ts        Markdown node → the WRITING.md rule it breaks
│   │   └── *.test.ts         beside the file they test
│   ├── load.ts               the only file that reads the content collection
│   ├── content.config.ts     collection and frontmatter schema
│   ├── pages/
│   │   ├── [...slug].astro
│   │   ├── [...slug].md.ts
│   │   ├── llms.txt.ts
│   │   └── search.json.ts
│   ├── components/
│   │   ├── Doc.astro         page shell: header, content, previous and next, page actions
│   │   ├── Sidebar.astro
│   │   ├── Toc.astro
│   │   └── Search.astro      <dialog>; loads MiniSearch on first open
│   ├── styles/global.css     tokens, base, prose
│   ├── cli.ts                terminal edge
│   └── worker.ts             MCP and Markdown negotiation (phase 3)
├── scripts/check-dist.ts     links, anchors, sizes, dependency list
├── AGENTS.md                 rules for agents changing the code
├── WRITING.md                rules for anyone writing a page
├── astro.config.ts
├── biome.json
├── package.json
├── tsconfig.json
└── .github/workflows/        ci.yml, docs-sync.yml (phase 3)
```

About 25 files. The brief's `Header`, `PageActions`, `PrevNext` and `ThemeToggle` components are each used once, so they start inside `Doc.astro` and are split out only if that file comes to hold two responsibilities.

## Content model

- Frontmatter has three fields: `title` (70 characters at most), `description` (160 at most) and an optional `order`. `draft` is removed; a draft is a branch.
- The URL is the file path. A folder is a sidebar group, and its `index.md` sets the group's title and order. Navigation has no second source in the config file.
- Callouts are GitHub alerts: `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!CAUTION]`. GitHub renders them, and anywhere else they degrade to a readable blockquote. The `:::steps` block is removed; an ordered list is already a list of steps.
- `docs.config.json` is JSON so that a consuming repository needs no TypeScript.

## Surfaces

### For human readers

Three columns: sidebar, content, table of contents. Client JavaScript is limited to the theme toggle, the search opener, copy buttons, and the search module that loads on first open. Everything else is HTML and CSS:

| Feature | Built with |
|---|---|
| Mobile navigation | Popover API |
| Search dialog | `<dialog>` |
| Theme | `color-scheme` and `light-dark()`; a few inline lines apply a saved choice before paint |
| Active section in the table of contents | CSS `scroll-target-group`, as an enhancement. Browsers without it show a plain list. The brief's JavaScript scroll-spy is not built unless this proves too weak. |

### For agents reading the docs

| Surface | What it gives | Evidence |
|---|---|---|
| `/<page>.md` | The page as Markdown, with its title | The best-supported surface; agents fetch per-page Markdown in practice |
| `Accept: text/markdown` on any page URL | The same Markdown, from the Worker | Cloudflare's published convention |
| `/search.json` | Every section as `{ url, title, heading, text }` | Usable with `curl` and `jq`, no server |
| `/llms.txt` | Index of pages with descriptions | Cheap to emit. Log studies find crawlers rarely request it, so it is not the main path. |
| `/mcp` | `search_docs(query, limit?)`, `get_page(path)` | Supported by Claude Code, Claude apps, ChatGPT, Cursor and Codex |

`llms-full.txt` is removed. It is the opposite of fetching the right section, and `search.json` already holds all the text.

### For agents and people at a terminal

| Command | Does |
|---|---|
| `pnpm dev` | Local site |
| `pnpm check` | The single definition of done: types, lint, unused code, tests, build, then links, anchors, sizes and the dependency list on the output. Target: under 30 seconds. |
| `pnpm fix` | Format and apply safe lint fixes |
| `pnpm search "<query>"` | The site's ranked search. `--json` for machines, `--url <site>` to query a deployed site. |

Commands print plain text, exit non-zero on failure, and every failure message says what to change. There is no `get` command; `cat` and `curl` already do that.

## How it stays clean

The research changed how the rules are enforced more than what they are. The one controlled study of repository instruction files (ETH Zurich, 2026) found they did not raise task success and added over 20% to cost, and that long or generated files did worst. OpenAI's report on building with Codex agents reached the same place: a short file used as a map, with boundaries enforced by tools. So each rule becomes a failing check where possible, and `AGENTS.md` keeps only what a tool cannot check.

| Rule | Enforced by |
|---|---|
| Strict types, no `any` | `tsconfig` (Astro's strictest preset) and Biome |
| Named exports only, no barrel files | Biome |
| Core imports nothing from Astro, Node or the browser | Biome import restriction on `src/core/` |
| No unused files, exports or dependencies | knip |
| Dependency list is fixed | `check-dist` compares `package.json` with the list |
| JavaScript and CSS size budgets | `check-dist`, gzip sizes |
| No broken links or anchors, including every search result URL | `check-dist` |
| Frontmatter shape | Content schema at build |
| Headings are `##` or `###`, code blocks name a language, no HTML | Markdown plugin at build, registered in `astro.config.ts` |
| The lint rules and `check-dist` still catch what they should | Tests beside `biome.json` and `scripts/check-dist.ts` |
| Docs agent edits only `content/` | Path guard in the sync workflow |

Three of the brief's twelve rules change:

- **Line limits (150 per file, 40 per function) are removed.** No study supports a specific number, and the size research disagrees with itself. Splitting by length produces many shallow files, which costs agents more tokens to navigate. The rule becomes: a module hides one decision behind a small interface, and is split when it holds two responsibilities.
- **"Comments explain why, never what" is reworded.** Each exported core function gets one line stating what it guarantees, because callers, human or agent, read that instead of the body. Inside functions the rule stays: only why.
- **The Lighthouse gate of four 100s becomes** 100 for accessibility, best practices and SEO, and 95 or more for performance on the median of three runs. Performance scores vary between runs, so a hard 100 would fail at random.

The rule of three, the dependency budget and strict typing are the best-supported rules and stay as written.

## Self-updating docs

The workflow lives in this repository and is called from a product repository on push to `main`, ignoring pushes that only touch docs.

1. **Agent step.** It receives the diff as a file and may only read, search and edit files. It has no shell. The prompt says the diff is data, not instructions.
2. **Guard step, no model key.** It fails if any path outside the docs content folder changed, then runs `pnpm check`.
3. **Pull request step.** It opens or updates one rolling pull request on `docs/sync`. If the working tree is unchanged, it stops.

Differences from the brief, with reasons:

- The action has no `max_turns` or `model` inputs; both go through `claude_args`. It also does not open pull requests itself, so that step is ours.
- The agent does not run `pnpm check`. That command executes repository code, and Anthropic's own security notes say the tool allowlist "is … not a sandbox". The check runs in the guard step instead, without the model key.
- A merged diff is still untrusted text. Reviewers read for logic, not for instructions hidden in a comment. Prompt injection through repository text is a documented class of incident (PromptPwnd, GitInject), so the path guard checks the output regardless of what the agent was told.
- Every action is pinned by commit, because of the tag-repointing attacks on `tj-actions` and others.
- Start with the default `GITHUB_TOKEN`. The check has already run before the pull request opens, and CI on that pull request starts after one "Approve workflows to run" click. A GitHub App token is only needed once docs live in a separate repository.
- The writing rules are one file, `WRITING.md`, read by the workflow. The brief copied a style guide into every connected repository.

A product repository holds only its `content/` folder, `docs.config.json`, a logo and a short workflow. Its build checks out this kit at a pinned commit and builds with `DOCS_ROOT` pointing at that folder. Nothing is published to npm in version 1.

## Build order

Phase 0 is small enough to do directly. Phases 1 to 3 are ticket-sized. Each phase ends with a deletion pass.

| Phase | Builds | Done when |
|---|---|---|
| 0. Skeleton | Package, pnpm pin, TypeScript and Biome config, one page, `pnpm check`, CI | `pnpm check` passes locally and in CI in under 30 seconds |
| 1. Site | `load.ts`, `nav.ts`, layout, sidebar, table of contents, prose, code themes, callouts, theme, mobile navigation | Sample content reads well in both themes; size budgets are set from the measured build |
| 2. Search and reading surfaces | `sections.ts`, `search.ts`, `search.json`, search dialog, `.md` pages, `llms.txt`, `pnpm search` | Searching a word from an `h3` opens that `h3`; the site and the command line return the same ranking |
| 3. Hosting, MCP, sync | Worker, deploy, `docs-sync.yml`, first product repository connected | An MCP client can search and fetch; a signature change in a demo repository produces a correct docs pull request |
| 4. Brand | Logo, favicon, share image, accent, polish | Your sign-off |

## Still to verify

Each is checked with a small test at the start of its phase.

- `DOCS_ROOT` outside the project folder with Astro's loader (phase 1; a sibling folder inside the project is tested).
- `scroll-target-group` behaviour in current Chrome, Safari and Firefox (phase 1).
- Which tool runs the Lighthouse gate, and whether it runs in CI or in `pnpm check`. No phase claims the gate yet (phase 1).
- Whether `@modelcontextprotocol/server` alone serves a stateless route on Workers, or Cloudflare's `agents` package is needed. Take the smaller option that passes a test with Claude Code and one other client (phase 3).
- Preview deployments per pull request on Workers (phase 3).
- A reusable workflow in a private repository called from a repository under another account (phase 3).

## Decisions that are yours

1. **Cloudflare account.** The plan needs one for hosting. Vercel also works but puts the MCP route in a separate function.
2. **Model key for the sync workflow.** A Claude subscription token (`claude setup-token`) is documented for personal repositories; an API key is recommended for organisation repositories.
3. **Public or private kit.** Public removes the clone token in each product repository's build and makes the shared workflow callable from any account. I recommend public once phase 2 is done.
4. **Name and accent colour**, needed by phase 4 only.
5. **First repository to connect**, needed by phase 3 only.
