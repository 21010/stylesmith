import { EFFECTS } from "./effects";

/** A complete look: a color theme, the pixel icons, a font and a set of effects. */
export interface Preset {
	id: string;
	label: string;
	description: string;
	/** Color theme label, as listed in package.json. */
	theme: string;
	/** Nerd Font id, as used by `stylesmith.fonts.family`. */
	font: string;
	/** Every effect's setting (e.g. `effects.crtScanlines`) and whether it's on. */
	effects: Record<string, boolean>;
}

export const ICON_THEME = "stylesmith-pixel";

// Effects that are on in every preset: subtle, and they follow the theme's colors.
const BASE = {
	"effects.caretAnimation": true,
	"effects.neonCurrentLine": true,
	"effects.neonFocusFrame": true,
	"effects.neonSelections": true
};

export const PRESETS: readonly Preset[] = [
	{
		id: "night-city",
		label: "Night City",
		description: "Cyberpunk neon: Neon Night, JetBrains Mono, sparks, boot sequence and glitch",
		theme: "Stylesmith Neon Night",
		font: "JetBrainsMono",
		effects: {
			...BASE,
			"effects.crtScanlines": false,
			"effects.typingSparks": true,
			"effects.bootSequence": true,
			"effects.glitchOnSave": true
		}
	},
	{
		id: "phosphor-terminal",
		label: "Phosphor Terminal",
		description: "Green CRT terminal: Phosphor, Departure Mono, scanlines and boot sequence",
		theme: "Stylesmith Phosphor",
		font: "DepartureMono",
		effects: {
			...BASE,
			"effects.crtScanlines": true,
			"effects.typingSparks": false,
			"effects.bootSequence": true,
			"effects.glitchOnSave": false
		}
	},
	{
		id: "amber-monitor",
		label: "Amber Monitor",
		description: "Amber monochrome monitor: Amber, BlexMono and scanlines",
		theme: "Stylesmith Amber",
		font: "BlexMono",
		effects: {
			...BASE,
			"effects.crtScanlines": true,
			"effects.typingSparks": false,
			"effects.bootSequence": false,
			"effects.glitchOnSave": false
		}
	},
	{
		id: "daylight",
		label: "Daylight",
		description: "Calm and bright: Daylight, JetBrains Mono and the subtle effects only",
		theme: "Stylesmith Daylight",
		font: "JetBrainsMono",
		effects: {
			...BASE,
			"effects.crtScanlines": false,
			"effects.typingSparks": false,
			"effects.bootSequence": false,
			"effects.glitchOnSave": false
		}
	},
	{
		id: "high-contrast",
		label: "High Contrast",
		description: "Maximum readability: Neon High Contrast, JetBrains Mono, no moving effects",
		theme: "Stylesmith Neon High Contrast",
		font: "JetBrainsMono",
		effects: {
			...BASE,
			"effects.caretAnimation": false,
			"effects.crtScanlines": false,
			"effects.typingSparks": false,
			"effects.bootSequence": false,
			"effects.glitchOnSave": false
		}
	}
];

/** Every effect a preset turns on or off, in the order of EFFECTS. */
export function presetEffects(preset: Preset): [string, boolean][] {
	return EFFECTS.map(effect => [effect.setting, preset.effects[effect.setting] ?? false]);
}
