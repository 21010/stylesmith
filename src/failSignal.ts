/**
 * The failed-command signal (stylesmith.terminal.failSignal, off by default, #70): when a
 * command in the integrated terminal fails, the status bar shows its exit code for a moment, on
 * the error background, like the error signal. It needs VS Code's shell integration, which
 * reports how each command ended; without it, the signal stays silent.
 */

import * as vscode from "vscode";
import {
	ERROR_SIGNAL_DURATION,
	SignalCooldown,
	claimSignalSlot,
	commandFailed,
	commandFailedLabel
} from "./problems";

export class FailSignal implements vscode.Disposable {
	private readonly item: vscode.StatusBarItem;
	private readonly cooldown = new SignalCooldown();
	private readonly listeners: vscode.Disposable[];
	private timer: ReturnType<typeof setTimeout> | undefined;

	constructor(private readonly enabled: () => boolean) {
		// Next to the error signal (100.6).
		this.item = vscode.window.createStatusBarItem(
			"stylesmith.failSignal",
			vscode.StatusBarAlignment.Right,
			100.65
		);
		this.item.name = "Stylesmith: a command failed";
		this.item.command = "workbench.action.terminal.focus";
		this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
		this.listeners = [
			vscode.window.onDidEndTerminalShellExecution(event => this.ended(event.exitCode)),
			vscode.workspace.onDidChangeConfiguration(event => {
				if (
					event.affectsConfiguration("stylesmith.terminal.failSignal") &&
					!this.enabled()
				) {
					clearTimeout(this.timer);
					this.item.hide();
				}
			})
		];
	}

	dispose(): void {
		clearTimeout(this.timer);
		for (const listener of this.listeners) listener.dispose();
		this.item.dispose();
	}

	private ended(exitCode: number | undefined): void {
		if (!this.enabled() || !commandFailed(exitCode) || !this.cooldown.ready(Date.now())) return;
		claimSignalSlot(() => {
			clearTimeout(this.timer);
			this.item.hide();
		});
		const label = commandFailedLabel(exitCode!);
		this.item.text = `$(terminal) exit ${exitCode}`;
		this.item.tooltip = `${label}. Click to open the terminal.`;
		this.item.accessibilityInformation = { label };
		this.item.show();
		clearTimeout(this.timer);
		this.timer = setTimeout(() => this.item.hide(), ERROR_SIGNAL_DURATION);
	}
}
