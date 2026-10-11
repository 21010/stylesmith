import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EFFECTS } from "../effects";
import { FONTS } from "../fonts";
import { ICON_THEME, PRESET_ALIASES, PRESETS, presetEffects } from "../presets";
import { manifest, themeSettingsId } from "./files";

const contributes = manifest().contributes;

describe("presets", () => {
	it("have unique ids", () => {
		assert.equal(new Set(PRESETS.map(preset => preset.id)).size, PRESETS.length);
	});

	it("fall back to the Stylesmith Pixel icon theme", () => {
		assert.ok(contributes.iconThemes.some(theme => theme.id === ICON_THEME));
	});

	for (const preset of PRESETS) {
		describe(preset.label, () => {
			it("uses a Stylesmith color theme", () => {
				const ids = contributes.themes.map(themeSettingsId);
				assert.ok(ids.includes(preset.theme), preset.theme);
			});

			it("uses its color theme's own pixel icons", () => {
				// "Stylesmith Phosphor" has its own icons: "Stylesmith Pixel Phosphor".
				const theme = contributes.themes.find(t => themeSettingsId(t) === preset.theme)!;
				const own = contributes.iconThemes.find(
					icons => icons.label === theme.label.replace("Stylesmith ", "Stylesmith Pixel ")
				);
				assert.ok(own, `${theme.label} has its own icon set`);
				assert.equal(preset.iconTheme, own.id);
			});

			it("recommends one of Stylesmith's fonts", () => {
				assert.ok(
					FONTS.some(font => font.id === preset.font),
					preset.font
				);
			});

			it("decides every effect, and nothing else", () => {
				assert.deepEqual(
					Object.keys(preset.effects).sort(),
					EFFECTS.map(effect => effect.setting).sort()
				);
				assert.equal(presetEffects(preset).length, EFFECTS.length);
			});
		});
	}

	it("keeps motion low in the high contrast presets", () => {
		for (const id of ["high-contrast", "high-contrast-light"]) {
			const high = PRESETS.find(preset => preset.id === id)!;
			assert.equal(high.effects["effects.smoothCursor"], false, id);
		}
	});

	it("spreads the recommended fonts: no font for more than three presets (#122)", () => {
		const count = new Map<string, number>();
		for (const preset of PRESETS) count.set(preset.font, (count.get(preset.font) ?? 0) + 1);
		for (const [font, n] of count) assert.ok(n <= 3, `${font} is recommended by ${n} presets`);
	});

	it("keeps earlier preset ids working, pointing at presets that exist", () => {
		assert.equal(PRESET_ALIASES["digital-rain"], "simulation");
		for (const [old, id] of Object.entries(PRESET_ALIASES)) {
			assert.ok(
				PRESETS.some(preset => preset.id === id),
				id
			);
			assert.ok(!PRESETS.some(preset => preset.id === old), old);
		}
	});

	it("keeps a renamed theme's earlier name as its id, so existing settings still find it", () => {
		const simulation = manifest().contributes.themes.find(
			theme => theme.label === "Stylesmith Simulation"
		);
		assert.equal(simulation?.id, "Stylesmith Digital Rain");
	});
});
