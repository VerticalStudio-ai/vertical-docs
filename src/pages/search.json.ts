import type { APIRoute } from "astro";
import { sections } from "../core/sections.ts";
import { loadPages } from "../load.ts";

export const GET: APIRoute = async () =>
	Response.json((await loadPages()).flatMap(sections));
