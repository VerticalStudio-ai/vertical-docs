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
		/JavaScript is \d+\.\d KB gzipped, over the 1 KB budget/,
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
