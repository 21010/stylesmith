// Builds the Stylesmith color themes in themes/ from the palettes in data/palettes.mjs.
// Run with: npm run themes
//
// Every theme is dark, retro or cyberpunk in style, and easy on the eyes: text has high
// contrast without pure white on pure black. src/test/themes.test.ts checks the contrast.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { palettes } from "./data/palettes.mjs";

/**
 * Typography per group of themes (#68), on top of the colors:
 * - terminal: character terminals of the era had no italics; emphasis came from brightness
 *   alone. Markdown emphasis stays visible: italic becomes underline, bold brighter text.
 * - film: modern editor typography, italic comments and parameters.
 * - everyday: italic comments only.
 * - high-contrast: no italics at all, since some readers with low vision find them harder to
 *   read; markdown italic becomes underline.
 * Palettes with boldKeywords also set keywords in bold. src/test/themes.test.ts enforces this.
 */
const TYPOGRAPHY = {
	terminal: { comment: "", parameter: "", heading: "", italic: "underline", bold: "" },
	film: {
		comment: "italic",
		parameter: "italic",
		heading: "bold",
		italic: "italic",
		bold: "bold"
	},
	everyday: { comment: "italic", parameter: "", heading: "bold", italic: "italic", bold: "bold" },
	"high-contrast": {
		comment: "",
		parameter: "",
		heading: "bold",
		italic: "underline",
		bold: "bold"
	}
};

/** A fontStyle setting, or nothing for plain text. */
const style = fontStyle => (fontStyle ? { fontStyle } : {});

// VS Code's theme "type" for each kind of palette.
const TYPES = { dark: "dark", light: "light", "hc-dark": "hc", "hc-light": "hcLight" };

function theme(p) {
	const t = p.tokens;
	const type = TYPOGRAPHY[p.typography];
	if (!type) throw new Error(`${p.id}: unknown typography "${p.typography}"`);
	const keywordStyle = p.boldKeywords ? "bold" : "";
	const kind = p.kind ?? "dark";
	const highContrast = kind.startsWith("hc-");
	// Bracket pairs cycle through six colors from the theme's own syntax colors.
	const brackets = [p.accent, t.keyword, t.string, t.type, t.number, t.regexp];
	return {
		$schema: "vscode://schemas/color-theme",
		name: p.name,
		type: TYPES[kind],
		semanticHighlighting: true,
		colors: {
			// High contrast themes draw a clear border around every part and focused element.
			...(highContrast && {
				contrastBorder: p.contrastBorder,
				contrastActiveBorder: p.contrastActiveBorder
			}),

			// Base
			focusBorder: p.accent,
			foreground: p.fg,
			descriptionForeground: p.muted,
			errorForeground: p.status.error,
			"icon.foreground": p.fg,
			"widget.border": p.border,
			"widget.shadow": kind === "dark" ? "#00000080" : "#00000026",
			"selection.background": p.selection,
			"textLink.foreground": p.accent,
			"textLink.activeForeground": p.accentAlt,
			"textPreformat.foreground": t.string,
			"textBlockQuote.background": p.bgRaised,
			"textBlockQuote.border": p.accent,
			"textCodeBlock.background": p.bgRaised,

			// Editor
			"editor.background": p.bg,
			"editor.foreground": p.fg,
			"editorLineNumber.foreground": p.lineNumber,
			"editorLineNumber.activeForeground": p.fgStrong,
			"editorCursor.foreground": p.accent,
			"editor.lineHighlightBackground": p.lineHighlight,
			"editor.lineHighlightBorder": highContrast ? p.contrastBorder : "#00000000",
			"editor.selectionBackground": p.selection,
			"editor.inactiveSelectionBackground": `${p.selection.slice(0, 7)}40`,
			"editor.selectionHighlightBackground": `${p.accent}26`,
			"editor.wordHighlightBackground": `${p.accent}20`,
			"editor.wordHighlightStrongBackground": `${p.accentAlt}26`,
			"editor.findMatchBackground": p.findMatch,
			"editor.findMatchBorder": p.accentAlt,
			"editor.findMatchHighlightBackground": `${p.accentAlt}26`,
			"editor.rangeHighlightBackground": `${p.accent}14`,
			"editorWhitespace.foreground": p.border,
			"editorIndentGuide.background1": p.border,
			"editorIndentGuide.activeBackground1": p.lineNumber,
			"editorRuler.foreground": p.border,
			"editorBracketMatch.background": `${p.accent}26`,
			"editorBracketMatch.border": p.accent,
			...Object.fromEntries(
				brackets.flatMap((color, i) => [
					[`editorBracketHighlight.foreground${i + 1}`, color],
					[`editorBracketPairGuide.activeBackground${i + 1}`, `${color}99`]
				])
			),
			"editorBracketHighlight.unexpectedBracket.foreground": p.status.error,
			"editorLink.activeForeground": p.accent,
			"editorError.foreground": p.status.error,
			"editorWarning.foreground": p.status.warning,
			"editorInfo.foreground": p.status.info,
			"editorGutter.addedBackground": p.status.added,
			"editorGutter.modifiedBackground": p.status.modified,
			"editorGutter.deletedBackground": p.status.deleted,
			// VS Code's inline git blame, at the end of the cursor's line: muted, like other
			// text that isn't code, and readable on the current-line highlight (themes.test.ts).
			"git.blame.editorDecorationForeground": p.muted,
			"editorOverviewRuler.border": "#00000000",
			"editorWidget.background": p.bgRaised,
			"editorWidget.foreground": p.fg,
			"editorWidget.border": p.border,
			"editorSuggestWidget.background": p.bgRaised,
			"editorSuggestWidget.border": p.border,
			"editorSuggestWidget.foreground": p.fg,
			"editorSuggestWidget.highlightForeground": p.accent,
			"editorSuggestWidget.selectedBackground": p.lineHighlight,
			"editorSuggestWidget.selectedForeground": p.fgStrong,
			"editorHoverWidget.background": p.bgRaised,
			"editorHoverWidget.border": p.border,
			"editorGroup.border": p.border,
			"editorGroupHeader.tabsBackground": p.bgDark,
			"editorGroupHeader.tabsBorder": p.border,
			"peekView.border": p.accent,
			"peekViewEditor.background": p.bgDark,
			"peekViewResult.background": p.bgRaised,
			"peekViewTitle.background": p.bgRaised,
			"diffEditor.insertedTextBackground": `${p.status.added}1f`,
			"diffEditor.removedTextBackground": `${p.status.deleted}1f`,
			"minimap.selectionHighlight": p.selection,
			"scrollbarSlider.background": `${p.lineNumber}40`,
			"scrollbarSlider.hoverBackground": `${p.lineNumber}66`,
			"scrollbarSlider.activeBackground": `${p.accent}66`,

			// Tabs
			"tab.activeBackground": p.bg,
			"tab.activeForeground": p.fgStrong,
			"tab.activeBorder": p.accent,
			"tab.inactiveBackground": p.bgDark,
			"tab.inactiveForeground": p.muted,
			"tab.border": p.bgDark,
			"tab.hoverBackground": p.bgRaised,

			// Workbench parts
			"titleBar.activeBackground": p.bgDark,
			"titleBar.activeForeground": p.fg,
			"titleBar.inactiveBackground": p.bgDark,
			"titleBar.inactiveForeground": p.muted,
			"titleBar.border": p.border,
			"activityBar.background": p.bgDark,
			"activityBar.foreground": p.fgStrong,
			"activityBar.inactiveForeground": p.muted,
			"activityBar.activeBorder": p.accent,
			"activityBar.border": p.border,
			"activityBarBadge.background": p.accentAlt,
			"activityBarBadge.foreground": p.onAccent,
			"sideBar.background": p.bgDark,
			"sideBar.foreground": p.fg,
			"sideBar.border": p.border,
			"sideBarTitle.foreground": p.fgStrong,
			"sideBarSectionHeader.background": p.bgDark,
			"sideBarSectionHeader.foreground": p.fgStrong,
			"sideBarSectionHeader.border": p.border,
			"panel.background": p.bgDark,
			"panel.border": p.border,
			"panelTitle.activeForeground": p.fgStrong,
			"panelTitle.inactiveForeground": p.muted,
			"panelTitle.activeBorder": p.accent,
			"statusBar.background": p.bgDark,
			"statusBar.foreground": p.fg,
			"statusBar.border": p.border,
			"statusBar.debuggingBackground": p.accentAlt,
			"statusBar.debuggingForeground": p.onAccent,
			"statusBar.noFolderBackground": p.bgDark,
			"statusBarItem.remoteBackground": p.accent,
			"statusBarItem.remoteForeground": p.onAccent,
			"breadcrumb.foreground": p.muted,
			"breadcrumb.focusForeground": p.fgStrong,
			"breadcrumb.activeSelectionForeground": p.accent,

			// Lists and inputs
			"list.activeSelectionBackground": p.lineHighlight,
			"list.activeSelectionForeground": p.fgStrong,
			"list.inactiveSelectionBackground": p.bgRaised,
			"list.inactiveSelectionForeground": p.fg,
			"list.hoverBackground": p.bgRaised,
			"list.focusOutline": p.accent,
			"list.highlightForeground": p.accent,
			"list.errorForeground": p.status.error,
			"list.warningForeground": p.status.warning,
			"input.background": p.bgRaised,
			"input.foreground": p.fg,
			"input.border": p.border,
			"input.placeholderForeground": p.lineNumber,
			"inputOption.activeBorder": p.accent,
			"dropdown.background": p.bgRaised,
			"dropdown.foreground": p.fg,
			"dropdown.border": p.border,
			"button.background": p.accent,
			"button.foreground": p.onAccent,
			"button.hoverBackground": p.accentAlt,
			"button.secondaryBackground": p.bgRaised,
			"button.secondaryForeground": p.fg,
			"badge.background": p.accentAlt,
			"badge.foreground": p.onAccent,
			"progressBar.background": p.accent,
			"quickInput.background": p.bgRaised,
			"quickInput.foreground": p.fg,
			"menu.background": p.bgRaised,
			"menu.foreground": p.fg,
			"menu.selectionBackground": p.lineHighlight,
			"menu.selectionForeground": p.fgStrong,
			"notifications.background": p.bgRaised,
			"notifications.foreground": p.fg,
			"notifications.border": p.border,

			// Git
			"gitDecoration.addedResourceForeground": p.status.added,
			"gitDecoration.modifiedResourceForeground": p.status.modified,
			"gitDecoration.deletedResourceForeground": p.status.deleted,
			"gitDecoration.untrackedResourceForeground": p.status.added,
			"gitDecoration.ignoredResourceForeground": p.lineNumber,
			"gitDecoration.conflictingResourceForeground": p.status.warning,

			// Terminal
			"terminal.background": p.bgDark,
			"terminal.foreground": p.fg,
			"terminalCursor.foreground": p.accent,
			"terminal.selectionBackground": p.selection,
			...Object.fromEntries(
				Object.entries(p.ansi).map(([name, color]) => [
					`terminal.ansi${name[0].toUpperCase()}${name.slice(1)}`,
					color
				])
			)
		},
		tokenColors: [
			{
				scope: ["comment", "punctuation.definition.comment"],
				settings: { foreground: t.comment, ...style(type.comment) }
			},
			{
				scope: [
					"keyword",
					"storage",
					"storage.type",
					...(t.control ? [] : ["keyword.control"])
				],
				settings: { foreground: t.keyword, ...style(keywordStyle) }
			},
			// An optional color for the keywords that change control flow (return, break, throw):
			// a palette that sets it uses it sparingly, for the moments that matter.
			...(t.control
				? [
						{
							scope: ["keyword.control.flow", "keyword.control.trycatch"],
							settings: { foreground: t.control, ...style(keywordStyle) }
						},
						{
							scope: ["keyword.control"],
							settings: { foreground: t.keyword, ...style(keywordStyle) }
						}
					]
				: []),
			{
				scope: ["keyword.operator", "punctuation.accessor"],
				settings: { foreground: t.operator }
			},
			{
				scope: ["entity.name.function", "support.function", "meta.function-call"],
				settings: { foreground: t.function }
			},
			{
				scope: ["string", "string.quoted", "string.template"],
				settings: { foreground: t.string }
			},
			{
				scope: [
					"constant.numeric",
					"constant.language",
					"constant.character",
					"support.constant"
				],
				settings: { foreground: t.number }
			},
			{
				scope: [
					"entity.name.type",
					"entity.name.class",
					"support.type",
					"support.class",
					"entity.other.inherited-class"
				],
				settings: { foreground: t.type }
			},
			{ scope: ["variable", "meta.definition.variable"], settings: { foreground: p.fg } },
			{
				scope: [
					"variable.other.property",
					"support.variable.property",
					"meta.object-literal.key"
				],
				settings: { foreground: t.property }
			},
			{
				scope: ["variable.parameter"],
				settings: { foreground: p.fg, ...style(type.parameter) }
			},
			{
				scope: ["string.regexp", "constant.character.escape"],
				settings: { foreground: t.regexp }
			},
			{ scope: ["entity.name.tag"], settings: { foreground: t.tag } },
			{ scope: ["entity.other.attribute-name"], settings: { foreground: t.attribute } },
			{
				scope: ["markup.heading", "entity.name.section"],
				settings: { foreground: t.keyword, ...style(type.heading) }
			},
			{
				scope: ["markup.bold"],
				settings: type.bold ? { fontStyle: type.bold } : { foreground: p.fgStrong }
			},
			{ scope: ["markup.italic"], settings: { fontStyle: type.italic } },
			{
				scope: ["markup.inline.raw", "markup.fenced_code"],
				settings: { foreground: t.string }
			},
			{ scope: ["markup.underline.link"], settings: { foreground: p.accent } },
			{ scope: ["markup.inserted"], settings: { foreground: p.status.added } },
			{ scope: ["markup.deleted"], settings: { foreground: p.status.deleted } },
			{ scope: ["invalid"], settings: { foreground: p.status.error } }
		],
		semanticTokenColors: {
			function: t.function,
			method: t.function,
			class: t.type,
			interface: t.type,
			type: t.type,
			enumMember: t.number,
			property: t.property,
			parameter: type.parameter ? { foreground: p.fg, italic: true } : p.fg,
			"variable.readonly": t.number,
			keyword: keywordStyle ? { foreground: t.keyword, bold: true } : t.keyword,
			string: t.string,
			number: t.number,
			regexp: t.regexp
		}
	};
}

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "themes");
mkdirSync(dir, { recursive: true });
for (const palette of palettes) {
	const file = join(dir, `${palette.id}-color-theme.json`);
	writeFileSync(file, JSON.stringify(theme(palette), null, "\t") + "\n");
	console.log(`wrote ${file}`);
}
