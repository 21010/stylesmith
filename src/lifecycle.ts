/** Applies Stylesmith's supported settings through the VS Code extension API. */

import type { Config } from "./config";
import { EFFECTS, type Effect } from "./effects";
import {
	EFFECT_GROUP,
	FONT_GROUP,
	PRODUCT_ICON_GROUP,
	THEME_GROUP,
	fontWanted,
	toggleWanted,
	type ManagedSettings,
	type Wanted
} from "./managed";
import { ICON_THEME } from "./presets";
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

/**
 * Sets the color theme and file icon theme a preset chose, as managed settings: Disable puts
 * the user's own themes back. Enable never touches them; only presets set themes. Presets
 * leave VS Code's own interface icons (the product icon theme) alone; one that an earlier
 * version set is given back here.
 */
export async function applyThemes(
	services: Services,
	colorTheme: string,
	iconTheme: string
): Promise<void> {
	const same = (expected: string) => (value: unknown) => value === expected;
	const wanted = new Map([
		["workbench.colorTheme", toggleWanted(colorTheme, same(colorTheme))],
		["workbench.iconTheme", toggleWanted(iconTheme, same(iconTheme))]
	]);
	await services.managed.update(THEME_GROUP, wanted);
}

// Presets up to 2.8 set the product icon theme too; Stylesmith no longer manages it.
const RELEASED_SETTINGS = ["workbench.productIconTheme"];

/**
 * Toggles the Stylesmith Pixel product icon theme (#171, #185) as a managed setting: turning it
 * off or running Disable puts the user's own product icon theme back. Presets never call this.
 */
export async function applyProductIcons(services: Services, enabled: boolean): Promise<void> {
	const wanted = enabled
		? new Map([
				[
					"workbench.productIconTheme",
					toggleWanted(ICON_THEME, value => value === ICON_THEME)
				]
			])
		: new Map<string, Wanted>();
	await services.managed.update(PRODUCT_ICON_GROUP, wanted);
}

/** Restores the user's prior settings through the VS Code configuration API. */
export async function disable(services: Services): Promise<void> {
	await services.managed.update(FONT_GROUP, new Map());
	await services.managed.update(EFFECT_GROUP, new Map());
	await services.managed.update(THEME_GROUP, new Map());
	await services.managed.update(PRODUCT_ICON_GROUP, new Map());
	await services.store.update({ enabled: false });
}

/** Re-applies active choices after activation without touching the installation. */
export async function checkAfterStartup(services: Services): Promise<boolean> {
	await services.managed.release(THEME_GROUP, RELEASED_SETTINGS);
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
