import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { PRESETS } from "../presets";
import { PRESET_STORIES, THEME_STORIES } from "../stories";
import { manifest, ROOT } from "./files";

/**
 * src/stories.ts is the one place where the stories are written; the Themes page and the README
 * (also the Marketplace listing) must show them word for word.
 */

const read = (file: string) => readFileSync(path.join(ROOT, file), "utf-8");
const words = (html: string) =>
	html
		.replace(/<[^>]+>/g, " ")
		.replace(/&rsquo;/g, "’")
		.replace(/\s+/g, " ")
		.trim();
const themesPage = read(path.join("site", "themes.html"));
const readme = read("README.md");

/** The story paragraph (the <p> without a class) of the card titled `title`. */
function cardStory(kind: string, title: string): string | undefined {
	for (const [card] of themesPage.matchAll(
		new RegExp(`<li class="${kind}[^"]*">[\\s\\S]*?</li>`, "g")
	)) {
		if (!card.includes(`<h4>${title}</h4>`)) continue;
		const story = /<p>([\s\S]*?)<\/p>/.exec(card)?.[1];
		return story === undefined ? undefined : words(story);
	}
	return undefined;
}

describe("stories", () => {
	it("has a story for every preset and every color theme, and nothing else", () => {
		assert.deepEqual(Object.keys(PRESET_STORIES).sort(), PRESETS.map(p => p.label).sort());
		assert.deepEqual(
			Object.keys(THEME_STORIES).sort(),
			manifest()
				.contributes.themes.map(theme => theme.label)
				.sort()
		);
	});

	for (const [label, story] of Object.entries(PRESET_STORIES)) {
		it(`shows the ${label} preset's story on the Themes page and in the README`, () => {
			assert.equal(cardStory("preset-card", label), story);
			assert.ok(readme.includes(`- **${label}**: ${story}`), "README");
		});
	}

	for (const [label, story] of Object.entries(THEME_STORIES)) {
		it(`shows the ${label} theme's story on the Themes page and in the README`, () => {
			assert.equal(cardStory("theme-card", label), story);
			assert.ok(readme.includes(`- **${label}**: ${story}`), "README");
		});
	}
});
