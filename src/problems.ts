/**
 * The Problem Lens: errors and warnings shown on the line itself, in Stylesmith's style.
 * This file holds the parts that don't need VS Code, so they can be tested directly.
 *
 * Accessibility: every problem is shown with a shape (the gutter icon) and a word (ERR, WARN,
 * INFO), never by color alone, and the tints are chosen so text stays readable on them.
 */

export type Severity = "error" | "warning" | "info";

export interface Problem {
	/** Zero-based line number. */
	line: number;
	severity: Severity;
	message: string;
}

/** The problem shown on a line: the most severe one, plus how many more the line has. */
export interface LineProblem extends Problem {
	more: number;
}

export type ThemeKind = "dark" | "light" | "hc-dark" | "hc-light";

const RANK: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

const TAGS: Record<Severity, string> = { error: "ERR", warning: "WARN", info: "INFO" };

const WORDS: Record<Severity, string> = { error: "Error", warning: "Warning", info: "Info" };

/**
 * How strongly a problem line is tinted, in percent of the theme's error or warning color.
 * High contrast themes get no tint: their text keeps its full contrast, and the gutter icon
 * and the message mark the line. Stylesmith's tests check every theme against these values.
 */
/** The kind of theme each `uiTheme` in package.json stands for. */
const UI_THEME_KIND: Record<string, ThemeKind> = {
	"vs-dark": "dark",
	vs: "light",
	"hc-black": "hc-dark",
	"hc-light": "hc-light"
};

/**
 * The Stylesmith color theme in use, as its id ("amber" for Stylesmith Amber), so the Problem
 * Lens can draw its gutter icons in that theme's own colors (#106). `label` is the theme the
 * settings name; if it isn't a Stylesmith theme, or VS Code shows a different kind of theme
 * (an automatic switch to light or high contrast), there is none and the generic icons stay.
 */
export function stylesmithTheme(
	label: string | undefined,
	kind: ThemeKind,
	themes: readonly { label: string; uiTheme: string; path: string }[]
): string | undefined {
	const theme = themes.find(t => t.label === label);
	if (!theme || UI_THEME_KIND[theme.uiTheme] !== kind) return undefined;
	return /([^/]+)-color-theme\.json$/.exec(theme.path)?.[1];
}

export const LINE_TINT: Record<ThemeKind, number> = {
	dark: 12,
	light: 8,
	"hc-dark": 0,
	"hc-light": 0
};

/** Lines with problems, at most one per line and `maxLines` in total, in line order. */
export function summarize(
	problems: readonly Problem[],
	minimum: Severity,
	maxLines = 1000
): LineProblem[] {
	const byLine = new Map<number, LineProblem>();
	for (const problem of problems) {
		if (RANK[problem.severity] > RANK[minimum]) continue;
		const shown = byLine.get(problem.line);
		if (!shown) {
			byLine.set(problem.line, { ...problem, more: 0 });
		} else if (RANK[problem.severity] < RANK[shown.severity]) {
			byLine.set(problem.line, { ...problem, more: shown.more + 1 });
		} else {
			shown.more++;
		}
	}
	return [...byLine.values()].sort((a, b) => a.line - b.line).slice(0, maxLines);
}

/** The message shown at the end of the line, like a terminal log: "▸ ERR  message  +2". */
export function inlineText(problem: LineProblem, maxLength = 120): string {
	const more = problem.more > 0 ? `  +${problem.more}` : "";
	return `▸ ${TAGS[problem.severity]}  ${shorten(firstLine(problem.message), maxLength)}${more}`;
}

/**
 * The text of the status bar item, next to the line and column numbers. VS Code draws
 * "$(name)" in status bar text as an icon, and a problem's message can contain text from the
 * file (TypeScript quotes string literals, for example), so it's escaped to show as written.
 */
export function statusText(problem: LineProblem, maxLength = 60): string {
	const more = problem.more > 0 ? ` +${problem.more}` : "";
	const message = shorten(firstLine(problem.message), maxLength).replace(/\$\(/g, "\\$(");
	return `${TAGS[problem.severity]} ${message}${more}`;
}

/** What a screen reader says for the status bar item. */
export function accessibleLabel(problem: LineProblem): string {
	const more = problem.more > 0 ? `, and ${problem.more} more` : "";
	return `${WORDS[problem.severity]} on line ${problem.line + 1}: ${firstLine(problem.message)}${more}`;
}

/**
 * Full tooltip for the status bar item when a line has one or more problems (#178): starts with
 * the screen-reader summary and, when there are additional problems on the same line, lists each
 * one below it.
 */
export function lineTooltip(
	diagnostics: readonly Diagnostic[],
	line: number,
	minimum: Severity,
	summary: string
): string {
	const matching: Problem[] = [];
	for (const { line: dLine, severity, message } of diagnostics) {
		const kind = SEVERITIES[severity];
		if (kind === undefined || dLine !== line || RANK[kind] > RANK[minimum]) continue;
		matching.push({ line: dLine, severity: kind, message });
	}
	if (matching.length <= 1) return summary;
	matching.sort((a, b) => RANK[a.severity] - RANK[b.severity]);
	const details = matching.map(p => `• ${WORDS[p.severity]}: ${firstLine(p.message)}`);
	return [summary, ...details].join("\n");
}

function firstLine(message: string): string {
	return (message.split(/\r?\n/)[0] ?? "").replace(/\s+/g, " ").trim();
}

function shorten(text: string, maxLength: number): string {
	return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;
}

export interface ProblemLensOptions {
	enabled: boolean;
	minimumSeverity: Severity;
	inlineMessages: boolean;
	gutterIcons: boolean;
	statusBar: boolean;
	/** Signal once in the status bar when the number of errors goes up. */
	errorSignal: boolean;
}

export const SEVERITIES: readonly Severity[] = ["error", "warning", "info"];

/** A diagnostic as VS Code reports it; `severity` is vscode.DiagnosticSeverity (0 to 3). */
export interface Diagnostic {
	line: number;
	severity: number;
	message: string;
}

/**
 * The problems to show for a document. Hints (severity 3) are left to VS Code, and a problem
 * past the end of the document (reported for an older version of it) is skipped.
 */
export function documentProblems(
	diagnostics: readonly Diagnostic[],
	lineCount: number,
	minimum: Severity
): LineProblem[] {
	const problems: Problem[] = [];
	for (const { line, severity, message } of diagnostics) {
		const kind = SEVERITIES[severity];
		if (kind === undefined || line < 0 || line >= lineCount) continue;
		problems.push({ line, severity: kind, message });
	}
	return summarize(problems, minimum);
}

/** A line to decorate, with its inline message if inline messages are on. */
export interface LineDecoration {
	line: number;
	text?: string;
}

/**
 * The lines to decorate, per severity. Every severity is always present, so decorations
 * that are no longer needed (when a problem is fixed or the lens is turned off) are cleared.
 */
export function lineDecorations(
	problems: readonly LineProblem[],
	options: ProblemLensOptions
): Record<Severity, LineDecoration[]> {
	const result: Record<Severity, LineDecoration[]> = { error: [], warning: [], info: [] };
	if (!options.enabled) return result;
	for (const problem of problems) {
		result[problem.severity].push({
			line: problem.line,
			text: options.inlineMessages ? inlineText(problem) : undefined
		});
	}
	return result;
}

/** The status bar item for the cursor's line, or undefined to hide it. */
export function statusItem(
	problems: readonly LineProblem[],
	cursorLine: number,
	options: ProblemLensOptions
): { severity: Severity; text: string; label: string } | undefined {
	if (!options.enabled || !options.statusBar) return undefined;
	const problem = problems.find(p => p.line === cursorLine);
	if (!problem) return undefined;
	return {
		severity: problem.severity,
		text: statusText(problem),
		label: accessibleLabel(problem)
	};
}

/** At most one error signal this often (ms): one short signal, never a flashing one. */
export const ERROR_SIGNAL_COOLDOWN = 2000;
/** How long the error signal shows (ms). */
export const ERROR_SIGNAL_DURATION = 1500;

let activeSignalHide: (() => void) | undefined;

/**
 * Hides any other transient status bar signal currently showing (#177), so at most one
 * transient pill (error count, failed command, or finished long command) appears at a time.
 */
export function claimSignalSlot(hide: () => void): void {
	if (activeSignalHide && activeSignalHide !== hide) activeSignalHide();
	activeSignalHide = hide;
}

/**
 * Decides when to signal that the number of errors went up: only on an increase (not when
 * Stylesmith starts, or when errors go down), and at most once per ERROR_SIGNAL_COOLDOWN, so
 * the signal can never flash (WCAG 2.3.1).
 */
export class ErrorSignal {
	private last: number | undefined;
	private shownAt = Number.NEGATIVE_INFINITY;

	/** Records the current number of errors; true if the signal should show now. */
	next(errors: number, now: number): boolean {
		const wentUp = this.last !== undefined && errors > this.last;
		this.last = errors;
		if (!wentUp || now - this.shownAt < ERROR_SIGNAL_COOLDOWN) return false;
		this.shownAt = now;
		return true;
	}
}

/** A text change as VS Code reports it, reduced to what changedLines needs. */
export interface TextChange {
	/** The zero-based line where the change starts. */
	line: number;
	/** The text that replaced the range. */
	text: string;
}

/**
 * The lines an undo changed, to tint them: each change's start line and the lines its new text
 * spans. A change that only deletes text marks the line where the text was. With several changes
 * at once (an undo of a multi-cursor edit) the lines are approximate: later changes can shift
 * earlier ones by a line.
 */
export function changedLines(changes: readonly TextChange[]): number[] {
	const lines = new Set<number>();
	for (const { line, text } of changes) {
		const spans = text.split("\n").length - 1;
		for (let i = 0; i <= spans; i++) lines.add(line + i);
	}
	return [...lines].sort((a, b) => a - b);
}

/**
 * The lines a multi-line paste added, to tint them (stylesmith.pasteHighlight): only when a
 * single change inserts at least one newline and isn't an undo or redo. Typing a character, a
 * single-line paste, or pressing Enter (which inserts a newline plus indentation) is left
 * alone: a paste of several lines has content beyond indentation.
 */
export function pastedLines(changes: readonly TextChange[], reason?: "undo" | "redo"): number[] {
	if (reason || changes.length !== 1) return [];
	const [change] = changes;
	if (!change || !change.text.includes("\n") || /^\r?\n[ \t]*$/.test(change.text)) return [];
	return changedLines(changes);
}

/** Why a document was saved, from VS Code's TextDocumentSaveReason. */
export type SaveReason = "manual" | "afterDelay" | "focusOut";

/** How long a save receipt shows (ms). */
export const SAVE_RECEIPT_DURATION = 2000;

/**
 * Whether a save gets a receipt (stylesmith.saveReceipt): only a manual save, since with
 * auto-save a note on every pause would be noise, and never over a Problem Lens message.
 */
export function showsSaveReceipt(reason: SaveReason, problemMessageOnLine: boolean): boolean {
	return reason === "manual" && !problemMessageOnLine;
}

/** The receipt, like a terminal log line: "▸ saved 14:02:11", in the user's locale. */
export function saveReceiptText(time: Date, locale?: string): string {
	const options: Intl.DateTimeFormatOptions = {
		hour: "numeric",
		minute: "2-digit",
		second: "2-digit"
	};
	let clock: string;
	try {
		clock = time.toLocaleTimeString(locale, options);
	} catch {
		// An unknown locale tag: use the default one.
		clock = time.toLocaleTimeString(undefined, options);
	}
	return `▸ saved ${clock}`;
}

/** The exit code of a command stopped with Ctrl+C: the user interrupted it; it didn't fail. */
export const INTERRUPTED = 130;

/**
 * Whether a terminal command failed (stylesmith.terminal.failSignal): a non-zero exit code,
 * except an interrupted command. Without shell integration the code is unknown, and nothing
 * counts as failed.
 */
export function commandFailed(exitCode: number | undefined): boolean {
	return exitCode !== undefined && exitCode !== 0 && exitCode !== INTERRUPTED;
}

/** What a screen reader says for a failed command. */
export const commandFailedLabel = (exitCode: number) => `Command failed with exit code ${exitCode}`;

/** Minimum duration (ms) for a terminal command to trigger the done signal. */
export const DONE_SIGNAL_MIN_DURATION = 10_000;

/**
 * Whether a terminal command that finished should trigger the long-command done signal
 * (stylesmith.terminal.doneSignal): it succeeded (exit code 0) and ran for at least
 * DONE_SIGNAL_MIN_DURATION.
 */
export function commandDone(exitCode: number | undefined, durationMs: number): boolean {
	return exitCode === 0 && durationMs >= DONE_SIGNAL_MIN_DURATION;
}

/** Formats a duration in ms for the status bar, e.g. "12s" or "2m 5s". */
export function formatDuration(durationMs: number): string {
	const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes === 0) return `${seconds}s`;
	return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
}

/** What a screen reader says for a finished long command. */
export const commandDoneLabel = (durationMs: number) =>
	`Command finished in ${formatDuration(durationMs)}`;

/**
 * Lets a signal show at most once per ERROR_SIGNAL_COOLDOWN, like the error signal, so it can
 * never flash (WCAG 2.3.1).
 */
export class SignalCooldown {
	private shownAt = Number.NEGATIVE_INFINITY;

	/** True if the signal may show now; it then counts as shown. */
	ready(now: number): boolean {
		if (now - this.shownAt < ERROR_SIGNAL_COOLDOWN) return false;
		this.shownAt = now;
		return true;
	}
}
