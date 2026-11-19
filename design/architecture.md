# Architecture and stack plan

Status: phases 0 to 3a are built. Phase 3b is built up to what needs an account, a key or a product repository: the deploy, a run of the sync workflow and the first site going live. Phase 4 is built: a 404 page, tables that scroll at every width, and the name, mark and share image. Versions are left out until a site needs them. This replaced everything in the original brief except its goals and non-goals, which are all the [brief](brief.md) now holds; where this plan says "the brief", it means the full proposal in that file's history.

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
        ├── src/cli.ts      pnpm run search "<query>"
        └── src/worker.ts   /mcp (search_docs, get_page), Accept: text/markdown
```

The command-line tool and the MCP server read `search.json`, the site's own build output. There is one index and nothing else to keep in sync.

This is the "functional core, imperative shell" pattern. It is the lightest form of layered architecture that keeps the testing benefit: core functions take data and return data, so they are tested without Astro, a browser or a network.

## Stack

| Concern | Choice | Why |
|---|---|---|
| Package manager | **pnpm**, pinned in `packageManager` | Its strict `node_modules` makes an undeclared import fail, which is what enforces the dependency list. It skips dependency install scripts by default (`allowBuilds` lists exceptions; no dependency needs one) and refuses versions published less than three days ago (`minimumReleaseAge` in `pnpm-workspace.yaml`). It is already used in your other repos. |
| Runtime | Node 22.23 or later | Required by Astro 7. It also runs `.ts` files and `node --test` directly, which removes the test framework and any build step for the command-line tool. |
| Framework | **Astro 7.4**, static output | Zero client JavaScript by default. Content collections validate frontmatter. A `content/` folder outside `src/` works, and so does one outside the project folder (both tested). |
| Markdown | Astro's built-in engine | Plain `.md` only. Callouts use GitHub alert syntax through a 15-line plugin of our own (tested). |
| Images | Astro's built-in image handling | A Markdown image beside the page gets its width and height, loads lazily and is served as WebP. It works for a content folder outside the project, and `sharp` comes with Astro, so nothing is added (tested in phase 3a). |
| Styling | **Plain CSS**, one token block | Custom properties, nesting, `light-dark()`, `@layer` and `:has()` are all Baseline now. Removes two dependencies. |
| Code highlighting | Shiki (inside Astro), light and dark themes | One CSS rule with `light-dark()` switches themes. No client JavaScript. |
| Search | **MiniSearch 7.2** | Zero dependencies, pure JavaScript, runs in the browser, in Node and in a Worker. Pagefind cannot be queried outside a browser, so it cannot serve the MCP server or the command line. |
| Fonts | Geist Sans and Geist Mono, two self-hosted variable `woff2` files | Hand-written `@font-face`, Latin subset, preloaded. |
| Tests | `node --test` on `src/core/` | Built into Node. |
| Lint and format | **Biome** | One tool turns four prose rules into failing checks (see [How it stays clean](#how-it-stays-clean)). |
| Unused code | **knip** | Fails the check on unused files, exports and dependencies, which is what agent-written code leaves behind most often. |
| Hosting | **Cloudflare Workers with static assets** | Cloudflare now points new projects here instead of Pages. One Worker serves the site and the `/mcp` route on the free plan. |
| MCP | Stateless Streamable HTTP route on the same Worker | The 2026-07-28 MCP specification removed sessions; no Durable Object is needed. `createMcpHandler` from `@modelcontextprotocol/server` serves the route on its own; Cloudflare's `agents` package is not needed (tested with Claude Code and Codex). |
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
| `@modelcontextprotocol/server` | yes, phase 3b | MCP protocol. Brings `zod`, which Astro already installs. The tool inputs are written as JSON Schema, so our code does not import `zod`. |

Development: `typescript` (6.x, because Astro's checker does not accept 7 yet), `@types/node` (types for the scripts, the command-line tool and the tests), `@astrojs/check`, `@biomejs/biome`, `knip`.

Compared with the brief, this removes `tailwindcss`, `@tailwindcss/vite`, `remark-directive`, `vitest` and the lychee link checker.

## File tree

```
vertical-docs/
├── content/                  the kit's own docs and their images; the only folder a docs agent edits
├── docs.config.json          name, description, url, repo, accent
├── public/                   what a site replaces: logo.svg, favicon.svg, share.png, and _redirects when it has old addresses
├── template/                 what `vertical-docs init` writes into a product: docs/ with a first page, the config, placeholder images, the ignore file and the Worker's wrangler.jsonc, and two workflows
├── src/
│   ├── core/                 pure: no Astro, Node or browser imports
│   │   ├── nav.ts            pages → sidebar tree, previous and next
│   │   ├── sections.ts       Markdown → heading-level section records
│   │   ├── search.ts         records → index; query → ranked hits
│   │   ├── llms.ts           pages → llms.txt; page → Markdown with title and image URLs
│   │   ├── seo.ts            pages → sitemap.xml; page → structured data
│   │   ├── writing.ts        Markdown node → the WRITING.md rule it breaks
│   │   ├── callout.ts        blockquote text → callout kind
│   │   └── *.test.ts         beside the file they test
│   ├── load.ts               the only file that reads the content folder: pages and image URLs
│   ├── content.config.ts     collection and frontmatter schema; DOCS_ROOT names the folder
│   ├── pages/
│   │   ├── [...slug].astro
│   │   ├── [...slug].md.ts
│   │   ├── llms.txt.ts
│   │   ├── search.json.ts
│   │   ├── sitemap.xml.ts
│   │   └── robots.txt.ts
│   ├── components/
│   │   ├── Doc.astro         page shell: header, content, previous and next, page actions
│   │   ├── Sidebar.astro
│   │   ├── Toc.astro
│   │   ├── Search.astro      <dialog>; starts the search worker on first open
│   │   └── search-worker.ts  Web Worker: loads search.json and MiniSearch, answers queries
│   ├── styles/global.css     tokens, base, prose
│   ├── fonts/                the two font files, which the build names by their content
│   ├── check.ts              the checks on a built site: links, anchors, heading order, search results, redirects, favicon, share image, sizes
│   ├── cli.ts                terminal edge; `pnpm pack` writes it and what it imports to lib/ as JavaScript for the installed command
│   └── worker.ts             Cloudflare edge: Markdown negotiation and MCP
├── scripts/check-dist.ts     last step of `pnpm check`: the site checks of src/check.ts on dist/, and the dependency list
├── wrangler.jsonc            the Worker and the folder of static files it serves
├── AGENTS.md                 rules for agents changing the code
├── WRITING.md                rules for anyone writing a page
├── astro.config.ts
├── biome.json
├── package.json
├── tsconfig.json
└── .github/workflows/        ci.yml, docs-sync.yml
```

About 30 files. The brief's `Header`, `PageActions`, `PrevNext` and `ThemeToggle` components are each used once, so they start inside `Doc.astro` and are split out only if that file comes to hold two responsibilities.

## Content model

- Frontmatter has three fields: `title` (70 characters at most), `description` (160 at most) and an optional `order`. `draft` is removed; a draft is a branch.
- The URL is the file path. A folder is a sidebar group, and its `index.md` sets the group's title and order. Navigation has no second source in the config file.
- Callouts are GitHub alerts: `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]`, `> [!CAUTION]`. GitHub renders them, and anywhere else they degrade to a readable blockquote. The `:::steps` block is removed; an ordered list is already a list of steps.
- `docs.config.json` is JSON so that a consuming repository needs no TypeScript. A site is one folder: `docs.config.json` and `public/` sit beside `content/`, and `DOCS_ROOT` names that `content/` folder. The kit's own site has the same shape, so there is no second way to configure a site.
- `url` in `docs.config.json` is the public address. It is required, because the canonical URL, the share tags, `sitemap.xml`, `robots.txt` and the links in `llms.txt` are wrong without it.
- An image is a Markdown image whose file sits in the content folder, beside the page. Alt text is required, and a web address is not allowed: a local file is the only kind the build can size and convert. A diagram drawn per theme is two files, `name-light.*` and `name-dark.*`, on two lines; one CSS rule shows the right one. A caption is a line in italics.
- Left out on purpose, because the two first sites do not need them: task lists, tabs, columns, cards, mermaid diagrams, code block titles, hidden pages and breadcrumbs. Task lists fail the build with a message; the rest is plain Markdown that has no syntax here.

## Surfaces

### For human readers

Three columns: sidebar, content, table of contents. Client JavaScript is limited to the theme toggle, the search opener, the copy buttons, scrolling the sidebar to the current page, and the search worker that loads on first open. Everything else is HTML and CSS:

| Feature | Built with |
|---|---|
| Mobile navigation | Popover API |
| Sidebar groups | `<details>`: a folder is a group that opens and closes, and the build opens the groups that hold the current page. One sidebar holds all sections; header tabs per section were prototyped and dropped. |
| Diagram per theme | One CSS rule on the file name (`-light.` and `-dark.`), which also follows the manual theme switch. Tested in Chrome and Firefox. |
| Wide table | The build puts every table in a `div` that scrolls sideways, at every width. The first version turned the table itself into a scrolling block on a small screen, which left wide tables pushing a desktop window sideways and takes the table role away in some screen readers. The `div` has `tabindex="0"`: Safari gives a scrolling box no place in the tab order, so without it the keyboard cannot reach the hidden columns. |
| Address with no page | `src/pages/404.astro` builds `dist/404.html`: the page shell with the sidebar and the search, without a canonical URL or a Markdown copy. The Worker's static files answer it with status 404 (`not_found_handling` in `wrangler.jsonc`). |
| Search dialog | `<dialog>`, with the search in a Web Worker. A lazy `import()` would be the obvious way to load the search on first open, but Vite adds a preload helper of about 0.8 KB gzipped to any page script that has one. A worker loads just as late, needs no helper, and keeps indexing off the page. |
| Theme | `color-scheme` and `light-dark()`; a few inline lines apply a saved choice before paint |
| Active section in the table of contents | CSS `scroll-target-group` and `:target-current`, as an enhancement. Tested on 2026-11-17: Chrome 157 marks the section at the top of the window, the first entry above the first heading and the last entry at the end of the page. Safari 26.2 and Firefox 151 do not support it and show a plain list. The brief's JavaScript scroll-spy is not built unless this proves too weak. |

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
| `pnpm run search "<query>"` | The site's ranked search. `--json` for machines, `--url <site>` to query a deployed site. The plan said `pnpm search`, but pnpm 12 has a built-in `search` command that searches the npm registry and wins over a script of the same name. |

Commands print plain text, exit non-zero on failure, and every failure message says what to change. There is no `get` command; `cat` and `curl` already do that.

From a product's repository the same file is the installed command, `vertical-docs` or `vdocs` for short:

| Command | Does |
|---|---|
| `vertical-docs init [folder]` | Writes the docs folder, `docs` unless named: a first page, `docs.config.json`, a placeholder logo, favicon and share image, a `wrangler.jsonc` for the deploy, and a `.gitignore` for `dist/` and `.wrangler/`. Writes `docs.yml` and `docs-sync.yml` to `.github/workflows/` of the current folder. Leaves a file that exists as it is, and prints what it wrote and the next command |
| `vertical-docs dev [folder]` | Live site of the docs folder, `docs` unless named |
| `vertical-docs build [folder]` | Writes the site to `<folder>/dist` |
| `vertical-docs check [folder]` | Builds, then checks `<folder>/dist`: links, anchors, heading order, search results, redirects, favicon, share image and sizes. Exit code 1 on a problem, with one line for each that says what to change |
| `vertical-docs search "<query>" [folder]` | The site's ranked search on `<folder>/dist/search.json`, with `--json` and `--url <site>` as above |

A site's `check` holds only what checks a site. Biome, knip, the unit tests, `astro check` and the dependency list check the kit's own code and stay in `pnpm check`. In the kit the docs folder is the repository root, so the `search` script passes `.` as the folder after the query.

The kit stays the one Astro project, also inside `node_modules`: the command starts Astro with the kit as its current folder and passes the product's content folder as `DOCS_ROOT`. These facts shape it:

- `DOCS_ROOT` is absolute. `astro.config.ts` resolves it from the current folder and Astro's content loader from the Astro root, so a relative path gives a site with no pages when the two differ. That was the cause of the 404 answers in the first trial with `astro dev --root`.
- Node does not run TypeScript from `node_modules`, so `pnpm pack` first writes `src/cli.ts` and the files it imports (`src/check.ts`, the core search) as JavaScript into `lib/`, which is what the two command names point at. The files in `lib/` sit one folder deep, like their sources in `src/`, so the folder above is the kit from both. Astro reads the `.ts` and `.astro` sources as they are.
- The files `init` writes are the files in `template/`, copied as they are with two exceptions. The docs folder is `docs/` there and takes the name given to `init`, which also replaces `<folder>` in the first page and the two workflows. The ignore file is `gitignore` there and is written as `.gitignore`, because npm leaves a file named `.gitignore` out of a package, also when `files` names it, and pnpm does unless `files` names it (tried 2026-11-18).
- A product deploys with the `wrangler.jsonc` in its docs folder. Wrangler takes the Worker as a file path, so `main` is `../node_modules/vertical-docs/src/worker.ts`: the package sits in `node_modules/` beside the docs folder, which is where npm and pnpm put it and where `docs.yml` installs it before the check. Wrangler bundles the TypeScript source from there, also through pnpm's link (tried 2026-11-19), and writes its own files to `.wrangler/` in the docs folder. The name is a placeholder that wrangler refuses, because a valid one would let two sites in one Cloudflare account replace each other. The other settings repeat the kit's own `wrangler.jsonc`, and a test holds the two together.
- Astro writes its generated files to `.astro/` in its root, which is the installed kit; `cacheDir` moves only the build cache. Two docs folders can be built in turn from one install (tested: 48 and 110 pages), but two previews at once would share those files. For the same reason `dev` passes `--ignore-lock`: Astro's lock file and its `astro dev stop` belong to that folder, and when an agent starts `astro dev` Astro moves the server to the background, where a product has no command to stop it. The preview stays in the terminal and stops with the command.
- The package holds what the installed command reads and nothing else: `lib/`, `src/` without its tests, `astro.config.ts`, `template/` and `WRITING.md`, which is the `files` list in `package.json`; npm adds `package.json` and the README. That is 47 files in 89 kB. `tsconfig.json` is not among them: it serves `astro check`, and Astro builds and previews without it (tried 2026-11-19).
- The version is a fact of `package.json`, written in two more places. `init` fills it into the install step of the `docs.yml` it writes, and the shared `docs-sync.yml` names it both times it downloads the package, so the commit a product pins decides the package too; a test holds that workflow and `package.json` together. A new version therefore changes the shared workflow, and the pin in `template/.github/workflows/docs-sync.yml` moves in a pull request after it. `private` stays `true` until the release, so that `npm publish` refuses.
- Both workflows install with `--ignore-scripts`: no dependency needs its install script (tried with npm on 2026-11-19: `check` and wrangler's dry run of the deploy passed after such an install).
- The package has no `npm-shrinkwrap.json`. A published package carries no lockfile, so a product without its own resolves the dependencies fresh. A shrinkwrap is npm's way to pin them. It would be a second lockfile beside `pnpm-lock.yaml` that Dependabot does not keep in step, and a product could then get a security fix of a dependency only through a new release of the kit. It can also not be proven before a publish: installed from a packed file, a probe package with a shrinkwrap got the newest version of its dependency from npm 10.9.9 and from pnpm 12.21.0, not the pinned one (tried 2026-11-19), so only an install from a registry would show what each does. To decide with the release.

## How it stays clean

The research changed how the rules are enforced more than what they are. The one controlled study of repository instruction files (ETH Zurich, 2026) found they did not raise task success and added over 20% to cost, and that long or generated files did worst. OpenAI's report on building with Codex agents reached the same place: a short file used as a map, with boundaries enforced by tools. So each rule becomes a failing check where possible, and `AGENTS.md` keeps only what a tool cannot check.

| Rule | Enforced by |
|---|---|
| Strict types, no `any` | `tsconfig` (Astro's strictest preset) and Biome |
| Named exports only, no barrel files | Biome |
| Core imports nothing from Astro, Node or the browser | Biome import restriction on `src/core/` |
| No unused files, exports or dependencies | knip |
| Dependency list is fixed | `check-dist` compares `package.json` with the list |
| The package holds what the command reads, no test and nothing of the kit's own site; the sync workflow names the package's version | `package.test.ts`, on the list `npm pack` gives |
| The package runs from `node_modules` | The `package` job in CI: it packs, installs into an empty folder with npm and with pnpm, and runs `init`, `check` and `dev` there. Not in `pnpm check` |
| JavaScript and CSS size budgets | `check-dist` through `src/check.ts`, gzip sizes: 4 KB of CSS, 1.25 KB of JavaScript that a page loads and 8 KB of JavaScript that loads on demand. The phase 3a build measures 2.5 KB, 1.2 KB and 6.1 KB; the page budget rose from 1 KB for the copy buttons. |
| Lighthouse scores | Lighthouse CI job in CI, not in `pnpm check` |
| No broken links or anchors, including every search result URL | `check-dist` |
| Frontmatter shape | Content schema at build |
| Headings are `##` or `###`, code blocks name a language, no HTML, no task lists, an image has alt text and is a local file | Markdown plugin at build, registered in `astro.config.ts` |
| A `###` heading has a `##` above it | `check-dist` |
| A redirect points to a page and is permanent; the share image exists | `check-dist` |
| The lint rules and `check-dist` still catch what they should | Tests beside `biome.json` and `scripts/check-dist.ts` |
| Docs agent edits only `content/` | Path guard in the sync workflow |

Three of the brief's twelve rules change:

- **Line limits (150 per file, 40 per function) are removed.** No study supports a specific number, and the size research disagrees with itself. Splitting by length produces many shallow files, which costs agents more tokens to navigate. The rule becomes: a module hides one decision behind a small interface, and is split when it holds two responsibilities.
- **"Comments explain why, never what" is reworded.** Each exported core function gets one line stating what it guarantees, because callers, human or agent, read that instead of the body. Inside functions the rule stays: only why.
- **The Lighthouse gate of four 100s becomes** 100 for accessibility, best practices and SEO, and 95 or more for performance on the median of three runs. Performance scores vary between runs, so a hard 100 would fail at random. The gate runs in CI only, with Lighthouse CI through `treosh/lighthouse-ci-action` pinned by commit: it audits `dist/` three times per page and asserts the category scores, with the median for performance. Nothing is added to `package.json`. It stays out of `pnpm check` because it starts Chrome three times per page, which does not fit the 30-second target. The scores are in `lighthouserc.json` and the audit is the last step of `ci.yml`.

The rule of three, the dependency budget and strict typing are the best-supported rules and stay as written.

## Self-updating docs

The workflow lives in this repository and is called from a product repository on push to `main`, ignoring pushes that only touch docs.

1. **Agent job.** It receives the diff as a file and may only read, search and edit files. It has no shell. The prompt says the diff is data, not instructions. What leaves the job is one patch of the content folder.
2. **Check job, with no model key and no token that can write.** It applies the patch and runs `vertical-docs check`, the package's check of a site.
3. **Publish job.** It runs nothing from the repository or the patch. The path guard fails if the patch changes any path outside the docs content folder or adds a symlink; then the job opens or updates one rolling pull request on `docs/sync`. If the patch is empty, it stops.

Differences from the brief, with reasons:

- The action has no `max_turns` or `model` inputs; both go through `claude_args`. It also does not open pull requests itself, so that step is ours.
- The agent does not run `pnpm check`. That command executes repository code, and Anthropic's own security notes say the tool allowlist "is … not a sandbox". The check runs in the guard step instead, without the model key.
- The three parts are three jobs, not three steps. The agent's file tools can write to `.git/config` or to another file that a later step of the same job would execute, and building a page can run code that the page names. So the job with the model key and the job that builds can only read, and nothing but the patch reaches the job that can write. The cross-family review of phase 3b found the second case.
- Runs go one at a time: the workflow is one concurrency group with `queue: max`, which keeps up to 100 runs waiting. Two runs at once could each write `docs/sync`, and the later one would win. A group without `queue` drops a waiting run when a newer one arrives, which would skip a code change.
- The pull request is rolling: while it is open, the agent starts from its branch merged into `main`, and the branch is rewritten as `main` plus one commit. A second code change before the first docs change is merged adds to it instead of replacing it.
- A merged diff is still untrusted text. Reviewers read for logic, not for instructions hidden in a comment. Prompt injection through repository text is a documented class of incident (PromptPwnd, GitInject), so the path guard checks the output regardless of what the agent was told.
- Every action is pinned by commit, because of the tag-repointing attacks on `tj-actions` and others.
- Start with the default `GITHUB_TOKEN`. The check has already run before the pull request opens, and CI on that pull request starts after one "Approve workflows to run" click. A GitHub App token is only needed once docs live in a separate repository.
- The writing rules are one file, `WRITING.md`, which the workflow takes out of the package. The brief copied a style guide into every connected repository.
- No job reads the kit's repository: the kit arrives as the package `vertical-docs`, at the version in `package.json` at the pinned commit. The agent job downloads the package with `npm pack` and unpacks the one file, so nothing of the package runs beside the model key; the check job runs it with `npx --ignore-scripts`, so that no dependency runs an install script there, as in the kit's own install. Both run npm outside the checkout, because npm stops with `EBADDEVENGINES` in a product whose `package.json` allows only pnpm. Calling the workflow is what still depends on the kit's repository: while it is private, only private repositories of the same organisation can call it, once the kit allows that in its Actions settings (GitHub's documentation, read 2026-11-19).
- A run without the model key does nothing and is green. A job cannot name a secret in its `if`, so a first job passes on whether the key is set, and the three jobs are skipped without it. `init` writes the calling workflow before a product has a key, and a failed run on every push to `main` would be the first thing it sees. Seen on GitHub on 2026-11-19: called from a branch of this repository, which has no key, the run was green and the three jobs were skipped.

A product repository holds only its `content/` folder, `docs.config.json`, a `public/` folder with its logo, favicon and share image, and a short workflow. Its build checks out this kit at a pinned commit and builds with `DOCS_ROOT` pointing at that `content/` folder. Tested on 2026-11-17 with a folder outside the project: the build, the writing rules, the link check and the local site's reload on edit all work. The change is one line in `src/content.config.ts` (`base: process.env.DOCS_ROOT ?? "./content"`), in since phase 3a: the docs of the first two sites build and pass `pnpm check` from a folder outside the project. Nothing is published to npm in version 1.

## Build order

Phase 0 is small enough to do directly. Phases 1 to 3b are ticket-sized. Each phase ends with a deletion pass. Phase 3a was added after phase 2: the first two sites (the vAPI docs and the Vertical Studio docs, both on GitBook today) need images and a sidebar for a hundred pages, and hosting a site that cannot show its content proves nothing.

| Phase | Builds | Done when |
|---|---|---|
| 0. Skeleton | Package, pnpm pin, TypeScript and Biome config, one page, `pnpm check`, CI | `pnpm check` passes locally and in CI in under 30 seconds |
| 1. Site | `load.ts`, `nav.ts`, layout, sidebar, table of contents, prose, code themes, callouts, theme, mobile navigation, fonts, logo, favicon, accent | Sample content reads well in both themes; size budgets are set from the measured build |
| 2. Search and reading surfaces | `sections.ts`, `search.ts`, `search.json`, search dialog, `.md` pages, `llms.txt`, `pnpm run search` | Searching a word from an `h3` opens that `h3`; the site and the command line return the same ranking |
| 3a. Real content | `DOCS_ROOT`, images, diagrams per theme, a sidebar with groups that open and close, copy buttons, tables on a small screen, and build rules for images, task lists and heading order | Both sites, imported into throwaway folders, pass `pnpm check` and the Lighthouse scores |
| 3b. Hosting, MCP, sync | Worker, deploy, `docs-sync.yml`, first product repository connected, old GitBook paths redirected. With the site's public URL: canonical URLs, `sitemap.xml`, `robots.txt`, share-image tags, structured data, and absolute URLs in `llms.txt` | An MCP client can search and fetch; a signature change in a demo repository produces a correct docs pull request |
| 4. Finish version 1 | A 404 page, wide tables, the image file rule, sync runs one at a time; the name Vertical Docs, its mark, favicon and share image | Your sign-off |

## Versions, when a site needs them

Neither of the first two sites has versions, and versions multiply URLs, search records and content, so none are built. The way in, when a site needs them: a version is a folder of content built under a path prefix. `DOCS_ROOT` already selects the folder; the missing parts are a base path for the build, one `search.json` per version, and a switcher that links the same page across versions. Decide then whether old versions are built again on every change or kept as frozen builds.

## Still to verify

Each is checked with a small test at the start of its phase.

Checked at the start of phase 3b, on 2026-11-17:

- `@modelcontextprotocol/server` alone serves the stateless route on the Workers runtime. A throwaway Worker and then `src/worker.ts`, both under `wrangler dev`, answered Claude Code and Codex. Cloudflare's `agents` package is not used.
- Workers has a preview address per pull request: `wrangler versions upload --preview-alias pr-<number>` gives `pr-<number>-<worker>.<subdomain>.workers.dev`. Read in Cloudflare's documentation; not run, because it needs an account.
- A reusable workflow in a private repository under a personal account cannot be called from a repository under another account: GitHub offers only "accessible from repositories owned by the same user". Read in GitHub's documentation. So the kit is public, or each product repository copies the workflow.

Still open:

- A deploy. On the local Workers runtime the redirects in `_redirects` are also answered when the Worker runs first and hands the request to the static files; Cloudflare's documentation does not say so, so check it on the first deploy.
- CPU time on the free plan. Building the search index for the 703 sections of the vAPI docs takes about 35 ms on a laptop, and the free plan allows 10 ms of CPU for a request. Measure `search_docs` on the first deploy; the paid plan allows 30 seconds.
- The concurrency group of `docs-sync.yml`. `queue: max` is in GitHub's documentation, and `actionlint` 1.7.12 does not know it; GitHub ran the workflow with it on 2026-11-19. The documentation does not say that a group set at the top of a called workflow holds the whole run; if the first two runs overlap, the group moves to the job that calls the workflow.
- Safari itself, and a screen reader, for the copy buttons, the diagram per theme, the sidebar groups and the table box. Chrome, Firefox and WebKit 26.6 were tested; WebKit is the engine of Safari, driven through Playwright.

## Decisions that are yours

1. **Cloudflare account.** The plan needs one for hosting. Vercel also works but puts the MCP route in a separate function.
2. **Model key for the sync workflow.** A Claude subscription token (`claude setup-token`) is documented for personal repositories; an API key is recommended for organisation repositories.
3. **Public or private kit.** Public removes the clone token in each product repository's build and makes the shared workflow callable from any account. I recommend public once phase 2 is done.
4. **Name and accent colour**: answered on 2026-11-18. The product is Vertical Docs, a product of Vertical Labs, with the short name `vdocs` for the package and the Worker. The kit's own site stays black and white. The repository is `VerticalStudio-ai/vertical-docs`, and `docs-sync.yml` names it.
5. **First repository to connect**: answered. The vAPI docs come first (their source is already in Git), then the Vertical Studio docs.
