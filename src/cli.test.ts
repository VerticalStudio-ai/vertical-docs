import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { search } from "./core/search.ts";

const sections = [
	{
		url: "/",
		title: "Run docs-kit locally",
		heading: "",
		text: "Install the dependencies and start the local site.",
	},
	{
		url: "/reference/markdown/#callouts",
		title: "Markdown in a page",
		heading: "Callouts",
		text: "A quote whose first line is a marker becomes a callout.",
	},
	{
		url: "/write-a-page/",
		title: "Write a page",
		heading: "",
		text: "A callout warns the reader.",
	},
];

// Runs the real command with a folder as the current one.
const command = (cwd: string, args: string[]) =>
	new Promise<{ status: number; stdout: string; stderr: string }>((resolve) => {
		const child = execFile(
			process.execPath,
			[join(import.meta.dirname, "cli.ts"), ...args],
			{ cwd },
			(_, stdout, stderr) =>
				resolve({ status: child.exitCode ?? 1, stdout, stderr }),
		);
	});

// Runs the search in a throwaway folder, with or without a built dist/search.json.
const run = (args: string[], built = true) => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	if (built) {
		mkdirSync(join(cwd, "dist"));
		writeFileSync(join(cwd, "dist/search.json"), JSON.stringify(sections));
	}
	return command(cwd, ["search", ...args]);
};

// A product folder that holds nothing of the kit: one page, the configuration and a logo, in docs/.
const product = () => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	mkdirSync(join(cwd, "docs/content"), { recursive: true });
	mkdirSync(join(cwd, "docs/public"));
	writeFileSync(
		join(cwd, "docs/content/index.md"),
		"---\ntitle: Start here\ndescription: The first page of the product's docs.\n---\n\nHello from the product.\n",
	);
	writeFileSync(
		join(cwd, "docs/docs.config.json"),
		JSON.stringify({
			name: "Product Docs",
			description: "The docs of a product.",
			url: "https://product.example",
			repo: "https://github.com/example/product",
			accent: "#171717",
		}),
	);
	writeFileSync(
		join(cwd, "docs/public/logo.svg"),
		'<svg xmlns="http://www.w3.org/2000/svg"/>',
	);
	return cwd;
};

test("build writes the site of the product's docs folder to its dist", async () => {
	const cwd = product();
	const { status, stderr } = await command(cwd, ["build"]);
	assert.equal(status, 0, stderr);
	const page = readFileSync(join(cwd, "docs/dist/index.html"), "utf8");
	assert.match(page, /<title>[^<]*Product Docs/);
	assert.match(page, /Hello from the product\./);
});

test("build takes the docs folder as an argument", async () => {
	const cwd = product();
	const { status, stderr } = await command(tmpdir(), [
		"build",
		join(cwd, "docs"),
	]);
	assert.equal(status, 0, stderr);
	assert.match(
		readFileSync(join(cwd, "docs/dist/index.md"), "utf8"),
		/Hello from the product\./,
	);
});

test("fails and names the folder when it holds no docs", async () => {
	for (const args of [["build"], ["dev", "website"]]) {
		const { status, stderr } = await command(tmpdir(), args);
		assert.equal(status, 1);
		assert.match(
			stderr,
			/Cannot read .*(docs|website)\/docs\.config\.json\. Name the folder that holds the docs: vertical-docs (build|dev) <folder>/,
		);
	}
});

test("fails and shows the commands without one or with an unknown one", async () => {
	for (const args of [[], ["deploy"]]) {
		const { status, stderr } = await command(tmpdir(), args);
		assert.equal(status, 1);
		assert.match(stderr, /Usage: vertical-docs <dev\|build> \[folder\]/);
	}
});

test("prints the ranked sections of dist/search.json as plain text", async () => {
	const { status, stdout } = await run(["callout"]);
	assert.equal(status, 0);
	assert.equal(
		stdout,
		"Markdown in a page › Callouts\n/reference/markdown/#callouts\nA quote whose first line is a marker becomes a callout.\n\nWrite a page\n/write-a-page/\nA callout warns the reader.\n",
	);
});

test("prints the same hits as the core search with --json", async () => {
	const { status, stdout } = await run(["callout", "--json"]);
	assert.equal(status, 0);
	assert.deepEqual(JSON.parse(stdout), search(sections)("callout"));
});

test("says so when nothing matches, and exits with 0", async () => {
	const { status, stdout } = await run(["zebra"]);
	assert.equal(status, 0);
	assert.equal(stdout, 'No results for "zebra".\n');
});

test("searches a deployed site with --url", async () => {
	const server = createServer((request, response) => {
		response.statusCode = request.url === "/search.json" ? 200 : 404;
		response.end(JSON.stringify(sections));
	}).listen(0);
	const address = server.address();
	const site = `http://localhost:${typeof address === "object" ? address?.port : ""}`;
	const { status, stdout } = await run(["callout", "--url", site], false);
	server.close();
	assert.equal(status, 0);
	assert.match(stdout, /^Markdown in a page › Callouts\n/);
});

test("fails and says to build first when dist/search.json is missing", async () => {
	const { status, stderr } = await run(["callout"], false);
	assert.equal(status, 1);
	assert.match(stderr, /dist\/search\.json.*Run pnpm check first/);
});

test("fails and names the address when the site does not answer", async () => {
	const { status, stderr } = await run([
		"callout",
		"--url",
		"http://localhost:1",
	]);
	assert.equal(status, 1);
	assert.match(
		stderr,
		/search\.json from http:\/\/localhost:1.*Check the address after --url/,
	);
});

test("fails and shows the usage without a query or with an unknown option", async () => {
	for (const args of [[], ["callout", "--nope"]]) {
		const { status, stderr } = await run(args);
		assert.equal(status, 1);
		assert.match(
			stderr,
			/Usage: pnpm run search "<query>" \[--json\] \[--url <site>\]/,
		);
	}
});
