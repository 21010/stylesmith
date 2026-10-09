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
import { PRESET_STORIES } from "./stories";

interface ThemeContribution {
	id?: string;
	label: string;
	path: string;
}

export class PresetGallery implements vscode.Disposable {
	private panel: vscode.WebviewPanel | undefined;

	constructor(private readonly extension: vscode.Extension<unknown>) {}

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
		this.render();
		const ids = PRESETS.map(preset => preset.id);
		const listeners = [
			panel.webview.onDidReceiveMessage(async (message: unknown) => {
				const request = parseMessage(message, ids);
				if (request?.type === "apply") {
					await vscode.commands.executeCommand("stylesmith.applyPreset", request.id);
				} else if (request?.type === "disable") {
					await vscode.commands.executeCommand("stylesmith.disable");
				}
			}),
			vscode.workspace.onDidChangeConfiguration(event => {
				if (event.affectsConfiguration("workbench.colorTheme")) this.render();
			})
		];
		panel.onDidDispose(() => {
			for (const listener of listeners) listener.dispose();
			this.panel = undefined;
		});
	}

	dispose(): void {
		this.panel?.dispose();
	}

	private render(): void {
		if (!this.panel) return;
		const themes = (
			this.extension.packageJSON as { contributes: { themes: ThemeContribution[] } }
		).contributes.themes;
		const current = vscode.workspace.getConfiguration("workbench").get<string>("colorTheme");
		const cards = PRESETS.map((preset): GalleryCard => {
			const theme = themes.find(entry => (entry.id ?? entry.label) === preset.theme)!;
			const file = JSON.parse(
				readFileSync(path.join(this.extension.extensionPath, theme.path), "utf-8")
			) as Parameters<typeof sampleColors>[0];
			return {
				id: preset.id,
				label: preset.label,
				story: PRESET_STORIES[preset.label] ?? preset.description,
				themeLabel: theme.label,
				colors: sampleColors(file),
				settingsOn: EFFECTS.filter(effect => preset.effects[effect.setting]).map(
					effect => effect.label
				),
				fontLabel: FONTS.find(font => font.id === preset.font)?.label ?? preset.font,
				current: current === preset.theme
			};
		});
		this.panel.webview.html = galleryHtml(cards, randomBytes(18).toString("base64"));
	}
}
