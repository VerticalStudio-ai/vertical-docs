---
title: Site configuration
description: Set the site name, its description, its public address, the repository link and the accent colour, and replace the logo, favicon and share image.
order: 3
---

A site is one docs folder: `docs/docs.config.json`, `docs/public/` and `docs/content/` with the pages. Change `docs.config.json` for the name, the description, the public address, the repository link, the accent colour, the header tabs and the home page, and replace the files in `public/` for the logo, the favicon and the share image.

## docs.config.json

`init` writes the file with placeholders:

```json
{
  "name": "Your Docs",
  "description": "What your product does, in one sentence.",
  "url": "https://docs.example.com",
  "repo": "https://github.com/your-org/your-repo",
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
| `home` | Optional. `true` shows the first page as a [home page](#home-page), without the sidebar. |

## Docs folder

Every command reads one docs folder: the pages and their images in `content/`, and `docs.config.json` and `public/` beside it. The folder is `docs` in the folder where the command runs. Name another folder after the command:

```sh
npx vertical-docs check website
```

This command builds the pages in `website/content/` with `website/docs.config.json` and the files in `website/public/`, and writes the site to `website/dist/`.

`npx vertical-docs init website` writes a docs folder with that name, and names the folder in the two workflows.

## Accent colour

`accent` is one CSS colour, such as `#0070f3`. The site keeps the hue and adjusts the lightness for each theme, so the same colour is readable on the light and on the dark background.

The default, `#171717`, is a neutral colour: the site is black on white in the light theme and white on black in the dark theme.

## Header tabs

`tabs` is a list of folders directly under `docs/content/`. Each folder becomes a tab in the header, in the order of the list, and the sidebar shows only the pages of the tab that holds the page being read.

```json
"tabs": ["guides", "reference"]
```

With this line the header has three tabs. The first tab is always "Overview": it opens the home page and holds every page outside the listed folders. The other two take their names from the titles of `docs/content/guides/index.md` and `docs/content/reference/index.md`, and each opens that page.

In the sidebar of a folder's tab, the folder's index page comes first and the folder's pages and groups follow. The previous and next links at the end of a page stay inside the tab. On a small screen the tabs are in the menu, above the pages. On a wide screen the tabs are one row that does not wrap, so keep the list short.

Tabs change the header and the sidebar only. The address of every page, the search and `/llms.txt` stay as they are without tabs.

The build stops for a name that matches nothing directly under `docs/content/`. The message names the file to add, with its path from the docs folder:

```txt
docs.config.json lists the tab "guides", but content/guides/index.md does not exist. A tab is a folder directly under content/, and its index page names the tab.
```

## Home page

`home` set to `true` shows the first page of the site, `docs/content/index.md`, as a home page: one centred column under a large title, without the sidebar, the list of headings and the previous and next links.

```json
"home": true
```

The header of the home page has a "Docs" link to the first of the other pages, and the sidebar of every other page leaves the home page out. The name of the site in the header opens the home page.

The home page is plain Markdown like every page. Three things look different on it:

- The first code block is the command to start with: a narrow block with a `$` before the command.
- A list is a grid of entries, and the bold words at the start of an entry are its title.
- An image has a frame.

The address of the page, its Markdown copy, the search and `/llms.txt` stay as they are without `home`.

## Logo and favicon

| File | Shown |
|---|---|
| `docs/public/logo.svg` | In the header, 20 pixels high, next to the name. |
| `docs/public/favicon.svg` | In the browser tab. |
| `docs/public/share.png` | In the preview of a link to the site, in a chat or on a social network. Make it 1,200 by 630 pixels. |

The logo is placed in the page as inline SVG. Draw it with `fill="currentColor"` and the logo takes the text colour of the theme.

## Old addresses

A site that moves keeps its old addresses in `docs/public/_redirects`. Each line is the old path, the page that replaces it and `301`:

```txt
/getting-started / 301
```

Cloudflare answers a request for the old path with a permanent redirect when the site runs as a [Worker](/reference/worker/). `vertical-docs check` fails for a line that points to no page or that does not end with `301`.
