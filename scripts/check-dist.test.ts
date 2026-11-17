import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

// Runs the real script against a throwaway package.json and dist/.
const run = (
	dependencies: Record<string, string>,
	pages: Record<string, string>,
) => {
	const dir = mkdtempSync(join(tmpdir(), "check-dist-"));
	writeFileSync(join(dir, "package.json"), JSON.stringify({ dependencies }));
	for (const [path, html] of Object.entries(pages)) {
		mkdirSync(dirname(join(dir, "dist", path)), { recursive: true });
		writeFileSync(join(dir, "dist", path), html);
	}
	return spawnSync(
		process.execPath,
		[join(import.meta.dirname, "check-dist.ts")],
		{ cwd: dir, encoding: "utf8" },
	);
};

test("passes for listed dependencies and links that resolve", () => {
	const { status, stderr } = run(
		{ astro: "1" },
		{
			"index.html":
				'<a href="/guide">a</a> <a href="/guide/#setup">b</a> <a href="guide/">c</a> <a href="https://example.com/x">d</a>',
			"guide/index.html": '<h2 id="setup">Setup</h2> <a href="../">home</a>',
		},
	);
	assert.equal(stderr, "");
	assert.equal(status, 0);
});

test("fails for a link to a page that is not in dist", () => {
	const { status, stderr } = run({}, { "index.html": '<a href="/nope">a</a>' });
	assert.equal(status, 1);
	assert.match(stderr, /index\.html: link "\/nope" points to no file/);
});

test("fails for a link to a heading that does not exist", () => {
	const { status, stderr } = run(
		{},
		{ "index.html": '<a href="/#nope">a</a>' },
	);
	assert.equal(status, 1);
	assert.match(
		stderr,
		/link "\/#nope" points to a heading that does not exist/,
	);
});

test("fails for a dependency that is not on the list", () => {
	const { status, stderr } = run({ "left-pad": "1" }, { "index.html": "" });
	assert.equal(status, 1);
	assert.match(stderr, /"left-pad" is not on the dependency list/);
});

// Random text does not compress, so 6,000 bytes of it is over both budgets.
const noise = randomBytes(6000).toString("base64");

test("fails when the CSS is over its budget", () => {
	const { status, stderr } = run(
		{},
		{ "index.html": "", "_astro/site.css": `/* ${noise} */` },
	);
	assert.equal(status, 1);
	assert.match(stderr, /CSS is \d+\.\d KB gzipped, over the 4 KB budget/);
});

test("fails when the JavaScript is over its budget, inline scripts included", () => {
	const { status, stderr } = run(
		{},
		{ "index.html": `<script>// ${noise}</script>` },
	);
	assert.equal(status, 1);
	assert.match(
		stderr,
		/JavaScript is \d+\.\d KB gzipped, over the 1\.25 KB budget/,
	);
});

test("counts an inline script once when every page repeats it", () => {
	const script = `<script>// ${noise.slice(0, 600)}</script>`;
	const { status, stderr } = run(
		{},
		{ "index.html": script, "a/index.html": script, "b/index.html": script },
	);
	assert.equal(stderr, "");
	assert.equal(status, 0);
});

test("fails for a search result that points to no page or to no heading", () => {
	const { status, stderr } = run(
		{},
		{
			"index.html": '<h2 id="setup">Setup</h2>',
			"search.json": JSON.stringify([
				{ url: "/" },
				{ url: "/#setup" },
				{ url: "/nope/" },
				{ url: "/#nope" },
			]),
		},
	);
	assert.equal(status, 1);
	assert.equal(
		stderr,
		'search.json: result "/nope/" points to no file in dist. Write the heading more simply, or make src/core/sections.ts read it the way the site does.\nsearch.json: result "/#nope" points to a heading that does not exist. Write the heading more simply, or make src/core/sections.ts read it the way the site does.\n',
	);
});

test("counts a script file that a page loads against the page budget", () => {
	const { status, stderr } = run(
		{},
		{
			"index.html": '<script type="module" src="/_astro/page.js"></script>',
			"_astro/page.js": `// ${noise}`,
		},
	);
	assert.equal(status, 1);
	assert.match(
		stderr,
		/^JavaScript is \d+\.\d KB gzipped, over the 1\.25 KB budget/,
	);
});

test("gives JavaScript that no page loads its own, larger budget", () => {
	const page = {
		"index.html": "<script>new Worker(`/_astro/worker.js`)</script>",
	};
	const within = run({}, { ...page, "_astro/worker.js": `// ${noise}` });
	assert.equal(within.stderr, "");
	assert.equal(within.status, 0);
	// A repeated block compresses away, so the larger file is new random text.
	const more = randomBytes(12000).toString("base64");
	const over = run({}, { ...page, "_astro/worker.js": `// ${more}` });
	assert.equal(over.status, 1);
	assert.match(
		over.stderr,
		/^JavaScript loaded on demand is \d+\.\d KB gzipped, over the 8 KB budget/,
	);
});

test("counts a file that a page script imports by name against the page budget", () => {
	const files = { "_astro/shared.js": `// ${noise}` };
	const viaFile = run(
		{},
		{
			...files,
			"index.html": '<script type="module" src="/_astro/entry.js"></script>',
			"_astro/entry.js": 'import{a}from"./shared.js";a();',
		},
	);
	const viaInline = run(
		{},
		{
			...files,
			"index.html": '<script type="module">import"/_astro/shared.js";</script>',
		},
	);
	for (const { status, stderr } of [viaFile, viaInline]) {
		assert.equal(status, 1);
		assert.match(
			stderr,
			/^JavaScript is \d+\.\d KB gzipped, over the 1\.25 KB budget/,
		);
	}
});

test("fails for a page whose ### heading has no ## heading above it", () => {
	const { status, stderr } = run(
		{},
		{
			"index.html": '<h1>Home</h1><h2 id="a">A</h2><h3 id="b">B</h3>',
			"pricing/index.html":
				'<h1>Pricing</h1><h3 id="b">B</h3><h2 id="a">A</h2>',
		},
	);
	assert.equal(status, 1);
	assert.equal(
		stderr,
		"pricing/index.html: a ### heading comes before the first ## heading. Start the section with ##.\n",
	);
});

test("allows the 1.2 KB of page JavaScript that the copy buttons need", () => {
	// 1,500 random characters gzip to about 1.15 KB: over the old 1 KB budget, under 1.25 KB.
	const { status, stderr } = run(
		{},
		{ "index.html": `<script>// ${noise.slice(0, 1500)}</script>` },
	);
	assert.equal(stderr, "");
	assert.equal(status, 0);
});

test("fails for a redirect that points to no page, or that is not permanent", () => {
	const { status, stderr } = run(
		{},
		{
			"index.html": "",
			"guide/index.html": "",
			_redirects: "/old /guide/ 301\n/gone /nope/ 301\n/moved /guide/\n",
		},
	);
	assert.equal(status, 1);
	assert.equal(
		stderr,
		'_redirects: "/gone /nope/ 301" points to no file in dist. Point it at a page that exists.\n_redirects: "/moved /guide/" is not a permanent redirect. End the line with 301.\n',
	);
});
