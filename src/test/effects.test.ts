import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EFFECTS } from "../effects";
import { manifest } from "./files";

const settings = manifest().contributes.configuration.properties;

describe("API-backed effects", () => {
	for (const effect of EFFECTS) {
		it(`${effect.setting} has an application-scoped setting`, () => {
			const setting = settings[`stylesmith.${effect.setting}`];
			assert.ok(setting);
			assert.equal(setting.type, "boolean");
			assert.equal(setting.default, effect.enabledByDefault);
			assert.equal(setting.scope, "application");
			assert.ok(effect.editorSettings?.length, "the effect maps to VS Code settings");
		});
	}

	it("uses only supported VS Code settings, never injected CSS or JavaScript", () => {
		assert.deepEqual(
			EFFECTS.flatMap(effect => effect.editorSettings ?? [])
				.map(setting => setting.key)
				.sort(),
			[
				"accessibility.dimUnfocused.enabled",
				"editor.cursorBlinking",
				"editor.cursorStyle",
				"editor.cursorSmoothCaretAnimation",
				"editor.guides.bracketPairs",
				"editor.renderLineHighlight",
				"terminal.integrated.cursorBlinking",
				"terminal.integrated.cursorStyle",
				"terminal.integrated.minimumContrastRatio",
				"window.density.layout"
			].sort()
		);
	});
});

describe("readable terminal", () => {
	const effect = EFFECTS.find(candidate => candidate.setting === "effects.readableTerminal")!;
	const [setting] = effect.editorSettings!;

	it("raises the minimum terminal contrast to 7:1 (WCAG AAA)", () => {
		assert.equal(setting!.key, "terminal.integrated.minimumContrastRatio");
		assert.equal(setting!.value, 7);
	});

	it("counts a user's own value of 7 or more as on, and VS Code's 4.5 as off", () => {
		assert.equal(setting!.isOn(7), true);
		assert.equal(setting!.isOn(21), true);
		assert.equal(setting!.isOn(4.5), false);
		assert.equal(setting!.isOn(undefined), false);
	});
});
