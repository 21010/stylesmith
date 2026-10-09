/**
 * Stylesmith: Digital Rain (#83): characters falling down a terminal tab, only when the user
 * runs the command. Uses an extension terminal (Pseudoterminal), so it's drawn with the
 * terminal's own colors. It draws only while its tab is the active terminal in a focused
 * window, closes on any key, and nothing runs once the tab is closed. With reduced motion
 * (workbench.reduceMotion "on") it shows one still frame.
 */

import * as vscode from "vscode";
import { reducesMotion } from "./motion";
import { FRAME_MS, Rain, render, stillFrame } from "./rain";

const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CLEAR = "\x1b[0m\x1b[2J\x1b[H";

class RainTerminal implements vscode.Pseudoterminal {
	private readonly write = new vscode.EventEmitter<string>();
	private readonly closed = new vscode.EventEmitter<void>();
	readonly onDidWrite = this.write.event;
	readonly onDidClose = this.closed.event;

	terminal: vscode.Terminal | undefined;
	private rain: Rain | undefined;
	private size: vscode.TerminalDimensions | undefined;
	private timer: ReturnType<typeof setInterval> | undefined;
	private readonly listeners: vscode.Disposable[] = [];
	private done = false;
	private readonly still = reducesMotion(
		vscode.workspace.getConfiguration("workbench").get("reduceMotion")
	);

	open(size: vscode.TerminalDimensions | undefined): void {
		this.size = size;
		if (this.still) {
			this.drawStill();
			return;
		}
		this.listeners.push(
			vscode.window.onDidChangeActiveTerminal(() => this.updateRunning()),
			vscode.window.onDidChangeWindowState(() => this.updateRunning())
		);
		this.restart();
	}

	setDimensions(size: vscode.TerminalDimensions): void {
		this.size = size;
		if (this.still) this.drawStill();
		else this.restart();
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
		this.stop();
		for (const listener of this.listeners) listener.dispose();
		this.write.fire(SHOW_CURSOR);
		this.write.dispose();
		this.closed.dispose();
	}

	private restart(): void {
		if (!this.size) return;
		this.rain = new Rain(this.size.columns, this.size.rows);
		this.write.fire(HIDE_CURSOR + CLEAR);
		this.updateRunning();
	}

	/** Draws only while this is the active terminal in a focused window. */
	private updateRunning(): void {
		const visible =
			vscode.window.state.focused &&
			(this.terminal === undefined || vscode.window.activeTerminal === this.terminal);
		if (visible && this.rain && !this.timer && !this.done) {
			this.timer = setInterval(() => this.write.fire(render(this.rain!.step())), FRAME_MS);
		} else if (!visible) {
			this.stop();
		}
	}

	private stop(): void {
		clearInterval(this.timer);
		this.timer = undefined;
	}

	private drawStill(): void {
		if (!this.size) return;
		const { columns, rows } = this.size;
		const note = "Animation is off: workbench.reduceMotion is on. Press any key to close.";
		this.write.fire(
			HIDE_CURSOR +
				CLEAR +
				render(stillFrame(columns, Math.max(1, rows - 1), Date.now())) +
				`\x1b[${rows};1H\x1b[0m${note.slice(0, columns)}`
		);
	}
}

/** Opens the rain in a new terminal tab in the editor area. */
export function showDigitalRain(): vscode.Terminal {
	const pty = new RainTerminal();
	const terminal = vscode.window.createTerminal({
		name: "Digital Rain",
		pty,
		location: vscode.TerminalLocation.Editor
	});
	pty.terminal = terminal;
	terminal.show();
	return terminal;
}
