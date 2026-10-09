/**
 * The plain logic of Stylesmith: Boot Sequence (#82), with no VS Code API, so it can be tested:
 * which log to show, when each line appears, and the ANSI text that draws it. The logs
 * themselves are in stories.ts.
 */

import type { Preset } from "./presets";
import { BOOT_LOGS, DEFAULT_BOOT_LOG, type BootLine, type BootLog } from "./stories";

/** The log types out over about this long (ms); the prompt follows it. */
export const BOOT_DURATION = 2000;
const PROMPT_DELAY = 300;
export const PROMPT = "Press any key to close.";

/** The log of the preset that uses this color theme (its settings id), or the default log. */
export function bootLogFor(colorTheme: unknown, presets: readonly Preset[]): BootLog {
	const preset = presets.find(candidate => candidate.theme === colorTheme);
	return (preset && BOOT_LOGS[preset.label]) ?? DEFAULT_BOOT_LOG;
}

/**
 * When each line appears, in ms from the start: the log's lines spread evenly over
 * BOOT_DURATION, then the prompt. With reduced motion, everything appears at once.
 */
export function bootSchedule(lineCount: number, reduced: boolean): number[] {
	if (reduced) return Array.from({ length: lineCount + 1 }, () => 0);
	const gap = lineCount > 1 ? BOOT_DURATION / (lineCount - 1) : 0;
	const times = Array.from({ length: lineCount }, (_, i) => Math.round(i * gap));
	return [...times, (times.at(-1) ?? 0) + PROMPT_DELAY];
}

const COLORS: Record<BootLog["color"], number> = {
	green: 92,
	yellow: 93,
	blue: 94,
	magenta: 95,
	cyan: 96
};

/** Where statuses line up, and the shortest run of dots before one. */
const STATUS_COLUMN = 40;
const MIN_DOTS = 3;

/**
 * One line as ANSI text, fitted to `columns`: the first line in the log's bright color, statuses
 * after a run of dots, OK in green and WARN in yellow, all from the terminal's own palette.
 */
export function renderBootLine(
	line: BootLine,
	first: boolean,
	color: BootLog["color"],
	columns: number
): string {
	if (first) return `\x1b[1;${COLORS[color]}m${fit(line.text, columns)}\x1b[0m\r\n`;
	if (!line.status) return `${fit(line.text, columns)}\r\n`;
	const label = line.status === "ok" ? "OK" : "WARN";
	const dots = Math.max(MIN_DOTS, STATUS_COLUMN - line.text.length - 2);
	const plain = `${line.text} ${".".repeat(dots)} ${label}`;
	// Too narrow for the status: the text alone, cut to fit.
	if (plain.length > columns) return `${fit(line.text, columns)}\r\n`;
	const status = line.status === "ok" ? `\x1b[32m${label}\x1b[0m` : `\x1b[33m${label}\x1b[0m`;
	return `${line.text} \x1b[2m${".".repeat(dots)}\x1b[0m ${status}\r\n`;
}

function fit(text: string, columns: number): string {
	return columns > 0 && text.length > columns ? text.slice(0, columns) : text;
}
