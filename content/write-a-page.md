---
title: Write a page
description: Add a Markdown file to the content folder of your docs and read it as a page in the live preview.
order: 3
---

A page is one Markdown file in `docs/content/`. The file path becomes the URL, and the frontmatter gives the page its title and description.

## Create the file

Save this as `docs/content/authenticate.md`:

```md
---
title: Authenticate a request
description: Send your API key in a header and read the response.
---

Send your API key in the `Authorization` header of every request.

## Send the key

Replace `YOUR_KEY` with the key from your account page.
```

With the preview running (`npx vertical-docs dev`), the page is at `http://localhost:4321/authenticate/` and its title is in the sidebar. The preview shows a change when you save the file.

## Follow the rules the build checks

The build stops when a page breaks one of these rules:

- The title comes from frontmatter, so headings in the body are `##` and `###` only. The first heading is a `##`.
- Every code block names its language after the opening fence.
- A page is plain Markdown. HTML is not allowed.
- A list item is not a task. `- [ ]` and `- [x]` are not allowed; say in words what is done.
- An image has alt text and is a file in `docs/content/`, as shown in [Add an image to a page](/add-an-image/).

The message names the file and says what to change:

```text
[ERROR] [glob-loader] Error rendering authenticate.md: A heading is level 1. Use ## or ### only; the title comes from frontmatter.
```

The fields a page can set are listed in [Frontmatter fields](/reference/frontmatter/), and the Markdown a page can use is shown in [Markdown in a page](/reference/markdown/).
