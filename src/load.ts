import { getImage } from "astro:assets";
import { type CollectionEntry, getCollection } from "astro:content";
import { dirname, join } from "node:path";
import type { ImageMetadata } from "astro";

/** Returns every page in `content/`, already validated by the content schema. */
export const loadPages = () => getCollection("docs");

// Every image file in the content folder, by its path from the project root. astro.config.ts points @docs at the folder.
const files = new Map(
	Object.entries(
		import.meta.glob<{ default: ImageMetadata }>(
			"@docs/**/*.{avif,gif,jpeg,jpg,png,svg,tiff,webp}",
		),
	).map(([path, load]) => [path.replace(/^\//, ""), load]),
);

/** Returns the URL the site serves each image of a page at, by the path the page writes: the same file the page shows. */
export const loadImageUrls = async ({
	filePath = "",
	rendered,
}: CollectionEntry<"docs">) =>
	new Map(
		await Promise.all(
			(rendered?.metadata?.imagePaths ?? []).map(async (path) => {
				const load = files.get(join(dirname(filePath), path));
				const { src } = await getImage({ src: load?.() ?? path });
				return [path, src] as const;
			}),
		),
	);
