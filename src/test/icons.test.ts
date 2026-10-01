import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { contrast } from "../color";

// Tests run from out/test, two levels below the project root.
const ROOT = path.join(__dirname, "..", "..");
const ICONS = path.join(ROOT, "icons");

/** Editor backgrounds of Stylesmith's themes, by the icon variant VS Code uses with them. */
function editorBackgrounds(): Record<"dark" | "light", string[]> {
	const result = { dark: ["#1e1e1e", "#1f1f1f"], light: ["#ffffff", "#f3f3f3"] };
	for (const file of readdirSync(path.join(ROOT, "themes"))) {
		const theme = JSON.parse(readFileSync(path.join(ROOT, "themes", file), "utf-8"));
		const variant = theme.type === "light" || theme.type === "hcLight" ? "light" : "dark";
		result[variant].push(theme.colors["editor.background"].slice(0, 7));
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
				for (const background of backgrounds[variant]) {
					const ratio = contrast(fill, background);
					assert.ok(ratio >= 3, `${fill} on ${background}: ${ratio.toFixed(2)}:1`);
				}
			});
		}
	}
});

describe("pixel icon theme", () => {
	it("refers only to icons that exist", () => {
		const theme = JSON.parse(readFileSync(path.join(ICONS, "pixel-icon-theme.json"), "utf-8"));
		for (const [id, definition] of Object.entries<{ iconPath: string }>(
			theme.iconDefinitions
		)) {
			assert.ok(
				existsSync(path.join(ICONS, definition.iconPath)),
				`${id}: ${definition.iconPath}`
			);
		}
	});
});
