import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { manifest, readJson, ROOT, type ColorTheme } from "./files";

/**
 * The prompt previews on the Oh My Posh page (#100): one per color theme, in the colors the
 * prompt takes from that theme. They're written by scripts/build-prompt-previews.mjs.
 */

export function describeThemePreviews(
	title: string,
	pageFile: string,
	configFile: string,
	rolesLabel: string,
	roles: Readonly<Record<string, readonly [string, string]>>
): void {
	const page = readFileSync(path.join(ROOT, pageFile), "utf-8");
	const config = readFileSync(path.join(ROOT, configFile), "utf-8");

	describe(title, () => {
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

		it(`draws the roles the ${rolesLabel} uses`, () => {
			for (const [, needle] of Object.values(roles))
				assert.ok(config.includes(needle), needle);
		});

		for (const entry of manifest().contributes.themes) {
			it(`draws ${entry.label} in its own terminal colors`, () => {
				const colors = readJson<ColorTheme>(entry.path).colors;
				const style = previews.get(entry.label) ?? "";
				const keys: Record<string, string> = {
					bg: "terminal.background",
					fg: "terminal.foreground",
					...Object.fromEntries(Object.entries(roles).map(([role, [key]]) => [role, key]))
				};
				for (const [role, key] of Object.entries(keys)) {
					const color = colors[key]!.slice(0, 7);
					assert.ok(style.includes(`--p-${role}: ${color}`), `${role}: ${color}`);
				}
			});
		}
	});
}

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

describeThemePreviews(
	"Oh My Posh prompt previews",
	"site/oh-my-posh.html",
	"extras/oh-my-posh/stylesmith.omp.json",
	"Oh My Posh config",
	ROLES
);
