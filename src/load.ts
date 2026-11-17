import { getCollection } from "astro:content";

/** Returns every page in `content/`, already validated by the content schema. */
export const loadPages = () => getCollection("docs");
