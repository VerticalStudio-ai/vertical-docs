import assert from "node:assert/strict";
import { test } from "node:test";
import { sidebar } from "./nav.ts";
import { sitemap, structuredData } from "./seo.ts";

const page = (id: string, title: string) => ({ id, data: { title } });

const pages = [
	page("index", "Start"),
	page("reference", "Reference"),
	page("reference/markdown", "Markdown"),
	page("reference/markdown/tables", "Tables"),
	page("reference-card", "Reference card"),
];

const site = { name: "docs-kit", url: "https://docs.test" };

test("lists the full address of every page in sitemap.xml", () => {
	assert.equal(
		sitemap(site.url, pages),
		`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://docs.test/</loc></url>
<url><loc>https://docs.test/reference/</loc></url>
<url><loc>https://docs.test/reference/markdown/</loc></url>
<url><loc>https://docs.test/reference/markdown/tables/</loc></url>
<url><loc>https://docs.test/reference-card/</loc></url>
</urlset>
`,
	);
});

const data = (href: string, all = pages) =>
	JSON.parse(structuredData(site, sidebar(all), href));

test("writes an address with & as valid XML", () => {
	assert.match(
		sitemap(site.url, [page("q&a", "Questions")]),
		/<loc>https:\/\/docs\.test\/q&amp;a\/<\/loc>/,
	);
});

test("describes the home page as the site", () => {
	assert.deepEqual(data("/"), {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: "docs-kit",
		url: "https://docs.test",
	});
});

test("describes any other page by its trail from the home page through its groups", () => {
	const item = (position: number, name: string, path: string) => ({
		"@type": "ListItem",
		position,
		name,
		item: `https://docs.test${path}`,
	});
	assert.deepEqual(data("/reference/markdown/tables/"), {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: [
			item(1, "Start", "/"),
			item(2, "Reference", "/reference/"),
			item(3, "Markdown", "/reference/markdown/"),
			item(4, "Tables", "/reference/markdown/tables/"),
		],
	});
	assert.deepEqual(data("/reference-card/").itemListElement, [
		item(1, "Start", "/"),
		item(2, "Reference card", "/reference-card/"),
	]);
});

test("writes structured data that cannot end the script tag it sits in", () => {
	const all = [...pages, page("tags", "The </script> tag")];
	const json = structuredData(site, sidebar(all), "/tags/");
	assert.equal(json.includes("<"), false);
	assert.equal(
		data("/tags/", all).itemListElement[1].name,
		"The </script> tag",
	);
});
