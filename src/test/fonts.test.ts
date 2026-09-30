import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
	DEFAULT_FONT_ID,
	FONTS,
	findFont,
	fontFaceCss,
	planApply,
	planRestore,
	preloadScript,
	withFontFirst,
	withoutStylesmithFonts
} from "../fonts";

// Tests run from out/test, two levels below the project root.
const ROOT = path.join(__dirname, "..", "..");
const settings = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf-8")).contributes
	.configuration.properties;

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
	it("embeds each weight as a WOFF2 data URL", () => {
		const css = fontFaceCss(JB, [
			{ weight: 400, data: Buffer.from("regular") },
			{ weight: 700, data: Buffer.from("bold") }
		]);
		assert.match(css, /font-family: "JetBrainsMono Nerd Font Mono"/);
		assert.match(
			css,
			/url\(data:font\/woff2;base64,cmVndWxhcg==\) format\("woff2"\); font-weight: 400/
		);
		assert.match(css, /font-weight: 700/);
		assert.doesNotMatch(css, /<\/style/i);
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

describe("font settings", () => {
	it("remember that the setting was not set, and remove it again on restore", () => {
		const plan = planApply(undefined, DEFAULT, undefined, JB, false)!;
		assert.equal(plan.value, `'${JB}', ${DEFAULT}`);
		assert.equal(plan.saved.previous, undefined);
		assert.equal(planRestore(plan.value, plan.saved), undefined);
	});

	it("restore the user's exact previous value", () => {
		const plan = planApply("Fira Code", DEFAULT, undefined, JB, false)!;
		assert.equal(plan.value, `'${JB}', Fira Code`);
		assert.equal(planRestore(plan.value, plan.saved), "Fira Code");
	});

	it("keep the original value across repeated Enable/Reload", () => {
		const first = planApply("Fira Code", DEFAULT, undefined, JB, false)!;
		const again = planApply(first.value, DEFAULT, first.saved, JB, false)!;
		assert.equal(again.value, first.value);
		assert.equal(planRestore(again.value, again.saved), "Fira Code");
	});

	it("respect a font the user picked after Stylesmith changed it", () => {
		const plan = planApply("Fira Code", DEFAULT, undefined, JB, false)!;
		assert.equal(planRestore(`'${JB}', Hack`, plan.saved), "Hack");
		assert.equal(planRestore("Hack", plan.saved), "Hack");
	});

	it("leave an empty terminal font alone, because it follows the editor font", () => {
		assert.equal(planApply(undefined, "", undefined, JB, true), undefined);
		assert.equal(planApply("Hack", "", undefined, JB, true)?.value, `'${JB}', Hack`);
	});
});
