# Features

What docs-kit does, in the words of someone who uses it. One line per feature, grouped by who benefits. A built line ends with its proof: a number, a test or a command. A planned line names its phase in the [plan](architecture.md).

Every phase updates this list. Write nothing here that a tool result has not shown.

## For readers

- **Fast pages** (built). Lighthouse scores 100 for performance, accessibility, best practices and SEO, and CI fails a change that drops below 100, or below 95 for performance. Proof: five pages scored 100 in all four categories in each of three runs (local run on the phase 2 build, 2026-11-17); the scores CI enforces are in `lighthouserc.json`.
- **Tiny downloads** (built). A page loads 2.1 KB of CSS and 0.8 KB of JavaScript, gzipped. A build over the budget of 4 KB and 1 KB fails. Proof: `scripts/check-dist.ts` and its tests; measured on the phase 2 build, 2026-11-17.
- **Search that opens the right section** (built). Press `/`, `⌘K` or `Ctrl+K`, type a word, and the result opens the page at the heading that matched, also for a word that appears only under a small heading. Proof: the test "a word that appears only in an h3 section finds that section first" in `src/core/search.test.ts`; in Chrome, typing `indented` gave one result and opened `/reference/markdown/#a-part-of-a-section` (2026-11-17).
- **Search forgives typing** (built). The first letters of a word are enough, and a small typing mistake still finds the word. Proof: the test "finds a word from its first letters and through a typing mistake".
- **Search costs nothing until it is used** (built). A page downloads no search code. The first time search opens, the browser fetches 6.1 KB of search code, gzipped, and the index. Proof: the request log of the built site shows the search worker and `search.json` only after the first open (2026-11-17); a build with more than 8 KB of on-demand JavaScript fails.
- **Search works from the keyboard** (built). Results are links: `Tab` moves, `Enter` opens, `Esc` closes, and a Close button serves phones. Proof: driven with key presses in Chrome, 2026-11-17.
- **Works without JavaScript** (built). Every page is complete static HTML. JavaScript only switches the theme and opens the search. Proof: the page text is in the files in `dist/`; the only scripts are the three inline ones `check-dist` measures.
- **Light and dark theme** (built). The theme follows the system and remembers a choice, with no flash on load. Proof: phase 1 screenshots in both themes; the saved choice is applied by an inline script before the first paint.
- **Readable code blocks** (built). Every code colour passes the 4.5:1 contrast minimum in both themes. Proof: measured in phase 1.
- **Mobile navigation with no JavaScript** (built). The sidebar opens with the Popover API. Proof: phase 1.
- **Active section in the table of contents** (built, Chrome only). CSS marks the section being read; Safari and Firefox show a plain list. Proof: tested in Chrome 157, Safari 26.2 and Firefox 151 on 2026-11-17.

## For writers

- **Plain Markdown** (built). One file is one page, one folder is one sidebar group, and a page has three frontmatter fields. Proof: the pages in `content/`.
- **Mistakes stop the build** (built). A broken link or anchor, a search result that opens nothing, a wrong heading level, a code block without a language, HTML in a page, a field over its limit or a folder without an index page fails `pnpm check` with a message that says what to change. Proof: the tests in `scripts/check-dist.test.ts`, `src/core/writing.test.ts` and `src/core/nav.test.ts`.
- **Docs can live in another repository** (planned, phase 3). Tested on 2026-11-17 with a content folder outside the project (`DOCS_ROOT`); not switched on yet.
- **Docs that update themselves from code changes** (planned, phase 3).

## For agents

- **A Markdown copy of every page** (built). `/<page>.md` returns the page as Markdown with its title, and each HTML page names its copy in a `link rel="alternate"` element. Proof: `curl http://localhost:4321/reference.md`, quoted in `content/reference/agents.md`.
- **`llms.txt`** (built). One file lists every page with its description, grouped like the sidebar, linking the Markdown copies. Proof: `curl http://localhost:4321/llms.txt`, and the test "writes llms.txt in sidebar order" in `src/core/llms.test.ts`.
- **`search.json`** (built). Every section of every page as `{ url, title, heading, text }` in one static file, usable with `curl` and `jq`. Every URL in it is checked on each build. Proof: 43 records for 10 pages, 5.8 KB gzipped (2026-11-17); the test "fails for a search result that points to no page or to no heading".
- **The same search in a terminal** (built). `pnpm run search "<query>"` prints the sections the site shows, in the same order, as plain text or JSON, for the last build or for a deployed site. Proof: the query `sidebar` gave the same nine URLs in the same order in the dialog and in the terminal (2026-11-17); the tests in `src/cli.test.ts`.
- **An MCP server** with `search_docs` and `get_page` (planned, phase 3).
- **Markdown for `Accept: text/markdown`** on any page URL (planned, phase 3).

## For the team that runs it

- **Brand in three steps** (built). A site sets its name, one accent colour, and its logo and favicon. The accent is adjusted per theme so it stays readable. Proof: phase 1, same result in Chrome, Safari and Firefox.
- **One command decides done** (built). `pnpm check` runs types, lint, unused code, tests, the build and the checks on the build. Proof: `package.json`; CI runs the same command.
- **Small and fixed dependency list** (built). Four packages at run time and five for development, checked on every build. Proof: the test "fails for a dependency that is not on the list".
- **Hosting on Cloudflare Workers** (planned, phase 3).
- **Search-engine extras** (planned, phase 3): canonical URLs, `sitemap.xml`, `robots.txt`, share-image tags and structured data. They need the site's public URL.
- **Final name and wordmark** (planned, phase 4).
