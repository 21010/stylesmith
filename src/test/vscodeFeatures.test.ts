// The features that talk to VS Code directly, against a fake of its API (#120): what they
// decorate and show can't be read back from the real one. Import the fake first.
import {
	events,
	FakeDocument,
	FakeEditor,
	Range,
	state,
	window,
	type DecorationType
} from "./fakeVscode";
import assert from "node:assert/strict";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import type * as vscode from "vscode";
import { DoneSignal } from "../doneSignal";
import { FailSignal } from "../failSignal";
import { PasteHighlight } from "../pasteHighlight";
import { ProblemLens } from "../problemLens";
import { ERROR_SIGNAL_DURATION, INTERRUPTED, SAVE_RECEIPT_DURATION } from "../problems";
import { SaveReceipt } from "../saveReceipt";
import { UndoHighlight } from "../undoHighlight";
import { applyPreset, FEEDBACK_TOGGLES } from "../ui";
import type { Config } from "../config";
import { manifest } from "./files";

const SAVE = { Manual: 1, AfterDelay: 2 };
const UNDO = 1;

function openEditor(lines = ["a", "b", "c"]): FakeEditor {
	const editor = new FakeEditor(new FakeDocument("test", lines));
	window.activeTextEditor = editor;
	window.visibleTextEditors = [editor];
	return editor;
}

beforeEach(() => {
	state.settings.clear();
	state.diagnostics.clear();
	state.decorationTypes.length = 0;
	state.statusItems.length = 0;
	window.activeColorTheme = { kind: 2 };
	mock.timers.enable({ apis: ["setTimeout"] });
});
afterEach(() => mock.timers.reset());

describe("Problem Lens gutter icons (#106, #120)", () => {
	const context = {
		asAbsolutePath: (file: string) => path.join("/stylesmith", file),
		extension: { packageJSON: manifest() }
	} as unknown as vscode.ExtensionContext;
	const options = {
		enabled: true,
		minimumSeverity: "info" as const,
		inlineMessages: true,
		gutterIcons: true,
		statusBar: true,
		errorSignal: false
	};
	/** The gutter icons of the live (not disposed) error decoration type, dark and light. */
	const errorIcons = () => {
		const live = state.decorationTypes.filter(type => !type.disposed);
		const error = live.find(type => type.options.overviewRulerColor !== undefined)!;
		const icon = (variant: string) =>
			(error.options[variant] as { gutterIconPath?: string }).gutterIconPath;
		return { dark: icon("dark"), light: icon("light") };
	};
	const lens = (opts = options) => new ProblemLens(context, () => opts);

	it("uses a Stylesmith theme's own icons", () => {
		state.settings.set("workbench.colorTheme", "Stylesmith Amber");
		const problemLens = lens();
		assert.deepEqual(errorIcons(), {
			dark: path.join("/stylesmith", "icons/problems/amber/error.svg"),
			light: path.join("/stylesmith", "icons/problems/amber/error.svg")
		});
		problemLens.dispose();
	});

	it("keeps the generic dark and light icons for any other theme", () => {
		state.settings.set("workbench.colorTheme", "Default Dark Modern");
		const problemLens = lens();
		assert.deepEqual(errorIcons(), {
			dark: path.join("/stylesmith", "icons/problems/error-dark.svg"),
			light: path.join("/stylesmith", "icons/problems/error-light.svg")
		});
		problemLens.dispose();
	});

	it("follows a theme switch, and drops the old decorations", () => {
		state.settings.set("workbench.colorTheme", "Stylesmith Amber");
		const problemLens = lens();
		const before = state.decorationTypes.length;
		state.settings.set("workbench.colorTheme", "Stylesmith Daylight");
		window.activeColorTheme = { kind: 1 };
		events.colorTheme.fire(undefined);
		assert.ok(state.decorationTypes.slice(0, before).every(type => type.disposed));
		assert.match(errorIcons().light ?? "", /problems[/\\]daylight[/\\]error\.svg$/);
		problemLens.dispose();
	});

	it("follows the preferred theme while VS Code follows the system's color scheme", () => {
		state.settings.set("window.autoDetectColorScheme", true);
		state.settings.set("workbench.colorTheme", "Default Dark Modern");
		state.settings.set("workbench.preferredDarkColorTheme", "Stylesmith Phosphor");
		const problemLens = lens();
		assert.match(errorIcons().dark ?? "", /problems[/\\]phosphor[/\\]error\.svg$/);
		problemLens.dispose();
	});

	it("keeps the generic icons when VS Code shows another kind of theme than the one named", () => {
		state.settings.set("workbench.colorTheme", "Stylesmith Amber");
		window.activeColorTheme = { kind: 3 }; // the system switched to high contrast
		const problemLens = lens();
		assert.match(errorIcons().dark ?? "", /problems[/\\]error-dark\.svg$/);
		problemLens.dispose();
	});

	it("draws no gutter icon when they're off", () => {
		const problemLens = lens({ ...options, gutterIcons: false });
		assert.deepEqual(errorIcons(), { dark: undefined, light: undefined });
		problemLens.dispose();
	});

	it("decorates a problem's line", () => {
		const editor = openEditor();
		state.diagnostics.set(editor.document, [
			{ range: new Range(1, 0, 1, 1), severity: 0, message: "an error" }
		]);
		const problemLens = lens();
		const decorated = [...editor.decorations.values()].flat() as { range: Range }[];
		assert.deepEqual(
			decorated.map(d => d.range.start.line),
			[1]
		);
		problemLens.dispose();
	});
});

describe("save receipt (#120)", () => {
	let enabled = true;
	const receipt = (editor: FakeEditor) =>
		[...editor.decorations.values()].flat() as {
			renderOptions: { after: { contentText: string } };
		}[];
	const save = (editor: FakeEditor, reason: number) => {
		events.willSave.fire({ document: editor.document, reason });
		events.didSave.fire(editor.document);
	};

	it("notes a manual save on the cursor's line, then clears it", () => {
		enabled = true;
		const editor = openEditor();
		const saveReceipt = new SaveReceipt(
			() => enabled,
			() => false
		);
		save(editor, SAVE.Manual);
		assert.match(receipt(editor)[0]?.renderOptions.after.contentText ?? "", /^▸ saved /);
		mock.timers.tick(SAVE_RECEIPT_DURATION);
		assert.deepEqual(receipt(editor), []);
		saveReceipt.dispose();
	});

	it("notes nothing for an auto-save, when off, or under a Problem Lens message", () => {
		const editor = openEditor();
		enabled = true;
		const quiet = new SaveReceipt(
			() => enabled,
			() => false
		);
		save(editor, SAVE.AfterDelay);
		enabled = false;
		save(editor, SAVE.Manual);
		quiet.dispose();
		enabled = true;
		const underMessage = new SaveReceipt(
			() => enabled,
			() => true
		);
		save(editor, SAVE.Manual);
		underMessage.dispose();
		assert.deepEqual(receipt(editor), []);
	});
});

describe("failed-command signal (#120)", () => {
	let enabled = true;
	const item = () => state.statusItems.find(i => i.id === "stylesmith.failSignal")!;

	it("shows a failed command's exit code, then hides it", () => {
		enabled = true;
		const signal = new FailSignal(() => enabled);
		events.shellEnd.fire({ exitCode: 2 });
		assert.equal(item().visible, true);
		assert.equal(item().text, "$(terminal) exit 2");
		mock.timers.tick(ERROR_SIGNAL_DURATION);
		assert.equal(item().visible, false);
		signal.dispose();
	});

	it("stays quiet for success, Ctrl+C, no shell integration, or when off", () => {
		enabled = true;
		const signal = new FailSignal(() => enabled);
		events.shellEnd.fire({ exitCode: 0 });
		events.shellEnd.fire({ exitCode: INTERRUPTED });
		events.shellEnd.fire({ exitCode: undefined });
		enabled = false;
		events.shellEnd.fire({ exitCode: 1 });
		assert.equal(item().visible, false);
		signal.dispose();
	});
});

describe("undo highlight (#120)", () => {
	let enabled = true;
	const tinted = (editor: FakeEditor, type: DecorationType) =>
		((editor.decorations.get(type) ?? []) as Range[]).map(range => range.start.line);

	it("tints the lines an undo changed, then clears them", () => {
		enabled = true;
		const editor = openEditor();
		const highlight = new UndoHighlight(() => enabled);
		const type = state.decorationTypes.at(-1)!;
		events.documentChange.fire({
			document: editor.document,
			reason: UNDO,
			contentChanges: [{ range: new Range(1, 0, 1, 1), text: "b" }]
		});
		assert.deepEqual(tinted(editor, type), [1]);
		mock.timers.tick(600);
		assert.deepEqual(tinted(editor, type), []);
		highlight.dispose();
	});

	it("tints nothing for typing, or when off", () => {
		const editor = openEditor();
		enabled = true;
		const highlight = new UndoHighlight(() => enabled);
		const type = state.decorationTypes.at(-1)!;
		const change = { range: new Range(0, 0, 0, 1), text: "x" };
		events.documentChange.fire({ document: editor.document, contentChanges: [change] });
		enabled = false;
		events.documentChange.fire({
			document: editor.document,
			reason: UNDO,
			contentChanges: [change]
		});
		assert.deepEqual(tinted(editor, type), []);
		highlight.dispose();
	});
});

describe("paste highlight", () => {
	let enabled = true;
	const tinted = (editor: FakeEditor, type: DecorationType) =>
		((editor.decorations.get(type) ?? []) as Range[]).map(range => range.start.line);

	it("tints the lines a multi-line paste added, then clears them", () => {
		enabled = true;
		const editor = openEditor(["a", "b", "c", "d"]);
		const highlight = new PasteHighlight(() => enabled);
		const type = state.decorationTypes.at(-1)!;
		events.documentChange.fire({
			document: editor.document,
			contentChanges: [{ range: new Range(1, 0, 1, 0), text: "x\ny\nz" }]
		});
		assert.deepEqual(tinted(editor, type), [1, 2, 3]);
		mock.timers.tick(600);
		assert.deepEqual(tinted(editor, type), []);
		highlight.dispose();
	});

	it("tints nothing for single-line edits, Enter, undo, or when off", () => {
		const editor = openEditor(["a", "b", "c"]);
		enabled = true;
		const highlight = new PasteHighlight(() => enabled);
		const type = state.decorationTypes.at(-1)!;
		events.documentChange.fire({
			document: editor.document,
			contentChanges: [{ range: new Range(0, 0, 0, 0), text: "x" }]
		});
		events.documentChange.fire({
			document: editor.document,
			contentChanges: [{ range: new Range(0, 0, 0, 0), text: "\n\t" }]
		});
		events.documentChange.fire({
			document: editor.document,
			reason: UNDO,
			contentChanges: [{ range: new Range(0, 0, 0, 0), text: "x\ny" }]
		});
		enabled = false;
		events.documentChange.fire({
			document: editor.document,
			contentChanges: [{ range: new Range(0, 0, 0, 0), text: "x\ny" }]
		});
		assert.deepEqual(tinted(editor, type), []);
		highlight.dispose();
	});
});

describe("long-command done signal", () => {
	let enabled = true;
	const item = () => state.statusItems.find(i => i.id === "stylesmith.doneSignal")!;

	it("shows a finished long command's duration, then hides it", () => {
		enabled = true;
		const signal = new DoneSignal(() => enabled);
		const execution = {};
		const realNow = Date.now;
		let now = 1_000;
		Date.now = () => now;
		try {
			events.shellStart.fire({ execution });
			now += 15_000;
			events.shellEnd.fire({ execution, exitCode: 0 });
			assert.equal(item().visible, true);
			assert.equal(item().text, "$(check) done 15s");
			mock.timers.tick(ERROR_SIGNAL_DURATION);
			assert.equal(item().visible, false);
		} finally {
			Date.now = realNow;
			signal.dispose();
		}
	});

	it("stays quiet for short commands, failed commands, or when off", () => {
		enabled = true;
		const signal = new DoneSignal(() => enabled);
		const realNow = Date.now;
		let now = 1_000;
		Date.now = () => now;
		try {
			const fast = {};
			events.shellStart.fire({ execution: fast });
			now += 3_000;
			events.shellEnd.fire({ execution: fast, exitCode: 0 });

			const failed = {};
			events.shellStart.fire({ execution: failed });
			now += 20_000;
			events.shellEnd.fire({ execution: failed, exitCode: 1 });

			enabled = false;
			const off = {};
			events.shellStart.fire({ execution: off });
			now += 20_000;
			events.shellEnd.fire({ execution: off, exitCode: 0 });

			assert.equal(item().visible, false);
		} finally {
			Date.now = realNow;
			signal.dispose();
		}
	});

	it("hides an active done signal when a failed-command signal arrives (#177)", () => {
		const done = new DoneSignal(() => true);
		const fail = new FailSignal(() => true);
		const doneItem = state.statusItems.find(i => i.id === "stylesmith.doneSignal")!;
		const failItem = state.statusItems.find(i => i.id === "stylesmith.failSignal")!;
		const realNow = Date.now;
		let now = 1_000;
		Date.now = () => now;
		try {
			const exec = {};
			events.shellStart.fire({ execution: exec });
			now += 15_000;
			events.shellEnd.fire({ execution: exec, exitCode: 0 });
			assert.equal(doneItem.visible, true);
			assert.equal(failItem.visible, false);

			now += 100;
			events.shellEnd.fire({ exitCode: 2 });
			assert.equal(doneItem.visible, false, "previous transient signal hid immediately");
			assert.equal(failItem.visible, true);
		} finally {
			Date.now = realNow;
			done.dispose();
			fail.dispose();
		}
	});
});

describe("preset font auto-apply (#168) and menu feedback toggles (#176)", () => {
	it("automatically enables a preset's recommended font when it is already installed (#168)", async () => {
		const written = new Map<string, boolean | string>();
		const config = {
			set: (key: string, value: boolean | string) => {
				written.set(key, value);
				return Promise.resolve();
			}
		} as unknown as Config;
		let themes: [string, string] | undefined;

		await applyPreset(
			config,
			(color, icon) => {
				themes = [color, icon];
				return Promise.resolve();
			},
			"phosphor-terminal",
			() => Promise.resolve(new Set(["DepartureMono"]))
		);
		assert.deepEqual(themes, ["Stylesmith Phosphor", "stylesmith-pixel-phosphor"]);
		assert.equal(written.get("fonts.enabled"), true);
		assert.equal(written.get("fonts.family"), "DepartureMono");

		written.clear();
		await applyPreset(
			config,
			() => Promise.resolve(),
			"phosphor-terminal",
			() => Promise.resolve(new Set(["JetBrainsMono"]))
		);
		assert.equal(written.has("fonts.enabled"), false);
		assert.equal(written.has("fonts.family"), false);
	});

	it("exposes only declared boolean settings in FEEDBACK_TOGGLES (#176)", () => {
		const properties = (
			manifest() as unknown as {
				contributes: {
					configuration: {
						properties: Record<string, { type?: string; default?: unknown }>;
					};
				};
			}
		).contributes.configuration.properties;
		for (const item of FEEDBACK_TOGGLES) {
			const prop = properties[`stylesmith.${item.setting}`];
			assert.ok(prop, `stylesmith.${item.setting} exists in package.json`);
			assert.equal(prop.type, "boolean");
			assert.equal(prop.default, item.defaultOn);
		}
	});
});
