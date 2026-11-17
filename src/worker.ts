import {
	createMcpHandler,
	fromJsonSchema,
	McpServer,
} from "@modelcontextprotocol/server";
import { markdownUrl } from "./core/llms.ts";
import { search } from "./core/search.ts";

// The static files of the build, as Cloudflare hands them to the Worker.
type Env = { ASSETS: { fetch(input: Request | URL): Promise<Response> } };

// The Markdown copy of the page at this path, which a client may write without the last slash.
const copy = (env: Env, { pathname, origin }: URL) =>
	env.ASSETS.fetch(
		new URL(
			markdownUrl(pathname.endsWith("/") ? pathname : `${pathname}/`),
			origin,
		),
	);

const text = (text: string, isError = false) => ({
	content: [{ type: "text" as const, text }],
	isError,
});

// A new server for each request: nothing is kept between two calls.
const mcp = (env: Env, { origin }: URL) =>
	createMcpHandler(() => {
		const server = new McpServer({ name: "docs", version: "1" });
		server.registerTool(
			"search_docs",
			{
				description:
					"Search the docs. Returns the best sections, best first, each with the URL of its page and heading, the page title, the heading and a snippet.",
				inputSchema: fromJsonSchema<{ query: string; limit?: number }>({
					type: "object",
					properties: {
						query: { type: "string" },
						limit: { type: "integer", minimum: 1, maximum: 10 },
					},
					required: ["query"],
				}),
			},
			async ({ query, limit }) => {
				const sections = await env.ASSETS.fetch(
					new URL("/search.json", origin),
				);
				return text(
					JSON.stringify(search(await sections.json())(query).slice(0, limit)),
				);
			},
		);
		server.registerTool(
			"get_page",
			{
				description:
					"Fetch one page of the docs as Markdown. The path is the URL of a search_docs result, or a page path such as /reference/.",
				inputSchema: fromJsonSchema<{ path: string }>({
					type: "object",
					properties: { path: { type: "string" } },
					required: ["path"],
				}),
			},
			async ({ path }) => {
				const page = await copy(env, new URL(path, origin));
				return page.ok
					? text(await page.text())
					: text(
							`No page at ${path}. Take the path from a search_docs result.`,
							true,
						);
			},
		);
		return server;
	});

export default {
	async fetch(request: Request, env: Env) {
		const url = new URL(request.url);
		if (url.pathname === "/mcp") return mcp(env, url).fetch(request);
		if (
			request.method === "GET" &&
			request.headers.get("accept")?.includes("text/markdown")
		) {
			const page = await copy(env, url);
			if (page.ok) {
				const response = new Response(page.body, page);
				// A shared cache may not hand this answer to a browser that asks for the same URL.
				response.headers.set("vary", "accept");
				return response;
			}
		}
		return env.ASSETS.fetch(request);
	},
};
