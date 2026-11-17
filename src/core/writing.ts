type Node = {
	type: string;
	depth?: number;
	lang?: string | null | undefined;
	url?: string;
	alt?: string | null | undefined;
	checked?: boolean | null | undefined;
};

/** Returns what to change when a Markdown node breaks a rule in WRITING.md, or undefined when the node is fine. */
export const writingProblem = (node: Node) => {
	if (node.type === "heading" && node.depth !== 2 && node.depth !== 3) {
		return `A heading is level ${node.depth}. Use ## or ### only; the title comes from frontmatter.`;
	}
	if (node.type === "code" && !node.lang) {
		return "A code block has no language. Name one after the opening fence.";
	}
	if (node.type === "html") {
		return "The page contains HTML. Write plain Markdown.";
	}
	if (
		node.type === "image" &&
		/^([a-z][a-z\d+.-]*:|\/)/i.test(node.url ?? "")
	) {
		return `The image ${node.url} is not a file beside the page. Keep the file in the page's folder and write its path from there.`;
	}
	if (node.type === "image" && !node.alt?.trim()) {
		return `The image ${node.url} has no alt text. Write what it shows between the square brackets.`;
	}
	if (node.type === "imageReference") {
		return "An image is written with a reference. Write its path in the image itself: ![what it shows](file.png).";
	}
	if (node.type === "listItem" && typeof node.checked === "boolean") {
		return "A list item is a task (- [ ] or - [x]). Write a plain list and say in words what is done.";
	}
	return undefined;
};
