import { satteri } from "@astrojs/markdown-satteri";
import { defineConfig } from "astro/config";
import { writingProblem } from "./src/core/writing.ts";

const check = (node: Parameters<typeof writingProblem>[0]) => {
	const problem = writingProblem(node);
	if (problem) throw new Error(problem);
};

export default defineConfig({
	markdown: {
		processor: satteri({
			mdastPlugins: [
				{ name: "writing-rules", heading: check, code: check, html: check },
			],
		}),
	},
});
