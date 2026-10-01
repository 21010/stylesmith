/**
 * Nerd Fonts bundled with Stylesmith. They're added to VS Code's page as web fonts (so nothing
 * is installed on the system), and the editor and terminal font settings put them first.
 */

export interface NerdFont {
	/** Value of the `stylesmith.fonts.family` setting. */
	id: string;
	/** Name shown in the Stylesmith menu. */
	label: string;
	/** The font's family name, exactly as Nerd Fonts publishes it. */
	family: string;
	files: readonly { file: string; weight: number }[];
}

export const FONTS: readonly NerdFont[] = [
	{
		id: "JetBrainsMono",
		label: "JetBrainsMono Nerd Font",
		family: "JetBrainsMono Nerd Font Mono",
		files: [
			{ file: "assets/fonts/JetBrainsMonoNerdFontMono-Regular.woff2", weight: 400 },
			{ file: "assets/fonts/JetBrainsMonoNerdFontMono-Bold.woff2", weight: 700 }
		]
	},
	{
		id: "BlexMono",
		label: "BlexMono Nerd Font",
		family: "BlexMono Nerd Font Mono",
		files: [
			{ file: "assets/fonts/BlexMonoNerdFontMono-Regular.woff2", weight: 400 },
			{ file: "assets/fonts/BlexMonoNerdFontMono-Bold.woff2", weight: 700 }
		]
	},
	{
		id: "ShureTechMono",
		label: "ShureTechMono Nerd Font",
		family: "ShureTechMono Nerd Font Mono",
		files: [{ file: "assets/fonts/ShureTechMonoNerdFontMono-Regular.woff2", weight: 400 }]
	},
	{
		id: "DepartureMono",
		label: "DepartureMono Nerd Font",
		family: "DepartureMono Nerd Font Mono",
		files: [{ file: "assets/fonts/DepartureMonoNerdFontMono-Regular.woff2", weight: 400 }]
	}
];

export const DEFAULT_FONT_ID = "JetBrainsMono";

export function findFont(id: string): NerdFont {
	return FONTS.find(font => font.id === id) ?? FONTS.find(font => font.id === DEFAULT_FONT_ID)!;
}

/** `@font-face` rules that embed the font files, so no file or network access is needed. */
export function fontFaceCss(
	family: string,
	faces: readonly { weight: number; data: Uint8Array }[]
): string {
	return faces
		.map(
			({ weight, data }) =>
				`@font-face { font-family: ${JSON.stringify(family)}; ` +
				`src: url(data:font/woff2;base64,${Buffer.from(data).toString("base64")}) format("woff2"); ` +
				`font-weight: ${weight}; font-style: normal; font-display: block; }`
		)
		.join("\n");
}

/**
 * A script that starts loading the font right away. VS Code measures the editor and terminal
 * font when they open; loading early means they measure the Nerd Font, not a fallback.
 */
export function preloadScript(family: string, weights: readonly number[]): string {
	return (
		"if (document.fonts) {\n" +
		weights
			.map(w => `\tdocument.fonts.load(${JSON.stringify(`${w} 16px "${family}"`)});\n`)
			.join("") +
		"}\n"
	);
}

/** Puts `family` first in a CSS font-family list, keeping the rest as fallbacks. */
export function withFontFirst(fontFamily: string, family: string): string {
	return [`'${family}'`, ...splitFamilies(withoutStylesmithFonts(fontFamily))].join(", ");
}

/** Removes every font Stylesmith adds from a CSS font-family list. */
export function withoutStylesmithFonts(fontFamily: string): string {
	const ours = new Set(FONTS.map(font => font.family.toLowerCase()));
	return splitFamilies(fontFamily)
		.filter(name => !ours.has(unquote(name).toLowerCase()))
		.join(", ");
}

/** What Stylesmith remembers about a font setting it changed. */
export interface SavedSetting {
	/** The user's own value before Stylesmith changed it; undefined if it wasn't set. */
	previous: string | undefined;
	/** The value Stylesmith wrote. */
	applied: string;
}

/**
 * Works out the new value for a font setting. Returns undefined when the setting should be
 * left alone (an empty terminal font already uses the editor font).
 */
export function planApply(
	current: string | undefined,
	defaultValue: string | undefined,
	saved: SavedSetting | undefined,
	family: string,
	leaveEmpty: boolean
): { value: string; saved: SavedSetting } | undefined {
	const base = current ?? defaultValue ?? "";
	if (leaveEmpty && base.trim() === "") return undefined;

	// Remember the user's own value. If they changed the setting after Stylesmith did,
	// their latest choice (without Stylesmith's font) is what gets restored.
	const previous = !saved
		? current
		: current === saved.applied
			? saved.previous
			: userPart(current);

	const value = withFontFirst(base, family);
	return { value, saved: { previous, applied: value } };
}

/** Works out the value to restore for a font setting Stylesmith changed. */
export function planRestore(current: string | undefined, saved: SavedSetting): string | undefined {
	return current === saved.applied ? saved.previous : userPart(current);
}

function userPart(value: string | undefined): string | undefined {
	return value === undefined ? undefined : withoutStylesmithFonts(value) || undefined;
}

function splitFamilies(fontFamily: string): string[] {
	return fontFamily
		.split(",")
		.map(name => name.trim())
		.filter(Boolean);
}

function unquote(name: string): string {
	return name.replace(/^(['"])(.*)\1$/, "$2");
}
