import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { ROOT } from "./files";

const read = (file: string) => readFileSync(path.join(ROOT, file), "utf-8");
const readme = read("README.md");
const policy = read("SECURITY.md");
const manifest = JSON.parse(read("package.json")) as {
	description: string;
	contributes: {
		configuration: { properties: Record<string, { markdownDescription?: string }> };
	};
};
const homepage = read("site/index.html");
const securityPage = read("site/security.html");

describe("public security and recovery copy", () => {
	it("says that Stylesmith modifies installed workbench files", () => {
		assert.match(readme, /modifies the installed VS Code workbench files/);
		assert.match(policy, /modifies VS Code's installed workbench files/);
		assert.match(manifest.description, /modifies installed workbench files/);
		assert.match(homepage, /modifies installed workbench files/);
		assert.match(securityPage, /modifies VS Code's installed workbench/);
	});

	it("explains that custom JavaScript retains workbench privileges", () => {
		assert.match(readme, /Your own JavaScript runs in VS Code's workbench context/);
		assert.match(policy, /Custom JavaScript runs in the workbench context/);
		assert.match(manifest.description, /custom JavaScript runs with workbench privileges/);
		assert.match(homepage, /do not\s+sandbox custom JavaScript/);
		assert.match(securityPage, /Custom JavaScript runs in the workbench context/);
	});

	it("does not present a workbench checksum as proof of authenticity", () => {
		assert.match(readme, /checksum is not an authenticity guarantee/);
		assert.match(policy, /checksum is not proof of authenticity/);
		assert.match(
			manifest.contributes.configuration.properties["stylesmith.silenceCorruptWarning"]
				?.markdownDescription ?? "",
			/not proof of authenticity/
		);
		assert.match(homepage, /checksum is not proof of authenticity/);
		assert.match(securityPage, /not an authenticity check/);
	});

	it("distinguishes Disable recovery from the best-effort uninstall hook", () => {
		assert.match(readme, /uninstall hook .*does not restore managed user settings/);
		assert.match(policy, /does not restore managed user settings/);
		assert.match(securityPage, /uninstall hook attempts only\s+workbench and font cleanup/);
	});
});
