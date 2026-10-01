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
}

export interface Manifest {
	contributes: {
		configuration: { properties: Record<string, SettingSchema> };
		themes: { label: string; uiTheme: string; path: string }[];
		iconThemes: { id: string; label: string; path: string }[];
	};
}

export interface ColorTheme {
	type: string;
	colors: Record<string, string>;
	tokenColors: { scope?: string | string[]; settings: { foreground?: string } }[];
}

export interface IconTheme {
	iconDefinitions: Record<string, { iconPath: string }>;
}

/** Reads a JSON file of the project; `T` is what the file is expected to hold. */
export function readJson<T>(...segments: string[]): T {
	return JSON.parse(readFileSync(path.join(ROOT, ...segments), "utf-8")) as T;
}

export const manifest = (): Manifest => readJson<Manifest>("package.json");
