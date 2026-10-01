import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { EFFECTS } from "../effects";
import { ROOT, manifest } from "./files";

const readme = readFileSync(path.join(ROOT, "README.md"), "utf-8");

/** The README section that starts with this heading, up to the next heading of any level. */
function section(heading: string): string {
	const start = readme.indexOf(`\n${heading}\n`);
	assert.ok(start >= 0, `README has "${heading}"`);
	const next = readme.slice(start + heading.length + 2).search(/\n#{2,3} /);
	return readme.slice(start, next < 0 ? undefined : start + heading.length + 2 + next);
}

/** Removes // comments from JSON with comments, but not "//" inside strings like file://. */
function stripComments(jsonc: string): string {
	let out = "";
	let inString = false;
	for (let i = 0; i < jsonc.length; i++) {
		const c = jsonc[i];
		if (inString) {
			out += c;
			if (c === "\\") out += jsonc[++i] ?? "";
			else if (c === '"') inString = false;
		} else if (c === '"') {
			inString = true;
			out += c;
		} else if (c === "/" && jsonc[i + 1] === "/") {
			while (i < jsonc.length && jsonc[i] !== "\n") i++;
			out += "\n";
		} else {
			out += c;
		}
	}
	return out;
}

describe("README", () => {
	const example = section("### All settings in settings.json");
	const code = /```jsonc\n([\s\S]*?)\n```/.exec(example)?.[1];

	it("has a settings.json example that is valid JSON with comments", () => {
		assert.ok(code, "a jsonc code block");
		assert.doesNotThrow(() => JSON.parse(stripComments(code)) as unknown);
	});

	it("lists every Stylesmith setting with its default value", () => {
		const settings = JSON.parse(stripComments(code ?? "{}")) as Record<string, unknown>;
		const properties = manifest().contributes.configuration.properties;
		const documented = Object.keys(settings).filter(key => key.startsWith("stylesmith."));
		assert.deepEqual(documented.sort(), Object.keys(properties).sort());
		for (const [key, schema] of Object.entries(properties)) {
			assert.deepEqual(settings[key], schema.default, `${key} shows its default`);
		}
	});

	it("names every VS Code setting that an effect or the font changes", () => {
		const managed = section("### Settings Stylesmith changes for you");
		const keys = [
			"editor.fontFamily",
			"terminal.integrated.fontFamily",
			...EFFECTS.flatMap(effect => effect.editorSettings ?? []).map(setting => setting.key)
		];
		for (const key of keys) assert.ok(managed.includes(`\`${key}\``), key);
	});
});
