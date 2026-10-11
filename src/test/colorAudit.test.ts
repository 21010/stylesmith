import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	auditTheme,
	clearlyOff,
	extensionColors,
	registry,
	workbenchColors,
	type Theme
} from "../colorAudit";

// A few registrations as they look in VS Code's minified workbench bundle.
const BUNDLE = [
	'var Ho=ae("foreground",{dark:"#CCCCCC",light:"#616161",hcDark:"#FFFFFF",hcLight:"#292929"},d(1,"Overall foreground.")),',
	'Wu=ae("editor.background",{light:"#ffffff",dark:"#1E1E1E",hcDark:Qe.black,hcLight:Qe.white},d(2,"Editor, background.")),',
	'Xq=ae("list.follows",{dark:wi(Ho,.5),light:Ho,hcDark:null,hcLight:null},d(3,"Follows the foreground.")),',
	'ae("debugIcon.breakpointForeground","#E51400",d(4,"Breakpoints.")),',
	'ae("editor.nothing",null,d(5,"Draws nothing by default.")),',
	'other("not.a.color",{dark:"#000000"});'
].join("");

const theme = (colors: Record<string, string>): Theme => ({
	type: "dark",
	colors: { "editor.background": "#0b130d", foreground: "#b9f2b4", ...colors },
	tokenColors: [{ settings: { foreground: "#4dff88" } }]
});

describe("color audit (#108)", () => {
	const colors = registry([
		...workbenchColors(BUNDLE),
		...extensionColors([
			{
				contributes: {
					colors: [
						{
							id: "git.blame.editorDecorationForeground",
							defaults: {
								dark: "editorCodeLens.foreground",
								light: "editorCodeLens.foreground"
							}
						},
						{ id: "merge.border", defaults: { dark: null, light: null } }
					]
				}
			},
			{ contributes: { colors: [{ id: "foreground", defaults: { dark: "#ff0000" } }] } }
		])
	]);
	const byId = new Map(colors.map(c => [c.id, c]));

	it("finds the colors registered in the workbench, and only those", () => {
		assert.ok(byId.has("foreground"));
		assert.ok(byId.has("editor.background"));
		assert.ok(byId.has("debugIcon.breakpointForeground"));
		assert.ok(!byId.has("not.a.color"));
	});

	it("tells fixed, derived and empty defaults apart, per kind of theme", () => {
		assert.equal(byId.get("foreground")?.dark, "fixed");
		assert.equal(byId.get("foreground")?.darkValue, '"#CCCCCC"');
		assert.equal(byId.get("list.follows")?.dark, "derived");
		assert.deepEqual(byId.get("list.follows")?.refs, ["foreground"]);
		assert.equal(byId.get("debugIcon.breakpointForeground")?.light, "fixed");
		assert.equal(byId.get("editor.nothing")?.dark, "none");
	});

	it("adds the terminal colors VS Code registers in a loop", () => {
		assert.ok(byId.has("terminal.ansiRed"));
		assert.ok(byId.has("terminal.ansiBrightWhite"));
	});

	it("adds built-in extensions' colors, keeping the workbench's when both register one", () => {
		assert.equal(byId.get("git.blame.editorDecorationForeground")?.dark, "derived");
		assert.equal(byId.get("merge.border")?.dark, "none");
		assert.equal(byId.get("foreground")?.darkValue, '"#CCCCCC"');
	});

	it("fails loudly when VS Code's code no longer looks as expected", () => {
		assert.throws(() => workbenchColors("var x=1;"), /registration function/);
	});

	it("counts what a theme sets, what follows it and what draws nothing", () => {
		const audit = auditTheme(theme({}), colors);
		assert.equal(audit.set, 2);
		assert.equal(audit.following, 1); // list.follows, from foreground
		assert.equal(audit.none, 2); // editor.nothing, merge.border
	});

	it("measures a stock color against the theme's own colors", () => {
		const audit = auditTheme(theme({}), colors);
		const breakpoint = audit.stock.find(s => s.id === "debugIcon.breakpointForeground");
		assert.ok(breakpoint && breakpoint.gap > 25, "stock red is far from a green theme");
		assert.deepEqual(
			clearlyOff(audit).map(s => s.id),
			["debugIcon.breakpointForeground"]
		);
	});

	it("finds nothing off once the theme sets the color", () => {
		const audit = auditTheme(theme({ "debugIcon.breakpointForeground": "#4dff88" }), colors);
		assert.deepEqual(clearlyOff(audit), []);
	});

	it("reports keys VS Code doesn't know", () => {
		const audit = auditTheme(theme({ "editor.backgroud": "#000000" }), colors);
		assert.deepEqual(audit.unknown, ["editor.backgroud"]);
	});
});
