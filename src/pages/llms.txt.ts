import type { APIRoute } from "astro";
import config from "../../docs.config.json";
import { llmsTxt } from "../core/llms.ts";
import { loadPages } from "../load.ts";

export const GET: APIRoute = async () =>
	new Response(llmsTxt(config, await loadPages()));
