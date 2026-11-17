---
title: Write a page
description: Add a Markdown file to the content folder and read it as a page on the local site.
order: 2
---

A page is one Markdown file in `content/`. The file path becomes the URL, and the frontmatter gives the page its title and description.

## Create the file

Save this as `content/deploy.md`:

```md
---
title: Deploy the site
description: Build the site and upload the output folder to a static host.
---

Run `pnpm check`, then upload the `dist/` folder.

## Build the site

`pnpm check` writes the site to `dist/`.
```

With `pnpm dev` running, the page is at `http://localhost:4321/deploy/` and its title is in the sidebar. The local site reloads when you save the file.

## Follow the rules the build checks

The build stops when a page breaks one of these rules:

- The title comes from frontmatter, so headings in the body are `##` and `###` only. The first heading is a `##`.
- Every code block names its language after the opening fence.
- A page is plain Markdown. HTML is not allowed.
- A list item is not a task. `- [ ]` and `- [x]` are not allowed; say in words what is done.
- An image has alt text and is a file in `content/`, as shown in [Add an image to a page](/add-an-image/).

The message names the file and says what to change:

```text
[ERROR] [glob-loader] Error rendering deploy.md: A heading is level 1. Use ## or ### only; the title comes from frontmatter.
```

The fields a page can set are listed in [Frontmatter fields](/reference/frontmatter/), and the Markdown a page can use is shown in [Markdown in a page](/reference/markdown/).
