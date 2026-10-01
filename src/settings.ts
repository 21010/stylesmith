/**
 * VS Code settings that an effect needs, like bracket pair guides for the neon code blocks.
 * Stylesmith only changes them when they're off, remembers the user's own value, and puts it
 * back when the effect is turned off or Stylesmith is disabled.
 */

/** What Stylesmith remembers about a setting it changed. */
export interface SavedValue {
	/** The user's own value before Stylesmith changed it; undefined if it wasn't set. */
	previous: unknown;
	/** The value Stylesmith wrote. */
	applied: unknown;
}

/**
 * Works out whether to change a setting. Returns undefined to leave it alone: when Stylesmith
 * already changed it, or when the user has it turned on in their own way.
 */
export function planSet(
	current: unknown,
	wanted: unknown,
	isOn: (value: unknown) => boolean,
	saved: SavedValue | undefined
): SavedValue | undefined {
	if (saved && current === saved.applied) return undefined;
	if (isOn(current)) return undefined;
	return { previous: current, applied: wanted };
}

/** The value to put back. If the user changed the setting since, their choice is kept. */
export function planReset(current: unknown, saved: SavedValue): unknown {
	return current === saved.applied ? saved.previous : current;
}
