import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import opentype from "opentype.js";
import { PRESETS, PRODUCT_ICON_THEME } from "../presets";
import { manifest, ROOT } from "./files";

/**
 * The Stylesmith Pixel product icon theme (#67): every id it maps must be a real codicon, so
 * VS Code uses it, and every glyph must be in its font. Codicon ids come from @vscode/codicons
 * 0.0.36, the codicons of VS Code 1.93's time, so they also exist in the oldest supported VS Code.
 */

interface ProductIconTheme {
	fonts: { id: string; src: { path: string; format: string }[] }[];
	iconDefinitions: Record<string, { fontCharacter: string }>;
}

const contribution = manifest().contributes.productIconThemes.find(
	theme => theme.id === PRODUCT_ICON_THEME
);
const themePath = path.join(ROOT, contribution?.path ?? "");
const theme = JSON.parse(readFileSync(themePath, "utf-8")) as ProductIconTheme;
const fontFile = path.join(path.dirname(themePath), theme.fonts[0]!.src[0]!.path);
const font = opentype.loadSync(fontFile);
const codicons = JSON.parse(
	readFileSync(
		path.join(ROOT, "node_modules/@vscode/codicons/src/template/mapping.json"),
		"utf-8"
	)
) as Record<string, number>;

const PIXEL = font.unitsPerEm / 16;
const glyphOf = (id: string) =>
	font.charToGlyph(
		String.fromCodePoint(parseInt(theme.iconDefinitions[id]!.fontCharacter.slice(1), 16))
	);

/** The icons VS Code shows in a default window with a folder and a file open. */
const DEFAULT_WINDOW = [
	// The activity bar
	"files",
	"search",
	"source-control",
	"debug-alt",
	"extensions",
	"account",
	"settings-gear",
	// The explorer's title actions and views
	"new-file",
	"new-folder",
	"refresh",
	"collapse-all",
	"ellipsis",
	"chevron-right",
	"chevron-down",
	// The editor's tab and title actions
	"close",
	"split-horizontal",
	// The status bar
	"remote",
	"git-branch",
	"sync",
	"error",
	"warning",
	"bell",
	// The title bar's navigation and layout controls
	"arrow-left",
	"arrow-right",
	"layout-sidebar-left",
	"layout-panel",
	"layout-sidebar-right",
	"layout"
];

describe("Stylesmith Pixel product icons", () => {
	it("is contributed, with a font VS Code can load", () => {
		assert.ok(contribution, "contributed in package.json");
		assert.equal(theme.fonts[0]!.src[0]!.format, "opentype");
		assert.equal(font.unitsPerEm, 1600);
		assert.equal(
			font.ascender,
			font.unitsPerEm,
			"like the codicon font: the em box is the icon"
		);
		assert.equal(font.descender, 0);
	});

	for (const id of Object.keys(theme.iconDefinitions)) {
		describe(id, () => {
			it("replaces a real codicon", () => {
				assert.ok(id in codicons, `${id} is a codicon`);
			});

			it("has its glyph in the font, inside the 16-pixel grid, on whole pixels", () => {
				const glyph = glyphOf(id);
				assert.notEqual(glyph.index, 0, "not the missing glyph");
				const box = glyph.getBoundingBox();
				assert.ok(
					box.x1 >= 0 &&
						box.y1 >= 0 &&
						box.x2 <= font.unitsPerEm &&
						box.y2 <= font.unitsPerEm
				);
				for (const command of glyph.path.commands) {
					if (command.x !== undefined && command.y !== undefined) {
						assert.equal(command.x % PIXEL, 0);
						assert.equal(command.y % PIXEL, 0);
					}
				}
			});
		});
	}

	it("draws the activity bar icons in two-pixel steps, so they stay crisp at 24px", () => {
		for (const id of [
			"files",
			"search",
			"source-control",
			"debug-alt",
			"extensions",
			"account",
			"settings-gear"
		]) {
			for (const command of glyphOf(id).path.commands) {
				if (command.x !== undefined && command.y !== undefined) {
					assert.equal(command.x % (2 * PIXEL), 0, id);
					assert.equal(command.y % (2 * PIXEL), 0, id);
				}
			}
		}
	});

	it("covers most of the icons in a default window", () => {
		const covered = DEFAULT_WINDOW.filter(id => id in theme.iconDefinitions);
		for (const id of DEFAULT_WINDOW) assert.ok(id in codicons, `${id} is a codicon`);
		// 22 of 28: all but the title bar's navigation and layout controls.
		assert.equal(covered.length, 22);
		assert.ok(covered.length / DEFAULT_WINDOW.length > 0.75);
	});

	it("is set by every preset except High Contrast, which keeps VS Code's own icons", () => {
		for (const preset of PRESETS) {
			assert.equal(
				preset.productIconTheme,
				preset.id === "high-contrast" ? undefined : PRODUCT_ICON_THEME,
				preset.id
			);
		}
	});
});
