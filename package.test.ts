import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = import.meta.dirname;
const { name, version } = JSON.parse(
	readFileSync(join(root, "package.json"), "utf8"),
);

// The files npm would publish. Packing runs prepack first, so lib/ is in the list as a product gets it.
const packed: string[] = JSON.parse(
	execFileSync("npm", ["pack", "--dry-run", "--json"], {
		cwd: root,
		encoding: "utf8",
	}),
)[0].files.map((file: { path: string }) => file.path);

test("the package holds the command, the site's sources, the fonts with their licence, the template and the writing rules", () => {
	for (const file of [
		"lib/cli.js",
		"lib/check.js",
		"lib/core/search.js",
		"astro.config.ts",
		"src/content.config.ts",
		"src/pages/[...slug].astro",
		"src/styles/global.css",
		"src/worker.ts",
		"src/fonts/geist-sans.woff2",
		"src/fonts/geist-mono.woff2",
		"src/fonts/LICENSE.txt",
		"template/docs/content/index.md",
		// Without its dot: npm leaves a file named .gitignore out of a package.
		"template/docs/gitignore",
		"template/.github/workflows/docs.yml",
		"template/.github/workflows/docs-sync.yml",
		// The sync workflow unpacks this one file for its agent.
		"WRITING.md",
	]) {
		assert.ok(packed.includes(file), `${file} is not in the package`);
	}
});

test("the package holds no test and nothing of the kit's own site", () => {
	assert.deepEqual(
		packed.filter(
			(file) =>
				/\.test\./.test(file) ||
				!/^((lib|src|template)\/|(package\.json|README\.md|WRITING\.md|astro\.config\.ts)$)/.test(
					file,
				),
		),
		[],
	);
});

test("the shared sync workflow names the package at this version both times it downloads it", () => {
	assert.deepEqual(
		readFileSync(join(root, ".github/workflows/docs-sync.yml"), "utf8").match(
			/(npm pack|npx --ignore-scripts) \S+/g,
		),
		[`npm pack ${name}@${version}`, `npx --ignore-scripts ${name}@${version}`],
	);
});
