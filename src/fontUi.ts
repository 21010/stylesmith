/**
 * The VS Code side of installing fonts (fontInstall.ts does the work): the confirmation, the
 * progress, recording what was installed, and removing it again. Nothing is downloaded or
 * installed unless the user chooses "Install" in the confirmation dialog.
 */

import * as path from "node:path";
import * as vscode from "vscode";
import { FONT_RELEASE, FONTS, NERD_FONTS_LICENSE, type NerdFont } from "./fonts";
import {
	installFont,
	isInstalled,
	nodeSystem,
	removeFont,
	userFontDir,
	type InstalledFont,
	type System
} from "./fontInstall";
import type { StateFile } from "./store";

/** The recorded installs, without entries a damaged state file might contain. */
function recorded(value: unknown): Record<string, InstalledFont> {
	const valid = Object.create(null) as Record<string, InstalledFont>;
	if (typeof value !== "object" || value === null) return valid;
	const strings = (list: unknown): string[] =>
		Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
	for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
		if (typeof entry !== "object" || entry === null) continue;
		const { files, registry } = entry as Record<string, unknown>;
		valid[id] = { files: strings(files), registry: strings(registry) };
	}
	return valid;
}

const megabytes = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`;

export class FontInstaller {
	private busy = false;

	constructor(
		private readonly store: StateFile,
		/** Where the licenses of installed fonts are saved: Stylesmith's own storage. */
		private readonly licenseDir: string,
		private readonly system: System = nodeSystem()
	) {}

	/** Whether the font is installed, by Stylesmith or anyone else. */
	async installed(font: NerdFont): Promise<boolean> {
		const ours = recorded((await this.store.read()).installedFonts)[font.id];
		return Boolean(ours?.files.length) || (await isInstalled(font, this.system));
	}

	/**
	 * Asks whether to install the font, and installs it if the user agrees. Returns true when the
	 * font is installed afterwards.
	 */
	async offer(font: NerdFont): Promise<boolean> {
		const size = [...font.files, font.license, NERD_FONTS_LICENSE].reduce(
			(sum, file) => sum + file.size,
			0
		);
		const restart =
			this.system.platform === "darwin"
				? "It can be used right away."
				: "Quit and reopen VS Code afterwards: only then does VS Code see a new font.";
		const detail = [
			`Stylesmith downloads ${font.files.length} font file${font.files.length > 1 ? "s" : ""} and the license (${megabytes(size)}) from ${new URL(FONT_RELEASE).host}${new URL(FONT_RELEASE).pathname}, checks each file against a SHA-256 built into Stylesmith, and copies the font to ${userFontDir(this.system)}.`,
			"No administrator rights are needed. The font is under the SIL Open Font License; its license is saved with Stylesmith's data.",
			restart,
			"To remove it later, run Stylesmith: Remove Installed Fonts."
		].join("\n\n");
		const choice = await vscode.window.showInformationMessage(
			`Install ${font.label} for your user account?`,
			{ modal: true, detail },
			"Install"
		);
		if (choice !== "Install") return false;
		await this.install(font);
		return true;
	}

	private async install(font: NerdFont): Promise<void> {
		if (this.busy) throw new Error("another font is being installed");
		this.busy = true;
		try {
			const installed = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: `Installing ${font.label}…`
				},
				() => installFont(font, this.system, path.join(this.licenseDir, font.id))
			);
			await this.store.transact(state => ({
				change: {
					installedFonts: { ...recorded(state.installedFonts), [font.id]: installed }
				},
				result: undefined
			}));
		} finally {
			this.busy = false;
		}
	}

	/** Tells the user the font is installed, and what's left to do. */
	async announce(font: NerdFont): Promise<void> {
		if (this.system.platform === "darwin") {
			void vscode.window.showInformationMessage(`${font.label} is installed and selected.`);
			return;
		}
		const quit = "Quit VS Code";
		const choice = await vscode.window.showInformationMessage(
			`${font.label} is installed and selected. Quit and reopen VS Code to see it.`,
			quit
		);
		if (choice === quit) await vscode.commands.executeCommand("workbench.action.quit");
	}

	/** Lets the user remove fonts Stylesmith installed. */
	async remove(): Promise<void> {
		const installs = recorded((await this.store.read()).installedFonts);
		const ids = Object.keys(installs).filter(id => FONTS.some(font => font.id === id));
		if (ids.length === 0) {
			void vscode.window.showInformationMessage("Stylesmith hasn't installed any fonts.");
			return;
		}
		const picked = await vscode.window.showQuickPick(
			ids.map(id => ({ label: FONTS.find(font => font.id === id)!.label, id, picked: true })),
			{ title: "Stylesmith: Remove Installed Fonts", canPickMany: true }
		);
		if (!picked?.length) return;
		const locked: string[] = [];
		for (const { id } of picked) {
			locked.push(...(await removeFont(installs[id]!, this.system)));
		}
		await this.store.transact(state => {
			const remaining = recorded(state.installedFonts);
			for (const { id } of picked) delete remaining[id];
			return {
				change: {
					installedFonts: Object.keys(remaining).length ? { ...remaining } : undefined
				},
				result: undefined
			};
		});
		void vscode.window.showInformationMessage(
			locked.length
				? "Removed, except files that are in use. Close VS Code and the other programs using them, then delete: " +
						locked.join(", ")
				: "Removed. Choose another font in the Stylesmith menu; VS Code stops showing the removed font after it's reopened."
		);
	}
}
