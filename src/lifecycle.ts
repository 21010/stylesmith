/** Applies Stylesmith's supported settings through the VS Code extension API. */

import type { Config } from "./config";
import { EFFECTS, type Effect } from "./effects";
import {
	EFFECT_GROUP,
	FONT_GROUP,
	fontWanted,
	toggleWanted,
	type ManagedSettings,
	type Wanted
} from "./managed";
import type { StateFile } from "./store";
import type { NerdFont } from "./fonts";

export interface Services {
	config: Config;
	managed: ManagedSettings;
	store: StateFile;
}

export interface EnableOptions {
	/**
	 * Leave effect settings the user changed since Stylesmith applied them. Set for automatic
	 * re-applies (startup, a Stylesmith setting changed); an explicit Enable applies everything.
	 */
	keepUserChanges?: boolean;
}

const FONT_SETTINGS = [
	{ key: "editor.fontFamily", leaveEmpty: false },
	{ key: "terminal.integrated.fontFamily", leaveEmpty: true }
] as const;

/** Applies the selected VS Code settings. This function never reads or writes VS Code files. */
export async function enable(services: Services, options: EnableOptions = {}): Promise<boolean> {
	const effects = EFFECTS.filter(effect => services.config.isOn(effect));
	const font = services.config.font();
	await services.managed.update(FONT_GROUP, fontSettings(font), options);
	await services.managed.update(EFFECT_GROUP, effectSettings(effects), options);
	await services.store.update({ enabled: true });
	return true;
}

/** Restores the user's prior settings through the VS Code configuration API. */
export async function disable(services: Services): Promise<void> {
	await services.managed.update(FONT_GROUP, new Map());
	await services.managed.update(EFFECT_GROUP, new Map());
	await services.store.update({ enabled: false });
}

/** Re-applies active choices after activation without touching the installation. */
export async function checkAfterStartup(services: Services): Promise<boolean> {
	const { enabled } = await services.store.read();
	if (enabled) await enable(services, { keepUserChanges: true });
	return Boolean(enabled);
}

function fontSettings(font: NerdFont | undefined): Map<string, Wanted> {
	if (!font) return new Map();
	return new Map(
		FONT_SETTINGS.map(({ key, leaveEmpty }) => [key, fontWanted(font.family, leaveEmpty)])
	);
}

function effectSettings(effects: readonly Effect[]): Map<string, Wanted> {
	return new Map(
		effects.flatMap(effect =>
			(effect.editorSettings ?? []).map(
				setting => [setting.key, toggleWanted(setting.value, setting.isOn)] as const
			)
		)
	);
}
