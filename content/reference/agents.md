---
title: Files for agents
description: The three files an agent can fetch from a site without rendering a page, each with its URL and its format.
order: 4
---

A site serves every page as Markdown, a list of all pages in `/llms.txt` and every section of every page in `/search.json`. All three are static files, built with the pages.

## Markdown copy of a page

The Markdown copy of a page is at the URL of the page with `.md` in place of the last slash. The copy of `/reference/` is `/reference.md`, and the copy of the first page is `/index.md`.

With the preview running (`npx vertical-docs dev`) in a repository where `init` has just run:

```sh
curl -s http://localhost:4321/index.md | head -n 5
```

The copy starts with the page title as a `#` heading and the page description. The rest is the Markdown file as written, except that the path of an image becomes the full address of the image file on the site:

```md
# Start your docs

Change this starter page, add a second page, set the name and logo of the site, and check the docs before you publish them.

This page is the file `docs/content/index.md`. Replace its text with your own, add one Markdown file for each further page, and run the check before you publish.
```

Each page links to its copy twice: "View this page as Markdown" at the end of the page, and a `link` element with `rel="alternate"` and `type="text/markdown"` in the HTML head. The Copy page button beside the page title puts the same Markdown on the clipboard, and the menu next to it opens the copy, or opens ChatGPT or Claude with a prompt that names the address of the copy.

## llms.txt

`/llms.txt` lists every page with its description in the [llms.txt format](https://llmstxt.org/). Each link is the full address of the Markdown copy of the page, which starts with `url` from `docs.config.json`. Pages outside a folder come first, under "Docs", and each folder then has its own section. Inside a section the pages are in the order of the sidebar.

```sh
curl http://localhost:4321/llms.txt
```

```md
# Your Docs

> What your product does, in one sentence.

## Docs

- [Start your docs](https://docs.example.com/index.md): Change this starter page, add a second page, set the name and logo of the site, and check the docs before you publish them.
```

The first line is `name` from `docs.config.json` and the quote is `description`. See [Site configuration](/reference/configuration/).

## search.json

`/search.json` is one array with a record for each section of each page. The site search and `vertical-docs search` both read this file. To read one record:

```sh
curl -s http://localhost:4321/search.json | jq '.[] | select(.url == "/#add-a-page")'
```

```json
{
  "url": "/#add-a-page",
  "title": "Start your docs",
  "heading": "Add a page",
  "text": "Save this as docs/content/install.md: --- title: Install the product description: Install the product with one command and confirm that it runs. --- Install the product with one command. The file path is the address of a page: the new page is at http://localhost:4321/install/, and its title is in the sidebar."
}
```

| Field | Holds |
|---|---|
| `url` | The page URL, with the anchor of the heading. The record for the text before the first heading has no anchor. |
| `title` | The title of the page. |
| `heading` | The heading of the section, or an empty text for the record without an anchor. |
| `text` | The text of the section on one line, without Markdown marks. Code keeps its characters. |
