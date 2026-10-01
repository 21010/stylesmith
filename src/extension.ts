import * as path from "node:path";
import * as vscode from "vscode";
import { vscodeConfig, vscodeSettings } from "./config";
import { checkAfterStartup, disable, enable, type Services } from "./lifecycle";
import { ManagedSettings } from "./managed";
import { applyPreset, createStatusButton, showMenu } from "./menu";
import { messages } from "./messages";
import { ProblemLens } from "./problemLens";
import { StateFile } from "./store";
import { isPermissionError } from "./workbench";

/**
 * Stylesmith's entry point: it only connects the parts. Changing VS Code lives in
 * lifecycle.ts, the menu in menu.ts, settings in config.ts and managed.ts.
 */

// Where Stylesmith versions up to 1.9 kept their state in VS Code's globalState. It's read
// once, to move it into the state file (see store.ts for why).
const LEGACY_STATE_KEYS = {
	fontSettings: "stylesmith.fontSettings",
	effectSettings: "stylesmith.effectSettings",
	enabled: "stylesmith.enabled",
	reapplyAskedAt: "stylesmith.reapplyAskedAt"
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
		store,
		asAbsolutePath: relativePath => context.asAbsolutePath(relativePath)
	};

	// Commands that change VS Code's files run one at a time, through this queue.
	let queue = Promise.resolve();
	const queued = (command: string, task: () => Promise<void>) =>
		vscode.commands.registerCommand(command, () => {
			queue = queue.then(() => reportErrors(task));
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

	context.subscriptions.push(
		// Enabling always starts from the pristine file, so it doubles as "reload".
		queued("stylesmith.enable", async () => status.show(await enable(services))),
		queued("stylesmith.reload", async () => status.show(await enable(services))),
		queued("stylesmith.disable", async () => {
			await disable(services);
			status.show(false);
		}),
		direct("stylesmith.applyPreset", id => applyPreset(services.config, id)),
		direct("stylesmith.menu", () => showMenu(services.config)),
		// Live, through VS Code's API: it needs no Enable and no restart.
		new ProblemLens(context, () => services.config.problemLens())
	);

	void reportErrors(() => checkAfterStartup(services, status));
}

export function deactivate(): void {}

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
