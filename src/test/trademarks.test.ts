import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { ROOT } from "./files";

/**
 * Stylesmith describes its inspirations in its own words: no film, game or product names in
 * what users see (issue #27). This checks the known ones in the README, the manifest, the
 * website, the presets, the theme files and the extras. CHANGELOG.md is left out: it records
 * history, including effects that no longer exist.
 *
 * "Night City" and "Black ICE" are preset names the project decided to keep; they aren't on
 * this list. Naming a product to say Stylesmith works with it (Visual Studio Code, Oh My Posh,
 * the Nerd Fonts) is fine.
 */
const DENYLIST: RegExp[] = [
	/\bVT-?100\b/i,
	/\bUNIX\b/i,
	/\bIBM 5151\b/i,
	/\bThe Matrix\b/i,
	/\bEx Machina\b/i,
	/\bFallout\b/i,
	/\bVault-Tec\b/i,
	/\bPip-Boy\b/i,
	/\bVault Boy\b/i,
	/\bCyberpunk 2077\b/i,
	/\bCyberpunk RED\b/,
	/\bNeuromancer\b/i,
	/\bBlade Runner\b/i,
	/\bBethesda\b/i,
	/\bWarner Bros\b/i,
	/\bCD PROJEKT\b/i
];

const TEXT = /\.(md|json|html|js|mjs|ts|css|toml|ya?ml|txt)$/;

function files(dir: string): string[] {
	return readdirSync(path.join(ROOT, dir)).flatMap(name => {
		const relative = path.join(dir, name);
		if (statSync(path.join(ROOT, relative)).isDirectory()) return files(relative);
		return TEXT.test(name) ? [relative] : [];
	});
}

const checked = [
	"README.md",
	"SECURITY.md",
	"package.json",
	path.join("src", "presets.ts"),
	...files("site"),
	...files("themes"),
	...files("extras")
];

describe("trademarks", () => {
	for (const file of checked) {
		it(`${file} names no film, game or product it's inspired by`, () => {
			const text = readFileSync(path.join(ROOT, file), "utf-8");
			for (const name of DENYLIST) {
				const found = name.exec(text);
				assert.equal(found, null, `${file} mentions "${found?.[0]}"`);
			}
		});
	}
});
