import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CELLS_PER_COLUMN, GLYPHS, Rain, reducesMotion, render, seeded, stillFrame } from "../rain";

describe("digital rain", () => {
	it("is the same rain for the same seed", () => {
		const a = new Rain(40, 20, 7);
		const b = new Rain(40, 20, 7);
		for (let frame = 0; frame < 100; frame++) assert.deepEqual(a.step(), b.step());
	});

	it("is different rain for another seed", () => {
		const frames = (seed: number) => {
			const rain = new Rain(40, 20, seed);
			return Array.from({ length: 50 }, () => rain.step());
		};
		assert.notDeepEqual(frames(1), frames(2));
	});

	it("changes at most a few cells per column a frame, whatever the height", () => {
		for (const rows of [5, 50, 400]) {
			const rain = new Rain(30, rows, 3);
			for (let frame = 0; frame < 2000; frame++) {
				assert.ok(rain.step().length <= 30 * CELLS_PER_COLUMN);
			}
		}
	});

	it("draws only inside the screen", () => {
		const rain = new Rain(12, 8, 5);
		for (let frame = 0; frame < 500; frame++) {
			for (const { x, y } of rain.step()) {
				assert.ok(x >= 0 && x < 12 && y >= 0 && y < 8, `${x},${y}`);
			}
		}
	});

	it("keeps falling: every column gets new drops", () => {
		const rain = new Rain(10, 10, 11);
		const heads = new Map<number, number>();
		for (let frame = 0; frame < 2000; frame++) {
			for (const cell of rain.step()) {
				if (cell.shade === "head" && cell.y === 0)
					heads.set(cell.x, (heads.get(cell.x) ?? 0) + 1);
			}
		}
		for (let x = 0; x < 10; x++) assert.ok((heads.get(x) ?? 0) >= 2, `column ${x}`);
	});

	it("uses digits, Latin letters and symbols only: no katakana", () => {
		assert.doesNotMatch(GLYPHS, /[゠-ヿｦ-ﾟ]/);
		const rain = new Rain(20, 20, 9);
		for (let frame = 0; frame < 300; frame++) {
			for (const { glyph } of rain.step()) assert.ok(glyph === " " || GLYPHS.includes(glyph));
		}
	});

	it("handles an empty or tiny terminal", () => {
		assert.deepEqual(new Rain(0, 0, 1).step(), []);
		const rain = new Rain(1, 1, 1);
		for (let frame = 0; frame < 100; frame++) rain.step();
	});

	it("starts over at a new size", () => {
		const rain = new Rain(10, 10, 4);
		rain.resize(3, 4);
		for (let frame = 0; frame < 200; frame++) {
			for (const { x, y } of rain.step()) assert.ok(x < 3 && y < 4);
		}
	});

	it("draws with the terminal's own green colors, never a full-screen fill", () => {
		const out = render([
			{ x: 0, y: 0, glyph: "A", shade: "head" },
			{ x: 1, y: 2, glyph: "b", shade: "body" },
			{ x: 2, y: 3, glyph: "c", shade: "tail" },
			{ x: 3, y: 4, glyph: " ", shade: "blank" }
		]);
		assert.equal(
			out,
			"\x1b[1;1H\x1b[0;1;92mA\x1b[3;2H\x1b[0;32mb\x1b[4;3H\x1b[0;2;32mc\x1b[5;4H\x1b[0m "
		);
		const codes = [...out.matchAll(/\[([0-9;]*)([A-Za-z])/g)].map(([, args, end]) => ({
			args: args!,
			end
		}));
		assert.ok(
			codes.every(({ end }) => end === "H" || end === "m"),
			"only cursor moves and colors: no clearing"
		);
		const colors = codes
			.filter(({ end }) => end === "m")
			.flatMap(({ args }) => args.split(";"));
		assert.ok(
			colors.every(code => ["0", "1", "2", "32", "92"].includes(code)),
			"only the terminal's own greens: no backgrounds or fixed colors"
		);
	});

	it("shows a still frame for reduced motion, without erased cells", () => {
		const cells = stillFrame(20, 10, 1);
		assert.ok(cells.length > 0);
		assert.ok(cells.every(cell => cell.shade !== "blank"));
		assert.deepEqual(stillFrame(20, 10, 1), cells);
	});

	it("follows workbench.reduceMotion", () => {
		assert.equal(reducesMotion("on"), true);
		assert.equal(reducesMotion("off"), false);
		assert.equal(reducesMotion("auto"), false);
		assert.equal(reducesMotion(undefined), false);
	});

	it("has a seeded generator in [0, 1)", () => {
		const random = seeded(42);
		for (let i = 0; i < 1000; i++) {
			const value = random();
			assert.ok(value >= 0 && value < 1);
		}
	});
});
