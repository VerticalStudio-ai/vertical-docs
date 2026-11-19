---
title: Search the site
description: Open the search with one key, type a word, and go to the section of the page that matches.
order: 6
---

Press `/` on any page, type a word and choose a result. The result opens the page at the section that matched.

## Open the search

Press `/`. `⌘K` on a Mac and `Ctrl+K` on other keyboards open the search too, and so does the Search button in the header. `Esc`, the Close button or a click outside the search closes it.

## Find a section

Type `callouts`. The first result is "Markdown in a page › Callouts": the page title, then the heading of the section. The line under it is the text around the first word that matched.

Press `Enter` to open the first result, or `Tab` to move to another result and `Enter` to open that one. The page opens at the Callouts heading.

The search shows the ten best sections for a query, and "No results." when nothing matches.

## How the search ranks sections

Each section of a page is one result: the text before the first heading, then every `##` and `###` heading with its text.

- A page with the word in its title comes first. A word in a section heading counts more than a word in the text, and the title of its page counts least for a section.
- The first letters of a word are enough: `callo` finds the Callouts section.
- A small typing mistake still matches: `calouts` finds the Callouts section too.

## What the search downloads

A page downloads nothing for the search until the search opens. The first time the search opens on a page, the browser downloads the search code and `/search.json`, the index of every section.
