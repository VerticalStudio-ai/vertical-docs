import assert from "node:assert/strict";
import { test } from "node:test";
import { search } from "./search.ts";
import { sections } from "./sections.ts";

const record = (url: string, title: string, heading: string, text: string) => ({
	url,
	title,
	heading,
	text,
});

const urls = (records: Parameters<typeof search>[0], query: string) =>
	search(records)(query).map((hit) => hit.url);

test("a word that appears only in an h3 section finds that section first", () => {
	const page = {
		id: "reference/markdown",
		data: { title: "Markdown in a page", description: "What a page can use." },
		body: [
			"A page is plain Markdown.",
			"",
			"## Headings",
			"",
			"Use two hashes for a section.",
			"",
			"### A part of a section",
			"",
			"A smaller heading appears indented in the sidebar.",
			"",
			"## Lists",
			"",
			"A list of items.",
		].join("\n"),
	};
	assert.deepEqual(search(sections(page))("indented")[0], {
		url: "/reference/markdown/#a-part-of-a-section",
		title: "Markdown in a page",
		heading: "A part of a section",
		snippet: "A smaller heading appears indented in the sidebar.",
	});
});

test("ranks a match in the title over one in the heading over one in the text", () => {
	const records = [
		record("/text/", "Write a page", "Create the file", "Set the theme here"),
		record("/heading/", "Write a page", "Set the theme", "Create the file"),
		record("/title/", "Set the theme", "Create the file", "Write a page"),
	];
	assert.deepEqual(urls(records, "theme"), ["/title/", "/heading/", "/text/"]);
});

test("finds a word from its first letters and through a typing mistake", () => {
	const records = [
		record("/a/", "Site configuration", "", "Set the name."),
		record("/b/", "Write a page", "", "Add a Markdown file."),
	];
	assert.deepEqual(urls(records, "config"), ["/a/"]);
	assert.deepEqual(urls(records, "configurtion"), ["/a/"]);
});

test("returns nothing for an empty query", () => {
	assert.deepEqual(search([record("/a/", "A", "", "text")])(""), []);
});

test("returns the ten best sections at most", () => {
	const records = Array.from({ length: 12 }, (_, at) =>
		record(`/${at}/`, "Page", "", "theme"),
	);
	assert.equal(search(records)("theme").length, 10);
});

test("cuts the snippet around the first word that matched", () => {
	const before = "The build stops when a page breaks one of these rules. ";
	const after = " Every code block names its language after the opening fence.";
	const [hit] = search([
		record(
			"/a/",
			"Write a page",
			"Rules",
			`${before.repeat(3)}Callouts warn the reader.${after.repeat(3)}`,
		),
	])("callouts");
	assert.equal(
		hit?.snippet,
		"… when a page breaks one of these rules. Callouts warn the reader. Every code block names its language after the opening fence. Every code block names its …",
	);
});

test("starts the snippet at the start of the section when the match is in the title or heading", () => {
	const [hit] = search([
		record("/a/", "Deploy", "Pick a host", "Any static host works."),
	])("deploy");
	assert.equal(hit?.snippet, "Any static host works.");
});

test("shows the whole text when it fits, wherever the match is", () => {
	const text = "A quote whose first line is a marker becomes a callout.";
	const [hit] = search([record("/a/", "Markdown", "Quotes", text)])("callout");
	assert.equal(hit?.snippet, text);
});

test("fills the snippet from the end of the text when the match is near the end", () => {
	const filler = "The build stops when a page breaks one of these rules. ";
	const [hit] = search([
		record("/a/", "Write a page", "Rules", `${filler.repeat(4)}Callouts warn.`),
	])("callouts");
	assert.equal(
		hit?.snippet,
		"… a page breaks one of these rules. The build stops when a page breaks one of these rules. The build stops when a page breaks one of these rules. Callouts warn.",
	);
});

test("cuts the snippet around the matched word, not around the same letters inside a longer word", () => {
	const filler = "Here is more unrelated prose. ".repeat(12);
	const [hit] = search([
		record("/a/", "Pets", "", `Education matters. ${filler}A cat sleeps.`),
	])("cat");
	assert.match(hit?.snippet ?? "", /A cat sleeps\.$/);
});
