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
import { activeColorTheme } from "./problemLens";
import { DEFAULT_BOOT_LOG, type BootLog } from "./stories";

const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR = "\x1b[0m\x1b[2J\x1b[H";

class BootTerminal implements vscode.Pseudoterminal {
	private readonly write = new vscode.EventEmitter<string>();
	private readonly closed = new vscode.EventEmitter<void>();
	readonly onDidWrite = this.write.event;
	readonly onDidClose = this.closed.event;
	private readonly timers: ReturnType<typeof setTimeout>[] = [];
	private readonly listeners: vscode.Disposable[] = [];
	private log: BootLog = DEFAULT_BOOT_LOG;
	private columns = 80;
	private reduced = false;
	private done = false;

	constructor(private readonly onClosed?: () => void) {}

	open(size: vscode.TerminalDimensions | undefined): void {
		if (size) this.columns = size.columns;
		this.log = bootLogFor(activeColorTheme(), PRESETS);
		this.reduced = reducesMotion(
			vscode.workspace.getConfiguration("workbench").get("reduceMotion")
		);
		this.listeners.push(
			vscode.workspace.onDidChangeConfiguration(event => {
				if (!event.affectsConfiguration("workbench.reduceMotion") || this.done) return;
				this.reduced = reducesMotion(
					vscode.workspace.getConfiguration("workbench").get("reduceMotion")
				);
				if (this.reduced) {
					for (const timer of this.timers) clearTimeout(timer);
					this.timers.length = 0;
					this.drawAll(true);
				}
			})
		);
		if (this.reduced) {
			this.drawAll(false);
			return;
		}
		const times = bootSchedule(this.log.lines.length, false);
		this.write.fire(HIDE_CURSOR);
		this.log.lines.forEach((line, i) => {
			this.timers.push(
				setTimeout(
					() =>
						this.write.fire(
							renderBootLine(line, i === 0, this.log.color, this.columns)
						),
					times[i]
				)
			);
		});
		this.timers.push(
			setTimeout(
				() => this.write.fire(`\r\n\x1b[2m${PROMPT}\x1b[0m`),
				times[this.log.lines.length]
			)
		);
	}

	setDimensions(size: vscode.TerminalDimensions): void {
		this.columns = size.columns;
		if (this.reduced && !this.done) this.drawAll(true);
	}

	private drawAll(clear: boolean): void {
		const parts = [
			...this.log.lines.map((line, i) =>
				renderBootLine(line, i === 0, this.log.color, this.columns)
			),
			`\r\n\x1b[2m${PROMPT}\x1b[0m`
		];
		this.write.fire((clear ? CLEAR : "") + HIDE_CURSOR + parts.join(""));
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
		for (const listener of this.listeners) listener.dispose();
		this.onClosed?.();
		this.write.fire(SHOW_CURSOR);
		this.write.dispose();
		this.closed.dispose();
	}
}

let currentTerminal: vscode.Terminal | undefined;

/** Opens the boot log in a new terminal tab in the editor area, replacing any previous one (#226, #246). */
export function showBootSequence(): vscode.Terminal {
	currentTerminal?.dispose();
	const pty = new BootTerminal(() => {
		if (currentTerminal === terminal) currentTerminal = undefined;
	});
	const terminal = vscode.window.createTerminal({
		name: "Boot Sequence",
		pty,
		location: vscode.TerminalLocation.Editor
	});
	currentTerminal = terminal;
	terminal.show();
	return terminal;
}
