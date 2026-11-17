import type { APIRoute, InferGetStaticPropsType } from "astro";
import { pageMarkdown, withImageUrls } from "../core/llms.ts";
import { loadImageUrls, loadPages } from "../load.ts";

export const getStaticPaths = async () =>
	(await loadPages()).map((page) => ({
		params: { slug: page.id },
		props: { page },
	}));

export const GET: APIRoute<
	InferGetStaticPropsType<typeof getStaticPaths>
> = async ({ props: { page } }) =>
	new Response(
		pageMarkdown({
			...page,
			body: withImageUrls(page.body ?? "", await loadImageUrls(page)),
		}),
	);
