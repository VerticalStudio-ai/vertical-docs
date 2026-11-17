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
const read = (file: string) => readFileSync(`dist/${file}`, "utf8");

// Follows a link from a file in dist: the file it points to, or what is wrong and how to fix it. A link that leaves the site gives neither.
const follow = (from: string, link: string) => {
	const url = new URL(link, `file:///${from}`);
	if (url.protocol !== "file:") return {};
	const file = [url.pathname, `${url.pathname}/index.html`]
		.map((path) => path.slice(1))
		.find((path) => isFile(`dist/${path}`));
	if (!file) {
		return {
			problem: "points to no file in dist",
			fix: "Fix the link or add the page.",
		};
	}
	return url.hash &&
		!read(file).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`)
		? {
				problem: "points to a heading that does not exist",
				fix: "Fix the anchor or the heading.",
			}
		: { file };
};

const files = readdirSync("dist", { recursive: true, encoding: "utf8" });
const pages = files.filter((file) => file.endsWith(".html"));
const loaded = new Set<string>();
for (const page of pages) {
	const html = read(page);
	for (const [, link = ""] of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
		const { file, problem, fix } = follow(page, link);
		if (file) loaded.add(file);
		if (problem) problems.push(`${page}: link "${link}" ${problem}. ${fix}`);
	}
	// A screen reader user moves through a page by heading level, so a level may not be skipped.
	if (/^(?:(?!<h2).)*<h3/s.test(html)) {
		problems.push(
			`${page}: a ### heading comes before the first ## heading. Start the section with ##.`,
		);
	}
}

// The code a page carries in a tag. Structured data is a script tag that holds no code.
const inline = (tag: string) =>
	pages.flatMap((page) =>
		Array.from(
			read(page).matchAll(
				new RegExp(`<${tag}(?![^>]*ld\\+json)[^>]*>(.+?)</${tag}>`, "gs"),
			),
			([, code = ""]) => code,
		),
	);

// A script also downloads what it imports by name, so those files load with the page too. A lazy import("…") or a worker does not match.
const importsOf = (from: string, code: string) => {
	for (const [, link = ""] of code.matchAll(
		/\b(?:from|import)\s*["']([^"']+)["']/g,
	)) {
		const { file } = follow(from, link);
		if (file && !loaded.has(file)) {
			loaded.add(file);
			importsOf(file, read(file));
		}
	}
};
for (const file of [...loaded].filter((file) => file.endsWith(".js"))) {
	importsOf(file, read(file));
}
// Astro writes the paths in an inline script from the site root, so any page works as the base.
for (const code of inline("script")) importsOf("index.html", code);

// Every search result has to open: the dialog, the command line and agents all follow these URLs.
if (isFile("dist/search.json")) {
	for (const { url } of JSON.parse(read("search.json"))) {
		const { problem } = follow("search.json", url);
		if (problem) {
			problems.push(
				`search.json: result "${url}" ${problem}. Write the heading more simply, or make src/core/sections.ts read it the way the site does.`,
			);
		}
	}
}

// An old address has to land on a page for good: Cloudflare answers these lines, and a line without a code is a temporary redirect.
if (isFile("dist/_redirects")) {
	for (const line of read("_redirects").trim().split("\n")) {
		const [, to = "", code] = line.split(" ");
		const { problem } = follow("_redirects", to);
		if (problem) {
			problems.push(
				`_redirects: "${line}" ${problem}. Point it at a page that exists.`,
			);
		}
		if (code !== "301") {
			problems.push(
				`_redirects: "${line}" is not a permanent redirect. End the line with 301.`,
			);
		}
	}
}

if (
	pages.some((page) => read(page).includes('property="og:image"')) &&
	!isFile("dist/share.png")
) {
	problems.push(
		"public/share.png is missing: every page names it as its share image. Add a PNG of 1200 by 630 pixels.",
	);
}

const withExt = (ext: string) => files.filter((file) => file.endsWith(ext));

// Gzipped bytes a reader downloads for all pages together. The phase 3a build measures 2.5 KB of CSS, 1.2 KB of JavaScript that a page loads (the copy buttons took it past the first budget of 1 KB), and 6.1 KB of JavaScript that loads on demand, which is the search.
const budgets = [
	{
		name: "CSS",
		limit: 4000,
		parts: [...withExt(".css").map(read), ...inline("style")],
	},
	{
		name: "JavaScript",
		limit: 1250,
		parts: [
			...withExt(".js")
				.filter((file) => loaded.has(file))
				.map(read),
			...inline("script"),
		],
	},
	{
		name: "JavaScript loaded on demand",
		limit: 8000,
		parts: withExt(".js")
			.filter((file) => !loaded.has(file))
			.map(read),
	},
];
for (const { name, limit, parts } of budgets) {
	// A page repeats the site's inline code, so each distinct block counts once.
	const size = [...new Set(parts)].reduce(
		(sum, part) => sum + gzipSync(part).length,
		0,
	);
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
