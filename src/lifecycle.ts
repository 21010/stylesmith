import { readFile } from "node:fs/promises";
import * as path from "node:path";
import * as vscode from "vscode";
import type { Config } from "./config";
import { EFFECTS, type Effect } from "./effects";
import { fontFaceCss, preloadScript, type NerdFont } from "./fonts";
import { loadImports } from "./imports";
import {
	EFFECT_GROUP,
	FONT_GROUP,
	fontWanted,
	toggleWanted,
	type ManagedSettings,
	type Wanted
} from "./managed";
import { messages } from "./messages";
import { patch, type Snippet } from "./patch";
import type { StateFile } from "./store";
import { rememberWorkbench } from "./uninstall";
import {
	cleanUp,
	isPatched,
	locateWorkbench,
	readPristine,
	removeFonts,
	removeLegacyBackups,
	writeFileAtomic,
	writeFonts,
	type Workbench
} from "./workbench";

/** What enabling and disabling Stylesmith needs. Passed in, so nothing hides in globals. */
export interface Services {
	config: Config;
	managed: ManagedSettings;
	store: StateFile;
	/** The full path of a file bundled with the extension. */
	asAbsolutePath(relativePath: string): string;
}

export interface StatusButton {
	show(active: boolean): void;
}

// Font settings Stylesmith puts its Nerd Font into. An empty terminal font already follows
// the editor font, so it is left empty.
const FONT_SETTINGS = [
	{ key: "editor.fontFamily", leaveEmpty: false },
	{ key: "terminal.integrated.fontFamily", leaveEmpty: true }
] as const;

/** Patches VS Code with the configured font, effects and imports. True if it was patched. */
export async function enable(services: Services): Promise<boolean> {
	const { config, managed, store } = services;
	const workbench = findWorkbench();
	if (!workbench) return false;

	const imports = config.imports();
	const effects = EFFECTS.filter(effect => config.isOn(effect));
	const font = config.font();
	if (imports.length === 0 && effects.length === 0 && !font) {
		void vscode.window.showInformationMessage(messages.notConfigured);
		return false;
	}

	const current = await readFile(workbench.htmlPath, "utf-8");
	const allowRemote = config.allowRemoteImports();
	const [pristine, effectSnippets, importSnippets] = await Promise.all([
		readPristine(workbench, current),
		readAssets(services, effects),
		loadImports(imports, config.variables(), { allowRemote }, (entry, error) => {
			console.error(`stylesmith: cannot load ${entry}`, error);
			void vscode.window.showWarningMessage(messages.cannotLoad(entry, error.message));
		})
	]);

	// Built-in fonts and effects come first so that the user's own files can override them.
	const head = [...fontSnippets(font), ...effectSnippets, ...importSnippets];
	const patched = patch(pristine, head, [], {
		allowRemote,
		userScripts: importSnippets.some(snippet => snippet.kind === "js")
	});
	// The font files go next to the HTML file first, so they're there when it refers to them.
	if (font) {
		await writeFonts(
			workbench,
			font.files.map(({ file }) => services.asAbsolutePath(file))
		);
	} else {
		await removeFonts(workbench);
	}
	if (patched !== current) await writeFileAtomic(workbench.htmlPath, patched);
	await removeLegacyBackups(workbench);
	await managed.update(FONT_GROUP, fontSettings(font));
	await managed.update(EFFECT_GROUP, effectSettings(effects));
	await store.update({ enabled: true });
	void promptRestart(messages.enabled);
	return true;
}

/** Restores VS Code and the user's settings. */
export async function disable(services: Services): Promise<void> {
	const workbench = findWorkbench();
	if (!workbench) return;

	const wasPatched = await cleanUp(workbench);
	await services.managed.update(FONT_GROUP, new Map());
	await services.managed.update(EFFECT_GROUP, new Map());
	await services.store.update({ enabled: false });
	void (wasPatched
		? promptRestart(messages.disabled)
		: vscode.window.showInformationMessage(messages.alreadyDisabled));
}

/**
 * After startup: show whether Stylesmith is active, and if a VS Code update removed its
 * changes, offer to re-apply them. It only asks, and only reads the start of one file.
 */
export async function checkAfterStartup(services: Services, status: StatusButton): Promise<void> {
	const { config, store } = services;
	const workbench = findWorkbench(false);
	if (!workbench) return;
	const patched = await isPatched(workbench);
	status.show(patched);

	const state = await store.read();
	if (patched || !state.enabled) return;
	if (!config.get("remindAfterUpdate", true)) return;
	if (Date.now() - (state.reapplyAskedAt ?? 0) < 60_000) return; // another window just asked
	await store.update({ reapplyAskedAt: Date.now() });
	const choice = await vscode.window.showInformationMessage(
		messages.reapply,
		messages.reapplyNow,
		messages.dontAskAgain
	);
	if (choice === messages.reapplyNow) {
		await vscode.commands.executeCommand("stylesmith.enable");
	} else if (choice === messages.dontAskAgain) {
		await config.set("remindAfterUpdate", false);
	}
}

function findWorkbench(reportMissing = true): Workbench | undefined {
	const appDirs = [
		require.main && path.dirname(require.main.filename),
		(globalThis as { _VSCODE_FILE_ROOT?: string })._VSCODE_FILE_ROOT,
		path.join(vscode.env.appRoot, "out")
	].filter((dir): dir is string => Boolean(dir));

	const workbench = locateWorkbench(appDirs);
	if (!workbench && reportMissing) {
		void vscode.window.showErrorMessage(messages.unableToLocateVsCodeInstallationPath);
	}
	if (workbench) {
		// So the uninstall cleanup can find it later, when VS Code's API isn't available.
		rememberWorkbench(workbench).catch((error: unknown) =>
			console.warn("stylesmith: could not remember the workbench location", error)
		);
	}
	return workbench;
}

/** Reads the stylesheets and scripts of the given effects. */
function readAssets(services: Services, effects: readonly Effect[]): Promise<Snippet[]> {
	return Promise.all(
		effects.map(async ({ file, kind }) => ({
			kind,
			source: await readFile(services.asAbsolutePath(file), "utf-8")
		}))
	);
}

/** The font's `@font-face` rules, plus a script that starts loading the font early. */
function fontSnippets(font: NerdFont | undefined): Snippet[] {
	if (!font) return [];
	return [
		{ kind: "css", source: fontFaceCss(font) },
		{
			kind: "js",
			source: preloadScript(
				font.family,
				font.files.map(face => face.weight)
			)
		}
	];
}

/** The editor and terminal font settings, with the Nerd Font first; none without a font. */
function fontSettings(font: NerdFont | undefined): Map<string, Wanted> {
	if (!font) return new Map();
	return new Map(
		FONT_SETTINGS.map(({ key, leaveEmpty }) => [key, fontWanted(font.family, leaveEmpty)])
	);
}

/** The VS Code settings the active effects need. */
function effectSettings(effects: readonly Effect[]): Map<string, Wanted> {
	return new Map(
		effects
			.flatMap(effect => effect.editorSettings ?? [])
			.map(setting => [setting.key, toggleWanted(setting.value, setting.isOn)])
	);
}

async function promptRestart(message: string): Promise<void> {
	const choice = await vscode.window.showInformationMessage(message, messages.restartIde);
	if (choice === messages.restartIde) {
		await vscode.commands.executeCommand("workbench.action.reloadWindow");
	}
}
