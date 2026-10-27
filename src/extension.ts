import * as path from "node:path";
import * as vscode from "vscode";
import { vscodeConfig, vscodeSettings } from "./config";
import { FEEDBACK_URL, feedbackStep } from "./feedback";
import {
	applyProductIcons,
	applyThemes,
	checkAfterStartup,
	disable,
	enable,
	type Services
} from "./lifecycle";
import { ManagedSettings } from "./managed";
import { messages } from "./messages";
import { showBootSequence } from "./bootSequence";
import { showDigitalRain } from "./digitalRain";
import { PresetGallery } from "./presetGallery";
import { ProblemLens } from "./problemLens";
import { StateFile } from "./store";
import { DoneSignal } from "./doneSignal";
import { FailSignal } from "./failSignal";
import { PasteHighlight } from "./pasteHighlight";
import { SaveReceipt } from "./saveReceipt";
import { UndoHighlight } from "./undoHighlight";
import { FontInstaller } from "./fontUi";
import { applyPreset, createStatusButton, installFontCommand, showMenu, vscodeUi } from "./ui";

// A preset or the menu changes several settings in a row; re-apply once for all of them.
const REAPPLY_DELAY = 100; // ms

export function activate(context: vscode.ExtensionContext): void {
	const store = new StateFile(path.join(context.globalStorageUri.fsPath, "state.json"));
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
	const gallery = new PresetGallery(context.extension, () => fonts.installedIds());
	const lens = new ProblemLens(context, () => services.config.problemLens());
	let reapply: ReturnType<typeof setTimeout> | undefined;

	context.subscriptions.push(
		queued("stylesmith.enable", async () => status.show(await enable(services))),
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
					id,
					() => fonts.installedIds()
				)
			)
		),
		vscode.commands.registerCommand("stylesmith.menu", () =>
			reportErrors(async () => {
				await showMenu(
					services.config,
					fonts,
					context.extension,
					enabled => applyProductIcons(services, enabled),
					async () => Boolean((await store.read()).enabled)
				);
				gallery.refresh();
			})
		),
		vscode.commands.registerCommand("stylesmith.installFont", (fontId?: unknown) =>
			reportErrors(async () => {
				await installFontCommand(services.config, fonts, fontId);
				gallery.refresh();
			})
		),
		vscode.commands.registerCommand("stylesmith.removeFonts", () =>
			reportErrors(async () => {
				const removed = await fonts.remove();
				const activeFont = services.config.font()?.id;
				if (activeFont && removed.includes(activeFont)) {
					await services.config.set("fonts.enabled", false);
					if ((await services.store.read()).enabled)
						await vscode.commands.executeCommand("stylesmith.enable");
				}
				gallery.refresh();
			})
		),
		gallery,
		vscode.commands.registerCommand("stylesmith.presetGallery", () => gallery.show()),
		vscode.commands.registerCommand("stylesmith.bootSequence", () => {
			showBootSequence();
		}),
		vscode.commands.registerCommand("stylesmith.digitalRain", () => {
			showDigitalRain();
		}),
		lens,
		new UndoHighlight(() => services.config.undoHighlight()),
		new PasteHighlight(() => services.config.pasteHighlight()),
		new FailSignal(() => services.config.failSignal()),
		new DoneSignal(() => services.config.doneSignal()),
		new SaveReceipt(
			() => services.config.saveReceipt(),
			(document, line) => lens.showsMessageOn(document, line)
		),
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

	void reportErrors(async () => status.show(await checkAfterStartup(services)));
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
