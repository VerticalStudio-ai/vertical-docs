import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	statSync,
	symlinkSync,
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

// Runs the real command with a folder as the current one, as npx starts it unless another runner's user agent is given. These tests run under pnpm, whose own user agent would otherwise reach the command.
const command = (
	cwd: string,
	args: string[],
	agent = "npm/10.9.9 node/v22.23.4 darwin arm64 workspaces/false",
) =>
	new Promise<{ status: number; stdout: string; stderr: string }>((resolve) => {
		const child = execFile(
			process.execPath,
			[join(import.meta.dirname, "cli.ts"), ...args],
			{ cwd, env: { ...process.env, npm_config_user_agent: agent } },
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

test("build prints no warning from Vite, which builds only the kit's own styles and script", async () => {
	const { status, stdout, stderr } = await command(product(), ["build"]);
	assert.equal(status, 0, stderr);
	assert.doesNotMatch(stdout + stderr, /warn.*vite/i);
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
			/Usage:\n {2}vertical-docs init \[folder\]\n {2}vertical-docs dev \[folder\]\n {2}vertical-docs build \[folder\]\n {2}vertical-docs check \[folder\]\n/,
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

// What init writes in a product folder, in the order it prints the files.
const starter = (folder: string) => [
	".github/workflows/docs-sync.yml",
	".github/workflows/docs.yml",
	"AGENTS.md",
	`${folder}/content/index.md`,
	`${folder}/docs.config.json`,
	`${folder}/.gitignore`,
	`${folder}/public/favicon.svg`,
	`${folder}/public/logo.svg`,
	`${folder}/public/share.png`,
	`${folder}/wrangler.jsonc`,
];

// Every file under a folder with its bytes, to compare a folder before and after a command.
const snapshot = (cwd: string) =>
	readdirSync(cwd, { recursive: true, encoding: "utf8" })
		.filter((file) => statSync(join(cwd, file)).isFile())
		.sort()
		.map((file) => [file, readFileSync(join(cwd, file), "base64")]);

test("init writes the docs folder with its ignore file and the two workflows, and prints them with the next command", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	const { status, stdout, stderr } = await command(cwd, ["init"]);
	assert.equal(status, 0, stderr);
	assert.deepEqual(
		snapshot(cwd).map(([file]) => file),
		starter("docs").toSorted(),
	);
	assert.equal(
		stdout,
		`${starter("docs")
			.map((file) => `Wrote ${file}`)
			.join("\n")}\nNext: npx vertical-docs dev docs\n`,
	);
	assert.equal(
		readFileSync(join(cwd, "docs/.gitignore"), "utf8"),
		"dist/\n.wrangler/\n",
	);
});

test("init takes the docs folder as an argument and names it in the workflows, the first page and the next command", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	const { status, stdout, stderr } = await command(cwd, ["init", "website"]);
	assert.equal(status, 0, stderr);
	assert.deepEqual(
		snapshot(cwd).map(([file]) => file),
		starter("website").toSorted(),
	);
	assert.match(stdout, /^Next: npx vertical-docs dev website$/m);
	const read = (file: string) => readFileSync(join(cwd, file), "utf8");
	assert.match(
		read(".github/workflows/docs.yml"),
		/vertical-docs check website$/m,
	);
	assert.match(read(".github/workflows/docs-sync.yml"), /site: website$/m);
	assert.match(read("website/content/index.md"), /vertical-docs dev website$/m);
	for (const file of starter("website")) {
		assert.doesNotMatch(read(file), /<folder>/, file);
	}
});

test("init started by pnpm names pnpm exec in the next command and in the first page, and leaves the workflows as they are", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	const { stdout } = await command(
		cwd,
		["init"],
		"pnpm/10.27.0 npm/? node/v22.23.4 darwin arm64",
	);
	assert.match(stdout, /^Next: pnpm exec vertical-docs dev docs$/m);
	assert.deepEqual(
		readFileSync(join(cwd, "docs/content/index.md"), "utf8").match(
			/^.* vertical-docs .*$/gm,
		),
		["pnpm exec vertical-docs dev docs", "pnpm exec vertical-docs check docs"],
	);
	const npx = mkdtempSync(join(tmpdir(), "cli-"));
	await command(npx, ["init"]);
	assert.deepEqual(
		readFileSync(join(npx, "docs/content/index.md"), "utf8").match(
			/^.* vertical-docs .*$/gm,
		),
		["npx vertical-docs dev docs", "npx vertical-docs check docs"],
	);
	for (const file of ["docs.yml", "docs-sync.yml"]) {
		assert.equal(
			readFileSync(join(cwd, ".github/workflows", file), "utf8"),
			readFileSync(join(npx, ".github/workflows", file), "utf8"),
		);
	}
});

test("init names the package at its own version in the install step of docs.yml", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	await command(cwd, ["init"]);
	const { version } = JSON.parse(
		readFileSync(join(import.meta.dirname, "../package.json"), "utf8"),
	);
	assert.match(version, /^\d+\.\d+\.\d+$/);
	assert.ok(
		readFileSync(join(cwd, ".github/workflows/docs.yml"), "utf8").includes(
			`\n      - run: npm install --no-save --ignore-scripts vertical-docs@${version}\n`,
		),
	);
});

test("the docs.yml that init writes runs npm outside the repository, whose package.json can refuse npm, and links the package to node_modules/ for the check and for wrangler", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	await command(cwd, ["init", "website"]);
	const steps = readFileSync(join(cwd, ".github/workflows/docs.yml"), "utf8")
		.split("\n      - ")
		.slice(1)
		// The split leaves the comment of the next step at the end of each one.
		.map((step) => step.replace(/\n\s*#.*$/gm, "").trimEnd());
	assert.deepEqual(
		steps
			.filter((step) => /^(if: .*\n\s+)?run: np[mx] /.test(step))
			.map((step) => [
				step.match(/run: (\S+ \S+)/)?.[1],
				/\n {8}working-directory: \$\{\{ runner\.temp \}\}$/m.test(step),
			]),
		[
			["npm install", true],
			["npx wrangler@4.161.0", true],
		],
	);
	assert.deepEqual(steps.slice(3, 5), [
		'run: ln -s "$RUNNER_TEMP/node_modules" node_modules',
		"run: node_modules/.bin/vertical-docs check website",
	]);
	assert.match(
		steps.slice(5).join(),
		/ --config "\$GITHUB_WORKSPACE\/website\/wrangler\.jsonc" /,
	);
});

test("init leaves a file that exists as it is", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	mkdirSync(join(cwd, "docs/content"), { recursive: true });
	writeFileSync(join(cwd, "docs/content/index.md"), "My own page.");
	const { status, stdout, stderr } = await command(cwd, ["init"]);
	assert.equal(status, 0, stderr);
	assert.equal(
		readFileSync(join(cwd, "docs/content/index.md"), "utf8"),
		"My own page.",
	);
	assert.equal(
		stdout,
		`${starter("docs")
			.filter((file) => file !== "docs/content/index.md")
			.map((file) => `Wrote ${file}`)
			.join("\n")}\nNext: npx vertical-docs dev docs\n`,
	);
});

test("a second init changes no file", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	await command(cwd, ["init"]);
	const before = snapshot(cwd);
	assert.equal(before.length, starter("docs").length);
	const { status, stdout } = await command(cwd, ["init"]);
	assert.equal(status, 0);
	assert.equal(stdout, "Next: npx vertical-docs dev docs\n");
	assert.deepEqual(snapshot(cwd), before);
});

test("init writes an AGENTS.md that tells a coding agent to edit the page with the code, where the rules are and which check to run", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	await command(cwd, ["init", "website"]);
	assert.equal(
		readFileSync(join(cwd, "AGENTS.md"), "utf8"),
		`## Keep the docs in step with the code

The docs of this repository are the Markdown pages in \`website/content/\`. When a change to the code changes behaviour that a page describes, do these three steps in the same change:

1. Read the writing rules, \`WRITING.md\` of the \`vertical-docs\` package: \`npx vertical-docs rules\` prints them.
2. Edit the page so that it describes the code as it is now.
3. Run \`npx vertical-docs check website\`, and fix what it reports.
`,
	);
	const pnpm = mkdtempSync(join(tmpdir(), "cli-"));
	await command(
		pnpm,
		["init"],
		"pnpm/10.27.0 npm/? node/v22.23.4 darwin arm64",
	);
	assert.deepEqual(
		readFileSync(join(pnpm, "AGENTS.md"), "utf8").match(
			/`[^`]* vertical-docs [^`]*`/g,
		),
		["`pnpm exec vertical-docs rules`", "`pnpm exec vertical-docs check docs`"],
	);
});

test("init adds its section to the end of an AGENTS.md that exists, once", async () => {
	for (const [own, gap] of [
		["# Repository guide\n\nRun the tests.\n", "\n"],
		["# Repository guide\n\nRun the tests.", "\n\n"],
	] as const) {
		const cwd = mkdtempSync(join(tmpdir(), "cli-"));
		writeFileSync(join(cwd, "AGENTS.md"), own);
		const { status, stdout, stderr } = await command(cwd, ["init"]);
		assert.equal(status, 0, stderr);
		const fresh = mkdtempSync(join(tmpdir(), "cli-"));
		await command(fresh, ["init"]);
		assert.equal(
			readFileSync(join(cwd, "AGENTS.md"), "utf8"),
			own + gap + readFileSync(join(fresh, "AGENTS.md"), "utf8"),
		);
		assert.equal(
			stdout,
			`${starter("docs")
				.map((file) =>
					file === "AGENTS.md"
						? "Added the docs section to AGENTS.md"
						: `Wrote ${file}`,
				)
				.join("\n")}\nNext: npx vertical-docs dev docs\n`,
		);
		const before = snapshot(cwd);
		const second = await command(cwd, ["init"]);
		assert.equal(second.stdout, "Next: npx vertical-docs dev docs\n");
		assert.deepEqual(snapshot(cwd), before);
	}
});

test("rules prints the writing rules of the package", async () => {
	const { status, stdout, stderr } = await command(tmpdir(), ["rules"]);
	assert.equal(status, 0, stderr);
	assert.equal(
		stdout,
		readFileSync(join(import.meta.dirname, "../WRITING.md"), "utf8"),
	);
});

test("a folder written by init passes check as it is", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	await command(cwd, ["init"]);
	const { status, stderr } = await command(cwd, ["check"]);
	assert.equal(status, 0, stderr);
	assert.match(
		readFileSync(join(cwd, "docs/dist/index.html"), "utf8"),
		/<title>[^<]*Docs/,
	);
});

// A wrangler.jsonc without what JSON does not allow: its comment lines, and the comma after a last entry.
const wrangler = (file: string) =>
	JSON.parse(
		readFileSync(file, "utf8")
			.replace(/^\s*\/\/.*$/gm, "")
			.replace(/,(?=\s*[\]}])/g, ""),
	);

test("init writes a wrangler.jsonc that finds the Worker inside the installed package, serves the folder's dist as the kit's own does, and leaves the name of the Worker to the product", async () => {
	const cwd = mkdtempSync(join(tmpdir(), "cli-"));
	// The package as pnpm installs it in a product: a link in node_modules, here to the kit itself.
	mkdirSync(join(cwd, "node_modules"));
	symlinkSync(
		join(import.meta.dirname, ".."),
		join(cwd, "node_modules/vertical-docs"),
	);
	await command(cwd, ["init", "website"]);
	const written = wrangler(join(cwd, "website/wrangler.jsonc"));
	const kit = wrangler(join(import.meta.dirname, "../wrangler.jsonc"));
	assert.equal(
		realpathSync(join(cwd, "website", written.main)),
		join(import.meta.dirname, "worker.ts"),
	);
	// Wrangler refuses a name with other characters, so no site is deployed under a name it shares with another.
	assert.doesNotMatch(written.name, /^[a-z0-9-]+$/);
	assert.deepEqual(
		[written.compatibility_date, written.assets],
		[kit.compatibility_date, kit.assets],
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
