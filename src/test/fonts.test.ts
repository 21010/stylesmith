import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
	DEFAULT_FONT_ID,
	FONTS,
	findFont,
	fontFaceCss,
	preloadScript,
	withFontFirst,
	withoutStylesmithFonts
} from "../fonts";
import { manifest } from "./files";

// Tests run from out/test, two levels below the project root.
const ROOT = path.join(__dirname, "..", "..");
const settings = manifest().contributes.configuration.properties;

const JB = "JetBrainsMono Nerd Font Mono";
const DEFAULT = "Consolas, 'Courier New', monospace";

describe("bundled fonts", () => {
	it("match the stylesmith.fonts.family setting", () => {
		const setting = settings["stylesmith.fonts.family"];
		assert.deepEqual(
			setting.enum,
			FONTS.map(font => font.id)
		);
		assert.equal(setting.default, DEFAULT_FONT_ID);
		assert.equal(setting.scope, "application");
		assert.equal(settings["stylesmith.fonts.enabled"].scope, "application");
	});

	for (const font of FONTS) {
		it(`${font.id}: ships its files and license`, () => {
			for (const { file } of font.files) {
				assert.ok(existsSync(path.join(ROOT, file)), file);
				// WOFF2 files start with the signature "wOF2".
				assert.equal(readFileSync(path.join(ROOT, file)).subarray(0, 4).toString(), "wOF2");
			}
		});
	}

	it("ship the Nerd Fonts license and one license per font", () => {
		for (const name of [
			"NerdFonts",
			"JetBrainsMono",
			"IBMPlexMono",
			"ShareTechMono",
			"DepartureMono"
		]) {
			assert.ok(
				existsSync(path.join(ROOT, "assets", "fonts", "licenses", `${name}.txt`)),
				name
			);
		}
	});

	it("fall back to the default font for an unknown setting value", () => {
		assert.equal(findFont("nope").id, DEFAULT_FONT_ID);
	});
});

describe("fontFaceCss", () => {
	it("loads each weight from the font folder next to the workbench", () => {
		const css = fontFaceCss(findFont("JetBrainsMono"));
		assert.match(css, /font-family: "JetBrainsMono Nerd Font Mono"/);
		assert.match(
			css,
			/url\("stylesmith-fonts\/JetBrainsMonoNerdFontMono-Regular\.woff2"\) format\("woff2"\); font-weight: 400/
		);
		assert.match(
			css,
			/JetBrainsMonoNerdFontMono-Bold\.woff2"\) format\("woff2"\); font-weight: 700/
		);
		assert.doesNotMatch(css, /data:|<\/style/i);
	});
});

describe("preloadScript", () => {
	it("loads every weight", () => {
		const script = preloadScript(JB, [400, 700]);
		assert.match(
			script,
			/document\.fonts\.load\("400 16px \\"JetBrainsMono Nerd Font Mono\\""\)/
		);
		assert.match(script, /"700 16px/);
	});
});

describe("font-family lists", () => {
	it("put the Nerd Font first and keep the rest as fallbacks", () => {
		assert.equal(withFontFirst(DEFAULT, JB), `'${JB}', ${DEFAULT}`);
	});

	it("replace a previously added Stylesmith font instead of stacking them", () => {
		const before = `'DepartureMono Nerd Font Mono', ${DEFAULT}`;
		assert.equal(withFontFirst(before, JB), `'${JB}', ${DEFAULT}`);
	});

	it("remove only Stylesmith's fonts", () => {
		assert.equal(
			withoutStylesmithFonts(`"${JB}", Fira Code, monospace`),
			"Fira Code, monospace"
		);
	});
});
