import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { colorDifference, contrast, mix, VISION } from "../color";
import { LINE_TINT } from "../problems";
import { manifest, readJson } from "./files";

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

// VS Code's package.json uiTheme for each theme type.
const UI_THEME: Record<string, string> = {
	dark: "vs-dark",
	light: "vs",
	hc: "hc-black",
	hcLight: "hc-light"
};

// WCAG 2 contrast levels: 4.5:1 for normal text (AA, 1.4.3), 7:1 for enhanced contrast
// (AAA, 1.4.6), and 3:1 for UI parts you need to find, like the cursor (non-text, 1.4.11).
// High contrast themes are held to AAA for all text and 4.5:1 for non-text parts.
const LEVELS = {
	normal: { strong: 7, text: 4.5, nonText: 3 },
	high: { strong: 7, text: 7, nonText: 4.5 }
};
// Above this, text starts to glare. High contrast themes are exempt: maximum contrast is their job.
const MAX_BODY_CONTRAST = 16;
// Colors that carry meaning must stay this far apart (CIE76 ΔE) with every kind of color
// blindness. About 2 is barely noticeable; 15 and more is clearly different at a glance.
const MIN_COLOR_DIFFERENCE = 15;

// How strongly the Problem Lens tints a problem's line, for each kind of theme.
const PROBLEM_TINT: Record<string, number> = {
	dark: LINE_TINT.dark,
	light: LINE_TINT.light,
	hc: LINE_TINT["hc-dark"],
	hcLight: LINE_TINT["hc-light"]
};

const files = readdirSync(THEMES_DIR).filter(file => file.endsWith("-color-theme.json"));
const contributed = manifest().contributes.themes;

describe("color themes", () => {
	it("are all listed in package.json", () => {
		assert.ok(files.length > 0);
		assert.deepEqual(
			contributed.map(entry => path.basename(entry.path)).sort(),
			[...files].sort()
		);
	});

	for (const file of files) {
		const theme = readJson<Theme>("themes", file);
		// A color the theme must define; a missing one fails with its name.
		const c = (key: string): string => {
			const value = theme.colors[key];
			assert.ok(value, `${file} defines ${key}`);
			return value;
		};
		const background = c("editor.background");
		const highContrast = theme.type === "hc" || theme.type === "hcLight";
		const isLight = theme.type === "light" || theme.type === "hcLight";
		const { strong, text, nonText } = highContrast ? LEVELS.high : LEVELS.normal;

		// [label, foreground, background, minimum contrast]
		const checks: [string, string, string, number][] = [
			["editor text", c("editor.foreground"), background, strong],
			["active line number", c("editorLineNumber.activeForeground"), background, strong],
			["line numbers", c("editorLineNumber.foreground"), background, text],
			["side bar", c("sideBar.foreground"), c("sideBar.background"), strong],
			["descriptions", c("descriptionForeground"), c("sideBar.background"), text],
			["status bar", c("statusBar.foreground"), c("statusBar.background"), text],
			["title bar", c("titleBar.activeForeground"), c("titleBar.activeBackground"), text],
			["active tab", c("tab.activeForeground"), c("tab.activeBackground"), strong],
			["inactive tab", c("tab.inactiveForeground"), c("tab.inactiveBackground"), text],
			[
				"inactive activity bar icon",
				c("activityBar.inactiveForeground"),
				c("activityBar.background"),
				text
			],
			[
				"inactive panel title",
				c("panelTitle.inactiveForeground"),
				c("panel.background"),
				text
			],
			[
				"selected list item",
				c("list.activeSelectionForeground"),
				c("list.activeSelectionBackground"),
				strong
			],
			["input", c("input.foreground"), c("input.background"), strong],
			["input placeholder", c("input.placeholderForeground"), c("input.background"), text],
			["button", c("button.foreground"), c("button.background"), text],
			["badge", c("badge.foreground"), c("badge.background"), text],
			[
				"suggestions",
				c("editorSuggestWidget.foreground"),
				c("editorSuggestWidget.background"),
				strong
			],
			["breadcrumbs", c("breadcrumb.foreground"), background, text],
			["terminal text", c("terminal.foreground"), c("terminal.background"), strong],
			["error text", c("editorError.foreground"), background, text],
			["warning text", c("editorWarning.foreground"), background, text],
			[
				"git: added",
				c("gitDecoration.addedResourceForeground"),
				c("sideBar.background"),
				text
			],
			[
				"git: modified",
				c("gitDecoration.modifiedResourceForeground"),
				c("sideBar.background"),
				text
			],
			[
				"git: deleted",
				c("gitDecoration.deletedResourceForeground"),
				c("sideBar.background"),
				text
			],
			// Non-text contrast: markers that show where you are.
			["cursor", c("editorCursor.foreground"), background, nonText],
			[
				"cursor on the current line",
				c("editorCursor.foreground"),
				c("editor.lineHighlightBackground"),
				nonText
			],
			["focus outline", c("focusBorder"), c("sideBar.background"), nonText],
			["active tab marker", c("tab.activeBorder"), c("tab.activeBackground"), nonText],
			[
				"active activity bar marker",
				c("activityBar.activeBorder"),
				c("activityBar.background"),
				nonText
			],
			[
				"active panel title marker",
				c("panelTitle.activeBorder"),
				c("panel.background"),
				nonText
			],
			["matching bracket", c("editorBracketMatch.border"), background, nonText],
			["find match border", c("editor.findMatchBorder"), background, nonText],
			["terminal cursor", c("terminalCursor.foreground"), c("terminal.background"), nonText],
			["gutter: added", c("editorGutter.addedBackground"), background, nonText],
			["gutter: modified", c("editorGutter.modifiedBackground"), background, nonText],
			["gutter: deleted", c("editorGutter.deletedBackground"), background, nonText]
		];
		if (highContrast) {
			checks.push(["contrast border", c("contrastBorder"), background, nonText]);
			checks.push(["active contrast border", c("contrastActiveBorder"), background, nonText]);
		}

		// Terminal programs use "black" (or "white" in light themes) for background-like text.
		const backgroundLike = isLight
			? ["terminal.ansiWhite", "terminal.ansiBrightWhite"]
			: ["terminal.ansiBlack"];
		for (const [name, color] of Object.entries(theme.colors)) {
			if (name.startsWith("terminal.ansi") && !backgroundLike.includes(name)) {
				checks.push([name, color, c("terminal.background"), text]);
			}
		}

		const syntax = new Map<string, string>();
		for (const rule of theme.tokenColors) {
			const [scope] = rule.scope;
			if (scope && rule.settings.foreground) syntax.set(scope, rule.settings.foreground);
		}
		for (const [name, value] of Object.entries(theme.semanticTokenColors)) {
			syntax.set(`semantic ${name}`, typeof value === "string" ? value : value.foreground);
		}
		for (let i = 1; i <= 6; i++) {
			syntax.set(`bracket pair ${i}`, c(`editorBracketHighlight.foreground${i}`));
		}
		for (const [scope, color] of syntax) {
			checks.push([`syntax: ${scope}`, color, background, text]);
			checks.push([
				`syntax: ${scope} on the current line`,
				color,
				c("editor.lineHighlightBackground"),
				text
			]);
		}

		// The Problem Lens: code and the inline message must stay readable on a problem's tinted
		// line, and the outline around the exact code must stay visible on it.
		for (const kind of ["Error", "Warning", "Info"]) {
			const color = c(`editor${kind}.foreground`).slice(0, 7);
			const tint = PROBLEM_TINT[theme.type] ?? assert.fail(`no tint for ${theme.type}`);
			const line = mix(color, background.slice(0, 7), tint);
			const label = `${kind.toLowerCase()} line`;
			checks.push([`editor text on an ${label}`, c("editor.foreground"), line, strong]);
			checks.push([`the ${kind.toLowerCase()} message on its line`, color, line, text]);
			checks.push([`the ${kind.toLowerCase()} outline on its line`, color, line, nonText]);
			for (const [scope, syntaxColor] of syntax) {
				checks.push([`syntax: ${scope} on an ${label}`, syntaxColor, line, text]);
			}
		}

		// Colors that tell things apart must stay apart with color blindness.
		const distinct: [string, string][] = [
			["editorGutter.addedBackground", "editorGutter.deletedBackground"],
			["editorGutter.addedBackground", "editorGutter.modifiedBackground"],
			["editorGutter.modifiedBackground", "editorGutter.deletedBackground"],
			["editorError.foreground", "editorWarning.foreground"],
			["terminal.ansiRed", "terminal.ansiGreen"]
		];

		describe(theme.name, () => {
			it("is listed with the right label and kind", () => {
				const entry = contributed.find(e => path.basename(e.path) === file);
				assert.equal(entry?.label, theme.name);
				assert.equal(entry?.uiTheme, UI_THEME[theme.type]);
			});

			it("uses valid colors", () => {
				for (const [name, color] of Object.entries(theme.colors)) {
					assert.match(color, /^#[0-9a-f]{6}([0-9a-f]{2})?$/i, name);
				}
			});

			if (!highContrast) {
				it("is easy on the eyes: no glare from pure white and black", () => {
					assert.ok(!["#000000", "#ffffff"].includes(background.toLowerCase()));
					assert.ok(
						!["#000000", "#ffffff"].includes(c("editor.foreground").toLowerCase())
					);
					const body = contrast(c("editor.foreground"), background);
					assert.ok(body <= MAX_BODY_CONTRAST, `editor text contrast ${body.toFixed(2)}`);
				});
			}

			for (const [label, foreground, back, minimum] of checks) {
				it(`has readable ${label} (at least ${minimum}:1)`, () => {
					assert.ok(foreground && back, `${label} colors are set`);
					const ratio = contrast(foreground.slice(0, 7), back.slice(0, 7));
					assert.ok(ratio >= minimum, `${foreground} on ${back}: ${ratio.toFixed(2)}:1`);
				});
			}

			for (const [a, b] of distinct) {
				it(`keeps ${a} and ${b} apart with color blindness`, () => {
					for (const [vision, matrix] of Object.entries(VISION)) {
						const difference = colorDifference(
							c(a).slice(0, 7),
							c(b).slice(0, 7),
							matrix
						);
						assert.ok(
							difference >= MIN_COLOR_DIFFERENCE,
							`${vision}: ${c(a)} vs ${c(b)} differ by only ${difference.toFixed(1)}`
						);
					}
				});
			}
		});
	}
});
