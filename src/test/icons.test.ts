import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { contrast } from "../color";
import { manifest, readJson, type ColorTheme, type IconTheme } from "./files";

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

/** The fills of an icon: the band (when it has one), its label, and everything else. */
function iconFills(svg: string): { band?: string; label: string[]; other: string[] } {
	const rects = [
		...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" [^>]*fill="(#[0-9a-f]{6})"/gi)
	];
	const bandAt = rects.findIndex(([, x, y, w]) => x === "2" && y === "8" && w === "12");
	const fills = rects.map(match => match[4] ?? "");
	if (bandAt < 0) return { label: [], other: fills };
	return {
		band: fills[bandAt],
		label: fills.slice(bandAt + 1),
		other: fills.slice(0, bandAt)
	};
}

describe("pixel icon themes", () => {
	const contributed = manifest().contributes.iconThemes;
	const files = readdirSync(ICONS).filter(file => file.endsWith("-icon-theme.json"));
	const original = readJson<IconTheme>("icons", "pixel-icon-theme.json");

	it("are all listed in package.json", () => {
		assert.deepEqual(
			contributed.map(entry => path.basename(entry.path)).sort(),
			[...files].sort()
		);
	});

	for (const entry of contributed) {
		const theme = readJson<IconTheme>("icons", path.basename(entry.path));
		describe(entry.label, () => {
			it("refers only to icons that exist", () => {
				for (const [id, definition] of Object.entries(theme.iconDefinitions)) {
					assert.ok(
						existsSync(path.join(ICONS, definition.iconPath)),
						`${id}: ${definition.iconPath}`
					);
				}
			});

			it("covers the same files as Stylesmith Pixel", () => {
				for (const mappings of ["fileExtensions", "fileNames", "languageIds"] as const) {
					assert.deepEqual(theme[mappings], original[mappings], mappings);
					assert.deepEqual(theme.light[mappings], original.light[mappings], mappings);
				}
			});

			// A theme's own set is drawn for that (dark) theme: check it on its side bar.
			const colorTheme = readdirSync(path.join(ROOT, "themes"))
				.map(file => readJson<ColorTheme & { name: string }>("themes", file))
				.find(t => t.name === entry.label.replace("Stylesmith Pixel ", "Stylesmith "));
			if (!colorTheme) return;
			const sideBar = (colorTheme.colors["sideBar.background"] ?? "").slice(0, 7);
			const drawn = Object.values(theme.iconDefinitions)
				.map(definition => definition.iconPath)
				.filter(iconPath => !iconPath.startsWith("./pixel/"));

			it(`stands out on the ${colorTheme.name} side bar (3:1)`, () => {
				assert.ok(drawn.length > 0);
				for (const iconPath of drawn) {
					const { band, other } = iconFills(
						readFileSync(path.join(ICONS, iconPath), "utf-8")
					);
					// The folders' darker crease and back are shading, not the outline.
					const shapes = iconPath.includes("_folder") ? other.slice(0, 1) : other;
					for (const fill of [...shapes, ...(band ? [band] : [])]) {
						const ratio = contrast(fill, sideBar);
						assert.ok(
							ratio >= 3,
							`${iconPath}: ${fill} on ${sideBar}: ${ratio.toFixed(2)}:1`
						);
					}
				}
			});

			it("has labels that read clearly on their bands (4.5:1)", () => {
				for (const iconPath of drawn) {
					const { band, label } = iconFills(
						readFileSync(path.join(ICONS, iconPath), "utf-8")
					);
					if (!band) continue;
					for (const fill of new Set(label)) {
						const ratio = contrast(fill, band);
						assert.ok(
							ratio >= 4.5,
							`${iconPath}: ${fill} on ${band}: ${ratio.toFixed(2)}:1`
						);
					}
				}
			});
		});
	}
});
