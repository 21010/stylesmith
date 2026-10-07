/** Font families Stylesmith can select when the user has installed them on their system. */

export interface NerdFont {
	id: string;
	label: string;
	family: string;
}

/** These are names only: Stylesmith does not install or bundle fonts. */
export const FONTS: readonly [NerdFont, ...NerdFont[]] = [
	{
		id: "JetBrainsMono",
		label: "JetBrainsMono Nerd Font (install separately)",
		family: "JetBrainsMono Nerd Font Mono"
	},
	{
		id: "BlexMono",
		label: "BlexMono Nerd Font (install separately)",
		family: "BlexMono Nerd Font Mono"
	},
	{
		id: "ShureTechMono",
		label: "ShureTechMono Nerd Font (install separately)",
		family: "ShureTechMono Nerd Font Mono"
	},
	{
		id: "DepartureMono",
		label: "DepartureMono Nerd Font (install separately)",
		family: "DepartureMono Nerd Font Mono"
	}
];

export const DEFAULT_FONT_ID = "JetBrainsMono";

export function findFont(id: string): NerdFont {
	return FONTS.find(font => font.id === id) ?? FONTS[0];
}

/**
 * Prepends the selected system-installed family while keeping the user's fallbacks. A
 * previously selected Stylesmith family is replaced rather than kept as a fallback.
 */
export function withFontFirst(fontFamily: string, family: string): string {
	return [`'${family}'`, ...splitFamilies(withoutStylesmithFonts(fontFamily))].join(", ");
}

/** Removes a Stylesmith-selected family while preserving all other user choices. */
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
