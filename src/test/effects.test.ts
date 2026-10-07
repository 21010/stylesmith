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
				"editor.cursorBlinking",
				"editor.cursorSmoothCaretAnimation",
				"editor.guides.bracketPairs",
				"editor.renderLineHighlight",
				"terminal.integrated.cursorBlinking",
				"terminal.integrated.cursorStyle",
				"window.density.layout"
			].sort()
		);
	});
});
