/**
 * Stylesmith's settings, read from and written to VS Code. The Config and SettingsAccess
 * interfaces are what the rest of Stylesmith uses; the vscode* objects here are their VS Code
 * versions, and tests pass in their own.
 */

import * as vscode from "vscode";
import type { Effect } from "./effects";
import { DEFAULT_FONT_ID, findFont, type NerdFont } from "./fonts";
import type { SettingsAccess } from "./managed";
import type { ProblemLensOptions, Severity } from "./problems";

export const CONFIG_SECTION = "stylesmith";

/**
 * Stylesmith's settings. They're read from the user's settings only; workspace settings are
 * ignored so opening a project cannot change which Stylesmith features get applied.
 */
export interface Config {
	get(key: string, fallback: boolean): boolean;
	get(key: string, fallback: string): string;
	get<T>(key: string, fallback: T): T;
	set(key: string, value: unknown): Promise<void>;
	isOn(effect: Effect): boolean;
	/** The selected system-installed Nerd Font, or undefined to keep the user's own font. */
	font(): NerdFont | undefined;
	problemLens(): ProblemLensOptions;
	/** Sets VS Code's color theme and file icon theme, in the user's settings. */
	setThemes(colorTheme: string, iconTheme: string): Promise<void>;
}

function userValue<T>(section: string, key: string, fallback: T): T {
	const value = vscode.workspace.getConfiguration(section).inspect<T>(key)?.globalValue;
	return value === undefined || typeof value !== typeof fallback ? fallback : value;
}

// A boolean fallback gives a boolean: without these, get("x", true) would be typed as `true`.
function get(key: string, fallback: boolean): boolean;
function get(key: string, fallback: string): string;
function get<T>(key: string, fallback: T): T;
function get<T>(key: string, fallback: T): T {
	return userValue(CONFIG_SECTION, key, fallback);
}

function severity(): Severity {
	const value = get<string>("problems.minimumSeverity", "warning");
	return value === "error" || value === "info" ? value : "warning";
}

export const vscodeConfig: Config = {
	get,

	async set(key, value) {
		await vscode.workspace
			.getConfiguration(CONFIG_SECTION)
			.update(key, value, vscode.ConfigurationTarget.Global);
	},

	isOn: effect => get(effect.setting, effect.enabledByDefault),

	font: () =>
		get("fonts.enabled", false) ? findFont(get("fonts.family", DEFAULT_FONT_ID)) : undefined,

	problemLens: () => ({
		enabled: get("problems.enabled", true),
		minimumSeverity: severity(),
		inlineMessages: get("problems.inlineMessages", true),
		gutterIcons: get("problems.gutterIcons", true),
		statusBar: get("problems.statusBar", true)
	}),

	async setThemes(colorTheme, iconTheme) {
		const workbench = vscode.workspace.getConfiguration("workbench");
		await workbench.update("colorTheme", colorTheme, vscode.ConfigurationTarget.Global);
		await workbench.update("iconTheme", iconTheme, vscode.ConfigurationTarget.Global);
	}
};

/** The user's own (global) VS Code settings, for the settings Stylesmith manages. */
export const vscodeSettings: SettingsAccess = {
	read(key) {
		const info = vscode.workspace.getConfiguration().inspect(key);
		return {
			user: info?.globalValue,
			default: info?.defaultValue,
			// VS Code only knows a default for settings it has registered.
			known: info?.defaultValue !== undefined
		};
	},
	async write(key, value) {
		await vscode.workspace
			.getConfiguration()
			.update(key, value, vscode.ConfigurationTarget.Global);
	}
};
