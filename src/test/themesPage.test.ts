import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { contrast } from "../color";
import { EFFECTS } from "../effects";
import { PRESETS } from "../presets";
import { manifest, readJson, ROOT, type ColorTheme } from "./files";

/**
 * The Themes page and the ergonomics page describe the themes with real values: their colors,
 * kinds, contrast and the presets that use them. These tests keep the pages in step with the
 * theme files and src/presets.ts, so the website can't drift from what ships.
 */

const read = (file: string) => readFileSync(path.join(ROOT, "site", file), "utf-8");
const page = read("themes.html");
const words = (html: string) =>
	html
		.replace(/<[^>]+>/g, " ")
		.replace(/&rsquo;/g, "’")
		.replace(/\s+/g, " ")
		.trim();

/** The page's cards of one kind, each as its HTML, by the title in its <h3>. */
function cards(kind: "preset-card" | "theme-card"): Map<string, string> {
	const found = new Map<string, string>();
	for (const [card] of page.matchAll(
		new RegExp(`<li class="${kind}[^"]*">[\\s\\S]*?</li>`, "g")
	)) {
		const title = /<h4>([^<]+)<\/h4>/.exec(card)?.[1];
		assert.ok(title, "every card has a title");
		found.set(title, card);
	}
	return found;
}

/** The value after a <dt> in a card's list. */
function detail(card: string, term: string): string {
	const value = new RegExp(`<dt>${term}</dt>\\s*<dd>([\\s\\S]*?)</dd>`).exec(card)?.[1];
	assert.ok(value !== undefined, `the card lists "${term}"`);
	return words(value);
}

/** The colors of a code sample, from its style attribute: { bg: "#...", kw: "#...", ... }. */
function sampleColors(card: string): Record<string, string> {
	const style = /<pre\s+class="theme-sample"[\s\S]*?style="([^"]+)"/.exec(card)?.[1];
	assert.ok(style, "the card has a code sample");
	const colors: Record<string, string> = {};
	for (const [, name, value] of style.matchAll(/--sample-([a-z]+):\s*(#[0-9a-f]{6})/gi)) {
		colors[name!] = value!.toLowerCase();
	}
	return colors;
}

const KINDS: Record<string, string> = {
	"vs-dark": "Dark",
	vs: "Light",
	"hc-black": "High contrast, dark",
	"hc-light": "High contrast, light"
};

const themes = manifest().contributes.themes.map(entry => {
	const file = readJson<ColorTheme & { semanticTokenColors?: unknown }>(entry.path);
	const token = (scope: string) =>
		file.tokenColors
			.find(rule => [rule.scope ?? []].flat()[0] === scope)
			?.settings.foreground?.toLowerCase();
	return { entry, colors: file.colors, token };
});

describe("Themes page", () => {
	const themeCards = cards("theme-card");
	const presetCards = cards("preset-card");

	it("shows every color theme, and every preset, exactly once", () => {
		assert.deepEqual(
			[...themeCards.keys()].sort(),
			themes.map(theme => theme.entry.label).sort()
		);
		assert.deepEqual(
			[...presetCards.keys()].sort(),
			PRESETS.map(preset => preset.label).sort()
		);
	});

	for (const { entry, colors, token } of themes) {
		describe(entry.label, () => {
			const card = themeCards.get(entry.label) ?? "";

			it("names its kind, and marks a high-contrast theme", () => {
				const kind = KINDS[entry.uiTheme];
				assert.ok(kind, `a kind for ${entry.uiTheme}`);
				assert.match(card, new RegExp(`<p class="theme-kind">${kind}</p>`));
				assert.equal(
					card.includes('class="theme-card high-contrast"'),
					entry.uiTheme.startsWith("hc")
				);
			});

			it("shows a code sample in the theme's own colors", () => {
				const expected: Record<string, string | undefined> = {
					bg: colors["editor.background"],
					fg: colors["editor.foreground"],
					kw: token("keyword"),
					fn: token("entity.name.function"),
					str: token("string"),
					num: token("constant.numeric"),
					cm: token("comment"),
					border: colors["contrastBorder"]
				};
				for (const [name, value] of Object.entries(expected)) {
					assert.equal(sampleColors(card)[name], value?.slice(0, 7).toLowerCase(), name);
				}
			});

			it("states the measured editor text contrast", () => {
				const ratio = contrast(colors["editor.foreground"]!, colors["editor.background"]!);
				assert.equal(detail(card, "Editor text contrast"), `${ratio.toFixed(1)}:1`);
			});

			it("names the preset that uses it", () => {
				const users = PRESETS.filter(preset => preset.theme === entry.label);
				assert.equal(
					detail(card, "Used by preset"),
					users.length
						? users.map(preset => preset.label).join(", ")
						: "None; use it on its own"
				);
			});
		});
	}

	for (const preset of PRESETS) {
		it(`lists what the ${preset.label} preset sets`, () => {
			const card = presetCards.get(preset.label) ?? "";
			const icons = manifest().contributes.iconThemes.find(
				icon => icon.id === preset.iconTheme
			);
			assert.equal(detail(card, "Color theme"), preset.theme);
			assert.equal(detail(card, "File icons"), icons?.label);
			assert.equal(
				detail(card, "Settings on"),
				EFFECTS.filter(effect => preset.effects[effect.setting])
					.map(effect => effect.label)
					.join(", ")
			);
		});
	}
});

describe("Ergonomics page", () => {
	it("states the measured range of editor text contrast outside the high-contrast themes", () => {
		const ratios = themes
			.filter(theme => !theme.entry.uiTheme.startsWith("hc"))
			.map(theme =>
				contrast(theme.colors["editor.foreground"]!, theme.colors["editor.background"]!)
			);
		const range = `between ${Math.min(...ratios).toFixed(1)}:1 and ${Math.max(...ratios).toFixed(1)}:1`;
		assert.ok(words(read("ergonomics.html")).includes(range), range);
	});
});
