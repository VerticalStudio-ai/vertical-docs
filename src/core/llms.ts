import { flat, type NavItem, pageUrl, sidebar } from "./nav.ts";
import { closes, opens } from "./sections.ts";

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

/** Returns the Markdown with each image outside code pointing at the URL that `urls` holds for its path, which the page may write with encoded spaces. Throws when it cannot find an image of `urls` in the Markdown. */
export const withImageUrls = (markdown: string, urls: Map<string, string>) => {
	const found = new Set<string>();
	let fence = "";
	const lines = markdown.split("\n").map((line) => {
		const [, mark] = opens.exec(line) ?? [];
		if (fence) {
			if (closes.exec(line)?.[1]?.startsWith(fence)) fence = "";
			return line;
		}
		fence = mark ?? "";
		return line.replace(
			/`[^`]+`|(!\[[^\]]*\]\()([^\s)]+)/g,
			(all, open?: string, written = "") => {
				const path = decodeURI(written);
				found.add(path);
				return open ? open + (urls.get(path) ?? written) : all;
			},
		);
	});
	for (const path of urls.keys()) {
		if (!found.has(path)) {
			throw new Error(
				`The image ${path} is written in a way the Markdown copy of the page cannot follow. Write it as ![what it shows](file.png), with no brackets in the alt text or the file name.`,
			);
		}
	}
	return lines.join("\n");
};

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
