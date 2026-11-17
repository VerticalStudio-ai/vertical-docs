type Node = {
	type: string;
	depth?: number;
	lang?: string | null | undefined;
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
	return undefined;
};
