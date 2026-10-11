import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { colorDifference, contrast, mix, oklch, VISION } from "../color";
import { LEVELS, MAX_BODY_CONTRAST, MIN_COLOR_DIFFERENCE } from "../readability";
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

// How strongly the Problem Lens tints a problem's line, for each kind of theme.
const PROBLEM_TINT: Record<string, number> = {
	dark: LINE_TINT.dark,
	light: LINE_TINT.light,
	hc: LINE_TINT["hc-dark"],
	hcLight: LINE_TINT["hc-light"]
};

// Everyday parts of the interface that VS Code would otherwise draw in its own stock colors
// (#105): every theme sets them, from its own colors.
const EVERYDAY = [
	"editorLightBulb.foreground",
	"editorLightBulbAutoFix.foreground",
	"editorInlayHint.foreground",
	"editor.foldPlaceholderForeground",
	"editor.hoverHighlightBackground",
	"editor.findRangeHighlightBackground",
	"editor.inlineValuesBackground",
	"editor.snippetFinalTabstopHighlightBorder",
	"editorCodeLens.foreground",
	"editorOverviewRuler.findMatchForeground",
	"editorOverviewRuler.selectionHighlightForeground",
	"editorOverviewRuler.wordHighlightForeground",
	"editorOverviewRuler.wordHighlightStrongForeground",
	"editorOverviewRuler.bracketMatchForeground",
	"peekViewResult.selectionBackground",
	"peekViewResult.matchHighlightBackground",
	"peekViewEditor.matchHighlightBackground",
	...[
		"class",
		"interface",
		"enumerator",
		"enumeratorMember",
		"event",
		"field",
		"function",
		"method",
		"constructor",
		"variable"
	].map(kind => `symbolIcon.${kind}Foreground`),
	"statusBarItem.offlineBackground",
	"list.invalidItemForeground",
	"list.deemphasizedForeground",
	"list.dropBackground",
	"listFilterWidget.noMatchesOutline",
	"pickerGroup.foreground",
	...["error", "warning", "info"].flatMap(kind => [
		`inputValidation.${kind}Border`,
		`inputValidation.${kind}Background`
	]),
	"activityWarningBadge.background",
	"activityErrorBadge.background",
	"tab.activeModifiedBorder",
	"gitDecoration.renamedResourceForeground",
	"gitDecoration.submoduleResourceForeground",
	"terminalCommandDecoration.successBackground",
	"terminalCommandDecoration.errorBackground"
];

// Feature areas, stock-colored before #107: debugging, the merge editor, the Source Control
// graph, Chat, Testing, Extensions and charts.
const FEATURES = [
	"debugIcon.breakpointForeground",
	"debugIcon.breakpointCurrentStackframeForeground",
	"debugIcon.breakpointStackframeForeground",
	"debugIcon.breakpointDisabledForeground",
	"editor.stackFrameHighlightBackground",
	"editor.focusedStackFrameHighlightBackground",
	"debugExceptionWidget.border",
	"debugExceptionWidget.background",
	"debugView.exceptionLabelBackground",
	"debugView.stateLabelBackground",
	"debugView.valueChangedHighlight",
	...[
		"start",
		"restart",
		"stop",
		"pause",
		"continue",
		"stepOver",
		"stepInto",
		"stepOut",
		"stepBack"
	].map(name => `debugIcon.${name}Foreground`),
	...["name", "type", "string", "boolean", "error"].map(kind => `debugTokenExpression.${kind}`),
	"mergeEditor.change.background",
	"mergeEditor.change.word.background",
	"mergeEditor.changeBase.background",
	"mergeEditor.changeBase.word.background",
	"mergeEditor.conflictingLines.background",
	"mergeEditor.conflict.unhandledFocused.border",
	"mergeEditor.conflict.unhandledUnfocused.border",
	"mergeEditor.conflict.unhandled.minimapOverViewRuler",
	"mergeEditor.conflict.handledUnfocused.border",
	"mergeEditor.conflict.handled.minimapOverViewRuler",
	"diffEditor.move.border",
	"diffEditor.moveActive.border",
	"diffEditor.unchangedCodeBackground",
	...[1, 2, 3, 4, 5].map(i => `scmGraph.foreground${i}`),
	"scmGraph.historyItemBaseRefColor",
	"scmGraph.historyItemHoverAdditionsForeground",
	"scmGraph.historyItemHoverDeletionsForeground",
	"chat.linesAddedForeground",
	"chat.slashCommandBackground",
	"chat.slashCommandForeground",
	"chat.requestCodeBorder",
	"chat.checkpointSeparator",
	"chat.workingProgressStableIconForeground",
	"chat.workingProgressInsidersIconForeground",
	"chat.mcpCompatibilityWarningForeground",
	"agentsVoice.speakingForeground",
	"agentsVoice.speakingBackground",
	"testing.iconPassed",
	"testing.iconUnset",
	"testing.iconSkipped",
	"extensionIcon.starForeground",
	"extensionIcon.sponsorForeground",
	"extensionIcon.preReleaseForeground",
	"mcpIcon.starForeground",
	"profileBadge.background",
	"chart.line",
	"charts.green",
	"charts.purple"
];

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
			["inline blame", c("git.blame.editorDecorationForeground"), background, text],
			[
				"inline blame on the current line",
				c("git.blame.editorDecorationForeground"),
				c("editor.lineHighlightBackground"),
				text
			],
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
			["gutter: deleted", c("editorGutter.deletedBackground"), background, nonText],
			// Everyday colors (#105).
			["light bulb", c("editorLightBulb.foreground"), background, nonText],
			["auto-fix light bulb", c("editorLightBulbAutoFix.foreground"), background, nonText],
			["inlay hints", c("editorInlayHint.foreground"), background, text],
			["CodeLens", c("editorCodeLens.foreground"), background, text],
			["folded code", c("editor.foldPlaceholderForeground"), background, text],
			[
				"Command Palette group labels",
				c("pickerGroup.foreground"),
				c("quickInput.background"),
				text
			],
			["invalid list item", c("list.invalidItemForeground"), c("sideBar.background"), text],
			[
				"git: renamed",
				c("gitDecoration.renamedResourceForeground"),
				c("sideBar.background"),
				text
			],
			[
				"git: submodule",
				c("gitDecoration.submoduleResourceForeground"),
				c("sideBar.background"),
				text
			],
			[
				"offline status item",
				c("statusBarItem.offlineForeground"),
				c("statusBarItem.offlineBackground"),
				text
			],
			[
				"warning badge",
				c("activityWarningBadge.foreground"),
				c("activityWarningBadge.background"),
				text
			],
			[
				"error badge",
				c("activityErrorBadge.foreground"),
				c("activityErrorBadge.background"),
				text
			],
			[
				"unsaved tab marker",
				c("tab.activeModifiedBorder"),
				c("tab.activeBackground"),
				nonText
			],
			[
				"terminal command: success",
				c("terminalCommandDecoration.successBackground"),
				c("terminal.background"),
				nonText
			],
			[
				"terminal command: error",
				c("terminalCommandDecoration.errorBackground"),
				c("terminal.background"),
				nonText
			],
			...["error", "warning", "info"].map((kind): [string, string, string, number] => [
				`input ${kind} border`,
				c(`inputValidation.${kind}Border`),
				c(`inputValidation.${kind}Background`),
				nonText
			]),
			...EVERYDAY.filter(key => key.startsWith("symbolIcon.")).map(
				(key): [string, string, string, number] => [
					key,
					c(key),
					c("editorSuggestWidget.background"),
					nonText
				]
			),
			// Feature areas (#107): icons in the editor's glyph margin, the debug toolbar
			// and the side bar's views, and text in the views.
			["breakpoint", c("debugIcon.breakpointForeground"), background, nonText],
			[
				"paused frame",
				c("debugIcon.breakpointCurrentStackframeForeground"),
				background,
				nonText
			],
			...FEATURES.filter(key => /^debugIcon\.(?!breakpoint)/.test(key)).map(
				(key): [string, string, string, number] => [
					key,
					c(key),
					c("editorWidget.background"),
					nonText
				]
			),
			...FEATURES.filter(key => key.startsWith("debugTokenExpression.")).map(
				(key): [string, string, string, number] => [
					key,
					c(key),
					c("sideBar.background"),
					text
				]
			),
			[
				"exception label",
				c("debugView.exceptionLabelForeground"),
				c("debugView.exceptionLabelBackground"),
				text
			],
			[
				"debug state label",
				c("debugView.stateLabelForeground"),
				c("debugView.stateLabelBackground"),
				text
			],
			[
				"exception widget border",
				c("debugExceptionWidget.border"),
				c("debugExceptionWidget.background"),
				nonText
			],
			[
				"unhandled merge conflict",
				c("mergeEditor.conflict.unhandledFocused.border"),
				background,
				nonText
			],
			...[1, 2, 3, 4, 5].map((i): [string, string, string, number] => [
				`Source Control graph lane ${i}`,
				c(`scmGraph.foreground${i}`),
				c("sideBar.background"),
				nonText
			]),
			["Chat: lines added", c("chat.linesAddedForeground"), c("sideBar.background"), text],
			[
				"Chat: lines removed",
				c("chat.linesRemovedForeground"),
				c("sideBar.background"),
				text
			],
			[
				"Chat: slash command",
				c("chat.slashCommandForeground"),
				c("sideBar.background"),
				text
			],
			["test passed", c("testing.iconPassed"), c("sideBar.background"), nonText],
			["test failed", c("testing.iconFailed"), c("sideBar.background"), nonText],
			["test skipped", c("testing.iconSkipped"), c("sideBar.background"), nonText],
			[
				"extension rating star",
				c("extensionIcon.starForeground"),
				c("sideBar.background"),
				nonText
			],
			["profile badge", c("profileBadge.foreground"), c("profileBadge.background"), text]
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
		// line, and the underline under the exact code must stay visible on it.
		for (const kind of ["Error", "Warning", "Info"]) {
			const color = c(`editor${kind}.foreground`).slice(0, 7);
			const tint = PROBLEM_TINT[theme.type] ?? assert.fail(`no tint for ${theme.type}`);
			const line = mix(color, background.slice(0, 7), tint);
			const label = `${kind.toLowerCase()} line`;
			checks.push([`editor text on an ${label}`, c("editor.foreground"), line, strong]);
			checks.push([`the ${kind.toLowerCase()} message on its line`, color, line, text]);
			checks.push([`the ${kind.toLowerCase()} underline on its line`, color, line, nonText]);
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
			["terminal.ansiRed", "terminal.ansiGreen"],
			[
				"terminalCommandDecoration.successBackground",
				"terminalCommandDecoration.errorBackground"
			],
			["activityWarningBadge.background", "activityErrorBadge.background"],
			["chat.linesAddedForeground", "chat.linesRemovedForeground"],
			// Not testing.iconPassed and iconFailed: like VS Code's own, they stay green and red,
			// told apart by their shape (a check and a cross), not by color alone.
			["debugIcon.breakpointForeground", "debugIcon.breakpointCurrentStackframeForeground"]
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

			for (const [keys, label] of [
				[EVERYDAY, "the everyday colors (#105)"],
				[FEATURES, "the feature area colors (#107)"]
			] as const) {
				it(`sets ${label} from its own colors, not VS Code's stock ones`, () => {
					const listed = new Set([...EVERYDAY, ...FEATURES]);
					const own = [
						...Object.entries(theme.colors)
							.filter(([key]) => !listed.has(key))
							.map(([, color]) => color),
						...syntax.values()
					].map(color => color.slice(0, 7));
					for (const key of keys) {
						const color = c(key).slice(0, 7);
						const gap = Math.min(
							...own.map(o => colorDifference(color, o, VISION["normal vision"]))
						);
						assert.ok(
							gap <= 8,
							`${key} ${color} is ${gap.toFixed(1)} from the theme's colors`
						);
					}
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

describe("theme distinctness", () => {
	// The key colors that make a theme recognizable at a glance.
	const key = (file: string) => {
		const theme = readJson<Theme>("themes", file);
		const token = (scope: string) =>
			theme.tokenColors.find(rule => [rule.scope].flat()[0] === scope)?.settings.foreground ??
			"";
		return {
			background: theme.colors["editor.background"]!,
			text: theme.colors["editor.foreground"]!,
			comment: token("comment"),
			string: token("string"),
			keyword: token("keyword")
		};
	};
	const difference = (a: string, b: string) =>
		colorDifference(a.slice(0, 7), b.slice(0, 7), VISION["normal vision"]);

	it("keeps every two dark themes clearly apart in at least one key color", () => {
		// Phosphor and the earlier Digital Rain differed by no more than 13.9 in any of these (#87).
		const dark = files.filter(file => readJson<Theme>("themes", file).type === "dark");
		for (let i = 0; i < dark.length; i++) {
			for (let j = i + 1; j < dark.length; j++) {
				const a = key(dark[i]!);
				const b = key(dark[j]!);
				const widest = Math.max(
					...(Object.keys(a) as (keyof typeof a)[]).map(k => difference(a[k], b[k]))
				);
				assert.ok(
					widest >= MIN_COLOR_DIFFERENCE,
					`${dark[i]} and ${dark[j]}: ${widest.toFixed(1)}`
				);
			}
		}
	});

	it("keeps Simulation apart from Phosphor, as #87 asks", () => {
		const simulation = key("simulation-color-theme.json");
		const phosphor = key("phosphor-color-theme.json");
		for (const part of ["text", "comment", "string"] as const) {
			assert.ok(difference(simulation[part], phosphor[part]) >= 15, part);
		}
		assert.ok(difference(simulation.background, phosphor.background) >= 10, "background");
	});
});

describe("typography (#68)", () => {
	interface Styled {
		tokenColors: { scope: string | string[]; settings: { fontStyle?: string } }[];
		semanticTokenColors: Record<string, string | { italic?: boolean; bold?: boolean }>;
	}
	// Every theme belongs to one group: a new theme must be added here to pass.
	const GROUPS: Record<string, "terminal" | "film" | "everyday" | "high-contrast"> = {
		"phosphor-color-theme.json": "terminal",
		"amber-color-theme.json": "terminal",
		"ice-color-theme.json": "terminal",
		"neon-night-color-theme.json": "film",
		"monolith-color-theme.json": "film",
		"glass-lab-color-theme.json": "film",
		"vault-color-theme.json": "film",
		"simulation-color-theme.json": "film",
		"steel-and-rust-color-theme.json": "film",
		"brass-color-theme.json": "film",
		"tea-garden-color-theme.json": "film",
		"sunroom-color-theme.json": "film",
		"countdown-color-theme.json": "film",
		"overlay-color-theme.json": "film",
		"deep-desert-color-theme.json": "film",
		"haze-color-theme.json": "film",
		"grid-color-theme.json": "film",
		"corridor-color-theme.json": "terminal",
		"teal-terminal-color-theme.json": "terminal",
		"horizon-color-theme.json": "film",
		"command-deck-color-theme.json": "film",
		"daylight-color-theme.json": "everyday",
		"neon-high-contrast-color-theme.json": "high-contrast",
		"daylight-high-contrast-color-theme.json": "high-contrast"
	};
	const styles = (file: string) => {
		const theme = readJson<Styled>("themes", file);
		const byScope = new Map<string, string>();
		for (const rule of theme.tokenColors) {
			for (const scope of [rule.scope].flat())
				byScope.set(scope, rule.settings.fontStyle ?? "");
		}
		const semantic = Object.values(theme.semanticTokenColors).filter(
			value => typeof value === "object"
		) as { italic?: boolean; bold?: boolean }[];
		return {
			of: (scope: string) => byScope.get(scope) ?? "",
			all: [...byScope.entries()],
			semanticItalic: semantic.some(value => value.italic),
			semanticBold: semantic.some(value => value.bold)
		};
	};

	it("puts every theme in a group", () => {
		assert.deepEqual(Object.keys(GROUPS).sort(), [...files].sort());
	});

	for (const [file, group] of Object.entries(GROUPS)) {
		it(`${file}: follows the ${group} rule`, () => {
			const s = styles(file);
			const italic = s.all
				.filter(([, style]) => style.includes("italic"))
				.map(([scope]) => scope);
			const bold = s.all
				.filter(([, style]) => style.includes("bold"))
				.map(([scope]) => scope);
			switch (group) {
				case "terminal":
					// One weight and no italics, as on the terminals of the era.
					assert.deepEqual(italic, [], "no italics");
					assert.deepEqual(bold, [], "no bold");
					assert.ok(
						!s.semanticItalic && !s.semanticBold,
						"none in semantic colors either"
					);
					assert.equal(
						s.of("markup.italic"),
						"underline",
						"markdown emphasis stays visible"
					);
					break;
				case "film":
					assert.equal(s.of("comment"), "italic");
					assert.equal(s.of("variable.parameter"), "italic");
					break;
				case "everyday":
					// Italic comments, and markdown italics as written.
					assert.deepEqual(italic, [
						"comment",
						"punctuation.definition.comment",
						"markup.italic"
					]);
					assert.ok(!s.semanticItalic);
					break;
				case "high-contrast":
					// Some readers with low vision find italics harder to read.
					assert.deepEqual(italic, [], "no italics");
					assert.ok(!s.semanticItalic);
					assert.equal(s.of("markup.italic"), "underline");
					break;
			}
		});
	}
});

describe("terminal colors (#100)", () => {
	// Programs rely on what the ANSI colors mean (red for errors, green for success), so each
	// keeps its hue family, in OKLCH hue degrees. Within it, a theme tints it to fit.
	const FAMILIES: Record<string, [number, number][]> = {
		red: [
			[0, 50],
			[340, 360]
		],
		yellow: [[55, 118]],
		green: [[115, 178]],
		cyan: [[176, 245]],
		blue: [[230, 292]],
		magenta: [[285, 352]]
	};
	// Amber is a monochrome monitor: every color is a shade of amber, by design.
	const MONOCHROME = ["amber-color-theme.json"];
	const ansi = (theme: Theme, name: string) => theme.colors[`terminal.ansi${name}`]!.slice(0, 7);
	const slots = Object.keys(FAMILIES).flatMap(f => {
		const name = f[0]!.toUpperCase() + f.slice(1);
		return [
			[f, name],
			[f, `Bright${name}`]
		] as const;
	});

	it("gives every theme its own terminal palette", () => {
		const seen = new Map<string, string>();
		for (const file of files) {
			const theme = readJson<Theme>("themes", file);
			const key = slots.map(([, name]) => ansi(theme, name)).join();
			assert.equal(
				seen.get(key),
				undefined,
				`${file} has the same terminal colors as ${seen.get(key)}`
			);
			seen.set(key, file);
		}
	});

	for (const file of files) {
		const theme = readJson<Theme>("themes", file);
		// The theme's own syntax colors; status colors (errors, git changes) are bright everywhere.
		const STATUS = ["invalid", "markup.inserted", "markup.deleted"];
		const syntax = theme.tokenColors
			.filter(rule => !STATUS.includes([rule.scope].flat()[0]!))
			.flatMap(rule => rule.settings.foreground ?? []);
		const themeChroma = Math.max(...syntax.map(color => oklch(color.slice(0, 7)).c));

		if (!MONOCHROME.includes(file)) {
			it(`${file}: keeps every terminal color in its hue family`, () => {
				for (const [family, name] of slots) {
					const { h } = oklch(ansi(theme, name));
					assert.ok(
						FAMILIES[family]!.some(([from, to]) => h >= from && h <= to),
						`${name} ${ansi(theme, name)} has hue ${h.toFixed(0)}`
					);
				}
			});
		}

		it(`${file}: no terminal color is more saturated than the theme`, () => {
			for (const [family, name] of slots) {
				// Red and green must read as colors even in a muted theme.
				const limit = Math.max(
					themeChroma + 0.03,
					family === "red" || family === "green" ? 0.12 : 0
				);
				const { c } = oklch(ansi(theme, name));
				assert.ok(
					c <= limit,
					`${name} ${ansi(theme, name)}: chroma ${c.toFixed(3)} > ${limit.toFixed(3)}`
				);
			}
		});
	}
});
