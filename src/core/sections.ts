import Slugger from "github-slugger";
import { callout } from "./callout.ts";
import { pageUrl } from "./nav.ts";

type Page = {
	id: string;
	data: { title: string; description: string };
	body?: string | undefined;
};

export type Section = {
	url: string;
	title: string;
	heading: string;
	text: string;
};

// Inline code stays as written. A link becomes its text, emphasis marks go, and two or three hyphens become the dash the site shows.
const plain = (markdown: string): string =>
	markdown.replace(
		/`([^`]+)`|!?\[([^\]]*)\]\([^)]*\)|(-{2,3})|\*|(?<![a-z\d])_+|_+(?![a-z\d])/gi,
		(_, code?: string, label?: string, dash?: string) =>
			code ??
			(label === undefined ? "" : plain(label)) +
				(dash ? (dash.length === 3 ? "—" : "–") : ""),
	);

// What can stand before a block on its line: quote marks and one list marker.
const lead = String.raw`(?:>\s?)*(?:(?:[-*+]|\d+\.)\s+)?`;
const opens = new RegExp(String.raw`^\s*${lead}(\`{3,}|~{3,})`);
const closes = /^[\s>]*(`{3,}|~{3,})\s*$/;
const leads = new RegExp(String.raw`^\s*${lead}`);
const starts = new RegExp(
	String.raw`^ {0,3}${lead}#{2,3}[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$`,
);

// A line outside a code block, without its quote, list, callout and table marks. A table's rule line is empty.
const words = (line: string) => {
	const rest = line.replace(leads, "");
	return /^[\s|:-]*$/.test(rest)
		? ""
		: plain((callout(rest)?.text ?? rest).replaceAll("|", " "));
};

/** Returns one record per section of a page: the description and the text before the first heading under the page URL, then each `##` and `###` under the anchor the site gives it. A heading inside a code block starts no section. */
export const sections = ({ id, data, body = "" }: Page): Section[] => {
	const slugger = new Slugger();
	const url = pageUrl(id);
	let lines = [data.description];
	const found = [{ url, heading: "", lines }];
	let fence = "";
	for (const line of body.split("\n")) {
		const [, mark] = opens.exec(line) ?? [];
		const [, heading] = starts.exec(line) ?? [];
		if (fence) {
			if (closes.exec(line)?.[1]?.startsWith(fence)) fence = "";
			else lines.push(line);
		} else if (mark) {
			fence = mark;
		} else if (heading) {
			const text = plain(heading);
			lines = [];
			found.push({ url: `${url}#${slugger.slug(text)}`, heading: text, lines });
		} else {
			lines.push(words(line));
		}
	}
	return found.map(({ url, heading, lines }) => ({
		url,
		title: data.title,
		heading,
		text: lines.join(" ").replace(/\s+/g, " ").trim(),
	}));
};
