import { readdirSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

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

const files = readdirSync("dist", { recursive: true, encoding: "utf8" });
const pages = files.filter((file) => file.endsWith(".html"));
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

// Gzipped bytes a reader downloads for all pages together. Set from the phase 1 build: 1.8 KB of CSS, 0.3 KB of JavaScript.
const budgets = [
	{ name: "CSS", ext: ".css", tag: "style", limit: 4000 },
	{ name: "JavaScript", ext: ".js", tag: "script", limit: 1000 },
];
for (const { name, ext, tag, limit } of budgets) {
	const parts = new Set(
		files
			.filter((file) => file.endsWith(ext))
			.map((file) => readFileSync(`dist/${file}`, "utf8")),
	);
	// A page repeats the site's inline code, so each distinct block counts once.
	for (const page of pages) {
		const html = readFileSync(`dist/${page}`, "utf8");
		const inline = new RegExp(`<${tag}[^>]*>(.+?)</${tag}>`, "gs");
		for (const [, code = ""] of html.matchAll(inline)) parts.add(code);
	}
	const size = [...parts].reduce((sum, part) => sum + gzipSync(part).length, 0);
	if (size > limit) {
		problems.push(
			`${name} is ${(size / 1000).toFixed(1)} KB gzipped, over the ${limit / 1000} KB budget. Remove code, or raise the budget in scripts/check-dist.ts and say why in the pull request.`,
		);
	}
}

if (problems.length > 0) {
	console.error(problems.join("\n"));
	process.exit(1);
}
