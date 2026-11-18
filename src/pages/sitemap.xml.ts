import config from "@site/docs.config.json";
import type { APIRoute } from "astro";
import { sitemap } from "../core/seo.ts";
import { loadPages } from "../load.ts";

export const GET: APIRoute = async () =>
	new Response(sitemap(config.url, await loadPages()));
