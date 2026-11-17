import { satteri } from "@astrojs/markdown-satteri";
import { defineConfig } from "astro/config";
import { callout } from "./src/core/callout.ts";
import { writingProblem } from "./src/core/writing.ts";

const check = (node: Parameters<typeof writingProblem>[0]) => {
	const problem = writingProblem(node);
	if (problem) throw new Error(problem);
};

export default defineConfig({
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
				{ name: "writing-rules", heading: check, code: check, html: check },
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
