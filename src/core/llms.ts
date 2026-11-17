import { flat, type NavItem, pageUrl, sidebar } from "./nav.ts";

type Page = {
	id: string;
	data: { title: string; description: string; order?: number | undefined };
	body?: string | undefined;
};

/** Returns the URL of the Markdown copy of the page at `href`: the page id with `.md`. */
export const markdownUrl = (href: string) =>
	href === "/" ? "/index.md" : `${href.slice(0, -1)}.md`;

/** Returns a page as Markdown: its title as the only `#` heading, its description, then the body as written. */
export const pageMarkdown = ({ data, body = "" }: Page) =>
	`# ${data.title}\n\n${data.description}\n\n${body.trim()}\n`;

/** Returns llms.txt in the llmstxt.org format: the site name, its description, then every page as a link to its Markdown copy. Pages outside a folder come first under "Docs"; each folder is a section named after its index page. Inside a section the pages are in sidebar order. */
export const llmsTxt = (
	site: { name: string; description: string },
	pages: Page[],
) => {
	const descriptions = new Map(
		pages.map(({ id, data }) => [pageUrl(id), data.description]),
	);
	const tree = sidebar(pages);
	const section = (title: string, items: NavItem[]) =>
		`## ${title}\n\n${items
			.map(
				({ title, href }) =>
					`- [${title}](${markdownUrl(href)}): ${descriptions.get(href)}\n`,
			)
			.join("")}`;
	return [
		`# ${site.name}\n\n> ${site.description}\n`,
		section(
			"Docs",
			tree.filter((item) => item.children.length === 0),
		),
		...tree
			.filter((item) => item.children.length > 0)
			.map((item) => section(item.title, flat([item]))),
	].join("\n");
};
