/**
 * Stylesmith: Preset Gallery (#84): the presets in a webview panel, each with a code sample in its
 * theme's real colors, its story and settings, and an Apply button. Apply runs the same command
 * as the menu (stylesmith.applyPreset), so Disable restores everything as usual. The page is
 * built in gallery.ts; it loads nothing and may only ask to apply a known preset, or to disable.
 */

import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { EFFECTS } from "./effects";
import { FONTS } from "./fonts";
import { galleryHtml, parseMessage, sampleColors, type GalleryCard } from "./gallery";
import { PRESETS } from "./presets";
import { activeColorTheme } from "./problemLens";
import { PRESET_STORIES } from "./stories";

interface ThemeContribution {
	id?: string;
	label: string;
	uiTheme?: string;
	path: string;
}

interface IconThemeContribution {
	id: string;
	label: string;
}

export class PresetGallery implements vscode.Disposable {
	private panel: vscode.WebviewPanel | undefined;

	constructor(
		private readonly extension: vscode.Extension<unknown>,
		private readonly installedFonts?: () => Promise<ReadonlySet<string>>
	) {}

	/** Opens the gallery, or brings it to the front. */
	show(): void {
		if (this.panel) {
			this.panel.reveal();
			return;
		}
		const panel = vscode.window.createWebviewPanel(
			"stylesmith.presetGallery",
			"Stylesmith Presets",
			vscode.ViewColumn.Active,
			// Scripts for the Apply buttons; no local files at all.
			{ enableScripts: true, localResourceRoots: [] }
		);
		this.panel = panel;
		void this.render();
		const ids = PRESETS.map(preset => preset.id);
		const fontIds = FONTS.map(font => font.id);
		const listeners = [
			panel.webview.onDidReceiveMessage(async (message: unknown) => {
				const request = parseMessage(message, ids, fontIds);
				if (request?.type === "apply") {
					await vscode.commands.executeCommand("stylesmith.applyPreset", request.id);
				} else if (request?.type === "installFont") {
					await vscode.commands.executeCommand("stylesmith.installFont", request.id);
					await this.render();
				} else if (request?.type === "disable") {
					await vscode.commands.executeCommand("stylesmith.disable");
				}
			}),
			vscode.workspace.onDidChangeConfiguration(event => {
				if (
					event.affectsConfiguration("workbench.colorTheme") ||
					event.affectsConfiguration("workbench.preferred") ||
					event.affectsConfiguration("window.autoDetectColorScheme") ||
					event.affectsConfiguration("stylesmith.fonts")
				)
					void this.render();
			}),
			vscode.window.onDidChangeActiveColorTheme(() => void this.render())
		];
		panel.onDidDispose(() => {
			for (const listener of listeners) listener.dispose();
			this.panel = undefined;
		});
	}

	/** Re-renders the gallery if open, e.g. after fonts are installed or removed (#200). */
	refresh(): void {
		if (this.panel) void this.render();
	}

	dispose(): void {
		this.panel?.dispose();
	}

	private async render(): Promise<void> {
		if (!this.panel) return;
		const installed = this.installedFonts ? await this.installedFonts() : undefined;
		if (!this.panel) return;
		const contributes = (
			this.extension.packageJSON as {
				contributes: {
					themes: ThemeContribution[];
					iconThemes?: IconThemeContribution[];
				};
			}
		).contributes;
		const themes = contributes.themes;
		const iconThemes = contributes.iconThemes ?? [];
		const current = activeColorTheme();
		const cards = PRESETS.map((preset): GalleryCard => {
			const theme = themes.find(entry => (entry.id ?? entry.label) === preset.theme)!;
			const iconTheme = iconThemes.find(entry => entry.id === preset.iconTheme);
			const file = JSON.parse(
				readFileSync(path.join(this.extension.extensionPath, theme.path), "utf-8")
			) as Parameters<typeof sampleColors>[0];
			return {
				id: preset.id,
				label: preset.label,
				story: PRESET_STORIES[preset.label] ?? preset.description,
				themeLabel: theme.label,
				iconThemeLabel: iconTheme?.label,
				colors: sampleColors(file),
				settingsOn: EFFECTS.filter(effect => preset.effects[effect.setting]).map(
					effect => effect.label
				),
				fontLabel: FONTS.find(font => font.id === preset.font)?.label ?? preset.font,
				fontId: preset.font,
				fontInstalled: installed ? installed.has(preset.font) : undefined,
				current: current === preset.theme || current === theme.label,
				kind: theme.uiTheme?.startsWith("hc")
					? "hc"
					: theme.uiTheme === "vs"
						? "light"
						: "dark"
			};
		});
		this.panel.webview.html = galleryHtml(cards, randomBytes(18).toString("base64"));
	}
}
