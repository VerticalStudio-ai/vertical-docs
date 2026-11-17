import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";

const root = import.meta.dirname;

// Lints one throwaway file at `path` with the real biome.json.
const lint = (path: string, code: string) => {
	const dir = mkdtempSync(join(tmpdir(), "biome-"));
	// biome.json reads the ignore file, so Biome stops when there is none.
	for (const file of ["biome.json", ".gitignore"]) {
		copyFileSync(join(root, file), join(dir, file));
	}
	mkdirSync(dirname(join(dir, path)), { recursive: true });
	writeFileSync(join(dir, path), code);
	return spawnSync(join(root, "node_modules/.bin/biome"), ["lint"], {
		cwd: dir,
		encoding: "utf8",
	});
};

test("core cannot import Astro or Node", () => {
	const { stderr } = lint(
		"src/core/probe.ts",
		'import { getCollection } from "astro:content";\nimport { readFileSync } from "node:fs";\nexport const probe = [getCollection, readFileSync];\n',
	);
	assert.match(stderr, /noRestrictedImports/);
	assert.match(stderr, /noNodejsModules/);
});

test("core tests can import the Node test runner", () => {
	const { status } = lint(
		"src/core/probe.test.ts",
		'import { test } from "node:test";\ntest("probe", () => {});\n',
	);
	assert.equal(status, 0);
});

test("any, default exports and barrel files are reported", () => {
	const { stderr } = lint(
		"src/probe.ts",
		'export * from "./other.ts";\nconst probe: any = 1;\nexport default probe;\n',
	);
	assert.match(stderr, /noExplicitAny/);
	assert.match(stderr, /noDefaultExport/);
	assert.match(stderr, /noBarrelFile/);
});
