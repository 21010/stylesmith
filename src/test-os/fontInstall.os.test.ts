/**
 * Installs and removes a real font on the machine it runs on, as the extension does: downloaded
 * from the fonts-3.5.1 release, checked against its pins, installed for the current user. CI runs
 * it on Windows, macOS and Linux (the font-install job); `npm test` doesn't, because it downloads
 * and changes the machine.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { FONTS } from "../fonts";
import {
	installFont,
	isInstalled,
	nodeSystem,
	REGISTRY_KEY,
	removeFont,
	userFontDir
} from "../fontInstall";

const font = FONTS.find(candidate => candidate.id === "SpaceMono");
const system = nodeSystem();

/** Whether the operating system itself lists the font. */
function systemSees(family: string, registry: string[]): boolean {
	if (process.platform === "win32") {
		return registry.every(name => {
			try {
				execFileSync("reg", ["query", REGISTRY_KEY, "/v", name], { stdio: "ignore" });
				return true;
			} catch {
				return false;
			}
		});
	}
	if (process.platform === "linux") {
		return execFileSync("fc-list", [":", "family"], { encoding: "utf-8" }).includes(family);
	}
	return true; // macOS reads ~/Library/Fonts directly; the file check below covers it
}

describe(`installing a font on ${process.platform}`, () => {
	it("downloads, checks, installs, finds and removes SpaceMono for the current user", async () => {
		assert.ok(font, "SpaceMono is one of Stylesmith's fonts");
		const licenses = await mkdtemp(path.join(os.tmpdir(), "stylesmith-licenses-"));
		try {
			assert.equal(await isInstalled(font, system), false, "not installed beforehand");

			const installed = await installFont(font, system, licenses);
			for (const file of installed.files) {
				assert.equal(path.dirname(file), userFontDir(system));
				assert.ok(existsSync(file), file);
			}
			assert.ok(existsSync(path.join(licenses, font.license.name)));
			assert.equal(await isInstalled(font, system), true);
			assert.ok(systemSees(font.family, installed.registry), "the system lists the font");

			assert.deepEqual(await removeFont(installed, system), []);
			for (const file of installed.files) assert.equal(existsSync(file), false, file);
			assert.equal(await isInstalled(font, system), false);
			if (process.platform === "win32") {
				assert.equal(systemSees(font.family, installed.registry), false, "unregistered");
			}
			if (process.platform === "linux") {
				assert.equal(systemSees(font.family, []), false, "fontconfig forgot it");
			}
		} finally {
			await rm(licenses, { recursive: true, force: true });
		}
	});
});
