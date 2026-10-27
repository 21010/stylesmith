import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTerminalScheme, terminalSchemeJson } from "../addons";
import { manifest, readJson, type ColorTheme } from "./files";

describe("terminal ANSI palette export (#174)", () => {
	const themes = manifest().contributes.themes;

	for (const entry of themes) {
		it(`exports a complete 16-color hex terminal scheme for ${entry.label}`, () => {
			const theme = readJson<ColorTheme>(entry.path);
			const scheme = buildTerminalScheme(entry.label, theme.colors);
			assert.equal(scheme.name, entry.label);
			for (const [key, value] of Object.entries(scheme)) {
				if (key === "name") continue;
				assert.match(String(value), /^#[0-9a-f]{6}$/i, `${entry.label} ${key}: ${value}`);
			}
			const parsed = JSON.parse(terminalSchemeJson(entry.label, theme.colors)) as Record<
				string,
				string
			>;
			assert.deepEqual(parsed, scheme);
		});
	}
});
