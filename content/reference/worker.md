---
title: Worker routes
description: Run the built site as a Cloudflare Worker, fetch a page as Markdown from its own URL and call the two MCP tools.
order: 5
---

The Worker in `src/worker.ts` serves the built site and adds two routes for agents. A page URL answers with Markdown when the request asks for it, and `/mcp` is an MCP server with a search tool and a page tool.

## Run the Worker locally

Build the site, then start the Worker:

```sh
pnpm check
pnpm dlx wrangler@4.161.0 dev
```

The site is at `http://localhost:8787/`. The Worker serves the files in `dist/`, so run `pnpm check` again after you change a page.

## Markdown from a page URL

Send `Accept: text/markdown` to the URL of a page and the Worker answers with the [Markdown copy](/reference/agents/#markdown-copy-of-a-page) of that page:

```sh
curl -s -H "Accept: text/markdown" http://localhost:8787/reference/ | head -n 3
```

```md
# Reference

Look up the frontmatter fields, the Markdown a page can use, the site configuration file, the files for agents and the Worker routes.
```

The answer holds the same bytes as `/reference.md`. A request without that header gets the HTML page.

## An address with no page

An address with no page answers with status `404` and the "Page not found" page. That page keeps the header, the search and the list of pages, so a reader can find the page that moved:

```sh
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/no/such/page/
```

```txt
404
```

The build writes the page to `dist/404.html`. To send an old address to its new page, add a line to [`public/_redirects`](/reference/configuration/#old-addresses).

## MCP server

`/mcp` is an MCP server over HTTP. The server keeps nothing between two calls, so a client needs no session.

| Tool | Arguments | Returns |
|---|---|---|
| `search_docs` | `query`, and an optional `limit` from 1 to 10 | The best sections as JSON, best first, in the order the site search shows them. Each has `url`, `title`, `heading` and `snippet`. |
| `get_page` | `path`: a page path such as `/reference/`, or the `url` of a search result | The Markdown copy of the page. |

To call a tool without an MCP client:

```sh
curl -s http://localhost:8787/mcp -H "content-type: application/json" -H "accept: application/json, text/event-stream" -H "mcp-protocol-version: 2025-06-18" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_docs","arguments":{"query":"favicon","limit":1}}}'
```

```txt
event: message
data: {"result":{"content":[{"type":"text","text":"[{\"url\":\"/reference/configuration/#logo-and-favicon\",\"title\":\"Site configuration\",\"heading\":\"Logo and favicon\",\"snippet\":\"… pixels high, next to the name. public/favicon.svg In the browser tab. public/share.png In the preview of a link to the site, in a chat or on a social network. …\"}]"}],"isError":false},"jsonrpc":"2.0","id":1}
```

### Connect Claude Code

Save the address of the server in a file named `mcp.json`:

```json
{
	"mcpServers": {
		"docs": { "type": "http", "url": "http://localhost:8787/mcp" }
	}
}
```

Start Claude Code with that file:

```sh
claude --mcp-config mcp.json
```

Claude Code lists the tools as `mcp__docs__search_docs` and `mcp__docs__get_page`.
