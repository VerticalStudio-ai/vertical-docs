---
title: Order pages in the sidebar
description: Set the position of a page with one frontmatter field, and group pages by putting them in a folder.
order: 5
---

The sidebar is built from the files in `content/`. Set `order` in a page's frontmatter to place the page, and put pages in a folder to make a group.

## Set the position of a page

Add `order` to the frontmatter:

```md
---
title: Write a page
description: Add a Markdown file to the content folder.
order: 2
---
```

The sidebar sorts pages by `order`, lowest first. Pages with the same `order` sort by title. A page without `order` comes after every page that has one.

## Group pages in a folder

A folder is a group in the sidebar. The folder's `index.md` is the group's own page: its title names the group, and its `order` places the group among the other pages.

```text
content/
├── index.md
├── write-a-page.md
└── reference/
    ├── index.md
    ├── frontmatter.md
    └── markdown.md
```

The pages in `reference/` appear under the title of `reference/index.md`, sorted by their own `order`. A folder inside a folder is a group inside a group.

## Open and close a group

A group shows its title and an arrow. The title opens the group's own page, and the arrow opens and closes the list of pages in the group.

The site opens the groups that hold the page being read and scrolls the sidebar to that page. Every other group starts closed, so a site with many pages keeps a short sidebar.

## Give every folder an index page

A folder without an `index.md` stops the build. The message says which file to add:

```text
The folder content/reference/ has no index page. Add content/reference/index.md; its title names the sidebar group.
```

## Previous and next links

The links at the end of a page follow the sidebar from top to bottom. A group's own page comes before the pages in the group.
