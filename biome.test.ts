import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
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

test("the JSON files of the template are printed as Prettier prints them by default: two spaces, and in a .jsonc file a comma after the last entry", () => {
	const dir = mkdtempSync(join(tmpdir(), "biome-"));
	for (const file of ["biome.json", ".gitignore"]) {
		copyFileSync(join(root, file), join(dir, file));
	}
	mkdirSync(join(dir, "template/docs"), { recursive: true });
	// Each second text is what Prettier 3.9.6 prints for the first one without a configuration.
	const files = [
		[
			"template/docs/docs.config.json",
			'{\n\t"name": "Your Docs",\n\t"tabs": ["guides", "reference"]\n}\n',
			'{\n  "name": "Your Docs",\n  "tabs": ["guides", "reference"]\n}\n',
		],
		[
			"template/docs/wrangler.jsonc",
			'{\n\t// The Worker.\n\t"assets": {\n\t\t"run_worker_first": ["/*", "!/_astro/*"]\n\t}\n}\n',
			'{\n  // The Worker.\n  "assets": {\n    "run_worker_first": ["/*", "!/_astro/*"],\n  },\n}\n',
		],
	] as const;
	for (const [file, tabbed] of files) writeFileSync(join(dir, file), tabbed);
	spawnSync(join(root, "node_modules/.bin/biome"), ["format", "--write"], {
		cwd: dir,
	});
	for (const [file, , prettier] of files) {
		assert.equal(readFileSync(join(dir, file), "utf8"), prettier, file);
	}
});
