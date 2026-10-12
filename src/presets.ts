import { EFFECTS } from "./effects";

/** A preset changes VS Code theme settings and supported native editor settings. */
export interface Preset {
	id: string;
	label: string;
	description: string;
	theme: string;
	/** The file icon theme for the Explorer. VS Code's own interface icons are left alone. */
	iconTheme: string;
	/** The font that suits it (a FONTS id). Presets don't set fonts; the website recommends this. */
	font: string;
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
		iconTheme: "stylesmith-pixel-neon-night",
		font: "JetBrainsMono",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": true,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "phosphor-terminal",
		label: "Phosphor Terminal",
		description: "Green phosphor colors, compact layout and block cursors without animation",
		theme: "Stylesmith Phosphor",
		iconTheme: "stylesmith-pixel-phosphor",
		font: "DepartureMono",
		effects: {
			...BASE,
			"effects.smoothCursor": false,
			"effects.compactLayout": true,
			"effects.blockCursor": true,
			"effects.blockTerminalCursor": true,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "amber-monitor",
		label: "Amber Monitor",
		description: "Amber colors, compact layout and block cursors without animation",
		theme: "Stylesmith Amber",
		iconTheme: "stylesmith-pixel-amber",
		font: "BlexMono",
		effects: {
			...BASE,
			"effects.smoothCursor": false,
			"effects.compactLayout": true,
			"effects.blockCursor": true,
			"effects.blockTerminalCursor": true,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "black-ice",
		label: "Black ICE",
		description: "Cold white-phosphor colors and smooth editor settings",
		theme: "Stylesmith ICE",
		iconTheme: "stylesmith-pixel-ice",
		font: "ShureTechMono",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "monolith",
		label: "Monolith",
		description: "Calm blue-grey colors, quiet editor settings and dimmed unfocused editors",
		theme: "Stylesmith Monolith",
		iconTheme: "stylesmith-pixel-monolith",
		font: "GeistMono",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": true,
			"effects.readableTerminal": false
		}
	},
	{
		id: "glass-lab",
		label: "Glass Lab",
		description:
			"Warm concrete colors with a coral accent, quiet settings and dimmed unfocused editors",
		theme: "Stylesmith Glass Lab",
		iconTheme: "stylesmith-pixel-glass-lab",
		font: "GeistMono",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": true,
			"effects.readableTerminal": false
		}
	},
	{
		id: "vault",
		label: "Vault",
		description: "Navy and vault-yellow colors with a block terminal cursor",
		theme: "Stylesmith Vault",
		iconTheme: "stylesmith-pixel-vault",
		font: "SpaceMono",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": true,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "simulation",
		label: "Simulation",
		description:
			"A greyed, green-cast city where only the code glows, with a block terminal cursor",
		// The theme's id in VS Code's settings: its earlier name, so existing choices still work.
		theme: "Stylesmith Digital Rain",
		iconTheme: "stylesmith-pixel-simulation",
		font: "JetBrainsMono",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": true,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "steel-and-rust",
		label: "Steel and Rust",
		description:
			"Cold blue-grey steel with rust accents, quiet settings and dimmed unfocused editors",
		theme: "Stylesmith Steel and Rust",
		iconTheme: "stylesmith-pixel-steel-and-rust",
		font: "ShureTechMono",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": true,
			"effects.readableTerminal": false
		}
	},
	{
		id: "brass",
		label: "Brass",
		description: "Brass, copper and verdigris on dark bronze, with calm settings",
		theme: "Stylesmith Brass",
		iconTheme: "stylesmith-pixel-brass",
		font: "MonaspiceXe",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "tea-garden",
		label: "Tea Garden",
		description:
			"A sunlit greenhouse in leaf, sunflower and terracotta, with nothing mechanical",
		theme: "Stylesmith Tea Garden",
		iconTheme: "stylesmith-pixel-tea-garden",
		font: "RecMonoCasual",
		effects: {
			"effects.smoothCursor": true,
			"effects.currentLine": true,
			"effects.bracketGuides": false,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "sunroom",
		label: "Sunroom",
		description: "Soft sunlight on pale walls, with unfocused editors dimmed",
		theme: "Stylesmith Sunroom",
		iconTheme: "stylesmith-pixel-sunroom",
		font: "RecMonoCasual",
		effects: {
			"effects.smoothCursor": true,
			"effects.currentLine": true,
			"effects.bracketGuides": false,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": true,
			"effects.readableTerminal": false
		}
	},
	{
		id: "countdown",
		label: "Countdown",
		description:
			"A night sky with sun-gold keywords, every number in red, and unfocused editors dimmed",
		theme: "Stylesmith Countdown",
		iconTheme: "stylesmith-pixel-countdown",
		font: "BlexMono",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": true,
			"effects.readableTerminal": false
		}
	},
	{
		id: "overlay",
		label: "Overlay",
		description: "Cyan overlays and amber alerts on dark slate, with a block terminal cursor",
		theme: "Stylesmith Overlay",
		iconTheme: "stylesmith-pixel-overlay",
		font: "MartianMono",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": true,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "deep-desert",
		label: "Deep Desert",
		description: "Sand, ochre and spice orange on rock-black, with one deep blue",
		theme: "Stylesmith Deep Desert",
		iconTheme: "stylesmith-pixel-deep-desert",
		font: "SpaceMono",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "haze",
		label: "Haze",
		description: "Orange haze and teal rain over cold concrete, with unfocused editors dimmed",
		theme: "Stylesmith Haze",
		iconTheme: "stylesmith-pixel-haze",
		font: "GeistMono",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": true,
			"effects.readableTerminal": false
		}
	},
	{
		id: "grid",
		label: "Grid",
		description: "Cyan lines on black, orange for the adversary, and a compact layout",
		theme: "Stylesmith Grid",
		iconTheme: "stylesmith-pixel-grid",
		font: "MartianMono",
		effects: {
			...BASE,
			"effects.compactLayout": true,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "corridor",
		label: "Corridor",
		description:
			"A sterile office floor in pale green and teal, compact, with a block terminal cursor",
		theme: "Stylesmith Corridor",
		iconTheme: "stylesmith-pixel-corridor",
		font: "3270",
		effects: {
			"effects.smoothCursor": false,
			"effects.currentLine": true,
			"effects.bracketGuides": false,
			"effects.compactLayout": true,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": true,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "horizon",
		label: "Horizon",
		description: "Warm orange, peach and lilac on black, calm and optimistic",
		theme: "Stylesmith Horizon",
		iconTheme: "stylesmith-pixel-horizon",
		font: "RecMonoCasual",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "command-deck",
		label: "Command Deck",
		description: "Grey-black consoles with one red alarm, and a block terminal cursor",
		theme: "Stylesmith Command Deck",
		iconTheme: "stylesmith-pixel-command-deck",
		font: "3270",
		effects: {
			...BASE,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": true,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "daylight",
		label: "Daylight",
		description: "Bright colors with a smooth cursor and current-line highlight",
		theme: "Stylesmith Daylight",
		iconTheme: "stylesmith-pixel-daylight",
		font: "JetBrainsMono",
		effects: {
			"effects.smoothCursor": true,
			"effects.currentLine": true,
			"effects.bracketGuides": false,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": false
		}
	},
	{
		id: "high-contrast",
		label: "High Contrast",
		description:
			"High-contrast colors, minimal motion, clear bracket guides and readable terminal colors",
		theme: "Stylesmith Neon High Contrast",
		iconTheme: "stylesmith-pixel-neon-high-contrast",
		font: "AtkynsonMono",
		effects: {
			"effects.smoothCursor": false,
			"effects.currentLine": true,
			"effects.bracketGuides": true,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": true
		}
	},
	{
		id: "high-contrast-light",
		label: "High Contrast Light",
		description:
			"Light high-contrast colors, minimal motion, clear bracket guides and readable terminal colors",
		theme: "Stylesmith Daylight High Contrast",
		iconTheme: "stylesmith-pixel-daylight-high-contrast",
		font: "AtkynsonMono",
		effects: {
			"effects.smoothCursor": false,
			"effects.currentLine": true,
			"effects.bracketGuides": true,
			"effects.compactLayout": false,
			"effects.blockCursor": false,
			"effects.blockTerminalCursor": false,
			"effects.dimUnfocused": false,
			"effects.readableTerminal": true
		}
	}
];

/** Earlier preset ids, still accepted (keyboard shortcuts may use them). */
export const PRESET_ALIASES: Readonly<Record<string, string>> = { "digital-rain": "simulation" };

export function presetEffects(preset: Preset): [string, boolean][] {
	return EFFECTS.map(effect => [effect.setting, preset.effects[effect.setting] ?? false]);
}
