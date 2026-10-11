import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import opentype from "opentype.js";
import { colorDifference, contrast, VISION } from "../color";
import { manifest, readJson, type ColorTheme, type IconMappings, type IconTheme } from "./files";

// Tests run from out/test, two levels below the project root.
const ROOT = path.join(__dirname, "..", "..");
const ICONS = path.join(ROOT, "icons");

/** Editor backgrounds of Stylesmith's themes, by the icon variant VS Code uses with them. */
function editorBackgrounds(): Record<"dark" | "light", string[]> {
	const result = { dark: ["#1e1e1e", "#1f1f1f"], light: ["#ffffff", "#f3f3f3"] };
	for (const file of readdirSync(path.join(ROOT, "themes"))) {
		const theme = readJson<ColorTheme>("themes", file);
		const variant = theme.type === "light" || theme.type === "hcLight" ? "light" : "dark";
		const background = theme.colors["editor.background"];
		assert.ok(background, `${file} defines editor.background`);
		result[variant].push(background.slice(0, 7));
	}
	return result;
}

describe("problem gutter icons", () => {
	const backgrounds = editorBackgrounds();
	for (const severity of ["error", "warning", "info"]) {
		for (const variant of ["dark", "light"] as const) {
			const file = path.join(ICONS, "problems", `${severity}-${variant}.svg`);
			it(`${severity} (${variant}) is visible on every editor background (3:1)`, () => {
				const fills = new Set(
					[...readFileSync(file, "utf-8").matchAll(/fill="(#[0-9a-f]{6})"/gi)].map(
						m => m[1]
					)
				);
				assert.equal(fills.size, 1, "one color, so the shape carries the meaning");
				const [fill] = fills;
				assert.ok(fill);
				for (const background of backgrounds[variant]) {
					const ratio = contrast(fill, background);
					assert.ok(ratio >= 3, `${fill} on ${background}: ${ratio.toFixed(2)}:1`);
				}
			});
		}
	}
});

/** Each Stylesmith theme's own gutter icons (#106): its color for each severity. */
describe("problem gutter icons per theme", () => {
	for (const entry of manifest().contributes.themes) {
		const id = /([^/]+)-color-theme\.json$/.exec(entry.path)?.[1];
		const theme = readJson<ColorTheme>("themes", path.basename(entry.path));
		const background = theme.colors["editor.background"]?.slice(0, 7) ?? "";
		for (const [severity, key] of [
			["error", "editorError.foreground"],
			["warning", "editorWarning.foreground"],
			["info", "editorInfo.foreground"]
		] as const) {
			it(`${entry.label}: ${severity} in the theme's own color, visible (3:1)`, () => {
				assert.ok(id, entry.path);
				const svg = readFileSync(
					path.join(ICONS, "problems", id, `${severity}.svg`),
					"utf-8"
				);
				const fills = new Set([...svg.matchAll(/fill="(#[0-9a-f]{6})"/gi)].map(m => m[1]));
				assert.equal(fills.size, 1, "one color, so the shape carries the meaning");
				const [fill = ""] = fills;
				const own = theme.colors[key]?.slice(0, 7) ?? "";
				const gap = colorDifference(fill, own, VISION["normal vision"]);
				assert.ok(gap <= 8, `${fill} is ${gap.toFixed(1)} from ${key} ${own}`);
				const ratio = contrast(fill, background);
				assert.ok(ratio >= 3, `${fill} on ${background}: ${ratio.toFixed(2)}:1`);
			});
		}
	}
});

/**
 * The file icon themes (#101): every set uses the one Stylesmith pixel icon font, and colors
 * its glyphs in its JSON. Stylesmith Pixel colors each file type; every color theme has its own
 * set, colored by kind of file in the theme's own colors.
 */
describe("pixel icon themes", () => {
	const contributed = manifest().contributes.iconThemes;
	const files = readdirSync(ICONS).filter(file => file.endsWith("-icon-theme.json"));
	const original = readJson<IconTheme>("icons", "pixel-icon-theme.json");
	const fontFile = path.join(ICONS, "stylesmith-pixel-icons.otf");
	const font = opentype.loadSync(fontFile);
	const themes = readdirSync(path.join(ROOT, "themes")).map(file => ({
		file,
		...readJson<ColorTheme & { name: string }>("themes", file)
	}));
	const VSCODE_SIDEBARS = { dark: ["#181818", "#252526"], light: ["#f8f8f8", "#f3f3f3"] };

	it("are all listed in package.json, one for Stylesmith Pixel and one per color theme", () => {
		assert.deepEqual(
			contributed.map(entry => path.basename(entry.path)).sort(),
			[...files].sort()
		);
		assert.equal(contributed.length, themes.length + 1);
		for (const theme of themes) {
			const id = theme.file.replace("-color-theme.json", "");
			assert.ok(
				contributed.some(entry => entry.id === `stylesmith-pixel-${id}`),
				`a set for ${theme.name}`
			);
		}
	});

	it("keeps the ids users already have in their settings", () => {
		for (const id of [
			"stylesmith-pixel",
			"stylesmith-pixel-phosphor",
			"stylesmith-pixel-amber",
			"stylesmith-pixel-ice"
		]) {
			assert.ok(
				contributed.some(entry => entry.id === id),
				id
			);
		}
	});

	it("draws one-color glyphs on whole pixels, at 16px", () => {
		assert.equal(font.unitsPerEm, 1600);
		assert.equal(font.ascender, 1600);
		assert.equal(font.descender, 0);
	});

	for (const entry of contributed) {
		const set = readJson<IconTheme>("icons", path.basename(entry.path));
		const mapped = (section: IconMappings) => [
			section.file,
			section.folder,
			section.folderExpanded,
			...Object.values(section.fileExtensions),
			...Object.values(section.fileNames),
			...Object.values(section.languageIds),
			...Object.values(section.folderNames),
			...Object.values(section.folderNamesExpanded)
		];
		describe(entry.label, () => {
			it("uses the Stylesmith pixel icon font at 16px", () => {
				assert.equal(set.fonts.length, 1);
				assert.equal(set.fonts[0]!.src[0]!.path, "./stylesmith-pixel-icons.otf");
				assert.equal(set.fonts[0]!.size, "16px");
			});

			it("refers only to glyphs that exist in the font, each with a color", () => {
				for (const [id, definition] of Object.entries(set.iconDefinitions)) {
					const code = parseInt(definition.fontCharacter.slice(1), 16);
					const glyph = font.charToGlyph(String.fromCodePoint(code));
					assert.notEqual(glyph.index, 0, `${id}: no glyph ${definition.fontCharacter}`);
					assert.match(definition.fontColor, /^#[0-9a-f]{6}$/, id);
				}
				for (const id of [...mapped(set), ...mapped(set.light)]) {
					assert.ok(set.iconDefinitions[id], `undefined icon ${id}`);
				}
			});

			it("covers the same files and folders as Stylesmith Pixel", () => {
				for (const mappings of [
					"fileExtensions",
					"fileNames",
					"languageIds",
					"folderNames",
					"folderNamesExpanded"
				] as const) {
					assert.deepEqual(
						Object.keys(set[mappings]).sort(),
						Object.keys(original[mappings]).sort(),
						mappings
					);
					assert.deepEqual(
						Object.keys(set.light[mappings]).sort(),
						Object.keys(original.light[mappings]).sort(),
						mappings
					);
				}
			});

			it("matches a parent folder at most one level up", () => {
				for (const name of [
					...Object.keys(set.fileNames),
					...Object.keys(set.folderNames)
				]) {
					assert.ok(name.split("/").length <= 2, name);
				}
			});

			// A theme's own set is checked on its own side bar as well as VS Code's.
			const theme = themes.find(
				t => `stylesmith-pixel-${t.file.replace("-color-theme.json", "")}` === entry.id
			);
			for (const kind of ["dark", "light"] as const) {
				it(`stands out on ${kind} side bars (3:1)`, () => {
					const section = kind === "dark" ? set : set.light;
					const own =
						theme && (theme.type === "light" ? "light" : "dark") === kind
							? [
									(
										theme.colors["sideBar.background"] ??
										theme.colors["editor.background"]!
									).slice(0, 7)
								]
							: [];
					for (const id of new Set(mapped(section))) {
						const color = set.iconDefinitions[id]!.fontColor;
						for (const background of [...VSCODE_SIDEBARS[kind], ...own]) {
							const ratio = contrast(color, background);
							assert.ok(
								ratio >= 3,
								`${id}: ${color} on ${background}: ${ratio.toFixed(2)}:1`
							);
						}
					}
				});
			}

			if (theme && !theme.type.startsWith("hc")) {
				it(`takes its colors from ${theme.name}`, () => {
					const own = [
						...theme.tokenColors.flatMap(rule => rule.settings.foreground ?? []),
						...Object.values(theme.colors)
					].map(color => color.slice(0, 7));
					const section = theme.type === "light" ? set.light : set;
					for (const id of new Set(mapped(section))) {
						const color = set.iconDefinitions[id]!.fontColor;
						const nearest = Math.min(
							...own.map(c => colorDifference(color, c, VISION["normal vision"]))
						);
						assert.ok(
							nearest <= 15,
							`${id}: ${color} is ${nearest.toFixed(1)} from the theme's colors`
						);
					}
				});
			}
		});
	}
});
