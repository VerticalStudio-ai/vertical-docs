---
title: Markdown in a page
description: The Markdown a page can use, with the source for each element and the way the site shows it.
order: 2
---

A page is plain Markdown: headings, paragraphs, lists, links, code, tables, quotes and callouts. Each section shows an element as the site renders it.

## Headings

Use `##` for a section and `###` for a part of a section. The page title comes from frontmatter, so a page has no `#` heading. Each heading is an anchor: the table of contents and other pages link to it.

### A part of a section

A `###` heading appears indented in the table of contents.

## Text and links

Write **bold** with two asterisks and *emphasis* with one. Link to another page by its path, [like this link to the first page](/), and to a section by adding the heading's anchor, [like this link to the callouts](#callouts). The build fails when a link or an anchor points nowhere.

## Lists

A list of items:

- One Markdown file is one page.
- One folder is one group in the sidebar.
- One configuration file sets the name and the accent colour.

A list of steps:

1. Run `pnpm install`.
2. Run `pnpm dev`.
3. Open `http://localhost:4321/`.

## Code

Write `inline code` between backticks. A code block starts with three backticks and the language:

```ts
type Page = { title: string; description: string; order?: number };

// Sorts pages by order, then by title.
export const sorted = (pages: Page[]) =>
	pages.toSorted(
		(a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.title.localeCompare(b.title),
	);
```

Use `sh` for commands and `text` for output:

```sh
pnpm check
```

## Tables

| Command | Does |
|---|---|
| `pnpm dev` | Starts the local site. |
| `pnpm check` | Checks the code, builds the site and checks the build. |
| `pnpm fix` | Formats the code and applies safe lint fixes. |

## Quotes

A line that starts with `>` is a quote:

> Readers arrive from search, and agents fetch one section at a time.

## Callouts

A quote whose first line is one of four markers becomes a callout. Use a callout only for something the reader would otherwise get wrong.

```md
> [!NOTE]
> The local site reloads when you save a file.
```

> [!NOTE]
> The local site reloads when you save a file.

> [!TIP]
> Run `pnpm fix` before `pnpm check` to apply the formatting for you.

> [!WARNING]
> A renamed heading breaks every link to its anchor. `pnpm check` lists the broken links.

> [!CAUTION]
> Deleting a page removes its URL. Other sites that link to the URL get an error page.
