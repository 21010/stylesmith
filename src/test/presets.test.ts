import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EFFECTS } from "../effects";
import { FONTS } from "../fonts";
import { colorDifference, VISION } from "../color";
import {
	ICON_THEME,
	orderPresetsForPicker,
	PRESET_ALIASES,
	PRESETS,
	presetEffects,
	presetForTheme,
	presetKind
} from "../presets";
import { PRESET_STORIES, PRESET_TALES } from "../stories";
import { manifest, readJson, themeLook, themeSettingsId, type IconTheme } from "./files";

interface SemanticTheme {
	type: string;
	colors: Record<string, string>;
	semanticTokenColors: Record<string, string | { foreground?: string }>;
}

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

	it("keeps a renamed theme's earlier name as its id, so existing settings still find it (#239)", () => {
		const simulation = manifest().contributes.themes.find(
			theme => theme.label === "Stylesmith Simulation"
		);
		assert.equal(simulation?.id, "Stylesmith Digital Rain");
		assert.equal(presetForTheme("Stylesmith Digital Rain")?.id, "simulation");
		assert.equal(presetForTheme("Stylesmith Simulation")?.id, "simulation");
		const ordered = orderPresetsForPicker(PRESETS, "Stylesmith Simulation");
		assert.equal(ordered[0]?.preset.id, "simulation");
		assert.equal(ordered[0]?.current, true);
	});

	it("orders presets for the picker with kind and current badges (#193)", () => {
		assert.equal(PRESETS.filter(p => presetKind(p) === "dark").length, 18);
		assert.equal(PRESETS.filter(p => presetKind(p) === "light").length, 4);
		assert.equal(PRESETS.filter(p => presetKind(p) === "hc").length, 2);
		const ordered = orderPresetsForPicker(PRESETS, "Stylesmith Tea Garden");
		assert.equal(ordered[0]?.preset.id, "tea-garden");
		assert.equal(ordered[0]?.current, true);
		assert.equal(ordered[0]?.description, "light · current");
		assert.ok(ordered.slice(1).every(item => !item.current));
	});
});

/**
 * Presets close on several axes at once (#132): each axis has its own test, but two presets can
 * pass them all and still feel the same. A pair's score adds up its distances: colors (the
 * look-alike mean ΔE), file icons (mean ΔE over folder, code, docs and config), 10 if the fonts
 * differ and 5 for each effect that differs. The 2.8 audit found Steel and Rust and Command Deck
 * at 33.7 and Black ICE and Grid at 39.7; the next pair was 43.7.
 */
describe("preset distinctness (#132)", () => {
	const MIN_SCORE = 42;
	const difference = (a: string, b: string) =>
		colorDifference(a.slice(0, 7), b.slice(0, 7), VISION["normal vision"]);
	const meanDifference = (a: readonly string[], b: readonly string[]) =>
		a.reduce((sum, color, i) => sum + difference(color, b[i]!), 0) / a.length;

	const profiles = PRESETS.map(preset => {
		const entry = contributes.themes.find(theme => themeSettingsId(theme) === preset.theme)!;
		const theme = readJson<SemanticTheme>(entry.path);
		const iconEntry = contributes.iconThemes.find(icons => icons.id === preset.iconTheme)!;
		const icons = readJson<IconTheme>(iconEntry.path);
		const iconColor = (id: string | undefined) =>
			icons.iconDefinitions[id ?? ""]?.fontColor ?? "";
		return {
			preset,
			kind: theme.type,
			look: themeLook(theme),
			icons: [
				iconColor(icons.folder),
				iconColor(icons.fileExtensions["ts"]),
				iconColor(icons.fileExtensions["md"]),
				iconColor(icons.fileExtensions["json"])
			]
		};
	});

	it("keeps every two presets of a kind apart across colors, icons, font and effects", () => {
		for (let i = 0; i < profiles.length; i++) {
			for (let j = i + 1; j < profiles.length; j++) {
				const [a, b] = [profiles[i]!, profiles[j]!];
				if (a.kind !== b.kind) continue;
				const colors = meanDifference(a.look, b.look);
				const icons = meanDifference(a.icons, b.icons);
				const font = a.preset.font === b.preset.font ? 0 : 10;
				const effects = EFFECTS.filter(
					effect =>
						Boolean(a.preset.effects[effect.setting]) !==
						Boolean(b.preset.effects[effect.setting])
				).length;
				const score = colors + icons + font + effects * 5;
				assert.ok(
					score >= MIN_SCORE,
					`${a.preset.label} and ${b.preset.label}: ${score.toFixed(1)} (colors ${colors.toFixed(1)}, icons ${icons.toFixed(1)}, ${font ? "different fonts" : "the same font"}, ${effects} effects differ)`
				);
			}
		}
	});

	it("says what its settings do: descriptions and stories match the effects", () => {
		// [what the words say, the effects that make it true, whether they must be on]
		const promises: [RegExp, string[], boolean][] = [
			[/compact/i, ["effects.compactLayout"], true],
			[/block cursor/i, ["effects.blockCursor", "effects.blockTerminalCursor"], true],
			[/dimm?ed/i, ["effects.dimUnfocused"], true],
			[/without animation|no smooth/i, ["effects.smoothCursor"], false],
			[/readable terminal/i, ["effects.readableTerminal"], true],
			[/bracket guides/i, ["effects.bracketGuides"], true]
		];
		for (const preset of PRESETS) {
			const words = [
				preset.description,
				PRESET_STORIES[preset.label] ?? "",
				PRESET_TALES[preset.label]?.settings ?? ""
			].join(" ");
			for (const [pattern, settings, on] of promises) {
				if (!pattern.test(words)) continue;
				const isOn = settings.some(setting => preset.effects[setting]);
				assert.equal(isOn, on, `${preset.label} says "${pattern.source}"`);
			}
		}
	});
});
