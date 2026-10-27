/**
 * Briefly tints the lines an undo changed, so it's clear what came back
 * (stylesmith.undoHighlight, off by default). One tint, then it's removed: it never repeats.
 * Uses VS Code's decoration API and the stylesmith.undoHighlightBackground theme color.
 */

import * as vscode from "vscode";
import { changedLines } from "./problems";

/** How long the tint shows (ms). */
const DURATION = 600;

/**
 * Shared whole-line temporary highlight decoration for editor changes (#249), used by
 * UndoHighlight and PasteHighlight.
 */
export class LineHighlight implements vscode.Disposable {
	private readonly type: vscode.TextEditorDecorationType;
	private readonly timers = new Map<vscode.TextEditor, ReturnType<typeof setTimeout>>();
	private readonly listeners: vscode.Disposable[];

	constructor(
		private readonly setting: string,
		themeColor: string,
		private readonly enabled: () => boolean,
		private readonly linesForChange: (event: vscode.TextDocumentChangeEvent) => number[]
	) {
		this.type = vscode.window.createTextEditorDecorationType({
			isWholeLine: true,
			backgroundColor: new vscode.ThemeColor(themeColor)
		});
		this.listeners = [
			vscode.workspace.onDidChangeTextDocument(event => this.changed(event)),
			vscode.window.onDidChangeVisibleTextEditors(editors => {
				const visible = new Set(editors);
				for (const [editor, timer] of this.timers) {
					if (!visible.has(editor)) {
						clearTimeout(timer);
						this.timers.delete(editor);
					}
				}
			}),
			vscode.workspace.onDidChangeConfiguration(event => {
				if (event.affectsConfiguration(this.setting) && !this.enabled()) {
					for (const [editor, timer] of this.timers) {
						clearTimeout(timer);
						editor.setDecorations(this.type, []);
					}
					this.timers.clear();
				}
			})
		];
	}

	dispose(): void {
		for (const timer of this.timers.values()) clearTimeout(timer);
		for (const listener of this.listeners) listener.dispose();
		this.type.dispose();
	}

	private clearDocument(document: vscode.TextDocument): void {
		for (const [editor, timer] of this.timers) {
			if (editor.document !== document) continue;
			clearTimeout(timer);
			this.timers.delete(editor);
			editor.setDecorations(this.type, []);
		}
	}

	private changed(event: vscode.TextDocumentChangeEvent): void {
		if (event.contentChanges.length === 0) return;
		if (!this.enabled()) {
			this.clearDocument(event.document);
			return;
		}
		const lines = this.linesForChange(event).filter(line => line < event.document.lineCount);
		if (lines.length === 0) {
			this.clearDocument(event.document);
			return;
		}
		for (const editor of vscode.window.visibleTextEditors) {
			if (editor.document !== event.document) continue;
			editor.setDecorations(
				this.type,
				lines.map(line => event.document.lineAt(line).range)
			);
			clearTimeout(this.timers.get(editor));
			this.timers.set(
				editor,
				setTimeout(() => {
					editor.setDecorations(this.type, []);
					this.timers.delete(editor);
				}, DURATION)
			);
		}
	}
}

export class UndoHighlight extends LineHighlight {
	constructor(enabled: () => boolean) {
		super("stylesmith.undoHighlight", "stylesmith.undoHighlightBackground", enabled, event =>
			event.reason === vscode.TextDocumentChangeReason.Undo
				? changedLines(
						event.contentChanges.map(change => ({
							line: change.range.start.line,
							text: change.text
						}))
					)
				: []
		);
	}
}
