---
title: Commands
description: The five commands of vertical-docs, with the docs folder each one reads, the files it writes and the way it fails.
order: 6
---

`vertical-docs` has five commands. Each takes the docs folder as an argument and uses `docs` when you name none. A command that fails says what to change and exits with a code other than 0.

```text
vertical-docs init [folder]
vertical-docs dev [folder]
vertical-docs build [folder]
vertical-docs check [folder]
vertical-docs search "<query>" [folder] [--json] [--url <site>]
```

## Run a command

`npx vertical-docs` runs a command in any repository, with or without a `package.json`. You need Node 22.23.4 or later, on macOS or Linux: Windows is not tested. `npx` asks before it installs the package. npm 10, which comes with Node 22, asks on every run, and npm 11 asks once.

```sh
npx vertical-docs check
```

In a JavaScript project, `npm install -D vertical-docs` adds the package to the development dependencies. `npx vertical-docs` then runs that installed version without the question, and a script in `package.json` can use the short name `vdocs`:

```json
{
	"scripts": {
		"docs": "vdocs dev"
	}
}
```

In a project that uses pnpm, `pnpm add -D vertical-docs` adds the package, with `-w` in the root of a workspace, and `pnpm exec vertical-docs` runs a command. `npx` stops with `EBADDEVENGINES` in a project whose `package.json` allows only pnpm.

```sh
pnpm add -D vertical-docs
pnpm exec vertical-docs check
```

> [!WARNING]
> Do not run `npx vdocs`. The name `vdocs` on npm belongs to another package, and `npx` downloads and runs that package in a repository that has not installed `vertical-docs`.

## init

`vertical-docs init [folder]` writes the docs folder and two workflows, and prints each file it writes. Run it in the root of the repository: the workflows go to `.github/workflows/` of the current folder.

| File | What it is |
|---|---|
| `docs/content/index.md` | The first page, a starter tutorial. |
| `docs/docs.config.json` | The name of the site and the other fields of the [site configuration](/reference/configuration/). |
| `docs/public/` | Placeholders for the logo, the favicon and the share image. |
| `docs/.gitignore` | Keeps `dist/` and `.wrangler/` out of Git. |
| `docs/wrangler.jsonc` | The settings that deploy the site as a [Cloudflare Worker](/reference/worker/). Replace `name` with your own before the first deploy. |
| `.github/workflows/docs.yml` | Runs `check` on every pull request and every push to `main`. With the repository variable `CLOUDFLARE_ACCOUNT_ID` and the secret `CLOUDFLARE_API_TOKEN`, the workflow then deploys `main` to the live site and a pull request to its own preview address. |
| `.github/workflows/docs-sync.yml` | After a code change on `main`, an agent edits the docs to match and opens one pull request. The agent needs the repository secret `ANTHROPIC_API_KEY`: without that secret a run does nothing. |

`init` leaves a file that exists as it is, so a second run writes only the files that are missing.

`vertical-docs init website` names the folder `website`, in the workflows too. For a folder deeper than one level, add one `../` for each further level to `main` in its `wrangler.jsonc`, so that the path reaches `node_modules/` in the root of the repository. For `packages/docs`:

```jsonc
"main": "../../node_modules/vertical-docs/src/worker.ts",
```

## dev

`vertical-docs dev [folder]` starts a live preview of the docs folder and prints its address, `http://localhost:4321/`. The preview shows a change to a page or to `docs.config.json` when you save the file.

Press Ctrl+C to stop the preview. One install of Vertical Docs previews one docs folder at a time: stop the preview of one folder before you start the preview of another.

## build

`vertical-docs build [folder]` writes the site to `dist/` in the docs folder: the pages, and the [files for agents](/reference/agents/). The build stops for a page that breaks one of the [rules the build checks](/write-a-page/#follow-the-rules-the-build-checks).

## check

`vertical-docs check [folder]` builds the site, then reads the build and fails for these mistakes in the docs folder:

- a link or an anchor that points to no page or heading of the site
- a search result that opens nothing
- a `###` heading with no `##` heading above it
- a line in `public/_redirects` that points to no page or does not end with `301`
- a missing `public/favicon.svg` or `public/share.png`

Each problem is one line that says what to change, and the command exits with code 1:

```text
index.html: link "/guide/" points to no file in dist. Fix the link or add the page.
```

## search

`vertical-docs search "<query>" [folder]` prints the sections of the last build that match a query, best first, so run `build` or `check` before it. `--json` prints the results as JSON, and `--url <site>` searches a deployed site and needs no build. [Search from the terminal](/search-from-the-terminal/) shows the output of each.

## Update to a new version

The version of Vertical Docs a repository uses is written in its two workflows: in the install step of `docs.yml`, and as the commit after `@` in `docs-sync.yml`. To move both, delete the two files and run `init` from the new version, with its number in place of `0.1.0`:

```sh
rm .github/workflows/docs.yml .github/workflows/docs-sync.yml
npx vertical-docs@0.1.0 init
```

`init` writes the two workflows for that version and leaves every other file as it is. Name the docs folder after `init` when the folder is not `docs`.

```text
Wrote .github/workflows/docs-sync.yml
Wrote .github/workflows/docs.yml
Next: npx vertical-docs dev docs
```

A project with `vertical-docs` in its development dependencies updates the package there as well.
