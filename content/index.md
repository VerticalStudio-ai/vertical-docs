---
title: Run Vertical Docs locally
description: Install the dependencies, start the local site, and run the one check that decides whether a change is done.
order: 1
---

Run `pnpm install` once, `pnpm dev` to read the site while you write, and `pnpm check` before you call a change done. You need Node 22.23 or later and the pnpm version pinned in `package.json`.

## Install the dependencies

```sh
pnpm install
```

The last line names the pinned pnpm version:

```text
Done in 2.5s using pnpm v12.21.0
```

## Start the local site

```sh
pnpm dev
```

The local site is at `http://localhost:4321/`. Each Markdown file in `content/` is one page, and the file path is the URL.

## Check a change

```sh
pnpm check
```

`pnpm check` checks types, lint and formatting, unused code and tests. `pnpm check` then builds the site into `dist/` and checks every link, anchor and search result in the build, the size of the CSS and JavaScript, and the dependency list in `package.json`.

A passing run ends with the build summary and exits with code 0:

```text
[build] 15 page(s) built in 668ms
[build] Complete!
```

A failing run stops at the first failing step and exits with a non-zero code. The message names the file and says what to change:

```text
index.html: link "/nope" points to no file in dist. Fix the link or add the page.
```
