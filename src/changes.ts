/**
 * Which setting changes need Stylesmith: Reload before they show, and which of them the user
 * made. Stylesmith's own changes (from the menu and presets) reload by themselves, so they
 * mustn't trigger an offer to reload as well.
 */

import type { Config } from "./config";

/** Settings that only take effect after a Reload, because they change VS Code's files. */
export const RELOAD_SETTINGS = [
	"stylesmith.imports",
	"stylesmith.effects",
	"stylesmith.fonts",
	"stylesmith.allowRemoteImports"
] as const;

/** How long a change Stylesmith made waits for VS Code to report it. */
const OWN_CHANGE_LIFETIME = 5000; // ms

/** Tells the user's setting changes apart from Stylesmith's own. */
export class SettingChanges {
	/** Full setting key, and until when the change counts as Stylesmith's own. */
	private readonly own = new Map<string, number>();

	constructor(private readonly now: () => number = Date.now) {}

	/** Call just before Stylesmith changes one of its settings itself. */
	markOwn(key: string): void {
		this.own.set(key, this.now() + OWN_CHANGE_LIFETIME);
	}

	/**
	 * Whether a settings change needs an offer to reload. `affects` is VS Code's
	 * `event.affectsConfiguration`. A change Stylesmith made itself is used up here.
	 */
	needsReload(affects: (section: string) => boolean): boolean {
		const now = this.now();
		for (const [key, until] of this.own) {
			// VS Code sends no event for a change that didn't change anything, so marks expire.
			if (until < now) {
				this.own.delete(key);
			} else if (affects(key)) {
				// VS Code sends one event for each change Stylesmith makes.
				this.own.delete(key);
				return false;
			}
		}
		return RELOAD_SETTINGS.some(section => affects(section));
	}
}

/** Wraps `config` so that every change Stylesmith makes is marked as its own. */
export function markingOwnChanges(config: Config, changes: SettingChanges): Config {
	return {
		...config,
		set(key, value) {
			changes.markOwn(`stylesmith.${key}`);
			return config.set(key, value);
		}
	};
}
