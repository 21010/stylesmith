import * as path from "node:path";
import * as vscode from "vscode";
import { vscodeConfig, vscodeSettings } from "./config";
import { removeLegacyPatch } from "./legacyCleanup";
import { checkAfterStartup, disable, enable, type Services } from "./lifecycle";
import { ManagedSettings } from "./managed";
import { migrateOldSettings } from "./oldSettings";
import { messages } from "./messages";
import { ProblemLens } from "./problemLens";
import { StateFile } from "./store";
import { applyPreset, createStatusButton, showMenu, vscodeUi } from "./ui";

// A preset or the menu changes several settings in a row; re-apply once for all of them.
const REAPPLY_DELAY = 100; // ms

const LEGACY_STATE_KEYS = {
	fontSettings: "stylesmith.fontSettings",
	effectSettings: "stylesmith.effectSettings",
	enabled: "stylesmith.enabled"
} as const;

export function activate(context: vscode.ExtensionContext): void {
	const store = new StateFile(path.join(context.globalStorageUri.fsPath, "state.json"), () =>
		Object.fromEntries(
			Object.entries(LEGACY_STATE_KEYS).map(([name, key]) => [
				name,
				context.globalState.get(key)
			])
		)
	);
	const services: Services = {
		config: vscodeConfig,
		managed: new ManagedSettings(vscodeSettings, store),
		store
	};

	let queue = Promise.resolve();
	const queued = (command: string, task: (...args: unknown[]) => Promise<void>) =>
		vscode.commands.registerCommand(command, (...args: unknown[]) => {
			queue = queue.then(() => reportErrors(() => task(...args)));
			return queue;
		});
	const status = createStatusButton(context, services.config);
	let reapply: ReturnType<typeof setTimeout> | undefined;

	context.subscriptions.push(
		queued("stylesmith.enable", async () => status.show(await enable(services))),
		// Kept as a compatibility alias; API-backed settings take effect without reloading VS Code.
		queued("stylesmith.reload", async () => status.show(await enable(services))),
		queued("stylesmith.disable", async () => {
			await disable(services);
			status.show(false);
		}),
		// Not queued: these run stylesmith.enable themselves, which would wait behind them.
		vscode.commands.registerCommand("stylesmith.applyPreset", (id?: unknown) =>
			reportErrors(() => applyPreset(services.config, id))
		),
		vscode.commands.registerCommand("stylesmith.menu", () =>
			reportErrors(() => showMenu(services.config))
		),
		new ProblemLens(context, () => services.config.problemLens()),
		vscode.workspace.onDidChangeConfiguration(event => {
			if (
				!event.affectsConfiguration("stylesmith.effects") &&
				!event.affectsConfiguration("stylesmith.fonts")
			)
				return;
			clearTimeout(reapply);
			reapply = setTimeout(() => {
				queue = queue.then(() =>
					reportErrors(async () => {
						if ((await store.read()).enabled)
							status.show(await enable(services, { keepUserChanges: true }));
					})
				);
			}, REAPPLY_DELAY);
		}),
		{ dispose: () => clearTimeout(reapply) }
	);

	void reportErrors(async () => {
		// First, so a moved setting (such as compact layout) is in place when settings are applied.
		await migrateOldSettings(vscodeSettings);
		status.show(await checkAfterStartup(services));
	});
	void reportErrors(() => cleanUpAfterVersion1(store));
}

/** Removes a workbench patch Stylesmith 1.x left behind, and tells the user what happened. */
async function cleanUpAfterVersion1(store: StateFile): Promise<void> {
	const result = await removeLegacyPatch(vscode.env.appRoot);
	if (result === "removed") {
		const choice = await vscode.window.showInformationMessage(
			messages.legacyRemoved,
			messages.reloadWindow
		);
		if (choice === messages.reloadWindow)
			await vscode.commands.executeCommand("workbench.action.reloadWindow");
	} else if (result === "denied") {
		const tell = await store.transact(state => ({
			change: { legacyDeniedShown: true },
			result: !state.legacyDeniedShown
		}));
		if (tell) void vscode.window.showWarningMessage(messages.legacyDenied);
	}
}

export function deactivate(): void {}

async function reportErrors(task: () => Promise<void>): Promise<void> {
	try {
		await task();
	} catch (error) {
		console.error("stylesmith:", error);
		const reason = error instanceof Error ? error.message : String(error);
		vscodeUi.error(messages.somethingWrong + reason);
	}
}
