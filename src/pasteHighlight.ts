/**
 * Briefly tints the lines a multi-line paste added, so it's clear what landed and where
 * (stylesmith.pasteHighlight, off by default). One tint, then it's removed: it never repeats.
 * Uses VS Code's decoration API and the stylesmith.pasteHighlightBackground theme color.
 */

import * as vscode from "vscode";
import { pastedLines } from "./problems";
import { LineHighlight } from "./undoHighlight";

export class PasteHighlight extends LineHighlight {
	constructor(enabled: () => boolean) {
		super(
			"stylesmith.pasteHighlight",
			"stylesmith.pasteHighlightBackground",
			enabled,
			event => {
				const reason =
					event.reason === vscode.TextDocumentChangeReason.Undo
						? "undo"
						: event.reason === vscode.TextDocumentChangeReason.Redo
							? "redo"
							: undefined;
				return pastedLines(
					event.contentChanges.map(change => ({
						line: change.range.start.line,
						text: change.text
					})),
					reason
				);
			}
		);
	}
}
