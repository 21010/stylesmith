import { readFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { EFFECTS, STATUSBAR, type Effect } from "./effects";
import {
	DEFAULT_FONT_ID,
	findFont,
	fontFaceCss,
	planApply,
	planRestore,
	preloadScript,
	type NerdFont,
	type SavedSetting
} from "./fonts";
import { loadImports, type Variables } from "./imports";
import { messages } from "./messages";
import { patch, type Snippet } from "./patch";
import {
	isPermissionError,
	locateWorkbench,
	readPristine,
	removeLegacyBackups,
	writeFileAtomic,
	type Workbench
} from "./workbench";

const CONFIG_SECTION = "stylesmith";
// Settings of the original Custom CSS and JS Loader, used until Stylesmith is configured.
const LEGACY_CONFIG_SECTION = "vscode_custom_css";

// Font settings Stylesmith puts its Nerd Font into. An empty terminal font already follows
// the editor font, so it is left empty.
const FONT_SETTINGS = [
	{ key: "editor.fontFamily", leaveEmpty: false },
	{ key: "terminal.integrated.fontFamily", leaveEmpty: true }
] as const;
// Where the user's own font settings are remembered, so Disable can put them back.
const FONT_STATE = "stylesmith.fontSettings";

export function activate(context: vscode.ExtensionContext): void {
	// Every command rewrites the same file, so run them one at a time.
	let queue = Promise.resolve();
	const register = (command: string, task: () => Promise<void>) => {
		const disposable = vscode.commands.registerCommand(command, () => {
			queue = queue.then(() => reportErrors(task));
			return queue;
		});
		context.subscriptions.push(disposable);
	};

	// Enabling always starts from the pristine file, so it doubles as "reload".
	register("stylesmith.enable", () => enable(context));
	register("stylesmith.reload", () => enable(context));
	register("stylesmith.disable", () => disable(context));
}

export function deactivate(): void {}

async function enable(context: vscode.ExtensionContext): Promise<void> {
	const workbench = findWorkbench();
	if (!workbench) return;

	const imports = getImports();
	const effects = EFFECTS.filter(isOn);
	const font = userSetting("fonts.enabled", true)
		? findFont(userSetting("fonts.family", DEFAULT_FONT_ID))
		: undefined;
	if (imports.length === 0 && effects.length === 0 && !font) {
		void vscode.window.showInformationMessage(messages.notConfigured);
		return;
	}

	const current = await readFile(workbench.htmlPath, "utf-8");
	const loadOptions = { allowRemote: userSetting("allowRemoteImports", false) };
	const [pristine, fontSnippets, effectSnippets, importSnippets, bodySnippets] =
		await Promise.all([
			readPristine(workbench, current),
			readFont(context, font),
			readAssets(context, effects),
			loadImports(imports, getVariables(), loadOptions, (entry, error) => {
				console.error(`stylesmith: cannot load ${entry}`, error);
				void vscode.window.showWarningMessage(messages.cannotLoad(entry, error.message));
			}),
			readAssets(context, isOn(STATUSBAR) ? [STATUSBAR] : [])
		]);

	// Built-in fonts and effects come first so that the user's own files can override them.
	const head = [...fontSnippets, ...effectSnippets, ...importSnippets];
	const patched = patch(pristine, head, bodySnippets);
	if (patched !== current) await writeFileAtomic(workbench.htmlPath, patched);
	await removeLegacyBackups(workbench);
	await (font ? applyFontSettings(context, font) : restoreFontSettings(context));
	void promptRestart(messages.enabled);
}

async function disable(context: vscode.ExtensionContext): Promise<void> {
	const workbench = findWorkbench();
	if (!workbench) return;

	const current = await readFile(workbench.htmlPath, "utf-8");
	const pristine = await readPristine(workbench, current);
	if (pristine !== current) await writeFileAtomic(workbench.htmlPath, pristine);
	await removeLegacyBackups(workbench);
	await restoreFontSettings(context);
	void (pristine === current
		? vscode.window.showInformationMessage(messages.alreadyDisabled)
		: promptRestart(messages.disabled));
}

function findWorkbench(): Workbench | undefined {
	const appDirs = [
		require.main && path.dirname(require.main.filename),
		(globalThis as { _VSCODE_FILE_ROOT?: string })._VSCODE_FILE_ROOT,
		path.join(vscode.env.appRoot, "out")
	].filter((dir): dir is string => Boolean(dir));

	const workbench = locateWorkbench(appDirs);
	if (!workbench) {
		void vscode.window.showErrorMessage(messages.unableToLocateVsCodeInstallationPath);
	}
	return workbench;
}

/**
 * Reads a setting from the user's settings only. Workspace settings are ignored on purpose:
 * a cloned repository must never be able to choose what gets injected into VS Code.
 */
function userSetting<T>(key: string, fallback: T, section = CONFIG_SECTION): T {
	const value = vscode.workspace.getConfiguration(section).inspect<T>(key)?.globalValue;
	return value === undefined || typeof value !== typeof fallback ? fallback : value;
}

function getImports(): readonly unknown[] {
	const own = userSetting<unknown[]>("imports", []);
	if (Array.isArray(own) && own.length > 0) return own;
	const legacy = userSetting<unknown[]>("imports", [], LEGACY_CONFIG_SECTION);
	return Array.isArray(legacy) ? legacy : [];
}

function getVariables(): Variables {
	return {
		cwd: process.cwd(),
		userHome: os.homedir(),
		// Files from an untrusted workspace must never be injected.
		workspaceFolder: vscode.workspace.isTrusted
			? (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "")
			: undefined,
		execPath: process.env.VSCODE_EXEC_PATH ?? process.execPath,
		pathSeparator: path.sep,
		env: process.env
	};
}

function isOn(effect: Effect): boolean {
	return userSetting(effect.setting, effect.enabledByDefault);
}

/** Reads stylesheets and scripts bundled with the extension. */
function readAssets(
	context: vscode.ExtensionContext,
	assets: readonly Effect[]
): Promise<Snippet[]> {
	return Promise.all(
		assets.map(async ({ file, kind }) => ({
			kind,
			source: await readFile(context.asAbsolutePath(file), "utf-8")
		}))
	);
}

/** The font's files as `@font-face` rules, plus a script that starts loading them early. */
async function readFont(
	context: vscode.ExtensionContext,
	font: NerdFont | undefined
): Promise<Snippet[]> {
	if (!font) return [];
	const faces = await Promise.all(
		font.files.map(async ({ file, weight }) => ({
			weight,
			data: await readFile(context.asAbsolutePath(file))
		}))
	);
	return [
		{ kind: "css", source: fontFaceCss(font.family, faces) },
		{
			kind: "js",
			source: preloadScript(
				font.family,
				faces.map(face => face.weight)
			)
		}
	];
}

/** Puts the Nerd Font first in the user's editor and terminal font settings. */
async function applyFontSettings(context: vscode.ExtensionContext, font: NerdFont): Promise<void> {
	const state = context.globalState.get<Record<string, SavedSetting>>(FONT_STATE) ?? {};
	const config = vscode.workspace.getConfiguration();
	for (const { key, leaveEmpty } of FONT_SETTINGS) {
		const info = config.inspect<string>(key);
		const plan = planApply(
			info?.globalValue,
			info?.defaultValue,
			state[key],
			font.family,
			leaveEmpty
		);
		if (!plan) continue;
		if (plan.value !== info?.globalValue) {
			await config.update(key, plan.value, vscode.ConfigurationTarget.Global);
		}
		state[key] = plan.saved;
	}
	await context.globalState.update(FONT_STATE, state);
}

/** Puts back the user's own font settings from before Stylesmith changed them. */
async function restoreFontSettings(context: vscode.ExtensionContext): Promise<void> {
	const state = context.globalState.get<Record<string, SavedSetting>>(FONT_STATE);
	if (!state) return;
	const config = vscode.workspace.getConfiguration();
	for (const [key, saved] of Object.entries(state)) {
		const current = config.inspect<string>(key)?.globalValue;
		const value = planRestore(current, saved);
		if (value !== current) await config.update(key, value, vscode.ConfigurationTarget.Global);
	}
	await context.globalState.update(FONT_STATE, undefined);
}

async function promptRestart(message: string): Promise<void> {
	const choice = await vscode.window.showInformationMessage(message, messages.restartIde);
	if (choice === messages.restartIde) {
		await vscode.commands.executeCommand("workbench.action.reloadWindow");
	}
}

async function reportErrors(task: () => Promise<void>): Promise<void> {
	try {
		await task();
	} catch (error) {
		console.error("stylesmith:", error);
		void vscode.window.showErrorMessage(
			isPermissionError(error)
				? messages.admin
				: messages.somethingWrong + (error instanceof Error ? error.message : String(error))
		);
	}
}
