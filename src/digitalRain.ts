/**
 * Stylesmith: Digital Rain (#83): characters falling down a terminal tab, only when the user
 * runs the command. Uses an extension terminal (Pseudoterminal), so it's drawn with the
 * terminal's own colors. It draws only while its tab is the active terminal in a focused
 * window, closes on any key, and nothing runs once the tab is closed. With reduced motion
 * (workbench.reduceMotion "on") it shows one still frame.
 */

import * as vscode from "vscode";
import { CLEAR, EffectTerminal, HIDE_CURSOR } from "./bootSequence";
import { FRAME_MS, Rain, render, stillFrame } from "./rain";

class RainTerminal extends EffectTerminal {
	terminal: vscode.Terminal | undefined;
	private rain: Rain | undefined;
	private size: vscode.TerminalDimensions | undefined;
	private timer: ReturnType<typeof setInterval> | undefined;

	open(size: vscode.TerminalDimensions | undefined): void {
		this.size = size;
		this.listeners.push(
			vscode.window.onDidChangeActiveTerminal(() => this.updateRunning()),
			vscode.window.onDidChangeWindowState(() => this.updateRunning())
		);
		this.watchReducedMotion(reduced => {
			if (reduced) {
				this.stop();
				this.drawStill();
			} else {
				this.restart();
			}
		});
		if (this.reduced) {
			this.drawStill();
			return;
		}
		this.restart();
	}

	setDimensions(size: vscode.TerminalDimensions): void {
		this.size = size;
		if (this.reduced) this.drawStill();
		else this.restart();
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

	protected override stop(): void {
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

let currentTerminal: vscode.Terminal | undefined;

/** Opens the rain in a new terminal tab in the editor area, replacing any previous one (#226, #246). */
export function showDigitalRain(): vscode.Terminal {
	currentTerminal?.dispose();
	const pty = new RainTerminal(() => {
		if (currentTerminal === terminal) currentTerminal = undefined;
	});
	const terminal = vscode.window.createTerminal({
		name: "Digital Rain",
		pty,
		location: vscode.TerminalLocation.Editor
	});
	currentTerminal = terminal;
	pty.terminal = terminal;
	terminal.show();
	return terminal;
}
