import * as vscode from "vscode";
import {
	ERROR_SIGNAL_DURATION,
	ErrorSignal,
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
	private types: Record<Severity, vscode.TextEditorDecorationType>;
	private readonly status: vscode.StatusBarItem;
	/** Shows briefly when the number of errors goes up (stylesmith.problems.errorSignal). */
	private readonly signalItem: vscode.StatusBarItem;
	private readonly errorSignal = new ErrorSignal();
	private signalTimer: ReturnType<typeof setTimeout> | undefined;
	private countTimer: ReturnType<typeof setTimeout> | undefined;
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

		this.signalItem = vscode.window.createStatusBarItem(
			"stylesmith.errorSignal",
			vscode.StatusBarAlignment.Right,
			100.6
		);
		this.signalItem.name = "Stylesmith: errors went up";
		this.signalItem.command = "workbench.actions.view.problems";
		this.signalItem.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");

		this.types = this.createTypes();
		this.disposables.push(
			this.status,
			this.signalItem,
			vscode.languages.onDidChangeDiagnostics(() => this.scheduleCount()),
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
				this.replaceTypes();
				this.update();
			}),
			vscode.workspace.onDidChangeConfiguration(event => {
				if (!event.affectsConfiguration("stylesmith.problems")) return;
				this.options = this.readOptions();
				this.replaceTypes();
				this.update();
			})
		);
		this.update();
	}

	dispose(): void {
		clearTimeout(this.timer);
		clearTimeout(this.signalTimer);
		clearTimeout(this.countTimer);
		this.disposeTypes();
		for (const disposable of this.disposables) disposable.dispose();
	}

	/** Counts the errors in all files, once diagnostics settle, and signals an increase. */
	private scheduleCount(): void {
		clearTimeout(this.countTimer);
		this.countTimer = setTimeout(() => {
			const errors = vscode.languages
				.getDiagnostics()
				.reduce(
					(sum, [, diagnostics]) =>
						sum +
						diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error)
							.length,
					0
				);
			// Counted even while the signal is off, so turning it on doesn't signal at once.
			const signal = this.errorSignal.next(errors, Date.now());
			if (!signal || !this.options.enabled || !this.options.errorSignal) return;
			const label = `Errors went up to ${errors}`;
			this.signalItem.text = `$(error) ${errors}`;
			this.signalItem.tooltip = `${label}. Click to open the Problems panel.`;
			this.signalItem.accessibilityInformation = { label };
			this.signalItem.show();
			clearTimeout(this.signalTimer);
			this.signalTimer = setTimeout(() => this.signalItem.hide(), ERROR_SIGNAL_DURATION);
		}, UPDATE_DELAY);
	}

	private schedule(): void {
		clearTimeout(this.timer);
		this.timer = setTimeout(() => this.update(), UPDATE_DELAY);
	}

	/** Replaces the decoration types, after the theme or the settings changed. */
	private replaceTypes(): void {
		this.disposeTypes();
		this.types = this.createTypes();
	}

	private disposeTypes(): void {
		for (const type of Object.values(this.types)) type.dispose();
	}

	/** One decoration type per severity, styled for the current theme. */
	private createTypes(): Record<Severity, vscode.TextEditorDecorationType> {
		const tint = LINE_TINT[themeKind()];
		const create = (severity: Severity) => {
			const color = COLOR[severity];
			const icon = (kind: "dark" | "light") =>
				this.options.gutterIcons
					? {
							gutterIconPath: this.context.asAbsolutePath(
								`icons/problems/${severity}-${kind}.svg`
							)
						}
					: {};
			return vscode.window.createTextEditorDecorationType({
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
			});
		};
		return { error: create("error"), warning: create("warning"), info: create("info") };
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
			editor.setDecorations(this.types[severity], options);
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
