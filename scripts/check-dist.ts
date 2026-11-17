import { readdirSync, readFileSync, statSync } from "node:fs";

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

const problems: string[] = [];

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

const isFile = (path: string) =>
	statSync(path, { throwIfNoEntry: false })?.isFile();

const pages = readdirSync("dist", { recursive: true, encoding: "utf8" }).filter(
	(file) => file.endsWith(".html"),
);
for (const page of pages) {
	const html = readFileSync(`dist/${page}`, "utf8");
	for (const [, link = ""] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
		const url = new URL(link, `file:///${page}`);
		if (url.protocol !== "file:") continue;
		const target = [url.pathname, `${url.pathname}/index.html`]
			.map((path) => `dist${path}`)
			.find(isFile);
		if (!target) {
			problems.push(
				`${page}: link "${link}" points to no file in dist. Fix the link or add the page.`,
			);
		} else if (
			url.hash &&
			!readFileSync(target, "utf8").includes(
				`id="${decodeURIComponent(url.hash.slice(1))}"`,
			)
		) {
			problems.push(
				`${page}: link "${link}" points to a heading that does not exist. Fix the anchor or the heading.`,
			);
		}
	}
}

if (problems.length > 0) {
	console.error(problems.join("\n"));
	process.exit(1);
}
