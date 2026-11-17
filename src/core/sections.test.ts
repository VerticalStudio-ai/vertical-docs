import assert from "node:assert/strict";
import { test } from "node:test";
import { sections } from "./sections.ts";

const page = (id: string, body: string) => ({
	id,
	data: { title: "Deploy the site", description: "Upload the build." },
	body,
});

const urls = (body: string) =>
	sections(page("deploy", body)).map((section) => section.url);

test("makes one record for the text before the first heading and one per ## and ###", () => {
	const body = [
		"Run the check first.",
		"",
		"## Build the site",
		"",
		"The build goes to dist.",
		"",
		"### Pick a host",
		"",
		"Any static host works.",
	].join("\n");
	assert.deepEqual(sections(page("guides/deploy", body)), [
		{
			url: "/guides/deploy/",
			title: "Deploy the site",
			heading: "",
			text: "Upload the build. Run the check first.",
		},
		{
			url: "/guides/deploy/#build-the-site",
			title: "Deploy the site",
			heading: "Build the site",
			text: "The build goes to dist.",
		},
		{
			url: "/guides/deploy/#pick-a-host",
			title: "Deploy the site",
			heading: "Pick a host",
			text: "Any static host works.",
		},
	]);
});

test("gives the home page the URL /", () => {
	assert.deepEqual(
		sections(page("index", "## Install")).map((section) => section.url),
		["/", "/#install"],
	);
});

// Each id below is the one Astro 7.4.12 gave the same heading in a built page.
test("makes the anchors the site makes, with inline Markdown removed from the heading", () => {
	const headings = {
		"## Use `pnpm check` to *finish* a **change**":
			"use-pnpm-check-to-finish-a-change",
		"## Read [the plan](/reference/) first": "read-the-plan-first",
		"## The `__init__` method and snake_case":
			"the-__init__-method-and-snake_case",
		"## A_b _c_ d": "a_b-c-d",
		'## Don\'t "quote" -- or... dash': "dont-quote--or-dash",
		"## C++ & é ü 日本": "c--é-ü-日本",
		"## Trailing hashes ##": "trailing-hashes",
		"   ## Indented three": "indented-three",
	};
	assert.deepEqual(
		urls(Object.keys(headings).join("\n\n")).slice(1),
		Object.values(headings).map((id) => `/deploy/#${id}`),
	);
});

test("keeps the words of the heading as the reader sees them", () => {
	const [, section] = sections(
		page("deploy", "## Use `--json` with [the search](/search/) -- *fast*"),
	);
	assert.equal(section?.heading, "Use --json with the search – fast");
});

test("numbers a repeated heading the way the site does, starting again on each page", () => {
	const body = "## Example\n\n### Example\n\n## Example";
	const expected = [
		"/deploy/",
		"/deploy/#example",
		"/deploy/#example-1",
		"/deploy/#example-2",
	];
	assert.deepEqual(urls(body), expected);
	assert.deepEqual(urls(body), expected);
});

test("does not start a section at a heading inside a code block", () => {
	const body = [
		"## Create the file",
		"",
		"```md",
		"## Build the site",
		"```",
		"",
		"~~~md",
		"## Tilde fence",
		"~~~",
		"",
		"````md",
		"```md",
		"## Nested fence",
		"```",
		"````",
		"",
		"## Follow the rules",
	].join("\n");
	assert.deepEqual(
		sections(page("deploy", body)).map(({ url, text }) => [url, text]),
		[
			["/deploy/", "Upload the build."],
			[
				"/deploy/#create-the-file",
				"## Build the site ## Tilde fence ```md ## Nested fence ```",
			],
			["/deploy/#follow-the-rules", ""],
		],
	);
});

test("stores the text a reader sees, without Markdown marks, on one line", () => {
	const body = [
		"Write **bold** and *emphasis*, [a link](/reference/) and `pnpm check --json`.",
		"",
		"- One file is one page.",
		"1. Run `pnpm install`.",
		"",
		"| Field | Used for |",
		"|---|---|",
		"| `name` | The text next to the logo. |",
		"",
		"> A quote.",
		"",
		"> [!NOTE]",
		"> The site reloads.",
		"",
		"```ts",
		"const total = a * b; // `raw` -- code",
		"```",
	].join("\n");
	assert.equal(
		sections(page("deploy", body))[0]?.text,
		"Upload the build. Write bold and emphasis, a link and pnpm check --json. One file is one page. Run pnpm install. Field Used for name The text next to the logo. A quote. The site reloads. const total = a * b; // `raw` -- code",
	);
});

// The ids are the ones Astro 7.4.12 gave this page: create, real, same, same-1, in-a-list, on-the-marker-line, last.
test("reads headings and code blocks inside lists and quotes the way the site does", () => {
	const body = [
		"## Create",
		"",
		"- ```md",
		"  ## Fake",
		"  ```",
		"",
		"## Real",
		"",
		"> ## Same",
		"",
		"## Same",
		"",
		"1. Step",
		"",
		"   ## In a list",
		"",
		"- ## On the marker line",
		"",
		"> ```md",
		"> ## Quoted code",
		"> ```",
		"",
		"## Last",
	].join("\n");
	assert.deepEqual(urls(body).slice(1), [
		"/deploy/#create",
		"/deploy/#real",
		"/deploy/#same",
		"/deploy/#same-1",
		"/deploy/#in-a-list",
		"/deploy/#on-the-marker-line",
		"/deploy/#last",
	]);
});
