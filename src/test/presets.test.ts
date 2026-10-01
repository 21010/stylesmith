import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { EFFECTS } from "../effects";
import { FONTS } from "../fonts";
import { ICON_THEME, PRESETS, presetEffects } from "../presets";

// Tests run from out/test, two levels below the project root.
const ROOT = path.join(__dirname, "..", "..");
const contributes = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf-8")).contributes;

describe("presets", () => {
	it("have unique ids", () => {
		assert.equal(new Set(PRESETS.map(preset => preset.id)).size, PRESETS.length);
	});

	it("use the Stylesmith Pixel icon theme", () => {
		assert.ok(contributes.iconThemes.some((theme: { id: string }) => theme.id === ICON_THEME));
	});

	for (const preset of PRESETS) {
		describe(preset.label, () => {
			it("uses a Stylesmith color theme", () => {
				const labels = contributes.themes.map((theme: { label: string }) => theme.label);
				assert.ok(labels.includes(preset.theme), preset.theme);
			});

			it("uses a bundled font", () => {
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

	it("keep the high contrast preset free of moving effects", () => {
		const high = PRESETS.find(preset => preset.id === "high-contrast")!;
		for (const setting of ["caretAnimation", "typingSparks", "bootSequence", "glitchOnSave"]) {
			assert.equal(high.effects[`effects.${setting}`], false, setting);
		}
	});
});
