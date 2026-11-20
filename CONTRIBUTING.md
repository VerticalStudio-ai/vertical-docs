# Contributing to Vertical Docs

Issues and pull requests are welcome. This page says how to run the project and what a change needs before it is merged.

## Report a bug or propose a feature

Open an [issue](https://github.com/VerticalStudio-ai/vertical-docs/issues). For a bug, say what you ran, what you expected and what happened, with the versions of `vertical-docs` and Node. For a vulnerability, do not open an issue: follow [SECURITY.md](SECURITY.md).

Before you build a feature, open an issue first. The project stays small on purpose, and the dependency list is fixed: a feature that an open requirement does not need is likely to be declined.

## Run the project

You need Node 22.23.4 or later and pnpm.

```sh
pnpm install
pnpm dev      # the docs of Vertical Docs, as a local site
pnpm check    # types, lint, unused code, tests, the build and the checks on the build
```

`pnpm check` is the only definition of done. CI runs the same command, and then installs the packed package into an empty folder to try it the way a product gets it.

To try your change on another docs folder, point `DOCS_ROOT` at its `content/` folder:

```sh
DOCS_ROOT=../my-product/docs/content pnpm dev
```

## Make a change

- [AGENTS.md](AGENTS.md) has the map of the repository and the rules for a change. They hold for people and for coding agents.
- Change behaviour in `src/core/` test-first. Do not edit or delete a test to make a change pass: if a test is wrong, say so in the pull request.
- A change to behaviour that a page in `content/` describes changes that page in the same pull request. [WRITING.md](WRITING.md) has the rules for a page.
- Keep the diff to the task. A refactor is its own pull request.

## Open a pull request

Say what changes and why, how you checked it, and what you did not verify. A pull request is merged when `pnpm check` and CI pass and a maintainer has reviewed it.

By contributing you agree that your contribution is under the [MIT licence](LICENSE).
