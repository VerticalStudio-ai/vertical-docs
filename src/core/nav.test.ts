import assert from "node:assert/strict";
import { test } from "node:test";
import { navigation, neighbours, sidebar } from "./nav.ts";

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

const site = sidebar([
	page("index", "Start", 1),
	page("glossary", "Glossary", 2),
	page("call", "Call", 3),
	page("call/quickstart", "Quickstart", 1),
	page("call/sell", "Sell", 2),
	page("call/sell/fees", "Fees", 1),
	page("agents", "Agents", 4),
	page("agents/wallets", "Wallets", 1),
	page("legal", "Legal", 5),
	page("legal/terms", "Terms", 1),
]);
const [start, glossary, , agents, legal] = site;

test("a site that lists no tabs has one tab that holds the whole sidebar", () => {
	assert.deepEqual(navigation(site, [], "/call/sell/"), {
		tabs: [{ title: "Overview", href: "/", current: true }],
		items: site,
	});
});

test("a listed folder is a tab named after its index page, in the order listed, after Overview", () => {
	assert.deepEqual(navigation(site, ["agents", "call"], "/glossary/").tabs, [
		{ title: "Overview", href: "/", current: true },
		{ title: "Agents", href: "/agents/", current: false },
		{ title: "Call", href: "/call/", current: false },
	]);
});

test("Overview shows every page outside the listed folders", () => {
	assert.deepEqual(
		navigation(site, ["agents", "call"], "/legal/terms/").items,
		[start, glossary, legal],
	);
});

test("a tab shows only its folder: the index page first, then the folder's pages with their groups", () => {
	const { tabs, items } = navigation(
		site,
		["call", "agents"],
		"/call/sell/fees/",
	);
	assert.deepEqual(
		tabs.map(({ current }) => current),
		[false, true, false],
	);
	assert.deepEqual(items, [
		{ title: "Call", href: "/call/", children: [] },
		{ title: "Quickstart", href: "/call/quickstart/", children: [] },
		{
			title: "Sell",
			href: "/call/sell/",
			children: [{ title: "Fees", href: "/call/sell/fees/", children: [] }],
		},
	]);
});

test("an address with no page shows Overview", () => {
	const { tabs, items } = navigation(site, ["call"]);
	assert.equal(tabs[0]?.current, true);
	assert.deepEqual(items, [start, glossary, agents, legal]);
});

test("previous and next stop at the edges of a tab", () => {
	const { items } = navigation(site, ["call", "agents"], "/call/");
	assert.deepEqual(neighbours(items, "/call/"), {
		previous: undefined,
		next: items[1],
	});
	assert.deepEqual(neighbours(items, "/call/sell/fees/"), {
		previous: items[2],
		next: undefined,
	});
	const overview = navigation(site, ["call", "agents"], "/glossary/").items;
	assert.deepEqual(neighbours(overview, "/glossary/").next, legal);
});

test("finds a folder by its name on disk, which the address writes in lower case and with dashes", () => {
	const tree = sidebar([
		page("index", "Start", 1),
		page("api-reference", "API", 2),
		page("api-reference/auth", "Auth", 1),
	]);
	const { tabs, items } = navigation(
		tree,
		["API Reference"],
		"/api-reference/auth/",
	);
	assert.deepEqual(tabs[1], {
		title: "API",
		href: "/api-reference/",
		current: true,
	});
	assert.equal(items[1]?.href, "/api-reference/auth/");
});

test("says what a tab is when the site lists a name that has no page", () => {
	assert.throws(
		() => navigation(site, ["call", "router"], "/"),
		/docs\.config\.json lists the tab "router", but content\/router\/index\.md does not exist/,
	);
});

test("a site whose first page is a home page leaves that page out of every sidebar, so the first page after it has no previous page", () => {
	const { tabs, items } = navigation(site, [], "/glossary/", true);
	assert.deepEqual(tabs, [{ title: "Overview", href: "/", current: true }]);
	assert.deepEqual(items, site.slice(1));
	assert.equal(neighbours(items, "/glossary/").previous, undefined);
	assert.deepEqual(navigation(site, ["call"], "/", true).items, [
		glossary,
		agents,
		legal,
	]);
});
