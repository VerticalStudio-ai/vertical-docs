import assert from "node:assert/strict";
import { test } from "node:test";
import { llmsTxt, markdownUrl, pageMarkdown, withImageUrls } from "./llms.ts";

const page = (id: string, title: string, order: number) => ({
	id,
	data: { title, description: `About ${title.toLowerCase()}.`, order },
	body: "\nBody text.\n\n## A heading\n\nMore text.\n",
});

test("names the Markdown copy of a page: its id with .md", () => {
	assert.equal(markdownUrl("/"), "/index.md");
	assert.equal(markdownUrl("/reference/"), "/reference.md");
	assert.equal(markdownUrl("/reference/markdown/"), "/reference/markdown.md");
});

test("writes a page as Markdown: its title, its description, then the body unchanged", () => {
	assert.equal(
		pageMarkdown(page("write-a-page", "Write a page", 1)),
		"# Write a page\n\nAbout write a page.\n\nBody text.\n\n## A heading\n\nMore text.\n",
	);
});

test("writes llms.txt in sidebar order, one section per folder, linking the Markdown copies by their full address", () => {
	const pages = [
		page("reference/markdown", "Markdown", 2),
		page("reference", "Reference", 3),
		page("write-a-page", "Write a page", 2),
		page("reference/frontmatter", "Frontmatter", 1),
		page("index", "Start", 1),
	];
	assert.equal(
		llmsTxt(
			{
				name: "docs-kit",
				description: "Docs for docs-kit.",
				url: "https://docs.test",
			},
			pages,
		),
		`# docs-kit

> Docs for docs-kit.

## Docs

- [Start](https://docs.test/index.md): About start.
- [Write a page](https://docs.test/write-a-page.md): About write a page.

## Reference

- [Reference](https://docs.test/reference.md): About reference.
- [Frontmatter](https://docs.test/reference/frontmatter.md): About frontmatter.
- [Markdown](https://docs.test/reference/markdown.md): About markdown.
`,
	);
});

test("points each image outside code at the URL the site serves it at", () => {
	const urls = new Map([
		["sign-in.png", "/_astro/sign-in.abc.webp"],
		["./flow-dark.svg", "/_astro/flow-dark.def.svg"],
	]);
	assert.equal(
		withImageUrls(
			[
				"Text ![The sign-in form](sign-in.png) and ![The flow](./flow-dark.svg).",
				"A link [sign-in.png](sign-in.png) and code `![The sign-in form](sign-in.png)` stay.",
				"```md",
				"![The sign-in form](sign-in.png)",
				"```",
				"![Not an image of this page](other.png)",
			].join("\n"),
			urls,
		),
		[
			"Text ![The sign-in form](/_astro/sign-in.abc.webp) and ![The flow](/_astro/flow-dark.def.svg).",
			"A link [sign-in.png](sign-in.png) and code `![The sign-in form](sign-in.png)` stay.",
			"```md",
			"![The sign-in form](sign-in.png)",
			"```",
			"![Not an image of this page](other.png)",
		].join("\n"),
	);
});

test("finds an image whose path is written with encoded spaces", () => {
	assert.equal(
		withImageUrls(
			"![The sign-in form](images/sign%20in.png)",
			new Map([["images/sign in.png", "/_astro/sign-in.abc.webp"]]),
		),
		"![The sign-in form](/_astro/sign-in.abc.webp)",
	);
});

test("throws for an image of the page that it cannot find in the Markdown", () => {
	assert.throws(
		() =>
			withImageUrls(
				"![The sign-in form](<sign-in.png>)",
				new Map([["sign-in.png", "/_astro/sign-in.abc.webp"]]),
			),
		/The image sign-in\.png .* Write it as !\[what it shows\]\(file\.png\)/,
	);
});
