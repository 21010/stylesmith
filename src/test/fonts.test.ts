import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { DEFAULT_FONT_ID, FONTS, findFont, withFontFirst, withoutStylesmithFonts } from "../fonts";
import { manifest, ROOT } from "./files";

const settings = manifest().contributes.configuration.properties;
const JB = "JetBrainsMono Nerd Font Mono";
const DEFAULT = "Consolas, 'Courier New', monospace";

describe("system-installed fonts", () => {
	it("matches the font setting and does not claim to bundle or install font files", () => {
		const setting = settings["stylesmith.fonts.family"];
		assert.ok(setting);
		assert.deepEqual(
			setting.enum,
			FONTS.map(font => font.id)
		);
		assert.equal(setting.default, DEFAULT_FONT_ID);
		assert.equal(setting.scope, "application");
		assert.match(setting.markdownDescription ?? "", /already installed on your system/);
	});

	it("falls back to the default font for an unknown setting value", () => {
		assert.equal(findFont("nope").id, DEFAULT_FONT_ID);
	});
});

describe("font-family settings", () => {
	it("puts the selected installed font first and keeps user fallbacks", () => {
		assert.equal(withFontFirst(DEFAULT, JB), `'${JB}', ${DEFAULT}`);
	});

	it("replaces a previously selected Stylesmith family instead of stacking it", () => {
		const before = `'DepartureMono Nerd Font Mono', ${DEFAULT}`;
		assert.equal(withFontFirst(before, JB), `'${JB}', ${DEFAULT}`);
	});

	it("removes only known Stylesmith families when restoring changed user settings", () => {
		assert.equal(
			withoutStylesmithFonts(`"${JB}", Fira Code, monospace`),
			"Fira Code, monospace"
		);
	});
});

describe("Fonts page", () => {
	const page = readFileSync(path.join(ROOT, "site", "fonts.html"), "utf-8");
	for (const font of FONTS) {
		it(`shows ${font.id} with a link to download it`, () => {
			const card = new RegExp(`<h3>${font.id}</h3>[\\s\\S]*?</article>`).exec(page)?.[0];
			assert.ok(card, "a card");
			assert.match(
				card,
				/href="https:\/\/github\.com\/ryanoasis\/nerd-fonts\/releases\/download\/v[\d.]+\/\w+\.zip"/
			);
		});
	}
});
