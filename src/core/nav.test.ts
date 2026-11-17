import assert from "node:assert/strict";
import { test } from "node:test";
import { neighbours, sidebar } from "./nav.ts";

const page = (id: string, title: string, order?: number) => ({
	id,
	data: { title, order },
});

const pages = [
	page("reference/markdown", "Markdown", 2),
	page("index", "Start", 1),
	page("reference", "Reference", 3),
	page("write-a-page", "Write a page", 2),
	page("reference/frontmatter", "Frontmatter", 1),
];

test("sorts pages by order and nests a folder's pages under its index page", () => {
	assert.deepEqual(sidebar(pages), [
		{ title: "Start", href: "/", children: [] },
		{ title: "Write a page", href: "/write-a-page/", children: [] },
		{
			title: "Reference",
			href: "/reference/",
			children: [
				{ title: "Frontmatter", href: "/reference/frontmatter/", children: [] },
				{ title: "Markdown", href: "/reference/markdown/", children: [] },
			],
		},
	]);
});

test("puts pages without an order last, by title", () => {
	const titles = sidebar([
		page("b", "Beta"),
		page("c", "Gamma", 5),
		page("a", "Alpha"),
	]).map((item) => item.title);
	assert.deepEqual(titles, ["Gamma", "Alpha", "Beta"]);
});

test("nests folders inside folders", () => {
	const [api] = sidebar([
		page("api", "API"),
		page("api/auth", "Auth"),
		page("api/auth/tokens", "Tokens"),
	]);
	assert.equal(api?.children[0]?.children[0]?.href, "/api/auth/tokens/");
});

test("says what to add when a folder has no index page", () => {
	assert.throws(
		() => sidebar([page("guides/first", "First")]),
		/content\/guides\/index\.md/,
	);
});

test("finds the pages before and after a page in sidebar order", () => {
	const tree = sidebar(pages);
	assert.deepEqual(neighbours(tree, "/"), {
		previous: undefined,
		next: tree[1],
	});
	assert.deepEqual(neighbours(tree, "/reference/"), {
		previous: tree[1],
		next: tree[2]?.children[0],
	});
	assert.deepEqual(neighbours(tree, "/reference/markdown/"), {
		previous: tree[2]?.children[0],
		next: undefined,
	});
});
