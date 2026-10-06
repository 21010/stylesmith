/**
 * Enable, Disable and the checks around them: what Stylesmith does to VS Code's files and
 * settings. It doesn't use VS Code's API itself: how to show messages (Ui) and where VS Code
 * is (findWorkbench) are passed in, so all of this is tested with plain Node.js.
 */

import { readFile } from "node:fs/promises";
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
import { PermissionDeniedError } from "./permissions";
import type { StateFile } from "./store";
import { rememberWorkbench } from "./uninstall";
import {
	cleanUp,
	isPatched,
	isPermissionError,
	readPristine,
	removeFonts,
	removeLegacyBackups,
	writeFileAtomic,
	writeFonts,
	type Workbench
} from "./workbench";
import { getVsCodeCommit, matchesChecksum, setChecksum } from "./checksum";

/** How Stylesmith talks to the user. In VS Code these are notifications (see ui.ts). */
export interface Ui {
	info(message: string): void;
	warn(message: string): void;
	error(message: string): void;
	/** Shows a message with buttons; resolves to the button chosen, if any. */
	ask(message: string, ...choices: string[]): Promise<string | undefined>;
	/** Tells the user a window reload is needed, and offers to do it. */
	offerRestart(message: string): void;
	/** Reloads the window now, so Stylesmith's changes show. */
	restartNow(): Promise<void>;
	/** Runs one of Stylesmith's commands, such as "stylesmith.enable". */
	run(command: string, ...args: unknown[]): Promise<void>;
}

/** What enabling and disabling Stylesmith needs. Passed in, so nothing hides in globals. */
export interface Services {
	config: Config;
	managed: ManagedSettings;
	store: StateFile;
	ui: Ui;
	/** Finds VS Code's workbench file; undefined if it can't be found. */
	findWorkbench(): Workbench | undefined;
	/** The full path of a file bundled with the extension. */
	asAbsolutePath(relativePath: string): string;
	/** Where to remember the workbench's location for the uninstall cleanup (LOCATION_FILE). */
	locationFile: string;
	/** VS Code appRoot. */
	appRoot: string;
}

// Font settings Stylesmith puts its Nerd Font into. An empty terminal font already follows
// the editor font, so it is left empty.
const FONT_SETTINGS = [
	{ key: "editor.fontFamily", leaveEmpty: false },
	{ key: "terminal.integrated.fontFamily", leaveEmpty: true }
] as const;

/** How Enable ends. */
export interface EnableOptions {
	/** Reload the window right away instead of asking: the user already agreed to it. */
	restartNow?: boolean;
}

/** Patches VS Code with the configured font, effects and imports. True if it was patched. */
export async function enable(services: Services, options: EnableOptions = {}): Promise<boolean> {
	const { config, managed, store, ui } = services;
	const workbench = findWorkbench(services);
	if (!workbench) return false;

	const imports = config.imports();
	const effects = EFFECTS.filter(effect => config.isOn(effect));
	const font = config.font();
	if (imports.length === 0 && effects.length === 0 && !font) {
		// Not awaited: Enable runs in the command queue, and the preset's Reload joins it.
		void ui
			.ask(messages.notConfigured, messages.applyPreset)
			.then(async choice => {
				if (choice === messages.applyPreset) await ui.run("stylesmith.applyPreset");
			})
			.catch(reportTo(ui));
		return false;
	}

	const current = await readFile(workbench.htmlPath, "utf-8");
	const allowRemote = config.allowRemoteImports();
	const [pristine, effectSnippets, importSnippets] = await Promise.all([
		readPristine(workbench, current),
		readAssets(services, effects),
		loadImports(imports, config.variables(), { allowRemote }, (entry, error) => {
			console.error(`stylesmith: cannot load ${entry}`, error);
			ui.warn(messages.cannotLoad(entry, error.message));
		})
	]);

	// Built-in fonts and effects come first so that the user's own files can override them.
	const head = [...fontSnippets(font), ...effectSnippets, ...importSnippets];
	const patched = patch(pristine, head, [], {
		allowRemote,
		userScripts: importSnippets.some(snippet => snippet.kind === "js")
	});
	const silence = config.get("silenceCorruptWarning", true);
	// Whether an earlier Enable silenced VS Code's warning for the file now in place.
	const silenced =
		!silence &&
		current !== pristine &&
		(await matchesChecksum(workbench, services.appRoot, current)) === true;
	await writingTo(workbench, async () => {
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
	});
	// Also when the file didn't change: the setting may have.
	if (silence) await updateChecksum(services, workbench, patched);
	else if (silenced) await updateChecksum(services, workbench, pristine); // show the warning again
	await managed.update(FONT_GROUP, fontSettings(font));
	await managed.update(EFFECT_GROUP, effectSettings(effects));
	await store.update({ enabled: true, vsCodeCommit: await getVsCodeCommit(services.appRoot) });
	if (options.restartNow) await ui.restartNow();
	else ui.offerRestart(messages.enabled);
	return true;
}

/** Restores VS Code and the user's settings. */
export async function disable(services: Services): Promise<void> {
	const workbench = findWorkbench(services);
	if (!workbench) return;

	const wasPatched = await writingTo(workbench, () => cleanUp(workbench));
	// Whatever silenceCorruptWarning says now: it may have been on when VS Code was patched.
	if (wasPatched) {
		await updateChecksum(services, workbench, await readFile(workbench.htmlPath, "utf-8"));
	}
	await services.managed.update(FONT_GROUP, new Map());
	await services.managed.update(EFFECT_GROUP, new Map());
	await services.store.update({ enabled: false });
	if (wasPatched) services.ui.offerRestart(messages.disabled);
	else services.ui.info(messages.alreadyDisabled);
}

/**
 * After startup: if Stylesmith's changes are gone (usually after a VS Code update), offer to
 * re-apply them. It only asks, and normally reads only the start of one file. Returns whether
 * VS Code is patched.
 */
export async function checkAfterStartup(services: Services): Promise<boolean> {
	const { config, store, ui } = services;
	const workbench = findWorkbench(services, false);
	if (!workbench) return false;
	const patched = await isPatched(workbench);

	const state = await store.read();
	if (patched || !state.enabled) return patched;

	if (!config.get("remindAfterUpdate", true)) return patched;
	// Without an update, something else replaced the file. If VS Code's own checksum vouches
	// for it, it was restored (a reinstall, a repair); otherwise say it was changed.
	let question: string = messages.reapply;
	const currentCommit = await getVsCodeCommit(services.appRoot);
	if (state.vsCodeCommit && currentCommit && state.vsCodeCommit === currentCommit) {
		const html = await readFile(workbench.htmlPath, "utf-8");
		question = (await matchesChecksum(workbench, services.appRoot, html))
			? messages.restoredElsewhere
			: messages.changedOutside;
	}
	if (Date.now() - (state.reapplyAskedAt ?? 0) < 60_000) return patched; // another window asked
	await store.update({ reapplyAskedAt: Date.now() });
	// Not awaited: the answer can come much later, and startup shouldn't wait for it.
	void ui
		.ask(question, messages.reapplyNow, messages.dontAskAgain)
		.then(async choice => {
			// The question already says the window reloads, so it does without asking again.
			if (choice === messages.reapplyNow)
				await ui.run("stylesmith.reload", { restartNow: true });
			else if (choice === messages.dontAskAgain) await config.set("remindAfterUpdate", false);
		})
		.catch(reportTo(ui));
	return patched;
}

/**
 * Offers to reload after the user changed a setting that needs it (an effect, the font, or
 * the imports) somewhere other than Stylesmith's menu. One question at a time, and only
 * while Stylesmith is enabled.
 */
export class ReloadOffer {
	private asking = false;

	constructor(private readonly services: Services) {}

	async offer(): Promise<void> {
		if (this.asking) return;
		if (!(await this.services.store.read()).enabled) return;
		this.asking = true;
		try {
			const choice = await this.services.ui.ask(messages.settingsChanged, messages.reloadNow);
			if (choice === messages.reloadNow) {
				// The user just agreed, so the window reloads without asking a second time.
				await this.services.ui.run("stylesmith.reload", { restartNow: true });
			}
		} finally {
			this.asking = false;
		}
	}
}

/** An error handler for work that runs after a question is answered. */
function reportTo(ui: Ui): (error: unknown) => void {
	return error => {
		ui.error(
			messages.somethingWrong + (error instanceof Error ? error.message : String(error))
		);
	};
}

/**
 * Makes VS Code's checksum for the workbench match `content`. A failure doesn't undo Enable or
 * Disable; the user is told VS Code may report its installation as corrupt.
 */
async function updateChecksum(
	services: Services,
	workbench: Workbench,
	content: string
): Promise<void> {
	try {
		await setChecksum(workbench, services.appRoot, content);
	} catch (error) {
		console.error("stylesmith: cannot update product.json", error);
		services.ui.warn(
			messages.checksumNotUpdated(error instanceof Error ? error.message : String(error))
		);
	}
}

/** Runs `task`, reporting a permission problem as one with VS Code's workbench folder. */
async function writingTo<T>(workbench: Workbench, task: () => Promise<T>): Promise<T> {
	try {
		return await task();
	} catch (error) {
		if (isPermissionError(error))
			throw new PermissionDeniedError(workbench.dir, { cause: error });
		throw error;
	}
}

function findWorkbench(services: Services, reportMissing = true): Workbench | undefined {
	const workbench = services.findWorkbench();
	if (!workbench && reportMissing) {
		services.ui.error(messages.unableToLocateVsCodeInstallationPath);
	}
	if (workbench) {
		// So the uninstall cleanup can find it later, when VS Code's API isn't available.
		rememberWorkbench(workbench, services.locationFile).catch((error: unknown) =>
			console.warn("stylesmith: could not remember the workbench location", error)
		);
	}
	return workbench;
}

/** Reads the stylesheets and scripts of the given effects. */
function readAssets(services: Services, effects: readonly Effect[]): Promise<Snippet[]> {
	const assets = effects.flatMap(effect => (effect.asset ? [effect.asset] : []));
	return Promise.all(
		assets.map(async ({ file, kind }) => ({
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
