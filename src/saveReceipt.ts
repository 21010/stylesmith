/**
 * After a manual save, a brief note at the end of the cursor's line, like a terminal log:
 * "▸ saved 14:02:11" (stylesmith.saveReceipt, off by default). It disappears after two
 * seconds. Auto-saves get none, and a Problem Lens message on the line wins.
 * Uses VS Code's decoration API and the stylesmith.saveReceiptForeground theme color.
 */

import * as vscode from "vscode";
import {
	SAVE_RECEIPT_DURATION,
	saveReceiptText,
	showsSaveReceipt,
	type SaveReason
} from "./problems";

const REASONS: Record<vscode.TextDocumentSaveReason, SaveReason> = {
	[vscode.TextDocumentSaveReason.Manual]: "manual",
	[vscode.TextDocumentSaveReason.AfterDelay]: "afterDelay",
	[vscode.TextDocumentSaveReason.FocusOut]: "focusOut"
};

export class SaveReceipt implements vscode.Disposable {
	private readonly type = vscode.window.createTextEditorDecorationType({
		after: {
			margin: "0 0 0 3ch",
			color: new vscode.ThemeColor("stylesmith.saveReceiptForeground"),
			fontStyle: "normal"
		}
	});
	/** Documents being saved by hand: the receipt shows once the save has worked. */
	private readonly manual = new Set<vscode.TextDocument>();
	private readonly timers = new Map<vscode.TextEditor, ReturnType<typeof setTimeout>>();
	private readonly lines = new Map<vscode.TextEditor, number>();
	private readonly listeners: vscode.Disposable[];

	constructor(
		private readonly enabled: () => boolean,
		/** Whether Problem Lens shows a message on this line. */
		private readonly problemMessageOn: (document: vscode.TextDocument, line: number) => boolean
	) {
		this.listeners = [
			vscode.workspace.onWillSaveTextDocument(event => {
				if (this.enabled() && REASONS[event.reason] === "manual")
					this.manual.add(event.document);
			}),
			vscode.workspace.onDidSaveTextDocument(document => {
				if (this.manual.delete(document)) this.saved(document);
			}),
			vscode.workspace.onDidChangeTextDocument(event => {
				if (event.contentChanges.length > 0) this.clearForDocument(event.document);
			}),
			vscode.languages.onDidChangeDiagnostics(() => {
				for (const [editor, line] of this.lines) {
					if (this.problemMessageOn(editor.document, line)) this.clearEditor(editor);
				}
			}),
			vscode.workspace.onDidChangeConfiguration(event => {
				if (event.affectsConfiguration("stylesmith.saveReceipt") && !this.enabled())
					this.clearAll();
			})
		];
	}

	dispose(): void {
		for (const timer of this.timers.values()) clearTimeout(timer);
		for (const listener of this.listeners) listener.dispose();
		this.type.dispose();
	}

	private clearEditor(editor: vscode.TextEditor): void {
		clearTimeout(this.timers.get(editor));
		editor.setDecorations(this.type, []);
		this.timers.delete(editor);
		this.lines.delete(editor);
	}

	private clearAll(): void {
		for (const editor of [...this.timers.keys()]) this.clearEditor(editor);
	}

	private clearForDocument(document: vscode.TextDocument): void {
		for (const [editor] of this.timers) {
			if (editor.document === document) this.clearEditor(editor);
		}
	}

	private saved(document: vscode.TextDocument): void {
		const editor = vscode.window.activeTextEditor;
		if (editor?.document !== document) return;
		const line = editor.selection.active.line;
		if (!showsSaveReceipt("manual", this.problemMessageOn(document, line))) return;
		const end = document.lineAt(line).range.end;
		editor.setDecorations(this.type, [
			{
				range: new vscode.Range(end, end),
				renderOptions: {
					after: { contentText: saveReceiptText(new Date(), vscode.env.language) }
				}
			}
		]);
		clearTimeout(this.timers.get(editor));
		this.lines.set(editor, line);
		this.timers.set(
			editor,
			setTimeout(() => this.clearEditor(editor), SAVE_RECEIPT_DURATION)
		);
	}
}
