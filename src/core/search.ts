import MiniSearch from "minisearch";
import type { Section } from "./sections.ts";

type Hit = { url: string; title: string; heading: string; snippet: string };

// Where `term` starts a word in `lower`, or -1. The same letters inside a longer word do not count.
const wordAt = (lower: string, term: string) => {
	let at = lower.indexOf(term);
	while (at > 0 && /[\p{L}\p{N}]/u.test(lower.charAt(at - 1))) {
		at = lower.indexOf(term, at + 1);
	}
	return at;
};

// At most 160 characters of `text`, cut between words: from shortly before the first of `terms`, or from further back when the text ends sooner.
const snippet = (text: string, terms: string[]) => {
	const lower = text.toLowerCase();
	const [at = 0] = terms
		.map((term) => wordAt(lower, term))
		.filter((found) => found >= 0)
		.sort((a, b) => a - b);
	const from = Math.min(at - 40, text.length - 160);
	const start = from > 0 ? text.indexOf(" ", from) + 1 : 0;
	const end =
		text.length - start > 160
			? text.lastIndexOf(" ", start + 160)
			: text.length;
	return `${start > 0 ? "… " : ""}${text.slice(start, end)}${end < text.length ? " …" : ""}`;
};

/** Returns the search over `sections`: a function from a query to its ten best sections, best first. A match in the title counts more than one in the heading, which counts more than one in the text; the first letters of a word and a small typing mistake also match. */
export const search = (sections: Section[]) => {
	const index = new MiniSearch<Section>({
		idField: "url",
		fields: ["title", "heading", "text"],
		storeFields: ["title", "heading", "text"],
		searchOptions: {
			boost: { title: 3, heading: 2 },
			prefix: true,
			fuzzy: 0.2,
		},
	});
	index.addAll(sections);
	return (query: string): Hit[] =>
		index
			.search(query)
			.slice(0, 10)
			.map(({ id, title, heading, text, terms }) => ({
				url: id,
				title,
				heading,
				snippet: snippet(text, terms),
			}));
};
