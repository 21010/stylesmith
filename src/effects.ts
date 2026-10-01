import type { ImportKind } from "./patch";

/** A built-in effect: a stylesheet or script in assets/, turned on by a boolean setting. */
export interface Effect {
	/** Setting under `stylesmith.`, e.g. `effects.caretAnimation`. */
	setting: string;
	/** Name shown in the Stylesmith menu. */
	label: string;
	/** Path relative to the extension root. */
	file: string;
	kind: ImportKind;
	/** Must match the setting's default in package.json (checked by a test). */
	enabledByDefault: boolean;
	/** VS Code settings the effect needs, turned on while the effect is on. */
	editorSettings?: readonly EditorSetting[];
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
		file: "assets/effects/caret-animation.js",
		kind: "js",
		enabledByDefault: true
	},
	{
		setting: "effects.neonCurrentLine",
		label: "Neon current line",
		file: "assets/effects/neon-current-line.css",
		kind: "css",
		enabledByDefault: true
	},
	{
		setting: "effects.neonFocusFrame",
		label: "Neon focus frame",
		file: "assets/effects/neon-focus-frame.css",
		kind: "css",
		enabledByDefault: true
	},
	{
		setting: "effects.neonSelections",
		label: "Neon selections",
		file: "assets/effects/neon-selections.css",
		kind: "css",
		enabledByDefault: true
	},
	{
		setting: "effects.neonBlocks",
		label: "Neon code blocks",
		file: "assets/effects/neon-blocks.css",
		kind: "css",
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
		label: "Problem outlines (no underline)",
		file: "assets/effects/diagnostic-highlights.css",
		kind: "css",
		enabledByDefault: true
	},
	{
		setting: "effects.crtScanlines",
		label: "CRT scanlines",
		file: "assets/effects/crt-scanlines.css",
		kind: "css",
		enabledByDefault: false
	},
	{
		setting: "effects.typingSparks",
		label: "Typing sparks",
		file: "assets/effects/typing-sparks.js",
		kind: "js",
		enabledByDefault: false
	},
	{
		setting: "effects.bootSequence",
		label: "Boot sequence",
		file: "assets/effects/boot-sequence.js",
		kind: "js",
		enabledByDefault: false
	},
	{
		setting: "effects.glitchOnSave",
		label: "Glitch on save",
		file: "assets/effects/glitch-on-save.js",
		kind: "js",
		enabledByDefault: false
	}
];
