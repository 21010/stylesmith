/**
 * Briefly tints the lines a multi-line paste added, so it's clear what landed and where
 * (stylesmith.pasteHighlight, off by default). One tint, then it's removed: it never repeats.
 * Uses VS Code's decoration API and the stylesmith.pasteHighlightBackground theme color.
 */

import * as vscode from "vscode";
import { pastedLines } from "./problems";

/** How long the tint shows (ms). */
const DURATION = 600;

export class PasteHighlight implements vscode.Disposable {
	private readonly type = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		backgroundColor: new vscode.ThemeColor("stylesmith.pasteHighlightBackground")
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
				if (event.affectsConfiguration("stylesmith.pasteHighlight") && !this.enabled()) {
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
		const reason =
			event.reason === vscode.TextDocumentChangeReason.Undo
				? "undo"
				: event.reason === vscode.TextDocumentChangeReason.Redo
					? "redo"
					: undefined;
		const lines = pastedLines(
			event.contentChanges.map(change => ({
				line: change.range.start.line,
				text: change.text
			})),
			reason
		).filter(line => line < event.document.lineCount);
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
