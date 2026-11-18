import assert from "node:assert/strict";
import { test } from "node:test";
import { search } from "./core/search.ts";
import worker from "./worker.ts";

const sections = [
	{
		url: "/guide/",
		title: "Guide",
		heading: "",
		text: "A callout warns the reader.",
	},
	{
		url: "/guide/#callouts",
		title: "Guide",
		heading: "Callouts",
		text: "A quote whose first line is a marker becomes a callout.",
	},
];

const files: Record<string, [body: string, type: string]> = {
	"/": ["<h1>Home</h1>", "text/html"],
	"/index.md": ["# Home\n", "text/markdown"],
	"/guide/": ["<h1>Guide</h1>", "text/html"],
	"/guide.md": ["# Guide\n", "text/markdown"],
	"/search.json": [JSON.stringify(sections), "application/json"],
};

// Stands in for the static files of the build, with one redirect as Cloudflare answers it from _redirects.
const env = {
	ASSETS: {
		fetch: async (input: Request | URL) => {
			const { pathname } = new URL(
				input instanceof Request ? input.url : input,
			);
			if (pathname === "/old") {
				return new Response(null, {
					status: 301,
					headers: { location: "/guide/" },
				});
			}
			const [body, type] = files[pathname] ?? [];
			return new Response(body ?? "", {
				status: body === undefined ? 404 : 200,
				headers: { "content-type": type ?? "text/plain" },
			});
		},
	},
};

const get = (path: string, accept = "text/html") =>
	worker.fetch(
		new Request(`https://docs.test${path}`, { headers: { accept } }),
		env,
	);

// Calls one MCP method the way a client does and returns its result.
const mcp = async (method: string, params?: object) => {
	const response = await worker.fetch(
		new Request("https://docs.test/mcp", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json, text/event-stream",
				"mcp-protocol-version": "2025-06-18",
			},
			body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
		}),
		env,
	);
	const [, data = ""] = /^data: (.+)$/m.exec(await response.text()) ?? [];
	return JSON.parse(data).result;
};

const call = (name: string, args: object) =>
	mcp("tools/call", { name, arguments: args });

test("serves a page as HTML to a browser", async () => {
	const response = await get("/guide/");
	assert.equal(response.headers.get("content-type"), "text/html");
	assert.equal(await response.text(), "<h1>Guide</h1>");
});

test("answers Accept: text/markdown on a page URL with the bytes of its Markdown copy", async () => {
	for (const [path, copy] of [
		["/guide/", "/guide.md"],
		["/guide", "/guide.md"],
		["/", "/index.md"],
	] as const) {
		const response = await get(path, "text/markdown, text/html;q=0.9");
		assert.equal(response.status, 200);
		assert.equal(response.headers.get("content-type"), "text/markdown");
		assert.equal(response.headers.get("vary"), "accept");
		assert.equal(await response.text(), await (await get(copy)).text());
	}
});

test("answers Accept: text/markdown as the files do where a URL has no Markdown copy", async () => {
	const redirect = await get("/old", "text/markdown");
	assert.equal(redirect.status, 301);
	assert.equal(redirect.headers.get("location"), "/guide/");
	assert.equal((await get("/nope/", "text/markdown")).status, 404);
	assert.equal(
		await (await get("/search.json", "text/markdown")).text(),
		JSON.stringify(sections),
	);
});

test("answers Markdown only to a GET", async () => {
	const response = await worker.fetch(
		new Request("https://docs.test/guide/", {
			method: "POST",
			headers: { accept: "text/markdown" },
		}),
		env,
	);
	assert.equal(await response.text(), "<h1>Guide</h1>");
});

test("lists the two MCP tools", async () => {
	const { tools } = await mcp("tools/list");
	assert.deepEqual(
		tools.map(({ name }: { name: string }) => name),
		["search_docs", "get_page"],
	);
});

test("search_docs returns the hits of the core search, cut at the limit", async () => {
	const all = await call("search_docs", { query: "callout" });
	assert.deepEqual(
		JSON.parse(all.content[0].text),
		search(sections)("callout"),
	);
	const one = await call("search_docs", { query: "callout", limit: 1 });
	assert.deepEqual(
		JSON.parse(one.content[0].text),
		search(sections)("callout").slice(0, 1),
	);
});

test("get_page returns the Markdown copy for a path or a search result URL", async () => {
	for (const path of ["/guide/", "/guide", "/guide/#callouts"]) {
		const { content } = await call("get_page", { path });
		assert.equal(content[0].text, "# Guide\n");
	}
	assert.equal(
		(await call("get_page", { path: "/" })).content[0].text,
		"# Home\n",
	);
});

test("get_page says what to do for a path with no page", async () => {
	const { content, isError } = await call("get_page", { path: "/nope/" });
	assert.equal(isError, true);
	assert.equal(
		content[0].text,
		"No page at /nope/. Take the path from a search_docs result.",
	);
});
