import * as vscode from "vscode";
import { CONFIG_SECTION, type Config } from "./config";
import { EFFECTS } from "./effects";
import { FONTS } from "./fonts";
import type { Ui } from "./lifecycle";
import { messages } from "./messages";
import { permissionHelp } from "./permissions";
import { ICON_THEME, PRESETS, presetEffects, type Preset } from "./presets";

/**
 * Stylesmith's UI in VS Code: notifications, the status bar button and the menu it opens,
 * the font and preset pickers, and the help for permission problems. None of this touches
 * VS Code's files: changes go through "stylesmith.reload".
 */

/** Stylesmith's messages as VS Code notifications. */
export const vscodeUi: Ui = {
	info: message => void vscode.window.showInformationMessage(message),
	warn: message => void vscode.window.showWarningMessage(message),
	error: message => void vscode.window.showErrorMessage(message),
	ask: (message, ...choices) =>
		Promise.resolve(vscode.window.showInformationMessage(message, ...choices)),
	offerRestart: message => {
		void vscode.window
			.showInformationMessage(message, messages.reloadWindow)
			.then(choice =>
				choice === messages.reloadWindow
					? vscode.commands.executeCommand("workbench.action.reloadWindow")
					: undefined
			);
	},
	restartNow: async () => {
		await vscode.commands.executeCommand("workbench.action.reloadWindow");
	},
	run: async (command, ...args) => {
		await vscode.commands.executeCommand(command, ...args);
	}
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
export async function showMenu(config: Config): Promise<void> {
	const font = config.font();
	const separator = (label: string): MenuItem => ({
		label,
		kind: vscode.QuickPickItemKind.Separator
	});
	const items: MenuItem[] = [
		{
			label: "$(symbol-color) Apply a preset…",
			detail: "A complete look: theme, icons, font and effects",
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
					await vscode.commands.executeCommand("stylesmith.reload");
				}
			};
		}),
		separator("Font"),
		{
			label: `$(text-size) ${font ? font.label : "Your own font"}`,
			description: "change…",
			run: () => pickFont(config)
		},
		separator(""),
		{
			label: "$(refresh) Reload",
			run: () => vscode.commands.executeCommand("stylesmith.reload")
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

async function pickFont(config: Config): Promise<void> {
	const current = config.font()?.id;
	const items = [
		...FONTS.map(font => ({
			label: font.label,
			description: font.id === current ? "current" : undefined,
			id: font.id
		})),
		{ label: "Use my own font", description: current ? undefined : "current", id: undefined }
	];
	const choice = await vscode.window.showQuickPick(items, { title: "Stylesmith: Font" });
	if (!choice) return;
	await config.set("fonts.enabled", choice.id !== undefined);
	if (choice.id) await config.set("fonts.family", choice.id);
	await vscode.commands.executeCommand("stylesmith.reload");
}

/**
 * Applies a preset's theme, icons, font and effects. Given a preset id (for example from a
 * keyboard shortcut: "args": "night-city"), it applies that one; otherwise it asks.
 */
export async function applyPreset(config: Config, id?: unknown): Promise<void> {
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
	await usePreset(config, preset);
	await vscode.commands.executeCommand("stylesmith.reload");
}

async function usePreset(config: Config, preset: Preset): Promise<void> {
	await config.setThemes(preset.theme, ICON_THEME);
	await config.set("fonts.enabled", true);
	await config.set("fonts.family", preset.font);
	for (const [setting, on] of presetEffects(preset)) await config.set(setting, on);
}

/** Explains how to let Stylesmith change VS Code's files, for this system and install. */
export async function showPermissionHelp(folder: string): Promise<void> {
	const help = permissionHelp(process.platform, folder);
	const steps = help.steps.map((step, i) => `${i + 1}. ${step}`);
	const detail = [...steps, ...(help.command ? [help.command] : [])].join("\n\n");
	const buttons = help.command ? [messages.copyCommand] : [];
	const choice = await vscode.window.showErrorMessage(
		help.summary,
		{ modal: true, detail },
		...buttons
	);
	if (choice === messages.copyCommand && help.command) {
		await vscode.env.clipboard.writeText(help.command);
		void vscode.window.showInformationMessage(messages.commandCopied);
	}
}
