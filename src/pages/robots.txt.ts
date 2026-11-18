import config from "@site/docs.config.json";
import type { APIRoute } from "astro";

export const GET: APIRoute = () =>
	new Response(`Sitemap: ${new URL("/sitemap.xml", config.url)}\n`);
