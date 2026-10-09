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
			})
		];
	}

	dispose(): void {
		for (const timer of this.timers.values()) clearTimeout(timer);
		for (const listener of this.listeners) listener.dispose();
		this.type.dispose();
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
		this.timers.set(
			editor,
			setTimeout(() => {
				editor.setDecorations(this.type, []);
				this.timers.delete(editor);
			}, SAVE_RECEIPT_DURATION)
		);
	}
}
