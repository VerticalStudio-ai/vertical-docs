## Keep the docs in step with the code

The docs of this repository are the Markdown pages in `<folder>/content/`. When a change to the code changes behaviour that a page describes, do these three steps in the same change:

1. Read the writing rules, `WRITING.md` of the `vertical-docs` package: `<run> vertical-docs rules` prints them.
2. Edit the page so that it describes the code as it is now.
3. Run `<run> vertical-docs check <folder>`, and fix what it reports.
