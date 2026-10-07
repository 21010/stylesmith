/**
 * Settings from Stylesmith 1.x that this version no longer uses. VS Code only lets an extension
 * change settings it declares, so package.json still declares them, marked as deprecated, and
 * this removes them from the user's settings once. A test keeps the two lists in step.
 */

import type { SettingsAccess } from "./managed";

/**
 * Old effects that changed the same VS Code settings as a current effect: the user's choice
 * moves to the current one, unless they already chose there.
 */
export const RENAMED: Readonly<Record<string, string>> = {
	"effects.neonBlocks": "effects.bracketGuides",
	"effects.classicLayout": "effects.compactLayout",
	"effects.retroTerminalCursor": "effects.blockTerminalCursor"
};

/** Old on/off settings with nothing left to control. */
export const REMOVED: readonly string[] = [
	"allowRemoteImports",
	"silenceCorruptWarning",
	"remindAfterUpdate",
	"effects.caretAnimation",
	"effects.neonCurrentLine",
	"effects.neonFocusFrame",
	"effects.neonSelections",
	"effects.diagnosticHighlights",
	"effects.neonGlow",
	"effects.neonTerminal",
	"effects.terminalGlow",
	"effects.crtScanlines",
	"effects.crtFlicker",
	"effects.matrixRain",
	"effects.typingSparks",
	"effects.bootSequence",
	"effects.glitchOnSave"
];

/**
 * Old settings that hold the user's own data: the list of their CSS and JavaScript files. They
 * stay (declared as deprecated) so the user can move them to another tool, and delete them.
 */
export const KEPT: readonly string[] = ["imports"];

/**
 * Moves or removes the old settings in the user's (global) settings. Workspace settings are
 * left alone: they belong to the project, and VS Code ignores application settings there.
 * Returns the old settings it changed.
 */
export async function migrateOldSettings(settings: SettingsAccess): Promise<string[]> {
	const full = (key: string) => `stylesmith.${key}`;
	const changed: string[] = [];
	for (const [old, current] of Object.entries(RENAMED)) {
		const value = settings.read(full(old)).user;
		if (value === undefined) continue;
		if (typeof value === "boolean" && settings.read(full(current)).user === undefined)
			await settings.write(full(current), value);
		await settings.write(full(old), undefined);
		changed.push(old);
	}
	for (const old of REMOVED) {
		if (settings.read(full(old)).user === undefined) continue;
		await settings.write(full(old), undefined);
		changed.push(old);
	}
	return changed;
}
