/**
 * Nerd Fonts bundled with Stylesmith. The selected font's files are copied next to VS Code's
 * workbench HTML file and loaded from there as web fonts (so nothing is installed on the
 * system, and the HTML file stays small), and the editor and terminal font settings put them
 * first.
 */

import { FONT_FOLDER } from "./workbench";

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

/** The bundled font with this id; the default font for an unknown id. */
export function findFont(id: string): NerdFont {
	return FONTS.find(font => font.id === id) ?? FONTS.find(font => font.id === DEFAULT_FONT_ID)!;
}

/** `@font-face` rules that embed the font files, so no file or network access is needed. */
export function fontFaceCss(font: NerdFont): string {
	return font.files
		.map(
			({ file, weight }) =>
				`@font-face { font-family: ${JSON.stringify(font.family)}; ` +
				`src: url("${FONT_FOLDER}/${fontFileName(file)}") format("woff2"); ` +
				`font-weight: ${weight}; font-style: normal; font-display: block; }`
		)
		.join("\n");
}

/** The name a font file gets in the font folder. */
export function fontFileName(file: string): string {
	return file.slice(file.lastIndexOf("/") + 1);
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

function splitFamilies(fontFamily: string): string[] {
	return fontFamily
		.split(",")
		.map(name => name.trim())
		.filter(Boolean);
}

function unquote(name: string): string {
	return name.replace(/^(['"])(.*)\1$/, "$2");
}
