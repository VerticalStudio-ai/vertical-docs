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

test("allows an image with alt text and a file beside the page", () => {
	for (const url of [
		"sign-in.png",
		"./images/sign-in.png",
		"../flow-dark.svg",
	]) {
		assert.equal(
			writingProblem({ type: "image", alt: "The sign-in form", url }),
			undefined,
		);
	}
});

test("rejects an image without alt text", () => {
	for (const alt of ["", " ", null, undefined]) {
		assert.match(
			writingProblem({ type: "image", alt, url: "sign-in.png" }) ?? "",
			/sign-in\.png has no alt text/,
		);
	}
});

test("rejects an image that is not a file beside the page", () => {
	for (const url of [
		"https://example.com/sign-in.png",
		"//example.com/sign-in.png",
		"/sign-in.png",
		"data:image/png;base64,AAAA",
	]) {
		assert.match(
			writingProblem({ type: "image", alt: "The sign-in form", url }) ?? "",
			/beside the page/,
		);
	}
});

test("allows a plain list item and rejects a task", () => {
	assert.equal(writingProblem({ type: "listItem", checked: null }), undefined);
	assert.equal(writingProblem({ type: "listItem" }), undefined);
	assert.match(
		writingProblem({ type: "listItem", checked: false }) ?? "",
		/task/,
	);
	assert.match(
		writingProblem({ type: "listItem", checked: true }) ?? "",
		/task/,
	);
});

test("rejects an image written with a reference, which the build cannot size or check", () => {
	assert.match(
		writingProblem({ type: "imageReference", alt: "The sign-in form" }) ?? "",
		/reference/,
	);
});
