/**
 * Typed access to the project files that tests check: package.json and the theme files. The
 * types list only the fields the tests use.
 */

import { readFileSync } from "node:fs";
import * as path from "node:path";

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
