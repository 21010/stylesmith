import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Config } from "../config";
import { DEFAULT_FONT_ID, findFont } from "../fonts";
import { EFFECTS } from "../effects";
import { applyThemes, checkAfterStartup, disable, enable, type Services } from "../lifecycle";
import { ManagedSettings, type SettingsAccess } from "../managed";
import { StateFile } from "../store";

let root: string;
let values: Map<string, unknown>;
let services: Services;

beforeEach(async () => {
	root = await mkdtemp(path.join(os.tmpdir(), "stylesmith-api-lifecycle-"));
	values = new Map<string, unknown>([
		["editor.fontFamily", "Consolas, monospace"],
		["terminal.integrated.fontFamily", ""],
		["editor.cursorBlinking", "blink"],
		["workbench.iconTheme", "vs-seti"],
		["workbench.colorTheme", "Default Dark Modern"],
		["editor.cursorSmoothCaretAnimation", "off"],
		["editor.renderLineHighlight", "line"],
		["editor.guides.bracketPairs", false],
		["window.density.layout", "default"],
		["terminal.integrated.cursorStyle", "line"],
		["terminal.integrated.cursorBlinking", false]
	]);
	const defaults = new Map<string, unknown>([
		["editor.fontFamily", "monospace"],
		["terminal.integrated.fontFamily", ""],
		["editor.cursorBlinking", "blink"],
		["workbench.iconTheme", "vs-seti"],
		["workbench.colorTheme", "Default Dark Modern"],
		["editor.cursorSmoothCaretAnimation", "off"],
		["editor.renderLineHighlight", "line"],
		["editor.guides.bracketPairs", false],
		["window.density.layout", "default"],
		["terminal.integrated.cursorStyle", "line"],
		["terminal.integrated.cursorBlinking", false]
	]);
	const settings: SettingsAccess = {
		read: key => ({
			user: values.get(key),
			default: defaults.get(key),
			known: defaults.has(key)
		}),
		write: (key, value) => {
			if (value === undefined) values.delete(key);
			else values.set(key, value);
			return Promise.resolve();
		}
	};
	const config: Config = {
		get: (_key: string, fallback: boolean | string) => fallback as never,
		set: async () => {},
		isOn: effect => effect.enabledByDefault,
		font: () => findFont(DEFAULT_FONT_ID),
		problemLens: () => ({
			enabled: true,
			minimumSeverity: "warning",
			inlineMessages: true,
			gutterIcons: true,
			statusBar: true,
			errorSignal: false
		}),
		undoHighlight: () => false
	};
	const store = new StateFile(path.join(root, "state.json"));
	services = { config, managed: new ManagedSettings(settings, store), store };
});

afterEach(async () => rm(root, { recursive: true, force: true }));

describe("API-only lifecycle", () => {
	it("applies selected settings without a restart or workbench access", async () => {
		assert.equal(await enable(services), true);
		assert.equal(values.get("editor.cursorBlinking"), "smooth");
		assert.equal(values.get("editor.cursorSmoothCaretAnimation"), "on");
		assert.equal(values.get("editor.renderLineHighlight"), "all");
		assert.equal(values.get("editor.guides.bracketPairs"), "active");
		assert.equal(
			values.get("editor.fontFamily"),
			"'JetBrainsMono Nerd Font Mono', Consolas, monospace"
		);
		assert.equal((await services.store.read()).enabled, true);
	});

	it("restores user settings on Disable", async () => {
		await enable(services);
		await disable(services);
		assert.equal(values.get("editor.cursorBlinking"), "blink");
		assert.equal(values.get("editor.renderLineHighlight"), "line");
		assert.equal(values.get("editor.guides.bracketPairs"), false);
		assert.equal(values.get("editor.fontFamily"), "Consolas, monospace");
		assert.equal((await services.store.read()).enabled, false);
	});

	it("does not overwrite a setting the user changed after Enable", async () => {
		await enable(services);
		values.set("editor.cursorBlinking", "phase");
		await disable(services);
		assert.equal(values.get("editor.cursorBlinking"), "phase");
	});

	it("keeps a user's change on automatic re-apply, but not on an explicit Enable", async () => {
		await enable(services);
		values.set("editor.cursorBlinking", "phase");
		assert.equal(await checkAfterStartup(services), true);
		await enable(services, { keepUserChanges: true });
		assert.equal(values.get("editor.cursorBlinking"), "phase");
		await enable(services);
		assert.equal(values.get("editor.cursorBlinking"), "smooth");
		await disable(services);
		assert.equal(values.get("editor.cursorBlinking"), "phase");
	});

	it("replaces the previous Stylesmith font when the user switches fonts", async () => {
		await enable(services);
		values.set("editor.fontFamily", "'DepartureMono Nerd Font Mono', Consolas, monospace");
		await enable(services, { keepUserChanges: true });
		assert.equal(
			values.get("editor.fontFamily"),
			"'JetBrainsMono Nerd Font Mono', Consolas, monospace"
		);
	});

	it("puts the user's own themes back on Disable after a preset", async () => {
		values.set("workbench.colorTheme", "My Theme");
		await applyThemes(services, "Stylesmith Phosphor", "stylesmith-pixel-phosphor");
		assert.equal(values.get("workbench.colorTheme"), "Stylesmith Phosphor");
		assert.equal(values.get("workbench.iconTheme"), "stylesmith-pixel-phosphor");
		await enable(services);
		assert.equal(values.get("workbench.colorTheme"), "Stylesmith Phosphor", "Enable leaves it");
		await disable(services);
		assert.equal(values.get("workbench.colorTheme"), "My Theme");
		assert.equal(values.get("workbench.iconTheme"), "vs-seti");
	});

	it("keeps a theme the user picked after the preset", async () => {
		await applyThemes(services, "Stylesmith Amber", "stylesmith-pixel-amber");
		values.set("workbench.colorTheme", "Their Own Theme");
		await disable(services);
		assert.equal(values.get("workbench.colorTheme"), "Their Own Theme");
		assert.equal(values.get("workbench.iconTheme"), "vs-seti", "the icons go back");
	});

	it("doesn't take over a theme the user already had", async () => {
		values.set("workbench.colorTheme", "Stylesmith ICE");
		await applyThemes(services, "Stylesmith ICE", "stylesmith-pixel-ice");
		await disable(services);
		assert.equal(values.get("workbench.colorTheme"), "Stylesmith ICE");
	});

	it("re-applies active settings on startup only when enabled", async () => {
		assert.equal(await checkAfterStartup(services), false);
		await services.store.update({ enabled: true });
		assert.equal(await checkAfterStartup(services), true);
		assert.equal(values.get("editor.cursorBlinking"), "smooth");
	});

	it("each advertised effect maps to documented VS Code settings", () => {
		assert.ok(EFFECTS.every(effect => (effect.editorSettings?.length ?? 0) > 0));
	});
});
