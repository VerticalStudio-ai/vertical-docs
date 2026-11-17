import { search } from "../core/search.ts";

const find = fetch("/search.json")
	.then((response) => response.json())
	.then(search);

// Answers each query the dialog sends with its ranked sections, in the order the queries arrive.
addEventListener("message", async ({ data }) =>
	postMessage((await find)(data)),
);
