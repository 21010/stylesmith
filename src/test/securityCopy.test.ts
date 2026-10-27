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

	it("no longer mentions Stylesmith 1.x, whose cleanup was removed (#115)", () => {
		for (const file of ["package.json", "README.md", "SECURITY.md", "site/security.html"])
			assert.doesNotMatch(read(file), /Stylesmith 1\.x|1\.x\b/, file);
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

	it("keeps .vscodeignore free of blanket !out/** overrides so tests, maps and declarations stay excluded (#197)", () => {
		const ignore = read(".vscodeignore");
		assert.doesNotMatch(ignore, /^!out\b/m);
		assert.match(ignore, /^out\/test\/\*\*$/m);
		assert.match(ignore, /^\*\*\/\*\.map$/m);
		assert.match(ignore, /^\*\*\/\*\.ts$/m);
	});

	it("matches .vscodeignore out/*.js exclusions to the extension.ts runtime module graph (#208)", () => {
		const ignoreLines = new Set(
			read(".vscodeignore")
				.split(/\r?\n/)
				.map(line => line.trim())
		);
		const reachable = new Set<string>();
		const queue = ["extension.ts"];
		while (queue.length > 0) {
			const current = queue.pop()!;
			if (reachable.has(current)) continue;
			reachable.add(current);
			const content = read(`src/${current}`);
			for (const match of content.matchAll(
				/import\s+(?!type\b)[\s\S]*?from\s+"\.\/*([^"]+)"/g
			)) {
				const target = `${match[1]}.ts`;
				if (sources.includes(target) && !reachable.has(target)) queue.push(target);
			}
		}
		for (const file of sources) {
			const outJs = `out/${file.replace(/\.ts$/, ".js")}`;
			if (reachable.has(file)) {
				assert.ok(
					!ignoreLines.has(outJs),
					`${outJs} is imported at runtime and must not be in .vscodeignore`
				);
			} else {
				assert.ok(
					ignoreLines.has(outJs),
					`${outJs} is only used by tests/scripts and must be excluded in .vscodeignore`
				);
			}
		}
	});
});
