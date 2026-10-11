import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { manifest, readJson, ROOT, type ColorTheme } from "./files";

/**
 * The prompt previews on the Oh My Posh page (#100): one per color theme, in the colors the
 * prompt takes from that theme. They're written by scripts/build-prompt-previews.mjs.
 */

const page = readFileSync(path.join(ROOT, "site", "oh-my-posh.html"), "utf-8");
const config = readFileSync(
	path.join(ROOT, "extras", "oh-my-posh", "stylesmith.omp.json"),
	"utf-8"
);
// The prompt's roles, and the ANSI color the Oh My Posh config gives each.
const ROLES: Record<string, [string, string]> = {
	path: ["terminal.ansiCyan", '"foreground": "cyan"'],
	git: ["terminal.ansiGreen", '"foreground": "green"'],
	took: ["terminal.ansiYellow", '"foreground": "yellow"'],
	error: ["terminal.ansiRed", '"foreground": "red"'],
	ok: ["terminal.ansiBrightGreen", '"foreground": "lightGreen"'],
	fail: ["terminal.ansiBrightRed", "lightRed"],
	chrome: ["terminal.ansiBrightBlack", '"foreground": "darkGray"']
};

describe("Oh My Posh prompt previews", () => {
	// Prettier may spread a preview's tag and style over several lines.
	const previews = new Map(
		[
			...page.matchAll(
				/<figure\s+class="prompt-preview"\s+data-theme="([^"]+)"\s+style="([^"]+)"/g
			)
		].map(([, label, style]) => [label!, style!.replace(/\s+/g, " ")])
	);

	it("shows every color theme once", () => {
		assert.deepEqual(
			[...previews.keys()].sort(),
			manifest()
				.contributes.themes.map(theme => theme.label)
				.sort()
		);
	});

	it("draws the roles the Oh My Posh config uses", () => {
		for (const [, needle] of Object.values(ROLES)) assert.ok(config.includes(needle), needle);
	});

	for (const entry of manifest().contributes.themes) {
		it(`draws ${entry.label} in its own terminal colors`, () => {
			const colors = readJson<ColorTheme>(entry.path).colors;
			const style = previews.get(entry.label) ?? "";
			const keys: Record<string, string> = {
				bg: "terminal.background",
				fg: "terminal.foreground",
				...Object.fromEntries(Object.entries(ROLES).map(([role, [key]]) => [role, key]))
			};
			for (const [role, key] of Object.entries(keys)) {
				const color = colors[key]!.slice(0, 7);
				assert.ok(style.includes(`--p-${role}: ${color}`), `${role}: ${color}`);
			}
		});
	}
});
