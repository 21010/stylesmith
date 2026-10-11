import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { colorDifference, contrast, luminance, mix, oklch, VISION } from "../color";

describe("color", () => {
	it("computes WCAG luminance and contrast", () => {
		assert.equal(luminance("#000000"), 0);
		assert.equal(luminance("#ffffff"), 1);
		assert.equal(contrast("#000000", "#ffffff"), 21);
		assert.equal(contrast("#ffffff", "#000000"), 21);
		assert.equal(contrast("#777777", "#777777"), 1);
		// A well-known reference: #767676 on white is just above 4.5:1.
		assert.ok(contrast("#767676", "#ffffff") >= 4.5);
		assert.ok(contrast("#777777", "#ffffff") < 4.5);
	});

	it("ignores an alpha part", () => {
		assert.equal(contrast("#00000080", "#ffffff"), 21);
	});

	it("mixes like CSS color-mix in srgb", () => {
		assert.equal(mix("#ff0000", "#000000", 50), "#800000");
		assert.equal(mix("#ffffff", "#000000", 0), "#000000");
		assert.equal(mix("#ffffff", "#000000", 100), "#ffffff");
	});

	it("measures color differences with color blindness", () => {
		const normal = VISION["normal vision"];
		assert.equal(colorDifference("#336699", "#336699", normal), 0);
		// Pure red and green look very different normally, much less so with deuteranopia.
		const red = "#ff0000",
			green = "#00ff00";
		assert.ok(
			colorDifference(red, green, normal) > colorDifference(red, green, VISION.deuteranopia)
		);
	});
});

describe("oklch", () => {
	it("matches the published OKLCH values of the sRGB primaries", () => {
		const close = (hex: string, l: number, c: number, h: number) => {
			const o = oklch(hex);
			assert.ok(
				Math.abs(o.l - l) < 0.002 && Math.abs(o.c - c) < 0.002 && Math.abs(o.h - h) < 0.5,
				hex
			);
		};
		close("#ff0000", 0.628, 0.258, 29.2);
		close("#00ff00", 0.866, 0.295, 142.5);
		close("#0000ff", 0.452, 0.313, 264.1);
	});

	it("gives greys no chroma", () => {
		assert.ok(oklch("#808080").c < 0.0005);
		assert.ok(Math.abs(oklch("#ffffff").l - 1) < 0.001);
	});
});
