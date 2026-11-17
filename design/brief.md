# Brief: docs-kit (working name)

> A super-light, agent-native docs system. It replaces GitBook: Markdown in a repo, a static site with excellent design, search that humans and agents share, and an agent that keeps the docs in sync with the code.

This is what is left of the original proposal: its goals and its non-goals, which still stand. The [plan](architecture.md) replaced everything else (principles, stack, structure, content model, design, search, sync, quality gates and build order), and [research](research.md) holds the evidence for the changes. The full proposal is in the history of this file, at commit `3f8d68b`.

## Goals

1. **Human-first design**: clean, professional and personal (own logo, own accent colour). Linear/Vercel-docs quality.
2. **Agent-native at both ends**:
   - *Authoring*: any coding agent can write a correct page and verify it with one command.
   - *Reading*: any agent can find and fetch exactly the right section (llms.txt, `.md` per page, search over MCP).
3. **Search is the core feature**: fast, fuzzy, section-level, and the same index for humans and agents.
4. **Self-updating**: a merge to `main` → the agent updates the affected pages → a PR for review.
5. **As light as possible**: static output, ~0 JS by default, a minimal dependency list, no redundant code.
6. **Reusable**: brand once, connect any repo (vAPI, BrickPilot, …) with one small workflow file.

## Non-goals (v1)

WYSIWYG editor, versioned docs, i18n, comments, analytics, auth/private docs, "Ask AI" chat UI, OpenAPI reference generation. Each one is a possible later add-on, and none is allowed in the core.
