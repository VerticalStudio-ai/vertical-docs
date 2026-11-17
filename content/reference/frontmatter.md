---
title: Frontmatter fields
description: The three fields a page can set at the top of its Markdown file, with their limits.
order: 1
---

A page sets `title` and `description`, and can set `order`. The build checks all three and stops when a field is missing, too long or misspelled.

## Fields

| Field | Type | Required | Used for |
|---|---|---|---|
| `title` | Text, 70 characters at most | Yes | The page heading, the sidebar entry and the browser tab. |
| `description` | Text, 160 characters at most | Yes | The line under the page heading and the description search engines show. |
| `order` | Number | No | The position in the sidebar. See [Order pages in the sidebar](/order-the-sidebar/). |

## Example

```md
---
title: Authenticate a request
description: Send an API key in a header and read the response.
order: 3
---
```

## A field that breaks a limit

A title longer than 70 characters stops the build. The message names the file and the field:

```text
[InvalidContentEntryDataError] docs → authenticate data does not match collection schema.

  title: Too big: expected string to have <=70 characters
```
