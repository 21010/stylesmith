/**
 * Typed access to the project files that tests check: package.json and the theme files. The
 * types list only the fields the tests use.
 */

import { readFileSync } from "node:fs";
import * as path from "node:path";
import * as opentype from "opentype.js";

export const ROOT = path.join(__dirname, "..", "..");

export interface SettingSchema {
	type?: string;
	default?: unknown;
	scope?: string;
	enum?: unknown[];
	markdownDescription?: string;
}

export interface Manifest {
	contributes: {
		commands: { command: string; title: string; category?: string }[];
		configuration: { properties: Record<string, SettingSchema> };
		themes: { id?: string; label: string; uiTheme: string; path: string }[];
		iconThemes: { id: string; label: string; path: string }[];
		productIconThemes: { id: string; label: string; path: string }[];
	};
}

export interface ColorTheme {
	type: string;
	colors: Record<string, string>;
	tokenColors: { scope?: string | string[]; settings: { foreground?: string } }[];
}

/** Which icon each file extension, file name, language and folder name uses. */
export interface IconMappings {
	file: string;
	folder: string;
	folderExpanded: string;
	fileExtensions: Record<string, string>;
	fileNames: Record<string, string>;
	languageIds: Record<string, string>;
	folderNames: Record<string, string>;
	folderNamesExpanded: Record<string, string>;
}

/** A Stylesmith file icon theme: glyphs of one icon font, each with its color. */
export interface IconTheme extends IconMappings {
	fonts: { id: string; src: { path: string; format: string }[]; size?: string }[];
	iconDefinitions: Record<string, { fontCharacter: string; fontColor: string }>;
	light: IconMappings;
}

/** Reads a JSON file of the project; `T` is what the file is expected to hold. */
export function readJson<T>(...segments: string[]): T {
	return JSON.parse(readFileSync(path.join(ROOT, ...segments), "utf-8")) as T;
}

export const manifest = (): Manifest => readJson<Manifest>("package.json");

/**
 * The id VS Code stores in settings for a contributed theme: its `id` if it has one, else its
 * label. Presets name their theme by this id; a renamed theme keeps its earlier name as id.
 */
export const themeSettingsId = (theme: { id?: string; label: string }): string =>
	theme.id ?? theme.label;

/** Reads a font file with opentype.js. */
export function loadFont(file: string): opentype.Font {
	const bytes = readFileSync(file);
	return opentype.parse(
		bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
	);
}

/** A text file of the project, by its path from the project root. */
export function readText(...segments: string[]): string {
	return readFileSync(path.join(ROOT, ...segments), "utf-8");
}

/** The words of an HTML fragment, as a reader sees them: tags and extra spaces removed. */
export function pageText(html: string): string {
	return html
		.replace(/<[^>]+>/g, " ")
		.replace(/&rsquo;/g, "’")
		.replace(/\s+/g, " ")
		.trim();
}

interface SemanticColors {
	colors: Record<string, string>;
	semanticTokenColors: Record<string, string | { foreground?: string }>;
}

/** A theme's semantic color for a role ("keyword", "string"…), as #rrggbb; "" if it has none. */
export function semanticColor(theme: SemanticColors, role: string): string {
	const value = theme.semanticTokenColors[role];
	return ((typeof value === "string" ? value : value?.foreground) ?? "").slice(0, 7);
}

/**
 * The colors that make a theme recognizable at a glance, for the look-alike tests (#117, #132,
 * #137): background, accent, keyword, string, function and type.
 */
export function themeLook(theme: SemanticColors): string[] {
	return [
		theme.colors["editor.background"]!.slice(0, 7),
		theme.colors["focusBorder"]!.slice(0, 7),
		...["keyword", "string", "function", "type"].map(role => semanticColor(theme, role))
	];
}
