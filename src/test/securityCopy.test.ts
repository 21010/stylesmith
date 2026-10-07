import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { ROOT } from "./files";

const read = (file: string) => readFileSync(path.join(ROOT, file), "utf-8");
const manifest = JSON.parse(read("package.json")) as {
	description: string;
	capabilities?: { untrustedWorkspaces?: { supported?: boolean } };
	contributes: {
		configuration: {
			properties: Record<string, { markdownDeprecationMessage?: string } | undefined>;
		};
	};
};
const sources = readdirSync(path.join(ROOT, "src")).filter(file => file.endsWith(".ts"));

describe("API-only security boundary", () => {
	it("declares that Stylesmith does not modify the VS Code installation", () => {
		assert.match(manifest.description, /does not modify VS Code installation files/);
		assert.equal(manifest.capabilities?.untrustedWorkspaces?.supported, true);
	});

	it("does not expose custom imports or checksum-suppression settings", () => {
		const settings = manifest.contributes.configuration.properties;
		for (const key of [
			"stylesmith.imports",
			"stylesmith.allowCustomJavaScript",
			"stylesmith.allowRemoteImports",
			"stylesmith.silenceCorruptWarning"
		]) {
			// An old setting may only be declared as deprecated, so Stylesmith can remove it.
			const schema = settings[key];
			if (schema) assert.ok(schema.markdownDeprecationMessage, key);
			const name = `"${key.replace("stylesmith.", "")}"`;
			for (const file of sources.filter(file => file !== "oldSettings.ts"))
				assert.ok(!read(`src/${file}`).includes(name), `${file} uses ${key}`);
		}
	});

	it("documents the API-only boundary", () => {
		assert.match(read("README.md"), /does not modify VS Code installation files/);
		assert.match(read("SECURITY.md"), /does not read or write VS Code installation files/);
	});

	it("touches the installation only in the documented 1.x cleanup", () => {
		const touching = readdirSync(path.join(ROOT, "src"))
			.filter(file => file.endsWith(".ts"))
			.filter(file => /appRoot|product\.json|workbench\.html/.test(read(`src/${file}`)));
		// extension.ts only passes vscode.env.appRoot to the cleanup.
		assert.deepEqual(touching.sort(), ["extension.ts", "legacyCleanup.ts"]);
		assert.match(read("src/extension.ts"), /removeLegacyPatch\(vscode\.env\.appRoot\)/);
		assert.equal(read("src/extension.ts").match(/appRoot/g)?.length, 1);
		assert.match(read("SECURITY.md"), /src\/legacyCleanup\.ts/);
	});
});
