import assert from "node:assert/strict";
import { test } from "node:test";
import { writingProblem } from "./writing.ts";

test("allows ## and ### headings, tagged code blocks and other nodes", () => {
	for (const node of [
		{ type: "heading", depth: 2 },
		{ type: "heading", depth: 3 },
		{ type: "code", lang: "sh" },
		{ type: "paragraph" },
	]) {
		assert.equal(writingProblem(node), undefined);
	}
});

test("rejects a heading that is not ## or ###", () => {
	assert.match(writingProblem({ type: "heading", depth: 1 }) ?? "", /level 1/);
	assert.match(writingProblem({ type: "heading", depth: 4 }) ?? "", /level 4/);
});

test("rejects a code block without a language", () => {
	assert.match(writingProblem({ type: "code", lang: null }) ?? "", /language/);
	assert.match(writingProblem({ type: "code" }) ?? "", /language/);
});

test("rejects HTML", () => {
	assert.match(writingProblem({ type: "html" }) ?? "", /HTML/);
});
