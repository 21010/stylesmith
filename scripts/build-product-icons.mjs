// Builds the Stylesmith Pixel product icon theme (#67) from scripts/data/product-icons.mjs:
// an OpenType font with one glyph per icon, made of the pixels' squares, and the theme file
// that maps each codicon id to its glyph. Run with `npm run product-icons`.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import { LARGE, SMALL } from "./data/product-icons.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "product-icons");
const FONT = "stylesmith-pixel-product-icons.otf";

/** The grid is 16 pixels; like the codicon font, the em box is the icon, with no descender. */
const GRID = 16;
const PIXEL = 100;
const EM = GRID * PIXEL;
/** Private-use code points, in the order of the icons. */
const FIRST_CODE_POINT = 0xe000;

/** Every icon as 16 rows of 16 pixels; the large ones are doubled from 8x8. */
export function icons() {
	const doubled = rows =>
		rows.flatMap(row => {
			const wide = [...row].map(pixel => pixel + pixel).join("");
			return [wide, wide];
		});
	return [
		...Object.entries(LARGE).map(([id, rows]) => ({ id, rows: doubled(rows), large: true })),
		...Object.entries(SMALL).map(([id, rows]) => ({ id, rows, large: false }))
	];
}

/**
 * The outline of a pixel grid: one rectangle per run of filled pixels, merged with the same run
 * in the rows below, so a doubled pixel is one square and no seams show between rows.
 */
function outline(rows) {
	const runs = rows.map(row =>
		[...row.matchAll(/#+/g)].map(m => [m.index, m.index + m[0].length])
	);
	const path = new opentype.Path();
	const done = new Set();
	runs.forEach((rowRuns, y) => {
		for (const [start, end] of rowRuns) {
			const key = `${y}:${start}:${end}`;
			if (done.has(key)) continue;
			let last = y;
			while (runs[last + 1]?.some(([s, e]) => s === start && e === end)) {
				last++;
				done.add(`${last}:${start}:${end}`);
			}
			// Font coordinates grow upwards: row 0 is the top of the em box.
			const top = EM - y * PIXEL;
			const bottom = EM - (last + 1) * PIXEL;
			path.moveTo(start * PIXEL, bottom);
			path.lineTo(end * PIXEL, bottom);
			path.lineTo(end * PIXEL, top);
			path.lineTo(start * PIXEL, top);
			path.close();
		}
	});
	return path;
}

/**
 * Runs `write` with the clock stopped at a fixed date. opentype.js stamps the current time into
 * the font's head table; a fixed one makes the same icons always build the same font file.
 */
function atFixedTime(write) {
	const RealDate = Date;
	const fixed = RealDate.UTC(2026, 9, 9);
	globalThis.Date = class extends RealDate {
		constructor(...args) {
			super(...(args.length ? args : [fixed]));
		}
		static now() {
			return fixed;
		}
	};
	try {
		return write();
	} finally {
		globalThis.Date = RealDate;
	}
}

function build() {
	const list = icons();
	for (const { id, rows } of list) {
		if (rows.length !== GRID || rows.some(row => row.length !== GRID || /[^#.]/.test(row))) {
			throw new Error(`${id}: expected ${GRID} rows of ${GRID} "#" or "."`);
		}
	}
	const glyphs = [
		new opentype.Glyph({
			name: ".notdef",
			unicode: 0,
			advanceWidth: EM,
			path: new opentype.Path()
		}),
		...list.map(
			({ id, rows }, i) =>
				new opentype.Glyph({
					name: id.replace(/-/g, "_"),
					unicode: FIRST_CODE_POINT + i,
					advanceWidth: EM,
					path: outline(rows)
				})
		)
	];
	const font = new opentype.Font({
		familyName: "Stylesmith Pixel Product Icons",
		styleName: "Regular",
		unitsPerEm: EM,
		ascender: EM,
		descender: 0,
		designer: "Stylesmith",
		license: "MIT",
		glyphs
	});
	mkdirSync(OUT, { recursive: true });
	writeFileSync(join(OUT, FONT), Buffer.from(atFixedTime(() => font.toArrayBuffer())));

	const theme = {
		fonts: [
			{
				id: "stylesmith-pixel",
				src: [{ path: `./${FONT}`, format: "opentype" }],
				weight: "normal",
				style: "normal"
			}
		],
		iconDefinitions: Object.fromEntries(
			list.map(({ id }, i) => [
				id,
				{ fontCharacter: `\\${(FIRST_CODE_POINT + i).toString(16)}` }
			])
		)
	};
	writeFileSync(
		join(OUT, "pixel-product-icon-theme.json"),
		JSON.stringify(theme, null, "\t") + "\n"
	);
	console.log(`wrote ${list.length} icons to ${OUT}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
