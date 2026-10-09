import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { PRESETS } from "../presets";
import { BOOT_LOGS, DEFAULT_BOOT_LOG } from "../stories";
import { manifest, ROOT } from "./files";

/**
 * Stylesmith describes the films and games that inspired it in its own words, never by title
 * (issues #27 and #66): this checks the known titles in the README, the manifest, the website,
 * the presets, the theme files and the extras. CHANGELOG.md is left out: it records history.
 *
 * Books and historic hardware may be named as inspiration, with credit (the Themes page lists
 * their owners), but never in a theme or preset name: those stay Stylesmith's own.
 * "Night City" and "Black ICE" are preset names the project decided to keep.
 */
const DENYLIST: RegExp[] = [
	/\bUNIX\b/i,
	/\bThe Matrix\b/i,
	/\bEx Machina\b/i,
	/\bFallout\b/i,
	/\bVault-Tec\b/i,
	/\bPip-Boy\b/i,
	/\bVault Boy\b/i,
	/\bCyberpunk 2077\b/i,
	/\bCyberpunk RED\b/,
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
	path.join("src", "stories.ts"),
	...files("site"),
	...files("themes"),
	...files("extras")
];

/** Hardware makers, models and authors: may be named as inspiration, never in a name or a log. */
const NAMED: RegExp[] = [
	/\bVT-?\d+/i,
	/\bIBM\b/i,
	/\bDEC\b/,
	/\bNeuromancer\b/i,
	/\bGibson\b/i,
	/\bChiang\b/i,
	...DENYLIST
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

	it("keeps theme and preset names Stylesmith's own", () => {
		const names = [
			...manifest().contributes.themes.map(theme => theme.label),
			...PRESETS.map(preset => preset.label)
		];
		for (const name of names) {
			for (const pattern of NAMED) assert.equal(pattern.exec(name), null, name);
		}
	});

	it("keeps the boot logs free of product and maker names", () => {
		for (const log of [...Object.values(BOOT_LOGS), DEFAULT_BOOT_LOG]) {
			for (const { text } of log.lines) {
				for (const pattern of NAMED) assert.equal(pattern.exec(text), null, text);
			}
		}
	});
});
