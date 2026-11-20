---
title: Run your docs locally
description: Start the live preview of the docs folder in your repository, and run the one check that decides whether a change to the docs is done.
order: 1
---

Run `npx vertical-docs dev` to read your docs as a site while you write, and `npx vertical-docs check` before you commit a change. Both run in the root of a repository that holds a docs folder, which [Add docs to your repository](/add-docs-to-your-repository/) writes. You need Node 22.23.4 or later. In a repository that uses pnpm, write `pnpm exec` in place of `npx`.

## Start the preview

```sh
npx vertical-docs dev
```

The command prints the address of the preview:

```text
┃ Local    http://localhost:4321/
```

Each Markdown file in `docs/content/` is one page, and the file path is the URL. The preview shows a change when you save a file. Press Ctrl+C to stop the preview.

## Check a change

```sh
npx vertical-docs check
```

The check builds the site into `docs/dist/`, then reads the build and fails for a link or an anchor that points nowhere and for a search result that opens nothing. [`check`](/reference/commands/#check) lists every mistake the command finds.

A passing check ends with the build summary and exits with code 0:

```text
[build] 2 page(s) built in 863ms
[build] Complete!
```

A failing check exits with code 1. Each problem is one line that names the file and says what to change:

```text
index.html: link "/guide/" points to no file in dist. Fix the link or add the page.
```

On GitHub, the workflow in `.github/workflows/docs.yml` runs the same check on every pull request and on every push to `main`.
