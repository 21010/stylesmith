/**
 * Terminal and editor add-ons (#173, #174): exports a Stylesmith color theme's fitted 16-color
 * ANSI terminal palette as a Windows Terminal scheme JSON object, without needing VS Code's API.
 */

export interface TerminalScheme {
	name: string;
	background: string;
	foreground: string;
	cursorColor: string;
	selectionBackground: string;
	black: string;
	red: string;
	green: string;
	yellow: string;
	blue: string;
	purple: string;
	cyan: string;
	white: string;
	brightBlack: string;
	brightRed: string;
	brightGreen: string;
	brightYellow: string;
	brightBlue: string;
	brightPurple: string;
	brightCyan: string;
	brightWhite: string;
}

const stripAlpha = (hex: string | undefined, fallback: string): string =>
	(hex ?? fallback).slice(0, 7);

/** Builds a 16-color ANSI terminal scheme from a Stylesmith color theme's `colors` map (#174). */
export function buildTerminalScheme(
	name: string,
	colors: Readonly<Record<string, string>>
): TerminalScheme {
	const bg = stripAlpha(colors["terminal.background"] ?? colors["editor.background"], "#000000");
	const fg = stripAlpha(colors["terminal.foreground"] ?? colors["editor.foreground"], "#ffffff");
	return {
		name,
		background: bg,
		foreground: fg,
		cursorColor: stripAlpha(colors["terminalCursor.foreground"], fg),
		selectionBackground: stripAlpha(
			colors["terminal.selectionBackground"] ?? colors["editor.selectionBackground"],
			fg
		),
		black: stripAlpha(colors["terminal.ansiBlack"], bg),
		red: stripAlpha(colors["terminal.ansiRed"], fg),
		green: stripAlpha(colors["terminal.ansiGreen"], fg),
		yellow: stripAlpha(colors["terminal.ansiYellow"], fg),
		blue: stripAlpha(colors["terminal.ansiBlue"], fg),
		purple: stripAlpha(colors["terminal.ansiMagenta"], fg),
		cyan: stripAlpha(colors["terminal.ansiCyan"], fg),
		white: stripAlpha(colors["terminal.ansiWhite"], fg),
		brightBlack: stripAlpha(colors["terminal.ansiBrightBlack"], fg),
		brightRed: stripAlpha(colors["terminal.ansiBrightRed"], fg),
		brightGreen: stripAlpha(colors["terminal.ansiBrightGreen"], fg),
		brightYellow: stripAlpha(colors["terminal.ansiBrightYellow"], fg),
		brightBlue: stripAlpha(colors["terminal.ansiBrightBlue"], fg),
		brightPurple: stripAlpha(colors["terminal.ansiBrightMagenta"], fg),
		brightCyan: stripAlpha(colors["terminal.ansiBrightCyan"], fg),
		brightWhite: stripAlpha(colors["terminal.ansiBrightWhite"], fg)
	};
}

/** Formats a Stylesmith theme's terminal palette as pretty-printed JSON. */
export function terminalSchemeJson(name: string, colors: Readonly<Record<string, string>>): string {
	return `${JSON.stringify(buildTerminalScheme(name, colors), null, "\t")}\n`;
}

/**
 * Orders color themes for the terminal palette picker (#182): the currently active Stylesmith
 * theme comes first and is marked `current: true`.
 */
export function orderThemesForPicker<T extends { id?: string; label: string; path: string }>(
	themes: readonly T[],
	activeColorTheme: string | undefined
): { theme: T; current: boolean }[] {
	const annotated = themes.map(theme => ({
		theme,
		current: (theme.id ?? theme.label) === activeColorTheme || theme.label === activeColorTheme
	}));
	return [...annotated.filter(item => item.current), ...annotated.filter(item => !item.current)];
}
