import { readFile } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { EFFECTS, type Effect } from "./effects";
import {
	DEFAULT_FONT_ID,
	FONTS,
	findFont,
	fontFaceCss,
	planApply,
	planRestore,
	preloadScript,
	type NerdFont
} from "./fonts";
import { loadImports, type Variables } from "./imports";
import { messages } from "./messages";
import { patch, type Snippet } from "./patch";
import { ICON_THEME, PRESETS, presetEffects, type Preset } from "./presets";
import { planReset, planSet } from "./settings";
import { StateFile } from "./store";
import { rememberWorkbench } from "./uninstall";
import {
	cleanUp,
	isPatched,
	isPermissionError,
	locateWorkbench,
	readPristine,
	removeFonts,
	removeLegacyBackups,
	writeFileAtomic,
	writeFonts,
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
// Where Stylesmith versions up to 1.9 kept their state in VS Code's globalState. It's read
// once, to move it into the state file (see store.ts for why).
const LEGACY_STATE_KEYS = {
	fontSettings: "stylesmith.fontSettings",
	effectSettings: "stylesmith.effectSettings",
	enabled: "stylesmith.enabled",
	reapplyAskedAt: "stylesmith.reapplyAskedAt"
} as const;

// The user's font and effect settings Stylesmith changed, whether it's enabled, and when it
// last asked to re-apply. Set up in activate().
let store: StateFile;

export function activate(context: vscode.ExtensionContext): void {
	store = new StateFile(path.join(context.globalStorageUri.fsPath, "state.json"), () =>
		Object.fromEntries(
			Object.entries(LEGACY_STATE_KEYS).map(([name, key]) => [
				name,
				context.globalState.get(key)
			])
		)
	);

	// Every command that rewrites VS Code's file runs one at a time.
	let queue = Promise.resolve();
	const register = (command: string, task: () => Promise<void>) => {
		const disposable = vscode.commands.registerCommand(command, () => {
			queue = queue.then(() => reportErrors(task));
			return queue;
		});
		context.subscriptions.push(disposable);
	};

	const status = createStatusButton(context);

	// Enabling always starts from the pristine file, so it doubles as "reload".
	register("stylesmith.enable", async () => status.show(await enable(context)));
	register("stylesmith.reload", async () => status.show(await enable(context)));
	register("stylesmith.disable", async () => {
		await disable();
		status.show(false);
	});
	register("stylesmith.applyPreset", () => applyPreset());
	context.subscriptions.push(
		vscode.commands.registerCommand("stylesmith.menu", () => reportErrors(showMenu))
	);

	void reportErrors(() => checkAfterStartup(status));
}

export function deactivate(): void {}

/** The paint-can button in the status bar, which opens the Stylesmith menu. */
function createStatusButton(context: vscode.ExtensionContext): { show(active: boolean): void } {
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
		if (userSetting("statusbar", true)) item.show();
		else item.hide();
	};
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration(`${CONFIG_SECTION}.statusbar`)) show(active);
		})
	);
	return { show };
}

/**
 * After startup: show whether Stylesmith is active, and if a VS Code update removed its
 * changes, offer to re-apply them. It only asks, and only reads the start of one file.
 */
async function checkAfterStartup(status: { show(active: boolean): void }): Promise<void> {
	const workbench = findWorkbench(false);
	if (!workbench) return;
	const patched = await isPatched(workbench);
	status.show(patched);

	const state = await store.read();
	if (patched || !state.enabled) return;
	if (!userSetting("remindAfterUpdate", true)) return;
	const asked = state.reapplyAskedAt ?? 0;
	if (Date.now() - asked < 60_000) return;
	await store.update({ reapplyAskedAt: Date.now() });
	const choice = await vscode.window.showInformationMessage(
		messages.reapply,
		messages.reapplyNow,
		messages.dontAskAgain
	);
	if (choice === messages.reapplyNow) {
		await vscode.commands.executeCommand("stylesmith.enable");
	} else if (choice === messages.dontAskAgain) {
		await setUserSetting("remindAfterUpdate", false);
	}
}

/** Returns true if VS Code's file was patched. */
async function enable(context: vscode.ExtensionContext): Promise<boolean> {
	const workbench = findWorkbench();
	if (!workbench) return false;

	const imports = getImports();
	const effects = EFFECTS.filter(isOn);
	const font = userSetting("fonts.enabled", true)
		? findFont(userSetting("fonts.family", DEFAULT_FONT_ID))
		: undefined;
	if (imports.length === 0 && effects.length === 0 && !font) {
		void vscode.window.showInformationMessage(messages.notConfigured);
		return false;
	}

	const current = await readFile(workbench.htmlPath, "utf-8");
	const loadOptions = { allowRemote: userSetting("allowRemoteImports", false) };
	const [pristine, effectSnippets, importSnippets] = await Promise.all([
		readPristine(workbench, current),
		readAssets(context, effects),
		loadImports(imports, getVariables(), loadOptions, (entry, error) => {
			console.error(`stylesmith: cannot load ${entry}`, error);
			void vscode.window.showWarningMessage(messages.cannotLoad(entry, error.message));
		})
	]);

	// Built-in fonts and effects come first so that the user's own files can override them.
	const head = [...fontSnippets(font), ...effectSnippets, ...importSnippets];
	const patched = patch(pristine, head, [], {
		allowRemote: loadOptions.allowRemote,
		userScripts: importSnippets.some(snippet => snippet.kind === "js")
	});
	// The font files go next to the HTML file first, so they're there when it refers to them.
	if (font) {
		await writeFonts(
			workbench,
			font.files.map(({ file }) => context.asAbsolutePath(file))
		);
	} else {
		await removeFonts(workbench);
	}
	if (patched !== current) await writeFileAtomic(workbench.htmlPath, patched);
	await removeLegacyBackups(workbench);
	await (font ? applyFontSettings(font) : restoreFontSettings());
	await updateEffectSettings(effects);
	await store.update({ enabled: true });
	void promptRestart(messages.enabled);
	return true;
}

async function disable(): Promise<void> {
	const workbench = findWorkbench();
	if (!workbench) return;

	const wasPatched = await cleanUp(workbench);
	await restoreFontSettings();
	await updateEffectSettings([]);
	await store.update({ enabled: false });
	void (wasPatched
		? promptRestart(messages.disabled)
		: vscode.window.showInformationMessage(messages.alreadyDisabled));
}

type MenuItem = vscode.QuickPickItem & { run?: () => Thenable<unknown> };

/** The Stylesmith menu, opened from the status bar button. */
async function showMenu(): Promise<void> {
	const fontsOn = userSetting("fonts.enabled", true);
	const font = findFont(userSetting("fonts.family", DEFAULT_FONT_ID));
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
			const on = isOn(effect);
			return {
				label: `${on ? "$(pass-filled)" : "$(circle-large-outline)"} ${effect.label}`,
				description: on ? "on" : "off",
				run: async () => {
					await setUserSetting(effect.setting, !on);
					await vscode.commands.executeCommand("stylesmith.reload");
				}
			};
		}),
		separator("Font"),
		{
			label: `$(text-size) ${fontsOn ? font.label : "Your own font"}`,
			description: "change…",
			run: () => pickFont()
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

async function pickFont(): Promise<void> {
	const current = userSetting("fonts.enabled", true)
		? userSetting("fonts.family", DEFAULT_FONT_ID)
		: undefined;
	const items = [
		...FONTS.map(font => ({
			label: font.label,
			description: font.id === current ? "current" : undefined,
			id: font.id as string | undefined
		})),
		{ label: "Use my own font", description: current ? undefined : "current", id: undefined }
	];
	const choice = await vscode.window.showQuickPick(items, { title: "Stylesmith: Font" });
	if (!choice) return;
	await setUserSetting("fonts.enabled", choice.id !== undefined);
	if (choice.id) await setUserSetting("fonts.family", choice.id);
	await vscode.commands.executeCommand("stylesmith.reload");
}

/** Lets the user pick a preset, then applies its theme, icons, font and effects. */
async function applyPreset(): Promise<void> {
	const choice = await vscode.window.showQuickPick(
		PRESETS.map(preset => ({ label: preset.label, detail: preset.description, preset })),
		{ title: "Stylesmith: Apply a preset" }
	);
	if (!choice) return;
	await usePreset(choice.preset);
	await vscode.commands.executeCommand("stylesmith.reload");
}

async function usePreset(preset: Preset): Promise<void> {
	const workbench = vscode.workspace.getConfiguration("workbench");
	await workbench.update("colorTheme", preset.theme, vscode.ConfigurationTarget.Global);
	await workbench.update("iconTheme", ICON_THEME, vscode.ConfigurationTarget.Global);
	await setUserSetting("fonts.enabled", true);
	await setUserSetting("fonts.family", preset.font);
	for (const [setting, on] of presetEffects(preset)) await setUserSetting(setting, on);
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
		rememberWorkbench(workbench).catch(error =>
			console.warn("stylesmith: could not remember the workbench location", error)
		);
	}
	return workbench;
}

function setUserSetting(key: string, value: unknown): Thenable<void> {
	return vscode.workspace
		.getConfiguration(CONFIG_SECTION)
		.update(key, value, vscode.ConfigurationTarget.Global);
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
		// Like the workspace folder, the working folder may be an untrusted project.
		cwd: vscode.workspace.isTrusted ? process.cwd() : undefined,
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

/**
 * Turns on the VS Code settings that the active effects need, and puts back the user's own
 * values for effects that are off.
 */
async function updateEffectSettings(active: readonly Effect[]): Promise<void> {
	const state = (await store.read()).effectSettings ?? {};
	const config = vscode.workspace.getConfiguration();
	const wanted = new Map(
		active.flatMap(effect => effect.editorSettings ?? []).map(s => [s.key, s])
	);

	for (const setting of wanted.values()) {
		const current = config.inspect(setting.key)?.globalValue;
		const plan = planSet(current, setting.value, setting.isOn, state[setting.key]);
		if (!plan) continue;
		await config.update(setting.key, plan.applied, vscode.ConfigurationTarget.Global);
		state[setting.key] = plan;
	}
	for (const [key, saved] of Object.entries(state)) {
		if (wanted.has(key)) continue;
		const current = config.inspect(key)?.globalValue;
		const value = planReset(current, saved);
		if (value !== current) await config.update(key, value, vscode.ConfigurationTarget.Global);
		delete state[key];
	}
	await store.update({ effectSettings: state });
}

/** Puts the Nerd Font first in the user's editor and terminal font settings. */
async function applyFontSettings(font: NerdFont): Promise<void> {
	const state = (await store.read()).fontSettings ?? {};
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
	await store.update({ fontSettings: state });
}

/** Puts back the user's own font settings from before Stylesmith changed them. */
async function restoreFontSettings(): Promise<void> {
	const state = (await store.read()).fontSettings;
	if (!state) return;
	const config = vscode.workspace.getConfiguration();
	for (const [key, saved] of Object.entries(state)) {
		const current = config.inspect<string>(key)?.globalValue;
		const value = planRestore(current, saved);
		if (value !== current) await config.update(key, value, vscode.ConfigurationTarget.Global);
	}
	await store.update({ fontSettings: undefined });
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
