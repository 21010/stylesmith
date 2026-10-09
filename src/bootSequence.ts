/**
 * Stylesmith: Boot Sequence (#82): a short boot log typed out in a terminal tab, only when the
 * user runs the command. The log matches the preset of the active color theme. It types over
 * about two seconds, or appears at once with reduced motion (workbench.reduceMotion "on"),
 * then any key closes the tab. Nothing runs once it's closed.
 */

import * as vscode from "vscode";
import { PROMPT, bootLogFor, bootSchedule, renderBootLine } from "./boot";
import { reducesMotion } from "./motion";
import { PRESETS } from "./presets";

const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

class BootTerminal implements vscode.Pseudoterminal {
	private readonly write = new vscode.EventEmitter<string>();
	private readonly closed = new vscode.EventEmitter<void>();
	readonly onDidWrite = this.write.event;
	readonly onDidClose = this.closed.event;
	private readonly timers: ReturnType<typeof setTimeout>[] = [];
	private done = false;

	open(size: vscode.TerminalDimensions | undefined): void {
		const log = bootLogFor(
			vscode.workspace.getConfiguration("workbench").get("colorTheme"),
			PRESETS
		);
		const reduced = reducesMotion(
			vscode.workspace.getConfiguration("workbench").get("reduceMotion")
		);
		const columns = size?.columns ?? 80;
		const parts = [
			...log.lines.map((line, i) => renderBootLine(line, i === 0, log.color, columns)),
			`\r\n\x1b[2m${PROMPT}\x1b[0m`
		];
		const times = bootSchedule(log.lines.length, reduced);
		if (reduced) {
			this.write.fire(HIDE_CURSOR + parts.join(""));
			return;
		}
		this.write.fire(HIDE_CURSOR);
		parts.forEach((part, i) => {
			this.timers.push(setTimeout(() => this.write.fire(part), times[i]));
		});
	}

	/** Any key closes it. */
	handleInput(): void {
		this.closed.fire();
		this.close();
	}

	/** Stops everything; VS Code may call it again after a key closed the tab. */
	close(): void {
		if (this.done) return;
		this.done = true;
		for (const timer of this.timers) clearTimeout(timer);
		this.write.fire(SHOW_CURSOR);
		this.write.dispose();
		this.closed.dispose();
	}
}

/** Opens the boot log in a new terminal tab in the editor area. */
export function showBootSequence(): vscode.Terminal {
	const terminal = vscode.window.createTerminal({
		name: "Boot Sequence",
		pty: new BootTerminal(),
		location: vscode.TerminalLocation.Editor
	});
	terminal.show();
	return terminal;
}
