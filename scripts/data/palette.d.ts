// The shape of a palette in palettes.mjs, so `npm run check:scripts` catches a misspelled or
// missing field (#121). Colors are #rrggbb, or #rrggbbaa where a translucent color is meant.

type Color = string;

export interface Palette {
	id: string;
	name: string;
	/** Dark when not given. */
	kind?: "light" | "hc-dark" | "hc-light";
	typography: "terminal" | "film" | "everyday" | "high-contrast";
	boldKeywords?: boolean;
	bg: Color;
	bgDark: Color;
	bgRaised: Color;
	lineHighlight: Color;
	border: Color;
	fg: Color;
	fgStrong: Color;
	muted: Color;
	lineNumber: Color;
	accent: Color;
	accentAlt: Color;
	onAccent: Color;
	selection: Color;
	findMatch: Color;
	/** High-contrast themes only. */
	contrastBorder?: Color;
	contrastActiveBorder?: Color;
	tokens: {
		comment: Color;
		keyword: Color;
		function: Color;
		string: Color;
		number: Color;
		type: Color;
		property: Color;
		regexp: Color;
		tag: Color;
		attribute: Color;
		operator: Color;
		/** Keywords that change control flow (return, break, throw), when a palette sets it. */
		control?: Color;
	};
	status: Record<"error" | "warning" | "info" | "added" | "modified" | "deleted", Color>;
	ansi: Record<
		| "black"
		| "red"
		| "green"
		| "yellow"
		| "blue"
		| "magenta"
		| "cyan"
		| "white"
		| "brightBlack"
		| "brightRed"
		| "brightGreen"
		| "brightYellow"
		| "brightBlue"
		| "brightMagenta"
		| "brightCyan"
		| "brightWhite",
		Color
	>;
}
