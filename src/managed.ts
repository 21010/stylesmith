/**
 * Managed settings: VS Code settings Stylesmith changes for the user, such as the editor and
 * terminal font, or the bracket pair guides the neon code blocks need.
 *
 * For each one, Stylesmith remembers the user's own value, works out its value from it, and
 * puts the user's value back when the setting isn't needed any more. If the user changed the
 * setting in the meantime, their change is kept.
 */

import { withFontFirst, withoutStylesmithFonts } from "./fonts";
import type { StateFile } from "./store";

/** What Stylesmith remembers about a setting it changed. */
export interface SavedValue {
	/** The user's own value before Stylesmith changed it; undefined if it wasn't set. */
	previous: unknown;
	/** The value Stylesmith wrote. */
	applied: unknown;
}

/** Works out Stylesmith's value from the user's own value; undefined leaves the setting alone. */
export type Wanted = (userValue: unknown) => unknown;

/** A kind of managed setting: where it's remembered, and what part of a value is the user's. */
export interface Group {
	name: "fontSettings" | "effectSettings";
	/** The user's own part of a value they changed after Stylesmith; what to put back. */
	userPart(current: unknown): unknown;
}

/** Font lists: the user's part is the list without Stylesmith's fonts. */
export const FONT_GROUP: Group = {
	name: "fontSettings",
	userPart: current =>
		typeof current === "string" ? withoutStylesmithFonts(current) || undefined : current
};

/** Settings effects turn on: a value the user changed is entirely theirs. */
export const EFFECT_GROUP: Group = {
	name: "effectSettings",
	userPart: current => current
};

/** Puts `family` first in the font list, keeping the user's fonts as fallbacks. */
export function fontWanted(family: string, leaveEmpty: boolean): Wanted {
	return userValue => {
		const fonts = typeof userValue === "string" ? userValue : "";
		// An empty terminal font already follows the editor font.
		if (leaveEmpty && fonts.trim() === "") return undefined;
		return withFontFirst(fonts, family);
	};
}

/** Turns a setting on, unless the user already has it on in their own way. */
export function toggleWanted(value: unknown, isOn: (value: unknown) => boolean): Wanted {
	return userValue => (isOn(userValue) ? undefined : value);
}

/**
 * Works out the new value and what to remember. Returns undefined to leave the setting alone.
 * `current` and `defaultValue` are the setting's user value and default.
 */
export function planApply(
	current: unknown,
	defaultValue: unknown,
	saved: SavedValue | undefined,
	wanted: Wanted,
	group: Group
): SavedValue | undefined {
	// While Stylesmith's own value is in place, the user's value is the one it remembered.
	const userValue = saved && current === saved.applied ? saved.previous : current;
	const applied = wanted(userValue === undefined ? defaultValue : userValue);
	if (applied === undefined) return undefined;
	const previous = !saved
		? current
		: current === saved.applied
			? saved.previous
			: group.userPart(current);
	return { previous, applied };
}

/** The value to put back. If the user changed the setting since, their part of it is kept. */
export function planRestore(current: unknown, saved: SavedValue, group: Group): unknown {
	return current === saved.applied ? saved.previous : group.userPart(current);
}

/**
 * The saved values that are usable. The state file can be damaged or edited by hand, and a
 * bad entry must not stop Disable from restoring the others; it's dropped instead.
 */
function validEntries(saved: unknown): Record<string, SavedValue> {
	const valid: Record<string, SavedValue> = {};
	if (typeof saved !== "object" || saved === null || Array.isArray(saved)) return valid;
	for (const [key, value] of Object.entries(saved as Record<string, unknown>)) {
		if (typeof value === "object" && value !== null && "applied" in value) {
			const entry = value as Partial<SavedValue>;
			valid[key] = { previous: entry.previous, applied: entry.applied };
		}
	}
	return valid;
}

/** Reads and writes the user's (global) settings. */
export interface SettingsAccess {
	read(key: string): { user: unknown; default: unknown };
	write(key: string, value: unknown): Promise<void>;
}

/**
 * Applies and restores managed settings, remembering the user's own values in the state file.
 * Each group (fonts, effect settings) is kept separately, so updating one never touches the
 * other.
 */
export class ManagedSettings {
	constructor(
		private readonly settings: SettingsAccess,
		private readonly store: StateFile
	) {}

	/**
	 * Makes exactly the `wanted` settings managed in `group`: applies them, and puts back any
	 * setting the group managed before but doesn't need now. An empty map restores them all.
	 */
	async update(group: Group, wanted: ReadonlyMap<string, Wanted>): Promise<void> {
		const state = validEntries((await this.store.read())[group.name]);

		for (const [key, want] of wanted) {
			const { user, default: defaultValue } = this.settings.read(key);
			const plan = planApply(user, defaultValue, state[key], want, group);
			if (plan) {
				if (plan.applied !== user) await this.settings.write(key, plan.applied);
				state[key] = plan;
			} else if (state[key]) {
				await this.restore(key, state[key], group);
				delete state[key];
			}
		}
		for (const [key, saved] of Object.entries(state)) {
			if (wanted.has(key)) continue;
			await this.restore(key, saved, group);
			delete state[key];
		}

		await this.store.update({
			[group.name]: Object.keys(state).length > 0 ? state : undefined
		});
	}

	private async restore(key: string, saved: SavedValue, group: Group): Promise<void> {
		const { user } = this.settings.read(key);
		const value = planRestore(user, saved, group);
		if (value !== user) await this.settings.write(key, value);
	}
}
