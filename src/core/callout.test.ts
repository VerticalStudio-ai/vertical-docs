import assert from "node:assert/strict";
import { test } from "node:test";
import { callout } from "./callout.ts";

test("reads the kind and the text after a GitHub alert marker", () => {
	assert.deepEqual(callout("[!NOTE]\nRestart the server."), {
		kind: "note",
		text: "Restart the server.",
	});
	for (const kind of ["tip", "warning", "caution"]) {
		assert.equal(callout(`[!${kind.toUpperCase()}]\nText.`)?.kind, kind);
	}
});

test("leaves an ordinary blockquote alone", () => {
	assert.equal(callout("A quoted sentence."), undefined);
	assert.equal(callout("[!DANGER]\nNot one of the four kinds."), undefined);
	assert.equal(callout("Text before [!NOTE] is not a marker."), undefined);
});
