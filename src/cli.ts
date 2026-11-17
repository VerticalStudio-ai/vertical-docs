import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { search } from "./core/search.ts";

const usage = 'Usage: pnpm run search "<query>" [--json] [--url <site>]';

const stop: (message: string) => never = (message) => {
	console.error(message);
	process.exit(1);
};

const reason = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

const args = () => {
	try {
		return parseArgs({
			allowPositionals: true,
			options: { json: { type: "boolean" }, url: { type: "string" } },
		});
	} catch (error) {
		return stop(`${reason(error)}\n${usage}`);
	}
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

const { values, positionals } = args();
const query = positionals.join(" ");
if (!query) stop(`No query.\n${usage}`);

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
