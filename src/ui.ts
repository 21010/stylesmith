import { readFileSync } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
	alacrittySchemeToml,
	ghosttySchemeConf,
	kittySchemeConf,
	orderThemesForPicker,
	terminalSchemeJson
} from "./addons";
import { CONFIG_SECTION, type Config } from "./config";
import { EFFECTS } from "./effects";
import { FONTS } from "./fonts";
import type { FontInstaller } from "./fontUi";
import { messages } from "./messages";
import {
	ICON_THEME,
	orderPresetsForPicker,
	PRESET_ALIASES,
	PRESETS,
	presetEffects,
	presetForTheme,
	type Preset
} from "./presets";
import { activeColorTheme } from "./problemLens";

/** Stylesmith's UI uses VS Code commands, settings, themes, decorations and status bar APIs. */

/** Stylesmith's messages as VS Code notifications. */
export const vscodeUi = {
	error: (message: string) => void vscode.window.showErrorMessage(message)
};

/** Shows whether Stylesmith is active. */
export interface StatusButton {
	show(active: boolean): void;
}

/** Tooltip for the status bar button when Stylesmith is active (#206). */
export function activeStatusTooltip(colorTheme: string | undefined): string {
	const preset = presetForTheme(colorTheme);
	return preset
		? `Stylesmith is on (${preset.label}). Click for presets, effects and fonts.`
		: messages.statusActive;
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
		const tooltip = active ? activeStatusTooltip(activeColorTheme()) : messages.statusInactive;
		item.text = active ? "$(paintcan)" : "$(paintcan) off";
		item.tooltip = tooltip;
		item.accessibilityInformation = { label: tooltip };
		if (config.get("statusbar", true)) item.show();
		else item.hide();
	};
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(event => {
			if (
				event.affectsConfiguration(`${CONFIG_SECTION}.statusbar`) ||
				event.affectsConfiguration("workbench.colorTheme") ||
				event.affectsConfiguration("workbench.preferred") ||
				event.affectsConfiguration("window.autoDetectColorScheme")
			) {
				show(active);
			}
		}),
		vscode.window.onDidChangeActiveColorTheme(() => show(active))
	);
	return { show };
}

type MenuItem = vscode.QuickPickItem & { run?: () => Thenable<unknown> };

/** Micro-feedback signals shown in the Stylesmith menu (#176). */
export const FEEDBACK_TOGGLES: readonly { setting: string; label: string; defaultOn: boolean }[] = [
	{ setting: "problems.enabled", label: "Problem Lens", defaultOn: true },
	{ setting: "problems.errorSignal", label: "Error count signal", defaultOn: false },
	{ setting: "undoHighlight", label: "Undo line highlight", defaultOn: false },
	{ setting: "pasteHighlight", label: "Paste line highlight", defaultOn: false },
	{ setting: "saveReceipt", label: "Manual save receipt", defaultOn: false },
	{ setting: "terminal.failSignal", label: "Failed command signal", defaultOn: false },
	{ setting: "terminal.doneSignal", label: "Long command done signal", defaultOn: false }
];

/** The Stylesmith menu, opened from the status bar button. */
export async function showMenu(
	config: Config,
	fonts: FontInstaller,
	extension?: vscode.Extension<unknown>,
	setProductIcons?: (enabled: boolean) => Promise<void>,
	isEnabled?: () => Promise<boolean>
): Promise<void> {
	const font = config.font();
	const activePreset = presetForTheme(activeColorTheme());
	const workbench = vscode.workspace.getConfiguration("workbench");
	const pixelProductIcons = workbench.get<string>("productIconTheme") === ICON_THEME;
	const separator = (label: string): MenuItem => ({
		label,
		kind: vscode.QuickPickItemKind.Separator
	});
	const items: MenuItem[] = [
		{
			label: "$(symbol-color) Apply a preset…",
			description: activePreset?.label,
			detail: "A complete look: theme, icons and VS Code API settings",
			run: () => vscode.commands.executeCommand("stylesmith.applyPreset")
		},
		{
			label: "$(preview) Preset gallery",
			detail: "See each preset's colors, story and settings before you apply it",
			run: () => vscode.commands.executeCommand("stylesmith.presetGallery")
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
		separator("Feedback"),
		...FEEDBACK_TOGGLES.map((item): MenuItem => {
			const on = config.get(item.setting, item.defaultOn);
			return {
				label: `${on ? "$(pass-filled)" : "$(circle-large-outline)"} ${item.label}`,
				description: on ? "on" : "off",
				run: () => config.set(item.setting, !on)
			};
		}),
		separator("Font & Icons"),
		{
			label: `$(text-size) ${font ? font.label : "Your own font"}`,
			description: "change…",
			run: () => pickFont(config, fonts, isEnabled)
		},
		{
			label: `${pixelProductIcons ? "$(pass-filled)" : "$(circle-large-outline)"} Pixel product icons`,
			description: pixelProductIcons ? "on" : "off",
			run: () =>
				setProductIcons
					? setProductIcons(!pixelProductIcons)
					: workbench.update(
							"productIconTheme",
							pixelProductIcons ? undefined : ICON_THEME,
							vscode.ConfigurationTarget.Global
						)
		},
		...(extension
			? [
					separator("Add-ons"),
					{
						label: "$(terminal) Terminal & editor add-ons…",
						detail: "Copy Vim color scheme, Oh My Posh prompt or terminal ANSI palette",
						run: () => pickAddon(extension)
					}
				]
			: []),
		separator("Terminal"),
		{
			label: "$(terminal) Boot sequence",
			detail: "Type out a short boot log in a terminal tab, in the style of the active preset",
			run: () => vscode.commands.executeCommand("stylesmith.bootSequence")
		},
		{
			label: "$(sparkle) Digital rain",
			detail: "Watch characters fall down a terminal tab in your theme's terminal greens",
			run: () => vscode.commands.executeCommand("stylesmith.digitalRain")
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

const PALETTE_FORMATS: readonly {
	label: string;
	detail: string;
	hint: string;
	format: (name: string, colors: Readonly<Record<string, string>>) => string;
}[] = [
	{
		label: "Windows Terminal (JSON)",
		detail: "A scheme object for Windows Terminal's settings.json schemes array",
		hint: "Paste it into the schemes array in Windows Terminal's settings.json.",
		format: terminalSchemeJson
	},
	{
		label: "Alacritty (TOML)",
		detail: "A [colors] table for alacritty.toml",
		hint: "Paste it into ~/.config/alacritty/alacritty.toml.",
		format: alacrittySchemeToml
	},
	{
		label: "Kitty (kitty.conf)",
		detail: "Color directives for kitty.conf",
		hint: "Paste it into ~/.config/kitty/kitty.conf.",
		format: kittySchemeConf
	},
	{
		label: "Ghostty (config)",
		detail: "Palette directives for Ghostty's config",
		hint: "Paste it into ~/.config/ghostty/config.",
		format: ghosttySchemeConf
	}
];

async function pickAddon(extension: vscode.Extension<unknown>): Promise<void> {
	const root = extension.extensionPath;
	const items: MenuItem[] = [
		{
			label: "$(code) Copy Vim / Neovim color scheme",
			detail: "Copies extras/vim/colors/stylesmith.vim to your clipboard",
			run: async () => {
				const content = readFileSync(
					path.join(root, "extras", "vim", "colors", "stylesmith.vim"),
					"utf-8"
				);
				await vscode.env.clipboard.writeText(content);
				void vscode.window.showInformationMessage(
					"Copied stylesmith.vim to clipboard. Save it as ~/.vim/colors/stylesmith.vim or ~/.config/nvim/colors/stylesmith.vim."
				);
			}
		},
		{
			label: "$(terminal) Copy Oh My Posh prompt",
			detail: "Copies extras/oh-my-posh/stylesmith.omp.json to your clipboard",
			run: async () => {
				const content = readFileSync(
					path.join(root, "extras", "oh-my-posh", "stylesmith.omp.json"),
					"utf-8"
				);
				await vscode.env.clipboard.writeText(content);
				void vscode.window.showInformationMessage(
					"Copied stylesmith.omp.json to clipboard. Save it as ~/stylesmith.omp.json."
				);
			}
		},
		{
			label: "$(symbol-color) Copy terminal ANSI palette…",
			detail: "Copies a Stylesmith theme's 16-color terminal scheme (Windows Terminal, Alacritty, Kitty, Ghostty)",
			run: async () => {
				const themes = (
					extension.packageJSON as {
						contributes: { themes: { id?: string; label: string; path: string }[] };
					}
				).contributes.themes;
				const active = activeColorTheme();
				const picked = await vscode.window.showQuickPick(
					orderThemesForPicker(themes, active).map(({ theme, current }) => ({
						label: theme.label,
						description: current ? "current" : undefined,
						theme
					})),
					{ title: "Stylesmith: Copy Terminal ANSI Palette" }
				);
				if (!picked) return;
				const target = await vscode.window.showQuickPick(PALETTE_FORMATS, {
					title: `Stylesmith: Format for ${picked.theme.label}`
				});
				if (!target) return;
				const file = JSON.parse(
					readFileSync(path.join(root, picked.theme.path), "utf-8")
				) as { colors: Record<string, string> };
				await vscode.env.clipboard.writeText(
					target.format(picked.theme.label, file.colors)
				);
				void vscode.window.showInformationMessage(
					`Copied ${picked.theme.label} terminal palette (${target.label}) to clipboard. ${target.hint}`
				);
			}
		}
	];
	const choice = await vscode.window.showQuickPick(items, {
		title: "Stylesmith: Terminal & Editor Add-ons"
	});
	await choice?.run?.();
}

async function pickFont(
	config: Config,
	fonts: FontInstaller,
	isEnabled?: () => Promise<boolean>
): Promise<void> {
	const current = config.font()?.id;
	const ids = await fonts.installedIds();
	const ours = await fonts.recordedIds();
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
		{ label: "Use my own font", description: current ? undefined : "current", id: undefined },
		...(ours.length > 0
			? [
					{
						label: "$(trash) Remove installed fonts…",
						description: `${ours.length} installed by Stylesmith`,
						id: "__remove__"
					}
				]
			: [])
	];
	const choice = await vscode.window.showQuickPick(items, { title: "Stylesmith: Font" });
	if (!choice) return;
	if (choice.id === "__remove__") {
		await vscode.commands.executeCommand("stylesmith.removeFonts");
		return;
	}
	const font = FONTS.find(candidate => candidate.id === choice.id);
	// A font that isn't installed: offer to install it. Declining still selects it, as before.
	const justInstalled = font && !states[FONTS.indexOf(font)] && (await fonts.offer(font));
	await config.set("fonts.enabled", choice.id !== undefined);
	if (choice.id) {
		await config.set("fonts.family", choice.id);
		await vscode.commands.executeCommand("stylesmith.enable");
	} else if (!isEnabled || (await isEnabled())) {
		await vscode.commands.executeCommand("stylesmith.enable");
	}
	if (font && justInstalled) await fonts.announce(font);
}

/** Installs a font the user picks among those that aren't installed, after confirming. */
export async function installFontCommand(
	config: Config,
	fonts: FontInstaller,
	fontId?: unknown
): Promise<void> {
	if (typeof fontId === "string") {
		const target = FONTS.find(candidate => candidate.id === fontId);
		if (!target || !(await fonts.offer(target))) return;
		await config.set("fonts.enabled", true);
		await config.set("fonts.family", target.id);
		await vscode.commands.executeCommand("stylesmith.enable");
		await fonts.announce(target);
		return;
	}
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
	id?: unknown,
	installedFonts?: () => Promise<ReadonlySet<string>>
): Promise<void> {
	let preset: Preset | undefined;
	if (typeof id === "string") {
		const wanted = PRESET_ALIASES[id] ?? id;
		preset = PRESETS.find(candidate => candidate.id === wanted);
		if (!preset) throw new Error(`there's no preset "${id}"`);
	} else {
		const active = activeColorTheme();
		const choice = await vscode.window.showQuickPick(
			orderPresetsForPicker(PRESETS, active).map(item => ({
				label: item.preset.label,
				description: item.description,
				detail: item.preset.description,
				preset: item.preset
			})),
			{ title: "Stylesmith: Apply a preset" }
		);
		preset = choice?.preset;
	}
	if (!preset) return;
	await setThemes(preset.theme, preset.iconTheme);
	for (const [setting, on] of presetEffects(preset)) await config.set(setting, on);
	if (installedFonts && (await installedFonts()).has(preset.font)) {
		await config.set("fonts.enabled", true);
		await config.set("fonts.family", preset.font);
	}
	await vscode.commands.executeCommand("stylesmith.enable");
}
