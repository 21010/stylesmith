// Fits a theme's terminal palette to the theme (#100): for each ANSI color, the color closest to
// the theme's own colors that still
// - keeps its hue family, since programs rely on it (red for errors, green for success)
// - is no more saturated than the theme, with a floor so red and green read as colors
// - has 4.5:1 contrast on the terminal background, and room for a lighter bright variant
// - stays apart from the other colors, and red from green with every kind of color blindness
// Red and green are chosen together. src/test/themes.test.ts checks the result.
//
// Run with: npm run compile && node scripts/fit-terminal-palettes.mjs <theme id>...
// It rewrites those themes' ansi colors in scripts/data/palettes.mjs; then run npm run themes.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { colorDifference, contrast, fromOklch, oklch, VISION } from "../out/color.js";
import { palettes } from "./data/palettes.mjs";

const PALETTES = join(dirname(fileURLToPath(import.meta.url)), "data", "palettes.mjs");

const FAMILIES = {
	red: [
		[0, 40],
		[350, 360]
	],
	yellow: [[65, 110]],
	green: [[125, 165]],
	cyan: [[182, 232]],
	blue: [[240, 285]],
	magenta: [[295, 345]]
};
const CENTER = { red: 25, yellow: 95, green: 145, cyan: 200, blue: 258, magenta: 325 };
const normal = VISION["normal vision"];
const dE = (a, b) => colorDifference(a, b, normal);

// OKLCH -> sRGB hex, or null outside the gamut.
const hex = (L, C, h) => fromOklch(L, C, h) ?? null;
// The wider ranges the tests accept, for a theme with no solution in the strict ones.
const WIDE = {
	red: [
		[0, 50],
		[340, 360]
	],
	yellow: [[55, 118]],
	green: [[115, 178]],
	cyan: [[176, 245]],
	blue: [[230, 292]],
	magenta: [[285, 352]]
};
let families = FAMILIES;
const inFamily = (h, fam) => families[fam].some(([a, b]) => h >= a && h <= b);
const hueGap = (h, c) => Math.min(Math.abs(h - c), 360 - Math.abs(h - c));

/** The bright variant: the same hue and saturation, lighter (or, in a light theme, darker if lighter won't do). */
function brightOf(c, light) {
	const { l, c: C, h } = oklch(c);
	const steps = light ? [-0.07, -0.05, 0.06] : [0.09, 0.07, 0.05];
	for (const d of steps) {
		for (let k = 1; k >= 0.5; k -= 0.1) {
			const b = hex(l + d, C * k, h);
			if (b && contrast(b, TERM_BG) >= 4.55 && dE(b, c) >= 6) return b;
		}
	}
	return null;
}
let TERM_BG;

/**
 * @param {import("./data/palette.js").Palette} p
 * @param {string} termBg
 */
function optimize(p, termBg) {
	TERM_BG = termBg;
	const light = p.kind === "light";
	const own = [p.accent, p.accentAlt, ...Object.values(p.tokens)];
	const base = Math.max(...own.map(c => oklch(c).c)) + 0.015;
	const relaxed = {};
	const level = 4.5;
	const nearestFor = () => c => Math.min(...own.map(x => dE(c, x)));
	const chosen = {};
	const order = ["red", "green", "cyan", "yellow", "blue", "magenta"];
	// All candidates for a slot, best first, given the colors already chosen.
	const candidates = (fam, cmaxExtra, wide) => {
		families = wide ? WIDE : FAMILIES;
		const nearest = nearestFor();
		const cmin = fam === "red" || fam === "green" ? 0.08 : 0.045;
		const cmax = base + cmaxExtra;
		const list = [];
		for (let h = 0; h < 360; h += 2) {
			if (!inFamily(h, fam)) continue;
			for (let C = cmin; C <= Math.max(cmax, cmin + 0.03); C += 0.006) {
				for (let L = 0.25; L <= 0.97; L += 0.012) {
					const c = hex(L, C, h);
					if (!c || contrast(c, termBg) < level + 0.05) continue;
					// Leave room for the bright variant: lighter in dark themes.
					if (light ? L < 0.36 : L > 0.84) continue;
					if (Object.values(chosen).some(v => dE(c, v) < 12)) continue;
					const bright = brightOf(c, light);
					if (!bright) continue;
					// Red and green must stay apart with color blindness, also as bright colors.
					if (fam === "green") {
						const brightRed = brightOf(chosen.red, light);
						if (
							Object.values(VISION).some(
								m =>
									colorDifference(c, chosen.red, m) < 15.5 ||
									colorDifference(bright, brightRed, m) < 15.5
							)
						)
							continue;
					}
					const pull = fam === "red" || fam === "green" ? 0.35 : 0.12;
					list.push({ c, cost: nearest(c) + pull * hueGap(h, CENTER[fam]) });
				}
			}
		}
		families = FAMILIES;
		return list.sort((a, b) => a.cost - b.cost);
	};
	// Red and green are chosen together: the best pair that stays apart with color blindness.
	let pair = null;
	for (let extra = 0; !pair && extra <= 0.12; extra += 0.02) {
		for (const wide of [false, true]) {
			if (pair) break;
			const reds = candidates("red", extra, wide)
				.filter((r, i, all) => all.findIndex(x => dE(x.c, r.c) < 4) === i)
				.slice(0, 25);
			for (const red of reds) {
				chosen.red = red.c;
				const green = candidates("green", extra, wide)[0];
				if (green && (!pair || red.cost + green.cost < pair.cost))
					pair = { red: red.c, green: green.c, cost: red.cost + green.cost };
			}
			delete chosen.red;
			if (pair && (extra || wide)) relaxed.redGreen = { extra, wide };
		}
	}
	if (!pair) throw new Error(`${p.id}: no red and green pair`);
	chosen.red = pair.red;
	chosen.green = pair.green;
	for (const fam of ["cyan", "yellow", "blue", "magenta"]) {
		let best;
		for (let extra = 0; !best && extra <= 0.12; extra += 0.02) {
			best = candidates(fam, extra, false)[0] ?? candidates(fam, extra, true)[0];
			if (best && extra) relaxed[fam] = extra;
		}
		if (!best) throw new Error(`${p.id}: no color for ${fam}`);
		chosen[fam] = best.c;
	}
	for (const fam of order)
		chosen["bright" + fam[0].toUpperCase() + fam.slice(1)] = brightOf(chosen[fam], light);
	if (
		Object.values(VISION).some(
			m => colorDifference(chosen.brightRed, chosen.brightGreen, m) < 15.5
		)
	)
		throw new Error(`${p.id}: bright red and green too close`);
	if (Object.keys(relaxed).length) console.error(`${p.id}: relaxed chroma for`, relaxed);
	return chosen;
}

const ids = process.argv.slice(2);
if (ids.length === 0) throw new Error("name the themes to fit, e.g. countdown");
let text = readFileSync(PALETTES, "utf-8");
for (const id of ids) {
	const palette = palettes.find(p => p.id === id);
	if (!palette) throw new Error(`no theme ${id}`);
	const fitted = optimize(palette, palette.bgDark);
	const start = text.indexOf("\n\t\tansi: {", text.indexOf(`\t\tid: "${id}",`));
	const end = text.indexOf("\n\t\t}", start);
	let block = text.slice(start, end);
	for (const [slot, color] of Object.entries(fitted)) {
		block = block.replace(
			new RegExp(`(\\n\\t\\t\\t${slot}: ")#[0-9a-f]{6}(")`),
			`$1${color}$2`
		);
	}
	text = text.slice(0, start) + block + text.slice(end);
	console.log(`${id}: ${JSON.stringify(fitted)}`);
}
writeFileSync(PALETTES, text);
