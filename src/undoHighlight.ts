/**
 * Briefly tints the lines an undo changed, so it's clear what came back
 * (stylesmith.undoHighlight, off by default). One tint, then it's removed: it never repeats.
 * Uses VS Code's decoration API and the stylesmith.undoHighlightBackground theme color.
 */

import * as vscode from "vscode";
import { changedLines } from "./problems";

/** How long the tint shows (ms). */
const DURATION = 600;

export class UndoHighlight implements vscode.Disposable {
	private readonly type = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor: new vscode.ThemeColor("stylesmith.undoHighlightBackground")
	});
	private readonly timers = new Map<vscode.TextEditor, ReturnType<typeof setTimeout>>();
	private readonly listeners: vscode.Disposable[];

	constructor(private readonly enabled: () => boolean) {
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
				if (event.affectsConfiguration("stylesmith.undoHighlight") && !this.enabled()) {
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
		if (event.reason !== vscode.TextDocumentChangeReason.Undo || !this.enabled()) {
			this.clearDocument(event.document);
			return;
		}
		const lines = changedLines(
			event.contentChanges.map(change => ({
				line: change.range.start.line,
				text: change.text
			}))
		).filter(line => line < event.document.lineCount);
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
