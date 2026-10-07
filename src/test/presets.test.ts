import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EFFECTS } from "../effects";
import { ICON_THEME, PRESETS, presetEffects } from "../presets";
import { manifest } from "./files";

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
				const labels = contributes.themes.map(theme => theme.label);
				assert.ok(labels.includes(preset.theme), preset.theme);
			});

			it("uses its color theme's own pixel icons, if it has them", () => {
				// "Stylesmith Phosphor" has its own icons if "Stylesmith Pixel Phosphor" exists.
				const own = contributes.iconThemes.find(
					theme =>
						theme.label === preset.theme.replace("Stylesmith ", "Stylesmith Pixel ")
				);
				assert.equal(preset.iconTheme, own?.id ?? ICON_THEME);
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

	it("keeps motion low in the high contrast preset", () => {
		const high = PRESETS.find(preset => preset.id === "high-contrast")!;
		assert.equal(high.effects["effects.smoothCursor"], false);
	});
});
