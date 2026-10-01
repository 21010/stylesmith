import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { EFFECTS } from "../effects";

// Tests run from out/test, two levels below the project root.
const ROOT = path.join(__dirname, "..", "..");
const settings: Record<string, { type?: string; default?: unknown; scope?: string }> = JSON.parse(
	readFileSync(path.join(ROOT, "package.json"), "utf-8")
).contributes.configuration.properties;

describe("built-in effects", () => {
	for (const effect of EFFECTS) {
		describe(effect.setting, () => {
			const setting = settings[`stylesmith.${effect.setting}`];

			it("has a boolean setting in package.json", () => {
				assert.ok(setting, "setting is declared");
				assert.equal(setting.type, "boolean");
			});

			it("has the same default in code and package.json", () => {
				assert.equal(setting.default, effect.enabledByDefault);
			});

			it("can only be set in user settings", () => {
				assert.equal(setting.scope, "application");
			});

			it("has its file in the package", () => {
				assert.ok(existsSync(path.join(ROOT, effect.file)), effect.file);
				assert.equal(path.extname(effect.file), `.${effect.kind}`);
			});
		});
	}
});
