# Writing docs

For anyone, human or agent, writing a page for a site built with Vertical Docs. The pages are the Markdown files in the `content/` folder of the docs folder: `docs/content/` in a repository where `vertical-docs init` wrote the docs, and `content/` in the repository of Vertical Docs itself.

Readers arrive from search, and agents fetch one section at a time. Every section has to work without the rest of the page.

## Page

- One page answers one question or covers one task. If the title needs "and", split the page.
- Pick one kind and stay in it: a tutorial (learn by doing), a how-to (finish a task), a reference (look up a fact), or an explanation (understand why).
- Frontmatter is `title` (70 characters at most, naming the task: "Authenticate a request"), `description` (160 at most, one sentence saying what the reader can do afterwards) and an optional `order`.
- The first paragraph gives the answer or the result. Background comes after it.

## Section

- Use `##` and `###` only, and put a `###` under a `##`. A heading says what the section does, in the words a reader would search for.
- A section stands alone. Write the noun again instead of "it" or "this" across sections, and link instead of writing "see above".
- A heading is an anchor that other pages and search results point to. Rename one only when its meaning changes.

## Examples

- Every task has one complete example that runs as written, followed by the output to expect.
- Tag each code block with its language.

## Truth

- Document what the code does today. Read the code or run it. If you cannot confirm a behaviour, leave it out and say so in the pull request.
- Document public behaviour only.
- When behaviour is removed, delete its docs in the same change.

## Style

- Second person, present tense, active voice. Plain words, no marketing.
- Callouts are `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]` and `> [!CAUTION]`. Use one only for something the reader would otherwise get wrong.
- Plain Markdown only: no HTML, no components and no task lists (`- [ ]`). Say in words what is done.

## Images

- An image is a file beside the page, written as `![what it shows](file.png)`. No web addresses.
- The alt text says what the image shows, for a reader who cannot see it and for the search.
- A diagram that differs per theme is two files, `name-light.svg` and `name-dark.svg`, on two lines with the same alt text.
- A caption is a line in italics under the image.

## Done

`vertical-docs check` passes. In a product's repository that is `npx vertical-docs check`, or `pnpm exec vertical-docs check` where the repository uses pnpm, with the docs folder after it when the folder is not `docs`. In the repository of Vertical Docs itself it is `pnpm check`.
