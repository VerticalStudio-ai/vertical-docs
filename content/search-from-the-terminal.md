---
title: Search from the terminal
description: Run the search of your docs as a command, and get the same ranked sections as plain text or as JSON.
order: 7
---

`npx vertical-docs search "<query>"` prints the sections of your docs that match a query, best first. The command reads the search index of the last build, so the order is the order the site shows.

## Search the last build

Build the docs with `check`, then search. In a repository where `init` has just run:

```sh
npx vertical-docs check
npx vertical-docs search "favicon"
```

The command prints up to ten results with an empty line between them. Each result is the page title and the section heading, the URL of the section, and the text around the first word that matched. The starter page has one section with the word:

```text
Start your docs › Set the name and the logo
/#set-the-name-and-the-logo
… your repository and the accent colour. The logo, the favicon and the share image are the three files in docs/public/. Replace the placeholders with your own.
```

The command reads the folder `docs`. Name another folder after the query: `npx vertical-docs search "favicon" website`.

## Get the results as JSON

Add `--json` when a program reads the results. The output is one array, best result first, so `jq` can take the first result:

```sh
npx vertical-docs search "favicon" --json | jq '.[0]'
```

```json
{
  "url": "/#set-the-name-and-the-logo",
  "title": "Start your docs",
  "heading": "Set the name and the logo",
  "snippet": "… your repository and the accent colour. The logo, the favicon and the share image are the three files in docs/public/. Replace the placeholders with your own."
}
```

## Search a deployed site

Add `--url` with the address of a site. The command then reads `/search.json` from that site and needs no build. With the preview running (`npx vertical-docs dev`):

```sh
npx vertical-docs search "favicon" --url http://localhost:4321
```

The output is the same as for the last build when the preview shows the same pages.

## When the command fails

The command exits with code 1 and says what to change. Before the first build there is no index, and the message names the file with its full path:

```text
Cannot read /home/you/product/docs/dist/search.json. Run vertical-docs build first, or name the folder that holds the docs: vertical-docs search "<query>" <folder>
```

A query that matches nothing is not a failure. The command prints `No results for` with the query and exits with code 0.
