import { slug } from "github-slugger";

type Page = {
	id: string;
	data: { title: string; order?: number | undefined };
};

export type NavItem = { title: string; href: string; children: NavItem[] };

/** Returns the URL of the page with this id: `/` for the home page, otherwise the id between slashes. */
export const pageUrl = (id: string) => (id === "index" ? "/" : `/${id}/`);

const itemsIn = (pages: Page[], folder: string): NavItem[] =>
	pages
		.filter(
			({ id }) =>
				id.startsWith(folder) && !id.slice(folder.length).includes("/"),
		)
		.sort(
			(a, b) =>
				(a.data.order ?? Infinity) - (b.data.order ?? Infinity) ||
				a.data.title.localeCompare(b.data.title, "en"),
		)
		.map(({ id, data }) => ({
			title: data.title,
			href: pageUrl(id),
			children: itemsIn(pages, `${id}/`),
		}));

/** Returns the sidebar tree: pages sorted by `order`, then title, with each folder's pages nested under the folder's index page. Throws when a folder has no index page. */
export const sidebar = (pages: Page[]) => {
	const ids = new Set(pages.map((page) => page.id));
	for (const id of ids) {
		const folder = id.split("/").slice(0, -1).join("/");
		if (folder && !ids.has(folder)) {
			throw new Error(
				`The folder content/${folder}/ has no index page. Add content/${folder}/index.md; its title names the sidebar group.`,
			);
		}
	}
	return itemsIn(pages, "");
};

/** Returns every item of a tree in reading order: an item, then the items under it. */
export const flat = (items: NavItem[]): NavItem[] =>
	items.flatMap((item) => [item, ...flat(item.children)]);

/** Returns the pages before and after `href` in sidebar reading order; either is undefined at the ends. */
export const neighbours = (tree: NavItem[], href: string) => {
	const items = flat(tree);
	const at = items.findIndex((item) => item.href === href);
	return { previous: items[at - 1], next: items[at + 1] };
};

/** Returns what the page at `href` shows around it: the header tabs, and the sidebar items of the tab the page is in. The first tab is "Overview", with every page outside `folders`; each folder is a tab in the order given, named after its index page, which is also its first item. A site with no folders has the one tab, which holds the whole tree. Throws when a name is not a folder directly under `content/`. */
export const navigation = (tree: NavItem[], folders: string[], href = "/") => {
	const picked = folders.map((folder) => {
		// The address of a folder is its name the way Astro writes a page id.
		const item = tree.find((item) => item.href === `/${slug(folder)}/`);
		if (!item) {
			throw new Error(
				`docs.config.json lists the tab "${folder}", but content/${folder}/index.md does not exist. A tab is a folder directly under content/, and its index page names the tab.`,
			);
		}
		return item;
	});
	const overview = { title: "Overview", href: "/" };
	const folder = picked.find((item) => href.startsWith(item.href));
	return {
		tabs: [overview, ...picked].map((tab) => ({
			title: tab.title,
			href: tab.href,
			current: tab === (folder ?? overview),
		})),
		items: folder
			? [{ ...folder, children: [] }, ...folder.children]
			: tree.filter((item) => !picked.includes(item)),
	};
};
