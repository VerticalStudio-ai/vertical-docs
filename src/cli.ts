#!/usr/bin/env node
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type ParseArgsOptionsConfig, parseArgs } from "node:util";
import { siteProblems } from "./check.ts";
import { search } from "./core/search.ts";

const usage = `Usage:
  vertical-docs init [folder]
  vertical-docs dev [folder]
  vertical-docs build [folder]
  vertical-docs check [folder]
  vertical-docs search "<query>" [folder] [--json] [--url <site>]
  vertical-docs rules
The folder holds the docs: docs unless named.`;

const stop: (message: string) => never = (message) => {
	console.error(message);
	process.exit(1);
};

const reason = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

const [command, ...rest] = process.argv.slice(2);

const args = <T extends ParseArgsOptionsConfig>(options: T) => {
	try {
		return parseArgs({ args: rest, allowPositionals: true, options });
	} catch (error) {
		return stop(`${reason(error)}\n${usage}`);
	}
};

// The kit is the Astro project, also when it is installed in node_modules. Astro starts inside the kit and finds the site through DOCS_ROOT, which astro.config.ts and src/content.config.ts resolve from two different folders unless it is absolute.
const astro = async (command: "dev" | "build", site: string) => {
	const child = spawn(
		process.execPath,
		[
			join(
				dirname(fileURLToPath(import.meta.resolve("astro/package.json"))),
				"bin/astro.mjs",
			),
			command,
			// Astro's lock file sits inside the kit, where `astro dev stop` cannot be run from a product. Without the lock the preview stays in this terminal, also when an agent starts it, and Ctrl+C stops it.
			...(command === "build"
				? ["--outDir", join(site, "dist")]
				: ["--ignore-lock"]),
		],
		{
			cwd: join(import.meta.dirname, ".."),
			env: { ...process.env, DOCS_ROOT: join(site, "content") },
			stdio: "inherit",
		},
	);
	// A signal sent to this command alone would leave the preview running on its port.
	for (const signal of ["SIGINT", "SIGTERM"] as const) {
		process.on(signal, () => child.kill(signal));
	}
	const [status] = await once(child, "exit");
	return status ?? 1;
};

// The index is the site's own build output: dist/search.json in the docs folder, or the same file on a deployed site.
const sections = async (folder: string, url: string | undefined) => {
	if (url === undefined) {
		const index = resolve(folder, "dist/search.json");
		try {
			return JSON.parse(readFileSync(index, "utf8"));
		} catch {
			return stop(
				`Cannot read ${index}. Run vertical-docs build first, or name the folder that holds the docs: vertical-docs search "<query>" <folder>`,
			);
		}
	}
	try {
		const response = await fetch(new URL("/search.json", url));
		if (!response.ok) throw new Error(`the site answered ${response.status}`);
		return await response.json();
	} catch (error) {
		return stop(
			`Cannot read search.json from ${url}: ${reason(error)}. Check the address after --url.`,
		);
	}
};

if (command === "init") {
	const folder = args({}).positionals[0] ?? "docs";
	const template = join(import.meta.dirname, "../template");
	const { version } = JSON.parse(
		readFileSync(join(import.meta.dirname, "../package.json"), "utf8"),
	);
	// The runner that started init is the one the first page and the last line name. pnpm sets this user agent; any other start is taken as npx.
	const run = process.env.npm_config_user_agent?.startsWith("pnpm/")
		? "pnpm exec"
		: "npx";
	for (const file of readdirSync(template, {
		recursive: true,
		encoding: "utf8",
	}).sort()) {
		const from = join(template, file);
		// The template holds the docs folder as docs/, and the ignore file without its dot: npm leaves a file named .gitignore out of a package.
		const to = file
			.replace(/^docs(?=\/)/, folder)
			.replace(/gitignore$/, ".gitignore");
		if (!statSync(from).isFile()) continue;
		const bytes = readFileSync(from);
		const content = /\.(md|yml)$/.test(file)
			? bytes
					.toString()
					.replaceAll("<folder>", folder)
					.replaceAll("<version>", version)
					.replaceAll("<run>", run)
			: bytes;
		if (!existsSync(to)) {
			mkdirSync(dirname(to), { recursive: true });
			writeFileSync(to, content);
			console.log(`Wrote ${to}`);
			continue;
		}
		// The one file init adds to: most repositories have an AGENTS.md, and an agent that changes code reads only the one in the root. A file that names the check already has the section, or the repository's own words for it.
		if (file !== "AGENTS.md") continue;
		const own = readFileSync(to, "utf8");
		if (own.includes("vertical-docs check")) continue;
		appendFileSync(to, `${own.endsWith("\n") ? "" : "\n"}\n${content}`);
		console.log(`Added the docs section to ${to}`);
	}
	console.log(`Next: ${run} vertical-docs dev ${folder}`);
	process.exit();
}

if (command === "dev" || command === "build" || command === "check") {
	const site = resolve(args({}).positionals[0] ?? "docs");
	const config = join(site, "docs.config.json");
	if (!existsSync(config)) {
		stop(
			`Cannot read ${config}. Name the folder that holds the docs: vertical-docs ${command} <folder>`,
		);
	}
	const status = await astro(command === "dev" ? "dev" : "build", site);
	if (command !== "check" || status !== 0) process.exit(status);
	const problems = siteProblems(join(site, "dist"));
	if (problems.length > 0) stop(problems.join("\n"));
	process.exit();
}
if (command === "rules") {
	// Waits for the write: an exit right after it drops the text on a pipe that is full.
	await new Promise((written) =>
		process.stdout.write(
			readFileSync(join(import.meta.dirname, "../WRITING.md"), "utf8"),
			written,
		),
	);
	process.exit();
}
if (command !== "search") stop(usage);

const {
	values,
	positionals: [query, folder = "docs"],
} = args({ json: { type: "boolean" }, url: { type: "string" } });
if (!query) stop(`No query.\n${usage}`);

const hits = search(await sections(folder, values.url))(query);
console.log(
	values.json
		? JSON.stringify(hits, null, 2)
		: hits
				.map(({ url, title, heading, snippet }) =>
					[heading ? `${title} › ${heading}` : title, url, snippet].join("\n"),
				)
				.join("\n\n") || `No results for "${query}".`,
);
