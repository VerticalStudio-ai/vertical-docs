---
title: Add docs to your repository
description: Write a docs folder into your product's repository with one command, preview it as a live site, check it and commit it.
order: 2
---

Run `npx vertical-docs init` in the root of your repository. The repository then holds a `docs/` folder of plain Markdown that one command previews and another checks. You need Node 22.23.4 or later, on macOS or Linux: Windows is not tested.

## Write the docs folder

In the root of your repository:

```sh
npx vertical-docs init
```

`npx` first asks whether to install the package: answer `y`. `init` then prints each file it writes, and the next command:

```text
Wrote .github/workflows/docs-sync.yml
Wrote .github/workflows/docs.yml
Wrote AGENTS.md
Wrote docs/content/index.md
Wrote docs/docs.config.json
Wrote docs/.gitignore
Wrote docs/public/favicon.svg
Wrote docs/public/logo.svg
Wrote docs/public/share.png
Wrote docs/wrangler.jsonc
Next: npx vertical-docs dev docs
```

The pages are the Markdown files in `docs/content/`. What every other file is for is listed under [`init`](/reference/commands/#init).

In a repository that has an `AGENTS.md`, `init` adds its lines at the end of that file and prints `Added the docs section to AGENTS.md` in place of `Wrote AGENTS.md`.

In a repository that uses pnpm, add the package first, and write `pnpm exec` in place of `npx` in every command of this tutorial. In the root of a workspace, `pnpm add` needs `-w` as well.

```sh
pnpm add -D vertical-docs
pnpm exec vertical-docs init
```

`init` then names `pnpm exec` in its last line, in the starter page and in `AGENTS.md`, and nothing asks before a command runs. `pnpm add` changes `package.json` and `pnpm-lock.yaml`: add both to the commit in the last step.

## Preview the docs

In the root of your repository, start the live preview:

```sh
npx vertical-docs dev
```

The command prints the address of the preview:

```text
┃ Local    http://localhost:4321/
```

Open that address to read the starter page, "Start your docs". Change a line in `docs/content/index.md` and save the file: the preview shows the change. Press Ctrl+C to stop the preview.

## Check the docs

In the root of your repository:

```sh
npx vertical-docs check
```

The check builds the site into `docs/dist/` and fails for a link to a page that does not exist, a broken anchor or a search result that opens nothing. A passing check ends with the build summary and exits with code 0:

```text
[build] 2 page(s) built in 737ms
[build] Complete!
```

## Commit the docs

```sh
git add .github AGENTS.md docs
git commit -m "Add docs"
```

Git reports ten changed files: the files `init` wrote. `docs/.gitignore` keeps the build in `docs/dist/` out of the commit. On GitHub, the workflow in `.github/workflows/docs.yml` runs the same check on every pull request and on every push to `main`.

## Keep the docs in step with the code

The lines in `AGENTS.md` tell a coding agent such as Claude Code or Codex, working in your repository, to edit the page when a change to the code changes behaviour the page describes, to follow the [writing rules](/reference/commands/#rules) and to run the check. The agent works in your own session: the repository needs no key and no further setup.

The workflow in `.github/workflows/docs-sync.yml` is optional. It has an agent on GitHub do the same after a push to `main`, and does nothing until the repository has the secret `ANTHROPIC_API_KEY`.

## Write your own pages

The starter page, `docs/content/index.md`, continues from here: it has you change the page, add a second page and set the name and the logo of the site.

[Write a page](/write-a-page/) lists the rules the build checks for every page, and [Commands](/reference/commands/) lists all six commands.
