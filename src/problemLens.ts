import * as vscode from "vscode";
import {
	LINE_TINT,
	SEVERITIES,
	documentProblems,
	lineDecorations,
	statusItem,
	type LineProblem,
	type ProblemLensOptions,
	type Severity,
	type ThemeKind
} from "./problems";

/**
 * The Problem Lens: errors and warnings shown right on their line, like "Error Lens" but in
 * Stylesmith's style. It uses VS Code's own decoration API, so it updates live and works even
 * without running Stylesmith: Enable. Lines get a soft tint, a pixel icon in the gutter and a
 * terminal-style message at the end; the status bar shows the problem on the cursor's line.
 */

const COLOR: Record<Severity, string> = { error: "Error", warning: "Warning", info: "Info" };
const STATUS_ICON: Record<Severity, string> = {
	error: "$(error)",
	warning: "$(warning)",
	info: "$(info)"
};
const UPDATE_DELAY = 150; // ms; problems change quickly while typing

/**
 * Keeps the decorations and the status bar item in step with VS Code's diagnostics. What to
 * show is decided in problems.ts; this class only applies it through VS Code's API. Dispose
 * it to remove everything it added.
 */
export class ProblemLens implements vscode.Disposable {
	private types = new Map<Severity, vscode.TextEditorDecorationType>();
	private readonly status: vscode.StatusBarItem;
	private readonly disposables: vscode.Disposable[] = [];
	private timer: ReturnType<typeof setTimeout> | undefined;
	private options: ProblemLensOptions;

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly readOptions: () => ProblemLensOptions
	) {
		this.options = readOptions();
		// Priority 100.55 puts it right next to "Ln 12, Col 5" (100.5).
		this.status = vscode.window.createStatusBarItem(
			"stylesmith.problem",
			vscode.StatusBarAlignment.Right,
			100.55
		);
		this.status.name = "Stylesmith: problem on this line";
		this.status.command = "workbench.actions.view.problems";

		this.createTypes();
		this.disposables.push(
			this.status,
			vscode.languages.onDidChangeDiagnostics(event => {
				const visible = new Set(
					vscode.window.visibleTextEditors.map(e => e.document.uri.toString())
				);
				if (event.uris.some(uri => visible.has(uri.toString()))) this.schedule();
			}),
			vscode.window.onDidChangeVisibleTextEditors(() => this.schedule()),
			vscode.window.onDidChangeTextEditorSelection(event => {
				if (event.textEditor === vscode.window.activeTextEditor) this.updateStatus();
			}),
			vscode.window.onDidChangeActiveTextEditor(() => this.updateStatus()),
			vscode.window.onDidChangeActiveColorTheme(() => {
				this.createTypes();
				this.update();
			}),
			vscode.workspace.onDidChangeConfiguration(event => {
				if (!event.affectsConfiguration("stylesmith.problems")) return;
				this.options = this.readOptions();
				this.createTypes();
				this.update();
			})
		);
		this.update();
	}

	dispose(): void {
		clearTimeout(this.timer);
		for (const type of this.types.values()) type.dispose();
		for (const disposable of this.disposables) disposable.dispose();
	}

	private schedule(): void {
		clearTimeout(this.timer);
		this.timer = setTimeout(() => this.update(), UPDATE_DELAY);
	}

	/** One decoration type per severity, styled for the current theme. */
	private createTypes(): void {
		for (const type of this.types.values()) type.dispose();
		this.types.clear();
		const tint = LINE_TINT[themeKind()];
		for (const severity of SEVERITIES) {
			const color = COLOR[severity];
			const icon = (kind: "dark" | "light") =>
				this.options.gutterIcons
					? {
							gutterIconPath: this.context.asAbsolutePath(
								`icons/problems/${severity}-${kind}.svg`
							)
						}
					: {};
			this.types.set(
				severity,
				vscode.window.createTextEditorDecorationType({
					isWholeLine: true,
					backgroundColor:
						tint > 0
							? `color-mix(in srgb, var(--vscode-editor${color}-foreground) ${tint}%, transparent)`
							: undefined,
					gutterIconSize: "contain",
					overviewRulerColor: new vscode.ThemeColor(
						`editorOverviewRuler.${severity}Foreground`
					),
					overviewRulerLane: vscode.OverviewRulerLane.Right,
					after: {
						margin: "0 0 0 3ch",
						color: new vscode.ThemeColor(`editor${color}.foreground`),
						fontStyle: "normal"
					},
					dark: icon("dark"),
					light: icon("light")
				})
			);
		}
	}

	private update(): void {
		for (const editor of vscode.window.visibleTextEditors) this.decorate(editor);
		this.updateStatus();
	}

	private decorate(editor: vscode.TextEditor): void {
		const document = editor.document;
		const lines = lineDecorations(this.problems(document), this.options);
		for (const severity of SEVERITIES) {
			const options = lines[severity].map(({ line, text }): vscode.DecorationOptions => ({
				range: document.lineAt(line).range,
				renderOptions: text === undefined ? undefined : { after: { contentText: text } }
			}));
			editor.setDecorations(this.types.get(severity)!, options);
		}
	}

	private updateStatus(): void {
		const editor = vscode.window.activeTextEditor;
		const line = editor?.selection.active.line ?? -1;
		// Only the cursor's line: also past the cap on decorated lines in huge files.
		const item = editor
			? statusItem(this.problems(editor.document, line), line, this.options)
			: undefined;
		if (!item) {
			this.status.hide();
			return;
		}
		this.status.text = `${STATUS_ICON[item.severity]} ${item.text}`;
		this.status.tooltip = `${item.label}
Click to open the Problems panel.`;
		this.status.accessibilityInformation = { label: item.label };
		this.status.backgroundColor =
			item.severity === "error"
				? new vscode.ThemeColor("statusBarItem.errorBackground")
				: item.severity === "warning"
					? new vscode.ThemeColor("statusBarItem.warningBackground")
					: undefined;
		this.status.show();
	}

	/** The document's problems; only those on `onLine` if given. */
	private problems(document: vscode.TextDocument, onLine?: number): LineProblem[] {
		const diagnostics = vscode.languages
			.getDiagnostics(document.uri)
			.filter(d => onLine === undefined || d.range.start.line === onLine)
			.map(d => ({ line: d.range.start.line, severity: d.severity, message: d.message }));
		return documentProblems(diagnostics, document.lineCount, this.options.minimumSeverity);
	}
}

function themeKind(): ThemeKind {
	switch (vscode.window.activeColorTheme.kind) {
		case vscode.ColorThemeKind.Light:
			return "light";
		case vscode.ColorThemeKind.HighContrast:
			return "hc-dark";
		case vscode.ColorThemeKind.HighContrastLight:
			return "hc-light";
		default:
			return "dark";
	}
}
