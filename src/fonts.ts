/**
 * Font families Stylesmith can select. A family must be installed on the system; Stylesmith can
 * install one for the current user, after they confirm (fontInstall.ts), from the files pinned
 * here.
 */

/** A file of the fonts-3.5.1 release, pinned: anything else is refused. */
export interface PinnedFile {
	name: string;
	size: number;
	sha256: string;
}

export interface NerdFont {
	id: string;
	label: string;
	family: string;
	/** The Mono font files to install: Regular, and Bold where the family has it. */
	files: readonly PinnedFile[];
	/** The family's license (SIL Open Font License 1.1), saved with the installed font. */
	license: PinnedFile;
}

/**
 * Where the pinned files are: a release of this repository with the files unchanged from
 * Nerd Fonts 3.5.1, and their licenses.
 */
export const FONT_RELEASE = "https://github.com/21010/stylesmith/releases/download/fonts-3.5.1/";

/** The Nerd Fonts license, saved along with any font's own license. */
export const NERD_FONTS_LICENSE: PinnedFile = {
	name: "NerdFonts-LICENSE.txt",
	size: 6200,
	sha256: "1f6ad4edae6479aaace3112ede5279a23284ae54b2a34db66357aef5f64df160"
};

export const FONTS: readonly [NerdFont, ...NerdFont[]] = [
	{
		id: "JetBrainsMono",
		label: "JetBrainsMono Nerd Font",
		family: "JetBrainsMono Nerd Font Mono",
		files: [
			{
				name: "JetBrainsMonoNerdFontMono-Regular.ttf",
				size: 2573248,
				sha256: "f2a5ea6cfab397445ffab00c0370927b66d61e560a05db5db271b42006381c1a"
			},
			{
				name: "JetBrainsMonoNerdFontMono-Bold.ttf",
				size: 2577016,
				sha256: "bfcf9a917276ffc058867d87cbc8a5b2f1ab0f4b710e9170dc02763ccb80bd4b"
			}
		],
		license: {
			name: "JetBrainsMono-LICENSE.txt",
			size: 4399,
			sha256: "30f0c136e3c88e422d0791acd97238870f9054a9729bc34cf2ff0d4ed8cac4ad"
		}
	},
	{
		id: "BlexMono",
		label: "BlexMono Nerd Font",
		family: "BlexMono Nerd Font Mono",
		files: [
			{
				name: "BlexMonoNerdFontMono-Regular.ttf",
				size: 2456564,
				sha256: "9f8fe62fc71c7463677fb8dc6e47fe77aa470649383be0731706f746468b61eb"
			},
			{
				name: "BlexMonoNerdFontMono-Bold.ttf",
				size: 2458472,
				sha256: "0f0b5fc5970a8272bfa3a97e4aae465dd91b4da0faa76662635bc7bd1b91731d"
			}
		],
		license: {
			name: "BlexMono-LICENSE.txt",
			size: 4360,
			sha256: "91c25c350d3cac39da2736d74f7ba37ef648f5237a4e330a240615bc8d8c4360"
		}
	},
	{
		id: "ShureTechMono",
		label: "ShureTechMono Nerd Font",
		family: "ShureTechMono Nerd Font Mono",
		files: [
			{
				name: "ShureTechMonoNerdFontMono-Regular.ttf",
				size: 2336172,
				sha256: "9a821c1499aeab3c7cb03ab606678ffaca681497d5e0f0aa96a610ba9ff92a01"
			}
		],
		license: {
			name: "ShureTechMono-LICENSE.txt",
			size: 4520,
			sha256: "a2ddb2e4b4fd2b9ada3f53461bf33d9e20f54f84d7880a581f90cb825db6c5f6"
		}
	},
	{
		id: "DepartureMono",
		label: "DepartureMono Nerd Font",
		family: "DepartureMono Nerd Font Mono",
		files: [
			{
				name: "DepartureMonoNerdFontMono-Regular.otf",
				size: 2278380,
				sha256: "534cb9e9f8292ceec427f8524a92b94f15d798a9d96139f890d63ba4a5284a1d"
			}
		],
		license: {
			name: "DepartureMono-LICENSE.txt",
			size: 4357,
			sha256: "b65e42750f3cb65437a97f4dfd781c58f199259949db2341012be60e32500e83"
		}
	},
	{
		id: "GeistMono",
		label: "GeistMono Nerd Font",
		family: "GeistMono Nerd Font Mono",
		files: [
			{
				name: "GeistMonoNerdFontMono-Regular.otf",
				size: 2383916,
				sha256: "ac1fd18ba4cf7c2d0e58af2765f7c913f88c0f43b49f7b6609f9572755112756"
			},
			{
				name: "GeistMonoNerdFontMono-Bold.otf",
				size: 2393440,
				sha256: "f1f3dc81e89f6c8cf4b5b0153eb380e80d5e21a880437025364e3dfba2ae946d"
			}
		],
		license: {
			name: "GeistMono-LICENSE.txt",
			size: 4384,
			sha256: "934b987e215a2bc463d7b1a99456c1d83e9505f5ef6d8b0dd439181fb2414b1b"
		}
	},
	{
		id: "SpaceMono",
		label: "SpaceMono Nerd Font",
		family: "SpaceMono Nerd Font Mono",
		files: [
			{
				name: "SpaceMonoNerdFontMono-Regular.ttf",
				size: 2415520,
				sha256: "193a8f8864bb1ca515ce86018e547ce2b3ac7d66a868f3afe425c002a9dec1de"
			},
			{
				name: "SpaceMonoNerdFontMono-Bold.ttf",
				size: 2414488,
				sha256: "0abf96475977dbe67f3cea9da17f487996d48e67aa7827c26fc75129bc7dd997"
			}
		],
		license: {
			name: "SpaceMono-LICENSE.txt",
			size: 4486,
			sha256: "c8ff02cc078f0b4b67fab24548c6dd9020a7edbb8d1727c172236afd08250402"
		}
	},
	{
		id: "AtkynsonMono",
		label: "AtkynsonMono Nerd Font",
		family: "AtkynsonMono Nerd Font Mono",
		files: [
			{
				name: "AtkynsonMonoNerdFontMono-Regular.otf",
				size: 2320852,
				sha256: "a3654b5233ba3f6a6f04fe740d9b544f267cad969e217b1b7a2889e7393cb02c"
			},
			{
				name: "AtkynsonMonoNerdFontMono-Bold.otf",
				size: 2322628,
				sha256: "e0754631c8aa1b7531383e9e0e00e0347171130010157b6c9f1c83319da32ead"
			}
		],
		license: {
			name: "AtkynsonMono-LICENSE.txt",
			size: 4456,
			sha256: "5b9f9cc1d6fb9d3562aaf77bfd526d048ca7b7bb4b9887c91d325723a4e8d6b9"
		}
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
