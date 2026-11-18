#!/usr/bin/env node
import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type ParseArgsOptionsConfig, parseArgs } from "node:util";
import { search } from "./core/search.ts";

const usage = "Usage: vertical-docs <dev|build> [folder]";
const searchUsage = 'Usage: pnpm run search "<query>" [--json] [--url <site>]';

const stop: (message: string) => never = (message) => {
	console.error(message);
	process.exit(1);
};

const reason = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

const [command, ...rest] = process.argv.slice(2);

const args = <T extends ParseArgsOptionsConfig>(options: T, help: string) => {
	try {
		return parseArgs({ args: rest, allowPositionals: true, options });
	} catch (error) {
		return stop(`${reason(error)}\n${help}`);
	}
};

// The kit is the Astro project, also when it is installed in node_modules. Astro starts inside the kit and finds the site through DOCS_ROOT, which astro.config.ts and src/content.config.ts resolve from two different folders unless it is absolute.
const astro = async (command: "dev" | "build") => {
	const site = resolve(args({}, usage).positionals[0] ?? "docs");
	const config = join(site, "docs.config.json");
	if (!existsSync(config)) {
		stop(
			`Cannot read ${config}. Name the folder that holds the docs: vertical-docs ${command} <folder>`,
		);
	}
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
	process.exit(status ?? 1);
};

// The index is the site's own build output: dist/search.json, or the same file on a deployed site.
const sections = async (site: string | undefined) => {
	if (site === undefined) {
		try {
			return JSON.parse(readFileSync("dist/search.json", "utf8"));
		} catch {
			return stop(
				"Cannot read dist/search.json. Run pnpm check first: it builds the site and the search index.",
			);
		}
	}
	try {
		const response = await fetch(new URL("/search.json", site));
		if (!response.ok) throw new Error(`the site answered ${response.status}`);
		return await response.json();
	} catch (error) {
		return stop(
			`Cannot read search.json from ${site}: ${reason(error)}. Check the address after --url.`,
		);
	}
};

if (command === "dev" || command === "build") await astro(command);
if (command !== "search") stop(usage);

const { values, positionals } = args(
	{ json: { type: "boolean" }, url: { type: "string" } },
	searchUsage,
);
const query = positionals.join(" ");
if (!query) stop(`No query.\n${searchUsage}`);

const hits = search(await sections(values.url))(query);
console.log(
	values.json
		? JSON.stringify(hits, null, 2)
		: hits
				.map(({ url, title, heading, snippet }) =>
					[heading ? `${title} › ${heading}` : title, url, snippet].join("\n"),
				)
				.join("\n\n") || `No results for "${query}".`,
);
