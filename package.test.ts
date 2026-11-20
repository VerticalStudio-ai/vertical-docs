import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const root = import.meta.dirname;
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const { name, version } = manifest;

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
		"template/AGENTS.md",
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
				!/^((lib|src|template)\/|(package\.json|README\.md|LICENSE|WRITING\.md|astro\.config\.ts)$)/.test(
					file,
				),
		),
		[],
	);
});

test("the shared sync workflow names the package at this version both times it downloads it", () => {
	// Only a line that runs: a comment that names a command starts with a #.
	assert.deepEqual(
		Array.from(
			readFileSync(
				join(root, ".github/workflows/docs-sync.yml"),
				"utf8",
			).matchAll(/^\s*(?:run: )?((?:npm pack|npx --ignore-scripts) \S+)/gm),
			([, command]) => command,
		),
		[`npm pack ${name}@${version}`, `npx --ignore-scripts ${name}@${version}`],
	);
});

test("the package can be published: it is not private, it is under the MIT licence with the licence file in it, and it names the repository that the README's links resolve against", () => {
	assert.equal(manifest.private, undefined);
	assert.equal(manifest.license, "MIT");
	assert.ok(packed.includes("LICENSE"), "LICENSE is not in the package");
	assert.match(readFileSync(join(root, "LICENSE"), "utf8"), /^MIT License\n/);
	// The form npm itself writes: with another form `npm publish` warns and corrects it.
	assert.deepEqual(manifest.repository, {
		type: "git",
		url: "git+https://github.com/VerticalStudio-ai/vertical-docs.git",
	});
});

// The first script of the publish workflow, run as GitHub runs it, with a curl that gives the answer of npm's registry.
const refusal = (ref: string, answer: string) => {
	const script = readFileSync(
		join(root, ".github/workflows/publish.yml"),
		"utf8",
	)
		.match(/^ {6}- run: \|\n((?: {10}.*\n)+)/m)?.[1]
		?.replaceAll(/^ {10}/gm, "");
	assert.ok(script, "publish.yml has no script");
	const bin = mkdtempSync(join(tmpdir(), "publish-"));
	writeFileSync(
		join(bin, "curl"),
		`#!/bin/sh\necho "$@" > "${bin}/asked"\nprintf ${answer}\n`,
	);
	chmodSync(join(bin, "curl"), 0o755);
	const { status, stdout } = spawnSync("bash", ["-e", "-c", script], {
		cwd: root,
		encoding: "utf8",
		env: {
			...process.env,
			PATH: `${bin}:${process.env.PATH}`,
			GITHUB_REF: ref,
		},
	});
	return {
		status,
		stdout,
		asked: status === 0 ? readFileSync(join(bin, "asked"), "utf8") : "",
	};
};

test("the publish workflow goes on only on main and only when npm does not have the version", () => {
	const free = refusal("refs/heads/main", "404");
	assert.equal(free.status, 0, free.stdout);
	assert.match(
		free.asked,
		new RegExp(` https://registry\\.npmjs\\.org/${name}/${version}\n$`),
	);
	const taken = refusal("refs/heads/main", "200");
	assert.equal(taken.status, 1);
	assert.match(taken.stdout, /^::error::.* is already on npm\./);
	assert.equal(refusal("refs/heads/main", "503").status, 1);
	const branch = refusal("refs/heads/next", "404");
	assert.equal(branch.status, 1);
	assert.match(branch.stdout, /^::error::.* on main/);
});
