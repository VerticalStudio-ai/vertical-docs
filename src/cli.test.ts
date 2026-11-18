import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	writeFileSync,
} from "node:fs";
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

// Runs the search in a throwaway product folder, with or without a built docs/dist/search.json.
const run = (args: string[], built = true) => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	if (built) {
		mkdirSync(join(cwd, "docs/dist"), { recursive: true });
		writeFileSync(join(cwd, "docs/dist/search.json"), JSON.stringify(sections));
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
	const cwd = realpathSync(mkdtempSync(join(tmpdir(), "cli-")));
	for (const args of [["build"], ["dev", "website"]]) {
		const { status, stderr } = await command(cwd, args);
		assert.equal(status, 1);
		assert.equal(
			stderr,
			`Cannot read ${join(cwd, args[1] ?? "docs", "docs.config.json")}. Name the folder that holds the docs: vertical-docs ${args[0]} <folder>\n`,
		);
	}
});

test("fails and shows the commands without one or with an unknown one", async () => {
	for (const args of [[], ["deploy"]]) {
		const { status, stderr } = await command(tmpdir(), args);
		assert.equal(status, 1);
		assert.match(
			stderr,
			/Usage:\n {2}vertical-docs dev \[folder\]\n {2}vertical-docs build \[folder\]\n {2}vertical-docs check \[folder\]\n/,
		);
	}
});

// Every page names a favicon and a share image, so a site that passes the check has both.
const checked = (page: string) => {
	const cwd = product();
	for (const file of ["favicon.svg", "share.png"]) {
		writeFileSync(join(cwd, "docs/public", file), "");
	}
	writeFileSync(
		join(cwd, "docs/content/index.md"),
		`---\ntitle: Start here\ndescription: The first page of the product's docs.\n---\n\n${page}\n`,
	);
	return cwd;
};

test("check builds the product's docs folder and passes when nothing is wrong", async () => {
	const cwd = checked("Hello from the product.");
	const { status, stderr } = await command(cwd, ["check"]);
	assert.equal(status, 0, stderr);
	assert.match(
		readFileSync(join(cwd, "docs/dist/index.html"), "utf8"),
		/Hello from the product\./,
	);
});

test("check fails and names a link to a page that does not exist", async () => {
	const cwd = checked("Read [the guide](/guide/).");
	const { status, stderr } = await command(tmpdir(), [
		"check",
		join(cwd, "docs"),
	]);
	assert.equal(status, 1);
	assert.match(
		stderr,
		/^index\.html: link "\/guide\/" points to no file in dist\. Fix the link or add the page\.$/m,
	);
});

test("check fails without a build when the folder holds no docs", async () => {
	const cwd = realpathSync(mkdtempSync(join(tmpdir(), "cli-")));
	const { status, stderr } = await command(cwd, ["check"]);
	assert.equal(status, 1);
	assert.equal(
		stderr,
		`Cannot read ${join(cwd, "docs/docs.config.json")}. Name the folder that holds the docs: vertical-docs check <folder>\n`,
	);
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

test("search takes the docs folder after the query", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	mkdirSync(join(cwd, "website/dist"), { recursive: true });
	writeFileSync(
		join(cwd, "website/dist/search.json"),
		JSON.stringify(sections),
	);
	const { status, stdout } = await command(cwd, [
		"search",
		"callout",
		"website",
		"--json",
	]);
	assert.equal(status, 0);
	assert.deepEqual(JSON.parse(stdout), search(sections)("callout"));
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
	assert.match(
		stderr,
		/docs\/dist\/search\.json\. Run vertical-docs build first, or name the folder that holds the docs: vertical-docs search "<query>" <folder>/,
	);
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
			/Usage:\n(?: {2}.+\n)+ {2}vertical-docs search "<query>" \[folder\] \[--json\] \[--url <site>\]\n/,
		);
	}
});
