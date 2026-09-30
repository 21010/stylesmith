import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";

// Tests run from out/test, two levels below the project root.
const ROOT = path.join(__dirname, "..", "..");
const THEMES_DIR = path.join(ROOT, "themes");

interface Theme {
	name: string;
	type: string;
	colors: Record<string, string>;
	tokenColors: { scope: string[]; settings: { foreground?: string } }[];
	semanticTokenColors: Record<string, string | { foreground: string }>;
}

// WCAG 2 contrast levels: 4.5:1 for normal text (AA, 1.4.3), 7:1 for enhanced contrast
// (AAA, 1.4.6), and 3:1 for UI parts you need to find, like the cursor (non-text, 1.4.11).
const AA = 4.5;
const AAA = 7;
const NON_TEXT = 3;
// Above this, light text on a dark background starts to glare.
const MAX_BODY_CONTRAST = 16;

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map(i => {
		const v = parseInt(hex.slice(i, i + 2), 16) / 255;
		return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (light + 0.05) / (dark + 0.05);
}

const files = readdirSync(THEMES_DIR).filter(file => file.endsWith("-color-theme.json"));
const contributed: { label: string; uiTheme: string; path: string }[] = JSON.parse(
	readFileSync(path.join(ROOT, "package.json"), "utf-8")
).contributes.themes;

describe("color themes", () => {
	it("are all listed in package.json", () => {
		assert.ok(files.length > 0);
		assert.deepEqual(
			contributed.map(entry => path.basename(entry.path)).sort(),
			[...files].sort()
		);
	});

	for (const file of files) {
		const theme: Theme = JSON.parse(readFileSync(path.join(THEMES_DIR, file), "utf-8"));
		const c = theme.colors;
		const background = c["editor.background"];

		// [label, foreground, background, minimum contrast]
		const checks: [string, string, string, number][] = [
			["editor text", c["editor.foreground"], background, AAA],
			["active line number", c["editorLineNumber.activeForeground"], background, AAA],
			["line numbers", c["editorLineNumber.foreground"], background, AA],
			["side bar", c["sideBar.foreground"], c["sideBar.background"], AAA],
			["descriptions", c["descriptionForeground"], c["sideBar.background"], AA],
			["status bar", c["statusBar.foreground"], c["statusBar.background"], AA],
			["title bar", c["titleBar.activeForeground"], c["titleBar.activeBackground"], AA],
			["active tab", c["tab.activeForeground"], c["tab.activeBackground"], AAA],
			["inactive tab", c["tab.inactiveForeground"], c["tab.inactiveBackground"], AA],
			[
				"inactive activity bar icon",
				c["activityBar.inactiveForeground"],
				c["activityBar.background"],
				AA
			],
			["inactive panel title", c["panelTitle.inactiveForeground"], c["panel.background"], AA],
			[
				"selected list item",
				c["list.activeSelectionForeground"],
				c["list.activeSelectionBackground"],
				AAA
			],
			["input", c["input.foreground"], c["input.background"], AAA],
			["input placeholder", c["input.placeholderForeground"], c["input.background"], AA],
			["button", c["button.foreground"], c["button.background"], AA],
			["badge", c["badge.foreground"], c["badge.background"], AA],
			[
				"suggestions",
				c["editorSuggestWidget.foreground"],
				c["editorSuggestWidget.background"],
				AAA
			],
			["breadcrumbs", c["breadcrumb.foreground"], background, AA],
			["terminal text", c["terminal.foreground"], c["terminal.background"], AAA],
			// Non-text contrast: markers that show where you are.
			["cursor", c["editorCursor.foreground"], background, NON_TEXT],
			[
				"cursor on the current line",
				c["editorCursor.foreground"],
				c["editor.lineHighlightBackground"],
				NON_TEXT
			],
			["focus outline", c["focusBorder"], c["sideBar.background"], NON_TEXT],
			["active tab marker", c["tab.activeBorder"], c["tab.activeBackground"], NON_TEXT],
			[
				"active activity bar marker",
				c["activityBar.activeBorder"],
				c["activityBar.background"],
				NON_TEXT
			],
			[
				"active panel title marker",
				c["panelTitle.activeBorder"],
				c["panel.background"],
				NON_TEXT
			],
			["matching bracket", c["editorBracketMatch.border"], background, NON_TEXT],
			["find match border", c["editor.findMatchBorder"], background, NON_TEXT],
			["terminal cursor", c["terminalCursor.foreground"], c["terminal.background"], NON_TEXT]
		];

		for (const [name, color] of Object.entries(c)) {
			if (name.startsWith("terminal.ansi") && name !== "terminal.ansiBlack") {
				checks.push([name, color, c["terminal.background"], AA]);
			}
		}

		const syntax = new Map<string, string>();
		for (const rule of theme.tokenColors) {
			if (rule.settings.foreground) syntax.set(rule.scope[0], rule.settings.foreground);
		}
		for (const [name, value] of Object.entries(theme.semanticTokenColors)) {
			syntax.set(`semantic ${name}`, typeof value === "string" ? value : value.foreground);
		}
		for (const [scope, color] of syntax) {
			checks.push([`syntax: ${scope}`, color, background, AA]);
			checks.push([
				`syntax: ${scope} on the current line`,
				color,
				c["editor.lineHighlightBackground"],
				AA
			]);
		}

		describe(theme.name, () => {
			it("is dark and listed with the right label", () => {
				assert.equal(theme.type, "dark");
				const entry = contributed.find(e => path.basename(e.path) === file);
				assert.equal(entry?.label, theme.name);
				assert.equal(entry?.uiTheme, "vs-dark");
			});

			it("uses valid colors", () => {
				for (const [name, color] of Object.entries(c)) {
					assert.match(color, /^#[0-9a-f]{6}([0-9a-f]{2})?$/i, name);
				}
			});

			it("is easy on the eyes: no glare from pure white on pure black", () => {
				assert.notEqual(background.toLowerCase(), "#000000");
				assert.notEqual(c["editor.foreground"].toLowerCase(), "#ffffff");
				const body = contrast(c["editor.foreground"], background);
				assert.ok(body <= MAX_BODY_CONTRAST, `editor text contrast ${body.toFixed(2)}`);
			});

			for (const [label, foreground, back, minimum] of checks) {
				it(`has readable ${label} (at least ${minimum}:1)`, () => {
					assert.ok(foreground && back, `${label} colors are set`);
					const ratio = contrast(foreground.slice(0, 7), back.slice(0, 7));
					assert.ok(ratio >= minimum, `${foreground} on ${back}: ${ratio.toFixed(2)}:1`);
				});
			}
		});
	}
});
