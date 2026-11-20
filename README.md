# Vertical Docs

[![npm version](https://img.shields.io/npm/v/vertical-docs)](https://www.npmjs.com/package/vertical-docs)
[![CI](https://github.com/VerticalStudio-ai/vertical-docs/actions/workflows/ci.yml/badge.svg)](https://github.com/VerticalStudio-ai/vertical-docs/actions/workflows/ci.yml)
[![Licence: MIT](https://img.shields.io/npm/l/vertical-docs)](LICENSE)

Docs that live in your product's repository. Plain Markdown becomes a fast, lightweight site for agents and humans, your own CI hosts it, and your coding agent keeps it in step with the code.

**[verticaldocs.dev](https://verticaldocs.dev)** is the documentation. It is the `content/` folder of this repository, built with Vertical Docs.

## Quick start

In the root of your repository:

```sh
npx vertical-docs init     # writes docs/ with a first page, two workflows, and the lines for coding agents in AGENTS.md
npx vertical-docs dev      # live preview while you write
npx vertical-docs check    # the check CI runs
```

You need Node 22.23.4 or later, on macOS or Linux. Windows is not tested. [Add docs to your repository](https://verticaldocs.dev/add-docs-to-your-repository/) is the tutorial, and [Commands](https://verticaldocs.dev/reference/commands/) lists all six commands.

The package is `vertical-docs`, and `vdocs` is the same command once the package is installed. Do not run `npx vdocs`: that name on npm belongs to another package.

## What you get

- **Made for agents.** Every page has a Markdown copy at `.md`, the site has an `llms.txt`, and an MCP server answers at `/mcp`.
- **Kept current by agents.** `init` adds a few lines to `AGENTS.md` that tell your coding agent to change the page with the code.
- **Lives in your repository.** Plain Markdown in `docs/content/`. One file is one page, and a change to the docs is a pull request like any other.
- **Hosted by you.** Your own CI builds the site and deploys one Cloudflare Worker to your own account.
- **Fast and lightweight.** A page loads 2.9 KB of CSS and 1.2 KB of JavaScript, gzipped, and works without JavaScript.
- **Checked.** A broken link, a dead anchor or a search result that opens nothing fails `vertical-docs check`.

## Documentation

- [Add docs to your repository](https://verticaldocs.dev/add-docs-to-your-repository/): the tutorial.
- [Write a page](https://verticaldocs.dev/write-a-page/) and [Markdown in a page](https://verticaldocs.dev/reference/markdown/).
- [Site configuration](https://verticaldocs.dev/reference/configuration/): name, address, accent colour, header tabs, home page, logo.
- [Files for agents](https://verticaldocs.dev/reference/agents/) and [Worker routes](https://verticaldocs.dev/reference/worker/): the Markdown copies, `llms.txt`, `search.json` and the MCP server.
- [Commands](https://verticaldocs.dev/reference/commands/): `init`, `dev`, `build`, `check`, `search` and `rules`.

## Status

Version 0.1.0 is the first release on npm. Vertical Docs' own site runs on it since 2026-11-20. Not run yet: the two workflows that `init` writes, on GitHub. Next: the first two product docs sites move into their repositories.

[Features](design/features.md) lists what the product does today, each line with its proof, and [Architecture](design/architecture.md) says what is built with what, and why.

## Contributing

Issues and pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) says how to run the project and what a change needs. To report a vulnerability, follow [SECURITY.md](SECURITY.md).

## Licence

[MIT](LICENSE). The Geist fonts in `src/fonts/` are under the [SIL Open Font License](src/fonts/LICENSE.txt).

Vertical Docs is a product of Vertical Labs.
