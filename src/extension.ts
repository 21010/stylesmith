import * as path from "node:path";
import * as vscode from "vscode";
import { vscodeConfig, vscodeSettings } from "./config";
import { FEEDBACK_URL, feedbackStep } from "./feedback";
import { removeLegacyPatch } from "./legacyCleanup";
import { applyThemes, checkAfterStartup, disable, enable, type Services } from "./lifecycle";
import { ManagedSettings } from "./managed";
import { migrateOldSettings } from "./oldSettings";
import { messages } from "./messages";
import { ProblemLens } from "./problemLens";
import { StateFile } from "./store";
import { UndoHighlight } from "./undoHighlight";
import { FontInstaller } from "./fontUi";
import { applyPreset, createStatusButton, installFontCommand, showMenu, vscodeUi } from "./ui";

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
	const fonts = new FontInstaller(
		store,
		path.join(context.globalStorageUri.fsPath, "font-licenses")
	);

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
			reportErrors(() =>
				applyPreset(
					services.config,
					(colorTheme, iconTheme) => applyThemes(services, colorTheme, iconTheme),
					id
				)
			)
		),
		vscode.commands.registerCommand("stylesmith.menu", () =>
			reportErrors(() => showMenu(services.config, fonts))
		),
		vscode.commands.registerCommand("stylesmith.installFont", () =>
			reportErrors(() => installFontCommand(services.config, fonts))
		),
		vscode.commands.registerCommand("stylesmith.removeFonts", () =>
			reportErrors(() => fonts.remove())
		),
		new ProblemLens(context, () => services.config.problemLens()),
		new UndoHighlight(() => services.config.undoHighlight()),
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
	void reportErrors(() => askForFeedback(store));
}

/** Asks once, after about a week of use, what the user uses Stylesmith for (see feedback.ts). */
async function askForFeedback(store: StateFile): Promise<void> {
	const ask = await store.transact(state => {
		const { change, ask } = feedbackStep(state, Date.now());
		return { change, result: ask };
	});
	if (!ask) return;
	const answer = "Answer on GitHub";
	const choice = await vscode.window.showInformationMessage(
		"Stylesmith: what do you use it for? One click in a public GitHub poll helps decide what to build next. Stylesmith itself sends nothing, and won't ask again.",
		answer,
		"No, thanks"
	);
	if (choice === answer) await vscode.env.openExternal(vscode.Uri.parse(FEEDBACK_URL));
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
