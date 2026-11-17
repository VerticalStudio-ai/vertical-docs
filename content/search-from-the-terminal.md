---
title: Search from the terminal
description: Run the search of the site as a command, and get the same ranked sections as plain text or as JSON.
order: 6
---

`pnpm run search "<query>"` prints the sections that match a query, best first. The command reads the search index of the last build, so the order is the order the site shows.

## Search the last build

Build the site with `pnpm check`, then search:

```sh
pnpm run search "favicon"
```

The command prints up to ten results with an empty line between them. Each result is the page title and the section heading, the URL of the section, and the text around the first word that matched. The first result:

```text
Site configuration › Logo and favicon
/reference/configuration/#logo-and-favicon
… pixels high, next to the name. public/favicon.svg In the browser tab. The logo is placed in the page as inline SVG. Draw it with fill="currentColor" and the …
```

> [!WARNING]
> Write `pnpm run search`, with `run`. `pnpm search` on its own is a command of pnpm that searches the npm registry.

## Get the results as JSON

Add `--json` when a program reads the results. The output is one array, best result first, so `jq` can take the first result:

```sh
pnpm run search "favicon" --json | jq '.[0]'
```

```json
{
  "url": "/reference/configuration/#logo-and-favicon",
  "title": "Site configuration",
  "heading": "Logo and favicon",
  "snippet": "… pixels high, next to the name. public/favicon.svg In the browser tab. The logo is placed in the page as inline SVG. Draw it with fill=\"currentColor\" and the …"
}
```

## Search a deployed site

Add `--url` with the address of a site. The command then reads `/search.json` from that site, not from `dist/`. With `pnpm dev` running:

```sh
pnpm run search "favicon" --url http://localhost:4321
```

The output is the same as for the last build when the local site shows the same pages.

## When the command fails

The command exits with code 1 and says what to change. Before the first build there is no index:

```text
Cannot read dist/search.json. Run pnpm check first: it builds the site and the search index.
```

A query that matches nothing is not a failure. The command prints `No results for` with the query and exits with code 0.
