# Vertical Docs

A super-light, agent-native docs system: Markdown in a repo, a static site, one search index shared by humans and agents, and an agent that keeps the docs in sync with the code.

Vertical Docs is a product of Vertical Labs; its short name is `vdocs`. The repository keeps the working name `docs-kit` until it is renamed.

Status: version 1 is built and nothing is deployed. Built: the site with its sidebar, themes and search, the search in the terminal, the files for agents, images, a content folder outside the project, the Cloudflare Worker with the MCP server, redirects, the search-engine files and `pnpm check`. Next: the first deploy and the first two docs sites.

- [Features](design/features.md): what the product does today and what is planned, each built line with its proof.
- [Architecture and stack plan](design/architecture.md): what will be built, with what, in which order.
- [Research](design/research.md): the evidence behind the plan.
- [Brief](design/brief.md): the goals and non-goals of the original proposal.
- [AGENTS.md](AGENTS.md): rules for agents changing the code.
- [WRITING.md](WRITING.md): rules for writing a docs page.
