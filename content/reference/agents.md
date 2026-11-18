---
title: Files for agents
description: The three files an agent can fetch from a site without rendering a page, each with its URL and its format.
order: 4
---

A site serves every page as Markdown, a list of all pages in `/llms.txt` and every section of every page in `/search.json`. All three are static files, built with the pages.

## Markdown copy of a page

The Markdown copy of a page is at the URL of the page with `.md` in place of the last slash. The copy of `/reference/` is `/reference.md`, and the copy of the first page is `/index.md`.

With `pnpm dev` running:

```sh
curl http://localhost:4321/reference.md
```

The copy starts with the page title as a `#` heading and the page description. The rest is the Markdown file as written, except that the path of an image becomes the full address of the image file on the site:

```md
# Reference

Look up the frontmatter fields, the Markdown a page can use, the site configuration file, the files for agents and the Worker routes.

The reference pages list every option docs-kit reads.

- [Frontmatter fields](/reference/frontmatter/): the three fields at the top of a page.
- [Markdown in a page](/reference/markdown/): headings, lists, code blocks, tables and callouts.
- [Site configuration](/reference/configuration/): the name, the description, the public address, the accent colour, the logo, the favicon and old addresses.
- [Files for agents](/reference/agents/): the Markdown copy of a page, `llms.txt` and `search.json`.
- [Worker routes](/reference/worker/): Markdown from a page URL and the MCP server.
```

Each page links to its copy twice: "View this page as Markdown" at the end of the page, and a `link` element with `rel="alternate"` and `type="text/markdown"` in the HTML head. The Copy page button beside the page title puts the same Markdown on the clipboard.

## llms.txt

`/llms.txt` lists every page with its description in the [llms.txt format](https://llmstxt.org/). Each link is the full address of the Markdown copy of the page, which starts with `url` from `docs.config.json`. Pages outside a folder come first, under "Docs", and each folder then has its own section. Inside a section the pages are in the order of the sidebar.

```sh
curl http://localhost:4321/llms.txt
```

```md
# docs-kit

> Markdown files become a website, a Markdown copy of every page and one search index for readers, terminals and agents.

## Docs

- [Run docs-kit locally](https://docs-kit.example/index.md): Install the dependencies, start the local site, and run the one check that decides whether a change is done.
- [Write a page](https://docs-kit.example/write-a-page.md): Add a Markdown file to the content folder and read it as a page on the local site.
- [Add an image to a page](https://docs-kit.example/add-an-image.md): Put an image file beside the page, write one Markdown line with its alt text, and show a diagram that follows the light and the dark theme.
- [Order pages in the sidebar](https://docs-kit.example/order-the-sidebar.md): Set the position of a page with one frontmatter field, and group pages by putting them in a folder.
- [Search the site](https://docs-kit.example/search-the-site.md): Open the search with one key, type a word, and go to the section of the page that matches.
- [Search from the terminal](https://docs-kit.example/search-from-the-terminal.md): Run the search of the site as a command, and get the same ranked sections as plain text or as JSON.

## Reference

- [Reference](https://docs-kit.example/reference.md): Look up the frontmatter fields, the Markdown a page can use, the site configuration file, the files for agents and the Worker routes.
- [Frontmatter fields](https://docs-kit.example/reference/frontmatter.md): The three fields a page can set at the top of its Markdown file, with their limits.
- [Markdown in a page](https://docs-kit.example/reference/markdown.md): The Markdown a page can use, with the source for each element and the way the site shows it.
- [Site configuration](https://docs-kit.example/reference/configuration.md): Set the site name, its description, its public address, the repository link and the accent colour, and replace the logo, favicon and share image.
- [Files for agents](https://docs-kit.example/reference/agents.md): The three files an agent can fetch from a site without rendering a page, each with its URL and its format.
- [Worker routes](https://docs-kit.example/reference/worker.md): Run the built site as a Cloudflare Worker, fetch a page as Markdown from its own URL and call the two MCP tools.
```

The first line is `name` from `docs.config.json` and the quote is `description`. See [Site configuration](/reference/configuration/).

## search.json

`/search.json` is one array with a record for each section of each page. The site search and `pnpm run search` both read this file. To read one record:

```sh
curl -s http://localhost:4321/search.json | jq '.[] | select(.url == "/#start-the-local-site")'
```

```json
{
  "url": "/#start-the-local-site",
  "title": "Run docs-kit locally",
  "heading": "Start the local site",
  "text": "pnpm dev The local site is at http://localhost:4321/. Each Markdown file in content/ is one page, and the file path is the URL."
}
```

| Field | Holds |
|---|---|
| `url` | The page URL, with the anchor of the heading. The record for the text before the first heading has no anchor. |
| `title` | The title of the page. |
| `heading` | The heading of the section, or an empty text for the record without an anchor. |
| `text` | The text of the section on one line, without Markdown marks. Code keeps its characters. |
