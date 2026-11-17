# docs-kit

A static docs site generator. Markdown in `content/` becomes a website, per-page Markdown, one search index, a command-line search and an MCP server. The design and its reasons are in `design/architecture.md`.

## Commands

- `pnpm dev`: local site.
- `pnpm check`: the only definition of done. Run it before you say a change works, and fix what it reports instead of working around it.
- `pnpm fix`: format and apply safe lint fixes.
- `pnpm search "<query>"`: the same ranked search the site and the MCP server use. Arrives in phase 2.

## Map

- `content/`: the docs, plain Markdown. Writing rules: `WRITING.md`.
- `src/core/`: all logic, as pure functions. Tests sit beside each file.
- `src/load.ts`: the only file that reads the content collection.
- `src/pages/`, `src/components/`: the website. They call core and render.
- `src/styles/global.css`: every style, with the colour and font tokens in one block at the top.
- `docs.config.json`, `public/`: what a docs site replaces to brand itself: name, repository link, accent colour, logo and favicon.
- `src/cli.ts`, `src/worker.ts`: the terminal and MCP edges. They call core and do input and output.
- `scripts/check-dist.ts`: link, anchor, size and dependency checks on the build.

## Rules the tools cannot check

Types, style, import boundaries, unused code, sizes and links are checked by `pnpm check`. These are not:

1. Add nothing a current requirement does not need: no options, no fallbacks, no handling for cases that cannot happen. Input is validated once, by the content schema; trust it after that.
2. Use the platform before code, and code before a dependency. The dependency list is fixed. To propose a change, say in the pull request what it replaces and why 50 lines of our own will not do.
3. One home per fact. Before adding a function, search `src/core/` for one that already does it.
4. Do not extract a helper, component or option before its third real use. Two similar blocks are fine.
5. A module hides one decision behind a small interface. Split a file when it holds two responsibilities, not because it is long.
6. Each exported core function has one line stating what it guarantees. Elsewhere, comment only why. Delete a comment that repeats the code.
7. Change core behaviour test-first. Never edit or delete a test to make a change pass; if a test is wrong, say so in the pull request.
8. Keep the diff to the task: no drive-by refactors, no files outside the map, no new documents unless asked.
9. Finish with the deletion test. For each line you added, ask what breaks without it. If nothing does, remove it.
