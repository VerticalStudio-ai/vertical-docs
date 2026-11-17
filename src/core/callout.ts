/** Returns the kind of a GitHub alert and its text without the marker, or undefined when the blockquote text does not start with one of the four markers. */
export const callout = (text: string) => {
	const [marker, kind] = /^\[!(NOTE|TIP|WARNING|CAUTION)\]\s*/.exec(text) ?? [];
	return marker && kind
		? { kind: kind.toLowerCase(), text: text.slice(marker.length) }
		: undefined;
};
