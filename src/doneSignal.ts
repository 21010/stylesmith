/**
 * The long-command done signal (stylesmith.terminal.doneSignal, off by default): when a command
 * in the integrated terminal finishes with exit code 0 after at least 10 seconds, the status bar
 * shows how long it took for a moment. Needs VS Code's shell integration.
 */

import * as vscode from "vscode";
import {
	ERROR_SIGNAL_DURATION,
	SignalCooldown,
	claimSignalSlot,
	commandDone,
	commandDoneLabel,
	formatDuration
} from "./problems";

export class DoneSignal implements vscode.Disposable {
	private readonly item: vscode.StatusBarItem;
	private readonly cooldown = new SignalCooldown();
	private readonly started = new Map<unknown, { start: number; terminal?: unknown }>();
	private readonly listeners: vscode.Disposable[];
	private timer: ReturnType<typeof setTimeout> | undefined;

	constructor(private readonly enabled: () => boolean) {
		// Next to the fail signal (100.65).
		this.item = vscode.window.createStatusBarItem(
			"stylesmith.doneSignal",
			vscode.StatusBarAlignment.Right,
			100.64
		);
		this.item.name = "Stylesmith: a long command finished";
		this.item.command = "workbench.action.terminal.focus";
		this.listeners = [
			vscode.window.onDidStartTerminalShellExecution(event => {
				this.started.set(event.execution, {
					start: Date.now(),
					terminal: event.terminal
				});
			}),
			vscode.window.onDidEndTerminalShellExecution(event => {
				const entry = this.started.get(event.execution);
				this.started.delete(event.execution);
				if (entry !== undefined) this.ended(event.exitCode, Date.now() - entry.start);
			}),
			...(typeof vscode.window.onDidCloseTerminal === "function"
				? [
						vscode.window.onDidCloseTerminal(closed => {
							for (const [execution, entry] of this.started) {
								if (entry.terminal === closed) this.started.delete(execution);
							}
						})
					]
				: []),
			vscode.workspace.onDidChangeConfiguration(event => {
				if (
					event.affectsConfiguration("stylesmith.terminal.doneSignal") &&
					!this.enabled()
				) {
					clearTimeout(this.timer);
					this.item.hide();
					this.started.clear();
				}
			})
		];
	}

	dispose(): void {
		clearTimeout(this.timer);
		for (const listener of this.listeners) listener.dispose();
		this.item.dispose();
	}

	private ended(exitCode: number | undefined, durationMs: number): void {
		if (
			!this.enabled() ||
			!commandDone(exitCode, durationMs) ||
			!this.cooldown.ready(Date.now())
		)
			return;
		claimSignalSlot(() => {
			clearTimeout(this.timer);
			this.item.hide();
		});
		const label = commandDoneLabel(durationMs);
		this.item.text = `$(check) done ${formatDuration(durationMs)}`;
		this.item.tooltip = `${label}. Click to open the terminal.`;
		this.item.accessibilityInformation = { label };
		this.item.show();
		clearTimeout(this.timer);
		this.timer = setTimeout(() => this.item.hide(), ERROR_SIGNAL_DURATION);
	}
}
