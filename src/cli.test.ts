import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
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

// Runs the real command in a throwaway folder, with or without a built dist/search.json.
const run = (args: string[], built = true) => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	if (built) {
		mkdirSync(join(cwd, "dist"));
		writeFileSync(join(cwd, "dist/search.json"), JSON.stringify(sections));
	}
	return new Promise<{ status: number; stdout: string; stderr: string }>(
		(resolve) => {
			const child = execFile(
				process.execPath,
				[join(import.meta.dirname, "cli.ts"), ...args],
				{ cwd },
				(_, stdout, stderr) =>
					resolve({ status: child.exitCode ?? 1, stdout, stderr }),
			);
		},
	);
};

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
