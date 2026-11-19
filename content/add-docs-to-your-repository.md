---
title: Add docs to your repository
description: Write a docs folder into your product's repository with one command, preview it as a live site, check it and commit it.
order: 2
---

Run `npx vertical-docs init` in the root of your repository. The repository then holds a `docs/` folder of plain Markdown that one command previews and another checks. You need Node 22.23 or later, on macOS or Linux: Windows is not tested.

## Write the docs folder

In the root of your repository:

```sh
npx vertical-docs init
```

`npx` first asks whether to install the package: answer `y`. `init` then prints each file it writes, and the next command:

```text
Wrote .github/workflows/docs-sync.yml
Wrote .github/workflows/docs.yml
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

## Preview the docs

```sh
npx vertical-docs dev
```

The command prints the address of the preview:

```text
┃ Local    http://localhost:4321/
```

Open that address to read the starter page, "Start your docs". Change a line in `docs/content/index.md` and save the file: the preview shows the change. Press Ctrl+C to stop the preview.

## Check the docs

```sh
npx vertical-docs check
```

The check builds the site into `docs/dist/` and fails for a broken link, a broken anchor or a search result that opens nothing. A passing check ends with the build summary and exits with code 0:

```text
[build] 2 page(s) built in 737ms
[build] Complete!
```

## Commit the docs

```sh
git add .github docs
git commit -m "Add docs"
```

`docs/.gitignore` keeps the build in `docs/dist/` out of the commit. On GitHub, the workflow in `.github/workflows/docs.yml` runs the same check on every pull request and on every push to `main`.

## Write your own pages

The starter page continues from here: it has you change the page, add a second page and set the name and the logo of the site.

The other pages of these docs are written from the repository of Vertical Docs itself. Where a page says `content/`, use `docs/content/` in your repository. Where a page runs `pnpm dev`, `pnpm check` or `pnpm run search`, run `npx vertical-docs dev`, `npx vertical-docs check` or `npx vertical-docs search`. [Commands](/reference/commands/) lists all five commands.
