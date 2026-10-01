import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { LINE_TINT } from "../problems";

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

function linear(hex: string): number[] {
	return [1, 3, 5].map(i => {
		const v = parseInt(hex.slice(i, i + 2), 16) / 255;
		return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
	});
}

function luminance(hex: string): number {
	const [r, g, b] = linear(hex);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (light + 0.05) / (dark + 0.05);
}

// Machado, Oliveira & Fernandes (2009): full-severity simulations of the three kinds of
// dichromacy, applied in linear RGB.
const VISION: Record<string, number[]> = {
	"normal vision": [1, 0, 0, 0, 1, 0, 0, 0, 1],
	protanopia: [
		0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998
	],
	deuteranopia: [
		0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881
	],
	tritanopia: [
		1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039
	]
};

function simulate(hex: string, m: number[]): number[] {
	const c = linear(hex);
	return [0, 1, 2].map(r =>
		Math.min(1, Math.max(0, m[r * 3] * c[0] + m[r * 3 + 1] * c[1] + m[r * 3 + 2] * c[2]))
	);
}

function lab([r, g, b]: number[]): number[] {
	const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
	const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047);
	const y = f(0.2126 * r + 0.7152 * g + 0.0722 * b);
	const z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
	return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function colorDifference(a: string, b: string, m: number[]): number {
	const [p, q] = [lab(simulate(a, m)), lab(simulate(b, m))];
	return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

// How strongly the Problem Lens tints a problem's line, for each kind of theme.
const PROBLEM_TINT: Record<string, number> = {
	dark: LINE_TINT.dark,
	light: LINE_TINT.light,
	hc: LINE_TINT["hc-dark"],
	hcLight: LINE_TINT["hc-light"]
};

/** CSS color-mix(in srgb, color p%, background): what the tinted background looks like. */
function mix(color: string, background: string, percent: number): string {
	const channels = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
	const [a, b] = [channels(color), channels(background)];
	const t = percent / 100;
	return (
		"#" +
		a
			.map((v, i) =>
				Math.round(v * t + b[i] * (1 - t))
					.toString(16)
					.padStart(2, "0")
			)
			.join("")
	);
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
		const highContrast = theme.type === "hc" || theme.type === "hcLight";
		const isLight = theme.type === "light" || theme.type === "hcLight";
		const { strong, text, nonText } = highContrast ? LEVELS.high : LEVELS.normal;

		// [label, foreground, background, minimum contrast]
		const checks: [string, string, string, number][] = [
			["editor text", c["editor.foreground"], background, strong],
			["active line number", c["editorLineNumber.activeForeground"], background, strong],
			["line numbers", c["editorLineNumber.foreground"], background, text],
			["side bar", c["sideBar.foreground"], c["sideBar.background"], strong],
			["descriptions", c["descriptionForeground"], c["sideBar.background"], text],
			["status bar", c["statusBar.foreground"], c["statusBar.background"], text],
			["title bar", c["titleBar.activeForeground"], c["titleBar.activeBackground"], text],
			["active tab", c["tab.activeForeground"], c["tab.activeBackground"], strong],
			["inactive tab", c["tab.inactiveForeground"], c["tab.inactiveBackground"], text],
			[
				"inactive activity bar icon",
				c["activityBar.inactiveForeground"],
				c["activityBar.background"],
				text
			],
			[
				"inactive panel title",
				c["panelTitle.inactiveForeground"],
				c["panel.background"],
				text
			],
			[
				"selected list item",
				c["list.activeSelectionForeground"],
				c["list.activeSelectionBackground"],
				strong
			],
			["input", c["input.foreground"], c["input.background"], strong],
			["input placeholder", c["input.placeholderForeground"], c["input.background"], text],
			["button", c["button.foreground"], c["button.background"], text],
			["badge", c["badge.foreground"], c["badge.background"], text],
			[
				"suggestions",
				c["editorSuggestWidget.foreground"],
				c["editorSuggestWidget.background"],
				strong
			],
			["breadcrumbs", c["breadcrumb.foreground"], background, text],
			["terminal text", c["terminal.foreground"], c["terminal.background"], strong],
			["error text", c["editorError.foreground"], background, text],
			["warning text", c["editorWarning.foreground"], background, text],
			[
				"git: added",
				c["gitDecoration.addedResourceForeground"],
				c["sideBar.background"],
				text
			],
			[
				"git: modified",
				c["gitDecoration.modifiedResourceForeground"],
				c["sideBar.background"],
				text
			],
			[
				"git: deleted",
				c["gitDecoration.deletedResourceForeground"],
				c["sideBar.background"],
				text
			],
			// Non-text contrast: markers that show where you are.
			["cursor", c["editorCursor.foreground"], background, nonText],
			[
				"cursor on the current line",
				c["editorCursor.foreground"],
				c["editor.lineHighlightBackground"],
				nonText
			],
			["focus outline", c["focusBorder"], c["sideBar.background"], nonText],
			["active tab marker", c["tab.activeBorder"], c["tab.activeBackground"], nonText],
			[
				"active activity bar marker",
				c["activityBar.activeBorder"],
				c["activityBar.background"],
				nonText
			],
			[
				"active panel title marker",
				c["panelTitle.activeBorder"],
				c["panel.background"],
				nonText
			],
			["matching bracket", c["editorBracketMatch.border"], background, nonText],
			["find match border", c["editor.findMatchBorder"], background, nonText],
			["terminal cursor", c["terminalCursor.foreground"], c["terminal.background"], nonText],
			["gutter: added", c["editorGutter.addedBackground"], background, nonText],
			["gutter: modified", c["editorGutter.modifiedBackground"], background, nonText],
			["gutter: deleted", c["editorGutter.deletedBackground"], background, nonText]
		];
		if (highContrast) {
			checks.push(["contrast border", c["contrastBorder"], background, nonText]);
			checks.push(["active contrast border", c["contrastActiveBorder"], background, nonText]);
		}

		// Terminal programs use "black" (or "white" in light themes) for background-like text.
		const backgroundLike = isLight
			? ["terminal.ansiWhite", "terminal.ansiBrightWhite"]
			: ["terminal.ansiBlack"];
		for (const [name, color] of Object.entries(c)) {
			if (name.startsWith("terminal.ansi") && !backgroundLike.includes(name)) {
				checks.push([name, color, c["terminal.background"], text]);
			}
		}

		const syntax = new Map<string, string>();
		for (const rule of theme.tokenColors) {
			if (rule.settings.foreground) syntax.set(rule.scope[0], rule.settings.foreground);
		}
		for (const [name, value] of Object.entries(theme.semanticTokenColors)) {
			syntax.set(`semantic ${name}`, typeof value === "string" ? value : value.foreground);
		}
		for (let i = 1; i <= 6; i++) {
			syntax.set(`bracket pair ${i}`, c[`editorBracketHighlight.foreground${i}`]);
		}
		for (const [scope, color] of syntax) {
			checks.push([`syntax: ${scope}`, color, background, text]);
			checks.push([
				`syntax: ${scope} on the current line`,
				color,
				c["editor.lineHighlightBackground"],
				text
			]);
		}

		// The Problem Lens: code and the inline message must stay readable on a problem's tinted
		// line, and the outline around the exact code must stay visible on it.
		for (const kind of ["Error", "Warning", "Info"]) {
			const color = c[`editor${kind}.foreground`].slice(0, 7);
			const line = mix(color, background.slice(0, 7), PROBLEM_TINT[theme.type]);
			const label = `${kind.toLowerCase()} line`;
			checks.push([`editor text on an ${label}`, c["editor.foreground"], line, strong]);
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
				for (const [name, color] of Object.entries(c)) {
					assert.match(color, /^#[0-9a-f]{6}([0-9a-f]{2})?$/i, name);
				}
			});

			if (!highContrast) {
				it("is easy on the eyes: no glare from pure white and black", () => {
					assert.ok(!["#000000", "#ffffff"].includes(background.toLowerCase()));
					assert.ok(
						!["#000000", "#ffffff"].includes(c["editor.foreground"].toLowerCase())
					);
					const body = contrast(c["editor.foreground"], background);
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
							c[a].slice(0, 7),
							c[b].slice(0, 7),
							matrix
						);
						assert.ok(
							difference >= MIN_COLOR_DIFFERENCE,
							`${vision}: ${c[a]} vs ${c[b]} differ by only ${difference.toFixed(1)}`
						);
					}
				});
			}
		});
	}
});
