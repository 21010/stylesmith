/**
 * The built-in effects: one entry per effect, with its setting, its file (if it has one),
 * and any VS Code settings it needs.
 */

import type { ImportKind } from "./patch";

/** A built-in effect, turned on by a boolean setting. */
export interface Effect {
	/** Setting under `stylesmith.`, e.g. `effects.caretAnimation`. */
	setting: string;
	/** Name shown in the Stylesmith menu. */
	label: string;
	/** The stylesheet or script it adds; none for an effect that only changes VS Code settings. */
	asset?: EffectAsset;
	/** Must match the setting's default in package.json (checked by a test). */
	enabledByDefault: boolean;
	/** VS Code settings the effect needs, turned on while the effect is on. */
	editorSettings?: readonly EditorSetting[];
}

export interface EffectAsset {
	/** Path relative to the extension root, in assets/effects/. */
	file: string;
	kind: ImportKind;
}

export interface EditorSetting {
	key: string;
	value: unknown;
	/** Whether a value already counts as on, so a user's own setting is left alone. */
	isOn: (value: unknown) => boolean;
}

// Subtle effects are on by default; louder ones are opt-in.
export const EFFECTS: readonly Effect[] = [
	{
		setting: "effects.caretAnimation",
		label: "Caret animation",
		asset: { file: "assets/effects/caret-animation.js", kind: "js" },
		enabledByDefault: true
	},
	{
		setting: "effects.neonCurrentLine",
		label: "Neon current line",
		asset: { file: "assets/effects/neon-current-line.css", kind: "css" },
		enabledByDefault: true
	},
	{
		setting: "effects.neonFocusFrame",
		label: "Neon focus frame",
		asset: { file: "assets/effects/neon-focus-frame.css", kind: "css" },
		enabledByDefault: true
	},
	{
		setting: "effects.neonSelections",
		label: "Neon selections",
		asset: { file: "assets/effects/neon-selections.css", kind: "css" },
		enabledByDefault: true
	},
	{
		setting: "effects.neonBlocks",
		label: "Neon code blocks",
		asset: { file: "assets/effects/neon-blocks.css", kind: "css" },
		enabledByDefault: true,
		editorSettings: [
			{
				key: "editor.guides.bracketPairs",
				value: "active",
				isOn: value => value === true || value === "active"
			}
		]
	},
	{
		setting: "effects.diagnosticHighlights",
		label: "Solid problem underlines",
		asset: { file: "assets/effects/diagnostic-highlights.css", kind: "css" },
		enabledByDefault: true
	},
	{
		setting: "effects.neonGlow",
		label: "Neon glow on code",
		asset: { file: "assets/effects/neon-glow.css", kind: "css" },
		enabledByDefault: false
	},
	{
		setting: "effects.classicLayout",
		label: "Classic layout (square corners)",
		asset: { file: "assets/effects/classic-layout.css", kind: "css" },
		enabledByDefault: false,
		editorSettings: [
			{
				// VS Code's own way to remove the gaps between panels (VS Code 1.129 and newer).
				key: "window.density.layout",
				value: "compact",
				isOn: value => value === "compact"
			}
		]
	},
	{
		setting: "effects.neonTerminal",
		label: "Neon terminal frame",
		asset: { file: "assets/effects/neon-terminal.css", kind: "css" },
		enabledByDefault: true
	},
	{
		setting: "effects.terminalGlow",
		label: "Terminal glow",
		asset: { file: "assets/effects/terminal-glow.css", kind: "css" },
		enabledByDefault: false
	},
	{
		setting: "effects.retroTerminalCursor",
		label: "Retro terminal cursor",
		enabledByDefault: false,
		editorSettings: [
			{
				key: "terminal.integrated.cursorStyle",
				value: "block",
				isOn: value => value === "block"
			},
			{
				key: "terminal.integrated.cursorBlinking",
				value: true,
				isOn: value => value === true
			}
		]
	},
	{
		setting: "effects.crtScanlines",
		label: "CRT scanlines",
		asset: { file: "assets/effects/crt-scanlines.css", kind: "css" },
		enabledByDefault: false
	},
	{
		setting: "effects.crtFlicker",
		label: "CRT flicker",
		asset: { file: "assets/effects/crt-flicker.js", kind: "js" },
		enabledByDefault: false
	},
	{
		setting: "effects.matrixRain",
		label: "Matrix rain",
		asset: { file: "assets/effects/matrix-rain.js", kind: "js" },
		enabledByDefault: false
	},
	{
		setting: "effects.typingSparks",
		label: "Typing sparks",
		asset: { file: "assets/effects/typing-sparks.js", kind: "js" },
		enabledByDefault: false
	},
	{
		setting: "effects.bootSequence",
		label: "Boot sequence",
		asset: { file: "assets/effects/boot-sequence.js", kind: "js" },
		enabledByDefault: false
	},
	{
		setting: "effects.glitchOnSave",
		label: "Glitch on save",
		asset: { file: "assets/effects/glitch-on-save.js", kind: "js" },
		enabledByDefault: false
	}
];
