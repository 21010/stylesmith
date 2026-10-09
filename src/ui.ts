import * as vscode from "vscode";
import { CONFIG_SECTION, type Config } from "./config";
import { EFFECTS } from "./effects";
import { FONTS } from "./fonts";
import type { FontInstaller } from "./fontUi";
import { messages } from "./messages";
import { PRESETS, presetEffects, type Preset } from "./presets";

/** Stylesmith's UI uses VS Code commands, settings, themes, decorations and status bar APIs. */

/** Stylesmith's messages as VS Code notifications. */
export const vscodeUi = {
	error: (message: string) => void vscode.window.showErrorMessage(message)
};

/** Shows whether Stylesmith is active. */
export interface StatusButton {
	show(active: boolean): void;
}

/** The paint-can button in the status bar, which opens the Stylesmith menu. */
export function createStatusButton(context: vscode.ExtensionContext, config: Config): StatusButton {
	const item = vscode.window.createStatusBarItem(
		"stylesmith.status",
		vscode.StatusBarAlignment.Right,
		100
	);
	item.name = "Stylesmith";
	item.command = "stylesmith.menu";
	context.subscriptions.push(item);

	let active = false;
	const show = (isActive: boolean) => {
		active = isActive;
		item.text = active ? "$(paintcan)" : "$(paintcan) off";
		item.tooltip = active ? messages.statusActive : messages.statusInactive;
		if (config.get("statusbar", true)) item.show();
		else item.hide();
	};
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration(`${CONFIG_SECTION}.statusbar`)) show(active);
		})
	);
	return { show };
}

type MenuItem = vscode.QuickPickItem & { run?: () => Thenable<unknown> };

/** The Stylesmith menu, opened from the status bar button. */
export async function showMenu(config: Config, fonts: FontInstaller): Promise<void> {
	const font = config.font();
	const separator = (label: string): MenuItem => ({
		label,
		kind: vscode.QuickPickItemKind.Separator
	});
	const items: MenuItem[] = [
		{
			label: "$(symbol-color) Apply a preset…",
			detail: "A complete look: theme, icons and VS Code API settings",
			run: () => vscode.commands.executeCommand("stylesmith.applyPreset")
		},
		separator("Effects"),
		...EFFECTS.map((effect): MenuItem => {
			const on = config.isOn(effect);
			return {
				label: `${on ? "$(pass-filled)" : "$(circle-large-outline)"} ${effect.label}`,
				description: on ? "on" : "off",
				run: async () => {
					await config.set(effect.setting, !on);
					await vscode.commands.executeCommand("stylesmith.enable");
				}
			};
		}),
		separator("Font"),
		{
			label: `$(text-size) ${font ? font.label : "Your own font"}`,
			description: "change…",
			run: () => pickFont(config, fonts)
		},
		separator(""),
		{
			label: "$(refresh) Apply settings",
			run: () => vscode.commands.executeCommand("stylesmith.enable")
		},
		{
			label: "$(circle-slash) Disable",
			run: () => vscode.commands.executeCommand("stylesmith.disable")
		},
		{
			label: "$(gear) Settings",
			run: () =>
				vscode.commands.executeCommand("workbench.action.openSettings", CONFIG_SECTION)
		}
	];
	const choice = await vscode.window.showQuickPick(items, { title: "Stylesmith" });
	await choice?.run?.();
}

async function pickFont(config: Config, fonts: FontInstaller): Promise<void> {
	const current = config.font()?.id;
	const ids = await fonts.installedIds();
	const states = FONTS.map(font => ids.has(font.id));
	const items = [
		...FONTS.map((font, i) => ({
			label: font.label,
			description:
				font.id === current
					? "current"
					: states[i]
						? "installed"
						: "not installed: Stylesmith can install it",
			id: font.id
		})),
		{ label: "Use my own font", description: current ? undefined : "current", id: undefined }
	];
	const choice = await vscode.window.showQuickPick(items, { title: "Stylesmith: Font" });
	if (!choice) return;
	const font = FONTS.find(candidate => candidate.id === choice.id);
	// A font that isn't installed: offer to install it. Declining still selects it, as before.
	const justInstalled = font && !states[FONTS.indexOf(font)] && (await fonts.offer(font));
	await config.set("fonts.enabled", choice.id !== undefined);
	if (choice.id) await config.set("fonts.family", choice.id);
	await vscode.commands.executeCommand("stylesmith.enable");
	if (font && justInstalled) await fonts.announce(font);
}

/** Installs a font the user picks among those that aren't installed, after confirming. */
export async function installFontCommand(config: Config, fonts: FontInstaller): Promise<void> {
	const ids = await fonts.installedIds();
	const states = FONTS.map(font => ids.has(font.id));
	const missing = FONTS.filter((_, i) => !states[i]);
	if (missing.length === 0) {
		void vscode.window.showInformationMessage("All of Stylesmith's fonts are installed.");
		return;
	}
	const choice = await vscode.window.showQuickPick(
		missing.map(font => ({ label: font.label, font })),
		{ title: "Stylesmith: Install Font" }
	);
	if (!choice || !(await fonts.offer(choice.font))) return;
	await config.set("fonts.enabled", true);
	await config.set("fonts.family", choice.font.id);
	await vscode.commands.executeCommand("stylesmith.enable");
	await fonts.announce(choice.font);
}

/**
 * Applies a preset's theme, icons, font and supported effects. Given a preset id (for example from a
 * keyboard shortcut: "args": "night-city"), it applies that one; otherwise it asks.
 */
export async function applyPreset(
	config: Config,
	setThemes: (colorTheme: string, iconTheme: string) => Promise<void>,
	id?: unknown
): Promise<void> {
	let preset: Preset | undefined;
	if (typeof id === "string") {
		preset = PRESETS.find(candidate => candidate.id === id);
		if (!preset) throw new Error(`there's no preset "${id}"`);
	} else {
		const choice = await vscode.window.showQuickPick(
			PRESETS.map(candidate => ({
				label: candidate.label,
				detail: candidate.description,
				preset: candidate
			})),
			{ title: "Stylesmith: Apply a preset" }
		);
		preset = choice?.preset;
	}
	if (!preset) return;
	await setThemes(preset.theme, preset.iconTheme);
	for (const [setting, on] of presetEffects(preset)) await config.set(setting, on);
	await vscode.commands.executeCommand("stylesmith.enable");
}
