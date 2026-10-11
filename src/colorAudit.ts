/**
 * The color audit (#108): which of VS Code's theme colors a Stylesmith theme leaves to VS Code's
 * stock defaults. Used by scripts/audit-colors.mjs, which reads the colors from a downloaded VS
 * Code; not part of the extension.
 *
 * VS Code registers each color with a default for dark, light and high contrast themes: a
 * fixed color, one derived from other colors (which follows the theme when those are set), or
 * none (nothing is drawn). A fixed default far from every color of a theme is "clearly off".
 */

import { colorDifference, VISION } from "./color";

export type DefaultKind = "fixed" | "derived" | "none" | "missing";

export interface RegisteredColor {
	id: string;
	dark: DefaultKind;
	light: DefaultKind;
	/** The dark and light defaults, as written in VS Code's code. */
	darkValue?: string;
	lightValue?: string;
	/** The registered colors a derived dark default is computed from. */
	refs: string[];
}

/** ΔE (CIE76) above which a stock color is clearly off from every color of a theme. */
export const CLEARLY_OFF = 25;

const kindOf = (value: string | undefined): DefaultKind =>
	value === undefined
		? "missing"
		: value === "null"
			? "none"
			: /^"#[0-9a-fA-F]{3,8}"$/.test(value)
				? "fixed"
				: "derived";

/** The end of one expression starting at `start`: the first top-level comma or closing bracket. */
function expressionEnd(code: string, start: number): number {
	let depth = 0;
	for (let i = start; i < code.length; i++) {
		const c = code[i];
		if (c === "(" || c === "{" || c === "[") depth++;
		else if (c === ")" || c === "}" || c === "]") {
			if (depth === 0) return i;
			depth--;
		} else if (c === "," && depth === 0) return i;
		else if (c === '"') {
			for (i++; i < code.length && code[i] !== '"'; i++) if (code[i] === "\\") i++;
		}
	}
	return code.length;
}

/** One kind's default from `{dark: …, light: …}`, or the single default every kind shares. */
function defaultFor(expression: string, kind: "dark" | "light"): string | undefined {
	if (!expression.startsWith("{")) return expression;
	const match = new RegExp(`[{,]${kind}:`).exec(expression);
	if (!match) return undefined;
	const start = match.index + match[0].length;
	return expression.slice(start, expressionEnd(expression, start));
}

/**
 * The colors registered in VS Code's workbench bundle (workbench.desktop.main.js). Its code is
 * minified, so this finds the registration function by the call that registers
 * "editor.background", then every call to it: `fn("id", defaults, description)`.
 */
export function workbenchColors(code: string): RegisteredColor[] {
	const register = /([\w$]{1,3})\("editor\.background",\{/.exec(code)?.[1];
	if (!register) throw new Error("VS Code's color registration function was not found");
	const variables = new Map<string, string>(); // minified variable -> color id
	const found: { id: string; expression: string }[] = [];
	const call = /(?:([\w$]+)=)?\b([\w$]{1,3})\("([a-zA-Z][\w.-]*)",/g;
	for (let m = call.exec(code); m; m = call.exec(code)) {
		const [, variable, fn, id] = m;
		if (fn !== register || !id) continue;
		const expression = code.slice(call.lastIndex, expressionEnd(code, call.lastIndex));
		if (variable) variables.set(variable, id);
		found.push({ id, expression });
	}
	const colors = found.map(({ id, expression }): RegisteredColor => {
		const darkValue = defaultFor(expression, "dark");
		const lightValue = defaultFor(expression, "light");
		const refs = [...(darkValue ?? "").matchAll(/[\w$]+/g)]
			.map(m => variables.get(m[0]))
			.filter((ref): ref is string => !!ref);
		return {
			id,
			dark: kindOf(darkValue),
			light: kindOf(lightValue),
			darkValue,
			lightValue,
			refs: [...new Set(refs)]
		};
	});
	// The terminal's ANSI colors are registered in a loop, so their ids aren't in the code.
	const ansi = ["Black", "Red", "Green", "Yellow", "Blue", "Magenta", "Cyan", "White"];
	for (const name of [...ansi, ...ansi.map(a => `Bright${a}`)]) {
		colors.push({ id: `terminal.ansi${name}`, dark: "derived", light: "derived", refs: [] });
	}
	return colors;
}

interface ExtensionManifest {
	contributes?: {
		colors?: { id: string; defaults?: { dark?: string | null; light?: string | null } }[];
	};
}

/** The colors built-in extensions contribute in their package.json (Git, merge conflicts…). */
export function extensionColors(manifests: readonly ExtensionManifest[]): RegisteredColor[] {
	const kind = (v: string | null | undefined): DefaultKind =>
		v == null ? "none" : v.startsWith("#") ? "fixed" : "derived";
	return manifests.flatMap(manifest =>
		(manifest.contributes?.colors ?? []).map(({ id, defaults = {} }) => ({
			id,
			dark: kind(defaults.dark),
			light: kind(defaults.light),
			darkValue: JSON.stringify(defaults.dark ?? null),
			lightValue: JSON.stringify(defaults.light ?? null),
			refs: defaults.dark && !defaults.dark.startsWith("#") ? [defaults.dark] : []
		}))
	);
}

/** Every registered color once; the first registration wins. */
export function registry(colors: readonly RegisteredColor[]): RegisteredColor[] {
	const byId = new Map<string, RegisteredColor>();
	for (const color of colors) if (!byId.has(color.id)) byId.set(color.id, color);
	return [...byId.values()];
}

export interface Theme {
	type: string;
	colors: Record<string, string>;
	tokenColors: { settings: { foreground?: string } }[];
}

export interface ThemeAudit {
	/** Colors the theme sets. */
	set: number;
	/** Colors it sets that VS Code doesn't know (misspelled or removed). */
	unknown: string[];
	/** Unset colors whose default follows a color the theme sets. */
	following: number;
	/** Unset colors that draw nothing by default. */
	none: number;
	/** Unset colors with a fixed stock default, and its distance to the theme's nearest color. */
	stock: { id: string; value: string; gap: number }[];
}

/** Expands #rgb to #rrggbb and drops the alpha. */
const opaque = (hex: string): string =>
	hex.length === 4 || hex.length === 5
		? `#${[...hex.slice(1, 4)].map(c => c + c).join("")}`
		: hex.slice(0, 7);

/** How a theme covers VS Code's registered colors. */
export function auditTheme(theme: Theme, colors: readonly RegisteredColor[]): ThemeAudit {
	const kind = theme.type === "light" || theme.type === "hcLight" ? "light" : "dark";
	const byId = new Map(colors.map(c => [c.id, c]));
	const set = new Set(Object.keys(theme.colors));
	const own = [
		...new Set(
			[
				...Object.values(theme.colors),
				...theme.tokenColors.flatMap(t => t.settings.foreground ?? [])
			].map(opaque)
		)
	];
	const memo = new Map<string, boolean>();
	// Does an unset color end up following a color the theme sets?
	const follows = (id: string, seen = new Set<string>()): boolean => {
		if (set.has(id)) return true;
		const known = memo.get(id);
		if (known !== undefined) return known;
		if (seen.has(id)) return false;
		seen.add(id);
		const color = byId.get(id);
		const result =
			!!color && color[kind] === "derived" && color.refs.some(ref => follows(ref, seen));
		memo.set(id, result);
		return result;
	};
	const audit: ThemeAudit = {
		set: set.size,
		unknown: [...set].filter(id => !byId.has(id)),
		following: 0,
		none: 0,
		stock: []
	};
	for (const color of colors) {
		if (set.has(color.id)) continue;
		const value = kind === "dark" ? color.darkValue : color.lightValue;
		if (color[kind] === "none" || color[kind] === "missing") audit.none++;
		else if (color[kind] === "fixed" && value) {
			const hex = opaque(JSON.parse(value) as string);
			const gap = Math.min(...own.map(o => colorDifference(hex, o, VISION["normal vision"])));
			audit.stock.push({ id: color.id, value: hex, gap });
		} else if (follows(color.id)) audit.following++;
	}
	return audit;
}

/** The stock colors that are clearly off in a theme, worst first. */
export function clearlyOff(audit: ThemeAudit): ThemeAudit["stock"] {
	return audit.stock.filter(s => s.gap > CLEARLY_OFF).sort((a, b) => b.gap - a.gap);
}
