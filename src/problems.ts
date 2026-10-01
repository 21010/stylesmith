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

export const TAGS: Record<Severity, string> = { error: "ERR", warning: "WARN", info: "INFO" };

const WORDS: Record<Severity, string> = { error: "Error", warning: "Warning", info: "Info" };

/**
 * How strongly a problem line is tinted, in percent of the theme's error or warning color.
 * High contrast themes get no tint: their text keeps its full contrast, and the gutter icon
 * and the message mark the line. Stylesmith's tests check every theme against these values.
 */
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
