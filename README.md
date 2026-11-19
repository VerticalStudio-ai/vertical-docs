# Vertical Docs

Docs that live in your product's repository. Plain Markdown becomes a static site, a Markdown copy of every page and one search index shared by readers, terminals and agents, and an agent keeps the docs in step with the code.

```sh
npx vertical-docs init     # writes docs/ with a first page, the config, placeholder images and two workflows
npx vertical-docs dev      # live preview while you write
npx vertical-docs check    # the check CI runs
```

You need Node 22.23 or later. [Add docs to your repository](content/add-docs-to-your-repository.md) is the tutorial, and [Commands](content/reference/commands.md) lists all five commands.

The package is `vertical-docs`, and `vdocs` is the same command once the package is installed. Do not run `npx vdocs`: that name on npm belongs to another package.

Vertical Docs is a product of Vertical Labs.

Status: version 0.1.0 is built, packs and installs. It is not published to npm, so the commands above run only from a packed file, and nothing is deployed. Built: the site with its sidebar, themes and search, the files for agents, images, the Cloudflare Worker with the MCP server, redirects, the search-engine files, and the package with its five commands and the files `init` writes. Not run yet: a deploy, and the two workflows on GitHub with their keys. Next: the first two docs sites move into their product repositories, then the release.

- [Features](design/features.md): what the product does today and what is planned, each built line with its proof.
- [Architecture and stack plan](design/architecture.md): what is built, with what, in which order.
- [Research](design/research.md): the evidence behind the plan.
- [Brief](design/brief.md): the goals and non-goals of the original proposal.
- [AGENTS.md](AGENTS.md): rules for agents changing the code.
- [WRITING.md](WRITING.md): rules for writing a docs page.
