/** Stylesmith effects implemented only with documented VS Code configuration settings. */

export interface Effect {
	/** Setting under `stylesmith.`, e.g. `effects.smoothCursor`. */
	setting: string;
	label: string;
	enabledByDefault: boolean;
	/** VS Code settings to enable while this effect is selected. */
	editorSettings?: readonly EditorSetting[];
}

export interface EditorSetting {
	key: string;
	value: unknown;
	isOn: (value: unknown) => boolean;
}

const equals = (expected: unknown) => (value: unknown) => value === expected;

export const EFFECTS: readonly Effect[] = [
	{
		setting: "effects.smoothCursor",
		label: "Smooth cursor",
		enabledByDefault: true,
		editorSettings: [
			{ key: "editor.cursorSmoothCaretAnimation", value: "on", isOn: equals("on") },
			{ key: "editor.cursorBlinking", value: "smooth", isOn: equals("smooth") }
		]
	},
	{
		setting: "effects.currentLine",
		label: "Highlight current line",
		enabledByDefault: true,
		editorSettings: [{ key: "editor.renderLineHighlight", value: "all", isOn: equals("all") }]
	},
	{
		setting: "effects.bracketGuides",
		label: "Bracket pair guides",
		enabledByDefault: true,
		editorSettings: [
			{
				key: "editor.guides.bracketPairs",
				value: "active",
				isOn: value => value === true || value === "active"
			}
		]
	},
	{
		setting: "effects.compactLayout",
		label: "Compact layout",
		enabledByDefault: false,
		editorSettings: [
			{ key: "window.density.layout", value: "compact", isOn: equals("compact") }
		]
	},
	{
		setting: "effects.blockCursor",
		label: "Block editor cursor",
		enabledByDefault: false,
		editorSettings: [{ key: "editor.cursorStyle", value: "block", isOn: equals("block") }]
	},
	{
		setting: "effects.blockTerminalCursor",
		label: "Block terminal cursor",
		enabledByDefault: false,
		editorSettings: [
			{ key: "terminal.integrated.cursorStyle", value: "block", isOn: equals("block") },
			{ key: "terminal.integrated.cursorBlinking", value: true, isOn: equals(true) }
		]
	},
	{
		setting: "effects.dimUnfocused",
		label: "Dim unfocused editors",
		enabledByDefault: false,
		editorSettings: [
			{ key: "accessibility.dimUnfocused.enabled", value: true, isOn: equals(true) }
		]
	},
	{
		setting: "effects.readableTerminal",
		label: "Readable terminal",
		enabledByDefault: false,
		// VS Code adjusts terminal colors below this contrast ratio, also colors that programs
		// choose. Its default is 4.5 (WCAG AA); 7 is WCAG AAA.
		editorSettings: [
			{
				key: "terminal.integrated.minimumContrastRatio",
				value: 7,
				isOn: value => typeof value === "number" && value >= 7
			}
		]
	}
];
