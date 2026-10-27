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

/** Formats a Stylesmith theme's terminal palette as an Alacritty TOML config (#192). */
export function alacrittySchemeToml(
	name: string,
	colors: Readonly<Record<string, string>>
): string {
	const s = buildTerminalScheme(name, colors);
	return [
		`# ${s.name} — Alacritty color scheme`,
		"[colors.primary]",
		`background = "${s.background}"`,
		`foreground = "${s.foreground}"`,
		"",
		"[colors.cursor]",
		`text = "${s.background}"`,
		`cursor = "${s.cursorColor}"`,
		"",
		"[colors.selection]",
		`text = "${s.foreground}"`,
		`background = "${s.selectionBackground}"`,
		"",
		"[colors.normal]",
		`black = "${s.black}"`,
		`red = "${s.red}"`,
		`green = "${s.green}"`,
		`yellow = "${s.yellow}"`,
		`blue = "${s.blue}"`,
		`magenta = "${s.purple}"`,
		`cyan = "${s.cyan}"`,
		`white = "${s.white}"`,
		"",
		"[colors.bright]",
		`black = "${s.brightBlack}"`,
		`red = "${s.brightRed}"`,
		`green = "${s.brightGreen}"`,
		`yellow = "${s.brightYellow}"`,
		`blue = "${s.brightBlue}"`,
		`magenta = "${s.brightPurple}"`,
		`cyan = "${s.brightCyan}"`,
		`white = "${s.brightWhite}"`,
		""
	].join("\n");
}

/** Formats a Stylesmith theme's terminal palette as a Kitty config (#192). */
export function kittySchemeConf(name: string, colors: Readonly<Record<string, string>>): string {
	const s = buildTerminalScheme(name, colors);
	return [
		`# ${s.name} — Kitty color scheme`,
		`background ${s.background}`,
		`foreground ${s.foreground}`,
		`cursor ${s.cursorColor}`,
		`cursor_text_color ${s.background}`,
		`selection_foreground ${s.foreground}`,
		`selection_background ${s.selectionBackground}`,
		`color0 ${s.black}`,
		`color1 ${s.red}`,
		`color2 ${s.green}`,
		`color3 ${s.yellow}`,
		`color4 ${s.blue}`,
		`color5 ${s.purple}`,
		`color6 ${s.cyan}`,
		`color7 ${s.white}`,
		`color8 ${s.brightBlack}`,
		`color9 ${s.brightRed}`,
		`color10 ${s.brightGreen}`,
		`color11 ${s.brightYellow}`,
		`color12 ${s.brightBlue}`,
		`color13 ${s.brightPurple}`,
		`color14 ${s.brightCyan}`,
		`color15 ${s.brightWhite}`,
		""
	].join("\n");
}

/** Formats a Stylesmith theme's terminal palette as a Ghostty config (#232). */
export function ghosttySchemeConf(name: string, colors: Readonly<Record<string, string>>): string {
	const s = buildTerminalScheme(name, colors);
	return [
		`# ${s.name} — Ghostty color scheme`,
		`background = ${s.background}`,
		`foreground = ${s.foreground}`,
		`cursor-color = ${s.cursorColor}`,
		`cursor-text = ${s.background}`,
		`selection-foreground = ${s.foreground}`,
		`selection-background = ${s.selectionBackground}`,
		`palette = 0=${s.black}`,
		`palette = 1=${s.red}`,
		`palette = 2=${s.green}`,
		`palette = 3=${s.yellow}`,
		`palette = 4=${s.blue}`,
		`palette = 5=${s.purple}`,
		`palette = 6=${s.cyan}`,
		`palette = 7=${s.white}`,
		`palette = 8=${s.brightBlack}`,
		`palette = 9=${s.brightRed}`,
		`palette = 10=${s.brightGreen}`,
		`palette = 11=${s.brightYellow}`,
		`palette = 12=${s.brightBlue}`,
		`palette = 13=${s.brightPurple}`,
		`palette = 14=${s.brightCyan}`,
		`palette = 15=${s.brightWhite}`,
		""
	].join("\n");
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
