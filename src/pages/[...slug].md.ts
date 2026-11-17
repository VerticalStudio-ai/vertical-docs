import type { APIRoute, InferGetStaticPropsType } from "astro";
import { pageMarkdown } from "../core/llms.ts";
import { loadPages } from "../load.ts";

export const getStaticPaths = async () =>
	(await loadPages()).map((page) => ({
		params: { slug: page.id },
		props: { page },
	}));

export const GET: APIRoute<InferGetStaticPropsType<typeof getStaticPaths>> = ({
	props,
}) => new Response(pageMarkdown(props.page));
