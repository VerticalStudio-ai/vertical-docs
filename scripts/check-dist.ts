import { readFileSync } from "node:fs";
import { siteProblems } from "../src/check.ts";

// The whole dependency list (design/architecture.md). AGENTS.md rule 2 says how to propose a change.
const allowed = new Set([
	"astro",
	"minisearch",
	"@astrojs/markdown-satteri",
	"github-slugger",
	"@modelcontextprotocol/server",
	"typescript",
	"@types/node",
	"@astrojs/check",
	"@biomejs/biome",
	"knip",
]);

const problems = siteProblems("dist");

const manifest = JSON.parse(readFileSync("package.json", "utf8"));
for (const name of Object.keys({
	...manifest.dependencies,
	...manifest.devDependencies,
})) {
	if (!allowed.has(name)) {
		problems.push(
			`package.json: "${name}" is not on the dependency list. Remove it, or propose it in the pull request.`,
		);
	}
}

if (problems.length > 0) {
	console.error(problems.join("\n"));
	process.exit(1);
}
