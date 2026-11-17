import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

export const collections = {
	docs: defineCollection({
		loader: glob({
			pattern: "**/*.md",
			base: process.env.DOCS_ROOT ?? "./content",
		}),
		schema: z.object({
			title: z.string().max(70),
			description: z.string().max(160),
			order: z.number().optional(),
		}),
	}),
};
