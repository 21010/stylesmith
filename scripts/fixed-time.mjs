// Font builds stamp the current time into a font's head table (opentype.js does). Running the
// write with the clock stopped at a fixed date makes the same glyphs always build the same file.

/**
 * Runs `write` with Date stopped at `date`.
 * @template T
 * @param {Date} date
 * @param {() => T} write
 * @returns {T}
 */
export function atFixedTime(date, write) {
	const RealDate = Date;
	const fixed = date.getTime();
	const FixedDate = class extends RealDate {
		constructor(...args) {
			super(.../** @type {[number]} */ (args.length ? args : [fixed]));
		}
		static now() {
			return fixed;
		}
	};
	globalThis.Date = /** @type {DateConstructor} */ (/** @type {unknown} */ (FixedDate));
	try {
		return write();
	} finally {
		globalThis.Date = RealDate;
	}
}
