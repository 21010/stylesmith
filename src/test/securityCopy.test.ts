import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { readText, ROOT } from "./files";

const read = (file: string) => readText(file);
const manifest = JSON.parse(read("package.json")) as {
	description: string;
	capabilities?: { untrustedWorkspaces?: { supported?: boolean } };
	contributes: { configuration: { properties: Record<string, unknown> } };
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
			assert.equal(settings[key], undefined, key);
			const name = `"${key.replace("stylesmith.", "")}"`;
			for (const file of sources)
				assert.ok(!read(`src/${file}`).includes(name), `${file} uses ${key}`);
		}
	});

	it("documents the API-only boundary", () => {
		assert.match(read("README.md"), /does not modify VS Code installation files/);
		assert.match(read("SECURITY.md"), /does not read or write VS Code installation files/);
	});

	it("never looks at VS Code's installation", () => {
		const touching = sources.filter(file =>
			/appRoot|product\.json|workbench\.html/.test(read(`src/${file}`))
		);
		assert.deepEqual(touching, []);
	});

	it("downloads and runs programs only to install fonts, in fontInstall.ts", () => {
		const using = sources.filter(file =>
			/from "(node:)?(https?|child_process|net)"/.test(read(`src/${file}`))
		);
		assert.deepEqual(using, ["fontInstall.ts"]);
		assert.match(read("SECURITY.md"), /src\/fontInstall\.ts/);
	});
});
