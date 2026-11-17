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
	vite: { resolve: { alias: { "@docs": content, "@site": site } } },
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
		}),
	},
});
