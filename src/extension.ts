import * as path from "node:path";
import * as vscode from "vscode";
import { SettingChanges, markingOwnChanges } from "./changes";
import { vscodeConfig, vscodeSettings } from "./config";
import {
	ReloadOffer,
	checkAfterStartup,
	disable,
	enable,
	type EnableOptions,
	type Services
} from "./lifecycle";
import { ManagedSettings } from "./managed";
import { messages } from "./messages";
import { PermissionDeniedError } from "./permissions";
import { ProblemLens } from "./problemLens";
import { StateFile } from "./store";
import { applyPreset, createStatusButton, showMenu, showPermissionHelp, vscodeUi } from "./ui";
import { LOCATION_FILE } from "./uninstall";
import { isPermissionError, locateWorkbench } from "./workbench";

/**
 * Stylesmith's entry point: it only connects the parts. What Stylesmith does lives in
 * lifecycle.ts, its UI in ui.ts, and settings in config.ts and managed.ts.
 */

// Where Stylesmith versions up to 1.9 kept their state in VS Code's globalState. It's read
// once, to move it into the state file (see store.ts for why).
const LEGACY_STATE_KEYS = {
	fontSettings: "stylesmith.fontSettings",
	effectSettings: "stylesmith.effectSettings",
	enabled: "stylesmith.enabled",
	reapplyAskedAt: "stylesmith.reapplyAskedAt"
} as const;

// How long to wait after the last settings change before offering to reload, so that
// changing several settings in a row asks only once.
const RELOAD_OFFER_DELAY = 1000; // ms

/** Called by VS Code once it has started: builds the parts and registers the commands. */
export function activate(context: vscode.ExtensionContext): void {
	const store = new StateFile(path.join(context.globalStorageUri.fsPath, "state.json"), () =>
		Object.fromEntries(
			Object.entries(LEGACY_STATE_KEYS).map(([name, key]) => [
				name,
				context.globalState.get(key)
			])
		)
	);
	const changes = new SettingChanges();
	const services: Services = {
		config: markingOwnChanges(vscodeConfig, changes),
		managed: new ManagedSettings(vscodeSettings, store),
		store,
		ui: vscodeUi,
		findWorkbench: () => locateWorkbench(vscodeAppDirs()),
		asAbsolutePath: relativePath => context.asAbsolutePath(relativePath),
		locationFile: LOCATION_FILE
	};

	// Commands that change VS Code's files run one at a time, through this queue.
	let queue = Promise.resolve();
	const queued = (command: string, task: (...args: unknown[]) => Promise<void>) =>
		vscode.commands.registerCommand(command, (...args: unknown[]) => {
			queue = queue.then(() => reportErrors(() => task(...args)));
			return queue;
		});
	// Commands that only ask the user and change settings stay outside the queue. They run
	// "stylesmith.reload", which joins the queue itself: a queued command that waited for
	// another queued command would wait forever.
	const direct = (command: string, task: (...args: unknown[]) => Promise<void>) =>
		vscode.commands.registerCommand(command, (...args: unknown[]) =>
			reportErrors(() => task(...args))
		);

	const status = createStatusButton(context, services.config);
	const reloadOffer = new ReloadOffer(services);
	let offerTimer: ReturnType<typeof setTimeout> | undefined;

	context.subscriptions.push(
		// Enabling always starts from the pristine file, so it doubles as "reload".
		queued("stylesmith.enable", async () => status.show(await enable(services))),
		queued("stylesmith.reload", async options =>
			status.show(await enable(services, enableOptions(options)))
		),
		queued("stylesmith.disable", async () => {
			await disable(services);
			status.show(false);
		}),
		direct("stylesmith.applyPreset", id => applyPreset(services.config, id)),
		direct("stylesmith.menu", () => showMenu(services.config)),
		// Live, through VS Code's API: it needs no Enable and no restart.
		new ProblemLens(context, () => services.config.problemLens()),
		vscode.workspace.onDidChangeConfiguration(event => {
			if (!changes.needsReload(section => event.affectsConfiguration(section))) return;
			clearTimeout(offerTimer);
			offerTimer = setTimeout(
				() => void reportErrors(() => reloadOffer.offer()),
				RELOAD_OFFER_DELAY
			);
		}),
		{ dispose: () => clearTimeout(offerTimer) }
	);

	void reportErrors(async () => status.show(await checkAfterStartup(services)));
}

/** Nothing to do: everything is registered in context.subscriptions, which VS Code disposes. */
export function deactivate(): void {}

/** Reads Reload's options. Commands can be run with any argument, so only known ones count. */
function enableOptions(value: unknown): EnableOptions {
	const restartNow =
		typeof value === "object" &&
		value !== null &&
		"restartNow" in value &&
		value.restartNow === true;
	return { restartNow };
}

/** Where VS Code's application files are, in the order to try them. */
function vscodeAppDirs(): string[] {
	return [
		require.main && path.dirname(require.main.filename),
		(globalThis as { _VSCODE_FILE_ROOT?: string })._VSCODE_FILE_ROOT,
		path.join(vscode.env.appRoot, "out")
	].filter((dir): dir is string => Boolean(dir));
}

async function reportErrors(task: () => Promise<void>): Promise<void> {
	try {
		await task();
	} catch (error) {
		console.error("stylesmith:", error);
		if (error instanceof PermissionDeniedError) {
			void showPermissionHelp(error.folder);
		} else {
			const reason = error instanceof Error ? error.message : String(error);
			vscodeUi.error(
				isPermissionError(error)
					? messages.notAllowed(reason)
					: messages.somethingWrong + reason
			);
		}
	}
}
