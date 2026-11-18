---
title: Start your docs
description: Change this starter page, add a second page, set the name and logo of the site, and check the docs before you publish them.
---

This page is the file `<folder>/content/index.md`. Replace its text with your own, add one Markdown file for each further page, and run the check before you publish.

## Change this page

Start the live preview:

```sh
npx vertical-docs dev <folder>
```

The preview is at `http://localhost:4321/`. Change a line in `<folder>/content/index.md` and save the file: the preview shows the change.

## Add a page

Save this as `<folder>/content/install.md`:

```md
---
title: Install the product
description: Install the product with one command and confirm that it runs.
---

Install the product with one command.
```

The file path is the address of a page: the new page is at `http://localhost:4321/install/`, and its title is in the sidebar.

## Set the name and the logo

`<folder>/docs.config.json` holds the name of the site, its description, its public address, the link to your repository and the accent colour. The logo, the favicon and the share image are the three files in `<folder>/public/`. Replace the placeholders with your own.

## Check the docs

```sh
npx vertical-docs check <folder>
```

The check builds the site into `<folder>/dist/` and fails for a broken link, a broken anchor or a search result that opens nothing. A passing check ends with the build summary and exits with code 0:

```text
[build] 3 page(s) built in 477ms
[build] Complete!
```
