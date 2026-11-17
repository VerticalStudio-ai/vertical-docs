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
