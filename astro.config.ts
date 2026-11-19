import { dirname, join, resolve } from "node:path";
import { satteri } from "@astrojs/markdown-satteri";
import { defineConfig } from "astro/config";
import { callout } from "./src/core/callout.ts";
import { writingProblem } from "./src/core/writing.ts";

const check = (node: Parameters<typeof writingProblem>[0]) => {
	const problem = writingProblem(node);
	if (problem) throw new Error(problem);
};

// The folder is the one in src/content.config.ts.
const content = resolve(process.env.DOCS_ROOT ?? "./content");
// A site is one folder: its docs.config.json and public/ sit beside its content folder.
const site = dirname(content);

export default defineConfig({
	publicDir: join(site, "public"),
	// src/load.ts finds the image files of the content folder as @docs; the pages find the site's own files as @site.
	vite: {
		resolve: { alias: { "@docs": content, "@site": site } },
		plugins: [
			{
				name: "target-current",
				// lightningcss 1.33.0 does not know :target-current and warns on every build, although it writes the rule out unchanged. Neither Vite nor lightningcss has an option that names a pseudo-class, so this drops that one message.
				configResolved({ logger }) {
					const { warn } = logger;
					logger.warn = (message, options) => {
						if (!message.includes("'target-current' is not recognized")) {
							warn(message, options);
						}
					};
				},
			},
		],
	},
	markdown: {
		shikiConfig: {
			themes: {
				light: "github-light-high-contrast",
				dark: "github-dark-default",
			},
			defaultColor: false,
		},
		processor: satteri({
			mdastPlugins: [
				{
					name: "writing-rules",
					heading: check,
					code: check,
					html: check,
					image: check,
					imageReference: check,
					listItem: check,
				},
				{
					name: "callouts",
					blockquote(node, ctx) {
						const [first] = node.children;
						const text = first?.type === "paragraph" && first.children[0];
						const found = text && text.type === "text" && callout(text.value);
						if (!found) return;
						ctx.setField(text, "value", found.text);
						ctx.setField(node, "data", {
							hName: "div",
							hProperties: {
								role: "note",
								class: "callout",
								"data-kind": found.kind,
							},
						});
					},
				},
			],
			hastPlugins: [
				{
					name: "tables",
					// A table wider than the text scrolls inside this box. The table itself stays a table for a screen reader.
					// The box takes a place in the tab order, because Safari gives a scrolling box none and the arrow keys reach the hidden columns only from inside it.
					element: {
						filter: ["table"],
						visit(node, ctx) {
							ctx.wrapNode(node, {
								type: "element",
								tagName: "div",
								properties: { class: "table", tabindex: "0" },
								children: [],
							});
						},
					},
				},
			],
		}),
	},
});
