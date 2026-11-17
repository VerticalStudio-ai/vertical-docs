import { flat, type NavItem, pageUrl } from "./nav.ts";

/** Returns sitemap.xml: the full address of every page, in the order given. */
export const sitemap = (url: string, pages: { id: string }[]) =>
	`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
		.map(({ id }) => `<url><loc>${new URL(pageUrl(id), url)}</loc></url>\n`)
		.join("")}</urlset>\n`;

/** Returns the schema.org data of the page at `href` as JSON that is safe inside a script tag: the site for the home page, and for any other page its trail from the home page through its sidebar groups, which a search engine shows in place of the address. */
export const structuredData = (
	site: { name: string; url: string },
	tree: NavItem[],
	href: string,
) =>
	JSON.stringify({
		"@context": "https://schema.org",
		...(href === "/"
			? { "@type": "WebSite", name: site.name, url: site.url }
			: {
					"@type": "BreadcrumbList",
					itemListElement: flat(tree)
						.filter((item) => href.startsWith(item.href))
						.sort((a, b) => a.href.length - b.href.length)
						.map((item, at) => ({
							"@type": "ListItem",
							position: at + 1,
							name: item.title,
							item: new URL(item.href, site.url).href,
						})),
				}),
	}).replaceAll("<", "\\u003c");
