import type { ImportKind } from "./patch";

/** A built-in effect: a stylesheet or script in assets/, turned on by a boolean setting. */
export interface Effect {
	/** Setting under `stylesmith.`, e.g. `effects.caretAnimation`. */
	setting: string;
	/** Path relative to the extension root. */
	file: string;
	kind: ImportKind;
	/** Must match the setting's default in package.json (checked by a test). */
	enabledByDefault: boolean;
}

// Subtle effects are on by default; louder ones are opt-in.
export const EFFECTS: readonly Effect[] = [
	{
		setting: "effects.caretAnimation",
		file: "assets/effects/caret-animation.js",
		kind: "js",
		enabledByDefault: true
	},
	{
		setting: "effects.neonCurrentLine",
		file: "assets/effects/neon-current-line.css",
		kind: "css",
		enabledByDefault: true
	},
	{
		setting: "effects.neonFocusFrame",
		file: "assets/effects/neon-focus-frame.css",
		kind: "css",
		enabledByDefault: true
	},
	{
		setting: "effects.crtScanlines",
		file: "assets/effects/crt-scanlines.css",
		kind: "css",
		enabledByDefault: false
	},
	{
		setting: "effects.typingSparks",
		file: "assets/effects/typing-sparks.js",
		kind: "js",
		enabledByDefault: false
	}
];

export const STATUSBAR: Effect = {
	setting: "statusbar",
	file: "assets/statusbar.js",
	kind: "js",
	enabledByDefault: true
};
