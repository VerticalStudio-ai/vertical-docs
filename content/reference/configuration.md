---
title: Site configuration
description: Set the site name, its description, its public address, the repository link and the accent colour, and replace the logo, favicon and share image.
order: 3
---

A site is one folder that holds a configuration file, a `public/` folder and a `content/` folder with the pages. Change `docs.config.json` for the name, the description, the public address, the repository link, the accent colour and the header tabs, and replace the files in `public/` for the logo, the favicon and the share image.

## docs.config.json

```json
{
	"name": "Vertical Docs",
	"description": "Markdown files become a website, a Markdown copy of every page and one search index for readers, terminals and agents.",
	"url": "https://vdocs.example",
	"repo": "https://github.com/VerticalStudio-ai/vertical-docs",
	"accent": "#171717"
}
```

| Field | Used for |
|---|---|
| `name` | The text next to the logo and the end of the browser tab title. |
| `description` | The summary under the name in [`/llms.txt`](/reference/agents/#llmstxt). |
| `url` | The public address of the site: `https://` and the host name, with no path and no slash at the end. The canonical URL and the share tags of every page start with it, and so does every link in `/sitemap.xml`, `/robots.txt` and [`/llms.txt`](/reference/agents/#llmstxt). |
| `repo` | The GitHub link in the header. |
| `accent` | The colour of links, the current page in the sidebar, the focus ring and the edge of a callout. |
| `tabs` | Optional. The folders that become [header tabs](#header-tabs). A site without `tabs` has one sidebar with every page. |

## Content folder

The site reads its pages and their images from `content/` in the project folder, and `docs.config.json` and `public/` from the folder that holds `content/`. Set the `DOCS_ROOT` environment variable to the content folder of another site, such as the docs of a product repository:

```sh
DOCS_ROOT=../product/docs/content pnpm check
```

This command builds the pages in `../product/docs/content/` with `../product/docs/docs.config.json` and the files in `../product/docs/public/`.

`DOCS_ROOT` is a path from the project folder, or a full path. Every command reads it: `pnpm dev` shows that site, and `pnpm check` builds and checks it.

## Accent colour

`accent` is one CSS colour, such as `#0070f3`. The site keeps the hue and adjusts the lightness for each theme, so the same colour is readable on the light and on the dark background.

The default, `#171717`, is a neutral colour: the site is black on white in the light theme and white on black in the dark theme.

## Header tabs

`tabs` is a list of folders directly under `content/`. Each folder becomes a tab in the header, in the order of the list, and the sidebar shows only the pages of the tab that holds the page being read.

```json
"tabs": ["guides", "reference"]
```

With this line the header has three tabs. The first tab is always "Overview": it opens the home page and holds every page outside the listed folders. The other two take their names from the titles of `content/guides/index.md` and `content/reference/index.md`, and each opens that page.

In the sidebar of a folder's tab, the folder's index page comes first and the folder's pages and groups follow. The previous and next links at the end of a page stay inside the tab. On a small screen the tabs are in the menu, above the pages.

Tabs change the header and the sidebar only. The address of every page, the search and `/llms.txt` stay as they are without tabs.

The build stops for a name that is not a folder with an index page:

```txt
docs.config.json lists the tab "guides", but content/guides/index.md does not exist. A tab is a folder directly under content/, and its index page names the tab.
```

## Logo and favicon

| File | Shown |
|---|---|
| `public/logo.svg` | In the header, 20 pixels high, next to the name. |
| `public/favicon.svg` | In the browser tab. |
| `public/share.png` | In the preview of a link to the site, in a chat or on a social network. Make it 1,200 by 630 pixels. |

The logo is placed in the page as inline SVG. Draw it with `fill="currentColor"` and the logo takes the text colour of the theme.

## Old addresses

A site that moves keeps its old addresses in `public/_redirects`. Each line is the old path, the page that replaces it and `301`:

```txt
/guides/setup /write-a-page/ 301
```

Cloudflare answers a request for the old path with a permanent redirect when the site runs as a [Worker](/reference/worker/). `pnpm check` fails for a line that points to no page or that does not end with `301`.
