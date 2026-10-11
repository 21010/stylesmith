// Fits a theme's syntax colors apart from each other (#116): keyword, string, function, type,
// number and property must differ by at least ΔE 10 (CIE76), so a JSON key never looks like
// its value. It moves the colors that are too close by the smallest steps in OKLCH (lightness,
// then hue and chroma), preferring the roles that carry a theme's identity least (type, number,
// property) over keyword, function and string. Every color keeps the contrast the theme tests
// ask of syntax: on the editor, on the current line and on a Problem Lens line.
// src/test/themes.test.ts checks the result.
//
// Run with: npm run compile && node scripts/fit-syntax-colors.mjs <theme id>...
// It rewrites those themes' token colors in scripts/data/palettes.mjs; then run npm run themes.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { colorDifference, contrast, fromOklch, mix, oklch, VISION } from "../out/color.js";
import { LINE_TINT } from "../out/problems.js";
import { LEVELS, MIN_SYNTAX_DIFFERENCE } from "../out/readability.js";
import { palettes } from "./data/palettes.mjs";

const PALETTES = join(dirname(fileURLToPath(import.meta.url)), "data", "palettes.mjs");
export const ROLES = ["keyword", "string", "function", "type", "number", "property"];
// A little margin over the test's minimum, so rounding to hex can't fall under it.
const TARGET = MIN_SYNTAX_DIFFERENCE + 0.5;
// How much moving each role costs: the lower, the sooner it moves.
const COST = { keyword: 4, function: 3, string: 2, type: 1, number: 1, property: 1 };
const STEPS = [{ l: 0.006 }, { l: -0.006 }, { h: 3 }, { h: -3 }, { c: 0.008 }, { c: -0.008 }];
const normal = VISION["normal vision"];
const dE = (a, b) => colorDifference(a, b, normal);

/** The backgrounds syntax is read on, and the contrast it needs there. */
function readingBackgrounds(p) {
	const kind = p.kind ?? "dark";
	const bg = p.bg.slice(0, 7);
	const tint = LINE_TINT[kind];
	const lines = ["error", "warning", "info"].map(s => mix(p.status[s].slice(0, 7), bg, tint));
	return {
		backgrounds: [bg, p.lineHighlight.slice(0, 7), ...lines],
		minimum: kind.startsWith("hc-") ? LEVELS.high.text : LEVELS.normal.text
	};
}

const shortfall = colors => {
	let sum = 0;
	for (let i = 0; i < ROLES.length; i++)
		for (let j = i + 1; j < ROLES.length; j++) {
			const gap = TARGET - dE(colors[ROLES[i]], colors[ROLES[j]]);
			if (gap > 0) sum += gap * gap;
		}
	return sum;
};

export function fit(p) {
	const { backgrounds, minimum } = readingBackgrounds(p);
	const readable = hex => backgrounds.every(bg => contrast(hex, bg) >= minimum);
	const colors = Object.fromEntries(ROLES.map(r => [r, p.tokens[r]]));
	const lch = Object.fromEntries(ROLES.map(r => [r, oklch(colors[r])]));
	for (let round = 0; round < 2000; round++) {
		const now = shortfall(colors);
		if (now === 0) break;
		let best;
		// Small steps first; larger ones only when no small step helps (a local minimum).
		for (const scale of [1, 2, 4, 8]) {
			for (const role of ROLES) {
				for (const step of STEPS) {
					const { l, c, h } = lch[role];
					const next = {
						l: l + (step.l ?? 0) * scale,
						c: Math.max(0, c + (step.c ?? 0) * scale),
						h: (h + (step.h ?? 0) * scale + 360) % 360
					};
					const hex = fromOklch(next.l, next.c, next.h);
					if (!hex || !readable(hex)) continue;
					const gain = (now - shortfall({ ...colors, [role]: hex })) / COST[role];
					if (gain > 0 && (!best || gain > best.gain)) best = { role, next, hex, gain };
				}
			}
			if (best) break;
		}
		if (!best) throw new Error(`${p.id}: can't fit the syntax colors apart`);
		lch[best.role] = best.next;
		colors[best.role] = best.hex;
	}
	return Object.fromEntries(
		ROLES.filter(r => colors[r] !== p.tokens[r]).map(r => [r, colors[r]])
	);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const ids = process.argv.slice(2);
	if (ids.length === 0) throw new Error("name the themes to fit, e.g. sunroom");
	let text = readFileSync(PALETTES, "utf-8");
	for (const id of ids) {
		const palette = palettes.find(p => p.id === id);
		if (!palette) throw new Error(`no theme ${id}`);
		const fitted = fit(palette);
		const start = text.indexOf("\n\t\ttokens: {", text.indexOf(`\t\tid: "${id}",`));
		const end = text.indexOf("\n\t\t}", start);
		let block = text.slice(start, end);
		for (const [role, color] of Object.entries(fitted)) {
			block = block.replace(
				new RegExp(`(\\n\\t\\t\\t${role}: ")#[0-9a-f]{6}(")`),
				`$1${color}$2`
			);
		}
		text = text.slice(0, start) + block + text.slice(end);
		const moves = Object.entries(fitted).map(
			([role, color]) =>
				`${role} ${palette.tokens[role]} → ${color} (ΔE ${dE(palette.tokens[role], color).toFixed(1)})`
		);
		console.log(`${id}: ${moves.join(", ") || "already apart"}`);
	}
	writeFileSync(PALETTES, text);
}
