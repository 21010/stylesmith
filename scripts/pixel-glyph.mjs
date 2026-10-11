// Draws pixel art as a font glyph: every horizontal run of "on" pixels becomes a rectangle, and
// runs with the same columns in consecutive rows merge into one, for fewer contours.

import opentype from "opentype.js";

/**
 * The glyph path for a pixel grid, top row first.
 * @param {[number, number][][]} runs per row, the [start, end) columns of each run of pixels
 * @param {number} pixel font units per pixel
 * @param {number} em the font's units per em; row 0 is its top
 */
export function pixelPath(runs, pixel, em) {
	const path = new opentype.Path();
	const done = new Set();
	runs.forEach((rowRuns, y) => {
		for (const [start, end] of rowRuns) {
			if (done.has(`${y}:${start}:${end}`)) continue;
			let last = y;
			while (runs[last + 1]?.some(([s, e]) => s === start && e === end)) {
				last++;
				done.add(`${last}:${start}:${end}`);
			}
			// Font coordinates grow upwards: row 0 is the top of the em box.
			const top = em - y * pixel;
			const bottom = em - (last + 1) * pixel;
			path.moveTo(start * pixel, bottom);
			path.lineTo(end * pixel, bottom);
			path.lineTo(end * pixel, top);
			path.lineTo(start * pixel, top);
			path.close();
		}
	});
	return path;
}
