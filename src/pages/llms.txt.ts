import config from "@site/docs.config.json";
import type { APIRoute } from "astro";
import { llmsTxt } from "../core/llms.ts";
import { loadPages } from "../load.ts";

export const GET: APIRoute = async () =>
	new Response(llmsTxt(config, await loadPages()));
