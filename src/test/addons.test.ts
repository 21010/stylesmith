import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	alacrittySchemeToml,
	buildTerminalScheme,
	kittySchemeConf,
	orderThemesForPicker,
	terminalSchemeJson
} from "../addons";
import { manifest, readJson, type ColorTheme } from "./files";

describe("terminal ANSI palette export (#174, #182, #192)", () => {
	const themes = manifest().contributes.themes;

	it("floats the active Stylesmith theme to the top of the picker and marks it current (#182)", () => {
		const ordered = orderThemesForPicker(themes, "Stylesmith Daylight");
		assert.equal(ordered[0]?.theme.label, "Stylesmith Daylight");
		assert.equal(ordered[0]?.current, true);
		assert.ok(ordered.slice(1).every(item => !item.current));

		// Simulation's settings id is its earlier name ("Stylesmith Digital Rain").
		const byId = orderThemesForPicker(themes, "Stylesmith Digital Rain");
		assert.equal(byId[0]?.theme.label, "Stylesmith Simulation");
		assert.equal(byId[0]?.current, true);
	});

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

			const toml = alacrittySchemeToml(entry.label, theme.colors);
			assert.ok(toml.includes("[colors.primary]"));
			assert.ok(toml.includes(`background = "${scheme.background}"`));
			assert.ok(toml.includes(`magenta = "${scheme.purple}"`));

			const kitty = kittySchemeConf(entry.label, theme.colors);
			assert.ok(kitty.includes(`background ${scheme.background}`));
			assert.ok(kitty.includes(`color0 ${scheme.black}`));
			assert.ok(kitty.includes(`color15 ${scheme.brightWhite}`));
		});
	}
});
