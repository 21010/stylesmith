import { EFFECTS } from "./effects";

/** A preset changes VS Code theme settings and supported native editor settings. */
export interface Preset {
	id: string;
	label: string;
	description: string;
	theme: string;
	iconTheme: string;
	effects: Record<string, boolean>;
}

export const ICON_THEME = "stylesmith-pixel";

const BASE = {
	"effects.smoothCursor": true,
	"effects.currentLine": true,
	"effects.bracketGuides": true
};

export const PRESETS: readonly Preset[] = [
	{
		id: "night-city",
		label: "Night City",
		description: "Cyberpunk colors, pixel icons and smooth editor settings",
		theme: "Stylesmith Neon Night",
		iconTheme: ICON_THEME,
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockTerminalCursor": true,
			"effects.dimUnfocused": false
		}
	},
	{
		id: "phosphor-terminal",
		label: "Phosphor Terminal",
		description: "Green phosphor colors, compact layout and a block terminal cursor",
		theme: "Stylesmith Phosphor",
		iconTheme: "stylesmith-pixel-phosphor",
		effects: {
			...BASE,
			"effects.compactLayout": true,
			"effects.blockTerminalCursor": true,
			"effects.dimUnfocused": false
		}
	},
	{
		id: "amber-monitor",
		label: "Amber Monitor",
		description: "Amber colors, compact layout and a block terminal cursor",
		theme: "Stylesmith Amber",
		iconTheme: "stylesmith-pixel-amber",
		effects: {
			...BASE,
			"effects.compactLayout": true,
			"effects.blockTerminalCursor": true,
			"effects.dimUnfocused": false
		}
	},
	{
		id: "black-ice",
		label: "Black ICE",
		description: "Cold white-phosphor colors and smooth editor settings",
		theme: "Stylesmith ICE",
		iconTheme: "stylesmith-pixel-ice",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": false
		}
	},
	{
		id: "monolith",
		label: "Monolith",
		description: "Calm blue-grey colors, quiet editor settings and dimmed unfocused editors",
		theme: "Stylesmith Monolith",
		iconTheme: ICON_THEME,
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": true
		}
	},
	{
		id: "glass-lab",
		label: "Glass Lab",
		description:
			"Warm concrete colors with a coral accent, quiet settings and dimmed unfocused editors",
		theme: "Stylesmith Glass Lab",
		iconTheme: ICON_THEME,
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": true
		}
	},
	{
		id: "vault",
		label: "Vault",
		description: "Navy and vault-yellow colors with a block terminal cursor",
		theme: "Stylesmith Vault",
		iconTheme: ICON_THEME,
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockTerminalCursor": true,
			"effects.dimUnfocused": false
		}
	},
	{
		id: "digital-rain",
		label: "Digital Rain",
		description: "Layered green colors with a block terminal cursor",
		theme: "Stylesmith Digital Rain",
		iconTheme: ICON_THEME,
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockTerminalCursor": true,
			"effects.dimUnfocused": false
		}
	},
	{
		id: "daylight",
		label: "Daylight",
		description: "Bright colors with a smooth cursor and current-line highlight",
		theme: "Stylesmith Daylight",
		iconTheme: ICON_THEME,
		effects: {
			"effects.smoothCursor": true,
			"effects.currentLine": true,
			"effects.bracketGuides": false,
			"effects.compactLayout": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": false
		}
	},
	{
		id: "high-contrast",
		label: "High Contrast",
		description: "High-contrast colors with minimal motion and clear bracket guides",
		theme: "Stylesmith Neon High Contrast",
		iconTheme: ICON_THEME,
		effects: {
			"effects.smoothCursor": false,
			"effects.currentLine": true,
			"effects.bracketGuides": true,
			"effects.compactLayout": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": false
		}
	}
];

export function presetEffects(preset: Preset): [string, boolean][] {
	return EFFECTS.map(effect => [effect.setting, preset.effects[effect.setting] ?? false]);
}
