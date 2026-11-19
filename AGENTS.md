# Vertical Docs

A static docs site generator. Markdown in `content/` becomes a website, per-page Markdown, one search index, a command-line search and an MCP server. The design and its reasons are in `design/architecture.md`.

## Commands

- `pnpm dev`: local site.
- `pnpm check`: the only definition of done. Run it before you say a change works, and fix what it reports instead of working around it.
- `pnpm fix`: format and apply safe lint fixes.
- `pnpm run search "<query>"`: the ranked search the site uses, on the last build. Write `run`: `pnpm search` alone is pnpm's own registry search.

## Map

- `content/`: the docs, plain Markdown, with their images beside the pages. Writing rules: `WRITING.md`. `DOCS_ROOT` points every command at the `content/` folder of another site.
- `src/core/`: all logic, as pure functions. Tests sit beside each file.
- `src/load.ts`: the only file that reads the content folder: the pages, and the URL of each image.
- `src/pages/`, `src/components/`: the website. They call core and render.
- `src/styles/global.css`: every style, with the colour and font tokens in one block at the top. The font files are in `src/fonts/`.
- `docs.config.json`, `public/`: what a docs site brings, beside its `content/` folder: name, public address, repository link, accent colour, header tabs, logo, favicon, share image and old addresses.
- `package.json`: also what the published package is: its name, version, `files` list and the two command names. `package.test.ts` holds the list and the version the sync workflow names.
- `template/`: the files `vertical-docs init` writes into a product's repository, as real files: the docs folder as `docs/`, the two workflows, and the section for the product's `AGENTS.md`.
- `src/cli.ts`, `src/worker.ts`: the terminal and Cloudflare edges. They call core and do input and output. `wrangler.jsonc` names the Worker and the build it serves.
- `src/check.ts`: the checks on a built site: links, anchors, heading order, search results, redirects, favicon, share image and sizes. `vertical-docs check` runs them on a product's docs.
- `scripts/check-dist.ts`: the last step of `pnpm check`: the same site checks on `dist/`, and the dependency list, which is a rule of the kit and not of a site.
- `.github/workflows/`: `ci.yml` runs the check and tries the packed package in an empty folder, `docs-sync.yml` is what a product repository calls to keep its docs in step with its code, and `publish.yml`, started by hand, puts the version in `package.json` on npm.
- `lighthouserc.json`: the Lighthouse scores CI enforces on the build.
- `design/features.md`: what the product does, in a customer's words. Every phase updates it: one line per feature, and a built line carries its proof.

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
